/// <reference types="node" />

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { eq, sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import * as schema from '../src/database/schema';
import { seedDefaultCategories } from '../src/database/seed';
import { createFinanceDataAccess } from '../src/features/finance/data';
import { aggregateFinance, spendingBarPercent, type AnalyticsTransaction } from '../src/features/finance/analytics';
import { FinanceValidationError } from '../src/features/finance/errors';
import { categoriesForType, changeTransactionType, financeCategoryForTransaction, financeCategoryName, transactionDraft, validateTransactionDraft } from '../src/features/finance/form';
import { formatBrlAmount, formatBrlInput, maxAmountMinor, parseBrlAmount, validateAmountMinor } from '../src/features/finance/money';
import { builtInFinanceCategories, seedFinanceCategories } from '../src/features/finance/seed';
import { canMovePeriod, movePeriod, periodBounds, refreshPeriod, type PeriodKind } from '../src/features/finance/periods';
import type { FinanceTransaction, TransactionDraft } from '../src/features/finance/types';
import { createTaskDataAccess } from '../src/features/tasks/data';
import { taskDraft } from '../src/features/tasks/form';
import { localDateString, pickerValue } from '../src/utils/calendar';
import { bundledMigrations, database, journal } from './helpers/database';

const now = new Date(2026, 9, 3, 12).getTime();
const today = '2026-10-03';
function draft(changes: Partial<TransactionDraft> = {}): TransactionDraft {
  return { ...transactionDraft(null, new Date(now)), description: 'Lunch', amount: '25,90', ...changes };
}

async function initialized(filename = ':memory:') {
  const result = database(filename);
  await migrate(result.db, bundledMigrations);
  seedDefaultCategories(result.db, 1000);
  seedFinanceCategories(result.db, 1000);
  let timestamp = now;
  return { ...result, access: createFinanceDataAccess(result.db, randomUUID, () => timestamp), setNow: (value: number) => { timestamp = value; } };
}

test('BRL parser and formatter support whole reais, centavos and correctly grouped thousands', () => {
  const cases: [string, number, string][] = [
    ['1', 100, 'R$ 1,00'], ['123', 12300, 'R$ 123,00'], ['25,90', 2590, 'R$ 25,90'],
    ['123,45', 12345, 'R$ 123,45'], ['0,01', 1, 'R$ 0,01'], ['0,1', 10, 'R$ 0,10'],
    ['25,9', 2590, 'R$ 25,90'], ['1.234,56', 123456, 'R$ 1.234,56'],
    ['1.234', 123400, 'R$ 1.234,00'], ['1234567,89', 123456789, 'R$ 1.234.567,89'],
    ['1.234.567,89', 123456789, 'R$ 1.234.567,89'], ['  R$ 25,90  ', 2590, 'R$ 25,90'],
  ];
  for (const [input, expected, formatted] of cases) {
    assert.equal(parseBrlAmount(input), expected, input);
    assert.equal(formatBrlAmount(expected), formatted);
    assert.equal(parseBrlAmount(formatBrlInput(expected)), expected);
  }
});

test('BRL parser rejects invalid characters, exponents, signs, ambiguous separators and cent precision', () => {
  for (const input of [
    '', ' ', 'abc25', '25abc', '1e3', '1E3', '0x10', 'NaN', 'Infinity',
    '-25,90', '+25,90', '(25,90)', '25.90', '1,234.56', '1,234', '25,999',
    ',90', '25,', '1.23,45', '12.34.567,89', '1234.567,89', '1..234,56',
    '1.234,5,6', '1 234,56', '25 ,90', 'R$ abc25', '25,90 R$', 'USD 25,90',
    '25\n90', '25,90\nabc',
  ]) assert.throws(() => parseBrlAmount(input), FinanceValidationError, input);
});

test('BRL handling rejects zero, negatives and unsafe integers while preserving the last supported centavo', () => {
  for (const input of ['0', '0,00', '00,0', '-0,01', '90.071.992.547.409,92', '90071992547410', '999999999999999999999999,99']) {
    assert.throws(() => parseBrlAmount(input), FinanceValidationError, input);
  }
  for (const value of [0, -1, 1.5, NaN, Infinity, maxAmountMinor + 1]) {
    assert.throws(() => validateAmountMinor(value), FinanceValidationError);
    if (!Number.isSafeInteger(value)) assert.throws(() => formatBrlAmount(value), FinanceValidationError);
  }
  assert.equal(parseBrlAmount('90.071.992.547.409,91'), maxAmountMinor);
  assert.equal(formatBrlAmount(maxAmountMinor), 'R$ 90.071.992.547.409,91');
  for (const value of [1, 10, 99, 100, 2590, maxAmountMinor - 2, maxAmountMinor - 1, maxAmountMinor]) {
    assert.equal(parseBrlAmount(formatBrlInput(value)), value);
  }
});

test('BRL display formats zero, signed Net Flow and arbitrarily large integer aggregate totals exactly', () => {
  assert.equal(formatBrlAmount(0), 'R$ 0,00');
  assert.equal(formatBrlAmount(0n), 'R$ 0,00');
  assert.equal(formatBrlAmount(-35000), '-R$ 350,00');
  assert.equal(formatBrlAmount(-1n), '-R$ 0,01');
  assert.equal(formatBrlAmount(BigInt(maxAmountMinor) * 2n + 1n), 'R$ 180.143.985.094.819,83');
  assert.throws(() => formatBrlInput(0), FinanceValidationError, 'transaction-entry formatting remains positive');
  assert.throws(() => formatBrlInput(-1), FinanceValidationError);
});

const boundaryCases: [string, PeriodKind, string, string, string][] = [
  ['Monday–Sunday week', 'week', '2026-10-07', '2026-10-05', '2026-10-11'],
  ['week containing Sunday', 'week', '2026-10-11', '2026-10-05', '2026-10-11'],
  ['week spanning months', 'week', '2026-10-01', '2026-09-28', '2026-10-04'],
  ['week spanning years', 'week', '2026-01-01', '2025-12-29', '2026-01-04'],
  ['31-day calendar month', 'month', '2026-10-31', '2026-10-01', '2026-10-31'],
  ['30-day calendar month', 'month', '2026-09-30', '2026-09-01', '2026-09-30'],
  ['non-leap February', 'month', '2026-02-15', '2026-02-01', '2026-02-28'],
  ['leap-year February', 'month', '2024-02-29', '2024-02-01', '2024-02-29'],
  ['leap-century February', 'month', '2000-02-01', '2000-02-01', '2000-02-29'],
  ['non-leap-century February', 'month', '1900-02-01', '1900-02-01', '1900-02-28'],
  ['calendar year', 'year', '2026-10-03', '2026-01-01', '2026-12-31'],
  ['leap calendar year', 'year', '2024-02-29', '2024-01-01', '2024-12-31'],
];
for (const [label, kind, reference, startDate, endDate] of boundaryCases) {
  test(`Finance period bounds: ${label}`, () => {
    assert.deepEqual(periodBounds(kind, reference), { kind, startDate, endDate });
  });
}

for (const kind of ['week', 'month', 'year'] as const) {
  test(`historical ${kind} navigation goes backward and returns to current without entering a future period`, () => {
    const reference = '2026-10-14';
    const current = periodBounds(kind, reference);
    const previous = movePeriod(current, -1, reference);
    const expected = kind === 'week' ? '2026-10-05' : kind === 'month' ? '2026-09-01' : '2025-01-01';
    assert.equal(previous.startDate, expected);
    assert.equal(canMovePeriod(current, 1, reference), false);
    assert.equal(canMovePeriod(previous, 1, reference), true);
    assert.deepEqual(movePeriod(previous, 1, reference), current);
    assert.deepEqual(movePeriod(current, 1, reference), current);
    const older = movePeriod(previous, -1, reference);
    assert.deepEqual(movePeriod(movePeriod(older, 1, reference), 1, reference), current);
    assert.deepEqual(movePeriod(periodBounds(kind, '0001-01-01'), -1, reference), periodBounds(kind, '0001-01-01'));
  });
}

test('month/year navigation crosses calendar boundaries without date overflow', () => {
  assert.deepEqual(movePeriod(periodBounds('month', '2024-03-31'), -1, '2026-10-03'), periodBounds('month', '2024-02-29'));
  assert.deepEqual(movePeriod(periodBounds('month', '2026-01-31'), -1, '2026-10-03'), periodBounds('month', '2025-12-01'));
  assert.deepEqual(movePeriod(periodBounds('year', '2026-01-01'), -1, '2026-10-03'), periodBounds('year', '2025-01-01'));
});

test('day rollover advances current selections and preserves historical periods', () => {
  assert.deepEqual(refreshPeriod(periodBounds('month', '2026-10-31'), '2026-10-31', '2026-11-01'), periodBounds('month', '2026-11-01'));
  const historical = periodBounds('month', '2026-09-15');
  assert.deepEqual(refreshPeriod(historical, '2026-10-31', '2026-11-01'), historical);
  assert.deepEqual(refreshPeriod(periodBounds('week', '2026-10-11'), '2026-10-11', '2026-10-12'), periodBounds('week', '2026-10-12'));
  assert.deepEqual(refreshPeriod(periodBounds('year', '2026-12-31'), '2026-12-31', '2027-01-01'), periodBounds('year', '2027-01-01'));
  assert.deepEqual(refreshPeriod(periodBounds('month', '2026-10-01'), '2026-10-01', '2026-09-30'), periodBounds('month', '2026-09-30'));
});

test('period bounds reject unsupported periods and malformed dates and stay independent of time zones', () => {
  assert.throws(() => periodBounds('day' as never, today), FinanceValidationError);
  assert.throws(() => periodBounds('month', '2026-02-30'), FinanceValidationError);
  const originalZone = process.env.TZ;
  try {
    for (const zone of ['America/Sao_Paulo', 'America/New_York', 'Asia/Tokyo']) {
      process.env.TZ = zone;
      assert.deepEqual(periodBounds('week', '2026-03-08'), { kind: 'week', startDate: '2026-03-02', endDate: '2026-03-08' });
    }
  } finally {
    if (originalZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalZone;
  }
});

function analyticsRow(type: AnalyticsTransaction['type'], amountMinor: number, categoryId: string | null = null, categoryName: string | null = null): AnalyticsTransaction {
  return { type, amountMinor, categoryId, categoryName };
}

const totalCases: [string, AnalyticsTransaction[], bigint, bigint, bigint][] = [
  ['empty period', [], 0n, 0n, 0n],
  ['income only', [analyticsRow('income', 520000)], 520000n, 0n, 520000n],
  ['expenses only', [analyticsRow('expense', 35000)], 0n, 35000n, -35000n],
  ['mixed with positive Net Flow', [analyticsRow('income', 520000), analyticsRow('expense', 285000)], 520000n, 285000n, 235000n],
  ['mixed with negative Net Flow', [analyticsRow('income', 20000), analyticsRow('expense', 25000)], 20000n, 25000n, -5000n],
  ['mixed with zero Net Flow', [analyticsRow('income', 100), analyticsRow('expense', 1), analyticsRow('expense', 29), analyticsRow('expense', 70)], 100n, 100n, 0n],
];
for (const [label, rows, income, expenses, net] of totalCases) {
  test(`Finance integer totals: ${label}`, () => {
    const result = aggregateFinance(rows, periodBounds('month', today));
    assert.equal(result.incomeMinor, income);
    assert.equal(result.expensesMinor, expenses);
    assert.equal(result.netFlowMinor, net);
    assert.equal(result.spending.reduce((sum, category) => sum + category.amountMinor, 0n), expenses);
    assert.equal(result.transactionCount, rows.length);
    if (expenses === 0n) assert.deepEqual(result.spending, []);
  });
}

test('category bar ratios are display-only and remain finite for zero or very large expenses', () => {
  assert.equal(spendingBarPercent(0n, 0n), 0);
  assert.equal(spendingBarPercent(1n, 0n), 0);
  assert.equal(spendingBarPercent(1n, 4n), 25);
  assert.equal(spendingBarPercent(4n, 4n), 100);
  const large = 10n ** 40n;
  assert.equal(spendingBarPercent(large, large * 2n), 50);
  assert.ok(Number.isFinite(spendingBarPercent(1n, large)));
});

test('pure analytics remain exact even beyond SQLite signed-64-bit aggregate totals', () => {
  const rows = Array.from({ length: 1025 }, () => analyticsRow('income', maxAmountMinor));
  const result = aggregateFinance(rows, periodBounds('year', today));
  assert.equal(result.incomeMinor, BigInt(maxAmountMinor) * 1025n);
  assert.ok(result.incomeMinor > 9223372036854775807n);
  assert.equal(result.netFlowMinor, result.incomeMinor);
  assert.match(formatBrlAmount(result.incomeMinor), /^R\$ [\d.]+,\d{2}$/);
});

test('SQLite analytics include exact inclusive period boundaries and exclude deleted and outside-period rows', async (t) => {
  const { sqlite, db, access, setNow } = await initialized();
  t.after(() => sqlite.close());
  setNow(new Date(2027, 0, 4, 12).getTime());
  access.createTransaction(draft({ amount: '0,01', transactionDate: '2026-10-05' }));
  access.createTransaction(draft({ amount: '0,99', transactionDate: '2026-10-11' }));
  access.createTransaction(draft({ type: 'income', amount: '1,00', transactionDate: '2026-10-08' }));
  access.createTransaction(draft({ amount: '999,00', transactionDate: '2026-10-04' }));
  access.createTransaction(draft({ type: 'income', amount: '999,00', transactionDate: '2026-10-12' }));
  const deleted = access.createTransaction(draft({ amount: '999,00', transactionDate: '2026-10-07' }));
  access.deleteTransaction(deleted);
  const stored = db.select().from(schema.financeTransactions).all();
  const period = periodBounds('week', '2026-10-07');
  const result = access.readDashboard(period).analytics;
  assert.deepEqual(result.period, period);
  assert.equal(result.transactionCount, 3);
  assert.equal(result.incomeMinor, 100n);
  assert.equal(result.expensesMinor, 100n);
  assert.equal(result.netFlowMinor, 0n);
  assert.deepEqual(result.spending, [{ categoryId: null, name: 'No category', amountMinor: 100n }]);
  assert.deepEqual(db.select().from(schema.financeTransactions).all(), stored, 'reading analytics does not persist summaries or modify transactions');
});

test('Week, Month and Year summaries each use their own coherent range across historical navigation', async (t) => {
  const { sqlite, access, setNow } = await initialized();
  t.after(() => sqlite.close());
  setNow(new Date(2027, 0, 4, 12).getTime());
  for (const [type, amount, transactionDate] of [
    ['income', '20,00', '2026-01-15'], ['income', '50,00', '2026-09-15'],
    ['income', '12,50', '2026-10-05'], ['expense', '3,00', '2026-10-06'],
    ['expense', '1,40', '2026-10-31'], ['expense', '9,00', '2027-01-01'],
  ] as const) access.createTransaction(draft({ type, amount, transactionDate }));
  const week = access.readDashboard(periodBounds('week', '2026-10-07')).analytics;
  const month = access.readDashboard(periodBounds('month', '2026-10-07')).analytics;
  const year = access.readDashboard(periodBounds('year', '2026-10-07')).analytics;
  assert.deepEqual([week.incomeMinor, week.expensesMinor, week.netFlowMinor], [1250n, 300n, 950n]);
  assert.deepEqual([month.incomeMinor, month.expensesMinor, month.netFlowMinor], [1250n, 440n, 810n]);
  assert.deepEqual([year.incomeMinor, year.expensesMinor, year.netFlowMinor], [8250n, 440n, 7810n]);
  const previous = movePeriod(month.period, -1, '2026-10-07');
  const september = access.readDashboard(previous).analytics;
  assert.deepEqual([september.incomeMinor, september.expensesMinor, september.netFlowMinor], [5000n, 0n, 5000n]);
  assert.deepEqual(access.readDashboard(movePeriod(previous, 1, '2026-10-07')).analytics, month);
});

test('category spending sorts expenses only, keeps custom/archived identities and reconciles with period Expenses', async (t) => {
  const { sqlite, access, setNow } = await initialized();
  t.after(() => sqlite.close());
  setNow(new Date(2027, 0, 4, 12).getTime());
  const categories = access.read().categories;
  const food = categories.find((category) => category.name === 'Food')!;
  const housing = categories.find((category) => category.name === 'Housing')!;
  const salary = categories.find((category) => category.name === 'Salary')!;
  const archived = access.createCategory('Pet care', 'expense');
  for (const [categoryId, amount] of [[food.id, '500,00'], [food.id, '320,00'], [housing.id, '650,00'], [archived.id, '280,00'], [null, '190,00']] as const) {
    access.createTransaction(draft({ categoryId, amount }));
  }
  access.createTransaction(draft({ type: 'income', categoryId: salary.id, amount: '5.200,00' }));
  access.createTransaction(draft({ categoryId: food.id, amount: '9.999,00', transactionDate: '2026-09-30' }));
  const deleted = access.createTransaction(draft({ categoryId: food.id, amount: '9.999,00' }));
  access.deleteTransaction(deleted);
  const period = periodBounds('month', today);
  const beforeArchive = access.readDashboard(period).analytics;
  access.deleteCategory(archived.id);
  assert.deepEqual(access.readDashboard(period).analytics, beforeArchive, 'archival does not alter historical analytics');
  const replacement = access.createCategory('Pet care', 'expense');
  access.createTransaction(draft({ categoryId: replacement.id, amount: '100,00' }));
  const result = access.readDashboard(period).analytics;
  assert.equal(result.incomeMinor, 520000n);
  assert.equal(result.expensesMinor, 204000n);
  assert.deepEqual(result.spending, [
    { categoryId: food.id, name: 'Food', amountMinor: 82000n },
    { categoryId: housing.id, name: 'Housing', amountMinor: 65000n },
    { categoryId: archived.id, name: 'Pet care', amountMinor: 28000n },
    { categoryId: null, name: 'No category', amountMinor: 19000n },
    { categoryId: replacement.id, name: 'Pet care', amountMinor: 10000n },
  ]);
  assert.equal(result.spending.reduce((sum, category) => sum + category.amountMinor, 0n), result.expensesMinor);
});

test('category spending has deterministic ordering for equal amounts and never changes source rows', () => {
  const rows = [analyticsRow('expense', 100, 'b', 'Same'), analyticsRow('expense', 100, 'a', 'Same'), analyticsRow('expense', 100, 'c', 'Another')];
  const original = rows.map((row) => ({ ...row }));
  assert.deepEqual(aggregateFinance(rows, periodBounds('month', today)).spending.map((category) => category.categoryId), ['c', 'a', 'b']);
  assert.deepEqual(rows, original);
});

test('SQLite dashboard totals above the safe Number range preserve every centavo and formatted Net Flow', async (t) => {
  const { sqlite, access } = await initialized();
  t.after(() => sqlite.close());
  access.createTransaction(draft({ type: 'income', amount: formatBrlInput(maxAmountMinor) }));
  access.createTransaction(draft({ type: 'income', amount: formatBrlInput(maxAmountMinor) }));
  access.createTransaction(draft({ amount: '0,01' }));
  const result = access.readDashboard(periodBounds('month', today)).analytics;
  assert.equal(result.incomeMinor, BigInt(maxAmountMinor) * 2n);
  assert.equal(result.expensesMinor, 1n);
  assert.equal(result.netFlowMinor, BigInt(maxAmountMinor) * 2n - 1n);
  assert.equal(formatBrlAmount(result.netFlowMinor), 'R$ 180.143.985.094.819,81');
});

test('empty and income-only SQLite periods return zero expenses without invalid bars', async (t) => {
  const { sqlite, access } = await initialized();
  t.after(() => sqlite.close());
  const period = periodBounds('month', today);
  const empty = access.readDashboard(period).analytics;
  assert.deepEqual([empty.incomeMinor, empty.expensesMinor, empty.netFlowMinor], [0n, 0n, 0n]);
  assert.deepEqual(empty.spending, []);
  access.createTransaction(draft({ type: 'income', amount: '123,45' }));
  const incomeOnly = access.readDashboard(period).analytics;
  assert.deepEqual([incomeOnly.incomeMinor, incomeOnly.expensesMinor, incomeOnly.netFlowMinor], [12345n, 0n, 12345n]);
  assert.deepEqual(incomeOnly.spending, []);
  assert.equal(spendingBarPercent(0n, incomeOnly.expensesMinor), 0);
});

test('Finance seeds all thirteen typed built-ins including Pets, without duplicates or Task-category reuse', async (t) => {
  const { sqlite, db, access } = await initialized();
  t.after(() => sqlite.close());
  const first = access.read().categories;
  assert.deepEqual(categoriesForType(first, 'expense').map((item) => item.name).sort(),
    ['Housing', 'Food', 'Transport', 'Shopping', 'Health', 'Pets', 'Entertainment', 'Utilities', 'Subscriptions', 'Other'].sort());
  assert.deepEqual(categoriesForType(first, 'income').map((item) => item.name).sort(), ['Salary', 'Freelance', 'Other'].sort());
  assert.equal(first.length, 13);
  assert.ok(first.every((item) => item.isBuiltIn && /^[0-9a-f-]{36}$/.test(item.id)));
  assert.deepEqual(first.map((item) => item.id).sort(), builtInFinanceCategories.map((item) => item.id).sort());
  await migrate(db, bundledMigrations);
  seedFinanceCategories(db, 5000);
  seedFinanceCategories(db, 6000);
  assert.deepEqual(access.read().categories, first);
  assert.equal(db.select().from(schema.taskCategories).all().length, 6);
  assert.ok(!db.select().from(schema.taskCategories).all().some((item) => first.some((category) => category.id === item.id)));
  for (const category of first) assert.throws(() => access.deleteCategory(category.id), /Built-in/);
  assert.deepEqual(access.read().categories, first);
  db.update(schema.financeCategories).set({ deletedAt: 7000, updatedAt: 7000 }).where(eq(schema.financeCategories.id, first[0].id)).run();
  seedFinanceCategories(db, 8000);
  const afterSeed = access.read().categories;
  assert.equal(afterSeed.filter((category) => category.deletedAt === null).length, 12, 'startup must not resurrect a category tombstone');
  assert.equal(afterSeed.find((category) => category.id === first[0].id)!.deletedAt, 7000);
});

test('expense and income transactions store positive integer centavos, UUIDs and normalized text', async (t) => {
  const { sqlite, access } = await initialized();
  t.after(() => sqlite.close());
  const categories = access.read().categories;
  const food = categories.find((item) => item.name === 'Food')!;
  const salary = categories.find((item) => item.name === 'Salary')!;
  const expense = access.createTransaction(draft({ description: '  Lunch  ', note: '  With friends  ', categoryId: food.id }));
  const income = access.createTransaction(draft({ type: 'income', description: 'Salary received', amount: '5.000,00', categoryId: salary.id }));
  const rows = access.read().transactions;
  const lunch = rows.find((item) => item.id === expense)!;
  assert.equal(lunch.type, 'expense');
  assert.equal(lunch.amountMinor, 2590);
  assert.equal(lunch.description, 'Lunch');
  assert.equal(lunch.note, 'With friends');
  assert.equal(lunch.transactionDate, today);
  assert.equal(lunch.createdAt, now);
  assert.equal(lunch.updatedAt, now);
  assert.equal(lunch.deletedAt, null);
  assert.equal(rows.find((item) => item.id === income)!.amountMinor, 500000);
  assert.equal(rows.find((item) => item.id === income)!.note, null);
  assert.ok(rows.every((item) => /^[0-9a-f-]{36}$/.test(item.id) && Number.isSafeInteger(item.amountMinor) && item.amountMinor > 0));
  assert.equal(financeCategoryName(lunch, categories), 'Food');
});

test('editing every transaction field preserves identity and createdAt and advances updatedAt', async (t) => {
  const { sqlite, access } = await initialized();
  t.after(() => sqlite.close());
  const id = access.createTransaction(draft());
  const original = access.read().transactions[0];
  const salary = access.read().categories.find((item) => item.name === 'Salary')!;
  access.editTransaction(id, draft({ type: 'income', amount: '123,45', description: '  Salary correction  ', note: ' Details ', transactionDate: '2026-09-30', categoryId: salary.id }));
  const edited = access.read().transactions[0];
  assert.equal(edited.id, id);
  assert.equal(edited.createdAt, original.createdAt);
  assert.ok(edited.updatedAt > original.updatedAt);
  assert.equal(edited.type, 'income');
  assert.equal(edited.amountMinor, 12345);
  assert.equal(edited.description, 'Salary correction');
  assert.equal(edited.note, 'Details');
  assert.equal(edited.transactionDate, '2026-09-30');
  assert.equal(edited.categoryId, salary.id);
  access.editTransaction(id, { ...transactionDraft(edited), note: '', categoryId: null });
  assert.equal(access.read().transactions[0].note, null);
  assert.equal(access.read().transactions[0].categoryId, null);
});

test('transaction soft deletion hides a row while keeping its data and rejects further edits', async (t) => {
  const { sqlite, db, access } = await initialized();
  t.after(() => sqlite.close());
  const id = access.createTransaction(draft());
  const original = access.read().transactions[0];
  access.deleteTransaction(id);
  assert.equal(access.read().transactions.length, 0);
  const tombstone = db.select().from(schema.financeTransactions).where(eq(schema.financeTransactions.id, id)).get()!;
  assert.equal(tombstone.deletedAt, tombstone.updatedAt);
  assert.ok(tombstone.updatedAt > original.updatedAt);
  assert.equal(tombstone.amountMinor, original.amountMinor);
  assert.equal(tombstone.description, original.description);
  assert.throws(() => access.editTransaction(id, draft()), /no longer available/);
});

test('transactions and custom categories persist unchanged after reopening SQLite', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'axis-finance-test-'));
  const filename = join(directory, 'axis.db');
  let current = await initialized(filename);
  try {
    const category = current.access.createCategory('Consulting', 'income');
    current.access.createTransaction(draft({ type: 'income', amount: '1.234,56', categoryId: category.id, description: 'Payment received' }));
    current.access.createTransaction(draft({ description: 'Lunch' }));
    const snapshot = current.access.read();
    current.sqlite.close();
    current = await initialized(filename);
    assert.deepEqual(current.access.read(), snapshot);
    const expense = snapshot.transactions.find((item) => item.type === 'expense')!;
    current.access.editTransaction(expense.id, { ...transactionDraft(expense), amount: '30,01' });
    current.access.deleteCategory(category.id);
    current.access.deleteTransaction(expense.id);
    const second = current.access.read();
    current.sqlite.close();
    current = await initialized(filename);
    assert.deepEqual(current.access.read(), second);
    assert.equal(second.transactions[0].categoryId, category.id);
    assert.equal(financeCategoryName(second.transactions[0], second.categories), 'Consulting');
  } finally {
    current.sqlite.close();
    unlinkSync(filename);
    rmdirSync(directory);
  }
});

test('transaction ordering is business date descending, creation time descending, then stable ID', async (t) => {
  const { sqlite, access, setNow } = await initialized();
  t.after(() => sqlite.close());
  const first = access.createTransaction(draft());
  const equal = access.createTransaction(draft());
  setNow(now + 1000);
  const recent = access.createTransaction(draft());
  setNow(now + 2000);
  const earlier = access.createTransaction(draft({ transactionDate: '2026-10-02' }));
  assert.deepEqual(access.read().transactions.map((item) => item.id), [recent, ...[first, equal].sort(), earlier]);
  assert.deepEqual(access.read().transactions, access.read().transactions);
  access.editTransaction(earlier, draft());
  assert.equal(access.read().transactions[0].id, earlier);
});

test('transaction validation rejects empty descriptions, invalid types/dates and future planned movements', () => {
  for (const changes of [
    { description: ' \t\n ' }, { amount: '' }, { type: 'transfer' as never },
    { transactionDate: '' }, { transactionDate: '2026-02-30' }, { transactionDate: '2026-2-01' },
    { transactionDate: '1900-02-29' }, { transactionDate: '0000-01-01' }, { transactionDate: '2026-10-04' },
  ]) assert.throws(() => validateTransactionDraft(draft(changes), today), FinanceValidationError);
  assert.equal(validateTransactionDraft(draft({ transactionDate: '2000-02-29' }), today).transactionDate, '2000-02-29');
});

test('local-calendar defaults, picker conversion and persisted transaction dates never use UTC serialization', async (t) => {
  const { sqlite, access } = await initialized();
  t.after(() => sqlite.close());
  const originalZone = process.env.TZ;
  try {
    for (const zone of ['America/Sao_Paulo', 'America/New_York', 'Asia/Tokyo']) {
      process.env.TZ = zone;
      const late = new Date(2026, 9, 2, 23, 50);
      assert.equal(transactionDraft(null, late).transactionDate, '2026-10-02');
      assert.equal(localDateString(pickerValue('2026-10-02')), '2026-10-02');
      const id = access.createTransaction(draft({ transactionDate: '2026-10-02' }));
      assert.equal(access.read().transactions.find((item) => item.id === id)!.transactionDate, '2026-10-02');
    }
  } finally {
    if (originalZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalZone;
  }
});

test('custom Finance categories are typed, normalize names and reject duplicates within their type', async (t) => {
  const { sqlite, access } = await initialized();
  t.after(() => sqlite.close());
  const expense = access.createCategory('  Pet   care  ', 'expense');
  const income = access.createCategory('Pet care', 'income');
  assert.equal(expense.name, 'Pet care');
  assert.equal(expense.type, 'expense');
  assert.equal(expense.isBuiltIn, false);
  assert.equal(income.type, 'income');
  assert.notEqual(expense.id, income.id);
  assert.throws(() => access.createCategory('pet care', 'expense'), /already exists/);
  assert.throws(() => access.createCategory('  ', 'income'), /category name/);
  assert.throws(() => access.createCategory('Shared', 'both' as never), /Income or Expense/);
  assert.ok(categoriesForType(access.read().categories, 'expense').every((item) => item.type === 'expense'));
});

test('domain and SQLite enforce category compatibility and changing editor type clears an incompatible selection', async (t) => {
  const { sqlite, db, access } = await initialized();
  t.after(() => sqlite.close());
  const categories = access.read().categories;
  const pets = categories.find((item) => item.name === 'Pets')!;
  const salary = categories.find((item) => item.name === 'Salary')!;
  assert.throws(() => access.createTransaction(draft({ type: 'income', categoryId: pets.id })), /category/);
  assert.throws(() => access.createTransaction(draft({ categoryId: salary.id })), /category/);
  const id = access.createTransaction(draft({ categoryId: pets.id }));
  const row = access.read().transactions[0];
  assert.throws(() => access.editTransaction(id, { ...transactionDraft(row), type: 'income' }), /category/);
  assert.throws(() => db.update(schema.financeTransactions).set({ type: 'income' }).where(eq(schema.financeTransactions.id, id)).run(), /FOREIGN KEY/);
  assert.throws(() => db.insert(schema.financeTransactions).values({ ...row, id: randomUUID(), type: 'expense', categoryId: salary.id }).run(), /FOREIGN KEY/);
  const changed = changeTransactionType(draft({ type: 'income', categoryId: salary.id }), 'expense', categories);
  assert.equal(changed.categoryId, null);
  assert.equal(changed.type, 'expense');
  assert.equal(changeTransactionType(draft({ categoryId: pets.id }), 'expense', categories).categoryId, pets.id);
  access.editTransaction(id, changeTransactionType(transactionDraft(row), 'income', categories));
  assert.equal(access.read().transactions[0].categoryId, null);
});

test('archiving a custom category preserves all transaction fields, references and historical category names', async (t) => {
  const { sqlite, db, access } = await initialized();
  t.after(() => sqlite.close());
  const category = access.createCategory('Pet care', 'expense');
  const id = access.createTransaction(draft({ categoryId: category.id }));
  const original = access.read().transactions[0];
  assert.equal(financeCategoryName(original, [category]), 'Pet care');
  access.deleteCategory(category.id);
  const snapshot = access.read();
  assert.deepEqual(snapshot.transactions[0], original);
  const deleted = db.select().from(schema.financeCategories).where(eq(schema.financeCategories.id, category.id)).get()!;
  assert.ok(deleted.deletedAt !== null && deleted.updatedAt > category.updatedAt);
  assert.equal(financeCategoryName(original, snapshot.categories), 'Pet care');
  assert.equal(financeCategoryName(original, [deleted]), 'Pet care');
  assert.ok(!categoriesForType(snapshot.categories, 'expense').some((item) => item.id === category.id));
  assert.equal(financeCategoryName({ ...original, categoryId: null }, [category]), null);
  assert.throws(() => access.createTransaction(draft({ categoryId: category.id })), /category/);
  access.editTransaction(id, { ...transactionDraft(original), note: 'Still valid' });
  assert.equal(access.read().transactions[0].categoryId, category.id, 'ordinary edits preserve an archived category reference');
  assert.throws(() => sqlite.prepare('DELETE FROM finance_categories WHERE id = ?').run(category.id), /FOREIGN KEY/);
  const replacement = access.createCategory('Pet care', 'expense');
  assert.notEqual(replacement.id, category.id);
  assert.equal(financeCategoryName(original, access.read().categories), 'Pet care');
  assert.equal(financeCategoryForTransaction(original, access.read().categories)!.id, category.id);
});

for (const type of ['expense', 'income'] as const) {
  test(`archived ${type} categories disappear from choices and cannot be assigned to new or unrelated transactions`, async (t) => {
    const { sqlite, access } = await initialized();
    t.after(() => sqlite.close());
    const category = access.createCategory('Custom category', type);
    const existingId = access.createTransaction(draft({ type }));
    access.deleteCategory(category.id);
    const snapshot = access.read();
    assert.ok(snapshot.categories.some((item) => item.id === category.id && item.deletedAt !== null));
    assert.ok(!categoriesForType(snapshot.categories, type).some((item) => item.id === category.id));
    assert.throws(() => access.createTransaction(draft({ type, categoryId: category.id })), /available category/);
    assert.throws(() => access.editTransaction(existingId, draft({ type, categoryId: category.id })), /available category/);
    assert.deepEqual(access.read().transactions, snapshot.transactions);
  });
}

test('opening and saving an archived-category transaction preserves its understandable current category', async (t) => {
  const { sqlite, access } = await initialized();
  t.after(() => sqlite.close());
  const category = access.createCategory('Pet care', 'expense');
  const id = access.createTransaction(draft({ categoryId: category.id }));
  access.deleteCategory(category.id);
  const snapshot = access.read();
  const original = snapshot.transactions[0];
  const editorDraft = transactionDraft(original);
  assert.equal(editorDraft.categoryId, category.id);
  const currentCategory = financeCategoryForTransaction(editorDraft, snapshot.categories)!;
  assert.equal(currentCategory.name, 'Pet care');
  assert.ok(currentCategory.deletedAt !== null);
  assert.deepEqual(changeTransactionType(editorDraft, editorDraft.type, snapshot.categories), editorDraft);
  access.editTransaction(id, { ...editorDraft, description: 'Vet appointment', amount: '180,00', note: 'Annual visit' });
  const edited = access.read().transactions[0];
  assert.equal(edited.categoryId, category.id);
  assert.equal(financeCategoryName(edited, access.read().categories), 'Pet care');
  assert.ok(edited.updatedAt > original.updatedAt);
  assert.equal(changeTransactionType(transactionDraft(edited), 'income', snapshot.categories).categoryId, null);
});

test('an existing archived category can be explicitly changed to an active category', async (t) => {
  const { sqlite, access } = await initialized();
  t.after(() => sqlite.close());
  const category = access.createCategory('Pet care', 'expense');
  const id = access.createTransaction(draft({ categoryId: category.id }));
  access.deleteCategory(category.id);
  const snapshot = access.read();
  const active = snapshot.categories.find((item) => item.name === 'Pets' && item.deletedAt === null)!;
  access.editTransaction(id, { ...transactionDraft(snapshot.transactions[0]), categoryId: active.id });
  const edited = access.read().transactions[0];
  assert.equal(edited.categoryId, active.id);
  assert.equal(financeCategoryName(edited, access.read().categories), 'Pets');
  assert.throws(() => access.editTransaction(id, { ...transactionDraft(edited), categoryId: category.id }), /available category/);
});

test('an existing archived category can be explicitly changed to No category', async (t) => {
  const { sqlite, access } = await initialized();
  t.after(() => sqlite.close());
  const category = access.createCategory('Consulting', 'income');
  const id = access.createTransaction(draft({ type: 'income', categoryId: category.id }));
  access.deleteCategory(category.id);
  const snapshot = access.read();
  access.editTransaction(id, { ...transactionDraft(snapshot.transactions[0]), categoryId: null });
  const edited = access.read().transactions[0];
  assert.equal(edited.categoryId, null);
  assert.equal(financeCategoryForTransaction(transactionDraft(edited), snapshot.categories), null);
  assert.equal(financeCategoryName(edited, snapshot.categories), null);
  assert.throws(() => access.editTransaction(id, { ...transactionDraft(edited), categoryId: category.id }), /available category/);
});

test('historical category grouping resolves archived identities separately from replacement categories with the same name', async (t) => {
  const { sqlite, db, access } = await initialized();
  t.after(() => sqlite.close());
  const archived = access.createCategory('Pet care', 'expense');
  const first = access.createTransaction(draft({ categoryId: archived.id, description: 'Vet appointment' }));
  const second = access.createTransaction(draft({ categoryId: archived.id, description: 'Pet food', transactionDate: '2026-10-02' }));
  access.deleteCategory(archived.id);
  const replacement = access.createCategory('Pet care', 'expense');
  const third = access.createTransaction(draft({ categoryId: replacement.id, description: 'Grooming' }));
  const snapshot = access.read();
  assert.equal(financeCategoryName(snapshot.transactions.find((item) => item.id === first)!, snapshot.categories), 'Pet care');
  assert.equal(financeCategoryName(snapshot.transactions.find((item) => item.id === second)!, snapshot.categories), 'Pet care');
  assert.equal(snapshot.transactions.find((item) => item.id === third)!.categoryId, replacement.id);
  // Prove historical joins can classify archived rows; no analytics UI is introduced.
  const groups = db.select({ categoryId: schema.financeCategories.id, name: schema.financeCategories.name, count: sql<number>`count(*)` })
    .from(schema.financeTransactions).innerJoin(schema.financeCategories, eq(schema.financeTransactions.categoryId, schema.financeCategories.id))
    .groupBy(schema.financeCategories.id, schema.financeCategories.name).all();
  assert.equal(groups.length, 2);
  assert.deepEqual(groups.find((group) => group.categoryId === archived.id), { categoryId: archived.id, name: 'Pet care', count: 2 });
  assert.deepEqual(groups.find((group) => group.categoryId === replacement.id), { categoryId: replacement.id, name: 'Pet care', count: 1 });
});

test('SQLite rejects invalid Finance records, unsafe or fractional centavos, dates and missing references', async (t) => {
  const { sqlite, db, access } = await initialized();
  t.after(() => sqlite.close());
  access.createTransaction(draft());
  const row = access.read().transactions[0];
  const insert = (changes: Partial<FinanceTransaction>) => db.insert(schema.financeTransactions).values({ ...row, id: randomUUID(), ...changes }).run();
  for (const amountMinor of [0, -1, 1.5, maxAmountMinor + 1]) assert.throws(() => insert({ amountMinor }), /CHECK/);
  insert({ amountMinor: maxAmountMinor });
  assert.equal(access.read().transactions.find((item) => item.amountMinor === maxAmountMinor)!.amountMinor, maxAmountMinor);
  assert.throws(() => insert({ description: ' ' }), /CHECK/);
  assert.throws(() => insert({ type: 'transfer' as never }), /CHECK/);
  assert.throws(() => insert({ transactionDate: '2026-02-30' }), /CHECK/);
  assert.throws(() => insert({ transactionDate: '0000-01-01' }), /CHECK/);
  assert.throws(() => insert({ updatedAt: row.createdAt - 1 }), /CHECK/);
  assert.throws(() => insert({ categoryId: 'missing' }), /FOREIGN KEY/);
  const category = access.read().categories[0];
  assert.throws(() => db.insert(schema.financeCategories).values({ ...category, id: randomUUID(), type: 'both' as never }).run(), /CHECK/);
  assert.throws(() => db.insert(schema.financeCategories).values({ ...category, id: randomUUID(), name: ' ' }).run(), /CHECK/);
  // The database permits civil future dates; the entry domain deliberately records only actual movements.
  assert.doesNotThrow(() => insert({ transactionDate: '2099-01-01' }));
});

async function existingStage4() {
  const result = database();
  const stage4 = { journal: { ...journal, entries: journal.entries.slice(0, 2) }, migrations: { m0000: bundledMigrations.migrations.m0000, m0001: bundledMigrations.migrations.m0001 } };
  await migrate(result.db, stage4);
  seedDefaultCategories(result.db, 1000);
  const access = createTaskDataAccess(result.db, randomUUID, () => now);
  const category = access.read().categories[0];
  const oneTime = access.createTask({ ...taskDraft(), title: 'Existing task', categoryId: category.id });
  access.setCompleted(oneTime, true);
  access.createTask({ ...taskDraft(), title: 'Workout', date: '2026-09-28', time: '18:00', categoryId: category.id,
    recurrence: { frequency: 'weekly', interval: 1, weekdayMask: 1 | 4 | 16, monthDay: 28, month: 9, endDate: '' } });
  const snapshot = access.read();
  access.setOccurrenceStatus(snapshot.occurrences[0].id, 'skipped');
  return { ...result, access, snapshot: access.read() };
}

test('additive Finance migration preserves existing Tasks, categories, schedule versions and occurrence history exactly', async (t) => {
  const { sqlite, db, access, snapshot } = await existingStage4();
  t.after(() => sqlite.close());
  const beforeSchema = sqlite.prepare("SELECT name, sql FROM sqlite_master WHERE name LIKE 'task%' ORDER BY name").all();
  await migrate(db, bundledMigrations);
  seedFinanceCategories(db, 2000);
  assert.deepEqual(access.read(), snapshot);
  const afterSchema = sqlite.prepare("SELECT name, sql FROM sqlite_master WHERE name LIKE 'task%' ORDER BY name").all();
  assert.deepEqual(afterSchema.filter((row) => row.name !== 'task_occurrences_date_idx'), beforeSchema);
  assert.match(String(afterSchema.find((row) => row.name === 'task_occurrences_date_idx')?.sql), /ON `task_occurrences` \(`scheduled_date`\)/);
  await migrate(db, bundledMigrations);
  assert.deepEqual(access.read(), snapshot);
  assert.equal(db.select().from(schema.financeCategories).all().length, 13);
  assert.equal(sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()!.count, journal.entries.length);
});

test('a failed Finance migration rolls back new tables and indexes, retains Stage 4 data and retries safely', async (t) => {
  const { sqlite, db, access, snapshot } = await existingStage4();
  t.after(() => sqlite.close());
  const broken = { ...bundledMigrations, migrations: { ...bundledMigrations.migrations,
    m0002: `${bundledMigrations.migrations.m0002}\n--> statement-breakpoint\nINVALID SQL;` } };
  await assert.rejects(migrate(db, broken));
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM sqlite_master WHERE name LIKE 'finance_%'").get()!.count, 0);
  assert.deepEqual(access.read(), snapshot);
  assert.equal(sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()!.count, 2);
  await migrate(db, bundledMigrations);
  seedFinanceCategories(db, 2000);
  assert.deepEqual(access.read(), snapshot);
  assert.equal(db.select().from(schema.financeCategories).all().length, 13);
});

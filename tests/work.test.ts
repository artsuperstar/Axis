/// <reference types="node" />

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import * as schema from '../src/database/schema';
import { seedDefaultCategories } from '../src/database/seed';
import { createCommitmentDataAccess } from '../src/features/finance/commitments/data';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import { createFinanceDataAccess } from '../src/features/finance/data';
import { FinanceValidationError } from '../src/features/finance/errors';
import { financeCategoryName, transactionDraft } from '../src/features/finance/form';
import { formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { periodBounds } from '../src/features/finance/periods';
import { seedFinanceCategories } from '../src/features/finance/seed';
import { createWorkDataAccess } from '../src/features/finance/work/data';
import { allocationValues, durationMinutes, earnedMinor, hourlyEarnedMinor, validateWorkDraft, workDraft } from '../src/features/finance/work/form';
import { clientAutocomplete, paymentClientAutocomplete } from '../src/features/finance/work/form-options';
import type { WorkDraft, WorkPaymentDraft } from '../src/features/finance/work/types';
import { createTaskDataAccess } from '../src/features/tasks/data';
import { taskDraft } from '../src/features/tasks/form';
import { localDateString, pickerValue } from '../src/utils/calendar';
import { bundledMigrations, database, journal } from './helpers/database';

const today = '2026-10-03';
const now = () => pickerValue(today).getTime();
const fixed = (counterpartyId: string, amount = '1000', changes: Partial<WorkDraft> = {}): WorkDraft => ({ ...workDraft(null, today), compensationType: 'fixed', title: 'Website', description: 'Website', counterpartyId, fixedAmount: amount, ...changes });
async function initialized(filename = ':memory:') {
  const result = database(filename); await migrate(result.db, bundledMigrations);
  seedDefaultCategories(result.db, 1000); seedFinanceCategories(result.db, 1000);
  return { ...result, work: createWorkDataAccess(result.db, randomUUID, now), finance: createFinanceDataAccess(result.db, randomUUID, now) };
}
type WorkAccess = ReturnType<typeof createWorkDataAccess>;
const item = (work: WorkAccess, id: string) => work.read().items.find((row) => row.entry.id === id)!;
function payment(counterpartyId: string, workEntryId: string, amount: string, changes: Partial<WorkPaymentDraft> = {}): WorkPaymentDraft {
  return { counterpartyId, allocations: [{ workEntryId, amount }], paymentDate: today, categoryId: null, ...changes };
}

for (const [minutes, rate, expected] of [[180, 5000, 15000], [150, 5000, 12500], [1, 1, 0], [29, 1, 0], [30, 1, 1], [31, 1, 1], [90, 1, 2], [1, 30, 1], [1, 29, 0], [60, maxAmountMinor, maxAmountMinor]] as const) {
  test(`hourly nearest-centavo calculation: ${minutes} minutes at ${rate} centavos/hour = ${expected}`, () => assert.equal(hourlyEarnedMinor(minutes, rate), expected));
}
test('hourly arithmetic uses BigInt beyond a safe intermediate product and rejects an unsafe result', () => {
  assert.equal(hourlyEarnedMinor(maxAmountMinor, 1), Number((BigInt(maxAmountMinor) + 30n) / 60n));
  assert.equal(hourlyEarnedMinor(59, maxAmountMinor), Number((59n * BigInt(maxAmountMinor) + 30n) / 60n));
  assert.throws(() => hourlyEarnedMinor(61, maxAmountMinor), /supported/);
  for (const duration of [0, -1, 1.5, NaN, Infinity, maxAmountMinor + 1]) assert.throws(() => hourlyEarnedMinor(duration, 5000), FinanceValidationError);
  for (const rate of [0, -1, 1.5, NaN, Infinity, maxAmountMinor + 1]) assert.throws(() => hourlyEarnedMinor(60, rate), FinanceValidationError);
});
test('duration accepts whole hours/minutes and rejects invalid, empty, fractional and unsafe values', () => {
  assert.equal(durationMinutes('2', '30'), 150); assert.equal(durationMinutes('', '1'), 1); assert.equal(durationMinutes('3', ''), 180);
  for (const [hours, minutes] of [['', ''], ['0', '0'], ['-1', '0'], ['1.5', '0'], ['1e2', '0'], ['1', '60'], ['0', '-1'], ['0', '0.5'], [String(maxAmountMinor), '0']]) {
    assert.throws(() => durationMinutes(hours, minutes), FinanceValidationError);
  }
});
test('work validation keeps Hourly/Fixed terms consistent and preserves nearest-cent results', () => {
  const hourly = { ...workDraft(null, today), title: 'Translation', description: 'Translation', counterpartyId: 'client', hours: '2', minutes: '30', hourlyRate: '50', fixedAmount: '999' };
  const values = validateWorkDraft(hourly, today);
  assert.equal(values.durationMinutes, 150); assert.equal(values.hourlyRateMinor, 5000); assert.equal(values.fixedAmountMinor, null); assert.equal(earnedMinor(values), 12500);
  const fixedValues = validateWorkDraft({ ...hourly, compensationType: 'fixed', fixedAmount: '800' }, today);
  assert.equal(fixedValues.durationMinutes, null); assert.equal(fixedValues.hourlyRateMinor, null); assert.equal(fixedValues.fixedAmountMinor, 80000);
  for (const amount of ['', '0', '-1', '1,001', '90.071.992.547.409,92']) assert.throws(() => validateWorkDraft(fixed('client', amount), today), FinanceValidationError);
  assert.equal(earnedMinor(validateWorkDraft({ ...hourly, hours: '0', minutes: '1', hourlyRate: '0,01' }, today)), 0);
  assert.equal(earnedMinor(validateWorkDraft({ ...hourly, hours: '0', minutes: '30', hourlyRate: '0,01' }, today)), 1);
  for (const changes of [{ counterpartyId: null }, { compensationType: 'salary' as never }, { workDate: '2026-02-30' }, { workDate: '2026-10-04' }, { expectedPaymentDate: '2026-02-29' }]) {
    assert.throws(() => validateWorkDraft({ ...hourly, ...changes }, today), FinanceValidationError);
  }
});

test('Title remains required and persisted Title has no pasted line breaks', () => {
  const values = validateWorkDraft(fixed('client', '1000', { title: ' Logo\r\nDesign\u2028Project ' }), today);
  assert.equal(values.title, 'Logo Design Project');
  for (const title of ['', '  ', '\r\n\u2028\u2029']) assert.throws(() => validateWorkDraft(fixed('client', '1000', { title }), today), /job title/i);
});
test('a tiny hourly entry rounded to zero is retained without Income or an outstanding obligation', async (t) => {
  const { sqlite, work, finance } = await initialized(); t.after(() => sqlite.close());
  const client = work.createCounterparty('A');
  const id = work.create({ ...workDraft(null, today), counterpartyId: client.id, title: 'One minute of work', description: 'One minute of work', hours: '0', minutes: '1', hourlyRate: '0,01', expectedPaymentDate: '2026-10-01' });
  assert.equal(item(work, id).entry.durationMinutes, 1); assert.equal(item(work, id).earnedMinor, 0); assert.equal(item(work, id).receivedMinor, 0);
  assert.equal(item(work, id).outstandingMinor, 0); assert.equal(item(work, id).overdue, false); assert.equal(item(work, id).status, 'paid');
  assert.equal(finance.read().transactions.length, 0); assert.throws(() => work.recordPayment(payment(client.id, id, '0,01')), /exceeds/);
});
test('counterparties normalize names, enforce active uniqueness, archive and retain historical names', async (t) => {
  const { sqlite, work } = await initialized(); t.after(() => sqlite.close());
  const client = work.createCounterparty('  Acme   Studio '); assert.equal(client.name, 'Acme Studio');
  assert.throws(() => work.createCounterparty('acme studio'), /already exists/); assert.throws(() => work.createCounterparty(' '), /name/);
  const id = work.create(fixed(client.id)); work.archiveCounterparty(client.id); work.archiveCounterparty(client.id);
  assert.equal(item(work, id).counterparty.name, 'Acme Studio');
  assert.ok(item(work, id).counterparty.deletedAt);
  assert.ok(!clientAutocomplete(work.read().counterparties, 'Acme').suggestions.some((option) => option.value === client.id));
  assert.throws(() => work.create(fixed(client.id)), /active client/);
  work.edit(id, { ...workDraft(item(work, id).entry), description: 'Historical website' });
  assert.equal(item(work, id).entry.counterpartyId, client.id);
  const replacement = work.createCounterparty('Acme Studio'); assert.notEqual(replacement.id, client.id);
});
test('Work creation creates no Finance Income and captures local dates and historical compensation', async (t) => {
  const { sqlite, work, finance } = await initialized(); t.after(() => sqlite.close());
  const client = work.createCounterparty('Acme');
  const first = work.create({ ...workDraft(null, today), title: 'Translation', description: 'Translation', counterpartyId: client.id, hours: '3', hourlyRate: '50', workDate: '2026-09-30', expectedPaymentDate: '2026-10-12' });
  work.create({ ...workDraft(null, today), title: 'Later rate', description: 'Later rate', counterpartyId: client.id, hours: '3', hourlyRate: '80' });
  assert.equal(item(work, first).entry.hourlyRateMinor, 5000); assert.equal(item(work, first).earnedMinor, 15000);
  assert.equal(item(work, first).entry.workDate, '2026-09-30'); assert.equal(item(work, first).entry.expectedPaymentDate, '2026-10-12');
  assert.equal(item(work, first).status, 'unpaid'); assert.equal(item(work, first).receivedMinor, 0);
  assert.equal(finance.read().transactions.length, 0); assert.equal(finance.readDashboard(periodBounds('month', today)).analytics.incomeMinor, 0n);
});
test('unpaid work edits compensation and counterparties and soft deletes without changing the ledger', async (t) => {
  const { sqlite, db, work, finance } = await initialized(); t.after(() => sqlite.close());
  const client = work.createCounterparty('First'); const second = work.createCounterparty('Second'); const id = work.create(fixed(client.id));
  work.edit(id, { ...workDraft(item(work, id).entry), compensationType: 'hourly', hours: '2', minutes: '30', hourlyRate: '40', counterpartyId: second.id });
  assert.equal(item(work, id).earnedMinor, 10000); assert.equal(item(work, id).entry.fixedAmountMinor, null);
  work.delete(id); assert.equal(work.read().items.length, 0); assert.equal(work.read().totals.earnedMinor, 0n);
  assert.ok(db.select().from(schema.workEntries).where(eq(schema.workEntries.id, id)).get()!.deletedAt);
  assert.equal(finance.read().transactions.length, 0); assert.throws(() => work.edit(id, fixed(second.id)), /no longer available/);
});
test('partial then final receipt creates distinct Income payments without changing Earned', async (t) => {
  const { sqlite, work, finance } = await initialized(); t.after(() => sqlite.close());
  const client = work.createCounterparty('Acme'); const id = work.create(fixed(client.id));
  work.recordPayment(payment(client.id, id, '400'));
  assert.deepEqual([item(work, id).earnedMinor, item(work, id).receivedMinor, item(work, id).outstandingMinor, item(work, id).status], [100000, 40000, 60000, 'partial']);
  work.recordPayment(payment(client.id, id, '600'));
  assert.deepEqual([item(work, id).earnedMinor, item(work, id).receivedMinor, item(work, id).outstandingMinor, item(work, id).status], [100000, 100000, 0, 'paid']);
  assert.equal(finance.read().transactions.length, 2); assert.equal(finance.readDashboard(periodBounds('month', today)).analytics.incomeMinor, 100000n);
  assert.deepEqual(work.read().totals, { earnedMinor: 100000n, receivedMinor: 100000n, outstandingMinor: 0n });
});
test('a combined receipt is one Income transaction reconciled to several allocations', async (t) => {
  const { sqlite, db, work, finance } = await initialized(); t.after(() => sqlite.close());
  const client = work.createCounterparty('Acme Studio'); const a = work.create(fixed(client.id, '300', { description: 'Translation' })); const b = work.create(fixed(client.id, '500', { description: 'Website fixes' }));
  const category = finance.createCategory('Work income', 'income');
  const id = work.recordPayment({ counterpartyId: client.id, allocations: [{ workEntryId: a, amount: '300' }, { workEntryId: b, amount: '200' }], categoryId: category.id, paymentDate: '2026-10-01' });
  const ledger = finance.read().transactions;
  assert.equal(ledger.length, 1); assert.equal(ledger[0].id, id); assert.equal(ledger[0].type, 'income'); assert.equal(ledger[0].amountMinor, 50000);
  assert.equal(ledger[0].description, 'Acme Studio'); assert.equal(ledger[0].transactionDate, '2026-10-01'); assert.equal(ledger[0].categoryId, category.id);
  const rows = db.select().from(schema.workPaymentAllocations).all(); assert.equal(rows.length, 2);
  assert.equal(rows.reduce((sum, row) => sum + BigInt(row.amountMinor), 0n), BigInt(ledger[0].amountMinor));
  assert.equal(item(work, a).status, 'paid'); assert.equal(item(work, b).outstandingMinor, 30000);
  assert.deepEqual(work.read().counterpartyTotals[0], { counterparty: work.read().counterparties[0], earnedMinor: 80000n, receivedMinor: 50000n, outstandingMinor: 30000n });
});
test('allocation validation rejects duplicates, empty/zero/negative/unsafe amounts and unsafe payment totals', () => {
  for (const amount of ['', '0', '-1', '0,001', 'NaN', '90.071.992.547.409,92']) assert.throws(() => allocationValues([{ workEntryId: 'a', amount }]), FinanceValidationError);
  assert.throws(() => allocationValues([]), /Select/);
  assert.throws(() => allocationValues([{ workEntryId: 'a', amount: '1' }, { workEntryId: 'a', amount: '1' }]), /only once/);
  assert.throws(() => allocationValues([{ workEntryId: 'a', amount: formatBrlInput(maxAmountMinor) }, { workEntryId: 'b', amount: '0,01' }]), /total exceeds/);
});
test('payments reject excess outstanding, mixed parties, missing/deleted entries and non-Income or archived categories', async (t) => {
  const { sqlite, work, finance } = await initialized(); t.after(() => sqlite.close());
  const client = work.createCounterparty('A'); const other = work.createCounterparty('B'); const id = work.create(fixed(client.id, '100')); const second = work.create(fixed(other.id));
  const deleted = work.create(fixed(client.id)); work.delete(deleted);
  const expense = finance.createCategory('Expense', 'expense'); const archived = finance.createCategory('Archived income', 'income'); finance.deleteCategory(archived.id);
  const invalid = [payment(client.id, id, '100,01'), payment(client.id, 'missing', '1'), payment(client.id, deleted, '1'), payment(null as never, id, '1'),
    payment(client.id, id, '1', { allocations: [{ workEntryId: id, amount: '1' }, { workEntryId: second, amount: '1' }] }),
    payment(client.id, id, '1', { categoryId: expense.id }), payment(client.id, id, '1', { categoryId: archived.id }), payment(client.id, id, '1', { categoryId: 'missing' }),
    payment(client.id, id, '1', { paymentDate: '2026-10-04' }), payment(client.id, id, '1', { paymentDate: '2026-02-30' })];
  for (const value of invalid) assert.throws(() => work.recordPayment(value), FinanceValidationError);
  assert.equal(work.read().payments.length, 0); assert.equal(finance.read().transactions.length, 0);
  work.recordPayment(payment(client.id, id, '100')); assert.throws(() => work.recordPayment(payment(client.id, id, '0,01')), /exceeds/);
});
test('payment overdue is derived from local today without modifying expected dates or stored status', async (t) => {
  const { sqlite, db, work } = await initialized(); t.after(() => sqlite.close());
  const client = work.createCounterparty('A'); const old = work.create(fixed(client.id, '100', { expectedPaymentDate: '2026-10-02' }));
  const due = work.create(fixed(client.id, '100', { expectedPaymentDate: today })); const none = work.create(fixed(client.id));
  assert.equal(item(work, old).overdue, true); assert.equal(item(work, due).overdue, false); assert.equal(item(work, none).overdue, false);
  work.recordPayment(payment(client.id, old, '40')); assert.equal(item(work, old).overdue, true);
  work.recordPayment(payment(client.id, old, '60')); assert.equal(item(work, old).overdue, false);
  const tomorrow = createWorkDataAccess(db, randomUUID, () => pickerValue('2026-10-04').getTime()); assert.equal(item(tomorrow, due).overdue, true);
  assert.equal(item(tomorrow, due).entry.expectedPaymentDate, today);
  assert.ok(!sqlite.prepare('PRAGMA table_info(work_entries)').all().some((column) => column.name === 'status'));
});
test('archived counterparties still receive historical debts and archived Income labels remain historical', async (t) => {
  const { sqlite, work, finance } = await initialized(); t.after(() => sqlite.close());
  const client = work.createCounterparty('Past client'); const id = work.create(fixed(client.id, '100'));
  work.archiveCounterparty(client.id); const options = paymentClientAutocomplete(work.read().counterparties, work.read().items, 'Past').suggestions;
  assert.deepEqual(options, [{ value: client.id, label: 'Past client (archived)' }]);
  const category = finance.createCategory('Past income', 'income'); const paid = work.recordPayment(payment(client.id, id, '100', { categoryId: category.id }));
  finance.deleteCategory(category.id);
  const transaction = finance.read().transactions[0]; assert.equal(financeCategoryName(transaction, finance.read().categories), 'Past income');
  finance.editTransaction(paid, { ...transactionDraft(transaction), note: 'Safe edit' });
  assert.equal(work.read().payments[0].transaction.categoryId, category.id); assert.equal(item(work, id).counterparty.name, 'Past client');
});
test('allocated work cannot lower Earned below Received, change party, or be silently deleted', async (t) => {
  const { sqlite, work } = await initialized(); t.after(() => sqlite.close());
  const client = work.createCounterparty('A'); const other = work.createCounterparty('B'); const id = work.create(fixed(client.id)); const paid = work.recordPayment(payment(client.id, id, '800'));
  const before = item(work, id).entry;
  assert.throws(() => work.edit(id, fixed(client.id, '500')), /already received/); assert.equal(item(work, id).entry.fixedAmountMinor, 100000);
  assert.throws(() => work.edit(id, fixed(other.id)), /client/); assert.throws(() => work.delete(id), /Undo/);
  work.edit(id, fixed(client.id, '900', { expectedPaymentDate: '2026-10-20' })); assert.equal(item(work, id).outstandingMinor, 10000);
  assert.equal(item(work, id).entry.createdAt, before.createdAt); assert.ok(item(work, id).entry.updatedAt > before.updatedAt);
  work.undoPayment(paid); work.delete(id); assert.equal(work.read().items.length, 0);
});
test('ordinary Finance edits protect linked Income amount/type/deletion while allowing safe fields', async (t) => {
  const { sqlite, work, finance } = await initialized(); t.after(() => sqlite.close());
  const client = work.createCounterparty('A'); const id = work.create(fixed(client.id)); const paid = work.recordPayment(payment(client.id, id, '400'));
  const transaction = finance.read().transactions[0]; assert.deepEqual(finance.read().workPaymentTransactionIds, [paid]);
  assert.throws(() => finance.editTransaction(paid, { ...transactionDraft(transaction), type: 'expense' }), /Income/);
  assert.throws(() => finance.editTransaction(paid, { ...transactionDraft(transaction), amount: '399' }), /allocations/);
  assert.throws(() => finance.deleteTransaction(paid), /Undo payment in Work/);
  const category = finance.createCategory('Freelancing', 'income');
  finance.editTransaction(paid, { ...transactionDraft(transaction), description: 'Updated description', note: 'Receipt', transactionDate: '2026-09-30', categoryId: category.id });
  const updated = work.read().payments[0].transaction;
  assert.equal(updated.type, 'income'); assert.equal(updated.amountMinor, 40000); assert.equal(updated.description, 'Updated description'); assert.equal(updated.note, 'Receipt'); assert.equal(updated.transactionDate, '2026-09-30');
  assert.equal(item(work, id).receivedMinor, 40000); assert.equal(finance.readDashboard(periodBounds('month', today)).analytics.incomeMinor, 0n);
  assert.equal(finance.readDashboard(periodBounds('month', '2026-09-30')).analytics.incomeMinor, 40000n);
});
test('Undo reverses all combined allocations atomically, preserving other payments and historical tombstones', async (t) => {
  const { sqlite, db, work, finance } = await initialized(); t.after(() => sqlite.close());
  const client = work.createCounterparty('A'); const a = work.create(fixed(client.id, '100')); const b = work.create(fixed(client.id, '200'));
  work.recordPayment(payment(client.id, b, '50'));
  const combined = work.recordPayment({ counterpartyId: client.id, allocations: [{ workEntryId: a, amount: '100' }, { workEntryId: b, amount: '150' }], categoryId: null, paymentDate: today });
  work.undoPayment(combined);
  assert.equal(item(work, a).status, 'unpaid'); assert.equal(item(work, b).status, 'partial'); assert.equal(item(work, b).receivedMinor, 5000);
  assert.equal(finance.read().transactions.length, 1); assert.equal(finance.readDashboard(periodBounds('month', today)).analytics.incomeMinor, 5000n);
  assert.ok(db.select().from(schema.workPaymentAllocations).all().filter((row) => row.financeTransactionId === combined).every((row) => row.deletedAt !== null));
  assert.ok(db.select().from(schema.financeTransactions).where(eq(schema.financeTransactions.id, combined)).get()!.deletedAt);
  assert.throws(() => work.undoPayment(combined), /no longer available/);
  work.recordPayment(payment(client.id, a, '100')); assert.equal(item(work, a).status, 'paid');
});
test('failed payment insertion rolls back the Income and every allocation', async (t) => {
  const { sqlite, db, work, finance } = await initialized(); t.after(() => sqlite.close());
  const client = work.createCounterparty('A'); const a = work.create(fixed(client.id, '100')); const b = work.create(fixed(client.id, '200'));
  sqlite.exec(`CREATE TRIGGER fail_second_allocation BEFORE INSERT ON work_payment_allocations WHEN NEW.work_entry_id = '${b}' BEGIN SELECT RAISE(ABORT, 'forced allocation failure'); END;`);
  assert.throws(() => work.recordPayment({ counterpartyId: client.id, allocations: [{ workEntryId: a, amount: '100' }, { workEntryId: b, amount: '200' }], categoryId: null, paymentDate: today }), /forced allocation failure/);
  assert.equal(finance.read().transactions.length, 0); assert.equal(db.select().from(schema.workPaymentAllocations).all().length, 0); assert.equal(item(work, a).receivedMinor, 0);
});
test('failed Undo restores active allocations and Income together', async (t) => {
  const { sqlite, db, work, finance } = await initialized(); t.after(() => sqlite.close());
  const client = work.createCounterparty('A'); const id = work.create(fixed(client.id)); const paid = work.recordPayment(payment(client.id, id, '400'));
  sqlite.exec("CREATE TRIGGER fail_income_undo BEFORE UPDATE OF deleted_at ON finance_transactions BEGIN SELECT RAISE(ABORT, 'forced undo failure'); END;");
  assert.throws(() => work.undoPayment(paid), /forced undo failure/);
  assert.equal(item(work, id).receivedMinor, 40000); assert.equal(finance.read().transactions.length, 1);
  assert.equal(db.select().from(schema.workPaymentAllocations).get()!.deletedAt, null);
});
test('SQLite enforces compensation invariants, dates, positive allocations, Income FKs and historical references', async (t) => {
  const { sqlite, db, work, finance } = await initialized(); t.after(() => sqlite.close());
  const client = work.createCounterparty('A'); const id = work.create(fixed(client.id));
  const income = finance.createTransaction({ ...transactionDraft(null, pickerValue(today)), type: 'income', amount: '1', description: 'Income' });
  const expense = finance.createTransaction({ ...transactionDraft(null, pickerValue(today)), amount: '1', description: 'Expense' });
  const row = item(work, id).entry;
  for (const changes of [{ durationMinutes: 60 }, { hourlyRateMinor: 5000 }, { fixedAmountMinor: null }, { fixedAmountMinor: 1.5 }, { fixedAmountMinor: 0 },
    { workDate: '2026-02-30' }, { expectedPaymentDate: '2026-02-30' }, { counterpartyId: 'missing' }, { compensationType: 'hourly' as const }, { compensationType: 'salary' as never }]) {
    assert.throws(() => db.update(schema.workEntries).set(changes).where(eq(schema.workEntries.id, id)).run(), /CHECK|FOREIGN KEY/);
  }
  const base = { id: randomUUID(), workEntryId: id, financeTransactionId: income, amountMinor: 100, createdAt: now() };
  for (const changes of [{ amountMinor: 0 }, { amountMinor: -1 }, { amountMinor: 1.5 }, { financeTransactionId: expense }, { financeTransactionId: 'missing' }, { workEntryId: 'missing' }, { transactionType: 'expense' as never }]) {
    assert.throws(() => db.insert(schema.workPaymentAllocations).values({ ...base, ...changes }).run(), /CHECK|FOREIGN KEY/);
  }
  db.insert(schema.workPaymentAllocations).values(base).run();
  assert.throws(() => db.insert(schema.workPaymentAllocations).values({ ...base, id: randomUUID() }).run(), /UNIQUE/);
  assert.throws(() => db.delete(schema.workCounterparties).where(eq(schema.workCounterparties.id, client.id)).run(), /FOREIGN KEY/);
  assert.throws(() => db.delete(schema.workEntries).where(eq(schema.workEntries.id, row.id)).run(), /FOREIGN KEY/);
  assert.throws(() => db.delete(schema.financeTransactions).where(eq(schema.financeTransactions.id, income)).run(), /FOREIGN KEY/);
  assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), []); assert.equal(sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
});
test('Work detects externally corrupted reconciliation rather than reporting incorrect balances', async (t) => {
  const { sqlite, db, work } = await initialized(); t.after(() => sqlite.close());
  const client = work.createCounterparty('A'); const id = work.create(fixed(client.id)); const paid = work.recordPayment(payment(client.id, id, '400'));
  db.update(schema.financeTransactions).set({ amountMinor: 39900 }).where(eq(schema.financeTransactions.id, paid)).run();
  assert.throws(() => work.read(), /does not match/);
  db.update(schema.financeTransactions).set({ amountMinor: 40000, deletedAt: now() }).where(eq(schema.financeTransactions.id, paid)).run();
  assert.throws(() => work.read(), /needs reconciliation/);
});
test('Work and counterparty aggregate totals stay exact above the Number safe total', async (t) => {
  const { sqlite, work } = await initialized(); t.after(() => sqlite.close());
  const client = work.createCounterparty('A');
  for (let i = 0; i < 3; i++) { const id = work.create(fixed(client.id, formatBrlInput(maxAmountMinor))); work.recordPayment(payment(client.id, id, formatBrlInput(maxAmountMinor))); }
  assert.equal(work.read().totals.earnedMinor, 3n * BigInt(maxAmountMinor)); assert.equal(work.read().totals.receivedMinor, 3n * BigInt(maxAmountMinor));
  assert.equal(work.read().counterpartyTotals[0].outstandingMinor, 0n);
});
test('restart preserves UUID work, archived names, allocations, exact balances and local dates', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'axis-work-')); const filename = join(directory, 'axis.db');
  let opened = await initialized(filename); t.after(() => { opened.sqlite.close(); for (const file of [filename, `${filename}-wal`, `${filename}-shm`]) { try { unlinkSync(file); } catch { /* SQLite may already remove sidecars. */ } } rmdirSync(directory); });
  const client = opened.work.createCounterparty('A'); const id = opened.work.create(fixed(client.id, '1000', { workDate: '2026-09-30', expectedPaymentDate: '2026-10-02' }));
  opened.work.recordPayment(payment(client.id, id, '400', { paymentDate: '2026-10-01' })); opened.work.archiveCounterparty(client.id);
  const before = opened.work.read(); opened.sqlite.close(); opened = await initialized(filename);
  assert.deepEqual(opened.work.read(), before); assert.match(id, /^[\da-f-]{36}$/i);
  assert.deepEqual(opened.sqlite.prepare('PRAGMA foreign_key_check').all(), []); assert.equal(opened.sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
});
test('local Work business dates do not shift across time zones or DST', () => {
  const previous = process.env.TZ;
  try {
    for (const zone of ['America/Sao_Paulo', 'America/New_York', 'Pacific/Kiritimati', 'Pacific/Honolulu']) {
      process.env.TZ = zone;
      const date = localDateString(new Date(2026, 2, 8, 0, 15));
      assert.equal(date, '2026-03-08'); assert.equal(workDraft(null, date).workDate, date);
      assert.equal(validateWorkDraft(fixed('a', '100', { workDate: date, expectedPaymentDate: '2026-03-09' }), today).workDate, date);
    }
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

async function existingStage7() {
  const result = database(); await migrate(result.db, { ...bundledMigrations, journal: { ...journal, entries: journal.entries.slice(0, 4) } });
  seedDefaultCategories(result.db, 1000); seedFinanceCategories(result.db, 1000);
  const tasks = createTaskDataAccess(result.db, randomUUID, now); const finance = createFinanceDataAccess(result.db, randomUUID, now); const commitments = createCommitmentDataAccess(result.db, randomUUID, now);
  tasks.createTask({ ...taskDraft(), title: 'Existing task' });
  tasks.createTask({ ...taskDraft(), title: 'Workout', date: '2026-09-28', recurrence: { frequency: 'weekly', interval: 1, weekdayMask: 1 | 4 | 16, monthDay: 28, month: 9, endDate: '' } });
  const occurrence = tasks.read().occurrences[0]; tasks.setOccurrenceStatus(occurrence.id, 'skipped');
  const category = finance.createCategory('Past pets', 'expense');
  finance.createTransaction({ ...transactionDraft(null, pickerValue(today)), description: 'Existing expense', amount: '50', categoryId: category.id });
  finance.createTransaction({ ...transactionDraft(null, pickerValue(today)), description: 'Existing income', type: 'income', amount: '500' });
  const id = commitments.create({ ...commitmentDraft(null, undefined, today), title: 'Existing bill', amount: '180', firstDueDate: '2026-09-03', categoryId: category.id });
  const commitment = commitments.read().items.find((row) => row.commitment.id === id)!;
  commitments.pay(commitment.outstanding[0], '170', '2026-10-01'); commitments.skip(commitment.outstanding[1]);
  commitments.pause(id); commitments.resume(id, '2026-10-20'); finance.deleteCategory(category.id);
  const oldTables = ['task_categories', 'tasks', 'task_recurrences', 'task_occurrences', 'finance_categories', 'finance_transactions', 'finance_commitments', 'finance_commitment_schedules', 'finance_commitment_occurrences'];
  const snapshot = () => Object.fromEntries(oldTables.map((table) => [table, result.sqlite.prepare(`SELECT * FROM ${table} ORDER BY id`).all()]));
  return { ...result, snapshot, before: snapshot(), definitions: result.sqlite.prepare("SELECT name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations' ORDER BY name").all() };
}
test('additive Stage 8 migration preserves all Tasks, Finance/dashboard facts, commitments, schedules, occurrences and payment links', async (t) => {
  const { sqlite, db, snapshot, before, definitions } = await existingStage7(); t.after(() => sqlite.close());
  const finance = createFinanceDataAccess(db, randomUUID, now); const period = periodBounds('month', today); const analytics = finance.readDashboard(period).analytics;
  await migrate(db, bundledMigrations); assert.deepEqual(snapshot(), before); assert.deepEqual(finance.readDashboard(period).analytics, analytics);
  const after = sqlite.prepare("SELECT name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all();
  for (const old of definitions) assert.deepEqual(after.find((row) => row.name === old.name), old);
  assert.equal(createWorkDataAccess(db, randomUUID, now).read().items.length, 0);
  await migrate(db, bundledMigrations); assert.deepEqual(snapshot(), before); assert.equal(sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()!.count, journal.entries.length);
  assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), []); assert.equal(sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
});
test('failed Stage 8 migration rolls back only new Work tables and safely retries', async (t) => {
  const { sqlite, db, snapshot, before } = await existingStage7(); t.after(() => sqlite.close());
  const broken = { ...bundledMigrations, migrations: { ...bundledMigrations.migrations, m0004: `${bundledMigrations.migrations.m0004}\n--> statement-breakpoint\nINVALID SQL;` } };
  await assert.rejects(migrate(db, broken)); assert.deepEqual(snapshot(), before);
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM sqlite_master WHERE name LIKE 'work_%'").get()!.count, 0);
  assert.equal(sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()!.count, 4);
  await migrate(db, bundledMigrations); assert.deepEqual(snapshot(), before);
});

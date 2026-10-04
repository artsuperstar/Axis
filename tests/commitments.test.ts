/// <reference types="node" />

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { and, eq, lt } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import * as schema from '../src/database/schema';
import { seedDefaultCategories } from '../src/database/seed';
import { createCommitmentDataAccess } from '../src/features/finance/commitments/data';
import { commitmentDraft, validateCommitmentDraft, validatePayment } from '../src/features/finance/commitments/form';
import { historyStart, occurrenceLabel, proposedResumeDate, scheduledDues } from '../src/features/finance/commitments/scheduling';
import { commitmentKinds, type CommitmentDraft, type CommitmentSchedule } from '../src/features/finance/commitments/types';
import { createFinanceDataAccess } from '../src/features/finance/data';
import { FinanceValidationError } from '../src/features/finance/errors';
import { categoriesForType, financeCategoryName, transactionDraft } from '../src/features/finance/form';
import { maxAmountMinor } from '../src/features/finance/money';
import { periodBounds } from '../src/features/finance/periods';
import { seedFinanceCategories } from '../src/features/finance/seed';
import { createTaskDataAccess } from '../src/features/tasks/data';
import { taskDraft } from '../src/features/tasks/form';
import { pickerValue } from '../src/utils/calendar';
import { bundledMigrations, database, journal } from './helpers/database';

const initialDay = '2026-10-03';
function draft(changes: Partial<CommitmentDraft> = {}): CommitmentDraft {
  return { ...commitmentDraft(null, undefined, initialDay), title: 'Electricity', amount: '180,00', firstDueDate: '2026-10-10', ...changes };
}
async function initialized(filename = ':memory:') {
  const result = database(filename);
  await migrate(result.db, bundledMigrations);
  seedDefaultCategories(result.db, 1000);
  seedFinanceCategories(result.db, 1000);
  let time = pickerValue(initialDay).getTime();
  return { ...result, access: createCommitmentDataAccess(result.db, randomUUID, () => time), finance: createFinanceDataAccess(result.db, randomUUID, () => time),
    setDay: (day: string) => { time = pickerValue(day).getTime(); } };
}
type Access = ReturnType<typeof createCommitmentDataAccess>;
function item(access: Access, id?: string) {
  return access.read().items.find((value) => !id || value.commitment.id === id)!;
}
function schedule(startDate: string): CommitmentSchedule {
  return { id: 'schedule', commitmentId: 'parent', startDate, billingDay: Number(startDate.slice(-2)), expectedAmountMinor: 18000,
    firstInstallmentIndex: 1, effectiveFrom: startDate, effectiveUntil: null, createdAt: 1000, updatedAt: 1000 };
}

for (const kind of commitmentKinds) test(`${kind} creation stores its distinct kind without creating a ledger Expense`, async (t) => {
  const { sqlite, db, access, finance } = await initialized(); t.after(() => sqlite.close());
  const id = access.create(draft({ kind, installmentCount: kind === 'installment' ? '12' : '' }));
  const result = item(access, id);
  assert.match(id, /^[\da-f-]{36}$/i);
  assert.equal(result.commitment.kind, kind);
  assert.equal(result.commitment.status, 'active');
  assert.equal(result.commitment.expectedAmountMinor, 18000);
  assert.equal(result.commitment.installmentCount, kind === 'installment' ? 12 : null);
  assert.equal(result.upcoming!.dueDate, '2026-10-10');
  assert.equal(result.upcoming!.installmentIndex, kind === 'installment' ? 1 : null);
  assert.equal(db.select().from(schema.commitmentOccurrences).all().length, 0, 'future previews are not prematurely materialized');
  assert.equal(finance.readDashboard(periodBounds('month', initialDay)).analytics.expensesMinor, 0n);
  assert.equal(finance.read().transactions.length, 0);
});

test('commitment validation rejects empty titles, malformed dates, invalid kinds/counts and non-positive or unsafe money', () => {
  for (const amount of ['0', '-1', '1,001', '90.071.992.547.409,92', 'abc']) assert.throws(() => validateCommitmentDraft(draft({ amount })), FinanceValidationError);
  assert.equal(validateCommitmentDraft(draft({ amount: '90.071.992.547.409,91' })).expectedAmountMinor, maxAmountMinor);
  for (const installmentCount of ['', '0', '-1', '1.5', '1201', 'Infinity', '1e2']) assert.throws(() => validateCommitmentDraft(draft({ kind: 'installment', installmentCount })), FinanceValidationError);
  assert.throws(() => validateCommitmentDraft(draft({ title: ' ' })), FinanceValidationError);
  assert.throws(() => validateCommitmentDraft(draft({ firstDueDate: '2026-02-30' })), FinanceValidationError);
  assert.throws(() => validateCommitmentDraft(draft({ kind: 'income' as never })), FinanceValidationError);
  assert.equal(validateCommitmentDraft(draft({ title: '  My   bill ' })).title, 'My bill');
});

test('commitments accept only active Expense categories; SQLite also enforces direction', async (t) => {
  const { sqlite, db, access, finance } = await initialized(); t.after(() => sqlite.close());
  const expense = finance.createCategory('Pet care', 'expense');
  const income = finance.createCategory('Side work', 'income');
  const id = access.create(draft({ categoryId: expense.id }));
  assert.equal(item(access, id).commitment.categoryId, expense.id);
  assert.throws(() => access.create(draft({ categoryId: income.id })), FinanceValidationError);
  assert.throws(() => access.create(draft({ categoryId: 'missing' })), FinanceValidationError);
  assert.throws(() => db.update(schema.financeCommitments).set({ categoryId: income.id }).where(eq(schema.financeCommitments.id, id)).run(), /FOREIGN KEY/);
  assert.equal(finance.read().transactions.length, 0);
});

for (const [label, start, expected] of [
  ['ordinary day 10', '2026-01-10', ['2026-01-10', '2026-02-10', '2026-03-10', '2026-04-10']],
  ['day 28', '2026-01-28', ['2026-01-28', '2026-02-28', '2026-03-28', '2026-04-28']],
  ['day 29 non-leap', '2026-01-29', ['2026-01-29', '2026-02-28', '2026-03-29', '2026-04-29']],
  ['day 30 non-leap', '2026-01-30', ['2026-01-30', '2026-02-28', '2026-03-30', '2026-04-30']],
  ['day 31 non-leap', '2026-01-31', ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']],
  ['day 31 leap', '2024-01-31', ['2024-01-31', '2024-02-29', '2024-03-31', '2024-04-30']],
  ['century not leap', '1900-01-31', ['1900-01-31', '1900-02-28', '1900-03-31', '1900-04-30']],
  ['year boundary', '2026-11-30', ['2026-11-30', '2026-12-30', '2027-01-30', '2027-02-28']],
] as const) test(`monthly commitments preserve their anchor: ${label}`, () => {
  assert.deepEqual(scheduledDues(schedule(start), null, start, expected[3]).map((row) => row.dueDate), expected);
});

test('installment scheduling has exactly the configured indices and rejects unbounded generation', () => {
  const rule = schedule('2026-01-31');
  const result = scheduledDues(rule, 12, '2026-01-01', '2026-12-31');
  assert.equal(result.length, 12);
  assert.deepEqual(result.map((row) => row.installmentIndex), Array.from({ length: 12 }, (_, index) => index + 1));
  assert.deepEqual(scheduledDues(rule, 12, '2027-01-01', '2027-12-31'), []);
  assert.throws(() => scheduledDues(rule, null, '2026-01-01', '2027-01-01'), FinanceValidationError);
});

test('due-date arithmetic and Overdue use local civil dates across time zones and DST', () => {
  const old = process.env.TZ;
  try {
    for (const zone of ['America/Sao_Paulo', 'America/New_York', 'Asia/Tokyo']) {
      process.env.TZ = zone;
      assert.deepEqual(scheduledDues(schedule('2026-03-08'), null, '2026-03-01', '2026-04-30').map((row) => row.dueDate), ['2026-03-08', '2026-04-08']);
      assert.equal(occurrenceLabel('pending', '2026-03-08', '2026-03-09'), 'Overdue');
      assert.equal(occurrenceLabel('pending', '2026-03-08', '2026-03-08'), 'Due today');
      assert.equal(occurrenceLabel('pending', '2026-03-09', '2026-03-08'), 'Upcoming');
      assert.equal(occurrenceLabel('skipped', '2026-03-08', '2026-03-09'), 'Skipped');
    }
  } finally { if (old === undefined) delete process.env.TZ; else process.env.TZ = old; }
});

test('all past obligations are caught up automatically while future generation remains bounded', async (t) => {
  const { sqlite, db, access } = await initialized(); t.after(() => sqlite.close());
  const id = access.create(draft({ firstDueDate: '2000-01-10' }));
  const first = item(access, id);
  assert.equal(first.outstanding.length, 321);
  assert.equal(first.outstanding[0].dueDate, '2000-01-10');
  assert.equal(first.outstanding.at(-1)!.dueDate, '2026-09-10');
  assert.equal(first.upcoming!.dueDate, '2026-10-10');
  const original = db.select().from(schema.commitmentOccurrences).all();
  assert.ok(original.every((row) => row.dueDate <= initialDay && row.status === 'pending'));
  access.read(); access.read();
  assert.deepEqual(db.select().from(schema.commitmentOccurrences).all(), original);
  const history = access.readHistory(id);
  assert.equal(history.history.length, 321, 'pending obligations are not gated by History paging');
  assert.equal(history.nextBefore, null, 'only older resolved outcomes require paging');
  assert.throws(() => access.readHistory(id, '2099-01-01'), FinanceValidationError);
  assert.throws(() => access.readHistory(id, 'not-a-date'), FinanceValidationError);
  access.readHistory(id, historyStart(initialDay));
  assert.deepEqual(db.select().from(schema.commitmentOccurrences).all(), original, 'History reads cannot introduce previously hidden obligations');
});

for (const status of ['active', 'paused', 'ended'] as const) test(`${status} commitments recover old unresolved monthly obligations without History paging or duplicates`, async (t) => {
  const { sqlite, db, access, finance } = await initialized(); t.after(() => sqlite.close());
  const id = access.create(draft({ firstDueDate: '2025-08-10' }));
  if (status === 'paused') access.pause(id);
  if (status === 'ended') access.end(id);
  // Emulate the previous implementation's incomplete twelve-month materialization cache.
  db.delete(schema.commitmentOccurrences).where(and(eq(schema.commitmentOccurrences.commitmentId, id), lt(schema.commitmentOccurrences.dueDate, historyStart(initialDay)))).run();
  assert.equal(db.select().from(schema.commitmentOccurrences).all().length, 11);
  const result = item(access, id);
  assert.equal(result.commitment.status, status);
  assert.equal(result.outstanding.length, 14);
  assert.equal(result.outstanding[0].dueDate, '2025-08-10');
  assert.ok(result.outstanding.every((row) => occurrenceLabel(row.status, row.dueDate, initialDay) === 'Overdue'));
  const original = db.select().from(schema.commitmentOccurrences).all();
  assert.equal(new Set(original.map((row) => row.dueDate)).size, 14);
  const readOnlyIds = createCommitmentDataAccess(db, () => { throw new Error('An unchanged read must not allocate new occurrences.'); }, () => pickerValue(initialDay).getTime());
  readOnlyIds.read(); readOnlyIds.read();
  assert.deepEqual(db.select().from(schema.commitmentOccurrences).all(), original);
  assert.equal(finance.read().transactions.length, 0);
  access.pay(result.outstanding[0], '175', initialDay);
  access.skip(result.outstanding[1]);
  assert.equal(item(access, id).outstanding.length, 12, 'each old obligation can be independently Paid or Skipped');
  assert.equal(finance.read().transactions.length, 1);
});

test('catch-up preserves old Paid/Skipped outcomes and History pages them without hiding pending obligations', async (t) => {
  const { sqlite, db, access } = await initialized(); t.after(() => sqlite.close());
  const id = access.create(draft({ firstDueDate: '2025-08-10' }));
  const original = item(access, id).outstanding;
  const paymentId = access.pay(original[0], '193,42', '2025-08-11');
  access.skip(original[1]);
  const resolved = db.select().from(schema.commitmentOccurrences).all().filter((row) => row.status !== 'pending');
  const payment = db.select().from(schema.financeTransactions).where(eq(schema.financeTransactions.id, paymentId)).get();
  db.delete(schema.commitmentOccurrences).where(and(eq(schema.commitmentOccurrences.commitmentId, id), eq(schema.commitmentOccurrences.status, 'pending'), lt(schema.commitmentOccurrences.dueDate, historyStart(initialDay)))).run();
  const result = item(access, id);
  assert.equal(result.outstanding.length, 12);
  assert.equal(result.outstanding[0].dueDate, '2025-10-10');
  assert.equal(result.resolvedCount, 2); assert.equal(result.totalPaidMinor, 19342n);
  assert.deepEqual(db.select().from(schema.commitmentOccurrences).all().filter((row) => row.status !== 'pending'), resolved);
  assert.deepEqual(db.select().from(schema.financeTransactions).where(eq(schema.financeTransactions.id, paymentId)).get(), payment);
  const firstPage = access.readHistory(id);
  assert.equal(firstPage.history.length, 12);
  assert.ok(firstPage.history.every(({ occurrence }) => occurrence.status === 'pending'));
  assert.equal(firstPage.nextBefore, '2025-11-01');
  const olderPage = access.readHistory(id, firstPage.nextBefore!);
  assert.equal(olderPage.history.length, 14);
  assert.equal(olderPage.nextBefore, null);
  assert.deepEqual(olderPage.history.filter(({ occurrence }) => occurrence.status !== 'pending').map(({ occurrence }) => occurrence), [...resolved].reverse());
  assert.equal(olderPage.history.find(({ occurrence }) => occurrence.status === 'paid')!.payment!.id, paymentId);
  access.reopen(resolved[0].id);
  assert.equal(item(access, id).outstanding[0].dueDate, '2025-08-10', 'reopened old outcomes immediately return to Overdue');
  const refreshed = access.readHistory(id, olderPage.pageBefore);
  assert.equal(refreshed.history.length, 14, 'refreshing keeps the loaded historical range');
  assert.equal(refreshed.history.find(({ occurrence }) => occurrence.id === resolved[0].id)!.occurrence.status, 'pending');
});

test('historical schedule versions backfill due dates without generating paused months or changing resume anchors', async (t) => {
  const { sqlite, db, access, setDay } = await initialized(); t.after(() => sqlite.close());
  setDay('2025-10-15');
  const id = access.create(draft({ firstDueDate: '2025-08-10' }));
  access.pause(id);
  const paused = item(access, id);
  access.edit(id, { ...commitmentDraft(paused.commitment, paused.schedule), amount: '210' });
  setDay('2026-01-03'); access.resume(id, '2026-01-15');
  setDay(initialDay);
  db.delete(schema.commitmentOccurrences).where(eq(schema.commitmentOccurrences.commitmentId, id)).run();
  const result = item(access, id);
  assert.deepEqual(result.outstanding.map((row) => row.dueDate), [
    '2025-08-10', '2025-09-10', '2025-10-10', '2026-01-15', '2026-02-15', '2026-03-15',
    '2026-04-15', '2026-05-15', '2026-06-15', '2026-07-15', '2026-08-15', '2026-09-15',
  ]);
  assert.deepEqual(result.outstanding.map((row) => row.expectedAmountMinor), [18000, 18000, 18000, ...Array<number>(9).fill(21000)]);
  assert.equal(result.upcoming!.dueDate, '2026-10-15');
  access.pause(id); setDay('2028-10-03');
  assert.equal(item(access, id).outstanding.length, 12, 'remaining paused cannot produce additional obligations');
  assert.equal(item(access, id).upcoming, null);
});

for (const kind of ['bill', 'subscription'] as const) test(`old ended ${kind} catch-up stops at its effective end even after the display window expires`, async (t) => {
  const { sqlite, db, access, setDay } = await initialized(); t.after(() => sqlite.close());
  setDay('2025-11-15');
  const id = access.create(draft({ kind, firstDueDate: '2025-08-10' }));
  access.end(id);
  db.delete(schema.commitmentOccurrences).where(eq(schema.commitmentOccurrences.commitmentId, id)).run();
  setDay('2027-10-03');
  const result = item(access, id);
  assert.equal(result.commitment.status, 'ended'); assert.equal(result.upcoming, null);
  assert.deepEqual(result.outstanding.map((row) => row.dueDate), ['2025-08-10', '2025-09-10', '2025-10-10', '2025-11-10']);
  const original = db.select().from(schema.commitmentOccurrences).all();
  setDay('2030-10-03'); access.read();
  assert.deepEqual(db.select().from(schema.commitmentOccurrences).all(), original);
});

test('old completed installments retain resolved history and never generate beyond the configured count', async (t) => {
  const { sqlite, db, access, setDay } = await initialized(); t.after(() => sqlite.close());
  const id = access.create(draft({ kind: 'installment', installmentCount: '3', firstDueDate: '2020-01-31' }));
  const result = item(access, id);
  assert.deepEqual(result.outstanding.map((row) => [row.dueDate, row.installmentIndex]), [['2020-01-31', 1], ['2020-02-29', 2], ['2020-03-31', 3]]);
  for (const row of result.outstanding) access.skip(row);
  const original = db.select().from(schema.commitmentOccurrences).all();
  setDay('2030-10-03');
  const completed = item(access, id);
  assert.equal(completed.commitment.status, 'completed'); assert.equal(completed.resolvedCount, 3);
  assert.equal(completed.remainingCount, 0); assert.equal(completed.outstanding.length, 0); assert.equal(completed.upcoming, null);
  let page = access.readHistory(id);
  assert.equal(page.history.length, 0, 'old resolved installments stay in paged History rather than Overdue');
  while (page.nextBefore) page = access.readHistory(id, page.nextBefore);
  assert.equal(page.history.length, 3);
  assert.deepEqual(db.select().from(schema.commitmentOccurrences).all(), original);
});

test('commitments, schedules and UUID occurrences survive restart without duplicates', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'axis-commitments-'));
  const filename = join(directory, 'axis.db');
  let reopened: ReturnType<typeof database>['sqlite'] | undefined;
  t.after(() => { reopened?.close(); for (const suffix of ['', '-wal', '-shm']) { try { unlinkSync(filename + suffix); } catch { /* SQLite may remove sidecars on close. */ } } rmdirSync(directory); });
  const first = await initialized(filename);
  const id = first.access.create(draft({ firstDueDate: '2025-08-31' }));
  const before = first.access.read();
  assert.equal(before.items[0].outstanding.length, 14);
  assert.ok(before.items[0].outstanding.every((row) => /^[\da-f-]{36}$/i.test(row.id!)));
  first.sqlite.close();
  const second = await initialized(filename); reopened = second.sqlite;
  assert.deepEqual(second.access.read(), before);
  assert.equal(second.db.select().from(schema.commitmentSchedules).all().length, 1);
  assert.equal(new Set(second.db.select().from(schema.commitmentOccurrences).all().map((row) => row.dueDate)).size, before.items[0].outstanding.length);
  assert.equal(item(second.access, id).upcoming!.dueDate, '2026-10-31');
});

test('each commitment contributes at most one upcoming preview and resolving it advances selection', async (t) => {
  const { sqlite, db, access } = await initialized(); t.after(() => sqlite.close());
  const first = access.create(draft());
  const second = access.create(draft({ kind: 'subscription' }));
  assert.equal(access.read().items.filter((value) => value.upcoming).length, 2);
  access.pay(item(access, first).upcoming!, '193,42', initialDay);
  assert.equal(item(access, first).upcoming!.dueDate, '2026-11-10');
  access.skip(item(access, second).upcoming!);
  assert.equal(item(access, second).upcoming!.dueDate, '2026-11-10');
  assert.equal(db.select().from(schema.commitmentOccurrences).all().length, 2, 'only explicitly resolved future occurrences are stored');
});

test('Paid atomically creates a linked Expense using the actual amount and chosen date, preserving expected money', async (t) => {
  const { sqlite, db, access, finance } = await initialized(); t.after(() => sqlite.close());
  const pets = finance.read().categories.find((value) => value.name === 'Pets')!;
  const id = access.create(draft({ categoryId: pets.id }));
  const target = item(access, id).upcoming!;
  const paymentId = access.pay(target, '193,42', '2026-09-30');
  const row = db.select().from(schema.commitmentOccurrences).get()!;
  const payment = finance.read().transactions[0];
  assert.equal(row.status, 'paid'); assert.equal(row.expectedAmountMinor, 18000);
  assert.equal(row.paidTransactionId, paymentId); assert.ok(row.resolvedAt);
  assert.equal(payment.type, 'expense'); assert.equal(payment.amountMinor, 19342);
  assert.equal(payment.transactionDate, '2026-09-30'); assert.equal(payment.description, 'Electricity');
  assert.equal(payment.categoryId, pets.id);
  assert.equal(finance.readDashboard(periodBounds('month', initialDay)).analytics.expensesMinor, 0n);
  assert.equal(finance.readDashboard(periodBounds('month', '2026-09-30')).analytics.expensesMinor, 19342n);
  assert.throws(() => access.pay(target, '180', initialDay), FinanceValidationError);
  assert.throws(() => access.skip(target), FinanceValidationError);
  assert.equal(finance.read().transactions.length, 1);
});

test('payment validation rejects future dates, malformed dates and non-positive actual amounts without writes', async (t) => {
  const { sqlite, db, access } = await initialized(); t.after(() => sqlite.close());
  access.create(draft()); const target = item(access).upcoming!;
  for (const [amount, date] of [['0', initialDay], ['-1', initialDay], ['10', '2026-10-04'], ['10', '2026-02-30']]) {
    assert.throws(() => access.pay(target, amount, date), FinanceValidationError);
  }
  assert.equal(db.select().from(schema.commitmentOccurrences).all().length, 0);
  assert.equal(db.select().from(schema.financeTransactions).all().length, 0);
  assert.equal(validatePayment('0,01', initialDay, initialDay).amountMinor, 1);
});

test('a failed Paid occurrence update rolls back the Expense and preview materialization', async (t) => {
  const { sqlite, db, access } = await initialized(); t.after(() => sqlite.close());
  access.create(draft()); const target = item(access).upcoming!;
  sqlite.exec("CREATE TRIGGER fail_payment BEFORE UPDATE OF status ON finance_commitment_occurrences WHEN NEW.status = 'paid' BEGIN SELECT RAISE(ABORT, 'injected payment failure'); END");
  assert.throws(() => access.pay(target, '193,42', initialDay), /injected payment failure/);
  assert.equal(db.select().from(schema.financeTransactions).all().length, 0);
  assert.equal(db.select().from(schema.commitmentOccurrences).all().length, 0);
  sqlite.exec('DROP TRIGGER fail_payment');
  assert.doesNotThrow(() => access.pay(target, '193,42', initialDay));
});

test('Skip creates no transaction, retains history and can be reversed to Pending', async (t) => {
  const { sqlite, db, access, finance } = await initialized(); t.after(() => sqlite.close());
  const id = access.create(draft({ firstDueDate: '2026-09-10' }));
  const past = item(access, id).outstanding[0];
  access.skip(past);
  const history = access.readHistory(id).history.find(({ occurrence }) => occurrence.id === past.id)!.occurrence;
  assert.equal(history.status, 'skipped'); assert.equal(history.paidTransactionId, null);
  assert.equal(item(access, id).upcoming!.dueDate, '2026-10-10');
  assert.equal(finance.read().transactions.length, 0);
  access.reopen(history.id);
  assert.equal(item(access, id).outstanding[0].status, 'pending');
  assert.equal(db.select().from(schema.financeTransactions).all().length, 0);
});

test('calendar passage derives Overdue without mutating status; past and next future obligations coexist', async (t) => {
  const { sqlite, db, access, setDay } = await initialized(); t.after(() => sqlite.close());
  const id = access.create(draft());
  setDay('2026-10-10'); const due = item(access, id).outstanding[0];
  assert.equal(occurrenceLabel(due.status, due.dueDate, '2026-10-10'), 'Due today');
  const stored = db.select().from(schema.commitmentOccurrences).get()!;
  setDay('2026-10-11'); const later = item(access, id);
  assert.equal(occurrenceLabel(later.outstanding[0].status, later.outstanding[0].dueDate, '2026-10-11'), 'Overdue');
  assert.deepEqual(db.select().from(schema.commitmentOccurrences).get(), stored);
  assert.equal(later.upcoming!.dueDate, '2026-11-10');
  access.pay(later.outstanding[0], '185', '2026-10-11');
  assert.equal(item(access, id).outstanding.length, 0);
  assert.equal(item(access, id).upcoming!.dueDate, '2026-11-10');
});

test('Pause retains overdue rows unchanged and never backfills paused months', async (t) => {
  const { sqlite, db, access, setDay } = await initialized(); t.after(() => sqlite.close());
  setDay('2026-09-15'); const id = access.create(draft({ firstDueDate: '2026-09-10' }));
  const before = db.select().from(schema.commitmentOccurrences).all();
  access.pause(id);
  assert.deepEqual(db.select().from(schema.commitmentOccurrences).all(), before);
  setDay('2026-12-03'); const paused = item(access, id);
  assert.equal(paused.commitment.status, 'paused'); assert.equal(paused.upcoming, null);
  assert.equal(paused.outstanding.length, 1);
  assert.deepEqual(db.select().from(schema.commitmentOccurrences).all(), before);
  access.readHistory(id);
  assert.deepEqual(db.select().from(schema.commitmentOccurrences).all(), before);
  assert.equal(access.resumeProposal(id), '2026-12-10');
  access.resume(id, '2026-12-15');
  assert.equal(item(access, id).upcoming!.dueDate, '2026-12-15');
  setDay('2027-01-03');
  const resumed = item(access, id);
  assert.deepEqual(resumed.outstanding.map((row) => row.dueDate), ['2026-09-10', '2026-12-15']);
  assert.equal(resumed.upcoming!.dueDate, '2027-01-15');
  assert.deepEqual(db.select().from(schema.commitmentOccurrences).all()[0], before[0]);
});

test('resume proposals clamp billing day and retain the intended day unless the user chooses a new anchor', () => {
  const rule = schedule('2026-01-31');
  assert.equal(proposedResumeDate(rule, '2026-02-03'), '2026-02-28');
  assert.equal(proposedResumeDate(rule, '2026-02-28'), '2026-02-28');
  assert.equal(proposedResumeDate(rule, '2026-02-28', ['2026-02-28']), '2026-03-31');
  assert.equal(proposedResumeDate(schedule('2024-01-31'), '2024-02-03'), '2024-02-29');
  assert.equal(proposedResumeDate(rule, '2026-12-31', ['2026-12-31']), '2027-01-31');
});

test('resuming a Subscription with a changed date creates a persistent new monthly anchor', async (t) => {
  const { sqlite, access, setDay } = await initialized(); t.after(() => sqlite.close());
  const id = access.create(draft({ kind: 'subscription', firstDueDate: '2026-09-10' }));
  access.pause(id);
  assert.equal(access.resumeProposal(id), '2026-10-10');
  assert.throws(() => access.resume(id, '2026-09-30'), FinanceValidationError);
  access.resume(id, '2026-10-15');
  assert.equal(item(access, id).upcoming!.dueDate, '2026-10-15');
  setDay('2026-11-03');
  assert.equal(item(access, id).upcoming!.dueDate, '2026-11-15');
  assert.deepEqual(item(access, id).outstanding.map((row) => row.dueDate), ['2026-09-10', '2026-10-15']);
});

for (const kind of ['bill', 'installment'] as const) test(`keeping a clamped resume proposal preserves billing day 31 for a ${kind}`, async (t) => {
  const { sqlite, access, setDay } = await initialized(); t.after(() => sqlite.close());
  setDay('2026-01-31'); const id = access.create(draft({ kind, installmentCount: kind === 'installment' ? '3' : '', firstDueDate: '2026-01-31' }));
  access.skip(item(access, id).outstanding[0]); access.pause(id); setDay('2026-02-03');
  assert.equal(access.resumeProposal(id), '2026-02-28'); access.resume(id, '2026-02-28');
  assert.equal(item(access, id).schedule.billingDay, 31);
  assert.equal(item(access, id).upcoming!.dueDate, '2026-02-28');
  setDay('2026-03-03'); assert.equal(item(access, id).upcoming!.dueDate, '2026-03-31');
  if (kind === 'installment') assert.equal(item(access, id).upcoming!.installmentIndex, 3);
});

test('same-day price edits and pause/resume do not leave competing schedules or stale actionable previews', async (t) => {
  const { sqlite, db, access } = await initialized(); t.after(() => sqlite.close());
  const id = access.create(draft()); const stale = item(access, id).upcoming!;
  access.pause(id);
  assert.throws(() => access.pay(stale, '180', initialDay), FinanceValidationError);
  access.resume(id, '2026-10-15');
  const current = item(access, id);
  access.edit(id, { ...commitmentDraft(current.commitment, current.schedule), amount: '200' });
  const after = item(access, id);
  access.edit(id, { ...commitmentDraft(after.commitment, after.schedule), amount: '250' });
  const latest = item(access, id);
  assert.equal(latest.upcoming!.dueDate, '2026-10-15');
  assert.equal(latest.upcoming!.expectedAmountMinor, 25000);
  assert.throws(() => access.pay(stale, '180', initialDay), FinanceValidationError);
  assert.equal(db.select().from(schema.commitmentOccurrences).all().length, 0);
  access.skip(latest.upcoming!);
  assert.equal(item(access, id).upcoming!.dueDate, '2026-11-15');
});

test('parent edits preserve all historical expectations and apply new expectations only in the future', async (t) => {
  const { sqlite, db, access } = await initialized(); t.after(() => sqlite.close());
  const id = access.create(draft({ firstDueDate: '2024-01-10' })); const before = item(access, id);
  const original = db.select().from(schema.commitmentOccurrences).all();
  access.edit(id, { ...commitmentDraft(before.commitment, before.schedule), title: 'New title', amount: '200' });
  const after = item(access, id);
  assert.equal(after.commitment.title, 'New title');
  assert.equal(after.upcoming!.expectedAmountMinor, 20000);
  assert.deepEqual(db.select().from(schema.commitmentOccurrences).all(), original);
  access.readHistory(id, historyStart(initialDay));
  assert.ok(db.select().from(schema.commitmentOccurrences).all().every((row) => row.expectedAmountMinor === 18000));
  assert.throws(() => access.edit(id, { ...commitmentDraft(after.commitment, after.schedule), firstDueDate: '2026-11-20' }), FinanceValidationError);
});

test('paused amount edits take effect only on resumed occurrences', async (t) => {
  const { sqlite, access } = await initialized(); t.after(() => sqlite.close());
  const id = access.create(draft({ firstDueDate: '2026-09-10' })); access.pause(id);
  const current = item(access, id);
  access.edit(id, { ...commitmentDraft(current.commitment, current.schedule), amount: '210' });
  access.resume(id, '2026-10-15');
  assert.equal(item(access, id).outstanding[0].expectedAmountMinor, 18000);
  assert.equal(item(access, id).upcoming!.expectedAmountMinor, 21000);
});

test('installment progress derives from Paid/Skipped outcomes; final resolution completes without deleting history', async (t) => {
  const { sqlite, db, access, finance, setDay } = await initialized(); t.after(() => sqlite.close());
  setDay('2026-10-11'); const id = access.create(draft({ kind: 'installment', installmentCount: '3', firstDueDate: '2026-08-10' }));
  let current = item(access, id);
  assert.deepEqual(current.outstanding.map((row) => row.installmentIndex), [1, 2, 3]);
  assert.equal(current.resolvedCount, 0); assert.equal(current.remainingCount, 3); assert.equal(current.upcoming, null);
  access.pay(current.outstanding[0], '193,42', '2026-08-10');
  current = item(access, id); assert.equal(current.resolvedCount, 1); assert.equal(current.remainingCount, 2);
  access.skip(current.outstanding[0]);
  current = item(access, id); assert.equal(current.resolvedCount, 2); assert.equal(current.remainingCount, 1);
  access.pay(current.outstanding[0], '200', '2026-10-11');
  current = item(access, id);
  assert.equal(current.commitment.status, 'completed'); assert.ok(current.commitment.completedAt);
  assert.equal(current.resolvedCount, 3); assert.equal(current.remainingCount, 0); assert.equal(current.upcoming, null);
  assert.equal(current.totalPaidMinor, 39342n); assert.equal(finance.read().transactions.length, 2);
  assert.equal(db.select().from(schema.commitmentOccurrences).all().length, 3);
  assert.equal(access.readHistory(id).history.length, 3);
  assert.ok(access.readHistory(id).history.every(({ occurrence }) => occurrence.expectedAmountMinor === 18000));
});

test('paused installments do not consume numbers; a resumed anchor continues after retained indices', async (t) => {
  const { sqlite, access, setDay } = await initialized(); t.after(() => sqlite.close());
  setDay('2026-01-11'); const id = access.create(draft({ kind: 'installment', installmentCount: '4', firstDueDate: '2026-01-10' }));
  access.pay(item(access, id).outstanding[0], '180', '2026-01-11'); access.pause(id);
  setDay('2026-12-03');
  assert.equal(item(access, id).resolvedCount, 1); assert.equal(item(access, id).remainingCount, 3);
  access.resume(id, '2026-12-20');
  assert.equal(item(access, id).upcoming!.installmentIndex, 2); assert.equal(item(access, id).upcoming!.dueDate, '2026-12-20');
  setDay('2027-01-03');
  const current = item(access, id);
  assert.equal(current.upcoming!.installmentIndex, 3); assert.equal(current.upcoming!.dueDate, '2027-01-20');
  const history = access.readHistory(id);
  assert.deepEqual(history.history.map(({ occurrence }) => occurrence.dueDate), ['2026-12-20']);
  assert.deepEqual(access.readHistory(id, history.nextBefore!).history.map(({ occurrence }) => occurrence.dueDate), ['2026-12-20', '2026-01-10']);
});

test('unresolved prior installments retain their indices and due dates when the rest resumes', async (t) => {
  const { sqlite, access, setDay } = await initialized(); t.after(() => sqlite.close());
  setDay('2026-01-11'); const id = access.create(draft({ kind: 'installment', installmentCount: '3', firstDueDate: '2026-01-10' }));
  access.pause(id); setDay('2026-12-03'); access.resume(id, '2026-12-20');
  const current = item(access, id);
  assert.equal(current.outstanding[0].installmentIndex, 1); assert.equal(current.outstanding[0].dueDate, '2026-01-10');
  assert.equal(current.upcoming!.installmentIndex, 2); assert.equal(current.resolvedCount, 0);
});

test('all elapsed installment indices are materialized without History paging and cannot be restarted by Resume', async (t) => {
  const { sqlite, db, access } = await initialized(); t.after(() => sqlite.close());
  const id = access.create(draft({ kind: 'installment', installmentCount: '12', firstDueDate: '2020-01-10' }));
  assert.equal(db.select().from(schema.commitmentOccurrences).all().length, 12);
  assert.equal(item(access, id).outstanding.length, 12);
  access.pause(id);
  assert.equal(item(access, id).canResume, false);
  assert.throws(() => access.resumeProposal(id), /already have due dates/);
  assert.throws(() => access.resume(id, '2026-10-20'), /already have due dates/);
  assert.equal(item(access, id).upcoming, null, 'all twelve original due dates already elapsed; resume cannot restart their numbering');
  const page = access.readHistory(id);
  assert.equal(page.nextBefore, null);
  assert.equal(page.history.length, 12);
  assert.deepEqual(page.history.map(({ occurrence }) => occurrence.installmentIndex).sort((a, b) => a! - b!), Array.from({ length: 12 }, (_, index) => index + 1));
  assert.ok(page.history.every(({ occurrence }) => occurrence.dueDate.startsWith('2020-')));
});

test('reopening a completed installment reactivates it, and resolving again completes it', async (t) => {
  const { sqlite, access } = await initialized(); t.after(() => sqlite.close());
  const id = access.create(draft({ kind: 'installment', installmentCount: '1', firstDueDate: '2026-09-10' }));
  access.skip(item(access, id).outstanding[0]);
  assert.equal(item(access, id).commitment.status, 'completed');
  const row = access.readHistory(id).history[0].occurrence;
  access.reopen(row.id); assert.equal(item(access, id).commitment.status, 'active');
  assert.equal(item(access, id).resolvedCount, 0);
  access.pay(item(access, id).outstanding[0], '175', initialDay);
  assert.equal(item(access, id).commitment.status, 'completed'); assert.equal(item(access, id).totalPaidMinor, 17500n);
});

for (const kind of ['bill', 'subscription'] as const) test(`ending a ${kind} stops future scheduling and preserves outcomes and unresolved history`, async (t) => {
  const { sqlite, db, access, setDay } = await initialized(); t.after(() => sqlite.close());
  const id = access.create(draft({ kind, firstDueDate: '2026-07-10' }));
  access.pay(item(access, id).outstanding[0], '170', '2026-07-10');
  access.skip(item(access, id).outstanding[0]);
  const before = db.select().from(schema.commitmentOccurrences).all();
  access.end(id); assert.equal(item(access, id).commitment.status, 'ended'); assert.equal(item(access, id).upcoming, null);
  setDay('2027-03-03');
  assert.deepEqual(db.select().from(schema.commitmentOccurrences).all(), before);
  assert.equal(item(access, id).outstanding[0].dueDate, '2026-09-10');
  assert.equal(access.readHistory(id).history.length, 3);
  assert.deepEqual(db.select().from(schema.commitmentOccurrences).all(), before);
  access.pay(item(access, id).outstanding[0], '180', '2027-03-03');
  assert.equal(item(access, id).commitment.status, 'ended');
});

test('archived category names remain on commitments and payments; selectors and new assignments exclude them', async (t) => {
  const { sqlite, access, finance } = await initialized(); t.after(() => sqlite.close());
  const custom = finance.createCategory('Pet care', 'expense');
  const id = access.create(draft({ categoryId: custom.id })); finance.deleteCategory(custom.id);
  const categories = finance.read().categories;
  assert.ok(!categoriesForType(categories, 'expense').some((value) => value.id === custom.id));
  let current = item(access, id);
  assert.equal(financeCategoryName({ type: 'expense', categoryId: current.commitment.categoryId }, categories), 'Pet care');
  assert.throws(() => access.create(draft({ categoryId: custom.id })), FinanceValidationError);
  access.edit(id, { ...commitmentDraft(current.commitment, current.schedule), title: 'Vet' });
  current = item(access, id); access.pay(current.upcoming!, '180', initialDay);
  assert.equal(financeCategoryName(finance.read().transactions[0], categories), 'Pet care');
  assert.equal(finance.readDashboard(periodBounds('month', initialDay)).analytics.spending[0].categoryId, custom.id);
  const active = finance.read().categories.find((value) => value.name === 'Food')!;
  access.edit(id, { ...commitmentDraft(current.commitment, current.schedule), categoryId: active.id });
  assert.equal(item(access, id).commitment.categoryId, active.id);
  access.edit(id, { ...commitmentDraft(current.commitment, current.schedule), categoryId: null });
  assert.equal(item(access, id).commitment.categoryId, null);
  assert.throws(() => finance.deleteCategory(active.id), FinanceValidationError);
});

test('linked ledger edits update actual payment facts and period totals while preserving expected money and linkage', async (t) => {
  const { sqlite, access, finance } = await initialized(); t.after(() => sqlite.close());
  const id = access.create(draft()); const paymentId = access.pay(item(access, id).upcoming!, '193,42', initialDay);
  const payment = finance.read().transactions[0];
  assert.ok(finance.read().paymentTransactionIds.includes(paymentId));
  finance.editTransaction(paymentId, { ...transactionDraft(payment), amount: '200,01', transactionDate: '2026-09-30', description: 'Edited payment', note: 'Receipt' });
  const historical = access.readHistory(id).history[0];
  assert.equal(historical.occurrence.expectedAmountMinor, 18000); assert.equal(historical.occurrence.paidTransactionId, paymentId);
  assert.equal(historical.payment!.amountMinor, 20001); assert.equal(historical.payment!.transactionDate, '2026-09-30');
  assert.equal(item(access, id).totalPaidMinor, 20001n);
  assert.equal(finance.readDashboard(periodBounds('month', initialDay)).analytics.expensesMinor, 0n);
  assert.equal(finance.readDashboard(periodBounds('month', '2026-09-30')).analytics.expensesMinor, 20001n);
  assert.throws(() => finance.editTransaction(paymentId, { ...transactionDraft(payment), type: 'income' }), FinanceValidationError);
  assert.equal(finance.read().transactions[0].type, 'expense');
});

test('linked payments reject ledger deletion; Undo payment atomically removes Expense totals and permits a new payment', async (t) => {
  const { sqlite, db, access, finance } = await initialized(); t.after(() => sqlite.close());
  const id = access.create(draft({ kind: 'installment', installmentCount: '1', firstDueDate: '2026-09-10' }));
  const paymentId = access.pay(item(access, id).outstanding[0], '180', initialDay);
  assert.throws(() => finance.deleteTransaction(paymentId), /Undo payment/);
  assert.equal(finance.read().transactions.length, 1);
  const row = access.readHistory(id).history[0].occurrence;
  access.reopen(row.id);
  assert.equal(item(access, id).commitment.status, 'active');
  assert.equal(item(access, id).outstanding[0].status, 'pending'); assert.equal(item(access, id).totalPaidMinor, 0n);
  assert.equal(finance.read().transactions.length, 0);
  assert.equal(finance.readDashboard(periodBounds('month', initialDay)).analytics.expensesMinor, 0n);
  assert.ok(db.select().from(schema.financeTransactions).where(eq(schema.financeTransactions.id, paymentId)).get()!.deletedAt);
  const newPayment = access.pay(item(access, id).outstanding[0], '190', initialDay);
  assert.notEqual(newPayment, paymentId); assert.equal(item(access, id).commitment.status, 'completed');
  assert.equal(finance.read().transactions.length, 1); assert.equal(item(access, id).totalPaidMinor, 19000n);
});

test('failed Undo payment restores both the paid occurrence and active Expense', async (t) => {
  const { sqlite, db, access, finance } = await initialized(); t.after(() => sqlite.close());
  const id = access.create(draft()); access.pay(item(access, id).upcoming!, '180', initialDay);
  const row = access.readHistory(id).history[0].occurrence;
  const beforePayment = finance.read().transactions;
  sqlite.exec("CREATE TRIGGER fail_undo BEFORE UPDATE OF status ON finance_commitment_occurrences WHEN NEW.status = 'pending' BEGIN SELECT RAISE(ABORT, 'injected undo failure'); END");
  assert.throws(() => access.reopen(row.id), /injected undo failure/);
  assert.deepEqual(db.select().from(schema.commitmentOccurrences).get(), row);
  assert.deepEqual(finance.read().transactions, beforePayment);
});

test('future resolved/undone rows remain unchanged across Pause, Resume and End', async (t) => {
  const { sqlite, db, access } = await initialized(); t.after(() => sqlite.close());
  const id = access.create(draft()); access.pay(item(access, id).upcoming!, '180', initialDay);
  const row = access.readHistory(id).history[0].occurrence;
  access.reopen(row.id); const pending = db.select().from(schema.commitmentOccurrences).get()!;
  access.pause(id); assert.deepEqual(db.select().from(schema.commitmentOccurrences).get(), pending);
  assert.equal(access.resumeProposal(id), '2026-11-10');
  assert.throws(() => access.resume(id, '2026-10-10'), FinanceValidationError);
  access.resume(id, '2026-11-15');
  assert.equal(item(access, id).upcoming!.dueDate, '2026-10-10', 'retained existing obligation precedes new schedule');
  access.end(id); assert.deepEqual(db.select().from(schema.commitmentOccurrences).get(), pending);
  assert.equal(item(access, id).upcoming, null);
  assert.equal(access.readHistory(id).history[0].occurrence.dueDate, '2026-10-10');
});

test('SQLite rejects duplicate dates/indices, invalid occurrence money/dates/states and incompatible payment links', async (t) => {
  const { sqlite, db, access, finance } = await initialized(); t.after(() => sqlite.close());
  const id = access.create(draft({ kind: 'installment', installmentCount: '2', firstDueDate: '2026-09-10' }));
  const original = db.select().from(schema.commitmentOccurrences).get()!;
  assert.throws(() => db.insert(schema.commitmentOccurrences).values({ ...original, id: randomUUID() }).run(), /UNIQUE/);
  assert.throws(() => db.insert(schema.commitmentOccurrences).values({ ...original, id: randomUUID(), dueDate: '2026-11-10' }).run(), /UNIQUE/);
  for (const changes of [{ expectedAmountMinor: 0 }, { expectedAmountMinor: 1.5 }, { dueDate: '2026-02-30' }, { status: 'paid' as const }, { installmentIndex: 0 }]) {
    assert.throws(() => db.update(schema.commitmentOccurrences).set(changes).where(eq(schema.commitmentOccurrences.id, original.id)).run(), /CHECK/);
  }
  const income = finance.createTransaction({ ...transactionDraft(null, pickerValue(initialDay)), type: 'income', description: 'Income', amount: '100' });
  assert.throws(() => db.update(schema.commitmentOccurrences).set({ status: 'paid', paidTransactionId: income, resolvedAt: 1000 }).where(eq(schema.commitmentOccurrences.id, original.id)).run(), /FOREIGN KEY/);
  const other = access.create(draft()); const otherRule = item(access, other).schedule;
  assert.throws(() => db.update(schema.commitmentOccurrences).set({ scheduleId: otherRule.id }).where(eq(schema.commitmentOccurrences.id, original.id)).run(), /FOREIGN KEY/);
  assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), []);
  assert.equal(item(access, id).resolvedCount, 0);
});

async function existingStage6() {
  const result = database();
  const previous = { journal: { ...journal, entries: journal.entries.slice(0, 3) }, migrations: { m0000: bundledMigrations.migrations.m0000, m0001: bundledMigrations.migrations.m0001, m0002: bundledMigrations.migrations.m0002 } };
  await migrate(result.db, previous); seedDefaultCategories(result.db, 1000); seedFinanceCategories(result.db, 1000);
  const taskAccess = createTaskDataAccess(result.db, randomUUID, () => pickerValue(initialDay).getTime());
  taskAccess.createTask({ ...taskDraft(), title: 'Existing task', date: initialDay });
  taskAccess.createTask({ ...taskDraft(), title: 'Recurring task', date: initialDay, recurrence: { frequency: 'monthly', interval: 1, weekdayMask: 1, monthDay: 3, month: 10, endDate: '' } });
  const finance = createFinanceDataAccess(result.db, randomUUID, () => pickerValue(initialDay).getTime());
  const category = finance.createCategory('Archived category', 'expense');
  finance.createTransaction({ ...transactionDraft(null, pickerValue(initialDay)), description: 'Existing expense', amount: '12,34', categoryId: category.id });
  finance.createTransaction({ ...transactionDraft(null, pickerValue(initialDay)), type: 'income', description: 'Existing income', amount: '500' });
  finance.deleteCategory(category.id);
  const tables = { taskCategories: schema.taskCategories, tasks: schema.tasks, taskRecurrences: schema.taskRecurrences,
    taskOccurrences: schema.taskOccurrences, financeCategories: schema.financeCategories, financeTransactions: schema.financeTransactions };
  taskAccess.read();
  const snapshot = () => Object.fromEntries(Object.entries(tables).map(([name, table]) => [name, result.db.select().from(table).all()]));
  return { ...result, snapshot, before: snapshot() };
}

const stage7Migrations = { ...bundledMigrations, journal: { ...journal, entries: journal.entries.slice(0, 4) } };

test('additive Stage 7 migration preserves every previous Task, schedule, occurrence, transaction and archived category', async (t) => {
  const { sqlite, db, snapshot, before } = await existingStage6(); t.after(() => sqlite.close());
  const oldTables = sqlite.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name != '__drizzle_migrations' ORDER BY name").all();
  await migrate(db, stage7Migrations); seedDefaultCategories(db, 2000); seedFinanceCategories(db, 2000);
  assert.deepEqual(snapshot(), before);
  const newTables = sqlite.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name != '__drizzle_migrations' ORDER BY name").all();
  for (const old of oldTables) assert.deepEqual(newTables.find((row) => row.name === old.name), old);
  assert.equal(newTables.length, oldTables.length + 3);
  await migrate(db, stage7Migrations); assert.deepEqual(snapshot(), before);
  assert.equal(sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()!.count, 4);
  assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), []);
});

test('failed Stage 7 migration rolls back new tables/indexes and retries without losing previous data', async (t) => {
  const { sqlite, db, snapshot, before } = await existingStage6(); t.after(() => sqlite.close());
  const broken = { ...stage7Migrations, migrations: { ...stage7Migrations.migrations, m0003: `${stage7Migrations.migrations.m0003}\n--> statement-breakpoint\nINVALID SQL;` } };
  await assert.rejects(migrate(db, broken));
  assert.deepEqual(snapshot(), before);
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM sqlite_master WHERE name LIKE 'finance_commitment%' OR name = 'finance_transactions_id_type_unique'").get()!.count, 0);
  assert.equal(sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()!.count, 3);
  await migrate(db, stage7Migrations); assert.deepEqual(snapshot(), before);
  assert.equal(sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()!.count, 4);
});

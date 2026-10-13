/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test, type TestContext } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { createFinanceDataAccess } from '../src/features/finance/data';
import { transactionDraft } from '../src/features/finance/form';
import { formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { seedFinanceCategories } from '../src/features/finance/seed';
import { createCommitmentDataAccess } from '../src/features/finance/commitments/data';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import { createWorkDataAccess } from '../src/features/finance/work/data';
import { workDraft } from '../src/features/finance/work/form';
import { createFitnessDataAccess } from '../src/features/fitness/data';
import { createRotationDataAccess } from '../src/features/fitness/rotations-data';
import { seedFitnessExercises } from '../src/features/fitness/seed';
import { createHomeDataAccess } from '../src/features/home/data';
import { pickerValue } from '../src/utils/calendar';
import { bundledMigrations, database } from './helpers/database';

const date = '2026-10-09';
async function initialized(t: TestContext) {
  const f = database(); await migrate(f.db, bundledMigrations); seedFinanceCategories(f.db); seedFitnessExercises(f.db);
  let instant = pickerValue(date).getTime(); const now = () => instant; t.after(() => f.sqlite.close());
  const finance = createFinanceDataAccess(f.db, randomUUID, now);
  const expense = (amount: string, day = date, type: 'expense' | 'income' = 'expense') => finance.createTransaction({
    ...transactionDraft(null, pickerValue(day)), description: 'Daily ledger item', amount, type, transactionDate: day,
  });
  return { ...f, finance, expense, now, home: createHomeDataAccess(f.db, randomUUID, now),
    commitments: createCommitmentDataAccess(f.db, randomUUID, now), work: createWorkDataAccess(f.db, randomUUID, now),
    fitness: createFitnessDataAccess(f.db, randomUUID, now), setTime: (day: string, time = '12:00') => { instant = pickerValue(day, time).getTime(); } };
}

test('Spent today uses actual Expense dates only: zero, manual amounts, Income, deleted, past/future and Pay/Undo', async (t) => {
  const f = await initialized(t); assert.equal(f.home.read().spentTodayMinor, 0n);
  f.expense('82,40'); assert.equal(f.home.read().spentTodayMinor, 8240n);
  f.expense('17,61'); f.expense('999', date, 'income');
  f.expense('500', '2026-10-08');
  // A local-clock/date change can leave a previously valid transaction ahead of today.
  f.setTime('2026-10-10'); f.expense('600', '2026-10-10'); f.setTime(date);
  const deleted = f.expense('25'); f.finance.deleteTransaction(deleted);
  assert.equal(f.home.read().spentTodayMinor, 10001n);
  const bill = f.commitments.create({ ...commitmentDraft(null, undefined, date), title: 'Internet', amount: '99,90', firstDueDate: date });
  const obligation = f.commitments.read().items.find((item) => item.commitment.id === bill)!.outstanding[0];
  assert.equal(f.home.read().spentTodayMinor, 10001n, 'Unpaid commitments are excluded');
  f.commitments.pay(obligation, '99,90', date); assert.equal(f.home.read().spentTodayMinor, 19991n);
  f.commitments.reopen(obligation.id!); assert.equal(f.home.read().spentTodayMinor, 10001n);
  f.commitments.skip(obligation); assert.equal(f.home.read().spentTodayMinor, 10001n);
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []);
  assert.equal(f.sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
});

test('Expense edit/delete/type/date changes and Work partial/full/Undo immediately update source-derived Home without expected-money spending', async (t) => {
  const f = await initialized(t); const id = f.expense('30');
  const draft = { ...transactionDraft(null, pickerValue(date)), description: 'Edited', amount: '45', transactionDate: date };
  f.finance.editTransaction(id, draft); assert.equal(f.home.read().spentTodayMinor, 4500n);
  f.finance.editTransaction(id, { ...draft, transactionDate: '2026-10-08' }); assert.equal(f.home.read().spentTodayMinor, 0n);
  f.finance.editTransaction(id, { ...draft, type: 'income' }); assert.equal(f.home.read().spentTodayMinor, 0n);
  f.finance.editTransaction(id, draft); f.finance.deleteTransaction(id); assert.equal(f.home.read().spentTodayMinor, 0n);
  const client = f.work.createCounterparty('Client');
  const workId = f.work.create({ ...workDraft(null, date), title: 'Inventory Software', description: '', counterpartyId: client.id,
    compensationType: 'fixed', fixedAmount: '100', expectedPaymentDate: '2026-10-08' });
  const debt = () => f.home.read().attention.find((section) => section.source === 'work')?.total ?? 0;
  assert.equal(debt(), 1); assert.equal(f.home.read().spentTodayMinor, 0n);
  const first = f.work.recordPayment({ counterpartyId: client.id, allocations: [{ workEntryId: workId, amount: '40' }], paymentDate: date, categoryId: null });
  assert.equal(debt(), 1); assert.equal(f.home.read().attentionPreview.find((row) => row.source === 'work')!.amountMinor, 6000);
  const second = f.work.recordPayment({ counterpartyId: client.id, allocations: [{ workEntryId: workId, amount: '60' }], paymentDate: date, categoryId: null });
  assert.equal(debt(), 0); assert.equal(f.home.read().spentTodayMinor, 0n);
  f.work.undoPayment(second); assert.equal(debt(), 1); f.work.undoPayment(first);
  assert.equal(f.home.read().attentionPreview.find((row) => row.source === 'work')!.amountMinor, 10000);
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []);
});

test('Spending aggregate is exact above Number and SQLite SUM limits, returning grouped amounts without ledger details', async (t) => {
  const f = await initialized(t);
  for (let i = 0; i < 1040; i++) f.expense(formatBrlInput(maxAmountMinor));
  f.expense('1', date, 'income');
  const result = f.measure(() => f.finance.readSpentOnDate(date));
  assert.equal(result.value, BigInt(maxAmountMinor) * 1040n);
  assert.ok(result.value > 9223372036854775807n); assert.equal(result.count, 1);
  assert.match(result.statements[0].sql, /group by/);
  assert.doesNotMatch(result.statements[0].sql, /"description"|"note"|join/i);
  assert.equal(result.statements[0].rows, 1);
});

test('daily Fitness status counts all completions, keeps only latest summary and prioritizes active without history/set loads', async (t) => {
  const f = await initialized(t); f.setTime('2026-10-08');
  const old = f.fitness.startWorkout(); f.fitness.finishWorkout(old.id);
  f.setTime(date); assert.equal(f.home.read().completedWorkoutCount, 0);
  const first = f.fitness.startWorkout(); assert.ok(f.home.read().activeWorkout); f.fitness.finishWorkout(first.id);
  assert.equal(f.home.read().completedWorkoutCount, 1);
  f.setTime(date, '14:00'); const second = f.fitness.startWorkout(); f.fitness.finishWorkout(second.id);
  let snapshot = f.home.read(); assert.equal(snapshot.completedWorkoutCount, 2); assert.equal(snapshot.completedWorkout!.session.id, second.id);
  const active = f.fitness.startWorkout(); snapshot = f.home.read();
  assert.equal(snapshot.activeWorkout!.session.id, active.id); assert.equal(snapshot.completedWorkoutCount, 2); assert.equal(snapshot.completedWorkout, null);
  f.fitness.discardWorkout(active.id); assert.equal(f.home.read().completedWorkoutCount, 2);
  const result = f.measure(() => f.fitness.readDailySummary(date));
  assert.equal(result.value.history.length, 1); assert.equal(result.value.completedCount, 2);
  assert.ok(result.statements.every((row) => !row.sql.includes('fitness_routine_exercises') && !row.sql.includes('from "fitness_sets"')));
  assert.ok(result.statements.some((row) => /count\(\*\)/.test(row.sql) && row.sql.includes('"completed_at"')));
  f.setTime('2026-10-10'); assert.equal(f.home.read().completedWorkoutCount, 0);
});

test('daily spending and workout status use local civil dates across midnight, time zones and DST', async (t) => {
  const previous = process.env.TZ;
  try {
    for (const zone of ['America/Sao_Paulo', 'America/New_York', 'Pacific/Kiritimati']) {
      process.env.TZ = zone;
      const f = await initialized(t);
      const today = '2026-03-08'; f.setTime(today, '23:59'); const expense = f.expense('0,01', today);
      const workout = f.fitness.startWorkout(); f.fitness.finishWorkout(workout.id);
      assert.equal(f.home.read().date, today); assert.equal(f.home.read().spentTodayMinor, 1n); assert.equal(f.home.read().completedWorkoutCount, 1);
      f.setTime('2026-03-09', '00:00');
      assert.equal(f.home.read().spentTodayMinor, 0n); assert.equal(f.home.read().completedWorkoutCount, 0);
      f.finance.deleteTransaction(expense);
    }
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test('Home retains the next rotation after midnight and rest days without deriving missed training', async (t) => {
  const f = await initialized(t); const rotations = createRotationDataAccess(f.db, randomUUID, f.now);
  const routines = ['Push', 'Pull'].map((name) => f.fitness.createRoutine({ name, exercises: [] }));
  const id = rotations.create({ name: 'Cycle', steps: routines.map((routineId) => ({ id: null, routineId })) }); rotations.activate(id);
  f.setTime(date, '23:59'); f.fitness.finishWorkout(f.fitness.startWorkout(routines[0]).id);
  const completed = f.home.read(); assert.equal(completed.completedWorkoutCount, 1); assert.equal(completed.nextWorkout!.routine.name, 'Pull');
  for (const day of ['2026-10-10', '2026-10-15']) {
    f.setTime(day, '00:00'); const snapshot = f.home.read();
    assert.equal(snapshot.date, day); assert.equal(snapshot.completedWorkoutCount, 0); assert.equal(snapshot.completedWorkout, null);
    assert.equal(snapshot.nextWorkout!.stepId, completed.nextWorkout!.stepId);
    assert.deepEqual(snapshot.rotationSequence, ['Push', 'Pull']);
    assert.equal(snapshot.attention.length, 0, 'Rotation is not a dated missed obligation');
  }
  rotations.deactivate(id); const empty = f.home.read(); assert.equal(empty.nextWorkout, null); assert.deepEqual(empty.rotationSequence, []);
});

/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { eq } from 'drizzle-orm';

import { fitnessSessions, taskOccurrences } from '../src/database/schema';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import { transactionDraft } from '../src/features/finance/form';
import { formatBrlAmount, formatBrlInput } from '../src/features/finance/money';
import { workDraft } from '../src/features/finance/work/form';
import { blankSet } from '../src/features/fitness/form';
import { taskDraft } from '../src/features/tasks/form';
import { localDayBounds, pickerValue } from '../src/utils/calendar';
import { journalDatabase, journalToday as today } from './helpers/journal';

const daily = { frequency: 'daily' as const, interval: 1, weekdayMask: 0, monthDay: 3, month: 10, endDate: '' };

test('Journal context counts completed one-time Tasks and actual recurring occurrences on completion day', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const old = f.tasks.createTask({ ...taskDraft(), title: 'Past due task', date: '2026-09-01' }); f.tasks.setCompleted(old, true);
  const recurring = f.tasks.createTask({ ...taskDraft(), title: 'Actual occurrence', date: '2026-10-03', recurrence: daily });
  const rows = f.tasks.read().occurrences.filter((row) => row.taskId === recurring);
  const yesterday = rows.find((row) => row.scheduledDate === '2026-10-03')!;
  f.tasks.setOccurrenceStatus(yesterday.id, 'completed');
  f.tasks.setOccurrenceStatus(rows.find((row) => row.scheduledDate === today)!.id, 'skipped');
  f.tasks.createTask({ ...taskDraft(), title: 'Pending', date: today });
  const context = f.context.read(today);
  assert.equal(context.completedTaskCount, 2); assert.deepEqual(new Set(context.taskNames), new Set(['Past due task', 'Actual occurrence']));
  assert.equal(f.context.read('2026-10-03').completedTaskCount, 0);
  assert.equal(f.tasks.readCompletedOnDate(today).filter((row) => row.source === 'occurrence').length, 1);
  f.tasks.setOccurrenceStatus(yesterday.id, 'pending'); f.tasks.setCompleted(old, false);
  assert.equal(f.context.read(today).completedTaskCount, 0);
});

test('retired resolved schedule outcomes retain completion history while deleted Tasks disappear from context', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const id = f.tasks.createTask({ ...taskDraft(), title: 'Recurring history', date: today, recurrence: daily });
  const row = f.tasks.read().occurrences.find((item) => item.taskId === id && item.scheduledDate === '2026-10-05')!;
  f.tasks.setOccurrenceStatus(row.id, 'completed');
  f.db.update(taskOccurrences).set({ deletedAt: f.now(), updatedAt: f.now() }).where(eq(taskOccurrences.id, row.id)).run();
  assert.equal(f.context.read(today).completedTaskCount, 1);
  f.tasks.deleteTask(id); assert.equal(f.context.read(today).completedTaskCount, 0);
});

test('workout context uses local completion day, actual exercise/set counts, and excludes unfinished/discarded sessions', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  f.setTime('2026-10-03', '23:50');
  const id = f.fitness.startWorkout().id;
  const exercise = f.fitness.read().exercises.find((row) => row.measurementType === 'duration')!;
  const entry = f.fitness.addSessionExercise(id, exercise.id); f.fitness.addSet(entry, { ...blankSet(), minutes: '5' });
  f.setTime(today, '00:05'); f.fitness.finishWorkout(id);
  const active = f.fitness.startWorkout().id;
  assert.equal(f.context.read(today).workoutCount, 1); assert.equal(f.context.read('2026-10-03').workoutCount, 0);
  const workout = f.context.read(today).workouts[0];
  assert.equal(workout.id, id); assert.equal(workout.name, 'Free workout'); assert.equal(workout.exerciseCount, 1); assert.equal(workout.setCount, 1);
  f.fitness.discardWorkout(active); assert.equal(f.context.read(today).workoutCount, 1);
  f.db.update(fitnessSessions).set({ deletedAt: f.now(), updatedAt: f.now() }).where(eq(fitnessSessions.id, id)).run();
  assert.equal(f.context.read(today).workoutCount, 0);
});

test('Finance context reuses exact Income/Expense/Net Flow aggregation and excludes unpaid obligations/earnings', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  f.finance.createTransaction({ ...transactionDraft(null, pickerValue(today)), description: 'Salary', type: 'income', amount: '500' });
  f.finance.createTransaction({ ...transactionDraft(null, pickerValue(today)), description: 'Groceries', amount: '120' });
  f.finance.createTransaction({ ...transactionDraft(null, pickerValue('2026-10-03')), description: 'Different day', amount: '900' });
  f.commitments.create({ ...commitmentDraft(null, undefined, today), title: 'Unpaid bill', firstDueDate: today, amount: '180' });
  const client = f.work.createCounterparty('Client');
  f.work.create({ ...workDraft(null, today), description: 'Unreceived work', counterpartyId: client.id,
    compensationType: 'fixed', fixedAmount: '1000', expectedPaymentDate: today });
  const context = f.context.read(today);
  assert.equal(context.incomeMinor, 50000n); assert.equal(context.expensesMinor, 12000n); assert.equal(context.netFlowMinor, 38000n);
  assert.equal(context.transactionCount, 2); assert.equal(context.workoutCount, 0);
});

test('Finance context remains exact beyond safe aggregate numbers and supports negative Net Flow', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const amount = Number.MAX_SAFE_INTEGER;
  for (let i = 0; i < 2; i++) f.finance.createTransaction({ ...transactionDraft(null, pickerValue(today)), description: `Expense ${i}`, amount: formatBrlInput(amount) });
  f.finance.createTransaction({ ...transactionDraft(null, pickerValue(today)), description: 'Received', type: 'income', amount: '0,01' });
  const context = f.context.read(today);
  assert.equal(context.expensesMinor, BigInt(amount) * 2n); assert.equal(context.incomeMinor, 1n);
  assert.equal(context.netFlowMinor, 1n - BigInt(amount) * 2n); assert.ok(formatBrlAmount(context.netFlowMinor).includes('-'));
});

test('source edits/deletes/payment undo refresh context without ever altering diary content or mood', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const saved = f.access.save(today, { content: 'My memory\nremains my own.', mood: 'good' }, f.access.getEntry(today))!;
  const transaction = f.finance.createTransaction({ ...transactionDraft(null, pickerValue(today)), description: 'Expense', amount: '10' });
  assert.equal(f.context.read(today).expensesMinor, 1000n);
  f.finance.editTransaction(transaction, { ...transactionDraft(null, pickerValue(today)), description: 'Edited expense', amount: '20' });
  assert.equal(f.context.read(today).expensesMinor, 2000n); f.finance.deleteTransaction(transaction);
  assert.equal(f.context.read(today).expensesMinor, 0n);
  const commitmentId = f.commitments.create({ ...commitmentDraft(null, undefined, today), title: 'Bill', firstDueDate: today, amount: '180' });
  const occurrence = f.commitments.read().items.find((item) => item.commitment.id === commitmentId)!.outstanding[0];
  f.commitments.pay(occurrence, '170', today); assert.equal(f.context.read(today).expensesMinor, 17000n);
  f.commitments.reopen(occurrence.id!); assert.equal(f.context.read(today).expensesMinor, 0n);
  const client = f.work.createCounterparty('Client');
  const work = f.work.create({ ...workDraft(null, today), description: 'Work', counterpartyId: client.id, compensationType: 'fixed', fixedAmount: '100' });
  f.work.recordPayment({ counterpartyId: client.id, paymentDate: today, categoryId: null, allocations: [{ workEntryId: work, amount: '80' }] });
  assert.equal(f.context.read(today).incomeMinor, 8000n);
  f.work.undoPayment(f.finance.read().transactions.find((row) => row.type === 'income')!.id);
  assert.equal(f.context.read(today).incomeMinor, 0n); assert.deepEqual(f.access.getEntry(today), saved);
});

test('context reads are idempotent/read-only, generate no occurrences and bound previews without losing counts', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  for (let i = 0; i < 5; i++) {
    const task = f.tasks.createTask({ ...taskDraft(), title: `Completed ${i}` }); f.tasks.setCompleted(task, true);
    f.fitness.finishWorkout(f.fitness.startWorkout().id);
  }
  const snapshot = () => Object.fromEntries(f.sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all()
    .map((row) => [String(row.name), f.sqlite.prepare(`SELECT * FROM "${row.name}" ORDER BY rowid`).all()]));
  const before = snapshot(); const first = f.context.read(today);
  assert.equal(first.completedTaskCount, 5); assert.equal(first.taskNames.length, 3); assert.equal(first.workoutCount, 5); assert.equal(first.workouts.length, 3);
  assert.deepEqual(f.context.read(today), first); assert.deepEqual(snapshot(), before);
  assert.deepEqual(Object.keys(f.access.save(today, { content: 'Independent', mood: null }, f.access.getEntry(today))!).sort(),
    ['id', 'entryDate', 'content', 'mood', 'createdAt', 'updatedAt', 'deletedAt'].sort());
});

test('completion timestamp boundaries include local midnight, exclude next midnight and respect daylight saving', async (t) => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = 'America/New_York';
    const f = await journalDatabase(); t.after(() => f.sqlite.close());
    for (const [date, hours] of [['2026-03-08', 23], ['2026-11-01', 25]] as const) {
      const bounds = localDayBounds(date); assert.equal(bounds.until - bounds.from, hours * 3600000);
      const insert = f.sqlite.prepare('INSERT INTO fitness_workout_sessions (id, name, started_at, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
      for (const [suffix, timestamp] of [['before', bounds.from - 1], ['start', bounds.from], ['last', bounds.until - 1], ['next', bounds.until]] as const) {
        insert.run(`${date}-${suffix}`, suffix, timestamp, timestamp, timestamp, timestamp);
      }
      assert.deepEqual(new Set(f.context.read(date).workouts.map((workout) => workout.name)), new Set(['start', 'last']));
      assert.equal(f.context.read(date).workoutCount, 2);
    }
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test('local-day bounds handle daylight-saving transitions at midnight and historically skipped civil days', () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = 'America/Sao_Paulo';
    const shortened = localDayBounds('2018-11-04');
    assert.equal(new Date(shortened.from).getHours(), 1); assert.equal(new Date(shortened.until).getHours(), 0);
    assert.equal(shortened.until - shortened.from, 23 * 3600000);
    process.env.TZ = 'Pacific/Apia';
    const skipped = localDayBounds('2011-12-30'); assert.equal(skipped.from, skipped.until);
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

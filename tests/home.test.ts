/// <reference types="node" />

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { seedDefaultCategories } from '../src/database/seed';
import { createCalendarDataAccess } from '../src/features/calendar/data';
import { createCommitmentDataAccess } from '../src/features/finance/commitments/data';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import { createFinanceDataAccess } from '../src/features/finance/data';
import { transactionDraft } from '../src/features/finance/form';
import { seedFinanceCategories } from '../src/features/finance/seed';
import { createWorkDataAccess } from '../src/features/finance/work/data';
import { workDraft } from '../src/features/finance/work/form';
import { createFitnessDataAccess } from '../src/features/fitness/data';
import { seedFitnessExercises } from '../src/features/fitness/seed';
import { createHomeDataAccess } from '../src/features/home/data';
import { homePreviewLimits, projectHome, type HomeSources } from '../src/features/home/projection';
import { startHomeRefresh } from '../src/features/home/refresh';
import type { HomeItem, HomeSnapshot, HomeTaskItem } from '../src/features/home/types';
import { sourceRequest } from '../src/features/source-navigation';
import { createTaskDataAccess } from '../src/features/tasks/data';
import { taskDraft } from '../src/features/tasks/form';
import { occurrenceState } from '../src/features/tasks/recurrence';
import type { TaskDraft } from '../src/features/tasks/types';
import { localDateString, pickerValue } from '../src/utils/calendar';
import { bundledMigrations, database } from './helpers/database';

const initialDay = '2026-10-04';
const daily = { frequency: 'daily' as const, interval: 1, weekdayMask: 0, monthDay: 4, month: 10, endDate: '' };
async function initialized() {
  const result = database(); await migrate(result.db, bundledMigrations);
  seedDefaultCategories(result.db, 1000); seedFinanceCategories(result.db, 1000); seedFitnessExercises(result.db);
  let instant = pickerValue(initialDay, '12:00').getTime(); const now = () => instant;
  const tasks = createTaskDataAccess(result.db, randomUUID, now);
  const commitments = createCommitmentDataAccess(result.db, randomUUID, now);
  const work = createWorkDataAccess(result.db, randomUUID, now);
  const finance = createFinanceDataAccess(result.db, randomUUID, now);
  const fitness = createFitnessDataAccess(result.db, randomUUID, now);
  const home = createHomeDataAccess(result.db, randomUUID, now);
  const calendar = createCalendarDataAccess(result.db, randomUUID, now);
  function task(title: string, changes: Partial<TaskDraft> = {}) { return tasks.createTask({ ...taskDraft(), title, date: localDateString(new Date(instant)), ...changes }); }
  function bill(title = 'Electricity', firstDueDate = initialDay) {
    return commitments.create({ ...commitmentDraft(null, undefined, initialDay), title, firstDueDate, amount: '180' });
  }
  function expectedPayment(name = 'Client', expectedPaymentDate = initialDay) {
    const client = work.createCounterparty(name);
    const id = work.create({ ...workDraft(null, initialDay), title: 'Website', description: 'Website', counterpartyId: client.id,
      compensationType: 'fixed', fixedAmount: '1000', expectedPaymentDate });
    return { id, client };
  }
  return { ...result, home, calendar, tasks, commitments, work, finance, fitness, task, bill, expectedPayment, now,
    setTime: (day: string, time = '12:00') => { instant = pickerValue(day, time).getTime(); } };
}
function todayItems(snapshot: HomeSnapshot) { return snapshot.today.flatMap((section) => section.items); }
function attentionItems(snapshot: HomeSnapshot) { return snapshot.attention.flatMap((section) => section.items); }
function findTask(snapshot: HomeSnapshot, recordId: string, attention = false): HomeTaskItem {
  const item = (attention ? attentionItems(snapshot) : todayItems(snapshot)).find((item) => item.recordId === recordId);
  assert.equal(item?.source, 'task'); return item as HomeTaskItem;
}

test('Home Today includes timed/date-only/actual recurring tasks, due commitments and expected work in source/time order', async (t) => {
  const f = await initialized(); t.after(() => f.sqlite.close());
  const dateOnly = f.task('A date-only task');
  const late = f.task('Late timed', { time: '18:00', priority: 'high' });
  const early = f.task('Early timed', { time: '10:30' }); // One-time tasks keep the existing Today semantics, even after their time.
  const recurring = f.task('Recurring', { recurrence: daily, time: '15:00' });
  const bill = f.bill(); const payment = f.expectedPayment();
  const snapshot = f.home.read();
  assert.deepEqual(snapshot.today.map((section) => section.source), ['task', 'commitment', 'work']);
  assert.deepEqual(todayItems(snapshot).map((item) => item.recordId), [early, recurring, late, dateOnly, bill, payment.id]);
  assert.equal(findTask(snapshot, recurring).occurrenceId, f.tasks.read().occurrences.find((row) => row.taskId === recurring && row.scheduledDate === initialDay)!.id);
  assert.equal(findTask(snapshot, late).priority, 'high'); assert.match(findTask(snapshot, late).secondary, /High priority/);
  assert.equal(snapshot.attention.length, 0); assert.equal(snapshot.nothingPending, false);
});

test('Home ignores ordinary Finance transactions, future/undated/completed/skipped/deleted tasks and settled work', async (t) => {
  const f = await initialized(); t.after(() => f.sqlite.close());
  f.finance.createTransaction({ ...transactionDraft(null, pickerValue(initialDay)), description: 'Actual expense', amount: '50' });
  f.task('Future', { date: '2026-10-05' }); f.task('Undated', { date: '' });
  const completed = f.task('Completed'); f.tasks.setCompleted(completed, true);
  const removed = f.task('Removed'); f.tasks.deleteTask(removed);
  const skipped = f.task('Skipped', { recurrence: daily });
  f.tasks.setOccurrenceStatus(f.tasks.read().occurrences.find((row) => row.taskId === skipped && row.scheduledDate === initialDay)!.id, 'skipped');
  const payment = f.expectedPayment(); f.work.recordPayment({ counterpartyId: payment.client.id, allocations: [{ workEntryId: payment.id, amount: '1000' }], paymentDate: initialDay, categoryId: null });
  const snapshot = f.home.read();
  assert.equal(snapshot.today.length, 0); assert.equal(snapshot.attention.length, 0); assert.equal(snapshot.nothingPending, true);
});

test('Home reflects recurring Missed exactly at the existing time boundary without duplicating Today', async (t) => {
  const f = await initialized(); t.after(() => f.sqlite.close());
  f.setTime(initialDay, '10:30'); const id = f.task('Timed recurrence', { recurrence: daily, time: '10:30' });
  const dateOnly = f.task('Date-only recurrence', { recurrence: daily });
  assert.equal(findTask(f.home.read(), id).status, 'Today');
  f.setTime(initialDay, '10:31');
  const snapshot = f.home.read(); const missed = findTask(snapshot, id, true);
  assert.equal(missed.status, 'Missed'); assert.equal(missed.date, initialDay); assert.equal(missed.time, '10:30');
  assert.ok(!todayItems(snapshot).some((item) => item.recordId === id));
  assert.equal(findTask(snapshot, dateOnly).status, 'Today');
  assert.equal(occurrenceState(f.tasks.read().occurrences.find((row) => row.id === missed.occurrenceId)!, new Date(f.now())), 'missed');
});

test('Needs attention preserves old original dates and reflects Earlier/Missed, commitment overdue and work overdue', async (t) => {
  const f = await initialized(); t.after(() => f.sqlite.close());
  const task = f.task('Earlier task', { date: '2025-08-01', priority: 'high' });
  const recurring = f.task('Missed', { date: '2026-10-03', recurrence: { ...daily, endDate: '2026-10-03' } });
  const bill = f.bill('Old Internet', '2025-08-03'); const payment = f.expectedPayment('Historical Client', '2025-08-05');
  const snapshot = f.home.read();
  assert.equal(findTask(snapshot, task, true).status, 'Earlier'); assert.equal(findTask(snapshot, recurring, true).status, 'Missed');
  const obligations = snapshot.attention.find((section) => section.source === 'commitment')!;
  assert.equal(obligations.total, 15); assert.equal(obligations.items.length, 3); assert.equal(obligations.remaining, 12);
  assert.ok(obligations.items.every((item) => item.recordId === bill && item.date < initialDay));
  const work = attentionItems(snapshot).find((item) => item.recordId === payment.id)!;
  assert.equal(work.date, '2025-08-05'); assert.equal(work.status, 'Payment overdue');
  assert.ok('date' in work.target.params); assert.equal(work.target.params.date, '2025-08-05');
  assert.equal(f.work.read().items[0].entry.expectedPaymentDate, '2025-08-05');
  assert.equal(f.commitments.read().items[0].outstanding[0].dueDate, '2025-08-03');
});

test('paused/ended commitments retain due attention but do not manufacture paused-period obligations', async (t) => {
  const f = await initialized(); t.after(() => f.sqlite.close());
  const paused = f.bill('Paused bill', '2026-09-03'); const ended = f.bill('Ended bill', '2026-09-04');
  f.commitments.pause(paused); f.commitments.end(ended); f.setTime('2026-12-04');
  const section = f.home.read().attention.find((section) => section.source === 'commitment')!;
  assert.equal(section.total, 4); assert.ok(section.items.every((item) => item.date <= initialDay));
  assert.equal(f.commitments.read().items.find((item) => item.commitment.id === paused)!.outstanding.length, 2);
});

test('Task quick completion persists the correct source outcome and disappears; repeated/stale taps do not reopen or overwrite Skip', async (t) => {
  const f = await initialized(); t.after(() => f.sqlite.close());
  const oneTime = f.task('One-time'); const recurring = f.task('Recurring', { recurrence: daily });
  let snapshot = f.home.read(); const oneTimeRow = findTask(snapshot, oneTime); const recurringRow = findTask(snapshot, recurring);
  f.home.completeTask(oneTimeRow); f.home.completeTask(oneTimeRow);
  f.home.completeTask(recurringRow); f.home.completeTask(recurringRow);
  snapshot = f.home.read(); assert.equal(todayItems(snapshot).length, 0);
  assert.ok(f.tasks.read().tasks.find((task) => task.id === oneTime)!.completedAt);
  assert.equal(f.tasks.read().occurrences.find((row) => row.id === recurringRow.occurrenceId)!.status, 'completed');
  assert.ok(f.tasks.read().occurrences.filter((row) => row.taskId === recurring && row.scheduledDate > initialDay).every((row) => row.status === 'pending'));
  f.tasks.setOccurrenceStatus(recurringRow.occurrenceId!, 'skipped'); f.home.completeTask(recurringRow);
  assert.equal(f.tasks.read().occurrences.find((row) => row.id === recurringRow.occurrenceId)!.status, 'skipped');
});

test('quick completion rejects a stale changed-date task and a removed source', async (t) => {
  const f = await initialized(); t.after(() => f.sqlite.close());
  const id = f.task('Changed'); const row = findTask(f.home.read(), id);
  f.tasks.editTask(id, { ...taskDraft(), title: 'Changed', date: '2026-10-05' });
  assert.throws(() => f.home.completeTask(row), /Refresh Home/); assert.equal(f.tasks.read().tasks.find((task) => task.id === id)!.completedAt, null);
  f.tasks.deleteTask(id); assert.throws(() => f.home.completeTask(row), /Refresh Home/);
});

test('resolved attention items leave Home through existing Task completion, Skip and Work payment APIs', async (t) => {
  const f = await initialized(); t.after(() => f.sqlite.close());
  const earlier = f.task('Earlier', { date: '2026-10-03' });
  const missed = f.task('Missed', { date: '2026-10-03', recurrence: { ...daily, endDate: '2026-10-03' } });
  const payment = f.expectedPayment('Overdue Client', '2026-10-03');
  const snapshot = f.home.read();
  f.home.completeTask(findTask(snapshot, earlier, true));
  f.tasks.setOccurrenceStatus(findTask(snapshot, missed, true).occurrenceId!, 'skipped');
  f.work.recordPayment({ counterpartyId: payment.client.id, allocations: [{ workEntryId: payment.id, amount: '1000' }], paymentDate: initialDay, categoryId: null });
  assert.equal(f.home.read().attention.length, 0);
});

test('Pay/Skip removes commitment previews on the next read without altering unrelated due identities', async (t) => {
  const f = await initialized(); t.after(() => f.sqlite.close());
  const id = f.bill('Rent', '2026-09-04'); const before = f.home.read();
  assert.equal(todayItems(before).filter((item) => item.recordId === id).length, 1);
  assert.equal(attentionItems(before).filter((item) => item.recordId === id).length, 1);
  const item = f.commitments.read().items[0];
  f.commitments.pay(item.outstanding.find((row) => row.dueDate === initialDay)!, '175', initialDay);
  assert.ok(!todayItems(f.home.read()).some((row) => row.recordId === id));
  assert.equal(attentionItems(f.home.read()).find((row) => row.recordId === id)!.date, '2026-09-04');
  f.commitments.skip(item.outstanding.find((row) => row.dueDate === '2026-09-04')!);
  assert.equal(attentionItems(f.home.read()).length, 0);
});

test('Work previews reflect actual partial outstanding amounts and leave Home only when resolved', async (t) => {
  const f = await initialized(); t.after(() => f.sqlite.close()); const payment = f.expectedPayment();
  const pay = (amount: string) => f.work.recordPayment({ counterpartyId: payment.client.id, allocations: [{ workEntryId: payment.id, amount }], paymentDate: initialDay, categoryId: null });
  pay('400'); let row = todayItems(f.home.read()).find((item) => item.recordId === payment.id)!;
  assert.equal(row.source, 'work'); assert.equal((row as HomeItem & { amountMinor: number }).amountMinor, 60000); assert.match(row.secondary, /600,00 outstanding/);
  pay('600'); assert.ok(!todayItems(f.home.read()).some((item) => item.recordId === payment.id));
  assert.equal(f.work.read().items[0].entry.expectedPaymentDate, initialDay);
});

test('active workout has an exact resume target, completion clears it and creates only a lightweight today summary', async (t) => {
  const f = await initialized(); t.after(() => f.sqlite.close());
  const workout = f.fitness.startWorkout(); let snapshot = f.home.read();
  assert.equal(snapshot.activeWorkout!.session.id, workout.id);
  assert.deepEqual(snapshot.activeWorkout!.target, { pathname: '/(tabs)/fitness' });
  assert.equal(snapshot.nothingPending, false); assert.equal(snapshot.completedWorkout, null);
  f.fitness.finishWorkout(workout.id); snapshot = f.home.read();
  assert.equal(snapshot.activeWorkout, null); assert.equal(snapshot.completedWorkout!.session.id, workout.id); assert.equal(snapshot.nothingPending, true);
  const next = f.fitness.startWorkout(); assert.equal(f.home.read().activeWorkout!.session.id, next.id); assert.equal(f.home.read().completedWorkout, null);
  f.fitness.discardWorkout(next.id); assert.equal(f.home.read().activeWorkout, null);
});

test('workout completed-today follows completedAt local day even when started yesterday', async (t) => {
  const f = await initialized(); t.after(() => f.sqlite.close());
  f.setTime('2026-10-03', '23:55'); const workout = f.fitness.startWorkout(); f.setTime(initialDay, '00:05'); f.fitness.finishWorkout(workout.id);
  assert.equal(f.home.read().completedWorkout!.session.id, workout.id);
  f.setTime('2026-10-05', '00:00'); assert.equal(f.home.read().completedWorkout, null);
});

test('Home previews are bounded with complete counts and deterministic priority/recent attention order', async (t) => {
  const f = await initialized(); t.after(() => f.sqlite.close());
  for (let i = 0; i < 8; i++) {
    f.task(`Today ${i}`, { time: i % 2 ? '18:00' : '' });
    f.task(`Earlier ${i}`, { date: `2026-10-0${i % 3 + 1}`, priority: i === 0 ? 'high' : 'none' });
    f.bill(`Bill ${i}`); f.expectedPayment(`Client ${i}`);
  }
  const first = f.home.read(); const second = f.home.read();
  assert.deepEqual(second, first);
  assert.equal(first.today.find((section) => section.source === 'task')!.items.length, homePreviewLimits.todayTasks);
  assert.equal(first.today.find((section) => section.source === 'task')!.remaining, 3);
  assert.equal(first.today.find((section) => section.source === 'commitment')!.items.length, homePreviewLimits.todayFinance);
  assert.equal(first.today.find((section) => section.source === 'work')!.remaining, 5);
  const attention = first.attention.find((section) => section.source === 'task')!;
  assert.equal(attention.items.length, homePreviewLimits.attentionPerSource); assert.equal(attention.total, 8);
  assert.equal(attention.items[0].title, 'Earlier 0'); assert.equal(attention.items[1].date, '2026-10-03');
  assert.deepEqual(attention.target, { pathname: '/(tabs)/tasks' });
});

test('Home uses shared Calendar source metadata/order and retains archived Finance names while omitting archived Task labels', async (t) => {
  const f = await initialized(); t.after(() => f.sqlite.close());
  const taskCategory = f.tasks.createCategory('Old task category'); const id = f.task('Task', { categoryId: taskCategory.id }); f.tasks.deleteCategory(taskCategory.id);
  const financeCategory = f.finance.createCategory('Old Pets', 'expense');
  f.commitments.create({ ...commitmentDraft(null, undefined, initialDay), title: 'Vet', amount: '180', firstDueDate: initialDay, categoryId: financeCategory.id });
  f.finance.deleteCategory(financeCategory.id); f.expectedPayment();
  const calendar = f.calendar.readRange({ from: initialDay, to: initialDay });
  const home = todayItems(f.home.read());
  assert.deepEqual(home.map((item) => item.id), calendar.map((item) => item.id));
  for (const item of home) assert.equal(item.secondary, calendar.find((row) => row.id === item.id)!.secondary);
  assert.ok(!home.find((item) => item.recordId === id)!.secondary.includes('Old task category'));
  assert.match(home.find((item) => item.source === 'commitment')!.secondary, /Old Pets/);
});

test('source routes preserve occurrence dates, distinguish overview links and reject malformed targets', async (t) => {
  const f = await initialized(); t.after(() => f.sqlite.close()); const id = f.task('Task'); f.bill(); f.expectedPayment();
  for (const item of todayItems(f.home.read())) {
    assert.equal(item.target.pathname, '/home-source'); assert.deepEqual(sourceRequest(item.target.params, 'Home'), item.target.params);
    assert.deepEqual(sourceRequest(item.target.params, 'Calendar'), item.target.params);
  }
  assert.deepEqual(findTask(f.home.read(), id).target.params, { source: 'task', recordId: id, date: initialDay });
  assert.deepEqual(sourceRequest({ source: 'commitment' }, 'Home'), { source: 'commitment', recordId: undefined, date: undefined });
  for (const params of [{ source: 'invalid' }, { source: 'task' }, { source: 'task', recordId: 'id', date: '2026-02-30' },
    { source: 'work', recordId: 'id' }, { source: 'work', recordId: ['id'], date: initialDay }, { source: 'fitness', recordId: '' }]) assert.equal(sourceRequest(params, 'Home'), null);
  assert.equal(sourceRequest({ source: 'commitment' }, 'Calendar'), null);
  assert.equal(sourceRequest({ source: 'fitness', recordId: 'id' }, 'Calendar'), null);
});

test('focus/resume/minute refresh reflects source actions, and blur removes subscriptions and ignores late callbacks', async (t) => {
  const f = await initialized(); t.after(() => f.sqlite.close());
  const task = f.task('Task'); f.bill(); const work = f.expectedPayment(); f.fitness.startWorkout();
  let snapshot: HomeSnapshot; let timer: () => void = () => {}; let resume: (state: string) => void = () => {};
  let stoppedTimer = 0; let stoppedResume = 0; let reads = 0;
  const stop = startHomeRefresh({ load: () => { snapshot = f.home.read(); reads++; },
    everyMinute: (callback) => { timer = callback; return () => { stoppedTimer++; }; },
    onResume: (callback) => { resume = callback; return () => { stoppedResume++; }; } });
  assert.equal(reads, 1); f.tasks.setCompleted(task, true); timer();
  assert.ok(!todayItems(snapshot!).some((item) => item.recordId === task));
  f.commitments.pay(f.commitments.read().items[0].outstanding[0], '180', initialDay); resume('active');
  assert.ok(!todayItems(snapshot!).some((item) => item.source === 'commitment'));
  f.work.recordPayment({ counterpartyId: work.client.id, allocations: [{ workEntryId: work.id, amount: '1000' }], paymentDate: initialDay, categoryId: null }); timer();
  assert.ok(!todayItems(snapshot!).some((item) => item.source === 'work'));
  f.fitness.finishWorkout(snapshot!.activeWorkout!.session.id); resume('active'); assert.equal(snapshot!.activeWorkout, null);
  const before = reads; resume('background'); assert.equal(reads, before);
  stop(); timer(); resume('active'); assert.equal(reads, before); assert.equal(stoppedTimer, 1); assert.equal(stoppedResume, 1);
});

test('local midnight moves date-only tasks and expected payments to attention on minute refresh', async (t) => {
  const f = await initialized(); t.after(() => f.sqlite.close()); f.setTime(initialDay, '23:59');
  const id = f.task('Date-only recurrence', { recurrence: { ...daily, endDate: initialDay } }); f.expectedPayment();
  let snapshot: HomeSnapshot; let timer: () => void = () => {};
  const stop = startHomeRefresh({ load: () => { snapshot = f.home.read(); }, everyMinute: (callback) => { timer = callback; return () => {}; }, onResume: () => () => {} });
  assert.equal(todayItems(snapshot!).length, 2); f.setTime('2026-10-05', '00:00'); timer();
  assert.equal(snapshot!.date, '2026-10-05'); assert.equal(todayItems(snapshot!).length, 0);
  assert.equal(findTask(snapshot!, id, true).status, 'Missed'); assert.equal(attentionItems(snapshot!).find((item) => item.source === 'work')!.date, initialDay);
  stop();
});

test('local Today projection is stable across device time zones and DST dates rather than UTC date strings', () => {
  const previous = process.env.TZ;
  const empty: HomeSources = { tasks: { tasks: [], items: [], occurrences: [], recurrences: [], categories: [] },
    commitments: [], financeCategories: [], work: [], fitness: { active: null, history: [] } };
  try {
    for (const zone of ['America/Sao_Paulo', 'America/New_York', 'Pacific/Kiritimati', 'Pacific/Honolulu']) {
      process.env.TZ = zone;
      for (const [year, month, day, hour, minute] of [[2026, 2, 8, 0, 5], [2026, 9, 4, 23, 59]]) {
        const instant = new Date(year, month, day, hour, minute);
        assert.equal(projectHome(empty, instant).date, localDateString(instant));
      }
    }
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test('Home re-reads create no Home tables or records, preserve financial dates/data, and occurrence generation is idempotent', async (t) => {
  const f = await initialized(); t.after(() => f.sqlite.close());
  f.task('Recurring', { recurrence: daily }); f.bill('Older', '2025-08-03'); f.expectedPayment();
  f.home.read();
  const snapshot = () => Object.fromEntries(f.sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()
    .map((row) => [String(row.name), f.sqlite.prepare(`SELECT * FROM "${row.name}" ORDER BY rowid`).all()]));
  const before = snapshot(); f.home.read(); f.home.read(); assert.deepEqual(snapshot(), before);
  assert.equal(f.sqlite.prepare("SELECT count(*) AS count FROM sqlite_master WHERE name LIKE 'home_%'").get()!.count, 0);
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []); assert.equal(f.sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
});

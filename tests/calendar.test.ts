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
import { createCalendarDataAccess } from '../src/features/calendar/data';
import { monthDates, moveMonth, returnToToday, selectDate } from '../src/features/calendar/model';
import { activityMarkers, dayAgenda, projectCalendar, sourceParams } from '../src/features/calendar/projection';
import type { TaskCalendarItem } from '../src/features/calendar/types';
import { createTaskDataAccess } from '../src/features/tasks/data';
import { taskDraft } from '../src/features/tasks/form';
import type { RecurrenceDraft } from '../src/features/tasks/types';
import { createCommitmentDataAccess } from '../src/features/finance/commitments/data';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import { createFinanceDataAccess } from '../src/features/finance/data';
import { transactionDraft } from '../src/features/finance/form';
import { createWorkDataAccess } from '../src/features/finance/work/data';
import { workDraft } from '../src/features/finance/work/form';
import { addDays, addMonths, dateOrdinal, endOfMonth, localDateString, monthGridRange, pickerValue, startOfMonth, validateDateRange, weekdayIndex } from '../src/utils/calendar';
import { bundledMigrations, database } from './helpers/database';

const initialDay = '2026-10-04';
const daily: RecurrenceDraft = { frequency: 'daily', interval: 1, weekdayMask: 0, monthDay: 1, month: 1, endDate: '' };
const range = monthGridRange(initialDay);
async function initialized(filename = ':memory:') {
  const result = database(filename); await migrate(result.db, bundledMigrations);
  let time = pickerValue(initialDay, '12:00').getTime(); const now = () => time;
  return { ...result, now, setDay: (day: string) => { time = pickerValue(day, '12:00').getTime(); },
    calendar: createCalendarDataAccess(result.db, randomUUID, now), tasks: createTaskDataAccess(result.db, randomUUID, now),
    commitments: createCommitmentDataAccess(result.db, randomUUID, now), work: createWorkDataAccess(result.db, randomUUID, now),
    finance: createFinanceDataAccess(result.db, randomUUID, now) };
}

for (const [month, weekday] of [['2026-06-01', 0], ['2026-09-01', 1], ['2026-04-01', 2], ['2026-10-01', 3], ['2026-05-01', 4], ['2026-08-01', 5], ['2026-02-01', 6]] as const) {
  test(`Monday-first grid for a month starting weekday ${weekday}`, () => {
    const dates = monthDates(month);
    assert.equal(weekdayIndex(month), weekday); assert.equal(weekdayIndex(dates[0]), 0); assert.equal(weekdayIndex(dates.at(-1)!), 6);
    assert.equal(dates[weekday], month); assert.equal(dates.length % 7, 0); assert.equal(new Set(dates).size, dates.length);
    assert.ok(dates.includes(endOfMonth(month)));
    for (let index = 1; index < dates.length; index++) assert.equal(dateOrdinal(dates[index]) - dateOrdinal(dates[index - 1]), 1);
  });
}
test('February, leap years, and four/five/six rows', () => {
  assert.equal(endOfMonth('2028-02-10'), '2028-02-29'); assert.equal(endOfMonth('2100-02-10'), '2100-02-28');
  assert.equal(monthDates('2021-02-01').length, 28); assert.equal(monthDates('2026-10-01').length, 35);
  assert.equal(monthDates('2026-08-01').length, 42); assert.ok(monthDates('2028-02-01').includes('2028-02-29'));
});
test('navigation preserves/clamps the day, adjacent selection changes month, and Today resets both', () => {
  assert.deepEqual(moveMonth(selectDate('2026-01-31'), 1), selectDate('2026-02-28'));
  assert.deepEqual(moveMonth(selectDate('2028-01-31'), 1), selectDate('2028-02-29'));
  assert.deepEqual(moveMonth(selectDate('2026-10-12'), -1), selectDate('2026-09-12'));
  assert.deepEqual(moveMonth(selectDate('2026-12-31'), 1), selectDate('2027-01-31'));
  assert.deepEqual(moveMonth(selectDate('2027-01-31'), -1), selectDate('2026-12-31'));
  assert.equal(selectDate(monthDates('2026-10-01')[0]).month, '2026-09-01');
  assert.deepEqual(returnToToday(initialDay), { month: '2026-10-01', selected: initialDay });
  assert.equal(addMonths('0001-01-01', -1), '0001-01-01'); assert.equal(addMonths('9999-12-31', 1), '9999-12-31');
});
test('civil dates and local picker round-trip without UTC day shifts', () => {
  for (const date of ['2026-01-01', '2026-10-04', '2026-12-31', '2028-02-29']) {
    assert.equal(localDateString(pickerValue(date, '00:01')), date); assert.equal(startOfMonth(date).slice(0, 7), date.slice(0, 7));
    assert.equal(addDays(addDays(date, 1), -1), date);
  }
});
test('range APIs reject malformed, reversed, and unbounded requests', async (t) => {
  const f = await initialized(); t.after(() => f.sqlite.close());
  for (const invalid of [{ from: '2026-02-30', to: initialDay }, { from: '2026-10-10', to: initialDay }, { from: '2026-01-01', to: '2027-01-01' }]) {
    for (const read of [f.calendar.readRange, f.tasks.readRange, f.commitments.readRange, f.work.readRange]) assert.throws(() => read(invalid), /range/);
  }
  assert.doesNotThrow(() => validateDateRange(range));
});
test('dated, timed, all-day and completed one-time Tasks stay on their dates; undated/deleted tasks do not appear', async (t) => {
  const f = await initialized(); t.after(() => f.sqlite.close());
  const category = f.tasks.createCategory('Study');
  const done = f.tasks.createTask({ ...taskDraft(), title: 'Done', date: initialDay, categoryId: category.id, priority: 'high' });
  f.tasks.setCompleted(done, true);
  f.tasks.createTask({ ...taskDraft(), title: 'Timed', date: initialDay, time: '10:30' });
  f.tasks.createTask({ ...taskDraft(), title: 'Undated' });
  const removed = f.tasks.createTask({ ...taskDraft(), title: 'Deleted', date: initialDay }); f.tasks.deleteTask(removed);
  const items = f.calendar.readRange(range);
  assert.equal(items.length, 2); assert.equal(items[0].title, 'Timed'); assert.match(items[0].secondary, /10:30/);
  assert.equal(items[1].status, 'Completed'); assert.match(items[1].secondary, /All day.*Study.*High priority/); assert.equal(items[1].date, initialDay);
  f.tasks.deleteCategory(category.id); assert.doesNotMatch(f.calendar.readRange(range)[1].secondary, /Study|Uncategorized/);
});
test('Calendar completion/reopen calls the source APIs and refresh preserves the original date', async (t) => {
  const f = await initialized(); t.after(() => f.sqlite.close());
  const id = f.tasks.createTask({ ...taskDraft(), title: 'Once', date: initialDay });
  const item = () => f.calendar.readRange(range).find((row) => row.recordId === id) as TaskCalendarItem;
  f.calendar.toggleTask(item()); assert.equal(item().completed, true); assert.equal(item().date, initialDay);
  f.calendar.toggleTask(item()); assert.equal(item().completed, false);
  f.tasks.editTask(id, { ...taskDraft(), title: 'Moved', date: '2026-11-04' });
  assert.equal(f.calendar.readRange(range).length, 0); assert.equal(f.calendar.readRange(monthGridRange('2026-11-01'))[0].title, 'Moved');
});
for (const recurrence of [daily, { ...daily, frequency: 'weekly' as const, weekdayMask: 21 }]) {
  test(`${recurrence.frequency} Tasks materialize every actual future occurrence in the requested grid only, without duplicates`, async (t) => {
    const f = await initialized(); t.after(() => f.sqlite.close());
    const id = f.tasks.createTask({ ...taskDraft(), title: 'Workout', date: initialDay, recurrence });
    const futureRange = monthGridRange('2027-05-01');
    const first = f.calendar.readRange(futureRange); const second = f.calendar.readRange(futureRange);
    assert.deepEqual(first, second); assert.ok(first.length > 1); assert.ok(first.every((row) => row.recordId === id && row.date >= futureRange.from && row.date <= futureRange.to));
    assert.equal(f.db.select().from(schema.taskOccurrences).all().length, first.length);
    assert.equal(new Set(first.map((row) => row.id)).size, first.length);
    const rows = f.tasks.readRange(futureRange); assert.equal(rows.length, first.length);
    assert.equal(projectCalendar([...rows, ...rows], [], [], new Date(f.now())).length, first.length);
    f.calendar.toggleTask(first[0] as TaskCalendarItem); assert.equal(f.calendar.readRange(futureRange)[0].status, 'Completed');
    const occurrence = rows[1].occurrence!; f.tasks.setOccurrenceStatus(occurrence.id, 'skipped');
    assert.equal(f.calendar.readRange(futureRange)[1].status, 'Skipped');
  });
}
test('recurrence edits/stop/delete/end boundaries refresh Calendar with the correct schedule version', async (t) => {
  const f = await initialized(); t.after(() => f.sqlite.close());
  const id = f.tasks.createTask({ ...taskDraft(), title: 'Routine', date: initialDay, recurrence: daily });
  const future = monthGridRange('2027-03-01'); f.calendar.readRange(future);
  f.tasks.editTask(id, { ...taskDraft(), title: 'Routine', date: initialDay, recurrence: { ...daily, interval: 3, endDate: '2027-03-15' } });
  const next = f.calendar.readRange(future); assert.ok(next.length > 0); assert.ok(next.every((row) => row.date <= '2027-03-15' && /Every 3 days/.test(row.secondary)));
  f.tasks.stopRepeating(id); assert.equal(f.calendar.readRange(future).length, 0);
  assert.ok(f.calendar.readRange({ from: initialDay, to: initialDay }).length, 'today is frozen');
  f.tasks.deleteTask(id); assert.equal(f.calendar.readRange(range).length, 0);
});
test('Commitments use original due dates, omit resolved rows, and support distant bounded previews without reserving future installments', async (t) => {
  const f = await initialized(); t.after(() => f.sqlite.close());
  const id = f.commitments.create({ ...commitmentDraft(null, undefined, initialDay), title: 'Rent', amount: '180', firstDueDate: '2025-08-01' });
  const old = f.calendar.readRange(monthGridRange('2025-08-01')).find((row) => row.recordId === id)!;
  assert.equal(old.date, '2025-08-01'); assert.equal(old.status, 'Overdue');
  const current = f.commitments.readRange(range).find((row) => row.occurrence.dueDate === '2026-10-01')!;
  f.commitments.skip(current.occurrence); assert.ok(!f.calendar.readRange(range).some((row) => row.date === '2026-10-01'));
  const future = monthGridRange('2027-08-01'); const items = f.calendar.readRange(future);
  assert.ok(items.length >= 1); assert.ok(items.every((item) => item.status === 'Upcoming' && item.date >= future.from && item.date <= future.to));
  assert.ok(f.db.select().from(schema.commitmentOccurrences).all().every((row) => row.dueDate <= initialDay));
  const target = f.commitments.readRange(future).find((row) => row.occurrence.dueDate === '2027-08-01')!.occurrence;
  f.commitments.pay(target, '180', initialDay); assert.ok(!f.calendar.readRange(future).some((row) => row.date === target.dueDate));
  assert.equal(f.finance.read().transactions.length, 1);
});
test('Calendar browsed future previews preserve pause/resume anchors and paused gaps', async (t) => {
  const f = await initialized(); t.after(() => f.sqlite.close());
  const id = f.commitments.create({ ...commitmentDraft(null, undefined, initialDay), title: 'Subscription', kind: 'subscription', amount: '50', firstDueDate: '2026-10-10' });
  f.calendar.readRange(monthGridRange('2027-10-01')); f.commitments.pause(id);
  assert.equal(f.calendar.readRange(range).length, 0); assert.equal(f.calendar.readRange(monthGridRange('2027-10-01')).length, 0);
  f.setDay('2026-12-04'); assert.equal(f.commitments.resumeProposal(id), '2026-12-10'); f.commitments.resume(id, '2026-12-10');
  assert.equal(f.calendar.readRange(monthGridRange('2026-11-01')).length, 0);
  assert.equal(f.calendar.readRange(monthGridRange('2026-12-01'))[0].date, '2026-12-10');
});
test('ended commitments retain original overdue obligations and no post-end dates', async (t) => {
  const f = await initialized(); t.after(() => f.sqlite.close());
  const id = f.commitments.create({ ...commitmentDraft(null, undefined, initialDay), title: 'Bill', amount: '50', firstDueDate: '2026-09-01' });
  f.calendar.readRange(monthGridRange('2027-01-01')); f.commitments.end(id);
  assert.equal(f.calendar.readRange(monthGridRange('2027-01-01')).length, 0);
  assert.equal(f.calendar.readRange({ from: '2026-09-01', to: '2026-09-01' })[0].status, 'Overdue');
  assert.equal(f.calendar.readRange({ from: '2026-10-01', to: '2026-10-01' })[0].date, '2026-10-01');
});
test('installment counts and resumed schedule/amount versions govern projected dates', async (t) => {
  const f = await initialized(); t.after(() => f.sqlite.close());
  const draft = { ...commitmentDraft(null, undefined, initialDay), title: 'Laptop', kind: 'installment' as const, amount: '100', firstDueDate: '2026-10-10', installmentCount: '2' };
  const id = f.commitments.create(draft);
  assert.equal(f.calendar.readRange(monthGridRange('2027-01-01')).length, 0);
  f.commitments.pause(id); f.commitments.resume(id, '2026-11-20');
  const updated = { ...draft, firstDueDate: '2026-11-20', amount: '120' }; f.commitments.edit(id, updated);
  const rows = f.calendar.readRange(monthGridRange('2026-12-01'));
  assert.equal(rows.length, 1); assert.equal(rows[0].date, '2026-12-20'); assert.equal(rows[0].source === 'commitment' && rows[0].amountMinor, 12000);
  for (const due of f.commitments.readRange({ from: '2026-11-01', to: '2026-12-31' })) f.commitments.skip(due.occurrence);
  assert.equal(f.commitments.read().items[0].commitment.status, 'completed'); assert.equal(f.calendar.readRange(range).length, 0);
});
test('Work partial/full receipts and date edits refresh outstanding amounts on the original expected date', async (t) => {
  const f = await initialized(); t.after(() => f.sqlite.close());
  const client = f.work.createCounterparty('Acme');
  const id = f.work.create({ ...workDraft(null, initialDay), counterpartyId: client.id, description: 'Report', compensationType: 'fixed', fixedAmount: '1000', expectedPaymentDate: '2026-10-01' });
  f.work.create({ ...workDraft(null, initialDay), counterpartyId: client.id, description: 'No date', compensationType: 'fixed', fixedAmount: '10' });
  const payment = (amount: string) => f.work.recordPayment({ counterpartyId: client.id, allocations: [{ workEntryId: id, amount }], paymentDate: initialDay, categoryId: null });
  const first = f.calendar.readRange(range); assert.equal(first.length, 1); assert.equal(first[0].status, 'Payment overdue'); assert.equal(first[0].date, '2026-10-01');
  f.work.archiveCounterparty(client.id); payment('400');
  const partial = f.calendar.readRange(range)[0]; assert.equal(partial.source === 'work' && partial.amountMinor, 60000); assert.equal(partial.title, 'Acme');
  const row = f.work.read().items.find((item) => item.entry.id === id)!;
  f.work.edit(id, { ...workDraft(row.entry, initialDay), expectedPaymentDate: '2026-11-10' });
  assert.equal(f.calendar.readRange(range).length, 0); assert.equal(f.calendar.readRange(monthGridRange('2026-11-01'))[0].status, 'Expected payment');
  payment('600'); assert.equal(f.calendar.readRange(monthGridRange('2026-11-01')).length, 0);
});
test('a combined Work payment reconciles across expected-date ranges; unrelated history is not loaded', async (t) => {
  const f = await initialized(); t.after(() => f.sqlite.close());
  const client = f.work.createCounterparty('Client');
  const make = (date: string) => f.work.create({ ...workDraft(null, initialDay), counterpartyId: client.id, description: date, compensationType: 'fixed', fixedAmount: '100', expectedPaymentDate: date });
  const a = make(initialDay); const b = make('2027-03-01');
  f.work.recordPayment({ counterpartyId: client.id, allocations: [{ workEntryId: a, amount: '40' }, { workEntryId: b, amount: '20' }], paymentDate: initialDay, categoryId: null });
  assert.deepEqual(f.work.readRange(range).map((row) => [row.entry.id, row.outstandingMinor]), [[a, 6000]]);
  const other = f.work.createCounterparty('Unrelated');
  const outside = f.work.create({ ...workDraft(null, initialDay), counterpartyId: other.id, description: 'Outside', compensationType: 'fixed', fixedAmount: '100', expectedPaymentDate: '2025-01-01' });
  const payment = f.work.recordPayment({ counterpartyId: other.id, allocations: [{ workEntryId: outside, amount: '10' }], paymentDate: initialDay, categoryId: null });
  f.db.update(schema.financeTransactions).set({ amountMinor: 1 }).where(eq(schema.financeTransactions.id, payment)).run();
  assert.equal(f.calendar.readRange(range).length, 1, 'out-of-range history is not scanned');
  assert.throws(() => f.work.readRange(monthGridRange('2025-01-01')), /does not match/);
});
test('mixed day agenda sorts timed Tasks, all-day Tasks, Commitments, and Work; empty sections and ledger transactions stay out', async (t) => {
  const f = await initialized(); t.after(() => f.sqlite.close());
  for (const [title, time] of [['Zulu', '10:00'], ['Beta', '09:00'], ['Alpha', '09:00'], ['Date only', '']]) f.tasks.createTask({ ...taskDraft(), title, time, date: initialDay });
  f.commitments.create({ ...commitmentDraft(null, undefined, initialDay), title: 'Bill', amount: '10', firstDueDate: initialDay });
  const client = f.work.createCounterparty('Client'); f.work.create({ ...workDraft(null, initialDay), counterpartyId: client.id, description: 'Work', compensationType: 'fixed', fixedAmount: '100', expectedPaymentDate: initialDay });
  f.finance.createTransaction({ ...transactionDraft(null, pickerValue(initialDay)), type: 'expense', description: 'Ordinary Expense', amount: '20' });
  const items = f.calendar.readRange(range); const sections = dayAgenda(items.reverse(), initialDay);
  assert.deepEqual(sections.map((row) => row.title), ['Tasks', 'Commitments', 'Expected payments']);
  assert.deepEqual(sections[0].data.map((row) => row.title), ['Alpha', 'Beta', 'Zulu', 'Date only']);
  assert.equal(sections[1].data[0].status, 'Due today');
  assert.deepEqual(activityMarkers(items).get(initialDay), [{ type: 'task', count: 4 }, { type: 'commitment', count: 1 }, { type: 'work', count: 1 }]);
  assert.deepEqual(dayAgenda(items, '2026-10-06'), []); assert.ok(!items.some((row) => row.title === 'Ordinary Expense'));
  for (const item of items) assert.deepEqual(sourceParams(item), { source: item.source, recordId: item.recordId, date: initialDay });
});
test('requested range includes adjacent dates and excludes dates just outside; repeated connection restart is idempotent with SQLite integrity intact', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'axis-calendar-')); const filename = join(directory, 'axis.db');
  let f = await initialized(filename);
  try {
    f.tasks.createTask({ ...taskDraft(), title: 'Adjacent', date: range.from });
    f.tasks.createTask({ ...taskDraft(), title: 'Outside', date: addDays(range.from, -1) });
    f.tasks.createTask({ ...taskDraft(), title: 'Routine', date: initialDay, recurrence: daily });
    f.commitments.create({ ...commitmentDraft(null, undefined, initialDay), title: 'Bill', amount: '10', firstDueDate: '2026-10-10' });
    const first = f.calendar.readRange(range); assert.ok(first.some((row) => row.title === 'Adjacent')); assert.ok(!first.some((row) => row.title === 'Outside'));
    const occurrenceCount = f.db.select().from(schema.taskOccurrences).all().length;
    f.sqlite.close(); f = await initialized(filename);
    assert.deepEqual(f.calendar.readRange(range), first); assert.equal(f.db.select().from(schema.taskOccurrences).all().length, occurrenceCount);
    assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []); assert.equal(f.sqlite.prepare('PRAGMA integrity_check').get()?.integrity_check, 'ok');
  } finally { f.sqlite.close(); for (const suffix of ['', '-wal', '-shm']) { try { unlinkSync(filename + suffix); } catch {} } rmdirSync(directory); }
});

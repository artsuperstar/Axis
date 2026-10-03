/// <reference types="node" />

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { bundledMigrations, database, journal } from './helpers/database';

import * as schema from '../src/database/schema';
import { seedDefaultCategories } from '../src/database/seed';
import { createTaskDataAccess } from '../src/features/tasks/data';
import { localDateString, localTimeString, taskDraft, TaskValidationError, validateTaskDraft } from '../src/features/tasks/form';
import { categoryName, groupTasks } from '../src/features/tasks/grouping';
import { addDays, dateOrdinal } from '../src/features/tasks/calendar';
import { latestRecurrence, occurrenceState, recurrenceDates, recurrencePatternSummary, recurrenceStopped, recurrenceSummary } from '../src/features/tasks/recurrence';
import type { RecurrenceDraft, TaskListItem, TaskOccurrence, TaskRecurrence } from '../src/features/tasks/types';

async function initialized(filename = ':memory:') {
  const result = database(filename);
  await migrate(result.db, bundledMigrations);
  seedDefaultCategories(result.db, 1000);
  return { ...result, access: createTaskDataAccess(result.db, randomUUID, () => 2000) };
}

test('migrations and default seeding are idempotent and preserve category identity and timestamps', async (t) => {
  const { sqlite, db, access } = await initialized();
  t.after(() => sqlite.close());
  const first = access.read().categories;
  assert.deepEqual(first.map((category) => category.name).sort(), ['Finance', 'Health', 'Personal', 'Shopping', 'Study', 'Work']);
  assert.ok(first.every((category) => category.isDefault));
  await migrate(db, bundledMigrations);
  seedDefaultCategories(db, 5000);
  assert.deepEqual(access.read().categories, first);
  assert.equal(sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()?.count, journal.entries.length);

  db.update(schema.taskCategories).set({ deletedAt: 6000, updatedAt: 6000 }).where(eq(schema.taskCategories.id, first[0].id)).run();
  seedDefaultCategories(db, 7000);
  assert.equal(access.read().categories.length, 5, 'seeding must not resurrect tombstones');
});

test('task create, edit, complete/reopen, and soft deletion persist across a connection restart', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'axis-tasks-test-'));
  const filename = join(directory, 'axis.db');
  let current = await initialized(filename);
  try {
    const id = current.access.createTask({ ...taskDraft(), title: '  Buy toothpaste  ' });
    const original = current.access.read().tasks[0];
    assert.equal(original.title, 'Buy toothpaste');
    assert.match(id, /^[0-9a-f-]{36}$/);
    assert.equal(original.priority, 'none');
    assert.equal(original.date, null);
    assert.equal(original.time, null);
    assert.equal(original.description, null);
    assert.equal(original.categoryId, null);
    assert.equal(categoryName(original, current.access.read().categories), null);
    assert.equal(original.completedAt, null);

    current.sqlite.close();
    current = await initialized(filename);
    assert.deepEqual(current.access.read().tasks[0], original);
    const category = current.access.read().categories[0];
    current.access.editTask(id, { title: 'Toothpaste and floss', description: '  Pharmacy  ', date: '2026-10-10', time: '18:30', priority: 'high', categoryId: category.id });
    const edited = current.access.read().tasks[0];
    assert.equal(edited.createdAt, original.createdAt);
    assert.ok(edited.updatedAt > original.updatedAt);
    assert.equal(edited.title, 'Toothpaste and floss');
    assert.equal(edited.description, 'Pharmacy');
    assert.equal(edited.date, '2026-10-10');
    assert.equal(edited.time, '18:30');
    assert.equal(edited.priority, 'high');
    assert.equal(edited.categoryId, category.id);
    assert.equal(categoryName(edited, current.access.read().categories), category.name);
    current.access.setCompleted(id, true);
    const completed = current.access.read().tasks[0];
    assert.ok(completed.completedAt !== null);
    assert.ok(completed.updatedAt > edited.updatedAt);
    current.access.editTask(id, { ...taskDraft(completed), description: '' });
    assert.equal(current.access.read().tasks[0].completedAt, completed.completedAt);
    current.access.setCompleted(id, false);
    assert.equal(current.access.read().tasks[0].completedAt, null);
    current.access.deleteTask(id);
    assert.equal(current.access.read().tasks.length, 0);
    const tombstone = current.db.select().from(schema.tasks).where(eq(schema.tasks.id, id)).get();
    assert.ok(tombstone);
    assert.equal(typeof tombstone.deletedAt, 'number');
    assert.throws(() => current.access.editTask(id, taskDraft(original)), TaskValidationError);
    current.sqlite.close();
    current = await initialized(filename);
    assert.equal(current.access.read().tasks.length, 0);
    assert.equal(current.db.select().from(schema.tasks).all().length, 1);
  } finally {
    current.sqlite.close();
    unlinkSync(filename);
    rmdirSync(directory);
  }
});

test('custom-category deletion preserves task references and allows a new category with the same name', async (t) => {
  const { sqlite, db, access } = await initialized();
  t.after(() => sqlite.close());
  const category = access.createCategory('  Pet   care  ');
  assert.equal(category.name, 'Pet care');
  assert.equal(category.isDefault, false);
  assert.throws(() => access.createCategory('pet care'), /already exists/);
  const id = access.createTask({ ...taskDraft(), title: 'Buy food', categoryId: category.id });
  access.deleteCategory(category.id);
  const snapshot = access.read();
  const task = snapshot.tasks.find((item) => item.id === id)!;
  assert.equal(task.categoryId, category.id);
  assert.equal(categoryName(task, snapshot.categories), null);
  const deletedCategory = db.select().from(schema.taskCategories).where(eq(schema.taskCategories.id, category.id)).get();
  assert.ok(deletedCategory);
  assert.equal(typeof deletedCategory.deletedAt, 'number');
  assert.equal(categoryName(task, [deletedCategory]), null);
  assert.throws(() => access.createTask({ ...taskDraft(), title: 'Old category', categoryId: category.id }), /no longer available/);
  const replacement = access.createCategory('Pet care');
  assert.notEqual(replacement.id, category.id);
  assert.equal(categoryName(task, access.read().categories), null);
  assert.throws(() => access.deleteCategory(snapshot.categories.find((item) => item.isDefault)!.id), /cannot be deleted/);
  assert.throws(() => sqlite.prepare('DELETE FROM task_categories WHERE id = ?').run(category.id), /FOREIGN KEY/);
});

test('validation enforces title, civil dates, times, and the four priorities', () => {
  for (const change of [
    { title: '  ' },
    { date: '2026-02-30' },
    { date: '1900-02-29' },
    { date: '2026-13-01' },
    { date: '2026-1-01' },
    { date: '0000-01-01' },
    { time: '18:30' },
    { date: '2026-10-10', time: '24:00' },
    { date: '2026-10-10', time: '12:60' },
  ]) {
    assert.throws(() => validateTaskDraft({ ...taskDraft(), title: 'Valid title', ...change }), TaskValidationError);
  }
  assert.throws(() => validateTaskDraft({ ...taskDraft(), title: 'Task', priority: 'urgent' as never }), TaskValidationError);
  assert.equal(validateTaskDraft({ ...taskDraft(), title: 'Leap day', date: '2028-02-29' }).time, null);
  assert.equal(validateTaskDraft({ ...taskDraft(), title: 'Leap century', date: '2000-02-29' }).date, '2000-02-29');
  for (const priority of ['none', 'low', 'medium', 'high'] as const) {
    assert.equal(validateTaskDraft({ ...taskDraft(), title: 'Task', priority }).priority, priority);
  }
  const local = new Date(2026, 9, 10, 18, 30);
  assert.equal(localDateString(local), '2026-10-10');
  assert.equal(localTimeString(local), '18:30');
});

test('SQLite constraints also reject invalid records and missing category references', async (t) => {
  const { sqlite } = await initialized();
  t.after(() => sqlite.close());
  const insert = sqlite.prepare('INSERT INTO tasks (id, title, date, time, priority, category_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, 1)');
  assert.throws(() => insert.run(randomUUID(), ' ', null, null, 'none', null), /CHECK/);
  assert.throws(() => insert.run(randomUUID(), 'Task', null, '09:00', 'none', null), /CHECK/);
  assert.throws(() => insert.run(randomUUID(), 'Task', '2026-02-30', null, 'none', null), /CHECK/);
  assert.throws(() => insert.run(randomUUID(), 'Task', '2026-10-10', '24:00', 'none', null), /CHECK/);
  assert.throws(() => insert.run(randomUUID(), 'Task', null, null, 'urgent', null), /CHECK/);
  assert.throws(() => insert.run(randomUUID(), 'Task', null, null, 'none', 'missing'), /FOREIGN KEY/);
});

test('all incomplete dates remain visible, completed tasks group separately, and tombstones stay hidden', async (t) => {
  const { sqlite, access } = await initialized();
  t.after(() => sqlite.close());
  for (const [title, date] of [['Earlier', '2026-10-01'], ['Today', '2026-10-02'], ['Upcoming', '2026-10-03'], ['No date', '']] as const) {
    access.createTask({ ...taskDraft(), title, date });
  }
  const done = access.createTask({ ...taskDraft(), title: 'Completed', date: '2026-10-01' });
  access.setCompleted(done, true);
  const deleted = access.createTask({ ...taskDraft(), title: 'Deleted' });
  access.deleteTask(deleted);
  const sections = groupTasks(access.read().items, '2026-10-02');
  assert.deepEqual(sections.map((section) => section.title), ['Earlier', 'Today', 'Upcoming', 'No date', 'Completed']);
  assert.ok(sections.every((section) => section.data.length === 1));
});

test('a failed migration rolls back schema changes and can be retried safely', async (t) => {
  const { sqlite, db } = database();
  t.after(() => sqlite.close());
  const broken = { ...bundledMigrations, migrations: { ...bundledMigrations.migrations, m0000: `${bundledMigrations.migrations.m0000}\n--> statement-breakpoint\nINVALID SQL;` } };
  await assert.rejects(migrate(db, broken));
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM sqlite_master WHERE name IN ('tasks', 'task_categories')").get()?.count, 0);
  await migrate(db, bundledMigrations);
  seedDefaultCategories(db);
  assert.equal(db.select().from(schema.taskCategories).all().length, 6);
});

function rule(overrides: Partial<TaskRecurrence> = {}): TaskRecurrence {
  return { id: randomUUID(), taskId: randomUUID(), frequency: 'daily', interval: 1, weekdayMask: null,
    monthDay: null, month: null, startDate: '2026-01-01', scheduledTime: null, endDate: null,
    effectiveFrom: '2026-01-01', effectiveUntil: null, createdAt: 1, updatedAt: 1, deletedAt: null, ...overrides };
}

function occurrence(overrides: Partial<TaskOccurrence> = {}): TaskOccurrence {
  return { id: randomUUID(), taskId: randomUUID(), recurrenceId: randomUUID(), scheduledDate: '2026-10-02',
    scheduledTime: null, status: 'pending', completedAt: null, createdAt: 1, updatedAt: 1, deletedAt: null, ...overrides };
}

function repeatingDraft(overrides: Partial<RecurrenceDraft> = {}) {
  return { ...taskDraft(), title: 'Workout', date: '2026-09-28', recurrence: {
    frequency: 'daily' as const, interval: 1, weekdayMask: 1, monthDay: 28, month: 9, endDate: '', ...overrides,
  } };
}

async function recurringDatabase(filename = ':memory:') {
  const initial = await initialized(filename);
  let timestamp = new Date(2026, 9, 2, 12).getTime();
  return { ...initial, access: createTaskDataAccess(initial.db, randomUUID, () => timestamp), setNow: (date: Date) => { timestamp = date.getTime(); } };
}

function upcomingItems(items: TaskListItem[], today = '2026-10-02') {
  return groupTasks(items, today).find((section) => section.title === 'Upcoming')?.data ?? [];
}

test('daily recurrence contributes only its next occurrence to Upcoming without changing stored rows', async (t) => {
  const { sqlite, db, access } = await recurringDatabase();
  t.after(() => sqlite.close());
  const id = access.createTask(repeatingDraft());
  const snapshot = access.read();
  const stored = db.select().from(schema.taskOccurrences).all();
  const items = [...snapshot.items];
  assert.equal(snapshot.occurrences.filter((item) => item.scheduledDate > '2026-10-02').length, 30);
  const upcoming = upcomingItems(snapshot.items);
  assert.equal(upcoming.length, 1);
  assert.equal(upcoming[0].task.id, id);
  assert.equal(upcoming[0].occurrence!.scheduledDate, '2026-10-03');
  assert.deepEqual(snapshot.items, items);
  assert.deepEqual(db.select().from(schema.taskOccurrences).all(), stored);
});

test('weekly recurrence contributes only its next selected weekday to Upcoming', async (t) => {
  const { sqlite, access } = await recurringDatabase();
  t.after(() => sqlite.close());
  access.createTask(repeatingDraft({ frequency: 'weekly', weekdayMask: 1 | 4 | 16 }));
  const snapshot = access.read();
  assert.ok(snapshot.occurrences.filter((item) => item.scheduledDate > '2026-10-02').length > 1);
  assert.deepEqual(upcomingItems(snapshot.items).map((item) => item.occurrence!.scheduledDate), ['2026-10-05']);
});

test('different recurring tasks with the same title each contribute their earliest Upcoming occurrence', async (t) => {
  const { sqlite, access } = await recurringDatabase();
  t.after(() => sqlite.close());
  const daily = access.createTask(repeatingDraft());
  const weekly = access.createTask(repeatingDraft({ frequency: 'weekly', weekdayMask: 1 | 4 | 16 }));
  // Reverse query order so selection must sort before collapsing each series.
  const upcoming = upcomingItems(access.read().items.reverse());
  assert.deepEqual(upcoming.map((item) => [item.task.id, item.occurrence!.scheduledDate]), [
    [daily, '2026-10-03'], [weekly, '2026-10-05'],
  ]);
});

for (const status of ['completed', 'skipped'] as const) {
  test(`Upcoming advances after ${status === 'completed' ? 'completion' : 'Skip'} and reopening restores the earlier pending occurrence`, async (t) => {
    const { sqlite, access } = await recurringDatabase();
    t.after(() => sqlite.close());
    const id = access.createTask(repeatingDraft());
    const first = upcomingItems(access.read().items)[0].occurrence!;
    access.setOccurrenceStatus(first.id, status);
    const snapshot = access.read();
    const next = upcomingItems(snapshot.items);
    assert.equal(next.length, 1);
    assert.equal(next[0].occurrence!.scheduledDate, '2026-10-04');
    assert.equal(next[0].occurrence!.status, 'pending');
    const resolved = groupTasks(snapshot.items, '2026-10-02').find((section) => section.title === (status === 'completed' ? 'Completed' : 'Skipped'))!;
    assert.equal(resolved.data[0].occurrence!.id, first.id);
    assert.equal(access.readHistory(id).occurrences.find((item) => item.id === first.id)!.status, status);
    access.setOccurrenceStatus(first.id, 'pending');
    assert.equal(upcomingItems(access.read().items)[0].occurrence!.id, first.id);
  });
}

test('one-time Upcoming tasks with matching titles and dates remain separate alongside recurring tasks', async (t) => {
  const { sqlite, access } = await recurringDatabase();
  t.after(() => sqlite.close());
  const series = access.createTask(repeatingDraft());
  const oneTime = ['2026-10-03', '2026-10-03', '2026-12-01'].map((date) =>
    access.createTask({ ...taskDraft(), title: 'Workout', date }));
  const upcoming = upcomingItems(access.read().items);
  assert.equal(upcoming.length, 4);
  assert.equal(upcoming.filter((item) => item.task.id === series).length, 1);
  assert.deepEqual(upcoming.filter((item) => item.occurrence === null).map((item) => item.task.id).sort(), oneTime.sort());
});

test('calendar passage advances Upcoming while retaining all Earlier missed and Today occurrences', async (t) => {
  const { sqlite, access, setNow } = await recurringDatabase();
  t.after(() => sqlite.close());
  access.createTask(repeatingDraft());
  const first = upcomingItems(access.read().items)[0].occurrence!;
  setNow(new Date(2026, 9, 4, 12));
  const sections = groupTasks(access.read().items, '2026-10-04');
  const earlier = sections.find((section) => section.title === 'Earlier')!.data;
  assert.equal(earlier.length, 6);
  assert.ok(earlier.some((item) => item.occurrence!.id === first.id));
  assert.ok(earlier.every((item) => occurrenceState(item.occurrence!, new Date(2026, 9, 4, 12)) === 'missed'));
  assert.deepEqual(sections.find((section) => section.title === 'Today')!.data.map((item) => item.occurrence!.scheduledDate), ['2026-10-04']);
  assert.deepEqual(sections.find((section) => section.title === 'Upcoming')!.data.map((item) => item.occurrence!.scheduledDate), ['2026-10-05']);
});

test('ended recurrence has no Upcoming rows and retains its pending past occurrences', async (t) => {
  const { sqlite, access, setNow } = await recurringDatabase();
  t.after(() => sqlite.close());
  access.createTask(repeatingDraft({ endDate: '2026-10-04' }));
  assert.equal(upcomingItems(access.read().items)[0].occurrence!.scheduledDate, '2026-10-03');
  setNow(new Date(2026, 9, 5, 12));
  const snapshot = access.read();
  assert.equal(upcomingItems(snapshot.items, '2026-10-05').length, 0);
  assert.equal(groupTasks(snapshot.items, '2026-10-05').find((section) => section.title === 'Earlier')!.data.length, 7);
  assert.ok(snapshot.occurrences.every((item) => item.scheduledDate <= '2026-10-04'));
});

test('stopping recurrence removes Upcoming rows and preserves Earlier, Today and resolved future history', async (t) => {
  const { sqlite, access } = await recurringDatabase();
  t.after(() => sqlite.close());
  const id = access.createTask(repeatingDraft());
  const snapshot = access.read();
  const first = upcomingItems(snapshot.items)[0].occurrence!;
  access.setOccurrenceStatus(first.id, 'completed');
  access.stopRepeating(id);
  const stopped = access.read();
  assert.equal(upcomingItems(stopped.items).length, 0);
  assert.deepEqual(stopped.items.map((item) => item.occurrence), snapshot.occurrences.filter((item) => item.scheduledDate <= '2026-10-02'));
  assert.equal(access.readHistory(id).occurrences.find((item) => item.id === first.id)!.status, 'completed');
});

test('schedule edits immediately select the new next occurrence and summary from the latest retained rule', async (t) => {
  const { sqlite, access } = await recurringDatabase();
  t.after(() => sqlite.close());
  const id = access.createTask(repeatingDraft({ frequency: 'weekly', weekdayMask: 1 | 4 | 16 }));
  const original = access.read();
  const first = upcomingItems(original.items)[0].occurrence!;
  assert.equal(first.scheduledDate, '2026-10-05');
  assert.equal(recurrencePatternSummary(latestRecurrence(original.recurrences, id)!), 'Every Mon, Wed & Fri');
  const past = original.occurrences.filter((item) => item.scheduledDate <= '2026-10-02');
  access.editTask(id, repeatingDraft({ frequency: 'weekly', weekdayMask: 2 | 8 }));
  let snapshot = access.read();
  let active = latestRecurrence(snapshot.recurrences, id)!;
  let next = upcomingItems(snapshot.items);
  assert.equal(next.length, 1);
  assert.equal(next[0].occurrence!.scheduledDate, '2026-10-06');
  assert.equal(next[0].occurrence!.recurrenceId, active.id);
  assert.equal(recurrencePatternSummary(active), 'Every Tue & Thu');
  assert.deepEqual(snapshot.occurrences.filter((item) => item.scheduledDate <= '2026-10-02'), past);
  // A second edit cancels the earlier future version; the summary must not pick it.
  access.editTask(id, repeatingDraft({ interval: 3 }));
  snapshot = access.read();
  active = latestRecurrence(snapshot.recurrences, id)!;
  next = upcomingItems(snapshot.items);
  assert.equal(next.length, 1);
  assert.equal(next[0].occurrence!.scheduledDate, '2026-10-04');
  assert.equal(next[0].occurrence!.recurrenceId, active.id);
  assert.equal(recurrencePatternSummary(active), 'Every 3 days');
  assert.equal(active.deletedAt, null);
  assert.equal(active.effectiveUntil, null);
});

test('shared recurrence summaries use compact daily, weekly, monthly and yearly wording', () => {
  const cases: [Partial<TaskRecurrence>, string][] = [
    [{}, 'Every day'],
    [{ interval: 3 }, 'Every 3 days'],
    [{ frequency: 'weekly', weekdayMask: 1 }, 'Every Monday'],
    [{ frequency: 'weekly', weekdayMask: 1 | 4 | 16 }, 'Every Mon, Wed & Fri'],
    [{ frequency: 'weekly', weekdayMask: 2 | 8, interval: 2 }, 'Every 2 weeks on Tue & Thu'],
    [{ frequency: 'monthly', monthDay: 10 }, 'Monthly on day 10'],
    [{ frequency: 'monthly', monthDay: 15, interval: 3 }, 'Every 3 months on day 15'],
    [{ frequency: 'yearly', month: 10, monthDay: 12 }, 'Yearly on Oct 12'],
  ];
  for (const [changes, expected] of cases) {
    assert.equal(recurrencePatternSummary(rule(changes)), expected);
    assert.equal(recurrenceSummary(rule(changes)), expected);
  }
  const ended = rule({ endDate: '2026-10-04' });
  assert.equal(recurrencePatternSummary(ended), 'Every day');
  assert.equal(recurrenceSummary(ended), 'Every day · Ends 2026-10-04');
  assert.equal(recurrenceSummary(rule({ effectiveUntil: '2026-10-03' })), 'Every day · Stopped');
});

test('daily recurrence uses calendar days', () => {
  assert.deepEqual(recurrenceDates(rule(), '2026-01-01', '2026-01-04'), ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04']);
});

test('every-N-days remains anchored to the start date across month boundaries', () => {
  assert.deepEqual(recurrenceDates(rule({ startDate: '2026-01-30', interval: 3 }), '2026-01-30', '2026-02-10'), ['2026-01-30', '2026-02-02', '2026-02-05', '2026-02-08']);
});

test('weekly recurrence starts no earlier than the start date', () => {
  assert.deepEqual(recurrenceDates(rule({ frequency: 'weekly', weekdayMask: 1, startDate: '2026-09-30' }), '2026-09-28', '2026-10-12'), ['2026-10-05', '2026-10-12']);
});

test('weekly recurrence supports multiple selected weekdays', () => {
  assert.deepEqual(recurrenceDates(rule({ frequency: 'weekly', weekdayMask: 1 | 4 | 16, startDate: '2026-09-28' }), '2026-09-28', '2026-10-09'), ['2026-09-28', '2026-09-30', '2026-10-02', '2026-10-05', '2026-10-07', '2026-10-09']);
});

test('every-N-weeks uses Monday-based weeks containing the start date', () => {
  assert.deepEqual(recurrenceDates(rule({ frequency: 'weekly', weekdayMask: 2 | 8, interval: 2, startDate: '2026-09-30' }), '2026-09-30', '2026-10-31'), ['2026-10-01', '2026-10-13', '2026-10-15', '2026-10-27', '2026-10-29']);
});

test('monthly recurrence supports a selected calendar day', () => {
  assert.deepEqual(recurrenceDates(rule({ frequency: 'monthly', monthDay: 10 }), '2026-01-01', '2026-04-30'), ['2026-01-10', '2026-02-10', '2026-03-10', '2026-04-10']);
});

test('monthly day 31 clamps shorter months without changing the scheduled day', () => {
  assert.deepEqual(recurrenceDates(rule({ frequency: 'monthly', monthDay: 31 }), '2026-01-01', '2026-04-30'), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
});

test('monthly recurrence handles leap years and Gregorian century rules', () => {
  assert.deepEqual(recurrenceDates(rule({ frequency: 'monthly', monthDay: 31, startDate: '2000-01-01', effectiveFrom: '2000-01-01' }), '2000-02-01', '2000-02-29'), ['2000-02-29']);
  assert.deepEqual(recurrenceDates(rule({ frequency: 'monthly', monthDay: 31, startDate: '1900-01-01', effectiveFrom: '1900-01-01' }), '1900-02-01', '1900-02-28'), ['1900-02-28']);
});

test('every-N-months remains anchored to the start month', () => {
  assert.deepEqual(recurrenceDates(rule({ frequency: 'monthly', monthDay: 31, interval: 3 }), '2026-01-01', '2026-12-31'), ['2026-01-31', '2026-04-30', '2026-07-31', '2026-10-31']);
});

test('yearly recurrence supports a selected month and day', () => {
  assert.deepEqual(recurrenceDates(rule({ frequency: 'yearly', month: 10, monthDay: 12 }), '2026-01-01', '2028-12-31'), ['2026-10-12', '2027-10-12', '2028-10-12']);
});

test('February 29 yearly recurrence uses February 28 in non-leap years', () => {
  assert.deepEqual(recurrenceDates(rule({ frequency: 'yearly', month: 2, monthDay: 29 }), '2026-01-01', '2028-12-31'), ['2026-02-28', '2027-02-28', '2028-02-29']);
});

test('end dates are inclusive and version boundaries are exclusive', () => {
  assert.deepEqual(recurrenceDates(rule({ endDate: '2026-01-03' }), '2026-01-01', '2026-01-10'), ['2026-01-01', '2026-01-02', '2026-01-03']);
  assert.deepEqual(recurrenceDates(rule({ effectiveFrom: '2026-01-02', effectiveUntil: '2026-01-04' }), '2026-01-01', '2026-01-10'), ['2026-01-02', '2026-01-03']);
  assert.deepEqual(recurrenceDates(rule({ deletedAt: 2 }), '2026-01-01', '2026-01-10'), []);
});

test('recurrence validation rejects missing starts, invalid patterns, intervals, weekdays, days and ends', () => {
  assert.throws(() => validateTaskDraft({ ...repeatingDraft(), date: '' }), /start date/);
  for (const recurrence of [
    { interval: 0 }, { interval: 1.5 }, { interval: NaN }, { interval: Number.MAX_SAFE_INTEGER + 1 },
    { frequency: 'weekly' as const, weekdayMask: 0 }, { frequency: 'weekly' as const, weekdayMask: 128 },
    { frequency: 'monthly' as const, monthDay: 32 }, { frequency: 'monthly' as const, monthDay: 0 },
    { frequency: 'yearly' as const, month: 2, monthDay: 30 }, { frequency: 'yearly' as const, month: 13 },
    { frequency: 'yearly' as const, interval: 2 }, { endDate: '2026-02-30' }, { endDate: '2026-09-27' },
  ]) assert.throws(() => validateTaskDraft(repeatingDraft(recurrence)), TaskValidationError);
  assert.doesNotThrow(() => validateTaskDraft(repeatingDraft({ frequency: 'yearly', month: 2, monthDay: 29 })));
});

test('missed is derived at the local time boundary and after a date-only day ends', () => {
  const timed = occurrence({ scheduledTime: '18:30' });
  assert.equal(occurrenceState(timed, new Date(2026, 9, 2, 18, 29)), 'today');
  assert.equal(occurrenceState(timed, new Date(2026, 9, 2, 18, 30)), 'today');
  assert.equal(occurrenceState(timed, new Date(2026, 9, 2, 18, 30, 1)), 'missed');
  assert.equal(occurrenceState(occurrence(), new Date(2026, 9, 2, 23, 59, 59)), 'today');
  assert.equal(occurrenceState(occurrence(), new Date(2026, 9, 3)), 'missed');
  assert.equal(occurrenceState(occurrence(), new Date(2026, 9, 1)), 'upcoming');
  assert.equal(occurrenceState(occurrence({ status: 'skipped' }), new Date(2026, 9, 3)), 'skipped');
  assert.equal(occurrenceState(occurrence({ status: 'completed', completedAt: 1 }), new Date(2026, 9, 3)), 'completed');
});

test('calendar arithmetic and recurrence preserve local days across DST and time-zone changes', () => {
  const originalZone = process.env.TZ;
  try {
    const scheduled = rule({ startDate: '2026-03-07', interval: 1 });
    for (const zone of ['America/New_York', 'America/Sao_Paulo', 'Asia/Tokyo']) {
      process.env.TZ = zone;
      assert.deepEqual(recurrenceDates(scheduled, '2026-03-07', '2026-03-10'), ['2026-03-07', '2026-03-08', '2026-03-09', '2026-03-10']);
      assert.equal(localDateString(new Date(2026, 2, 8, 0, 30)), '2026-03-08');
      assert.equal(dateOrdinal('2026-03-09') - dateOrdinal('2026-03-08'), 1);
      assert.equal(addDays('2026-03-08', 1), '2026-03-09');
    }
    process.env.TZ = 'America/New_York';
    assert.equal(occurrenceState(occurrence({ scheduledDate: '2026-03-08', scheduledTime: '02:30' }), new Date(2026, 2, 8, 3, 1)), 'missed');
    assert.equal(addDays('0099-12-31', 1), '0100-01-01');
  } finally {
    if (originalZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalZone;
  }
});

test('occurrence materialization is bounded, UUID-based and idempotent across connection restarts', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'axis-recurrence-test-'));
  const filename = join(directory, 'axis.db');
  let current = await recurringDatabase(filename);
  try {
    const id = current.access.createTask({ ...repeatingDraft(), date: '2020-01-01' });
    const first = current.access.read().occurrences;
    assert.equal(first.length, 61);
    assert.ok(first.every((item) => item.taskId === id && /^[0-9a-f-]{36}$/.test(item.id)));
    assert.equal(first[0].scheduledDate, '2026-09-02');
    assert.equal(first.at(-1)!.scheduledDate, '2026-11-01');
    assert.deepEqual(current.access.read().occurrences, first);
    current.sqlite.close();
    current = await recurringDatabase(filename);
    assert.deepEqual(current.access.read().occurrences, first);
    assert.throws(() => current.db.insert(schema.taskOccurrences).values({ ...first[0], id: randomUUID() }).run(), /UNIQUE/);
    assert.equal(current.access.read().items.filter((item) => item.key === id).length, 0, 'parent series is not a separate list task');
  } finally {
    current.sqlite.close();
    unlinkSync(filename);
    rmdirSync(directory);
  }
});

test('completion, reopening and skip apply to one occurrence and never shift future scheduling', async (t) => {
  const { sqlite, db, access } = await recurringDatabase();
  t.after(() => sqlite.close());
  const id = access.createTask({ ...repeatingDraft(), time: '09:00' });
  const snapshot = access.read();
  const earlier = snapshot.occurrences.find((item) => item.scheduledDate === '2026-09-30')!;
  const future = snapshot.occurrences.filter((item) => item.scheduledDate > '2026-10-02');
  assert.equal(occurrenceState(earlier, new Date(2026, 9, 2, 12)), 'missed');
  assert.equal(db.select().from(schema.taskOccurrences).where(eq(schema.taskOccurrences.id, earlier.id)).get()!.status, 'pending');
  const completed = access.setOccurrenceStatus(earlier.id, 'completed');
  assert.ok(completed.completedAt !== null);
  assert.ok(completed.updatedAt > earlier.updatedAt);
  assert.equal(access.read().tasks.find((task) => task.id === id)!.completedAt, null);
  const reopened = access.setOccurrenceStatus(earlier.id, 'pending');
  assert.equal(reopened.completedAt, null);
  assert.equal(occurrenceState(reopened, new Date(2026, 9, 2, 12)), 'missed');
  const skipped = access.setOccurrenceStatus(earlier.id, 'skipped');
  assert.equal(skipped.completedAt, null);
  assert.equal(occurrenceState(skipped, new Date(2026, 9, 2, 12)), 'skipped');
  assert.equal(access.setOccurrenceStatus(earlier.id, 'pending').status, 'pending');
  assert.deepEqual(access.read().occurrences.filter((item) => item.scheduledDate > '2026-10-02'), future);
  assert.throws(() => access.setCompleted(id, true), /individual occurrence/);
  assert.throws(() => access.setOccurrenceStatus(earlier.id, 'missed' as never), TaskValidationError);
});

test('recurrence edits preserve past rows, replace obsolete future rows and retain early outcomes in history', async (t) => {
  const { sqlite, db, access } = await recurringDatabase();
  t.after(() => sqlite.close());
  const id = access.createTask(repeatingDraft({ frequency: 'weekly', weekdayMask: 1 | 4 | 16 }));
  const first = access.read();
  for (const date of ['2026-09-28', '2026-09-30', '2026-10-02']) {
    access.setOccurrenceStatus(first.occurrences.find((item) => item.scheduledDate === date)!.id, date === '2026-10-02' ? 'skipped' : 'completed');
  }
  const early = access.setOccurrenceStatus(first.occurrences.find((item) => item.scheduledDate === '2026-10-05')!.id, 'completed');
  const past = access.read().occurrences.filter((item) => item.scheduledDate <= '2026-10-02');
  access.editTask(id, { ...repeatingDraft({ frequency: 'weekly', weekdayMask: 2 | 8 }), title: 'Upper Body Workout' });
  const second = access.read();
  assert.deepEqual(second.occurrences.filter((item) => item.scheduledDate <= '2026-10-02'), past);
  assert.deepEqual(second.occurrences.filter((item) => item.scheduledDate > '2026-10-02').slice(0, 2).map((item) => item.scheduledDate), ['2026-10-06', '2026-10-08']);
  assert.ok(!second.occurrences.some((item) => item.scheduledDate === '2026-10-05'));
  assert.equal(second.items.find((item) => item.occurrence?.id === past[0].id)!.task.title, 'Upper Body Workout');
  const archived = access.readHistory(id).occurrences.find((item) => item.id === early.id)!;
  assert.equal(archived.status, 'completed');
  assert.equal(archived.completedAt, early.completedAt);
  assert.notEqual(archived.deletedAt, null);
  assert.throws(() => access.setOccurrenceStatus(early.id, 'pending'), /no longer available/);
  const ruleCount = second.recurrences.length;
  const parent = second.tasks.find((item) => item.id === id)!;
  access.editTask(id, { ...taskDraft(parent, latestRecurrence(second.recurrences, id)), description: 'New description', priority: 'high' });
  assert.equal(access.read().recurrences.length, ruleCount, 'ordinary edits do not create schedule versions');
  assert.deepEqual(db.select().from(schema.taskOccurrences).where(eq(schema.taskOccurrences.id, past[0].id)).get(), past[0]);
});

test('multiple schedule edits on the same day do not leave competing future versions', async (t) => {
  const { sqlite, access } = await recurringDatabase();
  t.after(() => sqlite.close());
  const id = access.createTask(repeatingDraft());
  access.read();
  access.editTask(id, repeatingDraft({ frequency: 'weekly', weekdayMask: 2 }));
  access.read();
  access.editTask(id, repeatingDraft({ frequency: 'weekly', weekdayMask: 8 }));
  const snapshot = access.read();
  assert.ok(snapshot.occurrences.filter((item) => item.scheduledDate > '2026-10-02').every((item) => new Date(`${item.scheduledDate}T12:00:00`).getDay() === 4));
  assert.equal(snapshot.recurrences.filter((item) => item.deletedAt === null && item.effectiveUntil === null).length, 1);
  assert.deepEqual(access.read().occurrences, snapshot.occurrences);
});

test('time changes update future scheduling while preserving past scheduled times', async (t) => {
  const { sqlite, access } = await recurringDatabase();
  t.after(() => sqlite.close());
  const id = access.createTask({ ...repeatingDraft(), time: '09:00' });
  const past = access.read().occurrences.filter((item) => item.scheduledDate <= '2026-10-02');
  access.editTask(id, { ...repeatingDraft(), time: '18:30' });
  const snapshot = access.read();
  assert.deepEqual(snapshot.occurrences.filter((item) => item.scheduledDate <= '2026-10-02'), past);
  assert.ok(snapshot.occurrences.filter((item) => item.scheduledDate > '2026-10-02').every((item) => item.scheduledTime === '18:30'));
});

test('history materializes older months on demand using their original schedule versions', async (t) => {
  const { sqlite, db, access } = await recurringDatabase();
  t.after(() => sqlite.close());
  const id = access.createTask({ ...repeatingDraft({ frequency: 'weekly', weekdayMask: 1 | 4 | 16 }), date: '2026-06-01' });
  access.read();
  assert.ok(!db.select().from(schema.taskOccurrences).all().some((item) => item.scheduledDate < '2026-09-02'));
  access.editTask(id, { ...repeatingDraft({ frequency: 'weekly', weekdayMask: 2 | 8 }), date: '2026-06-01' });
  let page = access.readHistory(id);
  const history = [...page.occurrences];
  let pages = 1;
  while (page.nextBefore) {
    assert.ok(pages++ < 10, 'history pagination must terminate');
    page = access.readHistory(id, page.nextBefore);
    history.push(...page.occurrences);
  }
  assert.ok(history.some((item) => item.scheduledDate === '2026-06-01'));
  assert.ok(history.every((item) => item.scheduledDate <= '2026-10-02'));
  assert.equal(new Set(history.map((item) => item.id)).size, history.length);
  assert.ok(history.every((item) => [1, 3, 5].includes(new Date(`${item.scheduledDate}T12:00:00`).getDay())));
});

test('stopping recurrence keeps the task and history, freezes today, and removes future scheduling', async (t) => {
  const { sqlite, access } = await recurringDatabase();
  t.after(() => sqlite.close());
  const id = access.createTask(repeatingDraft());
  const past = access.read().occurrences.filter((item) => item.scheduledDate <= '2026-10-02');
  access.stopRepeating(id);
  const snapshot = access.read();
  assert.equal(snapshot.tasks.find((task) => task.id === id)!.deletedAt, null);
  assert.deepEqual(snapshot.occurrences, past);
  assert.ok(recurrenceStopped(latestRecurrence(snapshot.recurrences, id)!));
  assert.ok(snapshot.items.every((item) => item.occurrence !== null));
  assert.deepEqual(access.read().occurrences, past);
  assert.ok(access.readHistory(id).occurrences.length);
});

test('future-start series remain identifiable after stopping and can resume without a duplicate parent task', async (t) => {
  const { sqlite, access } = await recurringDatabase();
  t.after(() => sqlite.close());
  const id = access.createTask({ ...repeatingDraft(), date: '2026-12-01' });
  assert.equal(access.read().items.length, 0);
  access.stopRepeating(id);
  assert.equal(access.read().items.length, 0);
  assert.equal(access.read().tasks.length, 1);
  assert.equal(access.readHistory(id).nextBefore, null);
  access.editTask(id, repeatingDraft({ interval: 3 }));
  assert.ok(access.read().occurrences.every((item) => item.scheduledDate >= '2026-10-03'));
  assert.ok(access.read().occurrences.length);
});

test('newly enabled recurrence uses future occurrences without parent-series completion', async (t) => {
  const { sqlite, access } = await recurringDatabase();
  t.after(() => sqlite.close());
  const id = access.createTask({ ...taskDraft(), title: 'Workout', date: '2026-09-01' });
  access.setCompleted(id, true);
  access.editTask(id, repeatingDraft());
  const snapshot = access.read();
  assert.equal(snapshot.tasks[0].completedAt, null);
  assert.ok(snapshot.occurrences.every((item) => item.scheduledDate >= '2026-10-02'));
});

test('occurrence grouping uses scheduled dates, completed and skipped outcomes, without the parent date', async (t) => {
  const { sqlite, access } = await recurringDatabase();
  t.after(() => sqlite.close());
  access.createTask(repeatingDraft());
  let snapshot = access.read();
  access.setOccurrenceStatus(snapshot.occurrences[0].id, 'completed');
  access.setOccurrenceStatus(snapshot.occurrences[1].id, 'skipped');
  snapshot = access.read();
  const sections = groupTasks(snapshot.items, '2026-10-02');
  assert.deepEqual(sections.map((item) => item.title), ['Earlier', 'Today', 'Upcoming', 'Completed', 'Skipped']);
  assert.equal(sections.find((item) => item.title === 'Today')!.data[0].occurrence!.scheduledDate, '2026-10-02');
});

test('soft-deleting a recurring task hides occurrences and keeps their stored history', async (t) => {
  const { sqlite, db, access } = await recurringDatabase();
  t.after(() => sqlite.close());
  const id = access.createTask(repeatingDraft());
  const rows = access.read().occurrences;
  access.deleteTask(id);
  assert.equal(access.read().items.length, 0);
  assert.equal(db.select().from(schema.taskOccurrences).all().length, rows.length);
  assert.throws(() => access.setOccurrenceStatus(rows[0].id, 'completed'), /no longer available/);
});

test('Stage 3 rows and category references survive the additive Stage 4 migration unchanged', async (t) => {
  const { sqlite, db } = database();
  t.after(() => sqlite.close());
  const stage3 = { journal: { ...journal, entries: journal.entries.slice(0, 1) }, migrations: { m0000: bundledMigrations.migrations.m0000 } };
  await migrate(db, stage3);
  seedDefaultCategories(db, 1000);
  const category = db.select().from(schema.taskCategories).get()!;
  const row = { id: randomUUID(), title: 'Existing task', description: 'Preserve me', date: '2026-10-10', time: '18:30',
    priority: 'high' as const, categoryId: category.id, completedAt: 1500, createdAt: 1000, updatedAt: 1500, deletedAt: null };
  db.insert(schema.tasks).values(row).run();
  await migrate(db, bundledMigrations);
  assert.deepEqual(db.select().from(schema.tasks).get(), row);
  assert.deepEqual(db.select().from(schema.taskCategories).get(), category);
  assert.equal(db.select().from(schema.taskRecurrences).all().length, 0);
  assert.equal(db.select().from(schema.taskOccurrences).all().length, 0);
  const access = createTaskDataAccess(db, randomUUID, () => 2000);
  access.setCompleted(row.id, false);
  access.editTask(row.id, { ...taskDraft(row), title: 'Edited after migration' });
  assert.equal(access.read().items[0].task.title, 'Edited after migration');
});

test('a failing Stage 4 migration rolls back new tables and preserves existing Stage 3 data', async (t) => {
  const { sqlite, db } = database();
  t.after(() => sqlite.close());
  await migrate(db, { journal: { ...journal, entries: journal.entries.slice(0, 1) }, migrations: { m0000: bundledMigrations.migrations.m0000 } });
  db.insert(schema.tasks).values({ id: 'existing', title: 'Existing', createdAt: 1, updatedAt: 1 }).run();
  const broken = { ...bundledMigrations, migrations: { ...bundledMigrations.migrations, m0001: `${bundledMigrations.migrations.m0001}\n--> statement-breakpoint\nINVALID SQL;` } };
  await assert.rejects(migrate(db, broken));
  assert.equal(db.select().from(schema.tasks).get()!.title, 'Existing');
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM sqlite_master WHERE name IN ('task_recurrences', 'task_occurrences')").get()!.count, 0);
  await migrate(db, bundledMigrations);
  assert.equal(db.select().from(schema.tasks).get()!.title, 'Existing');
});

test('persisted recurrence end dates stop materialization inclusively and clock advance does not shift dates', async (t) => {
  const { sqlite, access, setNow } = await recurringDatabase();
  t.after(() => sqlite.close());
  const id = access.createTask(repeatingDraft({ interval: 3, endDate: '2026-10-04' }));
  const first = access.read().occurrences;
  assert.deepEqual(first.map((item) => item.scheduledDate), ['2026-09-28', '2026-10-01', '2026-10-04']);
  access.setOccurrenceStatus(first[0].id, 'skipped');
  setNow(new Date(2026, 9, 6, 12));
  const next = access.read().occurrences;
  assert.deepEqual(next.map((item) => item.scheduledDate), first.map((item) => item.scheduledDate));
  assert.deepEqual(next.map((item) => item.id), first.map((item) => item.id));
  assert.equal(occurrenceState(next[2], new Date(2026, 9, 6)), 'missed');
  assert.equal(access.readHistory(id).occurrences.find((item) => item.id === next[2].id)!.status, 'pending');
});

test('SQLite occurrence constraints reject invalid outcomes, dates and foreign keys', async (t) => {
  const { sqlite, db, access } = await recurringDatabase();
  t.after(() => sqlite.close());
  access.createTask(repeatingDraft());
  const existing = access.read().occurrences[0];
  const insert = (changes: Partial<TaskOccurrence>) => db.insert(schema.taskOccurrences).values({ ...existing, id: randomUUID(), scheduledDate: '2026-11-02', ...changes }).run();
  assert.throws(() => insert({ status: 'completed', completedAt: null }), /CHECK/);
  assert.throws(() => insert({ status: 'pending', completedAt: 1 }), /CHECK/);
  assert.throws(() => insert({ scheduledDate: '2026-02-30' }), /CHECK/);
  assert.throws(() => insert({ scheduledTime: '24:00' }), /CHECK/);
  assert.throws(() => insert({ taskId: 'missing' }), /FOREIGN KEY/);
  assert.throws(() => insert({ recurrenceId: 'missing' }), /FOREIGN KEY/);
  const currentRule = db.select().from(schema.taskRecurrences).get()!;
  assert.throws(() => db.insert(schema.taskRecurrences).values({ ...currentRule, id: randomUUID(), frequency: 'weekly', weekdayMask: null }).run(), /CHECK/);
});

test('date-only past occurrences retain date-only ordering after a series time edit', async (t) => {
  const { sqlite, access } = await recurringDatabase();
  t.after(() => sqlite.close());
  const id = access.createTask(repeatingDraft());
  access.read();
  access.editTask(id, { ...repeatingDraft(), time: '18:00' });
  access.createTask({ ...taskDraft(), title: 'Noon task', date: '2026-10-02', time: '12:00' });
  const today = groupTasks(access.read().items, '2026-10-02').find((section) => section.title === 'Today')!;
  assert.equal(today.data[0].task.id, id);
  assert.equal(today.data[0].occurrence!.scheduledTime, null);
});

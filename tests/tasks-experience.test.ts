/// <reference types="node" />

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { test, type TestContext } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { act, createElement } from 'react';

import { seedDefaultCategories } from '../src/database/seed';
import { createCalendarDataAccess } from '../src/features/calendar/data';
import { createHomeDataAccess } from '../src/features/home/data';
import { createTaskDataAccess } from '../src/features/tasks/data';
import { taskDraft } from '../src/features/tasks/form';
import { taskRowPresentation } from '../src/features/tasks/presentation';
import { latestRecurrence, recurrencePatternSummary } from '../src/features/tasks/recurrence';
import type { RecurrenceDraft, TaskDraft, TaskOccurrence } from '../src/features/tasks/types';
import { pickerValue } from '../src/utils/calendar';
import { bundledMigrations, database } from './helpers/database';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const require = createRequire(import.meta.url);
const { TaskRow } = require('../src/features/tasks/components/task-row') as typeof import('../src/features/tasks/components/task-row');
const { TaskEditor } = require('../src/features/tasks/components/task-editor') as typeof import('../src/features/tasks/components/task-editor');
const today = '2026-10-06'; const timestamp = pickerValue(today, '12:00').getTime();
const daily: RecurrenceDraft = { frequency: 'daily', interval: 1, weekdayMask: 2, monthDay: 6, month: 10, endDate: '' };
type App = Awaited<ReturnType<typeof mount>>;
async function initialized(t: TestContext) {
  t.mock.method(Date, 'now', () => timestamp);
  const fixture = database(); await migrate(fixture.db, bundledMigrations); seedDefaultCategories(fixture.db); t.after(() => fixture.sqlite.close());
  return { ...fixture, access: createTaskDataAccess(fixture.db, randomUUID, () => timestamp),
    home: createHomeDataAccess(fixture.db, randomUUID, () => timestamp), calendar: createCalendarDataAccess(fixture.db, randomUUID, () => timestamp) };
}
function noModal(app: App) { assert.ok(!app.nodes().some((node) => node.kind === 'Modal')); }
async function choose(app: App, label: string, value: unknown) { await act(() => (app.find('SelectField', label).props.onChange as (value: unknown) => void)(value)); }
async function handoff(app: App, label: string) { await app.press(label); await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); }); }
function presentation(f: Awaited<ReturnType<typeof initialized>>, id: string, occurrence?: TaskOccurrence | null) {
  const snapshot = f.access.read(); const task = snapshot.tasks.find((row) => row.id === id)!;
  return taskRowPresentation(task, occurrence ?? null, snapshot.recurrences, snapshot.categories, timestamp);
}
async function editor(t: TestContext, draft: Partial<TaskDraft> = {}) {
  const f = await initialized(t); let saved: TaskDraft | null = null; let dismissed = false;
  const app = await mount(createElement(TaskEditor, { task: null, recurrence: null, categories: f.access.read().categories,
    onSave: (value) => { saved = value; f.access.createTask(value); }, onCreateCategory: f.access.createCategory, onDismiss: () => { dismissed = true; } }), f.db);
  t.after(app.unmount); await app.change('Title *', draft.title ?? 'Read'); await app.change('Date', draft.date ?? today);
  return { ...f, app, saved: () => saved, dismissed: () => dismissed };
}

test('main Tasks centers on Today and To-do, with a floating Add task and contextual management access', async (t) => {
  const f = await initialized(t);
  for (const [title, date, completed] of [['Earlier task', '2026-10-05', false], ['Today task', today, false], ['Future task', '2026-10-07', false], ['Undated', '', false], ['Done', today, true]] as const) {
    const id = f.access.createTask({ ...taskDraft(), title, date }); if (completed) f.access.setCompleted(id, true);
  }
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  assert.equal(app.find('Pressable', 'Add task').props.accessibilityRole, 'button');
  assert.equal(app.find('FormButton', 'Task options').props.variant, 'quiet');
  const sections = app.find('SectionList').props.sections as { title: string }[];
  assert.deepEqual(sections.map((section) => section.title), ['Earlier', 'Today', 'To-do', 'Upcoming']); noModal(app);
  for (const label of ['Skip', 'History', 'Delete']) assert.ok(!app.nodes().some((node) => node.kind === 'FormButton' && node.props.label === label));
});

test('one-time completion remains distinct from task-body editing; Delete is contextual and confirmed', async (t) => {
  const f = await initialized(t); const id = f.access.createTask({ ...taskDraft(), title: 'Report', date: today, time: '14:30' });
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount); const row = presentation(f, id);
  await app.tapSet(`Complete ${row.actionSubject}`); assert.notEqual(f.access.read().tasks[0].completedAt, null); noModal(app);
  const archive = await mount(createElement(screens.TasksHistoryScreen), f.db);
  await archive.tapSet(`Reopen ${row.actionSubject}`); await archive.unmount(); await app.refocus(); assert.equal(f.access.read().tasks[0].completedAt, null);
  await app.tapSet(row.accessibilityLabel); assert.ok(app.find('FormField', 'Title *')); assert.equal(f.access.read().tasks[0].completedAt, null);
  await app.press('Cancel'); await app.press(`Actions for ${row.actionSubject}`);
  assert.equal(app.find('FormButton', 'Delete task').props.variant, 'destructive'); await handoff(app, 'Edit task'); assert.ok(app.find('FormField', 'Title *'));
  await app.press('Cancel'); await app.press(`Actions for ${row.actionSubject}`); await app.press('Delete task');
  assert.equal(runtime.fixture.alerts.at(-1)!.title, 'Delete task?'); assert.equal(f.access.read().tasks.length, 1);
  await app.confirm('Cancel'); assert.equal(f.access.read().tasks.length, 1); await app.press('Delete task'); await app.confirm('Delete');
  noModal(app); assert.equal(f.access.read().tasks.length, 0);
});

test('recurring rows offer Complete/Reopen and contextual Skip/return, Edit, History and confirmed series Delete', async (t) => {
  const f = await initialized(t); const id = f.access.createTask({ ...taskDraft(), title: 'Medication', date: today, time: '14:30', recurrence: daily });
  const occurrence = f.access.read().occurrences.find((row) => row.scheduledDate === today)!; const row = presentation(f, id, occurrence);
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  await app.tapSet(`Complete ${row.actionSubject}`); assert.equal(f.access.read().occurrences.find((entry) => entry.id === occurrence.id)!.status, 'completed');
  const archive = await mount(createElement(screens.TasksHistoryScreen), f.db);
  await archive.press(`Actions for ${row.actionSubject}`); assert.ok(!archive.nodes().some((node) => node.props?.label === 'Skip occurrence')); await archive.press('Done');
  await archive.tapSet(`Reopen ${row.actionSubject}`); await archive.unmount(); await app.refocus();
  await app.press(`Actions for ${row.actionSubject}`); await app.press('Skip occurrence'); noModal(app);
  assert.equal(f.access.read().occurrences.find((entry) => entry.id === occurrence.id)!.status, 'skipped');
  const skippedArchive = await mount(createElement(screens.TasksHistoryScreen), f.db);
  await skippedArchive.press(`Actions for ${row.actionSubject}`); await skippedArchive.press('Return to pending'); noModal(skippedArchive);
  await skippedArchive.unmount(); await app.refocus();
  assert.equal(f.access.read().occurrences.find((entry) => entry.id === occurrence.id)!.status, 'pending');
  await app.press(`Actions for ${row.actionSubject}`); await handoff(app, 'Edit recurring task'); assert.ok(app.find('FormButton', 'Edit recurrence'));
  await app.press('Cancel'); await app.press(`Actions for ${row.actionSubject}`); await handoff(app, 'View History');
  assert.ok(app.container.textContent.includes('Medication · History')); await app.press('Done');
  await app.press(`Actions for ${row.actionSubject}`); await app.press('Delete recurring task');
  assert.equal(runtime.fixture.alerts.at(-1)!.title, 'Delete repeating task?'); assert.equal(f.access.read().tasks.length, 1);
  await app.confirm('Delete'); assert.equal(f.access.read().tasks.length, 0); noModal(app);
  assert.ok(Number(f.sqlite.prepare('SELECT count(*) AS count FROM task_occurrences').get()!.count) > 0, 'Soft deletion retains occurrence records');
});

test('iOS contextual-to-editor handoff waits for native modal dismissal', async (t) => {
  const platform = (runtime.native as { Platform: { OS: string } }).Platform; const previous = platform.OS; platform.OS = 'ios'; t.after(() => { platform.OS = previous; });
  const f = await initialized(t); const id = f.access.createTask({ ...taskDraft(), title: 'Native task', date: today });
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  await app.press(`Actions for ${presentation(f, id).actionSubject}`); const closed = app.find('Modal').props.onDismiss as () => void;
  await app.press('Edit task'); assert.ok(!app.nodes().some((node) => node.kind === 'FormField'));
  await act(closed); assert.ok(app.find('FormField', 'Title *')); assert.equal(app.nodes().filter((node) => node.kind === 'Modal').length, 1);
});

for (const state of ['pending', 'completed', 'skipped', 'missed'] as const) {
  test(`${state} recurring row stays compact, richly accessible and free of a permanent action tower`, async (t) => {
    const f = await initialized(t); const categoryId = f.access.createCategory('A long category describing personal health and wellbeing').id;
    const title = 'A long recurring task title that must remain readable at accessibility text sizes';
    const id = f.access.createTask({ ...taskDraft(), title, date: today, recurrence: daily, categoryId, priority: 'high' }); const snapshot = f.access.read();
    const source = snapshot.occurrences.find((entry) => entry.scheduledDate === today)!;
    const occurrence = { ...source, status: state === 'missed' ? 'pending' as const : state, scheduledDate: state === 'missed' ? '2026-10-05' : today };
    const app = await mount(createElement(TaskRow, { task: snapshot.tasks[0], occurrence, recurrences: snapshot.recurrences, categories: snapshot.categories,
      now: timestamp, onEdit() {}, onComplete() {}, onActions() {} }), f.db); t.after(app.unmount);
    const row = taskRowPresentation(snapshot.tasks[0], occurrence, snapshot.recurrences, snapshot.categories, timestamp);
    const body = app.find('Pressable', row.accessibilityLabel); const bodyStyle = body.props.style as { flex: number; minWidth: number; minHeight: number };
    assert.equal(bodyStyle.flex, 1); assert.equal(bodyStyle.minWidth, 0); assert.ok(bodyStyle.minHeight >= 44);
    assert.ok(app.nodes().some((node) => node.kind === 'ThemedText' && node.textContent === title && node.props.numberOfLines === undefined));
    for (const value of [title, 'High priority', 'Every day', 'A long category']) assert.ok(row.accessibilityLabel.includes(value));
    const buttons = app.nodes().filter((node) => node.kind === 'FormButton'); assert.equal(buttons.length, 1); assert.equal(buttons[0].props.variant, 'quiet');
    assert.ok(!['Delete', 'Skip', 'History'].some((value) => buttons.some((button) => button.props.label === value)));
    assert.ok(!app.container.textContent.includes('Overdue'));
    if (state !== 'pending') {
      const status = app.nodes().find((node) => node.kind === 'ThemedText' && node.textContent === row.statusLabel)!;
      assert.equal(status.props.themeColor, state === 'missed' ? 'warning' : 'textMuted');
      assert.ok(app.container.textContent.includes(row.statusLabel!));
    }
  });
}

test('undated, no-priority and missing/deleted-category rows omit placeholder metadata', async (t) => {
  const f = await initialized(t); const category = f.access.createCategory('Temporary'); f.access.deleteCategory(category.id);
  const id = f.access.createTask({ ...taskDraft(), title: 'Simple task' }); const snapshot = f.access.read();
  for (const task of [snapshot.tasks.find((entry) => entry.id === id)!, { ...snapshot.tasks[0], categoryId: category.id }]) {
    const app = await mount(createElement(TaskRow, { task, occurrence: null, recurrences: [], categories: [{ ...category, deletedAt: timestamp }], now: timestamp,
      onEdit() {}, onComplete() {}, onActions() {} }), f.db);
    try { for (const label of ['Uncategorized', 'No category', 'None', 'No date', 'Temporary']) assert.ok(!app.container.textContent.includes(label)); }
    finally { await app.unmount(); }
  }
});

test('Task editor groups concepts and recurrence is an optional focused surface retaining the entire draft', async (t) => {
  const f = await editor(t, { title: 'Working task' }); const { app } = f;
  const headings = app.nodes().filter((node) => node.kind === 'ThemedText' && node.props.accessibilityRole === 'header').map((node) => node.textContent);
  assert.deepEqual(headings, ['New task', 'Task', 'Schedule', 'Organization', 'Recurrence']);
  assert.equal(app.find('FormButton', 'Add recurrence').props.variant, 'quiet'); assert.ok(!app.nodes().some((node) => node.props?.label === 'Repeats'));
  await app.change('Description', 'Draft description'); await choose(app, 'Priority', 'high'); const category = f.access.read().categories[0]; await choose(app, 'Category', category.id);
  const modal = app.find('Modal'); await app.press('Add recurrence'); assert.equal(app.find('Modal'), modal);
  await choose(app, 'Repeats', 'daily'); await app.change('Every', '3'); await app.press('Done'); assert.equal(app.find('Modal'), modal);
  assert.equal(app.find('FormField', 'Title *').props.value, 'Working task'); assert.equal(app.find('FormField', 'Title *').props.autoFocus, false);
  assert.equal(app.find('FormField', 'Description').props.value, 'Draft description'); assert.equal(app.find('SelectField', 'Priority').props.value, 'high');
  assert.equal(app.find('SelectField', 'Category').props.value, category.id); assert.ok(app.container.textContent.includes('Every 3 days'));
  assert.equal(f.access.read().tasks.length, 0, 'Done only changes the editor draft'); await app.press('Save');
  assert.equal(f.dismissed(), true); assert.equal(f.saved()!.recurrence!.interval, 3); assert.equal(f.access.read().tasks.length, 1);
});

for (const frequency of ['daily', 'weekly', 'monthly', 'yearly'] as const) {
  test(`${frequency} recurrence retains interval/day/end-date behavior in Frequency → Pattern → Start → End order`, async (t) => {
    const f = await editor(t); const { app } = f; await app.press('Add recurrence'); await choose(app, 'Repeats', frequency);
    const headings = app.nodes().filter((node) => node.kind === 'ThemedText' && node.props.accessibilityRole === 'header').map((node) => node.textContent);
    assert.deepEqual(headings, ['Recurrence', 'Frequency', 'Pattern', 'Start', 'End']);
    if (frequency !== 'yearly') await app.change('Every', frequency === 'daily' ? '3' : '2');
    if (frequency === 'weekly') {
      await act(() => (app.find('FormWeekday', 'Thursday').props.onPress as () => void)());
      assert.equal(app.find('FormWeekday', 'Tuesday').props.checked, true); assert.equal(app.find('FormWeekday', 'Thursday').props.checked, true);
    }
    if (frequency === 'yearly') await choose(app, 'Month', 10);
    if (frequency === 'yearly' || frequency === 'monthly') {
      await app.change('Day', frequency === 'yearly' ? '12' : '31'); assert.ok(app.container.textContent.includes('Shorter months use their last valid day.'));
    }
    await choose(app, 'Ends', 'date'); await app.change('End date', '2026-12-31'); await app.press('Done'); await app.press('Save');
    const rule = latestRecurrence(f.access.read().recurrences, f.access.read().tasks[0].id)!;
    assert.equal(rule.frequency, frequency); assert.equal(rule.endDate, '2026-12-31'); assert.equal(rule.interval, frequency === 'yearly' ? 1 : frequency === 'daily' ? 3 : 2);
    if (frequency === 'weekly') assert.equal(rule.weekdayMask, 2 | 8); if (frequency === 'monthly') assert.equal(rule.monthDay, 31);
    if (frequency === 'yearly') { assert.equal(rule.month, 10); assert.equal(rule.monthDay, 12); }
    assert.equal(f.dismissed(), true);
  });
}

test('invalid recurrence remains authoritatively rejected on Save, and None still removes the draft recurrence', async (t) => {
  const f = await editor(t); await f.app.press('Add recurrence'); await choose(f.app, 'Repeats', 'daily'); await f.app.change('Every', '0'); await f.app.press('Done');
  assert.ok(f.app.container.textContent.includes('Review recurrence settings')); await f.app.press('Save'); assert.equal(f.dismissed(), false); assert.equal(f.access.read().tasks.length, 0);
  assert.ok(f.app.find('FormError')); await f.app.press('Edit recurrence'); await choose(f.app, 'Repeats', 'none'); await f.app.press('Back'); await f.app.press('Save');
  assert.equal(f.saved()!.recurrence, null); assert.equal(f.access.read().recurrences.length, 0);
});

test('recurrence edits still apply tomorrow; the current occurrence keeps its original rule and History', async (t) => {
  const f = await initialized(t); const id = f.access.createTask({ ...taskDraft(), title: 'Read', date: today, time: '14:30', recurrence: daily });
  const original = f.access.read().occurrences.find((row) => row.scheduledDate === today)!;
  const app = await mount(createElement(screens.TasksScreen, { initialTaskId: id }), f.db); t.after(app.unmount);
  assert.ok(app.container.textContent.includes("Schedule changes apply tomorrow. Today's occurrences and history stay."));
  await app.press('Edit recurrence'); await app.change('Every', '3'); await app.press('Done'); await app.press('Save'); noModal(app);
  const snapshot = f.access.read(); const current = snapshot.occurrences.find((entry) => entry.id === original.id)!;
  const future = snapshot.occurrences.find((entry) => entry.scheduledDate > today)!;
  assert.equal(presentation(f, id, current).recurrence, 'Every day'); assert.equal(presentation(f, id, future).recurrence, 'Every 3 days');
  assert.equal(latestRecurrence(snapshot.recurrences, id)!.effectiveFrom, '2026-10-07');
});

test('stop repeating stays quiet, confirmed and effective tomorrow', async (t) => {
  const f = await initialized(t); const id = f.access.createTask({ ...taskDraft(), title: 'Read', date: today, recurrence: daily });
  const app = await mount(createElement(screens.TasksScreen, { initialTaskId: id }), f.db); t.after(app.unmount);
  assert.equal(app.find('FormButton', 'Stop repeating').props.variant, 'quiet'); await app.press('Stop repeating');
  assert.equal(runtime.fixture.alerts.at(-1)!.title, 'Stop repeating?'); await app.confirm('Cancel'); assert.ok(app.find('FormField', 'Title *'));
  await app.press('Stop repeating'); await app.confirm('Stop repeating'); noModal(app);
  assert.ok(f.access.read().occurrences.some((row) => row.scheduledDate === today)); assert.ok(!f.access.read().occurrences.some((row) => row.scheduledDate > today));
});

test('date/time layout adapts to large text while clearing Date still clears Time', async (t) => {
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ height: 800, width: 400, scale: 1, fontScale: 2 }));
  const f = await editor(t); const { app } = f; const date = app.find('FormField', 'Date'); const layout = date.parentNode!.parentNode!;
  await act(() => (layout.props.onLayout as (event: unknown) => void)({ nativeEvent: { layout: { width: 400 } } }));
  assert.ok(!(layout.props.style as { flexDirection?: string }[]).some((style) => style?.flexDirection === 'row'));
  await app.change('Time', '14:30'); await app.change('Date', ''); assert.equal(app.find('FormField', 'Time').props.value, ''); assert.equal(app.find('FormField', 'Time').props.editable, false);
});

test('native Android date/time picker callbacks and gating remain unchanged', async (t) => {
  const platform = (runtime.native as { Platform: { OS: string } }).Platform; const previous = platform.OS; platform.OS = 'android'; t.after(() => { platform.OS = previous; });
  const f = await initialized(t); const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount); await app.tapSet('Add task');
  assert.equal(app.find('FormSelect', 'Time').props.disabled, true);
  await act(() => (app.find('FormSelect', 'Date').props.onPress as () => void)()); const datePicker = runtime.fixture.pickers.at(-1)!;
  assert.equal(datePicker.mode, 'date'); assert.equal(datePicker.is24Hour, true);
  await act(() => (datePicker.onValueChange as (event: unknown, date: Date) => void)({}, pickerValue(today)));
  await act(() => (app.find('FormSelect', 'Time').props.onPress as () => void)()); const timePicker = runtime.fixture.pickers.at(-1)!; assert.equal(timePicker.mode, 'time');
  await act(() => (timePicker.onValueChange as (event: unknown, date: Date) => void)({}, pickerValue(today, '14:30')));
  assert.equal(app.find('FormSelect', 'Time').props.value, '14:30'); await app.press('Clear date'); assert.equal(app.find('FormSelect', 'Time').props.disabled, true);
});

test('summary refresh failure preserves the open Task editor and the recurrence draft through Retry', async (t) => {
  const f = await initialized(t); const id = f.access.createTask({ ...taskDraft(), title: 'Draft task', date: today });
  const app = await mount(createElement(screens.TasksScreen, { initialTaskId: id }), f.db); t.after(app.unmount);
  await app.change('Title *', 'Unsaved task'); const title = app.find('FormField', 'Title *'); const modal = app.find('Modal');
  runtime.fixture.failures.add('tasks.read'); await app.resume(); assert.equal(app.find('Modal'), modal); assert.equal(app.find('FormField', 'Title *'), title); assert.equal(title.props.value, 'Unsaved task');
  await app.press('Add recurrence'); await choose(app, 'Repeats', 'daily'); await app.change('Every', '3');
  const interval = app.find('FormField', 'Every'); await app.resume(); assert.equal(app.find('FormField', 'Every'), interval); assert.equal(interval.props.value, '3');
  runtime.fixture.failures.clear(); await app.press('Retry'); assert.equal(app.find('Modal'), modal); assert.equal(app.find('FormField', 'Every'), interval);
  await app.press('Done'); await app.press('Save'); assert.equal(f.access.read().tasks[0].title, 'Unsaved task'); assert.equal(latestRecurrence(f.access.read().recurrences, id)!.interval, 3);
});

test('recurring manager separates identity/current schedule and quieter History from Edit and confirmed Delete', async (t) => {
  const f = await initialized(t); f.access.createTask({ ...taskDraft(), title: 'Read', date: today, recurrence: daily });
  const app = await mount(createElement(screens.RepeatingTasksScreen), f.db); t.after(app.unmount); noModal(app);
  assert.ok(app.container.textContent.includes('Current schedule')); assert.equal(app.find('FormButton', 'History for Read').props.variant, 'quiet');
  assert.equal(app.find('FormButton', 'Edit schedule for Read').props.variant, undefined);
  await app.press('Edit schedule for Read'); assert.ok(app.find('FormButton', 'Edit recurrence')); await app.press('Cancel');
  await app.press('Delete recurring task Read'); assert.equal(f.access.read().tasks.length, 1); await app.confirm('Delete'); assert.equal(f.access.read().tasks.length, 0);
});

test('existing mutation APIs continue updating Home counts and Calendar statuses after Complete, Reopen, Skip and Delete', async (t) => {
  const f = await initialized(t); const id = f.access.createTask({ ...taskDraft(), title: 'Projected', date: today, time: '14:30', recurrence: daily });
  const occurrence = f.access.read().occurrences.find((row) => row.scheduledDate === today)!; const row = presentation(f, id, occurrence);
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  assert.equal(f.home.read().today.find((section) => section.source === 'task')!.total, 1);
  await app.tapSet(`Complete ${row.actionSubject}`); assert.equal(f.home.read().today.length, 0);
  assert.equal(f.calendar.readRange({ from: today, to: today })[0].status, 'Completed');
  const archive = await mount(createElement(screens.TasksHistoryScreen), f.db);
  await archive.tapSet(`Reopen ${row.actionSubject}`); await archive.unmount(); await app.refocus();
  assert.equal(f.home.read().today.find((section) => section.source === 'task')!.total, 1);
  await app.press(`Actions for ${row.actionSubject}`); await app.press('Skip occurrence'); assert.equal(f.home.read().today.length, 0);
  assert.equal(f.calendar.readRange({ from: today, to: today })[0].status, 'Skipped');
  const skippedArchive = await mount(createElement(screens.TasksHistoryScreen), f.db);
  await skippedArchive.press(`Actions for ${row.actionSubject}`); await skippedArchive.press('Delete recurring task'); await skippedArchive.confirm('Delete'); await skippedArchive.unmount();
  assert.equal(f.calendar.readRange({ from: today, to: today }).length, 0);
});

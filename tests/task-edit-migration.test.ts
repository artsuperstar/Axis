/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { seedDefaultCategories } from '../src/database/seed';
import { createTaskDataAccess } from '../src/features/tasks/data';
import { taskDraft } from '../src/features/tasks/form';
import { latestRecurrence } from '../src/features/tasks/recurrence';
import type { RecurrenceDraft } from '../src/features/tasks/types';
import { pickerValue } from '../src/utils/calendar';
import { bundledMigrations, database } from './helpers/database';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const require = createRequire(import.meta.url);
const { CalendarSourceScreen } = require('../src/features/calendar/source-screen') as typeof import('../src/features/calendar/source-screen');
const today = '2026-11-13';
type App = Awaited<ReturnType<typeof mount>>;
async function fixture(t: TestContext, recurrence: RecurrenceDraft | null = null) {
  const timestamp = pickerValue(today, '12:00').getTime();
  t.mock.method(Date, 'now', () => timestamp);
  const f = database(); await migrate(f.db, bundledMigrations); seedDefaultCategories(f.db); t.after(() => f.sqlite.close());
  const access = createTaskDataAccess(f.db, randomUUID, () => timestamp);
  const category = access.createCategory('Client projects');
  const id = access.createTask({ ...taskDraft(), title: 'Saved proposal', description: 'Saved notes', date: today, time: '14:30', priority: 'high', categoryId: category.id, recurrence });
  return { ...f, access, id, category };
}
async function choose(app: App, label: string, value: unknown) {
  await act(() => (app.find('SelectField', label).props.onChange as (value: unknown) => void)(value));
}
function assertEditor(app: App) {
  assert.equal(app.find('FormField', 'Title *').props.appearance, 'v2');
  assert.equal(app.find('FormButton', 'Save').props.appearance, 'v2');
  assert.equal(app.find('FormButton', 'Cancel').props.leadingIcon, 'back');
  assert.deepEqual(app.nodes().filter(n => String(n.props?.testID).startsWith('editor-section-')).map(n => n.props.testID),
    ['editor-section-task', 'editor-section-schedule', 'editor-section-organization', 'editor-section-recurrence']);
  for (const n of app.nodes().filter(n => ['FormField', 'FormSelect', 'SelectField'].includes(n.kind ?? ''))) assert.equal(n.props.appearance, 'v2');
}

for (const theme of ['dark', 'light']) {
  test(`${theme}: Tasks source editor loads saved values, cancels its draft and saves the original ID once`, async t => {
    t.mock.method(runtime.native as { useColorScheme: () => string }, 'useColorScheme', () => theme);
    const f = await fixture(t); const original = f.access.read().tasks[0];
    let app = await mount(createElement(screens.TasksScreen, { initialTaskId: f.id }), f.db);
    t.after(() => app.unmount());
    assertEditor(app);
    assert.equal(app.find('FormField', 'Title *').props.value, original.title);
    assert.equal(app.find('FormField', 'Description').props.value, original.description);
    assert.equal(app.find('SelectField', 'Category').props.value, f.category.id);
    assert.equal(app.find('SelectField', 'Priority').props.value, 'high');
    assert.deepEqual(f.access.read().tasks[0], original, 'Opening does not mutate');
    await app.change('Title *', 'Discard this'); await app.change('Description', 'Unsaved');
    assert.deepEqual(f.access.read().tasks[0], original, 'No autosave');
    await app.press('Cancel'); assert.deepEqual(f.access.read().tasks[0], original);
    assert.ok(!app.nodes().some(n => n.kind === 'Modal')); await app.unmount();
    app = await mount(createElement(screens.TasksScreen, { initialTaskId: f.id }), f.db);
    await app.change('Title *', 'Updated proposal'); await app.change('Description', '');
    await choose(app, 'Priority', 'low'); await choose(app, 'Category', null);
    const save = app.find('FormButton', 'Save').props.onPress as () => void;
    await act(() => { save(); save(); });
    const saved = f.access.read().tasks;
    assert.equal(saved.length, 1); assert.equal(saved[0].id, f.id); assert.equal(saved[0].title, 'Updated proposal');
    assert.equal(saved[0].description, null); assert.equal(saved[0].priority, 'low'); assert.equal(saved[0].categoryId, null);
    assert.equal(saved[0].date, today); assert.equal(saved[0].time, '14:30'); assert.equal(saved[0].createdAt, original.createdAt);
    assert.ok(!app.nodes().some(n => n.kind === 'Modal'));
  });

  test(`${theme}: Calendar agenda/source route opens the same editor and cancellation preserves its origin/date`, async t => {
    t.mock.method(runtime.native as { useColorScheme: () => string }, 'useColorScheme', () => theme);
    const f = await fixture(t);
    const calendar = await mount(createElement(screens.CalendarScreen), f.db);
    t.after(calendar.unmount);
    const opener = calendar.nodes().find(n => n.kind === 'Pressable' && String(n.props.accessibilityLabel).startsWith('Open Saved proposal,'));
    assert.ok(opener); await act(() => (opener.props.onPress as () => void)());
    const navigation = runtime.fixture.navigation.at(-1) as { method: string; target: { pathname: string; params: Record<string, string> } };
    assert.equal(navigation.target.pathname, '/calendar-source');
    assert.deepEqual(navigation.target.params, { source: 'task', recordId: f.id, date: today }); await calendar.unmount();
    runtime.fixture.routeParams = navigation.target.params; t.after(() => { delete runtime.fixture.routeParams; });
    const routerBoundary = runtime.router as { Stack?: unknown };
    const previous = routerBoundary.Stack; routerBoundary.Stack = { Screen: () => null }; t.after(() => { routerBoundary.Stack = previous; });
    const app = await mount(createElement(CalendarSourceScreen), f.db); t.after(app.unmount); assertEditor(app);
    await app.change('Title *', 'Calendar draft'); await app.press('Cancel');
    assert.equal(f.access.read().tasks[0].title, 'Saved proposal');
    assert.deepEqual(runtime.fixture.navigation, [], 'Closing editor does not replace/pop source route');
    assert.deepEqual(runtime.fixture.routeParams, { source: 'task', recordId: f.id, date: today });
  });
}

test('ordinary Tasks menu entry and Task Actions use v2 while retaining edit and destructive actions', async t => {
  const f = await fixture(t); const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  const actions = app.nodes().find(n => n.kind === 'FormButton' && String(n.props.accessibilityLabel).startsWith('Actions for Saved proposal'));
  assert.ok(actions); await act(() => (actions.props.onPress as () => void)());
  await app.press('Edit task'); await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); }); assertEditor(app);
  await app.press('Cancel');
  const native = runtime.native as { Platform: { OS: string } }; const previous = native.Platform.OS; native.Platform.OS = 'ios'; t.after(() => { native.Platform.OS = previous; });
  // Source TaskActions retains its callback contract alongside the migrated editor.
  const { TaskActions } = require('../src/features/tasks/components/task-actions') as typeof import('../src/features/tasks/components/task-actions');
  const task = f.access.read().tasks[0];
  const legacy = await mount(createElement(TaskActions, { item: { key: task.id, task, occurrence: null }, categories: f.access.read().categories, recurrences: [], now: Date.now(), visible: true, error: null,
    onDismiss() {}, onClosed() {}, onEdit() {}, onHistory() {}, onSkip() {}, onDelete() {} }), f.db); t.after(legacy.unmount);
  assert.equal(legacy.find('FormButton', 'Delete task').props.variant, 'destructive');
  for (const n of legacy.nodes().filter(n => n.kind === 'FormButton')) assert.equal(n.props.appearance, 'v2');
});

for (const frequency of ['daily', 'weekly', 'monthly', 'yearly'] as const) test(`${frequency}: existing recurring edit retains saved rules and history while an ordinary title edit creates no schedule version`, async t => {
  const rule: RecurrenceDraft = { frequency, interval: 1, weekdayMask: 16, monthDay: 13, month: 11, endDate: '2027-12-31' };
  const f = await fixture(t, rule); const before = f.access.read();
  const app = await mount(createElement(screens.TasksScreen, { initialTaskId: f.id }), f.db); t.after(app.unmount); assertEditor(app);
  await app.change('Title *', 'Recurring draft'); await app.press('Edit recurrence');
  assert.equal(app.find('SelectField', 'Repeats').props.value, frequency);
  assert.equal(app.find('FormButton', 'Back to task editor').props.appearance, 'v2');
  for (const n of app.nodes().filter(n => ['FormField', 'FormSelect', 'SelectField', 'FormWeekday'].includes(n.kind ?? ''))) assert.equal(n.props.appearance, 'v2');
  await app.press('Back to task editor'); assert.equal(app.find('FormField', 'Title *').props.value, 'Recurring draft');
  await app.press('Save'); const after = f.access.read();
  assert.equal(after.tasks.length, 1); assert.equal(after.tasks[0].id, f.id);
  assert.deepEqual(after.recurrences, before.recurrences); assert.deepEqual(after.occurrences, before.occurrences);
});

test('editing a recurrence interval preserves completed history and versions tomorrow through the unchanged data access', async t => {
  const f = await fixture(t, { frequency: 'daily', interval: 1, weekdayMask: 16, monthDay: 13, month: 11, endDate: '' });
  const current = f.access.read().occurrences.find(o => o.scheduledDate === today)!; assert.ok(current);
  f.access.setOccurrenceStatus(current.id, 'completed'); const before = f.access.read();
  const app = await mount(createElement(screens.TasksScreen, { initialTaskId: f.id }), f.db); t.after(app.unmount);
  await app.press('Edit recurrence'); await app.change('Every', '3'); await app.press('Back to task editor'); await app.press('Save');
  const after = f.access.read(); assert.equal(latestRecurrence(after.recurrences, f.id)!.interval, 3);
  assert.equal(latestRecurrence(after.recurrences, f.id)!.effectiveFrom, '2026-11-14');
  assert.deepEqual(after.occurrences.find(o => o.id === current.id), before.occurrences.find(o => o.id === current.id));
});

test('existing native edit keeps date/time return, disabled-time gating, validation and draft on failure', async t => {
  const native = runtime.native as { Platform: { OS: string } }; const previous = native.Platform.OS; native.Platform.OS = 'ios'; t.after(() => { native.Platform.OS = previous; });
  const f = await fixture(t); const original = f.access.read().tasks[0];
  const app = await mount(createElement(screens.TasksScreen, { initialTaskId: f.id }), f.db); t.after(app.unmount);
  await app.change('Title *', ''); await app.press('Save');
  assert.equal(app.find('FormError').props.appearance, 'v2'); assert.equal(app.find('FormError').props.message, 'Enter a task title.');
  assert.deepEqual(f.access.read().tasks[0], original);
  await app.change('Title *', 'Native schedule'); await app.press('Clear date'); assert.equal(app.find('FormSelect', 'Time').props.disabled, true);
  await act(() => (app.find('FormSelect', 'Date').props.onPress as () => void)());
  await act(() => (app.find('DateTimePicker').props.onValueChange as (e: unknown, d: Date) => void)({}, pickerValue('2026-11-16')));
  assert.equal(app.find('FormButton', 'Back from date picker').props.appearance, 'v2'); await app.press('Back from date picker');
  await act(() => (app.find('FormSelect', 'Time').props.onPress as () => void)());
  await act(() => (app.find('DateTimePicker').props.onValueChange as (e: unknown, d: Date) => void)({}, pickerValue('2026-11-16', '18:45')));
  await app.press('Back from time picker'); await app.press('Save');
  const saved = f.access.read().tasks[0]; assert.equal(saved.date, '2026-11-16'); assert.equal(saved.time, '18:45');
});

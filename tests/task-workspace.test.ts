/// <reference types="node" />

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test, type TestContext } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { act, createElement } from 'react';

import { seedDefaultCategories } from '../src/database/seed';
import { createTaskDataAccess } from '../src/features/tasks/data';
import { taskDraft } from '../src/features/tasks/form';
import { groupTasks } from '../src/features/tasks/grouping';
import { taskRowPresentation } from '../src/features/tasks/presentation';
import { taskArchiveSections, taskWorkspaceSections, type TaskWorkspaceSection } from '../src/features/tasks/workspace';
import type { RecurrenceDraft, TaskDraft, TaskListItem } from '../src/features/tasks/types';
import { pickerValue } from '../src/utils/calendar';
import { bundledMigrations, database } from './helpers/database';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const require = createRequire(import.meta.url);
const RepeatingRoute = require('../src/app/tasks/repeating').default as typeof screens.RepeatingTasksScreen;
const HistoryRoute = require('../src/app/tasks/history').default as typeof screens.TasksHistoryScreen;
const today = '2026-10-06';
const timestamp = pickerValue(today, '12:00').getTime();
const daily: RecurrenceDraft = { frequency: 'daily', interval: 1, weekdayMask: 2, monthDay: 6, month: 10, endDate: '' };
type App = Awaited<ReturnType<typeof mount>>;
async function initialized(t: TestContext) {
  t.mock.method(Date, 'now', () => timestamp);
  const fixture = database(); await migrate(fixture.db, bundledMigrations); seedDefaultCategories(fixture.db);
  t.after(() => fixture.sqlite.close());
  let clock = timestamp;
  const access = createTaskDataAccess(fixture.db, randomUUID, () => clock++);
  const create = (title: string, values: Partial<TaskDraft> = {}) => access.createTask({ ...taskDraft(), title, ...values });
  return { ...fixture, access, create };
}
function sections(app: App) { return app.find('SectionList').props.sections as TaskWorkspaceSection[]; }
function section(app: App, title: string) { return sections(app).find((entry) => entry.title === title)!; }
function noModal(app: App) { assert.ok(!app.nodes().some((node) => node.kind === 'Modal')); }
function row(f: Awaited<ReturnType<typeof initialized>>, item: TaskListItem) {
  const snapshot = f.access.read();
  return taskRowPresentation(item.task, item.occurrence, snapshot.recurrences, snapshot.categories, timestamp);
}
async function handoff(app: App, label: string) {
  await app.press(label); await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
}

test('fresh Tasks mount shows compact collapsed Earlier/Upcoming, expanded local Today and five To-do items', async (t) => {
  const f = await initialized(t); f.create('Earlier item', { date: '2026-10-05' }); f.create('Today item', { date: today });
  f.create('Future item', { date: '2026-10-07' }); const completed = f.create('Archived item'); f.access.setCompleted(completed, true);
  for (let index = 1; index <= 12; index++) f.create(`To-do ${index}`);
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  assert.deepEqual(sections(app).map((entry) => entry.title), ['Earlier', 'Today', 'To-do', 'Upcoming']);
  assert.equal(section(app, 'Earlier').expanded, false); assert.equal(section(app, 'Earlier').total, 1); assert.equal(section(app, 'Earlier').data.length, 0);
  assert.equal(section(app, 'Upcoming').expanded, false); assert.equal(section(app, 'Upcoming').total, 1); assert.equal(section(app, 'Upcoming').data.length, 0);
  assert.equal(section(app, 'Today').expanded, true); assert.equal(section(app, 'Today').data.length, 1);
  assert.equal(section(app, 'To-do').data.length, 5); assert.equal(section(app, 'To-do').total, 12);
  assert.ok(app.container.textContent.includes(new Date(timestamp).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })));
  for (const value of ['Earlier item', 'Future item', 'Archived item', 'Completed', 'No date', 'need attention']) assert.ok(!app.container.textContent.includes(value));
  const disclosure = app.find('Pressable', 'Earlier, 1 tasks');
  assert.equal(disclosure.props.accessibilityRole, 'button'); assert.deepEqual(disclosure.props.accessibilityState, { expanded: false, disabled: false });
  assert.equal(disclosure.childNodes.filter((node) => node.kind === 'ThemedText').length, 1, 'No secondary warning sentence');
  assert.ok(app.find('FormButton', 'View all 12')); noModal(app);
});

test('Earlier expands/collapses with exact count while recurring Missed keeps governing metadata and correction actions', async (t) => {
  const f = await initialized(t); f.create('Earlier one-time', { date: '2026-10-05' });
  const id = f.create('Earlier recurring', { date: '2026-10-04', recurrence: daily, priority: 'high' });
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  const count = groupTasks(f.access.read().items, today).find((entry) => entry.title === 'Earlier')!.data.length;
  assert.equal(section(app, 'Earlier').total, count); await app.tapSet(`Earlier, ${count} tasks`);
  assert.equal(section(app, 'Earlier').data.length, count); assert.ok(app.container.textContent.includes('Missed')); assert.ok(!app.container.textContent.includes('Overdue'));
  const item = section(app, 'Earlier').data.find((entry) => entry.task.id === id)!; const presentation = row(f, item);
  assert.ok(presentation.accessibilityLabel.includes('Every day')); assert.ok(presentation.accessibilityLabel.includes('High priority'));
  await app.press(`Actions for ${presentation.actionSubject}`); await app.press('Skip occurrence');
  assert.equal(section(app, 'Earlier').total, count - 1); assert.equal(f.access.read().occurrences.find((entry) => entry.id === item.key)!.status, 'skipped');
  await app.tapSet(`Earlier, ${count - 1} tasks`); assert.equal(section(app, 'Earlier').expanded, false); assert.equal(section(app, 'Earlier').data.length, 0);
});

test('Today renders one-time and recurring items with rich metadata; completion leaves the active workspace and History can reopen', async (t) => {
  const f = await initialized(t); const category = f.access.createCategory('Personal health');
  f.create('Today one-time', { date: today, time: '09:00', priority: 'high', categoryId: category.id });
  f.create('Today recurring', { date: today, time: '18:00', recurrence: daily });
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  assert.equal(section(app, 'Today').data.length, 2);
  const item = section(app, 'Today').data.find((entry) => !entry.occurrence)!; const presentation = row(f, item);
  for (const text of ['Today', '09:00', 'High priority', 'Personal health', 'Every day']) assert.ok(app.container.textContent.includes(text));
  await app.tapSet(`Complete ${presentation.actionSubject}`); assert.equal(section(app, 'Today').data.length, 1);
  const archive = await mount(createElement(HistoryRoute), f.db);
  assert.ok(archive.find('Pressable', `Reopen ${presentation.actionSubject}`)); await archive.tapSet(`Reopen ${presentation.actionSubject}`);
  assert.equal(sections(archive).length, 0); await archive.unmount(); await app.refocus(); assert.equal(section(app, 'Today').data.length, 2);
});

test('To-do preserves authoritative undated ordering through View all and Show less', async (t) => {
  const f = await initialized(t); for (let index = 0; index < 12; index++) f.create(`Item ${index}`, { priority: index % 2 ? 'high' : 'low' });
  f.create('Dated', { date: today });
  const expected = groupTasks(f.access.read().items, today).find((entry) => entry.title === 'No date')!.data.map((item) => item.key);
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  assert.deepEqual(section(app, 'To-do').data.map((item) => item.key), expected.slice(0, 5));
  await app.press('View all 12'); assert.deepEqual(section(app, 'To-do').data.map((item) => item.key), expected);
  assert.ok(!section(app, 'To-do').data.some((item) => item.task.title === 'Dated'));
  await app.press('Show less'); assert.deepEqual(section(app, 'To-do').data.map((item) => item.key), expected.slice(0, 5));
});

test('at most five To-do items do not expose an unnecessary expand control', async (t) => {
  const f = await initialized(t); for (let index = 0; index < 5; index++) f.create(`Item ${index}`);
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  assert.equal(section(app, 'To-do').data.length, 5);
  assert.ok(!app.nodes().some((node) => node.kind === 'FormButton' && /View all|Show less/.test(String(node.props.label))));
});

test('editing an undated To-do date schedules it; removing Date returns it to To-do and clears Time', async (t) => {
  const f = await initialized(t); const id = f.create('Schedule me');
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  let item = section(app, 'To-do').data[0]; await app.tapSet(row(f, item).accessibilityLabel);
  await app.change('Date', today); await app.change('Time', '14:30'); await app.press('Save');
  assert.equal(section(app, 'To-do').total, 0); assert.equal(section(app, 'Today').total, 1);
  item = section(app, 'Today').data[0]; await app.tapSet(row(f, item).accessibilityLabel); await app.change('Date', ''); await app.press('Save');
  assert.equal(section(app, 'Today').total, 0); assert.equal(section(app, 'To-do').total, 1);
  assert.equal(f.access.read().tasks.find((task) => task.id === id)!.date, null); assert.equal(f.access.read().tasks.find((task) => task.id === id)!.time, null);
});

test('Upcoming count and expansion keep one future occurrence per series plus every one-time task; Calendar is quiet navigation', async (t) => {
  const f = await initialized(t); const first = f.create('Daily future', { date: '2026-10-07', recurrence: daily });
  const second = f.create('Weekly future', { date: '2026-10-07', recurrence: { ...daily, frequency: 'weekly', weekdayMask: 4 } });
  f.create('One-time A', { date: '2026-10-08' }); f.create('One-time B', { date: '2026-10-09' });
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  assert.equal(section(app, 'Upcoming').total, 4); assert.equal(section(app, 'Upcoming').data.length, 0);
  await app.tapSet('Upcoming, 4 tasks'); assert.equal(section(app, 'Upcoming').data.length, 4);
  for (const id of [first, second]) assert.equal(section(app, 'Upcoming').data.filter((item) => item.task.id === id).length, 1);
  const pending = section(app, 'Upcoming').data.find((item) => item.task.id === first)!;
  await app.tapSet(`Complete ${row(f, pending).actionSubject}`);
  const next = section(app, 'Upcoming').data.find((item) => item.task.id === first)!;
  assert.notEqual(next.key, pending.key); assert.ok(next.occurrence!.scheduledDate > pending.occurrence!.scheduledDate);
  await app.press(`Actions for ${row(f, next).actionSubject}`); await app.press('Skip occurrence');
  assert.ok(section(app, 'Upcoming').data.find((item) => item.task.id === first)!.occurrence!.scheduledDate > next.occurrence!.scheduledDate);
  assert.equal(section(app, 'Upcoming').total, 4); assert.equal(app.find('FormButton', 'View in Calendar').props.variant, 'quiet');
  await app.press('View in Calendar'); assert.deepEqual(runtime.fixture.navigation.at(-1), { method: 'navigate', target: '/(tabs)/calendar' });
  await app.tapSet('Upcoming, 4 tasks'); assert.equal(section(app, 'Upcoming').data.length, 0);
});

test('header management is available only through Task options; Categories keeps its existing creation/deletion flow', async (t) => {
  const f = await initialized(t); const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  for (const label of ['Add task', 'Categories', 'Repeating Tasks', 'History']) assert.ok(!app.nodes().some((node) => node.kind === 'FormButton' && node.props.label === label));
  const menu = app.find('FormButton', 'Task options'); assert.equal(menu.props.variant, 'quiet'); await app.press('Task options');
  for (const label of ['Categories', 'Repeating Tasks', 'History']) assert.equal(app.find('FormButton', label).props.variant, 'quiet');
  await handoff(app, 'Categories'); await app.change('Category name', 'New category'); await app.press('Create category');
  const category = f.access.read().categories.find((item) => item.name === 'New category')!; assert.ok(category);
  await app.press('Delete category New category'); assert.equal(runtime.fixture.alerts.at(-1)!.title, 'Delete category?'); await app.confirm('Cancel');
  assert.ok(f.access.read().categories.some((item) => item.id === category.id)); await app.press('Back'); noModal(app);
});

for (const [label, target, Route] of [['Repeating Tasks', '/tasks/repeating', RepeatingRoute], ['History', '/tasks/history', HistoryRoute]] as const) {
  test(`${label} is a pushed full-screen route; Back retains main collapse/preview state and list identity`, async (t) => {
    const f = await initialized(t); f.create('Earlier', { date: '2026-10-05' }); f.create('Future', { date: '2026-10-07' });
    for (let index = 0; index < 6; index++) f.create(`To-do ${index}`);
    const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
    await app.tapSet('Earlier, 1 tasks'); await app.tapSet('Upcoming, 1 tasks'); await app.press('View all 6'); const list = app.find('SectionList');
    await app.press('Task options'); await handoff(app, label); assert.deepEqual(runtime.fixture.navigation.at(-1), { method: 'push', target }); noModal(app);
    const pushed = await mount(createElement(Route), f.db); noModal(pushed);
    assert.ok(pushed.find('FormButton', 'Back to Tasks')); assert.ok(!pushed.nodes().some((node) => node.props?.accessibilityLabel === 'Add task'));
    assert.ok(pushed.nodes().some((node) => node.kind === 'ThemedText' && node.props.type === 'screenTitle' && node.textContent === label));
    await pushed.press('Back to Tasks'); assert.deepEqual(runtime.fixture.navigation.at(-1), { method: 'back' }); await pushed.unmount(); await app.refocus();
    assert.equal(app.find('SectionList'), list); assert.equal(section(app, 'Earlier').expanded, true); assert.equal(section(app, 'Upcoming').expanded, true);
    assert.equal(section(app, 'To-do').data.length, 6); assert.ok(app.find('FormButton', 'Show less'));
  });
}

test('subroute deep-link Back falls back to Tasks when no prior screen exists', async (t) => {
  const f = await initialized(t); const navigation = (runtime.router as { router: { canGoBack: () => boolean } }).router;
  t.mock.method(navigation, 'canGoBack', () => false);
  const app = await mount(createElement(HistoryRoute), f.db); t.after(app.unmount); await app.press('Back to Tasks');
  assert.deepEqual(runtime.fixture.navigation.at(-1), { method: 'replace', target: '/(tabs)/tasks' });
});

test('iOS anchored overflow closes before pushing a route without a native modal handoff', async (t) => {
  const f = await initialized(t); const platform = (runtime.native as { Platform: { OS: string } }).Platform;
  const previous = platform.OS; platform.OS = 'ios'; t.after(() => { platform.OS = previous; });
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount); await app.press('Task options');
  noModal(app); await handoff(app, 'History'); noModal(app);
  assert.equal(app.find('FormButton', 'Task options').props.expanded, false);
  assert.deepEqual(runtime.fixture.navigation.at(-1), { method: 'push', target: '/tasks/history' });
});

test('History contains exactly the previously resolved groups and corrections remove reopened items', async (t) => {
  const f = await initialized(t); const once = f.create('Old completed', { date: '2020-01-01' }); f.access.setCompleted(once, true);
  f.create('Pending today', { date: today }); const id = f.create('Recurring', { date: '2026-10-04', recurrence: daily });
  const occurrences = f.access.read().occurrences.filter((entry) => entry.taskId === id);
  const completed = occurrences.find((entry) => entry.scheduledDate === '2026-10-04')!;
  const skipped = occurrences.find((entry) => entry.scheduledDate === '2026-10-05')!;
  f.access.setOccurrenceStatus(completed.id, 'completed'); f.access.setOccurrenceStatus(skipped.id, 'skipped');
  const expected = groupTasks(f.access.read().items, today).filter((entry) => ['Completed', 'Skipped'].includes(entry.title));
  const app = await mount(createElement(HistoryRoute), f.db); t.after(app.unmount);
  assert.deepEqual(sections(app).map((entry) => ({ title: entry.title, keys: entry.data.map((item) => item.key) })), expected.map((entry) => ({ title: entry.title, keys: entry.data.map((item) => item.key) })));
  assert.ok(app.container.textContent.includes('Old completed')); assert.ok(!app.container.textContent.includes('Pending today'));
  const done = section(app, 'Completed').data.find((item) => item.key === completed.id)!;
  await app.tapSet(`Reopen ${row(f, done).actionSubject}`); assert.ok(!sections(app).some((entry) => entry.data.some((item) => item.key === completed.id)));
  const skip = section(app, 'Skipped').data[0]; await app.press(`Actions for ${row(f, skip).actionSubject}`); await app.press('Return to pending');
  assert.ok(!sections(app).some((entry) => entry.title === 'Skipped'));
  assert.equal(f.access.read().occurrences.find((entry) => entry.id === completed.id)!.status, 'pending');
  assert.equal(f.access.read().occurrences.find((entry) => entry.id === skipped.id)!.status, 'pending');
});

test('Repeating Tasks is full-screen content and retains schedule edit, stopped series, History and confirmed Delete', async (t) => {
  const f = await initialized(t); const id = f.create('Series', { date: today, recurrence: daily });
  const stopped = f.create('Stopped series', { date: today, recurrence: daily }); f.access.stopRepeating(stopped);
  const app = await mount(createElement(RepeatingRoute), f.db); t.after(app.unmount); noModal(app);
  for (const text of ['Series', 'Stopped series', 'Current schedule', 'Every day']) assert.ok(app.container.textContent.includes(text));
  await app.press('Edit schedule for Series'); await app.press('Edit recurrence'); await app.change('Every', '3'); await app.press('Back to task editor'); await app.press('Save'); noModal(app);
  assert.ok(app.container.textContent.includes('Every 3 days')); await app.press('History for Series'); assert.ok(app.container.textContent.includes('Series · History'));
  await app.press('Back'); await app.press('Delete recurring task Series'); assert.ok(f.access.read().tasks.some((entry) => entry.id === id)); await app.confirm('Cancel');
  await app.press('Delete recurring task Series'); await app.confirm('Delete'); assert.ok(!f.access.read().tasks.some((entry) => entry.id === id)); noModal(app);
});

test('floating Add task reserves scroll clearance inside tab-aware safe bounds and creates through the existing editor', async (t) => {
  const f = await initialized(t); const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  const fab = app.find('Pressable', 'Add task'); assert.equal(fab.props.accessibilityRole, 'button'); assert.deepEqual(fab.props.accessibilityState, { disabled: false });
  const style = Object.assign({}, ...(fab.props.style as (state: unknown) => unknown[])({ pressed: false })) as { width: number; height: number; bottom: number; borderRadius: number };
  assert.ok(style.width >= 44 && style.height >= 44); assert.equal(style.width, style.height); assert.equal(style.borderRadius, style.width / 2);
  const padding = Object.assign({}, ...(app.find('SectionList').props.contentContainerStyle as object[])) as { paddingBottom: number };
  assert.ok(padding.paddingBottom >= style.height + style.bottom, 'Last content clears the floating control');
  assert.deepEqual(app.find('SafeAreaView').props.edges, { top: true, bottom: true, left: true, right: true });
  assert.equal(app.find('SectionList').props.contentInsetAdjustmentBehavior, 'never', 'Safe-area handling is not applied twice');
  await app.tapSet('Add task'); assert.ok(app.find('FormField', 'Title *')); await app.change('Title *', 'Created To-do'); await app.press('Save'); noModal(app);
  assert.equal(section(app, 'To-do').data[0].task.title, 'Created To-do');
});

test('failed refresh preserves disclosure/preview state, mounted list, editor and recurrence draft through Retry', async (t) => {
  const f = await initialized(t); f.create('Earlier', { date: '2026-10-05' }); f.create('Future', { date: '2026-10-07' });
  for (let index = 0; index < 6; index++) f.create(`To-do ${index}`);
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  await app.tapSet('Earlier, 1 tasks'); await app.tapSet('Upcoming, 1 tasks'); await app.press('View all 6'); const list = app.find('SectionList');
  await app.tapSet('Add task'); await app.change('Title *', 'Unsaved'); await app.press('Add recurrence');
  await act(() => (app.find('SelectField', 'Repeats').props.onChange as (value: string) => void)('daily')); await app.change('Every', '3');
  const modal = app.find('Modal'); const interval = app.find('FormField', 'Every'); runtime.fixture.failures.add('tasks.read'); await app.resume();
  assert.equal(app.find('SectionList'), list); assert.equal(app.find('Modal'), modal); assert.equal(app.find('FormField', 'Every'), interval);
  assert.equal(section(app, 'Earlier').expanded, true); assert.equal(section(app, 'Upcoming').expanded, true); assert.equal(section(app, 'To-do').data.length, 6);
  runtime.fixture.failures.clear(); await app.press('Retry'); await app.press('Back to task editor'); assert.equal(app.find('FormField', 'Title *').props.value, 'Unsaved'); await app.press('Save');
  assert.equal(section(app, 'To-do').data.length, 6); assert.equal(app.find('SectionList'), list);
});

test('presentation selectors preserve source ordering, resolved groups and future outcomes without changing persistence', async (t) => {
  const f = await initialized(t); f.create('To-do'); f.create('Dated', { date: today });
  const items = f.access.read().items; const before = structuredClone(items);
  const projected = taskWorkspaceSections(items, today, { earlier: true, upcoming: true, todo: true });
  assert.deepEqual(projected.find((entry) => entry.title === 'To-do')!.data, groupTasks(items, today).find((entry) => entry.title === 'No date')!.data);
  assert.deepEqual(taskArchiveSections(items, today), []); assert.deepEqual(items, before);
});

test('Tasks subroutes live above native tabs in the root stack and tab safe-area handling is explicit', () => {
  const root = readFileSync(new URL('../src/app/_layout.tsx', import.meta.url), 'utf8');
  for (const route of ['tasks/repeating', 'tasks/history']) assert.ok(root.includes(`name="${route}" options={{ headerShown: false, presentation: 'card' }}`));
  const tabs = readFileSync(new URL('../src/components/app-tabs.tsx', import.meta.url), 'utf8');
  assert.ok(tabs.includes('name="tasks" disableTransparentOnScrollEdge disableAutomaticContentInsets'));
  assert.ok(!tabs.includes('tasks/repeating') && !tabs.includes('tasks/history'));
});

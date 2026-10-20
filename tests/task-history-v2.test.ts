/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { taskOccurrences, taskRecurrences, tasks } from '../src/database/schema';
import { seedDefaultCategories } from '../src/database/seed';
import { createTaskDataAccess } from '../src/features/tasks/data';
import { taskDraft } from '../src/features/tasks/form';
import { taskRowPresentation } from '../src/features/tasks/presentation';
import { taskArchiveSections } from '../src/features/tasks/workspace';
import type { TaskDraft, TaskListItem } from '../src/features/tasks/types';
import { pickerValue } from '../src/utils/calendar';
import { bundledMigrations, database } from './helpers/database';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const today = '2026-10-20', timestamp = pickerValue(today, '12:00').getTime();
const daily = { frequency: 'daily' as const, interval: 1, weekdayMask: 1, monthDay: 20, month: 10, endDate: '' };
type App = Awaited<ReturnType<typeof mount>>;
async function fixture(t: TestContext) {
  t.mock.method(Date, 'now', () => timestamp);
  const f = database(); await migrate(f.db, bundledMigrations); seedDefaultCategories(f.db); t.after(() => f.sqlite.close());
  let clock = timestamp;
  const access = createTaskDataAccess(f.db, randomUUID, () => clock++);
  return { ...f, access, create: (title: string, values: Partial<TaskDraft> = {}) => access.createTask({ ...taskDraft(), title, ...values }) };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
async function show(t: TestContext, f: Fixture) { const app = await mount(createElement(screens.TasksHistoryScreen), f.db); t.after(app.unmount); return app; }
const sections = (app: App) => app.find('SectionList').props.sections as ReturnType<typeof taskArchiveSections>;
const items = (app: App) => sections(app).flatMap(section => section.data);
function presentation(f: Fixture, item: TaskListItem) { const s = f.access.read(); return taskRowPresentation(item.task, item.occurrence, s.recurrences, s.categories, timestamp); }
async function handoff(app: App, label: string) { await app.press(label); await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); }); }
function card(app: App, key: string) { return app.nodes().find(node => node.props?.testID === `task-history-row-${key}`)!; }
function style(value: unknown): Record<string, unknown> { return Object.assign({}, ...[value].flat(Infinity).filter(part => typeof part === 'object' && part)); }

for (const theme of ['light', 'dark']) test(`${theme}: History preserves Completed/Skipped groups and source ordering with non-struck readable records`, async t => {
  t.mock.method(runtime.native as { useColorScheme: () => string }, 'useColorScheme', () => theme);
  const f = await fixture(t); const once = f.create('Undated'); f.access.setCompleted(once, true);
  const series = f.create('Series', { date: '2026-10-17', recurrence: daily });
  const occurrences = f.access.read().occurrences.filter(row => row.taskId === series);
  f.access.setOccurrenceStatus(occurrences[0].id, 'completed'); f.access.setOccurrenceStatus(occurrences[1].id, 'skipped');
  f.create('Unresolved', { date: '2026-10-18' }); const hidden = f.create('Deleted'); f.access.setCompleted(hidden, true); f.access.deleteTask(hidden);
  const expected = taskArchiveSections(f.access.read().items, today); const app = await show(t, f);
  assert.deepEqual(sections(app).map(s => [s.title, s.data.map(item => item.key)]), expected.map(s => [s.title, s.data.map(item => item.key)]));
  assert.ok(app.nodes().some(node => node.props?.accessibilityLabel === 'Completed, 2 records'));
  assert.ok(app.nodes().some(node => node.props?.accessibilityLabel === 'Skipped, 1 record'));
  assert.ok(!app.container.textContent.includes('Unresolved')); assert.ok(!app.container.textContent.includes('Deleted'));
  for (const item of items(app)) {
    const record = card(app, item.key); assert.ok(record); assert.notEqual(record.props.accessibilityRole, 'button');
    const title = app.nodes(record).find(node => node.kind === 'ThemedText' && node.textContent === item.task.title)!;
    assert.ok(title); assert.notEqual(style(title.props.style).textDecorationLine, 'line-through');
    const display = presentation(f, item); const details = app.find('Pressable', display.accessibilityLabel);
    assert.equal(details.props.accessibilityRole, 'button'); assert.equal(details.props.accessibilityHint, 'Opens the task editor');
    assert.ok(record.textContent.includes(display.outcome));
    const checkbox = app.find('Pressable', `${display.completed ? 'Reopen' : 'Complete'} ${display.actionSubject}`);
    assert.equal(checkbox.props.accessibilityRole, 'checkbox'); assert.deepEqual(checkbox.props.accessibilityState, { checked: display.completed });
  }
  assert.equal(app.nodes().filter(node => node.kind === 'Modal').length, 0);
});

test('date/time remain scheduled metadata; undated and one-time records omit irrelevant lines and archived categories', async t => {
  const f = await fixture(t); const category = f.access.createCategory('Private category');
  const dated = f.create('Dated', { date: '2026-10-12', time: '08:30', priority: 'high', categoryId: category.id, description: 'Keep this description' });
  const undated = f.create('Undated'); f.access.setCompleted(dated, true); f.access.setCompleted(undated, true); f.access.deleteCategory(category.id);
  const app = await show(t, f); const item = items(app).find(item => item.key === dated)!; const display = presentation(f, item);
  assert.ok(card(app, dated).textContent.includes(display.visibleDate!)); assert.ok(!card(app, dated).textContent.includes('Today'));
  assert.ok(card(app, dated).textContent.includes('High priority')); assert.ok(card(app, dated).textContent.includes('Keep this description'));
  assert.ok(!card(app, dated).textContent.includes('Private category')); assert.ok(!card(app, dated).textContent.includes('Uncategorized'));
  assert.ok(!card(app, undated).textContent.includes('No date')); assert.ok(!card(app, undated).textContent.includes('Repeats'));
  assert.ok(!app.nodes(card(app, undated)).some(node => node.props?.testID === 'ui-icon-calendar' || node.props?.testID === 'ui-icon-repeat'));
});

test('recurring History uses the occurrence schedule version rather than the latest edited series rule', async t => {
  const f = await fixture(t); const id = f.create('Versioned', { date: '2026-10-12', recurrence: daily });
  const before = f.access.read(); const occurrence = before.occurrences.find(row => row.taskId === id)!;
  f.access.setOccurrenceStatus(occurrence.id, 'completed');
  f.access.editTask(id, { ...taskDraft(before.tasks.find(row => row.id === id), before.recurrences.find(row => row.taskId === id)), recurrence: { ...daily, interval: 3 } });
  const app = await show(t, f); assert.ok(card(app, occurrence.id).textContent.includes('Every day')); assert.ok(!card(app, occurrence.id).textContent.includes('Every 3 days'));
});

test('one-time History preserves details editing, checkbox reopen, native Delete/Cancel and refresh to Tasks main', async t => {
  const f = await fixture(t); const id = f.create('Report', { date: today }); f.access.setCompleted(id, true);
  const app = await show(t, f); const display = presentation(f, items(app)[0]);
  await app.tapSet(display.accessibilityLabel); await app.change('Title *', 'Updated report'); await app.press('Save');
  assert.equal(f.access.read().tasks[0].title, 'Updated report');
  const updated = presentation(f, items(app)[0]); await app.press(`Actions for ${updated.actionSubject}`);
  assert.ok(app.find('FormButton', 'Edit task')); assert.ok(app.find('FormButton', 'Delete task')); assert.ok(!app.nodes().some(node => node.props?.label === 'View History'));
  assert.equal(app.find('SectionList').props.scrollEnabled, false);
  await handoff(app, 'Delete task'); assert.equal(app.find('SectionList').props.scrollEnabled, true);
  assert.ok(!app.nodes().some(node => node.props?.label === 'Delete task')); await app.confirm('Cancel'); assert.equal(items(app).length, 1);
  await app.tapSet(`Reopen ${updated.actionSubject}`); assert.equal(items(app).length, 0); await app.unmount();
  const main = await mount(createElement(screens.TasksScreen), f.db); t.after(main.unmount); assert.ok(main.container.textContent.includes('Updated report'));
  f.access.setCompleted(id, true); await main.unmount();
  const archive = await show(t, f); await archive.press(`Actions for ${updated.actionSubject}`); await handoff(archive, 'Delete task'); await archive.confirm('Delete');
  assert.equal(items(archive).length, 0); assert.equal(typeof f.db.select().from(tasks).where(eq(tasks.id, id)).get()!.deletedAt, 'number');
});

test('recurring actions retain editing, per-series History, completed Skip exclusion and confirmed parent-only deletion', async t => {
  const f = await fixture(t); const id = f.create('Daily', { date: today, recurrence: daily }); const initial = f.access.read();
  const occurrence = initial.occurrences.find(row => row.taskId === id && row.scheduledDate === today)!; f.access.setOccurrenceStatus(occurrence.id, 'completed');
  const app = await show(t, f); const subject = presentation(f, items(app)[0]).actionSubject;
  await app.press(`Actions for ${subject}`); assert.ok(!app.nodes().some(node => node.props?.label === 'Skip occurrence' || node.props?.label === 'Return to pending'));
  await handoff(app, 'Edit recurring task'); assert.ok(app.find('FormField', 'Title *')); await app.press('Cancel');
  await app.press(`Actions for ${subject}`); await handoff(app, 'View History'); assert.ok(app.container.textContent.includes('Daily · History')); await app.press('Back');
  const outcomes = f.db.select().from(taskOccurrences).all().length, rules = f.db.select().from(taskRecurrences).all().length;
  await app.press(`Actions for ${subject}`); await handoff(app, 'Delete recurring task'); await app.confirm('Delete');
  assert.equal(items(app).length, 0); assert.equal(f.db.select().from(taskOccurrences).all().length, outcomes); assert.equal(f.db.select().from(taskRecurrences).all().length, rules);
});

test('skipped records retain Complete and Return to pending; outside dismissal unlocks scrolling and restores context', async t => {
  const f = await fixture(t); const id = f.create('Skipped series', { date: today, recurrence: daily }); const entry = f.access.read().occurrences.find(row => row.taskId === id)!;
  f.access.setOccurrenceStatus(entry.id, 'skipped'); const app = await show(t, f); const subject = presentation(f, items(app)[0]).actionSubject;
  await app.press(`Actions for ${subject}`); await app.tapSet(`Close actions for ${subject.toLowerCase()}`); assert.equal(app.find('SectionList').props.scrollEnabled, true);
  await app.tapSet(`Complete ${subject}`); assert.equal(sections(app)[0].title, 'Completed');
  await app.tapSet(`Reopen ${subject}`); assert.equal(items(app).length, 0);
  f.access.setOccurrenceStatus(entry.id, 'skipped'); await app.refocus(); await app.press(`Actions for ${subject}`); await handoff(app, 'Return to pending');
  assert.equal(items(app).length, 0); assert.equal(f.access.read().occurrences.find(row => row.id === entry.id)!.status, 'pending');
});

for (const state of ['empty', 'completed', 'skipped'] as const) test(`${state}: archive omits absent groups, unnecessary CTA and invented Load More`, async t => {
  const f = await fixture(t); if (state !== 'empty') {
    const id = f.create('Record', { date: today, recurrence: state === 'skipped' ? daily : null });
    if (state === 'completed') f.access.setCompleted(id, true); else f.access.setOccurrenceStatus(f.access.read().occurrences[0].id, 'skipped');
  }
  const app = await show(t, f); assert.deepEqual(sections(app).map(s => s.title), state === 'empty' ? [] : [state === 'completed' ? 'Completed' : 'Skipped']);
  assert.equal(app.container.textContent.includes('No completed tasks yet.'), state === 'empty');
  assert.ok(!app.nodes().some(node => node.props?.label === 'Load more' || node.props?.label === 'Load older history' || node.props?.label === 'Add task'));
});

for (const [width, fontScale] of [[320, 1], [390, 1], [430, 1], [320, 2], [844, 2]] as const) test(`archive wraps long names/metadata with reachable subject actions at ${width}/font ${fontScale}`, async t => {
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width, height: 844, scale: 1, fontScale }));
  const f = await fixture(t); const name = 'A long historical task for personal responsibilities and weekly planning'; const id = f.create(name, { date: '2026-10-18', recurrence: daily });
  const entry = f.access.read().occurrences.find(row => row.taskId === id)!; f.access.setOccurrenceStatus(entry.id, 'completed'); const app = await show(t, f);
  const display = presentation(f, items(app)[0]); assert.ok(app.find('FormButton', `Actions for ${display.actionSubject}`));
  const title = app.nodes(card(app, entry.id)).find(node => node.kind === 'ThemedText' && node.textContent === name)!;
  assert.equal(title.props.numberOfLines, undefined); assert.ok(card(app, entry.id).textContent.includes('Every day'));
  const details = app.find('Pressable', display.accessibilityLabel); if (fontScale >= 1.5) assert.equal(style(details.props.style).flexBasis, 'auto');
  const badges = app.nodes(card(app, entry.id)).filter(node => node.props?.testID === `task-history-status-${entry.id}`);
  assert.equal(badges.length, 1, 'Responsive positioning keeps one visible status');
  assert.equal(app.nodes(details).includes(badges[0]), width === 320 || fontScale >= 1.5, 'Wide rows move status beside details; narrow/large rows retain it inside');
  assert.notEqual(badges[0].props.accessibilityRole, 'button');
  assert.ok(String(details.props.accessibilityLabel).includes('Completed'), 'Status remains announced by details when the badge moves');
  const reopen = app.find('Pressable', `Reopen ${display.actionSubject}`); assert.deepEqual(reopen.props.accessibilityState, { checked: true });
});

test('large archive counts all supplied records with stable keys, source ordering and bounded SectionList configuration', async t => {
  const f = await fixture(t); for (let index = 0; index < 125; index++) { const id = f.create(`Record ${index}`); f.access.setCompleted(id, true); }
  const app = await show(t, f); const list = app.find('SectionList'); assert.equal(items(app).length, 125);
  assert.ok(app.nodes().some(node => node.props?.accessibilityLabel === 'Completed, 125 records'));
  const key = list.props.keyExtractor as (item: TaskListItem) => string; assert.equal(new Set(items(app).map(key)).size, 125);
  assert.equal(items(app)[0].task.title, 'Record 124'); assert.equal(items(app).at(-1)!.task.title, 'Record 0');
  assert.equal(list.props.initialNumToRender, 8); assert.equal(list.props.maxToRenderPerBatch, 8); assert.equal(list.props.windowSize, 5); assert.equal(list.props.getItemLayout, undefined);
  assert.equal(app.nodes().filter(node => node.kind === 'ScrollView').length, 0);
});

test('History retains its existing snapshot range while per-series History keeps three incremental date pages without gaps or duplicates', async t => {
  const f = await fixture(t); const id = f.create('Old series', { date: '2026-07-01', recurrence: daily });
  const first = f.access.readHistory(id), second = f.access.readHistory(id, first.nextBefore!), third = f.access.readHistory(id, second.nextBefore!);
  const entries = [...first.occurrences, ...second.occurrences, ...third.occurrences]; assert.equal(new Set(entries.map(row => row.id)).size, entries.length);
  assert.equal(first.occurrences.length, 30); assert.equal(second.occurrences.length, 30); assert.equal(third.occurrences.length, 30);
  assert.equal(first.occurrences.at(-1)!.scheduledDate, first.nextBefore); assert.ok(second.occurrences[0].scheduledDate < first.nextBefore!);
  for (let i = 1; i < entries.length; i++) assert.equal(pickerValue(entries[i - 1].scheduledDate, '12:00').getTime() - pickerValue(entries[i].scheduledDate, '12:00').getTime(), 86400000);
  f.access.setOccurrenceStatus(third.occurrences[0].id, 'completed');
  const once = f.create('Old one time', { date: '2020-01-01' }); f.access.setCompleted(once, true); const app = await show(t, f);
  assert.deepEqual(items(app).map(item => item.key), [once]);
  assert.equal(f.access.readHistory(id, second.nextBefore!).occurrences[0].status, 'completed');
});

test('failed History refresh retains archive, open editor and draft through Retry; Back retains pushed navigation', async t => {
  const f = await fixture(t); const id = f.create('Draft'); f.access.setCompleted(id, true); const app = await show(t, f); const list = app.find('SectionList');
  await app.tapSet(presentation(f, items(app)[0]).accessibilityLabel); await app.change('Title *', 'Unsaved edit'); const field = app.find('FormField', 'Title *');
  runtime.fixture.failures.add('tasks.read'); await app.resume(); assert.equal(app.find('SectionList'), list); assert.equal(app.find('FormField', 'Title *'), field); assert.equal(field.props.value, 'Unsaved edit');
  runtime.fixture.failures.clear(); await app.press('Retry'); assert.equal(app.find('FormField', 'Title *'), field); await app.press('Save'); assert.equal(f.access.read().tasks[0].title, 'Unsaved edit');
  await app.press('Back to Tasks'); assert.equal(runtime.fixture.navigation.at(-1)!.method, 'back');
});

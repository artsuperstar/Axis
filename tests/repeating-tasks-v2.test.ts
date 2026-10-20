/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { tasks, taskOccurrences, taskRecurrences } from '../src/database/schema';
import { seedDefaultCategories } from '../src/database/seed';
import { createTaskDataAccess } from '../src/features/tasks/data';
import { taskDraft } from '../src/features/tasks/form';
import { latestRecurrence } from '../src/features/tasks/recurrence';
import type { TaskDraft } from '../src/features/tasks/types';
import { pickerValue } from '../src/utils/calendar';
import { bundledMigrations, database } from './helpers/database';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const { recurringTaskSections } = createRequire(import.meta.url)('../src/features/tasks/components/recurring-tasks') as typeof import('../src/features/tasks/components/recurring-tasks');
const today = '2026-10-19', timestamp = pickerValue(today, '12:00').getTime();
const daily = { frequency: 'daily' as const, interval: 1, weekdayMask: 1, monthDay: 19, month: 10, endDate: '' };
type App = Awaited<ReturnType<typeof mount>>;
async function fixture(t: TestContext) {
  t.mock.method(Date, 'now', () => timestamp);
  const f = database(); await migrate(f.db, bundledMigrations); seedDefaultCategories(f.db); t.after(() => f.sqlite.close());
  const access = createTaskDataAccess(f.db, randomUUID, () => timestamp);
  return { ...f, access, create: (title: string, values: Partial<TaskDraft> = {}) => access.createTask({ ...taskDraft(), title, date: today, recurrence: daily, ...values }) };
}
async function show(t: TestContext, f: Awaited<ReturnType<typeof fixture>>) {
  const app = await mount(createElement(screens.RepeatingTasksScreen), f.db); t.after(app.unmount); return app;
}
async function handoff(app: App, label: string) { await app.press(label); await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); }); }
async function choose(app: App, label: string, value: unknown) { await act(() => (app.find('SelectField', label).props.onChange as (value: unknown) => void)(value)); }
type Sections = ReturnType<typeof recurringTaskSections>;
const sections = (app: App) => app.find('SectionList').props.sections as Sections;

for (const scheme of ['light', 'dark']) test(`${scheme}: Repeating Tasks groups one card per series with accurate counts and explicit stopped/subject labels`, async t => {
  t.mock.method(runtime.native as { useColorScheme: () => string }, 'useColorScheme', () => scheme);
  const f = await fixture(t); const first = f.create('Daily'); f.create('Weekly', { recurrence: { ...daily, frequency: 'weekly', weekdayMask: 1 | 4 | 32 } });
  const stopped = f.create('Stopped'); f.access.stopRepeating(stopped); f.create('One time', { recurrence: null });
  const app = await show(t, f); assert.deepEqual(sections(app).map(section => [section.title, section.data.length]), [['Active', 2], ['Stopped', 1]]);
  assert.ok(app.nodes().some(node => node.props?.accessibilityLabel === 'Active, 2 repeating tasks'));
  assert.ok(app.nodes().some(node => node.props?.accessibilityLabel === 'Stopped, 1 repeating task'));
  assert.ok(app.nodes().some(node => node.props?.accessibilityLabel === 'Stopped, Stopped repeating task'));
  assert.ok(app.container.textContent.includes('Every Mon, Wed & Sat'));
  const card = app.nodes().find(node => node.props?.testID === `repeating-task-${first}`)!; assert.notEqual(card.props.accessibilityRole, 'button');
  for (const name of ['Daily', 'Weekly', 'Stopped']) for (const action of ['Edit schedule', 'History']) {
    const button = app.find('FormButton', `${action} for ${name}`); assert.equal(button.props.appearance, 'v2'); assert.ok(!button.props.disabled);
  }
  assert.ok(!app.nodes().some(node => node.props?.accessibilityLabel === 'Delete recurring task Daily'));
  assert.equal(app.nodes().filter(node => node.kind === 'Modal').length, 0);
});

test('grouping selects the existing latest governing version, keeps source order and does not invent stopped state from an end date', async t => {
  const f = await fixture(t); const id = f.create('Versioned'); const ended = f.create('Ended', { date: '2026-10-01', recurrence: { ...daily, endDate: '2026-10-12' } });
  const before = f.access.read(); const currentOccurrence = before.occurrences.find(row => row.taskId === id && row.scheduledDate === today)!;
  f.access.editTask(id, { ...taskDraft(before.tasks.find(row => row.id === id), latestRecurrence(before.recurrences, id)), recurrence: { ...daily, interval: 3 } });
  const snapshot = f.access.read(); const groups = recurringTaskSections(snapshot.tasks, snapshot.recurrences);
  assert.equal(groups.length, 1); assert.equal(groups[0].title, 'Active');
  assert.deepEqual(groups[0].data.map(item => item.task.id), snapshot.tasks.map(task => task.id));
  assert.ok(groups[0].data.some(item => item.task.id === ended)); assert.equal(groups[0].data.find(item => item.task.id === id)!.rule.interval, 3);
  assert.equal(snapshot.occurrences.find(row => row.id === currentOccurrence.id)!.recurrenceId, currentOccurrence.recurrenceId);
  const app = await show(t, f); const card = app.nodes().find(node => node.props?.testID === `repeating-task-${id}`)!;
  assert.ok(card.textContent.includes('Every 3 days')); assert.ok(!card.textContent.includes('Every day'));
});

for (const state of ['none', 'active', 'stopped'] as const) test(`${state}: absent status groups do not create empty blocks or redundant creation controls`, async t => {
  const f = await fixture(t); if (state !== 'none') { const id = f.create('Only series'); if (state === 'stopped') f.access.stopRepeating(id); }
  const app = await show(t, f); assert.deepEqual(sections(app).map(section => section.title), state === 'none' ? [] : [state === 'active' ? 'Active' : 'Stopped']);
  assert.equal(app.container.textContent.includes('No repeating tasks yet.'), state === 'none');
  assert.ok(!app.nodes().some(node => node.props?.label === 'Create' || node.props?.accessibilityLabel === 'Add task'));
});

test('Edit schedule reuses the v2 editor; Stop/Cancel and resume retain the same task, today outcome and historical versions', async t => {
  const f = await fixture(t); const id = f.create('Manage'); const initial = f.access.read(); const current = initial.occurrences.find(row => row.scheduledDate === today)!;
  f.access.setOccurrenceStatus(current.id, 'completed'); const app = await show(t, f);
  await app.press('Edit schedule for Manage'); assert.equal(app.find('FormField', 'Title *').props.appearance, 'v2');
  assert.ok(app.nodes().some(node => node.props?.accessibilityRole === 'header' && node.textContent === 'Edit task'));
  await app.press('Stop repeating'); await app.confirm('Cancel'); assert.equal(sections(app)[0].title, 'Active');
  await app.press('Stop repeating'); await app.confirm('Stop repeating'); assert.equal(sections(app)[0].title, 'Stopped');
  assert.equal(f.access.read().occurrences.find(row => row.id === current.id)!.status, 'completed');
  await app.press('History for Manage'); assert.ok(app.container.textContent.includes('Manage · History')); await app.press('Back');
  await app.press('Edit schedule for Manage'); assert.ok(!app.nodes().some(node => node.props?.label === 'Stop repeating'));
  await app.press('Add recurrence'); assert.equal(app.find('SelectField', 'Repeats').props.appearance, 'v2');
  await choose(app, 'Repeats', 'weekly'); await app.press('Back to task editor'); await app.press('Save');
  assert.deepEqual(sections(app).map(section => section.title), ['Active']); assert.equal(f.access.read().tasks[0].id, id);
  assert.ok(f.db.select().from(taskRecurrences).where(eq(taskRecurrences.taskId, id)).all().length > initial.recurrences.length);
  assert.equal(f.access.read().occurrences.find(row => row.id === current.id)!.status, 'completed');
});

test('Delete is only in overflow, closes before confirmation, cancels safely and preserves stored versions/outcomes on confirmation', async t => {
  const f = await fixture(t); const id = f.create('Remove'); const before = f.access.read(); const versions = before.recurrences.length;
  const stored = f.db.select().from(taskOccurrences).where(eq(taskOccurrences.taskId, id)).all().length;
  const app = await show(t, f); await app.press('Options for repeating task Remove'); assert.equal(app.find('SectionList').props.scrollEnabled, false);
  await app.tapSet('Close options for repeating task remove'); assert.equal(app.find('SectionList').props.scrollEnabled, true);
  await app.press('Options for repeating task Remove'); await handoff(app, 'Delete recurring task Remove');
  assert.ok(!app.nodes().some(node => node.props?.accessibilityLabel === 'Delete recurring task Remove'));
  assert.match(runtime.fixture.alerts.at(-1)!.message, /History will remain stored/); await app.confirm('Cancel'); assert.equal(sections(app)[0].data.length, 1);
  await app.press('Options for repeating task Remove'); await handoff(app, 'Delete recurring task Remove'); await app.confirm('Delete');
  assert.equal(sections(app).length, 0); assert.equal(typeof f.db.select().from(tasks).where(eq(tasks.id, id)).get()!.deletedAt, 'number');
  assert.equal(f.db.select().from(taskRecurrences).where(eq(taskRecurrences.taskId, id)).all().length, versions);
  assert.equal(f.db.select().from(taskOccurrences).where(eq(taskOccurrences.taskId, id)).all().length, stored);
});

for (const [width, fontScale, row] of [[320, 1, false], [390, 1, true], [430, 1, true], [320, 2, false]] as const) test(`long titles, status and measured actions remain available at ${width}pt/font ${fontScale}`, async t => {
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width, height: 844, scale: 1, fontScale }));
  const f = await fixture(t); const name = 'A long repeating task for personal responsibilities and weekly planning'; const id = f.create(name); f.access.stopRepeating(id);
  const app = await show(t, f); let actionRow = app.find('FormButton', `Edit schedule for ${name}`).parentNode!;
  while (!actionRow.props?.onLayout) actionRow = actionRow.parentNode!;
  await act(() => (actionRow.props.onLayout as (event: unknown) => void)({ nativeEvent: { layout: { width: width - 58 } } }));
  const style = Object.assign({}, ...(actionRow.props.style as unknown[]).flat(Infinity)); assert.equal(style.flexDirection === 'row', row);
  assert.ok(app.find('FormButton', `Options for repeating task ${name}`)); assert.ok(!app.nodes().some(node => node.props?.numberOfLines === 1));
});

test('large collections use one bounded virtualized SectionList with stable unique keys and no enclosing ScrollView', async t => {
  const f = await fixture(t); for (let index = 0; index < 120; index++) f.create(`Series ${index}`);
  const app = await show(t, f); const list = app.find('SectionList'); const data = sections(app).flatMap(section => section.data);
  assert.equal(data.length, 120); const key = list.props.keyExtractor as (item: typeof data[number]) => string;
  assert.equal(new Set(data.map(key)).size, 120); assert.ok((list.props.initialNumToRender as number) < data.length);
  assert.equal(list.props.windowSize, 5); assert.equal(list.props.maxToRenderPerBatch, 6);
  assert.equal(app.nodes().filter(node => node.kind === 'ScrollView').length, 0); assert.equal(list.props.getItemLayout, undefined);
});

test('failed Repeating Tasks refresh retains cards and the same editor/recurrence draft through Retry', async t => {
  const f = await fixture(t); f.create('Draft'); const app = await show(t, f); const list = app.find('SectionList');
  await app.press('Edit schedule for Draft'); await app.press('Edit recurrence'); await app.change('Every', '3'); const input = app.find('FormField', 'Every');
  runtime.fixture.failures.add('tasks.read'); await app.resume(); assert.equal(app.find('FormField', 'Every'), input); assert.equal(input.props.value, '3'); assert.equal(app.find('SectionList'), list);
  runtime.fixture.failures.clear(); await app.press('Retry'); assert.equal(app.find('FormField', 'Every'), input);
  await app.press('Back to task editor'); await app.press('Save'); assert.ok(app.container.textContent.includes('Every 3 days'));
});

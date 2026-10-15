/// <reference types="node" />
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';

import { taskDraft } from '../src/features/tasks/form';
import { addDays } from '../src/utils/calendar';
import { taskArchiveSections, taskWorkspaceSections, type TaskWorkspaceSection } from '../src/features/tasks/workspace';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const require = createRequire(import.meta.url);
const { todayProgressRatio } = require('../src/features/tasks/components/today-progress') as typeof import('../src/features/tasks/components/today-progress');
const motion = require('./helpers/native-motion.cjs') as { calls: { config: { duration: number } }[] };
const today = '2026-10-14';
const daily = { frequency: 'daily' as const, interval: 1, weekdayMask: 37, monthDay: 14, month: 10, endDate: '' };
type App = Awaited<ReturnType<typeof mount>>;
async function fixture(t: TestContext) {
  const f = await journalDatabase(); f.setTime(today); t.after(() => f.sqlite.close());
  t.mock.method(Date, 'now', f.now);
  return f;
}
function current(f: Awaited<ReturnType<typeof fixture>>) {
  return taskWorkspaceSections(f.tasks.read().items, today, { earlier: false, upcoming: false, todo: false })[1];
}
function todaySection(app: App) { return (app.find('SectionList').props.sections as TaskWorkspaceSection[])[1]; }
function checkbox(app: App, prefix: string) {
  return app.nodes().find((node) => node.kind === 'Pressable' && node.props.accessibilityRole === 'checkbox' && String(node.props.accessibilityLabel).startsWith(prefix))!;
}

test('Today zero/partial/full progress retains authoritative one-time and recurring completions after pending rows; both reopen in place', async (t) => {
  const f = await fixture(t);
  const once = f.tasks.createTask({ ...taskDraft(), title: 'Report', date: today, time: '09:00' });
  f.tasks.createTask({ ...taskDraft(), title: 'Walk', date: today, recurrence: daily });
  const original = f.tasks.read(); const occurrence = original.occurrences.find((row) => row.scheduledDate === today)!;
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  assert.deepEqual(todaySection(app).progress, { completed: 0, total: 2 });
  await app.tapSet(checkbox(app, 'Complete Report').props.accessibilityLabel as string);
  assert.deepEqual(todaySection(app).progress, { completed: 1, total: 2 });
  assert.deepEqual(todaySection(app).data.map((item) => item.task.title), ['Walk', 'Report']);
  assert.equal(todaySection(app).completedStartIndex, 1);
  assert.ok(app.nodes().some((node) => node.props?.testID === 'completed-today-label'));
  assert.ok(app.container.textContent.includes('1 of 2 completed'));
  await app.tapSet(checkbox(app, 'Complete Walk').props.accessibilityLabel as string);
  assert.deepEqual(todaySection(app).progress, { completed: 2, total: 2 });
  assert.ok(app.nodes().some((node) => node.props?.testID === 'today-progress-complete'));
  const ring = app.nodes().find((node) => node.props?.testID === 'today-progress')!;
  assert.equal(ring.props.accessibilityRole, 'progressbar');
  assert.equal(ring.props.accessibilityLabel, 'Today progress, 2 of 2 tasks completed');
  assert.deepEqual(ring.props.accessibilityValue, { min: 0, max: 2, now: 2, text: '2 of 2 completed' });
  const after = f.tasks.read();
  assert.equal(after.tasks.length, original.tasks.length); assert.equal(after.occurrences.length, original.occurrences.length);
  assert.deepEqual(new Set(taskArchiveSections(after.items, today)[0].data.map((item) => item.key)), new Set([once, occurrence.id]));
  await app.tapSet(checkbox(app, 'Reopen Report').props.accessibilityLabel as string);
  await app.tapSet(checkbox(app, 'Reopen Walk').props.accessibilityLabel as string);
  assert.deepEqual(todaySection(app).progress, { completed: 0, total: 2 });
  assert.equal(todaySection(app).completedStartIndex, undefined);
  assert.equal(f.tasks.read().occurrences.find((row) => row.id === occurrence.id)!.status, 'pending');
  assert.equal(f.tasks.read().tasks.find((row) => row.id === once)!.completedAt, null);
  assert.deepEqual(taskArchiveSections(f.tasks.read().items, today), []);
});

test('progress excludes undated, future, earlier, deleted, skipped, retired and previous-day completed items', async (t) => {
  const f = await fixture(t);
  f.setTime('2026-10-13', '23:59');
  const early = f.tasks.createTask({ ...taskDraft(), title: 'Completed early', date: today });
  f.tasks.setCompleted(early, true); f.setTime(today);
  for (const date of ['', '2026-10-13', '2026-10-15']) {
    const id = f.tasks.createTask({ ...taskDraft(), title: `Completed ${date}`, date }); f.tasks.setCompleted(id, true);
    f.tasks.createTask({ ...taskDraft(), title: `Pending ${date}`, date });
  }
  const deleted = f.tasks.createTask({ ...taskDraft(), title: 'Deleted', date: today });
  f.tasks.setCompleted(deleted, true); f.tasks.deleteTask(deleted);
  f.tasks.createTask({ ...taskDraft(), title: 'Skipped', date: today, recurrence: daily });
  const occurrence = f.tasks.read().occurrences.find((row) => row.scheduledDate === today)!;
  f.tasks.setOccurrenceStatus(occurrence.id, 'skipped');
  const valid = f.tasks.createTask({ ...taskDraft(), title: 'Qualifying', date: today });
  assert.deepEqual(current(f).progress, { completed: 0, total: 1 });
  f.tasks.setCompleted(valid, true);
  assert.deepEqual(current(f).progress, { completed: 1, total: 1 });
  const snapshot = f.tasks.read();
  // Defensive soft-delete projection check, using the same retired representation as the source.
  const retired = structuredClone(snapshot.items.find((item) => item.task.id === valid)!);
  retired.key = 'retired'; retired.task = { ...retired.task, id: 'retired', deletedAt: f.now() };
  assert.deepEqual(taskWorkspaceSections([...snapshot.items, retired], today, { earlier: true, upcoming: true, todo: true })[1].progress, { completed: 1, total: 1 });
  assert.ok(taskArchiveSections(snapshot.items, today)[0].data.some((item) => item.task.id === early), 'Early completions remain History, not actionable Today');
});

test('empty Today has no 0/0 ring; progress ratios are bounded', async (t) => {
  const f = await fixture(t); const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  assert.ok(app.container.textContent.includes('No tasks for today.'));
  assert.ok(!app.nodes().some((node) => node.props?.testID === 'today-progress'));
  assert.ok(!app.container.textContent.includes('0 of 0'));
  assert.deepEqual([todayProgressRatio(0, 0), todayProgressRatio(0, 4), todayProgressRatio(1, 4), todayProgressRatio(4, 4), todayProgressRatio(5, 4)], [0, 0, .25, 1, 1]);
});

test('local midnight switches progress, retains History and mounted dirty editor without duplicating recurring occurrences', async (t) => {
  const f = await fixture(t); f.setTime(today, '23:59');
  const id = f.tasks.createTask({ ...taskDraft(), title: 'Once', date: today }); f.tasks.setCompleted(id, true);
  f.tasks.createTask({ ...taskDraft(), title: 'Daily', date: today, recurrence: daily });
  const occurrence = f.tasks.read().occurrences.find((row) => row.scheduledDate === today)!;
  f.tasks.setOccurrenceStatus(occurrence.id, 'completed');
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  assert.deepEqual(todaySection(app).progress, { completed: 2, total: 2 });
  await app.tapSet('Add task'); await app.change('Title *', 'Unsaved midnight draft');
  const editor = app.find('Modal'); const field = app.find('FormField', 'Title *');
  f.setTime('2026-10-15', '00:01'); await app.resume();
  assert.deepEqual(todaySection(app).progress, { completed: 0, total: 1 });
  assert.equal(todaySection(app).data[0].occurrence!.scheduledDate, '2026-10-15');
  assert.equal(app.find('Modal'), editor); assert.equal(app.find('FormField', 'Title *'), field);
  assert.equal(field.props.value, 'Unsaved midnight draft');
  await app.resume(); const snapshot = f.tasks.read();
  assert.equal(snapshot.occurrences.filter((row) => row.scheduledDate === '2026-10-15').length, 1);
  assert.equal(taskArchiveSections(snapshot.items, '2026-10-15')[0].data.length, 2);
});

test('progress animation uses v2 timing and responds to live Reduced Motion without changing source state', async (t) => {
  const f = await fixture(t); f.tasks.createTask({ ...taskDraft(), title: 'Motion', date: today });
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  motion.calls.length = 0; await app.tapSet(checkbox(app, 'Complete Motion').props.accessibilityLabel as string);
  assert.ok(motion.calls.some((call) => call.config.duration === 180));
  await act(() => (runtime.reduceMotion as (value: boolean) => void)(true)); motion.calls.length = 0;
  await app.tapSet(checkbox(app, 'Reopen Motion').props.accessibilityLabel as string);
  assert.equal(motion.calls.length, 0); assert.deepEqual(todaySection(app).progress, { completed: 0, total: 1 });
});

test('daily projection adds zero SQL on a materialized multi-year recurring fixture and does not mutate the snapshot', async (t) => {
  const f = await fixture(t);
  f.tasks.createTask({ ...taskDraft(), title: 'Years of daily work', date: '2022-01-01', recurrence: { ...daily, endDate: '2028-01-01' } });
  for (let from = '2022-01-01'; from < '2027-01-01'; from = addDays(from, 60)) f.tasks.readRange({ from, to: addDays(from, 59) });
  const snapshot = f.tasks.read(); const before = structuredClone(snapshot);
  const measured = f.measure(() => taskWorkspaceSections(snapshot.items, today, { earlier: true, upcoming: true, todo: true }));
  assert.equal(measured.count, 0); assert.equal(measured.rows, 0); assert.deepEqual(snapshot, before);
  assert.deepEqual(measured.value[1].progress, { completed: 0, total: 1 });
  const count = f.sqlite.prepare('select count(*) as count from task_occurrences').get() as { count: number };
  assert.ok(count.count > 1000); console.log(`Tasks daily projection: ${count.count} persisted occurrences, ${snapshot.items.length} snapshot items, ${measured.count} additional SQL statements.`);
});

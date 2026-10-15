/// <reference types="node" />
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import type { EntryAnimationsValues, ExitAnimationsValues, LayoutAnimationFunction } from 'react-native-reanimated';

import { taskDraft } from '../src/features/tasks/form';
import { taskWorkspaceSections, type TaskWorkspaceSection } from '../src/features/tasks/workspace';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const require = createRequire(import.meta.url);
const { disclosureCellAnimations, taskCellOwner, useTaskDisclosureMotion, TaskDisclosureCell, TaskDisclosureMotionContext } = require('../src/features/tasks/components/task-disclosure-motion') as typeof import('../src/features/tasks/components/task-disclosure-motion');
const { ReducedMotionContext } = require('../src/components/motion') as typeof import('../src/components/motion');
const today = '2026-10-14';
const daily = { frequency: 'daily' as const, interval: 1, weekdayMask: 37, monthDay: 14, month: 10, endDate: '' };
const entry = { targetHeight: 90, targetOriginY: 300 } as EntryAnimationsValues;
const exit = { currentHeight: 90, currentOriginY: 300 } as ExitAnimationsValues;
const layout = { currentHeight: 90, targetHeight: 150, currentOriginY: 100, targetOriginY: 400 } as Parameters<LayoutAnimationFunction>[0];
type App = Awaited<ReturnType<typeof mount>>;
async function fixture(t: TestContext) {
  const f = await journalDatabase(); f.setTime(today); t.after(() => f.sqlite.close()); t.mock.method(Date, 'now', f.now); return f;
}
function sections(app: App) { return app.find('SectionList').props.sections as TaskWorkspaceSection[]; }
function section(app: App, title: string) { return sections(app).find((value) => value.title === title)!; }
function cell(app: App, title: string, key: string) { return app.nodes().find((node) => node.props?.testID === `task-cell-${title}:${key}`)!; }
async function check(app: App, title: string, reopen = false) {
  const button = app.nodes().find((node) => node.props?.accessibilityRole === 'checkbox' && String(node.props.accessibilityLabel).startsWith(`${reopen ? 'Reopen' : 'Complete'} ${title}`));
  assert.ok(button); await app.tapSet(String(button.props.accessibilityLabel));
}
function ordinaryCells(app: App) {
  const cells = app.nodes().filter((node) => /^task-cell-(Today|To-do):/.test(String(node.props?.testID)));
  assert.ok(cells.length >= 2);
  for (const node of cells) for (const prop of ['entering', 'exiting', 'layout']) assert.equal(node.props[prop], undefined, `${String(node.props.testID)} must never receive ${prop}`);
}
function uniqueRows(app: App) {
  const keys = sections(app).flatMap((value) => value.data.map((item) => item.key));
  assert.equal(new Set(keys).size, keys.length);
  const rows = app.nodes().filter((node) => String(node.props?.testID).startsWith('task-row-'));
  assert.equal(rows.length, keys.length); assert.equal(new Set(rows.map((node) => node.props.testID)).size, rows.length);
}

test('owner metadata survives collapse; stale flat indices cannot make Today or a section header disclosure content', async (t) => {
  const f = await fixture(t);
  f.tasks.createTask({ ...taskDraft(), title: 'Old', date: '2026-10-13' });
  f.tasks.createTask({ ...taskDraft(), title: 'Now', date: today });
  const items = f.tasks.read().items;
  const collapsed = taskWorkspaceSections(items, today, { earlier: false, upcoming: false, todo: false });
  const expanded = taskWorkspaceSections(items, today, { earlier: true, upcoming: true, todo: true });
  assert.equal(collapsed[0].data.length, 0); assert.deepEqual(collapsed[0].memberKeys, expanded[0].memberKeys);
  const owners = new Map(collapsed.flatMap((value) => value.memberKeys!.map((key) => [key, value.title] as const)));
  const now = collapsed[1].data[0]; assert.equal(taskCellOwner(now, owners), 'Today');
  assert.equal(taskCellOwner(collapsed[1], owners), 'Today');
  function Probe() {
    const motion = useTaskDisclosureMotion(expanded);
    const nativeProps = { children: null, style: undefined, onLayout() {}, onFocusCapture() {} };
    return createElement(TaskDisclosureMotionContext.Provider, { value: motion.value },
      // Index 1 used to mean an Earlier row. Ownership now comes from the item itself.
      createElement(TaskDisclosureCell, { ...nativeProps, item: now, index: 1, cellKey: `Today:${now.key}` }),
      createElement(TaskDisclosureCell, { ...nativeProps, item: collapsed[1], index: 1, cellKey: 'Today:header' }));
  }
  const app = await mount(createElement(ReducedMotionContext.Provider, { value: false }, createElement(Probe)), f.db); t.after(app.unmount);
  ordinaryCells(app);
});

test('ordinary/unknown/header animation configurations are defensive no-ops without height or position writes', () => {
  let value = { id: 1, section: 'Earlier', opening: true, requestedAt: Date.now(), start: 0, end: 0, anchor: null };
  const shared = { get: () => value, set: (next: typeof value) => { value = next; } } as Parameters<typeof disclosureCellAnimations>[0];
  for (const active of ['Earlier', 'Upcoming', '']) for (const title of ['Today', 'To-do', '', 'Earlier', 'Upcoming']) {
    value = { ...value, section: active };
    const configs = disclosureCellAnimations(shared, title, title === 'Earlier' || title === 'Upcoming');
    for (const result of [configs.entering(entry), configs.exiting(exit), configs.layout(layout)]) assert.deepEqual(result, { initialValues: {}, animations: {} });
  }
});

test('Today/To-do rows, headers, footers and completed grouping stay ordinary during both disclosure gestures', async (t) => {
  const f = await fixture(t);
  f.tasks.createTask({ ...taskDraft(), title: 'Today pending', date: today });
  const done = f.tasks.createTask({ ...taskDraft(), title: 'Today done', date: today }); f.tasks.setCompleted(done, true);
  f.tasks.createTask({ ...taskDraft(), title: 'Undated' });
  f.tasks.createTask({ ...taskDraft(), title: 'Past', date: '2026-10-13' });
  f.tasks.createTask({ ...taskDraft(), title: 'Future', date: '2026-10-15' });
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  assert.equal(app.find('SectionList').props.removeClippedSubviews, undefined); ordinaryCells(app);
  for (const title of ['Earlier', 'Upcoming']) {
    await app.tapSet(`${title}, 1 tasks`); ordinaryCells(app);
    for (const target of ['Earlier', 'Upcoming']) {
      const header = cell(app, target, 'header');
      for (const prop of ['entering', 'exiting', 'layout']) assert.equal(header.props[prop], undefined);
      for (const item of section(app, target).data) assert.equal(typeof cell(app, target, item.key).props.layout, target === title ? 'function' : 'undefined');
    }
    const label = app.nodes().find((node) => node.props?.testID === 'completed-today-label')!;
    assert.equal(label.props.layout, undefined); uniqueRows(app);
  }
});

for (const recurring of [false, true]) test(`${recurring ? 'recurring' : 'one-time'} first completion / last reopen retains the native cell and key with exactly one row`, async (t) => {
  const f = await fixture(t); const id = f.tasks.createTask({ ...taskDraft(), title: 'Identity', date: today, ...(recurring ? { recurrence: daily } : {}) });
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  const item = section(app, 'Today').data[0]; const root = cell(app, 'Today', item.key);
  for (let index = 0; index < 4; index++) {
    const completed = index % 2 === 0; await check(app, 'Identity', !completed);
    const current = section(app, 'Today');
    assert.equal(current.data[0].key, item.key); assert.equal(current.data[0].task.id, id);
    assert.equal(cell(app, 'Today', item.key), root, 'Movement into/out of the completed group must not remount its native cell');
    assert.deepEqual(current.progress, { completed: completed ? 1 : 0, total: 1 });
    assert.equal(current.completedStartIndex, completed ? 0 : undefined);
    assert.equal(app.nodes().filter((node) => node.props?.testID === 'completed-today-label').length, completed ? 1 : 0);
    assert.ok(app.container.textContent.includes(`${completed ? 1 : 0} of 1 completed`));
    ordinaryCells(app); uniqueRows(app);
  }
  if (recurring) assert.equal(f.tasks.read().occurrences.filter((row) => row.id === item.key).length, 1);
});

test('rapid complete A/B, reopen A, complete C, reopen B keeps authoritative order, count and cell identities', async (t) => {
  const f = await fixture(t);
  for (const [index, title] of ['A', 'B', 'C'].entries()) f.tasks.createTask({ ...taskDraft(), title, date: today, time: `${10 + index}:00`, ...(title === 'B' ? { recurrence: daily } : {}) });
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  const roots = new Map(section(app, 'Today').data.map((item) => [item.key, cell(app, 'Today', item.key)]));
  const sequence = [['A', false, 1], ['B', false, 2], ['A', true, 1], ['C', false, 2], ['B', true, 1]] as const;
  for (const [index, [title, reopen, completed]] of sequence.entries()) {
    f.setTime(today, `12:0${index}`); await check(app, title, reopen);
    assert.deepEqual(section(app, 'Today').progress, { completed, total: 3 }); uniqueRows(app); ordinaryCells(app);
    for (const item of section(app, 'Today').data) assert.equal(cell(app, 'Today', item.key), roots.get(item.key));
  }
  assert.deepEqual(section(app, 'Today').data.map((item) => item.task.title), ['A', 'B', 'C']);
  assert.equal(section(app, 'Today').completedStartIndex, 2);
});

for (const title of ['Earlier', 'Upcoming']) test(`completion/reopen during ${title} cancels disclosure before list regrouping and restores default clipping`, async (t) => {
  const f = await fixture(t);
  f.tasks.createTask({ ...taskDraft(), title: 'Actionable', date: today });
  f.tasks.createTask({ ...taskDraft(), title: 'Disclosure row', date: title === 'Earlier' ? '2026-10-13' : '2026-10-15' });
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  for (const reopen of [false, true]) {
    if (section(app, title).expanded) await app.tapSet(`${title}, 1 tasks`);
    await app.tapSet(`${title}, 1 tasks`);
    const item = section(app, title).data[0]; const animated = cell(app, title, item.key);
    const running = animated.props.entering as ReturnType<typeof disclosureCellAnimations>['entering'];
    running(entry); assert.equal(typeof animated.props.layout, 'function');
    assert.equal(app.find('SectionList').props.removeClippedSubviews, false);
    await check(app, 'Actionable', reopen);
    assert.equal(section(app, title).expanded, true);
    assert.equal(animated.props.entering, undefined); assert.equal(animated.props.layout, undefined);
    assert.equal(app.find('SectionList').props.removeClippedSubviews, undefined);
    const dormant = (animated.props.exiting as ReturnType<typeof disclosureCellAnimations>['exiting'])(exit);
    assert.deepEqual(dormant, { initialValues: { opacity: 0 }, animations: { opacity: 0 } });
    ordinaryCells(app); uniqueRows(app);
    assert.equal(runtime.fixture.scrollLocations.length, 0); assert.equal(runtime.fixture.scrollOffsets.length, 0);
  }
});

test('native completion deactivates layout/entry props, ignores superseded callbacks and leaves subsequent mutations ordinary', async (t) => {
  const f = await fixture(t); f.tasks.createTask({ ...taskDraft(), title: 'Past', date: '2026-10-13' });
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  await app.tapSet('Earlier, 1 tasks'); const key = section(app, 'Earlier').data[0].key;
  const old = (cell(app, 'Earlier', key).props.entering as ReturnType<typeof disclosureCellAnimations>['entering'])(entry);
  await app.tapSet('Earlier, 1 tasks'); await app.tapSet('Earlier, 1 tasks');
  await act(async () => { old.callback?.(true); });
  assert.equal(typeof cell(app, 'Earlier', key).props.layout, 'function', 'Old native completion cannot end the new gesture');
  const current = (cell(app, 'Earlier', key).props.entering as ReturnType<typeof disclosureCellAnimations>['entering'])(entry);
  await act(async () => { current.callback?.(true); current.callback?.(true); });
  assert.equal(cell(app, 'Earlier', key).props.layout, undefined); assert.equal(cell(app, 'Earlier', key).props.entering, undefined);
  assert.equal(app.find('SectionList').props.removeClippedSubviews, undefined);
  const close = cell(app, 'Earlier', key).props.exiting as ReturnType<typeof disclosureCellAnimations>['exiting'];
  await app.tapSet('Earlier, 1 tasks'); const closing = close(exit);
  assert.equal(closing.animations.height, 0);
  await act(async () => { closing.callback?.(true); });
  assert.equal(section(app, 'Earlier').data.length, 0); assert.equal(app.find('SectionList').props.removeClippedSubviews, undefined);
  ordinaryCells(app);
});

test('abandoned/offscreen gesture has a bounded fallback; cancel and unmount invalidate its native callbacks', async (t) => {
  const f = await fixture(t); t.mock.timers.enable({ apis: ['setTimeout'] });
  let control!: ReturnType<typeof useTaskDisclosureMotion>;
  const active = () => control.active;
  const empty = { title: 'Earlier', data: [], total: 0, expanded: false };
  function Probe() { control = useTaskDisclosureMotion([empty]); return null; }
  const app = await mount(createElement(ReducedMotionContext.Provider, { value: false }, createElement(Probe)), f.db); t.after(app.unmount);
  await act(() => control.begin(empty)); const first = control.value.gesture.get().id; assert.ok(control.active);
  await act(() => t.mock.timers.tick(1261)); assert.equal(control.active, null); assert.equal(control.value.gesture.get().section, '');
  await act(() => control.begin(empty)); const second = control.value.gesture.get().id;
  await act(() => control.value.finish(first)); assert.equal(active()?.id, second);
  await act(control.cancel); assert.equal(control.active, null);
  await act(() => control.begin(empty)); const last = control.value.gesture.get().id;
  await app.unmount(); assert.ok(control.value.gesture.get().id > last);
  await act(() => { control.value.finish(last); t.mock.timers.tick(2000); });
  assert.equal(control.value.gesture.get().section, '');
});

test('mixed long list retains unique projections, navigation retries and ordinary Today geometry across disclosures, mutations and refresh failure', async (t) => {
  const f = await fixture(t);
  for (const date of ['2026-10-13', '2026-10-15']) for (let index = 0; index < 80; index++) f.tasks.createTask({ ...taskDraft(), title: `${date} ${index}`, date });
  for (let index = 0; index < 8; index++) f.tasks.createTask({ ...taskDraft(), title: `Undated ${index}` });
  for (let index = 0; index < 6; index++) {
    const id = f.tasks.createTask({ ...taskDraft(), title: `Today ${index}`, date: today, time: `${10 + index}:00` });
    if (index >= 4) f.tasks.setCompleted(id, true);
  }
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount); const list = app.find('SectionList');
  for (let iteration = 0; iteration < 3; iteration++) for (const title of ['Earlier', 'Upcoming']) {
    const measured = await f.measureAsync(() => app.tapSet(`${title}, 80 tasks`)); assert.equal(measured.count, 0);
    await check(app, 'Today 0'); await check(app, 'Today 0', true); ordinaryCells(app); uniqueRows(app);
    assert.deepEqual(section(app, 'Today').progress, { completed: 2, total: 6 });
  }
  assert.equal(list.props.windowSize, undefined); assert.equal(list.props.getItemLayout, undefined); assert.equal(list.props.onScroll, undefined);
  assert.equal(list.props.removeClippedSubviews, undefined); assert.equal(runtime.fixture.layoutAnimations.length, 0);
  runtime.fixture.scrollFailures = 1; await app.tapSet('Go to Upcoming');
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 150)); });
  assert.equal(runtime.fixture.scrollLocations.at(-1)!.sectionIndex, 3);
  await act(() => (list.props.onScrollBeginDrag as () => void)());
  await act(() => (list.props.onViewableItemsChanged as (event: unknown) => void)({ viewableItems: [{ isViewable: true, section: section(app, 'Today'), index: 0 }] }));
  assert.equal((app.find('Pressable', 'Go to Today').props.accessibilityState as { selected: boolean }).selected, true);
  await app.tapSet('Add task'); await app.change('Title *', 'Keep my draft'); const editor = app.find('Modal');
  runtime.fixture.failures.add('tasks.read'); await app.resume();
  assert.equal(app.find('SectionList'), list); assert.equal(app.find('Modal'), editor); assert.equal(app.find('FormField', 'Title *').props.value, 'Keep my draft');
  runtime.fixture.failures.clear(); await app.resume(); ordinaryCells(app); uniqueRows(app);
});

test('live Reduced Motion cancels disclosure ownership, restores clipping and keeps rapid completions correct', async (t) => {
  const f = await fixture(t); f.tasks.createTask({ ...taskDraft(), title: 'Past', date: '2026-10-13' });
  f.tasks.createTask({ ...taskDraft(), title: 'Today', date: today, recurrence: daily });
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  await app.tapSet('Earlier, 1 tasks'); await act(() => (runtime.reduceMotion as (value: boolean) => void)(true));
  for (const node of app.nodes().filter((node) => String(node.props?.testID).startsWith('task-cell-'))) {
    for (const prop of ['entering', 'exiting', 'layout']) assert.equal(node.props[prop], undefined);
  }
  assert.equal(app.find('SectionList').props.removeClippedSubviews, undefined);
  for (let index = 0; index < 4; index++) { await check(app, 'Today', index % 2 === 1); ordinaryCells(app); uniqueRows(app); }
  assert.deepEqual(section(app, 'Today').progress, { completed: 0, total: 1 });
});

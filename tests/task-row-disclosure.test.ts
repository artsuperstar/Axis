/// <reference types="node" />
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';

import { taskDraft } from '../src/features/tasks/form';
import type { TaskWorkspaceSection } from '../src/features/tasks/workspace';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const require = createRequire(import.meta.url);
const motion = require('./helpers/native-motion.cjs') as { calls: { config: { duration: number } }[] };
const { TaskSectionHeader } = require('../src/features/tasks/components/task-section') as typeof import('../src/features/tasks/components/task-section');
const { DesignProvider } = require('../src/components/design-system') as typeof import('../src/components/design-system');
const today = '2026-10-14';
const daily = { frequency: 'daily' as const, interval: 1, weekdayMask: 37, monthDay: 14, month: 10, endDate: '' };
type App = Awaited<ReturnType<typeof mount>>;
async function fixture(t: TestContext) {
  const f = await journalDatabase(); f.setTime(today); t.after(() => f.sqlite.close()); t.mock.method(Date, 'now', f.now);
  return f;
}
function sections(app: App) { return app.find('SectionList').props.sections as TaskWorkspaceSection[]; }
function section(app: App, name: string) { return sections(app).find((value) => value.title === name)!; }
function noEditor(app: App) { assert.ok(!app.nodes().some((node) => node.kind === 'FormField')); }
async function edit(app: App, subject: string, label = 'Edit task') {
  await app.press(`Actions for ${subject}`); await app.press(label);
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
}

test('main title, metadata, recurrence, category and empty row area have no edit/tap/pressed affordance; overflow retains Edit and Save', async (t) => {
  const f = await fixture(t); const category = f.tasks.createCategory('Reading habits');
  const id = f.tasks.createTask({ ...taskDraft(), title: 'Read carefully', description: 'Keep notes', date: today, time: '18:00', categoryId: category.id,
    priority: 'high', recurrence: daily });
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  const information = app.nodes().find((node) => node.props?.testID === `task-information-${id}`)!;
  const row = app.nodes().find((node) => node.props?.testID === `task-row-${id}`)!;
  assert.equal(row.kind, 'View'); assert.equal(information.kind, 'View');
  assert.equal(information.props.accessibilityRole, 'text'); assert.equal(information.props.accessible, true);
  for (const text of ['Read carefully', 'Keep notes', 'Every day', 'Reading habits', 'High priority']) assert.ok(String(information.props.accessibilityLabel).includes(text));
  const targets = [row, information, ...app.nodes(information).filter((node) => node.kind === 'ThemedText')];
  for (const target of targets) {
    assert.equal(target.props.onPress, undefined); assert.equal(target.props.onLongPress, undefined);
    assert.equal(target.props.onPressIn, undefined); assert.equal(target.props.accessibilityHint, undefined);
    assert.notEqual(target.props.accessibilityRole, 'button');
    // Model press bubbling through the actual host tree. No informational ancestor handles it.
    await act(() => {
      for (let parent: typeof target | null = target; parent; parent = parent.parentNode) {
        const handler = parent.props?.onPress;
        if (typeof handler === 'function') handler();
        if (parent === row) break;
      }
    });
    noEditor(app);
  }
  assert.equal(app.nodes(row).filter((node) => node.props?.accessibilityRole === 'checkbox').length, 1);
  assert.equal(app.nodes(row).filter((node) => node.kind === 'FormButton').length, 1);
  assert.equal(app.nodes(information).filter((node) => node.props?.accessible === true).length, 0, 'One grouped static announcement, not duplicate explicit focus targets');
  const actions = app.nodes(row).find((node) => node.kind === 'FormButton')!;
  await app.press(String(actions.props.accessibilityLabel));
  assert.ok(app.find('FormButton', 'Edit recurring task')); assert.ok(app.find('FormButton', 'Skip occurrence')); await app.press('Back');
  await edit(app, String(actions.props.accessibilityLabel).replace('Actions for ', ''), 'Edit recurring task');
  assert.equal(app.find('FormField', 'Title *').props.value, 'Read carefully');
  await app.change('Title *', 'Edited deliberately'); await app.press('Save'); noEditor(app);
  assert.equal(f.tasks.read().tasks.find((task) => task.id === id)!.title, 'Edited deliberately');
});

for (const recurring of [false, true]) test(`${recurring ? 'recurring' : 'one-time'} checkbox independently completes and reopens after removing body editing`, async (t) => {
  const f = await fixture(t); const id = f.tasks.createTask({ ...taskDraft(), title: 'Independent control', date: today, ...(recurring ? { recurrence: daily } : {}) });
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  for (const [prefix, expected] of [['Complete ', 1], ['Reopen ', 0]] as const) {
    const control = app.nodes().find((node) => node.props?.accessibilityRole === 'checkbox' && String(node.props.accessibilityLabel).startsWith(prefix))!;
    assert.equal(control.kind, 'Pressable');
    await app.tapSet(String(control.props.accessibilityLabel)); noEditor(app);
    assert.deepEqual(section(app, 'Today').progress, { completed: expected, total: 1 });
    const value = f.tasks.read();
    if (recurring) assert.equal(value.occurrences.find((item) => item.taskId === id && item.scheduledDate === today)!.status, expected ? 'completed' : 'pending');
    else assert.equal(value.tasks.find((task) => task.id === id)!.completedAt !== null, !!expected);
  }
});

test('History body edit entry point remains unchanged outside Tasks main', async (t) => {
  const f = await fixture(t); const id = f.tasks.createTask({ ...taskDraft(), title: 'Historical task', date: today }); f.tasks.setCompleted(id, true);
  const app = await mount(createElement(screens.TasksHistoryScreen), f.db); t.after(app.unmount);
  const body = app.nodes().find((node) => node.props?.accessibilityHint === 'Opens the task editor')!;
  assert.equal(body.kind, 'Pressable'); assert.equal(body.props.accessibilityRole, 'button');
  await app.tapSet(String(body.props.accessibilityLabel)); assert.equal(app.find('FormField', 'Title *').props.value, 'Historical task');
});

for (const title of ['Earlier', 'Upcoming']) test(`${title} opens/closes through animated native cells, retains keys and never changes persistence or scroll position imperatively`, async (t) => {
  const f = await fixture(t);
  for (let index = 0; index < 120; index++) f.tasks.createTask({ ...taskDraft(), title: `${title} ${index}`, date: title === 'Earlier' ? '2026-10-13' : '2026-10-15' });
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  const list = app.find('SectionList'); const before = f.tasks.read(); const callback = list.props.onViewableItemsChanged;
  for (const expanded of [true, false, true, false]) {
    motion.calls.length = 0;
    const measured = await f.measureAsync(() => app.tapSet(`${title}, 120 tasks`));
    assert.equal(measured.count, 0, 'Disclosure must remain presentation-only');
    assert.equal(section(app, title).expanded, expanded);
    assert.equal(section(app, title).data.length, expanded ? 120 : 0);
    const keys = section(app, title).data.map((item) => item.key); assert.equal(new Set(keys).size, keys.length);
    assert.equal(runtime.fixture.layoutAnimations.length, 0, 'The unsuccessful global LayoutAnimation path is removed');
    assert.equal(typeof list.props.CellRendererComponent, 'function');
    if (expanded) {
      const cell = app.nodes().find((node) => node.props?.testID === `task-cell-${title}:${keys[0]}`)!;
      assert.equal(typeof cell.props.entering, 'function'); assert.equal(typeof cell.props.exiting, 'function');
      assert.equal(typeof cell.props.layout, 'function'); assert.equal(cell.props.collapsable, false);
    }
    assert.equal(motion.calls.length, 1, 'Native transition functions run at cell layout, not in JS render');
    assert.equal(app.find('SectionList'), list); assert.equal(list.props.onViewableItemsChanged, callback);
    assert.equal(runtime.fixture.scrollLocations.length, 0); assert.equal(runtime.fixture.scrollOffsets.length, 0);
    assert.ok(!app.nodes().some((node) => node.kind === 'ScrollView'), 'No nonvirtualized section wrapper');
  }
  assert.deepEqual(f.tasks.read(), before); await app.resume();
  assert.equal(runtime.fixture.layoutAnimations.length, 0, 'Refresh does not schedule global layout motion or re-open it');
  assert.equal(section(app, title).expanded, false);
});

test('live Reduced Motion makes both disclosure directions immediate while preserving expanded accessibility and future motion preference changes', async (t) => {
  const f = await fixture(t); f.tasks.createTask({ ...taskDraft(), title: 'Past', date: '2026-10-13' });
  f.tasks.createTask({ ...taskDraft(), title: 'Future', date: '2026-10-15' });
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  await act(() => (runtime.reduceMotion as (value: boolean) => void)(true)); motion.calls.length = 0;
  for (const title of ['Earlier', 'Upcoming']) for (const expanded of [true, false]) {
    await app.tapSet(`${title}, 1 tasks`);
    assert.equal(section(app, title).expanded, expanded);
    assert.equal((app.find('Pressable', `${title}, 1 tasks`).props.accessibilityState as { expanded: boolean }).expanded, expanded);
  }
  assert.equal(runtime.fixture.layoutAnimations.length, 0); assert.equal(motion.calls.length, 0);
  await act(() => (runtime.reduceMotion as (value: boolean) => void)(false));
  await app.tapSet('Earlier, 1 tasks'); assert.equal(runtime.fixture.layoutAnimations.length, 0);
  assert.ok(app.nodes().some((node) => typeof node.props?.entering === 'function'));
});

test('section navigation remains stable across disclosure commits, measurement retries and naturally visible collapsed headers', async (t) => {
  const f = await fixture(t); for (let index = 0; index < 100; index++) f.tasks.createTask({ ...taskDraft(), title: `Today ${index}`, date: today });
  f.tasks.createTask({ ...taskDraft(), title: 'Past', date: '2026-10-13' }); f.tasks.createTask({ ...taskDraft(), title: 'Future', date: '2026-10-15' });
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  for (const title of ['Earlier', 'Upcoming']) {
    await app.tapSet(`Go to ${title}`); assert.equal(section(app, title).expanded, false);
    assert.equal(runtime.fixture.layoutAnimations.length, 0, 'Navigation never initiates a global layout transaction');
    await app.tapSet(`${title}, 1 tasks`); await app.tapSet(`${title}, 1 tasks`);
  }
  runtime.fixture.scrollFailures = 1; await app.tapSet('Go to Upcoming');
  await app.tapSet('Upcoming, 1 tasks');
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 150)); });
  assert.equal(runtime.fixture.scrollLocations.at(-1)!.sectionIndex, 3); assert.equal(section(app, 'Upcoming').expanded, true);
  const list = app.find('SectionList'); await act(() => (list.props.onScrollBeginDrag as () => void)());
  await act(() => (list.props.onViewableItemsChanged as (event: unknown) => void)({ viewableItems: [{ isViewable: true, section: section(app, 'Earlier'), index: null }] }));
  assert.equal((app.find('Pressable', 'Go to Earlier').props.accessibilityState as { selected: boolean }).selected, true);
});

test('non-disclosure headers do not gain layout animation or a tap target', async (t) => {
  const f = await fixture(t);
  const app = await mount(createElement(DesignProvider, null, createElement(TaskSectionHeader, {
    section: { title: 'Today', expanded: true, total: 0, data: [] }, now: f.now(), disabled: false, onToggle() { assert.fail('Today is not a disclosure'); },
  })), f.db); t.after(app.unmount);
  const header = app.nodes().find((node) => node.props?.testID === 'task-section-Today')!;
  assert.equal(header.kind, 'View'); assert.equal(header.props.onPress, undefined);
  assert.equal(runtime.fixture.layoutAnimations.length, 0);
});

/// <reference types="node" />
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';

import { taskDraft } from '../src/features/tasks/form';
import type { TaskWorkspaceSection } from '../src/features/tasks/workspace';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

type App = Awaited<ReturnType<typeof mount>>;
const destinations = ['Earlier', 'Today', 'To-do', 'Upcoming'];
const flatten = (style: unknown) => Object.assign({}, ...(Array.isArray(style) ? style.flat(Infinity) : [style])) as Record<string, unknown>;
async function fixture(t: TestContext) {
  const f = await journalDatabase(); f.setTime('2026-10-14'); t.after(() => f.sqlite.close()); t.mock.method(Date, 'now', f.now);
  return f;
}
function section(app: App, index: number) { return (app.find('SectionList').props.sections as TaskWorkspaceSection[])[index]; }
function selected(app: App, title: string) { return (app.find('Pressable', `Go to ${title}`).props.accessibilityState as { selected: boolean }).selected; }
async function visible(app: App, title: string, header = false) {
  const value = section(app, destinations.indexOf(title));
  await act(() => (app.find('SectionList').props.onViewableItemsChanged as (event: unknown) => void)({ viewableItems: [
    { section: value, isViewable: false, index: 0 },
    { section: value, isViewable: true, index: header ? null : 0 },
  ] }));
}

test('all four navigation actions jump to real SectionList headers, select immediately and preserve collapsed disclosures', async (t) => {
  const f = await fixture(t);
  f.tasks.createTask({ ...taskDraft(), title: 'Old', date: '2026-10-13' });
  f.tasks.createTask({ ...taskDraft(), title: 'Later', date: '2026-10-15' });
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  const list = app.find('SectionList');
  for (const [index, title] of destinations.entries()) {
    const action = app.find('Pressable', `Go to ${title}`);
    assert.equal(action.props.accessibilityRole, 'button'); assert.ok(Number(flatten(action.props.style).minHeight) >= 44);
    await app.tapSet(`Go to ${title}`);
    assert.equal(selected(app, title), true);
    assert.deepEqual(runtime.fixture.scrollLocations.at(-1), { sectionIndex: index, itemIndex: 0, viewPosition: 0, animated: true });
    await visible(app, 'Earlier', true); assert.equal(selected(app, title), true, 'Intermediate programmatic visibility must not override tapped selection');
  }
  assert.equal(section(app, 0).expanded, false); assert.equal(section(app, 3).expanded, false);
  assert.equal(section(app, 0).data.length, 0); assert.equal(section(app, 3).data.length, 0);
  assert.equal(app.find('SectionList'), list); assert.equal(list.props.stickySectionHeadersEnabled, false);
  const pinned = app.nodes().find((node) => node.props?.testID === 'task-section-navigation-pinned')!;
  assert.equal(pinned.parentNode, list.parentNode, 'Pinned navigation is a sibling above the virtualized viewport, not an overlay or repeated header');
  assert.equal(flatten(pinned.props.style).position, undefined);
  assert.equal(runtime.fixture.navigation.length, 0, 'Section jumps never navigate to routes');
});

test('natural scrolling synchronizes selected state including empty/collapsed headers; callbacks stay stable across refresh', async (t) => {
  const f = await fixture(t); const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  const list = app.find('SectionList'); const callback = list.props.onViewableItemsChanged; const config = list.props.viewabilityConfig;
  for (const title of destinations) { await visible(app, title, true); assert.equal(selected(app, title), true); }
  await app.tapSet('Go to Today'); assert.equal(selected(app, 'Today'), true);
  await act(() => (list.props.onScrollBeginDrag as () => void)()); await visible(app, 'To-do'); assert.equal(selected(app, 'To-do'), true);
  await app.resume(); assert.equal(list.props.onViewableItemsChanged, callback); assert.equal(list.props.viewabilityConfig, config);
  assert.ok(!list.props.onScroll, 'No per-frame JS scroll observer');
  assert.ok(!app.nodes().some((node) => node.kind === 'ScrollView'));
  const key = list.props.keyExtractor as (item: unknown) => string;
  assert.equal(key(section(app, 0)), 'section:Earlier', 'SectionList header tokens have safe stable keys');
});

test('unmeasured long-list jumps use measured estimate then retry the header without expanding it; replacement jumps cancel retries', async (t) => {
  const f = await fixture(t); for (let index = 0; index < 160; index++) f.tasks.createTask({ ...taskDraft(), title: `Variable height ${index}`, date: '2026-10-14' });
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  runtime.fixture.scrollFailures = 1;
  await app.tapSet('Go to Upcoming');
  assert.equal(runtime.fixture.scrollOffsets.length, 1); assert.ok(runtime.fixture.scrollOffsets[0].y > 0);
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 150)); });
  assert.equal(runtime.fixture.scrollLocations.length, 2); assert.equal(runtime.fixture.scrollLocations.at(-1)!.sectionIndex, 3);
  assert.equal(section(app, 3).expanded, false); assert.equal(selected(app, 'Upcoming'), true);
  runtime.fixture.scrollFailures = 1; await app.tapSet('Go to Upcoming'); await app.tapSet('Go to Earlier');
  const count = runtime.fixture.scrollLocations.length;
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 150)); });
  assert.equal(runtime.fixture.scrollLocations.length, count); assert.equal(selected(app, 'Earlier'), true);
});

test('programmatic selection releases after settling, and unmount cancels pending jump work', async (t) => {
  const f = await fixture(t); const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  await app.tapSet('Go to Upcoming'); await visible(app, 'Earlier', true); assert.equal(selected(app, 'Upcoming'), true);
  await act(() => t.mock.timers.tick(801)); await visible(app, 'Today'); assert.equal(selected(app, 'Today'), true);
  runtime.fixture.scrollFailures = 3; await app.tapSet('Go to Upcoming'); const count = runtime.fixture.scrollLocations.length;
  await app.unmount(); await act(() => t.mock.timers.tick(1000)); assert.equal(runtime.fixture.scrollLocations.length, count);
});

test('persistent measurement failure is bounded and manual scrolling can recover selection', async (t) => {
  const f = await fixture(t); const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  t.mock.timers.enable({ apis: ['setTimeout'] }); runtime.fixture.scrollFailures = 100;
  await app.tapSet('Go to Upcoming');
  for (let index = 0; index < 12; index++) await act(() => t.mock.timers.tick(121));
  assert.equal(runtime.fixture.scrollLocations.length, 10);
  await visible(app, 'Today'); assert.equal(selected(app, 'Today'), true);
});

for (const width of [320, 390]) for (const fontScale of [1, 2]) test(`section navigation stays accessible at width ${width} and font scale ${fontScale}`, async (t) => {
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width, height: 800, scale: 1, fontScale }));
  const f = await fixture(t); const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  for (const title of destinations) {
    const button = app.find('Pressable', `Go to ${title}`);
    assert.ok(Number(flatten(button.props.style).minHeight) >= 44);
    assert.equal(flatten(button.props.style).height, undefined, 'Height grows with text');
    const label = app.nodes(button).find((node) => node.kind === 'ThemedText')!;
    assert.equal(label.props.numberOfLines, undefined); assert.ok(Number(flatten(label.props.style).fontSize) >= 13);
    const wrapper = flatten(button.parentNode!.props.style);
    assert.equal(wrapper.maxWidth, '100%'); if (fontScale === 2) assert.equal(wrapper.flexBasis, '46%');
  }
  await app.tapSet('Go to Today'); assert.equal(selected(app, 'Today'), true);
  if (fontScale === 2) {
    assert.equal(flatten(app.nodes().find((node) => node.props?.testID === 'today-details-reflow')!.props.style).width, '100%', 'Today metadata uses full available width at large text');
    assert.ok(app.nodes(app.find('Pressable', 'Go to Today')).some((node) => flatten(node.props?.style).height === 2), 'Static non-color indicator at large text');
  }
});

test('live Reduced Motion disables animated native jumps while preserving selection and disclosure state', async (t) => {
  const f = await fixture(t); const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  await act(() => (runtime.reduceMotion as (value: boolean) => void)(true)); await app.tapSet('Go to Upcoming');
  assert.equal(runtime.fixture.scrollLocations.at(-1)!.animated, false); assert.equal(selected(app, 'Upcoming'), true);
  assert.equal(section(app, 3).expanded, false);
});

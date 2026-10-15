/// <reference types="node" />
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import type { EntryAnimationsValues, ExitAnimationsValues, LayoutAnimationFunction } from 'react-native-reanimated';

import { taskDraft } from '../src/features/tasks/form';
import type { TaskWorkspaceSection } from '../src/features/tasks/workspace';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const require = createRequire(import.meta.url);
const { disclosureCellAnimations, TaskDisclosureCell } = require('../src/features/tasks/components/task-disclosure-motion') as typeof import('../src/features/tasks/components/task-disclosure-motion');
const motion = require('./helpers/native-motion.cjs') as { calls: { value: number; config: { duration: number; easing: (value: number) => number; reduceMotion: string } }[] };
type App = Awaited<ReturnType<typeof mount>>;
async function fixture(t: TestContext) {
  const f = await journalDatabase(); f.setTime('2026-10-14'); t.after(() => f.sqlite.close()); t.mock.method(Date, 'now', f.now);
  return f;
}
function section(app: App, title: string) { return (app.find('SectionList').props.sections as TaskWorkspaceSection[]).find((row) => row.title === title)!; }
function cell(app: App, key: string) { return app.nodes().find((node) => node.props?.testID === `task-cell-${key}`)!; }
const entry = { targetHeight: 80, targetOriginY: 300 } as EntryAnimationsValues;
const exit = { currentHeight: 80, currentOriginY: 300 } as ExitAnimationsValues;
const layout = { currentHeight: 100, currentOriginY: 200, targetHeight: 160, targetOriginY: 440 } as Parameters<LayoutAnimationFunction>[0];
function animationFixture(t: TestContext) {
  let clock = 1000; t.mock.method(Date, 'now', () => clock);
  let value = { id: 1, section: 'Earlier', opening: true, requestedAt: 1000, start: 1000, end: 1260, anchor: 100 as number | null };
  const shared = { get: () => value, set: (next: typeof value) => { value = next; } } as Parameters<typeof disclosureCellAnimations>[0];
  motion.calls.length = 0;
  return { animations: disclosureCellAnimations(shared, 'Earlier'), shared, advance: (milliseconds: number) => { clock += milliseconds; },
    change: (patch: Partial<typeof value>) => { value = { ...value, ...patch }; } };
}

test('native content entry is attached to opacity, geometry and restrained travel, sharing one deadline without an index delay', (t) => {
  const f = animationFixture(t); const result = f.animations.entering(entry);
  assert.equal(result.initialValues.opacity, .15); assert.equal(result.initialValues.originY, 100);
  assert.equal(result.initialValues.height, 0); assert.deepEqual(result.initialValues.transform, [{ translateY: -6 }]);
  assert.equal(result.animations.height, 80); assert.equal(result.animations.originY, 300); assert.equal(result.animations.opacity, 1);
  assert.equal(motion.calls.length, 4); assert.ok(motion.calls.every((call) => call.config.duration === 260 && call.config.reduceMotion === 'system'));
  motion.calls.length = 0; f.advance(130);
  const late = f.animations.entering(entry);
  assert.ok(Number(late.initialValues.opacity) > .15); assert.ok(Number(late.initialValues.height) > 0);
  assert.ok(motion.calls.every((call) => call.config.duration === 130), 'Later virtual cells join the same finishing time');
  f.advance(131); motion.calls.length = 0;
  assert.equal(f.animations.entering(entry).initialValues.opacity, 1); assert.equal(motion.calls.length, 0, 'Ordinary later scrolling does not replay entry motion');
});

test('native exit fades and retracts toward the section boundary; unrelated removals are immediate', (t) => {
  const f = animationFixture(t); f.change({ opening: false });
  const result = f.animations.exiting(exit);
  assert.equal(result.initialValues.originY, 300); assert.equal(result.initialValues.height, 80);
  assert.equal(result.animations.originY, 100); assert.equal(result.animations.height, 0); assert.equal(result.animations.opacity, 0);
  assert.deepEqual(result.animations.transform, [{ translateY: -4 }]);
  assert.deepEqual(motion.calls.map((call) => call.config.duration), [200, 260, 260, 200]);
  motion.calls.length = 0; f.change({ section: 'Upcoming' }); f.animations.exiting(exit);
  assert.equal(motion.calls.length, 0);
});

test('the first eligible native callback starts the shared clock after virtualized batching; expired pending gestures do not replay', (t) => {
  const f = animationFixture(t); f.change({ start: 0, end: 0 }); f.advance(350);
  const header = disclosureCellAnimations(f.shared, 'Earlier', true);
  header.layout(layout); assert.equal(f.shared.get().end, 0, 'The static toggled header does not consume the content timeline');
  const result = f.animations.entering(entry);
  assert.equal(result.initialValues.height, 0); assert.equal(f.shared.get().end, 1610);
  assert.ok(motion.calls.every((call) => call.config.duration === 260));
  f.change({ id: 2, start: 0, end: 0 }); f.advance(1001); motion.calls.length = 0;
  assert.equal(f.animations.entering(entry).initialValues.height, entry.targetHeight); assert.equal(motion.calls.length, 0);
});

test('ordinary following cells never write geometry or animate, even during a disclosure', (t) => {
  const f = animationFixture(t);
  const disclosed = f.animations.layout(layout);
  assert.deepEqual(disclosed.initialValues, { originY: 200, height: 100 });
  assert.deepEqual(disclosed.animations, { originY: 440, height: 160 });
  assert.equal(motion.calls.length, 2, 'Geometry interpolation remains available within the active disclosure');
  motion.calls.length = 0;
  const following = disclosureCellAnimations(f.shared, 'Today');
  const result = following.layout(layout);
  assert.deepEqual(result.initialValues, {});
  assert.deepEqual(result.animations, {});
  assert.equal(motion.calls.length, 0);
  f.change({ section: 'Upcoming' }); motion.calls.length = 0; following.layout(layout);
  assert.equal(motion.calls.length, 0, 'Upcoming must not animate earlier Today geometry');
  f.advance(261); following.layout(layout); assert.equal(motion.calls.length, 0);
});

test('a replacement gesture invalidates old native curves so superseded exits resolve without lingering opacity', (t) => {
  const f = animationFixture(t); f.change({ opening: false }); f.animations.exiting(exit);
  const curves = motion.calls.map((call) => call.config.easing);
  assert.ok(curves.every((curve) => curve(.4) < 1));
  f.change({ id: 2, opening: true });
  assert.ok(curves.every((curve) => curve(.4) === 1), 'Old native animation properties resolve to their endpoints on the next frame');
});

test('unknown header geometry remains safe, and dynamic native row heights determine reveal size', (t) => {
  const f = animationFixture(t); f.change({ anchor: null });
  assert.equal(f.animations.entering(entry).initialValues.originY, entry.targetOriginY);
  assert.equal(f.animations.entering({ ...entry, targetHeight: 247 }).animations.height, 247);
});

test('real native cell roots preserve measurement/focus callbacks and use the measured header edge without overriding nativeID', async (t) => {
  const f = await fixture(t); f.tasks.createTask({ ...taskDraft(), title: 'Earlier row', date: '2026-10-13' });
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  const header = cell(app, 'Earlier:header'); const event = { nativeEvent: { layout: { x: 0, y: 80, width: 280, height: 68 } } };
  await act(() => (header.props.onLayout as (event: unknown) => void)(event));
  assert.equal(runtime.fixture.cellLayouts.at(-1), event, 'SectionList retains its original measurement event');
  assert.equal(typeof header.props.onFocusCapture, 'function'); assert.equal(header.props.nativeID, undefined);
  await app.tapSet('Earlier, 1 tasks');
  const item = section(app, 'Earlier').data[0]; const native = cell(app, `Earlier:${item.key}`);
  assert.equal(native.props.collapsable, false); motion.calls.length = 0;
  const result = (native.props.entering as ReturnType<typeof disclosureCellAnimations>['entering'])(entry);
  assert.equal(result.initialValues.originY, event.nativeEvent.layout.y + event.nativeEvent.layout.height);
  assert.equal(app.find('SectionList').props.CellRendererComponent, TaskDisclosureCell);
  assert.equal(app.find('SectionList').props.removeClippedSubviews, false, 'Native clipping must not cut off exits; SectionList still virtualizes');
});

for (const title of ['Earlier', 'Upcoming']) test(`${title}: rapid toggles keep authoritative state/unique rows, and collapsed content is actually removed`, async (t) => {
  const f = await fixture(t);
  for (let index = 0; index < 180; index++) f.tasks.createTask({ ...taskDraft(), title: `${title} row ${index}`, date: title === 'Earlier' ? '2026-10-13' : '2026-10-15' });
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  const original = f.tasks.read(); const list = app.find('SectionList'); const renderer = list.props.CellRendererComponent;
  assert.equal(section(app, title).data.length, 0);
  for (let index = 0; index < 7; index++) {
    await app.tapSet(`${title}, 180 tasks`);
    const expected = index % 2 === 0;
    assert.equal(section(app, title).expanded, expected); assert.equal(section(app, title).data.length, expected ? 180 : 0);
    const keys = section(app, title).data.map((item) => item.key); assert.equal(new Set(keys).size, keys.length);
    assert.equal(list.props.CellRendererComponent, renderer, 'A stable renderer must not remount every visible cell');
    if (!expected) assert.ok(!app.nodes().some((node) => node.props?.testID?.toString().startsWith('task-row-')), 'No hidden pre-rendered task collection');
  }
  const native = cell(app, `${title}:${section(app, title).data[0].key}`);
  const entering = native.props.entering; const layoutFunction = native.props.layout;
  await app.resume();
  assert.equal(cell(app, `${title}:${section(app, title).data[0].key}`).props.entering, entering);
  assert.equal(cell(app, `${title}:${section(app, title).data[0].key}`).props.layout, layoutFunction);
  assert.deepEqual(f.tasks.read(), original); assert.equal(runtime.fixture.layoutAnimations.length, 0);
});

test('live Reduced Motion removes native entry/exit/layout props and subsequent toggles remain immediate and understandable', async (t) => {
  const f = await fixture(t); f.tasks.createTask({ ...taskDraft(), title: 'Motion preference', date: '2026-10-13' });
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount); await app.tapSet('Earlier, 1 tasks');
  await act(() => (runtime.reduceMotion as (value: boolean) => void)(true)); motion.calls.length = 0;
  for (const node of app.nodes().filter((node) => String(node.props?.testID).startsWith('task-cell-'))) {
    assert.equal(node.props.entering, undefined); assert.equal(node.props.exiting, undefined); assert.equal(node.props.layout, undefined);
  }
  await app.tapSet('Earlier, 1 tasks'); await app.tapSet('Earlier, 1 tasks');
  assert.equal(section(app, 'Earlier').expanded, true); assert.equal(motion.calls.length, 0);
  assert.deepEqual(app.find('Pressable', 'Earlier, 1 tasks').props.accessibilityState, { expanded: true, disabled: false });
});

/// <reference types="node" />
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { act, createElement, useSyncExternalStore } from 'react';
import { taskDraft } from '../src/features/tasks/form';
import { localDateString } from '../src/utils/calendar';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

type App = Awaited<ReturnType<typeof mount>>;
const node = (app: App, id: string) => app.nodes().find(n => n.props?.testID === id);
const press = (app: App, id: string) => app.tapSet(String(node(app, 'home-card-' + id)!.props.accessibilityLabel));
async function setup(t: TestContext, failures: string[] = []) {
  const f = await journalDatabase(); f.setTime(localDateString(new Date())); t.after(() => f.sqlite.close());
  f.tasks.createTask({ ...taskDraft(), title: 'Actual scheduled work', date: localDateString(new Date()) });
  const app = await mount(createElement(screens.HomeScreen), f.db, failures); t.after(app.unmount);
  return { f, app };
}

for (const theme of ['dark', 'light']) test(`${theme}: out-of-flow background preserves native scroll discovery, decoration, caching and stable identity`, async t => {
  t.mock.method(runtime.native as { useColorScheme: () => string }, 'useColorScheme', () => theme);
  const { app } = await setup(t), background = node(app, 'home-background')!, image = node(app, 'home-background-' + theme)!;
  assert.ok(image); assert.equal(node(app, 'home-background-' + (theme === 'dark' ? 'light' : 'dark')), undefined);
  assert.equal(background.props.pointerEvents, 'none'); assert.equal(background.props.accessible, false);
  assert.equal(background.props.accessibilityElementsHidden, true); assert.equal(background.props.importantForAccessibility, 'no-hide-descendants');
  assert.equal(image.props.accessible, false); assert.equal(image.props.contentFit, 'cover');
  assert.equal(image.props.cachePolicy, 'memory'); assert.equal(image.props.transition, 0);
  const scroll = app.find('ScrollView');
  assert.equal(scroll.parentNode!.childNodes[0], scroll, 'native first-descendant lookup still reaches the real ScrollView');
  const beforeLayout = runtime.fixture.reads.length;
  await act(() => (scroll.props.onLayout as (event: unknown) => void)({ nativeEvent: { layout: { height: 740 } } }));
  assert.equal(node(app, 'home-background-' + theme), image, 'viewport measurement does not remount the image');
  assert.equal(runtime.fixture.reads.length, beforeLayout, 'viewport measurement performs no source reads');
  const reads = runtime.fixture.reads.length;
  await press(app, 'today'); await press(app, 'attention'); await press(app, 'attention');
  assert.equal(runtime.fixture.reads.length, reads); assert.equal(node(app, 'home-background-' + theme), image);
  await app.refocus(); assert.equal(node(app, 'home-background-' + theme), image);
  await press(app, 'fitness'); await press(app, 'journal');
  assert.deepEqual(runtime.fixture.navigation.slice(-2), [
    { method: 'navigate', target: { pathname: '/(tabs)/fitness' } }, { method: 'push', target: { pathname: '/journal' } },
  ]);
});

test('live theme switching updates only the background source; a late old-source error cannot hide the new theme', async t => {
  let theme = 'dark'; const listeners = new Set<() => void>();
  const subscribe = (callback: () => void) => { listeners.add(callback); return () => { listeners.delete(callback); }; };
  function useTestTheme() { return useSyncExternalStore(subscribe, () => theme, () => theme); }
  t.mock.method(runtime.native as { useColorScheme: () => string }, 'useColorScheme', useTestTheme);
  const { app } = await setup(t), background = node(app, 'home-background')!, original = node(app, 'home-background-dark')!;
  await press(app, 'today'); const reads = runtime.fixture.reads.length;
  await act(() => { theme = 'light'; listeners.forEach(callback => callback()); });
  const light = node(app, 'home-background-light')!; assert.ok(light); assert.notEqual(light, original);
  assert.equal(node(app, 'home-background-dark'), undefined); assert.equal(node(app, 'home-background'), background);
  assert.ok(node(app, 'home-detail-today'));
  await act(() => (original.props.onError as () => void)()); assert.equal(node(app, 'home-background-light'), light);
  await act(() => { theme = 'dark'; listeners.forEach(callback => callback()); });
  assert.equal(node(app, 'home-background-dark'), undefined, 'failed theme retains solid-canvas fallback');
  assert.equal(runtime.fixture.reads.length, reads); assert.ok(node(app, 'home-detail-today'));
});

test('decorative image failure retains source values, readable controls and the existing transaction shortcut', async t => {
  t.mock.method(runtime.native as { useColorScheme: () => string }, 'useColorScheme', () => 'light');
  const { app, f } = await setup(t), reads = runtime.fixture.reads.length;
  await act(() => (node(app, 'home-background-light')!.props.onError as () => void)());
  assert.equal(node(app, 'home-background-light'), undefined); assert.ok(node(app, 'home-background'));
  assert.ok(app.find('View', 'Spent today, R$ 0,00')); await press(app, 'today');
  assert.ok(app.container.textContent.includes('Actual scheduled work')); assert.equal(runtime.fixture.reads.length, reads);
  await app.press('Add transaction'); assert.ok(app.find('FormButton', 'Save')); await app.press('Cancel');
  assert.equal(f.finance.read().transactions.length, 0); assert.ok(node(app, 'home-detail-today'));
  assert.equal(node(app, 'home-background-light'), undefined);
});

test('background loading never gates Home failure recovery or the first successful snapshot', async t => {
  const { app } = await setup(t, ['home.read']);
  const image = app.nodes().find(n => String(n.props?.testID ?? '').startsWith('home-background-'))!;
  assert.ok(image); assert.ok(app.find('FormButton', 'Retry')); assert.equal(node(app, 'home-card-today'), undefined);
  runtime.fixture.failures.clear(); await app.press('Retry');
  assert.ok(node(app, 'home-card-today')); assert.equal(app.nodes().find(n => n.props?.testID === image.props.testID), image);
});

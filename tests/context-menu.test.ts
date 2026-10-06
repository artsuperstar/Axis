/// <reference types="node" />

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test, type TestContext } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { act, createElement } from 'react';

import { bundledMigrations, database } from './helpers/database';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const require = createRequire(import.meta.url);
const { ContextMenu, ContextMenuHost } = require('../src/components/context-menu') as typeof import('../src/components/context-menu');
type App = Awaited<ReturnType<typeof mount>>;
async function initialized(t: TestContext) {
  const f = database(); await migrate(f.db, bundledMigrations); t.after(() => f.sqlite.close()); return f;
}
async function settle() { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); }); }
function overlay(app: App) { return app.nodes().find((node) => node.kind === 'View' && node.props.role === 'dialog' && node.props['aria-label'] === 'Task options'); }
function noModal(app: App) { assert.ok(!app.nodes().some((node) => node.kind === 'Modal')); }
function key(key: string) { document.dispatchEvent({ type: 'keydown', key, preventDefault() {} } as unknown as Event); }

test('Task options opens a measured, right-aligned action overlay with exactly three actions and no bottom sheet', async (t) => {
  const f = await initialized(t); const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  const trigger = app.find('FormButton', 'Task options'); assert.equal(trigger.props.expanded, false); await app.press('Task options');
  assert.equal(trigger.props.expanded, true); noModal(app); const panel = overlay(app)!; assert.ok(panel);
  assert.equal((panel.props.style as { position: string }).position, 'absolute');
  const options = app.nodes(panel).filter((node) => node.kind === 'FormButton');
  assert.deepEqual(options.map((node) => node.props.label), ['Categories', 'Repeating Tasks', 'History']);
  assert.ok(!app.nodes(panel).some((node) => node.props?.accessibilityRole === 'radio' || node.props?.accessibilityRole === 'header'));
  const surface = app.nodes(panel).find((node) => node.kind === 'View' && Array.isArray(node.props.style))!;
  const style = Object.assign({}, ...surface.props.style as object[]) as { position: string; width: number; height: number; top: number; left: number; borderRadius: number; elevation: number };
  assert.equal(style.position, 'absolute'); assert.ok(style.width > 44 && style.width <= 400);
  assert.ok(style.left + style.width <= 400 && style.top + style.height <= 800); assert.ok(style.top >= 60);
  assert.ok(style.borderRadius > 0 && style.elevation > 0);
  assert.ok(!app.container.textContent.includes('Task options choices'));
});

for (const [label, target] of [['Repeating Tasks', '/tasks/repeating'], ['History', '/tasks/history']] as const) {
  test(`${label} closes the menu before pushing its unchanged destination`, async (t) => {
    const f = await initialized(t); const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
    await app.press('Task options'); await app.press(label);
    assert.ok(!overlay(app)); assert.equal(app.find('FormButton', 'Task options').props.expanded, false); noModal(app);
    await settle(); assert.deepEqual(runtime.fixture.navigation.at(-1), { method: 'push', target });
  });
}

test('Categories closes the anchored menu before opening the existing management modal', async (t) => {
  const f = await initialized(t); const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  await app.press('Task options'); await app.press('Categories'); assert.ok(!overlay(app)); await settle();
  assert.equal(app.nodes().filter((node) => node.kind === 'Modal').length, 1); assert.ok(app.find('FormField', 'Category name'));
  assert.equal(app.find('FormButton', 'Task options').props.expanded, false); assert.ok(!overlay(app));
});

test('outside dismissal restores focus to Task options without navigation', async (t) => {
  const f = await initialized(t); const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  const trigger = app.find('FormButton', 'Task options'); await app.press('Task options'); await settle();
  assert.equal(document.activeElement, app.find('FormButton', 'Categories') as unknown as Element);
  await app.tapSet('Close task options'); assert.ok(!overlay(app)); await settle();
  assert.equal(trigger.props.expanded, false); assert.equal(document.activeElement, trigger as unknown as Element); assert.equal(runtime.fixture.navigation.length, 0);
});

test('Escape and keyboard action traversal reuse the shared host', async (t) => {
  const f = await initialized(t); const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  await app.press('Task options'); await settle(); await act(() => key('ArrowDown'));
  assert.equal(document.activeElement, app.find('FormButton', 'Repeating Tasks') as unknown as Element);
  await act(() => key('End')); assert.equal(document.activeElement, app.find('FormButton', 'History') as unknown as Element);
  await act(() => key('Escape')); await settle(); assert.ok(!overlay(app));
  assert.equal(document.activeElement, app.find('FormButton', 'Task options') as unknown as Element);
});

test('Android Back dismisses the contextual menu first and stops intercepting after dismissal', async (t) => {
  const f = await initialized(t); const platform = (runtime.native as { Platform: { OS: string } }).Platform;
  const previous = platform.OS; platform.OS = 'android'; t.after(() => { platform.OS = previous; });
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount); await app.press('Task options');
  let handled = false; await act(() => { handled = (runtime.back as () => boolean)(); }); assert.equal(handled, true); assert.ok(!overlay(app));
  assert.equal((runtime.back as () => boolean)(), false); assert.equal(runtime.fixture.navigation.length, 0);
});

test('losing screen focus dismisses without stealing focus back to the retained Tasks trigger', async (t) => {
  const f = await initialized(t); const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  await app.press('Task options'); await settle(); await act(runtime.blur as () => void); await settle();
  assert.ok(!overlay(app)); assert.equal(app.find('FormButton', 'Task options').props.expanded, false);
  assert.notEqual(document.activeElement, app.find('FormButton', 'Task options') as unknown as Element);
  await app.refocus(); assert.ok(!overlay(app));
});

test('large text expands menu width inside usable bounds and long action labels retain wrapping', async (t) => {
  const f = await initialized(t);
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width: 400, height: 800, fontScale: 2, scale: 1 }));
  const label = 'A much longer management action that should wrap rather than truncate';
  const app = await mount(createElement(ContextMenuHost, { safeAreaApplied: true, children: createElement(ContextMenu, {
    label: 'Task options', actions: [{ label, onPress() {} }],
  }) }), f.db); t.after(app.unmount); await app.press('Task options');
  const panel = app.nodes(overlay(app)!).find((node) => node.kind === 'View' && Array.isArray(node.props.style))!;
  const style = Object.assign({}, ...panel.props.style as object[]) as { width: number; left: number };
  assert.ok(style.width > 240 && style.width <= 400); assert.ok(style.left >= 0 && style.left + style.width <= 400);
  const action = app.find('FormButton', label); assert.equal(action.props.label, label); assert.equal(action.props.numberOfLines, undefined);
  assert.equal(action.props.variant, 'quiet'); assert.equal(action.props.align, 'start');
});

test('one shared host replaces an existing contextual menu when another trigger opens', async (t) => {
  const f = await initialized(t); const app = await mount(createElement(ContextMenuHost, { safeAreaApplied: true, children: [
    createElement(ContextMenu, { key: 'first', label: 'Task options', actions: [{ label: 'First action', onPress() {} }] }),
    createElement(ContextMenu, { key: 'second', label: 'Other options', actions: [{ label: 'Second action', onPress() {} }] }),
  ] }), f.db); t.after(app.unmount);
  await app.press('Task options'); assert.ok(app.find('FormButton', 'First action')); await app.press('Other options');
  assert.equal(app.find('FormButton', 'Task options').props.expanded, false); assert.equal(app.find('FormButton', 'Other options').props.expanded, true);
  assert.ok(!app.nodes().some((node) => node.props?.label === 'First action')); assert.ok(app.find('FormButton', 'Second action'));
});

/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { act, createElement } from 'react';

import { DesignColors } from '../src/constants/design-system-v2';
import { journalFullDate } from '../src/features/journal/presentation';
import { journalDatabase } from './helpers/journal';
import { taskDraft } from '../src/features/tasks/form';
import { transactionDraft } from '../src/features/finance/form';
import { pickerValue } from '../src/utils/calendar';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

function flatten(style: unknown): Record<string, unknown> { return Object.assign({}, ...(Array.isArray(style) ? style.map(flatten) : [style ?? {}])); }

for (const theme of ['light', 'dark'] as const) for (const [width, fontScale] of [[320, 1], [390, 1], [430, 1], [320, 2]] as const) {
  test(`${theme} ${width}/${fontScale}: Journal retains an owned, accessible writing flow with adaptive controls`, async t => {
    t.mock.method(runtime.native as { useColorScheme: () => string }, 'useColorScheme', () => theme);
    t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width, height: 844, scale: 1, fontScale }));
    const f = await journalDatabase(); f.setTime('2026-10-21'); t.mock.timers.enable({ apis: ['Date'], now: f.now() });
    t.after(() => f.sqlite.close()); runtime.fixture.routeParams = {};
    const app = await mount(createElement(screens.JournalScreen), f.db); t.after(app.unmount);
    assert.equal(flatten(app.find('SafeAreaView').props.style).backgroundColor, DesignColors[theme].canvas);
    assert.equal(app.find('FormButton', 'Back from journal').props.appearance, 'v2');
    const date = app.find('Pressable', journalFullDate('2026-10-21'));
    assert.equal(date.props.accessibilityRole, 'button'); assert.match(String(date.props.accessibilityHint), /today or earlier/);
    const next = app.find('FormButton', 'Next day'); assert.equal(next.props.disabled, true);
    assert.equal(flatten(next.parentNode!.parentNode!.props.style).flexDirection, width < 360 || fontScale >= 1.3 ? 'column' : 'row');
    const moods = app.nodes().filter(node => node.kind === 'Pressable' && String(node.props.accessibilityLabel).endsWith(', mood'));
    assert.equal(moods.length, 5); assert.ok(moods.every(node => node.props.accessibilityRole === 'button'));
    assert.equal(flatten(moods[0].parentNode!.props.style).flexWrap, 'wrap');
    assert.equal(flatten(moods[0].props.style).flexBasis, fontScale >= 1.8 ? '45%' : width < 360 ? '30%' : '16%');
    const heading = app.nodes().find(node => node.kind === 'ThemedText' && node.textContent === 'Journal')!;
    assert.equal(flatten(heading.parentNode!.props.style).flexDirection, fontScale >= 1.5 ? 'column' : 'row');
    await app.tapSet('Great, mood'); assert.equal(f.access.getEntry('2026-10-21'), null);
    const selected = app.find('Pressable', 'Great, mood'); assert.deepEqual(selected.props.accessibilityState, { selected: true });
    assert.ok(app.nodes(selected).some(node => node.props.testID === 'icon-check'));
    await app.change('Entry', 'My paragraphs\nRemain unsaved.');
    const field = app.find('FormField', 'Entry'); assert.equal(field.props.appearance, 'v2'); assert.equal(field.props.autoFocus, undefined);
    assert.equal(field.props.multiline, true); assert.equal(field.props.scrollEnabled, true); assert.equal(field.props.submitBehavior, 'newline');
    assert.equal(field.props.selection, undefined); assert.equal(field.props.showLabel, false);
    assert.equal((field.props.style as { minHeight: number }).minHeight, Math.max(320, 180 * fontScale));
    assert.equal(app.nodes().filter(node => node.kind === 'ScrollView').length, 1);
    const save = app.find('Pressable', `Save entry journal for ${journalFullDate('2026-10-21')}`);
    assert.deepEqual(save.props.accessibilityState, { disabled: false });
    for (let parent = save.parentNode; parent; parent = parent.parentNode) assert.notEqual(parent.kind, 'ScrollView');
    await act(() => (save.props.onPress as () => void)()); assert.equal(f.access.getEntry('2026-10-21')!.content, 'My paragraphs\nRemain unsaved.');
    assert.ok(app.container.textContent.includes('Saved')); await app.resume(); assert.equal(app.find('FormField', 'Entry').props.value, field.props.value);
    assert.equal(runtime.fixture.layoutAnimations.length, 0);
  });
}

for (const theme of ['light', 'dark'] as const) for (const [width, fontScale] of [[320, 1], [390, 1], [430, 1], [320, 2]] as const) {
  test(`${theme} ${width}/${fontScale}: contextual source blocks stay static, bounded and readable through refresh failure/recovery`, async t => {
    t.mock.method(runtime.native as { useColorScheme: () => string }, 'useColorScheme', () => theme);
    t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width, height: 844, scale: 1, fontScale }));
    const f = await journalDatabase(); f.setTime('2026-10-21'); t.mock.timers.enable({ apis: ['Date'], now: f.now() }); t.after(() => f.sqlite.close());
    runtime.fixture.routeParams = {};
    const ids = Array.from({ length: 7 }, (_, index) => { const id = f.tasks.createTask({ ...taskDraft(), title: `A completed task with a long title for readable contextual wrapping ${index}` }); f.tasks.setCompleted(id, true); return id; });
    f.fitness.finishWorkout(f.fitness.startWorkout().id);
    f.finance.createTransaction({ ...transactionDraft(null, pickerValue('2026-10-21')), description: 'Actual expense', amount: '42,90' });
    const app = await mount(createElement(screens.JournalScreen), f.db); t.after(app.unmount);
    const block = (name: string) => app.nodes().find(node => node.props?.testID === `journal-context-${name}`)!;
    for (const name of ['tasks', 'fitness', 'finance']) {
      const source = block(name); assert.ok(source); assert.equal(source.props.accessible, true);
      assert.equal(source.props.onPress, undefined); assert.equal(source.props.accessibilityRole, undefined);
      assert.equal(flatten(source.props.style).flexDirection, fontScale >= 1.5 ? 'column' : 'row');
      assert.ok(app.nodes(source).every(node => node.kind !== 'Pressable' && node.kind !== 'FormButton' && node.props?.onPress === undefined && node.props?.accessibilityRole !== 'button'));
    }
    assert.ok(block('tasks').textContent.includes('7 completed')); assert.ok(block('tasks').textContent.includes('+3 more'));
    assert.equal(app.nodes(block('tasks')).filter(node => node.kind === 'ThemedText' && String(node.textContent).startsWith('A completed task')).length, 4);
    assert.match(String(block('tasks').props.accessibilityLabel), /3 more completed tasks/);
    assert.ok(block('fitness').textContent.includes('Free workout')); assert.ok(block('fitness').textContent.includes('Workout completed'));
    assert.match(String(block('finance').props.accessibilityLabel), /Spent.*42,90.*Income.*0,00.*Net.*-.*42,90/);
    assert.equal(app.nodes().filter(node => node.kind === 'ScrollView').length, 1);
    await app.change('Entry', 'My unsaved draft'); const input = app.find('FormField', 'Entry');
    runtime.fixture.failures.add('journalContext.read'); await app.resume();
    assert.ok(block('tasks').textContent.includes('7 completed')); assert.equal(app.find('FormField', 'Entry'), input);
    f.tasks.setCompleted(ids[0], false); runtime.fixture.failures.clear(); await app.press('Retry activity');
    assert.ok(block('tasks').textContent.includes('6 completed')); assert.ok(block('tasks').textContent.includes('+2 more'));
    assert.equal(input.props.value, 'My unsaved draft'); assert.equal(f.access.getEntry('2026-10-21'), null);
  });
}

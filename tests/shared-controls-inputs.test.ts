/// <reference types="node" />
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { act, createElement, Fragment, useState } from 'react';

import { designFieldAppearance, designSelectionAppearance } from '../src/components/control-appearance';
import { DesignColors, Shape, TouchTarget } from '../src/constants/design-system-v2';
import { contrast } from './helpers/soft-copper-contrast';
import { mount } from './helpers/refresh-lifecycle';

const require = createRequire(import.meta.url);
const controls = require('../src/components/form-controls') as typeof import('../src/components/form-controls');
const { UiButton } = require('../src/components/design-system') as typeof import('../src/components/design-system');
const { InternalNavigation } = require('../src/components/internal-navigation') as typeof import('../src/components/internal-navigation');
const native = require('./helpers/lifecycle-native.cjs').native as {
  useColorScheme: () => string | null; useWindowDimensions: () => { width: number; height: number; scale: number; fontScale: number };
};
const flat = (style: unknown): Record<string, unknown> => Object.assign({}, ...[style].flat(Infinity));
type App = Awaited<ReturnType<typeof mount>>;
async function event(app: App, label: string, name: string, kind = 'Pressable') {
  await act(() => (app.find(kind, label).props[name] as (event: object) => void)({ nativeEvent: { target: 1 } }));
}
function pressableStyle(app: App, label: string, pressed = false) {
  const style = app.find('Pressable', label).props.style;
  return flat(typeof style === 'function' ? style({ pressed }) : style);
}

for (const mode of ['dark', 'light'] as const) {
  const colors = DesignColors[mode];
  test(`${mode}: neutral resting boundaries contrast against both sides, without changing control palettes`, () => {
    const resting = designFieldAppearance(colors);
    assert.equal(resting.borderColor, colors.controlBorder); assert.equal(resting.backgroundColor, colors.surface);
    assert.equal(resting.borderWidth, 1); assert.equal(resting.outlineWidth, 0); assert.equal(resting.borderRadius, Shape.control);
    for (const adjacent of [colors.surface, colors.group, colors.groupStrong, colors.canvas, colors.control, colors.surfaceRaised]) {
      assert.ok(contrast(resting.borderColor, adjacent) >= 3, adjacent);
      assert.ok(contrast(colors.brandFocus, adjacent) >= 3, 'Focus indicator');
      assert.ok(contrast(colors.danger, adjacent) >= 3, 'Invalid indicator');
    }
    assert.ok(contrast(colors.textPrimary, resting.backgroundColor) >= 4.5);
    assert.ok(contrast(colors.textMuted, resting.backgroundColor) >= 4.5);
  });
  test(`${mode}: focus and invalid coexist with stable editing geometry; disabled wins interaction`, () => {
    const resting = designFieldAppearance(colors), focused = designFieldAppearance(colors, { focused: true });
    const invalid = designFieldAppearance(colors, { invalid: true, focused: true });
    assert.equal(focused.outlineColor, colors.brandFocus); assert.equal(focused.outlineWidth, 2); assert.equal(focused.outlineOffset, 2);
    assert.equal(invalid.borderColor, colors.danger); assert.equal(invalid.outlineColor, colors.brandFocus); assert.equal(invalid.outlineWidth, 2);
    assert.equal(invalid.borderWidth, resting.borderWidth); assert.equal(focused.minHeight, resting.minHeight);
    assert.equal(designFieldAppearance(colors, { expanded: true, invalid: true }).outlineWidth, 2);
    const readOnly = designFieldAppearance(colors, { readOnly: true }), disabled = designFieldAppearance(colors, { disabled: true, focused: true, invalid: true, pressed: true });
    assert.equal(readOnly.backgroundColor, colors.inset); assert.equal(readOnly.color, colors.textPrimary); assert.equal(readOnly.borderColor, colors.controlBorder);
    assert.equal(disabled.backgroundColor, colors.inset); assert.equal(disabled.color, colors.textDisabled); assert.equal(disabled.borderColor, colors.border);
    assert.equal(disabled.outlineWidth, 0); assert.equal(disabled.opacity, 1);
  });
  test(`${mode}: rendered field retains value, source hints, callbacks and associated errors through focus/typing`, async (t) => {
    t.mock.method(native, 'useColorScheme', () => mode); let focuses = 0, blurs = 0;
    function Probe() {
      const [value, setValue] = useState('12,50');
      return createElement(controls.FormField, { appearance: 'v2', label: 'Amount', value, onChangeText: setValue,
        accessibilityHint: 'Source hint', helperText: 'Integer centavos remain source-owned', error: 'Check this amount',
        onFocus: () => focuses++, onBlur: () => blurs++ });
    }
    const app = await mount(createElement(Probe), null); t.after(app.unmount); const input = app.find('TextInput', 'Amount');
    const initial = flat(input.props.style);
    assert.equal(input.props.editable, true); assert.equal(input.props['aria-invalid'], true);
    const error = app.nodes().find(node => node.kind === 'ThemedText' && node.textContent === 'Check this amount')!;
    assert.ok(error); assert.equal(input.props['aria-describedby'], error.props.nativeID); assert.equal(error.props.accessibilityRole, 'alert');
    assert.match(String(input.props.accessibilityHint), /Source hint.*Integer centavos.*Check this amount/);
    await event(app, 'Amount', 'onFocus', 'TextInput');
    assert.equal(flat(input.props.style).borderColor, colors.danger); assert.equal(flat(input.props.style).outlineColor, colors.brandFocus);
    assert.equal(flat(input.props.style).outlineWidth, 2); assert.equal(flat(input.props.style).borderWidth, initial.borderWidth);
    await act(() => (input.props.onChangeText as (value: string) => void)('125,90'));
    assert.equal(input.props.value, '125,90'); assert.equal(flat(input.props.style).paddingVertical, 0); assert.equal(flat(input.props.style).lineHeight, undefined);
    await event(app, 'Amount', 'onBlur', 'TextInput'); assert.equal(flat(input.props.style).outlineWidth, 0);
    assert.equal(focuses, 1); assert.equal(blurs, 1);
  });
  test(`${mode}: read-only is not disabled; textarea minimum and caller sizes remain content-friendly`, async (t) => {
    t.mock.method(native, 'useColorScheme', () => mode);
    const app = await mount(createElement(Fragment, null,
      createElement(controls.FormField, { appearance: 'v2', label: 'Read only', value: 'Linked source value', editable: false }),
      createElement(controls.FormField, { appearance: 'v2', label: 'Disabled', value: 'Unavailable value', disabled: true }),
      createElement(controls.FormField, { appearance: 'v2', label: 'Notes', multiline: true, value: 'Long notes' }),
      createElement(controls.FormField, { appearance: 'v2', label: 'Tall notes', multiline: true, value: 'Long notes', style: { minHeight: 144 } })), null); t.after(app.unmount);
    const readOnly = app.find('TextInput', 'Read only'), disabled = app.find('TextInput', 'Disabled');
    assert.equal(readOnly.props.editable, false); assert.equal((readOnly.props.accessibilityState as { disabled: boolean }).disabled, false);
    assert.match(String(readOnly.props.accessibilityHint), /Read only/); assert.equal(flat(readOnly.props.style).color, colors.textPrimary);
    assert.equal(disabled.props.editable, false); assert.equal((disabled.props.accessibilityState as { disabled: boolean }).disabled, true);
    assert.equal(flat(disabled.props.style).color, colors.textDisabled); assert.equal(flat(disabled.props.style).opacity, 1);
    assert.equal(flat(app.find('TextInput', 'Notes').props.style).minHeight, 96);
    assert.equal(flat(app.find('TextInput', 'Tall notes').props.style).minHeight, 144);
  });
  test(`${mode}: select trigger preserves selected text, errors, expansion and press callback`, async (t) => {
    t.mock.method(native, 'useColorScheme', () => mode); let presses = 0;
    const app = await mount(createElement(controls.FormSelect, { appearance: 'v2', label: 'Category', value: 'Saved archived category', expanded: true, error: 'Review category', onPress: () => presses++ }), null); t.after(app.unmount);
    const trigger = app.find('Pressable', 'Category');
    assert.equal((trigger.props.accessibilityValue as { text: string }).text, 'Saved archived category');
    assert.equal((trigger.props.accessibilityState as { expanded: boolean }).expanded, true);
    const appearance = pressableStyle(app, 'Category'); assert.equal(appearance.borderColor, colors.danger); assert.equal(appearance.outlineWidth, 2);
    const error = app.nodes().find(node => node.kind === 'ThemedText' && node.textContent === 'Review category')!;
    assert.equal(trigger.props['aria-describedby'], error.props.nativeID);
    await event(app, 'Category', 'onPress'); assert.equal(presses, 1);
  });
  test(`${mode}: unselected press is neutral while selection, check and focus remain separate`, async (t) => {
    t.mock.method(native, 'useColorScheme', () => mode);
    assert.equal(designSelectionAppearance(colors, { pressed: true }).backgroundColor, colors.controlPressed);
    assert.equal(designSelectionAppearance(colors, { selected: true, pressed: true }).backgroundColor, colors.selected);
    function Probe() { const [selected, setSelected] = useState(false); return createElement(controls.FormChoice, { appearance: 'v2', label: 'Choice', selected, onPress: () => setSelected(value => !value) }); }
    const app = await mount(createElement(Probe), null); t.after(app.unmount);
    await event(app, 'Choice', 'onFocus'); assert.equal(pressableStyle(app, 'Choice').backgroundColor, 'transparent'); assert.equal(pressableStyle(app, 'Choice').outlineWidth, 2);
    assert.equal(pressableStyle(app, 'Choice', true).backgroundColor, colors.controlPressed);
    await event(app, 'Choice', 'onPress'); assert.equal((app.find('Pressable', 'Choice').props.accessibilityState as { checked: boolean }).checked, true);
    assert.equal(pressableStyle(app, 'Choice').backgroundColor, colors.selected); assert.equal(pressableStyle(app, 'Choice').borderColor, colors.brandBorder);
    assert.equal(pressableStyle(app, 'Choice').minWidth, TouchTarget); assert.equal(pressableStyle(app, 'Choice').borderRadius, Shape.control);
    await event(app, 'Choice', 'onBlur'); assert.equal(pressableStyle(app, 'Choice').backgroundColor, colors.selected);
  });
  test(`${mode}: segmented values/ordering survive press and large text changes only arrangement`, async (t) => {
    t.mock.method(native, 'useColorScheme', () => mode);
    t.mock.method(native, 'useWindowDimensions', () => ({ width: 320, height: 844, scale: 1, fontScale: 2 }));
    function Probe() { const [value, setValue] = useState('income'); return createElement(controls.SegmentedControl, { appearance: 'v2', label: 'Type', value, options: [{ value: 'income', label: 'Income' }, { value: 'expense', label: 'Expense' }], onChange: value => setValue(String(value)) }); }
    const app = await mount(createElement(Probe), null); t.after(app.unmount);
    const group = app.nodes().find(node => node.props?.accessibilityRole === 'radiogroup')!;
    assert.equal(flat(group.props.style).flexDirection, 'column'); assert.equal(flat(group.props.style).borderColor, colors.controlBorder);
    await event(app, 'Type: Expense', 'onPressIn'); assert.equal(pressableStyle(app, 'Type: Expense').backgroundColor, colors.controlPressed);
    await event(app, 'Type: Expense', 'onPressOut'); assert.equal((app.find('Pressable', 'Type: Income').props.accessibilityState as { checked: boolean }).checked, true);
    await event(app, 'Type: Expense', 'onPress'); assert.equal((app.find('Pressable', 'Type: Expense').props.accessibilityState as { checked: boolean }).checked, true);
    assert.equal((app.find('Pressable', 'Type: Income').props.accessibilityState as { checked: boolean }).checked, false);
  });
  test(`${mode}: secondary/destructive/quiet and primary retain distinct state contracts`, async (t) => {
    t.mock.method(native, 'useColorScheme', () => mode);
    const app = await mount(createElement(Fragment, null, createElement(UiButton, { label: 'Secondary', onPress() {} }),
      createElement(UiButton, { label: 'Destructive', variant: 'destructive', onPress() {} }), createElement(UiButton, { label: 'Quiet', variant: 'quiet', onPress() {} })), null); t.after(app.unmount);
    assert.equal(pressableStyle(app, 'Secondary').borderColor, colors.controlBorder); assert.equal(pressableStyle(app, 'Secondary').borderWidth, 1);
    await event(app, 'Secondary', 'onPressIn'); assert.equal(pressableStyle(app, 'Secondary').backgroundColor, colors.controlPressed);
    await event(app, 'Secondary', 'onPressOut'); assert.equal(pressableStyle(app, 'Secondary').backgroundColor, colors.control);
    assert.equal(pressableStyle(app, 'Destructive').backgroundColor, colors.dangerSoft);
    assert.equal(pressableStyle(app, 'Quiet').backgroundColor, 'transparent');
  });
  test(`${mode}: compact shared navigation uses copper while content indigo stays independent`, async (t) => {
    t.mock.method(native, 'useColorScheme', () => mode); let changed = '';
    const app = await mount(createElement(InternalNavigation, { compact: true, value: 'Today', options: [{ value: 'Today', label: 'Today' }, { value: 'Earlier', label: 'Earlier' }], onChange: value => { changed = value; } }), null); t.after(app.unmount);
    const text = app.nodes().find(node => node.kind === 'ThemedText' && node.textContent === 'Today')!;
    assert.equal(flat(text.props.style).color, colors.brand); assert.notEqual(String(colors.brand), String(colors.taskText));
    assert.equal(pressableStyle(app, 'Go to Today').minWidth, 48);
    await event(app, 'Go to Earlier', 'onPress'); assert.equal(changed, 'Earlier');
  });
}

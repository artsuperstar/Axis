/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ViewStyle } from 'react-native';

import { buttonAppearance, fieldAppearance, type ButtonVariant } from '../src/components/control-appearance';
import { autocomplete, controls, renderControl, selection, sheets, statusText, theme, themedText, themedView } from './helpers/form-components';

function contrast(a: string, b: string) {
  function luminance(hex: string) {
    const [r, g, blue] = hex.slice(1).match(/../g)!.map((value) => parseInt(value, 16) / 255)
      .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return r * 0.2126 + g * 0.7152 + blue * 0.0722;
  }
  const x = luminance(a); const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const flatten = (style: unknown): ViewStyle & { color?: string } => Object.assign({}, ...[style].flat(Infinity));

for (const mode of ['light', 'dark'] as const) {
  test(`${mode} semantic text, statuses and principal action keep readable contrast`, () => {
    const colors = theme.Colors[mode];
    const surfaces = [colors.background, colors.surface, colors.surfaceRaised, colors.surfaceMuted];
    for (const background of surfaces) {
      for (const foreground of [colors.textPrimary, colors.textSecondary, colors.textMuted, colors.danger, colors.warning, colors.success, colors.info]) {
        assert.ok(contrast(foreground, background) >= 4.5, `${foreground} on ${background}`);
      }
    }
    assert.ok(contrast(colors.onAccent, colors.accent) >= 4.5);
    assert.ok(contrast(colors.accent, colors.accentMuted) >= 4.5);
    assert.ok(contrast(colors.accent, colors.surfaceRaised) >= 3);
    assert.notEqual(colors.background, colors.surface);
    assert.notEqual(colors.surface, colors.surfaceRaised);
    assert.equal(colors.text, colors.textPrimary, 'legacy text resolves to authoritative text');
    assert.equal(colors.backgroundElement, colors.surface);
  });

  test(`${mode} button roles, selection, focus and disabled states resolve independently`, () => {
    const colors = theme.Colors[mode];
    const primary = buttonAppearance(colors, 'primary');
    assert.equal(primary.style.backgroundColor, colors.accent); assert.equal(primary.textColor, colors.onAccent);
    assert.equal(buttonAppearance(colors, 'destructive').textColor, colors.danger);
    assert.equal(buttonAppearance(colors, 'quiet').style.backgroundColor, 'transparent');
    assert.equal(buttonAppearance(colors, 'secondary').textColor, colors.textPrimary);
    const navigation = buttonAppearance(colors, 'navigation', { selected: true });
    assert.equal(navigation.style.borderBottomWidth, 2); assert.equal(navigation.textColor, colors.accent);
    assert.notEqual(buttonAppearance(colors, 'primary', { focused: true }).style.borderColor, primary.style.borderColor);
    for (const variant of ['primary', 'secondary', 'quiet', 'destructive', 'navigation'] as const) {
      const disabled = buttonAppearance(colors, variant, { disabled: true, pressed: true });
      assert.equal(disabled.style.opacity, 1);
      assert.equal(disabled.textColor, colors.textMuted);
      assert.ok(contrast(disabled.textColor, disabled.style.backgroundColor as string) >= 4.5);
    }
  });

  test(`${mode} read-only values remain authoritative and error outranks focus`, () => {
    const colors = theme.Colors[mode];
    const readOnly = fieldAppearance(colors, { readOnly: true });
    const disabled = fieldAppearance(colors, { disabled: true });
    assert.equal(readOnly.opacity, 1); assert.equal(readOnly.color, colors.textPrimary);
    assert.notEqual(readOnly.color, disabled.color);
    assert.ok(contrast(readOnly.color, readOnly.backgroundColor) >= 4.5);
    assert.equal(fieldAppearance(colors, { focused: true }).borderColor, colors.accent);
    assert.equal(fieldAppearance(colors, { expanded: true }).backgroundColor, colors.surfaceRaised);
    assert.equal(fieldAppearance(colors, { focused: true, invalid: true }).borderColor, colors.danger);
  });
}

test('button variants preserve callbacks/disabled semantics and default to secondary', () => {
  for (const variant of [undefined, 'primary', 'secondary', 'quiet', 'destructive', 'navigation'] as (ButtonVariant | undefined)[]) {
    let pressed = 0;
    const result = renderControl(() => controls.FormButton({ label: 'Action', variant, selected: variant === 'navigation', onPress: () => { pressed++; } }));
    assert.match(result.markup, /role="button"/);
    result.elements[0].props.onPress!(); assert.equal(pressed, 1);
    const style = result.elements[0].props.style as unknown as (state: { pressed: boolean }) => unknown;
    assert.equal(flatten(style({ pressed: false })).backgroundColor, buttonAppearance(theme.Colors.light, variant ?? 'secondary', { selected: variant === 'navigation' }).style.backgroundColor);
    if (variant === 'navigation') assert.match(result.markup, /Action ✓/);
  }
  const disabled = renderControl(() => controls.FormButton({ label: 'Save', variant: 'primary', disabled: true, onPress: () => assert.fail() }));
  assert.match(disabled.markup, /aria-disabled="true"/);
});

test('read-only and disabled fields stay noneditable but expose different visual/accessible states', () => {
  for (const readOnlyProp of [false, true]) {
    const result = renderControl(() => controls.FormField({ label: 'Amount', value: '300,00', editable: readOnlyProp, readOnly: readOnlyProp }));
    assert.match(result.markup, /Read only/); assert.match(result.markup, /readonly=""|readOnly=""/);
    assert.doesNotMatch(result.markup, /aria-disabled="true"/);
    const input = result.elements.find((element) => 'editable' in element.props)!;
    assert.equal(input.props.editable, false);
    assert.equal((input.props as unknown as { accessibilityState: { disabled: boolean } }).accessibilityState.disabled, false);
    const style = flatten(input.props.style);
    assert.equal(style.opacity, 1); assert.equal(style.color, theme.Colors.light.textPrimary);
  }
  const disabled = renderControl(() => controls.FormField({ label: 'Unavailable', value: 'Value', disabled: true }));
  assert.match(disabled.markup, /aria-disabled="true"/); assert.doesNotMatch(disabled.markup, />Read only</);
});

test('field/selector errors are adjacent, announced, and invalid; expanded selectors keep state cues', () => {
  const field = renderControl(() => controls.FormField({ label: 'Amount', value: '', error: 'Enter an amount.' }));
  assert.match(field.markup, /aria-invalid="true"/); assert.match(field.markup, /role="alert"/); assert.match(field.markup, /Enter an amount/);
  const selector = renderControl(() => controls.FormSelect({ label: 'Category', value: 'Pets', expanded: true, error: 'Choose a category.', onPress: () => {} }));
  assert.match(selector.markup, /aria-expanded="true"/); assert.match(selector.markup, /aria-invalid="true"/); assert.match(selector.markup, /▴/);
  assert.match(selector.markup, /Choose a category/);
  const ordinary = renderControl(() => controls.FormSelect({ label: 'Category', value: 'Pets', onPress: () => {} }));
  const expanded = renderControl(() => controls.FormSelect({ label: 'Category', value: 'Pets', expanded: true, onPress: () => {} }));
  const style = (result: typeof ordinary) => {
    const trigger = result.elements.find((element) => element.props.accessibilityLabel === 'Category' && element.props.onPress)!;
    return flatten((trigger.props.style as unknown as (state: { pressed: boolean }) => unknown)({ pressed: false }));
  };
  assert.notEqual(style(ordinary).borderColor, style(expanded).borderColor);
});

test('menu options are flat selectable rows; Create is separated without changing its callback', () => {
  const choice = renderControl(() => controls.FormChoice({ label: 'Pets', selected: true, onPress: () => {} }));
  assert.match(choice.markup, /aria-checked="true"/); assert.match(choice.markup, /✓/);
  const optionStyle = flatten((choice.elements[0].props.style as unknown as (state: { pressed: boolean }) => unknown)({ pressed: false }));
  assert.equal(optionStyle.borderWidth ?? 0, 0);
  let created = 0;
  const result = renderControl(() => autocomplete.AutocompleteOptions({ value: null, results: { suggestions: [{ value: 'accented', label: 'Álvaro' }], createLabel: '+ Create Alvaro' }, onSelect: () => {}, onCreate: () => { created++; } }));
  result.elements.find((element) => element.props.label === '+ Create Alvaro')!.props.onPress!(); assert.equal(created, 1);
  assert.ok(result.elements.some((element) => flatten(element.props.style).borderTopWidth === 1));
});

test('sheets retain modal dismissal and bottom shape while using scrim and overlay surface', () => {
  let dismissed = 0;
  const modal = renderControl(() => sheets.AdaptiveModal({ children: null, onDismiss: () => { dismissed++; } }));
  const outside = modal.elements.find((element) => element.props.accessibilityLabel === 'Close sheet')!;
  assert.equal(flatten(outside.props.style).backgroundColor, theme.Colors.light.scrim);
  outside.props.onPress!(); assert.equal(dismissed, 1);
  const sheet = renderControl(() => sheets.AdaptiveSheet({ title: 'Edit', action: 'Save', onConfirm: () => {}, onDismiss: () => {}, children: null }));
  const style = flatten(sheet.elements[0].props.style);
  assert.equal(style.backgroundColor, theme.Colors.light.surfaceRaised);
  assert.equal(style.borderBottomLeftRadius ?? 0, 0); assert.equal(style.borderBottomRightRadius ?? 0, 0);
  assert.match(sheet.markup, /Edit/); assert.match(sheet.markup, /Save/);
  const header = sheet.elements.find((element) => element.props.label === 'Save')!;
  assert.equal((header.props as unknown as { variant: string }).variant, 'primary');
  const menu = renderControl(() => selection.SelectionOverlay({ label: 'Category', content: null, inline: null,
    layout: { left: 8, top: 100, width: 280, height: 100, placement: 'below' }, onClose: () => {}, onHeadingHeight: () => {}, onOptionsHeight: () => {} }));
  assert.ok(menu.elements.some((element) => flatten(element.props.style).backgroundColor === theme.Colors.light.surfaceRaised));
});

test('semantic text/surface/status APIs coexist with legacy typography without introducing pills', () => {
  const metric = renderControl(() => themedText.ThemedText({ type: 'metric', children: 'R$ 100,00' }));
  assert.ok(metric.markup.includes('tabular-nums'));
  const body = renderControl(() => themedText.ThemedText({ type: 'default', children: 'Existing content' }));
  assert.match(body.markup, /Existing content/);
  const surface = renderControl(() => themedView.ThemedView({ surface: 'grouped' }));
  assert.equal(flatten(surface.elements[0].props.style).backgroundColor, theme.Colors.light.surface);
  const attention = renderControl(() => statusText.StatusText({ tone: 'attention', children: 'Overdue' }));
  assert.match(attention.markup, /Overdue/);
  assert.equal((attention.elements[0].props as unknown as { themeColor: string }).themeColor, 'warning');
});

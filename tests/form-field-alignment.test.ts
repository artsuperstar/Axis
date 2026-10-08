/// <reference types="node" />

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { act, createElement, useState } from 'react';
import type { TextInputProps } from 'react-native';

import { mount, runtime } from './helpers/refresh-lifecycle';
import { ControlSize, Space, Typography } from '../src/constants/theme';

// Mount the real shared field and its state, mocking only the native TextInput boundary.
// These tests verify emitted styles, not UIKit/Android glyph coordinates.
const { FormField } = createRequire(import.meta.url)('../src/components/form-controls') as typeof import('../src/components/form-controls');
const flatten = (style: unknown): Record<string, unknown> => Object.assign({}, ...[style].flat(Infinity));
const geometryKeys = ['height', 'minHeight', 'maxHeight', 'padding', 'paddingVertical', 'paddingTop', 'paddingBottom', 'paddingHorizontal',
  'borderWidth', 'borderTopWidth', 'borderBottomWidth', 'fontSize', 'fontWeight', 'lineHeight', 'textAlignVertical', 'transform', 'top'];
const geometry = (style: unknown) => {
  const flat = flatten(style);
  return Object.fromEntries(geometryKeys.map((key) => [key, flat[key]]));
};

for (const platform of ['ios', 'android'] as const) {
  for (const initial of ['', 'Existing João title']) test(`${platform} single-line geometry remains stable through focus, first character, typing and blur; initial=${JSON.stringify(initial)}`, async (t) => {
    const nativePlatform = (runtime.native as { Platform: { OS: string } }).Platform;
    const previous = nativePlatform.OS; nativePlatform.OS = platform; t.after(() => { nativePlatform.OS = previous; });
    let focused = 0; let blurred = 0;
    function Probe() {
      const [value, setValue] = useState(initial);
      return createElement(FormField, { label: 'Title', multiline: false, value, onChangeText: setValue,
        onFocus: () => { focused++; }, onBlur: () => { blurred++; } });
    }
    const app = await mount(createElement(Probe), null); t.after(app.unmount);
    const input = app.find('TextInput', 'Title');
    function snapshot() {
      assert.equal(app.find('TextInput', 'Title'), input, 'typing/focus does not replace the native field');
      const props = input.props as TextInputProps;
      const style = flatten(props.style);
      assert.equal(props.multiline, false);
      assert.equal(style.paddingVertical, 0); assert.equal(style.lineHeight, undefined);
      assert.equal(style.textAlignVertical, 'center'); assert.equal(style.minHeight, ControlSize.field);
      assert.equal(style.height, undefined); assert.equal(style.maxHeight, undefined);
      assert.equal(style.fontSize, Typography.input.fontSize); assert.equal(style.fontWeight, Typography.input.fontWeight);
      assert.equal(style.paddingHorizontal, Space.lg);
      assert.equal(props.allowFontScaling === false, false);
      return { input: geometry(props.style), wrapper: flatten(input.parentNode!.props.style) };
    }
    const emptyOrExisting = snapshot();
    await act(() => (input.props.onFocus as (event: unknown) => void)({ nativeEvent: { target: 1 } }));
    assert.deepEqual(snapshot(), emptyOrExisting); assert.equal(focused, 1);
    await act(() => (input.props.onChangeText as (text: string) => void)('J'));
    assert.equal(input.props.value, 'J'); assert.deepEqual(snapshot(), emptyOrExisting);
    await act(() => (input.props.onChangeText as (text: string) => void)('João working title'));
    assert.deepEqual(snapshot(), emptyOrExisting);
    await act(() => (input.props.onBlur as (event: unknown) => void)({ nativeEvent: { target: 1 } }));
    assert.deepEqual(snapshot(), emptyOrExisting); assert.equal(blurred, 1);
    await act(() => (input.props.onChangeText as (text: string) => void)(''));
    assert.deepEqual(snapshot(), emptyOrExisting);
  });

  test(`${platform} multiline paragraph geometry stays separate during focus and editing`, async (t) => {
    const nativePlatform = (runtime.native as { Platform: { OS: string } }).Platform;
    const previous = nativePlatform.OS; nativePlatform.OS = platform; t.after(() => { nativePlatform.OS = previous; });
    function Probe() {
      const [value, setValue] = useState('');
      return createElement(FormField, { label: 'Description', multiline: true, style: { minHeight: 96 }, value, onChangeText: setValue });
    }
    const app = await mount(createElement(Probe), null); t.after(app.unmount);
    const input = app.find('TextInput', 'Description'); const before = geometry(input.props.style);
    assert.equal(input.props.multiline, true);
    assert.equal(before.paddingVertical, Space.sm); assert.equal(before.lineHeight, Typography.input.lineHeight);
    assert.equal(before.textAlignVertical, 'top'); assert.equal(before.minHeight, 96);
    await act(() => (input.props.onFocus as (event: unknown) => void)({ nativeEvent: { target: 1 } }));
    await act(() => (input.props.onChangeText as (text: string) => void)('First paragraph\nSecond paragraph'));
    assert.equal(input.props.value, 'First paragraph\nSecond paragraph'); assert.deepEqual(geometry(input.props.style), before);
    await act(() => (input.props.onBlur as (event: unknown) => void)({ nativeEvent: { target: 1 } }));
    assert.deepEqual(geometry(input.props.style), before);
  });
}

test('focus, invalid and read-only appearances alter no input geometry', async (t) => {
  const app = await mount(createElement(FormField, { label: 'Amount', value: '300,00', keyboardType: 'decimal-pad', editable: false, error: 'Example error' }), null); t.after(app.unmount);
  const input = app.find('TextInput', 'Amount'); const before = geometry(input.props.style);
  await act(() => (input.props.onFocus as (event: unknown) => void)({ nativeEvent: { target: 1 } }));
  assert.deepEqual(geometry(input.props.style), before);
  assert.equal(before.borderWidth, 1); assert.equal(before.paddingVertical, 0);
  assert.equal(input.props.editable, false); assert.equal(input.props.keyboardType, 'decimal-pad');
});

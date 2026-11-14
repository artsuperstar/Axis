/// <reference types="node" />
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { act, createElement } from 'react';

import { DesignColors, Shape, TouchTarget } from '../src/constants/design-system-v2';
import { mount } from './helpers/refresh-lifecycle';

const require = createRequire(import.meta.url);
const { UiButton } = require('../src/components/design-system') as typeof import('../src/components/design-system');
const { FormButton } = require('../src/components/form-controls') as typeof import('../src/components/form-controls');
const { FloatingAddButton } = require('../src/components/floating-add-button') as typeof import('../src/components/floating-add-button');
const { FloatingAddTask } = require('../src/features/tasks/components/floating-add-task') as typeof import('../src/features/tasks/components/floating-add-task');
const native = require('./helpers/lifecycle-native.cjs').native as { useColorScheme: () => string | null };
const flatten = (style: unknown): Record<string, unknown> => Object.assign({}, ...[style].flat(Infinity));
type App = Awaited<ReturnType<typeof mount>>;
async function event(app: App, label: string, name: string) {
  await act(() => (app.find('Pressable', label).props[name] as (value: object) => void)({}));
}

for (const mode of ['dark', 'light'] as const) {
  test(`${mode}: shared and v2 FormButton primaries use transient copper feedback, preserved geometry and callbacks`, async (t) => {
    t.mock.method(native, 'useColorScheme', () => mode); const colors = DesignColors[mode];
    for (const kind of ['shared', 'form', 'fitness'] as const) {
      let presses = 0; const onPress = () => presses++;
      const node = kind === 'form' ? createElement(FormButton, { label: 'Action', appearance: 'v2', variant: 'primary', selected: true, onPress })
        : createElement(UiButton, { label: 'Action', variant: 'primary', selected: true, feature: kind === 'fitness' ? 'fitness' : undefined, onPress });
      const app = await mount(node, null); t.after(app.unmount);
      const style = () => flatten(app.find('Pressable', 'Action').props.style);
      assert.equal(style().backgroundColor, colors.brand);
      assert.equal(flatten(app.find('ThemedText').props.style).color, colors.onBrand);
      assert.equal(style().minHeight, TouchTarget); assert.equal(style().minWidth, TouchTarget); assert.equal(style().borderRadius, Shape.control);
      assert.equal(style().paddingVertical, 8); assert.equal(style().paddingHorizontal, 12);
      await event(app, 'Action', 'onPressIn'); assert.equal(style().backgroundColor, colors.brandStrong);
      await event(app, 'Action', 'onPressOut'); assert.equal(style().backgroundColor, colors.brand);
      await event(app, 'Action', 'onHoverIn'); assert.equal(style().backgroundColor, colors.brandStrong);
      await event(app, 'Action', 'onHoverOut'); assert.equal(style().backgroundColor, colors.brand);
      await event(app, 'Action', 'onFocus'); assert.equal(style().backgroundColor, colors.brand);
      assert.equal(style().borderColor, colors.onBrand); assert.equal(style().outlineColor, colors.brandFocus); assert.equal(style().outlineWidth, 2);
      await event(app, 'Action', 'onBlur'); assert.equal(style().backgroundColor, colors.brand);
      assert.equal((app.find('Pressable', 'Action').props.accessibilityState as { selected: boolean }).selected, true);
      await event(app, 'Action', 'onPress'); assert.equal(presses, 1);
      await app.unmount();
    }
  });
  test(`${mode}: disabled and busy primary states dominate interaction and preserve announcements`, async (t) => {
    t.mock.method(native, 'useColorScheme', () => mode); const colors = DesignColors[mode];
    for (const state of ['disabled', 'busy'] as const) for (const kind of ['shared', 'form'] as const) {
      const props = { label: 'Unavailable', variant: 'primary' as const, [state]: true, onPress() {} };
      const app = await mount(kind === 'shared' ? createElement(UiButton, props) : createElement(FormButton, { ...props, appearance: 'v2' }), null); t.after(app.unmount);
      await event(app, 'Unavailable', 'onPressIn'); await event(app, 'Unavailable', 'onHoverIn');
      const button = app.find('Pressable', 'Unavailable');
      assert.equal(button.props.disabled, true); assert.equal(flatten(button.props.style).backgroundColor, colors.inset);
      assert.equal(flatten(app.find('ThemedText').props.style).color, colors.textDisabled);
      assert.equal((button.props.accessibilityState as { disabled: boolean }).disabled, true);
      if (state === 'busy') { assert.equal((button.props.accessibilityState as { busy: boolean }).busy, true); assert.equal(app.find('ActivityIndicator').props.color, colors.textDisabled); }
      await app.unmount();
    }
  });
  test(`${mode}: both floating create controls use brand normally and brandStrong transiently`, async (t) => {
    t.mock.method(native, 'useColorScheme', () => mode); const colors = DesignColors[mode];
    for (const task of [false, true]) {
      const label = task ? 'Add task' : 'Create'; let presses = 0; const onPress = () => presses++;
      const app = await mount(task ? createElement(FloatingAddTask, { disabled: false, onPress }) : createElement(FloatingAddButton, { label, onPress }), null); t.after(app.unmount);
      const style = () => flatten(app.find('Pressable', label).props.style);
      assert.equal(style().backgroundColor, colors.brand); assert.equal(style().width, task ? 52 : 56); assert.equal(style().height, task ? 52 : 56);
      await event(app, label, 'onPressIn'); assert.equal(style().backgroundColor, colors.brandStrong);
      await event(app, label, 'onPressOut'); assert.equal(style().backgroundColor, colors.brand);
      await event(app, label, 'onHoverIn'); assert.equal(style().backgroundColor, colors.brandStrong);
      await event(app, label, 'onHoverOut'); assert.equal(style().backgroundColor, colors.brand);
      await event(app, label, 'onPress'); assert.equal(presses, 1); await app.unmount();
    }
  });
}

/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DesignColors, taskSectionSurface, type DesignMode, type DesignPalette } from '../src/constants/design-system-v2';
import { overviewColors } from '../src/features/finance/overview-presentation';

const chartSeries = {
  dark: { income: '#A8D0B7', expenses: '#F1A9B4', categories: ['#F1A9B4', '#B6C1B5', '#E4C28E', '#A9C9EA', '#9BCBB5', '#9A9999'] },
  light: { income: '#32664E', expenses: '#94455C', categories: ['#94455C', '#667260', '#92703A', '#4D729A', '#40765D', '#797371'] },
};

for (const mode of ['dark', 'light'] satisfies DesignMode[]) {
  const opposite = mode === 'dark' ? 'light' : 'dark';
  for (const [kind, canvas] of [['current', DesignColors[mode].canvas], ['custom', '#423B39'], ['opposite canonical', DesignColors[opposite].canvas]]) {
    test(`${mode} presentation follows explicit mode with ${kind} canvas`, () => {
      const colors: DesignPalette = { ...DesignColors[mode], canvas };
      assert.deepEqual(overviewColors(colors, mode), { ...chartSeries[mode], axis: colors.textMuted, grid: colors.border,
        selected: colors.selected, separator: colors.group });
      assert.equal(taskSectionSurface(colors, 'Today', mode), mode === 'light' ? colors.surface : colors.groupStrong);
      for (const [section, surface] of [['Earlier', colors.control], ['Upcoming', colors.surface], ['To-do', colors.group], ['other', colors.group]]) {
        assert.equal(taskSectionSurface(colors, section, mode), surface);
      }
    });
  }
}

test('one custom palette supports either mode while preserving supplied neutral colors', () => {
  const colors: DesignPalette = { ...DesignColors.dark, canvas: '#554433', textMuted: '#AAAAAA', border: '#555555', selected: '#664455', group: '#332233' };
  for (const mode of ['dark', 'light'] as const) {
    assert.deepEqual(overviewColors(colors, mode), { ...chartSeries[mode], axis: '#AAAAAA', grid: '#555555', selected: '#664455', separator: '#332233' });
  }
  assert.equal(taskSectionSurface(colors, 'Today', 'dark'), colors.groupStrong);
  assert.equal(taskSectionSurface(colors, 'Today', 'light'), colors.surface);
});

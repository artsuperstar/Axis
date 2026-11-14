/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { DesignColors, type DesignPalette } from '../src/constants/design-system-v2';
import { overviewColors } from '../src/features/finance/overview-presentation';
import { composite, contrast, rgba, runtimeContrast } from './helpers/soft-copper-contrast';

const specification = JSON.parse(readFileSync(new URL('../docs/design-system/soft-copper/tokens.json', import.meta.url), 'utf8')) as {
  colors: Record<'light' | 'dark', Record<string, string>>;
  rows: { name: string; aliasOf?: string }[];
  categoricalCharts: Record<'light' | 'dark', string[]>;
};
const fitness = {
  light: { fitnessAccent: '#B66F5D', fitnessAccentSoft: '#F2DDD6', fitnessText: '#8E4E3F', onFitness: '#151010' },
  dark: { fitnessAccent: '#E2A08F', fitnessAccentSoft: '#472D29', fitnessText: '#E2A08F', onFitness: '#2A1720' },
};

for (const mode of ['dark', 'light'] as const) {
  const colors = DesignColors[mode];
  test(`${mode}: complete approved register, deliberate aliases and valid color-only compatibility`, () => {
    const expected: Record<string, string> = { ...specification.colors[mode], ...fitness[mode], shadow: specification.colors[mode].shadowColor };
    assert.equal(specification.rows.length, 60);
    assert.deepEqual(Object.keys(colors).sort(), [...specification.rows.map(row => row.name), 'shadow'].sort());
    for (const [key, value] of Object.entries(colors)) {
      assert.match(value, /^#[\da-f]{6}([\da-f]{2})?$/i, key);
      assert.equal(value, expected[key], key);
    }
    for (const row of specification.rows) {
      if (row.aliasOf && !(row.name in fitness[mode])) assert.equal(colors[row.name as keyof DesignPalette], colors[row.aliasOf as keyof DesignPalette], row.name);
    }
    assert.equal(colors.shadow, colors.shadowColor);
    assert.ok(!('mode' in colors));
  });
  test(`${mode}: financial, status and source meanings remain independent of copper`, () => {
    assert.equal(colors.completed, colors.success); assert.equal(colors.received, colors.success); assert.equal(colors.financeIncome, colors.success);
    assert.equal(colors.overdue, colors.attention); assert.equal(colors.outstanding, colors.textPrimary); assert.equal(colors.pending, colors.textSecondary);
    assert.notEqual(String(colors.financeIncome), String(colors.financeExpense)); assert.notEqual(String(colors.financeExpense), String(colors.danger));
    for (const role of ['success', 'attention', 'danger', 'financeIncome', 'financeExpense', 'taskAccent', 'workAccent', 'fitnessAccent', 'journalAccent'] as const) {
      assert.notEqual(String(colors[role]), String(colors.brand), role);
    }
    assert.deepEqual([colors.calendarTask, colors.calendarCommitment, colors.calendarWorkPayment],
      mode === 'dark' ? ['#93C5FD', '#FBBF24', '#5EEAD4'] : ['#2563EB', '#B45309', '#0F766E']);
    const chart = overviewColors({ ...colors, canvas: mode === 'dark' ? DesignColors.light.canvas : DesignColors.dark.canvas }, mode);
    assert.equal(chart.income, colors.financeIncome); assert.equal(chart.expenses, colors.financeExpense);
    assert.deepEqual(chart.categories, specification.categoricalCharts[mode]);
  });
  test(`${mode}: actual runtime text, status, focus, feature and boundary pairs meet their requirements`, () => {
    const pairs = runtimeContrast(colors, mode);
    assert.equal(pairs.filter(pair => pair.required).length, 59);
    for (const pair of pairs.filter(pair => pair.required)) assert.ok(pair.ratio >= pair.threshold, `${pair.label}: ${pair.ratio}`);
    // Naming a boundary token does not migrate existing fields or make selection fill sufficient by itself.
    for (const label of ['current resting field boundary', 'selected fill alone / control']) {
      const pair = pairs.find(pair => pair.label === label)!; assert.ok(pair.ratio < pair.threshold);
    }
  });
  test(`${mode}: alpha stays intact and transient press opacity is measured after compositing`, () => {
    assert.equal(colors.scrim, specification.colors[mode].scrim); assert.equal(colors.shadowColor, specification.colors[mode].shadowColor);
    assert.ok(rgba(colors.scrim)[3] > 0 && rgba(colors.scrim)[3] < 1);
    assert.equal(composite('#00000000', colors.canvas), colors.canvas.toLowerCase());
    for (const fill of [colors.brand, colors.brandStrong]) {
      const background = composite(fill, colors.group, 0.92), foreground = composite(colors.onBrand, colors.group, 0.92);
      assert.ok(contrast(foreground, background) >= 4.5, 'Existing 8% press-opacity feedback remains readable');
    }
  });
}

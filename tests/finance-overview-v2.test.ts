/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { act, createElement } from 'react';

import { cashFlowSource } from '../src/features/finance/chart-presentation';
import { cashFlowBuckets } from '../src/features/finance/charts';
import { transactionDraft } from '../src/features/finance/form';
import { cashFlowAxisLabel, cashFlowBucketAtPoint, cashFlowLayout, cashFlowTickLayout, overviewColors, summaryArrangement } from '../src/features/finance/overview-presentation';
import { periodBounds } from '../src/features/finance/periods';
import { DesignColors } from '../src/constants/design-system-v2';
import { localDateString } from '../src/utils/calendar';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const today = localDateString(new Date());
type App = Awaited<ReturnType<typeof mount>>;
const byId = (app: App, id: string) => app.nodes().find(item => item.props?.testID === id)!;
const flatten = (style: unknown) => Object.assign({}, ...[style].flat(Infinity));
const rows = (app: App) => app.nodes().filter(item => String(item.props?.testID).startsWith('spending-row-'));
const targets = (app: App) => app.nodes().filter(item => String(item.props?.testID).startsWith('cash-flow-bucket-'));

for (const count of [5, 7, 12]) for (const width of [201, 292, 334]) {
  test(`${count} SVG columns and native overlay share exact proportional mapping at plot width ${width}`, () => {
    const layout = cashFlowLayout(count);
    for (const [index, column] of layout.columns.entries()) {
      const left = column.x / layout.width * width; const right = (column.x + column.width) / layout.width * width;
      for (const fraction of [0.16, 0.48, 0.8]) assert.equal(cashFlowBucketAtPoint(count, width, left + (right - left) * fraction, 80), index);
      if (index) assert.ok(Math.abs(column.x - (layout.columns[index - 1].x + layout.columns[index - 1].width)) < 1e-9);
    }
    assert.equal(cashFlowBucketAtPoint(count, width, -1, 80), null);
    assert.equal(cashFlowBucketAtPoint(count, width, width, 80), null);
    assert.equal(cashFlowBucketAtPoint(count, width, 1, -1), null);
    assert.equal(cashFlowBucketAtPoint(count, width, 1, 161), null);
  });
}

test('Y-axis abbreviations stay bounded and summary decisions require real text widths', () => {
  assert.equal(cashFlowAxisLabel(0n), '0'); assert.ok(cashFlowAxisLabel(560000n).endsWith('K'));
  assert.ok(cashFlowAxisLabel(10n ** 90n).includes('e'));
  assert.equal(summaryArrangement(400, 1, []), 'stack');
  assert.equal(summaryArrangement(340, 1, [50, 100, 40, 90, 50, 90]), 'row');
  assert.equal(summaryArrangement(280, 1, [50, 100, 40, 90, 50, 90]), 'split');
  assert.equal(summaryArrangement(280, 2, [100, 200, 80, 180, 100, 180]), 'stack');
});

test('large selected tick never overlaps another label footprint', () => {
  for (const count of [5, 7, 12]) for (const stride of [1, 2, 3, 4, 5]) for (let selected = 0; selected < count; selected++) {
    const ticks = cashFlowTickLayout(count, stride, selected); assert.equal(ticks[selected].visible, true);
    const ranges = ticks.flatMap((tick, index) => tick.visible ? [{ from: index + 0.5 - tick.span / 2, to: index + 0.5 + tick.span / 2 }] : []).sort((a, b) => a.from - b.from);
    for (let index = 1; index < ranges.length; index++) assert.ok(ranges[index].from >= ranges[index - 1].to - 0.001);
  }
});

test('selected SVG band follows the shared geometry even when every amount is zero', () => {
  const buckets = cashFlowBuckets(periodBounds('month', '2026-10-22'));
  const plain = cashFlowSource(buckets, overviewColors(DesignColors.dark), buckets[0].id);
  const selected = cashFlowSource(buckets, overviewColors(DesignColors.dark), buckets[3].id);
  assert.notEqual(plain.uri, selected.uri);
  const svg = Buffer.from(selected.uri.split(',')[1], 'base64').toString('ascii');
  assert.ok(svg.includes('stroke-dasharray')); assert.ok(svg.includes('rx="5"'));
  assert.ok(!/NaN|Infinity/.test(svg));
});

test('each interval has one accessible direct target, no chip row, zero inspection and no scroll navigation or reads', async t => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close()); f.setTime(today);
  const app = await mount(createElement(screens.FinanceScreen), f.db); t.after(app.unmount);
  for (const kind of ['week', 'month', 'year'] as const) {
    await act(() => (app.find('SegmentedControl', 'Period').props.onChange as (value: string) => void)(kind));
    const buckets = f.finance.readDashboard(periodBounds(kind, today)).analytics.cashFlow!;
    assert.equal(targets(app).length, buckets.length);
    assert.ok(!app.nodes().some(item => item.kind === 'FormButton' && String(item.props?.accessibilityLabel).includes(', Income R$')));
    const readCount = runtime.fixture.reads.length;
    for (const bucket of buckets) {
      const target = byId(app, `cash-flow-bucket-${bucket.id}`);
      assert.equal(target.props.accessibilityRole, 'button');
      assert.equal(target.props.onMoveShouldSetResponder, undefined);
      assert.equal(target.props.onStartShouldSetResponderCapture, undefined);
      await app.tapSet(String(target.props.accessibilityLabel));
      assert.equal((byId(app, `cash-flow-bucket-${bucket.id}`).props.accessibilityState as { selected: boolean }).selected, true);
      assert.ok(byId(app, 'cash-flow-inspection').textContent.includes('R$ 0,00'));
    }
    assert.equal(runtime.fixture.reads.length, readCount);
  }
  assert.equal(runtime.fixture.navigation.length, 0); assert.equal(runtime.fixture.scrollOffsets.length, 0);
  assert.equal(app.nodes().filter(item => item.kind === 'FlatList').length, 1);
});

for (const count of [1, 3, 5, 6, 24]) {
  test(`${count} actual categories use one Spending section and replace compact rows on disclosure without querying`, async t => {
    const f = await journalDatabase(); t.after(() => f.sqlite.close()); f.setTime(today);
    for (let index = 0; index < count; index++) {
      const category = index ? f.finance.createCategory(`Category ${index}`, 'expense') : null;
      f.finance.createTransaction({ ...transactionDraft(), description: `Expense ${index}`, transactionDate: today, amount: `${index + 1}`, categoryId: category?.id ?? null });
      if (index === count - 1 && category) f.finance.deleteCategory(category.id);
    }
    const app = await mount(createElement(screens.FinanceScreen), f.db); t.after(app.unmount);
    assert.equal(app.nodes().filter(item => item.props?.accessibilityRole === 'header' && item.textContent === 'Spending').length, 1);
    assert.ok(!app.container.textContent.includes('Spending by Category'));
    assert.equal(rows(app).length, Math.min(count, 6));
    assert.equal(rows(app).some(item => item.props.testID === 'spending-row-other'), count > 5);
    if (count <= 5) assert.ok(!app.nodes().some(item => item.kind === 'FormButton' && item.props.label === 'View all categories'));
    else {
      const readCount = runtime.fixture.reads.length;
      assert.equal(app.find('FormButton', 'View all categories').props.expanded, false);
      const measured = await f.measureAsync(() => app.press('View all categories'));
      assert.equal(measured.count, 0); assert.equal(runtime.fixture.reads.length, readCount);
      assert.equal(app.find('FormButton', 'Show less').props.expanded, true);
      assert.equal(rows(app).length, count); assert.ok(!rows(app).some(item => item.props.testID === 'spending-row-other'));
      assert.ok(rows(app).some(item => item.textContent.includes('No category')));
      assert.ok(rows(app).some(item => item.textContent.includes(`Category ${count - 1}`)));
      assert.ok(byId(app, 'finance-expense-donut').textContent.includes('groups the remaining categories as Other'));
      await app.press('Show less'); assert.equal(rows(app).length, 6);
    }
  });
}

test('measurement callbacks permit compact summary, then remeasure after changed totals; chart selection survives refresh', async t => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close()); f.setTime(today);
  const app = await mount(createElement(screens.FinanceScreen), f.db); t.after(app.unmount);
  await act(() => {
    (byId(app, 'finance-summary-content').props.onLayout as (event: unknown) => void)({ nativeEvent: { layout: { width: 334 } } });
    [50, 100, 40, 90, 50, 90].forEach((width, index) => (byId(app, `finance-metric-probe-${index}`).props.onLayout as (event: unknown) => void)({ nativeEvent: { layout: { width } } }));
  });
  assert.equal(flatten(byId(app, 'finance-summary-layout').props.style).flexDirection, 'row');
  const selected = targets(app).at(-1)!;
  await app.tapSet(String(selected.props.accessibilityLabel));
  f.finance.createTransaction({ ...transactionDraft(), description: 'New expense', transactionDate: today, amount: '10' }); await app.resume();
  assert.equal(flatten(byId(app, 'finance-summary-layout').props.style).flexDirection, 'column');
  assert.equal((byId(app, String(selected.props.testID)).props.accessibilityState as { selected: boolean }).selected, true);
});

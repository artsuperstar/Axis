/// <reference types="node" />
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { createElement } from 'react';

import { bucketDescription, cashFlowBuckets, type CashFlowBucket } from '../src/features/finance/charts';
import { formatBrlAmount } from '../src/features/finance/money';
import { periodBounds } from '../src/features/finance/periods';
import { journalDatabase } from './helpers/journal';
import { mount, runtime } from './helpers/refresh-lifecycle';

const { CashFlowChart } = createRequire(import.meta.url)('../src/features/finance/components/cash-flow-chart') as typeof import('../src/features/finance/components/cash-flow-chart');
type App = Awaited<ReturnType<typeof mount>>;
const byId = (app: App, id: string) => app.nodes().find(node => node.props?.testID === id)!;
const style = (value: unknown) => Object.assign({}, ...[value].flat(Infinity));

for (const width of [320, 390, 430]) for (const fontScale of [1, 2]) for (const theme of ['light', 'dark'] as const) {
  test(`interval details retain date-first structure and complete values at ${width}pt, text ${fontScale}, ${theme}`, async t => {
    const native = runtime.native as { useWindowDimensions: () => unknown; useColorScheme: () => string };
    t.mock.method(native, 'useWindowDimensions', () => ({ width, height: 844, scale: 1, fontScale }));
    t.mock.method(native, 'useColorScheme', () => theme);
    const f = await journalDatabase(); t.after(() => f.sqlite.close());
    const buckets: CashFlowBucket[] = [
      ...cashFlowBuckets(periodBounds('month', '2026-10-22')),
      { id: 'cross-month', label: 'Sep–Oct', startDate: '2026-09-28', endDate: '2026-10-04', incomeMinor: 10n ** 35n + 91n, expensesMinor: 18014398509481982n },
    ];
    buckets[0].incomeMinor = 249000n; buckets[0].expensesMinor = 556312n;
    const app = await mount(createElement(CashFlowChart, { buckets, periodDescription: 'October 2026', transactionCount: 3 }), f.db); t.after(app.unmount);
    const panel = byId(app, 'cash-flow-inspection');
    const date = byId(app, 'cash-flow-inspection-date'); const values = byId(app, 'cash-flow-inspection-values');
    const income = byId(app, 'cash-flow-inspection-income'); const expenses = byId(app, 'cash-flow-inspection-expenses');
    for (const bucket of buckets) {
      await app.tapSet(String(byId(app, `cash-flow-bucket-${bucket.id}`).props.accessibilityLabel));
      assert.equal(byId(app, 'cash-flow-inspection'), panel); assert.equal(byId(app, 'cash-flow-inspection-date'), date);
      assert.deepEqual(panel.childNodes, [date, values], 'Date owns a separate first row for every selection');
      assert.deepEqual(values.childNodes, [income, expenses], 'Metrics remain grouped beneath the date');
      assert.equal(style(panel.props.style).flexDirection, 'column'); assert.equal(style(panel.props.style).flexWrap, undefined);
      assert.equal(style(date.props.style).width, '100%'); assert.equal(style(date.props.style).flexBasis, undefined);
      assert.equal(date.textContent, bucketDescription(bucket));
      assert.equal(style(values.props.style).flexDirection, 'row'); assert.equal(style(values.props.style).flexWrap, 'wrap');
      assert.deepEqual(style(income.props.style), style(expenses.props.style), 'Both metric slots have balanced width rules');
      assert.equal(style(income.props.style).flexGrow, 1); assert.equal(style(income.props.style).minWidth, 0);
      for (const [metric, label, amount] of [[income, 'Income', bucket.incomeMinor], [expenses, 'Expenses', bucket.expensesMinor]] as const) {
        assert.equal(metric.childNodes[0].textContent, label);
        const value = metric.childNodes[1]; assert.equal(value.textContent, formatBrlAmount(amount)); assert.equal(value.props.selectable, true);
        assert.equal(value.props.numberOfLines, undefined); assert.equal(value.props.adjustsFontSizeToFit, undefined);
        assert.equal(style(value.props.style).maxWidth, '100%'); assert.notEqual(style(metric.props.style).overflow, 'hidden');
      }
      assert.equal((byId(app, `cash-flow-bucket-${bucket.id}`).props.accessibilityState as { selected: boolean }).selected, true);
    }
    assert.equal(runtime.fixture.navigation.length, 0);
  });
}

for (const kind of ['week', 'month', 'year'] as const) {
  test(`${kind} bucket selection preserves authoritative dates and a stable inspection hierarchy`, async t => {
    const f = await journalDatabase(); t.after(() => f.sqlite.close());
    const buckets = cashFlowBuckets(periodBounds(kind, '2026-10-01'));
    const app = await mount(createElement(CashFlowChart, { buckets, periodDescription: kind, transactionCount: 0 }), f.db); t.after(app.unmount);
    const panel = byId(app, 'cash-flow-inspection'); const initialStyle = style(panel.props.style);
    for (const index of [0, Math.floor(buckets.length / 2), buckets.length - 1]) {
      const bucket = buckets[index]; await app.tapSet(String(byId(app, `cash-flow-bucket-${bucket.id}`).props.accessibilityLabel));
      assert.equal(byId(app, 'cash-flow-inspection-date').textContent, bucketDescription(bucket));
      assert.deepEqual(style(panel.props.style), initialStyle);
      assert.equal(panel.childNodes[0], byId(app, 'cash-flow-inspection-date'));
      assert.equal(panel.childNodes[1], byId(app, 'cash-flow-inspection-values'));
    }
  });
}

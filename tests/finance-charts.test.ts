/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { aggregateFinance } from '../src/features/finance/analytics';
import { aggregateCashFlow, bucketDescription, cashFlowBuckets, chartLabelStride, chartRatio, donutArcs, donutTotalInCenter, expenseSegments, type DatedAnalyticsTransaction } from '../src/features/finance/charts';
import { formatBrlAmount, maxAmountMinor } from '../src/features/finance/money';
import { movePeriod, periodBounds } from '../src/features/finance/periods';
import { addDays, dateOrdinal, weekdayIndex } from '../src/utils/calendar';

const row = (transactionDate: string, amountMinor = 1, type: 'income' | 'expense' = 'expense', categoryId: string | null = null, categoryName: string | null = null): DatedAnalyticsTransaction => ({ transactionDate, amountMinor, type, categoryId, categoryName });

test('Monday-first weekly buckets include cross-month and cross-year days with localized labels', () => {
  const buckets = cashFlowBuckets(periodBounds('week', '2026-01-01'), 'en-GB');
  assert.equal(buckets.length, 7);
  assert.deepEqual(buckets.map(bucket => bucket.label), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  assert.equal(buckets[0].startDate, '2025-12-29'); assert.equal(buckets[6].endDate, '2026-01-04');
  assert.ok(bucketDescription(buckets[0]).includes('2025'));
  assert.notEqual(cashFlowBuckets(periodBounds('week', '2026-01-01'), 'pt-BR')[0].label, 'Mon');
});

for (const [date, count] of [['2021-02-01', 4], ['2024-02-01', 5], ['2026-03-01', 6], ['2026-10-01', 5], ['9999-12-01', 5]] as const) {
  test(`month ${date} has ${count} clipped calendar weeks and exactly one membership per civil day`, () => {
    const period = periodBounds('month', date); const buckets = cashFlowBuckets(period);
    assert.equal(buckets.length, count);
    assert.equal(buckets[0].startDate, period.startDate); assert.equal(buckets.at(-1)!.endDate, period.endDate);
    let dates = 0;
    for (let day = period.startDate; day <= period.endDate; day = addDays(day, 1)) {
      assert.equal(buckets.filter(bucket => day >= bucket.startDate && day <= bucket.endDate).length, 1);
      dates++; if (day === period.endDate) break;
    }
    assert.equal(dates, dateOrdinal(period.endDate) - dateOrdinal(period.startDate) + 1);
    for (const bucket of buckets.slice(1)) assert.equal(weekdayIndex(bucket.startDate), 0);
  });
}

test('October month labels are clipped day ranges and leap year has twelve monthly buckets', () => {
  assert.deepEqual(cashFlowBuckets(periodBounds('month', '2026-10-01')).map(bucket => bucket.label), ['1–4', '5–11', '12–18', '19–25', '26–31']);
  const buckets = cashFlowBuckets(periodBounds('year', '2024-02-29'), 'en-GB');
  assert.equal(buckets.length, 12); assert.equal(buckets[1].endDate, '2024-02-29');
  assert.deepEqual([buckets[0].label, buckets[11].label], ['Jan', 'Dec']);
  assert.equal(buckets[11].endDate, '2024-12-31');
});

for (const kind of ['week', 'month', 'year'] as const) for (const mode of ['empty', 'income', 'expense', 'mixed'] as const) {
  test(`${kind} ${mode} buckets reconcile with shared Overview totals, retain zero intervals and safe geometry`, () => {
    const period = periodBounds(kind, '2024-02-29');
    const rows = mode === 'empty' ? [] : [row('2024-02-29', maxAmountMinor, mode === 'income' ? 'income' : 'expense'), row('2024-02-29', maxAmountMinor, mode === 'mixed' ? 'income' : mode), row('2024-02-29', 1, mode === 'income' ? 'income' : 'expense')];
    const buckets = aggregateCashFlow(rows, period); const totals = aggregateFinance(rows, period);
    assert.equal(buckets.reduce((sum, bucket) => sum + bucket.incomeMinor, 0n), totals.incomeMinor);
    assert.equal(buckets.reduce((sum, bucket) => sum + bucket.expensesMinor, 0n), totals.expensesMinor);
    assert.equal(buckets.filter(bucket => bucket.incomeMinor || bucket.expensesMinor).length, mode === 'empty' ? 0 : 1);
    for (const bucket of buckets) for (const value of [bucket.incomeMinor, bucket.expensesMinor]) {
      const ratio = chartRatio(value, totals.incomeMinor + totals.expensesMinor);
      assert.ok(Number.isFinite(ratio) && ratio >= 0 && ratio <= 1);
    }
  });
}

test('monthly projection excludes neighboring days and never depends on UTC membership', () => {
  const buckets = aggregateCashFlow([row('2026-09-30', 1000), row('2026-10-01', 2000), row('2026-10-31', 3000), row('2026-11-01', 4000)], periodBounds('month', '2026-10-01'));
  assert.equal(buckets[0].expensesMinor, 2000n); assert.equal(buckets.at(-1)!.expensesMinor, 3000n);
  assert.equal(buckets.reduce((sum, bucket) => sum + bucket.expensesMinor, 0n), 5000n);
});

test('ratios are bounded even for unbounded BigInt totals, and exact currency formatting stays independent', () => {
  assert.equal(chartRatio(0n, 0n), 0); assert.equal(chartRatio(-1n, 0n), 0); assert.equal(chartRatio(100n, 1n), 1);
  assert.equal(chartRatio(10n ** 1000n, 2n * 10n ** 1000n), 0.5);
  assert.equal(chartRatio(1n, 10n ** 1000n), 0);
  assert.equal(formatBrlAmount(BigInt(maxAmountMinor) * 2n + 1n), 'R$ 180.143.985.094.819,83');
});

test('donut retains authoritative expense order, historical/null labels, exact Other and original breakdown', () => {
  const rows = Array.from({ length: 8 }, (_, index) => row('2026-10-01', index + 1, 'expense', index === 0 ? null : `c${index}`, index === 7 ? 'Archived category' : `Category ${index}`));
  rows.push(row('2026-10-01', 9000, 'income', 'income', 'Income category'));
  const analytics = aggregateFinance(rows, periodBounds('month', '2026-10-01'));
  const before = structuredClone(analytics.spending); const segments = expenseSegments(analytics.spending, analytics.expensesMinor);
  assert.equal(segments.length, 6); assert.equal(segments[0].label, 'Archived category'); assert.equal(segments.at(-1)!.label, 'Other');
  assert.equal(segments.at(-1)!.amountMinor, 6n);
  assert.equal(segments.reduce((sum, segment) => sum + segment.amountMinor, 0n), 36n);
  assert.equal(segments[0].percentage, chartRatio(8n, 36n) * 100);
  assert.deepEqual(analytics.spending, before); assert.ok(before.some(category => category.name === 'No category'));
  assert.deepEqual(expenseSegments(analytics.spending, analytics.expensesMinor), segments);
  assert.equal(new Set(segments.map(segment => segment.colorIndex)).size, 6);
  assert.ok(!segments.some(segment => segment.label === 'Income category'));
});

test('visible category colors are deterministic by identity even when amounts reorder those categories', () => {
  const categories = Array.from({ length: 5 }, (_, index) => ({ categoryId: `c${index}`, name: `Category ${index}`, amountMinor: 10n }));
  const colors = new Map(expenseSegments(categories, 50n).map(segment => [segment.id, segment.colorIndex]));
  for (const segment of expenseSegments([...categories].reverse(), 50n)) assert.equal(segment.colorIndex, colors.get(segment.id));
});

test('single category uses a full-circle primitive; empty and income-only have no arcs; all arc geometry is finite', () => {
  const segment = expenseSegments([{ categoryId: null, name: 'No category', amountMinor: 1n }], 1n);
  assert.equal(segment[0].percentage, 100); assert.equal(donutArcs(segment, 1n)[0].fullCircle, true);
  assert.deepEqual(expenseSegments([], 0n), []); assert.deepEqual(donutArcs([], 0n), []);
  const categories = [1n, 2n, 3n, 4n, 5n, 6n, 10n ** 90n].map((amountMinor, index) => ({ categoryId: `${index}`, name: `${index}`, amountMinor }));
  const total = categories.reduce((sum, category) => sum + category.amountMinor, 0n);
  const arcs = donutArcs(expenseSegments(categories, total), total);
  assert.equal(arcs[0].start, 0); assert.equal(arcs.at(-1)!.end, 1);
  for (const arc of arcs) { assert.ok(arc.end >= arc.start); assert.ok(!/NaN|Infinity/.test(arc.path)); }
});

test('visual ticks thin at narrow/large-text sizes, while period navigation keeps existing current limits', () => {
  assert.ok(chartLabelStride(288, 2, 12) > chartLabelStride(398, 1, 12));
  assert.equal(donutTotalInCenter(240, 1, 'R$ 5.598,00'), true);
  assert.equal(donutTotalInCenter(240, 2, 'R$ 5.598,00'), false);
  assert.equal(donutTotalInCenter(240, 1, 'R$ 180.143.985.094.819,83'), false);
  const period = periodBounds('year', '2026-10-22');
  assert.deepEqual(movePeriod(period, 1, '2026-10-22'), period);
  assert.equal(cashFlowBuckets(movePeriod(period, -1, '2026-10-22'))[0].startDate, '2025-01-01');
});

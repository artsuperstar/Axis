import { addDays, dateLabel, daysInMonth, pickerValue, weekdayIndex } from '@/utils/calendar';

import type { AnalyticsTransaction, CategorySpending } from './analytics';
import { validateAmountMinor } from './money';
import type { FinancePeriod } from './periods';

export type CashFlowBucket = {
  id: string; label: string; startDate: string; endDate: string;
  incomeMinor: bigint; expensesMinor: bigint;
};
export type ExpenseSegment = {
  id: string; label: string; amountMinor: bigint; colorIndex: number; percentage: number;
};
export type DatedAnalyticsTransaction = AnalyticsTransaction & { transactionDate: string };

/** Inclusive civil dates, with no clock or UTC conversion. Empty intervals are retained. */
export function cashFlowBuckets(period: FinancePeriod, locale?: string): CashFlowBucket[] {
  const buckets: CashFlowBucket[] = [];
  const append = (startDate: string, endDate: string, label: string) => {
    buckets.push({ id: startDate, startDate, endDate, label, incomeMinor: 0n, expensesMinor: 0n });
  };
  if (period.kind === 'year') {
    const year = Number(period.startDate.slice(0, 4));
    for (let month = 1; month <= 12; month++) {
      const prefix = `${period.startDate.slice(0, 4)}-${String(month).padStart(2, '0')}`;
      append(`${prefix}-01`, `${prefix}-${daysInMonth(year, month)}`, pickerValue(`${prefix}-01`).toLocaleDateString(locale, { month: 'short' }));
    }
  } else {
    let start = period.startDate;
    while (start <= period.endDate) {
      const candidate = period.kind === 'week' ? start : addDays(start, 6 - weekdayIndex(start));
      const end = candidate < period.endDate ? candidate : period.endDate;
      const first = Number(start.slice(-2)); const last = Number(end.slice(-2));
      append(start, end, period.kind === 'week' ? pickerValue(start).toLocaleDateString(locale, { weekday: 'short' }) : first === last ? `${first}` : `${first}–${last}`);
      if (end === period.endDate) break;
      start = addDays(end, 1);
    }
  }
  return buckets;
}

/** Rows come from the same eligible ledger projection as Overview totals. O(n × bounded buckets). */
export function aggregateCashFlow(rows: readonly DatedAnalyticsTransaction[], period: FinancePeriod, locale?: string) {
  const buckets = cashFlowBuckets(period, locale);
  for (const row of rows) {
    const bucket = buckets.find(item => row.transactionDate >= item.startDate && row.transactionDate <= item.endDate);
    if (!bucket) continue;
    const amount = BigInt(validateAmountMinor(row.amountMinor));
    if (row.type === 'income') bucket.incomeMinor += amount;
    else bucket.expensesMinor += amount;
  }
  return buckets;
}

/** Ratios are bounded geometry only. No conversion of an unbounded centavo total to Number. */
export function chartRatio(amount: bigint, total: bigint) {
  if (amount <= 0n || total <= 0n) return 0;
  if (amount >= total) return 1;
  return Number(amount * 1000000000n / total) / 1000000000;
}

// Identity-based preference survives renaming/archival. Visible collisions are resolved below.
function categoryColorIndex(id: string | null) {
  if (id === null) return 4;
  let hash = 0;
  for (let index = 0; index < id.length; index++) hash = (Math.imul(hash, 31) + id.charCodeAt(index)) | 0;
  return (hash >>> 0) % 5;
}

export function expenseSegments(spending: readonly CategorySpending[], expensesMinor: bigint): ExpenseSegment[] {
  if (expensesMinor <= 0n) return [];
  const colorSlots = new Map<string | null, number>(); const used = new Set<number>();
  for (const category of spending.slice(0, 5).sort((a, b) => (a.categoryId ?? '').localeCompare(b.categoryId ?? ''))) {
    let slot = categoryColorIndex(category.categoryId);
    while (used.has(slot)) slot = (slot + 1) % 5;
    used.add(slot); colorSlots.set(category.categoryId, slot);
  }
  const segments = spending.slice(0, 5).map(category => ({
    id: category.categoryId === null ? 'category:null' : `category:${category.categoryId}`,
    label: category.name, amountMinor: category.amountMinor, colorIndex: colorSlots.get(category.categoryId)!,
    percentage: chartRatio(category.amountMinor, expensesMinor) * 100,
  }));
  if (spending.length > 5) {
    const amountMinor = spending.slice(5).reduce((sum, category) => sum + category.amountMinor, 0n);
    segments.push({ id: 'other', label: 'Other', amountMinor, colorIndex: 5, percentage: chartRatio(amountMinor, expensesMinor) * 100 });
  }
  return segments;
}

export function cashFlowMaximum(buckets: readonly CashFlowBucket[]) {
  return buckets.reduce((max, bucket) => bucket.incomeMinor > max
    ? bucket.incomeMinor > bucket.expensesMinor ? bucket.incomeMinor : bucket.expensesMinor
    : bucket.expensesMinor > max ? bucket.expensesMinor : max, 0n);
}

export function bucketDescription(bucket: CashFlowBucket) {
  return bucket.startDate === bucket.endDate ? dateLabel(bucket.startDate) : `${dateLabel(bucket.startDate)} – ${dateLabel(bucket.endDate)}`;
}

/** Sparse visual ticks avoid overlapping labels; all buckets remain available as native buttons. */
export function chartLabelStride(width: number, fontScale: number, count: number) {
  return Math.max(1, Math.ceil(count * 44 * Math.max(1, fontScale) / Math.max(1, width)));
}

export function donutTotalInCenter(diameter: number, fontScale: number, formattedAmount: string) {
  return fontScale <= 1.3 && Math.max(formattedAmount.length * 9, 14 * 7) * fontScale <= diameter * 0.54;
}

export type DonutArc = { id: string; start: number; end: number; fullCircle: boolean; path: string };
/** Separate A commands and spaced flags are compatible with the iOS system SVG decoder. */
export function donutArcs(segments: readonly ExpenseSegment[], total: bigint): DonutArc[] {
  let cumulative = 0n;
  return segments.map(segment => {
    const start = chartRatio(cumulative, total); cumulative += segment.amountMinor;
    const end = chartRatio(cumulative, total);
    const point = (fraction: number) => [50 + 38 * Math.sin(fraction * Math.PI * 2), 50 - 38 * Math.cos(fraction * Math.PI * 2)];
    const [x1, y1] = point(start); const [x2, y2] = point(end);
    return { id: segment.id, start, end, fullCircle: start === 0 && end === 1,
      path: end <= start ? '' : `M ${x1} ${y1} A 38 38 0 ${end - start > 0.5 ? 1 : 0} 1 ${x2} ${y2}` };
  });
}

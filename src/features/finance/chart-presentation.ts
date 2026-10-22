import type { ThemePalette } from '@/constants/theme';
import { svgImageSource } from '@/utils/svg-source';

import { cashFlowMaximum, chartRatio, donutArcs, type CashFlowBucket, type ExpenseSegment } from './charts';
import { cashFlowLayout } from './overview-presentation';

/** Provisional, scoped mappings. Stage 2 can replace these without changing ledger/data rules. */
export function financeChartColors(colors: ThemePalette) {
  return { income: colors.success, expenses: colors.info, axis: colors.borderStrong,
    categories: [colors.accent, colors.info, colors.warning, colors.danger, colors.textMuted, colors.borderStrong],
    separator: colors.background };
}
export type FinanceChartColors = ReturnType<typeof financeChartColors>;

export function cashFlowSource(buckets: readonly CashFlowBucket[], colors: FinanceChartColors, selectedId: string) {
  const max = cashFlowMaximum(buckets);
  const layout = cashFlowLayout(buckets.length);
  const bars = buckets.map((bucket, index) => {
    const incomeHeight = chartRatio(bucket.incomeMinor, max) * (layout.baseline - layout.top);
    const expenseHeight = chartRatio(bucket.expensesMinor, max) * (layout.baseline - layout.top);
    const { x, width: slot } = layout.columns[index]; const barWidth = slot * 0.28;
    return `${bucket.id === selectedId ? `<rect x="${x + 0.5}" y="2" width="${Math.max(0, slot - 1)}" height="154" rx="5" fill="${colors.axis}" fill-opacity="0.12" stroke="${colors.axis}" stroke-opacity="0.5"/>` : ''}
      <rect x="${x + slot * 0.15}" y="${layout.baseline - incomeHeight}" width="${barWidth}" height="${incomeHeight}" rx="2" fill="${colors.income}"/>
      <rect x="${x + slot * 0.57}" y="${layout.baseline - expenseHeight}" width="${barWidth}" height="${expenseHeight}" rx="2" fill="${colors.expenses}"/>`;
  }).join('');
  const grid = [0, 1, 2, 3].map(index => `<path d="M 0 ${layout.top + index * (layout.baseline - layout.top) / 4} H 360" stroke="${colors.axis}" stroke-opacity="0.25" stroke-dasharray="3 3"/>`).join('');
  return svgImageSource(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.width} ${layout.height}">${grid}${bars}<path d="M 0 ${layout.baseline} H 360" stroke="${colors.axis}" stroke-opacity="0.6"/></svg>`);
}

export function expenseDonutSource(segments: readonly ExpenseSegment[], total: bigint, colors: FinanceChartColors) {
  const arcs = donutArcs(segments, total);
  const paths = arcs.map((arc, index) => {
    const stroke = colors.categories[segments[index].colorIndex];
    if (arc.fullCircle) return `<circle cx="50" cy="50" r="38" fill="none" stroke="${stroke}" stroke-width="18"/>`;
    return arc.path ? `<path d="${arc.path}" fill="none" stroke="${stroke}" stroke-width="18"/>` : '';
  }).join('');
  // Thin radial separators preserve boundaries even if identity colors collide.
  const separators = arcs.length > 1 ? arcs.map(arc => {
    const angle = arc.start * Math.PI * 2;
    return `<path d="M ${50 + 29 * Math.sin(angle)} ${50 - 29 * Math.cos(angle)} L ${50 + 47 * Math.sin(angle)} ${50 - 47 * Math.cos(angle)}" stroke="${colors.separator}" stroke-width="0.7"/>`;
  }).join('') : '';
  return svgImageSource(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${paths}${separators}</svg>`);
}

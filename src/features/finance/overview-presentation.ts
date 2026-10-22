import type { DesignPalette } from '@/constants/design-system-v2';

/** Scoped provisional Finance colors; no app-wide palette change. */
export function overviewColors(colors: DesignPalette) {
  const dark = colors.canvas === '#151315';
  return { income: dark ? '#A8D0B7' : '#32664E', expenses: dark ? '#F1A9B4' : '#94455C',
    axis: colors.textMuted, grid: colors.border, selected: colors.selected, separator: colors.group,
    categories: dark ? ['#F1A9B4', '#B6C1B5', '#E4C28E', '#A9C9EA', '#9BCBB5', '#9A9999']
      : ['#94455C', '#667260', '#92703A', '#4D729A', '#40765D', '#797371'] };
}

export type SummaryArrangement = 'row' | 'split' | 'stack';
/** Six actual native text widths: each metric's label, then its amount. Unknown widths stay safe. */
export function summaryArrangement(width: number, fontScale: number, measurements: readonly (number | undefined)[]): SummaryArrangement {
  const widths = [0, 1, 2].map(index => Math.max(measurements[index * 2] ?? Infinity, measurements[index * 2 + 1] ?? Infinity));
  if (fontScale < 1.5 && widths.reduce((sum, value) => sum + value, 0) + 40 <= width) return 'row';
  return widths[1] + widths[2] + 24 <= width ? 'split' : 'stack';
}

/** Display-only Y-axis abbreviations. Exact amounts always remain in summary/inspection. */
export function cashFlowAxisLabel(amountMinor: bigint) {
  const units = amountMinor / 100n;
  if (amountMinor === 0n) return '0';
  if (units < 1000n) return (Number(amountMinor) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });
  for (const [scale, suffix] of [[1000000000000n, 'T'], [1000000000n, 'B'], [1000000n, 'M'], [1000n, 'K']] as const) {
    if (units >= scale && units < scale * 1000n) return `${(Number((amountMinor * 10n + scale * 50n) / (scale * 100n)) / 10).toLocaleString(undefined, { maximumFractionDigits: 1 })}${suffix}`;
  }
  const digits = units.toString();
  return `${digits[0]}.${digits[1] ?? '0'}e${digits.length - 1}`;
}

/** SVG and native overlay share this plot coordinate system. Y-axis is outside this rectangle. */
export function cashFlowLayout(count: number) {
  const width = 360; const height = 160; const top = 9; const baseline = 151;
  return { width, height, top, baseline,
    columns: Array.from({ length: count }, (_, index) => ({ x: index * width / count, width: width / count })) };
}

export function cashFlowBucketAtPoint(count: number, width: number, x: number, y: number) {
  const layout = cashFlowLayout(count);
  if (count <= 0 || width <= 0 || x < 0 || x >= width || y < 0 || y > layout.height) return null;
  return Math.min(count - 1, Math.floor(x / width * count));
}

/** Selected label owns its space first; sparse neighboring ticks cannot overlap it. */
export function cashFlowTickLayout(count: number, stride: number, selectedIndex: number) {
  const spans = Array.from({ length: count }, (_, index) => Math.min(stride, index * 2 + 1, (count - index) * 2 - 1));
  const occupied: { from: number; to: number }[] = [];
  const visible = new Set<number>();
  const candidates = [selectedIndex, ...Array.from({ length: count }, (_, index) => index).filter(index => index !== selectedIndex && index % stride === Math.floor(stride / 2))];
  for (const index of candidates) {
    const from = index + 0.5 - spans[index] / 2; const to = index + 0.5 + spans[index] / 2;
    if (!occupied.some(range => from < range.to - 0.001 && to > range.from + 0.001)) { visible.add(index); occupied.push({ from, to }); }
  }
  return spans.map((span, index) => ({ span, visible: visible.has(index) }));
}

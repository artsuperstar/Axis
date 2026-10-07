import { spendingBarPercent } from './analytics';

export const spendingPreviewLimit = 5;

/** Display only: the existing BigInt ratio never changes centavo totals. */
export function spendingShareLabel(amountMinor: bigint, expensesMinor: bigint) {
  if (amountMinor <= 0n || expensesMinor <= 0n) return '0%';
  const percent = spendingBarPercent(amountMinor, expensesMinor);
  return percent < 1 ? '<1%' : `${percent.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

/** Stack before enlarged text or long formatted amounts crowd the secondary columns. */
export function stackFinanceMetrics(width: number, fontScale: number, amounts: readonly string[]) {
  const column = (width - 24) / 2;
  const estimatedAmountWidth = Math.max(...amounts.map((amount) => amount.length)) * 9 * fontScale;
  return fontScale >= 1.4 || column < 140 || estimatedAmountWidth > column;
}

/** Available content width, never a device/model breakpoint. */
export function spendingDonutDiameter(width: number) {
  return Math.min(104, Math.max(0, width), Math.max(72, width * 0.3));
}

export function spendingIntroInline(width: number, diameter: number, totalTextWidth?: number) {
  return totalTextWidth !== undefined && diameter + 16 + totalTextWidth <= width;
}

/** Unknown measurements stay stacked. Long names may wrap into a readable column. */
export function spendingRowInline(width: number, fontScale: number, nameWidth?: number, amountWidth?: number) {
  if (nameWidth === undefined || amountWidth === undefined) return false;
  const readableNameWidth = Math.min(nameWidth, 140 * Math.max(1, fontScale));
  return readableNameWidth + 16 + amountWidth <= width;
}

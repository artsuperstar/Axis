import { addDays, daysInMonth, pickerValue, validDate, weekdayIndex } from '@/utils/calendar';

import { FinanceValidationError } from './errors';

export const periodKinds = ['week', 'month', 'year'] as const;
export type PeriodKind = typeof periodKinds[number];
export type FinancePeriod = { kind: PeriodKind; startDate: string; endDate: string };
export const periodKindLabels: Record<PeriodKind, string> = { week: 'Week', month: 'Month', year: 'Year' };

/** Inclusive bounds use civil dates, with an explicit reference rather than an implicit clock. */
export function periodBounds(kind: PeriodKind, referenceDate: string): FinancePeriod {
  if (!periodKinds.includes(kind) || !validDate(referenceDate)) throw new FinanceValidationError('Choose a valid Finance period.');
  const [year, month] = referenceDate.split('-').map(Number);
  if (kind === 'week') {
    const startDate = addDays(referenceDate, -weekdayIndex(referenceDate));
    return { kind, startDate, endDate: addDays(startDate, 6) };
  }
  if (kind === 'month') {
    const prefix = referenceDate.slice(0, 7);
    return { kind, startDate: `${prefix}-01`, endDate: `${prefix}-${daysInMonth(year, month)}` };
  }
  return { kind, startDate: `${referenceDate.slice(0, 4)}-01-01`, endDate: `${referenceDate.slice(0, 4)}-12-31` };
}

export function movePeriod(period: FinancePeriod, direction: -1 | 1, today: string): FinancePeriod {
  let referenceDate: string;
  const [year, month] = period.startDate.split('-').map(Number);
  if (period.kind === 'week') referenceDate = addDays(period.startDate, direction * 7);
  else if (period.kind === 'month') {
    const ordinal = Math.max(0, Math.min(9999 * 12 - 1, (year - 1) * 12 + month - 1 + direction));
    referenceDate = `${String(Math.floor(ordinal / 12) + 1).padStart(4, '0')}-${String(ordinal % 12 + 1).padStart(2, '0')}-01`;
  } else referenceDate = `${String(Math.max(1, Math.min(9999, year + direction))).padStart(4, '0')}-01-01`;
  const candidate = periodBounds(period.kind, referenceDate);
  const current = periodBounds(period.kind, today);
  return candidate.startDate > current.startDate ? current : candidate;
}

export function canMovePeriod(period: FinancePeriod, direction: -1 | 1, today: string) {
  return movePeriod(period, direction, today).startDate !== period.startDate;
}

/** Current selections roll forward at midnight; historical selections keep their period. */
export function refreshPeriod(period: FinancePeriod, previousToday: string, today: string) {
  const current = periodBounds(period.kind, today);
  return period.startDate === periodBounds(period.kind, previousToday).startDate || period.startDate > current.startDate ? current : period;
}

export function periodLabel(period: FinancePeriod) {
  if (period.kind === 'year') return period.startDate.slice(0, 4);
  if (period.kind === 'month') return pickerValue(period.startDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  return `${pickerValue(period.startDate).toLocaleDateString(undefined, options)} – ${pickerValue(period.endDate).toLocaleDateString(undefined, options)}`;
}

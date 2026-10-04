import { addDays, daysInMonth, validDate } from '@/utils/calendar';

import { FinanceValidationError } from '../errors';
import type { CommitmentSchedule, ScheduledDue } from './types';

export const historyMonths = 12;
export const upcomingMonths = 3;

export function monthOrdinal(date: string) {
  const [year, month] = date.split('-').map(Number);
  return (year - 1) * 12 + month - 1;
}

export function monthDate(ordinal: number, day = 1) {
  if (ordinal < 0 || ordinal >= 9999 * 12) return null;
  const year = Math.floor(ordinal / 12) + 1;
  const month = ordinal % 12 + 1;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(Math.min(day, daysInMonth(year, month))).padStart(2, '0')}`;
}

export function historyStart(to: string) {
  return monthDate(Math.max(0, monthOrdinal(to) - historyMonths + 1))!;
}

export function upcomingEnd(today: string) {
  return monthDate(Math.min(9999 * 12 - 1, monthOrdinal(today) + upcomingMonths - 1), 31)!;
}

/** Monthly civil dates retain the intended day after short-month clamping. */
export function scheduleDue(schedule: CommitmentSchedule, installmentCount: number | null, dueDate: string): ScheduledDue | null {
  if (!validDate(dueDate) || dueDate < schedule.startDate || dueDate < schedule.effectiveFrom || (schedule.effectiveUntil && dueDate >= schedule.effectiveUntil)) return null;
  const offset = monthOrdinal(dueDate) - monthOrdinal(schedule.startDate);
  if (offset < 0 || monthDate(monthOrdinal(dueDate), schedule.billingDay) !== dueDate) return null;
  const index = installmentCount === null ? null : schedule.firstInstallmentIndex + offset;
  if (index !== null && index > installmentCount!) return null;
  return { scheduleId: schedule.id, commitmentId: schedule.commitmentId, dueDate, expectedAmountMinor: schedule.expectedAmountMinor, installmentIndex: index };
}

/** Enumerate a bounded internal catch-up batch or upcoming window. */
export function scheduledDues(schedule: CommitmentSchedule, installmentCount: number | null, from: string, to: string) {
  if (!validDate(from) || !validDate(to) || from > to) return [];
  if (monthOrdinal(to) - monthOrdinal(from) >= historyMonths) throw new FinanceValidationError('Load commitment history in twelve-month pages.');
  const result: ScheduledDue[] = [];
  for (let ordinal = Math.max(monthOrdinal(from), monthOrdinal(schedule.startDate)); ordinal <= monthOrdinal(to); ordinal++) {
    const date = monthDate(ordinal, schedule.billingDay)!;
    if (date < from || date > to) continue;
    const due = scheduleDue(schedule, installmentCount, date);
    if (due) result.push(due);
  }
  return result;
}

/** Catch up every due date, using bounded batches within this schedule's effective interval. */
export function* duesThrough(schedule: CommitmentSchedule, installmentCount: number | null, today: string) {
  const from = schedule.startDate > schedule.effectiveFrom ? schedule.startDate : schedule.effectiveFrom;
  if (schedule.effectiveUntil && from >= schedule.effectiveUntil) return;
  let to = schedule.effectiveUntil && schedule.effectiveUntil <= today ? addDays(schedule.effectiveUntil, -1) : today;
  if (installmentCount !== null) {
    const finalDue = monthDate(monthOrdinal(schedule.startDate) + installmentCount - schedule.firstInstallmentIndex, schedule.billingDay);
    if (finalDue && finalDue < to) to = finalDue;
  }
  if (from > to) return;
  for (let ordinal = monthOrdinal(from); ordinal <= monthOrdinal(to); ordinal += historyMonths) {
    const end = monthDate(Math.min(ordinal + historyMonths - 1, monthOrdinal(to)), 31)!;
    yield* scheduledDues(schedule, installmentCount, ordinal === monthOrdinal(from) ? from : monthDate(ordinal)!, end < to ? end : to);
  }
}

export function proposedResumeDate(schedule: CommitmentSchedule, today: string, retainedDates: string[] = []) {
  const latest = retainedDates.reduce((max, date) => date > max ? date : max, '');
  let ordinal = Math.max(monthOrdinal(today), monthOrdinal(schedule.startDate));
  let date = monthDate(ordinal, schedule.billingDay);
  if (date && (date < today || date <= latest)) {
    ordinal = Math.max(ordinal, latest ? monthOrdinal(latest) : ordinal);
    date = monthDate(ordinal, schedule.billingDay);
    if (date && (date < today || date <= latest)) date = monthDate(ordinal + 1, schedule.billingDay);
  }
  if (!date) throw new FinanceValidationError('The next due date is outside the supported calendar.');
  return date;
}

/** Reserve elapsed logical installment numbers independently of stored outcomes. */
export function lastScheduledIndex(schedule: CommitmentSchedule, installmentCount: number, today: string) {
  const to = schedule.effectiveUntil && schedule.effectiveUntil <= today ? addDays(schedule.effectiveUntil, -1) : today;
  let ordinal = Math.min(monthOrdinal(to), monthOrdinal(schedule.startDate) + installmentCount - schedule.firstInstallmentIndex);
  let date = monthDate(ordinal, schedule.billingDay);
  if (date && date > to) date = monthDate(--ordinal, schedule.billingDay);
  return date ? scheduleDue(schedule, installmentCount, date)?.installmentIndex ?? 0 : 0;
}

export function occurrenceLabel(status: 'pending' | 'paid' | 'skipped', dueDate: string, today: string) {
  return status === 'pending' ? dueDate < today ? 'Overdue' : dueDate === today ? 'Due today' : 'Upcoming' : status === 'paid' ? 'Paid' : 'Skipped';
}

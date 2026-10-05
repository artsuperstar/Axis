import { addDays, dateOrdinal, daysInMonth, localDateString, localTimeString, validDate, weekdayIndex } from './calendar';
import type { RecurrenceDraft, RecurrenceFrequency, TaskOccurrence, TaskRecurrence } from './types';

export const frequencyLabels: Record<RecurrenceFrequency, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };
export const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const occurrenceLabels = { completed: 'Completed', skipped: 'Skipped', missed: 'Missed', today: 'Today', upcoming: 'Upcoming' } as const;

export function recurrenceError(rule: RecurrenceDraft, startDate: string) {
  if (!validDate(startDate)) return 'Choose a start date for recurrence.';
  if (!['daily', 'weekly', 'monthly', 'yearly'].includes(rule.frequency)) return 'Choose a valid repeat pattern.';
  if (!Number.isSafeInteger(rule.interval) || rule.interval < 1 || (rule.frequency === 'yearly' && rule.interval !== 1)) return 'Enter a whole repeat interval of at least 1.';
  if (rule.frequency === 'weekly' && (!Number.isInteger(rule.weekdayMask) || rule.weekdayMask < 1 || rule.weekdayMask > 127)) return 'Select at least one weekday.';
  if (['monthly', 'yearly'].includes(rule.frequency) && (!Number.isInteger(rule.monthDay) || rule.monthDay < 1 || rule.monthDay > 31)) return 'Choose a day from 1 to 31.';
  if (rule.frequency === 'yearly' && (!Number.isInteger(rule.month) || rule.month < 1 || rule.month > 12 || rule.monthDay > daysInMonth(2000, rule.month))) return 'Choose a valid month and day. February 29 is supported.';
  if (rule.endDate && (!validDate(rule.endDate) || rule.endDate < startDate)) return 'Choose an end date on or after the start date.';
  return null;
}

export function recurrenceDates(rule: TaskRecurrence, from: string, to: string) {
  if (rule.deletedAt !== null) return [];
  const first = [from, rule.startDate, rule.effectiveFrom].sort().at(-1)!;
  const last = [to, rule.endDate ?? to, rule.effectiveUntil ? addDays(rule.effectiveUntil, -1) : to].sort()[0];
  const start = dateOrdinal(rule.startDate);
  const anchorMonday = start - weekdayIndex(rule.startDate);
  const [startYear, startMonth] = rule.startDate.split('-').map(Number);
  const result: string[] = [];
  for (let date = first; date <= last;) {
    const ordinal = dateOrdinal(date);
    const [year, month, day] = date.split('-').map(Number);
    const monthOffset = (year - startYear) * 12 + month - startMonth;
    const matches = rule.frequency === 'daily' ? (ordinal - start) % rule.interval === 0
      : rule.frequency === 'weekly' ? Math.floor((ordinal - anchorMonday) / 7) % rule.interval === 0 && !!((rule.weekdayMask ?? 0) & (1 << weekdayIndex(date)))
        : rule.frequency === 'monthly' ? monthOffset % rule.interval === 0 && day === Math.min(rule.monthDay!, daysInMonth(year, month))
          : month === rule.month && day === Math.min(rule.monthDay!, daysInMonth(year, month));
    if (matches) result.push(date);
    const next = addDays(date, 1);
    if (next === date) break;
    date = next;
  }
  return result;
}

export function occurrenceState(occurrence: TaskOccurrence, now = new Date()) {
  if (occurrence.status !== 'pending') return occurrence.status;
  const today = localDateString(now);
  const time = localTimeString(now);
  if (occurrence.scheduledDate < today || (occurrence.scheduledDate === today && occurrence.scheduledTime !== null
    && (occurrence.scheduledTime < time || (occurrence.scheduledTime === time && (now.getSeconds() > 0 || now.getMilliseconds() > 0))))) return 'missed';
  return occurrence.scheduledDate === today ? 'today' : 'upcoming';
}

export function latestRecurrence(rules: TaskRecurrence[], taskId: string) {
  const all = rules.filter((rule) => rule.taskId === taskId);
  const retained = all.filter((rule) => rule.deletedAt === null);
  return (retained.length ? retained : all).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || b.createdAt - a.createdAt)[0] ?? null;
}

/** Occurrences retain their governing version even after that schedule is closed or retired. */
export function occurrenceRecurrence(rules: TaskRecurrence[], occurrence: TaskOccurrence) {
  return rules.find((rule) => rule.id === occurrence.recurrenceId && rule.taskId === occurrence.taskId) ?? null;
}

export function recurrenceStopped(rule: TaskRecurrence) {
  return rule.deletedAt !== null || rule.effectiveUntil !== null;
}

export function recurrencePatternSummary(rule: TaskRecurrence) {
  const every = rule.interval === 1 ? '' : `${rule.interval} `;
  if (rule.frequency === 'daily') return `Every ${every}day${rule.interval === 1 ? '' : 's'}`;
  if (rule.frequency === 'weekly') {
    const selected = weekdays.filter((_, index) => (rule.weekdayMask ?? 0) & (1 << index));
    const names = selected.length === 1 ? selected : selected.map((day) => day.slice(0, 3));
    const days = names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} & ${names.at(-1)}`;
    return rule.interval === 1 ? `Every ${days}` : `Every ${rule.interval} weeks on ${days}`;
  }
  if (rule.frequency === 'monthly') {
    return rule.interval === 1 ? `Monthly on day ${rule.monthDay}` : `Every ${rule.interval} months on day ${rule.monthDay}`;
  }
  return `Yearly on ${monthNames[rule.month! - 1].slice(0, 3)} ${rule.monthDay}`;
}

export function recurrenceSummary(rule: TaskRecurrence) {
  return `${recurrencePatternSummary(rule)}${recurrenceStopped(rule) ? ' · Stopped' : rule.endDate ? ` · Ends ${rule.endDate}` : ''}`;
}

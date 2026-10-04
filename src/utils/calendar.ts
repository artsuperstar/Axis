/** Civil-date arithmetic uses UTC fields only as a Gregorian calculator, never as a user's time zone. */
export function localDateString(value: Date) {
  return formatDate(value.getFullYear(), value.getMonth() + 1, value.getDate());
}

export function localTimeString(value: Date) {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

export function pickerValue(date: string, time = '') {
  const value = new Date();
  if (date) {
    const [year, month, day] = date.split('-').map(Number);
    value.setFullYear(year, month - 1, day);
  }
  const [hours, minutes] = time ? time.split(':').map(Number) : [12, 0];
  value.setHours(hours, minutes, 0, 0);
  return value;
}

export function dateLabel(date: string) {
  return pickerValue(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDate(year: number, month: number, day: number) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function daysInMonth(year: number, month: number) {
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

export function validDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = date.split('-').map(Number);
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

/** Half-open local-day timestamps; the next midnight respects local daylight-saving changes. */
export function localDayBounds(date: string) {
  if (!validDate(date)) throw new Error('Choose a valid calendar date.');
  const start = pickerValue(date);
  start.setHours(0, 0, 0, 0);
  // Some historic time-zone changes skipped a whole civil day; it has no completion instants.
  if (localDateString(start) !== date) return { from: start.getTime(), until: start.getTime() };
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setHours(0, 0, 0, 0);
  return { from: start.getTime(), until: end.getTime() };
}

export function dateOrdinal(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  const calculator = new Date(0);
  calculator.setUTCFullYear(year, month - 1, day);
  return calculator.getTime() / 86400000;
}

export function addDays(date: string, days: number) {
  const calculator = new Date((dateOrdinal(date) + days) * 86400000);
  // Keep bounded windows within SQLite's supported four-digit civil years.
  if (calculator.getUTCFullYear() < 1) return '0001-01-01';
  if (calculator.getUTCFullYear() > 9999) return '9999-12-31';
  return formatDate(calculator.getUTCFullYear(), calculator.getUTCMonth() + 1, calculator.getUTCDate());
}

export function weekdayIndex(date: string) {
  return ((dateOrdinal(date) + 3) % 7 + 7) % 7; // Monday = 0.
}

export type DateRange = { from: string; to: string };

export function startOfMonth(date: string) { return `${date.slice(0, 7)}-01`; }

export function endOfMonth(date: string) {
  const [year, month] = date.split('-').map(Number);
  return formatDate(year, month, daysInMonth(year, month));
}

/** Keep the selected day number where possible, including across year boundaries. */
export function addMonths(date: string, months: number) {
  const [year, month, day] = date.split('-').map(Number);
  const ordinal = Math.max(0, Math.min(9999 * 12 - 1, (year - 1) * 12 + month - 1 + months));
  const nextYear = Math.floor(ordinal / 12) + 1;
  const nextMonth = ordinal % 12 + 1;
  return formatDate(nextYear, nextMonth, Math.min(day, daysInMonth(nextYear, nextMonth)));
}

export function monthGridRange(date: string): DateRange {
  const first = startOfMonth(date); const last = endOfMonth(date);
  return { from: addDays(first, -weekdayIndex(first)), to: addDays(last, 6 - weekdayIndex(last)) };
}

/** Public range queries are deliberately bounded, including adjacent grid days. */
export function validateDateRange(range: DateRange) {
  if (!validDate(range.from) || !validDate(range.to) || range.from > range.to
    || dateOrdinal(range.to) - dateOrdinal(range.from) > 61) throw new Error('Choose a calendar range of at most 62 days.');
}

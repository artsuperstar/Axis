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

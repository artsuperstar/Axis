import { addDays, addMonths, monthGridRange, startOfMonth, validDate } from '@/utils/calendar';

import type { CalendarSelection } from './types';

export function selectDate(date: string): CalendarSelection { return { month: startOfMonth(date), selected: date }; }
export function moveMonth(selection: CalendarSelection, direction: -1 | 1) { return selectDate(addMonths(selection.selected, direction)); }
export function jumpToMonth(selection: CalendarSelection, year: number, month: number) {
  const target = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`;
  if (!validDate(target)) throw new Error('Choose a valid month and year.');
  const [selectedYear, selectedMonth] = selection.selected.split('-').map(Number);
  return selectDate(addMonths(selection.selected, (year - selectedYear) * 12 + month - selectedMonth));
}
export const returnToToday = selectDate;

export function monthDates(month: string) {
  const { from, to } = monthGridRange(month);
  const dates: string[] = [];
  for (let date = from; date <= to;) {
    dates.push(date);
    const next = addDays(date, 1);
    if (next === date) break;
    date = next;
  }
  return dates;
}

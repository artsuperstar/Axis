import { addDays, addMonths, monthGridRange, startOfMonth } from '@/utils/calendar';

import type { CalendarSelection } from './types';

export function selectDate(date: string): CalendarSelection { return { month: startOfMonth(date), selected: date }; }
export function moveMonth(selection: CalendarSelection, direction: -1 | 1) { return selectDate(addMonths(selection.selected, direction)); }
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

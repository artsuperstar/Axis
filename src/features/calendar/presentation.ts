import { formatBrlAmount } from '@/features/finance/money';
import { addDays, pickerValue } from '@/utils/calendar';

import type { CalendarItem } from './types';

export function calendarDateLabel(date: string) {
  return pickerValue(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

/** Locale formatting follows the existing device-locale convention; the week remains Monday-first. */
export function calendarWeekdays() {
  return Array.from({ length: 7 }, (_, index) => {
    const day = pickerValue(addDays('2026-10-12', index));
    return { full: day.toLocaleDateString(undefined, { weekday: 'long' }),
      short: day.toLocaleDateString(undefined, { weekday: 'short' }), narrow: day.toLocaleDateString(undefined, { weekday: 'narrow' }) };
  });
}

/** Compact rows format source-owned values; they never derive outcomes or financial balances. */
export function calendarAgendaPresentation(item: CalendarItem) {
  if (item.source === 'task') {
    const metadata = item.secondary.replace(/^(?:All day|\d{2}:\d{2})(?: · )?/, '');
    return { time: item.time, amount: null, context: ['Task', metadata].filter(Boolean).join(' · '),
      state: item.status === 'Scheduled' ? null : item.status };
  }
  return { time: null, amount: `${formatBrlAmount(item.amountMinor)}${item.source === 'work' ? item.status === 'Payment overdue' ? ' outstanding' : ' expected' : ''}`,
    context: item.source === 'work' ? `${item.clientName} · Work` : 'Commitment', state: item.status };
}

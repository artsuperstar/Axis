import { compareScheduledItems as compareCalendarItems } from '../scheduled-items';
import type { AgendaSection, CalendarItem } from './types';

export { projectScheduledItems as projectCalendar, compareScheduledItems as compareCalendarItems } from '../scheduled-items';
export { activityMarkers } from './markers';

export function dayAgenda(items: CalendarItem[], date: string): AgendaSection[] {
  const day = items.filter((item) => item.date === date).sort(compareCalendarItems);
  return ([['task', 'Tasks'], ['commitment', 'Commitments'], ['work', 'Expected payments']] as const)
    .map(([source, title]) => ({ title, data: day.filter((item) => item.source === source) })).filter((section) => section.data.length > 0);
}

export function sourceParams(item: CalendarItem) {
  return { source: item.source, recordId: item.recordId, date: item.date };
}

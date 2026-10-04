import type { ThemeColor } from '@/constants/theme';

import type { CalendarItem, CalendarSource } from './types';

export type CalendarMarkerType = CalendarSource;
export type CalendarMarker = { type: CalendarMarkerType; count: number };

/** Source identity, ordering, and presentation stay centralized as Calendar sources expand. */
export const calendarMarkerOrder: readonly CalendarMarkerType[] = ['task', 'commitment', 'work'];
export const calendarMarkerPresentation: Record<CalendarMarkerType, { color: ThemeColor; singular: string; plural: string }> = {
  task: { color: 'calendarTask', singular: 'task', plural: 'tasks' },
  commitment: { color: 'calendarCommitment', singular: 'commitment', plural: 'commitments' },
  work: { color: 'calendarWorkPayment', singular: 'expected payment', plural: 'expected payments' },
};

/** One marker per present source; counts are retained only for richer accessibility announcements. */
export function activityMarkers(items: readonly Pick<CalendarItem, 'date' | 'source'>[]) {
  const counts = new Map<string, Map<CalendarMarkerType, number>>();
  for (const item of items) {
    const day = counts.get(item.date) ?? new Map<CalendarMarkerType, number>();
    day.set(item.source, (day.get(item.source) ?? 0) + 1);
    counts.set(item.date, day);
  }
  return new Map([...counts].map(([date, day]) => [date, calendarMarkerOrder
    .filter((type) => day.has(type)).map((type): CalendarMarker => ({ type, count: day.get(type)! }))]));
}

export function markerAccessibilitySummary(markers: readonly CalendarMarker[]) {
  return markers.map(({ type, count }) => `${count} ${calendarMarkerPresentation[type][count === 1 ? 'singular' : 'plural']}`)
    .join(', ') || 'No scheduled activity';
}

import type { ScheduledItem } from '../scheduled-types';
export type { ScheduledSource as CalendarSource, TaskScheduledItem as TaskCalendarItem, CommitmentScheduledItem as CommitmentCalendarItem,
  WorkScheduledItem as WorkPaymentCalendarItem, ScheduledItem as CalendarItem } from '../scheduled-types';
type CalendarItem = ScheduledItem;
export type AgendaSection = { title: string; data: CalendarItem[] };
export type CalendarSelection = { month: string; selected: string };

export type CalendarSource = 'task' | 'commitment' | 'work';
type CalendarBase = { id: string; date: string; title: string; secondary: string; status: string; recordId: string };
export type TaskCalendarItem = CalendarBase & { source: 'task'; time: string | null; occurrenceId: string | null; completed: boolean };
export type CommitmentCalendarItem = CalendarBase & { source: 'commitment'; occurrenceId: string | null; amountMinor: number };
export type WorkPaymentCalendarItem = CalendarBase & { source: 'work'; amountMinor: number };
export type CalendarItem = TaskCalendarItem | CommitmentCalendarItem | WorkPaymentCalendarItem;
export type AgendaSection = { title: string; data: CalendarItem[] };
export type CalendarSelection = { month: string; selected: string };

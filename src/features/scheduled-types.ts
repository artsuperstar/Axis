/** Source-owned dated records, independent of Calendar or Home UI. */
export type ScheduledSource = 'task' | 'commitment' | 'work';
type ScheduledBase = { id: string; date: string; title: string; secondary: string; status: string; recordId: string };
export type TaskScheduledItem = ScheduledBase & { source: 'task'; time: string | null; occurrenceId: string | null; completed: boolean };
export type CommitmentScheduledItem = ScheduledBase & { source: 'commitment'; occurrenceId: string | null; amountMinor: number };
export type WorkScheduledItem = ScheduledBase & { source: 'work'; amountMinor: number };
export type ScheduledItem = TaskScheduledItem | CommitmentScheduledItem | WorkScheduledItem;

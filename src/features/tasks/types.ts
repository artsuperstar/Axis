import type { taskCategories, taskOccurrences, taskRecurrences, tasks } from '@/database/schema';

export type Task = typeof tasks.$inferSelect;
export type TaskCategory = typeof taskCategories.$inferSelect;
export type TaskPriority = Task['priority'];
export type TaskRecurrence = typeof taskRecurrences.$inferSelect;
export type TaskOccurrence = typeof taskOccurrences.$inferSelect;
export type RecurrenceFrequency = TaskRecurrence['frequency'];
export type OccurrenceStatus = TaskOccurrence['status'];
export type RecurrenceDraft = {
  frequency: RecurrenceFrequency;
  interval: number;
  weekdayMask: number;
  monthDay: number;
  month: number;
  endDate: string;
};
export type TaskListItem = { key: string; task: Task; occurrence: TaskOccurrence | null };

export type TaskDraft = {
  title: string;
  description: string;
  date: string;
  time: string;
  priority: TaskPriority;
  categoryId: string | null;
  recurrence?: RecurrenceDraft | null;
};

export const priorities: readonly TaskPriority[] = ['none', 'low', 'medium', 'high'];

export const priorityLabels: Record<TaskPriority, string> = {
  none: 'None', low: 'Low', medium: 'Medium', high: 'High',
};

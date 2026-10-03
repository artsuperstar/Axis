import type { taskCategories, tasks } from '@/database/schema';

export type Task = typeof tasks.$inferSelect;
export type TaskCategory = typeof taskCategories.$inferSelect;
export type TaskPriority = Task['priority'];

export type TaskDraft = {
  title: string;
  description: string;
  date: string;
  time: string;
  priority: TaskPriority;
  categoryId: string | null;
};

export const priorities: readonly TaskPriority[] = ['none', 'low', 'medium', 'high'];

export const priorityLabels: Record<TaskPriority, string> = {
  none: 'None', low: 'Low', medium: 'Medium', high: 'High',
};

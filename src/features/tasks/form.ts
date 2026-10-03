import { validDate } from './calendar';
import { recurrenceError, recurrenceStopped } from './recurrence';
import { priorities, type Task, type TaskDraft, type TaskRecurrence } from './types';

export { dateLabel, localDateString, localTimeString, pickerValue } from './calendar';

export class TaskValidationError extends Error {}

export function taskDraft(task?: Task | null, recurrence?: TaskRecurrence | null): TaskDraft {
  return {
    title: task?.title ?? '',
    description: task?.description ?? '',
    date: task?.date ?? '',
    time: task?.time ?? '',
    priority: task?.priority ?? 'none',
    categoryId: task?.categoryId ?? null,
    recurrence: recurrence && !recurrenceStopped(recurrence) ? {
      frequency: recurrence.frequency, interval: recurrence.interval,
      weekdayMask: recurrence.weekdayMask ?? 1, monthDay: recurrence.monthDay ?? 1,
      month: recurrence.month ?? 1, endDate: recurrence.endDate ?? '',
    } : null,
  };
}

export function validateTaskDraft(draft: TaskDraft) {
  const title = draft.title.trim();
  const description = draft.description.trim() || null;
  const date = draft.date.trim() || null;
  const time = draft.time.trim() || null;
  if (!title) throw new TaskValidationError('Enter a task title.');
  if (!priorities.includes(draft.priority)) throw new TaskValidationError('Choose a valid priority.');
  if (date && !validDate(date)) {
    throw new TaskValidationError('Choose a valid date.');
  }
  if (time && !date) throw new TaskValidationError('Add a date before setting a time.');
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new TaskValidationError('Choose a valid time.');
  }
  const recurrence = draft.recurrence ?? null;
  if (recurrence) {
    const message = recurrenceError(recurrence, date ?? '');
    if (message) throw new TaskValidationError(message);
  }
  return { title, description, date, time, priority: draft.priority, categoryId: draft.categoryId || null, recurrence };
}

export function userError(error: unknown, fallback: string) {
  if (error instanceof TaskValidationError) return error.message;
  console.error(fallback, error);
  return fallback;
}

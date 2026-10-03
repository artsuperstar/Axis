import { priorities, type Task, type TaskDraft } from './types';

export class TaskValidationError extends Error {}

export function localDateString(value: Date) {
  return `${String(value.getFullYear()).padStart(4, '0')}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export function localTimeString(value: Date) {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

export function pickerValue(date: string, time = '') {
  const value = new Date();
  if (date) {
    const [year, month, day] = date.split('-').map(Number);
    value.setFullYear(year, month - 1, day);
  }
  const [hours, minutes] = time ? time.split(':').map(Number) : [12, 0];
  value.setHours(hours, minutes, 0, 0);
  return value;
}

export function dateLabel(date: string) {
  return pickerValue(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function taskDraft(task?: Task | null): TaskDraft {
  return {
    title: task?.title ?? '',
    description: task?.description ?? '',
    date: task?.date ?? '',
    time: task?.time ?? '',
    priority: task?.priority ?? 'none',
    categoryId: task?.categoryId ?? null,
  };
}

function validDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = date.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12) return false;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= days[month - 1];
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
  return { title, description, date, time, priority: draft.priority, categoryId: draft.categoryId || null };
}

export function userError(error: unknown, fallback: string) {
  if (error instanceof TaskValidationError) return error.message;
  console.error(fallback, error);
  return fallback;
}

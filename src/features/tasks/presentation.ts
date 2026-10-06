import { dateLabel } from './form';
import { addDays, localDateString } from './calendar';
import { categoryName } from './grouping';
import { occurrenceLabels, occurrenceRecurrence, occurrenceState, recurrencePatternSummary } from './recurrence';
import { priorityLabels, type Task, type TaskCategory, type TaskOccurrence, type TaskRecurrence } from './types';

/** One set of occurrence-specific values for visible metadata and accessible descriptions. */
export function taskRowPresentation(task: Task, occurrence: TaskOccurrence | null, recurrences: TaskRecurrence[], categories: TaskCategory[], now: number) {
  const completed = occurrence ? occurrence.status === 'completed' : task.completedAt !== null;
  const scheduledDate = occurrence ? occurrence.scheduledDate : task.date;
  const time = occurrence ? occurrence.scheduledTime : task.time;
  const date = scheduledDate ? `${dateLabel(scheduledDate)}${time ? ` at ${time}` : ''}` : 'No date';
  const today = localDateString(new Date(now));
  const dayContext = scheduledDate === today ? 'Today' : scheduledDate === addDays(today, 1) ? 'Tomorrow' : scheduledDate ? dateLabel(scheduledDate) : null;
  const category = categoryName(task, categories);
  const priority = task.priority !== 'none' ? `${priorityLabels[task.priority]} priority` : null;
  const state = occurrence ? occurrenceState(occurrence, new Date(now)) : null;
  const rule = occurrence ? occurrenceRecurrence(recurrences, occurrence) : null;
  const recurrence = rule ? recurrencePatternSummary(rule) : occurrence ? 'Repeats' : null;
  const outcome = state && state !== 'today' && state !== 'upcoming' ? occurrenceLabels[state] : completed ? 'Completed' : 'Pending';
  const resolved = completed || state === 'skipped';
  const attention = state === 'missed' || (!occurrence && !completed && !!scheduledDate && scheduledDate < today);
  return {
    completed, date, recurrence, outcome,
    resolved, attention, priority,
    visibleDate: dayContext ? `${dayContext}${time ? ` · ${time}` : ''}` : null,
    statusLabel: resolved || state === 'missed' ? outcome : attention ? 'Earlier' : null,
    historyOutcome: state ? occurrenceLabels[state] : outcome,
    metadata: [recurrence, priority, category].filter(Boolean).join(' · '),
    actionSubject: `${task.title}${scheduledDate ? ` on ${date}` : ''}`,
    accessibilityLabel: [task.title, task.description, scheduledDate ? date : null, priority, category, recurrence, outcome].filter(Boolean).join('. '),
  };
}

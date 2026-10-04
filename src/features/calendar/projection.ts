import type { createTaskDataAccess } from '@/features/tasks/data';
import { occurrenceLabels, occurrenceState, recurrencePatternSummary } from '@/features/tasks/recurrence';
import { priorityLabels } from '@/features/tasks/types';
import type { CommitmentDataAccess } from '@/features/finance/commitments/data';
import { occurrenceLabel } from '@/features/finance/commitments/scheduling';
import { commitmentKindLabels } from '@/features/finance/commitments/types';
import { formatBrlAmount } from '@/features/finance/money';
import type { WorkItem } from '@/features/finance/work/types';
import { localDateString } from '@/utils/calendar';

import type { AgendaSection, CalendarItem } from './types';

export { activityMarkers } from './markers';

type TaskRows = ReturnType<ReturnType<typeof createTaskDataAccess>['readRange']>;
type CommitmentRows = ReturnType<CommitmentDataAccess['readRange']>;

export function projectCalendar(tasks: TaskRows, commitments: CommitmentRows, work: WorkItem[], now: Date): CalendarItem[] {
  const today = localDateString(now);
  const items: CalendarItem[] = [];
  for (const { task, occurrence, recurrence, category } of tasks) {
    const date = occurrence?.scheduledDate ?? task.date;
    if (!date) continue;
    const time = occurrence ? occurrence.scheduledTime : task.time;
    const completed = occurrence ? occurrence.status === 'completed' : task.completedAt !== null;
    items.push({ id: occurrence ? `task-occurrence:${occurrence.id}` : `task:${task.id}`, source: 'task', recordId: task.id,
      occurrenceId: occurrence?.id ?? null, date, title: task.title, time, completed,
      status: occurrence ? occurrenceLabels[occurrenceState(occurrence, now)] : completed ? 'Completed' : 'Scheduled',
      secondary: [time ?? 'All day', category?.name, task.priority !== 'none' ? `${priorityLabels[task.priority]} priority` : null,
        recurrence ? recurrencePatternSummary(recurrence) : null].filter(Boolean).join(' · ') });
  }
  for (const { commitment, occurrence, category } of commitments) {
    if (occurrence.status !== 'pending') continue;
    items.push({ id: `commitment:${commitment.id}:${occurrence.dueDate}`, source: 'commitment', recordId: commitment.id,
      occurrenceId: occurrence.id, date: occurrence.dueDate, title: commitment.title, amountMinor: occurrence.expectedAmountMinor,
      status: occurrenceLabel(occurrence.status, occurrence.dueDate, today),
      secondary: [commitmentKindLabels[commitment.kind], `Expected ${formatBrlAmount(occurrence.expectedAmountMinor)}`,
        occurrence.installmentIndex ? `${occurrence.installmentIndex} / ${commitment.installmentCount}` : null, category?.name].filter(Boolean).join(' · ') });
  }
  for (const item of work) {
    if (!item.entry.expectedPaymentDate || item.outstandingMinor <= 0) continue;
    items.push({ id: `work:${item.entry.id}`, source: 'work', recordId: item.entry.id, date: item.entry.expectedPaymentDate,
      title: item.counterparty.name, amountMinor: item.outstandingMinor,
      secondary: `${item.entry.description} · ${formatBrlAmount(item.outstandingMinor)} outstanding`,
      status: item.overdue ? 'Payment overdue' : 'Expected payment' });
  }
  // Source identities also protect against a repeated joined row reaching the presentation boundary.
  return [...new Map(items.map((item) => [item.id, item])).values()].sort(compareCalendarItems);
}

export function compareCalendarItems(a: CalendarItem, b: CalendarItem) {
  const rank = (item: CalendarItem) => item.source === 'task' ? item.time ? 0 : 1 : item.source === 'commitment' ? 2 : 3;
  return a.date.localeCompare(b.date) || rank(a) - rank(b)
    || (a.source === 'task' && b.source === 'task' ? (a.time ?? '').localeCompare(b.time ?? '') : 0)
    || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
}

export function dayAgenda(items: CalendarItem[], date: string): AgendaSection[] {
  const day = items.filter((item) => item.date === date).sort(compareCalendarItems);
  return ([['task', 'Tasks'], ['commitment', 'Commitments'], ['work', 'Expected payments']] as const)
    .map(([source, title]) => ({ title, data: day.filter((item) => item.source === source) })).filter((section) => section.data.length > 0);
}

export function sourceParams(item: CalendarItem) {
  return { source: item.source, recordId: item.recordId, date: item.date };
}

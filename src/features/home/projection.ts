import type { createTaskDataAccess } from '@/features/tasks/data';
import { groupTasks } from '@/features/tasks/grouping';
import { occurrenceState } from '@/features/tasks/recurrence';
import type { TaskPriority } from '@/features/tasks/types';
import type { CommitmentItem } from '@/features/finance/commitments/types';
import type { FinanceCategory } from '@/features/finance/types';
import type { WorkItem } from '@/features/finance/work/types';
import type { FitnessSnapshot } from '@/features/fitness/types';
import { dateLabel, localDateString } from '@/utils/calendar';

import { compareScheduledItems, projectScheduledItems } from '../scheduled-items';
import type { ScheduledSource } from '../scheduled-types';
import type { HomeNavigation, SourceTarget } from '../source-navigation';
import type { HomeItem, HomeSection, HomeSnapshot, HomeTaskItem } from './types';

export type HomeSources = {
  tasks: ReturnType<ReturnType<typeof createTaskDataAccess>['read']>;
  commitments: CommitmentItem[]; financeCategories: FinanceCategory[]; work: WorkItem[];
  fitness: Pick<FitnessSnapshot, 'active' | 'history'>;
};
export const homePreviewLimits = { todayTasks: 5, todayFinance: 3, attentionPerSource: 3 } as const;
const sourceOrder = ['task', 'commitment', 'work'] as const;
const priorityRank: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2, none: 3 };
export const moduleTargets: Record<ScheduledSource, HomeNavigation> = {
  task: { pathname: '/(tabs)/tasks' }, commitment: { pathname: '/home-source', params: { source: 'commitment' } },
  work: { pathname: '/home-source', params: { source: 'work' } },
};
function sections(items: HomeItem[], attention: boolean): HomeSection[] {
  const titles = attention ? { task: 'Tasks needing attention', commitment: 'Overdue commitments', work: 'Overdue expected payments' }
    : { task: 'Tasks', commitment: 'Commitments due today', work: 'Expected work payments' };
  return sourceOrder.flatMap((source) => {
    const rows = items.filter((item) => item.source === source);
    if (!rows.length) return [];
    rows.sort(attention ? compareAttention : compareScheduledItems);
    const limit = attention ? homePreviewLimits.attentionPerSource : source === 'task' ? homePreviewLimits.todayTasks : homePreviewLimits.todayFinance;
    return [{ source, title: titles[source], items: rows.slice(0, limit), total: rows.length, remaining: Math.max(0, rows.length - limit), target: moduleTargets[source] }];
  });
}
function compareAttention(a: HomeItem, b: HomeItem) {
  return (a.source === 'task' && b.source === 'task' ? priorityRank[a.priority] - priorityRank[b.priority] : 0)
    || b.date.localeCompare(a.date)
    || (a.source === 'task' && b.source === 'task' ? (b.time ?? '').localeCompare(a.time ?? '') : 0)
    || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
}

/** Home changes relevance and preview limits, while sources own dates, amounts and outcomes. */
export function projectHome(sources: HomeSources, now: Date): HomeSnapshot {
  const today = localDateString(now);
  const categories = new Map(sources.tasks.categories.map((category) => [category.id, category]));
  const financeCategories = new Map(sources.financeCategories.map((category) => [category.id, category]));
  const rules = new Map(sources.tasks.recurrences.map((rule) => [rule.id, rule]));
  const taskPriority = new Map(sources.tasks.tasks.map((task) => [task.id, task.priority]));
  // One-time lateness is the existing Earlier group. Only actual recurring occurrences have Missed derivation.
  const earlier = new Set(groupTasks(sources.tasks.items, today).find((section) => section.title === 'Earlier')?.data.map((item) => item.key) ?? []);
  const missed = new Set(sources.tasks.items.filter((item) => item.occurrence && occurrenceState(item.occurrence, now) === 'missed').map((item) => item.key));
  const activeTasks = sources.tasks.items.filter(({ task, occurrence }) => task.deletedAt === null && (occurrence
    ? occurrence.deletedAt === null && occurrence.status === 'pending' : task.completedAt === null));
  const taskRows = activeTasks.map(({ task, occurrence }) => ({ task, occurrence,
    recurrence: occurrence ? rules.get(occurrence.recurrenceId) ?? null : null,
    category: task.categoryId ? categories.get(task.categoryId) ?? null : null }));
  const commitmentRows = sources.commitments.filter((item) => item.commitment.deletedAt === null).flatMap((item) => item.outstanding
    .filter((occurrence) => occurrence.status === 'pending').map((occurrence) => ({
      commitment: item.commitment, occurrence, category: item.commitment.categoryId ? financeCategories.get(item.commitment.categoryId) ?? null : null,
    })));
  const work = sources.work.filter((item) => item.entry.deletedAt === null && item.outstandingMinor > 0);
  const overdueWork = new Set(work.filter((item) => item.overdue).map((item) => item.entry.id));
  const todayItems: HomeItem[] = []; const attentionItems: HomeItem[] = [];
  for (const item of projectScheduledItems(taskRows, commitmentRows, work, now)) {
    const target: SourceTarget = { pathname: '/home-source', params: { source: item.source, recordId: item.recordId, date: item.date } };
    if (item.source === 'task') {
      const key = item.occurrenceId ?? item.recordId;
      const attention = earlier.has(key) || missed.has(key);
      const projected: HomeTaskItem = { ...item, priority: taskPriority.get(item.recordId) ?? 'none',
        status: missed.has(key) ? 'Missed' : attention ? 'Earlier' : 'Today', target };
      if (attention) attentionItems.push(projected);
      else if (item.date === today) todayItems.push(projected);
    } else {
      const projected: HomeItem = { ...item, target };
      if (item.source === 'work' ? overdueWork.has(item.recordId) : item.status === 'Overdue') attentionItems.push(projected);
      else if (item.date === today) todayItems.push(projected);
    }
  }
  const active = sources.fitness.active;
  const latest = sources.fitness.history[0];
  const workout = (session: NonNullable<typeof active>) => ({ session, target: { pathname: '/home-source' as const, params: { source: 'fitness' as const, recordId: session.id } } });
  return { date: today, today: sections(todayItems, false), attention: sections(attentionItems, true),
    activeWorkout: active ? { session: active, target: { pathname: '/(tabs)/fitness' } } : null,
    completedWorkout: !active && latest?.completedAt !== null && latest?.completedAt !== undefined && localDateString(new Date(latest.completedAt)) === today ? workout(latest) : null,
    nothingPending: todayItems.length === 0 && attentionItems.length === 0 && !active };
}

export function homeItemContext(item: HomeItem, today: string) {
  if (item.source === 'commitment') return item.status === 'Overdue' ? `Overdue since ${dateLabel(item.date)}` : 'Due today';
  if (item.source === 'work') return item.status === 'Payment overdue' ? `Payment overdue since ${dateLabel(item.date)}` : 'Expected payment today';
  const date = item.date === today ? 'Today' : dateLabel(item.date);
  return [item.status === 'Missed' ? 'Missed' : item.status === 'Earlier' ? 'Earlier' : null, date, item.time].filter(Boolean).join(' · ');
}
export function homeItemLabel(item: HomeItem, today: string) {
  const source = item.source === 'task' ? item.occurrenceId ? 'Recurring task' : 'Task' : item.source === 'commitment' ? 'Commitment' : 'Work payment';
  return `${item.title}. ${source}. ${homeItemContext(item, today)}. ${item.secondary}`;
}

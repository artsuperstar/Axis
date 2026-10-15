import { groupTasks } from './grouping';
import { localDateString } from './calendar';
import type { TaskListItem } from './types';

export const todoPreviewLimit = 5;
export type TaskWorkspaceSection = {
  title: string;
  data: TaskListItem[];
  total: number;
  expanded: boolean;
  progress?: { completed: number; total: number };
  completedStartIndex?: number;
  /** Ownership survives collapse while VirtualizedList removes its previous visible cells. */
  memberKeys?: readonly string[];
};

/** A view over authoritative grouping; ordering and occurrence selection stay source-owned. */
export function taskWorkspaceSections(items: TaskListItem[], today: string, state: {
  earlier: boolean; upcoming: boolean; todo: boolean;
}): TaskWorkspaceSection[] {
  const groups = groupTasks(items, today);
  // A current-day projection of the same records History uses, never another completion ledger.
  const completedToday = (groups.find((section) => section.title === 'Completed')?.data ?? []).filter((item) => {
    const date = item.occurrence?.scheduledDate ?? item.task.date;
    const completedAt = item.occurrence ? item.occurrence.completedAt : item.task.completedAt;
    return date === today && completedAt !== null && localDateString(new Date(completedAt)) === today;
  });
  return [
    { source: 'Earlier', title: 'Earlier', expanded: state.earlier },
    { source: 'Today', title: 'Today', expanded: true },
    { source: 'No date', title: 'To-do', expanded: true },
    { source: 'Upcoming', title: 'Upcoming', expanded: state.upcoming },
  ].map(({ source, title, expanded }) => {
    const pending = groups.find((section) => section.title === source)?.data ?? [];
    const data = source === 'Today' ? [...pending, ...completedToday] : pending;
    return { title, total: data.length, expanded, memberKeys: data.map((item) => item.key),
      ...(source === 'Today' ? { progress: { completed: completedToday.length, total: data.length },
        completedStartIndex: completedToday.length ? pending.length : undefined } : {}),
      data: !expanded ? [] : source === 'No date' && !state.todo ? data.slice(0, todoPreviewLimit) : data };
  });
}

/** These are exactly the resolved groups previously shown in the main feed. */
export function taskArchiveSections(items: TaskListItem[], today: string) {
  return groupTasks(items, today).filter((section) => ['Completed', 'Skipped'].includes(section.title));
}

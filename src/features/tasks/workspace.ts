import { groupTasks } from './grouping';
import type { TaskListItem } from './types';

export const todoPreviewLimit = 5;
export type TaskWorkspaceSection = {
  title: string;
  data: TaskListItem[];
  total: number;
  expanded: boolean;
};

/** A view over authoritative grouping; ordering and occurrence selection stay source-owned. */
export function taskWorkspaceSections(items: TaskListItem[], today: string, state: {
  earlier: boolean; upcoming: boolean; todo: boolean;
}): TaskWorkspaceSection[] {
  const groups = groupTasks(items, today);
  return [
    { source: 'Earlier', title: 'Earlier', expanded: state.earlier },
    { source: 'Today', title: 'Today', expanded: true },
    { source: 'No date', title: 'To-do', expanded: true },
    { source: 'Upcoming', title: 'Upcoming', expanded: state.upcoming },
  ].map(({ source, title, expanded }) => {
    const data = groups.find((section) => section.title === source)?.data ?? [];
    return { title, total: data.length, expanded,
      data: !expanded ? [] : source === 'No date' && !state.todo ? data.slice(0, todoPreviewLimit) : data };
  });
}

/** These are exactly the resolved groups previously shown in the main feed. */
export function taskArchiveSections(items: TaskListItem[], today: string) {
  return groupTasks(items, today).filter((section) => ['Completed', 'Skipped'].includes(section.title));
}

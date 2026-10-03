import { localDateString } from './form';
import type { Task, TaskCategory, TaskListItem } from './types';

export function categoryName(task: Task, categories: TaskCategory[]) {
  return categories.find((category) => category.id === task.categoryId && category.deletedAt === null)?.name ?? null;
}

export function groupTasks(items: TaskListItem[], today = localDateString(new Date())) {
  const sections = [
    { title: 'Earlier', data: [] as TaskListItem[] },
    { title: 'Today', data: [] as TaskListItem[] },
    { title: 'Upcoming', data: [] as TaskListItem[] },
    { title: 'No date', data: [] as TaskListItem[] },
    { title: 'Completed', data: [] as TaskListItem[] },
    { title: 'Skipped', data: [] as TaskListItem[] },
  ];
  for (const item of items) {
    const { task, occurrence } = item;
    if (task.deletedAt !== null || (occurrence && occurrence.deletedAt !== null)) continue;
    const date = occurrence ? occurrence.scheduledDate : task.date;
    const completed = occurrence ? occurrence.status === 'completed' : task.completedAt !== null;
    const index = occurrence?.status === 'skipped' ? 5 : completed ? 4 : !date ? 3 : date < today ? 0 : date === today ? 1 : 2;
    sections[index].data.push(item);
  }
  for (const section of sections) section.data.sort((a, b) => {
    if (section.title === 'Completed') return (b.occurrence?.completedAt ?? b.task.completedAt ?? 0) - (a.occurrence?.completedAt ?? a.task.completedAt ?? 0);
    const aDate = a.occurrence?.scheduledDate ?? a.task.date ?? '';
    const bDate = b.occurrence?.scheduledDate ?? b.task.date ?? '';
    const aTime = a.occurrence ? a.occurrence.scheduledTime : a.task.time;
    const bTime = b.occurrence ? b.occurrence.scheduledTime : b.task.time;
    return aDate.localeCompare(bDate) || (aTime ?? '').localeCompare(bTime ?? '');
  });
  const upcoming = sections[2];
  const seenSeries = new Set<string>();
  // Keep every one-time task and only the earliest pending future occurrence per series.
  upcoming.data = upcoming.data.filter((item) => {
    if (!item.occurrence) return true;
    if (seenSeries.has(item.task.id)) return false;
    seenSeries.add(item.task.id);
    return true;
  });
  return sections.filter((section) => section.data.length > 0);
}

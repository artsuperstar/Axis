import { localDateString } from './form';
import type { Task, TaskCategory } from './types';

export function categoryName(task: Task, categories: TaskCategory[]) {
  return categories.find((category) => category.id === task.categoryId && category.deletedAt === null)?.name ?? 'Uncategorized';
}

export function groupTasks(tasks: Task[], today = localDateString(new Date())) {
  const sections = [
    { title: 'Earlier', data: [] as Task[] },
    { title: 'Today', data: [] as Task[] },
    { title: 'Upcoming', data: [] as Task[] },
    { title: 'No date', data: [] as Task[] },
    { title: 'Completed', data: [] as Task[] },
  ];
  for (const task of tasks) {
    if (task.deletedAt !== null) continue;
    const index = task.completedAt !== null ? 4 : !task.date ? 3 : task.date < today ? 0 : task.date === today ? 1 : 2;
    sections[index].data.push(task);
  }
  sections[4].data.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  return sections.filter((section) => section.data.length > 0);
}

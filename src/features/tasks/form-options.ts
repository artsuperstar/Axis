import { priorities, priorityLabels, type TaskCategory } from './types';

export const taskPriorityOptions = priorities.map((value) => ({ value, label: priorityLabels[value] }));

/** Task categories remain separate from Finance and keep their existing active-category choices. */
export function taskCategoryOptions(categories: TaskCategory[]) {
  return [{ value: null, label: 'No category' }, ...categories.filter((category) => category.deletedAt === null).map((category) => ({ value: category.id, label: category.name }))];
}

/** Task persistence and selection remain independent of the Finance category flow. */
export function createTaskCategorySelection(name: string, create: (name: string) => TaskCategory, select: (id: string) => void, close: () => void) {
  const category = create(name);
  select(category.id);
  close();
}

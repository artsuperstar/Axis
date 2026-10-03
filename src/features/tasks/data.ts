import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';

import type { AxisDatabase } from '@/database/client';
import { taskCategories, tasks } from '@/database/schema';

import { TaskValidationError, validateTaskDraft } from './form';
import type { TaskDraft } from './types';

export function createTaskDataAccess(db: AxisDatabase, newId: () => string, now = Date.now) {
  function activeTask(id: string) {
    const task = db.select().from(tasks).where(and(eq(tasks.id, id), isNull(tasks.deletedAt))).get();
    if (!task) throw new TaskValidationError('This task is no longer available.');
    return task;
  }

  function taskValues(draft: TaskDraft) {
    const values = validateTaskDraft(draft);
    if (values.categoryId) {
      const category = db.select().from(taskCategories)
        .where(and(eq(taskCategories.id, values.categoryId), isNull(taskCategories.deletedAt))).get();
      if (!category) throw new TaskValidationError('This category is no longer available. Choose another category.');
    }
    return values;
  }

  return {
    read() {
      return {
        tasks: db.select().from(tasks).where(isNull(tasks.deletedAt))
          .orderBy(asc(tasks.date), asc(tasks.time), desc(tasks.createdAt)).all(),
        categories: db.select().from(taskCategories).where(isNull(taskCategories.deletedAt))
          .orderBy(desc(taskCategories.isDefault), asc(taskCategories.name)).all(),
      };
    },

    createTask(draft: TaskDraft) {
      const values = taskValues(draft);
      const timestamp = now();
      const id = newId();
      db.insert(tasks).values({ ...values, id, createdAt: timestamp, updatedAt: timestamp }).run();
      return id;
    },

    editTask(id: string, draft: TaskDraft) {
      const task = activeTask(id);
      const values = taskValues(draft);
      db.update(tasks).set({ ...values, updatedAt: Math.max(now(), task.updatedAt + 1) })
        .where(and(eq(tasks.id, id), isNull(tasks.deletedAt))).run();
    },

    setCompleted(id: string, completed: boolean) {
      const task = activeTask(id);
      const timestamp = Math.max(now(), task.updatedAt + 1);
      db.update(tasks).set({ completedAt: completed ? timestamp : null, updatedAt: timestamp })
        .where(and(eq(tasks.id, id), isNull(tasks.deletedAt))).run();
    },

    deleteTask(id: string) {
      const task = activeTask(id);
      const timestamp = Math.max(now(), task.updatedAt + 1);
      db.update(tasks).set({ deletedAt: timestamp, updatedAt: timestamp })
        .where(and(eq(tasks.id, id), isNull(tasks.deletedAt))).run();
    },

    createCategory(input: string) {
      const name = input.trim().replace(/\s+/g, ' ');
      if (!name) throw new TaskValidationError('Enter a category name.');
      const duplicate = db.select().from(taskCategories)
        .where(and(sql`lower(${taskCategories.name}) = lower(${name})`, isNull(taskCategories.deletedAt))).get();
      if (duplicate) throw new TaskValidationError('A category with that name already exists.');
      const timestamp = now();
      const category = { id: newId(), name, isDefault: false, createdAt: timestamp, updatedAt: timestamp, deletedAt: null };
      db.insert(taskCategories).values(category).run();
      return category;
    },

    deleteCategory(id: string) {
      const category = db.select().from(taskCategories)
        .where(and(eq(taskCategories.id, id), isNull(taskCategories.deletedAt))).get();
      if (!category) throw new TaskValidationError('This category is no longer available.');
      if (category.isDefault) throw new TaskValidationError('Built-in categories cannot be deleted.');
      const timestamp = Math.max(now(), category.updatedAt + 1);
      // Keep task references intact. Normal queries omit this category, so it displays as uncategorized.
      db.update(taskCategories).set({ deletedAt: timestamp, updatedAt: timestamp })
        .where(and(eq(taskCategories.id, id), isNull(taskCategories.deletedAt))).run();
    },
  };
}

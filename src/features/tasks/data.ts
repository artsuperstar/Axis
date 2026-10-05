import { and, asc, desc, eq, gte, gt, isNull, lt, lte, ne, notExists, or, sql } from 'drizzle-orm';

import type { AxisDatabase } from '@/database/client';
import { taskCategories, taskOccurrences, taskRecurrences, tasks } from '@/database/schema';

import { TaskValidationError, validateTaskDraft } from './form';
import { addDays, localDateString } from './calendar';
import { latestRecurrence, recurrenceDates, recurrenceStopped } from './recurrence';
import type { OccurrenceStatus, RecurrenceDraft, Task, TaskDraft, TaskListItem, TaskRecurrence } from './types';
import { localDayBounds, validateDateRange, type DateRange } from '@/utils/calendar';
import { canonicalIdentityName, normalizeIdentityDisplayName } from '@/utils/text-normalization';

type TaskDb = Pick<AxisDatabase, 'select' | 'insert' | 'update'>;
export const occurrenceWindowDays = 30;

export function createTaskDataAccess(db: AxisDatabase, newId: () => string, now = Date.now) {
  function rulesForTask(id: string, query: TaskDb = db) {
    return query.select().from(taskRecurrences).where(eq(taskRecurrences.taskId, id)).all();
  }

  function insertRule(query: TaskDb, taskId: string, draft: RecurrenceDraft, date: string, time: string | null, effectiveFrom: string, timestamp: number) {
    query.insert(taskRecurrences).values({
      id: newId(), taskId, frequency: draft.frequency, interval: draft.interval,
      weekdayMask: draft.frequency === 'weekly' ? draft.weekdayMask : null,
      monthDay: ['monthly', 'yearly'].includes(draft.frequency) ? draft.monthDay : null,
      month: draft.frequency === 'yearly' ? draft.month : null,
      startDate: date, scheduledTime: time, endDate: draft.endDate || null, effectiveFrom,
      createdAt: timestamp, updatedAt: timestamp,
    }).run();
  }

  function materialize(query: TaskDb, rules: TaskRecurrence[], from: string, to: string, timestamp: number) {
    const existing = query.select({ recurrenceId: taskOccurrences.recurrenceId, date: taskOccurrences.scheduledDate })
      .from(taskOccurrences).where(and(gte(taskOccurrences.scheduledDate, from), lte(taskOccurrences.scheduledDate, to))).all();
    const identities = new Set(existing.map((row) => `${row.recurrenceId}:${row.date}`));
    for (const rule of rules) {
      for (const date of recurrenceDates(rule, from, to)) {
        if (identities.has(`${rule.id}:${date}`)) continue;
        query.insert(taskOccurrences).values({ id: newId(), taskId: rule.taskId, recurrenceId: rule.id,
          scheduledDate: date, scheduledTime: rule.scheduledTime, createdAt: timestamp, updatedAt: timestamp })
          .onConflictDoNothing().run();
      }
    }
  }

  function replaceSchedule(query: TaskDb, task: Task, recurrence: RecurrenceDraft | null, date: string | null, time: string | null, timestamp: number) {
    const rules = rulesForTask(task.id, query);
    const current = latestRecurrence(rules, task.id);
    const unchanged = recurrence && current && !recurrenceStopped(current)
      && current.frequency === recurrence.frequency && current.interval === recurrence.interval
      && current.startDate === date && current.scheduledTime === time && current.endDate === (recurrence.endDate || null)
      && current.weekdayMask === (recurrence.frequency === 'weekly' ? recurrence.weekdayMask : null)
      && current.monthDay === (['monthly', 'yearly'].includes(recurrence.frequency) ? recurrence.monthDay : null)
      && current.month === (recurrence.frequency === 'yearly' ? recurrence.month : null);
    if (unchanged || (!recurrence && (!current || recurrenceStopped(current)))) return;
    const today = localDateString(new Date(now()));
    // Today's schedule is frozen; edited schedules and explicit stops begin tomorrow.
    const boundary = addDays(today, 1);
    materialize(query, rules, addDays(today, -occurrenceWindowDays), today, timestamp);
    for (const rule of rules.filter((item) => item.deletedAt === null)) {
      if (rule.effectiveFrom >= boundary) {
        query.update(taskRecurrences).set({ deletedAt: timestamp, updatedAt: Math.max(timestamp, rule.updatedAt + 1) }).where(eq(taskRecurrences.id, rule.id)).run();
      } else if (rule.effectiveUntil === null || rule.effectiveUntil > boundary) {
        query.update(taskRecurrences).set({ effectiveUntil: boundary, updatedAt: Math.max(timestamp, rule.updatedAt + 1) }).where(eq(taskRecurrences.id, rule.id)).run();
      }
    }
    // Keep future rows as tombstones, including any early outcomes. Past rows are untouched.
    query.update(taskOccurrences).set({ deletedAt: timestamp, updatedAt: sql`max(${timestamp}, ${taskOccurrences.updatedAt} + 1)` })
      .where(and(eq(taskOccurrences.taskId, task.id), gte(taskOccurrences.scheduledDate, boundary), isNull(taskOccurrences.deletedAt))).run();
    if (recurrence) insertRule(query, task.id, recurrence, date!, time, rules.length ? boundary : [today, date!].sort()[1], timestamp);
  }
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
    /** Actual completion day, independent of due dates and occurrence generation windows. */
    readCompletedOnDate(date: string) {
      const { from, until } = localDayBounds(date);
      const oneTime = db.select({ id: tasks.id, title: tasks.title }).from(tasks)
        .where(and(isNull(tasks.deletedAt), gte(tasks.completedAt, from), lt(tasks.completedAt, until),
          notExists(db.select({ id: taskRecurrences.id }).from(taskRecurrences).where(eq(taskRecurrences.taskId, tasks.id))))).all();
      // Resolved previous-schedule occurrences remain real completion history even when retired.
      const recurring = db.select({ id: taskOccurrences.id, title: tasks.title }).from(taskOccurrences)
        .innerJoin(tasks, eq(tasks.id, taskOccurrences.taskId))
        .where(and(isNull(tasks.deletedAt), eq(taskOccurrences.status, 'completed'),
          gte(taskOccurrences.completedAt, from), lt(taskOccurrences.completedAt, until))).all();
      return [...oneTime.map((row) => ({ ...row, source: 'task' as const })),
        ...recurring.map((row) => ({ ...row, source: 'occurrence' as const }))];
    },
    /** Calendar requests actual occurrences for one visible range, independent of the Tasks list window. */
    readRange(range: DateRange) {
      validateDateRange(range);
      return db.transaction((query) => {
        const recurrences = query.select({ rule: taskRecurrences }).from(taskRecurrences)
          .innerJoin(tasks, eq(tasks.id, taskRecurrences.taskId))
          .where(and(isNull(tasks.deletedAt), isNull(taskRecurrences.deletedAt), lte(taskRecurrences.effectiveFrom, range.to),
            or(isNull(taskRecurrences.effectiveUntil), gt(taskRecurrences.effectiveUntil, range.from)))).all().map(({ rule }) => rule);
        materialize(query, recurrences, range.from, range.to, now());
        const categories = and(eq(tasks.categoryId, taskCategories.id), isNull(taskCategories.deletedAt));
        const oneTime = query.select({ task: tasks, category: taskCategories }).from(tasks).leftJoin(taskCategories, categories)
          .where(and(isNull(tasks.deletedAt), gte(tasks.date, range.from), lte(tasks.date, range.to),
            notExists(query.select({ id: taskRecurrences.id }).from(taskRecurrences).where(eq(taskRecurrences.taskId, tasks.id))))).all();
        const recurring = query.select({ task: tasks, occurrence: taskOccurrences, recurrence: taskRecurrences, category: taskCategories })
          .from(taskOccurrences).innerJoin(tasks, eq(tasks.id, taskOccurrences.taskId))
          .innerJoin(taskRecurrences, eq(taskRecurrences.id, taskOccurrences.recurrenceId)).leftJoin(taskCategories, categories)
          .where(and(isNull(tasks.deletedAt), isNull(taskOccurrences.deletedAt), gte(taskOccurrences.scheduledDate, range.from), lte(taskOccurrences.scheduledDate, range.to))).all();
        return [...oneTime.map((row) => ({ ...row, occurrence: null, recurrence: null })), ...recurring];
      });
    },

    read() {
      const today = localDateString(new Date(now()));
      const from = addDays(today, -occurrenceWindowDays);
      const to = addDays(today, occurrenceWindowDays);
      const activeTasks = db.select().from(tasks).where(isNull(tasks.deletedAt))
        .orderBy(asc(tasks.date), asc(tasks.time), desc(tasks.createdAt)).all();
      const recurrences = db.select({ rule: taskRecurrences }).from(taskRecurrences)
        .innerJoin(tasks, eq(taskRecurrences.taskId, tasks.id)).where(isNull(tasks.deletedAt)).all().map((row) => row.rule);
      db.transaction((query) => materialize(query, recurrences, from, to, now()));
      const occurrences = db.select({ occurrence: taskOccurrences }).from(taskOccurrences)
        .innerJoin(tasks, eq(taskOccurrences.taskId, tasks.id))
        .where(and(isNull(tasks.deletedAt), isNull(taskOccurrences.deletedAt), gte(taskOccurrences.scheduledDate, from), lte(taskOccurrences.scheduledDate, to)))
        .orderBy(asc(taskOccurrences.scheduledDate), asc(taskOccurrences.scheduledTime)).all().map((row) => row.occurrence);
      const series = new Set(recurrences.map((rule) => rule.taskId));
      const byId = new Map(activeTasks.map((task) => [task.id, task]));
      const items: TaskListItem[] = activeTasks.filter((task) => !series.has(task.id)).map((task) => ({ key: task.id, task, occurrence: null }));
      for (const occurrence of occurrences) items.push({ key: occurrence.id, task: byId.get(occurrence.taskId)!, occurrence });
      return {
        tasks: activeTasks, recurrences, occurrences, items,
        categories: db.select().from(taskCategories).where(isNull(taskCategories.deletedAt))
          .orderBy(desc(taskCategories.isDefault), asc(taskCategories.name)).all(),
      };
    },

    createTask(draft: TaskDraft) {
      const { recurrence, ...values } = taskValues(draft);
      const timestamp = now();
      const id = newId();
      db.transaction((query) => {
        query.insert(tasks).values({ ...values, id, createdAt: timestamp, updatedAt: timestamp }).run();
        if (recurrence) insertRule(query, id, recurrence, values.date!, values.time, values.date!, timestamp);
      });
      return id;
    },

    editTask(id: string, draft: TaskDraft) {
      const task = activeTask(id);
      const { recurrence, ...values } = taskValues(draft);
      const timestamp = Math.max(now(), task.updatedAt + 1);
      db.transaction((query) => {
        replaceSchedule(query, task, recurrence, values.date, values.time, timestamp);
        query.update(tasks).set({ ...values, ...(recurrence ? { completedAt: null } : {}), updatedAt: timestamp })
          .where(and(eq(tasks.id, id), isNull(tasks.deletedAt))).run();
      });
    },

    stopRepeating(id: string) {
      const task = activeTask(id);
      if (!rulesForTask(id).length) throw new TaskValidationError('This task does not repeat.');
      const timestamp = Math.max(now(), task.updatedAt + 1);
      db.transaction((query) => {
        replaceSchedule(query, task, null, task.date, task.time, timestamp);
        query.update(tasks).set({ updatedAt: timestamp }).where(eq(tasks.id, id)).run();
      });
    },

    setOccurrenceStatus(id: string, status: OccurrenceStatus) {
      if (!['pending', 'completed', 'skipped'].includes(status)) throw new TaskValidationError('Choose a valid occurrence status.');
      const occurrence = db.select().from(taskOccurrences).where(and(eq(taskOccurrences.id, id), isNull(taskOccurrences.deletedAt))).get();
      if (!occurrence) throw new TaskValidationError('This occurrence is no longer available.');
      activeTask(occurrence.taskId);
      const timestamp = Math.max(now(), occurrence.updatedAt + 1);
      db.update(taskOccurrences).set({ status, completedAt: status === 'completed' ? timestamp : null, updatedAt: timestamp })
        .where(eq(taskOccurrences.id, id)).run();
      return db.select().from(taskOccurrences).where(eq(taskOccurrences.id, id)).get()!;
    },

    readHistory(id: string, before?: string) {
      activeTask(id);
      const rules = rulesForTask(id);
      if (!rules.length) throw new TaskValidationError('This task does not repeat.');
      const today = localDateString(new Date(now()));
      const to = before ? addDays(before, -1) : today;
      const oldest = rules.map((rule) => [rule.startDate, rule.effectiveFrom].sort()[1]).sort()[0];
      const from = [addDays(to, -occurrenceWindowDays + 1), oldest].sort()[1];
      db.transaction((query) => materialize(query, rules, from, to, now()));
      const range = and(gte(taskOccurrences.scheduledDate, from), lte(taskOccurrences.scheduledDate, to));
      const earlyOutcomes = !before ? and(gt(taskOccurrences.scheduledDate, today), ne(taskOccurrences.status, 'pending')) : undefined;
      const occurrences = db.select().from(taskOccurrences).where(and(eq(taskOccurrences.taskId, id),
        or(isNull(taskOccurrences.deletedAt), ne(taskOccurrences.status, 'pending')), earlyOutcomes ? or(range, earlyOutcomes) : range))
        .orderBy(desc(taskOccurrences.scheduledDate), desc(taskOccurrences.createdAt)).all();
      return { occurrences, nextBefore: from > oldest ? from : null };
    },

    setCompleted(id: string, completed: boolean) {
      const task = activeTask(id);
      if (rulesForTask(id).length) throw new TaskValidationError('Complete or reopen an individual occurrence instead.');
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
      const name = normalizeIdentityDisplayName(input);
      if (!name) throw new TaskValidationError('Enter a category name.');
      return db.transaction((query) => {
        const identity = canonicalIdentityName(name);
        const duplicate = query.select().from(taskCategories).where(isNull(taskCategories.deletedAt)).all()
          .some((category) => canonicalIdentityName(category.name) === identity);
        if (duplicate) throw new TaskValidationError('A category with that name already exists.');
        const timestamp = now();
        return query.insert(taskCategories).values({ id: newId(), name, isDefault: false, createdAt: timestamp,
          updatedAt: timestamp, deletedAt: null }).returning().get();
      }, { behavior: 'immediate' });
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

import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const taskCategories = sqliteTable('task_categories', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
}, (table) => [
  check('category_name_not_empty', sql`length(trim(${table.name})) > 0`),
  check('category_updated_after_created', sql`${table.updatedAt} >= ${table.createdAt}`),
  uniqueIndex('task_categories_active_name_unique')
    .on(sql`lower(${table.name})`)
    .where(sql`${table.deletedAt} IS NULL`),
]);

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey().notNull(),
  title: text('title').notNull(),
  description: text('description'),
  date: text('date'),
  time: text('time'),
  priority: text('priority', { enum: ['none', 'low', 'medium', 'high'] }).notNull().default('none'),
  categoryId: text('category_id').references(() => taskCategories.id, { onDelete: 'restrict' }),
  completedAt: integer('completed_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
}, (table) => [
  check('task_title_not_empty', sql`length(trim(${table.title})) > 0`),
  check('task_priority_valid', sql`${table.priority} IN ('none', 'low', 'medium', 'high')`),
  check('task_date_valid', sql`${table.date} IS NULL OR (
    ${table.date} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
    AND substr(${table.date}, 1, 4) >= '0001'
    AND coalesce(strftime('%Y-%m-%d', ${table.date}, '+0 days') = ${table.date}, 0)
  )`),
  check('task_time_valid', sql`${table.time} IS NULL OR (
    ${table.date} IS NOT NULL
    AND ${table.time} GLOB '[0-2][0-9]:[0-5][0-9]'
    AND substr(${table.time}, 1, 2) < '24'
  )`),
  check('task_updated_after_created', sql`${table.updatedAt} >= ${table.createdAt}`),
  index('tasks_active_date_idx').on(table.date).where(sql`${table.deletedAt} IS NULL`),
]);

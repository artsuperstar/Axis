/// <reference types="node" />

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { test } from 'node:test';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/expo-sqlite/driver';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import type { SQLiteDatabase } from 'expo-sqlite';

import * as schema from '../src/database/schema';
import { seedDefaultCategories } from '../src/database/seed';
import { createTaskDataAccess } from '../src/features/tasks/data';
import { localDateString, localTimeString, taskDraft, TaskValidationError, validateTaskDraft } from '../src/features/tasks/form';
import { categoryName, groupTasks } from '../src/features/tasks/grouping';

const migrationDirectory = join(process.cwd(), 'src/database/migrations');
const journal = JSON.parse(readFileSync(join(migrationDirectory, 'meta/_journal.json'), 'utf8'));
const bundledMigrations = {
  journal,
  migrations: Object.fromEntries(journal.entries.map((entry: { idx: number; tag: string }) => [
    `m${String(entry.idx).padStart(4, '0')}`,
    readFileSync(join(migrationDirectory, `${entry.tag}.sql`), 'utf8'),
  ])),
};

// Adapt only the Expo statement boundary. Migrations, Drizzle, feature queries, and SQLite are real.
function database(filename = ':memory:') {
  const sqlite = new DatabaseSync(filename);
  sqlite.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  const client = {
    prepareSync(query: string) {
      const statement = sqlite.prepare(query);
      return {
        executeSync(params: SQLInputValue[]) {
          if (statement.columns().length) {
            const rows = statement.all(...params);
            return { getAllSync: () => rows, getFirstSync: () => rows[0], changes: 0, lastInsertRowId: 0 };
          }
          const result = statement.run(...params);
          return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
        },
        executeForRawResultSync(params: SQLInputValue[]) {
          statement.setReturnArrays(true);
          const rows = statement.all(...params);
          return { getAllSync: () => rows };
        },
      };
    },
  } as unknown as SQLiteDatabase;
  return { sqlite, db: drizzle(client, { schema }) };
}

async function initialized(filename = ':memory:') {
  const result = database(filename);
  await migrate(result.db, bundledMigrations);
  seedDefaultCategories(result.db, 1000);
  return { ...result, access: createTaskDataAccess(result.db, randomUUID, () => 2000) };
}

test('migrations and default seeding are idempotent and preserve category identity and timestamps', async (t) => {
  const { sqlite, db, access } = await initialized();
  t.after(() => sqlite.close());
  const first = access.read().categories;
  assert.deepEqual(first.map((category) => category.name).sort(), ['Finance', 'Health', 'Personal', 'Shopping', 'Study', 'Work']);
  assert.ok(first.every((category) => category.isDefault));
  await migrate(db, bundledMigrations);
  seedDefaultCategories(db, 5000);
  assert.deepEqual(access.read().categories, first);
  assert.equal(sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()?.count, journal.entries.length);

  db.update(schema.taskCategories).set({ deletedAt: 6000, updatedAt: 6000 }).where(eq(schema.taskCategories.id, first[0].id)).run();
  seedDefaultCategories(db, 7000);
  assert.equal(access.read().categories.length, 5, 'seeding must not resurrect tombstones');
});

test('task create, edit, complete/reopen, and soft deletion persist across a connection restart', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'axis-tasks-test-'));
  const filename = join(directory, 'axis.db');
  let current = await initialized(filename);
  try {
    const id = current.access.createTask({ ...taskDraft(), title: '  Buy toothpaste  ' });
    const original = current.access.read().tasks[0];
    assert.equal(original.title, 'Buy toothpaste');
    assert.match(id, /^[0-9a-f-]{36}$/);
    assert.equal(original.priority, 'none');
    assert.equal(original.date, null);
    assert.equal(original.time, null);
    assert.equal(original.description, null);
    assert.equal(original.categoryId, null);
    assert.equal(categoryName(original, current.access.read().categories), null);
    assert.equal(original.completedAt, null);

    current.sqlite.close();
    current = await initialized(filename);
    assert.deepEqual(current.access.read().tasks[0], original);
    const category = current.access.read().categories[0];
    current.access.editTask(id, { title: 'Toothpaste and floss', description: '  Pharmacy  ', date: '2026-10-10', time: '18:30', priority: 'high', categoryId: category.id });
    const edited = current.access.read().tasks[0];
    assert.equal(edited.createdAt, original.createdAt);
    assert.ok(edited.updatedAt > original.updatedAt);
    assert.equal(edited.title, 'Toothpaste and floss');
    assert.equal(edited.description, 'Pharmacy');
    assert.equal(edited.date, '2026-10-10');
    assert.equal(edited.time, '18:30');
    assert.equal(edited.priority, 'high');
    assert.equal(edited.categoryId, category.id);
    assert.equal(categoryName(edited, current.access.read().categories), category.name);
    current.access.setCompleted(id, true);
    const completed = current.access.read().tasks[0];
    assert.ok(completed.completedAt !== null);
    assert.ok(completed.updatedAt > edited.updatedAt);
    current.access.editTask(id, { ...taskDraft(completed), description: '' });
    assert.equal(current.access.read().tasks[0].completedAt, completed.completedAt);
    current.access.setCompleted(id, false);
    assert.equal(current.access.read().tasks[0].completedAt, null);
    current.access.deleteTask(id);
    assert.equal(current.access.read().tasks.length, 0);
    const tombstone = current.db.select().from(schema.tasks).where(eq(schema.tasks.id, id)).get();
    assert.ok(tombstone);
    assert.equal(typeof tombstone.deletedAt, 'number');
    assert.throws(() => current.access.editTask(id, taskDraft(original)), TaskValidationError);
    current.sqlite.close();
    current = await initialized(filename);
    assert.equal(current.access.read().tasks.length, 0);
    assert.equal(current.db.select().from(schema.tasks).all().length, 1);
  } finally {
    current.sqlite.close();
    unlinkSync(filename);
    rmdirSync(directory);
  }
});

test('custom-category deletion preserves task references and allows a new category with the same name', async (t) => {
  const { sqlite, db, access } = await initialized();
  t.after(() => sqlite.close());
  const category = access.createCategory('  Pet   care  ');
  assert.equal(category.name, 'Pet care');
  assert.equal(category.isDefault, false);
  assert.throws(() => access.createCategory('pet care'), /already exists/);
  const id = access.createTask({ ...taskDraft(), title: 'Buy food', categoryId: category.id });
  access.deleteCategory(category.id);
  const snapshot = access.read();
  const task = snapshot.tasks.find((item) => item.id === id)!;
  assert.equal(task.categoryId, category.id);
  assert.equal(categoryName(task, snapshot.categories), null);
  const deletedCategory = db.select().from(schema.taskCategories).where(eq(schema.taskCategories.id, category.id)).get();
  assert.ok(deletedCategory);
  assert.equal(typeof deletedCategory.deletedAt, 'number');
  assert.equal(categoryName(task, [deletedCategory]), null);
  assert.throws(() => access.createTask({ ...taskDraft(), title: 'Old category', categoryId: category.id }), /no longer available/);
  const replacement = access.createCategory('Pet care');
  assert.notEqual(replacement.id, category.id);
  assert.equal(categoryName(task, access.read().categories), null);
  assert.throws(() => access.deleteCategory(snapshot.categories.find((item) => item.isDefault)!.id), /cannot be deleted/);
  assert.throws(() => sqlite.prepare('DELETE FROM task_categories WHERE id = ?').run(category.id), /FOREIGN KEY/);
});

test('validation enforces title, civil dates, times, and the four priorities', () => {
  for (const change of [
    { title: '  ' },
    { date: '2026-02-30' },
    { date: '1900-02-29' },
    { date: '2026-13-01' },
    { date: '2026-1-01' },
    { date: '0000-01-01' },
    { time: '18:30' },
    { date: '2026-10-10', time: '24:00' },
    { date: '2026-10-10', time: '12:60' },
  ]) {
    assert.throws(() => validateTaskDraft({ ...taskDraft(), title: 'Valid title', ...change }), TaskValidationError);
  }
  assert.throws(() => validateTaskDraft({ ...taskDraft(), title: 'Task', priority: 'urgent' as never }), TaskValidationError);
  assert.equal(validateTaskDraft({ ...taskDraft(), title: 'Leap day', date: '2028-02-29' }).time, null);
  assert.equal(validateTaskDraft({ ...taskDraft(), title: 'Leap century', date: '2000-02-29' }).date, '2000-02-29');
  for (const priority of ['none', 'low', 'medium', 'high'] as const) {
    assert.equal(validateTaskDraft({ ...taskDraft(), title: 'Task', priority }).priority, priority);
  }
  const local = new Date(2026, 9, 10, 18, 30);
  assert.equal(localDateString(local), '2026-10-10');
  assert.equal(localTimeString(local), '18:30');
});

test('SQLite constraints also reject invalid records and missing category references', async (t) => {
  const { sqlite } = await initialized();
  t.after(() => sqlite.close());
  const insert = sqlite.prepare('INSERT INTO tasks (id, title, date, time, priority, category_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, 1)');
  assert.throws(() => insert.run(randomUUID(), ' ', null, null, 'none', null), /CHECK/);
  assert.throws(() => insert.run(randomUUID(), 'Task', null, '09:00', 'none', null), /CHECK/);
  assert.throws(() => insert.run(randomUUID(), 'Task', '2026-02-30', null, 'none', null), /CHECK/);
  assert.throws(() => insert.run(randomUUID(), 'Task', '2026-10-10', '24:00', 'none', null), /CHECK/);
  assert.throws(() => insert.run(randomUUID(), 'Task', null, null, 'urgent', null), /CHECK/);
  assert.throws(() => insert.run(randomUUID(), 'Task', null, null, 'none', 'missing'), /FOREIGN KEY/);
});

test('all incomplete dates remain visible, completed tasks group separately, and tombstones stay hidden', async (t) => {
  const { sqlite, access } = await initialized();
  t.after(() => sqlite.close());
  for (const [title, date] of [['Earlier', '2026-10-01'], ['Today', '2026-10-02'], ['Upcoming', '2026-10-03'], ['No date', '']] as const) {
    access.createTask({ ...taskDraft(), title, date });
  }
  const done = access.createTask({ ...taskDraft(), title: 'Completed', date: '2026-10-01' });
  access.setCompleted(done, true);
  const deleted = access.createTask({ ...taskDraft(), title: 'Deleted' });
  access.deleteTask(deleted);
  const sections = groupTasks(access.read().tasks, '2026-10-02');
  assert.deepEqual(sections.map((section) => section.title), ['Earlier', 'Today', 'Upcoming', 'No date', 'Completed']);
  assert.ok(sections.every((section) => section.data.length === 1));
});

test('a failed migration rolls back schema changes and can be retried safely', async (t) => {
  const { sqlite, db } = database();
  t.after(() => sqlite.close());
  const broken = { ...bundledMigrations, migrations: { m0000: `${bundledMigrations.migrations.m0000}\n--> statement-breakpoint\nINVALID SQL;` } };
  await assert.rejects(migrate(db, broken));
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM sqlite_master WHERE name IN ('tasks', 'task_categories')").get()?.count, 0);
  await migrate(db, bundledMigrations);
  seedDefaultCategories(db);
  assert.equal(db.select().from(schema.taskCategories).all().length, 6);
});

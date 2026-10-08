import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { createTaskDataAccess } from '../src/features/tasks/data';
import { taskDraft } from '../src/features/tasks/form';
import { pickerValue } from '../src/utils/calendar';
import { bundledMigrations as allMigrations, database } from './helpers/database';

// Assert this index-only migration independently of later additive schema changes.
const journal = { ...allMigrations.journal, entries: allMigrations.journal.entries.slice(0, 9) };
const bundledMigrations = { ...allMigrations, journal };

test('date index migration is additive, preserves data, rolls back on failure and retries idempotently', async (t) => {
  const f = database(); t.after(() => f.sqlite.close());
  const previous = { ...bundledMigrations, journal: { ...journal, entries: journal.entries.slice(0, 8) } };
  await migrate(f.db, previous);
  const tasks = createTaskDataAccess(f.db, randomUUID, () => pickerValue('2026-10-05').getTime());
  tasks.createTask({ ...taskDraft(), title: 'Existing task', date: '2026-10-05', recurrence: {
    frequency: 'daily', interval: 1, weekdayMask: 0, monthDay: 5, month: 10, endDate: '' } });
  const tables = f.sqlite.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name != '__drizzle_migrations' ORDER BY name").all();
  const data = () => tables.map(({ name }) => f.sqlite.prepare(`SELECT * FROM "${String(name).replaceAll('"', '""')}" ORDER BY rowid`).all());
  const range = { from: '2026-10-01', to: '2026-10-05' };
  const queries = () => f.measure(() => tasks.readRange(range)).statements.filter((row) => row.sql.startsWith('select') && row.sql.includes('"task_occurrences"'));
  const oldQueries = queries();
  const before = data();
  const oldPlans = oldQueries.map((query) => f.sqlite.prepare(`EXPLAIN QUERY PLAN ${query.sql}`).all(...query.params));
  assert.ok(oldPlans.every((plans) => plans.some((row) => String(row.detail).startsWith('SCAN task_occurrences'))));
  const broken = { ...bundledMigrations, migrations: { ...bundledMigrations.migrations,
    m0008: `${bundledMigrations.migrations.m0008}\n--> statement-breakpoint\nINVALID SQL;` } };
  await assert.rejects(migrate(f.db, broken));
  assert.equal(f.sqlite.prepare("SELECT count(*) AS count FROM sqlite_master WHERE name = 'task_occurrences_date_idx'").get()!.count, 0);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()!.count, 8);
  assert.deepEqual(data(), before);
  await migrate(f.db, bundledMigrations);
  assert.deepEqual(data(), before);
  assert.deepEqual(f.sqlite.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name != '__drizzle_migrations' ORDER BY name").all(), tables);
  for (const query of queries()) {
    const plans = f.sqlite.prepare(`EXPLAIN QUERY PLAN ${query.sql}`).all(...query.params);
    assert.ok(plans.some((row) => /SEARCH task_occurrences USING INDEX task_occurrences_date_idx/.test(String(row.detail))));
  }
  await migrate(f.db, bundledMigrations);
  // Also safe if a pre-created index exists before the migration journal was written.
  f.sqlite.exec(bundledMigrations.migrations.m0008);
  assert.deepEqual(data(), before);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()!.count, 9);
  assert.equal(f.sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []);
});

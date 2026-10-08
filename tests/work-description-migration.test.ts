/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { bundledMigrations, database, journal } from './helpers/database';

async function populated() {
  const f = database();
  await migrate(f.db, { ...bundledMigrations, journal: { ...journal, entries: journal.entries.slice(0, 10) } });
  f.sqlite.exec(`
    INSERT INTO work_counterparties VALUES ('client', 'Álvaro', 1, 2, 2);
    INSERT INTO work_entries (id, counterparty_id, title, description, compensation_type, work_date, fixed_amount_minor, expected_payment_date, created_at, updated_at)
      VALUES ('fixed', 'client', 'Logo Design', '  Café\nOriginal details  ', 'fixed', '2025-01-01', 100000, '2025-01-02', 1, 2);
    INSERT INTO work_entries (id, counterparty_id, title, description, compensation_type, work_date, duration_minutes, hourly_rate_minor, created_at, updated_at, deleted_at)
      VALUES ('hourly', 'client', NULL, 'Legacy description', 'hourly', '2025-01-02', 150, 5000, 1, 2, 2);
    INSERT INTO finance_transactions (id, type, amount_minor, description, transaction_date, created_at, updated_at)
      VALUES ('receipt', 'income', 40000, 'Historic receipt', '2025-01-03', 1, 2);
    INSERT INTO finance_transactions (id, type, amount_minor, description, transaction_date, created_at, updated_at, deleted_at)
      VALUES ('undone', 'income', 5000, 'Undone receipt', '2025-01-04', 1, 2, 2);
    INSERT INTO work_payment_allocations (id, work_entry_id, finance_transaction_id, amount_minor, created_at)
      VALUES ('allocation', 'fixed', 'receipt', 40000, 1);
    INSERT INTO work_payment_allocations (id, work_entry_id, finance_transaction_id, amount_minor, created_at, deleted_at)
      VALUES ('undone-allocation', 'hourly', 'undone', 5000, 1, 2);
  `);
  return f;
}
function facts(f: ReturnType<typeof database>) {
  return Object.fromEntries(['work_entries', 'work_counterparties', 'work_payment_allocations', 'finance_transactions'].map((table) => [table, f.sqlite.prepare(`SELECT * FROM ${table} ORDER BY id`).all()]));
}
function structure(f: ReturnType<typeof database>) {
  return {
    indexes: f.sqlite.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'index' ORDER BY name").all(),
    entryColumns: f.sqlite.prepare('PRAGMA table_info(work_entries)').all().map(({ cid: _cid, ...column }) => column).sort((a, b) => String(a.name).localeCompare(String(b.name))),
    entryFks: f.sqlite.prepare('PRAGMA foreign_key_list(work_entries)').all(),
    allocationColumns: f.sqlite.prepare('PRAGMA table_info(work_payment_allocations)').all(),
    allocationFks: f.sqlite.prepare('PRAGMA foreign_key_list(work_payment_allocations)').all(),
  };
}
function check(f: ReturnType<typeof database>) {
  assert.equal(f.sqlite.prepare('PRAGMA foreign_keys').get()!.foreign_keys, 1);
  assert.equal(f.sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []);
  assert.deepEqual(f.sqlite.prepare("SELECT name FROM sqlite_master WHERE name LIKE '__new_work%'").all(), []);
}
test('optional Description rebuild preserves every populated Work fact, indexes and foreign keys with enforcement enabled; retry is idempotent', async (t) => {
  const f = await populated(); t.after(() => f.sqlite.close()); const before = facts(f); const schema = structure(f);
  await migrate(f.db, bundledMigrations); await migrate(f.db, bundledMigrations);
  assert.deepEqual(facts(f), before); assert.deepEqual(structure(f), schema); check(f);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()!.count, journal.entries.length);
  f.sqlite.exec("UPDATE work_entries SET description = '' WHERE id = 'fixed'");
  assert.throws(() => f.sqlite.exec("UPDATE work_entries SET description = NULL WHERE id = 'fixed'"), /NOT NULL/);
  assert.throws(() => f.sqlite.exec("UPDATE work_entries SET fixed_amount_minor = -1 WHERE id = 'fixed'"), /CHECK/);
  assert.throws(() => f.sqlite.exec("UPDATE work_entries SET work_date = '2025-02-30' WHERE id = 'fixed'"), /CHECK/);
  assert.throws(() => f.sqlite.exec("UPDATE work_entries SET counterparty_id = 'missing' WHERE id = 'fixed'"), /FOREIGN KEY/);
  assert.throws(() => f.sqlite.exec("DELETE FROM work_entries WHERE id = 'fixed'"), /FOREIGN KEY/);
  check(f);
});
test('failure after dropping populated Work tables rolls back facts, constraints and migration bookkeeping; retry succeeds', async (t) => {
  const f = await populated(); t.after(() => f.sqlite.close()); const before = facts(f); const schema = structure(f);
  const original = f.sqlite.prepare("SELECT sql FROM sqlite_master WHERE name = 'work_entries'").get()!.sql;
  const broken = { ...bundledMigrations, migrations: { ...bundledMigrations.migrations,
    m0010: bundledMigrations.migrations.m0010.replace('ALTER TABLE `__new_work_entries`', 'INVALID SQL;--> statement-breakpoint\nALTER TABLE `__new_work_entries`') } };
  await assert.rejects(migrate(f.db, broken));
  assert.deepEqual(facts(f), before); assert.deepEqual(structure(f), schema); check(f);
  assert.equal(f.sqlite.prepare("SELECT sql FROM sqlite_master WHERE name = 'work_entries'").get()!.sql, original);
  assert.throws(() => f.sqlite.exec("UPDATE work_entries SET description = '' WHERE id = 'fixed'"), /CHECK/);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()!.count, 10);
  await migrate(f.db, bundledMigrations); assert.deepEqual(facts(f), before); check(f);
});

/// <reference types="node" />

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { createWorkDataAccess } from '../src/features/finance/work/data';
import { workDraft } from '../src/features/finance/work/form';
import { jobTitle } from '../src/features/finance/work/presentation';
import { pickerValue } from '../src/utils/calendar';
import { singleLineText } from '../src/utils/text-normalization';
import { bundledMigrations, database, journal } from './helpers/database';

const today = '2026-10-07';
const description = ('Inventory management software for warehouse stock control.\n' + 'Historical details remain intact. '.repeat(100)).trimEnd();
async function legacyDatabase() {
  const f = database();
  await migrate(f.db, { ...bundledMigrations, journal: { ...journal, entries: journal.entries.slice(0, 9) } });
  f.sqlite.prepare('INSERT INTO work_counterparties (id, name, created_at, updated_at, deleted_at) VALUES (?, ?, 1, 2, 2)').run('client', 'Historical client');
  f.sqlite.prepare('INSERT INTO work_entries (id, counterparty_id, description, compensation_type, work_date, fixed_amount_minor, expected_payment_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)')
    .run('legacy', 'client', description, 'fixed', '2025-01-01', 100000, '2025-01-02');
  f.sqlite.prepare('INSERT INTO finance_transactions (id, type, amount_minor, description, transaction_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, 1)')
    .run('receipt', 'income', 40000, 'Historical client', today);
  f.sqlite.prepare('INSERT INTO work_payment_allocations (id, work_entry_id, finance_transaction_id, amount_minor, created_at) VALUES (?, ?, ?, ?, 1)')
    .run('allocation', 'legacy', 'receipt', 40000);
  return f;
}
function facts(f: Awaited<ReturnType<typeof legacyDatabase>>) {
  return Object.fromEntries(['work_entries', 'work_counterparties', 'work_payment_allocations', 'finance_transactions'].map((table) => [table,
    f.sqlite.prepare(`SELECT * FROM ${table} ORDER BY id`).all().map((row) => { const { title: _title, ...original } = row; return original; })]));
}
test('additive Title upgrade preserves real pre-Title descriptions, archived clients, receipts and allocations; retry is idempotent', async (t) => {
  const f = await legacyDatabase(); t.after(() => f.sqlite.close()); const before = facts(f);
  const indexes = f.sqlite.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'index' ORDER BY name").all();
  await migrate(f.db, bundledMigrations); await migrate(f.db, bundledMigrations);
  assert.deepEqual(facts(f), before);
  assert.deepEqual(f.sqlite.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'index' ORDER BY name").all(), indexes);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()!.count, journal.entries.length);
  const access = createWorkDataAccess(f.db, randomUUID, () => pickerValue(today).getTime());
  const item = access.readDetail('legacy').items[0];
  assert.equal(item.entry.title, null); assert.equal(item.entry.description, description);
  assert.equal(jobTitle(item.entry), description);
  assert.equal(item.counterparty.deletedAt, 2); assert.equal(item.outstandingMinor, 60000); assert.equal(item.overdue, true);
  const draft = workDraft(item.entry, today); assert.equal(draft.title, singleLineText(description.trim())); assert.equal(draft.description, description);
  access.edit('legacy', { ...draft, title: 'Inventory Software' });
  const edited = access.readDetail('legacy'); assert.equal(edited.items[0].entry.title, 'Inventory Software');
  assert.equal(edited.items[0].entry.description, description.trim()); assert.deepEqual(edited.totals, { earnedMinor: 100000n, receivedMinor: 40000n, outstandingMinor: 60000n });
  assert.equal(jobTitle(edited.payments[0].allocations[0]), 'Inventory Software');
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []); assert.equal(f.sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
});
test('failed Title upgrade rolls back the column and preserves legacy facts before a successful retry', async (t) => {
  const f = await legacyDatabase(); t.after(() => f.sqlite.close()); const before = facts(f);
  const broken = { ...bundledMigrations, migrations: { ...bundledMigrations.migrations, m0009: bundledMigrations.migrations.m0009 + '\n--> statement-breakpoint\nINVALID SQL;' } };
  await assert.rejects(migrate(f.db, broken)); assert.deepEqual(facts(f), before);
  assert.ok(!f.sqlite.prepare('PRAGMA table_info(work_entries)').all().some((column) => column.name === 'title'));
  await migrate(f.db, bundledMigrations); assert.deepEqual(facts(f), before);
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []); assert.equal(f.sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
});

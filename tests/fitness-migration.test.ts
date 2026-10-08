/// <reference types="node" />

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { seedDefaultCategories } from '../src/database/seed';
import { createCalendarDataAccess } from '../src/features/calendar/data';
import { createCommitmentDataAccess } from '../src/features/finance/commitments/data';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import { createFinanceDataAccess } from '../src/features/finance/data';
import { transactionDraft } from '../src/features/finance/form';
import { periodBounds } from '../src/features/finance/periods';
import { seedFinanceCategories } from '../src/features/finance/seed';
import { createWorkDataAccess } from '../src/features/finance/work/data';
import { workDraft } from '../src/features/finance/work/form';
import { createFitnessDataAccess } from '../src/features/fitness/data';
import { seedFitnessExercises } from '../src/features/fitness/seed';
import { createTaskDataAccess } from '../src/features/tasks/data';
import { taskDraft } from '../src/features/tasks/form';
import { pickerValue } from '../src/utils/calendar';
import { bundledMigrations as allMigrations, database } from './helpers/database';

// These suites isolate earlier feature migrations. Current Work APIs need the title column;
// real pre-Title upgrade/rollback/data retention is covered separately in work-title-migration.test.ts.
const journal = { ...allMigrations.journal, entries: allMigrations.journal.entries.slice(0, 9) };
const bundledMigrations = { ...allMigrations, journal };

const today = '2026-10-04'; const now = () => pickerValue(today).getTime();
async function existingStage9() {
  const result = database(); const { db, sqlite } = result;
  await migrate(db, { ...bundledMigrations, journal: { ...journal, entries: journal.entries.slice(0, 5) } });
  sqlite.exec(allMigrations.migrations.m0009);
  seedDefaultCategories(db, 1000); seedFinanceCategories(db, 1000);
  const tasks = createTaskDataAccess(db, randomUUID, now); const finance = createFinanceDataAccess(db, randomUUID, now);
  const commitments = createCommitmentDataAccess(db, randomUUID, now); const work = createWorkDataAccess(db, randomUUID, now);
  tasks.createTask({ ...taskDraft(), title: 'Existing one-time', date: today });
  tasks.createTask({ ...taskDraft(), title: 'Existing recurrence', date: '2026-09-28', recurrence: {
    frequency: 'weekly', interval: 1, weekdayMask: 1 | 4 | 16, monthDay: 28, month: 9, endDate: '',
  } });
  tasks.setOccurrenceStatus(tasks.read().occurrences[0].id, 'skipped');
  const category = finance.createCategory('Historical Pets', 'expense');
  finance.createTransaction({ ...transactionDraft(null, pickerValue(today)), description: 'Existing expense', amount: '50', categoryId: category.id });
  finance.createTransaction({ ...transactionDraft(null, pickerValue(today)), description: 'Existing income', type: 'income', amount: '500' });
  const commitmentId = commitments.create({ ...commitmentDraft(null, undefined, today), title: 'Existing bill', amount: '180',
    firstDueDate: '2025-08-03', categoryId: category.id });
  const commitment = commitments.read().items.find((item) => item.commitment.id === commitmentId)!;
  commitments.pay(commitment.outstanding[0], '170', today); commitments.skip(commitment.outstanding[1]);
  commitments.pause(commitmentId); commitments.resume(commitmentId, '2026-10-20'); finance.deleteCategory(category.id);
  const client = work.createCounterparty('Historical client');
  const workId = work.create({ ...workDraft(null, today), title: 'Website', description: 'Website', counterpartyId: client.id,
    compensationType: 'fixed', fixedAmount: '1000', expectedPaymentDate: today });
  work.recordPayment({ counterpartyId: client.id, allocations: [{ workEntryId: workId, amount: '400' }], paymentDate: today, categoryId: null });
  work.archiveCounterparty(client.id);
  const calendar = createCalendarDataAccess(db, randomUUID, now);
  const range = { from: '2026-10-01', to: '2026-10-31' }; const agenda = calendar.readRange(range);
  const analytics = finance.readDashboard(periodBounds('month', today)).analytics; const workBefore = work.read();
  const oldTables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations' ORDER BY name")
    .all().map((row) => String(row.name));
  const snapshot = () => Object.fromEntries(oldTables.map((table) => [table, sqlite.prepare(`SELECT * FROM ${table} ORDER BY id`).all()]));
  const before = snapshot();
  const definitions = sqlite.prepare("SELECT name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations' ORDER BY name").all();
  return { ...result, snapshot, before, definitions, calendar, range, agenda, finance, analytics, work, workBefore };
}

test('Stage 10 migration preserves every previous table/index, domain fact, dashboard and Calendar projection', async (t) => {
  const { sqlite, db, snapshot, before, definitions, calendar, range, agenda, finance, analytics, work, workBefore } = await existingStage9();
  t.after(() => sqlite.close());
  assert.equal(Object.keys(before).length, 12); assert.ok(Object.values(before).every((rows) => rows.length > 0));
  await migrate(db, bundledMigrations); seedFitnessExercises(db);
  assert.deepEqual(snapshot(), before);
  assert.deepEqual(finance.readDashboard(periodBounds('month', today)).analytics, analytics);
  assert.deepEqual(work.read(), workBefore); assert.deepEqual(calendar.readRange(range), agenda);
  const after = sqlite.prepare("SELECT name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all();
  for (const old of definitions) assert.deepEqual(after.find((row) => row.name === old.name), old);
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM sqlite_master WHERE type = 'table' AND name LIKE 'fitness_%'").get()!.count, 6);
  const fitness = createFitnessDataAccess(db, randomUUID, now);
  assert.equal(fitness.read().exercises.length, 14); assert.equal(fitness.read().history.length, 0);
  const started = fitness.startWorkout(); fitness.finishWorkout(started.id);
  assert.deepEqual(calendar.readRange(range), agenda);
  await migrate(db, bundledMigrations); seedFitnessExercises(db);
  assert.equal(sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()!.count, journal.entries.length);
  assert.deepEqual(snapshot(), before);
  assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), []);
  assert.equal(sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
});

test('failed Stage 10 migration rolls back new Fitness objects and preserves prior data before safe retry', async (t) => {
  const { sqlite, db, snapshot, before } = await existingStage9(); t.after(() => sqlite.close());
  const broken = { ...bundledMigrations, migrations: { ...bundledMigrations.migrations,
    m0005: `${bundledMigrations.migrations.m0005}\n--> statement-breakpoint\nINVALID SQL;` } };
  await assert.rejects(migrate(db, broken));
  assert.deepEqual(snapshot(), before); assert.equal(sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()!.count, 5);
  assert.equal(sqlite.prepare("SELECT count(*) AS count FROM sqlite_master WHERE name LIKE 'fitness_%'").get()!.count, 0);
  await migrate(db, bundledMigrations); seedFitnessExercises(db);
  assert.equal(createFitnessDataAccess(db, randomUUID, now).read().exercises.length, 14);
  assert.deepEqual(snapshot(), before); assert.equal(sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()!.count, journal.entries.length);
  assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), []);
  assert.equal(sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
});

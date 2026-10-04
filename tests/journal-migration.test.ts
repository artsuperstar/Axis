/// <reference types="node" />

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
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
import { blankSet, blankTargets } from '../src/features/fitness/form';
import { seedFitnessExercises } from '../src/features/fitness/seed';
import { createHomeDataAccess } from '../src/features/home/data';
import { createJournalDataAccess } from '../src/features/journal/data';
import { createTaskDataAccess } from '../src/features/tasks/data';
import { taskDraft } from '../src/features/tasks/form';
import { pickerValue } from '../src/utils/calendar';
import { bundledMigrations, database, journal } from './helpers/database';

const today = '2026-10-04'; const now = () => pickerValue(today).getTime();
async function existingStage11() {
  const result = database(); const { db, sqlite } = result;
  await migrate(db, { ...bundledMigrations, journal: { ...journal, entries: journal.entries.slice(0, 6) } });
  seedDefaultCategories(db, 1000); seedFinanceCategories(db, 1000); seedFitnessExercises(db);
  const tasks = createTaskDataAccess(db, randomUUID, now); const finance = createFinanceDataAccess(db, randomUUID, now);
  const commitments = createCommitmentDataAccess(db, randomUUID, now); const work = createWorkDataAccess(db, randomUUID, now);
  const fitness = createFitnessDataAccess(db, randomUUID, now);
  tasks.createTask({ ...taskDraft(), title: 'Existing one-time', date: today });
  const recurring = tasks.createTask({ ...taskDraft(), title: 'Existing recurrence', date: '2026-10-01', recurrence: {
    frequency: 'daily', interval: 1, weekdayMask: 0, monthDay: 1, month: 10, endDate: '',
  } });
  tasks.setOccurrenceStatus(tasks.read().occurrences.find((row) => row.taskId === recurring && row.scheduledDate === today)!.id, 'completed');
  const category = finance.createCategory('Historical Pets', 'expense');
  finance.createTransaction({ ...transactionDraft(null, pickerValue(today)), description: 'Expense', amount: '50', categoryId: category.id });
  finance.createTransaction({ ...transactionDraft(null, pickerValue(today)), description: 'Income', type: 'income', amount: '500' });
  const commitmentId = commitments.create({ ...commitmentDraft(null, undefined, today), title: 'Existing bill', amount: '180',
    firstDueDate: '2025-08-03', categoryId: category.id });
  const commitment = commitments.read().items.find((item) => item.commitment.id === commitmentId)!;
  commitments.pay(commitment.outstanding[0], '170', today); commitments.skip(commitment.outstanding[1]);
  commitments.pause(commitmentId); commitments.resume(commitmentId, '2026-10-20'); finance.deleteCategory(category.id);
  const client = work.createCounterparty('Historical client');
  const workId = work.create({ ...workDraft(null, today), description: 'Website', counterpartyId: client.id,
    compensationType: 'fixed', fixedAmount: '1000', expectedPaymentDate: today });
  work.recordPayment({ counterpartyId: client.id, allocations: [{ workEntryId: workId, amount: '400' }], paymentDate: today, categoryId: null });
  work.archiveCounterparty(client.id);
  const exercise = fitness.createExercise({ name: 'Existing stretch', measurementType: 'duration' });
  const routine = fitness.createRoutine({ name: 'Existing routine', exercises: [{ id: null, exerciseId: exercise.id, targets: blankTargets() }] });
  const completed = fitness.startWorkout(routine).id; const row = fitness.readSession(completed).exercises[0];
  fitness.addSet(row.id, { ...blankSet(), minutes: '3' }); fitness.finishWorkout(completed); fitness.startWorkout();
  fitness.archiveRoutine(routine); fitness.archiveExercise(exercise.id);
  const calendar = createCalendarDataAccess(db, randomUUID, now); const home = createHomeDataAccess(db, randomUUID, now);
  const range = { from: '2026-10-01', to: '2026-10-31' }; const agenda = calendar.readRange(range); const homeBefore = home.read();
  const analytics = finance.readDashboard(periodBounds('month', today)).analytics;
  const workBefore = work.read(); const fitnessBefore = fitness.read();
  const oldTables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations' ORDER BY name")
    .all().map((row) => String(row.name));
  const snapshot = () => Object.fromEntries(oldTables.map((table) => [table, sqlite.prepare(`SELECT * FROM "${table}" ORDER BY id`).all()]));
  const before = snapshot();
  const definitions = sqlite.prepare("SELECT name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations' ORDER BY name").all();
  return { ...result, snapshot, before, definitions, calendar, range, agenda, home, homeBefore, finance, analytics, work, workBefore, fitness, fitnessBefore };
}

test('additive Journal migration preserves all 18 prior tables, indexes, data and Calendar/Home/Finance/Work/Fitness projections', async (t) => {
  const f = await existingStage11(); t.after(() => f.sqlite.close());
  assert.equal(Object.keys(f.before).length, 18); assert.ok(Object.values(f.before).every((rows) => rows.length > 0));
  await migrate(f.db, bundledMigrations);
  assert.deepEqual(f.snapshot(), f.before);
  const after = f.sqlite.prepare("SELECT name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all();
  for (const old of f.definitions) assert.deepEqual(after.find((row) => row.name === old.name), old);
  assert.deepEqual(f.calendar.readRange(f.range), f.agenda); assert.deepEqual(f.home.read(), f.homeBefore);
  assert.deepEqual(f.finance.readDashboard(periodBounds('month', today)).analytics, f.analytics);
  assert.deepEqual(f.work.read(), f.workBefore); assert.deepEqual(f.fitness.read(), f.fitnessBefore);
  const access = createJournalDataAccess(f.db, randomUUID, now); assert.deepEqual(access.listHistory().entries, []);
  const saved = access.save(today, { content: 'My first diary entry\nUnrelated to source data.', mood: 'good' })!;
  await migrate(f.db, bundledMigrations); assert.deepEqual(access.getEntry(today), saved); assert.deepEqual(f.snapshot(), f.before);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()!.count, journal.entries.length);
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []); assert.equal(f.sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
});

test('failed Journal migration rolls back the new table/index, preserves previous data and allows idempotent retry', async (t) => {
  const f = await existingStage11(); t.after(() => f.sqlite.close());
  const broken = { ...bundledMigrations, migrations: { ...bundledMigrations.migrations,
    m0006: `${bundledMigrations.migrations.m0006}\n--> statement-breakpoint\nINVALID SQL;` } };
  await assert.rejects(migrate(f.db, broken)); assert.deepEqual(f.snapshot(), f.before);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()!.count, 6);
  assert.equal(f.sqlite.prepare("SELECT count(*) AS count FROM sqlite_master WHERE name LIKE 'journal_%'").get()!.count, 0);
  await migrate(f.db, bundledMigrations); await migrate(f.db, bundledMigrations);
  assert.deepEqual(f.snapshot(), f.before); assert.equal(f.sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()!.count, journal.entries.length);
  assert.deepEqual(f.home.read(), f.homeBefore); assert.deepEqual(f.calendar.readRange(f.range), f.agenda);
  assert.equal(createJournalDataAccess(f.db, randomUUID, now).save(today, { content: 'Safe after retry', mood: null })!.content, 'Safe after retry');
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []); assert.equal(f.sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
});

test('runtime migration bundle includes the generated Journal migration and only creates new Journal objects', () => {
  const runtime = readFileSync('src/database/migrations/migrations.js', 'utf8');
  assert.match(runtime, /import m0006 from '.\/0006_journal_foundation.sql'/); assert.match(runtime, /migrations: \{[^}]*m0006/);
  const sql = bundledMigrations.migrations.m0006;
  assert.match(sql, /CREATE TABLE `journal_entries`/); assert.match(sql, /CREATE UNIQUE INDEX `journal_active_date_unique`/);
  assert.doesNotMatch(sql, /\b(ALTER|DROP|UPDATE|DELETE|INSERT)\b/i);
  assert.equal(journal.entries[6].tag, '0006_journal_foundation');
});

async function existingJournal() {
  const f = await existingStage11();
  await migrate(f.db, { ...bundledMigrations, journal: { ...journal, entries: journal.entries.slice(0, 7) } });
  const id = randomUUID();
  // Represent a device which already applied the original Stage 12 migration and saved writing.
  f.sqlite.prepare('INSERT INTO journal_entries (id, entry_date, content, mood, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, today, 'Existing Stage 12 diary\nKeep every character.', 'good', now(), now());
  const writing = f.sqlite.prepare('SELECT * FROM journal_entries ORDER BY id').all();
  const definitions = f.sqlite.prepare("SELECT name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations' ORDER BY name").all();
  return { ...f, writing, definitions };
}

test('draft migration upgrades a device with the original Stage 12 migration without changing saved writing or any prior data', async (t) => {
  const f = await existingJournal(); t.after(() => f.sqlite.close());
  await migrate(f.db, bundledMigrations);
  assert.deepEqual(f.snapshot(), f.before); assert.deepEqual(f.sqlite.prepare('SELECT * FROM journal_entries ORDER BY id').all(), f.writing);
  const after = f.sqlite.prepare("SELECT name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all();
  for (const previous of f.definitions) assert.deepEqual(after.find((row) => row.name === previous.name), previous);
  const access = createJournalDataAccess(f.db, randomUUID, now);
  const saved = access.getEntry(today)!; assert.equal(access.getDraft(today), null);
  const recovery = access.persistDraft(today, { content: 'New working draft', mood: 'low' }, saved);
  await migrate(f.db, bundledMigrations); assert.deepEqual(access.getDraft(today), recovery); assert.deepEqual(access.getEntry(today), saved);
  assert.deepEqual(f.home.read(), f.homeBefore); assert.deepEqual(f.calendar.readRange(f.range), f.agenda);
  assert.deepEqual(f.finance.readDashboard(periodBounds('month', today)).analytics, f.analytics);
  assert.deepEqual(f.work.read(), f.workBefore); assert.deepEqual(f.fitness.read(), f.fitnessBefore);
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []); assert.equal(f.sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
});

test('failed draft migration rolls back its new table, keeps original Journal/source data and safely retries', async (t) => {
  const f = await existingJournal(); t.after(() => f.sqlite.close());
  const broken = { ...bundledMigrations, migrations: { ...bundledMigrations.migrations,
    m0007: `${bundledMigrations.migrations.m0007}\n--> statement-breakpoint\nINVALID SQL;` } };
  await assert.rejects(migrate(f.db, broken));
  assert.deepEqual(f.snapshot(), f.before); assert.deepEqual(f.sqlite.prepare('SELECT * FROM journal_entries ORDER BY id').all(), f.writing);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()!.count, 7);
  assert.equal(f.sqlite.prepare("SELECT count(*) AS count FROM sqlite_master WHERE name = 'journal_drafts'").get()!.count, 0);
  await migrate(f.db, bundledMigrations); await migrate(f.db, bundledMigrations);
  assert.deepEqual(f.snapshot(), f.before); assert.deepEqual(f.sqlite.prepare('SELECT * FROM journal_entries ORDER BY id').all(), f.writing);
  const access = createJournalDataAccess(f.db, randomUUID, now);
  assert.ok(access.persistDraft(today, { content: 'Recovery works after retry', mood: null }, access.getEntry(today)));
  assert.equal(f.sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()!.count, journal.entries.length);
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []); assert.equal(f.sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
});

test('draft migration bundle/snapshot registration creates only a separate recovery table', () => {
  const runtime = readFileSync('src/database/migrations/migrations.js', 'utf8');
  assert.match(runtime, /import m0007 from '.\/0007_journal_drafts.sql'/); assert.match(runtime, /migrations: \{[^}]*m0007/);
  assert.match(bundledMigrations.migrations.m0007, /CREATE TABLE `journal_drafts`/);
  assert.doesNotMatch(bundledMigrations.migrations.m0007, /\b(ALTER|DROP|UPDATE|DELETE|INSERT)\b/i);
  assert.equal(journal.entries[7].tag, '0007_journal_drafts');
});

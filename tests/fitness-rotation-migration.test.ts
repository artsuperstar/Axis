/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { createFitnessDataAccess } from '../src/features/fitness/data';
import { blankTargets } from '../src/features/fitness/form';
import { createRotationDataAccess } from '../src/features/fitness/rotations-data';
import { seedFitnessExercises } from '../src/features/fitness/seed';
import { bundledMigrations as allMigrations, database } from './helpers/database';

// Keep this upgrade test pinned to the rotation migration; later set changes have their own coverage.
const bundledMigrations = { ...allMigrations, journal: { ...allMigrations.journal, entries: allMigrations.journal.entries.slice(0, 12) } };

async function previous() {
  const f = database(); await migrate(f.db, { ...bundledMigrations, journal: { ...bundledMigrations.journal, entries: bundledMigrations.journal.entries.slice(0, 11) } });
  seedFitnessExercises(f.db);
  const now = () => new Date(2026, 9, 9, 12).getTime(); const access = createFitnessDataAccess(f.db, randomUUID, now);
  const exercise = access.createExercise({ name: 'Historical custom exercise', measurementType: 'strength' });
  const routineId = access.createRoutine({ name: 'Historical routine', exercises: [{ id: null, exerciseId: exercise.id, targets: { ...blankTargets(), setCount: '3' } }] });
  // Populate the genuine previous schema explicitly: current session APIs require the new migration.
  f.sqlite.prepare('INSERT INTO fitness_workout_sessions (id, routine_id, name, started_at, completed_at, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run('completed', routineId, 'Historical snapshot', now() - 10000, now() - 100, 'Keep workout note', now() - 10000, now() - 100);
  f.sqlite.prepare('INSERT INTO fitness_workout_sessions (id, name, started_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run('active', 'Active free workout', now(), now(), now());
  f.sqlite.prepare('INSERT INTO fitness_session_exercises (id, session_id, exercise_id, exercise_name, measurement_type, position, note, target_set_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run('snapshot-exercise', 'completed', exercise.id, 'Historical exercise snapshot', 'strength', 0, 'Keep exercise note', 3, now() - 10000, now() - 10000);
  f.sqlite.prepare('INSERT INTO fitness_sets (id, session_exercise_id, measurement_type, position, weight_grams, reps, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run('historical-set', 'snapshot-exercise', 'strength', 0, 12500, 8, now() - 10000, now() - 10000);
  const tables = f.sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations' ORDER BY name").all().map((row) => String(row.name));
  const columns = new Map(tables.map((name) => [name, f.sqlite.prepare(`PRAGMA table_info("${name}")`).all().map((column) => `"${column.name}"`).join(', ')]));
  const snapshot = () => Object.fromEntries(tables.map((name) => [name, f.sqlite.prepare(`SELECT ${columns.get(name)} FROM "${name}" ORDER BY 1`).all()]));
  return { ...f, now, routineId, snapshot, before: snapshot() };
}

test('rotation migration additively upgrades populated previous Fitness data and preserves active/history snapshots, sets and notes', async (t) => {
  const f = await previous(); t.after(() => f.sqlite.close());
  await migrate(f.db, bundledMigrations); assert.deepEqual(f.snapshot(), f.before);
  // Later completion column is required by current session APIs; its upgrade is tested separately.
  f.sqlite.exec(allMigrations.migrations.m0013);
  const fitness = createFitnessDataAccess(f.db, randomUUID, f.now); const rotations = createRotationDataAccess(f.db, randomUUID, f.now);
  assert.equal(fitness.readOverview().active!.id, 'active');
  assert.equal(fitness.readSession('completed').exercises[0].sets[0].weightGrams, 12500);
  assert.equal(fitness.readSession('completed').exercises[0].exerciseName, 'Historical exercise snapshot');
  assert.equal(fitness.readSession('completed').note, 'Keep workout note');
  assert.equal(fitness.readSession('active').rotationId, null); assert.equal(fitness.readSession('completed').rotationStepId, null);
  assert.equal(fitness.readRoutine(f.routineId).exercises.length, 1); assert.equal(rotations.readNext(), null); assert.deepEqual(rotations.read(), []);
  fitness.discardWorkout('active');
  const id = rotations.create({ name: 'Optional rotation', steps: [{ id: null, routineId: f.routineId }] }); rotations.activate(id);
  fitness.finishWorkout(fitness.startWorkout(f.routineId).id);
  await migrate(f.db, bundledMigrations); await migrate(f.db, bundledMigrations);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM __drizzle_migrations').get()!.n, 12);
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []); assert.equal(f.sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
});

test('failed rotation migration rolls back tables, session columns, indexes and triggers without changing previous data, then retries safely', async (t) => {
  const f = await previous(); t.after(() => f.sqlite.close());
  await assert.rejects(migrate(f.db, { ...bundledMigrations, migrations: { ...bundledMigrations.migrations,
    m0011: `${bundledMigrations.migrations.m0011}\n--> statement-breakpoint\nINVALID SQL;` } }));
  assert.deepEqual(f.snapshot(), f.before); assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM __drizzle_migrations').get()!.n, 11);
  assert.ok(!f.sqlite.prepare('PRAGMA table_info(fitness_workout_sessions)').all().some((column) => column.name === 'rotation_id'));
  assert.equal(f.sqlite.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name IN ('fitness_rotations','fitness_rotation_steps','fitness_session_rotation_insert')").get()!.n, 0);
  await migrate(f.db, bundledMigrations); await migrate(f.db, bundledMigrations); assert.deepEqual(f.snapshot(), f.before);
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []); assert.equal(f.sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
});

test('rotation migration is registered after head 0010, additive without session rebuilds, and represented in the Drizzle snapshot', () => {
  const migration = bundledMigrations.migrations.m0011; const runtime = readFileSync('src/database/migrations/migrations.js', 'utf8');
  assert.equal(bundledMigrations.journal.entries[11].tag, '0011_fitness_rotations');
  assert.match(runtime, /import m0011 from '.\/0011_fitness_rotations.sql'/); assert.match(runtime, /migrations: \{[^}]*m0011/);
  assert.match(migration, /ALTER TABLE `fitness_workout_sessions` ADD `rotation_id`/); assert.doesNotMatch(migration, /\b(DROP TABLE|DELETE FROM|UPDATE fitness_workout_sessions|INSERT INTO fitness_workout_sessions)\b/i);
  const snapshot = JSON.parse(readFileSync('src/database/migrations/meta/0011_snapshot.json', 'utf8'));
  assert.ok(snapshot.tables.fitness_rotations); assert.ok(snapshot.tables.fitness_rotation_steps);
  assert.ok(snapshot.tables.fitness_workout_sessions.columns.rotation_step_id);
});

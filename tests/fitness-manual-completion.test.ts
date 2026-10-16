/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, type TestContext } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { createFitnessDataAccess } from '../src/features/fitness/data';
import { blankSet, blankTargets } from '../src/features/fitness/form';
import { seedFitnessExercises } from '../src/features/fitness/seed';
import { exerciseProgress, workoutProgress } from '../src/features/fitness/workout-presentation';
import { bundledMigrations, database } from './helpers/database';

function integrity(f: ReturnType<typeof database>) {
  assert.equal(f.sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []);
  assert.equal(f.sqlite.prepare('PRAGMA foreign_keys').get()!.foreign_keys, 1);
}
async function fixture(t: TestContext) {
  const f = database(); t.after(() => f.sqlite.close()); await migrate(f.db, bundledMigrations); seedFitnessExercises(f.db);
  const access = createFitnessDataAccess(f.db, randomUUID); const session = access.startWorkout();
  const source = access.readOverview().exercises[0]; const id = access.addSessionExercise(session.id, source.id);
  return { ...f, access, session, source, id, row: () => access.readSession(session.id).exercises[0] };
}

test('targetless manual completion is explicit, idempotent and independent of zero or many sets; reopening preserves every logged value', async (t) => {
  const f = await fixture(t); assert.equal(f.row().isManuallyComplete, false); assert.equal(f.row().targetSetCount, null);
  f.access.setExerciseCompleted(f.id, true); assert.equal(f.row().sets.length, 0);
  assert.equal(workoutProgress(f.access.readSession(f.session.id)).percentage, 100);
  const completed = f.row(); f.access.setExerciseCompleted(f.id, true); assert.deepEqual(f.row(), completed);
  for (let i = 0; i < 3; i++) f.access.addSet(f.id, blankSet());
  const first = f.row().sets[0]; f.access.editSet(first.id, { ...blankSet(), weight: '25', reps: '10' });
  assert.equal(f.row().isManuallyComplete, true); f.access.editSet(first.id, blankSet());
  f.access.deleteSet(f.row().sets[1].id); assert.equal(f.row().isManuallyComplete, true);
  const before = f.row().sets; f.access.setExerciseCompleted(f.id, false);
  assert.deepEqual(f.row().sets, before); assert.equal(f.row().isManuallyComplete, false);
  for (let i = 0; i < 3; i++) f.access.addSet(f.id, blankSet());
  assert.equal(workoutProgress(f.access.readSession(f.session.id)).percentage, 0);
  f.access.setExerciseCompleted(f.id, true); assert.equal(workoutProgress(f.access.readSession(f.session.id)).percentage, 100);
  integrity(f);
});

test('targeted completion remains automatic, ignores manual flags and falls below target after deletion', async (t) => {
  const f = await fixture(t); f.access.discardWorkout(f.session.id);
  const routine = f.access.createRoutine({ name: 'Targeted', exercises: [{ id: null, exerciseId: f.source.id, targets: { ...blankTargets(), setCount: '2' } }] });
  const session = f.access.startWorkout(routine); const row = () => f.access.readSession(session.id).exercises[0];
  assert.equal(exerciseProgress(1, 2, true).complete, false); assert.equal(exerciseProgress(2, 2).complete, true);
  for (const state of [true, false]) assert.throws(() => f.access.setExerciseCompleted(row().id, state), /automatically/);
  const first = f.access.addSet(row().id, blankSet()); assert.equal(workoutProgress(f.access.readSession(session.id)).completed, 0);
  const second = f.access.addSet(row().id, blankSet()); f.access.addSet(row().id, blankSet());
  assert.equal(workoutProgress(f.access.readSession(session.id)).percentage, 100);
  f.access.deleteSet(first); f.access.deleteSet(second); assert.equal(workoutProgress(f.access.readSession(session.id)).completed, 0);
  integrity(f);
});

test('completion mutation validates state and rolls back child and parent updates together; completed/deleted sessions remain immutable', async (t) => {
  const f = await fixture(t); const before = f.row();
  assert.throws(() => f.access.setExerciseCompleted(f.id, 1 as unknown as boolean), /valid exercise completion/);
  f.sqlite.exec("CREATE TRIGGER fail_touch BEFORE UPDATE ON fitness_workout_sessions BEGIN SELECT RAISE(ABORT, 'Injected parent failure'); END");
  assert.throws(() => f.access.setExerciseCompleted(f.id, true), /Injected parent failure/); assert.deepEqual(f.row(), before);
  f.sqlite.exec('DROP TRIGGER fail_touch'); f.access.setExerciseCompleted(f.id, true);
  f.access.finishWorkout(f.session.id); assert.equal(f.access.readSession(f.session.id).exercises[0].isManuallyComplete, true);
  assert.throws(() => f.access.setExerciseCompleted(f.id, false), /read-only/);
  const next = f.access.startWorkout(); const id = f.access.addSessionExercise(next.id, f.source.id);
  f.access.removeSessionExercise(id); assert.throws(() => f.access.setExerciseCompleted(id, true), /no longer available/);
  const other = f.access.addSessionExercise(next.id, f.source.id); f.access.discardWorkout(next.id);
  assert.throws(() => f.access.setExerciseCompleted(other, true), /no longer available/); integrity(f);
});

test('manual completion survives closing/reopening the SQLite file and remains a read-only historical fact', async (t) => {
  const filename = join(tmpdir(), `axis-manual-completion-${randomUUID()}.sqlite`); let f = database(filename);
  t.after(() => { f.sqlite.close(); for (const path of [filename, `${filename}-wal`, `${filename}-shm`]) if (existsSync(path)) unlinkSync(path); });
  await migrate(f.db, bundledMigrations); seedFitnessExercises(f.db); let access = createFitnessDataAccess(f.db, randomUUID);
  const session = access.startWorkout(); const id = access.addSessionExercise(session.id, access.readOverview().exercises[0].id);
  access.addSet(id, blankSet()); access.setExerciseCompleted(id, true); f.sqlite.close();
  f = database(filename); await migrate(f.db, bundledMigrations); access = createFitnessDataAccess(f.db, randomUUID);
  assert.equal(access.startWorkout().id, session.id); assert.equal(access.readSession(session.id).exercises[0].isManuallyComplete, true);
  access.setExerciseCompleted(id, false); assert.equal(access.readSession(session.id).exercises[0].sets.length, 1);
  access.setExerciseCompleted(id, true); access.finishWorkout(session.id); f.sqlite.close();
  f = database(filename); await migrate(f.db, bundledMigrations); access = createFitnessDataAccess(f.db, randomUUID);
  assert.equal(access.readSession(session.id).exercises[0].isManuallyComplete, true);
  assert.equal(access.readHistory().history[0].id, session.id); assert.throws(() => access.setExerciseCompleted(id, false), /read-only/); integrity(f);
});

async function legacyFixture() {
  const f = database(); await migrate(f.db, { ...bundledMigrations, journal: { ...bundledMigrations.journal, entries: bundledMigrations.journal.entries.slice(0, 13) } });
  seedFitnessExercises(f.db); const source = f.sqlite.prepare('SELECT id,name FROM fitness_exercises WHERE measurement_type=? LIMIT 1').get('strength')!;
  for (const id of ['active', 'historical']) {
    f.sqlite.prepare('INSERT INTO fitness_workout_sessions (id,name,started_at,completed_at,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?)')
      .run(id, `${id} workout`, 1000, id === 'active' ? null : 2000, 'Keep workout note', 1000, 2000);
    f.sqlite.prepare('INSERT INTO fitness_session_exercises (id,session_id,exercise_id,exercise_name,measurement_type,position,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(`${id}-exercise`, id, source.id, source.name, 'strength', 0, 'Keep exercise note', 1000, 2000);
    f.sqlite.prepare('INSERT INTO fitness_sets (id,session_exercise_id,measurement_type,position,weight_grams,reps,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)')
      .run(`${id}-set`, `${id}-exercise`, 'strength', 0, 25000, 10, 1000, 2000);
  }
  const tables = f.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name!='__drizzle_migrations' ORDER BY name").all();
  const columns = new Map(tables.map(({ name }) => [String(name), f.sqlite.prepare(`PRAGMA table_info("${name}")`).all().map((row) => `"${row.name}"`).join(',')]));
  const snapshot = () => Object.fromEntries([...columns].map(([name, columns]) => [name, f.sqlite.prepare(`SELECT ${columns} FROM "${name}" ORDER BY rowid`).all()]));
  return { ...f, snapshot, before: snapshot() };
}

test('0013 upgrades real existing active/history data additively, defaults incomplete and retries without duplication or FK loss', async (t) => {
  const f = await legacyFixture(); t.after(() => f.sqlite.close());
  const oldIndexes = f.sqlite.prepare("SELECT name,sql FROM sqlite_master WHERE type IN ('index','trigger') ORDER BY name").all();
  await migrate(f.db, bundledMigrations); assert.deepEqual(f.snapshot(), f.before);
  assert.deepEqual(f.sqlite.prepare("SELECT name,sql FROM sqlite_master WHERE type IN ('index','trigger') ORDER BY name").all(), oldIndexes);
  const access = createFitnessDataAccess(f.db, randomUUID);
  for (const id of ['active', 'historical']) assert.equal(access.readSession(id).exercises[0].isManuallyComplete, false);
  access.setExerciseCompleted('active-exercise', true); const afterCompletion = f.snapshot();
  await migrate(f.db, bundledMigrations); await migrate(f.db, bundledMigrations);
  assert.equal(access.readSession('active').exercises[0].isManuallyComplete, true); assert.deepEqual(f.snapshot(), afterCompletion);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()!.count, 14);
  assert.throws(() => f.sqlite.exec('UPDATE fitness_session_exercises SET is_manually_complete=2'), /CHECK/);
  assert.throws(() => f.sqlite.exec("UPDATE fitness_session_exercises SET session_id='missing' WHERE id='active-exercise'"), /FOREIGN KEY/); integrity(f);
});

test('failure after adding the completion column rolls back schema/data/ledger, then recovers through the normal migrator', async (t) => {
  const f = await legacyFixture(); t.after(() => f.sqlite.close());
  const schema = f.sqlite.prepare("SELECT name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all();
  const broken = { ...bundledMigrations, migrations: { ...bundledMigrations.migrations,
    m0013: `${bundledMigrations.migrations.m0013}\n--> statement-breakpoint\nINVALID SQL;` } };
  await assert.rejects(migrate(f.db, broken)); assert.deepEqual(f.snapshot(), f.before);
  assert.deepEqual(f.sqlite.prepare("SELECT name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all(), schema);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()!.count, 13); integrity(f);
  await migrate(f.db, bundledMigrations); await migrate(f.db, bundledMigrations); assert.deepEqual(f.snapshot(), f.before); integrity(f);
});

test('0013 is registered and its generated snapshot contains only the new completion column/check', () => {
  const sql = bundledMigrations.migrations.m0013; assert.match(sql, /ALTER TABLE.*ADD COLUMN.*is_manually_complete/);
  assert.doesNotMatch(sql, /DROP TABLE|DELETE FROM|foreign_keys\s*=\s*OFF/i);
  const previous = JSON.parse(readFileSync('src/database/migrations/meta/0012_snapshot.json', 'utf8'));
  const current = JSON.parse(readFileSync('src/database/migrations/meta/0013_snapshot.json', 'utf8'));
  assert.equal(current.prevId, previous.id); assert.equal(bundledMigrations.journal.entries[13].tag, '0013_fitness_manual_completion');
  const table = current.tables.fitness_session_exercises; assert.equal(table.columns.is_manually_complete.notNull, true);
  assert.equal(table.columns.is_manually_complete.default, false); assert.ok(table.checkConstraints.fitness_session_exercise_manual_complete_valid);
  delete table.columns.is_manually_complete; delete table.checkConstraints.fitness_session_exercise_manual_complete_valid;
  assert.deepEqual(current.tables, previous.tables); assert.match(readFileSync('src/database/migrations/migrations.js', 'utf8'), /import m0013 from '.\/0013_fitness_manual_completion.sql'/);
});

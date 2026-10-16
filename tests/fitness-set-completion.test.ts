/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { createFitnessDataAccess } from '../src/features/fitness/data';
import { blankSet, blankTargets, setDraft, setLabel, validateSet } from '../src/features/fitness/form';
import { seedFitnessExercises } from '../src/features/fitness/seed';
import { exerciseProgress, workoutSetCells, workoutSetColumns, workoutSetPresentation } from '../src/features/fitness/workout-presentation';
import { bundledMigrations as allMigrations, database } from './helpers/database';

// Isolate migration 0012; the later column is a prerequisite for current API fixtures.
// Genuine pre-0013 upgrades are covered in fitness-manual-completion.test.ts.
const bundledMigrations = { ...allMigrations, journal: { ...allMigrations.journal, entries: allMigrations.journal.entries.slice(0, 13) } };
const types = ['strength', 'bodyweight', 'duration', 'distance'] as const;
const nullValues = { weightGrams: null, reps: null, durationSeconds: null, distanceMeters: null };
const populated = { strength: { weight: '12.5', reps: '8' }, bodyweight: { reps: '10' }, duration: { seconds: '45' }, distance: { distance: '2.5', minutes: '12' } };
function integrity(f: ReturnType<typeof database>) {
  assert.equal(f.sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []);
  assert.equal(f.sqlite.prepare('PRAGMA foreign_keys').get()!.foreign_keys, 1);
}
function facts(f: ReturnType<typeof database>) {
  const names = f.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations' ORDER BY name").all();
  return Object.fromEntries(names.map(({ name }) => [String(name), f.sqlite.prepare(`SELECT * FROM "${String(name)}" ORDER BY rowid`).all()]));
}

for (const type of types) test(`${type}: empty completion persists nulls, supports partial details and clear/edit/delete without changing its identity`, async (t) => {
  const f = database(); t.after(() => f.sqlite.close()); await migrate(f.db, allMigrations); seedFitnessExercises(f.db);
  const access = createFitnessDataAccess(f.db, randomUUID); const session = access.startWorkout();
  const source = access.readOverview().exercises.find((row) => row.measurementType === type)!;
  const id = access.addSessionExercise(session.id, source.id);
  assert.deepEqual(validateSet(type, blankSet()), nullValues);
  const setId = access.addSet(id, blankSet()); let row = access.readSession(session.id).exercises[0].sets[0];
  assert.equal(row.id, setId); assert.deepEqual(validateSet(type, setDraft(row)), nullValues);
  assert.ok(workoutSetCells(row, workoutSetColumns(type, [row])).every((value) => value === '—'));
  assert.equal(workoutSetPresentation(row).spoken, 'Set complete. No performance details'); assert.ok(setLabel(row).includes('—'));
  access.editSet(setId, { ...blankSet(), ...populated[type] }); row = access.readSession(session.id).exercises[0].sets[0];
  assert.equal(row.id, setId); assert.equal(access.readOverview().active!.setCount, 1);
  access.editSet(setId, blankSet()); assert.deepEqual(setDraft(access.readSession(session.id).exercises[0].sets[0]), blankSet());
  const second = access.addSet(id, blankSet()); assert.notEqual(second, setId);
  assert.deepEqual(access.readSession(session.id).exercises[0].sets.map((set) => set.position), [0, 1]);
  access.deleteSet(setId); assert.equal(access.readOverview().active!.setCount, 1);
  access.finishWorkout(session.id); const history = access.readSession(session.id);
  assert.equal(history.exercises[0].sets[0].id, second); assert.equal(access.readHistory().history[0].setCount, 1);
  assert.throws(() => access.addSet(id, blankSet()), /read-only/); assert.throws(() => access.editSet(second, blankSet()), /read-only/);
  integrity(f);
});

test('partial details are optional; supplied zero/negative/irrelevant/overflow values keep measurement rules', () => {
  assert.equal(validateSet('strength', { ...blankSet(), weight: '0' }).weightGrams, 0);
  assert.equal(validateSet('strength', { ...blankSet(), reps: '8' }).reps, 8);
  assert.equal(validateSet('bodyweight', { ...blankSet(), weight: '10' }).weightGrams, 10000);
  assert.equal(validateSet('distance', { ...blankSet(), seconds: '30' }).durationSeconds, 30);
  for (const type of types) {
    const invalid = type === 'strength' || type === 'bodyweight' ? { reps: '0' } : type === 'duration' ? { seconds: '60' } : { distance: '-1' };
    assert.throws(() => validateSet(type, { ...blankSet(), ...invalid }));
  }
  assert.throws(() => validateSet('duration', { ...blankSet(), weight: '1' }));
  assert.throws(() => validateSet('strength', { ...blankSet(), reps: '9007199254740992' }));
  assert.deepEqual(exerciseProgress(0, 3), { complete: false, ratio: 0, label: '0 of 3 sets completed' });
  assert.deepEqual(exerciseProgress(4, 3), { complete: true, ratio: 1, label: '4 of 3 sets completed' });
  assert.deepEqual(exerciseProgress(1, null), { complete: false, ratio: 0, label: '1 set completed' });
});

async function legacyFixture() {
  const f = database();
  await migrate(f.db, { ...bundledMigrations, journal: { ...bundledMigrations.journal, entries: bundledMigrations.journal.entries.slice(0, 12) } });
  f.sqlite.exec(allMigrations.migrations.m0013);
  seedFitnessExercises(f.db); const access = createFitnessDataAccess(f.db, randomUUID);
  const source = access.readOverview().exercises;
  const routine = access.createRoutine({ name: 'Preserve history', exercises: types.map((type) => ({ id: null,
    exerciseId: source.find((row) => row.measurementType === type)!.id, targets: { ...blankTargets(), setCount: '3' } })) });
  for (let iteration = 0; iteration < 2; iteration++) {
    const session = access.startWorkout(routine);
    for (const exercise of access.readSession(session.id).exercises) access.addSet(exercise.id, { ...blankSet(), ...populated[exercise.measurementType] });
    access.saveNote(session.id, null, 'Preserve my note');
    if (iteration === 0) access.finishWorkout(session.id);
    else {
      const row = access.readSession(session.id).exercises[0]; const removed = access.addSet(row.id, { ...blankSet(), ...populated.strength }); access.deleteSet(removed);
    }
  }
  return { ...f, access };
}

test('set constraint migration preserves every stored row, FK/index/lifecycle and History; repeated initialization is idempotent', async (t) => {
  const f = await legacyFixture(); t.after(() => f.sqlite.close()); const before = facts(f);
  await migrate(f.db, bundledMigrations); assert.deepEqual(facts(f), before); integrity(f);
  await migrate(f.db, bundledMigrations); assert.deepEqual(facts(f), before);
  const active = f.access.readOverview().active!; const entry = f.access.readSession(active.id).exercises[0];
  const first = f.access.addSet(entry.id, blankSet()); const second = f.access.addSet(entry.id, blankSet());
  assert.notEqual(first, second); assert.equal(f.access.readHistory().history[0].setCount, 4);
  assert.throws(() => f.sqlite.exec(`UPDATE fitness_sets SET reps=0 WHERE id='${first}'`), /CHECK/);
  assert.throws(() => f.sqlite.exec(`UPDATE fitness_sets SET duration_seconds=1 WHERE id='${first}'`), /CHECK/);
  assert.throws(() => f.sqlite.exec(`UPDATE fitness_sets SET session_exercise_id='missing' WHERE id='${first}'`), /FOREIGN KEY/);
  assert.throws(() => f.sqlite.exec(`UPDATE fitness_sets SET position=(SELECT position FROM fitness_sets WHERE id='${second}') WHERE id='${first}'`), /UNIQUE/);
  assert.throws(() => f.sqlite.exec(`UPDATE fitness_sets SET updated_at=0 WHERE id='${first}'`), /CHECK/);
  const restarted = createFitnessDataAccess(f.db, randomUUID);
  assert.equal(restarted.readSession(active.id).exercises[0].sets.at(-1)!.id, second); integrity(f);
});

test('failure after dropping the old set table rolls back records, constraints and migration ledger; retry succeeds', async (t) => {
  const f = await legacyFixture(); t.after(() => f.sqlite.close()); const before = facts(f);
  const schema = f.sqlite.prepare("SELECT name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all();
  const failed = { ...bundledMigrations, migrations: { ...bundledMigrations.migrations,
    m0012: bundledMigrations.migrations.m0012.replace('ALTER TABLE `__new_fitness_sets`', 'INVALID SQL;--> statement-breakpoint\nALTER TABLE `__new_fitness_sets`') } };
  await assert.rejects(migrate(f.db, failed)); assert.deepEqual(facts(f), before);
  assert.deepEqual(f.sqlite.prepare("SELECT name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all(), schema);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()!.count, 12); integrity(f);
  const entry = f.access.readSession(f.access.readOverview().active!.id).exercises[0];
  assert.throws(() => f.access.addSet(entry.id, blankSet()), /CHECK/);
  await migrate(f.db, bundledMigrations); assert.deepEqual(facts(f), before); f.access.addSet(entry.id, blankSet()); integrity(f);
});

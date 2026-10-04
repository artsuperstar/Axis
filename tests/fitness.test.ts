/// <reference types="node" />

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import * as schema from '../src/database/schema';
import { createFitnessDataAccess } from '../src/features/fitness/data';
import { blankSet, blankTargets, distanceLabel, durationLabel, exerciseResults, formatThousandths, normalizeName,
  parseDistance, parseDuration, parseInteger, parseThousandths, setDraft, setLabel, targetDraft, validateSet, validateTargets } from '../src/features/fitness/form';
import { builtInExercises, seedFitnessExercises } from '../src/features/fitness/seed';
import type { MeasurementType, RoutineDraft, SetDraft, TargetDraft } from '../src/features/fitness/types';
import { bundledMigrations, database } from './helpers/database';

const now = () => new Date(2026, 9, 4, 18, 30).getTime();
async function initialized(filename?: string) {
  const result = database(filename); await migrate(result.db, bundledMigrations); seedFitnessExercises(result.db);
  return { ...result, fitness: createFitnessDataAccess(result.db, randomUUID, now) };
}
const draft = (values: Partial<SetDraft>): SetDraft => ({ ...blankSet(), ...values });
const targets = (values: Partial<TargetDraft> = {}): TargetDraft => ({ ...blankTargets(), ...values });
const plan = (ids: string[], name = 'Upper Body'): RoutineDraft => ({ name, exercises: ids.map((exerciseId) => ({ id: null, exerciseId, targets: targets() })) });
const builtIn = (type: MeasurementType) => builtInExercises.find((exercise) => exercise.measurementType === type)!.id;

test('Fitness seeds a modest library with stable IDs, all four types, lifecycle fields and idempotency', async (t) => {
  const { sqlite, db, fitness } = await initialized(); t.after(() => sqlite.close());
  const before = fitness.read().exercises; seedFitnessExercises(db); seedFitnessExercises(db);
  assert.deepEqual(fitness.read().exercises, before); assert.equal(before.length, 14);
  assert.deepEqual(new Set(before.map((exercise) => exercise.measurementType)), new Set(['strength', 'bodyweight', 'duration', 'distance']));
  assert.ok(before.every((exercise) => exercise.isBuiltIn && exercise.deletedAt === null && exercise.createdAt === exercise.updatedAt));
  assert.deepEqual(before.map((exercise) => exercise.id).sort(), builtInExercises.map((exercise) => exercise.id).sort());
  assert.throws(() => fitness.archiveExercise(before[0].id), /Built-in/);
});

test('custom exercise names are normalized, active duplicates rejected, and measurement types validated', async (t) => {
  const { sqlite, fitness } = await initialized(); t.after(() => sqlite.close());
  assert.throws(() => normalizeName(' \n '), /name/);
  assert.throws(() => fitness.createExercise({ name: 'a'.repeat(121), measurementType: 'strength' }), /name/);
  assert.throws(() => fitness.createExercise({ name: 'Invalid', measurementType: 'calories' as MeasurementType }), /measurement/);
  const exercise = fitness.createExercise({ name: '  Cable   Row ', measurementType: 'strength' });
  assert.equal(exercise.name, 'Cable Row'); assert.equal(exercise.isBuiltIn, false); assert.match(exercise.id, /^[\da-f-]{36}$/i);
  assert.throws(() => fitness.createExercise({ name: 'cable row', measurementType: 'distance' }), /already exists/);
  assert.throws(() => fitness.createExercise({ name: ' bench press ', measurementType: 'strength' }), /already exists/);
  fitness.archiveExercise(exercise.id); fitness.archiveExercise(exercise.id);
  const replacement = fitness.createExercise({ name: 'Cable Row', measurementType: 'bodyweight' });
  assert.notEqual(replacement.id, exercise.id);
});

test('exercise autocomplete searches built-ins/customs, excludes archived choices and suggests richer creation', async (t) => {
  const { sqlite, fitness } = await initialized(); t.after(() => sqlite.close());
  const custom = fitness.createExercise({ name: 'Custom Bench', measurementType: 'strength' });
  assert.deepEqual(exerciseResults(fitness.read().exercises, 'BEN').suggestions.map((option) => option.label), ['Bench Press', 'Custom Bench']);
  fitness.archiveExercise(custom.id);
  assert.deepEqual(exerciseResults(fitness.read().exercises, 'ben').suggestions.map((option) => option.label), ['Bench Press']);
  assert.equal(exerciseResults(fitness.read().exercises, 'Bench Press').createLabel, undefined);
  assert.equal(exerciseResults(fitness.read().exercises, ' New   Row ').createLabel, '+ Create “New Row”');
});

test('weights and km parse exactly with decimals/comma, including the safe integer boundary', () => {
  assert.equal(parseThousandths('12.5', 'Weight'), 12500); assert.equal(parseThousandths('0,001', 'Weight'), 1);
  assert.equal(parseThousandths('9007199254740.991', 'Weight'), Number.MAX_SAFE_INTEGER);
  assert.equal(formatThousandths(Number.MAX_SAFE_INTEGER), '9007199254740.991');
  assert.equal(parseDistance('2.5', 'km'), 2500); assert.equal(parseDistance('2500', 'm'), 2500);
  assert.equal(parseDistance('0.001', 'km'), 1);
  for (const bad of ['', '-1', '1e3', 'NaN', 'Infinity', '1,000.1', '.5', '1.', '1.2345', '9007199254740.992']) {
    assert.throws(() => parseThousandths(bad, 'Weight'));
  }
  assert.throws(() => parseDistance('2.5', 'm')); assert.throws(() => parseDistance('0', 'km'));
  assert.throws(() => parseDistance('1', 'mi' as 'km'));
});

test('reps/duration reject invalid values, excessive seconds and overflow without float conversion', () => {
  assert.equal(parseInteger('10', 'Reps'), 10); assert.equal(parseInteger(String(Number.MAX_SAFE_INTEGER), 'Reps'), Number.MAX_SAFE_INTEGER);
  for (const bad of ['0', '-1', '2.5', '1e2', '', '9007199254740992']) assert.throws(() => parseInteger(bad, 'Reps'));
  assert.equal(parseDuration('1', '30'), 90); assert.equal(parseDuration('', '45'), 45); assert.equal(parseDuration('', '', true), null);
  assert.equal(parseDuration('150119987579016', '31'), Number.MAX_SAFE_INTEGER);
  for (const [minutes, seconds] of [['', ''], ['0', '0'], ['0', '60'], ['-1', '0'], ['1.5', '0'], ['150119987579016', '32']]) assert.throws(() => parseDuration(minutes, seconds));
});

test('sets have type-specific authoritative values and irrelevant fields are rejected', () => {
  assert.deepEqual(validateSet('strength', draft({ weight: '12,5', reps: '10' })), { weightGrams: 12500, reps: 10, durationSeconds: null, distanceMeters: null });
  assert.equal(validateSet('strength', draft({ weight: '0', reps: '1' })).weightGrams, 0);
  assert.deepEqual(validateSet('bodyweight', draft({ reps: '8' })), { weightGrams: null, reps: 8, durationSeconds: null, distanceMeters: null });
  assert.equal(validateSet('bodyweight', draft({ reps: '8', weight: '10' })).weightGrams, 10000);
  assert.throws(() => validateSet('bodyweight', draft({ reps: '8', weight: '0' })));
  assert.deepEqual(validateSet('duration', draft({ minutes: '1', seconds: '30' })), { weightGrams: null, reps: null, durationSeconds: 90, distanceMeters: null });
  assert.deepEqual(validateSet('distance', draft({ distance: '2.5' })), { weightGrams: null, reps: null, durationSeconds: null, distanceMeters: 2500 });
  assert.equal(validateSet('distance', draft({ distance: '2.5', minutes: '12', seconds: '5' })).durationSeconds, 725);
  assert.throws(() => validateSet('duration', draft({ reps: '1', seconds: '30' })), /do not apply/);
  assert.throws(() => validateSet('distance', draft({ weight: '1', distance: '2' })), /do not apply/);
  assert.throws(() => validateSet('strength', draft({ weight: '1', reps: '1', seconds: '10' })), /do not apply/);
});

test('routine targets allow only measurement-appropriate values and validate count/ranges', () => {
  assert.deepEqual(validateTargets('strength', targets()), { targetSetCount: null, targetRepMin: null, targetRepMax: null, targetDurationSeconds: null, targetDistanceMeters: null });
  assert.equal(validateTargets('bodyweight', targets({ setCount: '3', repMin: '8', repMax: '12' })).targetRepMax, 12);
  assert.equal(validateTargets('duration', targets({ setCount: '3', minutes: '1', seconds: '30' })).targetDurationSeconds, 90);
  assert.equal(validateTargets('distance', targets({ distance: '2.5' })).targetDistanceMeters, 2500);
  for (const count of ['0', '101', '1.5']) assert.throws(() => validateTargets('strength', targets({ setCount: count })));
  assert.throws(() => validateTargets('strength', targets({ repMin: '10', repMax: '8' })), /Maximum/);
  assert.throws(() => validateTargets('strength', targets({ repMin: '10' })), /whole number/);
  assert.throws(() => validateTargets('duration', targets({ repMin: '1', repMax: '2' })), /do not apply/);
  assert.throws(() => validateTargets('distance', targets({ minutes: '1' })), /do not apply/);
});

test('routine CRUD preserves entry identities while reordering/removing/adding and renaming', async (t) => {
  const { sqlite, fitness } = await initialized(); t.after(() => sqlite.close());
  const id = fitness.createRoutine(plan([builtIn('strength'), builtIn('bodyweight'), builtIn('duration')]));
  const before = fitness.readRoutine(id);
  fitness.editRoutine(id, { name: '  New   Upper ', exercises: [...[before.exercises[2], before.exercises[0]].map((entry) => ({
    id: entry.id, exerciseId: entry.exerciseId, targets: targets({ setCount: '3' }),
  })), { id: null, exerciseId: builtIn('distance'), targets: targets({ distance: '2.5' }) }] });
  const after = fitness.readRoutine(id);
  assert.equal(after.name, 'New Upper'); assert.deepEqual(after.exercises.map((entry) => entry.position), [0, 1, 2]);
  assert.deepEqual(after.exercises.slice(0, 2).map((entry) => entry.id), [before.exercises[2].id, before.exercises[0].id]);
  assert.equal(after.exercises[0].targetSetCount, 3); assert.equal(after.exercises[2].targetDistanceMeters, 2500);
  assert.notEqual(after.exercises[2].id, before.exercises[1].id);
  assert.notEqual(sqlite.prepare('SELECT deleted_at FROM fitness_routine_exercises WHERE id = ?').get(before.exercises[1].id)!.deleted_at, null);
  assert.throws(() => fitness.createRoutine(plan([], 'new upper')), /already exists/);
});

test('routine edits validate retained identities and roll back all changes on an invalid target', async (t) => {
  const { sqlite, fitness } = await initialized(); t.after(() => sqlite.close());
  const id = fitness.createRoutine(plan([builtIn('strength')])); const before = fitness.readRoutine(id); const entry = before.exercises[0];
  assert.throws(() => fitness.editRoutine(id, { name: 'Changed', exercises: [{ id: entry.id, exerciseId: builtIn('duration'), targets: targets() }] }), /invalid/);
  assert.throws(() => fitness.editRoutine(id, { name: 'Changed', exercises: [{ id: entry.id, exerciseId: entry.exerciseId, targets: targets({ setCount: '0' }) }] }));
  assert.throws(() => fitness.editRoutine(id, { name: 'Changed', exercises: [entry, entry].map((entry) => ({ id: entry.id, exerciseId: entry.exerciseId, targets: targets() })) }), /invalid/);
  assert.deepEqual(fitness.readRoutine(id), before);
});

test('archived exercises retain routine references but cannot be newly selected or initialized in a new workout', async (t) => {
  const { sqlite, fitness } = await initialized(); t.after(() => sqlite.close());
  const exercise = fitness.createExercise({ name: 'Custom Row', measurementType: 'strength' }); const id = fitness.createRoutine(plan([exercise.id]));
  const entry = fitness.readRoutine(id).exercises[0]; fitness.archiveExercise(exercise.id);
  assert.equal(fitness.readRoutine(id).exercises[0].exercise.name, 'Custom Row');
  fitness.editRoutine(id, { name: 'Keep archived reference', exercises: [{ id: entry.id, exerciseId: exercise.id, targets: targets() }] });
  assert.throws(() => fitness.createRoutine(plan([exercise.id], 'New')), /active exercise/);
  const session = fitness.startWorkout(id);
  assert.equal(fitness.readSession(session.id).exercises.length, 0);
  assert.throws(() => fitness.addSessionExercise(session.id, exercise.id), /active exercise/);
  assert.equal(fitness.readRoutine(id).exercises[0].exerciseId, exercise.id);
});

test('starting from a routine snapshots name, exercise names/types/order/targets and creates no invalid empty sets', async (t) => {
  const { sqlite, fitness } = await initialized(); t.after(() => sqlite.close());
  const routine = plan([builtIn('strength'), builtIn('duration')]); routine.exercises[0].targets = targets({ setCount: '3', repMin: '8', repMax: '12' });
  routine.exercises[1].targets = targets({ seconds: '45' }); const id = fitness.createRoutine(routine);
  const started = fitness.startWorkout(id); const session = fitness.readSession(started.id);
  assert.equal(started.resumed, false); assert.equal(session.name, 'Upper Body'); assert.equal(session.routineId, id); assert.equal(session.completedAt, null);
  assert.deepEqual(session.exercises.map((entry) => entry.exerciseName), ['Bench Press', 'Plank']);
  assert.deepEqual(session.exercises.map((entry) => entry.measurementType), ['strength', 'duration']);
  assert.equal(session.exercises[0].targetSetCount, 3); assert.equal(session.exercises[0].targetRepMin, 8); assert.equal(session.exercises[1].targetDurationSeconds, 45);
  assert.ok(session.exercises.every((entry) => !entry.sets.length));
  const source = fitness.readRoutine(id);
  fitness.editRoutine(id, { name: 'Changed routine', exercises: [source.exercises[1]].map((entry) => ({ id: entry.id, exerciseId: entry.exerciseId, targets: targets({ setCount: '8' }) })) });
  assert.deepEqual(fitness.readSession(started.id), session);
});

test('one active workout is resumed for routine/free starts and enforced by SQLite', async (t) => {
  const { sqlite, db, fitness } = await initialized(); t.after(() => sqlite.close());
  const first = fitness.startWorkout(); const id = fitness.createRoutine(plan([], 'Other'));
  assert.deepEqual(fitness.startWorkout(id), { id: first.id, resumed: true }); assert.deepEqual(fitness.startWorkout(), { id: first.id, resumed: true });
  assert.equal(fitness.read().active!.id, first.id); assert.equal(fitness.read().history.length, 0);
  assert.equal(fitness.readSession(first.id).routineId, null); assert.equal(fitness.readSession(first.id).name, 'Free workout');
  assert.throws(() => db.insert(schema.fitnessSessions).values({ id: randomUUID(), name: 'Second', startedAt: now(), createdAt: now(), updatedAt: now() }).run());
  assert.equal(sqlite.prepare('SELECT count(*) AS count FROM fitness_workout_sessions').get()!.count, 1);
});

test('session exercise add/remove is ordered, soft and independent of its source routine', async (t) => {
  const { sqlite, fitness } = await initialized(); t.after(() => sqlite.close());
  const id = fitness.createRoutine(plan([builtIn('strength')])); const started = fitness.startWorkout(id); const before = fitness.readRoutine(id);
  const first = fitness.addSessionExercise(started.id, builtIn('duration')); fitness.addSet(first, draft({ seconds: '45' }));
  fitness.removeSessionExercise(first); const second = fitness.addSessionExercise(started.id, builtIn('distance'));
  assert.deepEqual(fitness.readSession(started.id).exercises.map((exercise) => exercise.position), [0, 2]);
  assert.equal(fitness.readSession(started.id).exercises[1].id, second);
  assert.notEqual(sqlite.prepare('SELECT deleted_at FROM fitness_session_exercises WHERE id = ?').get(first)!.deleted_at, null);
  assert.equal(sqlite.prepare('SELECT count(*) AS count FROM fitness_sets WHERE session_exercise_id = ?').get(first)!.count, 1);
  assert.deepEqual(fitness.readRoutine(id), before);
});

test('set create/edit/delete keeps stable IDs/order and natural numbering after soft deletion', async (t) => {
  const { sqlite, fitness } = await initialized(); t.after(() => sqlite.close());
  const session = fitness.startWorkout(); const exerciseId = fitness.addSessionExercise(session.id, builtIn('strength'));
  const a = fitness.addSet(exerciseId, draft({ weight: '60', reps: '10' })); const b = fitness.addSet(exerciseId, draft({ weight: '60', reps: '9' }));
  fitness.editSet(a, draft({ weight: '62.5', reps: '8' })); fitness.deleteSet(b); const c = fitness.addSet(exerciseId, draft({ weight: '60', reps: '7' }));
  const sets = fitness.readSession(session.id).exercises[0].sets;
  assert.deepEqual(sets.map((set) => set.id), [a, c]); assert.deepEqual(sets.map((set) => set.position), [0, 2]);
  assert.equal(sets[0].weightGrams, 62500); assert.equal(sets[0].reps, 8); assert.equal(setLabel(sets[0]), '62.5 kg × 8');
  assert.notEqual(sqlite.prepare('SELECT deleted_at FROM fitness_sets WHERE id = ?').get(b)!.deleted_at, null);
  assert.throws(() => fitness.editSet(b, draft({ weight: '1', reps: '1' })), /no longer available/);
  assert.throws(() => fitness.addSet(exerciseId, draft({ weight: '60', reps: '0' })));
  assert.equal(fitness.read().active!.setCount, 2);
});

for (const [type, values, expected] of [
  ['bodyweight', { reps: '8' }, '8 reps'], ['bodyweight', { reps: '8', weight: '10' }, '8 reps · +10 kg'],
  ['duration', { minutes: '1', seconds: '30' }, '1 min 30 sec'], ['distance', { distance: '2.5', minutes: '12' }, '2.5 km · 12 min'],
] as [MeasurementType, Partial<SetDraft>, string][]) {
  test(`${type} actual set values survive typed persistence and format correctly (${expected})`, async (t) => {
    const { sqlite, fitness } = await initialized(); t.after(() => sqlite.close());
    const session = fitness.startWorkout(); const exercise = fitness.addSessionExercise(session.id, builtIn(type)); fitness.addSet(exercise, draft(values));
    const set = fitness.readSession(session.id).exercises[0].sets[0];
    assert.equal(setLabel(set), expected); assert.deepEqual(validateSet(type, setDraft(set)), validateSet(type, draft(values)));
  });
}

test('notes are workout-specific, trimmed, clearable and persisted independently of exercises/templates', async (t) => {
  const { sqlite, fitness } = await initialized(); t.after(() => sqlite.close());
  const session = fitness.startWorkout(); const exercise = fitness.addSessionExercise(session.id, builtIn('strength'));
  fitness.saveNote(session.id, exercise, '  Shoulder felt tight.  '); fitness.saveNote(session.id, null, 'Short workout');
  assert.equal(fitness.readSession(session.id).exercises[0].note, 'Shoulder felt tight.'); assert.equal(fitness.readSession(session.id).note, 'Short workout');
  fitness.saveNote(session.id, exercise, ' '); assert.equal(fitness.readSession(session.id).exercises[0].note, null);
  assert.throws(() => fitness.saveNote(session.id, exercise, 'x'.repeat(2001)), /2000/);
});

test('finish explicitly completes even a partial/empty workout, preserves data, and every history mutation is rejected', async (t) => {
  const { sqlite, fitness } = await initialized(); t.after(() => sqlite.close());
  const routine = plan([builtIn('strength')]); routine.exercises[0].targets = targets({ setCount: '3' });
  const routineId = fitness.createRoutine(routine); const before = fitness.readRoutine(routineId); const session = fitness.startWorkout(routineId);
  const exercise = fitness.readSession(session.id).exercises[0].id; const set = fitness.addSet(exercise, draft({ weight: '60', reps: '10' }));
  fitness.saveNote(session.id, exercise, 'Actual note'); fitness.finishWorkout(session.id);
  const completed = fitness.readSession(session.id);
  assert.ok(completed.completedAt); assert.equal(fitness.read().active, null); assert.equal(fitness.read().history[0].setCount, 1);
  for (const action of [
    () => fitness.addSessionExercise(session.id, builtIn('duration')), () => fitness.removeSessionExercise(exercise),
    () => fitness.addSet(exercise, draft({ weight: '1', reps: '1' })), () => fitness.editSet(set, draft({ weight: '1', reps: '1' })),
    () => fitness.deleteSet(set), () => fitness.saveNote(session.id, exercise, 'Changed'), () => fitness.saveNote(session.id, null, 'Changed'),
    () => fitness.discardWorkout(session.id), () => fitness.finishWorkout(session.id),
  ]) assert.throws(action, /read-only/);
  assert.deepEqual(fitness.readSession(session.id), completed); assert.deepEqual(fitness.readRoutine(routineId), before);
  const empty = fitness.startWorkout(); fitness.finishWorkout(empty.id);
  assert.equal(fitness.readSession(empty.id).exercises.length, 0);
});

test('archive/rename/remove source definitions do not rewrite completed workout snapshot or actual performance', async (t) => {
  const { sqlite, db, fitness } = await initialized(); t.after(() => sqlite.close());
  const exercise = fitness.createExercise({ name: 'Historical Row', measurementType: 'strength' });
  const routineId = fitness.createRoutine(plan([exercise.id])); const session = fitness.startWorkout(routineId);
  const entry = fitness.readSession(session.id).exercises[0]; fitness.addSet(entry.id, draft({ weight: '12.5', reps: '10' }));
  fitness.finishWorkout(session.id); const before = fitness.readSession(session.id);
  fitness.editRoutine(routineId, plan([], 'New Name')); fitness.archiveRoutine(routineId); fitness.archiveExercise(exercise.id);
  db.update(schema.fitnessExercises).set({ name: 'Renamed source' }).where(eq(schema.fitnessExercises.id, exercise.id)).run();
  assert.deepEqual(fitness.readSession(session.id), before); assert.equal(fitness.read().history[0].name, 'Upper Body');
  assert.equal(setLabel(fitness.readSession(session.id).exercises[0].sets[0]), '12.5 kg × 10');
  assert.throws(() => fitness.startWorkout(routineId), /active routine/);
  assert.throws(() => fitness.editRoutine(routineId, plan([], 'Edit')), /Archived/);
});

test('archiving an exercise during an active workout still permits its retained logging', async (t) => {
  const { sqlite, fitness } = await initialized(); t.after(() => sqlite.close());
  const exercise = fitness.createExercise({ name: 'Active Row', measurementType: 'strength' }); const session = fitness.startWorkout();
  const entry = fitness.addSessionExercise(session.id, exercise.id); fitness.archiveExercise(exercise.id);
  fitness.addSet(entry, draft({ weight: '10', reps: '5' })); fitness.finishWorkout(session.id);
  assert.equal(fitness.readSession(session.id).exercises[0].exerciseName, 'Active Row');
  assert.equal(fitness.readSession(session.id).exercises[0].sets.length, 1);
});

test('discard soft-deletes only the unfinished session and excludes it from current/history without affecting routine', async (t) => {
  const { sqlite, fitness } = await initialized(); t.after(() => sqlite.close());
  const id = fitness.createRoutine(plan([builtIn('strength')])); const before = fitness.readRoutine(id); const session = fitness.startWorkout(id);
  fitness.addSet(fitness.readSession(session.id).exercises[0].id, draft({ weight: '10', reps: '5' })); fitness.discardWorkout(session.id);
  assert.equal(fitness.read().active, null); assert.equal(fitness.read().history.length, 0); assert.deepEqual(fitness.readRoutine(id), before);
  assert.throws(() => fitness.readSession(session.id), /no longer available/);
  assert.notEqual(sqlite.prepare('SELECT deleted_at FROM fitness_workout_sessions WHERE id = ?').get(session.id)!.deleted_at, null);
  assert.equal(sqlite.prepare('SELECT count(*) AS count FROM fitness_sets').get()!.count, 1);
  assert.notEqual(fitness.startWorkout(id).id, session.id);
});

test('history is completed-only, newest-first, bounded and loadable beyond the initial page', async (t) => {
  const { sqlite, db } = await initialized(); t.after(() => sqlite.close());
  let clock = now(); const fitness = createFitnessDataAccess(db, randomUUID, () => clock);
  const ids: string[] = [];
  for (let index = 0; index < 23; index++) { clock += 1000; const session = fitness.startWorkout(); ids.push(session.id); fitness.finishWorkout(session.id); }
  const active = fitness.startWorkout(); const first = fitness.read();
  assert.equal(first.history.length, 20); assert.equal(first.hasMoreHistory, true); assert.equal(first.history[0].id, ids.at(-1));
  assert.ok(!first.history.some((session) => session.id === active.id));
  assert.deepEqual(fitness.read(40).history.map((session) => session.id), [...ids].reverse()); assert.equal(fitness.read(40).hasMoreHistory, false);
});

test('restart preserves active workout, snapshots, targets, typed sets, notes and single-session resume', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'axis-fitness-')); const filename = join(directory, 'axis.db');
  let opened = await initialized(filename);
  t.after(() => { opened.sqlite.close(); for (const file of [filename, `${filename}-wal`, `${filename}-shm`]) { try { unlinkSync(file); } catch { /* SQLite may remove sidecars itself. */ } } rmdirSync(directory); });
  const routine = plan([builtIn('strength'), builtIn('duration'), builtIn('distance'), builtIn('bodyweight')]);
  routine.exercises[0].targets = targets({ setCount: '3', repMin: '8', repMax: '12' });
  const id = opened.fitness.createRoutine(routine); const session = opened.fitness.startWorkout(id);
  const entries = opened.fitness.readSession(session.id).exercises;
  [draft({ weight: '12.5', reps: '10' }), draft({ seconds: '45' }), draft({ distance: '2.5' }), draft({ reps: '8' })]
    .forEach((values, index) => opened.fitness.addSet(entries[index].id, values));
  opened.fitness.saveNote(session.id, entries[0].id, 'Remembered'); opened.fitness.saveNote(session.id, null, 'Session note');
  const before = opened.fitness.readSession(session.id); opened.sqlite.close(); opened = await initialized(filename);
  assert.deepEqual(opened.fitness.readSession(session.id), before); assert.deepEqual(opened.fitness.startWorkout(), { id: session.id, resumed: true });
  assert.equal(opened.fitness.read().active!.setCount, 4);
  opened.fitness.finishWorkout(session.id); const completed = opened.fitness.readSession(session.id); opened.sqlite.close(); opened = await initialized(filename);
  assert.deepEqual(opened.fitness.readSession(session.id), completed); assert.equal(opened.fitness.read().active, null);
  assert.deepEqual(opened.sqlite.prepare('PRAGMA foreign_key_check').all(), []); assert.equal(opened.sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
});

test('SQLite enforces typed set checks, safe integer bounds, referential identity and active ordering', async (t) => {
  const { sqlite, db, fitness } = await initialized(); t.after(() => sqlite.close());
  const session = fitness.startWorkout(); const strength = fitness.addSessionExercise(session.id, builtIn('strength')); const duration = fitness.addSessionExercise(session.id, builtIn('duration'));
  const base = { id: randomUUID(), sessionExerciseId: strength, measurementType: 'strength' as const, position: 0, weightGrams: 1000, reps: 10, createdAt: now(), updatedAt: now() };
  for (const values of [{ reps: null }, { reps: 1.5 }, { weightGrams: -1 }, { weightGrams: Number.MAX_SAFE_INTEGER + 1 }, { durationSeconds: 1 }, { position: -1 }, { sessionExerciseId: 'missing' }]) {
    assert.throws(() => db.insert(schema.fitnessSets).values({ ...base, ...values }).run());
  }
  assert.throws(() => db.insert(schema.fitnessSets).values({ ...base, sessionExerciseId: duration }).run());
  db.insert(schema.fitnessSets).values(base).run();
  assert.throws(() => db.insert(schema.fitnessSets).values({ ...base, id: randomUUID() }).run());
  assert.throws(() => sqlite.prepare('DELETE FROM fitness_exercises WHERE id = ?').run(builtIn('strength')));
  assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), []); assert.equal(sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
});

test('exact display and target draft round trips avoid altered authoritative quantities', () => {
  const target = validateTargets('distance', targets({ distance: '9007199254740.991', setCount: '3' }));
  assert.deepEqual(validateTargets('distance', targetDraft(target)), target);
  assert.equal(distanceLabel(500), '500 m'); assert.equal(distanceLabel(2500), '2.5 km');
  assert.equal(durationLabel(45), '45 sec'); assert.equal(durationLabel(90), '1 min 30 sec');
});

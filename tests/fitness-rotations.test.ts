/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { createFitnessDataAccess } from '../src/features/fitness/data';
import { blankSet, blankTargets } from '../src/features/fitness/form';
import { createRotationDataAccess } from '../src/features/fitness/rotations-data';
import { dailyFitnessState } from '../src/features/fitness/rotation-presentation';
import { seedFitnessExercises } from '../src/features/fitness/seed';
import { localDateString } from '../src/utils/calendar';
import type { RotationDetail, RotationDraft } from '../src/features/fitness/types';
import { bundledMigrations, database } from './helpers/database';

async function fixture(filename?: string) {
  const result = database(filename); await migrate(result.db, bundledMigrations); seedFitnessExercises(result.db);
  let time = new Date(2026, 9, 9, 12).getTime(); const now = () => time++;
  const fitness = createFitnessDataAccess(result.db, randomUUID, now); const rotations = createRotationDataAccess(result.db, randomUUID, now);
  const routines = ['Push', 'Pull', 'Legs'].map((name) => fitness.createRoutine({ name, exercises: [] }));
  return { ...result, fitness, rotations, routines, now, advanceDays: (days: number) => { const date = new Date(time); date.setDate(date.getDate() + days); time = date.getTime(); } };
}
const draft = (routineIds: string[], name = 'Gym Cycle'): RotationDraft => ({ name, steps: routineIds.map((routineId) => ({ id: null, routineId })) });
const edit = (rotation: RotationDetail): RotationDraft => ({ name: rotation.name, steps: rotation.steps.map(({ id, routineId }) => ({ id, routineId })) });

test('rotation CRUD supports one/multiple/duplicate routine steps with stable identity and explicit persistence', async (t) => {
  const f = await fixture(); t.after(() => f.sqlite.close());
  assert.throws(() => f.rotations.create(draft([], 'Empty')), /at least one/);
  assert.throws(() => f.rotations.create(draft(f.routines, ' ')), /name/);
  const single = f.rotations.create(draft([f.routines[0]], 'Full Body'));
  assert.equal(f.rotations.read().find((row) => row.id === single)!.steps.length, 1);
  const id = f.rotations.create(draft([...f.routines, f.routines[1]]));
  const before = f.rotations.read().find((row) => row.id === id)!;
  assert.equal(before.steps.length, 4); assert.equal(new Set(before.steps.map((row) => row.id)).size, 4);
  assert.equal(before.isActive, false); assert.equal(before.nextStepId, before.steps[0].id);
  f.rotations.edit(id, { ...edit(before), name: '  Renamed   Cycle ' });
  assert.equal(f.rotations.read().find((row) => row.id === id)!.name, 'Renamed Cycle');
  f.rotations.delete(single); assert.ok(!f.rotations.read().some((row) => row.id === single));
  assert.equal(f.fitness.readOverview().routines.length, 3);
});

test('only one rotation is active, activation is transactional and switching preserves progression', async (t) => {
  const f = await fixture(); t.after(() => f.sqlite.close());
  const a = f.rotations.create(draft(f.routines)); const b = f.rotations.create(draft([f.routines[2]], 'Home'));
  f.rotations.activate(a); const row = f.rotations.read().find((row) => row.id === a)!;
  f.rotations.setNext(a, row.steps[1].id); f.rotations.activate(b);
  assert.equal(f.rotations.read().find((row) => row.id === a)!.isActive, false);
  assert.equal(f.rotations.readNext()!.rotation.id, b);
  f.rotations.activate(a); assert.equal(f.rotations.readNext()!.stepId, row.steps[1].id);
  assert.equal(f.rotations.read().filter((row) => row.isActive).length, 1);
  assert.throws(() => f.sqlite.prepare('UPDATE fitness_rotations SET is_active = 1 WHERE id = ?').run(b), /UNIQUE/);
  f.rotations.deactivate(a); assert.equal(f.rotations.readNext(), null);
  assert.throws(() => f.rotations.activate('missing'), /no longer/);
  assert.ok(f.rotations.read().every((row) => !row.isActive));
});

test('ordinary routine starts capture expected provenance, completion advances exactly once and wraps on the same day', async (t) => {
  const f = await fixture(); t.after(() => f.sqlite.close());
  const id = f.rotations.create(draft(f.routines)); f.rotations.activate(id);
  for (let index = 0; index < 3; index++) {
    const next = f.rotations.readNext()!; assert.equal(next.routine.id, f.routines[index]);
    const start = f.fitness.startWorkout(f.routines[index]);
    const session = f.fitness.readSession(start.id); assert.equal(session.rotationId, id); assert.equal(session.rotationStepId, next.stepId);
    assert.equal(f.rotations.readNext()!.stepId, next.stepId, 'starting never advances');
    assert.equal(f.fitness.startWorkout(f.routines[(index + 1) % 3]).id, start.id, 'single active session still resumes');
    f.fitness.finishWorkout(start.id);
    assert.equal(f.rotations.readNext()!.routine.id, f.routines[(index + 1) % 3]);
    assert.throws(() => f.fitness.finishWorkout(start.id), /read-only/);
  }
  assert.equal(f.fitness.readDailySummary(localDateString(new Date(f.now()))).completedCount, 3);
});

test('one-step and repeated-routine cycles advance using step identity rather than routine identity', async (t) => {
  const f = await fixture(); t.after(() => f.sqlite.close());
  const id = f.rotations.create(draft([f.routines[0], f.routines[0], f.routines[2]])); f.rotations.activate(id);
  const ordered = f.rotations.read()[0].steps;
  f.fitness.finishWorkout(f.fitness.startWorkout(f.routines[0]).id); assert.equal(f.rotations.readNext()!.stepId, ordered[1].id);
  f.fitness.finishWorkout(f.fitness.startWorkout(f.routines[0]).id); assert.equal(f.rotations.readNext()!.stepId, ordered[2].id);
  const single = f.rotations.create(draft([f.routines[0]], 'Single')); f.rotations.activate(single);
  const step = f.rotations.readNext()!.stepId;
  f.fitness.finishWorkout(f.fitness.startWorkout(f.routines[0]).id); assert.equal(f.rotations.readNext()!.stepId, step);
});

test('activation during an unrelated active workout never retroactively associates or advances that session', async (t) => {
  const f = await fixture(); t.after(() => f.sqlite.close());
  const a = f.rotations.create(draft(f.routines)); f.rotations.activate(a);
  const started = f.fitness.startWorkout(f.routines[2]); assert.equal(f.fitness.readSession(started.id).rotationId, null);
  const b = f.rotations.create(draft([f.routines[2]], 'New expected routine')); f.rotations.activate(b);
  const before = f.rotations.read().find((row) => row.id === b)!;
  f.fitness.finishWorkout(started.id); assert.deepEqual(f.rotations.read().find((row) => row.id === b), before);
  assert.equal(f.fitness.readSession(started.id).rotationStepId, null);
});

test('rest days, different manual routines, free workouts and discarded expected sessions never advance', async (t) => {
  const f = await fixture(); t.after(() => f.sqlite.close());
  const id = f.rotations.create(draft(f.routines)); f.rotations.activate(id);
  const row = f.rotations.read()[0]; f.rotations.setNext(id, row.steps[1].id);
  f.advanceDays(1); assert.equal(f.rotations.readNext()!.stepId, row.steps[1].id);
  f.advanceDays(30); f.fitness.readDailySummary(localDateString(new Date(f.now())));
  assert.equal(f.rotations.readNext()!.stepId, row.steps[1].id);
  for (const routineId of [f.routines[2], null]) {
    const started = f.fitness.startWorkout(routineId); assert.equal(f.fitness.readSession(started.id).rotationId, null);
    f.fitness.finishWorkout(started.id); assert.equal(f.rotations.readNext()!.stepId, row.steps[1].id);
  }
  const expected = f.fitness.startWorkout(f.routines[1]); f.fitness.discardWorkout(expected.id);
  assert.equal(f.rotations.readNext()!.stepId, row.steps[1].id);
  const count = f.fitness.readSummaries(20).history.length;
  f.rotations.setNext(id, row.steps[2].id); assert.equal(f.fitness.readSummaries(20).history.length, count);
  f.rotations.reset(id); assert.equal(f.rotations.readNext()!.stepId, row.steps[0].id);
});

test('reorder/add/remove retain the next identity and removed next walks the old cycle to a surviving step', async (t) => {
  const f = await fixture(); t.after(() => f.sqlite.close());
  const id = f.rotations.create(draft([...f.routines, f.routines[1]])); f.rotations.activate(id);
  const old = f.rotations.read()[0]; f.rotations.setNext(id, old.steps[1].id);
  const reordered = [old.steps[3], old.steps[2], old.steps[1], old.steps[0]];
  f.rotations.edit(id, { ...edit(old), steps: reordered }); assert.equal(f.rotations.readNext()!.stepId, old.steps[1].id);
  const current = f.rotations.read()[0];
  f.rotations.edit(id, { ...edit(current), steps: current.steps.filter((step) => step.id !== old.steps[1].id) });
  assert.equal(f.rotations.readNext()!.stepId, old.steps[0].id, 'follows the previous reordered cycle');
  const next = f.rotations.read()[0];
  f.rotations.edit(id, { ...edit(next), steps: [...next.steps, { id: null, routineId: f.routines[0] }], nextStepIndex: 3 });
  assert.equal(f.rotations.readNext()!.stepId, f.rotations.read()[0].steps[3].id);
  const final = f.rotations.read()[0];
  f.rotations.edit(id, { ...edit(final), steps: final.steps.filter((step) => step.id !== final.nextStepId) });
  assert.equal(f.rotations.readNext()!.stepId, final.steps[0].id, 'removing the last next wraps');
  const before = f.rotations.read();
  assert.throws(() => f.rotations.edit(id, { ...edit(before[0]), steps: [before[0].steps[0], before[0].steps[0]] }), /invalid/);
  assert.deepEqual(f.rotations.read(), before);
  assert.throws(() => f.rotations.edit(id, { ...edit(before[0]), updatedAt: before[0].updatedAt - 1 }), /changed/);
});

test('linked active sessions block invalidating edits/activation/reset/deletion but allow a rename and recover after discard/finish', async (t) => {
  const f = await fixture(); t.after(() => f.sqlite.close());
  const a = f.rotations.create(draft(f.routines)); const b = f.rotations.create(draft(f.routines, 'Other')); f.rotations.activate(a);
  const started = f.fitness.startWorkout(f.routines[0]); const old = f.rotations.read().find((row) => row.id === a)!;
  assert.equal(old.locked, true);
  for (const action of [() => f.rotations.activate(b), () => f.rotations.deactivate(a), () => f.rotations.reset(a),
    () => f.rotations.delete(a), () => f.rotations.setNext(a, old.steps[1].id),
    () => f.rotations.edit(a, { ...edit(old), steps: [...old.steps].reverse() }),
    () => f.rotations.edit(a, { ...edit(old), steps: old.steps.slice(1) })]) assert.throws(action, /Finish or discard/);
  f.rotations.edit(a, { ...edit(old), name: 'Renamed while logging' });
  assert.equal(f.fitness.readSession(started.id).rotationStepId, old.nextStepId);
  f.fitness.discardWorkout(started.id); assert.equal(f.rotations.read().find((row) => row.id === a)!.locked, false);
  f.rotations.setNext(a, old.steps[1].id); f.fitness.finishWorkout(f.fitness.startWorkout(f.routines[1]).id);
  f.rotations.activate(b); assert.equal(f.rotations.readNext()!.rotation.id, b);
});

test('routine archival is blocked for active and inactive saved rotations, then allowed after removal/deletion', async (t) => {
  const f = await fixture(); t.after(() => f.sqlite.close());
  const a = f.rotations.create(draft([f.routines[0], f.routines[1]]));
  assert.throws(() => f.fitness.archiveRoutine(f.routines[0]), /saved rotations/);
  assert.throws(() => f.sqlite.prepare('UPDATE fitness_routines SET deleted_at = 1 WHERE id = ?').run(f.routines[0]), /saved rotations/);
  f.rotations.activate(a); assert.throws(() => f.fitness.archiveRoutine(f.routines[0]), /saved rotations/);
  const old = f.rotations.read()[0]; f.rotations.edit(a, { ...edit(old), steps: old.steps.slice(1) });
  f.fitness.archiveRoutine(f.routines[0]); assert.throws(() => f.rotations.create(draft([f.routines[0]])), /active routine/);
  f.rotations.delete(a); f.fitness.archiveRoutine(f.routines[1]);
});

test('session completion and advancement roll back together on failure; history snapshots survive planning changes', async (t) => {
  const f = await fixture(); t.after(() => f.sqlite.close());
  const exercise = f.fitness.readOverview().exercises.find((row) => row.measurementType === 'strength')!;
  f.fitness.editRoutine(f.routines[0], { name: 'Push', exercises: [{ id: null, exerciseId: exercise.id, targets: { ...blankTargets(), setCount: '3' } }] });
  const id = f.rotations.create(draft(f.routines)); f.rotations.activate(id);
  const started = f.fitness.startWorkout(f.routines[0]); const entry = f.fitness.readSession(started.id).exercises[0];
  f.fitness.addSet(entry.id, { ...blankSet(), weight: '12.5', reps: '8' });
  f.fitness.saveNote(started.id, null, 'Keep workout note'); f.fitness.saveNote(started.id, entry.id, 'Keep exercise note');
  const before = f.fitness.readSession(started.id);
  f.sqlite.exec("CREATE TRIGGER reject_rotation_advance BEFORE UPDATE OF next_step_id ON fitness_rotations BEGIN SELECT RAISE(ABORT, 'Injected failure'); END;");
  assert.throws(() => f.fitness.finishWorkout(started.id), /Injected failure/);
  assert.deepEqual(f.fitness.readSession(started.id), before); assert.equal(f.rotations.readNext()!.stepId, before.rotationStepId);
  f.sqlite.exec('DROP TRIGGER reject_rotation_advance'); f.fitness.finishWorkout(started.id);
  const history = f.fitness.readSession(started.id); const rotation = f.rotations.read()[0];
  f.rotations.edit(id, { ...edit(rotation), steps: rotation.steps.slice(1) }); f.rotations.delete(id);
  f.fitness.editRoutine(f.routines[0], { name: 'Renamed source routine', exercises: [] });
  f.fitness.archiveRoutine(f.routines[0]); assert.deepEqual(f.fitness.readSession(started.id), history);
  assert.equal(f.rotations.readNext(), null);
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []);
  assert.equal(f.sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
});

test('SQLite rejects crossed/partial session provenance, wrong-parent pointers and provenance rewriting', async (t) => {
  const f = await fixture(); t.after(() => f.sqlite.close());
  const a = f.rotations.create(draft(f.routines)); const b = f.rotations.create(draft(f.routines, 'Other')); f.rotations.activate(a);
  const stepB = f.rotations.read().find((row) => row.id === b)!.steps[0].id;
  assert.throws(() => f.sqlite.prepare('UPDATE fitness_rotations SET next_step_id = ? WHERE id = ?').run(stepB, a), /FOREIGN KEY/);
  const insert = f.sqlite.prepare('INSERT INTO fitness_workout_sessions (id, name, routine_id, rotation_id, rotation_step_id, started_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  assert.throws(() => insert.run('bad', 'Bad', f.routines[0], a, null, f.now(), f.now(), f.now()), /provenance/);
  assert.throws(() => insert.run('bad', 'Bad', f.routines[0], a, stepB, f.now(), f.now(), f.now()), /provenance/);
  const active = f.fitness.startWorkout(f.routines[0]);
  assert.throws(() => f.sqlite.prepare('UPDATE fitness_workout_sessions SET rotation_id = NULL, rotation_step_id = NULL WHERE id = ?').run(active.id), /immutable/);
});

test('daily source summary priority is active, completed with next, next only, then empty; midnight never advances', async (t) => {
  const f = await fixture(); t.after(() => f.sqlite.close());
  const day = () => localDateString(new Date(f.now()));
  assert.equal(dailyFitnessState(f.fitness.readDailySummary(day())), 'empty');
  const id = f.rotations.create(draft(f.routines)); f.rotations.activate(id);
  let summary = f.fitness.readDailySummary(day()); assert.equal(dailyFitnessState(summary), 'next'); assert.equal(summary.nextWorkout!.routine.name, 'Push');
  f.fitness.finishWorkout(f.fitness.startWorkout(f.routines[0]).id);
  summary = f.fitness.readDailySummary(day()); assert.equal(dailyFitnessState(summary), 'completed'); assert.equal(summary.completedCount, 1);
  assert.equal(summary.history[0].name, 'Push'); assert.equal(summary.nextWorkout!.routine.name, 'Pull');
  f.fitness.finishWorkout(f.fitness.startWorkout(f.routines[1]).id);
  summary = f.fitness.readDailySummary(day()); assert.equal(summary.completedCount, 2); assert.equal(summary.history[0].name, 'Pull'); assert.equal(summary.nextWorkout!.routine.name, 'Legs');
  const started = f.fitness.startWorkout(f.routines[2]); summary = f.fitness.readDailySummary(day());
  assert.equal(dailyFitnessState(summary), 'active'); assert.equal(summary.completedCount, 2);
  f.fitness.discardWorkout(started.id); f.advanceDays(1); summary = f.fitness.readDailySummary(day());
  assert.equal(summary.completedCount, 0); assert.equal(summary.history.length, 0); assert.equal(dailyFitnessState(summary), 'next');
  assert.equal(summary.nextWorkout!.routine.name, 'Legs');
  f.rotations.deactivate(id); assert.equal(dailyFitnessState(f.fitness.readDailySummary(day())), 'empty');
});

test('daily summary remains bounded with accumulated routines/history/sets and next-workout reads no details', async (t) => {
  const f = await fixture(); t.after(() => f.sqlite.close());
  for (let index = 0; index < 30; index++) f.fitness.createRoutine({ name: `Routine ${index}`, exercises: [] });
  for (let index = 0; index < 200; index++) f.fitness.finishWorkout(f.fitness.startWorkout().id);
  const id = f.rotations.create(draft(f.routines)); f.rotations.activate(id);
  const result = f.measure(() => f.fitness.readDailySummary(localDateString(new Date(f.now()))));
  assert.equal(result.value.completedCount, 200); assert.equal(result.value.history.length, 1);
  assert.deepEqual(result.value.rotationSequence, ['Push', 'Pull', 'Legs']);
  assert.equal(result.statements.filter((row) => row.sql.startsWith('select')).length, 4);
  assert.ok(result.statements.every((row) => !row.sql.includes('fitness_routine_exercises') && !row.sql.includes('from "fitness_sets"')));
  const next = f.measure(() => f.rotations.readNext()); assert.equal(next.count, 1); assert.equal(next.rows, 1);
});

test('daily planning summary reads only the ordered active cycle, preserves duplicate steps and clears on deactivation', async (t) => {
  const f = await fixture(); t.after(() => f.sqlite.close());
  for (let index = 0; index < 40; index++) f.rotations.create(draft(f.routines, `Saved cycle ${index}`));
  const id = f.rotations.create(draft([...f.routines, f.routines[0]])); f.rotations.activate(id);
  const steps = f.rotations.read().find((row) => row.id === id)!.steps; f.rotations.setNext(id, steps[2].id);
  const result = f.measure(() => f.fitness.readDailySummary(localDateString(new Date(f.now()))));
  assert.deepEqual(result.value.rotationSequence, ['Push', 'Pull', 'Legs', 'Push']);
  assert.equal(result.value.nextWorkout!.routine.name, 'Legs');
  assert.equal(result.statements.filter((row) => row.sql.startsWith('select')).length, 4);
  const planning = result.statements.filter((row) => row.sql.includes('from "fitness_rotations"'));
  assert.equal(planning.length, 1); assert.equal(planning[0].rows, 4);
  assert.ok(result.statements.every((row) => !row.sql.includes('fitness_routine_exercises') && !row.sql.includes('from "fitness_sets"')));
  f.rotations.deactivate(id);
  const empty = f.fitness.readDailySummary(localDateString(new Date(f.now())));
  assert.equal(empty.nextWorkout, null); assert.deepEqual(empty.rotationSequence, []);
});

test('restart preserves saved inactive progress and active session provenance before advancing through the normal completion path', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'axis-rotation-')); const file = join(directory, 'axis.db');
  const f = await fixture(file); const a = f.rotations.create(draft(f.routines)); const b = f.rotations.create(draft(f.routines, 'Other'));
  const old = f.rotations.read().find((row) => row.id === a)!; f.rotations.setNext(a, old.steps[1].id);
  f.rotations.activate(a); const active = f.fitness.startWorkout(f.routines[1]); f.sqlite.close();
  const reopened = database(file); t.after(() => { reopened.sqlite.close(); rmSync(directory, { recursive: true, force: true }); }); await migrate(reopened.db, bundledMigrations);
  const rotations = createRotationDataAccess(reopened.db, randomUUID, f.now); const fitness = createFitnessDataAccess(reopened.db, randomUUID, f.now);
  assert.equal(fitness.readSession(active.id).rotationStepId, old.steps[1].id);
  fitness.finishWorkout(active.id); assert.equal(rotations.readNext()!.stepId, old.steps[2].id);
  rotations.activate(b); rotations.activate(a); assert.equal(rotations.readNext()!.stepId, old.steps[2].id);
  assert.deepEqual(reopened.sqlite.prepare('PRAGMA foreign_key_check').all(), []);
});

/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test, type TestContext } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { act, createElement } from 'react';

import { createFitnessDataAccess } from '../src/features/fitness/data';
import { blankSet, blankTargets } from '../src/features/fitness/form';
import { workoutCounts, workoutDateLabel, workoutHistoryGroups } from '../src/features/fitness/management-presentation';
import { createRotationDataAccess } from '../src/features/fitness/rotations-data';
import { seedFitnessExercises } from '../src/features/fitness/seed';
import { seedFinanceCategories } from '../src/features/finance/seed';
import type { SessionSummary } from '../src/features/fitness/types';
import { bundledMigrations, database } from './helpers/database';
import { growthFixture } from './helpers/growth-fixture';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

type App = Awaited<ReturnType<typeof mount>>;
async function fixture(t: TestContext) {
  const f = database(); await migrate(f.db, bundledMigrations); seedFitnessExercises(f.db); seedFinanceCategories(f.db);
  t.after(() => f.sqlite.close());
  return { ...f, fitness: createFitnessDataAccess(f.db, randomUUID), rotations: createRotationDataAccess(f.db, randomUUID) };
}
async function settle() { await act(() => new Promise((resolve) => setTimeout(resolve, 20))); }
async function menuAction(app: App, name: string, action: string) {
  await app.press(`Options for ${name}`); await app.press(action); await settle();
}
function row(app: App, prefix: string) {
  return app.nodes().find((node) => node.kind === 'Pressable' && String(node.props?.accessibilityLabel ?? '').startsWith(prefix))!;
}
async function tapRow(app: App, prefix: string) { const target = row(app, prefix); assert.ok(target); await act(() => (target.props.onPress as () => void)()); }

test('routine rows are counts-only objects; tap loads one editor and contextual actions dismiss before starting', async (t) => {
  const f = await fixture(t); const exercise = f.fitness.readOverview().exercises[0];
  const id = f.fitness.createRoutine({ name: 'Upper body', exercises: [{ id: null, exerciseId: exercise.id, targets: blankTargets() }] });
  const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  runtime.fixture.reads.length = 0; await app.press('Routines');
  assert.ok(runtime.fixture.reads.includes('fitness.readRoutineSummaries')); assert.ok(!runtime.fixture.reads.includes('fitness.readRoutines'));
  assert.ok(!runtime.fixture.reads.includes('fitness.readRoutine')); assert.ok(!app.container.textContent.includes(exercise.name));
  assert.ok(row(app, 'Open Upper body, 1 exercise')); assert.ok(!app.nodes().some((node) => node.props?.label === 'Start workout'));
  await tapRow(app, 'Open Upper body,'); assert.ok(runtime.fixture.reads.includes('fitness.readRoutine'));
  assert.equal(app.find('FormField', 'Routine name *').props.value, 'Upper body'); await app.press('Cancel');
  await app.press('Options for Upper body'); assert.ok(!app.nodes().some((node) => node.kind === 'Modal'));
  assert.ok(app.find('FormButton', 'Edit Upper body')); assert.ok(app.find('FormButton', 'Archive Upper body'));
  await app.tapSet('Close options for upper body'); assert.equal(app.find('FormButton', 'Options for Upper body').props.expanded, false);
  await menuAction(app, 'Upper body', 'Start Upper body'); assert.equal(f.fitness.readOverview().active!.routineId, id);
  assert.ok(app.find('FormButton', 'Finish Workout')); assert.ok(!app.nodes().some((node) => node.kind === 'Modal'));
});

test('routine drafts preserve name, ordered exercises and targets through failed refresh and richer exercise creation', async (t) => {
  const f = await fixture(t); const exercises = f.fitness.readOverview().exercises.filter((row) => row.measurementType === 'strength').slice(0, 2);
  const id = f.fitness.createRoutine({ name: 'Draft plan', exercises: exercises.map((exercise) => ({ id: null, exerciseId: exercise.id, targets: blankTargets() })) });
  const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount); await app.press('Routines'); await tapRow(app, 'Open Draft plan,');
  await app.change('Routine name *', 'My plan'); await app.press(`Move ${exercises[1].name} up`);
  await app.press(`Configure targets for ${exercises[1].name}`); await app.change('Planned sets (optional, 1–100)', '3');
  const field = app.find('FormField', 'Routine name *'); runtime.fixture.failures.add('fitness.readRoutineSummaries'); await app.resume();
  assert.equal(app.find('FormField', 'Routine name *'), field); assert.equal(field.props.value, 'My plan');
  assert.equal(app.find('FormField', 'Planned sets (optional, 1–100)').props.value, '3');
  runtime.fixture.failures.clear(); await app.press('Retry'); assert.equal(app.find('FormField', 'Routine name *'), field);
  await app.press('Add exercise'); await app.change('Search exercises', 'Custom stretch'); await app.press('Create new exercise');
  await act(() => (app.find('SelectField', 'Measurement type *').props.onChange as (type: string) => void)('duration'));
  await app.press('Create'); assert.equal(app.find('FormField', 'Routine name *').props.value, 'My plan');
  assert.ok(app.container.textContent.includes('Custom stretch')); await app.press('Save');
  const saved = f.fitness.readRoutine(id); assert.equal(saved.name, 'My plan');
  assert.deepEqual(saved.exercises.map((entry) => entry.exercise.name), [exercises[1].name, exercises[0].name, 'Custom stretch']);
  assert.equal(saved.exercises[0].targetSetCount, 3); assert.ok(!app.nodes().some((node) => node.kind === 'Modal'));
});

test('routine archive respects saved rotations; archived routines open read-only detail', async (t) => {
  const f = await fixture(t); const id = f.fitness.createRoutine({ name: 'Protected plan', exercises: [] });
  const rotationId = f.rotations.create({ name: 'Saved cycle', steps: [{ id: null, routineId: id }] });
  const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount); await app.press('Routines');
  await menuAction(app, 'Protected plan', 'Archive Protected plan'); await app.confirm('Archive');
  assert.equal(f.fitness.readRoutine(id).deletedAt, null); assert.ok(app.find('FormError')); f.rotations.delete(rotationId);
  await menuAction(app, 'Protected plan', 'Archive Protected plan'); await app.confirm('Archive');
  assert.ok(!row(app, 'Open Protected plan,'));
  await act(() => (app.find('SegmentedControl', 'Routines').props.onChange as (value: number) => void)(1));
  await tapRow(app, 'Open Protected plan,'); assert.ok(app.container.textContent.includes('Archived routine'));
  assert.ok(!app.nodes().some((node) => node.kind === 'FormField' || node.props?.label === 'Save'));
});

test('exercise search/detail/archive keep built-in protections, routine references and workout snapshots', async (t) => {
  const f = await fixture(t); const custom = f.fitness.createExercise({ name: 'Cable movement', measurementType: 'strength' });
  const id = f.fitness.createRoutine({ name: 'Cable plan', exercises: [{ id: null, exerciseId: custom.id, targets: blankTargets() }] });
  const completed = f.fitness.startWorkout(id); f.fitness.addSet(f.fitness.readSession(completed.id).exercises[0].id, { ...blankSet(), weight: '40', reps: '10' }); f.fitness.finishWorkout(completed.id);
  const active = f.fitness.startWorkout(id); const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  await app.press('Exercises'); await app.change('Search exercises', 'cable'); assert.ok(row(app, 'Open Cable movement,'));
  await tapRow(app, 'Open Cable movement,'); assert.ok(app.container.textContent.includes('Custom exercise')); await app.press('Back');
  await menuAction(app, custom.name, `Archive ${custom.name}`); await app.confirm('Archive'); assert.ok(!row(app, 'Open Cable movement,'));
  assert.equal(f.fitness.readRoutine(id).exercises[0].exercise.deletedAt !== null, true);
  assert.equal(f.fitness.readSession(completed.id).exercises[0].sets[0].weightGrams, 40000);
  assert.equal(f.fitness.readSession(active.id).exercises[0].exerciseName, custom.name);
  await act(() => (app.find('SegmentedControl', 'Exercise library').props.onChange as (value: number) => void)(1));
  await tapRow(app, 'Open Cable movement,'); assert.ok(app.container.textContent.includes('Archived.'));
  await app.press('Back'); await act(() => (app.find('SegmentedControl', 'Exercise library').props.onChange as (value: number) => void)(0));
  await app.change('Search exercises', ''); const builtIn = f.fitness.readOverview().exercises.find((row) => row.isBuiltIn)!;
  assert.ok(!app.nodes().some((node) => node.props?.accessibilityLabel === `Options for ${builtIn.name}`));
  await tapRow(app, `Open ${builtIn.name},`); assert.ok(app.container.textContent.includes('cannot be archived')); await app.press('Back');
  assert.throws(() => f.fitness.archiveExercise(builtIn.id), /Built-in/);
  f.fitness.discardWorkout(active.id); assert.equal(f.fitness.readSession(f.fitness.startWorkout(id).id).exercises.length, 0);
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []);
  assert.equal(f.sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
});

test('History groups by local completion day across midnight/year, retains multiple sessions and does not reorder', () => {
  const now = new Date(2026, 0, 1, 12);
  const session = (id: string, completed: Date, started = new Date(2025, 11, 30)) => ({ id, startedAt: started.getTime(), completedAt: completed.getTime() } as SessionSummary);
  const rows = [session('today-2', new Date(2026, 0, 1, 11)), session('today-1', new Date(2026, 0, 1, 1)),
    session('yesterday', new Date(2025, 11, 31, 23)), session('older', new Date(2025, 10, 2))];
  const groups = workoutHistoryGroups(rows, now);
  assert.deepEqual(groups.map((group) => group.sessions.map((row) => row.id)), [['today-2', 'today-1'], ['yesterday'], ['older']]);
  assert.deepEqual(groups.slice(0, 2).map((group) => group.label), ['Today', 'Yesterday']); assert.match(groups[2].label, /2025/);
  assert.equal(workoutDateLabel(new Date(2026, 2, 10).getTime(), now).includes('2026'), false);
  assert.equal(workoutCounts(1, 1), '1 exercise · 1 set');
});

test('History UI appends three bounded pages, opens read-only detail and retains rows through return failures', async (t) => {
  const f = await fixture(t); for (let i = 0; i < 45; i++) f.fitness.finishWorkout(f.fitness.startWorkout().id);
  const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount); await app.press('History');
  const ids = () => app.nodes().filter((node) => node.kind === 'Pressable' && String(node.props?.accessibilityLabel ?? '').startsWith('View Free workout,'));
  assert.equal(ids().length, 20); assert.ok(app.container.textContent.includes('Today'));
  const older = await f.measureAsync(() => app.press('Load older workouts')); assert.equal(older.count, 3); assert.equal(older.rows, 21);
  assert.equal(ids().length, 40); await app.press('Load older workouts'); assert.equal(ids().length, 45);
  assert.ok(!app.nodes().some((node) => node.props?.label === 'Load older workouts'));
  await tapRow(app, 'View Free workout,'); assert.ok(app.find('Modal')); assert.ok(app.container.textContent.includes('Read-only'));
  assert.ok(!app.nodes().some((node) => node.kind === 'FormField' || node.props?.label === 'Finish Workout')); await app.press('Back');
  await app.press('Exercises'); runtime.fixture.failures.add('fitness.readOverview'); await app.press('History');
  assert.equal(ids().length, 45); assert.ok(app.find('FormError')); runtime.fixture.failures.clear(); await app.press('Retry'); assert.equal(ids().length, 45);
});

test('cold read failures show recovery without false empty states; routine-detail failures keep the list', async (t) => {
  const f = await fixture(t); f.fitness.createRoutine({ name: 'Recoverable', exercises: [] });
  const app = await mount(createElement(screens.FitnessScreen), f.db, ['fitness.readOverview']); t.after(app.unmount);
  assert.ok(app.find('FormButton', 'Retry')); assert.ok(!app.container.textContent.includes('No completed workouts yet'));
  runtime.fixture.failures.clear(); await app.press('Retry'); await app.press('Routines');
  runtime.fixture.failures.add('fitness.readRoutine'); await tapRow(app, 'Open Recoverable,');
  assert.ok(row(app, 'Open Recoverable,')); assert.ok(!app.nodes().some((node) => node.kind === 'Modal')); assert.ok(app.find('FormError'));
  runtime.fixture.failures.clear(); await tapRow(app, 'Open Recoverable,'); assert.equal(app.find('FormField', 'Routine name *').props.value, 'Recoverable');
});

test('linked rotation management disables unsafe menu actions while keeping Edit available', async (t) => {
  const f = await fixture(t); const routineId = f.fitness.createRoutine({ name: 'Linked plan', exercises: [] });
  const rotationId = f.rotations.create({ name: 'Linked cycle', steps: [{ id: null, routineId }] });
  f.rotations.activate(rotationId); f.fitness.startWorkout(routineId);
  const app = await mount(createElement(screens.WorkoutRotationsScreen), f.db); t.after(app.unmount);
  await app.press('Options for Linked cycle');
  for (const label of ['Deactivate Linked cycle', 'Reset Linked cycle', 'Delete Linked cycle']) assert.equal(app.find('FormButton', label).props.disabled, true);
  assert.equal(app.find('FormButton', 'Edit Linked cycle').props.disabled, undefined);
  assert.ok(app.container.textContent.includes('Finish or discard'));
  assert.throws(() => f.rotations.delete(rotationId), /Finish or discard/);
});

for (const [type, values, expected] of [
  ['strength', { weight: '80', reps: '8' }, '80 kg × 8'],
  ['bodyweight', { reps: '12', weight: '10' }, '12 reps · +10 kg'],
  ['duration', { minutes: '2', seconds: '30' }, '2 min 30 sec'],
  ['distance', { distance: '5', minutes: '28' }, '5 km · 28 min'],
] as const) {
  test(`completed ${type} detail uses metric formatting and dedicated notes without writable controls`, async (t) => {
    const f = await fixture(t); const session = f.fitness.startWorkout();
    const exercise = f.fitness.readOverview().exercises.find((row) => row.measurementType === type)!;
    const id = f.fitness.addSessionExercise(session.id, exercise.id);
    f.fitness.addSet(id, { ...blankSet(), ...values }); f.fitness.saveNote(session.id, null, 'Session note');
    f.fitness.saveNote(session.id, id, 'Exercise note'); f.fitness.finishWorkout(session.id);
    const app = await mount(createElement(screens.FitnessScreen, { initialSessionId: session.id }), f.db); t.after(app.unmount);
    assert.ok(app.container.textContent.includes(expected)); assert.ok(app.container.textContent.includes('Workout note'));
    assert.ok(app.container.textContent.includes('Session note')); assert.ok(app.container.textContent.includes('Exercise note'));
    assert.ok(!app.nodes().some((node) => node.kind === 'FormField' || ['Save', 'Delete', 'Finish Workout', 'Edit'].includes(String(node.props?.label))));
    const set = app.nodes().find((node) => node.props?.accessible && String(node.props?.accessibilityLabel ?? '').includes('set 1.'));
    assert.ok(set); assert.ok(!String(set.props.accessibilityLabel).includes('grams'));
  });
}

test('management rows wrap long names in both themes and enlarged text without fixed text heights', async (t) => {
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width: 320, height: 800, scale: 1, fontScale: 2 }));
  const f = await fixture(t); const name = 'Long routine for accessible mobile text '.repeat(3).trim(); f.fitness.createRoutine({ name, exercises: [] });
  for (const theme of ['light', 'dark']) {
    t.mock.method(runtime.native as { useColorScheme: () => unknown }, 'useColorScheme', () => theme);
    const app = await mount(createElement(screens.FitnessScreen), f.db);
    try {
      await app.press('Routines'); assert.ok(row(app, `Open ${name},`));
      assert.ok(app.nodes().filter((node) => node.kind === 'ThemedText').every((node) => node.props.numberOfLines === undefined && node.props.allowFontScaling !== false));
      assert.ok(app.nodes().filter((node) => node.kind === 'Pressable').every((node) => !(node.props.style as { height?: number })?.height));
      await app.press(`Options for ${name}`); assert.ok(app.find('FormButton', `Edit ${name}`));
    } finally { await app.unmount(); }
  }
});

test('accumulated Fitness management reads avoid routine child payloads and irrelevant History', async (t) => {
  const f = await growthFixture(); t.after(() => f.sqlite.close());
  const previousRoutines = f.measure(() => f.fitness.readRoutines()); const rows = f.measure(() => f.fitness.readRoutineSummaries());
  assert.equal(previousRoutines.count, 4); assert.equal(previousRoutines.rows, 120);
  assert.equal(rows.count, 1); assert.equal(rows.rows, 30); assert.ok(rows.value.every((row) => row.exerciseCount === 3 && !('exercises' in row)));
  const previousOverview = f.measure(() => f.fitness.readOverview()); const overview = f.measure(() => f.fitness.readOverview(20, false));
  assert.equal(previousOverview.count, 6); assert.equal(overview.count, 5); assert.equal(previousOverview.rows - overview.rows, 21);
  assert.ok(overview.statements.every((row) => !row.sql.includes('"completed_at" is not null')));
  const detail = f.measure(() => f.fitness.readRoutine(rows.value[0].id)); assert.equal(detail.rows, 4); assert.equal(detail.value.exercises.length, 3);
  console.log(`Stage 13K measured: routine list ${previousRoutines.count} statements/${previousRoutines.rows} rows -> ${rows.count}/${rows.rows}; non-History overview ${previousOverview.count}/${previousOverview.rows} -> ${overview.count}/${overview.rows}; one routine detail ${detail.count}/${detail.rows}`);
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []); assert.equal(f.sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
});

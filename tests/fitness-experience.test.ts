/// <reference types="node" />

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test, type TestContext } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { act, createElement } from 'react';

import { seedFinanceCategories } from '../src/features/finance/seed';
import { createFitnessDataAccess } from '../src/features/fitness/data';
import { blankSet, blankTargets } from '../src/features/fitness/form';
import { seedFitnessExercises } from '../src/features/fitness/seed';
import type { MeasurementType } from '../src/features/fitness/types';
import { workoutSetPresentation } from '../src/features/fitness/workout-presentation';
import { bundledMigrations, database } from './helpers/database';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

type App = Awaited<ReturnType<typeof mount>>;
async function initialized(t: TestContext) {
  const fixture = database(); await migrate(fixture.db, bundledMigrations); seedFitnessExercises(fixture.db); seedFinanceCategories(fixture.db);
  t.after(() => fixture.sqlite.close());
  return { ...fixture, fitness: createFitnessDataAccess(fixture.db, randomUUID) };
}
function assertInline(app: App) {
  assert.ok(!app.nodes().some((node) => node.kind === 'Modal'), 'Active workout is normal content, with no whole-workout modal');
  assert.ok(!app.nodes().some((node) => node.props?.label === 'Resume current workout'));
  assert.equal(app.find('FormButton', 'Workout').props.selected, true);
  const finish = app.find('FormButton', 'Finish Workout'); assert.equal(finish.props.variant, 'primary');
  for (let parent = finish.parentNode; parent; parent = parent.parentNode) assert.notEqual(parent.kind, 'ScrollView', 'Finish stays outside scrolling content');
  assert.deepEqual(app.find('SafeAreaView').props.edges, { top: true, bottom: true, left: true, right: true });
}
function strength(fitness: ReturnType<typeof createFitnessDataAccess>) {
  return fitness.readOverview().exercises.find((row) => row.measurementType === 'strength')!;
}

test('no-active Workout shows start choices; starting Empty transitions directly into inline Workout', async (t) => {
  const { db, fitness } = await initialized(t); const app = await mount(createElement(screens.FitnessScreen), db); t.after(app.unmount);
  assert.ok(app.find('FormButton', 'Start Empty Workout')); assert.ok(app.find('FormButton', 'Start from Routine').props.disabled);
  assert.ok(!app.nodes().some((node) => node.props?.label === 'Finish Workout'));
  await app.press('Start Empty Workout'); assertInline(app); assert.equal(fitness.readOverview().active!.exerciseCount, 0);
  assert.ok(!app.nodes().some((node) => node.props?.label === 'Start Empty Workout'));
});

test('starting from a routine opens inline Workout with snapshotted exercises/targets and one active session', async (t) => {
  const { db, fitness } = await initialized(t); const exercise = strength(fitness);
  const id = fitness.createRoutine({ name: 'Upper Body', exercises: [{ id: null, exerciseId: exercise.id, targets: { ...blankTargets(), setCount: '3', repMin: '8', repMax: '12' } }] });
  const app = await mount(createElement(screens.FitnessScreen), db); t.after(app.unmount);
  await act(() => (app.find('SelectField', 'Workout routine').props.onChange as (value: string) => void)(id));
  await app.press('Start from Routine'); assertInline(app); assert.ok(app.container.textContent.includes('Upper Body'));
  assert.ok(app.container.textContent.includes('Target: 3 planned sets')); assert.ok(app.find('FormButton', `Add set for ${exercise.name}`));
  const active = fitness.readOverview().active!; assert.equal(fitness.startWorkout().id, active.id);
  assert.equal(fitness.readSession(active.id).exercises[0].targetSetCount, 3);
});

test('starting via Routines returns to inline Workout rather than opening a workout sheet', async (t) => {
  const { db, fitness } = await initialized(t); fitness.createRoutine({ name: 'Empty plan', exercises: [] });
  const app = await mount(createElement(screens.FitnessScreen), db); t.after(app.unmount);
  await app.press('Routines'); await app.press('Start Empty plan'); assertInline(app);
  assert.equal(fitness.readOverview().active!.name, 'Empty plan');
});

test('restart and legacy active source entry restore inline Workout without Resume', async (t) => {
  const { db, fitness } = await initialized(t); const session = fitness.startWorkout(); const exercise = strength(fitness);
  const id = fitness.addSessionExercise(session.id, exercise.id); fitness.addSet(id, { ...blankSet(), weight: '60', reps: '10' });
  for (const props of [{}, { initialSessionId: session.id }]) {
    const app = await mount(createElement(screens.FitnessScreen, props), db);
    try { assertInline(app); assert.ok(app.find('Pressable', `${exercise.name}, set 1. 60 kg, 10 reps`)); await app.resume(); assertInline(app); }
    finally { await app.unmount(); }
  }
  assert.equal(fitness.readOverview().active!.id, session.id);
});

test('internal navigation preserves active Workout/scroll context and uses only destination-specific detail reads', async (t) => {
  const { db, fitness } = await initialized(t); const session = fitness.startWorkout(); const exercise = strength(fitness);
  const exerciseId = fitness.addSessionExercise(session.id, exercise.id); fitness.addSet(exerciseId, { ...blankSet(), weight: '80', reps: '5' });
  fitness.createRoutine({ name: 'Other plan', exercises: [] });
  const app = await mount(createElement(screens.FitnessScreen), db); t.after(app.unmount); assertInline(app);
  assert.ok(!runtime.fixture.reads.includes('fitness.readRoutines'));
  await act(() => (app.find('ScrollView').props.onScroll as (event: unknown) => void)({ nativeEvent: { contentOffset: { y: 420 } } }));
  runtime.fixture.reads.length = 0; await app.press('Routines');
  assert.ok(runtime.fixture.reads.includes('fitness.readRoutines')); assert.ok(!runtime.fixture.reads.includes('fitness.readSession'));
  for (const destination of ['Exercises', 'History']) {
    runtime.fixture.reads.length = 0; await app.press(destination);
    assert.ok(!runtime.fixture.reads.includes('fitness.readRoutines')); assert.ok(!runtime.fixture.reads.includes('fitness.readSession'));
  }
  runtime.fixture.reads.length = 0; await app.press('Workout'); assertInline(app);
  assert.deepEqual(app.find('ScrollView').props.contentOffset, { x: 0, y: 420 });
  assert.ok(runtime.fixture.reads.includes('fitness.readSession')); assert.ok(!runtime.fixture.reads.includes('fitness.readRoutines'));
  assert.ok(app.find('Pressable', `${exercise.name}, set 1. 80 kg, 5 reps`));
  for (const label of ['Workout', 'Routines', 'Exercises', 'History']) assert.equal(app.find('FormButton', label).props.variant, 'navigation');
  await app.press('Exercises'); await app.refocus(); assertInline(app); // Returning from Home lands on Workout.
});

test('Home Resume navigates to the Fitness tab and exposes the same active Workout inline', async (t) => {
  const { db, fitness } = await initialized(t); const session = fitness.startWorkout(); fitness.saveNote(session.id, null, 'Same active session');
  const home = await mount(createElement(screens.HomeScreen), db);
  try {
    await home.press('Resume workout');
    assert.deepEqual(runtime.fixture.navigation, [{ method: 'navigate', target: { pathname: '/(tabs)/fitness' } }]);
    assert.ok(!home.nodes().some((node) => node.kind === 'Modal'));
  } finally { await home.unmount(); }
  const app = await mount(createElement(screens.FitnessScreen), db); t.after(app.unmount);
  assertInline(app); assert.ok(app.container.textContent.includes('Same active session')); assert.equal(fitness.readOverview().active!.id, session.id);
});

test('returning to Workout after a failed detail refresh retains last-known-good sets and scroll context', async (t) => {
  const { db, fitness } = await initialized(t); const session = fitness.startWorkout(); const exercise = strength(fitness);
  const id = fitness.addSessionExercise(session.id, exercise.id); fitness.addSet(id, { ...blankSet(), weight: '60', reps: '10' });
  const app = await mount(createElement(screens.FitnessScreen), db); t.after(app.unmount); assertInline(app);
  await act(() => (app.find('ScrollView').props.onScroll as (event: unknown) => void)({ nativeEvent: { contentOffset: { y: 300 } } }));
  await app.press('Exercises'); runtime.fixture.failures.add('fitness.readSession'); await app.press('Workout');
  assertInline(app); assert.ok(app.find('FormError')); assert.ok(app.find('Pressable', `${exercise.name}, set 1. 60 kg, 10 reps`));
  assert.deepEqual(app.find('ScrollView').props.contentOffset, { x: 0, y: 300 });
  runtime.fixture.failures.clear(); await app.press('Retry'); assertInline(app); assert.ok(!app.nodes().some((node) => node.kind === 'FormError'));
});

test('Add Exercise, Add Set, tap-to-edit and editor Delete save into inline Workout with confirmation', async (t) => {
  const { db, fitness } = await initialized(t); const session = fitness.startWorkout(); const exercise = strength(fitness);
  const app = await mount(createElement(screens.FitnessScreen), db); t.after(app.unmount);
  await app.press('+ Add exercise'); assert.ok(app.find('Modal'));
  await act(() => (app.find('AutocompleteField', 'Exercise').props.onSelect as (id: string) => void)(exercise.id)); assertInline(app);
  await app.press(`Add set for ${exercise.name}`); assert.ok(app.find('Modal'));
  assert.ok(!app.nodes().some((node) => node.props?.label === 'Delete set'));
  await app.change('Weight (kg) *', '60'); await app.change('Reps *', '10'); await app.press('Save'); assertInline(app);
  await app.press(`Add set for ${exercise.name}`); assert.equal(app.find('FormField', 'Weight (kg) *').props.value, '60');
  assert.equal(app.find('FormField', 'Reps *').props.value, '10'); await app.change('Reps *', '9'); await app.press('Save');
  assertInline(app); await app.tapSet(`${exercise.name}, set 1. 60 kg, 10 reps`);
  await app.change('Weight (kg) *', '62,5'); await app.press('Save'); assertInline(app);
  const before = fitness.readSession(session.id).exercises[0].sets; assert.equal(before[0].weightGrams, 62500);
  await app.tapSet(`${exercise.name}, set 1. 62.5 kg, 10 reps`); await app.press('Delete set');
  assert.equal(runtime.fixture.alerts.at(-1)!.title, 'Delete set?'); assert.equal(fitness.readSession(session.id).exercises[0].sets.length, 2);
  await app.confirm('Cancel'); assert.ok(app.find('FormField', 'Weight (kg) *')); await app.press('Delete set'); await app.confirm('Delete'); assertInline(app);
  assert.deepEqual(fitness.readSession(session.id).exercises[0].sets.map((set) => set.id), [before[1].id]);
  assert.ok(app.find('Pressable', `${exercise.name}, set 1. 60 kg, 9 reps`));
  assert.ok(!app.nodes().some((node) => ['Edit', 'Delete', 'Remove exercise'].includes(String(node.props?.label))));
});

test('richer exercise creation returns naturally to inline Workout and selects the new exercise', async (t) => {
  const { db, fitness } = await initialized(t); const session = fitness.startWorkout();
  const app = await mount(createElement(screens.FitnessScreen), db); t.after(app.unmount); await app.press('+ Add exercise');
  await act(() => (app.find('AutocompleteField', 'Exercise').props.onRequestCreate as (name: string) => void)('Custom movement'));
  await act(() => (app.find('SelectField', 'Measurement type *').props.onChange as (type: string) => void)('bodyweight'));
  await app.press('Create'); assertInline(app);
  const exercise = fitness.readSession(session.id).exercises[0]; assert.equal(exercise.exerciseName, 'Custom movement'); assert.equal(exercise.measurementType, 'bodyweight');
  assert.ok(app.find('FormButton', 'Add set for Custom movement'));
});

test('quiet notes and contextual exercise removal preserve notes and require destructive confirmation', async (t) => {
  const { db, fitness } = await initialized(t); const session = fitness.startWorkout(); const exercise = strength(fitness);
  fitness.addSessionExercise(session.id, exercise.id); const app = await mount(createElement(screens.FitnessScreen), db); t.after(app.unmount);
  assert.equal(app.find('FormButton', `Note for ${exercise.name}`).props.variant, 'quiet');
  await app.press(`Note for ${exercise.name}`); await app.change('Note (optional)', 'Shoulder feels tight'); await app.press('Save'); assertInline(app);
  await app.press('Add workout note'); await app.change('Note (optional)', 'Easy session'); await app.press('Save'); assertInline(app);
  assert.equal(fitness.readSession(session.id).exercises[0].note, 'Shoulder feels tight'); assert.equal(fitness.readSession(session.id).note, 'Easy session');
  assert.ok(app.container.textContent.includes('Shoulder feels tight'));
  await app.press(`Actions for ${exercise.name}`); await app.press('Remove exercise from workout');
  assert.equal(fitness.readSession(session.id).exercises.length, 1); await app.confirm('Remove'); assertInline(app);
  assert.equal(fitness.readSession(session.id).exercises.length, 0);
});

test('Finish is persistent/primary/confirmed, returns to start state and keeps multiple completed sessions on one day in History', async (t) => {
  const { db, fitness } = await initialized(t); const first = fitness.startWorkout();
  const app = await mount(createElement(screens.FitnessScreen), db); t.after(app.unmount); assertInline(app);
  await app.press('Finish Workout'); assert.equal(fitness.readOverview().active!.id, first.id); await app.confirm('Finish Workout');
  assert.ok(app.find('FormButton', 'Start Empty Workout')); assert.equal(app.find('FormButton', 'Workout').props.selected, true);
  assert.ok(!app.nodes().some((node) => node.kind === 'Modal')); assert.equal(fitness.readOverview().active, null);
  await app.press('Start Empty Workout'); const second = fitness.readOverview().active!.id;
  await app.press('Finish Workout'); await app.confirm('Finish Workout'); await app.press('History');
  assert.equal(fitness.readOverview().history.length, 2); assert.notEqual(first.id, second);
  assert.equal(app.nodes().filter((node) => node.kind === 'FormButton' && node.props?.label === 'View workout').length, 2);
  const view = app.nodes().find((node) => node.kind === 'FormButton' && node.props?.label === 'View workout')!;
  await act(() => (view.props.onPress as () => void)()); assert.ok(app.find('Modal'));
  assert.ok(!app.nodes().some((node) => node.props?.label === '+ Add exercise')); await app.press('Back'); await app.press('Workout');
  assert.ok(app.find('FormButton', 'Start Empty Workout'));
});

test('Discard is absent beside Finish, available through quiet Workout actions and remains confirmed', async (t) => {
  const { db, fitness } = await initialized(t); fitness.startWorkout();
  const app = await mount(createElement(screens.FitnessScreen), db); t.after(app.unmount); assertInline(app);
  assert.ok(!app.nodes().some((node) => node.props?.label === 'Discard workout'));
  assert.equal(app.find('FormButton', 'Workout actions').props.variant, 'quiet'); await app.press('Workout actions');
  assert.equal(app.find('FormButton', 'Discard workout').props.variant, 'destructive'); await app.press('Discard workout');
  assert.ok(fitness.readOverview().active); await app.confirm('Cancel'); assert.ok(fitness.readOverview().active);
  await app.press('Discard workout'); await app.confirm('Discard'); assert.equal(fitness.readOverview().active, null);
  assert.ok(app.find('FormButton', 'Start Empty Workout')); assert.ok(!app.nodes().some((node) => node.kind === 'Modal'));
  assert.equal(fitness.readOverview().history.length, 0);
});

test('inline refresh failure keeps workout and the exact subordinate set draft mounted through Retry', async (t) => {
  const { db, fitness } = await initialized(t); const session = fitness.startWorkout(); const exercise = strength(fitness);
  fitness.addSessionExercise(session.id, exercise.id); const app = await mount(createElement(screens.FitnessScreen), db); t.after(app.unmount);
  runtime.fixture.failures.add('fitness.readSession'); await app.resume(); assertInline(app); assert.ok(app.find('FormError'));
  await app.press(`Add set for ${exercise.name}`); await app.change('Weight (kg) *', '12,345'); await app.change('Reps *', '8');
  const modal = app.find('Modal'); const field = app.find('FormField', 'Weight (kg) *'); await app.resume();
  assert.equal(app.find('Modal'), modal); assert.equal(app.find('FormField', 'Weight (kg) *'), field); assert.equal(field.props.value, '12,345');
  runtime.fixture.failures.clear(); await app.press('Retry'); assert.equal(app.find('Modal'), modal); assert.equal(field.props.value, '12,345');
  await app.press('Save'); assertInline(app); assert.equal(fitness.readSession(session.id).exercises[0].sets[0].weightGrams, 12345);
});

test('larger text gives duration fields room to wrap, retaining paired input semantics', async (t) => {
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ height: 800, width: 320, scale: 1, fontScale: 2 }));
  const { db, fitness } = await initialized(t); const session = fitness.startWorkout();
  const exercise = fitness.readOverview().exercises.find((row) => row.measurementType === 'duration')!; fitness.addSessionExercise(session.id, exercise.id);
  const app = await mount(createElement(screens.FitnessScreen), db); t.after(app.unmount); await app.press(`Add set for ${exercise.name}`);
  const minutes = app.find('FormField', 'Minutes'); const seconds = app.find('FormField', 'Seconds');
  const style = minutes.parentNode!.props.style as { flexBasis?: number }[];
  assert.equal(style.at(-1)!.flexBasis, 240); assert.equal(minutes.parentNode!.parentNode, seconds.parentNode!.parentNode);
  assert.equal((minutes.parentNode!.parentNode!.props.style as { flexWrap: string }).flexWrap, 'wrap');
  await app.change('Minutes', '1'); await app.change('Seconds', '30'); await app.press('Save'); assertInline(app);
});

test('Home completed-workout source entry opens read-only History while an active session remains independent', async (t) => {
  const { db, fitness } = await initialized(t); const completed = fitness.startWorkout(); fitness.finishWorkout(completed.id);
  const active = fitness.startWorkout();
  const app = await mount(createElement(screens.FitnessScreen, { initialSessionId: completed.id }), db); t.after(app.unmount);
  assert.equal(app.find('FormButton', 'History').props.selected, true); assert.ok(app.find('Modal'));
  assert.ok(!app.nodes().some((node) => node.kind === 'FormField')); await app.press('Back');
  assert.equal(app.find('FormButton', 'History').props.selected, true); await app.press('Workout'); assertInline(app);
  assert.equal(fitness.readOverview().active!.id, active.id);
});

for (const [type, labels, values, display] of [
  ['strength', ['Weight (kg) *', 'Reps *'], ['60', '10'], ['60 kg', '10 reps']],
  ['bodyweight', ['Reps *', 'Added weight (kg, optional)'], ['8', '10'], ['8 reps', '+10 kg']],
  ['duration', ['Minutes', 'Seconds'], ['1', '30'], ['1:30']],
  ['distance', ['Distance (km)', 'Minutes (optional)', 'Seconds'], ['2.5', '14', '32'], ['2.5 km', '14:32']],
] as [MeasurementType, string[], string[], string[]][]) {
  test(`${type} logging prioritizes required values, preserves parsing and renders friendly inline performance`, async (t) => {
    const { db, fitness } = await initialized(t); const session = fitness.startWorkout();
    const exercise = fitness.readOverview().exercises.find((row) => row.measurementType === type)!; fitness.addSessionExercise(session.id, exercise.id);
    const app = await mount(createElement(screens.FitnessScreen), db); t.after(app.unmount); await app.press(`Add set for ${exercise.name}`);
    const fields = app.nodes().filter((node) => node.kind === 'FormField'); assert.deepEqual(fields.map((node) => node.props?.label), labels);
    assert.equal(fields[0].props.autoFocus, true); assert.ok(fields.slice(1).every((node) => !node.props.autoFocus));
    if (type === 'duration' || type === 'distance') {
      const minutes = app.find('FormField', type === 'duration' ? 'Minutes' : 'Minutes (optional)');
      const seconds = app.find('FormField', 'Seconds'); assert.equal(minutes.parentNode!.parentNode, seconds.parentNode!.parentNode);
      const layout = minutes.parentNode!.parentNode!.props.style as { flexDirection: string; flexWrap: string };
      assert.equal(layout.flexDirection, 'row'); assert.equal(layout.flexWrap, 'wrap'); assert.ok(app.container.textContent.includes('Seconds: 0\u201359'));
    }
    for (let i = 0; i < labels.length; i++) await app.change(labels[i], values[i]); await app.press('Save'); assertInline(app);
    const set = fitness.readSession(session.id).exercises[0].sets[0]; assert.deepEqual(workoutSetPresentation(set).values, display);
    const row = app.find('Pressable', `${exercise.name}, set 1. ${workoutSetPresentation(set).spoken}`);
    assert.ok(row.props.accessibilityHint); assert.ok(display.every((value) => row.textContent.includes(value)));
    assert.ok(!row.textContent.includes('grams')); if (type === 'bodyweight') assert.equal(set.weightGrams, 10000);
  });
}

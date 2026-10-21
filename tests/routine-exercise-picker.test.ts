/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { createFitnessDataAccess } from '../src/features/fitness/data';
import { blankTargets, exerciseResults } from '../src/features/fitness/form';
import { seedFitnessExercises } from '../src/features/fitness/seed';
import type { Exercise } from '../src/features/fitness/types';
import { bundledMigrations, database } from './helpers/database';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

type App = Awaited<ReturnType<typeof mount>>;
async function setup(t: TestContext) {
  const f = database(); await migrate(f.db, bundledMigrations); seedFitnessExercises(f.db); t.after(() => f.sqlite.close());
  const fitness = createFitnessDataAccess(f.db, randomUUID), exercises = fitness.readOverview().exercises;
  const id = fitness.createRoutine({ name: 'Picker plan', exercises: exercises.slice(0, 2).map(exercise => ({ id: null, exerciseId: exercise.id,
    targets: { ...blankTargets(), setCount: '3', repMin: '8', repMax: '12' } })) });
  const open = async () => { const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount); await app.press('Routines');
    await app.tapSet('Open Picker plan, 2 exercises'); return app; };
  return { ...f, fitness, exercises, id, open };
}
const rows = (app: App) => app.nodes().find(node => node.props?.testID === 'routine-exercise-results')!;
const ids = (app: App) => (rows(app).props.data as Exercise[]).map(row => row.id);
async function nativeBack(app: App) { await act(() => (app.find('Modal').props.onRequestClose as () => void)()); }
async function choose(app: App, exercise: Exercise) { const row = app.nodes().find(node => node.props?.testID === `exercise-result-${exercise.id}`)!;
  await app.tapSet(row.props.accessibilityLabel as string); }

for (const theme of ['light', 'dark']) test(`${theme}: Add opens one focused full-width picker with useful ordered results, no autocomplete and no Save`, async t => {
  t.mock.method(runtime.native as { useColorScheme: () => string }, 'useColorScheme', () => theme);
  let dismissed = 0;
  t.mock.method((runtime.native as { Keyboard: { dismiss: () => void } }).Keyboard, 'dismiss', () => { dismissed++; });
  const f = await setup(t), app = await f.open(); await app.press('Add exercise');
  assert.match(app.container.textContent, /Choose an exercise for this routine/); assert.ok(rows(app));
  assert.equal(app.nodes().filter(node => node.kind === 'Modal').length, 1);
  const modal = app.find('Modal'); assert.ok(!app.nodes(modal).some(node => node.kind === 'AutocompleteField' || node.props?.label === 'Save'));
  assert.equal(app.find('FormField', 'Search exercises').props.appearance, 'v2'); assert.equal(app.find('FormField', 'Search exercises').props.autoFocus, true);
  const beforeSubmit = dismissed; await act(() => (app.find('FormField', 'Search exercises').props.onSubmitEditing as () => void)()); assert.equal(dismissed, beforeSubmit + 1);
  assert.deepEqual(ids(app), exerciseResults(f.exercises, '', f.exercises.length).suggestions.map(row => row.value));
  assert.equal(rows(app).props.keyboardShouldPersistTaps, 'handled'); assert.equal(rows(app).props.keyboardDismissMode, 'on-drag');
  assert.ok(app.find('FormButton', 'Create new exercise')); assert.ok(app.find('FormButton', 'Back to routine editor'));
});

test('search preserves case/whitespace/canonical matching and alphabetical order, excludes archives and exposes an empty state', async t => {
  const f = await setup(t); const archived = f.fitness.createExercise({ name: 'Archived row', measurementType: 'strength' }); f.fitness.archiveExercise(archived.id);
  const app = await f.open(); await app.press('Add exercise');
  for (const query of ['  bEnCh  ', 'press', 'Archived row', 'nothing matches']) {
    await app.change('Search exercises', query);
    assert.deepEqual(ids(app), exerciseResults(f.fitness.readOverview().exercises, query, 100).suggestions.map(row => row.value));
  }
  assert.match(app.container.textContent, /No exercises found\./); assert.equal(app.find('FormButton', 'Create new exercise').props.disabled, false);
  await app.change('Search exercises', 'Bench Press'); assert.equal(app.find('FormButton', 'Create new exercise').props.disabled, true);
});

test('result rows announce name/type/action and reuse icons for measurement types, including custom names', async t => {
  const f = await setup(t); const custom = f.fitness.createExercise({ name: 'A timer label that measures strength', measurementType: 'strength' });
  const app = await f.open(); await app.press('Add exercise'); const expected = { strength: 'dumbbell', bodyweight: 'activity', duration: 'timer', distance: 'route' };
  for (const exercise of [custom, ...f.exercises]) {
    const row = app.nodes().find(node => node.props?.testID === `exercise-result-${exercise.id}`)!; assert.ok(row);
    assert.ok(String(row.props.accessibilityLabel).includes(exercise.name)); assert.match(String(row.props.accessibilityHint), /Adds this exercise/);
    const icons = app.nodes(row).filter(node => Object.values(expected).some(icon => node.props?.testID === `icon-${icon}`));
    assert.deepEqual(icons.map(node => node.props.testID), [`icon-${expected[exercise.measurementType]}`]);
  }
  assert.match(app.container.textContent, /Strength · Weight \+ reps/); assert.match(app.container.textContent, /Duration · Time/);
});

test('selection and repeated selection retain the working name/order/targets and save distinct entries', async t => {
  const f = await setup(t), app = await f.open(); const before = f.fitness.readRoutine(f.id);
  await app.change('Routine name *', 'Unsaved picker plan'); await app.press(`Move ${before.exercises[1].exercise.name} up`);
  await app.press(`Configure targets for ${before.exercises[0].exercise.name}`); await app.change('Planned sets (optional, 1–100)', '6');
  for (let i = 0; i < 2; i++) { await app.press('Add exercise'); await choose(app, f.exercises[0]); assert.equal(app.find('FormField', 'Routine name *').props.value, 'Unsaved picker plan'); }
  assert.equal(app.find('FormField', 'Planned sets (optional, 1–100)').props.value, '6'); await app.press('Save'); const saved = f.fitness.readRoutine(f.id);
  assert.deepEqual(saved.exercises.slice(0, 2).map(row => row.id), [before.exercises[1].id, before.exercises[0].id]);
  assert.equal(saved.exercises[1].targetSetCount, 6); assert.equal(saved.exercises.length, 4); assert.equal(new Set(saved.exercises.map(row => row.id)).size, 4);
});

test('native Back/outside and creation cancellation return through nested steps, preserving query/draft and F1 refresh protection', async t => {
  const f = await setup(t), app = await f.open(); await app.change('Routine name *', 'Intact draft'); await app.press('Add exercise'); await app.change('Search exercises', 'My new movement');
  const search = app.find('FormField', 'Search exercises'); runtime.fixture.failures.add('fitness.readRoutineSummaries'); await app.resume();
  assert.equal(app.find('FormField', 'Search exercises'), search); runtime.fixture.failures.clear(); await app.press('Retry');
  await app.press('Create new exercise'); assert.equal(app.find('FormField', 'Name *').props.value, 'My new movement'); await nativeBack(app);
  assert.equal(app.find('FormField', 'Search exercises').props.value, 'My new movement'); await nativeBack(app);
  assert.equal(app.find('FormField', 'Routine name *').props.value, 'Intact draft');
  await app.press('Add exercise'); await app.tapSet('Close sheet'); assert.equal(app.find('FormField', 'Routine name *').props.value, 'Intact draft');
  assert.equal(f.fitness.readRoutine(f.id).name, 'Picker plan'); assert.ok(!f.fitness.readOverview().exercises.some(row => row.name === 'My new movement'));
});

test('Create seeds from search, persists once and returns with the new exercise added to the intact draft', async t => {
  const f = await setup(t), app = await f.open(); await app.change('Routine name *', 'Created plan'); await app.press('Add exercise');
  await app.change('Search exercises', 'My timed exercise'); await app.press('Create new exercise');
  assert.equal(app.find('FormField', 'Name *').props.value, 'My timed exercise'); assert.equal(app.find('SelectField', 'Measurement type *').props.appearance, 'v2');
  await act(() => (app.find('SelectField', 'Measurement type *').props.onChange as (type: string) => void)('duration')); await app.press('Create');
  assert.equal(app.find('FormField', 'Routine name *').props.value, 'Created plan'); assert.match(app.container.textContent, /My timed exercise/);
  assert.equal(f.fitness.readOverview().exercises.filter(row => row.name === 'My timed exercise').length, 1);
  await app.press('Save'); assert.equal(f.fitness.readRoutine(f.id).exercises.at(-1)!.measurementType, 'duration');
});

for (const [width, fontScale] of [[320, 1], [390, 1], [430, 1], [320, 2]]) test(`${width}/${fontScale}: large result libraries are virtualized without the old 20-result cap and rows wrap`, async t => {
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width, height: 844, scale: 1, fontScale }));
  const f = await setup(t); for (let i = 0; i < 100; i++) f.fitness.createExercise({ name: `Long custom movement for accessible search ${String(i).padStart(3, '0')}`, measurementType: 'bodyweight' });
  const app = await f.open(); await app.press('Add exercise'); await app.change('Search exercises', 'Long custom movement');
  const list = rows(app); assert.equal(ids(app).length, 100); assert.equal(new Set(ids(app)).size, 100);
  assert.equal(list.props.initialNumToRender, 8); assert.equal(list.props.windowSize, 5); assert.equal(list.props.getItemLayout, undefined);
  assert.equal(exerciseResults(f.fitness.readOverview().exercises, 'Long custom movement').suggestions.length, 20);
  assert.ok(app.find('FormButton', 'Create new exercise')); assert.ok(!app.nodes(app.find('Modal')).some(node => node.props?.numberOfLines === 1));
});

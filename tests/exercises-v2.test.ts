/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { DesignColors } from '../src/constants/design-system-v2';
import { createFitnessDataAccess } from '../src/features/fitness/data';
import { blankSet, blankTargets } from '../src/features/fitness/form';
import { exerciseMeasurementLabel, exerciseTypeLabel } from '../src/features/fitness/management-presentation';
import { seedFitnessExercises } from '../src/features/fitness/seed';
import type { Exercise, MeasurementType } from '../src/features/fitness/types';
import { bundledMigrations, database } from './helpers/database';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

type App = Awaited<ReturnType<typeof mount>>;
async function fixture(t: TestContext, seed = true) {
  const f = database(); await migrate(f.db, bundledMigrations); if (seed) seedFitnessExercises(f.db);
  t.after(() => f.sqlite.close());
  const fitness = createFitnessDataAccess(f.db, randomUUID);
  return { ...f, fitness, create: (name: string, measurementType: MeasurementType = 'strength') => fitness.createExercise({ name, measurementType }) };
}
async function show(t: TestContext, f: Awaited<ReturnType<typeof fixture>>) {
  const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount); await app.press('Exercises'); return app;
}
const rows = (app: App) => app.find('FlatList').props.data as Exercise[];
const card = (app: App, exercise: Exercise) => app.nodes().find(node => node.props?.testID === `exercise-library-card-${exercise.id}`)!;
const label = (exercise: Exercise) => `Open ${exercise.name}, ${exerciseTypeLabel(exercise.measurementType)}, ${exerciseMeasurementLabel(exercise.measurementType)}${exercise.deletedAt !== null ? ', Archived' : ''}`;
async function archived(app: App, value: boolean) {
  await act(() => (app.find('SegmentedControl', 'Exercise library').props.onChange as (value: number) => void)(value ? 1 : 0));
}
async function action(app: App, name: string) {
  await app.press(`Options for ${name}`); await app.press(`Archive ${name}`); await act(() => new Promise(resolve => setTimeout(resolve, 20)));
  assert.equal(app.find('FormButton', `Options for ${name}`).props.expanded, false);
}
function flatten(style: unknown): Record<string, unknown> {
  return Object.assign({}, ...(Array.isArray(style) ? style.map(flatten) : [style ?? {}]));
}

for (const theme of ['light', 'dark'] as const) test(`${theme}: Exercise library owns controls, v2 cards and the unchanged four Fitness destinations`, async t => {
  t.mock.method(runtime.native as { useColorScheme: () => string }, 'useColorScheme', () => theme);
  const f = await fixture(t), custom = f.create('Custom movement'), old = f.create('Archived movement'); f.fitness.archiveExercise(old.id);
  const app = await show(t, f);
  for (const name of ['Workout', 'Routines', 'Exercises', 'History']) assert.equal(app.find('FormButton', name).props.appearance, 'v2');
  assert.equal(app.find('FormButton', 'Exercises').props.selected, true);
  assert.equal(app.find('FormButton', 'New exercise').props.variant, 'primary'); assert.equal(app.find('SegmentedControl', 'Exercise library').props.appearance, 'v2');
  assert.equal(app.find('FormField', 'Search exercises').props.appearance, 'v2'); assert.equal(app.find('FormField', 'Search exercises').props.showLabel, false);
  assert.ok(rows(app).every(row => row.deletedAt === null)); assert.equal(flatten(card(app, custom).props.style).backgroundColor, DesignColors[theme].group);
  assert.equal(card(app, custom).props.accessibilityRole, undefined); assert.ok(app.find('Pressable', label(custom)));
  const controls = app.nodes().find(node => node.props?.testID === 'exercise-library-controls')!;
  assert.ok(app.nodes(controls).some(node => node.kind === 'FormField')); assert.ok(!app.nodes(controls).some(node => String(node.props?.testID).startsWith('exercise-library-card-')));
  assert.equal(app.nodes().filter(node => node.kind === 'FormButton' && node.props.label === 'New exercise').length, 1);
  await archived(app, true); assert.deepEqual(rows(app).map(row => row.id), [old.id]);
  const oldRow = rows(app)[0]; assert.ok(card(app, oldRow).textContent.includes('Archived')); assert.ok(app.find('Pressable', label(oldRow)));
  assert.ok(!app.nodes().some(node => node.props?.accessibilityLabel === `Options for ${old.name}`));
});

test('library search retains trim/case-insensitive, accent-sensitive matching and source order within the selected collection', async t => {
  const f = await fixture(t, false); const accented = f.create('Álvaro'), plain = f.create('Alvaro'), another = f.create('Alvaro session'), old = f.create('Old Alvaro'); f.fitness.archiveExercise(old.id);
  const app = await show(t, f); const source = f.fitness.readOverview().exercises;
  await app.change('Search exercises', '  ALVARO  '); assert.deepEqual(rows(app).map(row => row.id), source.filter(row => [plain.id, another.id].includes(row.id)).map(row => row.id));
  assert.ok(!rows(app).some(row => row.id === accented.id)); await archived(app, true); assert.deepEqual(rows(app).map(row => row.id), [old.id]);
  assert.equal(app.find('FormField', 'Search exercises').props.value, '  ALVARO  ');
  await app.change('Search exercises', 'nothing matches'); assert.ok(app.container.textContent.includes('No exercises found.'));
  assert.ok(!app.container.textContent.includes('No archived exercises yet.')); assert.ok(!app.nodes().some(node => String(node.props?.label).includes('+ Create')));
  await app.change('Search exercises', ''); await archived(app, false); assert.deepEqual(rows(app).map(row => row.id), source.filter(row => row.deletedAt === null).map(row => row.id));
});

test('all measurement icons and metadata derive only from type, even when custom names suggest a different type', async t => {
  const f = await fixture(t, false);
  const types = [{ name: 'Arthur Mega Press', type: 'distance', icon: 'route' }, { name: 'Custom running', type: 'strength', icon: 'dumbbell' },
    { name: 'Bench Press Timer', type: 'duration', icon: 'timer' }, { name: 'Custom barbell', type: 'bodyweight', icon: 'activity' }] as const;
  const exercises = types.map(row => f.create(row.name, row.type)); const app = await show(t, f);
  for (const [index, exercise] of exercises.entries()) {
    const icons = app.nodes(card(app, exercise)).filter(node => String(node.props?.testID).startsWith('icon-'));
    assert.deepEqual(icons.map(node => node.props.testID), [`icon-${types[index].icon}`]);
    assert.ok(icons.every(node => node.props.accessible === false)); assert.ok(card(app, exercise).textContent.includes(`${exerciseTypeLabel(exercise.measurementType)} · ${exerciseMeasurementLabel(exercise.measurementType)}`));
    assert.ok(app.find('Pressable', label(exercise)));
  }
});

test('only active custom records expose Archive; built-in and archived identities open read-only v2 details without Edit/Restore/Delete', async t => {
  const f = await fixture(t), active = f.create('Active movement'), old = f.create('Old movement'); f.fitness.archiveExercise(old.id);
  const builtin = f.fitness.readOverview().exercises.find(row => row.isBuiltIn)!; const app = await show(t, f);
  assert.ok(app.find('FormButton', `Options for ${active.name}`)); assert.ok(!app.nodes().some(node => node.props?.accessibilityLabel === `Options for ${builtin.name}`));
  await app.tapSet(label(builtin)); assert.ok(app.container.textContent.includes('cannot be archived')); await app.press('Back');
  await app.tapSet(label(active)); assert.ok(app.container.textContent.includes('Custom exercise.')); await app.press('Back');
  await archived(app, true); const archivedExercise = rows(app)[0]; await app.tapSet(label(archivedExercise));
  assert.ok(app.container.textContent.includes('Archived. Existing routine references'));
  assert.ok(!app.nodes(app.find('Modal')).some(node => node.kind === 'FormField' || node.props?.label === 'Save' || node.props?.label === 'Restore' || node.props?.label === 'Delete' || node.props?.label === 'Edit'));
  assert.equal('editExercise' in f.fitness, false); assert.throws(() => f.fitness.archiveExercise(builtin.id), /Built-in/);
});

test('archive keeps native confirmation/Cancel, routine targets and existing active/completed session snapshots; new choices/workouts omit it', async t => {
  const f = await fixture(t), exercise = f.create('Archive me');
  const routine = f.fitness.createRoutine({ name: 'Saved routine', exercises: [{ id: null, exerciseId: exercise.id, targets: { ...blankTargets(), setCount: '3' } }] });
  const completed = f.fitness.startWorkout(routine); f.fitness.addSet(f.fitness.readSession(completed.id).exercises[0].id, { ...blankSet(), weight: '10', reps: '8' }); f.fitness.finishWorkout(completed.id);
  const active = f.fitness.startWorkout(routine), before = f.fitness.readSession(completed.id); const app = await show(t, f);
  await action(app, exercise.name); await app.confirm('Cancel'); assert.ok(rows(app).some(row => row.id === exercise.id));
  await action(app, exercise.name); assert.equal(f.fitness.readOverview().exercises.find(row => row.id === exercise.id)!.deletedAt, null); await app.confirm('Archive');
  assert.ok(!rows(app).some(row => row.id === exercise.id)); const retained = f.fitness.readRoutine(routine).exercises[0];
  assert.equal(retained.exerciseId, exercise.id); assert.equal(retained.targetSetCount, 3); assert.ok(retained.exercise.deletedAt);
  assert.deepEqual(f.fitness.readSession(completed.id), before); assert.equal(f.fitness.readSession(active.id).exercises[0].exerciseName, exercise.name);
  assert.throws(() => f.fitness.createRoutine({ name: 'Invalid new routine', exercises: [{ id: null, exerciseId: exercise.id, targets: blankTargets() }] }), /active exercise/);
  f.fitness.discardWorkout(active.id); assert.equal(f.fitness.readSession(f.fitness.startWorkout(routine).id).exercises.length, 0);
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []); assert.equal(f.sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
});

for (const type of ['strength', 'bodyweight', 'duration', 'distance'] as const) test(`New exercise preserves ${type} creation/validation and returns to the same library`, async t => {
  const f = await fixture(t), app = await show(t, f); await app.press('New exercise'); await app.press('Create');
  assert.ok(app.container.textContent.includes('between 1 and 120')); await app.change('Name *', `New ${type}`);
  await act(() => (app.find('SelectField', 'Measurement type *').props.onChange as (value: MeasurementType) => void)(type));
  assert.equal(app.find('FormField', 'Name *').props.appearance, 'v2'); assert.equal(app.find('SelectField', 'Measurement type *').props.appearance, 'v2');
  await app.press('Create'); const created = f.fitness.readOverview().exercises.find(row => row.name === `New ${type}`)!;
  assert.equal(created.measurementType, type); assert.equal(created.isBuiltIn, false); assert.ok(!app.nodes().some(node => node.kind === 'Modal'));
  assert.ok(rows(app).some(row => row.id === created.id)); assert.equal(app.find('FormButton', 'Exercises').props.selected, true);
});

test('New exercise retains canonical active-name protection and archived-name reuse; Cancel creates nothing', async t => {
  const f = await fixture(t), original = f.create('Álvaro'); const app = await show(t, f);
  await app.press('New exercise'); await app.change('Name *', 'A\u0301LVARO'); await app.press('Create'); assert.ok(app.container.textContent.includes('already exists'));
  await app.change('Name *', 'Alvaro'); await app.press('Create'); assert.ok(rows(app).some(row => row.name === 'Alvaro' && row.id !== original.id));
  f.fitness.archiveExercise(original.id); await app.resume(); await app.press('New exercise'); await app.change('Name *', '  ÁLVARO  '); await app.press('Create');
  assert.equal(f.fitness.readOverview().exercises.filter(row => row.deletedAt === null && row.name === 'ÁLVARO').length, 1);
  const count = f.fitness.readOverview().exercises.length; await app.press('New exercise'); await app.change('Name *', 'Canceled draft'); await app.press('Cancel');
  assert.equal(f.fitness.readOverview().exercises.length, count);
});

test('empty Active/Archived states retain one New action and are distinct from no search results', async t => {
  const f = await fixture(t, false), app = await show(t, f); assert.ok(app.container.textContent.includes('No active exercises yet.'));
  await archived(app, true); assert.ok(app.container.textContent.includes('No archived exercises yet.'));
  assert.equal(app.nodes().filter(node => node.kind === 'FormButton' && node.props.label === 'New exercise').length, 1);
  await app.change('Search exercises', 'test'); assert.ok(app.container.textContent.includes('No exercises found.'));
});

test('failed refresh retains search/filter/list and the same unsaved creation draft through Retry', async t => {
  const f = await fixture(t), app = await show(t, f); await app.change('Search exercises', 'Bench'); const list = app.find('FlatList');
  await app.press('New exercise'); await app.change('Name *', 'Unsaved name');
  await act(() => (app.find('SelectField', 'Measurement type *').props.onChange as (value: string) => void)('duration')); const field = app.find('FormField', 'Name *');
  runtime.fixture.failures.add('fitness.readOverview'); await app.resume(); assert.ok(app.nodes().includes(list)); assert.equal(app.find('FormField', 'Name *'), field);
  runtime.fixture.failures.clear(); await app.press('Retry'); assert.equal(app.find('FormField', 'Name *'), field); assert.equal(field.props.value, 'Unsaved name');
  assert.equal(app.find('SelectField', 'Measurement type *').props.value, 'duration'); await app.press('Cancel');
  assert.equal(app.find('FormField', 'Search exercises').props.value, 'Bench'); assert.equal(app.find('FlatList'), list);
});

for (const [width, fontScale] of [[320, 1], [390, 1], [430, 1], [320, 2]]) test(`${width}/${fontScale}: long names and summaries wrap; library uses stable virtualized IDs without per-row reads`, async t => {
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width, fontScale, height: 844, scale: 1 }));
  const f = await fixture(t, false); const long = f.create('Long movement name for balance, controlled recovery and deliberate strength', 'distance');
  for (let i = 0; i < 140; i++) f.create(`Movement ${String(i).padStart(3, '0')}`);
  const app = await show(t, f), list = app.find('FlatList'); assert.equal(rows(app).length, 141); assert.equal(list.props.getItemLayout, undefined);
  assert.equal((list.props.keyExtractor as (exercise: Exercise) => string)(long), long.id); assert.ok(Number(list.props.initialNumToRender) < 141);
  assert.equal(list.props.keyboardShouldPersistTaps, 'handled'); assert.equal(list.props.keyboardDismissMode, 'on-drag'); assert.equal(list.props.automaticallyAdjustKeyboardInsets, true);
  assert.equal(flatten(card(app, long).props.style).height, undefined); assert.ok(app.nodes(card(app, long)).filter(node => node.kind === 'ThemedText').every(node => node.props.numberOfLines === undefined && node.props.allowFontScaling !== false));
  if (fontScale >= 1.5) assert.equal(flatten(card(app, long).props.style).alignItems, 'flex-start');
  assert.ok(!runtime.fixture.reads.includes('fitness.readRoutines') && !runtime.fixture.reads.includes('fitness.readRoutine'));
  const before = [...runtime.fixture.reads]; await app.change('Search exercises', 'Movement'); await archived(app, true); assert.deepEqual(runtime.fixture.reads, before);
  assert.equal(runtime.fixture.layoutAnimations.length, 0);
});

test('Exercises retains its own scroll position independently from other Fitness destinations', async t => {
  const f = await fixture(t), app = await show(t, f);
  await act(() => (app.find('FlatList').props.onScroll as (event: unknown) => void)({ nativeEvent: { contentOffset: { y: 270 } } }));
  await app.press('Routines'); await app.press('Exercises'); assert.deepEqual(app.find('FlatList').props.contentOffset, { x: 0, y: 270 });
});

/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { createFitnessDataAccess } from '../src/features/fitness/data';
import { blankTargets } from '../src/features/fitness/form';
import { seedFitnessExercises } from '../src/features/fitness/seed';
import type { Exercise, MeasurementType } from '../src/features/fitness/types';
import { bundledMigrations, database } from './helpers/database';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

type App = Awaited<ReturnType<typeof mount>>;
async function fixture(t: TestContext) {
  const f = database(); await migrate(f.db, bundledMigrations); seedFitnessExercises(f.db); t.after(() => f.sqlite.close());
  const fitness = createFitnessDataAccess(f.db, randomUUID);
  const exercises = ['strength', 'bodyweight', 'duration', 'distance'].map(type => fitness.readOverview().exercises.find(row => row.measurementType === type)!);
  return { ...f, fitness, exercises, create: (name: string, rows = exercises) => fitness.createRoutine({ name, exercises: rows.map((exercise, index) => ({
    id: null, exerciseId: exercise.id, targets: { ...blankTargets(), setCount: String(index + 2), ...(exercise.measurementType === 'strength' ? { repMin: '8', repMax: '12' }
      : exercise.measurementType === 'duration' ? { minutes: '1', seconds: '30' } : exercise.measurementType === 'distance' ? { distance: '2.5' } : {}) },
  })) }) };
}
async function open(t: TestContext, f: Awaited<ReturnType<typeof fixture>>, name?: string) {
  const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount); await app.press('Routines');
  if (name) { const node = app.nodes().find(row => String(row.props?.accessibilityLabel ?? '').startsWith(`Open ${name},`))!;
    await app.tapSet(node.props.accessibilityLabel as string); }
  else await app.press('New routine');
  return app;
}
function editorList(app: App) { return app.nodes().find(row => row.kind === 'FlatList' && row.props?.testID === 'routine-composition-list')!; }
async function add(app: App, exercise: Exercise) { await app.press('Add exercise'); await app.tapSet(`${exercise.name}, ${exercise.measurementType === 'strength' ? 'Strength, Weight + reps' : 'Bodyweight, Reps · optional added weight'}`); }

for (const theme of ['light', 'dark']) test(`${theme}: New routine v2 shares owned sections, empty state and header action; Save retains required-name validation`, async t => {
  t.mock.method(runtime.native as { useColorScheme: () => string }, 'useColorScheme', () => theme);
  const f = await fixture(t), app = await open(t, f);
  assert.match(app.container.textContent, /New routine/); assert.match(app.container.textContent, /No exercises yet\./);
  assert.match(app.container.textContent, /Add exercises to build this routine/);
  assert.equal(app.find('FormField', 'Routine name *').props.appearance, 'v2');
  assert.equal(app.find('FormButton', 'Add exercise').props.leadingIcon, 'plus');
  assert.equal(app.find('FormButton', 'Save').props.appearance, 'v2');
  assert.equal(app.find('FormButton', 'Cancel').props.leadingIcon, 'back'); assert.equal(app.find('FormButton', 'Cancel').props.label, 'Cancel');
  assert.ok(app.nodes().some(row => row.props?.testID === 'editor-section-routine'));
  await app.press('Save'); assert.match(app.container.textContent, /Enter a name between 1 and 120 characters/); assert.equal(f.fitness.readRoutineSummaries().length, 0);
  await app.change('Routine name *', '  New plan  '); await app.press('Save');
  assert.equal(f.fitness.readRoutineSummaries()[0].name, 'New plan'); assert.ok(!app.nodes().some(row => row.kind === 'Modal'));
});

for (const theme of ['light', 'dark']) test(`${theme}: repeated measurement types reuse their semantic icons regardless of built-in or custom exercise names`, async t => {
  t.mock.method(runtime.native as { useColorScheme: () => string }, 'useColorScheme', () => theme);
  const f = await fixture(t);
  const expected: Record<MeasurementType, string> = { strength: 'dumbbell', bodyweight: 'activity', duration: 'timer', distance: 'route' };
  const sources = f.exercises.flatMap(exercise => [exercise, f.fitness.createExercise({ name: `Timer and running label for ${exercise.measurementType}`, measurementType: exercise.measurementType })]);
  const id = f.create('Semantic icons', sources); const app = await open(t, f, 'Semantic icons');
  for (const entry of f.fitness.readRoutine(id).exercises) {
    const card = app.nodes().find(node => node.props?.testID === `routine-entry-${entry.id}`)!; assert.ok(card);
    const icons = app.nodes(card).filter(node => Object.values(expected).some(icon => node.props?.testID === `icon-${icon}`));
    assert.deepEqual(icons.map(node => node.props.testID), [`icon-${expected[entry.measurementType]}`]);
    assert.ok(app.nodes(card).some(node => String(node.props?.children).includes(entry.exercise.name)));
  }
  const modal = app.find('Modal');
  assert.equal(app.nodes(modal).filter(node => node.kind === 'FormButton' && node.props?.label === 'Add exercise').length, 1);
  assert.ok(!app.nodes(modal).some(node => String(node.props?.accessibilityLabel ?? '').startsWith('Options for ')));
});

test('Edit derives all measurement icons, individual target summaries, and count from the current draft', async t => {
  const f = await fixture(t); f.create('Mixed'); const app = await open(t, f, 'Mixed');
  assert.match(app.container.textContent, /Edit routine/); assert.match(app.container.textContent, /4 exercises/);
  for (const icon of ['dumbbell', 'activity', 'timer', 'route']) assert.ok(app.nodes().some(row => row.props?.testID === `icon-${icon}`));
  for (const text of ['2 planned sets · 8–12 reps', '3 planned sets', '4 planned sets · 1 min 30 sec', '5 planned sets · 2.5 km']) assert.ok(app.container.textContent.includes(text), text);
  const modal = app.find('Modal');
  assert.ok(!app.container.textContent.includes('planned sets each')); assert.ok(!app.nodes(modal).some(row => String(row.props?.accessibilityLabel).startsWith('Options for ')));
  await app.press(`Remove ${f.exercises[3].name} from routine`); assert.match(app.container.textContent, /3 exercises/);
  assert.equal(runtime.fixture.alerts.length, 0); // Removal remains immediate in the draft.
});

test('reordering retains entry identity and targets, updates numbered order, and disables the first/last boundaries', async t => {
  const f = await fixture(t); const id = f.create('Ordered', f.exercises.slice(0, 3)), before = f.fitness.readRoutine(id);
  const app = await open(t, f, 'Ordered'); const [first, middle, last] = f.exercises;
  assert.equal(app.find('FormButton', `Move ${first.name} up`).props.disabled, true);
  assert.equal(app.find('FormButton', `Move ${last.name} down`).props.disabled, true);
  assert.equal(app.find('FormButton', `Move ${middle.name} up`).props.disabled, false);
  assert.equal(app.find('FormButton', `Move ${middle.name} down`).props.disabled, false);
  assert.equal(app.find('FormButton', `Move ${middle.name} up`).props.icon, 'up');
  await app.press(`Move ${middle.name} up`); assert.match(app.container.textContent, new RegExp(`1\\. ${middle.name}`));
  await app.press(`Move ${first.name} down`); await app.press('Save'); const saved = f.fitness.readRoutine(id);
  assert.deepEqual(saved.exercises.map(row => row.id), [before.exercises[1].id, before.exercises[2].id, before.exercises[0].id]);
  assert.deepEqual(saved.exercises.map(row => row.targetSetCount), [3, 4, 2]);
});

test('Targets remains inline with type-specific v2 fields; invalid targets block Save and corrected values persist', async t => {
  const f = await fixture(t); const id = f.create('Targets'); const app = await open(t, f, 'Targets');
  await app.press(`Configure targets for ${f.exercises[0].name}`);
  for (const label of ['Planned sets (optional, 1–100)', 'Minimum reps (optional)', 'Maximum reps (optional)']) assert.equal(app.find('FormField', label).props.appearance, 'v2');
  await app.change('Planned sets (optional, 1–100)', '101'); await app.press('Save'); assert.match(app.container.textContent, /between 1 and 100/);
  await app.change('Planned sets (optional, 1–100)', '6');
  await app.press(`Configure targets for ${f.exercises[2].name}`); assert.equal(app.find('FormField', 'Minutes (optional)').props.appearance, 'v2');
  await app.change('Minutes (optional)', '2');
  await app.press(`Configure targets for ${f.exercises[3].name}`); assert.equal(app.find('SegmentedControl', 'Distance unit').props.appearance, 'v2');
  await app.change('Distance (km)', '3.5'); await app.press('Save');
  const saved = f.fitness.readRoutine(id); assert.equal(saved.exercises[0].targetSetCount, 6); assert.equal(saved.exercises[2].targetDurationSeconds, 150); assert.equal(saved.exercises[3].targetDistanceMeters, 3500);
});

test('header picker excludes archived choices, allows repeated exercises and richer creation returns to the intact draft', async t => {
  const f = await fixture(t); const old = f.fitness.createExercise({ name: 'Old custom', measurementType: 'strength' }); f.fitness.archiveExercise(old.id);
  const app = await open(t, f); await app.change('Routine name *', 'Composed');
  await add(app, f.exercises[0]); await add(app, f.exercises[0]);
  await app.press('Add exercise'); await app.change('Search exercises', 'Old custom'); assert.match(app.container.textContent, /No exercises found/);
  await app.change('Search exercises', 'New custom'); await app.press('Create new exercise');
  assert.equal(app.find('FormField', 'Name *').props.appearance, 'v2'); assert.equal(app.find('SelectField', 'Measurement type *').props.appearance, 'v2');
  await app.press('Create'); assert.equal(app.find('FormField', 'Routine name *').props.value, 'Composed'); assert.match(app.container.textContent, /3 exercises/);
  await app.press('Save'); const saved = f.fitness.readRoutine(f.fitness.readRoutineSummaries()[0].id);
  assert.deepEqual(saved.exercises.map(row => row.exercise.name), [f.exercises[0].name, f.exercises[0].name, 'New custom']);
  assert.equal(new Set(saved.exercises.map(row => row.id)).size, 3);
});

test('Cancel discards routine edits without changing persistence; canceling nested creation keeps the working routine', async t => {
  const f = await fixture(t); const id = f.create('Original', f.exercises.slice(0, 1)), app = await open(t, f, 'Original');
  await app.change('Routine name *', 'Unsaved');
  await app.press('Add exercise'); await app.change('Search exercises', 'Canceled exercise'); await app.press('Create new exercise');
  await app.press('Cancel'); assert.equal(app.find('FormField', 'Search exercises').props.value, 'Canceled exercise');
  await app.press('Back to routine editor'); assert.equal(app.find('FormField', 'Routine name *').props.value, 'Unsaved');
  await app.press(`Remove ${f.exercises[0].name} from routine`); await app.press('Cancel');
  assert.equal(f.fitness.readRoutine(id).name, 'Original'); assert.equal(f.fitness.readRoutine(id).exercises.length, 1);
  assert.ok(!f.fitness.readOverview().exercises.some(row => row.name === 'Canceled exercise'));
});

test('native Back discards the unsaved routine, and an empty-target entry never invents a set target', async t => {
  const f = await fixture(t); const id = f.fitness.createRoutine({ name: 'Native return', exercises: [{ id: null, exerciseId: f.exercises[0].id, targets: blankTargets() }] });
  const app = await open(t, f, 'Native return'); assert.match(app.container.textContent, /No targets/);
  await app.change('Routine name *', 'Not saved');
  await act(() => (app.find('Modal').props.onRequestClose as () => void)());
  assert.ok(!app.nodes().some(row => row.kind === 'Modal')); assert.equal(f.fitness.readRoutine(id).name, 'Native return');
});

test('archived exercise references stay visible while archived routines remain a v2 read-only list without editing controls', async t => {
  const f = await fixture(t); const custom = f.fitness.createExercise({ name: 'Historical exercise', measurementType: 'duration' });
  const id = f.create('Archive', [custom]); f.fitness.archiveExercise(custom.id); f.fitness.archiveRoutine(id);
  const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount); await app.press('Routines');
  await act(() => (app.find('SegmentedControl', 'Routines').props.onChange as (value: number) => void)(1)); await app.tapSet('Open Archive, 1 exercise');
  assert.match(app.container.textContent, /Read-only/); assert.match(app.container.textContent, /Historical exercise/); assert.match(app.container.textContent, /Archived — omitted from new workouts/);
  assert.ok(editorList(app));
  for (const label of ['Save', 'Targets', 'Remove', 'Up', 'Down', 'Add exercise']) assert.ok(!app.nodes().some(row => row.props?.label === label));
  assert.ok(!app.nodes().some(row => row.kind === 'FormField')); assert.throws(() => f.fitness.editRoutine(id, { name: 'Forbidden', exercises: [] }), /Archived routines/);
});

for (const [width, fontScale] of [[320, 1], [390, 1], [430, 1], [320, 2]]) test(`${width}pt/font ${fontScale}: long names wrap; list stays virtualized and actions remain labeled`, async t => {
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width, height: 844, scale: 1, fontScale }));
  const f = await fixture(t); const custom = f.fitness.createExercise({ name: 'Long exercise name for accessible routine composition and repeated movements', measurementType: 'bodyweight' });
  const id = f.create('A long routine name for accessible editing on a small screen', Array.from({ length: 80 }, () => custom)); const app = await open(t, f, f.fitness.readRoutine(id).name);
  const list = editorList(app); assert.equal(list.props.initialNumToRender, 5); assert.equal(list.props.maxToRenderPerBatch, 5); assert.equal(list.props.windowSize, 5);
  assert.equal((list.props.data as unknown[]).length, 80); assert.equal(list.props.getItemLayout, undefined);
  assert.ok(app.find('FormButton', 'Save')); assert.equal(app.find('FormField', 'Routine name *').props.value, f.fitness.readRoutine(id).name);
  const titles = app.nodes().filter(row => row.kind === 'ThemedText' && String(row.props?.children).includes(custom.name));
  assert.ok(titles.length); for (const title of titles) assert.equal(title.props.numberOfLines, undefined);
  assert.ok(app.nodes().some(row => row.props?.accessibilityLabel === `Configure targets for ${custom.name}`));
});

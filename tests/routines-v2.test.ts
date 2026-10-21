/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { fitnessRotationSteps } from '../src/database/schema';
import { createFitnessDataAccess } from '../src/features/fitness/data';
import { blankTargets } from '../src/features/fitness/form';
import { createRotationDataAccess } from '../src/features/fitness/rotations-data';
import { seedFitnessExercises } from '../src/features/fitness/seed';
import type { RoutineSummary } from '../src/features/fitness/types';
import { bundledMigrations, database } from './helpers/database';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

type App = Awaited<ReturnType<typeof mount>>;
async function fixture(t: TestContext) {
  const f = database(); await migrate(f.db, bundledMigrations); seedFitnessExercises(f.db); t.after(() => f.sqlite.close());
  const fitness = createFitnessDataAccess(f.db, randomUUID), rotations = createRotationDataAccess(f.db, randomUUID);
  const exercises = fitness.readOverview().exercises;
  return { ...f, fitness, rotations, create: (name: string, count = 0) => fitness.createRoutine({ name, exercises: exercises.slice(0, count).map(exercise => ({ id: null, exerciseId: exercise.id, targets: blankTargets() })) }) };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
async function show(t: TestContext, f: Fixture) { const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount); await app.press('Routines'); return app; }
const rows = (app: App) => app.find('FlatList').props.data as RoutineSummary[];
async function archived(app: App, value: boolean) { await act(() => (app.find('SegmentedControl', 'Routines').props.onChange as (value: number) => void)(value ? 1 : 0)); }
async function action(app: App, name: string, label: string) { await app.press(`Options for ${name}`); await app.press(label); await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); }); }

for (const theme of ['light', 'dark']) test(`${theme}: rotation card uses real ordered source names/next and routines retain identity/count/action ownership`, async t => {
  t.mock.method(runtime.native as { useColorScheme: () => string }, 'useColorScheme', () => theme);
  const f = await fixture(t); const first = f.create('Biceps, Back', 4), second = f.create('Chest, Triceps, Shoulders'), third = f.create('Legs', 1);
  const id = f.rotations.create({ name: 'Weight Training', steps: [first, second, third].map(routineId => ({ id: null, routineId })), nextStepIndex: 1 }); f.rotations.activate(id);
  const app = await show(t, f); assert.ok(app.container.textContent.includes('Weight Training')); assert.ok(app.container.textContent.includes('Biceps, Back → Chest, Triceps, Shoulders → Legs'));
  assert.ok(app.container.textContent.includes('Next: Chest, Triceps, Shoulders')); assert.equal(f.rotations.readNext()!.routine.id, second);
  assert.deepEqual(rows(app).map(row => [row.name, row.exerciseCount]), [['Biceps, Back', 4], ['Chest, Triceps, Shoulders', 0], ['Legs', 1]]);
  assert.ok(app.find('Pressable', 'Open Legs, 1 exercise')); assert.ok(app.find('Pressable', 'Open Biceps, Back, 4 exercises'));
  assert.equal(app.find('FormButton', 'New routine').props.variant, 'primary'); assert.equal(app.find('SegmentedControl', 'Routines').props.appearance, 'v2');
  for (const label of ['Workout', 'Routines', 'Exercises', 'History']) assert.equal(app.find('FormButton', label).props.appearance, 'v2');
  assert.equal(app.find('FormButton', 'Routines').props.selected, true);
  const card = app.nodes().find(node => node.props?.testID === `routine-card-${first}`)!; assert.notEqual(card.props.accessibilityRole, 'button');
  await app.press('Manage rotation'); assert.deepEqual(runtime.fixture.navigation.at(-1), { method: 'push', target: '/fitness/rotations' });
});

test('New routine uses the existing editor, persists once and immediately appears with its source count', async t => {
  const f = await fixture(t); const app = await show(t, f); await app.press('New routine'); await app.change('Routine name *', 'My new routine'); await app.press('Save');
  assert.equal(f.fitness.readRoutineSummaries().length, 1); assert.deepEqual(rows(app).map(row => [row.name, row.exerciseCount]), [['My new routine', 0]]);
  assert.equal(app.nodes().filter(node => node.kind === 'Modal').length, 0);
});

test('routine identity and overflow Edit retain the same editor; menu scroll lock/outside dismissal and Start retain semantics', async t => {
  const f = await fixture(t); const id = f.create('Plan', 1); const app = await show(t, f);
  await app.tapSet('Open Plan, 1 exercise'); assert.equal(app.find('FormField', 'Routine name *').props.value, 'Plan'); await app.press('Cancel');
  await app.press('Options for Plan'); assert.equal(app.find('FlatList').props.scrollEnabled, false);
  for (const label of ['Start Plan', 'Edit Plan', 'Archive Plan']) assert.ok(app.find('FormButton', label));
  await app.tapSet('Close options for plan'); assert.equal(app.find('FlatList').props.scrollEnabled, true);
  await action(app, 'Plan', 'Edit Plan'); await app.change('Routine name *', 'Edited plan'); await app.press('Save'); assert.equal(rows(app)[0].name, 'Edited plan');
  await action(app, 'Edited plan', 'Start Edited plan'); assert.equal(f.fitness.readOverview().active!.routineId, id); assert.ok(app.find('FormButton', 'Finish Workout'));
});

test('Archive Cancel/protection and soft archive preserve rotation references, completed History and read-only archived behavior', async t => {
  const f = await fixture(t); const id = f.create('Protected', 1); const session = f.fitness.startWorkout(id); f.fitness.finishWorkout(session.id);
  const plan = f.rotations.create({ name: 'Saved inactive plan', steps: [{ id: null, routineId: id }] }); const app = await show(t, f);
  await action(app, 'Protected', 'Archive Protected'); assert.equal(app.find('FlatList').props.scrollEnabled, true); await app.confirm('Cancel'); assert.equal(rows(app).length, 1);
  await action(app, 'Protected', 'Archive Protected'); await app.confirm('Archive'); assert.equal(f.fitness.readRoutine(id).deletedAt, null); assert.ok(app.container.textContent.includes('Remove this routine from saved rotations'));
  f.rotations.delete(plan); await action(app, 'Protected', 'Archive Protected'); await app.confirm('Archive'); assert.equal(rows(app).length, 0);
  assert.equal(f.fitness.readSession(session.id).name, 'Protected'); assert.equal(f.fitness.readSession(session.id).exercises.length, 1);
  await archived(app, true); assert.equal(rows(app)[0].id, id); assert.ok(!app.nodes().some(node => node.props?.accessibilityLabel === 'Options for Protected'));
  await app.tapSet('Open Protected, 1 exercise'); assert.ok(app.container.textContent.includes('Archived routine')); assert.ok(!app.nodes().some(node => node.kind === 'FormField' || node.props?.label === 'Save'));
  assert.throws(() => f.fitness.startWorkout(id), /active routine/); assert.equal(f.fitness.readHistory().history[0].id, session.id);
});

test('template counts retain archived exercise references while new workouts still omit archived exercises', async t => {
  const f = await fixture(t); const exercise = f.fitness.createExercise({ name: 'Custom exercise', measurementType: 'strength' });
  const id = f.fitness.createRoutine({ name: 'Retained count', exercises: [{ id: null, exerciseId: exercise.id, targets: blankTargets() }] }); f.fitness.archiveExercise(exercise.id);
  const app = await show(t, f); assert.ok(app.find('Pressable', 'Open Retained count, 1 exercise')); await action(app, 'Retained count', 'Start Retained count');
  assert.equal(f.fitness.readSession(f.fitness.readOverview().active!.id).exercises.length, 0); assert.equal(f.fitness.readRoutine(id).exercises.length, 1);
});

for (const state of ['none', 'only-active', 'only-archived'] as const) test(`${state}: Active/Archived switch filters source rows and uses compact empty states without extra creation actions`, async t => {
  const f = await fixture(t); if (state !== 'none') { const id = f.create('Only routine'); if (state === 'only-archived') f.fitness.archiveRoutine(id); }
  const app = await show(t, f); assert.equal(rows(app).length, state === 'only-active' ? 1 : 0);
  assert.equal(app.container.textContent.includes('No active routines yet.'), state !== 'only-active');
  await archived(app, true); assert.equal(rows(app).length, state === 'only-archived' ? 1 : 0); assert.equal(app.container.textContent.includes('No archived routines yet.'), state !== 'only-archived');
  assert.equal(app.nodes().filter(node => node.props?.label === 'New routine').length, 1);
});

test('no active rotation and invalid next references use the existing no-plan state without inventing a next routine', async t => {
  const f = await fixture(t); const id = f.create('First'); const app = await show(t, f); assert.ok(app.container.textContent.includes('No active rotation')); await app.press('Set up rotation');
  assert.equal(runtime.fixture.navigation.at(-1)!.target, '/fitness/rotations'); assert.throws(() => f.rotations.create({ name: 'Empty', steps: [] }), /at least one routine/);
  const rotation = f.rotations.create({ name: 'Broken next fixture', steps: [{ id: null, routineId: id }] }); f.rotations.activate(rotation); const next = f.rotations.readNext()!;
  f.db.update(fitnessRotationSteps).set({ deletedAt: Date.now() }).where(eq(fitnessRotationSteps.id, next.stepId)).run(); await app.resume();
  assert.equal(f.rotations.readNext(), null); assert.ok(app.container.textContent.includes('No active rotation')); assert.ok(!app.container.textContent.includes('Next: First'));
});

for (const [width, fontScale] of [[320, 1], [390, 1], [430, 1], [320, 2]] as const) test(`long routine/rotation names and control ownership remain available at ${width}/font ${fontScale}`, async t => {
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width, height: 844, scale: 1, fontScale }));
  const f = await fixture(t); const name = 'A longer routine for strength training and personal movement practice'; const id = f.create(name, 1);
  const rotation = f.rotations.create({ name: 'An equally long ordered training cycle', steps: [{ id: null, routineId: id }] }); f.rotations.activate(rotation);
  const app = await show(t, f); assert.ok(app.container.textContent.includes(name)); assert.ok(app.find('FormButton', `Options for ${name}`)); assert.ok(app.find('FormButton', 'New routine'));
  assert.ok(!app.nodes().some(node => node.props?.numberOfLines === 1)); assert.ok(app.find('Pressable', `Open ${name}, 1 exercise`));
});

test('large library uses stable IDs and one FlatList without routine-entry detail reads or an enclosing ScrollView', async t => {
  const f = await fixture(t); for (let index = 0; index < 120; index++) f.create(`Routine ${String(index).padStart(3, '0')}`);
  const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount); runtime.fixture.reads.length = 0; await app.press('Routines');
  const list = app.find('FlatList'); assert.equal(rows(app).length, 120); const key = list.props.keyExtractor as (row: RoutineSummary) => string;
  assert.equal(new Set(rows(app).map(key)).size, 120); assert.equal(rows(app)[0].name, 'Routine 000'); assert.equal(rows(app).at(-1)!.name, 'Routine 119');
  assert.equal(list.props.initialNumToRender, 8); assert.equal(list.props.windowSize, 5); assert.equal(list.props.getItemLayout, undefined); assert.equal(app.nodes().filter(node => node.kind === 'ScrollView').length, 0);
  assert.equal(runtime.fixture.reads.filter(read => read === 'fitness.readRoutineSummaries').length, 1); assert.ok(!runtime.fixture.reads.includes('fitness.readRoutine') && !runtime.fixture.reads.includes('fitness.readRoutines'));
});

test('Routines remembers its own scroll offset while other internal destinations retain theirs', async t => {
  const f = await fixture(t); f.create('Plan'); const app = await show(t, f);
  await act(() => (app.find('FlatList').props.onScroll as (event: unknown) => void)({ nativeEvent: { contentOffset: { y: 320 } } }));
  await app.press('Exercises'); await app.press('Routines'); assert.deepEqual(app.find('FlatList').props.contentOffset, { x: 0, y: 320 });
});

test('failed summary refresh retains library and the same routine editor draft through Retry', async t => {
  const f = await fixture(t); const id = f.create('Draft'); const app = await show(t, f); const list = app.find('FlatList');
  await app.tapSet('Open Draft, 0 exercises'); await app.change('Routine name *', 'Unsaved routine name'); const field = app.find('FormField', 'Routine name *');
  runtime.fixture.failures.add('fitness.readRoutineSummaries'); await app.resume(); assert.ok(app.nodes().includes(list)); assert.equal(app.find('FormField', 'Routine name *'), field);
  runtime.fixture.failures.clear(); await app.press('Retry'); assert.equal(field.props.value, 'Unsaved routine name'); await app.press('Save'); assert.equal(f.fitness.readRoutine(id).name, 'Unsaved routine name');
});

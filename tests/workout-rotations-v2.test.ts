/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { DesignColors } from '../src/constants/design-system-v2';
import { createFitnessDataAccess } from '../src/features/fitness/data';
import { createRotationDataAccess } from '../src/features/fitness/rotations-data';
import { seedFitnessExercises } from '../src/features/fitness/seed';
import type { RotationDetail } from '../src/features/fitness/types';
import { bundledMigrations, database } from './helpers/database';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

type App = Awaited<ReturnType<typeof mount>>;
async function fixture(t: TestContext) {
  const f = database(); await migrate(f.db, bundledMigrations); seedFitnessExercises(f.db);
  t.after(() => { runtime.fixture.routeParams = {}; f.sqlite.close(); });
  const fitness = createFitnessDataAccess(f.db, randomUUID), rotations = createRotationDataAccess(f.db, randomUUID);
  const routines = ['Biceps, Back', 'Chest, Triceps, Shoulders', 'Legs'].map(name => fitness.createRoutine({ name, exercises: [] }));
  const create = (name: string, ids = routines, nextStepIndex = 1) => rotations.create({ name, steps: ids.map(routineId => ({ id: null, routineId })), nextStepIndex });
  return { ...f, fitness, rotations, routines, create };
}
async function show(t: TestContext, f: Awaited<ReturnType<typeof fixture>>) {
  const app = await mount(createElement(screens.WorkoutRotationsScreen), f.db); t.after(app.unmount); return app;
}
const card = (app: App, id: string) => app.nodes().find(node => node.props?.testID === `rotation-card-${id}`)!;
async function action(app: App, name: string, label: string) {
  await app.press(`Options for ${name}`); assert.equal(app.find('FormButton', `Options for ${name}`).props.expanded, true);
  await app.press(label); await act(() => new Promise(resolve => setTimeout(resolve, 20)));
  assert.equal(app.find('FormButton', `Options for ${name}`).props.expanded, false);
}
function flatten(style: unknown): Record<string, unknown> {
  return Object.assign({}, ...(Array.isArray(style) ? style.map(flatten) : [style ?? {}]));
}

for (const theme of ['light', 'dark'] as const) test(`${theme}: saved rotations own their actual state, pointer, ordered sequence and v2 menu`, async t => {
  t.mock.method(runtime.native as { useColorScheme: () => string }, 'useColorScheme', () => theme);
  const f = await fixture(t); const a = f.create('Weight Training'), b = f.create('Hypertrophy Focus', [...f.routines].reverse(), 0); f.rotations.activate(a);
  const app = await show(t, f);
  assert.ok(card(app, a).textContent.includes('Active')); assert.ok(card(app, b).textContent.includes('Inactive'));
  assert.ok(!app.container.textContent.includes('Paused'));
  assert.ok(card(app, a).textContent.includes('Next: Chest, Triceps, Shoulders'));
  assert.ok(card(app, a).textContent.includes('Biceps, Back → Chest, Triceps, Shoulders → Legs'));
  assert.ok(card(app, b).textContent.includes('Next: Legs'));
  assert.equal(f.rotations.readNext()!.routine.name, 'Chest, Triceps, Shoulders');
  assert.equal(flatten(card(app, a).props.style).backgroundColor, DesignColors[theme].group);
  assert.equal(flatten(card(app, a).props.style).height, undefined);
  assert.equal(app.find('FormButton', 'Options for Weight Training').props.appearance, 'v2');
  assert.ok(String(app.find('Pressable', 'Edit Weight Training').props.accessibilityHint).includes('Active. Next: Chest'));
  assert.ok(!app.nodes().some(node => node.kind === 'Modal'));
});

test('activation, switching and deactivation refresh real card state without resetting either saved pointer', async t => {
  const f = await fixture(t); const a = f.create('Weight Training'), b = f.create('Other cycle'); const app = await show(t, f);
  await action(app, 'Weight Training', 'Set active Weight Training'); assert.equal(f.rotations.readNext()!.rotation.id, a);
  await action(app, 'Other cycle', 'Set active Other cycle'); assert.equal(f.rotations.readNext()!.rotation.id, b);
  assert.ok(card(app, a).textContent.includes('Inactive')); assert.ok(card(app, b).textContent.includes('Active'));
  await action(app, 'Other cycle', 'Deactivate Other cycle'); assert.equal(f.rotations.readNext(), null);
  assert.ok(f.rotations.read().every(row => !row.isActive && row.nextStepId === row.steps[1].id));
});

test('New, identity Edit and contextual Edit retain pushed destinations; Back retains its existing return', async t => {
  const f = await fixture(t); const id = f.create('Weight Training'); const app = await show(t, f);
  await app.press('New rotation'); assert.equal(runtime.fixture.navigation.at(-1)!.target, '/fitness/rotation');
  await app.tapSet('Edit Weight Training'); assert.deepEqual(runtime.fixture.navigation.at(-1)!.target, { pathname: '/fitness/rotation', params: { rotationId: id } });
  await action(app, 'Weight Training', 'Edit Weight Training'); assert.deepEqual(runtime.fixture.navigation.at(-1)!.target, { pathname: '/fitness/rotation', params: { rotationId: id } });
  await app.press('Back from workout rotations'); assert.equal(runtime.fixture.navigation.at(-1)!.method, 'back');
});

test('reset/delete remain confirmed and canceled deletion preserves the rotation; confirmed deletion preserves routines/history', async t => {
  const f = await fixture(t); const id = f.create('Weight Training'); f.rotations.activate(id);
  const session = f.fitness.startWorkout(f.routines[1]); f.fitness.finishWorkout(session.id);
  const app = await show(t, f); const original = f.rotations.read()[0].nextStepId;
  await action(app, 'Weight Training', 'Reset Weight Training'); assert.equal(f.rotations.read()[0].nextStepId, original);
  await app.confirm('Cancel'); assert.equal(f.rotations.read()[0].nextStepId, original);
  await action(app, 'Weight Training', 'Reset Weight Training'); await app.confirm('Reset');
  assert.equal(f.rotations.read()[0].nextStepId, f.rotations.read()[0].steps[0].id);
  await action(app, 'Weight Training', 'Delete Weight Training'); await app.confirm('Cancel'); assert.equal(f.rotations.read().length, 1);
  await action(app, 'Weight Training', 'Delete Weight Training'); await app.confirm('Delete');
  assert.equal(f.rotations.read().length, 0); assert.equal(f.fitness.readRoutineSummaries().length, 3);
  assert.equal(f.fitness.readSession(session.id).rotationId, id); assert.ok(f.fitness.readSession(session.id).completedAt);
  assert.ok(app.container.textContent.includes('No workout rotations yet.'));
});

test('linked workout locks planning actions while Edit remains available; source still protects inactive rotation references', async t => {
  const f = await fixture(t); const id = f.create('Weight Training'); f.rotations.activate(id); f.fitness.startWorkout(f.routines[1]);
  const app = await show(t, f); await app.press('Options for Weight Training');
  for (const label of ['Deactivate Weight Training', 'Reset Weight Training', 'Delete Weight Training']) assert.equal(app.find('FormButton', label).props.disabled, true);
  assert.ok(!app.find('FormButton', 'Edit Weight Training').props.disabled);
  assert.ok(app.container.textContent.includes('Finish or discard the linked workout'));
  assert.throws(() => f.fitness.archiveRoutine(f.routines[0]), /saved rotations/);
  f.fitness.discardWorkout(f.fitness.readOverview().active!.id); f.rotations.deactivate(id);
  assert.throws(() => f.fitness.archiveRoutine(f.routines[0]), /saved rotations/);
});

test('empty state has one owned creation action and failed refresh retains the same management list', async t => {
  const f = await fixture(t); const app = await show(t, f);
  assert.ok(app.container.textContent.includes('No workout rotations yet.'));
  assert.equal(app.nodes().filter(node => node.kind === 'FormButton' && node.props.label === 'New rotation').length, 1);
  f.create('Weight Training'); await app.resume(); const list = app.find('FlatList');
  f.sqlite.exec('ALTER TABLE fitness_rotations RENAME TO unavailable_rotations'); await app.resume();
  assert.equal(app.find('FlatList'), list); assert.ok(app.container.textContent.includes('Weight Training')); assert.ok(app.find('FormButton', 'Retry'));
  f.sqlite.exec('ALTER TABLE unavailable_rotations RENAME TO fitness_rotations'); await app.press('Retry'); assert.equal(app.find('FlatList'), list);
});

test('narrow doubled text keeps dynamic cards, uncapped names/sequences, labeled actions and stable virtualized keys', async t => {
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width: 320, height: 700, fontScale: 2, scale: 1 }));
  const f = await fixture(t), name = 'Long rotation name for strength endurance and controlled recovery';
  const id = f.create(name, Array.from({ length: 12 }, (_, i) => f.routines[i % 3]));
  for (let i = 0; i < 40; i++) f.create(`Saved rotation ${i}`);
  const app = await show(t, f); const list = app.find('FlatList');
  assert.equal((list.props.data as RotationDetail[]).length, 41);
  assert.equal((list.props.keyExtractor as (row: RotationDetail) => string)(f.rotations.read().find(row => row.id === id)!), id);
  assert.ok(Number(list.props.initialNumToRender) < 41); assert.equal(list.props.getItemLayout, undefined);
  assert.equal(flatten(card(app, id).props.style).height, undefined);
  assert.ok(app.nodes().filter(node => node.kind === 'ThemedText').every(node => node.props.numberOfLines === undefined && node.props.allowFontScaling !== false));
  assert.ok(app.find('FormButton', `Options for ${name}`)); assert.ok(card(app, id).textContent.includes('Next: Chest, Triceps, Shoulders'));
  assert.equal(runtime.fixture.layoutAnimations.length, 0);
});

test('editor owns a bounded step list and fixed v2 Save/Cancel; preserved selected next is not the first routine', async t => {
  const f = await fixture(t); const id = f.create('Weight Training'); runtime.fixture.routeParams = { rotationId: id };
  const app = await mount(createElement(screens.WorkoutRotationEditorScreen), f.db); t.after(app.unmount);
  const list = app.find('FlatList'); assert.equal(list.props.testID, 'rotation-editor-list'); assert.equal(list.props.automaticallyAdjustKeyboardInsets, true);
  assert.equal(app.find('FormField', 'Rotation name *').props.appearance, 'v2'); assert.equal(app.find('SelectField', 'Routine to add').props.appearance, 'v2');
  assert.ok(app.find('FormButton', 'Set Chest, Triceps, Shoulders as next workout, workout 2 of 3').props.selected);
  assert.ok(!app.nodes(list).some(node => node.kind === 'FormButton' && ['Save', 'Cancel'].includes(String(node.props.label))));
  await app.change('Rotation name *', 'Renamed'); await app.press('Save');
  assert.equal(f.rotations.read()[0].nextStepId, f.rotations.read()[0].steps[1].id);
});

test('a missing saved pointer never fabricates a next routine in management', async t => {
  const f = await fixture(t); const id = f.create('Weight Training');
  f.sqlite.prepare('UPDATE fitness_rotations SET next_step_id = NULL WHERE id = ?').run(id);
  const app = await show(t, f); assert.ok(card(app, id).textContent.includes('No next routine'));
  assert.equal(f.rotations.readNext(), null); assert.ok(!card(app, id).textContent.includes('Next: Biceps, Back'));
});

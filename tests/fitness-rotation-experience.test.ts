/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { createFitnessDataAccess } from '../src/features/fitness/data';
import { createRotationDataAccess } from '../src/features/fitness/rotations-data';
import { seedFitnessExercises } from '../src/features/fitness/seed';
import { seedFinanceCategories } from '../src/features/finance/seed';
import { bundledMigrations, database } from './helpers/database';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

async function fixture(t: TestContext) {
  const f = database(); await migrate(f.db, bundledMigrations); seedFitnessExercises(f.db); seedFinanceCategories(f.db);
  t.after(() => { runtime.fixture.routeParams = {}; f.sqlite.close(); });
  const fitness = createFitnessDataAccess(f.db, randomUUID); const rotations = createRotationDataAccess(f.db, randomUUID);
  const routines = ['Push', 'Pull', 'Legs'].map((name) => fitness.createRoutine({ name, exercises: [] }));
  return { ...f, fitness, rotations, routines };
}
async function menuAction(app: Awaited<ReturnType<typeof mount>>, name: string, action: string) {
  await app.press(`Options for ${name}`); await app.press(action);
  await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
}
const plan = (routineIds: string[], name = 'Gym Cycle') => ({ name, steps: routineIds.map((routineId) => ({ id: null, routineId })) });
async function select(app: Awaited<ReturnType<typeof mount>>, label: string, id: string) {
  await act(() => (app.find('SelectField', label).props.onChange as (value: string) => void)(id));
}

test('Routines exposes planning via a pushed route, retaining four Fitness destinations and no planning modal', async (t) => {
  const f = await fixture(t); const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  await app.press('Routines'); assert.ok(app.container.textContent.includes('No active rotation'));
  await app.press('Set up rotation →'); assert.deepEqual(runtime.fixture.navigation.at(-1), { method: 'push', target: '/fitness/rotations' });
  const id = f.rotations.create(plan(f.routines)); f.rotations.activate(id); await app.resume();
  assert.ok(app.container.textContent.includes('Push → Pull → Legs')); assert.ok(app.container.textContent.includes('Next: Push'));
  await app.press('Manage rotation →'); assert.equal(runtime.fixture.navigation.at(-1)!.target, '/fitness/rotations');
  for (const label of ['Workout', 'Routines', 'Exercises', 'History']) assert.ok(app.find('FormButton', label));
  assert.ok(!app.nodes().some((node) => node.kind === 'Modal'));
});

test('suggested start uses inline logger, Finish immediately shows Up next, and a different routine does not advance', async (t) => {
  const f = await fixture(t); const id = f.rotations.create(plan(f.routines)); f.rotations.activate(id);
  const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  assert.ok(app.container.textContent.includes('Next workout')); assert.ok(app.find('FormButton', 'Start Push'));
  assert.ok(app.find('FormButton', 'Start another routine')); assert.ok(app.find('FormButton', 'Start Empty Workout'));
  await app.press('Start Push'); assert.ok(app.find('FormButton', 'Finish Workout'));
  assert.ok(!app.nodes().some((node) => node.props?.label === 'Start Pull' || node.kind === 'Modal'));
  await app.press('Finish Workout'); await app.confirm('Finish Workout');
  assert.ok(app.container.textContent.includes('Workout completed')); assert.ok(app.container.textContent.includes('Up next'));
  assert.ok(app.find('FormButton', 'Start Pull')); assert.equal(f.rotations.readNext()!.routine.id, f.routines[1]);
  await select(app, 'Workout routine', f.routines[2]); await app.press('Start another routine');
  assert.equal(f.fitness.readOverview().active!.rotationId, null);
  await app.press('Finish Workout'); await app.confirm('Finish Workout'); assert.ok(app.find('FormButton', 'Start Pull'));
});

test('ordinary Routine Start recognizes expected step and discard restores unchanged suggestion', async (t) => {
  const f = await fixture(t); const id = f.rotations.create(plan(f.routines)); f.rotations.activate(id);
  const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  await app.press('Routines'); await menuAction(app, 'Push', 'Start Push');
  assert.equal(f.fitness.readOverview().active!.rotationStepId, f.rotations.readNext()!.stepId);
  await app.press('Workout actions'); await app.press('Discard workout'); await app.confirm('Discard');
  assert.ok(app.find('FormButton', 'Start Push')); assert.equal(f.rotations.readNext()!.routine.name, 'Push');
});

test('rotation editor creates duplicate steps, sets explicit next, persists once and returns with a back action', async (t) => {
  const f = await fixture(t); runtime.fixture.routeParams = {};
  const app = await mount(createElement(screens.WorkoutRotationEditorScreen), f.db); t.after(app.unmount);
  await app.change('Name *', 'Gym Cycle');
  for (const id of [f.routines[0], f.routines[1], f.routines[0]]) { await select(app, 'Routine to add', id); await app.press('+ Add routine'); }
  await app.press('Set Pull as next workout, workout 2 of 3'); await app.press('Move Pull up, workout 2 of 3');
  await app.press('Save');
  const rotation = f.rotations.read()[0]; assert.deepEqual(rotation.steps.map((step) => step.routine.name), ['Pull', 'Push', 'Push']);
  assert.equal(rotation.nextStepId, rotation.steps[0].id); assert.equal(rotation.isActive, false);
  assert.equal(runtime.fixture.navigation.at(-1)!.method, 'back'); assert.ok(!app.nodes().some((node) => node.props?.label === 'Done' || node.kind === 'Modal'));
});

test('editor validation and Cancel keep source data unchanged; archived routines never appear in add choices', async (t) => {
  const f = await fixture(t); f.fitness.archiveRoutine(f.routines[2]); runtime.fixture.routeParams = {};
  const app = await mount(createElement(screens.WorkoutRotationEditorScreen), f.db); t.after(app.unmount);
  await app.change('Name *', 'Unfinished'); await app.press('Save'); assert.ok(app.container.textContent.includes('at least one'));
  const options = app.find('SelectField', 'Routine to add').props.options as { value: string | null }[];
  assert.ok(!options.some((option) => option.value === f.routines[2]));
  await select(app, 'Routine to add', f.routines[0]); await app.press('+ Add routine'); await app.press('Cancel');
  assert.equal(f.rotations.read().length, 0); assert.equal(runtime.fixture.navigation.at(-1)!.method, 'back');
});

test('rotation management supports explicit activation, confirmed reset/deletion and preserves routines/history', async (t) => {
  const f = await fixture(t); const id = f.rotations.create(plan(f.routines));
  const app = await mount(createElement(screens.WorkoutRotationsScreen), f.db); t.after(app.unmount);
  await menuAction(app, 'Gym Cycle', 'Set active Gym Cycle'); assert.ok(app.container.textContent.includes('Active · Next: Push'));
  const row = f.rotations.read()[0]; f.rotations.setNext(id, row.steps[1].id); await app.resume();
  await menuAction(app, 'Gym Cycle', 'Reset Gym Cycle'); assert.equal(f.rotations.readNext()!.stepId, row.steps[1].id, 'confirmation required');
  await app.confirm('Reset'); assert.equal(f.rotations.readNext()!.stepId, row.steps[0].id);
  await app.tapSet('Edit Gym Cycle'); assert.deepEqual(runtime.fixture.navigation.at(-1)!.target, { pathname: '/fitness/rotation', params: { rotationId: id } });
  await menuAction(app, 'Gym Cycle', 'Delete Gym Cycle'); assert.equal(f.rotations.read().length, 1); await app.confirm('Delete');
  assert.equal(f.rotations.read().length, 0); assert.equal(f.fitness.readOverview().routines.length, 3);
});

test('dirty editor name/order/next survives failed refresh and Retry without remounting or changing persisted progression', async (t) => {
  const f = await fixture(t); const id = f.rotations.create(plan(f.routines)); const original = f.rotations.read()[0]; runtime.fixture.routeParams = { rotationId: id };
  const app = await mount(createElement(screens.WorkoutRotationEditorScreen), f.db); t.after(app.unmount);
  await app.change('Name *', 'Dirty rotation'); await app.press('Move Pull up, workout 2 of 3'); await app.press('Set Legs as next workout, workout 3 of 3');
  const nameField = app.find('FormField', 'Name *');
  // Fail the real SQLite read boundary, then restore it without changing any planning records.
  f.sqlite.exec('ALTER TABLE fitness_rotations RENAME TO unavailable_rotations'); await app.resume();
  assert.equal(app.find('FormField', 'Name *'), nameField); assert.equal(nameField.props.value, 'Dirty rotation');
  assert.ok(app.find('FormButton', 'Set Legs as next workout, workout 3 of 3').props.selected);
  assert.ok(app.find('FormButton', 'Move Pull down, workout 1 of 3')); assert.ok(app.find('FormButton', 'Retry'));
  f.sqlite.exec('ALTER TABLE unavailable_rotations RENAME TO fitness_rotations'); assert.deepEqual(f.rotations.read()[0], original);
  await app.press('Retry'); assert.equal(app.find('FormField', 'Name *'), nameField);
  await app.press('Save'); const saved = f.rotations.read()[0]; assert.equal(saved.name, 'Dirty rotation');
  assert.equal(saved.steps[0].routine.name, 'Pull'); assert.equal(saved.nextStepId, saved.steps[2].id);
});

test('linked session leaves editor viewable and renameable but disables destructive planning controls', async (t) => {
  const f = await fixture(t); const id = f.rotations.create(plan(f.routines)); f.rotations.activate(id); f.fitness.startWorkout(f.routines[0]);
  runtime.fixture.routeParams = { rotationId: id }; const app = await mount(createElement(screens.WorkoutRotationEditorScreen), f.db); t.after(app.unmount);
  assert.ok(app.container.textContent.includes('Finish or discard'));
  for (const node of app.nodes().filter((node) => ['Move up', 'Move down', 'Remove', 'Set as next workout', '+ Add routine'].includes(String(node.props?.label)))) assert.equal(node.props.disabled, true);
  await app.change('Name *', 'Rename while active'); await app.press('Save'); assert.equal(f.rotations.read()[0].name, 'Rename while active');
});

test('five-step long names wrap with accessible routine/position labels and no fixed text height or truncation', async (t) => {
  const f = await fixture(t); const longName = 'Long routine name for accessibility text sizes '.repeat(2).trim();
  const long = f.fitness.createRoutine({ name: longName, exercises: [] });
  const name = 'Long rotation name for accessibility text sizes '.repeat(2).trim();
  const id = f.rotations.create(plan([long, ...f.routines, long], name)); runtime.fixture.routeParams = { rotationId: id };
  const app = await mount(createElement(screens.WorkoutRotationEditorScreen), f.db); t.after(app.unmount);
  assert.equal(app.find('FormField', 'Name *').props.value, name);
  assert.ok(app.nodes().some((node) => node.props?.accessibilityLabel === `${longName}, workout 5 of 5`));
  assert.ok(app.find('FormButton', `Move ${longName} up, workout 5 of 5`));
  assert.ok(app.nodes().filter((node) => node.kind === 'ThemedText').every((node) => node.props.numberOfLines === undefined && node.props.allowFontScaling !== false));
  assert.ok(app.nodes().filter((node) => node.kind === 'View').every((node) => !(node.props.style as Record<string, unknown> | undefined)?.height));
});

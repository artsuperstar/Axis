/// <reference types="node" />
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';

import { blankTargets } from '../src/features/fitness/form';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';
import { editWorkoutSet, exerciseMenuAction, workoutMenuAction } from './helpers/workout-interactions';

type App = Awaited<ReturnType<typeof mount>>;
async function fixture(t: TestContext, type: 'strength' | 'bodyweight' | 'duration' | 'distance' = 'strength') {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const source = f.fitness.readOverview().exercises.find((row) => row.measurementType === type)!;
  const routine = f.fitness.createRoutine({ name: 'Quiet workout', exercises: [{ id: null, exerciseId: source.id, targets: { ...blankTargets(), setCount: '2' } }] });
  const session = f.fitness.startWorkout(routine); const exercise = f.fitness.readSession(session.id).exercises[0];
  return { ...f, source, session, exercise };
}
function card(app: App, id: string) { return app.nodes().find((node) => node.props?.testID === `exercise-group-${id}`)!; }
function assertQuiet(app: App, id: string) {
  const nodes = app.nodes(card(app, id));
  for (const label of ['Add note', 'Edit note', 'Add notes', 'Actions', 'Log set with details']) assert.ok(!nodes.some((node) => node.kind === 'FormButton' && node.props.label === label), `Unexpected visible action: ${label}`);
  assert.equal(nodes.filter((node) => node.kind === 'FormButton' && node.props.variant === 'primary').length, 1);
  assert.equal(nodes.filter((node) => String(node.props?.accessibilityLabel).startsWith('More actions for ')).length, 1);
}

for (const type of ['strength', 'bodyweight', 'duration', 'distance'] as const) test(`${type}: quiet card retains one primary completion action, measurement detail and exercise overflow and whole-row set editing`, async (t) => {
  const f = await fixture(t, type); const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  assertQuiet(app, f.exercise.id); assert.ok(app.find('FormButton', `Complete set for ${f.source.name}`));
  assert.ok(card(app, f.exercise.id).textContent.includes('0 of 2 sets completed'));
  await app.press(`Complete set for ${f.source.name}`); assertQuiet(app, f.exercise.id);
  assert.ok(app.find('FormButton', `More actions for ${f.source.name}`)); assert.ok(app.find('Pressable', `${f.source.name}, set 1. Set complete. No performance details`));
  assert.equal(f.fitness.readSession(f.session.id).exercises[0].sets.length, 1);
  assert.ok(!app.nodes().some((node) => node.kind === 'Modal' || node.kind === 'FormField'));
  await editWorkoutSet(app, f.source.name);
  assert.ok(app.find('Modal'));
  assert.ok(app.container.textContent.includes('Edit set')); assert.ok(app.find('FormButton', 'Delete set'));
  await app.press('Save'); assert.equal(f.fitness.readSession(f.session.id).exercises[0].sets.length, 1, 'Editing blank details cannot create another set');
  await app.press(`Complete set for ${f.source.name}`); await app.press(`Complete set for ${f.source.name}`);
  assert.equal(f.fitness.readSession(f.session.id).exercises[0].sets.length, 3);
  assert.ok(card(app, f.exercise.id).textContent.includes('Exercise complete · 3 of 2 sets completed'));
  assertQuiet(app, f.exercise.id);
});

test('exercise menu owns only notes and confirmed exercise removal; set row opens its editor without duplicating those actions', async (t) => {
  const f = await fixture(t); const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  const more = app.find('FormButton', `More actions for ${f.source.name}`);
  assert.equal(more.props.variant, 'quiet'); assert.equal(more.props.icon, 'more');
  await app.press(`More actions for ${f.source.name}`);
  assert.equal(more.props.expanded, true); assert.ok(app.find('FormButton', `Note for ${f.source.name}`)); assert.ok(app.find('FormButton', 'Remove exercise from workout'));
  assert.ok(!app.nodes().some((node) => node.props?.label === 'Edit details' || node.props?.label === 'Log set with details'));
  await app.press('Remove exercise from workout'); await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
  assert.equal(more.props.expanded, false); assert.ok(!app.nodes().some((node) => node.kind === 'Modal'), 'The old intermediate exercise Actions sheet is gone');
  assert.equal(runtime.fixture.alerts.at(-1)!.title, 'Remove workout exercise?'); await app.confirm('Cancel');
  assert.equal(f.fitness.readSession(f.session.id).exercises.length, 1);
  await app.press(`Complete set for ${f.source.name}`); await editWorkoutSet(app, f.source.name);
  assert.ok(app.find('Modal')); assert.ok(app.find('FormButton', 'Delete set'));
  assert.ok(!app.nodes().some((node) => node.props?.accessibilityLabel === `Note for ${f.source.name}` || node.props?.label === 'Remove exercise from workout'));
});

test('notes move to the header menu, remain editable/visible/persistent and removal retains its confirmation', async (t) => {
  const f = await fixture(t); const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  await exerciseMenuAction(app, f.source.name, `Note for ${f.source.name}`);
  await app.change('Note (optional)', 'Slow controlled return'); await app.press('Save');
  assert.equal(f.fitness.readSession(f.session.id).exercises[0].note, 'Slow controlled return'); assertQuiet(app, f.exercise.id);
  assert.ok(card(app, f.exercise.id).textContent.includes('Note: Slow controlled return'));
  await app.resume(); await app.press(`More actions for ${f.source.name}`); assert.equal(app.find('FormButton', `Note for ${f.source.name}`).props.label, 'Edit note');
  await app.press(`Note for ${f.source.name}`); await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
  assert.equal(app.find('FormField', 'Note (optional)').props.value, 'Slow controlled return');
  await app.change('Note (optional)', 'Updated note'); await app.press('Save'); await app.unmount();
  const resumed = await mount(createElement(screens.FitnessScreen), f.db); t.after(resumed.unmount);
  assert.ok(card(resumed, f.exercise.id).textContent.includes('Updated note'));
  await exerciseMenuAction(resumed, f.source.name, 'Remove exercise from workout');
  assert.equal(f.fitness.readSession(f.session.id).exercises.length, 1); await resumed.confirm('Remove');
  assert.equal(f.fitness.readSession(f.session.id).exercises.length, 0);
});

test('post-completion details edit/clear/delete changes only the chosen row and progress follows deletion', async (t) => {
  const f = await fixture(t); const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  await app.press(`Complete set for ${f.source.name}`); const id = f.fitness.readSession(f.session.id).exercises[0].sets[0].id;
  await editWorkoutSet(app, f.source.name); await app.change('Weight (kg, optional)', '25'); await app.change('Reps (optional)', '10'); await app.press('Save');
  let sets = f.fitness.readSession(f.session.id).exercises[0].sets; assert.equal(sets.length, 1); assert.equal(sets[0].id, id); assert.equal(sets[0].weightGrams, 25000);
  await editWorkoutSet(app, f.source.name); await app.change('Weight (kg, optional)', ''); await app.change('Reps (optional)', ''); await app.press('Save');
  sets = f.fitness.readSession(f.session.id).exercises[0].sets; assert.equal(sets[0].weightGrams, null); assert.equal(sets[0].reps, null);
  assert.ok(card(app, f.exercise.id).textContent.includes('1 of 2 sets completed'));
  await editWorkoutSet(app, f.source.name); await app.press('Delete set'); await app.confirm('Cancel');
  assert.equal(f.fitness.readSession(f.session.id).exercises[0].sets.length, 1);
  await app.press('Delete set'); await app.confirm('Delete'); assert.ok(card(app, f.exercise.id).textContent.includes('0 of 2 sets completed'));
  assert.equal(f.fitness.readSession(f.session.id).exercises[0].sets.length, 0); assertQuiet(app, f.exercise.id);
});

test('exercise overflow remains discoverable at large text with Reduced Motion, while workout-level actions stay independent', async (t) => {
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width: 320, height: 800, scale: 1, fontScale: 2 }));
  const f = await fixture(t); const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  await act(() => (runtime.reduceMotion as (value: boolean) => void)(true)); assertQuiet(app, f.exercise.id);
  await exerciseMenuAction(app, f.source.name, `Note for ${f.source.name}`); await app.change('Note (optional)', 'Accessible note'); await app.press('Save');
  await app.press(`Complete set for ${f.source.name}`); await editWorkoutSet(app, f.source.name); await app.press('Cancel');
  await workoutMenuAction(app, 'Add workout note'); await app.change('Note (optional)', 'Workout-level note'); await app.press('Save');
  await app.press('More workout actions'); assert.ok(app.find('FormButton', 'Discard workout')); await app.press('More workout actions');
  await app.press('Finish Workout'); await app.confirm('Finish Workout');
  const history = f.fitness.readSession(f.session.id); assert.equal(history.note, 'Workout-level note'); assert.equal(history.exercises[0].note, 'Accessible note');
  assert.equal(history.exercises[0].sets.length, 1);
});

/// <reference types="node" />
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { randomUUID } from 'node:crypto';

import { blankTargets } from '../src/features/fitness/form';
import { createRotationDataAccess } from '../src/features/fitness/rotations-data';
import { editWorkoutSet, logWorkoutSet } from './helpers/workout-interactions';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

type App = Awaited<ReturnType<typeof mount>>;
async function fixture(t: TestContext) { const f = await journalDatabase(); t.after(() => f.sqlite.close()); return f; }
const flatten = (style: unknown) => Object.assign({}, ...(Array.isArray(style) ? style.flat(Infinity) : [style])) as Record<string, unknown>;
function progress(app: App, name: string) { return app.nodes().find((node) => node.props?.testID === `exercise-progress-${name}`)!; }
const edit = editWorkoutSet;

test('landing prioritizes next rotation, directly selects another routine, excludes archived choices and preserves rotation provenance', async (t) => {
  const f = await fixture(t); const source = f.fitness.readOverview().exercises[0];
  const ids = ['A plan', 'Pull Day', 'Leg Day', 'Archived'].map((name) => f.fitness.createRoutine({ name,
    exercises: [{ id: null, exerciseId: source.id, targets: blankTargets() }] }));
  f.fitness.archiveRoutine(ids[3]);
  const rotations = createRotationDataAccess(f.db, randomUUID);
  const rotation = rotations.create({ name: 'My rotation', steps: [ids[1], ids[2]].map((routineId) => ({ id: null, routineId })) }); rotations.activate(rotation);
  const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  assert.ok(app.find('FormButton', 'Start Pull Day')); assert.ok(app.container.textContent.includes('Next in My rotation'));
  assert.ok(!app.nodes().some((node) => node.kind === 'SelectField' && node.props.label === 'Workout routine'));
  assert.ok(!app.nodes().some((node) => String(node.props?.accessibilityLabel).startsWith('Choose Archived')));
  assert.deepEqual(app.find('Pressable', 'Choose Pull Day, 1 exercise, next in active rotation').props.accessibilityState, { checked: true });
  await app.tapSet('Choose Leg Day, 1 exercise');
  assert.ok(app.find('FormButton', 'Start Leg Day')); assert.equal(rotations.readNext()!.routine.id, ids[1]);
  await app.press('Start Leg Day'); assert.equal(f.fitness.readOverview().active!.rotationId, null);
  await app.press('Finish Workout'); await app.confirm('Finish Workout');
  assert.ok(app.find('FormButton', 'Start Pull Day')); assert.equal(rotations.readNext()!.routine.id, ids[1]);
  await app.press('View all routines'); assert.equal(app.find('FormButton', 'Routines').props.selected, true);
});

test('empty landing supports routine creation and empty start; a default routine is selected without a form selector', async (t) => {
  const f = await fixture(t); const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  assert.ok(app.container.textContent.includes('Your next workout')); await app.press('Create a routine');
  await app.change('Routine name *', 'My first routine'); await app.press('Save');
  assert.ok(app.find('FormButton', 'Start My first routine')); assert.equal(f.fitness.readOverview().routines[0].exerciseCount, 0);
  await app.press('Start Empty Workout'); assert.equal(f.fitness.readOverview().active!.routineId, null);
  assert.ok(app.find('FormButton', 'Finish Workout'));
});

test('launch routine preview is bounded, includes a late-sorting next routine and keeps choices spatially stable after selection', async (t) => {
  const f = await fixture(t);
  const ids = ['A', 'B', 'C', 'D', 'E', 'Z next'].map((name) => f.fitness.createRoutine({ name, exercises: [] }));
  const rotations = createRotationDataAccess(f.db, randomUUID);
  const id = rotations.create({ name: 'Next', steps: [{ id: null, routineId: ids[5] }] }); rotations.activate(id);
  const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  const labels = () => app.nodes().filter((node) => node.props?.accessibilityRole === 'radio').map((node) => node.props.accessibilityLabel);
  const before = labels(); assert.equal(before.length, 4); assert.ok(String(before[0]).startsWith('Choose Z next'));
  await app.tapSet('Choose A, 0 exercises'); assert.deepEqual(labels(), before); assert.ok(app.find('FormButton', 'Start A'));
  await app.press('View all routines'); assert.equal(app.nodes().filter((node) => String(node.props?.accessibilityLabel).startsWith('Open ')).length, 6);
});

for (const type of ['strength', 'bodyweight', 'duration', 'distance'] as const) test(`${type}: Set Complete is immediate, stores no copied values, updates the wheel and exposes secondary details`, async (t) => {
  const f = await fixture(t); const source = f.fitness.readOverview().exercises.find((row) => row.measurementType === type)!;
  const routine = f.fitness.createRoutine({ name: `Quick ${type}`, exercises: [{ id: null, exerciseId: source.id, targets: { ...blankTargets(), setCount: '2' } }] });
  const session = f.fitness.startWorkout(routine);
  const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  const button = app.find('FormButton', `Complete set for ${source.name}`); assert.equal(button.props.variant, 'primary');
  await logWorkoutSet(app, source.name);
  assert.ok(!app.nodes().some((node) => node.kind === 'Modal' || node.kind === 'FormField'));
  let sets = f.fitness.readSession(session.id).exercises[0].sets;
  assert.equal(sets.length, 1); assert.equal(sets[0].weightGrams, null); assert.equal(sets[0].reps, null); assert.equal(sets[0].durationSeconds, null); assert.equal(sets[0].distanceMeters, null);
  assert.equal((progress(app, source.name).props.accessibilityValue as { now: number }).now, 1);
  await edit(app, source.name); const fields = app.nodes().filter((node) => node.kind === 'FormField');
  assert.ok(fields.every((node) => node.props.value === ''), 'Completing a set must not prefill performance');
  if (type === 'strength') await app.change('Weight (kg, optional)', '12,5');
  if (type === 'bodyweight') await app.change('Reps (optional)', '8');
  if (type === 'duration') await app.change('Seconds', '45');
  if (type === 'distance') await app.change('Distance (km)', '2,5');
  await app.press('Save'); assert.equal(f.fitness.readSession(session.id).exercises[0].sets[0].id, sets[0].id);
  await logWorkoutSet(app, source.name); sets = f.fitness.readSession(session.id).exercises[0].sets;
  assert.equal(sets.length, 2); assert.deepEqual([sets[1].weightGrams, sets[1].reps, sets[1].durationSeconds, sets[1].distanceMeters], [null, null, null, null]);
  assert.ok(String(progress(app, source.name).props.accessibilityLabel).includes('exercise complete'));
  await logWorkoutSet(app, source.name); assert.equal(f.fitness.readSession(session.id).exercises[0].sets.length, 3);
  assert.deepEqual(progress(app, source.name).props.accessibilityValue, { min: 0, max: 2, now: 2, text: '3 of 2 sets completed' });
  await app.resume(); await app.press('History'); await app.press('Workout'); assert.equal(f.fitness.readSession(session.id).exercises[0].sets.length, 3);
  await app.press('Finish Workout'); await app.confirm('Finish Workout');
  const last = app.nodes().find((node) => node.kind === 'Pressable' && String(node.props.accessibilityLabel).startsWith(`Last workout: Quick ${type}`))!;
  assert.ok(last); await app.tapSet(String(last.props.accessibilityLabel));
  assert.ok(app.container.textContent.includes('Read-only')); assert.ok(app.container.textContent.includes('—'));
  assert.ok(!app.nodes().some((node) => node.props?.label === 'Set Complete'));
});

test('rapid set completions use distinct persisted rows and failed writes leave count/progress unchanged', async (t) => {
  const f = await fixture(t); const source = f.fitness.readOverview().exercises[0]; const session = f.fitness.startWorkout();
  const id = f.fitness.addSessionExercise(session.id, source.id);
  const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  const complete = app.find('FormButton', `Log set for ${source.name}`).props.onPress as () => void;
  await act(() => { complete(); complete(); complete(); });
  const rows = f.fitness.readSession(session.id).exercises[0].sets; assert.equal(new Set(rows.map((row) => row.id)).size, 3);
  assert.deepEqual(rows.map((row) => row.position), [0, 1, 2]);
  f.sqlite.exec("CREATE TRIGGER fail_set BEFORE INSERT ON fitness_sets BEGIN SELECT RAISE(ABORT, 'Injected set failure'); END");
  await logWorkoutSet(app, source.name); assert.equal(f.fitness.readSession(session.id).exercises[0].sets.length, 3);
  assert.ok(!app.nodes().some((node) => node.props?.testID === `exercise-progress-${source.name}`));
  assert.ok(app.find('FormError')); f.sqlite.exec('DROP TRIGGER fail_set');
  await logWorkoutSet(app, source.name); assert.equal(f.fitness.readSession(session.id).exercises[0].sets.length, 4);
  assert.ok(!app.nodes().some((node) => node.kind === 'FormError'));
  assert.equal(f.fitness.readSession(session.id).exercises[0].id, id);
});

test('a committed completion survives refresh failure, Retry, editor detail clearing and remount', async (t) => {
  const f = await fixture(t); const source = f.fitness.readOverview().exercises[0]; const session = f.fitness.startWorkout();
  f.fitness.addSessionExercise(session.id, source.id);
  const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  runtime.fixture.failures.add('fitness.readSession'); await logWorkoutSet(app, source.name);
  assert.equal(f.fitness.readSession(session.id).exercises[0].sets.length, 1); assert.ok(app.find('FormError'));
  runtime.fixture.failures.clear(); await app.press('Retry'); await edit(app, source.name); await app.press('Save');
  assert.equal(f.fitness.readSession(session.id).exercises[0].sets.length, 1); await app.unmount();
  const resumed = await mount(createElement(screens.FitnessScreen), f.db); t.after(resumed.unmount);
  assert.ok(resumed.find('Pressable', `${source.name}, set 1. Set complete. No performance details`));
  assert.ok(resumed.find('FormButton', `Complete exercise ${source.name}`));
  assert.equal(f.fitness.readOverview().active!.id, session.id);
});

test('large text and Reduced Motion preserve touch targets, wrapping, completion and details menus', async (t) => {
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width: 320, height: 800, scale: 1, fontScale: 2 }));
  const f = await fixture(t); const source = f.fitness.readOverview().exercises[0];
  const routine = f.fitness.createRoutine({ name: 'Long routine name with room to wrap', exercises: [{ id: null, exerciseId: source.id, targets: { ...blankTargets(), setCount: '2' } }] });
  const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  const choice = app.nodes().find((node) => node.props?.accessibilityRole === 'radio')!;
  assert.ok(Number(flatten(choice.props.style).minHeight) >= 48); assert.equal(flatten(choice.props.style).height, undefined);
  await app.press('Start Long routine name with room to wrap'); assert.equal(f.fitness.readOverview().active!.routineId, routine);
  await act(() => (runtime.reduceMotion as (value: boolean) => void)(true));
  await logWorkoutSet(app, source.name); assert.equal((progress(app, source.name).props.accessibilityValue as { now: number }).now, 1);
  assert.ok(!app.nodes().some((node) => String(node.props?.testID).startsWith('set-columns-')));
  await edit(app, source.name); assert.ok(app.find('Modal')); await app.press('Cancel');
  assert.ok(app.find('FormButton', 'Finish Workout'));
});

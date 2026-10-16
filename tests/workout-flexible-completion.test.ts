/// <reference types="node" />
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';

import { blankTargets } from '../src/features/fitness/form';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';
import { editWorkoutSet, exerciseMenuAction, logWorkoutSet } from './helpers/workout-interactions';

type App = Awaited<ReturnType<typeof mount>>;
function card(app: App, id: string) { return app.nodes().find((node) => node.props?.testID === `exercise-group-${id}`)!; }
function progress(app: App) { return app.nodes().find((node) => node.props?.testID === 'workout-progress')!.props.accessibilityValue as { now: number; text: string }; }
function rows(app: App, name: string) { return app.nodes().filter((node) => node.kind === 'Pressable' && String(node.props?.accessibilityLabel).startsWith(`${name}, set `)); }
async function fixture(t: TestContext) {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const sources = f.fitness.readOverview().exercises;
  const routine = f.fitness.createRoutine({ name: 'Mixed workout', exercises: ['strength', 'bodyweight', 'duration', 'distance'].map((type, index) => ({
    id: null, exerciseId: sources.find((row) => row.measurementType === type)!.id, targets: { ...blankTargets(), setCount: index < 2 ? '2' : '' },
  })) });
  const session = f.fitness.startWorkout(routine);
  return { ...f, session, exercises: f.fitness.readSession(session.id).exercises };
}

test('mixed automatic/manual workout reaches 100%; reopen, target loss and removal update the same overall ring/text', async (t) => {
  const f = await fixture(t); const [a, b, c, d] = f.exercises; const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  assert.equal(progress(app).now, 0); assert.ok(card(app, c.id).textContent.includes('No set target'));
  assert.ok(!app.nodes(card(app, c.id)).some((node) => String(node.props?.testID).startsWith('exercise-progress-')));
  assert.equal(app.find('FormButton', `Complete exercise ${c.exerciseName}`).props.variant, 'primary');
  await app.press(`Complete exercise ${c.exerciseName}`); assert.equal(progress(app).now, 25);
  assert.equal(f.fitness.readSession(f.session.id).exercises[2].sets.length, 0);
  assert.equal(app.find('FormButton', `Reopen exercise ${c.exerciseName}`).props.label, 'Completed · Reopen');
  await logWorkoutSet(app, a.exerciseName); await logWorkoutSet(app, a.exerciseName); await logWorkoutSet(app, b.exerciseName);
  assert.equal(progress(app).now, 50); assert.ok(progress(app).text.startsWith('2 of 4 exercises'));
  for (let i = 0; i < 3; i++) { await logWorkoutSet(app, c.exerciseName); await logWorkoutSet(app, d.exerciseName); }
  assert.equal(progress(app).now, 50); assert.equal(f.fitness.readSession(f.session.id).exercises[3].isManuallyComplete, false);
  await app.press(`Complete exercise ${d.exerciseName}`); await logWorkoutSet(app, b.exerciseName);
  assert.equal(progress(app).now, 100); assert.equal(f.fitness.readOverview().active!.id, f.session.id);
  const before = f.fitness.readSession(f.session.id).exercises[2].sets;
  await app.press(`Reopen exercise ${c.exerciseName}`); assert.equal(progress(app).now, 75);
  assert.deepEqual(f.fitness.readSession(f.session.id).exercises[2].sets, before);
  await editWorkoutSet(app, a.exerciseName); await app.press('Delete set'); await app.confirm('Delete'); assert.equal(progress(app).now, 50);
  await exerciseMenuAction(app, d.exerciseName, 'Remove exercise from workout'); await app.confirm('Remove');
  assert.equal(progress(app).now, 33); assert.ok(progress(app).text.startsWith('1 of 3 exercises'));
});

for (const [index, field, entered] of [[0, 'Weight (kg, optional)', '25'], [1, 'Reps (optional)', '10'], [2, 'Seconds', '45'], [3, 'Distance (km)', '2.5']] as const) {
  test(`${['strength', 'bodyweight', 'duration', 'distance'][index]}: one full-width set row opens edit/clear/confirmed delete, without nested actions or an overflow`, async (t) => {
    const f = await fixture(t); const exercise = f.exercises[index]; const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
    if (index >= 2) await app.press(`Complete exercise ${exercise.exerciseName}`);
    await logWorkoutSet(app, exercise.exerciseName); const setId = f.fitness.readSession(f.session.id).exercises[index].sets[0].id;
    const row = rows(app, exercise.exerciseName)[0]; assert.equal(row.props.accessibilityRole, 'button');
    assert.ok(String(row.props.accessibilityHint).includes('Opens set details'));
    assert.ok(String(row.props.accessibilityLabel).includes('No performance details'));
    const style = typeof row.props.style === 'function' ? row.props.style({ pressed: false }) : row.props.style;
    const flat = Object.assign({}, ...(Array.isArray(style) ? style.flat(Infinity) : [style])); assert.ok(flat.minHeight >= 48);
    assert.ok(!app.nodes(row).some((node) => node.kind === 'Pressable' || node.kind === 'FormButton' || typeof node.props?.onPress === 'function'));
    assert.ok(!app.nodes().some((node) => String(node.props?.accessibilityLabel).startsWith(`Options for ${exercise.exerciseName}, set `)));
    assert.ok(app.find('FormButton', `More actions for ${exercise.exerciseName}`));
    await app.tapSet(String(row.props.accessibilityLabel)); await app.change(field, entered); await app.press('Save');
    let detail = f.fitness.readSession(f.session.id).exercises[index]; assert.equal(detail.sets.length, 1); assert.equal(detail.sets[0].id, setId);
    await editWorkoutSet(app, exercise.exerciseName); assert.equal(app.find('FormField', field).props.value, entered === '2.5' ? '2.5' : entered);
    await app.change(field, '');
    if (index === 2) await app.change('Minutes (optional)', '');
    await app.press('Save'); assert.ok(!app.nodes().some((node) => node.kind === 'Modal'));
    detail = f.fitness.readSession(f.session.id).exercises[index];
    assert.deepEqual([detail.sets[0].weightGrams, detail.sets[0].reps, detail.sets[0].durationSeconds, detail.sets[0].distanceMeters], [null, null, null, null]);
    await editWorkoutSet(app, exercise.exerciseName); await app.press('Delete set'); await app.confirm('Cancel');
    assert.equal(f.fitness.readSession(f.session.id).exercises[index].sets.length, 1);
    await app.press('Delete set'); await app.confirm('Delete'); assert.equal(rows(app, exercise.exerciseName).length, 0);
    detail = f.fitness.readSession(f.session.id).exercises[index]; assert.equal(detail.isManuallyComplete, index >= 2);
  });
}

test('manual completion survives failed refresh, Retry, resume and remount; History exposes its read-only state', async (t) => {
  const f = await fixture(t); const c = f.exercises[2]; const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  runtime.fixture.failures.add('fitness.readSession'); await app.press(`Complete exercise ${c.exerciseName}`);
  assert.equal(f.fitness.readSession(f.session.id).exercises[2].isManuallyComplete, true); assert.ok(app.find('FormError'));
  assert.equal(progress(app).now, 0); runtime.fixture.failures.clear(); await app.press('Retry'); assert.equal(progress(app).now, 25);
  await app.resume(); assert.equal(progress(app).now, 25); await app.unmount();
  const restored = await mount(createElement(screens.FitnessScreen), f.db); t.after(restored.unmount);
  assert.ok(restored.find('FormButton', `Reopen exercise ${c.exerciseName}`)); assert.equal(progress(restored).now, 25);
  await restored.press('Finish Workout'); await restored.confirm('Finish Workout');
  const last = restored.nodes().find((node) => String(node.props?.accessibilityLabel).startsWith('Last workout: Mixed workout'))!;
  await restored.tapSet(String(last.props.accessibilityLabel)); const modal = restored.find('Modal');
  assert.ok(modal.textContent.includes('Exercise completed')); assert.ok(modal.textContent.includes('Not marked complete'));
  assert.ok(!restored.nodes(modal).some((node) => String(node.props?.accessibilityLabel).startsWith('Reopen exercise ')));
});

test('manual completion write failure leaves the active exercise incomplete and exposes the existing inline error', async (t) => {
  const f = await fixture(t); const c = f.exercises[2]; const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  f.sqlite.exec("CREATE TRIGGER fail_manual BEFORE UPDATE OF is_manually_complete ON fitness_session_exercises BEGIN SELECT RAISE(ABORT, 'Injected manual failure'); END");
  await app.press(`Complete exercise ${c.exerciseName}`); assert.equal(progress(app).now, 0);
  assert.equal(f.fitness.readSession(f.session.id).exercises[2].isManuallyComplete, false); assert.ok(app.find('FormError'));
  f.sqlite.exec('DROP TRIGGER fail_manual'); await app.press(`Complete exercise ${c.exerciseName}`); assert.equal(progress(app).now, 25);
});

test('large text and Reduced Motion keep targetless Complete/Reopen and set-row editing accessible', async (t) => {
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width: 320, height: 800, fontScale: 2, scale: 1 }));
  const f = await fixture(t); const c = f.exercises[2]; const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  await act(() => (runtime.reduceMotion as (value: boolean) => void)(true)); await app.press(`Complete exercise ${c.exerciseName}`);
  await logWorkoutSet(app, c.exerciseName); await editWorkoutSet(app, c.exerciseName); await app.press('Cancel');
  assert.equal(progress(app).now, 25); await app.press(`Reopen exercise ${c.exerciseName}`); assert.equal(progress(app).now, 0);
  assert.equal(rows(app, c.exerciseName).length, 1); assert.equal(runtime.fixture.layoutAnimations.length, 0);
  assert.ok(app.find('FormButton', 'Finish Workout'));
});

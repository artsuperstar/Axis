/// <reference types="node" />
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';

import { blankSet, blankTargets } from '../src/features/fitness/form';
import { workoutProgress } from '../src/features/fitness/workout-presentation';
import { MotionTokens } from '../src/constants/design-system-v2';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';
import { editWorkoutSet, exerciseMenuAction, logWorkoutSet } from './helpers/workout-interactions';

const require = createRequire(import.meta.url);
const motion = require('./helpers/native-motion.cjs') as { calls: { value: number; config: { duration: number; reduceMotion: string } }[] };
type App = Awaited<ReturnType<typeof mount>>;
const ring = (app: App) => app.nodes().find((node) => node.props?.testID === 'workout-progress');
const header = (app: App) => app.nodes().find((node) => node.props?.testID === 'workout-header')!;
const value = (app: App) => ring(app)!.props.accessibilityValue as { min: number; max: number; now: number; text: string };
async function fixture(t: TestContext) {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const sources = f.fitness.readOverview().exercises;
  const routine = f.fitness.createRoutine({ name: 'Four-part workout', exercises: ['strength', 'bodyweight', 'duration', 'distance'].map((type) => ({
    id: null, exerciseId: sources.find((row) => row.measurementType === type)!.id, targets: { ...blankTargets(), setCount: '2' },
  })) });
  const session = f.fitness.startWorkout(routine);
  return { ...f, session, exercises: f.fitness.readSession(session.id).exercises };
}

test('persisted workout fractions and accessible percentages cover 0/4 through 4/4; 100% never finishes the workout', async (t) => {
  const f = await fixture(t); const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  for (let completed = 0; completed <= 4; completed++) {
    const progress = workoutProgress(f.fitness.readSession(f.session.id));
    assert.equal(progress.completed, completed); assert.equal(progress.total, 4);
    assert.equal(progress.ratio, [0, .25, .5, .75, 1][completed]); assert.equal(progress.percentage, [0, 25, 50, 75, 100][completed]);
    assert.deepEqual(value(app), { min: 0, max: 100, now: completed * 25, text: `${completed} of 4 exercises complete, ${completed * 25} percent` });
    assert.ok(header(app).textContent.includes(`${completed} of 4 exercises`));
    if (completed < 4) {
      const name = f.exercises[completed].exerciseName;
      await app.press(`Complete set for ${name}`); assert.equal(value(app).now, completed * 25);
      await app.press(`Complete set for ${name}`);
    }
  }
  await app.press(`Complete set for ${f.exercises[0].exerciseName}`); assert.equal(value(app).now, 100);
  assert.equal(f.fitness.readOverview().active!.id, f.session.id); assert.equal(f.fitness.readOverview().history.length, 0);
  assert.ok(app.find('FormButton', 'Finish Workout'));
  assert.ok(!app.nodes(ring(app)!).some((node) => node.kind === 'ThemedText'), 'Workout ring has no numeric center');
});

test('deleting qualifying sets, removing exercises and adding membership update the authoritative ring', async (t) => {
  const f = await fixture(t); const first = f.exercises[0]; const second = f.exercises[1];
  for (const exercise of [first, second]) for (let i = 0; i < 2; i++) f.fitness.addSet(exercise.id, blankSet());
  const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount); assert.equal(value(app).now, 50);
  await editWorkoutSet(app, first.exerciseName); await app.press('Delete set'); await app.confirm('Delete'); assert.equal(value(app).now, 25);
  await exerciseMenuAction(app, second.exerciseName, 'Remove exercise from workout'); await app.confirm('Remove');
  assert.equal(value(app).now, 0); assert.ok(value(app).text.startsWith('0 of 3'));
  f.fitness.addSessionExercise(f.session.id, second.exerciseId!); await app.resume(); assert.ok(value(app).text.startsWith('0 of 4'));
});

test('resume, remount and refresh failure retain/restore persisted progress without a second aggregate state', async (t) => {
  const f = await fixture(t); const exercise = f.exercises[0];
  for (let i = 0; i < 2; i++) f.fitness.addSet(exercise.id, blankSet());
  const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount); assert.equal(value(app).now, 25);
  const second = f.exercises[1]; for (let i = 0; i < 2; i++) f.fitness.addSet(second.id, blankSet());
  runtime.fixture.failures.add('fitness.readSession'); await app.resume(); assert.equal(value(app).now, 25);
  assert.ok(app.find('FormError')); runtime.fixture.failures.clear(); await app.press('Retry'); assert.equal(value(app).now, 50);
  await app.unmount(); const restored = await mount(createElement(screens.FitnessScreen), f.db); t.after(restored.unmount);
  assert.equal(value(restored).now, 50);
});

test('empty workout hides the ring; manually added exercises have no target and do not imply completion', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close()); const session = f.fitness.startWorkout();
  const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  assert.equal(ring(app), undefined); assert.ok(header(app).textContent.includes('No exercises yet')); assert.ok(!header(app).textContent.includes('0 of 0'));
  const source = f.fitness.readOverview().exercises[0]; const id = f.fitness.addSessionExercise(session.id, source.id);
  assert.equal(f.fitness.readSession(session.id).exercises[0].targetSetCount, null); await app.resume();
  for (let i = 0; i < 5; i++) await logWorkoutSet(app, source.name);
  assert.equal(value(app).now, 0); assert.ok(header(app).textContent.includes('0 of 1 exercises'));
  assert.ok(!app.nodes().some((node) => node.props?.testID === `exercise-progress-${source.name}`));
  assert.ok(app.find('FormButton', `Complete exercise ${source.name}`));
  f.fitness.removeSessionExercise(id); await app.resume(); assert.equal(ring(app), undefined);
});

test('one accessible workout progressbar describes the visual ring and visible text without duplicate announcements', async (t) => {
  const f = await fixture(t); const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  const progress = ring(app)!;
  assert.equal(progress.props.accessible, true); assert.equal(progress.props.accessibilityRole, 'progressbar');
  assert.equal(progress.props.accessibilityLabel, 'Workout progress'); assert.equal(progress.props.accessibilityLiveRegion, 'polite');
  assert.equal(app.nodes(header(app)).filter((node) => node.props?.accessibilityRole === 'progressbar').length, 1);
  const text = app.nodes(header(app)).find((node) => node.kind === 'ThemedText' && node.textContent === '0 of 4 exercises')!;
  assert.equal(text.props.accessible, false); assert.equal(text.props.accessibilityElementsHidden, true);
  assert.equal(text.props.importantForAccessibility, 'no-hide-descendants');
  assert.ok(app.find('FormButton', 'More workout actions'));
});

test('shared ring uses local selection timing and live Reduced Motion updates immediately', async (t) => {
  const f = await fixture(t); const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  await act(() => (runtime.reduceMotion as (value: boolean) => void)(false)); motion.calls.length = 0;
  const name = f.exercises[0].exerciseName;
  await app.press(`Complete set for ${name}`); await app.press(`Complete set for ${name}`);
  assert.ok(motion.calls.some((call) => call.value === .25 && call.config.duration === MotionTokens.selection && call.config.reduceMotion === 'system'));
  await act(() => (runtime.reduceMotion as (value: boolean) => void)(true)); motion.calls.length = 0;
  const second = f.exercises[1].exerciseName;
  await app.press(`Complete set for ${second}`); await app.press(`Complete set for ${second}`);
  assert.equal(value(app).now, 50); assert.equal(motion.calls.length, 0);
  assert.equal(runtime.fixture.layoutAnimations.length, 0);
});

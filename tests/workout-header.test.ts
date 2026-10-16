/// <reference types="node" />
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';

import { blankSet, blankTargets } from '../src/features/fitness/form';
import { workoutProgress } from '../src/features/fitness/workout-presentation';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';
import { editWorkoutSet, exerciseMenuAction, workoutMenuAction } from './helpers/workout-interactions';

type App = Awaited<ReturnType<typeof mount>>;
function header(app: App) { return app.nodes().find((node) => node.props?.testID === 'workout-header')!; }
async function fixture(t: TestContext, name = 'Pull Day') {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const sources = f.fitness.readOverview().exercises;
  const routine = f.fitness.createRoutine({ name, exercises: ['strength', 'bodyweight', 'duration', 'distance'].map((type) => ({
    id: null, exerciseId: sources.find((row) => row.measurementType === type)!.id,
    targets: { ...blankTargets(), setCount: type === 'distance' ? '' : '2' },
  })) });
  const session = f.fitness.startWorkout(routine);
  return { ...f, session, routine, exercises: f.fitness.readSession(session.id).exercises };
}

test('workout progress counts target-complete exercises once across all measurement types, not completed sets', async (t) => {
  const f = await fixture(t); const read = () => workoutProgress(f.fitness.readSession(f.session.id));
  assert.deepEqual(workoutProgress({ exercises: [] }), { completed: 0, total: 0, ratio: 0, percentage: 0, label: 'No exercises yet' });
  assert.deepEqual(read(), { completed: 0, total: 4, ratio: 0, percentage: 0, label: '0 of 4 exercises' });
  for (const exercise of f.exercises) {
    f.fitness.addSet(exercise.id, blankSet());
    assert.equal(read().completed, f.exercises.indexOf(exercise) === 3 ? 3 : f.exercises.indexOf(exercise));
    f.fitness.addSet(exercise.id, blankSet()); f.fitness.addSet(exercise.id, blankSet());
  }
  assert.deepEqual(read(), { completed: 3, total: 4, ratio: .75, percentage: 75, label: '3 of 4 exercises' });
  const detail = f.fitness.readSession(f.session.id); const copy = JSON.stringify(detail);
  workoutProgress(detail); assert.equal(JSON.stringify(detail), copy);
  f.fitness.deleteSet(detail.exercises[0].sets[0].id); assert.equal(read().completed, 3);
  f.fitness.deleteSet(detail.exercises[0].sets[1].id); assert.equal(read().completed, 2);
  f.fitness.removeSessionExercise(f.exercises[1].id); assert.deepEqual(read(), { completed: 1, total: 3, ratio: 1 / 3, percentage: 33, label: '1 of 3 exercises' });
});

test('compact status owns one quiet menu; note editor, outside dismissal and confirmed discard retain their behavior', async (t) => {
  const f = await fixture(t); const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  assert.ok(header(app).textContent.includes('Current WorkoutPull Day0 of 4 exercises'));
  assert.ok(!header(app).textContent.includes('Started'));
  assert.ok(!header(app).textContent.includes('In progress'));
  const trigger = app.find('FormButton', 'More workout actions'); assert.equal(trigger.props.variant, 'quiet');
  assert.equal(app.nodes(header(app)).filter((node) => node.kind === 'FormButton').length, 1);
  await app.press('More workout actions');
  assert.equal(trigger.props.expanded, true);
  assert.deepEqual(app.nodes().filter((node) => node.kind === 'FormButton' && ['Add workout note', 'Discard workout'].includes(String(node.props.label))).map((node) => node.props.label), ['Add workout note', 'Discard workout']);
  assert.ok(!app.nodes().some((node) => node.kind === 'Modal'));
  await app.tapSet('Close more workout actions'); assert.equal(trigger.props.expanded, false);
  await workoutMenuAction(app, 'Add workout note'); assert.equal(trigger.props.expanded, false);
  assert.ok(app.find('Modal')); await app.change('Note (optional)', 'A long workout note that stays in its editor rather than enlarging the status card.'); await app.press('Save');
  assert.ok(!header(app).textContent.includes('A long workout note'));
  await workoutMenuAction(app, 'Edit workout note');
  assert.equal(app.find('FormField', 'Note (optional)').props.value, f.fitness.readSession(f.session.id).note);
  await app.press('Cancel'); await workoutMenuAction(app, 'Discard workout');
  assert.equal(trigger.props.expanded, false); assert.ok(!app.nodes().some((node) => node.kind === 'Modal'));
  assert.equal(runtime.fixture.alerts.at(-1)!.title, 'Discard workout?'); await app.confirm('Cancel');
  assert.ok(f.fitness.readOverview().active); await workoutMenuAction(app, 'Discard workout'); await app.confirm('Discard');
  assert.equal(f.fitness.readOverview().active, null); assert.ok(f.fitness.readRoutine(f.routine));
  assert.equal(f.fitness.readOverview().history.length, 0);
});

test('normal completion, extra sets, deletion and exercise removal refresh the header; Finish stays outside the scroll content', async (t) => {
  const f = await fixture(t); const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  const name = f.exercises[0].exerciseName;
  await app.press(`Complete set for ${name}`); assert.ok(header(app).textContent.includes('0 of 4 exercises'));
  await app.press(`Complete set for ${name}`); assert.ok(header(app).textContent.includes('1 of 4 exercises'));
  await app.press(`Complete set for ${name}`); assert.ok(header(app).textContent.includes('1 of 4 exercises'));
  for (let i = 0; i < 2; i++) { await editWorkoutSet(app, name); await app.press('Delete set'); await app.confirm('Delete'); }
  assert.ok(header(app).textContent.includes('0 of 4 exercises'));
  await exerciseMenuAction(app, name, 'Remove exercise from workout'); await app.confirm('Remove');
  assert.ok(header(app).textContent.includes('0 of 3 exercises'));
  const finish = app.find('FormButton', 'Finish Workout'); assert.equal(finish.props.variant, 'primary');
  for (let parent = finish.parentNode; parent; parent = parent.parentNode) assert.ok(!['ScrollView', 'FormScrollView'].includes(parent.kind ?? ''));
  await app.press('Finish Workout'); await app.confirm('Finish Workout');
  assert.equal(f.fitness.readOverview().active, null); assert.equal(f.fitness.readOverview().history.length, 1);
});

for (const width of [320, 390, 430]) for (const fontScale of [1, 2]) test(`header at ${width}pt/font scale ${fontScale} preserves a long name, accessible count and menu with Reduced Motion`, async (t) => {
  const name = 'Pull Day — Back, biceps and a longer workout name';
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width, height: 900, fontScale, scale: 1 }));
  const f = await fixture(t, name); const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  await act(() => (runtime.reduceMotion as (value: boolean) => void)(true));
  const title = app.nodes(header(app)).find((node) => node.props?.accessibilityRole === 'header')!;
  assert.equal(title.props.accessibilityLabel, name); assert.equal(title.textContent, name);
  assert.equal(title.props.numberOfLines, fontScale === 2 ? undefined : 2);
  assert.ok(app.nodes(header(app)).some((node) => (node.props?.accessibilityValue as { text?: string })?.text === '0 of 4 exercises complete, 0 percent'));
  const style = Object.assign({}, ...header(app).props.style as object[]);
  assert.equal(style.height, undefined); assert.equal(style.maxHeight, undefined);
  await workoutMenuAction(app, 'Add workout note'); assert.ok(app.find('FormField', 'Note (optional)'));
});

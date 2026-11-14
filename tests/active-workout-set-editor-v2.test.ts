/// <reference types="node" />
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { blankSet, blankTargets, setDraft, validateSet } from '../src/features/fitness/form';
import type { MeasurementType, SetDraft } from '../src/features/fitness/types';
import { workoutProgress } from '../src/features/fitness/workout-presentation';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';
import { editWorkoutSet } from './helpers/workout-interactions';

const cases: { type: MeasurementType; initial: Partial<SetDraft>; fields: string[]; keys: Exclude<keyof SetDraft, 'distanceUnit'>[]; entered: string[] }[] = [
  { type: 'strength', initial: { weight: '25,125', reps: '12' }, fields: ['Weight (kg, optional)', 'Reps (optional)'], keys: ['weight', 'reps'], entered: ['30,001', '15'] },
  { type: 'bodyweight', initial: { weight: '2.5', reps: '10' }, fields: ['Reps (optional)', 'Added weight (kg, optional)'], keys: ['reps', 'weight'], entered: ['11', '3,125'] },
  { type: 'duration', initial: { minutes: '1', seconds: '30' }, fields: ['Minutes (optional)', 'Seconds'], keys: ['minutes', 'seconds'], entered: ['2', '05'] },
  { type: 'distance', initial: { distance: '2,5', minutes: '14', seconds: '32' }, fields: ['Distance (km)', 'Minutes (optional)', 'Seconds'], keys: ['distance', 'minutes', 'seconds'], entered: ['0,001', '', ''] },
];
type App = Awaited<ReturnType<typeof mount>>;
async function open(app: App, name: string) { await act(async () => { await editWorkoutSet(app, name); }); }
async function fixture(t: TestContext, type: MeasurementType = 'strength') {
  const f = await journalDatabase(); t.after(() => f.sqlite.close()); f.setTime('2026-11-13'); t.mock.method(Date, 'now', f.now);
  const sources = f.fitness.readOverview().exercises, source = sources.find(e => e.measurementType === type)!, other = sources.find(e => e.measurementType !== type)!;
  const routine = f.fitness.createRoutine({ name: 'Captured performance', exercises: [source, other].map((exercise, i) => ({ id: null, exerciseId: exercise.id, targets: { ...blankTargets(), setCount: i === 0 && (type === 'duration' || type === 'distance') ? '' : '2' } })) });
  const session = f.fitness.startWorkout(routine), [entry, sibling] = f.fitness.readSession(session.id).exercises;
  const initial = { ...blankSet(), ...cases.find(c => c.type === type)!.initial };
  const setId = f.fitness.addSet(entry.id, initial), siblingSetId = f.fitness.addSet(sibling.id, blankSet());
  if (type === 'duration' || type === 'distance') f.fitness.setExerciseCompleted(entry.id, true);
  const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  return { ...f, session, entry, sibling, setId, siblingSetId, initial, app, current: () => f.fitness.readSession(session.id).exercises.find(e => e.id === entry.id)!.sets.find(s => s.id === setId)! };
}
const snapshot = (f: Awaited<ReturnType<typeof fixture>>) => ['fitness_sets', 'fitness_session_exercises', 'fitness_workout_sessions'].map(table => f.sqlite.prepare(`SELECT * FROM ${table} ORDER BY id`).all());
const values = (set: ReturnType<Awaited<ReturnType<typeof fixture>>['current']>) => ({ weightGrams: set.weightGrams, reps: set.reps, durationSeconds: set.durationSeconds, distanceMeters: set.distanceMeters });

for (const theme of ['dark', 'light'] as const) for (const item of cases) test(`${theme}/${item.type}: v2 fields retain hydration, Save, clearing to null, Cancel and completion independence`, async t => {
  t.mock.method(runtime.native as { useColorScheme: () => string }, 'useColorScheme', () => theme);
  const f = await fixture(t, item.type), before = snapshot(f), progress = workoutProgress(f.fitness.readSession(f.session.id));
  await open(f.app, f.entry.exerciseName); const hydrated = setDraft(f.current());
  for (let i = 0; i < item.fields.length; i++) {
    const field = f.app.find('FormField', item.fields[i]); assert.equal(field.props.value, hydrated[item.keys[i]]); assert.equal(field.props.appearance, 'v2');
    await f.app.change(item.fields[i], item.entered[i]);
  }
  for (const label of ['Save', 'Cancel', 'Delete set']) assert.equal(f.app.find('FormButton', label).props.appearance, 'v2');
  await f.app.press('Cancel'); assert.deepEqual(snapshot(f), before);
  await open(f.app, f.entry.exerciseName); for (let i = 0; i < item.fields.length; i++) await f.app.change(item.fields[i], item.entered[i]);
  const expected = { ...f.initial }; item.keys.forEach((key, i) => { expected[key] = item.entered[i]; }); await f.app.press('Save');
  assert.deepEqual(values(f.current()), validateSet(item.type, expected)); assert.equal(f.current().id, f.setId); assert.equal(f.current().sessionExerciseId, f.entry.id);
  assert.deepEqual(workoutProgress(f.fitness.readSession(f.session.id)), progress); assert.equal(f.app.nodes().filter(n => n.kind === 'Modal').length, 0);
  await open(f.app, f.entry.exerciseName); const reopened = setDraft(f.current());
  for (let i = 0; i < item.fields.length; i++) { assert.equal(f.app.find('FormField', item.fields[i]).props.value, reopened[item.keys[i]]); await f.app.change(item.fields[i], ''); }
  await f.app.press('Save'); assert.deepEqual(values(f.current()), { weightGrams: null, reps: null, durationSeconds: null, distanceMeters: null });
  assert.equal(f.fitness.readSession(f.session.id).exercises[0].sets.length, 1); assert.deepEqual(workoutProgress(f.fitness.readSession(f.session.id)), progress);
});

const invalid: [MeasurementType, string, string, RegExp, string][] = [
  ['strength', 'Weight (kg, optional)', '1.2345', /up to 3 decimal places/, '1,234'],
  ['strength', 'Reps (optional)', '0', /Reps must be positive/, '1'],
  ['bodyweight', 'Added weight (kg, optional)', '0', /Weight must be positive/, '0,001'],
  ['duration', 'Seconds', '60', /between 0 and 59/, '59'],
  ['duration', 'Minutes (optional)', '0', /Duration must be positive/, '1'],
  ['distance', 'Distance (km)', '0', /Distance must be positive/, '0.001'],
];
for (const [type, field, input, message, correction] of invalid) test(`${type}/${field}/${input}: source validation retains the draft without writes and allows correction`, async t => {
  const f = await fixture(t, type); await open(f.app, f.entry.exerciseName);
  if (field === 'Minutes (optional)') await f.app.change('Seconds', '0');
  await f.app.change(field, input); const before = snapshot(f); await f.app.press('Save');
  assert.equal(f.app.find('FormField', field).props.value, input); assert.match(f.app.container.textContent, message); assert.deepEqual(snapshot(f), before);
  assert.equal(f.app.nodes().filter(n => n.kind === 'Modal').length, 1);
  assert.ok(f.app.nodes().some(n => n.kind === 'FormError' && n.props.appearance === 'v2' && n.props.message));
  await f.app.change(field, correction); await f.app.press('Save'); assert.equal(f.app.nodes().filter(n => n.kind === 'Modal').length, 0);
});

test('valid zero strength weight survives Save and reopen, while clearing that field persists null', async t => {
  const f = await fixture(t); f.fitness.editSet(f.setId, { ...blankSet(), weight: '0' }); await f.app.resume(); await open(f.app, f.entry.exerciseName);
  assert.equal(f.app.find('FormField', 'Weight (kg, optional)').props.value, '0'); await f.app.press('Save'); assert.equal(f.current().weightGrams, 0); assert.equal(f.current().reps, null);
  await open(f.app, f.entry.exerciseName); await f.app.change('Weight (kg, optional)', ''); await f.app.press('Save'); assert.equal(f.current().weightGrams, null);
});

test('distance unit switching clears only the distance draft and stores exact meters with canonical kilometer redisplay', async t => {
  const f = await fixture(t, 'distance'); await open(f.app, f.entry.exerciseName);
  assert.equal(f.app.find('SegmentedControl', 'Distance unit').props.appearance, 'v2');
  await act(async () => { (f.app.find('SegmentedControl', 'Distance unit').props.onChange as (v: string) => void)('m'); });
  assert.equal(f.app.find('FormField', 'Distance (m)').props.value, ''); assert.equal(f.app.find('FormField', 'Minutes (optional)').props.value, '14');
  await f.app.change('Distance (m)', '2501'); await f.app.press('Save'); assert.equal(f.current().distanceMeters, 2501); assert.equal(f.current().durationSeconds, 872);
  await open(f.app, f.entry.exerciseName); assert.equal(f.app.find('FormField', 'Distance (km)').props.value, '2.501');
});

test('captured set/exercise/workout IDs and working draft survive source refresh; stale double Save cannot write twice', async t => {
  const f = await fixture(t); await open(f.app, f.entry.exerciseName); await f.app.change('Weight (kg, optional)', '40,125');
  const editor = f.app.find('FormField', 'Weight (kg, optional)'), prior = f.current().updatedAt;
  f.fitness.editSet(f.siblingSetId, blankSet()); const sibling = f.fitness.readSession(f.session.id).exercises[1]; await f.app.resume();
  assert.equal(f.app.find('FormField', 'Weight (kg, optional)'), editor); assert.equal(editor.props.value, '40,125');
  const save = f.app.find('FormButton', 'Save').props.onPress as () => void;
  await act(async () => { save(); save(); }); assert.equal(f.current().updatedAt, prior + 1); assert.equal(f.current().weightGrams, 40125);
  assert.deepEqual(f.fitness.readSession(f.session.id).exercises[1], sibling); assert.equal(f.current().id, f.setId);
});

test('Delete preserves native confirmation, cancellation, failed-write draft retention and selected-set-only soft deletion', async t => {
  const f = await fixture(t); await open(f.app, f.entry.exerciseName); const before = snapshot(f);
  await f.app.press('Delete set'); assert.equal(runtime.fixture.alerts.at(-1)!.title, 'Delete set?'); assert.equal(runtime.fixture.alerts.at(-1)!.buttons.at(-1)!.style, 'destructive');
  await f.app.confirm('Cancel'); assert.deepEqual(snapshot(f), before); assert.equal(f.app.nodes().filter(n => n.kind === 'Modal').length, 1);
  f.sqlite.exec(`CREATE TEMP TRIGGER reject_set_delete BEFORE UPDATE OF deleted_at ON fitness_sets WHEN OLD.id = '${f.setId}' BEGIN SELECT RAISE(ABORT, 'Injected set deletion failure'); END;`);
  await f.app.press('Delete set'); await f.app.confirm('Delete'); assert.deepEqual(snapshot(f), before);
  assert.equal(f.app.nodes().filter(n => n.kind === 'Modal').length, 1);
  f.sqlite.exec('DROP TRIGGER reject_set_delete'); await f.app.press('Delete set'); await f.app.confirm('Delete');
  assert.equal(f.fitness.readSession(f.session.id).exercises[0].sets.length, 0); assert.equal(f.fitness.readSession(f.session.id).exercises[1].sets[0].id, f.siblingSetId);
  assert.equal(f.app.nodes().filter(n => n.kind === 'Modal').length, 0);
});

test('refresh failure, retry and a failed Save preserve the same dirty editor until a successful source write', async t => {
  const f = await fixture(t); await open(f.app, f.entry.exerciseName); await f.app.change('Weight (kg, optional)', '45,5');
  const editor = f.app.find('FormField', 'Weight (kg, optional)'), before = snapshot(f);
  runtime.fixture.failures.add('fitness.readSession'); await f.app.resume(); assert.equal(f.app.find('FormField', 'Weight (kg, optional)'), editor);
  runtime.fixture.failures.clear(); await f.app.press('Retry refresh'); assert.equal(editor.props.value, '45,5');
  f.sqlite.exec(`CREATE TEMP TRIGGER reject_set_edit BEFORE UPDATE OF weight_grams ON fitness_sets WHEN OLD.id = '${f.setId}' BEGIN SELECT RAISE(ABORT, 'Injected set edit failure'); END;`);
  await f.app.press('Save'); assert.deepEqual(snapshot(f), before); assert.equal(f.app.find('FormField', 'Weight (kg, optional)'), editor);
  f.sqlite.exec('DROP TRIGGER reject_set_edit'); await f.app.press('Save'); assert.equal(f.current().weightGrams, 45500); assert.equal(f.app.nodes().filter(n => n.kind === 'Modal').length, 0);
});

test('an editor captured before completion cannot bypass completed-workout read-only guards', async t => {
  const f = await fixture(t); await open(f.app, f.entry.exerciseName); await f.app.change('Weight (kg, optional)', '50');
  f.fitness.finishWorkout(f.session.id); const before = snapshot(f); await f.app.resume(); await f.app.press('Save');
  assert.ok(f.app.container.textContent.includes('Completed workouts are read-only.')); assert.deepEqual(snapshot(f), before);
  await f.app.press('Cancel'); assert.ok(!f.app.nodes().some(n => n.kind === 'Modal'));
});

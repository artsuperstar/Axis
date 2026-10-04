/// <reference types="node" />

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { createFitnessDataAccess } from '../src/features/fitness/data';
import { blankSet, exerciseResults, measurementOptions, validateSet } from '../src/features/fitness/form';
import { builtInExercises, seedFitnessExercises } from '../src/features/fitness/seed';
import type { MeasurementType } from '../src/features/fitness/types';
import { bundledMigrations, database } from './helpers/database';
import { autocomplete, fitnessForms, fitnessWorkout, renderControl } from './helpers/form-components';

async function initialized() {
  const result = database(); await migrate(result.db, bundledMigrations); seedFitnessExercises(result.db);
  return { ...result, fitness: createFitnessDataAccess(result.db, randomUUID, () => 1000) };
}

test('custom Exercise creation uses the shared four-option SelectField and persists/selects a created exercise once', async (t) => {
  const { sqlite, fitness } = await initialized(); t.after(() => sqlite.close());
  let createdId = ''; const events: string[] = [];
  const form = renderControl(() => fitnessForms.ExerciseEditor({ initialName: 'Cable Row', onSave: (draft) => {
    events.push('persist'); return fitness.createExercise(draft);
  }, onCreated: (exercise) => { createdId = exercise.id; events.push('select and return'); }, onDismiss: () => events.push('cancel') }));
  const selector = form.elements.find((element) => element.props.label === 'Measurement type *')!;
  assert.deepEqual(selector.props.options, measurementOptions);
  assert.match(form.markup, /Measurement type/); assert.match(form.markup, /combobox/);
  form.elements[0].props.onConfirm!(); form.elements[0].props.onConfirm!();
  assert.deepEqual(events, ['persist', 'select and return']);
  assert.equal(fitness.read().exercises.find((exercise) => exercise.id === createdId)!.name, 'Cable Row');
});

test('richer autocomplete creation dismisses the menu before handing off and prevents duplicate requests', () => {
  const events: string[] = [];
  const form = renderControl(() => autocomplete.AutocompletePanel({ label: 'Exercise', value: null,
    displayValue: 'Search exercises', getResults: () => ({ suggestions: [], createLabel: '+ Create “Row”' }),
    onSelect: () => events.push('select'), onRequestCreate: () => events.push('open rich sheet'),
    onClose: () => events.push('close menu'), onSize: () => {} }));
  const optionList = form.elements.find((element) => element.type === autocomplete.AutocompleteOptions)!;
  optionList.props.onCreate!(''); optionList.props.onCreate!('');
  assert.deepEqual(events, ['close menu', 'open rich sheet']);
});

test('routine and workout editors both use shared active exercise autocomplete and richer creation callbacks', async (t) => {
  const { sqlite, fitness } = await initialized(); t.after(() => sqlite.close());
  const archived = fitness.createExercise({ name: 'Past Exercise', measurementType: 'strength' }); fitness.archiveExercise(archived.id);
  const exercises = fitness.read().exercises;
  const routine = renderControl(() => fitnessForms.RoutineEditor({ routine: null, exercises, onSave: () => {}, onCreateExercise: fitness.createExercise, onDismiss: () => {} }));
  const workout = renderControl(() => fitnessForms.AddExerciseSheet({ exercises, onAdd: () => {}, onCreateExercise: fitness.createExercise, onDismiss: () => {} }));
  for (const form of [routine, workout]) {
    const field = form.elements.find((element) => element.type === autocomplete.AutocompleteField)!;
    assert.equal(typeof field.props.onRequestCreate, 'function');
    assert.deepEqual(field.props.getResults!('ben'), exerciseResults(exercises, 'ben'));
    assert.equal(field.props.getResults!('Past').suggestions.length, 0);
  }
});

test('selecting an existing exercise in the workout picker persists it and returns to the workout', async (t) => {
  const { sqlite, fitness } = await initialized(); t.after(() => sqlite.close());
  const session = fitness.startWorkout(); const exerciseId = builtInExercises[0].id; const events: string[] = [];
  const form = renderControl(() => fitnessForms.AddExerciseSheet({ exercises: fitness.read().exercises, onCreateExercise: fitness.createExercise,
    onAdd: (id) => { fitness.addSessionExercise(session.id, id); events.push('add'); }, onDismiss: () => events.push('return') }));
  form.elements.find((element) => element.type === autocomplete.AutocompleteField)!.props.onSelect!(exerciseId);
  assert.deepEqual(events, ['add', 'return']); assert.equal(fitness.readSession(session.id).exercises[0].exerciseId, exerciseId);
});

for (const [type, values, fields, excluded] of [
  ['strength', { weight: '12.5', reps: '10' }, ['Weight (kg) *', 'Reps *'], ['Minutes', 'Distance (km)']],
  ['bodyweight', { reps: '8' }, ['Added weight (kg, optional)', 'Reps *'], ['Minutes', 'Distance (km)']],
  ['duration', { minutes: '1', seconds: '30' }, ['Minutes', 'Seconds (0–59)'], ['Reps *', 'Weight (kg) *']],
  ['distance', { distance: '2.5', minutes: '10' }, ['Distance (km)', 'Minutes (optional)'], ['Reps *', 'Weight (kg) *']],
] as [MeasurementType, Partial<ReturnType<typeof blankSet>>, string[], string[]][]) {
  test(`set editor exposes only ${type} fields and saves exact previous-set defaults`, async (t) => {
    const { sqlite, fitness } = await initialized(); t.after(() => sqlite.close());
    const session = fitness.startWorkout(); const source = builtInExercises.find((exercise) => exercise.measurementType === type)!;
    const exerciseId = fitness.addSessionExercise(session.id, source.id); fitness.addSet(exerciseId, { ...blankSet(), ...values });
    const previous = fitness.readSession(session.id).exercises[0].sets[0]; let dismissed = false;
    const form = renderControl(() => fitnessForms.SetEditor({ name: source.name, type, previous,
      onSave: (draft) => { assert.deepEqual(validateSet(type, draft), validateSet(type, { ...blankSet(), ...values })); fitness.addSet(exerciseId, draft); },
      onDismiss: () => { dismissed = true; } }));
    for (const field of fields) assert.ok(form.elements.some((element) => element.props.label === field) || form.markup.includes(field));
    for (const field of excluded) assert.ok(!form.markup.includes(field));
    form.elements[0].props.onConfirm!(); assert.equal(dismissed, true); assert.equal(fitness.readSession(session.id).exercises[0].sets.length, 2);
  });
}

test('Workout sheet shows actual sets, next draft ordinal and planned count without storing empty slots', async (t) => {
  const { sqlite, fitness } = await initialized(); t.after(() => sqlite.close());
  const session = fitness.startWorkout(); const exerciseId = fitness.addSessionExercise(session.id, builtInExercises[0].id);
  const a = fitness.addSet(exerciseId, { ...blankSet(), weight: '60', reps: '10' });
  fitness.addSet(exerciseId, { ...blankSet(), weight: '60', reps: '9' }); fitness.deleteSet(a);
  const events: string[] = [];
  const callbacks = { error: null, onDismiss: () => {}, onFinish: () => {}, onDiscard: () => {}, onAddExercise: () => {},
    onRemoveExercise: () => {}, onSet: (id: string, setId: string | null) => events.push(`${id}:${setId}`), onDeleteSet: () => {}, onNote: () => {} };
  const form = renderControl(() => fitnessWorkout.WorkoutSheet({ ...callbacks, session: fitness.readSession(session.id) }));
  assert.match(form.markup, /Set 1 · 60 kg × 9/); assert.ok(!form.markup.includes('Set 2 ·'));
  form.elements.find((element) => element.props.label === 'Log set 2')!.props.onPress!();
  assert.deepEqual(events, [`${exerciseId}:null`]); assert.ok(form.elements.some((element) => element.props.label === 'Finish Workout'));
  fitness.finishWorkout(session.id);
  const history = renderControl(() => fitnessWorkout.WorkoutSheet({ ...callbacks, session: fitness.readSession(session.id) }));
  assert.match(history.markup, /60 kg × 9/);
  for (const label of ['Finish Workout', 'Discard workout', 'Edit', 'Delete', 'Add exercise', 'Log set 2', 'Add note']) {
    assert.ok(!history.elements.some((element) => element.props.label === label));
  }
});

test('session note editor saves the existing note through the real domain and returns', async (t) => {
  const { sqlite, fitness } = await initialized(); t.after(() => sqlite.close());
  const session = fitness.startWorkout(); const exerciseId = fitness.addSessionExercise(session.id, builtInExercises[0].id);
  let returned = false;
  const form = renderControl(() => fitnessForms.NoteEditor({ title: 'Exercise note', value: 'Shoulder tight',
    onSave: (note) => fitness.saveNote(session.id, exerciseId, note), onDismiss: () => { returned = true; } }));
  form.elements[0].props.onConfirm!(); assert.equal(returned, true);
  assert.equal(fitness.readSession(session.id).exercises[0].note, 'Shoulder tight');
});

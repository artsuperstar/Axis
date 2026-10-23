import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, StyleSheet, View, useWindowDimensions, type ViewInstance } from 'react-native';

import { AdaptiveSheet, useModalBackHandler } from '@/components/adaptive-sheet';
import { AutocompleteField } from '@/components/autocomplete-field';
import { UiText } from '@/components/design-system';
import { EditorSection } from '@/components/editor-section';
import { FormButton, FormError, FormField, SegmentedControl, SelectField } from '@/components/form-controls';
import { focusFormControl } from '@/components/form-selection-host';
import { ThemedText } from '@/components/themed-text';
import { Space, Spacing } from '@/constants/theme';

import { blankTargets, exerciseResults, fitnessError, measurementOptions, normalizeName, setDraft, targetDraft, targetLabel, validateMeasurement, validateSet, validateTargets } from '../form';
import type { Exercise, MeasurementType, RoutineDetail, RoutineDraft, SetDraft, TargetDraft, WorkoutSet } from '../types';
import { RoutineComposition, RoutineHeader } from './routine-composition';
import { RoutineExercisePicker } from './routine-exercise-picker';
import { measurementIcons } from '../workout-presentation';

function useSave() {
  const saving = useRef(false);
  const [error, setError] = useState<string | null>(null);
  return { error, clearError: () => setError(null), save: (action: () => void) => {
    if (saving.current) return;
    saving.current = true;
    try { action(); } catch (cause) { saving.current = false; setError(fitnessError(cause)); }
  } };
}
const decimalKeyboard = Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad';

export function ExerciseEditor({ initialName = '', onSave, onCreated, onDismiss, appearance }: {
  initialName?: string; onSave: (draft: { name: string; measurementType: MeasurementType }) => Exercise;
  onCreated: (exercise: Exercise) => void; onDismiss: () => void; appearance?: 'v2';
}) {
  const [name, setName] = useState(initialName);
  const [measurementType, setType] = useState<MeasurementType>('strength');
  const submit = useSave();
  function create() { submit.save(() => {
    const exercise = onSave({ name: normalizeName(name), measurementType: validateMeasurement(measurementType) });
    onCreated(exercise);
  }); }
  const helper = measurementType === 'strength' ? 'Weight in kg and reps.' : measurementType === 'bodyweight' ? 'Reps and optional added weight in kg.' :
    measurementType === 'duration' ? 'Minutes and seconds.' : 'Meters or kilometers, with optional duration.';
  const identity = <FormField appearance={appearance} label="Name *" value={name} autoFocus maxLength={120} onChangeText={(value) => { setName(value); submit.clearError(); }} />;
  const measurement = <SelectField appearance={appearance} label="Measurement type *" value={measurementType} options={measurementOptions} onChange={(value) => { setType(value); submit.clearError(); }} />;
  return <AdaptiveSheet appearance={appearance} title="New exercise" action="Create" onDismiss={onDismiss} onConfirm={create}
    header={appearance ? <RoutineHeader title="New exercise" onDismiss={onDismiss} action="Create" onSave={create} /> : undefined}>
    <FormError appearance={appearance} message={submit.error} />
    {appearance ? <>
      <EditorSection title="Exercise" description="" icon={measurementIcons[measurementType]} variant="group">{identity}</EditorSection>
      <EditorSection title="Measurement" headingType="cardTitle" description="" icon="list" variant="group">{measurement}<UiText type="secondary" color="textSecondary">{helper}</UiText></EditorSection>
    </> : <>{identity}{measurement}<ThemedText type="small" themeColor="textSecondary">{helper}</ThemedText></>}
  </AdaptiveSheet>;
}

export function DurationFields({ minutes, seconds, onChange, optional = false, logging = false, autoFocus = !optional, appearance }: {
  minutes: string; seconds: string; onChange: (key: 'minutes' | 'seconds', value: string) => void; optional?: boolean; logging?: boolean; autoFocus?: boolean; appearance?: 'v2';
}) {
  const { fontScale } = useWindowDimensions();
  if (logging) return <View style={styles.fields}>
    <ThemedText type="secondary" themeColor="textSecondary">{optional ? 'Duration (optional)' : 'Duration'} · Seconds: 0–59</ThemedText>
    <View style={styles.duration}>
      <View style={[styles.durationPart, { flexBasis: 120 * Math.max(1, fontScale) }]}><FormField label={optional ? 'Minutes (optional)' : 'Minutes'} value={minutes} autoFocus={autoFocus} keyboardType="number-pad" onChangeText={(value) => onChange('minutes', value)} /></View>
      <View style={[styles.durationPart, { flexBasis: 120 * Math.max(1, fontScale) }]}><FormField label="Seconds" value={seconds} keyboardType="number-pad" onChangeText={(value) => onChange('seconds', value)} /></View>
    </View>
  </View>;
  return <View style={styles.fields}>
    <FormField appearance={appearance} label={optional ? 'Minutes (optional)' : 'Minutes'} value={minutes} keyboardType="number-pad" onChangeText={(value) => onChange('minutes', value)} />
    <FormField appearance={appearance} label="Seconds (0–59)" value={seconds} keyboardType="number-pad" onChangeText={(value) => onChange('seconds', value)} />
  </View>;
}
export function DistanceFields({ distance, distanceUnit, onChange, logging = false, appearance }: {
  distance: string; distanceUnit: 'm' | 'km'; onChange: (key: 'distance' | 'distanceUnit', value: string) => void; logging?: boolean; appearance?: 'v2';
}) {
  return <View style={styles.fields}>
    <SegmentedControl appearance={appearance} label="Distance unit" value={distanceUnit} options={[{ value: 'km', label: 'km' }, { value: 'm', label: 'm' }]}
      onChange={(value) => {
        // Do not reinterpret a previously entered quantity when its unit changes.
        onChange('distance', ''); onChange('distanceUnit', value);
      }} />
    <FormField appearance={appearance} label={`Distance (${distanceUnit})`} value={distance} autoFocus={logging} keyboardType={distanceUnit === 'km' ? decimalKeyboard : 'number-pad'} onChangeText={(value) => onChange('distance', value)} />
  </View>;
}
export function TargetFields({ type, draft, onChange, appearance }: { type: MeasurementType; draft: TargetDraft; onChange: (draft: TargetDraft) => void; appearance?: 'v2' }) {
  function change(key: keyof TargetDraft, value: string) { onChange({ ...draft, [key]: value }); }
  return <View style={styles.fields}>
    <FormField appearance={appearance} label="Planned sets (optional, 1–100)" value={draft.setCount} keyboardType="number-pad" onChangeText={(value) => change('setCount', value)} />
    {(type === 'strength' || type === 'bodyweight') && <>
      <FormField appearance={appearance} label="Minimum reps (optional)" value={draft.repMin} keyboardType="number-pad" onChangeText={(value) => change('repMin', value)} />
      <FormField appearance={appearance} label="Maximum reps (optional)" value={draft.repMax} keyboardType="number-pad" onChangeText={(value) => change('repMax', value)} />
    </>}
    {type === 'duration' && <DurationFields appearance={appearance} minutes={draft.minutes} seconds={draft.seconds} optional onChange={change} />}
    {type === 'distance' && <DistanceFields appearance={appearance} distance={draft.distance} distanceUnit={draft.distanceUnit}
      onChange={(key, value) => onChange(key === 'distanceUnit' ? { ...draft, distance: '', distanceUnit: value as 'm' | 'km' } : { ...draft, distance: value })} />}
  </View>;
}

type RoutineEntryDraft = { key: string; id: string | null; exercise: Exercise; targets: TargetDraft };
function draftTargets(entry: RoutineEntryDraft) {
  try { return targetLabel(validateTargets(entry.exercise.measurementType, entry.targets)) || 'No targets'; }
  catch { return 'Check target values'; }
}
export function RoutineEditor({ routine, exercises, onSave, onCreateExercise, onDismiss }: {
  routine: RoutineDetail | null; exercises: Exercise[]; onSave: (draft: RoutineDraft) => void;
  onCreateExercise: (draft: { name: string; measurementType: MeasurementType }) => Exercise; onDismiss: () => void;
}) {
  const [name, setName] = useState(routine?.name ?? '');
  const [entries, setEntries] = useState<RoutineEntryDraft[]>(() => (routine?.exercises ?? []).map((entry) => ({
    key: entry.id, id: entry.id, exercise: entry.exercise, targets: targetDraft(entry),
  })));
  const sequence = useRef(0);
  const [creating, setCreating] = useState<string | null>(null);
  const [targetEntry, setTargetEntry] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [query, setQuery] = useState('');
  const addTrigger = useRef<ViewInstance>(null);
  const returning = useRef(false);
  const closePicker = useCallback(() => { Keyboard.dismiss(); returning.current = true; setChoosing(false); }, []);
  const cancelCreation = useCallback(() => { Keyboard.dismiss(); setCreating(null); }, []);
  useModalBackHandler(creating !== null ? cancelCreation : choosing ? closePicker : null);
  useEffect(() => {
    if (choosing || creating !== null || !returning.current) return;
    const frame = requestAnimationFrame(() => { returning.current = false; focusFormControl(addTrigger.current); });
    return () => cancelAnimationFrame(frame);
  }, [choosing, creating]);
  const submit = useSave();
  function append(exercise: Exercise) {
    const key = `draft-${++sequence.current}`;
    setEntries((current) => [...current, { key, id: null, exercise, targets: blankTargets() }]); submit.clearError();
  }
  function move(index: number, direction: -1 | 1) {
    setEntries((current) => {
      const next = [...current]; const other = index + direction;
      if (other < 0 || other >= next.length) return current;
      [next[index], next[other]] = [next[other], next[index]]; return next;
    });
  }
  // The editor remains mounted while the richer creation sheet temporarily replaces its content.
  if (creating !== null) return <ExerciseEditor appearance="v2" initialName={creating} onSave={onCreateExercise}
    onDismiss={cancelCreation} onCreated={(exercise) => { append(exercise); setCreating(null); closePicker(); }} />;
  if (choosing) return <RoutineExercisePicker exercises={exercises} query={query} onQueryChange={setQuery}
    onDismiss={closePicker} onCreate={(name) => { Keyboard.dismiss(); setCreating(name); }}
    onSelect={(exercise) => { if (exercise.deletedAt === null) { append(exercise); closePicker(); } }} />;
  function save() { submit.save(() => {
    normalizeName(name); entries.forEach((entry) => validateTargets(entry.exercise.measurementType, entry.targets));
    onSave({ name, exercises: entries.map((entry) => ({ id: entry.id, exerciseId: entry.exercise.id, targets: entry.targets })) }); onDismiss();
  }); }
  const title = routine ? 'Edit routine' : 'New routine';
  return <AdaptiveSheet appearance="v2" fillHeight title={title} action="Save" onDismiss={onDismiss} onConfirm={save}
    header={<View><RoutineHeader title={title} onDismiss={onDismiss} onSave={save} />
      {!!submit.error && <View style={styles.saveError}><FormError appearance="v2" message={submit.error} /></View>}</View>}
    scrollBody={<RoutineComposition entries={entries} summary={draftTargets}
      identity={<FormField appearance="v2" label="Routine name *" value={name} maxLength={120} placeholder="Routine name"
        onChangeText={(value) => { setName(value); submit.clearError(); }} />}
      addExercise={<FormButton ref={addTrigger} appearance="v2" tone="brand" leadingIcon="plus" label="Add exercise"
        onPress={() => { Keyboard.dismiss(); setQuery(''); setChoosing(true); }} />}
      renderActions={(entry, index) => <>
        <FormButton appearance="v2" compact leadingIcon="target" label="Targets" accessibilityLabel={`Configure targets for ${entry.exercise.name}`} expanded={targetEntry === entry.key}
          onPress={() => setTargetEntry((current) => current === entry.key ? null : entry.key)} />
        <FormButton appearance="v2" compact icon="up" label="Up" accessibilityLabel={`Move ${entry.exercise.name} up`} disabled={index === 0} onPress={() => move(index, -1)} />
        <FormButton appearance="v2" compact icon="down" label="Down" accessibilityLabel={`Move ${entry.exercise.name} down`} disabled={index === entries.length - 1} onPress={() => move(index, 1)} />
        <FormButton appearance="v2" compact variant="destructive" leadingIcon="trash" label="Remove" accessibilityLabel={`Remove ${entry.exercise.name} from routine`} onPress={() => { setEntries((current) => current.filter((item) => item.key !== entry.key)); submit.clearError(); }} />
      </>}
      renderTargets={(entry) => targetEntry === entry.key && <TargetFields appearance="v2" type={entry.exercise.measurementType} draft={entry.targets} onChange={(targets) => {
        setEntries((current) => current.map((item) => item.key === entry.key ? { ...item, targets } : item)); submit.clearError();
      }} />} />} />;
}

/** Archived routines retain their separate, strictly read-only entry point. */
export function ArchivedRoutineEditor({ routine, onDismiss }: { routine: RoutineDetail; onDismiss: () => void }) {
  const entries = routine.exercises.map((entry) => ({ key: entry.id, exercise: entry.exercise, summary: targetLabel(entry) || 'No targets' }));
  return <AdaptiveSheet appearance="v2" fillHeight title={routine.name} onDismiss={onDismiss}
    header={<RoutineHeader title="Archived routine" onDismiss={onDismiss} />}
    scrollBody={<RoutineComposition readOnly entries={entries} summary={(entry) => entry.summary}
      identity={<UiText type="editorSection" accessibilityRole="header">{routine.name}</UiText>} />} />;
}

export function AddExerciseSheet({ exercises, onAdd, onCreateExercise, onDismiss }: {
  exercises: Exercise[]; onAdd: (exerciseId: string) => void;
  onCreateExercise: (draft: { name: string; measurementType: MeasurementType }) => Exercise; onDismiss: () => void;
}) {
  const [creating, setCreating] = useState<string | null>(null);
  const submit = useSave();
  function add(exerciseId: string) { submit.save(() => { onAdd(exerciseId); onDismiss(); }); }
  if (creating !== null) return <ExerciseEditor initialName={creating} onSave={onCreateExercise} onDismiss={() => setCreating(null)} onCreated={(exercise) => {
    setCreating(null); add(exercise.id);
  }} />;
  return <AdaptiveSheet title="Add exercise" onDismiss={onDismiss}>
    <FormError message={submit.error} />
    <AutocompleteField<string | null> label="Exercise" value={null} displayValue="Search exercises"
      getResults={(query) => exerciseResults(exercises, query)} onSelect={(id) => { if (id) add(id); }} onRequestCreate={setCreating} />
  </AdaptiveSheet>;
}

export function SetEditor({ name, type, existing, onSave, onDismiss, onDelete, error }: {
  name: string; type: MeasurementType; existing: WorkoutSet; onSave: (draft: SetDraft) => void; onDismiss: () => void;
  onDelete?: () => void; error?: string | null;
}) {
  const [draft, setDraftValue] = useState(() => setDraft(existing));
  const submit = useSave();
  function change(key: keyof SetDraft, value: string) { setDraftValue((current) => ({ ...current, [key]: value })); submit.clearError(); }
  return <AdaptiveSheet title="Edit set" action="Save" onDismiss={onDismiss} onConfirm={() => submit.save(() => {
    validateSet(type, draft); onSave(draft); onDismiss();
  })}>
    <FormError message={submit.error || error || null} />
    <ThemedText type="smallBold">{name}</ThemedText>
    <ThemedText type="small" themeColor="textSecondary">Performance details are optional. Empty fields stay empty.</ThemedText>
    {type === 'strength' && <FormField label="Weight (kg, optional)" value={draft.weight} autoFocus keyboardType={decimalKeyboard} onChangeText={(value) => change('weight', value)} />}
    {(type === 'strength' || type === 'bodyweight') && <FormField label="Reps (optional)" value={draft.reps} autoFocus={type === 'bodyweight'} keyboardType="number-pad" onChangeText={(value) => change('reps', value)} />}
    {type === 'bodyweight' && <FormField label="Added weight (kg, optional)" value={draft.weight} keyboardType={decimalKeyboard} onChangeText={(value) => change('weight', value)} />}
    {type === 'distance' && <DistanceFields logging distance={draft.distance} distanceUnit={draft.distanceUnit} onChange={change} />}
    {(type === 'duration' || type === 'distance') && <DurationFields logging minutes={draft.minutes} seconds={draft.seconds} onChange={change} optional autoFocus={type === 'duration'} />}
    {existing && onDelete && <FormButton variant="destructive" label="Delete set" accessibilityLabel={`Delete set for ${name}`} onPress={onDelete} />}
  </AdaptiveSheet>;
}

export function NoteEditor({ title, value, onSave, onDismiss }: { title: string; value: string | null; onSave: (note: string) => void; onDismiss: () => void }) {
  const [note, setNote] = useState(value ?? '');
  const submit = useSave();
  return <AdaptiveSheet title={title} action="Save" onDismiss={onDismiss} onConfirm={() => submit.save(() => { onSave(note); onDismiss(); })}>
    <FormError message={submit.error} />
    <FormField label="Note (optional)" value={note} multiline maxLength={2000} autoFocus onChangeText={(value) => { setNote(value); submit.clearError(); }} />
  </AdaptiveSheet>;
}

const styles = StyleSheet.create({
  saveError: { paddingHorizontal: Space.md, paddingBottom: Space.sm },
  duration: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.md }, durationPart: { flexGrow: 1, flexShrink: 1 },
  fields: { gap: Spacing.two },
});

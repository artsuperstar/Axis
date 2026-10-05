import { useRef, useState } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

import { AdaptiveSheet } from '@/components/adaptive-sheet';
import { AutocompleteField } from '@/components/autocomplete-field';
import { FormButton, FormError, FormField, SegmentedControl, SelectField } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { Space, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { blankTargets, exerciseResults, fitnessError, measurementLabel, measurementOptions, normalizeName, setDraft, targetDraft, validateMeasurement, validateSet, validateTargets } from '../form';
import type { Exercise, MeasurementType, RoutineDetail, RoutineDraft, SetDraft, TargetDraft, WorkoutSet } from '../types';

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

export function ExerciseEditor({ initialName = '', onSave, onCreated, onDismiss }: {
  initialName?: string; onSave: (draft: { name: string; measurementType: MeasurementType }) => Exercise;
  onCreated: (exercise: Exercise) => void; onDismiss: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [measurementType, setType] = useState<MeasurementType>('strength');
  const submit = useSave();
  return <AdaptiveSheet title="New exercise" action="Create" onDismiss={onDismiss} onConfirm={() => submit.save(() => {
    const exercise = onSave({ name: normalizeName(name), measurementType: validateMeasurement(measurementType) });
    onCreated(exercise);
  })}>
    <FormError message={submit.error} />
    <FormField label="Name *" value={name} autoFocus maxLength={120} onChangeText={(value) => { setName(value); submit.clearError(); }} />
    <SelectField label="Measurement type *" value={measurementType} options={measurementOptions} onChange={(value) => { setType(value); submit.clearError(); }} />
    <ThemedText type="small" themeColor="textSecondary">
      {measurementType === 'strength' ? 'Weight in kg and reps.' : measurementType === 'bodyweight' ? 'Reps and optional added weight in kg.' :
        measurementType === 'duration' ? 'Minutes and seconds.' : 'Meters or kilometers, with optional duration.'}
    </ThemedText>
  </AdaptiveSheet>;
}

export function DurationFields({ minutes, seconds, onChange, optional = false, logging = false }: {
  minutes: string; seconds: string; onChange: (key: 'minutes' | 'seconds', value: string) => void; optional?: boolean; logging?: boolean;
}) {
  const { fontScale } = useWindowDimensions();
  if (logging) return <View style={styles.fields}>
    <ThemedText type="secondary" themeColor="textSecondary">{optional ? 'Duration (optional)' : 'Duration'} · Seconds: 0–59</ThemedText>
    <View style={styles.duration}>
      <View style={[styles.durationPart, { flexBasis: 120 * Math.max(1, fontScale) }]}><FormField label={optional ? 'Minutes (optional)' : 'Minutes'} value={minutes} autoFocus={!optional} keyboardType="number-pad" onChangeText={(value) => onChange('minutes', value)} /></View>
      <View style={[styles.durationPart, { flexBasis: 120 * Math.max(1, fontScale) }]}><FormField label="Seconds" value={seconds} keyboardType="number-pad" onChangeText={(value) => onChange('seconds', value)} /></View>
    </View>
  </View>;
  return <View style={styles.fields}>
    <FormField label={optional ? 'Minutes (optional)' : 'Minutes'} value={minutes} keyboardType="number-pad" onChangeText={(value) => onChange('minutes', value)} />
    <FormField label="Seconds (0–59)" value={seconds} keyboardType="number-pad" onChangeText={(value) => onChange('seconds', value)} />
  </View>;
}
export function DistanceFields({ distance, distanceUnit, onChange, logging = false }: {
  distance: string; distanceUnit: 'm' | 'km'; onChange: (key: 'distance' | 'distanceUnit', value: string) => void; logging?: boolean;
}) {
  return <View style={styles.fields}>
    <SegmentedControl label="Distance unit" value={distanceUnit} options={[{ value: 'km', label: 'km' }, { value: 'm', label: 'm' }]}
      onChange={(value) => {
        // Do not reinterpret a previously entered quantity when its unit changes.
        onChange('distance', ''); onChange('distanceUnit', value);
      }} />
    <FormField label={`Distance (${distanceUnit})`} value={distance} autoFocus={logging} keyboardType={distanceUnit === 'km' ? decimalKeyboard : 'number-pad'} onChangeText={(value) => onChange('distance', value)} />
  </View>;
}
export function TargetFields({ type, draft, onChange }: { type: MeasurementType; draft: TargetDraft; onChange: (draft: TargetDraft) => void }) {
  function change(key: keyof TargetDraft, value: string) { onChange({ ...draft, [key]: value }); }
  return <View style={styles.fields}>
    <FormField label="Planned sets (optional, 1–100)" value={draft.setCount} keyboardType="number-pad" onChangeText={(value) => change('setCount', value)} />
    {(type === 'strength' || type === 'bodyweight') && <>
      <FormField label="Minimum reps (optional)" value={draft.repMin} keyboardType="number-pad" onChangeText={(value) => change('repMin', value)} />
      <FormField label="Maximum reps (optional)" value={draft.repMax} keyboardType="number-pad" onChangeText={(value) => change('repMax', value)} />
    </>}
    {type === 'duration' && <DurationFields minutes={draft.minutes} seconds={draft.seconds} optional onChange={change} />}
    {type === 'distance' && <DistanceFields distance={draft.distance} distanceUnit={draft.distanceUnit}
      onChange={(key, value) => onChange(key === 'distanceUnit' ? { ...draft, distance: '', distanceUnit: value as 'm' | 'km' } : { ...draft, distance: value })} />}
  </View>;
}

type RoutineEntryDraft = { key: string; id: string | null; exercise: Exercise; targets: TargetDraft };
export function RoutineEditor({ routine, exercises, onSave, onCreateExercise, onDismiss }: {
  routine: RoutineDetail | null; exercises: Exercise[]; onSave: (draft: RoutineDraft) => void;
  onCreateExercise: (draft: { name: string; measurementType: MeasurementType }) => Exercise; onDismiss: () => void;
}) {
  const colors = useTheme();
  const [name, setName] = useState(routine?.name ?? '');
  const [entries, setEntries] = useState<RoutineEntryDraft[]>(() => (routine?.exercises ?? []).map((entry) => ({
    key: entry.id, id: entry.id, exercise: entry.exercise, targets: targetDraft(entry),
  })));
  const sequence = useRef(0);
  const [creating, setCreating] = useState<string | null>(null);
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
  if (creating !== null) return <ExerciseEditor initialName={creating} onSave={onCreateExercise}
    onDismiss={() => setCreating(null)} onCreated={(exercise) => { append(exercise); setCreating(null); }} />;
  return <AdaptiveSheet title={routine ? 'Edit routine' : 'New routine'} action="Save" onDismiss={onDismiss} onConfirm={() => submit.save(() => {
    normalizeName(name); entries.forEach((entry) => validateTargets(entry.exercise.measurementType, entry.targets));
    onSave({ name, exercises: entries.map((entry) => ({ id: entry.id, exerciseId: entry.exercise.id, targets: entry.targets })) }); onDismiss();
  })}>
    <FormError message={submit.error} />
    <FormField label="Routine name *" value={name} maxLength={120} onChangeText={(value) => { setName(value); submit.clearError(); }} />
    <AutocompleteField<string | null> label="Add exercise" value={null} displayValue="Search exercises"
      getResults={(query) => exerciseResults(exercises, query)} onSelect={(id) => {
        const exercise = exercises.find((entry) => entry.id === id && entry.deletedAt === null); if (exercise) append(exercise);
      }} onRequestCreate={setCreating} />
    {!entries.length && <ThemedText type="small" themeColor="textSecondary">Add exercises now, or keep this routine empty.</ThemedText>}
    {entries.map((entry, index) => <View key={entry.key} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <ThemedText type="smallBold" accessibilityRole="header">{index + 1}. {entry.exercise.name}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{measurementLabel(entry.exercise.measurementType)}{entry.exercise.deletedAt !== null ? ' · Archived — omitted from new workouts' : ''}</ThemedText>
      <View style={styles.actions}>
        <FormButton label="Move up" accessibilityLabel={`Move ${entry.exercise.name} up`} disabled={index === 0} onPress={() => move(index, -1)} />
        <FormButton label="Move down" accessibilityLabel={`Move ${entry.exercise.name} down`} disabled={index === entries.length - 1} onPress={() => move(index, 1)} />
        <FormButton label="Remove" accessibilityLabel={`Remove ${entry.exercise.name} from routine`} onPress={() => { setEntries((current) => current.filter((item) => item.key !== entry.key)); submit.clearError(); }} />
      </View>
      <TargetFields type={entry.exercise.measurementType} draft={entry.targets} onChange={(targets) => {
        setEntries((current) => current.map((item) => item.key === entry.key ? { ...item, targets } : item)); submit.clearError();
      }} />
    </View>)}
  </AdaptiveSheet>;
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

export function SetEditor({ name, type, existing, previous, onSave, onDismiss, onDelete, error }: {
  name: string; type: MeasurementType; existing?: WorkoutSet; previous?: WorkoutSet; onSave: (draft: SetDraft) => void; onDismiss: () => void;
  onDelete?: () => void; error?: string | null;
}) {
  const [draft, setDraftValue] = useState(() => setDraft(existing ?? previous));
  const submit = useSave();
  function change(key: keyof SetDraft, value: string) { setDraftValue((current) => ({ ...current, [key]: value })); submit.clearError(); }
  return <AdaptiveSheet title={existing ? 'Edit set' : 'Log set'} action="Save" onDismiss={onDismiss} onConfirm={() => submit.save(() => {
    validateSet(type, draft); onSave(draft); onDismiss();
  })}>
    <FormError message={submit.error || error || null} />
    <ThemedText type="smallBold">{name}</ThemedText>
    {!existing && previous && <ThemedText type="small" themeColor="textSecondary">Prefilled from your last logged set in this workout.</ThemedText>}
    {type === 'strength' && <FormField label="Weight (kg) *" value={draft.weight} autoFocus keyboardType={decimalKeyboard} onChangeText={(value) => change('weight', value)} />}
    {(type === 'strength' || type === 'bodyweight') && <FormField label="Reps *" value={draft.reps} autoFocus={type === 'bodyweight'} keyboardType="number-pad" onChangeText={(value) => change('reps', value)} />}
    {type === 'bodyweight' && <FormField label="Added weight (kg, optional)" value={draft.weight} keyboardType={decimalKeyboard} onChangeText={(value) => change('weight', value)} />}
    {type === 'distance' && <DistanceFields logging distance={draft.distance} distanceUnit={draft.distanceUnit} onChange={change} />}
    {(type === 'duration' || type === 'distance') && <DurationFields logging minutes={draft.minutes} seconds={draft.seconds} onChange={change} optional={type === 'distance'} />}
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
  duration: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.md }, durationPart: { flexGrow: 1, flexShrink: 1 },
  fields: { gap: Spacing.two }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
});

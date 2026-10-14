import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-screens/experimental';

import { AdaptiveModal, AdaptiveSheet } from '@/components/adaptive-sheet';
import { SheetRefreshContext } from '@/components/sheet-refresh-notice';
import { FormButton, FormError, FormField, FormScrollView, SegmentedControl, SelectField } from '@/components/form-controls';
import { ContextMenuHost } from '@/components/context-menu';
import { ThemedText } from '@/components/themed-text';
import { Space, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { AddExerciseSheet, ExerciseEditor, NoteEditor, RoutineEditor, SetEditor } from './components/fitness-forms';
import { WorkoutSheet } from './components/workout-sheet';
import { WorkoutContent } from './components/workout-content';
import { ArchivedRoutineDetail, ExerciseDetail, FitnessObjectRow, WorkoutHistory } from './components/management-content';
import { fitnessError } from './form';
import { exerciseMeasurementLabel, exerciseTypeLabel, workoutCounts } from './management-presentation';
import type { Exercise, Routine, RoutineDetail, SessionDetail } from './types';
import { useFitness } from './use-fitness';

type FitnessView = 'workout' | 'routines' | 'exercises' | 'history';
type Dialog = { kind: 'exercise' } | { kind: 'exercise-detail'; exercise: Exercise } | { kind: 'routine'; routine: RoutineDetail | null } | { kind: 'session' } |
  { kind: 'add-exercise'; sessionId: string } | { kind: 'set'; exercise: SessionDetail['exercises'][number]; setId: string | null } |
  { kind: 'note'; sessionId: string; exerciseId: string | null; title: string; value: string | null } |
  { kind: 'actions'; exerciseId: string | null; title: string };
const views: { value: FitnessView; label: string }[] = [
  { value: 'workout', label: 'Workout' }, { value: 'routines', label: 'Routines' }, { value: 'exercises', label: 'Exercises' }, { value: 'history', label: 'History' },
];
const archiveOptions = [{ value: 0, label: 'Active' }, { value: 1, label: 'Archived' }];

export function FitnessScreen({ initialSessionId }: { initialSessionId?: string } = {}) {
  const colors = useTheme();
  const [destination, setView] = useState<FitnessView>('workout');
  const [initialSessionOpen, setInitialSessionOpen] = useState(!!initialSessionId);
  const fitness = useFitness(initialSessionId, destination === 'routines', destination === 'workout', destination === 'history' || initialSessionOpen);
  const { snapshot, detail, activeDetail, access, mutate } = fitness;
  const view = initialSessionOpen && detail && detail.completedAt !== null ? 'history' : destination;
  const workout = snapshot?.active && activeDetail?.id === snapshot.active.id ? activeDetail : null;
  const offsets = useRef<Record<FitnessView, number>>({ workout: 0, routines: 0, exercises: 0, history: 0 });
  const [scrollOffset, setScrollOffset] = useState(0);
  function navigateView(next: FitnessView) { setScrollOffset(offsets.current[next]); setView(next); }
  // A module entry (including Home Resume) lands on Workout. Internal destinations remain independent.
  useFocusEffect(useCallback(() => {
    if (!initialSessionId) { setScrollOffset(offsets.current.workout); setView('workout'); }
  }, [initialSessionId]));
  const [editor, setDialog] = useState<Dialog | null>(null);
  const dialog = editor ?? (initialSessionOpen && detail && detail.completedAt !== null ? { kind: 'session' as const } : null);
  const [archivedExercises, setArchivedExercises] = useState(false);
  const [archivedRoutines, setArchivedRoutines] = useState(false);
  const [search, setSearch] = useState('');
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastFinished, setLastFinished] = useState<string | null>(null);
  function close() {
    if (initialSessionOpen && detail && detail.completedAt !== null) navigateView('history');
    setDialog(null); setInitialSessionOpen(false); fitness.closeSession(); setActionError(null);
  }
  function perform(action: () => void) {
    try { mutate(action); setActionError(null); } catch (cause) { setActionError(fitnessError(cause, 'Unable to update Fitness. Please try again.')); }
  }
  function openSession(id: string) {
    try {
      if (snapshot?.active?.id === id) { navigateView('workout'); return; }
      fitness.openSession(id); setDialog({ kind: 'session' }); setActionError(null);
    }
    catch (cause) { setActionError(fitnessError(cause, 'Unable to open this workout.')); }
  }
  function start(id: string | null) {
    if (snapshot?.active) {
      const activeId = snapshot.active.id;
      Alert.alert('Workout in progress', 'Resume your current workout before starting another.', [
        { text: 'Cancel', style: 'cancel' }, { text: 'Go to workout', onPress: () => openSession(activeId) },
      ]); return;
    }
    perform(() => access.startWorkout(id)); setLastFinished(null); navigateView('workout');
  }
  function archiveExercise(exercise: Exercise) {
    Alert.alert('Archive exercise?', `“${exercise.name}” will leave new exercise choices. Existing routines and workout history will retain it.`, [
      { text: 'Cancel', style: 'cancel' }, { text: 'Archive', style: 'destructive', onPress: () => perform(() => access.archiveExercise(exercise.id)) },
    ]);
  }
  function openRoutine(id: string) {
    try { setDialog({ kind: 'routine', routine: access.readRoutine(id) }); setActionError(null); }
    catch (cause) { setActionError(fitnessError(cause, 'Unable to open this routine. Please try again.')); }
  }
  function archiveRoutine(routine: Routine) {
    Alert.alert('Archive routine?', `Archive “${routine.name}”? Workout history will remain unchanged.`, [
      { text: 'Cancel', style: 'cancel' }, { text: 'Archive', style: 'destructive', onPress: () => perform(() => access.archiveRoutine(routine.id)) },
    ]);
  }
  function finish() {
    if (!workout) return;
    const id = workout.id;
    Alert.alert('Finish workout?', 'Save this workout to History? Unfilled planned sets are allowed. Completed workouts are read-only.', [
      { text: 'Cancel', style: 'cancel' }, { text: 'Finish Workout', onPress: () => perform(() => {
        access.finishWorkout(id); setLastFinished(workout.name); close(); offsets.current.workout = 0; setScrollOffset(0);
      }) },
    ]);
  }
  function discard() {
    if (!workout) return;
    const id = workout.id;
    Alert.alert('Discard workout?', 'Discard this unfinished workout and its logged performance? Your routine will be kept.', [
      { text: 'Cancel', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: () => perform(() => { access.discardWorkout(id); close(); offsets.current.workout = 0; setScrollOffset(0); }) },
    ]);
  }
  function removeExercise(id: string) {
    Alert.alert('Remove workout exercise?', 'Remove this exercise and its logged sets from this workout?', [
      { text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => perform(() => { access.removeSessionExercise(id); close(); }) },
    ]);
  }
  function deleteSet(id: string) {
    Alert.alert('Delete set?', 'Remove this logged set?', [
      { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => perform(() => { access.deleteSet(id); close(); }) },
    ]);
  }
  const exercises = snapshot?.exercises ?? [];
  const routines = snapshot?.routines ?? [];
  const activeRoutines = routines.filter((routine) => routine.deletedAt === null);
  const displayedRoutines = fitness.routines.filter((routine) => (routine.deletedAt !== null) === archivedRoutines);
  const displayedExercises = exercises.filter((exercise) => (exercise.deletedAt !== null) === archivedExercises && exercise.name.toLowerCase().includes(search.trim().toLowerCase()));
  const selectedRoutine = activeRoutines.some((routine) => routine.id === routineId) ? routineId : null;
  // Capture form inputs when opening. Refreshes update the workout, never the working draft's identity.
  function editSet(exerciseId: string, setId: string | null) {
    const exercise = workout?.exercises.find((entry) => entry.id === exerciseId);
    if (exercise) setDialog({ kind: 'set', exercise, setId });
  }
  function editNote(exerciseId: string | null) {
    if (!workout) return;
    const exercise = workout.exercises.find((entry) => entry.id === exerciseId);
    setDialog({ kind: 'note', sessionId: workout.id, exerciseId,
      title: exercise ? `Note: ${exercise.exerciseName}` : 'Workout note', value: exercise?.note ?? (exerciseId === null ? workout.note : null) });
  }
  const backToWorkout = close;
  function openActions(exerciseId: string | null) {
    const exercise = workout?.exercises.find((entry) => entry.id === exerciseId);
    setDialog({ kind: 'actions', exerciseId, title: exercise?.exerciseName ?? 'Workout actions' });
  }
  const createExercise = (draft: Parameters<typeof access.createExercise>[0]) => mutate(() => access.createExercise(draft));
  return <SheetRefreshContext.Provider value={{ error: fitness.error, onRetry: fitness.reload }}>
    <SafeAreaView edges={{ top: true, bottom: true, left: true, right: true }} style={{ flex: 1, backgroundColor: colors.background }}>
    <ContextMenuHost>
        <View style={[styles.inner, styles.header]}>
          <ThemedText type="screenTitle" accessibilityRole="header">Fitness</ThemedText>
          <FormError message={fitness.error || actionError} />
          {fitness.error && <FormButton label="Retry" onPress={fitness.reload} />}
          <View style={styles.actions}>{views.map((option) => <FormButton variant="navigation" key={option.value} label={option.label} selected={view === option.value} onPress={() => navigateView(option.value)} />)}</View>
        </View>
      <FormScrollView key={view} style={{ flex: 1 }} contentInsetAdjustmentBehavior="never" keyboardShouldPersistTaps="handled"
        contentOffset={{ x: 0, y: scrollOffset }} onScroll={(event) => { offsets.current[view] = event.nativeEvent.contentOffset.y; }}
        contentContainerStyle={styles.content}>
        <View style={styles.inner}>
          {!snapshot && !fitness.error && <ActivityIndicator color={colors.text} accessibilityLabel="Loading Fitness" />}
          {snapshot && view === 'workout' && (snapshot.active ? workout ? <WorkoutContent session={workout}
            onSet={editSet} onNote={editNote} onActions={openActions} onAddExercise={() => setDialog({ kind: 'add-exercise', sessionId: workout.id })} />
            : fitness.error ? <ThemedText themeColor="textSecondary">Workout details are unavailable. Retry to load your current workout.</ThemedText>
              : <ActivityIndicator color={colors.accent} accessibilityLabel="Loading current workout" /> : <>
            {lastFinished && <View style={styles.description}>
              <ThemedText type="secondary" accessibilityRole="alert">Workout completed</ThemedText>
              <ThemedText type="cardTitle">{lastFinished}</ThemedText>
            </View>}
            {fitness.nextWorkout && <View style={styles.description}>
              <ThemedText type="sectionHeading" accessibilityRole="header">{lastFinished ? 'Up next' : 'Next workout'}</ThemedText>
              <ThemedText type="cardTitle" accessibilityLabel={`Next workout, ${fitness.nextWorkout.routine.name}`}>{fitness.nextWorkout.routine.name}</ThemedText>
              <ThemedText type="secondary" themeColor="textSecondary">{fitness.nextWorkout.rotation.name}</ThemedText>
              <ThemedText type="metadata" themeColor="textSecondary">{fitness.rotationSteps.join(' → ')}</ThemedText>
              <FormButton variant="primary" label={`Start ${fitness.nextWorkout.routine.name}`} onPress={() => start(fitness.nextWorkout!.routine.id)} />
            </View>}
            <ThemedText type="sectionHeading" accessibilityRole="header">{fitness.nextWorkout ? 'Other options' : 'Start a workout'}</ThemedText>
            <SelectField<string | null> label="Workout routine" value={selectedRoutine}
              options={[{ value: null, label: 'Choose a routine' }, ...activeRoutines.map((routine) => ({ value: routine.id, label: routine.name }))]} onChange={setRoutineId} />
            <FormButton variant={fitness.nextWorkout ? 'quiet' : 'primary'} label={fitness.nextWorkout ? 'Start another routine' : 'Start from Routine'} disabled={selectedRoutine === null} onPress={() => start(selectedRoutine)} />
            <FormButton label="Start Empty Workout" onPress={() => start(null)} />
            {!activeRoutines.length && <FormButton label="Create a routine" onPress={() => setDialog({ kind: 'routine', routine: null })} />}
            <ThemedText type="small" themeColor="textSecondary">Log sets as you go, then finish to save the workout to History.</ThemedText>
          </>)}
          {snapshot && view === 'routines' && <>
            <View style={styles.description}>
              <ThemedText type="sectionHeading" accessibilityRole="header">Workout rotation</ThemedText>
              <ThemedText type="cardTitle">{fitness.nextWorkout?.rotation.name ?? 'No active rotation'}</ThemedText>
              {fitness.nextWorkout && <ThemedText type="metadata" themeColor="textSecondary">{fitness.rotationSteps.join(' → ')}</ThemedText>}
              {fitness.nextWorkout && <ThemedText type="secondary" themeColor="textSecondary">Next: {fitness.nextWorkout.routine.name}</ThemedText>}
              <FormButton variant="quiet" label={fitness.nextWorkout ? 'Manage rotation →' : 'Set up rotation →'} onPress={() => router.push('/fitness/rotations')} />
            </View>
            <ThemedText type="sectionHeading" accessibilityRole="header">Your routines</ThemedText>
            <FormButton variant="quiet" label="New routine" onPress={() => setDialog({ kind: 'routine', routine: null })} />
            <SegmentedControl label="Routines" value={archivedRoutines ? 1 : 0} options={archiveOptions} onChange={(value) => setArchivedRoutines(value === 1)} />
            {fitness.routinesLoaded && !displayedRoutines.length && <ThemedText themeColor="textSecondary">No {archivedRoutines ? 'archived' : 'active'} routines.</ThemedText>}
            {!fitness.routinesLoaded && !fitness.error && <ActivityIndicator accessibilityLabel="Loading routines" color={colors.accent} />}
            {displayedRoutines.map((routine) => <FitnessObjectRow key={routine.id} name={routine.name}
              summary={workoutCounts(routine.exerciseCount)} label={`Open ${routine.name}, ${workoutCounts(routine.exerciseCount)}`}
              hint={routine.deletedAt === null ? 'Opens the routine editor.' : 'Opens the archived routine. Read-only.'}
              onPress={() => openRoutine(routine.id)} actions={routine.deletedAt === null ? [
                { label: 'Start workout', accessibilityLabel: `Start ${routine.name}`, onPress: () => start(routine.id) },
                { label: 'Edit', accessibilityLabel: `Edit ${routine.name}`, onPress: () => openRoutine(routine.id) },
                { label: 'Archive', accessibilityLabel: `Archive ${routine.name}`, variant: 'destructive', onPress: () => archiveRoutine(routine) },
              ] : undefined} />)}
          </>}
          {snapshot && view === 'exercises' && <>
            <FormButton label="New exercise" onPress={() => setDialog({ kind: 'exercise' })} />
            <SegmentedControl label="Exercise library" value={archivedExercises ? 1 : 0} options={archiveOptions} onChange={(value) => setArchivedExercises(value === 1)} />
            <FormField label="Search exercises" value={search} onChangeText={setSearch} autoCorrect={false} />
            {!displayedExercises.length && <ThemedText themeColor="textSecondary">No matching exercises.</ThemedText>}
            {displayedExercises.map((exercise) => <FitnessObjectRow key={exercise.id} name={exercise.name}
              summary={`${exerciseTypeLabel(exercise.measurementType)} · ${exerciseMeasurementLabel(exercise.measurementType)}`}
              label={`Open ${exercise.name}, ${exerciseTypeLabel(exercise.measurementType)}`}
              hint="Opens exercise details." onPress={() => setDialog({ kind: 'exercise-detail', exercise })}
              actions={!exercise.isBuiltIn && exercise.deletedAt === null ? [
                { label: 'Archive', accessibilityLabel: `Archive ${exercise.name}`, variant: 'destructive', onPress: () => archiveExercise(exercise) },
              ] : undefined} />)}
          </>}
          {snapshot && view === 'history' && <>
            <ThemedText type="sectionHeading" accessibilityRole="header">Workout History</ThemedText>
            {!fitness.historyLoaded && !fitness.error && <ActivityIndicator accessibilityLabel="Loading workout History" color={colors.accent} />}
            {fitness.historyLoaded && !snapshot.history.length && <ThemedText themeColor="textSecondary">No completed workouts yet</ThemedText>}
            <WorkoutHistory sessions={snapshot.history} onOpen={openSession} />
            {snapshot.hasMoreHistory && <FormButton label="Load older workouts" onPress={fitness.loadMoreHistory} />}
          </>}
        </View>
      </FormScrollView>
      {view === 'workout' && workout && <View style={[styles.footer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.inner}><FormButton variant="primary" label="Finish Workout" onPress={finish} /></View>
      </View>}
    </ContextMenuHost>
    </SafeAreaView>
    {dialog && <AdaptiveModal onDismiss={close}>
      {dialog.kind === 'exercise' && <ExerciseEditor onSave={createExercise} onCreated={close} onDismiss={close} />}
      {dialog.kind === 'exercise-detail' && <ExerciseDetail exercise={dialog.exercise} onDismiss={close} />}
      {dialog.kind === 'routine' && (dialog.routine?.deletedAt != null ? <ArchivedRoutineDetail routine={dialog.routine} onDismiss={close} /> : <RoutineEditor routine={dialog.routine} exercises={exercises} onCreateExercise={createExercise} onDismiss={close}
        onSave={(draft) => mutate(() => dialog.routine ? access.editRoutine(dialog.routine.id, draft) : access.createRoutine(draft))} />)}
      {dialog.kind === 'session' && detail && <WorkoutSheet session={detail} error={actionError} onDismiss={close} />}
      {dialog.kind === 'actions' && <AdaptiveSheet title={dialog.title} onDismiss={close}>
        <FormError message={actionError} />
        {dialog.exerciseId === null ? <FormButton variant="destructive" label="Discard workout" onPress={discard} />
          : <FormButton variant="destructive" label="Remove exercise from workout" onPress={() => removeExercise(dialog.exerciseId!)} />}
      </AdaptiveSheet>}
      {dialog.kind === 'add-exercise' && <AddExerciseSheet exercises={exercises} onCreateExercise={createExercise} onDismiss={backToWorkout}
        onAdd={(id) => mutate(() => access.addSessionExercise(dialog.sessionId, id))} />}
      {dialog.kind === 'set' && <SetEditor key={dialog.setId ?? `new-${dialog.exercise.id}`} name={dialog.exercise.exerciseName} type={dialog.exercise.measurementType}
        existing={dialog.exercise.sets.find((set) => set.id === dialog.setId)} previous={dialog.exercise.sets.at(-1)} onDismiss={backToWorkout}
        error={actionError} onDelete={dialog.setId ? () => deleteSet(dialog.setId!) : undefined}
        onSave={(draft) => mutate(() => dialog.setId ? access.editSet(dialog.setId, draft) : access.addSet(dialog.exercise.id, draft))} />}
      {dialog.kind === 'note' && <NoteEditor title={dialog.title} value={dialog.value} onDismiss={backToWorkout}
        onSave={(note) => mutate(() => access.saveNote(dialog.sessionId, dialog.exerciseId, note))} />}
      {!!fitness.error && !detail && dialog.kind === 'session' && <View style={[styles.card, { backgroundColor: colors.background }]}>
        <FormError message={fitness.error} /><FormButton label="Close" onPress={close} /><FormButton label="Retry" onPress={fitness.reload} />
      </View>}
    </AdaptiveModal>}
  </SheetRefreshContext.Provider>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: Space.lg, paddingBottom: Space.xl }, inner: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: Space.lg },
  header: { paddingHorizontal: Space.lg, paddingTop: Space.lg, paddingBottom: Space.sm },
  footer: { flexShrink: 0, paddingHorizontal: Space.lg, paddingVertical: Space.md, borderTopWidth: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  card: { padding: Spacing.three, borderRadius: Spacing.two, gap: Spacing.two }, description: { gap: Spacing.one },
});

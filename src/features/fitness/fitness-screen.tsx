import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-screens/experimental';

import { AdaptiveModal } from '@/components/adaptive-sheet';
import { SheetRefreshContext } from '@/components/sheet-refresh-notice';
import { FormButton, FormError, FormScrollView } from '@/components/form-controls';
import { ContextMenuHost } from '@/components/context-menu';
import { ThemedText } from '@/components/themed-text';
import { UiText, DesignProvider, useDesignColors } from '@/components/design-system';
import { InternalNavigation } from '@/components/internal-navigation';
import { Space, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { AddExerciseSheet, ExerciseEditor, NoteEditor, RoutineEditor, SetEditor } from './components/fitness-forms';
import { WorkoutSheet } from './components/workout-sheet';
import { WorkoutContent } from './components/workout-content';
import { WorkoutLanding } from './components/workout-landing';
import { RoutinesContent } from './components/routines-content';
import { ExercisesContent } from './components/exercises-content';
import { HistoryContent } from './components/history-content';
import { ArchivedRoutineDetail, ExerciseDetail } from './components/management-content';
import { blankSet, fitnessError } from './form';
import type { Exercise, Routine, RoutineDetail, SessionDetail, WorkoutSet } from './types';
import { useFitness } from './use-fitness';

type FitnessView = 'workout' | 'routines' | 'exercises' | 'history';
type Dialog = { kind: 'exercise' } | { kind: 'exercise-detail'; exercise: Exercise } | { kind: 'routine'; routine: RoutineDetail | null } | { kind: 'session' } |
  { kind: 'add-exercise'; sessionId: string } | { kind: 'set'; exercise: SessionDetail['exercises'][number]; set: WorkoutSet } |
  { kind: 'note'; sessionId: string; exerciseId: string | null; title: string; value: string | null };
const views: { value: FitnessView; label: string }[] = [
  { value: 'workout', label: 'Workout' }, { value: 'routines', label: 'Routines' }, { value: 'exercises', label: 'Exercises' }, { value: 'history', label: 'History' },
];

export function FitnessScreen({ initialSessionId }: { initialSessionId?: string } = {}) {
  const colors = useTheme();
  const design = useDesignColors();
  const [destination, setView] = useState<FitnessView>('workout');
  const [initialSessionOpen, setInitialSessionOpen] = useState(!!initialSessionId);
  const fitness = useFitness(initialSessionId, destination === 'routines', destination === 'workout', destination === 'history' || initialSessionOpen);
  const { snapshot, detail, activeDetail, access, mutate } = fitness;
  const view = initialSessionOpen && detail && detail.completedAt !== null ? 'history' : destination;
  const workout = snapshot?.active && activeDetail?.id === snapshot.active.id ? activeDetail : null;
  const offsets = useRef<Record<FitnessView, number>>({ workout: 0, routines: 0, exercises: 0, history: 0 });
  const [scrollOffset, setScrollOffset] = useState(0);
  function navigateView(next: FitnessView) { setInsertedSetId(null); setScrollOffset(offsets.current[next]); setView(next); }
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
  const [insertedSetId, setInsertedSetId] = useState<string | null>(null);
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
    perform(() => { access.startWorkout(id); setRoutineId(null); }); setLastFinished(null); navigateView('workout');
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
  const selectedRoutine = activeRoutines.find((routine) => routine.id === routineId)
    ?? activeRoutines.find((routine) => routine.id === fitness.nextWorkout?.routine.id) ?? activeRoutines[0] ?? null;
  // Capture form inputs when opening. Refreshes update the workout, never the working draft's identity.
  function editSet(exerciseId: string, setId: string) {
    const exercise = workout?.exercises.find((entry) => entry.id === exerciseId);
    const set = exercise?.sets.find((entry) => entry.id === setId);
    if (exercise && set) setDialog({ kind: 'set', exercise, set });
  }
  function editNote(exerciseId: string | null) {
    if (!workout) return;
    const exercise = workout.exercises.find((entry) => entry.id === exerciseId);
    setDialog({ kind: 'note', sessionId: workout.id, exerciseId,
      title: exercise ? `Note: ${exercise.exerciseName}` : 'Workout note', value: exercise?.note ?? (exerciseId === null ? workout.note : null) });
  }
  const backToWorkout = close;
  const createExercise = (draft: Parameters<typeof access.createExercise>[0]) => mutate(() => access.createExercise(draft));
  const v2Workout = view === 'workout';
  const v2Library = view === 'routines' || view === 'exercises' || view === 'history';
  const v2 = v2Workout || v2Library;
  const ScreenTitle = v2 ? UiText : ThemedText;
  return <DesignProvider><SheetRefreshContext.Provider value={{ error: fitness.error, onRetry: fitness.reload }}>
    <SafeAreaView edges={{ top: true, bottom: true, left: true, right: true }} style={{ flex: 1, backgroundColor: v2 ? design.canvas : colors.background }}>
    <ContextMenuHost safeAreaApplied={v2Library}>
        <View style={[styles.inner, styles.header]}>
          <ScreenTitle type="screenTitle" accessibilityRole="header">Fitness</ScreenTitle>
          <FormError appearance={v2Library ? 'v2' : undefined} message={fitness.error || actionError} />
          {fitness.error && <FormButton appearance={v2Library ? 'v2' : undefined} label="Retry" onPress={fitness.reload} />}
          {v2 || snapshot?.active ? <InternalNavigation value={view} options={views} onChange={navigateView} />
            : <View style={styles.actions}>{views.map((option) => <FormButton variant="navigation" key={option.value} label={option.label} selected={view === option.value} onPress={() => navigateView(option.value)} />)}</View>}
        </View>
      {view === 'routines' ? <RoutinesContent routines={displayedRoutines} next={fitness.nextWorkout} sequence={fitness.rotationSteps}
        archived={archivedRoutines} ready={!!snapshot} loaded={fitness.routinesLoaded} loading={!fitness.routinesLoaded && !fitness.error}
        onArchivedChange={setArchivedRoutines} onCreate={() => setDialog({ kind: 'routine', routine: null })} onManage={() => router.push('/fitness/rotations')}
        onOpen={openRoutine} onStart={start} onArchive={archiveRoutine} scrollOffset={scrollOffset} onScrollOffset={offset => { offsets.current.routines = offset; }} />
        : view === 'exercises' ? <ExercisesContent exercises={exercises} archived={archivedExercises} query={search} ready={!!snapshot} loading={!snapshot && !fitness.error}
          onArchivedChange={setArchivedExercises} onQueryChange={setSearch} onCreate={() => setDialog({ kind: 'exercise' })}
          onOpen={exercise => { Keyboard.dismiss(); setDialog({ kind: 'exercise-detail', exercise }); }} onArchive={archiveExercise}
          scrollOffset={scrollOffset} onScrollOffset={offset => { offsets.current.exercises = offset; }} />
        : view === 'history' ? <HistoryContent sessions={snapshot?.history ?? []} loaded={!!snapshot && fitness.historyLoaded}
          loading={!fitness.historyLoaded && !fitness.error} hasMore={!!snapshot?.hasMoreHistory} onLoadMore={fitness.loadMoreHistory} onOpen={openSession}
          scrollOffset={scrollOffset} onScrollOffset={offset => { offsets.current.history = offset; }} />
        : <FormScrollView key={view} style={{ flex: 1 }} contentInsetAdjustmentBehavior="never" keyboardShouldPersistTaps="handled"
        contentOffset={{ x: 0, y: scrollOffset }} onScroll={(event) => { offsets.current[view] = event.nativeEvent.contentOffset.y; }}
        contentContainerStyle={styles.content}>
        <View style={styles.inner}>
          {!snapshot && !fitness.error && <ActivityIndicator color={colors.text} accessibilityLabel="Loading Fitness" />}
          {snapshot && view === 'workout' && (snapshot.active ? workout ? <WorkoutContent session={workout}
            insertedSetId={insertedSetId} onSet={editSet} onCompleteSet={(id) => perform(() => setInsertedSetId(access.addSet(id, blankSet())))}
            onExerciseCompleted={(id, completed) => perform(() => access.setExerciseCompleted(id, completed))}
            onNote={editNote} onDiscard={discard} onRemoveExercise={removeExercise}
            onAddExercise={() => setDialog({ kind: 'add-exercise', sessionId: workout.id })} />
            : fitness.error ? <ThemedText themeColor="textSecondary">Workout details are unavailable. Retry to load your current workout.</ThemedText>
              : <ActivityIndicator color={colors.accent} accessibilityLabel="Loading current workout" /> : <WorkoutLanding
                routines={activeRoutines} selected={selectedRoutine} next={fitness.nextWorkout} lastWorkout={fitness.lastWorkout} lastFinished={lastFinished}
                onSelect={setRoutineId} onStart={start} onRoutines={() => navigateView('routines')}
                onCreate={() => setDialog({ kind: 'routine', routine: null })} onHistory={openSession} />)}
        </View>
      </FormScrollView>}
      {view === 'workout' && workout && <View testID="workout-footer" style={[styles.footer, { backgroundColor: design.canvas, borderTopWidth: 0 }]}>
        <View style={styles.inner}><FormButton appearance="v2" feature="fitness" variant="primary" label="Finish Workout" onPress={finish} /></View>
      </View>}
    </ContextMenuHost>
    </SafeAreaView>
    {dialog && <AdaptiveModal onDismiss={close}>
      {dialog.kind === 'exercise' && <ExerciseEditor appearance="v2" onSave={createExercise} onCreated={close} onDismiss={close} />}
      {dialog.kind === 'exercise-detail' && <ExerciseDetail exercise={dialog.exercise} onDismiss={close} />}
      {dialog.kind === 'routine' && (dialog.routine?.deletedAt != null ? <ArchivedRoutineDetail routine={dialog.routine} onDismiss={close} /> : <RoutineEditor routine={dialog.routine} exercises={exercises} onCreateExercise={createExercise} onDismiss={close}
        onSave={(draft) => mutate(() => dialog.routine ? access.editRoutine(dialog.routine.id, draft) : access.createRoutine(draft))} />)}
      {dialog.kind === 'session' && detail && <WorkoutSheet session={detail} error={actionError} onDismiss={close} />}
      {dialog.kind === 'add-exercise' && <AddExerciseSheet exercises={exercises} onCreateExercise={createExercise} onDismiss={backToWorkout}
        onAdd={(id) => mutate(() => access.addSessionExercise(dialog.sessionId, id))} />}
      {dialog.kind === 'set' && <SetEditor key={dialog.set.id} name={dialog.exercise.exerciseName} type={dialog.exercise.measurementType}
        existing={dialog.set} onDismiss={backToWorkout} error={actionError} onDelete={() => deleteSet(dialog.set.id)}
        onSave={(draft) => mutate(() => access.editSet(dialog.set.id, draft))} />}
      {dialog.kind === 'note' && <NoteEditor title={dialog.title} value={dialog.value} onDismiss={backToWorkout}
        onSave={(note) => mutate(() => access.saveNote(dialog.sessionId, dialog.exerciseId, note))} />}
      {!!fitness.error && !detail && dialog.kind === 'session' && <View style={[styles.card, { backgroundColor: colors.background }]}>
        <FormError message={fitness.error} /><FormButton label="Close" onPress={close} /><FormButton label="Retry" onPress={fitness.reload} />
      </View>}
    </AdaptiveModal>}
  </SheetRefreshContext.Provider></DesignProvider>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: Space.lg, paddingBottom: Space.xl }, inner: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: Space.lg },
  header: { paddingHorizontal: Space.lg, paddingTop: Space.lg, paddingBottom: Space.sm },
  footer: { flexShrink: 0, paddingHorizontal: Space.lg, paddingVertical: Space.md, borderTopWidth: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  card: { padding: Spacing.three, borderRadius: Spacing.two, gap: Spacing.two },
});

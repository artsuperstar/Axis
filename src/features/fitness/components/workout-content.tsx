import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { FormButton } from '@/components/form-controls';
import { ContextMenu } from '@/components/context-menu';
import { GroupSurface, ContentInsertion, UiIcon, UiPressable, UiText, useDesignColors } from '@/components/design-system';
import { DesignSpace as Space, Shape, TouchTarget } from '@/constants/design-system-v2';

import { targetLabel } from '../form';
import type { SessionDetail } from '../types';
import { exerciseProgress, measurementIcons, workoutSetCells, workoutSetColumns, workoutSetPresentation } from '../workout-presentation';
import { ActiveWorkoutHeader } from './active-workout-header';
import { ExerciseProgress } from './exercise-progress';

/** Normal screen content; focused editing surfaces are owned by FitnessScreen. */
export function WorkoutContent({ session, onAddExercise, onSet, onCompleteSet, onExerciseCompleted, onNote, onDiscard, onRemoveExercise, insertedSetId }: {
  session: SessionDetail; onAddExercise: () => void; onSet: (exerciseId: string, setId: string) => void;
  onCompleteSet: (exerciseId: string) => void;
  onExerciseCompleted: (exerciseId: string, completed: boolean) => void;
  onNote: (exerciseId: string | null) => void; onDiscard: () => void; onRemoveExercise: (exerciseId: string) => void;
  insertedSetId?: string | null;
}) {
  const colors = useDesignColors();
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale >= 1.5;
  return <View style={styles.workout}>
    <ActiveWorkoutHeader session={session} onNote={() => onNote(null)} onDiscard={onDiscard} />
    {!session.exercises.length && <UiText color="textSecondary">Add an exercise to begin logging sets.</UiText>}
    {session.exercises.map((exercise) => {
      const columns = workoutSetColumns(exercise.measurementType, exercise.sets);
      const targeted = exercise.targetSetCount !== null;
      const progress = exerciseProgress(exercise.sets.length, exercise.targetSetCount, exercise.isManuallyComplete);
      return <GroupSurface variant="surface" key={exercise.id} testID={`exercise-group-${exercise.id}`} role="group"
      accessibilityLabel={`${exercise.exerciseName} exercise`}>
      <View style={[styles.exerciseHeading, stacked && { flexWrap: 'wrap' }]}>
        <View style={[styles.iconContainer, { backgroundColor: colors.fitnessAccentSoft }]}>
          <UiIcon name={measurementIcons[exercise.measurementType]} size={24} color={colors.fitnessText} />
        </View>
        <View style={styles.exerciseTitle}>
          <UiText type="cardTitle" accessibilityRole="header">{exercise.exerciseName}</UiText>
          {!targeted && <UiText type="metadata" color={progress.complete ? 'fitnessText' : 'textSecondary'}>{progress.complete ? 'Completed' : 'No set target'}</UiText>}
          {!!targetLabel(exercise) && <UiText type="metadata" color="textSecondary">Target: {targetLabel(exercise)}</UiText>}
        </View>
        {!stacked && targeted && <ExerciseProgress name={exercise.exerciseName} completed={exercise.sets.length} planned={exercise.targetSetCount} />}
        {!targeted && progress.complete && <UiIcon name="check" size={22} color={colors.fitnessText} />}
        <View style={styles.exerciseMenu}><ContextMenu appearance="v2" label={`More actions for ${exercise.exerciseName}`} actions={[
          { label: exercise.note ? 'Edit note' : 'Add note', accessibilityLabel: `Note for ${exercise.exerciseName}`, onPress: () => onNote(exercise.id) },
          { label: 'Remove exercise from workout', variant: 'destructive', onPress: () => onRemoveExercise(exercise.id) },
        ]} /></View>
      </View>
      {targeted && <View style={styles.progressSummary}>
        {stacked && <ExerciseProgress name={exercise.exerciseName} completed={exercise.sets.length} planned={exercise.targetSetCount} />}
        <UiText type="metadata" color="fitnessText" accessibilityLiveRegion="polite" style={{ flex: 1 }}>{progress.complete ? 'Exercise complete · ' : ''}{progress.label}</UiText>
      </View>}
      {targeted ? <FormButton appearance="v2" feature="fitness" variant="primary" label="Set Complete" accessibilityLabel={`Complete set for ${exercise.exerciseName}`}
        onPress={() => onCompleteSet(exercise.id)} />
        : <FormButton appearance="v2" feature="fitness" variant={progress.complete ? 'quiet' : 'primary'}
          label={progress.complete ? 'Completed · Reopen' : 'Complete Exercise'}
          accessibilityLabel={`${progress.complete ? 'Reopen' : 'Complete'} exercise ${exercise.exerciseName}`}
          onPress={() => onExerciseCompleted(exercise.id, !progress.complete)} />}
      {!!exercise.note && <UiText type="secondary" color="textSecondary">Note: {exercise.note}</UiText>}
      <GroupSurface variant="inset" compact testID={`sets-inset-${exercise.id}`} role="group" accessibilityLabel={`Sets for ${exercise.exerciseName}`}>
      {!exercise.sets.length && <UiText type="metadata" color="textSecondary" style={styles.empty}>No sets logged yet</UiText>}
      {!!exercise.sets.length && !stacked && <View testID={`set-columns-${exercise.id}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.set}>
        <UiText type="smallLabel" color="textSecondary" style={styles.setNumber}>Set</UiText>
        {columns.map((column) => <UiText key={column} type="smallLabel" color="textSecondary" style={styles.value}>{column}</UiText>)}
      </View>}
      {exercise.sets.map((set, index) => {
        const presentation = workoutSetPresentation(set);
        const cells = workoutSetCells(set, columns);
        return <ContentInsertion key={set.id} animate={set.id === insertedSetId} testID={`set-insertion-${set.id}`}>
        <UiPressable accessibilityRole="button" accessible
          accessibilityLabel={`${exercise.exerciseName}, set ${index + 1}. ${presentation.spoken}`}
          accessibilityHint="Opens set details. Delete is available in the editor."
          onPress={() => onSet(exercise.id, set.id)}
          style={({ pressed }) => [styles.set, stacked && styles.stackedSet, { backgroundColor: pressed ? colors.selected : 'transparent', borderColor: colors.border,
            borderBottomWidth: index === exercise.sets.length - 1 ? 0 : 1 }]}>
          <UiText type="numeric" color="textSecondary" style={!stacked && styles.setNumber}>{stacked ? `Set ${index + 1}` : index + 1}</UiText>
          {cells.map((value, valueIndex) => stacked
            ? <View key={columns[valueIndex]} style={styles.stackedValue}><UiText type="smallLabel" color="textSecondary">{columns[valueIndex]}</UiText><UiText type="numeric">{value}</UiText></View>
            : <UiText key={columns[valueIndex]} type="numeric" style={styles.value}>{value}</UiText>)}
        </UiPressable>
        </ContentInsertion>;
      })}
      {!targeted && <FormButton appearance="v2" feature="fitness" variant="quiet" label="+ Add set" accessibilityLabel={`Log set for ${exercise.exerciseName}`}
        onPress={() => onCompleteSet(exercise.id)} />}
      </GroupSurface>
    </GroupSurface>;
    })}
    <FormButton appearance="v2" feature="fitness" label="+ Add exercise" onPress={onAddExercise} />
  </View>;
}

const styles = StyleSheet.create({
  workout: { gap: Space.xl },
  exerciseHeading: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  exerciseTitle: { flex: 1, minWidth: 0, gap: Space.xs },
  exerciseMenu: { alignSelf: 'flex-start' },
  iconContainer: { width: 40, height: 40, borderRadius: Shape.control, alignItems: 'center', justifyContent: 'center' },
  empty: { padding: Space.md },
  progressSummary: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  set: { minHeight: TouchTarget, paddingVertical: Space.sm, paddingHorizontal: Space.sm,
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.md },
  setNumber: { flexBasis: 28, flexShrink: 0 },
  value: { flex: 1, minWidth: 0, fontVariant: ['tabular-nums'] },
  stackedSet: { flexDirection: 'column', alignItems: 'stretch' },
  stackedValue: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Space.sm },
});

import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { FormButton } from '@/components/form-controls';
import { GroupSurface, ContentInsertion, UiIcon, UiPressable, UiText, useDesignColors } from '@/components/design-system';
import { DesignSpace as Space, Shape, TouchTarget } from '@/constants/design-system-v2';

import { targetLabel } from '../form';
import type { SessionDetail } from '../types';
import { measurementIcons, workoutSetCells, workoutSetColumns, workoutSetPresentation } from '../workout-presentation';

/** Normal screen content; focused editing surfaces are owned by FitnessScreen. */
export function WorkoutContent({ session, onAddExercise, onSet, onNote, onActions, insertedSetId }: {
  session: SessionDetail; onAddExercise: () => void; onSet: (exerciseId: string, setId: string | null) => void;
  onNote: (exerciseId: string | null) => void; onActions: (exerciseId: string | null) => void;
  insertedSetId?: string | null;
}) {
  const colors = useDesignColors();
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale >= 1.5;
  return <View style={styles.workout}>
    <View testID="workout-header" style={styles.heading}>
      <UiText type="sectionHeading" accessibilityRole="header">{session.name}</UiText>
      <UiText type="metadata" color="info">In progress · Started {new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</UiText>
      {!!session.note && <UiText type="secondary" color="textSecondary">{session.note}</UiText>}
      <View style={styles.actions}>
        <FormButton appearance="v2" variant="quiet" label={session.note ? 'Edit workout note' : 'Add workout note'} onPress={() => onNote(null)} />
        <FormButton appearance="v2" variant="quiet" label="Workout actions" onPress={() => onActions(null)} />
      </View>
    </View>
    {!session.exercises.length && <UiText color="textSecondary">Add an exercise to begin logging sets.</UiText>}
    {session.exercises.map((exercise) => {
      const columns = workoutSetColumns(exercise.measurementType, exercise.sets);
      return <GroupSurface key={exercise.id} testID={`exercise-group-${exercise.id}`} role="group"
      accessibilityLabel={`${exercise.exerciseName} exercise`}>
      <View style={styles.exerciseHeading}>
        <View style={[styles.iconContainer, { backgroundColor: colors.fitnessAccentSoft }]}>
          <UiIcon name={measurementIcons[exercise.measurementType]} size={24} color={colors.fitnessText} />
        </View>
        <View style={styles.exerciseTitle}>
          <UiText type="cardTitle" accessibilityRole="header">{exercise.exerciseName}</UiText>
          {!!targetLabel(exercise) && <UiText type="metadata" color="textSecondary">Target: {targetLabel(exercise)}</UiText>}
        </View>
      </View>
      {!!exercise.note && <UiText type="secondary" color="textSecondary">Note: {exercise.note}</UiText>}
      <View style={styles.actions}>
        <FormButton appearance="v2" variant="quiet" label={exercise.note ? 'Edit note' : 'Add note'} accessibilityLabel={`Note for ${exercise.exerciseName}`} onPress={() => onNote(exercise.id)} />
        <FormButton appearance="v2" variant="quiet" label="Actions" accessibilityLabel={`Actions for ${exercise.exerciseName}`} onPress={() => onActions(exercise.id)} />
      </View>
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
          accessibilityHint="Edit this set. Delete is available in the editor."
          onPress={() => onSet(exercise.id, set.id)}
          style={({ pressed }) => [styles.set, stacked && styles.stackedSet, { backgroundColor: pressed ? colors.selected : 'transparent', borderColor: colors.border,
            borderBottomWidth: index === exercise.sets.length - 1 ? 0 : 1 }]}>
          <UiText type="numeric" color="textSecondary" style={!stacked && styles.setNumber}>{stacked ? `Set ${index + 1}` : index + 1}</UiText>
          {cells.map((value, valueIndex) => stacked
            ? <View key={columns[valueIndex]} style={styles.stackedValue}><UiText type="smallLabel" color="textSecondary">{columns[valueIndex]}</UiText><UiText type="numeric">{value}</UiText></View>
            : <UiText key={columns[valueIndex]} type="numeric" style={styles.value}>{value}</UiText>)}
        </UiPressable></ContentInsertion>;
      })}
      </GroupSurface>
      {exercise.targetSetCount !== null && <UiText type="metadata" color="fitnessText">{exercise.sets.length} of {exercise.targetSetCount} planned sets logged</UiText>}
      <View style={styles.actions}>
        <FormButton appearance="v2" feature="fitness" label="+ Add set" accessibilityLabel={`Add set for ${exercise.exerciseName}`} onPress={() => onSet(exercise.id, null)} />
      </View>
    </GroupSurface>;
    })}
    <FormButton appearance="v2" feature="fitness" label="+ Add exercise" onPress={onAddExercise} />
  </View>;
}

const styles = StyleSheet.create({
  workout: { gap: Space.xl }, heading: { gap: Space.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  exerciseHeading: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  exerciseTitle: { flex: 1, minWidth: 0, gap: Space.xs },
  iconContainer: { width: 40, height: 40, borderRadius: Shape.control, alignItems: 'center', justifyContent: 'center' },
  empty: { padding: Space.md },
  set: { minHeight: TouchTarget, paddingVertical: Space.sm, paddingHorizontal: Space.sm,
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.md },
  setNumber: { flexBasis: 28, flexShrink: 0 },
  value: { flex: 1, minWidth: 0, fontVariant: ['tabular-nums'] },
  stackedSet: { flexDirection: 'column', alignItems: 'stretch' },
  stackedValue: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Space.sm },
});

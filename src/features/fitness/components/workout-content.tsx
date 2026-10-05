import { Pressable, StyleSheet, View } from 'react-native';

import { FormButton } from '@/components/form-controls';
import { StatusText } from '@/components/status-text';
import { ThemedText } from '@/components/themed-text';
import { ControlSize, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { targetLabel } from '../form';
import type { SessionDetail } from '../types';
import { workoutSetPresentation } from '../workout-presentation';

/** Normal screen content; focused editing surfaces are owned by FitnessScreen. */
export function WorkoutContent({ session, onAddExercise, onSet, onNote, onActions }: {
  session: SessionDetail; onAddExercise: () => void; onSet: (exerciseId: string, setId: string | null) => void;
  onNote: (exerciseId: string | null) => void; onActions: (exerciseId: string | null) => void;
}) {
  const colors = useTheme();
  return <View style={styles.workout}>
    <View style={styles.heading}>
      <ThemedText type="sectionHeading" accessibilityRole="header">{session.name}</ThemedText>
      <StatusText tone="info">In progress · Started {new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</StatusText>
      {!!session.note && <ThemedText type="secondary" themeColor="textSecondary">{session.note}</ThemedText>}
      <View style={styles.actions}>
        <FormButton variant="quiet" label={session.note ? 'Edit workout note' : 'Add workout note'} onPress={() => onNote(null)} />
        <FormButton variant="quiet" label="Workout actions" onPress={() => onActions(null)} />
      </View>
    </View>
    {!session.exercises.length && <ThemedText themeColor="textSecondary">Add an exercise to begin logging sets.</ThemedText>}
    {session.exercises.map((exercise) => <View key={exercise.id} style={[styles.exercise, { borderColor: colors.border }]}>
      <ThemedText type="cardTitle" accessibilityRole="header">{exercise.exerciseName}</ThemedText>
      {!!targetLabel(exercise) && <ThemedText type="metadata" themeColor="textSecondary">Target: {targetLabel(exercise)}</ThemedText>}
      {!!exercise.note && <ThemedText type="secondary" themeColor="textSecondary">Note: {exercise.note}</ThemedText>}
      <View style={styles.actions}>
        <FormButton variant="quiet" label={exercise.note ? 'Edit note' : 'Add note'} accessibilityLabel={`Note for ${exercise.exerciseName}`} onPress={() => onNote(exercise.id)} />
        <FormButton variant="quiet" label="Actions" accessibilityLabel={`Actions for ${exercise.exerciseName}`} onPress={() => onActions(exercise.id)} />
      </View>
      {exercise.sets.map((set, index) => {
        const presentation = workoutSetPresentation(set);
        return <Pressable key={set.id} accessibilityRole="button" accessible
          accessibilityLabel={`${exercise.exerciseName}, set ${index + 1}. ${presentation.spoken}`}
          accessibilityHint="Edit this set. Delete is available in the editor."
          onPress={() => onSet(exercise.id, set.id)}
          style={({ pressed }) => [styles.set, { backgroundColor: pressed ? colors.accentMuted : colors.surface, borderColor: colors.border }]}>
          <ThemedText type="metadata" themeColor="textSecondary">{index + 1}</ThemedText>
          {presentation.values.map((value, valueIndex) => <ThemedText key={valueIndex} type="body" style={styles.value}>{value}</ThemedText>)}
        </Pressable>;
      })}
      {exercise.targetSetCount !== null && <ThemedText type="metadata" themeColor="textSecondary">{exercise.sets.length} of {exercise.targetSetCount} planned sets logged</ThemedText>}
      <View style={styles.actions}>
        <FormButton label="+ Add set" accessibilityLabel={`Add set for ${exercise.exerciseName}`} onPress={() => onSet(exercise.id, null)} />
      </View>
    </View>)}
    <FormButton label="+ Add exercise" onPress={onAddExercise} />
  </View>;
}

const styles = StyleSheet.create({
  workout: { gap: Space.xl }, heading: { gap: Space.sm },
  exercise: { gap: Space.sm, paddingTop: Space.lg, borderTopWidth: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  set: { minHeight: ControlSize.touch, paddingVertical: Space.sm, paddingHorizontal: Space.md,
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.lg, borderBottomWidth: 1 },
  value: { flexShrink: 1, fontVariant: ['tabular-nums'] },
});

import { StyleSheet, View } from 'react-native';

import { AdaptiveSheet } from '@/components/adaptive-sheet';
import { FormError } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { measurementLabel, setLabel } from '../form';
import { workoutDateLabel } from '../management-presentation';
import { workoutSetPresentation } from '../workout-presentation';
import type { SessionDetail } from '../types';

/** Completed History detail only. Active sessions belong to the Workout destination. */
export function WorkoutSheet({ session, error, onDismiss }: {
  session: SessionDetail; error: string | null; onDismiss: () => void;
}) {
  const colors = useTheme();
  if (session.completedAt === null) return null;
  return <AdaptiveSheet title={session.name} onDismiss={onDismiss}>
    <FormError message={error} />
    <ThemedText type="sectionHeading" accessibilityRole="header">{workoutDateLabel(session.completedAt)}</ThemedText>
    <ThemedText type="secondary" themeColor="textSecondary">Completed {new Date(session.completedAt).toLocaleString()}</ThemedText>
    <ThemedText type="metadata" themeColor="textSecondary">Started {new Date(session.startedAt).toLocaleString()} · Read-only</ThemedText>
    {!!session.note && <View style={styles.notes}>
      <ThemedText type="sectionHeading" accessibilityRole="header">Workout note</ThemedText>
      <ThemedText>{session.note}</ThemedText>
    </View>}
    {!session.exercises.length && <ThemedText themeColor="textSecondary">No exercises logged.</ThemedText>}
    {session.exercises.map((exercise) => <View key={exercise.id} style={[styles.exercise, { borderColor: colors.border }]}>
      <ThemedText type="sectionHeading" accessibilityRole="header">{exercise.exerciseName}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{measurementLabel(exercise.measurementType)}</ThemedText>
      {exercise.targetSetCount === null && <ThemedText type="small" themeColor="textSecondary">{exercise.isManuallyComplete ? 'Exercise completed' : 'Not marked complete'} · No set target</ThemedText>}
      {!!exercise.note && <ThemedText type="small">Note: {exercise.note}</ThemedText>}
      {exercise.sets.map((set, index) => <View key={set.id} style={styles.set} accessible
        accessibilityLabel={`${exercise.exerciseName}, set ${index + 1}. ${workoutSetPresentation(set).spoken}`}>
        <ThemedText type="metadata" themeColor="textSecondary">Set {index + 1}</ThemedText>
        <ThemedText>{setLabel(set)}</ThemedText>
      </View>)}
      {!exercise.sets.length && <ThemedText type="small" themeColor="textSecondary">No sets logged.</ThemedText>}
    </View>)}
  </AdaptiveSheet>;
}

const styles = StyleSheet.create({
  exercise: { borderBottomWidth: 1, paddingVertical: Space.md, gap: Space.sm },
  notes: { gap: Space.sm, paddingVertical: Space.sm },
  set: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: Space.md, paddingVertical: Space.sm },
});

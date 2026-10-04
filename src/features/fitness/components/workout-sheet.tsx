import { StyleSheet, View } from 'react-native';

import { AdaptiveSheet } from '@/components/adaptive-sheet';
import { FormButton, FormError } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { measurementLabel, setLabel, targetLabel } from '../form';
import type { SessionDetail } from '../types';

export function WorkoutSheet({ session, error, onDismiss, onFinish, onDiscard, onAddExercise, onRemoveExercise, onSet, onDeleteSet, onNote }: {
  session: SessionDetail; error: string | null; onDismiss: () => void; onFinish: () => void; onDiscard: () => void;
  onAddExercise: () => void; onRemoveExercise: (id: string) => void; onSet: (exerciseId: string, setId: string | null) => void;
  onDeleteSet: (id: string) => void; onNote: (exerciseId: string | null) => void;
}) {
  const colors = useTheme();
  const active = session.completedAt === null;
  return <AdaptiveSheet title={session.name} onDismiss={onDismiss}>
    <FormError message={error} />
    <ThemedText type="small" themeColor="textSecondary">{new Date(session.startedAt).toLocaleString()} · {active ? 'In progress' : 'Completed'}</ThemedText>
    {!!session.note && <ThemedText type="small">Workout note: {session.note}</ThemedText>}
    {active && <View style={styles.actions}>
      <FormButton label="Add exercise" onPress={onAddExercise} />
      <FormButton label={session.note ? 'Edit workout note' : 'Add workout note'} onPress={() => onNote(null)} />
    </View>}
    {!session.exercises.length && <ThemedText themeColor="textSecondary">No exercises logged{active ? ' yet. Add an exercise to begin.' : '.'}</ThemedText>}
    {session.exercises.map((exercise) => <View key={exercise.id} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <ThemedText type="smallBold" accessibilityRole="header">{exercise.exerciseName}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{measurementLabel(exercise.measurementType)}</ThemedText>
      {active && !!targetLabel(exercise) && <ThemedText type="small" themeColor="textSecondary">{targetLabel(exercise)}</ThemedText>}
      {!!exercise.note && <ThemedText type="small">Note: {exercise.note}</ThemedText>}
      {exercise.sets.map((set, index) => <View key={set.id} style={styles.set}>
        <ThemedText>Set {index + 1} · {setLabel(set)}</ThemedText>
        {active && <View style={styles.actions}>
          <FormButton label="Edit" accessibilityLabel={`Edit ${exercise.exerciseName} set ${index + 1}`} onPress={() => onSet(exercise.id, set.id)} />
          <FormButton label="Delete" accessibilityLabel={`Delete ${exercise.exerciseName} set ${index + 1}`} onPress={() => onDeleteSet(set.id)} />
        </View>}
      </View>)}
      {!active && !exercise.sets.length && <ThemedText type="small" themeColor="textSecondary">No sets logged.</ThemedText>}
      {active && <>
        {exercise.targetSetCount !== null && <ThemedText type="small" themeColor="textSecondary">
          {exercise.sets.length} of {exercise.targetSetCount} planned sets logged
        </ThemedText>}
        <View style={styles.actions}>
          <FormButton label={`Log set ${exercise.sets.length + 1}`} accessibilityLabel={`Log set ${exercise.sets.length + 1} for ${exercise.exerciseName}`} onPress={() => onSet(exercise.id, null)} />
          <FormButton label={exercise.note ? 'Edit note' : 'Add note'} accessibilityLabel={`Note for ${exercise.exerciseName}`} onPress={() => onNote(exercise.id)} />
          <FormButton label="Remove exercise" accessibilityLabel={`Remove ${exercise.exerciseName} from workout`} onPress={() => onRemoveExercise(exercise.id)} />
        </View>
      </>}
    </View>)}
    {active && <View style={styles.actions}>
      <FormButton label="Finish Workout" onPress={onFinish} />
      <FormButton label="Discard workout" onPress={onDiscard} />
    </View>}
  </AdaptiveSheet>;
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  set: { gap: Spacing.two, paddingVertical: Spacing.two },
});

import { StyleSheet, View } from 'react-native';

import { AdaptiveSheet } from '@/components/adaptive-sheet';
import { FormError } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { measurementLabel, setLabel } from '../form';
import type { SessionDetail } from '../types';

/** Completed History detail only. Active sessions belong to the Workout destination. */
export function WorkoutSheet({ session, error, onDismiss }: {
  session: SessionDetail; error: string | null; onDismiss: () => void;
}) {
  const colors = useTheme();
  if (session.completedAt === null) return null;
  return <AdaptiveSheet title={session.name} onDismiss={onDismiss}>
    <FormError message={error} />
    <ThemedText type="small" themeColor="textSecondary">{new Date(session.startedAt).toLocaleString()} · Completed</ThemedText>
    {!!session.note && <ThemedText type="small">Workout note: {session.note}</ThemedText>}
    {!session.exercises.length && <ThemedText themeColor="textSecondary">No exercises logged.</ThemedText>}
    {session.exercises.map((exercise) => <View key={exercise.id} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <ThemedText type="smallBold" accessibilityRole="header">{exercise.exerciseName}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{measurementLabel(exercise.measurementType)}</ThemedText>
      {!!exercise.note && <ThemedText type="small">Note: {exercise.note}</ThemedText>}
      {exercise.sets.map((set, index) => <View key={set.id} style={styles.set}>
        <ThemedText>Set {index + 1} · {setLabel(set)}</ThemedText>
      </View>)}
      {!exercise.sets.length && <ThemedText type="small" themeColor="textSecondary">No sets logged.</ThemedText>}
    </View>)}
  </AdaptiveSheet>;
}

const styles = StyleSheet.create({
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  set: { gap: Spacing.two, paddingVertical: Spacing.two },
});

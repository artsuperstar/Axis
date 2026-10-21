import { Pressable, StyleSheet, View } from 'react-native';

import { AdaptiveSheet } from '@/components/adaptive-sheet';
import { ContextMenu, type ContextMenuAction } from '@/components/context-menu';
import { ThemedText } from '@/components/themed-text';
import { ControlSize, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { exerciseMeasurementLabel, exerciseTypeLabel, workoutCounts, workoutHistoryGroups } from '../management-presentation';
import type { Exercise, RoutineDetail, SessionSummary } from '../types';
import { ArchivedRoutineEditor } from './fitness-forms';

/** The object opens its detail; secondary actions have their own anchored trigger. */
export function FitnessObjectRow({ name, summary, label, hint, onPress, actions }: {
  name: string; summary: string; label: string; hint: string; onPress: () => void; actions?: ContextMenuAction[];
}) {
  const colors = useTheme();
  return <View style={[styles.row, { borderColor: colors.border }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint} onPress={onPress}
      style={({ pressed }) => [styles.object, pressed && { backgroundColor: colors.surfaceMuted }]}>
      <ThemedText type="cardTitle">{name}</ThemedText>
      <ThemedText type="metadata" themeColor="textSecondary">{summary}</ThemedText>
    </Pressable>
    {!!actions?.length && <ContextMenu label={`Options for ${name}`} actions={actions} />}
  </View>;
}

export function WorkoutHistory({ sessions, onOpen }: { sessions: readonly SessionSummary[]; onOpen: (id: string) => void }) {
  return <View style={styles.groups}>{workoutHistoryGroups(sessions).map((group) => <View key={group.key}>
    <ThemedText type="sectionHeading" accessibilityRole="header" style={styles.date}>{group.label}</ThemedText>
    {group.sessions.map((session) => <FitnessObjectRow key={session.id} name={session.name}
      summary={workoutCounts(session.exerciseCount, session.setCount)}
      label={`View ${session.name}, ${new Date(session.completedAt!).toLocaleString()}, ${workoutCounts(session.exerciseCount, session.setCount)}`}
      hint="Opens the completed workout. Read-only." onPress={() => onOpen(session.id)} />)}
  </View>)}</View>;
}

export function ExerciseDetail({ exercise, onDismiss }: { exercise: Exercise; onDismiss: () => void }) {
  return <AdaptiveSheet title={exercise.name} onDismiss={onDismiss}>
    <ThemedText type="sectionHeading" accessibilityRole="header">Measurement</ThemedText>
    <ThemedText>{exerciseTypeLabel(exercise.measurementType)} · {exerciseMeasurementLabel(exercise.measurementType)}</ThemedText>
    <ThemedText type="secondary" themeColor="textSecondary">{exercise.isBuiltIn ? 'Built-in exercise. Available to all your routines and cannot be archived.'
      : exercise.deletedAt !== null ? 'Archived. Existing routine references and workout history are retained. New workouts omit this exercise.'
        : 'Custom exercise. Archiving removes it from new choices and keeps existing routine references and workout history.'}</ThemedText>
  </AdaptiveSheet>;
}

export function ArchivedRoutineDetail({ routine, onDismiss }: { routine: RoutineDetail; onDismiss: () => void }) {
  return <ArchivedRoutineEditor routine={routine} onDismiss={onDismiss} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, gap: Space.sm },
  object: { flex: 1, minWidth: 0, minHeight: ControlSize.touch, paddingVertical: Space.md, gap: Space.xs },
  groups: { gap: Space.xl }, date: { marginBottom: Space.sm },
});

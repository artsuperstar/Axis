import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { dateLabel } from '../form';
import { categoryName } from '../grouping';
import { occurrenceLabels, occurrenceState, recurrencePatternSummary } from '../recurrence';
import { priorityLabels, type Task, type TaskCategory, type TaskOccurrence, type TaskRecurrence } from '../types';
import { TaskButton } from './controls';

export function TaskRow({ task, occurrence, recurrence, categories, onEdit, onComplete, onDelete, onSkip, onHistory, now }: {
  task: Task;
  categories: TaskCategory[];
  onEdit: () => void;
  onComplete: () => void;
  onDelete: () => void;
  occurrence: TaskOccurrence | null;
  recurrence: TaskRecurrence | null;
  onSkip?: () => void;
  onHistory?: () => void;
  now: number;
}) {
  const colors = useTheme();
  const completed = occurrence ? occurrence.status === 'completed' : task.completedAt !== null;
  const scheduledDate = occurrence ? occurrence.scheduledDate : task.date;
  const time = occurrence ? occurrence.scheduledTime : task.time;
  const date = scheduledDate ? `${dateLabel(scheduledDate)}${time ? ` at ${time}` : ''}` : 'No date';
  const metadata = [categoryName(task, categories), task.priority !== 'none' ? `${priorityLabels[task.priority]} priority` : null]
    .filter(Boolean).join(' · ');
  const state = occurrence ? occurrenceState(occurrence, new Date(now)) : null;
  const recurrenceText = recurrence ? recurrencePatternSummary(recurrence) : 'Repeats';
  const outcome = state && state !== 'today' && state !== 'upcoming' ? ` · ${occurrenceLabels[state]}` : '';
  return (
    <View style={[styles.row, { borderColor: colors.backgroundSelected }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed }}
        accessibilityLabel={`${completed ? 'Reopen' : 'Complete'} ${task.title}${occurrence ? ` on ${date}` : ''}`}
        onPress={onComplete}
        style={styles.checkbox}>
        <ThemedText style={styles.check}>{completed ? '✓' : '○'}</ThemedText>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${task.title}`} onPress={onEdit} style={styles.details}>
        <ThemedText style={completed && styles.completed}>{task.title}</ThemedText>
        {!!task.description && <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>{task.description}</ThemedText>}
        <ThemedText type="small" themeColor="textSecondary">{date}</ThemedText>
        {!!metadata && <ThemedText type="small" themeColor="textSecondary">{metadata}</ThemedText>}
        {occurrence && <ThemedText type="small" themeColor="textSecondary">{recurrenceText}{outcome}</ThemedText>}
      </Pressable>
      <View style={styles.actions}>
        {onSkip && <TaskButton label={occurrence?.status === 'skipped' ? 'Reopen' : 'Skip'} accessibilityLabel={`${occurrence?.status === 'skipped' ? 'Return to pending' : 'Skip'} ${task.title} on ${date}`} onPress={onSkip} />}
        {onHistory && <TaskButton label="History" accessibilityLabel={`History for ${task.title}`} onPress={onHistory} />}
        <TaskButton label="Delete" accessibilityLabel={`Delete ${task.title}`} onPress={onDelete} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.three, borderBottomWidth: 1 },
  checkbox: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  check: { fontSize: 28, lineHeight: 32 },
  details: { flex: 1, minHeight: 44, gap: Spacing.half },
  completed: { textDecorationLine: 'line-through' },
  actions: { gap: Spacing.two },
});

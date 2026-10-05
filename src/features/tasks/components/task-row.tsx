import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { taskRowPresentation } from '../presentation';
import type { Task, TaskCategory, TaskOccurrence, TaskRecurrence } from '../types';
import { TaskButton } from './controls';

export function TaskRow({ task, occurrence, recurrences, categories, onEdit, onComplete, onDelete, onSkip, onHistory, now }: {
  task: Task;
  categories: TaskCategory[];
  onEdit: () => void;
  onComplete: () => void;
  onDelete: () => void;
  occurrence: TaskOccurrence | null;
  recurrences: TaskRecurrence[];
  onSkip?: () => void;
  onHistory?: () => void;
  now: number;
}) {
  const colors = useTheme();
  const row = taskRowPresentation(task, occurrence, recurrences, categories, now);
  const { completed, date, metadata } = row;
  return (
    <View style={[styles.row, { borderColor: colors.backgroundSelected }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed }}
        accessibilityLabel={`${completed ? 'Reopen' : 'Complete'} ${row.actionSubject}`}
        onPress={onComplete}
        style={styles.checkbox}>
        <ThemedText style={styles.check}>{completed ? '✓' : '○'}</ThemedText>
      </Pressable>
      <Pressable accessible accessibilityRole="button" accessibilityLabel={row.accessibilityLabel} accessibilityHint="Opens the task editor" onPress={onEdit} style={styles.details}>
        <ThemedText style={completed && styles.completed}>{task.title}</ThemedText>
        {!!task.description && <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>{task.description}</ThemedText>}
        <ThemedText type="small" themeColor="textSecondary">{date}</ThemedText>
        {!!metadata && <ThemedText type="small" themeColor="textSecondary">{metadata}</ThemedText>}
        {occurrence && <ThemedText type="small" themeColor="textSecondary">{row.recurrence}{row.visibleOutcome}</ThemedText>}
      </Pressable>
      <View style={styles.actions}>
        {onSkip && <TaskButton label={occurrence?.status === 'skipped' ? 'Reopen' : 'Skip'} accessibilityLabel={`${occurrence?.status === 'skipped' ? 'Return to pending' : 'Skip'} ${row.actionSubject}`} onPress={onSkip} />}
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

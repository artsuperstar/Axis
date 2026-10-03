import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { dateLabel } from '../form';
import { categoryName } from '../grouping';
import { priorityLabels, type Task, type TaskCategory } from '../types';
import { TaskButton } from './controls';

export function TaskRow({ task, categories, onEdit, onComplete, onDelete }: {
  task: Task;
  categories: TaskCategory[];
  onEdit: () => void;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const colors = useTheme();
  const completed = task.completedAt !== null;
  const date = task.date ? `${dateLabel(task.date)}${task.time ? ` at ${task.time}` : ''}` : 'No date';
  return (
    <View style={[styles.row, { borderColor: colors.backgroundSelected }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed }}
        accessibilityLabel={`${completed ? 'Reopen' : 'Complete'} ${task.title}`}
        onPress={onComplete}
        style={styles.checkbox}>
        <ThemedText style={styles.check}>{completed ? '✓' : '○'}</ThemedText>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${task.title}`} onPress={onEdit} style={styles.details}>
        <ThemedText style={completed && styles.completed}>{task.title}</ThemedText>
        {!!task.description && <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>{task.description}</ThemedText>}
        <ThemedText type="small" themeColor="textSecondary">{date}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{categoryName(task, categories)}{task.priority !== 'none' ? ` · ${priorityLabels[task.priority]} priority` : ''}</ThemedText>
      </Pressable>
      <TaskButton label="Delete" onPress={onDelete} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.three, borderBottomWidth: 1 },
  checkbox: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  check: { fontSize: 28, lineHeight: 32 },
  details: { flex: 1, minHeight: 44, gap: Spacing.half },
  completed: { textDecorationLine: 'line-through' },
});

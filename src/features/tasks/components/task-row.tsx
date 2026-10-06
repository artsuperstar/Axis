import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { StatusText } from '@/components/status-text';
import { ControlSize, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { taskRowPresentation } from '../presentation';
import type { Task, TaskCategory, TaskOccurrence, TaskRecurrence } from '../types';
import { TaskButton } from './controls';

export function TaskRow({ task, occurrence, recurrences, categories, onEdit, onComplete, onActions, now }: {
  task: Task;
  categories: TaskCategory[];
  onEdit: () => void;
  onComplete: () => void;
  onActions: () => void;
  occurrence: TaskOccurrence | null;
  recurrences: TaskRecurrence[];
  now: number;
}) {
  const colors = useTheme();
  const row = taskRowPresentation(task, occurrence, recurrences, categories, now);
  const { completed, metadata } = row;
  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed }}
        accessibilityLabel={`${completed ? 'Reopen' : 'Complete'} ${row.actionSubject}`}
        onPress={onComplete}
        style={styles.checkbox}>
        <ThemedText type="metric" themeColor={completed ? 'accent' : 'textSecondary'}>{completed ? '✓' : '○'}</ThemedText>
      </Pressable>
      <Pressable accessible accessibilityRole="button" accessibilityLabel={row.accessibilityLabel} accessibilityHint="Opens the task editor" onPress={onEdit} style={styles.details}>
        <ThemedText type="cardTitle" themeColor={row.resolved ? 'textSecondary' : 'textPrimary'} style={completed && styles.completed}>{task.title}</ThemedText>
        {!!row.visibleDate && <ThemedText type="metadata" themeColor="textSecondary">{row.visibleDate}</ThemedText>}
        {!!metadata && <ThemedText type="metadata" themeColor="textSecondary">{metadata}</ThemedText>}
        {!!row.statusLabel && <StatusText type="metadata" tone={row.attention ? 'attention' : 'subdued'}>{row.statusLabel}</StatusText>}
        {!!task.description && <ThemedText type="secondary" themeColor="textSecondary" numberOfLines={2}>{task.description}</ThemedText>}
      </Pressable>
      <TaskButton variant="quiet" label="⋯" accessibilityLabel={`Actions for ${row.actionSubject}`} onPress={onActions} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm, paddingVertical: Space.md, borderBottomWidth: 1 },
  checkbox: { minWidth: ControlSize.touch, minHeight: ControlSize.touch, justifyContent: 'center', alignItems: 'center' },
  details: { flex: 1, minWidth: 0, minHeight: ControlSize.touch, gap: Space.xs },
  completed: { textDecorationLine: 'line-through' },
});

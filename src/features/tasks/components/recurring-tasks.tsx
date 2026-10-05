import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AdaptiveModal, AdaptiveSheet } from '@/components/adaptive-sheet';
import { Spacing } from '@/constants/theme';

import { latestRecurrence, recurrenceSummary } from '../recurrence';
import type { Task, TaskRecurrence } from '../types';
import { TaskButton } from './controls';

export function RecurringTasks({ tasks, recurrences, onEdit, onHistory, onDismiss, visible, onClosed }: {
  tasks: Task[];
  recurrences: TaskRecurrence[];
  onEdit: (task: Task) => void;
  onHistory: (task: Task) => void;
  onDismiss: () => void;
  visible: boolean;
  onClosed: () => void;
}) {
  const series = tasks.filter((task) => recurrences.some((rule) => rule.taskId === task.id));
  return (
    <AdaptiveModal onDismiss={onDismiss} visible={visible} onClosed={onClosed}>
      <AdaptiveSheet contentContainerStyle={styles.content} header={<View style={styles.header}>
              <ThemedText type="sheetTitle" accessibilityRole="header" style={{ flex: 1 }}>Repeating tasks</ThemedText>
              <TaskButton variant="quiet" label="Done" onPress={onDismiss} />
            </View>}>
              {!series.length && <ThemedText>No repeating tasks yet.</ThemedText>}
              {series.map((task) => (
        <View key={task.id} style={styles.entry}>
          <ThemedText>{task.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{recurrenceSummary(latestRecurrence(recurrences, task.id)!)}</ThemedText>
          <View style={styles.buttons}>
            <TaskButton label="Edit schedule" accessibilityLabel={`Edit schedule for ${task.title}`} onPress={() => onEdit(task)} />
            <TaskButton label="History" accessibilityLabel={`History for ${task.title}`} onPress={() => onHistory(task)} />
          </View>
        </View>
              ))}
      </AdaptiveSheet>
    </AdaptiveModal>
  );
}

const styles = StyleSheet.create({
  header: { padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  content: { padding: Spacing.three, gap: Spacing.four },
  entry: { gap: Spacing.two },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});

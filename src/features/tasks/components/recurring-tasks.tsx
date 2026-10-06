import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Space } from '@/constants/theme';

import { latestRecurrence, recurrenceSummary } from '../recurrence';
import type { Task, TaskRecurrence } from '../types';
import { TaskButton } from './controls';

export function RecurringTasks({ tasks, recurrences, onEdit, onHistory, onDelete }: {
  tasks: Task[];
  recurrences: TaskRecurrence[];
  onEdit: (task: Task) => void;
  onHistory: (task: Task) => void;
  onDelete?: (task: Task) => void;
}) {
  const series = tasks.filter((task) => recurrences.some((rule) => rule.taskId === task.id));
  return (
    <View style={styles.content}>
      {!series.length && <ThemedText>No repeating tasks yet.</ThemedText>}
      {series.map((task) => (
        <View key={task.id} style={styles.entry}>
          <ThemedText type="cardTitle" accessibilityRole="header">{task.title}</ThemedText>
          <View style={styles.schedule}>
            <ThemedText type="metadata" themeColor="textSecondary">Current schedule</ThemedText>
            <ThemedText type="secondary">{recurrenceSummary(latestRecurrence(recurrences, task.id)!)}</ThemedText>
          </View>
          <View style={styles.buttons}>
            <TaskButton label="Edit schedule" accessibilityLabel={`Edit schedule for ${task.title}`} onPress={() => onEdit(task)} />
            <TaskButton variant="quiet" label="History" accessibilityLabel={`History for ${task.title}`} onPress={() => onHistory(task)} />
            {onDelete && <TaskButton variant="destructive" label="Delete" accessibilityLabel={`Delete recurring task ${task.title}`} onPress={() => onDelete(task)} />}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: Space.xl },
  entry: { gap: Space.md }, schedule: { gap: Space.xs },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
});

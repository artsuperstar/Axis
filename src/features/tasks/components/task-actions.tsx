import { StyleSheet, View } from 'react-native';

import { AdaptiveModal, AdaptiveSheet } from '@/components/adaptive-sheet';
import { FormButton, FormError } from '@/components/form-controls';
import { StatusText } from '@/components/status-text';
import { UiText } from '@/components/design-system';
import { Space } from '@/constants/theme';

import { taskRowPresentation } from '../presentation';
import type { TaskCategory, TaskListItem, TaskRecurrence } from '../types';

/** A focused action surface; the screen owns mutations and native-modal handoffs. */
export function TaskActions({ item, recurrences, categories, now, visible, error, onDismiss, onClosed, onEdit, onHistory, onSkip, onDelete }: {
  item: TaskListItem | null; recurrences: TaskRecurrence[]; categories: TaskCategory[]; now: number; visible: boolean; error: string | null;
  onDismiss: () => void; onClosed: () => void; onEdit: () => void; onHistory: () => void; onSkip: () => void; onDelete: () => void;
}) {
  const row = item ? taskRowPresentation(item.task, item.occurrence, recurrences, categories, now) : null;
  return <AdaptiveModal visible={visible} onDismiss={onDismiss} onClosed={onClosed}>
    <AdaptiveSheet appearance="v2" titleRole="operational" title={item?.task.title ?? 'Task actions'} onDismiss={onDismiss}>
      <FormError appearance="v2" message={error} />
      {row && item?.occurrence && <View style={styles.group}>
        <UiText type="cardTitle" accessibilityRole="header">Occurrence</UiText>
        <UiText type="secondary" color="textSecondary">{row.date}</UiText>
        <StatusText appearance="v2" tone={row.attention ? 'attention' : row.resolved ? 'subdued' : 'neutral'}>{row.outcome}</StatusText>
        {item.occurrence.status !== 'completed' && <FormButton appearance="v2" variant="quiet"
          label={item.occurrence.status === 'skipped' ? 'Return to pending' : 'Skip occurrence'}
          accessibilityLabel={`${item.occurrence.status === 'skipped' ? 'Return to pending' : 'Skip'} ${row.actionSubject}`} onPress={onSkip} />}
      </View>}
      {item && <View style={styles.group}>
        <UiText type="cardTitle" accessibilityRole="header">{item.occurrence ? 'Recurring task' : 'Task'}</UiText>
        <FormButton appearance="v2" label={item.occurrence ? 'Edit recurring task' : 'Edit task'} accessibilityLabel={`Edit ${item.occurrence ? 'recurring task' : 'task'} ${item.task.title}`} onPress={onEdit} />
        {item.occurrence && <FormButton appearance="v2" variant="quiet" label="View History" accessibilityLabel={`History for ${item.task.title}`} onPress={onHistory} />}
        <FormButton appearance="v2" variant="destructive" label={item.occurrence ? 'Delete recurring task' : 'Delete task'} accessibilityLabel={`Delete ${item.occurrence ? 'recurring task' : 'task'} ${item.task.title}`} onPress={onDelete} />
      </View>}
    </AdaptiveSheet>
  </AdaptiveModal>;
}

const styles = StyleSheet.create({ group: { gap: Space.sm } });

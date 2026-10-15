import { StyleSheet, View } from 'react-native';

import { FormButton, FormError } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { Space } from '@/constants/theme';
import { formatBrlAmount } from '@/features/finance/money';

import type { JournalDayContext } from '../types';

export function JournalContext({ context, error, onRetry }: { context: JournalDayContext | null; error: string | null; onRetry: () => void }) {
  if (!error && (!context || (!context.completedTaskCount && !context.workoutCount && !context.transactionCount))) return null;
  return <View style={styles.content}>
    <ThemedText type="secondary" accessibilityRole="header">Day at a Glance</ThemedText>
    <FormError message={error} />
    {error && <FormButton variant="quiet" label="Retry activity" onPress={onRetry} />}
    {context && <View style={styles.lines}>
      {context.completedTaskCount > 0 && <ThemedText type="secondary" themeColor="textSecondary">{context.completedTaskCount} {context.completedTaskCount === 1 ? 'task' : 'tasks'} completed</ThemedText>}
      {context.workoutCount > 0 && <ThemedText type="secondary" themeColor="textSecondary">
        {context.workoutCount === 1 ? `${context.workouts[0].name} · Workout completed` : `${context.workoutCount} workouts completed`}
      </ThemedText>}
      {context.transactionCount > 0 && <>
        <ThemedText type="secondary" themeColor="textSecondary">Spent {formatBrlAmount(context.expensesMinor)}</ThemedText>
        <ThemedText type="secondary" themeColor="textSecondary">Income {formatBrlAmount(context.incomeMinor)}</ThemedText>
        <ThemedText type="secondary" themeColor="textSecondary">Net Flow {formatBrlAmount(context.netFlowMinor)}</ThemedText>
      </>}
    </View>}
  </View>;
}
const styles = StyleSheet.create({ content: { gap: Space.sm, paddingTop: Space.md }, lines: { gap: Space.xs } });

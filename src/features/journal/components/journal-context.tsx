import { StyleSheet, View } from 'react-native';

import { FormButton, FormError } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { formatBrlAmount } from '@/features/finance/money';

import type { JournalDayContext } from '../types';

export function JournalContext({ context, error, onRetry }: { context: JournalDayContext | null; error: string | null; onRetry: () => void }) {
  return <View style={styles.content}>
    <ThemedText type="smallBold" accessibilityRole="header">About this day</ThemedText>
    <FormError message={error} />
    {error && <FormButton label="Retry activity" onPress={onRetry} />}
    {context && <>
      {context.completedTaskCount > 0 && <View style={styles.group}>
        <ThemedText type="small">Tasks completed: {context.completedTaskCount}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{context.taskNames.join(' · ')}{context.completedTaskCount > context.taskNames.length ? ' …' : ''}</ThemedText>
      </View>}
      {context.workoutCount > 0 && <View style={styles.group}>
        <ThemedText type="small">Workouts completed: {context.workoutCount}</ThemedText>
        {context.workouts.map((workout) => <ThemedText key={workout.id} type="small" themeColor="textSecondary">{workout.name} · {workout.exerciseCount} exercises · {workout.setCount} sets</ThemedText>)}
        {context.workoutCount > context.workouts.length && <ThemedText type="small" themeColor="textSecondary">{context.workoutCount - context.workouts.length} more workouts</ThemedText>}
      </View>}
      {context.transactionCount > 0 && <View style={styles.group}>
        <ThemedText type="small">Spent: {formatBrlAmount(context.expensesMinor)}</ThemedText>
        <ThemedText type="small">Received: {formatBrlAmount(context.incomeMinor)}</ThemedText>
        <ThemedText type="small">Net Flow: {formatBrlAmount(context.netFlowMinor)}</ThemedText>
      </View>}
      {context.completedTaskCount === 0 && context.workoutCount === 0 && context.transactionCount === 0
        && <ThemedText type="small" themeColor="textSecondary">No completed activity or transactions for this day.</ThemedText>}
    </>}
  </View>;
}
const styles = StyleSheet.create({ content: { gap: Spacing.three, paddingTop: Spacing.three }, group: { gap: Spacing.one } });

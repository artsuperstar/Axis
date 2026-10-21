import type { ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { FormButton, FormError } from '@/components/form-controls';
import { UiIcon, UiText } from '@/components/design-system';
import type { UiIconName } from '@/components/ui-icon';
import { DesignSpace as Space, Shape } from '@/constants/design-system-v2';
import { formatBrlAmount } from '@/features/finance/money';

import type { JournalDayContext } from '../types';
import { journalTaskPreviewLimit } from '../presentation';
import { JournalGroup, useJournalColors } from './journal-surface';

/** Static source context: one informational accessibility group, never an action. */
function ContextSource({ title, icon, announcement, children }: { title: string; icon: UiIconName; announcement: string; children: ReactNode }) {
  const colors = useJournalColors();
  const { fontScale } = useWindowDimensions();
  return <View accessible accessibilityLabel={announcement} testID={`journal-context-${title.toLowerCase()}`}
    style={[styles.source, fontScale >= 1.5 && { flexDirection: 'column', alignItems: 'stretch' }]}>
    <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}><UiIcon name={icon} color={colors.accent} size={20} /></View>
    <View style={[styles.body, fontScale >= 1.5 && { flex: 0, width: '100%' }]}><UiText type="cardTitle">{title}</UiText>{children}</View>
  </View>;
}

function FinanceLine({ label, amount }: { label: string; amount: bigint }) {
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 360 || fontScale >= 1.5;
  return <View style={[styles.money, stacked && { flexDirection: 'column', alignItems: 'stretch', gap: 0 }]}>
    <UiText type="secondary" color="textSecondary">{label}</UiText>
    <UiText type="secondary" color="textSecondary" style={{ flexShrink: 1, maxWidth: '100%', textAlign: stacked ? 'left' : 'right', fontVariant: ['tabular-nums'] }}>{formatBrlAmount(amount)}</UiText>
  </View>;
}

export function JournalContext({ context, error, onRetry }: { context: JournalDayContext | null; error: string | null; onRetry: () => void }) {
  const colors = useJournalColors();
  if (!error && (!context || (!context.completedTaskCount && !context.workoutCount && !context.transactionCount))) return null;
  const names = context?.taskNames.slice(0, journalTaskPreviewLimit) ?? [];
  const remaining = Math.max(0, (context?.completedTaskCount ?? 0) - names.length);
  return <JournalGroup>
    <View style={{ gap: Space.xs }}><UiText type="cardTitle" accessibilityRole="header">Day at a Glance</UiText>
      <UiText type="secondary" color="textSecondary">A quiet snapshot of your day.</UiText></View>
    <FormError appearance="v2" message={error} />
    {error && <FormButton appearance="v2" variant="quiet" label="Retry activity" onPress={onRetry} />}
    {context && <View style={styles.sections}>
      {context.completedTaskCount > 0 && <ContextSource title="Tasks" icon="list"
        announcement={`Tasks. ${context.completedTaskCount} completed. ${names.join('. ')}.${remaining ? ` ${remaining} more completed ${remaining === 1 ? 'task' : 'tasks'}.` : ''}`}>
        <UiText type="secondary" color="textSecondary">{context.completedTaskCount} completed</UiText>
        <View style={styles.tasks}>{names.map((name, index) => <View key={index} style={styles.task}>
          <View accessible={false} style={[styles.bullet, { backgroundColor: colors.textMuted }]} />
          <UiText type="secondary" color="textSecondary" numberOfLines={3} style={styles.taskTitle}>{name}</UiText>
        </View>)}</View>
        {remaining > 0 && <UiText type="secondary" color="textSecondary" accessibilityLabel={`${remaining} more completed ${remaining === 1 ? 'task' : 'tasks'}`}>+{remaining} more</UiText>}
      </ContextSource>}
      {context.workoutCount > 0 && <ContextSource title="Fitness" icon="dumbbell"
        announcement={`Fitness. ${context.workoutCount === 1 ? `${context.workouts[0].name}. Workout completed.` : `${context.workoutCount} workouts completed.`}`}>
        {context.workoutCount === 1 ? <><UiText type="secondary" color="textSecondary">{context.workouts[0].name}</UiText>
          <UiText type="secondary" color="textSecondary">Workout completed</UiText></>
          : <UiText type="secondary" color="textSecondary">{context.workoutCount} workouts completed</UiText>}
      </ContextSource>}
      {context.transactionCount > 0 && <ContextSource title="Finance" icon="chart"
        announcement={`Finance. Spent ${formatBrlAmount(context.expensesMinor)}. Income ${formatBrlAmount(context.incomeMinor)}. Net ${formatBrlAmount(context.netFlowMinor)}.`}>
        <FinanceLine label="Spent" amount={context.expensesMinor} />
        <FinanceLine label="Income" amount={context.incomeMinor} />
        <FinanceLine label="Net" amount={context.netFlowMinor} />
      </ContextSource>}
    </View>}
  </JournalGroup>;
}
const styles = StyleSheet.create({
  sections: { gap: Space.lg }, source: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.md },
  icon: { width: 32, height: 32, borderRadius: Shape.inset, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0, gap: Space.xs }, tasks: { gap: Space.xs, marginTop: Space.xs },
  task: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm }, taskTitle: { flex: 1, minWidth: 0 },
  bullet: { width: 4, height: 4, borderRadius: 2, marginTop: Space.sm },
  money: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: Space.sm },
});

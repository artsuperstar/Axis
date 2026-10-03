import { StyleSheet, View } from 'react-native';

import { FormButton } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dateLabel } from '@/utils/calendar';

import { spendingBarPercent, type FinanceAnalytics } from '../analytics';
import { formatBrlAmount } from '../money';
import { canMovePeriod, periodBounds, periodKindLabels, periodKinds, periodLabel, type FinancePeriod, type PeriodKind } from '../periods';

export function FinancePeriodControls({ period, today, onKind, onMove, onCurrent }: {
  period: FinancePeriod;
  today: string;
  onKind: (kind: PeriodKind) => void;
  onMove: (direction: -1 | 1) => void;
  onCurrent: () => void;
}) {
  const current = period.startDate === periodBounds(period.kind, today).startDate;
  return <View style={styles.section}>
    <View style={styles.choices} accessibilityLabel="Finance period">
      {periodKinds.map((kind) => <FormButton key={kind} label={periodKindLabels[kind]} selected={period.kind === kind} onPress={() => onKind(kind)} />)}
    </View>
    <View style={styles.navigation}>
      <FormButton label="‹" accessibilityLabel={`Previous ${period.kind}`} disabled={!canMovePeriod(period, -1, today)} onPress={() => onMove(-1)} />
      <View style={styles.periodLabel}>
        <ThemedText type="smallBold" accessibilityRole="header" style={styles.center}>{periodLabel(period)}</ThemedText>
        {period.kind !== 'week' && <ThemedText type="small" themeColor="textSecondary" style={styles.center}>{dateLabel(period.startDate)} – {dateLabel(period.endDate)}</ThemedText>}
      </View>
      <FormButton label="›" accessibilityLabel={`Next ${period.kind}`} disabled={!canMovePeriod(period, 1, today)} onPress={() => onMove(1)} />
    </View>
    {!current && <FormButton label={`Current ${period.kind}`} onPress={onCurrent} />}
  </View>;
}

export function FinanceDashboard({ analytics }: { analytics: FinanceAnalytics }) {
  const colors = useTheme();
  const metrics = [
    { label: 'Income', amount: analytics.incomeMinor },
    { label: 'Expenses', amount: analytics.expensesMinor },
    { label: 'Net Flow', amount: analytics.netFlowMinor },
  ];
  return <View style={styles.section}>
    <View style={styles.cards}>
      {metrics.map((metric) => <View key={metric.label} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
        <ThemedText type="small" themeColor="textSecondary">{metric.label}</ThemedText>
        <ThemedText>{formatBrlAmount(metric.amount)}</ThemedText>
      </View>)}
    </View>
    <ThemedText type="smallBold" accessibilityRole="header">Spending by Category</ThemedText>
    {!analytics.spending.length && <ThemedText themeColor="textSecondary">{analytics.transactionCount ? 'No expenses in this period.' : 'No transactions in this period.'}</ThemedText>}
    {analytics.spending.map((category) => <View key={category.categoryId ?? 'no-category'} style={styles.category}
      accessible accessibilityLabel={`${category.name}, ${formatBrlAmount(category.amountMinor)}`}>
      <View style={styles.categoryLabel}>
        <ThemedText type="smallBold" style={styles.categoryName}>{category.name}</ThemedText>
        <ThemedText type="small" style={styles.categoryAmount}>{formatBrlAmount(category.amountMinor)}</ThemedText>
      </View>
      <View accessible={false} importantForAccessibility="no-hide-descendants" style={[styles.barTrack, { backgroundColor: colors.backgroundElement }]}>
        <View style={[styles.bar, { backgroundColor: colors.textSecondary, width: `${spendingBarPercent(category.amountMinor, analytics.expensesMinor)}%` }]} />
      </View>
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: Spacing.three }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  navigation: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, periodLabel: { flex: 1 }, center: { textAlign: 'center' },
  cards: { gap: Spacing.two }, card: { padding: Spacing.three, borderRadius: Spacing.two, gap: Spacing.one },
  category: { gap: Spacing.two }, categoryLabel: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  categoryName: { flexGrow: 1, flexShrink: 1, flexBasis: 140 }, categoryAmount: { flexShrink: 1 },
  barTrack: { height: Spacing.two, borderRadius: Spacing.one, overflow: 'hidden' }, bar: { height: '100%' },
});

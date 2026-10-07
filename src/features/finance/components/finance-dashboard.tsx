import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { FormButton, SegmentedControl } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { spendingBarPercent, type CategorySpending, type FinanceAnalytics } from '../analytics';
import { spendingPreviewLimit, spendingShareLabel, stackFinanceMetrics } from '../dashboard-presentation';
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
    <SegmentedControl label="Period" value={period.kind} options={periodKinds.map((kind) => ({ value: kind, label: periodKindLabels[kind] }))} onChange={onKind} />
    <View style={styles.navigation}>
      <ThemedText type="cardTitle" accessibilityRole="header" style={styles.periodLabel}>{periodLabel(period)}</ThemedText>
      <View style={styles.chevrons}>
        <FormButton variant="quiet" label="‹" accessibilityLabel={`Previous ${period.kind}`} disabled={!canMovePeriod(period, -1, today)} onPress={() => onMove(-1)} />
        <FormButton variant="quiet" label="›" accessibilityLabel={`Next ${period.kind}`} disabled={!canMovePeriod(period, 1, today)} onPress={() => onMove(1)} />
      </View>
    </View>
    {!current && <View style={styles.current}><FormButton variant="quiet" label={`Current ${period.kind}`} onPress={onCurrent} /></View>}
  </View>;
}

export function FinanceDashboard({ analytics, spendingExpanded, onToggleSpending }: {
  analytics: FinanceAnalytics; spendingExpanded: boolean; onToggleSpending: () => void;
}) {
  const { width, fontScale } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  const income = formatBrlAmount(analytics.incomeMinor);
  const expenses = formatBrlAmount(analytics.expensesMinor);
  const stacked = stackFinanceMetrics(measuredWidth ?? Math.min(width - Space.lg * 2, 640), fontScale, [income, expenses]);
  const spending = spendingExpanded ? analytics.spending : analytics.spending.slice(0, spendingPreviewLimit);
  return <View style={styles.dashboard} onLayout={(event) => setMeasuredWidth(event.nativeEvent.layout.width)}>
    <View style={styles.metrics}>
      <Metric label="Net Flow" amount={analytics.netFlowMinor} primary />
      <View testID="finance-secondary-metrics" style={[styles.secondaryMetrics, { flexDirection: stacked ? 'column' : 'row' }]}>
        <Metric label="Income" amount={analytics.incomeMinor} income />
        <Metric label="Expenses" amount={analytics.expensesMinor} />
      </View>
    </View>
    <View style={styles.spending}>
      <ThemedText type="sectionHeading" accessibilityRole="header">Spending</ThemedText>
      {!spending.length && <ThemedText type="secondary" themeColor="textSecondary">{analytics.transactionCount ? 'No expenses in this period.' : 'No transactions in this period.'}</ThemedText>}
      {spending.map((category) => <SpendingRow key={category.categoryId ?? 'no-category'} category={category} expensesMinor={analytics.expensesMinor} />)}
      {analytics.spending.length > spendingPreviewLimit && <View style={styles.current}>
        <FormButton variant="quiet" label={spendingExpanded ? 'Show less' : 'View all'} accessibilityLabel={spendingExpanded ? 'Show fewer spending categories' : `View all ${analytics.spending.length} spending categories`}
          expanded={spendingExpanded} onPress={onToggleSpending} />
      </View>}
    </View>
  </View>;
}

function Metric({ label, amount, primary = false, income = false }: { label: string; amount: bigint; primary?: boolean; income?: boolean }) {
  const formatted = formatBrlAmount(amount);
  const sign = amount < 0n ? 'negative' : amount > 0n ? 'positive' : 'zero';
  return <View style={primary ? styles.primaryMetric : styles.secondaryMetric} accessible accessibilityLabel={`${label}, ${sign}, ${formatted}`}>
    <ThemedText type="secondary" themeColor="textSecondary">{label}</ThemedText>
    <ThemedText type={primary ? 'metric' : 'cardTitle'} themeColor={income ? 'success' : 'textPrimary'} style={styles.amount}>{formatted}</ThemedText>
  </View>;
}

function SpendingRow({ category, expensesMinor }: { category: CategorySpending; expensesMinor: bigint }) {
  const colors = useTheme();
  const share = spendingShareLabel(category.amountMinor, expensesMinor);
  return <View style={styles.category} accessible accessibilityLabel={`${category.name}, ${formatBrlAmount(category.amountMinor)}, ${share === '<1%' ? 'less than 1%' : `approximately ${share}`} of expenses`}>
    <View style={styles.categoryLabel}>
      <ThemedText type="cardTitle" style={styles.categoryName}>{category.name}</ThemedText>
      <ThemedText type="secondary" style={styles.categoryAmount}>{formatBrlAmount(category.amountMinor)}</ThemedText>
    </View>
    <View style={styles.share}>
      <View accessible={false} importantForAccessibility="no-hide-descendants" style={[styles.barTrack, { backgroundColor: colors.surface }]}>
        <View style={[styles.bar, { backgroundColor: colors.accent, width: `${spendingBarPercent(category.amountMinor, expensesMinor)}%`, minWidth: category.amountMinor > 0n ? Space.micro : 0 }]} />
      </View>
      <ThemedText type="metadata" themeColor="textSecondary">{share}</ThemedText>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: Space.sm }, navigation: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.sm },
  periodLabel: { flexGrow: 1, flexShrink: 1, flexBasis: 160 }, chevrons: { flexDirection: 'row' }, current: { alignItems: 'flex-start' },
  dashboard: { gap: Space.xxl }, metrics: { gap: Space.xl }, primaryMetric: { gap: Space.xs },
  secondaryMetrics: { gap: Space.xl }, secondaryMetric: { flex: 1, minWidth: 0, gap: Space.xs }, amount: { flexShrink: 1, fontVariant: ['tabular-nums'] },
  spending: { gap: Space.lg }, category: { gap: Space.sm }, categoryLabel: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  categoryName: { flexGrow: 1, flexShrink: 1, flexBasis: 140 }, categoryAmount: { flexShrink: 1, fontVariant: ['tabular-nums'] },
  share: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  barTrack: { flex: 1, height: Space.xs, borderRadius: Space.micro, overflow: 'hidden' }, bar: { height: '100%' },
});

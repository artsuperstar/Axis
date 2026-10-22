import { useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { FormButton, SegmentedControl } from '@/components/form-controls';
import { UiText, useDesignColors } from '@/components/design-system';
import { Shape } from '@/constants/design-system-v2';

import type { FinanceAnalytics } from '../analytics';
import { expenseSegments } from '../charts';
import { formatBrlAmount } from '../money';
import { overviewColors, summaryArrangement } from '../overview-presentation';
import { canMovePeriod, periodBounds, periodKindLabels, periodKinds, periodLabel, type FinancePeriod, type PeriodKind } from '../periods';
import { CashFlowChart } from './cash-flow-chart';
import { ExpenseDonutChart } from './expense-donut-chart';

export function FinancePeriodControls({ period, today, onKind, onMove, onCurrent }: {
  period: FinancePeriod; today: string; onKind: (kind: PeriodKind) => void; onMove: (direction: -1 | 1) => void; onCurrent: () => void;
}) {
  const current = period.startDate === periodBounds(period.kind, today).startDate;
  return <View style={styles.period}>
    <SegmentedControl appearance="v2" showLabel={false} label="Period" value={period.kind}
      options={periodKinds.map(kind => ({ value: kind, label: periodKindLabels[kind] }))} onChange={onKind} />
    <View style={styles.navigation}>
      <UiText type="cardTitle" accessibilityRole="header" style={styles.periodLabel}>{periodLabel(period)}</UiText>
      <View style={styles.chevrons}>
        <FormButton appearance="v2" compact variant="secondary" label={`Previous ${period.kind}`} icon="chevronLeft" accessibilityLabel={`Previous ${period.kind}`} disabled={!canMovePeriod(period, -1, today)} onPress={() => onMove(-1)} />
        <FormButton appearance="v2" compact variant="secondary" label={`Next ${period.kind}`} icon="forward" accessibilityLabel={`Next ${period.kind}`} disabled={!canMovePeriod(period, 1, today)} onPress={() => onMove(1)} />
      </View>
    </View>
    {!current && <View style={{ alignItems: 'flex-start' }}><FormButton appearance="v2" variant="quiet" label={`Current ${period.kind}`} onPress={onCurrent} /></View>}
  </View>;
}

export function FinanceDashboard({ analytics, spendingExpanded, onToggleSpending }: {
  analytics: FinanceAnalytics; spendingExpanded: boolean; onToggleSpending: () => void;
}) {
  const segments = useMemo(() => expenseSegments(analytics.spending, analytics.expensesMinor), [analytics.spending, analytics.expensesMinor]);
  return <View style={styles.dashboard}>
    <FinancialSummary analytics={analytics} />
    {analytics.cashFlow && <CashFlowChart key={`${analytics.period.kind}:${analytics.period.startDate}`} buckets={analytics.cashFlow}
      periodDescription={periodLabel(analytics.period)} transactionCount={analytics.transactionCount} />}
    <ExpenseDonutChart segments={segments} spending={analytics.spending} expensesMinor={analytics.expensesMinor} transactionCount={analytics.transactionCount}
      expanded={spendingExpanded} onToggle={onToggleSpending} />
  </View>;
}

export function FinancialSummary({ analytics }: { analytics: FinanceAnalytics }) {
  const theme = useDesignColors(); const colors = overviewColors(theme); const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const [measurements, setMeasurements] = useState<{ signature: string; widths: (number | undefined)[] }>({ signature: '', widths: [] });
  const amounts = [analytics.netFlowMinor, analytics.incomeMinor, analytics.expensesMinor];
  const formatted = amounts.map(formatBrlAmount); const labels = ['Net Flow', 'Income', 'Expenses'];
  const signature = `${formatted.join('|')}:${fontScale}`;
  const sizes = measurements.signature === signature ? measurements.widths : [];
  const arrangement = summaryArrangement(width, fontScale, sizes);
  const metric = (index: number) => {
    const amount = amounts[index]; const sign = amount < 0n ? 'negative' : amount > 0n ? 'positive' : 'zero';
    const color = index === 1 ? colors.income : index === 2 || amount < 0n ? colors.expenses : amount > 0n ? colors.income : theme.textPrimary;
    return <View key={labels[index]} accessible accessibilityLabel={`${labels[index]}, ${sign}, ${formatted[index]}`}
      style={[styles.metric, arrangement === 'row' && { flexBasis: Math.max(sizes[index * 2] ?? 0, sizes[index * 2 + 1] ?? 0) + 4 }]}>
      <UiText type="smallLabel" color="textSecondary">{labels[index]}</UiText>
      <UiText type={index === 0 ? 'metric' : 'numeric'} selectable style={[styles.amount, { fontSize: index === 0 ? 20 : 16, lineHeight: index === 0 ? 28 : 24, color }]}>{formatted[index]}</UiText>
    </View>;
  };
  return <View testID="finance-summary" style={[styles.summary, { backgroundColor: theme.group, borderColor: theme.border }]}>
    <View testID="finance-summary-content" onLayout={event => setWidth(event.nativeEvent.layout.width)} style={styles.summaryContent}>
      <View testID="finance-summary-layout" style={{ gap: 16, flexDirection: arrangement === 'row' ? 'row' : 'column' }}>
        {metric(0)}
        <View testID="finance-secondary-metrics" style={[styles.secondary, { flexDirection: arrangement === 'stack' ? 'column' : 'row' }]}>
          {metric(1)}{metric(2)}
        </View>
      </View>
      <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.probes}><View style={{ width: 8192 }}>
        {labels.flatMap((label, index) => [label, formatted[index]].map((value, part) => <UiText key={`${signature}:${index}-${part}`} testID={`finance-metric-probe-${index * 2 + part}`}
          type={part === 0 ? 'smallLabel' : index === 0 ? 'metric' : 'numeric'} style={[styles.probe, part === 1 && { fontSize: index === 0 ? 20 : 16, lineHeight: index === 0 ? 28 : 24 }]}
          onLayout={event => {
            const measured = event.nativeEvent.layout.width;
            setMeasurements(previous => {
              const widths = previous.signature === signature ? [...previous.widths] : [];
              if (widths[index * 2 + part] === measured && previous.signature === signature) return previous;
              widths[index * 2 + part] = measured; return { signature, widths };
            });
          }}>{value}</UiText>))}
      </View></View>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  period: { gap: 8 }, navigation: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }, periodLabel: { flexGrow: 1, flexShrink: 1, flexBasis: 140 }, chevrons: { flexDirection: 'row', gap: 6 },
  dashboard: { gap: 12 }, summary: { borderWidth: 1, borderRadius: Shape.group, padding: 12 }, summaryContent: { minWidth: 0 },
  metric: { flexGrow: 1, flexShrink: 1, minWidth: 0, gap: 4 }, secondary: { flexGrow: 1, flexShrink: 1, gap: 16 }, amount: { flexShrink: 1, fontVariant: ['tabular-nums'] },
  probes: { position: 'absolute', top: 0, left: 0, width: 0, height: 0, opacity: 0, overflow: 'hidden' }, probe: { alignSelf: 'flex-start', flexShrink: 0 },
});

import { Image } from 'expo-image';
import { memo, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { UiPressable, UiText, useDesignColors } from '@/components/design-system';
import { Shape } from '@/constants/design-system-v2';

import { cashFlowSource } from '../chart-presentation';
import { bucketDescription, cashFlowMaximum, chartLabelStride, type CashFlowBucket } from '../charts';
import { formatBrlAmount } from '../money';
import { cashFlowAxisLabel, cashFlowLayout, cashFlowTickLayout, overviewColors } from '../overview-presentation';

export const CashFlowChart = memo(function CashFlowChart({ buckets, periodDescription, transactionCount }: {
  buckets: readonly CashFlowBucket[]; periodDescription: string; transactionCount: number;
}) {
  const theme = useDesignColors();
  const { width, fontScale } = useWindowDimensions();
  const [plotWidth, setPlotWidth] = useState(Math.max(1, width - 92));
  const [selectedId, setSelectedId] = useState(buckets[0]?.id);
  const selected = buckets.find(bucket => bucket.id === selectedId) ?? buckets[0];
  const colors = useMemo(() => overviewColors(theme), [theme]);
  const layout = useMemo(() => cashFlowLayout(buckets.length), [buckets.length]);
  const source = useMemo(() => cashFlowSource(buckets, colors, selected?.id ?? ''), [buckets, colors, selected?.id]);
  const maximum = cashFlowMaximum(buckets);
  const ticks = [4, 3, 2, 1, 0].map(index => cashFlowAxisLabel(maximum * BigInt(index) / 4n));
  const axisWidth = Math.max(30, Math.max(...ticks.map(tick => tick.length)) * 6.5 * fontScale + 6);
  const stride = chartLabelStride(plotWidth, fontScale, buckets.length);
  const tickLayout = cashFlowTickLayout(buckets.length, stride, buckets.findIndex(bucket => bucket.id === selected?.id));
  return <View testID="finance-cash-flow" style={[styles.section, { backgroundColor: theme.group, borderColor: theme.border }]}>
    <View style={styles.heading}>
      <UiText type="sectionHeading" accessibilityRole="header">Cash Flow</UiText>
      <View style={styles.legend}><SeriesLabel label="Income" color={colors.income} /><SeriesLabel label="Expenses" color={colors.expenses} /></View>
    </View>
    <View accessible accessibilityLabel={`Cash Flow, ${periodDescription}, BRL. Income left, Expenses right. Scale zero to ${formatBrlAmount(maximum)}.`}>
      <UiText type="smallLabel" color="textMuted">BRL</UiText>
    </View>
    {!transactionCount && <UiText type="secondary" color="textSecondary">No transactions in this period.</UiText>}
    <View style={styles.graph}>
      <View testID="cash-flow-axis" style={[styles.axis, { width: axisWidth, height: layout.height }]} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {ticks.map((label, index) => <UiText key={index} type="smallLabel" color="textMuted" style={styles.axisText}>{label}</UiText>)}
      </View>
      <View testID="cash-flow-plot" style={styles.plot} onLayout={event => setPlotWidth(event.nativeEvent.layout.width)}>
        <Image testID="cash-flow-svg" source={source} style={[styles.image, { height: layout.height }]} contentFit="fill" transition={0}
          accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
        <View testID="cash-flow-targets" style={styles.targets}>
          {buckets.map((bucket, index) => {
            const active = selected?.id === bucket.id;
            const { visible, span } = tickLayout[index];
            return <UiPressable key={bucket.id} testID={`cash-flow-bucket-${bucket.id}`} accessibilityRole="button"
              accessibilityLabel={`${bucketDescription(bucket)}, Income ${formatBrlAmount(bucket.incomeMinor)}, Expenses ${formatBrlAmount(bucket.expensesMinor)}`}
              accessibilityState={{ selected: active }} accessibilityHint="Select this interval to inspect exact values."
              onPress={() => setSelectedId(bucket.id)} style={[styles.target, { width: `${layout.columns[index].width / layout.width * 100}%` }]}>
              <View pointerEvents="none" style={{ height: layout.height }} />
              <View pointerEvents="none" style={[styles.tick, { width: `${span * 100}%`, backgroundColor: active ? theme.selected : 'transparent', borderBottomColor: active ? theme.brand : 'transparent' }]}>
                {visible && <UiText type="smallLabel" color={active ? 'textPrimary' : 'textSecondary'} style={{ textAlign: 'center', minWidth: 0, maxWidth: '100%', flexShrink: 1 }}>{bucket.label}</UiText>}
              </View>
            </UiPressable>;
          })}
        </View>
      </View>
    </View>
    {selected && <View testID="cash-flow-inspection" style={[styles.detail, { borderColor: theme.border }]}>
      <UiText testID="cash-flow-inspection-date" type="cardTitle" selectable style={styles.date}>{bucketDescription(selected)}</UiText>
      <View testID="cash-flow-inspection-values" style={styles.detailValues}>
        <Detail label="Income" amount={selected.incomeMinor} color={colors.income} basis={100 * fontScale} />
        <Detail label="Expenses" amount={selected.expensesMinor} color={colors.expenses} basis={100 * fontScale} />
      </View>
    </View>}
  </View>;
});

function SeriesLabel({ label, color }: { label: string; color: string }) {
  return <View style={styles.series}><View accessible={false} style={[styles.dot, { backgroundColor: color }]} /><UiText type="smallLabel" color="textSecondary">{label}</UiText></View>;
}
function Detail({ label, amount, color, basis }: { label: string; amount: bigint; color: string; basis: number }) {
  return <View testID={`cash-flow-inspection-${label.toLowerCase()}`} style={[styles.detailValue, { flexBasis: basis }]}>
    <SeriesLabel label={label} color={color} /><UiText type="numeric" selectable style={styles.detailAmount}>{formatBrlAmount(amount)}</UiText>
  </View>;
}
const styles = StyleSheet.create({
  section: { gap: 12, borderWidth: 1, borderRadius: Shape.group, padding: 12 },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, series: { flexDirection: 'row', alignItems: 'center', gap: 6 }, dot: { width: 8, height: 8, borderRadius: 4 },
  graph: { flexDirection: 'row', alignItems: 'flex-start' }, axis: { justifyContent: 'space-between', paddingRight: 6 }, axisText: { textAlign: 'right' },
  plot: { flex: 1, minWidth: 0 }, image: { position: 'absolute', top: 0, left: 0, width: '100%' }, targets: { flexDirection: 'row', alignItems: 'stretch' },
  target: { alignItems: 'center', minHeight: 48 }, tick: { minHeight: 28, paddingVertical: 4, alignItems: 'center', borderRadius: 6, borderBottomWidth: 2 },
  detail: { borderWidth: 1, borderRadius: Shape.control, padding: 12, flexDirection: 'column', alignItems: 'stretch', gap: 12 },
  date: { width: '100%', minWidth: 0 },
  detailValues: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  detailValue: { gap: 4, flexGrow: 1, flexShrink: 1, minWidth: 0, maxWidth: '100%' },
  detailAmount: { minWidth: 0, maxWidth: '100%', flexShrink: 1 },
});

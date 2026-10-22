import { Image } from 'expo-image';
import { memo, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { FormButton } from '@/components/form-controls';
import { UiText, useDesignColors } from '@/components/design-system';
import { Shape } from '@/constants/design-system-v2';

import type { CategorySpending } from '../analytics';
import { expenseDonutSource } from '../chart-presentation';
import type { ExpenseSegment } from '../charts';
import { spendingShareLabel } from '../dashboard-presentation';
import { formatBrlAmount } from '../money';
import { overviewColors } from '../overview-presentation';
import { spendingDonutDiameter, spendingIntroInline, spendingRowInline } from '../spending-layout';

/** One owned Spending section. Expansion replaces compact rows; geometry stays grouped. */
export const ExpenseDonutChart = memo(function ExpenseDonutChart({ segments, spending, expensesMinor, transactionCount, expanded, onToggle }: {
  segments: readonly ExpenseSegment[]; spending: readonly CategorySpending[]; expensesMinor: bigint; transactionCount: number;
  expanded: boolean; onToggle: () => void;
}) {
  const theme = useDesignColors(); const { width, fontScale } = useWindowDimensions();
  const [contentWidth, setContentWidth] = useState(width - 58);
  const [totalMeasurement, setTotalMeasurement] = useState<{ key: string; width: number } | null>(null);
  const colors = useMemo(() => overviewColors(theme), [theme]);
  const source = useMemo(() => expenseDonutSource(segments, expensesMinor, colors), [segments, expensesMinor, colors]);
  const diameter = spendingDonutDiameter(contentWidth);
  const formatted = formatBrlAmount(expensesMinor);
  const totalKey = `${formatted}:${fontScale}`;
  const introInline = spendingIntroInline(contentWidth, diameter, totalMeasurement?.key === totalKey ? totalMeasurement.width : undefined);
  const rows = useMemo(() => expanded ? spending.map(category => ({
    id: category.categoryId === null ? 'category:null' : `category:${category.categoryId}`, label: category.name, amountMinor: category.amountMinor,
    colorIndex: segments.find(segment => segment.id === (category.categoryId === null ? 'category:null' : `category:${category.categoryId}`))?.colorIndex ?? 5,
  })) : segments, [expanded, spending, segments]);
  const total = <View accessible accessibilityLabel={`Total expenses, ${formatted}`} style={[styles.total, introInline ? styles.totalInline : styles.fullWidth]}>
    <UiText type="smallLabel" color="textSecondary">Total Expenses</UiText>
    <UiText type="numeric" selectable style={styles.amount}>{formatted}</UiText>
  </View>;
  return <View testID="finance-expense-donut" style={[styles.section, { backgroundColor: theme.group, borderColor: theme.border }]}>
    <UiText type="sectionHeading" accessibilityRole="header">Spending</UiText>
    {!segments.length ? <UiText type="secondary" color="textSecondary">{transactionCount ? 'No expenses in this period.' : 'No transactions in this period.'}</UiText> : <>
      <View testID="finance-spending-layout" style={styles.content} onLayout={event => setContentWidth(event.nativeEvent.layout.width)}>
        <View testID="finance-spending-intro" style={[styles.intro, { flexDirection: introInline ? 'row' : 'column', alignItems: introInline ? 'center' : 'flex-start' }]}>
          <View style={{ width: diameter, height: diameter, flexShrink: 0 }}>
            <Image testID="expense-donut-svg" source={source} contentFit="contain" transition={0} style={styles.image}
              accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
          </View>
          {total}
        </View>
        <View testID="finance-spending-breakdown" style={[styles.breakdown, { borderTopColor: theme.border }]}>
          {rows.map(category => <SpendingCategoryRow key={category.id} category={category} expensesMinor={expensesMinor}
            color={colors.categories[category.colorIndex]} width={contentWidth} fontScale={fontScale} />)}
        </View>
        <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.probes}>
          <View style={styles.probeContainer}><UiText key={totalKey} testID="spending-total-probe" type="numeric" style={styles.probe}
            onLayout={event => { const measured = event.nativeEvent.layout.width; setTotalMeasurement(previous => previous?.key === totalKey && previous.width === measured ? previous : { key: totalKey, width: measured }); }}>{formatted}</UiText></View>
        </View>
      </View>
      {expanded && segments.some(segment => segment.id === 'other') && <UiText type="smallLabel" color="textSecondary">The donut groups the remaining categories as Other. Every category is listed individually above.</UiText>}
      {spending.length > 5 && <View style={[styles.disclosure, { borderTopColor: theme.border }]}>
        <FormButton appearance="v2" variant="quiet" label={expanded ? 'Show less' : 'View all categories'} align="start"
          accessibilityLabel={expanded ? 'Show fewer spending categories' : `View all ${spending.length} spending categories`}
          expanded={expanded} trailingIcon={expanded ? 'chevronUp' : 'chevron'} onPress={onToggle} />
      </View>}
    </>}
  </View>;
});

const SpendingCategoryRow = memo(function SpendingCategoryRow({ category, expensesMinor, color, width, fontScale }: {
  category: { id: string; label: string; amountMinor: bigint }; expensesMinor: bigint; color: string; width: number; fontScale: number;
}) {
  const amount = formatBrlAmount(category.amountMinor); const share = spendingShareLabel(category.amountMinor, expensesMinor);
  const key = `${category.label}:${amount}:${fontScale}`;
  const [measurements, setMeasurements] = useState<{ key: string; widths: (number | undefined)[] }>({ key: '', widths: [] });
  const measured = measurements.key === key ? measurements.widths : [];
  const inline = spendingRowInline(width, fontScale, measured[0], measured[1]);
  return <View testID={`spending-row-${category.id}`} style={[styles.row, { flexDirection: inline ? 'row' : 'column' }]} accessible
    accessibilityLabel={`${category.label}, ${amount}, ${share === '<1%' ? 'less than 1%' : `approximately ${share}`} of expenses`}>
    <View style={[styles.name, inline ? styles.nameInline : styles.fullWidth]}><View accessible={false} style={[styles.swatch, { backgroundColor: color }]} />
      <UiText type="secondary" style={styles.nameText}>{category.label}</UiText></View>
    <View testID={`spending-values-${category.id}`} style={[styles.numbers, inline ? { width: Math.ceil(measured[1] ?? 0) + 2 } : styles.fullWidth]}>
      <UiText type="secondary" selectable style={[styles.amount, styles.valueText]}>{amount}</UiText>
      <UiText type="smallLabel" color="textSecondary" style={[styles.percent, styles.valueText]}>{share}</UiText>
    </View>
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.probes}>
      <View style={styles.probeContainer}>{[category.label, amount].map((value, index) => <UiText key={`${key}:${index}`} testID={`spending-probe-${category.id}-${index}`}
        type="secondary" style={[index === 1 && styles.amount, styles.probe]} onLayout={event => {
          const next = event.nativeEvent.layout.width;
          setMeasurements(previous => { const widths = previous.key === key ? [...previous.widths] : [];
            if (previous.key === key && widths[index] === next) return previous;
            widths[index] = next; return { key, widths }; });
        }}>{value}</UiText>)}</View>
    </View>
  </View>;
});
const styles = StyleSheet.create({
  section: { gap: 16, borderWidth: 1, borderRadius: Shape.group, padding: 12 },
  content: { gap: 16, width: '100%', minWidth: 0 }, intro: { gap: 16, width: '100%', minWidth: 0 },
  image: { width: '100%', height: '100%' }, total: { gap: 4, minWidth: 0, maxWidth: '100%' }, totalInline: { flex: 1 },
  breakdown: { gap: 12, minWidth: 0, width: '100%', borderTopWidth: 1, paddingTop: 16 },
  row: { minWidth: 0, maxWidth: '100%', width: '100%', gap: 8, alignItems: 'flex-start' },
  name: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', minWidth: 0 }, nameInline: { flex: 1 }, nameText: { flex: 1, minWidth: 0, flexShrink: 1 },
  swatch: { width: 10, height: 10, borderRadius: 5, marginTop: 5, flexShrink: 0 },
  numbers: { minWidth: 0, maxWidth: '100%', flexShrink: 1, alignItems: 'flex-end', gap: 2 },
  amount: { fontVariant: ['tabular-nums'], flexShrink: 1, minWidth: 0, maxWidth: '100%' }, valueText: { textAlign: 'right', maxWidth: '100%' },
  fullWidth: { width: '100%' }, percent: { fontVariant: ['tabular-nums'], minWidth: 0, flexShrink: 1 }, disclosure: { borderTopWidth: 1, paddingTop: 4 },
  probes: { position: 'absolute', top: 0, left: 0, width: 0, height: 0, opacity: 0, overflow: 'hidden' },
  probeContainer: { width: 8192 }, probe: { alignSelf: 'flex-start', flexShrink: 0 },
});

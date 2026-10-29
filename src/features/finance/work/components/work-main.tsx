import { useState } from 'react';
import { SectionList, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { ContextMenu } from '@/components/context-menu';
import { GroupSurface, UiIcon, UiPressable, UiText, useDesignColors } from '@/components/design-system';
import { FormButton, FormError } from '@/components/form-controls';
import { Shape, TouchTarget } from '@/constants/design-system-v2';
import { useTheme } from '@/hooks/use-theme';
import { dateLabel } from '@/utils/calendar';

import { stackFinanceMetrics } from '../../dashboard-presentation';
import { formatBrlAmount } from '../../money';
import { groupWorkItems, jobTitle } from '../presentation';
import type { WorkItem, WorkOverview, WorkTotals } from '../types';

type Props = {
  data: WorkOverview; error: string | null;
  onAdd: () => void; onPayment: () => void; onOpen: (item: WorkItem) => void;
  onClients: () => void; onHistory: () => void;
  scrollOffset?: number; onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
};
type WorkSection = { key: string; title: string; attention: boolean; data: WorkItem[] };

/** Main Work owns one variable-height scroll; editors and source calculations stay with WorkView. */
export function WorkMainList({ data, error, onAdd, onPayment, onOpen, onClients, onHistory, scrollOffset = 0, onScroll }: Props) {
  const { overdue, outstanding } = groupWorkItems(data.items);
  const sections: WorkSection[] = [
    ...(overdue.length ? [{ key: 'attention', title: `Needs attention (${overdue.length})`, attention: true, data: overdue }] : []),
    { key: 'jobs', title: 'Jobs', attention: false, data: outstanding },
  ];
  return <SectionList<WorkItem, WorkSection> testID="work-main-list" style={styles.list} sections={sections}
    keyExtractor={item => item.entry.id} initialNumToRender={6} maxToRenderPerBatch={6} windowSize={5}
    stickySectionHeadersEnabled={false} removeClippedSubviews={false}
    contentInsetAdjustmentBehavior="never" contentContainerStyle={styles.listContent}
    contentOffset={{ x: 0, y: scrollOffset }} onScroll={onScroll} scrollEventThrottle={16}
    keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
    ListHeaderComponent={<View style={styles.header}>
      <WorkFinancialSummary totals={data.totals} onAdd={onAdd} onPayment={onPayment} onClients={onClients} onHistory={onHistory} />
      <FormError appearance="v2" message={error} />
      {!data.items.length && !data.settledCount && <UiText type="secondary" color="textSecondary">No work yet. Add Hourly or Fixed work, then record payments when money arrives.</UiText>}
    </View>}
    renderSectionHeader={({ section }) => <View testID={section.attention ? 'work-attention' : 'work-jobs'} style={styles.sectionHeader}>
      <UiText type="editorSection" accessibilityRole="header" color={section.attention ? 'attention' : 'textPrimary'}>{section.title}</UiText>
    </View>}
    renderSectionFooter={({ section }) => section.key === 'jobs' && !section.data.length ? <>
      {!!overdue.length && <UiText type="secondary" color="textSecondary">All open jobs need attention above.</UiText>}
      {!!(data.items.length + data.settledCount) && !data.items.length && <UiText type="secondary" color="textSecondary">Nothing outstanding. Open History to review settled jobs and receipts.</UiText>}
    </> : null}
    ItemSeparatorComponent={WorkSeparator}
    renderItem={({ item }) => <WorkMainCard item={item} onPress={() => onOpen(item)} />} />;
}

function WorkSeparator() { return <View style={styles.separator} />; }

export function WorkFinancialSummary({ totals, onAdd, onPayment, onClients, onHistory }: {
  totals: WorkTotals; onAdd: () => void; onPayment: () => void; onClients: () => void; onHistory: () => void;
}) {
  const colors = useDesignColors(), semantic = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  const availableWidth = measuredWidth ?? Math.min(width, 640) - 58;
  const amount = formatBrlAmount(totals.outstandingMinor);
  const stackPrimary = availableWidth < 300 || fontScale >= 1.4 || amount.length > 17;
  const stackSecondary = stackFinanceMetrics(availableWidth, fontScale,
    [formatBrlAmount(totals.earnedMinor), formatBrlAmount(totals.receivedMinor)]);
  const hasOutstanding = totals.outstandingMinor > 0n;
  const primaryAmount = <UiText type="metric" style={styles.primaryAmount}>{amount}</UiText>;
  function metric(label: string, value: bigint, icon: 'up' | 'down') {
    const tile = <View style={[styles.smallTile, { backgroundColor: semantic.accentMuted }]}><UiIcon name={icon} color={semantic.accent} size={18} /></View>;
    return <View testID={`work-metric-${label.toLowerCase()}`} accessible accessibilityLabel={`${label}, ${formatBrlAmount(value)}`} style={[styles.metric, stackSecondary && styles.metricStack]}>
      {stackSecondary ? <>
        <View style={styles.metricLabel}>{tile}<UiText type="metadata" color="textSecondary">{label}</UiText></View>
        <UiText type="cardTitle" style={styles.amount}>{formatBrlAmount(value)}</UiText>
      </> : <>{tile}<View style={styles.metricCopy}><UiText type="metadata" color="textSecondary">{label}</UiText><UiText type="cardTitle" style={styles.amount}>{formatBrlAmount(value)}</UiText></View></>}
    </View>;
  }
  return <GroupSurface testID="work-financial-summary" onLayout={event => setMeasuredWidth(event.nativeEvent.layout.width - 26)} style={[styles.summary, { borderColor: colors.border }]}>
    <View style={styles.summaryTop}>
      <View testID="work-metric-outstanding" accessible accessibilityLabel={`Outstanding, ${amount}`} style={styles.primaryMetric}>
        <View style={[styles.primaryIdentity, stackPrimary && styles.reserveOptions]}>
          {fontScale < 1.4 && <View style={[styles.summaryTile, { backgroundColor: semantic.accentMuted }]}><UiIcon name="briefcase" color={semantic.accent} size={26} /></View>}
          <View style={styles.metricCopy}><UiText type="metadata" color="textSecondary">Outstanding</UiText>{!stackPrimary && primaryAmount}</View>
        </View>
        {stackPrimary && primaryAmount}
      </View>
      <View style={stackPrimary && styles.optionsCorner}><ContextMenu appearance="v2" label="Work options" actions={[{ label: 'Clients', onPress: onClients }, { label: 'History', onPress: onHistory }]} /></View>
    </View>
    <View style={[styles.divider, { backgroundColor: colors.border }]} />
    <View testID="work-secondary-metrics" style={[styles.comparison, stackSecondary && styles.stacked]}>
      {metric('Earned', totals.earnedMinor, 'up')}{metric('Received', totals.receivedMinor, 'down')}
    </View>
    <UiText type="metadata" color="textSecondary">All work, independent of the Overview period. Earned becomes Finance Income only when received.</UiText>
    <View style={[styles.actions, fontScale >= 1.4 && styles.stacked]}>
      <View style={[styles.addAction, fontScale >= 1.4 && styles.full]}><FormButton appearance="v2" leadingIcon="plus" variant={hasOutstanding ? 'secondary' : 'primary'} label="Add work" onPress={onAdd} /></View>
      {hasOutstanding && <View style={[styles.paymentAction, fontScale >= 1.4 && styles.full]}><FormButton appearance="v2" leadingIcon="creditCard" variant="primary" label="Record payment" onPress={onPayment} /></View>}
    </View>
  </GroupSurface>;
}

/** Source-owned facts only. A Briefcase identifies Work regardless of title or client. */
export function WorkMainCard({ item, onPress }: { item: WorkItem; onPress: () => void }) {
  const colors = useDesignColors(), semantic = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const { entry, counterparty } = item;
  const title = jobTitle(entry), amount = formatBrlAmount(item.outstandingMinor);
  const state = item.overdue ? 'Overdue' : item.outstandingMinor === 0 ? 'Paid' : item.receivedMinor > 0 ? 'Partially paid' : 'Outstanding';
  const stacked = width < 360 || fontScale >= 1.4 || amount.length > 16 || title.length > 45 || counterparty.name.length > 35;
  const description = entry.description.trim();
  return <UiPressable testID="work-entry" accessible accessibilityRole="button" onPress={onPress}
    accessibilityLabel={`${title}, ${counterparty.name}, earned ${formatBrlAmount(item.earnedMinor)}, outstanding ${amount}, ${state}${entry.expectedPaymentDate ? `, expected ${dateLabel(entry.expectedPaymentDate)}` : ''}, work ${dateLabel(entry.workDate)}, received ${formatBrlAmount(item.receivedMinor)}`}
    accessibilityHint="Job details and payments"
    style={[styles.card, { backgroundColor: colors.group, borderColor: colors.border }]}>
    <View style={[styles.cardContent, stacked && styles.stacked]}>
      <View style={[styles.identity, stacked && styles.full]}>
        <View style={[styles.cardTile, { backgroundColor: semantic.accentMuted }]}><UiIcon name="briefcase" color={semantic.accent} size={24} /></View>
        <View style={styles.cardCopy}>
          <UiText testID="job-title" type="cardTitle">{title}</UiText>
          <UiText testID="job-client" type="secondary" color="textSecondary">{counterparty.name}{counterparty.deletedAt !== null ? ' · Archived client' : ''}</UiText>
          {!!description && description !== title && <UiText testID="job-description" type="metadata" color="textSecondary" numberOfLines={2}>{description}</UiText>}
          <UiText type="metadata" color="textSecondary">Work {dateLabel(entry.workDate)}</UiText>
          {item.receivedMinor > 0 && item.outstandingMinor > 0 && <UiText type="metadata" color="textSecondary">Received {formatBrlAmount(item.receivedMinor)} of {formatBrlAmount(item.earnedMinor)}</UiText>}
          <UiText type="metadata" color={item.overdue ? 'attention' : 'textSecondary'}>{state}{entry.expectedPaymentDate ? ` · Expected ${dateLabel(entry.expectedPaymentDate)}` : ''}</UiText>
        </View>
      </View>
      <View testID="work-card-balance" style={[styles.trailing, stacked && styles.totalBelow]}>
        <View style={styles.balanceCopy}><UiText type="cardTitle" style={[styles.amount, styles.balanceAmount]}>{amount}</UiText><UiText type="metadata" color="textSecondary">outstanding</UiText></View>
        <UiIcon name="forward" color={colors.textSecondary} size={20} />
      </View>
    </View>
  </UiPressable>;
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listContent: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 16, paddingTop: 8, paddingBottom: 32, flexGrow: 1 },
  header: { gap: 12 }, sectionHeader: { paddingTop: 20, paddingBottom: 12 }, separator: { height: 8 },
  summary: { borderWidth: 1, padding: 12, gap: 16 },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  primaryMetric: { flex: 1, minWidth: 0, gap: 8 }, primaryIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reserveOptions: { paddingRight: 56, minHeight: TouchTarget }, optionsCorner: { position: 'absolute', top: 0, right: 0 },
  summaryTile: { width: 44, height: 48, borderRadius: Shape.control, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  primaryAmount: { minWidth: 0, maxWidth: '100%', flexShrink: 1, fontVariant: ['tabular-nums'] },
  divider: { height: 1 }, comparison: { flexDirection: 'row', alignItems: 'stretch', gap: 16 },
  metric: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  metricStack: { flexDirection: 'column', alignItems: 'stretch', flexGrow: 0, flexShrink: 0, flexBasis: 'auto' }, metricLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metricCopy: { flex: 1, minWidth: 0, gap: 4 }, smallTile: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  amount: { minWidth: 0, maxWidth: '100%', flexShrink: 1, fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'stretch' },
  addAction: { flexGrow: 1, flexShrink: 1, flexBasis: 120, maxWidth: '100%' },
  paymentAction: { flexGrow: 1, flexShrink: 1, flexBasis: 164, maxWidth: '100%' },
  card: { borderWidth: 1, borderRadius: Shape.group, padding: 12, minHeight: TouchTarget },
  cardContent: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 8 },
  identity: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flexBasis: 180, flexGrow: 1, flexShrink: 1, maxWidth: '100%' },
  cardTile: { width: 40, height: 44, borderRadius: Shape.control, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  cardCopy: { flex: 1, minWidth: 0, gap: 4 },
  trailing: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexShrink: 1, maxWidth: '100%', marginLeft: 'auto' },
  balanceCopy: { flexShrink: 1, minWidth: 0, alignItems: 'flex-end', maxWidth: '100%' },
  balanceAmount: { textAlign: 'right' },
  stacked: { flexDirection: 'column', flexWrap: 'nowrap' },
  full: { width: '100%', flexBasis: 'auto', flexGrow: 0, flexShrink: 0 },
  totalBelow: { width: '100%', marginLeft: 0 },
});

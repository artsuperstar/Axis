import { useCallback, useMemo, type Ref } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions, type ScrollViewInstance, type ScrollViewProps } from 'react-native';

import { AdaptiveSheet, useSheetScrollProps } from '@/components/adaptive-sheet';
import { BackButton } from '@/components/back-button';
import { ContextMenu } from '@/components/context-menu';
import { DesignProvider, UiIcon, UiPressable, UiText, useDesignColors } from '@/components/design-system';
import { FormButton, FormError } from '@/components/form-controls';
import { FormScrollView } from '@/components/form-selection-host';
import { DesignSpace as Space, DesignTypography, Shape, TouchTarget } from '@/constants/design-system-v2';
import { dateLabel } from '@/utils/calendar';

import { stackFinanceMetrics } from '../../dashboard-presentation';
import { formatBrlAmount } from '../../money';
import { jobTitle } from '../presentation';
import type { WorkCounterparty, WorkItem, WorkTotals } from '../types';

type Props = {
  client?: WorkCounterparty; totals?: WorkTotals; items: WorkItem[]; error: string | null;
  onDismiss: () => void; onPayment: () => void; onAdd: () => void; onHistory: () => void;
  onArchive: () => void; onOpenJob: (item: WorkItem) => void;
};

/** Client presentation only: balances, eligibility and navigation remain owned by WorkView. */
export function WorkClientDetails(props: Props) {
  const colors = useDesignColors();
  const { fontScale } = useWindowDimensions();
  const scrollIdentity = fontScale >= 1.4 || (props.client?.name.length ?? 0) > 50;
  const identity = <UiText testID="client-details-name" type="editorTitle" accessibilityRole="header" style={styles.copy}>{props.client?.name ?? 'Client details'}</UiText>;
  const header = <View style={styles.header}>
    <BackButton appearance="v2" iconOnly onPress={props.onDismiss} />
    {fontScale < 1.4 && <View style={[styles.identityIcon, { backgroundColor: colors.brandSoft }]}><UiIcon name="person" size={22} color={colors.brand} /></View>}
    {!scrollIdentity && identity}
  </View>;
  return <DesignProvider><AdaptiveSheet title={props.client?.name ?? 'Client details'} appearance="v2" header={header} onDismiss={props.onDismiss}
    scrollBody={<ClientJobs {...props} scrollIdentity={scrollIdentity} />} /></DesignProvider>;
}

/** Virtualized jobs share the existing sheet's focus, measurement and scroll owner. */
function ClientScrollView({ sheetRef, ref, ...props }: ScrollViewProps & { sheetRef: Ref<ScrollViewInstance>; ref?: Ref<ScrollViewInstance> }) {
  const attach = useCallback((node: ScrollViewInstance | null) => {
    for (const target of [sheetRef, ref]) {
      if (typeof target === 'function') target(node);
      else if (target) target.current = node;
    }
  }, [sheetRef, ref]);
  return <FormScrollView {...props} ref={attach} />;
}

function ClientJobs(props: Props & { scrollIdentity: boolean }) {
  const colors = useDesignColors();
  const { ref: sheetRef, ...scrollProps } = useSheetScrollProps();
  // Stable overdue-first order, as in the incumbent Client Details. No row-level reads.
  const jobs = useMemo(() => [...props.items].sort((a, b) => Number(b.overdue) - Number(a.overdue)), [props.items]);
  return <FlatList<WorkItem> {...scrollProps} testID="work-client-details-list" data={props.client ? jobs : []}
    keyExtractor={item => item.entry.id} initialNumToRender={6} maxToRenderPerBatch={6} windowSize={5} removeClippedSubviews={false}
    renderScrollComponent={bodyProps => <ClientScrollView {...bodyProps} sheetRef={sheetRef} />} contentContainerStyle={styles.content}
    ListHeaderComponent={<View style={styles.before}>
      {props.scrollIdentity && <UiText testID="client-details-name" type="editorTitle" accessibilityRole="header">{props.client?.name ?? 'Client details'}</UiText>}
      <FormError appearance="v2" message={props.error} />
      {props.client ? <>
        {props.client.deletedAt !== null && <UiText testID="client-archived" type="secondary" color="textSecondary">Archived client · existing money owed remains actionable.</UiText>}
        <ClientOverview totals={props.totals ?? { outstandingMinor: 0n, earnedMinor: 0n, receivedMinor: 0n }} />
        <ClientActions {...props} />
        <View style={[styles.sectionHeading, { borderColor: colors.border }]}><UiText type="editorSection" accessibilityRole="header">Open jobs</UiText></View>
      </> : <UiText type="secondary" color="textSecondary">This client is no longer available.</UiText>}
    </View>}
    renderItem={({ item }) => <ClientJob item={item} onPress={() => props.onOpenJob(item)} />}
    ListEmptyComponent={props.client ? <UiText testID="client-jobs-empty" type="secondary" color="textSecondary">No open work. History keeps settled entries and receipts.</UiText> : undefined}
    ListFooterComponent={props.client ? <UiPressable testID="client-history-navigation" accessibilityRole="button" accessibilityLabel={`History for ${props.client.name}`}
      accessibilityHint="Settled jobs and recorded receipts" onPress={props.onHistory} style={[styles.history, { backgroundColor: colors.group, borderColor: colors.border }]}>
      <UiIcon name="receipt" size={22} color={colors.brand} /><UiText type="cardTitle" style={styles.copy}>View history</UiText><UiIcon name="forward" size={20} color={colors.textSecondary} />
    </UiPressable> : undefined} />;
}

/** Break only between BRL digit groups for extreme totals; preserve every centavo. */
function ClientMoney({ value, primary = false }: { value: string; primary?: boolean }) {
  const type = primary ? 'editorTitle' : 'cardTitle';
  const style = [styles.money, primary && DesignTypography.metric];
  if (value.length <= 17) return <UiText type={type} style={style} selectable>{value}</UiText>;
  const parts = value.match(/^R\$\s|\d+\.|\d+,\d{2}$/g) ?? [value];
  return <View testID="client-detail-money-long" accessible accessibilityLabel={value} style={styles.moneyGroups}>
    {parts.map((part, index) => <UiText key={index} testID="client-detail-money-group" type={type} accessible={false} style={[style, styles.moneyGroup]}>{part}</UiText>)}
  </View>;
}

function ClientOverview({ totals }: { totals: WorkTotals }) {
  const colors = useDesignColors();
  const { width, fontScale } = useWindowDimensions();
  const values = [totals.outstandingMinor, totals.earnedMinor, totals.receivedMinor].map(formatBrlAmount);
  const stack = stackFinanceMetrics(Math.min(width, 680) - Space.lg * 2, fontScale, values.slice(1));
  function metric(label: string, value: string, primary = false) {
    return <View testID={`client-detail-metric-${label.toLowerCase()}`} accessible accessibilityLabel={`${label}, ${value}`} style={styles.metric}>
      <UiText type="metadata" color="textSecondary">{label}</UiText><ClientMoney value={value} primary={primary} />
    </View>;
  }
  return <View testID="client-financial-overview" style={[styles.overview, { borderColor: colors.border }]}>
    {metric('Outstanding', values[0], true)}
    <View testID="client-secondary-metrics" style={[styles.metrics, stack && styles.stacked]}>
      {metric('Earned', values[1])}
      <View testID="client-metric-divider" style={stack ? { height: 1, backgroundColor: colors.border } : { width: 1, backgroundColor: colors.border }} />
      {metric('Received', values[2])}
    </View>
  </View>;
}

function ClientActions(props: Props) {
  const { width, fontScale } = useWindowDimensions();
  const stack = width < 390 || fontScale >= 1.3;
  return <View testID="client-detail-actions" style={[styles.actions, stack && styles.stacked]}>
    {!!props.items.length && <View style={styles.action}><FormButton appearance="v2" variant="primary" label="Record payment" accessibilityLabel={`Record payment from ${props.client!.name}`} onPress={props.onPayment} /></View>}
    <View style={styles.secondaryActions}>
      {props.client!.deletedAt === null && <View style={styles.action}><FormButton appearance="v2" variant="secondary" label="Add work" accessibilityLabel={`Add work for ${props.client!.name}`} onPress={props.onAdd} /></View>}
      <ContextMenu appearance="v2" label={`Client options for ${props.client!.name}`} actions={[
        { label: 'History', accessibilityLabel: `History for ${props.client!.name}`, onPress: props.onHistory },
        ...(props.client!.deletedAt === null ? [{ label: 'Archive', accessibilityLabel: `Archive ${props.client!.name}`, onPress: props.onArchive }] : []),
      ]} />
    </View>
  </View>;
}

function ClientJob({ item, onPress }: { item: WorkItem; onPress: () => void }) {
  const colors = useDesignColors();
  const { width, fontScale } = useWindowDimensions();
  const title = jobTitle(item.entry), amount = formatBrlAmount(item.outstandingMinor);
  const stack = width < 390 || fontScale >= 1.3 || amount.length > 17;
  const state = item.overdue ? 'Overdue' : item.receivedMinor > 0 ? 'Partially paid' : 'Outstanding';
  return <UiPressable testID="client-open-job" accessibilityRole="button" accessibilityLabel={`${title}, outstanding ${amount}, ${state}, work ${dateLabel(item.entry.workDate)}`}
    accessibilityHint="Job details and payments" onPress={onPress} style={[styles.job, { backgroundColor: colors.group, borderColor: colors.border }]}>
    {fontScale < 1.4 && <View style={[styles.jobIcon, { backgroundColor: colors.brandSoft }]}><UiIcon name="briefcase" size={22} color={colors.brand} /></View>}
    <View style={styles.copy}>
      <View style={[styles.jobTop, stack && styles.stacked]}><View style={styles.copy}>
        <UiText testID="client-job-title" type="editorSection">{title}</UiText>
        {!!item.entry.description.trim() && item.entry.description.trim() !== title && <UiText type="metadata" color="textSecondary" numberOfLines={2}>{item.entry.description}</UiText>}
        <UiText type="metadata" color="textSecondary">Work {dateLabel(item.entry.workDate)}</UiText>
      </View><View style={styles.balance}><ClientMoney value={amount} /></View></View>
      <View style={styles.statusLine}><View style={[styles.badge, { backgroundColor: item.overdue ? colors.attentionSoft : colors.control }]}>
        <UiText type="smallLabel" color={item.overdue ? 'overdue' : 'pending'}>{state}</UiText>
      </View>{item.entry.expectedPaymentDate && <UiText type="metadata" color={item.overdue ? 'attention' : 'textSecondary'}>Expected {dateLabel(item.entry.expectedPaymentDate)}</UiText>}</View>
    </View><UiIcon name="forward" size={18} color={colors.textSecondary} />
  </UiPressable>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, padding: Space.lg },
  identityIcon: { width: 40, height: 40, borderRadius: Shape.control, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 }, content: { padding: Space.lg, gap: Space.md }, before: { gap: Space.lg },
  overview: { gap: Space.lg, paddingTop: Space.md, borderTopWidth: 1 },
  metric: { flex: 1, minWidth: 0, gap: Space.xs }, metrics: { flexDirection: 'row', gap: Space.lg },
  money: { flexShrink: 1, fontVariant: ['tabular-nums'] }, moneyGroups: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline' }, moneyGroup: { flexShrink: 0 },
  actions: { flexDirection: 'row', gap: Space.sm }, action: { flex: 1, minWidth: 0 }, secondaryActions: { flexDirection: 'row', flex: 1, gap: Space.sm, alignItems: 'center' },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  sectionHeading: { borderTopWidth: 1, paddingTop: Space.section },
  job: { borderWidth: 1, borderRadius: Shape.group, padding: Space.md, flexDirection: 'row', alignItems: 'flex-start', gap: Space.md, minHeight: TouchTarget },
  jobIcon: { width: 40, height: 40, borderRadius: Shape.control, alignItems: 'center', justifyContent: 'center' },
  jobTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm }, balance: { flexShrink: 1, minWidth: 0, gap: Space.xs },
  statusLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.sm, marginTop: Space.sm }, badge: { borderRadius: Shape.status, paddingHorizontal: Space.sm, paddingVertical: Space.xs },
  history: { flexDirection: 'row', alignItems: 'center', minHeight: TouchTarget, padding: Space.md, gap: Space.md, borderWidth: 1, borderRadius: Shape.group, marginTop: Space.sm },
});

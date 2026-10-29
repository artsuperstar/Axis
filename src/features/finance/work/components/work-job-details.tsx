import { useCallback, useMemo, type Ref } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions, type ScrollViewInstance, type ScrollViewProps } from 'react-native';

import { AdaptiveSheet, useSheetScrollProps } from '@/components/adaptive-sheet';
import { BackButton } from '@/components/back-button';
import { ContextMenu } from '@/components/context-menu';
import { DesignProvider, GroupSurface, UiIcon, UiPressable, UiText, useDesignColors } from '@/components/design-system';
import { EditorSection } from '@/components/editor-section';
import { FormButton, FormError } from '@/components/form-controls';
import { FormScrollView } from '@/components/form-selection-host';
import { DesignSpace as Space, Shape, TouchTarget } from '@/constants/design-system-v2';
import { dateLabel } from '@/utils/calendar';

import { financeCategoryName } from '../../form';
import { formatBrlAmount } from '../../money';
import type { FinanceCategory } from '../../types';
import { durationLabel } from '../form';
import { jobTitle } from '../presentation';
import type { WorkItem, WorkPayment } from '../types';

type Props = {
  item?: WorkItem; payments: WorkPayment[] | null; categories: FinanceCategory[]; error: string | null; loading: boolean;
  expandedReceiptId: string | null; onToggleReceipt: (id: string) => void;
  onDismiss: () => void; onPayment: () => void; onEdit: () => void; onClient: () => void; onDelete: () => void; onUndo: (payment: WorkPayment) => void;
};
type JobReceipt = { payment: WorkPayment; allocation: WorkPayment['allocations'][number] };

/** Job Details uses the existing Work modal; this component owns presentation only. */
export function WorkJobDetails(props: Props) {
  const { width, fontScale } = useWindowDimensions();
  const stackHeader = width < 390 || fontScale >= 1.4;
  const title = props.item ? jobTitle(props.item.entry) : '';
  const options = props.item && <ContextMenu appearance="v2" label={`Work options for ${title}`} actions={[
    { label: 'Client details', onPress: props.onClient },
    ...(props.item.receivedMinor === 0 ? [{ label: 'Delete', variant: 'destructive' as const, accessibilityLabel: `Delete ${title}`, onPress: props.onDelete }] : []),
  ]} />;
  const heading = <UiText type="editorTitle" accessibilityRole="header" style={[styles.heading, stackHeader && styles.full]}>Job details</UiText>;
  const header = <View style={styles.header}>
    {stackHeader && heading}
    <View style={styles.headerRow}>
      <BackButton appearance="v2" iconOnly onPress={props.onDismiss} />
      {!stackHeader && heading}{options}
    </View>
  </View>;
  return <DesignProvider><AdaptiveSheet title="Job details" appearance="v2" onDismiss={props.onDismiss} header={header} fillHeight
    scrollBody={<JobDetailsList {...props} />} /></DesignProvider>;
}

/** Keep both the virtualized list responder and the existing sheet focus/scroll owner. */
function DetailsScrollView({ sheetRef, ref, ...props }: ScrollViewProps & { sheetRef: Ref<ScrollViewInstance>; ref?: Ref<ScrollViewInstance> }) {
  const attach = useCallback((node: ScrollViewInstance | null) => {
    for (const target of [sheetRef, ref]) {
      if (typeof target === 'function') target(node);
      else if (target) target.current = node;
    }
  }, [sheetRef, ref]);
  return <FormScrollView {...props} ref={attach} />;
}

function JobDetailsList(props: Props) {
  const colors = useDesignColors();
  const { ref: sheetRef, ...bodyProps } = useSheetScrollProps();
  const selectedId = props.item?.entry.id;
  // The source snapshot already includes shared receipts in source order. No row-level reads.
  const receipts = useMemo(() => props.payments?.flatMap(payment => {
    const allocation = payment.allocations.find(row => row.workEntryId === selectedId);
    return allocation ? [{ payment, allocation }] : [];
  }) ?? [], [props.payments, selectedId]);
  const edge = { backgroundColor: colors.group, borderColor: colors.border };
  return <FlatList<JobReceipt> {...bodyProps} testID="work-job-details-list" data={receipts} extraData={props.expandedReceiptId}
    keyExtractor={row => row.payment.transaction.id} initialNumToRender={6} maxToRenderPerBatch={6} windowSize={5} removeClippedSubviews={false}
    renderScrollComponent={scrollProps => <DetailsScrollView {...scrollProps} sheetRef={sheetRef} />}
    contentContainerStyle={styles.content}
    ListHeaderComponent={<View style={styles.before}>
      <FormError appearance="v2" message={props.error} />
      {props.item ? <>
        <JobOverview item={props.item} />
        <JobActions item={props.item} onPayment={props.onPayment} onEdit={props.onEdit} />
        <EditorSection title="Client" description="" icon="person" variant="group">
          <UiPressable testID="job-client-navigation" accessibilityRole="button" accessibilityLabel={`Open ${props.item.counterparty.name} details`}
            accessibilityHint="Client details" onPress={props.onClient} style={[styles.client, { borderColor: colors.border }]}>
            <View style={styles.copy}><UiText testID="job-client" type="body">{props.item.counterparty.name}</UiText>
              {props.item.counterparty.deletedAt !== null && <UiText type="metadata" color="textSecondary">Archived client</UiText>}
            </View><UiIcon name="forward" size={20} color={colors.textSecondary} />
          </UiPressable>
        </EditorSection>
        {!!props.item.entry.description.trim() && <EditorSection title="Description" description="" icon="document" variant="group">
          <UiText testID="job-description" selectable>{props.item.entry.description}</UiText>
        </EditorSection>}
        <View style={[styles.receiptsHeader, edge]}>
          <SectionIdentity title="Receipts" icon="receipt" />
          <UiText type="secondary" color="textSecondary">Payments received for this work.</UiText>
        </View>
      </> : <UiText type="secondary" color="textSecondary">{props.loading ? 'Loading job details…' : 'This work entry is no longer available.'}</UiText>}
    </View>}
    renderItem={({ item, index }) => <View style={[styles.receiptEdge, edge]}>
      <JobReceiptRow row={item} title={jobTitle(props.item!.entry)} categories={props.categories} expanded={props.expandedReceiptId === item.payment.transaction.id}
        position={index + 1} count={receipts.length} onToggle={() => props.onToggleReceipt(item.payment.transaction.id)} onUndo={() => props.onUndo(item.payment)} />
    </View>}
    ListFooterComponent={props.item ? <View style={[styles.receiptsEnd, edge]}>
      {props.payments === null ? <UiText type="secondary" color="textSecondary">{props.error ? 'Receipts could not be loaded.' : 'Loading receipts…'}</UiText>
        : !receipts.length && <View testID="job-receipts-empty" style={styles.empty}>
          <UiIcon name="receipt" size={28} color={colors.textSecondary} />
          <UiText type="cardTitle" style={styles.center}>No money received for this work yet.</UiText>
          <UiText type="secondary" color="textSecondary" style={styles.center}>Record a payment to apply received money to this work.</UiText>
        </View>}
    </View> : undefined} />;
}

function SectionIdentity({ title, icon }: { title: string; icon: 'receipt' }) {
  const colors = useDesignColors();
  return <View style={styles.sectionIdentity}><View style={[styles.sectionIcon, { backgroundColor: colors.brandSoft }]}><UiIcon name={icon} size={22} color={colors.brand} /></View>
    <UiText type="editorSection" accessibilityRole="header" style={styles.copy}>{title}</UiText>
  </View>;
}

/** Wrap extreme amounts between digit groups, never through the centavo pair. No numeric conversion. */
function JobMoney({ value, type = 'cardTitle', selectable = false }: { value: string; type?: 'cardTitle' | 'metric' | 'secondary'; selectable?: boolean }) {
  if (value.length <= 17) return <UiText type={type} selectable={selectable} style={styles.money}>{value}</UiText>;
  const parts = value.match(/^R\$\s|\d+\.|\d+,\d{2}$/g) ?? [value];
  return <View testID="job-money-long" accessible={selectable} accessibilityLabel={value} style={styles.moneyGroups}>
    {parts.map((part, index) => <UiText key={index} testID="job-money-group" type={type} selectable={selectable} accessible={false} style={styles.moneyGroup}>{part}</UiText>)}
  </View>;
}

function JobOverview({ item }: { item: WorkItem }) {
  const colors = useDesignColors();
  const { width, fontScale } = useWindowDimensions();
  const { entry } = item;
  const values = [item.earnedMinor, item.receivedMinor, item.outstandingMinor].map(formatBrlAmount);
  const stack = width < 390 || fontScale >= 1.3;
  const stackMoney = stack || values.some(value => value.length > 17);
  function metric(label: string, value: string) {
    return <View testID={`job-metric-${label.toLowerCase()}`} style={[styles.metric, stackMoney && styles.full]}>
      <UiText type="metadata" color="textSecondary">{label}</UiText><JobMoney value={value} selectable />
    </View>;
  }
  return <GroupSurface testID="job-overview" variant="group" style={[styles.overview, { borderColor: colors.border }]}>
    <View style={[styles.overviewTop, stackMoney && styles.stacked]}>
      <View style={[styles.identity, stackMoney && styles.full]}><View style={[styles.workIcon, { backgroundColor: colors.brandSoft }]}><UiIcon name="briefcase" size={26} color={colors.brand} /></View>
        <View style={styles.copy}><UiText testID="job-title" type="editorSection">{jobTitle(entry)}</UiText><UiText type="secondary" color="textSecondary">{item.counterparty.name}</UiText></View>
      </View>
      <View testID="job-metric-outstanding" style={[styles.outstanding, stackMoney && styles.full]}>
        <JobMoney value={values[2]} type="metric" selectable /><UiText type="metadata" color="textSecondary">Outstanding</UiText>
      </View>
    </View>
    <View style={[styles.divider, { backgroundColor: colors.border }]} />
    <View testID="job-compensation-metrics" style={[styles.metrics, stackMoney && styles.stacked]}>
      <View style={[styles.metric, stackMoney && styles.full]}><UiText type="metadata" color="textSecondary">Compensation</UiText>
        <UiText type="cardTitle">{entry.compensationType === 'hourly' ? 'Hourly' : 'Fixed price'}</UiText>
        {entry.compensationType === 'hourly' && <UiText type="secondary" color="textSecondary" selectable>{durationLabel(entry.durationMinutes!)} × {formatBrlAmount(entry.hourlyRateMinor!)}/hour</UiText>}
      </View>
      {metric('Earned', values[0])}{metric('Received', values[1])}
    </View>
    <View style={[styles.divider, { backgroundColor: colors.border }]} />
    <View testID="job-dates" style={[styles.metrics, stack && styles.stacked]}>
      <View style={[styles.metric, stack && styles.full]}><UiText type="metadata" color="textSecondary">Work date</UiText><UiText selectable>{dateLabel(entry.workDate)}</UiText></View>
      <View style={[styles.metric, stack && styles.full]}><UiText type="metadata" color="textSecondary">Expected payment</UiText><UiText selectable>{entry.expectedPaymentDate ? dateLabel(entry.expectedPaymentDate) : 'Not set'}</UiText>
        {item.overdue && <View testID="job-overdue" style={styles.overdue}><UiIcon name="clock" size={18} color={colors.attention} /><UiText type="secondary" color="attention">Overdue</UiText></View>}
      </View>
    </View>
  </GroupSurface>;
}

function JobActions({ item, onPayment, onEdit }: { item: WorkItem; onPayment: () => void; onEdit: () => void }) {
  const { width, fontScale } = useWindowDimensions();
  const stack = width < 390 || fontScale >= 1.3;
  return <View style={styles.actionGroup}><View testID="job-actions" style={[styles.actions, stack && styles.stacked]}>
    {item.outstandingMinor > 0 && <View style={[styles.action, stack && styles.full]}><FormButton appearance="v2" label="Record payment" leadingIcon="creditCard" variant="primary"
      accessibilityLabel={`Record payment for ${jobTitle(item.entry)}`} onPress={onPayment} /></View>}
    <View style={[styles.action, stack && styles.full]}><FormButton appearance="v2" label="Edit work" leadingIcon="pencil" accessibilityLabel={`Edit ${jobTitle(item.entry)}`} onPress={onEdit} /></View>
  </View>{item.receivedMinor > 0 && <UiText type="metadata" color="textSecondary">Undo payments before deleting this work entry.</UiText>}</View>;
}

function JobReceiptRow({ row: { payment, allocation }, title, categories, expanded, position, count, onToggle, onUndo }: {
  row: JobReceipt; title: string; categories: FinanceCategory[]; expanded: boolean; position: number; count: number; onToggle: () => void; onUndo: () => void;
}) {
  const colors = useDesignColors();
  const { width, fontScale } = useWindowDimensions();
  const amount = formatBrlAmount(allocation.amountMinor), date = dateLabel(payment.transaction.transactionDate);
  const category = financeCategoryName(payment.transaction, categories);
  const shared = payment.allocations.length > 1;
  const stack = width < 390 || fontScale >= 1.3 || amount.length > 17;
  const subject = `${title}, allocated ${amount}, received ${date}`;
  return <GroupSurface variant="surface" testID="work-receipt" style={[styles.receipt, { borderColor: colors.border }]}>
    <View style={styles.receiptHeader}>
      <UiPressable accessibilityRole="button" accessibilityLabel={`Receipt ${position} of ${count} for ${subject}`} accessibilityState={{ expanded }} accessibilityHint="View the work covered by this receipt" onPress={onToggle} style={styles.receiptBody}>
        <View style={[styles.receiptSummary, stack && styles.stacked]}>
          <View style={[styles.copy, stack && styles.full]}><UiText type="metadata" color="textSecondary">Received for this job</UiText><JobMoney value={amount} /></View>
          <UiIcon name={expanded ? 'chevronUp' : 'chevron'} size={18} color={colors.textSecondary} />
        </View>
        <UiText type="secondary" color="textSecondary">Payment date {date}</UiText>
        {shared && <UiText type="metadata" color="textSecondary">Shared receipt · {payment.allocations.length} jobs</UiText>}
        {!!category && <UiText type="metadata" color="textSecondary">{category}</UiText>}
      </UiPressable>
      <ContextMenu appearance="v2" label={`Receipt ${position} options for ${subject}`} actions={[{ label: 'Undo payment', accessibilityLabel: `Undo receipt for ${subject}`, onPress: onUndo }]} />
    </View>
    {expanded && <View testID="job-receipt-disclosure" style={[styles.disclosure, { borderColor: colors.border }]}>
      {shared && <View><UiText type="secondary" color="textSecondary">Shared Income total: </UiText><JobMoney value={formatBrlAmount(payment.transaction.amountMinor)} type="secondary" selectable /></View>}
      <UiText type="metadata" color="textSecondary">Work covered by this receipt</UiText>
      {payment.allocations.map(value => <View key={value.id}><UiText type="secondary" selectable>{jobTitle(value)} · Received </UiText><JobMoney value={formatBrlAmount(value.amountMinor)} type="secondary" selectable /></View>)}
    </View>}
  </GroupSurface>;
}

const styles = StyleSheet.create({
  header: { padding: Space.md, gap: Space.sm }, headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.sm },
  heading: { flex: 1, minWidth: 0, fontSize: 24, lineHeight: 32 }, content: { padding: Space.md, paddingBottom: Space.lg }, before: { gap: Space.md },
  overview: { padding: Space.md, borderWidth: 1, gap: Space.md }, overviewTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.md },
  identity: { flex: 1, minWidth: 0, flexDirection: 'row', gap: Space.md, alignItems: 'flex-start' },
  copy: { flex: 1, minWidth: 0, gap: Space.xs }, workIcon: { width: 44, height: 48, borderRadius: Shape.control, flexShrink: 0, justifyContent: 'center', alignItems: 'center' },
  outstanding: { maxWidth: '50%', minWidth: 0, gap: Space.xs }, money: { minWidth: 0, maxWidth: '100%', fontVariant: ['tabular-nums'] },
  moneyGroups: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline' }, moneyGroup: { flexShrink: 0, fontVariant: ['tabular-nums'] },
  divider: { height: 1 }, metrics: { flexDirection: 'row', gap: Space.md }, metric: { flex: 1, minWidth: 0, gap: Space.xs },
  stacked: { flexDirection: 'column', alignItems: 'stretch' }, full: { maxWidth: '100%', flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  overdue: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.xs }, actionGroup: { gap: Space.sm }, actions: { flexDirection: 'row', gap: Space.sm }, action: { flex: 1, minWidth: 0 },
  client: { borderWidth: 1, borderRadius: Shape.control, padding: Space.sm, minHeight: TouchTarget, flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  sectionIdentity: { flexDirection: 'row', alignItems: 'center', gap: Space.md }, sectionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  receiptsHeader: { padding: Space.md, gap: Space.sm, borderWidth: 1, borderBottomWidth: 0, borderTopLeftRadius: Shape.group, borderTopRightRadius: Shape.group },
  receiptEdge: { paddingHorizontal: Space.md, paddingBottom: Space.sm, borderLeftWidth: 1, borderRightWidth: 1 },
  receipt: { padding: Space.sm, borderWidth: 1, borderRadius: Shape.control, gap: Space.sm }, receiptHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm },
  receiptBody: { flex: 1, minWidth: 0, gap: Space.sm, minHeight: TouchTarget }, receiptSummary: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm },
  disclosure: { borderTopWidth: 1, paddingTop: Space.sm, gap: Space.sm },
  receiptsEnd: { padding: Space.md, borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: Shape.group, borderBottomRightRadius: Shape.group },
  empty: { paddingVertical: Space.sm, gap: Space.sm, alignItems: 'center' }, center: { textAlign: 'center' },
});

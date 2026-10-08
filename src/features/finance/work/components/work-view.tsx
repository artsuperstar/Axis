import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ContextMenu } from '@/components/context-menu';
import { FormButton, FormError, FormField } from '@/components/form-controls';
import { StatusText } from '@/components/status-text';
import { ThemedText } from '@/components/themed-text';
import { ControlSize, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dateLabel } from '@/utils/calendar';
import { canonicalSearchText } from '@/utils/text-normalization';

import { stackFinanceMetrics } from '../../dashboard-presentation';
import { financeError } from '../../errors';
import { financeCategoryName } from '../../form';
import { formatBrlAmount } from '../../money';
import type { FinanceCategory } from '../../types';
import type { WorkDataAccess } from '../data';
import { groupWorkItems, jobTitle } from '../presentation';
import type { WorkItem, WorkOverview, WorkPayment, WorkSnapshot, WorkTotals } from '../types';
import { WorkEditor, WorkModal, WorkPaymentEditor, WorkSheet } from './work-forms';
import { WorkHistoryList } from './work-history-list';
import { WorkRow } from './work-row';

type Dialog = { kind: 'edit'; id: string | null; partyId?: string } | { kind: 'details'; id: string }
  | { kind: 'payment'; id?: string; partyId?: string } | { kind: 'client'; partyId: string }
  | { kind: 'history'; partyId: string };

export function WorkView({ data, categories, access, mutate, onCreateCategory, initialEntryId, destination = 'main' }: {
  data: WorkOverview; categories: FinanceCategory[]; access: WorkDataAccess; mutate: <T>(action: () => T) => T; onCreateCategory: (name: string) => FinanceCategory;
  initialEntryId?: string; destination?: 'main' | 'clients' | 'history';
}) {
  const colors = useTheme();
  const [dialog, setDialog] = useState<Dialog | null>(() => initialEntryId ? { kind: 'details', id: initialEntryId } : null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [focusedData, setFocusedData] = useState<WorkOverview | null>(null);
  const [detail, setDetail] = useState<WorkSnapshot | null>(null);
  const { overdue, outstanding } = groupWorkItems(data.items);
  const selectedId = dialog && 'id' in dialog ? dialog.id ?? undefined : undefined;
  const current = selectedId ? detail?.items.find((item) => item.entry.id === selectedId) ?? data.items.find((item) => item.entry.id === selectedId) : undefined;

  const clientId = dialog && 'partyId' in dialog ? dialog.partyId : undefined;
  const client = data.counterparties.find((party) => party.id === clientId);
  const totalsByClient = new Map(data.counterpartyTotals.map((group) => [group.counterparty.id, group]));
  const clientTotals = clientId ? totalsByClient.get(clientId) : undefined;
  // Management routes load compact totals; only a focused Client/payment needs its open jobs.
  const contextParty = destination !== 'main' && (dialog?.kind === 'client' || dialog?.kind === 'payment')
    ? dialog.partyId ?? current?.entry.counterpartyId : undefined;
  const openClientItems = (contextParty ? focusedData?.items ?? [] : data.items).filter((item) => item.counterparty.id === clientId && item.outstandingMinor > 0);
  const paymentContext = destination !== 'main' && dialog?.kind === 'payment';
  const lastRead = useRef<{ data: WorkOverview; selectedId?: string; contextParty?: string; paymentContext: boolean } | null>(null);
  useEffect(() => {
    if (lastRead.current?.data === data && lastRead.current.selectedId === selectedId && lastRead.current.contextParty === contextParty && lastRead.current.paymentContext === paymentContext) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const nextDetail = selectedId ? access.readDetail(selectedId) : null;
        // Payment can switch Clients, so its actionable choices need all open jobs.
        const nextContext = paymentContext ? access.readOverview() : contextParty ? access.readOverview({ counterpartyId: contextParty }) : null;
        if (nextDetail) setDetail(nextDetail);
        if (nextContext) setFocusedData(nextContext);
        lastRead.current = { data, selectedId, contextParty, paymentContext };
      } catch (cause) { setError(financeError(cause, 'Unable to refresh Work details.')); }
    });
    return () => { cancelled = true; };
  }, [access, data, selectedId, contextParty, paymentContext]);
  function run(action: () => void) { try { action(); setError(null); } catch (cause) { setError(financeError(cause, 'Unable to update Work.')); } }
  function open(next: Dialog) {
    run(() => {
      const nextDetail = 'id' in next && next.id ? access.readDetail(next.id) : null;
      const partyId = destination !== 'main' && (next.kind === 'client' || next.kind === 'payment')
        ? next.partyId ?? nextDetail?.items[0]?.entry.counterpartyId : undefined;
      const paymentContext = destination !== 'main' && next.kind === 'payment';
      const nextContext = paymentContext ? access.readOverview() : partyId ? access.readOverview({ counterpartyId: partyId }) : null;
      if (nextDetail) setDetail(nextDetail);
      if (nextContext) setFocusedData(nextContext);
      lastRead.current = { data, selectedId: 'id' in next ? next.id ?? undefined : undefined, contextParty: partyId, paymentContext };
      setReceiptId(null); setDialog(next); setError(null);
    });
  }
  function confirm(title: string, message: string, action: () => void) {
    Alert.alert(title, message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', onPress: () => run(action) }]);
  }
  function remove(item: WorkItem) {
    confirm('Delete work entry?', 'This removes unpaid work from Work totals. Entries with payments require Undo payment first.', () => { mutate(() => access.delete(item.entry.id)); setDialog(null); });
  }
  function undo(payment: WorkPayment) {
    confirm('Undo payment?', `Remove ${formatBrlAmount(payment.transaction.amountMinor)} from Finance Income and restore money owed for the ${payment.allocations.length} work entries in this receipt?`,
      () => mutate(() => access.undoPayment(payment.transaction.id)));
  }
  function archive(id: string) {
    confirm('Archive client?', 'Historical work and payments keep this name. This client will no longer be available for new work.', () => mutate(() => access.archiveCounterparty(id)));
  }
  function paymentRow(payment: WorkPayment) {
    const category = financeCategoryName(payment.transaction, categories);
    const subject = `${payment.counterparty.name} payment of ${formatBrlAmount(payment.transaction.amountMinor)}, ${dateLabel(payment.transaction.transactionDate)}`;
    return <View key={payment.transaction.id} testID="work-receipt" style={[styles.row, { borderColor: colors.border }]}>
      <View style={styles.pair}>
        <Pressable style={styles.body} accessibilityRole="button" accessibilityLabel={`Receipt from ${subject}`} accessibilityState={{ expanded: receiptId === payment.transaction.id }}
          accessibilityHint="View the work covered by this receipt" onPress={() => setReceiptId(receiptId === payment.transaction.id ? null : payment.transaction.id)}>
          <View style={styles.pair}><ThemedText type="cardTitle" style={styles.name}>{payment.counterparty.name}</ThemedText>
            <ThemedText type="cardTitle" style={styles.amount}>{formatBrlAmount(payment.transaction.amountMinor)}</ThemedText></View>
          <ThemedText type="metadata" themeColor="textSecondary">Received {dateLabel(payment.transaction.transactionDate)} · {payment.allocations.length} work {payment.allocations.length === 1 ? 'entry' : 'entries'}</ThemedText>
          {!!category && <ThemedText type="metadata" themeColor="textSecondary">{category}</ThemedText>}
        </Pressable>
        <ContextMenu label={`Receipt options for ${subject}`} actions={[{ label: 'Undo payment', accessibilityLabel: `Undo ${subject}`, onPress: () => undo(payment) }]} />
      </View>
      {receiptId === payment.transaction.id && payment.allocations.map((allocation) => <ThemedText key={allocation.id} type="secondary" themeColor="textSecondary">{jobTitle(allocation)} · Received {formatBrlAmount(allocation.amountMinor)}</ThemedText>)}
    </View>;
  }
  return <View style={styles.section}>
    {destination === 'main' && <>
    <View style={styles.heading}>
      <ThemedText type="sectionHeading" accessibilityRole="header" style={styles.name}>Work</ThemedText>
      <ContextMenu label="Work options" actions={[
        { label: 'Clients', onPress: () => router.push('/work/clients') }, { label: 'History', onPress: () => router.push('/work/history') },
      ]} />
    </View>
    <WorkSummary totals={data.totals} />
    <ThemedText type="metadata" themeColor="textSecondary">All work, independent of the Overview period. Earned becomes Finance Income only when received.</ThemedText>
    <View style={styles.actions}>
      <FormButton variant={data.totals.outstandingMinor > 0n ? 'secondary' : 'primary'} label="Add work" onPress={() => open({ kind: 'edit', id: null })} />
      {data.totals.outstandingMinor > 0n && <FormButton variant="primary" label="Record payment" onPress={() => open({ kind: 'payment' })} />}
    </View>
    <FormError message={error} />
    {!data.items.length && !data.settledCount && <ThemedText type="secondary" themeColor="textSecondary">No work yet. Add Hourly or Fixed work, then record payments when money arrives.</ThemedText>}
    {!!overdue.length && <View testID="work-attention" style={styles.section}>
      <ThemedText type="sectionHeading" themeColor="warning" accessibilityRole="header">Needs attention ({overdue.length})</ThemedText>
      {overdue.map((item) => <WorkRow key={item.entry.id} item={item} onPress={() => open({ kind: 'details', id: item.entry.id })} />)}
    </View>}
    <View testID="work-jobs" style={styles.section}>
      <ThemedText type="sectionHeading" accessibilityRole="header">Jobs</ThemedText>
      {outstanding.map((item) => <WorkRow key={item.entry.id} item={item} onPress={() => open({ kind: 'details', id: item.entry.id })} />)}
      {!outstanding.length && !!overdue.length && <ThemedText type="secondary" themeColor="textSecondary">All open jobs need attention above.</ThemedText>}
      {!!(data.items.length + data.settledCount) && !data.items.length && <ThemedText type="secondary" themeColor="textSecondary">Nothing outstanding. Open History to review settled jobs and receipts.</ThemedText>}
    </View>
    </>}
    {destination === 'clients' && <View testID="work-clients-content" style={styles.section}>
        <FormField label="Search clients" value={search} onChangeText={setSearch} />
        <View style={styles.section}><ThemedText type="cardTitle" accessibilityRole="header">New client</ThemedText>
          <FormField label="Name *" value={name} onChangeText={(value) => { setName(value); setError(null); }} />
          <View style={styles.actions}><FormButton variant="primary" label="Create client" disabled={!name.trim()} onPress={() => run(() => { mutate(() => access.createCounterparty(name)); setName(''); })} /></View>
        </View>
        {(['Active', 'Archived'] as const).map((status) => <View key={status} style={styles.section}>
          <ThemedText type="cardTitle" accessibilityRole="header">{status} clients</ThemedText>
          {data.counterparties.filter((party) => (party.deletedAt !== null) === (status === 'Archived') && canonicalSearchText(party.name).includes(canonicalSearchText(search))).map((party) => <View key={party.id} style={[styles.row, styles.pair, { borderColor: colors.border }]}>
            <Pressable style={styles.body} accessibilityRole="button" accessibilityLabel={`Open ${party.name} details`} onPress={() => open({ kind: 'client', partyId: party.id })}><ThemedText type="cardTitle">{party.name}</ThemedText><ThemedText type="secondary" themeColor="textSecondary">Outstanding {formatBrlAmount(totalsByClient.get(party.id)?.outstandingMinor ?? 0n)}</ThemedText></Pressable>
            <ContextMenu label={`Client options for ${party.name}`} actions={[
              { label: 'History', onPress: () => open({ kind: 'history', partyId: party.id }) },
              ...(party.deletedAt === null ? [{ label: 'Archive', accessibilityLabel: `Archive ${party.name}`, onPress: () => archive(party.id) }] : []),
            ]} />
          </View>)}
        </View>)}
    </View>}
    {destination === 'history' && <WorkHistoryList access={access} refreshToken={data}
      onOpenJob={(item) => open({ kind: 'details', id: item.entry.id })} renderReceipt={paymentRow} />}
    {destination !== 'main' && <FormError message={error} />}
    {dialog && <WorkModal onDismiss={() => setDialog(null)}>
      {dialog.kind === 'edit' && <WorkEditor key={dialog.id ?? `new:${dialog.partyId ?? ''}`} item={current ?? null} initialCounterpartyId={dialog.partyId} counterparties={data.counterparties}
        onCreateCounterparty={(value) => mutate(() => access.createCounterparty(value))} onDismiss={() => setDialog(null)}
        onSave={(draft) => mutate(() => dialog.id ? access.edit(dialog.id, draft) : access.create(draft))} />}
      {dialog.kind === 'payment' && <WorkPaymentEditor data={paymentContext ? focusedData ?? data : data} categories={categories} initialCounterpartyId={dialog.partyId} initialItem={current?.outstandingMinor ? current : undefined}
        onCreateCategory={onCreateCategory} onSave={(draft) => mutate(() => access.recordPayment(draft))} onDismiss={() => setDialog(null)} />}
      {dialog.kind === 'client' && <WorkSheet title={client?.name ?? 'Client details'} onDismiss={() => setDialog(null)}>
        <FormError message={error} />
        <WorkSummary totals={clientTotals ?? { earnedMinor: 0n, receivedMinor: 0n, outstandingMinor: 0n }} />
        {client && client.deletedAt !== null && <StatusText tone="subdued">Archived client · existing money owed remains actionable.</StatusText>}
        <View style={styles.actions}>
          {client?.deletedAt === null && <FormButton variant="secondary" label="Add work" accessibilityLabel={`Add work for ${client.name}`} onPress={() => open({ kind: 'edit', id: null, partyId: client.id })} />}
          {!!openClientItems.length && <FormButton variant="primary" label="Record payment" accessibilityLabel={`Record payment from ${client?.name}`} onPress={() => open({ kind: 'payment', partyId: dialog.partyId })} />}
          <ContextMenu label={`Client options for ${client?.name}`} actions={[
            { label: 'History', accessibilityLabel: `History for ${client?.name}`, onPress: () => open({ kind: 'history', partyId: dialog.partyId }) },
            ...(client?.deletedAt === null ? [{ label: 'Archive', accessibilityLabel: `Archive ${client.name}`, onPress: () => archive(client.id) }] : []),
          ]} />
        </View>
        <ThemedText type="cardTitle" accessibilityRole="header">Open jobs</ThemedText>
        {!openClientItems.length && <ThemedText type="secondary" themeColor="textSecondary">No open work. History keeps settled entries and receipts.</ThemedText>}
        {[...openClientItems].sort((a, b) => Number(b.overdue) - Number(a.overdue)).map((item) => <WorkRow key={item.entry.id} item={item} onPress={() => open({ kind: 'details', id: item.entry.id })} />)}
      </WorkSheet>}
      {dialog.kind === 'details' && <WorkSheet title="Job details" onDismiss={() => setDialog(null)}>
        <FormError message={error} />
        {current ? <>
          <WorkRow item={current} detail />
          <View style={styles.actions}>
            {!!current.outstandingMinor && <FormButton variant="primary" label="Record payment" accessibilityLabel={`Record payment for ${jobTitle(current.entry)}`} onPress={() => open({ kind: 'payment', id: current.entry.id })} />}
            <ContextMenu label={`Work options for ${jobTitle(current.entry)}`} actions={[
              { label: 'Edit', accessibilityLabel: `Edit ${jobTitle(current.entry)}`, onPress: () => open({ kind: 'edit', id: current.entry.id }) },
              { label: 'Client details', onPress: () => open({ kind: 'client', partyId: current.counterparty.id }) },
              ...(current.receivedMinor === 0 ? [{ label: 'Delete', variant: 'destructive' as const, accessibilityLabel: `Delete ${jobTitle(current.entry)}`, onPress: () => remove(current) }] : []),
            ]} />
          </View>
          {current.receivedMinor > 0 && <ThemedText type="secondary" themeColor="textSecondary">Undo payments before deleting this work entry.</ThemedText>}
          <ThemedText type="cardTitle" accessibilityRole="header">Receipts</ThemedText>
          {detail?.payments.filter((payment) => payment.allocations.some((allocation) => allocation.workEntryId === current.entry.id)).map(paymentRow)}
          {!current.receivedMinor && <ThemedText type="secondary" themeColor="textSecondary">No money received for this work yet.</ThemedText>}
        </> : <ThemedText>This work entry is no longer available.</ThemedText>}
      </WorkSheet>}
      {dialog.kind === 'history' && <WorkSheet title={client ? client.name + ' · History' : 'Client history'} onDismiss={() => setDialog(null)}>
        <WorkHistoryList access={access} refreshToken={data} counterpartyId={dialog.partyId}
          onOpenJob={(item) => open({ kind: 'details', id: item.entry.id })} renderReceipt={paymentRow} />
      </WorkSheet>}
    </WorkModal>}
  </View>;
}

function WorkSummary({ totals }: { totals: WorkTotals }) {
  const { width, fontScale } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  const stack = stackFinanceMetrics(measuredWidth ?? Math.min(width - Space.lg * 2, 640), fontScale, [formatBrlAmount(totals.earnedMinor), formatBrlAmount(totals.receivedMinor)]);
  function metric(label: string, amount: bigint, primary = false) {
    return <View testID={`work-metric-${label.toLowerCase()}`} accessible accessibilityLabel={`${label}, ${formatBrlAmount(amount)}`} style={styles.metric}>
      <ThemedText type="secondary" themeColor="textSecondary">{label}</ThemedText>
      <ThemedText type={primary ? 'metric' : 'cardTitle'} style={styles.amount}>{formatBrlAmount(amount)}</ThemedText>
    </View>;
  }
  return <View style={styles.section} onLayout={(event) => setMeasuredWidth(event.nativeEvent.layout.width)}>
    {metric('Outstanding', totals.outstandingMinor, true)}
    <View testID="work-secondary-metrics" style={[styles.comparison, { flexDirection: stack ? 'column' : 'row' }]}>{metric('Earned', totals.earnedMinor)}{metric('Received', totals.receivedMinor)}</View>
  </View>;
}
const styles = StyleSheet.create({
  section: { gap: Space.lg }, heading: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  row: { paddingVertical: Space.md, gap: Space.sm, minHeight: ControlSize.touch, borderBottomWidth: 1 },
  pair: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, alignItems: 'center' },
  body: { flexGrow: 1, flexShrink: 1, flexBasis: 160, minHeight: ControlSize.touch, gap: Space.sm },
  name: { flexGrow: 1, flexShrink: 1, flexBasis: 160 }, amount: { flexShrink: 1, fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, alignItems: 'center' },
  comparison: { gap: Space.lg }, metric: { flex: 1, minWidth: 0, gap: Space.xs },
});

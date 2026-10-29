import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { ContextMenu } from '@/components/context-menu';
import { FormButton, FormError } from '@/components/form-controls';
import { StatusText } from '@/components/status-text';
import { ThemedText } from '@/components/themed-text';
import { ControlSize, Space } from '@/constants/theme';



import { stackFinanceMetrics } from '../../dashboard-presentation';
import { financeError } from '../../errors';

import { formatBrlAmount } from '../../money';
import type { FinanceCategory } from '../../types';
import type { WorkDataAccess } from '../data';
import type { WorkItem, WorkOverview, WorkPayment, WorkSnapshot, WorkTotals } from '../types';
import { WorkEditor, WorkModal, WorkPaymentEditor, WorkSheet } from './work-forms';
import { WorkHistoryList } from './work-history-list';
import { WorkHistoryReceiptCard } from './work-history-cards';
import { WorkRow } from './work-row';
import { WorkMainList } from './work-main';
import { WorkJobDetails } from './work-job-details';
import { WorkClientsList } from './work-clients';

type Dialog = { kind: 'edit'; id: string | null; partyId?: string } | { kind: 'details'; id: string }
  | { kind: 'payment'; id?: string; partyId?: string } | { kind: 'client'; partyId: string }
  | { kind: 'history'; partyId: string };

export function WorkView({ data, categories, access, mutate, onCreateCategory, initialEntryId, destination = 'main', scrollOffset = 0, onScroll }: {
  data: WorkOverview; categories: FinanceCategory[]; access: WorkDataAccess; mutate: <T>(action: () => T) => T; onCreateCategory: (name: string) => FinanceCategory;
  initialEntryId?: string; destination?: 'main' | 'clients' | 'history';
  scrollOffset?: number; onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}) {
  const [dialog, setDialog] = useState<Dialog | null>(() => initialEntryId ? { kind: 'details', id: initialEntryId } : null);
  const [error, setError] = useState<string | null>(null);

  const [receiptId, setReceiptId] = useState<string | null>(null);

  const [focusedData, setFocusedData] = useState<WorkOverview | null>(null);
  const [detail, setDetail] = useState<WorkSnapshot | null>(null);
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
  function paymentRow(payment: WorkPayment, position: number, count: number) {
    return <WorkHistoryReceiptCard key={payment.transaction.id} payment={payment} categories={categories} position={position} count={count}
      expanded={receiptId === payment.transaction.id} onToggle={() => setReceiptId(receiptId === payment.transaction.id ? null : payment.transaction.id)} onUndo={() => undo(payment)} />;
  }
  return <View style={styles.main}>
    {destination === 'main' && <WorkMainList data={data} error={error} scrollOffset={scrollOffset} onScroll={onScroll}
      onAdd={() => open({ kind: 'edit', id: null })} onPayment={() => open({ kind: 'payment' })}
      onOpen={item => open({ kind: 'details', id: item.entry.id })}
      onClients={() => router.push('/work/clients')} onHistory={() => router.push('/work/history')} />}
    {destination === 'clients' && <WorkClientsList data={data} error={error} onScroll={onScroll}
      onCreate={value => mutate(() => access.createCounterparty(value))}
      onOpen={id => open({ kind: 'client', partyId: id })} onHistory={id => open({ kind: 'history', partyId: id })} onArchive={archive} />}
    {destination === 'history' && <WorkHistoryList access={access} refreshToken={data} actionError={error} onScroll={onScroll}
      onOpenJob={(item) => open({ kind: 'details', id: item.entry.id })} renderReceipt={paymentRow} />}

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
      {dialog.kind === 'details' && <WorkJobDetails item={current} payments={detail?.items.some(item => item.entry.id === dialog.id) ? detail.payments : null}
        categories={categories} error={error} loading={detail === null && !error} expandedReceiptId={receiptId}
        onToggleReceipt={id => setReceiptId(receiptId === id ? null : id)} onDismiss={() => setDialog(null)}
        onPayment={() => current && open({ kind: 'payment', id: current.entry.id })}
        onEdit={() => current && open({ kind: 'edit', id: current.entry.id })}
        onClient={() => current && open({ kind: 'client', partyId: current.counterparty.id })}
        onDelete={() => current && remove(current)} onUndo={undo} />}
      {dialog.kind === 'history' && <WorkSheet appearance="v2" fillHeight title={client ? client.name + ' · History' : 'Client history'} onDismiss={() => setDialog(null)}
        scrollBody={<WorkHistoryList sheet access={access} refreshToken={data} counterpartyId={dialog.partyId} actionError={error}
          onOpenJob={(item) => open({ kind: 'details', id: item.entry.id })} renderReceipt={paymentRow} />} />}
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
  main: { flex: 1 },
  section: { gap: Space.lg }, heading: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  row: { paddingVertical: Space.md, gap: Space.sm, minHeight: ControlSize.touch, borderBottomWidth: 1 },
  pair: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, alignItems: 'center' },
  body: { flexGrow: 1, flexShrink: 1, flexBasis: 160, minHeight: ControlSize.touch, gap: Space.sm },
  name: { flexGrow: 1, flexShrink: 1, flexBasis: 160 }, amount: { flexShrink: 1, fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, alignItems: 'center' },
  comparison: { gap: Space.lg }, metric: { flex: 1, minWidth: 0, gap: Space.xs },
});

import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { FormButton, FormError, FormField } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dateLabel } from '@/utils/calendar';

import { financeError } from '../../errors';
import { financeCategoryName } from '../../form';
import { formatBrlAmount } from '../../money';
import type { FinanceCategory } from '../../types';
import type { WorkDataAccess } from '../data';
import type { WorkItem, WorkPayment, WorkSnapshot } from '../types';
import { groupWorkItems } from '../presentation';
import { WorkEditor, WorkModal, WorkPaymentEditor, WorkSheet } from './work-forms';
import { WorkRow } from './work-row';

type Dialog = { kind: 'edit'; id: string | null } | { kind: 'details'; id: string } | { kind: 'payment'; id?: string } | { kind: 'counterparties' } | { kind: 'history' };
export function WorkView({ data, categories, access, mutate, onCreateCategory }: {
  data: WorkSnapshot; categories: FinanceCategory[]; access: WorkDataAccess; mutate: <T>(action: () => T) => T; onCreateCategory: (name: string) => FinanceCategory;
}) {
  const colors = useTheme();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [historyLimit, setHistoryLimit] = useState(20);
  const { overdue, outstanding, settled: paid } = groupWorkItems(data.items);
  const current = dialog && 'id' in dialog ? data.items.find((item) => item.entry.id === dialog.id) : undefined;
  function run(action: () => void) { try { action(); setError(null); } catch (cause) { setError(financeError(cause, 'Unable to update Work.')); } }
  function open(next: Dialog) { setError(null); setDialog(next); }
  function confirm(title: string, message: string, action: () => void) {
    Alert.alert(title, message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', onPress: () => run(action) }]);
  }
  function remove(item: WorkItem) {
    confirm('Delete work entry?', 'This removes unpaid work from Work totals. Entries with payments require Undo payment first.', () => { mutate(() => access.delete(item.entry.id)); setDialog(null); });
  }
  function undo(payment: WorkPayment) {
    confirm('Undo payment?', `Remove ${formatBrlAmount(payment.transaction.amountMinor)} from Finance Income and reopen the outstanding amounts for all ${payment.allocations.length} work allocation(s) in this payment?`,
      () => mutate(() => access.undoPayment(payment.transaction.id)));
  }
  function paymentCard(payment: WorkPayment) {
    const category = financeCategoryName(payment.transaction, categories);
    return <View key={payment.transaction.id} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <ThemedText>{payment.counterparty.name}</ThemedText>
      <ThemedText type="smallBold">Received {formatBrlAmount(payment.transaction.amountMinor)} · {dateLabel(payment.transaction.transactionDate)}</ThemedText>
      {!!category && <ThemedText type="small" themeColor="textSecondary">{category}</ThemedText>}
      {payment.allocations.map((allocation) => <ThemedText key={allocation.id} type="small">{allocation.description} · {formatBrlAmount(allocation.amountMinor)}</ThemedText>)}
      <FormButton label="Undo payment" accessibilityLabel={`Undo ${payment.counterparty.name} payment of ${formatBrlAmount(payment.transaction.amountMinor)}, ${dateLabel(payment.transaction.transactionDate)}`} onPress={() => undo(payment)} />
    </View>;
  }
  return <View style={styles.section}>
    <ThemedText type="smallBold" accessibilityRole="header">Work Balance</ThemedText>
    <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <ThemedText>Earned {formatBrlAmount(data.totals.earnedMinor)}</ThemedText>
      <ThemedText>Received {formatBrlAmount(data.totals.receivedMinor)}</ThemedText>
      <ThemedText type="smallBold">Outstanding {formatBrlAmount(data.totals.outstandingMinor)}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">All current work, independent of the Finance dashboard period.</ThemedText>
    </View>
    <View style={styles.buttons}>
      <FormButton label="Add work" onPress={() => open({ kind: 'edit', id: null })} />
      <FormButton label="Record payment" disabled={!data.totals.outstandingMinor} onPress={() => open({ kind: 'payment' })} />
      <FormButton label="Clients" onPress={() => { setName(''); open({ kind: 'counterparties' }); }} />
      <FormButton label="History" onPress={() => { setHistoryLimit(20); open({ kind: 'history' }); }} />
    </View>
    <FormError message={error} />
    {!data.items.length && <ThemedText themeColor="textSecondary">No work yet. Record Hourly or Fixed work, then record payments when money arrives.</ThemedText>}
    {data.counterpartyTotals.filter((group) => group.outstandingMinor > 0n).map((group) => <ThemedText key={group.counterparty.id} type="small">{group.counterparty.name} · Outstanding {formatBrlAmount(group.outstandingMinor)}</ThemedText>)}
    {!!overdue.length && <><ThemedText type="smallBold" accessibilityRole="header">Payment overdue ({overdue.length})</ThemedText>{overdue.map((item) => <WorkRow key={item.entry.id} item={item} onPress={() => open({ kind: 'details', id: item.entry.id })} />)}</>}
    {!!outstanding.length && <><ThemedText type="smallBold" accessibilityRole="header">Outstanding ({outstanding.length})</ThemedText>{outstanding.map((item) => <WorkRow key={item.entry.id} item={item} onPress={() => open({ kind: 'details', id: item.entry.id })} />)}</>}
    {!!data.items.length && !overdue.length && !outstanding.length && <ThemedText themeColor="textSecondary">No outstanding amount. Open History to review work and payments.</ThemedText>}
    {dialog && <WorkModal onDismiss={() => setDialog(null)}>
      {dialog.kind === 'edit' && <WorkEditor key={dialog.id ?? 'new'} item={current ?? null} counterparties={data.counterparties}
        onCreateCounterparty={(value) => mutate(() => access.createCounterparty(value))} onDismiss={() => setDialog(null)}
        onSave={(draft) => mutate(() => dialog.id ? access.edit(dialog.id, draft) : access.create(draft))} />}
      {dialog.kind === 'payment' && <WorkPaymentEditor data={data} categories={categories} initialItem={current?.outstandingMinor ? current : undefined}
        onCreateCategory={onCreateCategory} onSave={(draft) => mutate(() => access.recordPayment(draft))} onDismiss={() => setDialog(null)} />}
      {dialog.kind === 'details' && <WorkSheet title="Work details" onDismiss={() => setDialog(null)}>
        <FormError message={error} />
        {current ? <>
          <WorkRow item={current} />
          <View style={styles.buttons}>
            <FormButton label="Edit" onPress={() => open({ kind: 'edit', id: current.entry.id })} />
            <FormButton label="Record payment" disabled={!current.outstandingMinor} onPress={() => open({ kind: 'payment', id: current.entry.id })} />
            <FormButton label="Delete" disabled={current.receivedMinor > 0} onPress={() => remove(current)} />
          </View>
          {current.receivedMinor > 0 && <ThemedText type="small" themeColor="textSecondary">Undo payments before deleting this work entry.</ThemedText>}
          <ThemedText type="smallBold" accessibilityRole="header">Payments</ThemedText>
          {data.payments.filter((payment) => payment.allocations.some((allocation) => allocation.workEntryId === current.entry.id)).map(paymentCard)}
          {!current.receivedMinor && <ThemedText themeColor="textSecondary">No payments allocated.</ThemedText>}
        </> : <ThemedText>This work entry is no longer available.</ThemedText>}
      </WorkSheet>}
      {dialog.kind === 'counterparties' && <WorkSheet title="Clients" onDismiss={() => setDialog(null)}>
        <FormError message={error} />
        <FormField label="Name *" value={name} onChangeText={(value) => { setName(value); setError(null); }} />
        <FormButton label="Create client" disabled={!name.trim()} onPress={() => run(() => { mutate(() => access.createCounterparty(name)); setName(''); })} />
        {data.counterparties.map((party) => <View key={party.id} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <ThemedText>{party.name}{party.deletedAt !== null ? ' (archived)' : ''}</ThemedText>
          {party.deletedAt === null && <FormButton label="Archive" accessibilityLabel={`Archive ${party.name}`} onPress={() => confirm('Archive client?', 'Historical work and payments keep this name. This client will no longer be available for new work.', () => mutate(() => access.archiveCounterparty(party.id)))} />}
        </View>)}
      </WorkSheet>}
      {dialog.kind === 'history' && <WorkSheet title="Work history" onDismiss={() => setDialog(null)}>
        <FormError message={error} />
        <ThemedText type="smallBold" accessibilityRole="header">Settled work ({paid.length})</ThemedText>
        {!paid.length && <ThemedText themeColor="textSecondary">No settled work yet.</ThemedText>}
        {paid.slice(0, historyLimit).map((item) => <WorkRow key={item.entry.id} item={item} onPress={() => open({ kind: 'details', id: item.entry.id })} />)}
        <ThemedText type="smallBold" accessibilityRole="header">Received payments ({data.payments.length})</ThemedText>
        {data.payments.slice(0, historyLimit).map(paymentCard)}
        {Math.max(paid.length, data.payments.length) > historyLimit && <FormButton label="Load more history" onPress={() => setHistoryLimit((limit) => limit + 20)} />}
      </WorkSheet>}
    </WorkModal>}
  </View>;
}
const styles = StyleSheet.create({
  section: { gap: Spacing.three }, card: { padding: Spacing.three, borderRadius: Spacing.two, gap: Spacing.two },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});

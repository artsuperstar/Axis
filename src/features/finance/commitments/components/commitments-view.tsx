import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { FormButton, FormError } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dateLabel } from '@/utils/calendar';

import { financeError } from '../../errors';
import { financeCategoryName } from '../../form';
import { formatBrlAmount } from '../../money';
import type { FinanceCategory } from '../../types';
import type { CommitmentDataAccess, CommitmentHistory } from '../data';
import { occurrenceLabel } from '../scheduling';
import { commitmentKindLabels, type CommitmentItem, type DisplayOccurrence } from '../types';
import { CommitmentEditor, CommitmentModal, CommitmentPayment, CommitmentResume, CommitmentSheet } from './commitment-forms';

type Dialog = { kind: 'edit'; item: CommitmentItem | null }
  | { kind: 'history'; data: CommitmentHistory }
  | { kind: 'payment'; item: CommitmentItem; occurrence: DisplayOccurrence }
  | { kind: 'resume'; item: CommitmentItem; date: string };

export function CommitmentsView({ items, categories, access, today, mutate, onCreateCategory, initialDetail }: {
  items: CommitmentItem[]; categories: FinanceCategory[]; access: CommitmentDataAccess; today: string; mutate: <T>(action: () => T) => T;
  onCreateCategory: (name: string) => FinanceCategory;
  initialDetail?: { data: CommitmentHistory; occurrence: DisplayOccurrence | null };
}) {
  const colors = useTheme();
  const [dialog, setDialog] = useState<Dialog | null>(() => initialDetail ? { kind: 'history', data: initialDetail.data } : null);
  const [error, setError] = useState<string | null>(null);
  const [focusedOccurrence] = useState(initialDetail?.occurrence ?? null);
  const active = items.filter((item) => item.commitment.status === 'active');
  const paused = items.filter((item) => item.commitment.status === 'paused');
  const historical = items.filter((item) => ['ended', 'completed'].includes(item.commitment.status));
  const overdue = items.flatMap((item) => item.outstanding.filter((row) => row.dueDate < today).map((row) => ({ item, row })));
  const dueToday = items.flatMap((item) => item.outstanding.filter((row) => row.dueDate === today).map((row) => ({ item, row })));

  function run(action: () => void) {
    try { action(); setError(null); }
    catch (cause) { setError(financeError(cause, 'Unable to update Commitments.')); }
  }
  function history(item: CommitmentItem) {
    run(() => { const data = mutate(() => access.readHistory(item.commitment.id)); setDialog({ kind: 'history', data }); });
  }
  function resume(item: CommitmentItem) {
    run(() => setDialog({ kind: 'resume', item, date: access.resumeProposal(item.commitment.id) }));
  }
  function confirm(title: string, message: string, action: () => void) {
    Alert.alert(title, message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', onPress: () => run(action) }]);
  }
  function refreshHistory(id: string) {
    const data = mutate(() => access.readHistory(id, dialog?.kind === 'history' ? dialog.data.pageBefore : undefined));
    setDialog({ kind: 'history', data });
  }
  function skip(item: CommitmentItem, row: DisplayOccurrence, fromHistory = false) {
    confirm('Skip this occurrence?', 'This obligation will no longer need payment. Later occurrences are unchanged.', () => {
      mutate(() => access.skip(row));
      if (fromHistory) refreshHistory(item.commitment.id);
    });
  }
  function categoryLabel(item: CommitmentItem) {
    return financeCategoryName({ type: 'expense', categoryId: item.commitment.categoryId }, categories);
  }
  function progress(item: CommitmentItem) {
    return item.commitment.installmentCount === null ? null : `${item.resolvedCount} / ${item.commitment.installmentCount} resolved · ${item.remainingCount} remaining`;
  }
  function pending(item: CommitmentItem, row: DisplayOccurrence, fromHistory = false) {
    return <View key={row.id ?? `${row.scheduleId}:${row.dueDate}`} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <ThemedText>{item.commitment.title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{commitmentKindLabels[item.commitment.kind]}{row.installmentIndex ? ` · ${row.installmentIndex} / ${item.commitment.installmentCount}` : ''}</ThemedText>
      <ThemedText type="smallBold">{occurrenceLabel(row.status, row.dueDate, today)} · {dateLabel(row.dueDate)}</ThemedText>
      <ThemedText>Expected {formatBrlAmount(row.expectedAmountMinor)}</ThemedText>
      {!!categoryLabel(item) && <ThemedText type="small" themeColor="textSecondary">{categoryLabel(item)}</ThemedText>}
      {!!progress(item) && <ThemedText type="small" themeColor="textSecondary">{progress(item)}</ThemedText>}
      <View style={styles.buttons}>
        <FormButton label="Paid" accessibilityLabel={`Mark ${item.commitment.title}, due ${dateLabel(row.dueDate)}, as paid`} onPress={() => setDialog({ kind: 'payment', item, occurrence: row })} />
        <FormButton label="Skip" accessibilityLabel={`Skip ${item.commitment.title}, due ${dateLabel(row.dueDate)}`} onPress={() => skip(item, row, fromHistory)} />
        {!fromHistory && <FormButton label="Details / History" onPress={() => history(item)} />}
      </View>
    </View>;
  }
  function management(item: CommitmentItem) {
    return <View key={item.commitment.id} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <ThemedText>{item.commitment.title}</ThemedText>
      <ThemedText type="small">{commitmentKindLabels[item.commitment.kind]} · {item.commitment.status[0].toUpperCase() + item.commitment.status.slice(1)}</ThemedText>
      {!!progress(item) && <ThemedText type="small">{progress(item)}</ThemedText>}
      {item.commitment.status === 'completed' && item.commitment.completedAt && <ThemedText type="small">Completed {new Date(item.commitment.completedAt).toLocaleDateString()}</ThemedText>}
      {item.commitment.status === 'active' && <ThemedText type="small">No new due date in the next three calendar months. Anchor: {dateLabel(item.schedule.startDate)}.</ThemedText>}
      <ThemedText type="small">Total paid: {formatBrlAmount(item.totalPaidMinor)}</ThemedText>
      {!!categoryLabel(item) && <ThemedText type="small" themeColor="textSecondary">{categoryLabel(item)}</ThemedText>}
      <View style={styles.buttons}>
        <FormButton label="Details / History" onPress={() => history(item)} />
        {item.canResume && <FormButton label="Resume" onPress={() => resume(item)} />}
      </View>
      {item.commitment.status === 'paused' && item.commitment.kind === 'installment' && !item.canResume && <ThemedText type="small">All installments already have due dates. Resolve the outstanding occurrences.</ThemedText>}
    </View>;
  }

  const detail = dialog?.kind === 'history' ? dialog.data : null;
  // Put the Calendar-selected obligation first, including old unresolved dates, without duplicating it in history.
  const focused = detail && focusedOccurrence?.commitmentId === detail.commitment.id
    ? detail.history.find(({ occurrence }) => occurrence.dueDate === focusedOccurrence.dueDate && occurrence.status === 'pending')?.occurrence
      ?? (detail.commitment.status === 'active' && !detail.history.some(({ occurrence }) => occurrence.dueDate === focusedOccurrence.dueDate) ? focusedOccurrence : null)
    : null;
  return <View style={styles.section}>
    <FormButton label="Add commitment" onPress={() => { setError(null); setDialog({ kind: 'edit', item: null }); }} />
    <FormError message={error} />
    {!items.length && <ThemedText themeColor="textSecondary">No commitments yet. Plan a Bill, Subscription, or Installment without adding an Expense.</ThemedText>}
    {!!items.length && <ThemedText type="small" themeColor="textSecondary">All unresolved due occurrences appear here. Open Details / History for older Paid or Skipped occurrences.</ThemedText>}
    {!!overdue.length && <>
      <ThemedText type="smallBold" accessibilityRole="header">Overdue ({overdue.length})</ThemedText>
      {overdue.sort((a, b) => a.row.dueDate.localeCompare(b.row.dueDate)).map(({ item, row }) => pending(item, row))}
    </>}
    {!!dueToday.length && <>
      <ThemedText type="smallBold" accessibilityRole="header">Due today</ThemedText>
      {dueToday.map(({ item, row }) => pending(item, row))}
    </>}
    {!!active.length && <>
      <ThemedText type="smallBold" accessibilityRole="header">Upcoming</ThemedText>
      {active.map((item) => item.upcoming && item.upcoming.dueDate > today ? pending(item, item.upcoming)
        : !item.upcoming ? management(item) : null)}
    </>}
    {!!paused.length && <><ThemedText type="smallBold" accessibilityRole="header">Paused</ThemedText>{paused.map(management)}</>}
    {!!historical.length && <><ThemedText type="smallBold" accessibilityRole="header">History</ThemedText>{historical.map(management)}</>}

    {dialog && <CommitmentModal onDismiss={() => setDialog(null)}>
    {dialog.kind === 'edit' && <CommitmentEditor item={dialog.item} categories={categories} onCreateCategory={onCreateCategory} onDismiss={() => setDialog(null)}
      onSave={(draft) => mutate(() => dialog.item ? access.edit(dialog.item.commitment.id, draft) : access.create(draft))} />}
    {dialog?.kind === 'payment' && <CommitmentPayment occurrence={dialog.occurrence} title={dialog.item.commitment.title} onDismiss={() => setDialog(null)}
      onSave={(amount, date) => mutate(() => access.pay(dialog.occurrence, amount, date))} />}
    {dialog?.kind === 'resume' && <CommitmentResume title={dialog.item.commitment.title} proposedDate={dialog.date} onDismiss={() => setDialog(null)}
      onResume={(date) => mutate(() => access.resume(dialog.item.commitment.id, date))} />}
    {detail && <CommitmentSheet title={detail.commitment.title} onDismiss={() => setDialog(null)}>
      <FormError message={error} />
      <ThemedText>{commitmentKindLabels[detail.commitment.kind]} · {detail.commitment.status}</ThemedText>
      <ThemedText>Expected {formatBrlAmount(detail.commitment.expectedAmountMinor)}</ThemedText>
      {!!categoryLabel(detail) && <ThemedText type="small">{categoryLabel(detail)}</ThemedText>}
      <ThemedText type="small">Monthly on day {detail.schedule.billingDay} · Anchor {dateLabel(detail.schedule.startDate)}</ThemedText>
      {!!progress(detail) && <ThemedText type="small">{progress(detail)}</ThemedText>}
      <ThemedText>Total paid: {formatBrlAmount(detail.totalPaidMinor)}</ThemedText>
      <View style={styles.buttons}>
        <FormButton label="Edit" onPress={() => setDialog({ kind: 'edit', item: detail })} />
        {detail.commitment.status === 'active' && <FormButton label="Pause" onPress={() => confirm('Pause commitment?', 'Existing occurrences remain. No new due dates are generated while paused.', () => { mutate(() => access.pause(detail.commitment.id)); refreshHistory(detail.commitment.id); })} />}
        {detail.canResume && <FormButton label="Resume" onPress={() => resume(detail)} />}
        {detail.commitment.kind !== 'installment' && ['active', 'paused'].includes(detail.commitment.status) && <FormButton label="End" onPress={() => confirm('End commitment?', 'Future scheduling stops. Existing obligations and history remain.', () => { mutate(() => access.end(detail.commitment.id)); refreshHistory(detail.commitment.id); })} />}
      </View>
      {detail.versions.length > 1 && <>
        <ThemedText type="smallBold" accessibilityRole="header">Schedules</ThemedText>
        {detail.versions.map((version) => <ThemedText key={version.id} type="small" themeColor="textSecondary">
          Anchor {dateLabel(version.startDate)} · day {version.billingDay} · {formatBrlAmount(version.expectedAmountMinor)}{version.effectiveUntil ? ` · closed before ${dateLabel(version.effectiveUntil)}` : ' · current'}
        </ThemedText>)}
      </>}
      <ThemedText type="smallBold" accessibilityRole="header">Occurrence history</ThemedText>
      {focused && pending(detail, focused, true)}
      {!detail.history.length && <ThemedText themeColor="textSecondary">No due or resolved occurrences yet.</ThemedText>}
      {detail.history.filter(({ occurrence }) => occurrence.dueDate !== focused?.dueDate).map(({ occurrence: row, payment }) => row.status === 'pending' ? pending(detail, row, true) : <View key={row.id} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
        <ThemedText type="smallBold">{occurrenceLabel(row.status, row.dueDate, today)} · {dateLabel(row.dueDate)}{row.installmentIndex ? ` · ${row.installmentIndex} / ${detail.commitment.installmentCount}` : ''}</ThemedText>
        <ThemedText type="small">Expected {formatBrlAmount(row.expectedAmountMinor)}</ThemedText>
        {payment && <ThemedText type="small">Paid {formatBrlAmount(payment.amountMinor)} · {dateLabel(payment.transactionDate)}</ThemedText>}
        <FormButton label={row.status === 'paid' ? 'Undo payment' : 'Reopen'} onPress={() => confirm(row.status === 'paid' ? 'Undo payment?' : 'Reopen occurrence?',
          row.status === 'paid' ? 'The linked Expense will be removed from ledger totals and this occurrence will be Pending again.' : 'This occurrence will need payment again.',
          () => { mutate(() => access.reopen(row.id)); refreshHistory(detail.commitment.id); })} />
      </View>)}
      {detail.nextBefore && <FormButton label="Load earlier history" onPress={() => run(() => {
        const data = mutate(() => access.readHistory(detail.commitment.id, detail.nextBefore!)); setDialog({ kind: 'history', data });
      })} />}
    </CommitmentSheet>}
    </CommitmentModal>}
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: Spacing.three }, card: { padding: Spacing.three, borderRadius: Spacing.two, gap: Spacing.two },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});

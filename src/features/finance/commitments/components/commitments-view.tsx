import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ContextMenu, type ContextMenuAction } from '@/components/context-menu';
import { FormButton, FormError } from '@/components/form-controls';
import { BackButton } from '@/components/back-button';
import { StatusText } from '@/components/status-text';
import { ThemedText } from '@/components/themed-text';
import { ControlSize, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dateLabel } from '@/utils/calendar';

import { financeError } from '../../errors';
import { financeCategoryName } from '../../form';
import { formatBrlAmount } from '../../money';
import type { FinanceCategory } from '../../types';
import { appendCommitmentHistory, type CommitmentDataAccess, type CommitmentHistory } from '../data';
import { commitmentSections, commitmentStatusLabel, focusedCommitmentOccurrence, installmentLabel } from '../presentation';
import { occurrenceLabel } from '../scheduling';
import { commitmentKindLabels, type CommitmentItem, type DisplayOccurrence } from '../types';
import { CommitmentEditor, CommitmentModal, CommitmentPayment, CommitmentResume, CommitmentSheet } from './commitment-forms';

type Details = { kind: 'details'; data: CommitmentHistory; historyVisible: boolean; focus?: DisplayOccurrence | null };
type Dialog = { kind: 'edit'; item: CommitmentItem | null } | Details
  | { kind: 'payment'; item: CommitmentItem; occurrence: DisplayOccurrence }
  | { kind: 'resume'; item: CommitmentItem; date: string };

export function CommitmentsView({ items, categories, access, today, mutate, onCreateCategory, initialDetail }: {
  items: CommitmentItem[]; categories: FinanceCategory[]; access: CommitmentDataAccess; today: string; mutate: <T>(action: () => T) => T;
  onCreateCategory: (name: string) => FinanceCategory;
  initialDetail?: { data: CommitmentHistory; occurrence: DisplayOccurrence | null };
}) {
  const colors = useTheme();
  const [surface, setSurface] = useState<'obligations' | 'manage' | 'history'>('obligations');
  const [dialog, setDialog] = useState<Dialog | null>(() => initialDetail
    ? { kind: 'details', data: initialDetail.data, historyVisible: false, focus: initialDetail.occurrence } : null);
  const [error, setError] = useState<string | null>(null);
  const sections = commitmentSections(items, today);
  const historyItems = items.filter((item) => item.resolvedCount > 0);
  const detail = dialog?.kind === 'details' ? dialog : null;

  function run(action: () => void) {
    try { action(); setError(null); }
    catch (cause) { setError(financeError(cause, 'Unable to update Commitments.')); }
  }
  function openDetails(item: CommitmentItem, historyVisible = false, focus?: DisplayOccurrence) {
    run(() => {
      const data = mutate(() => access.readHistory(item.commitment.id));
      setDialog({ kind: 'details', data, historyVisible, focus });
    });
  }
  function resume(item: CommitmentItem) {
    run(() => setDialog({ kind: 'resume', item, date: access.resumeProposal(item.commitment.id) }));
  }
  function confirm(title: string, message: string, action: () => void, destructive = false) {
    Alert.alert(title, message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', style: destructive ? 'destructive' : 'default', onPress: () => run(action) }]);
  }
  function refreshDetails(id: string) {
    const oldest = detail?.data.pageBefore;
    const data = mutate(() => {
      let refreshed = access.readHistory(id);
      while (oldest && refreshed.nextBefore && (!refreshed.pageBefore || refreshed.pageBefore > oldest)) {
        refreshed = appendCommitmentHistory(refreshed, access.readHistory(id, refreshed.nextBefore));
      }
      return refreshed;
    });
    setDialog({ kind: 'details', data, historyVisible: detail?.historyVisible ?? false, focus: detail?.focus });
  }
  function skip(item: CommitmentItem, row: DisplayOccurrence) {
    confirm('Skip this occurrence?', 'This obligation will no longer need payment. Later occurrences are unchanged.', () => {
      mutate(() => access.skip(row));
      if (detail) refreshDetails(item.commitment.id);
    });
  }
  function categoryLabel(item: CommitmentItem) {
    return financeCategoryName({ type: 'expense', categoryId: item.commitment.categoryId }, categories);
  }
  function progress(item: CommitmentItem) {
    return item.commitment.installmentCount === null ? null : `${item.resolvedCount} of ${item.commitment.installmentCount} resolved`;
  }
  function seriesActions(item: CommitmentItem): ContextMenuAction[] {
    const name = item.commitment.title;
    return [
      { label: 'Edit', accessibilityLabel: `Edit ${name}`, onPress: () => setDialog({ kind: 'edit', item }) },
      ...(item.commitment.status === 'active' ? [{ label: 'Pause', accessibilityLabel: `Pause ${name}`, onPress: () => confirm('Pause commitment?',
        'Existing occurrences remain. No new due dates are generated while paused.', () => {
          mutate(() => access.pause(item.commitment.id)); if (detail) refreshDetails(item.commitment.id);
        }) }] : []),
      ...(item.canResume ? [{ label: 'Resume', accessibilityLabel: `Resume ${name}`, onPress: () => resume(item) }] : []),
      ...(item.commitment.kind !== 'installment' && ['active', 'paused'].includes(item.commitment.status) ? [{ label: 'End', variant: 'destructive' as const,
        accessibilityLabel: `End ${name}`, onPress: () => confirm('End commitment?', 'Future scheduling stops. Existing obligations and history remain.', () => {
          mutate(() => access.end(item.commitment.id)); if (detail) refreshDetails(item.commitment.id);
        }, true) }] : []),
      { label: 'History', accessibilityLabel: `History for ${name}`, onPress: () => openDetails(item, true) },
    ];
  }
  function pending(item: CommitmentItem, row: DisplayOccurrence, inDetails = false) {
    const state = occurrenceLabel(row.status, row.dueDate, today);
    const installment = installmentLabel(item, row);
    const due = row.dueDate === today ? 'Due today' : `Due ${dateLabel(row.dueDate)}`;
    const subject = `${item.commitment.title}, due ${dateLabel(row.dueDate)}`;
    const show = () => inDetails && detail ? setDialog({ ...detail, historyVisible: false, focus: row }) : openDetails(item, false, row);
    return <View key={row.id ?? `${row.scheduleId}:${row.dueDate}`} testID="commitment-obligation" style={[styles.row, { borderColor: colors.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${item.commitment.title}, expected ${formatBrlAmount(row.expectedAmountMinor)}, ${state}, due ${dateLabel(row.dueDate)}${installment ? `, installment ${installment}` : ''}`}
        accessibilityHint="View obligation details. Payment requires confirmation." onPress={show} style={styles.body}>
        <View style={styles.nameAmount}>
          <ThemedText type="cardTitle" style={styles.name}>{item.commitment.title}</ThemedText>
          <ThemedText type="cardTitle" style={styles.amount}>{formatBrlAmount(row.expectedAmountMinor)}</ThemedText>
        </View>
        <StatusText tone={state === 'Overdue' ? 'attention' : 'neutral'}>{[installment, state === 'Overdue' ? `Overdue · ${due}` : due].filter(Boolean).join(' · ')}</StatusText>
        <ThemedText type="metadata" themeColor="textSecondary">{commitmentKindLabels[item.commitment.kind]}{categoryLabel(item) ? ` · ${categoryLabel(item)}` : ''}</ThemedText>
      </Pressable>
      <View style={styles.actions}>
        <FormButton variant="primary" label="Pay" accessibilityLabel={`Pay ${subject}`} onPress={() => setDialog({ kind: 'payment', item, occurrence: row })} />
        <ContextMenu label={`Actions for ${subject}`} actions={[
          { label: 'Skip', accessibilityLabel: `Skip ${subject}`, onPress: () => skip(item, row) },
          { label: 'View commitment', accessibilityLabel: `View ${item.commitment.title} commitment`, onPress: () => openDetails(item) },
        ]} />
      </View>
    </View>;
  }
  function seriesRow(item: CommitmentItem, historical = false) {
    const name = item.commitment.title;
    return <View key={item.commitment.id} style={[styles.row, { borderColor: colors.border }]}>
      <View style={styles.seriesRow}>
        <Pressable style={[styles.body, styles.seriesBody]} accessibilityRole="button" accessibilityLabel={`${historical ? 'History for' : 'Manage'} ${name}`}
          accessibilityHint={historical ? 'View paid and skipped occurrences' : 'View schedule and series details'} onPress={() => openDetails(item, historical)}>
          <View style={styles.nameAmount}>
            <ThemedText type="cardTitle" style={styles.name}>{name}</ThemedText>
            <ThemedText type="secondary" style={styles.amount}>{historical ? `Paid ${formatBrlAmount(item.totalPaidMinor)}` : formatBrlAmount(item.commitment.expectedAmountMinor)}</ThemedText>
          </View>
          <StatusText tone="neutral">{commitmentKindLabels[item.commitment.kind]} · {commitmentStatusLabel(item)}</StatusText>
          <ThemedText type="metadata" themeColor="textSecondary">{historical ? `${item.resolvedCount} paid or skipped` : `Monthly on day ${item.schedule.billingDay} · From ${dateLabel(item.schedule.startDate)}`}</ThemedText>
          {!historical && !!progress(item) && <ThemedText type="metadata" themeColor="textSecondary">{progress(item)}</ThemedText>}
        </Pressable>
        {!historical && <ContextMenu label={`Series options for ${name}`} actions={seriesActions(item)} />}
      </View>
      {item.commitment.status === 'paused' && item.commitment.kind === 'installment' && !item.canResume && <ThemedText type="secondary" themeColor="textSecondary">All installments already have due dates. Resolve the unpaid occurrences.</ThemedText>}
    </View>;
  }

  const focused = detail ? focusedCommitmentOccurrence(detail.data, detail.focus) : null;
  const detailPending = detail ? focused ? [focused] : [...detail.data.outstanding,
    ...(detail.data.upcoming && detail.data.upcoming.dueDate > today ? [detail.data.upcoming] : [])] : [];
  const resolved = detail?.data.history.filter(({ occurrence }) => occurrence.status !== 'pending') ?? [];
  return <View style={styles.section}>
    <View style={styles.heading}>
      {surface !== 'obligations' && <BackButton accessibilityLabel="Back to Commitments" onPress={() => { setSurface('obligations'); setError(null); }} />}
      <ThemedText type="sectionHeading" accessibilityRole="header" style={styles.title}>{surface === 'obligations' ? 'Commitments' : surface === 'manage' ? 'Manage commitments' : 'Commitment History'}</ThemedText>
      {surface === 'obligations' && <ContextMenu label="Commitment options" onOpen={() => setError(null)} actions={[
        { label: 'Manage commitments', onPress: () => setSurface('manage') }, { label: 'History', onPress: () => setSurface('history') },
      ]} />}
    </View>
    <FormError message={error} />
    {surface === 'obligations' && <>
      <View style={styles.creation}><FormButton variant="primary" label="Add commitment" onPress={() => { setError(null); setDialog({ kind: 'edit', item: null }); }} /></View>
      {!sections.length && <View style={styles.empty}>
        <ThemedText type="cardTitle">{!items.length ? 'No commitments yet' : 'No obligations to resolve in this preview'}</ThemedText>
        <ThemedText type="secondary" themeColor="textSecondary">{!items.length ? 'Add a Bill, Subscription, or Installment. Expenses are recorded when you pay.' : 'Manage commitments to review schedules and statuses.'}</ThemedText>
      </View>}
      {sections.map((section) => <View key={section.title} testID={`commitment-section-${section.title.toLowerCase()}`} style={styles.section}>
        <ThemedText type="sectionHeading" themeColor={section.title === 'Overdue' ? 'warning' : 'textPrimary'} accessibilityRole="header">{section.title}{section.title === 'Overdue' ? ` (${section.rows.length})` : ''}</ThemedText>
        {section.rows.map(({ item, occurrence }) => pending(item, occurrence))}
      </View>)}
    </>}
    {surface === 'manage' && <>
      {!items.length && <ThemedText type="secondary" themeColor="textSecondary">No commitment series yet. Return to Commitments to add one.</ThemedText>}
      {items.map((item) => seriesRow(item))}
    </>}
    {surface === 'history' && <>
      <ThemedText type="secondary" themeColor="textSecondary">Choose a commitment to view its paid and skipped occurrences.</ThemedText>
      {!historyItems.length && <ThemedText type="secondary" themeColor="textSecondary">No paid or skipped occurrences yet.</ThemedText>}
      {historyItems.map((item) => seriesRow(item, true))}
    </>}

    {dialog && <CommitmentModal onDismiss={() => setDialog(null)}>
      {dialog.kind === 'edit' && <CommitmentEditor item={dialog.item} categories={categories} onCreateCategory={onCreateCategory} onDismiss={() => setDialog(null)}
        onSave={(draft) => mutate(() => dialog.item ? access.edit(dialog.item.commitment.id, draft) : access.create(draft))} />}
      {dialog.kind === 'payment' && <CommitmentPayment occurrence={dialog.occurrence} title={dialog.item.commitment.title} categoryName={categoryLabel(dialog.item)} onDismiss={() => setDialog(null)}
        onSave={(amount, date) => mutate(() => access.pay(dialog.occurrence, amount, date))} />}
      {dialog.kind === 'resume' && <CommitmentResume title={dialog.item.commitment.title} proposedDate={dialog.date} onDismiss={() => setDialog(null)}
        onResume={(date) => mutate(() => access.resume(dialog.item.commitment.id, date))} />}
      {detail && <CommitmentSheet title={detail.historyVisible ? `${detail.data.commitment.title} · History` : detail.data.commitment.title} onDismiss={() => setDialog(null)}>
        <FormError message={error} />
        <View style={styles.heading}>
          <StatusText tone="neutral" style={styles.title}>{commitmentKindLabels[detail.data.commitment.kind]} · {commitmentStatusLabel(detail.data)}</StatusText>
          <ContextMenu label={`Series options for ${detail.data.commitment.title}`} actions={seriesActions(detail.data)} />
        </View>
        {!detail.historyVisible && <>
          <ThemedText type="body">Expected {formatBrlAmount(detail.data.commitment.expectedAmountMinor)}</ThemedText>
          {!!categoryLabel(detail.data) && <ThemedText type="secondary" themeColor="textSecondary">{categoryLabel(detail.data)}</ThemedText>}
          <ThemedText type="secondary" themeColor="textSecondary">Monthly on day {detail.data.schedule.billingDay} · From {dateLabel(detail.data.schedule.startDate)}</ThemedText>
          {!!progress(detail.data) && <ThemedText type="secondary" themeColor="textSecondary">{progress(detail.data)}</ThemedText>}
          <ThemedText type="secondary" themeColor="textSecondary">Total paid: {formatBrlAmount(detail.data.totalPaidMinor)}</ThemedText>
          {detail.data.versions.length > 1 && <>
            <ThemedText type="cardTitle" accessibilityRole="header">Schedules</ThemedText>
            {detail.data.versions.map((version) => <ThemedText key={version.id} type="metadata" themeColor="textSecondary">
              From {dateLabel(version.startDate)} · day {version.billingDay} · {formatBrlAmount(version.expectedAmountMinor)}{version.effectiveUntil ? ` · ends before ${dateLabel(version.effectiveUntil)}` : ' · current'}
            </ThemedText>)}
          </>}
          <ThemedText type="cardTitle" accessibilityRole="header">{focused ? 'Selected obligation' : 'Unpaid occurrences'}</ThemedText>
          {!detailPending.length && <ThemedText type="secondary" themeColor="textSecondary">No unresolved occurrences in this preview.</ThemedText>}
          {detailPending.map((row) => pending(detail.data, row, true))}
          <FormButton variant="quiet" label="View history" onPress={() => setDialog({ ...detail, historyVisible: true })} />
        </>}
        {detail.historyVisible && <>
          <ThemedText type="cardTitle" accessibilityRole="header">Paid and skipped</ThemedText>
          {!resolved.length && <ThemedText type="secondary" themeColor="textSecondary">No paid or skipped occurrences in this page.</ThemedText>}
          {resolved.map(({ occurrence: row, payment }) => <View key={row.id} testID="commitment-history-row" style={[styles.row, { borderColor: colors.border }]}>
            <StatusText tone={row.status === 'paid' ? 'success' : 'subdued'}>{occurrenceLabel(row.status, row.dueDate, today)} · Due {dateLabel(row.dueDate)}{installmentLabel(detail.data, row) ? ` · ${installmentLabel(detail.data, row)}` : ''}</StatusText>
            <ThemedText type="secondary">Expected {formatBrlAmount(row.expectedAmountMinor)}</ThemedText>
            {payment && <>
              <ThemedText type="cardTitle" style={styles.amount}>Paid {formatBrlAmount(payment.amountMinor)}</ThemedText>
              <ThemedText type="metadata" themeColor="textSecondary">Payment date {dateLabel(payment.transactionDate)}</ThemedText>
              {!!financeCategoryName(payment, categories) && <ThemedText type="metadata" themeColor="textSecondary">{financeCategoryName(payment, categories)}</ThemedText>}
            </>}
            <View style={styles.creation}><FormButton variant="quiet" label={row.status === 'paid' ? 'Undo payment' : 'Reopen'} accessibilityLabel={`${row.status === 'paid' ? 'Undo payment for' : 'Reopen'} ${detail.data.commitment.title}, due ${dateLabel(row.dueDate)}`}
              onPress={() => confirm(row.status === 'paid' ? 'Undo payment?' : 'Reopen occurrence?',
                row.status === 'paid' ? 'The linked Expense will be removed from ledger totals and this occurrence will need payment again.' : 'This occurrence will need payment again.',
                () => { mutate(() => access.reopen(row.id)); refreshDetails(detail.data.commitment.id); })} /></View>
          </View>)}
          {detail.data.nextBefore && <FormButton variant="quiet" label="Load earlier history" onPress={() => run(() => {
            const page = access.readHistory(detail.data.commitment.id, detail.data.nextBefore!);
            setDialog({ ...detail, data: appendCommitmentHistory(detail.data, page) });
          })} />}
          <FormButton variant="quiet" label="View commitment" onPress={() => setDialog({ ...detail, historyVisible: false, focus: null })} />
        </>}
      </CommitmentSheet>}
    </CommitmentModal>}
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: Space.lg }, heading: { flexDirection: 'row', alignItems: 'center', gap: Space.sm }, title: { flex: 1, flexShrink: 1 },
  creation: { alignItems: 'flex-start' }, empty: { paddingVertical: Space.lg, gap: Space.sm },
  row: { paddingVertical: Space.md, gap: Space.sm, borderBottomWidth: 1 }, body: { minHeight: ControlSize.touch, gap: Space.xs },
  nameAmount: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }, name: { flexGrow: 1, flexShrink: 1, flexBasis: 160 },
  amount: { flexShrink: 1, fontVariant: ['tabular-nums'] }, actions: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  seriesRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm }, seriesBody: { flex: 1, minWidth: 0 },
});

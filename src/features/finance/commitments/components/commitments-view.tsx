import { useState } from 'react';
import { Alert, Pressable, SectionList, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { ContextMenu, type ContextMenuAction } from '@/components/context-menu';
import { FormButton, FormError } from '@/components/form-controls';
import { BackButton } from '@/components/back-button';
import { UiText } from '@/components/design-system';
import { StatusText } from '@/components/status-text';
import { ThemedText } from '@/components/themed-text';
import { ControlSize, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, dateLabel } from '@/utils/calendar';

import { FinanceValidationError, financeError } from '../../errors';
import { financeCategoryName } from '../../form';
import { formatBrlAmount } from '../../money';
import type { FinanceCategory } from '../../types';
import { appendCommitmentHistory, type CommitmentDataAccess, type CommitmentHistory } from '../data';
import { commitmentSections, commitmentStatusLabel, focusedCommitmentOccurrence } from '../presentation';
import { commitmentKindLabels, type CommitmentItem, type DisplayOccurrence } from '../types';
import { CommitmentEditor, CommitmentModal, CommitmentPayment, CommitmentResume } from './commitment-forms';
import { CommitmentCard } from './commitment-card';
import { CommitmentHistoryIndexCard, CommitmentHistoryIndexHeader } from './commitment-history-index';
import { CommitmentDetails } from './commitment-details';
import { CommitmentHistory as IndividualCommitmentHistory } from './commitment-history';

type Details = { kind: 'details'; data: CommitmentHistory; historyVisible: boolean; focus?: DisplayOccurrence | null };
type Dialog = { kind: 'edit'; item: CommitmentItem | null } | Details
  | { kind: 'payment'; item: CommitmentItem; occurrence: DisplayOccurrence }
  | { kind: 'resume'; item: CommitmentItem; date: string };

export function CommitmentsView({ items, categories, access, today, mutate, onCreateCategory, initialDetail, scrollOffset = 0, onScroll }: {
  items: CommitmentItem[]; categories: FinanceCategory[]; access: CommitmentDataAccess; today: string; mutate: <T>(action: () => T) => T;
  onCreateCategory: (name: string) => FinanceCategory;
  initialDetail?: { data: CommitmentHistory; occurrence: DisplayOccurrence | null };
  scrollOffset?: number; onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}) {
  const colors = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const stackCreation = width < 390 && fontScale >= 1.5;
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
  type ListRow = { key: string; item: CommitmentItem; occurrence?: DisplayOccurrence; historical?: boolean };
  const listSections: { key: string; title: string | null; count: number; data: ListRow[] }[] = surface === 'obligations'
    ? sections.map(section => ({ key: section.title, title: section.title, count: section.rows.length,
      data: section.rows.map(row => ({ ...row, key: `${row.item.commitment.id}:${row.occurrence.dueDate}` })) }))
    : (surface === 'manage' ? items : historyItems).length ? [{ key: surface, title: null, count: 0,
      data: (surface === 'manage' ? items : historyItems).map(item => ({ key: item.commitment.id, item, historical: surface === 'history' })) }] : [];
  return <View style={styles.container}>
    <SectionList testID="commitments-list" sections={listSections} keyExtractor={row => row.key} stickySectionHeadersEnabled={false}
      initialNumToRender={6} maxToRenderPerBatch={6} windowSize={5} removeClippedSubviews={false}
      contentInsetAdjustmentBehavior="never" contentContainerStyle={styles.mainContent} contentOffset={{ x: 0, y: scrollOffset }}
      onScroll={onScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      ListHeaderComponent={<View style={[styles.section, surface === 'history' && { paddingBottom: Space.lg }]}>
    {surface === 'obligations' ? <View style={[styles.toolbar, stackCreation && styles.toolbarStack]}>
      <View style={[styles.creation, stackCreation && styles.creationFull]}><FormButton appearance="v2" variant="primary" leadingIcon="plus" label="Add commitment" onPress={() => { setError(null); setDialog({ kind: 'edit', item: null }); }} /></View>
      <View style={stackCreation && styles.optionsEnd}><ContextMenu appearance="v2" label="Commitment options" onOpen={() => setError(null)} actions={[
        { label: 'Manage commitments', onPress: () => setSurface('manage') }, { label: 'History', onPress: () => setSurface('history') },
      ]} /></View>
    </View> : surface === 'history' ? <CommitmentHistoryIndexHeader onBack={() => { setSurface('obligations'); setError(null); }} /> : <>
    <View style={styles.heading}>
      <BackButton accessibilityLabel="Back to Commitments" onPress={() => { setSurface('obligations'); setError(null); }} />
      <ThemedText type="sectionHeading" accessibilityRole="header" style={styles.title}>{surface === 'manage' ? 'Manage commitments' : 'Commitment History'}</ThemedText>
    </View>
    </>}
    <FormError appearance={surface !== 'manage' ? 'v2' : undefined} message={error} />
    </View>}
      ListEmptyComponent={surface === 'obligations' ? <View style={styles.empty}>
        <UiText type="cardTitle">{!items.length ? 'No commitments yet' : 'No obligations to resolve in this preview'}</UiText>
        <UiText type="secondary" color="textSecondary">{!items.length ? 'Add a Bill, Subscription, or Installment. Expenses are recorded when you pay.' : 'Manage commitments to review schedules and statuses.'}</UiText>
      </View> : surface === 'history' ? <UiText type="secondary" color="textSecondary">No paid or skipped occurrences yet.</UiText>
        : <ThemedText type="secondary" themeColor="textSecondary">No commitment series yet. Return to Commitments to add one.</ThemedText>}
      renderSectionHeader={({ section }) => section.title ? <View testID={`commitment-section-${section.title.toLowerCase()}`} style={styles.sectionHeader}>
        <UiText type="editorSection" accessibilityRole="header" color={section.title === 'Overdue' ? 'attention' : 'textPrimary'}>{section.title}{section.title === 'Overdue' ? ` (${section.count})` : ''}</UiText>
      </View> : null}
      ItemSeparatorComponent={CommitmentSeparator}
      renderItem={({ item: row }) => row.occurrence ? <CommitmentCard item={row.item} occurrence={row.occurrence} categories={categories} today={today}
        onView={() => openDetails(row.item, false, row.occurrence)} onViewSeries={() => openDetails(row.item)}
        onPay={() => setDialog({ kind: 'payment', item: row.item, occurrence: row.occurrence! })} onSkip={() => skip(row.item, row.occurrence!)} />
        : row.historical ? <CommitmentHistoryIndexCard item={row.item} onOpen={() => openDetails(row.item, true)} /> : seriesRow(row.item)} />

    {dialog && <CommitmentModal onDismiss={() => setDialog(null)}>
      {dialog.kind === 'edit' && <CommitmentEditor item={dialog.item} categories={categories} onCreateCategory={onCreateCategory} onDismiss={() => setDialog(null)}
        onSave={(draft) => mutate(() => dialog.item ? access.edit(dialog.item.commitment.id, draft) : access.create(draft))} />}
      {dialog.kind === 'payment' && <CommitmentPayment occurrence={dialog.occurrence} kind={dialog.item.commitment.kind} title={dialog.item.commitment.title} categoryName={categoryLabel(dialog.item)} onDismiss={() => setDialog(null)}
        onSave={(amount, date) => mutate(() => access.pay(dialog.occurrence, amount, date))} />}
      {dialog.kind === 'resume' && <CommitmentResume item={dialog.item} categoryName={categoryLabel(dialog.item)} proposedDate={dialog.date} onDismiss={() => setDialog(null)}
        onResume={(date) => mutate(() => access.resume(dialog.item.commitment.id, date))} />}
      {detail && !detail.historyVisible && <CommitmentDetails data={detail.data} pending={detailPending} focused={!!focused} categories={categories} today={today} error={error}
        actions={seriesActions(detail.data)} onDismiss={() => setDialog(null)} onHistory={() => setDialog({ ...detail, historyVisible: true })}
        onPay={occurrence => setDialog({ kind: 'payment', item: detail.data, occurrence })} onSkip={occurrence => skip(detail.data, occurrence)} onViewSeries={() => openDetails(detail.data)} />}
      {detail?.historyVisible && <IndividualCommitmentHistory data={detail.data} categories={categories} error={error} actions={seriesActions(detail.data)}
        onDismiss={() => setDialog(null)} onViewCommitment={() => setDialog({ ...detail, historyVisible: false, focus: null })}
        onLoadEarlier={() => run(() => {
          const page = access.readHistory(detail.data.commitment.id, detail.data.nextBefore!);
          setDialog({ ...detail, data: appendCommitmentHistory(detail.data, page) });
        })}
        onReopen={({ occurrence: row, payment }) => confirm(row.status === 'paid' ? 'Undo payment?' : 'Reopen occurrence?',
          row.status === 'paid' ? 'The linked Expense will be removed from ledger totals and this occurrence will need payment again.' : 'This occurrence will need payment again.',
          () => {
            mutate(() => {
              if (row.status === 'paid') {
                if (!payment) throw new FinanceValidationError('The linked payment is no longer available. Refresh History and try again.');
                access.deletePayment(payment.id, { commitmentId: row.commitmentId, dueDate: row.dueDate });
              } else {
                // Do not let a stale Skipped confirmation reverse a later payment.
                // Query only the existing source window containing this occurrence.
                const current = access.readHistory(row.commitmentId, row.dueDate < today ? addDays(row.dueDate, 1) : undefined)
                  .history.find(entry => entry.occurrence.id === row.id)?.occurrence;
                if (current?.status !== 'skipped') throw new FinanceValidationError('This skipped occurrence changed. Refresh History and try again.');
                access.reopen(row.id);
              }
            });
            refreshDetails(detail.data.commitment.id);
          })} />}
    </CommitmentModal>}
  </View>;
}

function CommitmentSeparator() { return <View style={styles.separator} />; }

const styles = StyleSheet.create({
  section: { gap: Space.lg }, heading: { flexDirection: 'row', alignItems: 'center', gap: Space.sm }, title: { flex: 1, flexShrink: 1 },
  container: { flex: 1 }, mainContent: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: Space.lg, paddingTop: Space.sm, paddingBottom: 32, flexGrow: 1 },
  toolbar: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm }, creation: { flexGrow: 1, flexShrink: 1, flexBasis: 'auto', minWidth: 0 },
  toolbarStack: { flexDirection: 'column', alignItems: 'stretch' }, creationFull: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', width: '100%' }, optionsEnd: { alignSelf: 'flex-end' },
  sectionHeader: { paddingTop: 20, paddingBottom: 8 }, separator: { height: 8 }, empty: { paddingVertical: Space.lg, gap: Space.sm },
  row: { paddingVertical: Space.md, gap: Space.sm, borderBottomWidth: 1 }, body: { minHeight: ControlSize.touch, gap: Space.xs },
  nameAmount: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }, name: { flexGrow: 1, flexShrink: 1, flexBasis: 160 },
  amount: { flexShrink: 1, fontVariant: ['tabular-nums'] }, actions: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  seriesRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm }, seriesBody: { flex: 1, minWidth: 0 },
});

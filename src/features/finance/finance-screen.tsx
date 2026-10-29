import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, ScrollView, Keyboard, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-screens/experimental';

import { FormButton, FormError } from '@/components/form-controls';
import { FloatingAddButton } from '@/components/floating-add-button';
import { ContextMenuHost } from '@/components/context-menu';
import type { FormSelectionHandle } from '@/components/form-selection-host';
import { SheetRefreshContext } from '@/components/sheet-refresh-notice';
import { StatusText } from '@/components/status-text';
import { ThemedText } from '@/components/themed-text';
import { DesignProvider, UiText, useDesignColors } from '@/components/design-system';
import { Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { FinanceCategoryManager } from './components/category-manager';
import { CommitmentsView } from './commitments/components/commitments-view';
import { FinanceDashboard, FinancePeriodControls } from './components/finance-dashboard';
import { TransactionEditor } from './components/transaction-editor';
import { TransactionDetail } from './components/transaction-detail';
import { TransactionsContent } from './components/transactions-content';
import { financeError } from './errors';
import type { FinanceTransaction, TransactionSource } from './types';
import { useFinance, type FinanceView } from './use-finance';
import { WorkView } from './work/components/work-view';

const destinations: { value: FinanceView; label: string }[] = [
  { value: 'dashboard', label: 'Overview' }, { value: 'transactions', label: 'Transactions' },
  { value: 'commitments', label: 'Commitments' }, { value: 'work', label: 'Work' },
];

export function FinanceScreen({ initialView, initialRecordId, initialDueDate }: {
  initialView?: FinanceView; initialRecordId?: string; initialDueDate?: string;
} = {}) {
  const colors = useTheme();
  const { access, commitmentAccess, workAccess, snapshot, error, reload, mutate, selection, today, setView, setPeriodKind, navigatePeriod, returnToCurrent, loadMoreTransactions, setTransactionType, setTransactionQuery, searchingTransactions, transactionResultsCurrent } = useFinance(initialView, initialRecordId, initialDueDate);
  const [editor, setEditor] = useState<{ transaction: FinanceTransaction | null; source?: TransactionSource } | null>(null);
  const [linkedDetail, setLinkedDetail] = useState<{ transaction: FinanceTransaction; source: TransactionSource } | null>(null);
  const [linkedDetailOpen, setLinkedDetailOpen] = useState(false);
  const [sourceWorkspace, setSourceWorkspace] = useState(false);
  const pendingDetailAction = useRef<(() => void) | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [spendingExpanded, setSpendingExpanded] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const design = useDesignColors();
  const overview = selection.view === 'dashboard';
  const v2 = overview || selection.view === 'transactions' || selection.view === 'commitments' || selection.view === 'work';
  const menuHost = useRef<FormSelectionHandle>(null);
  const offsets = useRef<Record<FinanceView, number>>({ dashboard: 0, transactions: 0, commitments: 0, work: 0 });
  const categories = snapshot?.categories ?? [];

  function navigateView(view: FinanceView) {
    Keyboard.dismiss();
    menuHost.current?.dismiss(false);
    setScrollOffset(offsets.current[view]);
    setView(view);
  }

  function openTransaction(transaction: FinanceTransaction) {
    setActionError(null);
    const source = snapshot?.ledger?.sources[transaction.id];
    if (source) { setLinkedDetail({ transaction, source }); setLinkedDetailOpen(true); }
    else setEditor({ transaction });
  }

  function detailClosed() {
    const action = pendingDetailAction.current;
    pendingDetailAction.current = null;
    setLinkedDetail(null);
    action?.();
  }

  function closeDetail(action?: () => void) {
    pendingDetailAction.current = action ?? null;
    setLinkedDetailOpen(false);
    // Finish iOS native dismissal before presenting the editor or an owning workspace.
    if (Platform.OS !== 'ios') requestAnimationFrame(detailClosed);
  }

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    menuHost.current?.dismiss(false);
    offsets.current[selection.view] = Math.max(0, event.nativeEvent.contentOffset.y);
  }

  function remove(transaction: FinanceTransaction) {
    const source = snapshot?.ledger?.sources[transaction.id];
    if (source?.kind === 'work') {
      setActionError('Use Undo payment in Work to remove this payment.');
      return;
    }
    if (source?.kind === 'commitment') {
      try { commitmentAccess.readPayment(transaction.id, source); }
      catch (cause) { setActionError(financeError(cause, 'Unable to verify this payment. Please refresh and try again.')); return; }
      Alert.alert('Delete payment?', 'This will remove the recorded expense and mark this commitment occurrence as unpaid.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete payment', style: 'destructive', onPress: () => {
          try { mutate(() => commitmentAccess.deletePayment(transaction.id, source)); setActionError(null); }
          catch (cause) { setActionError(financeError(cause, 'Unable to delete this payment. Please refresh and try again.')); }
        } },
      ]);
      return;
    }
    Alert.alert('Delete transaction?', `Delete “${transaction.description}”?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        try { mutate(() => access.deleteTransaction(transaction.id)); setActionError(null); }
        catch (cause) { setActionError(financeError(cause, 'Unable to delete this transaction. Please try again.')); }
      } },
    ]);
  }

  return <DesignProvider><SheetRefreshContext.Provider value={{ error, onRetry: reload }}>
    <SafeAreaView edges={{ top: true, bottom: true, left: true, right: true }} style={{ flex: 1, backgroundColor: v2 ? design.canvas : colors.background }}>
    <ContextMenuHost ref={menuHost} safeAreaApplied>
    <View style={[styles.inner, styles.shell]}>
      {v2 ? <UiText type="screenTitle" accessibilityRole="header">Finance</UiText> : <ThemedText type="screenTitle" accessibilityRole="header">Finance</ThemedText>}
      <ScrollView horizontal style={styles.navigationViewport} contentContainerStyle={styles.navigation}
        contentInsetAdjustmentBehavior="never" showsHorizontalScrollIndicator
        accessibilityLabel="Finance destinations" accessibilityHint="Swipe horizontally if enlarged text extends beyond the screen.">
        {destinations.map((destination) => <View key={destination.value} style={styles.navigationItem}>
          <FormButton appearance={v2 ? 'v2' : undefined} variant="navigation" compactNavigation label={destination.label} selected={selection.view === destination.value} onPress={() => navigateView(destination.value)} />
        </View>)}
      </ScrollView>
      {!!error && <View style={styles.notice}>
        <StatusText tone="attention" accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.noticeText}>{error}</StatusText>
        <FormButton variant="quiet" label="Retry" onPress={reload} />
      </View>}
      <FormError message={actionError} />
    </View>
    {selection.view === 'transactions' ? <TransactionsContent
      transactions={snapshot?.transactions ?? []} categories={categories} sources={snapshot?.ledger?.sources ?? {}} today={today}
      filter={selection.ledgerFilter} ready={!!snapshot} error={!!error} searching={searchingTransactions} current={transactionResultsCurrent}
      hasMore={!!snapshot?.ledger?.next} onType={type => { setScrollOffset(0); setTransactionType(type); }}
      onQuery={query => { setScrollOffset(0); setTransactionQuery(query); }}
      onCategories={() => setCategoriesOpen(true)}
      onOpen={openTransaction} onDelete={remove} onLoadMore={loadMoreTransactions} scrollOffset={scrollOffset} onScroll={onScroll}
    /> : selection.view === 'commitments' && snapshot ? <CommitmentsView items={snapshot.items} categories={categories} access={commitmentAccess} today={today} mutate={mutate}
      scrollOffset={scrollOffset} onScroll={onScroll} initialDetail={sourceWorkspace ? undefined : snapshot.initialCommitment}
      onCreateCategory={name => mutate(() => access.createCategory(name, 'expense'))} /> : selection.view === 'work' && snapshot?.work ? <WorkView
      data={snapshot.work} categories={categories} access={workAccess} mutate={mutate} initialEntryId={sourceWorkspace ? undefined : initialRecordId}
      scrollOffset={scrollOffset} onScroll={onScroll} onCreateCategory={name => mutate(() => access.createCategory(name, 'income'))} /> : <FlatList
      key={selection.view}
      style={styles.list}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={[styles.inner, styles.content, overview && { paddingTop: 8 }]}
      contentOffset={{ x: 0, y: scrollOffset }}
      onScroll={onScroll}
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
      data={[]}
      ListHeaderComponent={<View style={[styles.header, overview && { gap: 12 }]}>
        {selection.view === 'dashboard' && <>
          <FinancePeriodControls period={selection.period} today={today} onKind={setPeriodKind} onMove={navigatePeriod} onCurrent={returnToCurrent} />
          {snapshot?.analytics && <FinanceDashboard analytics={snapshot.analytics} spendingExpanded={spendingExpanded} onToggleSpending={() => setSpendingExpanded((expanded) => !expanded)} />}
          {!snapshot?.analytics && !error && <ActivityIndicator color={colors.accent} accessibilityLabel="Loading Finance Overview" />}
        </>}
      </View>}
      ListEmptyComponent={!snapshot && !error && selection.view !== 'dashboard' ? <ActivityIndicator color={colors.accent} accessibilityLabel="Loading Finance" /> : undefined}
      renderItem={() => null}
    />}

    {selection.view === 'transactions' && !editor && !linkedDetail && !categoriesOpen && <FloatingAddButton label="New transaction" disabled={!snapshot}
      onPress={() => { setActionError(null); setEditor({ transaction: null }); }} />}
    </ContextMenuHost>
    </SafeAreaView>
    {editor && <TransactionEditor transaction={editor.transaction} categories={categories}
      commitmentPayment={editor.source?.kind === 'commitment'}
      workPayment={editor.source?.kind === 'work'}
      onSave={(draft) => mutate(() => editor.transaction ? access.editTransaction(editor.transaction.id, draft) : access.createTransaction(draft))}
      onCreateCategory={(name, type) => mutate(() => access.createCategory(name, type))} onDismiss={() => setEditor(null)} />}
    {linkedDetail && <TransactionDetail {...linkedDetail} categories={categories} today={today}
      visible={linkedDetailOpen} onClosed={detailClosed} onDismiss={() => closeDetail()} onEdit={() => closeDetail(() => setEditor(linkedDetail))}
      onOpenSource={() => closeDetail(() => {
        // A Home/Calendar entry target must not reopen an unrelated record over this workspace.
        setSourceWorkspace(true);
        navigateView(linkedDetail.source.kind === 'work' ? 'work' : 'commitments');
      })} />}
    {categoriesOpen && <FinanceCategoryManager categories={categories} categoriesReady={!!snapshot}
      onCreate={(name, type) => mutate(() => access.createCategory(name, type))}
      onDelete={(id) => mutate(() => access.deleteCategory(id))} onDismiss={() => setCategoriesOpen(false)} />}
  </SheetRefreshContext.Provider></DesignProvider>;
}

const styles = StyleSheet.create({
  inner: { width: '100%', maxWidth: 640, alignSelf: 'center' }, shell: { paddingHorizontal: Space.lg, paddingTop: Space.lg, paddingBottom: Space.sm, gap: Space.sm },
  navigationViewport: { flexGrow: 0, flexShrink: 0 }, navigation: { flexDirection: 'row', flexWrap: 'nowrap', flexGrow: 1 },
  navigationItem: { flexGrow: 1, flexShrink: 0 },
  notice: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.sm }, noticeText: { flexGrow: 1, flexShrink: 1, flexBasis: 200 },
  list: { flex: 1 }, content: { padding: Space.lg, paddingBottom: Space.xl, flexGrow: 1 }, header: { gap: Space.xl, paddingBottom: Space.lg },
});

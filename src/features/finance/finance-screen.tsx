import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-screens/experimental';

import { FormButton, FormError } from '@/components/form-controls';
import { ContextMenuHost } from '@/components/context-menu';
import type { FormSelectionHandle } from '@/components/form-selection-host';
import { SheetRefreshContext } from '@/components/sheet-refresh-notice';
import { StatusText } from '@/components/status-text';
import { ThemedText } from '@/components/themed-text';
import { Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { FinanceCategoryManager } from './components/category-manager';
import { CommitmentsView } from './commitments/components/commitments-view';
import { FinanceDashboard, FinancePeriodControls } from './components/finance-dashboard';
import { TransactionEditor } from './components/transaction-editor';
import { TransactionRow } from './components/transaction-row';
import { financeError } from './errors';
import type { FinanceTransaction } from './types';
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
  const { access, commitmentAccess, workAccess, snapshot, error, reload, mutate, selection, today, setView, setPeriodKind, navigatePeriod, returnToCurrent } = useFinance(initialView, initialRecordId, initialDueDate);
  const [editor, setEditor] = useState<{ transaction: FinanceTransaction | null } | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [spendingExpanded, setSpendingExpanded] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const menuHost = useRef<FormSelectionHandle>(null);
  const offsets = useRef<Record<FinanceView, number>>({ dashboard: 0, transactions: 0, commitments: 0, work: 0 });
  const categories = snapshot?.categories ?? [];

  function navigateView(view: FinanceView) {
    menuHost.current?.dismiss(false);
    setScrollOffset(offsets.current[view]);
    setView(view);
  }

  function remove(transaction: FinanceTransaction) {
    Alert.alert('Delete transaction?', `Delete “${transaction.description}”?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        try { mutate(() => access.deleteTransaction(transaction.id)); setActionError(null); }
        catch (cause) { setActionError(financeError(cause, 'Unable to delete this transaction. Please try again.')); }
      } },
    ]);
  }

  return <SheetRefreshContext.Provider value={{ error, onRetry: reload }}>
    <SafeAreaView edges={{ top: true, bottom: true, left: true, right: true }} style={{ flex: 1, backgroundColor: colors.background }}>
    <ContextMenuHost ref={menuHost} safeAreaApplied>
    <View style={[styles.inner, styles.shell]}>
      <ThemedText type="screenTitle" accessibilityRole="header">Finance</ThemedText>
      <ScrollView horizontal style={styles.navigationViewport} contentContainerStyle={styles.navigation}
        contentInsetAdjustmentBehavior="never" showsHorizontalScrollIndicator
        accessibilityLabel="Finance destinations" accessibilityHint="Swipe horizontally if enlarged text extends beyond the screen.">
        {destinations.map((destination) => <View key={destination.value} style={styles.navigationItem}>
          <FormButton variant="navigation" compactNavigation label={destination.label} selected={selection.view === destination.value} onPress={() => navigateView(destination.value)} />
        </View>)}
      </ScrollView>
      {!!error && <View style={styles.notice}>
        <StatusText tone="attention" accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.noticeText}>{error}</StatusText>
        <FormButton variant="quiet" label="Retry" onPress={reload} />
      </View>}
      <FormError message={actionError} />
    </View>
    <FlatList
      key={selection.view}
      style={styles.list}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={[styles.inner, styles.content]}
      contentOffset={{ x: 0, y: scrollOffset }}
      onScroll={(event) => { menuHost.current?.dismiss(false); offsets.current[selection.view] = Math.max(0, event.nativeEvent.contentOffset.y); }}
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
      data={snapshot?.transactions ?? []}
      keyExtractor={(transaction) => transaction.id}
      ListHeaderComponent={<View style={styles.header}>
        {selection.view === 'transactions' && <View style={styles.buttons}>
          <FormButton variant="primary" label="Add transaction" disabled={!snapshot} onPress={() => { setActionError(null); setEditor({ transaction: null }); }} />
          <FormButton label="Categories" disabled={!snapshot} onPress={() => setCategoriesOpen(true)} />
        </View>}
        {selection.view === 'dashboard' && <>
          <FinancePeriodControls period={selection.period} today={today} onKind={setPeriodKind} onMove={navigatePeriod} onCurrent={returnToCurrent} />
          {snapshot?.analytics && <FinanceDashboard analytics={snapshot.analytics} spendingExpanded={spendingExpanded} onToggleSpending={() => setSpendingExpanded((expanded) => !expanded)} />}
          {!snapshot?.analytics && !error && <ActivityIndicator color={colors.accent} accessibilityLabel="Loading Finance Overview" />}
        </>}
        {selection.view === 'commitments' && snapshot && <CommitmentsView items={snapshot.items} categories={categories} access={commitmentAccess} today={today} mutate={mutate}
          initialDetail={snapshot.initialCommitment}
          onCreateCategory={(name) => mutate(() => access.createCategory(name, 'expense'))} />}
        {selection.view === 'work' && snapshot?.work && <WorkView data={snapshot.work} categories={categories} access={workAccess} mutate={mutate} initialEntryId={initialRecordId}
          onCreateCategory={(name) => mutate(() => access.createCategory(name, 'income'))} />}
      </View>}
      ListEmptyComponent={!snapshot ? (error || selection.view === 'dashboard' ? null : <ActivityIndicator color={colors.accent} accessibilityLabel="Loading Finance" />) : selection.view !== 'transactions' ? null : <View style={styles.empty}>
        <ThemedText>No transactions yet</ThemedText>
        <ThemedText themeColor="textSecondary">Record income received or an expense paid.</ThemedText>
      </View>}
      renderItem={({ item }) => <TransactionRow transaction={item} categories={categories} commitmentPayment={snapshot?.paymentTransactionIds.includes(item.id)}
        workPayment={snapshot?.workPaymentTransactionIds.includes(item.id)} onEdit={() => { setActionError(null); setEditor({ transaction: item }); }} onDelete={() => remove(item)} />}
    />
    </ContextMenuHost>
    </SafeAreaView>
    {editor && <TransactionEditor transaction={editor.transaction} categories={categories}
      commitmentPayment={!!editor.transaction && snapshot?.paymentTransactionIds.includes(editor.transaction.id)}
      workPayment={!!editor.transaction && snapshot?.workPaymentTransactionIds.includes(editor.transaction.id)}
      onSave={(draft) => mutate(() => editor.transaction ? access.editTransaction(editor.transaction.id, draft) : access.createTransaction(draft))}
      onCreateCategory={(name, type) => mutate(() => access.createCategory(name, type))} onDismiss={() => setEditor(null)} />}
    {categoriesOpen && <FinanceCategoryManager categories={categories}
      onCreate={(name, type) => mutate(() => access.createCategory(name, type))}
      onDelete={(id) => mutate(() => access.deleteCategory(id))} onDismiss={() => setCategoriesOpen(false)} />}
  </SheetRefreshContext.Provider>;
}

const styles = StyleSheet.create({
  inner: { width: '100%', maxWidth: 640, alignSelf: 'center' }, shell: { paddingHorizontal: Space.lg, paddingTop: Space.lg, paddingBottom: Space.sm, gap: Space.sm },
  navigationViewport: { flexGrow: 0, flexShrink: 0 }, navigation: { flexDirection: 'row', flexWrap: 'nowrap', flexGrow: 1 },
  navigationItem: { flexGrow: 1, flexShrink: 0 },
  notice: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.sm }, noticeText: { flexGrow: 1, flexShrink: 1, flexBasis: 200 },
  list: { flex: 1 }, content: { padding: Space.lg, paddingBottom: Space.xl, flexGrow: 1 }, header: { gap: Space.xl, paddingBottom: Space.lg },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }, empty: { paddingVertical: Space.xxl, gap: Space.sm },
});

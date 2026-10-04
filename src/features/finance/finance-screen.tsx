import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormButton, FormError } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { FinanceCategoryManager } from './components/category-manager';
import { CommitmentsView } from './commitments/components/commitments-view';
import { FinanceDashboard, FinancePeriodControls } from './components/finance-dashboard';
import { TransactionEditor } from './components/transaction-editor';
import { TransactionRow } from './components/transaction-row';
import { financeError } from './errors';
import type { FinanceTransaction } from './types';
import { useFinance } from './use-finance';
import { WorkView } from './work/components/work-view';

export function FinanceScreen() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { access, commitmentAccess, workAccess, snapshot, error, reload, mutate, selection, today, setView, setPeriodKind, navigatePeriod, returnToCurrent } = useFinance();
  const [editor, setEditor] = useState<{ transaction: FinanceTransaction | null } | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const categories = snapshot?.categories ?? [];

  function remove(transaction: FinanceTransaction) {
    Alert.alert('Delete transaction?', `Delete “${transaction.description}”?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        try { mutate(() => access.deleteTransaction(transaction.id)); setActionError(null); }
        catch (cause) { setActionError(financeError(cause, 'Unable to delete this transaction. Please try again.')); }
      } },
    ]);
  }

  return <>
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.content, {
        paddingTop: (Platform.OS === 'ios' ? 0 : insets.top) + Spacing.three,
        paddingLeft: Math.max(insets.left, Spacing.three), paddingRight: Math.max(insets.right, Spacing.three),
      }]}
      data={snapshot?.transactions ?? []}
      keyExtractor={(transaction) => transaction.id}
      ListHeaderComponent={<View style={styles.header}>
        <ThemedText type="subtitle" accessibilityRole="header">Finance</ThemedText>
        <View style={styles.buttons}>
          <FormButton label="Add transaction" disabled={!snapshot} onPress={() => { setActionError(null); setEditor({ transaction: null }); }} />
          <FormButton label="Categories" disabled={!snapshot} onPress={() => setCategoriesOpen(true)} />
        </View>
        <View style={styles.buttons} accessibilityLabel="Finance view">
          <FormButton label="Dashboard" selected={selection.view === 'dashboard'} onPress={() => setView('dashboard')} />
          <FormButton label="Transactions" selected={selection.view === 'transactions'} onPress={() => setView('transactions')} />
          <FormButton label="Commitments" selected={selection.view === 'commitments'} onPress={() => setView('commitments')} />
          <FormButton label="Work" selected={selection.view === 'work'} onPress={() => setView('work')} />
        </View>
        <FormError message={error || actionError} />
        {!!error && <FormButton label="Retry" onPress={reload} />}
        {selection.view === 'dashboard' && <>
          <FinancePeriodControls period={selection.period} today={today} onKind={setPeriodKind} onMove={navigatePeriod} onCurrent={returnToCurrent} />
          {snapshot?.analytics && <FinanceDashboard analytics={snapshot.analytics} />}
        </>}
        {selection.view === 'commitments' && snapshot && <CommitmentsView items={snapshot.items} categories={categories} access={commitmentAccess} today={today} mutate={mutate}
          onCreateCategory={(name) => mutate(() => access.createCategory(name, 'expense'))} />}
        {selection.view === 'work' && snapshot?.work && <WorkView data={snapshot.work} categories={categories} access={workAccess} mutate={mutate}
          onCreateCategory={(name) => mutate(() => access.createCategory(name, 'income'))} />}
      </View>}
      ListEmptyComponent={!snapshot ? (error ? null : <ActivityIndicator color={colors.text} accessibilityLabel="Loading Finance" />) : selection.view !== 'transactions' ? null : <View style={styles.empty}>
        <ThemedText>No transactions yet</ThemedText>
        <ThemedText themeColor="textSecondary">Record income received or an expense paid.</ThemedText>
      </View>}
      renderItem={({ item }) => <TransactionRow transaction={item} categories={categories} commitmentPayment={snapshot?.paymentTransactionIds.includes(item.id)}
        workPayment={snapshot?.workPaymentTransactionIds.includes(item.id)} onEdit={() => { setActionError(null); setEditor({ transaction: item }); }} onDelete={() => remove(item)} />}
    />
    {editor && <TransactionEditor transaction={editor.transaction} categories={categories}
      commitmentPayment={!!editor.transaction && snapshot?.paymentTransactionIds.includes(editor.transaction.id)}
      workPayment={!!editor.transaction && snapshot?.workPaymentTransactionIds.includes(editor.transaction.id)}
      onSave={(draft) => mutate(() => editor.transaction ? access.editTransaction(editor.transaction.id, draft) : access.createTransaction(draft))}
      onCreateCategory={(name, type) => mutate(() => access.createCategory(name, type))} onDismiss={() => setEditor(null)} />}
    {categoriesOpen && <FinanceCategoryManager categories={categories}
      onCreate={(name, type) => mutate(() => access.createCategory(name, type))}
      onDelete={(id) => mutate(() => access.deleteCategory(id))} onDismiss={() => setCategoriesOpen(false)} />}
  </>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: Spacing.four, flexGrow: 1 }, header: { gap: Spacing.three, paddingBottom: Spacing.three },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }, empty: { paddingVertical: Spacing.five, gap: Spacing.two },
});

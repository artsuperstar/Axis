import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormButton, FormError } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { FinanceCategoryManager } from './components/category-manager';
import { TransactionEditor } from './components/transaction-editor';
import { TransactionRow } from './components/transaction-row';
import { financeError } from './errors';
import type { FinanceTransaction } from './types';
import { useFinance } from './use-finance';

export function FinanceScreen() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { access, snapshot, error, reload, mutate } = useFinance();
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
        <FormError message={error || actionError} />
        {!!error && <FormButton label="Retry" onPress={reload} />}
      </View>}
      ListEmptyComponent={!snapshot ? (error ? null : <ActivityIndicator color={colors.text} accessibilityLabel="Loading transactions" />) : <View style={styles.empty}>
        <ThemedText>No transactions yet</ThemedText>
        <ThemedText themeColor="textSecondary">Record income received or an expense paid.</ThemedText>
      </View>}
      renderItem={({ item }) => <TransactionRow transaction={item} categories={categories} onEdit={() => { setActionError(null); setEditor({ transaction: item }); }} onDelete={() => remove(item)} />}
    />
    {editor && <TransactionEditor transaction={editor.transaction} categories={categories}
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

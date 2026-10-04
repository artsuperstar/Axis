import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { FormButton, FormError, FormField, SegmentedControl } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { AdaptiveModal, AdaptiveSheet } from '@/components/adaptive-sheet';
import { Spacing } from '@/constants/theme';

import { financeError } from '../errors';
import { categoriesForType } from '../form';
import { transactionTypeOptions } from '../form-options';
import { type FinanceCategory, type TransactionType } from '../types';

export function FinanceCategoryManager({ categories, onCreate, onDelete, onDismiss }: {
  categories: FinanceCategory[];
  onCreate: (name: string, type: TransactionType) => void;
  onDelete: (id: string) => void;
  onDismiss: () => void;
}) {
  const [type, setType] = useState<TransactionType>('expense');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  function create() {
    try { onCreate(name, type); setName(''); setError(null); }
    catch (cause) { setError(financeError(cause, 'Unable to create this category. Please try again.')); }
  }

  function remove(category: FinanceCategory) {
    Alert.alert('Archive category?', `Existing transactions will keep “${category.name}” as their category. It will no longer appear in category choices.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Archive', style: 'destructive', onPress: () => {
        try { onDelete(category.id); setError(null); }
        catch (cause) { setError(financeError(cause, 'Unable to archive this category. Please try again.')); }
      } },
    ]);
  }

  return (
    <AdaptiveModal onDismiss={onDismiss}>
      <AdaptiveSheet contentContainerStyle={styles.content} header={<View style={styles.header}>
        <ThemedText type="smallBold" accessibilityRole="header" style={{ flex: 1 }}>Finance categories</ThemedText>
        <FormButton label="Done" onPress={onDismiss} />
              </View>}>
        <FormError message={error} />
        <SegmentedControl label="Type *" value={type} options={transactionTypeOptions} onChange={(value) => { setType(value); setError(null); }} />
        <FormField label="Category name *" value={name} onChangeText={(value) => { setName(value); setError(null); }} returnKeyType="done" onSubmitEditing={create} />
        <FormButton label="Create category" onPress={create} disabled={!name.trim()} />
        {categoriesForType(categories, type).map((category) => <View key={category.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <ThemedText>{category.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{category.isBuiltIn ? 'Built-in' : 'Custom'}</ThemedText>
          </View>
          {!category.isBuiltIn && <FormButton label="Archive" accessibilityLabel={`Archive ${category.name} category`} onPress={() => remove(category)} />}
        </View>)}
      </AdaptiveSheet>
    </AdaptiveModal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three },
  content: { padding: Spacing.three, gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});

import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useRef, useState } from 'react';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';

import { FormButton, FormError, FormField, FormSelect, InlineNameForm, SegmentedControl, SelectField } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { AdaptiveModal, AdaptiveSheet } from '@/components/adaptive-sheet';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { dateLabel, localDateString, pickerValue } from '@/utils/calendar';

import { financeError } from '../errors';
import { changeTransactionType, financeCategoryForTransaction, transactionDraft, validateTransactionDraft } from '../form';
import { createFinanceCategorySelection, financeCategoryOptions, transactionTypeOptions } from '../form-options';
import { transactionTypeLabels, type FinanceCategory, type FinanceTransaction, type TransactionDraft } from '../types';

export function TransactionEditor({ transaction, categories, onSave, onCreateCategory, onDismiss, commitmentPayment = false, workPayment = false }: {
  transaction: FinanceTransaction | null;
  categories: FinanceCategory[];
  onSave: (draft: TransactionDraft) => void;
  onCreateCategory: (name: string, type: TransactionDraft['type']) => FinanceCategory;
  onDismiss: () => void;
  commitmentPayment?: boolean;
  workPayment?: boolean;
}) {
  const scheme = useColorScheme();
  const [draft, setDraft] = useState(() => transactionDraft(transaction));
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);
  const selectedCategory = financeCategoryForTransaction(draft, categories);
  const archivedCategory = selectedCategory?.deletedAt != null;
  const categoryLabel = selectedCategory ? `${selectedCategory.name}${archivedCategory ? ' (archived)' : ''}` : 'No category';

  function change<K extends keyof TransactionDraft>(key: K, value: TransactionDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function openDate() {
    Keyboard.dismiss();
    setPicker(true);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: pickerValue(draft.transactionDate), mode: 'date', maximumDate: new Date(),
        onValueChange: (_event, date) => { change('transactionDate', localDateString(date)); setPicker(false); },
        onDismiss: () => setPicker(false) });
    }
  }

  function save() {
    if (saving.current) return;
    saving.current = true;
    try {
      validateTransactionDraft(draft);
      onSave(draft);
      onDismiss();
    } catch (cause) {
      saving.current = false;
      setError(financeError(cause, 'Unable to save this transaction. Please try again.'));
    }
  }

  return (
    <AdaptiveModal onDismiss={onDismiss}>
      <AdaptiveSheet contentContainerStyle={styles.content} header={<View style={styles.header}>
        <FormButton label="Cancel" onPress={onDismiss} />
        <ThemedText type="smallBold" accessibilityRole="header" style={[styles.heading, styles.title]}>{transaction ? 'Edit transaction' : 'New transaction'}</ThemedText>
        <FormButton label="Save" onPress={save} />
      </View>}>
        <FormError message={error} />
        <SegmentedControl label="Type *" value={draft.type} options={transactionTypeOptions} disabled={commitmentPayment || workPayment} onChange={(type) => {
          setDraft((current) => changeTransactionType(current, type, categories)); setError(null);
        }} />
        {commitmentPayment && <ThemedText type="small" themeColor="textSecondary">Commitment payment. Amount, date, and other fields can be edited here. To remove it, use Undo payment in Commitments history.</ThemedText>}
        {workPayment && <ThemedText type="small" themeColor="textSecondary">Work payment. To correct it, use Undo payment in Work and record it again.</ThemedText>}
        <FormField label="Amount *" accessibilityLabel={workPayment ? 'Amount in reais, locked to Work allocations' : 'Amount in reais, required'} editable={!workPayment} helperText={workPayment ? 'Amount is controlled by the linked Work payment.' : undefined}
          placeholder="25,90" value={draft.amount} onChangeText={(value) => change('amount', value)} keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad'} autoFocus={!workPayment} />
        <FormField label="Description *" accessibilityLabel="Description, required" value={draft.description} onChangeText={(value) => change('description', value)} returnKeyType="next" />
        {Platform.OS === 'web' ? (
          <FormField label="Date *" placeholder="YYYY-MM-DD" value={draft.transactionDate} onChangeText={(value) => change('transactionDate', value)} />
        ) : (
          <FormSelect label="Date *" value={dateLabel(draft.transactionDate)} expanded={picker} onPress={openDate} />
        )}
        {picker && Platform.OS === 'ios' && <>
          <DateTimePicker value={pickerValue(draft.transactionDate)} mode="date" display="spinner" maximumDate={new Date()}
            themeVariant={scheme === 'dark' ? 'dark' : 'light'} onValueChange={(_event, date) => change('transactionDate', localDateString(date))} />
          <FormButton label="Done" onPress={() => setPicker(false)} />
        </>}
        <SelectField label="Category" value={draft.categoryId} displayValue={categoryLabel}
          options={financeCategoryOptions(categories, draft.type)} onChange={(value) => change('categoryId', value)} onOpen={() => setPicker(false)}
          description={archivedCategory ? `Current category: ${categoryLabel}. Keep it by dismissing this menu, or choose an active category or No category.` : undefined}
          action={{ label: '+ New category', title: `New ${transactionTypeLabels[draft.type].toLowerCase()} category`, accessibilityLabel: `Create new ${draft.type} category`,
            render: (controls) => <InlineNameForm {...controls}
              onSubmit={(name, complete) => createFinanceCategorySelection(name, draft.type, onCreateCategory, (id) => change('categoryId', id), complete)}
              formatError={(cause) => financeError(cause, 'Unable to create this category. Please try again.')} /> }} />
        <FormField label="Note" value={draft.note} onChangeText={(value) => change('note', value)} multiline textAlignVertical="top" style={styles.note} />
      </AdaptiveSheet>
    </AdaptiveModal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, padding: Spacing.three },
  heading: { flex: 1, minWidth: 80 }, title: { textAlign: 'center' },
  content: { padding: Spacing.three, gap: Spacing.three }, note: { minHeight: 80 },
});

import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useRef, useState } from 'react';
import { Keyboard, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

import { FormButton, FormError, FormField, FormSelect, InlineNameForm, SegmentedControl, SelectField } from '@/components/form-controls';
import { DesignProvider, UiText, useDesignColors } from '@/components/design-system';
import { EditorSection } from '@/components/editor-section';
import { AdaptiveModal, AdaptiveSheet } from '@/components/adaptive-sheet';
import { PickerBackHeader } from '@/components/back-button';
import { DesignSpace as Space } from '@/constants/design-system-v2';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { dateLabel, localDateString, pickerValue } from '@/utils/calendar';

import { financeError } from '../errors';
import { changeTransactionType, financeCategoryForTransaction, transactionDraft, validateTransactionDraft } from '../form';
import { createFinanceCategorySelection, financeCategoryOptions, transactionTypeOptions } from '../form-options';
import { transactionTypeLabels, type FinanceCategory, type FinanceTransaction, type TransactionDraft } from '../types';

export function TransactionEditor({ transaction, categories, onSave, onCreateCategory, onDismiss, commitmentPayment = false, workPayment = false, categoriesReady = true }: {
  transaction: FinanceTransaction | null;
  categories: FinanceCategory[];
  onSave: (draft: TransactionDraft) => void;
  onCreateCategory: (name: string, type: TransactionDraft['type']) => FinanceCategory;
  onDismiss: () => void;
  commitmentPayment?: boolean;
  workPayment?: boolean;
  categoriesReady?: boolean;
}) {
  const scheme = useColorScheme();
  const colors = useDesignColors();
  const { width, fontScale } = useWindowDimensions();
  const stackedHeader = width < 390 || fontScale >= 1.5;
  const stackSections = width < 390 && fontScale >= 1.5;
  const headerType = { fontSize: width < 430 ? 22 : 26, lineHeight: width < 430 ? 30 : 34 };
  const [draft, setDraft] = useState(() => transactionDraft(transaction));
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [descriptionHeight, setDescriptionHeight] = useState(52);
  const [noteHeight, setNoteHeight] = useState(96);
  const saving = useRef(false);
  const selectedCategory = financeCategoryForTransaction(draft, categories);
  const archivedCategory = selectedCategory?.deletedAt != null;
  const categoryLabel = selectedCategory ? `${selectedCategory.name}${archivedCategory ? ' (archived)' : ''}` : 'No category';
  // Locate the existing domain messages without changing validation order or parsing rules.
  const errorField = !error ? null : error.includes('description') ? 'description' : error.includes('date') || error.includes('already moved') ? 'date'
    : error.includes('amount') || error.includes('centavo') ? 'amount' : error.includes('category') ? 'category' : null;

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
    if (saving.current || !categoriesReady) return;
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
    <DesignProvider><AdaptiveModal onDismiss={onDismiss}>
      <AdaptiveSheet appearance="v2" contentContainerStyle={styles.content} header={<View style={styles.header}>
        <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
        <View style={[styles.headerRow, stackedHeader && styles.headerStack]}>
          {stackedHeader && <UiText type="editorTitle" accessibilityRole="header" style={[styles.title, headerType]}>{transaction ? 'Edit transaction' : 'New transaction'}</UiText>}
          <View style={[styles.headerRow, stackedHeader && styles.headerActions]}>
            <FormButton appearance="v2" compact variant="quiet" leadingIcon="back" tone="brand" label="Cancel" onPress={onDismiss} />
            {!stackedHeader && <UiText type="editorTitle" accessibilityRole="header" style={[styles.heading, styles.title, headerType]}>{transaction ? 'Edit transaction' : 'New transaction'}</UiText>}
            <FormButton appearance="v2" variant="primary" label="Save" disabled={!categoriesReady} onPress={save} />
          </View>
        </View>
      </View>}>
        <FormError appearance="v2" message={errorField ? null : error} />
        <EditorSection title="Transaction" description="" icon="creditCard" variant="group" stackHeading={stackSections}>
          <SegmentedControl appearance="v2" equalWidth={false} label="Type *" value={draft.type} options={transactionTypeOptions} disabled={commitmentPayment || workPayment} onChange={(type) => {
            setDraft((current) => changeTransactionType(current, type, categories)); setError(null);
          }} />
          {commitmentPayment && <UiText type="secondary" color="textSecondary">Commitment payment. Amount, date, and other fields can be edited here. To remove it, use Undo payment in Commitments history.</UiText>}
          {workPayment && <UiText type="secondary" color="textSecondary">Work payment. To correct it, use Undo payment in Work and record it again.</UiText>}
          <FormField appearance="v2" trailingText="R$" label="Amount *" error={errorField === 'amount' ? error : null} accessibilityLabel={workPayment ? 'Amount in reais, locked to Work allocations' : 'Amount in reais, required'} editable={!workPayment} helperText={workPayment ? 'Amount is controlled by the linked Work payment.' : 'Enter the transaction amount.'}
            placeholder="0,00" value={draft.amount} onChangeText={(value) => change('amount', value)} keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad'} autoFocus={!workPayment} style={styles.amount} />
          {!!draft.amount && (fontScale >= 1.5 || draft.amount.length > 14) && <UiText testID="transaction-editor-full-amount" type="numeric" selectable style={styles.fullAmount}
            accessibilityLabel={`Entered amount in reais: ${draft.amount}`}>{draft.amount}</UiText>}
        </EditorSection>
        <EditorSection title="Details" description="" icon="document" variant="group" stackHeading={stackSections}>
          <FormField appearance="v2" label="Description *" error={errorField === 'description' ? error : null} accessibilityLabel="Description, required" placeholder="What was this transaction for?" value={draft.description} onChangeText={(value) => change('description', value)}
            multiline scrollEnabled={false} textAlignVertical="top" style={{ minHeight: 52, height: descriptionHeight }} onContentSizeChange={event => setDescriptionHeight(Math.max(52, Math.ceil(event.nativeEvent.contentSize.height)))} />
          <SelectField appearance="v2" icon="tag" label="Category" error={errorField === 'category' ? error : null} value={draft.categoryId} displayValue={categoryLabel} disabled={!categoriesReady}
            options={financeCategoryOptions(categories, draft.type)} onChange={(value) => change('categoryId', value)} onOpen={() => setPicker(false)}
            description={archivedCategory ? `Current category: ${categoryLabel}. Keep it by dismissing this menu, or choose an active category or No category.` : undefined}
            action={{ label: '+ New category', title: `New ${transactionTypeLabels[draft.type].toLowerCase()} category`, accessibilityLabel: `Create new ${draft.type} category`,
              render: (controls) => <InlineNameForm {...controls} appearance="v2"
                onSubmit={(name, complete) => createFinanceCategorySelection(name, draft.type, onCreateCategory, (id) => change('categoryId', id), complete)}
                formatError={(cause) => financeError(cause, 'Unable to create this category. Please try again.')} /> }} />
          <UiText type="secondary" color="textSecondary">Choose a category for this transaction.</UiText>
          <FormField appearance="v2" label="Note" placeholder="Add a note (optional)…" value={draft.note} onChangeText={(value) => change('note', value)} multiline scrollEnabled={false} textAlignVertical="top"
            style={{ height: noteHeight }} onContentSizeChange={event => setNoteHeight(Math.max(96, Math.ceil(event.nativeEvent.contentSize.height)))} />
        </EditorSection>
        <EditorSection title="Date" description="" icon="calendar" variant="group" stackHeading={stackSections}>
          {Platform.OS === 'web' ? (
            <FormField appearance="v2" label="Date *" error={errorField === 'date' ? error : null} placeholder="YYYY-MM-DD" value={draft.transactionDate} onChangeText={(value) => change('transactionDate', value)} />
          ) : (
            <FormSelect appearance="v2" icon="calendar" label="Date *" error={errorField === 'date' ? error : null} value={dateLabel(draft.transactionDate)} expanded={picker} onPress={openDate} />
          )}
          {picker && Platform.OS === 'ios' && <>
            <PickerBackHeader appearance="v2" title="Date" onBack={() => setPicker(false)} />
            <DateTimePicker value={pickerValue(draft.transactionDate)} mode="date" display="spinner" maximumDate={new Date()}
              themeVariant={scheme === 'dark' ? 'dark' : 'light'} onValueChange={(_event, date) => change('transactionDate', localDateString(date))} />
          </>}
          <UiText type="secondary" color="textSecondary">Select the date of the transaction.</UiText>
        </EditorSection>
      </AdaptiveSheet>
    </AdaptiveModal></DesignProvider>
  );
}

const styles = StyleSheet.create({
  header: { padding: Space.md, gap: Space.md }, handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, width: '100%' },
  headerStack: { flexDirection: 'column', alignItems: 'stretch' }, headerActions: { justifyContent: 'space-between', flexWrap: 'wrap' },
  heading: { flex: 1, minWidth: 0 }, title: { textAlign: 'center', maxWidth: '100%' },
  content: { padding: Space.md, gap: Space.md }, amount: { fontSize: 24, fontWeight: '600', fontVariant: ['tabular-nums'], minHeight: 56 },
  fullAmount: { minWidth: 0, maxWidth: '100%' },
});

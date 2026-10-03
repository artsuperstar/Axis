import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { FormButton, FormChoice, FormError, FormField, FormSelect } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { dateLabel, localDateString, pickerValue } from '@/utils/calendar';

import { financeError } from '../errors';
import { categoriesForType, changeTransactionType, financeCategoryForTransaction, transactionDraft, validateTransactionDraft } from '../form';
import { transactionTypeLabels, transactionTypes, type FinanceCategory, type FinanceTransaction, type TransactionDraft } from '../types';

type Panel = 'type' | 'category' | 'new-category';

export function TransactionEditor({ transaction, categories, onSave, onCreateCategory, onDismiss }: {
  transaction: FinanceTransaction | null;
  categories: FinanceCategory[];
  onSave: (draft: TransactionDraft) => void;
  onCreateCategory: (name: string, type: TransactionDraft['type']) => FinanceCategory;
  onDismiss: () => void;
}) {
  const scheme = useColorScheme();
  const [draft, setDraft] = useState(() => transactionDraft(transaction));
  const [panel, setPanel] = useState<Panel | null>(null);
  const [picker, setPicker] = useState(false);
  const [name, setName] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);
  const creating = useRef(false);
  const controls = useRef<Partial<Record<Panel, View | null>>>({});
  const heading = useRef<View>(null);
  const returnFocus = useRef<Panel | null>(null);
  const available = categoriesForType(categories, draft.type);
  const selectedCategory = financeCategoryForTransaction(draft, categories);
  const archivedCategory = selectedCategory?.deletedAt != null;
  const categoryLabel = selectedCategory ? `${selectedCategory.name}${archivedCategory ? ' (archived)' : ''}` : 'No category';
  const panelTitle = panel === 'type' ? 'Transaction type' : panel === 'category' ? 'Category' : `New ${transactionTypeLabels[draft.type].toLowerCase()} category`;

  useEffect(() => {
    if (Platform.OS === 'web' || panel === 'new-category') return;
    const frame = requestAnimationFrame(() => {
      const target = panel ? heading.current : returnFocus.current ? controls.current[returnFocus.current] : null;
      if (target) AccessibilityInfo.sendAccessibilityEvent(target, 'focus');
      if (!panel) returnFocus.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [panel]);

  function change<K extends keyof TransactionDraft>(key: K, value: TransactionDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function openPanel(next: Panel) {
    Keyboard.dismiss();
    setPicker(false);
    if (next === 'new-category') { setName(''); setCategoryError(null); }
    setPanel(next);
  }

  function closePanel() {
    Keyboard.dismiss();
    returnFocus.current = panel === 'new-category' ? 'category' : panel;
    setPanel(null);
  }

  function cancelCategory() {
    Keyboard.dismiss();
    setPanel('category');
    setCategoryError(null);
  }

  function requestClose() {
    if (panel === 'new-category') cancelCategory();
    else if (panel) closePanel();
    else onDismiss();
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

  function createCategory() {
    if (creating.current) return;
    creating.current = true;
    try {
      const category = onCreateCategory(name, draft.type);
      change('categoryId', category.id);
      closePanel();
    } catch (cause) {
      setCategoryError(financeError(cause, 'Unable to create this category. Please try again.'));
    } finally {
      creating.current = false;
    }
  }

  return (
    <Modal visible presentationStyle="pageSheet" onRequestClose={requestClose}>
      <SafeAreaProvider>
        <ThemedView style={styles.container} accessibilityViewIsModal onAccessibilityEscape={requestClose}>
          <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={[styles.container, panel && styles.hidden]} pointerEvents={panel ? 'none' : 'auto'} accessibilityElementsHidden={!!panel} importantForAccessibility={panel ? 'no-hide-descendants' : 'auto'}>
                <View style={styles.header}>
                  <FormButton label="Cancel" onPress={onDismiss} />
                  <ThemedText type="smallBold" accessibilityRole="header" style={[styles.heading, styles.title]}>{transaction ? 'Edit transaction' : 'New transaction'}</ThemedText>
                  <FormButton label="Save" onPress={save} />
                </View>
                <View style={styles.error}><FormError message={error} /></View>
                <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
                  <FormSelect ref={(node) => { controls.current.type = node; }} label="Type *" value={transactionTypeLabels[draft.type]} expanded={panel === 'type'} onPress={() => openPanel('type')} />
                  <FormField label="Amount *" accessibilityLabel="Amount in reais, required" placeholder="25,90" value={draft.amount} onChangeText={(value) => change('amount', value)} keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad'} autoFocus />
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
                  <FormSelect ref={(node) => { controls.current.category = node; }} label="Category" value={categoryLabel} expanded={panel === 'category' || panel === 'new-category'} onPress={() => openPanel('category')} />
                  <FormField label="Note" value={draft.note} onChangeText={(value) => change('note', value)} multiline textAlignVertical="top" style={styles.note} />
                </ScrollView>
              </View>
              {panel && <View key={panel} style={[styles.container, styles.panel]}>
                <View style={styles.header}>
                  <FormButton label="Cancel" onPress={panel === 'new-category' ? cancelCategory : closePanel} />
                  <View ref={heading} accessible accessibilityRole="header" accessibilityLabel={panelTitle} style={styles.heading}>
                    <ThemedText type="smallBold" style={styles.title}>{panelTitle}</ThemedText>
                  </View>
                  {panel === 'new-category' && <FormButton label="Create" onPress={createCategory} disabled={!name.trim()} />}
                </View>
                <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
                  {panel === 'type' ? <View accessibilityRole="radiogroup" accessibilityLabel="Transaction type" style={styles.options}>
                    {transactionTypes.map((type) => <FormChoice key={type} label={transactionTypeLabels[type]} selected={draft.type === type} onPress={() => {
                      setDraft((current) => changeTransactionType(current, type, categories)); setError(null); closePanel();
                    }} />)}
                  </View> : panel === 'category' ? <>
                    {archivedCategory && <ThemedText type="small" themeColor="textSecondary">
                      Current category: {categoryLabel}. Keep it by cancelling, or choose an active category or No category.
                    </ThemedText>}
                    <View accessibilityRole="radiogroup" accessibilityLabel="Category" style={styles.options}>
                      <FormChoice label="No category" selected={!selectedCategory} onPress={() => { change('categoryId', null); closePanel(); }} />
                      {available.map((category) => <FormChoice key={category.id} label={category.name} selected={draft.categoryId === category.id} onPress={() => { change('categoryId', category.id); closePanel(); }} />)}
                    </View>
                    <FormButton label="+ New category" accessibilityLabel={`Create new ${draft.type} category`} onPress={() => openPanel('new-category')} />
                  </> : <>
                    <FormError message={categoryError} />
                    <FormField label="Category name *" value={name} onChangeText={(value) => { setName(value); setCategoryError(null); }} autoFocus returnKeyType="done" onSubmitEditing={createCategory} />
                  </>}
                </ScrollView>
              </View>}
            </KeyboardAvoidingView>
          </SafeAreaView>
        </ThemedView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, hidden: { opacity: 0 },
  panel: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, padding: Spacing.three },
  heading: { flex: 1, minWidth: 80 }, title: { textAlign: 'center' },
  error: { paddingHorizontal: Spacing.three },
  content: { padding: Spacing.three, gap: Spacing.three }, options: { gap: Spacing.two }, note: { minHeight: 80 },
});

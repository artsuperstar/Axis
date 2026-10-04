import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useRef, useState, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { FormButton, FormError, FormField, FormScrollView, FormSelect, FormSelectionHost, InlineNameForm, SegmentedControl, SelectField, type FormSelectionHandle } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { dateLabel, localDateString, pickerValue } from '@/utils/calendar';

import { financeError } from '../../errors';
import { financeCategoryForTransaction } from '../../form';
import { commitmentTypeOptions, createFinanceCategorySelection, financeCategoryOptions } from '../../form-options';
import { formatBrlAmount, formatBrlInput } from '../../money';
import type { FinanceCategory } from '../../types';
import { commitmentDraft, validateCommitmentDraft, validatePayment } from '../form';
import { type CommitmentDraft, type CommitmentItem, type OccurrenceTarget } from '../types';

export function CommitmentModal({ children, onDismiss }: {
  children: ReactNode; onDismiss: () => void;
}) {
  const menu = useRef<FormSelectionHandle>(null);
  function requestClose() { if (!menu.current?.dismiss()) onDismiss(); }
  return <Modal visible presentationStyle="pageSheet" onRequestClose={requestClose}>
    <SafeAreaProvider><ThemedView style={styles.container} accessibilityViewIsModal onAccessibilityEscape={requestClose}>
      <SafeAreaView style={styles.container}><KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FormSelectionHost ref={menu}>{children}</FormSelectionHost>
      </KeyboardAvoidingView></SafeAreaView>
    </ThemedView></SafeAreaProvider>
  </Modal>;
}

export function CommitmentSheet({ title, children, onDismiss, action, onConfirm }: {
  title: string; children: ReactNode; onDismiss: () => void; action?: string; onConfirm?: () => void;
}) {
  return <View style={styles.container}>
    <View style={styles.header}>
      <FormButton label={action ? 'Cancel' : 'Done'} onPress={onDismiss} />
      <ThemedText type="smallBold" accessibilityRole="header" style={styles.heading}>{title}</ThemedText>
      {action && onConfirm && <FormButton label={action} onPress={onConfirm} />}
    </View>
    <FormScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>{children}</FormScrollView>
  </View>;
}

function CommitmentDate({ label, value, onChange, minimumDate, maximumDate }: {
  label: string; value: string; onChange: (date: string) => void; minimumDate?: Date; maximumDate?: Date;
}) {
  const scheme = useColorScheme();
  const [open, setOpen] = useState(false);
  function choose() {
    Keyboard.dismiss();
    if (Platform.OS === 'android') DateTimePickerAndroid.open({ value: pickerValue(value), mode: 'date', minimumDate, maximumDate,
      onValueChange: (_event, date) => onChange(localDateString(date)) });
    else setOpen(true);
  }
  if (Platform.OS === 'web') return <FormField label={label} value={value} placeholder="YYYY-MM-DD" onChangeText={onChange} />;
  return <>
    <FormSelect label={label} value={dateLabel(value)} expanded={open} onPress={choose} />
    {open && Platform.OS === 'ios' && <>
      <DateTimePicker value={pickerValue(value)} mode="date" display="spinner" minimumDate={minimumDate} maximumDate={maximumDate}
        themeVariant={scheme === 'dark' ? 'dark' : 'light'} onValueChange={(_event, date) => onChange(localDateString(date))} />
      <FormButton label="Done" onPress={() => setOpen(false)} />
    </>}
  </>;
}

export function CommitmentEditor({ item, categories, onSave, onCreateCategory, onDismiss }: {
  item: CommitmentItem | null; categories: FinanceCategory[]; onSave: (draft: CommitmentDraft) => void; onCreateCategory: (name: string) => FinanceCategory; onDismiss: () => void;
}) {
  const [draft, setDraft] = useState(() => commitmentDraft(item?.commitment ?? null, item?.schedule));
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);
  const selected = financeCategoryForTransaction({ type: 'expense', categoryId: draft.categoryId }, categories);
  const archived = selected?.deletedAt != null;
  function change<K extends keyof CommitmentDraft>(key: K, value: CommitmentDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value })); setError(null);
  }
  function save() {
    if (saving.current) return;
    saving.current = true;
    try { validateCommitmentDraft(draft); onSave(draft); onDismiss(); }
    catch (cause) { saving.current = false; setError(financeError(cause, 'Unable to save this commitment.')); }
  }
  return <CommitmentSheet title={item ? 'Edit commitment' : 'New commitment'} action="Save" onConfirm={save} onDismiss={onDismiss}>
    <FormError message={error} />
    <SegmentedControl label="Type *" value={draft.kind} options={commitmentTypeOptions} disabled={!!item} onChange={(value) => change('kind', value)} />
    <FormField label="Title *" value={draft.title} onChangeText={(value) => change('title', value)} autoFocus />
    <FormField label={draft.kind === 'installment' ? 'Installment amount *' : 'Expected amount *'} value={draft.amount} placeholder="180,00"
      keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad'} onChangeText={(value) => change('amount', value)} />
    {draft.kind === 'installment' && <FormField label="Number of installments *" value={draft.installmentCount} keyboardType="number-pad" editable={!item}
      onChangeText={(value) => change('installmentCount', value)} />}
    {item ? <ThemedText type="small" themeColor="textSecondary">Schedule anchor: {dateLabel(draft.firstDueDate)}. Use Pause and Resume to choose a new anchor. Amount changes apply after today; retained past expectations stay unchanged.</ThemedText>
      : <CommitmentDate label="First due date *" value={draft.firstDueDate} onChange={(value) => change('firstDueDate', value)} />}
    <SelectField label="Category" value={draft.categoryId} options={financeCategoryOptions(categories, 'expense')} onChange={(value) => change('categoryId', value)}
      displayValue={selected ? `${selected.name}${archived ? ' (archived)' : ''}` : 'No category'}
      description={archived ? `Current category: ${selected?.name} (archived). Keep it by dismissing this menu, or choose an active category or No category.` : undefined}
      action={{ label: '+ New category', title: 'New expense category', accessibilityLabel: 'Create new expense category',
        render: (controls) => <InlineNameForm {...controls}
          onSubmit={(name, complete) => createFinanceCategorySelection(name, 'expense', onCreateCategory, (id) => change('categoryId', id), complete)}
          formatError={(cause) => financeError(cause, 'Unable to create this category. Please try again.')} /> }} />
    <ThemedText type="small" themeColor="textSecondary">Planned commitments affect Expenses only when you confirm a payment.</ThemedText>
  </CommitmentSheet>;
}

export function CommitmentPayment({ occurrence, title, onSave, onDismiss }: {
  occurrence: OccurrenceTarget; title: string; onSave: (amount: string, date: string) => void; onDismiss: () => void;
}) {
  const [amount, setAmount] = useState(() => formatBrlInput(occurrence.expectedAmountMinor));
  const [date, setDate] = useState(() => localDateString(new Date()));
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);
  function save() {
    if (saving.current) return;
    saving.current = true;
    try { validatePayment(amount, date, localDateString(new Date())); onSave(amount, date); onDismiss(); }
    catch (cause) { saving.current = false; setError(financeError(cause, 'Unable to record this payment.')); }
  }
  return <CommitmentSheet title="Mark as paid" action="Confirm" onConfirm={save} onDismiss={onDismiss}>
    <FormError message={error} />
    <ThemedText>{title}</ThemedText>
    <ThemedText type="small">Due {dateLabel(occurrence.dueDate)} · Expected {formatBrlAmount(occurrence.expectedAmountMinor)}</ThemedText>
    <FormField label="Amount paid *" value={amount} autoFocus keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad'} onChangeText={(value) => { setAmount(value); setError(null); }} />
    <CommitmentDate label="Payment date *" value={date} maximumDate={new Date()} onChange={(value) => { setDate(value); setError(null); }} />
  </CommitmentSheet>;
}

export function CommitmentResume({ title, proposedDate, onResume, onDismiss }: {
  title: string; proposedDate: string; onResume: (date: string) => void; onDismiss: () => void;
}) {
  const [date, setDate] = useState(proposedDate);
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);
  function save() {
    if (saving.current) return;
    saving.current = true;
    try { onResume(date); onDismiss(); }
    catch (cause) { saving.current = false; setError(financeError(cause, 'Unable to resume this commitment.')); }
  }
  return <CommitmentSheet title="Resume commitment" action="Resume" onConfirm={save} onDismiss={onDismiss}>
    <FormError message={error} />
    <ThemedText>{title}</ThemedText>
    <CommitmentDate label="Next due date *" value={date} minimumDate={pickerValue(localDateString(new Date()), '00:00')} onChange={(value) => { setDate(value); setError(null); }} />
    <ThemedText type="small" themeColor="textSecondary">Keep the proposed date to retain the previous billing day. Choosing another date sets a new monthly anchor. Retained occurrences keep their dates and still need to be resolved. Paused months are not backfilled.</ThemedText>
  </CommitmentSheet>;
}

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two, padding: Spacing.three },
  heading: { flex: 1, minWidth: 80, textAlign: 'center' }, content: { padding: Spacing.three, gap: Spacing.three },
});

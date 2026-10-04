import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AutocompleteField } from '@/components/autocomplete-field';
import { AdaptiveSheet as WorkSheet } from '@/components/adaptive-sheet';
import { FormButton, FormError, FormField, FormSelect, InlineNameForm, SegmentedControl, SelectField } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { dateLabel, localDateString, pickerValue } from '@/utils/calendar';

import { financeError } from '../../errors';
import { createFinanceCategorySelection, financeCategoryOptions } from '../../form-options';
import { formatBrlAmount, formatBrlInput } from '../../money';
import type { FinanceCategory } from '../../types';
import { allocationValues, compensationOptions, compensationValues, earnedMinor, workDraft } from '../form';
import { clientAutocomplete, clientLabel, paymentClientAutocomplete } from '../form-options';
import type { WorkCounterparty, WorkDraft, WorkItem, WorkPaymentDraft, WorkSnapshot } from '../types';

export { AdaptiveModal as WorkModal, AdaptiveSheet as WorkSheet } from '@/components/adaptive-sheet';

function WorkDate({ label, value, onChange, maximumDate }: { label: string; value: string; onChange: (date: string) => void; maximumDate?: Date }) {
  const scheme = useColorScheme();
  const [open, setOpen] = useState(false);
  function choose() {
    Keyboard.dismiss();
    if (Platform.OS === 'android') DateTimePickerAndroid.open({ value: pickerValue(value), mode: 'date', maximumDate,
      onValueChange: (_event, date) => onChange(localDateString(date)) });
    else { if (!value) onChange(localDateString(new Date())); setOpen(true); }
  }
  if (Platform.OS === 'web') return <FormField label={label} value={value} placeholder="YYYY-MM-DD" onChangeText={onChange} />;
  return <>
    <FormSelect label={label} value={value ? dateLabel(value) : 'Add date'} expanded={open} onPress={choose} />
    {open && Platform.OS === 'ios' && <>
      <DateTimePicker value={pickerValue(value)} mode="date" display="spinner" maximumDate={maximumDate}
        themeVariant={scheme === 'dark' ? 'dark' : 'light'} onValueChange={(_event, date) => onChange(localDateString(date))} />
      <FormButton label="Done" onPress={() => setOpen(false)} />
    </>}
  </>;
}

export function WorkEditor({ item, counterparties, onSave, onCreateCounterparty, onDismiss }: {
  item: WorkItem | null; counterparties: WorkCounterparty[]; onSave: (draft: WorkDraft) => void;
  onCreateCounterparty: (name: string) => WorkCounterparty; onDismiss: () => void;
}) {
  const [draft, setDraft] = useState(() => workDraft(item?.entry));
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);
  const selected = counterparties.find((party) => party.id === draft.counterpartyId);
  const archived = selected?.deletedAt != null;
  const counterpartyLocked = !!item?.receivedMinor;
  let preview: number | null = null;
  try { preview = earnedMinor(compensationValues(draft)); } catch { /* Incomplete terms are validated on Save. */ }
  function change<K extends keyof WorkDraft>(key: K, value: WorkDraft[K]) { setDraft((current) => ({ ...current, [key]: value })); setError(null); }
  function save() {
    if (saving.current) return; saving.current = true;
    try { onSave(draft); onDismiss(); }
    catch (cause) { saving.current = false; setError(financeError(cause, 'Unable to save this work entry.')); }
  }
  return <WorkSheet title={item ? 'Edit work' : 'New work'} action="Save" onConfirm={save} onDismiss={onDismiss}>
    <FormError message={error} />
    <SegmentedControl label="Compensation *" value={draft.compensationType} options={compensationOptions} onChange={(value) => change('compensationType', value)} />
    <FormField label="Description *" value={draft.description} autoFocus onChangeText={(value) => change('description', value)} />
    <AutocompleteField label="Client *" value={draft.counterpartyId} disabled={counterpartyLocked}
      displayValue={clientLabel(selected)} onSelect={(value) => change('counterpartyId', value)}
      description={archived ? 'This archived client is retained for historical work. Choose an active client to change it.' : undefined}
      getResults={(query) => clientAutocomplete(counterparties, query)} onCreate={(name) => onCreateCounterparty(name).id}
      formatError={(cause) => financeError(cause, 'Unable to create this client.')} />
    <WorkDate label="Work date *" value={draft.workDate} maximumDate={new Date()} onChange={(value) => change('workDate', value)} />
    {draft.compensationType === 'hourly' ? <>
      <ThemedText type="smallBold">Duration *</ThemedText>
      <View style={styles.duration}>
        <View style={styles.durationField}><FormField label="Hours" accessibilityLabel="Duration, whole hours" value={draft.hours} placeholder="2" keyboardType="number-pad" onChangeText={(value) => change('hours', value)} /></View>
        <View style={styles.durationField}><FormField label="Minutes" accessibilityLabel="Duration, minutes from 0 to 59" value={draft.minutes} placeholder="30" keyboardType="number-pad" onChangeText={(value) => change('minutes', value)} /></View>
      </View>
      <FormField label="Hourly rate *" accessibilityLabel="Hourly rate in reais, required" value={draft.hourlyRate} placeholder="50,00" keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad'} onChangeText={(value) => change('hourlyRate', value)} />
    </> : <FormField label="Fixed amount *" accessibilityLabel="Fixed amount in reais, required" value={draft.fixedAmount} placeholder="800,00" keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad'} onChangeText={(value) => change('fixedAmount', value)} />}
    <ThemedText type="smallBold">Earned: {preview !== null ? formatBrlAmount(preview) : 'Enter compensation terms'}</ThemedText>
    {counterpartyLocked && <ThemedText type="small" themeColor="textSecondary">Received {formatBrlAmount(item!.receivedMinor)}. Earned cannot be reduced below this amount. Undo payments before changing the client.</ThemedText>}
    <WorkDate label="Expected payment date" value={draft.expectedPaymentDate} onChange={(value) => change('expectedPaymentDate', value)} />
    {!!draft.expectedPaymentDate && <FormButton label="Clear expected date" onPress={() => change('expectedPaymentDate', '')} />}
    <ThemedText type="small" themeColor="textSecondary">Work records money earned. Income is recorded only when you receive a payment.</ThemedText>
  </WorkSheet>;
}

export function WorkPaymentEditor({ data, categories, initialItem, onSave, onCreateCategory, onDismiss }: {
  data: WorkSnapshot; categories: FinanceCategory[]; initialItem?: WorkItem; onSave: (draft: WorkPaymentDraft) => void;
  onCreateCategory: (name: string) => FinanceCategory; onDismiss: () => void;
}) {
  const colors = useTheme();
  const [draft, setDraft] = useState<WorkPaymentDraft>(() => ({ counterpartyId: initialItem?.entry.counterpartyId ?? null,
    allocations: initialItem ? [{ workEntryId: initialItem.entry.id, amount: formatBrlInput(initialItem.outstandingMinor) }] : [],
    categoryId: null, paymentDate: localDateString(new Date()) }));
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);
  const available = data.items.filter((item) => item.entry.counterpartyId === draft.counterpartyId && item.outstandingMinor > 0);
  let total: number | null = null;
  try { total = allocationValues(draft.allocations).amountMinor; } catch { /* Show the authoritative error on Confirm. */ }
  function change<K extends keyof WorkPaymentDraft>(key: K, value: WorkPaymentDraft[K]) { setDraft((current) => ({ ...current, [key]: value })); setError(null); }
  function toggle(item: WorkItem) {
    const id = item.entry.id;
    change('allocations', draft.allocations.some((row) => row.workEntryId === id) ? draft.allocations.filter((row) => row.workEntryId !== id)
      : [...draft.allocations, { workEntryId: id, amount: formatBrlInput(item.outstandingMinor) }]);
  }
  function save() {
    if (saving.current) return; saving.current = true;
    try { onSave(draft); onDismiss(); }
    catch (cause) { saving.current = false; setError(financeError(cause, 'Unable to record this payment.')); }
  }
  return <WorkSheet title="Record payment" action="Confirm" onConfirm={save} onDismiss={onDismiss}>
    <FormError message={error} />
    <AutocompleteField label="Client *" value={draft.counterpartyId}
      displayValue={clientLabel(data.counterparties.find((client) => client.id === draft.counterpartyId))}
      getResults={(query) => paymentClientAutocomplete(data.counterparties, data.items, query)} onSelect={(value) => {
      setDraft((current) => ({ ...current, counterpartyId: value, allocations: [] })); setError(null);
    }} />
    {!draft.counterpartyId && <ThemedText type="small" themeColor="textSecondary">Choose who paid you, then select their outstanding work.</ThemedText>}
    {available.map((item) => {
      const allocation = draft.allocations.find((row) => row.workEntryId === item.entry.id);
      return <View key={item.entry.id} style={styles.allocation}>
        <Pressable accessibilityRole="checkbox" accessibilityLabel={`Allocate payment to ${item.entry.description}`} accessibilityState={{ checked: !!allocation }} aria-checked={!!allocation}
          onPress={() => toggle(item)} style={[styles.entryChoice, { backgroundColor: allocation ? colors.backgroundSelected : colors.backgroundElement, borderColor: colors.textSecondary }]}>
          <ThemedText>{item.entry.description}{allocation ? ' ✓' : ''}</ThemedText>
          <ThemedText type="small">Outstanding {formatBrlAmount(item.outstandingMinor)}</ThemedText>
        </Pressable>
        {allocation && <FormField label="Allocate *" accessibilityLabel={`Allocation in reais for ${item.entry.description}`} value={allocation.amount}
          keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad'} onChangeText={(amount) => change('allocations', draft.allocations.map((row) => row.workEntryId === item.entry.id ? { ...row, amount } : row))} />}
      </View>;
    })}
    <ThemedText type="smallBold">Payment total: {total !== null ? formatBrlAmount(total) : 'Select work and enter valid allocations'}</ThemedText>
    <WorkDate label="Payment date *" value={draft.paymentDate} maximumDate={new Date()} onChange={(value) => change('paymentDate', value)} />
    <SelectField label="Income category" value={draft.categoryId} options={financeCategoryOptions(categories, 'income')} onChange={(value) => change('categoryId', value)}
      action={{ label: '+ New category', title: 'New income category', accessibilityLabel: 'Create new income category', render: (controls) => <InlineNameForm {...controls}
        onSubmit={(name, complete) => createFinanceCategorySelection(name, 'income', onCreateCategory, (id) => change('categoryId', id), complete)}
        formatError={(cause) => financeError(cause, 'Unable to create this category.')} /> }} />
    <ThemedText type="small" themeColor="textSecondary">Confirm only money already received. This creates one Income transaction for the allocation total.</ThemedText>
  </WorkSheet>;
}

const styles = StyleSheet.create({
  duration: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three }, durationField: { flex: 1, minWidth: 120 }, allocation: { gap: Spacing.two },
  entryChoice: { minHeight: 48, padding: Spacing.three, gap: Spacing.two, borderWidth: 1, borderRadius: Spacing.two },
});

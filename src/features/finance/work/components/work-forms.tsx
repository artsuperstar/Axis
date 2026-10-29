import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useMemo, useRef, useState } from 'react';
import { Keyboard, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

import { AutocompleteField } from '@/components/autocomplete-field';
import { AdaptiveSheet as WorkSheet } from '@/components/adaptive-sheet';
import { PickerBackHeader } from '@/components/back-button';
import { DesignProvider, UiIcon, UiText, useDesignColors } from '@/components/design-system';
import { EditorSection } from '@/components/editor-section';
import { FormButton, FormError, FormField, FormSelect, InlineNameForm, SegmentedControl, SelectField } from '@/components/form-controls';
import { DesignSpace } from '@/constants/design-system-v2';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { dateLabel, localDateString, pickerValue } from '@/utils/calendar';
import { singleLineText } from '@/utils/text-normalization';

import { financeError, FinanceValidationError } from '../../errors';
import { createFinanceCategorySelection, financeCategoryOptions } from '../../form-options';
import { formatBrlAmount, formatBrlInput } from '../../money';
import type { FinanceCategory } from '../../types';
import { allocationValues, compensationOptions, compensationValues, earnedMinor, workDraft } from '../form';
import { clientAutocomplete, clientLabel, paymentClientAutocomplete } from '../form-options';
import { jobTitle } from '../presentation';
import type { WorkCounterparty, WorkDraft, WorkItem, WorkPaymentDraft, WorkSnapshot } from '../types';
import { WorkPaymentList, workPaymentStyles as paymentStyles } from './work-payment-list';

export { AdaptiveModal as WorkModal, AdaptiveSheet as WorkSheet } from '@/components/adaptive-sheet';

function WorkDate({ label, value, onChange, maximumDate, appearance }: { label: string; value: string; onChange: (date: string) => void; maximumDate?: Date; appearance?: 'v2' }) {
  const scheme = useColorScheme();
  const [open, setOpen] = useState(false);
  function choose() {
    Keyboard.dismiss();
    if (Platform.OS === 'android') DateTimePickerAndroid.open({ value: pickerValue(value), mode: 'date', maximumDate,
      onValueChange: (_event, date) => onChange(localDateString(date)) });
    else { if (!value) onChange(localDateString(new Date())); setOpen(true); }
  }
  if (Platform.OS === 'web') return <FormField appearance={appearance} label={label} value={value} placeholder="YYYY-MM-DD" onChangeText={onChange} />;
  return <>
    <FormSelect appearance={appearance} label={label} value={value ? dateLabel(value) : 'Add date'} expanded={open} onPress={choose} />
    {open && Platform.OS === 'ios' && <>
      <PickerBackHeader appearance={appearance} title={label} onBack={() => setOpen(false)} />
      <DateTimePicker value={pickerValue(value)} mode="date" display="spinner" maximumDate={maximumDate}
        themeVariant={scheme === 'dark' ? 'dark' : 'light'} onValueChange={(_event, date) => onChange(localDateString(date))} />
    </>}
  </>;
}

export function WorkEditor({ item, counterparties, initialCounterpartyId, onSave, onCreateCounterparty, onDismiss }: {
  item: WorkItem | null; counterparties: WorkCounterparty[]; onSave: (draft: WorkDraft) => void;
  initialCounterpartyId?: string;
  onCreateCounterparty: (name: string) => WorkCounterparty; onDismiss: () => void;
}) {
  const colors = useDesignColors();
  const { width, fontScale } = useWindowDimensions();
  const stackHeader = width < 390 || fontScale >= 1.4;
  const stackFields = width < 360 || fontScale >= 1.4;
  const sectionHeadingStyle = width < 390 && fontScale >= 1.4 ? editorStyles.narrowHeading : undefined;
  const [descriptionHeight, setDescriptionHeight] = useState(96);
  const [draft, setDraft] = useState(() => ({ ...workDraft(item?.entry), counterpartyId: item?.entry.counterpartyId ?? initialCounterpartyId ?? null }));
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
  const title = item ? 'Edit work' : 'New work';
  return <DesignProvider><WorkSheet appearance="v2" title={title} action="Save" onConfirm={save} onDismiss={onDismiss}
    contentContainerStyle={editorStyles.content} header={<View style={editorStyles.header}>
      <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[editorStyles.handle, { backgroundColor: colors.borderStrong }]} />
      {stackHeader && <UiText type="editorTitle" accessibilityRole="header" style={editorStyles.title}>{title}</UiText>}
      <View style={editorStyles.headerRow}>
        <FormButton appearance="v2" compact variant="quiet" label="Cancel" onPress={onDismiss} />
        {!stackHeader && <UiText type="editorTitle" accessibilityRole="header" style={[editorStyles.title, editorStyles.heading]}>{title}</UiText>}
        <FormButton appearance="v2" variant="primary" label="Save" onPress={save} />
      </View>
    </View>}>
    <FormError appearance="v2" message={error} />
    <EditorSection title="Job" description="What work did you do and for whom?" icon="briefcase" variant="group" stackHeading={stackFields} headingStyle={sectionHeadingStyle}>
    <FormField appearance="v2" label="Job title *" placeholder="Enter a job title" value={draft.title} multiline={false} autoFocus onChangeText={(value) => change('title', singleLineText(value))} />
    <WorkDraftValue label="Job title" value={draft.title} show={draft.title.length > 44 || (fontScale >= 1.4 && draft.title.length > 14)} />
    {counterpartyLocked ? <>
      <FormField appearance="v2" label="Client *" value={clientLabel(selected)} editable={false} helperText="Undo payments before changing the client." />
      <WorkDraftValue label="Client" value={clientLabel(selected)} show={clientLabel(selected).length > 35 || fontScale >= 1.4} />
    </> : <AutocompleteField appearance="v2" label="Client *" value={draft.counterpartyId}
      displayValue={clientLabel(selected)} onSelect={(value) => change('counterpartyId', value)}
      description={archived ? 'This archived client is retained for historical work. Choose an active client to change it.' : undefined}
      getResults={(query) => clientAutocomplete(counterparties, query)} onCreate={(name) => onCreateCounterparty(name).id}
      formatError={(cause) => financeError(cause, 'Unable to create this client.')} />}
    <FormField appearance="v2" label="Description" placeholder="Add a description (optional)" value={draft.description} multiline scrollEnabled={false} textAlignVertical="top"
      style={{ minHeight: 96, height: descriptionHeight }} onContentSizeChange={event => setDescriptionHeight(Math.max(96, Math.ceil(event.nativeEvent.contentSize.height)))}
      onChangeText={(value) => change('description', value)} />
    </EditorSection>
    <EditorSection title="Work details" description="When did you do this work?" icon="calendar" variant="group" stackHeading={stackFields} headingStyle={sectionHeadingStyle}>
      <WorkDate appearance="v2" label="Work date *" value={draft.workDate} maximumDate={new Date()} onChange={(value) => change('workDate', value)} />
    </EditorSection>
    <EditorSection title="Compensation" description="How are you paid for this work?" icon="creditCard" variant="group" stackHeading={stackFields} headingStyle={sectionHeadingStyle}>
    <SegmentedControl appearance="v2" label="Compensation type *" value={draft.compensationType} options={compensationOptions} onChange={(value) => change('compensationType', value)} />
    {draft.compensationType === 'hourly' ? <>
      <UiText type="fieldLabel">Duration *</UiText>
      <View style={[editorStyles.duration, stackFields && editorStyles.stacked]}>
        <View style={[editorStyles.durationField, stackFields && editorStyles.full]}><FormField appearance="v2" label="Hours" accessibilityLabel="Duration, whole hours" value={draft.hours} placeholder="2" keyboardType="number-pad" onChangeText={(value) => change('hours', value)} />
          <WorkDraftValue label="Hours" value={draft.hours} show={draft.hours.length > 8} /></View>
        <View style={[editorStyles.durationField, stackFields && editorStyles.full]}><FormField appearance="v2" label="Minutes" accessibilityLabel="Duration, minutes from 0 to 59" value={draft.minutes} placeholder="30" keyboardType="number-pad" onChangeText={(value) => change('minutes', value)} />
          <WorkDraftValue label="Minutes" value={draft.minutes} show={draft.minutes.length > 4} /></View>
      </View>
      <FormField appearance="v2" label="Hourly rate *" accessibilityLabel="Hourly rate in reais, required" value={draft.hourlyRate} placeholder="50,00" keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad'} onChangeText={(value) => change('hourlyRate', value)} />
      <WorkDraftValue label="Hourly rate in reais" value={draft.hourlyRate} show={draft.hourlyRate.length > 14 || (fontScale >= 1.4 && draft.hourlyRate.length > 8)} />
    </> : <>
      <FormField appearance="v2" label="Fixed amount *" accessibilityLabel="Fixed amount in reais, required" value={draft.fixedAmount} placeholder="800,00" keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad'} onChangeText={(value) => change('fixedAmount', value)} />
      <WorkDraftValue label="Fixed amount in reais" value={draft.fixedAmount} show={draft.fixedAmount.length > 14 || (fontScale >= 1.4 && draft.fixedAmount.length > 8)} />
    </>}
    <UiText testID="work-editor-earned" type="cardTitle" selectable style={editorStyles.readable}>Earned: {preview !== null ? formatBrlAmount(preview) : 'Enter compensation terms'}</UiText>
    {counterpartyLocked && <UiText type="secondary" color="textSecondary">Received {formatBrlAmount(item!.receivedMinor)}. Earned cannot be reduced below this amount. Undo payments before changing the client.</UiText>}
    </EditorSection>
    <EditorSection title="Payment expectation" description="When you expect to receive this money, separately from the work date." icon="calendar" variant="group" stackHeading={stackFields} headingStyle={sectionHeadingStyle}>
      <WorkDate appearance="v2" label="Expected payment date" value={draft.expectedPaymentDate} onChange={(value) => change('expectedPaymentDate', value)} />
      {!!draft.expectedPaymentDate && <FormButton appearance="v2" variant="quiet" label="Clear expected date" onPress={() => change('expectedPaymentDate', '')} />}
      <View style={editorStyles.note}><UiIcon name="info" size={20} color={colors.textSecondary} /><UiText type="secondary" color="textSecondary" style={editorStyles.noteText}>Work records money earned. Income is recorded only when you receive a payment.</UiText></View>
    </EditorSection>
  </WorkSheet></DesignProvider>;
}

/** Wrapped readback keeps long single-line drafts readable without changing their input semantics. */
function WorkDraftValue({ label, value, show }: { label: string; value: string; show: boolean }) {
  return show && !!value ? <UiText testID="work-editor-full-value" type="secondary" color="textSecondary" selectable accessibilityLabel={`${label}: ${value}`} style={editorStyles.readable}>{value}</UiText> : null;
}

const editorStyles = StyleSheet.create({
  content: { padding: DesignSpace.md, gap: DesignSpace.md },
  header: { padding: DesignSpace.md, gap: DesignSpace.sm },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center' },
  headerRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: DesignSpace.sm },
  title: { fontSize: 24, lineHeight: 32, textAlign: 'center', maxWidth: '100%' }, heading: { flex: 1, minWidth: 0 },
  narrowHeading: { fontSize: 18, lineHeight: 26 },
  duration: { flexDirection: 'row', gap: DesignSpace.md }, durationField: { flex: 1, minWidth: 0, gap: DesignSpace.xs },
  stacked: { flexDirection: 'column' }, full: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  readable: { minWidth: 0, maxWidth: '100%', fontVariant: ['tabular-nums'] },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: DesignSpace.sm }, noteText: { flex: 1, minWidth: 0 },
});

export function WorkPaymentEditor({ data, categories, initialItem, initialCounterpartyId, onSave, onCreateCategory, onDismiss }: {
  data: Pick<WorkSnapshot, 'items' | 'counterparties'>; categories: FinanceCategory[]; initialItem?: WorkItem; onSave: (draft: WorkPaymentDraft) => void;
  initialCounterpartyId?: string;
  onCreateCategory: (name: string) => FinanceCategory; onDismiss: () => void;
}) {
  const colors = useDesignColors();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 390 || fontScale >= 1.4;
  const headingStyle = width < 390 && fontScale >= 1.4 ? paymentStyles.narrowHeading : undefined;
  const [draft, setDraft] = useState<WorkPaymentDraft>(() => ({ counterpartyId: initialItem?.entry.counterpartyId ?? initialCounterpartyId ?? null,
    allocations: initialItem ? [{ workEntryId: initialItem.entry.id, amount: formatBrlInput(initialItem.outstandingMinor) }] : [],
    categoryId: null, paymentDate: localDateString(new Date()) }));
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const available = useMemo(() => data.items.filter(item => item.entry.counterpartyId === draft.counterpartyId && item.outstandingMinor > 0), [data.items, draft.counterpartyId]);
  const availableById = useMemo(() => new Map(available.map(item => [item.entry.id, item])), [available]);
  const allocations = useMemo(() => new Map(draft.allocations.map(row => [row.workEntryId, row])), [draft.allocations]);
  const outstanding = useMemo(() => available.reduce((sum, item) => sum + BigInt(item.outstandingMinor), 0n), [available]);
  // Reuse the domain parser for both aggregate and adjacent feedback. Persistence rechecks current balances.
  const preview = useMemo(() => {
    let total: number | null = null;
    const errors = new Map<string, string>();
    try { total = allocationValues(draft.allocations).amountMinor; } catch { /* Confirm retains authoritative validation. */ }
    for (const allocation of draft.allocations) {
      try {
        const amount = allocationValues([allocation]).amountMinor;
        const item = availableById.get(allocation.workEntryId);
        if (!item) throw new FinanceValidationError('Choose outstanding work from this client only.');
        if (amount > item.outstandingMinor) throw new FinanceValidationError(`Allocation for “${jobTitle(item.entry)}” exceeds its outstanding amount. Refresh Work and try again.`);
      } catch (cause) { errors.set(allocation.workEntryId, financeError(cause, 'Enter a valid allocation amount.')); }
    }
    return { total: errors.size === 0 ? total : null, errors };
  }, [draft.allocations, availableById]);
  function change<K extends keyof WorkPaymentDraft>(key: K, value: WorkPaymentDraft[K]) { setDraft((current) => ({ ...current, [key]: value })); setError(null); }
  function toggle(item: WorkItem) {
    const id = item.entry.id;
    change('allocations', draft.allocations.some((row) => row.workEntryId === id) ? draft.allocations.filter((row) => row.workEntryId !== id)
      : [...draft.allocations, { workEntryId: id, amount: formatBrlInput(item.outstandingMinor) }]);
  }
  function save() {
    if (saving.current) return; saving.current = true; setSubmitting(true);
    try { onSave(draft); onDismiss(); }
    catch (cause) { saving.current = false; setSubmitting(false); setError(financeError(cause, 'Unable to record this payment.')); }
  }
  const header = <View style={paymentStyles.header}>
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[paymentStyles.handle, { backgroundColor: colors.borderStrong }]} />
    {stacked && <UiText type="editorTitle" accessibilityRole="header" style={paymentStyles.title}>Record payment</UiText>}
    <View style={paymentStyles.actions}>
      <FormButton appearance="v2" compact label="Cancel" variant="quiet" onPress={onDismiss} />
      {!stacked && <UiText type="editorTitle" accessibilityRole="header" style={[paymentStyles.title, paymentStyles.heading, { fontSize: 20, lineHeight: 28 }]}>Record payment</UiText>}
      <FormButton appearance="v2" compact label="Confirm" variant="primary" busy={submitting} disabled={!draft.counterpartyId || draft.allocations.length === 0} onPress={save} />
    </View>
  </View>;
  const before = <View style={paymentStyles.before}>
    <FormError appearance="v2" message={error} />
    <EditorSection title="Client" description="" icon="person" variant="group" stackHeading={stacked} headingStyle={headingStyle}>
    <AutocompleteField appearance="v2" label="Client *" value={draft.counterpartyId}
      displayValue={clientLabel(data.counterparties.find((client) => client.id === draft.counterpartyId))}
      getResults={(query) => paymentClientAutocomplete(data.counterparties, data.items, query)} onSelect={(value) => {
      setDraft((current) => ({ ...current, counterpartyId: value, allocations: [] })); setError(null);
    }} />
      <UiText type="secondary" color="textSecondary">Choose who paid you, then select their outstanding work.</UiText>
    </EditorSection>
    <View style={[paymentStyles.allocationHeader, { backgroundColor: colors.group, borderColor: colors.border }]}>
      <View style={[paymentStyles.sectionIdentity, stacked && paymentStyles.stacked]}>
        <View style={[paymentStyles.icon, { backgroundColor: colors.brandSoft }]}><UiIcon name="briefcase" size={20} color={colors.brand} /></View>
        <UiText type="editorSection" accessibilityRole="header" style={[paymentStyles.text, stacked && paymentStyles.unflex, headingStyle]}>Apply payment to work</UiText>
      </View>
      <UiText type="secondary" color="textSecondary">Choose the outstanding work and enter how much was received for each.</UiText>
      {!!draft.counterpartyId && <UiText type="secondary" selectable style={paymentStyles.number}>Outstanding {formatBrlAmount(outstanding)}</UiText>}
      {available.length === 0 && <UiText type="secondary" color="textSecondary">{draft.counterpartyId ? 'No outstanding work for this client.' : 'Choose a client to see outstanding work.'}</UiText>}
    </View>
  </View>;
  const after = <View style={paymentStyles.after}>
    <View testID="work-payment-total" accessibilityLiveRegion="polite" style={[paymentStyles.total, { backgroundColor: colors.group, borderColor: colors.border }]}>
      <UiText type="cardTitle" selectable style={paymentStyles.number}>Payment total: {preview.total !== null ? formatBrlAmount(preview.total) : 'Select work and enter valid amounts'}</UiText>
      {preview.total !== null && <UiText type="secondary" color="textSecondary" selectable style={paymentStyles.number}>Remaining after payment {formatBrlAmount(outstanding - BigInt(preview.total))}</UiText>}
    </View>
    <EditorSection title="Payment details" description="" icon="calendar" variant="group" stackHeading={stacked} headingStyle={headingStyle}>
    <WorkDate appearance="v2" label="Payment date *" value={draft.paymentDate} maximumDate={new Date()} onChange={(value) => change('paymentDate', value)} />
    <SelectField appearance="v2" label="Income category" value={draft.categoryId} options={financeCategoryOptions(categories, 'income')} onChange={(value) => change('categoryId', value)}
      action={{ label: '+ New category', title: 'New income category', accessibilityLabel: 'Create new income category', render: (controls) => <InlineNameForm {...controls} appearance="v2"
        onSubmit={(name, complete) => createFinanceCategorySelection(name, 'income', onCreateCategory, (id) => change('categoryId', id), complete)}
        formatError={(cause) => financeError(cause, 'Unable to create this category.')} /> }} />
    </EditorSection>
    <View style={paymentStyles.note}><UiIcon name="info" size={20} color={colors.textSecondary} /><UiText type="secondary" color="textSecondary" style={paymentStyles.text}>Confirm only money already received. This creates one Income transaction for the allocation total.</UiText></View>
  </View>;
  return <DesignProvider><WorkSheet appearance="v2" title="Record payment" action="Confirm" onConfirm={save} onDismiss={onDismiss} header={header} fillHeight
    scrollBody={<WorkPaymentList items={available} allocations={allocations} errors={preview.errors} header={before} footer={after} onToggle={toggle}
      onAmount={(id, amount) => change('allocations', draft.allocations.map(row => row.workEntryId === id ? { ...row, amount } : row))} />} /></DesignProvider>;
}

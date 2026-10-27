import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useRef, useState } from 'react';
import { Keyboard, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

import { FormButton, FormError, FormField, FormSelect, InlineNameForm, SegmentedControl, SelectField } from '@/components/form-controls';
import { DesignProvider, GroupSurface, UiIcon, UiText, useDesignColors } from '@/components/design-system';
import { EditorSection } from '@/components/editor-section';
import { PickerBackHeader } from '@/components/back-button';
import { Space } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { dateLabel, localDateString, pickerValue } from '@/utils/calendar';

import { financeError } from '../../errors';
import { financeCategoryForTransaction } from '../../form';
import { commitmentTypeOptions, createFinanceCategorySelection, financeCategoryOptions } from '../../form-options';
import { formatBrlAmount, formatBrlInput } from '../../money';
import type { FinanceCategory } from '../../types';
import { commitmentDraft, validateCommitmentDraft, validatePayment } from '../form';
import { commitmentKindLabels, type CommitmentDraft, type CommitmentItem, type CommitmentKind, type OccurrenceTarget } from '../types';
import { commitmentTypeIcon } from '../type-icons';
import { commitmentStatusLabel } from '../presentation';

import { AdaptiveSheet as CommitmentSheet } from '@/components/adaptive-sheet';
export { AdaptiveModal as CommitmentModal, AdaptiveSheet as CommitmentSheet } from '@/components/adaptive-sheet';

function CommitmentDate({ label, value, onChange, minimumDate, maximumDate, appearance, error, disabled = false }: {
  label: string; value: string; onChange: (date: string) => void; minimumDate?: Date; maximumDate?: Date; appearance?: 'v2'; error?: string | null; disabled?: boolean;
}) {
  const scheme = useColorScheme();
  const [open, setOpen] = useState(false);
  function choose() {
    Keyboard.dismiss();
    if (Platform.OS === 'android') DateTimePickerAndroid.open({ value: pickerValue(value), mode: 'date', minimumDate, maximumDate,
      onValueChange: (_event, date) => onChange(localDateString(date)) });
    else setOpen(true);
  }
  if (Platform.OS === 'web') return <FormField appearance={appearance} label={label} value={value} placeholder="YYYY-MM-DD" onChangeText={onChange} error={error} editable={!disabled} />;
  return <>
    <FormSelect appearance={appearance} icon={appearance ? 'calendar' : undefined} label={label} value={dateLabel(value)} expanded={open} onPress={choose} error={error} disabled={disabled} />
    {open && Platform.OS === 'ios' && <>
      <PickerBackHeader appearance={appearance} title={label} onBack={() => setOpen(false)} />
      <DateTimePicker value={pickerValue(value)} mode="date" display="spinner" minimumDate={minimumDate} maximumDate={maximumDate}
        themeVariant={scheme === 'dark' ? 'dark' : 'light'} onValueChange={(_event, date) => onChange(localDateString(date))} />
    </>}
  </>;
}

export function CommitmentEditor({ item, categories, onSave, onCreateCategory, onDismiss }: {
  item: CommitmentItem | null; categories: FinanceCategory[]; onSave: (draft: CommitmentDraft) => void; onCreateCategory: (name: string) => FinanceCategory; onDismiss: () => void;
}) {
  const colors = useDesignColors();
  const { width, fontScale } = useWindowDimensions();
  const stackedHeader = width < 390 || fontScale >= 1.5;
  const stackedSections = width < 390 && fontScale >= 1.5;
  const [draft, setDraft] = useState(() => commitmentDraft(item?.commitment ?? null, item?.schedule));
  const [error, setError] = useState<string | null>(null);
  const [titleHeight, setTitleHeight] = useState(52);
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
  return <DesignProvider><CommitmentSheet appearance="v2" contentContainerStyle={styles.editorContent} header={<View style={styles.editorHeader}>
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
    <View style={[styles.headerRow, stackedHeader && styles.headerStack]}>
      {stackedHeader && <UiText type="editorTitle" accessibilityRole="header" style={styles.editorTitle}>{item ? 'Edit commitment' : 'New commitment'}</UiText>}
      <View style={[styles.headerRow, stackedHeader && styles.headerActions]}>
        <FormButton appearance="v2" compact variant="quiet" label="Cancel" onPress={onDismiss} />
        {!stackedHeader && <UiText type="editorTitle" accessibilityRole="header" style={[styles.editorTitle, styles.heading]}>{item ? 'Edit commitment' : 'New commitment'}</UiText>}
        <FormButton appearance="v2" variant="primary" label="Save" onPress={save} />
      </View>
    </View>
  </View>}>
    <FormError appearance="v2" message={error} />
    <EditorSection title="Commitment" description="Add a recurring expense, bill or installment." icon="receipt" variant="group" stackHeading={stackedSections}>
    <SegmentedControl appearance="v2" equalWidth={false} stacked={width < 390} label="Type *" value={draft.kind} options={commitmentTypeOptions} disabled={!!item} onChange={(value) => change('kind', value)} />
    <FormField appearance="v2" label="Title *" accessibilityLabel="Title, required" placeholder="e.g. Electricity bill" value={draft.title} onChangeText={(value) => change('title', value)} autoFocus
      multiline scrollEnabled={false} textAlignVertical="top" style={{ minHeight: 52, height: titleHeight }} onContentSizeChange={event => setTitleHeight(Math.max(52, Math.ceil(event.nativeEvent.contentSize.height)))} />
    <FormField appearance="v2" label={draft.kind === 'installment' ? 'Installment amount *' : 'Expected amount *'} value={draft.amount} placeholder="180,00"
      keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad'} onChangeText={(value) => change('amount', value)} />
    {!!draft.amount && (fontScale >= 1.5 || draft.amount.length > 14) && <UiText testID="commitment-editor-full-amount" type="numeric" selectable style={styles.fullAmount}
      accessibilityLabel={`Entered amount in reais: ${draft.amount}`}>{draft.amount}</UiText>}
    </EditorSection>
    <EditorSection title="Schedule" description="When is this commitment due?" icon="calendar" variant="group" stackHeading={stackedSections}>
    {item ? <UiText type="secondary" color="textSecondary">Schedule anchor: {dateLabel(draft.firstDueDate)}. Use Pause and Resume to choose a new anchor. Amount changes apply after today; retained past expectations stay unchanged.</UiText>
      : <CommitmentDate appearance="v2" label="First due date *" value={draft.firstDueDate} onChange={(value) => change('firstDueDate', value)} />}
    {draft.kind === 'installment' && <FormField appearance="v2" label="Number of installments *" value={draft.installmentCount} keyboardType="number-pad" editable={!item}
      onChangeText={(value) => change('installmentCount', value)} />}
    </EditorSection>
    <EditorSection title="Details" description="Categorize this commitment." icon="tag" variant="group" stackHeading={stackedSections}>
    <SelectField appearance="v2" icon="tag" label="Category" value={draft.categoryId} options={financeCategoryOptions(categories, 'expense')} onChange={(value) => change('categoryId', value)}
      displayValue={selected ? `${selected.name}${archived ? ' (archived)' : ''}` : 'No category'}
      description={archived ? `Current category: ${selected?.name} (archived). Keep it by dismissing this menu, or choose an active category or No category.` : undefined}
      action={{ label: '+ New category', title: 'New expense category', accessibilityLabel: 'Create new expense category',
        render: (controls) => <InlineNameForm {...controls} appearance="v2"
          onSubmit={(name, complete) => createFinanceCategorySelection(name, 'expense', onCreateCategory, (id) => change('categoryId', id), complete)}
          formatError={(cause) => financeError(cause, 'Unable to create this category. Please try again.')} /> }} />
    </EditorSection>
    <View style={styles.editorNote}><UiIcon name="info" color={colors.textSecondary} size={20} /><UiText type="metadata" color="textSecondary" style={styles.noteText}>Planned commitments affect Expenses only when you confirm a payment.</UiText></View>
  </CommitmentSheet></DesignProvider>;
}

export function CommitmentPayment({ occurrence, title, kind, categoryName, onSave, onDismiss }: {
  occurrence: OccurrenceTarget; title: string; kind: CommitmentKind; categoryName?: string | null; onSave: (amount: string, date: string) => unknown; onDismiss: () => void;
}) {
  const colors = useDesignColors();
  const { width, fontScale } = useWindowDimensions();
  const stackedHeader = width < 390 || fontScale >= 1.5;
  const [amount, setAmount] = useState(() => formatBrlInput(occurrence.expectedAmountMinor));
  const [date, setDate] = useState(() => localDateString(new Date()));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const saving = useRef(false);
  const errorField = !error ? null : error.includes('date') ? 'date' : error.includes('amount') || error.includes('centavo') ? 'amount' : null;
  async function save() {
    if (saving.current) return;
    saving.current = true;
    try {
      validatePayment(amount, date, localDateString(new Date()));
      setSubmitting(true);
      // The production SQLite service is synchronous. Also expose pending state
      // when a host callback awaits completion, without delaying synchronous writes.
      const result = onSave(amount, date);
      if (result instanceof Promise) await result;
      onDismiss();
    } catch (cause) { saving.current = false; setSubmitting(false); setError(financeError(cause, 'Unable to record this payment.')); }
  }
  return <DesignProvider><CommitmentSheet appearance="v2" contentContainerStyle={styles.editorContent} header={<View style={styles.editorHeader}>
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
    <View style={[styles.headerRow, stackedHeader && styles.headerStack]}>
      {stackedHeader && <UiText type="editorTitle" accessibilityRole="header" style={styles.editorTitle}>Pay commitment</UiText>}
      <View style={[styles.headerRow, stackedHeader && styles.headerActions]}>
        <FormButton appearance="v2" compact variant="quiet" label="Cancel" onPress={onDismiss} />
        {!stackedHeader && <UiText type="editorTitle" accessibilityRole="header" style={[styles.editorTitle, styles.heading]}>Pay commitment</UiText>}
        <FormButton appearance="v2" variant="primary" label="Confirm" busy={submitting} disabled={submitting} accessibilityHint={submitting ? 'Recording payment. Please wait.' : 'Record this payment and resolve the occurrence.'} onPress={save} />
      </View>
    </View>
  </View>}>
    <FormError appearance="v2" message={errorField ? null : error} />
    <GroupSurface testID="commitment-payment-summary" accessible
      accessibilityLabel={`${commitmentKindLabels[kind]}, ${title}. Due ${dateLabel(occurrence.dueDate)}. Expected amount ${formatBrlAmount(occurrence.expectedAmountMinor)}. Expense category ${categoryName || 'No category'}.`}
      style={[styles.paymentSummary, { borderColor: colors.border }, fontScale >= 1.5 && styles.summaryStack]}>
      <View style={[styles.paymentTile, { backgroundColor: colors.brandSoft }]}><UiIcon name={commitmentTypeIcon(kind)} color={colors.brand} size={24} /></View>
      <View style={[styles.paymentIdentity, fontScale >= 1.5 && styles.summaryFull]}>
        <UiText type="cardTitle">{title}</UiText>
        {[
          { icon: 'calendar' as const, text: `Due ${dateLabel(occurrence.dueDate)}` },
          { icon: 'creditCard' as const, text: `Expected amount · ${formatBrlAmount(occurrence.expectedAmountMinor)}` },
          { icon: 'tag' as const, text: `Expense category · ${categoryName || 'No category'}` },
        ].map(row => <View key={row.icon} style={styles.paymentMetadata}><UiIcon name={row.icon} color={colors.textSecondary} size={18} /><UiText type="metadata" color="textSecondary" style={styles.noteText}>{row.text}</UiText></View>)}
      </View>
    </GroupSurface>
    <View testID="commitment-payment-fields" style={[styles.paymentFields, { borderTopColor: colors.border }]}>
      <UiText type="editorSection" accessibilityRole="header">Payment</UiText>
      <FormField appearance="v2" label="Actual amount paid *" value={amount} autoFocus editable={!submitting} error={errorField === 'amount' ? error : null}
        keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad'} onChangeText={(value) => { setAmount(value); setError(null); }} />
      {!!amount && (fontScale >= 1.5 || amount.length > 14) && <UiText testID="commitment-payment-full-amount" type="numeric" selectable style={styles.fullAmount} accessibilityLabel={`Actual amount entered in reais: ${amount}`}>{amount}</UiText>}
      <View style={styles.editorNote}><UiIcon name="info" color={colors.textSecondary} /><UiText type="metadata" color="textSecondary" style={styles.noteText}>This payment resolves the whole occurrence, even if the amount differs from expected.</UiText></View>
      <CommitmentDate appearance="v2" label="Payment date *" value={date} maximumDate={new Date()} error={errorField === 'date' ? error : null} disabled={submitting} onChange={(value) => { setDate(value); setError(null); }} />
    </View>
  </CommitmentSheet></DesignProvider>;
}

export function CommitmentResume({ item, categoryName, proposedDate, onResume, onDismiss }: {
  item: CommitmentItem; categoryName?: string | null; proposedDate: string; onResume: (date: string) => unknown; onDismiss: () => void;
}) {
  const colors = useDesignColors();
  const { width, fontScale } = useWindowDimensions();
  const stackedHeader = width < 390 || fontScale >= 1.5;
  const { commitment } = item;
  const identity = `${commitmentKindLabels[commitment.kind]} · ${commitmentStatusLabel(item)}`;
  const [date, setDate] = useState(proposedDate);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const saving = useRef(false);
  const dateError = error?.includes('date') ? error : null;
  async function save() {
    if (saving.current) return;
    saving.current = true;
    try {
      setSubmitting(true);
      const result = onResume(date);
      if (result instanceof Promise) await result;
      onDismiss();
    }
    catch (cause) { saving.current = false; setSubmitting(false); setError(financeError(cause, 'Unable to resume this commitment.')); }
  }
  return <DesignProvider><CommitmentSheet appearance="v2" contentContainerStyle={styles.editorContent} header={<View style={styles.editorHeader}>
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
    <View style={[styles.headerRow, stackedHeader && styles.headerStack]}>
      {stackedHeader && <UiText type="editorTitle" accessibilityRole="header" style={styles.editorTitle}>Resume commitment</UiText>}
      <View style={[styles.headerRow, stackedHeader && styles.headerActions]}>
        <FormButton appearance="v2" compact variant="quiet" label="Cancel" onPress={onDismiss} />
        {!stackedHeader && <UiText type="editorTitle" accessibilityRole="header" style={[styles.editorTitle, styles.heading]}>Resume commitment</UiText>}
        <FormButton appearance="v2" variant="primary" label="Resume" busy={submitting} disabled={submitting} accessibilityHint={submitting ? 'Resuming commitment. Please wait.' : 'Resume future scheduling from the selected next due date.'} onPress={save} />
      </View>
    </View>
  </View>}>
    <FormError appearance="v2" message={dateError ? null : error} />
    <GroupSurface testID="commitment-resume-summary" accessible
      accessibilityLabel={`${commitment.title}. ${identity}. Expected amount ${formatBrlAmount(commitment.expectedAmountMinor)}. Category ${categoryName || 'No category'}.`}
      style={[styles.resumeSummary, { borderColor: colors.border }]}>
      <View style={[styles.resumeIdentity, fontScale >= 1.5 && styles.summaryStack]}>
        <View style={[styles.paymentTile, { backgroundColor: colors.brandSoft }]}><UiIcon name={commitmentTypeIcon(commitment.kind)} color={colors.brand} size={24} /></View>
        <View style={[styles.paymentIdentity, fontScale >= 1.5 && styles.summaryFull]}>
          <UiText type="cardTitle">{commitment.title}</UiText>
          <UiText type="metadata" color="textSecondary">{identity}</UiText>
        </View>
      </View>
      {[
        { icon: 'creditCard' as const, text: `Expected amount · ${formatBrlAmount(commitment.expectedAmountMinor)}` },
        { icon: 'tag' as const, text: `Category · ${categoryName || 'No category'}` },
      ].map(row => <View key={row.icon} style={styles.paymentMetadata}><UiIcon name={row.icon} color={colors.textSecondary} size={18} /><UiText type="metadata" color="textSecondary" style={styles.noteText}>{row.text}</UiText></View>)}
    </GroupSurface>
    <View testID="commitment-resume-schedule" style={styles.resumeSchedule}>
      <View style={styles.resumeScheduleHeading}>
        <UiText type="editorSection" accessibilityRole="header">Schedule</UiText>
        <UiText type="metadata" color="textSecondary">Choose when the next occurrence should be due.</UiText>
      </View>
      <CommitmentDate appearance="v2" label="Next due date *" value={date} minimumDate={pickerValue(localDateString(new Date()), '00:00')} error={dateError} disabled={submitting} onChange={(value) => { setDate(value); setError(null); }} />
    </View>
    <GroupSurface testID="commitment-resume-explanation" style={[styles.resumeExplanation, { borderColor: colors.border }]}>
      <UiIcon name="info" color={colors.textSecondary} size={20} />
      <UiText type="metadata" color="textSecondary" style={styles.noteText}>Resuming starts the schedule again from the new due date. Keep the suggested date to preserve the billing day, or choose another date to change it. Existing unpaid occurrences still need payment. Paused months stay empty.</UiText>
    </GroupSurface>
  </CommitmentSheet></DesignProvider>;
}

const styles = StyleSheet.create({
  resumeSummary: { padding: Space.md, gap: Space.md, borderWidth: 1 }, resumeIdentity: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.md },
  resumeSchedule: { paddingTop: Space.md, gap: Space.lg }, resumeScheduleHeading: { gap: Space.xs },
  resumeExplanation: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm, padding: Space.md, borderWidth: 1 },
  paymentSummary: { flexDirection: 'row', alignItems: 'flex-start', padding: Space.md, gap: Space.md, borderWidth: 1 },
  paymentTile: { width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  paymentIdentity: { flex: 1, minWidth: 0, gap: Space.sm }, paymentMetadata: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm },
  summaryStack: { flexDirection: 'column', alignItems: 'stretch' }, summaryFull: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', width: '100%' },
  paymentFields: { paddingTop: Space.lg, borderTopWidth: 1, gap: Space.lg },
  editorHeader: { padding: Space.md, gap: Space.md }, handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, width: '100%' },
  headerStack: { flexDirection: 'column', alignItems: 'stretch' }, headerActions: { justifyContent: 'space-between', flexWrap: 'wrap' },
  editorTitle: { textAlign: 'center', maxWidth: '100%', fontSize: 22, lineHeight: 30 }, heading: { flex: 1, minWidth: 0 },
  editorContent: { padding: Space.md, gap: Space.md }, fullAmount: { minWidth: 0, maxWidth: '100%' },
  editorNote: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm }, noteText: { flex: 1, minWidth: 0 },
});

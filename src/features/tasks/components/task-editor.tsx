import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useRef, useState, type ReactNode } from 'react';
import { Alert, Keyboard, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AdaptiveModal, AdaptiveSheet } from '@/components/adaptive-sheet';
import { BackButton, PickerBackHeader } from '@/components/back-button';
import { Space, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { InlineNameForm, SelectField } from '@/components/form-controls';
import { DesignProvider, UiText } from '@/components/design-system';
import { EditorSection } from '@/components/editor-section';
import type { UiIconName } from '@/components/ui-icon';
import { DesignSpace, DesignTypography, TouchTarget } from '@/constants/design-system-v2';

import { dateLabel, localDateString, localTimeString, pickerValue, taskDraft, userError, validateTaskDraft } from '../form';
import { weekdayIndex } from '../calendar';
import { frequencyLabels, monthNames, recurrenceError, recurrencePatternSummary, recurrenceStopped, weekdays } from '../recurrence';
import { createTaskCategorySelection, taskCategoryOptions, taskPriorityOptions } from '../form-options';
import { type RecurrenceDraft, type RecurrenceFrequency, type Task, type TaskCategory, type TaskDraft, type TaskRecurrence } from '../types';
import { TaskButton, TaskError, TaskField, TaskSelect, TaskWeekday } from './controls';

const repeatOptions = [{ value: 'none' as const, label: 'Does not repeat' },
  ...(Object.keys(frequencyLabels) as RecurrenceFrequency[]).map((value) => ({ value, label: frequencyLabels[value] }))];
const monthOptions = monthNames.map((label, index) => ({ value: index + 1, label }));

type Props = {
  appearance?: 'v2';
  task: Task | null;
  recurrence: TaskRecurrence | null;
  categories: TaskCategory[];
  onSave: (draft: TaskDraft) => void;
  onCreateCategory: (name: string) => TaskCategory;
  onDismiss: () => void;
};

function MainSection({ v2, title, description, icon, children }: {
  v2: boolean; title: string; description: string; icon: UiIconName; children: ReactNode;
}) {
  return v2 ? <EditorSection {...{ title, description, icon }}>{children}</EditorSection>
    : <View style={styles.section}><ThemedText type="cardTitle" accessibilityRole="header">{title}</ThemedText>{children}</View>;
}

function NewTaskHeader({ onCancel, onSave, title: heading = 'New task' }: { onCancel: () => void; onSave: () => void; title?: string }) {
  const { width, fontScale } = useWindowDimensions();
  const large = fontScale >= 1.5;
  const title = <UiText type="editorTitle" accessibilityRole="header" style={[styles.headingText, !large && styles.heading, width < 360 && { fontSize: 22, lineHeight: 30 }]}>{heading}</UiText>;
  const cancel = <TaskButton appearance="v2" tone="brand" variant="quiet" leadingIcon="back" label="Cancel" onPress={onCancel} />;
  const save = <TaskButton appearance="v2" variant="primary" label="Save" onPress={onSave} />;
  return <View style={styles.editorHeader}>{large ? <>{title}<View style={styles.largeHeaderActions}>{cancel}{save}</View></>
    : <View style={styles.editorHeaderRow}>{cancel}{title}{save}</View>}</View>;
}

function RecurrenceHeader({ onBack }: { onBack: () => void }) {
  const { width, fontScale } = useWindowDimensions();
  return <View style={[styles.editorHeader, fontScale < 1.5 && styles.editorHeaderRow]}>
    <BackButton appearance="v2" accessibilityLabel="Back to task editor" onPress={onBack} />
    <UiText type="editorTitle" accessibilityRole="header" style={[styles.headingText, fontScale < 1.5 && styles.heading,
      width < 360 && { fontSize: 22, lineHeight: 30 }]}>Recurrence</UiText>
  </View>;
}

export function TaskEditor({ task, recurrence, categories, onSave, onCreateCategory, onDismiss, appearance: visual }: Props) {
  const v2 = task === null || visual === 'v2';
  const scheme = useColorScheme();
  const { fontScale } = useWindowDimensions();
  const [dateTimeWidth, setDateTimeWidth] = useState(0);
  const [draft, setDraft] = useState(() => {
    const initial = taskDraft(task, recurrence);
    if (!categories.some((category) => category.id === initial.categoryId)) initial.categoryId = null;
    return initial;
  });
  const [picker, setPicker] = useState<'date' | 'time' | 'end' | null>(null);
  const [editingRecurrence, setEditingRecurrence] = useState(false);
  const [recurrenceVisited, setRecurrenceVisited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appearance = v2 ? 'v2' as const : undefined;
  const saving = useRef(false);
  // Measure the actual sheet content, which may be narrower than the device window.
  const dateTimeInRow = dateTimeWidth >= 2 * 160 * Math.max(1, fontScale) + Spacing.three;
  const categoryLabel = categories.find((category) => category.id === draft.categoryId)?.name ?? 'No category';

  function change<K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function changeRecurrence<K extends keyof RecurrenceDraft>(key: K, value: RecurrenceDraft[K]) {
    if (draft.recurrence) change('recurrence', { ...draft.recurrence, [key]: value });
  }

  function chooseFrequency(frequency: RecurrenceFrequency | null) {
    if (!frequency) change('recurrence', null);
    else {
      const date = draft.date || localDateString(new Date());
      const [, month, day] = date.split('-').map(Number);
      change('date', date);
      change('recurrence', { frequency, interval: frequency === 'yearly' ? 1 : draft.recurrence?.interval ?? 1,
        weekdayMask: draft.recurrence?.weekdayMask ?? 1 << weekdayIndex(date),
        monthDay: draft.recurrence?.monthDay ?? day, month: draft.recurrence?.month ?? month,
        endDate: draft.recurrence?.endDate ?? '' });
    }
  }

  function pickerChange(mode: 'date' | 'time' | 'end', selected: Date) {
    if (mode === 'end') changeRecurrence('endDate', localDateString(selected));
    else change(mode, mode === 'date' ? localDateString(selected) : localTimeString(selected));
  }

  function openPicker(mode: 'date' | 'time' | 'end') {
    if (mode === 'time' && !draft.date) return;
    Keyboard.dismiss();
    const value = mode === 'end' ? pickerValue(draft.recurrence?.endDate || draft.date) : pickerValue(draft.date, draft.time);
    if (Platform.OS === 'android') {
      setPicker(mode);
      DateTimePickerAndroid.open({
        value,
        mode: mode === 'end' ? 'date' : mode,
        is24Hour: true,
        onValueChange: (_event, selected) => {
          pickerChange(mode, selected);
          setPicker(null);
        },
        onDismiss: () => setPicker(null),
      });
    } else {
      if (mode === 'date' && !draft.date) change('date', localDateString(value));
      if (mode === 'time' && !draft.time) change('time', localTimeString(value));
      setPicker(mode);
    }
  }

  function save() {
    saveDraft(draft);
  }

  function saveDraft(values: TaskDraft) {
    if (saving.current) return;
    saving.current = true;
    try {
      validateTaskDraft(values);
      onSave(values);
      onDismiss();
    } catch (cause) {
      saving.current = false;
      setError(userError(cause, 'Unable to save this task. Please try again.'));
    }
  }

  function stopRepeating() {
    Alert.alert('Stop repeating?', "Repeating stops tomorrow. Today's occurrences and past history will stay.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Stop repeating', onPress: () => saveDraft({ ...draft, recurrence: null }) },
    ]);
  }

  function recurrenceDone() { Keyboard.dismiss(); setPicker(null); setEditingRecurrence(false); }
  const scheduleFields = <View
    onLayout={({ nativeEvent }) => setDateTimeWidth(nativeEvent.layout.width)}
    style={[styles.dateTime, dateTimeInRow && styles.dateTimeRow]}>
    <View style={[styles.dateTimeField, dateTimeInRow && styles.dateTimeColumn]}>
      {Platform.OS === 'web' ? (
        <TaskField appearance={appearance} label={draft.recurrence ? 'Start date *' : 'Date'} placeholder="YYYY-MM-DD" value={draft.date} onChangeText={(value) => { change('date', value); if (!value) change('time', ''); }} />
      ) : (
        <TaskSelect appearance={appearance} icon={v2 ? 'calendar' : undefined} label={draft.recurrence ? 'Start date *' : 'Date'} value={draft.date ? dateLabel(draft.date) : 'Add date'} expanded={picker === 'date'} onPress={() => openPicker('date')} />
      )}
      {!!draft.date && !draft.recurrence && Platform.OS !== 'web' && <TaskButton appearance={appearance} label="Clear date" accessibilityLabel="Clear date and time" onPress={() => { change('date', ''); change('time', ''); setPicker(null); }} />}
    </View>
    <View style={[styles.dateTimeField, dateTimeInRow && styles.dateTimeColumn]}>
      {Platform.OS === 'web' ? (
        <TaskField appearance={appearance} label="Time" placeholder="HH:MM" value={draft.time} editable={!!draft.date} accessibilityHint={!draft.date ? 'Add a date before setting a time' : undefined} onChangeText={(value) => change('time', value)} />
      ) : (
        <TaskSelect appearance={appearance} icon={v2 ? 'clock' : undefined} label="Time" value={draft.time || 'Add time'} disabled={!draft.date} expanded={picker === 'time'} accessibilityHint={!draft.date ? 'Add a date before setting a time' : undefined} onPress={() => openPicker('time')} />
      )}
      {!!draft.time && Platform.OS !== 'web' && <TaskButton appearance={appearance} label="Clear time" onPress={() => { change('time', ''); setPicker(null); }} />}
    </View>
  </View>;
  const pickerControls = picker && Platform.OS === 'ios' ? <>
    <PickerBackHeader appearance={editingRecurrence ? appearance : undefined} title={picker === 'end' ? 'End date' : picker === 'date' ? 'Date' : 'Time'} onBack={() => setPicker(null)} />
    <DateTimePicker value={picker === 'end' ? pickerValue(draft.recurrence?.endDate || draft.date) : pickerValue(draft.date, draft.time)}
      mode={picker === 'end' ? 'date' : picker} display="spinner" themeVariant={scheme === 'dark' ? 'dark' : 'light'}
      onValueChange={(_event, selected) => pickerChange(picker, selected)} />
  </> : null;
  const intervalUnit = draft.recurrence?.frequency === 'daily' ? 'days' : draft.recurrence?.frequency === 'weekly' ? 'weeks' : 'months';
  const recurrenceMessage = draft.recurrence ? recurrenceError(draft.recurrence, draft.date) : null;
  const summary = draft.recurrence ? recurrenceMessage ? 'Review recurrence settings' : recurrencePatternSummary(draft.recurrence) : null;
  const intervalFields = draft.recurrence && draft.recurrence.frequency !== 'yearly' && <View style={[styles.interval, v2 && { alignItems: 'flex-end' }]}>
    <View style={[styles.intervalCount, { flexBasis: 120 * Math.max(1, fontScale) }]}><TaskField appearance={appearance} label="Every" accessibilityLabel={`Repeat interval in ${intervalUnit}`} keyboardType="number-pad" value={Number.isNaN(draft.recurrence.interval) ? '' : String(draft.recurrence.interval)} onChangeText={(value) => changeRecurrence('interval', value ? Number(value) : NaN)} /></View>
    {v2 ? <UiText type="body" style={{ paddingBottom: Math.max(0, (TouchTarget - DesignTypography.body.lineHeight * fontScale) / 2) }}>{intervalUnit}</UiText> : <ThemedText type="body">{intervalUnit}</ThemedText>}
  </View>;
  const patternFields = draft.recurrence && <>
    {draft.recurrence.frequency === 'weekly' && <>
      {v2 ? <UiText type="fieldLabel">On these days</UiText> : <ThemedText type="secondary" themeColor="textSecondary">On these days</ThemedText>}
      <View style={styles.weekdays}>
        {weekdays.map((day, index) => <TaskWeekday appearance={appearance} key={day} label={day} checked={!!(draft.recurrence!.weekdayMask & (1 << index))} onPress={() => changeRecurrence('weekdayMask', draft.recurrence!.weekdayMask ^ (1 << index))} />)}
      </View>
    </>}
    {draft.recurrence.frequency === 'yearly' && <SelectField appearance={appearance} icon={v2 ? 'calendar' : undefined} label="Month" value={draft.recurrence.month} options={monthOptions}
      onOpen={() => setPicker(null)} onChange={(value) => changeRecurrence('month', value)} />}
    {['monthly', 'yearly'].includes(draft.recurrence.frequency) && <>
      <TaskField appearance={appearance} label="Day" accessibilityLabel="Day of month" keyboardType="number-pad" value={Number.isNaN(draft.recurrence.monthDay) ? '' : String(draft.recurrence.monthDay)} onChangeText={(value) => changeRecurrence('monthDay', value ? Number(value) : NaN)} />
      {v2 ? <UiText type="metadata" color="textSecondary">Shorter months use their last valid day.</UiText>
        : <ThemedText type="metadata" themeColor="textSecondary">Shorter months use their last valid day.</ThemedText>}
    </>}
  </>;

  const editor = <AdaptiveModal onDismiss={editingRecurrence ? recurrenceDone : onDismiss}>
    {editingRecurrence ? <AdaptiveSheet key="recurrence" appearance={appearance} contentContainerStyle={v2 ? styles.editorForm : styles.form} header={v2 ? <RecurrenceHeader onBack={recurrenceDone} /> : <View style={styles.header}>
      <BackButton accessibilityLabel="Back to task editor" onPress={recurrenceDone} />
      <ThemedText type="sheetTitle" accessibilityRole="header" style={styles.heading}>Recurrence</ThemedText>
    </View>}>
      <TaskError appearance={appearance} message={error} />
      <MainSection v2={v2} title={v2 ? 'Pattern' : 'Frequency'} icon="repeat" description="Choose how often this task repeats.">
        <SelectField appearance={appearance} icon={v2 ? 'repeat' : undefined} label="Repeats" value={draft.recurrence?.frequency ?? 'none'} options={repeatOptions}
          displayValue={draft.recurrence ? frequencyLabels[draft.recurrence.frequency] : recurrence ? 'Stopped' : 'Does not repeat'}
          onOpen={() => setPicker(null)} onChange={(value) => chooseFrequency(value === 'none' ? null : value)} />
      </MainSection>
      {draft.recurrence && <>
        {v2 ? <>
          {draft.recurrence.frequency !== 'yearly' && <EditorSection title="Repeat" icon="repeat" description="Set the interval between repeats.">{intervalFields}</EditorSection>}
          <EditorSection title="Schedule" icon="calendar" description="Set when this task repeats.">
            {patternFields}{scheduleFields}{picker !== 'end' && pickerControls}
          </EditorSection>
        </> : <>
          <View style={styles.section}><ThemedText type="cardTitle" accessibilityRole="header">Pattern</ThemedText>{intervalFields}{patternFields}</View>
          <View style={styles.section}><ThemedText type="cardTitle" accessibilityRole="header">Start</ThemedText>{scheduleFields}{picker !== 'end' && pickerControls}</View>
        </>}
        <MainSection v2={v2} title={v2 ? 'Ends' : 'End'} icon="calendar" description="Choose an optional last date.">
          <SelectField appearance={appearance} icon={v2 ? 'calendar' : undefined} label="Ends" value={draft.recurrence.endDate ? 'date' : 'never'} options={[{ value: 'never', label: 'Never' }, { value: 'date', label: 'On date' }]}
            onOpen={() => setPicker(null)} onChange={(value) => changeRecurrence('endDate', value === 'never' ? '' : draft.recurrence?.endDate || draft.date || localDateString(new Date()))} />
          {!!draft.recurrence.endDate && (Platform.OS === 'web'
            ? <TaskField appearance={appearance} label="End date" placeholder="YYYY-MM-DD" value={draft.recurrence.endDate} onChangeText={(value) => changeRecurrence('endDate', value)} />
            : <TaskSelect appearance={appearance} icon={v2 ? 'calendar' : undefined} label="End date" value={dateLabel(draft.recurrence.endDate)} expanded={picker === 'end'} onPress={() => openPicker('end')} />)}
          {picker === 'end' && pickerControls}
        </MainSection>
      </>}
      {v2 && <EditorSection title="Summary" icon="list" description="Review your repeating schedule.">
        <UiText type="body">{summary ?? 'Does not repeat'}</UiText>
        {!recurrenceMessage && !!draft.recurrence?.endDate && <UiText type="secondary" color="textSecondary">Ends {dateLabel(draft.recurrence.endDate)}</UiText>}
        <TaskError appearance={appearance} message={recurrenceMessage} />
      </EditorSection>}
      {recurrence && (v2 ? <UiText type="metadata" color="textSecondary">{"Schedule changes apply tomorrow. Today's occurrences and history stay."}</UiText> : <ThemedText type="metadata" themeColor="textSecondary">{"Schedule changes apply tomorrow. Today's occurrences and history stay."}</ThemedText>)}
    </AdaptiveSheet> : <AdaptiveSheet key="task" appearance={appearance} contentContainerStyle={v2 ? styles.editorForm : styles.form} header={v2 ? <NewTaskHeader title={task ? 'Edit task' : 'New task'} onCancel={onDismiss} onSave={save} /> : <View style={styles.header}>
      <TaskButton variant="quiet" label="Cancel" onPress={onDismiss} />
      <ThemedText type="sheetTitle" accessibilityRole="header" style={[styles.heading, styles.headingText]}>{task ? 'Edit task' : 'New task'}</ThemedText>
      <TaskButton variant="primary" label="Save" onPress={save} />
    </View>}>
      <TaskError appearance={appearance} message={error} />
      <MainSection v2={v2} title="Task" icon="document" description="Add the details for your task.">
        <TaskField appearance={appearance} placeholder={v2 ? 'Title' : undefined} label="Title *" accessibilityLabel="Title, required" value={draft.title} onChangeText={(value) => change('title', value)} autoFocus={!recurrenceVisited} returnKeyType="done" />
        <TaskField appearance={appearance} placeholder={v2 ? 'Description' : undefined} label="Description" value={draft.description} onChangeText={(value) => change('description', value)} multiline textAlignVertical="top" style={styles.description} />
      </MainSection>
      {(!recurrence || draft.recurrence) && <MainSection v2={v2} title="Schedule" icon="calendar" description="Set when this task should happen.">
        {scheduleFields}{pickerControls}
      </MainSection>}
      <MainSection v2={v2} title="Organization" icon="tag" description="Keep your tasks organized.">
        <SelectField appearance={appearance} icon={v2 ? 'flag' : undefined} label="Priority" value={draft.priority} options={taskPriorityOptions} onOpen={() => setPicker(null)} onChange={(value) => change('priority', value)} />
        <SelectField appearance={appearance} icon={v2 ? 'folder' : undefined} label="Category" value={draft.categoryId} displayValue={categoryLabel} options={taskCategoryOptions(categories)}
          onOpen={() => setPicker(null)} onChange={(value) => change('categoryId', value)}
          action={{ label: '+ New category', title: 'New task category', accessibilityLabel: 'Create new task category',
            render: (controls) => <InlineNameForm {...controls} appearance={appearance}
              onSubmit={(name, complete) => createTaskCategorySelection(name, onCreateCategory, (id) => change('categoryId', id), complete)}
              formatError={(cause) => userError(cause, 'Unable to create this category. Please try again.')} /> }} />
      </MainSection>
      <MainSection v2={v2} title="Recurrence" icon="repeat" description="Set a repeating schedule (optional).">
        {!v2 && !!summary && <ThemedText type="secondary" themeColor="textSecondary">{summary}{!recurrenceMessage && draft.recurrence?.endDate ? ` · Ends ${dateLabel(draft.recurrence.endDate)}` : ''}</ThemedText>}
        {!summary && recurrence && (v2 ? <UiText type="metadata" color="textSecondary">Repeating stopped</UiText> : <ThemedText type="metadata" themeColor="textSecondary">Repeating stopped</ThemedText>)}
        <TaskButton appearance={appearance} tone={v2 ? 'brand' : undefined} variant={v2 ? 'secondary' : 'quiet'} align={v2 ? 'start' : undefined} leadingIcon={v2 ? draft.recurrence ? 'repeat' : 'plus' : undefined} trailingIcon={v2 ? 'forward' : undefined} accessibilityLabel={draft.recurrence ? 'Edit recurrence' : 'Add recurrence'} accessibilityHint={summary ?? undefined} label={v2 && summary ? `${summary}${!recurrenceMessage && draft.recurrence?.endDate ? ` \u00b7 Ends ${dateLabel(draft.recurrence.endDate)}` : ''}` : draft.recurrence ? 'Edit recurrence' : 'Add recurrence'} onPress={() => { Keyboard.dismiss(); setPicker(null); setRecurrenceVisited(true); setEditingRecurrence(true); }} />
        {recurrence && (v2 ? <UiText type="metadata" color="textSecondary">{"Schedule changes apply tomorrow. Today's occurrences and history stay."}</UiText> : <ThemedText type="metadata" themeColor="textSecondary">{"Schedule changes apply tomorrow. Today's occurrences and history stay."}</ThemedText>)}
        {recurrence && !recurrenceStopped(recurrence) && <TaskButton appearance={appearance} variant="quiet" label="Stop repeating" onPress={stopRepeating} />}
      </MainSection>
    </AdaptiveSheet>}
  </AdaptiveModal>;
  return v2 ? <DesignProvider>{editor}</DesignProvider> : editor;
}

const styles = StyleSheet.create({
  editorForm: { padding: DesignSpace.md, gap: DesignSpace.md },
  editorHeader: { padding: DesignSpace.md, gap: DesignSpace.sm },
  editorHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: DesignSpace.sm },
  largeHeaderActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: DesignSpace.sm },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.three, gap: Spacing.two },
  heading: { flex: 1, minWidth: 80 },
  headingText: { textAlign: 'center' },
  form: { padding: Space.lg, gap: Space.xl }, section: { gap: Space.sm },
  description: { minHeight: 80 },
  dateTime: { gap: Spacing.three },
  dateTimeRow: { flexDirection: 'row' },
  dateTimeField: { gap: Spacing.two, minWidth: 0 },
  dateTimeColumn: { flex: 1 },
  interval: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.sm },
  intervalCount: { flexShrink: 1, maxWidth: '100%' },
  weekdays: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});

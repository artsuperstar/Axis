import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useRef, useState } from 'react';
import { Alert, Keyboard, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AdaptiveModal, AdaptiveSheet } from '@/components/adaptive-sheet';
import { BackButton, PickerBackHeader } from '@/components/back-button';
import { Space, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { InlineNameForm, SelectField } from '@/components/form-controls';

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
  task: Task | null;
  recurrence: TaskRecurrence | null;
  categories: TaskCategory[];
  onSave: (draft: TaskDraft) => void;
  onCreateCategory: (name: string) => TaskCategory;
  onDismiss: () => void;
};

export function TaskEditor({ task, recurrence, categories, onSave, onCreateCategory, onDismiss }: Props) {
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
        <TaskField label={draft.recurrence ? 'Start date *' : 'Date'} placeholder="YYYY-MM-DD" value={draft.date} onChangeText={(value) => { change('date', value); if (!value) change('time', ''); }} />
      ) : (
        <TaskSelect label={draft.recurrence ? 'Start date *' : 'Date'} value={draft.date ? dateLabel(draft.date) : 'Add date'} expanded={picker === 'date'} onPress={() => openPicker('date')} />
      )}
      {!!draft.date && !draft.recurrence && Platform.OS !== 'web' && <TaskButton label="Clear date" accessibilityLabel="Clear date and time" onPress={() => { change('date', ''); change('time', ''); setPicker(null); }} />}
    </View>
    <View style={[styles.dateTimeField, dateTimeInRow && styles.dateTimeColumn]}>
      {Platform.OS === 'web' ? (
        <TaskField label="Time" placeholder="HH:MM" value={draft.time} editable={!!draft.date} accessibilityHint={!draft.date ? 'Add a date before setting a time' : undefined} onChangeText={(value) => change('time', value)} />
      ) : (
        <TaskSelect label="Time" value={draft.time || 'Add time'} disabled={!draft.date} expanded={picker === 'time'} accessibilityHint={!draft.date ? 'Add a date before setting a time' : undefined} onPress={() => openPicker('time')} />
      )}
      {!!draft.time && Platform.OS !== 'web' && <TaskButton label="Clear time" onPress={() => { change('time', ''); setPicker(null); }} />}
    </View>
  </View>;
  const pickerControls = picker && Platform.OS === 'ios' ? <>
    <PickerBackHeader title={picker === 'end' ? 'End date' : picker === 'date' ? 'Date' : 'Time'} onBack={() => setPicker(null)} />
    <DateTimePicker value={picker === 'end' ? pickerValue(draft.recurrence?.endDate || draft.date) : pickerValue(draft.date, draft.time)}
      mode={picker === 'end' ? 'date' : picker} display="spinner" themeVariant={scheme === 'dark' ? 'dark' : 'light'}
      onValueChange={(_event, selected) => pickerChange(picker, selected)} />
  </> : null;
  const intervalUnit = draft.recurrence?.frequency === 'daily' ? 'days' : draft.recurrence?.frequency === 'weekly' ? 'weeks' : 'months';
  const recurrenceMessage = draft.recurrence ? recurrenceError(draft.recurrence, draft.date) : null;
  const summary = draft.recurrence ? recurrenceMessage ? 'Review recurrence settings' : recurrencePatternSummary(draft.recurrence) : null;

  return <AdaptiveModal onDismiss={editingRecurrence ? recurrenceDone : onDismiss}>
    {editingRecurrence ? <AdaptiveSheet key="recurrence" contentContainerStyle={styles.form} header={<View style={styles.header}>
      <BackButton accessibilityLabel="Back to task editor" onPress={recurrenceDone} />
      <ThemedText type="sheetTitle" accessibilityRole="header" style={styles.heading}>Recurrence</ThemedText>
    </View>}>
      <TaskError message={error} />
      <View style={styles.section}>
        <ThemedText type="cardTitle" accessibilityRole="header">Frequency</ThemedText>
        <SelectField label="Repeats" value={draft.recurrence?.frequency ?? 'none'} options={repeatOptions}
          displayValue={draft.recurrence ? frequencyLabels[draft.recurrence.frequency] : recurrence ? 'Stopped' : 'Does not repeat'}
          onOpen={() => setPicker(null)} onChange={(value) => chooseFrequency(value === 'none' ? null : value)} />
      </View>
      {draft.recurrence && <>
        <View style={styles.section}>
          <ThemedText type="cardTitle" accessibilityRole="header">Pattern</ThemedText>
          {draft.recurrence.frequency !== 'yearly' && <View style={styles.interval}>
            <View style={[styles.intervalCount, { flexBasis: 120 * Math.max(1, fontScale) }]}><TaskField label="Every" accessibilityLabel={`Repeat interval in ${intervalUnit}`} keyboardType="number-pad" value={Number.isNaN(draft.recurrence.interval) ? '' : String(draft.recurrence.interval)} onChangeText={(value) => changeRecurrence('interval', value ? Number(value) : NaN)} /></View>
            <ThemedText type="body">{intervalUnit}</ThemedText>
          </View>}
          {draft.recurrence.frequency === 'weekly' && (
            <>
              <ThemedText type="secondary" themeColor="textSecondary">On these days</ThemedText>
              <View style={styles.weekdays}>
                {weekdays.map((day, index) => <TaskWeekday key={day} label={day} checked={!!(draft.recurrence!.weekdayMask & (1 << index))} onPress={() => changeRecurrence('weekdayMask', draft.recurrence!.weekdayMask ^ (1 << index))} />)}
              </View>
            </>
          )}
          {draft.recurrence.frequency === 'yearly' && <SelectField label="Month" value={draft.recurrence.month} options={monthOptions}
            onOpen={() => setPicker(null)} onChange={(value) => changeRecurrence('month', value)} />}
          {['monthly', 'yearly'].includes(draft.recurrence.frequency) && <TaskField label="Day" accessibilityLabel="Day of month" keyboardType="number-pad" value={Number.isNaN(draft.recurrence.monthDay) ? '' : String(draft.recurrence.monthDay)} onChangeText={(value) => changeRecurrence('monthDay', value ? Number(value) : NaN)} />}
          {['monthly', 'yearly'].includes(draft.recurrence.frequency) && <ThemedText type="metadata" themeColor="textSecondary">Shorter months use their last valid day.</ThemedText>}
        </View>
        <View style={styles.section}>
          <ThemedText type="cardTitle" accessibilityRole="header">Start</ThemedText>
          {scheduleFields}{picker !== 'end' && pickerControls}
        </View>
        <View style={styles.section}>
          <ThemedText type="cardTitle" accessibilityRole="header">End</ThemedText>
          <SelectField label="Ends" value={draft.recurrence.endDate ? 'date' : 'never'} options={[{ value: 'never', label: 'Never' }, { value: 'date', label: 'On date' }]}
            onOpen={() => setPicker(null)} onChange={(value) => changeRecurrence('endDate', value === 'never' ? '' : draft.recurrence?.endDate || draft.date || localDateString(new Date()))} />
          {!!draft.recurrence.endDate && (Platform.OS === 'web'
            ? <TaskField label="End date" placeholder="YYYY-MM-DD" value={draft.recurrence.endDate} onChangeText={(value) => changeRecurrence('endDate', value)} />
            : <TaskSelect label="End date" value={dateLabel(draft.recurrence.endDate)} expanded={picker === 'end'} onPress={() => openPicker('end')} />)}
          {picker === 'end' && pickerControls}
        </View>
      </>}
      {recurrence && <ThemedText type="metadata" themeColor="textSecondary">{"Schedule changes apply tomorrow. Today's occurrences and history stay."}</ThemedText>}
    </AdaptiveSheet> : <AdaptiveSheet key="task" contentContainerStyle={styles.form} header={<View style={styles.header}>
      <TaskButton variant="quiet" label="Cancel" onPress={onDismiss} />
      <ThemedText type="sheetTitle" accessibilityRole="header" style={[styles.heading, styles.headingText]}>{task ? 'Edit task' : 'New task'}</ThemedText>
      <TaskButton variant="primary" label="Save" onPress={save} />
    </View>}>
      <TaskError message={error} />
      <View style={styles.section}>
        <ThemedText type="cardTitle" accessibilityRole="header">Task</ThemedText>
        <TaskField label="Title *" accessibilityLabel="Title, required" value={draft.title} onChangeText={(value) => change('title', value)} autoFocus={!recurrenceVisited} returnKeyType="done" />
        <TaskField label="Description" value={draft.description} onChangeText={(value) => change('description', value)} multiline textAlignVertical="top" style={styles.description} />
      </View>
      {(!recurrence || draft.recurrence) && <View style={styles.section}>
        <ThemedText type="cardTitle" accessibilityRole="header">Schedule</ThemedText>
        {scheduleFields}{pickerControls}
      </View>}
      <View style={styles.section}>
        <ThemedText type="cardTitle" accessibilityRole="header">Organization</ThemedText>
        <SelectField label="Priority" value={draft.priority} options={taskPriorityOptions} onOpen={() => setPicker(null)} onChange={(value) => change('priority', value)} />
        <SelectField label="Category" value={draft.categoryId} displayValue={categoryLabel} options={taskCategoryOptions(categories)}
          onOpen={() => setPicker(null)} onChange={(value) => change('categoryId', value)}
          action={{ label: '+ New category', title: 'New task category', accessibilityLabel: 'Create new task category',
            render: (controls) => <InlineNameForm {...controls}
              onSubmit={(name, complete) => createTaskCategorySelection(name, onCreateCategory, (id) => change('categoryId', id), complete)}
              formatError={(cause) => userError(cause, 'Unable to create this category. Please try again.')} /> }} />
      </View>
      <View style={styles.section}>
        <ThemedText type="cardTitle" accessibilityRole="header">Recurrence</ThemedText>
        {!!summary && <ThemedText type="secondary" themeColor="textSecondary">{summary}{!recurrenceMessage && draft.recurrence?.endDate ? ` · Ends ${dateLabel(draft.recurrence.endDate)}` : ''}</ThemedText>}
        {!summary && recurrence && <ThemedText type="metadata" themeColor="textSecondary">Repeating stopped</ThemedText>}
        <TaskButton variant="quiet" label={draft.recurrence ? 'Edit recurrence' : 'Add recurrence'} onPress={() => { Keyboard.dismiss(); setPicker(null); setRecurrenceVisited(true); setEditingRecurrence(true); }} />
        {recurrence && <ThemedText type="metadata" themeColor="textSecondary">{"Schedule changes apply tomorrow. Today's occurrences and history stay."}</ThemedText>}
        {recurrence && !recurrenceStopped(recurrence) && <TaskButton variant="quiet" label="Stop repeating" onPress={stopRepeating} />}
      </View>
    </AdaptiveSheet>}
  </AdaptiveModal>;
}

const styles = StyleSheet.create({
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

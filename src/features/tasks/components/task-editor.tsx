import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { dateLabel, localDateString, localTimeString, pickerValue, taskDraft, userError, validateTaskDraft } from '../form';
import { weekdayIndex } from '../calendar';
import { frequencyLabels, monthNames, recurrenceStopped, weekdays } from '../recurrence';
import { priorities, priorityLabels, type RecurrenceDraft, type RecurrenceFrequency, type Task, type TaskCategory, type TaskDraft, type TaskRecurrence } from '../types';
import { TaskButton, TaskChoice, TaskError, TaskField, TaskSelect, TaskWeekday } from './controls';

type EditorPanel = 'priority' | 'category' | 'new-category' | 'repeat' | 'ends' | 'month';
const panelTitles: Record<EditorPanel, string> = { priority: 'Priority', category: 'Category', 'new-category': 'New Category', repeat: 'Repeats', ends: 'Ends', month: 'Month' };

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
  const [panel, setPanel] = useState<EditorPanel | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);
  const selectorControls = useRef<Partial<Record<EditorPanel, View | null>>>({});
  const panelHeading = useRef<View>(null);
  const returnFocus = useRef<EditorPanel | null>(null);
  // Measure the actual sheet content, which may be narrower than the device window.
  const dateTimeInRow = dateTimeWidth >= 2 * 160 * Math.max(1, fontScale) + Spacing.three;
  const categoryLabel = categories.find((category) => category.id === draft.categoryId)?.name ?? 'No category';

  useEffect(() => {
    if (Platform.OS === 'web' || panel === 'new-category') return;
    const frame = requestAnimationFrame(() => {
      const target = panel ? panelHeading.current : returnFocus.current ? selectorControls.current[returnFocus.current] : null;
      if (target) AccessibilityInfo.sendAccessibilityEvent(target, 'focus');
      if (!panel) returnFocus.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [panel]);

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
    closePanel();
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

  function openPanel(next: EditorPanel) {
    Keyboard.dismiss();
    setPicker(null);
    if (next === 'new-category') {
      setCategoryName('');
      setCategoryError(null);
    }
    setPanel(next);
  }

  function closePanel() {
    Keyboard.dismiss();
    returnFocus.current = panel === 'new-category' ? 'category' : panel;
    setPanel(null);
  }

  function cancelNewCategory() {
    Keyboard.dismiss();
    setCategoryError(null);
    setPanel('category');
  }

  function requestClose() {
    if (panel === 'new-category') cancelNewCategory();
    else if (panel) closePanel();
    else onDismiss();
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

  function createCategory() {
    try {
      const category = onCreateCategory(categoryName);
      change('categoryId', category.id);
      setCategoryName('');
      setCategoryError(null);
      closePanel();
    } catch (cause) {
      setCategoryError(userError(cause, 'Unable to create this category. Please try again.'));
    }
  }

  return (
    <Modal visible presentationStyle="pageSheet" onRequestClose={requestClose}>
      <SafeAreaProvider>
        <ThemedView style={styles.container} accessibilityViewIsModal onAccessibilityEscape={requestClose}>
          <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              {/* Keep the form mounted so opening a selector preserves the draft and scroll position. */}
              <View style={[styles.container, panel && styles.hidden]} pointerEvents={panel ? 'none' : 'auto'} accessibilityElementsHidden={!!panel} importantForAccessibility={panel ? 'no-hide-descendants' : 'auto'}>
                <View style={styles.header}>
                  <TaskButton label="Cancel" onPress={onDismiss} />
                  <ThemedText type="smallBold" accessibilityRole="header" style={[styles.heading, styles.headingText]}>{task ? 'Edit task' : 'New task'}</ThemedText>
                  <TaskButton label="Save" onPress={save} />
                </View>
                <View style={styles.error}><TaskError message={error} /></View>
                <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
                  <TaskField label="Title *" accessibilityLabel="Title, required" value={draft.title} onChangeText={(value) => change('title', value)} autoFocus returnKeyType="done" />
                  <TaskField label="Description" value={draft.description} onChangeText={(value) => change('description', value)} multiline textAlignVertical="top" style={styles.description} />

                  <TaskSelect ref={(node) => { selectorControls.current.repeat = node; }} label="Repeats" value={draft.recurrence ? frequencyLabels[draft.recurrence.frequency] : recurrence ? 'Stopped' : 'Does not repeat'} expanded={panel === 'repeat'} onPress={() => openPanel('repeat')} />

                  {(!recurrence || draft.recurrence) && <View
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
                  </View>}
                  {draft.recurrence && (
                    <View style={styles.options}>
                      {draft.recurrence.frequency !== 'yearly' && <TaskField label={`Every (${draft.recurrence.frequency === 'daily' ? 'days' : draft.recurrence.frequency === 'weekly' ? 'weeks' : 'months'})`} keyboardType="number-pad" value={Number.isNaN(draft.recurrence.interval) ? '' : String(draft.recurrence.interval)} onChangeText={(value) => changeRecurrence('interval', value ? Number(value) : NaN)} />}
                      {draft.recurrence.frequency === 'weekly' && (
                        <>
                          <ThemedText type="smallBold">Weekdays</ThemedText>
                          <View style={styles.weekdays}>
                            {weekdays.map((day, index) => <TaskWeekday key={day} label={day} checked={!!(draft.recurrence!.weekdayMask & (1 << index))} onPress={() => changeRecurrence('weekdayMask', draft.recurrence!.weekdayMask ^ (1 << index))} />)}
                          </View>
                        </>
                      )}
                      {draft.recurrence.frequency === 'yearly' && <TaskSelect ref={(node) => { selectorControls.current.month = node; }} label="Month" value={monthNames[draft.recurrence.month - 1]} expanded={panel === 'month'} onPress={() => openPanel('month')} />}
                      {['monthly', 'yearly'].includes(draft.recurrence.frequency) && <TaskField label="Day of month" keyboardType="number-pad" value={Number.isNaN(draft.recurrence.monthDay) ? '' : String(draft.recurrence.monthDay)} onChangeText={(value) => changeRecurrence('monthDay', value ? Number(value) : NaN)} />}
                      {['monthly', 'yearly'].includes(draft.recurrence.frequency) && <ThemedText type="small" themeColor="textSecondary">Shorter months use their last valid day.</ThemedText>}
                      <TaskSelect ref={(node) => { selectorControls.current.ends = node; }} label="Ends" value={draft.recurrence.endDate ? 'On date' : 'Never'} expanded={panel === 'ends'} onPress={() => openPanel('ends')} />
                      {!!draft.recurrence.endDate && (Platform.OS === 'web'
                        ? <TaskField label="End date" placeholder="YYYY-MM-DD" value={draft.recurrence.endDate} onChangeText={(value) => changeRecurrence('endDate', value)} />
                        : <TaskSelect label="End date" value={dateLabel(draft.recurrence.endDate)} expanded={picker === 'end'} onPress={() => openPicker('end')} />)}
                    </View>
                  )}
                  {recurrence && <ThemedText type="small" themeColor="textSecondary">{"Schedule changes apply tomorrow. Today's occurrences and history stay."}</ThemedText>}
                  {recurrence && !recurrenceStopped(recurrence) && <TaskButton label="Stop repeating" onPress={stopRepeating} />}
                  {picker && Platform.OS === 'ios' && (
                    <>
                      <DateTimePicker
                        value={picker === 'end' ? pickerValue(draft.recurrence?.endDate || draft.date) : pickerValue(draft.date, draft.time)}
                        mode={picker === 'end' ? 'date' : picker}
                        display="spinner"
                        themeVariant={scheme === 'dark' ? 'dark' : 'light'}
                        onValueChange={(_event, selected) => pickerChange(picker, selected)}
                      />
                      <TaskButton label="Done" onPress={() => setPicker(null)} />
                    </>
                  )}

                  <TaskSelect ref={(node) => { selectorControls.current.priority = node; }} label="Priority" value={priorityLabels[draft.priority]} expanded={panel === 'priority'} onPress={() => openPanel('priority')} />
                  <TaskSelect ref={(node) => { selectorControls.current.category = node; }} label="Category" value={categoryLabel} expanded={panel === 'category' || panel === 'new-category'} onPress={() => openPanel('category')} />
                </ScrollView>
              </View>

              {panel && (
                <View style={[styles.container, styles.panel]} key={panel}>
                  <View style={styles.header}>
                    <TaskButton label="Cancel" onPress={panel === 'new-category' ? cancelNewCategory : closePanel} />
                    <View ref={panelHeading} accessible accessibilityRole="header" accessibilityLabel={panelTitles[panel]} style={styles.heading}>
                      <ThemedText type="smallBold" style={styles.headingText}>{panelTitles[panel]}</ThemedText>
                    </View>
                    {panel === 'new-category' && <TaskButton label="Create" onPress={createCategory} disabled={!categoryName.trim()} />}
                  </View>
                  <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
                    {panel === 'priority' ? (
                      <View accessibilityRole="radiogroup" accessibilityLabel="Priority" style={styles.options}>
                        {priorities.map((priority) => <TaskChoice key={priority} label={priorityLabels[priority]} selected={draft.priority === priority} onPress={() => { change('priority', priority); closePanel(); }} />)}
                      </View>
                    ) : panel === 'repeat' ? (
                      <View accessibilityRole="radiogroup" accessibilityLabel="Repeats" style={styles.options}>
                        <TaskChoice label="Does not repeat" selected={!draft.recurrence} onPress={() => chooseFrequency(null)} />
                        {(Object.keys(frequencyLabels) as RecurrenceFrequency[]).map((frequency) => <TaskChoice key={frequency} label={frequencyLabels[frequency]} selected={draft.recurrence?.frequency === frequency} onPress={() => chooseFrequency(frequency)} />)}
                      </View>
                    ) : panel === 'ends' ? (
                      <View accessibilityRole="radiogroup" accessibilityLabel="Ends" style={styles.options}>
                        <TaskChoice label="Never" selected={!draft.recurrence?.endDate} onPress={() => { changeRecurrence('endDate', ''); closePanel(); }} />
                        <TaskChoice label="On date" selected={!!draft.recurrence?.endDate} onPress={() => { changeRecurrence('endDate', draft.recurrence?.endDate || draft.date || localDateString(new Date())); closePanel(); }} />
                      </View>
                    ) : panel === 'month' ? (
                      <View accessibilityRole="radiogroup" accessibilityLabel="Month" style={styles.options}>
                        {monthNames.map((month, index) => <TaskChoice key={month} label={month} selected={draft.recurrence?.month === index + 1} onPress={() => { changeRecurrence('month', index + 1); closePanel(); }} />)}
                      </View>
                    ) : panel === 'category' ? (
                      <>
                        <View accessibilityRole="radiogroup" accessibilityLabel="Category" style={styles.options}>
                          <TaskChoice label="No category" selected={!draft.categoryId} onPress={() => { change('categoryId', null); closePanel(); }} />
                          {categories.map((category) => <TaskChoice key={category.id} label={category.name} selected={draft.categoryId === category.id} onPress={() => { change('categoryId', category.id); closePanel(); }} />)}
                        </View>
                        <TaskButton label="+ New category" accessibilityLabel="Create new category" onPress={() => openPanel('new-category')} />
                      </>
                    ) : (
                      <>
                        <TaskError message={categoryError} />
                        <TaskField label="Category name" value={categoryName} onChangeText={(value) => { setCategoryName(value); setCategoryError(null); }} autoFocus returnKeyType="done" onSubmitEditing={createCategory} />
                      </>
                    )}
                  </ScrollView>
                </View>
              )}
            </KeyboardAvoidingView>
          </SafeAreaView>
        </ThemedView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hidden: { opacity: 0 },
  panel: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.three, gap: Spacing.two },
  heading: { flex: 1, minWidth: 80 },
  headingText: { textAlign: 'center' },
  error: { paddingHorizontal: Spacing.three },
  form: { padding: Spacing.three, gap: Spacing.three },
  description: { minHeight: 80 },
  dateTime: { gap: Spacing.three },
  dateTimeRow: { flexDirection: 'row' },
  dateTimeField: { gap: Spacing.two, minWidth: 0 },
  dateTimeColumn: { flex: 1 },
  options: { gap: Spacing.two },
  weekdays: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});

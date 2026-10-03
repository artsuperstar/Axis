import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { dateLabel, localDateString, localTimeString, pickerValue, taskDraft, userError, validateTaskDraft } from '../form';
import { priorities, priorityLabels, type Task, type TaskCategory, type TaskDraft } from '../types';
import { TaskButton, TaskChoice, TaskError, TaskField, TaskSelect } from './controls';

type EditorPanel = 'priority' | 'category' | 'new-category';

type Props = {
  task: Task | null;
  categories: TaskCategory[];
  onSave: (draft: TaskDraft) => void;
  onCreateCategory: (name: string) => TaskCategory;
  onDismiss: () => void;
};

export function TaskEditor({ task, categories, onSave, onCreateCategory, onDismiss }: Props) {
  const scheme = useColorScheme();
  const { fontScale } = useWindowDimensions();
  const [dateTimeWidth, setDateTimeWidth] = useState(0);
  const [draft, setDraft] = useState(() => {
    const initial = taskDraft(task);
    if (!categories.some((category) => category.id === initial.categoryId)) initial.categoryId = null;
    return initial;
  });
  const [picker, setPicker] = useState<'date' | 'time' | null>(null);
  const [panel, setPanel] = useState<EditorPanel | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);
  const priorityControl = useRef<View>(null);
  const categoryControl = useRef<View>(null);
  const panelHeading = useRef<View>(null);
  const returnFocus = useRef<'priority' | 'category' | null>(null);
  // Measure the actual sheet content, which may be narrower than the device window.
  const dateTimeInRow = dateTimeWidth >= 2 * 160 * Math.max(1, fontScale) + Spacing.three;
  const categoryLabel = categories.find((category) => category.id === draft.categoryId)?.name ?? 'No category';

  useEffect(() => {
    if (Platform.OS === 'web' || panel === 'new-category') return;
    const frame = requestAnimationFrame(() => {
      const target = panel ? panelHeading.current
        : returnFocus.current === 'priority' ? priorityControl.current
          : returnFocus.current === 'category' ? categoryControl.current : null;
      if (target) AccessibilityInfo.sendAccessibilityEvent(target, 'focus');
      if (!panel) returnFocus.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [panel]);

  function change<K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function openPicker(mode: 'date' | 'time') {
    if (mode === 'time' && !draft.date) return;
    Keyboard.dismiss();
    const value = pickerValue(draft.date, draft.time);
    if (Platform.OS === 'android') {
      setPicker(mode);
      DateTimePickerAndroid.open({
        value,
        mode,
        is24Hour: true,
        onValueChange: (_event, selected) => {
          change(mode, mode === 'date' ? localDateString(selected) : localTimeString(selected));
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
    returnFocus.current = panel === 'priority' ? 'priority' : 'category';
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
    if (saving.current) return;
    saving.current = true;
    try {
      validateTaskDraft(draft);
      onSave(draft);
      onDismiss();
    } catch (cause) {
      saving.current = false;
      setError(userError(cause, 'Unable to save this task. Please try again.'));
    }
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

                  <View
                    onLayout={({ nativeEvent }) => setDateTimeWidth(nativeEvent.layout.width)}
                    style={[styles.dateTime, dateTimeInRow && styles.dateTimeRow]}>
                    <View style={[styles.dateTimeField, dateTimeInRow && styles.dateTimeColumn]}>
                      {Platform.OS === 'web' ? (
                        <TaskField label="Date" placeholder="YYYY-MM-DD" value={draft.date} onChangeText={(value) => { change('date', value); if (!value) change('time', ''); }} />
                      ) : (
                        <TaskSelect label="Date" value={draft.date ? dateLabel(draft.date) : 'Add date'} expanded={picker === 'date'} onPress={() => openPicker('date')} />
                      )}
                      {!!draft.date && Platform.OS !== 'web' && <TaskButton label="Clear date" accessibilityLabel="Clear date and time" onPress={() => { change('date', ''); change('time', ''); setPicker(null); }} />}
                    </View>
                    <View style={[styles.dateTimeField, dateTimeInRow && styles.dateTimeColumn]}>
                      {Platform.OS === 'web' ? (
                        <TaskField label="Time" placeholder="HH:MM" value={draft.time} editable={!!draft.date} accessibilityHint={!draft.date ? 'Add a date before setting a time' : undefined} onChangeText={(value) => change('time', value)} />
                      ) : (
                        <TaskSelect label="Time" value={draft.time || 'Add time'} disabled={!draft.date} expanded={picker === 'time'} accessibilityHint={!draft.date ? 'Add a date before setting a time' : undefined} onPress={() => openPicker('time')} />
                      )}
                      {!!draft.time && Platform.OS !== 'web' && <TaskButton label="Clear time" onPress={() => { change('time', ''); setPicker(null); }} />}
                    </View>
                  </View>
                  {picker && Platform.OS === 'ios' && (
                    <>
                      <DateTimePicker
                        value={pickerValue(draft.date, draft.time)}
                        mode={picker}
                        display="spinner"
                        themeVariant={scheme === 'dark' ? 'dark' : 'light'}
                        onValueChange={(_event, selected) => change(picker, picker === 'date' ? localDateString(selected) : localTimeString(selected))}
                      />
                      <TaskButton label="Done" onPress={() => setPicker(null)} />
                    </>
                  )}

                  <TaskSelect ref={priorityControl} label="Priority" value={priorityLabels[draft.priority]} expanded={panel === 'priority'} onPress={() => openPanel('priority')} />
                  <TaskSelect ref={categoryControl} label="Category" value={categoryLabel} expanded={panel === 'category' || panel === 'new-category'} onPress={() => openPanel('category')} />
                </ScrollView>
              </View>

              {panel && (
                <View style={[styles.container, styles.panel]} key={panel}>
                  <View style={styles.header}>
                    <TaskButton label="Cancel" onPress={panel === 'new-category' ? cancelNewCategory : closePanel} />
                    <View ref={panelHeading} accessible accessibilityRole="header" accessibilityLabel={panel === 'new-category' ? 'New Category' : panel === 'priority' ? 'Priority' : 'Category'} style={styles.heading}>
                      <ThemedText type="smallBold" style={styles.headingText}>{panel === 'new-category' ? 'New Category' : panel === 'priority' ? 'Priority' : 'Category'}</ThemedText>
                    </View>
                    {panel === 'new-category' && <TaskButton label="Create" onPress={createCategory} disabled={!categoryName.trim()} />}
                  </View>
                  <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
                    {panel === 'priority' ? (
                      <View accessibilityRole="radiogroup" accessibilityLabel="Priority" style={styles.options}>
                        {priorities.map((priority) => <TaskChoice key={priority} label={priorityLabels[priority]} selected={draft.priority === priority} onPress={() => { change('priority', priority); closePanel(); }} />)}
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
});

import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { CategoryManager } from './components/category-manager';
import { TaskButton, TaskError } from './components/controls';
import { TaskEditor } from './components/task-editor';
import { OccurrenceHistory } from './components/occurrence-history';
import { RecurringTasks } from './components/recurring-tasks';
import { TaskRow } from './components/task-row';
import { userError } from './form';
import { groupTasks } from './grouping';
import { localDateString } from './calendar';
import { latestRecurrence } from './recurrence';
import type { Task } from './types';
import { useTasks } from './use-tasks';

export function TasksScreen({ initialTaskId }: { initialTaskId?: string } = {}) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { access, snapshot, error, reload, mutate, presentationNow } = useTasks();
  const [editor, setEditor] = useState<{ task: Task | null } | null>(null);
  const [initialEditorOpen, setInitialEditorOpen] = useState(!!initialTaskId);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const pendingSeriesAction = useRef<(() => void) | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const categories = snapshot?.categories ?? [];
  const recurrences = snapshot?.recurrences ?? [];
  const historyTask = snapshot?.tasks.find((task) => task.id === historyId);
  const readHistory = useCallback((before?: string) => access.readHistory(historyId!, before), [access, historyId]);
  const initialTask = snapshot?.tasks.find((row) => row.id === initialTaskId);
  const shownEditor = editor ?? (initialEditorOpen && initialTask ? { task: initialTask } : null);

  function seriesClosed() {
    const action = pendingSeriesAction.current;
    pendingSeriesAction.current = null;
    action?.();
  }

  function fromSeries(action: () => void) {
    pendingSeriesAction.current = action;
    setSeriesOpen(false);
    // iOS must finish dismissing its sheet before presenting another one.
    if (Platform.OS !== 'ios') requestAnimationFrame(seriesClosed);
  }

  function perform(action: () => void) {
    try {
      mutate(action);
      setActionError(null);
    } catch (cause) {
      setActionError(userError(cause, 'Unable to update this task. Please try again.'));
    }
  }

  function deleteTask(task: Task) {
    const series = recurrences.some((rule) => rule.taskId === task.id);
    Alert.alert(series ? 'Delete repeating task?' : 'Delete task?', series ? `Delete “${task.title}” and hide all its occurrences? History will remain stored.` : `Delete “${task.title}”?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => perform(() => access.deleteTask(task.id)) },
    ]);
  }

  return (
    <>
      <SectionList
        style={{ flex: 1, backgroundColor: colors.background }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, {
          paddingTop: (Platform.OS === 'ios' ? 0 : insets.top) + Spacing.three,
          paddingLeft: Math.max(insets.left, Spacing.three),
          paddingRight: Math.max(insets.right, Spacing.three),
        }]}
        sections={groupTasks(snapshot?.items ?? [], localDateString(new Date(presentationNow)))}
        keyExtractor={(item) => item.key}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={(
          <View style={styles.header}>
            <ThemedText type="subtitle" accessibilityRole="header">Tasks</ThemedText>
            <View style={styles.buttons}>
              <TaskButton label="Add task" disabled={!snapshot} onPress={() => { setActionError(null); setEditor({ task: null }); }} />
              <TaskButton label="Categories" disabled={!snapshot} onPress={() => setCategoriesOpen(true)} />
              <TaskButton label="Repeating tasks" disabled={!snapshot} onPress={() => setSeriesOpen(true)} />
            </View>
            <TaskError message={error || actionError || (initialEditorOpen && snapshot && !initialTask ? 'This task is no longer available.' : null)} />
            {!!error && <TaskButton label="Retry" onPress={reload} />}
          </View>
        )}
        ListEmptyComponent={!snapshot ? (error ? null : <ActivityIndicator color={colors.text} accessibilityLabel="Loading tasks" />) : (
          <View style={styles.empty}>
            <ThemedText>{snapshot.tasks.length ? 'No tasks in this window' : 'No tasks yet'}</ThemedText>
            <ThemedText themeColor="textSecondary">{snapshot.tasks.length ? 'Use Repeating tasks to edit schedules or inspect older history.' : 'Add a task with only a title.'}</ThemedText>
          </View>
        )}
        renderSectionHeader={({ section }) => <ThemedText type="smallBold" accessibilityRole="header" style={styles.section}>{section.title}</ThemedText>}
        renderItem={({ item }) => (
          <TaskRow
            task={item.task}
            occurrence={item.occurrence}
            recurrences={recurrences}
            now={presentationNow}
            categories={categories}
            onEdit={() => { setActionError(null); setEditor({ task: item.task }); }}
            onComplete={() => perform(() => item.occurrence
              ? access.setOccurrenceStatus(item.occurrence.id, item.occurrence.status === 'completed' ? 'pending' : 'completed')
              : access.setCompleted(item.task.id, item.task.completedAt === null))}
            onSkip={item.occurrence && item.occurrence.status !== 'completed' ? () => perform(() => access.setOccurrenceStatus(item.occurrence!.id, item.occurrence!.status === 'skipped' ? 'pending' : 'skipped')) : undefined}
            onHistory={item.occurrence ? () => setHistoryId(item.task.id) : undefined}
            onDelete={() => deleteTask(item.task)}
          />
        )}
      />
      {shownEditor && (
        <TaskEditor
          task={shownEditor.task}
          recurrence={shownEditor.task ? latestRecurrence(recurrences, shownEditor.task.id) : null}
          categories={categories}
          onSave={(draft) => mutate(() => shownEditor.task ? access.editTask(shownEditor.task.id, draft) : access.createTask(draft))}
          onCreateCategory={(name) => mutate(() => access.createCategory(name))}
          onDismiss={() => { setInitialEditorOpen(false); setEditor(null); }}
        />
      )}
      <RecurringTasks visible={seriesOpen} tasks={snapshot?.tasks ?? []} recurrences={recurrences}
        onDismiss={() => setSeriesOpen(false)} onClosed={seriesClosed}
        onEdit={(task) => fromSeries(() => setEditor({ task }))}
        onHistory={(task) => fromSeries(() => setHistoryId(task.id))} />
      {historyTask && <OccurrenceHistory task={historyTask} categories={categories} recurrences={recurrences} now={presentationNow} readPage={readHistory}
        onStatus={(id, status) => mutate(() => access.setOccurrenceStatus(id, status))} onDismiss={() => setHistoryId(null)} />}
      {categoriesOpen && (
        <CategoryManager
          categories={categories}
          onCreate={(name) => mutate(() => access.createCategory(name))}
          onDelete={(id) => mutate(() => access.deleteCategory(id))}
          onDismiss={() => setCategoriesOpen(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: Spacing.four, flexGrow: 1 },
  header: { gap: Spacing.three, paddingBottom: Spacing.three },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  empty: { paddingVertical: Spacing.five, gap: Spacing.two },
  section: { paddingTop: Spacing.four, paddingBottom: Spacing.two },
});

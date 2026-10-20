import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-screens/experimental';

import { ThemedText } from '@/components/themed-text';
import { SheetRefreshContext } from '@/components/sheet-refresh-notice';
import { ContextMenuHost } from '@/components/context-menu';
import { BackButton } from '@/components/back-button';
import { UiText, DesignProvider, useDesignColors } from '@/components/design-system';
import { DesignSpace } from '@/constants/design-system-v2';
import { Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { CategoryManager } from './components/category-manager';
import { TaskButton, TaskError } from './components/controls';
import { FloatingAddTask } from './components/floating-add-task';
import { TaskEditor } from './components/task-editor';
import { OccurrenceHistory } from './components/occurrence-history';
import { RecurringTasks, RepeatingTasksHeader } from './components/recurring-tasks';
import { TaskRow } from './components/task-row';
import { TaskActions } from './components/task-actions';
import { TaskOptions } from './components/task-options';
import { TaskSectionFooter, TaskSectionHeader } from './components/task-section';
import { TaskWorkspaceList, type TaskWorkspaceListHandle } from './components/task-workspace-list';
import { TaskHistoryHeader, TaskHistoryList } from './components/task-history-list';
import { userError } from './form';
import { localDateString } from './calendar';
import { latestRecurrence } from './recurrence';
import type { Task, TaskListItem } from './types';
import { useTasks } from './use-tasks';
import { taskArchiveSections, taskWorkspaceSections, todoPreviewLimit, type TaskWorkspaceSection } from './workspace';

export function RepeatingTasksScreen() { return <TasksScreen destination="repeating" />; }
export function TasksHistoryScreen() { return <TasksScreen destination="history" />; }

/** Routes share source-owned editing/mutations; only their information hierarchy differs. */
export function TasksScreen({ initialTaskId, destination = 'main' }: {
  initialTaskId?: string; destination?: 'main' | 'repeating' | 'history';
} = {}) {
  const colors = useTheme();
  const design = useDesignColors();
  const { access, snapshot, error, reload, mutate, presentationNow } = useTasks();
  const [editor, setEditor] = useState<{ task: Task | null } | null>(null);
  const [initialEditorOpen, setInitialEditorOpen] = useState(!!initialTaskId);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [actionItem, setActionItem] = useState<TaskListItem | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [earlierOpen, setEarlierOpen] = useState(false);
  const [upcomingOpen, setUpcomingOpen] = useState(false);
  const [todoOpen, setTodoOpen] = useState(false);
  const pendingManagementAction = useRef<(() => void) | null>(null);
  const workspaceList = useRef<TaskWorkspaceListHandle>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const categories = snapshot?.categories ?? [];
  const recurrences = snapshot?.recurrences ?? [];
  const historyTask = snapshot?.tasks.find((task) => task.id === historyId);
  const readHistory = useCallback((before?: string) => access.readHistory(historyId!, before), [access, historyId]);
  const initialTask = snapshot?.tasks.find((row) => row.id === initialTaskId);
  const shownEditor = editor ?? (initialEditorOpen && initialTask ? { task: initialTask } : null);
  const shownActions = snapshot?.items.find((item) => item.key === actionItem?.key) ?? actionItem;
  const main = destination === 'main';
  const repeating = destination === 'repeating';
  const history = destination === 'history';
  const today = localDateString(new Date(presentationNow));
  const sections: TaskWorkspaceSection[] = main
    ? taskWorkspaceSections(snapshot?.items ?? [], today, { earlier: earlierOpen, upcoming: upcomingOpen, todo: todoOpen })
    : repeating ? [] : taskArchiveSections(snapshot?.items ?? [], today).map((section) => ({ ...section, total: section.data.length, expanded: true }));
  const title = main ? 'Tasks' : destination === 'repeating' ? 'Repeating Tasks' : 'History';

  function managementClosed() {
    const action = pendingManagementAction.current;
    pendingManagementAction.current = null;
    action?.();
  }

  function fromManagement(action: () => void) {
    pendingManagementAction.current = action;
    setActionsOpen(false);
    // iOS must finish dismissing its sheet before presenting a route or another sheet.
    if (Platform.OS !== 'ios') requestAnimationFrame(managementClosed);
  }

  function perform(action: () => void) {
    workspaceList.current?.cancelDisclosure();
    try { mutate(action); setActionError(null); }
    catch (cause) { setActionError(userError(cause, 'Unable to update this task. Please try again.')); }
  }

  function deleteTask(task: Task) {
    const series = recurrences.some((rule) => rule.taskId === task.id);
    Alert.alert(series ? 'Delete repeating task?' : 'Delete task?', series ? `Delete “${task.title}” and hide all its occurrences? History will remain stored.` : `Delete “${task.title}”?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => perform(() => { access.deleteTask(task.id); setActionsOpen(false); }) },
    ]);
  }

  function renderRow(item: TaskListItem, section?: string) {
    return <TaskRow task={item.task} occurrence={item.occurrence} recurrences={recurrences} now={presentationNow} categories={categories}
      appearance={main ? 'v2' : undefined} section={section}
      onEdit={() => { setActionError(null); setEditor({ task: item.task }); }}
      onComplete={() => perform(() => item.occurrence
        ? access.setOccurrenceStatus(item.occurrence.id, item.occurrence.status === 'completed' ? 'pending' : 'completed')
        : access.setCompleted(item.task.id, item.task.completedAt === null))}
      onActions={() => { setActionError(null); setActionItem(item); setActionsOpen(true); }} />;
  }

  function sectionHeader(section: TaskWorkspaceSection, beforeToggle?: () => void) {
    if (main) return <TaskSectionHeader section={section} now={presentationNow} disabled={!snapshot}
      onToggle={() => {
        beforeToggle?.();
        const next = !section.expanded;
        if (section.title === 'Earlier') setEarlierOpen(next); else setUpcomingOpen(next);
      }} />;
    return <View style={styles.sectionHeader}>
      <ThemedText type="sectionHeading" accessibilityRole="header">{section.title}</ThemedText>
      {main && section.title === 'Today' && <ThemedText type="secondary" themeColor="textSecondary">
        {new Date(presentationNow).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      </ThemedText>}
    </View>;
  }

  function sectionFooter(section: TaskWorkspaceSection) {
    if (!main || !snapshot || !section.expanded) return null;
    return <TaskSectionFooter section={section}>
      {!section.total && <UiText type="secondary" color="textSecondary">
        {section.title === 'Today' ? 'No tasks for today.' : section.title === 'To-do' ? 'No to-do items.' : `No ${section.title.toLowerCase()} tasks.`}
      </UiText>}
      {section.title === 'To-do' && section.total > todoPreviewLimit && <TaskButton appearance="v2" variant="quiet"
        label={todoOpen ? 'Show less' : `View all ${section.total}`} onPress={() => setTodoOpen((open) => !open)} />}
      {section.title === 'Upcoming' && <TaskButton appearance="v2" variant="quiet" label="View in Calendar" onPress={() => router.navigate('/(tabs)/calendar')} />}
    </TaskSectionFooter>;
  }

  const ScreenTitle = main ? UiText : ThemedText;
  function backToTasks() { if (router.canGoBack()) router.back(); else router.replace('/(tabs)/tasks'); }
  const notices = <>
    <TaskError appearance={repeating || history ? 'v2' : undefined} message={error || actionError || (initialEditorOpen && snapshot && !initialTask ? 'This task is no longer available.' : null)} />
    {!!error && <TaskButton appearance={repeating || history ? 'v2' : undefined} label="Retry" onPress={reload} />}
  </>;
  const header = repeating ? <RepeatingTasksHeader onBack={backToTasks}>{notices}</RepeatingTasksHeader>
    : history ? <TaskHistoryHeader onBack={backToTasks}>{notices}</TaskHistoryHeader>
    : <View style={[styles.header, main && styles.mainHeader]}>
        <View style={styles.titleRow}>
          {!main && <BackButton accessibilityLabel="Back to Tasks" onPress={backToTasks} />}
          <ScreenTitle type="screenTitle" accessibilityRole="header" style={[styles.title, main && styles.mainTitle]}>{title}</ScreenTitle>
          {main && <TaskOptions disabled={!snapshot} onOpen={() => setActionError(null)}
            onCategories={() => setCategoriesOpen(true)} onRepeating={() => router.push('/tasks/repeating')} onHistory={() => router.push('/tasks/history')} />}
        </View>
        {notices}
      </View>;
  return <DesignProvider><SheetRefreshContext.Provider value={{ error, onRetry: reload }}>
    <SafeAreaView edges={{ top: true, bottom: true, left: true, right: true }} style={{ flex: 1, backgroundColor: design.canvas }}>
      <ContextMenuHost safeAreaApplied>
      {main && header}
      {repeating ? <RecurringTasks header={header} ready={!!snapshot} loading={!snapshot && !error}
          tasks={snapshot?.tasks ?? []} recurrences={recurrences} onDelete={deleteTask}
          onEdit={(task) => { setActionError(null); setEditor({ task }); }} onHistory={(task) => setHistoryId(task.id)} /> : main ? <TaskWorkspaceList ref={workspaceList} sections={sections} disabled={!snapshot}
        loading={!snapshot && !error ? <ActivityIndicator color={colors.text} accessibilityLabel="Loading tasks" /> : null}
        renderHeader={sectionHeader} renderFooter={sectionFooter} renderRow={renderRow} /> : <TaskHistoryList
        {...{ sections, categories, recurrences, header }} now={presentationNow} ready={!!snapshot} loading={!snapshot && !error}
        onEdit={item => { setActionError(null); setEditor({ task: item.task }); }}
        onComplete={item => perform(() => item.occurrence
          ? access.setOccurrenceStatus(item.occurrence.id, item.occurrence.status === 'completed' ? 'pending' : 'completed')
          : access.setCompleted(item.task.id, item.task.completedAt === null))}
        onHistory={item => setHistoryId(item.task.id)}
        onSkip={item => { if (item.occurrence) perform(() => access.setOccurrenceStatus(item.occurrence!.id, 'pending')); }}
        onDelete={item => deleteTask(item.task)} />}
      {main && <FloatingAddTask disabled={!snapshot} onPress={() => { setActionError(null); setEditor({ task: null }); }} />}
      <TaskActions item={shownActions} visible={actionsOpen} recurrences={recurrences} categories={categories} now={presentationNow} error={actionError}
        onDismiss={() => setActionsOpen(false)} onClosed={managementClosed}
        onEdit={() => { if (shownActions) fromManagement(() => setEditor({ task: shownActions.task })); }}
        onHistory={() => { if (shownActions) fromManagement(() => setHistoryId(shownActions.task.id)); }}
        onSkip={() => { if (shownActions?.occurrence) perform(() => {
          access.setOccurrenceStatus(shownActions.occurrence!.id, shownActions.occurrence!.status === 'skipped' ? 'pending' : 'skipped'); setActionsOpen(false);
        }); }} onDelete={() => { if (shownActions) deleteTask(shownActions.task); }} />
      {shownEditor && <TaskEditor task={shownEditor.task} appearance={repeating ? 'v2' : undefined}
        recurrence={shownEditor.task ? latestRecurrence(recurrences, shownEditor.task.id) : null} categories={categories}
        onSave={(draft) => mutate(() => shownEditor.task ? access.editTask(shownEditor.task.id, draft) : access.createTask(draft))}
        onCreateCategory={(name) => mutate(() => access.createCategory(name))}
        onDismiss={() => { setInitialEditorOpen(false); setEditor(null); }} />}
      {historyTask && <OccurrenceHistory task={historyTask} categories={categories} recurrences={recurrences} now={presentationNow} readPage={readHistory}
        onStatus={(id, status) => mutate(() => access.setOccurrenceStatus(id, status))} onDismiss={() => setHistoryId(null)} />}
      {categoriesOpen && <CategoryManager categories={categories} onCreate={(name) => mutate(() => access.createCategory(name))}
        onDelete={(id) => mutate(() => access.deleteCategory(id))} onDismiss={() => setCategoriesOpen(false)} />}
      </ContextMenuHost>
    </SafeAreaView>
  </SheetRefreshContext.Provider></DesignProvider>;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Space.lg, paddingTop: Space.lg, gap: Space.sm },
  mainHeader: { paddingHorizontal: DesignSpace.section, paddingTop: Space.md, paddingBottom: Space.xs },
  mainTitle: { fontSize: 38, lineHeight: 48 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm }, title: { flex: 1, minWidth: 0 },
  sectionHeader: { paddingTop: Space.xl, paddingBottom: Space.sm, gap: Space.xs },
});

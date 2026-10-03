import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { CategoryManager } from './components/category-manager';
import { TaskButton, TaskError } from './components/controls';
import { TaskEditor } from './components/task-editor';
import { TaskRow } from './components/task-row';
import { userError } from './form';
import { groupTasks } from './grouping';
import type { Task } from './types';
import { useTasks } from './use-tasks';

export function TasksScreen() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { access, snapshot, error, reload, mutate } = useTasks();
  const [editor, setEditor] = useState<{ task: Task | null } | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const categories = snapshot?.categories ?? [];

  function perform(action: () => void) {
    try {
      mutate(action);
      setActionError(null);
    } catch (cause) {
      setActionError(userError(cause, 'Unable to update this task. Please try again.'));
    }
  }

  function deleteTask(task: Task) {
    Alert.alert('Delete task?', `Delete “${task.title}”?`, [
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
        sections={groupTasks(snapshot?.tasks ?? [])}
        keyExtractor={(task) => task.id}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={(
          <View style={styles.header}>
            <ThemedText type="subtitle" accessibilityRole="header">Tasks</ThemedText>
            <View style={styles.buttons}>
              <TaskButton label="Add task" disabled={!snapshot} onPress={() => { setActionError(null); setEditor({ task: null }); }} />
              <TaskButton label="Categories" disabled={!snapshot} onPress={() => setCategoriesOpen(true)} />
            </View>
            <TaskError message={error || actionError} />
            {!!error && <TaskButton label="Retry" onPress={reload} />}
          </View>
        )}
        ListEmptyComponent={!snapshot ? (error ? null : <ActivityIndicator color={colors.text} accessibilityLabel="Loading tasks" />) : (
          <View style={styles.empty}>
            <ThemedText>No tasks yet</ThemedText>
            <ThemedText themeColor="textSecondary">Add a task with only a title.</ThemedText>
          </View>
        )}
        renderSectionHeader={({ section }) => <ThemedText type="smallBold" accessibilityRole="header" style={styles.section}>{section.title}</ThemedText>}
        renderItem={({ item }) => (
          <TaskRow
            task={item}
            categories={categories}
            onEdit={() => { setActionError(null); setEditor({ task: item }); }}
            onComplete={() => perform(() => access.setCompleted(item.id, item.completedAt === null))}
            onDelete={() => deleteTask(item)}
          />
        )}
      />
      {editor && (
        <TaskEditor
          task={editor.task}
          categories={categories}
          onSave={(draft) => mutate(() => editor.task ? access.editTask(editor.task.id, draft) : access.createTask(draft))}
          onCreateCategory={(name) => mutate(() => access.createCategory(name))}
          onDismiss={() => setEditor(null)}
        />
      )}
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

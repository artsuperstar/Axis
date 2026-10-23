import { useState, type ReactNode } from 'react';
import { ActivityIndicator, SectionList, StyleSheet, View, useWindowDimensions } from 'react-native';

import { BackButton } from '@/components/back-button';
import { ContextMenu } from '@/components/context-menu';
import { GroupSurface, UiIcon, UiText, useDesignColors } from '@/components/design-system';
import { useFormSelection } from '@/components/form-selection-host';
import { DesignSpace as Space, Shape, TouchTarget } from '@/constants/design-system-v2';

import { latestRecurrence, recurrencePatternSummary, recurrenceStopped, recurrenceSummary } from '../recurrence';
import type { Task, TaskRecurrence } from '../types';
import { TaskButton } from './controls';

type RecurringTaskItem = { task: Task; rule: TaskRecurrence; stopped: boolean };
type RecurringTaskSection = { title: 'Active' | 'Stopped'; data: RecurringTaskItem[] };
type Actions = { onEdit: (task: Task) => void; onHistory: (task: Task) => void; onDelete?: (task: Task) => void };

/** Presentation grouping only: the existing version selector and stopped predicate own state. */
export function recurringTaskSections(tasks: Task[], recurrences: TaskRecurrence[]): RecurringTaskSection[] {
  const byTask = new Map<string, TaskRecurrence[]>();
  for (const rule of recurrences) {
    const rules = byTask.get(rule.taskId) ?? []; rules.push(rule); byTask.set(rule.taskId, rules);
  }
  const active: RecurringTaskItem[] = [], stopped: RecurringTaskItem[] = [];
  for (const task of tasks) {
    if (task.deletedAt !== null || !byTask.has(task.id)) continue;
    const rule = latestRecurrence(byTask.get(task.id)!, task.id)!;
    const item = { task, rule, stopped: recurrenceStopped(rule) };
    (item.stopped ? stopped : active).push(item);
  }
  return [...(active.length ? [{ title: 'Active' as const, data: active }] : []),
    ...(stopped.length ? [{ title: 'Stopped' as const, data: stopped }] : [])];
}

export function RepeatingTasksHeader({ onBack, children }: { onBack: () => void; children?: ReactNode }) {
  const colors = useDesignColors();
  const { fontScale } = useWindowDimensions();
  return <View style={styles.header}>
    <View style={[styles.roundAction, { backgroundColor: colors.control, borderColor: colors.border }]}>
      <BackButton appearance="v2" iconOnly accessibilityLabel="Back to Tasks" onPress={onBack} />
    </View>
    <UiText type="screenTitle" accessibilityRole="header" style={fontScale >= 1.5 && styles.largeTitle}>Repeating Tasks</UiText>
    <UiText type="secondary" color="textSecondary">Manage recurring schedules and review their history.</UiText>
    {children}
  </View>;
}

function RecurringTaskCard({ item: { task, rule, stopped }, onEdit, onHistory, onDelete }: { item: RecurringTaskItem } & Actions) {
  const colors = useDesignColors();
  const { fontScale } = useWindowDimensions();
  const [actionWidth, setActionWidth] = useState(0);
  const inRow = actionWidth >= 2 * 160 * Math.max(1, fontScale) + Space.sm;
  const details = <View style={[styles.details, fontScale >= 1.5 && styles.fullWidthDetails]}>
    <View style={styles.nameRow}>
      <UiText type="editorSection" accessibilityRole="header" accessibilityLabel={`${task.title}, ${stopped ? 'Stopped' : 'Active'} repeating task`} style={styles.name}>{task.title}</UiText>
      {stopped && <View style={[styles.badge, { backgroundColor: colors.brandSoft }]}>
        <UiText type="smallLabel" color="brand" accessible={false} importantForAccessibility="no">Stopped</UiText>
      </View>}
    </View>
    <UiText type="metadata" color="textSecondary">Current schedule</UiText>
    <UiText type="body">{stopped ? recurrencePatternSummary(rule) : recurrenceSummary(rule)}</UiText>
  </View>;
  return <GroupSurface variant={stopped ? 'surface' : 'group'} testID={`repeating-task-${task.id}`}
    style={[styles.card, { borderColor: colors.border }]}>
    <View style={[styles.identity, fontScale >= 1.5 && { justifyContent: 'space-between' }]}>
      <View style={[styles.icon, { backgroundColor: stopped ? colors.control : colors.taskAccentSoft }]}>
        <UiIcon name={stopped ? 'calendarStopped' : 'calendarRepeat'} color={stopped ? colors.textMuted : colors.taskText} size={30} />
      </View>
      {fontScale < 1.5 && details}
      {onDelete && <View style={[styles.roundAction, { backgroundColor: colors.control, borderColor: colors.border }]}>
        <ContextMenu appearance="v2" label={`Options for repeating task ${task.title}`} actions={[
          { label: 'Delete', accessibilityLabel: `Delete recurring task ${task.title}`, variant: 'destructive', onPress: () => onDelete(task) },
        ]} />
      </View>}
    </View>
    {fontScale >= 1.5 && details}
    <View onLayout={({ nativeEvent }) => setActionWidth(nativeEvent.layout.width)} style={[styles.actions, inRow && styles.actionsRow]}>
      <View style={inRow && styles.action}><TaskButton appearance="v2" variant="secondary" tone="brand" leadingIcon="pencil" label="Edit schedule" accessibilityLabel={`Edit schedule for ${task.title}`} onPress={() => onEdit(task)} /></View>
      <View style={inRow && styles.action}><TaskButton appearance="v2" variant="secondary" leadingIcon="clock" label="History" accessibilityLabel={`History for ${task.title}`} onPress={() => onHistory(task)} /></View>
    </View>
  </GroupSurface>;
}

/** One virtualized list; overlays stay in the screen's shared host, outside recycled cells. */
export function RecurringTasks({ tasks, recurrences, onEdit, onHistory, onDelete, header, loading = false, ready = true }: {
  tasks: Task[]; recurrences: TaskRecurrence[]; header?: ReactNode; loading?: boolean; ready?: boolean;
} & Actions) {
  const colors = useDesignColors();
  const selection = useFormSelection();
  return <SectionList<RecurringTaskItem, RecurringTaskSection> style={styles.list}
    sections={recurringTaskSections(tasks, recurrences)} keyExtractor={(item) => item.task.id}
    contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false} contentContainerStyle={styles.content}
    initialNumToRender={6} maxToRenderPerBatch={6} windowSize={5} stickySectionHeadersEnabled={false}
    scrollEnabled={!selection.activeId} onScroll={selection.reposition} scrollEventThrottle={16}
    ListHeaderComponent={<>{header}{loading && <ActivityIndicator color={colors.brand} accessibilityLabel="Loading tasks" />}</>}
    ListEmptyComponent={ready && !loading ? <GroupSurface variant="group" style={[styles.empty, { borderColor: colors.border }]}>
      <UiIcon name="repeat" color={colors.taskText} size={32} />
      <UiText type="cardTitle" style={styles.centered}>No repeating tasks yet.</UiText>
      <UiText type="secondary" color="textSecondary" style={styles.centered}>Create a recurring task from New Task to see it here.</UiText>
    </GroupSurface> : undefined}
    renderSectionHeader={({ section }) => <View style={styles.sectionHeader}>
      <UiText type="editorSection" accessibilityRole="header" accessibilityLabel={`${section.title}, ${section.data.length} repeating ${section.data.length === 1 ? 'task' : 'tasks'}`}>{section.title}</UiText>
      <View style={[styles.badge, { backgroundColor: colors.brandSoft }]}><UiText type="metadata" color="brand" accessible={false} importantForAccessibility="no">{section.data.length}</UiText></View>
    </View>}
    ItemSeparatorComponent={() => <View style={styles.separator} />}
    renderItem={({ item }) => <RecurringTaskCard {...{ item, onEdit, onHistory, onDelete }} />} />;
}

const styles = StyleSheet.create({
  list: { flex: 1 }, content: { paddingHorizontal: Space.lg, paddingBottom: Space.xl, flexGrow: 1 },
  header: { paddingTop: Space.md, paddingBottom: Space.sm, gap: Space.md },
  roundAction: { width: TouchTarget + 2, height: TouchTarget + 2, borderRadius: (TouchTarget + 2) / 2, borderWidth: 1, overflow: 'hidden', flexShrink: 0 },
  sectionHeader: { paddingTop: Space.section, paddingBottom: Space.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.sm },
  badge: { borderRadius: Shape.status, paddingHorizontal: Space.sm, paddingVertical: Space.xs, flexShrink: 0 },
  card: { padding: Space.md, gap: Space.md, borderWidth: 1 },
  identity: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm },
  icon: { width: 48, height: 48, borderRadius: Shape.control, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  details: { flex: 1, minWidth: 0, gap: Space.xs },
  fullWidthDetails: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  largeTitle: { fontSize: 32, lineHeight: 42 },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.sm }, name: { maxWidth: '100%' },
  actions: { gap: Space.sm }, actionsRow: { flexDirection: 'row' }, action: { flex: 1, minWidth: 0 },
  separator: { height: Space.md }, empty: { padding: Space.section, gap: Space.sm, borderWidth: 1, alignItems: 'center' }, centered: { textAlign: 'center' },
});

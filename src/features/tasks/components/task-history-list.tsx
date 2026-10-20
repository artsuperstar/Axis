import type { ReactNode } from 'react';
import { ActivityIndicator, SectionList, StyleSheet, View, useWindowDimensions } from 'react-native';

import { BackButton } from '@/components/back-button';
import { ContextMenu } from '@/components/context-menu';
import { GroupSurface, UiIcon, UiPressable, UiText, useDesignColors } from '@/components/design-system';
import { useFormSelection } from '@/components/form-selection-host';
import { DesignSpace as Space, Shape, TouchTarget } from '@/constants/design-system-v2';
import { useTheme } from '@/hooks/use-theme';

import { categoryName } from '../grouping';
import { taskRowPresentation } from '../presentation';
import type { TaskCategory, TaskListItem, TaskRecurrence } from '../types';
import type { taskArchiveSections } from '../workspace';

type Section = ReturnType<typeof taskArchiveSections>[number];
type Actions = {
  onEdit: (item: TaskListItem) => void; onComplete: (item: TaskListItem) => void;
  onHistory: (item: TaskListItem) => void; onSkip: (item: TaskListItem) => void; onDelete: (item: TaskListItem) => void;
};

export function TaskHistoryHeader({ onBack, children }: { onBack: () => void; children?: ReactNode }) {
  const colors = useDesignColors();
  const large = useWindowDimensions().fontScale >= 1.5;
  return <View style={styles.header}>
    <View style={[styles.headerRow, large && styles.largeHeaderRow]}>
      <View style={[styles.roundAction, { backgroundColor: colors.control, borderColor: colors.border }]}>
        <BackButton appearance="v2" iconOnly accessibilityLabel="Back to Tasks" onPress={onBack} />
      </View>
      <View style={[styles.headerDetails, large && styles.largeSectionDetails]}>
        <UiText type="screenTitle" accessibilityRole="header">History</UiText>
        <UiText type="secondary" color="textSecondary">A record of your completed tasks.</UiText>
      </View>
    </View>
    {children}
  </View>;
}

/** History retains the existing checkbox and editor entry points; only the archive presentation differs. */
function TaskHistoryRow({ item, categories, recurrences, now, onEdit, onComplete, onHistory, onSkip, onDelete }: {
  item: TaskListItem; categories: TaskCategory[]; recurrences: TaskRecurrence[]; now: number;
} & Actions) {
  const colors = useDesignColors();
  const theme = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const large = fontScale >= 1.5;
  const trailingStatus = !large && width >= 390 * Math.max(1, fontScale);
  const row = taskRowPresentation(item.task, item.occurrence, recurrences, categories, now);
  const tone = row.completed ? theme.success : colors.textSecondary;
  const organization = [row.priority, categoryName(item.task, categories)].filter(Boolean).join(' · ');
  const completion = <UiPressable scale accessibilityRole="checkbox" accessibilityState={{ checked: row.completed }}
    accessibilityLabel={`${row.completed ? 'Reopen' : 'Complete'} ${row.actionSubject}`} onPress={() => onComplete(item)} style={styles.completion}>
    <View style={[styles.completionTile, { backgroundColor: `${tone}24`, borderColor: `${tone}66` }]}>
      <UiIcon name={row.completed ? 'check' : 'forward'} size={22} color={tone} />
    </View>
  </UiPressable>;
  const menu = <View style={styles.menuFrame}>
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.menuDecoration]}><View style={[styles.menuDisc, { backgroundColor: colors.control, borderColor: colors.border }]} /></View>
    <ContextMenu appearance="v2" label={`Actions for ${row.actionSubject}`} actions={[
    ...(item.occurrence?.status === 'skipped' ? [{ label: 'Return to pending', accessibilityLabel: `Return to pending ${row.actionSubject}`, onPress: () => onSkip(item) }] : []),
    { label: item.occurrence ? 'Edit recurring task' : 'Edit task', accessibilityLabel: `Edit ${item.occurrence ? 'recurring task' : 'task'} ${item.task.title}`, onPress: () => onEdit(item) },
    ...(item.occurrence ? [{ label: 'View History', accessibilityLabel: `History for ${item.task.title}`, onPress: () => onHistory(item) }] : []),
    { label: item.occurrence ? 'Delete recurring task' : 'Delete task', accessibilityLabel: `Delete ${item.occurrence ? 'recurring task' : 'task'} ${item.task.title}`, variant: 'destructive', onPress: () => onDelete(item) },
  ]} /></View>;
  const status = <View testID={`task-history-status-${item.key}`} style={[styles.badge, styles.statusBadge, { backgroundColor: `${tone}1A`, borderColor: `${tone}66` }]}>
    <UiText type="smallLabel" accessible={false} importantForAccessibility="no" style={{ color: tone }}>{row.outcome}</UiText>
  </View>;
  const details = <UiPressable accessible accessibilityRole="button" accessibilityLabel={row.accessibilityLabel}
    accessibilityHint="Opens the task editor" onPress={() => onEdit(item)} style={[styles.details, large && styles.fullWidthDetails]}>
    <View style={[styles.nameRow, large && styles.largeNameRow]}>
      <UiText type="cardTitle" style={[styles.name, styles.taskTitle, (large || trailingStatus) && styles.largeName]}>{item.task.title}</UiText>
      {!trailingStatus && status}
    </View>
    {!!row.visibleDate && <View style={styles.metadata}><UiIcon name="calendar" size={14} color={colors.textMuted} /><UiText type="metadata" color="textSecondary" style={[styles.metadataText, styles.metadataLabel]}>{row.visibleDate}</UiText></View>}
    {!!row.recurrence && <View style={styles.metadata}><UiIcon name="repeat" size={14} color={colors.textMuted} /><UiText type="metadata" color="textSecondary" style={[styles.metadataText, styles.metadataLabel]}>{row.recurrence}</UiText></View>}
    {!!organization && <UiText type="metadata" color="textSecondary" style={styles.metadataLabel}>{organization}</UiText>}
    {!!item.task.description && <UiText type="secondary" color="textSecondary" numberOfLines={2}>{item.task.description}</UiText>}
  </UiPressable>;
  return <GroupSurface compact variant="group" testID={`task-history-row-${item.key}`} style={[styles.row, { borderColor: colors.border }]}>
    {large ? <><View style={styles.largeControls}>{completion}{menu}</View>{details}</> : <View style={styles.rowContent}>{completion}{details}{trailingStatus && status}{menu}</View>}
  </GroupSurface>;
}

/** Header/row/footer slices paint one owned collection without defeating SectionList windowing. */
export function TaskHistoryList({ sections, categories, recurrences, now, header, ready, loading, ...actions }: {
  sections: Section[]; categories: TaskCategory[]; recurrences: TaskRecurrence[]; now: number; header: ReactNode; ready: boolean; loading: boolean;
} & Actions) {
  const colors = useDesignColors();
  const theme = useTheme();
  const selection = useFormSelection();
  const large = useWindowDimensions().fontScale >= 1.5;
  return <SectionList<TaskListItem, Section> style={styles.list} contentContainerStyle={styles.content}
    sections={sections} keyExtractor={item => item.key} stickySectionHeadersEnabled={false}
    initialNumToRender={8} maxToRenderPerBatch={8} windowSize={5}
    contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false}
    scrollEnabled={!selection.activeId} onScroll={selection.reposition} scrollEventThrottle={16}
    ListHeaderComponent={<>{header}{loading && <ActivityIndicator color={colors.brand} accessibilityLabel="Loading tasks" />}</>}
    ListEmptyComponent={ready && !loading ? <GroupSurface variant="group" style={styles.empty}>
      <UiIcon name="check" color={theme.success} size={32} />
      <UiText type="cardTitle">No completed tasks yet.</UiText>
      <UiText type="secondary" color="textSecondary" style={styles.centered}>Completed tasks will appear here.</UiText>
    </GroupSurface> : null}
    renderSectionHeader={({ section }) => {
      const tone = section.title === 'Completed' ? theme.success : colors.textSecondary;
      const icon = <View style={[styles.sectionIcon, { backgroundColor: `${tone}24`, borderColor: `${tone}99` }]}><UiIcon name={section.title === 'Completed' ? 'check' : 'forward'} color={tone} size={22} /></View>;
      const count = <View style={[styles.badge, styles.countBadge, { backgroundColor: colors.control, borderColor: colors.border }]}><UiText type="numeric" accessible={false} importantForAccessibility="no" color="textSecondary">{section.data.length}</UiText></View>;
      const details = <View style={[styles.sectionDetails, large && styles.largeSectionDetails]}>
        <UiText type="sectionHeading" style={styles.sectionTitle} accessibilityRole="header" accessibilityLabel={`${section.title}, ${section.data.length} ${section.data.length === 1 ? 'record' : 'records'}`} accessibilityHint="Count reflects the current Tasks history range">{section.title}</UiText>
        <UiText type="secondary" color="textSecondary">{section.title === 'Completed' ? "Tasks you've finished." : "Occurrences you've skipped."}</UiText>
      </View>;
      return <View testID={`task-history-section-${section.title}`} style={[styles.sectionHeader, large && styles.largeSectionHeader, { backgroundColor: colors.group, borderColor: colors.border }]}>
        {large ? <><View style={styles.largeControls}>{icon}{count}</View>{details}</> : <>{icon}{details}{count}</>}
      </View>;
    }}
    renderItem={({ item }) => <View style={[styles.rowSlice, { backgroundColor: colors.group, borderColor: colors.border }]}>
      <TaskHistoryRow {...{ item, categories, recurrences, now }} {...actions} />
    </View>}
    renderSectionFooter={() => <View style={[styles.sectionFooter, { backgroundColor: colors.group, borderColor: colors.border }]} />} />;
}

const styles = StyleSheet.create({
  list: { flex: 1 }, content: { paddingHorizontal: Space.lg, paddingBottom: Space.xl, flexGrow: 1 },
  header: { paddingTop: Space.md, paddingBottom: Space.section, gap: Space.md },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.md }, largeHeaderRow: { flexDirection: 'column' },
  headerDetails: { flex: 1, minWidth: 0, gap: Space.sm },
  roundAction: { width: TouchTarget + 2, height: TouchTarget + 2, borderRadius: (TouchTarget + 2) / 2, borderWidth: 1, overflow: 'hidden' },
  menuFrame: { width: TouchTarget, height: TouchTarget, flexShrink: 0 },
  menuDecoration: { alignItems: 'center', justifyContent: 'center' }, menuDisc: { width: 32, height: 32, borderRadius: 16, borderWidth: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Space.md, padding: Space.md, paddingVertical: Space.lg, borderWidth: 1, borderBottomWidth: 0, borderTopLeftRadius: Shape.group, borderTopRightRadius: Shape.group },
  sectionIcon: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sectionTitle: { fontSize: 18, lineHeight: 26 },
  sectionDetails: { flex: 1, minWidth: 0, gap: 2 },
  largeSectionHeader: { flexDirection: 'column', alignItems: 'stretch' }, largeSectionDetails: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  badge: { paddingHorizontal: Space.sm, paddingVertical: Space.xs, borderRadius: Shape.status, flexShrink: 0, maxWidth: '100%' },
  statusBadge: { borderRadius: TouchTarget / 2, borderWidth: 1, paddingHorizontal: Space.sm, paddingVertical: 2 },
  countBadge: { minWidth: 32, borderRadius: TouchTarget / 2, borderWidth: 1, alignItems: 'center', paddingHorizontal: Space.sm, paddingVertical: 2 },
  rowSlice: { borderLeftWidth: 1, borderRightWidth: 1, paddingHorizontal: Space.sm, paddingBottom: Space.sm },
  row: { borderWidth: 1, borderRadius: Shape.control, padding: Space.xs },
  rowContent: { flexDirection: 'row', alignItems: 'center', gap: Space.xs },
  completion: { width: TouchTarget, height: TouchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: Shape.control, flexShrink: 0 },
  completionTile: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  details: { flex: 1, minWidth: 0, minHeight: TouchTarget, justifyContent: 'center', gap: 2 },
  fullWidthDetails: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', padding: Space.sm },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.xs },
  name: { flexGrow: 1, flexShrink: 1, flexBasis: 80, minWidth: 0 },
  taskTitle: { fontSize: 15, lineHeight: 22 },
  largeNameRow: { flexDirection: 'column', alignItems: 'flex-start' }, largeName: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', maxWidth: '100%' },
  metadata: { flexDirection: 'row', gap: Space.xs, alignItems: 'center' }, metadataText: { flex: 1, minWidth: 0 }, metadataLabel: { fontSize: 12, lineHeight: 17 },
  largeControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionFooter: { height: Space.sm, borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: Shape.group, borderBottomRightRadius: Shape.group, marginBottom: Space.lg },
  empty: { padding: Space.section, gap: Space.sm, alignItems: 'center' }, centered: { textAlign: 'center' },
});

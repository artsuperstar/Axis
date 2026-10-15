import { useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactElement, type Ref } from 'react';
import { SectionList, StyleSheet, View, type ViewToken } from 'react-native';

import { UiText, useDesignColors } from '@/components/design-system';
import { InternalNavigation } from '@/components/internal-navigation';
import { useReducedMotion } from '@/components/motion';
import { DesignSpace as Space, taskSectionSurface } from '@/constants/design-system-v2';

import type { TaskListItem } from '../types';
import type { TaskWorkspaceSection } from '../workspace';
import { taskFabClearance } from './floating-add-task';
import { TaskDisclosureCell, TaskDisclosureMotionContext, useTaskDisclosureMotion } from './task-disclosure-motion';

export const taskSectionDestinations = ['Earlier', 'Today', 'To-do', 'Upcoming'] as const;
type Destination = typeof taskSectionDestinations[number];
const options = taskSectionDestinations.map((value) => ({ value, label: value }));
const viewability = { itemVisiblePercentThreshold: 10, minimumViewTime: 80 };
function isDestination(title: string): title is Destination {
  return taskSectionDestinations.some((value) => value === title);
}

/** Pinned in normal flow: no sticky clone, overlay offsets or nonvirtualized task container. */
export type TaskWorkspaceListHandle = { cancelDisclosure: () => void };

export function TaskWorkspaceList({ ref, sections, disabled, loading, renderRow, renderHeader, renderFooter }: {
  ref?: Ref<TaskWorkspaceListHandle>;
  sections: TaskWorkspaceSection[]; disabled: boolean; loading: ReactElement | null;
  renderRow: (item: TaskListItem, section: string) => ReactElement;
  renderHeader: (section: TaskWorkspaceSection, beforeToggle: () => void) => ReactElement;
  renderFooter: (section: TaskWorkspaceSection) => ReactElement | null;
}) {
  const colors = useDesignColors();
  const reduced = useReducedMotion();
  const disclosureMotion = useTaskDisclosureMotion(sections);
  useImperativeHandle(ref, () => ({ cancelDisclosure: disclosureMotion.cancel }), [disclosureMotion.cancel]);
  const list = useRef<SectionList<TaskListItem, TaskWorkspaceSection>>(null);
  const [active, setActive] = useState<Destination>('Earlier');
  const jump = useRef<{ sectionIndex: number; attempts: number; animated: boolean } | null>(null);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearJump = useCallback(() => {
    if (retry.current) clearTimeout(retry.current);
    if (settle.current) clearTimeout(settle.current);
    jump.current = null;
  }, []);
  useEffect(() => clearJump, [clearJump]);
  // Stable callbacks/config are required by VirtualizedList. Update only on section changes, never per frame.
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken<TaskListItem>[] }) => {
    if (jump.current) return;
    // SectionList also reports header/footer tokens (index null), including empty/collapsed sections.
    const title = viewableItems.find((token) => token.isViewable && isDestination(token.section?.title ?? ''))?.section?.title;
    if (title && isDestination(title)) setActive((previous) => previous === title ? previous : title);
  }, []);
  const attemptJump = useCallback(function attempt() {
    const target = jump.current;
    if (!target) return;
    if (settle.current) clearTimeout(settle.current);
    target.attempts++;
    list.current?.recordInteraction();
    list.current?.scrollToLocation({ sectionIndex: target.sectionIndex, itemIndex: 0, viewPosition: 0, animated: target.animated });
    // Preserve the tapped target through intermediate viewability notifications and end-of-list clamping.
    settle.current = setTimeout(clearJump, 800);
  }, [clearJump]);
  const scrollFailed = useCallback(({ averageItemLength, index }: { averageItemLength: number; index: number }) => {
    const target = jump.current;
    if (!target) return;
    if (target.attempts >= 10) { clearJump(); return; }
    // RN supplies measured average geometry; do not assume fixed-height rows or text.
    list.current?.getScrollResponder()?.scrollTo({ y: averageItemLength * index, animated: false });
    if (retry.current) clearTimeout(retry.current);
    retry.current = setTimeout(attemptJump, 120);
  }, [attemptJump, clearJump]);
  return <TaskDisclosureMotionContext.Provider value={disclosureMotion.value}><View style={styles.root}>
    <View testID="task-section-navigation-pinned" style={styles.navigation}>
      <InternalNavigation compact testID="task-section-navigation" value={active} options={options} disabled={disabled} onChange={(title) => {
        clearJump(); setActive(title);
        jump.current = { sectionIndex: taskSectionDestinations.indexOf(title), attempts: 0, animated: !reduced };
        attemptJump();
      }} />
    </View>
    <SectionList<TaskListItem, TaskWorkspaceSection> ref={list} testID="task-workspace-list"
      style={styles.root} contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false}
      contentContainerStyle={[styles.content]} sections={sections} stickySectionHeadersEnabled={false}
      CellRendererComponent={TaskDisclosureCell} removeClippedSubviews={disclosureMotion.active ? false : undefined}
      keyExtractor={(item: TaskListItem | TaskWorkspaceSection) => 'task' in item ? item.key : `section:${item.title}`}
      viewabilityConfig={viewability} onViewableItemsChanged={onViewableItemsChanged}
      onScrollToIndexFailed={scrollFailed} onScrollBeginDrag={clearJump}
      ListHeaderComponent={loading}
      renderSectionHeader={({ section }) => renderHeader(section, () => disclosureMotion.begin(section))} renderSectionFooter={({ section }) => renderFooter(section)}
      renderItem={({ item, index, section }) => <>
        {section.title === 'Today' && index === section.completedStartIndex && <View testID="completed-today-label"
          style={[styles.completed, { backgroundColor: taskSectionSurface(colors, 'Today'), borderColor: colors.border }]}>
          <UiText type="smallLabel" color="textSecondary">Completed today</UiText>
        </View>}
        {renderRow(item, section.title)}
      </>} />
  </View></TaskDisclosureMotionContext.Provider>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  navigation: { paddingHorizontal: Space.section, paddingTop: Space.sm },
  content: { flexGrow: 1, paddingHorizontal: Space.section, paddingBottom: taskFabClearance },
  completed: { paddingHorizontal: Space.lg, paddingTop: Space.md, paddingBottom: Space.xs, borderLeftWidth: 1, borderRightWidth: 1 },
});

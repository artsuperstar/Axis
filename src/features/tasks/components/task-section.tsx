import { useEffect, useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { UiIcon, UiPressable, UiText, useDesignColors } from '@/components/design-system';
import { motionTiming, useReducedMotion } from '@/components/motion';
import { DesignSpace as Space, Shape, TouchTarget, taskSectionSurface } from '@/constants/design-system-v2';

import type { TaskWorkspaceSection } from '../workspace';
import { TodayProgress } from './today-progress';

import { taskDisclosureDuration } from './task-disclosure-motion';

/** Header, virtualized row slices and footer paint one region without wrapping a section's items. */
export function TaskSectionHeader({ section, now, disabled, onToggle }: {
  section: TaskWorkspaceSection; now: number; disabled: boolean; onToggle: () => void;
}) {
  const colors = useDesignColors();
  const { fontScale } = useWindowDimensions();
  const reduced = useReducedMotion();
  const rotation = useSharedValue(section.expanded ? 180 : 0);
  const previous = useRef(section.expanded);
  useEffect(() => {
    if (reduced) rotation.set(section.expanded ? 180 : 0);
    else if (previous.current !== section.expanded) rotation.set(withTiming(section.expanded ? 180 : 0, motionTiming(taskDisclosureDuration)));
    previous.current = section.expanded;
  }, [section.expanded, reduced, rotation]);
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.get()}deg` }] }));
  const disclosure = section.title === 'Earlier' || section.title === 'Upcoming';
  const today = section.title === 'Today';
  const largeToday = today && fontScale >= 1.5;
  const tone = section.title === 'Earlier' || today ? 'attention' : 'taskText';
  const icon = today ? 'sun' : section.title === 'Earlier' ? 'clock' : section.title === 'Upcoming' ? 'calendar' : 'list';
  const radius = today ? Shape.raised : Shape.group;
  const style = [styles.header, { backgroundColor: taskSectionSurface(colors, section.title), borderColor: colors.border,
    borderTopLeftRadius: radius, borderTopRightRadius: radius },
    disclosure && styles.disclosure, largeToday && { flexWrap: 'wrap' as const },
    !section.expanded && { borderBottomWidth: 1, borderBottomLeftRadius: radius, borderBottomRightRadius: radius }];
  const todayDetails = today && <>
    <UiText type="metadata" color="textSecondary" style={styles.metadata}>{new Date(now).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</UiText>
    {!!section.progress?.total && <UiText type="metadata" color="textSecondary" style={styles.metadata}>
      {section.progress.completed} of {section.progress.total} completed
    </UiText>}
  </>;
  const content = <>
    <View testID={`task-section-icon-${section.title}`} style={[styles.icon, { backgroundColor: today || section.title === 'Earlier' ? colors.attentionSoft : colors.taskAccentSoft }, disclosure && styles.disclosureIcon]}>
      <UiIcon name={icon} size={today ? 24 : 22} color={colors[tone]} />
    </View>
    <View style={styles.heading}>
      <UiText type={today ? 'sectionHeading' : 'cardTitle'} style={!today && styles.sectionTitle} accessibilityRole="header">{section.title}</UiText>
      {!largeToday && todayDetails}
      {disclosure && <UiText type="metadata" color="textSecondary" style={styles.metadata}>{section.total} {section.total === 1 ? 'task' : 'tasks'}</UiText>}
    </View>
    {disclosure ? <View style={[styles.chevron, { backgroundColor: colors.inset }]}><Animated.View style={chevron}>
      <UiIcon name="chevron" size={18} color={colors[tone]} />
    </Animated.View></View> : today ? section.progress && <TodayProgress {...section.progress} /> : <View testID={`task-section-count-${section.title}`} style={[styles.countBadge, { backgroundColor: colors.taskAccentSoft }]}>
      <UiText type="numeric" color="taskText" style={styles.count}>{section.total}</UiText>
    </View>}
    {largeToday && <View testID="today-details-reflow" style={{ width: '100%', gap: 2 }}>{todayDetails}</View>}
  </>;
  return disclosure ? <UiPressable testID={`task-section-${section.title}`} accessibilityRole="button"
    accessibilityLabel={`${section.title}, ${section.total} tasks`} accessibilityState={{ expanded: section.expanded, disabled }}
    disabled={disabled} onPress={onToggle} scale style={({ pressed }) => [style, pressed && { backgroundColor: colors.selected }]}>{content}</UiPressable>
    : <View testID={`task-section-${section.title}`} style={style}>{content}</View>;
}

export function TaskSectionFooter({ section, children }: { section: TaskWorkspaceSection; children?: React.ReactNode }) {
  const colors = useDesignColors();
  if (!section.expanded) return null;
  const radius = section.title === 'Today' ? Shape.raised : Shape.group;
  return <View testID={`task-section-${section.title}-footer`} style={[styles.footer, { backgroundColor: taskSectionSurface(colors, section.title), borderColor: colors.border,
    borderBottomLeftRadius: radius, borderBottomRightRadius: radius }, !section.total && styles.empty]}>{children}</View>;
}

const styles = StyleSheet.create({
  header: { marginTop: Space.lg, minHeight: TouchTarget, padding: Space.lg, flexDirection: 'row', alignItems: 'center',
    gap: Space.sm, borderWidth: 1, borderBottomWidth: 0, borderCurve: 'continuous' },
  disclosure: { minHeight: 64, paddingVertical: Space.md },
  heading: { flex: 1, minWidth: 0, gap: 2 },
  sectionTitle: { fontSize: 18, lineHeight: 24 }, metadata: { fontSize: 13, lineHeight: 19 },
  icon: { width: 40, height: 40, borderRadius: Shape.control, justifyContent: 'center', alignItems: 'center' },
  disclosureIcon: { width: 36, height: 36 },
  countBadge: { minWidth: 28, minHeight: 28, paddingHorizontal: Space.sm, paddingVertical: Space.xs, borderRadius: Shape.status, alignItems: 'center', justifyContent: 'center' },
  count: { fontSize: 13, lineHeight: 18, fontVariant: ['tabular-nums'] },
  chevron: { width: 28, height: 28, borderRadius: Shape.status, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: Space.lg, paddingBottom: Space.lg, gap: Space.sm, borderWidth: 1, borderTopWidth: 0 },
  empty: { paddingLeft: Space.lg + 40 + Space.sm },
});

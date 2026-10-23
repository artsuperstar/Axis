import { useMemo } from 'react';
import { ActivityIndicator, SectionList, StyleSheet, View, useWindowDimensions } from 'react-native';

import { GroupSurface, UiIcon, UiPressable, UiText, useDesignColors } from '@/components/design-system';
import { FormButton } from '@/components/form-controls';
import { DesignSpace as Space, Shape, TouchTarget } from '@/constants/design-system-v2';

import { workoutCompletionTime, workoutCounts, workoutGroupCount, workoutHistoryGroups } from '../management-presentation';
import type { SessionSummary } from '../types';

function CompletedStatus() {
  const colors = useDesignColors();
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.status, { backgroundColor: colors.brandSoft }]}>
    <UiIcon name="check" color={colors.brand} size={14} /><UiText type="smallLabel" color="brand">Completed</UiText>
  </View>;
}

export function WorkoutHistoryRow({ session, onOpen }: { session: SessionSummary; onOpen: (id: string) => void }) {
  const colors = useDesignColors();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 390 || fontScale >= 1.3, large = fontScale >= 1.5;
  const time = workoutCompletionTime(session), counts = workoutCounts(session.exerciseCount, session.setCount);
  const chevron = <UiIcon name="forward" size={18} color={colors.textMuted} />;
  return <UiPressable testID={`workout-history-row-${session.id}`} accessibilityRole="button"
    accessibilityLabel={`View ${session.name}, ${counts}. Completed at ${new Date(session.completedAt!).toLocaleString()}.`}
    accessibilityHint="Opens the saved workout. Read-only." onPress={() => onOpen(session.id)}
    style={[styles.session, stacked && styles.stacked, { borderColor: colors.border, backgroundColor: colors.surface }]}>
    <View style={[styles.identity, stacked && styles.unflex, large && styles.stacked]}>
      <View style={large ? styles.largeIcons : undefined}>
        <View style={[styles.workoutTile, { backgroundColor: colors.brandSoft }]}><UiIcon name="dumbbell" size={24} color={colors.brand} /></View>
        {large && chevron}
      </View>
      <View style={[styles.text, large && styles.unflex]}><UiText type="cardTitle">{session.name}</UiText>
        <UiText type="metadata" color="textSecondary">{counts}</UiText></View>
      {stacked && !large && chevron}
    </View>
    <View style={[styles.metadata, stacked && styles.stackedMetadata]}>
      {time && <UiText type="metadata" color="textSecondary" style={styles.time}>{stacked ? `Completed at ${time}` : time}</UiText>}
      <CompletedStatus />
    </View>
    {!stacked && chevron}
  </UiPressable>;
}

/** One virtualized archive: append pages first, then derive sections so split dates merge. */
export function HistoryContent({ sessions, loaded, loading, hasMore, onLoadMore, onOpen, scrollOffset, onScrollOffset }: {
  sessions: SessionSummary[]; loaded: boolean; loading: boolean; hasMore: boolean; onLoadMore: () => void;
  onOpen: (id: string) => void; scrollOffset: number; onScrollOffset: (offset: number) => void;
}) {
  const colors = useDesignColors();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 390 || fontScale >= 1.5;
  const sections = useMemo(() => {
    const groups = workoutHistoryGroups(sessions);
    return groups.map((group, index) => ({ key: group.key, title: group.label, data: group.sessions,
      count: workoutGroupCount(group.sessions.length, hasMore && index === groups.length - 1) }));
  }, [sessions, hasMore]);
  const edge = { backgroundColor: colors.group, borderColor: colors.border };
  return <SectionList testID="workout-history-list" style={styles.list} sections={sections} keyExtractor={session => session.id}
    initialNumToRender={8} maxToRenderPerBatch={8} windowSize={5} removeClippedSubviews={false} stickySectionHeadersEnabled={false}
    contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="never" contentOffset={{ x: 0, y: scrollOffset }}
    onScroll={event => onScrollOffset(event.nativeEvent.contentOffset.y)} scrollEventThrottle={16}
    ListHeaderComponent={<View style={[styles.bounded, styles.introduction]}>
      <View style={[styles.dateTile, { backgroundColor: colors.brandSoft }]}><UiIcon name="clock" size={24} color={colors.brand} /></View>
      <View style={styles.text}><UiText type="sectionHeading" accessibilityRole="header">Workout History</UiText>
        <UiText type="secondary" color="textSecondary">Recent completed sessions</UiText>
        {loading && <ActivityIndicator color={colors.brand} accessibilityLabel="Loading workout History" />}</View>
    </View>}
    renderSectionHeader={({ section }) => <View testID={`workout-date-${section.key}`} accessible accessibilityRole="header"
      accessibilityLabel={`${section.title}, ${section.count}`} style={[styles.bounded, styles.groupHeader, edge, stacked && styles.stacked]}>
      <View style={[styles.dateIdentity, stacked && styles.unflex]}>
        <View style={[styles.dateTile, { backgroundColor: colors.brandSoft }]}><UiIcon name="calendar" color={colors.brand} size={22} /></View>
        <UiText type="cardTitle" style={styles.dateTitle}>{section.title}</UiText>
      </View><UiText type="metadata" color="textMuted" style={styles.count}>{section.count}</UiText>
    </View>}
    renderItem={({ item }) => <View style={[styles.bounded, styles.rowWrap, edge]}><WorkoutHistoryRow session={item} onOpen={onOpen} /></View>}
    renderSectionFooter={() => <View style={[styles.bounded, styles.groupEnd, edge]} />}
    ListEmptyComponent={loaded ? <GroupSurface style={[styles.bounded, styles.empty, { borderColor: colors.border }]}>
      <UiIcon name="clock" size={28} color={colors.brand} /><UiText type="cardTitle">No workouts yet.</UiText>
      <UiText type="secondary" color="textSecondary">Completed workouts will appear here.</UiText>
    </GroupSurface> : undefined}
    ListFooterComponent={hasMore ? <View style={[styles.bounded, styles.footer]}>
      <FormButton appearance="v2" variant="secondary" label="Load older workouts" onPress={onLoadMore} />
    </View> : undefined} />;
}

const styles = StyleSheet.create({
  list: { flex: 1 }, content: { padding: Space.lg, paddingBottom: Space.xl, flexGrow: 1 }, bounded: { width: '100%', maxWidth: 640, alignSelf: 'center' },
  introduction: { flexDirection: 'row', alignItems: 'center', gap: Space.md, paddingBottom: Space.section },
  text: { flex: 1, minWidth: 0, gap: Space.xs },
  dateTile: { width: 36, height: 36, borderRadius: Shape.control, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  groupHeader: { padding: Space.md, borderWidth: 1, borderBottomWidth: 0, borderTopLeftRadius: Shape.group, borderTopRightRadius: Shape.group,
    flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  dateIdentity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Space.sm }, dateTitle: { flex: 1, minWidth: 0 }, count: { flexShrink: 1 },
  rowWrap: { borderLeftWidth: 1, borderRightWidth: 1, paddingHorizontal: Space.sm, paddingBottom: Space.sm },
  groupEnd: { height: Space.sm, borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: Shape.group, borderBottomRightRadius: Shape.group, marginBottom: Space.lg },
  session: { minHeight: 76, padding: Space.sm, gap: Space.sm, borderRadius: Shape.control, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  identity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  workoutTile: { width: 40, height: 40, borderRadius: Shape.control, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  metadata: { maxWidth: '42%', flexShrink: 1, alignItems: 'flex-end', gap: Space.xs },
  time: { maxWidth: '100%', flexShrink: 1, minWidth: 0 },
  stackedMetadata: { maxWidth: '100%', alignItems: 'flex-start', flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  status: { alignSelf: 'flex-start', paddingHorizontal: Space.sm, paddingVertical: Space.xs, borderRadius: Shape.status, gap: Space.xs,
    flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  stacked: { flexDirection: 'column', alignItems: 'stretch' }, unflex: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  largeIcons: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  empty: { padding: Space.lg, gap: Space.sm, borderWidth: 1 }, footer: { paddingTop: Space.sm, paddingBottom: Space.sm, minHeight: TouchTarget },
});

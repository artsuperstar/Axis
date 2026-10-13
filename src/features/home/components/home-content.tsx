import { useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { FormButton } from '@/components/form-controls';
import { StatusText } from '@/components/status-text';
import { ThemedText } from '@/components/themed-text';
import { ControlSize, Radius, Space } from '@/constants/theme';
import { dateLabel } from '@/utils/calendar';
import { formatBrlAmount } from '@/features/finance/money';
import { dailyFitnessState } from '@/features/fitness/rotation-presentation';
import { useTheme } from '@/hooks/use-theme';

import type { HomeNavigation } from '../../source-navigation';
import { homeItemContext, homeItemLabel, homeTaskMetadata } from '../projection';
import type { HomeItem, HomeSection, HomeSnapshot, HomeTaskItem } from '../types';

type Actions = { onOpen: (target: HomeNavigation) => void; onComplete: (item: HomeTaskItem) => void };
export function HomeItemRow({ item, today, onOpen, onComplete }: Actions & { item: HomeItem; today: string }) {
  const colors = useTheme();
  const attention = item.source === 'task' ? ['Earlier', 'Missed'].includes(item.status) : ['Overdue', 'Payment overdue'].includes(item.status);
  const taskMetadata = item.source === 'task' ? homeTaskMetadata(item) : '';
  return <View style={[styles.row, { borderColor: colors.border }]}>
    {item.source === 'task' && item.status !== 'Upcoming' && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: false }} aria-checked={false}
      accessibilityLabel={`Complete ${homeItemLabel(item, today)}`} onPress={() => onComplete(item)} style={styles.completion}>
      <ThemedText type="metric" themeColor="textSecondary">○</ThemedText>
    </Pressable>}
    <Pressable accessible accessibilityRole="button" accessibilityLabel={`Open ${homeItemLabel(item, today)}`}
      accessibilityHint="Opens the owning feature" onPress={() => onOpen(item.target)}
      style={({ pressed }) => [styles.details, pressed && { backgroundColor: colors.surfaceMuted }]}>
      {item.source === 'task' && !!item.time && <ThemedText type="cardTitle" themeColor="textSecondary" style={styles.time}>{item.time}</ThemedText>}
      <ThemedText type="cardTitle">{item.title}</ThemedText>
      {item.source !== 'task' && <ThemedText type="body">{formatBrlAmount(item.amountMinor)}{item.source === 'work' ? attention ? ' outstanding' : ' expected' : ''}</ThemedText>}
      {(attention || item.date !== today) && <StatusText type="metadata" tone={attention ? 'attention' : 'neutral'}>{homeItemContext(item, today)}</StatusText>}
      {item.source === 'task' && !!taskMetadata && <ThemedText type="metadata" themeColor="textSecondary">{taskMetadata}</ThemedText>}
      <ThemedText type="metadata" themeColor="textMuted">{item.source === 'task' ? 'Task' : item.source === 'commitment' ? 'Commitment' : `${item.clientName} · Work`}</ThemedText>
    </Pressable>
  </View>;
}


type HomePanel = 'today' | 'attention' | 'fitness';
function fitnessState(snapshot: HomeSnapshot) {
  return dailyFitnessState({ active: snapshot.activeWorkout?.session ?? null, completedCount: snapshot.completedWorkoutCount, nextWorkout: snapshot.nextWorkout });
}
function fitnessSummary(snapshot: HomeSnapshot) {
  switch (fitnessState(snapshot)) {
    case 'active': {
      const session = snapshot.activeWorkout!.session;
      return [session.name, 'Workout in progress', `${session.exerciseCount} exercises · ${session.setCount} sets`];
    }
    case 'completed': return [snapshot.completedWorkoutCount > 1 ? `${snapshot.completedWorkoutCount} workouts completed ✓` : 'Workout done ✓',
      ...(snapshot.completedWorkoutCount === 1 && snapshot.completedWorkout ? [snapshot.completedWorkout.session.name] : []),
      ...(snapshot.nextWorkout ? [`Next: ${snapshot.nextWorkout.routine.name}`] : [])];
    case 'next': return ['Up next', snapshot.nextWorkout!.routine.name];
    case 'empty': return ['No workout today'];
  }
}
export function homeGridColumns(width: number, fontScale: number) { return width / Math.max(1, fontScale) >= 280 ? 2 : 1; }
function total(sections: HomeSection[]) { return sections.reduce((count, section) => count + section.total, 0); }
function itemSummary(item: HomeItem) { return `${item.source === 'task' && item.time ? item.time + ' ' : ''}${item.title}`; }
function attentionSummary(snapshot: HomeSnapshot) {
  return snapshot.attention.map((section) => `${section.total} ${section.source === 'task' ? section.total === 1 ? 'task needing attention' : 'tasks needing attention'
    : section.source === 'commitment' ? section.total === 1 ? 'overdue commitment' : 'overdue commitments' : section.total === 1 ? 'overdue work payment' : 'overdue work payments'}`);
}

export function HomeDetail({ panel, snapshot, onOpen, onComplete }: Actions & { panel: HomePanel; snapshot: HomeSnapshot }) {
  const count = total(panel === 'attention' ? snapshot.attention : snapshot.today);
  const active = snapshot.activeWorkout; const completed = snapshot.completedWorkout;
  const next = snapshot.nextWorkout;
  if (panel === 'today') return <View style={styles.section}>
    <ThemedText type="sectionHeading" accessibilityRole="header">Today{count ? ` · ${count}` : ''}</ThemedText>
    {count ? snapshot.todayPreview.map((item) => <HomeItemRow key={item.id} item={item} today={snapshot.date} onOpen={onOpen} onComplete={onComplete} />)
      : <ThemedText type="secondary" themeColor="textSecondary">Nothing scheduled today.</ThemedText>}
    {count > snapshot.todayPreview.length && <ThemedText type="metadata" themeColor="textSecondary">{count - snapshot.todayPreview.length} more scheduled today</ThemedText>}
    {!count && snapshot.nextUp && <>
      <ThemedText type="cardTitle">Next up</ThemedText>
      <HomeItemRow item={snapshot.nextUp} today={snapshot.date} onOpen={onOpen} onComplete={onComplete} />
    </>}
    <FormButton variant="quiet" label="View in Calendar" onPress={() => onOpen({ pathname: '/(tabs)/calendar' })} />
  </View>;
  if (panel === 'attention') return <View style={styles.section}>
    <ThemedText type="sectionHeading" accessibilityRole="header">Needs attention{count ? ` · ${count}` : ''}</ThemedText>
    {!count && <ThemedText type="secondary" themeColor="textSecondary">Nothing needs attention.</ThemedText>}
    {snapshot.attentionPreview.map((item) => <HomeItemRow key={item.id} item={item} today={snapshot.date} onOpen={onOpen} onComplete={onComplete} />)}
    {count > snapshot.attentionPreview.length && <>
      <ThemedText type="metadata" themeColor="textSecondary">{count - snapshot.attentionPreview.length} more · Open a source to see all</ThemedText>
      <View style={styles.sourceLinks}>{snapshot.attention.map((section) => <FormButton key={section.source} variant="quiet"
        label={`${section.source === 'task' ? 'Tasks' : section.source === 'commitment' ? 'Commitments' : 'Work'} (${section.total})`}
        accessibilityLabel={`View all ${section.title.toLowerCase()}, ${section.total} items`} onPress={() => onOpen(section.target)} />)}</View>
    </>}
  </View>;
  return <View style={styles.section}>
    <ThemedText type="sectionHeading" accessibilityRole="header">Fitness</ThemedText>
    {active ? <>
      <ThemedText type="cardTitle">{active.session.name}</ThemedText>
      <ThemedText type="secondary" themeColor="textSecondary">Workout in progress</ThemedText>
      <ThemedText type="secondary" themeColor="textSecondary">{active.session.exerciseCount} exercises · {active.session.setCount} sets logged</ThemedText>
      <FormButton variant="primary" label="Resume workout" accessibilityLabel={`Resume ${active.session.name}, active workout`} onPress={() => onOpen(active.target)} />
    </> : snapshot.completedWorkoutCount > 0 ? <>
      <ThemedText type="secondary">{snapshot.completedWorkoutCount === 1 ? 'Workout completed today' : `${snapshot.completedWorkoutCount} workouts completed today`}</ThemedText>
      {completed && <>
        <ThemedText type="cardTitle">{snapshot.completedWorkoutCount > 1 ? 'Latest: ' : ''}{completed.session.name}</ThemedText>
        <ThemedText type="secondary" themeColor="textSecondary">{completed.session.exerciseCount} exercises · {completed.session.setCount} sets logged</ThemedText>
        <FormButton variant="quiet" label={snapshot.completedWorkoutCount > 1 ? 'View latest workout' : 'View workout'}
        accessibilityLabel={`View ${completed.session.name}, completed today`} onPress={() => onOpen(completed.target)} />
      </>}
      {next && <>
        <ThemedText type="cardTitle">Next workout</ThemedText>
        <ThemedText type="secondary">{next.routine.name}</ThemedText>
        <ThemedText type="metadata" themeColor="textSecondary">Rotation: {next.rotation.name}</ThemedText>
      </>}
    </> : next ? <>
      <ThemedText type="secondary" themeColor="textSecondary">Up next</ThemedText>
      <ThemedText type="cardTitle">{next.routine.name}</ThemedText>
      <ThemedText type="secondary" themeColor="textSecondary">Rotation: {next.rotation.name}</ThemedText>
      <ThemedText type="metadata" themeColor="textSecondary">{snapshot.rotationSequence.join(' → ')}</ThemedText>
      <FormButton variant="quiet" label="Open Fitness" onPress={() => onOpen({ pathname: '/(tabs)/fitness' })} />
    </> : <>
      <ThemedText type="secondary" themeColor="textSecondary">No workout recorded today.</ThemedText>
      <ThemedText type="secondary" themeColor="textSecondary">No active workout rotation.</ThemedText>
      <FormButton variant="quiet" label="Open Fitness" onPress={() => onOpen({ pathname: '/(tabs)/fitness' })} />
    </>}
  </View>;
}

export function HomeContent({ snapshot, onOpen, onComplete, onAddTransaction }: Actions & { snapshot: HomeSnapshot; onAddTransaction: () => void }) {
  const colors = useTheme(); const { width, fontScale } = useWindowDimensions();
  const [gridWidth, setGridWidth] = useState<number | null>(null);
  const [selected, setSelected] = useState<HomePanel | null>(null);
  const columns = homeGridColumns(gridWidth ?? width - Space.lg * 2, fontScale);
  const todayCount = total(snapshot.today); const attentionCount = total(snapshot.attention);
  const first = snapshot.todayPreview[0];
  const summaries: { id: HomePanel | 'journal'; title: string; count?: number; lines: string[] }[] = [
    { id: 'today', title: 'Today', count: todayCount, lines: first ? [itemSummary(first), ...(todayCount > 1 ? [`+ ${todayCount - 1} more`] : [])]
      : ['Nothing scheduled', ...(snapshot.nextUp ? [`Next: ${itemSummary(snapshot.nextUp)} · ${dateLabel(snapshot.nextUp.date)}`] : [])] },
    { id: 'attention', title: 'Needs attention', count: attentionCount, lines: attentionCount ? attentionSummary(snapshot) : ['Nothing needs attention'] },
    { id: 'fitness', title: 'Fitness', lines: fitnessSummary(snapshot) },
    { id: 'journal', title: 'Journal', lines: ['Today', snapshot.journal.hasEntry ? 'Entry saved' : 'Not written yet'] },
  ];
  const spent = formatBrlAmount(snapshot.spentTodayMinor);
  function box(summary: typeof summaries[number]) {
    const isJournal = summary.id === 'journal';
    const expanded = selected === summary.id;
    return <Pressable key={summary.id} accessible accessibilityRole="button"
      accessibilityLabel={[summary.title, summary.count !== undefined ? `${summary.count} items` : null, ...summary.lines, isJournal ? 'Opens Journal' : null].filter(Boolean).join('. ')}
      accessibilityState={isJournal ? undefined : { selected: expanded, expanded }} aria-expanded={isJournal ? undefined : expanded}
      accessibilityHint={isJournal ? "Opens today's Journal entry" : 'Shows or hides detail below the summary grid'}
      onPress={() => { if (summary.id === 'journal') onOpen({ pathname: '/journal' }); else setSelected(expanded ? null : summary.id); }}
      style={({ pressed }) => [styles.box, { borderColor: expanded ? colors.accent : colors.border,
        backgroundColor: expanded ? colors.accentMuted : pressed ? colors.surfaceMuted : colors.surface }]}>
      <View style={styles.boxHeading}>
        <ThemedText type="cardTitle" style={styles.boxTitle}>{summary.title}</ThemedText>
        <ThemedText type="metadata" themeColor="textSecondary">{summary.count !== undefined ? `${summary.count} ` : ''}{isJournal ? '→' : expanded ? '−' : '+'}</ThemedText>
      </View>
      {summary.lines.map((line, index) => <ThemedText key={index} type="secondary" themeColor="textSecondary">{line}</ThemedText>)}
    </Pressable>;
  }
  return <View style={styles.content}>
    <View style={[styles.spent, { borderColor: colors.border }]}>
      <View accessible accessibilityRole="text" accessibilityLabel={`Spent today, ${spent}`} style={styles.spentInformation}>
        <ThemedText type="secondary" themeColor="textSecondary" style={styles.spentLabel}>Spent today</ThemedText>
        <ThemedText type="cardTitle" style={[styles.time, styles.spentAmount]}>{spent}</ThemedText>
      </View>
      <FormButton variant="quiet" label="+" accessibilityLabel="Add transaction" onPress={onAddTransaction} />
    </View>
    <View style={styles.grid} onLayout={({ nativeEvent }) => setGridWidth(nativeEvent.layout.width)}>
      {columns === 2 ? <>{[summaries.slice(0, 2), summaries.slice(2)].map((row, index) => <View key={index} style={styles.gridRow}>{row.map(box)}</View>)}</> : summaries.map(box)}
    </View>
    {selected && <View style={[styles.expanded, { borderColor: colors.border }]}>
      <HomeDetail panel={selected} snapshot={snapshot} onOpen={onOpen} onComplete={onComplete} />
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  content: { gap: Space.lg }, section: { gap: Space.sm },
  grid: { gap: Space.md }, gridRow: { flexDirection: 'row', gap: Space.md, alignItems: 'stretch' },
  box: { flex: 1, minWidth: 0, minHeight: 116, padding: Space.md, borderRadius: Radius.surface, borderWidth: 2, gap: Space.xs },
  boxHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.xs }, boxTitle: { flex: 1, minWidth: 0 },
  spent: { minHeight: ControlSize.touch, flexDirection: 'row', alignItems: 'center', gap: Space.sm, borderBottomWidth: 1 },
  spentInformation: { flex: 1, minWidth: 0, paddingVertical: Space.sm, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.sm },
  spentLabel: { flexGrow: 1 }, spentAmount: { flexShrink: 1, minWidth: 0 }, expanded: { paddingTop: Space.lg, borderTopWidth: 1 },
  row: { paddingVertical: Space.md, borderBottomWidth: 1, gap: Space.sm, flexDirection: 'row', alignItems: 'flex-start' },
  completion: { minWidth: ControlSize.touch, minHeight: ControlSize.touch, alignItems: 'center', justifyContent: 'center' },
  details: { flex: 1, minWidth: 0, minHeight: ControlSize.touch, gap: Space.xs },
  time: { fontVariant: ['tabular-nums'] }, sourceLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
});

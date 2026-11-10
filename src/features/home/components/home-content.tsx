import { useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { FormButton } from '@/components/form-controls';
import { UiIcon, UiText, useDesignColors } from '@/components/design-system';
import { useReducedMotion } from '@/components/motion';
import { DesignSpace as Space, MotionTokens, Shape, TouchTarget } from '@/constants/design-system-v2';
import { formatBrlAmount } from '@/features/finance/money';
import { dailyFitnessState } from '@/features/fitness/rotation-presentation';

import type { HomeNavigation } from '../../source-navigation';
import { homeItemContext, homeItemLabel, homeTaskMetadata } from '../projection';
import type { HomeItem, HomeSection, HomeSnapshot, HomeTaskItem } from '../types';
import { HomeArtwork, useHomeIdentity, type HomeIdentity } from './home-artwork';

const featureIcons = { today: 'sun', attention: 'alert', fitness: 'dumbbell', journal: 'book', spent: 'creditCard' } as const;

type Actions = { onOpen: (target: HomeNavigation) => void; onComplete: (item: HomeTaskItem) => void };
export function HomeItemRow({ item, today, onOpen, onComplete }: Actions & { item: HomeItem; today: string }) {
  const colors = useDesignColors();
  const attention = item.source === 'task' ? ['Earlier', 'Missed'].includes(item.status) : ['Overdue', 'Payment overdue'].includes(item.status);
  const taskMetadata = item.source === 'task' ? homeTaskMetadata(item) : '';
  return <View style={[styles.row, { borderColor: colors.border }]}>
    {item.source === 'task' && item.status !== 'Upcoming' && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: false }} aria-checked={false}
      accessibilityLabel={`Complete ${homeItemLabel(item, today)}`} onPress={() => onComplete(item)} style={styles.completion}>
      <View style={[styles.checkbox, { borderColor: colors.borderStrong }]} />
    </Pressable>}
    <Pressable accessible accessibilityRole="button" accessibilityLabel={`Open ${homeItemLabel(item, today)}`}
      accessibilityHint="Opens the owning feature" onPress={() => onOpen(item.target)}
      style={({ pressed }) => [styles.details, pressed && { backgroundColor: colors.inset }]}>
      <UiText type="cardTitle">{item.title}</UiText>
      {item.source !== 'task' && <UiText type="body">{formatBrlAmount(item.amountMinor)}{item.source === 'work' ? attention ? ' outstanding' : ' expected' : ''}</UiText>}
      {(attention || item.date !== today) && <UiText type="metadata" color={attention ? 'attention' : 'textSecondary'}>{homeItemContext(item, today)}</UiText>}
      <UiText type="metadata" color="textSecondary">{item.source === 'task' ? [item.time, taskMetadata, 'Task'].filter(Boolean).join(' · ') : item.source === 'commitment' ? 'Commitment' : `${item.clientName} · Work`}</UiText>
    </Pressable>
  </View>;
}


type HomePanel = 'today' | 'attention';
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
export function homeGridColumns(width: number, fontScale: number) { return width / Math.max(1, fontScale) >= 320 ? 2 : 1; }
function total(sections: HomeSection[]) { return sections.reduce((count, section) => count + section.total, 0); }
function itemSummary(item: HomeItem) { return `${item.source === 'task' && item.time ? item.time + ' ' : ''}${item.title}`; }
function sourceSummary(sections: HomeSection[], attention = false) {
  return sections.map(({ total: count, source }) => `${count} ${source === 'task' ? count === 1 ? 'task' : 'tasks'
    : source === 'commitment' ? `${attention ? 'overdue ' : ''}${count === 1 ? 'commitment' : 'commitments'}` : attention ? 'overdue work' : `work ${count === 1 ? 'payment' : 'payments'}`}`).join(' · ');
}

function FeatureHeading({ identity, title, subtitle }: { identity: HomeIdentity; title: string; subtitle?: string }) {
  const palette = useHomeIdentity(identity);
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale >= 1.5;
  return <View style={[styles.panelHeading, stacked && styles.stackedHeading]}>
    <View style={[styles.panelIcon, { backgroundColor: palette.body }]}><UiIcon name={featureIcons[identity]} size={26} color={palette.accent} /></View>
    <View style={[styles.copy, stacked && styles.stackedHeadingCopy]}><UiText type="editorTitle" accessibilityRole="header">{title}</UiText>
      {!!subtitle && <UiText type="secondary" color="textSecondary">{subtitle}</UiText>}</View>
  </View>;
}

export function HomeDetail({ panel, snapshot, onOpen, onComplete }: Actions & { panel: HomePanel; snapshot: HomeSnapshot }) {
  const count = total(panel === 'attention' ? snapshot.attention : snapshot.today);
  if (panel === 'today') return <View style={styles.section}>
    <FeatureHeading identity="today" title="Today's schedule" />
    {count ? snapshot.todayPreview.map((item) => <HomeItemRow key={item.id} item={item} today={snapshot.date} onOpen={onOpen} onComplete={onComplete} />)
      : <UiText type="secondary" color="textSecondary">Nothing scheduled today.</UiText>}
    {count > snapshot.todayPreview.length && <UiText type="metadata" color="textSecondary">{count - snapshot.todayPreview.length} more scheduled today</UiText>}
    {!count && snapshot.nextUp && <>
      <UiText type="cardTitle">Next up</UiText>
      <HomeItemRow item={snapshot.nextUp} today={snapshot.date} onOpen={onOpen} onComplete={onComplete} />
    </>}
    <FormButton appearance="v2" variant="quiet" label="View in Calendar" onPress={() => onOpen({ pathname: '/(tabs)/calendar' })} />
  </View>;
  if (panel === 'attention') return <View style={styles.section}>
    <FeatureHeading identity="attention" title="Needs attention" />
    {!count && <UiText type="secondary" color="textSecondary">Nothing needs attention.</UiText>}
    {snapshot.attentionPreview.map((item) => <HomeItemRow key={item.id} item={item} today={snapshot.date} onOpen={onOpen} onComplete={onComplete} />)}
    {count > snapshot.attentionPreview.length && <>
      <UiText type="metadata" color="textSecondary">{count - snapshot.attentionPreview.length} more · Open a source to see all</UiText>
      <View style={styles.sourceLinks}>{snapshot.attention.map((section) => <FormButton key={section.source} variant="quiet"
        label={`${section.source === 'task' ? 'Tasks' : section.source === 'commitment' ? 'Commitments' : 'Work'} (${section.total})`}
        accessibilityLabel={`View all ${section.title.toLowerCase()}, ${section.total} items`} onPress={() => onOpen(section.target)} />)}</View>
    </>}
  </View>;
}

export function HomeContent({ snapshot, onOpen, onComplete, onAddTransaction }: Actions & { snapshot: HomeSnapshot; onAddTransaction: () => void }) {
  const { width, fontScale } = useWindowDimensions(); const reduced = useReducedMotion();
  const palettes = { today: useHomeIdentity('today'), attention: useHomeIdentity('attention'), fitness: useHomeIdentity('fitness'), journal: useHomeIdentity('journal') };
  const spentPalette = useHomeIdentity('spent');
  const [gridWidth, setGridWidth] = useState<number | null>(null);
  const [selected, setSelected] = useState<HomePanel | null>(null);
  const columns = homeGridColumns(gridWidth ?? width - Space.lg * 2, fontScale);
  const todayCount = total(snapshot.today); const attentionCount = total(snapshot.attention);
  const first = snapshot.todayPreview[0];
  const todayPreview = first ? itemSummary(first) : null;
  const summaries: FeatureSummary[] = [
    { id: 'today', title: 'Today', count: todayCount,
      lines: [todayCount ? todayPreview && todayPreview.length <= 60 ? todayPreview + (todayCount > 1 ? ' · +' + (todayCount - 1) + ' more' : '') : sourceSummary(snapshot.today) : 'Nothing scheduled'],
      accessibleLines: first ? [itemSummary(first), sourceSummary(snapshot.today)] : snapshot.nextUp ? ['Next: ' + itemSummary(snapshot.nextUp)] : [] },
    { id: 'attention', title: 'Needs attention', count: attentionCount, lines: [attentionCount ? sourceSummary(snapshot.attention, true) : 'Nothing needs attention'] },
    { id: 'fitness', title: 'Fitness', lines: fitnessSummary(snapshot) },
    { id: 'journal', title: 'Journal', lines: ['Today', snapshot.journal.hasEntry ? 'Entry saved' : 'Not written yet'] },
  ];
  function box(summary: FeatureSummary) {
    const expanded = selected === summary.id;
    return featureCard(summary, palettes[summary.id], expanded, () => {
      if (summary.id === 'journal') { onOpen({ pathname: '/journal' }); return; }
      if (summary.id === 'fitness') {
        onOpen(snapshot.activeWorkout?.target ?? snapshot.completedWorkout?.target ?? { pathname: '/(tabs)/fitness' }); return;
      }
      if (!reduced) LayoutAnimation.configureNext({ duration: MotionTokens.selection, update: { type: 'easeInEaseOut' }, create: { type: 'easeInEaseOut', property: 'opacity' } });
      setSelected(expanded ? null : summary.id);
    }, columns === 1);
  }
  const detail = selected && <View key="detail" testID={`home-detail-${selected}`} style={[styles.expanded, { backgroundColor: palettes[selected].body, borderColor: palettes[selected].border }]}>
    <HomeDetail panel={selected} snapshot={snapshot} onOpen={onOpen} onComplete={onComplete} />
  </View>;
  return <View style={styles.content}>
    {spentTodayView(formatBrlAmount(snapshot.spentTodayMinor), spentPalette, onAddTransaction)}
    <View style={styles.grid} onLayout={({ nativeEvent }) => setGridWidth(nativeEvent.layout.width)}>
      {columns === 2 ? <>
        <View key="context" style={styles.contextual}>
          <View style={styles.gridRow}>{summaries.slice(0, 2).map(box)}</View>
          {detail}
        </View>
        <View key="destinations" style={styles.gridRow}>{summaries.slice(2).map(box)}</View>
      </> : summaries.map(summary => <View key={summary.id} style={styles.contextual}>
        {box(summary)}{selected === summary.id && detail}
      </View>)}
    </View>
  </View>;
}

type FeatureSummary = { id: HomePanel | 'fitness' | 'journal'; title: string; count?: number; lines: string[]; accessibleLines?: string[] };
function featureCard(summary: FeatureSummary, palette: ReturnType<typeof useHomeIdentity>, expanded: boolean, onPress: () => void, stacked: boolean) {
  const navigates = summary.id === 'journal' || summary.id === 'fitness';
  return <Pressable key={summary.id} testID={`home-card-${summary.id}`} accessible accessibilityRole="button"
      accessibilityLabel={[...new Set([summary.title, summary.count !== undefined ? `${summary.count} items` : null, ...summary.lines, ...(summary.accessibleLines ?? []), navigates ? 'Opens ' + summary.title : null].filter(Boolean))].join('. ')}
      accessibilityState={navigates ? undefined : { selected: expanded, expanded }} aria-expanded={navigates ? undefined : expanded}
      accessibilityHint={navigates ? summary.id === 'journal' ? "Opens today's Journal entry" : 'Opens the current Fitness workout or workout details' : expanded ? 'Collapses detail immediately below this card row' : 'Expands detail immediately below this card row'}
      onPress={onPress}
      style={({ pressed }) => [styles.box, stacked && styles.singleColumn, { borderColor: palette.border,
        backgroundColor: palette.body, opacity: pressed ? 0.9 : 1, borderWidth: expanded ? 2 : 1, padding: expanded ? 0 : 1 }]}>
      <HomeArtwork identity={summary.id} />
      <View style={styles.artHeader}>
        <View style={[styles.featureIcon, { backgroundColor: `${palette.body}D9`, borderColor: `${palette.accent}66` }]}>
          <UiIcon name={featureIcons[summary.id]} size={28} color={palette.accent} />
        </View>
        <View style={[styles.chevron, { backgroundColor: 'rgba(15, 12, 15, 0.55)' }]}>
          <UiIcon name={navigates ? 'forward' : expanded ? 'chevronUp' : 'chevron'} color="#FFF4ED" size={20} />
        </View>
      </View>
      <View style={[styles.cardCopy, { backgroundColor: `${palette.body}${palette.dark ? 'B8' : 'E6'}` }]}>
        <UiText type="editorSection" style={{ color: palette.text }}>{summary.title}</UiText>
        {summary.count !== undefined && <UiText type="metadata" style={{ color: palette.text }}>{summary.count} {summary.id === 'today' ? 'scheduled' : summary.count === 1 ? 'item' : 'items'}</UiText>}
        {summary.lines.map((line, index) => <UiText key={index} type="metadata" style={{ color: palette.text }}>{line}</UiText>)}
      </View>
    </Pressable>;
}

function homeAmount(amount: string, color: string) {
  return amount.length <= 17 ? <UiText type="cardTitle" style={[styles.time, { color }]}>{amount}</UiText>
    : <View testID="home-long-money" style={styles.moneyGroups}>{(amount.match(/^R\$\s|\d+\.|\d+,\d{2}$/g) ?? [amount]).map((part, index) => <UiText key={index} testID="home-money-group" type="cardTitle" style={[styles.time, { color, flexShrink: 0 }]}>{part}</UiText>)}</View>;
}

function spentTodayView(amount: string, palette: ReturnType<typeof useHomeIdentity>, onAdd: () => void) {
  return <View testID="home-spent" style={[styles.spent, { backgroundColor: palette.body, borderColor: palette.border }]}>
      <HomeArtwork identity="spent" />
      <View style={[styles.spentContent, { backgroundColor: `${palette.body}${palette.dark ? 'C9' : 'D9'}` }]}>
      <View style={[styles.spentIcon, { backgroundColor: palette.body }]}><UiIcon name="creditCard" color={palette.accent} size={24} /></View>
      <View accessible accessibilityRole="text" accessibilityLabel={`Spent today, ${amount}`} style={styles.spentInformation}>
        <UiText type="editorSection" style={{ color: palette.text }}>Spent today</UiText>
        {homeAmount(amount, palette.text)}
      </View>
      <View style={[styles.add, { backgroundColor: `${palette.body}E6`, borderColor: palette.border }]}><FormButton appearance="v2" variant="quiet" label="+" icon="plus" accessibilityLabel="Add transaction" onPress={onAdd} /></View>
      </View>
    </View>;
}

const styles = StyleSheet.create({
  content: { gap: Space.lg }, section: { gap: Space.sm }, moneyGroups: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline' },
  grid: { gap: Space.md }, contextual: { gap: Space.xs }, gridRow: { flexDirection: 'row', gap: Space.md, alignItems: 'stretch' },
  box: { flex: 1, minWidth: 0, borderRadius: Shape.raised, overflow: 'hidden' },
  singleColumn: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  artHeader: { flexGrow: 1, minHeight: 72, padding: Space.md, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  featureIcon: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chevron: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  cardCopy: { flexGrow: 0, flexShrink: 0, minWidth: 0, padding: Space.md, gap: Space.xs },
  spent: { borderRadius: Shape.raised, borderWidth: 1, overflow: 'hidden' },
  spentContent: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, padding: Space.md },
  spentIcon: { width: 38, height: 44, borderRadius: Shape.control, alignItems: 'center', justifyContent: 'center' },
  spentInformation: { flex: 1, minWidth: 0, gap: 2 }, add: { width: TouchTarget, height: TouchTarget, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  expanded: { padding: Space.lg, borderWidth: 1, borderRadius: Shape.raised },
  panelHeading: { flexDirection: 'row', gap: Space.md, alignItems: 'center', marginBottom: Space.sm }, copy: { flex: 1, minWidth: 0 },
  stackedHeading: { flexDirection: 'column', alignItems: 'flex-start' }, stackedHeadingCopy: { flex: 0, width: '100%' },
  panelIcon: { width: 48, height: 48, borderRadius: Shape.control, alignItems: 'center', justifyContent: 'center' },
  row: { paddingVertical: Space.sm, borderTopWidth: 1, gap: Space.sm, flexDirection: 'row', alignItems: 'flex-start' },
  completion: { minWidth: TouchTarget, minHeight: TouchTarget, alignItems: 'center', justifyContent: 'center' }, checkbox: { width: 26, height: 26, borderWidth: 2, borderRadius: 13 },
  details: { flex: 1, minWidth: 0, minHeight: TouchTarget, gap: Space.xs },
  time: { fontVariant: ['tabular-nums'] }, sourceLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
});

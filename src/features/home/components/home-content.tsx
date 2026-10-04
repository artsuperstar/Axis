import { Pressable, StyleSheet, View } from 'react-native';

import { FormButton } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { HomeNavigation } from '../../source-navigation';
import { homeItemContext, homeItemLabel } from '../projection';
import type { HomeItem, HomeSection, HomeSnapshot, HomeTaskItem } from '../types';

type Actions = { onOpen: (target: HomeNavigation) => void; onComplete: (item: HomeTaskItem) => void };
export function HomeItemRow({ item, today, onOpen, onComplete }: Actions & { item: HomeItem; today: string }) {
  const colors = useTheme();
  const source = item.source === 'task' ? item.occurrenceId ? 'Recurring task' : 'Task' : item.source === 'commitment' ? 'Commitment' : 'Work payment';
  return <View style={[styles.row, { borderColor: colors.backgroundSelected }]}>
    <Pressable accessible accessibilityRole="button" accessibilityLabel={`Open ${homeItemLabel(item, today)}`}
      onPress={() => onOpen(item.target)} style={styles.details}>
      <ThemedText type="smallBold">{item.title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{source} · {homeItemContext(item, today)}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{item.secondary}</ThemedText>
    </Pressable>
    {item.source === 'task' && <FormButton label="Complete" accessibilityLabel={`Complete ${homeItemLabel(item, today)}`} onPress={() => onComplete(item)} />}
  </View>;
}

export function HomePreview({ section, today, onOpen, onComplete }: Actions & { section: HomeSection; today: string }) {
  return <View style={styles.section}>
    <ThemedText type="smallBold" accessibilityRole="header">{section.title} ({section.total})</ThemedText>
    {section.items.map((item) => <HomeItemRow key={item.id} item={item} today={today} onOpen={onOpen} onComplete={onComplete} />)}
    {section.remaining > 0 && <FormButton label={`${section.remaining} more items · View all`} accessibilityLabel={`View all ${section.title.toLowerCase()}. ${section.remaining} more items.`} onPress={() => onOpen(section.target)} />}
  </View>;
}

export function HomeContent({ snapshot, onOpen, onComplete }: Actions & { snapshot: HomeSnapshot }) {
  const colors = useTheme();
  const active = snapshot.activeWorkout;
  const completed = snapshot.completedWorkout;
  return <View style={styles.content}>
    {active && <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <ThemedText type="smallBold" accessibilityRole="header">Workout in progress</ThemedText>
      <ThemedText>{active.session.name}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">Started {new Date(active.session.startedAt).toLocaleString()}</ThemedText>
      <FormButton label="Resume workout" accessibilityLabel={`Resume ${active.session.name}, workout in progress`} onPress={() => onOpen(active.target)} />
    </View>}
    {snapshot.today.length > 0 && <View style={styles.section}>
      <ThemedText accessibilityRole="header">Today</ThemedText>
      {snapshot.today.map((section) => <HomePreview key={section.source} section={section} today={snapshot.date} onOpen={onOpen} onComplete={onComplete} />)}
    </View>}
    {snapshot.attention.length > 0 && <View style={styles.section}>
      <ThemedText accessibilityRole="header">Needs attention</ThemedText>
      {snapshot.attention.map((section) => <HomePreview key={section.source} section={section} today={snapshot.date} onOpen={onOpen} onComplete={onComplete} />)}
    </View>}
    {snapshot.nothingPending && <ThemedText themeColor="textSecondary">Nothing needs your attention right now.</ThemedText>}
    {completed && <View style={styles.section}>
      <ThemedText type="smallBold" accessibilityRole="header">Workout completed today</ThemedText>
      <ThemedText>{completed.session.name}</ThemedText>
      <FormButton label="View workout" accessibilityLabel={`View ${completed.session.name}, completed today`} onPress={() => onOpen(completed.target)} />
    </View>}
    <FormButton label="View Calendar" onPress={() => onOpen({ pathname: '/(tabs)/calendar' })} />
    <FormButton label="Today's journal" onPress={() => onOpen({ pathname: '/journal' })} />
  </View>;
}

const styles = StyleSheet.create({
  content: { gap: Spacing.four }, section: { gap: Spacing.two },
  card: { padding: Spacing.three, borderRadius: Spacing.two, gap: Spacing.two },
  row: { paddingVertical: Spacing.two, borderBottomWidth: 1, gap: Spacing.two, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  details: { flex: 1, minWidth: 180, minHeight: 44, justifyContent: 'center', gap: Spacing.one },
});

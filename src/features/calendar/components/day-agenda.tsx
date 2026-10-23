import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';

import { GroupSurface, UiIcon, UiPressable, UiText } from '@/components/design-system';
import { DesignSpace as Space, Shape, TouchTarget } from '@/constants/design-system-v2';

import { useCalendarColors } from '../appearance';
import { dayAgenda } from '../projection';
import { calendarAgendaPresentation, calendarDateLabel } from '../presentation';
import type { CalendarItem, TaskCalendarItem } from '../types';

type AgendaActions = { onOpen: (item: CalendarItem) => void; onToggleTask: (item: TaskCalendarItem) => void };

export function CalendarAgendaHeading({ date, today }: { date: string; today?: string }) {
  return <View style={styles.heading}><UiText type="editorSection" accessibilityRole="header">{calendarDateLabel(date)}</UiText>
    {date === today && <UiText type="metadata" color="textSecondary">Today</UiText>}</View>;
}

/** Identity opens the source; Task completion remains a separate, genuine checkbox action. */
export function CalendarAgendaCard({ item, onOpen, onToggleTask }: { item: CalendarItem } & AgendaActions) {
  const colors = useCalendarColors(); const { fontScale } = useWindowDimensions();
  const display = calendarAgendaPresentation(item);
  const attention = display.state === 'Overdue' || display.state === 'Payment overdue' || display.state === 'Missed';
  const stateColor = attention ? colors.attention : item.source === 'task' && item.completed ? colors.accent : colors.textSecondary;
  return <GroupSurface compact testID={`calendar-agenda-${item.id}`} style={[styles.row, { borderColor: colors.border }, fontScale >= 1.5 && { flexDirection: 'column' }]}>
    {item.source === 'task' ? <UiPressable accessibilityRole="checkbox" accessibilityState={{ checked: item.completed }} aria-checked={item.completed}
      accessibilityLabel={`${item.completed ? 'Reopen' : 'Complete'} ${item.title} on ${item.date}`} onPress={() => onToggleTask(item)} style={styles.completion}>
      <View style={[styles.checkbox, { borderColor: item.completed ? colors.accent : colors.borderStrong, backgroundColor: item.completed ? colors.accentMuted : 'transparent' }]}>
        {item.completed && <UiIcon name="check" color={colors.accent} size={18} />}
      </View>
    </UiPressable> : <View style={[styles.sourceIcon, { backgroundColor: colors.control }]}>
      <UiIcon name={item.source === 'commitment' ? 'calendar' : 'briefcase'} color={colors.textSecondary} size={22} />
    </View>}
    <UiPressable accessible accessibilityRole="button" accessibilityLabel={['Open ' + item.title, display.time, display.amount, display.state, display.context].filter(Boolean).join(', ')}
      accessibilityHint="Opens the owning feature" onPress={() => onOpen(item)} style={[styles.details, fontScale >= 1.5 && { flexGrow: 0, flexShrink: 0, width: '100%' }]}>
      {!!display.time && <UiText type="metadata" color="textSecondary" style={styles.time}>{display.time}</UiText>}
      <UiText type="cardTitle" style={item.source === 'task' && item.completed ? styles.completed : undefined}>{item.title}</UiText>
      {!!display.amount && <UiText type="body">{display.amount}</UiText>}
      {!!display.state && display.state !== 'Expected payment' && <View style={[styles.status, { backgroundColor: attention ? colors.attentionSoft : colors.control }]}>
        <UiText type="smallLabel" style={{ color: stateColor }}>{display.state}</UiText>
      </View>}
      <UiText type="metadata" color="textSecondary">{display.context}</UiText>
    </UiPressable>
  </GroupSurface>;
}

/** One vertical scroll owner. The month/grid lives in the header, all day rows remain reachable. */
export function DayAgenda({ date, today, items, onOpen, onToggleTask, header, loaded = true }: {
  date: string; today?: string; items: CalendarItem[]; header?: ReactNode; loaded?: boolean;
} & AgendaActions) {
  const { width } = useWindowDimensions();
  const rows = useMemo(() => dayAgenda(items, date).flatMap(section => section.data), [items, date]);
  return <FlatList testID="calendar-day-list" style={styles.list} data={rows} keyExtractor={item => item.id}
    initialNumToRender={8} maxToRenderPerBatch={8} windowSize={5} removeClippedSubviews={false} contentInsetAdjustmentBehavior="never"
    contentContainerStyle={[styles.content, width < 360 && { paddingHorizontal: Space.xs }]}
    ListHeaderComponent={<View style={styles.header}>{header}{loaded && <CalendarAgendaHeading date={date} today={today} />}</View>}
    ListEmptyComponent={loaded ? <GroupSurface><UiText type="secondary" color="textSecondary">Nothing scheduled</UiText></GroupSurface> : undefined}
    renderItem={({ item }) => <CalendarAgendaCard item={item} onOpen={onOpen} onToggleTask={onToggleTask} />}
    ItemSeparatorComponent={() => <View style={{ height: Space.sm }} />} />;
}

const styles = StyleSheet.create({
  list: { flex: 1 }, content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: Space.lg, paddingBottom: Space.xxl, flexGrow: 1 },
  header: { gap: Space.lg }, heading: { gap: Space.xs, paddingTop: Space.sm, paddingBottom: Space.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm, padding: Space.md, borderWidth: 1 },
  details: { flexGrow: 1, flexShrink: 1, flexBasis: 'auto', minWidth: 0, minHeight: TouchTarget, gap: Space.xs },
  completion: { width: TouchTarget, minHeight: TouchTarget, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 26, height: 26, borderRadius: Shape.inset, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sourceIcon: { width: TouchTarget, height: TouchTarget, borderRadius: Shape.control, alignItems: 'center', justifyContent: 'center' },
  status: { alignSelf: 'flex-start', maxWidth: '100%', borderRadius: Shape.status, paddingHorizontal: Space.sm, paddingVertical: Space.xs },
  time: { fontVariant: ['tabular-nums'] }, completed: { textDecorationLine: 'line-through' },
});

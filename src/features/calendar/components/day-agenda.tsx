import { Pressable, StyleSheet, View } from 'react-native';

import { StatusText } from '@/components/status-text';
import { ThemedText } from '@/components/themed-text';
import { ControlSize, Radius, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { dayAgenda } from '../projection';
import { calendarAgendaPresentation, calendarDateLabel } from '../presentation';
import type { CalendarItem, TaskCalendarItem } from '../types';

export function DayAgenda({ date, today, items, onOpen, onToggleTask }: {
  date: string; today?: string; items: CalendarItem[]; onOpen: (item: CalendarItem) => void; onToggleTask: (item: TaskCalendarItem) => void;
}) {
  const colors = useTheme();
  const rows = dayAgenda(items, date).flatMap((section) => section.data);
  return <View style={[styles.agenda, { borderColor: colors.border }]}>
    <View style={styles.heading}>
      <ThemedText type="sectionHeading" accessibilityRole="header">{calendarDateLabel(date)}</ThemedText>
      {date === today && <ThemedText type="metadata" themeColor="textSecondary">Today</ThemedText>}
    </View>
    {!rows.length && <ThemedText type="secondary" themeColor="textSecondary">Nothing scheduled</ThemedText>}
    {rows.map((item) => {
      const display = calendarAgendaPresentation(item);
      return <View key={item.id} testID={`calendar-agenda-${item.id}`} style={[styles.row, { borderColor: colors.border }]}>
        {item.source === 'task' && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: item.completed }} aria-checked={item.completed}
          accessibilityLabel={`${item.completed ? 'Reopen' : 'Complete'} ${item.title} on ${date}`} onPress={() => onToggleTask(item)} style={styles.completion}>
          <View style={[styles.checkbox, { borderColor: colors.borderStrong, backgroundColor: item.completed ? colors.accentMuted : 'transparent' }]}>
            <ThemedText type="button" themeColor="accent">{item.completed ? '✓' : ''}</ThemedText>
          </View>
        </Pressable>}
        <Pressable accessible accessibilityRole="button" accessibilityLabel={['Open ' + item.title, display.time, display.amount, display.state, display.context].filter(Boolean).join(', ')}
          accessibilityHint="Opens the owning feature" onPress={() => onOpen(item)} style={({ pressed }) => [styles.details, pressed && { backgroundColor: colors.surfaceMuted }]}>
          {!!display.time && <ThemedText type="cardTitle" themeColor="textSecondary" style={styles.time}>{display.time}</ThemedText>}
          <ThemedText type="cardTitle" style={item.source === 'task' && item.completed ? styles.completed : undefined}>{item.title}</ThemedText>
          {!!display.amount && <ThemedText type="body">{display.amount}</ThemedText>}
          {item.source === 'commitment' ? <StatusText type="metadata" tone={display.state === 'Overdue' ? 'attention' : 'neutral'}>{[display.state, display.context].filter(Boolean).join(' · ')}</StatusText> : <>
            {!!display.state && display.state !== 'Expected payment' && <StatusText type="metadata" tone={display.state === 'Payment overdue' || display.state === 'Missed' ? 'attention' : 'neutral'}>{display.state}</StatusText>}
            <ThemedText type="metadata" themeColor="textMuted">{display.context}</ThemedText>
          </>}
        </Pressable>
      </View>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  agenda: { gap: Space.sm, borderTopWidth: 1, paddingTop: Space.xl }, heading: { gap: Space.xs, paddingBottom: Space.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm, paddingVertical: Space.md, borderBottomWidth: 1 },
  details: { flex: 1, minWidth: 0, minHeight: ControlSize.touch, gap: Space.xs },
  completion: { minWidth: ControlSize.touch, minHeight: ControlSize.touch, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: ControlSize.indicator, minHeight: ControlSize.indicator, borderRadius: Radius.small, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  time: { fontVariant: ['tabular-nums'] }, completed: { textDecorationLine: 'line-through' },
});

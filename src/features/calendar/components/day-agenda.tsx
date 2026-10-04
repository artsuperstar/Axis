import { Pressable, StyleSheet, View } from 'react-native';

import { FormButton } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { pickerValue } from '@/utils/calendar';

import { dayAgenda } from '../projection';
import type { CalendarItem, TaskCalendarItem } from '../types';

export function DayAgenda({ date, items, onOpen, onToggleTask }: {
  date: string; items: CalendarItem[]; onOpen: (item: CalendarItem) => void; onToggleTask: (item: TaskCalendarItem) => void;
}) {
  const colors = useTheme();
  const sections = dayAgenda(items, date);
  return <View style={styles.agenda}>
    <ThemedText type="smallBold" accessibilityRole="header">{pickerValue(date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</ThemedText>
    {!sections.length && <ThemedText themeColor="textSecondary">Nothing scheduled for this day.</ThemedText>}
    {sections.map((section) => <View key={section.title} style={styles.section}>
      <ThemedText type="smallBold" accessibilityRole="header">{section.title}</ThemedText>
      {section.data.map((item) => <View key={item.id} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.title}, ${item.status}, ${item.secondary}`} onPress={() => onOpen(item)} style={styles.details}>
          <ThemedText style={item.source === 'task' && item.completed ? styles.completed : undefined}>{item.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{item.secondary}</ThemedText>
          <ThemedText type="smallBold">{item.status}</ThemedText>
        </Pressable>
        {item.source === 'task' && <FormButton label={item.completed ? 'Reopen' : 'Complete'} accessibilityLabel={`${item.completed ? 'Reopen' : 'Complete'} ${item.title} on ${date}`}
          onPress={() => onToggleTask(item)} />}
      </View>)}
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  agenda: { gap: Spacing.three }, section: { gap: Spacing.two },
  card: { padding: Spacing.three, borderRadius: Spacing.two, gap: Spacing.two, alignItems: 'flex-start' },
  details: { alignSelf: 'stretch', minHeight: 44, gap: Spacing.one }, completed: { textDecorationLine: 'line-through' },
});

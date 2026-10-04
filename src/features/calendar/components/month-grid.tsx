import { Pressable, StyleSheet, View } from 'react-native';

import { FormButton } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dateLabel, pickerValue } from '@/utils/calendar';

import { monthDates } from '../model';
import { calendarMarkerPresentation, markerAccessibilitySummary, type CalendarMarker } from '../markers';
import type { CalendarSelection } from '../types';

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export function MonthGrid({ selection, today, markers, onDate, onMove, onToday }: {
  selection: CalendarSelection; today: string; markers: ReadonlyMap<string, readonly CalendarMarker[]>; onDate: (date: string) => void;
  onMove: (direction: -1 | 1) => void; onToday: () => void;
}) {
  const colors = useTheme();
  const dates = monthDates(selection.month);
  const weeks = Array.from({ length: Math.ceil(dates.length / 7) }, (_, index) => dates.slice(index * 7, index * 7 + 7));
  return <View style={styles.grid}>
    <View style={styles.navigation}>
      <FormButton label="‹" accessibilityLabel="Previous month" disabled={selection.month === '0001-01-01'} onPress={() => onMove(-1)} />
      <ThemedText type="smallBold" accessibilityRole="header" style={styles.month}>{pickerValue(selection.month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</ThemedText>
      <FormButton label="›" accessibilityLabel="Next month" disabled={selection.month === '9999-12-01'} onPress={() => onMove(1)} />
      <FormButton label="Today" onPress={onToday} />
    </View>
    <View style={styles.week}>
      {weekdays.map((day) => <View key={day} style={styles.cell}><ThemedText type="small" accessibilityLabel={day}>{day.slice(0, 3)}</ThemedText></View>)}
    </View>
    {weeks.map((week) => <View key={week[0]} style={styles.week}>
      {week.map((date) => {
        const selected = date === selection.selected; const isToday = date === today;
        const dayMarkers = markers.get(date) ?? []; const adjacent = date.slice(0, 7) !== selection.month.slice(0, 7);
        return <Pressable key={date} testID={`calendar-date-${date}`} accessibilityRole="button" accessibilityState={{ selected }}
          accessibilityLabel={`${dateLabel(date)}${isToday ? ', today' : ''}${selected ? ', selected' : ''}${adjacent ? ', adjacent month' : ''}, ${markerAccessibilitySummary(dayMarkers)}`}
          onPress={() => onDate(date)}
          style={[styles.cell, styles.day, { borderColor: selected ? colors.text : colors.background,
            backgroundColor: selected ? colors.backgroundSelected : colors.background }]}>
          <ThemedText type={selected ? 'smallBold' : 'small'} themeColor={adjacent ? 'textSecondary' : 'text'}
            style={isToday ? styles.today : undefined}>{Number(date.slice(-2))}</ThemedText>
          <View testID={`calendar-markers-${date}`} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.markers}>
            {dayMarkers.map(({ type }) => <View key={type} testID={`calendar-marker-${date}-${type}`}
              style={[styles.marker, { backgroundColor: colors[calendarMarkerPresentation[type].color] }]} />)}
          </View>
        </Pressable>;
      })}
    </View>)}
    <ThemedText type="small" themeColor="textSecondary">Underlined: today · Outlined: selected</ThemedText>
  </View>;
}

const styles = StyleSheet.create({
  grid: { gap: Spacing.one }, navigation: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two },
  month: { flex: 1, minWidth: 100 }, week: { flexDirection: 'row' },
  cell: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  day: { minHeight: 64, paddingVertical: Spacing.two, borderWidth: 2, borderRadius: Spacing.two },
  markers: { height: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.one },
  marker: { width: 6, height: 6, borderRadius: 3 },
  today: { textDecorationLine: 'underline' },
});

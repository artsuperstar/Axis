import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { FormButton } from '@/components/form-controls';
import { focusFormControl } from '@/components/form-selection-host';
import { ThemedText } from '@/components/themed-text';
import { ControlSize, Radius, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { pickerValue } from '@/utils/calendar';

import { jumpToMonth, monthDates } from '../model';
import { calendarMarkerOrder, calendarMarkerPresentation, markerAccessibilitySummary, type CalendarMarker } from '../markers';
import { calendarDateLabel, calendarWeekdays } from '../presentation';
import type { CalendarSelection } from '../types';
import { MonthChooser } from './month-chooser';

export function MonthGrid({ selection, today, markers, onDate, onMove, onToday }: {
  selection: CalendarSelection; today: string; markers: ReadonlyMap<string, readonly CalendarMarker[]>; onDate: (date: string) => void;
  onMove: (direction: -1 | 1) => void; onToday: () => void;
}) {
  const colors = useTheme();
  const trigger = useRef<View>(null);
  const restoreFocus = useRef(false);
  const [picker, setPicker] = useState<{ month: string; visible: boolean } | null>(null);
  const monthLabel = pickerValue(selection.month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  useEffect(() => {
    if (!picker && restoreFocus.current) { restoreFocus.current = false; focusFormControl(trigger.current); }
  }, [picker]);
  useFocusEffect(useCallback(() => () => { restoreFocus.current = false; setPicker(null); }, []));
  function closePicker() {
    restoreFocus.current = true;
    // iOS restores focus after native dismissal; Android/web can unmount the closed modal directly.
    setPicker((current) => current && Platform.OS === 'ios' ? { ...current, visible: false } : null);
  }
  const { width, fontScale } = useWindowDimensions();
  const narrowWeekdays = (Math.min(width, 640) - Space.lg * 2) / (7 * Math.max(1, fontScale)) < 24;
  const dates = monthDates(selection.month);
  const weeks = Array.from({ length: Math.ceil(dates.length / 7) }, (_, index) => dates.slice(index * 7, index * 7 + 7));
  return <View style={styles.grid}>
    <View style={styles.navigation}>
      <FormButton variant="quiet" label="‹" accessibilityLabel="Previous month" disabled={selection.month === '0001-01-01'} onPress={() => onMove(-1)} />
      <Pressable ref={trigger} testID="calendar-month-trigger" accessible accessibilityRole="button" accessibilityLabel={`${monthLabel}, choose month and year`}
        accessibilityState={{ expanded: !!picker?.visible }} aria-expanded={!!picker?.visible}
        onPress={() => setPicker({ month: selection.month, visible: true })}
        style={({ pressed }) => [styles.monthTrigger, pressed && { backgroundColor: colors.surfaceMuted }]}>
        <ThemedText type="sectionHeading" accessibilityRole="header" style={styles.month}>{monthLabel}</ThemedText>
        <ThemedText type="metadata" themeColor="textSecondary">⌄</ThemedText>
      </Pressable>
      <FormButton variant="quiet" label="›" accessibilityLabel="Next month" disabled={selection.month === '9999-12-01'} onPress={() => onMove(1)} />
    </View>
    <View style={styles.todayAction}><FormButton variant="quiet" label="Today" onPress={onToday} /></View>
    <View style={styles.week}>
      {calendarWeekdays().map((day) => <View key={day.full} style={styles.cell}><ThemedText type="metadata" themeColor="textSecondary" accessibilityLabel={day.full} style={styles.weekday}>{(narrowWeekdays ? day.narrow : day.short).toLocaleUpperCase()}</ThemedText></View>)}
    </View>
    {weeks.map((week) => <View key={week[0]} style={styles.week}>
      {week.map((date) => {
        const selected = date === selection.selected; const isToday = date === today;
        const dayMarkers = markers.get(date) ?? []; const adjacent = date.slice(0, 7) !== selection.month.slice(0, 7);
        return <Pressable key={date} testID={`calendar-date-${date}`} accessible accessibilityRole="button" accessibilityState={{ selected }}
          accessibilityLabel={`${calendarDateLabel(date)}${isToday ? ', today' : ''}${selected ? ', selected' : ''}${adjacent ? ', adjacent month' : ''}, ${markerAccessibilitySummary(dayMarkers)}`}
          onPress={() => onDate(date)}
          style={({ pressed }) => [styles.cell, styles.day, { borderColor: selected || isToday ? colors.accent : 'transparent',
            backgroundColor: selected ? colors.accentMuted : pressed ? colors.surfaceMuted : colors.background }]}>
          <ThemedText type={selected ? 'button' : 'metadata'} themeColor={selected || isToday ? 'accent' : adjacent ? 'textMuted' : 'textPrimary'}
            style={[styles.date, isToday && styles.today]}>{Number(date.slice(-2))}</ThemedText>
          <View testID={`calendar-markers-${date}`} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.markers}>
            {dayMarkers.map(({ type }) => <View key={type} testID={`calendar-marker-${date}-${type}`}
              style={[styles.marker, { backgroundColor: colors[calendarMarkerPresentation[type].color] }]} />)}
          </View>
        </Pressable>;
      })}
    </View>)}
    <CalendarLegend />
    {picker && <MonthChooser month={picker.month} visible={picker.visible} onDismiss={closePicker} onClosed={() => setPicker(null)}
      onSelect={(year, month) => { const next = jumpToMonth(selection, year, month); closePicker(); onDate(next.selected); }} />}
  </View>;
}

export function CalendarLegend() {
  const colors = useTheme();
  return <View testID="calendar-legend" style={styles.legend}>
    {calendarMarkerOrder.map((type) => <View key={type} accessible accessibilityLabel={`${calendarMarkerPresentation[type].label} marker`} style={styles.legendItem}>
      <View testID={`calendar-legend-marker-${type}`} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={[styles.marker, { backgroundColor: colors[calendarMarkerPresentation[type].color] }]} />
      <ThemedText type="metadata" themeColor="textSecondary">{calendarMarkerPresentation[type].label}</ThemedText>
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  grid: { gap: Space.xs }, navigation: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  month: { flex: 1, minWidth: 0, textAlign: 'center' }, todayAction: { alignSelf: 'flex-end' }, week: { flexDirection: 'row' },
  monthTrigger: { flex: 1, minWidth: 0, minHeight: ControlSize.touch, borderRadius: Radius.control, flexDirection: 'row', alignItems: 'center', gap: Space.xs },
  weekday: { textAlign: 'center' }, date: { textAlign: 'center', fontVariant: ['tabular-nums'] },
  cell: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  day: { minHeight: ControlSize.touch, paddingVertical: Space.xs, borderWidth: 2, borderRadius: Radius.control, gap: Space.xs },
  markers: { height: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Space.xs },
  marker: { width: 6, height: 6, borderRadius: 3 },
  today: { textDecorationLine: 'underline' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.md, paddingTop: Space.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Space.xs },
});

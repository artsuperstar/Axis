import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

import { FormButton } from '@/components/form-controls';
import { focusFormControl } from '@/components/form-selection-host';
import { GroupSurface, UiIcon, UiPressable, UiText } from '@/components/design-system';
import { DesignSpace as Space, Shape, TouchTarget } from '@/constants/design-system-v2';
import { pickerValue } from '@/utils/calendar';

import { jumpToMonth, monthDates } from '../model';
import { calendarMarkerOrder, calendarMarkerPresentation, markerAccessibilitySummary, type CalendarMarker } from '../markers';
import { calendarDateLabel, calendarWeekdays } from '../presentation';
import type { CalendarSelection } from '../types';
import { MonthChooser } from './month-chooser';
import { useCalendarColors } from '../appearance';

export function MonthGrid({ selection, today, markers, onDate, onMove, onToday }: {
  selection: CalendarSelection; today: string; markers: ReadonlyMap<string, readonly CalendarMarker[]>; onDate: (date: string) => void;
  onMove: (direction: -1 | 1) => void; onToday: () => void;
}) {
  const colors = useCalendarColors();
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
  const stacked = width < 390 || fontScale >= 1.3;
  const previous = <FormButton appearance="v2" variant="quiet" label="Previous month" icon="back" accessibilityLabel="Previous month" disabled={selection.month === '0001-01-01'} onPress={() => onMove(-1)} />;
  const next = <FormButton appearance="v2" variant="quiet" label="Next month" icon="forward" accessibilityLabel="Next month" disabled={selection.month === '9999-12-01'} onPress={() => onMove(1)} />;
  const dates = monthDates(selection.month);
  const weeks = Array.from({ length: Math.ceil(dates.length / 7) }, (_, index) => dates.slice(index * 7, index * 7 + 7));
  return <View style={styles.grid}>
    <View style={[styles.controls, stacked && { flexDirection: 'column' }]}>
    <GroupSurface compact testID="calendar-month-navigation" style={[styles.navigation, { borderColor: colors.border }, stacked && { flexGrow: 0, flexShrink: 0 }, fontScale >= 1.5 && { flexDirection: 'column' }]}>
      {fontScale < 1.5 && previous}
      <UiPressable ref={trigger} testID="calendar-month-trigger" accessible accessibilityRole="button" accessibilityLabel={`${monthLabel}, choose month and year`}
        accessibilityState={{ expanded: !!picker?.visible }} aria-expanded={!!picker?.visible}
        onPress={() => setPicker({ month: selection.month, visible: true })}
        style={({ pressed }) => [styles.monthTrigger, fontScale >= 1.5 && { flexGrow: 0, flexShrink: 0, width: '100%' }, pressed && { backgroundColor: colors.control }]}>
        <UiText type="editorSection" accessibilityRole="header" style={styles.month}>{monthLabel}</UiText>
        <UiIcon name="chevron" color={colors.textSecondary} size={18} />
      </UiPressable>
      {fontScale < 1.5 ? next : <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between' }}>{previous}{next}</View>}
    </GroupSurface>
    <View style={stacked ? undefined : styles.todayAction}><FormButton appearance="v2" variant="secondary" label="Today" onPress={onToday} /></View>
    </View>
    <GroupSurface compact testID="calendar-month-surface" style={[styles.surface, { borderColor: colors.border }, width < 360 && { paddingHorizontal: 0 }]}>
    <View style={styles.week}>
      {calendarWeekdays().map((day) => <View key={day.full} style={styles.cell}><UiText type="smallLabel" color="textSecondary" accessibilityLabel={day.full} style={styles.weekday}>{(narrowWeekdays ? day.narrow : day.short).toLocaleUpperCase()}</UiText></View>)}
    </View>
    {weeks.map((week) => <View key={week[0]} style={styles.week}>
      {week.map((date) => {
        const selected = date === selection.selected; const isToday = date === today;
        const dayMarkers = markers.get(date) ?? []; const adjacent = date.slice(0, 7) !== selection.month.slice(0, 7);
        return <UiPressable key={date} testID={`calendar-date-${date}`} accessible accessibilityRole="button" accessibilityState={{ selected }}
          accessibilityLabel={`${calendarDateLabel(date)}${isToday ? ', today' : ''}${selected ? ', selected' : ''}${adjacent ? ', adjacent month' : ''}, ${markerAccessibilitySummary(dayMarkers)}`}
          onPress={() => onDate(date)}
          style={({ pressed }) => [styles.cell, styles.day, { borderColor: selected || isToday ? colors.accent : 'transparent',
            backgroundColor: selected ? colors.accentMuted : pressed ? colors.control : colors.group }]}>
          <UiText type={selected ? 'button' : 'metadata'} color={adjacent ? 'textMuted' : 'textPrimary'}
            style={[styles.date, (selected || isToday) && { color: colors.accent }, isToday && styles.today]}>{Number(date.slice(-2))}</UiText>
          <View testID={`calendar-markers-${date}`} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.markers}>
            {dayMarkers.map(({ type }) => <View key={type} testID={`calendar-marker-${date}-${type}`}
              style={[styles.marker, { backgroundColor: colors[calendarMarkerPresentation[type].color] }]} />)}
          </View>
        </UiPressable>;
      })}
    </View>)}
    <CalendarLegend />
    </GroupSurface>
    {picker && <MonthChooser month={picker.month} visible={picker.visible} onDismiss={closePicker} onClosed={() => setPicker(null)}
      onSelect={(year, month) => { const next = jumpToMonth(selection, year, month); closePicker(); onDate(next.selected); }} />}
  </View>;
}

export function CalendarLegend() {
  const colors = useCalendarColors();
  return <View testID="calendar-legend" style={styles.legend}>
    {calendarMarkerOrder.map((type) => <View key={type} accessible accessibilityLabel={`${calendarMarkerPresentation[type].label} marker`} style={styles.legendItem}>
      <View testID={`calendar-legend-marker-${type}`} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={[styles.marker, { backgroundColor: colors[calendarMarkerPresentation[type].color] }]} />
      <UiText type="secondary" color="textSecondary">{calendarMarkerPresentation[type].label}</UiText>
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  grid: { gap: Space.sm }, controls: { flexDirection: 'row', gap: Space.sm }, navigation: { flexGrow: 1, flexShrink: 1, flexBasis: 'auto', flexDirection: 'row', alignItems: 'center', gap: Space.xs, padding: Space.xs, borderWidth: 1 },
  surface: { paddingHorizontal: Space.sm, paddingVertical: Space.md, gap: Space.xs, borderWidth: 1 },
  month: { flex: 1, minWidth: 0, textAlign: 'center' }, todayAction: { justifyContent: 'center' }, week: { flexDirection: 'row' },
  monthTrigger: { flexGrow: 1, flexShrink: 1, flexBasis: 'auto', minWidth: 0, minHeight: TouchTarget, borderRadius: Shape.control, flexDirection: 'row', alignItems: 'center', gap: Space.xs },
  weekday: { textAlign: 'center' }, date: { textAlign: 'center', fontVariant: ['tabular-nums'] },
  cell: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  day: { minHeight: TouchTarget, paddingVertical: Space.sm, borderWidth: 2, borderRadius: Shape.control, gap: Space.xs },
  markers: { height: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Space.xs },
  marker: { width: 6, height: 6, borderRadius: 3 },
  today: { textDecorationLine: 'underline' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.md, paddingTop: Space.md, paddingHorizontal: Space.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Space.xs },
});

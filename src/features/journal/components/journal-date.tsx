import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

import { AdaptiveSheet } from '@/components/adaptive-sheet';
import { FormButton, FormError, FormField, FormSelect } from '@/components/form-controls';
import { UiIcon, UiPressable, UiText } from '@/components/design-system';
import { DesignSpace as Space, TouchTarget } from '@/constants/design-system-v2';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { dateLabel, localDateString, pickerValue } from '@/utils/calendar';

import { journalError, validateJournalDate } from '../form';
import { journalFullDate } from '../presentation';
import { JournalGroup, useJournalColors } from './journal-surface';

export function JournalDayNavigation({ date, today, onPrevious, onNext, onToday, onDate }: {
  date: string; today: string; onPrevious: () => void; onNext: () => void; onToday: () => void; onDate: () => void;
}) {
  const colors = useJournalColors();
  const { width, fontScale } = useWindowDimensions();
  return <JournalGroup>
    <UiPressable accessibilityRole="button" accessibilityLabel={journalFullDate(date)} accessibilityHint="Choose a journal date, today or earlier."
      onPress={onDate} style={styles.heading}>
      <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}><UiIcon name="calendar" color={colors.accent} size={24} /></View>
      <UiText type="cardTitle" accessibilityRole="header" style={{ flex: 1, minWidth: 0 }}>{journalFullDate(date)}</UiText>
    </UiPressable>
    <View style={[styles.actions, (width < 360 || fontScale >= 1.3) && { flexDirection: 'column' }]}>
      <View style={styles.action}><FormButton appearance="v2" variant="secondary" leadingIcon="back" label="Previous" accessibilityLabel="Previous day" disabled={date === '0001-01-01'} onPress={onPrevious} /></View>
      <View style={styles.action}><FormButton appearance="v2" variant="secondary" trailingIcon="forward" label="Next" accessibilityLabel="Next day" disabled={date >= today} onPress={onNext} /></View>
    </View>
    {date !== today && <FormButton appearance="v2" variant="quiet" label="Today" onPress={onToday} />}
  </JournalGroup>;
}

export function JournalDate({ date, today, onSelect, onDismiss }: { date: string; today: string; onSelect: (date: string) => void; onDismiss: () => void }) {
  const [selected, setSelected] = useState(date);
  const [error, setError] = useState<string | null>(null);
  const scheme = useColorScheme();
  function confirm() {
    try { validateJournalDate(selected); onSelect(selected); }
    catch (cause) { setError(journalError(cause, 'Unable to choose this date.')); }
  }
  return <AdaptiveSheet appearance="v2" title="Choose journal date" action="Choose" onConfirm={confirm} onDismiss={onDismiss}>
    <FormError appearance="v2" message={error} />
    {Platform.OS === 'android' ? <FormSelect appearance="v2" label="Date" value={dateLabel(selected)} onPress={() => DateTimePickerAndroid.open({
      value: pickerValue(selected), mode: 'date', maximumDate: pickerValue(today), minimumDate: pickerValue('0001-01-01'),
      onValueChange: (_event, value) => setSelected(localDateString(value)),
    })} /> : Platform.OS === 'web' ? <FormField appearance="v2" label="Date" value={selected} placeholder="YYYY-MM-DD" onChangeText={setSelected} />
      : <DateTimePicker accessibilityLabel="Journal date, today or earlier" value={pickerValue(selected)} mode="date"
        display={Platform.OS === 'ios' ? 'spinner' : 'default'} maximumDate={pickerValue(today)} minimumDate={pickerValue('0001-01-01')}
        themeVariant={scheme === 'dark' ? 'dark' : 'light'} onValueChange={(_event, value) => setSelected(localDateString(value))} />}
  </AdaptiveSheet>;
}
const styles = StyleSheet.create({ heading: { minHeight: TouchTarget, flexDirection: 'row', alignItems: 'center', gap: Space.md },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: Space.sm }, action: { flex: 1 } });

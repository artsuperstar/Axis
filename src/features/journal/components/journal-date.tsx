import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform } from 'react-native';

import { AdaptiveSheet } from '@/components/adaptive-sheet';
import { FormError, FormField, FormSelect } from '@/components/form-controls';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { dateLabel, localDateString, pickerValue } from '@/utils/calendar';

import { journalError, validateJournalDate } from '../form';

export function JournalDate({ date, today, onSelect, onDismiss }: { date: string; today: string; onSelect: (date: string) => void; onDismiss: () => void }) {
  const [selected, setSelected] = useState(date);
  const [error, setError] = useState<string | null>(null);
  const scheme = useColorScheme();
  function confirm() {
    try { validateJournalDate(selected); onSelect(selected); }
    catch (cause) { setError(journalError(cause, 'Unable to choose this date.')); }
  }
  return <AdaptiveSheet title="Choose journal date" action="Choose" onConfirm={confirm} onDismiss={onDismiss}>
    <FormError message={error} />
    {Platform.OS === 'android' ? <FormSelect label="Date" value={dateLabel(selected)} onPress={() => DateTimePickerAndroid.open({
      value: pickerValue(selected), mode: 'date', maximumDate: pickerValue(today), minimumDate: pickerValue('0001-01-01'),
      onValueChange: (_event, value) => setSelected(localDateString(value)),
    })} /> : Platform.OS === 'web' ? <FormField label="Date" value={selected} placeholder="YYYY-MM-DD" onChangeText={setSelected} />
      : <DateTimePicker accessibilityLabel="Journal date, today or earlier" value={pickerValue(selected)} mode="date"
        display={Platform.OS === 'ios' ? 'spinner' : 'default'} maximumDate={pickerValue(today)} minimumDate={pickerValue('0001-01-01')}
        themeVariant={scheme === 'dark' ? 'dark' : 'light'} onValueChange={(_event, value) => setSelected(localDateString(value))} />}
  </AdaptiveSheet>;
}

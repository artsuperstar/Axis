import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { AdaptiveModal, AdaptiveSheet } from '@/components/adaptive-sheet';
import { FormButton } from '@/components/form-controls';
import { UiText } from '@/components/design-system';
import { Space } from '@/constants/theme';
import { pickerValue } from '@/utils/calendar';

export function MonthChooser({ month, visible, onSelect, onDismiss, onClosed }: {
  month: string; visible: boolean; onSelect: (year: number, month: number) => void; onDismiss: () => void; onClosed: () => void;
}) {
  const [year, setYear] = useState(() => Number(month.slice(0, 4)));
  const { width, fontScale } = useWindowDimensions();
  const columns = (Math.min(width, 640) - Space.lg * 2) / Math.max(1, fontScale) >= 240 ? 3 : 2;
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = `${String(year).padStart(4, '0')}-${String(index + 1).padStart(2, '0')}-01`;
    return { number: index + 1, selected: date === month,
      label: pickerValue(date).toLocaleDateString(undefined, { month: 'short' }),
      name: pickerValue(date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) };
  });
  return <AdaptiveModal visible={visible} onDismiss={onDismiss} onClosed={onClosed}>
    <AdaptiveSheet appearance="v2" title="Choose month" onDismiss={onDismiss} contentContainerStyle={styles.content}>
      <View style={styles.yearNavigation}>
        <FormButton appearance="v2" variant="quiet" label="Previous year" icon="back" accessibilityLabel="Previous year" disabled={year === 1} onPress={() => setYear((current) => Math.max(1, current - 1))} />
        <UiText type="editorSection" accessibilityRole="header" style={styles.year}>{String(year).padStart(4, '0')}</UiText>
        <FormButton appearance="v2" variant="quiet" label="Next year" icon="forward" accessibilityLabel="Next year" disabled={year === 9999} onPress={() => setYear((current) => Math.min(9999, current + 1))} />
      </View>
      <View testID="calendar-month-options" style={styles.months}>
        {Array.from({ length: Math.ceil(12 / columns) }, (_, row) => <View key={row} style={styles.monthRow}>
          {months.slice(row * columns, row * columns + columns).map((option) => <View key={option.number} style={styles.month}>
            <FormButton appearance="v2" variant="navigation" label={option.label} accessibilityLabel={`${option.name}${option.selected ? ', selected' : ''}`} selected={option.selected}
              onPress={() => onSelect(year, option.number)} />
          </View>)}
        </View>)}
      </View>
    </AdaptiveSheet>
  </AdaptiveModal>;
}

const styles = StyleSheet.create({
  content: { padding: Space.lg, gap: Space.lg },
  yearNavigation: { flexDirection: 'row', alignItems: 'center', gap: Space.sm }, year: { flex: 1, minWidth: 0, textAlign: 'center', fontVariant: ['tabular-nums'] },
  months: { gap: Space.sm }, monthRow: { flexDirection: 'row', gap: Space.sm }, month: { flex: 1, minWidth: 0 },
});

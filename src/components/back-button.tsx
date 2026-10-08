import { StyleSheet, View } from 'react-native';

import { Space } from '@/constants/theme';

import { FormButton } from './form-controls';
import { ThemedText } from './themed-text';

/** Same quiet, touch-friendly arrow as the Tasks/Work headers; callers own its return semantics. */
export function BackButton({ onPress, accessibilityLabel = 'Back' }: { onPress: () => void; accessibilityLabel?: string }) {
  return <FormButton variant="quiet" label="←" accessibilityLabel={accessibilityLabel} onPress={onPress} />;
}

/** Axis owns this header, while the native picker and its value callback remain unchanged. */
export function PickerBackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const name = title.replace(/\s*\*$/, '');
  return <View style={styles.header}>
    <BackButton accessibilityLabel={`Back from ${name.toLowerCase()} picker`} onPress={onBack} />
    <ThemedText type="cardTitle" accessibilityRole="header" style={styles.title}>{name}</ThemedText>
  </View>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Space.sm }, title: { flex: 1, minWidth: 0 },
});

import { StyleSheet, View } from 'react-native';

import { Space } from '@/constants/theme';

import { FormButton } from './form-controls';
import { ThemedText } from './themed-text';
import { UiText } from './design-system';

/** Same quiet, touch-friendly arrow as the Tasks/Work headers; callers own its return semantics. */
export function BackButton({ onPress, accessibilityLabel = 'Back', appearance, iconOnly = false }: { onPress: () => void; accessibilityLabel?: string; appearance?: 'v2'; iconOnly?: boolean }) {
  return <FormButton appearance={appearance} tone={appearance ? 'brand' : undefined} icon={appearance && iconOnly ? 'back' : undefined} leadingIcon={appearance && !iconOnly ? 'back' : undefined}
    variant="quiet" label={appearance ? 'Back' : '←'} accessibilityLabel={accessibilityLabel} onPress={onPress} />;
}

/** Axis owns this header, while the native picker and its value callback remain unchanged. */
export function PickerBackHeader({ title, onBack, appearance }: { title: string; onBack: () => void; appearance?: 'v2' }) {
  const name = title.replace(/\s*\*$/, '');
  return <View style={styles.header}>
    <BackButton appearance={appearance} accessibilityLabel={`Back from ${name.toLowerCase()} picker`} onPress={onBack} />
    {appearance ? <UiText type="cardTitle" accessibilityRole="header" style={styles.title}>{name}</UiText>
      : <ThemedText type="cardTitle" accessibilityRole="header" style={styles.title}>{name}</ThemedText>}
  </View>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Space.sm }, title: { flex: 1, minWidth: 0 },
});

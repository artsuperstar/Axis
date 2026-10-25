import { StyleSheet } from 'react-native';

import { Space } from '@/constants/theme';
import { UiIcon, UiPressable, useDesignColors } from './design-system';

export const floatingAddSize = 56;
export const floatingAddClearance = floatingAddSize + Space.lg * 2;

/** Parent applies native safe areas; the list reserves floatingAddClearance below its last row. */
export function FloatingAddButton({ label, disabled = false, onPress }: { label: string; disabled?: boolean; onPress: () => void }) {
  const colors = useDesignColors();
  return <UiPressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled}
    onPress={onPress} style={[styles.button, { backgroundColor: disabled ? colors.control : colors.brandStrong, borderColor: colors.borderStrong }]}>
    <UiIcon name="plus" color={disabled ? colors.textMuted : colors.onBrand} size={28} />
  </UiPressable>;
}

const styles = StyleSheet.create({
  button: { position: 'absolute', right: Space.lg, bottom: Space.lg, width: floatingAddSize, height: floatingAddSize,
    borderWidth: 1, borderRadius: floatingAddSize / 2, alignItems: 'center', justifyContent: 'center' },
});

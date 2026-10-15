import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { UiIcon, UiPressable, raisedSurfaceShadow, useDesignColors } from '@/components/design-system';
import { DesignSpace as Space } from '@/constants/design-system-v2';

export const taskFabSize = 52;
export const taskFabClearance = taskFabSize + Space.section * 2;

/** The parent safe area includes the native tab bar; list padding reserves the overlay's space. */
export function FloatingAddTask({ disabled, onPress }: { disabled: boolean; onPress: () => void }) {
  const colors = useDesignColors();
  const [focused, setFocused] = useState(false);
  return <UiPressable scale accessibilityRole="button" accessibilityLabel="Add task" accessibilityState={{ disabled }}
    disabled={disabled} onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={[styles.button, raisedSurfaceShadow(colors), { backgroundColor: disabled ? colors.inset : colors.brand,
      borderWidth: 2, borderColor: focused ? colors.onBrand : 'transparent' }]}>
    <UiIcon name="plus" size={22} color={disabled ? colors.textMuted : colors.onBrand} />
  </UiPressable>;
}

const styles = StyleSheet.create({
  button: { position: 'absolute', right: Space.section, bottom: Space.section, width: taskFabSize, height: taskFabSize,
    borderRadius: taskFabSize / 2, alignItems: 'center', justifyContent: 'center' },
});

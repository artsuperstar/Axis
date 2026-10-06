import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { buttonAppearance } from '@/components/control-appearance';
import { ThemedText } from '@/components/themed-text';
import { Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const taskFabSize = 56;
export const taskFabClearance = taskFabSize + Space.lg * 2;

/** The parent safe area includes the native tab bar; list padding reserves the overlay's space. */
export function FloatingAddTask({ disabled, onPress }: { disabled: boolean; onPress: () => void }) {
  const colors = useTheme();
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel="Add task" accessibilityState={{ disabled }}
    disabled={disabled} onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [buttonAppearance(colors, 'primary', { disabled, focused, pressed }).style, styles.button]}>
    <ThemedText type="metric" allowFontScaling={false} themeColor={disabled ? 'textMuted' : 'onAccent'}>＋</ThemedText>
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { position: 'absolute', right: Space.lg, bottom: Space.lg, width: taskFabSize, height: taskFabSize,
    borderRadius: taskFabSize / 2, alignItems: 'center', justifyContent: 'center' },
});

import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { buttonAppearance } from './control-appearance';
import { ThemedText } from './themed-text';

export const floatingAddSize = 56;
export const floatingAddClearance = floatingAddSize + Space.lg * 2;

/** Parent applies native safe areas; the list reserves floatingAddClearance below its last row. */
export function FloatingAddButton({ label, disabled = false, onPress }: { label: string; disabled?: boolean; onPress: () => void }) {
  const colors = useTheme();
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled}
    onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [buttonAppearance(colors, 'primary', { disabled, focused, pressed }).style, styles.button]}>
    <ThemedText type="metric" themeColor={disabled ? 'textMuted' : 'onAccent'} allowFontScaling={false}>＋</ThemedText>
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { position: 'absolute', right: Space.lg, bottom: Space.lg, width: floatingAddSize, height: floatingAddSize,
    borderRadius: floatingAddSize / 2, alignItems: 'center', justifyContent: 'center' },
});

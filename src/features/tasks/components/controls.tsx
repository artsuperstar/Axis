import type { Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function TaskButton({ label, onPress, disabled = false, selected = false, accessibilityLabel }: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
  accessibilityLabel?: string;
}) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, {
        borderColor: selected ? colors.text : colors.textSecondary,
        backgroundColor: selected ? colors.backgroundSelected : colors.backgroundElement,
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
      }]}>
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

export function TaskSelect({ label, value, onPress, disabled = false, expanded = false, accessibilityHint, ref }: {
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
  expanded?: boolean;
  accessibilityHint?: string;
  ref?: Ref<View>;
}) {
  const colors = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <Pressable
        ref={ref}
        accessible
        accessibilityRole="combobox"
        accessibilityLabel={label}
        accessibilityValue={{ text: value }}
        accessibilityState={{ disabled, expanded }}
        accessibilityHint={accessibilityHint ?? `Choose ${label.toLowerCase()}`}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [styles.select, {
          borderColor: colors.textSecondary,
          backgroundColor: colors.backgroundElement,
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        }]}>
        <ThemedText style={styles.value}>{value}</ThemedText>
        <ThemedText accessible={false} importantForAccessibility="no">▾</ThemedText>
      </Pressable>
    </View>
  );
}

export function TaskChoice({ label, selected, onPress }: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useTheme();
  return (
    <Pressable
      accessible
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.select, {
        borderColor: selected ? colors.text : colors.textSecondary,
        backgroundColor: selected ? colors.backgroundSelected : colors.backgroundElement,
        opacity: pressed ? 0.7 : 1,
      }]}>
      <ThemedText style={styles.value}>{label}</ThemedText>
      <ThemedText accessible={false} importantForAccessibility="no" style={styles.check}>{selected ? '✓' : ''}</ThemedText>
    </Pressable>
  );
}

export function TaskWeekday({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  const colors = useTheme();
  return (
    <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked }} onPress={onPress}
      style={({ pressed }) => [styles.button, { borderColor: checked ? colors.text : colors.textSecondary,
        backgroundColor: checked ? colors.backgroundSelected : colors.backgroundElement, opacity: pressed ? 0.7 : 1 }]}>
      <ThemedText type="smallBold">{label.slice(0, 3)}{checked ? ' ✓' : ''}</ThemedText>
    </Pressable>
  );
}

export function TaskField({ label, style, ...props }: TextInputProps & { label: string }) {
  const colors = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textSecondary}
        selectionColor={colors.text}
        style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.textSecondary }, style]}
        {...props}
      />
    </View>
  );
}

export function TaskError({ message }: { message: string | null }) {
  if (!message) return null;
  return <ThemedText accessibilityRole="alert" accessibilityLiveRegion="polite">{message}</ThemedText>;
}

const styles = StyleSheet.create({
  button: { minHeight: 44, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderRadius: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  field: { gap: Spacing.two },
  select: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderWidth: 1, borderRadius: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  value: { flex: 1, flexShrink: 1 },
  check: { minWidth: 24, textAlign: 'center' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, fontSize: 16 },
});

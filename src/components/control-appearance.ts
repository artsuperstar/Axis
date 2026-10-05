import type { ViewStyle } from 'react-native';

import type { ThemePalette } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'destructive' | 'navigation';

/** Pure presentation resolution, shared with deterministic contrast/state tests. */
export function buttonAppearance(colors: ThemePalette, variant: ButtonVariant, state: { disabled?: boolean; selected?: boolean; focused?: boolean; pressed?: boolean } = {}) {
  const { disabled, selected, focused, pressed } = state;
  let backgroundColor: string = colors.surface;
  let borderColor: string = colors.border;
  let textColor: string = colors.textPrimary;
  let borderWidth = 1;
  let borderBottomWidth = 1;
  if (variant === 'primary') {
    backgroundColor = colors.accent; borderColor = colors.accent; textColor = colors.onAccent;
  } else if (variant === 'quiet' || variant === 'navigation') {
    backgroundColor = 'transparent'; borderColor = 'transparent';
    if (variant === 'navigation') { borderWidth = 0; borderBottomWidth = 2; }
  } else if (variant === 'destructive') {
    textColor = colors.danger;
  }
  if (selected && variant !== 'primary' && variant !== 'destructive') {
    backgroundColor = colors.accentMuted; borderColor = colors.accent; textColor = colors.accent;
  }
  if (disabled) {
    backgroundColor = colors.surfaceMuted; borderColor = colors.border; textColor = colors.textMuted;
  } else if (focused) borderColor = variant === 'primary' ? colors.onAccent : colors.accent;
  const style: ViewStyle = { backgroundColor, borderColor, borderWidth, borderBottomWidth, opacity: pressed && !disabled ? 0.85 : 1 };
  return { style, textColor };
}

/** editable=false is readable, authoritative data; disabled is an unavailable control. */
export function fieldAppearance(colors: ThemePalette, state: { readOnly?: boolean; disabled?: boolean; focused?: boolean; expanded?: boolean; invalid?: boolean } = {}) {
  return {
    color: state.disabled ? colors.textMuted : colors.textPrimary,
    backgroundColor: state.readOnly || state.disabled ? colors.surfaceMuted : state.focused || state.expanded ? colors.surfaceRaised : colors.surface,
    borderColor: state.invalid ? colors.danger : state.focused || state.expanded ? colors.accent : state.readOnly ? colors.borderStrong : colors.border,
    opacity: 1,
  };
}

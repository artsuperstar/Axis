import type { ViewStyle } from 'react-native';

import type { ThemePalette } from '@/constants/theme';
import { Shape, TouchTarget, type DesignPalette } from '@/constants/design-system-v2';

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

/** V2 only. Invalid keeps its boundary while actual focus/open state has a separate ring. */
export function designFieldAppearance(colors: DesignPalette, state: { readOnly?: boolean; disabled?: boolean; focused?: boolean; expanded?: boolean; invalid?: boolean; pressed?: boolean } = {}) {
  const focused = !state.disabled && !!(state.focused || state.expanded);
  return {
    color: state.disabled ? colors.textDisabled : colors.textPrimary,
    backgroundColor: state.readOnly || state.disabled ? colors.inset : state.pressed ? colors.controlPressed : colors.surface,
    borderColor: state.disabled ? colors.border : state.invalid ? colors.danger : focused ? colors.brandFocus : colors.controlBorder,
    // Keep the native editing rect stable through focus/typing; the focus ring paints outside it.
    borderWidth: 1,
    outlineColor: colors.brandFocus, outlineStyle: 'solid' as const, outlineWidth: focused ? 2 : 0, outlineOffset: 2,
    minHeight: TouchTarget, borderRadius: Shape.control, opacity: 1,
  };
}

/** Menu/segment rows reserve their selected outline; standalone weekday controls also need a resting boundary. */
export function designSelectionAppearance(colors: DesignPalette, state: { selected?: boolean; disabled?: boolean; focused?: boolean; pressed?: boolean } = {}, outlined = false) {
  return {
    backgroundColor: state.disabled ? colors.inset : state.selected ? colors.selected : state.pressed ? colors.controlPressed : outlined ? colors.control : 'transparent',
    borderColor: state.disabled ? colors.border : state.selected ? colors.brandBorder : outlined ? colors.controlBorder : 'transparent',
    borderWidth: 1, borderRadius: Shape.control, minHeight: TouchTarget, minWidth: TouchTarget,
    outlineColor: colors.brandFocus, outlineStyle: 'solid' as const, outlineWidth: state.focused && !state.disabled ? 2 : 0, outlineOffset: 2,
    opacity: 1,
  };
}

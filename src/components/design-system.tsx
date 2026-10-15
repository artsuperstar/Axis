import { useFonts } from 'expo-font';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type ViewProps, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { DesignColors, DesignTypography, MotionTokens, Shape, TouchTarget, displayFontStyle, interfaceFontStyle, type DesignPalette, type DesignTextRole } from '@/constants/design-system-v2';
import { DesignSpace as Space } from '@/constants/design-system-v2';
import { useColorScheme } from '@/hooks/use-color-scheme';

import type { ButtonVariant } from './control-appearance';
import { ReducedMotionContext, motionTiming, useMotionPreference, useReducedMotion } from './motion';
import { ThemedText, type ThemedTextProps } from './themed-text';
import { UiIcon } from './ui-icon';
export { UiIcon } from './ui-icon';

const fonts = {
  'AxisManrope-Regular': require('../../assets/fonts/manrope/Manrope-Regular.ttf'),
  'AxisManrope-SemiBold': require('../../assets/fonts/manrope/Manrope-SemiBold.ttf'),
};
const displayFonts = { 'AxisLora-SemiBold': require('../../assets/fonts/lora/Lora-SemiBold.ttf') };
const TypographyContext = createContext({ loaded: false, displayLoaded: false, system: false });

/** Local typography boundary; it never blocks rendering or changes global ThemedText/inputs. */
export function DesignProvider({ children, system = false }: { children?: ReactNode; system?: boolean }) {
  const [loaded, error] = useFonts(fonts);
  const [displayLoaded, displayError] = useFonts(displayFonts);
  const reduced = useMotionPreference();
  return <ReducedMotionContext.Provider value={reduced}><TypographyContext.Provider value={{ loaded: loaded && !error, displayLoaded: displayLoaded && !displayError, system }}>{children}</TypographyContext.Provider></ReducedMotionContext.Provider>;
}

export function useDesignColors(): DesignPalette {
  return DesignColors[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

export function UiText({ color = 'textPrimary', type = 'body', style, ...props }: Omit<ThemedTextProps, 'themeColor' | 'type'> & { color?: keyof DesignPalette; type?: DesignTextRole }) {
  const colors = useDesignColors();
  const { loaded, displayLoaded, system } = useContext(TypographyContext);
  const semibold = DesignTypography[type].fontWeight === '600';
  const face = type === 'screenTitle' ? displayFontStyle(displayLoaded, system) : interfaceFontStyle(loaded, semibold ? 'semibold' : 'regular', system);
  return <ThemedText {...props} type={type === 'numeric' || type === 'smallLabel' ? 'body' : type} style={[DesignTypography[type], { color: colors[color] }, face, style]} />;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** UI-thread press feedback with unchanged hit bounds; rows can opt out of scaling. */
export function UiPressable({ style, onPressIn, onPressOut, onHoverIn, onHoverOut, onFocus, onBlur, ref, scale = false, ...props }: PressableProps & { ref?: Ref<View>; scale?: boolean }) {
  const reduced = useReducedMotion();
  const colors = useDesignColors();
  const progress = useSharedValue(0);
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (reduced) progress.set(0); }, [reduced, progress]);
  const feedback = useAnimatedStyle(() => ({ opacity: 1 - progress.get() * 0.08,
    transform: [{ scale: scale ? 1 - progress.get() * 0.015 : 1 }] }));
  // Keep animated styles directly on the animated host, not hidden inside Pressable's style callback.
  return <AnimatedPressable {...props} ref={ref} style={[typeof style === 'function' ? style({ pressed, hovered }) : style, feedback,
    focused && { outlineColor: colors.brand, outlineWidth: 2, outlineOffset: 2 }]}
    onFocus={(event) => { setFocused(true); onFocus?.(event); }} onBlur={(event) => { setFocused(false); onBlur?.(event); }}
    onHoverIn={(event) => { setHovered(true); onHoverIn?.(event); }} onHoverOut={(event) => { setHovered(false); onHoverOut?.(event); }}
    onPressIn={(event) => { setPressed(true); if (!reduced && !props.disabled) progress.set(withTiming(1, motionTiming(MotionTokens.press))); onPressIn?.(event); }}
    onPressOut={(event) => { setPressed(false); progress.set(reduced ? 0 : withTiming(0, motionTiming(MotionTokens.press))); onPressOut?.(event); }} />;
}

export function UiButton({ label, onPress, disabled = false, selected = false, accessibilityLabel, variant = 'secondary', expanded, align = 'center', ref, icon, showIndicator = true, feature }: {
  label: string; onPress: () => void; disabled?: boolean; selected?: boolean; accessibilityLabel?: string; variant?: ButtonVariant;
  expanded?: boolean; align?: 'start' | 'center'; ref?: Ref<View>; icon?: 'plus' | 'more';
  showIndicator?: boolean;
  feature?: 'fitness' | 'tasks';
}) {
  const colors = useDesignColors();
  const [focused, setFocused] = useState(false);
  const primary = variant === 'primary' && !disabled;
  const textColor = disabled ? 'textMuted' : primary ? feature === 'fitness' ? 'onFitness' : 'onBrand'
    : variant === 'destructive' ? 'danger' : selected ? 'brand' : feature === 'fitness' && variant === 'secondary' ? 'fitnessText' : 'textPrimary';
  return <UiPressable ref={ref} scale accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label}
    accessibilityState={{ disabled, selected, ...(expanded === undefined ? {} : { expanded }) }} aria-expanded={expanded}
    disabled={disabled} onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.button, { alignItems: align === 'start' ? 'flex-start' : 'center',
      paddingHorizontal: variant === 'navigation' ? Space.sm : Space.md,
      backgroundColor: disabled ? colors.inset : primary ? feature === 'fitness' ? colors.fitnessAccent : colors.brandStrong : pressed || selected ? colors.selected
        : variant === 'quiet' || variant === 'navigation' ? 'transparent' : feature === 'fitness' ? colors.fitnessAccentSoft : colors.control,
      borderColor: focused ? primary ? colors[textColor] : colors.brand : 'transparent' }]}>
    {icon ? <UiIcon name={icon} color={colors[textColor]} /> : <UiText type="button" color={textColor}>{label}</UiText>}
    {selected && variant === 'navigation' && showIndicator && <View style={{ position: 'absolute', left: 8, right: 8, bottom: 2, height: 2, backgroundColor: colors.brand }} />}
  </UiPressable>;
}

export function GroupSurface({ style, variant = 'group', compact = false, ...props }: ViewProps & {
  variant?: 'group' | 'groupStrong' | 'inset' | 'surface'; compact?: boolean;
}) {
  const colors = useDesignColors();
  return <View {...props} style={[styles.group, { backgroundColor: colors[variant], borderRadius: variant === 'inset' ? Shape.inset : Shape.group }, compact && { padding: 0, gap: 0 }, style]} />;
}

/** Only locally added data opts in. Mounting/resume/history refresh never animates all rows. */
export function ContentInsertion({ animate, duration = MotionTokens.insertion, children, ...props }: ViewProps & { animate: boolean; duration?: number }) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(1);
  const consumed = useRef(false);
  const style = useAnimatedStyle(() => ({ opacity: progress.get(), transform: [{ translateY: (1 - progress.get()) * 6 }] }));
  useEffect(() => {
    if (!animate || consumed.current) { progress.set(1); return; }
    consumed.current = true;
    if (reduced) { progress.set(1); return; }
    progress.set(0);
    progress.set(withTiming(1, motionTiming(duration)));
  }, [animate, duration, reduced, progress]);
  return <Animated.View {...props} style={[props.style, style]}>{children}</Animated.View>;
}

export function raisedSurfaceShadow(colors: DesignPalette): ViewStyle {
  return colors.shadow === 'none' ? {} : { boxShadow: [{ offsetX: 0, offsetY: 3, blurRadius: 10, color: colors.shadow }] };
}

const styles = StyleSheet.create({
  button: { minWidth: TouchTarget, minHeight: TouchTarget, paddingHorizontal: Space.md, paddingVertical: Space.sm,
    borderRadius: Shape.control, borderWidth: 2, justifyContent: 'center' },
  group: { borderRadius: Shape.group, borderCurve: 'continuous', padding: Space.md, gap: Space.sm },
});

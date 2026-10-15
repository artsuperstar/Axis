import { useEffect, useRef, useState } from 'react';
import { View, useWindowDimensions, type LayoutRectangle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { DesignSpace as Space, MotionTokens, Shape, canSlideNavigationIndicator } from '@/constants/design-system-v2';

import { FormButton } from './form-controls';
import { UiPressable, UiText, useDesignColors } from './design-system';
import { motionTiming, useReducedMotion } from './motion';

/** Navigation chrome only. Existing destinations/scroll behavior stay owned by FitnessScreen. */
export function InternalNavigation<T extends string>({ value, options, onChange, compact = false, disabled = false, testID = 'fitness-navigation' }: {
  value: T; options: readonly { value: T; label: string }[]; onChange: (value: T) => void;
  compact?: boolean; disabled?: boolean; testID?: string;
}) {
  const colors = useDesignColors();
  const reduced = useReducedMotion();
  const { fontScale } = useWindowDimensions();
  const [layouts, setLayouts] = useState<Record<string, LayoutRectangle>>({});
  const current = layouts[value];
  const sliding = options.every((option) => layouts[option.value]) && canSlideNavigationIndicator(options.map((option) => layouts[option.value]), fontScale);
  const initialized = useRef(false);
  const x = useSharedValue(0); const y = useSharedValue(0); const width = useSharedValue(0);
  useEffect(() => {
    if (!sliding || !current) { initialized.current = false; return; }
    const animate = initialized.current && !reduced;
    x.set(animate ? withTiming(current.x + Space.sm, motionTiming(MotionTokens.indicator)) : current.x + Space.sm);
    y.set(current.y + current.height - 2);
    width.set(animate ? withTiming(Math.max(0, current.width - Space.sm * 2), motionTiming(MotionTokens.indicator)) : Math.max(0, current.width - Space.sm * 2));
    initialized.current = true;
  }, [current, sliding, reduced, x, y, width]);
  const indicator = useAnimatedStyle(() => ({ width: width.get(), transform: [{ translateX: x.get() }, { translateY: y.get() }] }));
  const wrapped = compact && fontScale >= 1.3;
  return <View testID={testID} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.xs,
    padding: Space.xs, borderRadius: Shape.control, backgroundColor: colors.control }}>
    {options.map((option) => <View key={option.value} style={{ maxWidth: '100%', ...(compact ? wrapped ? { flexBasis: '46%', flexGrow: 1 } : { flex: 1, minWidth: 0 } : {}) }} onLayout={({ nativeEvent: { layout } }) => {
      setLayouts((previous) => {
        const old = previous[option.value];
        return old && old.x === layout.x && old.y === layout.y && old.width === layout.width && old.height === layout.height
          ? previous : { ...previous, [option.value]: layout };
      });
    }}>{compact ? <UiPressable accessibilityRole="button" accessibilityLabel={`Go to ${option.label}`}
      accessibilityHint="Scrolls to this section. Keeps its current expanded or collapsed state."
      accessibilityState={{ selected: value === option.value, disabled }} disabled={disabled} onPress={() => onChange(option.value)}
      style={{ minHeight: 48, paddingHorizontal: Space.xs, paddingVertical: Space.sm, justifyContent: 'center', alignItems: 'center',
        borderRadius: Shape.control, backgroundColor: value === option.value ? colors.selected : 'transparent' }}>
      <UiText type="smallLabel" color={value === option.value ? 'taskText' : 'textSecondary'} style={{ fontSize: 13, lineHeight: 19, textAlign: 'center' }}>{option.label}</UiText>
      {value === option.value && (!sliding || wrapped) && <View pointerEvents="none" accessible={false}
        style={{ position: 'absolute', bottom: 2, left: 8, right: 8, height: 2, backgroundColor: colors.taskAccent }} />}
    </UiPressable> : <FormButton appearance="v2" variant="navigation" label={option.label} selected={value === option.value} showIndicator={!sliding}
      onPress={() => onChange(option.value)} />}</View>)}
    {sliding && !wrapped && <Animated.View testID="internal-navigation-indicator" pointerEvents="none" accessible={false}
      style={[{ position: 'absolute', left: 0, top: 0, height: 2, backgroundColor: compact ? colors.taskAccent : colors.brand }, indicator]} />}
  </View>;
}

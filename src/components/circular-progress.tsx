import { type ReactNode, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { motionTiming, useReducedMotion } from './motion';
import { MotionTokens } from '@/constants/design-system-v2';

/** Visual only: callers own the accessible progress meaning and any center content. */
export function CircularProgress({ ratio, size, thickness = 4, color, trackColor, children }: {
  ratio: number; size: number; thickness?: number; color: string; trackColor: string; children?: ReactNode;
}) {
  const fraction = Math.max(0, Math.min(1, ratio));
  const reduced = useReducedMotion();
  const progress = useSharedValue(fraction);
  const previous = useRef(fraction);
  useEffect(() => {
    progress.set(reduced || previous.current === fraction ? fraction : withTiming(fraction, motionTiming(MotionTokens.selection)));
    previous.current = fraction;
  }, [fraction, reduced, progress]);
  const first = useAnimatedStyle(() => ({ transform: [{ rotate: `${Math.min(1, progress.get() * 2) * 180}deg` }] }));
  const second = useAnimatedStyle(() => ({ transform: [{ rotate: `${Math.max(0, progress.get() * 2 - 1) * 180}deg` }] }));
  const dimensions = { width: size, height: size };
  const circle = [styles.circle, dimensions, { borderWidth: thickness, borderRadius: size / 2, borderColor: color }];
  const mask = [styles.mask, { width: size / 2, height: size }];
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[dimensions, { flexShrink: 0 }]}>
    <View style={[circle, { borderColor: trackColor }]} />
    <View style={[mask, { left: size / 2 }]}><Animated.View style={[styles.rotor, dimensions, { left: -size / 2 }, first]}><View style={mask}><View style={circle} /></View></Animated.View></View>
    <View style={mask}><Animated.View style={[styles.rotor, dimensions, second]}><View style={[mask, { left: size / 2 }]}><View style={[circle, { left: -size / 2 }]} /></View></Animated.View></View>
    {children && <View style={styles.center}>{children}</View>}
  </View>;
}

const styles = StyleSheet.create({
  circle: { position: 'absolute' },
  mask: { position: 'absolute', top: 0, left: 0, overflow: 'hidden' },
  rotor: { position: 'absolute', top: 0, left: 0 },
  center: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' },
});

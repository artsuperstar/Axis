import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { UiIcon, useDesignColors } from '@/components/design-system';
import { motionTiming, useReducedMotion } from '@/components/motion';
import { MotionTokens } from '@/constants/design-system-v2';

const size = 44;
export function todayProgressRatio(completed: number, total: number) {
  return total > 0 ? Math.max(0, Math.min(1, completed / total)) : 0;
}

/** Two clipped semicircles draw a continuous arc. Only transforms animate, on the UI thread. */
export function TodayProgress({ completed, total }: { completed: number; total: number }) {
  const colors = useDesignColors();
  const reduced = useReducedMotion();
  const ratio = todayProgressRatio(completed, total);
  const progress = useSharedValue(ratio);
  useEffect(() => {
    progress.set(reduced ? ratio : withTiming(ratio, motionTiming(MotionTokens.selection)));
  }, [ratio, reduced, progress]);
  const first = useAnimatedStyle(() => ({ transform: [{ rotate: `${Math.min(1, progress.get() * 2) * 180}deg` }] }));
  const second = useAnimatedStyle(() => ({ transform: [{ rotate: `${Math.max(0, progress.get() * 2 - 1) * 180}deg` }] }));
  if (!total) return null;
  const circle = [styles.circle, { borderColor: colors.taskAccent }];
  return <View testID="today-progress" accessible accessibilityRole="progressbar"
    accessibilityLabel={`Today progress, ${completed} of ${total} tasks completed`}
    accessibilityValue={{ min: 0, max: total, now: completed, text: `${completed} of ${total} completed` }} style={styles.root}>
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.root}>
      <View style={[styles.circle, { borderColor: colors.taskAccentSoft }]} />
      <View style={[styles.mask, { left: size / 2 }]}>
        <Animated.View style={[styles.rotor, { left: -size / 2 }, first]}>
          <View style={styles.mask}><View style={circle} /></View>
        </Animated.View>
      </View>
      <View style={styles.mask}>
        <Animated.View style={[styles.rotor, second]}>
          <View style={[styles.mask, { left: size / 2 }]}><View style={[circle, { left: -size / 2 }]} /></View>
        </Animated.View>
      </View>
      {ratio === 1 && <View testID="today-progress-complete" style={styles.check}><UiIcon name="check" color={colors.taskText} size={18} /></View>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  root: { width: size, height: size, flexShrink: 0 },
  circle: { position: 'absolute', width: size, height: size, borderWidth: 4, borderRadius: size / 2 },
  mask: { position: 'absolute', left: 0, top: 0, width: size / 2, height: size, overflow: 'hidden' },
  rotor: { position: 'absolute', left: 0, top: 0, width: size, height: size },
  check: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' },
});

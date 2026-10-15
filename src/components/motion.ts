import { createContext, useContext, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { Easing, ReduceMotion } from 'react-native-reanimated';

/** Start still until the OS preference resolves; subscribe so live setting changes also stop motion. */
export const ReducedMotionContext = createContext(true);
export function useReducedMotion() { return useContext(ReducedMotionContext); }

export function useMotionPreference() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    let changed = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      changed = true;
      if (active) setReduced(value);
    });
    AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (active && !changed) setReduced(value); }).catch(() => {});
    return () => { active = false; subscription.remove(); };
  }, []);
  return reduced;
}

export function motionTiming(duration: number) {
  return { duration, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System };
}

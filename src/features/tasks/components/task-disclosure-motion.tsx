import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { CellRendererProps } from '@react-native/virtualized-lists';
import { View } from 'react-native';
import Animated, { Easing, ReduceMotion, useSharedValue, withTiming, type EntryAnimationsValues, type ExitAnimationsValues,
  type LayoutAnimationFunction, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useReducedMotion } from '@/components/motion';

import type { TaskListItem } from '../types';
import type { TaskWorkspaceSection } from '../workspace';

export const taskDisclosureDuration = 260;
const exitDuration = 200;
const easeOut = Easing.out(Easing.cubic);
type Disclosure = 'Earlier' | 'Upcoming';
type Gesture = { id: number; section: string; opening: boolean; requestedAt: number; start: number; end: number; anchor: number | null; reported?: boolean };
const idle: Gesture = { id: 0, section: '', opening: false, requestedAt: 0, start: 0, end: 0, anchor: null };
type Motion = {
  gesture: SharedValue<Gesture>;
  anchors: SharedValue<Partial<Record<Disclosure, number>>>;
  owners: ReadonlyMap<string, string>;
  active: { id: number; section: string } | null;
  finish: (id: number) => void;
  reduced: boolean;
};
export const TaskDisclosureMotionContext = createContext<Motion | null>(null);

export function useTaskDisclosureMotion(sections: TaskWorkspaceSection[]) {
  const reduced = useReducedMotion();
  const gesture = useSharedValue<Gesture>(idle);
  const anchors = useSharedValue<Partial<Record<Disclosure, number>>>({});
  const [active, setActive] = useState<Motion['active']>(null);
  const activeId = useRef<number | null>(null);
  const fallback = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finish = useCallback((id: number) => {
    if (activeId.current !== id) return;
    if (fallback.current) clearTimeout(fallback.current);
    fallback.current = null;
    activeId.current = null;
    gesture.set({ ...idle, id: gesture.get().id + 1 });
    setActive(null);
  }, [gesture]);
  const cancel = useCallback(() => {
    if (activeId.current !== null) finish(activeId.current);
  }, [finish]);
  useEffect(() => {
    if (reduced) cancel();
  }, [reduced, cancel]);
  useEffect(() => () => {
    if (fallback.current) clearTimeout(fallback.current);
    activeId.current = null;
    gesture.set({ ...idle, id: gesture.get().id + 1 });
  }, [gesture]);
  const begin = useCallback((section: TaskWorkspaceSection) => {
    cancel();
    if (reduced || !isDisclosure(section.title)) return;
    const id = gesture.get().id + 1;
    activeId.current = id;
    gesture.set({ id, section: section.title, opening: !section.expanded, requestedAt: Date.now(), start: 0,
      end: 0, anchor: anchors.get()[section.title as Disclosure] ?? null });
    setActive({ id, section: section.title });
    // Covers empty/offscreen sections where native animation callbacks never start.
    fallback.current = setTimeout(() => finish(id), 1000 + taskDisclosureDuration);
  }, [gesture, anchors, reduced, cancel, finish]);
  const owners = useMemo(() => new Map(sections.flatMap((section) =>
    (section.memberKeys ?? section.data.map((item) => item.key)).map((key) => [key, section.title] as const))), [sections]);
  return { value: useMemo(() => ({ gesture, anchors, owners, active, finish, reduced }),
    [gesture, anchors, owners, active, finish, reduced]), begin, cancel, active };
}

function isDisclosure(section: string): section is Disclosure { return section === 'Earlier' || section === 'Upcoming'; }

/** Data identity, never a flattened index that can lag behind a section update. */
export function taskCellOwner(item: TaskListItem | TaskWorkspaceSection, owners: ReadonlyMap<string, string>) {
  return 'task' in item ? owners.get(item.key) ?? '' : item.title;
}

/** Native layout metrics supply actual heights. One deadline prevents delayed virtual cells cascading. */
export function disclosureCellAnimations(gesture: SharedValue<Gesture>, section: string, header = false, finish?: (id: number) => void) {
  const content = isDisclosure(section) && !header;
  function completed(id: number) {
    'worklet';
    return (finished: boolean) => {
      'worklet';
      const action = gesture.get();
      if (finished && action.id === id && !action.reported && finish) {
        gesture.set({ ...action, reported: true });
        scheduleOnRN(finish, id);
      }
    };
  }
  function nativeGesture() {
    'worklet';
    let action = gesture.get();
    const now = Date.now();
    // Start on the UI thread when native cells actually exist, not before virtualized batching.
    // The eligibility bound prevents an abandoned gesture replaying on a later ordinary scroll.
    if (action.end === 0 && now - action.requestedAt <= 1000) {
      action = { ...action, start: now, end: now + taskDisclosureDuration };
      gesture.set(action);
    }
    return action;
  }
  function timing(value: number, duration: number, id: number) {
    'worklet';
    return withTiming(value, { duration, reduceMotion: ReduceMotion.System, easing: (fraction) => {
      'worklet';
      // Finish superseded native exits rather than leaving ghost rows during a rapid reopen.
      return gesture.get().id === id ? easeOut(fraction) : 1;
    } });
  }
  const entering = (values: EntryAnimationsValues) => {
    'worklet';
    if (!content) return { initialValues: {}, animations: {} };
    const target = { opacity: 1, originY: values.targetOriginY, height: values.targetHeight, transform: [{ translateY: 0 }] };
    const requested = gesture.get();
    if (requested.section !== section || !requested.opening) return { initialValues: target, animations: target };
    const action = nativeGesture();
    const remaining = Math.max(0, action.end - Date.now());
    if (!remaining) return { initialValues: target, animations: target };
    const phase = 1 - Math.pow(Math.min(1, remaining / taskDisclosureDuration), 3);
    const anchor = action.anchor ?? values.targetOriginY;
    return { initialValues: { opacity: .15 + .85 * phase, originY: anchor + (values.targetOriginY - anchor) * phase,
      height: values.targetHeight * phase, transform: [{ translateY: -6 * (1 - phase) }] },
    animations: { opacity: timing(1, remaining, action.id), originY: timing(values.targetOriginY, remaining, action.id),
      height: timing(values.targetHeight, remaining, action.id), transform: [{ translateY: timing(0, remaining, action.id) }] }, callback: completed(action.id) };
  };
  const exiting = (values: ExitAnimationsValues) => {
    'worklet';
    if (!content) return { initialValues: {}, animations: {} };
    const requested = gesture.get();
    if (requested.section !== section || requested.opening) return { initialValues: { opacity: 0 }, animations: { opacity: 0 } };
    const action = nativeGesture();
    const remaining = Math.max(0, action.end - Date.now());
    if (!remaining) return { initialValues: { opacity: 0 }, animations: { opacity: 0 } };
    const duration = Math.max(0, exitDuration - (taskDisclosureDuration - remaining));
    const phase = 1 - Math.pow(Math.min(1, remaining / taskDisclosureDuration), 3);
    const fade = 1 - Math.pow(Math.min(1, duration / exitDuration), 3);
    const anchor = action.anchor ?? values.currentOriginY;
    return { initialValues: { opacity: 1 - fade, originY: anchor + (values.currentOriginY - anchor) * (1 - phase),
      height: values.currentHeight * (1 - phase), transform: [{ translateY: -4 * fade }] },
      animations: { opacity: timing(0, duration, action.id), originY: timing(action.anchor ?? values.currentOriginY, remaining, action.id),
        height: timing(0, remaining, action.id), transform: [{ translateY: timing(-4, duration, action.id) }] }, callback: completed(action.id) };
  };
  const layout: LayoutAnimationFunction = (values) => {
    'worklet';
    const requested = gesture.get();
    if (!content || requested.section !== section) return { initialValues: {}, animations: {} };
    const action = nativeGesture();
    const remaining = Math.max(0, action.end - Date.now());
    if (!remaining) return { initialValues: {}, animations: {} };
    const phase = 1 - Math.pow(Math.min(1, remaining / taskDisclosureDuration), 3);
    return { initialValues: { originY: values.currentOriginY + (values.targetOriginY - values.currentOriginY) * phase,
      height: values.currentHeight + (values.targetHeight - values.currentHeight) * phase },
      animations: { originY: timing(values.targetOriginY, remaining, action.id), height: timing(values.targetHeight, remaining, action.id) }, callback: completed(action.id) };
  };
  return { entering, exiting, layout };
}

type CellProps = CellRendererProps<TaskListItem | TaskWorkspaceSection>;

/** Ordinary cells have no Reanimated root or disclosure geometry ownership, even during a gesture. */
export function TaskDisclosureCell(props: CellProps) {
  const { children, item, cellKey, style, onLayout, onFocusCapture } = props;
  const motion = useContext(TaskDisclosureMotionContext)!;
  const section = taskCellOwner(item, motion.owners);
  const header = !('task' in item) && cellKey.endsWith(':header');
  if (isDisclosure(section) && !header) return <AnimatedDisclosureCell {...props} section={section} motion={motion} />;
  return <View testID={`task-cell-${cellKey}`} style={style} {...{ onFocusCapture }}
    onLayout={(event) => {
      onLayout?.(event);
      if (isDisclosure(section) && header) {
        const { y, height } = event.nativeEvent.layout;
        motion.anchors.set({ ...motion.anchors.get(), [section]: y + height });
      }
    }}>{children}</View>;
}

function AnimatedDisclosureCell({ children, cellKey, style, onLayout, onFocusCapture, section, motion }: CellProps & { section: Disclosure; motion: Motion }) {
  const animations = useMemo(() => disclosureCellAnimations(motion.gesture, section, false, motion.finish), [motion.gesture, section, motion.finish]);
  const active = !motion.reduced && motion.active?.section === section;
  return <Animated.View testID={`task-cell-${cellKey}`} collapsable={false}
    style={[style, { overflow: 'hidden' }]}
    entering={active ? animations.entering : undefined}
    // Register before removal; the worklet is dormant outside its own closing gesture.
    exiting={!motion.reduced ? animations.exiting : undefined}
    layout={active ? animations.layout : undefined} {...{ onFocusCapture }} onLayout={onLayout}>{children}</Animated.View>;
}

import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { FormButton } from '@/components/form-controls';
import { UiIcon, UiPressable, UiText, useDesignColors } from '@/components/design-system';
import { motionTiming, useReducedMotion } from '@/components/motion';
import { DesignSpace as Space, MotionTokens, TouchTarget, taskSectionSurface } from '@/constants/design-system-v2';

import type { taskRowPresentation } from '../presentation';
import type { TaskRowProps } from './task-row';

export function TaskListRow({ task, onComplete, onActions, section = 'Today', row }: TaskRowProps & {
  section?: string; row: ReturnType<typeof taskRowPresentation>;
}) {
  const colors = useDesignColors();
  const reduced = useReducedMotion();
  const checked = useSharedValue(row.completed ? 1 : 0);
  const previous = useRef(row.completed);
  useEffect(() => {
    if (reduced) checked.set(Number(row.completed));
    else if (previous.current !== row.completed) checked.set(withTiming(Number(row.completed), motionTiming(MotionTokens.selection)));
    previous.current = row.completed;
  }, [row.completed, reduced, checked]);
  const checkStyle = useAnimatedStyle(() => ({ opacity: checked.get(), transform: [{ scale: 0.9 + checked.get() * 0.1 }] }));
  return <View testID={`task-row-${task.id}`} style={[styles.row, { backgroundColor: taskSectionSurface(colors, section), borderColor: colors.border }]}>
    <UiPressable accessibilityRole="checkbox" accessibilityState={{ checked: row.completed }}
      accessibilityLabel={`${row.completed ? 'Reopen' : 'Complete'} ${row.actionSubject}`} onPress={onComplete} scale
      style={({ pressed }) => [styles.completion, { backgroundColor: pressed ? colors.taskAccentSoft : 'transparent' }]}>
      <View style={[styles.ring, { borderColor: colors.taskAccent, backgroundColor: row.completed ? colors.taskAccent : 'transparent' }]}>
        <Animated.View style={checkStyle}><UiIcon name="check" size={14} color={colors.onBrand} /></Animated.View>
      </View>
    </UiPressable>
    <View testID={`task-information-${task.id}`} accessible accessibilityRole="text" accessibilityLabel={row.accessibilityLabel} style={styles.details}>
      <UiText type="body" color={row.resolved ? 'textSecondary' : 'textPrimary'} style={[styles.title, row.completed && styles.completed]}>{task.title}</UiText>
      {!!row.visibleDate && <UiText type="metadata" color="textSecondary" style={styles.metadata}>{row.visibleDate}</UiText>}
      {!!row.metadata && <UiText type="metadata" color="textSecondary" style={styles.metadata}>{row.metadata}</UiText>}
      {!!row.statusLabel && <UiText type="metadata" color={row.attention ? 'attention' : 'textMuted'} style={styles.metadata}>{row.statusLabel}</UiText>}
      {!!task.description && <UiText type="secondary" color="textSecondary" numberOfLines={2} style={styles.metadata}>{task.description}</UiText>}
    </View>
    <FormButton appearance="v2" icon="more" variant="quiet" label="⋯" accessibilityLabel={`Actions for ${row.actionSubject}`} onPress={onActions} />
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm, paddingVertical: Space.xs, paddingHorizontal: Space.sm, borderLeftWidth: 1, borderRightWidth: 1 },
  completion: { minWidth: TouchTarget, minHeight: TouchTarget, justifyContent: 'center', alignItems: 'center', borderRadius: TouchTarget / 2 },
  ring: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  details: { flex: 1, minWidth: 0, minHeight: TouchTarget, justifyContent: 'center', gap: 2, borderRadius: 6 },
  title: { fontSize: 15, lineHeight: 22 }, metadata: { fontSize: 13, lineHeight: 18 },
  completed: { textDecorationLine: 'line-through' },
});

import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { ContextMenu } from '@/components/context-menu';
import { CircularProgress } from '@/components/circular-progress';
import { GroupSurface, UiIcon, UiText, useDesignColors } from '@/components/design-system';
import { DesignSpace as Space, Shape } from '@/constants/design-system-v2';

import type { SessionDetail } from '../types';
import { workoutProgress } from '../workout-presentation';

/** Workout status and secondary actions; exercise and set controls keep their own menus. */
export function ActiveWorkoutHeader({ session, onNote, onDiscard }: {
  session: SessionDetail; onNote: () => void; onDiscard: () => void;
}) {
  const colors = useDesignColors();
  const { width, fontScale } = useWindowDimensions();
  const constrained = width < 360 || fontScale >= 1.5;
  const progress = workoutProgress(session);
  return <GroupSurface variant="surface" testID="workout-header" style={styles.header}>
    <View style={[styles.icon, { backgroundColor: colors.fitnessAccentSoft }]}>
      <UiIcon name="dumbbell" size={24} color={colors.fitnessText} />
    </View>
    <View style={styles.status}>
      <UiText type="smallLabel" color="textSecondary">Current Workout</UiText>
      <UiText type="screenTitle" accessibilityRole="header" accessibilityLabel={session.name}
        numberOfLines={fontScale >= 1.5 ? undefined : 2} style={styles.name}>{session.name}</UiText>
      <UiText type="metadata" color="textSecondary" accessible={!progress.total} accessibilityElementsHidden={!!progress.total}
        importantForAccessibility={progress.total ? 'no-hide-descendants' : 'auto'}>{progress.label}</UiText>
    </View>
    <View style={[styles.controls, constrained && styles.stackedControls]}>
    {!!progress.total && <View testID="workout-progress" accessible accessibilityRole="progressbar" accessibilityLabel="Workout progress"
      accessibilityLiveRegion="polite" accessibilityValue={{ min: 0, max: 100, now: progress.percentage, text: `${progress.label} complete, ${progress.percentage} percent` }}>
      <CircularProgress ratio={progress.ratio} size={constrained ? 28 : 32} thickness={3} color={colors.fitnessAccent} trackColor={colors.fitnessAccentSoft} />
    </View>}
    <ContextMenu appearance="v2" label="More workout actions" actions={[
      { label: session.note ? 'Edit workout note' : 'Add workout note', onPress: onNote },
      { label: 'Discard workout', variant: 'destructive', onPress: onDiscard },
    ]} />
    </View>
  </GroupSurface>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Space.md, padding: Space.md },
  icon: { width: 44, height: 44, borderRadius: Shape.control, alignItems: 'center', justifyContent: 'center' },
  status: { flex: 1, minWidth: 0 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  stackedControls: { flexDirection: 'column', gap: 0 },
  name: { fontSize: 18, lineHeight: 24 },
});

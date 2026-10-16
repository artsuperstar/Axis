import { StyleSheet, View } from 'react-native';

import { FormButton } from '@/components/form-controls';
import { GroupSurface, UiIcon, UiPressable, UiText, raisedSurfaceShadow, useDesignColors } from '@/components/design-system';
import { DesignSpace as Space, Shape, TouchTarget } from '@/constants/design-system-v2';

import { workoutDateLabel, workoutCounts } from '../management-presentation';
import type { NextWorkout, RoutineSummary, SessionSummary } from '../types';

export function WorkoutLanding({ routines, selected, next, lastWorkout, lastFinished, onSelect, onStart, onRoutines, onCreate, onHistory }: {
  routines: RoutineSummary[]; selected: RoutineSummary | null; next: NextWorkout | null; lastWorkout: SessionSummary | null;
  lastFinished: string | null; onSelect: (id: string) => void; onStart: (id: string | null) => void;
  onRoutines: () => void; onCreate: () => void; onHistory: (id: string) => void;
}) {
  const colors = useDesignColors();
  const recommended = !!selected && !!next && selected.id === next.routine.id;
  // A launch preview stays small; the existing Routines destination owns the full collection.
  const nextRoutine = routines.find((routine) => routine.id === next?.routine.id);
  const choices = (nextRoutine ? [nextRoutine, ...routines.filter((routine) => routine.id !== nextRoutine.id)] : routines).slice(0, 4);
  return <View testID="workout-landing" style={styles.root}>
    {lastFinished && <UiText type="secondary" color="fitnessText" accessibilityRole="alert">Workout completed · {lastFinished}</UiText>}
    <GroupSurface variant="surface" testID="workout-start-card" style={[styles.hero, raisedSurfaceShadow(colors)]}>
      <View style={styles.heroHeading}>
        <View style={[styles.heroIcon, { backgroundColor: colors.fitnessAccentSoft }]}><UiIcon name="dumbbell" size={32} color={colors.fitnessText} /></View>
        <View style={styles.title}>
          <UiText type="screenTitle" style={styles.routineName} accessibilityRole="header">{selected?.name ?? 'Your next workout'}</UiText>
          <UiText type="metadata" color="textSecondary">{selected ? `${workoutCounts(selected.exerciseCount)}${recommended ? ' · active rotation' : ''}` : 'Start with a routine, or make room to explore.'}</UiText>
          {recommended && <UiText type="metadata" color="fitnessText">Next in {next!.rotation.name}</UiText>}
        </View>
      </View>
      {selected ? <FormButton appearance="v2" feature="fitness" variant="primary" label="Start workout" accessibilityLabel={`Start ${selected.name}`} onPress={() => onStart(selected.id)} />
        : <FormButton appearance="v2" feature="fitness" variant="primary" label="Create a routine" onPress={onCreate} />}
      {lastWorkout && <UiPressable accessibilityRole="button" accessibilityLabel={`Last workout: ${lastWorkout.name}, ${workoutDateLabel(lastWorkout.completedAt!)}`}
        accessibilityHint="Opens the completed workout. Read-only." onPress={() => onHistory(lastWorkout.id)}
        style={[styles.last, { borderTopColor: colors.border }]}>
        <UiIcon name="clock" size={22} color={colors.fitnessText} />
        <View style={styles.title}><UiText type="secondary">Last workout: {lastWorkout.name}</UiText><UiText type="metadata" color="textSecondary">{workoutDateLabel(lastWorkout.completedAt!)}</UiText></View>
        <View style={{ transform: [{ rotate: '-90deg' }] }}><UiIcon name="chevron" size={18} color={colors.textMuted} /></View>
      </UiPressable>}
    </GroupSurface>
    <GroupSurface variant="surface" testID="workout-routine-choices" style={styles.choices}>
      <View style={styles.choicesHeading}><UiText type="sectionHeading" accessibilityRole="header" style={styles.title}>Choose a routine</UiText>
        <FormButton appearance="v2" variant="quiet" label="View all" accessibilityLabel="View all routines" onPress={onRoutines} />
      </View>
      {!routines.length && <UiText type="secondary" color="textSecondary">Your routines will live here. Build one with the exercises you enjoy.</UiText>}
      {choices.map((routine) => {
        const checked = selected?.id === routine.id;
        return <UiPressable key={routine.id} accessibilityRole="radio" accessibilityState={{ checked }}
          accessibilityLabel={`Choose ${routine.name}, ${workoutCounts(routine.exerciseCount)}${routine.id === next?.routine.id ? ', next in active rotation' : ''}`}
          onPress={() => onSelect(routine.id)} style={({ pressed }) => [styles.routine, { backgroundColor: checked || pressed ? colors.selected : colors.surface,
            borderColor: checked ? colors.brand : colors.border }]}>
          <View style={[styles.routineIcon, { backgroundColor: colors.fitnessAccentSoft }]}><UiIcon name="dumbbell" color={colors.fitnessText} size={24} /></View>
          <View style={styles.title}><UiText type="cardTitle">{routine.name}</UiText><UiText type="metadata" color="textSecondary">{workoutCounts(routine.exerciseCount)}{routine.id === next?.routine.id ? ' · active rotation' : ''}</UiText></View>
          <View style={[styles.choice, { borderColor: checked ? colors.brand : colors.borderStrong, backgroundColor: checked ? colors.brand : 'transparent' }]}>
            {checked && <UiIcon name="check" size={16} color={colors.onBrand} />}
          </View>
        </UiPressable>;
      })}
    </GroupSurface>
    <FormButton appearance="v2" feature="fitness" label="Start Empty Workout" onPress={() => onStart(null)} />
    <UiText type="secondary" color="textSecondary">Complete sets as you go. Add numbers when you want, then finish to save to History.</UiText>
  </View>;
}

const styles = StyleSheet.create({
  root: { gap: Space.lg }, hero: { padding: Space.lg, gap: Space.lg, borderRadius: Shape.raised },
  heroHeading: { flexDirection: 'row', alignItems: 'center', gap: Space.md }, title: { flex: 1, minWidth: 0, gap: Space.xs },
  routineName: { fontSize: 26, lineHeight: 34 },
  heroIcon: { width: 64, height: 64, borderRadius: Shape.group, alignItems: 'center', justifyContent: 'center' },
  last: { minHeight: TouchTarget, borderTopWidth: 1, paddingTop: Space.md, flexDirection: 'row', alignItems: 'center', gap: Space.md },
  choices: { padding: Space.md, gap: Space.sm }, choicesHeading: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, flexWrap: 'wrap' },
  routine: { minHeight: 76, padding: Space.md, borderRadius: Shape.group, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: Space.md },
  routineIcon: { width: 40, height: 40, borderRadius: Shape.control, alignItems: 'center', justifyContent: 'center' },
  choice: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});

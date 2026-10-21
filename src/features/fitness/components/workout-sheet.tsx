import { FlatList, StyleSheet, View } from 'react-native';

import { AdaptiveSheet, useSheetScrollProps } from '@/components/adaptive-sheet';
import { GroupSurface, UiIcon, UiText, useDesignColors } from '@/components/design-system';
import { FormError } from '@/components/form-controls';
import { DesignSpace as Space, Shape } from '@/constants/design-system-v2';

import { measurementLabel, setLabel } from '../form';
import { workoutDateLabel } from '../management-presentation';
import { measurementIcons, workoutSetPresentation } from '../workout-presentation';
import type { SessionDetail } from '../types';
import { RoutineHeader, RoutineScrollView } from './routine-composition';

/** Completed History detail only. Active sessions belong to the Workout destination. */
export function WorkoutSheet({ session, error, onDismiss }: {
  session: SessionDetail; error: string | null; onDismiss: () => void;
}) {
  if (session.completedAt === null) return null;
  return <AdaptiveSheet appearance="v2" fillHeight title={session.name} onDismiss={onDismiss}
    header={<RoutineHeader title="Workout details" onDismiss={onDismiss} />}
    scrollBody={<HistoricalWorkoutBody session={session} error={error} />} />;
}

function HistoricalWorkoutBody({ session, error }: { session: SessionDetail; error: string | null }) {
  const colors = useDesignColors();
  const { ref: sheetRef, ...bodyProps } = useSheetScrollProps();
  return <FlatList {...bodyProps} testID="workout-history-detail-list" data={session.exercises} keyExtractor={exercise => exercise.id}
    contentContainerStyle={[bodyProps.contentContainerStyle, { gap: 0 }]}
    initialNumToRender={6} maxToRenderPerBatch={6} windowSize={5} removeClippedSubviews={false}
    renderScrollComponent={props => <RoutineScrollView {...props} sheetRef={sheetRef} />}
    ListHeaderComponent={<View style={styles.summary}>
      <FormError appearance="v2" message={error} />
      <GroupSurface variant="group" style={[styles.group, { borderColor: colors.border }]}>
        <UiText type="editorSection" accessibilityRole="header">{session.name}</UiText>
        <UiText type="cardTitle" accessibilityRole="header">{workoutDateLabel(session.completedAt!)}</UiText>
        <UiText type="secondary" color="textSecondary">Completed {new Date(session.completedAt!).toLocaleString()}</UiText>
        <UiText type="metadata" color="textSecondary">Started {new Date(session.startedAt).toLocaleString()} · Read-only</UiText>
      </GroupSurface>
      {!!session.note && <GroupSurface variant="group" style={[styles.group, { borderColor: colors.border }]}>
        <UiText type="cardTitle" accessibilityRole="header">Workout note</UiText><UiText>{session.note}</UiText>
      </GroupSurface>}
    </View>}
    ListEmptyComponent={<UiText color="textSecondary">No exercises logged.</UiText>}
    ItemSeparatorComponent={() => <View style={{ height: Space.md }} />}
    renderItem={({ item: exercise }) => <GroupSurface variant="group" testID={`historical-exercise-${exercise.id}`} style={[styles.group, { borderColor: colors.border }]}>
      <View style={styles.identity}>
        <View style={[styles.tile, { backgroundColor: colors.brandSoft }]}><UiIcon name={measurementIcons[exercise.measurementType]} size={24} color={colors.brand} /></View>
        <View style={styles.text}><UiText type="cardTitle" accessibilityRole="header">{exercise.exerciseName}</UiText>
          <UiText type="metadata" color="textSecondary">{measurementLabel(exercise.measurementType)}</UiText></View>
      </View>
      {exercise.targetSetCount === null && <UiText type="secondary" color="textSecondary">{exercise.isManuallyComplete ? 'Exercise completed' : 'Not marked complete'} · No set target</UiText>}
      {!!exercise.note && <UiText type="secondary">Note: {exercise.note}</UiText>}
      {exercise.sets.map((set, index) => <View key={set.id} style={[styles.set, { borderColor: colors.border }]} accessible
        accessibilityLabel={`${exercise.exerciseName}, set ${index + 1}. ${workoutSetPresentation(set).spoken}`}>
        <UiText type="metadata" color="textSecondary">Set {index + 1}</UiText>
        <UiText style={styles.performance}>{setLabel(set)}</UiText>
      </View>)}
      {!exercise.sets.length && <UiText type="secondary" color="textSecondary">No sets logged.</UiText>}
    </GroupSurface>} />;
}

const styles = StyleSheet.create({
  summary: { gap: Space.md, paddingBottom: Space.md }, group: { padding: Space.md, borderWidth: 1, gap: Space.sm },
  identity: { flexDirection: 'row', alignItems: 'center', gap: Space.md }, text: { flex: 1, minWidth: 0, gap: Space.xs },
  tile: { width: 40, height: 40, borderRadius: Shape.control, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  set: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: Space.sm, paddingTop: Space.sm, borderTopWidth: 1 },
  performance: { flexShrink: 1, minWidth: 0 },
});

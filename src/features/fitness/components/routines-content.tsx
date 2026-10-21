import { ActivityIndicator, FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ContextMenu } from '@/components/context-menu';
import { FormButton, SegmentedControl } from '@/components/form-controls';
import { GroupSurface, UiIcon, UiPressable, UiText, useDesignColors } from '@/components/design-system';
import { useFormSelection } from '@/components/form-selection-host';
import { DesignSpace as Space, Shape, TouchTarget } from '@/constants/design-system-v2';

import { workoutCounts } from '../management-presentation';
import type { NextWorkout, RoutineSummary } from '../types';

type Actions = { onOpen: (id: string) => void; onStart: (id: string) => void; onArchive: (routine: RoutineSummary) => void };
const archiveOptions = [{ value: 0, label: 'Active' }, { value: 1, label: 'Archived', icon: 'archive' as const }];

function RoutineCard({ routine, onOpen, onStart, onArchive }: { routine: RoutineSummary } & Actions) {
  const colors = useDesignColors();
  const large = useWindowDimensions().fontScale >= 1.5;
  const archived = routine.deletedAt !== null;
  const icon = <View style={[styles.routineIcon, { backgroundColor: archived ? colors.control : colors.brandSoft }]}>
    <UiIcon name="dumbbell" color={archived ? colors.textMuted : colors.brand} size={26} />
  </View>;
  const menu = !archived && <View style={[styles.menu, { backgroundColor: colors.control, borderColor: colors.border }]}>
    <ContextMenu appearance="v2" label={`Options for ${routine.name}`} actions={[
      { label: 'Start workout', accessibilityLabel: `Start ${routine.name}`, onPress: () => onStart(routine.id) },
      { label: 'Edit', accessibilityLabel: `Edit ${routine.name}`, onPress: () => onOpen(routine.id) },
      { label: 'Archive', accessibilityLabel: `Archive ${routine.name}`, variant: 'destructive', onPress: () => onArchive(routine) },
    ]} />
  </View>;
  const identity = <UiPressable accessibilityRole="button" accessibilityLabel={`Open ${routine.name}, ${workoutCounts(routine.exerciseCount)}`}
    accessibilityHint={archived ? 'Opens the archived routine. Read-only.' : 'Opens the routine editor.'} onPress={() => onOpen(routine.id)}
    style={[styles.identity, large && styles.fullWidth]}>
    {!large && icon}
    <View style={styles.details}><UiText type="cardTitle">{routine.name}</UiText><UiText type="metadata" color="textSecondary">{workoutCounts(routine.exerciseCount)}</UiText></View>
  </UiPressable>;
  return <GroupSurface testID={`routine-card-${routine.id}`} variant="group" style={[styles.routine, styles.bounded, { borderColor: colors.border }]}>
    {large ? <><View style={styles.controls}>{icon}{menu}</View>{identity}</> : <View style={styles.row}>{identity}{menu}</View>}
  </GroupSurface>;
}

/** Routines owns one virtualized scroll body. Source APIs still own selection, counts and mutation rules. */
export function RoutinesContent({ routines, next, sequence, archived, ready, loaded, loading, onArchivedChange, onCreate, onManage, scrollOffset, onScrollOffset, ...actions }: {
  routines: RoutineSummary[]; next: NextWorkout | null; sequence: string[]; archived: boolean; ready: boolean; loaded: boolean; loading: boolean;
  onArchivedChange: (archived: boolean) => void; onCreate: () => void; onManage: () => void; scrollOffset: number; onScrollOffset: (offset: number) => void;
} & Actions) {
  const colors = useDesignColors();
  const selection = useFormSelection();
  const { width, fontScale } = useWindowDimensions();
  const stackHeading = width < 360 || fontScale >= 1.3;
  return <FlatList<RoutineSummary> style={styles.list} contentContainerStyle={styles.content} data={routines}
    keyExtractor={routine => routine.id} initialNumToRender={8} maxToRenderPerBatch={8} windowSize={5}
    contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false} contentOffset={{ x: 0, y: scrollOffset }}
    keyboardShouldPersistTaps="handled" scrollEnabled={!selection.activeId} scrollEventThrottle={16}
    onScroll={event => { selection.reposition(); onScrollOffset(event.nativeEvent.contentOffset.y); }}
    ListHeaderComponent={<View style={[styles.header, styles.bounded]}>
      {ready && <>
        <GroupSurface testID="routine-rotation-card" variant="group" style={[styles.rotation, { borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={[styles.rotationIcon, { backgroundColor: colors.brandSoft }]}><UiIcon name="repeat" color={colors.brand} size={26} /></View>
            <UiText type="editorSection" accessibilityRole="header" style={styles.sectionTitle}>Workout rotation</UiText>
          </View>
          <UiText type="cardTitle">{next?.rotation.name ?? 'No active rotation'}</UiText>
          {next && <>
            <UiText type="secondary" color="textSecondary">{sequence.join(' → ')}</UiText>
            <View style={styles.row}><UiIcon name="forward" size={20} color={colors.brand} /><UiText type="secondary" color="brand" style={styles.next}>Next: {next.routine.name}</UiText></View>
          </>}
          <View style={[styles.manage, { borderTopColor: colors.border }]}>
            <FormButton appearance="v2" tone="brand" variant="secondary" align="start" leadingIcon="gear" trailingIcon="forward"
              label={next ? 'Manage rotation' : 'Set up rotation'} accessibilityLabel={next ? 'Manage rotation' : 'Set up rotation'} onPress={onManage} />
          </View>
        </GroupSurface>
        <View style={[styles.libraryHeading, stackHeading && styles.stackedHeading]}>
          <UiText type="editorSection" accessibilityRole="header" style={[styles.sectionTitle, stackHeading && styles.stackedTitle]}>Your routines</UiText>
          <FormButton appearance="v2" variant="primary" leadingIcon="plus" label="New routine" onPress={onCreate} />
        </View>
        <SegmentedControl appearance="v2" showLabel={false} label="Routines" value={archived ? 1 : 0} options={archiveOptions} onChange={value => onArchivedChange(value === 1)} />
      </>}
      {loading && <ActivityIndicator accessibilityLabel="Loading routines" color={colors.brand} />}
    </View>}
    ListEmptyComponent={ready && loaded ? <GroupSurface variant="group" style={[styles.empty, styles.bounded]}>
      <UiIcon name={archived ? 'archive' : 'dumbbell'} size={28} color={colors.brand} />
      <UiText type="cardTitle">No {archived ? 'archived' : 'active'} routines yet.</UiText>
      <UiText type="secondary" color="textSecondary">{archived ? 'Archived routines will appear here.' : 'Create a routine to build your workout library.'}</UiText>
    </GroupSurface> : null}
    ItemSeparatorComponent={() => <View style={styles.separator} />}
    renderItem={({ item }) => <RoutineCard routine={item} {...actions} />} />;
}

const styles = StyleSheet.create({
  list: { flex: 1 }, content: { padding: Space.lg, paddingBottom: Space.xl, flexGrow: 1 },
  bounded: { width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { gap: Space.lg, paddingBottom: Space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  rotation: { padding: Space.lg, gap: Space.md, borderWidth: 1 },
  rotationIcon: { width: 36, height: 36, borderRadius: Shape.control, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sectionTitle: { fontSize: 24, lineHeight: 32, flex: 1, minWidth: 0 }, next: { flex: 1, minWidth: 0 },
  manage: { paddingTop: Space.md, borderTopWidth: 1 },
  libraryHeading: { flexDirection: 'row', alignItems: 'center', gap: Space.sm }, stackedHeading: { flexDirection: 'column', alignItems: 'stretch' },
  stackedTitle: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  routine: { padding: Space.md, minHeight: 76, borderWidth: 1 },
  identity: { flex: 1, minWidth: 0, minHeight: TouchTarget, flexDirection: 'row', alignItems: 'center', gap: Space.md },
  fullWidth: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' }, details: { flex: 1, minWidth: 0, gap: Space.xs },
  routineIcon: { width: 44, height: 44, borderRadius: Shape.control, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  menu: { width: TouchTarget + 2, height: TouchTarget + 2, borderRadius: Shape.control, borderWidth: 1, flexShrink: 0 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  empty: { padding: Space.lg, gap: Space.sm }, separator: { height: Space.sm },
});

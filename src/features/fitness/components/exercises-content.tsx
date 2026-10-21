import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Keyboard, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ContextMenu } from '@/components/context-menu';
import { GroupSurface, UiIcon, UiPressable, UiText, useDesignColors } from '@/components/design-system';
import { FormButton, FormField, SegmentedControl } from '@/components/form-controls';
import { useFormSelection } from '@/components/form-selection-host';
import { DesignSpace as Space, Shape, TouchTarget } from '@/constants/design-system-v2';

import { exerciseMeasurementLabel, exerciseTypeLabel } from '../management-presentation';
import type { Exercise } from '../types';
import { measurementIcons } from '../workout-presentation';

const archiveOptions = [{ value: 0, label: 'Active' }, { value: 1, label: 'Archived' }];

export function ExerciseLibraryCard({ exercise, onOpen, onArchive }: {
  exercise: Exercise; onOpen: (exercise: Exercise) => void; onArchive: (exercise: Exercise) => void;
}) {
  const colors = useDesignColors();
  const { fontScale } = useWindowDimensions();
  const archived = exercise.deletedAt !== null;
  const type = exerciseTypeLabel(exercise.measurementType), measurement = exerciseMeasurementLabel(exercise.measurementType);
  return <GroupSurface variant={archived ? 'surface' : 'group'} testID={`exercise-library-card-${exercise.id}`}
    style={[styles.bounded, styles.card, fontScale >= 1.5 && styles.largeCard, { borderColor: colors.border }]}>
    <UiPressable accessibilityRole="button" accessibilityLabel={`Open ${exercise.name}, ${type}, ${measurement}${archived ? ', Archived' : ''}`}
      accessibilityHint="Opens read-only exercise details." onPress={() => onOpen(exercise)}
      style={[styles.identity, fontScale >= 1.5 && styles.stacked]}>
      <View style={[styles.tile, { backgroundColor: archived ? colors.inset : colors.brandSoft }]}>
        <UiIcon name={measurementIcons[exercise.measurementType]} color={archived ? colors.textMuted : colors.brand} size={26} />
      </View>
      <View style={[styles.text, fontScale >= 1.5 && styles.unflex]}><UiText type="cardTitle">{exercise.name}</UiText>
        <UiText type="metadata" color="textSecondary">{type} · {measurement}</UiText>
        {archived && <UiText type="smallLabel" color="textMuted">Archived</UiText>}
      </View>
    </UiPressable>
    {!exercise.isBuiltIn && !archived && <ContextMenu appearance="v2" label={`Options for ${exercise.name}`} actions={[
      { label: 'Archive', accessibilityLabel: `Archive ${exercise.name}`, variant: 'destructive', onPress: () => onArchive(exercise) },
    ]} />}
  </GroupSurface>;
}

/** Preserve the library's matching/order; this is deliberately not the richer routine picker. */
export function ExercisesContent({ exercises, archived, query, ready, loading, onArchivedChange, onQueryChange, onCreate, onOpen, onArchive, scrollOffset, onScrollOffset }: {
  exercises: Exercise[]; archived: boolean; query: string; ready: boolean; loading: boolean;
  onArchivedChange: (archived: boolean) => void; onQueryChange: (query: string) => void; onCreate: () => void;
  onOpen: (exercise: Exercise) => void; onArchive: (exercise: Exercise) => void; scrollOffset: number; onScrollOffset: (offset: number) => void;
}) {
  const colors = useDesignColors();
  const selection = useFormSelection();
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return exercises.filter(exercise => (exercise.deletedAt !== null) === archived && exercise.name.toLowerCase().includes(needle));
  }, [exercises, archived, query]);
  const searching = !!query.trim();
  return <FlatList testID="exercise-library-list" style={styles.list} data={filtered} keyExtractor={exercise => exercise.id}
    initialNumToRender={8} maxToRenderPerBatch={8} windowSize={5} removeClippedSubviews={false}
    automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
    contentInsetAdjustmentBehavior="never" contentContainerStyle={styles.content} contentOffset={{ x: 0, y: scrollOffset }}
    scrollEnabled={!selection.activeId} scrollEventThrottle={16}
    onScroll={event => { selection.reposition(); onScrollOffset(event.nativeEvent.contentOffset.y); }}
    ListHeaderComponent={<View style={[styles.bounded, styles.header]}>
      {ready && <>
        <FormButton appearance="v2" tone="brand" variant="primary" leadingIcon="plus" label="New exercise" onPress={onCreate} />
        <GroupSurface variant="group" testID="exercise-library-controls" style={[styles.controls, { borderColor: colors.border }]}>
          <View style={styles.text}><UiText type="sectionHeading" accessibilityRole="header">Exercise library</UiText>
            <UiText type="secondary" color="textSecondary">Manage your exercises and keep your library organized.</UiText></View>
          <SegmentedControl appearance="v2" showLabel={false} label="Exercise library" value={archived ? 1 : 0} options={archiveOptions} onChange={value => onArchivedChange(value === 1)} />
          <View style={styles.search}>
            <FormField appearance="v2" label="Search exercises" showLabel={false} placeholder="Search exercises" value={query} onChangeText={onQueryChange}
              style={styles.searchInput} autoCorrect={false} autoCapitalize="none" clearButtonMode="while-editing" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
            <View pointerEvents="none" style={styles.searchIcon}><UiIcon name="search" size={20} color={colors.textMuted} /></View>
          </View>
        </GroupSurface>
      </>}
      {loading && <ActivityIndicator accessibilityLabel="Loading exercises" color={colors.brand} />}
    </View>}
    ListEmptyComponent={ready ? <GroupSurface variant="group" style={[styles.bounded, styles.empty, { borderColor: colors.border }]}>
      <UiIcon name={searching ? 'search' : archived ? 'archive' : 'dumbbell'} size={28} color={colors.brand} />
      <UiText type="cardTitle">{searching ? 'No exercises found.' : `No ${archived ? 'archived' : 'active'} exercises yet.`}</UiText>
      <UiText type="secondary" color="textSecondary">{searching ? 'Try a different search.' : archived ? 'Archived exercises will appear here.' : 'Create an exercise to build your library.'}</UiText>
    </GroupSurface> : null}
    ItemSeparatorComponent={() => <View style={styles.separator} />}
    renderItem={({ item }) => <ExerciseLibraryCard exercise={item} onOpen={onOpen} onArchive={onArchive} />} />;
}

const styles = StyleSheet.create({
  list: { flex: 1 }, content: { padding: Space.lg, paddingBottom: Space.xl, flexGrow: 1 },
  bounded: { width: '100%', maxWidth: 640, alignSelf: 'center' }, header: { gap: Space.lg, paddingBottom: Space.md },
  controls: { borderWidth: 1, padding: Space.md, gap: Space.md },
  text: { flex: 1, minWidth: 0, gap: Space.xs },
  search: { width: '100%' }, searchInput: { paddingLeft: 44 },
  searchIcon: { position: 'absolute', left: Space.md, top: 0, bottom: 0, justifyContent: 'center' },
  card: { padding: Space.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: Space.sm, minHeight: 76 },
  largeCard: { alignItems: 'flex-start' },
  identity: { flex: 1, minWidth: 0, minHeight: TouchTarget, flexDirection: 'row', alignItems: 'center', gap: Space.md },
  tile: { width: 44, height: 44, borderRadius: Shape.control, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stacked: { flexDirection: 'column', alignItems: 'stretch' }, unflex: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  separator: { height: Space.sm }, empty: { padding: Space.lg, gap: Space.sm, borderWidth: 1 },
});

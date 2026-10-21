import { FlatList, Keyboard, StyleSheet, View } from 'react-native';

import { AdaptiveSheet, useSheetScrollProps } from '@/components/adaptive-sheet';
import { BackButton } from '@/components/back-button';
import { UiIcon, UiPressable, UiText, useDesignColors } from '@/components/design-system';
import { FormButton, FormField } from '@/components/form-controls';
import { DesignSpace as Space } from '@/constants/design-system-v2';

import { exerciseResults, measurementLabel } from '../form';
import { exerciseMeasurementLabel } from '../management-presentation';
import type { Exercise } from '../types';
import { measurementIcons } from '../workout-presentation';
import { RoutineScrollView } from './routine-composition';

type Props = { exercises: readonly Exercise[]; query: string; onQueryChange: (query: string) => void;
  onSelect: (exercise: Exercise) => void; onCreate: (query: string) => void; onDismiss: () => void };

/** A focused surface in the existing native modal, never an anchored selection overlay. */
export function RoutineExercisePicker(props: Props) {
  return <AdaptiveSheet appearance="v2" fillHeight title="Add exercise" onDismiss={props.onDismiss}
    header={<View style={styles.header}>
      <View style={styles.headingRow}><BackButton appearance="v2" iconOnly accessibilityLabel="Back to routine editor" onPress={props.onDismiss} />
        <UiText type="editorSection" accessibilityRole="header" style={styles.heading}>Add exercise</UiText></View>
      <UiText type="secondary" color="textSecondary">Choose an exercise for this routine.</UiText>
    </View>}
    scrollBody={<RoutineExerciseResults {...props} />} />;
}

function RoutineExerciseResults({ exercises, query, onQueryChange, onSelect, onCreate }: Props) {
  const colors = useDesignColors();
  const { ref: sheetRef, ...scrollProps } = useSheetScrollProps();
  // Keep the established matching, canonical identity and name ordering. Unlike a short
  // autocomplete, this scrollable picker exposes every match, beyond the default 20.
  const results = exerciseResults(exercises, query, exercises.length);
  const byId = new Map(exercises.map(exercise => [exercise.id, exercise]));
  const matches = results.suggestions.map(result => byId.get(result.value)!);
  return <View style={styles.body} testID="routine-exercise-picker">
    <View style={styles.search}><FormField appearance="v2" label="Search exercises" showLabel={false} placeholder="Search exercises"
      value={query} onChangeText={onQueryChange} autoFocus autoCorrect={false} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} /></View>
    <FlatList {...scrollProps} testID="routine-exercise-results" data={matches} keyExtractor={exercise => exercise.id}
      initialNumToRender={8} maxToRenderPerBatch={8} windowSize={5} removeClippedSubviews={false}
      renderScrollComponent={props => <RoutineScrollView {...props} sheetRef={sheetRef} />}
      keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.results}
      ListEmptyComponent={<UiText type="secondary" color="textSecondary" accessibilityLiveRegion="polite" style={styles.empty}>No exercises found.</UiText>}
      renderItem={({ item }) => <UiPressable testID={`exercise-result-${item.id}`} accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${measurementLabel(item.measurementType)}, ${exerciseMeasurementLabel(item.measurementType)}`}
        accessibilityHint="Adds this exercise to the routine and returns to the editor."
        onPress={() => onSelect(item)} style={[styles.row, { borderColor: colors.border }]}>
        <View style={[styles.icon, { backgroundColor: colors.brandSoft }]}><UiIcon name={measurementIcons[item.measurementType]} color={colors.brand} size={22} /></View>
        <View style={styles.text}><UiText type="cardTitle">{item.name}</UiText>
          <UiText type="metadata" color="textSecondary">{measurementLabel(item.measurementType)} · {exerciseMeasurementLabel(item.measurementType)}</UiText></View>
      </UiPressable>} />
    <View style={[styles.create, { borderColor: colors.border }]}>
      <FormButton appearance="v2" variant="quiet" tone="brand" leadingIcon="plus" label="Create new exercise"
        disabled={!!query.trim() && !results.createLabel} onPress={() => onCreate(query)} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  header: { padding: Space.md, paddingBottom: Space.sm, gap: Space.xs },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: Space.xs }, heading: { flex: 1, minWidth: 0 },
  body: { flex: 1, minHeight: 0 }, search: { paddingHorizontal: Space.md, paddingBottom: Space.sm, flexShrink: 0 },
  results: { paddingHorizontal: Space.md },
  row: { minHeight: 64, paddingVertical: Space.sm, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  text: { flex: 1, minWidth: 0, gap: Space.xs },
  empty: { paddingVertical: Space.lg }, create: { padding: Space.sm, borderTopWidth: 1, flexShrink: 0 },
});

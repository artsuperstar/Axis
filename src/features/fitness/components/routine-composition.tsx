import { useCallback, type ReactNode, type Ref } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions, type ScrollView, type ScrollViewProps } from 'react-native';

import { BackButton } from '@/components/back-button';
import { useSheetScrollProps } from '@/components/adaptive-sheet';
import { GroupSurface, UiIcon, UiText, useDesignColors } from '@/components/design-system';
import { EditorSection } from '@/components/editor-section';
import { FormButton } from '@/components/form-controls';
import { FormScrollView } from '@/components/form-selection-host';
import { DesignSpace as Space, Shape } from '@/constants/design-system-v2';

import { measurementLabel } from '../form';
import { exerciseMeasurementLabel } from '../management-presentation';
import type { Exercise } from '../types';
import { measurementIcons } from '../workout-presentation';

export function RoutineHeader({ title, onDismiss, onSave, action = 'Save' }: {
  title: string; onDismiss: () => void; onSave?: () => void; action?: string;
}) {
  const { width, fontScale } = useWindowDimensions();
  const large = width < 360 || fontScale >= 1.5;
  const colors = useDesignColors();
  const back = onSave ? <FormButton appearance="v2" compact variant="quiet" tone="brand" leadingIcon="back" label="Cancel" onPress={onDismiss} />
    : <View style={[styles.back, { backgroundColor: colors.control }]}><BackButton appearance="v2" iconOnly onPress={onDismiss} /></View>;
  const save = onSave && <FormButton appearance="v2" variant="primary" label={action} onPress={onSave} />;
  const heading = <UiText type="editorTitle" accessibilityRole="header" style={[!large && styles.title,
    width < 360 && { fontSize: 22, lineHeight: 30 }]}>{title}</UiText>;
  return <View style={styles.header}>{large ? <>{heading}<View style={styles.headerActions}>{back}{save}</View></>
    : <View style={styles.headerRow}>{back}{heading}{save}</View>}</View>;
}

type CompositionEntry = { key: string; exercise: Exercise };

// VirtualizedList replaces the returned element's ref. Forward it to both owners:
// its measurement/scroll machinery and AdaptiveSheet's focused-input reveal.
export function RoutineScrollView({ sheetRef, ref, ...props }: ScrollViewProps & { sheetRef: Ref<ScrollView>; ref?: Ref<ScrollView> }) {
  const attach = useCallback((node: ScrollView | null) => {
    for (const target of [sheetRef, ref]) {
      if (typeof target === 'function') target(node);
      else if (target) target.current = node;
    }
  }, [sheetRef, ref]);
  return <FormScrollView {...props} ref={attach} />;
}

/** One bounded list. Drafts and target expansion live in the editor, outside recycled rows. */
export function RoutineComposition<T extends CompositionEntry>({ entries, identity, addExercise, summary, renderActions, renderTargets, readOnly = false }: {
  entries: readonly T[]; identity: ReactNode; addExercise?: ReactNode;
  summary: (entry: T) => string; renderActions?: (entry: T, index: number) => ReactNode; renderTargets?: (entry: T) => ReactNode; readOnly?: boolean;
}) {
  const colors = useDesignColors();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 390 || fontScale >= 1.3;
  const { ref: scrollRef, ...bodyProps } = useSheetScrollProps();
  const edge = { backgroundColor: colors.group, borderColor: colors.border };
  return <FlatList {...bodyProps} testID="routine-composition-list" data={entries} keyExtractor={(entry) => entry.key}
    initialNumToRender={5} maxToRenderPerBatch={5} windowSize={5} removeClippedSubviews={false}
    renderScrollComponent={(props) => <RoutineScrollView {...props} sheetRef={scrollRef} />}
    contentContainerStyle={styles.content}
    ListHeaderComponent={<View>
      <EditorSection title="Routine" description={readOnly ? 'Archived routine · Read-only. Workout history is unchanged.' : ''} icon="dumbbell" variant="group">{identity}</EditorSection>
      <View style={[styles.exercisesHeading, edge]}>
        <View style={[styles.sectionHeader, stacked && styles.stacked]}>
          <View style={[styles.headingIdentity, stacked && styles.unflex]}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.brandSoft }]}><UiIcon name="list" color={colors.brand} size={22} /></View>
            <View style={styles.text}><UiText type="editorSection" accessibilityRole="header">Exercises</UiText>
              <UiText type="metadata" color="textSecondary">{entries.length} {entries.length === 1 ? 'exercise' : 'exercises'}</UiText></View>
          </View>
          {addExercise && <View style={stacked ? styles.addStacked : styles.add}>{addExercise}</View>}
        </View>
      </View>
    </View>}
    ListEmptyComponent={<View style={[styles.rowWrap, edge]}><View style={styles.empty}>
      <UiIcon name="dumbbell" color={colors.textMuted} size={28} />
      <UiText type="cardTitle">No exercises yet.</UiText>
      {!readOnly && <UiText type="secondary" color="textSecondary" style={styles.center}>Add exercises to build this routine.</UiText>}
    </View></View>}
    renderItem={({ item, index }) => <View style={[styles.rowWrap, edge]}>
      <GroupSurface variant="surface" testID={`routine-entry-${item.key}`} style={[styles.card, { borderColor: colors.border }]}>
        <View style={[styles.identity, fontScale >= 1.5 && styles.stacked]}>
          <View style={[styles.tile, { backgroundColor: item.exercise.deletedAt === null ? colors.brandSoft : colors.inset }]}>
            <UiIcon name={measurementIcons[item.exercise.measurementType]} color={item.exercise.deletedAt === null ? colors.brand : colors.textMuted} size={26} />
          </View>
          <View style={[styles.text, fontScale >= 1.5 && styles.unflex]}>
            <UiText type="editorSection" accessibilityRole="header">{index + 1}. {item.exercise.name}</UiText>
            <UiText type="metadata" color="textSecondary">{measurementLabel(item.exercise.measurementType)} · {exerciseMeasurementLabel(item.exercise.measurementType)}</UiText>
            {item.exercise.deletedAt !== null && <UiText type="metadata" color="textMuted">Archived — omitted from new workouts</UiText>}
            <UiText type="metadata" color="textSecondary">{summary(item)}</UiText>
          </View>
        </View>
        {renderActions && <View style={[styles.actions, { borderColor: colors.border }]}>{renderActions(item, index)}</View>}
        {renderTargets?.(item)}
      </GroupSurface>
    </View>}
    ListFooterComponent={<View style={[styles.sectionEnd, edge]} />} />;
}

const styles = StyleSheet.create({
  header: { padding: Space.md, gap: Space.sm }, headerRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  headerActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { flex: 1, minWidth: 0, textAlign: 'center' }, back: { borderRadius: 24, overflow: 'hidden', flexShrink: 0 },
  content: { padding: Space.md, paddingTop: 0 },
  exercisesHeading: { marginTop: Space.md, padding: Space.md, borderWidth: 1, borderBottomWidth: 0, borderTopLeftRadius: Shape.group, borderTopRightRadius: Shape.group },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  headingIdentity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  sectionIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  add: { maxWidth: '60%', flexShrink: 1 }, addStacked: { alignSelf: 'flex-start', maxWidth: '100%' },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  rowWrap: { borderLeftWidth: 1, borderRightWidth: 1, paddingHorizontal: Space.sm, paddingBottom: Space.sm },
  sectionEnd: { height: Space.md, borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: Shape.group, borderBottomRightRadius: Shape.group },
  card: { padding: Space.sm, gap: Space.sm, borderWidth: 1 },
  identity: { flexDirection: 'row', gap: Space.sm, alignItems: 'flex-start' },
  tile: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  text: { flex: 1, minWidth: 0, gap: Space.xs }, unflex: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  actions: { borderTopWidth: 1, paddingTop: Space.sm, gap: Space.xs, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  empty: { padding: Space.lg, gap: Space.sm, alignItems: 'center' }, center: { textAlign: 'center' },
});

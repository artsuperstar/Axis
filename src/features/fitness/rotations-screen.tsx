import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-screens/experimental';

import { BackButton } from '@/components/back-button';
import { FormButton, FormError, FormField, FormScrollView, SelectField } from '@/components/form-controls';
import { ContextMenu, ContextMenuHost } from '@/components/context-menu';
import { DesignProvider, GroupSurface, UiIcon, UiPressable, UiText, useDesignColors } from '@/components/design-system';
import { EditorSection } from '@/components/editor-section';
import { useFormSelection } from '@/components/form-selection-host';
import { DesignSpace as Space, Shape, TouchTarget } from '@/constants/design-system-v2';

import { RoutineHeader } from './components/routine-composition';
import { fitnessError } from './form';
import type { RotationDetail, RotationDraft, Routine } from './types';
import { useRotations } from './use-rotations';

function backToFitness() { if (router.canGoBack()) router.back(); else router.replace('/(tabs)/fitness'); }
function RotationPage({ children }: { children: ReactNode }) {
  const colors = useDesignColors();
  return <DesignProvider><SafeAreaView edges={{ top: true, bottom: true, left: true, right: true }} style={{ flex: 1, backgroundColor: colors.canvas }}>
    <ContextMenuHost safeAreaApplied>{children}</ContextMenuHost>
  </SafeAreaView></DesignProvider>;
}

export function WorkoutRotationsScreen() {
  const fitness = useRotations(); const [actionError, setError] = useState<string | null>(null);
  function perform(action: () => void) { try { fitness.mutate(action); setError(null); } catch (cause) { setError(fitnessError(cause)); } }
  function confirm(rotation: RotationDetail, reset: boolean) {
    Alert.alert(reset ? 'Reset rotation?' : 'Delete rotation?', reset ? `Set the first workout in “${rotation.name}” as next? Workout history stays unchanged.`
      : `Delete “${rotation.name}”? Routines and workout history stay unchanged.`, [
      { text: 'Cancel', style: 'cancel' }, { text: reset ? 'Reset' : 'Delete', style: reset ? 'default' : 'destructive',
        onPress: () => perform(() => reset ? fitness.access.reset(rotation.id) : fitness.access.delete(rotation.id)) },
    ]);
  }
  return <RotationPage><RotationList rotations={fitness.snapshot?.rotations ?? []} loaded={!!fitness.snapshot}
    error={fitness.error || actionError} onRetry={fitness.reload}
    renderCard={(rotation) => {
      const next = rotation.steps.find((step) => step.id === rotation.nextStepId);
      const edit = () => router.push({ pathname: '/fitness/rotation', params: { rotationId: rotation.id } });
      return <RotationCard rotation={rotation} next={next?.routine.name ?? null} onEdit={edit}
        menu={<ContextMenu appearance="v2" label={`Options for ${rotation.name}`} actions={[
            { label: 'Edit', accessibilityLabel: `Edit ${rotation.name}`, onPress: edit },
            { label: rotation.isActive ? 'Deactivate' : 'Set active', accessibilityLabel: `${rotation.isActive ? 'Deactivate' : 'Set active'} ${rotation.name}`,
              disabled: rotation.locked, onPress: () => perform(() => rotation.isActive ? fitness.access.deactivate(rotation.id) : fitness.access.activate(rotation.id)) },
            { label: 'Reset rotation', accessibilityLabel: `Reset ${rotation.name}`, disabled: rotation.locked, onPress: () => confirm(rotation, true) },
            { label: 'Delete', accessibilityLabel: `Delete ${rotation.name}`, disabled: rotation.locked, variant: 'destructive', onPress: () => confirm(rotation, false) },
          ]} />} />;
    }} /></RotationPage>;
}

function RotationList({ rotations, loaded, error, onRetry, renderCard }: {
  rotations: RotationDetail[]; loaded: boolean; error: string | null; onRetry: () => void; renderCard: (rotation: RotationDetail) => ReactNode;
}) {
  const colors = useDesignColors();
  const selection = useFormSelection();
  const { width } = useWindowDimensions();
  return <FlatList testID="workout-rotations-list" style={styles.list} data={rotations} keyExtractor={(rotation) => rotation.id}
    initialNumToRender={6} maxToRenderPerBatch={6} windowSize={5} removeClippedSubviews={false}
    contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="never"
    scrollEnabled={!selection.activeId} scrollEventThrottle={16} onScroll={selection.reposition}
    ListHeaderComponent={<View style={[styles.inner, styles.header]}>
      <View style={[styles.back, { backgroundColor: colors.control, borderColor: colors.border }]}>
        <BackButton appearance="v2" iconOnly onPress={backToFitness} accessibilityLabel="Back from workout rotations" />
      </View>
      <View style={styles.context}><UiText type="screenTitle" accessibilityRole="header" style={width < 360 && styles.narrowTitle}>Workout rotations</UiText>
        <UiText color="textSecondary">Rotations help you organize the order of your workouts. Create different rotations for different goals or phases.</UiText></View>
      <FormButton appearance="v2" tone="brand" variant="primary" leadingIcon="plus" label="New rotation" onPress={() => router.push('/fitness/rotation')} />
      <FormError message={error} appearance="v2" />{error && <FormButton appearance="v2" variant="quiet" label="Retry" onPress={onRetry} />}
      {!loaded && !error && <ActivityIndicator accessibilityLabel="Loading workout rotations" color={colors.brand} />}
    </View>}
    ItemSeparatorComponent={() => <View style={styles.separator} />}
    ListEmptyComponent={loaded ? <GroupSurface style={[styles.inner, styles.empty, { borderColor: colors.border }]}>
      <UiIcon name="repeat" color={colors.brand} size={28} />
      <UiText type="cardTitle">No workout rotations yet.</UiText>
      <UiText color="textSecondary">Create a rotation to organize the order of your routines.</UiText>
    </GroupSurface> : undefined}
    renderItem={({ item }) => <>{renderCard(item)}</>} />;
}

function RotationCard({ rotation, next, onEdit, menu }: { rotation: RotationDetail; next: string | null; onEdit: () => void; menu: ReactNode }) {
  const colors = useDesignColors();
  const { fontScale } = useWindowDimensions();
  return <GroupSurface variant="group" testID={`rotation-card-${rotation.id}`} style={[styles.inner, styles.card, { borderColor: colors.border }]}>
    <View style={styles.identityRow}>
      <UiPressable accessibilityRole="button" accessibilityLabel={`Edit ${rotation.name}`}
        accessibilityHint={`${rotation.isActive ? 'Active' : 'Inactive'}. Next: ${next ?? 'No next routine'}. Opens the rotation editor.`}
        onPress={onEdit} style={[styles.rotationObject, fontScale >= 1.5 && styles.stacked]}>
        <View style={[styles.tile, { backgroundColor: colors.brandSoft }]}><UiIcon name="repeat" size={28} color={colors.brand} /></View>
        <View style={[styles.details, fontScale >= 1.5 && styles.unflex]}>
          <UiText type="cardTitle" style={styles.rotationName}>{rotation.name}</UiText>
          <View style={[styles.badge, { backgroundColor: rotation.isActive ? colors.brandSoft : colors.inset }]}>
            <UiText type="smallLabel" color={rotation.isActive ? 'brand' : 'textSecondary'}>{rotation.isActive ? 'Active' : 'Inactive'}</UiText>
          </View>
        </View>
      </UiPressable><View style={[styles.menu, { backgroundColor: colors.control }]}>{menu}</View>
    </View>
    <View style={[styles.rotationDetails, { borderTopColor: colors.border }]}>
      <UiText accessibilityLabel={`Next: ${next ?? 'No next routine'}`}><UiText color="textMuted">Next: </UiText>{next ?? 'No next routine'}</UiText>
      <UiText type="secondary" color="textSecondary">{rotation.steps.map((step) => step.routine.name).join(' → ')}</UiText>
      {rotation.locked && <UiText type="secondary" color="textMuted">Finish or discard the linked workout before changing its steps or activation.</UiText>}
    </View>
  </GroupSurface>;
}

type EditorStep = { key: string; id: string | null; routineId: string; name: string };
export function RotationEditor({ rotation, routines, locked, onSave, onCancel }: {
  rotation: RotationDetail | null; routines: Routine[]; locked: boolean; onSave: (draft: RotationDraft) => void; onCancel: () => void;
}) {
  const colors = useDesignColors();
  const [name, setName] = useState(rotation?.name ?? '');
  const [steps, setSteps] = useState<EditorStep[]>(() => rotation?.steps.map((step) => ({ key: step.id, id: step.id, routineId: step.routineId, name: step.routine.name })) ?? []);
  const [nextKey, setNextKey] = useState<string | null>(rotation?.nextStepId ?? null);
  const [explicitNext, setExplicitNext] = useState(!rotation);
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null); const saving = useRef(false);
  // Capture the source version once: refreshes must never overwrite a dirty name/order/next draft.
  const original = useRef(rotation);
  function move(index: number, direction: number) {
    const ordered = [...steps]; [ordered[index], ordered[index + direction]] = [ordered[index + direction], ordered[index]]; setSteps(ordered); setError(null);
  }
  function remove(index: number) {
    const removed = steps[index]; const remaining = steps.filter((_, position) => position !== index); setSteps(remaining);
    if (removed.key === nextKey) {
      // Mirror the data rule for the draft preview, walking forward through the previous order.
      setNextKey(steps.slice(index + 1).concat(steps.slice(0, index)).find((step) => step.key !== removed.key)?.key ?? null);
    }
    setError(null);
  }
  function save() {
    if (saving.current) return;
    saving.current = true;
    try {
      onSave({ name, steps: steps.map(({ id, routineId }) => ({ id, routineId })), updatedAt: original.current?.updatedAt,
        ...(explicitNext && nextKey ? { nextStepIndex: steps.findIndex((step) => step.key === nextKey) } : {}) });
    } catch (cause) { setError(fitnessError(cause)); saving.current = false; }
  }
  return <View style={styles.list}>
    <View style={styles.inner}><RoutineHeader title={rotation ? 'Edit rotation' : 'New rotation'} onDismiss={onCancel} onSave={save} /></View>
    <FlatList testID="rotation-editor-list" style={styles.list} data={steps} keyExtractor={(step) => step.key}
      initialNumToRender={6} maxToRenderPerBatch={6} windowSize={5} removeClippedSubviews={false}
      renderScrollComponent={(props) => <FormScrollView {...props} />}
      keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentInsetAdjustmentBehavior="never"
      contentContainerStyle={styles.editorContent}
      ListHeaderComponent={<View style={[styles.inner, styles.editorHeading]}>
        <FormError message={error} appearance="v2" />
        <EditorSection title="Rotation" description="" icon="repeat" variant="group">
          <FormField appearance="v2" label="Rotation name *" value={name} maxLength={120} onChangeText={(value) => { setName(value); setError(null); }} />
        </EditorSection>
        <View style={styles.context}><UiText type="editorSection" accessibilityRole="header">Routines</UiText>
          <UiText type="metadata" color="textSecondary">{steps.length} {steps.length === 1 ? 'routine' : 'routines'}</UiText></View>
        {locked && <UiText type="secondary" color="textSecondary">Finish or discard the linked workout before changing its steps or next workout. You can still rename this rotation.</UiText>}
      </View>}
      ItemSeparatorComponent={() => <View style={styles.editorSeparator} />}
      renderItem={({ item: step, index }) => <GroupSurface variant="group" testID={`rotation-step-${step.key}`} style={[styles.inner, styles.step, { borderColor: colors.border }]}>
      <View style={styles.identityRow}><View style={[styles.routineTile, { backgroundColor: colors.brandSoft }]}><UiIcon name="dumbbell" color={colors.brand} size={24} /></View>
        <View style={styles.details}><UiText type="cardTitle" accessibilityLabel={`${step.name}, workout ${index + 1} of ${steps.length}${step.key === nextKey ? ', next workout' : ''}`}>{index + 1}. {step.name}</UiText>
          {step.key === nextKey && <UiText type="metadata" color="brand">Next workout</UiText>}</View></View>
      <View style={styles.actions}>
        <FormButton appearance="v2" variant="secondary" icon="up" label="Move up" accessibilityLabel={`Move ${step.name} up, workout ${index + 1} of ${steps.length}`} disabled={locked || index === 0} onPress={() => move(index, -1)} />
        <FormButton appearance="v2" variant="secondary" icon="down" label="Move down" accessibilityLabel={`Move ${step.name} down, workout ${index + 1} of ${steps.length}`} disabled={locked || index === steps.length - 1} onPress={() => move(index, 1)} />
        <View style={styles.actionBoundary}><FormButton appearance="v2" variant="secondary" leadingIcon="forward" label="Set as next workout" accessibilityLabel={`Set ${step.name} as next workout, workout ${index + 1} of ${steps.length}`} selected={step.key === nextKey} disabled={locked}
          onPress={() => { setNextKey(step.key); setExplicitNext(true); setError(null); }} /></View>
        <FormButton appearance="v2" variant="destructive" leadingIcon="trash" label="Remove" accessibilityLabel={`Remove ${step.name}, workout ${index + 1} of ${steps.length}`} disabled={locked} onPress={() => remove(index)} />
      </View>
    </GroupSurface>}
    ListEmptyComponent={<View style={styles.inner}><UiText color="textSecondary">Add at least one routine.</UiText></View>}
    ListFooterComponent={<View style={[styles.inner, styles.editorFooter]}><EditorSection title="Add routine" description="" icon="plus" variant="group">
    <SelectField<string | null> appearance="v2" label="Routine to add" value={routineId} disabled={locked}
      options={[{ value: null, label: 'Choose a routine' }, ...routines.map((routine) => ({ value: routine.id, label: routine.name }))]} onChange={setRoutineId} />
    <FormButton appearance="v2" variant="secondary" leadingIcon="plus" label="+ Add routine" disabled={locked || !routines.some((routine) => routine.id === routineId)} onPress={() => {
      const routine = routines.find((routine) => routine.id === routineId)!; const key = randomUUID();
      setSteps([...steps, { key, id: null, routineId: routine.id, name: routine.name }]); if (!nextKey) setNextKey(key); setRoutineId(null); setError(null);
    }} />
    {!routines.length && <UiText color="textSecondary">Create a routine in Fitness first.</UiText>}
    </EditorSection></View>} />
  </View>;
}

export function WorkoutRotationEditorScreen() {
  const { rotationId } = useLocalSearchParams<{ rotationId?: string }>();
  const fitness = useRotations();
  const id = typeof rotationId === 'string' && rotationId ? rotationId : null;
  const rotation = fitness.snapshot?.rotations.find((row) => row.id === id) ?? null;
  function back() { if (router.canGoBack()) router.back(); else router.replace('/fitness/rotations'); }
  return <RotationPage>
    <View style={[styles.inner, { paddingHorizontal: Space.md }]}><FormError message={fitness.error} appearance="v2" />
      {fitness.error && <FormButton appearance="v2" variant="quiet" label="Retry" onPress={fitness.reload} />}</View>
    {(!fitness.snapshot || (id && !rotation)) && <RoutineHeader title={id ? 'Edit rotation' : 'New rotation'} onDismiss={back} />}
    {!fitness.snapshot ? !fitness.error && <ActivityIndicator accessibilityLabel="Loading rotation editor" />
      : id && !rotation ? <FormError message="This rotation is no longer available." />
        : <RotationEditor key={id ?? 'new'} rotation={rotation} routines={fitness.snapshot.routines} locked={rotation?.locked ?? false} onCancel={back}
          onSave={(draft) => { fitness.mutate(() => id ? fitness.access.edit(id, draft) : fitness.access.create(draft)); back(); }} />}
  </RotationPage>;
}

const styles = StyleSheet.create({
  inner: { width: '100%', maxWidth: 640, alignSelf: 'center' }, list: { flex: 1 },
  header: { gap: Space.section, paddingBottom: Space.section }, context: { gap: Space.sm },
  narrowTitle: { fontSize: 32, lineHeight: 42 },
  back: { width: TouchTarget, height: TouchTarget, borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  content: { padding: Space.lg, paddingBottom: Space.xl, flexGrow: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.sm },
  actionBoundary: { maxWidth: '100%', flexShrink: 1 },
  card: { padding: Space.lg, gap: Space.md, borderWidth: 1 }, identityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.md },
  rotationObject: { flex: 1, minWidth: 0, minHeight: TouchTarget, flexDirection: 'row', alignItems: 'flex-start', gap: Space.lg },
  details: { flex: 1, minWidth: 0, gap: Space.sm }, rotationName: { fontSize: 18, lineHeight: 26 },
  tile: { width: 52, height: 52, borderRadius: Shape.control, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: Space.sm, paddingVertical: Space.xs, borderRadius: Shape.status },
  rotationDetails: { borderTopWidth: 1, paddingTop: Space.md, gap: Space.sm },
  menu: { width: TouchTarget, height: TouchTarget, borderRadius: 24, flexShrink: 0 },
  separator: { height: Space.md }, empty: { padding: Space.lg, gap: Space.sm, borderWidth: 1 },
  stacked: { flexDirection: 'column', alignItems: 'stretch' }, unflex: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  editorContent: { padding: Space.md, paddingTop: 0, paddingBottom: Space.xl }, editorHeading: { gap: Space.lg, paddingBottom: Space.md },
  step: { padding: Space.md, borderWidth: 1, gap: Space.md }, editorSeparator: { height: Space.sm }, editorFooter: { paddingTop: Space.lg },
  routineTile: { width: 40, height: 40, borderRadius: Shape.control, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});

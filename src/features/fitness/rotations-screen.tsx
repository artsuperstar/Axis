import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-screens/experimental';

import { BackButton } from '@/components/back-button';
import { FormButton, FormError, FormField, FormScrollView, SelectField } from '@/components/form-controls';
import { ContextMenu, ContextMenuHost } from '@/components/context-menu';
import { ThemedText } from '@/components/themed-text';
import { ControlSize, Radius, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { fitnessError } from './form';
import type { RotationDetail, RotationDraft, Routine } from './types';
import { useRotations } from './use-rotations';

function backToFitness() { if (router.canGoBack()) router.back(); else router.replace('/(tabs)/fitness'); }
function RotationPage({ title, onBack, children, error, onRetry }: { title: string; onBack: () => void; children: ReactNode; error: string | null; onRetry: () => void }) {
  const colors = useTheme();
  return <SafeAreaView edges={{ top: true, bottom: true, left: true, right: true }} style={{ flex: 1, backgroundColor: colors.background }}>
    <ContextMenuHost>
      <View style={[styles.inner, styles.header]}>
        <View style={styles.actions}><BackButton onPress={onBack} accessibilityLabel={`Back from ${title.toLowerCase()}`} />
          <ThemedText type="screenTitle" accessibilityRole="header" style={{ flex: 1 }}>{title}</ThemedText></View>
        <FormError message={error} />{error && <FormButton variant="quiet" label="Retry" onPress={onRetry} />}
      </View>
      <FormScrollView style={{ flex: 1 }} contentInsetAdjustmentBehavior="never" keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.inner, styles.content]}>{children}</FormScrollView>
    </ContextMenuHost>
  </SafeAreaView>;
}

export function WorkoutRotationsScreen() {
  const colors = useTheme(); const fitness = useRotations(); const [actionError, setError] = useState<string | null>(null);
  function perform(action: () => void) { try { fitness.mutate(action); setError(null); } catch (cause) { setError(fitnessError(cause)); } }
  function confirm(rotation: RotationDetail, reset: boolean) {
    Alert.alert(reset ? 'Reset rotation?' : 'Delete rotation?', reset ? `Set the first workout in “${rotation.name}” as next? Workout history stays unchanged.`
      : `Delete “${rotation.name}”? Routines and workout history stay unchanged.`, [
      { text: 'Cancel', style: 'cancel' }, { text: reset ? 'Reset' : 'Delete', style: reset ? 'default' : 'destructive',
        onPress: () => perform(() => reset ? fitness.access.reset(rotation.id) : fitness.access.delete(rotation.id)) },
    ]);
  }
  return <RotationPage title="Workout rotations" onBack={backToFitness} error={fitness.error || actionError} onRetry={fitness.reload}>
    <FormButton variant="primary" label="New rotation" onPress={() => router.push('/fitness/rotation')} />
    {!fitness.snapshot && !fitness.error && <ActivityIndicator accessibilityLabel="Loading workout rotations" color={colors.accent} />}
    {fitness.snapshot && !fitness.snapshot.rotations.length && <ThemedText themeColor="textSecondary">Build an optional cycle from your routines. It advances when you complete the next workout.</ThemedText>}
    {fitness.snapshot?.rotations.map((rotation) => {
      const next = rotation.steps.find((step) => step.id === rotation.nextStepId)!;
      const edit = () => router.push({ pathname: '/fitness/rotation', params: { rotationId: rotation.id } });
      return <View key={rotation.id} style={[styles.row, { borderColor: colors.border }]}>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${rotation.name}`} accessibilityHint="Opens the rotation editor."
            onPress={edit} style={({ pressed }) => [styles.rotationObject, pressed && { backgroundColor: colors.surfaceMuted }]}>
            <ThemedText type="cardTitle">{rotation.name}</ThemedText>
            <ThemedText type="secondary" themeColor="textSecondary">{rotation.isActive ? 'Active' : 'Inactive'} · Next: {next.routine.name}</ThemedText>
            <ThemedText type="metadata" themeColor="textSecondary">{rotation.steps.map((step) => step.routine.name).join(' → ')}</ThemedText>
          </Pressable>
          <ContextMenu label={`Options for ${rotation.name}`} actions={[
            { label: 'Edit', accessibilityLabel: `Edit ${rotation.name}`, onPress: edit },
            { label: rotation.isActive ? 'Deactivate' : 'Set active', accessibilityLabel: `${rotation.isActive ? 'Deactivate' : 'Set active'} ${rotation.name}`,
              disabled: rotation.locked, onPress: () => perform(() => rotation.isActive ? fitness.access.deactivate(rotation.id) : fitness.access.activate(rotation.id)) },
            { label: 'Reset rotation', accessibilityLabel: `Reset ${rotation.name}`, disabled: rotation.locked, onPress: () => confirm(rotation, true) },
            { label: 'Delete', accessibilityLabel: `Delete ${rotation.name}`, disabled: rotation.locked, variant: 'destructive', onPress: () => confirm(rotation, false) },
          ]} />
        </View>
        {rotation.locked && <ThemedText type="secondary" themeColor="textSecondary">Finish or discard the linked workout before changing its steps or activation.</ThemedText>}
      </View>;
    })}
  </RotationPage>;
}

type EditorStep = { key: string; id: string | null; routineId: string; name: string };
export function RotationEditor({ rotation, routines, locked, onSave, onCancel }: {
  rotation: RotationDetail | null; routines: Routine[]; locked: boolean; onSave: (draft: RotationDraft) => void; onCancel: () => void;
}) {
  const colors = useTheme();
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
  return <View style={styles.editor}>
    <FormError message={error} />
    <FormField label="Name *" value={name} maxLength={120} onChangeText={(value) => { setName(value); setError(null); }} />
    <ThemedText type="sectionHeading" accessibilityRole="header">Workouts</ThemedText>
    {locked && <ThemedText type="secondary" themeColor="textSecondary">Finish or discard the linked workout before changing its steps or next workout. You can still rename this rotation.</ThemedText>}
    {steps.map((step, index) => <View key={step.key} style={[styles.step, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <ThemedText type="cardTitle" accessibilityLabel={`${step.name}, workout ${index + 1} of ${steps.length}${step.key === nextKey ? ', next workout' : ''}`}>{index + 1}. {step.name}</ThemedText>
      {step.key === nextKey && <ThemedText type="metadata" themeColor="textSecondary">Next workout</ThemedText>}
      <View style={styles.actions}>
        <FormButton variant="quiet" label="Move up" accessibilityLabel={`Move ${step.name} up, workout ${index + 1} of ${steps.length}`} disabled={locked || index === 0} onPress={() => move(index, -1)} />
        <FormButton variant="quiet" label="Move down" accessibilityLabel={`Move ${step.name} down, workout ${index + 1} of ${steps.length}`} disabled={locked || index === steps.length - 1} onPress={() => move(index, 1)} />
        <FormButton variant="quiet" label="Set as next workout" accessibilityLabel={`Set ${step.name} as next workout, workout ${index + 1} of ${steps.length}`} selected={step.key === nextKey} disabled={locked}
          onPress={() => { setNextKey(step.key); setExplicitNext(true); setError(null); }} />
        <FormButton variant="destructive" label="Remove" accessibilityLabel={`Remove ${step.name}, workout ${index + 1} of ${steps.length}`} disabled={locked} onPress={() => remove(index)} />
      </View>
    </View>)}
    {!steps.length && <ThemedText themeColor="textSecondary">Add at least one routine.</ThemedText>}
    <SelectField<string | null> label="Routine to add" value={routineId} disabled={locked}
      options={[{ value: null, label: 'Choose a routine' }, ...routines.map((routine) => ({ value: routine.id, label: routine.name }))]} onChange={setRoutineId} />
    <FormButton variant="quiet" label="+ Add routine" disabled={locked || !routines.some((routine) => routine.id === routineId)} onPress={() => {
      const routine = routines.find((routine) => routine.id === routineId)!; const key = randomUUID();
      setSteps([...steps, { key, id: null, routineId: routine.id, name: routine.name }]); if (!nextKey) setNextKey(key); setRoutineId(null); setError(null);
    }} />
    {!routines.length && <ThemedText themeColor="textSecondary">Create a routine in Fitness first.</ThemedText>}
    <View style={styles.actions}><FormButton variant="primary" label="Save" onPress={save} /><FormButton variant="quiet" label="Cancel" onPress={onCancel} /></View>
  </View>;
}

export function WorkoutRotationEditorScreen() {
  const { rotationId } = useLocalSearchParams<{ rotationId?: string }>();
  const fitness = useRotations();
  const id = typeof rotationId === 'string' && rotationId ? rotationId : null;
  const rotation = fitness.snapshot?.rotations.find((row) => row.id === id) ?? null;
  function back() { if (router.canGoBack()) router.back(); else router.replace('/fitness/rotations'); }
  return <RotationPage title={id ? 'Edit rotation' : 'New rotation'} onBack={back} error={fitness.error} onRetry={fitness.reload}>
    {!fitness.snapshot ? !fitness.error && <ActivityIndicator accessibilityLabel="Loading rotation editor" />
      : id && !rotation ? <FormError message="This rotation is no longer available." />
        : <RotationEditor key={id ?? 'new'} rotation={rotation} routines={fitness.snapshot.routines} locked={rotation?.locked ?? false} onCancel={back}
          onSave={(draft) => { fitness.mutate(() => id ? fitness.access.edit(id, draft) : fitness.access.create(draft)); back(); }} />}
  </RotationPage>;
}

const styles = StyleSheet.create({
  inner: { width: '100%', maxWidth: 640, alignSelf: 'center' }, header: { padding: Space.lg, gap: Space.sm },
  content: { padding: Space.lg, paddingBottom: Space.xl, gap: Space.lg, flexGrow: 1 }, actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.sm },
  row: { paddingVertical: Space.md, borderBottomWidth: 1, gap: Space.sm }, editor: { gap: Space.md },
  rotationObject: { flex: 1, minWidth: 0, minHeight: ControlSize.touch, gap: Space.xs, paddingVertical: Space.sm },
  step: { padding: Space.md, borderWidth: 1, borderRadius: Radius.surface, gap: Space.sm },
});

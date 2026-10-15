import { StyleSheet, View } from 'react-native';

import { FormButton, FormError, FormField } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { Space } from '@/constants/theme';

import { journalDirty, moodOptions } from '../form';
import { journalFullDate } from '../presentation';
import type { JournalEditorState } from '../editor';
import type { JournalDraft } from '../types';

export function JournalEditor({ state, writingVisible = true, writingHeight = 320, onWrite, onChange, onRetryDraft, onDiscardConflict }: {
  state: JournalEditorState; writingVisible?: boolean; writingHeight?: number; onWrite?: () => void;
  onChange: (draft: JournalDraft) => void; onRetryDraft: () => void; onDiscardConflict: () => void;
}) {
  return <View style={styles.content}>
    <FormError message={state.error} />
    <FormError message={state.recoveryError} />
    {state.recoveryError && <FormButton variant="quiet" label="Retry draft protection" onPress={onRetryDraft} />}
    {!!state.recoveryMessage && <View style={styles.status}>
      {!state.conflict && <ThemedText type="secondary">Recovered draft</ThemedText>}
      <ThemedText type="secondary" themeColor="textSecondary" accessibilityLiveRegion="polite">{state.recoveryMessage}</ThemedText>
    </View>}
    {state.conflict && <FormButton variant="quiet" label="Discard changes and reload" onPress={onDiscardConflict} />}
    {state.loaded && (writingVisible ? <>
      <View style={styles.mood}>
        <ThemedText type="secondary" themeColor="textSecondary">How was your day? · Optional mood</ThemedText>
        <View role="group" accessibilityLabel="Mood, optional" style={styles.choices}>
          {moodOptions.filter((option) => option.value !== null).map((option) => <FormButton key={option.value} variant="navigation"
            label={option.label} accessibilityLabel={`${option.label}, mood`} selected={state.draft.mood === option.value}
            onPress={() => onChange({ ...state.draft, mood: state.draft.mood === option.value ? null : option.value })} />)}
        </View>
      </View>
      <FormField label="Entry" accessibilityLabel={`Journal entry for ${journalFullDate(state.date)}`} value={state.draft.content}
        placeholder="Write about your day…" multiline scrollEnabled textAlignVertical="top" submitBehavior="newline"
        style={{ minHeight: writingHeight, textAlignVertical: 'top' }} onChangeText={(content) => onChange({ ...state.draft, content })} />
      {(state.conflict || journalDirty(state.draft, state.entry)) && <ThemedText type="metadata" themeColor="textSecondary">Unsaved changes</ThemedText>}
    </> : <View style={styles.empty}>
      <ThemedText themeColor="textSecondary">No entry for this day.</ThemedText>
      <FormButton variant="quiet" label="Write an entry" onPress={() => onWrite?.()} />
    </View>)}
  </View>;
}
const styles = StyleSheet.create({
  content: { gap: Space.lg }, mood: { gap: Space.sm }, status: { gap: Space.xs },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.xs }, empty: { gap: Space.sm, paddingVertical: Space.lg },
});

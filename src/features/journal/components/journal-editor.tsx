import { StyleSheet, View } from 'react-native';

import { FormButton, FormError, FormField, FormSelect, SelectField } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { dateLabel } from '@/utils/calendar';

import { journalDirty, moodOptions } from '../form';
import type { JournalEditorState } from '../editor';
import type { JournalDraft } from '../types';

export function JournalEditor({ state, today, writingHeight = 320, onChange, onDate, onToday, onHistory, onDelete, onRetryDraft }: {
  state: JournalEditorState; today: string; onChange: (draft: JournalDraft) => void;
  writingHeight?: number; onDate: () => void; onToday: () => void; onHistory: () => void; onDelete: () => void; onRetryDraft: () => void;
}) {
  return <View style={styles.content}>
    <FormSelect label="Date" value={dateLabel(state.date)} onPress={onDate} />
    <View style={styles.actions}>
      {state.date !== today && <FormButton label="Today" onPress={onToday} />}
      <FormButton label="History" onPress={onHistory} />
    </View>
    <FormError message={state.error} />
    <FormError message={state.recoveryError} />
    {state.recoveryError && <FormButton label="Retry draft protection" onPress={onRetryDraft} />}
    {state.recoveryMessage && <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">{state.recoveryMessage}</ThemedText>}
    {state.loaded && <>
      <ThemedText type="small" themeColor="textSecondary">{state.entry ? 'Entry for this day' : 'No saved entry for this day'}</ThemedText>
      <SelectField label="Mood (optional)" value={state.draft.mood} options={moodOptions} onChange={(mood) => onChange({ ...state.draft, mood })} />
      <FormField label="Entry" accessibilityLabel={`Journal writing for ${dateLabel(state.date)}`} value={state.draft.content}
        placeholder="Write about this day…" multiline scrollEnabled textAlignVertical="top" submitBehavior="newline"
        style={{ height: writingHeight, textAlignVertical: 'top' }} onChangeText={(content) => onChange({ ...state.draft, content })} />
      {state.entry && <FormButton label="Delete entry" accessibilityLabel={`Delete journal entry for ${dateLabel(state.date)}`} onPress={onDelete} />}
      {journalDirty(state.draft, state.entry) && <ThemedText type="small" themeColor="textSecondary">Unsaved changes</ThemedText>}
    </>}
  </View>;
}
const styles = StyleSheet.create({ content: { gap: Spacing.three }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two } });

import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { FormButton, FormError, FormField } from '@/components/form-controls';
import { UiIcon, UiPressable, UiText } from '@/components/design-system';
import type { UiIconName } from '@/components/ui-icon';
import { DesignSpace as Space, Shape, TouchTarget } from '@/constants/design-system-v2';

import { journalDirty, moodOptions } from '../form';
import { journalFullDate } from '../presentation';
import type { JournalEditorState } from '../editor';
import type { JournalDraft } from '../types';
import { JournalGroup, JournalSectionHeading, useJournalColors } from './journal-surface';

const moodIcons: Record<string, UiIconName> = { great: 'moodGreat', good: 'moodGood', okay: 'moodOkay', low: 'moodLow', bad: 'moodBad' };

export function JournalEditor({ state, writingVisible = true, writingHeight = 320, onWrite, onChange, onRetryDraft, onDiscardConflict }: {
  state: JournalEditorState; writingVisible?: boolean; writingHeight?: number; onWrite?: () => void;
  onChange: (draft: JournalDraft) => void; onRetryDraft: () => void; onDiscardConflict: () => void;
}) {
  const colors = useJournalColors();
  const { width, fontScale } = useWindowDimensions();
  const roomy = width < 360 || fontScale >= 1.3;
  return <View style={styles.content}>
    <FormError appearance="v2" message={state.error} />
    <FormError appearance="v2" message={state.recoveryError} />
    {state.recoveryError && <FormButton appearance="v2" variant="quiet" label="Retry draft protection" onPress={onRetryDraft} />}
    {!!state.recoveryMessage && <View style={styles.status}>
      {!state.conflict && <UiText type="secondary">Recovered draft</UiText>}
      <UiText type="secondary" color="textSecondary" accessibilityLiveRegion="polite">{state.recoveryMessage}</UiText>
    </View>}
    {state.conflict && <FormButton appearance="v2" variant="quiet" label="Discard changes and reload" onPress={onDiscardConflict} />}
    {state.loaded && (writingVisible ? <>
      <JournalGroup>
        <JournalSectionHeading title="How was your day?" description="Optional mood" icon="moodGood" />
        <View role="group" accessibilityLabel="Mood, optional" style={styles.choices}>
          {moodOptions.filter((option) => option.value !== null).map((option) => {
            const selected = state.draft.mood === option.value;
            return <UiPressable key={option.value} accessibilityRole="button" accessibilityLabel={`${option.label}, mood`} aria-pressed={selected}
              accessibilityHint={selected ? 'Tap again to clear mood.' : 'Select an optional mood for this entry.'} accessibilityState={{ selected }}
              onPress={() => onChange({ ...state.draft, mood: selected ? null : option.value })}
              style={[styles.choice, { flexBasis: roomy ? (fontScale >= 1.8 ? '45%' : '30%') : '16%',
                backgroundColor: selected ? colors.accentSoft : colors.control, borderColor: selected ? colors.accent : colors.border }]}>
              <UiIcon name={selected ? 'check' : moodIcons[option.value!]} color={colors.accent} size={24} />
              <UiText type="secondary" style={{ textAlign: 'center' }}>{option.label}</UiText>
            </UiPressable>;
          })}
        </View>
      </JournalGroup>
      <JournalGroup>
      <JournalSectionHeading title="Entry" description="Write about your day…" icon="document" />
      <FormField appearance="v2" label="Entry" showLabel={false} accessibilityLabel={`Journal entry for ${journalFullDate(state.date)}`} value={state.draft.content}
        placeholder="Write about your day…" multiline scrollEnabled textAlignVertical="top" submitBehavior="newline"
        style={{ minHeight: writingHeight, textAlignVertical: 'top' }} onChangeText={(content) => onChange({ ...state.draft, content })} />
      {(state.conflict || journalDirty(state.draft, state.entry)) && <UiText type="metadata" color="textSecondary">Unsaved changes</UiText>}
      </JournalGroup>
    </> : <JournalGroup>
      <JournalSectionHeading title="No entry for this day." icon="document" />
      <FormButton appearance="v2" variant="secondary" label="Write an entry" leadingIcon="pencil" onPress={() => onWrite?.()} />
    </JournalGroup>)}
  </View>;
}
const styles = StyleSheet.create({
  content: { gap: Space.lg }, status: { gap: Space.xs },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  choice: { flexGrow: 1, flexShrink: 1, minWidth: TouchTarget, minHeight: 64, paddingVertical: Space.sm, paddingHorizontal: Space.xs,
    alignItems: 'center', justifyContent: 'center', gap: Space.xs, borderRadius: Shape.control, borderWidth: 1 },
});

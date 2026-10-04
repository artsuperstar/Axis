import { AdaptiveSheet } from '@/components/adaptive-sheet';
import { FormButton } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';

import type { JournalLeaveChoice } from '../editor';

export function JournalLeave({ onChoose }: { onChoose: (choice: JournalLeaveChoice) => void }) {
  return <AdaptiveSheet title="Unsaved journal changes" onDismiss={() => onChoose('keep')}>
    <ThemedText>Save your writing before leaving this day?</ThemedText>
    <FormButton label="Save" onPress={() => onChoose('save')} />
    <FormButton label="Discard changes" onPress={() => onChoose('discard')} />
    <FormButton label="Keep editing" onPress={() => onChoose('keep')} />
  </AdaptiveSheet>;
}

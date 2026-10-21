import { AdaptiveSheet } from '@/components/adaptive-sheet';
import { FormButton } from '@/components/form-controls';
import { UiText } from '@/components/design-system';

import type { JournalLeaveChoice } from '../editor';

export function JournalLeave({ onChoose }: { onChoose: (choice: JournalLeaveChoice) => void }) {
  return <AdaptiveSheet appearance="v2" title="Unsaved journal changes" onDismiss={() => onChoose('keep')}>
    <UiText>Save your writing before leaving this day?</UiText>
    <FormButton appearance="v2" label="Save" onPress={() => onChoose('save')} />
    <FormButton appearance="v2" label="Discard changes" onPress={() => onChoose('discard')} />
    <FormButton appearance="v2" label="Keep editing" onPress={() => onChoose('keep')} />
  </AdaptiveSheet>;
}

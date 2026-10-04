import { localDateString, validDate } from '@/utils/calendar';

import type { JournalDraft, JournalEntry, JournalMood } from './types';

export const moodOptions: { value: JournalMood | null; label: string }[] = [
  { value: null, label: 'None' }, { value: 'great', label: 'Great' }, { value: 'good', label: 'Good' },
  { value: 'okay', label: 'Okay' }, { value: 'low', label: 'Low' }, { value: 'bad', label: 'Bad' },
];
export class JournalValidationError extends Error {}
export function validateJournalDate(date: string, timestamp = Date.now()) {
  if (!validDate(date)) throw new JournalValidationError('Choose a valid journal date.');
  if (date > localDateString(new Date(timestamp))) throw new JournalValidationError('Journal dates must be today or earlier.');
}
export function journalDraft(entry: JournalEntry | null): JournalDraft {
  return { content: entry?.content ?? '', mood: entry?.mood ?? null };
}
/** Only whitespace-only text is normalized; meaningful writing keeps every line break and space. */
export function normalizeJournalDraft(draft: JournalDraft): JournalDraft {
  if (typeof draft.content !== 'string' || !moodOptions.some((option) => option.value === draft.mood)) {
    throw new JournalValidationError('Enter plain text and choose an available mood.');
  }
  return { content: draft.content.trim() ? draft.content : '', mood: draft.mood };
}
export function journalDirty(draft: JournalDraft, entry: JournalEntry | null) {
  const normalized = normalizeJournalDraft(draft);
  return normalized.content !== (entry?.content ?? '') || normalized.mood !== (entry?.mood ?? null);
}
export function moodLabel(mood: JournalMood | null) {
  return moodOptions.find((option) => option.value === mood)!.label;
}
export function journalPreview(entry: JournalEntry) {
  const content = entry.content.trim().replace(/\s+/g, ' ');
  return content ? content.length > 140 ? `${content.slice(0, 140)}…` : content : `Mood: ${moodLabel(entry.mood)}`;
}
export function journalError(cause: unknown, fallback: string) {
  return cause instanceof JournalValidationError ? cause.message : fallback;
}

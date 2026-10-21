import { pickerValue } from '@/utils/calendar';

import { journalDirty } from './form';
import type { JournalEditorState } from './editor';
import type { JournalEntry } from './types';

export const journalTaskPreviewLimit = 4;

export function journalFullDate(date: string) {
  return pickerValue(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function journalWritingVisible(state: JournalEditorState, today: string, writingDate: string | null) {
  return state.loaded && (state.date === today || !!state.entry || state.conflict || journalDirty(state.draft, state.entry) || writingDate === state.date);
}

export function journalSaveLabel(state: JournalEditorState) {
  return state.entry && journalDirty(state.draft, state.entry) ? 'Save changes' : 'Save entry';
}

export function journalHistoryGroups(entries: readonly JournalEntry[]) {
  const groups: { key: string; label: string; entries: JournalEntry[] }[] = [];
  for (const entry of entries) {
    const key = entry.entryDate.slice(0, 7);
    const last = groups.at(-1);
    if (last?.key === key) last.entries.push(entry);
    else groups.push({ key, label: pickerValue(entry.entryDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }), entries: [entry] });
  }
  return groups;
}

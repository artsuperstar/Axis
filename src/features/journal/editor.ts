import type { createJournalDataAccess } from './data';
import { createDraftPersistence, type DraftTimerHost } from './draft-persistence';
import { journalBaseline, journalBaselineMatches, JournalConflictError, journalConflictMessage, journalDirty, journalDraft, journalError, validateJournalDate } from './form';
import type { JournalDraft, JournalEntry, JournalEntryBaseline } from './types';

export type JournalEditorState = { date: string; entry: JournalEntry | null; draft: JournalDraft; loaded: boolean; error: string | null; message: string | null;
  baseline: JournalEntryBaseline; conflict: boolean; recoveryError: string | null; recoveryMessage: string | null };
type EditorAccess = Pick<ReturnType<typeof createJournalDataAccess>, 'getEntry' | 'getDraft' | 'persistDraft' | 'discardDraft' | 'save' | 'softDelete'>;

/** Local draft state is separate from both persisted writing and refreshable activity context. */
export function createJournalEditor(access: EditorAccess, date: string, notify: (state: JournalEditorState) => void, now = Date.now, timerHost?: DraftTimerHost) {
  let state: JournalEditorState = { date, entry: null, baseline: null, conflict: false, draft: journalDraft(null), loaded: false, error: null, message: null, recoveryError: null, recoveryMessage: null };
  let pendingDraft = false;
  function update(next: JournalEditorState) { state = next; notify(state); }
  const dirty = () => state.conflict || journalDirty(state.draft, state.entry);
  const persistence = createDraftPersistence(() => {
    if (!state.loaded || !pendingDraft) return true;
    try {
      access.persistDraft(state.date, state.draft, state.entry, state.baseline);
      pendingDraft = false;
      if (state.recoveryError) update({ ...state, recoveryError: null });
      return true;
    } catch {
      update({ ...state, recoveryError: 'Unable to protect your draft locally. Try again or use Save; your writing is still in this editor.' });
      return false;
    }
  }, timerHost);
  const editor = {
    getState: () => state,
    dirty,
    flushDraft: persistence.flush,
    load(nextDate: string) {
      try {
        validateJournalDate(nextDate, now());
        if (!persistence.flush()) return false;
        let entry = access.getEntry(nextDate);
        let recovery = access.getDraft(nextDate);
        // Only an unchanged baseline can make a recovery row safely redundant.
        const recoveredBaseline = recovery?.baseEntryId ? { id: recovery.baseEntryId, updatedAt: recovery.baseEntryUpdatedAt! } : null;
        if (recovery && journalBaselineMatches(recoveredBaseline, entry) && !journalDirty(recovery, entry)) {
          entry = access.discardDraft(nextDate); recovery = null;
        }
        const draft = recovery ? { content: recovery.content, mood: recovery.mood } : journalDraft(entry);
        const baseline = recovery ? recoveredBaseline : journalBaseline(entry);
        const conflict = !journalBaselineMatches(baseline, entry);
        pendingDraft = false;
        update({ date: nextDate, entry, baseline, conflict, draft, loaded: true, error: null, message: null, recoveryError: null,
          recoveryMessage: recovery ? conflict ? `Restored your draft. ${journalConflictMessage}` : 'Restored unsaved draft.' : null });
        return true;
      } catch (cause) { update({ ...state, error: journalError(cause, 'Unable to load this journal day. Please try again.') }); return false; }
    },
    refresh() { if (!dirty()) editor.load(state.date); },
    change(draft: JournalDraft) {
      if (!state.loaded) return;
      pendingDraft = true;
      update({ ...state, draft, error: null, message: null });
      persistence.changed();
    },
    save() {
      if (!state.loaded) return false;
      // Another writer may have cleared the recovery row after our last debounce.
      if (dirty() && !pendingDraft) {
        try { pendingDraft = access.getDraft(state.date) === null; }
        catch { pendingDraft = true; }
      }
      persistence.flush();
      try {
        const entry = access.save(state.date, state.draft, state.baseline);
        pendingDraft = false; persistence.cancel();
        update({ ...state, entry, baseline: journalBaseline(entry), conflict: false, draft: journalDraft(entry), error: null, message: entry ? 'Saved' : 'No entry for this day', recoveryError: null, recoveryMessage: null });
        return true;
      } catch (cause) {
        if (cause instanceof JournalConflictError) {
          update({ ...state, conflict: true, error: null, message: null, recoveryMessage: journalConflictMessage });
          pendingDraft = true;
          persistence.flush();
        } else update({ ...state, error: journalError(cause, 'Unable to save your writing. Please try again.') });
        return false;
      }
    },
    discard() {
      persistence.cancel();
      try {
        const entry = access.discardDraft(state.date);
        pendingDraft = false;
        update({ ...state, entry, baseline: journalBaseline(entry), conflict: false, draft: journalDraft(entry), error: null, message: null, recoveryError: null, recoveryMessage: null });
        return true;
      } catch {
        if (pendingDraft) persistence.changed();
        update({ ...state, error: 'Unable to discard changes. Your writing has been kept. Please try again.' }); return false;
      }
    },
    remove() {
      if (!state.entry) return false;
      persistence.flush();
      try {
        access.softDelete(state.entry.id);
        pendingDraft = false; persistence.cancel();
        update({ ...state, entry: null, baseline: null, conflict: false, draft: journalDraft(null), error: null, message: 'Entry deleted', recoveryError: null, recoveryMessage: null });
        return true;
      } catch { update({ ...state, error: 'Unable to delete this entry. Please try again.' }); return false; }
    },
  };
  return editor;
}
export type JournalEditor = ReturnType<typeof createJournalEditor>;
export type JournalLeaveChoice = 'keep' | 'discard' | 'save';
/** A failed save never continues navigation. The same guard protects Back and changing dates. */
export function requestJournalNavigation(editor: JournalEditor, prompt: (choose: (choice: JournalLeaveChoice) => void) => void, proceed: () => void) {
  const protectedDraft = editor.flushDraft();
  if (!editor.dirty()) { if (protectedDraft) proceed(); return; }
  prompt((choice) => {
    if (choice === 'keep') return;
    if (choice === 'discard') { if (!editor.discard()) return; }
    else if (!editor.save()) return;
    proceed();
  });
}

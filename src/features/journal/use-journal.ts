import { randomUUID } from 'expo-crypto';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { useDatabase } from '@/database/database-provider';
import { localDateString } from '@/utils/calendar';

import { createJournalContextAccess } from './context';
import { createJournalDataAccess } from './data';
import { startJournalLifecycle } from './draft-persistence';
import { createJournalEditor, type JournalEditorState } from './editor';
import type { JournalDayContext, JournalEntry } from './types';

export function useJournal() {
  const db = useDatabase();
  const access = useMemo(() => createJournalDataAccess(db, randomUUID), [db]);
  const contextAccess = useMemo(() => createJournalContextAccess(db), [db]);
  const [state, setState] = useState<JournalEditorState>(() => ({ date: localDateString(new Date()), entry: null,
    draft: { content: '', mood: null }, loaded: false, error: null, message: null, recoveryError: null, recoveryMessage: null }));
  const editor = useMemo(() => createJournalEditor(access, localDateString(new Date()), setState), [access]);
  const [today, setToday] = useState(() => localDateString(new Date()));
  const [context, setContext] = useState<JournalDayContext | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const [history, setHistory] = useState<JournalEntry[]>([]);
  const [historyBefore, setHistoryBefore] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const readContext = useCallback(() => {
    try { setContext(contextAccess.read(editor.getState().date)); setContextError(null); }
    catch { setContext(null); setContextError('Unable to load activity for this day. Your writing is independent of this activity.'); }
  }, [contextAccess, editor]);
  const reload = useCallback(() => {
    setToday(localDateString(new Date()));
    editor.refresh();
    readContext();
  }, [editor, readContext]);
  useFocusEffect(useCallback(() => startJournalLifecycle({
    refresh: reload, flush: editor.flushDraft,
    everyMinute: (refresh) => { const timer = setInterval(refresh, 60000); return () => clearInterval(timer); },
    onAppState: (change) => { const subscription = AppState.addEventListener('change', change); return () => subscription.remove(); },
  }), [editor, reload]));
  function loadDate(date: string) { if (editor.load(date)) readContext(); }
  function readHistory(older = false) {
    try {
      const page = access.listHistory(older ? historyBefore ?? undefined : undefined);
      setHistory((previous) => older ? [...previous, ...page.entries.filter((entry) => !previous.some((row) => row.entryDate === entry.entryDate))] : page.entries);
      setHistoryBefore(page.nextBefore); setHistoryError(null);
    } catch { setHistoryError('Unable to load journal history. Please try again.'); }
  }
  return { state, editor, today, context, contextError, readContext, reload, loadDate,
    history, historyBefore, historyError, readHistory };
}

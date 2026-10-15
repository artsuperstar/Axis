import { randomUUID } from 'expo-crypto';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useDatabase } from '@/database/database-provider';
import { localDateString } from '@/utils/calendar';

import { createJournalContextAccess } from './context';
import { createJournalDataAccess } from './data';
import { startJournalLifecycle } from './draft-persistence';
import { createJournalEditor, type JournalEditorState } from './editor';
import type { JournalDayContext } from './types';

export function useJournal(initialDate?: string) {
  const db = useDatabase();
  const [initial] = useState(() => initialDate ?? localDateString(new Date()));
  const access = useMemo(() => createJournalDataAccess(db, randomUUID), [db]);
  const contextAccess = useMemo(() => createJournalContextAccess(db), [db]);
  const [state, setState] = useState<JournalEditorState>(() => ({ date: initial, entry: null,
    baseline: null, conflict: false, draft: { content: '', mood: null }, loaded: false, error: null, message: null, recoveryError: null, recoveryMessage: null }));
  const editor = useMemo(() => createJournalEditor(access, initial, setState), [access, initial]);
  const [today, setToday] = useState(() => localDateString(new Date()));
  const [targetDate, setTargetDate] = useState(initial);
  const target = useRef(initial);
  const [context, setContext] = useState<JournalDayContext | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const readContext = useCallback(() => {
    const date = editor.getState().date;
    if (!editor.getState().loaded || date !== target.current) return;
    try { setContext(contextAccess.read(date)); setContextError(null); }
    // Keep the last good summary; the date check below prevents relabeling another day's data.
    catch { setContextError('Unable to load activity for this day. Your writing is kept.'); }
  }, [contextAccess, editor]);
  const reload = useCallback(() => {
    setToday(localDateString(new Date()));
    if (target.current !== editor.getState().date || !editor.getState().loaded) editor.load(target.current);
    else editor.refresh();
    readContext();
  }, [editor, readContext]);
  useFocusEffect(useCallback(() => startJournalLifecycle({
    refresh: reload, flush: editor.flushDraft,
    everyMinute: (refresh) => { const timer = setInterval(refresh, 60000); return () => clearInterval(timer); },
    onAppState: (change) => { const subscription = AppState.addEventListener('change', change); return () => subscription.remove(); },
  }), [editor, reload]));
  const loadDate = useCallback((date: string) => {
    target.current = date; setTargetDate(date); setContextError(null);
    const loaded = editor.load(date);
    if (loaded) readContext();
    return loaded;
  }, [editor, readContext]);
  return { state, editor, today, targetDate, context: context?.date === targetDate ? context : null, contextError, readContext, reload, loadDate };
}

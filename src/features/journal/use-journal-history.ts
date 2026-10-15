import { randomUUID } from 'expo-crypto';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { useDatabase } from '@/database/database-provider';

import { createJournalDataAccess } from './data';
import type { JournalHistoryPage } from './types';

export function useJournalHistory() {
  const db = useDatabase();
  const access = useMemo(() => createJournalDataAccess(db, randomUUID), [db]);
  const [page, setPage] = useState<JournalHistoryPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [olderFailed, setOlderFailed] = useState(false);
  const reload = useCallback(() => {
    try { setPage(access.listHistory()); setError(null); setOlderFailed(false); }
    catch { setError('Unable to load journal history. Please try again.'); setOlderFailed(false); }
  }, [access]);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  function loadOlder() {
    if (!page?.nextBefore) return;
    try {
      const older = access.listHistory(page.nextBefore);
      setPage({ entries: [...page.entries, ...older.entries], nextBefore: older.nextBefore }); setError(null); setOlderFailed(false);
    } catch { setError('Unable to load older entries. Your loaded history is kept.'); setOlderFailed(true); }
  }
  return { page, error, reload, loadOlder, retry: olderFailed ? loadOlder : reload };
}

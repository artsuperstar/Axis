import { randomUUID } from 'expo-crypto';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useDatabase } from '@/database/database-provider';

import { createFitnessDataAccess } from './data';
import { fitnessError } from './form';
import type { FitnessOverview, RoutineDetail, SessionDetail } from './types';

export function useFitness(initialSessionId?: string, includeRoutineDetails = false, includeActiveDetail = true) {
  const db = useDatabase();
  const access = useMemo(() => createFitnessDataAccess(db, randomUUID), [db]);
  const [snapshot, setSnapshot] = useState<FitnessOverview | null>(null);
  const [routines, setRoutines] = useState<RoutineDetail[]>([]);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [activeDetail, setActiveDetail] = useState<SessionDetail | null>(null);
  const selected = useRef<string | null>(initialSessionId ?? null);
  const historyLimit = useRef(20);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    try {
      // Publish together only after all requested reads succeed. Editors keep their captured drafts.
      const nextSnapshot = access.readOverview(historyLimit.current);
      const nextActive = includeActiveDetail && nextSnapshot.active ? access.readSession(nextSnapshot.active.id) : null;
      const nextDetail = selected.current ? selected.current === nextActive?.id ? nextActive : access.readSession(selected.current) : null;
      const nextRoutines = includeRoutineDetails ? access.readRoutines() : [];
      setSnapshot(nextSnapshot);
      setDetail(nextDetail);
      // Keep the last known Workout while visiting other destinations, without reading it there.
      // Invalidate it when the overview authoritatively removes or replaces the active session.
      setActiveDetail((current) => includeActiveDetail ? nextActive : current?.id === nextSnapshot.active?.id ? current : null);
      setRoutines(nextRoutines);
      setError(null);
    } catch (cause) {
      setError(fitnessError(cause, 'Unable to load Fitness. Please try again.'));
    }
  }, [access, includeRoutineDetails, includeActiveDetail]);
  useFocusEffect(useCallback(() => {
    reload();
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') reload(); });
    return () => subscription.remove();
  }, [reload]));
  function openSession(id: string) {
    const session = access.readSession(id);
    selected.current = id; setDetail(session);
  }
  function closeSession() { selected.current = null; setDetail(null); }
  function mutate<T>(action: () => T): T {
    const result = action();
    // A failed refresh must not turn a committed save into an unsuccessful write.
    reload(); return result;
  }
  function loadMoreHistory() {
    if (!snapshot?.hasMoreHistory || !snapshot.history.length) return;
    try {
      const page = access.readHistory(20, snapshot.history[snapshot.history.length - 1]);
      setSnapshot({ ...snapshot, history: [...snapshot.history, ...page.history], hasMoreHistory: page.hasMoreHistory });
      historyLimit.current = snapshot.history.length + page.history.length;
      setError(null);
    } catch (cause) { setError(fitnessError(cause, 'Unable to load older workouts. Please try again.')); }
  }
  return { access, snapshot, routines, detail, activeDetail, error, reload, mutate, openSession, closeSession, loadMoreHistory };
}

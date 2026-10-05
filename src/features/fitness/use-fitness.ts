import { randomUUID } from 'expo-crypto';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useDatabase } from '@/database/database-provider';

import { createFitnessDataAccess } from './data';
import { fitnessError } from './form';
import type { FitnessOverview, RoutineDetail, SessionDetail } from './types';

export function useFitness(initialSessionId?: string, includeRoutineDetails = false) {
  const db = useDatabase();
  const access = useMemo(() => createFitnessDataAccess(db, randomUUID), [db]);
  const [snapshot, setSnapshot] = useState<FitnessOverview | null>(null);
  const [routines, setRoutines] = useState<RoutineDetail[]>([]);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const selected = useRef<string | null>(initialSessionId ?? null);
  const historyLimit = useRef(20);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    try {
      // Publish only after both reads succeed, retaining the last coherent pair on failure.
      const nextSnapshot = access.readOverview(historyLimit.current);
      const nextDetail = selected.current ? access.readSession(selected.current) : null;
      const nextRoutines = includeRoutineDetails ? access.readRoutines() : [];
      setSnapshot(nextSnapshot);
      setDetail(nextDetail);
      setRoutines(nextRoutines);
      setError(null);
    } catch (cause) {
      setError(fitnessError(cause, 'Unable to load Fitness. Please try again.'));
    }
  }, [access, includeRoutineDetails]);
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
  return { access, snapshot, routines, detail, error, reload, mutate, openSession, closeSession, loadMoreHistory };
}

import { randomUUID } from 'expo-crypto';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useDatabase } from '@/database/database-provider';

import { createFitnessDataAccess } from './data';
import { fitnessError } from './form';
import type { FitnessSnapshot, SessionDetail } from './types';

export function useFitness(initialSessionId?: string) {
  const db = useDatabase();
  const access = useMemo(() => createFitnessDataAccess(db, randomUUID), [db]);
  const [snapshot, setSnapshot] = useState<FitnessSnapshot | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const selected = useRef<string | null>(initialSessionId ?? null);
  const historyLimit = useRef(20);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    try {
      // Publish only after both reads succeed, retaining the last coherent pair on failure.
      const nextSnapshot = access.read(historyLimit.current);
      const nextDetail = selected.current ? access.readSession(selected.current) : null;
      setSnapshot(nextSnapshot);
      setDetail(nextDetail);
      setError(null);
    } catch (cause) {
      setError(fitnessError(cause, 'Unable to load Fitness. Please try again.'));
    }
  }, [access]);
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
  function loadMoreHistory() { historyLimit.current += 20; reload(); }
  return { access, snapshot, detail, error, reload, mutate, openSession, closeSession, loadMoreHistory };
}

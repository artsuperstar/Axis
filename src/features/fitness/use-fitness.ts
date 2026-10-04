import { randomUUID } from 'expo-crypto';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useDatabase } from '@/database/database-provider';

import { createFitnessDataAccess } from './data';
import { fitnessError } from './form';
import type { FitnessSnapshot, SessionDetail } from './types';

export function useFitness() {
  const db = useDatabase();
  const access = useMemo(() => createFitnessDataAccess(db, randomUUID), [db]);
  const [snapshot, setSnapshot] = useState<FitnessSnapshot | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const selected = useRef<string | null>(null);
  const historyLimit = useRef(20);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    try {
      setSnapshot(access.read(historyLimit.current));
      setDetail(selected.current ? access.readSession(selected.current) : null);
      setError(null);
    } catch (cause) {
      setSnapshot(null); setDetail(null);
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

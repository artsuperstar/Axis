import { randomUUID } from 'expo-crypto';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { useDatabase } from '@/database/database-provider';

import { fitnessError } from './form';
import { createRotationDataAccess } from './rotations-data';
import type { RotationDetail, Routine } from './types';

export function useRotations() {
  const db = useDatabase();
  const access = useMemo(() => createRotationDataAccess(db, randomUUID), [db]);
  const [snapshot, setSnapshot] = useState<{ rotations: RotationDetail[]; routines: Routine[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    try {
      const next = access.readManagement();
      setSnapshot(next); setError(null);
    } catch (cause) { setError(fitnessError(cause, 'Unable to load workout rotations. Please try again.')); }
  }, [access]);
  useFocusEffect(useCallback(() => {
    reload(); const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') reload(); });
    return () => subscription.remove();
  }, [reload]));
  function mutate<T>(action: () => T): T { const result = action(); reload(); return result; }
  return { access, snapshot, error, reload, mutate };
}

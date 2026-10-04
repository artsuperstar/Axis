import { randomUUID } from 'expo-crypto';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { useDatabase } from '@/database/database-provider';
import { userError } from '@/features/tasks/form';

import { createHomeDataAccess } from './data';
import { startHomeRefresh } from './refresh';
import type { HomeSnapshot, HomeTaskItem } from './types';

export function useHome() {
  const db = useDatabase();
  const access = useMemo(() => createHomeDataAccess(db, randomUUID), [db]);
  const [snapshot, setSnapshot] = useState<HomeSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const reload = useCallback(() => {
    try { setSnapshot(access.read()); setError(null); }
    catch (cause) { setSnapshot(null); setError(userError(cause, 'Unable to load Home. Please try again.')); }
  }, [access]);
  useFocusEffect(useCallback(() => startHomeRefresh({
    load: reload, everyMinute: (load) => { const timer = setInterval(load, 60000); return () => clearInterval(timer); },
    onResume: (load) => { const subscription = AppState.addEventListener('change', load); return () => subscription.remove(); },
  }), [reload]));
  function completeTask(item: HomeTaskItem) {
    try { access.completeTask(item); setActionError(null); }
    catch (cause) { setActionError(userError(cause, 'Unable to complete this task. Please try again.')); }
    reload();
  }
  return { snapshot, error, actionError, reload, completeTask };
}

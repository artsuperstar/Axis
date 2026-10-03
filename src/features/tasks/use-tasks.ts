import { randomUUID } from 'expo-crypto';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { useDatabase } from '@/database/database-provider';

import { createTaskDataAccess } from './data';
import { localDateString } from './calendar';
import { userError } from './form';

export function useTasks() {
  const db = useDatabase();
  const access = useMemo(() => createTaskDataAccess(db, randomUUID), [db]);
  const [snapshot, setSnapshot] = useState<ReturnType<typeof access.read> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [presentationNow, setPresentationNow] = useState(Date.now);

  const reload = useCallback(() => {
    try {
      setSnapshot(access.read());
      setPresentationNow(Date.now());
      setError(null);
    } catch (cause) {
      setError(userError(cause, 'Unable to load tasks. Please try again.'));
    }
  }, [access]);

  useFocusEffect(useCallback(() => {
    reload();
    let day = localDateString(new Date());
    const timer = setInterval(() => {
      setPresentationNow(Date.now());
      const current = localDateString(new Date());
      if (current !== day) { day = current; reload(); }
    }, 60000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') { day = localDateString(new Date()); reload(); }
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [reload]));

  function mutate<T>(action: () => T): T {
    const result = action();
    // A refresh failure is shown on the list, without treating a committed write as a failed save.
    reload();
    return result;
  }

  return { access, snapshot, error, reload, mutate, presentationNow };
}

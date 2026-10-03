import { randomUUID } from 'expo-crypto';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { useDatabase } from '@/database/database-provider';

import { createTaskDataAccess } from './data';
import { userError } from './form';

export function useTasks() {
  const db = useDatabase();
  const access = useMemo(() => createTaskDataAccess(db, randomUUID), [db]);
  const [snapshot, setSnapshot] = useState<ReturnType<typeof access.read> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    try {
      setSnapshot(access.read());
      setError(null);
    } catch (cause) {
      setError(userError(cause, 'Unable to load tasks. Please try again.'));
    }
  }, [access]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  function mutate<T>(action: () => T): T {
    const result = action();
    // A refresh failure is shown on the list, without treating a committed write as a failed save.
    reload();
    return result;
  }

  return { access, snapshot, error, reload, mutate };
}

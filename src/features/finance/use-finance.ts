import { randomUUID } from 'expo-crypto';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { useDatabase } from '@/database/database-provider';

import { createFinanceDataAccess } from './data';
import { financeError } from './errors';

export function useFinance() {
  const db = useDatabase();
  const access = useMemo(() => createFinanceDataAccess(db, randomUUID), [db]);
  const [snapshot, setSnapshot] = useState<ReturnType<typeof access.read> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    try {
      setSnapshot(access.read());
      setError(null);
    } catch (cause) {
      setError(financeError(cause, 'Unable to load transactions. Please try again.'));
    }
  }, [access]);

  useFocusEffect(useCallback(() => {
    reload();
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') reload(); });
    return () => subscription.remove();
  }, [reload]));

  function mutate<T>(action: () => T): T {
    const result = action();
    // Refresh failures do not report a committed write as an unsuccessful save.
    reload();
    return result;
  }

  return { access, snapshot, error, reload, mutate };
}

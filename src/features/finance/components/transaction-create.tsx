import { randomUUID } from 'expo-crypto';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { SheetRefreshContext } from '@/components/sheet-refresh-notice';
import { useDatabase } from '@/database/database-provider';

import { createFinanceDataAccess } from '../data';
import { financeError } from '../errors';
import type { FinanceCategory } from '../types';
import { TransactionEditor } from './transaction-editor';

/** Source-owned creation host for quick entry without loading the Transactions ledger. */
export function TransactionCreate({ onSaved, onDismiss }: { onSaved: () => void; onDismiss: () => void }) {
  const db = useDatabase();
  const access = useMemo(() => createFinanceDataAccess(db, randomUUID), [db]);
  const [categories, setCategories] = useState<FinanceCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    try { setCategories(access.readCategories()); setError(null); }
    catch (cause) { setError(financeError(cause, 'Unable to load transaction categories. Please try again.')); }
  }, [access]);
  useFocusEffect(useCallback(() => {
    reload();
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') reload(); });
    return () => subscription.remove();
  }, [reload]));

  return <SheetRefreshContext.Provider value={{ error, onRetry: reload }}>
    <TransactionEditor transaction={null} categories={categories ?? []} categoriesReady={categories !== null} onDismiss={onDismiss}
      onSave={(draft) => { access.createTransaction(draft); onSaved(); }}
      onCreateCategory={(name, type) => {
        const category = access.createCategory(name, type);
        setCategories((current) => [...(current ?? []), category]);
        return category;
      }} />
  </SheetRefreshContext.Provider>;
}

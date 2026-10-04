import { randomUUID } from 'expo-crypto';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useDatabase } from '@/database/database-provider';
import { localDateString } from '@/utils/calendar';

import { createFinanceDataAccess } from './data';
import { createCommitmentDataAccess, type CommitmentHistory } from './commitments/data';
import { createWorkDataAccess } from './work/data';
import type { WorkSnapshot } from './work/types';
import type { CommitmentItem, DisplayOccurrence } from './commitments/types';
import { financeError } from './errors';
import type { FinanceAnalytics } from './analytics';
import { movePeriod, periodBounds, refreshPeriod, type FinancePeriod, type PeriodKind } from './periods';
import type { FinanceCategory, FinanceTransaction } from './types';

export type FinanceView = 'dashboard' | 'transactions' | 'commitments' | 'work';
type Selection = { view: FinanceView; period: FinancePeriod };
type Snapshot = { transactions: FinanceTransaction[]; categories: FinanceCategory[]; analytics: FinanceAnalytics | null; items: CommitmentItem[]; paymentTransactionIds: string[]; workPaymentTransactionIds: string[]; work: WorkSnapshot | null;
  initialCommitment?: { data: CommitmentHistory; occurrence: DisplayOccurrence | null } };

export function useFinance(initialView: FinanceView = 'dashboard', initialRecordId?: string, initialDueDate?: string) {
  const db = useDatabase();
  const access = useMemo(() => createFinanceDataAccess(db, randomUUID), [db]);
  const commitmentAccess = useMemo(() => createCommitmentDataAccess(db, randomUUID), [db]);
  const workAccess = useMemo(() => createWorkDataAccess(db, randomUUID), [db]);
  const [today, setToday] = useState(() => localDateString(new Date()));
  const todayRef = useRef(today);
  const [selection, setSelection] = useState<Selection>(() => ({ view: initialView, period: periodBounds('month', today) }));
  const selectionRef = useRef(selection);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((next: Selection) => {
    try {
      if (next.view === 'dashboard') {
        setSnapshot({ ...access.readDashboard(next.period), transactions: [], items: [], paymentTransactionIds: [], workPaymentTransactionIds: [], work: null });
      } else if (next.view === 'transactions') setSnapshot({ ...access.read(), analytics: null, items: [], work: null });
      else if (next.view === 'commitments') {
        const initialCommitment = initialView === 'commitments' && initialRecordId && initialDueDate ? {
          data: commitmentAccess.readHistory(initialRecordId),
          occurrence: commitmentAccess.readRange({ from: initialDueDate, to: initialDueDate }).find((row) => row.commitment.id === initialRecordId)?.occurrence ?? null,
        } : undefined;
        setSnapshot({ ...commitmentAccess.read(), initialCommitment, categories: access.readCategories(), transactions: [], analytics: null, paymentTransactionIds: [], workPaymentTransactionIds: [], work: null });
      }
      else setSnapshot({ work: workAccess.read(), categories: access.readCategories(), transactions: [], analytics: null, items: [], paymentTransactionIds: [], workPaymentTransactionIds: [] });
      setError(null);
    } catch (cause) {
      // Clear prior values so a failed period change never shows totals for a different period.
      setSnapshot(null);
      setError(financeError(cause, 'Unable to load Finance. Please try again.'));
    }
  }, [access, commitmentAccess, workAccess, initialView, initialRecordId, initialDueDate]);

  const select = useCallback((next: Selection) => {
    selectionRef.current = next;
    setSelection(next);
    load(next);
  }, [load]);

  const syncToday = useCallback(() => {
    const currentToday = localDateString(new Date());
    const period = refreshPeriod(selectionRef.current.period, todayRef.current, currentToday);
    todayRef.current = currentToday;
    setToday(currentToday);
    return { today: currentToday, selection: { ...selectionRef.current, period } };
  }, []);

  const reload = useCallback(() => {
    select(syncToday().selection);
  }, [select, syncToday]);

  useFocusEffect(useCallback(() => {
    const currentToday = localDateString(new Date());
    todayRef.current = currentToday;
    setToday(currentToday);
    select({ view: initialView, period: periodBounds('month', currentToday) });
    const timer = setInterval(() => { if (localDateString(new Date()) !== todayRef.current) reload(); }, 60000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') reload(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [initialView, reload, select]));

  function setView(view: FinanceView) {
    select({ ...syncToday().selection, view });
  }

  function setPeriodKind(kind: PeriodKind) {
    const current = syncToday();
    select({ ...current.selection, period: periodBounds(kind, current.today) });
  }

  function navigatePeriod(direction: -1 | 1) {
    const current = syncToday();
    select({ ...current.selection, period: movePeriod(current.selection.period, direction, current.today) });
  }

  function returnToCurrent() {
    const current = syncToday();
    select({ ...current.selection, period: periodBounds(current.selection.period.kind, current.today) });
  }

  function mutate<T>(action: () => T): T {
    const result = action();
    // Refresh failures do not report a committed write as an unsuccessful save.
    reload();
    return result;
  }

  return { access, commitmentAccess, workAccess, snapshot, error, reload, mutate, selection, today, setView, setPeriodKind, navigatePeriod, returnToCurrent };
}

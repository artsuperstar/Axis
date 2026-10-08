import { randomUUID } from 'expo-crypto';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useDatabase } from '@/database/database-provider';
import { localDateString } from '@/utils/calendar';

import { createFinanceDataAccess } from './data';
import { createCommitmentDataAccess, type CommitmentHistory } from './commitments/data';
import { createWorkDataAccess } from './work/data';
import type { WorkOverview } from './work/types';
import type { CommitmentItem, DisplayOccurrence } from './commitments/types';
import { financeError } from './errors';
import type { FinanceAnalytics } from './analytics';
import { movePeriod, periodBounds, refreshPeriod, type FinancePeriod, type PeriodKind } from './periods';
import type { FinanceCategory, FinanceTransaction } from './types';

export type FinanceView = 'dashboard' | 'transactions' | 'commitments' | 'work';
type Selection = { view: FinanceView; period: FinancePeriod };
type Snapshot = { transactions: FinanceTransaction[]; categories: FinanceCategory[]; analytics: FinanceAnalytics | null; items: CommitmentItem[]; paymentTransactionIds: string[]; workPaymentTransactionIds: string[]; work: WorkOverview | null;
  initialCommitment?: { data: CommitmentHistory; occurrence: DisplayOccurrence | null } };

export function useFinance(initialView: FinanceView = 'dashboard', initialRecordId?: string, initialDueDate?: string, workSummaryOnly = false) {
  const db = useDatabase();
  const access = useMemo(() => createFinanceDataAccess(db, randomUUID), [db]);
  const commitmentAccess = useMemo(() => createCommitmentDataAccess(db, randomUUID), [db]);
  const workAccess = useMemo(() => createWorkDataAccess(db, randomUUID), [db]);
  const [today, setToday] = useState(() => localDateString(new Date()));
  const todayRef = useRef(today);
  const [selection, setSelection] = useState<Selection>(() => ({ view: initialView, period: periodBounds('month', today) }));
  const selectionRef = useRef(selection);
  const [loaded, setLoaded] = useState<{ selection: Selection; snapshot: Snapshot } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((next: Selection) => {
    try {
      let snapshot: Snapshot;
      if (next.view === 'dashboard') {
        snapshot = { ...access.readDashboard(next.period), transactions: [], items: [], paymentTransactionIds: [], workPaymentTransactionIds: [], work: null };
      } else if (next.view === 'transactions') snapshot = { ...access.read(), analytics: null, items: [], work: null };
      else if (next.view === 'commitments') {
        const initialCommitment = initialView === 'commitments' && initialRecordId && initialDueDate ? {
          data: commitmentAccess.readHistory(initialRecordId),
          occurrence: commitmentAccess.readRange({ from: initialDueDate, to: initialDueDate }).find((row) => row.commitment.id === initialRecordId)?.occurrence ?? null,
        } : undefined;
        snapshot = { ...commitmentAccess.read(), initialCommitment, categories: access.readCategories(), transactions: [], analytics: null, paymentTransactionIds: [], workPaymentTransactionIds: [], work: null };
      }
      else snapshot = { work: workAccess.readOverview({ includeJobs: !workSummaryOnly }), categories: access.readCategories(), transactions: [], analytics: null, items: [], paymentTransactionIds: [], workPaymentTransactionIds: [] };
      setLoaded({ selection: next, snapshot });
      setError(null);
    } catch (cause) {
      // A read error must not unmount views that own working editor drafts.
      setError(financeError(cause, 'Unable to load Finance. Please try again.'));
    }
  }, [access, commitmentAccess, workAccess, initialView, initialRecordId, initialDueDate, workSummaryOnly]);

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
    // Refocusing refreshes the current view, including any open editor it owns.
    reload();
    const timer = setInterval(() => { if (localDateString(new Date()) !== todayRef.current) reload(); }, 60000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') reload(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [reload]));

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

  // Keep usable data without showing another view's rows or another period's totals.
  let snapshot = loaded?.selection.view === selection.view ? loaded.snapshot : null;
  if (snapshot?.analytics && loaded && (loaded.selection.period.startDate !== selection.period.startDate || loaded.selection.period.endDate !== selection.period.endDate)) {
    snapshot = { ...snapshot, analytics: null };
  }
  return { access, commitmentAccess, workAccess, snapshot, error, reload, mutate, selection, today, setView, setPeriodKind, navigatePeriod, returnToCurrent };
}

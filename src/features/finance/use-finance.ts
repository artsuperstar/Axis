import { randomUUID } from 'expo-crypto';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import type { FinanceCategory, FinanceTransaction, TransactionLedgerPage, TransactionLedgerFilter } from './types';
import { defaultLedgerFilter, ledgerFilterKey } from './transactions-filter';

export type FinanceView = 'dashboard' | 'transactions' | 'commitments' | 'work';
type Selection = { view: FinanceView; period: FinancePeriod; ledgerFilter: TransactionLedgerFilter };
type Snapshot = { transactions: FinanceTransaction[]; categories: FinanceCategory[]; analytics: FinanceAnalytics | null; items: CommitmentItem[]; work: WorkOverview | null;
  ledger?: TransactionLedgerPage; initialCommitment?: { data: CommitmentHistory; occurrence: DisplayOccurrence | null } };

export function useFinance(initialView: FinanceView = 'dashboard', initialRecordId?: string, initialDueDate?: string, workSummaryOnly = false) {
  const db = useDatabase();
  const access = useMemo(() => createFinanceDataAccess(db, randomUUID), [db]);
  const commitmentAccess = useMemo(() => createCommitmentDataAccess(db, randomUUID), [db]);
  const workAccess = useMemo(() => createWorkDataAccess(db, randomUUID), [db]);
  const [today, setToday] = useState(() => localDateString(new Date()));
  const todayRef = useRef(today);
  const [selection, setSelection] = useState<Selection>(() => ({ view: initialView, period: periodBounds('month', today), ledgerFilter: defaultLedgerFilter }));
  const selectionRef = useRef(selection);
  const [loaded, setLoaded] = useState<{ selection: Selection; snapshot: Snapshot } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ledgerLimit = useRef(40);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchingTransactions, setSearchingTransactions] = useState(false);
  useEffect(() => () => { if (searchTimer.current) clearTimeout(searchTimer.current); }, []);

  const load = useCallback((next: Selection) => {
    try {
      let snapshot: Snapshot;
      if (next.view === 'dashboard') {
        snapshot = { ...access.readDashboard(next.period), transactions: [], items: [], work: null };
      } else if (next.view === 'transactions') {
        const ledger = access.readLedgerPage(ledgerLimit.current, undefined, next.ledgerFilter);
        snapshot = { transactions: ledger.transactions, categories: ledger.categories, ledger, analytics: null, items: [], work: null };
      }
      else if (next.view === 'commitments') {
        const initialCommitment = initialView === 'commitments' && initialRecordId && initialDueDate ? {
          data: commitmentAccess.readHistory(initialRecordId),
          occurrence: commitmentAccess.readRange({ from: initialDueDate, to: initialDueDate }).find((row) => row.commitment.id === initialRecordId)?.occurrence ?? null,
        } : undefined;
        snapshot = { ...commitmentAccess.read(), initialCommitment, categories: access.readCategories(), transactions: [], analytics: null, work: null };
      }
      else snapshot = { work: workAccess.readOverview({ includeJobs: !workSummaryOnly }), categories: access.readCategories(), transactions: [], analytics: null, items: [] };
      setLoaded({ selection: next, snapshot });
      setError(null);
    } catch (cause) {
      // A read error must not unmount views that own working editor drafts.
      setError(financeError(cause, 'Unable to load Finance. Please try again.'));
    }
  }, [access, commitmentAccess, workAccess, initialView, initialRecordId, initialDueDate, workSummaryOnly]);

  const select = useCallback((next: Selection) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = null;
    setSearchingTransactions(false);
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
    return () => { clearInterval(timer); subscription.remove(); if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [reload]));

  function setView(view: FinanceView) {
    select({ ...syncToday().selection, view });
  }

  function setTransactionType(type: TransactionLedgerFilter['type']) {
    ledgerLimit.current = 40;
    select({ ...selectionRef.current, ledgerFilter: { ...selectionRef.current.ledgerFilter, type } });
  }

  function setTransactionQuery(query: string) {
    const next = { ...selectionRef.current, ledgerFilter: { ...selectionRef.current.ledgerFilter, query } };
    selectionRef.current = next;
    setSelection(next);
    ledgerLimit.current = 40;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSearchingTransactions(true);
    searchTimer.current = setTimeout(() => {
      searchTimer.current = null;
      load(next);
      setSearchingTransactions(false);
    }, 180);
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

  function loadMoreTransactions() {
    if (selection.view !== 'transactions' || loaded?.selection.view !== 'transactions' || !loaded.snapshot.ledger?.next
      || ledgerFilterKey(selection.ledgerFilter) !== ledgerFilterKey(loaded.selection.ledgerFilter)) return;
    try {
      const page = access.readLedgerPage(40, loaded.snapshot.ledger.next, selection.ledgerFilter);
      const ledger = { ...page, transactions: [...loaded.snapshot.transactions, ...page.transactions],
        sources: { ...loaded.snapshot.ledger.sources, ...page.sources } };
      ledgerLimit.current += 40;
      setLoaded({ ...loaded, snapshot: { ...loaded.snapshot, transactions: ledger.transactions, categories: ledger.categories, ledger } });
      setError(null);
    } catch (cause) {
      setError(financeError(cause, 'Unable to load older transactions. Please try again.'));
    }
  }

  // Keep usable data without showing another view's rows or another period's totals.
  let snapshot = loaded?.selection.view === selection.view ? loaded.snapshot : null;
  if (snapshot?.analytics && loaded && (loaded.selection.period.startDate !== selection.period.startDate || loaded.selection.period.endDate !== selection.period.endDate)) {
    snapshot = { ...snapshot, analytics: null };
  }
  const transactionResultsCurrent = loaded?.selection.view === 'transactions' && ledgerFilterKey(selection.ledgerFilter) === ledgerFilterKey(loaded.selection.ledgerFilter);
  return { access, commitmentAccess, workAccess, snapshot, error, reload, mutate, selection, today, setView, setPeriodKind, navigatePeriod, returnToCurrent, loadMoreTransactions,
    setTransactionType, setTransactionQuery, searchingTransactions, transactionResultsCurrent };
}

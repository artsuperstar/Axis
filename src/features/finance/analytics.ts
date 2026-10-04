import { and, eq, gte, isNull, lte } from 'drizzle-orm';

import type { AxisDatabase } from '@/database/client';
import { financeCategories, financeTransactions } from '@/database/schema';

import { validateAmountMinor } from './money';
import type { FinancePeriod } from './periods';
import type { FinanceTransaction } from './types';

export type AnalyticsTransaction = Pick<FinanceTransaction, 'type' | 'amountMinor' | 'categoryId'> & { categoryName: string | null };
export type CategorySpending = { categoryId: string | null; name: string; amountMinor: bigint };
export type FinanceAnalytics<T extends Pick<FinancePeriod, 'startDate' | 'endDate'> = FinancePeriod> = {
  period: T;
  incomeMinor: bigint;
  expensesMinor: bigint;
  netFlowMinor: bigint;
  transactionCount: number;
  spending: CategorySpending[];
};

/** Only eligible rows enter this reducer. Money stays integer even above Number's safe total. */
export function aggregateFinance<T extends Pick<FinancePeriod, 'startDate' | 'endDate'>>(rows: AnalyticsTransaction[], period: T): FinanceAnalytics<T> {
  let incomeMinor = 0n;
  let expensesMinor = 0n;
  const categories = new Map<string | null, CategorySpending>();
  for (const row of rows) {
    const amount = BigInt(validateAmountMinor(row.amountMinor));
    if (row.type === 'income') { incomeMinor += amount; continue; }
    expensesMinor += amount;
    const category = categories.get(row.categoryId) ?? {
      categoryId: row.categoryId, name: row.categoryId === null ? 'No category' : row.categoryName ?? 'Category unavailable', amountMinor: 0n,
    };
    category.amountMinor += amount;
    categories.set(row.categoryId, category);
  }
  const spending = [...categories.values()].sort((a, b) => a.amountMinor === b.amountMinor
    ? a.name.localeCompare(b.name) || (a.categoryId ?? '').localeCompare(b.categoryId ?? '')
    : a.amountMinor > b.amountMinor ? -1 : 1);
  return { period, incomeMinor, expensesMinor, netFlowMinor: incomeMinor - expensesMinor, transactionCount: rows.length, spending };
}

/** The existing partial date index filters SQLite rows before any JS monetary arithmetic. */
export function readFinanceAnalytics<T extends Pick<FinancePeriod, 'startDate' | 'endDate'>>(db: AxisDatabase, period: T) {
  const rows = db.select({ type: financeTransactions.type, amountMinor: financeTransactions.amountMinor,
    categoryId: financeTransactions.categoryId, categoryName: financeCategories.name })
    .from(financeTransactions).leftJoin(financeCategories, eq(financeTransactions.categoryId, financeCategories.id))
    .where(and(isNull(financeTransactions.deletedAt), gte(financeTransactions.transactionDate, period.startDate), lte(financeTransactions.transactionDate, period.endDate))).all();
  return aggregateFinance(rows, period);
}

/** A display-only ratio; no floating-point operation feeds back into monetary totals. */
export function spendingBarPercent(amountMinor: bigint, expensesMinor: bigint) {
  if (expensesMinor <= 0n || amountMinor <= 0n) return 0;
  if (amountMinor >= expensesMinor) return 100;
  return Number(amountMinor * 10000n / expensesMinor) / 100;
}

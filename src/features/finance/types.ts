import type { financeCategories, financeTransactions } from '@/database/schema';

export type FinanceTransaction = typeof financeTransactions.$inferSelect;
export type FinanceCategory = typeof financeCategories.$inferSelect;
export type TransactionType = FinanceTransaction['type'];
export type TransactionDraft = {
  type: TransactionType;
  amount: string;
  description: string;
  note: string;
  transactionDate: string;
  categoryId: string | null;
};

export const transactionTypes: readonly TransactionType[] = ['expense', 'income'];
export const transactionTypeLabels: Record<TransactionType, string> = { expense: 'Expense', income: 'Income' };

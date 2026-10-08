import type { financeCategories, financeTransactions } from '@/database/schema';

export type FinanceTransaction = typeof financeTransactions.$inferSelect;
export type FinanceCategory = typeof financeCategories.$inferSelect;
export type TransactionType = FinanceTransaction['type'];
export type TransactionCursor = { date: string; createdAt: number; id: string };
export type TransactionSource =
  | { kind: 'work'; clientName: string; jobs: { id: string; title: string }[] }
  | { kind: 'commitment'; name: string; commitmentId: string; dueDate: string };
export type TransactionLedgerPage = {
  transactions: FinanceTransaction[]; categories: FinanceCategory[];
  sources: Record<string, TransactionSource>; next: TransactionCursor | null;
};
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

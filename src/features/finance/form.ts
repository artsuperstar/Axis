import { localDateString, validDate } from '@/utils/calendar';

import { FinanceValidationError } from './errors';
import { formatBrlInput, parseBrlAmount } from './money';
import { transactionTypes, type FinanceCategory, type FinanceTransaction, type TransactionDraft, type TransactionType } from './types';

export function transactionDraft(transaction?: FinanceTransaction | null, now = new Date()): TransactionDraft {
  return {
    type: transaction?.type ?? 'expense', amount: transaction ? formatBrlInput(transaction.amountMinor) : '',
    description: transaction?.description ?? '', note: transaction?.note ?? '',
    transactionDate: transaction?.transactionDate ?? localDateString(now), categoryId: transaction?.categoryId ?? null,
  };
}

export function validateTransactionDraft(draft: TransactionDraft, today = localDateString(new Date())) {
  if (!transactionTypes.includes(draft.type)) throw new FinanceValidationError('Choose Income or Expense.');
  const description = draft.description.trim();
  if (!description) throw new FinanceValidationError('Enter a description.');
  const transactionDate = draft.transactionDate.trim();
  if (!validDate(transactionDate)) throw new FinanceValidationError('Choose a valid transaction date.');
  if (transactionDate > today) throw new FinanceValidationError('Record money that has already moved. Choose today or an earlier date.');
  return { type: draft.type, amountMinor: parseBrlAmount(draft.amount), description, note: draft.note.trim() || null,
    transactionDate, categoryId: draft.categoryId || null };
}

export function categoriesForType(categories: FinanceCategory[], type: TransactionType) {
  return categories.filter((category) => category.type === type && category.deletedAt === null);
}

export function changeTransactionType(draft: TransactionDraft, type: TransactionType, categories: FinanceCategory[]): TransactionDraft {
  if (type === draft.type) return draft;
  const compatible = categoriesForType(categories, type).some((category) => category.id === draft.categoryId);
  return { ...draft, type, categoryId: compatible ? draft.categoryId : null };
}

export function financeCategoryForTransaction(transaction: Pick<FinanceTransaction, 'categoryId' | 'type'>, categories: FinanceCategory[]) {
  return categories.find((category) => category.id === transaction.categoryId && category.type === transaction.type) ?? null;
}

export function financeCategoryName(transaction: Pick<FinanceTransaction, 'categoryId' | 'type'>, categories: FinanceCategory[]) {
  return financeCategoryForTransaction(transaction, categories)?.name ?? null;
}

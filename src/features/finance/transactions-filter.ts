import { canonicalSearchText } from '@/utils/text-normalization';

import { transactionTitle } from './transactions-presentation';
import type { FinanceCategory, FinanceTransaction, TransactionLedgerFilter, TransactionSource } from './types';

export const defaultLedgerFilter: TransactionLedgerFilter = { type: 'all', query: '' };
export function ledgerFilterKey(filter: TransactionLedgerFilter) {
  return JSON.stringify([filter.type, canonicalSearchText(filter.query)]);
}

/** Literal, accent-insensitive matching; category identity and archived names stay authoritative. */
export function transactionMatches(transaction: FinanceTransaction, needle: string, categories: ReadonlyMap<string, FinanceCategory>, source?: TransactionSource) {
  const category = transaction.categoryId ? categories.get(transaction.categoryId) : undefined;
  return [transaction.description, transactionTitle(transaction, source), category?.type === transaction.type ? category.name : '']
    .some(value => canonicalSearchText(value ?? '').includes(needle));
}

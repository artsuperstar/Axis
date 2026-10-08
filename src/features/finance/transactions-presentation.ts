import { addDays, pickerValue } from '@/utils/calendar';

import { financeCategoryName } from './form';
import { formatBrlAmount } from './money';
import { transactionTypeLabels, type FinanceCategory, type FinanceTransaction, type TransactionSource } from './types';

export function transactionDateHeading(date: string, today: string) {
  if (date === today) return 'Today';
  if (date === addDays(today, -1)) return 'Yesterday';
  return pickerValue(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...(date.slice(0, 4) !== today.slice(0, 4) ? { year: 'numeric' } : {}) });
}

/** The data layer owns ordering; grouping preserves every tie within a local civil date. */
export function transactionSections(transactions: FinanceTransaction[], today: string) {
  const groups = new Map<string, { key: string; date: string; title: string; data: FinanceTransaction[] }>();
  for (const transaction of transactions) {
    const section = groups.get(transaction.transactionDate) ?? { key: transaction.transactionDate, date: transaction.transactionDate, title: transactionDateHeading(transaction.transactionDate, today), data: [] };
    section.data.push(transaction); groups.set(section.date, section);
  }
  return [...groups.values()];
}

export function transactionPresentation(transaction: FinanceTransaction, categories: FinanceCategory[], today: string, source?: TransactionSource) {
  const title = source?.kind === 'commitment' ? source.name : source?.kind === 'work' && source.jobs.length
    ? `${source.jobs[0].title}${source.jobs.length > 1 ? ` + ${source.jobs.length - 1} more` : ''} payment` : transaction.description;
  const category = financeCategoryName(transaction, categories);
  const context = source?.kind === 'work' ? `${source.clientName} · Work` : source?.kind === 'commitment' ? 'Commitment' : null;
  const amount = `${transaction.type === 'income' ? '+' : '-'}${formatBrlAmount(transaction.amountMinor)}`;
  return { title, amount, category, context,
    accessibilityLabel: [title, transactionTypeLabels[transaction.type], formatBrlAmount(transaction.amountMinor),
      transactionDateHeading(transaction.transactionDate, today), category, context].filter(Boolean).join(', ') };
}

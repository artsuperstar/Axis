import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';

import type { AxisDatabase } from '@/database/client';
import { financeCategories, financeTransactions } from '@/database/schema';
import { localDateString } from '@/utils/calendar';

import { FinanceValidationError } from './errors';
import { validateTransactionDraft } from './form';
import { transactionTypes, type FinanceTransaction, type TransactionDraft, type TransactionType } from './types';

export function createFinanceDataAccess(db: AxisDatabase, newId: () => string, now = Date.now) {
  function activeTransaction(id: string) {
    const transaction = db.select().from(financeTransactions).where(and(eq(financeTransactions.id, id), isNull(financeTransactions.deletedAt))).get();
    if (!transaction) throw new FinanceValidationError('This transaction is no longer available.');
    return transaction;
  }

  function transactionValues(draft: TransactionDraft, existing?: FinanceTransaction) {
    const values = validateTransactionDraft(draft, localDateString(new Date(now())));
    if (values.categoryId) {
      const category = db.select().from(financeCategories).where(eq(financeCategories.id, values.categoryId)).get();
      const retainedReference = existing?.categoryId === values.categoryId && existing.type === values.type;
      if (!category || category.type !== values.type || (category.deletedAt !== null && !retainedReference)) {
        throw new FinanceValidationError('Choose an available category for this transaction type.');
      }
    }
    return values;
  }

  return {
    read() {
      return {
        transactions: db.select().from(financeTransactions).where(isNull(financeTransactions.deletedAt))
          .orderBy(desc(financeTransactions.transactionDate), desc(financeTransactions.createdAt), asc(financeTransactions.id)).all(),
        // Historical transaction display resolves archived categories; selectors filter them separately.
        categories: db.select().from(financeCategories)
          .orderBy(asc(financeCategories.type), desc(financeCategories.isBuiltIn), asc(financeCategories.name), asc(financeCategories.id)).all(),
      };
    },

    createTransaction(draft: TransactionDraft) {
      const values = transactionValues(draft);
      const timestamp = now();
      const id = newId();
      db.insert(financeTransactions).values({ ...values, id, createdAt: timestamp, updatedAt: timestamp }).run();
      return id;
    },

    editTransaction(id: string, draft: TransactionDraft) {
      const existing = activeTransaction(id);
      const values = transactionValues(draft, existing);
      const timestamp = Math.max(now(), existing.updatedAt + 1);
      db.update(financeTransactions).set({ ...values, updatedAt: timestamp }).where(eq(financeTransactions.id, id)).run();
    },

    deleteTransaction(id: string) {
      const existing = activeTransaction(id);
      const timestamp = Math.max(now(), existing.updatedAt + 1);
      db.update(financeTransactions).set({ deletedAt: timestamp, updatedAt: timestamp }).where(eq(financeTransactions.id, id)).run();
    },

    createCategory(name: string, type: TransactionType) {
      if (!transactionTypes.includes(type)) throw new FinanceValidationError('Choose Income or Expense for the category.');
      const normalized = name.trim().replace(/\s+/g, ' ');
      if (!normalized) throw new FinanceValidationError('Enter a category name.');
      const duplicate = db.select().from(financeCategories).where(and(eq(financeCategories.type, type), isNull(financeCategories.deletedAt),
        sql`lower(${financeCategories.name}) = lower(${normalized})`)).get();
      if (duplicate) throw new FinanceValidationError('A category with this name already exists for this type.');
      const timestamp = now();
      return db.insert(financeCategories).values({ id: newId(), name: normalized, type, isBuiltIn: false, createdAt: timestamp, updatedAt: timestamp }).returning().get();
    },

    deleteCategory(id: string) {
      const category = db.select().from(financeCategories).where(and(eq(financeCategories.id, id), isNull(financeCategories.deletedAt))).get();
      if (!category) throw new FinanceValidationError('This category is no longer available.');
      if (category.isBuiltIn) throw new FinanceValidationError('Built-in categories cannot be deleted.');
      const timestamp = Math.max(now(), category.updatedAt + 1);
      db.update(financeCategories).set({ deletedAt: timestamp, updatedAt: timestamp }).where(eq(financeCategories.id, id)).run();
    },
  };
}

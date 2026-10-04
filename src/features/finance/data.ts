import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';

import type { AxisDatabase } from '@/database/client';
import { commitmentOccurrences, financeCategories, financeTransactions, workPaymentAllocations } from '@/database/schema';
import { localDateString } from '@/utils/calendar';

import { FinanceValidationError } from './errors';
import { readFinanceAnalytics } from './analytics';
import { validateTransactionDraft } from './form';
import type { FinancePeriod } from './periods';
import { transactionTypes, type FinanceTransaction, type TransactionDraft, type TransactionType } from './types';

export function createFinanceDataAccess(db: AxisDatabase, newId: () => string, now = Date.now) {
  function readCategories() {
    // Historical display and analytics resolve archived categories; selectors filter them separately.
    return db.select().from(financeCategories)
      .orderBy(asc(financeCategories.type), desc(financeCategories.isBuiltIn), asc(financeCategories.name), asc(financeCategories.id)).all();
  }

  function activeTransaction(id: string) {
    const transaction = db.select().from(financeTransactions).where(and(eq(financeTransactions.id, id), isNull(financeTransactions.deletedAt))).get();
    if (!transaction) throw new FinanceValidationError('This transaction is no longer available.');
    return transaction;
  }

  function linkedPayment(id: string) {
    return db.select({ id: commitmentOccurrences.id }).from(commitmentOccurrences)
      .where(and(eq(commitmentOccurrences.paidTransactionId, id), eq(commitmentOccurrences.status, 'paid'), isNull(commitmentOccurrences.deletedAt))).get();
  }

  function linkedWorkPayment(id: string) {
    return db.select({ id: workPaymentAllocations.id }).from(workPaymentAllocations)
      .where(and(eq(workPaymentAllocations.financeTransactionId, id), isNull(workPaymentAllocations.deletedAt))).get();
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
    readCategories,
    read() {
      return {
        transactions: db.select().from(financeTransactions).where(isNull(financeTransactions.deletedAt))
          .orderBy(desc(financeTransactions.transactionDate), desc(financeTransactions.createdAt), asc(financeTransactions.id)).all(),
        categories: readCategories(),
        paymentTransactionIds: db.select({ id: commitmentOccurrences.paidTransactionId }).from(commitmentOccurrences)
          .where(and(eq(commitmentOccurrences.status, 'paid'), isNull(commitmentOccurrences.deletedAt))).all().map((row) => row.id!),
        workPaymentTransactionIds: [...new Set(db.select({ id: workPaymentAllocations.financeTransactionId }).from(workPaymentAllocations)
          .where(isNull(workPaymentAllocations.deletedAt)).all().map((row) => row.id))],
      };
    },

    readDashboard(period: FinancePeriod) {
      return { analytics: readFinanceAnalytics(db, period), categories: readCategories() };
    },

    createTransaction(draft: TransactionDraft) {
      const values = transactionValues(draft);
      const timestamp = now();
      const id = newId();
      db.insert(financeTransactions).values({ ...values, id, createdAt: timestamp, updatedAt: timestamp }).run();
      return id;
    },

    editTransaction(id: string, draft: TransactionDraft) {
      db.transaction(() => {
        const existing = activeTransaction(id);
        if (linkedPayment(id) && draft.type !== 'expense') throw new FinanceValidationError('A commitment payment must remain an Expense. Undo payment in Commitments to remove it.');
        const values = transactionValues(draft, existing);
        if (linkedWorkPayment(id)) {
          if (values.type !== 'income') throw new FinanceValidationError('A Work payment must remain Income. Use Undo payment in Work to correct it.');
          const total = db.select({ amountMinor: workPaymentAllocations.amountMinor }).from(workPaymentAllocations)
            .where(and(eq(workPaymentAllocations.financeTransactionId, id), isNull(workPaymentAllocations.deletedAt))).all()
            .reduce((sum, allocation) => sum + BigInt(allocation.amountMinor), 0n);
          if (BigInt(values.amountMinor) !== total) throw new FinanceValidationError('A Work payment amount must match its allocations. Use Undo payment in Work to correct it.');
        }
        const timestamp = Math.max(now(), existing.updatedAt + 1);
        db.update(financeTransactions).set({ ...values, updatedAt: timestamp }).where(eq(financeTransactions.id, id)).run();
      }, { behavior: 'immediate' });
    },

    deleteTransaction(id: string) {
      db.transaction(() => {
        const existing = activeTransaction(id);
        if (linkedPayment(id)) throw new FinanceValidationError('This is a commitment payment. Use Undo payment in Commitments history to remove it.');
        if (linkedWorkPayment(id)) throw new FinanceValidationError('This is a Work payment. Use Undo payment in Work to remove it.');
        const timestamp = Math.max(now(), existing.updatedAt + 1);
        db.update(financeTransactions).set({ deletedAt: timestamp, updatedAt: timestamp }).where(eq(financeTransactions.id, id)).run();
      }, { behavior: 'immediate' });
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

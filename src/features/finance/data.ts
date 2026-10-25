import { and, asc, desc, eq, gt, inArray, isNull, lt, or, sql } from 'drizzle-orm';

import type { AxisDatabase } from '@/database/client';
import { commitmentOccurrences, financeCategories, financeCommitments, financeTransactions, workCounterparties, workEntries, workPaymentAllocations } from '@/database/schema';
import { localDateString, validDate } from '@/utils/calendar';
import { canonicalIdentityName, canonicalSearchText, normalizeIdentityDisplayName } from '@/utils/text-normalization';

import { defaultLedgerFilter, transactionMatches } from './transactions-filter';
import { FinanceValidationError } from './errors';
import { readFinanceAnalytics } from './analytics';
import { validateTransactionDraft } from './form';
import { validateAmountMinor } from './money';
import { jobTitle } from './work/presentation';
import type { FinancePeriod } from './periods';
import { transactionTypes, type FinanceTransaction, type TransactionDraft, type TransactionType, type TransactionCursor, type TransactionLedgerPage, type TransactionSource, type TransactionLedgerFilter } from './types';

export function createFinanceDataAccess(db: AxisDatabase, newId: () => string, now = Date.now) {
  function readCategories(query: Pick<AxisDatabase, 'select'> = db) {
    // Historical display and analytics resolve archived categories; selectors filter them separately.
    return query.select().from(financeCategories)
      .orderBy(asc(financeCategories.type), desc(financeCategories.isBuiltIn), asc(financeCategories.name), asc(financeCategories.id)).all();
  }

  function activeTransaction(id: string) {
    const transaction = db.select().from(financeTransactions).where(and(eq(financeTransactions.id, id), isNull(financeTransactions.deletedAt))).get();
    if (!transaction) throw new FinanceValidationError('This transaction is no longer available.');
    return transaction;
  }

  function linkedPayment(id: string) {
    return db.select({ id: commitmentOccurrences.id }).from(commitmentOccurrences)
      .where(eq(commitmentOccurrences.paidTransactionId, id)).get();
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
    /** Group equal amounts before exact JS arithmetic; SUM can overflow SQLite's signed 64-bit integer. */
    readSpentOnDate(date: string): bigint {
      if (!validDate(date)) throw new FinanceValidationError('Choose a valid transaction date.');
      const groups = db.select({ amountMinor: financeTransactions.amountMinor, count: sql<number>`count(*)`.mapWith(Number) })
        .from(financeTransactions).where(and(eq(financeTransactions.transactionDate, date),
          eq(financeTransactions.type, 'expense'), isNull(financeTransactions.deletedAt)))
        .groupBy(financeTransactions.amountMinor).all();
      return groups.reduce((sum, group) => sum + BigInt(validateAmountMinor(group.amountMinor)) * BigInt(group.count), 0n);
    },
    /** Ledger-only projection. Stable date/timestamp/ID cursors preserve the existing order. */
    readLedgerPage(limit = 40, before?: TransactionCursor, filter: TransactionLedgerFilter = defaultLedgerFilter): TransactionLedgerPage {
      if (!Number.isSafeInteger(limit) || limit < 1) throw new FinanceValidationError('Invalid transaction page size.');
      if (filter.type !== 'all' && !transactionTypes.includes(filter.type)) throw new FinanceValidationError('Invalid transaction filter.');
      return db.transaction((query) => {
        const categories = readCategories(query);
        const categoryMap = new Map(categories.map(category => [category.id, category]));
        const needle = canonicalSearchText(filter.query);
        function readSources(ids: string[]): Record<string, TransactionSource> {
          const sources: Record<string, TransactionSource> = {};
          if (ids.length) {
            const work = query.select({ transactionId: workPaymentAllocations.financeTransactionId, id: workEntries.id,
              title: workEntries.title, description: workEntries.description, clientName: workCounterparties.name })
              .from(workPaymentAllocations).innerJoin(workEntries, eq(workEntries.id, workPaymentAllocations.workEntryId))
              .innerJoin(workCounterparties, eq(workCounterparties.id, workEntries.counterpartyId))
              .where(and(inArray(workPaymentAllocations.financeTransactionId, ids), isNull(workPaymentAllocations.deletedAt)))
              .orderBy(asc(workPaymentAllocations.createdAt), asc(workPaymentAllocations.id)).all();
            for (const row of work) {
              const source = sources[row.transactionId] ?? { kind: 'work' as const, clientName: row.clientName, jobs: [] };
              if (source.kind === 'work') source.jobs.push({ id: row.id, title: jobTitle(row) });
              sources[row.transactionId] = source;
            }
            const commitments = query.select({ transactionId: commitmentOccurrences.paidTransactionId, commitmentId: financeCommitments.id,
              name: financeCommitments.title, dueDate: commitmentOccurrences.dueDate }).from(commitmentOccurrences)
              .innerJoin(financeCommitments, eq(financeCommitments.id, commitmentOccurrences.commitmentId))
              // Retained historical ownership must not silently become a manual entry.
              // The source service validates active relationship/parent before reversal.
              .where(inArray(commitmentOccurrences.paidTransactionId, ids)).all();
            for (const row of commitments) if (row.transactionId) sources[row.transactionId] = { kind: 'commitment', name: row.name, commitmentId: row.commitmentId, dueDate: row.dueDate };
          }
          return sources;
        }
        function candidates(size: number, cursor?: TransactionCursor) {
          return query.select().from(financeTransactions).where(and(isNull(financeTransactions.deletedAt),
            filter.type === 'all' ? undefined : eq(financeTransactions.type, filter.type), cursor ? or(
              lt(financeTransactions.transactionDate, cursor.date),
              and(eq(financeTransactions.transactionDate, cursor.date), lt(financeTransactions.createdAt, cursor.createdAt)),
              and(eq(financeTransactions.transactionDate, cursor.date), eq(financeTransactions.createdAt, cursor.createdAt), gt(financeTransactions.id, cursor.id))) : undefined))
            .orderBy(desc(financeTransactions.transactionDate), desc(financeTransactions.createdAt), asc(financeTransactions.id)).limit(size).all();
        }
        const cursorFor = (row: FinanceTransaction): TransactionCursor => ({ date: row.transactionDate, createdAt: row.createdAt, id: row.id });
        let rows: FinanceTransaction[];
        let sources: Record<string, TransactionSource>;
        if (!needle) {
          // Preserve the inexpensive indexed path and its bounded lookahead for ordinary browsing.
          rows = candidates(limit + 1, before);
          sources = readSources(rows.slice(0, limit).map(row => row.id));
        } else {
          rows = []; sources = {};
          let cursor = before;
          // Unicode normalization cannot use SQLite's ASCII-only lower(). Scan bounded batches
          // inside one snapshot, retaining only page + lookahead matches, never the lifetime ledger.
          while (rows.length <= limit) {
            const batch = candidates(128, cursor);
            const batchSources = readSources(batch.map(row => row.id));
            for (const row of batch) {
              if (!transactionMatches(row, needle, categoryMap, batchSources[row.id])) continue;
              rows.push(row);
              if (batchSources[row.id]) sources[row.id] = batchSources[row.id];
              if (rows.length > limit) break;
            }
            if (rows.length > limit || batch.length < 128) break;
            cursor = cursorFor(batch[batch.length - 1]);
          }
        }
        const transactions = rows.slice(0, limit);
        const last = transactions.at(-1);
        // Cursor belongs to the last returned match, not a scanned candidate or lookahead.
        const visibleSources = Object.fromEntries(transactions.filter(row => sources[row.id]).map(row => [row.id, sources[row.id]]));
        return { transactions, categories, sources: visibleSources, next: rows.length > limit && last ? cursorFor(last) : null };
      });
    },
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
      const normalized = normalizeIdentityDisplayName(name);
      if (!normalized) throw new FinanceValidationError('Enter a category name.');
      return db.transaction((query) => {
        const identity = canonicalIdentityName(normalized);
        const duplicate = query.select().from(financeCategories)
          .where(and(eq(financeCategories.type, type), isNull(financeCategories.deletedAt))).all()
          .some((category) => canonicalIdentityName(category.name) === identity);
        if (duplicate) throw new FinanceValidationError('A category with this name already exists for this type.');
        const timestamp = now();
        return query.insert(financeCategories).values({ id: newId(), name: normalized, type, isBuiltIn: false,
          createdAt: timestamp, updatedAt: timestamp }).returning().get();
      }, { behavior: 'immediate' });
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

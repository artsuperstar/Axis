import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';

import type { AxisDatabase } from '@/database/client';
import { financeCategories, financeTransactions, workCounterparties as counterparties, workEntries as entries, workPaymentAllocations as allocations } from '@/database/schema';
import { localDateString } from '@/utils/calendar';

import { FinanceValidationError } from '../errors';
import { validateTransactionDraft } from '../form';
import { formatBrlInput, validateAmountMinor } from '../money';
import { allocationValues, earnedMinor, validateWorkDraft } from './form';
import type { WorkCounterparty, WorkDraft, WorkEntry, WorkItem, WorkPayment, WorkPaymentDraft, WorkSnapshot, WorkTotals } from './types';

type Query = Pick<AxisDatabase, 'select' | 'insert' | 'update'>;
const emptyTotals = (): WorkTotals => ({ earnedMinor: 0n, receivedMinor: 0n, outstandingMinor: 0n });

export function createWorkDataAccess(db: AxisDatabase, newId: () => string, now = Date.now) {
  const today = () => localDateString(new Date(now()));
  const stamp = (row: { updatedAt: number }) => Math.max(now(), row.updatedAt + 1);

  function party(query: Query, id: string) {
    const row = query.select().from(counterparties).where(eq(counterparties.id, id)).get();
    if (!row) throw new FinanceValidationError('This client is no longer available.');
    return row;
  }
  function entry(query: Query, id: string) {
    const row = query.select().from(entries).where(and(eq(entries.id, id), isNull(entries.deletedAt))).get();
    if (!row) throw new FinanceValidationError('This work entry is no longer available.');
    return row;
  }

  /** Read all active relationships in one snapshot and reject broken reconciliation instead of hiding debt. */
  function snapshot(query: Query): WorkSnapshot {
    const parties = query.select().from(counterparties).orderBy(asc(counterparties.name), asc(counterparties.id)).all();
    const work = query.select().from(entries).where(isNull(entries.deletedAt)).orderBy(desc(entries.workDate), asc(entries.id)).all();
    const workById = new Map(work.map((row) => [row.id, row]));
    const partyById = new Map(parties.map((row) => [row.id, row]));
    const relationships = query.select({ allocation: allocations, transaction: financeTransactions }).from(allocations)
      .innerJoin(financeTransactions, eq(allocations.financeTransactionId, financeTransactions.id)).where(isNull(allocations.deletedAt)).all();
    const received = new Map<string, bigint>();
    const payments = new Map<string, WorkPayment>();
    for (const { allocation, transaction } of relationships) {
      const workEntry = workById.get(allocation.workEntryId);
      const counterparty = workEntry && partyById.get(workEntry.counterpartyId);
      if (!workEntry || !counterparty || transaction.type !== 'income' || transaction.deletedAt !== null) throw new FinanceValidationError('A Work payment needs reconciliation.');
      validateAmountMinor(allocation.amountMinor);
      received.set(workEntry.id, (received.get(workEntry.id) ?? 0n) + BigInt(allocation.amountMinor));
      const payment = payments.get(transaction.id) ?? { transaction, counterparty, allocations: [] };
      if (payment.counterparty.id !== counterparty.id) throw new FinanceValidationError('A Work payment contains different clients.');
      payment.allocations.push({ ...allocation, description: workEntry.description });
      payments.set(transaction.id, payment);
    }
    for (const payment of payments.values()) {
      const total = payment.allocations.reduce((sum, row) => sum + BigInt(row.amountMinor), 0n);
      if (total !== BigInt(validateAmountMinor(payment.transaction.amountMinor))) throw new FinanceValidationError('A Work payment amount does not match its allocations.');
    }
    const totals = emptyTotals();
    const counterpartyTotals = new Map<string, WorkTotals & { counterparty: WorkCounterparty }>();
    const items: WorkItem[] = work.map((workEntry) => {
      const counterparty = partyById.get(workEntry.counterpartyId);
      if (!counterparty) throw new FinanceValidationError('A work entry has no historical client.');
      const earned = earnedMinor(workEntry); const paid = received.get(workEntry.id) ?? 0n;
      if (paid > BigInt(earned)) throw new FinanceValidationError('A work entry has received more than it earned.');
      const outstanding = BigInt(earned) - paid;
      const group = counterpartyTotals.get(counterparty.id) ?? { ...emptyTotals(), counterparty };
      for (const value of [totals, group]) { value.earnedMinor += BigInt(earned); value.receivedMinor += paid; value.outstandingMinor += outstanding; }
      counterpartyTotals.set(counterparty.id, group);
      return { entry: workEntry, counterparty, earnedMinor: earned, receivedMinor: Number(paid), outstandingMinor: Number(outstanding),
        status: paid === BigInt(earned) ? 'paid' : paid === 0n ? 'unpaid' : 'partial',
        overdue: outstanding > 0n && workEntry.expectedPaymentDate !== null && workEntry.expectedPaymentDate < today() };
    });
    return { items, counterparties: parties, payments: [...payments.values()].sort((a, b) => b.transaction.transactionDate.localeCompare(a.transaction.transactionDate)
      || b.transaction.createdAt - a.transaction.createdAt || a.transaction.id.localeCompare(b.transaction.id)), totals, counterpartyTotals: [...counterpartyTotals.values()] };
  }

  function validateCounterparty(query: Query, id: string, existing?: WorkEntry) {
    const counterparty = party(query, id);
    if (counterparty.deletedAt !== null && existing?.counterpartyId !== id) throw new FinanceValidationError('Choose an active client for new work.');
  }

  return {
    read: () => db.transaction((query) => snapshot(query)),

    createCounterparty(name: string) {
      const normalized = name.trim().replace(/\s+/g, ' ');
      if (!normalized) throw new FinanceValidationError('Enter a client name.');
      return db.transaction((query) => {
        if (query.select().from(counterparties).where(and(isNull(counterparties.deletedAt), sql`lower(${counterparties.name}) = lower(${normalized})`)).get()) {
          throw new FinanceValidationError('A client with this name already exists.');
        }
        const timestamp = now();
        return query.insert(counterparties).values({ id: newId(), name: normalized, createdAt: timestamp, updatedAt: timestamp }).returning().get();
      }, { behavior: 'immediate' });
    },

    archiveCounterparty(id: string) {
      const existing = party(db, id);
      if (existing.deletedAt !== null) return;
      const timestamp = stamp(existing);
      db.update(counterparties).set({ deletedAt: timestamp, updatedAt: timestamp }).where(eq(counterparties.id, id)).run();
    },

    create(draft: WorkDraft) {
      const values = validateWorkDraft(draft, today());
      return db.transaction((query) => {
        validateCounterparty(query, values.counterpartyId);
        const id = newId(); const timestamp = now();
        query.insert(entries).values({ ...values, id, createdAt: timestamp, updatedAt: timestamp }).run();
        return id;
      }, { behavior: 'immediate' });
    },

    edit(id: string, draft: WorkDraft) {
      const values = validateWorkDraft(draft, today());
      db.transaction((query) => {
        const existing = entry(query, id); validateCounterparty(query, values.counterpartyId, existing);
        const current = snapshot(query).items.find((item) => item.entry.id === id)!;
        if (earnedMinor(values) < current.receivedMinor) throw new FinanceValidationError('Earned amount cannot be less than the money already received. Undo incorrect payments first.');
        if (current.receivedMinor && values.counterpartyId !== existing.counterpartyId) throw new FinanceValidationError('Keep the client while payments are allocated. Undo payments before changing who this work is for.');
        query.update(entries).set({ ...values, updatedAt: stamp(existing) }).where(eq(entries.id, id)).run();
      }, { behavior: 'immediate' });
    },

    delete(id: string) {
      db.transaction((query) => {
        const existing = entry(query, id);
        if (query.select().from(allocations).where(and(eq(allocations.workEntryId, id), isNull(allocations.deletedAt))).get()) throw new FinanceValidationError('Undo this work entry’s payments before deleting it.');
        const timestamp = stamp(existing);
        query.update(entries).set({ deletedAt: timestamp, updatedAt: timestamp }).where(eq(entries.id, id)).run();
      }, { behavior: 'immediate' });
    },

    recordPayment(draft: WorkPaymentDraft) {
      const values = allocationValues(draft.allocations);
      return db.transaction((query) => {
        if (!draft.counterpartyId) throw new FinanceValidationError('Choose the client making this payment.');
        const counterparty = party(query, draft.counterpartyId);
        const current = new Map(snapshot(query).items.map((item) => [item.entry.id, item]));
        for (const allocation of values.allocations) {
          const item = current.get(allocation.workEntryId);
          if (!item || item.entry.counterpartyId !== counterparty.id) throw new FinanceValidationError('Choose outstanding work from this client only.');
          if (allocation.amountMinor > item.outstandingMinor) throw new FinanceValidationError(`Allocation for “${item.entry.description}” exceeds its outstanding amount. Refresh Work and try again.`);
        }
        if (draft.categoryId) {
          const category = query.select().from(financeCategories).where(eq(financeCategories.id, draft.categoryId)).get();
          if (!category || category.type !== 'income' || category.deletedAt !== null) throw new FinanceValidationError('Choose an active Income category or No category.');
        }
        // The counterparty name is the default ledger description; the total has no independent input.
        const transaction = validateTransactionDraft({ type: 'income', amount: formatBrlInput(values.amountMinor), description: counterparty.name,
          note: '', transactionDate: draft.paymentDate, categoryId: draft.categoryId }, today());
        const id = newId(); const timestamp = now();
        query.insert(financeTransactions).values({ ...transaction, id, createdAt: timestamp, updatedAt: timestamp }).run();
        for (const allocation of values.allocations) query.insert(allocations).values({ ...allocation, id: newId(), financeTransactionId: id, createdAt: timestamp }).run();
        return id;
      }, { behavior: 'immediate' });
    },

    undoPayment(id: string) {
      db.transaction((query) => {
        const payment = snapshot(query).payments.find((value) => value.transaction.id === id);
        if (!payment) throw new FinanceValidationError('This Work payment is no longer available.');
        const timestamp = stamp(payment.transaction);
        query.update(allocations).set({ deletedAt: timestamp }).where(and(eq(allocations.financeTransactionId, id), isNull(allocations.deletedAt))).run();
        query.update(financeTransactions).set({ deletedAt: timestamp, updatedAt: timestamp }).where(eq(financeTransactions.id, id)).run();
      }, { behavior: 'immediate' });
    },
  };
}

export type WorkDataAccess = ReturnType<typeof createWorkDataAccess>;

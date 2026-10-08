import { and, asc, desc, eq, gt, gte, inArray, isNull, lt, lte, or, sql, type SQL } from 'drizzle-orm';

import type { AxisDatabase } from '@/database/client';
import { financeCategories, financeTransactions, workCounterparties as counterparties, workEntries as entries, workPaymentAllocations as allocations } from '@/database/schema';
import { localDateString, validateDateRange, type DateRange } from '@/utils/calendar';
import { canonicalIdentityName, normalizeIdentityDisplayName } from '@/utils/text-normalization';

import { FinanceValidationError } from '../errors';
import { validateTransactionDraft } from '../form';
import { formatBrlInput, validateAmountMinor } from '../money';
import { allocationValues, earnedMinor, validateWorkDraft } from './form';
import { jobTitle } from './presentation';
import type { WorkCounterparty, WorkDraft, WorkEntry, WorkHistoryCursor, WorkHistoryPage, WorkItem, WorkOverview, WorkPayment, WorkPaymentDraft, WorkSnapshot, WorkTotals } from './types';

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
  function snapshot(query: Query, range?: DateRange, filter?: SQL): WorkSnapshot {
    const targeted = !!range || !!filter;
    const workFilter = and(isNull(entries.deletedAt), range ? and(gte(entries.expectedPaymentDate, range.from), lte(entries.expectedPaymentDate, range.to)) : undefined, filter);
    const work = query.select().from(entries).where(workFilter).orderBy(desc(entries.workDate), asc(entries.id)).all();
    const selectedPayments = query.select({ id: allocations.financeTransactionId }).from(allocations)
      .innerJoin(entries, eq(entries.id, allocations.workEntryId)).where(and(isNull(allocations.deletedAt), workFilter));
    // A combined receipt must reconcile in full even if only one of its entries is in the visible month.
    const relatedWork = targeted ? query.select({ entry: entries }).from(entries).innerJoin(allocations, eq(entries.id, allocations.workEntryId))
      .where(and(isNull(allocations.deletedAt), inArray(allocations.financeTransactionId, selectedPayments))).all().map(({ entry }) => entry) : work;
    const workById = new Map([...work, ...relatedWork].map((row) => [row.id, row]));
    const relatedParties = query.select({ id: entries.counterpartyId }).from(entries).innerJoin(allocations, eq(entries.id, allocations.workEntryId))
      .where(and(isNull(allocations.deletedAt), inArray(allocations.financeTransactionId, selectedPayments)));
    const parties = query.select().from(counterparties).where(targeted ? or(
      inArray(counterparties.id, query.select({ id: entries.counterpartyId }).from(entries).where(workFilter)),
      inArray(counterparties.id, relatedParties)) : undefined).orderBy(asc(counterparties.name), asc(counterparties.id)).all();
    const partyById = new Map(parties.map((row) => [row.id, row]));
    const relationships = query.select({ allocation: allocations, transaction: financeTransactions }).from(allocations)
      .innerJoin(financeTransactions, eq(allocations.financeTransactionId, financeTransactions.id))
      .where(and(isNull(allocations.deletedAt), targeted ? inArray(allocations.financeTransactionId, selectedPayments) : undefined)).all();
    const received = new Map<string, bigint>();
    const payments = new Map<string, WorkPayment>();
    for (const { allocation, transaction } of relationships) {
      const workEntry = workById.get(allocation.workEntryId);
      const counterparty = workEntry && partyById.get(workEntry.counterpartyId);
      if (!workEntry || workEntry.deletedAt !== null || !counterparty || transaction.type !== 'income' || transaction.deletedAt !== null) throw new FinanceValidationError('A Work payment needs reconciliation.');
      validateAmountMinor(allocation.amountMinor);
      received.set(workEntry.id, (received.get(workEntry.id) ?? 0n) + BigInt(allocation.amountMinor));
      const payment = payments.get(transaction.id) ?? { transaction, counterparty, allocations: [] };
      if (payment.counterparty.id !== counterparty.id) throw new FinanceValidationError('A Work payment contains different clients.');
      payment.allocations.push({ ...allocation, title: workEntry.title, description: workEntry.description });
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

  /** Compensation stays in earnedMinor. SQL only sums integer allocations, returned as text. */
  function balances(query: Query) {
    const broken = query.select({ id: allocations.financeTransactionId }).from(allocations)
      .innerJoin(financeTransactions, eq(financeTransactions.id, allocations.financeTransactionId))
      .innerJoin(entries, eq(entries.id, allocations.workEntryId)).where(isNull(allocations.deletedAt))
      .groupBy(allocations.financeTransactionId)
      .having(sql`sum(${allocations.amountMinor}) != ${financeTransactions.amountMinor}
        OR ${financeTransactions.deletedAt} IS NOT NULL OR ${financeTransactions.type} != 'income'
        OR count(DISTINCT ${entries.counterpartyId}) != 1 OR max(${entries.deletedAt} IS NOT NULL) != 0`).limit(1).get();
    if (broken) throw new FinanceValidationError('A Work payment needs reconciliation.');
    const rows = query.select({ id: entries.id, counterpartyId: entries.counterpartyId, workDate: entries.workDate,
      compensationType: entries.compensationType, durationMinutes: entries.durationMinutes, hourlyRateMinor: entries.hourlyRateMinor, fixedAmountMinor: entries.fixedAmountMinor,
      received: sql<string>`coalesce((SELECT cast(sum(a.amount_minor) as text) FROM work_payment_allocations a
        WHERE a.work_entry_id = work_entries.id AND a.deleted_at IS NULL), '0')` }).from(entries)
      .where(isNull(entries.deletedAt)).orderBy(desc(entries.workDate), asc(entries.id)).all();
    return rows.map((row) => {
      const earned = earnedMinor(row), received = BigInt(row.received);
      if (received > BigInt(earned)) throw new FinanceValidationError('A work entry has received more than it earned.');
      return { ...row, earned, received, outstanding: BigInt(earned) - received };
    });
  }
  type Balance = ReturnType<typeof balances>[number];
  function itemRows(query: Query, values: Balance[], parties: WorkCounterparty[]) {
    const byId = new Map(values.map((value) => [value.id, value]));
    const partyById = new Map(parties.map((party) => [party.id, party]));
    const items: WorkItem[] = [];
    // Actionable debt is unbounded by age; chunk SQL parameters, never truncate obligations.
    for (let i = 0; i < values.length; i += 400) {
      const page = values.slice(i, i + 400);
      const rows = query.select().from(entries).where(and(isNull(entries.deletedAt), inArray(entries.id, page.map((value) => value.id))))
        .orderBy(desc(entries.workDate), asc(entries.id)).limit(page.length).all();
      for (const row of rows) {
        const value = byId.get(row.id)!, counterparty = partyById.get(row.counterpartyId);
        if (!counterparty) throw new FinanceValidationError('A work entry has no historical client.');
        items.push({ entry: row, counterparty, earnedMinor: value.earned, receivedMinor: Number(value.received), outstandingMinor: Number(value.outstanding),
          status: value.outstanding === 0n ? 'paid' : value.received === 0n ? 'unpaid' : 'partial',
          overdue: value.outstanding > 0n && row.expectedPaymentDate !== null && row.expectedPaymentDate < today() });
      }
    }
    return items;
  }
  function paymentCount(query: Query, counterpartyId?: string) {
    return query.select({ count: sql<number>`count(DISTINCT ${allocations.financeTransactionId})`.mapWith(Number) }).from(allocations)
      .where(and(isNull(allocations.deletedAt), counterpartyId ? inArray(allocations.workEntryId,
        query.select({ id: entries.id }).from(entries).where(eq(entries.counterpartyId, counterpartyId))) : undefined)).get()!.count;
  }
  function historyPayments(query: Query, limit: number, before?: WorkHistoryCursor['payment'], counterpartyId?: string) {
    if (before === null) return { payments: [] as WorkPayment[], next: null };
    const selected = query.select({ id: financeTransactions.id, date: financeTransactions.transactionDate, createdAt: financeTransactions.createdAt })
      .from(financeTransactions).where(and(inArray(financeTransactions.id,
        query.select({ id: allocations.financeTransactionId }).from(allocations).where(and(isNull(allocations.deletedAt), counterpartyId ? inArray(allocations.workEntryId,
          query.select({ id: entries.id }).from(entries).where(eq(entries.counterpartyId, counterpartyId))) : undefined))), before ? or(
          lt(financeTransactions.transactionDate, before.date),
          and(eq(financeTransactions.transactionDate, before.date), lt(financeTransactions.createdAt, before.createdAt)),
          and(eq(financeTransactions.transactionDate, before.date), eq(financeTransactions.createdAt, before.createdAt), gt(financeTransactions.id, before.id))) : undefined))
      .orderBy(desc(financeTransactions.transactionDate), desc(financeTransactions.createdAt), asc(financeTransactions.id)).limit(limit + 1).all();
    const visible = selected.slice(0, limit);
    if (!visible.length) return { payments: [] as WorkPayment[], next: null };
    const rows = query.select({ allocation: allocations, transaction: financeTransactions, entry: entries, counterparty: counterparties }).from(allocations)
      .innerJoin(financeTransactions, eq(financeTransactions.id, allocations.financeTransactionId))
      .innerJoin(entries, eq(entries.id, allocations.workEntryId)).innerJoin(counterparties, eq(counterparties.id, entries.counterpartyId))
      .where(and(isNull(allocations.deletedAt), inArray(allocations.financeTransactionId, visible.map((row) => row.id)))).all();
    const grouped = new Map<string, WorkPayment>();
    for (const { allocation, transaction, entry, counterparty } of rows) {
      const payment = grouped.get(transaction.id) ?? { transaction, counterparty, allocations: [] };
      payment.allocations.push({ ...allocation, title: entry.title, description: entry.description }); grouped.set(transaction.id, payment);
    }
    const last = visible[visible.length - 1];
    return { payments: visible.map((row) => grouped.get(row.id)!), next: selected.length > limit ? last : null };
  }

  return {
    read: () => db.transaction((query) => snapshot(query)),
    readOverview({ includeJobs = true, counterpartyId }: { includeJobs?: boolean; counterpartyId?: string } = {}): WorkOverview {
      return db.transaction((query) => {
        const values = balances(query).filter((row) => !counterpartyId || row.counterpartyId === counterpartyId);
        const parties = query.select().from(counterparties).where(counterpartyId ? eq(counterparties.id, counterpartyId) : undefined).orderBy(asc(counterparties.name), asc(counterparties.id)).all();
        const totals = emptyTotals(), groups = new Map<string, WorkTotals & { counterparty: WorkCounterparty }>();
        const byId = new Map(parties.map((party) => [party.id, party]));
        for (const value of values) {
          const counterparty = byId.get(value.counterpartyId);
          if (!counterparty) throw new FinanceValidationError('A work entry has no historical client.');
          const group = groups.get(counterparty.id) ?? { ...emptyTotals(), counterparty };
          for (const total of [totals, group]) { total.earnedMinor += BigInt(value.earned); total.receivedMinor += value.received; total.outstandingMinor += value.outstanding; }
          groups.set(counterparty.id, group);
        }
        return { items: includeJobs ? itemRows(query, values.filter((row) => row.outstanding > 0n), parties) : [], counterparties: parties, totals,
          counterpartyTotals: [...groups.values()], settledCount: values.filter((row) => row.outstanding === 0n).length, paymentCount: paymentCount(query, counterpartyId) };
      });
    },
    readHistory(limit = 20, before?: WorkHistoryCursor, counterpartyId?: string): WorkHistoryPage {
      if (!Number.isSafeInteger(limit) || limit < 1) throw new FinanceValidationError('Invalid Work history page size.');
      return db.transaction((query) => {
        const values = balances(query), settled = values.filter((row) => row.outstanding === 0n && (!counterpartyId || row.counterpartyId === counterpartyId));
        const candidates = before?.entry === null ? [] : settled.filter((row) => !before?.entry || row.workDate < before.entry.date
          || (row.workDate === before.entry.date && row.id > before.entry.id));
        const selected = candidates.slice(0, limit), last = selected[selected.length - 1];
        const parties = query.select().from(counterparties).where(counterpartyId ? eq(counterparties.id, counterpartyId) : undefined).orderBy(asc(counterparties.name), asc(counterparties.id)).all();
        const payments = historyPayments(query, limit, before?.payment, counterpartyId);
        const entryNext = candidates.length > limit ? { date: last.workDate, id: last.id } : null;
        return { items: itemRows(query, selected, parties), payments: payments.payments, settledCount: settled.length, paymentCount: paymentCount(query, counterpartyId),
          next: entryNext || payments.next ? { entry: entryNext, payment: payments.next } : null };
      });
    },
    readDetail: (id: string) => db.transaction((query) => snapshot(query, undefined, eq(entries.id, id))),
    readRange(range: DateRange) {
      validateDateRange(range);
      return db.transaction((query) => snapshot(query, range).items.filter((item) => item.outstandingMinor > 0));
    },

    createCounterparty(name: string) {
      const normalized = normalizeIdentityDisplayName(name);
      if (!normalized) throw new FinanceValidationError('Enter a client name.');
      return db.transaction((query) => {
        const identity = canonicalIdentityName(normalized);
        if (query.select().from(counterparties).where(isNull(counterparties.deletedAt)).all()
          .some((counterparty) => canonicalIdentityName(counterparty.name) === identity)) {
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
          if (allocation.amountMinor > item.outstandingMinor) throw new FinanceValidationError(`Allocation for “${jobTitle(item.entry)}” exceeds its outstanding amount. Refresh Work and try again.`);
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

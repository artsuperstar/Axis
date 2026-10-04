import { and, asc, desc, eq, gt, gte, isNull, lt, lte, ne, or } from 'drizzle-orm';

import type { AxisDatabase } from '@/database/client';
import { commitmentOccurrences as occurrences, commitmentSchedules as schedules, financeCategories, financeCommitments as commitments, financeTransactions } from '@/database/schema';
import { addDays, localDateString, validDate, validateDateRange, type DateRange } from '@/utils/calendar';

import { FinanceValidationError } from '../errors';
import { validateAmountMinor } from '../money';
import { validateCommitmentDraft, validatePayment } from './form';
import { duesThrough, historyStart, lastScheduledIndex, proposedResumeDate, scheduleDue, scheduledDues, upcomingEnd } from './scheduling';
import type { Commitment, CommitmentDraft, CommitmentItem, CommitmentOccurrence, DisplayOccurrence, OccurrenceTarget, ScheduledDue } from './types';

type Query = Pick<AxisDatabase, 'select' | 'insert' | 'update'>;
const displayOccurrence = (row: CommitmentOccurrence): DisplayOccurrence => ({ ...row });
const previewOccurrence = (row: ScheduledDue): DisplayOccurrence => ({ ...row, id: null, status: 'pending', paidTransactionId: null, resolvedAt: null });

export function createCommitmentDataAccess(db: AxisDatabase, newId: () => string, now = Date.now) {
  const today = () => localDateString(new Date(now()));
  const stamp = (row: { updatedAt: number }) => Math.max(now(), row.updatedAt + 1);

  function parent(query: Query, id: string) {
    const row = query.select().from(commitments).where(and(eq(commitments.id, id), isNull(commitments.deletedAt))).get();
    if (!row) throw new FinanceValidationError('This commitment is no longer available.');
    return row;
  }

  function rules(query: Query, id: string) {
    return query.select().from(schedules).where(eq(schedules.commitmentId, id)).orderBy(asc(schedules.createdAt), asc(schedules.id)).all();
  }

  function rows(query: Query, id: string) {
    return query.select().from(occurrences).where(and(eq(occurrences.commitmentId, id), isNull(occurrences.deletedAt))).orderBy(asc(occurrences.dueDate)).all();
  }

  function category(query: Query, id: string | null, existing?: Commitment) {
    if (id === null) return;
    const value = query.select().from(financeCategories).where(eq(financeCategories.id, id)).get();
    if (!value || value.type !== 'expense' || (value.deletedAt !== null && existing?.categoryId !== id)) throw new FinanceValidationError('Choose an active Expense category or No category.');
  }

  function persist(query: Query, due: ScheduledDue) {
    query.insert(occurrences).values({ ...due, id: newId(), createdAt: now(), updatedAt: now() }).onConflictDoNothing().run();
  }

  function materializeDue(query: Query, commitment: Commitment) {
    // Include tombstones in the keys: catch-up must never replace retained outcomes or identities.
    const existing = query.select({ dueDate: occurrences.dueDate, installmentIndex: occurrences.installmentIndex })
      .from(occurrences).where(eq(occurrences.commitmentId, commitment.id)).all();
    const dates = new Set(existing.map((row) => row.dueDate));
    const indices = new Set(existing.map((row) => row.installmentIndex).filter((index) => index !== null));
    for (const rule of rules(query, commitment.id)) {
      for (const due of duesThrough(rule, commitment.installmentCount, today())) {
        if (dates.has(due.dueDate) || (due.installmentIndex !== null && indices.has(due.installmentIndex))) continue;
        persist(query, due);
        dates.add(due.dueDate);
        if (due.installmentIndex !== null) indices.add(due.installmentIndex);
      }
    }
  }

  function closeSchedules(query: Query, id: string, boundary: string) {
    for (const rule of rules(query, id).filter((value) => value.effectiveUntil === null)) {
      query.update(schedules).set({ effectiveUntil: boundary > rule.effectiveFrom ? boundary : rule.effectiveFrom, updatedAt: stamp(rule) }).where(eq(schedules.id, rule.id)).run();
    }
  }

  function completion(query: Query, id: string) {
    const commitment = parent(query, id);
    if (commitment.kind !== 'installment') return;
    const resolved = rows(query, id).filter((row) => row.status !== 'pending').length;
    const completed = resolved === commitment.installmentCount;
    if (completed && commitment.status !== 'completed') query.update(commitments).set({ status: 'completed', completedAt: now(), updatedAt: stamp(commitment) }).where(eq(commitments.id, id)).run();
    else if (!completed && commitment.status === 'completed') query.update(commitments).set({ status: 'active', completedAt: null, updatedAt: stamp(commitment) }).where(eq(commitments.id, id)).run();
  }

  function targetRow(query: Query, target: OccurrenceTarget) {
    const commitment = parent(query, target.commitmentId);
    const existing = target.id ? query.select().from(occurrences).where(eq(occurrences.id, target.id)).get()
      : rows(query, commitment.id).find((row) => row.dueDate === target.dueDate);
    if (existing) {
      if (existing.commitmentId !== commitment.id || existing.deletedAt !== null || existing.dueDate !== target.dueDate || existing.scheduleId !== target.scheduleId) throw new FinanceValidationError('This occurrence changed. Refresh Commitments and try again.');
      return existing;
    }
    if (target.id || (target.dueDate > today() && commitment.status !== 'active')) throw new FinanceValidationError('This occurrence is no longer available.');
    const rule = rules(query, commitment.id).find((value) => value.id === target.scheduleId);
    const due = rule && scheduleDue(rule, commitment.installmentCount, target.dueDate);
    // A Calendar-requested future month may be beyond the normal three-month list preview.
    // Resolve only this validated schedule identity; no additional future window is generated.
    if (!due) throw new FinanceValidationError('This schedule changed. Refresh Commitments and try again.');
    persist(query, due);
    const inserted = rows(query, commitment.id).find((row) => row.dueDate === due.dueDate);
    if (!inserted || inserted.scheduleId !== due.scheduleId) throw new FinanceValidationError('This installment already has a retained due date.');
    return inserted;
  }

  function item(query: Query, commitment: Commitment): CommitmentItem {
    const versions = rules(query, commitment.id);
    const existing = rows(query, commitment.id);
    const future = existing.filter((row) => row.status === 'pending' && row.dueDate > today()).map(displayOccurrence);
    if (commitment.status === 'active') {
      for (const rule of versions) {
        for (const due of scheduledDues(rule, commitment.installmentCount, today(), upcomingEnd(today()))) {
          if (due.dueDate <= today()) continue;
          if (!existing.some((row) => row.dueDate === due.dueDate || (due.installmentIndex !== null && row.installmentIndex === due.installmentIndex))) future.push(previewOccurrence(due));
        }
      }
    }
    const paid = query.select({ amountMinor: financeTransactions.amountMinor, deletedAt: financeTransactions.deletedAt })
      .from(occurrences).innerJoin(financeTransactions, eq(occurrences.paidTransactionId, financeTransactions.id))
      .where(and(eq(occurrences.commitmentId, commitment.id), eq(occurrences.status, 'paid'), isNull(occurrences.deletedAt))).all();
    if (paid.some((payment) => payment.deletedAt !== null)) throw new FinanceValidationError('A commitment payment needs reconciliation.');
    const resolvedCount = existing.filter((row) => row.status !== 'pending').length;
    const assignedIndex = commitment.installmentCount === null ? 0 : Math.max(
      ...versions.map((rule) => lastScheduledIndex(rule, commitment.installmentCount!, today())),
      ...existing.map((row) => row.installmentIndex ?? 0));
    return { commitment, schedule: versions[versions.length - 1], upcoming: commitment.status === 'active' ? future.sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] ?? null : null,
      outstanding: existing.filter((row) => row.status === 'pending' && row.dueDate <= today()).map(displayOccurrence), resolvedCount,
      remainingCount: commitment.installmentCount === null ? null : commitment.installmentCount - resolvedCount,
      totalPaidMinor: paid.reduce((sum, payment) => sum + BigInt(validateAmountMinor(payment.amountMinor)), 0n),
      canResume: commitment.status === 'paused' && (commitment.installmentCount === null || assignedIndex < commitment.installmentCount) };
  }

  return {
    /** Due dates are persisted; future dates use the same previews as Commitments, preserving resume anchors. */
    readRange(range: DateRange) {
      validateDateRange(range);
      return db.transaction((query) => {
        const versions = query.select({ schedule: schedules, commitment: commitments, category: financeCategories }).from(schedules)
          .innerJoin(commitments, eq(schedules.commitmentId, commitments.id)).leftJoin(financeCategories, eq(commitments.categoryId, financeCategories.id))
          .where(and(isNull(commitments.deletedAt), lte(schedules.startDate, range.to), lte(schedules.effectiveFrom, range.to),
            or(isNull(schedules.effectiveUntil), gt(schedules.effectiveUntil, range.from)))).all();
        for (const { schedule, commitment } of versions) {
          for (const due of scheduledDues(schedule, commitment.installmentCount, range.from, range.to < today() ? range.to : today())) persist(query, due);
        }
        const existing = query.select({ occurrence: occurrences, commitment: commitments, category: financeCategories }).from(occurrences)
          .innerJoin(commitments, eq(commitments.id, occurrences.commitmentId)).leftJoin(financeCategories, eq(commitments.categoryId, financeCategories.id))
          .where(and(isNull(commitments.deletedAt), gte(occurrences.dueDate, range.from), lte(occurrences.dueDate, range.to))).all();
        const result = existing.filter(({ occurrence, commitment }) => occurrence.deletedAt === null && occurrence.status === 'pending'
          && (occurrence.dueDate <= today() || commitment.status === 'active'))
          .map((row) => ({ ...row, occurrence: displayOccurrence(row.occurrence) }));
        for (const { schedule, commitment, category: historicalCategory } of versions) {
          if (commitment.status !== 'active') continue;
          for (const due of scheduledDues(schedule, commitment.installmentCount, range.from, range.to)) {
            if (due.dueDate <= today() || existing.some(({ occurrence }) => occurrence.commitmentId === commitment.id && occurrence.dueDate === due.dueDate)) continue;
            // A retained installment may have a different due date after a resume.
            if (due.installmentIndex !== null && query.select({ id: occurrences.id }).from(occurrences)
              .where(and(eq(occurrences.commitmentId, commitment.id), eq(occurrences.installmentIndex, due.installmentIndex))).get()) continue;
            result.push({ commitment, category: historicalCategory, occurrence: previewOccurrence(due) });
          }
        }
        return result;
      });
    },

    read() {
      return db.transaction((query) => {
        const all = query.select().from(commitments).where(isNull(commitments.deletedAt)).orderBy(asc(commitments.title), asc(commitments.id)).all();
        for (const commitment of all) materializeDue(query, commitment);
        return { items: all.map((commitment) => item(query, commitment)) };
      });
    },

    create(draft: CommitmentDraft) {
      const values = validateCommitmentDraft(draft);
      return db.transaction((query) => {
        category(query, values.categoryId);
        const id = newId();
        const timestamp = now();
        query.insert(commitments).values({ ...values, id, createdAt: timestamp, updatedAt: timestamp }).run();
        query.insert(schedules).values({ id: newId(), commitmentId: id, startDate: draft.firstDueDate, billingDay: Number(draft.firstDueDate.slice(-2)),
          expectedAmountMinor: values.expectedAmountMinor, effectiveFrom: draft.firstDueDate, createdAt: timestamp, updatedAt: timestamp }).run();
        materializeDue(query, parent(query, id));
        return id;
      });
    },

    edit(id: string, draft: CommitmentDraft) {
      const values = validateCommitmentDraft(draft);
      db.transaction((query) => {
        const commitment = parent(query, id);
        const versions = rules(query, id);
        const latest = versions[versions.length - 1];
        if (values.kind !== commitment.kind || values.installmentCount !== commitment.installmentCount || draft.firstDueDate !== latest.startDate) throw new FinanceValidationError('Change the schedule through Pause and Resume. Type and installment count stay fixed.');
        category(query, values.categoryId, commitment);
        materializeDue(query, commitment);
        const timestamp = stamp(commitment);
        query.update(commitments).set({ title: values.title, categoryId: values.categoryId, expectedAmountMinor: values.expectedAmountMinor, updatedAt: timestamp }).where(eq(commitments.id, id)).run();
        if (values.expectedAmountMinor !== commitment.expectedAmountMinor && commitment.status === 'active') {
          const boundary = addDays(today(), 1);
          closeSchedules(query, id, boundary);
          query.insert(schedules).values({ ...latest, id: newId(), expectedAmountMinor: values.expectedAmountMinor, effectiveFrom: boundary, effectiveUntil: null, createdAt: timestamp, updatedAt: timestamp }).run();
          const future = query.select().from(occurrences).where(and(eq(occurrences.commitmentId, id), eq(occurrences.status, 'pending'), gt(occurrences.dueDate, today()))).all();
          for (const row of future) query.update(occurrences).set({ expectedAmountMinor: values.expectedAmountMinor, updatedAt: Math.max(timestamp, stamp(row)) }).where(eq(occurrences.id, row.id)).run();
        }
      });
    },

    pay(target: OccurrenceTarget, amount: string, paymentDate: string) {
      const values = validatePayment(amount, paymentDate, today());
      return db.transaction((query) => {
        const row = targetRow(query, target);
        if (row.status !== 'pending') throw new FinanceValidationError('This occurrence is already resolved.');
        const commitment = parent(query, row.commitmentId);
        category(query, commitment.categoryId, commitment); // Existing archived references remain meaningful when paid.
        const id = newId();
        const timestamp = stamp(row);
        query.insert(financeTransactions).values({ ...values, id, type: 'expense', description: commitment.title, categoryId: commitment.categoryId, createdAt: timestamp, updatedAt: timestamp }).run();
        query.update(occurrences).set({ status: 'paid', paidTransactionId: id, resolvedAt: timestamp, updatedAt: timestamp }).where(eq(occurrences.id, row.id)).run();
        completion(query, row.commitmentId);
        return id;
      });
    },

    skip(target: OccurrenceTarget) {
      db.transaction((query) => {
        const row = targetRow(query, target);
        if (row.status !== 'pending') throw new FinanceValidationError('This occurrence is already resolved.');
        const timestamp = stamp(row);
        query.update(occurrences).set({ status: 'skipped', resolvedAt: timestamp, updatedAt: timestamp }).where(eq(occurrences.id, row.id)).run();
        completion(query, row.commitmentId);
      });
    },

    reopen(id: string) {
      db.transaction((query) => {
        const row = query.select().from(occurrences).where(and(eq(occurrences.id, id), isNull(occurrences.deletedAt))).get();
        if (!row || row.status === 'pending') throw new FinanceValidationError('Choose a Paid or Skipped occurrence.');
        parent(query, row.commitmentId);
        const timestamp = stamp(row);
        if (row.status === 'paid') {
          const payment = query.select().from(financeTransactions).where(eq(financeTransactions.id, row.paidTransactionId!)).get();
          if (!payment || payment.deletedAt !== null || payment.type !== 'expense') throw new FinanceValidationError('This payment needs reconciliation before it can be undone.');
          const paymentTimestamp = Math.max(timestamp, payment.updatedAt + 1);
          query.update(financeTransactions).set({ deletedAt: paymentTimestamp, updatedAt: paymentTimestamp }).where(eq(financeTransactions.id, payment.id)).run();
        }
        query.update(occurrences).set({ status: 'pending', paidTransactionId: null, resolvedAt: null, updatedAt: timestamp }).where(eq(occurrences.id, id)).run();
        completion(query, row.commitmentId);
      });
    },

    pause(id: string) {
      db.transaction((query) => {
        const commitment = parent(query, id);
        if (commitment.status !== 'active') throw new FinanceValidationError('Only active commitments can be paused.');
        materializeDue(query, commitment);
        closeSchedules(query, id, addDays(today(), 1));
        query.update(commitments).set({ status: 'paused', updatedAt: stamp(commitment) }).where(eq(commitments.id, id)).run();
      });
    },

    resumeProposal(id: string) {
      const commitment = parent(db, id);
      if (commitment.status !== 'paused') throw new FinanceValidationError('Only paused commitments can be resumed.');
      if (!item(db, commitment).canResume) throw new FinanceValidationError('All installments already have due dates. Resolve the outstanding occurrences.');
      const versions = rules(db, id);
      return proposedResumeDate(versions[versions.length - 1], today(), rows(db, id).map((row) => row.dueDate));
    },

    resume(id: string, nextDueDate: string) {
      if (!validDate(nextDueDate) || nextDueDate < today()) throw new FinanceValidationError('Choose a next due date of today or later.');
      db.transaction((query) => {
        const commitment = parent(query, id);
        if (commitment.status !== 'paused') throw new FinanceValidationError('Only paused commitments can be resumed.');
        materializeDue(query, commitment);
        const existing = rows(query, id);
        if (existing.some((row) => row.dueDate >= nextDueDate)) throw new FinanceValidationError('Choose a date after the retained occurrences. Their due dates stay unchanged.');
        const scheduledIndex = commitment.installmentCount === null ? 0 : rules(query, id).reduce((max, rule) => Math.max(max, lastScheduledIndex(rule, commitment.installmentCount!, today())), 0);
        const nextIndex = commitment.installmentCount === null ? 1 : existing.reduce((max, row) => Math.max(max, row.installmentIndex ?? 0), scheduledIndex) + 1;
        if (commitment.installmentCount !== null && nextIndex > commitment.installmentCount) {
          throw new FinanceValidationError('All installments already have due dates. Resolve the outstanding occurrences.');
        }
        const versions = rules(query, id);
        const previous = versions[versions.length - 1];
        const proposed = proposedResumeDate(previous, today(), existing.map((row) => row.dueDate));
        // Keeping a clamped February proposal retains an intended billing day such as 31.
        const billingDay = nextDueDate === proposed ? previous.billingDay : Number(nextDueDate.slice(-2));
        const timestamp = stamp(commitment);
        query.insert(schedules).values({ id: newId(), commitmentId: id, startDate: nextDueDate, billingDay, firstInstallmentIndex: nextIndex,
          expectedAmountMinor: commitment.expectedAmountMinor, effectiveFrom: today(), createdAt: timestamp, updatedAt: timestamp }).run();
        query.update(commitments).set({ status: 'active', updatedAt: timestamp }).where(eq(commitments.id, id)).run();
        materializeDue(query, parent(query, id));
      });
    },

    end(id: string) {
      db.transaction((query) => {
        const commitment = parent(query, id);
        if (commitment.kind === 'installment' || !['active', 'paused'].includes(commitment.status)) throw new FinanceValidationError('Only active or paused Bills and Subscriptions can be ended.');
        materializeDue(query, commitment);
        closeSchedules(query, id, addDays(today(), 1));
        query.update(commitments).set({ status: 'ended', updatedAt: stamp(commitment) }).where(eq(commitments.id, id)).run();
      });
    },

    readHistory(id: string, before?: string) {
      if (before !== undefined && (!validDate(before) || before > today())) throw new FinanceValidationError('Choose a valid historical commitment page.');
      return db.transaction((query) => {
        const commitment = parent(query, id);
        const to = before ? addDays(before, -1) : today();
        const from = historyStart(to);
        materializeDue(query, commitment);
        const history = query.select({ occurrence: occurrences, payment: financeTransactions }).from(occurrences)
          .leftJoin(financeTransactions, eq(occurrences.paidTransactionId, financeTransactions.id))
          .where(and(eq(occurrences.commitmentId, id), isNull(occurrences.deletedAt), or(eq(occurrences.status, 'pending'), gte(occurrences.dueDate, from))))
          .orderBy(desc(occurrences.dueDate)).all();
        const olderResolved = query.select({ id: occurrences.id }).from(occurrences)
          .where(and(eq(occurrences.commitmentId, id), isNull(occurrences.deletedAt), ne(occurrences.status, 'pending'), lt(occurrences.dueDate, from))).limit(1).get();
        return { ...item(query, commitment), history, versions: rules(query, id), pageBefore: before, nextBefore: olderResolved ? from : null };
      });
    },
  };
}

export type CommitmentDataAccess = ReturnType<typeof createCommitmentDataAccess>;
export type CommitmentHistory = ReturnType<CommitmentDataAccess['readHistory']>;

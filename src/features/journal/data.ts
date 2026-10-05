import { and, desc, eq, gte, isNull, lt, lte } from 'drizzle-orm';

import type { AxisDatabase } from '@/database/client';
import { journalDrafts, journalEntries } from '@/database/schema';
import { validDate, validateDateRange, type DateRange } from '@/utils/calendar';

import { journalBaseline, journalBaselineMatches, JournalConflictError, journalDirty, JournalValidationError, normalizeJournalDraft, validateJournalDate } from './form';
import type { JournalDraft, JournalEntry, JournalEntryBaseline, JournalHistoryPage, PersistedJournalDraft } from './types';

export function createJournalDataAccess(db: AxisDatabase, newId: () => string, now = Date.now) {
  const activeDate = (date: string) => and(eq(journalEntries.entryDate, date), isNull(journalEntries.deletedAt));
  const draftDate = (date: string) => eq(journalDrafts.entryDate, date);
  return {
    getDraft(date: string): PersistedJournalDraft | null {
      if (!validDate(date)) throw new JournalValidationError('Choose a valid journal date.');
      return db.select().from(journalDrafts).where(draftDate(date)).get() ?? null;
    },
    persistDraft(date: string, draft: JournalDraft, baseEntry: JournalEntry | null, baseline: JournalEntryBaseline = journalBaseline(baseEntry)): PersistedJournalDraft | null {
      if (!validDate(date) || (baseEntry && (baseEntry.entryDate !== date || baseEntry.deletedAt !== null))) {
        throw new JournalValidationError('A journal draft must belong to its own date.');
      }
      const values = normalizeJournalDraft(draft);
      return db.transaction((query) => {
        if (!journalDirty(values, baseEntry) && journalBaselineMatches(baseline, baseEntry)) {
          const current = query.select().from(journalEntries).where(activeDate(date)).get() ?? null;
          if (journalBaselineMatches(baseline, current)) {
            query.delete(journalDrafts).where(draftDate(date)).run();
            return null;
          }
        }
        const previous = query.select().from(journalDrafts).where(draftDate(date)).get();
        const updatedAt = Math.max(now(), previous ? previous.updatedAt + 1 : 0, baseline?.updatedAt ?? 0);
        const working = { ...values, updatedAt, baseEntryId: baseline?.id ?? null, baseEntryUpdatedAt: baseline?.updatedAt ?? null };
        return query.insert(journalDrafts).values({ entryDate: date, ...working })
          .onConflictDoUpdate({ target: journalDrafts.entryDate, set: working }).returning().get();
      }, { behavior: 'immediate' });
    },
    discardDraft(date: string): JournalEntry | null {
      if (!validDate(date)) throw new JournalValidationError('Choose a valid journal date.');
      return db.transaction((query) => {
        const entry = query.select().from(journalEntries).where(activeDate(date)).get() ?? null;
        query.delete(journalDrafts).where(draftDate(date)).run();
        return entry;
      }, { behavior: 'immediate' });
    },
    getEntry(date: string): JournalEntry | null {
      if (!validDate(date)) throw new JournalValidationError('Choose a valid journal date.');
      return db.select().from(journalEntries).where(activeDate(date)).get() ?? null;
    },
    save(date: string, draft: JournalDraft, baseline: JournalEntryBaseline): JournalEntry | null {
      validateJournalDate(date, now());
      const values = normalizeJournalDraft(draft);
      return db.transaction((query) => {
        const existing = query.select().from(journalEntries).where(activeDate(date)).get() ?? null;
        if (!journalBaselineMatches(baseline, existing)) throw new JournalConflictError();
        const timestamp = existing ? Math.max(now(), existing.updatedAt + 1) : now();
        let entry: JournalEntry | null;
        if (!values.content && values.mood === null) {
          if (existing) query.update(journalEntries).set({ deletedAt: timestamp, updatedAt: timestamp }).where(eq(journalEntries.id, existing.id)).run();
          entry = null;
        } else if (existing) entry = query.update(journalEntries).set({ ...values, updatedAt: timestamp })
          .where(eq(journalEntries.id, existing.id)).returning().get();
        else entry = query.insert(journalEntries).values({ ...values, id: newId(), entryDate: date, createdAt: timestamp, updatedAt: timestamp }).returning().get();
        // Recovery removal and the authoritative write roll back together on any failure.
        query.delete(journalDrafts).where(draftDate(date)).run();
        return entry;
      }, { behavior: 'immediate' });
    },
    softDelete(id: string) {
      db.transaction((query) => {
        const existing = query.select().from(journalEntries).where(eq(journalEntries.id, id)).get();
        if (!existing) return;
        query.delete(journalDrafts).where(draftDate(existing.entryDate)).run();
        if (existing.deletedAt !== null) return;
        const timestamp = Math.max(now(), existing.updatedAt + 1);
        query.update(journalEntries).set({ deletedAt: timestamp, updatedAt: timestamp }).where(eq(journalEntries.id, id)).run();
      }, { behavior: 'immediate' });
    },
    listHistory(before?: string, limit = 20): JournalHistoryPage {
      if ((before !== undefined && !validDate(before)) || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
        throw new JournalValidationError('Choose a valid journal history page.');
      }
      const entries = db.select().from(journalEntries).where(and(isNull(journalEntries.deletedAt), before ? lt(journalEntries.entryDate, before) : undefined))
        .orderBy(desc(journalEntries.entryDate)).limit(limit + 1).all();
      const page = entries.slice(0, limit);
      return { entries: page, nextBefore: entries.length > limit ? page[page.length - 1].entryDate : null };
    },
    datesWithEntries(range: DateRange): string[] {
      validateDateRange(range);
      return db.select({ date: journalEntries.entryDate }).from(journalEntries).where(and(isNull(journalEntries.deletedAt),
        gte(journalEntries.entryDate, range.from), lte(journalEntries.entryDate, range.to))).orderBy(desc(journalEntries.entryDate)).all().map((row) => row.date);
    },
  };
}

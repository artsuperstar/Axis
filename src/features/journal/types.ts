import type { journalDrafts, journalEntries } from '@/database/schema';
import type { SessionSummary } from '@/features/fitness/types';

export type JournalEntry = typeof journalEntries.$inferSelect;
export type JournalMood = NonNullable<JournalEntry['mood']>;
export type JournalDraft = Pick<JournalEntry, 'content' | 'mood'>;
export type PersistedJournalDraft = typeof journalDrafts.$inferSelect;
export type JournalHistoryPage = { entries: JournalEntry[]; nextBefore: string | null };
export type JournalDayContext = {
  date: string;
  completedTaskCount: number;
  taskNames: string[];
  workoutCount: number;
  workouts: Pick<SessionSummary, 'id' | 'name' | 'exerciseCount' | 'setCount'>[];
  transactionCount: number;
  incomeMinor: bigint;
  expensesMinor: bigint;
  netFlowMinor: bigint;
};

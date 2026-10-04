import type { commitmentOccurrences, commitmentSchedules, financeCommitments } from '@/database/schema';

export type Commitment = typeof financeCommitments.$inferSelect;
export type CommitmentSchedule = typeof commitmentSchedules.$inferSelect;
export type CommitmentOccurrence = typeof commitmentOccurrences.$inferSelect;
export const commitmentKinds = ['bill', 'subscription', 'installment'] as const;
export type CommitmentKind = typeof commitmentKinds[number];
export const commitmentKindLabels = { bill: 'Bill', subscription: 'Subscription', installment: 'Installment' };
export type CommitmentDraft = { kind: CommitmentKind; title: string; amount: string; firstDueDate: string; installmentCount: string; categoryId: string | null };
export type ScheduledDue = { scheduleId: string; commitmentId: string; dueDate: string; expectedAmountMinor: number; installmentIndex: number | null };
export type OccurrenceTarget = ScheduledDue & { id: string | null };
export type DisplayOccurrence = OccurrenceTarget & { status: CommitmentOccurrence['status']; paidTransactionId: string | null; resolvedAt: number | null };
export type CommitmentItem = {
  commitment: Commitment;
  schedule: CommitmentSchedule;
  upcoming: DisplayOccurrence | null;
  outstanding: DisplayOccurrence[];
  resolvedCount: number;
  remainingCount: number | null;
  totalPaidMinor: bigint;
  canResume: boolean;
};

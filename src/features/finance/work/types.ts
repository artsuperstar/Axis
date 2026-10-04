import type { workCounterparties, workEntries, workPaymentAllocations } from '@/database/schema';

import type { FinanceTransaction } from '../types';

export type WorkCounterparty = typeof workCounterparties.$inferSelect;
export type WorkEntry = typeof workEntries.$inferSelect;
export type WorkPaymentAllocation = typeof workPaymentAllocations.$inferSelect;
export type WorkDraft = {
  description: string; counterpartyId: string | null; compensationType: WorkEntry['compensationType']; workDate: string;
  hours: string; minutes: string; hourlyRate: string; fixedAmount: string; expectedPaymentDate: string;
};
export type WorkPaymentDraft = {
  counterpartyId: string | null; allocations: { workEntryId: string; amount: string }[]; paymentDate: string; categoryId: string | null;
};
export type WorkItem = {
  entry: WorkEntry; counterparty: WorkCounterparty; earnedMinor: number; receivedMinor: number; outstandingMinor: number;
  status: 'unpaid' | 'partial' | 'paid'; overdue: boolean;
};
export type WorkTotals = { earnedMinor: bigint; receivedMinor: bigint; outstandingMinor: bigint };
export type WorkPayment = { transaction: FinanceTransaction; counterparty: WorkCounterparty; allocations: (WorkPaymentAllocation & { description: string })[] };
export type WorkSnapshot = {
  items: WorkItem[]; counterparties: WorkCounterparty[]; payments: WorkPayment[]; totals: WorkTotals;
  counterpartyTotals: (WorkTotals & { counterparty: WorkCounterparty })[];
};

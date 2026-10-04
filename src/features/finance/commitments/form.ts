import { localDateString, validDate } from '@/utils/calendar';

import { FinanceValidationError } from '../errors';
import { formatBrlInput, parseBrlAmount } from '../money';
import { commitmentKinds, type Commitment, type CommitmentDraft, type CommitmentSchedule } from './types';

export function commitmentDraft(commitment: Commitment | null = null, schedule?: CommitmentSchedule, today = localDateString(new Date())): CommitmentDraft {
  return { kind: commitment?.kind ?? 'bill', title: commitment?.title ?? '', amount: commitment ? formatBrlInput(commitment.expectedAmountMinor) : '',
    firstDueDate: schedule?.startDate ?? today, installmentCount: commitment?.installmentCount?.toString() ?? '', categoryId: commitment?.categoryId ?? null };
}

export function validateCommitmentDraft(draft: CommitmentDraft) {
  if (!commitmentKinds.includes(draft.kind)) throw new FinanceValidationError('Choose Bill, Subscription, or Installment.');
  const title = draft.title.trim().replace(/\s+/g, ' ');
  if (!title) throw new FinanceValidationError('Enter a commitment title.');
  if (!validDate(draft.firstDueDate)) throw new FinanceValidationError('Choose a valid first due date.');
  let installmentCount: number | null = null;
  if (draft.kind === 'installment') {
    if (!/^[1-9]\d*$/.test(draft.installmentCount) || Number(draft.installmentCount) > 1200) throw new FinanceValidationError('Enter 1 through 1200 installments.');
    installmentCount = Number(draft.installmentCount);
  }
  return { kind: draft.kind, title, expectedAmountMinor: parseBrlAmount(draft.amount), installmentCount, categoryId: draft.categoryId };
}

export function validatePayment(amount: string, paymentDate: string, today: string) {
  if (!validDate(paymentDate) || paymentDate > today) throw new FinanceValidationError('Choose a payment date of today or earlier.');
  return { amountMinor: parseBrlAmount(amount), transactionDate: paymentDate };
}

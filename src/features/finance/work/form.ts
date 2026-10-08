import { localDateString, validDate } from '@/utils/calendar';
import { singleLineText } from '@/utils/text-normalization';

import { FinanceValidationError } from '../errors';
import { formatBrlInput, maxAmountMinor, parseBrlAmount, validateAmountMinor } from '../money';
import type { WorkDraft, WorkEntry, WorkPaymentDraft } from './types';
import { jobTitle } from './presentation';

export const compensationOptions = [{ value: 'hourly' as const, label: 'Hourly' }, { value: 'fixed' as const, label: 'Fixed' }];

/** Positive values round to nearest centavo; exact halves round up. Intermediate products never use floats. */
export function hourlyEarnedMinor(durationMinutes: number, hourlyRateMinor: number) {
  if (!Number.isSafeInteger(durationMinutes) || durationMinutes <= 0) throw new FinanceValidationError('Enter a positive duration in whole minutes.');
  validateAmountMinor(hourlyRateMinor);
  const earned = (BigInt(durationMinutes) * BigInt(hourlyRateMinor) + 30n) / 60n;
  if (earned > BigInt(maxAmountMinor)) throw new FinanceValidationError('Earned amount exceeds the supported centavo range.');
  return Number(earned);
}

export function durationMinutes(hours: string, minutes: string) {
  const h = hours.trim(); const m = minutes.trim();
  if ((!h && !m) || (h && !/^\d+$/.test(h)) || (m && !/^\d+$/.test(m))) throw new FinanceValidationError('Enter duration as whole hours and minutes.');
  const remainder = BigInt(m || '0');
  if (remainder > 59n) throw new FinanceValidationError('Minutes must be between 0 and 59.');
  const total = BigInt(h || '0') * 60n + remainder;
  if (total <= 0n || total > BigInt(maxAmountMinor)) throw new FinanceValidationError('Enter a positive duration within the supported minute range.');
  return Number(total);
}

export function compensationValues(draft: Pick<WorkDraft, 'compensationType' | 'hours' | 'minutes' | 'hourlyRate' | 'fixedAmount'>) {
  if (draft.compensationType === 'fixed') return { compensationType: draft.compensationType, durationMinutes: null, hourlyRateMinor: null, fixedAmountMinor: parseBrlAmount(draft.fixedAmount) };
  if (draft.compensationType !== 'hourly') throw new FinanceValidationError('Choose Hourly or Fixed compensation.');
  const duration = durationMinutes(draft.hours, draft.minutes); const rate = parseBrlAmount(draft.hourlyRate);
  hourlyEarnedMinor(duration, rate); // Validate the result range, including legitimate rounded zero amounts.
  return { compensationType: draft.compensationType, durationMinutes: duration, hourlyRateMinor: rate, fixedAmountMinor: null };
}

export function earnedMinor(entry: Pick<WorkEntry, 'compensationType' | 'durationMinutes' | 'hourlyRateMinor' | 'fixedAmountMinor'>) {
  if (entry.compensationType === 'fixed' && entry.durationMinutes === null && entry.hourlyRateMinor === null && entry.fixedAmountMinor !== null) return validateAmountMinor(entry.fixedAmountMinor);
  if (entry.compensationType === 'hourly' && entry.fixedAmountMinor === null && entry.durationMinutes !== null && entry.hourlyRateMinor !== null) return hourlyEarnedMinor(entry.durationMinutes, entry.hourlyRateMinor);
  throw new FinanceValidationError('This work entry has inconsistent compensation terms.');
}

export function workDraft(entry?: WorkEntry | null, today = localDateString(new Date())): WorkDraft {
  return { title: entry ? singleLineText(jobTitle(entry)) : '', description: entry?.description ?? '', counterpartyId: entry?.counterpartyId ?? null, compensationType: entry?.compensationType ?? 'hourly',
    workDate: entry?.workDate ?? today, hours: entry?.durationMinutes ? String(Math.floor(entry.durationMinutes / 60)) : '',
    minutes: entry?.durationMinutes ? String(entry.durationMinutes % 60) : '', hourlyRate: entry?.hourlyRateMinor ? formatBrlInput(entry.hourlyRateMinor) : '',
    fixedAmount: entry?.fixedAmountMinor ? formatBrlInput(entry.fixedAmountMinor) : '', expectedPaymentDate: entry?.expectedPaymentDate ?? '' };
}

export function validateWorkDraft(draft: WorkDraft, today = localDateString(new Date())) {
  const title = singleLineText(draft.title).trim();
  if (!title) throw new FinanceValidationError('Enter a job title.');
  const description = draft.description.trim();
  if (!draft.counterpartyId) throw new FinanceValidationError('Choose who this work is for.');
  const workDate = draft.workDate.trim(); const expectedPaymentDate = draft.expectedPaymentDate.trim() || null;
  if (!validDate(workDate) || workDate > today) throw new FinanceValidationError('Choose today or an earlier valid work date.');
  if (expectedPaymentDate && !validDate(expectedPaymentDate)) throw new FinanceValidationError('Choose a valid expected payment date.');
  return { ...compensationValues(draft), title, description, counterpartyId: draft.counterpartyId, workDate, expectedPaymentDate };
}

export function allocationValues(allocations: WorkPaymentDraft['allocations']) {
  if (!allocations.length) throw new FinanceValidationError('Select at least one outstanding work entry.');
  const ids = new Set<string>();
  const values = allocations.map((allocation) => {
    if (!allocation.workEntryId || ids.has(allocation.workEntryId)) throw new FinanceValidationError('Choose each work entry only once.');
    ids.add(allocation.workEntryId);
    return { workEntryId: allocation.workEntryId, amountMinor: parseBrlAmount(allocation.amount) };
  });
  const total = values.reduce((sum, row) => sum + BigInt(row.amountMinor), 0n);
  if (total > BigInt(maxAmountMinor)) throw new FinanceValidationError('Payment total exceeds the supported centavo range. Record separate payments.');
  return { allocations: values, amountMinor: Number(total) };
}

export function durationLabel(minutes: number) {
  const hours = Math.floor(minutes / 60); const remainder = minutes % 60;
  return [hours ? `${hours}h` : '', remainder ? `${remainder}m` : ''].filter(Boolean).join(' ');
}

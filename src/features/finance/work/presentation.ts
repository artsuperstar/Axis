import type { WorkItem } from './types';

/** Payment receipts may be historical while their remaining work balance is still outstanding. */
export function groupWorkItems(items: WorkItem[]) {
  return {
    overdue: items.filter((item) => item.outstandingMinor > 0 && item.overdue)
      .sort((a, b) => (a.entry.expectedPaymentDate ?? '').localeCompare(b.entry.expectedPaymentDate ?? '')),
    outstanding: items.filter((item) => item.outstandingMinor > 0 && !item.overdue),
    settled: items.filter((item) => item.outstandingMinor === 0),
  };
}

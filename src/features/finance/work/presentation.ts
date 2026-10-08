import type { WorkEntry, WorkItem, WorkOverview } from './types';

/** Legacy records keep their description intact; an explicit title takes precedence after editing. */
export function jobTitle(entry: Pick<WorkEntry, 'title' | 'description'>) {
  return entry.title?.trim() || entry.description.trim() || 'Untitled job';
}

/** Payment receipts may be historical while their remaining work balance is still outstanding. */
export function groupWorkItems(items: WorkItem[]) {
  return {
    overdue: items.filter((item) => item.outstandingMinor > 0 && item.overdue)
      .sort((a, b) => (a.entry.expectedPaymentDate ?? '').localeCompare(b.entry.expectedPaymentDate ?? '')),
    outstanding: items.filter((item) => item.outstandingMinor > 0 && !item.overdue),
    settled: items.filter((item) => item.outstandingMinor === 0),
  };
}

/** Aggregate labels from actionable rows; authoritative money comes from the source totals. */
export function receivableClients(data: WorkOverview) {
  const open = new Map<string, { count: number; overdue: number }>();
  for (const item of data.items) {
    if (item.outstandingMinor <= 0) continue;
    const counts = open.get(item.counterparty.id) ?? { count: 0, overdue: 0 };
    counts.count++; if (item.overdue) counts.overdue++;
    open.set(item.counterparty.id, counts);
  }
  return data.counterpartyTotals.filter((group) => group.outstandingMinor > 0n)
    .map((group) => ({ ...group, openCount: open.get(group.counterparty.id)?.count ?? 0, overdueCount: open.get(group.counterparty.id)?.overdue ?? 0 }))
    .sort((a, b) => a.counterparty.name.localeCompare(b.counterparty.name) || a.counterparty.id.localeCompare(b.counterparty.id));
}

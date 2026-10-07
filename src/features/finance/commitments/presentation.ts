import type { CommitmentHistory } from './data';
import type { CommitmentItem, DisplayOccurrence } from './types';

export type Obligation = { item: CommitmentItem; occurrence: DisplayOccurrence };
export type ObligationSection = { title: 'Overdue' | 'Today' | 'Upcoming'; rows: Obligation[] };

/** Presentation of the authoritative projection: no history window or new schedule calculation. */
export function commitmentSections(items: CommitmentItem[], today: string): ObligationSection[] {
  const due = items.flatMap((item) => item.outstanding
    .filter((occurrence) => occurrence.status === 'pending' && occurrence.dueDate <= today)
    .map((occurrence) => ({ item, occurrence })));
  const future = items.flatMap((item) => item.commitment.status === 'active' && item.upcoming?.status === 'pending' && item.upcoming.dueDate > today
    ? [{ item, occurrence: item.upcoming }] : []);
  const ordered = (rows: Obligation[]) => rows.sort((a, b) => a.occurrence.dueDate.localeCompare(b.occurrence.dueDate)
    || a.item.commitment.title.localeCompare(b.item.commitment.title) || a.item.commitment.id.localeCompare(b.item.commitment.id));
  return ([
    { title: 'Overdue', rows: ordered(due.filter(({ occurrence }) => occurrence.dueDate < today)) },
    { title: 'Today', rows: ordered(due.filter(({ occurrence }) => occurrence.dueDate === today)) },
    { title: 'Upcoming', rows: ordered(future) },
  ] satisfies ObligationSection[]).filter((section) => section.rows.length);
}

export function commitmentStatusLabel(item: CommitmentItem) {
  const labels = { active: 'Active', paused: 'Paused', ended: 'Ended', completed: 'Completed' };
  return labels[item.commitment.status];
}

export function installmentLabel(item: CommitmentItem, occurrence: DisplayOccurrence) {
  return occurrence.installmentIndex && item.commitment.installmentCount ? `${occurrence.installmentIndex} of ${item.commitment.installmentCount}` : null;
}

/** A Calendar-selected preview stays actionable, while retained paid/skipped outcomes win. */
export function focusedCommitmentOccurrence(detail: CommitmentHistory, target?: DisplayOccurrence | null) {
  if (!target || target.commitmentId !== detail.commitment.id) return null;
  const retained = detail.history.find(({ occurrence }) => occurrence.dueDate === target.dueDate)?.occurrence;
  return retained ? retained.status === 'pending' ? retained : null : detail.commitment.status === 'active' ? target : null;
}

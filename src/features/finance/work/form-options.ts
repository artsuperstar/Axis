import type { WorkCounterparty, WorkItem } from './types';
import { canonicalIdentityName, canonicalSearchText, normalizeIdentityDisplayName } from '@/utils/text-normalization';

export function normalizeClientQuery(name: string) {
  return canonicalSearchText(name);
}

const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
export const clientLabel = (client?: WorkCounterparty) => client ? `${client.name}${client.deletedAt !== null ? ' (archived)' : ''}` : 'Choose a client';
function matchingClients(clients: WorkCounterparty[], query: string) {
  const normalized = normalizeClientQuery(query);
  if (!normalized) return [];
  return clients.map((client) => ({ client, name: normalizeClientQuery(client.name) })).filter(({ name }) => name.includes(normalized))
    .sort((a, b) => Number(!a.name.startsWith(normalized)) - Number(!b.name.startsWith(normalized)) || compare(a.name, b.name) || compare(a.client.id, b.client.id))
    .slice(0, 8).map(({ client }) => ({ value: client.id, label: clientLabel(client) }));
}

export function clientAutocomplete(clients: WorkCounterparty[], query: string) {
  const active = clients.filter((client) => client.deletedAt === null);
  const name = normalizeIdentityDisplayName(query);
  const identity = canonicalIdentityName(name);
  return { suggestions: matchingClients(active, query),
    createLabel: name && !active.some((client) => canonicalIdentityName(client.name) === identity) ? `+ Create "${name}"` : undefined };
}

/** Archived clients can still pay historical debts; never offer these for new work. */
export function paymentClientAutocomplete(clients: WorkCounterparty[], items: WorkItem[], query: string) {
  const owing = new Set(items.filter((item) => item.outstandingMinor > 0).map((item) => item.entry.counterpartyId));
  return { suggestions: matchingClients(clients.filter((client) => owing.has(client.id)), query) };
}

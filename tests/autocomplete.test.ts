/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { selectionMenuLayout, selectionOverlayReducer } from '../src/components/form-selection';
import { clientAutocomplete, paymentClientAutocomplete } from '../src/features/finance/work/form-options';
import type { WorkCounterparty, WorkItem } from '../src/features/finance/work/types';
import { autocomplete, renderControl } from './helpers/form-components';

const client = (name: string, deletedAt: number | null = null): WorkCounterparty => ({ id: name, name, deletedAt, createdAt: 1, updatedAt: 1 });
const clients = [client('JP Fotografias'), client('João Inglês'), client('JP Balões'), client('Loja JP'), client('JP Past', 2), client('Alice')];
const labels = (query: string) => clientAutocomplete(clients, query).suggestions.map((option) => option.label);

test('Client autocomplete narrows J → JP → JP B, puts prefixes first, and excludes archived Clients', () => {
  assert.deepEqual(labels('J'), ['João Inglês', 'JP Balões', 'JP Fotografias', 'Loja JP']);
  assert.deepEqual(labels('JP'), ['JP Balões', 'JP Fotografias', 'Loja JP']);
  assert.deepEqual(labels('JP B'), ['JP Balões']);
});

test('Client matching tolerates case, accents, and whitespace with deterministic ordering', () => {
  assert.deepEqual(labels('  jP    b '), ['JP Balões']);
  assert.deepEqual(labels('joao'), ['João Inglês']);
  assert.deepEqual(labels('INGLES'), ['João Inglês']);
  assert.deepEqual(clientAutocomplete([...clients].reverse(), 'JP'), clientAutocomplete(clients, 'JP'));
});

test('empty Client query is sparse and hundreds of matches remain bounded', () => {
  assert.deepEqual(clientAutocomplete(clients, '  '), { suggestions: [], createLabel: undefined });
  const many = Array.from({ length: 300 }, (_, index) => client(`Client ${String(index).padStart(3, '0')}`));
  assert.equal(clientAutocomplete(many, 'client').suggestions.length, 8);
  assert.equal(clientAutocomplete(many, 'client 299').createLabel, undefined, 'exact matching checks the full eligible set');
});

test('inline Create follows accent-sensitive persisted identity rather than accent-insensitive search', () => {
  assert.equal(clientAutocomplete(clients, ' JP   BALOES ').createLabel, '+ Create "JP BALOES"');
  assert.equal(clientAutocomplete(clients, 'JP Brindes').createLabel, '+ Create "JP Brindes"');
  assert.equal(clientAutocomplete(clients, 'JP Past').createLabel, '+ Create "JP Past"', 'an archived name can become a new Client ID');
});

test('suggested existing Client selection exposes checked state and never creates another record', () => {
  let selected: string | null = 'JP Balões';
  let creates = 0;
  const options = renderControl(() => autocomplete.AutocompleteOptions({ value: selected, results: clientAutocomplete(clients, 'JP Balões'),
    onSelect: (value) => { selected = value; }, onCreate: () => { creates++; } }));
  assert.match(options.markup, /aria-checked="true"/); assert.doesNotMatch(options.markup, /Create/);
  options.elements.find((element) => element.props.label === 'JP Balões')!.props.onPress!();
  assert.equal(selected, 'JP Balões'); assert.equal(creates, 0);
});

test('payment autocomplete permits archived Clients with debt and excludes settled/unrelated Clients', () => {
  const items = [
    { entry: { counterpartyId: 'JP Past' }, outstandingMinor: 100 },
    { entry: { counterpartyId: 'JP Balões' }, outstandingMinor: 0 },
  ] as WorkItem[];
  assert.deepEqual(paymentClientAutocomplete(clients, items, 'JP'), { suggestions: [{ value: 'JP Past', label: 'JP Past (archived)' }] });
  assert.deepEqual(paymentClientAutocomplete(clients, items, ''), { suggestions: [] });
});

test('autocomplete search announces expanded state and text input stays in the overlay body', () => {
  const panel = renderControl(() => autocomplete.AutocompletePanel({ label: 'Client *', value: null, displayValue: 'Choose a client',
    getResults: (query) => clientAutocomplete(clients, query), onSelect: () => {}, onClose: () => {}, onSize: () => {} }));
  assert.match(panel.markup, /aria-label="Search client"/); assert.match(panel.markup, /role="combobox"/);
  assert.match(panel.markup, /aria-expanded="true"/); assert.match(panel.markup, /Type to find a match/);
  assert.doesNotMatch(panel.markup, /JP Fotografias|JP Balões/);
});

test('keyboard resizing retains autocomplete interaction and another field replaces it', () => {
  const open = selectionOverlayReducer({ menu: null, inline: null }, { type: 'open', menu: 'client' });
  const search = selectionOverlayReducer(open, { type: 'inline', content: 'search query' });
  for (const height of [740, 360, 740]) {
    const layout = selectionMenuLayout({ x: 20, y: 620, width: 340, height: 48 }, { x: 0, y: 40, width: 390, height }, 320, true)!;
    assert.ok(layout.top >= 8 && layout.top + layout.height <= height - 8);
    assert.equal(search.inline, 'search query');
  }
  assert.deepEqual(selectionOverlayReducer(search, { type: 'open', menu: 'category' }), { menu: 'category', inline: null });
});

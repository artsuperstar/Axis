/// <reference types="node" />

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { selectionOverlayReducer, submitAutocompleteSelection, type SelectionOverlayState } from '../src/components/form-selection';
import { createFinanceDataAccess } from '../src/features/finance/data';
import { financeError } from '../src/features/finance/errors';
import { formatBrlInput } from '../src/features/finance/money';
import { seedFinanceCategories } from '../src/features/finance/seed';
import { createWorkDataAccess } from '../src/features/finance/work/data';
import { compensationOptions, workDraft } from '../src/features/finance/work/form';
import { clientAutocomplete } from '../src/features/finance/work/form-options';
import { groupWorkItems } from '../src/features/finance/work/presentation';
import { pickerValue } from '../src/utils/calendar';
import { singleLineText } from '../src/utils/text-normalization';
import { bundledMigrations, database } from './helpers/database';
import { autocomplete, controls, renderControl, selection, transactionForms, transactionRows, workForms, workRows, workViews } from './helpers/form-components';

const today = '2026-10-03';

test('Job Title is explicitly single-line and normalizes all pasted line separators without discarding words or accents', () => {
  const result = renderControl(() => workForms.WorkEditor({ item: null, counterparties: [], onSave: () => {}, onCreateCounterparty: () => { throw new Error('not used'); }, onDismiss: () => {} }));
  const title = result.elements.find((element) => element.props.label === 'Job title *')!;
  assert.equal((title.props as unknown as { multiline: boolean }).multiline, false);
  assert.equal(singleLineText('Logo\r\nDesign\nJoão\rClient\u2028Line\u2029End'), 'Logo Design João Client Line End');
});
async function initialized() {
  const result = database(); await migrate(result.db, bundledMigrations); seedFinanceCategories(result.db, 1000);
  const now = () => pickerValue(today).getTime();
  return { ...result, work: createWorkDataAccess(result.db, randomUUID, now), finance: createFinanceDataAccess(result.db, randomUUID, now) };
}
test('compensation segments expose exactly Hourly and Fixed with selected accessibility state', () => {
  let selected = 'hourly';
  const result = renderControl(() => controls.SegmentedControl({ label: 'Compensation *', value: selected, options: compensationOptions, onChange: (value) => { selected = value; } }));
  assert.deepEqual(compensationOptions.map((option) => option.label), ['Hourly', 'Fixed']);
  assert.match(result.markup, /Hourly ✓/); assert.match(result.markup, /aria-checked="true"/);
  result.elements.find((element) => element.props.accessibilityLabel === 'Compensation *: Fixed')!.props.onPress!(); assert.equal(selected, 'fixed');
});
test('Client autocomplete creates inline, persists, refreshes and selects before closing', async (t) => {
  const { sqlite, work } = await initialized(); t.after(() => sqlite.close());
  let selected: string | null = null; let surface: SelectionOverlayState<string, string> = { menu: 'client', inline: 'Client' };
  const complete = () => { assert.ok(selected); surface = selectionOverlayReducer(surface, { type: 'close' }); };
  const query = 'Acme Studio';
  const result = renderControl(() => autocomplete.AutocompleteOptions({ value: selected, results: clientAutocomplete(work.read().counterparties, query), onSelect: () => {},
    onCreate: () => {
      const error = submitAutocompleteSelection(query, (name) => work.createCounterparty(name).id, (id) => { selected = id; }, complete,
        (cause) => financeError(cause, 'Unable to create client'));
      assert.equal(error, null);
    } }));
  result.elements.find((element) => element.props.label === '+ Create "Acme Studio"')!.props.onPress!();
  assert.ok(clientAutocomplete(work.read().counterparties, query).suggestions.some((option) => option.value === selected));
  assert.deepEqual(surface, { menu: null, inline: null });
});
test('Work editor offers and executes accent-distinct Client creation beside an accent-insensitive match', async (t) => {
  const { sqlite, work } = await initialized(); t.after(() => sqlite.close());
  const accented = work.createCounterparty('Álvaro');
  const editor = renderControl(() => workForms.WorkEditor({ item: null, counterparties: work.read().counterparties,
    onSave: () => {}, onCreateCounterparty: work.createCounterparty, onDismiss: () => {} }));
  const field = editor.elements.find((element) => element.props.label === 'Client *')!;
  const results = field.props.getResults!('Alvaro');
  assert.deepEqual(results.suggestions, [{ value: accented.id, label: 'Álvaro' }]);
  assert.equal(results.createLabel, '+ Create "Alvaro"');

  let selected: string | null = null; let closed = false;
  const options = renderControl(() => autocomplete.AutocompleteOptions({ value: selected, results,
    onSelect: (id) => { selected = id; }, onCreate: () => {
      const error = submitAutocompleteSelection('Alvaro', field.props.onCreate!, (id) => { selected = id; }, () => { closed = true; },
        (cause) => financeError(cause, 'Unable to create client'));
      assert.equal(error, null);
    } }));
  assert.ok(options.elements.some((element) => element.props.label === 'Álvaro'));
  options.elements.find((element) => element.props.label === '+ Create "Alvaro"')!.props.onPress!();

  assert.equal(closed, true); assert.ok(selected); assert.notEqual(selected, accented.id);
  assert.deepEqual(work.read().counterparties.map((client) => client.name).sort(), ['Alvaro', 'Álvaro'].sort());
});
test('Client creation failure and outside dismissal preserve selection without creating unsaved names', async (t) => {
  const { sqlite, work } = await initialized(); t.after(() => sqlite.close());
  const previous = work.createCounterparty('Acme'); let selected = previous.id;
  let surface: SelectionOverlayState<string, string> = { menu: 'client', inline: 'Acme' };
  const message = submitAutocompleteSelection('Acme', (name) => work.createCounterparty(name).id, (id) => { selected = id; },
    () => assert.fail('failed creation must not close'), (cause) => financeError(cause, 'Unable to create client'));
  assert.match(message!, /already exists/); assert.equal(selected, previous.id); assert.equal(surface.inline, 'Acme');
  const overlay = renderControl(() => selection.SelectionOverlay({ label: 'Client', content: null, inline: { title: 'Client', content: null },
    layout: null, onHeadingHeight: () => {}, onOptionsHeight: () => {}, onClose: () => { surface = selectionOverlayReducer(surface, { type: 'close' }); } }));
  overlay.elements.find((element) => element.props.accessibilityLabel === 'Dismiss client without saving')!.props.onPress!();
  assert.deepEqual(surface, { menu: null, inline: null }); assert.equal(selected, previous.id);
  assert.equal(work.read().counterparties.length, 1);
});
test('Work entry editor uses Client autocomplete and retains archived names without suggesting them for new work', async (t) => {
  const { sqlite, work } = await initialized(); t.after(() => sqlite.close());
  const party = work.createCounterparty('Past client'); const id = work.create({ ...workDraft(null, today), counterpartyId: party.id, title: 'Fixed website', description: 'Fixed website', compensationType: 'fixed', fixedAmount: '800' });
  work.archiveCounterparty(party.id);
  const current = work.read().items.find((item) => item.entry.id === id)!;
  const result = renderControl(() => workForms.WorkEditor({ item: current, counterparties: work.read().counterparties, onSave: () => {}, onCreateCounterparty: work.createCounterparty, onDismiss: () => {} }));
  const field = result.elements.find((element) => element.props.label === 'Client *')!;
  assert.equal(field.type, autocomplete.AutocompleteField);
  assert.equal(field.props.value, party.id); assert.ok(!field.props.getResults!('Past').suggestions.some((option) => option.value === party.id));
  const createdId = field.props.onCreate!('New client'); assert.ok(work.read().counterparties.some((client) => client.id === createdId));
  assert.match(result.markup, /Past client \(archived\)/); assert.doesNotMatch(result.markup, /counterpart/i);
  assert.match(result.markup, /Fixed amount/); assert.doesNotMatch(result.markup, /Hourly rate|Duration \*/);
});

test('Job list, History row and detail omit empty Description without placeholder metadata or accessibility text', async (t) => {
  const { sqlite, work } = await initialized(); t.after(() => sqlite.close());
  const client = work.createCounterparty('João'); const id = work.create({ ...workDraft(null, today), title: 'Logo Design', description: 'Existing details', counterpartyId: client.id, compensationType: 'fixed', fixedAmount: '100' });
  const original = work.readDetail(id).items[0];
  for (const description of ['', '  \n ']) for (const detail of [false, true]) {
    const item = { ...original, entry: { ...original.entry, description } };
    const result = renderControl(() => workRows.WorkRow({ item, detail, onPress: detail ? undefined : () => {} }));
    assert.ok(!result.elements.some((element) => element.props.testID === 'job-description'));
    assert.match(result.markup, /Logo Design/); assert.match(result.markup, /João/);
    assert.doesNotMatch(result.markup, /No description|Description unavailable/);
    if (!detail) assert.ok(result.elements.some((element) => element.props.accessibilityLabel?.startsWith('Logo Design, João,')));
  }
});
test('record-payment editor defaults a selected allocation to outstanding and accepts only active Income categories', async (t) => {
  const { sqlite, work, finance } = await initialized(); t.after(() => sqlite.close());
  const party = work.createCounterparty('Acme'); const id = work.create({ ...workDraft(null, today), counterpartyId: party.id, title: 'Website', description: 'Website', compensationType: 'fixed', fixedAmount: '800' });
  work.recordPayment({ counterpartyId: party.id, allocations: [{ workEntryId: id, amount: '300' }], categoryId: null, paymentDate: today });
  const archived = finance.createCategory('Archived income', 'income'); finance.deleteCategory(archived.id);
  const data = work.read(); const initialItem = data.items[0]; const categories = finance.read().categories;
  const result = renderControl(() => workForms.WorkPaymentEditor({ data, categories, initialItem, onSave: () => {}, onDismiss: () => {}, onCreateCategory: (name) => finance.createCategory(name, 'income') }));
  const amount = result.elements.find((element) => element.props.label === 'Amount received for this work *')!; assert.equal(amount.props.value, formatBrlInput(50000));
  assert.match(result.markup, /Payment total: R\$ 500,00/); assert.match(result.markup, /role="checkbox"[^>]*aria-checked="true"|aria-checked="true"[^>]*role="checkbox"/);
  const category = result.elements.find((element) => element.props.label === 'Income category')!;
  assert.deepEqual(category.props.options![0], { value: null, label: 'No category' });
  assert.ok(category.props.options!.every((option) => option.value === null || categories.some((item) => item.id === option.value && item.type === 'income' && item.deletedAt === null)));
  assert.equal(category.props.action!.title, 'New income category');
  assert.ok(!result.elements.some((element) => element.props.label === 'Payment total'), 'the total is derived, never an independent editable field');
});
test('Work-linked Finance editor locks type/amount and its row hides ordinary Delete', async (t) => {
  const { sqlite, work, finance } = await initialized(); t.after(() => sqlite.close());
  const party = work.createCounterparty('Acme'); const id = work.create({ ...workDraft(null, today), counterpartyId: party.id, title: 'Website', description: 'Website', compensationType: 'fixed', fixedAmount: '800' });
  work.recordPayment({ counterpartyId: party.id, allocations: [{ workEntryId: id, amount: '300' }], categoryId: null, paymentDate: today });
  const transaction = finance.read().transactions[0]; const categories = finance.read().categories;
  const editor = renderControl(() => transactionForms.TransactionEditor({ transaction, categories, workPayment: true, onSave: () => {}, onCreateCategory: finance.createCategory, onDismiss: () => {} }));
  assert.equal(editor.elements.find((element) => element.props.label === 'Type *')!.props.disabled, true);
  assert.equal(editor.elements.find((element) => element.props.label === 'Amount *')!.props.editable, false);
  assert.equal(editor.elements.find((element) => element.props.label === 'Amount *')!.props.helperText, 'Amount is controlled by the linked Work payment.');
  const amountControl = renderControl(() => controls.FormField({ label: 'Amount *', value: '300,00', editable: false, helperText: 'Controlled by Work.' }));
  assert.doesNotMatch(amountControl.markup, /aria-disabled="true"|opacity:0\.45/);
  assert.match(amountControl.markup, /Read only/);
  assert.match(amountControl.markup, /Controlled by Work/);
  assert.match(amountControl.markup, /readOnly=""|readonly=""/);
  assert.notEqual(editor.elements.find((element) => element.props.label === 'Description *')!.props.editable, false);
  assert.notEqual(editor.elements.find((element) => element.props.label === 'Note')!.props.editable, false);
  assert.notEqual(editor.elements.find((element) => element.props.label === 'Category')!.props.disabled, true);
  assert.notEqual(editor.elements.find((element) => element.props.label === 'Date *')!.props.editable, false);
  const row = renderControl(() => transactionRows.TransactionRow({ transaction, categories, workPayment: true, onEdit: () => {}, onDelete: () => {} }));
  assert.doesNotMatch(row.markup, /Delete/); assert.match(row.markup, /Work payment/);
});
test('Work main view displays current summary and outstanding work while keeping paid entries in History', async (t) => {
  const { sqlite, work, finance } = await initialized(); t.after(() => sqlite.close());
  const party = work.createCounterparty('Acme');
  const id = work.create({ ...workDraft(null, today), counterpartyId: party.id, title: 'Historical paid entry', description: 'Historical paid entry', compensationType: 'fixed', fixedAmount: '800' });
  work.recordPayment({ counterpartyId: party.id, allocations: [{ workEntryId: id, amount: '800' }], categoryId: null, paymentDate: today });
  work.create({ ...workDraft(null, today), counterpartyId: party.id, title: 'Outstanding website', description: 'Outstanding website', compensationType: 'fixed', fixedAmount: '200', expectedPaymentDate: '2026-10-02' });
  const result = renderControl(() => workViews.WorkView({ data: work.readOverview(), categories: finance.read().categories, access: work, mutate: (action) => action(), onCreateCategory: (name) => finance.createCategory(name, 'income') }));
  assert.match(result.markup, /aria-label="Earned, R\$ 1\.000,00"/); assert.match(result.markup, /aria-label="Received, R\$ 800,00"/); assert.match(result.markup, /aria-label="Outstanding, R\$ 200,00"/);
  assert.match(result.markup, /Outstanding website/); assert.match(result.markup, /Needs attention/); assert.match(result.markup, /Work options/);
  assert.doesNotMatch(result.markup, /Historical paid entry/);
  assert.match(result.markup, /Jobs/); assert.doesNotMatch(result.markup, /work-clients/); assert.doesNotMatch(result.markup, /counterpart/i);
});

test('Work balances group unpaid/partial as Outstanding, fully resolved as History, and Undo reopens work', async (t) => {
  const { sqlite, work, finance } = await initialized(); t.after(() => sqlite.close());
  const client = work.createCounterparty('Client');
  const create = (description: string, expectedPaymentDate = '') => work.create({ ...workDraft(null, today), counterpartyId: client.id,
    title: description, description, compensationType: 'fixed', fixedAmount: '1000', expectedPaymentDate });
  const unpaid = create('Unpaid'); const partial = create('Partial'); const overdue = create('Partial overdue', '2026-10-01'); const paid = create('Paid');
  const pay = (id: string, amount: string) => work.recordPayment({ counterpartyId: client.id, allocations: [{ workEntryId: id, amount }], categoryId: null, paymentDate: today });
  pay(partial, '400'); pay(overdue, '400'); const payment = pay(paid, '1000');
  const zero = work.create({ ...workDraft(null, today), counterpartyId: client.id, title: 'No payment due', description: 'No payment due', hours: '0', minutes: '1', hourlyRate: '0,01' });
  const groups = groupWorkItems(work.read().items);
  assert.deepEqual(new Set(groups.outstanding.map((row) => row.entry.id)), new Set([unpaid, partial]));
  assert.deepEqual(groups.overdue.map((row) => row.entry.id), [overdue]); assert.equal(groups.overdue[0].outstandingMinor, 60000);
  assert.deepEqual(new Set(groups.settled.map((row) => row.entry.id)), new Set([paid, zero]));
  const view = renderControl(() => workViews.WorkView({ data: work.readOverview(), categories: finance.read().categories, access: work, mutate: (action) => action(), onCreateCategory: (name) => finance.createCategory(name, 'income') }));
  assert.match(view.markup, /Partial overdue/); assert.match(view.markup, /Needs attention/); assert.match(view.markup, /Jobs/);
  assert.match(view.markup, />Unpaid</); assert.match(view.markup, />Partial</);
  work.undoPayment(payment); assert.ok(groupWorkItems(work.read().items).outstanding.some((row) => row.entry.id === paid));
  assert.ok(!groupWorkItems(work.read().items).settled.some((row) => row.entry.id === paid));
});

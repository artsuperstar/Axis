/// <reference types="node" />
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';
import { workDraft } from '../src/features/finance/work/form';
import { formatBrlAmount, formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { localDateString } from '../src/utils/calendar';

type App = Awaited<ReturnType<typeof mount>>;
const today = localDateString(new Date());
const nodes = (app: App, id: string) => app.nodes().filter(n => n.props?.testID === id);
const cards = (app: App) => nodes(app, 'work-client-card');
async function menu(app: App, trigger: string, action: string) { await app.press(trigger); await app.press(action); await act(async () => { await new Promise(resolve => setTimeout(resolve, 15)); }); }
async function setup(t: TestContext) {
  const f = await journalDatabase(); t.after(() => f.sqlite.close()); f.setTime(today);
  const job = (id: string, amount = '300') => f.work.create({ ...workDraft(null, today), title: 'Saved job', counterpartyId: id, compensationType: 'fixed', fixedAmount: amount });
  async function open(failures: string[] = []) { const app = await mount(createElement(screens.WorkClientsScreen), f.db, failures); t.after(app.unmount); return app; }
  return { ...f, job, open };
}

test('Clients stays a pushed destination with one bounded list, compact creation, genuine navigation and source order', async t => {
  const f = await setup(t); f.work.createCounterparty('Zulu'); f.work.createCounterparty('Alpha');
  const app = await f.open(), list = nodes(app, 'work-clients-list')[0];
  assert.equal(list.props.initialNumToRender, 8); assert.equal(list.props.windowSize, 5);
  assert.equal(app.nodes().filter(n => n.kind === 'ScrollView').length, 0);
  assert.equal(app.nodes().filter(n => n.kind === 'Modal').length, 0);
  assert.equal(app.nodes().filter(n => n.kind === 'FormField' && n.props.label === 'Name *').length, 0);
  assert.ok(app.find('FormButton', 'New client')); assert.ok(cards(app)[0].textContent.includes('Alpha')); assert.ok(cards(app)[1].textContent.includes('Zulu'));
  assert.ok(!/Name A–Z|jobs/.test(nodes(app, 'work-clients-content')[0].textContent));
  await app.tapSet('Open Alpha details'); assert.ok(app.container.textContent.includes('Open jobs')); assert.equal(f.finance.read().transactions.length, 0);
  await app.press('Back'); await app.press('Back to Work'); assert.equal(runtime.fixture.navigation.at(-1)!.method, 'back');
});

test('search retains case/space/accent matching across Active and Archived and clear/no-match recovery', async t => {
  const f = await setup(t); f.work.createCounterparty('Álvaro Studio'); f.work.createCounterparty('Alvaro Studio');
  const old = f.work.createCounterparty('ÁLVARO Past'); f.work.archiveCounterparty(old.id); f.work.createCounterparty('Other');
  const app = await f.open(); await app.change('Search clients', '  alvaro  '); assert.equal(cards(app).length, 3);
  await app.tapSet('Archived clients (1)'); assert.equal(cards(app).length, 2);
  await app.change('Search clients', 'A\u0301lvaro'); assert.equal(cards(app).length, 3);
  await app.change('Search clients', 'Absent'); assert.equal(cards(app).length, 0); assert.ok(app.container.textContent.includes('No matching active clients.'));
  assert.equal(app.find('FormField', 'Search clients').props.value, 'Absent'); await app.press('Clear search'); assert.equal(cards(app).length, 4);
  assert.equal(f.work.readOverview().counterparties.filter(p => p.deletedAt !== null).length, 1);
});

test('creation validates required/duplicate/NFC names, retains failure draft and creates a distinct unaccented identity', async t => {
  const f = await setup(t); const old = f.work.createCounterparty('Álvaro'); const app = await f.open(); await app.press('New client');
  await app.press('Create client'); assert.match(app.find('FormField', 'Name *').props.error as string, /client name/);
  for (const name of ['  ÁLVARO  ', 'A\u0301lvaro']) { await app.change('Name *', name); await app.press('Create client'); assert.match(app.find('FormField', 'Name *').props.error as string, /already exists/); assert.equal(app.find('FormField', 'Name *').props.value, name); }
  await app.change('Name *', '  Alvaro   Studio  '); await app.press('Create client');
  const added = f.work.readOverview().counterparties.find(p => p.name === 'Alvaro Studio')!; assert.ok(added); assert.notEqual(added.id, old.id);
  assert.ok(app.container.textContent.includes('Client created: Alvaro Studio.')); assert.ok(app.find('FormButton', 'New client'));
  assert.equal(f.finance.read().transactions.length, 0);
});

test('failed save retains draft; retry submits once even when handler is called twice before rerender', async t => {
  const f = await setup(t), app = await f.open(); await app.press('New client'); await app.change('Name *', 'New person');
  const access = (runtime.fixture as unknown as { accesses: { work: { createCounterparty: (name: string) => unknown } } }).accesses.work;
  const injection = t.mock.method(access, 'createCounterparty', () => { throw Error('Unable to save client'); });
  await app.press('Create client'); assert.equal(app.find('FormField', 'Name *').props.value, 'New person');
  injection.mock.restore(); const submit = app.find('FormButton', 'Create client').props.onPress as () => void;
  await act(() => { submit(); submit(); }); assert.equal(f.work.readOverview().counterparties.length, 1);
  await app.press('New client'); await app.change('Name *', 'Discard me'); await app.press('Cancel new client'); assert.equal(f.work.readOverview().counterparties.length, 1);
});

test('archive requires confirmation, preserves shared Income, allocations, balances and historical identity; no invented restore', async t => {
  const f = await setup(t), party = f.work.createCounterparty('Historical'), a = f.job(party.id), b = f.job(party.id);
  f.work.recordPayment({ counterpartyId: party.id, allocations: [{ workEntryId: a, amount: '100' }, { workEntryId: b, amount: '80' }], categoryId: null, paymentDate: today });
  const before = f.work.read(), ledger = f.finance.read(), app = await f.open();
  await menu(app, 'Client options for Historical', 'Archive Historical'); await app.confirm('Cancel'); assert.equal(f.work.readOverview().counterparties[0].deletedAt, null);
  await menu(app, 'Client options for Historical', 'Archive Historical'); await app.confirm('Confirm');
  const after = f.work.read(); assert.deepEqual(after.totals, before.totals); assert.deepEqual(after.payments, before.payments.map(p => ({ ...p, counterparty: after.counterparties[0] })));
  assert.deepEqual(f.finance.read(), ledger); assert.ok(cards(app)[0].textContent.includes('Archived client')); assert.ok(cards(app)[0].textContent.includes('R$ 420,00'));
  await app.press('Client options for Historical'); assert.ok(!app.nodes().some(n => n.kind === 'FormButton' && /Restore|Archive|Delete|Rename/.test(String(n.props.label))));
  await app.tapSet('Close client options for historical'); await app.tapSet('Open Historical details'); assert.ok(app.find('FormButton', 'Record payment from Historical'));
});

test('archived identity reuse never remaps old jobs and archived clients stay ineligible for new Work', async t => {
  const f = await setup(t), old = f.work.createCounterparty('Reused'), id = f.job(old.id); f.work.archiveCounterparty(old.id);
  const app = await f.open(); await app.press('New client'); await app.change('Name *', 'Reused'); await app.press('Create client');
  const current = f.work.readOverview().counterparties.find(p => p.deletedAt === null)!; assert.notEqual(current.id, old.id); assert.equal(f.work.readDetail(id).items[0].entry.counterpartyId, old.id);
  assert.throws(() => f.job(old.id), /active client/); assert.equal(f.finance.read().transactions.length, 0);
});

test('creation/search/disclosure retain state through last-good refresh failure and authoritative receipts update totals on retry', async t => {
  const f = await setup(t), party = f.work.createCounterparty('Person'), id = f.job(party.id), app = await f.open();
  await app.change('Search clients', 'Person'); await app.press('New client'); await app.change('Name *', 'Unsaved');
  runtime.fixture.failures.add('work.readOverview'); await app.refocus(); assert.equal(app.find('FormField', 'Name *').props.value, 'Unsaved');
  f.work.recordPayment({ counterpartyId: party.id, allocations: [{ workEntryId: id, amount: '100' }], categoryId: null, paymentDate: today });
  runtime.fixture.failures.clear(); await app.press('Retry'); assert.equal(app.find('FormField', 'Search clients').props.value, 'Person');
  assert.ok(cards(app)[0].textContent.includes('R$ 200,00')); assert.equal(app.find('FormField', 'Name *').props.value, 'Unsaved');
});

test('large client collection uses stable IDs/source ordering with no keystroke or per-row reads', async t => {
  const f = await setup(t); for (let i = 0; i < 160; i++) { const p = f.work.createCounterparty(`Client ${String(i).padStart(3, '0')}`); if (i % 3 === 0) f.work.archiveCounterparty(p.id); }
  const app = await f.open(), before = runtime.fixture.reads.length; await app.change('Search clients', 'Client 15');
  assert.equal(runtime.fixture.reads.length, before); const list = nodes(app, 'work-clients-list')[0];
  const sections = list.props.sections as { data: { id: string }[] }[]; const keys = sections.flatMap(s => s.data.map(list.props.keyExtractor as (x: { id: string }) => string));
  assert.equal(new Set(keys).size, 10); assert.equal(list.props.maxToRenderPerBatch, 8);
});

for (const width of [320, 390, 430]) for (const fontScale of [1, 2]) test(`${width}/${fontScale} long client names and aggregate BRL above safe Number preserve all digits`, async t => {
  t.mock.method(runtime.native as { useWindowDimensions: () => object }, 'useWindowDimensions', () => ({ width, height: 844, scale: 1, fontScale }));
  const f = await setup(t), name = 'Longunbrokenclientidentity'.repeat(5), party = f.work.createCounterparty(name);
  for (let i = 0; i < 3; i++) f.job(party.id, formatBrlInput(maxAmountMinor));
  const app = await f.open(), card = cards(app)[0]; assert.ok(card.textContent.includes(name)); assert.ok(card.textContent.includes(formatBrlAmount(BigInt(maxAmountMinor) * 3n)));
  assert.ok(app.find('Pressable', `Open ${name} details`)); assert.ok(app.find('FormButton', `Client options for ${name}`));
  assert.equal(app.nodes(card).filter(n => n.props?.testID === 'client-money-group').at(-1)!.textContent, '229,73');
});

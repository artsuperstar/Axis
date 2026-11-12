/// <reference types="node" />
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { workDraft } from '../src/features/finance/work/form';
import { formatBrlAmount, formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { addDays, dateLabel, localDateString } from '../src/utils/calendar';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const today = localDateString(new Date());
type App = Awaited<ReturnType<typeof mount>>;
const nodes = (app: App, id: string) => app.nodes().filter(n => n.props?.testID === id);
const node = (app: App, id: string) => { const n = nodes(app, id)[0]; assert.ok(n, id); return n; };
async function setup(t: TestContext, name = 'Selected client') {
  t.mock.method((runtime.native as { AccessibilityInfo: { isReduceMotionEnabled: () => Promise<boolean> } }).AccessibilityInfo, 'isReduceMotionEnabled', () => Promise.resolve(true));
  const f = await journalDatabase(); f.setTime(today); t.after(() => f.sqlite.close());
  const client = f.work.createCounterparty(name);
  const job = (title = 'Penso', amount = '300', expected = '', party = client.id) => f.work.create({ ...workDraft(null, addDays(today, -5)),
    counterpartyId: party, title, description: title, compensationType: 'fixed', fixedAmount: amount, expectedPaymentDate: expected });
  const pay = (allocations: { workEntryId: string; amount: string }[]) => f.work.recordPayment({ counterpartyId: client.id, allocations, categoryId: null, paymentDate: today });
  async function open() { const app = await mount(createElement(screens.WorkClientsScreen), f.db); t.after(app.unmount); await app.tapSet(`Open ${name} details`); return app; }
  return { ...f, client, job, pay, open };
}

test('Client Details has one identity/financial overview, source amounts, one modal and an intrinsic virtualized sheet body', async t => {
  const f = await setup(t); f.job(); const app = await f.open();
  assert.equal(nodes(app, 'client-details-name').length, 1); assert.equal(node(app, 'client-details-name').textContent, f.client.name);
  assert.equal(nodes(app, 'client-financial-overview').length, 1); assert.equal(app.nodes().filter(n => n.kind === 'Modal').length, 1);
  for (const [label, amount] of [['outstanding', 'R$ 300,00'], ['earned', 'R$ 300,00'], ['received', 'R$ 0,00']]) {
    assert.equal(node(app, `client-detail-metric-${label}`).props.accessibilityLabel, `${label[0].toUpperCase() + label.slice(1)}, ${amount}`);
  }
  const list = node(app, 'work-client-details-list'); assert.equal(list.props.initialNumToRender, 6); assert.equal(list.props.windowSize, 5);
  assert.equal(app.nodes().filter(n => n.kind === 'ScrollView').length, 0);
  assert.ok(!/Recent receipts|Payment pending|Payment expected|Payment Status|Job Summary/.test(list.textContent));
  assert.equal(f.finance.read().transactions.length, 0);
  await app.press('Back'); assert.equal(nodes(app, 'work-client-details-list').length, 0); assert.ok(node(app, 'work-clients-list'));
});

test('open jobs retain overdue-first stable order, real dates, partial status and IDs without redundant client/title metadata', async t => {
  const f = await setup(t), first = f.job('Partial'), overdue = f.job('Overdue', '300', addDays(today, -1)), settled = f.job('Settled');
  const stranger = f.work.createCounterparty('Other client'); f.job('Other work', '500', '', stranger.id);
  f.pay([{ workEntryId: first, amount: '100' }, { workEntryId: settled, amount: '300' }]);
  const app = await f.open(), rows = nodes(app, 'client-open-job'); assert.equal(rows.length, 2);
  assert.ok(rows[0].textContent.includes('Overdue')); assert.ok(rows[1].textContent.includes('Partially paid'));
  assert.ok(rows.every(r => !r.textContent.includes(f.client.name))); assert.ok(rows[1].textContent.includes(dateLabel(addDays(today, -5))));
  assert.equal(app.nodes(rows[1]).filter(n => n.textContent === 'Partial' && n.props?.testID === 'client-job-title').length, 1);
  await app.tapSet(String(rows[0].props.accessibilityLabel)); assert.equal(node(app, 'job-title').textContent, 'Overdue');
  assert.equal((node(app, 'job-client').textContent), f.client.name); assert.equal(f.work.readDetail(overdue).items[0].entry.id, overdue);
});

test('Add Work retains client preselection and existing save/cancel behavior without writing Income', async t => {
  const f = await setup(t), app = await f.open(); await app.press(`Add work for ${f.client.name}`);
  assert.equal(app.find('AutocompleteField', 'Client *').props.value, f.client.id);
  await app.change('Job title *', 'New saved work');
  // The existing editor starts Hourly; select Fixed through the established segmented control.
  await act(() => (app.find('SegmentedControl', 'Compensation type *').props.onChange as (value: string) => void)('fixed'));
  await app.change('Fixed amount *', '125'); await app.press('Save');
  assert.ok(f.work.readOverview().items.some(i => i.entry.title === 'New saved work' && i.entry.counterpartyId === f.client.id));
  assert.equal(f.finance.read().transactions.length, 0);
});

test('Record Payment retains client-first multi-work selection, exact partial allocations and one linked Income', async t => {
  const f = await setup(t), a = f.job('Job A'), b = f.job('Job B'), app = await f.open();
  await app.press(`Record payment from ${f.client.name}`); assert.equal(app.find('AutocompleteField', 'Client *').props.value, f.client.id);
  await app.tapSet('Allocate payment to Job A'); await app.tapSet('Allocate payment to Job B');
  await app.change('Allocation in reais for Job A', '100,01'); await app.change('Allocation in reais for Job B', '80,02'); await app.press('Confirm');
  const snapshot = f.work.read(); assert.equal(snapshot.payments.length, 1); assert.equal(f.finance.read().transactions[0].amountMinor, 18003);
  assert.equal(snapshot.items.find(i => i.entry.id === a)!.outstandingMinor, 19999); assert.equal(snapshot.items.find(i => i.entry.id === b)!.outstandingMinor, 21998);
  await app.tapSet(`Open ${f.client.name} details`); assert.equal(node(app, 'client-detail-metric-received').textContent, 'ReceivedR$ 180,03');
});

test('History keeps genuine shared receipts and Undo reverses the full linked Income then refreshes client totals', async t => {
  const f = await setup(t), a = f.job('Job A'), b = f.job('Job B'); f.pay([{ workEntryId: a, amount: '100' }, { workEntryId: b, amount: '80' }]);
  const app = await f.open(); assert.equal(node(app, 'client-detail-metric-received').textContent, 'ReceivedR$ 180,00');
  await app.tapSet(`History for ${f.client.name}`); assert.ok(app.container.textContent.includes('R$ 180,00'));
  const receipt = nodes(app, 'work-history-receipt')[0] ?? nodes(app, 'work-receipt')[0]; assert.ok(receipt);
  const menu = app.nodes(receipt).find(n => n.kind === 'FormButton'); assert.ok(menu); await app.press(String(menu.props.accessibilityLabel)); await app.press('Undo payment');
  assert.match(runtime.fixture.alerts.at(-1)!.message, /R\$ 180,00.*2 work entries/); await app.confirm('Cancel'); assert.equal(f.finance.read().transactions.length, 1);
  await app.press(String(menu.props.accessibilityLabel)); await app.press('Undo payment'); await app.confirm('Confirm');
  await app.press('Back'); await app.tapSet(`Open ${f.client.name} details`);
  assert.equal(node(app, 'client-detail-metric-outstanding').textContent, 'OutstandingR$ 600,00'); assert.equal(node(app, 'client-detail-metric-received').textContent, 'ReceivedR$ 0,00');
});

test('archive is confirmed, preserves debt/ledger and available payment/history but never offers unsupported rename/restore', async t => {
  const f = await setup(t); f.job(); const app = await f.open();
  async function archive() { await app.press(`Client options for ${f.client.name}`); await app.press(`Archive ${f.client.name}`); }
  await archive(); await app.confirm('Cancel'); assert.equal(f.work.readOverview().counterparties[0].deletedAt, null);
  await archive(); await app.confirm('Confirm'); assert.ok(node(app, 'client-archived'));
  assert.ok(!app.nodes().some(n => n.kind === 'FormButton' && n.props.accessibilityLabel === `Add work for ${f.client.name}`));
  assert.ok(app.find('FormButton', `Record payment from ${f.client.name}`));
  await app.press(`Client options for ${f.client.name}`); assert.ok(!app.nodes().some(n => n.kind === 'FormButton' && /Rename|Unarchive|Restore|Delete|Archive/.test(String(n.props.label))));
  assert.equal(f.finance.read().transactions.length, 0);
});

test('zero-work and fully settled clients have accurate empty states and totals with History instead of fictional receipts', async t => {
  const f = await setup(t), app = await f.open(); assert.ok(node(app, 'client-jobs-empty'));
  assert.equal(node(app, 'client-detail-metric-outstanding').textContent, 'OutstandingR$ 0,00');
  assert.ok(!app.nodes().some(n => n.kind === 'FormButton' && String(n.props.label) === 'Record payment'));
  const id = f.job(); f.pay([{ workEntryId: id, amount: '300' }]); await app.refocus();
  assert.ok(node(app, 'client-jobs-empty')); assert.equal(node(app, 'client-detail-metric-received').textContent, 'ReceivedR$ 300,00');
  assert.equal(nodes(app, 'client-open-job').length, 0); assert.ok(node(app, 'client-history-navigation'));
});

test('focus/foreground refresh preserves last-good sheet on failures and updates totals/statuses after Retry without per-row reads', async t => {
  const f = await setup(t); const id = f.job(), app = await f.open(), before = runtime.fixture.reads.length;
  await act(async () => {}); assert.equal(runtime.fixture.reads.length, before);
  runtime.fixture.failures.add('work.readOverview'); f.pay([{ workEntryId: id, amount: '100' }]); await app.resume();
  assert.equal(node(app, 'client-detail-metric-received').textContent, 'ReceivedR$ 0,00');
  runtime.fixture.failures.clear(); await app.press('Retry'); assert.equal(node(app, 'client-detail-metric-received').textContent, 'ReceivedR$ 100,00');
  assert.ok(node(app, 'client-open-job').textContent.includes('Partially paid'));
});

for (const width of [320, 390, 430]) for (const fontScale of [1, 2]) test(`${width}/${fontScale}: long identity, aggregate BigInt balances and variable-height jobs preserve all digits and explicit controls`, async t => {
  t.mock.method(runtime.native as { useWindowDimensions: () => object }, 'useWindowDimensions', () => ({ width, height: 844, scale: 1, fontScale }));
  const f = await setup(t, 'Longunbrokenclientidentity'.repeat(5)); for (let i = 0; i < 3; i++) f.job(`Long job ${i}`, formatBrlInput(maxAmountMinor));
  const app = await f.open(), total = formatBrlAmount(BigInt(maxAmountMinor) * 3n);
  assert.equal(node(app, 'client-details-name').textContent, f.client.name); assert.ok(node(app, 'client-financial-overview').textContent.includes(total));
  assert.ok(app.find('FormButton', `Record payment from ${f.client.name}`)); assert.ok(app.find('FormButton', `Add work for ${f.client.name}`));
  assert.equal(nodes(app, 'client-open-job').length, 3); assert.equal(node(app, 'work-client-details-list').props.getItemLayout, undefined);
  assert.equal(app.nodes(node(app, 'client-detail-metric-outstanding')).filter(n => n.props?.testID === 'client-detail-money-group').at(-1)!.textContent, '229,73');
});

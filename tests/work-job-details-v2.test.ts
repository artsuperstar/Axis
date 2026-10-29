/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test, type TestContext } from 'node:test';
import { createElement } from 'react';
import { createCalendarDataAccess } from '../src/features/calendar/data';
import { workDraft } from '../src/features/finance/work/form';
import type { WorkDraft } from '../src/features/finance/work/types';
import { formatBrlAmount, formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { addDays, dateLabel, localDateString } from '../src/utils/calendar';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const today = localDateString(new Date());
type App = Awaited<ReturnType<typeof mount>>;
const node = (app: App, id: string) => { const found = app.nodes().find(n => n.props?.testID === id); assert.ok(found, id); return found; };
const receipts = (app: App) => app.nodes(node(app, 'work-job-details-list')).filter(n => n.props?.testID === 'work-receipt');
async function setup(t: TestContext, name = 'Independent studio') {
  t.mock.method((runtime.native as { AccessibilityInfo: { isReduceMotionEnabled: () => Promise<boolean> } }).AccessibilityInfo, 'isReduceMotionEnabled', () => Promise.resolve(true));
  const f = await journalDatabase(); f.setTime(today); t.after(() => f.sqlite.close());
  const client = f.work.createCounterparty(name);
  const create = (title = 'App', changes: Partial<WorkDraft> = {}) => f.work.create({ ...workDraft(null, addDays(today, -4)), counterpartyId: client.id,
    title, description: 'Additional job context', compensationType: 'fixed', fixedAmount: '300', expectedPaymentDate: addDays(today, -2), ...changes });
  const pay = (allocations: { workEntryId: string; amount: string }[], date = today) => f.work.recordPayment({ counterpartyId: client.id, allocations, categoryId: null, paymentDate: date });
  async function open(id: string) { const app = await mount(createElement(screens.FinanceScreen, { initialView: 'work', initialRecordId: id }), f.db); t.after(app.unmount); return app; }
  return { ...f, client, create, pay, open };
}

test('Job Details owns one overview and existing modal, explicit actions, genuine Client navigation and informational Description', async t => {
  const f = await setup(t), id = f.create(), app = await f.open(id);
  assert.equal(app.nodes().filter(n => n.kind === 'Modal').length, 1);
  assert.equal(app.nodes().filter(n => n.props?.testID === 'job-overview').length, 1);
  for (const [metric, expected] of [['outstanding', 'R$ 300,00Outstanding'], ['earned', 'EarnedR$ 300,00'], ['received', 'ReceivedR$ 0,00']]) assert.equal(node(app, `job-metric-${metric}`).textContent, expected);
  assert.ok(node(app, 'job-overview').textContent.includes('Fixed price')); assert.ok(node(app, 'job-overview').textContent.includes(dateLabel(addDays(today, -4))));
  assert.ok(node(app, 'job-overdue')); assert.ok(app.nodes(node(app, 'job-overview')).some(n => n.props?.testID === 'icon-briefcase'));
  assert.ok(!app.nodes(node(app, 'job-overview')).some(n => n.props?.accessibilityRole === 'button'));
  const description = node(app, 'editor-section-description'); assert.ok(!app.nodes(description).some(n => n.props?.accessibilityRole === 'button' || n.props?.testID === 'icon-forward'));
  assert.equal(node(app, 'job-description').textContent, 'Additional job context');
  assert.ok(node(app, 'job-receipts-empty').textContent.includes('No money received for this work yet.'));
  assert.ok(!/Payment Status|Job Summary|Active|%/.test(node(app, 'work-job-details-list').textContent));
  assert.equal(app.nodes().filter(n => n.kind === 'FormButton' && n.props.accessibilityLabel === 'Edit App').length, 1);
  await app.press('Work options for App'); assert.ok(!app.nodes().some(n => n.kind === 'FormButton' && n.props.label === 'Edit'));
  assert.ok(app.find('FormButton', 'Client details')); assert.ok(app.find('FormButton', 'Delete App'));
  await app.tapSet('Close work options for app');
  await app.tapSet(`Open ${f.client.name} details`); assert.ok(app.container.textContent.includes('Open jobs')); assert.equal(f.finance.read().transactions.length, 0);
  await app.press('Back'); assert.equal(app.nodes().filter(n => n.kind === 'Modal').length, 0);
});

test('Hourly overview retains saved duration/rate, exact Earned, no invented expected date and no false overdue', async t => {
  const f = await setup(t), id = f.create('Review', { compensationType: 'hourly', hours: '2', minutes: '30', hourlyRate: '50', expectedPaymentDate: '' }), app = await f.open(id);
  assert.ok(node(app, 'job-compensation-metrics').textContent.includes('Hourly2h 30m × R$ 50,00/hour'));
  assert.equal(node(app, 'job-metric-earned').textContent, 'EarnedR$ 125,00'); assert.ok(node(app, 'job-dates').textContent.includes('Expected paymentNot set'));
  assert.ok(!app.nodes().some(n => n.props?.testID === 'job-overdue')); assert.equal(f.finance.read().transactions.length, 0);
});

test('Record Payment reuses v2 with selected job/client and remaining balance; partial confirmation refreshes source and reopen', async t => {
  const f = await setup(t), id = f.create(), app = await f.open(id);
  await app.press('Record payment for App'); assert.equal(app.nodes().filter(n => n.kind === 'Modal').length, 1);
  assert.equal(app.find('AutocompleteField', 'Client *').props.value, f.client.id); assert.equal(app.find('FormField', 'Allocation in reais for App').props.value, '300,00');
  await app.change('Allocation in reais for App', '100'); await app.press('Confirm');
  assert.equal(f.finance.read().transactions.length, 1); assert.equal(f.work.readDetail(id).items[0].outstandingMinor, 20000);
  assert.equal(app.nodes().filter(n => n.kind === 'Modal').length, 0);
  const job = app.nodes().find(n => n.props?.testID === 'work-entry' && String(n.props.accessibilityLabel).startsWith('App,'))!;
  await app.tapSet(String(job.props.accessibilityLabel)); assert.equal(node(app, 'job-metric-received').textContent, 'ReceivedR$ 100,00'); assert.equal(receipts(app).length, 1);
  assert.ok(receipts(app)[0].textContent.includes('R$ 100,00')); assert.ok(!app.nodes().some(n => n.props?.testID === 'job-receipts-empty'));
});

test('shared receipt shows only the selected job allocation until explicit disclosure; Undo retains whole-Income confirmation and atomicity', async t => {
  const f = await setup(t), a = f.create('Job A'), b = f.create('Job B'); f.pay([{ workEntryId: a, amount: '100' }, { workEntryId: b, amount: '80' }]);
  const before = f.finance.read().transactions; assert.equal(before.length, 1); assert.equal(before[0].amountMinor, 18000);
  const app = await f.open(a), row = receipts(app)[0]; assert.ok(row.textContent.includes('Received for this jobR$ 100,00'));
  assert.ok(!row.textContent.includes('R$ 180,00')); assert.ok(!row.textContent.includes('R$ 80,00'));
  const body = app.nodes(row).find(n => n.props?.accessibilityRole === 'button')!; assert.ok(String(body.props.accessibilityLabel).includes('allocated R$ 100,00'));
  await app.tapSet(String(body.props.accessibilityLabel)); assert.ok(row.textContent.includes('Shared Income total: R$ 180,00')); assert.ok(row.textContent.includes('Job B · Received R$ 80,00'));
  const options = app.nodes(row).find(n => n.kind === 'FormButton')!; await app.press(String(options.props.accessibilityLabel)); await app.press('Undo payment');
  assert.match(runtime.fixture.alerts.at(-1)!.message, /R\$ 180,00.*2 work entries/); await app.confirm('Cancel'); assert.deepEqual(f.finance.read().transactions, before);
  await app.press(String(options.props.accessibilityLabel)); await app.press('Undo payment'); await app.confirm('Confirm');
  assert.equal(f.finance.read().transactions.length, 0); assert.equal(f.work.readDetail(a).items[0].outstandingMinor, 30000); assert.equal(f.work.readDetail(b).items[0].outstandingMinor, 30000);
  assert.equal(receipts(app).length, 0); assert.ok(node(app, 'job-receipts-empty'));
});

test('multiple partial receipts keep actual payment-date order and fully received jobs hide only the unavailable payment action', async t => {
  const f = await setup(t), id = f.create();
  f.pay([{ workEntryId: id, amount: '50' }], addDays(today, -2)); f.pay([{ workEntryId: id, amount: '100' }], addDays(today, -1)); f.pay([{ workEntryId: id, amount: '150' }]);
  const app = await f.open(id), rows = receipts(app);
  assert.equal(rows.length, 3); assert.ok(rows[0].textContent.includes('R$ 150,00')); assert.ok(rows[1].textContent.includes('R$ 100,00')); assert.ok(rows[2].textContent.includes('R$ 50,00'));
  assert.ok(rows[0].textContent.includes(dateLabel(today))); assert.equal(node(app, 'job-metric-outstanding').textContent, 'R$ 0,00Outstanding');
  assert.equal(node(app, 'job-metric-received').textContent, 'ReceivedR$ 300,00'); assert.ok(!app.nodes().some(n => n.props?.testID === 'job-overdue'));
  assert.ok(!app.nodes().some(n => n.kind === 'FormButton' && n.props.accessibilityLabel === 'Record payment for App'));
  await app.press('Work options for App'); assert.ok(!app.nodes().some(n => n.kind === 'FormButton' && n.props.label === 'Delete'));
});

test('explicit Edit opens existing v2, preserves paid safeguards and Cancel/Back do not write money', async t => {
  const f = await setup(t), id = f.create(); f.pay([{ workEntryId: id, amount: '100' }]); const ledger = f.finance.read(), app = await f.open(id);
  await app.press('Edit App'); assert.ok(node(app, 'editor-section-job')); assert.equal(app.find('FormField', 'Client *').props.editable, false);
  await app.change('Fixed amount *', '50'); await app.press('Save'); assert.match(app.find('FormError').textContent, /less than.*received/i); assert.deepEqual(f.finance.read(), ledger);
  await app.change('Fixed amount *', '350'); await app.press('Save'); assert.equal(f.work.readDetail(id).items[0].earnedMinor, 35000); assert.deepEqual(f.finance.read(), ledger);
});

test('unpaid Delete stays confirmed; Cancel retains the job and confirmed Delete creates no Finance transaction', async t => {
  const f = await setup(t), id = f.create(), app = await f.open(id);
  await app.press('Work options for App'); await app.press('Delete App'); await app.confirm('Cancel'); assert.equal(f.work.readDetail(id).items.length, 1);
  await app.press('Work options for App'); await app.press('Delete App'); await app.confirm('Confirm'); assert.equal(f.work.readDetail(id).items.length, 0);
  assert.equal(f.finance.read().transactions.length, 0); assert.equal(app.nodes().filter(n => n.kind === 'Modal').length, 0);
});

test('archived Client and legacy identity remain readable; empty Description has no fake destination', async t => {
  const f = await setup(t), id = f.create('Original title', { description: '' }); f.work.archiveCounterparty(f.client.id);
  const app = await f.open(id); assert.ok(node(app, 'editor-section-client').textContent.includes('Archived client'));
  assert.ok(!app.nodes().some(n => n.props?.testID === 'editor-section-description'));
  await app.press('Back'); assert.equal(f.finance.read().transactions.length, 0);
  const legacy = f.work.readDetail(id).items[0].entry; assert.equal(legacy.title, 'Original title');
});

test('receipt rendering is one bounded list with real IDs and no per-row source reads; refresh failure retains the mounted details', async t => {
  t.mock.method(console, 'error', () => {});
  const f = await setup(t), id = f.create('Many receipts', { fixedAmount: '1000' }); for (let i = 0; i < 65; i++) f.pay([{ workEntryId: id, amount: '1' }]);
  const app = await f.open(id), list = node(app, 'work-job-details-list'); assert.equal((list.props.data as unknown[]).length, 65);
  assert.equal(list.props.initialNumToRender, 6); assert.equal(list.props.windowSize, 5);
  const data = list.props.data as { payment: { transaction: { id: string } } }[];
  assert.deepEqual(data.map(list.props.keyExtractor as (row: typeof data[number]) => string), f.work.readDetail(id).payments.map(p => p.transaction.id));
  const before = runtime.fixture.reads.length, body = app.nodes(receipts(app)[0]).find(n => n.props?.accessibilityRole === 'button')!;
  await app.tapSet(String(body.props.accessibilityLabel)); assert.equal(runtime.fixture.reads.length, before);
  runtime.fixture.failures.add('work.readDetail'); await app.refocus(); assert.equal(node(app, 'work-job-details-list'), list); assert.equal(receipts(app).length, 65);
  runtime.fixture.failures.clear(); await app.refocus(); assert.equal(node(app, 'job-metric-received').textContent, 'ReceivedR$ 65,00');
});

for (const width of [320, 390, 430]) for (const scale of [1, 2]) test(`${width}/${scale}: full financial values, long identities/description and existing accessible actions remain available`, async t => {
  const native = runtime.native as { useWindowDimensions: () => { width: number; height: number; scale: number; fontScale: number } };
  t.mock.method(native, 'useWindowDimensions', () => ({ width, height: 844, scale: 1, fontScale: scale }));
  const f = await setup(t, 'Longunbrokenclientidentity'.repeat(5)), title = 'Longunbrokenjobidentity'.repeat(5), description = ('Detailed multiline job context\n').repeat(30);
  const id = f.create(title, { description, fixedAmount: formatBrlInput(maxAmountMinor) }); f.pay([{ workEntryId: id, amount: formatBrlInput(maxAmountMinor - 1) }]);
  const app = await f.open(id); assert.equal(node(app, 'job-title').textContent, title); assert.equal(node(app, 'job-description').textContent, description.trim());
  assert.equal(node(app, 'job-metric-earned').textContent, `Earned${formatBrlAmount(maxAmountMinor)}`);
  assert.equal(node(app, 'job-metric-received').textContent, `Received${formatBrlAmount(maxAmountMinor - 1)}`); assert.equal(node(app, 'job-metric-outstanding').textContent, 'R$ 0,01Outstanding');
  const groups = app.nodes(node(app, 'job-metric-earned')).filter(n => n.props?.testID === 'job-money-group');
  assert.equal(groups.at(-1)!.textContent, '409,91'); assert.equal(groups.map(n => n.textContent).join(''), formatBrlAmount(maxAmountMinor));
  for (const label of ['Back', `Edit ${title}`, `Record payment for ${title}`, `Work options for ${title}`]) assert.ok(app.find('FormButton', label));
});

test('actual receipts update Journal and Calendar projections without treating Earned or expected dates as Income', async t => {
  const f = await setup(t), id = f.create(), calendar = createCalendarDataAccess(f.db, randomUUID);
  assert.equal(f.context.read(today).incomeMinor, 0n); assert.equal(calendar.readRange({ from: addDays(today, -2), to: today }).find(x => x.source === 'work')!.amountMinor, 30000);
  f.pay([{ workEntryId: id, amount: '75' }]); const app = await f.open(id);
  assert.equal(node(app, 'job-metric-earned').textContent, 'EarnedR$ 300,00'); assert.equal(f.context.read(today).incomeMinor, 7500n);
  assert.equal(calendar.readRange({ from: addDays(today, -2), to: today }).find(x => x.source === 'work')!.amountMinor, 22500);
  assert.equal(f.finance.read().transactions.length, 1);
});

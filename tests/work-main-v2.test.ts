/// <reference types="node" />
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { workDraft } from '../src/features/finance/work/form';
import { groupWorkItems } from '../src/features/finance/work/presentation';
import type { WorkDraft, WorkItem } from '../src/features/finance/work/types';
import { formatBrlAmount, formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { addDays, dateLabel, localDateString } from '../src/utils/calendar';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const today = localDateString(new Date());
type App = Awaited<ReturnType<typeof mount>>;
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 15)); }); }
function nodes(app: App, id: string) { return app.nodes().filter(n => n.props?.testID === id); }
function main(app: App) { const list = nodes(app, 'work-main-list')[0]; assert.ok(list); return list; }
function sections(app: App) { return main(app).props.sections as { key: string; data: WorkItem[] }[]; }
async function setup(t: TestContext) {
  t.mock.method(console, 'error', () => {});
  const f = await journalDatabase(); f.setTime(today); t.after(() => f.sqlite.close());
  const client = f.work.createCounterparty('Independent client');
  const create = (title: string, changes: Partial<WorkDraft> = {}) => f.work.create({ ...workDraft(null, today), title, counterpartyId: client.id, compensationType: 'fixed', fixedAmount: '1000', ...changes });
  const pay = (id: string, amount: string) => f.work.recordPayment({ counterpartyId: client.id, paymentDate: today, categoryId: null, allocations: [{ workEntryId: id, amount }] });
  async function open() { const app = await mount(createElement(screens.FinanceScreen, { initialView: 'work' }), f.db); t.after(app.unmount); return app; }
  return { ...f, client, create, pay, open };
}

test('Work v2 keeps Finance destinations, removes the redundant heading and retains source-owned actions', async t => {
  const f = await setup(t); f.create('Planning work'); const app = await f.open();
  assert.ok(['Overview', 'Transactions', 'Commitments', 'Work'].every(label => !!app.find('FormButton', label)));
  assert.ok(!app.nodes().some(n => n.props?.accessibilityRole === 'header' && n.textContent === 'Work'));
  assert.equal(app.find('FormButton', 'Add work').props.variant, 'secondary'); assert.equal(app.find('FormButton', 'Record payment').props.variant, 'primary');
  const summary = nodes(app, 'work-financial-summary')[0]; assert.ok(app.nodes(summary).some(n => n.props?.accessibilityLabel === 'Work options'));
  await app.press('Work options'); await app.press('Clients'); await settle(); assert.deepEqual(runtime.fixture.navigation.at(-1), { method: 'push', target: '/work/clients' });
  await app.press('Work options'); await app.press('History'); await settle(); assert.deepEqual(runtime.fixture.navigation.at(-1), { method: 'push', target: '/work/history' });
  await app.press('Add work'); assert.ok(app.find('FormField', 'Job title *')); assert.ok(app.find('AutocompleteField', 'Client *')); await app.press('Cancel');
  await app.press('Record payment');
  await act(() => (app.find('AutocompleteField', 'Client *').props.onSelect as (id: string) => void)(f.client.id));
  assert.ok(app.find('Pressable', 'Allocate payment to Planning work')); assert.equal(f.finance.read().transactions.length, 0);
});

test('lifetime summary reconciles partial receipts and does not count expected money as Finance Income', async t => {
  const f = await setup(t); const id = f.create('Long-term work', { workDate: addDays(today, -80), expectedPaymentDate: addDays(today, -4) });
  f.create('Current work', { fixedAmount: '200' }); f.pay(id, '350,25'); const app = await f.open();
  const expected = f.work.readOverview().totals;
  for (const [label, value] of [['Outstanding', expected.outstandingMinor], ['Earned', expected.earnedMinor], ['Received', expected.receivedMinor]] as const) {
    const metric = nodes(app, `work-metric-${label.toLowerCase()}`)[0]; assert.equal(metric.props.accessibilityLabel, `${label}, ${formatBrlAmount(value)}`);
    assert.ok(!app.nodes(metric).some(n => n.props?.accessibilityRole === 'button'));
  }
  assert.equal(expected.earnedMinor, 120000n); assert.equal(expected.receivedMinor, 35025n);
  assert.equal(f.finance.read().transactions.reduce((sum, row) => sum + row.amountMinor, 0), 35025);
  await app.press('Overview'); await app.press('Work'); assert.equal(nodes(app, 'work-metric-earned')[0].props.accessibilityLabel, 'Earned, R$ 1.200,00');
  assert.ok(app.container.textContent.includes('independent of the Overview period'));
});

test('attention and Jobs preserve dates, authoritative eligibility, ordering and archived-client debt', async t => {
  const f = await setup(t);
  const later = f.create('Later expected', { expectedPaymentDate: addDays(today, -1), workDate: addDays(today, -5) });
  const earlier = f.create('Earlier expected', { expectedPaymentDate: addDays(today, -3) });
  f.pay(later, '100'); f.create('Expected today', { expectedPaymentDate: today }); f.create('No expected date');
  f.create('Future expected', { expectedPaymentDate: addDays(today, 7) }); const paid = f.create('Fully received', { expectedPaymentDate: addDays(today, -20) }); f.pay(paid, '1000');
  f.work.archiveCounterparty(f.client.id); const source = f.work.readOverview(); const groups = groupWorkItems(source.items); const app = await f.open();
  assert.deepEqual(sections(app).find(s => s.key === 'attention')!.data.map(item => item.entry.id), [earlier, later]);
  assert.deepEqual(sections(app).find(s => s.key === 'jobs')!.data.map(item => item.entry.id), groups.outstanding.map(item => item.entry.id));
  assert.ok(nodes(app, 'work-attention')[0].textContent.includes('(2)')); assert.ok(!nodes(app, 'work-entry').some(n => n.textContent.includes('Fully received')));
  const partial = nodes(app, 'work-entry').find(n => String(n.props.accessibilityLabel).startsWith('Later expected,'))!;
  assert.ok(partial.textContent.includes(`Work ${dateLabel(addDays(today, -5))}`)); assert.ok(partial.textContent.includes(`Overdue · Expected ${dateLabel(addDays(today, -1))}`));
  assert.ok(partial.textContent.includes('Received R$ 100,00 of R$ 1.000,00')); assert.ok(partial.textContent.includes('R$ 900,00')); assert.ok(partial.textContent.includes('Archived client'));
});

test('main cards use one generic icon and genuine details navigation with contextual actions retained', async t => {
  const f = await setup(t); f.create('Translation'); f.create('Software'); const app = await f.open();
  for (const row of nodes(app, 'work-entry')) {
    assert.equal(row.props.accessibilityRole, 'button'); assert.ok(app.nodes(row).some(n => n.props?.testID === 'icon-briefcase'));
    assert.ok(app.nodes(row).some(n => n.props?.testID === 'icon-forward')); assert.equal(app.nodes(row).filter(n => n.props?.accessibilityRole === 'button').length, 0);
  }
  const row = nodes(app, 'work-entry').find(n => String(n.props.accessibilityLabel).startsWith('Software,'))!;
  await app.tapSet(String(row.props.accessibilityLabel)); assert.ok(app.container.textContent.includes('Job details'));
  assert.ok(app.find('FormButton', 'Edit Software')); await app.press('Work options for Software'); assert.ok(!app.nodes().some(n => n.kind === 'FormButton' && n.props.label === 'Edit')); assert.ok(app.find('FormButton', 'Client details')); assert.ok(app.find('FormButton', 'Delete'));
});

test('recording a partial payment refreshes the real summary, balance and attention without changing source ownership', async t => {
  const f = await setup(t); const id = f.create('Payable work', { expectedPaymentDate: addDays(today, -2) }); const app = await f.open();
  await app.press('Record payment');
  await act(() => (app.find('AutocompleteField', 'Client *').props.onSelect as (id: string) => void)(f.client.id));
  await app.tapSet('Allocate payment to Payable work'); await app.change('Allocation in reais for Payable work', '400'); await app.press('Confirm');
  assert.equal(f.work.readDetail(id).items[0].outstandingMinor, 60000); assert.equal(f.finance.read().transactions[0].type, 'income');
  assert.equal(nodes(app, 'work-metric-received')[0].props.accessibilityLabel, 'Received, R$ 400,00');
  assert.equal(nodes(app, 'work-metric-outstanding')[0].props.accessibilityLabel, 'Outstanding, R$ 600,00');
  assert.ok(nodes(app, 'work-entry')[0].textContent.includes('R$ 600,00'));
});

test('large totals remain exact, and long identities and doubled text retain complete names and dates', async t => {
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width: 320, height: 900, scale: 1, fontScale: 2 }));
  const f = await setup(t); const title = 'Complete unbroken work identity '.repeat(4).trim();
  f.create(title, { fixedAmount: formatBrlInput(maxAmountMinor), expectedPaymentDate: addDays(today, -1) }); f.create('Second maximum', { fixedAmount: formatBrlInput(maxAmountMinor) }); const app = await f.open();
  assert.equal(nodes(app, 'work-metric-earned')[0].props.accessibilityLabel, `Earned, ${formatBrlAmount(BigInt(maxAmountMinor) * 2n)}`);
  const row = nodes(app, 'work-entry').find(n => n.textContent.includes(title))!;
  for (const id of ['job-title', 'job-client']) assert.ok(app.nodes(row).filter(n => n.props?.testID === id).every(n => !n.props.numberOfLines && !n.props.maxFontSizeMultiplier));
  assert.ok(row.textContent.includes(formatBrlAmount(maxAmountMinor))); assert.equal(row.props.accessibilityHint, 'Job details and payments');
});

test('main Work has one bounded variable-height list, real IDs and no per-card detail reads', async t => {
  const f = await setup(t); for (let i = 0; i < 140; i++) f.create(`Work ${i}`, { expectedPaymentDate: i % 2 ? addDays(today, -1) : '' });
  const app = await f.open(); const props = main(app).props;
  assert.equal(app.nodes().filter(n => ['SectionList', 'FlatList'].includes(n.kind ?? '')).length, 1);
  assert.equal(props.initialNumToRender, 6); assert.equal(props.maxToRenderPerBatch, 6); assert.equal(props.windowSize, 5); assert.equal(props.getItemLayout, undefined);
  const items = sections(app).flatMap(s => s.data); assert.equal(items.length, 140);
  assert.equal(new Set(items.map(item => (props.keyExtractor as (item: WorkItem) => string)(item))).size, 140);
  assert.equal(runtime.fixture.reads.filter(read => read === 'work.readDetail').length, 0);
  assert.equal(props.contentInsetAdjustmentBehavior, 'never'); assert.ok(props.onScroll);
});

test('empty and fully received Work retain distinct guidance, primary creation and no false attention', async t => {
  const f = await setup(t); const app = await f.open(); assert.ok(app.container.textContent.includes('No work yet'));
  assert.equal(app.find('FormButton', 'Add work').props.variant, 'primary'); assert.equal(nodes(app, 'work-attention').length, 0);
  const id = f.create('Settled work'); f.pay(id, '1000'); await app.resume();
  assert.ok(!app.container.textContent.includes('No work yet')); assert.ok(app.container.textContent.includes('Nothing outstanding. Open History'));
  assert.equal(nodes(app, 'work-entry').length, 0); assert.equal(nodes(app, 'work-attention').length, 0);
  assert.ok(!app.nodes().some(n => n.props?.label === 'Record payment'));
});

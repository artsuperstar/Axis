/// <reference types="node" />
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { workDraft } from '../src/features/finance/work/form';
import type { WorkDraft, WorkPaymentDraft, WorkHistoryPage } from '../src/features/finance/work/types';
import { formatBrlAmount, formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { addDays, dateLabel, localDateString } from '../src/utils/calendar';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

type App = Awaited<ReturnType<typeof mount>>;
const today = localDateString(new Date());
const nodes = (app: App, id: string) => app.nodes().filter(n => n.props?.testID === id);
const jobs = (app: App) => nodes(app, 'work-entry'), receipts = (app: App) => nodes(app, 'work-receipt');
async function menu(app: App, trigger: string, action = 'Undo payment') { await app.press(trigger); await app.press(action); await act(async () => { await new Promise(r => setTimeout(r, 15)); }); }
function receiptMenu(app: App) { return String(app.nodes(receipts(app)[0]).find(n => n.kind === 'FormButton')!.props.accessibilityLabel); }
async function setup(t: TestContext) {
  const f = await journalDatabase(); t.after(() => f.sqlite.close()); f.setTime(today); const client = f.work.createCounterparty('Client');
  const create = (title = 'Saved job', changes: Partial<WorkDraft> = {}) => f.work.create({ ...workDraft(null, addDays(today, -8)), title, counterpartyId: client.id, compensationType: 'fixed', fixedAmount: '300', ...changes });
  const pay = (allocations: WorkPaymentDraft['allocations'], paymentDate = today, categoryId: string | null = null) => f.work.recordPayment({ counterpartyId: client.id, allocations, categoryId, paymentDate });
  async function open(failures: string[] = []) { const app = await mount(createElement(screens.WorkHistoryScreen), f.db, failures); t.after(app.unmount); return app; }
  return { ...f, client, create, pay, open };
}

test('History retains pushed navigation, one Jobs/Receipts list, original settled amount and one Paid label', async t => {
  const f = await setup(t), id = f.create('Settled'); f.pay([{ workEntryId: id, amount: '300' }]); f.create('Unpaid'); const app = await f.open();
  assert.equal(app.nodes().filter(n => n.kind === 'ScrollView').length, 0); assert.equal(jobs(app).length, 1); assert.equal(receipts(app).length, 1);
  const list = nodes(app, 'work-history-content')[0], sections = list.props.sections as { key: string }[]; assert.deepEqual(sections.map(x => x.key), ['jobs', 'receipts']);
  assert.equal(app.nodes().filter(n => n.kind === 'SegmentedControl').length, 0); assert.equal(nodes(app, 'history-job-status').length, 1);
  assert.equal(nodes(app, 'history-job-amount')[0].textContent, 'R$ 300,00Paid'); assert.ok(app.nodes(jobs(app)[0]).some(n => n.props?.testID === 'icon-briefcase'));
  assert.ok(!app.nodes(jobs(app)[0]).some(n => n.kind === 'FormButton')); assert.ok(app.nodes(receipts(app)[0]).some(n => n.props?.testID === 'icon-receipt'));
  await app.tapSet(String(jobs(app)[0].props.accessibilityLabel)); assert.ok(nodes(app, 'job-overview')[0].textContent.includes('Settled')); await app.press('Back');
  await app.press('Back to Work'); assert.equal(runtime.fixture.navigation.at(-1)!.method, 'back');
});

test('partial jobs stay outside Jobs while one shared receipt retains its full Income and allocation disclosure', async t => {
  const f = await setup(t), a = f.create('Job A', { fixedAmount: '100' }), b = f.create('Job B', { fixedAmount: '200' });
  f.pay([{ workEntryId: a, amount: '100' }, { workEntryId: b, amount: '80' }]); const app = await f.open();
  assert.equal(jobs(app).length, 1); assert.ok(jobs(app)[0].textContent.includes('Job A')); assert.equal(receipts(app).length, 1);
  assert.ok(receipts(app)[0].textContent.includes('R$ 180,00')); assert.ok(receipts(app)[0].textContent.includes('2 work entries'));
  const before = runtime.fixture.reads.length, body = app.nodes(receipts(app)[0]).find(n => n.kind === 'Pressable')!; assert.ok(String(body.props.accessibilityLabel).includes('2 work entries')); await app.tapSet(String(body.props.accessibilityLabel));
  assert.equal(runtime.fixture.reads.length, before); const details = nodes(app, 'history-receipt-allocations')[0]; assert.ok(details.textContent.includes('Job A · Received R$ 100,00')); assert.ok(details.textContent.includes('Job B · Received R$ 80,00'));
  assert.equal(f.finance.read().transactions.length, 1); assert.equal(f.context.read(today).incomeMinor, 18000n);
});

test('Work and Expected dates remain distinct from source actual receipt dates and ordering', async t => {
  const f = await setup(t), id = f.create('Dated job', { expectedPaymentDate: addDays(today, 4) });
  f.pay([{ workEntryId: id, amount: '100' }], addDays(today, -5)); f.pay([{ workEntryId: id, amount: '200' }], addDays(today, -2)); const app = await f.open();
  assert.ok(jobs(app)[0].textContent.includes(`Work ${dateLabel(addDays(today, -8))}`)); assert.ok(jobs(app)[0].textContent.includes(`Expected ${dateLabel(addDays(today, 4))}`));
  assert.ok(receipts(app)[0].textContent.includes(`Received ${dateLabel(addDays(today, -2))}`)); assert.ok(receipts(app)[1].textContent.includes(`Received ${dateLabel(addDays(today, -5))}`));
  assert.ok(String(jobs(app)[0].props.accessibilityLabel).includes(`Work ${dateLabel(addDays(today, -8))}`)); assert.ok(String(jobs(app)[0].props.accessibilityLabel).includes(`Expected ${dateLabel(addDays(today, 4))}`));
  assert.ok(String(app.nodes(receipts(app)[0]).find(n => n.kind === 'Pressable')!.props.accessibilityLabel).includes(`Received ${dateLabel(addDays(today, -2))}`));
  assert.equal(nodes(app, 'history-job-status').length, 1); assert.equal(f.work.readHistory().settledCount, 1);
});

test('Hourly settled earned amount and source zero-earned eligibility are preserved without fabricating receipts', async t => {
  const f = await setup(t), hourly = f.create('Hourly', { compensationType: 'hourly', hours: '2', minutes: '30', hourlyRate: '50' }); f.pay([{ workEntryId: hourly, amount: '125' }]);
  f.create('Below centavo', { compensationType: 'hourly', hours: '0', minutes: '1', hourlyRate: '0,01' }); const app = await f.open();
  assert.equal(jobs(app).length, 2); assert.equal(receipts(app).length, 1); assert.ok(nodes(app, 'history-job-amount').some(n => n.textContent === 'R$ 0,00Paid'));
  const row = jobs(app).find(n => n.textContent.includes('Hourly'))!; assert.ok(row.textContent.includes('R$ 125,00'));
  await app.tapSet(String(row.props.accessibilityLabel)); assert.ok(nodes(app, 'job-compensation-metrics')[0].textContent.includes('Hourly2h 30m × R$ 50,00/hour'));
});

test('archived client/category names remain historical and no-category receipts omit invented category metadata', async t => {
  const f = await setup(t), category = f.finance.createCategory('Saved Income', 'income'), a = f.create('Category'), b = f.create('No category');
  f.pay([{ workEntryId: a, amount: '300' }], today, category.id); f.pay([{ workEntryId: b, amount: '300' }]); f.finance.deleteCategory(category.id); f.work.archiveCounterparty(f.client.id);
  const app = await f.open(); assert.ok(receipts(app).some(n => n.textContent.includes('Saved Income'))); assert.ok(jobs(app).every(n => n.textContent.includes('Archived client')));
  assert.ok(jobs(app).every(n => String(n.props.accessibilityLabel).includes('Archived client')));
  const spoken = receipts(app).map(n => String(app.nodes(n).find(child => child.kind === 'Pressable')!.props.accessibilityLabel)); assert.ok(spoken.every(label => label.includes('Archived client') && label.includes('1 work entry'))); assert.ok(spoken.some(label => label.includes('Saved Income'))); assert.ok(spoken.every(label => !label.includes('No category')));
  assert.ok(!receipts(app).some(n => n.textContent.includes('No category'))); assert.equal(f.finance.read().transactions.length, 2);
});

test('whole-receipt Undo confirmation cancels safely and atomically restores both jobs and actual Income', async t => {
  const f = await setup(t), a = f.create('A', { fixedAmount: '100' }), b = f.create('B', { fixedAmount: '80' }); f.pay([{ workEntryId: a, amount: '100' }, { workEntryId: b, amount: '80' }]);
  const app = await f.open(); await menu(app, receiptMenu(app)); assert.ok(runtime.fixture.alerts.at(-1)!.message.includes('2 work entries')); await app.confirm('Cancel'); assert.equal(receipts(app).length, 1);
  await menu(app, receiptMenu(app)); await app.confirm('Confirm'); assert.equal(receipts(app).length, 0); assert.equal(jobs(app).length, 0);
  assert.equal(f.finance.read().transactions.length, 0); assert.equal(f.context.read(today).incomeMinor, 0n); assert.equal(f.work.readOverview().totals.outstandingMinor, 18000n);
});

test('stale Undo rejection surfaces source error and never creates a second reversal', async t => {
  const f = await setup(t), id = f.create(), payment = f.pay([{ workEntryId: id, amount: '300' }]), app = await f.open(); await menu(app, receiptMenu(app)); f.work.undoPayment(payment); await app.confirm('Confirm');
  assert.ok(app.nodes().some(n => n.kind === 'FormError' && n.textContent.includes('no longer available'))); assert.equal(f.finance.read().transactions.length, 0); assert.equal(f.work.readOverview().totals.outstandingMinor, 30000n);
});

test('failed Undo rolls allocations and Income back together and preserves the history for retry', async t => {
  const f = await setup(t), id = f.create(); f.pay([{ workEntryId: id, amount: '300' }]); const app = await f.open();
  f.sqlite.exec("CREATE TRIGGER history_fail_undo BEFORE UPDATE OF deleted_at ON finance_transactions BEGIN SELECT RAISE(ABORT, 'forced undo failure'); END;");
  await menu(app, receiptMenu(app)); await app.confirm('Confirm'); assert.equal(f.finance.read().transactions.length, 1); assert.equal(f.work.readOverview().totals.outstandingMinor, 0n); assert.equal(receipts(app).length, 1);
  f.sqlite.exec('DROP TRIGGER history_fail_undo'); await menu(app, receiptMenu(app)); await app.confirm('Confirm'); assert.equal(receipts(app).length, 0);
});

test('paging retains authoritative counts, append order, typed stable IDs, last-good disclosure and no row reads', async t => {
  const f = await setup(t); for (let i = 0; i < 45; i++) { const id = f.create(`Job ${i}`, { fixedAmount: '1' }); f.pay([{ workEntryId: id, amount: '1' }]); }
  const app = await f.open(); assert.equal(jobs(app).length, 20); assert.ok(app.container.textContent.includes('Jobs (45)')); assert.ok(app.container.textContent.includes('Showing 20 of 45'));
  const list = nodes(app, 'work-history-content')[0]; assert.equal(list.props.initialNumToRender, 8); assert.equal(list.props.windowSize, 5);
  const receipt = receipts(app)[0], body = app.nodes(receipt).find(n => n.kind === 'Pressable')!, reads = runtime.fixture.reads.length; await app.tapSet(String(body.props.accessibilityLabel)); assert.equal(runtime.fixture.reads.length, reads);
  runtime.fixture.failures.add('work.readHistory'); await app.press('Load more history'); assert.equal(receipts(app).length, 20); assert.ok(nodes(app, 'history-receipt-allocations').length);
  runtime.fixture.failures.clear(); await app.press('Load more history'); await app.press('Load more history'); assert.equal(jobs(app).length, 45); assert.equal(receipts(app).length, 45);
  const sections = nodes(app, 'work-history-content')[0].props.sections as { data: unknown[] }[]; const keys = sections.flatMap(s => s.data.map(list.props.keyExtractor as (row: unknown) => string)); assert.equal(new Set(keys).size, 90);
  assert.ok(!app.nodes().some(n => n.kind === 'FormButton' && n.props.label === 'Load more history')); await app.refocus(); assert.equal(receipts(app).length, 45);
});

test('initial failure/Retry distinguishes unknown counts from empty Jobs and Receipts', async t => {
  const f = await setup(t), app = await f.open(['work.readHistory']); assert.ok(app.container.textContent.includes('Jobs (…)')); assert.ok(!app.container.textContent.includes('No settled work yet.'));
  runtime.fixture.failures.clear(); await app.press('Retry history'); assert.ok(app.container.textContent.includes('Jobs (0)')); assert.ok(app.container.textContent.includes('No settled work yet.')); assert.ok(app.container.textContent.includes('No receipts yet.'));
});

test('client-filtered History reuses one shared sheet body with correct source client and no nested scroll', async t => {
  const f = await setup(t), id = f.create(); f.pay([{ workEntryId: id, amount: '300' }]); const other = f.work.createCounterparty('Other');
  const app = await mount(createElement(screens.WorkClientsScreen), f.db); t.after(app.unmount); await app.press('Client options for Client'); await app.press('History'); await act(async () => { await new Promise(r => setTimeout(r, 15)); });
  assert.equal(nodes(app, 'work-history-content').length, 1); assert.equal(jobs(app).length, 1); assert.equal(receipts(app).length, 1); assert.ok(!receipts(app).some(n => n.textContent.includes(other.name)));
  assert.equal(app.nodes().filter(n => n.kind === 'Modal').length, 1); assert.equal(f.work.readHistory(20, undefined, f.client.id).paymentCount, 1);
});

for (const width of [320,390,430]) for (const fontScale of [1,2]) test(`${width}/${fontScale} full titles and maximum BRL history remain labeled and exact`, async t => {
  t.mock.method(runtime.native as { useWindowDimensions: () => object }, 'useWindowDimensions', () => ({ width, height: 844, scale: 1, fontScale }));
  const f = await setup(t), title = 'Longunbrokenjobidentity'.repeat(5), id = f.create(title, { fixedAmount: formatBrlInput(maxAmountMinor) }); f.pay([{ workEntryId: id, amount: formatBrlInput(maxAmountMinor) }]);
  const app = await f.open(); assert.ok(jobs(app)[0].textContent.includes(title)); assert.ok(receipts(app)[0].textContent.includes(formatBrlAmount(maxAmountMinor)));
  assert.equal(nodes(app, 'history-job-status').length, 1); assert.ok(nodes(app, 'history-money-group').some(n => n.textContent === '409,91'));
  assert.deepEqual((f.work.readHistory() as WorkHistoryPage).items.map(x => x.entry.id), [id]);
});

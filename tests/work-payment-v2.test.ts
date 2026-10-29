/// <reference types="node" />
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { workDraft } from '../src/features/finance/work/form';
import { formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { addDays, localDateString } from '../src/utils/calendar';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const today = localDateString(new Date());
type App = Awaited<ReturnType<typeof mount>>;
async function setup(t: TestContext) {
  t.mock.method((runtime.native as { AccessibilityInfo: { isReduceMotionEnabled: () => Promise<boolean> } }).AccessibilityInfo, 'isReduceMotionEnabled', () => Promise.resolve(true));
  const f = await journalDatabase(); f.setTime(today); t.after(() => f.sqlite.close());
  const client = f.work.createCounterparty('Independent studio'), other = f.work.createCounterparty('Other studio');
  const create = (title: string, amount = '1000', party = client.id) => f.work.create({ ...workDraft(null, today), title, counterpartyId: party, compensationType: 'fixed', fixedAmount: amount });
  const first = create('Stocktake'), second = create('Handover', '180'); create('Other client job', '100', other.id);
  async function open() { const app = await mount(createElement(screens.FinanceScreen, { initialView: 'work' }), f.db); t.after(app.unmount); await app.press('Record payment'); return app; }
  return { ...f, client, other, first, second, create, open };
}
async function select(app: App, id: string) { await act(() => (app.find('AutocompleteField', 'Client *').props.onSelect as (id: string) => void)(id)); }
const total = (app: App) => app.nodes().find(n => n.props?.testID === 'work-payment-total')!.textContent;

test('v2 client-first payment keeps one modal, empty guidance, disabled Confirm and bounded stable-ID allocation list', async t => {
  const f = await setup(t), app = await f.open();
  assert.equal(app.find('FormButton', 'Confirm').props.disabled, true);
  assert.equal(app.find('AutocompleteField', 'Client *').props.appearance, 'v2');
  assert.equal(app.nodes().filter(n => n.kind === 'Modal').length, 1);
  assert.ok(app.container.textContent.includes('Choose a client to see outstanding work.'));
  await select(app, f.client.id);
  const list = app.nodes().find(n => n.props?.testID === 'work-payment-list')!;
  const data = list.props.data as { entry: { id: string } }[];
  assert.equal(data.length, 2); assert.equal(list.props.initialNumToRender, 6); assert.equal(list.props.windowSize, 5);
  assert.deepEqual(data.map(list.props.keyExtractor as (x: typeof data[number]) => string).sort(), [f.first, f.second].sort());
  assert.ok(!app.nodes(list).some(n => n.props?.accessibilityLabel === 'Allocate payment to Other client job')); assert.equal(f.finance.read().transactions.length, 0);
  await app.press('Cancel'); assert.equal(f.finance.read().transactions.length, 0);
});

test('multiple independent partial/full allocations derive exact total and persist one linked Income; repeated Confirm writes once', async t => {
  const f = await setup(t); f.work.recordPayment({ counterpartyId: f.client.id, categoryId: null, paymentDate: today, allocations: [{ workEntryId: f.first, amount: '100' }] });
  const app = await f.open(); await select(app, f.client.id); await app.tapSet('Allocate payment to Stocktake');
  assert.equal(app.find('FormField', 'Allocation in reais for Stocktake').props.value, '900,00');
  await app.change('Allocation in reais for Stocktake', '12,34'); await app.tapSet('Allocate payment to Handover');
  assert.ok(total(app).includes('Payment total: R$ 192,34')); assert.ok(total(app).includes('Remaining after payment R$ 887,66'));
  const confirm = app.find('FormButton', 'Confirm').props.onPress as () => void; await act(() => { confirm(); confirm(); });
  const detail = f.work.readDetail(f.first), receipt = detail.payments.find(p => p.transaction.amountMinor === 19234)!;
  assert.equal(f.finance.read().transactions.length, 2); assert.equal(receipt.allocations.length, 2);
  assert.equal(receipt.allocations.reduce((sum, row) => sum + row.amountMinor, 0), 19234);
  assert.equal(f.work.readDetail(f.first).items[0].outstandingMinor, 88766); assert.equal(f.work.readDetail(f.second).items[0].outstandingMinor, 0);
  assert.equal(f.work.readOverview().totals.earnedMinor, 128000n);
});

test('invalid and excessive selected amounts show adjacent source feedback and no misleading total, then recover without losing other allocations', async t => {
  const f = await setup(t), app = await f.open(); await select(app, f.client.id); await app.tapSet('Allocate payment to Stocktake'); await app.tapSet('Allocate payment to Handover');
  await app.change('Allocation in reais for Handover', '25,12');
  for (const value of ['', '0', '-1', 'invalid', '1000,01']) {
    await app.change('Allocation in reais for Stocktake', value);
    assert.ok(app.find('FormField', 'Allocation in reais for Stocktake').props.error);
    assert.ok(total(app).includes('Select work and enter valid amounts')); assert.ok(!total(app).includes('Remaining after payment'));
    assert.equal(app.find('FormField', 'Allocation in reais for Handover').props.value, '25,12');
  }
  await app.press('Confirm'); assert.ok(app.find('FormError').textContent); assert.equal(f.finance.read().transactions.length, 0);
  await app.change('Allocation in reais for Stocktake', '1,01'); assert.ok(total(app).includes('R$ 26,13'));
  await app.press('Confirm'); assert.equal(f.finance.read().transactions[0].amountMinor, 2613);
});

test('changing client clears incompatible allocations while retaining actual date and active Income category, including inline creation', async t => {
  const native = runtime.native as { Platform: { OS: string } }; t.mock.property(native.Platform, 'OS', 'web');
  const f = await setup(t), archived = f.finance.createCategory('Archived income', 'income'); f.finance.deleteCategory(archived.id);
  const app = await f.open(); await select(app, f.client.id); await app.tapSet('Allocate payment to Stocktake'); await app.change('Allocation in reais for Stocktake', '100');
  await app.change('Payment date *', addDays(today, -1));
  const category = app.find('SelectField', 'Income category');
  const options = category.props.options as { value: string | null; label: string }[];
  assert.deepEqual(options[0], { value: null, label: 'No category' }); assert.ok(!options.some(x => x.value === archived.id));
  assert.ok(options.every(x => x.value === null || f.finance.read().categories.some(c => c.id === x.value && c.type === 'income' && c.deletedAt === null)));
  const action = category.props.action as { render: (x: { onComplete: () => void; onCancel: () => void }) => { props: { onSubmit: (name: string, done: () => void) => void } } };
  await act(() => action.render({ onComplete() {}, onCancel() {} }).props.onSubmit('Consulting receipts', () => {}));
  const categoryId = app.find('SelectField', 'Income category').props.value;
  assert.ok(categoryId); assert.equal(app.find('FormField', 'Allocation in reais for Stocktake').props.value, '100');
  await select(app, f.other.id); assert.ok(!app.nodes().some(n => n.props?.accessibilityLabel === 'Allocation in reais for Stocktake'));
  assert.equal(app.find('FormButton', 'Confirm').props.disabled, true); assert.equal(app.find('FormField', 'Payment date *').props.value, addDays(today, -1));
  assert.equal(app.find('SelectField', 'Income category').props.value, categoryId);
  await app.tapSet('Allocate payment to Other client job'); await app.press('Confirm');
  assert.equal(f.finance.read().transactions[0].categoryId, categoryId); assert.equal(f.finance.read().transactions[0].transactionDate, addDays(today, -1));
});

test('failed atomic persistence keeps mounted amount and draft; retry restores guard and writes exactly once', async t => {
  t.mock.method(console, 'error', () => {});
  const f = await setup(t), app = await f.open(); await select(app, f.client.id); await app.tapSet('Allocate payment to Stocktake'); await app.change('Allocation in reais for Stocktake', '15,99');
  const input = app.find('FormField', 'Allocation in reais for Stocktake');
  f.sqlite.exec("CREATE TRIGGER payment_v2_failure BEFORE INSERT ON work_payment_allocations BEGIN SELECT RAISE(ABORT, 'Injected allocation failure'); END");
  await app.press('Confirm'); assert.ok(app.find('FormError').textContent); assert.equal(app.find('FormField', 'Allocation in reais for Stocktake'), input);
  assert.equal(input.props.value, '15,99'); assert.equal(app.find('FormButton', 'Confirm').props.busy, false); assert.equal(f.finance.read().transactions.length, 0);
  assert.equal(f.work.readDetail(f.first).items[0].receivedMinor, 0);
  f.sqlite.exec('DROP TRIGGER payment_v2_failure'); await app.press('Confirm'); assert.equal(f.finance.read().transactions.length, 1); assert.equal(f.work.readDetail(f.first).items[0].receivedMinor, 1599);
});

test('source rejects stale outstanding balances and future actual dates while retaining the payment draft', async t => {
  const native = runtime.native as { Platform: { OS: string } }; t.mock.property(native.Platform, 'OS', 'web');
  const f = await setup(t), app = await f.open(); await select(app, f.client.id); await app.tapSet('Allocate payment to Stocktake');
  f.work.recordPayment({ counterpartyId: f.client.id, categoryId: null, paymentDate: today, allocations: [{ workEntryId: f.first, amount: '900' }] });
  await app.press('Confirm'); assert.match(app.find('FormError').textContent, /outstanding/i); assert.equal(app.find('FormField', 'Allocation in reais for Stocktake').props.value, formatBrlInput(100000));
  await app.change('Allocation in reais for Stocktake', '50'); await app.change('Payment date *', addDays(today, 1)); await app.press('Confirm');
  assert.ok(app.find('FormError').textContent); assert.equal(f.finance.read().transactions.length, 1);
  await app.change('Payment date *', today); await app.press('Confirm'); assert.equal(f.finance.read().transactions.length, 2);
});

test('archived client debt remains selectable; settled work is ineligible and large allocation totals retain exact centavos', async t => {
  const f = await setup(t); f.work.recordPayment({ counterpartyId: f.client.id, categoryId: null, paymentDate: today, allocations: [{ workEntryId: f.first, amount: '1000' }, { workEntryId: f.second, amount: '180' }] });
  f.create('Maximum balance', formatBrlInput(maxAmountMinor)); f.work.archiveCounterparty(f.client.id);
  const app = await f.open(), picker = app.find('AutocompleteField', 'Client *');
  const results = (picker.props.getResults as (s: string) => { suggestions: { value: string; label: string }[] })('Independent');
  assert.ok(JSON.stringify(results).includes('(archived)')); await select(app, f.client.id);
  assert.ok(!app.container.textContent.includes('Allocate payment to Stocktake')); await app.tapSet('Allocate payment to Maximum balance');
  assert.equal(app.find('FormField', 'Allocation in reais for Maximum balance').props.value, formatBrlInput(maxAmountMinor));
  await app.press('Confirm'); assert.equal(f.finance.read().transactions.find(x => x.amountMinor === maxAmountMinor)!.amountMinor, maxAmountMinor);
});

test('large outstanding collections keep selection outside cells, use bounded list settings and do not read details per allocation', async t => {
  const f = await setup(t); for (let i = 0; i < 110; i++) f.create(`Archive work ${i}`, '1');
  const app = await f.open(), before = runtime.fixture.reads.length; await select(app, f.client.id);
  const list = app.nodes().find(n => n.props?.testID === 'work-payment-list')!; assert.equal((list.props.data as unknown[]).length, 112);
  await app.tapSet('Allocate payment to Archive work 109'); await app.change('Allocation in reais for Archive work 109', '0,25');
  await app.tapSet('Allocate payment to Stocktake'); assert.equal(app.find('FormField', 'Allocation in reais for Archive work 109').props.value, '0,25');
  assert.equal(runtime.fixture.reads.length, before); assert.equal(list.props.maxToRenderPerBatch, 6); assert.equal(list.props.removeClippedSubviews, false);
});

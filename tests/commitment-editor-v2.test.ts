/// <reference types="node" />
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import type { CommitmentKind } from '../src/features/finance/commitments/types';
import { formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { addDays, localDateString, pickerValue } from '../src/utils/calendar';

const today = localDateString(new Date());
type App = Awaited<ReturnType<typeof mount>>;
async function setup(t: TestContext, web = true) {
  t.mock.method((runtime.native as { AccessibilityInfo: { isReduceMotionEnabled: () => Promise<boolean> } }).AccessibilityInfo, 'isReduceMotionEnabled', () => Promise.resolve(true));
  const native = runtime.native as { Platform: { OS: string } }; const previous = native.Platform.OS;
  native.Platform.OS = web ? 'web' : 'android'; t.after(() => { native.Platform.OS = previous; });
  const f = await journalDatabase(); f.setTime(today); t.after(() => f.sqlite.close());
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments' }), f.db); t.after(app.unmount);
  return { ...f, app };
}
async function type(app: App, kind: CommitmentKind) { await act(() => (app.find('SegmentedControl', 'Type *').props.onChange as (value: string) => void)(kind)); }
async function edit(app: App, title: string) {
  await app.press('Commitment options'); await app.press('Manage commitments');
  await act(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); });
  await app.press(`Series options for ${title}`); await app.press(`Edit ${title}`);
  await act(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); });
}

for (const kind of ['bill', 'subscription', 'installment'] as const) test(`new ${kind} uses three vertical sections and saves a future planned obligation without a ledger expense`, async t => {
  const f = await setup(t); await f.app.press('Add commitment');
  assert.equal(f.app.find('SegmentedControl', 'Type *').props.value, 'bill'); await type(f.app, kind);
  const sections = f.app.nodes().filter(n => String(n.props?.testID).startsWith('editor-section-'));
  assert.deepEqual(sections.map(n => n.props.testID), ['editor-section-commitment', 'editor-section-schedule', 'editor-section-details']);
  for (const label of ['Title *', kind === 'installment' ? 'Installment amount *' : 'Expected amount *', 'First due date *']) assert.equal(f.app.find('FormField', label).props.appearance, 'v2');
  assert.equal(f.app.find('SelectField', 'Category').props.appearance, 'v2');
  assert.ok(!f.app.nodes().some(n => n.props?.label === 'Note'));
  await f.app.change('Title *', `Future ${kind}`); await f.app.change(kind === 'installment' ? 'Installment amount *' : 'Expected amount *', '180,20');
  await f.app.change('First due date *', addDays(today, 40));
  if (kind === 'installment') await f.app.change('Number of installments *', '12');
  await f.app.press('Save');
  const saved = f.commitments.read().items[0]; assert.equal(saved.commitment.kind, kind); assert.equal(saved.commitment.expectedAmountMinor, 18020);
  assert.equal(saved.schedule.startDate, addDays(today, 40)); assert.equal(saved.commitment.installmentCount, kind === 'installment' ? 12 : null);
  assert.equal(f.finance.read().transactions.length, 0); assert.ok(!f.app.nodes().some(n => n.props?.label === 'Save'));
});

test('type switches preserve unrelated draft values and normalize hidden installment count', async t => {
  const f = await setup(t); const category = f.finance.createCategory('Household custom', 'expense'); await f.app.resume();
  await f.app.press('Add commitment'); await f.app.change('Title *', '  Shared   draft '); await f.app.change('Expected amount *', '25,90');
  await act(() => (f.app.find('SelectField', 'Category').props.onChange as (id: string) => void)(category.id));
  await type(f.app, 'installment'); await f.app.change('Number of installments *', '5'); await type(f.app, 'subscription'); await type(f.app, 'installment');
  assert.equal(f.app.find('FormField', 'Number of installments *').props.value, '5');
  assert.equal(f.app.find('FormField', 'Title *').props.value, '  Shared   draft ');
  assert.equal(f.app.find('FormField', 'Installment amount *').props.value, '25,90'); assert.equal(f.app.find('SelectField', 'Category').props.value, category.id);
  await type(f.app, 'bill'); await f.app.press('Save'); const saved = f.commitments.read().items[0].commitment;
  assert.equal(saved.title, 'Shared draft'); assert.equal(saved.installmentCount, null); assert.equal(saved.categoryId, category.id);
});

test('inline category creation selects the saved Expense category while retaining the parent draft', async t => {
  const f = await setup(t); await f.app.press('Add commitment'); await f.app.change('Title *', 'Category draft'); await f.app.change('Expected amount *', '80');
  const action = f.app.find('SelectField', 'Category').props.action as { render: (controls: object) => { props: { appearance: string; onSubmit: (name: string, complete: () => void) => void } } };
  const inline = action.render({}); let completed = false; assert.equal(inline.props.appearance, 'v2');
  await act(() => inline.props.onSubmit('Commitment custom category', () => { completed = true; }));
  assert.ok(completed); assert.equal(f.app.find('FormField', 'Title *').props.value, 'Category draft');
  const category = f.finance.readCategories().find(c => c.name === 'Commitment custom category')!;
  assert.equal(category.type, 'expense'); assert.equal(f.app.find('SelectField', 'Category').props.value, category.id);
  await f.app.press('Save'); assert.equal(f.commitments.read().items[0].commitment.categoryId, category.id); assert.equal(f.finance.read().transactions.length, 0);
});

test('required fields, invalid money/date/count and failed writes retain the draft and allow exact large-value retry', async t => {
  const f = await setup(t); await f.app.press('Add commitment'); await f.app.press('Save');
  assert.ok(f.app.container.textContent.includes('Enter a commitment title.')); await f.app.change('Title *', 'Validation draft');
  for (const amount of ['0', '-1', 'abc']) { await f.app.change('Expected amount *', amount); await f.app.press('Save'); assert.ok(f.app.find('FormError')); }
  await f.app.change('Expected amount *', formatBrlInput(maxAmountMinor)); await f.app.change('First due date *', '2026-02-30'); await f.app.press('Save');
  assert.ok(f.app.container.textContent.includes('Choose a valid first due date.')); await f.app.change('First due date *', addDays(today, 20));
  await type(f.app, 'installment'); for (const count of ['0', '1201']) { await f.app.change('Number of installments *', count); await f.app.press('Save'); assert.ok(f.app.container.textContent.includes('Enter 1 through 1200 installments.')); }
  await f.app.change('Number of installments *', '1200');
  f.sqlite.exec("CREATE TRIGGER editor_failure BEFORE INSERT ON finance_commitments BEGIN SELECT RAISE(ABORT, 'Injected write failure'); END");
  await f.app.press('Save'); assert.equal(f.app.find('FormField', 'Title *').props.value, 'Validation draft');
  assert.ok(f.app.find('FormButton', 'Save')); assert.equal(f.finance.read().transactions.length, 0);
  f.sqlite.exec('DROP TRIGGER editor_failure'); await f.app.press('Save');
  assert.equal(f.commitments.read().items[0].commitment.expectedAmountMinor, maxAmountMinor);
});

test('Edit prepopulates archived category and locks type/count/anchor while retaining paid history', async t => {
  const f = await setup(t); const category = f.finance.createCategory('Archived historical category', 'expense');
  const id = f.commitments.create({ ...commitmentDraft(null, undefined, today), kind: 'installment', title: 'Historical plan', amount: '180', installmentCount: '5', categoryId: category.id });
  const occurrence = f.commitments.readHistory(id).outstanding[0]; f.commitments.pay(occurrence, '175', today); f.finance.deleteCategory(category.id); await f.app.resume();
  await edit(f.app, 'Historical plan');
  assert.equal(f.app.find('SegmentedControl', 'Type *').props.disabled, true); assert.equal(f.app.find('FormField', 'Number of installments *').props.editable, false);
  assert.ok(!f.app.nodes().some(n => n.props?.label === 'First due date *')); assert.ok(f.app.container.textContent.includes('Schedule anchor:'));
  assert.equal(f.app.find('SelectField', 'Category').props.displayValue, 'Archived historical category (archived)');
  await f.app.change('Title *', 'Updated plan'); await f.app.change('Installment amount *', '200'); await f.app.press('Save');
  const saved = f.commitments.readHistory(id); assert.equal(saved.commitment.title, 'Updated plan'); assert.equal(saved.history[0].payment!.amountMinor, 17500);
  assert.equal(saved.history[0].occurrence.expectedAmountMinor, 18000); assert.equal(f.finance.read().transactions.length, 1);
});

test('future native due picker has no transaction maximum; Cancel discards without writes and duplicate Save is guarded', async t => {
  const f = await setup(t, false); await f.app.press('Add commitment'); await act(() => (f.app.find('FormSelect', 'First due date *').props.onPress as () => void)());
  const picker = runtime.fixture.pickers[0]; assert.equal(picker.maximumDate, undefined); assert.equal(picker.minimumDate, undefined);
  const future = addDays(today, 80); await act(() => (picker.onValueChange as (event: object, date: Date) => void)({}, pickerValue(future)));
  await f.app.change('Title *', 'Cancelled draft'); await f.app.press('Cancel'); assert.equal(f.commitments.read().items.length, 0);
  await f.app.press('Add commitment'); assert.equal(f.app.find('FormField', 'Title *').props.value, '');
  await f.app.change('Title *', 'One save'); await f.app.change('Expected amount *', '25');
  const save = f.app.find('FormButton', 'Save').props.onPress as () => void; await act(() => { save(); save(); }); assert.equal(f.commitments.read().items.length, 1);
});

test('narrow enlarged editor retains shared sheet scrolling, stacked type choices, complete amount and growing title', async t => {
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width: 320, height: 650, fontScale: 2, scale: 1 }));
  const f = await setup(t); await f.app.press('Add commitment'); assert.equal(f.app.find('SegmentedControl', 'Type *').props.stacked, true);
  const title = f.app.find('FormField', 'Title *'); assert.equal(title.props.multiline, true); assert.equal(title.props.scrollEnabled, false);
  await f.app.change('Expected amount *', formatBrlInput(maxAmountMinor));
  const full = f.app.nodes().find(n => n.props?.testID === 'commitment-editor-full-amount')!; assert.equal(full.textContent, formatBrlInput(maxAmountMinor)); assert.equal(full.props.numberOfLines, undefined);
  const scroll = f.app.find('ScrollView'); assert.equal(scroll.props.keyboardShouldPersistTaps, 'handled'); assert.equal(scroll.props.automaticallyAdjustKeyboardInsets, false);
  assert.ok(f.app.find('FormButton', 'Cancel')); assert.ok(f.app.find('FormButton', 'Save'));
});

/// <reference types="node" />
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import type { CommitmentDraft } from '../src/features/finance/commitments/types';
import { formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { addDays, dateLabel, localDateString, pickerValue } from '../src/utils/calendar';
import { periodBounds } from '../src/features/finance/periods';

const require = createRequire(import.meta.url);
const { CommitmentModal, CommitmentPayment } = require('../src/features/finance/commitments/components/commitment-forms') as typeof import('../src/features/finance/commitments/components/commitment-forms');
const { UiButton } = require('../src/components/design-system') as typeof import('../src/components/design-system');
const today = localDateString(new Date());
async function setup(t: TestContext, changes: Partial<CommitmentDraft> = {}, web = true) {
  t.mock.method((runtime.native as { AccessibilityInfo: { isReduceMotionEnabled: () => Promise<boolean> } }).AccessibilityInfo, 'isReduceMotionEnabled', () => Promise.resolve(true));
  const native = runtime.native as { Platform: { OS: string } }; const previous = native.Platform.OS; native.Platform.OS = web ? 'web' : 'android'; t.after(() => { native.Platform.OS = previous; });
  const f = await journalDatabase(); f.setTime(today); t.after(() => f.sqlite.close());
  const id = f.commitments.create({ ...commitmentDraft(null, undefined, today), title: 'Same merchant title', amount: '180,20', ...changes });
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments' }), f.db); t.after(app.unmount);
  const due = changes.firstDueDate ?? today;
  async function open() { await app.press(`Pay Same merchant title, due ${dateLabel(due)}`); }
  return { ...f, id, app, open, due };
}

for (const [kind, icon] of [['bill', 'receipt'], ['subscription', 'repeat'], ['installment', 'layers']] as const) test(`${kind} payment has a read-only type-based summary and independent actual amount/date defaults`, async t => {
  const f = await setup(t, { kind, installmentCount: kind === 'installment' ? '10' : '' }); await f.open();
  const summary = f.app.nodes().find(n => n.props?.testID === 'commitment-payment-summary')!;
  assert.ok(f.app.nodes(summary).some(n => n.props?.testID === `icon-${icon}`));
  assert.ok(!f.app.nodes(summary).some(n => n.kind === 'Pressable' || n.kind === 'FormField' || n.kind === 'FormButton'));
  assert.ok(summary.props.accessible); assert.ok(String(summary.props.accessibilityLabel).includes('Expected amount R$ 180,20'));
  assert.ok(summary.textContent.includes(`Due ${dateLabel(f.due)}`)); assert.ok(summary.textContent.includes('Expense category · No category'));
  assert.equal(f.app.find('FormField', 'Actual amount paid *').props.value, '180,20'); assert.equal(f.app.find('FormField', 'Payment date *').props.value, today);
  assert.equal(f.app.find('FormField', 'Actual amount paid *').props.appearance, 'v2'); assert.equal(f.finance.read().transactions.length, 0);
});

test('early payment records actual amount/date, retains expected amount/category and completes/reverses the final installment', async t => {
  const f = await setup(t, { kind: 'installment', installmentCount: '1', firstDueDate: addDays(today, 30) });
  const category = f.finance.createCategory('Historical expense category', 'expense'); const item = f.commitments.read().items[0];
  f.commitments.edit(f.id, { ...commitmentDraft(item.commitment, item.schedule), categoryId: category.id }); f.finance.deleteCategory(category.id); await f.app.resume(); await f.open();
  assert.ok(f.app.container.textContent.includes('Expense category · Historical expense category'));
  const actualDate = addDays(today, -2); await f.app.change('Actual amount paid *', '12,34'); await f.app.change('Payment date *', actualDate); await f.app.press('Confirm');
  const payment = f.finance.read().transactions[0]; assert.equal(payment.amountMinor, 1234); assert.equal(payment.transactionDate, actualDate); assert.equal(payment.description, 'Same merchant title'); assert.equal(payment.categoryId, category.id);
  const history = f.commitments.readHistory(f.id); assert.equal(history.commitment.status, 'completed'); assert.equal(history.history[0].occurrence.expectedAmountMinor, 18020); assert.equal(history.history[0].occurrence.dueDate, f.due); assert.equal(history.history[0].occurrence.paidTransactionId, payment.id);
  assert.equal(f.finance.readDashboard(periodBounds('month', actualDate)).analytics.expensesMinor, 1234n);
  f.commitments.deletePayment(payment.id, { commitmentId: f.id, dueDate: f.due }); await f.app.resume(); assert.equal(f.finance.read().transactions.length, 0); assert.equal(f.commitments.read().items[0].upcoming!.status, 'pending');
});

test('invalid amount and future/malformed dates show adjacent errors, retain input and never write', async t => {
  const f = await setup(t); await f.open();
  for (const value of ['0', '-1', 'abc', '1,001']) { await f.app.change('Actual amount paid *', value); await f.app.press('Confirm'); assert.ok(f.app.find('FormField', 'Actual amount paid *').props.error); assert.equal(f.app.find('FormField', 'Actual amount paid *').props.value, value); }
  await f.app.change('Actual amount paid *', '25,90');
  for (const date of [addDays(today, 1), '2026-02-30']) { await f.app.change('Payment date *', date); await f.app.press('Confirm'); assert.ok(f.app.find('FormField', 'Payment date *').props.error); assert.equal(f.app.find('FormField', 'Actual amount paid *').props.value, '25,90'); }
  assert.equal(f.finance.read().transactions.length, 0);
});

test('failed atomic occurrence update rolls back the Expense and retains the editable draft for retry', async t => {
  const f = await setup(t); await f.open(); await f.app.change('Actual amount paid *', '29,90');
  f.sqlite.exec("CREATE TRIGGER payment_failure BEFORE UPDATE ON finance_commitment_occurrences WHEN NEW.status = 'paid' BEGIN SELECT RAISE(ABORT, 'Injected occurrence failure'); END");
  await f.app.press('Confirm'); assert.equal(f.finance.read().transactions.length, 0); assert.equal(f.commitments.readHistory(f.id).outstanding[0].status, 'pending');
  assert.equal(f.app.find('FormField', 'Actual amount paid *').props.value, '29,90'); assert.equal(f.app.find('FormButton', 'Confirm').props.busy, false);
  f.sqlite.exec('DROP TRIGGER payment_failure'); await f.app.press('Confirm'); assert.equal(f.finance.read().transactions[0].amountMinor, 2990);
});

test('stale resolved occurrence cannot create a duplicate Expense from an open confirmation', async t => {
  const f = await setup(t); await f.open(); const row = f.commitments.readHistory(f.id).outstanding[0];
  f.commitments.pay(row, '180,20', today); await f.app.press('Confirm');
  assert.equal(f.finance.read().transactions.length, 1); assert.ok(f.app.container.textContent.includes('already resolved'));
});

test('pending callback disables Confirm, preserves values, guards duplicate taps and can retry rejection', async t => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close()); const due = addDays(today, 1);
  let reject!: (reason: Error) => void, calls = 0, dismissed = false;
  const pending = new Promise<void>((_resolve, fail) => { reject = fail; });
  const occurrence = { id: null, commitmentId: 'preview', scheduleId: 'schedule', dueDate: due, expectedAmountMinor: 4350, installmentIndex: null };
  const modalProps = { onDismiss() {}, children: createElement(CommitmentPayment, { occurrence, title: 'Pending payment', kind: 'bill', onDismiss: () => { dismissed = true; }, onSave: () => { calls++; return calls === 1 ? pending : undefined; } }) };
  const app = await mount(createElement(CommitmentModal, modalProps), f.db); t.after(app.unmount);
  const confirm = app.find('FormButton', 'Confirm').props.onPress as () => Promise<void>;
  await act(async () => { void confirm(); }); assert.equal(app.find('FormButton', 'Confirm').props.busy, true); assert.equal(app.find('FormButton', 'Confirm').props.disabled, true);
  await act(async () => { void confirm(); }); assert.equal(calls, 1); assert.equal(dismissed, false);
  await act(async () => { reject(new Error('Storage unavailable')); await Promise.resolve(); });
  assert.equal(app.find('FormButton', 'Confirm').props.busy, false); assert.equal(app.find('FormField', 'Actual amount paid *').props.value, '43,50');
  await app.press('Confirm'); assert.equal(calls, 2); assert.ok(dismissed);
});

test('shared busy button announces busy/disabled and keeps an explicit Confirm label', async t => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const app = await mount(createElement(UiButton, { label: 'Confirm', busy: true, variant: 'primary', onPress() {} }), f.db); t.after(app.unmount);
  const button = app.find('Pressable', 'Confirm'); assert.equal(button.props.disabled, true); assert.equal((button.props.accessibilityState as { busy: boolean }).busy, true); assert.equal(button.props['aria-busy'], true);
});

test('native picker limits actual dates to today; Cancel and enlarged maximum amounts preserve complete context', async t => {
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width: 320, height: 700, fontScale: 2, scale: 1 }));
  const f = await setup(t, { amount: formatBrlInput(maxAmountMinor) }, false); await f.open();
  assert.equal(f.app.nodes().find(n => n.props?.testID === 'commitment-payment-full-amount')!.textContent, formatBrlInput(maxAmountMinor));
  await act(() => (f.app.find('FormSelect', 'Payment date *').props.onPress as () => void)()); const picker = runtime.fixture.pickers[0];
  assert.equal(localDateString(picker.maximumDate as Date), today); assert.equal(picker.minimumDate, undefined);
  const earlier = addDays(today, -1); await act(() => (picker.onValueChange as (event: object, date: Date) => void)({}, pickerValue(earlier)));
  await f.app.press('Cancel'); assert.equal(f.finance.read().transactions.length, 0);
});

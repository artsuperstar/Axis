/// <reference types="node" />
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { DesignColors } from '../src/constants/design-system-v2';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import { transactionDraft } from '../src/features/finance/form';
import { transactionPresentation } from '../src/features/finance/transactions-presentation';
import { workDraft } from '../src/features/finance/work/form';
import { dateLabel } from '../src/utils/calendar';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const { TransactionDetail } = createRequire(import.meta.url)('../src/features/finance/components/transaction-detail') as typeof import('../src/features/finance/components/transaction-detail');
const today = '2026-11-13';
async function fixture(t: TestContext, kind: 'work' | 'multi' | 'bill' | 'subscription' | 'installment') {
  const f = await journalDatabase(); t.after(() => f.sqlite.close()); f.setTime(today); t.mock.method(Date, 'now', f.now);
  let id: string;
  if (kind === 'work' || kind === 'multi') {
    const client = f.work.createCounterparty('Client Studio');
    const jobs = ['Software', 'Training'].slice(0, kind === 'multi' ? 2 : 1).map(title => f.work.create({ ...workDraft(null, today), counterpartyId: client.id, title, compensationType: 'fixed', fixedAmount: '500' }));
    id = f.work.recordPayment({ counterpartyId: client.id, allocations: jobs.map(workEntryId => ({ workEntryId, amount: '100,01' })), paymentDate: today, categoryId: null });
  } else {
    const category = f.finance.createCategory('Linked detail utilities', 'expense');
    const commitmentId = f.commitments.create({ ...commitmentDraft(null, undefined, '2026-11-01'), title: 'Internet', kind, amount: '150', installmentCount: kind === 'installment' ? '2' : '', categoryId: category.id });
    const due = f.commitments.readHistory(commitmentId).outstanding[0]; id = f.commitments.pay(due, '151,23', today);
  }
  const page = f.finance.readLedgerPage(), transaction = page.transactions.find(x => x.id === id)!, source = page.sources[id];
  return { ...f, id, transaction, source, categories: page.categories };
}
const state = (f: Awaited<ReturnType<typeof fixture>>) => ['finance_transactions', 'work_payment_allocations', 'finance_commitment_occurrences']
  .map(table => f.sqlite.prepare(`SELECT * FROM ${table} ORDER BY id`).all());
const flat = (style: unknown): Record<string, unknown> => Object.assign({}, ...[style].flat(Infinity));

for (const theme of ['dark', 'light'] as const) for (const kind of ['work', 'multi', 'bill', 'subscription', 'installment'] as const) {
  test(`${theme}: ${kind} linked detail preserves source content, amount and allowed callbacks without ledger writes`, async t => {
    t.mock.method(runtime.native as { useColorScheme: () => string }, 'useColorScheme', () => theme);
    const f = await fixture(t, kind), before = state(f), calls: string[] = [];
    const display = transactionPresentation(f.transaction, f.categories, today, f.source);
    const app = await mount(createElement(TransactionDetail, { transaction: f.transaction, source: f.source, categories: f.categories, today, visible: true,
      onDismiss: () => calls.push('dismiss'), onClosed: () => calls.push('closed'), onEdit: () => calls.push('edit'), onOpenSource: () => calls.push('source') }), f.db);
    t.after(app.unmount);
    for (const text of [display.title, display.amount, dateLabel(f.transaction.transactionDate), display.category]) if (text) assert.ok(app.container.textContent.includes(text));
    assert.equal(app.nodes().filter(n => n.props?.accessibilityLabel === `Source: ${f.source.kind === 'work' ? 'Work' : 'Commitment'}`).length, 1);
    const buttons = app.nodes().filter(n => n.kind === 'FormButton');
    assert.deepEqual(buttons.map(n => n.props.label), ['Back', f.source.kind === 'work' ? 'Open Work' : 'Open Commitments', 'Edit details']);
    for (const button of buttons) assert.equal(button.props.appearance, 'v2');
    assert.equal(buttons[1].props.variant, 'primary');
    const amount = app.nodes().find(n => n.kind === 'ThemedText' && n.textContent === display.amount)!;
    assert.equal(flat(amount.props.style).color, f.transaction.type === 'income' ? DesignColors[theme].financeIncome : DesignColors[theme].financeExpense);
    if (f.source.kind === 'work') {
      assert.ok(app.container.textContent.includes(f.source.clientName));
      assert.equal(app.container.textContent.includes('Covered jobs'), f.source.jobs.length > 1);
    }
    await app.press('Edit details'); await app.press(buttons[1].props.label as string);
    await act(async () => { (app.find('Modal').props.onRequestClose as () => void)(); });
    assert.deepEqual(calls, ['edit', 'source', 'dismiss']); assert.deepEqual(state(f), before);
    assert.throws(() => f.finance.deleteTransaction(f.id), /Undo payment/);
    assert.throws(() => f.finance.editTransaction(f.id, { ...transactionDraft(f.transaction), type: f.transaction.type === 'income' ? 'expense' : 'income' }), /remain/);
    if (f.source.kind === 'work') assert.throws(() => f.finance.editTransaction(f.id, { ...transactionDraft(f.transaction), amount: '999' }), /allocations/);
    assert.deepEqual(state(f), before);
  });
}

async function open(app: Awaited<ReturnType<typeof mount>>, title: string) {
  await app.press(`Transaction options for ${title}`);
  await act(async () => { await app.press(`View payment details for ${title}`); await new Promise(resolve => setTimeout(resolve, 20)); });
}
for (const kind of ['work', 'bill'] as const) test(`${kind}: native detail-to-editor/source handoffs preserve locked fields and parent list context`, async t => {
  const native = runtime.native as { Platform: { OS: string } }; const previous = native.Platform.OS; native.Platform.OS = 'ios'; t.after(() => { native.Platform.OS = previous; });
  const f = await fixture(t, kind), before = state(f), display = transactionPresentation(f.transaction, f.categories, today, f.source);
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'transactions' }), f.db); t.after(app.unmount);
  const list = app.find('SectionList');
  await open(app, display.title); let closed = app.find('Modal').props.onDismiss as () => void;
  await app.press('Edit details'); assert.ok(!app.nodes().some(n => n.kind === 'FormField' && n.props.label === 'Description *'));
  await act(async () => { closed(); }); assert.equal(app.nodes().filter(n => n.kind === 'Modal').length, 1);
  assert.equal(app.find('SegmentedControl', 'Type *').props.disabled, true);
  assert.equal(app.find('FormField', 'Amount *').props.editable, kind === 'work' ? false : true);
  await app.press('Cancel'); assert.equal(app.find('SectionList'), list); assert.deepEqual(state(f), before);
  await open(app, display.title); closed = app.find('Modal').props.onDismiss as () => void;
  await app.press(kind === 'work' ? 'Open Work' : 'Open Commitments'); assert.equal(app.find('FormButton', 'Transactions').props.selected, true);
  await act(async () => { closed(); }); assert.equal(app.find('FormButton', kind === 'work' ? 'Work' : 'Commitments').props.selected, true);
  assert.ok(!app.nodes().some(n => n.kind === 'Modal')); assert.deepEqual(state(f), before);
});

test('ordinary ledger entries still open the existing editor directly with ordinary type/amount editing', async t => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close()); f.setTime(today); t.mock.method(Date, 'now', f.now);
  f.finance.createTransaction({ ...transactionDraft(), description: 'Lunch', amount: '25,90', transactionDate: today });
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'transactions' }), f.db); t.after(app.unmount);
  await app.press('Transaction options for Lunch'); await act(async () => { await app.press('Edit Lunch'); await new Promise(resolve => setTimeout(resolve, 20)); });
  assert.ok(!app.container.textContent.includes('Transaction details')); assert.equal(app.find('SegmentedControl', 'Type *').props.disabled, false);
  assert.equal(app.find('FormField', 'Amount *').props.editable, true);
});

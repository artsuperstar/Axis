/// <reference types="node" />
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import type { CommitmentDraft } from '../src/features/finance/commitments/types';
import { formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { addDays, addMonths, dateLabel, localDateString } from '../src/utils/calendar';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const today = localDateString(new Date());
type App = Awaited<ReturnType<typeof mount>>;
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 15)); }); }
async function menu(app: App, label: string, action: string) { await app.press(label); await app.press(action); await settle(); }
function list(app: App) { const value = app.nodes().find(n => n.kind === 'SectionList' && n.props?.testID === 'commitment-individual-history-list'); assert.ok(value); return value; }
function rows(app: App) { return app.nodes(list(app)).filter(n => n.props?.testID === 'commitment-history-row'); }
async function setup(t: TestContext, changes: Partial<CommitmentDraft> = {}, populate = true) {
  const f = await journalDatabase(); f.setTime(today); t.after(() => f.sqlite.close());
  const id = f.commitments.create({ ...commitmentDraft(null, undefined, addMonths(today, -2)), title: 'Equipment service', kind: 'installment', installmentCount: '6', amount: '180,20', ...changes });
  const due = f.commitments.readHistory(id).outstanding;
  if (populate) { f.commitments.pay(due[0], '175,35', today); f.commitments.skip(due[1]); f.commitments.pay(due[2], '190,15', addDays(today, -2)); }
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments' }), f.db); t.after(app.unmount);
  async function open() { await menu(app, 'Commitment options', 'Manage commitments'); await menu(app, 'Series options for Equipment service', 'History'); }
  return { ...f, id, due, app, open };
}

for (const [kind, icon] of [['bill', 'receipt'], ['subscription', 'repeat'], ['installment', 'layers']] as const) test(`${kind} individual archive has source-correct Paid/Skipped cards, generic icons and explicit actions`, async t => {
  const f = await setup(t, { kind, installmentCount: kind === 'installment' ? '6' : '' }); await f.open();
  const summary = f.app.nodes().find(n => n.props?.testID === 'commitment-history-summary')!;
  assert.ok(summary.textContent.includes('Equipment service')); assert.ok(summary.textContent.includes('Active')); assert.ok(summary.textContent.includes('Latest expected per'));
  assert.ok(f.app.nodes(summary).some(n => n.props?.testID === `icon-${icon}`)); assert.ok(!f.app.nodes(summary).some(n => n.props?.accessibilityRole === 'button'));
  assert.ok(f.app.container.textContent.includes('Commitment history')); assert.equal(rows(f.app).length, 3);
  const archive = rows(f.app); assert.ok(archive.every(n => f.app.nodes(n).some(v => v.props?.testID === `icon-${icon}`)));
  assert.ok(archive[0].textContent.includes(`Paid · Due ${dateLabel(f.due[2].dueDate)}`)); assert.ok(archive[0].textContent.includes('Expected R$ 180,20')); assert.ok(archive[0].textContent.includes('Paid R$ 190,15'));
  assert.ok(archive[0].textContent.includes(`Payment date ${dateLabel(addDays(today, -2))}`)); assert.ok(archive[2].textContent.includes(`Payment date ${dateLabel(today)}`));
  assert.ok(archive[1].textContent.includes('Skipped')); assert.ok(!archive[1].textContent.includes('Paid R$')); assert.ok(!archive[1].textContent.includes('Payment date')); assert.ok(!archive[1].textContent.includes('Category'));
  assert.ok(!archive.some(n => /Pending|Overdue/.test(n.textContent))); assert.ok(!f.app.nodes(list(f.app)).some(n => n.props?.label === 'Pay' || String(n.props?.accessibilityLabel).startsWith('Actions for')));
  if (kind === 'installment') { assert.ok(summary.textContent.includes('3 of 6 installments paid or skipped')); assert.ok(archive[0].textContent.includes('3 of 6')); assert.ok(archive[1].textContent.includes('2 of 6')); assert.ok(archive[2].textContent.includes('1 of 6')); }
  else { assert.ok(!summary.textContent.includes('installments paid')); assert.ok(!archive.some(n => /\d of \d/.test(n.textContent))); }
  assert.equal(f.app.nodes(list(f.app)).filter(n => n.props?.testID === 'commitment-history-connector').length, 2);
  await f.app.press('Back'); assert.ok(!f.app.nodes().some(n => n.props?.testID === 'commitment-history-summary'));
});

test('paid archived category remains the ledger identity after parent category/expectation changes', async t => {
  const f = await setup(t, {}, false); const oldCategory = f.finance.createCategory('Archived paid expense category', 'expense'); const newCategory = f.finance.createCategory('Current equipment category', 'expense');
  let item = f.commitments.read().items[0]; f.commitments.edit(f.id, { ...commitmentDraft(item.commitment, item.schedule), categoryId: oldCategory.id });
  f.commitments.pay(f.due[0], '175,35', today); item = f.commitments.read().items[0]; f.commitments.edit(f.id, { ...commitmentDraft(item.commitment, item.schedule), categoryId: newCategory.id, amount: '210' }); f.finance.deleteCategory(oldCategory.id);
  await f.app.resume(); await f.open(); const summary = f.app.nodes().find(n => n.props?.testID === 'commitment-history-summary')!;
  assert.ok(summary.textContent.includes('Current equipment category')); assert.ok(summary.textContent.includes('R$ 210,00'));
  assert.ok(rows(f.app)[0].textContent.includes('Archived paid expense category')); assert.ok(rows(f.app)[0].textContent.includes('Expected R$ 180,20')); assert.ok(rows(f.app)[0].textContent.includes('Paid R$ 175,35'));
});

test('Skipped Reopen confirms and returns the saved occurrence to unpaid without ledger movement', async t => {
  const f = await setup(t); await f.open(); const ledger = f.finance.read().transactions; const row = f.due[1];
  await f.app.press(`Reopen Equipment service, due ${dateLabel(row.dueDate)}`); assert.equal(rows(f.app).length, 3); await f.app.confirm('Cancel'); assert.equal(rows(f.app).length, 3);
  await f.app.press(`Reopen Equipment service, due ${dateLabel(row.dueDate)}`); await f.app.confirm('Confirm'); assert.equal(rows(f.app).length, 2); assert.deepEqual(f.finance.read().transactions, ledger);
  await f.app.tapSet('View commitment'); assert.ok(f.app.nodes().some(n => n.props?.testID === 'commitment-details-overview')); assert.ok(f.app.container.textContent.includes('Overdue'));
});

test('Undo payment confirms, reverses actual Expense and reopens a completed installment', async t => {
  const f = await setup(t, { firstDueDate: today, installmentCount: '1' }, false); f.commitments.pay(f.due[0], '175,35', today); await f.app.resume(); await f.open();
  assert.ok(f.app.nodes().find(n => n.props?.testID === 'commitment-history-summary')!.textContent.includes('Completed'));
  const action = `Undo payment for Equipment service, due ${dateLabel(today)}`; await f.app.press(action); await f.app.confirm('Cancel'); assert.equal(f.finance.read().transactions.length, 1);
  await f.app.press(action); await f.app.confirm('Confirm'); assert.equal(f.finance.read().transactions.length, 0); assert.equal(rows(f.app).length, 0);
  assert.equal(f.commitments.read().items[0].commitment.status, 'active'); await f.app.tapSet('View commitment'); assert.ok(f.app.container.textContent.includes('R$ 0,00')); assert.ok(f.app.find('FormButton', `Pay Equipment service, due ${dateLabel(today)}`));
});

test('old Paid confirmation cannot reverse a replacement linked payment', async t => {
  const f = await setup(t); await f.open(); const row = f.due[2]; const original = f.commitments.readHistory(f.id).history.find(v => v.occurrence.id === row.id)!;
  await f.app.press(`Undo payment for Equipment service, due ${dateLabel(row.dueDate)}`);
  f.commitments.deletePayment(original.payment!.id, { commitmentId: f.id, dueDate: row.dueDate }); const replacement = f.commitments.pay(row, '195', today);
  await f.app.confirm('Confirm'); assert.ok(f.finance.read().transactions.some(v => v.id === replacement)); assert.equal(f.commitments.readHistory(f.id).history.find(v => v.occurrence.id === row.id)!.occurrence.paidTransactionId, replacement);
  assert.ok(f.app.nodes().some(n => n.props?.testID === 'commitment-history-summary'));
});

test('old Skipped confirmation cannot reverse an occurrence paid after the dialog opened', async t => {
  const f = await setup(t); await f.open(); const row = f.due[1];
  await f.app.press(`Reopen Equipment service, due ${dateLabel(row.dueDate)}`);
  assert.ok(row.id); f.commitments.reopen(row.id); const replacement = f.commitments.pay(row, '195', today);
  await f.app.confirm('Confirm'); assert.ok(f.finance.read().transactions.some(v => v.id === replacement));
  assert.equal(f.commitments.readHistory(f.id).history.find(v => v.occurrence.id === row.id)!.occurrence.status, 'paid');
  assert.ok(f.app.container.textContent.includes('This skipped occurrence changed'));
});

test('Undo storage failure rolls back linked state and loaded history remains available for retry', async t => {
  const f = await setup(t); await f.open(); const before = f.finance.read().transactions;
  f.sqlite.exec("CREATE TRIGGER undo_failure BEFORE UPDATE ON finance_commitment_occurrences WHEN OLD.status = 'paid' AND NEW.status = 'pending' BEGIN SELECT RAISE(ABORT, 'Injected history reversal failure'); END");
  const action = `Undo payment for Equipment service, due ${dateLabel(f.due[2].dueDate)}`; await f.app.press(action); await f.app.confirm('Confirm'); assert.deepEqual(f.finance.read().transactions, before); assert.equal(rows(f.app).length, 3);
  f.sqlite.exec('DROP TRIGGER undo_failure'); await f.app.press(action); await f.app.confirm('Confirm'); assert.equal(rows(f.app).length, 2); assert.equal(f.finance.read().transactions.length, 1);
});

for (const state of ['paused', 'ended'] as const) test(`${state} parent retains History and legitimate historical actions`, async t => {
  const f = await setup(t, { kind: 'bill', installmentCount: '' }); f.commitments[state === 'paused' ? 'pause' : 'end'](f.id); await f.app.resume(); await f.open();
  assert.ok(f.app.nodes().find(n => n.props?.testID === 'commitment-history-summary')!.textContent.includes(state[0].toUpperCase() + state.slice(1)));
  assert.equal(rows(f.app).length, 3); await f.app.press(`Undo payment for Equipment service, due ${dateLabel(f.due[2].dueDate)}`); await f.app.confirm('Confirm'); assert.equal(f.commitments.read().items[0].commitment.status, state);
});

test('empty individual History preserves its summary and existing View commitment destination', async t => {
  const f = await setup(t, {}, false); await f.open(); assert.equal(rows(f.app).length, 0); assert.ok(f.app.container.textContent.includes('No paid or skipped occurrences in this page.'));
  assert.ok(f.app.nodes().some(n => n.props?.testID === 'commitment-history-summary')); await f.app.tapSet('View commitment'); assert.ok(f.app.nodes().some(n => n.props?.testID === 'commitment-details-overview'));
});

test('twelve-month paging stays ordered/deduplicated, ends cleanly and refreshes the loaded span after Reopen', async t => {
  const f = await setup(t, { kind: 'bill', installmentCount: '', firstDueDate: addMonths(today, -30) }, false);
  for (const row of f.due.slice(0, -1)) f.commitments.skip(row);
  await f.app.resume(); await f.open(); assert.equal(rows(f.app).length, 11); const cursors: string[] = [];
  const historyData = () => list(f.app).props.sections as { data: { occurrence: { id: string; dueDate: string } }[] }[];
  for (const expected of [23, 30]) { await f.app.press('Load earlier history'); assert.equal(rows(f.app).length, expected); cursors.push(historyData()[0].data.at(-1)!.occurrence.dueDate); }
  const loaded = historyData()[0].data.map(v => v.occurrence); assert.equal(new Set(loaded.map(v => v.id)).size, 30); assert.deepEqual(loaded.map(v => v.dueDate), loaded.map(v => v.dueDate).sort().reverse());
  assert.ok(!f.app.nodes().some(n => n.props?.label === 'Load earlier history')); assert.equal(f.app.nodes(list(f.app)).filter(n => n.props?.testID === 'commitment-history-connector').length, 29);
  await f.app.press(`Reopen Equipment service, due ${dateLabel(loaded.at(-1)!.dueDate)}`); await f.app.confirm('Confirm'); assert.equal(rows(f.app).length, 29); assert.equal(new Set(historyData()[0].data.map(v => v.occurrence.id)).size, 29); assert.ok(cursors[1] < cursors[0]);
});

test('large text and maximum money use bounded variable-height virtualization with complete values', async t => {
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width: 320, height: 700, fontScale: 2, scale: 1 }));
  const f = await setup(t, { amount: formatBrlInput(maxAmountMinor) }, false); f.commitments.pay(f.due[0], formatBrlInput(maxAmountMinor), today); await f.app.resume(); await f.open();
  const archive = list(f.app); assert.equal(archive.props.initialNumToRender, 6); assert.equal(archive.props.maxToRenderPerBatch, 6); assert.equal(archive.props.windowSize, 5); assert.equal(archive.props.getItemLayout, undefined);
  assert.ok(rows(f.app)[0].textContent.includes('Expected R$ 90.071.992.547.409,91')); assert.ok(rows(f.app)[0].textContent.includes('Paid R$ 90.071.992.547.409,91'));
  assert.ok(!f.app.nodes(archive).some(n => n.props?.numberOfLines || n.props?.ellipsizeMode)); assert.ok(f.app.find('FormButton', 'Undo payment').props.accessibilityLabel);
});

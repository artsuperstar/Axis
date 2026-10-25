/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test, type TestContext } from 'node:test';
import { createElement, act } from 'react';

import { createCalendarDataAccess } from '../src/features/calendar/data';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import { commitmentSections } from '../src/features/finance/commitments/presentation';
import type { CommitmentDraft } from '../src/features/finance/commitments/types';
import { periodBounds } from '../src/features/finance/periods';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const today = '2026-10-24', dueDate = '2026-10-10';
async function fixture(t: TestContext, changes: Partial<CommitmentDraft> = {}) {
  const f = await journalDatabase(); t.after(() => f.sqlite.close()); f.setTime(today);
  const commitmentId = f.commitments.create({ ...commitmentDraft(null, undefined, dueDate), title: 'Internet', amount: '150', ...changes });
  const occurrence = f.commitments.readHistory(commitmentId).outstanding[0];
  const paymentId = f.commitments.pay(occurrence, '151,23', today);
  const expected = { commitmentId, dueDate: occurrence.dueDate };
  return { ...f, commitmentId, occurrence, paymentId, expected };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
const state = (f: Fixture) => ['finance_transactions', 'finance_commitment_occurrences', 'finance_commitments', 'finance_commitment_schedules']
  .map(table => f.sqlite.prepare(`SELECT * FROM ${table} ORDER BY id`).all());
const parent = (f: Fixture) => f.commitments.read().items.find(item => item.commitment.id === f.commitmentId)!;
function assertReversed(f: Fixture) {
  assert.equal(f.finance.readLedgerPage().transactions.length, 0);
  const row = parent(f).outstanding.find(row => row.id === f.occurrence.id)!;
  assert.equal(row.status, 'pending'); assert.equal(row.paidTransactionId, null); assert.equal(row.resolvedAt, null);
  assert.equal(row.expectedAmountMinor, 15000);
  assert.ok(f.sqlite.prepare('SELECT deleted_at FROM finance_transactions WHERE id = ?').get(f.paymentId)!.deleted_at);
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []);
}

for (const kind of ['bill', 'subscription', 'installment'] as const) test(`${kind}: source-aware deletion updates ledger, Overdue, Calendar, Cash Flow, Spending and Journal`, async t => {
  const f = await fixture(t, { kind, installmentCount: kind === 'installment' ? '1' : '' });
  const period = periodBounds('month', today), calendar = createCalendarDataAccess(f.db, randomUUID, f.now);
  const before = f.finance.readDashboard(period).analytics;
  assert.equal(before.expensesMinor, 15123n); assert.equal(before.netFlowMinor, -15123n);
  assert.equal(before.cashFlow!.reduce((sum, bucket) => sum + bucket.expensesMinor, 0n), 15123n);
  assert.equal(before.spending.reduce((sum, item) => sum + item.amountMinor, 0n), 15123n);
  assert.equal(f.context.read(today).expensesMinor, 15123n);
  assert.ok(!calendar.readRange({ from: dueDate, to: dueDate }).some(item => item.recordId === f.commitmentId));
  const original = state(f); assert.equal(f.commitments.readPayment(f.paymentId, f.expected).payment.amountMinor, 15123); assert.deepEqual(state(f), original);
  f.commitments.deletePayment(f.paymentId, f.expected); assertReversed(f);
  const after = f.finance.readDashboard(period).analytics;
  assert.equal(after.expensesMinor, 0n); assert.equal(after.incomeMinor, 0n); assert.equal(after.netFlowMinor, 0n); assert.equal(after.transactionCount, 0);
  assert.equal(after.cashFlow!.reduce((sum, bucket) => sum + bucket.expensesMinor, 0n), 0n); assert.deepEqual(after.spending, []);
  const journal = f.context.read(today); assert.equal(journal.expensesMinor, 0n); assert.equal(journal.netFlowMinor, 0n); assert.equal(journal.transactionCount, 0);
  const overdue = commitmentSections(f.commitments.read().items, today).find(section => section.title === 'Overdue')!;
  assert.ok(overdue.rows.some(row => row.occurrence.id === f.occurrence.id));
  const restored = calendar.readRange({ from: dueDate, to: dueDate }).find(item => item.recordId === f.commitmentId)!;
  assert.equal(restored.status, 'Overdue'); assert.equal(restored.source, 'commitment');
  assert.equal(parent(f).commitment.status, 'active'); assert.equal(parent(f).commitment.completedAt, null);
});

for (const status of ['paused', 'ended'] as const) for (const kind of ['bill', 'subscription'] as const) test(`${status} ${kind} retains user intent after payment deletion`, async t => {
  const f = await fixture(t, { kind }); f.commitments[status === 'paused' ? 'pause' : 'end'](f.commitmentId);
  f.commitments.deletePayment(f.paymentId, f.expected); assertReversed(f);
  assert.equal(parent(f).commitment.status, status); assert.equal(parent(f).upcoming, null);
});

test('last installment paid while paused restores paused state, not generation; re-payment completes again', async t => {
  const f = await fixture(t, { kind: 'installment', installmentCount: '1' });
  f.commitments.reopen(f.occurrence.id!); f.commitments.pause(f.commitmentId);
  const second = f.commitments.pay(parent(f).outstanding[0], '150', today);
  assert.equal(parent(f).commitment.status, 'completed'); assert.ok(parent(f).commitment.completedAt);
  f.commitments.deletePayment(second, f.expected);
  assert.equal(parent(f).commitment.status, 'paused'); assert.equal(parent(f).commitment.completedAt, null); assert.equal(parent(f).upcoming, null);
  const third = f.commitments.pay(parent(f).outstanding[0], '150', today);
  assert.notEqual(third, second); assert.equal(parent(f).commitment.status, 'completed');
});

test('stale owner/date, repeated deletion and old confirmation after re-payment never reverse a different payment', async t => {
  const f = await fixture(t);
  const before = state(f);
  for (const expected of [{ ...f.expected, commitmentId: randomUUID() }, { ...f.expected, dueDate: today }]) {
    assert.throws(() => f.commitments.readPayment(f.paymentId, expected), /changed|available/);
    assert.throws(() => f.commitments.deletePayment(f.paymentId, expected), /changed|available/);
    assert.deepEqual(state(f), before);
  }
  f.commitments.deletePayment(f.paymentId, f.expected); const reversed = state(f);
  assert.throws(() => f.commitments.deletePayment(f.paymentId, f.expected), /changed|available/); assert.deepEqual(state(f), reversed);
  const next = f.commitments.pay(parent(f).outstanding[0], '170,01', today), repaid = state(f);
  assert.throws(() => f.commitments.deletePayment(f.paymentId, f.expected), /changed|available/); assert.deepEqual(state(f), repaid);
  assert.equal(f.commitments.readPayment(next, f.expected).payment.amountMinor, 17001);
});

for (const target of ['payment', 'occurrence', 'parent'] as const) test(`historical ${target} tombstone is rejected without silent repair or manual-delete bypass`, async t => {
  const f = await fixture(t);
  const tables = { payment: 'finance_transactions', occurrence: 'finance_commitment_occurrences', parent: 'finance_commitments' };
  const ids = { payment: f.paymentId, occurrence: f.occurrence.id!, parent: f.commitmentId };
  f.sqlite.prepare(`UPDATE ${tables[target]} SET deleted_at = 1 WHERE id = ?`).run(ids[target]);
  const before = state(f);
  assert.throws(() => f.commitments.readPayment(f.paymentId, f.expected), /reconciliation|available|changed/);
  assert.throws(() => f.commitments.deletePayment(f.paymentId, f.expected), /reconciliation|available|changed/);
  assert.deepEqual(state(f), before);
  if (target !== 'payment') {
    assert.equal(f.finance.readLedgerPage().sources[f.paymentId].kind, 'commitment');
    assert.throws(() => f.finance.deleteTransaction(f.paymentId), /Undo payment/); assert.deepEqual(state(f), before);
  }
});

test('missing historical expense is rejected without repairing occurrence or parent', async t => {
  const f = await fixture(t); f.sqlite.exec('PRAGMA foreign_keys = OFF');
  f.sqlite.prepare('DELETE FROM finance_transactions WHERE id = ?').run(f.paymentId); f.sqlite.exec('PRAGMA foreign_keys = ON');
  const before = state(f);
  assert.throws(() => f.commitments.readPayment(f.paymentId, f.expected), /reconciliation/);
  assert.throws(() => f.commitments.deletePayment(f.paymentId, f.expected), /reconciliation/); assert.deepEqual(state(f), before);
});

for (const [name, trigger] of [
  ['ledger', 'BEFORE UPDATE OF deleted_at ON finance_transactions'],
  ['occurrence', "BEFORE UPDATE OF status ON finance_commitment_occurrences WHEN NEW.status = 'pending'"],
  ['parent', "BEFORE UPDATE OF status ON finance_commitments WHEN NEW.status = 'active'"],
] as const) test(`failure updating ${name} rolls back expense, occurrence and completed installment together`, async t => {
  const f = await fixture(t, { kind: 'installment', installmentCount: '1' }); const before = state(f);
  f.sqlite.exec(`CREATE TRIGGER fail_reversal ${trigger} BEGIN SELECT RAISE(ABORT, 'Injected reversal failure'); END`);
  assert.throws(() => f.commitments.deletePayment(f.paymentId, f.expected), /Injected reversal failure/); assert.deepEqual(state(f), before);
  assert.equal(f.finance.readDashboard(periodBounds('month', today)).analytics.expensesMinor, 15123n); assert.equal(parent(f).commitment.status, 'completed');
});

type App = Awaited<ReturnType<typeof mount>>;
const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
async function deletion(app: App) { await app.press('Transaction options for Internet'); await app.press('Delete payment for Internet'); await settle(); }
async function screen(t: TestContext) {
  t.mock.method((runtime.native as { AccessibilityInfo: { isReduceMotionEnabled: () => Promise<boolean> } }).AccessibilityInfo, 'isReduceMotionEnabled', () => Promise.resolve(true));
  const f = await fixture(t); const app = await mount(createElement(screens.FinanceScreen, { initialView: 'transactions' }), f.db); t.after(app.unmount);
  return { f, app };
}
test('linked menu confirmation Cancel writes nothing; confirm refreshes Transactions, Overview and Commitments', async t => {
  const { f, app } = await screen(t); const original = state(f);
  const body = app.nodes().find(node => node.props?.testID === 'transaction-information')!;
  assert.equal(body.kind, 'View'); assert.equal(body.props.onPress, undefined); assert.equal(body.props.accessibilityRole, undefined);
  const headers = app.nodes().filter(node => node.props?.accessibilityRole === 'header').map(node => node.textContent);
  assert.ok(!headers.includes('Transactions')); assert.ok(!app.container.textContent.includes('Track your money movements.'));
  assert.ok(app.find('FormButton', 'Transactions options')); assert.ok(app.find('Pressable', 'New transaction'));
  await deletion(app); const alert = runtime.fixture.alerts.at(-1)!;
  assert.equal(alert.title, 'Delete payment?'); assert.ok(alert.message.includes('mark this commitment occurrence as unpaid'));
  assert.equal(alert.buttons.find(button => button.text === 'Delete payment')!.style, 'destructive');
  await app.confirm('Cancel'); assert.deepEqual(state(f), original);
  await deletion(app); await app.confirm('Delete payment'); assertReversed(f);
  assert.equal(app.nodes().filter(node => node.props?.testID === 'transaction-row').length, 0);
  await app.press('Overview'); assert.ok(app.container.textContent.includes('R$ 0,00'));
  await app.press('Commitments'); assert.ok(app.container.textContent.includes('Overdue')); assert.ok(app.container.textContent.includes('Internet'));
});

test('payment changed while confirmation is open yields an error and retains the new payment', async t => {
  const { f, app } = await screen(t); await deletion(app);
  f.commitments.reopen(f.occurrence.id!); const next = f.commitments.pay(parent(f).outstanding[0], '155', today); const before = state(f);
  await app.confirm('Delete payment'); assert.deepEqual(state(f), before); assert.ok(app.container.textContent.includes('Refresh Transactions'));
  assert.equal(f.commitments.readPayment(next, f.expected).payment.amountMinor, 15500);
});

test('invalid retained ownership fails before confirmation; no destructive dialog and no writes', async t => {
  const { f, app } = await screen(t);
  f.sqlite.prepare('UPDATE finance_commitment_occurrences SET deleted_at = 1 WHERE id = ?').run(f.occurrence.id!);
  const before = state(f), alerts = runtime.fixture.alerts.length;
  await deletion(app); assert.equal(runtime.fixture.alerts.length, alerts); assert.deepEqual(state(f), before);
  assert.ok(app.container.textContent.includes('Refresh Transactions'));
});

test('failed native confirmation shows an error, preserves paid card, and can retry safely', async t => {
  const { f, app } = await screen(t); const before = state(f);
  f.sqlite.exec("CREATE TRIGGER fail_ui_reversal BEFORE UPDATE OF status ON finance_commitment_occurrences BEGIN SELECT RAISE(ABORT, 'Payment reversal unavailable'); END");
  await deletion(app); await app.confirm('Delete payment'); assert.deepEqual(state(f), before);
  assert.ok(app.container.textContent.includes('Unable to delete this payment')); assert.equal(app.nodes().filter(node => node.props?.testID === 'transaction-row').length, 1);
  f.sqlite.exec('DROP TRIGGER fail_ui_reversal'); await deletion(app); await app.confirm('Delete payment'); assertReversed(f);
});

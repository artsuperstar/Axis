/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { act, createElement } from 'react';

import { commitmentDraft } from '../src/features/finance/commitments/form';
import { transactionDraft } from '../src/features/finance/form';
import { formatBrlAmount } from '../src/features/finance/money';
import { periodBounds } from '../src/features/finance/periods';
import { workDraft } from '../src/features/finance/work/form';
import { localDateString } from '../src/utils/calendar';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const today = localDateString(new Date());
type App = Awaited<ReturnType<typeof mount>>;
const node = (app: App, id: string) => app.nodes().find(item => item.props?.testID === id)!;
const cashFlow = (app: App) => node(app, 'finance-cash-flow');
const donut = (app: App) => node(app, 'finance-expense-donut');
async function selectBucket(app: App, id: string) { await app.tapSet(String(node(app, `cash-flow-bucket-${id}`).props.accessibilityLabel)); }

test('actual paid Commitments and Work income enter both projections once; expected/unpaid facts do not', async t => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close()); f.setTime(today);
  const commitment = f.commitments.create({ ...commitmentDraft(null, undefined, today), title: 'Bill', amount: '80' });
  const client = f.work.createCounterparty('Client');
  const work = f.work.create({ ...workDraft(null, today), title: 'Job', counterpartyId: client.id, compensationType: 'fixed', fixedAmount: '250' });
  const period = periodBounds('month', today);
  assert.equal(f.finance.readDashboard(period).analytics.transactionCount, 0);
  f.commitments.pay(f.commitments.read().items.find(item => item.commitment.id === commitment)!.outstanding[0], '79,99', today);
  f.work.recordPayment({ counterpartyId: client.id, allocations: [{ workEntryId: work, amount: '125,50' }], paymentDate: today, categoryId: null });
  const analytics = f.finance.readDashboard(period).analytics;
  assert.equal(analytics.transactionCount, 2); assert.equal(analytics.expensesMinor, 7999n); assert.equal(analytics.incomeMinor, 12550n);
  assert.equal(analytics.cashFlow!.reduce((sum, bucket) => sum + bucket.expensesMinor, 0n), 7999n);
  assert.equal(analytics.cashFlow!.reduce((sum, bucket) => sum + bucket.incomeMinor, 0n), 12550n);
  assert.equal(analytics.spending.reduce((sum, category) => sum + category.amountMinor, 0n), 7999n);
});

test('real query keeps archived names, null and soft-delete semantics', async t => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close()); f.setTime(today);
  const category = f.finance.createCategory('Historical spending', 'expense');
  const id = f.finance.createTransaction({ ...transactionDraft(), description: 'Expense', transactionDate: today, amount: '10', categoryId: category.id });
  f.finance.deleteCategory(category.id);
  f.finance.createTransaction({ ...transactionDraft(), description: 'Unassigned', transactionDate: today, amount: '0,01' });
  const period = periodBounds('month', today);
  assert.deepEqual(f.finance.readDashboard(period).analytics.spending.map(item => item.name), ['Historical spending', 'No category']);
  f.finance.deleteTransaction(id);
  assert.equal(f.finance.readDashboard(period).analytics.expensesMinor, 1n);
  assert.equal(f.finance.readDashboard(period).analytics.cashFlow!.reduce((sum, bucket) => sum + bucket.expensesMinor, 0n), 1n);
});

test('thousands of rows use one indexed period ledger read shared by metrics and both charts', async t => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const insert = f.sqlite.prepare('INSERT INTO finance_transactions (id,type,amount_minor,description,transaction_date,created_at,updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  f.sqlite.exec('BEGIN');
  for (let index = 0; index < 6000; index++) insert.run(`fixture-${index}`, index % 2 ? 'income' : 'expense', 1, 'Fixture', index < 4000 ? '2026-09-15' : '2026-10-15', index, index);
  f.sqlite.exec('COMMIT');
  const measured = f.measure(() => f.finance.readDashboard(periodBounds('month', '2026-10-01')));
  const ledgerReads = measured.statements.filter(statement => statement.sql.includes('finance_transactions'));
  assert.equal(ledgerReads.length, 1); assert.equal(ledgerReads[0].rows, 2000); assert.equal(measured.count, 2);
  assert.equal(measured.value.analytics.incomeMinor, 1000n); assert.equal(measured.value.analytics.expensesMinor, 1000n);
  assert.ok(ledgerReads[0].sql.includes('transaction_date') && ledgerReads[0].sql.includes('deleted_at'));
  const plan = f.sqlite.prepare('EXPLAIN QUERY PLAN SELECT * FROM finance_transactions WHERE deleted_at IS NULL AND transaction_date >= ? AND transaction_date <= ?').all('2026-10-01', '2026-10-31');
  assert.ok(JSON.stringify(plan).includes('finance_transactions_active_date_idx'));
  assert.equal(measured.value.analytics.cashFlow!.length, 5);
});

test('Week/Month/Year and backward/forward controls drive both charts; bucket inspection is native, exact and read-only', async t => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close()); f.setTime(today);
  f.finance.createTransaction({ ...transactionDraft(), description: 'Expense', transactionDate: today, amount: '123,45' });
  const app = await mount(createElement(screens.FinanceScreen), f.db); t.after(app.unmount);
  for (const kind of ['week', 'month', 'year'] as const) {
    await act(() => (app.find('SegmentedControl', 'Period').props.onChange as (kind: string) => void)(kind));
    const analytics = f.finance.readDashboard(periodBounds(kind, today)).analytics;
    const buttons = app.nodes().filter(item => item.kind === 'Pressable' && String(item.props?.accessibilityLabel).includes(', Income R$'));
    assert.equal(buttons.length, analytics.cashFlow!.length);
    assert.ok(cashFlow(app) && donut(app)); assert.ok(donut(app).textContent.includes('R$ 123,45'));
    const active = analytics.cashFlow!.find(bucket => bucket.expensesMinor)!;
    const reads = runtime.fixture.reads.length;
    const inspect = await f.measureAsync(() => selectBucket(app, active.id));
    assert.equal(inspect.count, 0); assert.equal(runtime.fixture.reads.length, reads);
    assert.ok(node(app, 'cash-flow-inspection').textContent.includes('ExpensesR$ 123,45'));
    assert.equal(node(app, `cash-flow-bucket-${active.id}`).props.accessibilityState && (node(app, `cash-flow-bucket-${active.id}`).props.accessibilityState as { selected: boolean }).selected, true);
    assert.ok(String(node(app, `cash-flow-bucket-${active.id}`).props.accessibilityLabel).includes('Income R$ 0,00, Expenses R$ 123,45'));
    await app.press(`Previous ${kind}`); assert.ok(cashFlow(app).textContent.includes('No transactions in this period.'));
    assert.ok(donut(app).textContent.includes('No transactions in this period.'));
    await app.press(`Next ${kind}`); assert.ok(donut(app).textContent.includes('R$ 123,45'));
  }
  assert.equal(f.finance.read().transactions.length, 1);
  assert.equal(app.nodes().filter(item => item.kind === 'FlatList').length, 1);
  assert.ok(!app.nodes().some(item => item.kind === 'ScrollView' && !item.props.horizontal));
});

test('mutations and refocus refresh chart values, deleted transactions disappear, failed refresh retains last-good charts', async t => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close()); f.setTime(today);
  const id = f.finance.createTransaction({ ...transactionDraft(), description: 'Expense', transactionDate: today, amount: '10' });
  const app = await mount(createElement(screens.FinanceScreen), f.db); t.after(app.unmount);
  assert.ok(donut(app).textContent.includes('R$ 10,00'));
  const transaction = f.finance.read().transactions.find(item => item.id === id)!;
  f.finance.editTransaction(id, { ...transactionDraft(transaction), amount: '25' });
  runtime.fixture.failures.add('finance.readDashboard'); await app.resume();
  assert.ok(donut(app).textContent.includes('R$ 10,00'));
  runtime.fixture.failures.clear(); await app.refocus();
  assert.ok(donut(app).textContent.includes('R$ 25,00'));
  const analytics = f.finance.readDashboard(periodBounds('month', today)).analytics;
  await selectBucket(app, analytics.cashFlow!.find(bucket => bucket.expensesMinor)!.id);
  assert.ok(node(app, 'cash-flow-inspection').textContent.includes(formatBrlAmount(2500n)));
  f.finance.deleteTransaction(id); await app.resume();
  assert.ok(cashFlow(app).textContent.includes('No transactions')); assert.ok(donut(app).textContent.includes('No transactions'));
  f.finance.createTransaction({ ...transactionDraft(), type: 'income', description: 'Income', transactionDate: today, amount: '50' }); await app.refocus();
  assert.ok(cashFlow(app).textContent.includes('Income')); assert.ok(donut(app).textContent.includes('No expenses'));
});

test('an in-app transaction save refreshes the charts through the existing mutation lifecycle', async t => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close()); f.setTime(today);
  const app = await mount(createElement(screens.FinanceScreen), f.db); t.after(app.unmount);
  await app.press('Transactions'); await app.tapSet('Add transaction');
  await app.change('Description *', 'Chart mutation'); await app.change('Amount *', '42,37');
  await app.press('Save'); await app.press('Overview');
  assert.ok(donut(app).textContent.includes('R$ 42,37'));
  const analytics = f.finance.readDashboard(periodBounds('month', today)).analytics;
  const bucket = analytics.cashFlow!.find(item => item.expensesMinor)!;
  await selectBucket(app, bucket.id);
  assert.ok(node(app, 'cash-flow-inspection').textContent.includes('ExpensesR$ 42,37'));
});

for (const width of [320, 390, 430]) for (const fontScale of [1, 2]) for (const theme of ['light', 'dark'] as const) {
  test(`chart controls and accessible category text at ${width}, fontScale ${fontScale}, ${theme}`, async t => {
    t.mock.method(runtime.native as { useWindowDimensions: () => object }, 'useWindowDimensions', () => ({ width, height: 850, fontScale, scale: 1 }));
    t.mock.method(runtime.native as { useColorScheme: () => string }, 'useColorScheme', () => theme);
    const f = await journalDatabase(); t.after(() => f.sqlite.close()); f.setTime(today);
    for (let index = 0; index < 7; index++) {
      const category = f.finance.createCategory(`Long category name for an accessible breakdown ${index}`, 'expense');
      f.finance.createTransaction({ ...transactionDraft(), description: 'Expense', transactionDate: today, amount: `${index + 1}`, categoryId: category.id });
    }
    const app = await mount(createElement(screens.FinanceScreen), f.db); t.after(app.unmount);
    assert.ok(donut(app).textContent.includes('Other'));
    assert.ok(app.nodes().some(item => String(item.props?.accessibilityLabel).startsWith('Total expenses, R$ 28,00')));
    await app.press('View all categories');
    const rows = app.nodes().filter(item => item.kind === 'View' && String(item.props?.accessibilityLabel).endsWith('of expenses'));
    assert.equal(rows.length, 7);
    for (const text of app.nodes().filter(item => item.kind === 'ThemedText')) assert.equal(text.props.numberOfLines, undefined);
  });
}

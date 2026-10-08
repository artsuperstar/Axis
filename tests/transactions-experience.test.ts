/// <reference types="node" />

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { test, type TestContext } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { act, createElement } from 'react';

import { createFinanceDataAccess } from '../src/features/finance/data';
import { createCommitmentDataAccess } from '../src/features/finance/commitments/data';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import { transactionDraft } from '../src/features/finance/form';
import { formatBrlAmount, formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { periodBounds } from '../src/features/finance/periods';
import { seedFinanceCategories } from '../src/features/finance/seed';
import { transactionDateHeading, transactionPresentation, transactionSections } from '../src/features/finance/transactions-presentation';
import type { FinanceTransaction, TransactionDraft } from '../src/features/finance/types';
import { createWorkDataAccess } from '../src/features/finance/work/data';
import { workDraft } from '../src/features/finance/work/form';
import { addDays, localDateString, pickerValue } from '../src/utils/calendar';
import { bundledMigrations, database } from './helpers/database';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const require = createRequire(import.meta.url);
const { TransactionRow } = require('../src/features/finance/components/transaction-row') as typeof import('../src/features/finance/components/transaction-row');
const { ContextMenuHost } = require('../src/components/context-menu') as typeof import('../src/components/context-menu');
const { floatingAddClearance } = require('../src/components/floating-add-button') as typeof import('../src/components/floating-add-button');
const today = localDateString(new Date());
type App = Awaited<ReturnType<typeof mount>>;
async function initialized(t: TestContext) {
  t.mock.method(console, 'error', () => {}); // Deliberately injected refresh failures.
  const f = database(); await migrate(f.db, bundledMigrations); seedFinanceCategories(f.db);
  t.after(() => f.sqlite.close());
  const finance = createFinanceDataAccess(f.db, randomUUID);
  const work = createWorkDataAccess(f.db, randomUUID);
  const commitments = createCommitmentDataAccess(f.db, randomUUID);
  const create = (changes: Partial<TransactionDraft> = {}) => finance.createTransaction({ ...transactionDraft(), description: 'Groceries', amount: '82,40', ...changes });
  return { ...f, finance, work, commitments, create };
}
const flatten = (style: unknown) => Object.assign({}, ...[style].flat(Infinity));
async function settle() { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); }); }
async function menu(app: App, trigger: string, action: string) { await app.press(trigger); await app.press(action); await settle(); }
function rows(app: App) { return app.nodes().filter((node) => node.props?.testID === 'transaction-row'); }
async function open(app: App, title: string) {
  const row = rows(app).find((row) => app.nodes(row).some((node) => node.props?.testID === 'transaction-description' && node.textContent === title));
  assert.ok(row, `Missing transaction ${title}`);
  const body = app.nodes(row).find((node) => node.kind === 'Pressable')!;
  await app.tapSet(String(body.props.accessibilityLabel));
}
function integrity(f: Awaited<ReturnType<typeof initialized>>) {
  assert.deepEqual(f.sqlite.prepare('PRAGMA integrity_check').all().map((row) => row.integrity_check), ['ok']);
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []);
}

test('civil-date sections preserve authoritative ties, Today/Yesterday and month/year/leap boundaries', () => {
  const record = (id: string, date: string) => ({ id, transactionDate: date }) as FinanceTransaction;
  const records = [record('z', '2026-01-01'), record('a', '2026-01-01'), record('c', '2025-12-31'), record('b', '2025-12-30')];
  const sections = transactionSections(records, '2026-01-01');
  assert.deepEqual(sections.map((section) => section.data.map((row) => row.id)), [['z', 'a'], ['c'], ['b']]);
  assert.deepEqual(sections.slice(0, 2).map((section) => section.title), ['Today', 'Yesterday']);
  assert.equal(sections[2].title, pickerValue('2025-12-30').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }));
  assert.equal(transactionDateHeading('2024-02-29', '2024-03-01'), 'Yesterday');
  assert.equal(transactionDateHeading('2026-09-30', '2026-10-01'), 'Yesterday');
  assert.equal(transactionDateHeading('2026-10-05', '2026-10-08'), pickerValue('2026-10-05').toLocaleDateString(undefined, { day: 'numeric', month: 'short' }));
  assert.deepEqual(transactionSections([], today), []);
});

test('date headings keep civil days in distant device zones without UTC conversion', () => {
  const originalZone = process.env.TZ;
  try {
    for (const zone of ['America/Sao_Paulo', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
      process.env.TZ = zone;
      assert.equal(transactionDateHeading('2026-01-01', localDateString(new Date(2026, 0, 1, 0, 5))), 'Today');
      assert.equal(transactionDateHeading('2025-12-31', '2026-01-01'), 'Yesterday');
      const older = transactionDateHeading('2025-12-30', '2026-01-01');
      assert.equal(older, new Date(2025, 11, 30, 12).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }));
    }
  } finally { if (originalZone === undefined) delete process.env.TZ; else process.env.TZ = originalZone; }
});

for (const type of ['income', 'expense'] as const) test(`manual ${type} row prioritizes description and complete signed amount, omits Note and keeps management contextual`, async (t) => {
  const f = await initialized(t);
  const category = f.finance.createCategory('A long historical category label that should wrap completely', type);
  const title = 'A long description identifying an actual transaction without cutting off the monetary amount';
  const id = f.create({ type, categoryId: category.id, amount: formatBrlInput(maxAmountMinor), description: title, note: 'Private supporting note, not a row preview' });
  f.finance.deleteCategory(category.id);
  const page = f.finance.readLedgerPage(); const transaction = page.transactions.find((row) => row.id === id)!;
  const display = transactionPresentation(transaction, page.categories, today);
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width: 280, height: 800, fontScale: 2, scale: 1 }));
  let edits = 0, deletes = 0;
  const app = await mount(createElement(ContextMenuHost, { children: createElement(TransactionRow, { transaction, categories: page.categories, today, onEdit() { edits++; }, onDelete() { deletes++; } }) }), f.db); t.after(app.unmount);
  assert.ok(!app.container.textContent.includes(transaction.note!));
  assert.ok(!app.container.textContent.includes('Uncategorized'));
  assert.ok(app.container.textContent.includes(category.name));
  const amount = app.nodes().find((node) => node.props?.testID === 'transaction-amount')!;
  const description = app.nodes().find((node) => node.props?.testID === 'transaction-description')!;
  assert.equal(amount.textContent, `${type === 'income' ? '+' : '-'}${formatBrlAmount(maxAmountMinor)}`);
  assert.equal(amount.props.numberOfLines, undefined); assert.equal(description.props.numberOfLines, undefined);
  assert.equal(amount.props.themeColor, type === 'income' ? 'success' : 'textPrimary');
  assert.equal(flatten(description.parentNode!.props.style).flexWrap, 'wrap');
  const body = app.find('Pressable', display.accessibilityLabel);
  assert.ok(String(body.props.accessibilityLabel).includes(type === 'income' ? 'Income' : 'Expense'));
  assert.ok(flatten(body.props.style).minHeight >= 44);
  assert.ok(!app.nodes().some((node) => node.props?.label === 'Delete'));
  await app.tapSet(display.accessibilityLabel); assert.equal(edits, 1);
  await menu(app, `Transaction options for ${title}`, `Delete ${title}`); assert.equal(deletes, 1);
  assert.equal(app.find('FormButton', `Transaction options for ${title}`).props.expanded, false);
  integrity(f);
});

test('ledger data pages are 40/40/15 with no gaps or duplicates at tied dates/timestamps, excluding soft deletion', async (t) => {
  const f = await initialized(t);
  const tiedFinance = createFinanceDataAccess(f.db, randomUUID, () => pickerValue(today).getTime());
  for (let i = 0; i < 96; i++) tiedFinance.createTransaction({ ...transactionDraft(), description: `Transaction ${i}`, amount: '1', transactionDate: i < 60 ? today : addDays(today, -1) });
  const removed = tiedFinance.read().transactions[8].id; tiedFinance.deleteTransaction(removed);
  const full = f.measure(() => tiedFinance.read());
  const first = f.measure(() => tiedFinance.readLedgerPage());
  const second = f.measure(() => tiedFinance.readLedgerPage(40, first.value.next!));
  const third = tiedFinance.readLedgerPage(40, second.value.next!);
  assert.deepEqual([first.value.transactions.length, second.value.transactions.length, third.transactions.length], [40, 40, 15]);
  assert.equal(third.next, null);
  assert.deepEqual([...first.value.transactions, ...second.value.transactions, ...third.transactions].map((row) => row.id), full.value.transactions.map((row) => row.id));
  for (const page of [first, second]) {
    const query = page.statements.find((statement) => /^select .* from "finance_transactions"/i.test(statement.sql))!;
    assert.match(query.sql, /limit \?/); assert.ok(query.rows <= 41);
    assert.equal(page.statements.filter((statement) => /^select /i.test(statement.sql)).length, 4, 'One ledger read, two batched source reads, categories; no per-row query');
  }
  assert.ok(!first.value.transactions.some((row) => row.id === removed));
  assert.throws(() => tiedFinance.readLedgerPage(0), /page size/i);
  t.diagnostic(`95 ledger records: full read ${full.count} statements/${full.rows} rows; first page ${first.count} statements/${first.rows} rows (41 transaction rows, 40 shown).`);
  integrity(f);
});

test('Transactions UI loads older pages incrementally and retains the loaded span across page/refresh failures', async (t) => {
  const f = await initialized(t); for (let i = 0; i < 95; i++) f.create({ description: `Entry ${i}` });
  const initial = f.finance.read().transactions.map((row) => row.id);
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'transactions' }), f.db); t.after(app.unmount);
  assert.equal(rows(app).length, 40);
  assert.ok(runtime.fixture.reads.includes('finance.readLedgerPage')); assert.ok(!runtime.fixture.reads.includes('finance.read'));
  const read2 = await f.measureAsync(() => app.press('Load older transactions'));
  assert.equal(rows(app).length, 80);
  const ledgerQuery = read2.statements.find((statement) => /^select .* from "finance_transactions"/i.test(statement.sql))!;
  assert.ok(ledgerQuery.rows <= 41); assert.match(ledgerQuery.sql, /"transaction_date" < \?/);
  runtime.fixture.failures.add('finance.readLedgerPage'); await app.press('Load older transactions');
  assert.equal(rows(app).length, 80); assert.ok(app.find('FormButton', 'Retry'));
  runtime.fixture.failures.clear(); await app.press('Retry'); assert.equal(rows(app).length, 80);
  await app.press('Load older transactions'); assert.equal(rows(app).length, 95);
  const visibleDescriptions = app.nodes().filter((node) => node.props?.testID === 'transaction-description').map((node) => node.textContent);
  assert.deepEqual(visibleDescriptions, f.finance.read().transactions.map((row) => row.description));
  assert.equal(new Set(initial).size, 95);
  assert.ok(!app.nodes().some((node) => node.props?.label === 'Load older transactions'));
  await app.refocus(); assert.equal(rows(app).length, 95);
});

test('FAB belongs only to Transactions, clears final content, and header Categories uses the anchored host', async (t) => {
  const f = await initialized(t); const app = await mount(createElement(screens.FinanceScreen), f.db); t.after(app.unmount);
  for (const destination of ['Overview', 'Commitments', 'Work']) {
    await app.press(destination); assert.ok(!app.nodes().some((node) => node.props?.accessibilityLabel === 'Add transaction'));
  }
  await app.press('Transactions');
  const fab = app.find('Pressable', 'Add transaction'); assert.equal(fab.props.accessibilityRole, 'button');
  const fabStyle = flatten((fab.props.style as (state: { pressed: boolean }) => unknown)({ pressed: false }));
  assert.equal(fabStyle.position, 'absolute');
  assert.equal(flatten(app.find('SectionList').props.contentContainerStyle).paddingBottom, floatingAddClearance);
  assert.ok(floatingAddClearance >= fabStyle.height + fabStyle.bottom);
  assert.deepEqual(app.find('SafeAreaView').props.edges, { top: true, bottom: true, left: true, right: true });
  assert.ok(app.container.textContent.includes('No transactions yet'));
  await app.tapSet('Add transaction'); assert.ok(app.find('FormField', 'Amount *')); await app.press('Cancel');
  await app.press('Transactions options'); assert.equal(app.find('FormButton', 'Transactions options').props.expanded, true);
  const overlay = () => app.nodes().find((node) => node.props?.['aria-label'] === 'Transactions options' && node.props?.role === 'dialog');
  assert.ok(overlay()); assert.equal((overlay()!.props.style as { position: string }).position, 'absolute');
  assert.ok(!app.nodes().some((node) => node.kind === 'Modal'));
  await app.tapSet('Close transactions options'); assert.ok(!overlay());
  await app.press('Transactions options'); await app.press('Categories'); assert.ok(!overlay()); await settle();
  assert.equal(app.find('FormButton', 'Transactions options').props.expanded, false);
  assert.ok(app.find('Modal')); assert.ok(app.find('FormField', 'Category name *'));
});

test('initial ledger failure does not show empty rows or enable Add until authoritative Retry', async (t) => {
  const f = await initialized(t);
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'transactions' }), f.db, ['finance.readLedgerPage']); t.after(app.unmount);
  assert.ok(!app.container.textContent.includes('No transactions yet'));
  assert.equal(app.find('Pressable', 'Add transaction').props.disabled, true);
  runtime.fixture.failures.clear(); await app.press('Retry');
  assert.ok(app.container.textContent.includes('No transactions yet'));
  assert.equal(app.find('Pressable', 'Add transaction').props.disabled, false);
});

test('manual Create/Edit/Delete reconcile Overview exactly while editor retains native money/category/date rules', async (t) => {
  const f = await initialized(t); const category = f.finance.createCategory('Food custom', 'expense');
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'transactions' }), f.db); t.after(app.unmount);
  await app.tapSet('Add transaction');
  for (const heading of ['Transaction', 'Details', 'Date']) assert.ok(app.nodes().some((node) => node.props?.accessibilityRole === 'header' && node.textContent === heading));
  await app.change('Description *', 'Groceries'); await app.change('Amount *', 'R$ 82,40'); await app.change('Note', 'Remember the receipt');
  const categoryField = app.find('SelectField', 'Category');
  await act(() => (categoryField.props.onChange as (value: string) => void)(category.id));
  const options = categoryField.props.options as { value: string | null }[];
  assert.ok(options.some((option) => option.value === null));
  assert.ok(!options.some((option) => f.finance.readCategories().some((row) => row.type === 'income' && row.id === option.value)));
  for (const amount of ['0', '-1', '1,001']) { await app.change('Amount *', amount); await app.press('Save'); assert.equal(rows(app).length, 0); assert.equal(app.find('FormField', 'Amount *').props.value, amount); }
  await app.change('Amount *', '82,40'); await app.change('Date *', addDays(today, 1)); await app.press('Save'); assert.equal(rows(app).length, 0);
  await app.change('Date *', today); await app.press('Save');
  const analytics = () => f.finance.readDashboard(periodBounds('month', today)).analytics;
  assert.equal(analytics().expensesMinor, 8240n); assert.equal(analytics().netFlowMinor, -8240n);
  assert.ok(!app.container.textContent.includes('Remember the receipt'));
  await open(app, 'Groceries'); assert.equal(app.find('FormField', 'Note').props.value, 'Remember the receipt');
  const type = app.find('SegmentedControl', 'Type *'); await act(() => (type.props.onChange as (value: string) => void)('income'));
  assert.equal(app.find('SelectField', 'Category').props.value, null);
  await app.change('Description *', 'Refund'); await app.change('Amount *', '120'); await app.press('Save');
  assert.equal(analytics().expensesMinor, 0n); assert.equal(analytics().incomeMinor, 12000n); assert.equal(analytics().netFlowMinor, 12000n);
  await menu(app, 'Transaction options for Refund', 'Delete Refund'); assert.equal(f.finance.readLedgerPage().transactions.length, 1);
  await app.confirm('Delete'); assert.equal(rows(app).length, 0); assert.equal(analytics().incomeMinor, 0n);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM finance_transactions').get()!.n, 1, 'Deleted manual record is retained');
  integrity(f);
});

test('archived historical label survives editor open/save, active choices and New category still select immediately', async (t) => {
  const f = await initialized(t); const category = f.finance.createCategory('Pets historical', 'expense'); f.create({ categoryId: category.id }); f.finance.deleteCategory(category.id);
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'transactions' }), f.db); t.after(app.unmount);
  assert.ok(app.container.textContent.includes('Pets historical')); await open(app, 'Groceries');
  const selector = app.find('SelectField', 'Category');
  assert.equal(selector.props.value, category.id); assert.equal(selector.props.displayValue, 'Pets historical (archived)');
  assert.ok(!(selector.props.options as { value: string | null }[]).some((option) => option.value === category.id));
  await app.press('Save'); assert.equal(f.finance.readLedgerPage().transactions[0].categoryId, category.id);
  await open(app, 'Groceries');
  const action = app.find('SelectField', 'Category').props.action as { label: string; render: (controls: unknown) => { props: { onSubmit: (name: string, done: () => void) => void } } };
  assert.equal(action.label, '+ New category'); let closed = false;
  const form = action.render({}); await act(() => form.props.onSubmit('New expense choice', () => { closed = true; }));
  assert.equal(closed, true); const added = f.finance.readCategories().find((row) => row.name === 'New expense choice')!;
  assert.equal(app.find('SelectField', 'Category').props.value, added.id); await app.press('Save');
  assert.equal(f.finance.readLedgerPage().transactions[0].categoryId, added.id);
  await open(app, 'Groceries'); await act(() => (app.find('SelectField', 'Category').props.onChange as (value: null) => void)(null)); await app.press('Save');
  assert.equal(f.finance.readLedgerPage().transactions[0].categoryId, null);
});

async function linkedWork(f: Awaited<ReturnType<typeof initialized>>) {
  const client = f.work.createCounterparty('João Inglês');
  const jobs = ['Inventory Software', 'Training'].map((title) => f.work.create({ ...workDraft(null, today), counterpartyId: client.id, title, description: 'Supporting job description', compensationType: 'fixed', fixedAmount: '600' }));
  const id = f.work.recordPayment({ counterpartyId: client.id, allocations: jobs.map((workEntryId) => ({ workEntryId, amount: '300' })), categoryId: null, paymentDate: addDays(today, -1) });
  return { id, jobs, client };
}

test('source metadata is batched only for visible payments and retains archived Client labels', async (t) => {
  const f = await initialized(t); const paid = await linkedWork(f);
  f.work.archiveCounterparty(paid.client.id);
  // Newer manual rows put the receipt on the next page.
  for (let i = 0; i < 41; i++) f.create({ description: `New ${i}` });
  const first = f.measure(() => f.finance.readLedgerPage());
  assert.equal(first.value.sources[paid.id], undefined);
  const workQuery = first.statements.find((statement) => statement.sql.includes('from "work_payment_allocations"'))!;
  assert.equal(workQuery.rows, 0); assert.ok(!workQuery.params.includes(paid.id));
  const older = f.measure(() => f.finance.readLedgerPage(40, first.value.next!));
  const source = older.value.sources[paid.id]; assert.equal(source.kind, 'work');
  if (source.kind === 'work') assert.equal(source.clientName, 'João Inglês');
  assert.equal(older.statements.filter((statement) => /^select /i.test(statement.sql)).length, 4);
  integrity(f);
});

test('linked editor draft and readable locks survive summary failure and Retry after source Undo', async (t) => {
  const f = await initialized(t); const paid = await linkedWork(f); const page = f.finance.readLedgerPage();
  const title = transactionPresentation(page.transactions[0], page.categories, today, page.sources[paid.id]).title;
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'transactions' }), f.db); t.after(app.unmount);
  await open(app, title); await app.press('Edit details'); await settle(); await app.change('Note', 'Unsaved receipt draft');
  const field = app.find('FormField', 'Note'); const modal = app.find('Modal');
  runtime.fixture.failures.add('finance.readLedgerPage'); await app.resume(); await app.refocus();
  assert.equal(app.find('Modal'), modal); assert.equal(app.find('FormField', 'Note'), field); assert.equal(field.props.value, 'Unsaved receipt draft');
  f.work.undoPayment(paid.id); runtime.fixture.failures.clear(); await app.press('Retry refresh');
  assert.equal(app.find('FormField', 'Note'), field); assert.equal(app.find('FormField', 'Amount *').props.editable, false);
  await app.press('Save'); assert.equal(field.props.value, 'Unsaved receipt draft'); assert.match(app.find('FormError').textContent, /no longer available/);
  assert.equal(f.finance.readLedgerPage().transactions.length, 0); integrity(f);
});

test('long source titles and category labels retain complete money and source accessibility at large text', async (t) => {
  const f = await initialized(t); const client = f.work.createCounterparty('A long Client label that remains readable');
  const title = 'A long Job Title explaining the project and deliverable that should wrap across several lines';
  const job = f.work.create({ ...workDraft(null, today), counterpartyId: client.id, title, compensationType: 'fixed', fixedAmount: formatBrlInput(maxAmountMinor) });
  f.work.recordPayment({ counterpartyId: client.id, allocations: [{ workEntryId: job, amount: formatBrlInput(maxAmountMinor) }], paymentDate: today, categoryId: null });
  const name = 'A long Commitment name covering a household obligation that should remain understandable';
  const id = f.commitments.create({ ...commitmentDraft(null, undefined, today), title: name, amount: formatBrlInput(maxAmountMinor) });
  f.commitments.pay(f.commitments.readHistory(id).outstanding[0], formatBrlInput(maxAmountMinor), today);
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width: 280, height: 800, fontScale: 2, scale: 1 }));
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'transactions' }), f.db); t.after(app.unmount);
  for (const row of rows(app)) {
    const amount = app.nodes(row).find((node) => node.props?.testID === 'transaction-amount')!;
    const heading = app.nodes(row).find((node) => node.props?.testID === 'transaction-description')!;
    assert.equal(amount.props.numberOfLines, undefined); assert.equal(heading.props.numberOfLines, undefined);
    assert.ok(amount.textContent.endsWith(formatBrlAmount(maxAmountMinor)));
    assert.ok(!app.nodes(row).some((node) => node.props?.disabled || node.props?.accessibilityState && (node.props.accessibilityState as { disabled: boolean }).disabled));
  }
  assert.ok(app.container.textContent.includes(title + ' payment')); assert.ok(app.container.textContent.includes(name));
});

test('combined Work receipt shows Job Title first, all covered jobs in detail, protected safe editing and source navigation', async (t) => {
  const f = await initialized(t); assert.equal(f.finance.readLedgerPage().transactions.length, 0);
  const paid = await linkedWork(f); const page = f.finance.readLedgerPage();
  const source = page.sources[paid.id]; assert.equal(source.kind, 'work'); if (source.kind !== 'work') return;
  assert.deepEqual(new Set(source.jobs.map((job) => job.id)), new Set(paid.jobs));
  const title = `${source.jobs[0].title} + 1 more payment`;
  assert.equal(transactionSections(page.transactions, today)[0].title, 'Yesterday');
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'transactions', initialRecordId: 'unrelated-opening-context' }), f.db); t.after(app.unmount);
  assert.ok(app.container.textContent.includes(title)); assert.ok(app.container.textContent.includes('João Inglês · Work'));
  assert.ok(!app.nodes().some((node) => String(node.props?.accessibilityLabel).startsWith('Transaction options for')));
  await open(app, title);
  const detail = app.find('Modal');
  assert.ok(detail.textContent.includes(title)); assert.ok(detail.textContent.includes('João Inglês'));
  assert.equal(app.nodes(detail).filter((node) => node.props?.accessibilityLabel === 'Source: Work').length, 1);
  assert.ok(!detail.textContent.includes('This transaction is managed by Work.'));
  assert.ok(!detail.textContent.includes('Type and amount stay linked'));
  assert.ok(app.container.textContent.includes('Covered jobs')); for (const job of source.jobs) assert.ok(app.container.textContent.includes(job.title));
  await app.press('Edit details'); await settle();
  assert.equal(app.find('SegmentedControl', 'Type *').props.disabled, true); assert.equal(app.find('FormField', 'Amount *').props.editable, false);
  await app.change('Note', 'Work receipt note'); await app.change('Date *', today); await app.press('Save');
  assert.equal(f.finance.readLedgerPage().transactions[0].note, 'Work receipt note'); assert.equal(transactionSections(f.finance.readLedgerPage().transactions, today)[0].title, 'Today');
  assert.equal(f.finance.readDashboard(periodBounds('month', today)).analytics.incomeMinor, 60000n);
  const transaction = f.finance.readLedgerPage().transactions[0];
  assert.throws(() => f.finance.editTransaction(paid.id, { ...transactionDraft(transaction), type: 'expense' }), /remain Income/);
  assert.throws(() => f.finance.editTransaction(paid.id, { ...transactionDraft(transaction), amount: '601' }), /match its allocations/);
  assert.throws(() => f.finance.deleteTransaction(paid.id), /Undo payment in Work/);
  await open(app, title); assert.ok(app.container.textContent.includes('Work receipt note')); await app.press('Open Work'); await settle();
  assert.equal(app.find('FormButton', 'Work').props.selected, true); assert.ok(!app.nodes().some((node) => node.kind === 'Modal'));
  f.work.undoPayment(paid.id); await app.press('Transactions'); assert.equal(rows(app).length, 0);
  assert.equal(f.finance.readDashboard(periodBounds('month', today)).analytics.incomeMinor, 0n); integrity(f);
});

test('Commitment actual payment shows source/name, safe fields remain editable, Undo removes ledger row exactly', async (t) => {
  const f = await initialized(t); const category = f.finance.createCategory('Utilities past', 'expense');
  const id = f.commitments.create({ ...commitmentDraft(null, undefined, today), title: 'Electricity', amount: '185,20', categoryId: category.id });
  const due = f.commitments.readHistory(id).outstanding[0]; assert.equal(f.finance.readLedgerPage().transactions.length, 0);
  const paymentId = f.commitments.pay(due, '190,30', today); f.finance.deleteCategory(category.id);
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'transactions' }), f.db); t.after(app.unmount);
  assert.ok(app.container.textContent.includes('Electricity')); assert.ok(app.container.textContent.includes('-R$ 190,30')); assert.ok(app.container.textContent.includes('Utilities past'));
  await open(app, 'Electricity');
  const detail = app.find('Modal'); assert.ok(detail.textContent.includes('Electricity'));
  assert.equal(app.nodes(detail).filter((node) => node.props?.accessibilityLabel === 'Source: Commitment').length, 1);
  assert.ok(!detail.textContent.includes('This expense was created from a Commitment payment.'));
  assert.ok(!detail.textContent.includes('use Undo in Commitments to remove it'));
  await app.press('Edit details'); await settle(); assert.equal(app.find('SegmentedControl', 'Type *').props.disabled, true);
  assert.notEqual(app.find('FormField', 'Amount *').props.editable, false);
  await app.change('Amount *', '201,09'); await app.change('Date *', addDays(today, -1)); await app.change('Note', 'Corrected receipt'); await app.press('Save');
  const transaction = f.finance.readLedgerPage().transactions[0]; assert.equal(transaction.amountMinor, 20109); assert.equal(transaction.categoryId, category.id);
  assert.equal(transactionSections([transaction], today)[0].title, 'Yesterday');
  assert.throws(() => f.finance.editTransaction(paymentId, { ...transactionDraft(transaction), type: 'income' }), /remain an Expense/);
  assert.throws(() => f.finance.deleteTransaction(paymentId), /Undo payment/);
  assert.equal(f.finance.readDashboard({ ...periodBounds('month', today), startDate: addDays(today, -1) }).analytics.expensesMinor, 20109n);
  await open(app, 'Electricity'); await app.press('Open Commitments'); await settle(); assert.equal(app.find('FormButton', 'Commitments').props.selected, true);
  f.commitments.reopen(due.id!); await app.press('Transactions'); assert.equal(rows(app).length, 0);
  assert.equal(f.finance.readDashboard(periodBounds('month', today)).analytics.expensesMinor, 0n); integrity(f);
});

test('linked iOS detail waits for native dismissal before opening the protected editor', async (t) => {
  const f = await initialized(t); const paid = await linkedWork(f);
  const platform = (runtime.native as { Platform: { OS: string } }).Platform; const previous = platform.OS; platform.OS = 'ios'; t.after(() => { platform.OS = previous; });
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'transactions' }), f.db); t.after(app.unmount);
  const page = f.finance.readLedgerPage(); const title = transactionPresentation(page.transactions[0], page.categories, today, page.sources[paid.id]).title;
  await open(app, title); const closed = app.find('Modal').props.onDismiss as () => void;
  await app.press('Edit details'); assert.ok(!app.nodes().some((node) => node.kind === 'FormField'));
  await act(closed); assert.ok(app.find('FormField', 'Description *')); assert.equal(app.nodes().filter((node) => node.kind === 'Modal').length, 1);
  assert.equal(app.find('FormField', 'Amount *').props.editable, false);
});

test('Android editor retains native date picker with a today maximum and local callback date', async (t) => {
  const f = await initialized(t);
  const platform = (runtime.native as { Platform: { OS: string } }).Platform; const previous = platform.OS; platform.OS = 'android'; t.after(() => { platform.OS = previous; });
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'transactions' }), f.db); t.after(app.unmount); await app.tapSet('Add transaction');
  await act(() => (app.find('FormSelect', 'Date *').props.onPress as () => void)());
  const picker = runtime.fixture.pickers.at(-1)!; assert.equal(picker.mode, 'date'); assert.equal(localDateString(picker.maximumDate as Date), today);
  await act(() => (picker.onValueChange as (event: unknown, date: Date) => void)({}, pickerValue(addDays(today, -1))));
  await app.change('Description *', 'Earlier receipt'); await app.change('Amount *', '25,90'); await app.press('Save');
  assert.equal(f.finance.readLedgerPage().transactions[0].transactionDate, addDays(today, -1));
});

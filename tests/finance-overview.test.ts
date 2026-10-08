/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { test, type TestContext } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { act, createElement, type ReactNode } from 'react';

import { createFinanceDataAccess } from '../src/features/finance/data';
import { createCommitmentDataAccess } from '../src/features/finance/commitments/data';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import { spendingShareLabel, stackFinanceMetrics } from '../src/features/finance/dashboard-presentation';
import { transactionDraft } from '../src/features/finance/form';
import { formatBrlAmount, formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { periodBounds, periodLabel } from '../src/features/finance/periods';
import { seedFinanceCategories } from '../src/features/finance/seed';
import { createWorkDataAccess } from '../src/features/finance/work/data';
import { workDraft } from '../src/features/finance/work/form';
import { localDateString } from '../src/utils/calendar';
import { bundledMigrations, database } from './helpers/database';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const require = createRequire(import.meta.url);
const { renderToStaticMarkup } = require('react-dom/server') as { renderToStaticMarkup: (node: ReactNode) => string };
const today = localDateString(new Date());
type App = Awaited<ReturnType<typeof mount>>;
async function initialized(t: TestContext) {
  const f = database(); await migrate(f.db, bundledMigrations); seedFinanceCategories(f.db);
  t.after(() => f.sqlite.close());
  return { ...f, finance: createFinanceDataAccess(f.db, randomUUID) };
}
function metric(app: App, label: string) {
  const rows = app.nodes().filter((node) => node.kind === 'View' && String(node.props?.accessibilityLabel).startsWith(`${label}, `));
  assert.equal(rows.length, 1); return rows[0];
}
function amounts(app: App) { return ['Net Flow', 'Income', 'Expenses'].map((label) => metric(app, label).textContent); }
function categories(app: App) {
  return app.nodes().filter((node) => node.kind === 'View' && String(node.props?.accessibilityLabel).endsWith('of expenses'));
}
async function period(app: App, kind: string) {
  await act(() => (app.find('SegmentedControl', 'Period').props.onChange as (kind: string) => void)(kind));
}
const flatten = (style: unknown) => Object.assign({}, ...[style].flat(Infinity));

test('Finance lands on Overview with compact navigation, Month and only destination-specific management actions', async (t) => {
  const f = await initialized(t); const app = await mount(createElement(screens.FinanceScreen), f.db); t.after(app.unmount);
  for (const label of ['Overview', 'Transactions', 'Commitments', 'Work']) {
    const button = app.find('FormButton', label);
    assert.equal(button.props.variant, 'navigation'); assert.equal(button.props.selected, label === 'Overview');
    assert.equal(button.props.compactNavigation, true);
  }
  assert.equal(app.find('SegmentedControl', 'Period').props.value, 'month');
  assert.ok(!app.nodes().some((node) => node.kind === 'FormButton' && ['Add transaction', 'Categories'].includes(String(node.props.label))));
  assert.equal(app.find('SafeAreaView').props.edges && flatten(app.find('FlatList').props.style).flex, 1);
  assert.equal(app.find('FlatList').props.contentInsetAdjustmentBehavior, 'never');
  assert.ok(app.nodes().some((node) => node.kind === 'ThemedText' && node.props.type === 'screenTitle' && node.textContent === 'Finance'));
  assert.ok(app.nodes().some((node) => node.kind === 'ThemedText' && node.textContent === 'Spending' && node.props.accessibilityRole === 'header'));
});

for (const width of [375, 390, 414]) for (const fontScale of [1, 1.2, 2]) {
  test(`Finance selection preserves a single navigation row and item allocation at ${width} points, font scale ${fontScale}`, async (t) => {
    t.mock.method(runtime.native as { useWindowDimensions: () => object }, 'useWindowDimensions', () => ({ width, height: 800, fontScale, scale: 1 }));
    const f = await initialized(t); const app = await mount(createElement(screens.FinanceScreen), f.db); t.after(app.unmount);
    const labels = ['Overview', 'Transactions', 'Commitments', 'Work'];
    const strip = app.find('ScrollView', 'Finance destinations');
    const layout = flatten(strip.props.contentContainerStyle);
    assert.equal(strip.props.horizontal, true); assert.equal(layout.flexDirection, 'row'); assert.equal(layout.flexWrap, 'nowrap');
    assert.equal(layout.flexGrow, 1); assert.equal(strip.props.showsHorizontalScrollIndicator, true);
    const items = labels.map((label) => {
      const button = app.find('FormButton', label); const container = button.parentNode!;
      const style = flatten(container.props.style);
      assert.equal(style.flexGrow, 1); assert.equal(style.flexShrink, 0);
      return { label, button, container, style, children: button.childNodes.length };
    });
    for (const selected of labels) {
      await app.press(selected);
      assert.equal(app.find('ScrollView', 'Finance destinations'), strip);
      assert.deepEqual(flatten(strip.props.contentContainerStyle), layout);
      for (const item of items) {
        const button = app.find('FormButton', item.label);
        assert.equal(button, item.button); assert.equal(button.parentNode, item.container);
        assert.equal(button.textContent, item.label); assert.equal(button.childNodes.length, item.children);
        assert.equal(button.props.selected, item.label === selected); assert.equal(button.props.compactNavigation, true);
        assert.deepEqual(flatten(item.container.props.style), item.style);
      }
    }
  });
}

test('Overview / Transactions / Commitments / Work / Overview preserves ledger records, period and scroll positions', async (t) => {
  const f = await initialized(t);
  f.finance.createTransaction({ ...transactionDraft(), description: 'Original income', type: 'income', amount: '120' });
  const commitments = createCommitmentDataAccess(f.db, randomUUID);
  commitments.create({ ...commitmentDraft(null, undefined, today), title: 'Rent', amount: '300' });
  const work = createWorkDataAccess(f.db, randomUUID); const client = work.createCounterparty('Client');
  work.create({ ...workDraft(null, today), counterpartyId: client.id, title: 'Outstanding work', description: 'Outstanding work', compensationType: 'fixed', fixedAmount: '1000' });
  const beforeCommitments = commitments.read(); const beforeWork = work.readOverview();
  const before = f.finance.read();
  const app = await mount(createElement(screens.FinanceScreen), f.db); t.after(app.unmount);
  await app.press('Previous month'); const oldPeriod = app.nodes().find((node) => node.kind === 'ThemedText' && node.props.type === 'cardTitle')!.textContent;
  await act(() => (app.find('FlatList').props.onScroll as (event: unknown) => void)({ nativeEvent: { contentOffset: { y: 240 } } }));
  await app.press('Transactions'); assert.equal(app.find('Pressable', 'Add transaction').props.accessibilityRole, 'button');
  await act(() => (app.find('SectionList').props.onScroll as (event: unknown) => void)({ nativeEvent: { contentOffset: { y: 100 } } }));
  await app.press('Commitments'); assert.ok(app.find('FormButton', 'Add commitment'));
  await app.press('Work'); assert.ok(app.find('FormButton', 'Add work'));
  await app.press('Overview');
  assert.deepEqual(app.find('FlatList').props.contentOffset, { x: 0, y: 240 });
  assert.ok(app.nodes().some((node) => node.textContent === oldPeriod));
  assert.equal(app.find('SegmentedControl', 'Period').props.value, 'month');
  await app.press('Transactions'); assert.deepEqual(app.find('SectionList').props.contentOffset, { x: 0, y: 100 });
  assert.deepEqual(f.finance.read(), before);
  assert.deepEqual(commitments.read(), beforeCommitments); assert.deepEqual(work.readOverview(), beforeWork);
});

test('Week / Month / Year selection and compact previous/next/current actions retain period rules', async (t) => {
  const f = await initialized(t); const app = await mount(createElement(screens.FinanceScreen), f.db); t.after(app.unmount);
  for (const kind of ['week', 'month', 'year'] as const) {
    await period(app, kind); assert.equal(app.find('SegmentedControl', 'Period').props.value, kind);
    assert.equal(app.find('FormButton', `Next ${kind}`).props.disabled, true);
    assert.equal(app.find('FormButton', `Previous ${kind}`).props.variant, 'quiet');
    assert.ok(app.nodes().some((node) => node.kind === 'ThemedText' && node.textContent === periodLabel(periodBounds(kind, today))));
    await app.press(`Previous ${kind}`); assert.equal(app.find('FormButton', `Next ${kind}`).props.disabled, false);
    await app.press(`Next ${kind}`); assert.equal(app.find('FormButton', `Next ${kind}`).props.disabled, true);
    await app.press(`Previous ${kind}`); await app.press(`Current ${kind}`);
    assert.equal(app.find('FormButton', `Next ${kind}`).props.disabled, true);
  }
});

for (const [name, income, expenses] of [['positive', '4250', '850,50'], ['negative', '100', '420'], ['zero', '100', '100']] as const) {
  test(`Overview displays exact ${name} Net Flow before secondary Income/Expenses without error styling`, async (t) => {
    const f = await initialized(t);
    f.finance.createTransaction({ ...transactionDraft(), type: 'income', description: 'Income', amount: income });
    f.finance.createTransaction({ ...transactionDraft(), description: 'Expense', amount: expenses });
    const analytics = f.finance.readDashboard(periodBounds('month', today)).analytics;
    const app = await mount(createElement(screens.FinanceScreen), f.db); t.after(app.unmount);
    assert.deepEqual(amounts(app), [
      `Net Flow${formatBrlAmount(analytics.netFlowMinor)}`, `Income${formatBrlAmount(analytics.incomeMinor)}`, `Expenses${formatBrlAmount(analytics.expensesMinor)}`,
    ]);
    assert.equal(metric(app, 'Net Flow').props.accessibilityLabel, `Net Flow, ${name}, ${formatBrlAmount(analytics.netFlowMinor)}`);
    const netValue = metric(app, 'Net Flow').childNodes.find((node) => node.props?.type === 'metric')!;
    assert.equal(netValue.props.themeColor, 'textPrimary');
    assert.ok(app.nodes().indexOf(metric(app, 'Net Flow')) < app.nodes().indexOf(metric(app, 'Income')));
    assert.ok(!app.nodes().some((node) => node.props?.accessibilityRole === 'alert'));
    assert.equal(categories(app)[0].props.accessibilityLabel, `No category, ${formatBrlAmount(analytics.expensesMinor)}, approximately 100% of expenses`);
  });
}

test('empty and income-only periods keep all metrics and quiet zero-expense breakdown without invalid shares', async (t) => {
  const f = await initialized(t); const app = await mount(createElement(screens.FinanceScreen), f.db); t.after(app.unmount);
  assert.deepEqual(amounts(app), ['Net FlowR$ 0,00', 'IncomeR$ 0,00', 'ExpensesR$ 0,00']);
  assert.ok(app.container.textContent.includes('No transactions in this period.')); assert.equal(categories(app).length, 0);
  f.finance.createTransaction({ ...transactionDraft(), type: 'income', description: 'Income', amount: '120' }); await app.resume();
  assert.deepEqual(amounts(app), ['Net FlowR$ 120,00', 'IncomeR$ 120,00', 'ExpensesR$ 0,00']);
  assert.ok(app.container.textContent.includes('No expenses in this period.')); assert.equal(categories(app).length, 0);
});

test('many categories use a bounded exact preview, View all and Show less without changing totals or archived labels', async (t) => {
  const f = await initialized(t);
  for (let i = 0; i < 8; i++) {
    const category = f.finance.createCategory(`Spending ${i}`, 'expense');
    f.finance.createTransaction({ ...transactionDraft(), description: `Expense ${i}`, categoryId: category.id, amount: `${i + 1}` });
    if (i === 7) f.finance.deleteCategory(category.id);
  }
  const full = f.finance.readDashboard(periodBounds('month', today)).analytics;
  const app = await mount(createElement(screens.FinanceScreen), f.db); t.after(app.unmount);
  assert.equal(categories(app).length, 5); const initial = amounts(app);
  await app.press('View all'); assert.equal(categories(app).length, 8);
  for (const category of full.spending) assert.ok(categories(app).some((row) => String(row.props.accessibilityLabel).startsWith(`${category.name}, ${formatBrlAmount(category.amountMinor)}, `)));
  assert.equal(full.spending.reduce((sum, row) => sum + row.amountMinor, 0n), full.expensesMinor);
  assert.deepEqual(amounts(app), initial);
  await app.press('Transactions'); await app.press('Overview'); assert.equal(categories(app).length, 8);
  await app.press('Show less'); assert.equal(categories(app).length, 5);
  assert.deepEqual(f.finance.readDashboard(periodBounds('month', today)).analytics, full);
});

test('huge BigInt totals and tiny shares remain exact and secondary amounts stack without ellipses', async (t) => {
  const f = await initialized(t); const large = formatBrlInput(maxAmountMinor);
  const giant = f.finance.createCategory('Giant expense', 'expense'); const tiny = f.finance.createCategory('Tiny expense', 'expense');
  for (let i = 0; i < 2; i++) f.finance.createTransaction({ ...transactionDraft(), description: 'Large expense', categoryId: giant.id, amount: large });
  f.finance.createTransaction({ ...transactionDraft(), description: 'Tiny expense', categoryId: tiny.id, amount: '0,01' });
  const full = f.finance.readDashboard(periodBounds('month', today)).analytics;
  const app = await mount(createElement(screens.FinanceScreen), f.db); t.after(app.unmount);
  assert.equal(full.expensesMinor, BigInt(maxAmountMinor) * 2n + 1n);
  assert.ok(metric(app, 'Net Flow').textContent.includes('-R$ 180.143.985.094.819,83'));
  assert.ok(categories(app).some((node) => node.props.accessibilityLabel === 'Tiny expense, R$ 0,01, less than 1% of expenses'));
  const secondary = app.nodes().find((node) => node.props?.testID === 'finance-secondary-metrics')!;
  assert.equal(flatten(secondary.props.style).flexDirection, 'column');
  for (const node of app.nodes().filter((node) => node.kind === 'ThemedText')) {
    assert.equal(node.props.numberOfLines, undefined); assert.equal(node.props.ellipsizeMode, undefined);
  }
  assert.equal(full.spending.reduce((sum, row) => sum + row.amountMinor, 0n), full.expensesMinor);
});

for (const [width, fontScale, expected] of [[390, 1, 'row'], [390, 2, 'column'], [280, 1, 'column']] as const) {
  test(`metrics adapt at width ${width}, font scale ${fontScale} while internal navigation remains a single row`, async (t) => {
    t.mock.method(runtime.native as { useWindowDimensions: () => object }, 'useWindowDimensions', () => ({ width, height: 800, fontScale, scale: 1 }));
    const f = await initialized(t); const app = await mount(createElement(screens.FinanceScreen), f.db); t.after(app.unmount);
    const secondary = app.nodes().find((node) => node.props?.testID === 'finance-secondary-metrics')!;
    assert.equal(flatten(secondary.props.style).flexDirection, expected);
    const navigation = app.nodes().find((node) => node.props?.accessibilityLabel === 'Finance destinations')!;
    assert.equal(navigation.props.horizontal, true);
    assert.equal(flatten(navigation.props.contentContainerStyle).flexWrap, 'nowrap');
    for (const label of ['Overview', 'Transactions', 'Commitments', 'Work']) assert.ok(app.find('FormButton', label));
  });
}

test('first load is distinct from empty, initial error has no fake zero values and Retry publishes the first dashboard', async (t) => {
  const f = await initialized(t); runtime.fixture.db = f.db;
  const initialMarkup = renderToStaticMarkup(createElement(screens.FinanceScreen));
  assert.ok(!initialMarkup.includes('R$ 0,00'));
  const app = await mount(createElement(screens.FinanceScreen), f.db, ['finance.readDashboard']); t.after(app.unmount);
  assert.ok(!app.container.textContent.includes('R$ 0,00'));
  assert.ok(app.nodes().some((node) => node.props?.accessibilityRole === 'alert'));
  assert.ok(!app.nodes().some((node) => node.kind === 'ActivityIndicator'));
  runtime.fixture.failures.clear(); await app.press('Retry'); assert.equal(amounts(app).length, 3);
});

test('failed dashboard refresh retains exact last-good metrics and successful Retry refreshes them', async (t) => {
  const f = await initialized(t); f.finance.createTransaction({ ...transactionDraft(), description: 'Expense', amount: '100' });
  const app = await mount(createElement(screens.FinanceScreen), f.db); t.after(app.unmount);
  const before = amounts(app); const net = metric(app, 'Net Flow');
  runtime.fixture.failures.add('finance.readDashboard');
  f.finance.createTransaction({ ...transactionDraft(), description: 'New expense', amount: '50' });
  await app.resume(); await app.refocus(); assert.deepEqual(amounts(app), before); assert.equal(metric(app, 'Net Flow'), net);
  assert.ok(!app.nodes().some((node) => node.kind === 'ActivityIndicator'));
  runtime.fixture.failures.clear(); await app.press('Retry');
  assert.ok(metric(app, 'Net Flow').textContent.includes('-R$ 150,00'));
  assert.ok(!app.nodes().some((node) => node.props?.accessibilityRole === 'alert'));
});

test('transaction drafts survive failed refresh in the new shell and saved transactions immediately update Overview', async (t) => {
  const f = await initialized(t); const app = await mount(createElement(screens.FinanceScreen), f.db); t.after(app.unmount);
  await app.press('Transactions'); await app.tapSet('Add transaction');
  await app.change('Description *', 'Working transaction'); await app.change('Amount *', '123,45');
  const description = app.find('FormField', 'Description *'); const modal = app.find('Modal');
  runtime.fixture.failures.add('finance.readLedgerPage'); await app.resume(); await app.refocus();
  assert.equal(app.find('Modal'), modal); assert.equal(app.find('FormField', 'Description *'), description);
  assert.equal(app.find('FormField', 'Amount *').props.value, '123,45');
  runtime.fixture.failures.clear(); await app.press('Retry refresh'); await app.press('Save'); await app.press('Overview');
  assert.ok(metric(app, 'Net Flow').textContent.includes('-R$ 123,45'));
  assert.equal(f.finance.read().transactions[0].description, 'Working transaction');
});

test('display-only share and adaptive layout handle zero, tiny, single, huge and long-amount inputs', () => {
  assert.equal(spendingShareLabel(1n, 0n), '0%'); assert.equal(spendingShareLabel(0n, 5n), '0%');
  assert.equal(spendingShareLabel(1n, 10n ** 40n), '<1%'); assert.equal(spendingShareLabel(5n, 5n), '100%');
  assert.equal(spendingShareLabel(10n ** 40n, 2n * 10n ** 40n), '50%');
  assert.equal(stackFinanceMetrics(358, 1, ['R$ 4.000,00', 'R$ 2.800,00']), false);
  assert.equal(stackFinanceMetrics(358, 2, ['R$ 4.000,00', 'R$ 2.800,00']), true);
  assert.equal(stackFinanceMetrics(358, 1, ['R$ 9.999.999,99', '-R$ 1.234.567,89']), false);
  assert.equal(stackFinanceMetrics(358, 1, ['R$ 180.143.985.094.819,83']), true);
});

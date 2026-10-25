/// <reference types="node" />
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';

import { financeCategoryIcon } from '../src/features/finance/category-icons';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import { categoriesForType, transactionDraft } from '../src/features/finance/form';
import { periodBounds } from '../src/features/finance/periods';
import { builtInFinanceCategories } from '../src/features/finance/seed';
import type { FinanceCategory } from '../src/features/finance/types';
import { localDateString } from '../src/utils/calendar';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const require = createRequire(import.meta.url);
const { FinanceCategoryManager } = require('../src/features/finance/components/category-manager') as typeof import('../src/features/finance/components/category-manager');
type App = Awaited<ReturnType<typeof mount>>;
const today = localDateString(new Date());
const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
async function select(app: App, label: string, value: string) { await act(() => (app.find('SegmentedControl', label).props.onChange as (value: string) => void)(value)); }
async function open(app: App) { await app.press('Transactions options'); await app.press('Categories'); await settle(); }
const visible = (app: App) => app.find('FlatList').props.data as FinanceCategory[];
async function setup(t: TestContext) {
  t.mock.method((runtime.native as { AccessibilityInfo: { isReduceMotionEnabled: () => Promise<boolean> } }).AccessibilityInfo, 'isReduceMotionEnabled', () => Promise.resolve(true));
  const f = await journalDatabase(); f.setTime(today); t.after(() => f.sqlite.close());
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'transactions' }), f.db); t.after(app.unmount);
  await open(app); return { ...f, app };
}

test('Transactions options opens the existing modal, with two owned sections and explicit Back', async t => {
  const { app } = await setup(t);
  assert.ok(app.find('Modal')); assert.ok(app.nodes().some(node => node.props?.testID === 'finance-category-create'));
  assert.ok(app.nodes().some(node => node.props?.testID === 'finance-category-library'));
  assert.ok(app.container.textContent.includes('Manage the categories for your transactions.'));
  assert.equal(app.find('SegmentedControl', 'Type *').props.value, 'expense');
  assert.equal(app.find('SegmentedControl', 'Category origin').props.value, 'builtIn');
  assert.equal(app.find('FormButton', 'Create category').props.disabled, true);
  await app.press('Back to Transactions'); assert.ok(!app.nodes().some(node => node.kind === 'Modal')); assert.ok(app.find('Pressable', 'New transaction'));
});

test('financial type and origin filters are separate, deterministic and preserve the same input draft', async t => {
  const { app, finance } = await setup(t);
  finance.createCategory('Expense custom', 'expense'); finance.createCategory('Income custom', 'income'); await app.resume();
  const field = app.find('FormField', 'Category name *'); await app.change('Category name *', 'Unsubmitted name');
  assert.deepEqual(visible(app).map(category => category.name), ['Entertainment', 'Food', 'Health', 'Housing', 'Other', 'Pets', 'Shopping', 'Subscriptions', 'Transport', 'Utilities']);
  await select(app, 'Category origin', 'custom'); assert.deepEqual(visible(app).map(category => category.name), ['Expense custom']);
  await select(app, 'Type *', 'income'); assert.deepEqual(visible(app).map(category => category.name), ['Income custom']);
  await select(app, 'Category origin', 'builtIn'); assert.deepEqual(visible(app).map(category => category.name), ['Freelance', 'Other', 'Salary']);
  assert.equal(app.find('FormField', 'Category name *'), field); assert.equal(field.props.value, 'Unsubmitted name');
  assert.ok(app.container.textContent.includes('Income categories'));
});

for (const type of ['expense', 'income'] as const) test(`${type} creation uses canonical service, resets name, shows new Custom entry and feedback`, async t => {
  const { app, finance } = await setup(t); await select(app, 'Type *', type);
  await app.change('Category name *', '  Cafe\u0301\t  supplies  '); await app.press('Create category');
  const created = finance.readCategories().find(category => category.name === 'Café supplies' && category.type === type)!;
  assert.ok(created); assert.equal(created.isBuiltIn, false);
  assert.equal(app.find('FormField', 'Category name *').props.value, ''); assert.equal(app.find('FormButton', 'Create category').props.disabled, true);
  assert.equal(app.find('SegmentedControl', 'Type *').props.value, type); assert.equal(app.find('SegmentedControl', 'Category origin').props.value, 'custom');
  assert.equal(visible(app)[0].id, created.id); assert.ok(app.container.textContent.includes('Created “Café supplies”.'));
  assert.ok(categoriesForType(finance.readCategories(), type).some(category => category.id === created.id));
});

test('required and duplicate errors stay beside input; Unicode identity keeps accents and type scope', async t => {
  const { app, finance } = await setup(t);
  await act(() => (app.find('FormField', 'Category name *').props.onSubmitEditing as () => void)());
  assert.equal(app.find('FormField', 'Category name *').props.error, 'Enter a category name.');
  await app.change('Category name *', ' FOOD '); await app.press('Create category');
  assert.ok(String(app.find('FormField', 'Category name *').props.error).includes('already exists'));
  assert.equal(app.find('FormField', 'Category name *').props.value, ' FOOD ');
  await select(app, 'Type *', 'income'); await app.press('Create category'); assert.ok(finance.readCategories().some(category => category.name === 'FOOD' && category.type === 'income'));
  finance.createCategory('Café', 'expense');
  await select(app, 'Type *', 'expense'); await app.change('Category name *', 'CAFE\u0301'); await app.press('Create category'); assert.ok(app.find('FormField', 'Category name *').props.error);
  await app.change('Category name *', 'Cafe'); await app.press('Create category'); assert.ok(finance.readCategories().some(category => category.name === 'Cafe'));
});

test('duplicate native submit callbacks create one category, while a subsequent new draft remains usable', async t => {
  const { app, finance } = await setup(t); await app.change('Category name *', 'One submission');
  const submit = app.find('FormField', 'Category name *').props.onSubmitEditing as () => void;
  await act(() => { submit(); submit(); });
  assert.equal(finance.readCategories().filter(category => category.name === 'One submission').length, 1);
  assert.equal(app.find('FormField', 'Category name *').props.error, null);
  await app.change('Category name *', 'Next submission'); await app.press('Create category'); assert.equal(visible(app).length, 2);
});

test('built-ins remain informational and protected; all icons reuse the Transactions identity resolver', async t => {
  const { app, finance } = await setup(t);
  for (const category of visible(app)) {
    const row = app.nodes().find(node => node.props?.testID === `finance-category-${category.id}`)!;
    assert.ok(!app.nodes(row).some(node => node.props?.onPress || node.props?.accessibilityRole === 'button'));
    assert.ok(app.nodes(row).some(node => node.props?.testID === `icon-${financeCategoryIcon(category.id)}`));
    assert.ok(!app.nodes(row).some(node => node.props?.testID === 'icon-forward'));
    assert.throws(() => finance.deleteCategory(category.id), /Built-in/);
  }
  await app.change('Category name *', 'Food custom'); await app.press('Create category');
  const row = app.nodes().find(node => node.props?.testID === `finance-category-${visible(app)[0].id}`)!;
  assert.ok(app.nodes(row).some(node => node.props?.testID === 'icon-tag')); assert.equal(financeCategoryIcon(builtInFinanceCategories.find(category => category.name === 'Other')!.id), 'tag');
  await app.press('Category options for Food custom'); assert.ok(app.find('FormButton', 'Archive Food custom category'));
  for (const operation of ['Restore', 'Rename', 'Delete']) assert.ok(!app.nodes().some(node => node.kind === 'FormButton' && String(node.props.label).includes(operation)));
});

test('archive confirmation Cancel preserves data; Archive hides choices and retains ledger/commitment/Overview/Journal references', async t => {
  const { app, finance, commitments, context } = await setup(t);
  await app.change('Category name *', 'Household'); await app.press('Create category'); const category = visible(app)[0];
  const manual = finance.createTransaction({ ...transactionDraft(), description: 'Actual expense', amount: '20', categoryId: category.id, transactionDate: today });
  const commitment = commitments.create({ ...commitmentDraft(null, undefined, today), title: 'Paid bill', amount: '30', categoryId: category.id });
  commitments.pay(commitments.readHistory(commitment).outstanding[0], '30', today);
  const before = finance.read().transactions, analytics = finance.readDashboard(periodBounds('month', today)).analytics, journal = context.read(today);
  async function archive() { await app.press('Category options for Household'); await app.press('Archive Household category'); await settle(); }
  await archive(); assert.equal(runtime.fixture.alerts.at(-1)!.title, 'Archive category?'); await app.confirm('Cancel'); assert.equal(finance.readCategories().find(row => row.id === category.id)!.deletedAt, null);
  await archive(); await app.confirm('Archive'); assert.equal(visible(app).length, 0); assert.ok(app.container.textContent.includes('Archived “Household”.'));
  assert.ok(!categoriesForType(finance.readCategories(), 'expense').some(row => row.id === category.id));
  assert.deepEqual(finance.read().transactions, before); assert.deepEqual(finance.readDashboard(periodBounds('month', today)).analytics, analytics); assert.deepEqual(context.read(today), journal);
  assert.equal(commitments.readHistory(commitment).commitment.categoryId, category.id);
  await select(app, 'Custom category status', 'archived'); assert.equal(visible(app)[0].id, category.id); assert.ok(app.container.textContent.includes('Custom · Archived'));
  assert.ok(!app.nodes().some(node => String(node.props?.accessibilityLabel).startsWith('Category options for')));
  assert.ok(!app.nodes().some(node => node.kind === 'FormButton' && /Restore|Delete|Rename/.test(String(node.props.label))));
  const archivedTransaction = finance.read().transactions.find(row => row.id === manual)!;
  finance.editTransaction(manual, { ...transactionDraft(archivedTransaction), note: 'Preserved' }); assert.equal(finance.read().transactions.find(row => row.id === manual)!.categoryId, category.id);
  await app.change('Category name *', 'household'); await app.press('Create category'); const replacement = visible(app)[0]; assert.notEqual(replacement.id, category.id);
  assert.equal(app.find('SegmentedControl', 'Custom category status').props.value, 'active');
});

test('empty Active and Archived collections have no duplicate create action or empty menu', async t => {
  const { app } = await setup(t); await select(app, 'Category origin', 'custom'); assert.ok(app.container.textContent.includes('No custom categories yet.'));
  await select(app, 'Custom category status', 'archived'); assert.ok(app.container.textContent.includes('No archived categories.'));
  assert.equal(app.nodes().filter(node => node.kind === 'FormButton' && node.props.label === 'Create category').length, 1);
});

test('creation and archival failures preserve drafts, references and available retry actions', async t => {
  t.mock.method(console, 'error', () => {}); const { app, sqlite, finance } = await setup(t);
  await app.change('Category name *', 'Retry category');
  sqlite.exec("CREATE TRIGGER fail_category_create BEFORE INSERT ON finance_categories BEGIN SELECT RAISE(ABORT, 'Injected category write'); END");
  await app.press('Create category'); assert.equal(app.find('FormField', 'Category name *').props.value, 'Retry category'); assert.ok(app.find('FormField', 'Category name *').props.error);
  sqlite.exec('DROP TRIGGER fail_category_create'); await app.press('Create category');
  sqlite.exec("CREATE TRIGGER fail_category_archive BEFORE UPDATE OF deleted_at ON finance_categories BEGIN SELECT RAISE(ABORT, 'Injected archive write'); END");
  await app.press('Category options for Retry category'); await app.press('Archive Retry category category'); await settle(); await app.confirm('Archive');
  assert.equal(finance.readCategories().find(category => category.name === 'Retry category')!.deletedAt, null); assert.ok(app.container.textContent.includes('Unable to archive'));
});

test('large collections use one bounded virtualized body and large text retains complete names and action labels', async t => {
  const { app, finance } = await setup(t); const long = 'VeryLongUnbrokenCategoryName'.repeat(5);
  for (let i = 0; i < 180; i++) finance.createCategory(`${i.toString().padStart(3, '0')} ${i === 179 ? long : 'Custom category'}`, 'expense');
  await app.resume(); await select(app, 'Category origin', 'custom');
  const list = app.find('FlatList'); assert.equal(visible(app).length, 180); assert.equal(list.props.initialNumToRender, 8); assert.equal(list.props.maxToRenderPerBatch, 8); assert.equal(list.props.windowSize, 5);
  assert.equal(list.props.keyboardShouldPersistTaps, 'handled'); assert.equal(list.props.keyboardDismissMode, 'on-drag'); assert.equal(typeof list.props.renderScrollComponent, 'function');
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width: 320, height: 800, fontScale: 2, scale: 1 }));
  await app.change('Category name *', 'Draft remains'); await select(app, 'Custom category status', 'archived'); await select(app, 'Custom category status', 'active');
  const title = app.nodes().find(node => node.props?.testID === 'finance-category-name' && node.textContent.includes(long))!;
  assert.equal(title.props.numberOfLines, undefined); assert.ok(app.find('FormButton', `Category options for 179 ${long}`));
  assert.equal(app.find('FormField', 'Category name *').props.value, 'Draft remains');
});

test('not-yet-loaded categories cannot create or display a false empty library', async t => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const app = await mount(createElement(FinanceCategoryManager, { categories: [], categoriesReady: false, onDismiss() {}, onDelete() {}, onCreate: f.finance.createCategory }), f.db); t.after(app.unmount);
  await app.change('Category name *', 'Waiting'); assert.equal(app.find('FormButton', 'Create category').props.disabled, true);
  assert.ok(app.find('ActivityIndicator')); assert.ok(!app.container.textContent.includes('No built-in categories.'));
});

test('large text scrolls the editorial heading while Back remains outside the list', async t => {
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width: 320, height: 800, fontScale: 2, scale: 1 }));
  const { app } = await setup(t); const list = app.find('FlatList');
  assert.equal(app.nodes(list).filter(node => node.props?.accessibilityRole === 'header' && node.textContent === 'Finance categories').length, 1);
  assert.ok(!app.nodes(list).includes(app.find('FormButton', 'Back to Transactions')));
});

test('nested Income category creation preserves unsaved transaction draft, selects new identity, and writes no ledger until Save', async t => {
  const { app, finance } = await setup(t); await app.press('Back to Transactions'); await app.tapSet('New transaction');
  await select(app, 'Type *', 'income'); await app.change('Amount *', '275,99'); await app.change('Description *', 'Unsaved income'); await app.change('Note', 'Keep this draft');
  const action = app.find('SelectField', 'Category').props.action as { accessibilityLabel: string; render: (controls: unknown) => { props: { onSubmit: (name: string, done: () => void) => void } } };
  assert.equal(action.accessibilityLabel, 'Create new income category');
  let closed = false; const form = action.render({}); await act(() => form.props.onSubmit('New income category', () => { closed = true; }));
  const created = finance.readCategories().find(category => category.name === 'New income category')!;
  assert.equal(created.type, 'income'); assert.equal(closed, true); assert.equal(app.find('SelectField', 'Category').props.value, created.id);
  assert.equal(app.find('SegmentedControl', 'Type *').props.value, 'income'); assert.equal(app.find('FormField', 'Amount *').props.value, '275,99');
  assert.equal(app.find('FormField', 'Description *').props.value, 'Unsaved income'); assert.equal(app.find('FormField', 'Note').props.value, 'Keep this draft');
  assert.equal(finance.read().transactions.length, 0); await app.press('Save'); assert.equal(finance.read().transactions[0].categoryId, created.id);
});

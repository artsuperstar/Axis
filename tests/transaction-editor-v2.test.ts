/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test, type TestContext } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { act, createElement } from 'react';

import { createFinanceDataAccess } from '../src/features/finance/data';
import { transactionDraft } from '../src/features/finance/form';
import { seedFinanceCategories } from '../src/features/finance/seed';
import { addDays, localDateString } from '../src/utils/calendar';
import { bundledMigrations, database } from './helpers/database';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const today = localDateString(new Date());
const flat = (style: unknown) => Object.assign({}, ...[style].flat(Infinity));
async function setup(t: TestContext) {
  // Use a settled Reduced Motion preference for this form/persistence fixture.
  t.mock.method((runtime.native as { AccessibilityInfo: { isReduceMotionEnabled: () => Promise<boolean> } }).AccessibilityInfo, 'isReduceMotionEnabled', () => Promise.resolve(true));
  const f = database(); await migrate(f.db, bundledMigrations); seedFinanceCategories(f.db); t.after(() => f.sqlite.close());
  const finance = createFinanceDataAccess(f.db, randomUUID);
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'transactions' }), f.db); t.after(app.unmount);
  return { ...f, finance, app };
}

test('one anchored create action has list clearance and opens three v2 sections; Cancel preserves direct dismissal', async t => {
  const { app, finance } = await setup(t);
  const fab = app.find('Pressable', 'New transaction');
  const position = flat(fab.props.style);
  assert.equal(position.position, 'absolute'); assert.equal(position.right, 16); assert.equal(position.bottom, 16);
  assert.ok(position.width >= 48 && position.height >= 48);
  assert.ok(flat(app.find('SectionList').props.contentContainerStyle).paddingBottom >= position.height + 2 * position.bottom);
  assert.ok(!app.nodes().some(node => node.kind === 'FormButton' && node.props.label === 'New transaction'));
  await app.tapSet('New transaction');
  for (const section of ['transaction', 'details', 'date']) assert.ok(app.nodes().some(node => node.props?.testID === `editor-section-${section}`));
  assert.equal(app.find('SegmentedControl', 'Type *').props.value, 'expense');
  assert.equal(app.find('FormField', 'Amount *').props.trailingText, 'R$');
  assert.equal(app.find('FormField', 'Amount *').props.value, '');
  assert.equal(app.find('FormField', 'Description *').props.multiline, true);
  assert.equal(app.find('FormField', 'Note').props.scrollEnabled, false);
  assert.ok(!app.nodes().some(node => node.kind === 'Pressable' && node.props.accessibilityLabel === 'New transaction'));
  await app.change('Description *', 'Unsaved'); await app.change('Amount *', '12,34'); await app.press('Cancel');
  assert.equal(finance.readLedgerPage().transactions.length, 0); assert.equal(runtime.fixture.alerts.length, 0);
  await app.tapSet('New transaction'); assert.equal(app.find('FormField', 'Description *').props.value, '');
});

test('field-level errors preserve malformed inputs and explicit Save writes exact centavos once', async t => {
  const { app, finance } = await setup(t); await app.tapSet('New transaction');
  await app.press('Save'); assert.equal(app.find('FormField', 'Description *').props.error, 'Enter a description.');
  await app.change('Description *', '  Household supplies  ');
  for (const invalid of ['-1', '0', '1.23', '1.234,567', '90.071.992.547.409,92']) {
    await app.change('Amount *', invalid); await app.press('Save');
    assert.ok(app.find('FormField', 'Amount *').props.error); assert.equal(app.find('FormField', 'Amount *').props.value, invalid);
    assert.equal(finance.readLedgerPage().transactions.length, 0);
  }
  await app.change('Amount *', 'R$ 1.234,56'); await app.change('Note', '  Receipt\n  retained  ');
  assert.equal(finance.readLedgerPage().transactions.length, 0, 'No autosave');
  const save = app.find('FormButton', 'Save').props.onPress as () => void; await act(() => { save(); save(); });
  const rows = finance.readLedgerPage().transactions; assert.equal(rows.length, 1); assert.equal(rows[0].amountMinor, 123456);
  assert.equal(rows[0].description, 'Household supplies'); assert.equal(rows[0].note, 'Receipt\n  retained'); assert.equal(rows[0].transactionDate, today);
});

test('v2 category control keeps type compatibility, no-category choice and retained archived edit identity', async t => {
  const { app, finance } = await setup(t);
  const category = finance.createCategory('Historical household category', 'expense');
  const id = finance.createTransaction({ ...transactionDraft(), amount: '123', description: 'Historical purchase', categoryId: category.id });
  finance.deleteCategory(category.id); await app.refocus();
  await app.press('Transaction options for Historical purchase'); await app.press('Edit Historical purchase'); await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
  assert.equal(app.find('SelectField', 'Category').props.displayValue, `${category.name} (archived)`);
  await app.change('Note', 'Historical note'); await app.press('Save'); assert.equal(finance.readLedgerPage().transactions[0].categoryId, category.id);
  await app.press('Transaction options for Historical purchase'); await app.press('Edit Historical purchase'); await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
  await act(() => (app.find('SegmentedControl', 'Type *').props.onChange as (type: string) => void)('income'));
  assert.equal(app.find('SelectField', 'Category').props.value, null);
  await app.press('Save'); assert.equal(finance.readLedgerPage().transactions.find(row => row.id === id)!.type, 'income');
  assert.equal(finance.readLedgerPage().transactions[0].categoryId, null);
});

test('future/local dates retain field errors; failed persistence keeps the working draft', async t => {
  t.mock.method(console, 'error', () => {}); // Expected injected database write failure.
  const { app, finance, sqlite } = await setup(t);
  const native = runtime.native as { Platform: { OS: string } }; const old = native.Platform.OS; native.Platform.OS = 'web'; t.after(() => { native.Platform.OS = old; });
  await app.tapSet('New transaction'); await app.change('Description *', 'Actual movement'); await app.change('Amount *', '25,90');
  await app.change('Date *', addDays(today, 1)); await app.press('Save'); assert.ok(app.find('FormField', 'Date *').props.error);
  await app.change('Date *', addDays(today, -1));
  sqlite.exec("CREATE TRIGGER review_write_failure BEFORE INSERT ON finance_transactions BEGIN SELECT RAISE(ABORT, 'Injected write failure'); END"); await app.press('Save');
  assert.ok(app.find('FormButton', 'Save')); assert.equal(app.find('FormField', 'Description *').props.value, 'Actual movement');
  assert.equal(finance.readLedgerPage().transactions.length, 0);
  sqlite.exec('DROP TRIGGER review_write_failure'); await app.press('Save'); assert.equal(finance.readLedgerPage().transactions[0].transactionDate, addDays(today, -1));
});

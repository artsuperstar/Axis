/// <reference types="node" />

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { test, type TestContext } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { act, createElement, type ReactNode } from 'react';

import { createCalendarDataAccess } from '../src/features/calendar/data';
import { createCommitmentDataAccess } from '../src/features/finance/commitments/data';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import { commitmentSections } from '../src/features/finance/commitments/presentation';
import type { CommitmentDraft } from '../src/features/finance/commitments/types';
import { createFinanceDataAccess } from '../src/features/finance/data';
import { maxAmountMinor, formatBrlInput } from '../src/features/finance/money';
import { periodBounds } from '../src/features/finance/periods';
import { seedFinanceCategories } from '../src/features/finance/seed';
import { createHomeDataAccess } from '../src/features/home/data';
import { addDays, addMonths, dateLabel, localDateString, pickerValue } from '../src/utils/calendar';
import { bundledMigrations, database } from './helpers/database';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const today = localDateString(new Date());
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as { renderToStaticMarkup: (node: ReactNode) => string };
type App = Awaited<ReturnType<typeof mount>>;
async function initialized(t: TestContext) {
  t.mock.method(console, 'error', () => {}); // Expected injected refresh failures.
  const f = database(); await migrate(f.db, bundledMigrations); seedFinanceCategories(f.db);
  t.after(() => f.sqlite.close());
  const access = createCommitmentDataAccess(f.db, randomUUID);
  const finance = createFinanceDataAccess(f.db, randomUUID);
  const create = (title: string, changes: Partial<CommitmentDraft> = {}) => access.create({ ...commitmentDraft(null, undefined, today), title, amount: '180,20', ...changes });
  return { ...f, access, finance, create };
}
async function settle() { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); }); }
async function menu(app: App, trigger: string, action: string) { await app.press(trigger); await app.press(action); await settle(); }
function rows(app: App, id: string) { return app.nodes().filter((node) => node.props?.testID === id); }
function sections(app: App) { return app.nodes().filter((node) => String(node.props?.testID).startsWith('commitment-section-')); }
const subject = (name: string, date = today) => `${name}, due ${dateLabel(date)}`;

test('authoritative sections retain all old obligations, omit resolved rows and use one active future occurrence', async (t) => {
  const f = await initialized(t);
  const old = f.create('Old bill', { firstDueDate: addMonths(today, -30) });
  const paused = f.create('Paused due'); f.access.pause(paused);
  const ended = f.create('Ended due'); f.access.end(ended);
  const complete = f.create('Finished', { kind: 'installment', installmentCount: '1' });
  f.access.skip(f.access.readHistory(complete).outstanding[0]);
  const upcoming = f.create('Future', { firstDueDate: addDays(today, 1) });
  const result = commitmentSections(f.access.read().items, today);
  assert.deepEqual(result.map((section) => section.title), ['Overdue', 'Today', 'Upcoming']);
  assert.equal(result[0].rows.filter((row) => row.item.commitment.id === old).length, 30);
  assert.equal(result[0].rows[0].occurrence.dueDate, addMonths(today, -30));
  assert.ok(result[1].rows.some((row) => row.item.commitment.id === paused));
  assert.ok(result[1].rows.some((row) => row.item.commitment.id === ended));
  assert.ok(!result.flatMap((section) => section.rows).some((row) => row.item.commitment.id === complete));
  assert.equal(result[2].rows.filter((row) => row.item.commitment.id === upcoming).length, 1);
  assert.ok(!result[2].rows.some((row) => [paused, ended, complete].includes(row.item.commitment.id)));
});

test('feed orders Overdue, Today, Upcoming with primary Pay, secondary anchored actions and one Add', async (t) => {
  const f = await initialized(t); f.create('Old', { firstDueDate: addMonths(today, -14) }); f.create('Internet'); f.create('Future', { firstDueDate: addDays(today, 1) });
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments' }), f.db); t.after(app.unmount);
  assert.deepEqual(sections(app).map((node) => node.props.testID), ['commitment-section-overdue', 'commitment-section-today', 'commitment-section-upcoming']);
  assert.ok(app.container.textContent.includes(`Due ${dateLabel(addMonths(today, -14))}`));
  assert.equal(app.find('FormButton', 'Add commitment').props.variant, 'primary');
  assert.equal(app.find('FormButton', `Pay ${subject('Internet')}`).props.variant, 'primary');
  for (const label of ['Skip', 'Pause', 'End', 'Edit', 'History']) assert.ok(!app.nodes().some((node) => node.props?.label === label));
  await app.press('Commitment options'); assert.equal(app.nodes().filter((node) => node.kind === 'Modal').length, 0);
  assert.ok(app.find('FormButton', 'Manage commitments')); assert.ok(app.find('FormButton', 'History'));
  await app.tapSet('Close commitment options'); assert.equal(app.find('FormButton', 'Commitment options').props.expanded, false);
  await app.press('Commitment options'); await act(() => (app.find('FlatList').props.onScroll as (event: unknown) => void)({ nativeEvent: { contentOffset: { y: 50 } } }));
  assert.equal(app.find('FormButton', 'Commitment options').props.expanded, false);
});

test('initial loading and failed first read do not expose a fake empty obligation state; Retry loads empty', async (t) => {
  const f = await initialized(t); runtime.fixture.db = f.db;
  const loading: string[] = [];
  const indicator = (runtime.native as { ActivityIndicator: { render: (props: { accessibilityLabel: string }) => unknown } }).ActivityIndicator;
  t.mock.method(indicator, 'render', (props: { accessibilityLabel: string }) => { loading.push(props.accessibilityLabel); return null; });
  const markup = renderToStaticMarkup(createElement(screens.FinanceScreen, { initialView: 'commitments' }));
  assert.deepEqual(loading, ['Loading Finance']); assert.ok(!markup.includes('No commitments yet'));
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments' }), f.db, ['commitments.read']); t.after(app.unmount);
  assert.ok(!app.container.textContent.includes('No commitments yet'));
  runtime.fixture.failures.clear(); await app.press('Retry');
  assert.ok(app.container.textContent.includes('No commitments yet')); assert.equal(sections(app).length, 0);
});

test('body opens details without payment; Pay defaults expected amount and invalid amount/future dates retain draft', async (t) => {
  const f = await initialized(t); f.create('Internet');
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments' }), f.db); t.after(app.unmount);
  const body = app.nodes().find((node) => node.kind === 'Pressable' && String(node.props.accessibilityLabel).startsWith('Internet, expected'))!;
  assert.ok(String(body.props.accessibilityHint).includes('confirmation'));
  await act(() => (body.props.onPress as () => void)()); assert.equal(f.finance.read().transactions.length, 0);
  await app.press('Pay'); assert.equal(app.find('FormField', 'Actual amount paid *').props.value, '180,20');
  assert.equal(app.find('FormField', 'Payment date *').props.value, today);
  assert.ok(String(app.find('FormField', 'Actual amount paid *').props.helperText).includes('whole occurrence'));
  for (const amount of ['0', 'abc', '1,001']) { await app.change('Actual amount paid *', amount); await app.press('Confirm'); assert.equal(app.find('FormField', 'Actual amount paid *').props.value, amount); assert.equal(f.finance.read().transactions.length, 0); }
  await app.change('Actual amount paid *', '201,09'); await app.change('Payment date *', addDays(today, 1)); await app.press('Confirm');
  assert.ok(app.find('FormError').textContent.includes('today or earlier')); assert.equal(f.finance.read().transactions.length, 0);
  await app.change('Payment date *', addDays(today, -1)); await app.press('Confirm');
  assert.equal(f.finance.read().transactions[0].amountMinor, 20109); assert.equal(f.finance.read().transactions[0].transactionDate, addDays(today, -1));
});

test('Pay / Skip / Undo update feed, exact Overview, linked Transactions, Home and Calendar; archived labels survive', async (t) => {
  const f = await initialized(t); const category = f.finance.createCategory('Veterinary care', 'expense');
  const id = f.create('Vet', { categoryId: category.id }); f.finance.deleteCategory(category.id);
  const home = createHomeDataAccess(f.db, randomUUID); const calendar = createCalendarDataAccess(f.db, randomUUID);
  const dueHome = () => home.read().today.flatMap((section) => section.items).filter((row) => row.source === 'commitment' && row.recordId === id);
  const dueCalendar = () => calendar.readRange({ from: today, to: today }).filter((row) => row.source === 'commitment' && row.recordId === id);
  assert.equal(dueHome().length, 1); assert.equal(dueCalendar().length, 1);
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments' }), f.db); t.after(app.unmount);
  await app.press(`Pay ${subject('Vet')}`); assert.ok(app.container.textContent.includes('Expense category · Veterinary care'));
  await app.change('Actual amount paid *', '185,21'); const confirm = app.find('FormButton', 'Confirm').props.onPress as () => void;
  await act(() => { confirm(); confirm(); });
  assert.equal(f.finance.read().transactions.length, 1); assert.equal(dueHome().length, 0); assert.equal(dueCalendar().length, 0);
  assert.ok(!sections(app).some((section) => section.props.testID === 'commitment-section-today'));
  await app.press('Overview'); assert.ok(app.container.textContent.includes('ExpensesR$ 185,21')); assert.ok(app.container.textContent.includes('Veterinary care'));
  assert.equal(f.finance.readDashboard(periodBounds('month', today)).analytics.expensesMinor, 18521n);
  await app.press('Transactions'); assert.ok(app.container.textContent.includes('Commitment payment · Undo in Commitments history'));
  assert.ok(!app.nodes().some((node) => node.props?.label === 'Delete'));
  await app.press('Commitments'); await menu(app, 'Commitment options', 'History');
  const readsBefore = runtime.fixture.reads.filter((read) => read === 'commitments.readHistory').length;
  await app.tapSet('History for Vet'); assert.ok(runtime.fixture.reads.filter((read) => read === 'commitments.readHistory').length > readsBefore);
  assert.equal(rows(app, 'commitment-history-row').length, 1); assert.ok(app.container.textContent.includes('Paid R$ 185,21'));
  assert.ok(app.container.textContent.includes('Expected R$ 180,20')); assert.ok(app.container.textContent.includes(`Payment date ${dateLabel(today)}`));
  assert.equal(app.find('FormButton', 'Undo payment').props.variant, 'quiet'); await app.press('Undo payment'); await app.confirm('Confirm');
  assert.equal(f.finance.read().transactions.length, 0); assert.equal(dueHome().length, 1); assert.equal(dueCalendar().length, 1);
  await app.press('Done'); await app.press('Back to Commitments');
  assert.ok(sections(app).some((section) => section.props.testID === 'commitment-section-today'));
  await menu(app, `Actions for ${subject('Vet')}`, 'Skip'); assert.equal(dueHome().length, 1); await app.confirm('Confirm');
  assert.equal(dueHome().length, 0); assert.equal(dueCalendar().length, 0); assert.equal(f.finance.read().transactions.length, 0);
  await menu(app, 'Commitment options', 'History'); await app.tapSet('History for Vet');
  assert.equal(rows(app, 'commitment-history-row').length, 1); assert.ok(rows(app, 'commitment-history-row')[0].textContent.includes('Skipped'));
  assert.ok(!rows(app, 'commitment-history-row')[0].textContent.includes('Payment date'));
  await app.press('Reopen'); await app.confirm('Confirm'); assert.equal(dueHome().length, 1);
  await app.press('Done'); await app.press('Back to Commitments'); await app.press('Overview');
  assert.ok(app.container.textContent.includes('ExpensesR$ 0,00'));
});

test('management exposes valid anchored actions, keeps due obligations on Pause/End and Resume chooses a new anchor', async (t) => {
  const f = await initialized(t); const id = f.create('Rent');
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments' }), f.db); t.after(app.unmount);
  await menu(app, 'Commitment options', 'Manage commitments');
  await menu(app, 'Series options for Rent', 'Edit'); await app.change('Title *', 'Housing'); await app.press('Save');
  assert.equal(f.access.readHistory(id).commitment.title, 'Housing');
  await menu(app, 'Series options for Housing', 'Pause'); await app.confirm('Confirm');
  assert.equal(f.access.readHistory(id).commitment.status, 'paused');
  await app.press('Series options for Housing'); assert.ok(!app.nodes().some((node) => node.props?.label === 'Pause')); await app.press('Resume'); await settle();
  assert.ok(app.container.textContent.includes('Paused months stay empty'));
  await app.change('Next due date *', addDays(today, 2)); await app.press('Resume');
  assert.equal(f.access.readHistory(id).schedule.startDate, addDays(today, 2));
  await menu(app, 'Series options for Housing', 'End'); assert.equal(runtime.fixture.alerts.at(-1)!.buttons.at(-1)!.style, 'destructive'); await app.confirm('Confirm');
  await app.press('Series options for Housing');
  for (const label of ['Pause', 'Resume', 'End']) assert.ok(!app.nodes().some((node) => node.props?.label === label));
  await app.tapSet('Close series options for housing'); await app.press('Back to Commitments');
  assert.equal(sections(app).length, 1); assert.equal(sections(app)[0].props.testID, 'commitment-section-today');
  assert.equal(f.access.readHistory(id).outstanding.length, 1);
});

test('resolved History loads incremental earlier pages with no duplicate rows and does not include old pending items', async (t) => {
  const f = await initialized(t); const id = f.create('Archive', { firstDueDate: addMonths(today, -30) });
  const outstanding = f.access.readHistory(id).outstanding;
  for (const occurrence of outstanding.filter((row) => row.dueDate !== today)) f.access.skip(occurrence);
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments' }), f.db); t.after(app.unmount);
  await menu(app, 'Commitment options', 'History'); assert.equal(runtime.fixture.reads.filter((read) => read === 'commitments.readHistory').length, 0);
  await app.tapSet('History for Archive'); assert.equal(rows(app, 'commitment-history-row').length, 11);
  await app.press('Load earlier history'); assert.equal(rows(app, 'commitment-history-row').length, 23);
  await app.press('Load earlier history'); const history = rows(app, 'commitment-history-row'); assert.equal(history.length, 30);
  assert.equal(new Set(history.map((row) => row.textContent)).size, 30);
  assert.ok(!app.nodes().some((node) => node.props?.label === 'Load earlier history'));
  assert.ok(!history.some((row) => row.textContent.includes('Pending')));
  await app.press('Done'); await app.press('Back to Commitments'); assert.ok(app.find('FormButton', `Pay ${subject('Archive')}`));
});

for (const fontScale of [1, 2]) test(`long names, maximum BRL and installment progress retain wrapping and contextual accessibility at font scale ${fontScale}`, async (t) => {
  const f = await initialized(t);
  t.mock.method(runtime.native as { useWindowDimensions: () => object }, 'useWindowDimensions', () => ({ width: 390, height: 800, scale: 1, fontScale }));
  const name = 'An exceptionally long laptop installment commitment title';
  f.create(name, { kind: 'installment', installmentCount: '1200', amount: formatBrlInput(maxAmountMinor) });
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments' }), f.db); t.after(app.unmount);
  const row = rows(app, 'commitment-obligation')[0]; assert.ok(row.textContent.includes('1 of 1200')); assert.ok(row.textContent.includes('R$ 90.071.992.547.409,91'));
  const body = app.nodes(row).find((node) => node.kind === 'Pressable')!;
  assert.ok(String(body.props.accessibilityLabel).includes('installment 1 of 1200'));
  assert.equal((body.props.style as { minHeight: number }).minHeight, 44);
  const pair = app.nodes(row).find((node) => node.kind === 'View' && (node.props.style as { flexWrap?: string })?.flexWrap === 'wrap'); assert.ok(pair);
  for (const text of app.nodes(row).filter((node) => node.kind === 'ThemedText')) { assert.equal(text.props.numberOfLines, undefined); assert.equal(text.props.ellipsizeMode, undefined); }
});

test('Android Pay uses native date picker bounded through today and saves an earlier date', async (t) => {
  const f = await initialized(t); f.create('Internet');
  const platform = (runtime.native as { Platform: { OS: string } }).Platform; const previous = platform.OS; platform.OS = 'android'; t.after(() => { platform.OS = previous; });
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments' }), f.db); t.after(app.unmount);
  await app.press(`Pay ${subject('Internet')}`);
  await act(() => (app.find('FormSelect', 'Payment date *').props.onPress as () => void)());
  const picker = runtime.fixture.pickers.at(-1)!; assert.equal(picker.mode, 'date'); assert.equal(localDateString(picker.maximumDate as Date), today);
  await act(() => (picker.onValueChange as (event: unknown, date: Date) => void)({}, pickerValue(addDays(today, -1))));
  await app.press('Confirm'); assert.equal(f.finance.read().transactions[0].transactionDate, addDays(today, -1));
});

test('Calendar-selected distant future obligation keeps its payment context without early persistence', async (t) => {
  const f = await initialized(t); const id = f.create('Distant bill'); const distant = addMonths(today, 8);
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments', initialRecordId: id, initialDueDate: distant }), f.db); t.after(app.unmount);
  assert.equal(f.access.readHistory(id).history.filter((row) => row.occurrence.dueDate === distant).length, 0);
  const pay = app.find('FormButton', `Pay ${subject('Distant bill', distant)}`); assert.equal(pay.props.variant, 'primary');
  await app.press(`Pay ${subject('Distant bill', distant)}`); assert.ok(app.container.textContent.includes(`Due ${dateLabel(distant)}`));
  await app.press('Confirm'); assert.equal(f.finance.read().transactions.length, 1);
  assert.equal(f.access.readHistory(id).history.find((row) => row.occurrence.dueDate === distant)!.occurrence.status, 'paid');
});

for (const mode of ['light', 'dark'] as const) test(`${mode} mode uses attention text plus explicit Overdue wording; Undo restores old obligation`, async (t) => {
  const f = await initialized(t); const oldDate = addMonths(today, -18); const id = f.create('Old debt', { firstDueDate: oldDate });
  t.mock.method(runtime.native as { useColorScheme: () => string }, 'useColorScheme', () => mode);
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments' }), f.db); t.after(app.unmount);
  const oldRow = rows(app, 'commitment-obligation')[0]; assert.ok(oldRow.textContent.includes('Overdue'));
  assert.ok(app.nodes(oldRow).some((node) => node.props?.themeColor === 'warning'));
  assert.ok(!app.nodes(oldRow).some((node) => node.props?.themeColor === 'danger' || node.props?.accessibilityRole === 'alert'));
  await app.press(`Pay ${subject('Old debt', oldDate)}`); await app.press('Confirm');
  await menu(app, 'Commitment options', 'History'); await app.tapSet('History for Old debt');
  await app.press('Load earlier history'); await app.press(`Undo payment for ${subject('Old debt', oldDate)}`); await app.confirm('Confirm');
  await app.press('Done'); await app.press('Back to Commitments');
  assert.ok(app.find('FormButton', `Pay ${subject('Old debt', oldDate)}`));
  assert.equal(f.access.readHistory(id).outstanding[0].dueDate, oldDate); assert.equal(f.finance.read().transactions.length, 0);
});

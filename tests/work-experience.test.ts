/// <reference types="node" />

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test, type TestContext } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { act, createElement, useState, type ReactNode } from 'react';

import { createCalendarDataAccess } from '../src/features/calendar/data';
import { createFinanceDataAccess } from '../src/features/finance/data';
import { formatBrlAmount, formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { periodBounds } from '../src/features/finance/periods';
import { seedFinanceCategories } from '../src/features/finance/seed';
import { createWorkDataAccess } from '../src/features/finance/work/data';
import { workDraft } from '../src/features/finance/work/form';
import { receivableClients } from '../src/features/finance/work/presentation';
import type { WorkDraft, WorkHistoryPage, WorkPaymentDraft } from '../src/features/finance/work/types';
import { createHomeDataAccess } from '../src/features/home/data';
import { addDays, dateLabel, localDateString } from '../src/utils/calendar';
import { bundledMigrations, database } from './helpers/database';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const today = localDateString(new Date());
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as { renderToStaticMarkup: (node: ReactNode) => string };
type App = Awaited<ReturnType<typeof mount>>;
async function initialized(t: TestContext) {
  t.mock.method(console, 'error', () => {}); // Expected refresh failures are injected deliberately.
  const f = database(); await migrate(f.db, bundledMigrations); seedFinanceCategories(f.db); t.after(() => f.sqlite.close());
  const work = createWorkDataAccess(f.db, randomUUID); const finance = createFinanceDataAccess(f.db, randomUUID);
  const create = (clientId: string, description: string, changes: Partial<WorkDraft> = {}) => work.create({ ...workDraft(null, today), counterpartyId: clientId, title: description, description, compensationType: 'fixed', fixedAmount: '1000', ...changes });
  const pay = (clientId: string, allocations: WorkPaymentDraft['allocations']) => work.recordPayment({ counterpartyId: clientId, allocations, categoryId: null, paymentDate: today });
  return { ...f, work, finance, create, pay };
}
async function settle() { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); }); }
async function menu(app: App, trigger: string, action: string) { await app.press(trigger); await app.press(action); await settle(); }
function rows(app: App, testID: string) { return app.nodes().filter((node) => node.props?.testID === testID); }
function metric(app: App, label: string) { const matches = rows(app, `work-metric-${label.toLowerCase()}`); return matches.at(-1)!; }
function assertTotals(app: App, earned: bigint, received: bigint) {
  assert.equal(metric(app, 'Outstanding').props.accessibilityLabel, `Outstanding, ${formatBrlAmount(earned - received)}`);
  assert.equal(metric(app, 'Earned').props.accessibilityLabel, `Earned, ${formatBrlAmount(earned)}`);
  assert.equal(metric(app, 'Received').props.accessibilityLabel, `Received, ${formatBrlAmount(received)}`);
}
async function openClient(app: App, name: string) {
  const row = rows(app, 'work-entry').find((node) => String(node.props.accessibilityLabel).includes(', '+name+','));
  assert.ok(row); await act(() => (row.props.onPress as () => void)());
  const title = app.nodes(row).find((node) => node.props.testID === 'job-title')!.textContent;
  await menu(app, 'Work options for '+title, 'Client details');
}
async function mountWorkStack(t: TestContext, db: unknown) {
  const router = (runtime.router as { router: { push: (target: unknown) => unknown; back: () => unknown } }).router;
  let navigate!: (path: string | null) => void;
  function StackProbe() {
    const [path, setPath] = useState<string | null>(null); navigate = setPath;
    return createElement('div', null, createElement(screens.FinanceScreen, { initialView: 'work' }),
      path === '/work/clients' ? createElement(screens.WorkClientsScreen) : path === '/work/history' ? createElement(screens.WorkHistoryScreen) : null);
  }
  t.mock.method(router, 'push', (target: unknown) => { runtime.fixture.navigation.push({ method: 'push', target }); navigate(String(target)); });
  t.mock.method(router, 'back', () => { runtime.fixture.navigation.push({ method: 'back', target: undefined }); navigate(null); runtime.refocus(); });
  return mount(createElement(StackProbe), db);
}

test('Job title is required, persisted and editable independently of description and all financial facts', async (t) => {
  const f = await initialized(t); const client = f.work.createCounterparty('Acme');
  assert.throws(() => f.create(client.id, 'Details', { title: '' }), /job title/i);
  assert.throws(() => f.create(client.id, 'Details', { title: '  ' }), /job title/i);
  assert.equal(f.work.readOverview().items.length, 0);
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'work' }), f.db); t.after(app.unmount);
  await app.press('Add work');
  const field = app.find('AutocompleteField', 'Client *'); await act(() => (field.props.onSelect as (id: string) => void)(client.id));
  await app.change('Description', 'Warehouse stock control, distinct from the title');
  const compensation = app.find('SegmentedControl', 'Compensation *'); await act(() => (compensation.props.onChange as (value: string) => void)('fixed'));
  await app.change('Fixed amount *', '1000'); await app.change('Expected payment date', addDays(today, -1));
  await app.press('Save'); assert.match(app.find('FormError').textContent, /job title/i);
  assert.equal(app.find('FormField', 'Description').props.value, 'Warehouse stock control, distinct from the title');
  await app.change('Job title *', 'Inventory\r\nSoftware'); assert.equal(app.find('FormField', 'Job title *').props.value, 'Inventory Software'); await app.press('Save');
  const id = f.work.readOverview().items[0].entry.id;
  assert.equal(f.work.readDetail(id).items[0].entry.title, 'Inventory Software'); assert.equal(f.finance.read().transactions.length, 0);
  const job = rows(app, 'work-entry')[0]; assert.ok(String(job.props.accessibilityLabel).startsWith('Inventory Software, Acme,'));
  const heading = app.nodes(job).find((node) => node.props?.testID === 'job-title')!;
  assert.equal(heading.textContent, 'Inventory Software'); assert.equal(heading.props.type, 'cardTitle');
  assert.equal(app.nodes(job).find((node) => node.props?.testID === 'job-client')!.props.type, 'secondary');
  assert.equal(app.nodes(job).find((node) => node.props?.testID === 'job-description')!.props.numberOfLines, 2);
  await act(() => (job.props.onPress as () => void)()); await app.press('Record payment for Inventory Software');
  assert.ok(app.find('Pressable', 'Allocate payment to Inventory Software'));
  await app.change('Allocation in reais for Inventory Software', '400'); await app.press('Confirm');
  const before = f.work.readDetail(id); const ledger = f.finance.read();
  const home = createHomeDataAccess(f.db, randomUUID); const calendar = createCalendarDataAccess(f.db, randomUUID);
  const projected = () => calendar.readRange({ from: addDays(today, -1), to: today }).find((row) => row.source === 'work')!;
  assert.equal(projected().title, 'Inventory Software'); assert.ok(projected().secondary.startsWith('Acme'));
  assert.ok(home.read().attention.flatMap((section) => section.items).some((row) => row.source === 'work' && row.title === 'Inventory Software'));
  const current = rows(app, 'work-entry')[0]; await act(() => (current.props.onPress as () => void)());
  await menu(app, 'Work options for Inventory Software', 'Edit'); await app.change('Job title *', 'Inventory v2'); await app.press('Save');
  const after = f.work.readDetail(id); assert.deepEqual(after.totals, before.totals); assert.deepEqual(f.finance.read(), ledger);
  assert.equal(after.items[0].entry.description, before.items[0].entry.description); assert.equal(after.items[0].entry.title, 'Inventory v2');
  assert.equal(after.payments[0].allocations[0].title, 'Inventory v2'); assert.equal(after.payments[0].allocations[0].amountMinor, 40000);
  assert.equal(projected().title, 'Inventory v2');
});

test('legacy Job editor starts from deterministic description fallback and establishes Title without losing description', async (t) => {
  const f = await initialized(t); const client = f.work.createCounterparty('Client'); const id = f.create(client.id, 'Original legacy details');
  f.sqlite.prepare('UPDATE work_entries SET title = NULL WHERE id = ?').run(id);
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'work', initialRecordId: id }), f.db); t.after(app.unmount);
  await menu(app, 'Work options for Original legacy details', 'Edit');
  assert.equal(app.find('FormField', 'Job title *').props.value, 'Original legacy details');
  assert.equal(app.find('FormField', 'Description').props.value, 'Original legacy details');
  await app.change('Job title *', 'A proper job title'); await app.press('Save');
  assert.equal(f.work.readDetail(id).items[0].entry.title, 'A proper job title'); assert.equal(f.work.readDetail(id).items[0].entry.description, 'Original legacy details');
  await app.tapSet(String(rows(app, 'work-entry')[0].props.accessibilityLabel));
  await menu(app, 'Work options for A proper job title', 'Edit'); await app.change('Description', ''); await app.press('Save');
  assert.equal(f.work.readDetail(id).items[0].entry.description, ''); assert.equal(f.work.readDetail(id).items[0].entry.title, 'A proper job title');
});

test('empty and whitespace-only Description save; clear/restore retain financial facts, integrations and complete accessible Title', async (t) => {
  const f = await initialized(t); const client = f.work.createCounterparty('Acme');
  for (const description of ['', ' \n\t ']) {
    const id = f.create(client.id, description, { title: 'Logo Design', expectedPaymentDate: addDays(today, -1) });
    assert.equal(f.work.readDetail(id).items[0].entry.description, '');
  }
  assert.throws(() => f.create(client.id, '', { title: '' }), /job title/i);
  assert.throws(() => f.create(client.id, '', { title: 'Logo', counterpartyId: null }), /who this work is for/i);
  const id = f.work.readOverview().items[0].entry.id; f.pay(client.id, [{ workEntryId: id, amount: '400' }]);
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'work', initialRecordId: id }), f.db); t.after(app.unmount);
  assert.equal(rows(app, 'job-description').length, 0);
  const label = String(rows(app, 'work-entry')[0].props.accessibilityLabel);
  assert.ok(label.startsWith('Logo Design, Acme, earned')); assert.ok(!/description|unavailable|, ,/i.test(label));
  const financial = f.work.readDetail(id).totals; const ledger = f.finance.read();
  await menu(app, 'Work options for Logo Design', 'Edit'); await app.change('Description', 'Supporting details'); await app.press('Save');
  assert.equal(f.work.readDetail(id).items[0].entry.description, 'Supporting details');
  await app.tapSet(label); await menu(app, 'Work options for Logo Design', 'Edit'); await app.change('Description', ' \n\t '); await app.press('Save');
  assert.equal(f.work.readDetail(id).items[0].entry.description, ''); assert.deepEqual(f.work.readDetail(id).totals, financial); assert.deepEqual(f.finance.read(), ledger);
  const home = createHomeDataAccess(f.db, randomUUID).read();
  assert.ok(home.attention.flatMap((section) => section.items).some((row) => row.source === 'work' && row.title === 'Logo Design'));
  assert.ok(createCalendarDataAccess(f.db, randomUUID).readRange({ from: addDays(today, -1), to: today }).filter((row) => row.source === 'work').every((row) => row.title === 'Logo Design'));
  // The real editor also accepts a new Job with no Description.
  await app.press('Add work'); await app.change('Job title *', 'Without details');
  const field = app.find('AutocompleteField', 'Client *'); await act(() => (field.props.onSelect as (id: string) => void)(client.id));
  const compensation = app.find('SegmentedControl', 'Compensation *'); await act(() => (compensation.props.onChange as (value: string) => void)('fixed'));
  await app.change('Fixed amount *', '50'); await app.press('Save');
  assert.ok(f.work.readOverview().items.some((row) => row.entry.title === 'Without details' && row.entry.description === ''));
});

for (const [action, path, screen] of [['Clients', '/work/clients', screens.WorkClientsScreen], ['History', '/work/history', screens.WorkHistoryScreen]] as const) {
  test(`Work ${action} uses an anchored navigation action and a card destination with Back, never a global sheet`, async (t) => {
    const f = await initialized(t);
    const app = await mount(createElement(screens.FinanceScreen, { initialView: 'work' }), f.db);
    await menu(app, 'Work options', action);
    assert.deepEqual(runtime.fixture.navigation.at(-1), { method: 'push', target: path });
    assert.equal(app.find('FormButton', 'Work options').props.expanded, false);
    assert.equal(app.nodes().filter((node) => node.kind === 'Modal').length, 0); await app.unmount();
    const destination = await mount(createElement(screen), f.db); t.after(destination.unmount);
    assert.equal(destination.nodes().filter((node) => node.kind === 'Modal').length, 0);
    assert.equal(rows(destination, 'adaptive-sheet').length, 0);
    assert.ok(destination.nodes().some((node) => node.props?.accessibilityRole === 'header' && node.props?.type === 'screenTitle' && node.textContent === action));
    assert.ok(destination.nodes().some((node) => node.kind === 'SafeAreaView'));
    await destination.press('Back to Work'); assert.equal(runtime.fixture.navigation.at(-1)!.method, 'back');
    t.mock.method((runtime.router as { router: { canGoBack: () => boolean } }).router, 'canGoBack', () => false);
    await destination.press('Back to Work'); assert.deepEqual(runtime.fixture.navigation.at(-1), { method: 'replace', target: '/work' });
    const layout = readFileSync('src/app/_layout.tsx', 'utf8');
    assert.ok(layout.includes(`name="${path.slice(1)}" options={{ headerShown: false, presentation: 'card' }}`));
  });
}

test('pushed Clients keeps dirty creation/search and last-good data through refresh failure, preserves F3, and loads only focused Client jobs', async (t) => {
  const f = await initialized(t); const accented = f.work.createCounterparty('Álvaro'); f.create(accented.id, '', { title: 'Accent job' });
  const other = f.work.createCounterparty('Other'); f.create(other.id, 'Unrelated job');
  const overview = f.measure(() => f.work.readOverview({ includeJobs: false }));
  assert.equal(overview.value.items.length, 0); assert.equal(overview.value.totals.outstandingMinor, 200000n);
  assert.ok(!overview.statements.some((query) => query.sql.includes('"description"') && query.sql.includes('from "work_entries"')));
  const focused = f.measure(() => f.work.readOverview({ counterpartyId: accented.id }));
  assert.equal(focused.value.items.length, 1); assert.equal(focused.value.items[0].entry.title, 'Accent job');
  const app = await mount(createElement(screens.WorkClientsScreen), f.db); t.after(app.unmount);
  await app.change('Search clients', 'Alvaro'); await app.change('Name *', 'Alvaro');
  assert.ok(app.find('Pressable', 'Open Álvaro details'));
  runtime.fixture.failures.add('work.readOverview'); await app.refocus();
  assert.equal(app.find('FormField', 'Name *').props.value, 'Alvaro'); assert.equal(app.find('FormField', 'Search clients').props.value, 'Alvaro');
  assert.ok(app.find('Pressable', 'Open Álvaro details'));
  runtime.fixture.failures.clear(); await app.press('Retry'); await app.press('Create client');
  const plain = f.work.readOverview().counterparties.find((row) => row.name === 'Alvaro')!; assert.notEqual(plain.id, accented.id);
  await app.change('Name *', 'ÁLVARO'); await app.press('Create client'); assert.match(app.find('FormError').textContent, /already exists/);
  await app.change('Name *', 'A\u0301lvaro'); await app.press('Create client'); assert.match(app.find('FormError').textContent, /already exists/);
  await app.tapSet('Open Álvaro details'); assertTotals(app, 100000n, 0n);
  assert.equal(rows(app, 'work-entry').length, 1); assert.ok(app.find('FormButton', 'Record payment from Álvaro'));
});

test('global History retains appended rows and receipt disclosure on paging/summary failures; returning preserves the mounted Finance workspace', async (t) => {
  const f = await initialized(t); const client = f.work.createCounterparty('Client');
  for (let i = 0; i < 25; i++) { const id = f.create(client.id, '', { title: 'Settled '+i, fixedAmount: '1' }); f.pay(client.id, [{ workEntryId: id, amount: '1' }]); }
  const app = await mountWorkStack(t, f.db); t.after(app.unmount);
  const workspace = app.nodes().find((node) => node.kind === 'FlatList')!;
  await menu(app, 'Work options', 'History'); assert.equal(rows(app, 'work-receipt').length, 20);
  runtime.fixture.failures.add('work.readHistory'); await app.press('Load more history'); assert.equal(rows(app, 'work-receipt').length, 20);
  runtime.fixture.failures.clear(); await app.press('Load more history'); assert.equal(rows(app, 'work-receipt').length, 25);
  const receipt = rows(app, 'work-receipt')[0]; const body = app.nodes(receipt).find((node) => node.kind === 'Pressable')!;
  await act(() => (body.props.onPress as () => void)()); assert.equal(body.props.accessibilityState && (body.props.accessibilityState as { expanded: boolean }).expanded, true);
  runtime.fixture.failures.add('work.readOverview'); await app.resume();
  assert.equal(rows(app, 'work-receipt').length, 25); assert.ok(receipt.textContent.includes('Settled'));
  runtime.fixture.failures.clear(); await app.refocus(); assert.equal(rows(app, 'work-receipt').length, 25);
  await app.press('Back to Work'); assert.equal(app.nodes().find((node) => node.kind === 'FlatList'), workspace);
  assertTotals(app, 2500n, 2500n);
});

test('pushed Clients pays archived debt from targeted Client context and retains dirty allocations during failed refresh', async (t) => {
  const f = await initialized(t); const client = f.work.createCounterparty('Archived debtor');
  const a = f.create(client.id, '', { title: 'Logo', fixedAmount: '100' });
  const b = f.create(client.id, '', { title: 'Translation', fixedAmount: '200' });
  const other = f.work.createCounterparty('Unrelated'); f.create(other.id, 'Other work', { fixedAmount: '900' });
  f.work.archiveCounterparty(client.id);
  const app = await mount(createElement(screens.WorkClientsScreen), f.db); t.after(app.unmount);
  await app.tapSet('Open Archived debtor details'); await app.press('Record payment from Archived debtor');
  assert.equal(app.find('AutocompleteField', 'Client *').props.value, client.id);
  assert.ok(!app.nodes().some((node) => node.props?.accessibilityLabel === 'Allocate payment to Other work'));
  const selector = app.find('AutocompleteField', 'Client *');
  await act(() => (selector.props.onSelect as (id: string) => void)(other.id));
  assert.ok(app.find('Pressable', 'Allocate payment to Other work'));
  await act(() => (selector.props.onSelect as (id: string) => void)(client.id));
  await app.tapSet('Allocate payment to Logo'); await app.change('Allocation in reais for Logo', '40');
  await app.tapSet('Allocate payment to Translation');
  const input = app.find('FormField', 'Allocation in reais for Logo'); const modal = app.find('Modal');
  runtime.fixture.failures.add('work.readOverview'); await app.refocus();
  assert.equal(app.find('Modal'), modal); assert.equal(app.find('FormField', 'Allocation in reais for Logo'), input); assert.equal(input.props.value, '40');
  runtime.fixture.failures.clear(); await app.press('Retry refresh'); assert.equal(input.props.value, '40');
  await app.press('Confirm');
  assert.equal(f.work.readDetail(a).items[0].outstandingMinor, 6000); assert.equal(f.work.readDetail(b).items[0].outstandingMinor, 0);
  assert.equal(f.finance.read().transactions[0].amountMinor, 24000);
  assert.equal(f.work.readOverview().totals.outstandingMinor, 96000n);
});

test('Job rows keep Title first, bound description previews, show partial/Paid/overdue states and retain complete large amounts', async (t) => {
  const f = await initialized(t); const client = f.work.createCounterparty('Secondary Client');
  const title = 'A very long job title that wraps naturally without a narrow fixed width '.repeat(3);
  const description = 'Detailed supporting context that must stay available in full. '.repeat(80).trimEnd();
  const a = f.create(client.id, description, { title, fixedAmount: formatBrlInput(maxAmountMinor), expectedPaymentDate: '2020-01-01' });
  const b = f.create(client.id, 'Other description', { title: 'Partially paid job' }); f.pay(client.id, [{ workEntryId: b, amount: '400' }]);
  const c = f.create(client.id, 'Settled description', { title: 'Paid job' }); f.pay(client.id, [{ workEntryId: c, amount: '1000' }]);
  const app = await mountWorkStack(t, f.db); t.after(app.unmount);
  assert.equal(rows(app, 'work-entry').length, 2); assert.equal(rows(app, 'work-clients').length, 0);
  const attention = rows(app, 'work-attention')[0]; const jobs = rows(app, 'work-jobs')[0];
  assert.equal(rows(app, 'work-attention').length, 1); assert.ok(attention.textContent.includes(title.trim())); assert.ok(!jobs.textContent.includes(title.trim()));
  assert.ok(jobs.textContent.includes('Partially paid')); assert.ok(jobs.textContent.includes('R$ 600,00 outstanding of R$ 1.000,00'));
  const row = rows(app, 'work-entry')[0]; assert.ok(row.textContent.includes(formatBrlAmount(maxAmountMinor)));
  const preview = app.nodes(row).find((node) => node.props?.testID === 'job-description')!; assert.equal(preview.props.numberOfLines, 2);
  const heading = app.nodes(row).find((node) => node.props?.testID === 'job-title')!; assert.equal(heading.props.numberOfLines, undefined);
  await act(() => (row.props.onPress as () => void)());
  const full = app.nodes().find((node) => node.props?.testID === 'job-description' && node.props.numberOfLines === undefined)!;
  assert.equal(full.textContent, description); assert.equal(f.work.readDetail(a).items[0].entry.description, description);
  await app.press('Back'); await menu(app, 'Work options', 'History');
  const paid = rows(app, 'work-entry').find((node) => String(node.props.accessibilityLabel).startsWith('Paid job,'))!;
  assert.ok(paid.textContent.includes('Paid')); assert.ok(!paid.textContent.includes('Overdue'));
});

test('empty workspace keeps zero metrics and primary Add, distinct from initial loading/error', async (t) => {
  const f = await initialized(t); runtime.fixture.db = f.db;
  const loading: string[] = []; const indicator = (runtime.native as { ActivityIndicator: { render: (props: { accessibilityLabel: string }) => unknown } }).ActivityIndicator;
  t.mock.method(indicator, 'render', (props: { accessibilityLabel: string }) => { loading.push(props.accessibilityLabel); return null; });
  const markup = renderToStaticMarkup(createElement(screens.FinanceScreen, { initialView: 'work' }));
  assert.deepEqual(loading, ['Loading Finance']); assert.ok(!markup.includes('No work yet'));
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'work' }), f.db, ['work.readOverview']); t.after(app.unmount);
  assert.equal(rows(app, 'work-metric-outstanding').length, 0);
  runtime.fixture.failures.clear(); await app.press('Retry'); assertTotals(app, 0n, 0n);
  assert.equal(app.find('FormButton', 'Add work').props.variant, 'primary'); assert.ok(app.container.textContent.includes('No work yet'));
  assert.equal(rows(app, 'work-clients').length, 0); assert.equal(rows(app, 'work-attention').length, 0);
  const outstandingText = app.nodes(metric(app, 'Outstanding')).find((node) => node.kind === 'ThemedText' && node.textContent === 'R$ 0,00')!;
  assert.equal(outstandingText.props.type, 'metric');
});

test('job-first overview exposes partial/multiple entries and exposes all old overdue money, including archived clients', async (t) => {
  const f = await initialized(t); const a = f.work.createCounterparty('Acme'); const b = f.work.createCounterparty('Bruno'); const archived = f.work.createCounterparty('Archived debtor'); const zero = f.work.createCounterparty('Settled client');
  const old = f.create(a.id, 'Ancient logo', { expectedPaymentDate: '2020-01-01' }); f.pay(a.id, [{ workEntryId: old, amount: '400' }]);
  f.create(a.id, 'Future project', { fixedAmount: '200', expectedPaymentDate: addDays(today, 1) }); f.create(a.id, 'No expected date', { fixedAmount: '50' });
  f.create(b.id, 'Current work'); f.create(archived.id, 'Archived debt', { expectedPaymentDate: '2021-01-01' }); f.work.archiveCounterparty(archived.id);
  const settled = f.create(zero.id, 'Old settled', { expectedPaymentDate: '2020-01-01' }); f.pay(zero.id, [{ workEntryId: settled, amount: '1000' }]);
  const clients = receivableClients(f.work.readOverview()); const acme = clients.find((group) => group.counterparty.id === a.id)!;
  assert.equal(acme.outstandingMinor, 85000n); assert.equal(acme.openCount, 3); assert.equal(acme.overdueCount, 1);
  assert.equal(clients.length, 3); assert.ok(!clients.some((group) => group.counterparty.id === zero.id));
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'work' }), f.db); t.after(app.unmount);
  assertTotals(app, 425000n, 140000n); assert.equal(rows(app, 'work-client').length, 0); assert.equal(rows(app, 'work-entry').length, 5); assert.equal(rows(app, 'work-jobs').length, 1);
  assert.ok(rows(app, 'work-entry').some((row) => row.textContent.includes('Ancient logo') && row.textContent.includes(dateLabel('2020-01-01'))));
  assert.ok(app.container.textContent.includes('Future project')); assert.ok(app.container.textContent.includes('No expected date')); assert.ok(!app.container.textContent.includes('Old settled'));
  await openClient(app, 'Archived debtor'); assert.ok(app.container.textContent.includes('Archived client'));
  assert.ok(app.find('FormButton', 'Record payment from Archived debtor'));
  assert.ok(!app.nodes().some((node) => node.props?.accessibilityLabel === 'Add work for Archived debtor'));
  await app.press('Record payment from Archived debtor'); assert.equal(app.find('AutocompleteField', 'Client *').props.value, archived.id);
});

test('Add Work groups existing fields, quick-creates accent-distinct Client, and does not create Finance Income', async (t) => {
  const f = await initialized(t); const accented = f.work.createCounterparty('Álvaro');
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'work' }), f.db); t.after(app.unmount);
  await app.press('Add work');
  for (const heading of ['Job', 'Pricing', 'Payment expectation']) assert.ok(app.nodes().some((node) => node.kind === 'ThemedText' && node.props.accessibilityRole === 'header' && node.textContent === heading));
  const field = app.find('AutocompleteField', 'Client *'); const results = (field.props.getResults as (query: string) => { suggestions: { value: string }[]; createLabel: string })('Alvaro');
  assert.equal(results.suggestions[0].value, accented.id); assert.equal(results.createLabel, '+ Create "Alvaro"');
  let id = ''; await act(() => { id = (field.props.onCreate as (name: string) => string)('Alvaro'); (field.props.onSelect as (id: string) => void)(id); });
  assert.notEqual(id, accented.id); assert.equal(app.find('AutocompleteField', 'Client *').props.value, id);
  assert.throws(() => f.work.createCounterparty('ÁLVARO'), /already exists/); assert.throws(() => f.work.createCounterparty('A\u0301lvaro'), /already exists/);
  await app.change('Job title *', 'Hourly job'); await app.change('Description', 'Hourly work'); await app.change('Hours', '2'); await app.change('Minutes', '30'); await app.change('Hourly rate *', '50'); await app.change('Expected payment date', today);
  await app.press('Save'); assertTotals(app, 12500n, 0n);
  assert.equal(f.finance.readDashboard(periodBounds('month', today)).analytics.incomeMinor, 0n);
  const entry = f.work.readOverview().items[0]; assert.equal(entry.entry.durationMinutes, 150); assert.equal(entry.entry.hourlyRateMinor, 5000);
  await app.press('Overview'); assert.ok(app.container.textContent.includes('IncomeR$ 0,00'));
});

test('client payment supports partial receipt then multi-entry settlement and exact linked Income; Undo restores Home/Calendar/Overview', async (t) => {
  const f = await initialized(t); const client = f.work.createCounterparty('Acme'); const first = f.create(client.id, 'Logo detail', { title: 'Logo', expectedPaymentDate: addDays(today, -1) });
  const home = createHomeDataAccess(f.db, randomUUID); const calendar = createCalendarDataAccess(f.db, randomUUID);
  const expectedItems = () => calendar.readRange({ from: addDays(today, -1), to: today }).filter((row) => row.source === 'work');
  const homeDebt = () => home.read().attention.flatMap((section) => section.items).filter((item) => item.source === 'work');
  assert.equal(homeDebt().length, 1);
  const app = await mountWorkStack(t, f.db); t.after(app.unmount);
  await openClient(app, 'Acme'); await app.press('Record payment from Acme');
  assert.equal(app.find('AutocompleteField', 'Client *').props.value, client.id);
  await app.tapSet('Allocate payment to Logo'); assert.equal(app.find('FormField', 'Allocation in reais for Logo').props.value, formatBrlInput(100000));
  await app.change('Allocation in reais for Logo', '400'); assert.ok(app.container.textContent.includes('Receiving R$ 400,00')); assert.ok(app.container.textContent.includes('Remaining after payment R$ 600,00'));
  const confirm = app.find('FormButton', 'Confirm').props.onPress as () => void; await act(() => { confirm(); confirm(); });
  assert.equal(f.finance.read().transactions.length, 1); assertTotals(app, 100000n, 40000n);
  assert.equal(expectedItems()[0].amountMinor, 60000); assert.equal(homeDebt()[0].source, 'work');
  await app.press('Overview'); assert.ok(app.container.textContent.includes('IncomeR$ 400,00')); assert.ok(app.container.textContent.includes('Net FlowR$ 400,00'));
  await app.press('Transactions'); assert.ok(app.container.textContent.includes(' · Work')); assert.ok(!app.nodes().some((node) => node.props?.label === 'Delete'));
  const second = f.create(client.id, 'Translation detail', { title: 'Translation', fixedAmount: '100', expectedPaymentDate: today });
  await app.press('Work'); await openClient(app, 'Acme'); await app.press('Record payment from Acme');
  await app.tapSet('Allocate payment to Logo'); await app.tapSet('Allocate payment to Translation');
  assert.ok(app.container.textContent.includes('Payment total: R$ 700,00')); assert.ok(app.container.textContent.includes('Remaining after payment R$ 0,00'));
  await app.press('Confirm'); assertTotals(app, 110000n, 110000n); assert.equal(rows(app, 'work-client').length, 0);
  assert.equal(rows(app, 'work-attention').length, 0); assert.equal(expectedItems().length, 0); assert.equal(homeDebt().length, 0);
  const payment = f.work.readDetail(second).payments[0]; assert.equal(payment.allocations.reduce((sum, allocation) => sum + BigInt(allocation.amountMinor), 0n), 70000n); assert.equal(payment.transaction.amountMinor, 70000);
  assert.deepEqual(new Set(payment.allocations.map((row) => row.title)), new Set(['Logo', 'Translation']));
  assert.ok(payment.allocations.every((row) => row.title !== row.description));
  await menu(app, 'Work options', 'History'); assert.equal(rows(app, 'work-receipt').length, 2);
  const receipt = rows(app, 'work-receipt').find((row) => row.textContent.includes('R$ 700,00'))!;
  const body = app.nodes(receipt).find((node) => node.kind === 'Pressable')!; await act(() => (body.props.onPress as () => void)());
  assert.ok(receipt.textContent.includes('Logo · Received R$ 600,00')); assert.ok(receipt.textContent.includes('Translation · Received R$ 100,00'));
  const trigger = app.nodes(receipt).find((node) => node.kind === 'FormButton')!;
  await menu(app, String(trigger.props.accessibilityLabel), 'Undo payment'); await app.confirm('Confirm');
  assert.equal(f.finance.read().transactions.length, 1); assert.equal(homeDebt().length, 1); assert.equal(expectedItems().length, 2);
  await app.press('Back to Work'); assertTotals(app, 110000n, 40000n); assert.equal(rows(app, 'work-entry').length, 2);
  assert.equal(f.work.readDetail(first).items[0].outstandingMinor, 60000);
  await app.press('Overview'); assert.ok(app.container.textContent.includes('IncomeR$ 400,00'));
});

test('client details prefill Add work and archived/settled Clients remain reachable through anchored management', async (t) => {
  const f = await initialized(t); const active = f.work.createCounterparty('Active'); f.create(active.id, 'Work'); const archived = f.work.createCounterparty('Historical'); f.work.archiveCounterparty(archived.id);
  const app = await mountWorkStack(t, f.db); t.after(app.unmount);
  await app.press('Work options'); assert.equal(app.nodes().filter((node) => node.kind === 'Modal').length, 0);
  await app.tapSet('Close work options'); assert.equal(app.find('FormButton', 'Work options').props.expanded, false);
  await openClient(app, 'Active'); await app.press('Add work for Active'); assert.equal(app.find('AutocompleteField', 'Client *').props.value, active.id); await app.press('Cancel');
  await menu(app, 'Work options', 'Clients'); assert.ok(app.container.textContent.includes('Active clients')); assert.ok(app.container.textContent.includes('Archived clients'));
  assert.ok(app.find('Pressable', 'Open Active details').textContent.includes('Outstanding R$ 1.000,00'));
  assert.ok(app.find('Pressable', 'Open Historical details').textContent.includes('Outstanding R$ 0,00'));
  await app.tapSet('Open Historical details'); assert.ok(app.container.textContent.includes('No open work')); assertTotals(app, 0n, 0n);
  await app.press('Back');
  await menu(app, 'Client options for Active', 'Archive'); await app.confirm('Confirm');
  await app.press('Back to Work'); assert.ok(rows(app, 'work-entry')[0].textContent.includes('Archived')); assert.equal(f.work.readOverview().totals.outstandingMinor, 100000n);
});

test('client-filtered History pages are bounded, stable across equal dates and receipts, and retain archived labels', async (t) => {
  const f = await initialized(t); const a = f.work.createCounterparty('Paged client'); const b = f.work.createCounterparty('Other client');
  for (let index = 0; index < 45; index++) {
    const id = f.create(a.id, `Settled ${index}`, { fixedAmount: '1' }); f.pay(a.id, [{ workEntryId: id, amount: '1' }]);
    const other = f.create(b.id, `Other ${index}`, { fixedAmount: '2' }); f.pay(b.id, [{ workEntryId: other, amount: '2' }]);
  }
  f.work.archiveCounterparty(a.id);
  let cursor: WorkHistoryPage['next']; const ids: string[] = []; const receipts: string[] = [];
  for (let index = 0; index < 3; index++) {
    const measured = f.measure(() => f.work.readHistory(20, cursor ?? undefined, a.id)); const page = measured.value;
    assert.equal(measured.count, 9); assert.equal(page.items.length, index === 2 ? 5 : 20); assert.equal(page.payments.length, index === 2 ? 5 : 20);
    assert.equal(page.settledCount, 45); assert.equal(page.paymentCount, 45);
    assert.ok(page.items.every((item) => item.counterparty.id === a.id && item.counterparty.deletedAt !== null)); assert.ok(page.payments.every((payment) => payment.counterparty.id === a.id));
    for (const statement of measured.statements.filter((row) => row.sql.includes('"description"'))) assert.ok(statement.rows <= 20);
    ids.push(...page.items.map((item) => item.entry.id)); receipts.push(...page.payments.map((payment) => payment.transaction.id)); cursor = page.next;
  }
  assert.equal(new Set(ids).size, 45); assert.equal(new Set(receipts).size, 45); assert.equal(cursor!, null);
  const all = f.work.readHistory(100, undefined, a.id); assert.deepEqual(ids, all.items.map((item) => item.entry.id)); assert.deepEqual(receipts, all.payments.map((payment) => payment.transaction.id));
  const app = await mount(createElement(screens.WorkClientsScreen), f.db); t.after(app.unmount);
  await menu(app, 'Client options for Paged client', 'History');
  assert.equal(rows(app, 'work-receipt').length, 20); assert.ok(rows(app, 'work-receipt').every((row) => row.textContent.includes('Paged client')));
  await app.press('Load more history'); assert.equal(rows(app, 'work-receipt').length, 40); await app.press('Load more history'); assert.equal(rows(app, 'work-receipt').length, 45);
  assert.ok(!app.nodes().some((node) => node.props?.label === 'Load more history'));
  assert.deepEqual(f.sqlite.prepare('PRAGMA integrity_check').all().map((row) => row.integrity_check), ['ok']); assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []);
});

for (const [width, fontScale] of [[390, 1], [390, 2], [280, 1]] as const) test(`large exact totals and long client labels adapt at width ${width}, font scale ${fontScale}`, async (t) => {
  const f = await initialized(t); const name = 'A very long client name that needs space to wrap naturally'; const client = f.work.createCounterparty(name);
  for (let index = 0; index < 12; index++) f.create(client.id, `Long description ${index}`, { fixedAmount: formatBrlInput(maxAmountMinor) });
  t.mock.method(runtime.native as { useWindowDimensions: () => object }, 'useWindowDimensions', () => ({ width, height: 800, fontScale, scale: 1 }));
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'work' }), f.db); t.after(app.unmount);
  assertTotals(app, BigInt(maxAmountMinor) * 12n, 0n); assert.equal(rows(app, 'work-entry').length, 12);
  const comparison = rows(app, 'work-secondary-metrics')[0]; assert.equal(Object.assign({}, ...(comparison.props.style as object[])).flexDirection, 'column');
  for (const node of app.nodes().filter((node) => node.kind === 'ThemedText' && node.props?.testID !== 'job-description')) { assert.equal(node.props.numberOfLines, undefined); assert.equal(node.props.ellipsizeMode, undefined); }
  assert.equal((rows(app, 'work-entry')[0].props.style as { minHeight: number }[])[0].minHeight, 44);
  assert.ok(String(rows(app, 'work-entry')[0].props.accessibilityLabel).includes(name));
  const navigation = app.nodes().find((node) => node.props?.accessibilityLabel === 'Finance destinations')!; assert.equal(navigation.props.horizontal, true);
});

test('paid Work editor retains readable locked Client and rejects reducing Earned below Received without losing input', async (t) => {
  const f = await initialized(t); const client = f.work.createCounterparty('Client'); const id = f.create(client.id, 'Paid work'); f.pay(client.id, [{ workEntryId: id, amount: '400' }]);
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'work', initialRecordId: id }), f.db); t.after(app.unmount);
  await menu(app, 'Work options for Paid work', 'Edit'); assert.equal(app.find('FormField', 'Client *').props.editable, false); assert.equal(app.find('FormField', 'Client *').props.value, 'Client');
  await app.change('Fixed amount *', '300'); await app.press('Save'); assert.equal(app.find('FormField', 'Fixed amount *').props.value, '300');
  assert.equal(f.work.readDetail(id).items[0].earnedMinor, 100000); assert.match(app.find('FormError').textContent, /received/i);
});

test('client payment and last-good metrics survive a failed refresh and Retry without overwriting allocations', async (t) => {
  const f = await initialized(t); const client = f.work.createCounterparty('Client'); const id = f.create(client.id, 'Work');
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'work' }), f.db); t.after(app.unmount);
  await openClient(app, 'Client'); await app.press('Record payment from Client'); await app.tapSet('Allocate payment to Work');
  await app.change('Allocation in reais for Work', '400'); const modal = app.find('Modal'); const input = app.find('FormField', 'Allocation in reais for Work');
  runtime.fixture.failures.add('work.readOverview'); f.pay(client.id, [{ workEntryId: id, amount: '100' }]);
  await app.resume(); await app.refocus(); assert.equal(app.find('Modal'), modal); assert.equal(app.find('FormField', 'Allocation in reais for Work'), input);
  assert.equal(input.props.value, '400'); assertTotals(app, 100000n, 0n);
  runtime.fixture.failures.clear(); await app.press('Retry refresh'); assert.equal(app.find('Modal'), modal); assert.equal(input.props.value, '400');
  assert.ok(app.container.textContent.includes('Remaining after payment R$ 500,00'));
  await app.press('Confirm'); assertTotals(app, 100000n, 50000n); assert.equal(f.finance.read().transactions.length, 2);
});

for (const mode of ['light', 'dark'] as const) test(`${mode} overdue rows use semantic attention with readable dates, not error panels`, async (t) => {
  const f = await initialized(t); const client = f.work.createCounterparty('Client'); f.create(client.id, 'Old overdue', { expectedPaymentDate: '2020-01-01' });
  t.mock.method(runtime.native as { useColorScheme: () => string }, 'useColorScheme', () => mode);
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'work' }), f.db); t.after(app.unmount);
  const attention = rows(app, 'work-attention')[0]; assert.ok(attention.textContent.includes('Overdue')); assert.ok(attention.textContent.includes(dateLabel('2020-01-01')));
  assert.ok(app.nodes(attention).some((node) => node.props?.themeColor === 'warning'));
  assert.ok(!app.nodes(attention).some((node) => node.props?.themeColor === 'danger' || node.props?.accessibilityRole === 'alert'));
});

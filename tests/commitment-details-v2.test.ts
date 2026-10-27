/// <reference types="node" />
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import type { CommitmentDraft } from '../src/features/finance/commitments/types';
import { formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { addDays, addMonths, dateLabel, localDateString } from '../src/utils/calendar';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const require = createRequire(import.meta.url);
const today = localDateString(new Date());
type App = Awaited<ReturnType<typeof mount>>;
const { CommitmentDetails } = require('../src/features/finance/commitments/components/commitment-details') as typeof import('../src/features/finance/commitments/components/commitment-details');
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); }); }
async function menu(app: App, label: string, action: string) { await app.press(label); await app.press(action); await settle(); }
function metric(app: App, label: string) { return app.nodes().find(n => n.props?.testID === `commitment-metric-${label}`)!; }
function detailsList(app: App) { const list = app.nodes().find(n => n.kind === 'SectionList' && n.props?.testID === 'commitment-details-list'); assert.ok(list); return list; }
function detailRows(app: App, id: string) { return app.nodes(detailsList(app)).filter(n => n.props?.testID === id); }
async function setup(t: TestContext, changes: Partial<CommitmentDraft> = {}) {
  const f = await journalDatabase(); f.setTime(today); t.after(() => f.sqlite.close());
  const id = f.commitments.create({ ...commitmentDraft(null, undefined, today), title: 'Internet', amount: '150', ...changes });
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments' }), f.db); t.after(app.unmount);
  async function open() { await menu(app, 'Commitment options', 'Manage commitments'); await app.tapSet('Manage Internet'); }
  return { ...f, id, app, open };
}

for (const [kind, icon] of [['bill', 'receipt'], ['subscription', 'repeat'], ['installment', 'layers']] as const) test(`${kind} Details opens with generic header and saved read-only overview`, async t => {
  const f = await setup(t, { kind, installmentCount: kind === 'installment' ? '10' : '' }); await f.open();
  const overview = f.app.nodes().find(n => n.props?.testID === 'commitment-details-overview')!;
  assert.ok(overview.textContent.includes('Internet')); assert.ok(overview.textContent.includes('Active'));
  assert.ok(f.app.nodes(overview).some(n => n.props?.testID === `icon-${icon}`));
  assert.ok(!f.app.nodes(overview).some(n => n.props?.accessibilityRole === 'button'));
  assert.ok(f.app.container.textContent.includes('Commitment details'));
  assert.ok(metric(f.app, kind === 'installment' ? 'Expected per installment' : 'Expected').textContent.includes('R$ 150,00'));
  assert.ok(metric(f.app, 'Category').textContent.includes('No category')); assert.ok(metric(f.app, 'Total paid').textContent.includes('R$ 0,00'));
  assert.ok(metric(f.app, 'Frequency').textContent.includes(`Monthly on day ${Number(today.slice(-2))}`));
  assert.ok(metric(f.app, 'Current schedule starts').textContent.includes(dateLabel(today)));
  const versions = detailRows(f.app, 'commitment-schedule-row'); assert.equal(versions.length, 1); assert.ok(versions[0].textContent.includes('Current'));
  assert.ok(!f.app.nodes(versions[0]).some(n => n.props?.accessibilityRole === 'button' || n.props?.testID === 'icon-forward'));
  await f.app.press('Back'); assert.ok(!f.app.nodes().some(n => n.props?.testID === 'commitment-details-overview'));
});

test('archived category and actual paid total retain exact provenance across History Undo', async t => {
  const f = await setup(t); const category = f.finance.createCategory('Historical utilities', 'expense');
  const before = f.commitments.read().items[0]; f.commitments.edit(f.id, { ...commitmentDraft(before.commitment, before.schedule), categoryId: category.id });
  f.commitments.pay(f.commitments.readHistory(f.id).outstanding[0], '125,37', today); f.finance.deleteCategory(category.id); await f.app.resume(); await f.open();
  assert.ok(metric(f.app, 'Category').textContent.includes('Historical utilities')); assert.ok(metric(f.app, 'Total paid').textContent.includes('R$ 125,37'));
  await f.app.tapSet('View history'); assert.ok(f.app.container.textContent.includes('Paid and skipped')); assert.ok(f.app.container.textContent.includes('Paid R$ 125,37'));
  await f.app.press(`Undo payment for Internet, due ${dateLabel(today)}`); await f.app.confirm('Confirm'); await f.app.tapSet('View commitment');
  assert.ok(metric(f.app, 'Total paid').textContent.includes('R$ 0,00')); assert.ok(detailRows(f.app, 'commitment-obligation').some(n => n.textContent.includes('R$ 150,00')));
  assert.equal(f.finance.read().transactions.length, 0);
});

test('multiple schedule versions preserve ordering, effective boundaries, old amounts and unchanged saved rows', async t => {
  const f = await setup(t, { firstDueDate: addMonths(today, -2) });
  const item = f.commitments.read().items[0]; f.commitments.edit(f.id, { ...commitmentDraft(item.commitment, item.schedule), amount: '175' });
  const before = f.commitments.readHistory(f.id); await f.app.resume(); await f.open();
  const rows = detailRows(f.app, 'commitment-schedule-row'); assert.equal(rows.length, 2);
  assert.ok(rows[0].textContent.includes(`Ends before ${dateLabel(before.versions[0].effectiveUntil!)}`));
  assert.ok(rows[0].textContent.includes('R$ 150,00')); assert.ok(rows[1].textContent.includes('R$ 175,00')); assert.ok(rows[1].textContent.includes('Current'));
  assert.ok(rows[1].textContent.includes(`Effective from ${dateLabel(before.versions[1].effectiveFrom)}`));
  assert.ok(metric(f.app, 'Expected').textContent.includes('R$ 175,00'));
  const obligations = detailRows(f.app, 'commitment-obligation'); assert.ok(obligations.some(n => n.textContent.includes('R$ 150,00') && n.textContent.includes('Overdue')));
  assert.deepEqual(f.commitments.readHistory(f.id).versions, before.versions);
});

for (const state of ['paused', 'ended', 'completed'] as const) test(`${state} Details conveys parent state without implying an active recurrence`, async t => {
  const f = await setup(t, state === 'completed' ? { kind: 'installment', installmentCount: '1' } : {});
  if (state === 'completed') f.commitments.pay(f.commitments.readHistory(f.id).outstanding[0], '150', today);
  else if (state === 'paused') f.commitments.pause(f.id); else f.commitments.end(f.id);
  await f.app.resume(); await f.open();
  const overview = f.app.nodes().find(n => n.props?.testID === 'commitment-details-overview')!; assert.ok(overview.textContent.includes(state[0].toUpperCase() + state.slice(1)));
  assert.ok(metric(f.app, 'Latest schedule frequency')); assert.ok(metric(f.app, 'Latest schedule starts'));
  const rows = detailRows(f.app, 'commitment-schedule-row'); assert.ok(rows.every(n => !n.textContent.includes('Current')));
  if (state === 'completed') { assert.ok(rows[0].textContent.includes('Completed schedule')); assert.equal(detailRows(f.app, 'commitment-obligation').length, 0); assert.ok(f.app.container.textContent.includes('No unresolved occurrences')); }
  else assert.ok(rows[0].textContent.includes('Ends before'));
  await f.app.press('Series options for Internet');
  assert.equal(!!f.app.nodes().find(n => n.props?.label === 'Resume'), state === 'paused'); assert.ok(!f.app.nodes().some(n => ['Restore', 'Archive', 'Delete', 'Pause'].includes(n.props?.label as string)));
});

test('Details shares compact v2.1 cards with independent Pay and Skip, without redundant body navigation', async t => {
  const f = await setup(t, { firstDueDate: addDays(today, -1) }); await f.open();
  const card = detailRows(f.app, 'commitment-obligation')[0]; assert.ok(card.textContent.includes('Overdue'));
  const content = f.app.nodes(card).find(n => n.props?.testID === 'commitment-content')!;
  assert.equal(Object.assign({}, ...[content.props.style].flat(Infinity)).flexDirection, 'row');
  assert.ok(!f.app.nodes(card).some(n => n.props?.accessibilityRole === 'button' && String(n.props.accessibilityLabel).startsWith('Internet, expected')));
  const due = addDays(today, -1); await f.app.press(`Actions for Internet, due ${dateLabel(due)}`);
  assert.ok(f.app.find('FormButton', `Skip Internet, due ${dateLabel(due)}`)); assert.ok(!f.app.nodes().some(n => n.props?.label === 'View commitment'));
  await f.app.press('Skip'); assert.equal(f.commitments.readHistory(f.id).outstanding.length, 1); await f.app.confirm('Confirm'); await settle();
  assert.equal(f.commitments.readHistory(f.id).outstanding.length, 0); assert.equal(f.finance.read().transactions.length, 0);
});

test('Pay enters existing v2 confirmation with the occurrence amount and creates no Expense before Confirm', async t => {
  const f = await setup(t, { firstDueDate: addDays(today, -1) }); await f.open();
  await f.app.press(`Pay Internet, due ${dateLabel(addDays(today, -1))}`); assert.ok(f.app.nodes().some(n => n.props?.testID === 'commitment-payment-summary'));
  assert.equal(f.app.find('FormField', 'Actual amount paid *').props.value, '150,00'); assert.equal(f.finance.read().transactions.length, 0);
  await f.app.press('Confirm'); assert.equal(f.finance.read().transactions.length, 1);
});

test('Calendar-selected distant occurrence stays focused and can open the full series intentionally', async t => {
  const f = await journalDatabase(); f.setTime(today); t.after(() => f.sqlite.close()); const distant = addMonths(today, 7);
  const id = f.commitments.create({ ...commitmentDraft(null, undefined, today), title: 'Calendar debt', amount: '100' });
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments', initialRecordId: id, initialDueDate: distant }), f.db); t.after(app.unmount);
  const rows = detailRows(app, 'commitment-obligation'); assert.equal(rows.length, 1); assert.ok(rows[0].textContent.includes(dateLabel(distant))); assert.ok(app.container.textContent.includes('Selected obligation'));
  await menu(app, `Actions for Calendar debt, due ${dateLabel(distant)}`, 'View commitment');
  assert.ok(app.container.textContent.includes('Unpaid occurrences')); assert.ok(detailRows(app, 'commitment-obligation').some(n => n.textContent.includes('Due today')));
  assert.equal(f.finance.read().transactions.length, 0);
});

test('many versions and unpaid rows use a bounded variable-height list with complete maximum values at 2x', async t => {
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width: 320, height: 700, fontScale: 2, scale: 1 }));
  const f = await journalDatabase(); f.setTime('2026-01-01'); t.after(() => f.sqlite.close());
  const title = 'LongUnbrokenCommitmentName'.repeat(4); const category = f.finance.createCategory('A long historical category describing the full household purpose', 'expense');
  const id = f.commitments.create({ ...commitmentDraft(null, undefined, '2026-01-01'), title, amount: formatBrlInput(maxAmountMinor), categoryId: category.id });
  f.commitments.pay(f.commitments.readHistory(id).outstanding[0], formatBrlInput(maxAmountMinor), '2026-01-01');
  for (let i = 2; i <= 15; i++) { f.setTime(`2026-01-${String(i).padStart(2, '0')}`); const item = f.commitments.read().items[0]; f.commitments.edit(id, { ...commitmentDraft(item.commitment, item.schedule), amount: i % 2 ? formatBrlInput(maxAmountMinor) : '150' }); }
  f.setTime(today); const data = f.commitments.readHistory(id);
  const modal = require('../src/components/adaptive-sheet') as typeof import('../src/components/adaptive-sheet');
  const props = { onDismiss() {}, children: createElement(CommitmentDetails, { data, pending: data.outstanding, focused: false, categories: f.finance.readCategories(), today, actions: [], error: null, onDismiss() {}, onHistory() {}, onPay() {}, onSkip() {}, onViewSeries() {} }) };
  const app = await mount(createElement(modal.AdaptiveModal, props), f.db); t.after(app.unmount);
  const list = detailsList(app); assert.equal(list.props.initialNumToRender, 6); assert.equal(list.props.maxToRenderPerBatch, 6); assert.equal(list.props.windowSize, 5); assert.equal(list.props.getItemLayout, undefined);
  assert.ok(app.container.textContent.includes(title)); assert.ok(app.container.textContent.includes('R$ 90.071.992.547.409,91'));
  assert.ok(metric(app, 'Total paid').textContent.includes('R$ 90.071.992.547.409,91'));
  assert.equal(detailRows(app, 'commitment-schedule-row').length, 15); assert.ok(!app.nodes(list).some(n => n.kind === 'ScrollView'));
  const sections = list.props.sections as { data: unknown[] }[]; assert.equal(sections[0].data.length, data.versions.length);
});

test('Details header Pause refreshes the authoritative overview and eligible Resume opens the existing v2 flow', async t => {
  const f = await setup(t); await f.open();
  await menu(f.app, 'Series options for Internet', 'Pause'); assert.equal(f.commitments.read().items[0].commitment.status, 'active');
  await f.app.confirm('Confirm'); assert.equal(f.commitments.read().items[0].commitment.status, 'paused');
  assert.ok(f.app.nodes().find(n => n.props?.testID === 'commitment-details-overview')!.textContent.includes('Paused'));
  await menu(f.app, 'Series options for Internet', 'Resume'); assert.ok(f.app.nodes().some(n => n.props?.testID === 'commitment-resume-summary'));
  await f.app.press('Cancel'); assert.equal(f.commitments.read().items[0].commitment.status, 'paused');
});

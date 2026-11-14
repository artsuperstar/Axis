/// <reference types="node" />
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { DesignColors } from '../src/constants/design-system-v2';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import type { CommitmentKind } from '../src/features/finance/commitments/types';
import { dateLabel } from '../src/utils/calendar';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const today = '2026-11-13';
type App = Awaited<ReturnType<typeof mount>>;
type State = 'active' | 'paused' | 'ended' | 'completed' | 'assigned';
const flat = (style: unknown): Record<string, unknown> => Object.assign({}, ...[style].flat(Infinity));
async function menu(app: App, trigger: string, action: string) {
  await app.press(trigger);
  await act(async () => { await app.press(action); await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); });
}
async function fixture(t: TestContext, kind: CommitmentKind = 'bill', state: State = 'active') {
  const f = await journalDatabase(); t.after(() => f.sqlite.close()); f.setTime(today); t.mock.method(Date, 'now', f.now);
  const create = (title: string, type: CommitmentKind = kind, firstDueDate = '2026-11-01', count = '2') => f.commitments.create({
    ...commitmentDraft(null, undefined, firstDueDate), title, kind: type, amount: '150,01', installmentCount: type === 'installment' ? count : '',
  });
  const id = create('Reviewed series', kind, state === 'paused' && kind === 'installment' ? '2026-12-01' : state === 'assigned' ? '2026-10-01' : '2026-11-01');
  if (state === 'paused' || state === 'assigned') f.commitments.pause(id);
  if (state === 'ended') f.commitments.end(id);
  if (state === 'completed') {
    for (const row of f.commitments.readHistory(id).outstanding) f.commitments.skip(row);
    f.setTime('2026-12-01');
    for (const row of f.commitments.readHistory(id).outstanding) f.commitments.skip(row);
    f.setTime(today);
  }
  f.commitments.read();
  const open = async () => {
    const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments' }), f.db); t.after(app.unmount);
    await menu(app, 'Commitment options', 'Manage commitments'); return app;
  };
  return { ...f, id, create, open };
}
const snapshot = (f: Awaited<ReturnType<typeof fixture>>) => ['finance_commitments', 'finance_commitment_schedules', 'finance_commitment_occurrences', 'finance_transactions']
  .map(table => f.sqlite.prepare(`SELECT * FROM ${table} ORDER BY id`).all());
const combinations: [CommitmentKind, State][] = [
  ['bill', 'active'], ['bill', 'paused'], ['bill', 'ended'], ['subscription', 'active'], ['subscription', 'paused'], ['subscription', 'ended'],
  ['installment', 'active'], ['installment', 'paused'], ['installment', 'assigned'], ['installment', 'completed'],
];
for (const [kind, state] of combinations) test(`${kind}/${state}: management actions follow source eligibility and opening performs no financial writes`, async t => {
  const f = await fixture(t, kind, state), item = f.commitments.read().items.find(i => i.commitment.id === f.id)!, before = snapshot(f), app = await f.open();
  assert.ok(app.container.textContent.includes(`Monthly on day ${item.schedule.billingDay}`));
  assert.ok(app.container.textContent.includes('R$ 150,01'));
  const trigger = app.find('FormButton', 'Series options for Reviewed series'); assert.equal(trigger.props.appearance, 'v2');
  await app.press('Series options for Reviewed series');
  const expected = ['Edit', ...(item.commitment.status === 'active' ? ['Pause'] : []), ...(item.canResume ? ['Resume'] : []),
    ...(kind !== 'installment' && ['active', 'paused'].includes(item.commitment.status) ? ['End'] : []), 'History'];
  const actions = app.nodes().filter(n => n.kind === 'FormButton' && ['Edit', 'Pause', 'Resume', 'End', 'History'].includes(String(n.props.label)));
  assert.deepEqual(actions.map(n => n.props.label), expected);
  for (const action of actions) assert.equal(action.props.appearance, 'v2');
  if (expected.includes('End')) assert.equal(app.find('FormButton', 'End').props.variant, 'destructive');
  assert.equal(app.container.textContent.includes('All installments already have due dates. Resolve the unpaid occurrences.'), state === 'assigned');
  assert.deepEqual(snapshot(f), before); assert.equal(runtime.fixture.alerts.length, 0);
  await app.press('Series options for Reviewed series'); await app.press('Back to Commitments');
  assert.deepEqual(snapshot(f), before);
});

for (const theme of ['dark', 'light'] as const) test(`${theme}: management uses canonical neutral lifecycle text, operational heading and contained rows`, async t => {
  t.mock.method(runtime.native as { useColorScheme: () => string }, 'useColorScheme', () => theme);
  const f = await fixture(t), app = await f.open();
  const title = app.nodes().find(n => n.kind === 'ThemedText' && n.textContent === 'Manage commitments')!;
  assert.equal(flat(title.props.style).color, DesignColors[theme].textPrimary);
  assert.equal(flat(title.props.style).fontSize, 20);
  assert.equal(app.find('FormButton', 'Back to Commitments').props.appearance, 'v2');
  const status = app.nodes().find(n => n.kind === 'ThemedText' && n.textContent === 'Bill · Active')!;
  assert.equal(flat(status.props.style).color, DesignColors[theme].textSecondary);
  const body = app.find('Pressable', 'Manage Reviewed series'); assert.equal(flat(body.props.style).minHeight, 48);
  assert.equal(flat(body.parentNode!.parentNode!.props.style).backgroundColor, DesignColors[theme].group);
});

test('Pause and End keep native confirmation cancellation, correct IDs and retained unpaid history', async t => {
  const f = await fixture(t), other = f.create('Other subscription', 'subscription'), app = await f.open();
  const list = app.find('SectionList'), before = snapshot(f), unpaid = f.commitments.readHistory(f.id).outstanding;
  await menu(app, 'Series options for Reviewed series', 'Pause');
  assert.equal(runtime.fixture.alerts.at(-1)!.title, 'Pause commitment?');
  assert.ok(!app.nodes().some(n => n.kind === 'FormButton' && n.props.label === 'Pause'));
  await app.confirm('Cancel'); assert.deepEqual(snapshot(f), before);
  await menu(app, 'Series options for Reviewed series', 'Pause'); await app.confirm('Confirm');
  assert.equal(f.commitments.readHistory(f.id).commitment.status, 'paused');
  assert.deepEqual(f.commitments.readHistory(f.id).outstanding, unpaid);
  assert.equal(f.commitments.readHistory(other).commitment.status, 'active');
  const paused = snapshot(f); await menu(app, 'Series options for Reviewed series', 'End');
  assert.equal(runtime.fixture.alerts.at(-1)!.buttons.at(-1)!.style, 'destructive');
  await app.confirm('Cancel'); assert.deepEqual(snapshot(f), paused);
  await menu(app, 'Series options for Reviewed series', 'End'); await app.confirm('Confirm');
  assert.equal(f.commitments.readHistory(f.id).commitment.status, 'ended'); assert.deepEqual(f.commitments.readHistory(f.id).outstanding, unpaid);
  assert.equal(app.find('SectionList'), list);
});

test('Resume retains the proposal, cancels without mutation and creates the selected new anchor while retaining unpaid occurrences', async t => {
  const f = await fixture(t, 'bill', 'paused'), app = await f.open(), before = snapshot(f), history = f.commitments.readHistory(f.id);
  const proposal = f.commitments.resumeProposal(f.id);
  await menu(app, 'Series options for Reviewed series', 'Resume');
  assert.equal(app.find('FormField', 'Next due date *').props.value, proposal);
  assert.equal(app.nodes().filter(n => n.kind === 'Modal').length, 1);
  await app.press('Cancel'); assert.deepEqual(snapshot(f), before);
  await menu(app, 'Series options for Reviewed series', 'Resume'); await app.change('Next due date *', '2026-12-05'); await app.press('Resume');
  const after = f.commitments.readHistory(f.id); assert.equal(after.schedule.startDate, '2026-12-05'); assert.equal(after.schedule.billingDay, 5);
  assert.equal(after.versions.length, history.versions.length + 1); assert.deepEqual(after.outstanding, history.outstanding);
  assert.equal(app.nodes().filter(n => n.kind === 'Modal').length, 0); assert.ok(app.container.textContent.includes('Manage commitments'));
});

test('Edit, History and Details repeatedly select the same source and return to the retained management list', async t => {
  const f = await fixture(t); const row = f.commitments.readHistory(f.id).outstanding[0]; f.commitments.pay(row, '35', today);
  const app = await f.open(), list = app.find('SectionList'), before = snapshot(f);
  await menu(app, 'Series options for Reviewed series', 'Edit'); assert.equal(app.find('FormField', 'Title *').props.value, 'Reviewed series');
  await app.change('Title *', 'Unsaved name'); await app.press('Cancel'); assert.deepEqual(snapshot(f), before);
  await menu(app, 'Series options for Reviewed series', 'Edit'); await app.change('Title *', 'Corrected series'); await app.press('Save');
  assert.equal(f.commitments.readHistory(f.id).commitment.title, 'Corrected series');
  for (let repeat = 0; repeat < 2; repeat++) {
    await menu(app, 'Series options for Corrected series', 'History');
    assert.equal(app.nodes().filter(n => n.kind === 'Modal').length, 1);
    assert.ok(app.container.textContent.includes('Paid R$ 35,00')); assert.ok(app.container.textContent.includes(dateLabel(today)));
    await act(async () => { await app.tapSet('View commitment'); }); assert.ok(app.container.textContent.includes('Schedules')); await app.press('Back');
    await act(async () => { await app.tapSet('Manage Corrected series'); }); assert.ok(app.container.textContent.includes('Schedules')); await app.press('Back');
    assert.equal(app.find('SectionList'), list); assert.ok(app.container.textContent.includes('Manage commitments'));
  }
  assert.equal(f.finance.readLedgerPage().transactions.length, 1);
});

test('60 management series preserve source ordering, stable keys, virtualization and supplied scroll offset after refresh', async t => {
  const f = await fixture(t); for (let i = 0; i < 59; i++) f.create(`Series ${String(i).padStart(2, '0')}`);
  const app = await f.open(), list = app.find('SectionList');
  const sections = list.props.sections as { key: string; data: { key: string; item: { commitment: { id: string } } }[] }[];
  assert.equal(sections.length, 1); assert.equal(sections[0].key, 'manage'); assert.equal(sections[0].data.length, 60);
  assert.deepEqual(sections[0].data.map(r => r.key), f.commitments.read().items.map(i => i.commitment.id));
  assert.equal(list.props.initialNumToRender, 6); assert.equal(list.props.maxToRenderPerBatch, 6); assert.equal(list.props.windowSize, 5); assert.equal(list.props.removeClippedSubviews, false);
  const last = sections[0].data.at(-1)!; assert.equal((list.props.keyExtractor as (row: unknown) => string)(last), last.item.commitment.id);
  await act(async () => { (list.props.onScroll as (event: unknown) => void)({ nativeEvent: { contentOffset: { y: 640 } } }); });
  await app.resume(); assert.equal(app.find('SectionList'), list); assert.deepEqual(list.props.contentOffset, { x: 0, y: 0 });
  await app.press('Transactions'); await app.press('Commitments'); assert.deepEqual(app.find('SectionList').props.contentOffset, { x: 0, y: 640 });
});

test('local source failures and workspace refresh/retry keep management mounted and preserve all saved records', async t => {
  const f = await fixture(t), app = await f.open(), before = snapshot(f), list = app.find('SectionList');
  runtime.fixture.failures.add('commitments.readHistory'); await act(async () => { await app.tapSet('Manage Reviewed series'); });
  assert.ok(app.nodes().some(n => n.kind === 'FormError' && n.props.appearance === 'v2' && n.props.message));
  assert.equal(app.nodes().filter(n => n.kind === 'Modal').length, 0); assert.deepEqual(snapshot(f), before);
  runtime.fixture.failures.clear(); await act(async () => { await app.tapSet('Manage Reviewed series'); }); await app.press('Back');
  runtime.fixture.failures.add('commitments.read'); await app.resume();
  assert.ok(app.find('FormButton', 'Retry')); assert.equal(app.find('SectionList'), list); assert.ok(app.container.textContent.includes('Manage commitments'));
  runtime.fixture.failures.clear(); await app.press('Retry'); assert.equal(app.find('SectionList'), list); assert.deepEqual(snapshot(f), before);
});

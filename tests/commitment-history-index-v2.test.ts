/// <reference types="node" />
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import type { CommitmentDraft } from '../src/features/finance/commitments/types';
import { formatBrlAmount, formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { addMonths, dateLabel, localDateString } from '../src/utils/calendar';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const today = localDateString(new Date());
type App = Awaited<ReturnType<typeof mount>>;
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 15)); }); }
async function history(app: App) { await app.press('Commitment options'); await app.press('History'); await settle(); }
function cards(app: App) { return app.nodes().filter(n => n.props?.testID === 'commitment-history-index-card'); }
async function fixture(t: TestContext) {
  const f = await journalDatabase(); f.setTime(today); t.after(() => f.sqlite.close());
  function create(title: string, changes: Partial<CommitmentDraft> = {}) {
    return f.commitments.create({ ...commitmentDraft(null, undefined, addMonths(today, -2)), title, kind: 'bill', amount: '180,20', ...changes });
  }
  async function open() {
    const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments' }), f.db); t.after(app.unmount);
    await history(app); return app;
  }
  return { ...f, create, open };
}

test('global index preserves authoritative order, lifetime counts, actual totals and all parent lifecycles', async t => {
  const f = await fixture(t);
  const ended = f.create('Ended bill'); f.commitments.skip(f.commitments.readHistory(ended).outstanding[0]); f.commitments.end(ended);
  const paused = f.create('Paused bill'); f.commitments.skip(f.commitments.readHistory(paused).outstanding[0]); f.commitments.pause(paused);
  const completed = f.create('Completed purchase', { kind: 'installment', installmentCount: '3' });
  for (const row of f.commitments.readHistory(completed).outstanding) f.commitments.skip(row);
  const paid = f.create('Active subscription', { kind: 'subscription' }); const dues = f.commitments.readHistory(paid).outstanding;
  f.commitments.pay(dues[0], '170,15', today); f.commitments.skip(dues[1]);
  f.create('Pending only'); const removed = f.create('Soft deleted'); f.commitments.skip(f.commitments.readHistory(removed).outstanding[0]);
  f.sqlite.exec(`UPDATE finance_commitments SET deleted_at = 1 WHERE id = '${removed}'`);
  const expected = f.commitments.read().items.filter(item => item.resolvedCount > 0);
  const app = await f.open();
  assert.deepEqual(cards(app).map(n => n.props.accessibilityLabel), expected.map(item => `History for ${item.commitment.title}`));
  for (const [i, item] of expected.entries()) {
    const card = cards(app)[i]; assert.ok(card.textContent.includes(`${item.resolvedCount} paid or skipped`));
    assert.ok(card.textContent.includes(`Paid ${formatBrlAmount(item.totalPaidMinor)}`));
    assert.ok((card.props.accessibilityValue as { text: string }).text.includes('Actual paid total'));
    assert.equal(app.nodes(card).filter(n => n.props?.accessibilityRole === 'button').length, 0);
    assert.ok(app.nodes(card).some(n => n.props?.testID === `icon-${item.commitment.kind === 'bill' ? 'receipt' : item.commitment.kind === 'subscription' ? 'repeat' : 'layers'}`));
  }
  assert.ok(['Active', 'Paused', 'Ended', 'Completed'].every(state => cards(app).some(n => n.textContent.includes(state))));
  assert.ok(!app.container.textContent.includes('Pending only')); assert.ok(!app.container.textContent.includes('Soft deleted'));
  assert.ok(cards(app).find(n => n.textContent.includes('Ended bill'))!.textContent.includes('Paid R$ 0,00'));
});

test('global paid totals remain exact beyond Number safe range and independent of individual paging', async t => {
  const f = await fixture(t); const id = f.create('Long historical service', { firstDueDate: addMonths(today, -26) });
  let page = f.commitments.readHistory(id); const oldDue = page.outstanding[0];
  f.commitments.pay(oldDue, formatBrlInput(maxAmountMinor), today);
  f.commitments.pay(page.outstanding[1], formatBrlInput(maxAmountMinor), today);
  f.commitments.skip(page.outstanding[2]); page = f.commitments.readHistory(id);
  assert.equal(page.history.filter(entry => entry.occurrence.status !== 'pending').length, 0); assert.ok(page.nextBefore);
  const app = await f.open(); const card = cards(app)[0];
  assert.ok(card.textContent.includes('3 paid or skipped'));
  assert.ok(card.textContent.includes(`Paid ${formatBrlAmount(BigInt(maxAmountMinor) * 2n)}`));
  await app.tapSet('History for Long historical service');
  assert.ok(app.nodes().some(n => n.props?.testID === 'commitment-history-summary'));
  await app.press('Load earlier history'); await app.press('Load earlier history'); assert.ok(app.nodes().some(n => n.props?.testID === 'commitment-history-row'));
});

test('card opens selected Individual History, Back retains index and Undo refreshes aggregate eligibility', async t => {
  const f = await fixture(t); const id = f.create('Actual payment'); const due = f.commitments.readHistory(id).outstanding[0];
  f.commitments.pay(due, '120,25', today); const app = await f.open();
  const scrollCommands = runtime.fixture.scrollOffsets.length;
  await app.tapSet('History for Actual payment');
  assert.ok(app.nodes().some(n => n.props?.testID === 'commitment-history-summary'));
  assert.ok(!app.nodes().some(n => n.props?.testID === 'commitment-details-overview'));
  await app.press(`Undo payment for Actual payment, due ${dateLabel(due.dueDate)}`); await app.confirm('Cancel');
  assert.equal(f.finance.read().transactions.length, 1);
  await app.press(`Undo payment for Actual payment, due ${dateLabel(due.dueDate)}`); await app.confirm('Confirm');
  await app.press('Back'); assert.equal(cards(app).length, 0);
  assert.ok(app.container.textContent.includes('No paid or skipped occurrences yet.'));
  assert.equal(runtime.fixture.scrollOffsets.length, scrollCommands);
  assert.equal(f.finance.read().transactions.length, 0);
  await app.press('Back to Commitments'); assert.ok(app.container.textContent.includes('Add commitment'));
});

test('reopening skipped history removes zero-paid summary without creating money', async t => {
  const f = await fixture(t); const id = f.create('Skipped only', { kind: 'subscription' }); const due = f.commitments.readHistory(id).outstanding[0];
  f.commitments.skip(due); const app = await f.open(); assert.ok(cards(app)[0].textContent.includes('Paid R$ 0,00'));
  await app.tapSet('History for Skipped only'); await app.press(`Reopen Skipped only, due ${dateLabel(due.dueDate)}`); await app.confirm('Confirm');
  await app.press('Back'); assert.equal(cards(app).length, 0); assert.equal(f.finance.read().transactions.length, 0);
});

test('large index preserves bounded variable-height SectionList and performs no per-card history reads', async t => {
  const f = await fixture(t);
  for (let i = 0; i < 125; i++) { const id = f.create(`Bill ${String(i).padStart(3, '0')}`); f.commitments.skip(f.commitments.readHistory(id).outstanding[0]); }
  const app = await f.open(); const list = app.nodes().find(n => n.props?.testID === 'commitments-list')!;
  const props = list.props as { initialNumToRender: number; maxToRenderPerBatch: number; windowSize: number; getItemLayout?: unknown; contentInsetAdjustmentBehavior: string; sections: { data: { key: string }[] }[]; keyExtractor: (row: { key: string }) => string };
  assert.equal(list.props.initialNumToRender, 6); assert.equal(list.props.maxToRenderPerBatch, 6); assert.equal(list.props.windowSize, 5);
  assert.equal(list.props.getItemLayout, undefined); assert.equal(list.props.contentInsetAdjustmentBehavior, 'never');
  assert.equal(props.sections[0].data.length, 125);
  assert.deepEqual(props.sections[0].data.map(row => props.keyExtractor(row)), f.commitments.read().items.map(item => item.commitment.id));
  assert.equal(runtime.fixture.reads.filter(name => name === 'commitments.readHistory').length, 0);
  const saved = runtime.fixture.reads.length; await app.tapSet('History for Bill 124'); assert.ok(runtime.fixture.reads.length > saved);
});

test('empty history keeps navigation and refresh failures keep previous authoritative summaries', async t => {
  const f = await fixture(t); const app = await f.open(); assert.equal(cards(app).length, 0);
  assert.ok(app.container.textContent.includes('No paid or skipped occurrences yet.'));
  await app.press('Back to Commitments'); const id = f.create('Saved summary'); f.commitments.skip(f.commitments.readHistory(id).outstanding[0]);
  await app.resume(); await history(app); const before = cards(app)[0].textContent;
  runtime.fixture.failures.add('commitments.read'); await app.resume(); assert.equal(cards(app)[0].textContent, before);
  runtime.fixture.failures.delete('commitments.read'); await app.press('Retry'); assert.equal(cards(app)[0].textContent, before);
});

test('narrow doubled text retains complete name, amount and one accessible navigation target', async t => {
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width: 320, height: 900, scale: 1, fontScale: 2 }));
  const f = await fixture(t); const title = 'Extremelylongunbrokencommitmentname'.repeat(5); const id = f.create(title);
  f.commitments.pay(f.commitments.readHistory(id).outstanding[0], formatBrlInput(maxAmountMinor), today);
  const app = await f.open(); const card = cards(app)[0]; assert.ok(card.textContent.includes(title)); assert.ok(card.textContent.includes(formatBrlAmount(maxAmountMinor)));
  assert.ok(!app.nodes(card).some(n => n.props?.numberOfLines || n.props?.ellipsizeMode || n.props?.maxFontSizeMultiplier));
  assert.equal(card.props.accessibilityRole, 'button'); assert.ok((card.props.accessibilityValue as { text: string }).text.includes('1 paid or skipped'));
});

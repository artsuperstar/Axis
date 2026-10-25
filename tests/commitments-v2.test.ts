/// <reference types="node" />
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import type { CommitmentDraft } from '../src/features/finance/commitments/types';
import { commitmentTypeIcon } from '../src/features/finance/commitments/type-icons';
import { formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { addDays, addMonths, dateLabel, localDateString } from '../src/utils/calendar';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const today = localDateString(new Date());
type App = Awaited<ReturnType<typeof mount>>;
const flat = (style: unknown) => Object.assign({}, ...[style].flat(Infinity));
const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
async function menu(app: App, subject: string, action: string) { await app.press(subject); await app.press(action); await settle(); }
async function fixture(t: TestContext) {
  t.mock.method((runtime.native as { AccessibilityInfo: { isReduceMotionEnabled: () => Promise<boolean> } }).AccessibilityInfo, 'isReduceMotionEnabled', () => Promise.resolve(true));
  const f = await journalDatabase(); f.setTime(today); t.after(() => f.sqlite.close());
  const create = (title: string, changes: Partial<CommitmentDraft> = {}) => f.commitments.create({ ...commitmentDraft(null, undefined, addDays(today, 1)), title, amount: '150', ...changes });
  return { ...f, create };
}
const cards = (app: App) => app.nodes().filter(node => node.props?.testID === 'commitment-obligation');
const subject = (title: string, date = addDays(today, 1)) => `${title}, due ${dateLabel(date)}`;

test('main screen keeps Finance navigation, one Add/options toolbar, no redundant heading or hero, and one virtualized scroller', async t => {
  const f = await fixture(t); f.create('Internet');
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments' }), f.db); t.after(app.unmount);
  assert.equal(app.find('FormButton', 'Commitments').props.selected, true);
  assert.equal(app.nodes().filter(node => node.kind === 'FormButton' && node.props.label === 'Add commitment').length, 1);
  assert.equal(app.find('FormButton', 'Add commitment').props.appearance, 'v2'); assert.equal(app.find('FormButton', 'Add commitment').props.leadingIcon, 'plus');
  assert.ok(!app.nodes().some(node => node.props?.accessibilityRole === 'header' && node.textContent === 'Commitments'));
  assert.ok(!app.container.textContent.includes('Stay on top of your commitments'));
  const list = app.find('SectionList'); assert.equal(list.props.testID, 'commitments-list'); assert.equal(list.props.initialNumToRender, 6); assert.equal(list.props.windowSize, 5);
  assert.equal(list.props.contentInsetAdjustmentBehavior, 'never'); assert.ok(flat(list.props.contentContainerStyle).paddingBottom >= 32);
  assert.equal(app.nodes().filter(node => node.kind === 'FlatList').length, 0);
  await app.press('Add commitment'); assert.equal(app.find('SegmentedControl', 'Type *').props.appearance, 'v2'); assert.ok(app.find('FormField', 'Title *'));
  await app.press('Cancel'); await menu(app, 'Commitment options', 'Manage commitments'); assert.ok(app.find('FormButton', 'Back to Commitments'));
  await app.press('Back to Commitments'); await menu(app, 'Commitment options', 'History'); assert.ok(app.container.textContent.includes('No paid or skipped occurrences yet.'));
});

test('all merchant titles of one type share its primary icon; exact due, amount, category and installment identity remain authoritative', async t => {
  const f = await fixture(t); const category = f.finance.createCategory('Historical custom category', 'expense');
  const cases = [
    { kind: 'bill', names: ['Internet', 'ChatGPT'], icon: 'receipt' },
    { kind: 'subscription', names: ['Netflix', 'Spotify'], icon: 'repeat' },
    { kind: 'installment', names: ['Rock in Rio Ticket', 'Computer'], icon: 'layers' },
  ] as const;
  for (const { kind, names } of cases) for (const name of names) f.create(name, { kind, installmentCount: kind === 'installment' ? '10' : '', categoryId: category.id, amount: '43,50' });
  f.finance.deleteCategory(category.id);
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments' }), f.db); t.after(app.unmount);
  assert.equal(cards(app).length, 6);
  for (const { kind, names, icon } of cases) {
    assert.equal(commitmentTypeIcon(kind), icon);
    for (const name of names) {
      const row = cards(app).find(row => app.nodes(row).some(node => node.props?.testID === 'commitment-title' && node.textContent === name))!;
      assert.ok(app.nodes(row).some(node => node.props?.testID === `icon-${icon}`));
      const label = String(app.nodes(row).find(node => node.kind === 'Pressable')!.props.accessibilityLabel);
      assert.ok(label.includes(kind === 'bill' ? 'Bill' : kind === 'subscription' ? 'Subscription' : 'Installment'));
      assert.ok(label.includes('category Historical custom category'));
      assert.ok(row.textContent.includes('R$ 43,50')); assert.ok(row.textContent.includes(`Due ${dateLabel(addDays(today, 1))}`)); assert.ok(row.textContent.includes('Historical custom category'));
      assert.equal(row.textContent.includes('1 of 10'), kind === 'installment');
      assert.ok(!app.nodes(row).some(node => /icon-(ticket|home|utensils)/.test(String(node.props?.testID))));
    }
  }
  assert.equal(f.finance.read().transactions.length, 0);
});

test('details body never opens Edit or records money; explicit Pay preserves existing defaults and confirmation flow', async t => {
  const f = await fixture(t); f.create('Bill');
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments' }), f.db); t.after(app.unmount);
  const body = app.nodes(cards(app)[0]).find(node => node.kind === 'Pressable')!;
  assert.ok(String(body.props.accessibilityHint).includes('confirmation')); await app.tapSet(String(body.props.accessibilityLabel));
  assert.ok(!app.nodes().some(node => node.kind === 'FormField' && node.props.label === 'Title *')); assert.equal(f.finance.read().transactions.length, 0);
  await app.press('Back'); await app.press(`Pay ${subject('Bill')}`);
  assert.equal(app.find('FormField', 'Actual amount paid *').props.value, '150,00'); assert.equal(app.find('FormField', 'Payment date *').props.value, today);
  assert.equal(app.find('FormField', 'Actual amount paid *').props.appearance, 'v2');
  assert.equal(f.finance.read().transactions.length, 0); await app.press('Cancel'); assert.equal(f.finance.read().transactions.length, 0);
  await app.press(`Pay ${subject('Bill')}`); await app.press('Confirm'); assert.equal(f.finance.read().transactions.length, 1);
});

test('Overdue and Today remain ahead of one pending future per active parent; paused/ended obligations remain payable but not reactivated', async t => {
  const f = await fixture(t);
  const past = addDays(today, -2), paused = f.create('Paused bill', { firstDueDate: past }), ended = f.create('Ended bill', { firstDueDate: past });
  f.commitments.pause(paused); f.commitments.end(ended); f.create('Today bill', { firstDueDate: today }); f.create('Upcoming bill');
  f.create('Beyond preview', { firstDueDate: addMonths(today, 5) });
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments' }), f.db); t.after(app.unmount);
  const sections = app.find('SectionList').props.sections as { title: string; data: { item: { commitment: { id: string } } }[] }[];
  assert.deepEqual(sections.map(section => section.title), ['Overdue', 'Today', 'Upcoming']); assert.equal(sections[2].data.length, 2);
  assert.equal(new Set(sections[2].data.map(row => row.item.commitment.id)).size, 2);
  assert.ok(app.find('FormButton', `Pay ${subject('Paused bill', past)}`)); assert.ok(app.find('FormButton', `Pay ${subject('Ended bill', past)}`));
  assert.ok(app.container.textContent.includes('Commitment paused')); assert.ok(app.container.textContent.includes('Commitment ended'));
  for (const status of ['paused', 'ended']) assert.ok(cards(app).some(row => app.nodes(row).some(node => String(node.props?.accessibilityLabel).includes(`commitment ${status}`))));
  await app.press(`Pay ${subject('Paused bill', past)}`); await app.press('Confirm');
  assert.equal(f.commitments.read().items.find(item => item.commitment.id === paused)!.commitment.status, 'paused');
});

test('paid and skipped occurrences leave the main feed; completed installment remains available through management/history', async t => {
  const f = await fixture(t); const id = f.create('Final installment', { kind: 'installment', installmentCount: '1', firstDueDate: today });
  const skipped = f.create('Skipped bill', { firstDueDate: today }); f.commitments.skip(f.commitments.readHistory(skipped).outstanding[0]);
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments' }), f.db); t.after(app.unmount);
  assert.ok(!app.nodes().some(node => node.props?.accessibilityLabel === `Pay ${subject('Skipped bill', today)}`));
  await app.press(`Pay ${subject('Final installment', today)}`); await app.press('Confirm');
  assert.ok(!cards(app).some(row => row.textContent.includes('Final installment'))); assert.equal(f.commitments.read().items.find(item => item.commitment.id === id)!.commitment.status, 'completed');
  await menu(app, 'Commitment options', 'Manage commitments'); assert.ok(app.container.textContent.includes('Completed'));
  assert.ok(app.find('FormButton', 'Series options for Final installment')); await app.press('Back to Commitments');
  await menu(app, 'Commitment options', 'History'); assert.ok(app.find('Pressable', 'History for Final installment'));
});

test('transaction payment reversal refresh returns the retained occurrence to the same keyed Overdue feed', async t => {
  const f = await fixture(t); const due = addDays(today, -1), id = f.create('Reversed bill', { firstDueDate: due });
  const occurrence = f.commitments.readHistory(id).outstanding[0]; const payment = f.commitments.pay(occurrence, '150', today);
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments' }), f.db); t.after(app.unmount);
  assert.ok(!app.nodes().some(node => node.props?.accessibilityLabel === `Pay ${subject('Reversed bill', due)}`));
  f.commitments.deletePayment(payment, { commitmentId: id, dueDate: due }); await app.refocus();
  const section = (app.find('SectionList').props.sections as { title: string; data: { key: string }[] }[]).find(section => section.title === 'Overdue')!;
  assert.ok(section.data.some(row => row.key === `${id}:${due}`)); assert.ok(app.find('FormButton', `Pay ${subject('Reversed bill', due)}`));
  assert.equal(f.finance.read().transactions.length, 0);
});

test('long collection uses bounded SectionList batches and retains complete maximum amounts and long text', async t => {
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width: 320, height: 800, fontScale: 2, scale: 1 }));
  const f = await fixture(t); const title = 'VeryLongUnbrokenCommitmentTitle'.repeat(3);
  f.create(title, { amount: formatBrlInput(maxAmountMinor), kind: 'installment', installmentCount: '1200' });
  for (let i = 0; i < 150; i++) f.create(`Bill ${i}`);
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments' }), f.db); t.after(app.unmount);
  const list = app.find('SectionList'); assert.equal(list.props.maxToRenderPerBatch, 6); assert.equal(list.props.windowSize, 5);
  assert.equal(flat(app.find('FormButton', 'Add commitment').parentNode!.props.style).width, '100%');
  assert.equal(flat(app.find('FormButton', 'Add commitment').parentNode!.props.style).flexBasis, 'auto');
  const row = cards(app).find(row => row.textContent.includes(title))!; const amount = app.nodes(row).find(node => node.props?.testID === 'commitment-amount')!;
  assert.equal(amount.textContent, 'R$ 90.071.992.547.409,91'); assert.equal(amount.props.numberOfLines, undefined);
  assert.ok(row.textContent.includes('1 of 1200')); assert.ok(app.find('FormButton', `Actions for ${subject(title)}`));
});

test('no obligations preserves real empty state and global management access without fabricated sections', async t => {
  const f = await fixture(t); const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments' }), f.db); t.after(app.unmount);
  assert.ok(app.container.textContent.includes('No commitments yet')); assert.deepEqual(app.find('SectionList').props.sections, []);
  const id = f.create('Paused future'); f.commitments.pause(id); await app.resume();
  assert.ok(app.container.textContent.includes('No obligations to resolve in this preview')); assert.ok(app.find('FormButton', 'Commitment options'));
});

test('compact cards keep identity and trailing amount/actions as separate sibling regions for every kind', async t => {
  const f = await fixture(t);
  for (const kind of ['bill', 'subscription', 'installment'] as const) f.create(`Compact ${kind}`, { kind, installmentCount: kind === 'installment' ? '10' : '' });
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments' }), f.db); t.after(app.unmount);
  for (const card of cards(app)) {
    const content = app.nodes(card).find(n => n.props?.testID === 'commitment-content')!;
    const info = app.nodes(card).find(n => n.props?.testID === 'commitment-info')!;
    const trailing = app.nodes(card).find(n => n.props?.testID === 'commitment-trailing')!;
    const actions = app.nodes(card).find(n => n.props?.testID === 'commitment-actions')!;
    assert.equal(info.parentNode, content); assert.equal(trailing.parentNode, content);
    assert.equal(flat(content.props.style).flexDirection, 'row'); assert.equal(flat(content.props.style).flexWrap, 'wrap');
    assert.ok(app.nodes(trailing).some(n => n.props?.testID === 'commitment-amount'));
    assert.ok(!app.nodes(info).some(n => n.props?.testID === 'commitment-amount'));
    const body = app.nodes(info).find(n => n.kind === 'Pressable')!;
    assert.ok(String(body.props.accessibilityLabel).includes('expected R$ 150,00'));
    assert.ok(!app.nodes(body).some(n => n.kind === 'FormButton'));
    assert.equal(flat(actions.props.style).flexDirection, 'row'); assert.equal(flat(actions.props.style).gap, 8);
    const pay = app.nodes(actions).find(n => n.props?.label === 'Pay')!;
    assert.ok(pay.props.compact); assert.ok(app.nodes(actions).some(n => String(n.props?.accessibilityLabel).startsWith('Actions for ')));
    assert.equal(flat(card.props.style).height, undefined); assert.equal(flat(card.props.style).minHeight, undefined);
  }
});

test('enlarged text stacks naturally sized information and trailing controls without truncating money', async t => {
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width: 320, height: 800, fontScale: 2, scale: 1 }));
  const f = await fixture(t); f.create('Enlarged long commitment title', { amount: formatBrlInput(maxAmountMinor) });
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments' }), f.db); t.after(app.unmount);
  const card = cards(app)[0];
  const content = app.nodes(card).find(n => n.props?.testID === 'commitment-content')!;
  const trailing = app.nodes(card).find(n => n.props?.testID === 'commitment-trailing')!;
  const amount = app.nodes(trailing).find(n => n.props?.testID === 'commitment-amount')!;
  assert.equal(flat(content.props.style).flexDirection, 'column'); assert.equal(flat(trailing.props.style).width, '100%');
  assert.equal(flat(trailing.props.style).flexBasis, 'auto'); assert.equal(amount.props.numberOfLines, undefined);
  assert.equal(amount.textContent, 'R$ 90.071.992.547.409,91'); assert.equal(amount.props.accessible, false);
  const body = app.nodes(card).find(n => n.kind === 'Pressable')!;
  assert.ok(String(body.props.accessibilityLabel).includes(amount.textContent));
});

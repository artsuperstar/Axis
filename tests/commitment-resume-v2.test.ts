/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { createCalendarDataAccess } from '../src/features/calendar/data';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import type { CommitmentDraft } from '../src/features/finance/commitments/types';
import { formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { addDays, addMonths, dateLabel, localDateString } from '../src/utils/calendar';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const require = createRequire(import.meta.url);
const { CommitmentModal, CommitmentResume } = require('../src/features/finance/commitments/components/commitment-forms') as typeof import('../src/features/finance/commitments/components/commitment-forms');
const today = localDateString(new Date());
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); }); }
async function setup(t: TestContext, changes: Partial<CommitmentDraft> = {}, web = true) {
  const native = runtime.native as { Platform: { OS: string } }; const previous = native.Platform.OS; native.Platform.OS = web ? 'web' : 'android'; t.after(() => { native.Platform.OS = previous; });
  t.mock.method((runtime.native as { AccessibilityInfo: { isReduceMotionEnabled: () => Promise<boolean> } }).AccessibilityInfo, 'isReduceMotionEnabled', () => Promise.resolve(true));
  const f = await journalDatabase(); f.setTime(today); t.after(() => f.sqlite.close());
  const id = f.commitments.create({ ...commitmentDraft(null, undefined, today), title: 'Internet', amount: '150', ...changes });
  f.commitments.pause(id);
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments' }), f.db); t.after(app.unmount);
  await app.press('Commitment options'); await app.press('Manage commitments'); await settle();
  async function open() { await app.press('Series options for Internet'); await app.press('Resume'); await settle(); }
  return { ...f, id, app, open };
}

for (const [kind, icon] of [['bill', 'receipt'], ['subscription', 'repeat'], ['installment', 'layers']] as const) test(`${kind} Resume shows saved read-only context, type-only icon and authoritative suggestion`, async t => {
  const f = await setup(t, { kind, installmentCount: kind === 'installment' ? '10' : '' });
  const proposal = f.commitments.resumeProposal(f.id); await f.open();
  const summary = f.app.nodes().find(n => n.props?.testID === 'commitment-resume-summary')!;
  assert.ok(summary.textContent.includes('Internet')); assert.ok(summary.textContent.includes('Paused'));
  assert.ok(summary.textContent.includes('Expected amount · R$ 150,00')); assert.ok(summary.textContent.includes('Category · No category'));
  assert.ok(f.app.nodes(summary).some(n => n.props?.testID === `icon-${icon}`));
  assert.ok(!f.app.nodes(summary).some(n => ['FormField', 'FormSelect', 'FormButton', 'Pressable'].includes(n.kind ?? '')));
  assert.ok(summary.props.accessible); assert.ok(String(summary.props.accessibilityLabel).includes('Paused'));
  assert.ok(!summary.textContent.includes('Last due date'));
  assert.equal(f.app.find('FormField', 'Next due date *').props.value, proposal);
  assert.equal(f.app.find('FormField', 'Next due date *').props.appearance, 'v2');
  assert.equal(f.commitments.read().items[0].commitment.status, 'paused'); assert.equal(f.finance.read().transactions.length, 0);
});

test('Resume retains archived category names and Cancel leaves the paused schedule untouched', async t => {
  const f = await setup(t); const category = f.finance.createCategory('Historical household utilities', 'expense');
  const item = f.commitments.read().items[0]; f.commitments.edit(f.id, { ...commitmentDraft(item.commitment, item.schedule), categoryId: category.id }); f.finance.deleteCategory(category.id);
  await f.app.resume(); await f.open(); assert.ok(f.app.container.textContent.includes('Category · Historical household utilities'));
  const before = f.commitments.readHistory(f.id); await f.app.change('Next due date *', addDays(today, 10)); await f.app.press('Cancel');
  assert.deepEqual(f.commitments.readHistory(f.id).versions, before.versions); assert.equal(f.commitments.read().items[0].commitment.status, 'paused');
  assert.equal(f.finance.read().transactions.length, 0);
});

test('alternative due date requires explicit Resume, refreshes Calendar and cannot submit twice', async t => {
  const f = await setup(t); await f.open(); const next = addDays(today, 5);
  const calendar = createCalendarDataAccess(f.db, randomUUID, f.now);
  await f.app.change('Next due date *', next); assert.equal(f.commitments.read().items[0].commitment.status, 'paused');
  assert.equal(calendar.readRange({ from: next, to: next }).filter(r => r.recordId === f.id).length, 0);
  const submit = f.app.find('FormButton', 'Resume').props.onPress as () => Promise<void>;
  await act(async () => { await submit(); await submit(); });
  const data = f.commitments.readHistory(f.id); assert.equal(data.commitment.status, 'active'); assert.equal(data.schedule.startDate, next); assert.equal(data.schedule.billingDay, Number(next.slice(-2)));
  assert.equal(data.versions.length, 2); assert.equal(calendar.readRange({ from: next, to: next }).filter(r => r.recordId === f.id).length, 1);
  assert.equal(f.finance.read().transactions.length, 0); assert.ok(!f.app.nodes().some(n => n.props?.testID === 'commitment-resume-summary'));
});

test('invalid and retained-date collisions are adjacent to the date and retain the working selection', async t => {
  const f = await setup(t); await f.open();
  for (const date of ['2026-02-30', addDays(today, -1), today]) {
    await f.app.change('Next due date *', date); await f.app.press('Resume');
    const field = f.app.find('FormField', 'Next due date *'); assert.ok(field.props.error); assert.equal(field.props.value, date);
    assert.equal(f.commitments.read().items[0].commitment.status, 'paused'); assert.equal(f.app.find('FormButton', 'Resume').props.busy, false);
  }
  await f.app.change('Next due date *', addDays(today, 2)); await f.app.press('Resume'); assert.equal(f.commitments.read().items[0].commitment.status, 'active');
});

test('stale Resume cannot reactivate an ended commitment or create a schedule', async t => {
  const f = await setup(t); await f.open(); const before = f.commitments.readHistory(f.id).versions;
  f.commitments.end(f.id); await f.app.press('Resume'); assert.ok(f.app.container.textContent.includes('Only paused commitments'));
  assert.equal(f.commitments.read().items[0].commitment.status, 'ended'); assert.deepEqual(f.commitments.readHistory(f.id).versions, before);
  assert.equal(f.finance.read().transactions.length, 0);
});

test('failed parent transition rolls back the new schedule and permits a retained-date retry', async t => {
  const f = await setup(t); await f.open(); const next = addDays(today, 4); await f.app.change('Next due date *', next);
  const before = f.commitments.readHistory(f.id).versions;
  f.sqlite.exec("CREATE TRIGGER resume_failure BEFORE UPDATE ON finance_commitments WHEN NEW.status = 'active' BEGIN SELECT RAISE(ABORT, 'Injected resume failure'); END");
  await f.app.press('Resume'); assert.equal(f.commitments.read().items[0].commitment.status, 'paused'); assert.deepEqual(f.commitments.readHistory(f.id).versions, before);
  assert.equal(f.app.find('FormField', 'Next due date *').props.value, next); assert.equal(f.app.find('FormButton', 'Resume').props.busy, false);
  f.sqlite.exec('DROP TRIGGER resume_failure'); await f.app.press('Resume'); assert.equal(f.commitments.readHistory(f.id).schedule.startDate, next);
  assert.equal(f.finance.read().transactions.length, 0);
});

test('resuming an installment retains paid/skipped/unpaid history and never fills paused months', async t => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const start = addMonths(today, -4); f.setTime(start);
  const id = f.commitments.create({ ...commitmentDraft(null, undefined, start), title: 'Retained installments', kind: 'installment', installmentCount: '12', amount: '100' });
  f.commitments.pay(f.commitments.read().items[0].outstanding[0], '90', start);
  f.setTime(addMonths(start, 1)); f.commitments.skip(f.commitments.read().items[0].outstanding[0]);
  f.setTime(addMonths(start, 2)); f.commitments.pause(id); const before = f.commitments.readHistory(id);
  f.setTime(today); const item = f.commitments.read().items[0], proposal = f.commitments.resumeProposal(id);
  const native = runtime.native as { Platform: { OS: string } }; const previous = native.Platform.OS; native.Platform.OS = 'web'; t.after(() => { native.Platform.OS = previous; });
  const modalProps = { onDismiss() {}, children: createElement(CommitmentResume, { item, proposedDate: proposal, onDismiss() {}, onResume: date => f.commitments.resume(id, date) }) };
  const app = await mount(createElement(CommitmentModal, modalProps), f.db); t.after(app.unmount); await app.press('Resume');
  const after = f.commitments.readHistory(id); for (const row of before.history) assert.deepEqual(after.history.find(r => r.occurrence.id === row.occurrence.id), row);
  assert.ok(!after.history.some(r => r.occurrence.dueDate === addMonths(start, 3))); assert.equal(after.schedule.firstInstallmentIndex, 4);
  assert.equal(f.finance.read().transactions.length, 1); assert.equal(f.finance.read().transactions[0].amountMinor, 9000);
});

test('native picker has today minimum, no future maximum, and cancellation preserves the proposal at doubled text', async t => {
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width: 320, height: 700, fontScale: 2, scale: 1 }));
  const f = await setup(t, { amount: formatBrlInput(maxAmountMinor) }, false); const proposal = f.commitments.resumeProposal(f.id); await f.open();
  assert.ok(f.app.container.textContent.includes('90.071.992.547.409,91'));
  await act(() => (f.app.find('FormSelect', 'Next due date *').props.onPress as () => void)()); const picker = runtime.fixture.pickers.at(-1)!;
  assert.equal(localDateString(picker.minimumDate as Date), today); assert.equal(picker.maximumDate, undefined);
  // Native cancellation leaves the field untouched because no onValueChange is sent.
  assert.equal(f.app.find('FormSelect', 'Next due date *').props.value, dateLabel(proposal)); await f.app.press('Cancel');
  assert.equal(f.commitments.read().items[0].commitment.status, 'paused');
});

test('pending Resume announces busy/disabled, guards repeated taps and retains the date after rejection', async t => {
  const f = await journalDatabase(); f.setTime(today); t.after(() => f.sqlite.close());
  const id = f.commitments.create({ ...commitmentDraft(null, undefined, today), title: 'Pending resume', amount: '150' }); f.commitments.pause(id);
  const item = f.commitments.read().items[0], proposal = f.commitments.resumeProposal(id); let calls = 0, reject!: (error: Error) => void, dismissed = false;
  const pending = new Promise<void>((_resolve, fail) => { reject = fail; });
  const modalProps = { onDismiss() {}, children: createElement(CommitmentResume, { item, proposedDate: proposal, onDismiss() { dismissed = true; }, onResume() { calls++; return calls === 1 ? pending : undefined; } }) };
  const app = await mount(createElement(CommitmentModal, modalProps), f.db); t.after(app.unmount);
  const submit = app.find('FormButton', 'Resume').props.onPress as () => Promise<void>;
  await act(async () => { void submit(); }); assert.equal(app.find('FormButton', 'Resume').props.busy, true); assert.equal(app.find('FormButton', 'Resume').props.disabled, true);
  await act(async () => { void submit(); }); assert.equal(calls, 1); assert.equal(dismissed, false);
  await act(async () => { reject(new Error('Storage unavailable')); await Promise.resolve(); }); assert.equal(app.find('FormButton', 'Resume').props.busy, false);
  await app.press('Resume'); assert.equal(calls, 2); assert.ok(dismissed);
});

test('iOS picker Back restores the same date decision without resuming the commitment', async t => {
  const f = await setup(t, {}, false); (runtime.native as { Platform: { OS: string } }).Platform.OS = 'ios'; await f.open();
  const proposal = f.commitments.resumeProposal(f.id);
  await act(() => (f.app.find('FormSelect', 'Next due date *').props.onPress as () => void)());
  const picker = f.app.find('DateTimePicker'); assert.equal(localDateString(picker.props.minimumDate as Date), today); assert.equal(picker.props.maximumDate, undefined);
  await f.app.press('Back from next due date picker');
  assert.ok(!f.app.nodes().some(n => n.kind === 'DateTimePicker')); assert.equal(f.app.find('FormSelect', 'Next due date *').props.value, dateLabel(proposal));
  assert.equal(f.commitments.read().items[0].commitment.status, 'paused'); assert.equal(f.finance.read().transactions.length, 0);
});

/// <reference types="node" />
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { workDraft } from '../src/features/finance/work/form';
import { formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { addDays, localDateString } from '../src/utils/calendar';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const today = localDateString(new Date());
type App = Awaited<ReturnType<typeof mount>>;
const flat = (style: unknown) => Object.assign({}, ...[style].flat(Infinity));
async function setup(t: TestContext) {
  t.mock.method((runtime.native as { AccessibilityInfo: { isReduceMotionEnabled: () => Promise<boolean> } }).AccessibilityInfo, 'isReduceMotionEnabled', () => Promise.resolve(true));
  const f = await journalDatabase(); f.setTime(today); t.after(() => f.sqlite.close());
  const client = f.work.createCounterparty('Independent studio');
  async function open(id?: string) {
    const app = await mount(createElement(screens.FinanceScreen, { initialView: 'work', initialRecordId: id }), f.db); t.after(app.unmount);
    if (id) {
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
      const title = f.work.readDetail(id).items[0].entry.title;
      await app.press(`Edit ${title}`);
    }
    else await app.press('Add work');
    return app;
  }
  return { ...f, client, open };
}
async function select(app: App, id: string) { await act(() => (app.find('AutocompleteField', 'Client *').props.onSelect as (id: string) => void)(id)); }
async function mode(app: App, type: string) { await act(() => (app.find('SegmentedControl', 'Compensation type *').props.onChange as (type: string) => void)(type)); }
function earned(app: App) { return app.nodes().find(n => n.props?.testID === 'work-editor-earned')!.textContent; }

test('New Work has four v2 owned sections, one existing modal and explicit nonduplicated header actions', async t => {
  const f = await setup(t), app = await f.open();
  for (const title of ['job', 'work details', 'compensation', 'payment expectation']) assert.equal(app.nodes().filter(n => n.props?.testID === `editor-section-${title}`).length, 1);
  assert.equal(app.nodes().filter(n => n.kind === 'Modal').length, 1);
  for (const label of ['Cancel', 'Save']) assert.equal(app.nodes().filter(n => n.kind === 'FormButton' && n.props.label === label).length, 1);
  assert.equal(app.find('FormField', 'Job title *').props.appearance, 'v2');
  assert.equal(app.find('FormField', 'Job title *').props.multiline, false);
  const description = app.find('FormField', 'Description');
  assert.equal(description.props.multiline, true); assert.equal(description.props.scrollEnabled, false); assert.equal(description.props.maxLength, undefined);
  assert.equal(app.find('AutocompleteField', 'Client *').props.appearance, 'v2');
  assert.equal(app.find('SegmentedControl', 'Compensation type *').props.value, 'hourly');
  assert.equal(earned(app), 'Earned: Enter compensation terms');
  await app.change('Job title *', 'Unsaved work'); await app.press('Cancel');
  assert.equal(f.work.readOverview().items.length, 0); assert.equal(f.finance.read().transactions.length, 0);
});

test('Hourly Save keeps exact rounding, unrestricted multiline description and no receipt Income', async t => {
  const f = await setup(t), app = await f.open(); await select(app, f.client.id);
  await app.change('Job title *', '  Review\nassignment  ');
  const description = `  ${'Detailed work context\n'.repeat(40)}  `; await app.change('Description', description);
  await app.change('Hours', '2'); await app.change('Minutes', '30'); await app.change('Hourly rate *', 'R$ 50,00');
  assert.equal(earned(app), 'Earned: R$ 125,00'); assert.equal(f.finance.read().transactions.length, 0);
  const save = app.find('FormButton', 'Save').props.onPress as () => void; await act(() => { save(); save(); });
  const source = f.work.readOverview(); assert.equal(source.items.length, 1);
  const entry = source.items[0].entry; assert.equal(entry.title, 'Review assignment'); assert.equal(entry.description, description.trim());
  assert.equal(entry.durationMinutes, 150); assert.equal(entry.hourlyRateMinor, 5000); assert.equal(entry.fixedAmountMinor, null);
  assert.equal(entry.workDate, today); assert.equal(entry.expectedPaymentDate, null); assert.equal(source.totals.outstandingMinor, 12500n);
  assert.equal(f.finance.read().transactions.length, 0);
});

test('Hourly/Fixed switching retains unrelated and hidden drafts, then persists only the selected compensation', async t => {
  const native = runtime.native as { Platform: { OS: string } }; t.mock.property(native.Platform, 'OS', 'web');
  const f = await setup(t), app = await f.open(); await select(app, f.client.id);
  await app.change('Job title *', 'Draft identity'); await app.change('Description', 'Separate description');
  await app.change('Work date *', addDays(today, -2)); await app.change('Expected payment date', addDays(today, 4));
  await app.change('Hours', '1'); await app.change('Minutes', '15'); await app.change('Hourly rate *', '80');
  await mode(app, 'fixed'); await app.change('Fixed amount *', '900,25'); assert.equal(earned(app), 'Earned: R$ 900,25');
  assert.ok(!app.nodes().some(n => n.kind === 'FormField' && n.props.label === 'Hours'));
  await mode(app, 'hourly'); assert.equal(app.find('FormField', 'Hours').props.value, '1'); assert.equal(earned(app), 'Earned: R$ 100,00');
  await mode(app, 'fixed'); assert.equal(app.find('FormField', 'Fixed amount *').props.value, '900,25');
  await app.press('Save'); const entry = f.work.readOverview().items[0].entry;
  assert.equal(entry.title, 'Draft identity'); assert.equal(entry.description, 'Separate description');
  assert.equal(entry.workDate, addDays(today, -2)); assert.equal(entry.expectedPaymentDate, addDays(today, 4));
  assert.equal(entry.durationMinutes, null); assert.equal(entry.hourlyRateMinor, null); assert.equal(entry.fixedAmountMinor, 90025);
});

test('source validation retains missing identity/client and malformed duration/rate drafts for correction', async t => {
  const f = await setup(t), app = await f.open(); await app.press('Save'); assert.match(app.find('FormError').textContent, /job title/i);
  await app.change('Job title *', 'Valid identity'); await app.press('Save'); assert.match(app.find('FormError').textContent, /who this work is for/i);
  await select(app, f.client.id); await app.change('Hours', '0'); await app.change('Minutes', '60'); await app.change('Hourly rate *', '50');
  await app.press('Save'); assert.match(app.find('FormError').textContent, /0 and 59/i); assert.equal(app.find('FormField', 'Minutes').props.value, '60');
  await app.change('Minutes', '30'); await app.change('Hourly rate *', '-1'); await app.press('Save'); assert.ok(app.find('FormError').textContent);
  assert.equal(earned(app), 'Earned: Enter compensation terms'); assert.equal(app.find('FormField', 'Hourly rate *').props.value, '-1');
  await app.change('Hourly rate *', '0,01'); assert.equal(earned(app), 'Earned: R$ 0,01');
  assert.equal(f.work.readOverview().items.length, 0); assert.equal(f.finance.read().transactions.length, 0);
});

test('failed persistence retains all fields and retry writes once without Income', async t => {
  t.mock.method(console, 'error', () => {});
  const f = await setup(t), app = await f.open(); await select(app, f.client.id); await mode(app, 'fixed');
  await app.change('Job title *', 'Retry work'); await app.change('Fixed amount *', '123,45'); await app.change('Description', 'Retained draft');
  f.sqlite.exec("CREATE TRIGGER work_editor_write_failure BEFORE INSERT ON work_entries BEGIN SELECT RAISE(ABORT, 'Injected write failure'); END");
  await app.press('Save'); assert.ok(app.find('FormError').textContent); assert.equal(app.find('FormField', 'Description').props.value, 'Retained draft');
  assert.equal(f.work.readOverview().items.length, 0); f.sqlite.exec('DROP TRIGGER work_editor_write_failure');
  await app.press('Save'); assert.equal(f.work.readOverview().totals.earnedMinor, 12345n); assert.equal(f.finance.read().transactions.length, 0);
});

test('inline client creation returns to the mounted Work draft with its source ID and no duplicate identity', async t => {
  const f = await setup(t), app = await f.open(); await app.change('Job title *', 'Client creation draft'); await app.change('Hours', '3');
  const field = app.find('AutocompleteField', 'Client *'); let id = '';
  await act(() => { id = (field.props.onCreate as (name: string) => string)('New studio'); (field.props.onSelect as (id: string) => void)(id); });
  assert.equal(app.find('AutocompleteField', 'Client *').props.value, id);
  assert.equal(app.find('FormField', 'Job title *').props.value, 'Client creation draft'); assert.equal(app.find('FormField', 'Hours').props.value, '3');
  assert.equal(f.work.readOverview().items.length, 0); assert.equal(f.work.read().counterparties.filter(p => p.name === 'New studio').length, 1);
  await act(() => { assert.throws(() => (app.find('AutocompleteField', 'Client *').props.onCreate as (name: string) => string)('  New studio  '), /exists/i); });
});

test('Edit retains archived paid ownership and rejects compensation below received while preserving real receipt links', async t => {
  const f = await setup(t); const id = f.work.create({ ...workDraft(null, today), title: 'Historical job', counterpartyId: f.client.id, compensationType: 'fixed', fixedAmount: '1000' });
  f.work.recordPayment({ counterpartyId: f.client.id, paymentDate: today, categoryId: null, allocations: [{ workEntryId: id, amount: '350' }] }); f.work.archiveCounterparty(f.client.id);
  const app = await f.open(id); assert.equal(app.find('FormField', 'Client *').props.editable, false);
  assert.match(String(app.find('FormField', 'Client *').props.value), /archived/); assert.equal(app.find('FormField', 'Fixed amount *').props.value, '1.000,00');
  const receipts = f.finance.read().transactions; await app.change('Fixed amount *', '300'); await app.press('Save');
  assert.match(app.find('FormError').textContent, /less than.*received/i); assert.equal(app.find('FormField', 'Fixed amount *').props.value, '300');
  await app.change('Fixed amount *', '1200'); await app.change('Job title *', 'Historical job corrected'); await app.press('Save');
  assert.deepEqual(f.finance.read().transactions, receipts); assert.equal(f.work.readDetail(id).items[0].entry.id, id);
  assert.equal(f.work.readOverview().totals.outstandingMinor, 85000n);
});

test('native date selection remains local, optional expected date clears, and Cancel creates no financial write', async t => {
  const native = runtime.native as { Platform: { OS: string } }; t.mock.property(native.Platform, 'OS', 'android');
  const f = await setup(t), app = await f.open(); await app.change('Job title *', 'Date draft');
  await act(() => (app.find('FormSelect', 'Work date *').props.onPress as () => void)());
  const workPicker = runtime.fixture.pickers.at(-1)!; assert.ok(workPicker.maximumDate);
  await act(() => (workPicker.onValueChange as (event: unknown, date: Date) => void)({}, new Date(`${addDays(today, -3)}T12:00:00`)));
  await act(() => (app.find('FormSelect', 'Expected payment date').props.onPress as () => void)());
  const expectedPicker = runtime.fixture.pickers.at(-1)!; assert.equal(expectedPicker.maximumDate, undefined);
  await act(() => (expectedPicker.onValueChange as (event: unknown, date: Date) => void)({}, new Date(`${addDays(today, 7)}T12:00:00`)));
  await app.press('Clear expected date'); assert.equal(app.find('FormSelect', 'Expected payment date').props.value, 'Add date');
  assert.equal(app.find('FormField', 'Job title *').props.value, 'Date draft'); await app.press('Cancel'); assert.equal(f.work.readOverview().items.length, 0);
});

test('narrow doubled-text edit retains full values, adaptive duration and calculated maximum Earned', async t => {
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width: 320, height: 900, scale: 1, fontScale: 2 }));
  const f = await setup(t), app = await f.open(); await select(app, f.client.id); await mode(app, 'fixed');
  await app.change('Job title *', 'Complete unbroken work identity '.repeat(5)); await app.change('Fixed amount *', formatBrlInput(maxAmountMinor));
  assert.ok(app.nodes().some(n => n.props?.testID === 'work-editor-full-value' && n.textContent === formatBrlInput(maxAmountMinor)));
  assert.ok(earned(app).includes('90.071.992.547.409,91'));
  assert.ok(app.nodes().filter(n => n.props?.testID === 'work-editor-earned').every(n => !n.props.numberOfLines && !n.props.maxFontSizeMultiplier));
  await mode(app, 'hourly'); const hours = app.find('FormField', 'Hours'); assert.equal(hours.props.accessibilityLabel, 'Duration, whole hours');
  const section = app.nodes().find(n => n.props?.testID === 'editor-section-compensation')!;
  assert.ok(app.nodes(section).some(n => n.kind === 'View' && flat(n.props.style).flexDirection === 'column'));
});

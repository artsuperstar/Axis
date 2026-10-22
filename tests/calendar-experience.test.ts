/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { test, type TestContext } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { act, createElement } from 'react';

import { createCalendarDataAccess } from '../src/features/calendar/data';
import { calendarDateLabel } from '../src/features/calendar/presentation';
import { createTaskDataAccess } from '../src/features/tasks/data';
import { taskDraft } from '../src/features/tasks/form';
import { createCommitmentDataAccess } from '../src/features/finance/commitments/data';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import { createWorkDataAccess } from '../src/features/finance/work/data';
import { workDraft } from '../src/features/finance/work/form';
import { pickerValue, monthGridRange, addDays } from '../src/utils/calendar';
import { bundledMigrations, database } from './helpers/database';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const today = '2026-10-13';
type App = Awaited<ReturnType<typeof mount>>;
function flatten(style: unknown): Record<string, unknown> { return Object.assign({}, ...(Array.isArray(style) ? style.map(flatten) : [style ?? {}])); }
async function initialized(t: TestContext, date = today) {
  const instant = pickerValue(date, '12:00').getTime(); t.mock.timers.enable({ apis: ['Date'], now: instant });
  t.mock.method(console, 'error', () => {});
  const f = database(); await migrate(f.db, bundledMigrations); t.after(() => f.sqlite.close());
  return { ...f, tasks: createTaskDataAccess(f.db, randomUUID), commitments: createCommitmentDataAccess(f.db, randomUUID),
    work: createWorkDataAccess(f.db, randomUUID), calendar: createCalendarDataAccess(f.db, randomUUID) };
}
function selected(app: App) { return app.nodes().find((node) => node.props?.testID?.toString().startsWith('calendar-date-') && (node.props.accessibilityState as { selected: boolean }).selected)!; }
function rows(app: App) { return app.nodes().filter((node) => String(node.props?.testID ?? '').startsWith('calendar-agenda-')); }
function opener(app: App, title: string) { return app.nodes().find((node) => node.kind === 'Pressable' && String(node.props.accessibilityLabel ?? '').startsWith('Open ' + title + ','))!; }
function monthTrigger(app: App) { return app.nodes().find((node) => node.props?.testID === 'calendar-month-trigger')!; }
function monthButton(app: App, year: number, month: number) {
  const name = pickerValue(`${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  return app.nodes().find((node) => node.kind === 'FormButton' && String(node.props.accessibilityLabel ?? '').startsWith(name))!;
}
async function openMonthChooser(app: App) { await app.tapSet(monthTrigger(app).props.accessibilityLabel as string); }
async function chooseMonth(app: App, year: number, month: number) { await app.press(monthButton(app, year, month).props.accessibilityLabel as string); }
async function choose(app: App, date: string) { const node = app.nodes().find((node) => node.props?.testID === `calendar-date-${date}`)!; assert.ok(node); await app.tapSet(node.props.accessibilityLabel as string); }

for (const [date, direction, target] of [
  ['2026-01-31', 'Next month', '2026-02-28'], ['2028-01-31', 'Next month', '2028-02-29'],
  ['2026-12-31', 'Next month', '2027-01-31'], ['2027-01-31', 'Previous month', '2026-12-31'],
] as const) test(`mounted navigation ${date} → ${target} clamps locally and Today recovers both month and date`, async (t) => {
  const f = await initialized(t, date); const app = await mount(createElement(screens.CalendarScreen), f.db); t.after(app.unmount);
  await app.press(direction); assert.equal(selected(app).props.testID, `calendar-date-${target}`);
  assert.ok(app.container.textContent.includes(calendarDateLabel(target)));
  const reads = runtime.fixture.reads.length; await app.press('Today');
  assert.equal(selected(app).props.testID, `calendar-date-${date}`); assert.ok(app.container.textContent.includes(calendarDateLabel(date)));
  assert.equal(runtime.fixture.reads.length, reads + 1, 'Today reads the destination month once, without a stale old-month read');
});

test('Calendar has one normal title, full selected-day heading, Monday-first grid and concise empty agenda', async (t) => {
  const f = await initialized(t); const app = await mount(createElement(screens.CalendarScreen), f.db); t.after(app.unmount);
  const titles = app.nodes().filter((node) => node.kind === 'ThemedText' && node.textContent === 'Calendar');
  assert.equal(titles.length, 1); assert.equal(titles[0].props.type, 'screenTitle'); assert.equal(titles[0].props.accessibilityRole, 'header');
  assert.ok(app.container.textContent.includes(calendarDateLabel(today))); assert.ok(app.container.textContent.includes('Nothing scheduled'));
  assert.ok(app.nodes().some((node) => node.props?.testID === 'calendar-legend')); assert.equal(rows(app).length, 0);
  const first = app.nodes().find((node) => String(node.props?.testID ?? '').startsWith('calendar-date-'))!;
  assert.equal(first.props.testID, 'calendar-date-2026-09-28'); await choose(app, '2026-09-28');
  assert.equal(selected(app).props.testID, 'calendar-date-2026-09-28'); assert.ok(app.container.textContent.includes(calendarDateLabel('2026-09-28')));
  await app.press('Today'); assert.equal(selected(app).props.testID, `calendar-date-${today}`);
});

test('real mixed agenda keeps timed → date-only Tasks → Commitments → Work and exact owning-source navigation', async (t) => {
  const f = await initialized(t);
  for (const [title, time] of [['Later Task', '18:00'], ['Early Task', '09:00'], ['Date only', '']]) f.tasks.createTask({ ...taskDraft(), title, date: today, time });
  f.commitments.create({ ...commitmentDraft(null, undefined, today), title: 'Internet', amount: '99,90', firstDueDate: today });
  const client = f.work.createCounterparty('João Inglês');
  f.work.create({ ...workDraft(null, today), title: 'Inventory Software', description: '', counterpartyId: client.id, compensationType: 'fixed', fixedAmount: '600', expectedPaymentDate: today });
  const app = await mount(createElement(screens.CalendarScreen), f.db); t.after(app.unmount);
  assert.deepEqual(rows(app).map((row) => app.nodes(row).find((node) => node.kind === 'ThemedText' && node.props.type === 'cardTitle' && !/^\d{2}:/.test(node.textContent))!.textContent),
    ['Early Task', 'Later Task', 'Date only', 'Internet', 'Inventory Software']);
  const projected = f.calendar.readRange({ from: today, to: today });
  for (const item of projected) {
    await app.tapSet(opener(app, item.title).props.accessibilityLabel as string);
    assert.deepEqual(runtime.fixture.navigation.at(-1), { method: 'push', target: { pathname: '/calendar-source', params: { source: item.source, recordId: item.recordId, date: today } } });
  }
  const work = rows(app).at(-1)!;
  assert.ok(work.textContent.indexOf('Inventory Software') < work.textContent.indexOf('R$ 600,00 expected'));
  assert.ok(work.textContent.indexOf('R$ 600,00 expected') < work.textContent.indexOf('João Inglês'));
  assert.ok(!app.nodes().some((node) => ['Pay', 'Skip', 'Edit', 'Delete'].includes(String(node.props?.label))));
  await app.tapSet(`Complete Early Task on ${today}`);
  assert.equal(f.calendar.readRange({ from: today, to: today }).find((row) => row.title === 'Early Task')!.status, 'Completed');
  assert.ok(app.find('Pressable', `Reopen Early Task on ${today}`)); await app.tapSet(`Reopen Early Task on ${today}`);
  assert.ok(app.find('Pressable', `Complete Early Task on ${today}`));
});

test('failed refresh retains the browsed month, selected date, grid markers and agenda; Retry reflects edits', async (t) => {
  const f = await initialized(t); const date = '2026-11-21';
  const id = f.tasks.createTask({ ...taskDraft(), title: 'Retained agenda', date });
  const app = await mount(createElement(screens.CalendarScreen), f.db); t.after(app.unmount);
  await app.press('Next month'); await choose(app, date);
  const cell = selected(app); const row = opener(app, 'Retained agenda'); const label = cell.props.accessibilityLabel;
  f.tasks.editTask(id, { ...taskDraft(), title: 'Updated agenda', date }); runtime.fixture.failures.add('calendar.readRange');
  await app.resume(); await app.refocus();
  assert.equal(selected(app), cell); assert.equal(cell.props.accessibilityLabel, label); assert.equal(opener(app, 'Retained agenda'), row);
  assert.ok(app.find('FormButton', 'Retry')); assert.ok(!app.nodes().some((node) => node.kind === 'ActivityIndicator'));
  runtime.fixture.failures.clear(); await app.press('Retry');
  assert.equal(selected(app), cell); assert.ok(opener(app, 'Updated agenda')); assert.ok(app.container.textContent.includes(calendarDateLabel(date)));
  await app.refocus(); assert.equal(selected(app).props.testID, `calendar-date-${date}`);
});

test('initial read failure is distinct from empty agenda and Retry loads the retained selection', async (t) => {
  const f = await initialized(t); const app = await mount(createElement(screens.CalendarScreen), f.db, ['calendar.readRange']); t.after(app.unmount);
  assert.ok(!app.container.textContent.includes('Nothing scheduled')); assert.ok(app.find('FormButton', 'Retry'));
  assert.equal(selected(app).props.testID, `calendar-date-${today}`); runtime.fixture.failures.clear(); await app.press('Retry');
  assert.ok(app.container.textContent.includes('Nothing scheduled')); assert.ok(app.container.textContent.includes(calendarDateLabel(today)));
});

test('local midnight refresh updates today without moving selection; Today then selects the new civil date', async (t) => {
  const f = await initialized(t); t.mock.timers.setTime(pickerValue(today, '23:59').getTime());
  const next = addDays(today, 1); f.tasks.createTask({ ...taskDraft(), title: 'New local day', date: next });
  const app = await mount(createElement(screens.CalendarScreen), f.db); t.after(app.unmount);
  assert.equal(selected(app).props.testID, `calendar-date-${today}`);
  t.mock.timers.setTime(pickerValue(next, '00:01').getTime()); await app.resume();
  assert.equal(selected(app).props.testID, `calendar-date-${today}`, 'Midnight refresh does not move the browsed date');
  const cell = app.nodes().find((node) => node.props?.testID === `calendar-date-${next}`)!;
  assert.match(cell.props.accessibilityLabel as string, /today/);
  await app.press('Today'); assert.equal(selected(app), cell); assert.ok(opener(app, 'New local day'));
  assert.ok(app.container.textContent.includes(calendarDateLabel(next)));
});

test('focus/foreground refresh reflects source Pay, Skip, Undo and Work partial/full/Undo without changing selection', async (t) => {
  const f = await initialized(t);
  const bill = f.commitments.create({ ...commitmentDraft(null, undefined, today), title: 'Internet', amount: '100', firstDueDate: today });
  const client = f.work.createCounterparty('Client');
  const job = f.work.create({ ...workDraft(null, today), title: 'Outstanding job', description: '', counterpartyId: client.id, compensationType: 'fixed', fixedAmount: '100', expectedPaymentDate: today });
  const app = await mount(createElement(screens.CalendarScreen), f.db); t.after(app.unmount);
  const obligation = f.commitments.read().items.find((row) => row.commitment.id === bill)!.outstanding[0];
  f.commitments.pay(obligation, '100', today); await app.refocus(); assert.equal(rows(app).length, 1);
  f.commitments.reopen(obligation.id!); await app.resume(); assert.equal(rows(app).length, 2);
  f.commitments.skip(obligation); await app.refocus(); assert.equal(rows(app).length, 1);
  const payment = (amount: string) => f.work.recordPayment({ counterpartyId: client.id, allocations: [{ workEntryId: job, amount }], paymentDate: today, categoryId: null });
  const partial = payment('40'); await app.resume(); assert.match(opener(app, 'Outstanding job').props.accessibilityLabel as string, /R\$ 60,00 expected/);
  const full = payment('60'); await app.refocus(); assert.equal(rows(app).length, 0);
  f.work.undoPayment(full); await app.resume(); assert.equal(rows(app).length, 1);
  f.work.undoPayment(partial); await app.refocus(); assert.match(opener(app, 'Outstanding job').props.accessibilityLabel as string, /R\$ 100,00 expected/);
  assert.equal(selected(app).props.testID, `calendar-date-${today}`);
});

test('Calendar mounted refreshes read only the visible grid and never query unrelated feature details', async (t) => {
  const f = await initialized(t); f.tasks.createTask({ ...taskDraft(), title: 'Adjacent', date: addDays('2026-10-01', -1) });
  const measured = await f.measureAsync(() => mount(createElement(screens.CalendarScreen), f.db)); const app = measured.value; t.after(app.unmount);
  assert.ok(measured.statements.every((row) => !/fitness_|journal_/.test(row.sql)));
  // Work's exact balances require scoped receipt/allocation joins, not a Transactions ledger read.
  for (const row of measured.statements.filter((row) => row.sql.includes('finance_transactions'))) {
    assert.ok(row.sql.includes('work_payment_allocations') && row.sql.includes('expected_payment_date'));
    assert.ok(row.params.includes(monthGridRange(today).from) && row.params.includes(monthGridRange(today).to));
  }
  const taskQuery = measured.statements.find((row) => row.sql.includes('from "tasks"'))!;
  assert.ok(taskQuery.params.includes(monthGridRange(today).from)); assert.ok(taskQuery.params.includes(monthGridRange(today).to));
  const count = measured.count; const refresh = await f.measureAsync(() => app.resume()); assert.equal(refresh.count, count);
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []); assert.equal(f.sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
});

for (const [width, fontScale, mode] of [[320, 1, 'light'], [390, 1, 'dark'], [320, 2, 'dark']] as const) {
  test(`Calendar wraps source titles and retains seven readable columns at ${width}, font ${fontScale}, ${mode}`, async (t) => {
    t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width, height: 844, fontScale, scale: 1 }));
    t.mock.method(runtime.native as { useColorScheme: () => string }, 'useColorScheme', () => mode);
    const f = await initialized(t); const title = 'A long important task title '.repeat(8).trim();
    f.tasks.createTask({ ...taskDraft(), title, date: today }); const app = await mount(createElement(screens.CalendarScreen), f.db); t.after(app.unmount);
    assert.ok(opener(app, title)); assert.ok(app.nodes(rows(app)[0]).every((node) => node.props?.numberOfLines === undefined && node.props?.allowFontScaling !== false));
    const cells = app.nodes().filter((node) => String(node.props?.testID ?? '').startsWith('calendar-date-'));
    assert.equal(cells.length, 35); assert.equal(cells[0].parentNode!.childNodes.length, 7);
    assert.equal(flatten(cells[0].props.style).height, undefined);
    const heading = app.nodes().find((node) => node.kind === 'ThemedText' && node.props.accessibilityRole === 'header' && node.textContent.includes('2026') && !node.textContent.includes('13'))!;
    assert.equal(flatten(heading.props.style).minWidth, 0); assert.equal(heading.props.numberOfLines, undefined);
  });
}

test('month trigger opens on the displayed month, year browsing stays local and dismissing restores trigger focus', async (t) => {
  const f = await initialized(t); const app = await mount(createElement(screens.CalendarScreen), f.db); t.after(app.unmount);
  await app.press('Next month'); const trigger = monthTrigger(app); const selection = selected(app).props.testID; const reads = runtime.fixture.reads.length;
  assert.equal(trigger.props.accessibilityRole, 'button'); assert.match(trigger.props.accessibilityLabel as string, /choose month and year/);
  await openMonthChooser(app); assert.equal(monthButton(app, 2026, 11).props.selected, true);
  assert.equal((trigger.props.accessibilityState as { expanded: boolean }).expanded, true);
  await app.press('Next year'); assert.equal(monthButton(app, 2027, 11).props.selected, false);
  assert.equal(selected(app).props.testID, selection); assert.equal(runtime.fixture.reads.length, reads);
  await app.press('Previous year'); assert.equal(monthButton(app, 2026, 11).props.selected, true);
  for (let index = 0; index < 4; index++) await app.press('Next year');
  await app.press('Back'); assert.equal(selected(app).props.testID, selection); assert.ok(!app.nodes().some((node) => node.kind === 'Modal'));
  assert.equal(document.activeElement, trigger); assert.equal((trigger.props.accessibilityState as { expanded: boolean }).expanded, false);
  await openMonthChooser(app); assert.equal(monthButton(app, 2026, 11).props.selected, true, 'Reopening starts on the Calendar month, not the abandoned candidate year');
  await act(() => (app.find('Modal').props.onRequestClose as () => void)()); assert.equal(document.activeElement, trigger);
});

for (const [date, year, month, expected] of [
  ['2026-10-13', 2027, 2, '2027-02-13'], ['2027-01-31', 2027, 2, '2027-02-28'],
  ['2028-01-31', 2028, 2, '2028-02-29'], ['2026-03-31', 2026, 4, '2026-04-30'], ['2026-12-31', 2027, 1, '2027-01-31'],
] as const) test(`chooser jump ${date} → ${expected} preserves/clamps the actual day and immediately loads target agenda and markers`, async (t) => {
  const f = await initialized(t, date);
  f.tasks.createTask({ ...taskDraft(), title: 'Previous month agenda', date });
  f.tasks.createTask({ ...taskDraft(), title: 'Target agenda', date: expected });
  const app = await mount(createElement(screens.CalendarScreen), f.db); t.after(app.unmount); await openMonthChooser(app);
  if (Number(date.slice(0, 4)) !== year) await app.press('Next year');
  await chooseMonth(app, year, month);
  assert.equal(selected(app).props.testID, `calendar-date-${expected}`); assert.match(selected(app).props.accessibilityLabel as string, /1 task/);
  assert.ok(opener(app, 'Target agenda')); assert.ok(!opener(app, 'Previous month agenda'));
  assert.ok(!app.nodes().some((node) => node.kind === 'Modal')); assert.equal(document.activeElement, monthTrigger(app));
  assert.ok(!app.nodes().some((node) => node.kind === 'DateTimePicker'));
});

test('jumping to 2030 preserves the day and Today still recovers the device-local current date', async (t) => {
  const f = await initialized(t); const app = await mount(createElement(screens.CalendarScreen), f.db); t.after(app.unmount);
  await openMonthChooser(app); for (let index = 0; index < 4; index++) await app.press('Next year');
  await chooseMonth(app, 2030, 3); assert.equal(selected(app).props.testID, 'calendar-date-2030-03-13');
  await app.press('Today'); assert.equal(selected(app).props.testID, `calendar-date-${today}`);
});

test('jump failure preserves target navigation and last-good snapshot without showing stale agenda as target data; Retry loads target', async (t) => {
  const f = await initialized(t);
  f.tasks.createTask({ ...taskDraft(), title: 'Old agenda', date: today }); f.tasks.createTask({ ...taskDraft(), title: 'New agenda', date: '2027-02-13' });
  const app = await mount(createElement(screens.CalendarScreen), f.db); t.after(app.unmount);
  await openMonthChooser(app); await app.press('Next year'); runtime.fixture.failures.add('calendar.readRange'); await chooseMonth(app, 2027, 2);
  assert.equal(selected(app).props.testID, 'calendar-date-2027-02-13'); assert.equal(rows(app).length, 0);
  assert.ok(!app.container.textContent.includes('Nothing scheduled')); assert.ok(app.find('FormButton', 'Retry'));
  await openMonthChooser(app); assert.equal(monthButton(app, 2027, 2).props.selected, true); await app.press('Back');
  runtime.fixture.failures.clear(); await app.press('Retry');
  assert.equal(selected(app).props.testID, 'calendar-date-2027-02-13'); assert.ok(opener(app, 'New agenda')); assert.ok(!opener(app, 'Old agenda'));
  assert.match(selected(app).props.accessibilityLabel as string, /1 task/);
});

test('iOS month chooser restores focus after native dismissal and keeps year browsing independent', async (t) => {
  const platform = (runtime.native as { Platform: { OS: string } }).Platform; const previous = platform.OS; platform.OS = 'ios'; t.after(() => { platform.OS = previous; });
  const f = await initialized(t); const app = await mount(createElement(screens.CalendarScreen), f.db); t.after(app.unmount);
  await openMonthChooser(app); const modal = app.find('Modal'); await app.press('Next year'); await app.press('Back');
  assert.equal(selected(app).props.testID, `calendar-date-${today}`);
  await act(() => (modal.props.onDismiss as () => void)()); assert.equal(document.activeElement, monthTrigger(app));
  await openMonthChooser(app); assert.equal(monthButton(app, 2026, 10).props.selected, true);
});

for (const [width, fontScale, mode, columns] of [[320, 1, 'light', 3], [320, 2, 'dark', 2]] as const) {
  test(`month chooser uses ${columns} readable columns at ${width}px scale ${fontScale}, ${mode}, with localized full accessible names`, async (t) => {
    t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width, height: 844, fontScale, scale: 1 }));
    t.mock.method(runtime.native as { useColorScheme: () => string }, 'useColorScheme', () => mode);
    const f = await initialized(t); const app = await mount(createElement(screens.CalendarScreen), f.db); t.after(app.unmount); await openMonthChooser(app);
    const options = app.nodes().find((node) => node.props?.testID === 'calendar-month-options')!;
    assert.equal(options.childNodes.length, 12 / columns); assert.ok(options.childNodes.every((row) => row.childNodes.length === columns));
    for (let month = 1; month <= 12; month++) {
      const button = monthButton(app, 2026, month); assert.ok(button);
      assert.equal(button.props.label, pickerValue(`2026-${String(month).padStart(2, '0')}-01`).toLocaleDateString(undefined, { month: 'short' }));
      assert.equal(button.props.numberOfLines, undefined); assert.equal(button.props.selected, month === 10);
    }
    assert.ok(!app.nodes().some((node) => ['Done', 'Save', 'Confirm'].includes(String(node.props?.label))));
  });
}

for (const [date, boundary] of [['0001-01-01', 'Previous year'], ['9999-12-31', 'Next year']] as const) {
  test(`chooser respects the existing civil-year boundary at ${date}`, async (t) => {
    // Node's Date mock rejects pre-epoch clocks; test the actual chooser at the boundary without changing today's clock.
    const f = await initialized(t);
    const { MonthChooser } = createRequire(import.meta.url)('../src/features/calendar/components/month-chooser') as typeof import('../src/features/calendar/components/month-chooser');
    const app = await mount(createElement(MonthChooser, { month: `${date.slice(0, 7)}-01`, visible: true, onDismiss: () => {}, onClosed: () => {}, onSelect: () => {} }), f.db); t.after(app.unmount);
    assert.equal(app.find('FormButton', boundary).props.disabled, true);
    assert.ok(monthButton(app, Number(date.slice(0, 4)), Number(date.slice(5, 7))));
  });
}

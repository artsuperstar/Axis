/// <reference types="node" />
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';

import { journalBaseline, moodLabel } from '../src/features/journal/form';
import { journalFullDate, journalHistoryGroups } from '../src/features/journal/presentation';
import { taskDraft } from '../src/features/tasks/form';
import { transactionDraft } from '../src/features/finance/form';
import { addDays, localDateString, pickerValue } from '../src/utils/calendar';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

type App = Awaited<ReturnType<typeof mount>>;
const today = '2026-10-14';
async function fixture(t: TestContext, date = today) {
  const f = await journalDatabase(); f.setTime(date);
  t.mock.timers.enable({ apis: ['Date'], now: f.now() });
  runtime.fixture.routeParams = {};
  t.after(() => { runtime.fixture.routeParams = {}; f.sqlite.close(); }); return f;
}
async function settle() { await act(() => new Promise((resolve) => setTimeout(resolve, 20))); }
async function history(app: App) { await app.press('Journal options'); await app.press('History'); await settle(); }
function dateShown(app: App, date: string) { assert.ok(app.find('Pressable', journalFullDate(date))); }
function rows(app: App) { return app.nodes().filter((node) => node.kind === 'Pressable' && String(node.props?.accessibilityLabel ?? '').startsWith('Open journal for')); }
async function tap(app: App, row: ReturnType<App['nodes']>[number]) { await act(() => (row.props.onPress as () => void)()); }

test('today opens directly for writing with optional mood, explicit Save and body-free Home status', async (t) => {
  const f = await fixture(t); const app = await mount(createElement(screens.JournalScreen), f.db);
  dateShown(app, today); assert.ok(app.find('FormField', 'Entry')); assert.equal(app.find('FormButton', 'Next day').props.disabled, true);
  assert.ok(!app.nodes().some((node) => node.props?.label === 'Today' || node.textContent === 'Day at a Glance'));
  await app.change('Entry', 'My day\nA second paragraph.'); assert.equal(f.access.getEntry(today), null);
  await app.press('Save'); assert.equal(f.access.getEntry(today)!.mood, null); assert.equal(f.access.getDraft(today), null);
  assert.ok(app.container.textContent.includes('Saved')); assert.equal(f.access.listHistory().entries[0].content, 'My day\nA second paragraph.');
  await app.unmount();
  const home = await mount(createElement(screens.HomeScreen), f.db); t.after(home.unmount);
  const journal = home.nodes().find((node) => String(node.props?.accessibilityLabel ?? '').startsWith('Journal.'))!;
  assert.match(journal.props.accessibilityLabel as string, /Entry saved/); assert.ok(!home.container.textContent.includes('A second paragraph'));
});

for (const [date, previous] of [[today, '2026-10-13'], ['2026-03-01', '2026-02-28'], ['2024-03-01', '2024-02-29'], ['2026-01-01', '2025-12-31']] as const) {
  test(`local day navigation crosses ${date} safely through ${previous}`, async (t) => {
    const f = await fixture(t, date); const app = await mount(createElement(screens.JournalScreen), f.db); t.after(app.unmount);
    await app.press('Previous day'); dateShown(app, previous); assert.equal(app.find('FormButton', 'Next day').props.disabled, false);
    assert.ok(app.container.textContent.includes('No entry for this day')); assert.ok(!app.nodes().some((node) => node.kind === 'FormField'));
    await app.press('Next day'); dateShown(app, date); assert.equal(app.find('FormButton', 'Next day').props.disabled, true);
    await app.press('Previous day'); await app.press('Today'); dateShown(app, date); assert.equal(f.access.hasEntry(previous), false);
  });
}

test('past empty dates require Write an entry; saved historical dates remain editable and Save changes preserves date', async (t) => {
  const f = await fixture(t); const yesterday = addDays(today, -1); const app = await mount(createElement(screens.JournalScreen), f.db); t.after(app.unmount);
  await app.press('Previous day'); await app.press('Write an entry'); await app.change('Entry', 'Yesterday note'); await app.press('Good'); await app.press('Save');
  const first = f.access.getEntry(yesterday)!; assert.equal(first.mood, 'good'); assert.equal(f.access.getEntry(today), null);
  await app.press('Today'); await app.press('Previous day'); assert.equal(app.find('FormField', 'Entry').props.value, 'Yesterday note');
  await app.change('Entry', 'Updated historical note'); await app.press('Save changes');
  const updated = f.access.getEntry(yesterday)!; assert.equal(updated.id, first.id); assert.equal(updated.entryDate, yesterday);
  assert.equal(f.access.listHistory().entries[0].content, 'Updated historical note');
});

test('all existing moods are single choices, selected-state is exposed and tapping the current mood clears it', async (t) => {
  const f = await fixture(t); const app = await mount(createElement(screens.JournalScreen), f.db); t.after(app.unmount); await app.change('Entry', 'Writing stays independent');
  for (const [index, mood] of (['great', 'good', 'okay', 'low', 'bad'] as const).entries()) {
    await app.press(moodLabel(mood));
    const options = app.nodes().filter((node) => node.kind === 'FormButton' && String(node.props?.accessibilityLabel ?? '').endsWith(', mood'));
    assert.equal(options.filter((node) => node.props.selected).length, 1); assert.equal(app.find('FormButton', moodLabel(mood)).props.selected, true);
    await app.press(index === 0 ? 'Save' : 'Save changes'); assert.equal(f.access.getEntry(today)!.mood, mood);
  }
  await app.press('Bad'); assert.equal(app.find('FormButton', 'Bad').props.selected, false); await app.press('Save changes');
  assert.equal(f.access.getEntry(today)!.mood, null); assert.equal(f.access.getEntry(today)!.content, 'Writing stays independent');
});

test('dirty day/History/Back navigation offers Keep, Discard or Save and never silently loses writing', async (t) => {
  const f = await fixture(t); const app = await mount(createElement(screens.JournalScreen), f.db); t.after(app.unmount); await app.change('Entry', 'Protected draft');
  const writing = app.find('FormField', 'Entry'); await app.press('Previous day'); assert.ok(app.find('Modal'));
  await app.press('Keep editing'); assert.equal(app.find('FormField', 'Entry'), writing); dateShown(app, today);
  await history(app); assert.ok(app.find('FormButton', 'Keep editing')); assert.equal(runtime.fixture.navigation.length, 0);
  await app.press('Save'); assert.equal(f.access.getEntry(today)!.content, 'Protected draft');
  assert.equal(runtime.fixture.navigation.at(-1)!.target, '/journal/history');
  await app.change('Entry', 'Discarded local edit'); await app.press('Back from journal'); await app.press('Discard changes');
  assert.equal(f.access.getEntry(today)!.content, 'Protected draft'); assert.equal(runtime.fixture.navigation.at(-1)!.method, 'back');
});

test('native removal guard retains the draft on Keep and replays the requested Back after Discard', async (t) => {
  const f = await fixture(t); const app = await mount(createElement(screens.JournalScreen), f.db); t.after(app.unmount);
  await app.change('Entry', 'Swipe-back draft'); const action = { type: 'GO_BACK', source: 'journal' };
  await act(() => (runtime.removeRoute as (action: unknown) => void)(action)); await app.press('Keep editing');
  assert.equal(app.find('FormField', 'Entry').props.value, 'Swipe-back draft'); assert.equal(runtime.fixture.navigation.length, 0);
  await act(() => (runtime.removeRoute as (action: unknown) => void)(action)); await app.press('Discard changes');
  assert.deepEqual(runtime.fixture.navigation.at(-1), { method: 'dispatch', target: action });
});

test('restarting restores a saved-entry-plus-draft without autosaving; Save clears draft atomically', async (t) => {
  const f = await fixture(t); f.access.save(today, { content: 'Saved baseline', mood: 'good' }, null);
  let app = await mount(createElement(screens.JournalScreen), f.db); await app.change('Entry', 'Working paragraphs\nStill unsaved'); await app.press('Low');
  await act(() => (runtime.blur as () => void)()); assert.equal(f.access.getDraft(today)!.content, 'Working paragraphs\nStill unsaved'); await app.unmount();
  app = await mount(createElement(screens.JournalScreen), f.db); t.after(app.unmount);
  assert.equal(app.find('FormField', 'Entry').props.value, 'Working paragraphs\nStill unsaved'); assert.ok(app.container.textContent.includes('Recovered draft'));
  assert.equal(f.access.getEntry(today)!.content, 'Saved baseline'); await app.change('Entry', 'Resumed writing'); assert.ok(!app.container.textContent.includes('Recovered draft'));
  await app.press('Save changes'); assert.equal(f.access.getDraft(today), null); assert.equal(f.access.getEntry(today)!.content, 'Resumed writing');
});

test('stale save preserves authoritative entry and local draft until confirmed discard/reload', async (t) => {
  const f = await fixture(t); const original = f.access.save(today, { content: 'First saved', mood: null }, null)!;
  const app = await mount(createElement(screens.JournalScreen), f.db); t.after(app.unmount); await app.change('Entry', 'Local edit');
  const current = f.access.save(today, { content: 'Other writer', mood: 'great' }, journalBaseline(original))!;
  await app.press('Save changes'); assert.equal(app.find('FormField', 'Entry').props.value, 'Local edit'); assert.ok(app.container.textContent.includes('changed since'));
  assert.deepEqual(f.access.getEntry(today), current); assert.equal(f.access.getDraft(today)!.content, 'Local edit'); assert.equal(app.find('FormButton', 'Save changes').props.disabled, true);
  await app.press('Discard changes and reload'); assert.equal(f.access.getDraft(today)!.content, 'Local edit'); await app.confirm('Keep editing');
  await app.press('Discard changes and reload'); await app.confirm('Discard changes'); assert.equal(app.find('FormField', 'Entry').props.value, 'Other writer'); assert.equal(f.access.getDraft(today), null);
});

test('target-date read failure hides previous writing/context; Retry loads the target without losing the prior entry', async (t) => {
  const f = await fixture(t); f.access.save(today, { content: 'Today only', mood: null }, null);
  const previous = addDays(today, -1); f.access.save(previous, { content: 'Yesterday only', mood: 'good' }, null);
  const app = await mount(createElement(screens.JournalScreen), f.db); t.after(app.unmount);
  runtime.fixture.failures.add('journal.getEntry'); await app.press('Previous day'); dateShown(app, previous);
  assert.ok(!app.nodes().some((node) => node.kind === 'FormField')); assert.ok(!app.container.textContent.includes('Today only'));
  assert.ok(app.find('FormButton', 'Return to loaded day')); assert.ok(app.find('FormButton', 'Retry journal'));
  runtime.fixture.failures.clear(); await app.press('Retry journal'); assert.equal(app.find('FormField', 'Entry').props.value, 'Yesterday only');
  assert.equal(f.access.getEntry(today)!.content, 'Today only');
});

test('initial failure avoids a false empty date; noninitial context/entry failures retain last good data and drafts', async (t) => {
  const f = await fixture(t); const id = f.tasks.createTask({ ...taskDraft(), title: 'Completed today' }); f.tasks.setCompleted(id, true);
  const app = await mount(createElement(screens.JournalScreen), f.db, ['journal.getEntry']); t.after(app.unmount);
  assert.ok(app.find('FormButton', 'Retry journal')); assert.ok(!app.container.textContent.includes('No entry for this day'));
  runtime.fixture.failures.clear(); await app.press('Retry journal'); await app.change('Entry', 'Draft stays'); await app.press('Okay');
  const field = app.find('FormField', 'Entry'); runtime.fixture.failures.add('journalContext.read'); await app.resume();
  assert.equal(app.find('FormField', 'Entry'), field); assert.equal(field.props.value, 'Draft stays'); assert.equal(app.find('FormButton', 'Okay').props.selected, true);
  assert.ok(app.container.textContent.includes('1 task completed')); assert.ok(app.find('FormButton', 'Retry activity'));
  runtime.fixture.failures.clear(); await app.press('Retry activity'); await app.press('Save');
  runtime.fixture.failures.add('journal.getEntry'); await app.resume(); assert.equal(app.find('FormField', 'Entry'), field); assert.equal(field.props.value, 'Draft stays');
  runtime.fixture.failures.clear(); await app.press('Retry journal'); assert.equal(app.find('FormField', 'Entry'), field);
});

test('source mutations refresh derived day context without changing authored writing', async (t) => {
  const f = await fixture(t); const app = await mount(createElement(screens.JournalScreen), f.db); t.after(app.unmount); await app.change('Entry', 'Independent writing');
  const id = f.tasks.createTask({ ...taskDraft(), title: 'Context task' }); f.tasks.setCompleted(id, true);
  const workout = f.fitness.startWorkout(); f.fitness.finishWorkout(workout.id);
  f.finance.createTransaction({ ...transactionDraft(null, pickerValue(today)), description: 'Groceries', amount: '82,40' });
  f.finance.createTransaction({ ...transactionDraft(null, pickerValue(today)), description: 'Income', amount: '200', type: 'income' });
  await app.resume(); assert.ok(app.container.textContent.includes('1 task completed')); assert.ok(app.container.textContent.includes('Free workout'));
  assert.ok(app.container.textContent.includes('82,40')); assert.ok(app.container.textContent.includes('117,60'));
  f.fitness.finishWorkout(f.fitness.startWorkout().id); f.tasks.setCompleted(id, false); await app.resume();
  assert.ok(app.container.textContent.includes('2 workouts completed')); assert.ok(!app.container.textContent.includes('1 task completed'));
  assert.equal(app.find('FormField', 'Entry').props.value, 'Independent writing'); assert.equal(f.access.getEntry(today), null);
});

test('History is pushed, grouped and paged; row returns to the editable requested date, while Home opens today', async (t) => {
  const f = await fixture(t); for (let i = 0; i < 45; i++) f.access.save(addDays(today, -i), { content: `Day ${i}\nSecond paragraph`, mood: i === 1 ? 'good' : null }, null);
  let app = await mount(createElement(screens.JournalScreen), f.db); await history(app);
  assert.equal(runtime.fixture.navigation.at(-1)!.target, '/journal/history'); assert.ok(!app.nodes().some((node) => node.kind === 'Modal')); await app.unmount();
  app = await mount(createElement(screens.JournalHistoryScreen), f.db); assert.equal(rows(app).length, 20);
  const firstLabels = rows(app).map((row) => row.props.accessibilityLabel); await app.press('Load older entries'); assert.equal(rows(app).length, 40);
  assert.deepEqual(rows(app).slice(0, 20).map((row) => row.props.accessibilityLabel), firstLabels);
  runtime.fixture.failures.add('journal.listHistory'); await app.press('Load older entries'); assert.equal(rows(app).length, 40);
  runtime.fixture.failures.clear(); await app.press('Retry history'); assert.equal(rows(app).length, 45); assert.equal(new Set(rows(app).map((row) => row.props.accessibilityLabel)).size, 45);
  assert.ok(!app.nodes().some((node) => node.props?.label === 'Load older entries'));
  const chosen = addDays(today, -1); await tap(app, rows(app)[1]); const target = runtime.fixture.navigation.at(-1)!.target as { pathname: string; params: Record<string, string> };
  assert.equal(target.pathname, '/journal'); assert.equal(target.params.date, chosen); assert.ok(target.params.entryRequest); await app.unmount();
  runtime.fixture.routeParams = target.params; app = await mount(createElement(screens.JournalScreen), f.db);
  dateShown(app, chosen); assert.equal(app.find('FormField', 'Entry').props.value, 'Day 1\nSecond paragraph'); await app.unmount();
  runtime.fixture.routeParams = {}; const home = await mount(createElement(screens.HomeScreen), f.db);
  await tap(home, home.nodes().find((node) => String(node.props?.accessibilityLabel ?? '').startsWith('Journal.'))!);
  assert.deepEqual(runtime.fixture.navigation.at(-1)!.target, { pathname: '/journal' }); await home.unmount();
  app = await mount(createElement(screens.JournalScreen), f.db); t.after(app.unmount); dateShown(app, today); assert.equal(app.find('FormField', 'Entry').props.value, 'Day 0\nSecond paragraph');
});

test('retained Journal processes fresh History requests without replaying a previous date during day browsing', async (t) => {
  const f = await fixture(t); const app = await mount(createElement(screens.JournalScreen), f.db); t.after(app.unmount);
  const date = addDays(today, -2); runtime.fixture.routeParams = { date, entryRequest: 'first' }; await app.resume(); dateShown(app, date);
  await app.press('Previous day'); dateShown(app, addDays(date, -1));
  runtime.fixture.routeParams = { date, entryRequest: 'second' }; await app.resume(); dateShown(app, date);
});

test('History initial/refresh failures keep recovery and loaded rows; empty History is restrained', async (t) => {
  const f = await fixture(t); let app = await mount(createElement(screens.JournalHistoryScreen), f.db, ['journal.listHistory']);
  assert.ok(app.find('FormButton', 'Retry history')); assert.ok(!app.container.textContent.includes('No journal entries yet'));
  runtime.fixture.failures.clear(); await app.press('Retry history'); assert.ok(app.container.textContent.includes('No journal entries yet')); await app.unmount();
  f.access.save(today, { content: 'Visible saved entry', mood: null }, null); app = await mount(createElement(screens.JournalHistoryScreen), f.db); t.after(app.unmount);
  runtime.fixture.failures.add('journal.listHistory'); await app.refocus(); assert.equal(rows(app).length, 1); assert.ok(app.container.textContent.includes('Visible saved entry'));
});

for (const mode of ['clean', 'empty', 'dirty', 'historical'] as const) {
  test(`midnight updates Today while retaining the ${mode} selected date safely`, async (t) => {
    const f = await fixture(t); if (mode === 'clean') f.access.save(today, { content: 'Yesterday after midnight', mood: null }, null);
    const app = await mount(createElement(screens.JournalScreen), f.db); t.after(app.unmount);
    const selected = mode === 'historical' ? addDays(today, -1) : today;
    if (mode === 'historical') await app.press('Previous day');
    if (mode === 'dirty') await app.change('Entry', 'Midnight draft');
    t.mock.timers.setTime(pickerValue(addDays(today, 1), '00:01').getTime()); await app.resume();
    dateShown(app, selected); assert.ok(app.find('FormButton', 'Today')); assert.equal(app.find('FormButton', 'Next day').props.disabled, false);
    assert.equal(f.access.getEntry(addDays(today, 1)), null);
    if (mode === 'dirty') assert.equal(app.find('FormField', 'Entry').props.value, 'Midnight draft');
  });
}

test('contextual deletion is confirmed and preserves the current editor through cancellation', async (t) => {
  const f = await fixture(t); f.access.save(today, { content: 'Saved entry', mood: null }, null);
  const app = await mount(createElement(screens.JournalScreen), f.db); t.after(app.unmount);
  assert.ok(!app.nodes().some((node) => node.props?.label === 'Delete entry')); await app.press('Journal options'); await app.press('Delete entry'); await settle();
  assert.equal(f.access.getEntry(today)!.content, 'Saved entry'); await app.confirm('Cancel'); assert.equal(app.find('FormField', 'Entry').props.value, 'Saved entry');
  await app.press('Journal options'); await app.press('Delete entry'); await settle(); await app.confirm('Delete'); assert.equal(f.access.getEntry(today), null);
  assert.equal(app.find('FormField', 'Entry').props.value, ''); assert.equal(f.access.getDraft(today), null);
});

test('month/year grouping and long text remain presentation-only with accessible wrapping', async (t) => {
  const f = await fixture(t); const dates = ['2026-10-14', '2026-10-12', '2026-09-30', '2025-12-31'];
  const content = 'Long writing\n\nwith paragraphs and spacing. '.repeat(100);
  for (const date of dates) f.access.save(date, { content, mood: null }, null);
  const groups = journalHistoryGroups(f.access.listHistory().entries); assert.deepEqual(groups.map((group) => group.key), ['2026-10', '2026-09', '2025-12']);
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width: 320, height: 800, scale: 1, fontScale: 2 }));
  for (const theme of ['light', 'dark']) {
    t.mock.method(runtime.native as { useColorScheme: () => unknown }, 'useColorScheme', () => theme);
    const app = await mount(createElement(screens.JournalScreen), f.db);
    assert.equal((app.find('FormField', 'Entry').props.style as { minHeight: number }).minHeight, 360);
    assert.equal(app.find('FormField', 'Entry').props.value, content); assert.equal(app.find('FormField', 'Entry').props.autoFocus, undefined);
    assert.ok(app.nodes().filter((node) => node.kind === 'ThemedText').every((node) => node.props.allowFontScaling !== false)); await app.unmount();
  }
  assert.equal(localDateString(pickerValue('2024-02-29')), '2024-02-29');
});

test('measured Journal reads are per-date, bounded and body-free for Home, with integral SQLite data', async (t) => {
  const f = await fixture(t); const content = 'Daily writing with paragraphs.\n'.repeat(64);
  for (let i = 1; i <= 100; i++) f.access.save(addDays(today, -i), { content, mood: null }, null);
  let app!: App; const current = await f.measureAsync(async () => { app = await mount(createElement(screens.JournalScreen), f.db); });
  const entryQueries = current.statements.filter((row) => row.sql.includes('from "journal_entries"'));
  assert.equal(entryQueries.length, 1); assert.ok(entryQueries[0].sql.includes('"entry_date" = ?'));
  assert.ok(!runtime.fixture.reads.includes('journal.listHistory')); assert.ok(!current.statements.some((row) => row.sql.includes('fitness_routine_exercises')));
  assert.ok(!current.statements.some((row) => row.sql.includes('from "finance_transactions"') && row.sql.includes('"description"'))); await app.unmount();
  const page = f.measure(() => f.access.listHistory()); assert.equal(page.count, 1); assert.equal(page.rows, 21); assert.equal(page.value.entries.length, 20);
  const bytes = page.value.entries.reduce((sum, row) => sum + Buffer.byteLength(row.content), 0);
  const home = f.measure(() => f.access.hasEntry(today)); assert.equal(home.count, 1); assert.ok(!home.statements[0].sql.includes('"content"'));
  console.log(`Stage 13L measured: current date ${current.count} statements/${current.rows} rows, History ${page.count}/${page.rows} (${bytes} body bytes in 20 visible rows), Home saved-existence ${home.count} statement with no content`);
  assert.equal(f.sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok'); assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []);
});

test('iOS keyboard layout uses native safe area plus measured header and keeps Save outside scrolling writing', async (t) => {
  const f = await fixture(t); const platform = (runtime.native as { Platform: { OS: string } }).Platform;
  const oldPlatform = platform.OS; platform.OS = 'ios'; t.after(() => { platform.OS = oldPlatform; });
  t.mock.method(runtime.safeArea as { useSafeAreaInsets: () => unknown }, 'useSafeAreaInsets', () => ({ top: 59, bottom: 34, left: 0, right: 0 }));
  const app = await mount(createElement(screens.JournalScreen), f.db); t.after(app.unmount);
  const keyboard = app.find('KeyboardAvoidingView'); assert.equal(keyboard.props.behavior, 'padding');
  const header = app.nodes().find((node) => node.kind === 'View' && node.childNodes.some((child) => child.kind === 'ThemedText' && child.textContent === 'Journal'))!;
  await act(() => (header.props.onLayout as (event: unknown) => void)({ nativeEvent: { layout: { height: 72 } } }));
  assert.equal(keyboard.props.keyboardVerticalOffset, 131);
  for (let parent = app.find('FormButton', 'Save').parentNode; parent; parent = parent.parentNode) assert.notEqual(parent.kind, 'ScrollView');
  const scrolling = app.find('ScrollView'); assert.equal(scrolling.props.keyboardDismissMode, 'interactive');
  await act(() => (scrolling.props.onLayout as (event: unknown) => void)({ nativeEvent: { layout: { height: 180 } } }));
  assert.equal((app.find('FormField', 'Entry').props.style as { minHeight: number }).minHeight, 240);
});

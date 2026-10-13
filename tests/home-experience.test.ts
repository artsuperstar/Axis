/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test, type TestContext } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { act, createElement } from 'react';
import { seedDefaultCategories } from '../src/database/seed';
import { seedFinanceCategories } from '../src/features/finance/seed';
import { createFinanceDataAccess } from '../src/features/finance/data';
import { transactionDraft } from '../src/features/finance/form';
import { seedFitnessExercises } from '../src/features/fitness/seed';
import { createTaskDataAccess } from '../src/features/tasks/data';
import { taskDraft } from '../src/features/tasks/form';
import { createHomeDataAccess } from '../src/features/home/data';
import { homeItemLabel } from '../src/features/home/projection';
import { createFitnessDataAccess } from '../src/features/fitness/data';
import { createRotationDataAccess } from '../src/features/fitness/rotations-data';
import { blankSet, blankTargets } from '../src/features/fitness/form';
import { createJournalDataAccess } from '../src/features/journal/data';
import { journalBaseline } from '../src/features/journal/form';
import { addDays, localDateString } from '../src/utils/calendar';
import { bundledMigrations, database } from './helpers/database';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const today = localDateString(new Date());
async function initialized(t: TestContext) {
  const f = database(); await migrate(f.db, bundledMigrations);
  seedDefaultCategories(f.db); seedFinanceCategories(f.db); seedFitnessExercises(f.db); t.after(() => f.sqlite.close());
  return { ...f, tasks: createTaskDataAccess(f.db, randomUUID), home: createHomeDataAccess(f.db, randomUUID),
    fitness: createFitnessDataAccess(f.db, randomUUID), rotations: createRotationDataAccess(f.db, randomUUID),
    journal: createJournalDataAccess(f.db, randomUUID), finance: createFinanceDataAccess(f.db, randomUUID) };
}

test('Home keeps last-good rows and focus identity during failed refresh, then Retry reflects source changes', async (t) => {
  const f = await initialized(t);
  const id = f.tasks.createTask({ ...taskDraft(), title: 'Daily task', date: today });
  f.finance.createTransaction({ ...transactionDraft(), description: 'Initial expense', amount: '20', transactionDate: today });
  const app = await mount(createElement(screens.HomeScreen), f.db); t.after(app.unmount);
  await app.tapSet(app.nodes().find((node) => String(node.props?.accessibilityLabel ?? '').startsWith('Today.'))!.props.accessibilityLabel as string);
  const row = f.home.read().todayPreview[0];
  const label = `Open ${homeItemLabel(row, today)}`;
  const opener = app.find('Pressable', label);
  runtime.fixture.failures.add('home.read');
  f.finance.createTransaction({ ...transactionDraft(), description: 'Added expense', amount: '50', transactionDate: today });
  await app.resume();
  assert.equal(app.find('Pressable', label), opener);
  assert.ok(app.find('View', 'Spent today, R$ 20,00'));
  assert.equal((box(app, 'Today').props.accessibilityState as { expanded: boolean }).expanded, true);
  assert.ok(app.container.textContent.includes('Daily task')); assert.ok(app.find('FormButton', 'Retry'));
  f.tasks.setCompleted(id, true); runtime.fixture.failures.clear(); await app.press('Retry');
  assert.ok(app.find('View', 'Spent today, R$ 70,00'));
  assert.equal((box(app, 'Today').props.accessibilityState as { expanded: boolean }).expanded, true);
  assert.ok(!app.container.textContent.includes('Daily task')); assert.ok(app.container.textContent.includes('Nothing scheduled today.'));
  assert.deepEqual(runtime.fixture.navigation, []);
});

test('Home navigation opens exact source context; quick completion and source reopen refresh without an editor on Home', async (t) => {
  const f = await initialized(t);
  const id = f.tasks.createTask({ ...taskDraft(), title: 'Today task', date: today, time: '23:50' });
  const app = await mount(createElement(screens.HomeScreen), f.db); t.after(app.unmount);
  await app.tapSet(app.nodes().find((node) => String(node.props?.accessibilityLabel ?? '').startsWith('Today.'))!.props.accessibilityLabel as string);
  const item = f.home.read().todayPreview[0]; assert.equal(item.source, 'task');
  await app.tapSet(`Open ${homeItemLabel(item, today)}`);
  assert.deepEqual(runtime.fixture.navigation, [{ method: 'push', target: item.target }]);
  await app.tapSet(`Complete ${homeItemLabel(item, today)}`);
  assert.ok(f.tasks.read().tasks.find((row) => row.id === id)!.completedAt);
  assert.ok(!app.nodes().some((node) => node.kind === 'Modal'));
  f.tasks.setCompleted(id, false); await app.refocus(); assert.ok(app.find('Pressable', `Open ${homeItemLabel(item, today)}`));
  await app.press('View in Calendar');
  assert.deepEqual(runtime.fixture.navigation.at(-1), { method: 'push', target: { pathname: '/(tabs)/calendar' } });
});

test('active workout Resume navigates to inline Workout; finish/discard remove it; Journal Save refreshes daily entry copy', async (t) => {
  const f = await initialized(t); const workout = f.fitness.startWorkout();
  const app = await mount(createElement(screens.HomeScreen), f.db); t.after(app.unmount);
  await app.tapSet(app.nodes().find((node) => String(node.props?.accessibilityLabel ?? '').startsWith('Fitness.'))!.props.accessibilityLabel as string);
  await app.press('Resume workout'); assert.deepEqual(runtime.fixture.navigation.at(-1), { method: 'navigate', target: { pathname: '/(tabs)/fitness' } });
  assert.ok(!app.nodes().some((node) => node.kind === 'Modal'));
  f.fitness.finishWorkout(workout.id); await app.refocus();
  assert.ok(!app.nodes().some((node) => node.props?.label === 'Resume workout'));
  assert.ok(app.find('FormButton', `View ${f.home.read().completedWorkout!.session.name}, completed today`));
  const next = f.fitness.startWorkout(); await app.resume(); assert.ok(app.find('FormButton', 'Resume workout'));
  f.fitness.discardWorkout(next.id); await app.resume();
  assert.ok(!app.nodes().some((node) => node.props?.label === 'Resume workout'));
  await app.tapSet(app.nodes().find((node) => String(node.props?.accessibilityLabel ?? '').startsWith('Journal.'))!.props.accessibilityLabel as string);
  assert.deepEqual(runtime.fixture.navigation.at(-1), { method: 'push', target: { pathname: '/journal' } });
  f.journal.save(today, { content: 'Saved from Journal', mood: null }, journalBaseline(null)); await app.refocus();
  assert.ok(String(box(app, 'Journal').props.accessibilityLabel).includes('Entry saved'));
});

test('Home header uses the device-local full weekday/date and semantic title; initial failure offers Retry without false empty state', async (t) => {
  const f = await initialized(t);
  const app = await mount(createElement(screens.HomeScreen), f.db, ['home.read']); t.after(app.unmount);
  assert.ok(app.find('FormButton', 'Retry')); assert.ok(!app.container.textContent.includes('Nothing scheduled today.'));
  runtime.fixture.failures.clear(); await app.press('Retry');
  const header = app.nodes().find((node) => node.kind === 'ThemedText' && node.textContent === 'Home')!;
  assert.equal(header.props.type, 'screenTitle'); assert.equal(header.props.accessibilityRole, 'header');
  const date = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  assert.ok(app.container.textContent.includes(date));
});

function box(app: Awaited<ReturnType<typeof mount>>, title: string) {
  return app.nodes().find((node) => node.kind === 'Pressable' && String(node.props.accessibilityLabel ?? '').startsWith(title + '.'))!;
}

for (const saved of [false, true]) {
  test(`Journal navigates directly with saved=${saved} and preserves the open Today panel`, async (t) => {
    const f = await initialized(t);
    if (saved) f.journal.save(today, { content: 'Private text never shown on Home', mood: null }, journalBaseline(null));
    const app = await mount(createElement(screens.HomeScreen), f.db); t.after(app.unmount);
    await app.tapSet(box(app, 'Today').props.accessibilityLabel as string);
    const journal = box(app, 'Journal');
    const style = () => (journal.props.style as (state: { pressed: boolean }) => object[])({ pressed: false });
    const originalStyle = style();
    assert.equal(journal.props.accessibilityRole, 'button');
    assert.equal(journal.props.accessibilityState, undefined); assert.equal(journal.props['aria-expanded'], undefined);
    assert.match(journal.props.accessibilityLabel as string, saved ? /Entry saved.*Opens Journal/ : /Not written yet.*Opens Journal/);
    await app.tapSet(journal.props.accessibilityLabel as string);
    assert.deepEqual(runtime.fixture.navigation, [{ method: 'push', target: { pathname: '/journal' } }]);
    assert.equal(box(app, 'Journal'), journal); assert.deepEqual(style(), originalStyle);
    assert.equal((box(app, 'Today').props.accessibilityState as { expanded: boolean }).expanded, true);
    assert.ok(app.find('FormButton', 'View in Calendar'));
    assert.ok(!app.container.textContent.includes('Private text'));
    assert.ok(!app.nodes().some((node) => node.props?.accessibilityRole === 'header' && node.textContent === 'Journal'));
  });
}

test('Home follows rotation selection, expected completion, manual completion and discard through normal refresh', async (t) => {
  const f = await initialized(t);
  const exercise = f.fitness.readOverview().exercises.find((row) => row.measurementType === 'strength')!;
  const routines = ['Push', 'Pull', 'Legs'].map((name) => f.fitness.createRoutine({ name,
    exercises: [{ id: null, exerciseId: exercise.id, targets: blankTargets() }] }));
  const id = f.rotations.create({ name: 'Gym Cycle', steps: routines.map((routineId) => ({ id: null, routineId })) });
  f.rotations.activate(id); const steps = f.rotations.read()[0].steps;
  f.rotations.setNext(id, steps[1].id);
  const app = await mount(createElement(screens.HomeScreen), f.db); t.after(app.unmount);
  assert.match(box(app, 'Fitness').props.accessibilityLabel as string, /Up next.*Pull/);
  await app.tapSet(box(app, 'Fitness').props.accessibilityLabel as string);
  assert.ok(app.container.textContent.includes('Push → Pull → Legs')); assert.ok(app.container.textContent.includes('Gym Cycle'));
  await app.press('Open Fitness');
  assert.deepEqual(runtime.fixture.navigation.at(-1), { method: 'navigate', target: { pathname: '/(tabs)/fitness' } });
  const session = f.fitness.startWorkout(routines[1]);
  const entry = f.fitness.readSession(session.id).exercises[0]; f.fitness.addSet(entry.id, { ...blankSet(), weight: '20', reps: '8' });
  await app.refocus(); assert.match(box(app, 'Fitness').props.accessibilityLabel as string, /Pull.*Workout in progress.*1 exercises.*1 sets/);
  await app.press('Resume workout'); f.fitness.finishWorkout(session.id); await app.refocus();
  assert.match(box(app, 'Fitness').props.accessibilityLabel as string, /Workout done.*Pull.*Next: Legs/);
  assert.ok(app.container.textContent.includes('1 sets logged'));
  await app.press('View Pull, completed today');
  assert.deepEqual(runtime.fixture.navigation.at(-1), { method: 'push', target: f.home.read().completedWorkout!.target });
  assert.equal(f.home.read().nextWorkout!.stepId, steps[2].id);
  f.fitness.finishWorkout(f.fitness.startWorkout(routines[0]).id); await app.refocus();
  assert.match(box(app, 'Fitness').props.accessibilityLabel as string, /2 workouts completed.*Next: Legs/);
  assert.equal(f.home.read().nextWorkout!.stepId, steps[2].id, 'Unrelated workout does not advance the cycle');
  const active = f.fitness.startWorkout(routines[2]); await app.resume();
  assert.match(box(app, 'Fitness').props.accessibilityLabel as string, /Legs.*Workout in progress/);
  f.fitness.discardWorkout(active.id); await app.resume();
  assert.match(box(app, 'Fitness').props.accessibilityLabel as string, /2 workouts completed.*Next: Legs/);
  f.rotations.deactivate(id); await app.refocus();
  assert.doesNotMatch(box(app, 'Fitness').props.accessibilityLabel as string, /Next:/);
  const other = f.rotations.create({ name: 'Other cycle', steps: [{ id: null, routineId: routines[0] }] });
  f.rotations.activate(other); await app.refocus(); assert.match(box(app, 'Fitness').props.accessibilityLabel as string, /Next: Push/);
  assert.equal((box(app, 'Fitness').props.accessibilityState as { expanded: boolean }).expanded, true);
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []);
  assert.equal(f.sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
});

test('failed refresh retains expanded rotation context and spending until Retry reads the new next routine', async (t) => {
  const f = await initialized(t);
  const routines = ['Push', 'Pull'].map((name) => f.fitness.createRoutine({ name, exercises: [] }));
  const id = f.rotations.create({ name: 'Cycle', steps: routines.map((routineId) => ({ id: null, routineId })) });
  f.rotations.activate(id); const step = f.rotations.read()[0].steps[1].id;
  f.finance.createTransaction({ ...transactionDraft(), description: 'Expense', amount: '20', transactionDate: today });
  const app = await mount(createElement(screens.HomeScreen), f.db); t.after(app.unmount);
  await app.tapSet(box(app, 'Fitness').props.accessibilityLabel as string);
  const original = box(app, 'Fitness'); const label = original.props.accessibilityLabel;
  runtime.fixture.failures.add('home.read'); f.rotations.setNext(id, step);
  f.finance.createTransaction({ ...transactionDraft(), description: 'Later expense', amount: '30', transactionDate: today });
  await app.resume();
  assert.equal(box(app, 'Fitness'), original); assert.equal(original.props.accessibilityLabel, label);
  assert.ok(app.container.textContent.includes('Push → Pull')); assert.ok(app.find('View', 'Spent today, R$ 20,00'));
  assert.equal((original.props.accessibilityState as { expanded: boolean }).expanded, true);
  runtime.fixture.failures.clear(); await app.press('Retry');
  assert.match(original.props.accessibilityLabel as string, /Up next.*Pull/);
  assert.ok(app.find('View', 'Spent today, R$ 50,00'));
  assert.equal((original.props.accessibilityState as { expanded: boolean }).expanded, true);
});
test('summary boxes toggle exactly one detail after the complete grid and retain their identity during switching', async (t) => {
  const f = await initialized(t); f.tasks.createTask({ ...taskDraft(), title: 'Scheduled task', date: today });
  const app = await mount(createElement(screens.HomeScreen), f.db); t.after(app.unmount);
  const summaries = ['Today', 'Needs attention', 'Fitness', 'Journal'].map((title) => box(app, title));
  const expanded = () => summaries.filter((node) => (node.props.accessibilityState as { expanded?: boolean } | undefined)?.expanded);
  assert.equal(expanded().length, 0);
  assert.ok(!app.nodes().some((node) => node.kind === 'FormButton' && node.props.accessibilityLabel !== 'Add transaction'));
  await app.tapSet(box(app, 'Today').props.accessibilityLabel as string);
  assert.deepEqual(expanded(), [summaries[0]]); assert.ok(app.find('FormButton', 'View in Calendar'));
  const heading = app.nodes().find((node) => node.props?.accessibilityRole === 'header' && node.textContent.startsWith('Today'))!;
  assert.ok(app.nodes().indexOf(summaries[3]) < app.nodes().indexOf(heading), 'Detail follows all four boxes');
  await app.tapSet(box(app, 'Needs attention').props.accessibilityLabel as string);
  assert.deepEqual(expanded(), [summaries[1]]);
  assert.ok(!app.nodes().some((node) => node.props?.label === 'View in Calendar'));
  assert.ok(app.container.textContent.includes('Nothing needs attention.'));
  await app.tapSet(box(app, 'Fitness').props.accessibilityLabel as string);
  assert.deepEqual(expanded(), [summaries[2]]); assert.ok(app.find('FormButton', 'Open Fitness'));
  await app.tapSet(box(app, 'Fitness').props.accessibilityLabel as string);
  assert.equal(expanded().length, 0);
  for (let i = 0; i < summaries.length; i++) assert.equal(box(app, ['Today', 'Needs attention', 'Fitness', 'Journal'][i]), summaries[i]);
});

for (const [width, fontScale, mode] of [[390, 1, 'light'], [320, 1, 'dark'], [390, 2, 'light']] as const) {
  test(`summary grid is coherent at width ${width}, scale ${fontScale}, ${mode} without fixed heights or truncated labels`, async (t) => {
    t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width, height: 800, fontScale, scale: 1 }));
    t.mock.method(runtime.native as { useColorScheme: () => string }, 'useColorScheme', () => mode);
    const f = await initialized(t); const title = 'Long Task Job Commitment and workout title '.repeat(5).trim();
    f.tasks.createTask({ ...taskDraft(), title, date: today });
    const app = await mount(createElement(screens.HomeScreen), f.db); t.after(app.unmount);
    const summary = box(app, 'Today'); assert.ok(String(summary.props.accessibilityLabel).includes(title));
    const style = (summary.props.style as (state: { pressed: boolean }) => object[])({ pressed: false });
    assert.equal(Object.assign({}, ...style).height, undefined);
    const row = summary.parentNode!; assert.equal(row.childNodes.filter((node) => node.kind === 'Pressable').length, fontScale === 2 ? 4 : 2);
    assert.ok(app.nodes(summary).every((node) => node.props?.numberOfLines === undefined && node.props?.allowFontScaling !== false));
  });
}

test('Spent today and amount are information; only the adjacent plus opens the existing transaction editor', async (t) => {
  const f = await initialized(t); const app = await mount(createElement(screens.HomeScreen), f.db); t.after(app.unmount);
  const information = app.find('View', 'Spent today, R$ 0,00');
  assert.equal(information.props.accessibilityRole, 'text'); assert.equal(information.props.onPress, undefined);
  assert.equal(information.parentNode!.props.onPress, undefined);
  for (const text of ['Spent today', 'R$ 0,00']) {
    const node = app.nodes(information).find((node) => node.kind === 'ThemedText' && node.textContent === text)!;
    assert.equal(node.props.onPress, undefined);
    await act(() => (node.props.onPress as (() => void) | undefined)?.());
  }
  assert.deepEqual(runtime.fixture.navigation, []); assert.ok(!app.nodes().some((node) => node.kind === 'Modal'));
  assert.equal(app.nodes(information.parentNode!).filter((node) => node.props?.onPress).length, 1);
  await app.press('Add transaction');
  assert.ok(app.find('Modal')); assert.ok(app.find('FormField', 'Amount *').props.autoFocus);
  assert.ok(app.container.textContent.includes('New transaction'));
  assert.deepEqual(runtime.fixture.navigation, [], 'No Transactions route is opened first');
  assert.deepEqual(runtime.fixture.reads.filter((read) => read.startsWith('finance.')), ['finance.readCategories']);
});

for (const [type, date, expected] of [
  ['expense', today, 'R$ 125,00'], ['income', today, 'R$ 100,00'], ['expense', addDays(today, -1), 'R$ 100,00'],
] as const) {
  test(`quick add ${type} on ${date} returns to Home with authoritative ${expected} and retains Fitness expansion`, async (t) => {
    const f = await initialized(t);
    f.finance.createTransaction({ ...transactionDraft(), description: 'Initial expense', amount: '100', transactionDate: today });
    const app = await mount(createElement(screens.HomeScreen), f.db); t.after(app.unmount);
    await app.tapSet(box(app, 'Fitness').props.accessibilityLabel as string);
    const fitness = box(app, 'Fitness'); const spent = app.find('View', 'Spent today, R$ 100,00');
    await app.press('Add transaction'); await app.change('Amount *', '25'); await app.change('Description *', 'Quick addition');
    await act(() => (app.find('SegmentedControl', 'Type *').props.onChange as (value: string) => void)(type));
    await app.change('Date *', date); await app.press('Save');
    assert.ok(!app.nodes().some((node) => node.kind === 'Modal')); assert.deepEqual(runtime.fixture.navigation, []);
    assert.equal(app.find('View', `Spent today, ${expected}`), spent);
    assert.equal(box(app, 'Fitness'), fitness); assert.equal((fitness.props.accessibilityState as { expanded: boolean }).expanded, true);
    assert.ok(app.find('FormButton', 'Open Fitness'));
    const created = f.finance.read().transactions.find((row) => row.description === 'Quick addition')!;
    assert.equal(created.type, type); assert.equal(created.transactionDate, date); assert.equal(created.amountMinor, 2500);
    assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []);
  });
}

for (const dismiss of ['Cancel', 'Back'] as const) {
  test(`quick-add ${dismiss} returns to the unchanged Home and preserves expansion without saving the draft`, async (t) => {
    const f = await initialized(t); const app = await mount(createElement(screens.HomeScreen), f.db); t.after(app.unmount);
    await app.tapSet(box(app, 'Fitness').props.accessibilityLabel as string);
    const fitness = box(app, 'Fitness'); await app.press('Add transaction');
    await app.change('Amount *', '25'); await app.change('Description *', 'Unsaved draft');
    if (dismiss === 'Cancel') await app.press('Cancel');
    else await act(() => (app.find('Modal').props.onRequestClose as () => void)());
    assert.ok(!app.nodes().some((node) => node.kind === 'Modal')); assert.deepEqual(runtime.fixture.navigation, []);
    assert.equal(f.finance.read().transactions.length, 0); assert.ok(app.find('View', 'Spent today, R$ 0,00'));
    assert.equal(box(app, 'Fitness'), fitness); assert.equal((fitness.props.accessibilityState as { expanded: boolean }).expanded, true);
  });
}

test('invalid quick-add draft stays mounted with no transaction or false spending update, then permits correction', async (t) => {
  const f = await initialized(t); const app = await mount(createElement(screens.HomeScreen), f.db); t.after(app.unmount);
  await app.press('Add transaction'); await app.change('Amount *', '0'); await app.change('Description *', 'Invalid draft');
  const field = app.find('FormField', 'Amount *'); const modal = app.find('Modal');
  await app.press('Save'); assert.equal(app.find('Modal'), modal); assert.equal(app.find('FormField', 'Amount *'), field);
  assert.ok(app.nodes().some((node) => node.kind === 'FormError'));
  assert.equal(f.finance.read().transactions.length, 0); assert.ok(app.find('View', 'Spent today, R$ 0,00'));
  await app.change('Amount *', '25'); await app.press('Save');
  assert.ok(!app.nodes().some((node) => node.kind === 'Modal')); assert.ok(app.find('View', 'Spent today, R$ 25,00'));
});

test('quick add preserves shared type/category rules, archived filtering and automatic selection after category creation', async (t) => {
  const f = await initialized(t); const archived = f.finance.createCategory('Archived expense', 'expense'); f.finance.deleteCategory(archived.id);
  const app = await mount(createElement(screens.HomeScreen), f.db); t.after(app.unmount); await app.press('Add transaction');
  const category = f.finance.readCategories().find((row) => row.type === 'expense' && row.deletedAt === null)!;
  const categoryField = app.find('SelectField', 'Category');
  const options = () => app.find('SelectField', 'Category').props.options as { value: string | null; label: string }[];
  assert.ok(!options().some((row) => row.value === archived.id)); assert.ok(options().some((row) => row.value === null));
  await act(() => (categoryField.props.onChange as (id: string) => void)(category.id));
  await act(() => (app.find('SegmentedControl', 'Type *').props.onChange as (value: string) => void)('income'));
  assert.equal(app.find('SelectField', 'Category').props.value, null);
  assert.ok(options().filter((row) => row.value !== null).every((option) => f.finance.readCategories().find((row) => row.id === option.value)!.type === 'income'));
  const action = app.find('SelectField', 'Category').props.action as { render: (controls: object) => { props: { onSubmit: (name: string, complete: () => void) => void } } };
  let completed = false;
  await act(() => action.render({}).props.onSubmit('New income category', () => { completed = true; }));
  const created = f.finance.readCategories().find((row) => row.name === 'New income category')!;
  assert.equal(completed, true); assert.equal(app.find('SelectField', 'Category').props.value, created.id); assert.ok(options().some((row) => row.value === created.id));
  await app.change('Amount *', '25'); await app.change('Description *', 'With created category'); await app.press('Save');
  assert.equal(f.finance.read().transactions[0].categoryId, created.id); assert.ok(app.find('View', 'Spent today, R$ 0,00'));
});

test('returning from a committed quick-add write retains last-good Home on refresh failure until Retry', async (t) => {
  const f = await initialized(t); const app = await mount(createElement(screens.HomeScreen), f.db); t.after(app.unmount);
  await app.tapSet(box(app, 'Fitness').props.accessibilityLabel as string); const fitness = box(app, 'Fitness');
  await app.press('Add transaction'); await app.change('Amount *', '25'); await app.change('Description *', 'Committed expense');
  runtime.fixture.failures.add('home.read'); await app.press('Save');
  assert.ok(!app.nodes().some((node) => node.kind === 'Modal')); assert.equal(f.finance.read().transactions.length, 1);
  assert.ok(app.find('View', 'Spent today, R$ 0,00')); assert.equal(box(app, 'Fitness'), fitness);
  assert.equal((fitness.props.accessibilityState as { expanded: boolean }).expanded, true);
  runtime.fixture.failures.clear(); await app.press('Retry');
  assert.ok(app.find('View', 'Spent today, R$ 25,00')); assert.equal(box(app, 'Fitness'), fitness);
});

test('quick-add category refresh failures preserve the editor draft and last-good choices; initial failure is recoverable', async (t) => {
  const f = await initialized(t); const app = await mount(createElement(screens.HomeScreen), f.db); t.after(app.unmount);
  runtime.fixture.failures.add('finance.readCategories'); await app.press('Add transaction');
  const initialModal = app.find('Modal'); assert.equal(app.find('FormButton', 'Save').props.disabled, true);
  assert.equal(app.find('SelectField', 'Category').props.disabled, true);
  await app.change('Description *', 'Draft before categories recover');
  const initialField = app.find('FormField', 'Description *');
  runtime.fixture.failures.clear(); await app.press('Retry refresh');
  assert.equal(app.find('Modal'), initialModal); assert.equal(app.find('FormField', 'Description *'), initialField);
  assert.equal(initialField.props.value, 'Draft before categories recover'); assert.equal(app.find('FormButton', 'Save').props.disabled, false);
  await app.change('Amount *', '25'); await app.change('Description *', 'Retained draft');
  const field = app.find('FormField', 'Description *'); const modal = app.find('Modal');
  runtime.fixture.failures.add('finance.readCategories'); await app.resume(); await app.refocus();
  assert.equal(app.find('Modal'), modal); assert.equal(app.find('FormField', 'Description *'), field); assert.equal(field.props.value, 'Retained draft');
  runtime.fixture.failures.clear(); await app.press('Retry refresh'); assert.equal(app.find('FormField', 'Description *'), field);
  await app.press('Save'); assert.ok(app.find('View', 'Spent today, R$ 25,00'));
});


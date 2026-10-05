/// <reference types="node" />

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test, type TestContext } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { act, createElement } from 'react';

import { createCommitmentDataAccess } from '../src/features/finance/commitments/data';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import { createFinanceDataAccess } from '../src/features/finance/data';
import { transactionDraft } from '../src/features/finance/form';
import { seedFinanceCategories } from '../src/features/finance/seed';
import { createWorkDataAccess } from '../src/features/finance/work/data';
import { workDraft } from '../src/features/finance/work/form';
import { createFitnessDataAccess } from '../src/features/fitness/data';
import { blankSet } from '../src/features/fitness/form';
import { seedFitnessExercises } from '../src/features/fitness/seed';
import { localDateString } from '../src/utils/calendar';
import { bundledMigrations, database } from './helpers/database';
import { hooks, mount, runtime, screens } from './helpers/refresh-lifecycle';

const today = localDateString(new Date());
async function initialized(t: TestContext) {
  t.mock.method(console, 'error', () => {}); // Expected injected read failures use the existing error reporter.
  const result = database(); await migrate(result.db, bundledMigrations);
  seedFinanceCategories(result.db); seedFitnessExercises(result.db);
  t.after(() => result.sqlite.close());
  return { ...result, work: createWorkDataAccess(result.db, randomUUID), finance: createFinanceDataAccess(result.db, randomUUID),
    commitments: createCommitmentDataAccess(result.db, randomUUID), fitness: createFitnessDataAccess(result.db, randomUUID) };
}
type App = Awaited<ReturnType<typeof mount>>;
function observeDraft(app: App, labels: string[]) {
  const fields = labels.map((label) => ({ label, node: app.find('FormField', label), value: app.find('FormField', label).props.value }));
  const modal = app.find('Modal');
  return () => {
    assert.equal(app.find('Modal'), modal, 'The open modal must remain mounted');
    for (const { label, node, value } of fields) {
      assert.equal(app.find('FormField', label), node, `${label} must remain mounted`);
      assert.equal(app.find('FormField', label).props.value, value, `${label} must retain the exact draft`);
    }
  };
}
async function failAndRetry(app: App, failure: string, checkDraft: () => void, beforeRetry?: () => void) {
  runtime.fixture.failures.add(failure);
  await app.resume(); checkDraft();
  assert.ok(app.find('FormButton', 'Retry refresh'), 'Retry must be available inside the editor');
  await app.refocus(); checkDraft();
  runtime.fixture.failures.clear(); beforeRetry?.();
  await app.press('Retry refresh'); checkDraft();
  assert.ok(!app.nodes().some((node) => node.kind === 'FormButton' && node.props.label === 'Retry refresh'));
}
function fixed(counterpartyId: string) { return { ...workDraft(null, today), compensationType: 'fixed' as const, counterpartyId, description: 'Original work', fixedAmount: '1000' }; }

test('Work editor survives failed resume/focus and successful Retry, then saves the exact draft', async (t) => {
  const { db, work } = await initialized(t); const client = work.createCounterparty('Client'); const draft = fixed(client.id); const id = work.create(draft);
  const app = await mount(createElement(screens.FinanceScreen), db); t.after(app.unmount);
  await app.press('Work');
  const row = app.nodes().find((node) => node.kind === 'Pressable' && node.props.accessibilityHint === 'Work details and payments')!;
  await act(() => (row.props.onPress as () => void)()); await app.press('Edit');
  await app.change('Description *', 'Unsaved revised work'); await app.change('Fixed amount *', '876,54');
  await app.change('Expected payment date', today);
  const check = observeDraft(app, ['Description *', 'Fixed amount *', 'Work date *', 'Expected payment date']);
  await failAndRetry(app, 'work.readOverview', check, () => {
    work.edit(id, { ...draft, description: 'Changed at source', fixedAmount: '900' }); work.createCounterparty('New surrounding client');
  });
  const autocomplete = app.find('AutocompleteField', 'Client *');
  const results = (autocomplete.props.getResults as (query: string) => { options: { label: string }[] })('New');
  assert.ok(JSON.stringify(results).includes('New surrounding client'), 'Successful retry must update surrounding option data');
  await app.press('Save');
  const saved = work.read().items.find((item) => item.entry.id === id)!;
  assert.equal(saved.entry.description, 'Unsaved revised work'); assert.equal(saved.earnedMinor, 87654);
  assert.equal(saved.entry.expectedPaymentDate, today); assert.ok(!app.nodes().some((node) => node.kind === 'Modal'));
});

test('Work payment allocation, date and category survive refresh failure/Retry and reconcile on Confirm', async (t) => {
  const { db, work, finance } = await initialized(t); const client = work.createCounterparty('Client'); const id = work.create(fixed(client.id));
  const category = finance.readCategories().find((row) => row.type === 'income')!;
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'work', initialRecordId: id }), db); t.after(app.unmount);
  await app.press('Record payment'); await app.change('Allocation in reais for Original work', '123,45'); await app.change('Payment date *', today);
  await act(() => (app.find('SelectField', 'Income category').props.onChange as (id: string) => void)(category.id));
  const checkFields = observeDraft(app, ['Allocation in reais for Original work', 'Payment date *']);
  const check = () => { checkFields(); assert.equal(app.find('SelectField', 'Income category').props.value, category.id); };
  await failAndRetry(app, 'finance.readCategories', check);
  await app.press('Confirm');
  assert.equal(work.read().items.find((row) => row.entry.id === id)!.receivedMinor, 12345);
  assert.equal(finance.read().transactions[0].categoryId, category.id); assert.equal(finance.read().transactions[0].amountMinor, 12345);
});

test('Commitment payment retains amount/date through failure/Retry and saves linked payment', async (t) => {
  const { db, commitments, finance } = await initialized(t);
  const id = commitments.create({ ...commitmentDraft(null, undefined, today), title: 'Rent', amount: '300' });
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments', initialRecordId: id, initialDueDate: today }), db); t.after(app.unmount);
  await app.press('Paid'); await app.change('Amount paid *', '321,09'); await app.change('Payment date *', today);
  await failAndRetry(app, 'commitments.read', observeDraft(app, ['Amount paid *', 'Payment date *']));
  await app.press('Confirm');
  assert.equal(finance.read().transactions[0].amountMinor, 32109);
  assert.equal(commitments.readHistory(id).history.find((row) => row.occurrence.dueDate === today)!.occurrence.status, 'paid');
});

test('Commitment editor keeps working title and amount while Retry updates its source', async (t) => {
  const { db, commitments } = await initialized(t); const draft = { ...commitmentDraft(null, undefined, today), title: 'Rent', amount: '300' }; const id = commitments.create(draft);
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments', initialRecordId: id, initialDueDate: today }), db); t.after(app.unmount);
  await app.press('Edit');
  await app.change('Title *', 'Working title'); await app.change('Expected amount *', '345,67');
  await failAndRetry(app, 'commitments.read', observeDraft(app, ['Title *', 'Expected amount *']), () => commitments.edit(id, { ...draft, title: 'Source changed' }));
  await app.press('Save'); assert.equal(commitments.readHistory(id).commitment.title, 'Working title');
  assert.equal(commitments.readHistory(id).commitment.expectedAmountMinor, 34567);
});

test('Transaction editor keeps draft and category through refresh failure and successful Retry', async (t) => {
  const { db, finance } = await initialized(t); const category = finance.readCategories().find((row) => row.type === 'expense')!;
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'transactions' }), db); t.after(app.unmount);
  await app.press('Add transaction'); await app.change('Description *', 'Working transaction'); await app.change('Amount *', '25,05');
  await act(() => (app.find('SelectField', 'Category').props.onChange as (id: string) => void)(category.id));
  const checkFields = observeDraft(app, ['Description *', 'Amount *']);
  await failAndRetry(app, 'finance.read', () => { checkFields(); assert.equal(app.find('SelectField', 'Category').props.value, category.id); });
  await app.press('Save'); assert.equal(finance.read().transactions[0].description, 'Working transaction');
  assert.equal(finance.read().transactions[0].amountMinor, 2505);
});

async function workout(t: TestContext) {
  const fixture = await initialized(t); const exercise = fixture.fitness.read().exercises.find((row) => row.measurementType === 'strength')!;
  const session = fixture.fitness.startWorkout(null); fixture.fitness.addSessionExercise(session.id, exercise.id);
  const sessionExercise = fixture.fitness.readSession(session.id).exercises[0];
  const app = await mount(createElement(screens.FitnessScreen, { initialSessionId: session.id }), fixture.db); t.after(app.unmount);
  return { ...fixture, app, session, sessionExercise };
}

test('Fitness set editor keeps exact input across failed detail read and successful Retry, then saves it', async (t) => {
  const { app, fitness, session, sessionExercise } = await workout(t);
  await app.press(`Log set 1 for ${sessionExercise.exerciseName}`); await app.change('Weight (kg) *', '12,345'); await app.change('Reps *', '8');
  await failAndRetry(app, 'fitness.readSession', observeDraft(app, ['Weight (kg) *', 'Reps *']), () => {
    fitness.addSet(sessionExercise.id, { ...blankSet(), weight: '1', reps: '2' });
  });
  await app.press('Save'); const sets = fitness.readSession(session.id).exercises[0].sets;
  assert.equal(sets.length, 2); assert.equal(sets[1].weightGrams, 12345); assert.equal(sets[1].reps, 8);
});

for (const kind of ['exercise', 'workout'] as const) {
  test(`Fitness ${kind} note keeps exact text across failure/Retry and saves its working draft`, async (t) => {
    const { app, fitness, session, sessionExercise } = await workout(t); const exerciseId = kind === 'exercise' ? sessionExercise.id : null;
    await app.press(kind === 'exercise' ? `Note for ${sessionExercise.exerciseName}` : 'Add workout note');
    await app.change('Note (optional)', 'Unsaved note\nwith exact whitespace  ');
    await failAndRetry(app, 'fitness.readOverview', observeDraft(app, ['Note (optional)']), () => fitness.saveNote(session.id, exerciseId, 'Source note changed'));
    await app.press('Save'); const detail = fitness.readSession(session.id);
    assert.equal(kind === 'exercise' ? detail.exercises[0].note : detail.note, 'Unsaved note\nwith exact whitespace');
  });
}

test('Fitness preserves an edited set when Retry removes its exercise; authoritative Save rejects it and retains draft', async (t) => {
  const { app, fitness, sessionExercise } = await workout(t); fitness.addSet(sessionExercise.id, { ...blankSet(), weight: '10', reps: '2' });
  await app.resume(); await app.press(`Edit ${sessionExercise.exerciseName} set 1`); await app.change('Weight (kg) *', '11');
  const check = observeDraft(app, ['Weight (kg) *', 'Reps *']);
  await failAndRetry(app, 'fitness.readSession', check, () => fitness.removeSessionExercise(sessionExercise.id));
  await app.press('Save'); check(); assert.ok(app.nodes().some((node) => node.kind === 'FormError' && node.textContent.includes('no longer available')));
  await app.press('Cancel'); assert.ok(!app.nodes().some((node) => node.kind === 'FormField' && node.props.label === 'Weight (kg) *'));
});

test('Work allocation validation uses current outstanding balance and preserves the rejected payment draft', async (t) => {
  const { db, work, finance } = await initialized(t); const client = work.createCounterparty('Client'); const id = work.create(fixed(client.id));
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'work', initialRecordId: id }), db); t.after(app.unmount);
  await app.press('Record payment'); await app.change('Allocation in reais for Original work', '500');
  const check = observeDraft(app, ['Allocation in reais for Original work', 'Payment date *']);
  await failAndRetry(app, 'work.readOverview', check, () => work.recordPayment({ counterpartyId: client.id, allocations: [{ workEntryId: id, amount: '800' }], paymentDate: today, categoryId: null }));
  await app.press('Confirm'); check(); assert.equal(finance.read().transactions.length, 1);
  assert.ok(app.nodes().some((node) => node.kind === 'FormError'));
});

test('Commitment payment validation rejects an occurrence resolved during Retry without discarding typed input', async (t) => {
  const { db, commitments, finance } = await initialized(t); const id = commitments.create({ ...commitmentDraft(null, undefined, today), title: 'Rent', amount: '300' });
  const occurrence = commitments.readHistory(id).outstanding.find((row) => row.dueDate === today)!;
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'commitments', initialRecordId: id, initialDueDate: today }), db); t.after(app.unmount);
  await app.press('Paid'); await app.change('Amount paid *', '321,09'); const check = observeDraft(app, ['Amount paid *', 'Payment date *']);
  await failAndRetry(app, 'commitments.read', check, () => commitments.skip(occurrence));
  await app.press('Confirm'); check(); assert.equal(finance.read().transactions.length, 0);
  assert.ok(app.nodes().some((node) => node.kind === 'FormError'));
});

test('Fitness note validation rejects a workout completed during Retry while keeping the unsaved text', async (t) => {
  const { app, fitness, session } = await workout(t); await app.press('Add workout note'); await app.change('Note (optional)', 'Keep this working note');
  const check = observeDraft(app, ['Note (optional)']);
  await failAndRetry(app, 'fitness.readOverview', check, () => fitness.finishWorkout(session.id));
  await app.press('Save'); check(); assert.equal(fitness.readSession(session.id).note, null);
  assert.ok(app.nodes().some((node) => node.kind === 'FormError' && node.textContent.includes('read-only')));
});

test('Finance Save remains valid during a read failure, and write validation errors preserve the working draft', async (t) => {
  const { db, work } = await initialized(t); const client = work.createCounterparty('Client'); const id = work.create(fixed(client.id));
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'work', initialRecordId: id }), db); t.after(app.unmount);
  await app.press('Edit'); await app.change('Fixed amount *', 'invalid'); runtime.fixture.failures.add('work.readOverview'); await app.resume();
  const check = observeDraft(app, ['Description *', 'Fixed amount *']); await app.press('Save'); check();
  await app.change('Fixed amount *', '800'); await app.press('Save');
  assert.equal(work.read().items.find((row) => row.entry.id === id)!.earnedMinor, 80000);
  assert.ok(!app.nodes().some((node) => node.kind === 'Modal'));
});

for (const feature of ['Finance', 'Fitness'] as const) {
  test(`${feature} initial read failure offers Retry and clears the error after success`, async (t) => {
    const { db } = await initialized(t);
    const screen = feature === 'Finance' ? createElement(screens.FinanceScreen, { initialView: 'work' }) : createElement(screens.FitnessScreen);
    const app = await mount(screen, db, [feature === 'Finance' ? 'work.readOverview' : 'fitness.readOverview']); t.after(app.unmount);
    assert.ok(app.find('FormError')); assert.ok(!app.nodes().some((node) => node.kind === 'ActivityIndicator'));
    runtime.fixture.failures.clear(); await app.press('Retry');
    assert.ok(!app.nodes().some((node) => node.kind === 'FormError')); await app.press(feature === 'Finance' ? 'Add work' : 'Start Empty Workout');
  });
}

test('Fitness failed detail read retains the coherent list/detail pair; ordinary refresh publishes new data', async (t) => {
  const { db, fitness } = await initialized(t); const session = fitness.startWorkout(null);
  let state!: ReturnType<typeof hooks.useFitness>;
  function Probe() { state = hooks.useFitness(session.id); return null; }
  const app = await mount(createElement(Probe), db); t.after(app.unmount);
  const before = { snapshot: state.snapshot, detail: state.detail };
  fitness.createExercise({ name: 'New surrounding exercise', measurementType: 'strength' }); runtime.fixture.failures.add('fitness.readSession');
  await app.resume(); assert.equal(state.snapshot, before.snapshot); assert.equal(state.detail, before.detail); assert.ok(state.error);
  runtime.fixture.failures.clear(); await act(() => state.reload());
  assert.notEqual(state.snapshot, before.snapshot); assert.ok(state.snapshot!.exercises.some((row) => row.name === 'New surrounding exercise')); assert.equal(state.error, null);
});

test('Finance does not show last loaded totals under a failed new period or another failed view', async (t) => {
  const { db, finance } = await initialized(t); finance.createTransaction({ ...transactionDraft(), amount: '100', description: 'Expense' });
  let state!: ReturnType<typeof hooks.useFinance>;
  function Probe() { state = hooks.useFinance(); return null; }
  const app = await mount(createElement(Probe), db); t.after(app.unmount); assert.ok(state.snapshot!.analytics);
  runtime.fixture.failures.add('finance.readDashboard'); await act(() => state.navigatePeriod(-1));
  assert.equal(state.snapshot!.analytics, null); assert.ok(state.error);
  runtime.fixture.failures.add('work.readOverview'); await act(() => state.setView('work')); assert.equal(state.snapshot, null);
  runtime.fixture.failures.clear(); await act(() => state.reload()); assert.ok(state.snapshot!.work); assert.equal(state.error, null);
});

test('Work History interaction fetches three separate bounded pages and reaches its terminal page', async (t) => {
  const { db, work, measure } = await initialized(t);
  const client = work.createCounterparty('Paged client');
  for (let i = 0; i < 45; i++) {
    const id = work.create({ ...fixed(client.id), description: `Settled entry ${i}` });
    work.recordPayment({ counterpartyId: client.id, allocations: [{ workEntryId: id, amount: '1000' }], paymentDate: today, categoryId: null });
  }
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'work' }), db); t.after(app.unmount);
  const pages: string[][] = [];
  for (const label of ['History', 'Load more history', 'Load more history']) {
    await act(() => {
      const result = measure(() => (app.find('FormButton', label).props.onPress as () => void)());
      assert.equal(result.count, 9, 'opening/loading a page performs one read, without a duplicate effect read');
      const entries = result.statements.find((row) => row.sql.startsWith('select') && row.sql.includes('"description"') && row.sql.includes('from "work_entries"'))!;
      assert.ok(entries.rows <= 20);
      pages.push(entries.params.filter((value): value is string => typeof value === 'string'));
      for (const query of result.statements.filter((row) => row.sql.includes('"description"'))) assert.ok(query.rows <= 20);
    });
  }
  assert.deepEqual(pages.map((ids) => ids.length), [20, 20, 5]);
  assert.equal(new Set(pages.flat()).size, 45);
  assert.ok(!app.nodes().some((node) => node.kind === 'FormButton' && node.props.label === 'Load more history'));
});

test('Fitness History loads older summaries incrementally and retains loaded rows on a page failure', async (t) => {
  const { db, fitness, measure } = await initialized(t);
  for (let i = 0; i < 45; i++) fitness.finishWorkout(fitness.startWorkout().id);
  let state!: ReturnType<typeof hooks.useFitness>;
  function Probe() { state = hooks.useFitness(); return null; }
  const app = await mount(createElement(Probe), db); t.after(app.unmount);
  assert.equal(state.snapshot!.history.length, 20);
  await act(() => {
    const page = measure(() => state.loadMoreHistory());
    assert.equal(page.count, 3); assert.equal(page.rows, 21);
  });
  assert.equal(state.snapshot!.history.length, 40);
  const before = state.snapshot;
  runtime.fixture.failures.add('fitness.readHistory');
  await act(() => state.loadMoreHistory()); assert.equal(state.snapshot, before); assert.ok(state.error);
  runtime.fixture.failures.clear();
  await act(() => state.loadMoreHistory());
  assert.equal(state.snapshot!.history.length, 45); assert.equal(state.snapshot!.hasMoreHistory, false);
  assert.equal(new Set(state.snapshot!.history.map((row) => row.id)).size, 45); assert.equal(state.error, null);
});

test('Fitness routine detail failure retains the coherent overview, routine details and workout editor', async (t) => {
  const { db, fitness } = await initialized(t);
  fitness.createRoutine({ name: 'Original routine', exercises: [] });
  const session = fitness.startWorkout();
  let state!: ReturnType<typeof hooks.useFitness>;
  function Probe() { state = hooks.useFitness(session.id, true); return null; }
  const app = await mount(createElement(Probe), db); t.after(app.unmount);
  const before = { snapshot: state.snapshot, detail: state.detail, routines: state.routines };
  fitness.createRoutine({ name: 'New routine', exercises: [] });
  runtime.fixture.failures.add('fitness.readRoutines');
  await app.resume();
  assert.equal(state.snapshot, before.snapshot); assert.equal(state.detail, before.detail); assert.equal(state.routines, before.routines);
  assert.ok(state.error);
  runtime.fixture.failures.clear(); await act(() => state.reload());
  assert.ok(state.routines.some((row) => row.name === 'New routine')); assert.equal(state.error, null);
});

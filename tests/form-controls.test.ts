/// <reference types="node" />

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { createElement } from 'react';

import { selectionMenuLayout, selectionOverlayReducer, submitInlineName, type SelectionOverlayState } from '../src/components/form-selection';
import { seedDefaultCategories } from '../src/database/seed';
import { createCommitmentDataAccess } from '../src/features/finance/commitments/data';
import { commitmentDraft, validateCommitmentDraft } from '../src/features/finance/commitments/form';
import { createFinanceDataAccess } from '../src/features/finance/data';
import { financeError } from '../src/features/finance/errors';
import { changeTransactionType, financeCategoryName, transactionDraft } from '../src/features/finance/form';
import { commitmentTypeOptions, createFinanceCategorySelection, financeCategoryOptions, transactionTypeOptions } from '../src/features/finance/form-options';
import { seedFinanceCategories } from '../src/features/finance/seed';
import { createTaskDataAccess } from '../src/features/tasks/data';
import { taskDraft, userError } from '../src/features/tasks/form';
import { createTaskCategorySelection, taskCategoryOptions, taskPriorityOptions } from '../src/features/tasks/form-options';
import { pickerValue } from '../src/utils/calendar';
import { bundledMigrations, database } from './helpers/database';
import { controls, renderControl, selection } from './helpers/form-components';

const today = '2026-10-03';
async function initialized() {
  const { sqlite, db } = database();
  await migrate(db, bundledMigrations);
  seedDefaultCategories(db, 1000); seedFinanceCategories(db, 1000);
  const now = () => pickerValue(today).getTime();
  return { sqlite, db, finance: createFinanceDataAccess(db, randomUUID, now), tasks: createTaskDataAccess(db, randomUUID, now), commitments: createCommitmentDataAccess(db, randomUUID, now) };
}

test('transaction segments expose Expense/Income and switching still clears incompatible categories', async (t) => {
  const { sqlite, finance } = await initialized(); t.after(() => sqlite.close());
  const categories = finance.read().categories;
  const salary = categories.find((category) => category.name === 'Salary')!;
  let draft = { ...transactionDraft(), type: 'income' as const, categoryId: salary.id } as ReturnType<typeof transactionDraft>;
  const result = renderControl(() => controls.SegmentedControl({ label: 'Type *', value: draft.type, options: transactionTypeOptions,
    onChange: (type) => { draft = changeTransactionType(draft, type, categories); } }));
  assert.match(result.markup, /role="radiogroup"/);
  assert.match(result.markup, /aria-label="Type \*: Income"[^>]*aria-checked="true"|aria-checked="true"[^>]*aria-label="Type \*: Income"/);
  assert.ok(result.markup.includes('Income ✓'));
  result.elements.find((element) => element.props.accessibilityLabel === 'Type *: Expense')!.props.onPress!();
  assert.equal(draft.type, 'expense'); assert.equal(draft.categoryId, null);
  assert.deepEqual(financeCategoryOptions(categories, draft.type).slice(1).map((option) => option.value), categories.filter((category) => category.type === 'expense' && category.deletedAt === null).map((category) => category.id));
});

test('commitment segments retain three distinct kinds and their installment validation', () => {
  assert.deepEqual(commitmentTypeOptions.map((option) => option.label), ['Bill', 'Subscription', 'Installment']);
  let draft = { ...commitmentDraft(null, undefined, today), title: 'Bill', amount: '180,00' };
  const result = renderControl(() => controls.SegmentedControl({ label: 'Type *', value: draft.kind, options: commitmentTypeOptions, onChange: (kind) => { draft = { ...draft, kind }; } }));
  for (const option of commitmentTypeOptions) {
    result.elements.find((element) => element.props.accessibilityLabel === `Type *: ${option.label}`)!.props.onPress!();
    assert.equal(draft.kind, option.value);
    if (option.value === 'installment') assert.throws(() => validateCommitmentDraft(draft), /installment/i);
    else assert.equal(validateCommitmentDraft(draft).kind, option.value);
  }
  const locked = renderControl(() => controls.SegmentedControl({ label: 'Type *', value: 'bill', options: commitmentTypeOptions, onChange: () => {}, disabled: true }));
  assert.equal(locked.elements.filter((element) => element.props.accessibilityLabel?.startsWith('Type *:') && element.props.disabled).length, 3);
});

test('Finance dropdown choices are active and direction-specific while archived selections keep their historical identity', async (t) => {
  const { sqlite, finance, commitments } = await initialized(); t.after(() => sqlite.close());
  const archived = finance.createCategory('Past pets', 'expense');
  const id = commitments.create({ ...commitmentDraft(null, undefined, today), title: 'Vet plan', amount: '180', categoryId: archived.id });
  finance.deleteCategory(archived.id);
  const categories = finance.read().categories;
  for (const type of ['expense', 'income'] as const) {
    const options = financeCategoryOptions(categories, type);
    assert.deepEqual(options[0], { value: null, label: 'No category' });
    assert.ok(options.every((option) => option.value === null || categories.some((category) => category.id === option.value && category.type === type && category.deletedAt === null)));
    assert.ok(!options.some((option) => option.value === archived.id));
  }
  const current = commitments.read().items.find((item) => item.commitment.id === id)!;
  assert.equal(financeCategoryName({ type: 'expense', categoryId: current.commitment.categoryId }, categories), 'Past pets');
  commitments.edit(id, { ...commitmentDraft(current.commitment, current.schedule), title: 'Updated vet plan' });
  assert.equal(commitments.read().items.find((item) => item.commitment.id === id)!.commitment.categoryId, archived.id);
});

test('dropdown choices close before changing a value and expose selected and No category states', () => {
  const events: string[] = [];
  let selected: string | null = 'food';
  const result = renderControl(() => controls.SelectionMenu({ label: 'Category', value: selected,
    options: [{ value: null, label: 'No category' }, { value: 'food', label: 'Food' }],
    onClose: () => { events.push('close'); }, onChange: (value) => { events.push('change'); selected = value; } }));
  assert.match(result.markup, /aria-checked="true"/); assert.ok(result.markup.includes('✓'));
  result.elements.find((element) => element.props.label === 'No category')!.props.onPress!();
  assert.equal(selected, null); assert.deepEqual(events, ['close', 'change']);
});

test('selector triggers announce their label, historical value and expanded/collapsed state', () => {
  for (const expanded of [true, false]) {
    const result = renderControl(() => controls.FormSelect({ label: 'Category', value: 'Pets (archived)', expanded, onPress: () => {} }));
    assert.match(result.markup, /role="combobox"/);
    assert.match(result.markup, /aria-label="Category"/);
    assert.match(result.markup, /aria-valuetext="Pets \(archived\)"/);
    assert.ok(result.markup.includes(`aria-expanded="${expanded}"`));
  }
});

for (const domain of ['task', 'expense', 'income', 'commitment'] as const) test(`${domain} dropdown creates inline, refreshes, selects and closes without another type prompt`, async (t) => {
  const { sqlite, finance, tasks, commitments } = await initialized(); t.after(() => sqlite.close());
  let categoryId: string | null = null;
  let surface: SelectionOverlayState<string, string> = { menu: 'category', inline: null };
  const type = domain === 'income' ? 'income' : 'expense';
  const options = domain === 'task' ? taskCategoryOptions(tasks.read().categories) : financeCategoryOptions(finance.read().categories, type);
  const complete = () => {
    assert.notEqual(categoryId, null, 'select the persisted option before closing');
    surface = selectionOverlayReducer(surface, { type: 'close' });
  };
  const action = { label: '+ New category', title: domain === 'task' ? 'New task category' : `New ${type} category`,
    render: (callbacks: Parameters<typeof controls.InlineNameForm>[0]) => controls.InlineNameForm(callbacks) };
  const result = renderControl(() => controls.SelectionMenu({ label: 'Category', value: categoryId, options, onChange: (value) => { categoryId = value; },
    onClose: () => { assert.fail('entering inline creation must keep the same menu open'); },
    action: { ...action, render: () => null }, onInlineAction: (chosen) => { surface = selectionOverlayReducer(surface, { type: 'inline', content: chosen.title }); } }));
  assert.equal(result.elements.filter((element) => element.props.label).at(-1)!.props.label, '+ New category');
  result.elements.find((element) => element.props.label === '+ New category')!.props.onPress!();
  assert.equal(surface.menu, 'category'); assert.equal(surface.inline, action.title);
  const select = (id: string) => { categoryId = id; };
  const submit = (name: string, finish: () => void) => domain === 'task' ? createTaskCategorySelection(name, tasks.createCategory, select, finish)
    : createFinanceCategorySelection(name, type, finance.createCategory, select, finish);
  const inline = renderControl(() => action.render({ title: action.title, onCancel: () => {}, onComplete: complete, onSize: () => {}, onSubmit: submit, formatError: (cause) => financeError(cause, 'Unable to create category') }));
  assert.ok(inline.markup.includes('Name *'));
  assert.match(inline.markup, new RegExp(`aria-label="${action.title} name, required"`));
  assert.equal((inline.markup.match(/<input\b/g) ?? []).length, 1);
  assert.doesNotMatch(inline.markup, /radiogroup|combobox/, 'quick creation asks only for a name');
  assert.equal(submitInlineName('New pets', submit, complete, (cause) => financeError(cause, 'Unable to create category')), null);
  const refreshed = domain === 'task' ? taskCategoryOptions(tasks.read().categories) : financeCategoryOptions(finance.read().categories, type);
  assert.ok(refreshed.some((option) => option.value === categoryId)); assert.deepEqual(surface, { menu: null, inline: null });
  if (domain === 'task') {
    const id = tasks.createTask({ ...taskDraft(), title: 'Task with new category', categoryId });
    assert.equal(tasks.read().tasks.find((task) => task.id === id)!.categoryId, categoryId);
  } else if (domain === 'commitment') {
    assert.equal(finance.read().categories.find((category) => category.id === categoryId)!.type, 'expense');
    const id = commitments.create({ ...commitmentDraft(null, undefined, today), title: 'Commitment with new category', amount: '180', categoryId });
    assert.equal(commitments.read().items.find((item) => item.commitment.id === id)!.commitment.categoryId, categoryId);
  } else {
    assert.equal(finance.read().categories.find((category) => category.id === categoryId)!.type, type);
    const id = finance.createTransaction({ ...transactionDraft(null, pickerValue(today)), type, amount: '20', description: 'Transaction with new category', categoryId });
    assert.equal(finance.read().transactions.find((transaction) => transaction.id === id)!.categoryId, categoryId);
  }
});

test('domain validation errors keep inline creation and the previous selection; retry succeeds', async (t) => {
  const { sqlite, finance, tasks } = await initialized(); t.after(() => sqlite.close());
  for (const domain of ['task', 'expense', 'income', 'commitment'] as const) {
    let categoryId = 'retained';
    const surface: SelectionOverlayState<string, { name: string }> = { menu: 'category', inline: { name: '   ' } };
    let state = surface;
    const select = (id: string) => { categoryId = id; };
    const close = () => { state = selectionOverlayReducer(state, { type: 'close' }); };
    const submit = (name: string, complete: () => void) => domain === 'task' ? createTaskCategorySelection(name, tasks.createCategory, select, complete)
      : createFinanceCategorySelection(name, domain === 'income' ? 'income' : 'expense', finance.createCategory, select, complete);
    const formatError = (cause: unknown) => domain === 'task' ? userError(cause, 'Unable to create category') : financeError(cause, 'Unable to create category');
    const error = submitInlineName(surface.inline!.name, submit, close, formatError);
    assert.match(error!, /name/i);
    assert.equal(categoryId, 'retained'); assert.equal(state, surface); assert.equal(state.inline!.name, '   ');
    const name = `Retry ${domain}`;
    assert.equal(submitInlineName(name, submit, close, formatError), null);
    assert.notEqual(categoryId, 'retained'); assert.equal(state.menu, null);
    // Existing duplicate-name validation also leaves the same form available for correction.
    state = { menu: 'category', inline: { name } };
    const createdId = categoryId;
    assert.ok(submitInlineName(name, submit, close, formatError));
    assert.equal(categoryId, createdId); assert.equal(state.inline!.name, name);
  }
});

for (const domain of ['task', 'transaction', 'commitment']) test(`${domain} inline Cancel keeps selection and options; outside/Back discards without saving`, () => {
  const previous = 'previous-category';
  const menu = { id: domain, categoryId: previous };
  let state: SelectionOverlayState<typeof menu, { name: string; error: string | null }> = { menu, inline: { name: 'Unsaved', error: 'Try another name' } };
  const result = renderControl(() => controls.InlineNameForm({ title: 'New category', onSize: () => {},
    onCancel: () => { state = selectionOverlayReducer(state, { type: 'cancel-inline' }); },
    onSubmit: () => { assert.fail('Cancel must never save'); }, onComplete: () => {}, formatError: () => 'Error' }));
  result.elements.find((element) => element.props.label === 'Cancel')!.props.onPress!();
  assert.equal(state.menu, menu); assert.equal(state.menu!.categoryId, previous); assert.equal(state.inline, null);
  state = selectionOverlayReducer(state, { type: 'inline', content: { name: '', error: null } });
  assert.deepEqual(state.inline, { name: '', error: null }, 'returning to creation starts clean');
  state = selectionOverlayReducer(state, { type: 'close' });
  assert.deepEqual(state, { menu: null, inline: null }); assert.equal(menu.categoryId, previous);
  state = selectionOverlayReducer<typeof menu, { name: string; error: string | null }>(state, { type: 'open', menu });
  assert.equal(state.inline, null, 'reopening always shows options');
});

test('opening another selector replaces the current menu and discards its inline action', () => {
  const state = selectionOverlayReducer({ menu: 'category', inline: 'Unsaved name' }, { type: 'open', menu: 'priority' });
  assert.deepEqual(state, { menu: 'priority', inline: null });
  assert.deepEqual(selectionOverlayReducer({ menu: null, inline: null }, { type: 'inline', content: 'orphan' }), { menu: null, inline: null });
});

test('options and creation use one absolute overlay; its outside action dismisses without submitting', () => {
  const layout = selectionMenuLayout({ x: 16, y: 500, width: 288, height: 48 }, { x: 0, y: 0, width: 320, height: 600 }, 190)!;
  const props = { label: 'Category', content: 'Original options', layout, onHeadingHeight: () => {}, onOptionsHeight: () => {} };
  const options = renderControl(() => selection.SelectionOverlay({ ...props, inline: null, onClose: () => {} }));
  assert.equal(options.elements[0].props.style?.position, 'absolute', 'the overlay cannot push sibling fields');
  assert.match(options.markup, /role="dialog"/); assert.match(options.markup, /aria-modal="true"/);
  assert.match(options.markup, /Original options/);
  let state: SelectionOverlayState<string, string> = { menu: 'category', inline: 'Unsaved' };
  const creation = renderControl(() => selection.SelectionOverlay({ ...props,
    onClose: () => { state = selectionOverlayReducer(state, { type: 'close' }); },
    inline: { title: 'New expense category', content: createElement(controls.InlineNameForm, { title: 'New expense category', onCancel: () => {}, onComplete: () => {}, onSize: () => {},
      onSubmit: () => { assert.fail('outside dismissal must not submit'); }, formatError: () => 'Error' }) } }));
  assert.equal(creation.elements[0].props.style?.position, 'absolute');
  assert.match(creation.markup, /aria-label="New expense category"/);
  assert.doesNotMatch(creation.markup, /Original options/);
  assert.match(creation.markup, /Name \*/); assert.match(creation.markup, /Cancel/); assert.match(creation.markup, /Create/);
  creation.elements.find((element) => element.props.accessibilityLabel === 'Dismiss new expense category without saving')!.props.onPress!();
  assert.deepEqual(state, { menu: null, inline: null });
});

test('Task category/priority choices remain independent and selected values persist', async (t) => {
  const { sqlite, tasks, finance } = await initialized(); t.after(() => sqlite.close());
  const categories = tasks.read().categories;
  assert.deepEqual(taskPriorityOptions.map((option) => option.label), ['None', 'Low', 'Medium', 'High']);
  const options = taskCategoryOptions(categories);
  assert.deepEqual(options[0], { value: null, label: 'No category' });
  assert.ok(!options.some((option) => finance.read().categories.some((category) => category.id === option.value)));
  let draft = { ...taskDraft(), title: 'Selected task' };
  const category = renderControl(() => controls.SelectionMenu({ label: 'Category', value: draft.categoryId, options, onClose: () => {}, onChange: (value) => { draft = { ...draft, categoryId: value }; } }));
  category.elements.find((element) => element.props.label === categories[0].name)!.props.onPress!();
  const priority = renderControl(() => controls.SelectionMenu({ label: 'Priority', value: draft.priority, options: taskPriorityOptions, onClose: () => {}, onChange: (value) => { draft = { ...draft, priority: value }; } }));
  priority.elements.find((element) => element.props.label === 'High')!.props.onPress!();
  const id = tasks.createTask(draft);
  const saved = tasks.read().tasks.find((task) => task.id === id)!;
  assert.equal(saved.categoryId, categories[0].id); assert.equal(saved.priority, 'high');
});

test('menu measurements account for modal origin, current scroll coordinates and bottom-edge placement', () => {
  const host = { x: 100, y: 80, width: 320, height: 600 };
  const below = selectionMenuLayout({ x: 116, y: 180, width: 288, height: 48 }, host, 200)!;
  assert.equal(below.placement, 'below'); assert.equal(below.left, 16);
  const above = selectionMenuLayout({ x: 116, y: 600, width: 288, height: 48 }, host, 200)!;
  assert.equal(above.placement, 'above');
  assert.ok(above.top + above.height < 600 - host.y);
  const afterScroll = selectionMenuLayout({ x: 116, y: 300, width: 288, height: 48 }, host, 200)!;
  assert.notEqual(afterScroll.top, above.top);
  assert.equal(selectionMenuLayout({ x: 116, y: 800, width: 288, height: 48 }, host, 200), null, 'an offscreen trigger cannot leave a stale menu');
});

test('long menus and accessibility-sized content stay within narrow or resized usable bounds', () => {
  for (const width of [240, 320, 768]) for (const height of [240, 500, 1000]) {
    const host = { x: 40, y: 120, width, height };
    const layout = selectionMenuLayout({ x: 30, y: host.y + height - 60, width: 800, height: 48 }, host, 1200)!;
    assert.ok(layout.left >= 0 && layout.top >= 0);
    assert.ok(layout.left + layout.width <= host.width && layout.top + layout.height <= host.height);
  }
});

test('inline content resizes in the same anchor and stays above the keyboard when its trigger is covered', () => {
  const anchor = { x: 116, y: 660, width: 288, height: 48 };
  const fullHost = { x: 100, y: 80, width: 320, height: 720 };
  const options = selectionMenuLayout(anchor, fullHost, 440)!;
  const creation = selectionMenuLayout(anchor, fullHost, 190, true)!;
  assert.equal(options.left, creation.left); assert.equal(options.width, creation.width);
  assert.equal(creation.placement, 'above'); assert.equal(creation.height, 190);
  for (const height of [240, 300, 400]) {
    const keyboardHost = { ...fullHost, height };
    assert.equal(selectionMenuLayout(anchor, keyboardHost, 190), null);
    for (const desired of [190, 500]) {
      const layout = selectionMenuLayout(anchor, keyboardHost, desired, true)!;
      assert.equal(layout.placement, 'above');
      assert.ok(layout.top >= 8 && layout.left >= 8);
      assert.ok(layout.top + layout.height <= height - 8);
      assert.ok(layout.left + layout.width <= keyboardHost.width - 8);
    }
    // Cancel can show options during keyboard dismissal without losing the menu.
    assert.ok(selectionMenuLayout(anchor, keyboardHost, 440, true));
  }
  const middle = selectionMenuLayout({ ...anchor, y: 180 }, { ...fullHost, height: 240 }, 190, true)!;
  assert.equal(middle.height, 190, 'use the available viewport when neither side fits the name and actions');
  assert.ok(middle.top >= 8 && middle.top + middle.height <= 232);
});

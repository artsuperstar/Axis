/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { test, type TestContext } from 'node:test';
import { act, createElement, useState } from 'react';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { seedDefaultCategories } from '../src/database/seed';
import { createTaskDataAccess } from '../src/features/tasks/data';
import { latestRecurrence } from '../src/features/tasks/recurrence';
import type { TaskDraft } from '../src/features/tasks/types';
import { pickerValue } from '../src/utils/calendar';
import { bundledMigrations, database } from './helpers/database';
import { mount, runtime } from './helpers/refresh-lifecycle';

const { TaskEditor } = createRequire(import.meta.url)('../src/features/tasks/components/task-editor') as typeof import('../src/features/tasks/components/task-editor');
type App = Awaited<ReturnType<typeof mount>>;
async function fixture(t: TestContext) {
  const platform = (runtime.native as { Platform: { OS: string } }).Platform;
  const previous = platform.OS; platform.OS = 'ios'; t.after(() => { platform.OS = previous; });
  const now = () => pickerValue('2026-10-19', '12:00').getTime(); t.mock.method(Date, 'now', now);
  const f = database(); t.after(() => f.sqlite.close()); await migrate(f.db, bundledMigrations); seedDefaultCategories(f.db);
  const access = createTaskDataAccess(f.db, randomUUID, now); const saved: TaskDraft[] = []; let dismissed = 0;
  function Host() {
    const [categories, setCategories] = useState(() => access.read().categories);
    return createElement(TaskEditor, { task: null, recurrence: null, categories,
      onSave(value) { access.createTask(value); saved.push(value); }, onDismiss() { dismissed++; },
      onCreateCategory(name) { const category = access.createCategory(name); setCategories(access.read().categories); return category; } });
  }
  const app = await mount(createElement(Host), f.db); t.after(app.unmount);
  return { ...f, access, app, saved, dismissed: () => dismissed };
}
async function choose(app: App, label: string, value: unknown) {
  await act(() => (app.find('SelectField', label).props.onChange as (value: unknown) => void)(value));
}
const flatten = (style: unknown) => Object.assign({}, ...[style].flat(Infinity));

for (const scheme of ['light', 'dark']) test(`${scheme}: New Task owns four v2 sections, clear required title and explicit Save/Cancel`, async (t) => {
  t.mock.method(runtime.native as { useColorScheme: () => string }, 'useColorScheme', () => scheme);
  const { app } = await fixture(t);
  assert.deepEqual(app.nodes().filter((node) => String(node.props?.testID).startsWith('editor-section-')).map((node) => node.props.testID),
    ['editor-section-task', 'editor-section-schedule', 'editor-section-organization', 'editor-section-recurrence']);
  assert.equal(app.find('FormField', 'Title *').props.accessibilityLabel, 'Title, required');
  assert.equal(app.find('FormField', 'Description').props.multiline, true); assert.equal(app.find('FormField', 'Description').props.textAlignVertical, 'top');
  assert.equal(app.find('FormButton', 'Cancel').props.leadingIcon, 'back'); assert.equal(app.find('FormButton', 'Save').props.variant, 'primary');
  assert.equal(app.find('FormButton', 'Save').props.appearance, 'v2');
  assert.ok(!app.nodes().some((node) => node.props?.label === 'Repeats'));
  assert.equal(app.find('FormButton', 'Add recurrence').props.trailingIcon, 'forward');
});

test('Title remains required; optional description/date stay empty; Save creates once and preserves errors/draft', async (t) => {
  const f = await fixture(t); await f.app.press('Save'); assert.equal(f.saved.length, 0);
  assert.ok(f.app.find('FormError')); assert.equal(f.dismissed(), 0);
  await f.app.change('Title *', '  Write a letter  '); await f.app.press('Save'); await f.app.press('Save');
  assert.equal(f.saved.length, 1); assert.equal(f.dismissed(), 1);
  const task = f.access.read().tasks[0]; assert.equal(task.title, 'Write a letter'); assert.equal(task.description, null); assert.equal(task.date, null);
});

test('Cancel discards the unsaved form without persisting a task or introducing autosave', async (t) => {
  const f = await fixture(t); await f.app.change('Title *', 'Unsaved title'); await f.app.change('Description', 'Unsaved notes');
  await f.app.press('Cancel'); assert.equal(f.dismissed(), 1); assert.equal(f.access.read().tasks.length, 0);
});

test('native schedule keeps Time disabled until Date, preserves local values and clears Time with Date', async (t) => {
  const f = await fixture(t); const { app } = f;
  assert.equal(app.find('FormSelect', 'Time').props.disabled, true); assert.ok(String(app.find('FormSelect', 'Time').props.accessibilityHint).includes('date'));
  await act(() => (app.find('FormSelect', 'Date').props.onPress as () => void)());
  await act(() => (app.find('DateTimePicker').props.onValueChange as (event: unknown, value: Date) => void)({}, pickerValue('2026-10-25')));
  await app.press('Back from date picker'); assert.equal(app.find('FormSelect', 'Time').props.disabled, false);
  await act(() => (app.find('FormSelect', 'Time').props.onPress as () => void)());
  await act(() => (app.find('DateTimePicker').props.onValueChange as (event: unknown, value: Date) => void)({}, pickerValue('2026-10-25', '14:30')));
  await app.press('Back from time picker'); assert.equal(app.find('FormSelect', 'Time').props.value, '14:30');
  await app.press('Clear date'); assert.equal(app.find('FormSelect', 'Time').props.disabled, true);
});

test('Priority, Category, No category and dropdown creation still supply source-owned persisted values', async (t) => {
  const f = await fixture(t); const { app } = f; await app.change('Title *', 'Organized task');
  await choose(app, 'Priority', 'high'); await choose(app, 'Category', f.access.read().categories[0].id); await choose(app, 'Category', null);
  assert.equal(app.find('SelectField', 'Category').props.value, null);
  const action = app.find('SelectField', 'Category').props.action as { render: (controls: object) => { props: { onSubmit: (name: string, complete: () => void) => void } } };
  let closed = false; const form = action.render({ title: 'New task category', onCancel() {}, onComplete() {}, onSize() {} });
  await act(() => form.props.onSubmit('Letters', () => { closed = true; })); assert.equal(closed, true);
  const category = f.access.read().categories.find((row) => row.name === 'Letters')!;
  assert.equal(app.find('SelectField', 'Category').props.value, category.id);
  assert.ok((app.find('SelectField', 'Category').props.options as { value: string }[]).some((row) => row.value === category.id));
  await app.press('Save'); assert.equal(f.saved[0].priority, 'high'); assert.equal(f.access.read().tasks[0].categoryId, category.id);
});

test('recurrence opens its existing surface, returns a concise editable summary and saves the same schedule', async (t) => {
  const f = await fixture(t); const { app } = f; await app.change('Title *', 'Weekly letter'); await app.change('Description', 'Keep this draft');
  const modal = app.find('Modal'); await app.press('Add recurrence'); await choose(app, 'Repeats', 'weekly'); await app.change('Every', '2');
  await app.press('Back to task editor'); assert.equal(app.find('Modal'), modal);
  const action = app.find('FormButton', 'Edit recurrence'); assert.ok(String(action.props.label).includes('Every 2 weeks'));
  assert.equal(action.props.leadingIcon, 'repeat'); assert.equal(app.find('FormField', 'Title *').props.autoFocus, false);
  assert.equal(app.find('FormField', 'Description').props.value, 'Keep this draft');
  await app.press('Edit recurrence'); assert.equal(app.find('FormField', 'Every').props.value, '2'); await app.press('Back to task editor');
  await app.press('Save'); const task = f.access.read().tasks[0]; assert.equal(latestRecurrence(f.access.read().recurrences, task.id)!.interval, 2);
});

for (const [width, fontScale, row] of [[272, 1, false], [342, 1, true], [382, 1, true], [342, 2, false]] as const) test(`measured schedule width ${width}/font ${fontScale} uses a readable ${row ? 'row' : 'stack'}`, async (t) => {
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width: width + 48, height: 844, scale: 1, fontScale }));
  const { app } = await fixture(t); let container = app.find('FormSelect', 'Date').parentNode!;
  while (!container.props?.onLayout) container = container.parentNode!;
  await act(() => (container.props.onLayout as (event: unknown) => void)({ nativeEvent: { layout: { width } } }));
  assert.equal(flatten(container.props.style).flexDirection === 'row', row);
  assert.equal(app.find('FormButton', 'Save').props.disabled, undefined); assert.ok(!app.nodes().some((node) => node.props?.numberOfLines === 1));
});

const sectionNames = (app: App) => app.nodes().filter((node) => String(node.props?.testID).startsWith('editor-section-')).map((node) => node.props.testID);
async function setNativeDate(app: App, label: string, value: string) {
  await act(() => (app.find('FormSelect', label).props.onPress as () => void)());
  await act(() => (app.find('DateTimePicker').props.onValueChange as (event: unknown, date: Date) => void)({}, pickerValue(value)));
  await app.press(`Back from ${label.toLowerCase()} picker`);
}

for (const scheme of ['light', 'dark']) test(`${scheme}: recurrence reuses owned v2 sections and only exposes relevant controls`, async (t) => {
  t.mock.method(runtime.native as { useColorScheme: () => string }, 'useColorScheme', () => scheme);
  const { app } = await fixture(t); await app.press('Add recurrence');
  assert.deepEqual(sectionNames(app), ['editor-section-pattern', 'editor-section-summary']);
  assert.ok(app.container.textContent.includes('Does not repeat'));
  assert.equal(app.find('FormButton', 'Back to task editor').props.appearance, 'v2');
  await choose(app, 'Repeats', 'weekly');
  assert.deepEqual(sectionNames(app), ['editor-section-pattern', 'editor-section-repeat', 'editor-section-schedule', 'editor-section-ends', 'editor-section-summary']);
  for (const control of app.nodes().filter((node) => ['FormField', 'FormSelect', 'SelectField', 'FormWeekday'].includes(node.kind ?? ''))) assert.equal(control.props.appearance, 'v2');
  assert.equal(app.nodes().filter((node) => node.kind === 'FormWeekday').length, 7);
  await choose(app, 'Repeats', 'yearly');
  assert.ok(!sectionNames(app).includes('editor-section-repeat'));
  assert.ok(!app.nodes().some((node) => node.kind === 'FormWeekday' || node.props?.label === 'Every'));
  assert.equal(app.find('SelectField', 'Month').props.appearance, 'v2');
});

for (const [frequency, expected] of [['daily', 'Every 3 days'], ['weekly', 'Every 2 weeks on Mon, Wed & Sat'], ['monthly', 'Every 3 months on day 31'], ['yearly', 'Yearly on Oct 12']] as const) {
  test(`v2 ${frequency} retains its rule, native end date and helper summary until explicit parent Save`, async (t) => {
    const f = await fixture(t); const { app } = f; await app.change('Title *', 'Repeating task'); await setNativeDate(app, 'Date', '2026-10-19');
    await app.press('Add recurrence'); await choose(app, 'Repeats', frequency);
    if (frequency !== 'yearly') await app.change('Every', frequency === 'weekly' ? '2' : '3');
    if (frequency === 'weekly') for (const day of ['Wednesday', 'Saturday']) await act(() => (app.find('FormWeekday', day).props.onPress as () => void)());
    if (frequency === 'yearly') await choose(app, 'Month', 10);
    if (frequency === 'monthly' || frequency === 'yearly') await app.change('Day', frequency === 'yearly' ? '12' : '31');
    assert.ok(app.container.textContent.includes(expected));
    assert.equal(app.find('SelectField', 'Ends').props.value, 'never');
    assert.ok(!app.nodes().some((node) => node.props?.label === 'End date'));
    await choose(app, 'Ends', 'date'); await setNativeDate(app, 'End date', '2026-12-31');
    await choose(app, 'Ends', 'never'); assert.ok(!app.nodes().some((node) => node.props?.label === 'End date'));
    await choose(app, 'Ends', 'date'); await setNativeDate(app, 'End date', '2026-12-31');
    assert.equal(f.access.read().tasks.length, 0);
    await app.press('Back to task editor'); assert.ok(String(app.find('FormButton', 'Edit recurrence').props.label).includes(expected));
    assert.equal(f.access.read().tasks.length, 0); await app.press('Save');
    const task = f.access.read().tasks[0]; const rule = latestRecurrence(f.access.read().recurrences, task.id)!;
    assert.equal(rule.frequency, frequency); assert.equal(rule.endDate, '2026-12-31');
    assert.equal(rule.interval, frequency === 'yearly' ? 1 : frequency === 'weekly' ? 2 : 3);
    if (frequency === 'weekly') assert.equal(rule.weekdayMask, 1 | 4 | 32);
    if (frequency === 'monthly') assert.equal(rule.monthDay, 31);
    if (frequency === 'yearly') { assert.equal(rule.month, 10); assert.equal(rule.monthDay, 12); }
  });
}

test('v2 recurrence Back/dismiss keeps the unsaved rule and every parent field; parent Cancel still discards it all', async (t) => {
  const f = await fixture(t); const { app } = f;
  await app.change('Title *', 'Draft title'); await app.change('Description', 'Draft description'); await setNativeDate(app, 'Date', '2026-10-25');
  const originalDateLabel = app.find('FormSelect', 'Date').props.value;
  await act(() => (app.find('FormSelect', 'Time').props.onPress as () => void)());
  await act(() => (app.find('DateTimePicker').props.onValueChange as (event: unknown, date: Date) => void)({}, pickerValue('2026-10-25', '18:30')));
  await app.press('Back from time picker'); await choose(app, 'Priority', 'high');
  const categoryId = f.access.read().categories[0].id; await choose(app, 'Category', categoryId);
  const modal = app.find('Modal'); await app.press('Add recurrence'); await choose(app, 'Repeats', 'daily'); await app.change('Every', '3');
  await app.press('Back to task editor'); await app.press('Edit recurrence'); assert.equal(app.find('FormField', 'Every').props.value, '3');
  await app.change('Every', '4'); await act(() => (modal.props.onRequestClose as () => void)());
  assert.equal(app.find('Modal'), modal); assert.equal(app.find('FormField', 'Title *').props.value, 'Draft title');
  assert.equal(app.find('FormField', 'Title *').props.autoFocus, false); assert.equal(app.find('FormField', 'Description').props.value, 'Draft description');
  assert.equal(app.find('FormSelect', 'Start date *').props.value, originalDateLabel);
  assert.equal(app.find('FormSelect', 'Time').props.value, '18:30'); assert.equal(app.find('SelectField', 'Priority').props.value, 'high');
  assert.equal(app.find('SelectField', 'Category').props.value, categoryId); assert.ok(String(app.find('FormButton', 'Edit recurrence').props.label).includes('Every 4 days'));
  await app.press('Edit recurrence'); await app.press('Back to task editor'); await app.press('Cancel');
  assert.equal(f.dismissed(), 1); assert.equal(f.access.read().tasks.length, 0); assert.equal(f.access.read().recurrences.length, 0);
});

for (const [width, fontScale, row] of [[320, 1, false], [390, 1, true], [430, 1, true], [320, 2, false]] as const) test(`v2 recurrence adapts measured Schedule and weekday controls at ${width}pt/font ${fontScale}`, async (t) => {
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width, height: 844, scale: 1, fontScale }));
  const { app } = await fixture(t); await app.press('Add recurrence'); await choose(app, 'Repeats', 'weekly');
  let container = app.find('FormSelect', 'Start date *').parentNode!; while (!container.props?.onLayout) container = container.parentNode!;
  await act(() => (container.props.onLayout as (event: unknown) => void)({ nativeEvent: { layout: { width: width - 48 } } }));
  assert.equal(flatten(container.props.style).flexDirection === 'row', row);
  const weekday = app.find('FormWeekday', 'Monday'); assert.equal(flatten(weekday.parentNode!.props.style).flexWrap, 'wrap');
  assert.ok(!app.nodes().some((node) => node.props?.numberOfLines === 1 || node.props?.allowFontScaling === false && node.kind !== 'Image'));
});

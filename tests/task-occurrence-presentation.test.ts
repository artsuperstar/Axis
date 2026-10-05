/// <reference types="node" />

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { test, type TestContext } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { createElement } from 'react';

import { seedDefaultCategories } from '../src/database/seed';
import { createCalendarDataAccess } from '../src/features/calendar/data';
import { createTaskDataAccess } from '../src/features/tasks/data';
import { taskDraft } from '../src/features/tasks/form';
import { taskRowPresentation } from '../src/features/tasks/presentation';
import { latestRecurrence, occurrenceRecurrence, recurrencePatternSummary } from '../src/features/tasks/recurrence';
import type { RecurrenceDraft, TaskOccurrence } from '../src/features/tasks/types';
import { dateLabel, pickerValue } from '../src/utils/calendar';
import { bundledMigrations, database } from './helpers/database';
import { mount } from './helpers/refresh-lifecycle';

// Use the existing client lifecycle harness: native boundaries are stubbed, actual Task components run.
const require = createRequire(import.meta.url);
const { TaskRow } = require('../src/features/tasks/components/task-row') as typeof import('../src/features/tasks/components/task-row');
const { OccurrenceHistory } = require('../src/features/tasks/components/occurrence-history') as typeof import('../src/features/tasks/components/occurrence-history');
const { RecurringTasks } = require('../src/features/tasks/components/recurring-tasks') as typeof import('../src/features/tasks/components/recurring-tasks');
const daily: RecurrenceDraft = { frequency: 'daily', interval: 1, weekdayMask: 1, monthDay: 1, month: 1, endDate: '' };

async function initialized(t: TestContext) {
  const fixture = database(); await migrate(fixture.db, bundledMigrations); seedDefaultCategories(fixture.db);
  t.after(() => fixture.sqlite.close());
  let time = pickerValue('2026-10-02', '12:00').getTime(); const now = () => time;
  const access = createTaskDataAccess(fixture.db, randomUUID, now);
  return { ...fixture, access, now, setDay: (day: string) => { time = pickerValue(day, '12:00').getTime(); },
    calendar: createCalendarDataAccess(fixture.db, randomUUID, now) };
}
async function edited(t: TestContext, original = daily, updated = { ...daily, interval: 3 }) {
  const f = await initialized(t); const categoryId = f.access.read().categories.find((row) => row.name === 'Work')!.id;
  const draft = { ...taskDraft(), title: 'Workout', date: '2026-10-02', time: '14:30', priority: 'high' as const, categoryId, recurrence: original };
  const id = f.access.createTask(draft); f.setDay('2026-10-05'); const before = f.access.read();
  const today = before.occurrences.find((row) => row.scheduledDate === '2026-10-05');
  const past = before.occurrences.find((row) => row.scheduledDate < '2026-10-05')!; f.access.setOccurrenceStatus(past.id, 'completed');
  f.access.editTask(id, { ...draft, recurrence: updated }); const snapshot = f.access.read();
  if (today) assert.equal(snapshot.occurrences.find((row) => row.scheduledDate === '2026-10-05')!.id, today.id);
  return { ...f, id, snapshot, draft, historical: f.access.readHistory(id).occurrences.find((row) => row.id === past.id)! };
}
type Fixture = Awaited<ReturnType<typeof edited>>;
async function row(t: TestContext, f: Fixture, occurrence: TaskOccurrence | null, task = f.snapshot.tasks[0]) {
  const app = await mount(createElement(TaskRow, { task, occurrence, recurrences: f.snapshot.recurrences, categories: f.snapshot.categories, now: f.now(),
    onEdit() {}, onComplete() {}, onDelete() {}, onSkip() {}, onHistory() {} }), f.db); t.after(app.unmount);
  const details = app.nodes().find((node) => node.kind === 'Pressable' && node.props.accessibilityRole === 'button')!;
  assert.ok(details); return { app, details, label: String(details.props.accessibilityLabel) };
}

test('today uses its original daily version, future uses every 3 days, and parent uses latest schedule', async (t) => {
  const f = await edited(t); const today = f.snapshot.occurrences.find((entry) => entry.scheduledDate === '2026-10-05')!;
  const future = f.snapshot.occurrences.find((entry) => entry.scheduledDate > '2026-10-05')!;
  for (const [occurrence, summary] of [[today, 'Every day'], [future, 'Every 3 days']] as const) {
    const { app, label } = await row(t, f, occurrence);
    assert.ok(app.nodes().some((node) => node.kind === 'ThemedText' && node.textContent === summary));
    assert.ok(label.includes(summary)); assert.equal(recurrencePatternSummary(occurrenceRecurrence(f.snapshot.recurrences, occurrence)!), summary);
    await app.unmount();
  }
  assert.equal(recurrencePatternSummary(latestRecurrence(f.snapshot.recurrences, f.id)!), 'Every 3 days');
  const parent = await mount(createElement(RecurringTasks, { tasks: f.snapshot.tasks, recurrences: f.snapshot.recurrences, visible: true,
    onClosed() {}, onDismiss() {}, onEdit() {}, onHistory() {} }), f.db); t.after(parent.unmount);
  assert.ok(parent.container.textContent.includes('Every 3 days')); assert.ok(!parent.container.textContent.includes('Every day'));
});

test('History shows original rule alongside completed outcome, with separately accessible dated controls', async (t) => {
  const f = await edited(t);
  const app = await mount(createElement(OccurrenceHistory, { task: f.snapshot.tasks[0], recurrences: f.snapshot.recurrences, categories: f.snapshot.categories,
    now: f.now(), readPage: () => f.access.readHistory(f.id), onStatus: f.access.setOccurrenceStatus, onDismiss() {} }), f.db); t.after(app.unmount);
  const entry = app.nodes().find((node) => node.kind === 'View' && String(node.props.accessibilityLabel ?? '').includes(`${dateLabel(f.historical.scheduledDate)} at 14:30`))!;
  assert.ok(entry); assert.equal(entry.props.accessible, true);
  assert.ok(entry.textContent.includes('Every day')); assert.ok(String(entry.props.accessibilityLabel).includes('Every day'));
  assert.ok(entry.textContent.includes('Completed')); assert.ok(!String(entry.props.accessibilityLabel).includes('Every 3 days'));
  const reopen = app.find('FormButton', `Reopen Workout on ${dateLabel(f.historical.scheduledDate)} at 14:30`);
  assert.notEqual(reopen.parentNode, entry, 'Controls remain outside the accessible metadata group');
  await app.press(String(reopen.props.accessibilityLabel));
  assert.equal(f.access.readHistory(f.id).occurrences.find((item) => item.id === f.historical.id)!.status, 'pending');
});

test('Calendar and Tasks agree on occurrence versions across the effective-tomorrow boundary', async (t) => {
  const f = await edited(t); const calendar = f.calendar.readRange({ from: '2026-10-02', to: '2026-10-15' }).filter((item) => item.source === 'task');
  for (const item of calendar) {
    const occurrence = f.snapshot.occurrences.find((entry) => entry.id === item.occurrenceId)!;
    const presentation = taskRowPresentation(f.snapshot.tasks[0], occurrence, f.snapshot.recurrences, f.snapshot.categories, f.now());
    assert.ok(item.secondary.includes(presentation.recurrence!));
    assert.equal(presentation.recurrence, occurrence.scheduledDate <= '2026-10-05' ? 'Every day' : 'Every 3 days');
  }
  assert.ok(calendar.some((item) => item.date === '2026-10-05')); assert.ok(calendar.some((item) => item.date > '2026-10-05'));
});

test('weekly history retains old weekdays while future occurrences and parent use new weekdays', async (t) => {
  const f = await edited(t, { ...daily, frequency: 'weekly', weekdayMask: 1 | 16 }, { ...daily, frequency: 'weekly', weekdayMask: 2 | 8, interval: 2 });
  const future = f.snapshot.occurrences.find((entry) => entry.scheduledDate > '2026-10-05')!;
  assert.equal(taskRowPresentation(f.snapshot.tasks[0], f.historical, f.snapshot.recurrences, f.snapshot.categories, f.now()).recurrence, 'Every Mon & Fri');
  const { label, app } = await row(t, f, future); assert.ok(label.includes('Every 2 weeks on Tue & Thu'));
  assert.ok(app.container.textContent.includes('Every 2 weeks on Tue & Thu'));
});

test('resolved retired future occurrences in History keep their retired version rather than latest', async (t) => {
  const f = await initialized(t); const draft = { ...taskDraft(), title: 'Early workout', date: '2026-10-02', recurrence: daily };
  const id = f.access.createTask(draft); const early = f.access.read().occurrences.find((entry) => entry.scheduledDate === '2026-10-04')!;
  f.access.setOccurrenceStatus(early.id, 'skipped'); f.access.editTask(id, { ...draft, recurrence: { ...daily, interval: 3 } });
  const snapshot = f.access.read(); const retired = f.access.readHistory(id).occurrences.find((entry) => entry.id === early.id)!;
  assert.notEqual(retired.deletedAt, null); assert.equal(recurrencePatternSummary(occurrenceRecurrence(snapshot.recurrences, retired)!), 'Every day');
  const app = await mount(createElement(OccurrenceHistory, { task: snapshot.tasks[0], categories: snapshot.categories, recurrences: snapshot.recurrences,
    now: f.now(), readPage: () => f.access.readHistory(id), onStatus: f.access.setOccurrenceStatus, onDismiss() {} }), f.db); t.after(app.unmount);
  const historical = app.nodes().find((node) => node.kind === 'View' && String(node.props.accessibilityLabel ?? '').includes('Previous schedule'))!;
  assert.ok(historical.textContent.includes('Every day')); assert.ok(String(historical.props.accessibilityLabel).includes('Skipped'));
  assert.ok(!app.nodes().some((node) => node.kind === 'FormButton' && String(node.props.accessibilityLabel).includes(dateLabel(retired.scheduledDate))));
});

test('History can resolve a soft-deleted recurrence version after repeated same-day schedule edits', async (t) => {
  const f = await initialized(t); const draft = { ...taskDraft(), title: 'Retired rule', date: '2026-10-02', recurrence: daily };
  const id = f.access.createTask(draft); f.access.editTask(id, { ...draft, recurrence: { ...daily, interval: 2 } });
  const occurrence = f.access.read().occurrences.find((entry) => entry.scheduledDate === '2026-10-04')!;
  f.access.setOccurrenceStatus(occurrence.id, 'completed'); f.access.editTask(id, { ...draft, recurrence: { ...daily, interval: 3 } });
  const snapshot = f.access.read(); const historical = f.access.readHistory(id).occurrences.find((entry) => entry.id === occurrence.id)!;
  const rule = occurrenceRecurrence(snapshot.recurrences, historical)!; assert.notEqual(rule.deletedAt, null);
  assert.equal(recurrencePatternSummary(rule), 'Every 2 days');
  const app = await mount(createElement(OccurrenceHistory, { task: snapshot.tasks[0], categories: snapshot.categories, recurrences: snapshot.recurrences,
    now: f.now(), readPage: () => f.access.readHistory(id), onStatus: f.access.setOccurrenceStatus, onDismiss() {} }), f.db); t.after(app.unmount);
  const entry = app.nodes().find((node) => node.kind === 'View' && String(node.props.accessibilityLabel ?? '').includes('Every 2 days'))!;
  assert.ok(entry.textContent.includes('Every 2 days')); assert.ok(entry.textContent.includes('Completed'));
});

test('one-time row announces title, description, date, time, priority, category and pending state with a separate edit hint', async (t) => {
  const f = await edited(t); const task = { ...f.snapshot.tasks[0], title: 'Submit report', description: 'Quarterly totals', date: '2026-10-05', time: '10:30', completedAt: null };
  const { label, details, app } = await row(t, f, null, task);
  for (const text of ['Submit report', 'Quarterly totals', dateLabel(task.date), '10:30', 'High priority', 'Work', 'Pending']) assert.ok(label.includes(text));
  assert.equal(details.props.accessible, true); assert.equal(details.props.accessibilityHint, 'Opens the task editor');
  assert.ok(!label.startsWith('Edit')); assert.ok(!label.includes('Every'));
  assert.deepEqual(app.find('Pressable', `Complete Submit report on ${dateLabel(task.date)} at 10:30`).props.accessibilityState, { checked: false });
});

for (const state of ['pending', 'completed', 'skipped', 'missed'] as const) {
  test(`recurring ${state} row announces its governing rule and exact occurrence date/time`, async (t) => {
    const f = await edited(t); const source = f.snapshot.occurrences.find((entry) => entry.scheduledDate === (state === 'missed' ? '2026-10-04' : '2026-10-05'))!;
    const occurrence = { ...source, status: state === 'missed' ? 'pending' as const : state };
    const { label, app } = await row(t, f, occurrence);
    for (const text of ['Workout', dateLabel(occurrence.scheduledDate), '14:30', 'High priority', 'Work', 'Every day', state[0].toUpperCase() + state.slice(1)]) assert.ok(label.includes(text));
    const checkbox = app.find('Pressable', `${state === 'completed' ? 'Reopen' : 'Complete'} Workout on ${dateLabel(occurrence.scheduledDate)} at 14:30`);
    assert.deepEqual(checkbox.props.accessibilityState, { checked: state === 'completed' }); assert.ok(!label.includes('Overdue'));
    if (state === 'skipped') assert.ok(app.find('FormButton', `Return to pending Workout on ${dateLabel(occurrence.scheduledDate)} at 14:30`));
  });
}

test('absent date/time, priority and category omit placeholders; deleted Task categories stay omitted', async (t) => {
  const f = await edited(t); const task = { ...f.snapshot.tasks[0], title: 'Undated task', description: null, priority: 'none' as const, categoryId: null, date: null, time: null };
  const { label, app } = await row(t, f, null, task); assert.equal(label, 'Undated task. Pending'); assert.ok(app.container.textContent.includes('No date'));
  await app.unmount();
  const category = f.snapshot.categories[0];
  const archived = taskRowPresentation({ ...task, categoryId: category.id }, null, [], [{ ...category, deletedAt: f.now() }], f.now());
  assert.equal(archived.accessibilityLabel, 'Undated task. Pending');
  assert.ok(!archived.accessibilityLabel.includes('Uncategorized')); assert.ok(!archived.accessibilityLabel.includes('None'));
});

test('occurrence resolution does not substitute the latest rule when the stored version is unavailable', async (t) => {
  const f = await edited(t); const occurrence = f.historical; const latest = latestRecurrence(f.snapshot.recurrences, f.id)!;
  assert.equal(occurrenceRecurrence([latest], occurrence), null);
  assert.equal(occurrenceRecurrence([{ ...latest, id: occurrence.recurrenceId, taskId: 'another-task' }], occurrence), null);
});

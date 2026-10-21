/// <reference types="node" />
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';

import { taskDraft } from '../src/features/tasks/form';
import { localDayBounds } from '../src/utils/calendar';
import { journalDatabase, journalToday as today } from './helpers/journal';
import { journalContext, renderControl } from './helpers/form-components';

const noRetry = () => {};
async function fixture(t: TestContext) { const f = await journalDatabase(); t.after(() => f.sqlite.close()); return f; }
function finish(f: Awaited<ReturnType<typeof journalDatabase>>, title: string) {
  const id = f.tasks.createTask({ ...taskDraft(), title }); f.tasks.setCompleted(id, true); return id;
}

for (const count of [0, 1, 2, 3, 4, 7, 20]) test(`${count} completions: full count and at most four authoritative titles, with exact noninteractive remainder`, async t => {
  const f = await fixture(t), titles = Array.from({ length: count }, (_, index) => `Completed task ${index + 1}`);
  for (const title of titles) finish(f, title);
  const source = f.tasks.readCompletedOnDate(today), context = f.context.read(today);
  assert.equal(context.completedTaskCount, source.length); assert.equal(context.completedTaskCount, count);
  assert.deepEqual(context.taskNames, source.slice(0, 4).map(row => row.title));
  const view = renderControl(() => journalContext.JournalContext({ context, error: null, onRetry: noRetry }));
  if (!count) { assert.equal(view.elements.length, 0); assert.doesNotMatch(view.markup, /Day at a Glance/); return; }
  for (const title of context.taskNames) assert.ok(view.markup.includes(title));
  assert.match(view.markup, new RegExp(`${count} completed`));
  if (count > 4) { assert.match(view.markup, new RegExp(`\\+${count - 4} more`)); assert.match(view.markup, new RegExp(`${count - 4} more completed tasks`)); }
  else assert.doesNotMatch(view.markup, /\+\d+ more/);
  assert.equal((view.markup.match(/aria-label="Tasks\./g) ?? []).length, 1);
  assert.ok(view.elements.every(element => !element.props.onPress));
  assert.doesNotMatch(view.markup, /role="button"|role="checkbox"|tabindex="0"|icon-forward|icon-chevron/);
});

test('one-time and recurring titles share the exact completion-day collection, excluding skipped/deleted/pending/other-day records', async t => {
  const f = await fixture(t), one = finish(f, 'A completed one-time task');
  const recurrence = { frequency: 'daily' as const, interval: 1, weekdayMask: 0, monthDay: 3, month: 10, endDate: '' };
  const series = f.tasks.createTask({ ...taskDraft(), title: 'A completed repeating task', date: '2026-10-03', recurrence });
  const occurrences = f.tasks.read().occurrences.filter(row => row.taskId === series);
  f.tasks.setOccurrenceStatus(occurrences.find(row => row.scheduledDate === '2026-10-03')!.id, 'completed');
  f.tasks.setOccurrenceStatus(occurrences.find(row => row.scheduledDate === today)!.id, 'skipped');
  const deleted = finish(f, 'Deleted completion'); f.tasks.deleteTask(deleted);
  f.tasks.createTask({ ...taskDraft(), title: 'Future pending task', date: '2026-10-10' });
  f.setTime('2026-10-03'); finish(f, 'Completed yesterday');
  f.setTime('2026-10-05'); finish(f, 'Completed tomorrow'); f.setTime(today);
  const source = f.tasks.readCompletedOnDate(today), result = f.context.read(today);
  assert.equal(result.completedTaskCount, 2); assert.deepEqual(new Set(result.taskNames), new Set(['A completed one-time task', 'A completed repeating task']));
  assert.equal(source.find(row => row.id === one)!.source, 'task'); assert.equal(source.filter(row => row.source === 'occurrence').length, 1);
  assert.deepEqual(result.taskNames, source.map(row => row.title));
});

test('Tasks count and title preview use local midnight boundaries, including DST, without UTC date slicing', async t => {
  const old = process.env.TZ; process.env.TZ = 'America/New_York';
  t.after(() => { if (old === undefined) delete process.env.TZ; else process.env.TZ = old; });
  const f = await fixture(t);
  for (const date of ['2026-03-08', '2026-11-01']) {
    const { from, until } = localDayBounds(date);
    for (const [suffix, timestamp] of [['before', from - 1], ['start', from], ['last', until - 1], ['next', until]] as const) {
      f.sqlite.prepare('INSERT INTO tasks (id,title,completed_at,created_at,updated_at) VALUES (?,?,?,?,?)').run(`${date}-${suffix}`, `${date} ${suffix}`, timestamp, timestamp, timestamp);
    }
    const result = f.context.read(date); assert.equal(result.completedTaskCount, 2);
    assert.deepEqual(new Set(result.taskNames), new Set([`${date} start`, `${date} last`]));
  }
});

test('date-scoped source queries remain constant with accumulated history and never query per preview title', async t => {
  const f = await fixture(t), empty = f.measure(() => f.context.read(today));
  const timestamp = localDayBounds('2025-01-01').from;
  const insert = f.sqlite.prepare('INSERT INTO tasks (id,title,completed_at,created_at,updated_at) VALUES (?,?,?,?,?)');
  for (let index = 0; index < 1000; index++) insert.run(`old-${index}`, `Old task ${index}`, timestamp, timestamp, timestamp);
  for (let index = 0; index < 20; index++) finish(f, `Today ${index}`);
  const source = f.measure(() => f.tasks.readCompletedOnDate(today)), measured = f.measure(() => f.context.read(today));
  assert.equal(source.count, 2); assert.equal(source.rows, 20); assert.equal(measured.count, empty.count);
  assert.equal(measured.value.completedTaskCount, 20); assert.equal(measured.value.taskNames.length, 4);
  assert.ok(source.statements.every(row => row.sql.includes('completed_at') && row.sql.includes('>=') && row.sql.includes('<')));
  assert.ok(!source.value.some(row => row.title.startsWith('Old task')));
  console.log(`Day at a Glance v2.1 measured: 1,000 historical + 20 same-day Tasks; Tasks source ${source.count} statements/${source.rows} rows; context ${measured.count} statements (same as empty ${empty.count}); preview ${measured.value.taskNames.length} titles.`);
});

test('long task titles remain readable static content, with decorative icons and no hidden navigational controls', async t => {
  const f = await fixture(t), title = 'A long completed task about preparing the quarterly report with supporting details for the next planning session';
  finish(f, title); const context = f.context.read(today);
  const view = renderControl(() => journalContext.JournalContext({ context, error: null, onRetry: noRetry }));
  assert.ok(view.markup.includes(title)); assert.match(view.markup, /data-testid="icon-list"/);
  assert.match(view.markup, /aria-hidden="true"/); assert.doesNotMatch(view.markup, /button|checkbox|scroll/);
  const text = view.elements.find(element => element.props.children === title)!;
  assert.equal((text.props as { numberOfLines?: number }).numberOfLines, 3);
});

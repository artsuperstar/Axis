/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { createTaskDataAccess, occurrenceWindowDays } from '../src/features/tasks/data';
import { taskDraft } from '../src/features/tasks/form';
import { taskRowPresentation } from '../src/features/tasks/presentation';
import { latestRecurrence } from '../src/features/tasks/recurrence';
import type { TaskOccurrence } from '../src/features/tasks/types';
import { pickerValue } from '../src/utils/calendar';
import { bundledMigrations, database } from './helpers/database';
import { mount, runtime } from './helpers/refresh-lifecycle';
const { OccurrenceHistory } = createRequire(import.meta.url)('../src/features/tasks/components/occurrence-history') as typeof import('../src/features/tasks/components/occurrence-history');
type App = Awaited<ReturnType<typeof mount>>;
async function fixture(t: TestContext) {
    const f = database();
    await migrate(f.db, bundledMigrations);
    t.after(() => f.sqlite.close());
    let now = pickerValue('2026-10-13', '12:00').getTime();
    t.mock.method(Date, 'now', () => now);
    const access = createTaskDataAccess(f.db, randomUUID, () => now);
    const id = access.createTask({ ...taskDraft(), title: 'Read', date: '2026-10-01', time: '14:30', recurrence: { frequency: 'weekly', interval: 1, weekdayMask: 1 | 4 | 16, monthDay: 1, month: 10, endDate: '' } });
    const early = access.read().occurrences.find(o => o.scheduledDate === '2026-10-16')!;
    access.setOccurrenceStatus(early.id, 'completed');
    access.editTask(id, { ...taskDraft(access.read().tasks[0], latestRecurrence(access.read().recurrences, id)), recurrence: { frequency: 'daily', interval: 2, weekdayMask: 1, monthDay: 1, month: 10, endDate: '' } });
    now = pickerValue('2026-11-13', '12:00').getTime();
    const page = access.readHistory(id), mutable = page.occurrences.filter(o => o.deletedAt === null);
    access.setOccurrenceStatus(mutable[0].id, 'completed');
    access.setOccurrenceStatus(mutable[1].id, 'skipped');
    const snapshot = access.read();
    return { ...f, access, id, now, task: snapshot.tasks[0], recurrences: snapshot.recurrences, categories: snapshot.categories, page: access.readHistory(id), early };
}
function row(app: App, f: Awaited<ReturnType<typeof fixture>>, entry: TaskOccurrence) { const p = taskRowPresentation(f.task, entry, f.recurrences, f.categories, f.now); return app.find('View', p.accessibilityLabel + (entry.deletedAt !== null ? '. Previous schedule' : '')).parentNode!; }
function buttons(app: App, parent: ReturnType<typeof row>) { return app.nodes().filter(n => { if (n.kind !== 'FormButton')
    return false; for (let p = n.parentNode; p; p = p.parentNode)
    if (p === parent)
        return true; return false; }); }
for (const theme of ['dark', 'light'])
    test(`${theme}: history uses original version metadata, scheduled dates and exact read-only predicate`, async (t) => {
        t.mock.method(runtime.native as {
            useColorScheme: () => string;
        }, 'useColorScheme', () => theme);
        const f = await fixture(t);
        const app = await mount(createElement(OccurrenceHistory, { ...f, readPage: () => f.page, onStatus: () => { throw Error('Unexpected write'); }, onDismiss() { } }), f.db);
        t.after(app.unmount);
        assert.ok(f.page.occurrences.some(o => o.id === f.early.id && o.deletedAt !== null));
        for (const entry of f.page.occurrences) {
            const parent = row(app, f, entry), p = taskRowPresentation(f.task, entry, f.recurrences, f.categories, f.now);
            assert.ok(p.recurrence);
            assert.ok(parent.textContent.includes(p.date));
            assert.ok(parent.textContent.includes(p.recurrence));
            assert.ok(parent.textContent.includes(p.historyOutcome));
            const actions = buttons(app, parent);
            assert.deepEqual(actions.map(n => n.props.label), entry.deletedAt !== null ? [] : entry.status === 'completed' ? ['Reopen'] : ['Complete', entry.status === 'skipped' ? 'Return to pending' : 'Skip']);
            for (const n of actions)
                assert.equal(n.props.appearance, 'v2');
        }
        const previous = f.page.occurrences.find(o => o.deletedAt !== null)!;
        assert.notEqual(taskRowPresentation(f.task, previous, f.recurrences, f.categories, f.now).recurrence, taskRowPresentation(f.task, f.page.occurrences.find(o => o.recurrenceId !== previous.recurrenceId)!, f.recurrences, f.categories, f.now).recurrence);
    });
test('history status actions keep occurrence identity, update immediately and never write deleted-version rows', async (t) => {
    const f = await fixture(t), calls: {
        id: string;
        status: string;
    }[] = [];
    const beforeProjection = f.access.read().recurrences;
    const app = await mount(createElement(OccurrenceHistory, { ...f, readPage: () => f.page, onStatus: (id, status) => { calls.push({ id, status }); return f.access.setOccurrenceStatus(id, status); }, onDismiss() { } }), f.db);
    t.after(app.unmount);
    for (const state of ['completed', 'skipped', 'pending'] as const) {
        const entry = f.page.occurrences.find(o => o.deletedAt === null && o.status === state)!;
        const target = state === 'pending' ? 'completed' : 'pending';
        const action = buttons(app, row(app, f, entry)).find(n => n.props.label === (state === 'completed' ? 'Reopen' : state === 'skipped' ? 'Return to pending' : 'Complete'))!;
        await act(async () => { (action.props.onPress as () => void)(); });
        assert.deepEqual(calls.at(-1), { id: entry.id, status: target });
        assert.equal(f.access.readHistory(f.id).occurrences.find(o => o.id === entry.id)!.status, target);
    }
    assert.deepEqual(f.access.read().recurrences, beforeProjection);
    assert.ok(calls.every(c => c.id !== f.early.id));
});
test('history preserves 30-day backward pages, stable current rows, error/retry and end detection', async (t) => {
    const f = await fixture(t), reads: (string | undefined)[] = [];
    let fail = true;
    const app = await mount(createElement(OccurrenceHistory, { ...f, readPage: (before) => { reads.push(before); if (fail) {
            fail = false;
            throw Error('Fixture read failure');
        } return f.access.readHistory(f.id, before); }, onStatus: f.access.setOccurrenceStatus, onDismiss() { } }), f.db);
    t.after(app.unmount);
    assert.equal(app.find('FormError').props.appearance, 'v2');
    assert.equal(reads.length, 1);
    await app.press('Retry');
    assert.deepEqual(reads, [undefined, undefined]);
    const preserved = row(app, f, f.page.occurrences[0]);
    assert.equal(occurrenceWindowDays, 30);
    assert.ok(f.page.nextBefore);
    await app.press('Load older history');
    assert.equal(reads.at(-1), f.page.nextBefore);
    assert.equal(row(app, f, f.page.occurrences[0]), preserved, 'Stable occurrence key retains current row');
    assert.ok(!app.nodes().some(n => n.props?.label === 'Load older history'));
    const beforeCalls = reads.length;
    const completed = buttons(app, row(app, f, f.page.occurrences.find(o => o.status === 'completed' && o.deletedAt === null)!))[0];
    await act(async () => { (completed.props.onPress as () => void)(); });
    assert.equal(reads.length, beforeCalls, 'Status update does not rebuild/refetch history');
});
test('history empty state and native request-close preserve source text and dismiss once', async (t) => {
    const f = await fixture(t);
    let dismissed = 0;
    const app = await mount(createElement(OccurrenceHistory, { ...f, readPage: () => ({ occurrences: [], nextBefore: null }), onStatus: f.access.setOccurrenceStatus, onDismiss: () => { dismissed++; } }), f.db);
    t.after(app.unmount);
    assert.ok(app.container.textContent.includes('No past occurrences yet.'));
    assert.ok(!app.nodes().some(n => n.props?.label === 'Load older history'));
    await act(async () => { (app.find('Modal').props.onRequestClose as () => void)(); });
    assert.equal(dismissed, 1);
});

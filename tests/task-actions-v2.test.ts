/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { createTaskDataAccess } from '../src/features/tasks/data';
import { taskDraft } from '../src/features/tasks/form';
import { pickerValue } from '../src/utils/calendar';
import { bundledMigrations, database } from './helpers/database';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';
const { TaskActions } = createRequire(import.meta.url)('../src/features/tasks/components/task-actions') as typeof import('../src/features/tasks/components/task-actions');
const today = '2026-11-13', now = pickerValue(today, '12:00').getTime();
async function fixture(t: TestContext, recurring = false) {
    t.mock.method(Date, 'now', () => now);
    const f = database();
    await migrate(f.db, bundledMigrations);
    t.after(() => f.sqlite.close());
    const access = createTaskDataAccess(f.db, randomUUID, () => now);
    const id = access.createTask({ ...taskDraft(), title: 'Read', date: today, recurrence: recurring ? { frequency: 'daily', interval: 1, weekdayMask: 16, monthDay: 13, month: 11, endDate: '' } : null });
    return { ...f, access, id };
}
for (const theme of ['dark', 'light'])
    for (const state of ['ordinary', 'ordinary-completed', 'pending', 'completed', 'skipped', 'stopped'] as const)
        test(`${theme}: Task Actions ${state} preserves ordered actions, exact callbacks and semantic delete`, async (t) => {
            t.mock.method(runtime.native as {
                useColorScheme: () => string;
            }, 'useColorScheme', () => theme);
            const recurring = !state.startsWith('ordinary'), f = await fixture(t, recurring);
            if (state === 'ordinary-completed')
                f.access.setCompleted(f.id, true);
            if (state === 'stopped')
                f.access.stopRepeating(f.id);
            let snapshot = f.access.read();
            let occurrence = recurring && state !== 'stopped' ? snapshot.occurrences.find(o => o.taskId === f.id && o.scheduledDate === today)! : null;
            if (occurrence && (state === 'completed' || state === 'skipped')) {
                f.access.setOccurrenceStatus(occurrence.id, state);
                snapshot = f.access.read();
                occurrence = snapshot.occurrences.find(o => o.id === occurrence!.id)!;
            }
            const task = snapshot.tasks.find(x => x.id === f.id)!, calls: string[] = [];
            const app = await mount(createElement(TaskActions, { item: { key: task.id, task, occurrence }, recurrences: snapshot.recurrences, categories: snapshot.categories, now, visible: true, error: null, onDismiss: () => calls.push('dismiss'), onClosed: () => calls.push('closed'), onEdit: () => calls.push('edit'), onHistory: () => calls.push('history'), onSkip: () => calls.push('skip'), onDelete: () => calls.push('delete') }), f.db);
            t.after(app.unmount);
            const buttons = app.nodes().filter(n => n.kind === 'FormButton');
            const expected = ['Back', ...(occurrence && state !== 'completed' ? [state === 'skipped' ? 'Return to pending' : 'Skip occurrence'] : []), occurrence ? 'Edit recurring task' : 'Edit task', ...(occurrence ? ['View History'] : []), occurrence ? 'Delete recurring task' : 'Delete task'];
            assert.deepEqual(buttons.map(n => n.props.label), expected);
            for (const b of buttons)
                assert.equal(b.props.appearance, 'v2');
            assert.equal(buttons.at(-1)!.props.variant, 'destructive');
            assert.equal(new Set(expected).size, expected.length);
            await app.press(expected.at(-1)!);
            assert.deepEqual(calls, ['delete']);
            assert.deepEqual(f.access.read().tasks, snapshot.tasks, 'Sheet callback does not own deletion');
            await act(async () => { (app.find('Modal').props.onRequestClose as () => void)(); });
            assert.deepEqual(calls, ['delete', 'dismiss']);
        });
for (const save of [false, true])
    test(`iOS Task Actions hands off only after native dismissal; Edit ${save ? 'Save' : 'Cancel'} preserves source identity`, async (t) => {
        const native = runtime.native as {
            Platform: {
                OS: string;
            };
        };
        const previous = native.Platform.OS;
        native.Platform.OS = 'ios';
        t.after(() => { native.Platform.OS = previous; });
        const f = await fixture(t);
        const app = await mount(createElement(screens.TasksScreen), f.db);
        t.after(app.unmount);
        const trigger = app.nodes().find(n => n.kind === 'FormButton' && String(n.props.accessibilityLabel).startsWith('Actions for Read'))!;
        await act(async () => { (trigger.props.onPress as () => void)(); });
        const dismissed = app.find('Modal').props.onDismiss as () => void;
        await app.press('Edit task');
        assert.ok(!app.nodes().some(n => n.kind === 'FormField'));
        await act(async () => { dismissed(); });
        assert.equal(app.find('FormField', 'Title *').props.appearance, 'v2');
        assert.equal(app.nodes().filter(n => n.kind === 'Modal').length, 1);
        await app.change('Title *', 'Edited');
        await app.press(save ? 'Save' : 'Cancel');
        assert.equal(f.access.read().tasks.length, 1);
        assert.equal(f.access.read().tasks[0].id, f.id);
        assert.equal(f.access.read().tasks[0].title, save ? 'Edited' : 'Read');
    });

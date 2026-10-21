/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { DesignColors } from '../src/constants/design-system-v2';
import { createFitnessDataAccess } from '../src/features/fitness/data';
import { blankSet, blankTargets } from '../src/features/fitness/form';
import { workoutCompletionTime, workoutCounts, workoutDateLabel, workoutGroupCount, workoutHistoryGroups } from '../src/features/fitness/management-presentation';
import { createRotationDataAccess } from '../src/features/fitness/rotations-data';
import { seedFitnessExercises } from '../src/features/fitness/seed';
import type { SessionSummary } from '../src/features/fitness/types';
import { bundledMigrations, database } from './helpers/database';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

type App = Awaited<ReturnType<typeof mount>>;
type Section = { key: string; title: string; count: string; data: SessionSummary[] };
async function fixture(t: TestContext) {
  const f = database(); await migrate(f.db, bundledMigrations); seedFitnessExercises(f.db); t.after(() => f.sqlite.close());
  let time = new Date(2026, 9, 20, 8).getTime(); const now = () => time;
  const fitness = createFitnessDataAccess(f.db, randomUUID, now), rotations = createRotationDataAccess(f.db, randomUUID, now);
  const at = (date: Date) => { time = date.getTime(); };
  const complete = (routine: string | null = null, start = new Date(2026, 9, 20, 9), end = new Date(2026, 9, 20, 10)) => {
    at(start); const session = fitness.startWorkout(routine); at(end); fitness.finishWorkout(session.id); return session.id;
  };
  return { ...f, fitness, rotations, at, complete };
}
async function show(t: TestContext, f: Awaited<ReturnType<typeof fixture>>) {
  const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount); await app.press('History'); return app;
}
const sections = (app: App) => app.find('SectionList').props.sections as Section[];
const ids = (app: App) => sections(app).flatMap(section => section.data.map(row => row.id));
const row = (app: App, id: string) => app.nodes().find(node => node.props?.testID === `workout-history-row-${id}`)!;
async function open(app: App, id: string) { await act(() => (row(app, id).props.onPress as () => void)()); }
function flatten(style: unknown): Record<string, unknown> {
  return Object.assign({}, ...(Array.isArray(style) ? style.map(flatten) : [style ?? {}]));
}

for (const theme of ['light', 'dark'] as const) test(`${theme}: History reuses the Fitness shell and owns actual date counts, summary rows and read-only navigation`, async t => {
  t.mock.method(runtime.native as { useColorScheme: () => string }, 'useColorScheme', () => theme);
  const f = await fixture(t), routine = f.fitness.createRoutine({ name: 'Saved workout', exercises: [] });
  const a = f.complete(routine), b = f.complete(null, new Date(2026, 9, 19, 8), new Date(2026, 9, 19, 9));
  const app = await show(t, f); assert.deepEqual(ids(app), [a, b]); assert.deepEqual(sections(app).map(section => section.count), ['1 session', '1 session']);
  for (const name of ['Workout', 'Routines', 'Exercises', 'History']) assert.equal(app.find('FormButton', name).props.appearance, 'v2');
  assert.equal(app.find('FormButton', 'History').props.selected, true); assert.ok(app.container.textContent.includes('Recent completed sessions'));
  const header = app.nodes().find(node => node.props?.testID === `workout-date-${sections(app)[0].key}`)!;
  assert.equal(flatten(header.props.style).backgroundColor, DesignColors[theme].group); assert.equal(header.props.accessibilityRole, 'header');
  assert.ok(String(row(app, a).props.accessibilityLabel).includes('Saved workout, 0 exercises · 0 sets. Completed at'));
  assert.ok(String(row(app, a).props.accessibilityHint).includes('Read-only')); assert.equal(row(app, a).props.accessibilityRole, 'button');
  assert.ok(!app.nodes().some(node => node.props?.label === '⋯' || node.props?.label === 'Start workout'));
  await open(app, a); assert.ok(app.find('Modal')); assert.equal(app.find('FlatList').props.testID, 'workout-history-detail-list');
  assert.ok(app.container.textContent.includes('Read-only')); await app.press('Back'); assert.equal(app.find('FormButton', 'History').props.selected, true);
});

test('only finished nondeleted sessions appear; valid free and empty routine workouts remain normal archive rows', async t => {
  const f = await fixture(t), free = f.complete(), routine = f.fitness.createRoutine({ name: 'Empty routine', exercises: [] }), empty = f.complete(routine);
  const discarded = f.fitness.startWorkout(); f.fitness.discardWorkout(discarded.id); const active = f.fitness.startWorkout();
  const app = await show(t, f); assert.equal(ids(app).length, 2); assert.ok(ids(app).includes(free) && ids(app).includes(empty));
  assert.ok(!ids(app).includes(discarded.id) && !ids(app).includes(active.id));
  for (const id of [free, empty]) { assert.ok(row(app, id).textContent.includes('0 exercises · 0 sets')); assert.ok(row(app, id).textContent.includes('Completed')); }
  await open(app, free); assert.ok(app.container.textContent.includes('Free workout')); assert.ok(app.container.textContent.includes('No exercises logged.'));
});

test('grouping uses local completion dates across midnight/year rather than a shared UTC date', async t => {
  const previousTimezone = process.env.TZ;
  process.env.TZ = 'America/Sao_Paulo';
  t.after(() => { if (previousTimezone === undefined) delete process.env.TZ; else process.env.TZ = previousTimezone; });
  const f = await fixture(t);
  const older = f.complete(null, new Date(2025, 11, 31, 22), new Date(2025, 11, 31, 23, 30));
  const newer = f.complete(null, new Date(2025, 11, 31, 23, 40), new Date(2026, 0, 1, 0, 30));
  const app = await show(t, f); assert.deepEqual(ids(app), [newer, older]); assert.equal(sections(app).length, 2);
  assert.deepEqual(sections(app).map(section => section.title), [workoutDateLabel(new Date(2026, 0, 1, 0, 30).getTime()), workoutDateLabel(new Date(2025, 11, 31, 23, 30).getTime())]);
  assert.ok(sections(app)[1].title.includes('2025'));
  assert.equal(new Date(2026, 0, 1, 0, 30).toISOString().slice(0, 10), new Date(2025, 11, 31, 23, 30).toISOString().slice(0, 10), 'fixture exposes the UTC grouping trap in the project timezone');
});

test('ordering preserves completion desc, start desc and ID asc with exact timestamp ties', async t => {
  const f = await fixture(t), end = new Date(2026, 9, 20, 14);
  const first = f.complete(null, new Date(2026, 9, 20, 9), end), second = f.complete(null, new Date(2026, 9, 20, 9), end);
  const laterStart = f.complete(null, new Date(2026, 9, 20, 13), end), earlierFinish = f.complete(null, new Date(2026, 9, 20, 10), new Date(2026, 9, 20, 11));
  const app = await show(t, f); assert.deepEqual(ids(app), [laterStart, ...[first, second].sort(), earlierFinish]);
  assert.equal(sections(app).length, 1); assert.equal(sections(app)[0].count, '4 sessions');
});

test('History time follows completion and locale conventions, not start time; visible time and row announcement agree', async t => {
  const f = await fixture(t), start = new Date(2026, 9, 20, 8, 12), finish = new Date(2026, 9, 20, 17, 43), id = f.complete(null, start, finish);
  const app = await show(t, f), session = sections(app)[0].data[0];
  assert.equal(workoutCompletionTime(session), finish.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }));
  assert.notEqual(workoutCompletionTime(session), start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }));
  assert.ok(row(app, id).textContent.includes(workoutCompletionTime(session)!)); assert.ok(String(row(app, id).props.accessibilityLabel).includes(`Completed at ${finish.toLocaleString()}`));
  assert.equal(workoutCompletionTime({ completedAt: null }), null);
});

test('exercise/set counts use saved live snapshots, count null-detail completed sets, and never count planned sets', async t => {
  const f = await fixture(t), exercise = f.fitness.readOverview().exercises.find(item => item.measurementType === 'strength')!;
  const routine = f.fitness.createRoutine({ name: 'Planned targets', exercises: [{ id: null, exerciseId: exercise.id, targets: { ...blankTargets(), setCount: '9' } }] });
  const session = f.fitness.startWorkout(routine), entry = f.fitness.readSession(session.id).exercises[0];
  f.fitness.addSet(entry.id, blankSet()); const removed = f.fitness.addSet(entry.id, { ...blankSet(), weight: '10', reps: '8' }); f.fitness.deleteSet(removed);
  f.at(new Date(2026, 9, 20, 10)); f.fitness.finishWorkout(session.id);
  const app = await show(t, f), summary = sections(app)[0].data[0]; assert.equal(summary.exerciseCount, 1); assert.equal(summary.setCount, 1);
  assert.ok(row(app, session.id).textContent.includes('1 exercise · 1 set')); await open(app, session.id);
  assert.ok(app.container.textContent.includes('— × —'));
  assert.ok(app.nodes(app.find('Modal')).some(node => String(node.props?.accessibilityLabel).includes('Set complete. No performance details')));
  assert.ok(!app.nodes(app.find('Modal')).some(node => ['FormField', 'SelectField'].includes(String(node.kind))));
});

test('historical names, notes, manual completion, metrics and rotation provenance survive routine/exercise archival without mutation', async t => {
  const f = await fixture(t), exercise = f.fitness.createExercise({ name: 'Original movement', measurementType: 'strength' });
  const routine = f.fitness.createRoutine({ name: 'Original routine', exercises: [{ id: null, exerciseId: exercise.id, targets: blankTargets() }] });
  const cycle = f.rotations.create({ name: 'Stored cycle', steps: [{ id: null, routineId: routine }] }); f.rotations.activate(cycle);
  const session = f.fitness.startWorkout(routine), entry = f.fitness.readSession(session.id).exercises[0];
  f.fitness.addSet(entry.id, { ...blankSet(), weight: '12.5', reps: '7' }); f.fitness.setExerciseCompleted(entry.id, true);
  f.fitness.saveNote(session.id, null, 'Saved workout note'); f.fitness.saveNote(session.id, entry.id, 'Saved exercise note');
  f.at(new Date(2026, 9, 20, 10)); f.fitness.finishWorkout(session.id); const before = f.fitness.readSession(session.id);
  f.rotations.delete(cycle); f.fitness.editRoutine(routine, { name: 'Renamed current routine', exercises: [] }); f.fitness.archiveRoutine(routine); f.fitness.archiveExercise(exercise.id);
  const app = await show(t, f); assert.ok(row(app, session.id).textContent.includes('Original routine')); assert.ok(row(app, session.id).textContent.includes('1 exercise · 1 set'));
  await open(app, session.id); assert.ok(app.container.textContent.includes('Original movement')); assert.ok(app.container.textContent.includes('12.5 kg × 7'));
  assert.ok(app.container.textContent.includes('Saved workout note') && app.container.textContent.includes('Saved exercise note') && app.container.textContent.includes('Exercise completed'));
  assert.ok(!app.nodes(app.find('Modal')).some(node => ['Save', 'Edit', 'Delete', 'Finish Workout', 'Reopen', '+ Add set'].includes(String(node.props?.label))));
  assert.deepEqual(f.fitness.readSession(session.id), before); assert.equal(before.rotationId, cycle); assert.ok(before.rotationStepId);
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []); assert.equal(f.sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
});

test('three cursor pages with tied dates merge into one group, preserving IDs/order/counts without duplicate date headers or gaps', async t => {
  const f = await fixture(t); for (let index = 0; index < 45; index++) f.complete();
  const expected = f.fitness.readHistory(100).history.map(session => session.id), app = await show(t, f);
  assert.deepEqual(ids(app), expected.slice(0, 20)); assert.equal(sections(app)[0].count, '20 sessions loaded'); const key = sections(app)[0].key;
  await app.press('Load older workouts'); assert.deepEqual(ids(app), expected.slice(0, 40)); assert.equal(sections(app).length, 1); assert.equal(sections(app)[0].key, key); assert.equal(sections(app)[0].count, '40 sessions loaded');
  await app.press('Load older workouts'); assert.deepEqual(ids(app), expected); assert.equal(new Set(ids(app)).size, 45); assert.equal(sections(app).length, 1); assert.equal(sections(app)[0].count, '45 sessions');
  assert.ok(!app.nodes().some(node => node.props?.label === 'Load older workouts'));
});

test('a page spanning a local-date boundary keeps earlier date ownership when the next page continues that same date', async t => {
  const f = await fixture(t);
  for (let index = 0; index < 22; index++) f.complete(null, new Date(2026, 9, 19, 8), new Date(2026, 9, 19, 9));
  for (let index = 0; index < 6; index++) f.complete();
  const app = await show(t, f); assert.deepEqual(sections(app).map(section => section.data.length), [6, 14]);
  assert.deepEqual(sections(app).map(section => section.count), ['6 sessions', '14 sessions loaded']); const keys = sections(app).map(section => section.key);
  await app.press('Load older workouts'); assert.deepEqual(sections(app).map(section => section.key), keys); assert.deepEqual(sections(app).map(section => section.data.length), [6, 22]);
});

test('empty History has one quiet archive message, no start CTA, and failed reads do not masquerade as empty', async t => {
  const f = await fixture(t), app = await show(t, f); assert.ok(app.container.textContent.includes('No workouts yet.')); assert.ok(app.container.textContent.includes('Completed workouts will appear here.'));
  assert.ok(!app.nodes().some(node => String(node.props?.label).startsWith('Start ')));
  f.complete(); await app.resume(); await app.press('History'); const list = app.find('SectionList'); const before = ids(app);
  runtime.fixture.failures.add('fitness.readOverview'); await app.resume(); await app.press('History'); assert.ok(app.nodes().includes(list)); assert.deepEqual(ids(app), before);
  assert.ok(!app.container.textContent.includes('No workouts yet.')); runtime.fixture.failures.clear(); await app.press('Retry'); assert.deepEqual(ids(app), before);
});

test('failed detail refresh retains the same read-only snapshot and sheet through Retry', async t => {
  const f = await fixture(t), id = f.complete(), app = await show(t, f); await open(app, id);
  const detail = app.find('FlatList'), before = f.fitness.readSession(id); runtime.fixture.failures.add('fitness.readSession'); await app.resume();
  assert.equal(app.find('FlatList'), detail); assert.ok(app.container.textContent.includes('Read-only')); runtime.fixture.failures.clear(); await app.press('Retry');
  assert.equal(app.find('FlatList'), detail); assert.deepEqual(f.fitness.readSession(id), before);
});

for (const [width, fontScale] of [[320, 1], [390, 1], [430, 1], [320, 2]]) test(`${width}/${fontScale}: dynamic archive rows preserve long names, stable section/session keys and summary-only reads`, async t => {
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width, fontScale, height: 844, scale: 1 }));
  const f = await fixture(t), name = 'Long saved workout name for controlled strength, endurance and deliberate recovery';
  const routine = f.fitness.createRoutine({ name, exercises: [] }); for (let index = 0; index < 30; index++) f.complete(routine);
  const app = await show(t, f), list = app.find('SectionList'), first = sections(app)[0].data[0];
  assert.equal(ids(app).length, 20); assert.ok(Number(list.props.initialNumToRender) < 20); assert.equal(list.props.stickySectionHeadersEnabled, false); assert.equal(list.props.getItemLayout, undefined);
  assert.equal((list.props.keyExtractor as (session: SessionSummary) => string)(first), first.id); assert.equal(flatten(row(app, first.id).props.style).height, undefined);
  assert.ok(row(app, first.id).textContent.includes(name)); assert.ok(app.nodes(row(app, first.id)).filter(node => node.kind === 'ThemedText').every(node => node.props.numberOfLines === undefined && node.props.allowFontScaling !== false));
  assert.ok(!runtime.fixture.reads.includes('fitness.readSession') && !runtime.fixture.reads.includes('fitness.readRoutines'));
  assert.equal(runtime.fixture.layoutAnimations.length, 0);
  await open(app, first.id);
  assert.ok(app.find('FlatList').textContent.includes(name), 'full historical identity belongs in scrollable content, including large text');
  assert.ok(app.nodes(app.find('Modal')).some(node => node.kind === 'ThemedText' && node.textContent === 'Workout details'));
});

test('History retains its own scroll offset and group/count helpers keep singular/plural behavior', async t => {
  const f = await fixture(t); f.complete(); const app = await show(t, f);
  await act(() => (app.find('SectionList').props.onScroll as (event: unknown) => void)({ nativeEvent: { contentOffset: { y: 225 } } }));
  await app.press('Exercises'); await app.press('History'); assert.deepEqual(app.find('SectionList').props.contentOffset, { x: 0, y: 225 });
  assert.equal(workoutCounts(1, 1), '1 exercise · 1 set'); assert.equal(workoutGroupCount(1), '1 session'); assert.equal(workoutGroupCount(2, true), '2 sessions loaded');
  assert.equal(workoutHistoryGroups(f.fitness.readHistory().history).length, 1);
});

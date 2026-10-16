/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test, type TestContext } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { act, createElement } from 'react';

import { DesignColors, TouchTarget, interfaceFontStyle, canSlideNavigationIndicator, taskSectionSurface } from '../src/constants/design-system-v2';
import { measurementIcons, workoutSetCells, workoutSetColumns } from '../src/features/fitness/workout-presentation';
import { createFitnessDataAccess } from '../src/features/fitness/data';
import { blankSet, blankTargets } from '../src/features/fitness/form';
import { seedFitnessExercises } from '../src/features/fitness/seed';
import { createTaskDataAccess } from '../src/features/tasks/data';
import { taskDraft } from '../src/features/tasks/form';
import { bundledMigrations, database } from './helpers/database';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';
import { completeAndEditWorkoutSet } from './helpers/workout-interactions';

const require = createRequire(import.meta.url);
const design = require('../src/components/design-system') as typeof import('../src/components/design-system');
const icons = require('../src/components/ui-icon') as typeof import('../src/components/ui-icon');
const motion = require('./helpers/native-motion.cjs') as { calls: { value: unknown; config: { duration: number; reduceMotion: string } }[] };
const font = require('./helpers/native-font.cjs') as { state: { loaded: boolean; error: Error | null; displayLoaded: boolean; displayError: Error | null } };
const today = '2026-10-14'; const now = new Date(`${today}T12:00:00`).getTime();

async function initialized(t: TestContext) {
  t.mock.method(Date, 'now', () => now);
  const f = database(); await migrate(f.db, bundledMigrations); seedFitnessExercises(f.db); t.after(() => f.sqlite.close());
  return { ...f, tasks: createTaskDataAccess(f.db, randomUUID, () => now), fitness: createFitnessDataAccess(f.db, randomUUID, () => now) };
}
function contrast(a: string, b: string) {
  const lum = (hex: string) => hex.slice(1).match(/../g)!.map((v) => parseInt(v, 16) / 255)
    .map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const flatten = (style: unknown): Record<string, unknown> => Object.assign({}, ...[style].flat(Infinity));

test('all v2 icons use native-compatible base64 SVG with consistent outline geometry', () => {
  for (const name of Object.keys(icons.iconGeometry) as (keyof typeof icons.iconGeometry)[]) {
    const source = icons.iconSource(name, '#8E4E3F');
    assert.ok(source.uri.startsWith('data:image/svg+xml;base64,'));
    const svg = Buffer.from(source.uri.split(',')[1], 'base64').toString('ascii');
    assert.ok(svg.includes(icons.iconGeometry[name]));
    assert.ok(svg.includes('stroke="#8E4E3F"') && svg.includes('stroke-width="2"'));
    assert.equal(Buffer.from(svg, 'ascii').toString('base64'), source.uri.split(',')[1]);
  }
});

for (const theme of ['light', 'dark'] as const) test(`v2 ${theme} actual text, status, feature and control contrasts`, () => {
  const c = DesignColors[theme];
  assert.deepEqual(Object.keys(c), Object.keys(DesignColors.light));
  for (const bg of [c.canvas, c.group, c.groupStrong, c.surface, c.inset, c.control, c.selected]) {
    for (const fg of [c.textPrimary, c.textSecondary, c.brand, c.attention, c.danger, c.info, c.taskText, c.fitnessText]) {
      assert.ok(contrast(fg, bg) >= 4.5, `${fg} on ${bg}: ${contrast(fg, bg)}`);
    }
  }
  for (const bg of [c.canvas, c.surface, c.group, c.groupStrong, c.inset, c.control]) assert.ok(contrast(c.textMuted, bg) >= 4.5);
  assert.ok(contrast(c.textMuted, c.inset) >= 4.5, 'Disabled button text');
  assert.ok(contrast(c.onBrand, c.brand) >= 4.5);
  assert.ok(contrast(c.onBrand, c.brandStrong) >= 4.5);
  assert.ok(contrast(c.onBrand, c.taskAccent) >= 4.5);
  assert.ok(contrast(c.onFitness, c.fitnessAccent) >= 4.5);
  assert.ok(contrast(c.fitnessText, c.fitnessAccentSoft) >= 4.5);
  assert.ok(contrast(c.attention, c.attentionSoft) >= 4.5, 'Today/past semantic icons');
  assert.ok(contrast(c.taskText, c.taskAccentSoft) >= 4.5, 'Task count badges');
  for (const section of ['Earlier', 'Today', 'To-do', 'Upcoming']) assert.ok(contrast(c.taskAccent, taskSectionSurface(c, section)) >= 3, 'Indigo completion boundary');
  for (const bg of [c.canvas, c.control, c.surface, c.group, c.groupStrong]) assert.ok(contrast(c.borderStrong, bg) >= 3);
  assert.notEqual(c.brand, c.attention); assert.notEqual(c.taskAccent, c.danger);
  assert.notEqual(taskSectionSurface(c, 'Today'), taskSectionSurface(c, 'To-do'));
  assert.notEqual(taskSectionSurface(c, 'Earlier'), taskSectionSurface(c, 'Upcoming'));
});

test('Tasks keeps virtualized section slices, default disclosures and five-item To-do preview', async (t) => {
  const f = await initialized(t);
  for (let i = 0; i < 8; i++) f.tasks.createTask({ ...taskDraft(), title: `Undated ${i}` });
  f.tasks.createTask({ ...taskDraft(), title: 'Today item', date: today });
  f.tasks.createTask({ ...taskDraft(), title: 'Earlier item', date: '2026-10-13' });
  f.tasks.createTask({ ...taskDraft(), title: 'Future item', date: '2026-10-15' });
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  const list = app.find('SectionList');
  assert.equal((list.props.sections as { title: string }[]).length, 4);
  assert.equal(app.find('Pressable', 'Earlier, 1 tasks').props.accessibilityState && (app.find('Pressable', 'Earlier, 1 tasks').props.accessibilityState as { expanded: boolean }).expanded, false);
  assert.equal((app.find('Pressable', 'Upcoming, 1 tasks').props.accessibilityState as { expanded: boolean }).expanded, false);
  const headers = app.nodes().filter((node) => /^task-section-(Earlier|Today|To-do|Upcoming)$/.test(String(node.props?.testID)));
  assert.equal(headers.length, 4);
  assert.ok(app.nodes().some((node) => node.kind === 'ThemedText' && node.textContent === 'Today' && node.props.accessibilityRole === 'header'));
  assert.equal(app.nodes().filter((node) => String(node.props?.testID).startsWith('task-row-')).length, 6);
  await app.press('View all 8'); assert.equal(app.nodes().filter((node) => String(node.props?.testID).startsWith('task-row-')).length, 9);
  await app.press('Show less'); await app.tapSet('Earlier, 1 tasks'); await app.tapSet('Upcoming, 1 tasks');
  assert.ok(app.container.textContent.includes('Earlier item')); assert.ok(app.container.textContent.includes('Future item'));
  assert.ok(app.find('FormButton', 'View in Calendar')); assert.ok(app.find('Pressable', 'Add task'));
});

test('Hearth completion stays authoritative, preserves History and leaves History visually unmigrated', async (t) => {
  const f = await initialized(t); const id = f.tasks.createTask({ ...taskDraft(), title: 'Authoritative task', date: today });
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  const completion = app.nodes().find((node) => node.kind === 'Pressable' && node.props.accessibilityRole === 'checkbox')!;
  await app.tapSet(completion.props.accessibilityLabel as string);
  assert.ok(f.tasks.read().tasks.find((task) => task.id === id)!.completedAt);
  assert.ok(app.container.textContent.includes('Authoritative task'));
  assert.ok(app.container.textContent.includes('1 of 1 completed')); await app.unmount();
  const history = await mount(createElement(screens.TasksHistoryScreen), f.db); t.after(history.unmount);
  assert.ok(history.container.textContent.includes('Authoritative task'));
  assert.ok(!history.nodes().some((node) => String(node.props?.testID).startsWith('task-row-')));
  const reopen = history.nodes().find((node) => node.kind === 'Pressable' && node.props.accessibilityRole === 'checkbox')!;
  await history.tapSet(reopen.props.accessibilityLabel as string); assert.equal(f.tasks.read().tasks.find((task) => task.id === id)!.completedAt, null);
});

test('empty sections remain small content regions and high-density Tasks retain SectionList', async (t) => {
  const f = await initialized(t); const empty = await mount(createElement(screens.TasksScreen), f.db); t.after(empty.unmount);
  assert.ok(empty.container.textContent.includes('No tasks for today.')); assert.ok(empty.container.textContent.includes('No to-do items.'));
  await empty.unmount();
  for (let i = 0; i < 120; i++) f.tasks.createTask({ ...taskDraft(), title: `Long title ${i} with accents Educação and practical recurring metadata`, date: today });
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  const sections = app.find('SectionList').props.sections as { title: string; data: unknown[] }[];
  assert.equal(sections.find((section) => section.title === 'Today')!.data.length, 120);
  assert.ok(!app.nodes().some((node) => node.kind === 'ScrollView'), 'No giant nonvirtualized section wrapper');
  assert.equal((runtime.reducedMotionListenerCount as () => number)(), 1, 'One OS subscription per screen, not per row');
});

test('each exercise owns targets, local actions and sets; header and persistent Finish remain outer', async (t) => {
  const f = await initialized(t); const sources = f.fitness.readOverview().exercises;
  const strength = sources.find((row) => row.measurementType === 'strength')!;
  const routine = f.fitness.createRoutine({ name: 'Biceps, Back', exercises: [{ id: null, exerciseId: strength.id,
    targets: { ...blankTargets(), setCount: '3', repMin: '8', repMax: '12' } }] });
  const session = f.fitness.startWorkout(routine); const detail = f.fitness.readSession(session.id);
  const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  const group = app.nodes().find((node) => node.props?.testID === `exercise-group-${detail.exercises[0].id}`)!;
  assert.ok(group); assert.equal(group.props.accessibilityLabel, `${strength.name} exercise`);
  assert.ok(group.textContent.includes('Target: 3 planned sets')); assert.ok(group.textContent.includes('No sets logged yet'));
  const children = app.nodes(group);
  assert.ok(children.some((node) => node.props?.accessibilityLabel === `Complete set for ${strength.name}`));
  assert.ok(children.some((node) => node.props?.accessibilityLabel === `More actions for ${strength.name}`));
  assert.ok(children.some((node) => node.props?.testID === `sets-inset-${detail.exercises[0].id}`));
  assert.ok(!children.some((node) => node.props?.testID === 'workout-header'));
  for (let node = app.find('FormButton', 'Finish Workout').parentNode; node; node = node.parentNode) assert.notEqual(node.kind, 'ScrollView');
  assert.equal(app.find('FormButton', 'Workout').props.selected, true);
  await app.press('Routines'); assert.ok(!app.nodes().some((node) => String(node.props?.testID).startsWith('exercise-group-')));
});

test('only a locally added set animates; resume and returning from History do not replay it', async (t) => {
  const f = await initialized(t); const strength = f.fitness.readOverview().exercises.find((row) => row.measurementType === 'strength')!;
  const session = f.fitness.startWorkout(); const exerciseId = f.fitness.addSessionExercise(session.id, strength.id);
  f.fitness.addSet(exerciseId, { ...blankSet(), weight: '12', reps: '10' });
  const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  motion.calls.length = 0;
  await app.resume(); assert.equal(motion.calls.length, 0);
  await completeAndEditWorkoutSet(app, strength.name); await app.change('Reps (optional)', '9'); await app.press('Save');
  assert.equal(motion.calls.filter((call) => call.config.duration === 220).length, 1);
  assert.ok(motion.calls.every((call) => call.config.reduceMotion === 'system'));
  motion.calls.length = 0; await app.resume(); assert.equal(motion.calls.length, 0);
  await app.press('History'); await app.press('Workout'); assert.equal(motion.calls.length, 0);
  assert.equal(f.fitness.readSession(session.id).exercises[0].sets.length, 2);
});

test('live Reduced Motion disables set insertion without changing data or accessible controls', async (t) => {
  const f = await initialized(t); const strength = f.fitness.readOverview().exercises.find((row) => row.measurementType === 'strength')!;
  const session = f.fitness.startWorkout(); f.fitness.addSessionExercise(session.id, strength.id);
  const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  await act(() => (runtime.reduceMotion as (value: boolean) => void)(true)); motion.calls.length = 0;
  await completeAndEditWorkoutSet(app, strength.name); await app.change('Weight (kg, optional)', '12'); await app.change('Reps (optional)', '8'); await app.press('Save');
  assert.equal(motion.calls.length, 0); assert.equal(f.fitness.readSession(session.id).exercises[0].sets.length, 1);
  assert.ok(app.find('Pressable', `${strength.name}, set 1. 12 kg, 8 reps`));
});

test('real Hearth controls preserve full targets, selected/expanded state, wrapping and callbacks', async (t) => {
  let presses = 0;
  const app = await mount(createElement(design.DesignProvider, null, createElement(design.UiButton, {
    label: 'A long contextual action with accents Educação', selected: true, expanded: true, variant: 'navigation', onPress: () => presses++,
  })), null); t.after(app.unmount);
  const button = app.find('Pressable', 'A long contextual action with accents Educação');
  const state = button.props.accessibilityState as { selected: boolean; expanded: boolean }; assert.ok(state.selected && state.expanded);
  const style = flatten(button.props.style);
  assert.ok(Number(style.minWidth) >= TouchTarget && Number(style.minHeight) >= TouchTarget);
  assert.ok(!app.nodes().some((node) => node.props?.numberOfLines === 1)); await app.tapSet('A long contextual action with accents Educação'); assert.equal(presses, 1);
  assert.equal(canSlideNavigationIndicator([{ y: 0 }, { y: 0 }], 1), true);
  assert.equal(canSlideNavigationIndicator([{ y: 0 }, { y: 48 }], 1), false);
  assert.equal(canSlideNavigationIndicator([{ y: 0 }, { y: 0 }], 2), false);
});

test('Manrope load failure falls back to readable system typography without blocking content', async (t) => {
  font.state.loaded = false; font.state.error = new Error('Injected font load failure');
  t.after(() => { font.state.loaded = true; font.state.error = null; });
  const app = await mount(createElement(design.DesignProvider, null, createElement(design.UiText, { type: 'cardTitle' }, 'Álvaro · 12,5 kg')), null); t.after(app.unmount);
  const text = app.find('ThemedText'); const style = flatten(text.props.style);
  assert.equal(style.fontFamily, undefined); assert.equal(style.fontWeight, '600'); assert.ok(text.textContent.includes('Álvaro'));
  assert.equal(interfaceFontStyle(true, 'regular').fontFamily, 'AxisManrope-Regular');
  assert.equal(interfaceFontStyle(true, 'semibold').fontFamily, 'AxisManrope-SemiBold');
  assert.equal(interfaceFontStyle(true, 'semibold', true).fontFamily, undefined);
});

test('bundled Manrope and Lora are static, correctly weighted, licensed fonts with accented glyphs', () => {
  for (const [family, name, weight] of [['manrope', 'Regular', 400], ['manrope', 'SemiBold', 600], ['lora', 'SemiBold', 600]] as const) {
    const buffer = readFileSync(`assets/fonts/${family}/${family === 'lora' ? 'Lora' : 'Manrope'}-${name}.ttf`);
    assert.equal(buffer.readUInt32BE(0), 0x00010000);
    const tables = new Map<string, number>();
    for (let i = 0; i < buffer.readUInt16BE(4); i++) { const at = 12 + i * 16; tables.set(buffer.toString('ascii', at, at + 4), buffer.readUInt32BE(at + 8)); }
    assert.ok(!tables.has('fvar')); assert.equal(buffer.readUInt16BE(tables.get('OS/2')! + 4), weight);
    const gsub = tables.get('GSUB')!; const features = gsub + buffer.readUInt16BE(gsub + 6);
    const tags = Array.from({ length: buffer.readUInt16BE(features) }, (_, i) => buffer.toString('ascii', features + 2 + i * 6, features + 6 + i * 6));
    if (family === 'manrope') assert.ok(tags.includes('tnum'));
    const cmap = tables.get('cmap')!;
    const subtables = Array.from({ length: buffer.readUInt16BE(cmap + 2) }, (_, i) => cmap + buffer.readUInt32BE(cmap + 4 + i * 8 + 4));
    const at = subtables.find((offset) => buffer.readUInt16BE(offset) === 4)!; assert.ok(at);
    const count = buffer.readUInt16BE(at + 6) / 2;
    for (const char of 'Álvaro Educação Café João R$0123456789,.–') {
      const code = char.codePointAt(0)!;
      const segment = Array.from({ length: count }, (_, i) => i).find((i) => code <= buffer.readUInt16BE(at + 14 + i * 2) && code >= buffer.readUInt16BE(at + 16 + count * 2 + i * 2));
      assert.notEqual(segment, undefined, `${name}: ${char}`);
      const i = segment!; const delta = buffer.readInt16BE(at + 16 + count * 4 + i * 2);
      const rangeAt = at + 16 + count * 6 + i * 2; const range = buffer.readUInt16BE(rangeAt);
      const start = buffer.readUInt16BE(at + 16 + count * 2 + i * 2);
      const glyph = range ? buffer.readUInt16BE(rangeAt + range + (code - start) * 2) : (code + delta) & 0xffff;
      assert.notEqual(glyph, 0, `${name}: missing ${char}`);
    }
  }
  assert.match(readFileSync('assets/fonts/manrope/OFL.txt', 'utf8'), /SIL OPEN FONT LICENSE Version 1\.1/);
  assert.match(readFileSync('assets/fonts/lora/OFL.txt', 'utf8'), /SIL OPEN FONT LICENSE Version 1\.1/);
});

test('serif is limited to screen titles; display failure preserves Manrope content', async (t) => {
  const app = await mount(createElement(design.DesignProvider, null,
    createElement(design.UiText, { type: 'screenTitle' }, 'Tasks'),
    createElement(design.UiText, { type: 'sectionHeading' }, 'Today'),
    createElement(design.UiText, { type: 'numeric' }, '12,5 kg')), null); t.after(app.unmount);
  const texts = app.nodes().filter((node) => node.kind === 'ThemedText');
  assert.equal(flatten(texts[0].props.style).fontFamily, 'AxisLora-SemiBold');
  assert.equal(flatten(texts[1].props.style).fontFamily, 'AxisManrope-SemiBold');
  assert.equal(flatten(texts[2].props.style).fontFamily, 'AxisManrope-SemiBold');
  assert.deepEqual(flatten(texts[2].props.style).fontVariant, ['tabular-nums']);
  await app.unmount(); font.state.displayLoaded = false; font.state.displayError = new Error('Lora failure');
  t.after(() => { font.state.displayLoaded = true; font.state.displayError = null; });
  const fallback = await mount(createElement(design.DesignProvider, null,
    createElement(design.UiText, { type: 'screenTitle' }, 'Fitness'),
    createElement(design.UiText, { type: 'cardTitle' }, 'Álvaro')), null); t.after(fallback.unmount);
  const rows = fallback.nodes().filter((node) => node.kind === 'ThemedText');
  assert.equal(flatten(rows[0].props.style).fontFamily, undefined);
  assert.equal(flatten(rows[1].props.style).fontFamily, 'AxisManrope-SemiBold');
});

test('all authoritative measurement types determine icons, columns, optional values and set editing', async (t) => {
  const f = await initialized(t); const session = f.fitness.startWorkout();
  const sources = f.fitness.readOverview().exercises;
  const drafts = { strength: { weight: '12,5', reps: '10' }, bodyweight: { reps: '12' },
    duration: { minutes: '2', seconds: '30' }, distance: { distance: '2,5' } };
  for (const type of ['strength', 'bodyweight', 'duration', 'distance'] as const) {
    const source = sources.find((row) => row.measurementType === type)!;
    const id = f.fitness.addSessionExercise(session.id, source.id);
    f.fitness.addSet(id, { ...blankSet(), ...drafts[type] });
    if (type === 'bodyweight') f.fitness.addSet(id, { ...blankSet(), reps: '10', weight: '5' });
    if (type === 'distance') f.fitness.addSet(id, { ...blankSet(), distance: '3', minutes: '20' });
  }
  const detail = f.fitness.readSession(session.id);
  const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  assert.equal(app.find('FormButton', 'Finish Workout').props.feature, 'fitness');
  const expected = { strength: ['Weight', 'Reps'], bodyweight: ['Reps', 'Added weight'], duration: ['Duration'], distance: ['Distance', 'Time'] };
  assert.deepEqual(measurementIcons, { strength: 'dumbbell', bodyweight: 'activity', duration: 'timer', distance: 'route' });
  for (const exercise of detail.exercises) {
    const children = app.nodes(app.nodes().find((node) => node.props?.testID === `exercise-group-${exercise.id}`)!);
    assert.ok(children.some((node) => node.props?.testID === `icon-${measurementIcons[exercise.measurementType]}`));
    const columns = workoutSetColumns(exercise.measurementType, exercise.sets);
    assert.deepEqual(columns, expected[exercise.measurementType]);
    assert.ok(children.some((node) => node.props?.testID === `set-columns-${exercise.id}`));
    const cells = workoutSetCells(exercise.sets[0], columns);
    if (exercise.measurementType === 'bodyweight' || exercise.measurementType === 'distance') assert.equal(cells.at(-1), '—');
    for (const value of cells) assert.ok(children.some((node) => node.textContent === value));
    assert.ok(children.some((node) => node.props?.accessibilityHint === 'Opens set details. Delete is available in the editor.'));
  }
  assert.deepEqual(workoutSetColumns('bodyweight', [detail.exercises[1].sets[0]]), ['Reps']);
  assert.deepEqual(workoutSetColumns('distance', [detail.exercises[3].sets[0]]), ['Distance']);
});

test('large text reflows measurement rows and task completion remains a circle with a full target', async (t) => {
  const f = await initialized(t); const source = f.fitness.readOverview().exercises.find((row) => row.measurementType === 'strength')!;
  const session = f.fitness.startWorkout(); const id = f.fitness.addSessionExercise(session.id, source.id);
  f.fitness.addSet(id, { ...blankSet(), weight: '12', reps: '8' });
  const native = runtime.native as { useWindowDimensions: () => { height: number; width: number; scale: number; fontScale: number } };
  t.mock.method(native, 'useWindowDimensions', () => ({ width: 320, height: 800, scale: 1, fontScale: 2 }));
  const app = await mount(createElement(screens.FitnessScreen), f.db); t.after(app.unmount);
  assert.ok(!app.nodes().some((node) => String(node.props?.testID).startsWith('set-columns-')));
  assert.ok(app.nodes().some((node) => node.textContent === 'Set 1'));
  const set = app.find('Pressable', `${source.name}, set 1. 12 kg, 8 reps`);
  assert.equal(flatten(set.props.style).flexDirection, 'column'); await app.unmount();
  f.tasks.createTask({ ...taskDraft(), title: 'Circle', date: today });
  const tasks = await mount(createElement(screens.TasksScreen), f.db); t.after(tasks.unmount);
  const checkbox = tasks.nodes().find((node) => node.kind === 'Pressable' && node.props.accessibilityRole === 'checkbox')!;
  assert.ok(Number(flatten(checkbox.props.style).minHeight) >= TouchTarget);
  const ring = tasks.nodes(checkbox).find((node) => flatten(node.props.style).width === 24)!;
  assert.equal(flatten(ring.props.style).borderRadius, 12);
});

test('Tasks fidelity headers own semantic icons, existing counts, plain rows and continuous region surfaces', async (t) => {
  const f = await initialized(t);
  f.tasks.createTask({ ...taskDraft(), title: 'Owned Today row', date: today });
  f.tasks.createTask({ ...taskDraft(), title: 'Owned To-do row' });
  f.tasks.createTask({ ...taskDraft(), title: 'Past', date: '2026-10-13' });
  f.tasks.createTask({ ...taskDraft(), title: 'Future', date: '2026-10-15' });
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  for (const [section, icon] of [['Today', 'sun'], ['To-do', 'list'], ['Earlier', 'clock'], ['Upcoming', 'calendar']]) {
    const header = app.nodes().find((node) => node.props?.testID === `task-section-${section}`)!;
    assert.ok(app.nodes(header).some((node) => node.props?.testID === `icon-${icon}`));
    assert.ok(app.nodes(header).some((node) => node.kind === 'ThemedText' && node.props.accessibilityRole === 'header' && node.textContent === section));
    if (section === 'Today' || section === 'To-do') {
      if (section === 'Today') assert.ok(app.nodes(header).some((node) => node.props?.testID === 'today-progress'));
      else assert.equal(app.nodes(header).find((node) => node.props?.testID === `task-section-count-${section}`)!.textContent, '1');
      const footer = app.nodes().find((node) => node.props?.testID === `task-section-${section}-footer`)!;
      assert.equal(flatten(footer.props.style).backgroundColor, flatten(header.props.style).backgroundColor);
    } else {
      assert.ok(header.textContent.includes('1 task'));
      assert.equal((header.props.accessibilityState as { expanded: boolean }).expanded, false);
    }
  }
  const todayHeader = app.nodes().find((node) => node.props?.testID === 'task-section-Today')!;
  assert.equal(flatten(todayHeader.props.style).backgroundColor, DesignColors.light.surface);
  const row = app.nodes().find((node) => String(node.props?.testID).startsWith('task-row-'))!;
  assert.equal(flatten(row.props.style).backgroundColor, DesignColors.light.surface);
  assert.equal(flatten(row.props.style).borderRadius, undefined, 'Rows remain slices, not individual cards');
  assert.ok(!app.container.textContent.includes('completed today'));
});

test('Task disclosure press feedback and live Reduced Motion preserve state and source data', async (t) => {
  const f = await initialized(t); f.tasks.createTask({ ...taskDraft(), title: 'Earlier source', date: '2026-10-13' });
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  const header = app.find('Pressable', 'Earlier, 1 tasks'); motion.calls.length = 0;
  await act(() => (header.props.onPressIn as (event: unknown) => void)({}));
  assert.equal(flatten(header.props.style).backgroundColor, DesignColors.light.selected);
  assert.ok(motion.calls.some((call) => call.config.duration === 120));
  await act(() => (header.props.onPressOut as (event: unknown) => void)({}));
  await act(() => (runtime.reduceMotion as (value: boolean) => void)(true)); motion.calls.length = 0;
  await app.tapSet('Earlier, 1 tasks');
  assert.equal((app.find('Pressable', 'Earlier, 1 tasks').props.accessibilityState as { expanded: boolean }).expanded, true);
  assert.ok(app.container.textContent.includes('Earlier source')); assert.equal(motion.calls.length, 0);
  assert.equal(f.tasks.read().tasks.length, 1);
});

test('Task row typography preserves long real metadata and independent accessible targets at large text', async (t) => {
  const f = await initialized(t); const category = f.tasks.createCategory('Personal health and family routines');
  const title = 'Prepare the appointment notes and medication list for Álvaro';
  f.tasks.createTask({ ...taskDraft(), title, date: today, time: '18:00', categoryId: category.id, priority: 'high',
    recurrence: { frequency: 'daily', interval: 3, weekdayMask: 37, monthDay: 14, month: 10, endDate: '' } });
  const native = runtime.native as { useWindowDimensions: () => { width: number; height: number; scale: number; fontScale: number } };
  t.mock.method(native, 'useWindowDimensions', () => ({ width: 320, height: 800, scale: 1, fontScale: 2 }));
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  const information = app.nodes().find((node) => node.props?.testID === `task-information-${f.tasks.read().tasks[0].id}`)!;
  const row = app.nodes().find((node) => String(node.props?.testID).startsWith('task-row-'))!;
  assert.equal(flatten(row.props.style).alignItems, 'flex-start', 'Long metadata must not vertically center controls far below the title');
  const label = String(information.props.accessibilityLabel);
  for (const text of [title, 'Every 3 days', category.name, 'High']) assert.ok(label.includes(text));
  const titleNode = app.nodes(information).find((node) => node.textContent === title)!;
  assert.equal(flatten(titleNode.props.style).fontFamily, 'AxisManrope-Regular');
  assert.equal(titleNode.props.numberOfLines, undefined);
  const check = app.nodes().find((node) => node.props?.accessibilityRole === 'checkbox')!;
  assert.ok(Number(flatten(check.props.style).minHeight) >= TouchTarget);
  const actions = app.nodes().find((node) => node.kind === 'FormButton' && String(node.props?.accessibilityLabel).startsWith(`Actions for ${title}`))!;
  assert.ok(actions && typeof actions.props.onPress === 'function');
  assert.equal(information.kind, 'View'); assert.equal(information.props.accessibilityRole, 'text');
  assert.equal(information.props.onPress, undefined); assert.equal(information.props.accessibilityHint, undefined);
  await app.press(String(actions.props.accessibilityLabel)); await app.press('Edit recurring task');
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
  assert.equal(app.find('FormField', 'Title *').props.value, title);
  assert.equal(f.tasks.read().tasks.length, 1, 'Opening the existing editor does not mutate the task');
});

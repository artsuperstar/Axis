/** Review-only RN Web galleries using real components and an in-memory database. No app route or font switch. */
import { Module, createRequire, registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createElement } from 'react';

import { renderControl } from '../tests/helpers/form-components';
import { journalDatabase } from '../tests/helpers/journal';
import { taskDraft } from '../src/features/tasks/form';
import { blankSet, blankTargets } from '../src/features/fitness/form';
import { DesignColors } from '../src/constants/design-system-v2';

const require = createRequire(import.meta.url);
const { View, StyleSheet, Dimensions, Appearance } = require('react-native-web');
let taskState: ReturnType<typeof import('../src/features/tasks/use-tasks').useTasks>;
let fitnessState: ReturnType<typeof import('../src/features/fitness/use-fitness').useFitness>;
// Only hook and OS boundaries are replaced. Screen/component composition is production code.
registerHooks({ resolve(specifier, context, next) {
  const exports = specifier === './use-tasks' ? { useTasks: () => taskState }
    : specifier === './use-fitness' ? { useFitness: () => fitnessState }
      : specifier === 'react-native-screens/experimental' ? { SafeAreaView: View } : null;
  if (!exports) return next(specifier, context);
  const url = new URL(`../dist/preview-${specifier.replace(/[^a-z]/g, '')}.cjs`, import.meta.url);
  const path = fileURLToPath(url);
  if (!require.cache[path]) {
    const module = new Module(path); module.filename = path; module.loaded = true; module.exports = exports; require.cache[path] = module;
  }
  return { url: url.href, shortCircuit: true };
} });
const { TasksScreen } = require('../src/features/tasks/tasks-screen') as typeof import('../src/features/tasks/tasks-screen');
const { FitnessScreen } = require('../src/features/fitness/fitness-screen') as typeof import('../src/features/fitness/fitness-screen');
const output = 'dist/design-system-preview';
const noop = () => {};

async function main() {
  mkdirSync(output, { recursive: true });
  const f = await journalDatabase(); f.setTime('2026-10-14');
  try {
    for (let i = 0; i < 19; i++) f.tasks.createTask({ ...taskDraft(), title: `Earlier item ${i + 1}`, date: '2026-10-13' });
    f.tasks.createTask({ ...taskDraft(), title: 'Weekly yep', date: '2026-10-14', recurrence: { frequency: 'weekly', interval: 1, weekdayMask: 37, monthDay: 14, month: 10, endDate: '' } });
    f.tasks.createTask({ ...taskDraft(), title: 'Daily', date: '2026-10-14', recurrence: { frequency: 'daily', interval: 1, weekdayMask: 74, monthDay: 14, month: 10, endDate: '' } });
    f.tasks.createTask({ ...taskDraft(), title: 'Once' });
    const exercise = f.fitness.readOverview().exercises.find((row) => row.name === 'Bicep Curl')!;
    const second = f.fitness.createExercise({ name: 'Pull-down', measurementType: 'strength' });
    const routine = f.fitness.createRoutine({ name: 'Biceps, Back', exercises: [exercise, second].map((row) => ({ id: null, exerciseId: row.id,
      targets: { ...blankTargets(), setCount: '3', repMin: '8', repMax: '12' } })) });
    const session = f.fitness.startWorkout(routine); const detail = f.fitness.readSession(session.id);
    f.fitness.addSet(detail.exercises[0].id, { ...blankSet(), weight: '12', reps: '10' });
    f.fitness.addSet(detail.exercises[0].id, { ...blankSet(), weight: '12', reps: '9' });
    const tasks = f.tasks.read();
    const baseWorkout = f.fitness.readSession(session.id);
    const category = f.tasks.createCategory('Personal health and family routines');
    f.tasks.createTask({ ...taskDraft(), title: 'Prepare the appointment notes and medication list for Álvaro', date: '2026-10-14', time: '18:00', categoryId: category.id,
      priority: 'high', recurrence: { frequency: 'daily', interval: 3, weekdayMask: 37, monthDay: 14, month: 10, endDate: '' } });
    for (let i = 0; i < 20; i++) f.tasks.createTask({ ...taskDraft(), title: `Today item ${i + 1}`, date: '2026-10-14' });
    const denseTasks = f.tasks.read();
    f.fitness.saveNote(session.id, detail.exercises[0].id, 'Keep the return controlled; adjust weight only when the movement feels comfortable.');
    for (let i = 0; i < 6; i++) f.fitness.addSet(detail.exercises[0].id, { ...blankSet(), weight: '12,5', reps: '8' });
    for (const type of ['bodyweight', 'duration', 'distance'] as const) {
      const source = f.fitness.readOverview().exercises.find((row) => row.measurementType === type)!;
      const id = f.fitness.addSessionExercise(session.id, source.id);
      f.fitness.addSet(id, { ...blankSet(), ...(type === 'bodyweight' ? { reps: '12' } : type === 'duration' ? { minutes: '2', seconds: '30' } : { distance: '2,5', minutes: '15' }) });
    }
    const long = f.fitness.createExercise({ name: 'Single-leg Romanian deadlift with slow controlled return', measurementType: 'strength' });
    f.fitness.addSessionExercise(session.id, long.id);
    const denseWorkout = f.fitness.readSession(session.id);
    const fontCss = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']].map(([folder, name]) =>
      `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')}) format('truetype');font-weight:400;font-display:block}`).join('');
    for (const width of [320, 390]) for (const scheme of ['dark', 'light'] as const) for (const screen of ['tasks', 'fitness']) {
      Appearance.getColorScheme = () => scheme;
      Dimensions.set({ window: { width, height: 1100, scale: 1, fontScale: 1 }, screen: { width, height: 1100, scale: 1, fontScale: 1 } });
      for (const variant of ['normal', ...(width === 390 ? screen === 'tasks' ? ['large-text', 'dense', 'empty'] : ['large-text', 'dense'] : [])]) {
        const large = variant === 'large-text';
        // Tall review viewport exposes all four real measurement types in the dense fixture.
        const height = screen === 'fitness' && variant === 'dense' ? 3200 : 1100;
        Dimensions.set({ window: { width, height, scale: 1, fontScale: large ? 2 : 1 }, screen: { width, height, scale: 1, fontScale: large ? 2 : 1 } });
        const taskData = variant === 'dense' ? denseTasks : tasks;
        taskState = { access: f.tasks, snapshot: variant === 'empty' ? { ...taskData, tasks: [], items: [] } : taskData,
          presentationNow: f.now(), error: null, reload: noop, mutate: (action) => action() };
        fitnessState = { access: f.fitness, snapshot: f.fitness.readOverview(), activeDetail: variant === 'dense' ? denseWorkout : baseWorkout,
          detail: null, lastWorkout: null, nextWorkout: null, rotationSteps: [], routines: [], routinesLoaded: false, historyLoaded: false,
          error: null, reload: noop, mutate: (action) => action(), openSession: noop, closeSession: noop, loadMoreHistory: noop };
        const result = renderControl(() => createElement(View, { style: { width, height, backgroundColor: DesignColors[scheme].canvas } },
          createElement(screen === 'tasks' ? TasksScreen : FitnessScreen)));
        const css = StyleSheet.getSheet().textContent;
        const scale = large ? `<script>document.fonts.ready.then(()=>{document.querySelectorAll('[dir="auto"]').forEach(e=>{const s=getComputedStyle(e);e.style.fontSize=(parseFloat(s.fontSize)*2)+'px';if(s.lineHeight!=='normal')e.style.lineHeight=(parseFloat(s.lineHeight)*2)+'px'})})</script>` : '';
        writeFileSync(`${output}/${screen}-${scheme}-${width}-${variant}.html`, `<!doctype html><html><head><meta charset="utf-8"><style>${fontCss}${css}body{margin:0;background:${DesignColors[scheme].canvas};font-family:system-ui}</style></head><body>${result.markup}${scale}</body></html>`);
      }
    }
    console.log(`Generated Design System v2 review galleries in ${output}. These are component previews, not native screenshots.`);
  } finally { f.sqlite.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

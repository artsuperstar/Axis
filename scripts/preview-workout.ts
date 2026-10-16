/** Actual component captures for review. RN Web rendering is not physical native acceptance. */
import { Module, createRequire, registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createElement } from 'react';
import { randomUUID } from 'node:crypto';

import { renderControl } from '../tests/helpers/form-components';
import { journalDatabase } from '../tests/helpers/journal';
import { blankSet, blankTargets } from '../src/features/fitness/form';
import { createRotationDataAccess } from '../src/features/fitness/rotations-data';
import { DesignColors } from '../src/constants/design-system-v2';

const require = createRequire(import.meta.url);
const { View, StyleSheet, Dimensions, Appearance } = require('react-native-web');
let state: ReturnType<typeof import('../src/features/fitness/use-fitness').useFitness>;
registerHooks({ resolve(specifier, context, next) {
  const exports = specifier === './use-fitness' ? { useFitness: () => state }
    : specifier === 'react-native-screens/experimental' ? { SafeAreaView: View } : null;
  if (!exports) return next(specifier, context);
  const path = fileURLToPath(new URL(`../dist/workout-preview-${specifier.replace(/[^a-z]/g, '')}.cjs`, import.meta.url));
  if (!require.cache[path]) { const module = new Module(path); module.filename = path; module.loaded = true; module.exports = exports; require.cache[path] = module; }
  return { url: new URL(`file:///${path.replace(/\\/g, '/')}`).href, shortCircuit: true };
} });
const { FitnessScreen } = require('../src/features/fitness/fitness-screen') as typeof import('../src/features/fitness/fitness-screen');
const output = 'dist/workout-review'; const noop = () => {};
async function main() {
  mkdirSync(output, { recursive: true }); const f = await journalDatabase();
  try {
    const sources = f.fitness.readOverview().exercises;
    const empty = f.fitness.readOverview();
    const routineIds = ['Pull Day', 'Push Day', 'Leg Day', 'Full Body'].map((name) => f.fitness.createRoutine({ name,
      exercises: ['strength', 'bodyweight', 'duration', 'distance'].map((type, index) => ({ id: null, exerciseId: sources.find((row) => row.measurementType === type)!.id,
        targets: { ...blankTargets(), setCount: index < 2 ? '3' : '', ...(type === 'strength' || type === 'bodyweight' ? { repMin: '8', repMax: '12' } : type === 'duration' ? { seconds: '45' } : { distance: '2.5' }) } })) }));
    const last = f.fitness.startWorkout(routineIds[1]); f.fitness.finishWorkout(last.id);
    const launch = f.fitness.readOverview();
    const rotations = createRotationDataAccess(f.db, randomUUID);
    const rotationId = rotations.create({ name: 'Weekly rotation', steps: routineIds.map((routineId) => ({ id: null, routineId })) }); rotations.activate(rotationId);
    const rotation = rotations.readNext();
    const session = f.fitness.startWorkout(routineIds[0]);
    const entries = f.fitness.readSession(session.id).exercises;
    f.fitness.addSet(entries[0].id, { ...blankSet(), weight: '25', reps: '10' });
    f.fitness.addSet(entries[0].id, blankSet());
    for (let index = 0; index < 3; index++) f.fitness.addSet(entries[1].id, blankSet());
    f.fitness.addSet(entries[2].id, { ...blankSet(), seconds: '45' });
    f.fitness.addSet(entries[3].id, { ...blankSet(), distance: '2.5' });
    f.fitness.setExerciseCompleted(entries[3].id, true);
    const active = f.fitness.readSession(session.id);
    const fontCss = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']].map(([folder, name]) =>
      `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')}) format('truetype');font-weight:400;font-display:block}`).join('');
    for (const scheme of ['light', 'dark'] as const) for (const width of [320, 390, 430]) for (const variant of ['landing', 'active', 'long-active', 'empty', ...(width === 320 ? ['large-landing', 'large-active'] : [])]) {
      const large = variant.startsWith('large'); const isActive = variant.endsWith('active'); const height = 1100;
      Appearance.getColorScheme = () => scheme;
      Dimensions.set({ window: { width, height, scale: 1, fontScale: large ? 2 : 1 }, screen: { width, height, scale: 1, fontScale: large ? 2 : 1 } });
      state = { access: f.fitness, snapshot: variant === 'empty' ? empty : isActive ? f.fitness.readOverview() : launch,
        activeDetail: isActive ? variant === 'long-active' ? { ...active, name: 'Pull Day \u2014 Back, biceps and a longer workout name' } : active : null, detail: null, lastWorkout: variant === 'empty' ? null : launch.history[0], nextWorkout: variant === 'empty' ? null : rotation,
        rotationSteps: [], routines: [], routinesLoaded: false, historyLoaded: false, error: null, reload: noop,
        mutate: (action) => action(), openSession: noop, closeSession: noop, loadMoreHistory: noop };
      const { markup } = renderControl(() => createElement(View, { style: { width, height, backgroundColor: DesignColors[scheme].canvas } }, createElement(FitnessScreen)));
      const scale = large ? `<script>document.fonts.ready.then(()=>document.querySelectorAll('[dir="auto"]').forEach(e=>{const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'}))</script>` : '';
      writeFileSync(`${output}/${variant}-${scheme}-${width}.html`, `<!doctype html><html><head><meta charset="utf-8"><style>${fontCss}${StyleSheet.getSheet().textContent}body{margin:0;background:${DesignColors[scheme].canvas}}</style></head><body>${markup}${scale}</body></html>`);
    }
    console.log(`Actual FitnessScreen review captures: ${output}. Source-backed fixtures; light/dark, empty, 320/390/430 width and large text.`);
  } finally { f.sqlite.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

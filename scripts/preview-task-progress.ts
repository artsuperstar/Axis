/** Stage 14D.2: real TasksScreen and source-backed fixtures through RN Web; not native screenshots. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Module, createRequire, registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';

import { renderControl } from '../tests/helpers/form-components';
import { journalDatabase } from '../tests/helpers/journal';
import { taskDraft } from '../src/features/tasks/form';
import { DesignColors } from '../src/constants/design-system-v2';

const require = createRequire(import.meta.url);
const { View, Appearance, Dimensions, StyleSheet } = require('react-native-web');
let state: ReturnType<typeof import('../src/features/tasks/use-tasks').useTasks>;
registerHooks({ resolve(specifier, context, next) {
  const exports = specifier === './use-tasks' ? { useTasks: () => state }
    : specifier === 'react-native-screens/experimental' ? { SafeAreaView: View } : null;
  if (!exports) return next(specifier, context);
  const url = new URL(`../dist/task-progress-${specifier.replace(/[^a-z]/g, '')}.cjs`, import.meta.url);
  const path = fileURLToPath(url);
  if (!require.cache[path]) {
    const module = new Module(path); module.filename = path; module.loaded = true; module.exports = exports; require.cache[path] = module;
  }
  return { url: url.href, shortCircuit: true };
} });
const { TasksScreen } = require('../src/features/tasks/tasks-screen') as typeof import('../src/features/tasks/tasks-screen');

async function main() {
  const output = 'dist/task-daily-progress'; mkdirSync(output, { recursive: true });
  const f = await journalDatabase(); f.setTime('2026-10-14');
  try {
    const titles = ['Finish the report', 'Read', 'Evening routine', 'Morning routine', 'Take medication', 'Go for a walk'];
    const ids = titles.map((title, index) => f.tasks.createTask({ ...taskDraft(), title, date: '2026-10-14',
      time: index === 2 ? '21:00' : index === 3 ? '07:00' : '', priority: index === 0 ? 'high' : 'none' }));
    f.tasks.createTask({ ...taskDraft(), title: 'Once' });
    f.tasks.createTask({ ...taskDraft(), title: 'Plan next week', date: '2026-10-15' });
    f.tasks.createTask({ ...taskDraft(), title: 'Call dentist', date: '2026-10-17' });
    f.tasks.createTask({ ...taskDraft(), title: 'Earlier item', date: '2026-10-13' });
    for (const id of ids.slice(3)) f.tasks.setCompleted(id, true);
    const partial = f.tasks.read();
    for (const id of ids.slice(0, 3)) f.tasks.setCompleted(id, true);
    const complete = f.tasks.read();
    const fontCss = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']].map(([folder, name]) =>
      `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')}) format('truetype');font-weight:400;font-display:block}`).join('');
    for (const scheme of ['light', 'dark'] as const) for (const width of [320, 390]) for (const variant of width === 390 ? ['partial', 'complete', 'large-text'] : ['partial', 'large-text']) {
      const large = variant === 'large-text'; const height = large ? 1500 : 1050;
      Appearance.getColorScheme = () => scheme;
      Dimensions.set({ window: { width, height, scale: 1, fontScale: large ? 2 : 1 }, screen: { width, height, scale: 1, fontScale: large ? 2 : 1 } });
      state = { access: f.tasks, snapshot: variant === 'complete' ? complete : partial, presentationNow: f.now(), error: null, reload() {}, mutate: (action) => action() };
      const { markup } = renderControl(() => createElement(View, { style: { width, height, backgroundColor: DesignColors[scheme].canvas } }, createElement(TasksScreen)));
      // RN Web does not apply native OS font scaling. Explicitly simulate it, labelled in the review.
      const scale = large ? `<script>document.fonts.ready.then(()=>{document.querySelectorAll('[dir="auto"]').forEach(e=>{const s=getComputedStyle(e);e.style.fontSize=(parseFloat(s.fontSize)*2)+'px';if(s.lineHeight!=='normal')e.style.lineHeight=(parseFloat(s.lineHeight)*2)+'px'})})</script>` : '';
      writeFileSync(`${output}/tasks-${scheme}-${width}-${variant}.html`, `<!doctype html><html><head><meta charset="utf-8"><style>${fontCss}${StyleSheet.getSheet().textContent}body{margin:0;background:${DesignColors[scheme].canvas}}</style></head><body>${markup}${scale}</body></html>`);
    }
    console.log(`10 real-component layouts written to ${output}. RN Web captures; large-text variants explicitly simulate 2× native scaling.`);
  } finally { f.sqlite.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

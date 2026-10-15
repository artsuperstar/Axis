/** Stage 14D.1: actual TasksScreen, identical source fixtures before/after. Not native screenshots. */
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
  const url = new URL(`../dist/task-fidelity-${specifier.replace(/[^a-z]/g, '')}.cjs`, import.meta.url);
  const path = fileURLToPath(url);
  if (!require.cache[path]) {
    const module = new Module(path); module.filename = path; module.loaded = true; module.exports = exports; require.cache[path] = module;
  }
  return { url: url.href, shortCircuit: true };
} });
const { TasksScreen } = require('../src/features/tasks/tasks-screen') as typeof import('../src/features/tasks/tasks-screen');

async function main() {
  const phase = process.argv.includes('--before') ? 'before' : 'after';
  const output = `dist/tasks-fidelity-${phase}`;
  mkdirSync(output, { recursive: true });
  const f = await journalDatabase(); f.setTime('2026-10-14');
  const empty = await journalDatabase(); empty.setTime('2026-10-14');
  try {
    for (let i = 0; i < 19; i++) f.tasks.createTask({ ...taskDraft(), title: `Earlier item ${i + 1}`, date: '2026-10-13' });
    f.tasks.createTask({ ...taskDraft(), title: 'Weekly yep', date: '2026-10-14', recurrence: { frequency: 'weekly', interval: 1, weekdayMask: 37, monthDay: 14, month: 10, endDate: '' } });
    f.tasks.createTask({ ...taskDraft(), title: 'Daily', date: '2026-10-14', recurrence: { frequency: 'daily', interval: 1, weekdayMask: 74, monthDay: 14, month: 10, endDate: '' } });
    f.tasks.createTask({ ...taskDraft(), title: 'Once' });
    const populated = f.tasks.read();
    for (const item of populated.items) if (item.occurrence?.scheduledDate === '2026-10-14') f.tasks.setOccurrenceStatus(item.occurrence.id, 'completed');
    const device = f.tasks.read();
    const category = f.tasks.createCategory('Personal health and family routines');
    f.tasks.createTask({ ...taskDraft(), title: 'Prepare the appointment notes and medication list for Álvaro', date: '2026-10-14', time: '18:00', categoryId: category.id,
      priority: 'high', description: 'Keep the test results and follow-up questions together.',
      recurrence: { frequency: 'daily', interval: 3, weekdayMask: 37, monthDay: 14, month: 10, endDate: '' } });
    const longContent = f.tasks.read();
    for (let i = 0; i < 20; i++) f.tasks.createTask({ ...taskDraft(), title: `Today item ${i + 1}`, date: '2026-10-14' });
    for (let i = 0; i < 8; i++) f.tasks.createTask({ ...taskDraft(), title: `To-do item ${i + 1}` });
    const dense = f.tasks.read();
    const fontCss = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']].map(([folder, name]) =>
      `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')}) format('truetype');font-weight:400;font-display:block}`).join('');
    for (const scheme of ['light', 'dark'] as const) for (const width of phase === 'before' ? [390] : [320, 390]) {
      for (const variant of width === 320 || phase === 'before' ? ['normal', 'device'] : ['normal', 'device', 'dense', 'long', 'large-text', 'empty']) {
        const large = variant === 'large-text'; const height = 900;
        Appearance.getColorScheme = () => scheme;
        Dimensions.set({ window: { width, height, scale: 1, fontScale: large ? 2 : 1 }, screen: { width, height, scale: 1, fontScale: large ? 2 : 1 } });
        const snapshot = variant === 'device' ? device : variant === 'empty' ? empty.tasks.read() : variant === 'dense' ? dense : large || variant === 'long' ? longContent : populated;
        state = { access: f.tasks, snapshot, presentationNow: f.now(), error: null, reload() {}, mutate: (action) => action() };
        const { markup } = renderControl(() => createElement(View, { style: { width, height, backgroundColor: DesignColors[scheme].canvas } }, createElement(TasksScreen)));
        const scale = large ? `<script>document.fonts.ready.then(()=>{document.querySelectorAll('[dir="auto"]').forEach(e=>{const s=getComputedStyle(e);e.style.fontSize=(parseFloat(s.fontSize)*2)+'px';if(s.lineHeight!=='normal')e.style.lineHeight=(parseFloat(s.lineHeight)*2)+'px'})})</script>` : '';
        writeFileSync(`${output}/tasks-${scheme}-${width}-${variant}.html`, `<!doctype html><html><head><meta charset="utf-8"><style>${fontCss}${StyleSheet.getSheet().textContent}body{margin:0;background:${DesignColors[scheme].canvas}}</style></head><body>${markup}${scale}</body></html>`);
      }
    }
    console.log(`Actual TasksScreen previews: ${output}; ${phase}. Source-backed fixtures; no simulated native chrome.`);
  } finally { f.sqlite.close(); empty.sqlite.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

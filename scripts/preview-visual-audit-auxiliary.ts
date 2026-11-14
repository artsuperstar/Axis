/** Audit-only source components for nested states missing from incumbent preview entry points. */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { journalDatabase } from '../tests/helpers/journal';
import { workDraft } from '../src/features/finance/work/form';
import { taskDraft } from '../src/features/tasks/form';
import { blankSet } from '../src/features/fitness/form';

const output = resolve('dist/visual-audit-auxiliary'); mkdirSync(output, { recursive: true });
const native = resolve(output, 'native.jsx'), entry = resolve(output, 'entry.jsx');
writeFileSync(native, readFileSync('scripts/preview-work-editor-v2.ts', 'utf8').match(/writeFileSync\(native, `([\s\S]*?)`\);/)![1]);
writeFileSync(entry, `import React from'react';import{createRoot}from'react-dom/client';import{View,Platform,Keyboard,AccessibilityInfo,Dimensions}from'react-native';
import{AdaptiveModal,AdaptiveSheet}from'../../src/components/adaptive-sheet';import{DesignProvider,UiText}from'../../src/components/design-system';import{FormButton,FormField,SegmentedControl}from'../../src/components/form-controls';import{SheetRefreshContext}from'../../src/components/sheet-refresh-notice';
import{SetEditor,NoteEditor,AddExerciseSheet}from'../../src/features/fitness/components/fitness-forms';import{TaskActions}from'../../src/features/tasks/components/task-actions';import{TaskEditor}from'../../src/features/tasks/components/task-editor';import{OccurrenceHistory}from'../../src/features/tasks/components/occurrence-history';import{TransactionDetail}from'../../src/features/finance/components/transaction-detail';import f from'./fixture.json';
const p=new URLSearchParams(location.search),scene=p.get('scene')||'set';Platform.OS='ios';Keyboard.metrics=()=>undefined;Keyboard.addListener=()=>({remove(){}});AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});AccessibilityInfo.sendAccessibilityEvent=()=>{};const large=p.has('large'),get=Dimensions.get.bind(Dimensions);Dimensions.get=k=>({...get(k),fontScale:large?2:1});if(large){const sized=new WeakSet();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(sized.has(e))return;sized.add(e);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
const no=()=>{},blocked=()=>{throw Error('Audit fixture writes disabled')};const actionProps={visible:true,onDismiss:no,onClosed:no,onEdit:no,onHistory:no,onSkip:no,onDelete:no,error:null};
function App(){if(scene==='linked')return <TransactionDetail transaction={f.transaction} source={f.source} categories={f.categories} today="2026-11-12" visible onDismiss={no} onClosed={no} onEdit={no} onOpenSource={no}/>;
if(scene==='task-edit')return <TaskEditor task={f.taskItem.task} recurrence={null} categories={f.taskCategories} onSave={blocked} onCreateCategory={blocked} onDismiss={no}/>;
if(scene==='task-actions')return <TaskActions {...actionProps} item={f.taskItem} recurrences={[]} categories={f.taskCategories} now={f.now}/>;
if(scene==='occurrence-history')return <OccurrenceHistory task={f.taskItem.task} categories={f.taskCategories} recurrences={[]} readPage={()=>({occurrences:[],nextBefore:null})} onStatus={no} onDismiss={no} now={f.now}/>;
if(scene==='controls')return <View style={{padding:16,gap:16}}><UiText type="editorTitle">Shared control comparison</UiText>{[undefined,'v2'].map(appearance=><View key={appearance||'legacy'} style={{gap:12}}><UiText type="editorSection">{appearance||'Legacy defaults'}</UiText><FormButton appearance={appearance} variant="primary" label="Record payment" onPress={no}/><FormButton appearance={appearance} variant="secondary" label="Add work" onPress={no}/><FormButton appearance={appearance} disabled label="Unavailable" onPress={no}/><FormField appearance={appearance} label="Description" value="Client handover" onChangeText={no}/><SegmentedControl appearance={appearance} label="Type" value="expense" options={[{value:'expense',label:'Expense'},{value:'income',label:'Income'}]} onChange={no}/></View>)}</View>;
return <AdaptiveModal onDismiss={no}>{scene==='set'?<SetEditor name={f.exercise.name} type="strength" existing={f.set} onSave={blocked} onDismiss={no} onDelete={no}/>:scene==='note'?<NoteEditor title="Workout note" value="Steady session. Keep the next set comfortable." onSave={blocked} onDismiss={no}/>:scene==='add-exercise'?<AddExerciseSheet exercises={f.exercises} onAdd={blocked} onCreateExercise={blocked} onDismiss={no}/>:<SheetRefreshContext.Provider value={{error:'Unable to refresh. Saved content is retained.',onRetry:no}}><AdaptiveSheet appearance="v2" title="Refresh failure" onDismiss={no}><UiText>Source-owned content stays available.</UiText></AdaptiveSheet></SheetRefreshContext.Provider>}</AdaptiveModal>}
createRoot(document.getElementById('root')).render(<DesignProvider><App/></DesignProvider>);`);
async function main() {
  const f = await journalDatabase(); f.setTime('2026-11-12');
  try {
    const client = f.work.createCounterparty('Audit studio'); const id = f.work.create({ ...workDraft(null, '2026-11-05'), title: 'Client handover', counterpartyId: client.id, compensationType: 'fixed', fixedAmount: '300' });
    f.work.recordPayment({ counterpartyId: client.id, allocations: [{ workEntryId: id, amount: '100' }], categoryId: null, paymentDate: '2026-11-10' });
    const ledger = f.finance.readLedgerPage(), transaction = ledger.transactions[0];
    const taskId = f.tasks.createTask({ ...taskDraft(), title: 'Plan next week', date: '2026-11-12' }), tasks = f.tasks.read();
    const session = f.fitness.startWorkout(null), exercise = f.fitness.readOverview().exercises.find(e => e.measurementType === 'strength')!;
    f.fitness.addSessionExercise(session.id, exercise.id); const sessionExercise = f.fitness.readSession(session.id).exercises[0]; f.fitness.addSet(sessionExercise.id, { ...blankSet(), weight: '25', reps: '10' });
    writeFileSync(resolve(output, 'fixture.json'), JSON.stringify({ now: f.now(), transaction, source: ledger.sources[transaction.id], categories: ledger.categories,
      taskItem: { key: `task:${taskId}`, task: tasks.tasks.find(t => t.id === taskId), occurrence: null }, taskCategories: tasks.categories,
      exercise, exercises: f.fitness.readOverview().exercises, set: f.fitness.readSession(session.id).exercises[0].sets[0] }));
  } finally { f.sqlite.close(); }
  await build({ entryPoints: [entry], outfile: resolve(output, 'app.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' }, loader: { '.ttf': 'file' },
    alias: { 'react-native': 'react-native-web', 'expo-image': native, 'expo-font': native, '@react-native-community/datetimepicker': native, 'react-native-safe-area-context': native, 'react-native-reanimated': resolve('tests/helpers/native-motion.cjs') } });
  const fonts = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']].map(([folder, name]) => `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')}) format('truetype');font-weight:400}`).join('');
  writeFileSync(resolve(output, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fonts}html,body,#root{height:100%;margin:0;background:#F5F0EA}@media(prefers-color-scheme:dark){html,body,#root{background:#151315}}</style></head><body><div id="root"></div><script src="app.js"></script></body></html>`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

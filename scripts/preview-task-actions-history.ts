/** Actual feature components, with data produced by the unchanged SQLite task access. */
import { build } from 'esbuild';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bundledMigrations, database } from '../tests/helpers/database';
import { createTaskDataAccess } from '../src/features/tasks/data';
import { taskDraft } from '../src/features/tasks/form';
import { latestRecurrence } from '../src/features/tasks/recurrence';
import { pickerValue } from '../src/utils/calendar';
const output = resolve('dist/task-actions-history-atlas');
mkdirSync(output, { recursive: true });
async function main() {
    const db = database();
    let sequence = 0, now = pickerValue('2026-10-13', '12:00').getTime();
    try {
        await migrate(db.db, bundledMigrations);
        const access = createTaskDataAccess(db.db, () => `fixture-${++sequence}`, () => now);
        const id = access.createTask({ ...taskDraft(), title: 'Read the client proposal', date: '2026-10-01', time: '14:30', recurrence: { frequency: 'weekly', interval: 1, weekdayMask: 1 | 4 | 16, monthDay: 1, month: 10, endDate: '' } });
        const early = access.read().occurrences.find(o => o.taskId === id && o.scheduledDate === '2026-10-16')!;
        access.setOccurrenceStatus(early.id, 'completed');
        access.editTask(id, { ...taskDraft(access.read().tasks.find(t => t.id === id), latestRecurrence(access.read().recurrences, id)), recurrence: { frequency: 'daily', interval: 2, weekdayMask: 1, monthDay: 1, month: 10, endDate: '' } });
        now = pickerValue('2026-11-13', '12:00').getTime();
        const first = access.readHistory(id);
        const current = first.occurrences.filter(o => o.deletedAt === null);
        access.setOccurrenceStatus(current[0].id, 'completed');
        access.setOccurrenceStatus(current[1].id, 'skipped');
        const ordinaryId = access.createTask({ ...taskDraft(), title: 'Review the invoice', date: '2026-11-13', description: 'Saved details', priority: 'high' });
        const stoppedId = access.createTask({ ...taskDraft(), title: 'Stopped daily reminder', date: '2026-11-13', recurrence: { frequency: 'daily', interval: 1, weekdayMask: 1, monthDay: 13, month: 11, endDate: '' } });
        access.stopRepeating(stoppedId);
        const page = access.readHistory(id), older = page.nextBefore ? access.readHistory(id, page.nextBefore) : { occurrences: [], nextBefore: null }, snapshot = access.read();
        writeFileSync(resolve(output, 'fixture.json'), JSON.stringify({ now, id, ordinaryId, stoppedId, snapshot, page, older }));
    }
    finally {
        db.sqlite.close();
    }
    const native = resolve('dist/transactions-v22-preview/native.jsx');
    writeFileSync(resolve(output, 'use-tasks.jsx'), `import f from'./fixture.json';export function useTasks(){return{snapshot:f.snapshot,presentationNow:f.now,error:null,reload(){},mutate:fn=>fn(),access:{readHistory:(_id,before)=>before?f.older:f.page}}}`);
    writeFileSync(resolve(output, 'entry.jsx'), `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{View,Platform,Keyboard,AccessibilityInfo,Dimensions}from'react-native';
import{TaskActions}from'../../src/features/tasks/components/task-actions';import{OccurrenceHistory}from'../../src/features/tasks/components/occurrence-history';import{TaskEditor}from'../../src/features/tasks/components/task-editor';import{TasksScreen}from'../../src/features/tasks/tasks-screen';import{AdaptiveModal,AdaptiveSheet}from'../../src/components/adaptive-sheet';import{UiText,DesignProvider,useDesignColors}from'../../src/components/design-system';import f from'./fixture.json';
const p=new URLSearchParams(location.search),kind=p.get('case')||'actions',large=p.has('large');Platform.OS='ios';Keyboard.metrics=()=>undefined;Keyboard.addListener=()=>({remove(){}});Keyboard.dismiss=()=>{};AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});AccessibilityInfo.sendAccessibilityEvent=()=>{};const get=Dimensions.get.bind(Dimensions);Dimensions.get=k=>({...get(k),fontScale:large?2:1});
if(large){const done=new WeakSet();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(done.has(e))return;done.add(e);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
const categories=f.snapshot.categories,recurrences=f.snapshot.recurrences,task=f.snapshot.tasks.find(t=>t.id===f.id),ordinary=f.snapshot.tasks.find(t=>t.id===f.ordinaryId);let failure=kind==='history-error';window.reviewReads=[];const read=before=>{window.reviewReads.push(before??null);if(failure){failure=false;throw Error('Fixture read failed')}return before?f.older:f.page};
const action=name=>()=>{window.reviewAction=name;window.reviewCount=(window.reviewCount||0)+1};
function App(){const c=useDesignColors(),[screen,setScreen]=useState('actions');document.body.style.backgroundColor=c.canvas;
if(kind==='main')return <TasksScreen/>;
if(kind==='calendar')return <TasksScreen initialTaskId={f.ordinaryId}/>;
if(kind==='edit'||screen==='edit')return <TaskEditor appearance="v2" task={ordinary} recurrence={null} categories={categories} onSave={d=>{window.reviewSaved=d;setScreen('closed')}} onDismiss={()=>setScreen('closed')} onCreateCategory={()=>{throw Error('Fixture creation unavailable')}}/>;
if(kind==='unrelated')return <AdaptiveModal onDismiss={action('Dismiss')}><AdaptiveSheet appearance="v2" titleRole="operational" title="Source details" onDismiss={action('Back')}><UiText type="secondary">Existing shared v2 sheet</UiText></AdaptiveSheet></AdaptiveModal>;
if(kind.startsWith('history')||screen==='history')return <OccurrenceHistory task={kind==='history-long'?{...task,title:'Review the proposal and complete the supporting documentation for the next meeting'}:task} categories={categories} recurrences={recurrences} now={f.now} readPage={kind==='history-empty'?()=>({occurrences:[],nextBefore:null}):read} onStatus={(id,status)=>{window.reviewStatus={id,status};return {...[...f.page.occurrences,...f.older.occurrences].find(o=>o.id===id),status,completedAt:status==='completed'?f.now:null}}} onDismiss={action('History back')}/>;
if(screen==='closed')return <View accessibilityLabel="Sheet dismissed"/>;
const recurring=kind==='actions-recurring'||kind==='actions-long',subject=kind==='actions-stopped'?f.snapshot.tasks.find(t=>t.id===f.stoppedId):recurring?task:kind==='actions-completed'?{...ordinary,completedAt:f.now}:ordinary;
const item={key:subject.id,task:kind==='actions-long'?{...subject,title:'Review the proposal and prepare the supporting documents for the next client meeting'}:subject,occurrence:recurring?f.page.occurrences.find(o=>o.status==='skipped'&&o.deletedAt===null):null};
return <TaskActions item={item} recurrences={recurrences} categories={categories} now={f.now} visible error={null} onDismiss={action('Dismiss')} onClosed={()=>{}} onEdit={()=>{window.reviewAction='Edit';setScreen('edit')}} onHistory={()=>setScreen('history')} onSkip={action('Skip')} onDelete={action('Native confirmation entry')}/>;}
createRoot(document.getElementById('root')).render(<DesignProvider><App/></DesignProvider>);`);
    await build({ entryPoints: [resolve(output, 'entry.jsx')], outfile: resolve(output, 'app.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' }, loader: { '.ttf': 'file' },
        plugins: [{ name: 'review-source-boundary', setup(b) { b.onResolve({ filter: /^\.\/use-tasks$/ }, args => args.importer.endsWith('/tasks-screen.tsx') || args.importer.endsWith('\\tasks-screen.tsx') ? { path: resolve(output, 'use-tasks.jsx') } : undefined); } }],
        alias: { 'react-native': 'react-native-web', 'expo-image': native, 'expo-font': native, 'expo-crypto': native, 'expo-router': native, '@react-native-community/datetimepicker': native, 'expo-router/react-navigation': native, 'react-native-safe-area-context': native, 'react-native-screens/experimental': native, 'react-native-reanimated': resolve('tests/helpers/native-motion.cjs') } });
    const fonts = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']].map(([folder, name]) => `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync('assets/fonts/' + folder + '/' + name + '.ttf').toString('base64')})}`).join('');
    writeFileSync(resolve(output, 'index.html'), `<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fonts}html,body,#root{height:100%;margin:0}#root{display:flex;flex-direction:column}</style><div id="root"></div><script src="app.js"></script></html>`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

/** Journal source UI and editor; SQLite-authored fixtures, substituted browser/native boundaries. */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { journalDatabase } from '../tests/helpers/journal';
import { taskDraft } from '../src/features/tasks/form';
import { transactionDraft } from '../src/features/finance/form';
import { addDays, pickerValue } from '../src/utils/calendar';

const output = resolve('dist/journal-review');
mkdirSync(output, { recursive: true });
const native = resolve(output, 'native.jsx'), entry = resolve(output, 'entry.jsx'), hook = resolve(output, 'journal-hook.jsx');
writeFileSync(native, `import React,{createContext,useEffect}from'react';import{View}from'react-native';
export const useFonts=()=>[true,null];export const SafeAreaView=View;export const SafeAreaInsetsContext=createContext({top:0,bottom:0,left:0,right:0});export const SafeAreaProvider=({children})=>children;export const useSafeAreaInsets=()=>({top:0,bottom:0,left:0,right:0});
export const randomUUID=()=>crypto.randomUUID();export const useFocusEffect=callback=>useEffect(callback,[callback]);export const useNavigation=()=>({dispatch(){}});export const usePreventRemove=()=>{};
export const useLocalSearchParams=()=>{const p=new URLSearchParams(location.search);return p.has('pastEmpty')?{date:'2026-10-20'}:p.has('past')?{date:'2026-10-19'}:{}};
export const router={canGoBack:()=>true,back(){window.reviewBack=true},replace(){},push:path=>window.reviewRoute=path,navigate:path=>window.reviewRoute=path};
export const DateTimePickerAndroid={open(){}};export default function DateTimePicker(){return <View/>;}export function Image({source,style,testID}){return <img alt="" aria-hidden="true" data-testid={testID} src={source?.uri} style={style}/>;}`);
writeFileSync(hook, `import{useState,useMemo,useEffect}from'react';import fixture from'./fixture.json';import{createJournalEditor}from'../../src/features/journal/editor';
const params=new URLSearchParams(location.search);const now=()=>new Date(2026,9,21,14,59).getTime();
export function useJournal(initialDate){const initial=initialDate||'2026-10-21';const[state,setState]=useState({date:initial,entry:null,draft:{content:'',mood:null},loaded:false});const[targetDate,setTargetDate]=useState(initial);
const editor=useMemo(()=>{const entries=new Map(fixture.entries.map(e=>[e.entryDate,e])),drafts=new Map(params.has('selected')?[[fixture.draft.entryDate,fixture.draft]]:[]);const access={getEntry:date=>entries.get(date)||null,getDraft:date=>drafts.get(date)||null,persistDraft:(date,draft,base,baseline)=>drafts.set(date,{...draft,entryDate:date,baseEntryId:baseline?.id||null,baseEntryUpdatedAt:baseline?.updatedAt||null}),discardDraft:date=>{drafts.delete(date);return entries.get(date)||null},save:(date,draft)=>{const row={...draft,entryDate:date,id:entries.get(date)?.id||'preview-entry',createdAt:now(),updatedAt:now(),deletedAt:null};entries.set(date,row);drafts.delete(date);return row},softDelete:id=>{for(const[date,row]of entries)if(row.id===id)entries.delete(date)}};return createJournalEditor(access,initial,setState,now)},[]);
useEffect(()=>{editor.load(initial);return()=>editor.flushDraft()},[editor]);const sourceContext=params.has('manyTasks')?fixture.contexts.many:params.has('fewTasks')?fixture.contexts.few:fixture.contexts.one;const context=params.has('context')&&state.date==='2026-10-21'?{...sourceContext,incomeMinor:BigInt(sourceContext.incomeMinor),expensesMinor:BigInt(sourceContext.expensesMinor),netFlowMinor:BigInt(sourceContext.netFlowMinor)}:null;
return{state,editor,today:'2026-10-21',targetDate,context,contextError:null,readContext(){},reload:()=>editor.refresh(),loadDate:date=>{setTargetDate(date);return editor.load(date)}};}
export function useJournalHistory(){const[limit,setLimit]=useState(20);return{page:{entries:fixture.entries.slice(0,limit),nextBefore:limit<fixture.entries.length?fixture.entries[limit-1].entryDate:null},error:null,retry(){},loadOlder:()=>setLimit(n=>n+20)}};`);
writeFileSync(entry, `import React from'react';import{createRoot}from'react-dom/client';import{Platform,Keyboard,AccessibilityInfo,Dimensions,Alert}from'react-native';import{JournalScreen}from'../../src/features/journal/journal-screen';import{JournalHistoryScreen}from'../../src/features/journal/journal-history-screen';
const RealDate=Date;globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[new RealDate(2026,9,21,14,59).getTime()]))}static now(){return new RealDate(2026,9,21,14,59).getTime()}};
Platform.OS='ios';Keyboard.metrics=()=>undefined;Keyboard.addListener=()=>({remove(){}});AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});AccessibilityInfo.sendAccessibilityEvent=()=>{};
Alert.alert=(title,message,buttons)=>{window.reviewAlert={title,message};window.reviewConfirm=()=>buttons?.find(button=>button.style==='destructive')?.onPress?.()};
const params=new URLSearchParams(location.search),large=params.has('large');const get=Dimensions.get.bind(Dimensions);Dimensions.get=key=>({...get(key),fontScale:large?2:1});
if(large){const sized=new WeakSet();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(sized.has(e))return;sized.add(e);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
createRoot(document.getElementById('root')).render(params.has('history')?<JournalHistoryScreen/>:<JournalScreen/>);`);

async function main() {
  const f = await journalDatabase();
  try {
    f.setTime('2026-10-21', '14:59');
    const today = '2026-10-21';
    for (let index = 2; index < 48; index++) f.access.save(addDays(today, -index), { content: index === 2
      ? 'A slower day. I took a walk after lunch and made time to read.\n\nTomorrow I want to keep that small pause.'
      : index % 5 === 0 ? '' : `A note from this day. Small steps, a little movement, and time to reflect.\nA second paragraph.`, mood: (['good', 'great', null, 'okay', 'low'] as const)[index % 5] }, null);
    f.access.persistDraft(today, { content: 'A quiet moment to write about today.\n\nI am leaving room for the rest of the day.', mood: 'great' }, null);
    const task = f.tasks.createTask({ ...taskDraft(), title: 'A finished task' }); f.tasks.setCompleted(task, true);
    const workout = f.fitness.startWorkout(); f.fitness.finishWorkout(workout.id);
    f.finance.createTransaction({ ...transactionDraft(null, pickerValue(today)), description: 'Lunch', amount: '32,50' });
    f.finance.createTransaction({ ...transactionDraft(null, pickerValue(today)), description: 'Payment', amount: '180', type: 'income' });
    const one = f.context.read(today);
    for (const title of ['Prepare the quarterly report with supporting details for the next planning session', 'Call mom', 'Wash dishes']) {
      const id = f.tasks.createTask({ ...taskDraft(), title }); f.tasks.setCompleted(id, true);
    }
    const few = f.context.read(today);
    for (const title of ['Buy groceries', 'Read a chapter', 'Water the plants']) {
      const id = f.tasks.createTask({ ...taskDraft(), title }); f.tasks.setCompleted(id, true);
    }
    const many = f.context.read(today);
    const entries = []; let before: string | undefined;
    do { const page = f.access.listHistory(before); entries.push(...page.entries); before = page.nextBefore ?? undefined; } while (before);
    writeFileSync(resolve(output, 'fixture.json'), JSON.stringify({ entries, draft: f.access.getDraft(today), contexts: { one, few, many } }, (_key, value) => typeof value === 'bigint' ? value.toString() : value));
  } finally { f.sqlite.close(); }
  await build({ entryPoints: [entry], outfile: resolve(output, 'app.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' }, loader: { '.ttf': 'file' },
    plugins: [{ name: 'journal-review-boundary', setup(builder) { builder.onResolve({ filter: /^\.\/use-journal(-history)?$/ }, () => ({ path: hook })); } }],
    alias: { 'react-native': 'react-native-web', 'expo-crypto': native, 'expo-image': native, 'expo-font': native, 'expo-router': native,
      'expo-router/react-navigation': native, 'react-native-safe-area-context': native, '@react-native-community/datetimepicker': native,
      'react-native-reanimated': resolve('tests/helpers/native-motion.cjs') } });
  const fonts = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']].map(([folder, name]) => `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')}) format('truetype');font-weight:400}`).join('');
  writeFileSync(resolve(output, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${fonts}html,body,#root{height:100%;margin:0}#root{display:flex;flex-direction:column}</style></head><body><div id="root"></div><script src="app.js"></script></body></html>`);
  console.log(`Journal review: ${output}/index.html`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

/** Actual Calendar UI with SQLite-projected fixtures; browser-only native/hook substitutions. */
import { build } from 'esbuild';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { journalDatabase } from '../tests/helpers/journal';
import { createCalendarDataAccess } from '../src/features/calendar/data';
import { taskDraft } from '../src/features/tasks/form';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import { workDraft } from '../src/features/finance/work/form';
import { monthGridRange } from '../src/utils/calendar';

const output = resolve('dist/calendar-review'); mkdirSync(output, { recursive: true });
const native = resolve(output, 'native.jsx'), entry = resolve(output, 'entry.jsx'), hook = resolve(output, 'calendar-hook.jsx');
writeFileSync(native, `import React,{createContext,useEffect}from'react';import{View}from'react-native';
export const useFonts=()=>[true,null];export const SafeAreaView=View;export const SafeAreaInsetsContext=createContext({top:0,bottom:0,left:0,right:0});export const SafeAreaProvider=({children})=>children;export const useSafeAreaInsets=()=>({top:0,bottom:0,left:0,right:0});
export const useFocusEffect=callback=>useEffect(callback,[callback]);export const router={push:path=>window.reviewRoute=path};
export function Image({source,style,testID}){return <img alt="" aria-hidden="true" data-testid={testID} src={source?.uri} style={style}/>;}`);
writeFileSync(hook, `import{useState}from'react';import fixture from'./fixture.json';import{selectDate,moveMonth}from'../../src/features/calendar/model';
export function useCalendar(){const params=new URLSearchParams(location.search);const[selection,setSelection]=useState(()=>selectDate(params.has('empty')?'2026-11-20':params.has('different')?'2026-10-20':'2026-10-21'));const[data,setData]=useState(()=>params.has('many')?fixture.many:fixture.normal);const items=data[selection.month]||[];return{selection,today:'2026-10-21',items,error:null,actionError:null,reload(){},onDate:date=>setSelection(selectDate(date)),onMove:direction=>setSelection(s=>moveMonth(s,direction)),onToday:()=>setSelection(selectDate('2026-10-21')),toggleTask:item=>setData(current=>({...current,[selection.month]:items.map(row=>row.id===item.id?{...row,completed:!row.completed,status:row.completed?'Today':'Completed'}:row)}))};}`);
writeFileSync(entry, `import React from'react';import{createRoot}from'react-dom/client';import{Platform,Keyboard,AccessibilityInfo,Dimensions}from'react-native';import{CalendarScreen}from'../../src/features/calendar/calendar-screen';
Platform.OS='ios';Keyboard.metrics=()=>undefined;Keyboard.addListener=()=>({remove(){}});AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});AccessibilityInfo.sendAccessibilityEvent=target=>target?.focus?.();
const large=new URLSearchParams(location.search).has('large'),get=Dimensions.get.bind(Dimensions);Dimensions.get=key=>({...get(key),fontScale:large?2:1});
if(large){const sized=new WeakSet();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(sized.has(e))return;sized.add(e);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
createRoot(document.getElementById('root')).render(<CalendarScreen/>);`);

async function main() {
  const f = await journalDatabase();
  try {
    f.setTime('2026-10-21', '16:16'); const today = '2026-10-21';
    const recurrence = { frequency: 'daily' as const, interval: 1, weekdayMask: 0, monthDay: 1, month: 10, endDate: '2026-10-31' };
    const daily = f.tasks.createTask({ ...taskDraft(), title: 'Daily', date: '2026-10-01', recurrence });
    f.tasks.createTask({ ...taskDraft(), title: 'Weekly review', date: '2026-10-01', recurrence: { ...recurrence, frequency: 'weekly', weekdayMask: 74 } });
    const occurrence = f.tasks.readRange({ from: today, to: today }).find(row => row.task.id === daily)!.occurrence!;
    f.tasks.setOccurrenceStatus(occurrence.id, 'completed');
    f.tasks.createTask({ ...taskDraft(), title: 'Prepare the quarterly report with supporting details for next week', date: today, time: '18:00' });
    f.commitments.create({ ...commitmentDraft(null, undefined, today), title: 'Internet', amount: '99,90', firstDueDate: today });
    const client = f.work.createCounterparty('João Inglês');
    f.work.create({ ...workDraft(null, today), title: 'Inventory software', counterpartyId: client.id, compensationType: 'fixed', fixedAmount: '600', expectedPaymentDate: today });
    const access = createCalendarDataAccess(f.db, randomUUID, f.now);
    const snapshot = () => Object.fromEntries(['2026-09-01', '2026-10-01', '2026-11-01'].map(month => [month, access.readRange(monthGridRange(month))]));
    const normal = snapshot();
    for (let index = 0; index < 120; index++) f.tasks.createTask({ ...taskDraft(), title: `Scheduled task ${String(index).padStart(3, '0')}`, date: today });
    writeFileSync(resolve(output, 'fixture.json'), JSON.stringify({ normal, many: snapshot() }));
  } finally { f.sqlite.close(); }
  await build({ entryPoints: [entry], outfile: resolve(output, 'app.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' }, loader: { '.ttf': 'file' },
    plugins: [{ name: 'calendar-review-hook', setup(builder) { builder.onResolve({ filter: /^\.\/use-calendar$/ }, () => ({ path: hook })); } }],
    alias: { 'react-native': 'react-native-web', 'expo-image': native, 'expo-font': native, 'expo-router': native,
      'react-native-safe-area-context': native, 'react-native-screens/experimental': native, 'react-native-reanimated': resolve('tests/helpers/native-motion.cjs') } });
  const fonts = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']].map(([folder, name]) => `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')}) format('truetype');font-weight:400}`).join('');
  writeFileSync(resolve(output, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${fonts}html,body,#root{height:100%;margin:0}#root{display:flex;flex-direction:column}</style></head><body><div id="root"></div><script src="app.js"></script></body></html>`);
  console.log(`Calendar review: ${output}/index.html`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

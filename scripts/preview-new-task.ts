/** Browser review of the real Task editors/managers. Native OS boundaries are substituted, not form logic. */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { seedDefaultCategories } from '../src/database/seed';
import { taskCategories } from '../src/database/schema';
import { bundledMigrations, database } from '../tests/helpers/database';
import { createTaskDataAccess } from '../src/features/tasks/data';
import { taskDraft } from '../src/features/tasks/form';
import { pickerValue } from '../src/utils/calendar';

const output = resolve('dist/new-task-review');
mkdirSync(output, { recursive: true });
const boundary = resolve(output, 'native-boundaries.jsx');
writeFileSync(boundary, `
import React, {createContext, useEffect} from 'react';
import {View} from 'react-native-web';
export const useFonts=()=>[true,null];
export function Image({source,style,testID,...props}) {return <img alt="" aria-hidden="true" data-testid={testID} src={source?.uri} style={style}/>;}
export const SafeAreaInsetsContext=createContext({top:0,bottom:0,left:0,right:0});
export const SafeAreaProvider=({children})=>children;
export const useSafeAreaInsets=()=>({top:0,bottom:0,left:0,right:0});
export const useFocusEffect=(callback)=>useEffect(callback,[callback]);
export const DateTimePickerAndroid={open(){}};
export default function DateTimePicker(){return <View/>;}
`);
const entry = resolve(output, 'entry.jsx');
writeFileSync(entry, `
import React,{useState} from 'react';import{createRoot}from'react-dom/client';
import{Platform,Keyboard,AccessibilityInfo,Dimensions,Alert,View}from'react-native';
import{TaskEditor}from'../../src/features/tasks/components/task-editor';
import{CategoryManager}from'../../src/features/tasks/components/category-manager';
import{RecurringTasks,RepeatingTasksHeader}from'../../src/features/tasks/components/recurring-tasks';
import{TaskHistoryList,TaskHistoryHeader}from'../../src/features/tasks/components/task-history-list';
import{taskArchiveSections}from'../../src/features/tasks/workspace';
import{DesignProvider,useDesignColors}from'../../src/components/design-system';
import{ContextMenuHost}from'../../src/components/context-menu';
import{latestRecurrence}from'../../src/features/tasks/recurrence';
import seededCategories from './categories.json';
import repeatingFixture from './repeating.json';
import repeatingManyFixture from './repeating-many.json';
import historyFixture from './history.json';
import historyManyFixture from './history-many.json';
Platform.OS='ios';Keyboard.metrics=()=>undefined;Keyboard.addListener=()=>({remove(){}});
AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});
AccessibilityInfo.sendAccessibilityEvent=()=>{};
const large=new URLSearchParams(location.search).has('large');
const dimensionsGet=Dimensions.get.bind(Dimensions);Dimensions.get=(key)=>({...dimensionsGet(key),fontScale:large?2:1});
Alert.alert=(title,message,buttons)=>{window.reviewAlert={title,message};window.reviewConfirm=()=>buttons?.find(button=>button.style==='destructive')?.onPress?.();};
function CategoriesReview(){const[categories,setCategories]=useState(()=>[...seededCategories,...(new URLSearchParams(location.search).has('populated')?['Pet care','Creative projects','A longer category for personal plans'].map((name,index)=>({id:'custom-'+index,name,isDefault:false,createdAt:1,updatedAt:1,deletedAt:null})):[])]);
return <CategoryManager categories={categories} onDismiss={()=>{window.reviewDismissed=true}} onCreate={name=>{window.reviewCreated=name;setCategories(current=>[...current,{id:'created-'+current.length,name:name.trim(),isDefault:false,createdAt:1,updatedAt:1,deletedAt:null}])}} onDelete={id=>{window.reviewDeleted=id;setCategories(current=>current.filter(category=>category.id!==id))}}/>;}
function RepeatingReview(){const colors=useDesignColors();const data=new URLSearchParams(location.search).has('many')?repeatingManyFixture:repeatingFixture;const[tasks,setTasks]=useState(()=>new URLSearchParams(location.search).has('empty')?[]:data.tasks.map(task=>new URLSearchParams(location.search).has('long')&&task.title==='Weekly yep'?{...task,title:'Weekly planning for personal responsibilities and long-term projects'}:task));const[editor,setEditor]=useState(null);
return <DesignProvider><View style={{height:'100%',backgroundColor:colors.canvas}}><ContextMenuHost safeAreaApplied><RecurringTasks tasks={tasks} recurrences={data.recurrences} header={<RepeatingTasksHeader onBack={()=>{window.reviewDismissed=true}}/>} onEdit={task=>{window.reviewEdited=task.id;setEditor(task)}} onHistory={task=>{window.reviewHistory=task.id}} onDelete={task=>Alert.alert('Delete repeating task?','Hide the task and its occurrences; history remains stored.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>{window.reviewDeleted=task.id;setTasks(current=>current.filter(row=>row.id!==task.id))}}])}/>
{editor&&<TaskEditor appearance="v2" task={editor} recurrence={latestRecurrence(data.recurrences,editor.id)} categories={seededCategories} onSave={draft=>{window.reviewSaved=draft}} onCreateCategory={()=>{throw new Error('Category creation is outside this review')}} onDismiss={()=>setEditor(null)}/>}</ContextMenuHost></View></DesignProvider>;}
function HistoryReview(){const colors=useDesignColors();const params=new URLSearchParams(location.search);const initial=params.has('many')?historyManyFixture:historyFixture;const[data,setData]=useState(()=>({...initial,items:params.has('empty')?[]:initial.items.map(item=>params.has('long')&&item.task.title==='Weekly yep'?{...item,task:{...item.task,title:'A long historical task for personal responsibilities and weekly planning'}}:item)}));const[editor,setEditor]=useState(null);
const update=(item,status)=>setData(current=>({...current,items:current.items.map(row=>row.key!==item.key?row:row.occurrence?{...row,occurrence:{...row.occurrence,status,completedAt:status==='completed'?data.now:null}}:{...row,task:{...row.task,completedAt:status==='completed'?data.now:null}})}));
return <DesignProvider><View style={{height:'100%',backgroundColor:colors.canvas}}><ContextMenuHost safeAreaApplied><TaskHistoryList sections={taskArchiveSections(data.items,'2026-10-20')} categories={data.categories} recurrences={data.recurrences} now={data.now} ready loading={false} header={<TaskHistoryHeader onBack={()=>{window.reviewDismissed=true}}/>}
onComplete={item=>{window.reviewCompleted=item.key;update(item,(item.occurrence?item.occurrence.status==='completed':item.task.completedAt!==null)?'pending':'completed')}} onSkip={item=>update(item,'pending')} onEdit={item=>{window.reviewEdited=item.key;setEditor(item.task)}} onHistory={item=>{window.reviewHistory=item.task.id}} onDelete={item=>Alert.alert(item.occurrence?'Delete repeating task?':'Delete task?','Delete this task? Stored history is preserved.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>{window.reviewDeleted=item.key;setData(current=>({...current,items:current.items.filter(row=>row.task.id!==item.task.id)}))}}])}/>
{editor&&<TaskEditor task={editor} recurrence={latestRecurrence(data.recurrences,editor.id)} categories={data.categories} onSave={draft=>{window.reviewSaved=draft}} onCreateCategory={()=>{throw new Error('Category creation is outside this review')}} onDismiss={()=>setEditor(null)}/>}</ContextMenuHost></View></DesignProvider>;}
function App(){const[categories,setCategories]=useState([{id:'work',name:'Work',isDefault:false,createdAt:1,updatedAt:1,deletedAt:null}]);
if(new URLSearchParams(location.search).get('surface')==='categories')return <CategoriesReview/>;
if(new URLSearchParams(location.search).get('surface')==='repeating')return <RepeatingReview/>;
if(new URLSearchParams(location.search).get('surface')==='history')return <HistoryReview/>;
return <TaskEditor task={null} recurrence={null} categories={categories} onDismiss={()=>{}} onSave={(draft)=>{window.reviewSaved=draft}}
onCreateCategory={(name)=>{const category={id:'review-'+name,name,isDefault:false,createdAt:1,updatedAt:1,deletedAt:null};setCategories(current=>[...current,category]);return category}}/>;}
createRoot(document.getElementById('root')).render(<App/>);
if(large){const sizes=new WeakMap();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(sizes.has(e))return;sizes.set(e,true);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
`);
async function main() {
  const fixture = database();
  try {
    await migrate(fixture.db, bundledMigrations); seedDefaultCategories(fixture.db);
    writeFileSync(resolve(output, 'categories.json'), JSON.stringify(fixture.db.select().from(taskCategories).all().sort((a, b) => a.name.localeCompare(b.name))));
    const access = createTaskDataAccess(fixture.db, randomUUID, () => pickerValue('2026-10-19', '12:00').getTime());
    const recurrence = { frequency: 'daily' as const, interval: 1, weekdayMask: 1, monthDay: 19, month: 10, endDate: '' };
    access.createTask({ ...taskDraft(), title: 'Daily', date: '2026-10-19', recurrence });
    access.createTask({ ...taskDraft(), title: 'Weekly yep', date: '2026-10-19', recurrence: { ...recurrence, frequency: 'weekly', weekdayMask: 1 | 4 | 32 } });
    const stopped = access.createTask({ ...taskDraft(), title: 'Worko', date: '2026-10-19', recurrence: { ...recurrence, frequency: 'weekly', weekdayMask: 1 | 4 | 16 } });
    access.stopRepeating(stopped);
    const snapshot = access.read(); writeFileSync(resolve(output, 'repeating.json'), JSON.stringify({ tasks: snapshot.tasks, recurrences: snapshot.recurrences }));
    for (let index = 0; index < 120; index++) access.createTask({ ...taskDraft(), title: `Series ${String(index).padStart(3, '0')}`, date: '2026-10-19', recurrence });
    const many = access.read(); writeFileSync(resolve(output, 'repeating-many.json'), JSON.stringify({ tasks: many.tasks, recurrences: many.recurrences }));
  } finally { fixture.sqlite.close(); }
  const history = database();
  try {
    await migrate(history.db, bundledMigrations); seedDefaultCategories(history.db);
    let timestamp = pickerValue('2026-10-20', '12:00').getTime();
    const access = createTaskDataAccess(history.db, randomUUID, () => timestamp++);
    const recurrence = { frequency: 'daily' as const, interval: 1, weekdayMask: 1, monthDay: 14, month: 10, endDate: '' };
    const daily = access.createTask({ ...taskDraft(), title: 'Daily', date: '2026-10-14', recurrence });
    const weekly = access.createTask({ ...taskDraft(), title: 'Weekly yep', date: '2026-10-14', recurrence: { ...recurrence, frequency: 'weekly', weekdayMask: 1 | 4 | 32 } });
    const snapshot = access.read();
    for (const [id, dates] of [[daily, ['2026-10-14', '2026-10-18']], [weekly, ['2026-10-14', '2026-10-17']]] as const) {
      for (const date of dates) access.setOccurrenceStatus(snapshot.occurrences.find(row => row.taskId === id && row.scheduledDate === date)!.id, 'completed');
    }
    access.setOccurrenceStatus(snapshot.occurrences.find(row => row.taskId === daily && row.scheduledDate === '2026-10-19')!.id, 'skipped');
    for (const [title, date] of [['Gosh', '2026-10-03'], ['Once', ''], ['Morning routine', '2026-10-20']]) {
      const id = access.createTask({ ...taskDraft(), title, date, time: date === '2026-10-20' ? '07:00' : '' }); access.setCompleted(id, true);
    }
    writeFileSync(resolve(output, 'history.json'), JSON.stringify({ ...access.read(), now: timestamp }));
    for (let index = 0; index < 125; index++) { const id = access.createTask({ ...taskDraft(), title: `Historical record ${String(index).padStart(3, '0')}` }); access.setCompleted(id, true); }
    writeFileSync(resolve(output, 'history-many.json'), JSON.stringify({ ...access.read(), now: timestamp }));
  } finally { history.sqlite.close(); }
  await build({ entryPoints: [entry], outfile: resolve(output, 'app.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' }, loader: { '.ttf': 'file' }, assetNames: '[name]',
    alias: { 'react-native': 'react-native-web', 'expo-image': boundary, 'expo-font': boundary, 'expo-router': boundary,
      'react-native-safe-area-context': boundary, '@react-native-community/datetimepicker': boundary,
      'react-native-reanimated': resolve('tests/helpers/native-motion.cjs') } });
  const fonts = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']].map(([folder, name]) =>
    `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')}) format('truetype');font-weight:400}`).join('');
  writeFileSync(resolve(output, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${fonts}html,body,#root{margin:0;height:100%;}body{background:#F5F0EA}</style></head><body><div id="root"></div><script src="app.js"></script></body></html>`);
  console.log('Real Tasks browser review: dist/new-task-review/index.html; ?surface=categories (&populated), ?surface=repeating or ?surface=history (&empty, &many, &long, &large). Native boundaries substituted; not native-device acceptance.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

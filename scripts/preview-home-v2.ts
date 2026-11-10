/** Actual Home component preview; synthetic snapshots produced through the real SQLite source services. */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { journalDatabase } from '../tests/helpers/journal';
import { createTaskDataAccess } from '../src/features/tasks/data';
import { taskDraft } from '../src/features/tasks/form';
import { createHomeDataAccess } from '../src/features/home/data';
import { transactionDraft } from '../src/features/finance/form';
import { workDraft } from '../src/features/finance/work/form';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import { journalBaseline } from '../src/features/journal/form';
import { blankTargets } from '../src/features/fitness/form';
import { createRotationDataAccess } from '../src/features/fitness/rotations-data';
import { pickerValue } from '../src/utils/calendar';

const output=resolve('dist/home-v2-preview');mkdirSync(output,{recursive:true});
const native=resolve(output,'native.jsx'),hook=resolve(output,'home-hook.jsx'),router=resolve(output,'router.jsx'),entry=resolve(output,'entry.jsx');
const database=resolve(output,'database.jsx'),finance=resolve(output,'finance.jsx');
writeFileSync(database,`export function useDatabase(){return null;}`);
writeFileSync(finance,`export function createFinanceDataAccess(){return{readCategories:()=>window.reviewCategories,createTransaction(){throw Error('Read-only browser financial fixture')},createCategory(){throw Error('Read-only browser financial fixture')}}}`);
writeFileSync(native,readFileSync('scripts/preview-work-editor-v2.ts','utf8').match(/writeFileSync\(native, `([\s\S]*?)`\);/)![1].replace('export function Image({source,style,testID}){return <img alt="" aria-hidden="true" data-testid={testID} src={source?.uri} style={StyleSheet.flatten(style)}/>;}','export function Image({source,style,testID,onError,contentFit}){return <img alt="" aria-hidden="true" data-testid={testID} src={source?.uri||source} onError={onError} style={{...StyleSheet.flatten(style),objectFit:contentFit||"contain",...(contentFit==="cover"?{width:"100%",height:"100%"}:{})}}/>;}'));
writeFileSync(resolve(output,'crypto.jsx'),'export const randomUUID=()=>crypto.randomUUID();');
writeFileSync(router,`import{useEffect}from'react';const navigate=(method,target)=>{window.reviewNavigation={method,target};};export const router={push:target=>navigate('push',target),navigate:target=>navigate('navigate',target),canGoBack:()=>true,back(){},replace:target=>navigate('replace',target)};export const useFocusEffect=cb=>useEffect(cb,[cb]);`);
writeFileSync(hook,`import{useState}from'react';export function useHome(){const[state,set]=useState(0);window.reviewRefresh=()=>set(s=>s+1);return{snapshot:window.reviewLoading?null:window.reviewError&&!state?null:window.reviewFixture,error:window.reviewError?'Injected source read failure':null,actionError:null,reload(){window.reviewError=false;set(s=>s+1)},completeTask(){throw Error('Read-only browser fixture. Source-backed integration tests verify completion.')}};}`);
writeFileSync(entry,`import React from'react';import{createRoot}from'react-dom/client';import{Platform,Keyboard,AccessibilityInfo,Dimensions}from'react-native';import{DesignProvider}from'../../src/components/design-system';import{HomeScreen}from'../../src/features/home/home-screen';import fixture from'./fixture.json';
const p=new URLSearchParams(location.search),large=p.has('large');Platform.OS='ios';
const revive=x=>Array.isArray(x)?x.map(revive):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,typeof v==='string'&&k.endsWith('Minor')?BigInt(v):revive(v)])):x;const f=revive(fixture[p.get('scenario')||'populated']);window.reviewFixture=f.snapshot;window.reviewCategories=f.categories;window.reviewError=p.has('error');window.reviewLoading=p.has('loading');
Keyboard.metrics=()=>undefined;Keyboard.addListener=()=>({remove(){}});AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});AccessibilityInfo.sendAccessibilityEvent=()=>{};
const get=Dimensions.get.bind(Dimensions);Dimensions.get=key=>({...get(key),fontScale:large?2:1});if(large){const sized=new WeakSet();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(sized.has(e))return;sized.add(e);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
createRoot(document.getElementById('root')).render(<DesignProvider><HomeScreen/></DesignProvider>);`);

async function main(){
 const fixtures:Record<string,unknown>={};const day='2026-10-29';
 for(const scenario of ['populated','empty','one','mixed','tasksOnly','workOnly','commitments','completed','next','saved','stress','fitnessPartial','fitnessAll','targetless']){
  const f=await journalDatabase();f.setTime(day);const clock=()=>pickerValue(day,'10:50').getTime(),tasks=createTaskDataAccess(f.db,randomUUID,clock),home=createHomeDataAccess(f.db,randomUUID,clock);
  if(scenario!=='empty'){
   if(!['workOnly','completed','next','saved'].includes(scenario)){
    tasks.createTask({...taskDraft(),title:scenario==='stress'?'A very long saved task title '.repeat(6):'Daily',date:day});
    if(['mixed','stress'].includes(scenario)){tasks.createTask({...taskDraft(),title:'Repeating daily task',date:day,recurrence:{frequency:'daily',interval:1,weekdayMask:1,monthDay:29,month:10,endDate:''}});}
   }
   if(['populated','mixed','tasksOnly','stress'].includes(scenario)){for(let i=0;i<(scenario==='stress'?137:4);i++)tasks.createTask({...taskDraft(),title:'Earlier responsibility '+(i+1),date:'2026-10-28'});}
   if(['populated','mixed','workOnly','stress'].includes(scenario)){const client=f.work.createCounterparty('Saved client');f.work.create({...workDraft(null,day),title:'Inventory',counterpartyId:client.id,compensationType:'fixed',fixedAmount:'180',expectedPaymentDate:'2026-10-28'});}
   if(scenario==='mixed'){const done=tasks.createTask({...taskDraft(),title:'Already completed today',date:day});tasks.setCompleted(done,true);}
   if(['mixed','commitments'].includes(scenario))f.commitments.create({...commitmentDraft(null,undefined,'2026-10-01'),title:'Internet bill',amount:'150',firstDueDate:'2026-10-01'});
   if(['populated','mixed','stress','fitnessPartial','fitnessAll'].includes(scenario)){f.finance.createTransaction({...transactionDraft(null,pickerValue(day)),description:'Actual expense',type:'expense',amount:scenario==='stress'?'90071992547409,91':'72,50',transactionDate:day});const routine=f.fitness.createRoutine({name:scenario==='stress'?'A long saved workout name '.repeat(4):'Biceps, Back',exercises:f.fitness.read().exercises.slice(0,5).map(e=>({id:null,exerciseId:e.id,targets:blankTargets()}))});const session=f.fitness.startWorkout(routine);const entries=f.fitness.readSession(session.id).exercises;if(scenario==='fitnessPartial'||scenario==='fitnessAll')for(const e of entries.slice(0,scenario==='fitnessAll'?entries.length:2))f.fitness.setExerciseCompleted(e.id,true);}
   if(scenario==='targetless')f.fitness.startWorkout();
   if(scenario==='completed'){const session=f.fitness.startWorkout();f.fitness.finishWorkout(session.id);}
   if(scenario==='next'){const routine=f.fitness.createRoutine({name:'Legs',exercises:[]});const rotations=createRotationDataAccess(f.db,randomUUID,clock);const rotation=rotations.create({name:'Weight Training',steps:[{id:null,routineId:routine}]});rotations.activate(rotation);}
   if(scenario==='saved')f.access.save(day,{content:'Private writing is not shown on Home',mood:null},journalBaseline(null));
  }
  fixtures[scenario]={snapshot:home.read(),categories:f.finance.readCategories()};f.sqlite.close();
 }
 writeFileSync(resolve(output,'fixture.json'),JSON.stringify(fixtures,(_k,v)=>typeof v==='bigint'?v.toString():v));
 await build({entryPoints:[entry],bundle:true,outfile:resolve(output,'app.js'),format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"','process.env.EXPO_OS':'"web"',__DEV__:'false'},alias:{'react-native':'react-native-web','expo-image':native,'expo-font':native,'expo-crypto':resolve(output,'crypto.jsx'),'react-native-screens/experimental':native,'react-native-safe-area-context':native,'@react-native-community/datetimepicker':native,'expo-router':router,'@/database/database-provider':database,'react-native-reanimated':resolve('tests/helpers/native-motion.cjs'),'react-native-worklets':resolve('tests/helpers/native-worklets.cjs')},loader:{'.ttf':'file','.webp':'dataurl','.png':'dataurl'},plugins:[{name:'home-read-only',setup(b){b.onResolve({filter:/use-home$/},args=>args.importer.includes('home-screen')?{path:hook}:undefined);b.onResolve({filter:/^\.\.\/data$/},args=>args.importer.includes('transaction-create')?{path:finance}:undefined);}}]});
 const font=(name:string,file:string)=>`@font-face{font-family:${name};src:url(data:font/ttf;base64,${readFileSync(file).toString('base64')})}`;
 const fonts=font('AxisManrope-Regular','assets/fonts/manrope/Manrope-Regular.ttf')+font('AxisManrope-SemiBold','assets/fonts/manrope/Manrope-SemiBold.ttf')+font('AxisLora-SemiBold','assets/fonts/lora/Lora-SemiBold.ttf');
 writeFileSync(resolve(output,'index.html'),`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fonts}html,body,#root{height:100%;margin:0;background:#F5F0EA}#root{display:flex;flex-direction:column;padding-top:24px;padding-bottom:80px;box-sizing:border-box}@media(prefers-color-scheme:dark){html,body,#root{background:#151315}}</style></head><body><div id="root"></div><script src="app.js"></script></body></html>`);
 console.log('Home preview built with source-generated fixtures.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});

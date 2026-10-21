/** Actual FitnessScreen review; native runtime and SQLite hook boundaries are substituted in the browser. */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { bundledMigrations, database } from '../tests/helpers/database';
import { createFitnessDataAccess } from '../src/features/fitness/data';
import { createRotationDataAccess } from '../src/features/fitness/rotations-data';
import { seedFitnessExercises } from '../src/features/fitness/seed';
import { blankSet, blankTargets } from '../src/features/fitness/form';

const editorReview = process.env.AXIS_ROUTINE_EDITOR_REVIEW === '1';
const pickerReview = process.env.AXIS_ROUTINE_PICKER_REVIEW === '1';
const rotationsReview = process.env.AXIS_ROTATIONS_REVIEW === '1';
const exercisesReview = process.env.AXIS_EXERCISES_REVIEW === '1';
const historyReview = process.env.AXIS_HISTORY_REVIEW === '1';
const output = resolve(historyReview ? 'dist/history-review' : exercisesReview ? 'dist/exercises-review' : rotationsReview ? 'dist/rotations-review' : pickerReview ? 'dist/routine-picker-review' : editorReview ? 'dist/routine-editor-review' : 'dist/routines-review');
mkdirSync(output, { recursive: true });
const native = resolve(output, 'native.jsx'), hook = resolve(output, 'fitness-hook.jsx'), entry = resolve(output, 'entry.jsx'), motion = resolve(output, 'motion.jsx');
writeFileSync(motion, `import{useRef,useSyncExternalStore}from'react';import Animated,{withTiming,Easing,ReduceMotion}from'../../tests/helpers/native-motion.cjs';
const listeners=new Set();let revision=0;export default Animated;export{withTiming,Easing,ReduceMotion};
export function useSharedValue(initial){const ref=useRef(null);if(!ref.current){let value=initial;ref.current={get:()=>value,set:next=>{if(Object.is(value,next))return;value=next;revision++;listeners.forEach(notify=>notify())}}}return ref.current;}
export function useAnimatedStyle(factory){useSyncExternalStore(notify=>{listeners.add(notify);return()=>listeners.delete(notify)},()=>revision,()=>revision);return factory();}`);
writeFileSync(native, `import React,{createContext,useEffect}from'react';import{View}from'react-native';
export const randomUUID=()=>globalThis.crypto.randomUUID();
export const useFonts=()=>[true,null];export const SafeAreaView=View;export const SafeAreaInsetsContext=createContext({top:0,bottom:0,left:0,right:0});export const SafeAreaProvider=({children})=>children;export const useSafeAreaInsets=()=>({top:0,bottom:0,left:0,right:0});
export const useFocusEffect=callback=>useEffect(callback,[callback]);export const useLocalSearchParams=()=>new URLSearchParams(location.search).has('edit')?{rotationId:window.reviewRotationId}:{};export const router={push:path=>{window.reviewRoute=path},canGoBack:()=>true,back(){window.reviewBack=true},replace(){}};
export const DateTimePickerAndroid={open(){}};export default function DateTimePicker(){return <View/>;}export function Image({source,style,testID}){return <img alt="" aria-hidden="true" data-testid={testID} src={source?.uri} style={style}/>;}`);
writeFileSync(hook, `import{useState}from'react';import normal from'./normal.json';import many from'./many.json';import empty from'./empty.json';import mixed from'./mixed.json';import long from'./long.json';import compositionMany from'./composition-many.json';
export function useFitness(){const params=new URLSearchParams(location.search);const[data,setData]=useState(()=>params.has('empty')?empty:params.has('mixed')?mixed:params.has('long')?long:params.has('compositionMany')?compositionMany:params.has('many')?many:normal);
const access={readRoutine:id=>data.details.find(row=>row.id===id),createRoutine:draft=>{window.reviewSaved=draft;const id='created-'+Date.now();const row={id,name:draft.name,exerciseCount:draft.exercises.length,createdAt:1,updatedAt:1,deletedAt:null};setData(current=>({...current,routines:[...current.routines,row],details:[...current.details,{...row,exercises:[]}]}));return id},editRoutine:(id,draft)=>{window.reviewSaved=draft;setData(current=>({...current,routines:current.routines.map(row=>row.id===id?{...row,name:draft.name}:row)}))},archiveRoutine:id=>{if(data.protected.includes(id))throw new Error('Remove this routine from saved rotations before archiving it.');window.reviewArchived=id;setData(current=>({...current,routines:current.routines.map(row=>row.id===id?{...row,deletedAt:Date.now()}:row)}))},startWorkout:id=>{window.reviewStarted=id;return{id:'review-workout'}}};
access.createExercise=draft=>{const exercise={...draft,id:'exercise-'+Date.now(),isBuiltIn:false,deletedAt:null,createdAt:1,updatedAt:1};window.reviewCreated=exercise;setData(current=>({...current,overview:{...current.overview,exercises:[...current.overview.exercises,exercise]}}));return exercise};
access.archiveExercise=id=>{window.reviewArchived=id;setData(current=>({...current,overview:{...current.overview,exercises:current.overview.exercises.map(row=>row.id===id?{...row,deletedAt:Date.now()}:row)}}))};
return{access,snapshot:data.overview,routines:data.routines,nextWorkout:data.next,rotationSteps:data.sequence,routinesLoaded:true,historyLoaded:true,detail:null,activeDetail:null,lastWorkout:null,error:null,reload(){},mutate:action=>action(),openSession(){},closeSession(){},loadMoreHistory(){}};}`);
writeFileSync(entry, `import React from'react';import{createRoot}from'react-dom/client';import{Platform,Keyboard,AccessibilityInfo,Dimensions,Alert}from'react-native';import{FitnessScreen}from'../../src/features/fitness/fitness-screen';
Platform.OS='ios';Keyboard.metrics=()=>undefined;Keyboard.addListener=()=>({remove(){}});AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});AccessibilityInfo.sendAccessibilityEvent=()=>{};
if(${pickerReview || exercisesReview}){const listeners=new Map();let top=null;Keyboard.metrics=()=>top===null?undefined:{screenY:top,height:innerHeight-top};Keyboard.addListener=(name,callback)=>{const set=listeners.get(name)||new Set();set.add(callback);listeners.set(name,set);return{remove:()=>set.delete(callback)}};window.reviewKeyboard=open=>{top=open?innerHeight-300:null;for(const name of open?['keyboardWillChangeFrame','keyboardDidShow']:['keyboardWillHide','keyboardDidHide'])for(const callback of listeners.get(name)||[])callback({endCoordinates:{screenY:top??innerHeight,height:top===null?0:300}})};Keyboard.dismiss=()=>window.reviewKeyboard(false);AccessibilityInfo.sendAccessibilityEvent=target=>target?.focus?.();if(new URLSearchParams(location.search).has('keyboard'))document.addEventListener('focusin',event=>{if(event.target.tagName==='INPUT')window.reviewKeyboard(true)});}
Alert.alert=(title,message,buttons)=>{window.reviewAlert={title,message};window.reviewConfirm=()=>buttons?.find(button=>button.style==='destructive')?.onPress?.()};
const large=new URLSearchParams(location.search).has('large');const get=Dimensions.get.bind(Dimensions);Dimensions.get=key=>({...get(key),fontScale:large?2:1});
if(large){const sized=new WeakSet();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(sized.has(e))return;sized.add(e);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
createRoot(document.getElementById('root')).render(${rotationsReview ? '<RotationReview/>' : '<FitnessScreen/>'});
${rotationsReview ? `import{WorkoutRotationsScreen,WorkoutRotationEditorScreen}from'../../src/features/fitness/rotations-screen';import fixture from'./rotations-normal.json';window.reviewRotationId=fixture.rotations[0].id;function RotationReview(){return new URLSearchParams(location.search).has('editor')?<WorkoutRotationEditorScreen/>:<WorkoutRotationsScreen/>;}` : ''}`);

async function main() {
  const f = database();
  try {
    await migrate(f.db, bundledMigrations); seedFitnessExercises(f.db);
    let reviewTime = 1792494000000;
    const fitness = createFitnessDataAccess(f.db, randomUUID, () => reviewTime), rotations = createRotationDataAccess(f.db, randomUUID, () => reviewTime);
    if (pickerReview) for (let index = 0; index < 160; index++) fitness.createExercise({ name: `Custom movement with a longer descriptive name ${String(index).padStart(3, '0')}`, measurementType: (['strength', 'bodyweight', 'duration', 'distance'] as const)[index % 4] });
    const snapshot = () => ({ overview: fitness.readOverview(), routines: fitness.readRoutineSummaries(), details: fitness.readRoutines(), next: rotations.readNext(), sequence: rotations.readActiveSteps(), protected: rotations.read().flatMap(row => row.steps.map(step => step.routineId)) });
    writeFileSync(resolve(output, 'empty.json'), JSON.stringify(snapshot()));
    const exercises = fitness.readOverview().exercises;
    const make = (name: string, count: number) => fitness.createRoutine({ name, exercises: exercises.slice(0, count).map(exercise => ({ id: null, exerciseId: exercise.id, targets: blankTargets() })) });
    const editorExercises = editorReview ? [exercises.find(row => row.name === 'Bicep Curl')!,
      fitness.createExercise({ name: 'Pull-down', measurementType: 'strength' }), fitness.createExercise({ name: 'Inclined Row', measurementType: 'strength' }),
      fitness.createExercise({ name: 'Row', measurementType: 'strength' })] : [];
    const first = editorReview ? fitness.createRoutine({ name: 'Biceps, Back', exercises: editorExercises.map(exercise => ({ id: null, exerciseId: exercise.id,
      targets: { ...blankTargets(), setCount: '3', repMin: '8', repMax: '12' } })) }) : make('Biceps, Back', 4);
    const ids = [first, make('Chest, Triceps, Shoulders', 0), make('Legs', 1)];
    const archived = make('Old mobility', 1);
    if (!historyReview) { const completed = fitness.startWorkout(archived); fitness.finishWorkout(completed.id); }
    fitness.archiveRoutine(archived);
    const rotation = rotations.create({ name: 'Weight Training', steps: ids.map(routineId => ({ id: null, routineId })), nextStepIndex: 1 }); rotations.activate(rotation);
    if (rotationsReview) {
      const save = (variant: string) => writeFileSync(resolve(output, `rotations-${variant}.json`), JSON.stringify(rotations.readManagement()));
      const current = rotations.readManagement();
      writeFileSync(resolve(output, 'rotations-empty.json'), JSON.stringify({ ...current, rotations: [] }));
      save('normal');
      rotations.create({ name: 'Hypertrophy Focus', steps: [...ids].reverse().map(routineId => ({ id: null, routineId })), nextStepIndex: 0 }); save('multiple');
      rotations.create({ name: 'A longer rotation for strength, endurance and controlled recovery', steps: Array.from({ length: 8 }, (_, index) => ({ id: null, routineId: ids[index % 3] })), nextStepIndex: 2 }); save('long');
      fitness.startWorkout(ids[1]); save('locked'); fitness.discardWorkout(fitness.readOverview().active!.id);
      for (let i = 0; i < 100; i++) rotations.create({ name: `Saved rotation ${String(i).padStart(3, '0')}`, steps: ids.map(routineId => ({ id: null, routineId })) }); save('many');
      writeFileSync(resolve(output, 'rotation-hook.jsx'), `import{useState}from'react';import normal from'./rotations-normal.json';import multiple from'./rotations-multiple.json';import empty from'./rotations-empty.json';import long from'./rotations-long.json';import many from'./rotations-many.json';import locked from'./rotations-locked.json';
export function useRotations(){const p=new URLSearchParams(location.search);const[snapshot,setSnapshot]=useState(()=>p.has('empty')?empty:p.has('long')?long:p.has('many')?many:p.has('locked')?locked:p.has('multiple')?multiple:normal);const access={activate:id=>setSnapshot(s=>({...s,rotations:s.rotations.map(r=>({...r,isActive:r.id===id}))})),deactivate:id=>setSnapshot(s=>({...s,rotations:s.rotations.map(r=>r.id===id?{...r,isActive:false}:r)})),reset:id=>setSnapshot(s=>({...s,rotations:s.rotations.map(r=>r.id===id?{...r,nextStepId:r.steps[0].id}:r)})),delete:id=>setSnapshot(s=>({...s,rotations:s.rotations.filter(r=>r.id!==id)})),create:draft=>{window.reviewSaved=draft},edit:(id,draft)=>{window.reviewSaved=draft}};return{snapshot,error:null,reload(){},access,mutate:action=>action()}};`);
    }
    writeFileSync(resolve(output, 'normal.json'), JSON.stringify(snapshot()));
    for (const variant of ['mixed', 'long', 'composition-many']) writeFileSync(resolve(output, `${variant}.json`), JSON.stringify(snapshot()));
    if (editorReview) {
      const longExercise = fitness.createExercise({ name: 'Long exercise name with deliberate controlled movement and recovery', measurementType: 'bodyweight' });
      const update = (sources: typeof exercises) => fitness.editRoutine(first, { name: 'Biceps, Back', exercises: sources.map((exercise, index) => ({ id: null, exerciseId: exercise.id,
        targets: { ...blankTargets(), setCount: String(index % 4 + 2), ...(exercise.measurementType === 'duration' ? { minutes: '1', seconds: '30' } : exercise.measurementType === 'distance' ? { distance: '2.5' } : { repMin: '8', repMax: '12' }) } })) });
      update((['strength', 'bodyweight', 'duration', 'distance'] as const).flatMap(type => [exercises.find(row => row.measurementType === type)!,
        fitness.createExercise({ name: `Custom movement ${type}`, measurementType: type })]));
      writeFileSync(resolve(output, 'mixed.json'), JSON.stringify(snapshot()));
      update([longExercise, ...editorExercises]); writeFileSync(resolve(output, 'long.json'), JSON.stringify(snapshot()));
      update(Array.from({ length: 80 }, () => editorExercises[0])); writeFileSync(resolve(output, 'composition-many.json'), JSON.stringify(snapshot()));
    }
    for (let index = 0; index < 120; index++) make(`Routine ${String(index).padStart(3, '0')}`, 0);
    writeFileSync(resolve(output, 'many.json'), JSON.stringify(snapshot()));
    if (exercisesReview) {
      const empty = snapshot(); empty.overview.exercises = [];
      writeFileSync(resolve(output, 'empty.json'), JSON.stringify(empty));
      const archivedExercise = fitness.createExercise({ name: 'Old custom movement', measurementType: 'duration' }); fitness.archiveExercise(archivedExercise.id);
      writeFileSync(resolve(output, 'normal.json'), JSON.stringify(snapshot()));
      for (const [name, measurementType] of [['Custom strength', 'strength'], ['Custom bodyweight', 'bodyweight'], ['Custom timer', 'duration'], ['Custom Mega Press', 'distance']] as const) fitness.createExercise({ name, measurementType });
      writeFileSync(resolve(output, 'mixed.json'), JSON.stringify(snapshot()));
      fitness.createExercise({ name: 'Controlled movement with a long descriptive name for balance and deliberate recovery', measurementType: 'distance' });
      writeFileSync(resolve(output, 'long.json'), JSON.stringify(snapshot()));
      for (let index = 0; index < 200; index++) fitness.createExercise({ name: `Movement ${String(index).padStart(3, '0')}`, measurementType: (['strength', 'bodyweight', 'duration', 'distance'] as const)[index % 4] });
      writeFileSync(resolve(output, 'many.json'), JSON.stringify(snapshot()));
    }
    if (historyReview) {
      const save = (variant: string) => {
        const current = snapshot(), allHistory = fitness.readHistory(200).history;
        writeFileSync(resolve(output, `history-${variant}.json`), JSON.stringify({ ...current, allHistory,
          sessionDetails: allHistory.map(row => fitness.readSession(row.id)) }));
      };
      const complete = (routineId: string | null, day: number, hour: number, minute: number, withSets = false) => {
        reviewTime = new Date(2026, 9, day, hour - 1, minute).getTime();
        const session = fitness.startWorkout(routineId), detail = fitness.readSession(session.id);
        if (withSets) {
          for (const exercise of detail.exercises) fitness.addSet(exercise.id, blankSet());
          if (detail.exercises[0]) { fitness.setExerciseCompleted(detail.exercises[0].id, true); fitness.saveNote(session.id, detail.exercises[0].id, 'Saved exercise note.'); }
          fitness.saveNote(session.id, null, 'Saved workout note.');
        }
        reviewTime = new Date(2026, 9, day, hour, minute).getTime(); fitness.finishWorkout(session.id); return session.id;
      };
      save('empty');
      complete(ids[0], 20, 10, 51, true); complete(null, 20, 9, 33); complete(ids[1], 19, 15, 16);
      complete(ids[2], 19, 12, 8); complete(ids[0], 17, 18, 21); complete(null, 17, 8, 39); save('normal');
      const longRoutine = fitness.createRoutine({ name: 'Controlled strength and deliberate recovery with a long historical workout name',
        exercises: exercises.slice(0, 3).map(exercise => ({ id: null, exerciseId: exercise.id, targets: blankTargets() })) });
      complete(longRoutine, 20, 11, 35, true); save('long');
      for (let index = 0; index < 65; index++) complete(null, 21 - Math.floor(index / 24), index % 24, 15); save('many');
      writeFileSync(resolve(output, 'history-hook.jsx'), `import{useState}from'react';import normal from'./history-normal.json';import empty from'./history-empty.json';import long from'./history-long.json';import many from'./history-many.json';
export function useFitness(){const p=new URLSearchParams(location.search);const[data]=useState(()=>p.has('empty')?empty:p.has('long')?long:p.has('many')?many:normal);const[limit,setLimit]=useState(20),[detail,setDetail]=useState(null);const history=data.allHistory.slice(0,limit);return{snapshot:{...data.overview,history,hasMoreHistory:limit<data.allHistory.length},access:{readSession:id=>data.sessionDetails.find(row=>row.id===id)},routines:data.routines,nextWorkout:data.next,rotationSteps:data.sequence,routinesLoaded:true,historyLoaded:true,detail,activeDetail:null,lastWorkout:null,error:null,reload(){},mutate:action=>action(),openSession:id=>setDetail(data.sessionDetails.find(row=>row.id===id)),closeSession:()=>setDetail(null),loadMoreHistory:()=>setLimit(value=>value+20)}};`);
    }
  } finally { f.sqlite.close(); }
  await build({ entryPoints: [entry], outfile: resolve(output, 'app.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' }, loader: { '.ttf': 'file' },
    plugins: [{ name: 'fitness-review-hook', setup(builder) { builder.onResolve({ filter: /^\.\/use-fitness$/ }, () => ({ path: historyReview ? resolve(output, 'history-hook.jsx') : hook })); if (rotationsReview) builder.onResolve({ filter: /^\.\/use-rotations$/ }, () => ({ path: resolve(output, 'rotation-hook.jsx') })); } }],
    alias: { 'react-native': 'react-native-web', 'expo-crypto': native, 'expo-image': native, 'expo-font': native, 'expo-router': native, 'react-native-safe-area-context': native, 'react-native-screens/experimental': native, '@react-native-community/datetimepicker': native, 'react-native-reanimated': motion } });
  const fonts = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']].map(([folder, name]) => `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')}) format('truetype');font-weight:400}`).join('');
  writeFileSync(resolve(output, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${fonts}html,body,#root{height:100%;margin:0}#root{display:flex;flex-direction:column}</style></head><body><div id="root"></div><script src="app.js"></script></body></html>`);
  console.log(`Actual FitnessScreen review: ${output}/index.html. Click ${historyReview ? 'History' : exercisesReview ? 'Exercises' : 'Routines'}. Native/data-hook boundaries substituted; fixture flags documented with the captures.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

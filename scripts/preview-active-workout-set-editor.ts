/** Actual Fitness components and frozen SQLite records; no alternate editor implementation. */
import { build } from 'esbuild';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { journalDatabase } from '../tests/helpers/journal';
import { blankSet, blankTargets } from '../src/features/fitness/form';

const output = resolve('dist/active-workout-set-editor-atlas'), evidence = 'docs/design-system/active-workout-set-editor-v2';
mkdirSync(output, { recursive: true });
async function main() {
  if (!existsSync(output + '/fixture.json')) {
    const f = await journalDatabase();
    try {
      f.setTime('2026-11-13');
      const sources = f.fitness.readOverview().exercises;
      const previous = f.fitness.startWorkout(); const previousExercise = f.fitness.addSessionExercise(previous.id, sources.find(e => e.measurementType === 'strength')!.id);
      f.fitness.addSet(previousExercise, { ...blankSet(), weight: '25,125', reps: '12' }); f.fitness.finishWorkout(previous.id);
      const routineId = f.fitness.createRoutine({ name: 'Performance review', exercises: (['strength', 'bodyweight', 'duration', 'distance'] as const).map(type => ({ id: null, exerciseId: sources.find(e => e.measurementType === type)!.id, targets: { ...blankTargets(), setCount: type === 'strength' || type === 'bodyweight' ? '2' : '' } })) });
      const session = f.fitness.startWorkout(routineId), entries = f.fitness.readSession(session.id).exercises;
      const drafts = [ { ...blankSet(), weight: '25,125', reps: '12' }, { ...blankSet(), weight: '2.5', reps: '10' }, { ...blankSet(), minutes: '1', seconds: '30' }, { ...blankSet(), distance: '2,5', minutes: '14', seconds: '32' } ];
      entries.forEach((entry, i) => f.fitness.addSet(entry.id, drafts[i]));
      const blankId = f.fitness.addSet(entries[0].id, blankSet()), zeroId = f.fitness.addSet(entries[0].id, { ...blankSet(), weight: '0' });
      const source = f.fitness.createExercise({ name: 'Extensão controlada e contração excêntrica — acompanhamento de desempenho com amplitude confortável', measurementType: 'distance' });
      const longId = f.fitness.addSessionExercise(session.id, source.id); f.fitness.addSet(longId, { ...blankSet(), distance: '0.001' });
      writeFileSync(output + '/fixture.json', JSON.stringify({ now: f.now(), session: f.fitness.readSession(session.id), history: f.fitness.readSession(previous.id), exercises: f.fitness.readOverview().exercises, routine: f.fitness.readRoutine(routineId), blankId, zeroId, longId }));
    } finally { f.sqlite.close(); }
  }
  writeFileSync(evidence + '/fixture.json', readFileSync(output + '/fixture.json'));
  const native = resolve(output, 'native.jsx'); writeFileSync(native, readFileSync('dist/transactions-v22-preview/native.jsx'));
  writeFileSync(output + '/entry.jsx', `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{View,Platform,Keyboard,AccessibilityInfo,Dimensions,Alert}from'react-native';
import{AdaptiveModal}from'../../src/components/adaptive-sheet';import{FormSelectionHost}from'../../src/components/form-controls';import{DesignProvider,useDesignColors}from'../../src/components/design-system';import{SheetRefreshContext}from'../../src/components/sheet-refresh-notice';import{SetEditor,NoteEditor,AddExerciseSheet,ExerciseEditor,RoutineEditor}from'../../src/features/fitness/components/fitness-forms';import{WorkoutContent}from'../../src/features/fitness/components/workout-content';import{ActiveWorkoutHeader}from'../../src/features/fitness/components/active-workout-header';import{WorkoutSheet}from'../../src/features/fitness/components/workout-sheet';import{FitnessValidationError,validateSet}from'../../src/features/fitness/form';import f from'./fixture.json';
const p=new URLSearchParams(location.search),kind=p.get('case')||'strength',large=p.has('large'),keyboard=p.has('keyboard');Date.now=()=>f.now;Platform.OS='ios';Keyboard.metrics=()=>keyboard?{screenY:520,height:324}:undefined;Keyboard.addListener=()=>({remove(){}});Keyboard.dismiss=()=>{};AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});AccessibilityInfo.sendAccessibilityEvent=()=>{};const get=Dimensions.get.bind(Dimensions);Dimensions.get=k=>({...get(k),fontScale:large?2:1});
if(large){const sized=new WeakSet();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(sized.has(e))return;sized.add(e);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
const no=()=>{},blocked=()=>{throw Error('Preservation control write disabled')};window.reviewWrites=[];window.reviewDismissals=0;Alert.alert=(title,message,buttons)=>{window.reviewAlert={title,message,buttons}};
function App(){const c=useDesignColors(),[refresh,setRefresh]=useState(kind==='refresh'?'Unable to refresh. Saved workout remains available.':null);document.body.style.backgroundColor=c.canvas;
const selected=f.session.exercises.find(e=>kind==='keyboard'?e.id===f.longId:e.measurementType===(['strength','bodyweight','duration','distance'].includes(kind)?kind:'strength')),set=selected.sets.find(s=>kind==='blank'?s.id===f.blankId:kind==='zero'?s.id===f.zeroId:true);
const dismiss=()=>{window.reviewDismissals++};
const content=kind==='routine'?<RoutineEditor routine={f.routine} exercises={f.exercises} onSave={blocked} onCreateExercise={blocked} onDismiss={no}/>:kind==='exercise'?<ExerciseEditor appearance="v2" initialName="Controlled exercise" onSave={blocked} onCreated={no} onDismiss={no}/>:kind==='history'?<WorkoutSheet session={f.history} error={null} onDismiss={no}/>:kind==='note'?<NoteEditor title="Workout note" value="Steady session. Keep the next set comfortable." onSave={blocked} onDismiss={no}/>:kind==='add'?<AddExerciseSheet exercises={f.exercises} onAdd={blocked} onCreateExercise={blocked} onDismiss={no}/>:<SetEditor name={selected.exerciseName} type={selected.measurementType} existing={set} error={null} onSave={draft=>{if(p.has('fail'))throw new FitnessValidationError('Completed workouts are read-only.');window.reviewWrites.push({setId:set.id,sessionExerciseId:selected.id,sessionId:f.session.id,values:validateSet(selected.measurementType,draft),draft})}} onDismiss={dismiss} onDelete={()=>Alert.alert('Delete set?','Remove this logged set?',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>{window.reviewDeleted=set.id;dismiss()}}])}/>;
if(kind==='workout')return <WorkoutContent session={f.session} onAddExercise={no} onSet={no} onCompleteSet={no} onExerciseCompleted={no} onNote={no} onDiscard={no} onRemoveExercise={no}/>;
if(kind==='header')return <ActiveWorkoutHeader session={f.session} onNote={no} onDiscard={no}/>;
return <SheetRefreshContext.Provider value={{error:refresh,onRetry:()=>{window.reviewRetry=true;setRefresh(null)}}}><AdaptiveModal onDismiss={dismiss}>{content}</AdaptiveModal></SheetRefreshContext.Provider>;}
createRoot(document.getElementById('root')).render(<DesignProvider><FormSelectionHost safeAreaApplied><App/></FormSelectionHost></DesignProvider>);`);
  await build({ entryPoints: [output + '/entry.jsx'], outfile: output + '/app.js', bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' }, loader: { '.ttf': 'file' }, plugins: process.argv.includes('--before') ? [{ name: 'saved-before-fitness-forms', setup(builder) { builder.onLoad({ filter: /[\\/]fitness-forms\.tsx$/ }, args => ({ contents: readFileSync('dist/active-workout-set-editor-v2/fitness-forms.tsx.before', 'utf8'), loader: 'tsx', resolveDir: dirname(args.path) })); } }] : [], alias: { 'react-native': 'react-native-web', 'expo-image': native, 'expo-font': native, 'expo-crypto': native, 'expo-router': native, '@react-native-community/datetimepicker': native, 'expo-router/react-navigation': native, 'react-native-safe-area-context': native, 'react-native-screens/experimental': native, 'react-native-reanimated': resolve('tests/helpers/native-motion.cjs') } });
  const fonts = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']].map(([folder, name]) => `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync('assets/fonts/' + folder + '/' + name + '.ttf').toString('base64')})}`).join('');
  writeFileSync(output + '/index.html', `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fonts}html,body,#root{height:100%;margin:0}#root{display:flex;flex-direction:column}</style><div id="root"></div><script src="app.js"></script>`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

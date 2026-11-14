/** Source-backed 3B-I atlas. Native boundaries only; sample values are review fixtures. */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const output = resolve('dist/shared-controls-atlas'); mkdirSync(output, { recursive: true });
const native = resolve('dist/transactions-v22-preview/native.jsx'), entry = resolve(output, 'entry.jsx');
writeFileSync(entry, `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{View,Platform,Keyboard,AccessibilityInfo,Dimensions}from'react-native';
import{DesignProvider,UiText,UiButton,useDesignColors}from'../../src/components/design-system';
import{FormField,FormSelect,FormChoice,FormWeekday,SegmentedControl,SelectField,InlineNameForm,FormSelectionHost,FormScrollView}from'../../src/components/form-controls';
import{AutocompleteField}from'../../src/components/autocomplete-field';import{InternalNavigation}from'../../src/components/internal-navigation';
import{TaskEditor}from'../../src/features/tasks/components/task-editor';import{ExerciseEditor}from'../../src/features/fitness/components/fitness-forms';
const params=new URLSearchParams(location.search),kind=params.get('case')||'inputs',large=params.has('large');Platform.OS=params.has('web')?'web':'ios';Keyboard.metrics=()=>undefined;Keyboard.addListener=()=>({remove(){}});AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});AccessibilityInfo.sendAccessibilityEvent=()=>{};
const get=Dimensions.get.bind(Dimensions);Dimensions.get=key=>({...get(key),fontScale:large?2:1});
if(large){const done=new WeakSet();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(done.has(e))return;done.add(e);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
const options=[{value:'personal',label:'Personal'},{value:'studio',label:'Studio and independent creative services with a deliberately long saved category name'}];
const task={id:'review-task',title:'Review the client proposal',description:'Saved task details',date:'2026-11-12',time:'14:30',priority:'medium',categoryId:null,completedAt:null,createdAt:1,updatedAt:1,deletedAt:null};
function App(){const c=useDesignColors(),[text,setText]=useState('A saved value'),[category,setCategory]=useState('personal'),[type,setType]=useState('bill'),[days,setDays]=useState(['Monday']),[client,setClient]=useState('Studio'),[choice,setChoice]=useState(true),[nav,setNav]=useState('Today');
const action={label:'Create category',title:'New category',render:controls=><InlineNameForm {...controls} appearance="v2" onSubmit={(name,complete)=>{window.reviewCreated=name;complete()}} formatError={()=>'Unable to create this category.'}/>};
if(kind==='task-new'||kind==='task-edit'||kind==='calendar-task')return <TaskEditor task={kind==='task-new'?null:task} recurrence={null} appearance={kind==='calendar-task'?undefined:'v2'} categories={[]} onDismiss={()=>{}} onSave={draft=>{window.reviewSaved=draft}} onCreateCategory={name=>({id:'review-category',name,isDefault:false,createdAt:1,updatedAt:1,deletedAt:null})}/>;
if(kind==='fitness')return <FormSelectionHost safeAreaApplied><ExerciseEditor appearance="v2" onDismiss={()=>{}} onCreated={()=>{}} onSave={draft=>({...draft,id:'review-exercise',isBuiltIn:false,createdAt:1,updatedAt:1,deletedAt:null})}/></FormSelectionHost>;
return <DesignProvider><FormSelectionHost safeAreaApplied><FormScrollView contentContainerStyle={{padding:16,gap:16,backgroundColor:c.canvas,minHeight:'100%'}}><UiText type="editorTitle">Shared controls</UiText>
{kind==='inputs'&&<><FormField appearance="v2" label="Resting input" value="" placeholder="Enter a value" onChangeText={()=>{}}/>
<FormField appearance="v2" label="Focused input" value={text} onChangeText={setText}/><FormField appearance="v2" label="Invalid input" value="Invalid saved value" error="Review this value." onChangeText={()=>{}}/>
<FormField appearance="v2" label="Amount" value="125,90" trailingText="R$" keyboardType="decimal-pad" onChangeText={()=>{}}/>
<FormField appearance="v2" label="Multiline notes" value="A longer note that should remain readable and accessible when the text size increases." multiline onChangeText={()=>{}}/></>}
{kind==='readonly'&&<><FormField appearance="v2" label="Read-only value" value="Linked payment from a source record" editable={false}/><FormField appearance="v2" label="Disabled value" value="Unavailable control" disabled/>
<FormField appearance="v2" label="Long filled value" value={text+' with a deliberately long saved description'} onChangeText={setText}/><FormSelect appearance="v2" label="Long selection" value={options[1].label} onPress={()=>{}}/></>}
{kind==='selections'&&<><SegmentedControl appearance="v2" label="Commitment type" value={type} options={[{value:'bill',label:'Bill'},{value:'subscription',label:'Subscription'},{value:'installment',label:'Installment'}]} onChange={setType}/>
<FormChoice appearance="v2" label="Selected choice" selected={choice} onPress={()=>setChoice(true)}/><FormChoice appearance="v2" label="Other choice" selected={!choice} onPress={()=>setChoice(false)}/>
<View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day=><FormWeekday key={day} appearance="v2" label={day} checked={days.includes(day)} onPress={()=>setDays(current=>current.includes(day)?current.filter(x=>x!==day):[...current,day])}/>)}</View>
<InternalNavigation compact value={nav} options={['Earlier','Today','To-do','Upcoming'].map(value=>({value,label:value}))} onChange={setNav}/></>}
{kind==='select'&&<SelectField appearance="v2" label="Category" value={category} options={options} onChange={setCategory} action={action}/>}
{kind==='autocomplete'&&<AutocompleteField appearance="v2" label="Client" value={client} displayValue={client} onSelect={setClient} getResults={query=>({suggestions:['Studio','Workshop'].filter(name=>name.toLowerCase().includes(query.toLowerCase())).map(name=>({value:name,label:name})),createLabel:query.trim()?'Create '+query:undefined})} onCreate={query=>{window.reviewCreated=query;return query}}/>}
{kind==='buttons'&&<><UiButton label="Primary action" variant="primary" onPress={()=>{}}/><UiButton label="Secondary action" onPress={()=>{}}/><UiButton label="Quiet action" variant="quiet" onPress={()=>{}}/><UiButton label="Destructive action" variant="destructive" onPress={()=>{}}/><UiButton label="Disabled action" disabled onPress={()=>{}}/><UiButton label="Loading action" busy onPress={()=>{}}/><UiButton label="Selected action" variant="navigation" selected onPress={()=>{}}/></>}
</FormScrollView></FormSelectionHost></DesignProvider>;}createRoot(document.getElementById('root')).render(<App/>);`);
async function main() {
  await build({ entryPoints: [entry], outfile: resolve(output, 'app.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' }, loader: { '.ttf': 'file' },
    alias: { 'react-native': 'react-native-web', 'expo-image': native, 'expo-font': native, 'expo-crypto': native, 'expo-router': native,
      '@react-native-community/datetimepicker': native, 'expo-router/react-navigation': native, 'react-native-safe-area-context': native,
      'react-native-screens/experimental': native, 'react-native-reanimated': resolve('tests/helpers/native-motion.cjs') } });
  const fonts = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']]
    .map(([folder, name]) => `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')})}`).join('');
  writeFileSync(resolve(output, 'index.html'), `<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fonts}html,body,#root{height:100%;margin:0}#root{display:flex;flex-direction:column}</style><div id="root"></div><script src="app.js"></script></html>`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

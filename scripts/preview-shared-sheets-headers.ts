/** Actual shared sheet/selector presentation with isolated, synthetic review data. */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const output = resolve('dist/shared-sheets-atlas'); mkdirSync(output, { recursive: true });
const native = resolve('dist/transactions-v22-preview/native.jsx'), entry = resolve(output, 'entry.jsx');
writeFileSync(entry, `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{View,Platform,Keyboard,AccessibilityInfo,Dimensions}from'react-native';
import{DesignProvider,UiText,UiButton,useDesignColors}from'../../src/components/design-system';
import{AdaptiveModal,AdaptiveSheet}from'../../src/components/adaptive-sheet';import{BackButton,PickerBackHeader}from'../../src/components/back-button';
import{FormField,FormSelect,SelectField,InlineNameForm,FormSelectionHost}from'../../src/components/form-controls';import{AutocompleteField}from'../../src/components/autocomplete-field';
import{MonthChooser}from'../../src/features/calendar/components/month-chooser';import{JournalLeave}from'../../src/features/journal/components/journal-leave';
import{ExerciseEditor}from'../../src/features/fitness/components/fitness-forms';import{TaskEditor}from'../../src/features/tasks/components/task-editor';import{ContextMenu}from'../../src/components/context-menu';
const params=new URLSearchParams(location.search),kind=params.get('case')||'operational',large=params.has('large');Platform.OS=params.has('web')?'web':'ios';
const listeners=new Map();Keyboard.metrics=()=>undefined;Keyboard.addListener=(name,fn)=>{if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);return{remove:()=>listeners.get(name).delete(fn)}};Keyboard.dismiss=()=>{};
window.reviewKeyboard=top=>{for(const name of ['keyboardDidShow','keyboardWillChangeFrame'])for(const fn of listeners.get(name)||[])fn({endCoordinates:{screenY:top,height:844-top}})};
AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});AccessibilityInfo.sendAccessibilityEvent=()=>{};
const get=Dimensions.get.bind(Dimensions);Dimensions.get=key=>({...get(key),fontScale:large?2:1});
if(large){const done=new WeakSet();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(done.has(e))return;done.add(e);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
const options=[{value:'personal',label:'Personal'},{value:'studio',label:'Independent creative services and international studio accounts'}];
function App(){const c=useDesignColors(),[open,setOpen]=useState(true),[value,setValue]=useState('personal'),[name,setName]=useState('Studio'),[text,setText]=useState('Saved review text'),[picker,setPicker]=useState(false);
const dismiss=()=>{window.reviewDismissed=(window.reviewDismissed||0)+1;setOpen(false)},save=()=>{window.reviewSaved=text};
const action={label:'Create category',title:'New category',render:controls=><InlineNameForm {...controls} appearance="v2" onSubmit={(value,done)=>{window.reviewCreated=value;done()}} formatError={()=>'Unable to create category.'}/>};
if(!open)return <DesignProvider><UiButton label="Open sheet" onPress={()=>setOpen(true)}/></DesignProvider>;
if(kind==='calendar')return <DesignProvider><MonthChooser month="2026-11-01" visible onSelect={(year,month)=>{window.reviewSelected=[year,month]}} onDismiss={dismiss} onClosed={()=>{}}/></DesignProvider>;
if(kind==='task'||kind==='nested')return <DesignProvider><TaskEditor task={null} recurrence={null} appearance="v2" categories={[]} onDismiss={dismiss} onSave={draft=>{window.reviewSaved=draft}} onCreateCategory={name=>({id:'category',name,isDefault:false,createdAt:1,updatedAt:1,deletedAt:null})}/></DesignProvider>;
if(kind==='host-escape')return <DesignProvider><FormSelectionHost safeAreaApplied><SelectField appearance="v2" label="Category" value={value} options={options} onChange={setValue}/><AutocompleteField appearance="v2" label="Client" value={name} displayValue={name} onSelect={setName} getResults={q=>({suggestions:['Studio','Workshop'].filter(x=>x.toLowerCase().includes(q.toLowerCase())).map(x=>({value:x,label:x}))})}/></FormSelectionHost></DesignProvider>;
return <DesignProvider><AdaptiveModal onDismiss={dismiss}>
{kind==='fitness'?<ExerciseEditor appearance="v2" onDismiss={dismiss} onCreated={()=>{}} onSave={draft=>({...draft,id:'fixture-exercise',isBuiltIn:false,createdAt:1,updatedAt:1,deletedAt:null})}/>:
kind==='journal'?<JournalLeave onChoose={choice=>{window.reviewChoice=choice;if(choice==='keep')dismiss()}}/>:
<AdaptiveSheet appearance={kind==='legacy'?undefined:'v2'} titleRole={['operational','selector','inline','autocomplete','empty','picker','history','context'].includes(kind)?'operational':'editorial'}
title={kind==='long'?'New strength and conditioning routine for the next training phase':kind==='history'?'International independent studio · History':kind==='legacy'?'Legacy exercise note':kind==='editorial'?'New reflection':kind==='picker'?'Choose a date':'Choose an account'}
action={['editorial','long','legacy'].includes(kind)?'Save':undefined} onConfirm={save} onDismiss={dismiss}>
{['selector','inline'].includes(kind)?<SelectField appearance="v2" label="Category" value={value} options={options} onChange={setValue} action={action}/>:
['autocomplete','empty'].includes(kind)?<AutocompleteField appearance="v2" label="Client" value={name} displayValue={name} onSelect={setName} getResults={q=>({suggestions:['Studio','Workshop'].filter(x=>x.toLowerCase().includes(q.toLowerCase())).map(x=>({value:x,label:x})),createLabel:q.trim()?'Create '+q:undefined})} onCreate={q=>{window.reviewCreated=q;return q}}/>:
kind==='context'?<ContextMenu appearance="v2" label="Record options" actions={[{label:'Edit',onPress:save},{label:'Delete',variant:'destructive',onPress:save}]}/>:
kind==='picker'?<><FormSelect appearance="v2" label="Date" value="12 Nov 2026" expanded={picker} onPress={()=>setPicker(true)}/>{picker&&<PickerBackHeader appearance="v2" title="Date *" onBack={()=>setPicker(false)}/>}<UiText type="metadata">Native picker rendering is device-owned.</UiText></>:
kind==='history'?<><UiText type="sectionHeading">Jobs</UiText><UiText>Completed client work</UiText><UiText type="sectionHeading">Receipts</UiText><UiText>Actual received payments</UiText></>:
<><FormField appearance={kind==='legacy'?undefined:'v2'} label="Name" value={text} onChangeText={setText}/><FormField appearance={kind==='legacy'?undefined:'v2'} label="Notes" multiline value="Source-owned draft content remains unchanged." onChangeText={()=>{}}/></>}
</AdaptiveSheet>}
</AdaptiveModal></DesignProvider>;}createRoot(document.getElementById('root')).render(<App/>);`);
async function main() {
  await build({ entryPoints: [entry], outfile: resolve(output, 'app.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' }, loader: { '.ttf': 'file' },
    alias: { 'react-native': 'react-native-web', 'expo-image': native, 'expo-font': native, 'expo-crypto': native, 'expo-router': native,
      '@react-native-community/datetimepicker': native, 'expo-router/react-navigation': native, 'react-native-safe-area-context': native,
      'react-native-screens/experimental': native, 'react-native-reanimated': resolve('tests/helpers/native-motion.cjs') } });
  const fonts = [['manrope','Manrope-Regular'],['manrope','Manrope-SemiBold'],['lora','Lora-SemiBold']].map(([folder,name])=>`@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')})}`).join('');
  writeFileSync(resolve(output,'index.html'),`<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fonts}html,body,#root{height:100%;margin:0}#root{display:flex;flex-direction:column}</style><div id="root"></div><script src="app.js"></script></html>`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});

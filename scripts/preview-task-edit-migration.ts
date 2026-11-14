/** Isolated actual TaskEditor preview. Appearance is read from its production caller. */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const output = resolve('dist/task-edit-atlas');
mkdirSync(output, { recursive: true });
const source = readFileSync('src/features/tasks/tasks-screen.tsx', 'utf8');
const ast = ts.createSourceFile('tasks-screen.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let appearance = '';
function find(node: ts.Node) {
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === 'TaskEditor') {
    const prop = node.attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.getText(ast) === 'appearance') as ts.JsxAttribute;
    appearance = ts.isJsxExpression(prop.initializer!) ? prop.initializer.expression!.getText(ast) : prop.initializer!.getText(ast);
  }
  ts.forEachChild(node, find);
}
find(ast);
if (!appearance) throw new Error('Production TaskEditor appearance not found');
const native = resolve('dist/transactions-v22-preview/native.jsx');
writeFileSync(resolve(output, 'picker.jsx'), `import React from 'react';import{View,Text}from'react-native';export const DateTimePickerAndroid={open(){}};export default function Picker(){return <View accessibilityLabel="Native picker boundary" style={{padding:16}}><Text>Native iOS picker — device verification required</Text></View>}`);
writeFileSync(resolve(output, 'entry.jsx'), `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{View,Platform,Keyboard,AccessibilityInfo,Dimensions}from'react-native';
import{TaskEditor}from'../../src/features/tasks/components/task-editor';import{TaskActions}from'../../src/features/tasks/components/task-actions';import{DesignProvider,useDesignColors}from'../../src/components/design-system';
const params=new URLSearchParams(location.search),kind=params.get('case')||'edit',large=params.has('large'),repeating=params.has('repeating');Platform.OS=params.has('web')?'web':'ios';Keyboard.metrics=()=>params.has('keyboard')?{screenY:520,height:324}:undefined;Keyboard.addListener=()=>({remove(){}});Keyboard.dismiss=()=>{};AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});AccessibilityInfo.sendAccessibilityEvent=()=>{};
const get=Dimensions.get.bind(Dimensions);Dimensions.get=key=>({...get(key),fontScale:large?2:1});
if(large){const done=new WeakSet();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(done.has(e))return;done.add(e);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
const category={id:'studio',name:'Studio',isDefault:false,createdAt:1,updatedAt:1,deletedAt:null};
const task={id:'existing-task',title:kind==='long'?'Review the client proposal and prepare the supporting material for the next meeting':'Review the client proposal',description:kind==='empty'?null:kind==='long'?'Keep the original requirements, include all accessibility findings and discuss the delivery schedule. '.repeat(4):'Saved task details',date:kind==='empty'?null:'2026-11-13',time:kind==='empty'?null:'14:30',priority:kind==='empty'?'none':'high',categoryId:kind==='empty'?null:'studio',completedAt:null,createdAt:1,updatedAt:1,deletedAt:null};
const recurrence={id:'existing-rule',taskId:task.id,frequency:'weekly',interval:2,weekdayMask:5,monthDay:13,month:11,startDate:'2026-11-13',endDate:'2026-12-31',effectiveFrom:'2026-11-13',effectiveUntil:null,createdAt:1,updatedAt:1,deletedAt:null};
function App(){const c=useDesignColors(),[closed,setClosed]=useState(false),[categories,setCategories]=useState([category]);document.body.style.backgroundColor=c.canvas;const dismiss=()=>{window.reviewDismissed=(window.reviewDismissed||0)+1;setClosed(true)};
if(closed)return <View accessibilityLabel="Editor dismissed"/>;
if(kind==='actions')return <TaskActions item={{key:task.id,task,occurrence:null}} recurrences={[]} categories={categories} now={new Date(2026,10,13,12).getTime()} visible error={null} onDismiss={dismiss} onClosed={()=>{}} onEdit={()=>{}} onHistory={()=>{}} onSkip={()=>{}} onDelete={()=>{}}/>;
return <TaskEditor task={kind==='new'?null:task} recurrence={['recurring','recurrence'].includes(kind)?recurrence:null} appearance={${appearance}} categories={categories} onSave={draft=>{window.reviewSaved=draft}} onDismiss={dismiss} onCreateCategory={name=>{const created={...category,id:'new-category',name};setCategories(v=>[...v,created]);return created}}/>;
}createRoot(document.getElementById('root')).render(<DesignProvider><App/></DesignProvider>);`);
async function main() {
  await build({ entryPoints: [resolve(output, 'entry.jsx')], outfile: resolve(output, 'app.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' }, loader: { '.ttf': 'file' },
    alias: { 'react-native': 'react-native-web', 'expo-image': native, 'expo-font': native, 'expo-crypto': native, 'expo-router': native,
      '@react-native-community/datetimepicker': resolve(output, 'picker.jsx'), 'expo-router/react-navigation': native, 'react-native-safe-area-context': native,
      'react-native-screens/experimental': native, 'react-native-reanimated': resolve('tests/helpers/native-motion.cjs') } });
  const fonts = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']].map(([folder, name]) =>
    `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync('assets/fonts/'+folder+'/'+name+'.ttf').toString('base64')})}`).join('');
  writeFileSync(resolve(output, 'index.html'), `<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fonts}html,body,#root{height:100%;margin:0}#root{display:flex;flex-direction:column}</style><div id="root"></div><script src="app.js"></script></html>`);
  console.log('Production appearance:', appearance);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

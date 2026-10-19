/** Browser review of the real TaskEditor. Native OS boundaries are substituted, not form logic. */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
import{Platform,Keyboard,AccessibilityInfo,Dimensions}from'react-native';
import{TaskEditor}from'../../src/features/tasks/components/task-editor';
Platform.OS='ios';Keyboard.metrics=()=>undefined;Keyboard.addListener=()=>({remove(){}});
AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});
AccessibilityInfo.sendAccessibilityEvent=()=>{};
const large=new URLSearchParams(location.search).has('large');
const dimensionsGet=Dimensions.get.bind(Dimensions);Dimensions.get=(key)=>({...dimensionsGet(key),fontScale:large?2:1});
function App(){const[categories,setCategories]=useState([{id:'work',name:'Work',isDefault:false,createdAt:1,updatedAt:1,deletedAt:null}]);
return <TaskEditor task={null} recurrence={null} categories={categories} onDismiss={()=>{}} onSave={(draft)=>{window.reviewSaved=draft}}
onCreateCategory={(name)=>{const category={id:'review-'+name,name,isDefault:false,createdAt:1,updatedAt:1,deletedAt:null};setCategories(current=>[...current,category]);return category}}/>;}
createRoot(document.getElementById('root')).render(<App/>);
if(large){const sizes=new WeakMap();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(sizes.has(e))return;sizes.set(e,true);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
`);
async function main() {
  await build({ entryPoints: [entry], outfile: resolve(output, 'app.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' }, loader: { '.ttf': 'file' }, assetNames: '[name]',
    alias: { 'react-native': 'react-native-web', 'expo-image': boundary, 'expo-font': boundary, 'expo-router': boundary,
      'react-native-safe-area-context': boundary, '@react-native-community/datetimepicker': boundary,
      'react-native-reanimated': resolve('tests/helpers/native-motion.cjs') } });
  const fonts = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']].map(([folder, name]) =>
    `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')}) format('truetype');font-weight:400}`).join('');
  writeFileSync(resolve(output, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${fonts}html,body,#root{margin:0;height:100%;}body{background:#F5F0EA}</style></head><body><div id="root"></div><script src="app.js"></script></body></html>`);
  console.log('Real TaskEditor browser review: dist/new-task-review/index.html. Native picker/font/image/safe-area/motion boundaries substituted; not native-device acceptance.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

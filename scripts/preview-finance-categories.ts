/** Real Categories/editor components with explicit browser/native/data fixture boundaries. */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DesignColors } from '../src/constants/design-system-v2';
import { journalDatabase } from '../tests/helpers/journal';

const output = resolve('dist/finance-categories-v2-preview'); mkdirSync(output, { recursive: true });
const native = resolve(output, 'native.jsx'), entry = resolve(output, 'entry.jsx');
writeFileSync(native, `import React,{createContext,useEffect}from'react';import{View,StyleSheet}from'react-native';
export const useFonts=()=>[true,null];export const SafeAreaView=View;export const SafeAreaInsetsContext=createContext({top:0,bottom:0,left:0,right:0});export const SafeAreaProvider=({children})=>children;export const useSafeAreaInsets=()=>({top:0,bottom:0,left:0,right:0});
export const randomUUID=()=>crypto.randomUUID();export const useFocusEffect=callback=>useEffect(callback,[callback]);export const useNavigation=()=>({dispatch(){}});export const usePreventRemove=()=>{};export const useLocalSearchParams=()=>({});export const router={canGoBack:()=>true,back(){},replace(){},push(){}};
export const DateTimePickerAndroid={open(){}};export default function Picker(){return null;}
export function Image({source,style,testID}){return <img alt="" aria-hidden="true" data-testid={testID} src={source?.uri} style={StyleSheet.flatten(style)}/>;}`);
writeFileSync(entry, `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{Alert,Platform,Keyboard,AccessibilityInfo,Dimensions}from'react-native';
import{FinanceCategoryManager}from'../../src/features/finance/components/category-manager';import{TransactionEditor}from'../../src/features/finance/components/transaction-editor';
import{FinanceValidationError}from'../../src/features/finance/errors';import{normalizeIdentityDisplayName,canonicalIdentityName}from'../../src/utils/text-normalization';import fixture from'./fixture.json';
const params=new URLSearchParams(location.search),large=params.has('large'),keyboard=params.has('keyboard');
Platform.OS='web';Keyboard.metrics=()=>keyboard?{screenY:520,height:400}:undefined;Keyboard.addListener=()=>({remove(){}});AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});AccessibilityInfo.sendAccessibilityEvent=()=>{};Alert.alert=(title,message,buttons)=>{window.reviewAlert={title,message,buttons}};
const get=Dimensions.get.bind(Dimensions);Dimensions.get=key=>({...get(key),fontScale:large?2:1});
if(large){const sized=new WeakSet();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(sized.has(e))return;sized.add(e);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
function App(){const[categories,setCategories]=useState(fixture[params.get('scenario')||'normal']);const[open,setOpen]=useState(true);
const create=(name,type)=>{const normalized=normalizeIdentityDisplayName(name);if(!normalized)throw new FinanceValidationError('Enter a category name.');if(categories.some(c=>c.type===type&&c.deletedAt===null&&canonicalIdentityName(c.name)===canonicalIdentityName(normalized)))throw new FinanceValidationError('A category with this name already exists for this type.');const created={id:crypto.randomUUID(),name:normalized,type,isBuiltIn:false,createdAt:1,updatedAt:1,deletedAt:null};setCategories(old=>[...old,created].sort((a,b)=>a.name.localeCompare(b.name)));return created;};
window.reviewCategories=categories;return !open?<div>Returned to Transactions</div>:params.has('parent')?<TransactionEditor transaction={null} categories={categories} onCreateCategory={create} onSave={draft=>window.reviewSaved=draft} onDismiss={()=>setOpen(false)}/>:<FinanceCategoryManager categories={categories} onCreate={create} onDelete={id=>setCategories(old=>old.map(c=>c.id===id?{...c,deletedAt:2,updatedAt:2}:c))} onDismiss={()=>setOpen(false)}/>;}
createRoot(document.getElementById('root')).render(<App/>);`);

async function main() {
  const fixture: Record<string, unknown> = {};
  for (const scenario of ['normal', 'custom', 'archived', 'long', 'large']) {
    const f = await journalDatabase();
    try {
      if (scenario !== 'normal') {
        f.finance.createCategory('Travel', 'expense'); f.finance.createCategory('ChatGPT', 'expense'); f.finance.createCategory('Lessons', 'income');
        if (scenario === 'archived') f.finance.deleteCategory(f.finance.createCategory('Historical category', 'expense').id);
        if (scenario === 'long') f.finance.createCategory('VeryLongUnbrokenCategoryName'.repeat(4), 'expense');
        if (scenario === 'large') for (let i = 0; i < 225; i++) f.finance.createCategory(`Custom ${i.toString().padStart(3, '0')}`, 'expense');
      }
      fixture[scenario] = f.finance.readCategories();
    } finally { f.sqlite.close(); }
  }
  writeFileSync(resolve(output, 'fixture.json'), JSON.stringify(fixture));
  await build({ entryPoints: [entry], outfile: resolve(output, 'app.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' }, loader: { '.ttf': 'file' },
    alias: { 'react-native': 'react-native-web', 'expo-image': native, 'expo-font': native, 'expo-crypto': native, 'expo-router': native,
      '@react-native-community/datetimepicker': native, 'expo-router/react-navigation': native, 'react-native-safe-area-context': native,
      'react-native-screens/experimental': native, 'react-native-reanimated': resolve('tests/helpers/native-motion.cjs') } });
  const fonts = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']].map(([folder, name]) =>
    `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')}) format('truetype');font-weight:400}`).join('');
  writeFileSync(resolve(output, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${fonts}html,body,#root{height:100%;margin:0}body{background:${DesignColors.light.canvas}}@media(prefers-color-scheme:dark){body{background:${DesignColors.dark.canvas}}}#root{display:flex;flex-direction:column}</style></head><body><div id="root"></div><script src="app.js"></script></body></html>`);
  console.log(output);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

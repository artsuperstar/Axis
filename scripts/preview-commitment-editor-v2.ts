/** Real editor/sheet; browser native boundaries are review fixtures, not device proof. */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { journalDatabase } from '../tests/helpers/journal';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import { DesignColors } from '../src/constants/design-system-v2';

const output = resolve('dist/commitment-editor-v2-preview'); mkdirSync(output, { recursive: true });
const native = resolve(output, 'native.jsx'), entry = resolve(output, 'entry.jsx');
writeFileSync(native, `import React,{createContext}from'react';import{View,StyleSheet}from'react-native';
export const useFonts=()=>[true,null];export const SafeAreaProvider=({children})=>children;export const useSafeAreaInsets=()=>({top:0,bottom:0,left:0,right:0});export const SafeAreaView=View;export const SafeAreaInsetsContext=createContext({top:0,bottom:0,left:0,right:0});export const DateTimePickerAndroid={open(){}};
export function Image({source,style,testID}){return <img alt="" aria-hidden="true" data-testid={testID} src={source?.uri} style={StyleSheet.flatten(style)}/>;}
export default function Picker({value,onValueChange}){const civil=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');return <input aria-label="Review native date picker boundary" type="date" value={civil(value)} onChange={e=>onValueChange({},new Date(e.target.value+'T12:00:00'))} style={{fontSize:18,padding:16,width:'100%',boxSizing:'border-box'}}/>;}`);
writeFileSync(entry, `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{Platform,Keyboard,AccessibilityInfo,Dimensions}from'react-native';import{CommitmentModal,CommitmentEditor}from'../../src/features/finance/commitments/components/commitment-forms';import raw from'./fixture.json';
const data=JSON.parse(JSON.stringify(raw),(_,v)=>v&&typeof v==='object'&&'$bigint'in v?BigInt(v.$bigint):v),params=new URLSearchParams(location.search),scenario=params.get('scenario')||'new-bill',large=params.has('large');Platform.OS=params.has('web')?'web':'ios';Keyboard.metrics=()=>params.has('keyboard')?{screenY:560,height:340,width:innerWidth,screenX:0}:undefined;Keyboard.addListener=()=>({remove(){}});AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});AccessibilityInfo.sendAccessibilityEvent=()=>{};
const get=Dimensions.get.bind(Dimensions);Dimensions.get=key=>({...get(key),fontScale:large?2:1});if(large){const sized=new WeakSet();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(sized.has(e))return;sized.add(e);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
function App(){const[closed,setClosed]=useState(false);return closed?null:<CommitmentModal onDismiss={()=>setClosed(true)}><CommitmentEditor item={scenario.startsWith('edit-')?data.items[scenario.slice(5)]:null} categories={data.categories} onDismiss={()=>{window.reviewDismissed=true;setClosed(true)}} onSave={draft=>{window.reviewSaved=draft;if(scenario==='save-error')throw Error('Review write failure')}} onCreateCategory={name=>({id:'review-new-category',name,type:'expense',isBuiltIn:false,deletedAt:null,createdAt:0,updatedAt:0})}/></CommitmentModal>;}createRoot(document.getElementById('root')).render(<App/>);`);

async function main() {
  const f = await journalDatabase();
  try {
    f.setTime('2026-10-24');
    const category = f.finance.createCategory('Historical archived household education and entertainment category', 'expense');
    const items: Record<string, unknown> = {};
    for (const kind of ['bill', 'subscription', 'installment'] as const) {
      const id = f.commitments.create({ ...commitmentDraft(null, undefined, '2026-10-01'), title: kind === 'bill' ? 'Electricity bill' : kind === 'subscription' ? 'Monthly subscription' : 'Household computer plan', kind, amount: '180', installmentCount: kind === 'installment' ? '12' : '', categoryId: category.id });
      f.commitments.pay(f.commitments.readHistory(id).outstanding[0], '175', '2026-10-02');
      items[kind] = f.commitments.readHistory(id);
    }
    f.finance.deleteCategory(category.id);
    f.finance.createCategory('Long active household education and entertainment category', 'expense');
    writeFileSync(resolve(output, 'fixture.json'), JSON.stringify({ items, categories: f.finance.readCategories() }, (_, value) => typeof value === 'bigint' ? { $bigint: value.toString() } : value));
  } finally { f.sqlite.close(); }
  await build({ entryPoints: [entry], outfile: resolve(output, 'app.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' }, loader: { '.ttf': 'file' },
    alias: { 'react-native': 'react-native-web', 'expo-image': native, 'expo-font': native, '@react-native-community/datetimepicker': native, 'react-native-safe-area-context': native, 'react-native-reanimated': resolve('tests/helpers/native-motion.cjs') } });
  const fonts = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']].map(([folder, name]) => `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')}) format('truetype');font-weight:400}`).join('');
  writeFileSync(resolve(output, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fonts}html,body,#root{height:100%;margin:0;background:${DesignColors.light.canvas}}@media(prefers-color-scheme:dark){html,body,#root{background:${DesignColors.dark.canvas}}}#root{display:flex;flex-direction:column}textarea{resize:none}</style></head><body><div id="root"></div><script src="app.js"></script></body></html>`);
  console.log(output);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

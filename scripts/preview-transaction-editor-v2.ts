/** Native editor component review; RN Web boundaries are explicit, not native device proof.
 * Run preview-finance-transactions.ts first to generate the shared review-only native/ledger fixtures. */
import { build } from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const output = resolve('dist/transaction-editor-v2-preview'); mkdirSync(output, { recursive: true });
for (const file of ['native.jsx', 'finance-hook.jsx', 'fixture.json']) copyFileSync(resolve('dist/transactions-v2-preview', file), resolve(output, file));
const native = resolve(output, 'native.jsx'), hook = resolve(output, 'finance-hook.jsx'), entry = resolve(output, 'entry.jsx');
writeFileSync(hook, readFileSync(hook, 'utf8').replace("scenario=p.get('scenario')||'normal'", "scenario=p.get('scenario')==='list'?'normal':p.get('scenario')||'normal'"));
// Browser date control represents only the community picker's value callback boundary.
writeFileSync(native, readFileSync(native, 'utf8').replace("export default function Picker(){return null;}", `export default function Picker({value,maximumDate,onValueChange}){const civil=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');return <input aria-label="Review date picker boundary" type="date" value={civil(value)} max={civil(maximumDate)} onChange={e=>onValueChange({},new Date(e.target.value+'T12:00:00'))} style={{padding:16,colorScheme:'dark',fontSize:18,width:'100%',boxSizing:'border-box'}}/>;}`));
writeFileSync(entry, `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{Platform,Keyboard,AccessibilityInfo,Dimensions}from'react-native';import{TransactionEditor}from'../../src/features/finance/components/transaction-editor';import{FinanceScreen}from'../../src/features/finance/finance-screen';import fixture from'./fixture.json';
const params=new URLSearchParams(location.search),scenario=params.get('scenario')||'new',large=params.has('large');Platform.OS='ios';
Keyboard.metrics=()=>params.has('keyboard')?{screenY:560,height:340,width:innerWidth,screenX:0}:undefined;Keyboard.addListener=()=>({remove(){}});AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});AccessibilityInfo.sendAccessibilityEvent=()=>{};
const get=Dimensions.get.bind(Dimensions);Dimensions.get=key=>({...get(key),fontScale:large?2:1});
if(large){const sized=new WeakSet();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(sized.has(e))return;sized.add(e);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
function App(){const[closed,setClosed]=useState(false);if(scenario==='list')return <FinanceScreen/>;
const data=fixture[scenario==='stress'?'stress':'normal'];const transaction=scenario==='new'?null:scenario==='stress'?data.transactions.find(t=>t.amountMinor===Number.MAX_SAFE_INTEGER&&t.type==='expense'):{...data.transactions.find(t=>t.description==='Popeyes'),description:'Household supplies and groceries',note:'Receipt stored with personal records.\\nNo reimbursement expected.',amountMinor:234567,transactionDate:'2026-10-22'};
return closed?null:<TransactionEditor transaction={transaction} categories={data.categories} onCreateCategory={(name,type)=>({id:'preview-custom',name,type,deletedAt:null,isBuiltIn:false,createdAt:0,updatedAt:0})} onDismiss={()=>{window.reviewDismissed=true;setClosed(true)}} onSave={draft=>{window.reviewSaved=draft;if(scenario==='saveError')throw new Error('Review database failure')}}/>;}
createRoot(document.getElementById('root')).render(<App/>);`);
async function main() {
 await build({ entryPoints: [entry], outfile: resolve(output, 'app.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' }, loader: { '.ttf': 'file' },
  plugins: [{ name: 'review-ledger-only', setup(builder) { builder.onResolve({ filter: /^\.\/use-finance$/ }, () => ({ path: hook })); } }],
  alias: { 'react-native': 'react-native-web', 'expo-image': native, 'expo-font': native, 'expo-crypto': native, 'expo-router': native,
   '@react-native-community/datetimepicker': native, 'expo-router/react-navigation': native, 'react-native-safe-area-context': native,
   'react-native-screens/experimental': native, 'react-native-reanimated': resolve('tests/helpers/native-motion.cjs') } });
 const fonts = [['manrope','Manrope-Regular'],['manrope','Manrope-SemiBold'],['lora','Lora-SemiBold']].map(([folder,name])=>`@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')}) format('truetype');font-weight:400}`).join('');
 writeFileSync(resolve(output,'index.html'),`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fonts}html,body,#root{height:100%;margin:0;background:#151315}#root{display:flex;flex-direction:column}textarea{resize:none}</style></head><body><div id="root"></div><script src="app.js"></script></body></html>`);
 console.log(output);
}
main().catch(error=>{console.error(error);process.exitCode=1});

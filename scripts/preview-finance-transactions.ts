/** Review-only RN Web fixture. Real screen/components; native boundaries and ledger lifecycle
 * are substituted. Real SQLite paging, Unicode search and permissions are tested separately. */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { transactionDraft } from '../src/features/finance/form';
import { maxAmountMinor, formatBrlInput } from '../src/features/finance/money';
import { journalDatabase } from '../tests/helpers/journal';

const output = resolve('dist/transactions-v22-preview'); mkdirSync(output, { recursive: true });
const native = resolve(output, 'native.jsx'), hook = resolve(output, 'finance-hook.jsx'), entry = resolve(output, 'entry.jsx');
writeFileSync(native, `import React,{createContext,useEffect}from'react';import{View,StyleSheet}from'react-native';
export const useFonts=()=>[true,null];export const SafeAreaView=View;export const SafeAreaInsetsContext=createContext({top:0,bottom:0,left:0,right:0});export const SafeAreaProvider=({children})=>children;export const useSafeAreaInsets=()=>({top:0,bottom:0,left:0,right:0});
export const randomUUID=()=>crypto.randomUUID();export const useFocusEffect=callback=>useEffect(callback,[callback]);export const useNavigation=()=>({dispatch(){}});export const usePreventRemove=()=>{};export const useLocalSearchParams=()=>({});
export const router={canGoBack:()=>true,back(){},replace(){},push(){}};export const DateTimePickerAndroid={open(){}};export default function Picker(){return null;}
export function Image({source,style,testID}){return <img alt="" aria-hidden="true" data-testid={testID} src={source?.uri} style={StyleSheet.flatten(style)}/>;}`);
writeFileSync(hook, `import{useState}from'react';import fixture from'./fixture.json';import{periodBounds}from'../../src/features/finance/periods';import{transactionMatches}from'../../src/features/finance/transactions-filter';import{canonicalSearchText}from'../../src/utils/text-normalization';
export function useFinance(){const p=new URLSearchParams(location.search),scenario=p.get('scenario')||'normal';const[selection,set]=useState({view:'transactions',period:periodBounds('month','2026-10-23'),ledgerFilter:{type:p.get('type')||'all',query:p.get('query')||''}});const[limit,setLimit]=useState(40);
const data=fixture[scenario],filter=selection.ledgerFilter,categories=data.categories,map=new Map(categories.map(c=>[c.id,c]));const matches=data.transactions.filter(t=>(filter.type==='all'||t.type===filter.type)&&transactionMatches(t,canonicalSearchText(filter.query),map,data.sources[t.id]));const transactions=matches.slice(0,limit);window.reviewLedger={limit,total:matches.length,shown:transactions.length};
return{selection,today:'2026-10-23',snapshot:{categories,transactions,items:[],work:null,analytics:null,ledger:{sources:data.sources,next:matches.length>limit?{}:null}},error:null,access:{},commitmentAccess:{},workAccess:{},reload(){},mutate:f=>f(),setView:view=>set(s=>({...s,view})),setPeriodKind(){},navigatePeriod(){},returnToCurrent(){},loadMoreTransactions:()=>setLimit(n=>n+40),setTransactionType:type=>{setLimit(40);set(s=>({...s,ledgerFilter:{...s.ledgerFilter,type}}))},setTransactionQuery:query=>{setLimit(40);set(s=>({...s,ledgerFilter:{...s.ledgerFilter,query}}))},searchingTransactions:false,transactionResultsCurrent:true};}`);
writeFileSync(entry, `import React from'react';import{createRoot}from'react-dom/client';import{Platform,Keyboard,AccessibilityInfo,Dimensions}from'react-native';import{FinanceScreen}from'../../src/features/finance/finance-screen';
Platform.OS='ios';Keyboard.metrics=()=>undefined;Keyboard.addListener=()=>({remove(){}});AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});AccessibilityInfo.sendAccessibilityEvent=()=>{};
const large=new URLSearchParams(location.search).has('large'),get=Dimensions.get.bind(Dimensions);Dimensions.get=key=>({...get(key),fontScale:large?2:1});
if(large){const sized=new WeakSet();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(sized.has(e))return;sized.add(e);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
createRoot(document.getElementById('root')).render(<FinanceScreen/>);`);

async function main() {
  const fixture: Record<string, unknown> = {};
  for (const scenario of ['normal', 'stress', 'history', 'empty']) {
    const f = await journalDatabase();
    try {
      f.setTime('2026-10-23');
      const categories = f.finance.readCategories();
      const category = (name: string, type = 'expense') => categories.find(c => c.name === name && c.type === type)!.id;
      const create = (description: string, amount: string, categoryId: string | null, date: string, type: 'expense' | 'income' = 'expense') =>
        f.finance.createTransaction({ ...transactionDraft(), description, amount, categoryId, transactionDate: date, type });
      const sources: Record<string, unknown> = {};
      if (scenario !== 'empty') {
        const chat = create('ChatGPT', '100', null, '2026-10-21');
        const internet = create('Internet', '150', category('Utilities'), '2026-10-21');
        sources[chat] = { kind: 'commitment', name: 'ChatGPT', commitmentId: 'preview', dueDate: '2026-10-28' };
        sources[internet] = { kind: 'commitment', name: 'Internet', commitmentId: 'preview', dueDate: '2026-10-28' };
        create('Água', '14', category('Food'), '2026-10-13'); create('Popeyes', '45,90', category('Food'), '2026-10-13');
        create('Salary received', '2490', category('Salary', 'income'), '2026-10-04', 'income');
        create('Uncategorized receipt', '31', null, '2026-10-04');
        const work = create('Work payment', '600', null, '2026-10-22', 'income');
        sources[work] = { kind: 'work', jobs: [{ id: 'preview-work', title: 'Training' }], clientName: 'João Inglês' };
      }
      if (scenario === 'stress') {
        const custom = f.finance.createCategory('A long archived historical category describing education and household learning costs', 'expense');
        create('A long transaction name identifying a purchase with a complete maximum monetary value', formatBrlInput(maxAmountMinor), custom.id, '2026-10-23');
        f.finance.deleteCategory(custom.id);
        create('VeryLongUnbrokenTransactionName'.repeat(3), formatBrlInput(maxAmountMinor), null, '2026-10-23', 'income');
      }
      if (scenario === 'history') for (let i = 0; i < 145; i++) create(`Historical movement ${i}`, '25,90', category('Food'), '2026-09-01');
      fixture[scenario] = { ...f.finance.readLedgerPage(200), sources };
    } finally { f.sqlite.close(); }
  }
  writeFileSync(resolve(output, 'fixture.json'), JSON.stringify(fixture));
  await build({ entryPoints: [entry], outfile: resolve(output, 'app.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' }, loader: { '.ttf': 'file' },
    plugins: [{ name: 'review-only-ledger', setup(builder) { builder.onResolve({ filter: /^\.\/use-finance$/ }, () => ({ path: hook })); } }],
    alias: { 'react-native': 'react-native-web', 'expo-image': native, 'expo-font': native, 'expo-crypto': native, 'expo-router': native,
      '@react-native-community/datetimepicker': native, 'expo-router/react-navigation': native, 'react-native-safe-area-context': native,
      'react-native-screens/experimental': native, 'react-native-reanimated': resolve('tests/helpers/native-motion.cjs') } });
  const fonts = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']].map(([folder, name]) =>
    `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')}) format('truetype');font-weight:400}`).join('');
  writeFileSync(resolve(output, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${fonts}html,body,#root{height:100%;margin:0}#root{display:flex;flex-direction:column}</style></head><body><div id="root"></div><script src="app.js"></script></body></html>`);
  console.log(output);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

/** Functional Stage 1 review: real FinanceScreen/components with SQLite-generated analytics.
 * Native/browser boundaries and the useFinance lifecycle are substituted only in this preview.
 */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { transactionDraft } from '../src/features/finance/form';
import { periodBounds, movePeriod } from '../src/features/finance/periods';
import { journalDatabase } from '../tests/helpers/journal';

const output = resolve(process.argv.includes('--spending-fix') ? 'dist/finance-spending-v21-review' : process.argv.includes('--stage2') ? 'dist/finance-overview-v2-review' : 'dist/finance-charts-review'); mkdirSync(output, { recursive: true });
const native = resolve(output, 'native.jsx'), hook = resolve(output, 'finance-hook.jsx'), entry = resolve(output, 'entry.jsx');
writeFileSync(native, `import React,{createContext,useEffect}from'react';import{View,StyleSheet}from'react-native';
export const useFonts=()=>[true,null];export const SafeAreaView=View;export const SafeAreaInsetsContext=createContext({top:0,bottom:0,left:0,right:0});export const SafeAreaProvider=({children})=>children;export const useSafeAreaInsets=()=>({top:0,bottom:0,left:0,right:0});
export const randomUUID=()=>crypto.randomUUID();export const useFocusEffect=callback=>useEffect(callback,[callback]);export const useNavigation=()=>({dispatch(){}});export const usePreventRemove=()=>{};export const useLocalSearchParams=()=>({});
export const router={canGoBack:()=>true,back(){},replace(){},push:path=>window.reviewRoute=path};export const DateTimePickerAndroid={open(){}};export default function Picker(){return null;}
export function Image({source,style,testID}){return <img alt="" aria-hidden="true" data-testid={testID} src={source?.uri} style={StyleSheet.flatten(style)}/>;}`);
writeFileSync(hook, `import{useState}from'react';import raw from'./fixture.json';import{periodBounds,movePeriod}from'../../src/features/finance/periods';
const fixture=JSON.parse(JSON.stringify(raw),(key,value)=>key.endsWith('Minor')&&typeof value==='string'?BigInt(value):value);
export function useFinance(){const params=new URLSearchParams(location.search);const scenario=params.get('scenario')||'normal';const[selection,setSelection]=useState(()=>({view:'dashboard',period:periodBounds(params.get('period')||'month','2026-10-22')}));
const analytics=fixture[scenario][selection.period.kind+':'+selection.period.startDate];return{selection,today:'2026-10-22',snapshot:{analytics,categories:[],transactions:[],items:[],work:null},error:null,access:{},commitmentAccess:{},workAccess:{},reload(){},mutate:fn=>fn(),setView:view=>setSelection(s=>({...s,view})),setPeriodKind:kind=>setSelection(s=>({...s,period:periodBounds(kind,'2026-10-22')})),navigatePeriod:direction=>setSelection(s=>({...s,period:movePeriod(s.period,direction,'2026-10-22')})),returnToCurrent:()=>setSelection(s=>({...s,period:periodBounds(s.period.kind,'2026-10-22')})),loadMoreTransactions(){}};}`);
writeFileSync(entry, `import React from'react';import{createRoot}from'react-dom/client';import{Platform,Keyboard,AccessibilityInfo,Dimensions}from'react-native';import{FinanceScreen}from'../../src/features/finance/finance-screen';
Platform.OS='ios';Keyboard.metrics=()=>undefined;Keyboard.addListener=()=>({remove(){}});AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});
const large=new URLSearchParams(location.search).has('large'),get=Dimensions.get.bind(Dimensions);Dimensions.get=key=>({...get(key),fontScale:large?2:1});
if(large){const sized=new WeakSet();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(sized.has(e))return;sized.add(e);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
createRoot(document.getElementById('root')).render(<FinanceScreen/>);`);

async function main() {
  const fixture: Record<string, Record<string, unknown>> = {};
  for (const scenario of ['normal', 'income', 'empty', 'multi', 'one', 'many', 'five', 'stress']) {
    const f = await journalDatabase();
    try {
      f.setTime('2026-10-22');
      if (scenario !== 'empty') {
        f.finance.createTransaction({ ...transactionDraft(), type: 'income', description: 'Actual payment', transactionDate: '2026-10-20', amount: '4250' });
        f.finance.createTransaction({ ...transactionDraft(), type: 'income', description: 'Actual payment', transactionDate: '2026-10-01', amount: '800' });
      }
      if (['normal', 'multi', 'one', 'many', 'five', 'stress'].includes(scenario)) {
        const names = ['Housing', 'Food', 'Transport', 'Health', 'Subscriptions', 'Learning', 'Gifts', 'Other household expenses'];
        for (let index = 0; index < (scenario === 'multi' ? 3 : scenario === 'one' ? 1 : scenario === 'five' ? 5 : scenario === 'many' ? 24 : 8); index++) {
          const name = scenario === 'stress' ? index % 2 ? `Long household expense category with archived historical details ${index}` : `${'VeryLongUnbrokenCategoryName'.repeat(4)} ${index}` : names[index] ?? `Additional category ${index}`;
          const category = f.finance.read().categories.find(item => item.name === name && item.type === 'expense') ?? f.finance.createCategory(name, 'expense');
          f.finance.createTransaction({ ...transactionDraft(), description: name, categoryId: scenario === 'stress' && index === 7 ? null : category.id,
            transactionDate: index < 3 ? '2026-10-20' : `2026-10-${String((index * 3) % 21 + 1).padStart(2, '0')}`,
            amount: scenario === 'stress' ? index < 2 ? '90.071.992.547.409,91' : '123.456.789,01' : `${Math.max(1, 1200 - index * 143)},25` });
          if (scenario === 'stress' && index === 1) f.finance.deleteCategory(category.id);
        }
        f.finance.createTransaction({ ...transactionDraft(), description: 'Earlier expense', transactionDate: '2026-02-28', amount: '456,78' });
        f.finance.createTransaction({ ...transactionDraft(), type: 'income', description: 'Earlier income', transactionDate: '2026-06-05', amount: '1200' });
      }
      fixture[scenario] = {};
      for (const kind of ['week', 'month', 'year'] as const) {
        const current = periodBounds(kind, '2026-10-22');
        for (const period of [current, movePeriod(current, -1, '2026-10-22')]) fixture[scenario][`${kind}:${period.startDate}`] = f.finance.readDashboard(period).analytics;
      }
    } finally { f.sqlite.close(); }
  }
  writeFileSync(resolve(output, 'fixture.json'), JSON.stringify(fixture, (_, value) => typeof value === 'bigint' ? String(value) : value));
  await build({ entryPoints: [entry], outfile: resolve(output, 'app.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' }, loader: { '.ttf': 'file' },
    plugins: [{ name: 'finance-review-hook', setup(builder) { builder.onResolve({ filter: /^\.\/use-finance$/ }, () => ({ path: hook })); } }],
    alias: { 'react-native': 'react-native-web', 'expo-image': native, 'expo-font': native, 'expo-crypto': native, 'expo-router': native,
      '@react-native-community/datetimepicker': native, 'expo-router/react-navigation': native,
      'react-native-safe-area-context': native, 'react-native-screens/experimental': native, 'react-native-reanimated': resolve('tests/helpers/native-motion.cjs') } });
  const fonts = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']].map(([folder, name]) => `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')}) format('truetype');font-weight:400}`).join('');
  writeFileSync(resolve(output, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${fonts}html,body,#root{height:100%;margin:0}#root{display:flex;flex-direction:column}</style></head><body><div id="root"></div><script src="app.js"></script></body></html>`);
  console.log(`Finance Charts Stage 1 review: ${output}/index.html`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

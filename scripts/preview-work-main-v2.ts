/** Source-rendered Work dashboard with real SQLite fixture snapshots and explicit browser native boundaries. */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { journalDatabase } from '../tests/helpers/journal';
import { workDraft } from '../src/features/finance/work/form';
import { groupWorkItems, jobTitle } from '../src/features/finance/work/presentation';
import type { WorkDraft } from '../src/features/finance/work/types';
import { formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { DesignColors } from '../src/constants/design-system-v2';

const output = resolve('dist/work-v2-preview'); mkdirSync(output, { recursive: true });
const native = resolve(output, 'native.jsx'), entry = resolve(output, 'entry.jsx');
writeFileSync(native, `import React,{createContext,useEffect}from'react';import{View,StyleSheet}from'react-native';export const router={push:target=>{window.reviewRoute=target}};export const useFocusEffect=callback=>useEffect(callback,[callback]);
export const useFonts=()=>[true,null];export const SafeAreaProvider=({children})=>children;export const useSafeAreaInsets=()=>({top:0,bottom:0,left:0,right:0});export const SafeAreaView=View;export const SafeAreaInsetsContext=createContext({top:0,bottom:0,left:0,right:0});export const DateTimePickerAndroid={open(){}};
export function Image({source,style,testID}){return <img alt="" aria-hidden="true" data-testid={testID} src={source?.uri} style={StyleSheet.flatten(style)}/>;}export default function Picker(){return null;}`);
writeFileSync(entry, `import React from'react';import{createRoot}from'react-dom/client';import{View,ScrollView,Platform,Keyboard,AccessibilityInfo,Dimensions}from'react-native';import{DesignProvider,UiText}from'../../src/components/design-system';import{FormButton}from'../../src/components/form-controls';import{ContextMenuHost}from'../../src/components/context-menu';import{WorkView}from'../../src/features/finance/work/components/work-view';import sources from'./fixture.json';
const params=new URLSearchParams(location.search),scenario=params.get('scenario')||'mixed',large=params.has('large');Platform.OS='ios';Keyboard.metrics=()=>undefined;Keyboard.addListener=()=>({remove(){}});AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});AccessibilityInfo.sendAccessibilityEvent=()=>{};
const get=Dimensions.get.bind(Dimensions);Dimensions.get=key=>({...get(key),fontScale:large?2:1});if(large){const sized=new WeakSet();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(sized.has(e))return;sized.add(e);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
function revive(value,key){if(typeof value==='string'&&key?.endsWith('Minor'))return BigInt(value);if(Array.isArray(value))return value.map(v=>revive(v));if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,revive(v,k)]));return value}const source=revive(sources[scenario]||sources.mixed),data=source.data;window.reviewData={totals:Object.fromEntries(Object.entries(data.totals).map(([k,v])=>[k,String(v)])),count:data.items.length,lastTitle:source.lastTitle};
const access={readDetail(id){window.reviewSelectedId=id;return source.details[id]},readOverview(){return data},readHistory(){return source.history}};
function App(){return <DesignProvider><ContextMenuHost safeAreaApplied><View style={{width:'100%',maxWidth:640,alignSelf:'center',padding:16,paddingBottom:8,gap:8}}><UiText type="screenTitle">Finance</UiText><ScrollView horizontal contentContainerStyle={{gap:4}} accessibilityLabel="Finance destinations">{['Overview','Transactions','Commitments','Work'].map(label=><FormButton key={label} appearance="v2" variant="navigation" compactNavigation label={label} selected={label==='Work'} onPress={()=>{window.reviewDestination=label}}/>)}</ScrollView></View><WorkView data={data} categories={source.categories} access={access} mutate={action=>action()} onCreateCategory={()=>{throw Error('Outside read-only preview scope')}}/></ContextMenuHost></DesignProvider>;}createRoot(document.getElementById('root')).render(<App/>);`);

async function main() {
  const sources: Record<string, unknown> = {};
  for (const scenario of ['mixed', 'empty', 'zero', 'earned', 'partial', 'settled', 'no-attention', 'stress', 'long-client', 'collection']) {
    const f = await journalDatabase(); f.setTime('2026-10-27');
    try {
      const client = f.work.createCounterparty(scenario === 'long-client' || scenario === 'stress' ? 'Independent regional design and equipment service client with the complete historical client identity retained' : 'Independent studio');
      const create = (title: string, changes: Partial<WorkDraft> = {}) => f.work.create({ ...workDraft(null, '2026-10-26'), counterpartyId: client.id, title, compensationType: 'fixed', fixedAmount: '600', ...changes });
      const pay = (id: string, amount: string) => f.work.recordPayment({ counterpartyId: client.id, paymentDate: '2026-10-27', categoryId: null, allocations: [{ workEntryId: id, amount }] });
      if (scenario === 'mixed') {
        const partial = create('Project handover', { description: 'Final delivery and documentation', workDate: '2026-10-24', expectedPaymentDate: '2026-10-26' }); pay(partial, '150');
        create('Quarterly stocktake', { description: 'On-site inventory', fixedAmount: '180', workDate: '2026-10-25', expectedPaymentDate: '2026-10-23' });
        create('Current assignment', { description: 'Ongoing consultation', compensationType: 'hourly', hours: '2', minutes: '30', hourlyRate: '125', expectedPaymentDate: '2026-10-31' });
        const settled = create('Completed handover', { fixedAmount: '1000', workDate: '2026-10-02' }); pay(settled, '1000');
      } else if (scenario === 'earned') create('Work awaiting its first receipt', { expectedPaymentDate: '2026-11-05' });
      else if (scenario === 'partial') { const id = create('Partially received assignment', { expectedPaymentDate: '2026-10-23' }); pay(id, '125,50'); }
      else if (scenario === 'settled') { const id = create('Fully received work', { expectedPaymentDate: '2026-10-10' }); pay(id, '600'); }
      else if (scenario === 'zero') create('Rounded-zero hourly work', { compensationType: 'hourly', hours: '0', minutes: '1', hourlyRate: '0,01' });
      else if (scenario === 'no-attention') { create('Expected today', { expectedPaymentDate: '2026-10-27' }); create('Undated receivable'); }
      else if (scenario === 'long-client') create('Extensive service assignment with the full saved project title available without a one-line limit', { description: 'Additional saved context, distinct from title and client', expectedPaymentDate: '2026-10-20' });
      else if (scenario === 'stress') {
        create('Extremelylongunbrokenworkidentity'.repeat(5), { fixedAmount: formatBrlInput(maxAmountMinor), workDate: '2026-09-12', expectedPaymentDate: '1999-01-12', description: 'Complete supporting context remains available in the existing Job details.' });
        create('Second maximum receivable', { fixedAmount: formatBrlInput(maxAmountMinor) });
        const settled = create('Received maximum work', { fixedAmount: formatBrlInput(maxAmountMinor) }); pay(settled, formatBrlInput(maxAmountMinor));
      } else if (scenario === 'collection') for (let i = 0; i < 140; i++) create(`Service ${String(i).padStart(3, '0')}`, { expectedPaymentDate: i < 60 ? '2026-10-20' : '' });
      const data = f.work.readOverview();
      const groups = groupWorkItems(data.items), last = [...groups.overdue, ...groups.outstanding].at(-1);
      sources[scenario] = { data, lastTitle: last ? jobTitle(last.entry) : null, categories: f.finance.readCategories(), details: Object.fromEntries(data.items.map(item => [item.entry.id, f.work.readDetail(item.entry.id)])), history: f.work.readHistory() };
    } finally { f.sqlite.close(); }
  }
  writeFileSync(resolve(output, 'fixture.json'), JSON.stringify(sources, (_key, value) => typeof value === 'bigint' ? value.toString() : value));
  await build({ entryPoints: [entry], outfile: resolve(output, 'app.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' }, loader: { '.ttf': 'file' },
    alias: { 'react-native': 'react-native-web', 'expo-router': native, 'expo-image': native, 'expo-font': native, '@react-native-community/datetimepicker': native, 'react-native-safe-area-context': native, 'react-native-reanimated': resolve('tests/helpers/native-motion.cjs') } });
  const fonts = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']].map(([folder, name]) => `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')}) format('truetype');font-weight:400}`).join('');
  writeFileSync(resolve(output, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fonts}html,body,#root{height:100%;margin:0;background:${DesignColors.light.canvas}}@media(prefers-color-scheme:dark){html,body,#root{background:${DesignColors.dark.canvas}}}#root{display:flex;flex-direction:column;padding-bottom:70px;box-sizing:border-box}</style></head><body><div id="root"></div><script src="app.js"></script></body></html>`);
  console.log(output);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

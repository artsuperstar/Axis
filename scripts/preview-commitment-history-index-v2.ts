/** Real index UI and selected Individual History; synthetic SQLite-backed examples, browser native boundaries. */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { journalDatabase } from '../tests/helpers/journal';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import { formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { DesignColors } from '../src/constants/design-system-v2';

const output = resolve('dist/commitment-history-index-v2-preview'); mkdirSync(output, { recursive: true });
const native = resolve(output, 'native.jsx'), entry = resolve(output, 'entry.jsx');
writeFileSync(native, `import React,{createContext,useEffect}from'react';import{View,StyleSheet}from'react-native';export const useFocusEffect=callback=>useEffect(callback,[callback]);
export const useFonts=()=>[true,null];export const SafeAreaProvider=({children})=>children;export const useSafeAreaInsets=()=>({top:0,bottom:0,left:0,right:0});export const SafeAreaView=View;export const SafeAreaInsetsContext=createContext({top:0,bottom:0,left:0,right:0});export const DateTimePickerAndroid={open(){}};
export function Image({source,style,testID}){return <img alt="" aria-hidden="true" data-testid={testID} src={source?.uri} style={StyleSheet.flatten(style)}/>;}export default function Picker(){return null;}`);
writeFileSync(entry, `import React from'react';import{createRoot}from'react-dom/client';import{View,ScrollView,Platform,Keyboard,AccessibilityInfo,Dimensions}from'react-native';import{DesignProvider,UiText}from'../../src/components/design-system';import{FormButton}from'../../src/components/form-controls';import{ContextMenuHost}from'../../src/components/context-menu';import{CommitmentsView}from'../../src/features/finance/commitments/components/commitments-view';import data from'./fixture.json';
const params=new URLSearchParams(location.search),scenario=params.get('scenario')||'mixed',large=params.has('large');Platform.OS='ios';Keyboard.metrics=()=>undefined;Keyboard.addListener=()=>({remove(){}});AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});AccessibilityInfo.sendAccessibilityEvent=()=>{};
const get=Dimensions.get.bind(Dimensions);Dimensions.get=key=>({...get(key),fontScale:large?2:1});if(large){const sized=new WeakSet();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(sized.has(e))return;sized.add(e);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
const source=data[scenario]||data.mixed,items=source.items.map(item=>({...item,totalPaidMinor:BigInt(item.totalPaidMinor)}));const access={readHistory(id){window.reviewSelectedId=id;return{...source.histories[id],totalPaidMinor:BigInt(source.histories[id].totalPaidMinor)}}};
function App(){return <DesignProvider><ContextMenuHost safeAreaApplied><View style={{width:'100%',maxWidth:640,alignSelf:'center',padding:16,paddingBottom:8,gap:8}}><UiText type="screenTitle">Finance</UiText><ScrollView horizontal contentContainerStyle={{gap:4}}>{['Overview','Transactions','Commitments','Work'].map(label=><FormButton key={label} appearance="v2" variant="navigation" compactNavigation label={label} selected={label==='Commitments'} onPress={()=>{}}/>)}</ScrollView></View><CommitmentsView items={items} categories={source.categories} access={access} today="2026-10-26" mutate={action=>action()} onCreateCategory={()=>{throw Error('Outside preview scope')}}/></ContextMenuHost></DesignProvider>;}createRoot(document.getElementById('root')).render(<App/>);`);

async function main() {
  const f = await journalDatabase();
  try {
    f.setTime('2026-10-26');
    const sources: Record<string, unknown> = {};
    const ids: string[] = [];
    for (const [title, kind, state] of [
      ['Household equipment service agreement with its full saved purpose', 'bill', 'ended'],
      ['Learning subscription', 'subscription', 'active'],
      ['Internet', 'bill', 'active'],
      ['Entertainment subscription', 'subscription', 'paused'],
      ['Equipment purchase', 'installment', 'completed'],
    ] as const) {
      const id = f.commitments.create({ ...commitmentDraft(null, undefined, '2026-08-12'), title, kind, amount: '180,20', installmentCount: kind === 'installment' ? '3' : '' }); ids.push(id);
      const dues = f.commitments.readHistory(id).outstanding;
      if (state === 'completed') for (const due of dues) f.commitments.skip(due);
      else if (state === 'ended' || state === 'paused') f.commitments.skip(dues[0]);
      else { f.commitments.pay(dues[0], '175,35', '2026-10-26'); f.commitments.pay(dues[1], '190,15', '2026-10-26'); }
      if (state === 'ended') f.commitments.end(id);
      if (state === 'paused') f.commitments.pause(id);
    }
    const snapshot = () => ({ items: f.commitments.read().items.filter(item => ids.includes(item.commitment.id)), histories: Object.fromEntries(ids.map(id => [id, f.commitments.readHistory(id)])), categories: f.finance.readCategories() });
    sources.mixed = snapshot();
    const maxId = f.commitments.create({ ...commitmentDraft(null, undefined, '1980-08-12'), title: 'Extremelylongunbrokencommitmentname'.repeat(5), kind: 'bill', amount: formatBrlInput(maxAmountMinor) });
    const due = f.commitments.readHistory(maxId).outstanding;
    f.commitments.pay(due[0], formatBrlInput(maxAmountMinor), '2026-10-26'); f.commitments.pay(due[1], formatBrlInput(maxAmountMinor), '2026-10-26');
    for (const row of due.slice(2)) f.commitments.skip(row);
    const stress = f.commitments.read().items.find(item => item.commitment.id === maxId)!;
    sources.stress = { ...snapshot(), items: [stress, ...(sources.mixed as ReturnType<typeof snapshot>).items] };
    sources.empty = { ...snapshot(), items: [] };
    for (const item of (sources.mixed as ReturnType<typeof snapshot>).items) for (const row of f.commitments.readHistory(item.commitment.id).history) if (row.occurrence.status === 'paid') f.commitments.reopen(row.occurrence.id);
    sources.reversed = snapshot();
    const largeIds: string[] = [];
    for (let i = 0; i < 125; i++) { const id = f.commitments.create({ ...commitmentDraft(null, undefined, '2026-10-12'), title: 'Archived service ' + String(i).padStart(3, '0'), kind: 'bill', amount: '100' }); largeIds.push(id); f.commitments.skip(f.commitments.readHistory(id).outstanding[0]); }
    sources.collection = { ...snapshot(), items: f.commitments.read().items.filter(item => largeIds.includes(item.commitment.id)) };
    writeFileSync(resolve(output, 'fixture.json'), JSON.stringify(sources, (_key, value) => typeof value === 'bigint' ? value.toString() : value));
  } finally { f.sqlite.close(); }
  await build({ entryPoints: [entry], outfile: resolve(output, 'app.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' }, loader: { '.ttf': 'file' },
    alias: { 'react-native': 'react-native-web', 'expo-router': native, 'expo-image': native, 'expo-font': native, '@react-native-community/datetimepicker': native, 'react-native-safe-area-context': native, 'react-native-reanimated': resolve('tests/helpers/native-motion.cjs') } });
  const fonts = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']].map(([folder, name]) => `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')}) format('truetype');font-weight:400}`).join('');
  writeFileSync(resolve(output, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fonts}html,body,#root{height:100%;margin:0;background:${DesignColors.light.canvas}}@media(prefers-color-scheme:dark){html,body,#root{background:${DesignColors.dark.canvas}}}#root{display:flex;flex-direction:column;padding-bottom:70px;box-sizing:border-box}</style></head><body><div id="root"></div><script src="app.js"></script></body></html>`);
  console.log(output);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

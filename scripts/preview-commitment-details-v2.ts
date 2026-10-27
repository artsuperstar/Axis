/** Real Details and compact cards, backed by migrated SQLite projections; browser native boundaries are explicit. */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { journalDatabase } from '../tests/helpers/journal';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import { formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { DesignColors } from '../src/constants/design-system-v2';

const output = resolve('dist/commitment-details-v2-preview'); mkdirSync(output, { recursive: true });
const native = resolve(output, 'native.jsx'), entry = resolve(output, 'entry.jsx');
writeFileSync(native, `import React,{createContext,useEffect}from'react';import{View,StyleSheet}from'react-native';
export const useFocusEffect=callback=>useEffect(callback,[callback]);
export const useFonts=()=>[true,null];export const SafeAreaProvider=({children})=>children;export const useSafeAreaInsets=()=>({top:0,bottom:0,left:0,right:0});export const SafeAreaView=View;export const SafeAreaInsetsContext=createContext({top:0,bottom:0,left:0,right:0});export const DateTimePickerAndroid={open(){}};
export function Image({source,style,testID}){return <img alt="" aria-hidden="true" data-testid={testID} src={source?.uri} style={StyleSheet.flatten(style)}/>;}export default function Picker(){return null;}`);
writeFileSync(entry, `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{Platform,Keyboard,AccessibilityInfo,Dimensions}from'react-native';import{AdaptiveModal}from'../../src/components/adaptive-sheet';import{CommitmentDetails}from'../../src/features/finance/commitments/components/commitment-details';import data from'./fixture.json';
const params=new URLSearchParams(location.search),scenario=params.get('scenario')||'multi',large=params.has('large');Platform.OS='ios';Keyboard.metrics=()=>undefined;Keyboard.addListener=()=>({remove(){}});AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});AccessibilityInfo.sendAccessibilityEvent=()=>{};
const get=Dimensions.get.bind(Dimensions);Dimensions.get=key=>({...get(key),fontScale:large?2:1});if(large){const sized=new WeakSet();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(sized.has(e))return;sized.add(e);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
function App(){const[closed,setClosed]=useState(false),source=data[scenario]||data.multi,history={...source.data,totalPaidMinor:BigInt(source.data.totalPaidMinor)};const dismiss=()=>{window.reviewDismissed=true;setClosed(true)};const actions=[{label:'Edit',onPress:()=>{window.reviewAction='Edit'}},...(history.commitment.status==='active'?[{label:'Pause',onPress:()=>{window.reviewAction='Pause'}}]:[]),...(history.canResume?[{label:'Resume',onPress:()=>{window.reviewAction='Resume'}}]:[]),...(history.commitment.kind!=='installment'&&['active','paused'].includes(history.commitment.status)?[{label:'End',variant:'destructive',onPress:()=>{window.reviewAction='End'}}]:[]),{label:'History',onPress:()=>{window.reviewAction='History'}}];return closed?null:<AdaptiveModal onDismiss={dismiss}><CommitmentDetails {...source} data={history} actions={actions} error={null} focused={false} onDismiss={dismiss} onHistory={()=>{window.reviewAction='History'}} onPay={row=>{window.reviewAction='Pay';window.reviewDue=row.dueDate}} onSkip={row=>{window.reviewAction='Skip';window.reviewDue=row.dueDate}} onViewSeries={()=>{window.reviewAction='View series'}}/></AdaptiveModal>;}createRoot(document.getElementById('root')).render(<App/>);`);

async function main() {
  const f = await journalDatabase();
  try {
    const fixtures: Record<string, unknown> = {};
    const utilities = f.finance.readCategories().find(c => c.name === 'Utilities' && c.type === 'expense')!;
    const long = f.finance.createCategory('Historical household utilities and education category with a complete long saved name', 'expense');
    for (const name of ['bill', 'subscription', 'installment', 'multi', 'paused', 'ended', 'completed', 'stress', 'many-unpaid', 'overdue', 'empty', 'long-title', 'long-category', 'archived', 'uncategorized', 'max', 'long-scroll']) {
      f.setTime(name === 'long-scroll' ? '2026-01-01' : '2026-10-24');
      const kind = name === 'subscription' ? 'subscription' : ['installment', 'completed'].includes(name) ? 'installment' : 'bill';
      const categoryId = name === 'uncategorized' ? null : ['stress', 'long-category', 'archived'].includes(name) ? long.id : utilities.id;
      const firstDueDate = name === 'long-scroll' ? '2026-01-01' : name === 'many-unpaid' ? '2025-10-15' : ['bill', 'subscription', 'installment', 'empty', 'stress', 'long-title', 'long-category', 'uncategorized', 'max', 'archived'].includes(name) ? '2026-11-15' : '2026-10-15';
      const id = f.commitments.create({ ...commitmentDraft(null, undefined, firstDueDate), kind, title: ['stress', 'long-title'].includes(name) ? 'A complete long household commitment name describing the retained purpose without truncating its saved identity' : kind === 'subscription' ? 'Monthly subscription' : kind === 'installment' ? 'Retained installments' : 'Internet', amount: ['stress', 'max'].includes(name) ? formatBrlInput(maxAmountMinor) : '150', categoryId, installmentCount: kind === 'installment' ? name === 'completed' ? '1' : '10' : '' });
      if (name === 'multi') { f.commitments.pay(f.commitments.readHistory(id).outstanding[0], '150', '2026-10-24'); f.commitments.pause(id); f.commitments.resume(id, '2026-11-15'); }
      if (['paused', 'ended'].includes(name)) f.commitments[name === 'paused' ? 'pause' : 'end'](id);
      if (name === 'completed') f.commitments.pay(f.commitments.readHistory(id).outstanding[0], '125,37', '2026-10-24');
      if (['stress', 'max'].includes(name)) f.commitments.pay(f.commitments.read().items.find(row => row.commitment.id === id)!.upcoming!, formatBrlInput(maxAmountMinor), '2026-10-24');
      if (name === 'empty') f.commitments.end(id);
      if (name === 'long-scroll') {
        for (let day = 2; day <= 20; day++) { f.setTime(`2026-01-${String(day).padStart(2, '0')}`); const item = f.commitments.read().items.find(row => row.commitment.id === id)!; f.commitments.edit(id, { ...commitmentDraft(item.commitment, item.schedule), amount: day % 2 ? '150' : '175' }); }
      }
      f.setTime('2026-10-24'); const detail = f.commitments.readHistory(id);
      fixtures[name] = { data: detail, pending: [...detail.outstanding, ...(detail.upcoming && detail.upcoming.dueDate > '2026-10-24' ? [detail.upcoming] : [])], categories: f.finance.readCategories(), today: '2026-10-24' };
    }
    f.finance.deleteCategory(long.id);
    for (const source of Object.values(fixtures) as { categories: unknown }[]) source.categories = f.finance.readCategories();
    writeFileSync(resolve(output, 'fixture.json'), JSON.stringify(fixtures, (_key, value) => typeof value === 'bigint' ? value.toString() : value));
  } finally { f.sqlite.close(); }
  await build({ entryPoints: [entry], outfile: resolve(output, 'app.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' }, loader: { '.ttf': 'file' },
    alias: { 'react-native': 'react-native-web', 'expo-router': native, 'expo-image': native, 'expo-font': native, '@react-native-community/datetimepicker': native, 'react-native-safe-area-context': native, 'react-native-reanimated': resolve('tests/helpers/native-motion.cjs') } });
  const fonts = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']].map(([folder, name]) => `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')}) format('truetype');font-weight:400}`).join('');
  writeFileSync(resolve(output, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fonts}html,body,#root{height:100%;margin:0;background:${DesignColors.light.canvas}}@media(prefers-color-scheme:dark){html,body,#root{background:${DesignColors.dark.canvas}}}#root{display:flex;flex-direction:column}</style></head><body><div id="root"></div><script src="app.js"></script></body></html>`);
  console.log(output);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

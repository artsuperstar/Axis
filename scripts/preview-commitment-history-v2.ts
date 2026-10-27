/** Real individual History; source-derived saved pages, explicit native/runtime browser boundaries. */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { journalDatabase } from '../tests/helpers/journal';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import { appendCommitmentHistory } from '../src/features/finance/commitments/data';
import { formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { DesignColors } from '../src/constants/design-system-v2';

const output = resolve('dist/commitment-history-v2-preview'); mkdirSync(output, { recursive: true });
const native = resolve(output, 'native.jsx'), entry = resolve(output, 'entry.jsx');
writeFileSync(native, `import React,{createContext,useEffect}from'react';import{View,StyleSheet}from'react-native';export const useFocusEffect=callback=>useEffect(callback,[callback]);
export const useFonts=()=>[true,null];export const SafeAreaProvider=({children})=>children;export const useSafeAreaInsets=()=>({top:0,bottom:0,left:0,right:0});export const SafeAreaView=View;export const SafeAreaInsetsContext=createContext({top:0,bottom:0,left:0,right:0});
export function Image({source,style,testID}){return <img alt="" aria-hidden="true" data-testid={testID} src={source?.uri} style={StyleSheet.flatten(style)}/>;}`);
writeFileSync(entry, `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{Platform,Keyboard,AccessibilityInfo,Dimensions}from'react-native';import{AdaptiveModal}from'../../src/components/adaptive-sheet';import{CommitmentHistory}from'../../src/features/finance/commitments/components/commitment-history';import data from'./fixture.json';
const params=new URLSearchParams(location.search),scenario=params.get('scenario')||'mixed',large=params.has('large');Platform.OS='ios';Keyboard.metrics=()=>undefined;Keyboard.addListener=()=>({remove(){}});AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});AccessibilityInfo.sendAccessibilityEvent=()=>{};
const get=Dimensions.get.bind(Dimensions);Dimensions.get=key=>({...get(key),fontScale:large?2:1});if(large){const sized=new WeakSet();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(sized.has(e))return;sized.add(e);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
function App(){const[closed,setClosed]=useState(false),[page,setPage]=useState(0),source=data[scenario]||data.mixed,current=source.pages[page],history={...current,totalPaidMinor:BigInt(current.totalPaidMinor)};window.reviewCount=history.history.filter(v=>v.occurrence.status!=='pending').length;window.reviewCursor=history.nextBefore;const dismiss=()=>{window.reviewDismissed=true;setClosed(true)};const actions=[{label:'Edit',onPress:()=>{window.reviewAction='Edit'}},...(history.commitment.status==='active'?[{label:'Pause',onPress:()=>{window.reviewAction='Pause'}}]:[]),...(history.canResume?[{label:'Resume',onPress:()=>{window.reviewAction='Resume'}}]:[]),...(history.commitment.kind!=='installment'&&['active','paused'].includes(history.commitment.status)?[{label:'End',variant:'destructive',onPress:()=>{window.reviewAction='End'}}]:[]),{label:'History',onPress:()=>{window.reviewAction='History'}}];return closed?null:<AdaptiveModal onDismiss={dismiss}><CommitmentHistory data={history} categories={source.categories} actions={actions} error={null} onDismiss={dismiss} onViewCommitment={()=>{window.reviewAction='View commitment'}} onLoadEarlier={()=>{window.reviewAction='Load earlier';setPage(Math.min(page+1,source.pages.length-1))}} onReopen={entry=>{window.reviewAction=entry.occurrence.status==='paid'?'Undo payment':'Reopen';window.reviewOccurrence=entry.occurrence.id}}/></AdaptiveModal>;}createRoot(document.getElementById('root')).render(<App/>);`);

async function main() {
  const f = await journalDatabase();
  try {
    f.setTime('2026-10-26');
    const shopping = f.finance.readCategories().find(c => c.name === 'Shopping' && c.type === 'expense')!;
    const utilities = f.finance.readCategories().find(c => c.name === 'Utilities' && c.type === 'expense')!;
    const archived = f.finance.createCategory('Historical household equipment and education category with its complete saved name', 'expense');
    const fixtures: Record<string, unknown> = {};
    for (const name of ['mixed', 'bill', 'subscription', 'paid', 'skipped', 'completed', 'paused', 'ended', 'empty', 'changed', 'early', 'late', 'long-title', 'long-category', 'archived', 'uncategorized', 'max', 'stress', 'pages']) {
      const kind = name === 'subscription' ? 'subscription' : ['bill', 'paused', 'ended', 'early', 'late'].includes(name) ? 'bill' : 'installment';
      const categoryId = name === 'uncategorized' ? null : ['archived', 'stress', 'long-category'].includes(name) ? archived.id : shopping.id;
      const firstDueDate = name === 'pages' ? '2023-10-12' : ['early', 'late'].includes(name) ? '2026-10-12' : '2026-07-12';
      const id = f.commitments.create({ ...commitmentDraft(null, undefined, firstDueDate), kind,
        title: ['stress', 'long-title'].includes(name) ? 'Complete household equipment commitment name retained without losing the full original purchase purpose' : kind === 'subscription' ? 'Learning subscription' : kind === 'bill' ? 'Equipment service' : 'Equipment purchase',
        amount: ['stress', 'max'].includes(name) ? formatBrlInput(maxAmountMinor) : '180,20', categoryId, installmentCount: kind === 'installment' ? name === 'completed' ? '4' : name === 'pages' ? '60' : '8' : '' });
      const dues = f.commitments.readHistory(id).outstanding;
      if (name !== 'empty') for (let index = 0; index < dues.length; index++) {
        const due = dues[index];
        if (name === 'skipped' || (!['paid', 'early', 'late', 'max'].includes(name) && index % 3 === 1)) f.commitments.skip(due);
        else f.commitments.pay(due, ['stress', 'max'].includes(name) ? formatBrlInput(maxAmountMinor) : index % 2 ? '180,20' : '175,35', name === 'early' ? '2026-10-10' : name === 'late' ? '2026-10-26' : index === dues.length - 1 ? '2026-10-10' : due.dueDate < '2026-10-20' ? due.dueDate : '2026-10-26');
      }
      if (name === 'paused') f.commitments.pause(id);
      if (name === 'ended') f.commitments.end(id);
      if (name === 'changed') { const item = f.commitments.read().items.find(row => row.commitment.id === id)!; f.commitments.edit(id, { ...commitmentDraft(item.commitment, item.schedule), categoryId: utilities.id, amount: '220' }); }
      let history = f.commitments.readHistory(id); const pages = [history];
      while (history.nextBefore) { history = appendCommitmentHistory(history, f.commitments.readHistory(id, history.nextBefore)); pages.push(history); }
      fixtures[name] = { pages, categories: f.finance.readCategories() };
    }
    f.finance.deleteCategory(archived.id);
    for (const source of Object.values(fixtures) as { categories: unknown }[]) source.categories = f.finance.readCategories();
    writeFileSync(resolve(output, 'fixture.json'), JSON.stringify(fixtures, (_key, value) => typeof value === 'bigint' ? value.toString() : value));
  } finally { f.sqlite.close(); }
  await build({ entryPoints: [entry], outfile: resolve(output, 'app.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' }, loader: { '.ttf': 'file' },
    alias: { 'react-native': 'react-native-web', 'expo-router': native, 'expo-image': native, 'expo-font': native, 'react-native-safe-area-context': native, 'react-native-reanimated': resolve('tests/helpers/native-motion.cjs') } });
  const fonts = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']].map(([folder, name]) => `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')}) format('truetype');font-weight:400}`).join('');
  writeFileSync(resolve(output, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fonts}html,body,#root{height:100%;margin:0;background:${DesignColors.light.canvas}}@media(prefers-color-scheme:dark){html,body,#root{background:${DesignColors.dark.canvas}}}#root{display:flex;flex-direction:column}</style></head><body><div id="root"></div><script src="app.js"></script></body></html>`);
  console.log(output);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

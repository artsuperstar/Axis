/** Real confirmation/sheet and SQLite-projected obligations; explicit browser native boundaries. */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { journalDatabase } from '../tests/helpers/journal';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import { financeCategoryName } from '../src/features/finance/form';
import { formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { DesignColors } from '../src/constants/design-system-v2';

const output = resolve('dist/commitment-payment-v2-preview'); mkdirSync(output, { recursive: true });
const native = resolve(output, 'native.jsx'), entry = resolve(output, 'entry.jsx');
writeFileSync(native, `import React,{createContext}from'react';import{View,StyleSheet}from'react-native';
export const useFonts=()=>[true,null];export const SafeAreaProvider=({children})=>children;export const useSafeAreaInsets=()=>({top:0,bottom:0,left:0,right:0});export const SafeAreaView=View;export const SafeAreaInsetsContext=createContext({top:0,bottom:0,left:0,right:0});export const DateTimePickerAndroid={open(){}};
export function Image({source,style,testID}){return <img alt="" aria-hidden="true" data-testid={testID} src={source?.uri} style={StyleSheet.flatten(style)}/>;}
export default function Picker({value,maximumDate,onValueChange}){const civil=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');return <input aria-label="Review native date picker boundary" type="date" value={civil(value)} max={maximumDate&&civil(maximumDate)} onChange={e=>onValueChange({},new Date(e.target.value+'T12:00:00'))} style={{fontSize:18,padding:16,width:'100%',boxSizing:'border-box'}}/>;}`);
writeFileSync(entry, `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{Platform,Keyboard,AccessibilityInfo,Dimensions}from'react-native';import{CommitmentModal,CommitmentPayment}from'../../src/features/finance/commitments/components/commitment-forms';import data from'./fixture.json';
const params=new URLSearchParams(location.search),scenario=params.get('scenario')||'installment',large=params.has('large');Platform.OS=params.has('web')?'web':'ios';Keyboard.metrics=()=>params.has('keyboard')?{screenY:560,height:340,width:innerWidth,screenX:0}:undefined;Keyboard.addListener=()=>({remove(){}});AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});AccessibilityInfo.sendAccessibilityEvent=()=>{};
const get=Dimensions.get.bind(Dimensions);Dimensions.get=key=>({...get(key),fontScale:large?2:1});if(large){const sized=new WeakSet();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(sized.has(e))return;sized.add(e);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
function App(){const[closed,setClosed]=useState(false),source=data[scenario]||data.installment;return closed?null:<CommitmentModal onDismiss={()=>{window.reviewDismissed=true;setClosed(true)}}><CommitmentPayment {...source} onDismiss={()=>{window.reviewDismissed=true;setClosed(true)}} onSave={(amount,date)=>{window.reviewCalls=(window.reviewCalls||0)+1;window.reviewSaved={amount,date};if(params.has('failure'))throw Error('Review storage unavailable');if(params.has('pending'))return new Promise((resolve,reject)=>{window.reviewResolve=resolve;window.reviewReject=reject});}}/></CommitmentModal>;}createRoot(document.getElementById('root')).render(<App/>);`);

async function main() {
  const f = await journalDatabase();
  try {
    f.setTime('2026-10-24'); const categories = f.finance.readCategories();
    const entertainment = categories.find(c => c.name === 'Entertainment' && c.type === 'expense')!;
    const long = f.finance.createCategory('Historical household education and entertainment category with a long name', 'expense');
    const fixtures: Record<string, unknown> = {};
    for (const name of ['bill', 'subscription', 'installment', 'overdue', 'uncategorized', 'archived', 'stress', 'long-title', 'long-category', 'max-expected']) {
      const kind = name === 'bill' || name === 'uncategorized' ? 'bill' : name === 'subscription' ? 'subscription' : 'installment';
      const categoryId = name === 'uncategorized' ? null : ['archived', 'stress', 'long-category'].includes(name) ? long.id : entertainment.id;
      const id = f.commitments.create({ ...commitmentDraft(null, undefined, name === 'overdue' ? '2026-10-20' : '2026-11-08'), kind,
        title: ['stress', 'long-title'].includes(name) ? 'A long household commitment describing the complete purchase purpose without losing any of its saved title' : kind === 'bill' ? 'Household bill' : kind === 'subscription' ? 'Monthly subscription' : 'Rock in Rio Ticket',
        amount: ['stress', 'max-expected'].includes(name) ? formatBrlInput(maxAmountMinor) : '43,50', installmentCount: kind === 'installment' ? '10' : '', categoryId });
      const item = f.commitments.read().items.find(row => row.commitment.id === id)!;
      fixtures[name] = { occurrence: item.outstanding[0] ?? item.upcoming, title: item.commitment.title, kind, categoryName: financeCategoryName({ type: 'expense', categoryId }, f.finance.readCategories()) };
    }
    f.finance.deleteCategory(long.id);
    writeFileSync(resolve(output, 'fixture.json'), JSON.stringify(fixtures));
  } finally { f.sqlite.close(); }
  await build({ entryPoints: [entry], outfile: resolve(output, 'app.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' }, loader: { '.ttf': 'file' },
    alias: { 'react-native': 'react-native-web', 'expo-image': native, 'expo-font': native, '@react-native-community/datetimepicker': native, 'react-native-safe-area-context': native, 'react-native-reanimated': resolve('tests/helpers/native-motion.cjs') } });
  const fonts = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']].map(([folder, name]) => `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')}) format('truetype');font-weight:400}`).join('');
  writeFileSync(resolve(output, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fonts}html,body,#root{height:100%;margin:0;background:${DesignColors.light.canvas}}@media(prefers-color-scheme:dark){html,body,#root{background:${DesignColors.dark.canvas}}}#root{display:flex;flex-direction:column}</style></head><body><div id="root"></div><script src="app.js"></script></body></html>`);
  console.log(output);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

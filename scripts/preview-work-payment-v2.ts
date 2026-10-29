/** Actual payment editor/list/shared sheet; SQLite-generated synthetic records, native browser boundaries disclosed. */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { journalDatabase } from '../tests/helpers/journal';
import { workDraft } from '../src/features/finance/work/form';
import { formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { DesignColors } from '../src/constants/design-system-v2';

const output = resolve('dist/work-payment-v2-preview'); mkdirSync(output, { recursive: true });
const native = resolve(output, 'native.jsx'), entry = resolve(output, 'entry.jsx');
// Reuse the previous stage's explicitly substituted native image/font/safe-area/date boundary.
const incumbent = readFileSync('scripts/preview-work-editor-v2.ts', 'utf8');
const boundary = incumbent.match(/writeFileSync\(native, `([\s\S]*?)`\);/)![1];
writeFileSync(native, boundary);
writeFileSync(entry, `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{Platform,Keyboard,AccessibilityInfo,Dimensions}from'react-native';import{WorkPaymentEditor,WorkModal}from'../../src/features/finance/work/components/work-forms';import{allocationValues}from'../../src/features/finance/work/form';import{validateTransactionDraft}from'../../src/features/finance/form';import{formatBrlInput}from'../../src/features/finance/money';import fixture from'./fixture.json';
const params=new URLSearchParams(location.search),scenario=params.get('scenario')||'normal',large=params.has('large'),f=fixture[scenario];Platform.OS='ios';
Keyboard.metrics=()=>params.has('keyboard')?{screenY:550,height:294,width:innerWidth,screenX:0}:undefined;Keyboard.addListener=()=>({remove(){}});AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});AccessibilityInfo.sendAccessibilityEvent=()=>{};
const get=Dimensions.get.bind(Dimensions);Dimensions.get=key=>({...get(key),fontScale:large?2:1});if(large){const sized=new WeakSet();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(sized.has(e))return;sized.add(e);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
function App(){const[closed,setClosed]=useState(false),[categories,setCategories]=useState(f.categories);window.reviewFixture=f;
return closed?<div>Payment dismissed</div>:<WorkModal onDismiss={()=>setClosed(true)}><WorkPaymentEditor data={f.data} categories={categories} initialCounterpartyId={params.has('selected')?f.client:undefined} initialItem={params.has('targeted')?f.data.items[0]:undefined} onDismiss={()=>setClosed(true)}
onCreateCategory={name=>{const c={id:'review-created-income',name,type:'income',deletedAt:null,createdAt:0,updatedAt:0};setCategories(x=>[...x,c]);return c;}}
onSave={draft=>{const parsed=allocationValues(draft.allocations);for(const a of parsed.allocations){const item=f.data.items.find(x=>x.entry.id===a.workEntryId&&x.entry.counterpartyId===draft.counterpartyId);if(!item||a.amountMinor>item.outstandingMinor)throw Error('Allocation exceeds current outstanding balance.');}validateTransactionDraft({type:'income',description:'Synthetic client receipt',amount:formatBrlInput(parsed.amountMinor),transactionDate:draft.paymentDate,categoryId:draft.categoryId,note:''});if(params.has('saveError'))throw Error('Unable to record this payment. Review persistence failure; your amounts are retained.');window.reviewSaved=draft;}}/></WorkModal>;}createRoot(document.getElementById('root')).render(<App/>);`);

async function main() {
  const fixtures: Record<string, unknown> = {};
  for (const scenario of ['normal', 'one', 'many', 'stress']) {
    const f = await journalDatabase(); f.setTime('2026-10-28');
    try {
      const client = f.work.createCounterparty(scenario === 'stress' ? 'Independentregionalclientidentity'.repeat(4) : 'Independent studio');
      const other = f.work.createCounterparty('Other studio');
      const create = (title: string, amount: string, party = client.id) => f.work.create({ ...workDraft(null, '2026-10-26'), title, counterpartyId: party, compensationType: 'fixed', fixedAmount: amount });
      const first = create(scenario === 'stress' ? 'Completeunbrokenworkidentity'.repeat(5) : 'Stocktake', scenario === 'stress' ? formatBrlInput(maxAmountMinor) : '1000');
      if (scenario !== 'stress') f.work.recordPayment({ counterpartyId: client.id, paymentDate: '2026-10-27', categoryId: null, allocations: [{ workEntryId: first, amount: '100' }] });
      if (scenario !== 'one') create('Handover', '180');
      create('Other client work', '25', other.id);
      if (scenario === 'many') for (let i = 0; i < 140; i++) create(`Outstanding assignment ${String(i).padStart(3, '0')}`, '15');
      fixtures[scenario] = { data: f.work.read(), categories: f.finance.read().categories, client: client.id, other: other.id };
    } finally { f.sqlite.close(); }
  }
  writeFileSync(resolve(output, 'fixture.json'), JSON.stringify(fixtures, (_, value) => typeof value === 'bigint' ? value.toString() : value));
  await build({ entryPoints: [entry], outfile: resolve(output, 'app.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' }, loader: { '.ttf': 'file' },
    alias: { 'react-native': 'react-native-web', 'expo-image': native, 'expo-font': native, '@react-native-community/datetimepicker': native,
      'react-native-safe-area-context': native, 'react-native-reanimated': resolve('tests/helpers/native-motion.cjs') } });
  const fonts = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']].map(([folder, name]) => `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')}) format('truetype');font-weight:400}`).join('');
  writeFileSync(resolve(output, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fonts}html,body,#root{height:100%;margin:0;background:${DesignColors.light.canvas}}@media(prefers-color-scheme:dark){html,body,#root{background:${DesignColors.dark.canvas}}}</style></head><body><div id="root"></div><script src="app.js"></script></body></html>`);
  console.log(output);
}
main().catch(error => { console.error(error); process.exitCode = 1; });


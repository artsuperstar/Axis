/** Actual WorkView/Job Details and existing editors, backed by domain-generated synthetic snapshots. */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { journalDatabase } from '../tests/helpers/journal';
import { workDraft } from '../src/features/finance/work/form';
import { formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { DesignColors } from '../src/constants/design-system-v2';

const output = resolve('dist/job-details-v2-preview'); mkdirSync(output, { recursive: true });
const native = resolve(output, 'native.jsx'), entry = resolve(output, 'entry.jsx'), router = resolve(output, 'router.jsx');
const incumbent = readFileSync('scripts/preview-work-editor-v2.ts', 'utf8');
writeFileSync(native, incumbent.match(/writeFileSync\(native, `([\s\S]*?)`\);/)![1]);
writeFileSync(router, `import{useEffect}from'react';export const router={push:target=>{window.reviewNavigation=target}};export function useFocusEffect(callback){useEffect(callback,[callback]);}`);
writeFileSync(entry, `import React from'react';import{createRoot}from'react-dom/client';import{Platform,Keyboard,AccessibilityInfo,Dimensions}from'react-native';import{WorkView}from'../../src/features/finance/work/components/work-view';import{ContextMenuHost}from'../../src/components/context-menu';import{DesignProvider}from'../../src/components/design-system';import fixture from'./fixture.json';
const params=new URLSearchParams(location.search),scenario=params.get('scenario')||'unpaid',large=params.has('large');Platform.OS='ios';
const revive=x=>{if(Array.isArray(x))return x.map(revive);if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,typeof v==='string'&&k.endsWith('Minor')?BigInt(v):revive(v)]));return x;};const f=revive(fixture[scenario]);window.reviewFixture=f;
Keyboard.metrics=()=>undefined;Keyboard.addListener=()=>({remove(){}});AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});AccessibilityInfo.sendAccessibilityEvent=()=>{};
const get=Dimensions.get.bind(Dimensions);Dimensions.get=key=>({...get(key),fontScale:large?2:1});if(large){const sized=new WeakSet();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(sized.has(e))return;sized.add(e);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
const readOnly=()=>{throw Error('Browser review is read-only; SQLite tests exercise financial writes.');};const access={readDetail:()=>f.detail,readOverview:()=>f.overview,recordPayment:readOnly,edit:readOnly,delete:readOnly,undoPayment:readOnly};
createRoot(document.getElementById('root')).render(<DesignProvider><ContextMenuHost safeAreaApplied><WorkView data={f.overview} categories={f.categories} access={access} initialEntryId={f.id} mutate={action=>action()} onCreateCategory={readOnly}/></ContextMenuHost></DesignProvider>);`);

async function main() {
  const fixtures: Record<string, unknown> = {};
  for (const scenario of ['unpaid', 'hourly', 'partial', 'paid', 'future', 'noExpected', 'archived', 'longDescription', 'emptyDescription', 'stressOutstanding', 'stressReceived', 'shared', 'multiple', 'many']) {
    const f = await journalDatabase(); f.setTime('2026-10-28');
    try {
      const stress = scenario.startsWith('stress'), client = f.work.createCounterparty(stress ? 'Longunbrokenclientidentity'.repeat(5) : 'João Inglês');
      const id = f.work.create({ ...workDraft(null, '2026-10-24'), title: stress ? 'Longunbrokenjobidentity'.repeat(5) : 'App', counterpartyId: client.id,
        description: scenario === 'emptyDescription' ? '' : scenario === 'longDescription' ? ('Saved multiline work context and complete delivery details.\n').repeat(30) : 'App development and handover.',
        compensationType: scenario === 'hourly' ? 'hourly' : 'fixed', hours: '2', minutes: '30', hourlyRate: '50', fixedAmount: stress ? formatBrlInput(maxAmountMinor) : '300',
        expectedPaymentDate: scenario === 'noExpected' ? '' : scenario === 'future' ? '2026-10-30' : '2026-10-26' });
      const pay = (amount: string, paymentDate = '2026-10-28') => f.work.recordPayment({ counterpartyId: client.id, allocations: [{ workEntryId: id, amount }], categoryId: null, paymentDate });
      if (scenario === 'partial' || scenario === 'archived') pay('75'); if (scenario === 'paid') pay('300');
      if (scenario === 'stressReceived') pay(formatBrlInput(maxAmountMinor - 1));
      if (scenario === 'shared') {
        const other = f.work.create({ ...workDraft(null, '2026-10-25'), title: 'Inventory', counterpartyId: client.id, compensationType: 'fixed', fixedAmount: '180' });
        f.work.recordPayment({ counterpartyId: client.id, allocations: [{ workEntryId: id, amount: '100' }, { workEntryId: other, amount: '80' }], categoryId: null, paymentDate: '2026-10-27' });
      }
      if (scenario === 'multiple') { pay('50', '2026-10-25'); pay('75', '2026-10-27'); pay('25'); }
      if (scenario === 'many') for (let i = 0; i < 75; i++) pay('1');
      if (scenario === 'archived') f.work.archiveCounterparty(client.id);
      fixtures[scenario] = { id, overview: f.work.readOverview(), detail: f.work.readDetail(id), categories: f.finance.read().categories };
    } finally { f.sqlite.close(); }
  }
  writeFileSync(resolve(output, 'fixture.json'), JSON.stringify(fixtures, (_, value) => typeof value === 'bigint' ? value.toString() : value));
  await build({ entryPoints: [entry], outfile: resolve(output, 'app.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' }, loader: { '.ttf': 'file' },
    alias: { 'react-native': 'react-native-web', 'expo-router': router, 'expo-image': native, 'expo-font': native, '@react-native-community/datetimepicker': native,
      'react-native-safe-area-context': native, 'react-native-reanimated': resolve('tests/helpers/native-motion.cjs') } });
  const fonts = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']].map(([folder, name]) => `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')}) format('truetype');font-weight:400}`).join('');
  writeFileSync(resolve(output, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fonts}html,body,#root{height:100%;margin:0;background:${DesignColors.light.canvas}}@media(prefers-color-scheme:dark){html,body,#root{background:${DesignColors.dark.canvas}}}</style></head><body><div id="root"></div><script src="app.js"></script></body></html>`);
  console.log(output);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

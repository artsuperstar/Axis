/** Actual WorkView and shared modal/editor UI; domain-generated synthetic records only. */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { journalDatabase } from '../tests/helpers/journal';
import { workDraft } from '../src/features/finance/work/form';
import { formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { DesignColors } from '../src/constants/design-system-v2';

const output = resolve(process.env.AXIS_CLIENT_PREVIEW_OUTPUT ?? 'dist/client-details-v2-preview'); mkdirSync(output, { recursive: true });
const native = resolve(output, 'native.jsx'), entry = resolve(output, 'entry.jsx'), router = resolve(output, 'router.jsx');
const incumbent = readFileSync('scripts/preview-work-editor-v2.ts', 'utf8');
writeFileSync(native, incumbent.match(/writeFileSync\(native, `([\s\S]*?)`\);/)![1]);
writeFileSync(router, `import{useEffect}from'react';export const router={push:target=>{window.reviewNavigation=target},back:()=>{window.reviewNavigation='back'}};export function useFocusEffect(callback){useEffect(callback,[callback]);}`);
writeFileSync(entry, `import React from'react';import{createRoot}from'react-dom/client';import{Platform,Keyboard,AccessibilityInfo,Dimensions}from'react-native';import{WorkView}from'../../src/features/finance/work/components/work-view';import{ContextMenuHost}from'../../src/components/context-menu';import{DesignProvider}from'../../src/components/design-system';import fixture from'./fixture.json';
const params=new URLSearchParams(location.search),scenario=params.get('scenario')||'populated',large=params.has('large');Platform.OS='ios';
const revive=x=>{if(Array.isArray(x))return x.map(revive);if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,typeof v==='string'&&k.endsWith('Minor')?BigInt(v):revive(v)]));return x;};const f=revive(fixture[scenario]);window.reviewFixture=f;
Keyboard.metrics=()=>undefined;Keyboard.addListener=()=>({remove(){}});AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});AccessibilityInfo.sendAccessibilityEvent=()=>{};
const get=Dimensions.get.bind(Dimensions);Dimensions.get=key=>({...get(key),fontScale:large?2:1});if(large){const sized=new WeakSet();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(sized.has(e))return;sized.add(e);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
const readOnly=()=>{throw Error('Browser review is read-only; mounted SQLite tests exercise writes.');};const access={readDetail:id=>f.details[id],readOverview:opts=>opts?.counterpartyId?f.openOverview:f.paymentOverview,readHistory:()=>f.history,recordPayment:readOnly,edit:readOnly,delete:readOnly,undoPayment:readOnly};
createRoot(document.getElementById('root')).render(<DesignProvider><ContextMenuHost safeAreaApplied><WorkView data={f.overview} destination="clients" categories={f.categories} access={access} mutate={action=>action()} onCreateCategory={readOnly}/></ContextMenuHost></DesignProvider>);`);

async function main() {
  const fixtures: Record<string, unknown> = {};
  for (const scenario of ['populated', 'partial', 'settled', 'empty', 'archived', 'archivedEmpty', 'many', 'stress']) {
    const f = await journalDatabase(); f.setTime('2026-11-12');
    try {
      const client = f.work.createCounterparty(scenario === 'stress' ? 'Longunbrokenclientidentity'.repeat(5) : 'Ajakrn');
      const ids: string[] = [];
      const count = scenario === 'many' ? 85 : scenario === 'stress' ? 3 : scenario === 'partial' ? 3 : ['empty', 'archivedEmpty'].includes(scenario) ? 0 : 1;
      for (let i = 0; i < count; i++) ids.push(f.work.create({ ...workDraft(null, '2026-10-05'), counterpartyId: client.id,
        title: scenario === 'stress' ? 'Longunbrokenjobtitle'.repeat(6) : i ? `Additional work ${i + 1}` : 'Penso', description: i ? 'Delivery and handover' : 'Penso',
        compensationType: 'fixed', fixedAmount: scenario === 'stress' ? formatBrlInput(maxAmountMinor) : '1479,58', expectedPaymentDate: i % 2 ? '2026-11-01' : '' }));
      if (scenario === 'partial') f.work.recordPayment({ counterpartyId: client.id, allocations: [{ workEntryId: ids[0], amount: '100' }, { workEntryId: ids[1], amount: '80' }], categoryId: null, paymentDate: '2026-10-28' });
      if (scenario === 'settled') f.work.recordPayment({ counterpartyId: client.id, allocations: [{ workEntryId: ids[0], amount: '1479,58' }], categoryId: null, paymentDate: '2026-10-28' });
      if (scenario.startsWith('archived')) f.work.archiveCounterparty(client.id);
      fixtures[scenario] = { client: f.work.readOverview().counterparties[0], overview: f.work.readOverview({ includeJobs: false }), paymentOverview: f.work.readOverview(), openOverview: f.work.readOverview({ counterpartyId: client.id }),
        history: f.work.readHistory(100, undefined, client.id), details: Object.fromEntries(ids.map(id => [id, f.work.readDetail(id)])), categories: f.finance.read().categories };
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

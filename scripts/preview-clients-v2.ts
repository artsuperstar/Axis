/** Real Clients route/source UI. Creation/archive screenshots replay effects captured from isolated SQLite fixtures. */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { journalDatabase } from '../tests/helpers/journal';
import { workDraft } from '../src/features/finance/work/form';
import { formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { DesignColors } from '../src/constants/design-system-v2';

const output = resolve('dist/clients-v2-preview'); mkdirSync(output, { recursive: true });
const native = resolve(output, 'native.jsx'), entry = resolve(output, 'entry.jsx'), router = resolve(output, 'router.jsx'), hook = resolve(output, 'finance.jsx');
writeFileSync(native, readFileSync('scripts/preview-work-editor-v2.ts', 'utf8').match(/writeFileSync\(native, `([\s\S]*?)`\);/)![1]);
writeFileSync(router, `import{useEffect}from'react';export const router={canGoBack:()=>true,back:()=>{window.reviewBack=true},replace:path=>{window.reviewNavigation=path},push:path=>{window.reviewNavigation=path}};export const useFocusEffect=cb=>useEffect(cb,[cb]);`);
writeFileSync(hook, `import{useState}from'react';import{FinanceValidationError}from'../../src/features/finance/errors';export function useFinance(){const f=window.reviewFixture;const[overview,setOverview]=useState(f.overview);return{snapshot:{work:overview,categories:[]},error:null,reload(){},access:{},workAccess:{readOverview:options=>options?.counterpartyId?f.focused[options.counterpartyId]:overview,readHistory:()=>({items:[],payments:[],settledCount:0,paymentCount:0,next:null}),createCounterparty:name=>{const effect=f.creation.find(x=>x.input===name);if(!effect)throw Error('No recorded SQLite fixture effect for this input.');if(effect.error)throw new FinanceValidationError(effect.error);setOverview(effect.overview);return effect.result;},archiveCounterparty:id=>{setOverview(f.archived[id]);}},mutate:action=>action()};}`);
writeFileSync(entry, `import React from'react';import{createRoot}from'react-dom/client';import{Platform,Keyboard,Alert,AccessibilityInfo,Dimensions}from'react-native';import{WorkClientsScreen}from'../../src/features/finance/work/work-management-screen';import fixture from'./fixture.json';
const params=new URLSearchParams(location.search),large=params.has('large');Platform.OS='ios';
const revive=x=>Array.isArray(x)?x.map(revive):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,typeof v==='string'&&k.endsWith('Minor')?BigInt(v):revive(v)])):x;window.reviewFixture=revive(fixture[params.get('scenario')||'populated']);
Keyboard.metrics=()=>undefined;Keyboard.addListener=()=>({remove(){}});AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});AccessibilityInfo.sendAccessibilityEvent=()=>{};
Alert.alert=(title,message,buttons)=>{const panel=document.createElement('div');panel.setAttribute('role','alertdialog');panel.setAttribute('aria-label',title);panel.style.cssText='position:fixed;inset:30% 20px auto;padding:24px;background:#f5efe8;color:#241f1c;z-index:9999;border:1px solid #987c85;border-radius:16px;font:16px sans-serif';const h=document.createElement('h2');h.textContent=title;panel.append(h);const p=document.createElement('p');p.textContent=message;panel.append(p);for(const b of buttons){const button=document.createElement('button');button.textContent=b.text;button.style.cssText='padding:16px;margin:8px';button.onclick=()=>{panel.remove();b.onPress?.()};panel.append(button);}document.body.append(panel);};
const get=Dimensions.get.bind(Dimensions);Dimensions.get=key=>({...get(key),fontScale:large?2:1});if(large){const sized=new WeakSet();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(sized.has(e))return;sized.add(e);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
createRoot(document.getElementById('root')).render(<WorkClientsScreen/>);`);

async function main() {
  const fixtures: Record<string, unknown> = {};
  for (const scenario of ['populated', 'empty', 'activeOnly', 'archivedOnly', 'accents', 'archivedDebt', 'stress', 'many']) {
    const f = await journalDatabase(); f.setTime('2026-10-28');
    try {
      const job = (id: string, amount: string) => f.work.create({ ...workDraft(null, '2026-10-24'), title: 'Saved work', counterpartyId: id, compensationType: 'fixed', fixedAmount: amount });
      const add = (name: string, amount: string, archived = false) => { const p = f.work.createCounterparty(name); if (amount !== '0') job(p.id, amount); if (archived) f.work.archiveCounterparty(p.id); return p; };
      if (scenario === 'many') for (let i = 0; i < 180; i++) add(`Client ${String(i).padStart(3, '0')}`, i % 4 ? '300' : '0', i % 4 === 0);
      else if (scenario === 'stress') { const p = add('Longunbrokenclientidentity'.repeat(5), '0'); for (let i = 0; i < 3; i++) job(p.id, formatBrlInput(maxAmountMinor)); }
      else if (scenario === 'accents') { add('Álvaro', '300'); add('Alvaro', '0'); add('Álvaro Past', '120', true); }
      else if (scenario === 'archivedDebt') add('Historical client', '420', true);
      else if (scenario !== 'empty') { if (scenario !== 'archivedOnly') { add('Ajakrn', '1479,58'); add('Alvaro', '489'); add('Deixa h', '300'); add('JP Fotografias', '471'); } if (scenario !== 'activeOnly') add('Cliente Teste', '0', true); }
      const overview = f.work.readOverview({ includeJobs: false });
      const focused = Object.fromEntries(overview.counterparties.map(p => [p.id, f.work.readOverview({ counterpartyId: p.id })]));
      const creation = [];
      for (const input of ['', '  ALVARO  ', 'A\u0301lvaro', 'Alvaro', 'New client']) {
        try { const result = f.work.createCounterparty(input); creation.push({ input, result, overview: f.work.readOverview({ includeJobs: false }) }); f.sqlite.prepare('DELETE FROM work_counterparties WHERE id = ?').run(result.id); }
        catch (error) { creation.push({ input, error: (error as Error).message }); }
      }
      const archived: Record<string, unknown> = {};
      for (const p of overview.counterparties.filter(p => p.deletedAt === null)) { f.work.archiveCounterparty(p.id); archived[p.id] = f.work.readOverview({ includeJobs: false }); }
      fixtures[scenario] = { overview, focused, creation, archived };
    } finally { f.sqlite.close(); }
  }
  writeFileSync(resolve(output, 'fixture.json'), JSON.stringify(fixtures, (_, v) => typeof v === 'bigint' ? v.toString() : v));
  await build({ entryPoints: [entry], outfile: resolve(output, 'app.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' }, loader: { '.ttf': 'file' },
    alias: { 'react-native': 'react-native-web', 'expo-router': router, 'expo-image': native, 'expo-font': native, '@react-native-community/datetimepicker': native,
      'react-native-screens/experimental': native, 'react-native-safe-area-context': native, 'react-native-reanimated': resolve('tests/helpers/native-motion.cjs') },
    plugins: [{ name: 'fixture-finance-hook', setup(builder) { builder.onResolve({ filter: /use-finance$/ }, args => args.importer.includes('work-management-screen') ? { path: hook } : undefined); } }] });
  const fonts = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']].map(([folder, name]) => `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')}) format('truetype');font-weight:400}`).join('');
  writeFileSync(resolve(output, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fonts}html,body,#root{height:100%;margin:0;background:${DesignColors.light.canvas}}#root{display:flex;flex-direction:column}@media(prefers-color-scheme:dark){html,body,#root{background:${DesignColors.dark.canvas}}}</style></head><body><div id="root"></div><script src="app.js"></script></body></html>`);
  console.log(output);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

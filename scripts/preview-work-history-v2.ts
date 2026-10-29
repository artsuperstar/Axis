/** Actual Work History route and source UI, with domain-generated read-only SQLite snapshots. */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { journalDatabase } from '../tests/helpers/journal';
import { workDraft } from '../src/features/finance/work/form';
import { formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { DesignColors } from '../src/constants/design-system-v2';
import type { WorkHistoryCursor } from '../src/features/finance/work/types';

const output = resolve('dist/work-history-v2-preview'); mkdirSync(output, { recursive: true });
const native = resolve(output, 'native.jsx'), entry = resolve(output, 'entry.jsx'), router = resolve(output, 'router.jsx'), hook = resolve(output, 'finance.jsx');
writeFileSync(native, readFileSync('scripts/preview-work-editor-v2.ts', 'utf8').match(/writeFileSync\(native, `([\s\S]*?)`\);/)![1]);
writeFileSync(router, `import{useEffect}from'react';export const router={canGoBack:()=>true,back:()=>{window.reviewBack=true},replace:path=>{window.reviewNavigation=path},push:path=>{window.reviewNavigation=path}};export const useFocusEffect=cb=>useEffect(cb,[cb]);`);
writeFileSync(hook, `export function useFinance(){const f=window.reviewFixture;return{snapshot:window.reviewLoading?null:{work:f.overview,categories:f.categories},error:null,reload(){},access:{},workAccess:{readOverview:options=>options?.counterpartyId?f.focused[options.counterpartyId]:f.overview,readDetail:id=>f.details[id],readHistory:(limit=20,before,client)=>{if(window.reviewReadFailure)throw Error('Injected review read failure');const page=f.pages[JSON.stringify([limit,before??null,client??null])];if(!page)throw Error('Missing recorded SQLite history page');return page;},undoPayment:()=>{throw Error('Read-only browser evidence; SQLite integration tests cover persistence.');}},mutate:action=>action()};}`);
writeFileSync(entry, `import React from'react';import{createRoot}from'react-dom/client';import{Platform,Keyboard,Alert,AccessibilityInfo,Dimensions}from'react-native';import{WorkHistoryScreen,WorkClientsScreen}from'../../src/features/finance/work/work-management-screen';import fixture from'./fixture.json';
const params=new URLSearchParams(location.search),large=params.has('large');Platform.OS='ios';
const revive=x=>Array.isArray(x)?x.map(revive):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,typeof v==='string'&&k.endsWith('Minor')?BigInt(v):revive(v)])):x;window.reviewFixture=revive(fixture[params.get('scenario')||'populated']);window.reviewReadFailure=params.has('error');window.reviewLoading=params.has('loading');
Keyboard.metrics=()=>undefined;Keyboard.addListener=()=>({remove(){}});AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});AccessibilityInfo.sendAccessibilityEvent=()=>{};
Alert.alert=(title,message,buttons)=>{const panel=document.createElement('div');panel.setAttribute('role','alertdialog');panel.setAttribute('aria-label',title);panel.style.cssText='position:fixed;inset:30% 20px auto;padding:24px;background:#f5efe8;color:#241f1c;z-index:9999;border:1px solid #987c85;border-radius:16px;font:16px sans-serif';const h=document.createElement('h2');h.textContent=title;panel.append(h);const p=document.createElement('p');p.textContent=message;panel.append(p);for(const b of buttons){const button=document.createElement('button');button.textContent=b.text;button.style.cssText='padding:16px;margin:8px';button.onclick=()=>{panel.remove();b.onPress?.()};panel.append(button);}document.body.append(panel);};
const get=Dimensions.get.bind(Dimensions);Dimensions.get=key=>({...get(key),fontScale:large?2:1});if(large){const sized=new WeakSet();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(sized.has(e))return;sized.add(e);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
createRoot(document.getElementById('root')).render(params.has('filtered')?<WorkClientsScreen/>:<WorkHistoryScreen/>);`);

async function main() {
  const fixtures: Record<string, unknown> = {};
  for (const scenario of ['populated','empty','jobsOnly','receiptsOnly','hourly','archived','shared','multiple','stress','longCategory','many']) {
    const f = await journalDatabase(); f.setTime('2026-10-28');
    try {
      const client = f.work.createCounterparty(scenario==='stress'?'Longunbrokenclientidentity'.repeat(5):'John');
      const category = scenario==='longCategory' ? f.finance.createCategory('Long saved historical Income category '.repeat(7),'income') : scenario==='archived' ? f.finance.createCategory('Saved Freelance','income') : f.finance.read().categories.find(c=>c.type==='income'&&c.name==='Freelance')!;
      const create = (title: string, amount='300', expectedPaymentDate='') => f.work.create({...workDraft(null,'2026-10-03'),title,counterpartyId:client.id,compensationType:'fixed',fixedAmount:amount,expectedPaymentDate});
      const pay=(id:string,amount:string,paymentDate='2026-10-28',categoryId:string|null=null)=>f.work.recordPayment({counterpartyId:client.id,allocations:[{workEntryId:id,amount}],paymentDate,categoryId});
      if(scenario==='many')for(let i=0;i<75;i++){const id=create(`Saved job ${String(i).padStart(3,'0')}`,'1');pay(id,'1');}
      else if(scenario==='jobsOnly')f.work.create({...workDraft(null,'2026-10-07'),title:'Below centavo',counterpartyId:client.id,compensationType:'hourly',hours:'0',minutes:'1',hourlyRate:'0,01'});
      else if(scenario==='receiptsOnly'){const id=create('Partial work');pay(id,'75','2026-10-04');}
      else if(scenario==='hourly'){const id=f.work.create({...workDraft(null,'2026-10-03'),title:'Hourly translation',counterpartyId:client.id,compensationType:'hourly',hours:'2',minutes:'30',hourlyRate:'50'});pay(id,'125','2026-10-04');}
      else if(scenario==='shared'){const a=create('Job A','100'),b=create('Job B','200');f.work.recordPayment({counterpartyId:client.id,allocations:[{workEntryId:a,amount:'100'},{workEntryId:b,amount:'80'}],paymentDate:'2026-10-04',categoryId:null});}
      else if(scenario==='multiple'){const id=create('Several partial receipts');pay(id,'50','2026-10-01');pay(id,'100','2026-10-04');pay(id,'150','2026-10-28');}
      else if(scenario==='stress'){const id=create('Longunbrokenjobidentity'.repeat(5),formatBrlInput(maxAmountMinor),'2026-10-07');pay(id,formatBrlInput(maxAmountMinor),'2026-10-04',category.id);}
      else if(scenario!=='empty'){const a=create('Test1','15'),b=create('Bartending','150','2026-10-07'),c=create('Partially received project','2000');pay(a,'15','2026-10-28',category.id);pay(b,'150','2026-10-04');pay(c,'1500','2026-10-01');}
      if(scenario==='archived'){f.work.archiveCounterparty(client.id);f.finance.deleteCategory(category.id);}
      if(scenario==='longCategory')f.finance.deleteCategory(category.id);
      const overview=f.work.readOverview({includeJobs:false}), pages:Record<string,unknown>={},details:Record<string,unknown>={};
      for(const party of [undefined,...overview.counterparties.map(p=>p.id)]){
        for(const limit of [20,40,60,80])pages[JSON.stringify([limit,null,party??null])]=f.work.readHistory(limit,undefined,party);
        let before:WorkHistoryCursor|undefined;
        do{const page=f.work.readHistory(20,before,party);pages[JSON.stringify([20,before??null,party??null])]=page;before=page.next??undefined;}while(before);
      }
      for(const item of f.work.read().items)details[item.entry.id]=f.work.readDetail(item.entry.id);
      fixtures[scenario]={overview,pages,details,categories:f.finance.read().categories,focused:Object.fromEntries(overview.counterparties.map(p=>[p.id,f.work.readOverview({counterpartyId:p.id})]))};
    } finally {f.sqlite.close();}
  }
  writeFileSync(resolve(output,'fixture.json'),JSON.stringify(fixtures,(_,v)=>typeof v==='bigint'?v.toString():v));
  await build({entryPoints:[entry],outfile:resolve(output,'app.js'),bundle:true,platform:'browser',format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"',__DEV__:'false'},loader:{'.ttf':'file'},
    alias:{'react-native':'react-native-web','expo-router':router,'expo-image':native,'expo-font':native,'@react-native-community/datetimepicker':native,'react-native-screens/experimental':native,'react-native-safe-area-context':native,'react-native-reanimated':resolve('tests/helpers/native-motion.cjs')},
    plugins:[{name:'fixture-finance-hook',setup(b){b.onResolve({filter:/use-finance$/},args=>args.importer.includes('work-management-screen')?{path:hook}:undefined);}}]});
  const fonts=[['manrope','Manrope-Regular'],['manrope','Manrope-SemiBold'],['lora','Lora-SemiBold']].map(([folder,name])=>`@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')}) format('truetype');font-weight:400}`).join('');
  writeFileSync(resolve(output,'index.html'),`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fonts}html,body,#root{height:100%;margin:0;background:${DesignColors.light.canvas}}#root{display:flex;flex-direction:column}@media(prefers-color-scheme:dark){html,body,#root{background:${DesignColors.dark.canvas}}}</style></head><body><div id="root"></div><script src="app.js"></script></body></html>`);
  console.log(output);
}
main().catch(error=>{console.error(error);process.exitCode=1;});

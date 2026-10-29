/** Real WorkEditor/AdaptiveModal rendering; native picker/keyboard boundaries are browser substitutes. */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { journalDatabase } from '../tests/helpers/journal';
import { workDraft } from '../src/features/finance/work/form';
import { formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { DesignColors } from '../src/constants/design-system-v2';

const output = resolve('dist/work-editor-v2-preview'); mkdirSync(output, { recursive: true });
const native = resolve(output, 'native.jsx'), entry = resolve(output, 'entry.jsx');
writeFileSync(native, `import React,{createContext}from'react';import{View,StyleSheet}from'react-native';
export const useFonts=()=>[true,null];export const SafeAreaProvider=({children})=>children;export const useSafeAreaInsets=()=>({top:24,bottom:16,left:0,right:0});export const SafeAreaView=View;export const SafeAreaInsetsContext=createContext({top:24,bottom:16,left:0,right:0});export const DateTimePickerAndroid={open(){}};
export function Image({source,style,testID}){return <img alt="" aria-hidden="true" data-testid={testID} src={source?.uri} style={StyleSheet.flatten(style)}/>;}
export default function Picker({value,maximumDate,onValueChange}){const civil=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');return <input aria-label="Review native date boundary" type="date" value={civil(value)} max={maximumDate?civil(maximumDate):undefined} onChange={e=>onValueChange({},new Date(e.target.value+'T12:00:00'))} style={{boxSizing:'border-box',padding:12,width:'100%',fontSize:18}}/>;}`);
writeFileSync(entry, `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{Platform,Keyboard,AccessibilityInfo,Dimensions}from'react-native';import{WorkEditor,WorkModal}from'../../src/features/finance/work/components/work-forms';import{validateWorkDraft}from'../../src/features/finance/work/form';import{clientAutocomplete}from'../../src/features/finance/work/form-options';import fixture from'./fixture.json';
const params=new URLSearchParams(location.search),scenario=params.get('scenario')||'new',large=params.has('large');Platform.OS='ios';
Keyboard.metrics=()=>params.has('keyboard')?{screenY:550,height:294,width:innerWidth,screenX:0}:undefined;Keyboard.addListener=()=>({remove(){}});AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});AccessibilityInfo.sendAccessibilityEvent=()=>{};
const get=Dimensions.get.bind(Dimensions);Dimensions.get=key=>({...get(key),fontScale:large?2:1});if(large){const sized=new WeakSet();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(sized.has(e))return;sized.add(e);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
function App(){const[closed,setClosed]=useState(false),[clients,setClients]=useState(fixture[scenario]?.counterparties||fixture.editHourly.counterparties);const item=fixture[scenario]?.item||null;window.reviewItem=item;
return closed?<div>Editor dismissed</div>:<WorkModal onDismiss={()=>{window.reviewDismissed=true;setClosed(true)}}><WorkEditor item={item} counterparties={clients} onDismiss={()=>{window.reviewDismissed=true;setClosed(true)}}
onCreateCounterparty={name=>{const results=clientAutocomplete(clients,name);if(!results.createLabel)throw Error('An active client with this name already exists.');const client={id:'preview-created-client',name:name.trim(),deletedAt:null,createdAt:0,updatedAt:0};setClients(current=>[...current,client]);window.reviewCreated=client;return client;}}
onSave={draft=>{validateWorkDraft(draft);window.reviewSaved=draft;if(params.has('saveError'))throw Error('Review persistence failure.');}}/></WorkModal>;}createRoot(document.getElementById('root')).render(<App/>);`);

async function main() {
  const fixtures: Record<string, unknown> = {};
  for (const scenario of ['editHourly', 'editFixed', 'paid', 'stressFixed', 'stressHourly']) {
    const f = await journalDatabase(); f.setTime('2026-10-27');
    try {
      const stress = scenario.startsWith('stress');
      const client = f.work.createCounterparty(stress ? 'Independentregionalclientidentity'.repeat(4) : 'Independent studio');
      const hourly = scenario.endsWith('Hourly');
      const id = f.work.create({ ...workDraft(null, '2026-10-26'), title: stress ? 'Completeunbrokenjobidentity'.repeat(5) : 'Quarterly stocktake', counterpartyId: client.id,
        description: stress ? ('Full work description retains every line and has no 500 character limit.\n').repeat(15) : 'Warehouse inventory\nFinal reconciliation and handover',
        compensationType: hourly ? 'hourly' : 'fixed', hours: stress ? '1' : '2', minutes: stress ? '0' : '30', hourlyRate: stress ? formatBrlInput(maxAmountMinor) : '50',
        fixedAmount: stress ? formatBrlInput(maxAmountMinor) : '1000', expectedPaymentDate: '2026-11-05' });
      if (scenario === 'paid') { f.work.recordPayment({ counterpartyId: client.id, paymentDate: '2026-10-27', categoryId: null, allocations: [{ workEntryId: id, amount: '350' }] }); f.work.archiveCounterparty(client.id); }
      fixtures[scenario] = { item: f.work.readDetail(id).items[0], counterparties: f.work.read().counterparties };
    } finally { f.sqlite.close(); }
  }
  writeFileSync(resolve(output, 'fixture.json'), JSON.stringify(fixtures));
  await build({ entryPoints: [entry], outfile: resolve(output, 'app.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' }, loader: { '.ttf': 'file' },
    alias: { 'react-native': 'react-native-web', 'expo-image': native, 'expo-font': native, '@react-native-community/datetimepicker': native,
      'react-native-safe-area-context': native, 'react-native-reanimated': resolve('tests/helpers/native-motion.cjs') } });
  const fonts = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']].map(([folder, name]) => `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')}) format('truetype');font-weight:400}`).join('');
  writeFileSync(resolve(output, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fonts}html,body,#root{height:100%;margin:0;background:${DesignColors.light.canvas}}@media(prefers-color-scheme:dark){html,body,#root{background:${DesignColors.dark.canvas}}}textarea{resize:none}</style></head><body><div id="root"></div><script src="app.js"></script></body></html>`);
  console.log(output);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

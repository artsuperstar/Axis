/** Real main Finance/Commitments UI; source projections come from migrated SQLite fixtures. */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DesignColors } from '../src/constants/design-system-v2';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import type { CommitmentDraft } from '../src/features/finance/commitments/types';
import { formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { journalDatabase } from '../tests/helpers/journal';

const output=resolve(process.env.AXIS_COMMITMENTS_PREVIEW_DIR || 'dist/finance-commitments-v2-preview');mkdirSync(output,{recursive:true});
const native=resolve(output,'native.jsx'),hook=resolve(output,'hook.jsx'),entry=resolve(output,'entry.jsx');
writeFileSync(native,`import React,{createContext,useEffect}from'react';import{View,StyleSheet}from'react-native';
export const useFonts=()=>[true,null];export const SafeAreaView=View;export const SafeAreaInsetsContext=createContext({top:0,bottom:0,left:0,right:0});export const SafeAreaProvider=({children})=>children;export const useSafeAreaInsets=()=>({top:0,bottom:0,left:0,right:0});export const randomUUID=()=>crypto.randomUUID();export const useFocusEffect=callback=>useEffect(callback,[callback]);export const useNavigation=()=>({dispatch(){}});export const usePreventRemove=()=>{};export const useLocalSearchParams=()=>({});export const router={canGoBack:()=>true,back(){},replace(){},push(){}};export const DateTimePickerAndroid={open(){}};export default function Picker(){return null;}export function Image({source,style,testID}){return <img alt="" aria-hidden="true" data-testid={testID} src={source?.uri} style={StyleSheet.flatten(style)}/>;}`);
writeFileSync(hook,`import{useState}from'react';import raw from'./fixture.json';import{periodBounds}from'../../src/features/finance/periods';const fixture=JSON.parse(JSON.stringify(raw),(_,v)=>v&&typeof v==='object'&&'$bigint'in v?BigInt(v.$bigint):v);
export function useFinance(){const scenario=new URLSearchParams(location.search).get('scenario')||'upcoming',data=fixture[scenario];const[selection,set]=useState({view:'commitments',period:periodBounds('month','2026-10-24'),ledgerFilter:{type:'all',query:''}});
window.reviewCommitments={parents:data.items.length};return{selection,today:'2026-10-24',snapshot:{...data,work:null,analytics:null,transactions:[],ledger:{sources:{},next:null}},error:null,access:{},commitmentAccess:{readHistory:id=>data.histories[id]},workAccess:{},reload(){},mutate:f=>f(),setView:view=>set(s=>({...s,view})),setPeriodKind(){},navigatePeriod(){},returnToCurrent(){},loadMoreTransactions(){},setTransactionType(){},setTransactionQuery(){},searchingTransactions:false,transactionResultsCurrent:true};}`);
writeFileSync(entry,`import React from'react';import{createRoot}from'react-dom/client';import{Platform,Keyboard,AccessibilityInfo,Dimensions}from'react-native';import{FinanceScreen}from'../../src/features/finance/finance-screen';Platform.OS='web';Keyboard.metrics=()=>undefined;Keyboard.addListener=()=>({remove(){}});AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});AccessibilityInfo.sendAccessibilityEvent=()=>{};const large=new URLSearchParams(location.search).has('large'),get=Dimensions.get.bind(Dimensions);Dimensions.get=key=>({...get(key),fontScale:large?2:1});if(large){const sized=new WeakSet();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(sized.has(e))return;sized.add(e);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}createRoot(document.getElementById('root')).render(<FinanceScreen/>);`);

async function main(){
 const fixture:Record<string,unknown>={};
 for(const scenario of ['upcoming','same-types','mixed','overdue','empty','quiet','stress','long-text','long']){
  const f=await journalDatabase();try{
   f.setTime('2026-10-24');const categories=f.finance.readCategories();const category=(name:string)=>categories.find(c=>c.name===name&&c.type==='expense')!.id;
   const create=(title:string,changes:Partial<CommitmentDraft>={})=>f.commitments.create({...commitmentDraft(null,undefined,'2026-11-15'),title,amount:'150',...changes});
   if(['upcoming','same-types','mixed','stress'].includes(scenario)){
    const ticket=create('Rock in Rio Ticket',{kind:'installment',installmentCount:'10',amount:'43,50',firstDueDate:'2026-10-08',categoryId:category('Entertainment')});
    f.commitments.pay(f.commitments.readHistory(ticket).outstanding[0],'43,50','2026-10-08');
    create('Netflix',{kind:'subscription',amount:'40',firstDueDate:'2026-11-11',categoryId:category('Utilities')});create('Internet',{categoryId:category('Utilities')});
   }
   if(scenario==='same-types'){create('ChatGPT');create('Spotify',{kind:'subscription'});create('Computer',{kind:'installment',installmentCount:'6'});}
   if(scenario==='mixed'){create('Past obligation',{firstDueDate:'2026-10-20'});create('Due today',{firstDueDate:'2026-10-24'});}
   if(scenario==='overdue')create('Overdue installment',{kind:'installment',installmentCount:'1',firstDueDate:'2026-09-30'});
   if(scenario==='quiet'){
    f.commitments.pause(create('Paused series'));f.commitments.end(create('Ended series'));
    const complete=create('Completed installment',{kind:'installment',installmentCount:'1',firstDueDate:'2026-10-01'});f.commitments.pay(f.commitments.readHistory(complete).outstanding[0],'150','2026-10-02');
   }
   if(scenario==='stress'||scenario==='long-text'){
    const custom=f.finance.createCategory('A long historical archived category describing household education and entertainment expenses','expense');
    create('VeryLongUnbrokenCommitmentTitle'.repeat(3),{kind:'installment',installmentCount:'1200',amount:scenario==='stress'?formatBrlInput(maxAmountMinor):'150',categoryId:custom.id,firstDueDate:'2026-10-25'});f.finance.deleteCategory(custom.id);
   }
   if(scenario==='long')for(let i=0;i<100;i++)create(`Series ${i.toString().padStart(3,'0')}`,{kind:i%3===0?'bill':i%3===1?'subscription':'installment',installmentCount:i%3===2?'12':''});
   const data=f.commitments.read(),histories=Object.fromEntries(data.items.map(item=>[item.commitment.id,f.commitments.readHistory(item.commitment.id)]));
   fixture[scenario]={...data,categories:f.finance.readCategories(),histories};
  }finally{f.sqlite.close();}
 }
 writeFileSync(resolve(output,'fixture.json'),JSON.stringify(fixture,(_,value)=>typeof value==='bigint'?{$bigint:value.toString()}:value));
 await build({entryPoints:[entry],outfile:resolve(output,'app.js'),bundle:true,platform:'browser',format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"',__DEV__:'false'},loader:{'.ttf':'file'},plugins:[{name:'review-only-commitments',setup(builder){builder.onResolve({filter:/^\.\/use-finance$/},()=>({path:hook}));}}],alias:{'react-native':'react-native-web','expo-image':native,'expo-font':native,'expo-crypto':native,'expo-router':native,'@react-native-community/datetimepicker':native,'expo-router/react-navigation':native,'react-native-safe-area-context':native,'react-native-screens/experimental':native,'react-native-reanimated':resolve('tests/helpers/native-motion.cjs')}});
 const fonts=[['manrope','Manrope-Regular'],['manrope','Manrope-SemiBold'],['lora','Lora-SemiBold']].map(([folder,name])=>`@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync(`assets/fonts/${folder}/${name}.ttf`).toString('base64')}) format('truetype');font-weight:400}`).join('');
 writeFileSync(resolve(output,'index.html'),`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fonts}html,body,#root{height:100%;margin:0}body{background:${DesignColors.light.canvas}}@media(prefers-color-scheme:dark){body{background:${DesignColors.dark.canvas}}}#root{display:flex;flex-direction:column}</style></head><body><div id="root"></div><script src="app.js"></script></body></html>`);console.log(output);
}
main().catch(error=>{console.error(error);process.exitCode=1});

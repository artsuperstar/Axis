/** Focused actual-component preview; data comes from the existing SQLite services. */
import { build } from 'esbuild';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { journalDatabase } from '../tests/helpers/journal';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import { formatBrlInput, maxAmountMinor } from '../src/features/finance/money';

const output = resolve('dist/manage-commitments-atlas'), evidence = 'docs/design-system/manage-commitments-v2';
mkdirSync(output, { recursive: true });
async function main() {
  if (!existsSync(output + '/fixture.json')) {
    const f = await journalDatabase();
    try {
      f.setTime('2026-11-13');
      const category = f.finance.createCategory('Management review utilities', 'expense');
      const create = (title: string, kind: 'bill' | 'subscription' | 'installment', firstDueDate = '2026-11-13', count = '3', amount = '150') => f.commitments.create({ ...commitmentDraft(null, undefined, firstDueDate), title, kind, installmentCount: kind === 'installment' ? count : '', amount, categoryId: category.id });
      const active = create('Active bill', 'bill'), subscription = create('Active subscription', 'subscription', '2026-11-20');
      const paused = create('Paused bill', 'bill', '2026-11-01'); f.commitments.pause(paused);
      const ended = create('Ended subscription', 'subscription', '2026-11-01'); f.commitments.end(ended);
      const completed = create('Completed installment', 'installment', '2026-11-01', '1', '43,50');
      const payment = f.commitments.pay(f.commitments.readHistory(completed).outstanding[0], '35', '2026-11-12');
      const remaining = create('Installment remaining', 'installment', '2026-11-01', '3', '43,50');
      f.commitments.skip(f.commitments.readHistory(remaining).outstanding[0]);
      const resumable = create('Paused installment eligible', 'installment', '2026-12-01'); f.commitments.pause(resumable);
      const assigned = create('Paused installment assigned', 'installment', '2026-11-01', '1'); f.commitments.pause(assigned);
      const long = create('Long commitment title for regional services and supporting accessibility documentation retained without truncation', 'bill', '2026-11-01', '', formatBrlInput(maxAmountMinor));
      const items = f.commitments.read().items, ledger = f.finance.readLedgerPage();
      const histories = Object.fromEntries(items.map(item => [item.commitment.id, f.commitments.readHistory(item.commitment.id)]));
      const proposals = Object.fromEntries(items.filter(item => item.canResume).map(item => [item.commitment.id, f.commitments.resumeProposal(item.commitment.id)]));
      const extra = Array.from({ length: 50 }, (_, i) => create(`Review service ${String(i + 1).padStart(2, '0')}`, 'bill', '2026-12-01'));
      const all = f.commitments.read().items;
      writeFileSync(output + '/fixture.json', JSON.stringify({ today: '2026-11-13', active, subscription, paused, ended, completed, remaining, resumable, assigned, long, payment, items, histories, proposals, ledger, many: all, extra }, (_key, value) => typeof value === 'bigint' ? { $bigint: value.toString() } : value));
    } finally { f.sqlite.close(); }
  }
  writeFileSync(evidence + '/fixture.json', readFileSync(output + '/fixture.json'));
  const native = resolve(output, 'native.jsx');
  writeFileSync(native, readFileSync('dist/transactions-v22-preview/native.jsx'));
  writeFileSync(output + '/entry.jsx', `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{View,Platform,Keyboard,AccessibilityInfo,Dimensions,Alert}from'react-native';
import{CommitmentsView}from'../../src/features/finance/commitments/components/commitments-view';import{CommitmentModal,CommitmentEditor,CommitmentPayment}from'../../src/features/finance/commitments/components/commitment-forms';import{CommitmentHistory}from'../../src/features/finance/commitments/components/commitment-history';import{TransactionDetail}from'../../src/features/finance/components/transaction-detail';import{TransactionEditor}from'../../src/features/finance/components/transaction-editor';import{FormSelectionHost}from'../../src/components/form-controls';import{DesignProvider,UiText,useDesignColors}from'../../src/components/design-system';import raw from'./fixture.json';
const f=JSON.parse(JSON.stringify(raw),(_k,v)=>v&&v.$bigint?BigInt(v.$bigint):v),p=new URLSearchParams(location.search),kind=p.get('case')||'manage',large=p.has('large');Platform.OS='ios';Keyboard.metrics=()=>undefined;Keyboard.addListener=()=>({remove(){}});Keyboard.dismiss=()=>{};AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});AccessibilityInfo.sendAccessibilityEvent=()=>{};const get=Dimensions.get.bind(Dimensions);Dimensions.get=k=>({...get(k),fontScale:large?2:1});
if(large){const sized=new WeakSet();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(sized.has(e))return;sized.add(e);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
window.reviewCalls=[];Alert.alert=(title,message,buttons)=>{window.reviewAlert={title,message,buttons};};const action=(name,...args)=>{window.reviewCalls.push({name,args});};const access={readHistory:id=>{if(kind==='error')throw Error('Saved series remains available. Unable to open commitment details.');return f.histories[id]},resumeProposal:id=>f.proposals[id],pause:id=>action('pause',id),end:id=>action('end',id),resume:(...args)=>action('resume',...args),edit:(...args)=>action('edit',...args)};
const blocked=()=>{throw Error('Review write not supported')},no=()=>{},completed=f.items.find(i=>i.commitment.id===f.completed),record=f.ledger.transactions.find(t=>t.id===f.payment);
function App(){const c=useDesignColors();document.body.style.backgroundColor=c.canvas;
if(kind==='editor')return <CommitmentModal onDismiss={no}><CommitmentEditor item={f.items.find(i=>i.commitment.id===f.active)} categories={f.ledger.categories} onCreateCategory={blocked} onDismiss={no} onSave={blocked}/></CommitmentModal>;
if(kind==='payment')return <CommitmentModal onDismiss={no}><CommitmentPayment occurrence={f.items.find(i=>i.commitment.id===f.active).outstanding[0]} kind="bill" title="Active bill" categoryName="Management review utilities" onDismiss={no} onSave={blocked}/></CommitmentModal>;
if(kind==='history')return <CommitmentModal onDismiss={no}><CommitmentHistory data={f.histories[f.completed]} categories={f.ledger.categories} actions={[]} error={null} onDismiss={no} onViewCommitment={no} onReopen={no} onLoadEarlier={no}/></CommitmentModal>;
if(kind==='linked')return <TransactionDetail transaction={record} source={f.ledger.sources[f.payment]} categories={f.ledger.categories} today={f.today} visible onClosed={no} onDismiss={no} onEdit={no} onOpenSource={no}/>;
if(kind==='other')return <TransactionEditor transaction={record} categories={f.ledger.categories} commitmentPayment onSave={blocked} onCreateCategory={blocked} onDismiss={no}/>;
return <View style={{flex:1,backgroundColor:c.canvas}}><UiText type="screenTitle" style={{padding:16}}>Finance</UiText><CommitmentsView items={kind==='empty'?[]:kind==='long'?[f.items.find(i=>i.commitment.id===f.long)]:kind==='many'?f.many:f.items} categories={f.ledger.categories} access={access} today={f.today} mutate={fn=>fn()} onCreateCategory={blocked}/></View>;}
createRoot(document.getElementById('root')).render(<DesignProvider><FormSelectionHost safeAreaApplied><App/></FormSelectionHost></DesignProvider>);`);
  await build({ entryPoints: [output + '/entry.jsx'], outfile: output + '/app.js', bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' }, loader: { '.ttf': 'file' }, plugins: process.argv.includes('--before') ? [{ name: 'saved-before-manage', setup(builder) { builder.onLoad({ filter: /[\\/]commitments-view\.tsx$/ }, args => ({ contents: readFileSync('dist/manage-commitments-v2/commitments-view.tsx.before', 'utf8'), loader: 'tsx', resolveDir: dirname(args.path) })); } }] : [], alias: { 'react-native': 'react-native-web', 'expo-image': native, 'expo-font': native, 'expo-crypto': native, 'expo-router': native, '@react-native-community/datetimepicker': native, 'expo-router/react-navigation': native, 'react-native-safe-area-context': native, 'react-native-screens/experimental': native, 'react-native-reanimated': resolve('tests/helpers/native-motion.cjs') } });
  const fonts = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']].map(([folder, name]) => `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync('assets/fonts/' + folder + '/' + name + '.ttf').toString('base64')})}`).join('');
  writeFileSync(output + '/index.html', `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fonts}html,body,#root{height:100%;margin:0}#root{display:flex;flex-direction:column}</style><div id="root"></div><script src="app.js"></script>`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

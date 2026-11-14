/** Actual linked detail/editor/source components; records come from the existing SQLite services. */
import { build } from 'esbuild';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { journalDatabase } from '../tests/helpers/journal';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import { workDraft } from '../src/features/finance/work/form';
import { transactionDraft } from '../src/features/finance/form';
import { formatBrlInput, maxAmountMinor } from '../src/features/finance/money';

const output = resolve('dist/linked-transaction-detail-atlas');
mkdirSync(output, { recursive: true });
async function main() {
  if (!existsSync(resolve(output, 'fixture.json'))) {
  const f = await journalDatabase();
  try {
    f.setTime('2026-11-13');
    const category = f.finance.createCategory('Independent project income', 'income');
    const expense = f.finance.createCategory('Household utilities', 'expense');
    const commitmentId = f.commitments.create({ ...commitmentDraft(null, undefined, '2026-11-01'), title: 'Internet', amount: '150', categoryId: expense.id });
    const occurrence = f.commitments.readHistory(commitmentId).outstanding[0];
    const commitment = f.commitments.pay(occurrence, '151,23', '2026-11-12');
    const client = f.work.createCounterparty('Studio and independent creative services');
    const jobs = ['Inventory Software', 'Team training'].map(title => f.work.create({ ...workDraft(null, '2026-11-01'), counterpartyId: client.id, title, compensationType: 'fixed', fixedAmount: '600' }));
    const work = f.work.recordPayment({ counterpartyId: client.id, allocations: [{ workEntryId: jobs[0], amount: '200,01' }], categoryId: category.id, paymentDate: '2026-11-12' });
    const multi = f.work.recordPayment({ counterpartyId: client.id, allocations: jobs.map(workEntryId => ({ workEntryId, amount: '100,01' })), categoryId: category.id, paymentDate: '2026-11-12' });
    const largeJob = f.work.create({ ...workDraft(null, '2026-11-01'), counterpartyId: client.id, title: 'Long term project', compensationType: 'fixed', fixedAmount: formatBrlInput(maxAmountMinor) });
    const large = f.work.recordPayment({ counterpartyId: client.id, allocations: [{ workEntryId: largeJob, amount: formatBrlInput(maxAmountMinor) }], categoryId: category.id, paymentDate: '2026-11-12' });
    const manual = f.finance.createTransaction({ ...transactionDraft(), type: 'expense', description: 'Manual lunch', amount: '25,90', transactionDate: '2026-11-12' });
    const page = f.finance.readLedgerPage();
    for (const id of [work, multi, large]) {
      const record = page.transactions.find(t => t.id === id)!;
      f.finance.editTransaction(id, { ...transactionDraft(record), note: 'Receipt note retained from the source-linked transaction.' });
    }
    writeFileSync(resolve(output, 'fixture.json'), JSON.stringify({ today: '2026-11-13', commitment, work, multi, large, manual, ledger: f.finance.readLedgerPage(), totals: f.work.readOverview().totals, commitmentData: f.commitments.readHistory(commitmentId) }, (_key, value) => typeof value === 'bigint' ? { $bigint: value.toString() } : value));
  } finally { f.sqlite.close(); }
  }
  writeFileSync('docs/design-system/linked-transaction-detail-v2/fixture.json', readFileSync(resolve(output, 'fixture.json')));
  const native = resolve('dist/transactions-v22-preview/native.jsx');
  writeFileSync(resolve(output, 'entry.jsx'), `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{Platform,Keyboard,AccessibilityInfo,Dimensions}from'react-native';
import{TransactionDetail}from'../../src/features/finance/components/transaction-detail';import{TransactionEditor}from'../../src/features/finance/components/transaction-editor';import{WorkFinancialSummary}from'../../src/features/finance/work/components/work-main';import{CommitmentDetails}from'../../src/features/finance/commitments/components/commitment-details';import{AdaptiveModal}from'../../src/components/adaptive-sheet';import{FormSelectionHost}from'../../src/components/form-controls';import{DesignProvider,useDesignColors}from'../../src/components/design-system';import{SheetRefreshContext}from'../../src/components/sheet-refresh-notice';import raw from'./fixture.json';
const f=JSON.parse(JSON.stringify(raw),(_k,v)=>v&&v.$bigint?BigInt(v.$bigint):v),p=new URLSearchParams(location.search),kind=p.get('case')||'work',largeText=p.has('large');Platform.OS='ios';Keyboard.metrics=()=>undefined;Keyboard.addListener=()=>({remove(){}});Keyboard.dismiss=()=>{};AccessibilityInfo.isReduceMotionEnabled=()=>Promise.resolve(true);AccessibilityInfo.addEventListener=()=>({remove(){}});AccessibilityInfo.sendAccessibilityEvent=()=>{};const get=Dimensions.get.bind(Dimensions);Dimensions.get=k=>({...get(k),fontScale:largeText?2:1});
if(largeText){const done=new WeakSet();new MutationObserver(()=>document.querySelectorAll('[dir="auto"],input,textarea').forEach(e=>{if(done.has(e))return;done.add(e);const s=getComputedStyle(e);e.style.fontSize=parseFloat(s.fontSize)*2+'px';if(s.lineHeight!=='normal')e.style.lineHeight=parseFloat(s.lineHeight)*2+'px'})).observe(document.body,{childList:true,subtree:true});}
const id=kind==='large'?f.large:kind==='commitment'?f.commitment:kind==='multi'||kind==='long'?f.multi:kind==='manual'?f.manual:f.work,transaction=f.ledger.transactions.find(t=>t.id===id),source=f.ledger.sources[id];
function App(){const c=useDesignColors(),[error,setError]=useState(kind==='refresh'?'Refresh failed. Saved transaction remains available.':null),[screen,setScreen]=useState(kind);document.body.style.backgroundColor=c.canvas;const action=name=>()=>{window.reviewAction=name;window.reviewCount=(window.reviewCount||0)+1};
if(screen==='work-source')return <WorkFinancialSummary totals={f.totals} onAdd={action('Add work')} onPayment={action('Record payment')} onClients={action('Clients')} onHistory={action('History')}/>;
if(screen==='commitment-source')return <AdaptiveModal onDismiss={action('Dismiss')}><CommitmentDetails data={f.commitmentData} pending={f.commitmentData.outstanding} focused={false} categories={f.ledger.categories} today={f.today} actions={[]} error={null} onDismiss={action('Dismiss')} onHistory={action('History')} onPay={action('Pay')} onSkip={action('Skip')} onViewSeries={action('View series')}/></AdaptiveModal>;
if(screen==='manual'||screen==='editor')return <TransactionEditor transaction={transaction} categories={f.ledger.categories} workPayment={source?.kind==='work'} commitmentPayment={source?.kind==='commitment'} onSave={draft=>{window.reviewSaved=draft}} onDismiss={action('Cancel')} onCreateCategory={()=>{throw Error('Fixture create unavailable')}}/>;
return <SheetRefreshContext.Provider value={{error,onRetry:()=>{window.reviewRetry=true;setError(null)}}}><TransactionDetail transaction={kind==='long'?{...transaction,note:transaction.note+' Supporting information for the complete project scope. '.repeat(4)}:transaction} source={kind==='long'?{...source,clientName:source.clientName+' and regional operations',jobs:source.jobs.map(j=>({...j,title:j.title+' and supporting accessibility documentation for the client review'}))}:source} categories={f.ledger.categories} today={f.today} visible onClosed={()=>{}} onDismiss={action('Dismiss')} onEdit={()=>{window.reviewAction='Edit details';setScreen('editor')}} onOpenSource={()=>{window.reviewAction=source.kind==='work'?'Open Work':'Open Commitments';setScreen(source.kind==='work'?'work-source':'commitment-source')}}/></SheetRefreshContext.Provider>;}
createRoot(document.getElementById('root')).render(<DesignProvider><FormSelectionHost safeAreaApplied><App/></FormSelectionHost></DesignProvider>);`);
  await build({ entryPoints: [resolve(output, 'entry.jsx')], outfile: resolve(output, 'app.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' }, loader: { '.ttf': 'file' }, plugins: process.argv.includes('--before') ? [{ name: 'saved-before-detail', setup(builder) { builder.onLoad({ filter: /[\\/]transaction-detail\.tsx$/ }, args => ({ contents: readFileSync('dist/linked-transaction-detail-v2/transaction-detail.tsx.before', 'utf8'), loader: 'tsx', resolveDir: dirname(args.path) })); } }] : [], alias: { 'react-native': 'react-native-web', 'expo-image': native, 'expo-font': native, 'expo-crypto': native, 'expo-router': native, '@react-native-community/datetimepicker': native, 'expo-router/react-navigation': native, 'react-native-safe-area-context': native, 'react-native-screens/experimental': native, 'react-native-reanimated': resolve('tests/helpers/native-motion.cjs') } });
  const fonts = [['manrope', 'Manrope-Regular'], ['manrope', 'Manrope-SemiBold'], ['lora', 'Lora-SemiBold']].map(([folder, name]) => `@font-face{font-family:'Axis${name}';src:url(data:font/ttf;base64,${readFileSync('assets/fonts/' + folder + '/' + name + '.ttf').toString('base64')})}`).join('');
  writeFileSync(resolve(output, 'index.html'), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fonts}html,body,#root{height:100%;margin:0}#root{display:flex;flex-direction:column}</style><div id="root"></div><script src="app.js"></script>`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

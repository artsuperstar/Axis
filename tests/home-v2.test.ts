/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { readFileSync, statSync } from 'node:fs';
import { createHomeDataAccess } from '../src/features/home/data';
import { taskDraft } from '../src/features/tasks/form';
import { formatBrlAmount, formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { transactionDraft } from '../src/features/finance/form';
import { journalBaseline } from '../src/features/journal/form';
import { localDateString } from '../src/utils/calendar';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const today=localDateString(new Date());
type App=Awaited<ReturnType<typeof mount>>;
const nodes=(app:App,id:string)=>app.nodes().filter(n=>n.props?.testID===id);
const card=(app:App,id:string)=>nodes(app,'home-card-'+id)[0];
async function setup(t:TestContext){const f=await journalDatabase();f.setTime(today);t.after(()=>f.sqlite.close());
 const home=createHomeDataAccess(f.db,randomUUID,f.now);
 const open=async()=>{const app=await mount(createElement(screens.HomeScreen),f.db);t.after(app.unmount);return app;};
 const task=(title='Saved daily task')=>f.tasks.createTask({...taskDraft(),title,date:today});return{...f,home,open,task};}
async function toggle(app:App,id:string){await app.tapSet(String(card(app,id).props.accessibilityLabel));}
const flat=(style:unknown):Record<string,unknown>=>Object.assign({},...(Array.isArray(style)?style.flat(Infinity):[style]));

for(const theme of ['light','dark'] as const)test(`${theme}: Home has distinct local-art identities, source summaries and only supported controls`,async t=>{
 t.mock.method(runtime.native as {useColorScheme:()=>string},'useColorScheme',()=>theme);
 const f=await setup(t);f.task();const app=await f.open();
 for(const id of ['today','attention','fitness','journal'])assert.equal(nodes(app,'home-card-'+id).length,1);
 for(const id of ['today','attention','fitness','journal','spent'])assert.equal(nodes(app,'home-art-'+id).length,1);
 const backgrounds=['today','attention','fitness','journal'].map(id=>flat((card(app,id).props.style as (s:{pressed:boolean})=>unknown)({pressed:false})).backgroundColor);
 assert.equal(new Set(backgrounds).size,4);assert.equal(nodes(app,'home-detail-today').length,0);
 assert.ok(!app.nodes().some(n=>['Search','Profile','Settings'].includes(String(n.props?.accessibilityLabel))));
 assert.ok(!app.nodes().some(n=>n.props?.accessibilityRole==='progressbar'));assert.ok(!app.container.textContent.includes('%'));
 assert.ok(String(card(app,'today').props.accessibilityLabel).includes('1 items'));assert.equal(f.home.read().todayPreview[0].title,'Saved daily task');
});

test('selection switches/collapses without source reads; Journal navigates directly while keeping the selected feature',async t=>{
 const f=await setup(t);f.task();const app=await f.open(),before=runtime.fixture.reads.length;
 await toggle(app,'today');assert.equal(nodes(app,'home-detail-today').length,1);await toggle(app,'attention');assert.equal(nodes(app,'home-detail-today').length,0);assert.equal(nodes(app,'home-detail-attention').length,1);
 await toggle(app,'attention');assert.equal(nodes(app,'home-detail-attention').length,0);await toggle(app,'today');await toggle(app,'fitness');await toggle(app,'journal');
 assert.equal(nodes(app,'home-detail-fitness').length,0);assert.equal(nodes(app,'home-detail-today').length,1);assert.deepEqual(runtime.fixture.navigation.at(-1),{method:'push',target:{pathname:'/journal'}});assert.equal(runtime.fixture.reads.length,before);
});

test('decorative failures retain all source values and interactions, and source refresh does not remount failed plates',async t=>{
 const f=await setup(t);f.task();const app=await f.open();const images=app.nodes().filter(n=>String(n.props?.testID??'').startsWith('home-art-'));
 assert.equal(images.length,5);for(const image of images)await act(()=>{(image.props.onError as ()=>void)();});
 assert.equal(app.nodes().filter(n=>String(n.props?.testID??'').startsWith('home-art-')).length,0);
 assert.ok(app.find('View','Spent today, R$ 0,00'));await toggle(app,'today');assert.equal(nodes(app,'home-detail-today').length,1);await app.refocus();
 assert.equal(app.nodes().filter(n=>String(n.props?.testID??'').startsWith('home-art-')).length,0);assert.ok(card(app,'fitness'));
});

test('task completion stays source-owned and pending-only without invented completion progress',async t=>{
 const f=await setup(t),id=f.task();const app=await f.open();await toggle(app,'today');
 const checkbox=app.nodes().find(n=>n.props?.accessibilityRole==='checkbox')!;assert.equal(checkbox.props.accessibilityState&& (checkbox.props.accessibilityState as {checked:boolean}).checked,false);
 await app.tapSet(String(checkbox.props.accessibilityLabel));assert.ok(f.tasks.read().tasks.find(x=>x.id===id)!.completedAt);assert.ok(!app.container.textContent.includes('Saved daily task'));
 assert.ok(app.container.textContent.includes('Nothing scheduled today.'));assert.ok(!app.nodes().some(n=>n.props?.accessibilityRole==='progressbar'));
});

test('saved Journal state exposes no private content or invented draft and preserves real navigation',async t=>{
 const f=await setup(t);f.access.save(today,{content:'Private diary content',mood:'good'},journalBaseline(null));const app=await f.open();
 assert.ok(String(card(app,'journal').props.accessibilityLabel).includes('Entry saved'));assert.ok(!app.container.textContent.includes('Private diary content'));await toggle(app,'journal');
 assert.equal(nodes(app,'home-detail-journal').length,0);assert.deepEqual(runtime.fixture.navigation.at(-1),{method:'push',target:{pathname:'/journal'}});
});

test('Reduced Motion keeps disclosure immediate without image animation or new financial reads',async t=>{
 const f=await setup(t);const app=await f.open();await act(()=>(runtime.reduceMotion as (value:boolean)=>void)(true));const before=runtime.fixture.reads.length,animations=runtime.fixture.layoutAnimations.length;
 await toggle(app,'today');assert.equal(nodes(app,'home-detail-today').length,1);await toggle(app,'today');assert.equal(nodes(app,'home-detail-today').length,0);
 assert.equal(runtime.fixture.reads.length,before);assert.equal(runtime.fixture.layoutAnimations.length,animations);
});

for(const width of [320,390,430])for(const fontScale of [1,2])test(`${width}/${fontScale}: complete source-safe BRL and long identities remain accessible`,async t=>{
 t.mock.method(runtime.native as {useWindowDimensions:()=>object},'useWindowDimensions',()=>({width,height:844,scale:1,fontScale}));
 const f=await setup(t),title='A long saved task identity '.repeat(6).trim();f.task(title);f.finance.createTransaction({...transactionDraft(),type:'expense',description:'Large actual spending',amount:formatBrlInput(maxAmountMinor),transactionDate:today});
 const app=await f.open();assert.ok(app.find('View',`Spent today, ${formatBrlAmount(maxAmountMinor)}`));assert.ok(String(card(app,'today').props.accessibilityLabel).includes(title));
 assert.ok(nodes(app,'home-money-group').some(n=>n.textContent==='409,91'));await toggle(app,'today');assert.ok(app.container.textContent.includes(title));
});

test('artwork has recorded original prompts, bounded dimensions and a compact local bundle',()=>{
 const manifest=JSON.parse(readFileSync('assets/images/home-v2/provenance.json','utf8')) as {assets:Record<string,{output:string;width:number;height:number;prompt:string}>};
 let bytes=0;for(const item of Object.values(manifest.assets)){const file='assets/images/home-v2/'+item.output;bytes+=statSync(file).size;assert.ok(item.width<=960&&item.height<=512);assert.ok(item.prompt.includes('no app UI'));assert.ok(JSON.parse(readFileSync(file+'.json','utf8')).prompt===item.prompt);}
 assert.equal(Object.keys(manifest.assets).length,5);assert.ok(bytes<150000);
 const tabs=readFileSync('src/components/app-tabs.tsx','utf8');assert.equal((tabs.match(/<NativeTabs.Trigger name=/g)??[]).length,5);assert.ok(!tabs.includes('journal'));
});

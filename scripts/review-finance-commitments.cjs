/** Native-safe source boundaries are fixtures; these captures certify RNWeb composition only. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');const{pathToFileURL}=require('node:url');
const{chromium}=require(process.env.AXIS_PLAYWRIGHT_PATH||'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const output=path.resolve('docs/previews/finance-commitments-v2');fs.mkdirSync(output,{recursive:true});
async function main(){const browser=await chromium.launch({executablePath:process.env.AXIS_CHROMIUM_PATH||'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',headless:true});const checks=[],cases=[];
 for(const width of [320,390,430])for(const theme of ['dark','light'])for(const scale of [1,2])cases.push({name:`stress-${width}-${theme}-${scale}`,width,theme,scale,scenario:'stress'});
 for(const theme of ['dark','light'])for(const state of ['upcoming','same-types','mixed','overdue','empty','quiet','actions','options','pay','manage','history','long-bottom'])cases.push({name:`${state}-390-${theme}`,width:390,theme,scale:1,scenario:['actions','options','pay'].includes(state)?'upcoming':['manage','history'].includes(state)?'quiet':state==='long-bottom'?'long':state,state});
 try{for(const c of cases){const page=await browser.newPage({viewport:{width:c.width,height:c.scale===2?1500:1000},colorScheme:c.theme,locale:'pt-BR',timezoneId:'America/Sao_Paulo'});const errors=[];page.on('pageerror',error=>errors.push(error.message));try{
  await page.goto(`${pathToFileURL(path.resolve('dist/finance-commitments-v2-preview/index.html')).href}?scenario=${c.scenario}${c.scale===2?'&large':''}`);await page.getByTestId('commitments-list').waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(150);
  assert.equal(await page.getByRole('heading',{name:'Commitments',exact:true}).count(),0);assert.equal(await page.getByText('Stay on top of your commitments',{exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Add commitment',exact:true}).count(),1);
  const addBounds=await page.getByRole('button',{name:'Add commitment',exact:true}).boundingBox(),optionsBounds=await page.getByRole('button',{name:'Commitment options',exact:true}).boundingBox();
  const overlap=Math.min(addBounds.x+addBounds.width,optionsBounds.x+optionsBounds.width)-Math.max(addBounds.x,optionsBounds.x)>1&&Math.min(addBounds.y+addBounds.height,optionsBounds.y+optionsBounds.height)-Math.max(addBounds.y,optionsBounds.y)>1;
  assert.equal(overlap,false,`${c.name}: creation and global options hit targets overlap`);
  if(['options','manage','history'].includes(c.state)){await page.getByRole('button',{name:'Commitment options',exact:true}).click();if(c.state!=='options')await page.getByRole('button',{name:c.state==='manage'?'Manage commitments':'History',exact:true}).click();}
  if(c.state==='actions')await page.getByRole('button',{name:/^Actions for Rock in Rio Ticket,/}).click();
  if(c.state==='pay')await page.getByRole('button',{name:/^Pay Rock in Rio Ticket,/}).click();
  if(c.state==='long-bottom'){
   const before=await page.getByTestId('commitment-obligation').count();assert.ok(before<100);const list=page.getByTestId('commitments-list');
   for(let i=0;i<12;i++){await list.evaluate(el=>{el.scrollTop+=1800;});await page.waitForTimeout(300);}
   await page.getByText('Series 099',{exact:true}).waitFor();const bottom=await page.getByText('Series 099',{exact:true}).evaluate(e=>e.closest('[data-testid="commitment-obligation"]').getBoundingClientRect().bottom);
   assert.ok(bottom<=1000-31);checks.push({case:c.name+'-virtualization',mountedInitially:before,fixture:100,bottom,errors:[]});
  }
  const geometry=await page.evaluate(()=>{const cards=[...document.querySelectorAll('[data-testid="commitment-obligation"]')],overflow=[];
   for(const card of cards){const b=card.getBoundingClientRect();for(const e of card.querySelectorAll('[dir="auto"]')){const walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);for(let t=walker.nextNode();t;t=walker.nextNode())for(let i=0;i<t.length;i++){if(/\s/.test(t.textContent[i]))continue;const r=document.createRange();r.setStart(t,i);r.setEnd(t,i+1);for(const box of r.getClientRects())if(box.left<b.left-.5||box.right>b.right+.5)overflow.push(t.textContent);}}}
   return{overflow:[...new Set(overflow)],horizontalOverflow:document.documentElement.scrollWidth>innerWidth,cards:cards.map(card=>({title:card.querySelector('[data-testid="commitment-title"]')?.textContent,icon:card.querySelector('[data-testid^="icon-"]')?.dataset.testid,amount:card.querySelector('[data-testid="commitment-amount"]')?.textContent}))};});
  for(const item of geometry.cards){const icon=['Netflix','Spotify'].includes(item.title)?'repeat':['Rock in Rio Ticket','Computer'].includes(item.title)||item.title.startsWith('VeryLong')||item.title==='Overdue installment'?'layers':'receipt';if(!item.title.startsWith('Series '))assert.equal(item.icon,'icon-'+icon);}
  await page.screenshot({path:path.join(output,c.name+'.png'),fullPage:true});
  if(c.scale===2){const card=page.getByTestId('commitment-obligation').first();await card.screenshot({path:path.join(output,c.name+'-card.png')});}
  checks.push({case:c.name,...geometry,addBounds,optionsBounds,errors});
 }finally{await page.close();}}}finally{await browser.close();}
 fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(checks,null,2));const failures=checks.filter(c=>c.errors.length||c.horizontalOverflow||c.overflow?.length);console.log(JSON.stringify({scenes:cases.length,checks:checks.length,failures},null,2));assert.equal(failures.length,0);
}
main().catch(error=>{console.error(error);process.exitCode=1});

/** Real RN Web screen geometry/interaction evidence, not native-device certification. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const output = path.resolve('docs/previews/transactions-v22'); fs.mkdirSync(output, { recursive: true });
async function main() {
 const browser = await chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true });
 const checks=[];
 try {
  const cases=[];
  for(const width of [320,390,430])for(const theme of ['dark','light'])for(const scale of [1,2])cases.push({name:`stress-${width}-${theme}-${scale}`,width,theme,scale,scenario:'stress'});
  for(const width of [320,390])for(const theme of ['dark','light'])for(const scale of [1,2])cases.push({name:`expenses-${width}-${theme}-${scale}`,width,theme,scale,scenario:'stress',params:'type=expense'});
  for(const theme of ['dark','light'])cases.push({name:`mixed-390-${theme}`,width:390,theme,scale:1,scenario:'normal'});
  for(const [name,params] of Object.entries({expenses:'type=expense',income:'type=income',match:'query=agua',noResults:'query=absent',empty:'scenario=empty',history:'scenario=history'}))cases.push({name,width:390,theme:'dark',scale:1,scenario:'normal',params});
  for(const c of cases){
   const page=await browser.newPage({viewport:{width:c.width,height:c.scale===2?1500:1050},colorScheme:c.theme,locale:'pt-BR',timezoneId:'America/Sao_Paulo'});
   try{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const url=pathToFileURL(path.resolve('dist/transactions-v22-preview/index.html')).href;
    const params=new URLSearchParams(`scenario=${c.scenario}${c.scale===2?'&large':''}`);for(const [key,value]of new URLSearchParams(c.params||''))params.set(key,value);
    await page.goto(`${url}?${params}`);
    await page.getByTestId('transactions-list').waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(150);
    const input=page.getByRole('textbox',{name:'Search transactions',exact:true});
    if(c.name==='match'){
      await input.focus();await input.fill('agua');assert.equal(await input.evaluate(e=>e===document.activeElement),true);
      assert.equal(await page.getByTestId('transaction-row').count(),1);
      await page.getByRole('button',{name:'Clear search',exact:true}).click();assert.equal(await input.inputValue(),'');await input.fill('agua');
    }
    if(c.name==='history'){
      for(let i=0;i<3;i++){
       const older=page.getByRole('button',{name:'Load older transactions',exact:true});await older.scrollIntoViewIfNeeded();await page.waitForTimeout(200);await older.click();
       await page.waitForFunction(expected=>window.reviewLedger.limit===expected,80+i*40);
       const rows=await page.getByTestId('transaction-row').count();assert.ok(rows>0);
      }
      assert.equal(await page.getByRole('button',{name:'Load older transactions',exact:true}).count(),0);
      const ledger=await page.evaluate(()=>window.reviewLedger);assert.equal(ledger.shown,152);
      checks.push({case:'history-pagination',pages:4,totalFixture:ledger.total,lastPage:31,shown:ledger.shown,errors});
    }
    const geometry=await page.evaluate(()=>{
     const overflow=[];const cards=[...document.querySelectorAll('[data-testid="transaction-row"]')];
     for(const card of cards){const b=card.getBoundingClientRect();
      for(const e of card.querySelectorAll('*')){const r=e.getBoundingClientRect();if(r.left<b.left-.5||r.right>b.right+.5)overflow.push(e.textContent);
       if(e.getAttribute('dir')!=='auto')continue;const walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);
       for(let t=walker.nextNode();t;t=walker.nextNode())for(let i=0;i<t.length;i++){if(/\s/.test(t.textContent[i]))continue;const range=document.createRange();range.setStart(t,i);range.setEnd(t,i+1);for(const glyph of range.getClientRects())if(glyph.left<b.left-.5||glyph.right>b.right+.5)overflow.push(t.textContent);}
      }
     }
     return {overflow:[...new Set(overflow)],horizontalOverflow:document.documentElement.scrollWidth>innerWidth,
      icons:cards.map(card=>({title:card.querySelector('[data-testid="transaction-description"]')?.textContent,icon:card.querySelector('[data-testid^="icon-"]')?.getAttribute('data-testid'),menu:!!card.querySelector('[aria-label^="Transaction options for"]')}))};
    });
    const filterLines=await page.getByRole('radio').evaluateAll(elements=>elements.map(e=>{const text=e.querySelector('[dir="auto"]');const range=document.createRange();range.selectNodeContents(text);return {label:e.getAttribute('aria-label'),lines:[...new Set([...range.getClientRects()].map(r=>r.top))].length};}));
    assert.ok(filterLines.every(item=>item.lines===1),JSON.stringify({case:c.name,filterLines}));
    const food=geometry.icons.filter(x=>['Água','Popeyes'].includes(x.title));for(const item of food)assert.equal(item.icon,'icon-utensils');
    for(const item of geometry.icons)assert.equal(item.menu,true);
    for(const item of geometry.icons.filter(x=>['ChatGPT','Internet'].includes(x.title)))assert.equal(item.icon,item.title==='ChatGPT'?'icon-receipt':'icon-home');
    assert.equal(await page.getByRole('heading',{name:'Transactions',exact:true}).count(),0);
    assert.equal(await page.getByText('Track your money movements.',{exact:true}).count(),0);
    assert.equal(await page.getByRole('button',{name:'Transactions options',exact:true}).count(),1);
    const information=page.getByTestId('transaction-information');
    assert.equal(await information.getByRole('button').count(),0);
    assert.ok((await information.evaluateAll(elements=>elements.map(e=>e.getAttribute('role')))).every(role=>role!=='button'));
    if(c.name==='noResults')assert.ok(await page.getByText('No matching transactions',{exact:true}).count());
    if(c.name==='empty')assert.ok(await page.getByText('No transactions yet',{exact:true}).count());
    await page.screenshot({path:path.join(output,c.name+'.png'),fullPage:true});
    if(c.scale===2)await page.getByTestId('transaction-row').first().screenshot({path:path.join(output,c.name+'-long-card.png')});
    if(c.name.startsWith('mixed-390')){
      const first=information.first();await first.click();assert.equal(await page.getByRole('dialog').count(),0);
      for(const [title,actions]of [['Água',['Edit','Delete']],['Internet',['View payment details','Delete payment']],['Training payment',['View payment details']]]){
        await page.getByRole('button',{name:`Transaction options for ${title}`,exact:true}).click();
        const dialog=page.getByRole('dialog');await dialog.waitFor();
        for(const action of actions)assert.equal(await dialog.getByRole('button',{name:`${action} ${action==='View payment details'||action==='Delete payment'?'for ':''}${title}`,exact:true}).count(),1);
        if(title==='Training payment')assert.equal(await dialog.getByRole('button',{name:/Delete/}).count(),0);
        await page.screenshot({path:path.join(output,`${c.name}-${title==='Água'?'manual':title==='Internet'?'commitment':'work'}-menu.png`),fullPage:true});
        await page.getByRole('button',{name:`Close transaction options for ${title.toLowerCase()}`,exact:true}).click({position:{x:2,y:2}});
      }
      await page.getByRole('button',{name:'Transactions options',exact:true}).click();
      assert.equal(await page.getByRole('button',{name:'Categories',exact:true}).count(),1);
      await page.screenshot({path:path.join(output,`${c.name}-categories-menu.png`),fullPage:true});
    }
    checks.push({case:c.name,...geometry,filterLines,errors});
   }finally{await page.close();}
  }
  fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(checks,null,2));
  const failures=checks.filter(c=>c.errors.length||c.horizontalOverflow||c.overflow?.length);console.log(JSON.stringify({captures:cases.length,checks:checks.length,failures},null,2));assert.equal(failures.length,0);
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1});

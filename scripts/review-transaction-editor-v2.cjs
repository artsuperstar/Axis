/** RN Web/native-boundary review; actual keyboards and community picker rendering need devices. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.AXIS_PLAYWRIGHT_PATH||'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const output=path.resolve('docs/previews/transaction-editor-v2');fs.mkdirSync(output,{recursive:true});
async function main(){
 const browser=await chromium.launch({executablePath:process.env.AXIS_CHROMIUM_PATH||'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',headless:true});const checks=[];
 try{
  const cases=[];for(const width of [320,390,430])for(const theme of ['dark','light'])for(const scale of [1,2])cases.push({name:`stress-${width}-${theme}-${scale}`,width,theme,scale,scenario:'stress'});
  for(const name of ['new-expense','new-income','new-light','edit','description-error','amount-error','category','date','long-note','long-description','keyboard','list-dark','list-bottom','list-light'])cases.push({name,width:390,theme:name.endsWith('light')?'light':'dark',scale:1,scenario:name.startsWith('list-')?'list':name==='edit'?'edit':'new'});
  for(const c of cases){const page=await browser.newPage({viewport:{width:c.width,height:c.name==='list-bottom'?700:c.scale===2?1400:1050},colorScheme:c.theme,locale:'pt-BR',timezoneId:'America/Sao_Paulo'});try{
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const params=new URLSearchParams({scenario:c.scenario});if(c.scale===2)params.set('large','');if(c.name==='keyboard')params.set('keyboard','');
   await page.goto(pathToFileURL(path.resolve('dist/transaction-editor-v2-preview/index.html')).href+'?'+params);await page.evaluate(()=>document.fonts.ready);
   if(c.scenario==='list'){
    const create=page.getByRole('button',{name:'New transaction',exact:true});await create.waitFor();assert.equal(await create.count(),1);
    const before=await create.boundingBox();let scrollOffset=0;if(c.name==='list-bottom'){await page.getByTestId('transaction-row').last().scrollIntoViewIfNeeded();await page.waitForTimeout(150);const after=await create.boundingBox();assert.deepEqual(after,before);
      scrollOffset=await page.evaluate(()=>Math.max(...[...document.querySelectorAll('*')].map(e=>e.scrollTop||0)));assert.ok(scrollOffset>0);}
    await page.screenshot({path:path.join(output,c.name+'.png')});
    await create.click();await page.getByTestId('editor-section-transaction').waitFor();assert.equal(await create.count(),0,'FAB hidden while editor owns modal');
    checks.push({case:c.name,anchored:true,oneCreate:true,hiddenInEditor:true,scrollOffset,errors});continue;
   }
   await page.getByTestId('editor-section-transaction').waitFor();await page.waitForTimeout(100);
   const amount=page.getByRole('textbox',{name:'Amount in reais, required',exact:true}),description=page.getByRole('textbox',{name:'Description, required',exact:true}),note=page.getByRole('textbox',{name:'Note',exact:true});
   if(c.scenario==='stress'||c.scenario==='edit'){
    // RN Web does not remeasure multiline mount values after the preview's CSS-only
    // scale/font change. Refill through real input events, restoring the exact draft.
    for(const field of [description,note]){const value=await field.inputValue();if(value){await field.fill(value+' ');await field.fill(value);}}
    await page.evaluate(()=>{document.activeElement?.blur();for(const e of document.querySelectorAll('*'))if(/auto|scroll/.test(getComputedStyle(e).overflowY))e.scrollTop=0;window.scrollTo(0,0)});
   }
   if(c.name==='new-income')await page.getByRole('radio',{name:'Type *: Income',exact:true}).click();
   if(c.name.startsWith('new-'))await amount.fill('37,45');
   if(c.name==='description-error')await page.getByRole('button',{name:'Save',exact:true}).click();
   if(c.name==='amount-error'){await description.fill('Household supplies');await amount.fill('-12');await page.getByRole('button',{name:'Save',exact:true}).click();}
   if(c.name==='category')await page.getByRole('combobox',{name:'Category',exact:true}).click();
   if(c.name==='date')await page.getByRole('combobox',{name:'Date *',exact:true}).click();
   if(c.name==='long-note')await note.fill(('A personal note about this payment, with the receipt reference and household details.\n').repeat(12));
   if(c.name==='long-description')await description.fill('A complete description of this household transaction that wraps across multiple lines while retaining its full meaning.');
   if(c.name==='keyboard'){await note.focus();await note.fill('Draft preserved with the simulated keyboard frame.');
    await page.evaluate(()=>{window.scrollTo(0,0);document.documentElement.scrollTop=0;document.body.scrollTop=0});}
   await page.waitForTimeout(200);
   const data=await page.evaluate(()=>{
    const overflow=[];for(const panel of document.querySelectorAll('[data-testid^="editor-section-"]')){const b=panel.getBoundingClientRect();for(const e of panel.querySelectorAll('*')){const r=e.getBoundingClientRect();if(r.left<b.left-.5||r.right>b.right+.5)overflow.push(e.getAttribute('aria-label')||e.textContent);
     if(e.getAttribute('dir')!=='auto')continue;const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);for(let t=w.nextNode();t;t=w.nextNode())for(let i=0;i<t.length;i++){if(/\s/.test(t.textContent[i]))continue;const range=document.createRange();range.setStart(t,i);range.setEnd(t,i+1);for(const g of range.getClientRects())if(g.left<b.left-.5||g.right>b.right+.5)overflow.push(t.textContent);}
    }}
    const input=document.querySelector('[aria-label="Amount in reais, required"]');
    return{overflow:[...new Set(overflow)],horizontalOverflow:document.documentElement.scrollWidth>innerWidth,amountSuffixPadding:parseFloat(getComputedStyle(input).paddingRight),
     multilineSizing:[...document.querySelectorAll('textarea')].map(e=>{const style=getComputedStyle(e),borderAllowance=parseFloat(style.borderTopWidth)+parseFloat(style.borderBottomWidth);return{label:e.getAttribute('aria-label'),clientHeight:e.clientHeight,scrollHeight:e.scrollHeight,borderAllowance,remainingExcess:e.scrollHeight-e.clientHeight-borderAllowance,clipped:e.scrollHeight>e.clientHeight+borderAllowance+1}}),
     readonly:input.readOnly,amount:input.value,headerButtons:[...document.querySelectorAll('[role="button"]')].filter(e=>['Save','Cancel'].includes(e.getAttribute('aria-label'))).map(e=>({label:e.getAttribute('aria-label'),top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom,right:e.getBoundingClientRect().right}))};
   });
   await page.screenshot({path:path.join(output,c.name+'.png')});
   if(c.name==='long-note'||c.name==='long-description')await page.getByTestId('editor-section-details').screenshot({path:path.join(output,c.name+'-section.png')});
   if(c.name==='date')await page.getByTestId('editor-section-date').screenshot({path:path.join(output,'date-boundary-section.png')});
   if(c.scale===2){await page.getByTestId('editor-section-transaction').screenshot({path:path.join(output,c.name+'-amount-section.png')});await page.getByTestId('editor-section-details').screenshot({path:path.join(output,c.name+'-details-section.png')});}
   if(c.name==='keyboard')await page.screenshot({path:path.join(output,'keyboard-header.png'),clip:{x:0,y:0,width:c.width,height:120}});
   if(c.name==='description-error')assert.ok(await page.getByText('Enter a description.',{exact:true}).count());
   if(c.name==='amount-error')assert.equal(await amount.getAttribute('aria-invalid'),'true');
   if(c.name==='keyboard')assert.ok(data.headerButtons.every(b=>b.bottom<=560&&b.right<=390));
   checks.push({case:c.name,...data,errors});
  }finally{await page.close();}}
  fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(checks,null,2));const failures=checks.filter(c=>c.errors.length||c.horizontalOverflow||c.overflow?.length||c.multilineSizing?.some(field=>field.clipped));
  console.log(JSON.stringify({scenes:cases.length,failures},null,2));assert.equal(failures.length,0);
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1});

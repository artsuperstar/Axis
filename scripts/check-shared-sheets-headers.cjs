/** Actual browser interaction/geometry evidence; native owners are not replaced by these fixtures. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const{pathToFileURL}=require('node:url');
const{chromium}=require(process.env.AXIS_PLAYWRIGHT_PATH||'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const output='docs/design-system/shared-sheets-headers';
async function main(){
 const browser=await chromium.launch({executablePath:process.env.AXIS_CHROMIUM_PATH||'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',headless:true});const checks=[],escape=[],constraints=[];
 try{
  for(const theme of ['dark','light']){
   const page=await browser.newPage({viewport:{width:390,height:844},colorScheme:theme,reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const go=async(kind,extra='',phase='after')=>{await page.goto(pathToFileURL(path.resolve(`dist/shared-sheets-headers/${phase}/shared-sheets-atlas/index.html`)).href+'?case='+kind+'&web'+extra);await page.evaluate(()=>document.fonts.ready);};
   await go('operational');await page.getByRole('button',{name:'Back',exact:true}).click();await page.getByRole('button',{name:'Open sheet',exact:true}).waitFor();
   for(let i=0;i<3;i++){await page.getByRole('button',{name:'Open sheet',exact:true}).click();await page.getByRole('button',{name:'Back',exact:true}).click();}
   assert.equal(await page.evaluate(()=>window.reviewDismissed),4);checks.push({theme,case:'sheet-open-close',result:'Back retains parent callback; four open/close cycles leave no stale sheet'});
   await go('editorial');await page.getByRole('textbox',{name:'Name',exact:true}).fill('Retained draft');await page.getByRole('button',{name:'Save',exact:true}).click();assert.equal(await page.evaluate(()=>window.reviewSaved),'Retained draft');await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.getByRole('button',{name:'Open sheet',exact:true}).waitFor();checks.push({theme,case:'default-actions',result:'Original confirm/cancel callbacks and field draft retained'});
   await go('journal');await page.getByRole('button',{name:'Keep editing',exact:true}).click();assert.equal(await page.evaluate(()=>window.reviewChoice),'keep');checks.push({theme,case:'unsaved-journal',result:'Actual JournalLeave keep-editing decision is unchanged'});
   await go('selector');const trigger=page.getByRole('combobox',{name:'Category',exact:true});await trigger.click();const menu=page.getByRole('dialog',{name:'Category choices',exact:true});await menu.waitFor();assert.equal(await menu.count(),1);
   const long='Independent creative services and international studio accounts';await menu.getByRole('radio',{name:long,exact:true}).click();await menu.waitFor({state:'detached'});assert.equal(await trigger.getAttribute('aria-valuetext'),long);await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Category');
   await trigger.click();await page.getByRole('button',{name:'Create category',exact:true}).click();const inline=page.getByRole('dialog',{name:'New category',exact:true});await inline.waitFor();assert.equal(await inline.count(),1);
   await page.getByRole('textbox',{name:'New category name, required',exact:true}).fill('Community');await inline.getByRole('button',{name:'Create category',exact:true}).click();await inline.waitFor({state:'detached'});assert.equal(await page.evaluate(()=>window.reviewCreated),'Community');
   await trigger.click();await page.getByRole('button',{name:'Create category',exact:true}).click();await page.getByRole('button',{name:'Cancel new category',exact:true}).click();await menu.waitFor();assert.equal(await menu.count(),1);
   await page.getByRole('button',{name:'Close category choices',exact:true}).click({position:{x:2,y:2}});await menu.waitFor({state:'detached'});await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Category');checks.push({theme,case:'selector-inline',result:'One menu; existing selection/reopen, inline creation/cancel, dismissal and focus return passed'});
   await go('picker');await page.getByRole('combobox',{name:'Date',exact:true}).click();await page.getByRole('button',{name:'Back from date picker',exact:true}).click();assert.equal(await page.getByRole('combobox',{name:'Date',exact:true}).getAttribute('aria-expanded'),'false');checks.push({theme,case:'picker-adjacent',result:'Owned picker Back closes the picker subsection; native widget/value remain device-owned'});
   await go('nested');await page.getByRole('button',{name:'Add recurrence',exact:true}).click();await page.getByRole('button',{name:'Back to task editor',exact:true}).click();await page.getByRole('textbox',{name:'Title, required',exact:true}).waitFor();checks.push({theme,case:'nested-task',result:'Actual nested recurrence returns to the same editor'});
   for(const width of [320,390,430])for(const large of [false,true])for(const kind of ['operational','long','history']){
    await page.setViewportSize({width,height:844});await go(kind,large?'&large':'');
    const actions=await page.locator('[role=button]').evaluateAll(nodes=>nodes.filter(e=>['Back','Save','Cancel'].includes(e.getAttribute('aria-label'))).map(e=>{const r=e.getBoundingClientRect();return{label:e.getAttribute('aria-label'),x:r.x,y:r.y,width:r.width,height:r.height}}));
    for(const a of actions){assert.ok(a.width>=48&&a.height>=48,JSON.stringify(a));assert.ok(a.x>=0&&a.x+a.width<=width+.1,JSON.stringify({width,large,...a}));assert.ok(a.y>=0&&a.y+a.height<=844,JSON.stringify(a));}
    const notes=kind==='history'?page.getByText('Actual received payments',{exact:true}):page.getByRole('textbox',{name:'Notes',exact:true});await notes.scrollIntoViewIfNeeded();const bounds=await notes.boundingBox();assert.ok(bounds.y>=0&&bounds.y+bounds.height<=844.1,JSON.stringify(bounds));
    if(kind==='operational'||kind==='history'){await page.evaluate(()=>window.reviewKeyboard(520));if(kind==='operational')await page.getByRole('textbox',{name:'Name',exact:true}).focus();await notes.scrollIntoViewIfNeeded();const keyboard=await notes.boundingBox();assert.ok(keyboard.y+keyboard.height<=520.1,JSON.stringify(keyboard));}
    checks.push({theme,case:'layout',width,fontScale:large?2:1,kind,actions,result:'Actions >=48 and inside viewport; last input scrolls into view; operational keyboard-open bounds respected'});
   }
   assert.deepEqual(errors,[]);await page.close();
  }
  // Reproduce unchanged before/after behavior in both the bare host and the real Modal-owned flow.
  for(const phase of ['before','after'])for(const kind of ['host-escape','autocomplete']){
   const page=await browser.newPage({viewport:{width:390,height:844}});await page.goto(pathToFileURL(path.resolve(`dist/shared-sheets-headers/${phase}/shared-sheets-atlas/index.html`)).href+'?case='+kind+'&web');
   await page.getByRole('combobox',{name:'Client',exact:true}).click();const search=page.getByRole('combobox',{name:'Search client',exact:true});await search.fill('No match');assert.equal(await page.getByRole('radio').count(),0);
   await page.keyboard.press('Escape');await page.waitForTimeout(60);const stillOpen=await page.getByRole('combobox',{name:'Search client',exact:true}).count()>0;
   if(stillOpen)await page.getByRole('button',{name:'Dismiss client without saving',exact:true}).click({position:{x:2,y:2}});
   await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Client');
   escape.push({phase,kind,typingEscapeCloses:!stillOpen,explicitDismissRestoresFocus:true});await page.close();
  }
  for(const kind of ['host-escape','autocomplete'])assert.equal(escape.find(x=>x.kind===kind&&x.phase==='before').typingEscapeCloses,escape.find(x=>x.kind===kind&&x.phase==='after').typingEscapeCloses);
  // Disclose the compounded synthetic stress case rather than claiming native acceptance from a proxy.
  for(const phase of ['before','after']){const page=await browser.newPage({viewport:{width:320,height:844}});await page.goto(pathToFileURL(path.resolve(`dist/shared-sheets-headers/${phase}/shared-sheets-atlas/index.html`)).href+'?case=long&large&web');await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>window.reviewKeyboard(520));await page.getByRole('button',{name:'Save',exact:true}).waitFor();await page.waitForTimeout(60);const save=await page.getByRole('button',{name:'Save',exact:true}).boundingBox();constraints.push({phase,case:'synthetic long editorial title + doubled text + keyboard',width:320,keyboardTop:520,save,saveFullyAboveKeyboard:save.y+save.height<=520,scope:'Synthetic arbitrary editorial title; real long Client History uses operational typography. Requires native reproduction and a separately scoped constrained-height header treatment.'});await page.close();}
 }finally{await browser.close();}
 fs.writeFileSync(path.join(output,'interaction-validation.json'),JSON.stringify({scope:'Actual RNWeb components and synthetic callbacks/keyboard metrics; no native acceptance',checks,escape,constraints},null,2));console.log(`${checks.length} interaction/layout groups passed; ${escape.length} before/after Escape reproductions and ${constraints.length} compounded stress constraints recorded`);
}main().catch(e=>{console.error(e);process.exitCode=1;});

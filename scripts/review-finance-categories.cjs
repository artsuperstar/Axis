/** RNWeb layout/interaction evidence. Native keyboard/Alerts/accessibility remain device gates. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const output=path.resolve('docs/previews/finance-categories-v2');fs.mkdirSync(output,{recursive:true});
async function main(){
 const browser=await chromium.launch({executablePath:process.env.AXIS_CHROMIUM_PATH||'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',headless:true});const checks=[];
 const cases=[];
 for(const width of [320,390,430])for(const theme of ['dark','light'])for(const scale of [1,2])cases.push({name:`builtin-${width}-${theme}-${scale}`,width,theme,scale,scenario:'normal'});
 for(const theme of ['dark','light'])for(const state of ['income','empty','custom','archive-menu','archived','invalid','duplicate','success','long','large','keyboard','parent'])cases.push({name:`${state}-390-${theme}`,width:390,theme,scale:state==='long'?2:1,scenario:['custom','archive-menu'].includes(state)?'custom':state==='archived'?'archived':state==='long'?'long':state==='large'?'large':'normal',state});
 try{for(const c of cases){
  const page=await browser.newPage({viewport:{width:c.width,height:c.scale===2?1500:1000},colorScheme:c.theme,locale:'pt-BR',timezoneId:'America/Sao_Paulo'});const errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   const params=new URLSearchParams({scenario:c.scenario});if(c.scale===2)params.set('large','');if(c.state==='keyboard')params.set('keyboard','');if(c.state==='parent')params.set('parent','');
   await page.goto(`${pathToFileURL(path.resolve('dist/finance-categories-v2-preview/index.html')).href}?${params}`);await page.getByRole('textbox',{name:c.state==='parent'?'Description, required':'Category name, required',exact:true}).waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(100);
   const select=(label,value)=>page.getByRole('radio',{name:`${label}: ${value}`,exact:true}).click();const input=page.getByRole('textbox',{name:'Category name, required',exact:true});
   if(c.state==='income')await select('Type *','Income');
   if(['empty','custom','archive-menu','archived','long','large'].includes(c.state))await select('Category origin','Custom');
   if(c.state==='archived')await select('Custom category status','Archived');
   if(c.state==='invalid'){await input.fill('   ');await input.press('Enter');await page.getByText('Enter a category name.',{exact:true}).waitFor();}
   if(c.state==='duplicate'){await input.fill(' FOOD ');await page.getByRole('button',{name:'Create category',exact:true}).click();await page.getByText('A category with this name already exists for this type.',{exact:true}).waitFor();assert.equal(await input.inputValue(),' FOOD ');}
   if(c.state==='success'){await input.fill('  Travel  ');await page.getByRole('button',{name:'Create category',exact:true}).click();await page.getByText('Created “Travel”.',{exact:true}).waitFor();assert.equal(await input.inputValue(),'');}
   if(c.state==='keyboard'){await input.fill('Keyboard draft');await input.focus();assert.equal(await input.evaluate(e=>document.activeElement===e),true);}
   if(c.state==='archive-menu'){await page.getByRole('button',{name:'Category options for Travel',exact:true}).click();await page.getByRole('button',{name:'Archive Travel category',exact:true}).waitFor();}
   if(c.state==='parent'){
    await page.getByRole('textbox',{name:'Description, required',exact:true}).fill('Parent transaction draft');await page.getByRole('textbox',{name:'Amount in reais, required',exact:true}).fill('25,90');
    await page.getByRole('combobox',{name:'Category',exact:true}).click();await page.getByRole('button',{name:'Create new expense category',exact:true}).click();
    await page.getByRole('textbox',{name:'New expense category name, required',exact:true}).fill('Nested category');await page.getByRole('button',{name:'Create expense category',exact:true}).click();
    assert.equal(await page.getByRole('textbox',{name:'Description, required',exact:true}).inputValue(),'Parent transaction draft');assert.equal(await page.getByRole('textbox',{name:'Amount in reais, required',exact:true}).inputValue(),'25,90');
   }
   const geometry=await page.evaluate(()=>{
    const rows=[...document.querySelectorAll('[data-testid^="finance-category-"]')].filter(e=>!['finance-category-list','finance-category-create','finance-category-library','finance-category-feedback','finance-category-name'].includes(e.dataset.testid));const overflow=[];
    for(const row of rows){const b=row.getBoundingClientRect();for(const e of row.querySelectorAll('[dir="auto"]')){const range=document.createRange();range.selectNodeContents(e);for(const r of range.getClientRects())if(r.left<b.left-.5||r.right>b.right+.5)overflow.push(e.textContent);}}
    return {overflow:[...new Set(overflow)],horizontalOverflow:document.documentElement.scrollWidth>innerWidth,rendered:rows.length,menus:rows.filter(e=>e.querySelector('button')).length};
   });
   if(c.name.startsWith('builtin-')||c.state==='income'||c.state==='archived')assert.equal(geometry.menus,0);
   if(c.state==='large'){assert.ok(geometry.rendered<227,`Virtualized fixture eagerly mounted ${geometry.rendered}`);checks.push({case:`${c.name}-virtualization`,fixture:227,mounted:geometry.rendered,errors:[]});}
   await page.screenshot({path:path.join(output,c.name+'.png'),fullPage:true});
   if(c.state==='long'){const row=page.getByText('VeryLongUnbrokenCategoryName'.repeat(4),{exact:true});await row.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,c.name+'-row.png'),fullPage:true});}
   checks.push({case:c.name,...geometry,errors});
  }finally{await page.close();}
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(checks,null,2));const failures=checks.filter(c=>c.errors.length||c.horizontalOverflow||c.overflow?.length);console.log(JSON.stringify({captures:cases.length,checks:checks.length,failures},null,2));assert.equal(failures.length,0);
}
main().catch(error=>{console.error(error);process.exitCode=1});

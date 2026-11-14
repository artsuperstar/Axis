/** Focused paired captures and geometry of actual shared editor components. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const phase = process.argv[2]; assert.ok(['before', 'after'].includes(phase));
const output = 'docs/design-system/task-edit-v2-migration'; fs.mkdirSync(output+'/'+phase,{recursive:true});
const cases = [['new',390],['edit',390],['edit-bottom',390],['recurring',390],['empty',320],['long',430],['invalid',390],['calendar',390],['picker',390],['selector',390],['recurrence',320],['large',320],['actions',390]];
async function prepare(page, kind) {
  if(kind==='invalid'){await page.getByRole('textbox',{name:'Title, required',exact:true}).fill('');await page.getByRole('button',{name:'Save',exact:true}).click();}
  if(kind==='picker'){await page.getByRole('combobox',{name:'Date',exact:true}).click();await page.getByLabel('Native picker boundary').waitFor();}
  if(kind==='selector'){await page.getByRole('combobox',{name:'Category',exact:true}).click();await page.getByRole('dialog',{name:'Category choices',exact:true}).waitFor();}
  if(kind==='recurrence')await page.getByRole('button',{name:'Edit recurrence',exact:true}).click();
  if(kind==='edit-bottom')await page.getByRole('button',{name:'Add recurrence',exact:true}).scrollIntoViewIfNeeded();
}
async function main(){const browser=await chromium.launch({executablePath:process.env.AXIS_CHROMIUM_PATH||'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',headless:true});const rows=[];
try{for(const theme of ['dark','light'])for(const[kind,width]of cases){const page=await browser.newPage({viewport:{width,height:844},colorScheme:theme,reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const scene=kind==='large'?'long':kind==='edit-bottom'?'edit':['invalid','calendar','picker','selector'].includes(kind)?'edit':kind;
await page.goto(pathToFileURL(path.resolve('dist/task-edit-atlas/index.html')).href+'?case='+scene+(kind==='large'?'&large':''));await page.evaluate(()=>document.fonts.ready);await page.getByRole('button',{name:kind==='actions'?'Back':'Save',exact:true}).waitFor();await prepare(page,kind);await page.waitForTimeout(100);
const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,controls:[...document.querySelectorAll('[role="button"],button,input,textarea,[role="heading"]')].map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e),t=e.querySelector('[dir="auto"]'),ts=getComputedStyle(t||e);return{role:e.getAttribute('role')||e.tagName,label:e.getAttribute('aria-label')||e.textContent,x:r.x,y:r.y,width:r.width,height:r.height,border:s.borderColor,background:s.backgroundColor,font:ts.fontFamily,color:ts.color,fontSize:ts.fontSize}})}));
assert.equal(errors.length,0,errors.join('\n'));assert.equal(geometry.overflow,false);
const file=kind+'-'+theme+'-'+width+'.png';await page.screenshot({path:output+'/'+phase+'/'+file,animations:'disabled',caret:'hide'});rows.push({kind,theme,width,file,errors,...geometry,scope:'Actual TaskEditor; production caller appearance; synthetic saved fixture; native picker boundary is a placeholder, not native acceptance.'});await page.close();}}
finally{await browser.close();}fs.writeFileSync(output+'/'+phase+'.json',JSON.stringify(rows,null,2));
if(phase==='after'){const before=JSON.parse(fs.readFileSync(output+'/before.json'));const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');const pairs=rows.map(r=>({file:r.file,identical:hash(output+'/before/'+r.file)===hash(output+'/after/'+r.file),before:before.find(x=>x.file===r.file).controls,after:r.controls}));fs.writeFileSync(output+'/comparison.json',JSON.stringify(pairs,null,2));fs.writeFileSync(output+'/index.html','<!doctype html><meta charset="utf-8"><title>Task Edit migration</title><style>body{font:16px system-ui;background:#eee;color:#222}section{display:inline-block;vertical-align:top;margin:12px}img{width:min(40vw,390px)}h2{font-size:16px}</style><h1>Phase 3D-T.1: actual TaskEditor before / after</h1><p>Browser proxy; native picker and device acceptance remain separate.</p>'+rows.map(r=>'<section><h2>'+r.file+'</h2><img alt="Before '+r.kind+'" src="before/'+r.file+'"><img alt="After '+r.kind+'" src="after/'+r.file+'"></section>').join(''));}
console.log(rows.length+' captures: '+phase);}
main().catch(e=>{console.error(e);process.exitCode=1});

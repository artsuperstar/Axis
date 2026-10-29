const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), { Buffer } = require('node:buffer');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const output = path.resolve('docs/previews/clients-v2'); fs.mkdirSync(output, { recursive: true });
const launch = () => chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true });
const settle = async page => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(220); };
async function reveal(page, locator) { await locator.evaluate(e => e.scrollIntoView({ block: 'center' })); await settle(page); }
function origin(file) {
  const png = fs.readFileSync(file), value = Buffer.from('Origin\0Axis Clients v2 actual route/WorkView/shared components rendered via React Native Web; synthetic SQLite snapshots and recorded creation/archive effects; native/font/router/safe-area/Alert/hook boundaries substituted; CSS doubling is not OS Dynamic Type.');
  const payload = Buffer.concat([Buffer.from('tEXt'), value]); let crc = 0xffffffff;
  for (const byte of payload) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  const size = Buffer.alloc(4), checksum = Buffer.alloc(4); size.writeUInt32BE(value.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  fs.writeFileSync(file, Buffer.concat([png.subarray(0, 33), size, payload, checksum, png.subarray(33)]));
}
async function main() {
  const browser = await launch(), cases = [], checks = [];
  for (const theme of ['dark', 'light']) {
    for (const scenario of ['populated', 'empty', 'activeOnly', 'archivedOnly', 'accents', 'archivedDebt', 'stress', 'many']) cases.push({ name: `${scenario}-${theme}`, scenario, theme, width: 390, scale: 1 });
    for (const width of [320,390,430]) for (const scale of [1,2]) if(width!==390||scale!==1) cases.push({name:`stress-${theme}-${width}-${scale}`,scenario:'stress',theme,width,scale});
    for (const action of ['collapsed','matches','noMatch','accentSearch','form','required','duplicate','distinct','success','menu','archiveConfirmation']) cases.push({name:`${action}-${theme}`,scenario:'populated',theme,width:390,scale:1,action});
    cases.push({name:`form-${theme}-320-2`,scenario:'populated',theme,width:320,scale:2,action:'duplicate'});
  }
  try {
    for (const c of cases) {
      const page = await browser.newPage({viewport:{width:c.width,height:844},colorScheme:c.theme,reducedMotion:'reduce',locale:'pt-BR'}), errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      try {
        await page.goto(pathToFileURL(path.resolve('dist/clients-v2-preview/index.html')).href+`?scenario=${c.scenario}${c.scale===2?'&large':''}`); await page.getByTestId('work-clients-list').waitFor(); await settle(page);
        assert.equal(await page.getByRole('textbox',{name:'Name *',exact:true}).count(),0);
        assert.equal(await page.getByRole('button',{name:'New client',exact:true}).count(),1);
        assert.equal(await page.getByRole('button',{name:'Name A–Z',exact:true}).count(),0);
        const query=page.getByRole('textbox',{name:'Search clients',exact:true});
        if(c.action==='collapsed') await page.getByTestId('archived-clients-disclosure').click();
        if(['matches','noMatch','accentSearch'].includes(c.action)) await query.fill(c.action==='noMatch'?'Absent':c.action==='accentSearch'?'Álvaro':'Alvaro');
        if(['form','required','duplicate','distinct','success'].includes(c.action)) {
          await page.getByRole('button',{name:'New client',exact:true}).click();
          if(c.action!=='form') { await page.getByRole('textbox',{name:'Name *',exact:true}).fill(c.action==='required'?'':c.action==='duplicate'?'  ALVARO  ':c.action==='distinct'?'A\u0301lvaro':'New client'); await page.getByRole('button',{name:'Create client',exact:true}).click(); }
          if(['required','duplicate'].includes(c.action)) { await page.getByRole('alert').waitFor(); await reveal(page,page.getByRole('alert')); }
          if(['success','distinct'].includes(c.action)) assert.equal(await page.getByRole('textbox',{name:'Name *',exact:true}).count(),0);
        }
        if(['menu','archiveConfirmation'].includes(c.action)) { await page.getByRole('button',{name:'Client options for Ajakrn',exact:true}).click(); if(c.action==='archiveConfirmation') { await page.getByRole('button',{name:'Archive Ajakrn',exact:true}).click(); await page.getByRole('alertdialog').waitFor(); } }
        const captures=[];
        async function capture(suffix) {
          await settle(page);
          const invalid = await page.evaluate(()=>{
            const bad=[]; for(const e of document.querySelectorAll('[data-testid="work-client-card"],[data-testid="new-client-entry"],[data-testid="editor-section-new-client"]')){
              const b=e.getBoundingClientRect(); if(b.bottom<0||b.top>innerHeight)continue;
              for(const n of e.querySelectorAll('*')){const r=n.getBoundingClientRect();if(r.left<b.left-1||r.right>b.right+1)bad.push(n.textContent);}
            } return [...new Set(bad)];
          });
          assert.deepEqual(invalid,[],c.name); assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
          for(const g of await page.getByTestId('client-money-group').all()) assert.ok(await g.evaluate(e=>{const r=document.createRange();r.selectNodeContents(e);return new Set([...r.getClientRects()].map(x=>x.top)).size<=1;}));
          const file=`${c.name}-${suffix}.png`;await page.screenshot({path:path.join(output,file)});origin(path.join(output,file));captures.push(file);
        }
        let mounted;
        if(c.action) await capture('action');
        else {
          await capture('top'); if(c.scenario==='many') {mounted=await page.getByTestId('work-client-card').count();assert.ok(mounted<180);}
          if(c.scenario!=='many'){await reveal(page,page.getByTestId('archived-clients-disclosure'));await capture('archived');}
          if(c.scenario==='many') {await page.mouse.move(c.width/2,500);for(let i=0;i<35;i++){await page.mouse.wheel(0,850);await page.waitForTimeout(200);}const last=page.getByRole('button',{name:'Open Client 176 details',exact:true});await last.waitFor();await reveal(page,last);assert.ok((await last.boundingBox()).y+(await last.boundingBox()).height<=844);await capture('bottom');}
        }
        assert.deepEqual(errors,[]); checks.push({...c,mounted,captures,errors});
      } catch(e){console.error(c.name,errors);throw e;} finally {await page.close();}
    }
    fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(checks,null,2));console.log(`${checks.length} cases / ${checks.reduce((n,c)=>n+c.captures.length,0)} captures`);
  } finally {await browser.close();}
}
async function galleries(){const b=await launch();try{const originals=fs.readdirSync(output).filter(n=>n.endsWith('.png')&&!n.startsWith('contact-'));for(let i=0;i<originals.length;i+=8){const p=await b.newPage({viewport:{width:1200,height:1340}});await p.setContent('<style>body{margin:0;background:#ddd;display:grid;grid-template-columns:repeat(4,300px)}figure{margin:0;padding:4px;height:670px;box-sizing:border-box}figcaption{font:11px sans-serif;height:22px}img{display:block;max-width:290px;height:630px;object-fit:contain;object-position:left top}</style>'+originals.slice(i,i+8).map(n=>'<figure><figcaption>'+n+'</figcaption><img src="data:image/png;base64,'+fs.readFileSync(path.join(output,n)).toString('base64')+'"></figure>').join(''));const file=path.join(output,`contact-${i/8+1}.png`);await p.screenshot({path:file});origin(file);await p.close();}}finally{await b.close();}}
main().then(galleries).catch(e=>{console.error(e);process.exitCode=1;});

/** Phase 3B-I palette cutover evidence. Reuses source builders; preserves all prior review evidence. */
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const output = path.resolve('docs/design-system/shared-controls-inputs');
const scratch = path.resolve('dist/shared-controls-inputs');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const builders = [ ['finance-transactions','transactions-v22-preview'], ['shared-controls-inputs','shared-controls-atlas'], ['transaction-editor-v2','transaction-editor-v2-preview'], ['work-editor-v2','work-editor-v2-preview'], ['work-payment-v2','work-payment-v2-preview'], ['commitment-payment-v2','commitment-payment-v2-preview'], ['commitment-editor-v2','commitment-editor-v2-preview'] ];
const cases=[];
function add(id,dir,query='',widths=[390],action){for(const width of widths)for(const theme of ['dark','light'])cases.push({id,dir,file:'index.html',query,width,theme,action});}
add('inputs-focus','shared-controls-atlas','case=inputs',[390],'focus');
add('inputs-invalid-focus','shared-controls-atlas','case=inputs',[390],'invalid-focus');
add('readonly-disabled','shared-controls-atlas','case=readonly');
add('selections','shared-controls-atlas','case=selections');
add('select-closed','shared-controls-atlas','case=select');
add('select-open','shared-controls-atlas','case=select',[390],'select-open');
add('select-inline','shared-controls-atlas','case=select',[390],'inline');
add('autocomplete-empty','shared-controls-atlas','case=autocomplete',[390],'autocomplete');
add('autocomplete-no-matches','shared-controls-atlas','case=autocomplete',[390],'no-matches');
add('buttons','shared-controls-atlas','case=buttons');
add('buttons-pressed','shared-controls-atlas','case=buttons',[390],'pressed');
add('inputs-edges','shared-controls-atlas','case=inputs',[320,430],'invalid-focus');
add('selections-large','shared-controls-atlas','case=selections&large',[320,430]);
for(const kind of ['task-new','task-edit','fitness','calendar-task'])add(kind,'shared-controls-atlas','case='+kind);
add('transaction-new','transaction-editor-v2-preview','scenario=new');add('transaction-edit','transaction-editor-v2-preview','scenario=edit');
add('work-new','work-editor-v2-preview','scenario=new');add('work-edit','work-editor-v2-preview','scenario=editHourly');
add('record-payment','work-payment-v2-preview','scenario=normal');add('confirm-payment','commitment-payment-v2-preview');add('commitment-editor','commitment-editor-v2-preview','scenario=new-bill');
async function capture(phase, rebuild = true) {
  assert.ok(['before', 'after'].includes(phase)); fs.mkdirSync(path.join(output, phase), { recursive: true });
  // Reuse baseline JSON in esbuild for exact fixture identity, including same-date UUID ordering.
  const preload = path.join(scratch, 'baseline-fixtures.cjs');
  if (phase === 'after') fs.writeFileSync(preload, `const Module=require('node:module'),fs=require('node:fs'),path=require('node:path');const original=Module._load;Module._load=function(request,parent,isMain){const actual=original.apply(this,arguments);if(request!=='esbuild')return actual;return {...actual,build(options){return actual.build({...options,plugins:[{name:'frozen-baseline-json',setup(builder){builder.onLoad({filter:/[.]json$/},args=>{const rel=path.relative(path.resolve('dist'),args.path);const file=path.join(path.resolve('dist/shared-controls-inputs/before'),rel);if(!rel.startsWith('..')&&fs.existsSync(file))return {contents:fs.readFileSync(file,'utf8'),loader:'json'};});}},...(options.plugins||[])]});}};};`);
  if (rebuild) for (const [builder, dir, option] of builders) {
    const args = [...(phase === 'after' ? ['--require', preload] : []), '--import', 'tsx', `scripts/preview-${builder}.ts`, ...(option ? [option] : [])];
    const result = cp.spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true, env: { ...process.env, TZ: 'America/Sao_Paulo' } });
    fs.writeFileSync(path.join(scratch, `${phase}-build-${builder}.log`), `${result.stdout ?? ''}${result.stderr ?? ''}`);
    assert.equal(result.status, 0, `${builder} failed: ${result.stderr}`);
    if (phase === 'after') for (const file of fs.readdirSync(path.resolve('dist', dir)).filter(file => file.endsWith('.json'))) { const baseline=path.join(scratch,'before',dir,file); if(fs.existsSync(baseline)) fs.copyFileSync(baseline,path.resolve('dist',dir,file)); }
    // Freeze built output separately so the after build never invalidates before provenance.
    fs.cpSync(path.resolve('dist', dir), path.join(scratch, phase, dir), { recursive: true }); console.log(`${phase}: ${builder} built`);
  }
  const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
  const browser = await chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true });
  const manifest = [];
  try {
    for (const c of cases) {
      const page = await browser.newPage({ viewport: { width: c.width, height: 844 }, colorScheme: c.theme, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      const entry = path.join(scratch, phase, c.dir, c.file), bundle = path.join(path.dirname(entry), 'app.js');
      await page.goto(pathToFileURL(entry).href + (c.query ? '?' + c.query : '')); await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: '*{caret-color:transparent!important;animation:none!important;transition:none!important}' }); await page.waitForTimeout(220);
      if(c.action==='focus'||c.action==='invalid-focus')await page.getByRole('textbox',{name:c.action==='focus'?'Focused input':'Invalid input',exact:true}).focus();
      if(c.action==='select-open'||c.action==='inline'){await page.getByRole('combobox',{name:'Category',exact:true}).click();await page.getByRole('radio',{name:'Personal',exact:true}).waitFor();if(c.action==='inline'){await page.getByRole('button',{name:'Create category',exact:true}).click();await page.getByRole('textbox',{name:'New category name, required',exact:true}).fill('Community');}}
      if(c.action==='autocomplete'||c.action==='no-matches'){await page.getByRole('combobox',{name:'Client',exact:true}).click();const input=page.getByRole('combobox',{name:'Search client',exact:true});await input.waitFor();if(c.action==='no-matches')await input.fill('No match');}
      if(c.action==='pressed'){await page.getByRole('button',{name:'Primary action',exact:true}).hover();await page.mouse.down();}
      await page.waitForTimeout(120);
      assert.deepEqual(errors, [], `${c.id} runtime errors`); assert.ok((await page.locator('body').innerText()).trim().length > 8, `${c.id} blank`);
      const file = `${c.id}-${c.theme}-${c.width}.png`; await page.screenshot({ path: path.join(output, phase, file) });
      const controls = await page.locator('input,textarea,[role=combobox],[role=radio],[role=checkbox],[role=button]').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect(),style=getComputedStyle(node);return {role:node.getAttribute('role')||node.tagName,label:node.getAttribute('aria-label')||node.textContent,x:r.x,y:r.y,width:r.width,height:r.height,border:style.borderWidth,borderColor:style.borderColor,radius:style.borderRadius,outline:style.outlineWidth,outlineColor:style.outlineColor,color:style.color,background:style.backgroundColor,fontSize:style.fontSize};}));
      const fixture = path.join(path.dirname(entry),'fixture.json');
      const geometry = await page.locator('[role=button],[role=heading],input,textarea').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {role:node.getAttribute('role')||node.tagName,label:node.getAttribute('aria-label')||node.textContent,x:r.x,y:r.y,width:r.width,height:r.height};}));
      manifest.push({ ...c, geometry, controls, ...(fs.existsSync(fixture) ? {fixtureHash:hash(fixture)} : {}), file, entry, entryHash: hash(entry), ...(fs.existsSync(bundle) ? { bundleHash: hash(bundle) } : {}), errors,
        scope: 'Current source RNWeb preview, synthetic fixtures/native boundaries; no native tabs/hardware acceptance. Animation/caret suppression identical before/after.' });
      await page.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(output, `${phase}.json`), JSON.stringify(manifest, null, 2)); console.log(`${phase}: ${manifest.length} source captures`);
}
async function compare() {
  const before = JSON.parse(fs.readFileSync(path.join(output, 'before.json'), 'utf8')), after = JSON.parse(fs.readFileSync(path.join(output, 'after.json'), 'utf8'));
  assert.equal(before.length, cases.length); assert.equal(after.length, cases.length);
  const results = [];
  for (const row of before) {
    const next = after.find(c => c.file === row.file); assert.ok(next);
    const a = hash(path.join(output, 'before', row.file)), b = hash(path.join(output, 'after', row.file));
    results.push({ file: row.file, before: a, after: b, identical: a === b, geometryIdentical: JSON.stringify(row.geometry) === JSON.stringify(next.geometry) });
  }
  fs.writeFileSync(path.join(output, 'visual-comparison.json'), JSON.stringify({ cases: results.length, identical: results.filter(r => r.identical).length, results }, null, 2));
  const figures = results.map((r,index) => `<section><details ${index===2||index===3?'open':''}><summary>${r.file} - ${r.identical ? 'unchanged' : 'review correction'}</summary><p>Before (left) / after (right). ${r.geometryIdentical?'Measured geometry unchanged.':'Measured geometry recorded in audit.json.'}</p><div style="display:flex;gap:16px;flex-wrap:wrap"><a href="before/${r.file}"><img loading="lazy" src="before/${r.file}" alt="Before ${r.file}"></a><a href="after/${r.file}"><img loading="lazy" src="after/${r.file}" alt="After ${r.file}"></a></div></details></section>`).join('');
  fs.writeFileSync(path.join(output, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Axis shared controls and inputs</title><style>body{font:16px system-ui;margin:24px;background:#f5f0ea;color:#241e1c}section{margin:24px 0}section>div{display:flex;gap:16px;flex-wrap:wrap}img{max-width:100%;width:390px}h2{font-size:18px}a{color:#68344e}</style><h1>Phase 3B-I — before / after</h1><p>${results.filter(r => r.identical).length}/${results.length} unchanged PNGs. Control boundaries, state and target corrections; inspect the intended differences. Current source, identical synthetic fixtures and browser/native substitutes. Browser evidence is not native acceptance.</p><p><a href="../shared-controls-inputs-report.md">Implementation report</a> · <a href="visual-comparison.json">Exact comparisons</a></p>${figures}</html>`);
  console.log(`${results.filter(r => r.identical).length}/${results.length} unchanged PNG captures`);
  console.log(`${results.filter(r=>r.geometryIdentical).length}/${results.length} identical measured geometry cases`);
  // Necessary control geometry corrections are reported, not silently rejected as drift.

}
if (process.argv[2] === 'before' || process.argv[2] === 'after') capture(process.argv[2]).catch(e => { console.error(e); process.exitCode = 1; });
if (process.argv[2] === 'compare') compare().catch(e => { console.error(e); process.exitCode = 1; });

if (process.argv[2] === 'recapture-before' || process.argv[2] === 'recapture-after') capture(process.argv[2].replace('recapture-', ''), false).catch(e => { console.error(e); process.exitCode = 1; });

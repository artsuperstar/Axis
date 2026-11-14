/** Phase 3A.1 equivalence evidence. Reuses source builders; preserves all prior review evidence. */
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const output = path.resolve('docs/design-system/theme-readiness');
const scratch = path.resolve('dist/theme-readiness');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const builders = [
  ['home-v2', 'home-v2-preview'], ['tasks-fidelity', 'tasks-fidelity-after'], ['calendar', 'calendar-review'],
  ['finance-charts', 'finance-overview-v2-review', '--stage2'], ['finance-transactions', 'transactions-v22-preview'],
  ['transaction-editor-v2', 'transaction-editor-v2-preview'], ['workout', 'workout-review'], ['journal', 'journal-review'],
];
const cases = [];
function add(id, dir, file = 'index.html', query = '', widths = [390], action) {
  for (const width of widths) for (const theme of ['dark', 'light']) cases.push({ id, dir, file: file.replace('{theme}', theme).replace('{width}', width), query, width, theme, action });
}
add('home', 'home-v2-preview');
add('tasks', 'tasks-fidelity-after', 'tasks-{theme}-{width}-normal.html', '', [320, 390]);
add('calendar', 'calendar-review');
add('finance-overview', 'finance-overview-v2-review', 'index.html', '', [320, 390, 430]);
add('finance-selected', 'finance-overview-v2-review', 'index.html', '', [390], 'select-bucket');
add('finance-spending', 'finance-overview-v2-review', 'index.html', '', [390], 'spending');
add('finance-form', 'transaction-editor-v2-preview');
add('fitness', 'workout-review', 'landing-{theme}-{width}.html');
add('journal', 'journal-review', 'index.html', 'selected');
async function capture(phase) {
  assert.ok(['before', 'after'].includes(phase)); fs.mkdirSync(path.join(output, phase), { recursive: true });
  for (const [builder, dir, option] of builders) {
    const args = ['--import', 'tsx', `scripts/preview-${builder}.ts`, ...(option ? [option] : [])];
    const result = cp.spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true, env: { ...process.env, TZ: 'America/Sao_Paulo' } });
    fs.writeFileSync(path.join(scratch, `${phase}-build-${builder}.log`), `${result.stdout ?? ''}${result.stderr ?? ''}`);
    assert.equal(result.status, 0, `${builder} failed: ${result.stderr}`);
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
      if (c.action === 'select-bucket') { await page.locator('[data-testid^="cash-flow-bucket-"]').nth(1).click(); await page.waitForTimeout(80); }
      if (c.action === 'spending') { await page.getByRole('heading', { name: 'Spending', exact: true }).scrollIntoViewIfNeeded(); await page.waitForTimeout(80); }
      assert.deepEqual(errors, [], `${c.id} runtime errors`); assert.ok((await page.locator('body').innerText()).trim().length > 8, `${c.id} blank`);
      const file = `${c.id}-${c.theme}-${c.width}.png`; await page.screenshot({ path: path.join(output, phase, file) });
      manifest.push({ ...c, file, entry, entryHash: hash(entry), ...(fs.existsSync(bundle) ? { bundleHash: hash(bundle) } : {}), errors,
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
    results.push({ file: row.file, before: a, after: b, identical: a === b });
  }
  fs.writeFileSync(path.join(output, 'visual-equivalence.json'), JSON.stringify({ cases: results.length, identical: results.filter(r => r.identical).length, results }, null, 2));
  const figures = results.map(r => `<section><h2>${r.file}</h2><p>${r.identical ? 'Byte-identical PNG' : 'Difference requires investigation'}</p><div><a href="before/${r.file}"><img loading="lazy" src="before/${r.file}" alt="Before ${r.file}"></a><a href="after/${r.file}"><img loading="lazy" src="after/${r.file}" alt="After ${r.file}"></a></div></section>`).join('');
  fs.writeFileSync(path.join(output, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Axis theme readiness equivalence</title><style>body{font:16px system-ui;margin:24px;background:#f5f0ea;color:#241e1c}section{margin:24px 0}section>div{display:flex;gap:16px;flex-wrap:wrap}img{max-width:100%;width:390px}h2{font-size:18px}a{color:#68344e}</style><h1>Phase 3A.1 — before / after</h1><p>${results.filter(r => r.identical).length}/${results.length} byte-identical PNGs. Current source, identical synthetic fixtures and browser/native substitutes. Browser evidence is not native acceptance.</p><p><a href="../theme-readiness-report.md">Implementation report</a> · <a href="visual-equivalence.json">Exact comparisons</a></p>${figures}</html>`);
  console.log(`${results.filter(r => r.identical).length}/${results.length} identical PNG captures`);
  if (results.some(r => !r.identical)) process.exitCode = 1;
}
if (process.argv[2] === 'before' || process.argv[2] === 'after') capture(process.argv[2]).catch(e => { console.error(e); process.exitCode = 1; });
if (process.argv[2] === 'compare') compare().catch(e => { console.error(e); process.exitCode = 1; });

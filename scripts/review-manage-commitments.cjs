const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const phase = process.argv[2], folder = 'docs/design-system/manage-commitments-v2';
assert.ok(['before', 'after'].includes(phase)); fs.mkdirSync(folder + '/' + phase, { recursive: true });
const cases = [['manage', 390], ['menu', 390], ['guidance', 390], ['long', 320], ['empty', 390], ['error', 390], ['overview', 390], ['editor', 390], ['payment', 390], ['history', 390], ['linked', 390], ['other', 390]];
const managed = ['manage', 'menu', 'guidance', 'long', 'empty', 'error'];
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true }), rows = [];
  try {
    for (const theme of ['dark', 'light']) for (const [kind, width] of cases) {
      const page = await browser.newPage({ viewport: { width, height: 844 }, colorScheme: theme, reducedMotion: 'reduce' }), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(pathToFileURL(path.resolve('dist/manage-commitments-atlas/index.html')).href + '?case=' + kind + (kind === 'long' ? '&large' : ''));
      await page.evaluate(() => document.fonts.ready);
      if (managed.includes(kind)) { await page.getByRole('button', { name: 'Commitment options', exact: true }).click(); await page.getByRole('button', { name: 'Manage commitments', exact: true }).click(); }
      if (kind === 'menu') await page.getByRole('button', { name: 'Series options for Active bill', exact: true }).click();
      if (kind === 'guidance') await page.getByText('All installments already have due dates. Resolve the unpaid occurrences.', { exact: true }).scrollIntoViewIfNeeded();
      if (kind === 'error') await page.getByRole('button', { name: 'Manage Active bill', exact: true }).click();
      await page.waitForTimeout(120); assert.equal(errors.length, 0, errors.join('\n'));
      const data = await page.evaluate(() => ({ text: document.body.innerText, overflow: document.documentElement.scrollWidth > innerWidth, controls: [...document.querySelectorAll('[role="button"],[role="heading"]')].map(e => { const r = e.getBoundingClientRect(), t = e.querySelector('[dir="auto"]'), s = getComputedStyle(t || e); return { label: e.getAttribute('aria-label') || e.textContent, x: r.x, y: r.y, width: r.width, height: r.height, font: s.fontFamily, fontSize: s.fontSize, color: s.color }; }) }));
      assert.equal(data.overflow, false); const file = `${kind}-${theme}-${width}.png`;
      await page.screenshot({ path: folder + '/' + phase + '/' + file, animations: 'disabled', caret: 'hide' });
      rows.push({ kind, theme, width, file, errors, fixtureSha256: crypto.createHash('sha256').update(fs.readFileSync(folder + '/fixture.json')).digest('hex'), ...data }); await page.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(folder + '/' + phase + '.json', JSON.stringify(rows, null, 2));
  if (phase === 'after') {
    const before = JSON.parse(fs.readFileSync(folder + '/before.json')), hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    fs.writeFileSync(folder + '/comparison.json', JSON.stringify(rows.map(r => { const b = before.find(x => x.file === r.file); assert.equal(b.fixtureSha256, r.fixtureSha256); return { file: r.file, identical: hash(folder + '/before/' + r.file) === hash(folder + '/after/' + r.file), contentIdentical: r.text === b.text, fixtureIdentical: true, before: b.controls, after: r.controls }; }), null, 2));
    fs.writeFileSync(folder + '/index.html', '<!doctype html><meta charset="utf-8"><title>Manage Commitments v2</title><style>body{font:16px system-ui;background:#eee;color:#222}section{display:inline-block;vertical-align:top;margin:10px}img{width:min(40vw,390px)}h2{font-size:16px}</style><h1>Manage Commitments: before / after</h1><p>Actual components, frozen SQLite records. Browser menu/confirmation adapters do not establish native acceptance.</p>' + rows.map(r => '<section><h2>' + r.file + '</h2><img alt="Before ' + r.kind + '" src="before/' + r.file + '"><img alt="After ' + r.kind + '" src="after/' + r.file + '"></section>').join(''));
  }
  console.log(rows.length + ' captures: ' + phase);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

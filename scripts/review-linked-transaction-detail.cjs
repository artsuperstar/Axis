const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const phase = process.argv[2], folder = 'docs/design-system/linked-transaction-detail-v2';
assert.ok(['before', 'after'].includes(phase)); fs.mkdirSync(folder + '/' + phase, { recursive: true });
const cases = [['work', 390], ['commitment', 390], ['multi', 390], ['long', 320], ['large', 430], ['refresh', 390], ['manual', 390], ['editor', 390], ['work-source', 390], ['commitment-source', 390]];
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true }), rows = [];
  try {
    for (const theme of ['dark', 'light']) for (const [kind, width] of cases) {
      const page = await browser.newPage({ viewport: { width, height: 844 }, colorScheme: theme, reducedMotion: 'reduce' }), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(pathToFileURL(path.resolve('dist/linked-transaction-detail-atlas/index.html')).href + '?case=' + kind + (kind === 'long' ? '&large' : ''));
      await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(120);
      assert.equal(errors.length, 0, errors.join('\n'));
      const data = await page.evaluate(() => ({ text: document.body.innerText, overflow: document.documentElement.scrollWidth > innerWidth, controls: [...document.querySelectorAll('[role="button"],button,[role="heading"]')].map(e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e), t = e.querySelector('[dir="auto"]'), ts = getComputedStyle(t || e); return { label: e.getAttribute('aria-label') || e.textContent, x: r.x, y: r.y, width: r.width, height: r.height, font: ts.fontFamily, fontSize: ts.fontSize, color: ts.color, background: s.backgroundColor }; }) }));
      assert.equal(data.overflow, false); const file = `${kind}-${theme}-${width}.png`;
      await page.screenshot({ path: folder + '/' + phase + '/' + file, animations: 'disabled', caret: 'hide' });
      const sheet = await page.evaluate(() => { const e = [...document.querySelectorAll('div')].find(e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return s.borderTopWidth === '1px' && s.backgroundColor !== 'rgba(0, 0, 0, 0)' && Math.abs(r.width - innerWidth) < 1 && r.height > 100; }); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, background: getComputedStyle(e).backgroundColor }; });
      rows.push({ kind, theme, width, file, errors, fixtureSha256: crypto.createHash('sha256').update(fs.readFileSync(folder + '/fixture.json')).digest('hex'), sheet, ...data }); await page.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(folder + '/' + phase + '.json', JSON.stringify(rows, null, 2));
  if (phase === 'after') {
    const before = JSON.parse(fs.readFileSync(folder + '/before.json')), hash = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
    fs.writeFileSync(folder + '/comparison.json', JSON.stringify(rows.map(r => { const b = before.find(x => x.file === r.file); assert.equal(b.fixtureSha256, r.fixtureSha256); return { file: r.file, identical: hash(folder + '/before/' + r.file) === hash(folder + '/after/' + r.file), contentIdentical: r.text === b.text, contentIgnoringReplacedBackGlyphIdentical: r.text.replace(/\s+/g, ' ').trim() === b.text.replace(/←/g, '').replace(/\s+/g, ' ').trim(), fixtureIdentical: b.fixtureSha256 === r.fixtureSha256, sheetBefore: b.sheet, sheetAfter: r.sheet, before: b.controls, after: r.controls }; }), null, 2));
    fs.writeFileSync(folder + '/index.html', '<!doctype html><meta charset="utf-8"><title>Linked detail v2</title><style>body{font:16px system-ui;background:#eee;color:#222}section{display:inline-block;vertical-align:top;margin:10px}img{width:min(40vw,390px)}h2{font-size:16px}</style><h1>Linked Transaction Details: before / after</h1><p>Actual components and SQLite source records; native behavior requires device acceptance.</p>' + rows.map(r => '<section><h2>' + r.file + '</h2><img alt="Before ' + r.kind + '" src="before/' + r.file + '"><img alt="After ' + r.kind + '" src="after/' + r.file + '"></section>').join(''));
  }
  console.log(rows.length + ' captures: ' + phase);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

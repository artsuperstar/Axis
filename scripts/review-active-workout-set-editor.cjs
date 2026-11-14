const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const phase = process.argv[2], folder = 'docs/design-system/active-workout-set-editor-v2';
assert.ok(['before', 'after'].includes(phase)); fs.mkdirSync(folder + '/' + phase, { recursive: true });
const cases = [['strength', 390], ['bodyweight', 390], ['duration', 390], ['distance', 390], ['blank', 390], ['zero', 390], ['invalid', 390], ['keyboard', 320], ['workout', 390], ['header', 390], ['routine', 390], ['exercise', 390], ['history', 390], ['note', 390], ['add', 390]];
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true }), rows = [];
  try {
    for (const theme of ['dark', 'light']) for (const [kind, width] of cases) {
      const page = await browser.newPage({ viewport: { width, height: 844 }, colorScheme: theme, reducedMotion: 'reduce' }), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(pathToFileURL(path.resolve('dist/active-workout-set-editor-atlas/index.html')).href + '?case=' + kind + (kind === 'keyboard' ? '&large&keyboard' : '')); await page.evaluate(() => document.fonts.ready);
      if (kind === 'invalid') { const field = page.getByRole('textbox', { name: 'Weight (kg, optional)', exact: true }); await field.fill('1.2345'); await page.getByRole('button', { name: 'Save', exact: true }).click(); await field.focus(); }
      await page.waitForTimeout(120); assert.equal(errors.length, 0, errors.join('\n'));
      const data = await page.evaluate(() => ({ text: document.body.innerText, overflow: document.documentElement.scrollWidth > innerWidth, fields: [...document.querySelectorAll('input,textarea')].map(e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return { label: e.getAttribute('aria-label'), value: e.value, x: r.x, y: r.y, width: r.width, height: r.height, font: s.fontFamily, fontSize: s.fontSize, border: s.borderColor, background: s.backgroundColor, outline: s.outlineColor, ariaInvalid: e.getAttribute('aria-invalid') }; }), controls: [...document.querySelectorAll('[role="button"],[role="heading"]')].map(e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e.querySelector('[dir="auto"]') || e); return { label: e.getAttribute('aria-label') || e.textContent, x: r.x, y: r.y, width: r.width, height: r.height, font: s.fontFamily, fontSize: s.fontSize, color: s.color }; }) }));
      assert.equal(data.overflow, false); const file = `${kind}-${theme}-${width}.png`;
      await page.screenshot({ path: folder + '/' + phase + '/' + file, animations: 'disabled', caret: 'hide' });
      rows.push({ kind, theme, width, file, errors, fixtureSha256: crypto.createHash('sha256').update(fs.readFileSync(folder + '/fixture.json')).digest('hex'), ...data }); await page.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(folder + '/' + phase + '.json', JSON.stringify(rows, null, 2));
  if (phase === 'after') {
    const before = JSON.parse(fs.readFileSync(folder + '/before.json')), hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    fs.writeFileSync(folder + '/comparison.json', JSON.stringify(rows.map(row => { const b = before.find(x => x.file === row.file); assert.equal(b.fixtureSha256, row.fixtureSha256); return { file: row.file, identical: hash(folder + '/before/' + row.file) === hash(folder + '/after/' + row.file), contentIdentical: b.text === row.text, valuesIdentical: JSON.stringify(b.fields.map(f => [f.label, f.value])) === JSON.stringify(row.fields.map(f => [f.label, f.value])), fixtureIdentical: true, fieldsBefore: b.fields, fieldsAfter: row.fields, controlsBefore: b.controls, controlsAfter: row.controls }; }), null, 2));
    fs.writeFileSync(folder + '/index.html', '<!doctype html><meta charset="utf-8"><title>Active Set Editor v2</title><style>body{font:16px system-ui;background:#eee;color:#222}section{display:inline-block;vertical-align:top;margin:10px}img{width:min(40vw,390px)}h2{font-size:16px}</style><h1>Active Workout Set Editor: before / after</h1><p>Actual components and frozen SQLite data; keyboard/text scaling are browser proxies, not native acceptance.</p>' + rows.map(row => '<section><h2>' + row.file + '</h2><img alt="Before ' + row.kind + '" src="before/' + row.file + '"><img alt="After ' + row.kind + '" src="after/' + row.file + '"></section>').join(''));
  }
  console.log(rows.length + ' captures: ' + phase);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

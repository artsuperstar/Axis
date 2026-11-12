const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), { Buffer } = require('node:buffer');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const output = path.resolve('docs/previews/client-details-v2'); fs.mkdirSync(output, { recursive: true });
const settle = async page => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(220); };
function origin(file) {
  const png = fs.readFileSync(file), value = Buffer.from('Origin\0Axis actual Client Details/WorkView/shared UI rendered via React Native Web. Synthetic SQLite fixtures; native/font/router/safe-area/Alert boundaries substituted. CSS doubled text is not OS Dynamic Type.');
  const payload = Buffer.concat([Buffer.from('tEXt'), value]); let crc = 0xffffffff;
  for (const byte of payload) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  const size = Buffer.alloc(4), checksum = Buffer.alloc(4); size.writeUInt32BE(value.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  fs.writeFileSync(file, Buffer.concat([png.subarray(0, 33), size, payload, checksum, png.subarray(33)]));
}
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true });
  const checks = [], cases = [];
  for (const theme of ['dark', 'light']) {
    for (const scenario of ['populated', 'partial', 'settled', 'empty', 'archived', 'archivedEmpty', 'many', 'stress']) cases.push({ name: `${scenario}-${theme}`, scenario, theme, width: 390, scale: 1 });
    for (const width of [320, 390, 430, 768]) for (const scale of [1, 2]) if (width !== 390 || scale !== 1) cases.push({ name: `stress-${theme}-${width}-${scale}`, scenario: 'stress', theme, width, scale });
    for (const action of ['menu', 'dismiss', 'job', 'payment', 'add', 'history']) cases.push({ name: `${action}-${theme}`, scenario: 'partial', theme, width: 390, scale: 1, action });
    cases.push({ name: `before-${theme}`, scenario: 'populated', theme, width: 390, scale: 1, before: true });
  }
  try {
    for (const c of cases) {
      const page = await browser.newPage({ viewport: { width: c.width, height: 844 }, colorScheme: c.theme, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      try {
        const params = new URLSearchParams({ scenario: c.scenario }); if (c.scale === 2) params.set('large', '');
        await page.goto(pathToFileURL(path.resolve(c.before ? 'dist/client-details-v2-before/index.html' : 'dist/client-details-v2-preview/index.html')).href + '?' + params);
        await settle(page); const name = await page.evaluate(() => window.reviewFixture.client.name);
        await page.getByRole('button', { name: `Open ${name} details`, exact: true }).click();
        await page.getByText('Open jobs', { exact: true }).waitFor(); await settle(page);
        if (!c.before) {
          assert.equal(await page.getByTestId('client-details-name').count(), 1); assert.equal(await page.getByTestId('client-financial-overview').count(), 1);
          assert.equal(await page.locator('[data-testid^="client-detail-metric-"]').count(), 3);
          assert.ok(!/Recent receipts|Payment expected|Payment pending|%/.test(await page.getByTestId('work-client-details-list').textContent()));
          if (c.scenario.startsWith('archived')) assert.equal(await page.getByRole('button', { name: `Add work for ${name}`, exact: true }).count(), 0);
        }
        const captures = [];
        async function capture(suffix) {
          await settle(page);
          const geometry = await page.evaluate(() => {
            const regions = [...document.querySelectorAll('[data-testid="client-financial-overview"],[data-testid="client-detail-actions"],[data-testid="client-open-job"],[data-testid="client-details-name"]')];
            const overflow = [], rects = [];
            for (const region of regions) {
              const b = region.getBoundingClientRect(); if (b.bottom < 0 || b.top > innerHeight) continue;
              rects.push({ id: region.dataset.testid, x: b.x, y: b.y, width: b.width, height: b.height });
              for (const e of region.querySelectorAll('[dir="auto"]')) {
                const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
                for (let t = walker.nextNode(); t; t = walker.nextNode()) { const range = document.createRange(); range.selectNodeContents(t); for (const r of range.getClientRects()) if (r.left < b.left - 1 || r.right > b.right + 1) overflow.push(t.textContent); }
              }
            }
            const list = document.querySelector('[data-testid="work-client-details-list"]');
            return { overflow, rects, list: list ? { height: list.clientHeight, scrollHeight: list.scrollHeight, scrollTop: list.scrollTop } : null };
          });
          assert.deepEqual(geometry.overflow, [], `${c.name}/${suffix} text overflow`);
          const file = path.join(output, `${c.name}-${suffix}.png`); await page.screenshot({ path: file }); origin(file); captures.push({ file: path.basename(file), geometry });
        }
        await capture('top');
        if (!c.before && !c.action) {
          const list = page.getByTestId('work-client-details-list');
          await list.evaluate(e => { e.scrollTop = e.scrollHeight; }); await settle(page);
          await page.getByTestId('client-history-navigation').scrollIntoViewIfNeeded(); await capture('bottom');
          assert.ok(await page.getByTestId('client-history-navigation').evaluate(e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }));
        }
        if (c.action) {
          if (c.action === 'menu') { await page.getByTestId('client-detail-actions').getByRole('button', { name: `Client options for ${name}`, exact: true }).click(); await page.getByRole('button', { name: `Archive ${name}`, exact: true }).waitFor(); }
          if (c.action === 'dismiss') { await page.getByRole('button', { name: 'Back', exact: true }).click(); assert.equal(await page.getByTestId('work-client-details-list').count(), 0); }
          if (c.action === 'job') { await page.getByTestId('client-open-job').first().click(); await page.getByTestId('job-overview').waitFor(); }
          if (c.action === 'payment') { await page.getByRole('button', { name: `Record payment from ${name}`, exact: true }).click(); await page.getByTestId('work-payment-list').waitFor(); assert.equal(await page.getByRole('checkbox').count(), 3); }
          if (c.action === 'add') { await page.getByRole('button', { name: `Add work for ${name}`, exact: true }).click(); await page.getByTestId('editor-section-job').waitFor(); }
          if (c.action === 'history') { await page.getByTestId('client-history-navigation').scrollIntoViewIfNeeded(); await page.getByTestId('client-history-navigation').click(); await page.getByTestId('work-history-content').waitFor(); }
          await capture('action');
        }
        assert.deepEqual(errors, [], c.name); checks.push({ ...c, captures, errors });
        fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify({ checks, scope: 'RNWeb actual UI; native boundaries substituted; not device certification' }, null, 2));
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
  console.log(`${checks.length} cases / ${checks.flatMap(c => c.captures).length} originals passed`);
}
async function galleries() {
  const browser = await chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true });
  try {
    const originals = fs.readdirSync(output).filter(n => n.endsWith('.png') && !n.startsWith('contact-'));
    for (let i = 0; i < originals.length; i += 8) {
      const page = await browser.newPage({ viewport: { width: 1200, height: 1340 } });
      await page.setContent('<style>body{margin:0;background:#ddd;display:grid;grid-template-columns:repeat(4,300px)}figure{margin:0;padding:4px;height:670px;box-sizing:border-box}figcaption{font:11px sans-serif;height:22px}img{display:block;max-width:290px;height:630px;object-fit:contain;object-position:left top}</style>' + originals.slice(i, i + 8).map(n => '<figure><figcaption>' + n + '</figcaption><img src="data:image/png;base64,' + fs.readFileSync(path.join(output, n)).toString('base64') + '"></figure>').join(''));
      const file = path.join(output, `contact-${i / 8 + 1}.png`); await page.screenshot({ path: file, fullPage: true }); origin(file); await page.close();
    }
  } finally { await browser.close(); }
}
(process.argv.includes('--galleries-only') ? galleries() : main().then(galleries)).catch(error => { console.error(error); process.exitCode = 1; });

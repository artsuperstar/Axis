/** Browser support evidence; native keyboard, picker, gestures and OS scaling require installed devices. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { Buffer } = require('node:buffer');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const output = path.resolve('docs/previews/work-payment-v2'); fs.mkdirSync(output, { recursive: true });
function annotate(file) {
  const png = fs.readFileSync(file), origin = Buffer.from('Origin\0Axis Record Payment v2 production React components rendered with React Native Web by scripts/review-work-payment-v2.cjs; synthetic SQLite fixtures from scripts/preview-work-payment-v2.ts. Native picker/keyboard/safe-area/font-loading boundaries substituted; CSS font scaling is supporting evidence only. ' + path.basename(file));
  const payload = Buffer.concat([Buffer.from('tEXt'), origin]); let crc = 0xffffffff;
  for (const byte of payload) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  const length = Buffer.alloc(4), checksum = Buffer.alloc(4); length.writeUInt32BE(origin.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  fs.writeFileSync(file, Buffer.concat([png.subarray(0, 33), length, payload, checksum, png.subarray(33)]));
}
const settle = async page => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(250); };
async function scroll(page, bottom) {
  // Let the asynchronous virtualized window settle before a supporting capture;
  // browser scroll anchoring may adjust the offset as variable-height cells mount.
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.evaluate(bottom => { document.activeElement?.blur(); for (const e of document.querySelectorAll('*')) if (/auto|scroll/.test(getComputedStyle(e).overflowY)) e.scrollTop = bottom ? e.scrollHeight : 0; }, bottom);
    await settle(page);
  }
}
async function reveal(page, locator) { await locator.evaluate(e => e.scrollIntoView({ block: 'center' })); await settle(page); }
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true });
  const cases = [], checks = [];
  for (const theme of ['dark', 'light']) {
    for (const width of [320, 390, 430]) for (const scale of [1, 2]) cases.push({ name: `stress-${theme}-${width}-${scale}`, scenario: 'stress', theme, width, scale, action: 'stress' });
    for (const action of ['empty', 'client', 'selected', 'one-selected', 'mixed', 'multi-partial', 'targeted', 'invalid', 'excessive', 'date', 'category', 'client-change', 'save-error', 'keyboard', 'many']) cases.push({ name: `${action}-${theme}`, theme, width: 390, scale: 1, scenario: action === 'many' ? 'many' : action === 'one-selected' ? 'one' : 'normal', action });
  }
  try {
    for (const c of cases.filter(c => !process.env.AXIS_REVIEW_CASE || c.name === process.env.AXIS_REVIEW_CASE)) {
      const page = await browser.newPage({ viewport: { width: c.width, height: 844 }, colorScheme: c.theme, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      try {
        const params = new URLSearchParams({ scenario: c.scenario }); if (c.scale === 2) params.set('large', ''); if (c.action === 'save-error') params.set('saveError', ''); if (c.action === 'keyboard') params.set('keyboard', '');
        if (!['empty', 'client'].includes(c.action)) params.set('selected', '');
        if (c.action === 'targeted') params.set('targeted', '');
        await page.goto(pathToFileURL(path.resolve('dist/work-payment-v2-preview/index.html')).href + '?' + params);
        await page.getByTestId('editor-section-client').waitFor(); await settle(page);
        const confirm = page.getByRole('button', { name: 'Confirm', exact: true });
        if (['empty', 'selected'].includes(c.action)) assert.equal(await confirm.isDisabled(), true);
        if (c.action === 'client') { await page.getByRole('combobox', { name: 'Client *', exact: true }).click(); await page.getByRole('combobox', { name: 'Search client', exact: true }).fill('Independent'); }
        if (!['empty', 'client', 'selected', 'category', 'date', 'many', 'targeted'].includes(c.action)) {
          const first = c.action === 'stress' ? page.getByRole('checkbox', { name: /^Allocate payment to Completeunbroken/ }) : page.getByRole('checkbox').first(); await reveal(page, first); await first.click(); await settle(page);
          const amount = page.getByRole('textbox', { name: /^Allocation in reais for / }).first();
          if (c.action !== 'stress') await amount.fill(c.action === 'invalid' ? '0' : c.action === 'excessive' ? '99999' : c.action === 'one-selected' ? '900' : '100,25');
          if (['mixed', 'client-change', 'multi-partial'].includes(c.action)) { await page.getByRole('checkbox').nth(1).click(); await settle(page); }
          if (c.action === 'multi-partial') { await page.getByRole('textbox', { name: /^Allocation in reais for / }).nth(1).fill('25,12'); assert.ok((await page.getByTestId('work-payment-total').textContent()).includes('125,37')); }
          if (c.action === 'keyboard') { await amount.focus(); assert.equal(await amount.inputValue(), '100,25'); }
          if (c.action === 'save-error') { await confirm.click(); await settle(page); assert.ok(await page.getByText('Unable to record this payment.', { exact: true }).isVisible()); assert.equal(await amount.inputValue(), '100,25'); }
        }
        if (c.action === 'client-change') {
          await scroll(page, false); await page.getByRole('combobox', { name: 'Client *', exact: true }).click(); await page.getByRole('combobox', { name: 'Search client', exact: true }).fill('Other'); await page.getByRole('radio', { name: 'Other studio', exact: true }).click();
          assert.equal(await page.getByRole('textbox', { name: /^Allocation in reais for / }).count(), 0); assert.equal(await confirm.isDisabled(), true);
        }
        if (c.action === 'date') { await scroll(page, true); await page.getByRole('combobox', { name: 'Payment date *', exact: true }).click(); await page.getByLabel('Review native date boundary', { exact: true }).fill('2026-10-26'); }
        if (c.action === 'category') { await scroll(page, true); await page.getByRole('combobox', { name: 'Income category', exact: true }).click(); }
        let mounted;
        if (c.action === 'many') {
          await settle(page); mounted = await page.locator('[data-testid^="work-payment-allocation-"]').count(); assert.ok(mounted < 142, `bounded cells: ${mounted}`);
          const first = page.getByRole('checkbox').first(); await first.click(); const field = page.getByRole('textbox', { name: /^Allocation in reais for / }).first(); await field.fill('0,25');
          for (let i = 1; i < 6; i++) { const choice = page.getByRole('checkbox').nth(i); await reveal(page, choice); await choice.click(); await page.getByRole('textbox', { name: /^Allocation in reais for / }).nth(i).fill('0,25'); }
          for (let i = 0; i < 12; i++) { await scroll(page, true); await page.waitForTimeout(150); }
          await scroll(page, false); assert.equal(await field.inputValue(), '0,25');
        }
        if (!['client', 'date', 'category', 'keyboard'].includes(c.action)) await scroll(page, false); else await settle(page);
        const captures = [];
        async function capture(suffix) {
          const name = `${c.name}-${suffix}.png`; await page.screenshot({ path: path.join(output, name) }); captures.push(name);
          const overflow = await page.evaluate(() => {
            const issues = [];
            const buttons = [...document.querySelectorAll('[role="button"]')].filter(e => ['Cancel', 'Confirm'].includes(e.getAttribute('aria-label'))).map(e => e.getBoundingClientRect());
            if (buttons.length !== 2 || buttons.some(r => r.width < 48 || r.height < 48 || r.left < 0 || r.right > innerWidth)) issues.push('header control bounds');
            if (buttons.length === 2 && Math.min(buttons[0].right, buttons[1].right) > Math.max(buttons[0].left, buttons[1].left) && Math.min(buttons[0].bottom, buttons[1].bottom) > Math.max(buttons[0].top, buttons[1].top)) issues.push('header control overlap');
            for (const region of document.querySelectorAll('[data-testid^="editor-section-"],[data-testid^="work-payment-allocation-"],[data-testid="work-payment-total"]')) {
              const b = region.getBoundingClientRect(); if (b.bottom < 0 || b.top > innerHeight) continue;
              for (const e of region.querySelectorAll('*')) { const r = e.getBoundingClientRect(); if (r.left < b.left - 1 || r.right > b.right + 1) issues.push(e.getAttribute('aria-label') || e.textContent);
                if (e.getAttribute('dir') !== 'auto') continue;
                const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); for (let t = walker.nextNode(); t; t = walker.nextNode()) { const range = document.createRange(); range.selectNodeContents(t); for (const r of range.getClientRects()) if (r.left < b.left - 1 || r.right > b.right + 1) issues.push(t.textContent); }
              }
            }
            return [...new Set(issues)];
          });
          assert.deepEqual(overflow, [], `${name}: horizontal region overflow`);
        }
        if (c.action === 'many') { await reveal(page, page.getByTestId('editor-section-client')); await scroll(page, false); await page.waitForTimeout(1000); }
        await capture('top');
        if (!['client', 'date', 'category', 'keyboard'].includes(c.action)) {
          if (await page.getByRole('checkbox').count()) { await reveal(page, page.getByRole('checkbox').first()); await capture('allocations'); }
          if (c.action === 'many') {
            // Exercise a continuous user scroll, letting each variable-height window measure.
            // Teleporting the DOM scroll offset to an estimated end is not a settled list capture.
            await page.mouse.move(c.width / 2, 500);
            for (let step = 0; step < 28; step++) { await page.mouse.wheel(0, 800); await page.waitForTimeout(220); }
            await page.waitForTimeout(1000); await page.waitForFunction(() => {
            const total = document.querySelector('[data-testid="work-payment-total"]').getBoundingClientRect();
            const tail = Math.max(...[...document.querySelectorAll('[data-testid^="work-payment-allocation-"]')].map(e => e.getBoundingClientRect().bottom));
            return total.top - tail <= 10;
          }, undefined, { timeout: 15000 }); }
          else await scroll(page, true);
          await capture('details');
          // Total can be above details at doubled text sizes; capture it separately.
          await reveal(page, page.getByTestId('work-payment-total')); await capture('total');
        }
        assert.deepEqual(errors, []); checks.push({ ...c, mounted, captures, errors });
      } finally { await page.close(); }
    }
    const checkPath = path.join(output, 'checks.json');
    const previous = process.env.AXIS_REVIEW_CASE && fs.existsSync(checkPath) ? JSON.parse(fs.readFileSync(checkPath)) : [];
    fs.writeFileSync(checkPath, JSON.stringify([...previous.filter(x => !checks.some(c => c.name === x.name)), ...checks], null, 2)); console.log(`${checks.length} scenarios passed; ${checks.reduce((n, x) => n + x.captures.length, 0)} captures`);
  } finally { await browser.close(); }
}
async function galleries() {
  const browser = await chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true });
  try {
    const originals = fs.readdirSync(output).filter(n => n.endsWith('.png') && !n.startsWith('contact-'));
    for (let i = 0; i < originals.length; i += 8) {
      const p = await browser.newPage({ viewport: { width: 1200, height: 1340 } });
      await p.setContent('<style>body{margin:0;background:#ddd;display:grid;grid-template-columns:repeat(4,300px)}figure{margin:0;padding:4px;box-sizing:border-box;height:670px}figcaption{font:11px sans-serif;height:22px}img{display:block;max-width:290px;height:630px;object-fit:contain;object-position:left top}</style>' + originals.slice(i, i + 8).map(n => '<figure><figcaption>' + n + '</figcaption><img src="data:image/png;base64,' + fs.readFileSync(path.join(output, n)).toString('base64') + '"></figure>').join(''));
      await p.screenshot({ path: path.join(output, 'contact-' + (i / 8 + 1) + '.png'), fullPage: true }); await p.close();
    }
  } finally { await browser.close(); }
}
(process.argv.includes('--annotate-only') ? Promise.resolve() : process.argv.includes('--galleries-only') ? galleries() : main().then(galleries))
  .then(() => { for (const name of fs.readdirSync(output).filter(n => n.endsWith('.png'))) annotate(path.join(output, name)); })
  .catch(e => { console.error(e); process.exitCode = 1; });

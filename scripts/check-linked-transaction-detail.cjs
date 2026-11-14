/** Browser layout/callback review; native sequencing is covered by the real FinanceScreen tests. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const url = pathToFileURL(path.resolve('dist/linked-transaction-detail-atlas/index.html')).href;
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true }), checks = [];
  try {
    for (const theme of ['dark', 'light']) for (const width of [320, 390, 430]) for (const large of [false, true]) for (const kind of ['long', 'commitment', 'large']) {
      const page = await browser.newPage({ viewport: { width, height: 844 }, colorScheme: theme, reducedMotion: 'reduce' }), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(url + '?case=' + kind + (large ? '&large' : '')); await page.evaluate(() => document.fonts.ready);
      const back = page.getByRole('button', { name: 'Back', exact: true }); await back.waitFor();
      const header = await back.boundingBox(); assert.ok(header.height >= 48 && header.y >= 0 && header.y + header.height <= 844);
      const last = page.getByRole('button', { name: 'Edit details', exact: true }); await last.scrollIntoViewIfNeeded();
      const bounds = await last.boundingBox(); assert.ok(bounds.height >= 48 && bounds.y >= 0 && bounds.y + bounds.height <= 844);
      await last.focus(); assert.equal(await last.evaluate(e => getComputedStyle(e).outlineWidth), '2px');
      assert.equal(await page.getByRole('button', { name: /Delete|Reverse|Undo/ }).count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const clippedText = await page.evaluate(() => [...document.querySelectorAll('[dir="auto"]')].filter(e => e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 1).map(e => e.textContent));
      assert.deepEqual(clippedText, [], 'Text must reflow inside the scroll body');
      assert.equal(errors.length, 0, errors.join('\n'));
      checks.push({ theme, width, fontScale: large ? 2 : 1, kind, back: header, last: bounds, overflow: false, focus: '2px', forbiddenActions: 0 }); await page.close();
    }
    for (const theme of ['dark', 'light']) {
      for (const kind of ['work', 'commitment']) {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: theme });
        await page.goto(url + '?case=' + kind); await page.getByRole('button', { name: 'Edit details', exact: true }).click();
        const amount = page.getByRole('textbox', { name: kind === 'work' ? 'Amount in reais, locked to Work allocations' : 'Amount in reais, required', exact: true }); await amount.waitFor();
        assert.equal(await amount.isEditable(), kind === 'commitment');
        const type = page.getByRole('radio'); assert.equal(await type.count(), 2);
        for (const radio of await type.all()) assert.equal(await radio.getAttribute('aria-disabled'), 'true');
        await page.getByRole('button', { name: 'Cancel', exact: true }).click(); assert.equal(await page.evaluate(() => window.reviewSaved), undefined);
        await page.goto(url + '?case=' + kind); const label = kind === 'work' ? 'Open Work' : 'Open Commitments';
        await page.getByRole('button', { name: label, exact: true }).click(); assert.equal(await page.evaluate(() => window.reviewAction), label);
        checks.push({ theme, kind, sourceCallback: label, editAmountAllowed: kind === 'commitment', editTypeAllowed: false, cancelWrites: false }); await page.close();
      }
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: theme });
      await page.goto(url + '?case=refresh'); await page.getByRole('alert').waitFor();
      await page.getByRole('button', { name: 'Retry refresh', exact: true }).click(); await page.getByRole('alert').waitFor({ state: 'hidden' });
      assert.equal(await page.evaluate(() => window.reviewRetry), true);
      await page.getByRole('button', { name: 'Back', exact: true }).click(); assert.equal(await page.evaluate(() => window.reviewAction), 'Dismiss');
      checks.push({ theme, retry: true, backCallback: 'Dismiss' }); await page.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync('docs/design-system/linked-transaction-detail-v2/interactions.json', JSON.stringify({ scope: 'Actual RNWeb components, frozen SQLite fixture; text scaling proxy and no device acceptance claim', checks }, null, 2));
  console.log(checks.length + ' browser groups passed');
}
main().catch(error => { console.error(error); process.exitCode = 1; });

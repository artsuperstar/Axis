/** Browser checks complement SQLite/FinanceScreen tests; native Alert timing is not simulated. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const url = pathToFileURL(path.resolve('dist/manage-commitments-atlas/index.html')).href;
const fixture = JSON.parse(fs.readFileSync('docs/design-system/manage-commitments-v2/fixture.json'));
async function manage(page, kind = 'manage', large = false) {
  await page.goto(url + '?case=' + kind + (large ? '&large' : '')); await page.evaluate(() => document.fonts.ready);
  await page.getByRole('button', { name: 'Commitment options', exact: true }).click();
  await page.getByRole('button', { name: 'Manage commitments', exact: true }).click();
}
async function option(page, name, action) {
  await page.getByRole('button', { name: 'Series options for ' + name, exact: true }).click();
  await page.getByRole('button', { name: (action === 'History' ? 'History for ' : action + ' ') + name, exact: true }).click();
}
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true }), checks = [];
  try {
    for (const theme of ['dark', 'light']) for (const width of [320, 390, 430]) for (const large of [false, true]) {
      const page = await browser.newPage({ viewport: { width, height: 844 }, colorScheme: theme, reducedMotion: 'reduce' }), errors = [];
      page.on('pageerror', e => errors.push(e.message)); await manage(page, 'long', large);
      const back = page.getByRole('button', { name: 'Back to Commitments', exact: true }), header = await back.boundingBox();
      assert.ok(header.height >= 48 && header.y >= 0);
      const trigger = page.getByRole('button', { name: /^Series options for Long commitment/ }); await trigger.scrollIntoViewIfNeeded();
      const bounds = await trigger.boundingBox(); assert.ok(bounds.height >= 48 && bounds.width >= 48 && bounds.y >= 0 && bounds.y + bounds.height <= 844);
      await trigger.focus(); assert.equal(await trigger.evaluate(e => getComputedStyle(e).outlineWidth), '2px');
      await trigger.click(); const end = page.getByRole('button', { name: /^End Long commitment/ }); await end.waitFor();
      const menu = await end.boundingBox(); assert.ok(menu.height >= 48 && menu.y >= 0 && menu.y + menu.height <= 844);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const clipped = await page.evaluate(() => [...document.querySelectorAll('[dir="auto"]')].filter(e => e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 1).map(e => e.textContent)); assert.deepEqual(clipped, []);
      assert.equal(errors.length, 0, errors.join('\n'));
      checks.push({ theme, width, fontScale: large ? 2 : 1, case: 'long-title-large-amount-menu', back: header, trigger: bounds, finalMenuAction: menu, clippedText: clipped, focus: '2px' }); await page.close();
    }
    for (const theme of ['dark', 'light']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: theme });
      await manage(page, 'many');
      const last = page.getByRole('button', { name: 'Series options for Review service 50', exact: true });
      let scroll;
      // Advance with the measured content as SectionList mounts later windows.
      for (let attempt = 0; attempt < 12; attempt++) {
        scroll = await page.getByTestId('commitments-list').evaluate(e => { const v = [e, ...e.querySelectorAll('div')].find(x => x.scrollHeight > x.clientHeight + 20 && ['auto', 'scroll'].includes(getComputedStyle(x).overflowY)); if (!v) throw Error('Missing scroll viewport'); v.scrollTop = v.scrollHeight; v.dispatchEvent(new Event('scroll', { bubbles: true })); return { height: v.clientHeight, contentHeight: v.scrollHeight, offset: v.scrollTop }; });
        if (await last.count()) break;
        await page.waitForTimeout(100);
      }
      await last.scrollIntoViewIfNeeded();
      const bottom = await last.boundingBox(); assert.ok(bottom.height >= 48 && bottom.y >= 0 && bottom.y + bottom.height <= 844);
      await last.click(); await page.getByRole('button', { name: 'End Review service 50', exact: true }).waitFor();
      checks.push({ theme, case: '59-source-series-final-row', scroll, last: bottom });
      await manage(page);
      for (const action of ['Pause', 'End']) {
        await option(page, 'Active bill', action); const alert = await page.evaluate(() => ({ title: window.reviewAlert.title, styles: window.reviewAlert.buttons.map(b => b.style), calls: window.reviewCalls }));
        assert.equal(alert.title, action + ' commitment?'); assert.equal(alert.calls.length, 0);
        if (action === 'End') assert.equal(alert.styles.at(-1), 'destructive');
        await page.evaluate(() => window.reviewAlert.buttons.find(b => b.text === 'Cancel').onPress?.());
      }
      await option(page, 'Active bill', 'Pause'); await page.evaluate(() => window.reviewAlert.buttons.find(b => b.text === 'Confirm').onPress());
      assert.deepEqual(await page.evaluate(() => window.reviewCalls), [{ name: 'pause', args: [fixture.active] }]);
      checks.push({ theme, case: 'native-confirmation-callback-entry', cancellationWrites: 0, confirmedTarget: fixture.active });
      await manage(page); await option(page, 'Paused bill', 'Resume'); await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      await option(page, 'Active bill', 'Edit'); await page.getByRole('textbox', { name: 'Title, required', exact: true }).fill('Unsaved title'); await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      await option(page, 'Completed installment', 'History'); await page.getByRole('button', { name: 'View commitment', exact: true }).click(); await page.getByRole('button', { name: 'Back', exact: true }).click();
      await page.getByRole('button', { name: 'Manage Active bill', exact: true }).click(); await page.getByRole('button', { name: 'Back', exact: true }).click();
      assert.equal((await page.evaluate(() => window.reviewCalls)).length, 0);
      checks.push({ theme, case: 'resume-edit-history-details-handoffs', cancelledWrites: 0 });
      await manage(page, 'error'); await page.getByRole('button', { name: 'Manage Active bill', exact: true }).click(); await page.getByRole('alert').waitFor();
      await page.getByRole('button', { name: 'Back to Commitments', exact: true }).click(); checks.push({ theme, case: 'retained-source-error-back', mutationCalls: await page.evaluate(() => window.reviewCalls.length) });
      await manage(page, 'empty'); assert.ok((await page.locator('body').innerText()).includes('No commitment series yet. Return to Commitments to add one.'));
      await page.getByRole('button', { name: 'Back to Commitments', exact: true }).click(); assert.ok((await page.locator('body').innerText()).includes('No commitments yet'));
      checks.push({ theme, case: 'empty-management-return' }); await page.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync('docs/design-system/manage-commitments-v2/interactions.json', JSON.stringify({ scope: 'Actual RNWeb components with frozen SQLite source records and callback-only browser adapters; native acceptance separate', checks }, null, 2));
  console.log(checks.length + ' browser groups passed');
}
main().catch(error => { console.error(error); process.exitCode = 1; });

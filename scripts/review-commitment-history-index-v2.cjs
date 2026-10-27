/** Browser evidence for real index components; native tabs/SQLite writes are validated separately. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const output = path.resolve('docs/previews/commitment-history-index-v2'); fs.mkdirSync(output, { recursive: true });
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true });
  const cases = [], checks = [];
  for (const theme of ['dark', 'light']) {
    for (const width of [320, 390, 430]) {
      cases.push({ name: `mixed-${width}-${theme}`, scenario: 'mixed', width, theme, scale: 1 });
      cases.push({ name: `stress-${width}-${theme}-2`, scenario: 'stress', width, theme, scale: 2 });
    }
    for (const scenario of ['stress', 'empty', 'reversed', 'collection']) cases.push({ name: `${scenario}-390-${theme}`, scenario, width: 390, theme, scale: 1 });
  }
  try {
    for (const c of cases.filter(c => !process.env.AXIS_REVIEW_CASE || c.name === process.env.AXIS_REVIEW_CASE)) {
      const page = await browser.newPage({ viewport: { width: c.width, height: 844 }, colorScheme: c.theme, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      try {
        const params = new URLSearchParams({ scenario: c.scenario }); if (c.scale === 2) params.set('large', '');
        await page.goto(pathToFileURL(path.resolve('dist/commitment-history-index-v2-preview/index.html')).href + '?' + params);
        await page.getByRole('button', { name: 'Commitment options', exact: true }).click();
        await page.getByRole('button', { name: 'History', exact: true }).click();
        await page.getByRole('heading', { name: 'Commitment History', exact: true }).waitFor();
        await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(200);
        const cards = page.getByTestId('commitment-history-index-card');
        if (c.scenario === 'empty') { assert.equal(await cards.count(), 0); await page.getByText('No paid or skipped occurrences yet.', { exact: true }).waitFor(); }
        const geometry = await page.evaluate(() => {
          const overflow = [], regions = [...document.querySelectorAll('[data-testid="commitment-history-index-card"]')];
          for (const region of regions) { const b = region.getBoundingClientRect();
            for (const e of region.querySelectorAll('*')) {
              const r = e.getBoundingClientRect(); if (r.left < b.left - .5 || r.right > b.right + .5) overflow.push(e.textContent);
              if (e.getAttribute('dir') !== 'auto') continue;
              const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
              for (let t = walker.nextNode(); t; t = walker.nextNode()) for (let i = 0; i < t.length; i++) { if (/\s/.test(t.textContent[i])) continue; const range = document.createRange(); range.setStart(t, i); range.setEnd(t, i + 1); for (const g of range.getClientRects()) if (g.left < b.left - .5 || g.right > b.right + .5) overflow.push(t.textContent); }
            }
          }
          return { overflow: [...new Set(overflow)], horizontalOverflow: document.documentElement.scrollWidth > innerWidth, cards: regions.map(e => ({ text: e.textContent, name: e.getAttribute('aria-label'), value: e.getAttribute('aria-valuetext'), height: e.getBoundingClientRect().height, nestedButtons: e.querySelectorAll('[role="button"]').length })) };
        });
        assert.ok(geometry.cards.every(card => card.height >= 48 && card.nestedButtons === 0 && card.text.includes('paid or skipped') && card.text.includes('Paid R$')));
        await page.screenshot({ path: path.join(output, c.name + '.png') });
        if (await cards.count()) {
          for (let pass = 0; pass < (c.scenario === 'collection' ? 32 : 8); pass++) {
            await cards.last().evaluate(el => { for (let parent = el.parentElement; parent; parent = parent.parentElement) if (getComputedStyle(parent).overflowY === 'auto' || getComputedStyle(parent).overflowY === 'scroll') parent.scrollTop = parent.scrollHeight; });
            await page.waitForTimeout(120);
          }
          await page.screenshot({ path: path.join(output, c.name + '-bottom.png') });
          const finalCard = c.scenario === 'collection' ? page.getByRole('button', { name: 'History for Archived service 124', exact: true }) : cards.last();
          await finalCard.evaluate(el => el.scrollIntoView({ block: 'end' })); await page.waitForTimeout(300);
          const box = await finalCard.boundingBox();
          assert.ok(box.y >= 0 && box.y + box.height <= 775, `${c.name}: last card clears reserved native area ${JSON.stringify(box)}`);
          await page.screenshot({ path: path.join(output, c.name + '-bottom.png') });
        }
        if (c.scenario === 'mixed' && c.width === 390) {
          const label = await cards.first().getAttribute('aria-label'); await cards.first().scrollIntoViewIfNeeded();
          await cards.first().click(); await page.getByTestId('commitment-history-summary').waitFor();
          assert.ok(await page.evaluate(() => !!window.reviewSelectedId));
          await page.screenshot({ path: path.join(output, c.name + '-selected.png') });
          await page.getByRole('button', { name: 'Back', exact: true }).click(); await cards.first().waitFor();
          assert.equal(await cards.first().getAttribute('aria-label'), label);
          await page.screenshot({ path: path.join(output, c.name + '-returned.png') });
        }
        await page.getByRole('button', { name: 'Back to Commitments', exact: true }).scrollIntoViewIfNeeded();
        await page.getByRole('button', { name: 'Back to Commitments', exact: true }).click();
        await page.getByRole('button', { name: 'Add commitment', exact: true }).waitFor();
        checks.push({ name: c.name, ...geometry, errors });
      } finally { await page.close(); }
    }
    fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify(checks, null, 2));
    const failures = checks.filter(c => c.errors.length || c.horizontalOverflow || c.overflow.length);
    console.log(JSON.stringify({ scenes: cases.length, failures }, null, 2)); assert.equal(failures.length, 0);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

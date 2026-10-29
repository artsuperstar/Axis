/** Supporting browser evidence; native tabs and OS text scaling require device review. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const output = path.resolve('docs/previews/work-main-v2'); fs.mkdirSync(output, { recursive: true });
async function bottom(page) {
  const list = page.getByTestId('work-main-list');
  for (let pass = 0; pass < 32; pass++) {
    await list.evaluate(root => { for (const el of [root, ...root.querySelectorAll('*')]) if (['auto', 'scroll'].includes(getComputedStyle(el).overflowY)) el.scrollTop = el.scrollHeight; });
    await page.waitForTimeout(100);
  }
}
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true });
  const cases = [], checks = [];
  for (const theme of ['dark', 'light']) {
    for (const width of [320, 390, 430]) {
      cases.push({ name: `mixed-${width}-${theme}`, scenario: 'mixed', width, theme, scale: 1 });
      cases.push({ name: `stress-${width}-${theme}-2`, scenario: 'stress', width, theme, scale: 2 });
    }
    for (const scenario of ['stress', 'empty', 'zero', 'earned', 'partial', 'settled', 'no-attention', 'long-client', 'collection']) cases.push({ name: `${scenario}-390-${theme}`, scenario, width: 390, theme, scale: 1 });
  }
  try {
    for (const c of cases.filter(c => !process.env.AXIS_REVIEW_CASE || c.name === process.env.AXIS_REVIEW_CASE)) {
      const page = await browser.newPage({ viewport: { width: c.width, height: 844 }, colorScheme: c.theme, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' });
      page.setDefaultTimeout(30000);
      page.setDefaultNavigationTimeout(60000);
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      try {
        const params = new URLSearchParams({ scenario: c.scenario }); if (c.scale === 2) params.set('large', '');
        await page.goto(pathToFileURL(path.resolve('dist/work-v2-preview/index.html')).href + '?' + params);
        await page.getByTestId('work-financial-summary').waitFor(); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(250);
        assert.equal(await page.getByRole('heading', { name: 'Work', exact: true }).count(), 0);
        const geometry = await page.evaluate(() => {
          const overflow = [], regions = [...document.querySelectorAll('[data-testid="work-financial-summary"],[data-testid="work-entry"]')];
          for (const region of regions) { const b = region.getBoundingClientRect();
            for (const e of region.querySelectorAll('*')) {
              const r = e.getBoundingClientRect(); if (r.left < b.left - .5 || r.right > b.right + .5) overflow.push(e.textContent);
              if (e.getAttribute('dir') !== 'auto') continue;
              const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
              for (let t = walker.nextNode(); t; t = walker.nextNode()) for (let i = 0; i < t.length; i++) { if (/\s/.test(t.textContent[i])) continue; const range = document.createRange(); range.setStart(t, i); range.setEnd(t, i + 1); for (const g of range.getClientRects()) if (g.left < b.left - .5 || g.right > b.right + .5) overflow.push(t.textContent); }
            }
          }
          const metrics = [...document.querySelectorAll('[data-testid="work-metric-earned"],[data-testid="work-metric-received"]')], metricOverflow = [];
          for (const metric of metrics) { const bounds = metric.getBoundingClientRect();
            for (const text of metric.querySelectorAll('[dir="auto"]')) { const range = document.createRange(); range.selectNodeContents(text); for (const glyphs of range.getClientRects()) if (glyphs.top < bounds.top - 1 || glyphs.bottom > bounds.bottom + 1) metricOverflow.push(text.textContent); }
          }
          const [earned, received] = metrics.map(metric => metric.getBoundingClientRect());
          const metricOverlap = Math.min(earned.right, received.right) - Math.max(earned.left, received.left) > 1 && Math.min(earned.bottom, received.bottom) - Math.max(earned.top, received.top) > 1;
          const cards = [...document.querySelectorAll('[data-testid="work-entry"]')].map(e => ({ name: e.getAttribute('aria-label'), text: e.textContent, height: e.getBoundingClientRect().height, nestedButtons: e.querySelectorAll('[role="button"]').length }));
          const actions = [...document.querySelectorAll('[data-testid="work-financial-summary"] [role="button"]')].map(e => ({ label: e.getAttribute('aria-label'), width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height }));
          return { overflow: [...new Set(overflow)], metricOverflow: [...new Set(metricOverflow)], metricOverlap, horizontalOverflow: document.documentElement.scrollWidth > innerWidth, cards, actions, data: window.reviewData };
        });
        assert.ok(geometry.cards.every(card => card.height >= 48 && card.nestedButtons === 0));
        assert.ok(geometry.actions.every(action => action.width >= 48 && action.height >= 48));
        if (['empty', 'zero', 'settled', 'no-attention'].includes(c.scenario)) assert.equal(await page.getByTestId('work-attention').count(), 0);
        await page.screenshot({ path: path.join(output, c.name + '.png') });
        if (c.scale === 2) {
          await page.getByTestId('work-metric-received').evaluate(el => el.scrollIntoView({ block: 'start' })); await page.waitForTimeout(150);
          await page.screenshot({ path: path.join(output, c.name + '-secondary.png') });
          await page.getByTestId('work-card-balance').first().evaluate(el => el.scrollIntoView({ block: 'center' })); await page.waitForTimeout(150);
          await page.screenshot({ path: path.join(output, c.name + '-amount.png') });
        }
        if (geometry.data.count) {
          await bottom(page);
          const escapedTitle = geometry.data.lastTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const finalCard = page.getByRole('button', { name: new RegExp('^' + escapedTitle + ',') });
          await finalCard.evaluate(el => el.scrollIntoView({ block: 'end' })); await page.waitForTimeout(200);
          const box = await finalCard.boundingBox(), viewport = await page.getByTestId('work-main-list').boundingBox();
          assert.ok(box.y + box.height <= 775 && box.y + box.height > viewport.y && (box.height > viewport.height || box.y >= viewport.y - .5), `${c.name}: bottom item ${JSON.stringify(box)}`);
          await page.screenshot({ path: path.join(output, c.name + '-bottom.png') });
        }
        if (c.scenario === 'mixed' && c.width === 390) {
          await page.getByRole('button', { name: 'Work options', exact: true }).scrollIntoViewIfNeeded(); await page.getByRole('button', { name: 'Work options', exact: true }).click();
          await page.getByRole('button', { name: 'Clients', exact: true }).waitFor(); await page.getByRole('button', { name: 'History', exact: true }).waitFor();
          await page.screenshot({ path: path.join(output, c.name + '-menu.png') });
          await page.getByRole('button', { name: 'Clients', exact: true }).click(); await page.waitForTimeout(100); assert.equal(await page.evaluate(() => window.reviewRoute), '/work/clients');
          await page.getByRole('button', { name: 'Add work', exact: true }).click(); await page.getByText('New work', { exact: true }).waitFor();
          await page.screenshot({ path: path.join(output, c.name + '-add.png') }); await page.getByRole('button', { name: 'Cancel', exact: true }).click();
          await page.getByRole('button', { name: 'Record payment', exact: true }).click(); await page.getByText('Apply received money to work', { exact: true }).waitFor();
          await page.screenshot({ path: path.join(output, c.name + '-payment.png') }); await page.getByRole('button', { name: 'Cancel', exact: true }).click();
          const row = page.getByTestId('work-entry').first(); await row.scrollIntoViewIfNeeded(); await row.click(); await page.getByText('Job details', { exact: true }).waitFor();
          assert.ok(await page.evaluate(() => !!window.reviewSelectedId)); await page.screenshot({ path: path.join(output, c.name + '-details.png') });
          await page.getByRole('button', { name: 'Back', exact: true }).click(); await page.getByTestId('work-main-list').waitFor();
        }
        checks.push({ name: c.name, ...geometry, errors });
      } finally { await page.close(); }
    }
    fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify(checks, null, 2));
    const failures = checks.filter(c => c.errors.length || c.horizontalOverflow || c.overflow.length || c.metricOverflow.length || c.metricOverlap);
    console.log(JSON.stringify({ scenes: checks.length, failures }, null, 2)); assert.equal(failures.length, 0);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

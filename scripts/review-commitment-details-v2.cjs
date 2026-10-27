/** Real RN Web virtualized Details projection; source fixtures real, callbacks/native boundaries substituted. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const output = path.resolve('docs/previews/commitment-details-v2'); fs.mkdirSync(output, { recursive: true });
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true });
  const cases = [], checks = [];
  for (const theme of ['dark', 'light']) {
    for (const scenario of ['bill', 'subscription', 'installment', 'multi', 'paused', 'ended', 'completed']) cases.push({ name: `${scenario}-${theme}`, scenario, width: 390, theme, scale: 1 });
    for (const width of [320, 430]) cases.push({ name: `bill-${width}-${theme}`, scenario: 'bill', width, theme, scale: 1 });
    for (const width of [320, 390, 430]) cases.push({ name: `stress-${width}-${theme}-2`, scenario: 'stress', width, theme, scale: 2 });
    cases.push({ name: `stress-390-${theme}-1`, scenario: 'stress', width: 390, theme, scale: 1 });
  }
  for (const state of ['many-unpaid', 'overdue', 'empty', 'long-title', 'long-category', 'archived', 'uncategorized', 'max', 'menu', 'overflow', 'history', 'long-scroll']) cases.push({ name: state, scenario: ['menu', 'overflow', 'history'].includes(state) ? 'multi' : state, width: 390, theme: 'dark', scale: 1, state });
  try {
    for (const c of cases) {
      const page = await browser.newPage({ viewport: { width: c.width, height: c.scale === 2 ? 1400 : 1050 }, colorScheme: c.theme, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      try {
        const params = new URLSearchParams({ scenario: c.scenario }); if (c.scale === 2) params.set('large', '');
        await page.goto(pathToFileURL(path.resolve('dist/commitment-details-v2-preview/index.html')).href + '?' + params);
        const overview = page.getByTestId('commitment-details-overview'), list = page.getByTestId('commitment-details-list'), history = page.getByTestId('commitment-details-history');
        await overview.waitFor(); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(200);
        assert.equal(await overview.locator('[role="button"],input,textarea').count(), 0);
        const schedules = page.getByTestId('commitment-schedule-row'); assert.ok(await schedules.count() > 0);
        assert.equal(await schedules.locator('[role="button"],[data-testid="icon-forward"]').count(), 0);
        if (c.state === 'menu') await page.getByRole('button', { name: 'Series options for Internet', exact: true }).click();
        if (c.state === 'overflow') { const actions = page.getByRole('button', { name: /^Actions for Internet, due/ }).first(); await actions.scrollIntoViewIfNeeded(); await actions.click(); await page.getByRole('button', { name: /^Skip Internet/ }).waitFor(); assert.equal(await page.getByRole('button', { name: 'View commitment', exact: true }).count(), 0); }
        if (['history', 'long-scroll'].includes(c.state)) { await history.scrollIntoViewIfNeeded(); await page.waitForTimeout(300); }
        const geometry = await page.evaluate(() => {
          const overflow = [], regions = [...document.querySelectorAll('[data-testid="commitment-details-overview"],[data-testid="commitment-schedule-row"],[data-testid="commitment-obligation"],[data-testid="commitment-details-history"]')];
          for (const region of regions) {
            const b = region.getBoundingClientRect();
            for (const e of region.querySelectorAll('*')) {
              const r = e.getBoundingClientRect(); if (r.left < b.left - .5 || r.right > b.right + .5) overflow.push(e.getAttribute('aria-label') || e.textContent);
              if (e.getAttribute('dir') !== 'auto') continue;
              const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
              for (let t = walker.nextNode(); t; t = walker.nextNode()) for (let i = 0; i < t.length; i++) {
                if (/\s/.test(t.textContent[i])) continue; const range = document.createRange(); range.setStart(t, i); range.setEnd(t, i + 1);
                for (const g of range.getClientRects()) if (g.left < b.left - .5 || g.right > b.right + .5) overflow.push(t.textContent);
              }
            }
          }
          const header = [...document.querySelectorAll('[role="button"]')].filter(e => ['Back'].includes(e.getAttribute('aria-label')) || e.getAttribute('aria-label')?.startsWith('Series options for')).map(e => { const b = e.getBoundingClientRect(); return { label: e.getAttribute('aria-label'), x: b.x, y: b.y, width: b.width, height: b.height, bottom: b.bottom }; });
          const overviewWidth = document.querySelector('[data-testid="commitment-details-overview"]').getBoundingClientRect().width;
          const money = [...document.querySelectorAll('[data-testid^="commitment-metric-"]')].filter(e => /^(Expected|Total paid)/.test(e.firstElementChild.textContent)).map(e => ({ label: e.firstElementChild.textContent, value: e.lastElementChild.textContent, width: e.getBoundingClientRect().width, textHeight: e.lastElementChild.getBoundingClientRect().height, lineHeight: parseFloat(getComputedStyle(e.lastElementChild).lineHeight), overviewWidth }));
          return { regions: regions.length, overflow: [...new Set(overflow)], horizontalOverflow: document.documentElement.scrollWidth > innerWidth, header, money, renderedSchedules: document.querySelectorAll('[data-testid="commitment-schedule-row"]').length, renderedObligations: document.querySelectorAll('[data-testid="commitment-obligation"]').length };
        });
        assert.ok(geometry.regions >= 2); assert.equal(geometry.header.length, 2);
        assert.equal(geometry.money.length, 2, 'Expected and actual Total paid are both measured');
        if (c.scale === 1) for (const m of geometry.money.filter(m => m.value.length > 16)) { assert.ok(m.width >= m.overviewWidth - 30, 'long money uses the full overview width'); assert.ok(m.textHeight <= m.lineHeight + 1, 'normal-size centavos remain together on one line'); }
        assert.ok(geometry.header.every(b => b.x >= 0 && b.x + b.width <= c.width && b.width >= 48 && b.height >= 48));
        await page.screenshot({ path: path.join(output, c.name + '.png') });
        if (c.scale === 2) { await history.scrollIntoViewIfNeeded(); await page.waitForTimeout(250); await page.screenshot({ path: path.join(output, c.name + '-bottom.png') }); }
        if (c.scenario === 'multi' && !c.state) { await history.scrollIntoViewIfNeeded(); await page.waitForTimeout(150); await page.screenshot({ path: path.join(output, c.name + '-bottom.png') }); }
        if (c.state === 'history') { await history.click(); assert.equal(await page.evaluate(() => window.reviewAction), 'History'); }
        checks.push({ name: c.name, ...geometry, errors });
        await list.count();
      } finally { await page.close(); }
    }
    fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify(checks, null, 2));
    const failures = checks.filter(c => c.errors.length || c.horizontalOverflow || c.overflow.length);
    console.log(JSON.stringify({ scenes: cases.length, failures }, null, 2)); assert.equal(failures.length, 0);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

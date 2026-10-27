/** Individual archive browser evidence; confirmation/navigation/native boundaries are substituted. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const output = path.resolve('docs/previews/commitment-history-v2'); fs.mkdirSync(output, { recursive: true });
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true });
  const cases = [], checks = [];
  for (const theme of ['dark', 'light']) {
    for (const scenario of ['mixed', 'bill', 'subscription', 'paid', 'skipped', 'completed']) cases.push({ name: `${scenario}-${theme}`, scenario, width: 390, theme, scale: 1 });
    for (const width of [320, 430]) cases.push({ name: `mixed-${width}-${theme}`, scenario: 'mixed', width, theme, scale: 1 });
    for (const width of [320, 390, 430]) cases.push({ name: `stress-${width}-${theme}-2`, scenario: 'stress', width, theme, scale: 2 });
    cases.push({ name: `stress-390-${theme}-1`, scenario: 'stress', width: 390, theme, scale: 1 });
  }
  for (const state of ['paused', 'ended', 'empty', 'changed', 'early', 'late', 'long-title', 'long-category', 'archived', 'uncategorized', 'max', 'pages', 'undo', 'reopen', 'menu', 'bottom']) cases.push({ name: state, scenario: ['undo', 'reopen', 'menu', 'bottom'].includes(state) ? 'mixed' : state, width: 390, theme: 'dark', scale: 1, state });
  try {
    for (const c of cases) {
      const page = await browser.newPage({ viewport: { width: c.width, height: c.scale === 2 ? 1400 : 1050 }, colorScheme: c.theme, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      try {
        const params = new URLSearchParams({ scenario: c.scenario }); if (c.scale === 2) params.set('large', '');
        await page.goto(pathToFileURL(path.resolve('dist/commitment-history-v2-preview/index.html')).href + '?' + params);
        const summary = page.getByTestId('commitment-history-summary'), navigation = page.getByTestId('commitment-history-view-commitment');
        await summary.waitFor(); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(200);
        assert.equal(await summary.locator('[role="button"],input,textarea').count(), 0);
        assert.equal(await page.getByRole('button', { name: 'Pay', exact: true }).count(), 0); assert.equal(await page.getByRole('button', { name: /^Actions for/ }).count(), 0);
        if (c.state === 'menu') await page.getByRole('button', { name: /^Series options for/ }).click();
        if (['bottom', 'pages'].includes(c.state)) { await navigation.scrollIntoViewIfNeeded(); await page.waitForTimeout(200); }
        if (c.state === 'pages') { const initial = await page.evaluate(() => ({ count: window.reviewCount, cursor: window.reviewCursor })); await page.getByRole('button', { name: 'Load earlier history', exact: true }).click(); await page.waitForTimeout(250); const next = await page.evaluate(() => ({ count: window.reviewCount, cursor: window.reviewCursor })); assert.ok(next.count > initial.count); assert.ok(next.cursor < initial.cursor); await navigation.scrollIntoViewIfNeeded(); await page.waitForTimeout(150); }
        if (['undo', 'reopen'].includes(c.state)) { const action = page.getByRole('button', { name: c.state === 'undo' ? /^Undo payment for/ : /^Reopen / }).first(); await action.scrollIntoViewIfNeeded(); await action.focus(); await action.click(); assert.equal(await page.evaluate(() => window.reviewAction), c.state === 'undo' ? 'Undo payment' : 'Reopen'); }
        const geometry = await page.evaluate(() => {
          const overflow = [], regions = [...document.querySelectorAll('[data-testid="commitment-history-summary"],[data-testid="commitment-history-row"],[data-testid="commitment-history-view-commitment"]')];
          for (const region of regions) {
            const b = region.getBoundingClientRect();
            for (const e of region.querySelectorAll('*')) {
              const r = e.getBoundingClientRect(); if (r.left < b.left - .5 || r.right > b.right + .5) overflow.push(e.getAttribute('aria-label') || e.textContent);
              if (e.getAttribute('dir') !== 'auto') continue;
              const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
              for (let t = walker.nextNode(); t; t = walker.nextNode()) for (let i = 0; i < t.length; i++) { if (/\s/.test(t.textContent[i])) continue; const range = document.createRange(); range.setStart(t, i); range.setEnd(t, i + 1); for (const g of range.getClientRects()) if (g.left < b.left - .5 || g.right > b.right + .5) overflow.push(t.textContent); }
            }
          }
          const actions = [...document.querySelectorAll('[role="button"]')].filter(e => ['Back', 'View commitment', 'Load earlier history'].includes(e.getAttribute('aria-label')) || /^(Series options for|Undo payment for|Reopen )/.test(e.getAttribute('aria-label') || '')).map(e => { const b = e.getBoundingClientRect(); return { label: e.getAttribute('aria-label'), x: b.x, y: b.y, width: b.width, height: b.height }; });
          const rows = [...document.querySelectorAll('[data-testid="commitment-history-row"]')].map(e => ({ text: e.textContent, falseBodyButtons: [...e.querySelectorAll('[role="button"]')].filter(b => !/^(Undo payment for|Reopen )/.test(b.getAttribute('aria-label') || '')).length }));
          return { regions: regions.length, overflow: [...new Set(overflow)], horizontalOverflow: document.documentElement.scrollWidth > innerWidth, actions, rows, sourceCount: window.reviewCount, cursor: window.reviewCursor };
        });
        assert.ok(geometry.regions >= 2); assert.ok(geometry.actions.length >= 3);
        assert.ok(geometry.actions.every(b => b.x >= 0 && b.x + b.width <= c.width && b.width >= 48 && b.height >= 48));
        assert.ok(geometry.rows.every(r => !/Pending|Overdue/.test(r.text) && r.falseBodyButtons === 0));
        await page.screenshot({ path: path.join(output, c.name + '.png') });
        if (c.scale === 2 || (c.scenario === 'mixed' && !c.state && c.width === 390)) { await navigation.scrollIntoViewIfNeeded(); await page.waitForTimeout(200); await page.screenshot({ path: path.join(output, c.name + '-bottom.png') }); }
        if (c.state === 'bottom') { await navigation.click(); assert.equal(await page.evaluate(() => window.reviewAction), 'View commitment'); }
        checks.push({ name: c.name, ...geometry, errors });
      } finally { await page.close(); }
    }
    fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify(checks, null, 2));
    const failures = checks.filter(c => c.errors.length || c.horizontalOverflow || c.overflow.length);
    console.log(JSON.stringify({ scenes: cases.length, failures }, null, 2)); assert.equal(failures.length, 0);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

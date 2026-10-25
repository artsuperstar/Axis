/** RN Web confirmation evidence. OS picker/keyboard and runtime writes are substituted. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const output = path.resolve('docs/previews/commitment-payment-v2'); fs.mkdirSync(output, { recursive: true });
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true });
  const cases = [], checks = [];
  for (const theme of ['dark', 'light']) {
    for (const scenario of ['bill', 'subscription', 'installment']) cases.push({ name: `${scenario}-${theme}`, scenario, width: 390, theme, scale: 1 });
    for (const width of [320, 430]) cases.push({ name: `installment-${width}-${theme}`, scenario: 'installment', width, theme, scale: 1 });
    for (const width of [320, 390, 430]) for (const scale of [1, 2]) cases.push({ name: `stress-${width}-${theme}-${scale}`, scenario: 'stress', width, theme, scale });
  }
  for (const state of ['different', 'early', 'overdue', 'uncategorized', 'archived', 'long-title', 'long-category', 'max-expected', 'max-actual', 'invalid-amount', 'invalid-date', 'picker', 'keyboard', 'bottom', 'loading', 'save-error']) cases.push({ name: state, scenario: ['overdue', 'uncategorized', 'archived', 'long-title', 'long-category', 'max-expected'].includes(state) ? state : 'installment', width: 390, theme: 'dark', scale: 1, state });
  try {
    for (const c of cases) {
      const page = await browser.newPage({ viewport: { width: c.width, height: c.scale === 2 ? 1400 : 1050 }, colorScheme: c.theme, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      try {
        const params = new URLSearchParams({ scenario: c.scenario }); if (c.scale === 2) params.set('large', ''); if (c.state === 'keyboard') params.set('keyboard', ''); if (c.state === 'invalid-date') params.set('web', ''); if (c.state === 'loading') params.set('pending', ''); if (c.state === 'save-error') params.set('failure', '');
        await page.goto(pathToFileURL(path.resolve('dist/commitment-payment-v2-preview/index.html')).href + '?' + params);
        const summary = page.getByTestId('commitment-payment-summary'), amount = page.getByRole('textbox', { name: 'Actual amount paid *', exact: true }), confirm = page.getByRole('button', { name: 'Confirm', exact: true });
        await summary.waitFor(); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(150);
        const initialSummary = await summary.textContent();
        if (c.state === 'different') await amount.fill('25,90');
        if (c.state === 'max-expected') await amount.fill('25,90');
        if (c.state === 'max-actual') await amount.fill('90.071.992.547.409,91');
        if (c.state === 'invalid-amount') { await amount.fill('-1'); await confirm.click(); await page.getByRole('alert').waitFor(); }
        if (c.state === 'invalid-date') { await page.getByRole('textbox', { name: 'Payment date *', exact: true }).fill('2099-01-01'); await confirm.click(); await page.getByRole('alert').waitFor(); }
        if (['picker', 'early'].includes(c.state)) {
          await page.getByRole('combobox', { name: 'Payment date *', exact: true }).click();
          const picker = page.getByLabel('Review native date picker boundary'); await picker.waitFor();
          assert.ok(await picker.getAttribute('max'));
          if (c.state === 'early') { const earlier = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - 2); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }); await picker.fill(earlier); await page.getByRole('button', { name: 'Back from payment date picker', exact: true }).click(); }
        }
        if (c.state === 'keyboard') { await amount.focus(); await amount.fill('180,00'); }
        if (c.state === 'loading') { await confirm.click(); await page.waitForTimeout(50); assert.equal(await confirm.getAttribute('aria-busy'), 'true'); assert.equal(await confirm.getAttribute('aria-disabled'), 'true'); assert.equal(await page.evaluate(() => window.reviewCalls), 1); }
        if (c.state === 'save-error') { await amount.fill('29,90'); await confirm.click(); await page.getByRole('alert').waitFor(); assert.equal(await amount.inputValue(), '29,90'); }
        assert.equal(await summary.textContent(), initialSummary, 'editing actual/date must not rewrite expected summary');
        assert.equal(await summary.locator('[role="button"],input,textarea').count(), 0);
        if (!['keyboard', 'bottom', 'picker'].includes(c.state)) await page.evaluate(() => { document.activeElement?.blur(); for (const e of document.querySelectorAll('*')) if (/auto|scroll/.test(getComputedStyle(e).overflowY)) e.scrollTop = 0; });
        if (c.state === 'bottom') await page.getByRole('combobox', { name: 'Payment date *', exact: true }).scrollIntoViewIfNeeded();
        await page.waitForTimeout(150);
        const geometry = await page.evaluate(() => {
          const rect = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom }; };
          const overflow = [], labels = [];
          for (const region of document.querySelectorAll('[data-testid="commitment-payment-summary"],[data-testid="commitment-payment-fields"]')) {
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
          for (const field of document.querySelectorAll('input:not([type="date"]),[role="combobox"]')) {
            const label = field.parentElement.querySelector('[dir="auto"]');
            if (label) labels.push({ text: label.textContent, label: rect(label), field: rect(field), above: label.getBoundingClientRect().bottom <= field.getBoundingClientRect().top + .5 });
          }
          const buttons = [...document.querySelectorAll('[role="button"]')].filter(e => ['Confirm', 'Cancel'].includes(e.getAttribute('aria-label')));
          return { overflow: [...new Set(overflow)], horizontalOverflow: document.documentElement.scrollWidth > innerWidth, labels, header: buttons.map(e => ({ label: e.getAttribute('aria-label'), busy: e.getAttribute('aria-busy'), disabled: e.getAttribute('aria-disabled'), ...rect(e) })), summary: document.querySelector('[data-testid="commitment-payment-summary"]').getAttribute('aria-label') };
        });
        assert.ok(geometry.labels.length >= 2, 'real label geometry required');
        if (c.state === 'keyboard') assert.ok(geometry.header.every(b => b.bottom <= 560));
        assert.ok(geometry.header.every(b => b.x >= 0 && b.x + b.width <= c.width && b.width >= 48 && b.height >= 48));
        await page.screenshot({ path: path.join(output, c.name + '.png') });
        if (c.scale === 2) { await page.getByRole('combobox', { name: 'Payment date *', exact: true }).scrollIntoViewIfNeeded(); await page.waitForTimeout(100); await page.screenshot({ path: path.join(output, c.name + '-payment.png') }); }
        if (c.state === 'picker') { await page.getByLabel('Review native date picker boundary').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(output, 'picker-scrolled.png') }); }
        checks.push({ name: c.name, ...geometry, errors });
      } finally { await page.close(); }
    }
    fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify(checks, null, 2));
    const failures = checks.filter(c => c.errors.length || c.horizontalOverflow || c.overflow.length || c.labels.some(l => !l.above));
    console.log(JSON.stringify({ scenes: cases.length, failures }, null, 2)); assert.equal(failures.length, 0);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

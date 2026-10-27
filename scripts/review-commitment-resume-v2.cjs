/** RN Web evidence only; picker, safe areas and runtime writes are substituted. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const output = path.resolve('docs/previews/commitment-resume-v2'); fs.mkdirSync(output, { recursive: true });
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true });
  const cases = [], checks = [];
  for (const theme of ['dark', 'light']) {
    for (const scenario of ['bill', 'subscription', 'installment']) cases.push({ name: `${scenario}-${theme}`, scenario, width: 390, theme, scale: 1 });
    for (const width of [320, 430]) cases.push({ name: `bill-${width}-${theme}`, scenario: 'bill', width, theme, scale: 1 });
    for (const width of [320, 390, 430]) for (const scale of [1, 2]) cases.push({ name: `stress-${width}-${theme}-${scale}`, scenario: 'stress', width, theme, scale });
  }
  for (const state of ['alternative', 'long-title', 'long-category', 'uncategorized', 'archived', 'max', 'no-history', 'invalid', 'loading', 'save-error', 'bottom', 'picker']) cases.push({ name: state, scenario: ['long-title', 'long-category', 'uncategorized', 'archived', 'max', 'no-history'].includes(state) ? state : 'bill', width: 390, theme: 'dark', scale: 1, state });
  try {
    for (const c of cases) {
      const page = await browser.newPage({ viewport: { width: c.width, height: c.scale === 2 ? 1400 : 1050 }, colorScheme: c.theme, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      try {
        const params = new URLSearchParams({ scenario: c.scenario }); if (c.scale === 2) params.set('large', ''); if (c.state === 'invalid') params.set('web', ''); if (c.state === 'loading') params.set('pending', ''); if (c.state === 'save-error') params.set('failure', '');
        await page.goto(pathToFileURL(path.resolve('dist/commitment-resume-v2-preview/index.html')).href + '?' + params);
        const summary = page.getByTestId('commitment-resume-summary'), resume = page.getByRole('button', { name: 'Resume', exact: true });
        await summary.waitFor(); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(150);
        const initialSummary = await summary.textContent(); assert.ok(initialSummary.includes('Paused')); assert.ok(!initialSummary.includes('Last due date'));
        assert.equal(await summary.locator('[role="button"],input,textarea').count(), 0);
        const proposal = await page.evaluate(() => window.reviewProposedDate);
        if (c.state === 'invalid') {
          const field = page.getByRole('textbox', { name: 'Next due date *', exact: true }); assert.equal(await field.inputValue(), proposal); await field.fill('2026-02-30'); await resume.click(); const alert = page.getByRole('alert'); await alert.waitFor(); assert.equal(await field.inputValue(), '2026-02-30');
          assert.equal(await field.getAttribute('aria-invalid'), 'true'); assert.equal(await alert.textContent(), 'Choose a next due date of today or later.'); assert.equal(await field.evaluate(e => e.parentElement.contains(document.querySelector('[role="alert"]'))), true, 'date error belongs to the field');
        } else {
          const date = page.getByRole('combobox', { name: 'Next due date *', exact: true });
          if (['alternative', 'picker'].includes(c.state)) {
            await date.click(); const picker = page.getByLabel('Review native date picker boundary'); await picker.waitFor(); assert.ok(await picker.getAttribute('min')); assert.equal(await picker.getAttribute('max'), null); assert.equal(await picker.inputValue(), proposal);
            if (c.state === 'alternative') { const selected = `${Number(proposal.slice(0, 4)) + 1}${proposal.slice(4)}`; await picker.fill(selected); await page.getByRole('button', { name: 'Back from next due date picker', exact: true }).click(); assert.ok((await date.getAttribute('aria-label'))?.includes('Next due date')); assert.equal(await page.evaluate(() => window.reviewCalls || 0), 0); }
          }
        }
        if (c.state === 'loading') { await resume.click(); await page.waitForTimeout(50); assert.equal(await resume.getAttribute('aria-busy'), 'true'); assert.equal(await resume.getAttribute('aria-disabled'), 'true'); assert.equal(await page.evaluate(() => window.reviewCalls), 1); }
        if (c.state === 'save-error') { await resume.click(); await page.getByRole('alert').waitFor(); assert.notEqual(await resume.getAttribute('aria-disabled'), 'true'); }
        assert.equal(await summary.textContent(), initialSummary);
        if (!['bottom', 'picker'].includes(c.state)) await page.evaluate(() => { document.activeElement?.blur(); for (const e of document.querySelectorAll('*')) if (/auto|scroll/.test(getComputedStyle(e).overflowY)) e.scrollTop = 0; });
        if (c.state === 'bottom') await page.getByTestId('commitment-resume-explanation').scrollIntoViewIfNeeded();
        await page.waitForTimeout(100);
        const geometry = await page.evaluate(() => {
          const rect = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom }; };
          const overflow = [], labels = [];
          for (const region of document.querySelectorAll('[data-testid="commitment-resume-summary"],[data-testid="commitment-resume-schedule"],[data-testid="commitment-resume-explanation"]')) {
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
            const label = field.parentElement.querySelector('[dir="auto"]'); if (label) labels.push({ text: label.textContent, label: rect(label), field: rect(field), above: label.getBoundingClientRect().bottom <= field.getBoundingClientRect().top + .5 });
          }
          const buttons = [...document.querySelectorAll('[role="button"]')].filter(e => ['Resume', 'Cancel'].includes(e.getAttribute('aria-label')));
          return { overflow: [...new Set(overflow)], horizontalOverflow: document.documentElement.scrollWidth > innerWidth, labels, header: buttons.map(e => ({ label: e.getAttribute('aria-label'), busy: e.getAttribute('aria-busy'), disabled: e.getAttribute('aria-disabled'), ...rect(e) })), summary: document.querySelector('[data-testid="commitment-resume-summary"]').getAttribute('aria-label') };
        });
        assert.equal(geometry.labels.length, 1, 'one real labeled schedule decision');
        assert.ok(geometry.header.every(b => b.x >= 0 && b.x + b.width <= c.width && b.width >= 48 && b.height >= 48));
        await page.screenshot({ path: path.join(output, c.name + '.png') });
        if (c.scale === 2) { await page.getByTestId('commitment-resume-explanation').scrollIntoViewIfNeeded(); await page.waitForTimeout(100); await page.screenshot({ path: path.join(output, c.name + '-schedule.png') }); }
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

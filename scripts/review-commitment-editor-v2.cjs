/** Real editor interaction/layout evidence; native picker and keyboard are explicit boundaries. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const output = path.resolve('docs/previews/commitment-editor-v2'); fs.mkdirSync(output, { recursive: true });
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true });
  const cases = [], checks = [];
  for (const theme of ['dark', 'light']) {
    for (const kind of ['bill', 'subscription', 'installment']) for (const mode of ['new', 'edit']) cases.push({ name: `${mode}-${kind}-${theme}`, scenario: `${mode}-${kind}`, width: 390, theme, scale: 1 });
    for (const width of [320, 430]) cases.push({ name: `new-bill-${width}-${theme}`, scenario: 'new-bill', width, theme, scale: 1 });
    for (const width of [320, 390, 430]) for (const scale of [1, 2]) cases.push({ name: `stress-${width}-${theme}-${scale}`, scenario: 'new-installment', width, theme, scale, stress: true });
  }
  for (const state of ['empty', 'invalid-amount', 'invalid-count', 'invalid-date', 'category', 'date', 'keyboard', 'bottom', 'save-error']) cases.push({ name: state, scenario: state === 'save-error' ? state : 'new-bill', width: 390, theme: 'dark', scale: 1, state });
  try {
    for (const c of cases) {
      const page = await browser.newPage({ viewport: { width: c.width, height: c.scale === 2 ? 1400 : 1050 }, colorScheme: c.theme, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      try {
        const params = new URLSearchParams({ scenario: c.scenario }); if (c.scale === 2) params.set('large', ''); if (c.state === 'keyboard') params.set('keyboard', ''); if (c.state === 'invalid-date') params.set('web', '');
        await page.goto(pathToFileURL(path.resolve('dist/commitment-editor-v2-preview/index.html')).href + '?' + params);
        await page.getByTestId('editor-section-commitment').waitFor(); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(150);
        const title = page.getByRole('textbox', { name: 'Title, required', exact: true });
        const installment = c.scenario.endsWith('installment');
        if (installment && c.scenario.startsWith('new')) await page.getByRole('radio', { name: 'Type *: Installment', exact: true }).click();
        if (c.scenario === 'new-subscription') await page.getByRole('radio', { name: 'Type *: Subscription', exact: true }).click();
        const amount = page.getByRole('textbox', { name: installment ? 'Installment amount *' : 'Expected amount *', exact: true });
        if (c.stress) {
          await title.fill('Very long household commitment title describing a purchase and its complete purpose '.repeat(3)); await amount.fill('90.071.992.547.409,91');
          await page.getByRole('textbox', { name: 'Number of installments *', exact: true }).fill('1200');
          await page.getByRole('combobox', { name: 'Category', exact: true }).click();
          await page.getByRole('radio', { name: 'Long active household education and entertainment category', exact: true }).click();
        }
        if (c.scenario.startsWith('edit-')) { const value = await title.inputValue(); await title.fill(value + ' '); await title.fill(value); }
        if (c.state === 'empty') await page.getByRole('button', { name: 'Save', exact: true }).click();
        if (c.state === 'invalid-amount') { await title.fill('Invalid amount draft'); await amount.fill('-1'); await page.getByRole('button', { name: 'Save', exact: true }).click(); }
        if (c.state === 'invalid-count') {
          await page.getByRole('radio', { name: 'Type *: Installment', exact: true }).click(); await title.fill('Invalid count draft');
          await page.getByRole('textbox', { name: 'Installment amount *', exact: true }).fill('180'); await page.getByRole('textbox', { name: 'Number of installments *', exact: true }).fill('1201'); await page.getByRole('button', { name: 'Save', exact: true }).click();
        }
        if (c.state === 'invalid-date') { await title.fill('Invalid date draft'); await amount.fill('180'); await page.getByRole('textbox', { name: 'First due date *', exact: true }).fill('2026-02-30'); await page.getByRole('button', { name: 'Save', exact: true }).click(); }
        if (c.state === 'save-error') { await title.fill('Preserved failed save draft'); await amount.fill('180'); await page.getByRole('button', { name: 'Save', exact: true }).click(); assert.equal(await title.inputValue(), 'Preserved failed save draft'); }
        if (c.state === 'category') await page.getByRole('combobox', { name: 'Category', exact: true }).click();
        if (c.state === 'date') { await page.getByRole('combobox', { name: 'First due date *', exact: true }).click(); await page.getByLabel('Review native date picker boundary').waitFor(); }
        if (c.state === 'keyboard') { await amount.fill('180,00'); await amount.focus(); }
        if (!['category', 'date', 'keyboard', 'bottom'].includes(c.state)) await page.evaluate(() => {
          document.activeElement?.blur(); for (const e of document.querySelectorAll('*')) if (/auto|scroll/.test(getComputedStyle(e).overflowY)) e.scrollTop = 0;
        });
        if (c.state === 'bottom') await page.getByText('Planned commitments affect Expenses only when you confirm a payment.', { exact: true }).scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
        const geometry = await page.evaluate(() => {
          const rect = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom }; };
          const overflow = [], verticalFields = [];
          for (const section of document.querySelectorAll('[data-testid^="editor-section-"]')) {
            const b = section.getBoundingClientRect();
            for (const e of section.querySelectorAll('*')) {
              const r = e.getBoundingClientRect(); if (r.left < b.left - .5 || r.right > b.right + .5) overflow.push(e.getAttribute('aria-label') || e.textContent);
              if (e.getAttribute('dir') !== 'auto') continue;
              const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
              for (let t = walker.nextNode(); t; t = walker.nextNode()) for (let i = 0; i < t.length; i++) {
                if (/\s/.test(t.textContent[i])) continue; const range = document.createRange(); range.setStart(t, i); range.setEnd(t, i + 1);
                for (const g of range.getClientRects()) if (g.left < b.left - .5 || g.right > b.right + .5) overflow.push(t.textContent);
              }
            }
            for (const field of section.querySelectorAll('input:not([type="date"]),textarea')) {
              const label = field.parentElement.querySelector('[dir="auto"]');
              if (label) verticalFields.push({ label: label.textContent, labelBounds: rect(label), fieldBounds: rect(field), above: label.getBoundingClientRect().bottom <= field.getBoundingClientRect().top + .5 });
            }
          }
          return { overflow: [...new Set(overflow)], horizontalOverflow: document.documentElement.scrollWidth > innerWidth, verticalFields,
            titleSizing: [...document.querySelectorAll('textarea')].map(e => ({ label: e.getAttribute('aria-label'), client: e.clientHeight, scroll: e.scrollHeight, clipped: e.scrollHeight > e.clientHeight + 3 })),
            header: [...document.querySelectorAll('[role="button"]')].filter(e => ['Save', 'Cancel'].includes(e.getAttribute('aria-label'))).map(e => ({ label: e.getAttribute('aria-label'), ...rect(e) })) };
        });
        await page.screenshot({ path: path.join(output, c.name + '.png') });
        if (c.scale === 2) {
          await amount.scrollIntoViewIfNeeded(); await page.waitForTimeout(100); await page.screenshot({ path: path.join(output, `${c.name}-amount.png`) });
          await page.getByText('Planned commitments affect Expenses only when you confirm a payment.', { exact: true }).scrollIntoViewIfNeeded();
          await page.waitForTimeout(100); await page.screenshot({ path: path.join(output, `${c.name}-details.png`) });
        }
        if (c.state === 'date') { await page.getByLabel('Review native date picker boundary').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(output, 'date-scrolled.png') }); }
        if (c.state === 'keyboard') assert.ok(geometry.header.every(b => b.bottom <= 560 && b.x >= 0 && b.x + b.width <= c.width), 'header above simulated keyboard');
        assert.equal(await page.getByRole('textbox', { name: 'Note', exact: true }).count(), 0);
        assert.ok(geometry.verticalFields.length >= 2, `${c.name}: label geometry must be measured`);
        checks.push({ name: c.name, ...geometry, errors });
      } finally { await page.close(); }
    }
    fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify(checks, null, 2));
    const failures = checks.filter(c => c.errors.length || c.horizontalOverflow || c.overflow.length || c.titleSizing.some(t => t.clipped) || c.verticalFields.some(f => !f.above));
    console.log(JSON.stringify({ scenes: cases.length, failures }, null, 2)); assert.equal(failures.length, 0);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

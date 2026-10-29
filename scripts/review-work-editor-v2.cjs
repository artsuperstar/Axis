/** Browser support evidence only: installed native keyboard/picker/OS text scaling still need devices. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const output = path.resolve('docs/previews/work-editor-v2'); fs.mkdirSync(output, { recursive: true });
async function settle(page) { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(180); }
async function top(page) { await page.evaluate(() => { document.activeElement?.blur(); for (const e of document.querySelectorAll('*')) if (/auto|scroll/.test(getComputedStyle(e).overflowY)) e.scrollTop = 0; window.scrollTo(0, 0); }); await settle(page); }
async function section(page, title) { await page.getByTestId(`editor-section-${title}`).evaluate(el => el.scrollIntoView({ block: 'start' })); await settle(page); }
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true });
  const cases = [], checks = [];
  for (const theme of ['dark', 'light']) {
    for (const width of [320, 390, 430]) for (const scale of [1, 2]) cases.push({ name: `stress-fixed-${width}-${theme}-${scale}`, scenario: 'stressFixed', width, theme, scale });
    for (const scenario of ['new-hourly', 'new-fixed', 'editHourly', 'editFixed', 'paid', 'stressHourly']) cases.push({ name: `${scenario}-${theme}`, scenario, width: 390, theme, scale: scenario === 'stressHourly' ? 2 : 1 });
  }
  for (const action of ['missing-title', 'missing-client', 'invalid-duration', 'invalid-rate', 'incomplete', 'client', 'create-client', 'description', 'work-date', 'expected-date', 'clear-date', 'switch-fixed', 'switch-hourly', 'save-error', 'keyboard']) cases.push({ name: action, scenario: 'new-hourly', width: 390, theme: 'dark', scale: 1, action });
  try {
    for (const c of cases.filter(c => !process.env.AXIS_REVIEW_CASE || c.name === process.env.AXIS_REVIEW_CASE)) {
      const page = await browser.newPage({ viewport: { width: c.width, height: 844 }, colorScheme: c.theme, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      try {
        const params = new URLSearchParams({ scenario: c.scenario }); if (c.scale === 2) params.set('large', ''); if (c.action === 'save-error') params.set('saveError', ''); if (c.action === 'keyboard') params.set('keyboard', '');
        await page.goto(pathToFileURL(path.resolve('dist/work-editor-v2-preview/index.html')).href + '?' + params);
        await page.getByTestId('editor-section-job').waitFor(); await settle(page);
        const title = page.getByRole('textbox', { name: 'Job title *', exact: true }), description = page.getByRole('textbox', { name: 'Description', exact: true });
        // Refill saved multiline content so RN Web remeasures after the substituted font-loading/scaling lifecycle.
        const savedDescription = await description.inputValue(); if (savedDescription) { await description.fill(savedDescription + ' '); await description.fill(savedDescription); }
        if (c.scenario === 'new-fixed') await page.getByRole('radio', { name: 'Compensation type *: Fixed', exact: true }).click();
        if (c.action && !['missing-title', 'client', 'create-client'].includes(c.action)) await title.fill('Quarterly stocktake');
        if (c.action && !['missing-title', 'missing-client', 'client', 'create-client'].includes(c.action)) {
          await page.getByRole('combobox', { name: 'Client *', exact: true }).click();
          await page.getByRole('combobox', { name: 'Search client', exact: true }).fill('Independent');
          await page.getByRole('radio', { name: 'Independent studio', exact: true }).click();
        }
        if (c.action === 'missing-title' || c.action === 'missing-client') await page.getByRole('button', { name: 'Save', exact: true }).click();
        if (['invalid-duration', 'invalid-rate', 'save-error', 'switch-fixed', 'switch-hourly'].includes(c.action)) {
          await page.getByRole('textbox', { name: 'Duration, whole hours', exact: true }).fill('2');
          await page.getByRole('textbox', { name: 'Duration, minutes from 0 to 59', exact: true }).fill(c.action === 'invalid-duration' ? '60' : '30');
          await page.getByRole('textbox', { name: 'Hourly rate in reais, required', exact: true }).fill(c.action === 'invalid-rate' ? '-1' : '50,00');
          if (c.action.startsWith('invalid-') || c.action === 'save-error') await page.getByRole('button', { name: 'Save', exact: true }).click();
        }
        if (c.action === 'client' || c.action === 'create-client') {
          await title.fill('Draft retained while choosing client'); await page.getByRole('combobox', { name: 'Client *', exact: true }).click();
          await page.getByRole('combobox', { name: 'Search client', exact: true }).fill(c.action === 'client' ? 'Independent' : 'New local studio');
          if (c.action === 'create-client') { await page.getByRole('button', { name: '+ Create "New local studio"', exact: true }).click(); assert.equal(await title.inputValue(), 'Draft retained while choosing client'); assert.equal(await page.evaluate(() => window.reviewCreated.name), 'New local studio'); }
        }
        if (c.action === 'description') await description.fill(('Complete job description with internal newlines and no imposed character cap.\n').repeat(12));
        if (c.action === 'work-date' || c.action === 'expected-date' || c.action === 'clear-date') {
          await page.getByRole('combobox', { name: c.action === 'work-date' ? 'Work date *' : 'Expected payment date', exact: true }).click();
          if (c.action !== 'work-date') await page.getByLabel('Review native date boundary', { exact: true }).fill('2026-11-15');
          if (c.action === 'clear-date') { await page.getByRole('button', { name: 'Back from expected payment date picker', exact: true }).click(); await page.getByRole('button', { name: 'Clear expected date', exact: true }).click(); }
        }
        if (c.action === 'switch-fixed' || c.action === 'switch-hourly') {
          await page.getByRole('radio', { name: 'Compensation type *: Fixed', exact: true }).click();
          await page.getByRole('textbox', { name: 'Fixed amount in reais, required', exact: true }).fill('900,25');
          if (c.action === 'switch-hourly') { await page.getByRole('radio', { name: 'Compensation type *: Hourly', exact: true }).click(); assert.equal(await page.getByRole('textbox', { name: 'Duration, whole hours', exact: true }).inputValue(), '2'); }
        }
        if (c.action === 'keyboard') { await description.focus(); await description.fill('Draft retained with a simulated keyboard frame.'); }
        if (c.action !== 'client' && c.action !== 'work-date' && c.action !== 'expected-date') await top(page); else await settle(page);
        const geometry = await page.evaluate(() => {
          const overflow = [];
          for (const region of document.querySelectorAll('[data-testid^="editor-section-"]')) {
            const b = region.getBoundingClientRect();
            for (const e of region.querySelectorAll('*')) { const r = e.getBoundingClientRect(); if (r.left < b.left - 1 || r.right > b.right + 1) overflow.push(e.getAttribute('aria-label') || e.textContent);
              if (e.getAttribute('dir') !== 'auto') continue;
              const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
              for (let t = walker.nextNode(); t; t = walker.nextNode()) { const range = document.createRange(); range.selectNodeContents(t); for (const r of range.getClientRects()) if (r.left < b.left - 1 || r.right > b.right + 1) overflow.push(t.textContent); }
            }
          }
          return { overflow: [...new Set(overflow)], horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
            sections: [...document.querySelectorAll('[data-testid^="editor-section-"]')].map(e => e.getAttribute('data-testid')),
            header: [...document.querySelectorAll('[role="button"]')].filter(e => ['Save', 'Cancel'].includes(e.getAttribute('aria-label'))).map(e => { const r = e.getBoundingClientRect(); return { label: e.getAttribute('aria-label'), left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; }),
            multiline: [...document.querySelectorAll('textarea')].map(e => ({ label: e.getAttribute('aria-label'), scrollHeight: e.scrollHeight, clientHeight: e.clientHeight, clipped: e.scrollHeight > e.clientHeight + 3 })),
            earned: document.querySelector('[data-testid="work-editor-earned"]').textContent };
        });
        assert.equal(geometry.sections.length, 4); assert.equal(geometry.header.length, 2);
        assert.ok(geometry.header.every(b => b.left >= 0 && b.right <= c.width && b.width >= 48 && b.height >= 48));
        const [a, b] = geometry.header; assert.ok(Math.min(a.right, b.right) <= Math.max(a.left, b.left) || Math.min(a.bottom, b.bottom) <= Math.max(a.top, b.top));
        if (c.action === 'keyboard') assert.ok(geometry.header.every(b => b.bottom <= 550), 'header remains above substituted keyboard frame');
        await page.screenshot({ path: path.join(output, c.name + '.png') });
        if (!c.action || ['invalid-duration', 'invalid-rate', 'incomplete', 'switch-fixed', 'switch-hourly'].includes(c.action)) {
          await section(page, 'compensation'); await page.screenshot({ path: path.join(output, c.name + '-compensation.png') });
        }
        if (c.scale === 2) {
          await page.getByTestId('work-editor-earned').evaluate(e => e.scrollIntoView({ block: 'center' })); await settle(page);
          await page.screenshot({ path: path.join(output, c.name + '-earned.png') });
        }
        if (!['client', 'work-date', 'expected-date'].includes(c.action)) {
          await page.getByText('Work records money earned. Income is recorded only when you receive a payment.', { exact: true }).evaluate(e => e.scrollIntoView({ block: 'end' })); await settle(page);
          const note = await page.getByText('Work records money earned. Income is recorded only when you receive a payment.', { exact: true }).boundingBox();
          assert.ok(note.y >= 0 && note.y + note.height <= (c.action === 'keyboard' ? 550 : 844), 'bottom note is fully reachable');
          await page.screenshot({ path: path.join(output, c.name + '-bottom.png') });
        }
        checks.push({ name: c.name, ...geometry, errors });
      } finally { await page.close(); }
    }
    fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify(checks, null, 2));
    const failures = checks.filter(c => c.errors.length || c.overflow.length || c.horizontalOverflow || c.multiline.some(m => m.clipped));
    console.log(JSON.stringify({ scenes: checks.length, failures }, null, 2)); assert.equal(failures.length, 0);
    const originals = fs.readdirSync(output).filter(n => n.endsWith('.png') && !n.startsWith('contact-'));
    for (let i = 0; i < originals.length; i += 8) { const p = await browser.newPage({ viewport: { width: 1200, height: 1340 } });
      await p.setContent('<style>body{margin:0;background:#ddd;display:grid;grid-template-columns:repeat(4,300px)}figure{margin:0;padding:4px;box-sizing:border-box;height:670px}figcaption{font:11px sans-serif;height:22px}img{display:block;max-width:290px;height:630px;object-fit:contain;object-position:left top}</style>' + originals.slice(i, i + 8).map(n => '<figure><figcaption>' + n + '</figcaption><img src="data:image/png;base64,' + fs.readFileSync(path.join(output, n)).toString('base64') + '"></figure>').join(''));
      await p.screenshot({ path: path.join(output, 'contact-' + (i / 8 + 1) + '.png'), fullPage: true }); await p.close(); }
    console.log(`${originals.length} originals / ${Math.ceil(originals.length / 8)} galleries`);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

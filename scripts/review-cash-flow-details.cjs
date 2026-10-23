/** Geometry regression for the real RN Web component preview; not native-device proof. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const output = path.resolve('dist/cash-flow-details');
const stressOnly = process.argv.includes('--stress-only');
fs.mkdirSync(output, { recursive: true });

async function inspect(page) {
  return page.evaluate(() => {
    const get = id => document.querySelector(`[data-testid="cash-flow-inspection${id}"]`);
    const panel = get(''), date = get('-date'), values = get('-values'), income = get('-income'), expenses = get('-expenses');
    const nodes = [panel, date, values, income, expenses];
    const stable = !window.detailNodes || nodes.every((node, index) => node === window.detailNodes[index]);
    window.detailNodes = nodes;
    const box = node => node.getBoundingClientRect();
    const p = box(panel), d = box(date), v = box(values), i = box(income), e = box(expenses);
    const overflow = [];
    for (const node of panel.querySelectorAll('*')) {
      const r = box(node);
      if (r.left < p.left - 0.5 || r.right > p.right + 0.5) overflow.push(node.textContent);
      if (node.getAttribute('dir') !== 'auto') continue;
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      for (let text = walker.nextNode(); text; text = walker.nextNode()) for (let index = 0; index < text.length; index++) {
        if (/\s/.test(text.textContent[index])) continue;
        const range = document.createRange(); range.setStart(text, index); range.setEnd(text, index + 1);
        for (const glyph of range.getClientRects()) if (glyph.left < p.left - 0.5 || glyph.right > p.right + 0.5) overflow.push(text.textContent);
      }
    }
    return { stable, direction: getComputedStyle(panel).flexDirection,
      dateFirst: panel.children[0] === date && panel.children[1] === values,
      separateRows: d.bottom <= v.top + 0.5 && i.top >= v.top - 0.5 && e.top >= v.top - 0.5,
      fullDateWidth: Math.abs(d.width - v.width) < 0.5,
      balanced: Math.abs(i.width - e.width) < 0.5,
      arrangement: Math.abs(i.top - e.top) < 0.5 ? 'row' : 'stack',
      date: date.textContent, income: income.textContent, expenses: expenses.textContent,
      clipped: [...panel.querySelectorAll('[dir="auto"]')].some(node => ['hidden', 'clip'].includes(getComputedStyle(node).overflow) || getComputedStyle(node).textOverflow === 'ellipsis'),
      overflow };
  });
}

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true });
  const checks = [];
  try {
    const base = pathToFileURL(path.resolve('dist/finance-overview-v2-review/index.html')).href;
    for (const width of [320, 390, 430]) for (const theme of ['light', 'dark']) for (const fontScale of [1, 2]) for (const scenario of stressOnly ? ['stress'] : ['normal', 'stress']) for (const period of stressOnly ? ['month'] : ['week', 'month', 'year']) {
      const page = await browser.newPage({ viewport: { width, height: 1100 }, colorScheme: theme, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
      try {
        const errors = []; page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${base}?scenario=${scenario}&period=${period}${fontScale === 2 ? '&large' : ''}`);
        const panel = page.getByTestId('cash-flow-inspection'); await panel.waitFor(); await page.evaluate(() => document.fonts.ready);
        const targets = page.locator('[data-testid^="cash-flow-bucket-"]'); const count = await targets.count();
        let arrangement;
        for (const index of stressOnly ? [3] : [...new Set([0, Math.floor(count / 2), count - 1])]) {
          await targets.nth(index).click();
          const label = await targets.nth(index).getAttribute('aria-label');
          const data = await inspect(page);
          arrangement ??= data.arrangement;
          assert.equal(data.arrangement, arrangement, 'Selection must not change the metric arrangement');
          const [date, amounts] = label.split(', Income '); const [income, expenses] = amounts.split(', Expenses ');
          assert.equal(data.date, date); assert.equal(data.income, `Income${income}`); assert.equal(data.expenses, `Expenses${expenses}`);
          checks.push({ width, theme, fontScale, scenario, period, index, errors, ...data });
        }
        if (period === 'month') await panel.screenshot({ path: path.join(output, `${scenario}-${width}-${theme}-${fontScale}.png`) });
      } finally { await page.close(); }
    }
    fs.writeFileSync(path.join(output, stressOnly ? 'geometry-stress-checks.json' : 'geometry-checks.json'), JSON.stringify(checks, null, 2));
    const failures = checks.filter(c => !c.stable || c.direction !== 'column' || !c.dateFirst || !c.separateRows || !c.fullDateWidth || !c.balanced || c.clipped || c.overflow.length || c.errors.length);
    console.log(JSON.stringify({ cases: stressOnly ? 12 : 72, selections: checks.length, failures }, null, 2));
    assert.equal(failures.length, 0);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

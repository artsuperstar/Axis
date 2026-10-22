/** Local review runner; uses an existing external Playwright installation, adds no app dependency. */
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const output = path.resolve('docs/visual-reviews/finance-spending-v21');
fs.mkdirSync(output, { recursive: true });
let browser;

async function inspect(page) {
  return page.evaluate(() => {
    const card = document.querySelector('[data-testid="finance-expense-donut"]');
    const rect = card.getBoundingClientRect(); const style = getComputedStyle(card);
    const left = rect.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
    const right = rect.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight);
    const hidden = element => {
      for (let current = element; current; current = current.parentElement) if (getComputedStyle(current).opacity === '0') return true;
      return false;
    };
    const overflow = [];
    for (const element of card.querySelectorAll('*')) {
      if (hidden(element)) continue;
      const bounds = element.getBoundingClientRect();
      if (bounds.width && (bounds.left < left - 1 || bounds.right > right + 1)) overflow.push({ kind: 'element', text: element.textContent.slice(0, 80), left: bounds.left, right: bounds.right });
      if (element.getAttribute('dir') !== 'auto') continue;
      // Range line boxes may include invisible trailing spaces after wrapping. Inspect actual glyphs.
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      for (let text = walker.nextNode(); text; text = walker.nextNode()) {
        for (let index = 0; index < text.textContent.length; index++) {
          if (/\s/.test(text.textContent[index])) continue;
          const range = document.createRange(); range.setStart(text, index); range.setEnd(text, index + 1);
          for (const glyph of range.getClientRects()) if (glyph.width && (glyph.left < left - 1 || glyph.right > right + 1)) overflow.push({ kind: 'text', text: text.textContent.slice(0, 80), character: text.textContent[index], left: glyph.left, right: glyph.right });
        }
      }
    }
    const list = card.querySelector('[data-testid="finance-spending-breakdown"]').getBoundingClientRect();
    const intro = card.querySelector('[data-testid="finance-spending-intro"]').getBoundingClientRect();
    const image = card.querySelector('[data-testid="expense-donut-svg"]');
    return { overflow, bounds: { left, right }, listWidth: list.width, contentWidth: right - left,
      listBelowIntro: list.top >= intro.bottom - 1, introDirection: getComputedStyle(card.querySelector('[data-testid="finance-spending-intro"]')).flexDirection,
      rows: card.querySelectorAll('[data-testid^="spending-row-"]').length,
      diameter: image.getBoundingClientRect().width, imageDecoded: image.complete && image.naturalWidth > 0,
      exactTotal: card.querySelector('[aria-label^="Total expenses,"]').getAttribute('aria-label'),
      amounts: [...card.querySelectorAll('[data-testid^="spending-row-"]')].map(row => row.getAttribute('aria-label')) };
  });
}

async function main() {
  browser = await chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true });
  const base = pathToFileURL(path.resolve('dist/finance-spending-v21-review/index.html')).href;
  const checks = [];
  const cases = [];
  for (const width of [320, 390, 430]) for (const theme of ['light', 'dark']) for (const large of [false, true]) {
    cases.push({ width, theme, large, scenario: 'stress', expanded: false }, { width, theme, large, scenario: 'stress', expanded: true });
  }
  for (const theme of ['light', 'dark']) for (const scenario of ['normal', 'one', 'five']) cases.push({ width: 390, theme, large: false, scenario, expanded: false });
  for (const item of cases) {
    const page = await browser.newPage({ viewport: { width: item.width, height: 1100 }, colorScheme: item.theme, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}?scenario=${item.scenario}${item.large ? '&large' : ''}`);
    const card = page.locator('[data-testid="finance-expense-donut"]'); await card.waitFor();
    if (item.expanded) await page.getByRole('button', { name: 'View all 8 spending categories' }).click();
    await page.waitForTimeout(150);
    const height = Math.ceil((await card.boundingBox()).height) + 240;
    await page.setViewportSize({ width: item.width, height: Math.max(1100, height) }); await page.waitForTimeout(150);
    await card.scrollIntoViewIfNeeded();
    const data = await inspect(page); checks.push({ ...item, errors, ...data });
    const name = `${item.scenario}-${item.width}-${item.theme}${item.large ? '-large' : ''}${item.expanded ? '-expanded' : ''}`;
    await card.screenshot({ path: path.join(output, `${name}.png`) });
    if (item.scenario === 'normal') {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: path.join(output, `phone-scrolling-${item.theme}.png`) });
    }
    await page.close();
  }
  fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify(checks, null, 2));
  const failures = checks.filter(result => result.overflow.length || result.errors.length || !result.listBelowIntro || Math.abs(result.listWidth - result.contentWidth) > 1 || result.diameter > 104.5 || !result.imageDecoded);
  await browser.close(); browser = null;
  console.log(JSON.stringify({ cases: checks.length, captures: fs.readdirSync(output).filter(name => name.endsWith('.png')).length,
    failures: failures.map(result => ({ width: result.width, theme: result.theme, large: result.large, expanded: result.expanded, scenario: result.scenario, errors: result.errors, overflow: result.overflow.slice(0, 3) })) }, null, 2));
  if (failures.length) process.exitCode = 1;
}
main().catch(async error => { console.error(error); if (browser) await browser.close(); process.exitCode = 1; });

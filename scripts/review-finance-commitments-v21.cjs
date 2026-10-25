/** Equivalent-content RN Web measurements, not native font/gesture certification. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const output = path.resolve('docs/previews/finance-commitments-v21');
const before = process.argv.includes('--before');
const preview = path.resolve(`dist/finance-commitments-v21${before ? '-before' : ''}/index.html`);
fs.mkdirSync(output, { recursive: true });

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true });
  const records = [];
  const scenes = [];
  for (const theme of ['dark', 'light']) {
    for (const width of [320, 390, 430]) scenes.push({ theme, width, scale: 1, scenario: 'upcoming' });
    if (!before) {
      for (const width of [320, 390, 430]) for (const scale of [1, 2]) scenes.push({ theme, width, scale, scenario: 'stress' });
      for (const scenario of ['mixed', 'long-text', 'actions', 'pay', 'details']) scenes.push({ theme, width: 390, scale: 1, scenario });
    }
  }
  try {
    for (const scene of scenes) {
      const { theme, width, scale, scenario } = scene;
      const name = `${before ? 'before' : 'after'}-${scenario}-${width}-${theme}-${scale}`;
      const page = await browser.newPage({ viewport: { width, height: scale === 2 ? 1500 : 1000 }, colorScheme: theme, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      try {
        await page.goto(`${pathToFileURL(preview).href}?scenario=${['actions', 'pay', 'details'].includes(scenario) ? 'upcoming' : scenario}${scale === 2 ? '&large' : ''}`);
        await page.getByTestId('commitment-obligation').first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(300);
        const cards = await page.getByTestId('commitment-obligation').evaluateAll(elements => elements.map(card => {
          const bounds = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
          const info = card.querySelector('[data-testid="commitment-info"]');
          const trailing = card.querySelector('[data-testid="commitment-trailing"]');
          const text = [...card.querySelectorAll('[dir="auto"]')];
          const glyphs = [];
          for (const element of text) {
            const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
            for (let t = walker.nextNode(); t; t = walker.nextNode()) for (let i = 0; i < t.length; i++) {
              if (/\s/.test(t.textContent[i])) continue;
              const range = document.createRange(); range.setStart(t, i); range.setEnd(t, i + 1);
              for (const r of range.getClientRects()) glyphs.push({ x: r.left, right: r.right });
            }
          }
          const b = bounds(card);
          return { title: card.querySelector('[data-testid="commitment-title"]').textContent, amount: card.querySelector('[data-testid="commitment-amount"]').textContent,
            card: b, info: info && bounds(info), trailing: trailing && bounds(trailing), amountBounds: bounds(card.querySelector('[data-testid="commitment-amount"]')),
            targets: [...card.querySelectorAll('[role="button"]')].map(e => ({ label: e.getAttribute('aria-label'), ...bounds(e) })),
            overflow: glyphs.some(r => r.x < b.x - .5 || r.right > b.x + b.width + .5) };
        }));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, name);
        for (const card of cards) {
          assert.equal(card.overflow, false, `${name}: clipped text`);
          if (!before) {
            const controls = card.targets;
            for (const target of controls) assert.ok(target.width >= 47.5 && target.height >= 47.5, `${name}: small target ${target.label}`);
            for (let i = 0; i < controls.length; i++) for (let j = i + 1; j < controls.length; j++) {
              const a = controls[i], b = controls[j];
              assert.ok(Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) <= .5 || Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) <= .5, `${name}: overlapping controls`);
            }
            if (scenario === 'upcoming' && width >= 390) {
              assert.ok(card.trailing.x >= card.info.x + card.info.width + 7.5, `${name}: columns must sit beside each other`);
              assert.ok(Math.abs(card.trailing.y - card.info.y) < 1, `${name}: trailing column must share vertical space`);
              assert.ok(card.amountBounds.x >= card.trailing.x, name);
            }
          }
        }
        if (scenario === 'actions') {
          await page.getByRole('button', { name: /^Actions for Rock in Rio Ticket,/ }).click();
          await page.getByRole('button', { name: /^Skip Rock in Rio Ticket,/ }).waitFor();
          await page.getByRole('button', { name: 'View Rock in Rio Ticket commitment', exact: true }).waitFor();
          assert.equal(await page.getByRole('button', { name: 'View history', exact: true }).count(), 0);
        }
        if (scenario === 'pay') {
          await page.getByRole('button', { name: /^Pay Rock in Rio Ticket,/ }).click();
          await page.getByRole('button', { name: 'Confirm', exact: true }).waitFor();
        }
        if (scenario === 'details') {
          await page.getByRole('button', { name: /^Rock in Rio Ticket, expected / }).click();
          await page.getByRole('button', { name: 'View history', exact: true }).waitFor();
          assert.equal(await page.getByRole('button', { name: 'Confirm', exact: true }).count(), 0);
        }
        await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true });
        if (scale === 2) await page.getByTestId('commitment-obligation').first().screenshot({ path: path.join(output, name + '-card.png') });
        assert.deepEqual(errors, [], name);
        records.push({ name, ...scene, cards, errors });
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(output, before ? 'before.json' : 'after.json'), JSON.stringify(records, null, 2));
  if (!before) {
    const baseline = JSON.parse(fs.readFileSync(path.join(output, 'before.json')));
    const density = baseline.flatMap(old => old.cards.map(card => {
      const next = records.find(r => r.scenario === 'upcoming' && r.width === old.width && r.theme === old.theme).cards.find(c => c.title === card.title);
      const reduction = card.card.height - next.card.height;
      if (old.width >= 390) assert.ok(reduction > 0, `${old.width} ${card.title}: card must get shorter`);
      return { width: old.width, theme: old.theme, title: card.title, before: card.card.height, after: next.card.height, reduction };
    }));
    fs.writeFileSync(path.join(output, 'density.json'), JSON.stringify(density, null, 2));
    console.log(JSON.stringify({ scenes: records.length, density: density.filter(r => r.width === 390 && r.theme === 'dark') }));
  } else console.log(JSON.stringify({ beforeScenes: records.length }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });

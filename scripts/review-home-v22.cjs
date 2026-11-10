const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const output = path.resolve('docs/previews/home-v22'); fs.mkdirSync(output, { recursive: true });
const settle = async page => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(120); };
const launch = () => chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true });
const dimensions = async page => page.getByTestId('home-spent').evaluate(spent => {
  const inner = spent.parentElement.parentElement, content = inner.parentElement, scroll = content.parentElement;
  const rect = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
  return { content: rect(content), inner: rect(inner), viewport: rect(scroll), scrollRange: scroll.scrollHeight - scroll.clientHeight, paddingBottom: getComputedStyle(content).paddingBottom,
    reservation: content.getBoundingClientRect().height - inner.getBoundingClientRect().height - parseFloat(getComputedStyle(content).paddingTop) - parseFloat(getComputedStyle(content).paddingBottom),
    cards: ['today', 'attention', 'fitness', 'journal'].map(id => rect(document.querySelector('[data-testid="home-card-' + id + '"]'))),
    detail: document.querySelector('[data-testid^="home-detail-"]') ? rect(document.querySelector('[data-testid^="home-detail-"]')) : null };
});
async function press(page, id) { await page.getByTestId('home-card-' + id).evaluate(e => e.click()); await settle(page); }
async function verifyBackground(page, theme) {
  const layer = page.getByTestId('home-background'), image = page.getByTestId('home-background-' + theme);
  assert.equal(await image.count(), 1);
  const src = await image.getAttribute('src');
  assert.equal(src.split(',')[1], fs.readFileSync('assets/images/home-v22/' + theme + '.webp').toString('base64'), 'actual theme-specific bundled asset selected');
  const layout = await layer.evaluate(e => {
    const s = getComputedStyle(e), r = e.getBoundingClientRect(), parent = e.parentElement.getBoundingClientRect();
    return { pointerEvents: s.pointerEvents, position: s.position, width: r.width, height: r.height, parentWidth: parent.width, parentHeight: parent.height, viewportHeight: e.parentElement.parentElement.clientHeight };
  });
  assert.equal(layout.pointerEvents, 'none'); assert.equal(layout.position, 'absolute');
  assert.equal(layout.width, layout.parentWidth); assert.ok(layout.height >= layout.parentHeight);
  assert.ok(layout.height >= layout.viewportHeight, 'short content still paints the visible viewport');
  assert.equal(await image.getAttribute('aria-hidden'), 'true');
}
async function main() {
  const browser = await launch(), checks = [], captures = [];
  const scenarios = [
    ['collapsed', 'populated', 390, 1], ['today', 'populated', 390, 1], ['attention', 'populated', 390, 1],
    ['short', 'empty', 390, 1], ['heavy', 'stress', 390, 1], ['heavy-today', 'stress', 390, 1], ['heavy-attention', 'stress', 390, 1],
    ['small', 'populated', 320, 1], ['large', 'populated', 430, 1], ['small-text', 'populated', 320, 2],
    ['text', 'populated', 390, 2], ['large-text', 'populated', 430, 2], ['stacked-today', 'stress', 320, 2], ['stacked-attention', 'stress', 430, 2],
  ];
  try {
    for (const theme of ['dark', 'light']) for (const [name, scenario, width, scale] of scenarios) {
      const pair = {};
      for (const phase of ['before', 'after']) {
        const p = await browser.newPage({ viewport: { width, height: 844 }, colorScheme: theme, locale: 'pt-BR', reducedMotion: 'reduce' });
        const errors = []; p.on('pageerror', e => errors.push(e.message));
        try {
          const folder = phase === 'before' ? 'dist/home-v22-before' : 'dist/home-v2-preview';
          await p.goto(pathToFileURL(path.resolve(folder, 'index.html')).href + `?scenario=${scenario}${scale === 2 ? '&large' : ''}`);
          await p.getByTestId('home-card-today').waitFor(); await settle(p);
          const owner = name.includes('attention') ? 'attention' : name.includes('today') ? 'today' : null;
          if (phase === 'after') { await verifyBackground(p, theme); await p.evaluate(() => { window.originalBackground = document.querySelector('[data-testid^="home-background-"]'); }); }
          if (owner) await press(p, owner);
          pair[phase] = await dimensions(p);
          assert.ok(Math.abs(pair[phase].reservation) < 1); assert.equal(pair[phase].paddingBottom, '32px');
          if (phase === 'after') assert.ok(await p.evaluate(() => window.originalBackground === document.querySelector('[data-testid^="home-background-"]')));
          const filename = `${phase}-${theme}-${name}.png`; await p.screenshot({ path: path.join(output, filename) }); captures.push(filename);
          if (scenario === 'stress') {
            const fixed = phase === 'after' ? await p.getByTestId('home-background').boundingBox() : null;
            await p.getByTestId('home-card-journal').evaluate(e => e.scrollIntoView({ block: 'end' })); await settle(p);
            if (fixed) {
              const moved = await p.getByTestId('home-background').boundingBox();
              assert.equal(moved.height, fixed.height, 'scrolling cannot change background geometry');
            }
            const filename = `${phase}-${theme}-${name}-bottom.png`; await p.screenshot({ path: path.join(output, filename) }); captures.push(filename);
          }
          assert.deepEqual(errors, []);
        } finally { await p.close(); }
      }
      assert.deepEqual(pair.after, pair.before, 'background must not change any measured content/card/panel geometry');
      checks.push({ theme, name, scenario, width, scale, geometry: pair });
    }
    for (const theme of ['dark', 'light']) {
      const p = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: theme, reducedMotion: 'reduce' });
      try {
        await p.goto(pathToFileURL(path.resolve('dist/home-v2-preview/index.html')).href + '?scenario=populated'); await settle(p);
        const initial = await dimensions(p); const other = theme === 'dark' ? 'light' : 'dark';
        await p.emulateMedia({ colorScheme: other }); await p.getByTestId('home-background-' + other).waitFor(); await settle(p);
        await verifyBackground(p, other); assert.deepEqual(await dimensions(p), initial);
        let filename = `after-${theme}-switched-${other}.png`; await p.screenshot({ path: path.join(output, filename) }); captures.push(filename);
        await p.getByTestId('home-background-' + other).evaluate(e => e.dispatchEvent(new Event('error'))); await settle(p);
        assert.equal(await p.locator('[data-testid^="home-background-"]').count(), 0);
        assert.deepEqual(await dimensions(p), initial);
        filename = `after-${theme}-fallback.png`; await p.screenshot({ path: path.join(output, filename) }); captures.push(filename);
        await press(p, 'today'); await press(p, 'fitness');
        assert.equal((await p.evaluate(() => window.reviewNavigation)).target.pathname, '/(tabs)/fitness');
        await press(p, 'journal'); assert.equal((await p.evaluate(() => window.reviewNavigation)).target.pathname, '/journal');
        await p.getByRole('button', { name: 'Add transaction', exact: true }).click(); await p.getByRole('button', { name: 'Save', exact: true }).waitFor();
        checks.push({ theme, action: 'live-theme-switch/fallback/navigation/transaction', passed: true });
      } finally { await p.close(); }
    }
    fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify({ checks, captures, boundary: 'Actual Home via RN Web; source-backed synthetic snapshots; native/font/router/hook/database boundaries substituted. CSS text doubling is not OS Dynamic Type. Unchanged 80px exterior tab proxy. Browser captures are not native device certification.' }, null, 2));
    console.log(`${checks.length} cases / ${captures.length} original captures; intrinsic geometry, source selection, native-first scrolling, theme switch and fallback pass`);
  } finally { await browser.close(); }
  const gallery = await launch();
  try {
    for (let i = 0; i < captures.length; i += 8) {
      const p = await gallery.newPage({ viewport: { width: 1200, height: 1340 } });
      await p.setContent('<style>body{margin:0;background:#ddd;display:grid;grid-template-columns:repeat(4,300px)}figure{margin:0;padding:4px;height:670px;box-sizing:border-box}figcaption{font:11px sans-serif;height:22px}img{max-width:290px;height:630px;object-fit:contain;object-position:left top}</style>' + captures.slice(i, i + 8).map(n => '<figure><figcaption>' + n + '</figcaption><img src="data:image/png;base64,' + fs.readFileSync(path.join(output, n)).toString('base64') + '"></figure>').join(''));
      await p.screenshot({ path: path.join(output, `contact-${i / 8 + 1}.png`) }); await p.close();
    }
  } finally { await gallery.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

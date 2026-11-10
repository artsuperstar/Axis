// Actual RN Web layout measurements. Native insets remain a device verification item.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const phase = process.argv[2] || 'after';
const output = path.resolve('docs/previews/home-whitespace');
fs.mkdirSync(output, { recursive: true });
const settle = async page => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(80); };

async function measure(page) {
  return page.getByTestId('home-spent').evaluate(spent => {
    const inner = spent.parentElement.parentElement;
    const content = inner.parentElement, scroll = content.parentElement;
    const bounds = element => {
      const r = element.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, height: r.height };
    };
    const s = getComputedStyle(content), c = bounds(content), i = bounds(inner);
    const paddingTop = parseFloat(s.paddingTop), paddingBottom = parseFloat(s.paddingBottom);
    const detail = document.querySelector('[data-testid^="home-detail-"]');
    const journal = bounds(document.querySelector('[data-testid="home-card-journal"]'));
    return { contentHeight: c.height, naturalHeight: i.height + paddingTop + paddingBottom,
      reservation: c.height - i.height - paddingTop - paddingBottom,
      tail: c.bottom - journal.bottom, paddingBottom, viewportHeight: scroll.clientHeight,
      scrollHeight: scroll.scrollHeight, scrollTop: scroll.scrollTop,
      today: bounds(document.querySelector('[data-testid="home-card-today"]')),
      attention: bounds(document.querySelector('[data-testid="home-card-attention"]')),
      fitness: bounds(document.querySelector('[data-testid="home-card-fitness"]')),
      journal, detail: detail ? bounds(detail) : null,
      panelCount: document.querySelectorAll('[data-testid^="home-detail-"]').length,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1 };
  });
}
async function press(page, id) {
  // Avoid Playwright auto-scrolling an offscreen card; measure component-induced scrolling.
  await page.getByTestId('home-card-' + id).evaluate(element => element.click());
  await settle(page);
}
async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true,
  });
  const cases = [];
  try {
    for (const theme of ['light', 'dark']) for (const width of [320, 390, 430]) for (const scale of [1, 2]) for (const scenario of ['empty', 'populated', 'stress']) {
      const page = await browser.newPage({ viewport: { width, height: 844 }, colorScheme: theme, reducedMotion: 'reduce', locale: 'pt-BR' });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      try {
        await page.goto(pathToFileURL(path.resolve('dist/home-v2-preview/index.html')).href + `?scenario=${scenario}${scale === 2 ? '&large' : ''}`);
        await settle(page);
        const states = { collapsed: await measure(page) };
        for (const [state, id] of [['today', 'today'], ['attention', 'attention'], ['todayAgain', 'today'], ['collapsedAgain', 'today']]) {
          const before = await measure(page); await press(page, id); states[state] = await measure(page);
          if (!before.detail || before.today.top === before.attention.top || id === 'today') {
            assert.ok(Math.abs(states[state][id].top - before[id].top) < 1, 'selected card stays in position unless an earlier stacked panel is removed');
          }
          assert.equal(states[state].scrollTop, before.scrollTop, 'disclosure does not issue a scroll jump');
        }
        for (const [state, m] of Object.entries(states)) {
          assert.equal(m.horizontalOverflow, false);
          assert.equal(m.panelCount, m.detail ? 1 : 0);
          if (phase === 'after') {
            assert.ok(Math.abs(m.reservation) < 1, `${state}: content must follow its natural height`);
            assert.ok(Math.abs(m.tail - m.paddingBottom) < 1, `${state}: only declared padding follows the last card`);
          }
          if (m.detail) {
            const owner = state === 'attention' ? m.attention : m.today;
            assert.ok(Math.abs(m.detail.top - Math.max(owner.bottom, m.today.top === m.attention.top ? m.attention.bottom : owner.bottom) - 4) < 1);
            assert.ok(m.detail.bottom <= m.fitness.top);
            if (phase === 'after') assert.ok(Math.abs(m.contentHeight - states.collapsed.contentHeight - m.detail.height - 4) < 1, 'only the panel and its gap add height');
          }
        }
        assert.ok(Math.abs(states.collapsed.contentHeight - states.collapsedAgain.contentHeight) < 1, 'collapse restores the original height');
        assert.ok(Math.abs(states.today.contentHeight - states.todayAgain.contentHeight) < 1, 'switching leaves no stale height');
        const detailEnds = {};
        for (const owner of ['today', 'attention']) {
          await press(page, owner);
          detailEnds[owner] = await page.getByTestId('home-detail-' + owner).evaluate(detail => {
            const controls = detail.querySelectorAll('[role="button"],[role="checkbox"]');
            const target = controls[controls.length - 1] || detail.firstElementChild.lastElementChild;
            target.scrollIntoView({ block: 'end' });
            const scroll = document.querySelector('[data-testid="home-spent"]').parentElement.parentElement.parentElement.parentElement;
            const row = target.getBoundingClientRect(), viewport = scroll.getBoundingClientRect();
            return { top: row.top, bottom: row.bottom, height: row.height, viewportTop: viewport.top, viewportBottom: viewport.bottom };
          });
          const end = detailEnds[owner];
          assert.ok(end.bottom <= end.viewportBottom + 1, 'last detail control clears the tab boundary');
          if (end.height <= end.viewportBottom - end.viewportTop) assert.ok(end.top >= end.viewportTop - 1);
          await press(page, owner);
        }
        // At the end, the last actual element must fit above the unchanged tab-clearance proxy.
        const end = await page.getByTestId('home-card-journal').evaluate(element => {
          const scroll = document.querySelector('[data-testid="home-spent"]').parentElement.parentElement.parentElement.parentElement;
          scroll.scrollTop = scroll.scrollHeight;
          return { lastBottom: element.getBoundingClientRect().bottom, viewportBottom: scroll.getBoundingClientRect().bottom, scrollTop: scroll.scrollTop };
        });
        assert.ok(end.lastBottom <= end.viewportBottom + 1);
        // Browser clamps obsolete offsets on collapse; no application scroll command is used.
        await press(page, 'today'); await press(page, 'today');
        const reclamped = await measure(page);
        assert.ok(reclamped.scrollTop <= Math.max(0, reclamped.scrollHeight - reclamped.viewportHeight) + 1);
        assert.ok(Math.abs(reclamped.contentHeight - states.collapsed.contentHeight) < 1);
        for (const id of ['fitness', 'journal']) {
          await press(page, id); assert.equal((await measure(page)).panelCount, 0);
          const target = await page.evaluate(() => window.reviewNavigation.target.pathname);
          assert.equal(target, id === 'journal' ? '/journal' : '/(tabs)/fitness');
        }
        assert.deepEqual(errors, []);
        cases.push({ theme, width, scale, scenario, states, detailEnds, end, errors });
      } finally { await page.close(); }
    }
    fs.writeFileSync(path.join(output, phase + '.json'), JSON.stringify(cases, null, 2));
    console.log(`${phase}: ${cases.length} cases; collapsed / Today / Attention / switch / collapse / end-scroll / navigation passed`);
    console.log(JSON.stringify(cases.filter(c => c.theme === 'dark' && c.width === 390 && c.scale === 1).map(c => ({ scenario: c.scenario, collapsed: c.states.collapsed, today: c.states.today.contentHeight, attention: c.states.attention.contentHeight })), null, 2));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

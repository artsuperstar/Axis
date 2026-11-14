/** Actual RNWeb fields and callbacks; SQLite/source correctness is tested in the focused suite. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const url = pathToFileURL(path.resolve('dist/active-workout-set-editor-atlas/index.html')).href;
const fields = { strength: ['Weight (kg, optional)', 'Reps (optional)'], bodyweight: ['Reps (optional)', 'Added weight (kg, optional)'], duration: ['Minutes (optional)', 'Seconds'], distance: ['Distance (km)', 'Minutes (optional)', 'Seconds'] };
const fixture = JSON.parse(fs.readFileSync('docs/design-system/active-workout-set-editor-v2/fixture.json'));
async function open(page, kind, extra = '') { await page.goto(url + '?case=' + kind + extra); await page.evaluate(() => document.fonts.ready); await page.getByRole('button', { name: 'Save', exact: true }).waitFor(); }
async function geometry(page, kind, keyboard) {
  const topActions = {};
  for (const label of ['Save', 'Cancel']) {
    const bounds = await page.getByRole('button', { name: label, exact: true }).boundingBox(); assert.ok(bounds.height >= 48 && bounds.y >= 0 && bounds.y + bounds.height <= (keyboard ? 520 : 844)); topActions[label] = bounds;
  }
  for (const label of fields[kind === 'keyboard' ? 'distance' : kind]) {
    const field = page.getByRole('textbox', { name: label, exact: true }); await field.focus();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await field.scrollIntoViewIfNeeded();
    await page.waitForFunction(({ label, limit }) => { const input = [...document.querySelectorAll('input')].find(e => e.getAttribute('aria-label') === label); const r = input?.getBoundingClientRect(); return r && r.y >= 0 && r.bottom <= limit + 1; }, { label, limit: keyboard ? 520 : 844 }, { timeout: 3000 });
    const bounds = await field.boundingBox(); assert.ok(bounds.height >= 48 && bounds.y >= 0 && bounds.y + bounds.height <= (keyboard ? 520 : 844) + 1, JSON.stringify({ label, bounds }));
    assert.equal(await field.evaluate(e => getComputedStyle(e).outlineWidth), '2px');
  }
  const last = page.getByRole('button', { name: /^Delete set for / }); await last.scrollIntoViewIfNeeded(); await last.focus();
  const bottom = await last.boundingBox(); assert.ok(bottom.height >= 48 && bottom.y >= 0 && bottom.y + bottom.height <= (keyboard ? 520 : 844) + 1, JSON.stringify(bottom));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  const clipped = await page.evaluate(() => [...document.querySelectorAll('[dir="auto"]')].filter(e => e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 1).map(e => e.textContent)); assert.deepEqual(clipped, []);
  return { topActions, last: bottom, clippedText: clipped };
}
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true }), checks = [];
  try {
    for (const theme of ['dark', 'light']) for (const width of [320, 390, 430]) for (const large of [false, true]) for (const kind of Object.keys(fields)) {
      const page = await browser.newPage({ viewport: { width, height: 844 }, colorScheme: theme, reducedMotion: 'reduce' }), errors = [];
      page.on('pageerror', error => errors.push(error.message)); await open(page, kind, '&keyboard' + (large ? '&large' : ''));
      const bounds = await geometry(page, kind, true); assert.equal(errors.length, 0, errors.join('\n'));
      checks.push({ theme, width, fontScale: large ? 2 : 1, kind, keyboardTopProxy: 520, ...bounds }); await page.close();
    }
    for (const theme of ['dark', 'light']) {
      const longPage = await browser.newPage({ viewport: { width: 320, height: 844 }, colorScheme: theme }); await open(longPage, 'keyboard', '&large&keyboard');
      checks.push({ theme, width: 320, fontScale: 2, kind: 'localized-long-name', keyboardTopProxy: 520, ...await geometry(longPage, 'keyboard', true) }); await longPage.close();
      for (const kind of Object.keys(fields)) {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: theme });
        await open(page, kind); await page.getByRole('button', { name: 'Save', exact: true }).click(); await page.getByRole('button', { name: 'Save', exact: true }).click();
        const saved = await page.evaluate(() => window.reviewWrites); assert.equal(saved.length, 1);
        const source = fixture.session.exercises.find(e => e.measurementType === kind); assert.equal(saved[0].setId, source.sets[0].id); assert.equal(saved[0].sessionExerciseId, source.id); assert.equal(saved[0].sessionId, fixture.session.id);
        await open(page, kind); for (const label of fields[kind]) await page.getByRole('textbox', { name: label, exact: true }).fill('');
        await page.getByRole('button', { name: 'Save', exact: true }).click(); assert.deepEqual((await page.evaluate(() => window.reviewWrites))[0].values, { weightGrams: null, reps: null, durationSeconds: null, distanceMeters: null });
        await open(page, kind); await page.getByRole('textbox', { name: fields[kind][0], exact: true }).fill('99'); await page.getByRole('button', { name: 'Cancel', exact: true }).click(); assert.equal((await page.evaluate(() => window.reviewWrites)).length, 0);
        await page.getByRole('button', { name: /^Delete set for / }).click(); const alert = await page.evaluate(() => ({ title: window.reviewAlert.title, style: window.reviewAlert.buttons.at(-1).style })); assert.equal(alert.title, 'Delete set?'); assert.equal(alert.style, 'destructive');
        await page.evaluate(() => window.reviewAlert.buttons.find(b => b.text === 'Cancel').onPress?.()); assert.equal(await page.evaluate(() => window.reviewDeleted), undefined);
        checks.push({ theme, kind, case: 'same-ID-save-clear-cancel-confirmation-entry', writeCountAfterDoubleSave: saved.length, savedValues: saved[0].values }); await page.close();
      }
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: theme });
      await open(page, 'zero'); await page.getByRole('button', { name: 'Save', exact: true }).click(); assert.equal((await page.evaluate(() => window.reviewWrites))[0].values.weightGrams, 0);
      await open(page, 'distance'); await page.getByRole('radio', { name: 'Distance unit: m', exact: true }).click(); const distance = page.getByRole('textbox', { name: 'Distance (m)', exact: true }); assert.equal(await distance.inputValue(), '');
      await distance.fill('2501'); await page.getByRole('button', { name: 'Save', exact: true }).click(); assert.equal((await page.evaluate(() => window.reviewWrites))[0].values.distanceMeters, 2501);
      checks.push({ theme, case: 'valid-zero-and-unit-conversion', zeroRetained: true, meters: 2501 });
      await open(page, 'invalid'); const weight = page.getByRole('textbox', { name: 'Weight (kg, optional)', exact: true }); await weight.fill('1.2345'); await page.getByRole('button', { name: 'Save', exact: true }).click(); await page.getByRole('alert').waitFor(); await weight.focus();
      assert.equal(await weight.inputValue(), '1.2345'); assert.equal(await weight.evaluate(e => getComputedStyle(e).outlineWidth), '2px'); assert.equal(await weight.getAttribute('aria-invalid'), 'false');
      await open(page, 'strength', '&fail'); await page.getByRole('button', { name: 'Save', exact: true }).click(); await page.getByRole('alert').waitFor(); assert.equal((await page.evaluate(() => window.reviewWrites)).length, 0);
      await open(page, 'refresh'); const dirty = page.getByRole('textbox', { name: 'Weight (kg, optional)', exact: true }); await dirty.fill('31,5'); await dirty.evaluate(e => { window.reviewInput = e; });
      await page.getByRole('button', { name: 'Retry refresh', exact: true }).click(); assert.equal(await dirty.inputValue(), '31,5'); assert.equal(await page.evaluate(() => window.reviewRetry), true);
      await page.emulateMedia({ colorScheme: theme === 'dark' ? 'light' : 'dark' }); assert.equal(await dirty.inputValue(), '31,5'); assert.equal(await dirty.evaluate(e => e === window.reviewInput), true);
      checks.push({ theme, case: 'form-error-focus-source-error-refresh-mounted-theme', invalidState: 'Existing form-level alert; no field-specific mapping', dirtyDraftRetained: true }); await page.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync('docs/design-system/active-workout-set-editor-v2/interactions.json', JSON.stringify({ scope: 'Actual RNWeb SetEditor/shared fields, source-generated fixture; text/keyboard proxies and callback adapters, native acceptance separate', checks }, null, 2));
  console.log(checks.length + ' browser groups passed');
}
main().catch(error => { console.error(error); process.exitCode = 1; });

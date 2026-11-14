/** Fresh atlas only. Never writes existing feature-review evidence or application files. */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { Buffer } = require('node:buffer');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const output = path.resolve('docs/design-system/atlas'); fs.mkdirSync(output, { recursive: true });
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const settle = async page => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(180); };
function provenance(file) {
  const png = fs.readFileSync(file), text = Buffer.from('Origin\0Axis Phase 1 audit. Actual source components rendered via React Native Web, synthetic fixture data, substituted native/font/router/safe-area/data boundaries. CSS doubled text is not OS Dynamic Type; no native chrome or hardware acceptance.');
  const payload = Buffer.concat([Buffer.from('tEXt'), text]); let crc = 0xffffffff;
  for (const byte of payload) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  const size = Buffer.alloc(4), checksum = Buffer.alloc(4); size.writeUInt32BE(text.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  fs.writeFileSync(file, Buffer.concat([png.subarray(0, 33), size, payload, checksum, png.subarray(33)]));
}
const cases = [];
function add(id, dir, query = '', steps = [], extra = {}) { cases.push({ id, dir, query, steps, width: 390, ...extra }); }
add('home', 'home-v2-preview'); add('home-today', 'home-v2-preview', '', ['test:home-card-today']); add('home-attention', 'home-v2-preview', '', ['test:home-card-attention']);
add('home-empty', 'home-v2-preview', 'scenario=empty'); add('home-error', 'home-v2-preview', 'error'); add('home-loading', 'home-v2-preview', 'loading');
add('tasks', 'tasks-fidelity-after', '', [], { staticFile: 'tasks-{theme}-390-normal.html', static: true });
add('task-new', 'new-task-review'); add('task-categories', 'new-task-review', 'surface=categories&populated'); add('task-repeating', 'new-task-review', 'surface=repeating'); add('task-history', 'new-task-review', 'surface=history');
add('calendar', 'calendar-review'); add('calendar-empty', 'calendar-review', 'empty');
add('finance-overview', 'finance-overview-v2-review'); add('finance-overview-empty', 'finance-overview-v2-review', 'scenario=empty');
add('transactions', 'transactions-v22-preview'); add('transactions-empty', 'transactions-v22-preview', 'scenario=empty'); add('transaction-new', 'transaction-editor-v2-preview'); add('transaction-edit', 'transaction-editor-v2-preview', 'scenario=edit');
add('finance-categories', 'finance-categories-v2-preview');
add('commitments', 'finance-commitments-v2-preview'); add('commitments-manage', 'finance-commitments-v2-preview', '', ['role:Commitment options', 'role:Manage commitments']);
add('commitment-new', 'commitment-editor-v2-preview', 'scenario=new-bill'); add('commitment-edit', 'commitment-editor-v2-preview', 'scenario=edit-bill'); add('commitment-payment', 'commitment-payment-v2-preview'); add('commitment-resume', 'commitment-resume-v2-preview');
add('commitment-details', 'commitment-details-v2-preview'); add('commitment-history', 'commitment-history-v2-preview'); add('commitment-global-history', 'commitment-history-index-v2-preview', '', ['role:Commitment options', 'role:History']);
add('work', 'work-v2-preview'); add('work-new', 'work-editor-v2-preview'); add('work-edit', 'work-editor-v2-preview', 'scenario=editHourly'); add('work-payment', 'work-payment-v2-preview', 'selected');
add('work-job', 'job-details-v2-preview'); add('work-clients', 'clients-v2-preview'); add('work-client', 'client-details-v2-preview', '', ['client']); add('work-history', 'work-history-v2-preview');
add('work-client-history', 'client-details-v2-preview', 'scenario=partial', ['client', 'test:client-history-navigation']);
add('fitness-workout', 'workout-review', '', [], { staticFile: 'landing-{theme}-390.html', static: true });
add('fitness-active', 'workout-review', '', [], { staticFile: 'active-{theme}-390.html', static: true });
add('fitness-routines', 'routines-review', '', ['role:Routines']);
add('fitness-routine-editor', 'routine-editor-review', '', ['role:Routines', 'routine']);
add('fitness-exercises', 'exercises-review', '', ['role:Exercises']);
add('fitness-history', 'history-review', '', ['role:History']); add('fitness-completed', 'history-review', '', ['role:History', 'first-test:workout-history-row-']);
add('fitness-rotations', 'rotations-review'); add('fitness-rotation-editor', 'rotations-review', 'editor&edit');
add('journal', 'journal-review', 'selected'); add('journal-context', 'journal-review', 'context&manyTasks'); add('journal-history', 'journal-review', 'history');
for (const scene of ['task-edit', 'task-actions', 'occurrence-history', 'linked', 'set', 'note', 'add-exercise', 'refresh', 'controls']) add(`aux-${scene}`, 'visual-audit-auxiliary', `scene=${scene}`, [], { componentOnly: true });
add('transactions-menu', 'transactions-v22-preview', '', ['role:Transaction options for ChatGPT']);
add('transaction-category-menu', 'transaction-editor-v2-preview', '', ['combobox:Category']);
add('finance-categories-custom', 'finance-categories-v2-preview', '', ['radio:Category origin: Custom']);
add('finance-categories-archived', 'finance-categories-v2-preview', '', ['radio:Category origin: Custom', 'radio:Custom category status: Archived']);
// Responsive breadth is concentrated on representative dense surfaces, not every near-identical screen.
for (const id of ['home-attention', 'calendar', 'finance-overview', 'transactions', 'work-client', 'fitness-routine-editor', 'journal-context']) {
  const base = cases.find(c => c.id === id);
  cases.push({ ...base, id: `${id}-320-double`, width: 320, query: [base.query, 'large'].filter(Boolean).join('&'), scale: 2 });
  cases.push({ ...base, id: `${id}-430`, width: 430 });
}
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true });
  const manifest = process.argv.includes('--retry') ? JSON.parse(fs.readFileSync(path.join(output, 'manifest.json'), 'utf8')) : { sourceHead: JSON.parse(fs.readFileSync('docs/design-system/source-inventory.json', 'utf8')).gitHead, generatedAt: new Date().toISOString(), cases: [] };
  try {
    for (const theme of ['dark', 'light']) for (const c of cases) {
      if (process.argv.includes('--retry') && manifest.cases.some(row => row.id === c.id && row.theme === theme && row.status === 'captured')) continue;
      const page = await browser.newPage({ viewport: { width: c.width, height: 844 }, colorScheme: theme, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce' });
      page.setDefaultTimeout(2500); const errors = []; page.on('pageerror', e => errors.push(e.message));
      const file = path.resolve('dist', c.dir, (c.staticFile || 'index.html').replace('{theme}', theme));
      const record = { ...c, theme, file: `${c.id}-${theme}.png`, builderFile: file.replaceAll('\\', '/'), errors };
      try {
        record.entryHash = hash(file); const bundle = path.join(path.dirname(file), 'app.js'); if (fs.existsSync(bundle)) record.bundleHash = hash(bundle);
        await page.goto(pathToFileURL(file).href + (c.query ? '?' + c.query : '')); await settle(page);
        for (const step of c.steps) {
          if (step === 'client') await page.getByRole('button', { name: /^Open .* details$/ }).first().click();
          else if (step === 'routine') { const row = page.locator('[data-testid^="routine-card-"]').first(); await row.getByRole('button', { name: /^Open / }).first().click(); }
          else if (step.startsWith('role:')) await page.getByRole('button', { name: step.slice(5), exact: true }).first().click();
          else if (step.startsWith('combobox:')) await page.getByRole('combobox', { name: step.slice(9), exact: true }).first().click();
          else if (step.startsWith('radio:')) await page.getByRole('radio', { name: step.slice(6), exact: true }).first().click();
          else if (step.startsWith('first-test:')) await page.locator(`[data-testid^="${step.slice(11)}"]`).first().click();
          else await page.getByTestId(step.slice(5)).click();
          await settle(page);
        }
        const body = (await page.locator('body').innerText()).trim(); if (body.length < 8) throw Error('Blank capture'); if (errors.length) throw Error(errors.join('; '));
        record.textSample = body.slice(0, 240); record.viewport = { width: c.width, height: 844 }; record.status = 'captured';
        record.geometry = await page.evaluate(() => ({ bodyWidth: document.body.scrollWidth, innerWidth,
          visibleButtons: [...document.querySelectorAll('[role="button"]')].map(e => { const r = e.getBoundingClientRect(); return { name: e.getAttribute('aria-label') || e.textContent, width: r.width, height: r.height, top: r.top, bottom: r.bottom }; }).filter(r => r.bottom > 0 && r.top < innerHeight) }));
        await page.screenshot({ path: path.join(output, record.file) }); provenance(path.join(output, record.file));
      } catch (error) { record.status = 'unavailable'; record.reason = String(error); console.log(`${c.id}/${theme}: ${record.reason.slice(0, 130)}`); }
      finally { manifest.cases = manifest.cases.filter(row => row.id !== c.id || row.theme !== theme); manifest.cases.push(record); fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2)); await page.close(); }
    }
    const captured = manifest.cases.filter(c => c.status === 'captured');
    for (let i = 0; i < captured.length; i += 8) {
      const page = await browser.newPage({ viewport: { width: 1200, height: 1340 } });
      await page.setContent('<style>body{margin:0;background:#ddd;display:grid;grid-template-columns:repeat(4,300px)}figure{margin:0;padding:4px;height:670px;box-sizing:border-box}figcaption{font:11px sans-serif;height:22px}img{display:block;max-width:290px;height:630px;object-fit:contain;object-position:left top}</style>' + captured.slice(i, i + 8).map(c => `<figure><figcaption>${escape(c.id)} / ${c.theme}</figcaption><img src="data:image/png;base64,${fs.readFileSync(path.join(output, c.file)).toString('base64')}"></figure>`).join(''));
      const name = `contact-${i / 8 + 1}.png`; await page.screenshot({ path: path.join(output, name) }); provenance(path.join(output, name)); await page.close();
    }
    const groups = { 'headers': ['home', 'tasks', 'calendar', 'finance-overview', 'fitness-workout', 'journal'], 'financial': ['finance-overview', 'work', 'work-job', 'work-client'], 'sheets': ['transaction-new', 'work-new', 'commitment-new', 'aux-linked'], 'legacy': ['aux-task-edit', 'aux-task-actions', 'commitments-manage', 'aux-set', 'aux-note', 'aux-add-exercise', 'aux-refresh', 'aux-controls'] };
    for (const [name, ids] of Object.entries(groups)) {
      const subset = captured.filter(c => ids.includes(c.id) && c.theme === 'dark'), page = await browser.newPage({ viewport: { width: Math.min(subset.length, 4) * 300, height: 1340 } });
      await page.setContent('<style>body{margin:0;background:#ddd;display:grid;grid-template-columns:repeat(4,300px)}figure{margin:0;padding:4px;height:670px}figcaption{font:11px sans-serif;height:22px}img{width:290px;height:630px;object-fit:contain;object-position:left top}</style>' + subset.map(c => `<figure><figcaption>${escape(c.id)}</figcaption><img src="data:image/png;base64,${fs.readFileSync(path.join(output, c.file)).toString('base64')}"></figure>`).join(''));
      const file = path.join(output, `compare-${name}.png`); await page.screenshot({ path: file, fullPage: true }); provenance(file); await page.close();
    }
    fs.writeFileSync(path.join(output, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Axis current UI atlas</title><style>body{font:16px system-ui;background:#f5f0ea;color:#241e1c;margin:24px}nav{display:flex;gap:20px;flex-wrap:wrap}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:20px}figure{margin:0}img{width:100%;max-width:390px}a{color:#68344e}</style><h1>Axis — current UI atlas</h1><p>Fresh source renders; synthetic fixtures; RNWeb, not native verification. ${captured.length} captures / ${manifest.cases.length} attempted. No palette proposal is applied here.</p><nav><a href="../visual-unification-audit.md">Audit report</a><a href="../palette-candidates.html">Palette candidates</a><a href="manifest.json">Capture manifest</a></nav><h2>Equivalent patterns</h2>${Object.keys(groups).map(n => `<a href="compare-${n}.png">${n}</a> `).join('')}<h2>Current surfaces</h2><div class="grid">${manifest.cases.map(c => `<figure><figcaption>${escape(c.id)} / ${c.theme} / ${c.width}px${c.scale ? ' / CSS 2×' : ''}</figcaption>${c.status === 'captured' ? `<a href="${c.file}"><img loading="lazy" src="${c.file}" alt="${escape(c.id)} current ${c.theme} appearance"></a>` : `<p>Unavailable: ${escape(c.reason)}</p>`}</figure>`).join('')}</div>`);
    console.log(`${captured.length}/${manifest.cases.length} captured`);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

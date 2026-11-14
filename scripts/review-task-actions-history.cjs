const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const phase = process.argv[2], folder = 'docs/design-system/task-actions-history-v2';
assert.ok(['before', 'slice1', 'after'].includes(phase));
const target = phase === 'before' ? 'before' : 'after';
fs.mkdirSync(folder + '/' + target, { recursive: true });
const cases = [['actions', 390], ['actions-completed', 390], ['actions-recurring', 390], ['actions-stopped', 390], ['actions-long', 320], ['history', 390], ['history-empty', 320], ['history-error', 390], ['history-paged', 430], ['history-long', 320], ['edit', 390], ['main', 390], ['calendar', 390], ['unrelated', 390]];
async function main() {
    const browser = await chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true });
    const rows = phase === 'after' ? JSON.parse(fs.readFileSync(folder + '/slice1.json')) : [];
    try {
        for (const theme of ['dark', 'light'])
            for (const [kind, width] of cases) {
                if (phase === 'slice1' && !kind.startsWith('actions'))
                    continue;
                if (phase === 'after' && kind.startsWith('actions'))
                    continue;
                const page = await browser.newPage({ viewport: { width, height: 844 }, colorScheme: theme, reducedMotion: 'reduce' });
                const errors = [];
                page.on('pageerror', e => errors.push(e.message));
                await page.goto(pathToFileURL(path.resolve('dist/task-actions-history-atlas/index.html')).href + '?case=' + kind + (kind.endsWith('long') ? '&large' : ''));
                await page.evaluate(() => document.fonts.ready);
                await page.waitForTimeout(120);
                if (kind === 'history-paged') {
                    await page.getByRole('button', { name: 'Load older history', exact: true }).click();
                    await page.getByText('Previous schedule', { exact: false }).first().scrollIntoViewIfNeeded();
                }
                assert.equal(errors.length, 0, errors.join('\n'));
                const geometry = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, controls: [...document.querySelectorAll('[role="button"],button,[role="heading"]')].map(e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e), t = e.querySelector('[dir="auto"]'), ts = getComputedStyle(t || e); return { role: e.getAttribute('role') || e.tagName, label: e.getAttribute('aria-label') || e.textContent, x: r.x, y: r.y, width: r.width, height: r.height, font: ts.fontFamily, fontSize: ts.fontSize, color: ts.color, background: s.backgroundColor, border: s.borderColor }; }) }));
                assert.equal(geometry.overflow, false);
                const file = kind + '-' + theme + '-' + width + '.png';
                await page.screenshot({ path: folder + '/' + target + '/' + file, animations: 'disabled', caret: 'hide' });
                rows.push({ kind, theme, width, file, errors, ...geometry });
                await page.close();
            }
    }
    finally {
        await browser.close();
    }
    fs.writeFileSync(folder + '/' + phase + '.json', JSON.stringify(rows, null, 2));
    if (phase === 'after') {
        const before = JSON.parse(fs.readFileSync(folder + '/before.json'));
        const hash = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
        fs.writeFileSync(folder + '/comparison.json', JSON.stringify(rows.map(r => ({ file: r.file, identical: hash(folder + '/before/' + r.file) === hash(folder + '/after/' + r.file), before: before.find(x => x.file === r.file).controls, after: r.controls })), null, 2));
        fs.writeFileSync(folder + '/index.html', '<!doctype html><meta charset="utf-8"><title>Task Actions and History</title><style>body{font:16px system-ui;background:#eee;color:#222}section{display:inline-block;vertical-align:top;margin:10px}img{width:min(40vw,390px)}h2{font-size:16px}</style><h1>3D-T.2 before / after</h1><p>Actual components, unchanged SQLite fixture access. Native boundaries are browser proxies.</p>' + rows.map(r => '<section><h2>' + r.file + '</h2><img alt="Before ' + r.kind + '" src="before/' + r.file + '"><img alt="After ' + r.kind + '" src="after/' + r.file + '"></section>').join(''));
    }
    console.log(rows.length + ' captures: ' + phase);
}
main().catch(e => { console.error(e); process.exitCode = 1; });

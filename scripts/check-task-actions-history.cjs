const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const slice = process.argv[2];
assert.ok(['actions', 'history'].includes(slice));
async function main() {
    const browser = await chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true }), checks = [];
    try {
        for (const theme of ['dark', 'light'])
            for (const width of [320, 390, 430])
                for (const large of [false, true]) {
                    const page = await browser.newPage({ viewport: { width, height: 844 }, colorScheme: theme, reducedMotion: 'reduce' }), errors = [];
                    page.on('pageerror', e => errors.push(e.message));
                    await page.goto(pathToFileURL(path.resolve('dist/task-actions-history-atlas/index.html')).href + '?case=' + (slice === 'actions' ? (large ? 'actions-long' : 'actions-recurring') : 'history') + (large ? '&large' : ''));
                    await page.evaluate(() => document.fonts.ready);
                    const back = page.getByRole('button', { name: 'Back', exact: true });
                    await back.waitFor();
                    const header = await back.boundingBox();
                    assert.ok(header.height >= 48 && header.y >= 0 && header.y + header.height <= 844);
                    if (slice === 'actions') {
                        const last = page.getByRole('button', { name: /^Delete recurring task / });
                        await last.scrollIntoViewIfNeeded();
                        const bounds = await last.boundingBox();
                        assert.ok(bounds.height >= 48 && bounds.y >= 0 && bounds.y + bounds.height <= 844, JSON.stringify(bounds));
                        await last.focus();
                        assert.equal(await last.evaluate(e => getComputedStyle(e).outlineWidth), '2px');
                        await last.click();
                        assert.equal(await page.evaluate(() => window.reviewAction), 'Native confirmation entry');
                        checks.push({ theme, width, fontScale: large ? 2 : 1, header, last: bounds, result: 'Operational long title reflows; final destructive action reachable; focus visible; original callback reached' });
                    }
                    else {
                        const load = page.getByRole('button', { name: 'Load older history', exact: true });
                        await load.scrollIntoViewIfNeeded();
                        const bottom = await load.boundingBox();
                        assert.ok(bottom.height >= 48 && bottom.y + bottom.height <= 844);
                        await load.click();
                        await page.getByText(/Previous schedule/).first().waitFor();
                        const reads = await page.evaluate(() => window.reviewReads);
                        assert.equal(reads.length, 2);
                        const reopen = page.getByRole('button', { name: /^Reopen / }).first();
                        await reopen.scrollIntoViewIfNeeded();
                        await reopen.click();
                        assert.equal((await page.evaluate(() => window.reviewStatus)).status, 'pending');
                        const final = page.getByRole('button', { name: /^(Complete|Skip|Return to pending) / }).last();
                        await final.scrollIntoViewIfNeeded();
                        const last = await final.boundingBox();
                        assert.ok(last.y >= 0 && last.y + last.height <= 844);
                        checks.push({ theme, width, fontScale: large ? 2 : 1, header, last, reads, result: 'Source paging and status callback retained; previous-version labels visible; last mutable action reachable' });
                    }
                    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
                    assert.equal(errors.length, 0, errors.join('\n'));
                    await page.close();
                }
        for (const theme of ['dark', 'light']) {
            const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: theme, reducedMotion: 'reduce' });
            const scene = slice === 'actions' ? 'actions' : 'history-error';
            await page.goto(pathToFileURL(path.resolve('dist/task-actions-history-atlas/index.html')).href + '?case=' + scene);
            if (slice === 'actions') {
                await page.getByRole('button', { name: /^Edit task / }).click();
                await page.getByRole('textbox', { name: 'Title, required', exact: true }).fill('Unsaved handoff');
                await page.getByRole('button', { name: 'Cancel', exact: true }).click();
                assert.equal(await page.evaluate(() => window.reviewSaved), undefined);
            }
            else {
                await page.getByRole('alert').waitFor();
                await page.getByRole('button', { name: 'Retry', exact: true }).click();
                await page.getByRole('alert').waitFor({ state: 'hidden' });
                assert.equal((await page.evaluate(() => window.reviewReads)).length, 2);
            }
            checks.push({ theme, case: slice === 'actions' ? 'edit-handoff-cancel' : 'history-retry', result: 'Original callback/state contract retained' });
            await page.close();
        }
    }
    finally {
        await browser.close();
    }
    fs.writeFileSync('docs/design-system/task-actions-history-v2/' + slice + '-interactions.json', JSON.stringify({ scope: 'Actual RNWeb components and SQLite-generated fixture; native modal/alert acceptance separate', checks }, null, 2));
    console.log(checks.length + ' ' + slice + ' browser groups passed');
}
main().catch(e => { console.error(e); process.exitCode = 1; });

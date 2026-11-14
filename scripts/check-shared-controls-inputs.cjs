/** Browser interaction evidence for actual shared components, with synthetic callbacks. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
const output = path.resolve('docs/design-system/shared-controls-inputs');
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true });
  const checks = [], renderedContrasts = [];
  try {
    for (const theme of ['dark', 'light']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: theme, reducedMotion: 'reduce' });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      const go = async (kind, extra = '') => { await page.goto(pathToFileURL(path.resolve('dist/shared-controls-inputs/after/shared-controls-atlas/index.html')).href + '?case=' + kind + '&web' + extra); await page.evaluate(() => document.fonts.ready); };
      await go('inputs');
      const input = page.getByRole('textbox', { name: 'Focused input', exact: true });
      await input.fill('Typing remains editable'); assert.equal(await input.inputValue(), 'Typing remains editable');
      const invalid = page.getByRole('textbox', { name: 'Invalid input', exact: true }); await invalid.focus();
      const invalidState = await invalid.evaluate(e => ({ invalid: e.getAttribute('aria-invalid'), error: document.getElementById(e.getAttribute('aria-describedby'))?.textContent, border: getComputedStyle(e).borderColor, outline: getComputedStyle(e).outlineWidth }));
      assert.equal(invalidState.invalid, 'true'); assert.equal(invalidState.error, 'Review this value.'); assert.equal(invalidState.outline, '2px');
      assert.ok((await page.getByRole('textbox', { name: 'Multiline notes' }).boundingBox()).height >= 96);
      checks.push({ theme, family: 'inputs', result: 'Editable typing, linked error, simultaneous focus/invalid and textarea minimum passed', invalidState });
      await go('readonly');
      const readOnly = page.getByRole('textbox', { name: 'Read-only value', exact: true }), disabled = page.getByRole('textbox', { name: 'Disabled value', exact: true });
      assert.equal(await readOnly.getAttribute('readonly'), ''); assert.notEqual(await readOnly.getAttribute('aria-disabled'), 'true'); assert.equal(await disabled.isDisabled(), true);
      checks.push({ theme, family: 'readonly', result: 'Actual values retained; read-only and disabled semantics remain different' });
      await go('select');
      const trigger = page.getByRole('combobox', { name: 'Category', exact: true });
      await trigger.click(); assert.equal(await page.getByRole('dialog').count(), 1);
      await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Category choices');
      await page.keyboard.press('ArrowDown'); await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Personal');
      await page.keyboard.press('End'); await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Create category');
      await page.keyboard.press('Tab'); await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Personal');
      await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({ state: 'detached' });
      await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Category');
      await trigger.click(); const long = 'Studio and independent creative services with a deliberately long saved category name';
      await page.getByRole('radio', { name: long, exact: true }).click(); await page.getByRole('dialog').waitFor({ state: 'detached' });
      assert.equal(await trigger.getAttribute('aria-valuetext'), long);
      await trigger.click(); await page.getByRole('button', { name: 'Create category', exact: true }).click();
      assert.equal(await page.getByRole('dialog').count(), 1);
      await page.getByRole('textbox', { name: 'New category name, required', exact: true }).fill('Community');
      await page.getByRole('button', { name: 'Create category', exact: true }).click(); await page.getByRole('dialog').waitFor({ state: 'detached' });
      assert.equal(await page.evaluate(() => window.reviewCreated), 'Community'); assert.equal(await trigger.getAttribute('aria-valuetext'), long);
      await trigger.click(); await page.getByRole('button', { name: 'Create category', exact: true }).click(); await page.getByRole('button', { name: 'Cancel new category', exact: true }).click();
      await page.getByRole('radio', { name: 'Personal', exact: true }).waitFor(); assert.equal(await page.getByRole('dialog').count(), 1); await page.keyboard.press('Escape');
      checks.push({ theme, family: 'select', result: 'One owner; arrows/End/Tab loop, Escape focus return, saved long value, inline create and cancel passed' });
      await go('autocomplete');
      const client = page.getByRole('combobox', { name: 'Client', exact: true }); await client.click();
      const search = page.getByRole('combobox', { name: 'Search client', exact: true }); await search.fill('No match');
      assert.equal(await page.getByRole('radio').count(), 0); assert.equal(await page.getByRole('dialog').count(), 1);
      await page.getByRole('button', { name: 'Create No match', exact: true }).click(); await page.getByRole('dialog').waitFor({ state: 'detached' });
      assert.equal(await client.getAttribute('aria-valuetext'), 'No match'); assert.equal(await page.evaluate(() => window.reviewCreated), 'No match');
      await client.click(); await page.getByRole('combobox', { name: 'Search client', exact: true }).fill('Work');
      await page.getByRole('radio', { name: 'Workshop', exact: true }).click(); await page.getByRole('dialog').waitFor({ state: 'detached' }); assert.equal(await client.getAttribute('aria-valuetext'), 'Workshop');
      await client.click(); await page.getByRole('combobox', { name: 'Search client', exact: true }).waitFor();
      await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Search client');
      await page.keyboard.press('Escape');
      // RNWeb TextInput stops key propagation before the existing document-level host listener.
      // Record this existing integration limit; do not broaden a visual batch into host keyboard changes.
      const inputEscapeCloses = await page.getByRole('dialog').count() === 0;
      if (!inputEscapeCloses) await page.getByRole('button', { name: 'Dismiss client without saving', exact: true }).click({ position: { x: 2, y: 2 } });
      await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Client');
      checks.push({ theme, family: 'autocomplete', result: 'Empty search, no matches, create, existing selection, one overlay, dismissal and focus return passed; fixture callbacks only', inputEscapeCloses,
        limitation: inputEscapeCloses ? null : 'RNWeb TextInput stops key propagation; existing host document listener does not receive Escape while typing. Host and autocomplete interaction code are unchanged. Revisit in 3B-S.' });
      await go('selections'); const other = page.getByRole('radio', { name: 'Other choice', exact: true });
      await other.focus(); assert.equal(await other.getAttribute('aria-checked'), 'false'); await page.keyboard.press('Enter'); assert.equal(await other.getAttribute('aria-checked'), 'true');
      await page.getByRole('checkbox', { name: 'Tuesday', exact: true }).click(); assert.equal(await page.getByRole('checkbox', { name: 'Tuesday', exact: true }).getAttribute('aria-checked'), 'true');
      checks.push({ theme, family: 'selection', result: 'Focus does not select; Enter activates; weekday full accessible names and checked state retained' });
      for (const width of [320, 390, 430]) for (const large of [false, true]) {
        await page.setViewportSize({ width, height: 844 }); await go('selections', large ? '&large' : '');
        const dimensions = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth })); assert.ok(dimensions.scroll <= width, JSON.stringify(dimensions));
        const targets = await page.locator('[role=radio],[role=checkbox],[role=button]').evaluateAll(nodes => nodes.map(e => ({ label: e.getAttribute('aria-label'), width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height })));
        for (const target of targets) assert.ok(target.width >= 48 && target.height >= 48, JSON.stringify(target));
        checks.push({ theme, family: 'layout', width, fontScale: large ? 2 : 1, result: 'No horizontal document overflow; every selection/navigation target >=48x48', targets });
        for (const kind of ['inputs', 'readonly', 'select']) {
          await go(kind, large ? '&large' : '');
          if (kind === 'select') { await page.getByRole('combobox', { name: 'Category', exact: true }).click(); await page.getByRole('radio', { name: 'Personal', exact: true }).waitFor(); }
          const sizing = await page.locator('input,textarea,[role=combobox],[role=radio],[role=button]').evaluateAll(nodes => nodes.map(e => ({ label: e.getAttribute('aria-label'), width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height })));
          const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth); assert.ok(scrollWidth <= width, `${kind} overflow at ${width}/${large}: ${scrollWidth}`);
          for (const target of sizing) assert.ok(target.width >= 48 && target.height >= 48, JSON.stringify(target));
          checks.push({ theme, family: kind + '-layout', width, fontScale: large ? 2 : 1, result: 'No document overflow; field/select/menu targets >=48x48; saved values retained', targets: sizing });
        }
      }
      assert.deepEqual(errors, []); await page.close();
    }
    const captures = JSON.parse(fs.readFileSync(path.join(output, 'after.json'), 'utf8'));
    const representative = new Set(['task-new','task-edit','fitness','transaction-new','transaction-edit','work-new','work-edit','record-payment','confirm-payment','commitment-editor']);
    for (const capture of captures.filter(c => representative.has(c.id))) {
      const page = await browser.newPage({ viewport: { width: capture.width, height: 844 }, colorScheme: capture.theme, reducedMotion: 'reduce' });
      await page.goto(pathToFileURL(capture.entry).href + '?' + capture.query); await page.evaluate(() => document.fonts.ready);
      const values = await page.locator('input,textarea,[role=combobox]').evaluateAll(nodes => {
        const rgb = text => { const m = text.match(/[\d.]+/g); return m ? m.slice(0,3).map(Number) : [255,255,255]; };
        const luminance = color => { const c=rgb(color).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722; };
        const ratio = (a,b) => (Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
        return nodes.map(node => {
          const style=getComputedStyle(node);let parent=node.parentElement, outside='';
          while(parent){const color=getComputedStyle(parent).backgroundColor;if(color!=='rgba(0, 0, 0, 0)'&&color!=='transparent'){outside=color;break;}parent=parent.parentElement;}
          const inactive=node.hasAttribute('readonly')||node.hasAttribute('disabled')||node.getAttribute('aria-disabled')==='true';
          return {label:node.getAttribute('aria-label'),inside:style.backgroundColor,outside,border:style.borderColor,text:style.color,inactive,
            boundaryInside:ratio(style.borderColor,style.backgroundColor),boundaryOutside:outside?ratio(style.borderColor,outside):null,textContrast:ratio(style.color,style.backgroundColor)};
        });
      });
      for(const value of values){if(!value.inactive){assert.ok(value.boundaryInside>=3,JSON.stringify({capture:capture.file,...value}));if(value.boundaryOutside!==null)assert.ok(value.boundaryOutside>=3,JSON.stringify({capture:capture.file,...value}));}assert.ok(value.textContrast>=4.5,JSON.stringify(value));}
      renderedContrasts.push({capture:capture.file,fields:values}); await page.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(output, 'interaction-validation.json'), JSON.stringify({ scope: 'RNWeb actual shared components; synthetic data; native keyboard and assistive technology still require devices', checks, renderedContrasts }, null, 2));
  console.log(`${checks.length} browser interaction/layout groups and ${renderedContrasts.length} representative rendered-contrast screens passed`);
}
main().catch(e => { console.error(e); process.exitCode = 1; });

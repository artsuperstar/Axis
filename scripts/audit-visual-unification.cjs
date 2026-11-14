/** Phase 1 only: source inventory, fresh review captures and isolated palette proposals. */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto'), cp = require('node:child_process');
const ts = require('typescript');
const root = process.cwd(), output = path.resolve('docs/design-system'), evidence = path.join(output, 'atlas');
fs.mkdirSync(evidence, { recursive: true });
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]); }
const relative = file => path.relative(root, file).replaceAll('\\', '/');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function tokenModule(file) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: name => name === 'react-native' ? { Platform: { select: options => options.ios } } : {} });
  return Object.fromEntries(Object.entries(exports).filter(([, value]) => typeof value !== 'function'));
}
function inventory() {
  const sources = files('src').filter(f => /\.[jt]sx?$/.test(f));
  const records = sources.map(file => {
    const source = fs.readFileSync(file, 'utf8'), ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true), components = [], literals = [], styleNumbers = [], imports = [];
    function line(node) { return ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1; }
    function owner(node) { for (let n = node.parent; n; n = n.parent) if (ts.isFunctionDeclaration(n) && n.name) return n.name.text; return ''; }
    function visit(node) {
      if (ts.isImportDeclaration(node)) imports.push(node.moduleSpecifier.text);
      if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) imports.push(node.moduleSpecifier.text);
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteral(node.arguments[0])) imports.push(node.arguments[0].text);
      if (ts.isStringLiteralLike(node) && /^(#[\da-f]{3,8}|rgba?\(|hsla?\()/i.test(node.text)) literals.push({ line: line(node), value: node.text });
      if (ts.isPropertyAssignment(node) && ts.isNumericLiteral(node.initializer) && /fontSize|lineHeight|letterSpacing|borderRadius|minHeight|padding|gap|width|height/.test(node.name.getText(ast))) styleNumbers.push({ line: line(node), property: node.name.getText(ast), value: Number(node.initializer.text) });
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(ast);
        if (/^[A-Z]/.test(tag)) components.push({ tag, line: line(node), owner: owner(node), props: Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).map(a => [a.name.getText(ast), a.initializer ? ts.isStringLiteral(a.initializer) ? a.initializer.text : a.initializer.getText(ast) : true])) });
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
    return { file: relative(file), sha256: hash(file), imports, components, literals, styleNumbers, legacyHook: /\buseTheme\(/.test(source), designHook: /\buseDesignColors\(/.test(source) };
  });
  const baseline = [...files('src'), ...files('assets'), ...files('docs/previews'), ...['package.json', 'package-lock.json', 'bun.lock', 'app.json', 'PRODUCT.md', 'AGENTS.md'].filter(f => fs.existsSync(f))].map(file => ({ file: relative(file), sha256: hash(file) }));
  const report = { generatedAt: new Date().toISOString(), gitHead: cp.execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    initialWorktree: 'Clean at the first audit read, before adding audit artifacts.', statusAtInventory: cp.execFileSync('git', ['status', '--short'], { encoding: 'utf8' }), tokens: { legacy: tokenModule('src/constants/theme.ts'), v2: tokenModule('src/constants/design-system-v2.ts') },
    routes: records.filter(r => r.file.startsWith('src/app/')), records, baseline };
  fs.writeFileSync(path.join(output, 'source-inventory.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ sources: records.length, routes: report.routes.length, jsxUses: records.reduce((n, r) => n + r.components.length, 0), colorLiterals: records.reduce((n, r) => n + r.literals.length, 0) }));
  const alive = new Set(), by = new Map(records.map(r => [r.file, r]));
  function resolveModule(file, source) {
    const base = source.startsWith('@/') ? `src/${source.slice(2)}` : source.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(file), source)) : null;
    return base ? [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`].find(p => by.has(p)) : null;
  }
  function visit(file) { if (alive.has(file)) return; alive.add(file); for (const source of by.get(file)?.imports ?? []) { const next = resolveModule(file, source); if (next) visit(next); } }
  report.routes.forEach(r => visit(r.file));
  fs.writeFileSync(path.join(output, 'reachability.json'), JSON.stringify({ scope: 'Conservative static module reachability, including route re-exports and literal dynamic imports; not function-level liveness.', reachable: [...alive].sort(), unreferencedModules: records.filter(r => !alive.has(r.file)).map(r => r.file) }, null, 2));
}
const builders = ['home-v2', 'tasks-fidelity', 'new-task', 'calendar', 'finance-charts', 'finance-transactions', 'transaction-editor-v2', 'finance-categories', 'finance-commitments',
  'commitment-editor-v2', 'commitment-payment-v2', 'commitment-resume-v2', 'commitment-details-v2', 'commitment-history-v2', 'commitment-history-index-v2',
  'work-main-v2', 'work-editor-v2', 'work-payment-v2', 'job-details-v2', 'clients-v2', 'client-details-v2', 'work-history-v2',
  'workout', 'routines', 'routine-editor', 'routine-picker', 'exercises', 'fitness-history', 'workout-rotations', 'journal'];
async function builds() {
  const logs = path.resolve('dist/visual-unification-audit'); fs.mkdirSync(logs, { recursive: true });
  const pending = [...builders], results = [];
  async function worker() { while (pending.length) {
    const name = pending.shift(), args = ['--import', 'tsx', `scripts/preview-${name}.ts`, ...(name === 'finance-charts' ? ['--stage2'] : [])];
    const result = await new Promise(resolve => {
      const stream = fs.createWriteStream(path.join(logs, `${name}.log`)); const child = cp.spawn(process.execPath, args, { cwd: root, windowsHide: true, env: { ...process.env, TZ: 'America/Sao_Paulo' } });
      child.stdout.pipe(stream); child.stderr.pipe(stream); child.on('error', error => { stream.end(String(error)); resolve({ name, code: -1, error: String(error) }); });
      child.on('close', code => { stream.end(); resolve({ name, code }); });
    }); results.push(result); fs.writeFileSync(path.join(output, 'preview-builds.json'), JSON.stringify(results, null, 2)); console.log(`${name}: ${result.code}`);
  } }
  await Promise.all([worker(), worker()]);
}
function verify() {
  const report = JSON.parse(fs.readFileSync(path.join(output, 'source-inventory.json'), 'utf8'));
  const changed = report.baseline.filter(row => !fs.existsSync(row.file) || hash(row.file) !== row.sha256);
  if (changed.length) throw Error(`Application/context files changed: ${changed.map(x => x.file).join(', ')}`);
  console.log(`${report.baseline.length} application/asset/config/context hashes unchanged`);
}
function contrasts() {
  const { tokens } = JSON.parse(fs.readFileSync(path.join(output, 'source-inventory.json'), 'utf8'));
  const luminance = hex => {
    const rgb = hex.slice(1).match(/../g).map(value => Number.parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  };
  const rows = [];
  for (const theme of ['light', 'dark']) {
    const p = tokens.v2.DesignColors[theme];
    for (const [role, foreground, background, threshold] of [
      ['body', p.textPrimary, p.group, 4.5], ['metadata', p.textSecondary, p.group, 4.5], ['muted', p.textMuted, p.group, 4.5],
      ['primary button', p.onBrand, p.brandStrong, 4.5], ['selected label', p.brand, p.selected, 4.5],
      ['resting input boundary', p.border, p.surface, 3], ['field fill against group', p.surface, p.group, 3],
      ['strong boundary', p.borderStrong, p.surface, 3], ['fitness button', p.onFitness, p.fitnessAccent, 4.5],
    ]) {
      const a = luminance(foreground), b = luminance(background), ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      rows.push({ theme, role, foreground, background, ratio, threshold, passes: ratio >= threshold });
    }
  }
  fs.writeFileSync(path.join(output, 'current-contrast.json'), JSON.stringify({ scope: 'Opaque sRGB source-token pairs; control-boundary requirement is conditional on boundary identifying the control. No device or whole-app conformance claim.', rows }, null, 2));
  console.log(rows.map(row => `${row.theme} ${row.role}: ${row.ratio.toFixed(2)}:1`).join('\n'));
}
function validate() {
  verify();
  const manifest = JSON.parse(fs.readFileSync(path.join(evidence, 'manifest.json'), 'utf8'));
  const failures = [], links = [];
  for (const row of manifest.cases) {
    const file = path.join(evidence, row.file), bundle = path.join(path.dirname(row.builderFile), 'app.js');
    if (row.status !== 'captured' || row.errors.length) failures.push(`${row.id}/${row.theme}: capture error`);
    if (hash(row.builderFile) !== row.entryHash || row.bundleHash && hash(bundle) !== row.bundleHash) failures.push(`${row.id}/${row.theme}: stale source render`);
    if (!fs.existsSync(file) || fs.readFileSync(file).subarray(1, 4).toString() !== 'PNG') failures.push(`${row.id}/${row.theme}: missing PNG`);
  }
  for (const file of files(output).filter(file => /\.(md|html)$/.test(file))) {
    const source = fs.readFileSync(file, 'utf8');
    const matches = file.endsWith('.md') ? source.matchAll(/\]\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g) : source.matchAll(/(?:href|src)="([^"]+)"/g);
    for (const match of matches) {
      const target = match[1].replace(/^<|>$/g, '').split('#')[0];
      if (!target || /^(https?:|data:)/.test(target)) continue;
      const resolved = path.resolve(path.dirname(file), decodeURI(target));
      const exists = resolved === path.join(output, 'artifact-validation.json') || fs.existsSync(resolved);
      links.push({ file: relative(file), target, exists }); if (!exists) failures.push(`${relative(file)}: missing ${target}`);
    }
  }
  const builds = JSON.parse(fs.readFileSync(path.join(output, 'preview-builds.json'), 'utf8'));
  if (builds.length !== 30 || builds.some(row => row.code !== 0)) failures.push('Incumbent preview build failures');
  const results = { sourceHead: manifest.sourceHead, captures: manifest.cases.length, themes: Object.fromEntries(['dark', 'light'].map(theme => [theme, manifest.cases.filter(row => row.theme === theme).length])), runtimeErrors: manifest.cases.flatMap(row => row.errors).length, freshHtmlAndBundleHashes: !failures.length,
    incumbentBuilders: builds.length, checkedLocalLinks: links.length, baselineFilesUnchanged: JSON.parse(fs.readFileSync(path.join(output, 'source-inventory.json'), 'utf8')).baseline.length, failures, scope: 'Audit artifacts/source preservation only; not native acceptance or application regression testing.' };
  fs.writeFileSync(path.join(output, 'artifact-validation.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results)); if (failures.length) process.exitCode = 1;
}
async function palettes() {
  const { chromium } = require(process.env.AXIS_PLAYWRIGHT_PATH || 'C:/Users/Arthur/Documents/Projects/arquivo-de-agentes/node_modules/playwright-core');
  const { pathToFileURL } = require('node:url');
  const browser = await chromium.launch({ executablePath: process.env.AXIS_CHROMIUM_PATH || 'C:/Users/Arthur/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true });
  const checks = [];
  try { for (const theme of ['dark', 'light']) for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' }), errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(path.join(output, 'palette-candidates.html')).href); await page.evaluate(() => document.fonts.ready);
    await page.locator(`[data-view="${theme}"]`).click();
    const geometry = await page.evaluate(() => { const plate = [...document.querySelectorAll('.plate:not(.hidden)')]; return { count: plate.length, overflow: document.documentElement.scrollWidth > innerWidth, plates: plate.map(p => ({ theme: p.dataset.theme, heading: p.querySelector('h2').textContent, buttonHeight: p.querySelector('.primary').getBoundingClientRect().height })) }; });
    if (geometry.count !== 3 || geometry.overflow || errors.length || geometry.plates.some(p => p.theme !== theme || p.buttonHeight < 48)) throw Error(JSON.stringify({ theme, width, geometry, errors }));
    const selected = page.locator('.plate:not(.hidden)').first().locator('.segments button').last(); await selected.click(); if (await selected.getAttribute('aria-pressed') !== 'true') throw Error('Selected specimen did not update');
    await page.locator('.plate:not(.hidden)').first().locator('.segments button').first().click();
    const file = `palette-${theme}-${width}.png`; await page.screenshot({ path: path.join(output, file), fullPage: true });
    checks.push({ theme, width, file, geometry, errors, scope: 'HTML color proposal, not native UI' }); await page.close();
  } } finally { await browser.close(); }
  const data = JSON.parse(fs.readFileSync(path.join(output, 'palette-candidates.json'), 'utf8'));
  for (const c of data.candidates) for (const [theme, r] of Object.entries(c.contrast)) if (r.primaryText < 4.5 || r.primaryPressedText < 4.5 || r.selectedText < 4.5 || r.body < 4.5 || r.metadata < 4.5 || r.fieldBorder < 3) throw Error(`${c.id}/${theme} contrast`);
  fs.writeFileSync(path.join(output, 'palette-validation.json'), JSON.stringify({ checks, source: 'sRGB token pairs; not native rendered certification' }, null, 2)); console.log('4 palette captures, interaction/reflow/contrast checks pass');
}
if (process.argv[2] === 'inventory') inventory();
if (process.argv[2] === 'verify') verify();
if (process.argv[2] === 'contrasts') contrasts();
if (process.argv[2] === 'validate') validate();
if (process.argv[2] === 'builds') builds().catch(error => { console.error(error); process.exitCode = 1; });
if (process.argv[2] === 'palettes') palettes().catch(error => { console.error(error); process.exitCode = 1; });

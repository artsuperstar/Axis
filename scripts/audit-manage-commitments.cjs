/** Compare this migration with its saved initial working tree and real source predicates. */
const fs = require('node:fs'), cp = require('node:child_process'), crypto = require('node:crypto'), assert = require('node:assert/strict'), ts = require('typescript');
const folder = 'docs/design-system/manage-commitments-v2', scratch = 'dist/manage-commitments-v2', runtime = 'src/features/finance/commitments/components/commitments-view.tsx';
const read = file => { const b = fs.readFileSync(file); return b.toString(b[0] === 255 ? 'utf16le' : 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n'); };
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const initial = JSON.parse(read(folder + '/initial-state.json'));
const changed = initial.files.filter(row => !fs.existsSync(row.file) || hash(row.file) !== row.sha256).map(row => row.file); assert.deepEqual(changed, [runtime]);
function expressions(file, predicate) {
  const source = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), result = [];
  function visit(node) { if (predicate(node)) result.push(node.getText(source)); ts.forEachChild(node, visit); } visit(source); return result;
}
const original = scratch + '/commitments-view.tsx.before';
const functions = n => ts.isFunctionDeclaration(n) && ['run', 'openDetails', 'resume', 'confirm', 'refreshDetails', 'skip', 'categoryLabel', 'progress', 'seriesActions', 'CommitmentSeparator'].includes(n.name?.text);
assert.deepEqual(expressions(original, functions), expressions(runtime, functions));
const handlers = n => ts.isJsxAttribute(n) && /^on[A-Z]/.test(n.name.text); assert.deepEqual(expressions(original, handlers), expressions(runtime, handlers));
const list = n => ts.isVariableDeclaration(n) && ['sections', 'historyItems', 'focused', 'detailPending', 'listSections'].includes(n.name.getText());
assert.deepEqual(expressions(original, list), expressions(runtime, list));
const listProps = n => ts.isJsxAttribute(n) && ['keyExtractor', 'stickySectionHeadersEnabled', 'initialNumToRender', 'maxToRenderPerBatch', 'windowSize', 'removeClippedSubviews', 'contentInsetAdjustmentBehavior', 'contentOffset', 'scrollEventThrottle', 'keyboardShouldPersistTaps', 'keyboardDismissMode'].includes(n.name.text);
assert.deepEqual(expressions(original, listProps), expressions(runtime, listProps));
const lint = phase => JSON.parse(read(scratch + '/' + phase + '-eslint.json')).flatMap(row => row.messages.map(message => ({ file: row.filePath, ...message })));
assert.deepEqual(lint('baseline'), lint('after'));
const before = JSON.parse(read(folder + '/before.json')), after = JSON.parse(read(folder + '/after.json')), pairs = JSON.parse(read(folder + '/comparison.json'));
assert.equal(pairs.length, 24); assert.equal(pairs.filter(row => row.identical).length, 12);
for (const kind of ['overview', 'editor', 'payment', 'history', 'linked', 'other']) for (const theme of ['dark', 'light']) assert.ok(pairs.find(row => row.file === `${kind}-${theme}-390.png`).identical);
const normalize = text => text.replace(/[←⋯]/g, '').replace(/\s+/g, ' ').trim();
for (const row of after) assert.equal(normalize(row.text), normalize(before.find(b => b.file === row.file).text));
assert.ok(pairs.every(row => row.fixtureIdentical));
const interactions = JSON.parse(read(folder + '/interactions.json')); assert.equal(interactions.checks.length, 22);
const validation = {};
for (const name of ['baseline-tests', 'focused', 'regressions', 'after-tests']) {
  const text = read(scratch + '/' + name + '.log'), count = key => Number(text.match(new RegExp('(?:^# |^ℹ )' + key + ' (\\d+)', 'm'))?.[1] || 0);
  validation[name] = { tests: count('tests'), passed: count('pass'), failed: count('fail'), actWarnings: (text.match(/not wrapped in act/g) || []).length }; assert.equal(validation[name].failed, 0);
}
assert.equal(validation['baseline-tests'].tests, 1584); assert.equal(validation['after-tests'].tests, 1601); assert.equal(validation['baseline-tests'].actWarnings, validation['after-tests'].actWarnings);
for (const name of ['baseline-typescript', 'after-typescript', 'changed-eslint', 'focused', 'regressions', 'after-tests', 'export-ios', 'export-android', 'interactions', 'capture-before', 'capture-after']) assert.equal(read(scratch + '/' + name + '.exit').trim(), '0', name);
const loadTs = file => { const exports = {}; new Function('exports', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(exports); return exports; };
const { DesignColors } = loadTs('src/constants/design-system-v2.ts'), { contrast } = loadTs('tests/helpers/soft-copper-contrast.ts'), contrastPairs = {};
for (const mode of ['dark', 'light']) { const c = DesignColors[mode]; contrastPairs[mode] = Object.fromEntries([['title', c.textPrimary, c.canvas], ['row title and amount', c.textPrimary, c.group], ['status and metadata', c.textSecondary, c.group], ['menu action', c.textPrimary, c.surfaceRaised], ['destructive action', c.danger, c.dangerSoft], ['row focus', c.brandFocus, c.group]].map(([label, fg, bg]) => [label, +contrast(fg, bg).toFixed(2)])); }
const git = args => { const result = cp.spawnSync('git', args, { encoding: 'utf8' }); assert.equal(result.status, 0, result.stderr); return result.stdout.trimEnd(); };
git(['diff', '--check']); assert.equal(git(['diff', '--cached', '--name-only']), ''); assert.equal(git(['rev-parse', 'HEAD']), initial.head);
const lines = git(['status', '--porcelain=v1', '--untracked-files=all']).split(/\r?\n/), all = git(['ls-files', '--cached', '--others', '--exclude-standard']).split(/\r?\n/), old = new Set(initial.files.map(row => row.file));
const result = { initialFiles: initial.files.length, preserved: initial.files.length - changed.length, changedInitialFiles: changed, addedFiles: all.filter(file => !old.has(file)), lifecycleFunctionsAndCallbacksUnchanged: true, listDataKeysVirtualizationAndOffsetsUnchanged: true, sharedDomainRoutesAndOtherScreensUnchanged: true, comparisonPairs: pairs.length, preservationPairsIdentical: 12, identicalSourceFixture: true, contentIdenticalIgnoringReplacedIcons: true, browserGroups: interactions.checks.length, contrastPairs, newLintDiagnostics: 0, validation, counts: { modifiedTracked: lines.filter(line => !line.startsWith('??')).length, untracked: lines.filter(line => line.startsWith('??')).length }, staged: false, head: initial.head };
fs.writeFileSync(folder + '/audit.json', JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));

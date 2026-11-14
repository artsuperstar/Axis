/** Verify this phase against its starting tree without treating prior uncommitted work as ours. */
const fs = require('node:fs'), cp = require('node:child_process'), crypto = require('node:crypto'), assert = require('node:assert/strict'), ts = require('typescript');
const folder = 'docs/design-system/linked-transaction-detail-v2', scratch = 'dist/linked-transaction-detail-v2';
const read = file => { const b = fs.readFileSync(file); return b.toString(b[0] === 255 ? 'utf16le' : 'utf8').replace(/^\uFEFF/, ''); };
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const initial = JSON.parse(read(folder + '/initial-state.json')), runtime = 'src/features/finance/components/transaction-detail.tsx';
const changed = initial.files.filter(row => !fs.existsSync(row.file) || hash(row.file) !== row.sha256).map(row => row.file);
assert.deepEqual(changed, [runtime]);
function expressions(file, predicate) {
  const source = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), result = [];
  function visit(node) { if (predicate(node)) result.push(node.getText(source)); ts.forEachChild(node, visit); } visit(source); return result;
}
const handlers = n => ts.isJsxAttribute(n) && ['onPress', 'onDismiss', 'onClosed'].includes(n.name.text);
assert.deepEqual(expressions(scratch + '/transaction-detail.tsx.before', handlers), expressions(runtime, handlers));
const declarations = n => ts.isVariableDeclaration(n) && ['display', 'work'].includes(n.name.getText());
assert.deepEqual(expressions(scratch + '/transaction-detail.tsx.before', declarations), expressions(runtime, declarations));
const lint = phase => JSON.parse(read(scratch + '/' + phase + '-eslint.json')).flatMap(row => row.messages.map(m => ({ file: row.filePath, ...m })));
assert.deepEqual(lint('baseline'), lint('after'));
const pairs = JSON.parse(read(folder + '/comparison.json')); assert.equal(pairs.length, 20);
assert.equal(pairs.filter(r => r.identical).length, 8);
assert.ok(pairs.every(r => r.fixtureIdentical && (r.contentIdentical || r.contentIgnoringReplacedBackGlyphIdentical)));
for (const kind of ['manual', 'editor', 'work-source', 'commitment-source']) for (const theme of ['dark', 'light']) assert.ok(pairs.find(r => r.file === `${kind}-${theme}-390.png`).identical);
const interactions = JSON.parse(read(folder + '/interactions.json')); assert.equal(interactions.checks.length, 42);
const git = args => { const result = cp.spawnSync('git', args, { encoding: 'utf8' }); assert.equal(result.status, 0, result.stderr); return result.stdout.trimEnd(); };
git(['diff', '--check']); assert.equal(git(['diff', '--cached', '--name-only']), ''); assert.equal(git(['rev-parse', 'HEAD']), initial.head);
const lines = git(['status', '--porcelain=v1', '--untracked-files=all']).split(/\r?\n/), all = git(['ls-files', '--cached', '--others', '--exclude-standard']).split(/\r?\n/), old = new Set(initial.files.map(row => row.file));
const validation = {};
for (const name of ['baseline-tests', 'focused', 'regressions', 'after-tests']) {
  const text = read(scratch + '/' + name + '.log');
  const count = key => Number(text.match(new RegExp('(?:^# |^ℹ )' + key + ' (\\d+)', 'm'))?.[1] || 0);
  validation[name] = { tests: count('tests'), passed: count('pass'), failed: count('fail'), actWarnings: (text.match(/not wrapped in act/g) || []).length };
  assert.equal(validation[name].failed, 0);
}
assert.equal(validation['baseline-tests'].tests, 1571); assert.equal(validation['after-tests'].tests, 1584);
assert.equal(validation['baseline-tests'].actWarnings, validation['after-tests'].actWarnings);
for (const name of ['baseline-typescript', 'after-typescript', 'changed-eslint', 'focused', 'regressions', 'after-tests', 'export-ios', 'export-android', 'interactions', 'capture-after']) assert.equal(read(scratch + '/' + name + '.exit').trim(), '0', name);
const result = { initialFiles: initial.files.length, preserved: initial.files.length - changed.length, changedInitialFiles: changed, addedFiles: all.filter(file => !old.has(file)), sourceHandlersAndPresentationInputsUnchanged: true, sharedDomainListsNavigationUnchanged: true, pairedCaptures: pairs.length, preservationPairsIdentical: 8, sourceFixtureIdentical: true, browserGroups: interactions.checks.length, newLintDiagnostics: 0, validation, counts: { modifiedTracked: lines.filter(line => !line.startsWith('??')).length, untracked: lines.filter(line => line.startsWith('??')).length }, staged: false, head: initial.head };
fs.writeFileSync(folder + '/audit.json', JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));

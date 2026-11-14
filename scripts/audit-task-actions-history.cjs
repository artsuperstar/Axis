/** Scope and ownership verification against the saved starting state for 3D-T.2. */
const fs = require('node:fs'), cp = require('node:child_process'), crypto = require('node:crypto'), assert = require('node:assert/strict'), ts = require('typescript');
const folder = 'docs/design-system/task-actions-history-v2', scratch = 'dist/task-actions-history-v2';
const read = p => fs.readFileSync(p, 'utf8'), hash = v => crypto.createHash('sha256').update(v).digest('hex');
const initial = JSON.parse(read(folder + '/initial-state.json'));
const expected = ['src/features/tasks/components/task-actions.tsx', 'src/features/tasks/components/occurrence-history.tsx', 'tests/task-edit-migration.test.ts', 'tests/task-history-v2.test.ts', 'tests/task-row-disclosure.test.ts', 'tests/tasks-experience.test.ts'];
const changed = initial.files.filter(r => !fs.existsSync(r.file) || hash(fs.readFileSync(r.file)) !== r.sha256).map(r => r.file);
assert.deepEqual([...changed].sort(), [...expected].sort());
function nodes(file, predicate) { const source = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), result = []; function visit(n) { if (predicate(n, source))
    result.push(n.getText(source)); ts.forEachChild(n, visit); } visit(source); return result; }
const handlers = (n, s) => ts.isJsxAttribute(n) && ['onPress', 'onDismiss', 'onClosed'].includes(n.name.getText(s));
for (const name of ['task-actions.tsx', 'occurrence-history.tsx'])
    assert.deepEqual(nodes(scratch + '/' + name + '.before', handlers), nodes('src/features/tasks/components/' + name, handlers));
for (const name of ['older', 'change']) {
    const predicate = n => ts.isFunctionDeclaration(n) && n.name?.text === name;
    assert.deepEqual(nodes(scratch + '/occurrence-history.tsx.before', predicate), nodes('src/features/tasks/components/occurrence-history.tsx', predicate));
}
const effect = n => ts.isCallExpression(n) && n.expression.getText() === 'useEffect';
assert.deepEqual(nodes(scratch + '/occurrence-history.tsx.before', effect), nodes('src/features/tasks/components/occurrence-history.tsx', effect));
const tests = {
    'tests/task-history-v2.test.ts': s => s.replace('await act(async () => { await app.tapSet(display.accessibilityLabel); });', 'await app.tapSet(display.accessibilityLabel);').replace('await act(async () => { await app.tapSet(presentation(f, items(app)[0]).accessibilityLabel); });', 'await app.tapSet(presentation(f, items(app)[0]).accessibilityLabel);'),
    'tests/task-row-disclosure.test.ts': s => s.replace('await act(async () => { await app.tapSet(String(body.props.accessibilityLabel)); });', 'await app.tapSet(String(body.props.accessibilityLabel));'),
    'tests/tasks-experience.test.ts': s => s.replace('await act(async () => { closed(); });', 'await act(closed);')
};
for (const [file, restore] of Object.entries(tests))
    assert.equal(hash(restore(read(file))), initial.files.find(f => f.file === file).sha256, 'Only async act wrapping changed: ' + file);
const lint = name => JSON.parse(read(scratch + '/' + name + '-eslint.json')).flatMap(r => r.messages.map(m => ({ file: r.filePath, rule: m.ruleId, line: m.line, column: m.column, message: m.message, severity: m.severity })));
assert.deepEqual(lint('baseline'), lint('after'));
const compare = JSON.parse(read(folder + '/comparison.json'));
assert.equal(compare.length, 28);
assert.equal(compare.filter(r => r.identical).length, 8);
for (const file of ['edit', 'main', 'calendar', 'unrelated'])
    for (const theme of ['dark', 'light'])
        assert.ok(compare.find(r => r.file === `${file}-${theme}-390.png`).identical);
const checkpoint = JSON.parse(read(folder + '/slice1-checkpoint.json'));
assert.equal(checkpoint.taskActionsSha256, hash(fs.readFileSync('src/features/tasks/components/task-actions.tsx')));
assert.equal(checkpoint.historyUnchangedAtCheckpoint, true);
const git = args => { const r = cp.spawnSync('git', args, { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return r.stdout.trimEnd(); };
git(['diff', '--check']);
assert.equal(git(['diff', '--cached', '--name-only']), '');
assert.equal(git(['rev-parse', 'HEAD']), initial.head);
const all = git(['ls-files', '--cached', '--others', '--exclude-standard']).split(/\r?\n/), old = new Set(initial.files.map(r => r.file)), status = git(['status', '--porcelain=v1', '--untracked-files=all']).split(/\r?\n/);
const log = name => { const b = fs.readFileSync(scratch + '/' + name + '.log'); return b.toString(b[0] === 255 ? 'utf16le' : 'utf8'); };
const counts = {};
for (const name of ['baseline-tests', 'slice1-tests', 'slice2-tests', 'after-tests', 'focused-tests', 'warning-correction', 'warning-new-tests']) {
    if (!fs.existsSync(scratch + '/' + name + '.log'))
        continue;
    const t = log(name);
    counts[name] = { tests: Number(t.match(/^# tests (\d+)/m)?.[1] || 0), passed: Number(t.match(/^# pass (\d+)/m)?.[1] || 0), failed: Number(t.match(/^# fail (\d+)/m)?.[1] || 0), actWarnings: (t.match(/not wrapped in act/g) || []).length };
}
const result = { initialFiles: initial.files.length, preserved: initial.files.length - changed.length, changedInitialFiles: changed, addedFiles: all.filter(f => !old.has(f)), sourceHandlersUnchanged: true, historyReadsPagingAndUpdatesUnchanged: true, sharedAndDomainFilesUnchanged: true, independentSliceCheckpoint: checkpoint, pairedCaptures: 28, preservationPairsIdentical: 8, newLintDiagnostics: 0, tests: counts, counts: { modifiedTracked: status.filter(s => !s.startsWith('??')).length, untracked: status.filter(s => s.startsWith('??')).length }, staged: false, head: initial.head };
fs.writeFileSync(folder + '/audit.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));

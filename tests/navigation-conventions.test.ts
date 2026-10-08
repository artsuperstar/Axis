/// <reference types="node" />

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve, relative } from 'node:path';
import { test, type TestContext } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { act, createElement, useState } from 'react';
import ts from 'typescript';

import { seedDefaultCategories } from '../src/database/seed';
import { createFinanceDataAccess } from '../src/features/finance/data';
import { seedFinanceCategories } from '../src/features/finance/seed';
import { bundledMigrations, database } from './helpers/database';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const { AdaptiveModal, AdaptiveSheet } = createRequire(import.meta.url)('../src/components/adaptive-sheet') as typeof import('../src/components/adaptive-sheet');
const router = (runtime.router as { router: { canGoBack: () => boolean } }).router;
async function initialized(t: TestContext) {
  const f = database(); await migrate(f.db, bundledMigrations); seedDefaultCategories(f.db); seedFinanceCategories(f.db);
  t.after(() => f.sqlite.close()); return { ...f, finance: createFinanceDataAccess(f.db, randomUUID) };
}

for (const [name, Screen, label, fallback] of [
  ['Tasks History', screens.TasksHistoryScreen, 'Back to Tasks', '/(tabs)/tasks'],
  ['Repeating Tasks', screens.RepeatingTasksScreen, 'Back to Tasks', '/(tabs)/tasks'],
  ['Work Clients', screens.WorkClientsScreen, 'Back to Work', '/work'],
  ['Work History', screens.WorkHistoryScreen, 'Back to Work', '/work'],
] as const) test(`${name} uses accessible Back, pops an existing route and preserves its direct-entry fallback`, async (t) => {
  const f = await initialized(t); const app = await mount(createElement(Screen), f.db); t.after(app.unmount);
  const back = app.find('FormButton', label);
  assert.equal(back.props.accessibilityLabel, label);
  assert.notEqual(back.props.label, 'Done');
  assert.ok(!app.nodes().some((node) => node.kind === 'FormButton' && node.props?.label === 'Done'));
  assert.ok(!app.nodes().some((node) => node.kind === 'Modal'));
  t.mock.method(router, 'canGoBack', () => true);
  await app.press(label); assert.deepEqual(runtime.fixture.navigation, [{ method: 'back' }]);
  runtime.fixture.navigation.length = 0;
  t.mock.method(router, 'canGoBack', () => false);
  await app.press(label); assert.deepEqual(runtime.fixture.navigation, [{ method: 'replace', target: fallback }]);
});

test('Axis-rendered button/header labels never resolve to Done; domain text and native return keys are excluded', () => {
  const root = resolve('src');
  const files = ts.sys.readDirectory(root, ['.tsx', '.ts'], undefined, ['**/*']);
  const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
  const program = ts.createProgram(files, parsed.options); const checker = program.getTypeChecker();
  function strings(node: ts.Node | undefined, visited = new Set<ts.Node>()): string[] {
    if (!node || visited.has(node)) return []; visited.add(node);
    if (ts.isStringLiteralLike(node)) return [node.text];
    if (ts.isJsxExpression(node) || ts.isParenthesizedExpression(node)) return strings(node.expression, visited);
    if (ts.isConditionalExpression(node)) return [...strings(node.whenTrue, visited), ...strings(node.whenFalse, visited)];
    if (ts.isBinaryExpression(node)) return [...strings(node.left, visited), ...strings(node.right, visited)];
    if (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node)) {
      let symbol = checker.getSymbolAtLocation(node);
      if (symbol?.flags && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
      return (symbol?.declarations ?? []).flatMap((declaration) =>
        ts.isVariableDeclaration(declaration) || ts.isPropertyAssignment(declaration) || ts.isEnumMember(declaration)
          ? strings(declaration.initializer, visited) : []);
    }
    return [];
  }
  const unexpected: string[] = [];
  const selectedFiles = new Set(files.map((file) => resolve(file)));
  let auditedControls = 0;
  for (const file of program.getSourceFiles().filter((file) => selectedFiles.has(resolve(file.fileName)))) {
    function visit(node: ts.Node) {
      if (ts.isJsxAttribute(node) && ['label', 'action'].includes(node.name.getText(file))) {
        const tag = node.parent.parent.tagName.getText(file);
        // Match action controls, not a task's content/title, status option or OS-owned keyboard key.
        if (/(?:Button|Sheet)$/.test(tag)) {
          auditedControls++;
          if (strings(node.initializer).some((value) => value.trim() === 'Done')) {
            unexpected.push(`${relative(process.cwd(), file.fileName)}:${file.getLineAndCharacterOfPosition(node.pos).line + 1}`);
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(file);
  }
  assert.ok(auditedControls > 10, 'Audit must inspect actual application action controls');
  assert.deepEqual(unexpected, []);
});

test('temporary sheet top-left Back dismisses its surface without router navigation or a data write', async (t) => {
  const f = await initialized(t);
  function TemporaryDetail() {
    const [open, setOpen] = useState(true);
    return open ? createElement(AdaptiveModal, { onDismiss: () => setOpen(false), children:
      createElement(AdaptiveSheet, { title: 'Temporary details', onDismiss: () => setOpen(false), children: 'Readable information' }) }) : null;
  }
  const app = await mount(createElement(TemporaryDetail), f.db); t.after(app.unmount);
  const back = app.find('FormButton', 'Back');
  assert.equal(back.parentNode!.childNodes[0], back, 'Return control precedes the title in the header');
  assert.ok(!app.nodes().some((node) => node.props?.label === 'Done'));
  assert.ok(!app.nodes().some((node) => String(node.props?.accessibilityLabel).startsWith('Back to')));
  const dismissed = await f.measureAsync(() => app.press('Back'));
  assert.ok(!app.nodes().some((node) => node.kind === 'Modal'));
  assert.deepEqual(runtime.fixture.navigation, []); assert.equal(dismissed.count, 0);
});

test('Axis picker top-left Back finishes date selection; Cancel discards and Save persists the editor explicitly', async (t) => {
  const f = await initialized(t);
  const platform = (runtime.native as { Platform: { OS: string } }).Platform;
  const previous = platform.OS; platform.OS = 'ios'; t.after(() => { platform.OS = previous; });
  const app = await mount(createElement(screens.FinanceScreen, { initialView: 'transactions' }), f.db); t.after(app.unmount);
  await app.tapSet('Add transaction'); await app.change('Description *', 'Working draft'); await app.change('Amount *', '25,90');
  const modal = app.find('Modal');
  await act(() => (app.find('FormSelect', 'Date *').props.onPress as () => void)()); assert.ok(app.find('DateTimePicker'));
  const back = app.find('FormButton', 'Back from date picker');
  assert.equal(back.parentNode!.childNodes[0], back);
  await app.press('Back from date picker');
  assert.equal(app.find('Modal'), modal); assert.ok(!app.nodes().some((node) => node.kind === 'DateTimePicker'));
  assert.equal(app.find('FormField', 'Description *').props.value, 'Working draft');
  assert.equal(f.finance.readLedgerPage().transactions.length, 0);
  assert.ok(app.find('FormButton', 'Cancel')); assert.ok(app.find('FormButton', 'Save'));
  await app.press('Cancel'); assert.ok(!app.nodes().some((node) => node.kind === 'Modal'));
  assert.equal(f.finance.readLedgerPage().transactions.length, 0); assert.deepEqual(runtime.fixture.navigation, []);
  await app.tapSet('Add transaction'); await app.change('Description *', 'Saved explicitly'); await app.change('Amount *', '25,90'); await app.press('Save');
  assert.equal(f.finance.readLedgerPage().transactions[0].description, 'Saved explicitly');
  assert.equal(f.finance.readLedgerPage().transactions[0].amountMinor, 2590);
  assert.deepEqual(runtime.fixture.navigation, []);
});

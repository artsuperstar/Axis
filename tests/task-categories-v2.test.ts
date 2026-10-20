/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { test, type TestContext } from 'node:test';
import { act, createElement, useState } from 'react';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { taskCategories } from '../src/database/schema';
import { seedDefaultCategories } from '../src/database/seed';
import { createTaskDataAccess } from '../src/features/tasks/data';
import { taskDraft, TaskValidationError } from '../src/features/tasks/form';
import { categoryName } from '../src/features/tasks/grouping';
import { bundledMigrations, database } from './helpers/database';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const { CategoryManager } = createRequire(import.meta.url)('../src/features/tasks/components/category-manager') as typeof import('../src/features/tasks/components/category-manager');
async function fixture(t: TestContext, names: string[] = []) {
  const f = database(); await migrate(f.db, bundledMigrations); seedDefaultCategories(f.db); t.after(() => f.sqlite.close());
  const access = createTaskDataAccess(f.db, randomUUID, () => 1000); names.forEach(access.createCategory);
  let dismissed = 0;
  function Host() {
    const [categories, setCategories] = useState(() => access.read().categories);
    return createElement(CategoryManager, { categories,
      onCreate(name) { access.createCategory(name); setCategories(access.read().categories); },
      onDelete(id) { access.deleteCategory(id); setCategories(access.read().categories); }, onDismiss() { dismissed++; } });
  }
  const app = await mount(createElement(Host), f.db); t.after(app.unmount);
  return { ...f, access, app, dismissed: () => dismissed };
}
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); }); }

for (const scheme of ['light', 'dark']) test(`${scheme}: Categories has distinct creation, custom empty state and protected built-in ownership`, async t => {
  t.mock.method(runtime.native as { useColorScheme: () => string }, 'useColorScheme', () => scheme);
  const { app, access } = await fixture(t);
  assert.deepEqual(app.nodes().filter(node => String(node.props?.testID).startsWith('editor-section-')).map(node => node.props.testID),
    ['editor-section-create category', 'editor-section-your categories', 'editor-section-built-in']);
  assert.ok(app.container.textContent.includes('No custom categories yet.'));
  assert.ok(app.container.textContent.includes('Create a category to group your tasks your way.'));
  assert.equal(app.find('FormField', 'Category name').props.appearance, 'v2');
  assert.equal(app.find('FormButton', 'Back to Tasks').props.icon, 'back');
  assert.equal(app.find('FormButton', 'Create category').props.disabled, true);
  assert.ok(app.find('FormField', 'Category name').props.helperText);
  for (const category of access.read().categories) {
    const row = app.nodes().find(node => node.props?.testID === `task-category-${category.id}`)!;
    assert.equal(row.props.accessible, true); assert.equal(row.props.accessibilityLabel, `${category.name}, Built-in category`);
    assert.notEqual(row.props.accessibilityRole, 'button');
    assert.ok(!app.nodes(row).some(node => node.kind === 'FormButton'));
    assert.throws(() => access.deleteCategory(category.id), /Built-in categories cannot be deleted/);
  }
  assert.equal(app.nodes().filter(node => node.kind === 'Modal').length, 1);
  assert.ok(!app.nodes().some(node => node.props?.label === 'Save'));
});

test('creation remains immediate, normalizes whitespace, clears the field and replaces the empty state', async t => {
  const { app, access } = await fixture(t); const input = app.find('FormField', 'Category name');
  await app.change('Category name', '  Pet   care  '); assert.equal(app.find('FormButton', 'Create category').props.disabled, false);
  await app.press('Create category'); assert.equal(app.find('FormField', 'Category name'), input);
  assert.equal(input.props.value, ''); assert.equal(access.read().categories.filter(row => !row.isDefault).length, 1);
  assert.equal(access.read().categories.find(row => !row.isDefault)!.name, 'Pet care');
  assert.ok(!app.container.textContent.includes('No custom categories yet.'));
  assert.ok(app.find('FormButton', 'Actions for category Pet care')); assert.equal(access.read().tasks.length, 0);
  await app.change('Category name', 'Another');
  await act(() => (input.props.onSubmitEditing as () => void)()); assert.ok(access.read().categories.some(row => row.name === 'Another'));
  assert.equal(input.props.returnKeyType, 'done'); assert.equal(input.props.value, '');
});

test('empty submissions and active duplicate identities retain readable errors/draft; distinct accents still create', async t => {
  const { app, access } = await fixture(t, ['Álvaro']);
  await app.change('Category name', '  '); assert.equal(app.find('FormButton', 'Create category').props.disabled, true);
  await act(() => (app.find('FormField', 'Category name').props.onSubmitEditing as () => void)());
  assert.equal(app.find('FormError').props.message, 'Enter a category name.');
  for (const name of ['ÁLVARO', 'A\u0301lvaro', 'FINANCE']) {
    await app.change('Category name', name); await app.press('Create category');
    assert.equal(app.find('FormField', 'Category name').props.value, name);
    assert.equal(app.find('FormError').props.appearance, 'v2'); assert.match(String(app.find('FormError').props.message), /already exists/);
  }
  await app.change('Category name', 'Alvaro'); await app.press('Create category');
  const names = access.read().categories.filter(row => !row.isDefault); assert.equal(names.length, 2); assert.notEqual(names[0].id, names[1].id);
  assert.ok(!app.nodes().some(node => node.kind === 'FormError'));
});

test('custom overflow only offers existing Delete; outside/Cancel preserve rows; confirmed deletion retains Task references and permits name reuse', async t => {
  const { app, access, db } = await fixture(t, ['Pet care']); const category = access.read().categories.find(row => !row.isDefault)!;
  const taskId = access.createTask({ ...taskDraft(), title: 'Feed pets', categoryId: category.id });
  await app.press('Actions for category Pet care'); await app.tapSet('Close actions for category pet care');
  assert.ok(!app.nodes().some(node => node.props?.accessibilityLabel === 'Delete category Pet care'));
  await app.press('Actions for category Pet care'); assert.ok(app.find('FormButton', 'Delete category Pet care'));
  assert.ok(!app.container.textContent.includes('Rename')); await app.press('Delete category Pet care');
  assert.ok(!app.nodes().some(node => node.props?.accessibilityLabel === 'Delete category Pet care')); await settle();
  assert.match(runtime.fixture.alerts.at(-1)!.message, /will stay, without a category label/);
  await app.confirm('Cancel'); assert.ok(access.read().categories.some(row => row.id === category.id));
  await app.press('Actions for category Pet care'); await app.press('Delete category Pet care'); await settle(); await app.confirm('Delete');
  const task = access.read().tasks.find(row => row.id === taskId)!; assert.equal(task.categoryId, category.id);
  assert.equal(categoryName(task, access.read().categories), null);
  assert.equal(typeof db.select().from(taskCategories).where(eq(taskCategories.id, category.id)).get()!.deletedAt, 'number');
  assert.ok(app.container.textContent.includes('No custom categories yet.'));
  await app.change('Category name', 'Pet care'); await app.press('Create category');
  assert.notEqual(access.read().categories.find(row => row.name === 'Pet care')!.id, category.id);
  assert.equal(categoryName(task, access.read().categories), null);
});

test('delete errors stay in the custom section without losing the creation draft', async t => {
  const { app, access } = await fixture(t, ['Keep']); await app.change('Category name', 'Draft');
  t.mock.method(access, 'deleteCategory', () => { throw new TaskValidationError('Unable to remove this category.'); });
  await app.press('Actions for category Keep'); await app.press('Delete category Keep'); await settle(); await app.confirm('Delete');
  assert.equal(app.find('FormField', 'Category name').props.value, 'Draft');
  assert.equal(app.find('FormError').props.message, 'Unable to remove this category.');
  assert.ok(app.find('FormButton', 'Actions for category Keep')); assert.ok(access.read().categories.some(row => row.name === 'Keep'));
});

test('Back/dismiss closes the manager without a Save step and preserves already-created categories', async t => {
  const { app, access, dismissed } = await fixture(t); await app.change('Category name', 'Immediate'); await app.press('Create category');
  await app.press('Back to Tasks'); assert.equal(dismissed(), 1); assert.ok(access.read().categories.some(row => row.name === 'Immediate'));
});

for (const [width, fontScale] of [[320, 1], [390, 1], [430, 1], [320, 2]] as const) test(`Categories keeps names, ownership and actions available at ${width}pt/font ${fontScale}`, async t => {
  t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width, height: 844, scale: 1, fontScale }));
  const { app } = await fixture(t, ['A very long custom category name for meaningful personal responsibilities']);
  assert.ok(app.find('FormButton', 'Actions for category A very long custom category name for meaningful personal responsibilities'));
  assert.ok(app.find('FormButton', 'Back to Tasks')); assert.ok(app.find('FormField', 'Category name'));
  assert.ok(!app.nodes().some(node => node.props?.numberOfLines === 1));
});

test('many custom categories remain in the single shared scrolling body with built-ins available', async t => {
  const names = Array.from({ length: 100 }, (_, index) => `Category ${String(index).padStart(3, '0')}`);
  const { app } = await fixture(t, names);
  for (const name of [names[0], names.at(-1)!]) assert.ok(app.find('FormButton', `Actions for category ${name}`));
  assert.equal(app.nodes().filter(node => node.kind === 'ScrollView').length, 1);
});

test('summary refresh failure/Retry retains the mounted Categories manager and unsaved name', async t => {
  const f = database(); await migrate(f.db, bundledMigrations); seedDefaultCategories(f.db); t.after(() => f.sqlite.close());
  const app = await mount(createElement(screens.TasksScreen), f.db); t.after(app.unmount);
  await app.press('Task options'); await app.press('Categories'); await settle(); await app.change('Category name', 'Draft category');
  const input = app.find('FormField', 'Category name'); runtime.fixture.failures.add('tasks.read'); await app.resume();
  assert.equal(app.find('FormField', 'Category name'), input); assert.equal(input.props.value, 'Draft category');
  runtime.fixture.failures.clear(); await app.press('Retry'); assert.equal(app.find('FormField', 'Category name'), input);
  await app.press('Create category'); assert.equal(input.props.value, '');
});

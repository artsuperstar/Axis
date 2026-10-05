/// <reference types="node" />

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import * as schema from '../src/database/schema';
import { createTaskDataAccess } from '../src/features/tasks/data';
import { createFinanceDataAccess } from '../src/features/finance/data';
import { createWorkDataAccess } from '../src/features/finance/work/data';
import { clientAutocomplete } from '../src/features/finance/work/form-options';
import { createFitnessDataAccess } from '../src/features/fitness/data';
import { exerciseResults } from '../src/features/fitness/form';
import { canonicalIdentityName, canonicalSearchText, normalizeIdentityDisplayName } from '../src/utils/text-normalization';
import { bundledMigrations, database } from './helpers/database';

const timestamp = new Date(2026, 9, 5, 12).getTime();
async function initialized() {
  const result = database();
  await migrate(result.db, bundledMigrations);
  return { ...result,
    tasks: createTaskDataAccess(result.db, randomUUID, () => timestamp),
    finance: createFinanceDataAccess(result.db, randomUUID, () => timestamp),
    work: createWorkDataAccess(result.db, randomUUID, () => timestamp),
    fitness: createFitnessDataAccess(result.db, randomUUID, () => timestamp) };
}

test('canonical identity normalizes Unicode and whitespace while preserving accent distinctions', () => {
  assert.equal(normalizeIdentityDisplayName('  Educac\u0327a\u0303o  geral '), 'Educação geral');
  assert.equal(canonicalIdentityName('EDUCAÇÃO'), canonicalIdentityName('educac\u0327a\u0303o'));
  assert.notEqual(canonicalIdentityName('João'), canonicalIdentityName('Joao'));
  assert.notEqual(canonicalIdentityName('Café'), canonicalIdentityName('Cafe'));
  assert.equal(canonicalSearchText('Álvaro'), canonicalSearchText('alvaro'));
});

test('all user-defined active-name domains enforce the same Unicode identity and preserve archive reuse', async (t) => {
  const { sqlite, tasks, finance, work, fitness } = await initialized();
  t.after(() => sqlite.close());

  const taskCategory = tasks.createCategory('  Café   pessoal ');
  assert.equal(taskCategory.name, 'Café pessoal');
  assert.throws(() => tasks.createCategory('CAFE\u0301 PESSOAL'), /already exists/);
  assert.doesNotThrow(() => tasks.createCategory('Cafe pessoal'));
  tasks.deleteCategory(taskCategory.id);
  assert.doesNotThrow(() => tasks.createCategory('café pessoal'));

  const financeCategory = finance.createCategory('Educação', 'expense');
  assert.throws(() => finance.createCategory('EDUCAC\u0327A\u0303O', 'expense'), /already exists/);
  assert.doesNotThrow(() => finance.createCategory('Educacao', 'expense'));
  assert.doesNotThrow(() => finance.createCategory('educação', 'income'), 'Finance identity remains scoped by transaction type');
  finance.deleteCategory(financeCategory.id);
  assert.doesNotThrow(() => finance.createCategory('EDUCAÇÃO', 'expense'));

  const client = work.createCounterparty(' Álvaro   Freitas ');
  assert.equal(client.name, 'Álvaro Freitas');
  assert.throws(() => work.createCounterparty('áLVARO FREITAS'), /already exists/);
  assert.doesNotThrow(() => work.createCounterparty('Alvaro Freitas'));
  work.archiveCounterparty(client.id);
  assert.doesNotThrow(() => work.createCounterparty('A\u0301lvaro Freitas'));

  const exercise = fitness.createExercise({ name: 'SÉRIE longa', measurementType: 'strength' });
  assert.throws(() => fitness.createExercise({ name: 'se\u0301rie LONGA', measurementType: 'distance' }), /already exists/);
  assert.doesNotThrow(() => fitness.createExercise({ name: 'Serie longa', measurementType: 'distance' }));
  fitness.archiveExercise(exercise.id);
  assert.doesNotThrow(() => fitness.createExercise({ name: 'série longa', measurementType: 'duration' }));
});

test('routine rename excludes itself, rejects another active canonical name, and allows archived-name reuse', async (t) => {
  const { sqlite, fitness } = await initialized();
  t.after(() => sqlite.close());
  const first = fitness.createRoutine({ name: 'Educação', exercises: [] });
  const second = fitness.createRoutine({ name: 'Café', exercises: [] });

  fitness.editRoutine(first, { name: 'EDUCAC\u0327A\u0303O', exercises: [] });
  assert.equal(fitness.readRoutine(first).name, 'EDUCAÇÃO');
  assert.throws(() => fitness.editRoutine(second, { name: 'educação', exercises: [] }), /already exists/);
  assert.equal(fitness.readRoutine(second).name, 'Café');

  fitness.archiveRoutine(first);
  assert.doesNotThrow(() => fitness.createRoutine({ name: 'educação', exercises: [] }));
});

test('autocomplete search stays convenient while create actions use persisted identity', async (t) => {
  const { sqlite, work, fitness } = await initialized();
  t.after(() => sqlite.close());
  work.createCounterparty('Álvaro');
  fitness.createExercise({ name: 'SÉRIE', measurementType: 'strength' });

  const clients = work.read().counterparties;
  assert.deepEqual(clientAutocomplete(clients, 'alvaro').suggestions.map((option) => option.label), ['Álvaro']);
  assert.equal(clientAutocomplete(clients, 'A\u0301LVARO').createLabel, undefined);
  assert.equal(clientAutocomplete(clients, 'Alvaro').createLabel, '+ Create "Alvaro"', 'an accent-distinct name remains creatable');

  const exercises = fitness.read().exercises;
  assert.deepEqual(exerciseResults(exercises, 'série').suggestions.map((option) => option.label), ['SÉRIE']);
  assert.equal(exerciseResults(exercises, 'SE\u0301RIE').createLabel, undefined);
  assert.equal(exerciseResults(exercises, 'Serie').createLabel, '+ Create “Serie”');
});

test('Álvaro search offers and persists distinct Alvaro while rejecting accented identity variants', async (t) => {
  const { sqlite, work } = await initialized();
  t.after(() => sqlite.close());
  const accented = work.createCounterparty('Álvaro');

  const before = clientAutocomplete(work.read().counterparties, 'Alvaro');
  assert.deepEqual(before.suggestions, [{ value: accented.id, label: 'Álvaro' }]);
  assert.equal(before.createLabel, '+ Create "Alvaro"');

  const unaccented = work.createCounterparty('Alvaro');
  assert.notEqual(unaccented.id, accented.id);
  assert.deepEqual(work.read().counterparties.map((client) => client.name).sort(), ['Alvaro', 'Álvaro'].sort());
  assert.throws(() => work.createCounterparty('ÁLVARO'), /already exists/);
  assert.throws(() => work.createCounterparty('A\u0301lvaro'), /already exists/);

  work.archiveCounterparty(accented.id);
  const reused = work.createCounterparty('A\u0301LVARO');
  assert.equal(reused.name, 'ÁLVARO');
  assert.notEqual(reused.id, accented.id);
});

test('pre-existing canonical duplicates remain readable and block another equivalent creation', async (t) => {
  const { sqlite, db, work } = await initialized();
  t.after(() => sqlite.close());
  db.insert(schema.workCounterparties).values([
    { id: randomUUID(), name: 'Álvaro', createdAt: timestamp, updatedAt: timestamp },
    { id: randomUUID(), name: 'álvaro', createdAt: timestamp, updatedAt: timestamp },
  ]).run();

  assert.deepEqual(work.read().counterparties.map((client) => client.name).sort(), ['Álvaro', 'álvaro'].sort());
  assert.throws(() => work.createCounterparty('ÁLVARO'), /already exists/);
  assert.equal(sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
  assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), []);
});

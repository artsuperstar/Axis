/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createJournalEditor, requestJournalNavigation, type JournalLeaveChoice } from '../src/features/journal/editor';
import { journalDirty, journalDraft } from '../src/features/journal/form';
import { journalDatabase, journalToday as today } from './helpers/journal';

test('dirty detection protects exact writing/mood edits and treats insignificant empty whitespace as blank', () => {
  assert.equal(journalDirty({ content: ' \n ', mood: null }, null), false);
  assert.equal(journalDirty({ content: 'Text', mood: null }, null), true);
  assert.equal(journalDirty({ content: '', mood: 'good' }, null), true);
  const entry = { id: 'entry', entryDate: today, content: 'Text\n', mood: 'good' as const, createdAt: 0, updatedAt: 0, deletedAt: null };
  assert.equal(journalDirty(journalDraft(entry), entry), false);
  assert.equal(journalDirty({ ...journalDraft(entry), content: 'Text' }, entry), true);
  assert.equal(journalDirty({ ...journalDraft(entry), mood: null }, entry), true);
});

test('loading an editor creates no rows, Save persists, and later edits return to a clean state after saving', async (t) => {
  const { access, sqlite, now } = await journalDatabase(); t.after(() => sqlite.close());
  const editor = createJournalEditor(access, today, () => {}, now);
  assert.equal(editor.getState().loaded, false); assert.equal(editor.save(), false);
  assert.equal(editor.load(today), true); assert.equal(access.getEntry(today), null);
  editor.change({ content: 'Local draft\nNext line', mood: 'great' });
  assert.equal(access.getEntry(today), null); assert.equal(editor.dirty(), true);
  assert.equal(editor.save(), true); assert.equal(editor.dirty(), false); assert.equal(editor.getState().message, 'Saved');
  const id = editor.getState().entry!.id;
  editor.change({ content: 'Edited', mood: null }); editor.save(); assert.equal(editor.getState().entry!.id, id);
});

test('focus/resume refresh never overwrites unsaved text and refreshes persisted data when clean', async (t) => {
  const { access, sqlite, now } = await journalDatabase(); t.after(() => sqlite.close());
  access.save(today, { content: 'Saved', mood: null }, access.getEntry(today));
  const editor = createJournalEditor(access, today, () => {}, now); editor.load(today);
  editor.change({ content: 'Unsaved\nLong writing', mood: 'low' });
  access.save(today, { content: 'Source changed', mood: 'good' }, access.getEntry(today)); editor.refresh();
  assert.equal(editor.getState().draft.content, 'Unsaved\nLong writing'); assert.equal(editor.dirty(), true);
  editor.discard(); editor.refresh(); assert.equal(editor.getState().draft.content, 'Source changed');
});

test('Back/date-change protection supports keep editing, discard and saving before proceeding', async (t) => {
  const { access, sqlite, now } = await journalDatabase(); t.after(() => sqlite.close());
  const editor = createJournalEditor(access, today, () => {}, now); editor.load(today);
  let navigations = 0; let choose: ((value: JournalLeaveChoice) => void) | undefined;
  const request = () => requestJournalNavigation(editor, (callback) => { choose = callback; }, () => { navigations++; });
  editor.change({ content: 'Writing', mood: null }); request(); assert.equal(navigations, 0);
  choose!('keep'); assert.equal(editor.getState().draft.content, 'Writing'); assert.equal(navigations, 0);
  request(); choose!('discard'); assert.equal(navigations, 1); assert.equal(access.getEntry(today), null); assert.equal(editor.dirty(), false);
  editor.change({ content: 'Save before leaving', mood: 'good' }); request(); choose!('save');
  assert.equal(navigations, 2); assert.equal(access.getEntry(today)!.content, 'Save before leaving'); assert.equal(editor.dirty(), false);
  request(); assert.equal(navigations, 3);
});

test('failed saves preserve the exact draft and prevent navigation, including choosing a different date', async (t) => {
  const { access, sqlite, now } = await journalDatabase(); t.after(() => sqlite.close());
  const failing = { ...access, save: () => { throw new Error('Disk unavailable'); } };
  const editor = createJournalEditor(failing, today, () => {}, now); editor.load(today);
  const draft = { content: 'Do not lose this\n'.repeat(500), mood: 'okay' as const }; editor.change(draft);
  requestJournalNavigation(editor, (choose) => choose('save'), () => assert.fail('Failed save must not navigate'));
  assert.deepEqual(editor.getState().draft, draft); assert.equal(editor.dirty(), true); assert.match(editor.getState().error!, /Unable to save/);
  requestJournalNavigation(editor, (choose) => choose('keep'), () => editor.load('2026-10-03'));
  assert.equal(editor.getState().date, today); assert.deepEqual(editor.getState().draft, draft);
});

test('date switching saves the previous day before loading the target, and rejects future selections', async (t) => {
  const { access, sqlite, now } = await journalDatabase(); t.after(() => sqlite.close());
  const editor = createJournalEditor(access, today, () => {}, now); editor.load(today);
  editor.change({ content: 'Today’s writing', mood: null });
  requestJournalNavigation(editor, (choose) => choose('save'), () => editor.load('2026-10-03'));
  assert.equal(access.getEntry(today)!.content, 'Today’s writing'); assert.equal(editor.getState().date, '2026-10-03');
  assert.equal(editor.getState().draft.content, ''); assert.equal(editor.dirty(), false);
  assert.equal(editor.load('2026-10-05'), false); assert.equal(editor.getState().date, '2026-10-03');
});

test('cleared entries disappear on Save, explicit deletion clears the local draft, and reopened days stay blank', async (t) => {
  const { access, sqlite, now } = await journalDatabase(); t.after(() => sqlite.close());
  access.save(today, { content: 'Saved entry', mood: 'good' }, access.getEntry(today));
  const editor = createJournalEditor(access, today, () => {}, now); editor.load(today);
  editor.change({ content: '', mood: null }); editor.save(); assert.equal(editor.getState().entry, null); assert.equal(editor.dirty(), false);
  access.save(today, { content: 'Recreated', mood: null }, access.getEntry(today)); editor.refresh(); editor.change({ content: 'Unsaved edit', mood: null });
  assert.equal(editor.remove(), true); assert.equal(editor.dirty(), false); assert.equal(editor.getState().draft.content, '');
  editor.load(today); assert.equal(editor.getState().entry, null);
});

test('failed loading and deletion retain existing writing and present retryable errors', async (t) => {
  const { access, sqlite, now } = await journalDatabase(); t.after(() => sqlite.close());
  access.save(today, { content: 'Never erase this on failure', mood: null }, access.getEntry(today));
  const editor = createJournalEditor({ ...access, softDelete: () => { throw new Error('Unavailable'); } }, today, () => {}, now);
  editor.load(today); const before = editor.getState().draft;
  assert.equal(editor.remove(), false); assert.deepEqual(editor.getState().draft, before); assert.match(editor.getState().error!, /Unable to delete/);
  assert.equal(editor.load('bad-date'), false); assert.deepEqual(editor.getState().draft, before);
});

/// <reference types="node" />

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { createJournalDataAccess } from '../src/features/journal/data';
import { createJournalEditor, requestJournalNavigation } from '../src/features/journal/editor';
import { JournalConflictError, journalBaseline } from '../src/features/journal/form';
import { fakeDraftTimers, journalDatabase, journalToday as today } from './helpers/journal';

function open(f: Awaited<ReturnType<typeof journalDatabase>>) {
  const timers = fakeDraftTimers();
  const editor = createJournalEditor(f.access, today, () => {}, f.now, timers.host);
  assert.equal(editor.load(today), true);
  return { editor, timers };
}

test('audit reproduction: dirty refresh then explicit Save preserves version 2 and the stale local draft', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const first = f.access.save(today, { content: 'Version 1', mood: 'okay' }, null)!;
  const { editor, timers } = open(f);
  const writing = { content: '  Local writing\n\nEvery space stays.\r\n', mood: 'low' as const };
  editor.change(writing); timers.advance(500);
  const newer = f.access.save(today, { content: 'Version 2', mood: 'great' }, first)!;
  assert.equal(f.access.getDraft(today), null, 'the other writer cleared recovery during its successful save');
  editor.refresh();
  assert.deepEqual(editor.getState().baseline, journalBaseline(first));
  assert.deepEqual(editor.getState().draft, writing);
  assert.equal(editor.save(), false);
  assert.deepEqual(f.access.getEntry(today), newer);
  assert.deepEqual(editor.getState().draft, writing);
  assert.equal(editor.dirty(), true); assert.equal(editor.getState().conflict, true);
  assert.match(editor.getState().recoveryMessage!, /changed since you started editing/);
  const recovery = f.access.getDraft(today)!;
  assert.equal(recovery.content, writing.content); assert.equal(recovery.mood, writing.mood);
  assert.equal(recovery.baseEntryId, first.id); assert.equal(recovery.baseEntryUpdatedAt, first.updatedAt);
  requestJournalNavigation(editor, (choose) => choose('save'), () => assert.fail('conflict must block navigation'));
  assert.deepEqual(f.access.getEntry(today), newer);
  assert.equal(f.access.getDraft(today)!.content, writing.content);
});

test('a blank-date baseline rejects a newly created saved entry and retains recoverable local writing', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const { editor } = open(f);
  const writing = { content: 'My new entry', mood: 'good' as const };
  editor.change(writing);
  const newer = f.access.save(today, { content: 'Other writer', mood: 'great' }, null)!;
  assert.equal(editor.save(), false);
  assert.deepEqual(f.access.getEntry(today), newer); assert.deepEqual(editor.getState().draft, writing);
  assert.equal(editor.getState().baseline, null); assert.equal(editor.getState().conflict, true);
  assert.equal(f.access.getDraft(today)!.baseEntryId, null);
  assert.equal(f.access.getDraft(today)!.content, writing.content);
});

test('stale deletion intent never soft-deletes a newer authoritative entry', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const first = f.access.save(today, { content: 'Version 1', mood: 'good' }, null)!;
  const { editor } = open(f); editor.change({ content: ' \n ', mood: null });
  const newer = f.access.save(today, { content: 'Version 2', mood: 'great' }, first)!;
  assert.equal(editor.save(), false); assert.deepEqual(f.access.getEntry(today), newer);
  assert.deepEqual(editor.getState().draft, { content: ' \n ', mood: null });
  const recovery = f.access.getDraft(today)!;
  assert.equal(recovery.content, ''); assert.equal(recovery.mood, null);
  assert.equal(recovery.baseEntryId, first.id); assert.equal(recovery.baseEntryUpdatedAt, first.updatedAt);
  assert.equal(editor.getState().conflict, true);
});

test('externally deleted or recreated entries conflict with their original editor baseline', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const first = f.access.save(today, { content: 'Original', mood: null }, null)!;
  const { editor } = open(f); editor.change({ content: 'Keep my writing', mood: 'low' });
  f.access.softDelete(first.id);
  assert.equal(editor.save(), false); assert.equal(f.access.getEntry(today), null);
  assert.equal(f.access.getDraft(today)!.content, 'Keep my writing');
  const recreated = f.access.save(today, { content: 'Different ID', mood: null }, null)!;
  assert.notEqual(recreated.id, first.id);
  assert.equal(editor.save(), false); assert.deepEqual(f.access.getEntry(today), recreated);
  assert.equal(editor.getState().baseline!.id, first.id);
});

test('direct data-layer conflict rolls back without updating saved content or deleting recovery', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const first = f.access.save(today, { content: 'Original', mood: null }, null)!;
  const newer = f.access.save(today, { content: 'Newer', mood: 'great' }, first)!;
  const recovery = f.access.persistDraft(today, { content: 'Recovery', mood: 'low' }, first);
  f.sqlite.exec("CREATE TRIGGER reject_conflict_cleanup BEFORE DELETE ON journal_drafts BEGIN SELECT RAISE(ABORT, 'must not touch recovery'); END;");
  assert.throws(() => f.access.save(today, { content: 'Stale overwrite', mood: null }, first), JournalConflictError);
  assert.throws(() => f.access.save(today, { content: '', mood: null }, first), JournalConflictError);
  assert.throws(() => f.access.save(today, { content: 'Stale new entry', mood: null }, null), JournalConflictError);
  assert.deepEqual(f.access.getEntry(today), newer); assert.deepEqual(f.access.getDraft(today), recovery);
  assert.equal(f.sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []);
});

test('a clean but stale editor still preserves its original writing as recovery when Save conflicts', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const first = f.access.save(today, { content: 'Original writing', mood: 'good' }, null)!;
  const { editor } = open(f);
  const newer = f.access.save(today, { content: 'Newer writing', mood: 'great' }, first)!;
  assert.equal(editor.dirty(), false); assert.equal(editor.save(), false);
  assert.equal(editor.getState().conflict, true);
  assert.equal(f.access.getDraft(today)!.content, first.content);
  assert.equal(f.access.getDraft(today)!.baseEntryUpdatedAt, first.updatedAt);
  assert.deepEqual(f.access.getEntry(today), newer);
});

test('repeated debounce and maximum-wait recovery writes retain the saved baseline and allow normal Save', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const first = f.access.save(today, { content: 'Original', mood: null }, null)!;
  const { editor, timers } = open(f);
  editor.change({ content: 'First draft', mood: 'good' }); timers.advance(500);
  editor.change({ content: 'Continuous typing', mood: 'low' });
  for (let index = 0; index < 6; index++) { timers.advance(300); editor.change({ content: `Writing ${index}`, mood: 'good' }); }
  timers.advance(200);
  const recovery = f.access.getDraft(today)!;
  assert.equal(recovery.content, 'Writing 5'); assert.ok(recovery.updatedAt > first.updatedAt);
  assert.equal(recovery.baseEntryUpdatedAt, first.updatedAt);
  assert.deepEqual(editor.getState().baseline, journalBaseline(first));
  assert.equal(editor.save(), true); assert.equal(f.access.getDraft(today), null);
  assert.equal(editor.dirty(), false); assert.equal(editor.getState().conflict, false);
  assert.deepEqual(editor.getState().baseline, journalBaseline(f.access.getEntry(today)));
  editor.change({ content: 'Next save', mood: null }); assert.equal(editor.save(), true);
});

test('ordinary write failures remain save errors and preserve exact recovery for a later successful Save', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const first = f.access.save(today, { content: 'Original', mood: null }, null)!;
  const { editor, timers } = open(f); editor.change({ content: 'Unsaved', mood: 'low' }); timers.advance(500);
  const recovery = f.access.getDraft(today);
  f.sqlite.exec("CREATE TRIGGER fail_cleanup BEFORE DELETE ON journal_drafts BEGIN SELECT RAISE(ABORT, 'unavailable'); END;");
  assert.equal(editor.save(), false); assert.equal(editor.getState().conflict, false);
  assert.match(editor.getState().error!, /Unable to save/);
  assert.deepEqual(f.access.getEntry(today), first); assert.deepEqual(f.access.getDraft(today), recovery);
  f.sqlite.exec('DROP TRIGGER fail_cleanup');
  assert.equal(editor.save(), true); assert.equal(f.access.getDraft(today), null); assert.equal(editor.dirty(), false);
});

test('Discard explicitly loads current authority and clears conflict; continued editing retains the original baseline', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const first = f.access.save(today, { content: 'Original', mood: null }, null)!;
  const { editor, timers } = open(f); editor.change({ content: 'Local', mood: 'low' });
  const newer = f.access.save(today, { content: 'Current saved entry', mood: 'good' }, first)!;
  assert.equal(editor.save(), false);
  editor.change({ content: 'Continued local writing', mood: 'bad' }); timers.advance(500);
  assert.equal(editor.getState().conflict, true); assert.deepEqual(editor.getState().baseline, journalBaseline(first));
  assert.equal(f.access.getDraft(today)!.baseEntryUpdatedAt, first.updatedAt);
  assert.equal(editor.save(), false); assert.deepEqual(f.access.getEntry(today), newer);
  assert.equal(editor.discard(), true); assert.equal(editor.getState().conflict, false);
  assert.deepEqual(editor.getState().draft, { content: newer.content, mood: newer.mood });
  assert.deepEqual(editor.getState().baseline, journalBaseline(newer)); assert.equal(f.access.getDraft(today), null);
});

test('a real restart restores the original conflicting baseline and further typing cannot rebase it', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'axis-journal-conflicts-')); const filename = join(directory, 'journal.db');
  let f: Awaited<ReturnType<typeof journalDatabase>> | null = null;
  try {
    f = await journalDatabase(filename);
    const first = f.access.save(today, { content: 'Version 1', mood: 'okay' }, null)!;
    const { editor } = open(f); editor.change({ content: 'Local writing', mood: 'low' });
    const newer = f.access.save(today, { content: 'Version 2', mood: 'great' }, first)!;
    editor.flushDraft(); f.sqlite.close(); f = null;
    f = await journalDatabase(filename);
    const reopened = open(f);
    assert.equal(reopened.editor.getState().conflict, true);
    assert.deepEqual(reopened.editor.getState().baseline, journalBaseline(first));
    assert.equal(reopened.editor.getState().draft.content, 'Local writing');
    assert.deepEqual(reopened.editor.getState().entry, newer);
    reopened.editor.change({ content: 'More local writing\n', mood: 'bad' }); reopened.timers.advance(500);
    assert.equal(f.access.getDraft(today)!.baseEntryUpdatedAt, first.updatedAt);
    assert.equal(reopened.editor.save(), false); assert.deepEqual(f.access.getEntry(today), newer);
    assert.equal(f.access.getDraft(today)!.content, 'More local writing\n');
    assert.equal(f.sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
    assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []);
  } finally {
    f?.sqlite.close();
    for (const path of [filename, `${filename}-wal`, `${filename}-shm`]) { try { unlinkSync(path); } catch { /* SQLite may remove WAL files on close. */ } }
    rmdirSync(directory);
  }
});

test('an immediate Save transaction prevents another connection writing between baseline check and insertion', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'axis-journal-lock-')); const filename = join(directory, 'journal.db');
  let first: Awaited<ReturnType<typeof journalDatabase>> | null = null;
  let second: Awaited<ReturnType<typeof journalDatabase>> | null = null;
  try {
    first = await journalDatabase(filename); second = await journalDatabase(filename);
    const concurrent = second.access;
    let attempted = false;
    const saving = createJournalDataAccess(first.db, () => {
      attempted = true;
      assert.throws(() => concurrent.save(today, { content: 'Competing write', mood: null }, null),
        (cause: unknown) => cause instanceof Error && cause.cause instanceof Error && /database is locked/.test(cause.cause.message));
      return randomUUID();
    }, first.now);
    const saved = saving.save(today, { content: 'Atomic save', mood: 'good' }, null)!;
    assert.equal(attempted, true); assert.deepEqual(second.access.getEntry(today), saved);
  } finally {
    second?.sqlite.close(); first?.sqlite.close();
    for (const path of [filename, `${filename}-wal`, `${filename}-shm`]) { try { unlinkSync(path); } catch { /* SQLite may remove WAL files on close. */ } }
    rmdirSync(directory);
  }
});

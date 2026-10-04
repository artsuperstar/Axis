/// <reference types="node" />

import assert from 'node:assert/strict';
import { mkdtempSync, rmdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { createJournalEditor, requestJournalNavigation } from '../src/features/journal/editor';
import { startJournalLifecycle } from '../src/features/journal/draft-persistence';
import { transactionDraft } from '../src/features/finance/form';
import { localDateString, pickerValue } from '../src/utils/calendar';
import { fakeDraftTimers, journalDatabase, journalToday as today } from './helpers/journal';

function openEditor(f: Awaited<ReturnType<typeof journalDatabase>>, date = today) {
  const timers = fakeDraftTimers(); const editor = createJournalEditor(f.access, date, () => {}, f.now, timers.host);
  assert.equal(editor.load(date), true);
  return { editor, timers };
}

test('unsaved paragraphs persist after debounce and restore character-for-character after a real SQLite restart', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'axis-journal-drafts-')); const filename = join(directory, 'journal.db');
  let f: Awaited<ReturnType<typeof journalDatabase>> | null = null;
  const writing = { content: '  São Paulo — café.\n\nSecond paragraph!\r\n' + 'Every character stays.\n'.repeat(4000) + '  ', mood: 'good' as const };
  try {
    f = await journalDatabase(filename); const first = openEditor(f);
    first.editor.change(writing); assert.equal(f.access.getDraft(today), null);
    first.timers.advance(500); assert.equal(f.access.getDraft(today)!.content, writing.content); assert.equal(f.access.getEntry(today), null);
    f.sqlite.close(); f = null;
    f = await journalDatabase(filename); const recovered = openEditor(f);
    assert.deepEqual(recovered.editor.getState().draft, writing); assert.equal(recovered.editor.dirty(), true);
    assert.equal(recovered.editor.getState().entry, null); assert.match(recovered.editor.getState().recoveryMessage!, /Restored unsaved draft/);
    assert.equal(f.access.listHistory().entries.length, 0);
    assert.equal(recovered.editor.save(), true);
    const saved = f.access.getEntry(today)!;
    recovered.editor.change({ content: ' \n ', mood: null }); recovered.timers.advance(500);
    f.sqlite.close(); f = null;
    f = await journalDatabase(filename); const cleared = openEditor(f).editor;
    assert.deepEqual(cleared.getState().draft, { content: '', mood: null }); assert.equal(cleared.dirty(), true);
    assert.deepEqual(f.access.getEntry(today), saved); assert.equal(f.access.getDraft(today)!.baseEntryId, saved.id);
    assert.equal(cleared.save(), true); assert.equal(f.access.getEntry(today), null); assert.equal(f.access.getDraft(today), null);
    assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []); assert.equal(f.sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
  } finally {
    f?.sqlite.close();
    for (const path of [filename, `${filename}-wal`, `${filename}-shm`]) { try { unlinkSync(path); } catch { /* SQLite may remove its WAL files on close. */ } }
    rmdirSync(directory);
  }
});

test('recovered draft overrides older saved text and mood while the authoritative entry remains unchanged', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const saved = f.access.save(today, { content: 'Had a good day.', mood: 'okay' })!;
  const working = { content: 'Had a good day. Finished Axis…\nMore writing.', mood: 'great' as const };
  const first = openEditor(f); first.editor.change(working); first.timers.advance(500);
  const reopened = openEditor(f).editor;
  assert.deepEqual(reopened.getState().draft, working); assert.deepEqual(reopened.getState().entry, saved); assert.equal(reopened.dirty(), true);
  assert.deepEqual(f.access.getEntry(today), saved);
});

test('explicit Save updates the entry and removes only that date’s draft with no delayed recreation', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const { editor, timers } = openEditor(f);
  f.access.persistDraft('2026-10-03', { content: 'Other date', mood: null }, null);
  editor.change({ content: 'Save explicitly', mood: 'good' }); const stale = timers.jobs.map((job) => job.callback);
  assert.equal(editor.save(), true); assert.equal(f.access.getEntry(today)!.content, 'Save explicitly'); assert.equal(f.access.getDraft(today), null);
  for (const callback of stale) callback(); timers.advance(5000);
  assert.equal(f.access.getDraft(today), null); assert.equal(f.access.getDraft('2026-10-03')!.content, 'Other date'); assert.equal(editor.dirty(), false);
});

test('failed authoritative Save keeps latest recovery data, older saved entry, exact editor text and dirty state', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const saved = f.access.save(today, { content: 'Authoritative text', mood: 'okay' })!;
  const { editor } = openEditor(f); const working = { content: 'Latest unsaved\nwriting', mood: 'low' as const }; editor.change(working);
  f.sqlite.exec("CREATE TRIGGER fail_journal_save BEFORE UPDATE ON journal_entries BEGIN SELECT RAISE(ABORT, 'save unavailable'); END;");
  let left = false;
  requestJournalNavigation(editor, (choose) => choose('save'), () => { left = true; });
  assert.equal(left, false); assert.deepEqual(editor.getState().draft, working); assert.equal(editor.dirty(), true);
  assert.equal(f.access.getDraft(today)!.content, working.content); assert.deepEqual(f.access.getEntry(today), saved);
  assert.match(editor.getState().error!, /Unable to save/);
  f.sqlite.exec('DROP TRIGGER fail_journal_save'); assert.equal(editor.save(), true); assert.equal(f.access.getDraft(today), null);
});

test('failure removing a recovery row rolls back a new authoritative entry rather than partially saving it', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const { editor, timers } = openEditor(f); editor.change({ content: 'Recovery must remain', mood: null }); timers.advance(500);
  const recovery = f.access.getDraft(today);
  f.sqlite.exec("CREATE TRIGGER fail_draft_delete BEFORE DELETE ON journal_drafts BEGIN SELECT RAISE(ABORT, 'draft deletion unavailable'); END;");
  assert.equal(editor.save(), false); assert.equal(f.access.getEntry(today), null); assert.deepEqual(f.access.getDraft(today), recovery);
  f.sqlite.exec('DROP TRIGGER fail_draft_delete'); assert.equal(editor.save(), true); assert.equal(f.access.getDraft(today), null);
});

test('Discard removes recovery state and reloads the current saved entry, and cancelled timers cannot resurrect it', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const saved = f.access.save(today, { content: 'Saved state', mood: 'good' })!;
  const { editor, timers } = openEditor(f); editor.change({ content: 'Abandoned writing', mood: 'bad' }); timers.advance(500);
  editor.change({ content: 'Another unsaved edit', mood: null }); const stale = timers.jobs.map((job) => job.callback);
  requestJournalNavigation(editor, (choose) => choose('discard'), () => {});
  for (const callback of stale) callback(); timers.advance(5000);
  assert.equal(f.access.getDraft(today), null); assert.deepEqual(editor.getState().draft, { content: saved.content, mood: saved.mood });
  assert.equal(editor.dirty(), false); assert.deepEqual(openEditor(f).editor.getState().draft, editor.getState().draft);
});

test('failed Discard keeps recovery and working text and blocks navigation until Discard succeeds', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const { editor } = openEditor(f); editor.change({ content: 'Do not lose this', mood: null }); editor.flushDraft();
  f.sqlite.exec("CREATE TRIGGER fail_draft_discard BEFORE DELETE ON journal_drafts BEGIN SELECT RAISE(ABORT, 'discard unavailable'); END;");
  let left = false; requestJournalNavigation(editor, (choose) => choose('discard'), () => { left = true; });
  assert.equal(left, false); assert.equal(editor.getState().draft.content, 'Do not lose this'); assert.ok(f.access.getDraft(today));
  assert.match(editor.getState().error!, /Unable to discard/);
  f.sqlite.exec('DROP TRIGGER fail_draft_discard'); assert.equal(editor.discard(), true); assert.equal(f.access.getDraft(today), null);
});

test('Keep editing retains the flushed draft and never navigates or changes the authoritative entry', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const { editor } = openEditor(f); editor.change({ content: 'Keep editing me', mood: 'low' });
  requestJournalNavigation(editor, (choose) => choose('keep'), () => assert.fail('Keep editing must not navigate'));
  assert.equal(f.access.getDraft(today)!.content, 'Keep editing me'); assert.equal(f.access.getEntry(today), null); assert.equal(editor.dirty(), true);
});

test('date A and B recover independently; a transition flush never carries text or an old timer into another date', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const { editor, timers } = openEditor(f); editor.change({ content: 'Date A', mood: 'good' });
  const cancelled = timers.jobs.map((job) => job.callback);
  assert.equal(editor.load('2026-10-03'), true); assert.equal(editor.getState().draft.content, '');
  assert.equal(f.access.getDraft(today)!.content, 'Date A');
  editor.change({ content: 'Date B', mood: 'low' });
  for (const callback of cancelled) callback(); assert.equal(f.access.getDraft('2026-10-03'), null);
  timers.advance(500); assert.equal(f.access.getDraft('2026-10-03')!.content, 'Date B');
  assert.deepEqual(openEditor(f).editor.getState().draft, { content: 'Date A', mood: 'good' });
  assert.deepEqual(openEditor(f, '2026-10-03').editor.getState().draft, { content: 'Date B', mood: 'low' });
});

test('UI date-switch guards clear only the old date after Save/Discard and Keep editing remains on that date', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const { editor } = openEditor(f); editor.change({ content: 'Date A', mood: null });
  const changeDay = () => editor.load('2026-10-03');
  requestJournalNavigation(editor, (choose) => choose('keep'), changeDay); assert.equal(editor.getState().date, today);
  requestJournalNavigation(editor, (choose) => choose('save'), changeDay);
  assert.equal(editor.getState().date, '2026-10-03'); assert.equal(editor.getState().draft.content, ''); assert.equal(f.access.getDraft(today), null);
  assert.equal(f.access.getEntry(today)!.content, 'Date A');
  editor.change({ content: 'Date B', mood: null }); requestJournalNavigation(editor, (choose) => choose('discard'), () => editor.load(today));
  assert.equal(f.access.getDraft('2026-10-03'), null); assert.equal(f.access.getEntry('2026-10-03'), null); assert.equal(editor.getState().draft.content, 'Date A');
});

test('blank/whitespace new drafts and edits reverted to the saved state remove meaningless recovery rows', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const { editor, timers } = openEditor(f); editor.change({ content: 'New draft', mood: null }); timers.advance(500); assert.ok(f.access.getDraft(today));
  editor.change({ content: ' \t\n\u2003\u00a0', mood: null }); timers.advance(500);
  assert.equal(f.access.getDraft(today), null); assert.equal(editor.dirty(), false);
  const saved = f.access.save(today, { content: 'Saved', mood: 'good' })!; editor.refresh();
  editor.change({ content: 'Unsaved', mood: 'bad' }); timers.advance(500);
  editor.change({ content: saved.content, mood: saved.mood }); timers.advance(500);
  assert.equal(f.access.getDraft(today), null); assert.equal(editor.dirty(), false);
});

test('clearing a saved entry restores as unsaved deletion intent, then explicit Save soft-deletes and clears recovery', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const saved = f.access.save(today, { content: 'Original diary', mood: 'good' })!;
  const { editor, timers } = openEditor(f); editor.change({ content: ' \n ', mood: null }); timers.advance(500);
  const recovery = f.access.getDraft(today)!;
  assert.equal(recovery.content, ''); assert.equal(recovery.mood, null); assert.equal(recovery.baseEntryId, saved.id); assert.equal(recovery.baseEntryUpdatedAt, saved.updatedAt);
  assert.deepEqual(f.access.getEntry(today), saved);
  const reopened = openEditor(f).editor; assert.deepEqual(reopened.getState().draft, { content: '', mood: null }); assert.equal(reopened.dirty(), true);
  assert.equal(reopened.save(), true); assert.equal(f.access.getEntry(today), null); assert.equal(f.access.getDraft(today), null);
  const deleted = f.sqlite.prepare('SELECT * FROM journal_entries WHERE id = ?').get(saved.id)!;
  assert.equal(deleted.content, saved.content); assert.equal(deleted.mood, saved.mood); assert.ok(deleted.deleted_at);
});

test('mood-only drafts restore without creating saved entries and are removed when mood returns to None', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const { editor, timers } = openEditor(f); editor.change({ content: ' \n ', mood: 'okay' }); timers.advance(500);
  const reopened = openEditor(f); assert.deepEqual(reopened.editor.getState().draft, { content: '', mood: 'okay' });
  assert.equal(f.access.getEntry(today), null);
  reopened.editor.change({ content: '', mood: null }); reopened.timers.advance(500); assert.equal(f.access.getDraft(today), null);
});

test('drafts are absent from saved History/date markers and remain separate from source-derived context', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  f.access.persistDraft(today, { content: 'Draft only', mood: 'good' }, null);
  const saved = f.access.save('2026-10-03', { content: 'Saved history', mood: null })!;
  f.access.persistDraft('2026-10-03', { content: 'Unsaved edit', mood: null }, saved);
  assert.deepEqual(f.access.listHistory().entries, [saved]);
  assert.deepEqual(f.access.datesWithEntries({ from: '2026-10-01', to: today }), ['2026-10-03']);
  assert.equal(f.context.read(today).completedTaskCount, 0); assert.equal(f.context.read(today).workoutCount, 0); assert.equal(f.context.read(today).transactionCount, 0);
});

test('opening Journal at local today restores today’s draft while previous-date drafts remain isolated', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  f.access.persistDraft(today, { content: 'Today from Home', mood: 'great' }, null);
  f.access.persistDraft('2026-10-03', { content: 'Yesterday', mood: 'low' }, null);
  const localToday = localDateString(new Date(f.now())); const editor = createJournalEditor(f.access, localToday, () => {}, f.now, fakeDraftTimers().host);
  editor.load(localToday);
  assert.equal(editor.getState().date, today); assert.equal(editor.getState().draft.content, 'Today from Home'); assert.equal(editor.getState().entry, null);
});

test('context/focus/foreground/minute refresh preserves recovered draft content, mood and dirty state', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  f.access.persistDraft(today, { content: 'Recovered writing\n', mood: 'low' }, null);
  const { editor } = openEditor(f); const before = editor.getState().draft;
  let resume: (state: string) => void = () => {}; let minute: () => void = () => {}; let expense = 0n;
  const stop = startJournalLifecycle({ refresh: () => { editor.refresh(); expense = f.context.read(editor.getState().date).expensesMinor; }, flush: editor.flushDraft,
    everyMinute: (callback) => { minute = callback; return () => {}; }, onAppState: (callback) => { resume = callback; return () => {}; } });
  f.finance.createTransaction({ ...transactionDraft(null, pickerValue(today)), description: 'Context update', amount: '20' });
  minute(); resume('inactive'); resume('active');
  assert.equal(expense, 2000n); assert.deepEqual(editor.getState().draft, before); assert.equal(editor.dirty(), true); assert.equal(f.access.getDraft(today)!.mood, 'low');
  stop();
});

test('conflicting saved-state changes preserve recovery writing directly and Discard reloads current authority', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const saved = f.access.save(today, { content: 'Original', mood: null })!;
  f.access.persistDraft(today, { content: 'My unsaved writing', mood: 'good' }, saved);
  f.sqlite.prepare('UPDATE journal_entries SET content = ?, updated_at = updated_at + 1 WHERE id = ?').run('Changed saved state', saved.id);
  const reopened = openEditor(f).editor;
  assert.equal(reopened.getState().draft.content, 'My unsaved writing'); assert.equal(reopened.getState().entry!.content, 'Changed saved state');
  assert.match(reopened.getState().recoveryMessage!, /saved entry has changed/); assert.equal(reopened.dirty(), true);
  reopened.discard(); assert.equal(reopened.getState().draft.content, 'Changed saved state'); assert.equal(f.access.getDraft(today), null);
});

test('a saved entry removed outside this editor never destroys recoverable meaningful writing', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const saved = f.access.save(today, { content: 'Original', mood: null })!;
  f.access.persistDraft(today, { content: 'Keep this recovery', mood: 'good' }, saved);
  f.sqlite.prepare('UPDATE journal_entries SET deleted_at = updated_at, updated_at = updated_at + 1 WHERE id = ?').run(saved.id);
  const reopened = openEditor(f).editor;
  assert.equal(reopened.getState().entry, null); assert.equal(reopened.getState().draft.content, 'Keep this recovery');
  assert.equal(reopened.save(), true); assert.notEqual(f.access.getEntry(today)!.id, saved.id); assert.equal(f.access.getDraft(today), null);
});

test('already-resolved blank deletion intents and identical saved states are cleaned on reopening', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const saved = f.access.save(today, { content: 'Original', mood: null })!;
  f.access.persistDraft(today, { content: '', mood: null }, saved);
  f.sqlite.prepare('UPDATE journal_entries SET deleted_at = updated_at, updated_at = updated_at + 1 WHERE id = ?').run(saved.id);
  assert.equal(openEditor(f).editor.dirty(), false); assert.equal(f.access.getDraft(today), null);
  const next = f.access.save(today, { content: 'Saved again', mood: null })!;
  f.access.persistDraft(today, { content: 'Same content now saved', mood: null }, next);
  f.sqlite.prepare('UPDATE journal_entries SET content = ?, updated_at = updated_at + 1 WHERE id = ?').run('Same content now saved', next.id);
  assert.equal(openEditor(f).editor.dirty(), false); assert.equal(f.access.getDraft(today), null);
});

test('draft storage failures preserve editor writing, show independent protection errors and allow retry', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const timers = fakeDraftTimers(); let fail = true;
  const access = { ...f.access, persistDraft: (...args: Parameters<typeof f.access.persistDraft>) => {
    if (fail) throw new Error('Storage unavailable'); return f.access.persistDraft(...args);
  } };
  const editor = createJournalEditor(access, today, () => {}, f.now, timers.host); editor.load(today);
  editor.change({ content: 'Writing stays in the editor', mood: 'good' }); timers.advance(500);
  assert.equal(editor.getState().draft.content, 'Writing stays in the editor'); assert.equal(editor.dirty(), true);
  assert.match(editor.getState().recoveryError!, /Unable to protect your draft/); assert.equal(f.access.getDraft(today), null);
  assert.equal(editor.load('2026-10-03'), false); assert.equal(editor.getState().date, today);
  fail = false; assert.equal(editor.flushDraft(), true); assert.equal(editor.getState().recoveryError, null);
  assert.equal(f.access.getDraft(today)!.content, 'Writing stays in the editor');
});

test('SQLite enforces draft identity, date/mood/timestamps and blank-intent metadata while preserving exact text', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const first = f.access.persistDraft(today, { content: 'Long\ntext', mood: null }, null)!;
  const next = f.access.persistDraft(today, { content: 'Updated\ntext', mood: 'good' }, null)!;
  assert.ok(next.updatedAt > first.updatedAt); assert.equal(f.sqlite.prepare('SELECT count(*) AS count FROM journal_drafts').get()!.count, 1);
  const insert = f.sqlite.prepare('INSERT INTO journal_drafts (entry_date, content, mood, updated_at, base_entry_id, base_entry_updated_at) VALUES (?, ?, ?, ?, ?, ?)');
  assert.throws(() => insert.run(today, 'Duplicate', null, 1000, null, null), /UNIQUE/);
  for (const date of ['2026-02-29', '0000-01-01', '2026-1-01']) assert.throws(() => insert.run(date, 'Text', null, 1000, null, null), /CHECK/);
  assert.throws(() => insert.run('2026-10-03', 'Text', 'unknown', 1000, null, null), /CHECK/);
  assert.throws(() => insert.run('2026-10-03', ' \n\t ', null, 1000, null, null), /CHECK/);
  for (const updated of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => insert.run('2026-10-03', 'Text', null, updated, null, null), /CHECK/);
  assert.throws(() => insert.run('2026-10-03', '', null, 1000, 'saved-id', null), /CHECK/);
  assert.throws(() => insert.run('2026-10-03', 'Text', null, 1000, null, 1000), /CHECK/);
  const saved = f.access.save('2026-10-03', { content: 'Other saved date', mood: null })!;
  assert.throws(() => f.access.persistDraft(today, { content: 'Wrong date', mood: null }, saved), /own date/);
  assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []); assert.equal(f.sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
});

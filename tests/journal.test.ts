/// <reference types="node" />

import assert from 'node:assert/strict';
import { mkdtempSync, rmdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { journalPreview, moodOptions, normalizeJournalDraft, validateJournalDate } from '../src/features/journal/form';
import type { JournalMood } from '../src/features/journal/types';
import { addDays, dateLabel, localDateString, pickerValue } from '../src/utils/calendar';
import { journalDatabase, journalToday as today } from './helpers/journal';

test('Journal opens without writing, saves today, and retrieves its stable date identity', async (t) => {
  const { access, sqlite, now } = await journalDatabase(); t.after(() => sqlite.close());
  assert.equal(access.getEntry(today), null); assert.equal(access.listHistory().entries.length, 0);
  const saved = access.save(today, { content: 'Finished Axis.', mood: null }, access.getEntry(today))!;
  assert.match(saved.id, /^[\da-f-]{36}$/i); assert.equal(saved.entryDate, today);
  assert.equal(saved.createdAt, now()); assert.equal(saved.updatedAt, now()); assert.equal(saved.deletedAt, null);
  assert.deepEqual(access.getEntry(today), saved);
});

test('saving the same date edits its existing row without changing identity or creation timestamp', async (t) => {
  const { access, sqlite } = await journalDatabase(); t.after(() => sqlite.close());
  const first = access.save(today, { content: 'First', mood: 'okay' }, access.getEntry(today))!;
  const next = access.save(today, { content: 'Updated', mood: 'good' }, access.getEntry(today))!;
  assert.equal(next.id, first.id); assert.equal(next.createdAt, first.createdAt); assert.ok(next.updatedAt > first.updatedAt);
  assert.equal(next.content, 'Updated'); assert.equal(next.mood, 'good');
  assert.equal(sqlite.prepare('SELECT count(*) AS count FROM journal_entries').get()!.count, 1);
});

test('past dates including leap days are editable; future and malformed dates are rejected before writes', async (t) => {
  const { access, sqlite } = await journalDatabase(); t.after(() => sqlite.close());
  for (const date of ['2024-02-29', '2026-10-03']) assert.equal(access.save(date, { content: 'Past day', mood: null }, access.getEntry(date))!.entryDate, date);
  for (const date of ['2026-10-05', '2027-01-01']) {
    assert.throws(() => access.save(date, { content: 'Future', mood: 'great' }, access.getEntry(date)), /today or earlier/);
    assert.throws(() => access.save(date, { content: '', mood: null }, access.getEntry(date)), /today or earlier/);
  }
  for (const date of ['2026-02-29', '2026-04-31', '2026-1-01', '0000-01-01', '2026-10-04T00:00:00Z', '']) {
    assert.throws(() => access.save(date, { content: 'Invalid', mood: null }, access.getEntry(date)), /valid journal date/);
    assert.throws(() => access.getEntry(date), /valid journal date/);
  }
  assert.equal(access.listHistory().entries.length, 2);
});

test('multiline, punctuation, leading/trailing whitespace and very long writing persist verbatim', async (t) => {
  const { access, sqlite } = await journalDatabase(); t.after(() => sqlite.close());
  const content = '  Remember this:\n\n Café — São Paulo.\r\n' + 'A longer paragraph!\n'.repeat(6000) + '  ';
  assert.equal(access.save(today, { content, mood: null }, access.getEntry(today))!.content, content);
  assert.equal(access.getEntry(today)!.content, content);
  assert.deepEqual(normalizeJournalDraft({ content, mood: 'low' }), { content, mood: 'low' });
});

test('empty and whitespace-only drafts do not create rows', async (t) => {
  const { access, sqlite } = await journalDatabase(); t.after(() => sqlite.close());
  for (const content of ['', ' \t\r\n ', '\u2003\u00a0']) assert.equal(access.save(today, { content, mood: null }, access.getEntry(today)), null);
  assert.equal(sqlite.prepare('SELECT count(*) AS count FROM journal_entries').get()!.count, 0);
});

test('clearing text and mood soft-deletes an existing entry without erasing the original writing', async (t) => {
  const { access, sqlite } = await journalDatabase(); t.after(() => sqlite.close());
  const first = access.save(today, { content: 'Keep my historical writing', mood: 'good' }, access.getEntry(today))!;
  assert.equal(access.save(today, { content: ' \n ', mood: null }, access.getEntry(today)), null);
  assert.equal(access.getEntry(today), null); assert.deepEqual(access.listHistory().entries, []);
  const deleted = sqlite.prepare('SELECT * FROM journal_entries WHERE id = ?').get(first.id)!;
  assert.equal(deleted.content, first.content); assert.equal(deleted.mood, first.mood);
  assert.ok(Number(deleted.deleted_at) > first.updatedAt); assert.equal(deleted.deleted_at, deleted.updated_at);
});

test('soft deletion is idempotent and recreation gives a clean new identity', async (t) => {
  const { access, sqlite } = await journalDatabase(); t.after(() => sqlite.close());
  const first = access.save(today, { content: 'Original', mood: null }, access.getEntry(today))!;
  access.softDelete(first.id); const deleted = sqlite.prepare('SELECT * FROM journal_entries WHERE id = ?').get(first.id);
  access.softDelete(first.id); assert.deepEqual(sqlite.prepare('SELECT * FROM journal_entries WHERE id = ?').get(first.id), deleted);
  const recreated = access.save(today, { content: 'New writing', mood: null }, access.getEntry(today))!;
  assert.notEqual(recreated.id, first.id); assert.equal(access.getEntry(today)!.id, recreated.id);
  assert.equal(sqlite.prepare('SELECT count(*) AS count FROM journal_entries').get()!.count, 2);
});

test('all five stable mood keys support mood-only entries, changing mood and removing mood', async (t) => {
  const { access, sqlite } = await journalDatabase(); t.after(() => sqlite.close());
  let id: string | undefined;
  for (const { value: mood } of moodOptions.slice(1)) {
    const row = access.save(today, { content: ' \n ', mood }, access.getEntry(today))!;
    assert.equal(row.content, ''); assert.equal(row.mood, mood); if (id) assert.equal(row.id, id); id = row.id;
    assert.match(journalPreview(row), /^Mood: /);
  }
  const writing = access.save(today, { content: 'Text stays', mood: null }, access.getEntry(today))!;
  assert.equal(writing.id, id); assert.equal(writing.mood, null); assert.equal(writing.content, 'Text stays');
  assert.throws(() => access.save(today, { content: 'Wrong mood', mood: 'ecstatic' as JournalMood }, access.getEntry(today)), /available mood/);
});

test('history is newest date first with a stable exclusive date cursor and tombstones excluded', async (t) => {
  const { access, sqlite } = await journalDatabase(); t.after(() => sqlite.close());
  for (const days of [8, 0, 4, 1, 3, 2]) access.save(addDays(today, -days), { content: `Day ${days}`, mood: null }, access.getEntry(addDays(today, -days)));
  access.softDelete(access.getEntry(addDays(today, -3))!.id);
  const first = access.listHistory(undefined, 2); const second = access.listHistory(first.nextBefore!, 2);
  const third = access.listHistory(second.nextBefore!, 2);
  assert.deepEqual(first.entries.map((entry) => entry.entryDate), ['2026-10-04', '2026-10-03']);
  assert.deepEqual(second.entries.map((entry) => entry.entryDate), ['2026-10-02', '2026-09-30']);
  assert.deepEqual(third.entries.map((entry) => entry.entryDate), ['2026-09-26']); assert.equal(third.nextBefore, null);
  access.save('2026-09-26', { content: 'Edited later', mood: null }, access.getEntry('2026-09-26'));
  assert.equal(access.listHistory().entries[0].entryDate, today);
});

test('history has a bounded default page and validates sizes and cursors', async (t) => {
  const { access, sqlite } = await journalDatabase(); t.after(() => sqlite.close());
  for (let day = 0; day < 25; day++) access.save(addDays(today, -day), { content: 'Diary', mood: null }, access.getEntry(addDays(today, -day)));
  assert.equal(access.listHistory().entries.length, 20); assert.ok(access.listHistory().nextBefore);
  for (const limit of [0, -1, 1.5, 101, Infinity]) assert.throws(() => access.listHistory(undefined, limit), /valid journal history page/);
  assert.throws(() => access.listHistory('not a date'), /valid journal history page/);
});

test('dates containing entries are range-bounded, include mood-only entries, and exclude deleted dates', async (t) => {
  const { access, sqlite } = await journalDatabase(); t.after(() => sqlite.close());
  access.save(today, { content: '', mood: 'good' }, access.getEntry(today)); access.save('2026-10-01', { content: 'October', mood: null }, access.getEntry('2026-10-01'));
  access.save('2026-09-30', { content: 'September', mood: null }, access.getEntry('2026-09-30'));
  const deleted = access.save('2026-10-02', { content: 'Removed', mood: null }, access.getEntry('2026-10-02'))!; access.softDelete(deleted.id);
  assert.deepEqual(access.datesWithEntries({ from: '2026-10-01', to: today }), [today, '2026-10-01']);
  assert.deepEqual(access.datesWithEntries({ from: '2026-09-01', to: '2026-09-30' }), ['2026-09-30']);
  assert.throws(() => access.datesWithEntries({ from: '2025-01-01', to: today }));
});

test('SQLite independently enforces civil dates, mood values, timestamps, nonempty active entries and date uniqueness', async (t) => {
  const { access, sqlite } = await journalDatabase(); t.after(() => sqlite.close());
  access.save(today, { content: 'Original', mood: null }, access.getEntry(today));
  const insert = sqlite.prepare('INSERT INTO journal_entries (id, entry_date, content, mood, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  assert.throws(() => insert.run('duplicate', today, 'Other', null, 1000, 1000, null), /UNIQUE/);
  for (const date of ['2026-02-29', '0000-01-01', '2026-04-31', '2026-1-01']) assert.throws(() => insert.run(date, date, 'Other', null, 1000, 1000, null), /CHECK/);
  assert.throws(() => insert.run('mood', '2026-10-03', 'Other', 'unknown', 1000, 1000, null), /CHECK/);
  assert.throws(() => insert.run('empty', '2026-10-03', ' \n\t ', null, 1000, 1000, null), /CHECK/);
  for (const [created, updated, deleted] of [[-1, 1000, null], [1000, 999, null], [0.5, 1000, null], [1000, 1000, 1001], [1000, 1000, 999]]) {
    assert.throws(() => insert.run(`time-${created}-${deleted}`, '2026-10-03', 'Other', null, created, updated, deleted), /CHECK/);
  }
  assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), []); assert.equal(sqlite.prepare('PRAGMA integrity_check').get()!.integrity_check, 'ok');
});

test('Journal persists long text, mood, past dates and tombstones across a real database restart', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'axis-journal-')); const filename = join(directory, 'journal.db');
  let open: Awaited<ReturnType<typeof journalDatabase>> | null = null;
  try {
    open = await journalDatabase(filename);
    const saved = open.access.save(today, { content: 'Restart\n\n' + 'Still here. '.repeat(2000), mood: 'great' }, open.access.getEntry(today))!;
    const past = open.access.save('2026-10-02', { content: 'Past day', mood: null }, open.access.getEntry('2026-10-02'))!;
    open.access.softDelete(past.id); open.sqlite.close(); open = null;
    open = await journalDatabase(filename);
    assert.deepEqual(open.access.getEntry(today), saved); assert.equal(open.access.getEntry(past.entryDate), null);
    assert.equal(open.access.listHistory().entries.length, 1);
    assert.equal(open.sqlite.prepare('SELECT count(*) AS count FROM journal_entries').get()!.count, 2);
  } finally {
    open?.sqlite.close();
    for (const path of [filename, `${filename}-wal`, `${filename}-shm`]) { try { unlinkSync(path); } catch { /* SQLite may already have removed WAL files. */ } }
    rmdirSync(directory);
  }
});

test('local today validation and diary labels do not shift across UTC, midnight or time zones', () => {
  const previous = process.env.TZ;
  try {
    for (const zone of ['America/Sao_Paulo', 'America/New_York', 'Pacific/Kiritimati', 'Pacific/Honolulu']) {
      process.env.TZ = zone;
      for (const time of ['00:01', '23:59']) {
        const instant = pickerValue(today, time).getTime();
        validateJournalDate(today, instant); validateJournalDate('2026-10-03', instant);
        assert.throws(() => validateJournalDate('2026-10-05', instant), /today or earlier/);
        assert.equal(localDateString(pickerValue(today)), today); assert.ok(dateLabel(today).includes('4'));
      }
      validateJournalDate('2026-10-05', pickerValue('2026-10-05', '00:00').getTime());
    }
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test('history previews collapse display whitespace while preserving the actual diary text', () => {
  const content = '  First line\n\nSecond line\t' + 'x'.repeat(180);
  const entry = { id: 'entry', entryDate: today, content, mood: null, createdAt: 0, updatedAt: 0, deletedAt: null };
  assert.ok(journalPreview(entry).startsWith('First line Second line ')); assert.ok(journalPreview(entry).endsWith('…'));
  assert.equal(entry.content, content);
});

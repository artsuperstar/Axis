/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createDraftPersistence, startJournalLifecycle } from '../src/features/journal/draft-persistence';
import { createJournalEditor } from '../src/features/journal/editor';
import { fakeDraftTimers, journalDatabase, journalToday as today } from './helpers/journal';

test('debounce performs no keystroke writes, resets after changes and persists the latest content/mood once', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const timers = fakeDraftTimers(); let writes = 0;
  const access = { ...f.access, persistDraft: (...args: Parameters<typeof f.access.persistDraft>) => { writes++; return f.access.persistDraft(...args); } };
  const editor = createJournalEditor(access, today, () => {}, f.now, timers.host); editor.load(today);
  editor.change({ content: 'First', mood: null }); timers.advance(400);
  editor.change({ content: 'Latest\nparagraph', mood: 'good' }); timers.advance(499);
  assert.equal(writes, 0); assert.equal(f.access.getDraft(today), null);
  timers.advance(1); assert.equal(writes, 1); assert.equal(f.access.getDraft(today)!.content, 'Latest\nparagraph');
  assert.equal(f.access.getDraft(today)!.mood, 'good'); assert.equal(f.access.getEntry(today), null);
  timers.advance(5000); assert.equal(writes, 1);
});

test('continuous typing still protects the latest writing within the maximum wait', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const timers = fakeDraftTimers(); const editor = createJournalEditor(f.access, today, () => {}, f.now, timers.host); editor.load(today);
  editor.change({ content: '0', mood: null });
  for (let index = 1; index <= 6; index++) { timers.advance(300); editor.change({ content: String(index), mood: 'good' }); }
  assert.equal(f.access.getDraft(today), null); timers.advance(200);
  assert.equal(f.access.getDraft(today)!.content, '6'); assert.equal(editor.dirty(), true);
  editor.change({ content: 'Next cycle', mood: null }); timers.advance(500); assert.equal(f.access.getDraft(today)!.content, 'Next cycle');
});

test('explicit flush and cancellation invalidate both debounce/max-wait callbacks', () => {
  const timers = fakeDraftTimers(); let writes = 0;
  const persistence = createDraftPersistence(() => { writes++; return true; }, timers.host);
  persistence.changed(); const old = timers.jobs.map((job) => job.callback);
  persistence.flush(); assert.equal(writes, 1);
  for (const callback of old) callback(); timers.advance(5000); assert.equal(writes, 1);
  persistence.changed(); const pending = timers.jobs.slice(2).map((job) => job.callback); persistence.cancel();
  for (const callback of pending) callback(); timers.advance(5000); assert.equal(writes, 1);
});

test('inactive/background/blur flush without waiting for debounce, and late lifecycle callbacks are ignored', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const timers = fakeDraftTimers(); const editor = createJournalEditor(f.access, today, () => {}, f.now, timers.host); editor.load(today);
  let appState: (state: string) => void = () => {}; let minute: () => void = () => {};
  let refreshes = 0; let stopTimer = 0; let stopAppState = 0;
  const stop = startJournalLifecycle({ refresh: () => { refreshes++; editor.refresh(); }, flush: editor.flushDraft,
    everyMinute: (callback) => { minute = callback; return () => { stopTimer++; }; },
    onAppState: (callback) => { appState = callback; return () => { stopAppState++; }; } });
  assert.equal(refreshes, 1);
  editor.change({ content: 'Inactive flush', mood: null }); appState('inactive'); assert.equal(f.access.getDraft(today)!.content, 'Inactive flush');
  editor.change({ content: 'Background flush', mood: 'low' }); appState('background'); assert.equal(f.access.getDraft(today)!.content, 'Background flush');
  minute(); assert.equal(refreshes, 1); appState('active'); assert.equal(refreshes, 2);
  editor.change({ content: 'Blur flush', mood: 'good' }); stop(); assert.equal(f.access.getDraft(today)!.content, 'Blur flush');
  assert.equal(stopTimer, 1); assert.equal(stopAppState, 1);
  appState('active'); minute(); timers.advance(5000); assert.equal(refreshes, 2); assert.equal(editor.dirty(), true);
});

test('leaving a date immediately flushes its latest text and cancels timers before loading recovery for another day', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const timers = fakeDraftTimers(); const editor = createJournalEditor(f.access, today, () => {}, f.now, timers.host); editor.load(today);
  editor.change({ content: 'A latest text', mood: null });
  f.access.persistDraft('2026-10-03', { content: 'B existing draft', mood: 'low' }, null);
  editor.load('2026-10-03'); assert.equal(f.access.getDraft(today)!.content, 'A latest text');
  assert.equal(editor.getState().draft.content, 'B existing draft'); timers.advance(5000);
  assert.equal(f.access.getDraft(today)!.content, 'A latest text'); assert.equal(f.access.getDraft('2026-10-03')!.content, 'B existing draft');
});

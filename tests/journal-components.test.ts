/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { JournalEditorState, JournalLeaveChoice } from '../src/features/journal/editor';
import type { JournalDraft, JournalDayContext } from '../src/features/journal/types';
import type { HomeNavigation } from '../src/features/source-navigation';
import { createJournalEditor } from '../src/features/journal/editor';
import { localDateString } from '../src/utils/calendar';
import { fakeDraftTimers, journalDatabase } from './helpers/journal';
import { controls, homeContent, journalContext, journalDate, journalEditor, journalHistory, journalLeave, renderControl } from './helpers/form-components';

const today = '2026-10-04';
const entry = { id: 'entry', entryDate: '2026-10-03', content: 'First line\nSecond line', mood: 'good' as const, createdAt: 0, updatedAt: 0, deletedAt: null };
const state: JournalEditorState = { date: entry.entryDate, entry, draft: { content: entry.content, mood: entry.mood }, loaded: true, error: null, message: null,
  baseline: { id: entry.id, updatedAt: entry.updatedAt }, conflict: false, recoveryError: null, recoveryMessage: null };
const context: JournalDayContext = { date: today, completedTaskCount: 4, taskNames: ['One', 'Two', 'Three'], workoutCount: 1,
  workouts: [{ id: 'workout', name: 'Upper Body', exerciseCount: 3, setCount: 9 }], transactionCount: 2, incomeMinor: 50000n, expensesMinor: 12000n, netFlowMinor: 38000n };

test('Journal editor uses shared mood/date controls, multiline writing without a title and feature callbacks', () => {
  const events: string[] = []; const changed: JournalDraft[] = [];
  const form = renderControl(() => journalEditor.JournalEditor({ state, today, onChange: (draft) => changed.push(draft),
    onDate: () => events.push('date'), onToday: () => events.push('today'), onHistory: () => events.push('history'), onDelete: () => events.push('delete'), onRetryDraft: () => {}, onDiscardConflict: () => {} }));
  assert.match(form.markup, /Journal writing for/); assert.match(form.markup, /textarea/); assert.doesNotMatch(form.markup, /Title/);
  const mood = form.elements.find((element) => element.type === controls.SelectField)!;
  assert.deepEqual(mood.props.options?.map((option) => option.value), [null, 'great', 'good', 'okay', 'low', 'bad']);
  (mood.props as unknown as { onChange: (value: string | null) => void }).onChange(null); assert.equal(changed[0].mood, null);
  const writing = form.elements.find((element) => element.type === controls.FormField)!;
  (writing.props as unknown as { multiline: boolean; onChangeText: (text: string) => void }).onChangeText('Changed\nwriting');
  assert.equal(changed[1].content, 'Changed\nwriting'); assert.equal((writing.props as unknown as { multiline: boolean }).multiline, true);
  for (const label of ['Today', 'History', 'Delete entry']) form.elements.find((element) => element.props.label === label)!.props.onPress!();
  form.elements.find((element) => element.type === controls.FormSelect)!.props.onPress!();
  assert.deepEqual(events, ['today', 'history', 'delete', 'date']);
});

test('blank days show no saved entry and no destructive control; writing/mood changes show unsaved state', () => {
  const actions = { today, onChange: () => {}, onDate: () => {}, onToday: () => {}, onHistory: () => {}, onDelete: () => {}, onRetryDraft: () => {}, onDiscardConflict: () => {} };
  const blank = { ...state, date: today, entry: null, draft: { content: '', mood: null } };
  const form = renderControl(() => journalEditor.JournalEditor({ ...actions, state: blank }));
  assert.match(form.markup, /No saved entry for this day/); assert.ok(!form.elements.some((element) => element.props.label === 'Delete entry'));
  const dirty = renderControl(() => journalEditor.JournalEditor({ ...actions, state: { ...blank, draft: { content: 'Draft', mood: null } } }));
  assert.match(dirty.markup, /Unsaved changes/);
});

test('History renders readable date/mood/text previews and delivers date selection/paging without changing writing', () => {
  const selected: string[] = []; let older = 0;
  const form = renderControl(() => journalHistory.JournalHistory({ entries: [entry], hasMore: true, error: null,
    onSelect: (date) => selected.push(date), onOlder: () => { older++; }, onRetry: () => {}, onDismiss: () => {} }));
  const row = form.elements.find((element) => element.props.accessibilityLabel?.startsWith('Open journal'))!;
  assert.match(row.props.accessibilityLabel!, /mood Good.*First line Second line/); row.props.onPress!();
  form.elements.find((element) => element.props.label === 'Load older entries')!.props.onPress!();
  assert.deepEqual(selected, [entry.entryDate]); assert.equal(older, 1); assert.equal(entry.content, 'First line\nSecond line');
});

test('About this day is separate, concise and formats actual centavo totals with all source counts', () => {
  const form = renderControl(() => journalContext.JournalContext({ context, error: null, onRetry: () => {} }));
  assert.match(form.markup, /About this day/); assert.match(form.markup, /Tasks completed: 4/); assert.match(form.markup, /Upper Body/);
  assert.match(form.markup, /3 exercises.*9 sets/); assert.match(form.markup, /120,00/); assert.match(form.markup, /500,00/); assert.match(form.markup, /380,00/);
  assert.doesNotMatch(form.markup, /textarea/);
});

test('empty activity stays calm and context errors offer independent retry', () => {
  const empty = renderControl(() => journalContext.JournalContext({ context: { ...context, completedTaskCount: 0, workoutCount: 0, transactionCount: 0 }, error: null, onRetry: () => {} }));
  assert.match(empty.markup, /No completed activity or transactions/); assert.doesNotMatch(empty.markup, /Spent:/);
  let retries = 0;
  const failed = renderControl(() => journalContext.JournalContext({ context: null, error: 'Activity unavailable', onRetry: () => { retries++; } }));
  assert.match(failed.markup, /Activity unavailable/); failed.elements.find((element) => element.props.label === 'Retry activity')!.props.onPress!(); assert.equal(retries, 1);
});

test('date browsing confirms a chosen day through the shared sheet without writing an entry on open', () => {
  const dates: string[] = [];
  const form = renderControl(() => journalDate.JournalDate({ date: today, today, onSelect: (date) => dates.push(date), onDismiss: () => {} }));
  assert.equal(dates.length, 0); assert.ok(form.elements.some((element) => element.props.label === 'Date'));
  const sheet = form.elements.find((element) => element.props.onConfirm)!; sheet.props.onConfirm!(); assert.deepEqual(dates, [today]);
});

test('unsaved-change sheet exposes Save, Discard and Keep editing, with dismissal keeping writing', () => {
  const choices: JournalLeaveChoice[] = [];
  const form = renderControl(() => journalLeave.JournalLeave({ onChoose: (choice) => choices.push(choice) }));
  for (const label of ['Save', 'Discard changes', 'Keep editing']) form.elements.find((element) => element.props.label === label)!.props.onPress!();
  form.elements.find((element) => element.props.onDismiss)!.props.onDismiss!();
  assert.deepEqual(choices, ['save', 'discard', 'keep', 'keep']);
});

test('Home provides a modest secondary Journal route alongside Calendar without another tab', () => {
  const opened: HomeNavigation[] = [];
  const form = renderControl(() => homeContent.HomeContent({ snapshot: { date: today, today: [], attention: [], activeWorkout: null, completedWorkout: null, nothingPending: true },
    onOpen: (target) => opened.push(target), onComplete: () => {} }));
  form.elements.find((element) => element.props.label === "Today's journal")!.props.onPress!(); assert.deepEqual(opened, [{ pathname: '/journal' }]);
  assert.ok(form.elements.some((element) => element.props.label === 'View Calendar'));
});

test('Home’s Journal action restores the local-today draft while the Journal editor still announces no saved entry', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  f.access.persistDraft(today, { content: 'Recovered from Home\nUnsaved.', mood: 'good' }, null);
  const localToday = localDateString(new Date(f.now()));
  const editor = createJournalEditor(f.access, localToday, () => {}, f.now, fakeDraftTimers().host);
  const home = renderControl(() => homeContent.HomeContent({ snapshot: { date: today, today: [], attention: [], activeWorkout: null, completedWorkout: null, nothingPending: true },
    onOpen: (target) => { assert.equal(target.pathname, '/journal'); editor.load(localToday); }, onComplete: () => {} }));
  home.elements.find((element) => element.props.label === "Today's journal")!.props.onPress!();
  const screen = renderControl(() => journalEditor.JournalEditor({ state: editor.getState(), today, onChange: editor.change,
    onDate: () => {}, onToday: () => {}, onHistory: () => {}, onDelete: () => {}, onRetryDraft: editor.flushDraft, onDiscardConflict: () => {} }));
  assert.match(screen.markup, /Recovered from Home/); assert.match(screen.markup, /Restored unsaved draft/);
  assert.match(screen.markup, /No saved entry for this day/); assert.match(screen.markup, /Unsaved changes/); assert.doesNotMatch(screen.markup, /Recover unsaved draft\?/);
  assert.equal(f.access.getEntry(today), null); assert.equal(f.access.listHistory().entries.length, 0);
});

test('a draft protection failure exposes Retry without presenting the working draft as saved', () => {
  let retries = 0;
  const form = renderControl(() => journalEditor.JournalEditor({ state: { ...state, recoveryError: 'Unable to protect your draft locally.',
    draft: { content: 'Unsaved writing', mood: null } }, today, onChange: () => {}, onDate: () => {}, onToday: () => {}, onHistory: () => {}, onDelete: () => {},
    onRetryDraft: () => { retries++; }, onDiscardConflict: () => {} }));
  assert.match(form.markup, /Unable to protect your draft/); assert.match(form.markup, /Unsaved changes/);
  form.elements.find((element) => element.props.label === 'Retry draft protection')!.props.onPress!(); assert.equal(retries, 1);
});

test('save conflict keeps local writing visible and offers explicit Discard and reload without an overwrite action', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close());
  const first = f.access.save(today, { content: 'Saved version 1', mood: 'good' }, null)!;
  const editor = createJournalEditor(f.access, today, () => {}, f.now, fakeDraftTimers().host); editor.load(today);
  editor.change({ content: 'Local writing\nStill here.', mood: 'low' });
  const newer = f.access.save(today, { content: 'Saved version 2', mood: 'great' }, first)!;
  assert.equal(editor.save(), false);
  let discardRequested = false;
  const form = renderControl(() => journalEditor.JournalEditor({ state: editor.getState(), today, onChange: editor.change,
    onDate: () => {}, onToday: () => {}, onHistory: () => {}, onDelete: () => assert.fail('conflict must not offer Delete'),
    onRetryDraft: editor.flushDraft, onDiscardConflict: () => { discardRequested = true; } }));
  assert.match(form.markup, /changed since you started editing/); assert.match(form.markup, /Local writing/);
  assert.match(form.markup, /Unsaved changes/); assert.doesNotMatch(form.markup, /Save anyway|Save will replace|Delete entry/);
  assert.equal(discardRequested, false); assert.equal(f.access.getDraft(today)!.content, 'Local writing\nStill here.');
  form.elements.find((element) => element.props.label === 'Discard changes and reload')!.props.onPress!();
  assert.equal(discardRequested, true, 'the screen owns discard confirmation');
  assert.deepEqual(f.access.getEntry(today), newer);
  assert.equal(f.access.getDraft(today)!.content, 'Local writing\nStill here.', 'requesting confirmation does not discard');
  editor.discard(); assert.equal(editor.getState().draft.content, newer.content); assert.equal(editor.getState().conflict, false);
});

/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { JournalEditorState, JournalLeaveChoice } from '../src/features/journal/editor';
import type { JournalDraft, JournalDayContext } from '../src/features/journal/types';
import type { HomeNavigation } from '../src/features/source-navigation';
import { createJournalEditor } from '../src/features/journal/editor';
import { journalFullDate } from '../src/features/journal/presentation';
import { fakeDraftTimers, journalDatabase } from './helpers/journal';
import { controls, homeContent, journalContext, journalDate, journalEditor, journalHistory, journalLeave, renderControl } from './helpers/form-components';

const today = '2026-10-04';
const entry = { id: 'entry', entryDate: '2026-10-03', content: 'First line\nSecond line', mood: 'good' as const, createdAt: 0, updatedAt: 0, deletedAt: null };
const state: JournalEditorState = { date: entry.entryDate, entry, draft: { content: entry.content, mood: entry.mood }, loaded: true, error: null, message: null,
  baseline: { id: entry.id, updatedAt: entry.updatedAt }, conflict: false, recoveryError: null, recoveryMessage: null };
const actions = { onChange: () => {}, onRetryDraft: () => {}, onDiscardConflict: () => {} };
const context: JournalDayContext = { date: today, completedTaskCount: 4, taskNames: ['One', 'Two', 'Three', 'Four'], workoutCount: 1,
  workouts: [{ id: 'workout', name: 'Upper Body', exerciseCount: 3, setCount: 9 }], transactionCount: 2, incomeMinor: 50000n, expensesMinor: 12000n, netFlowMinor: 38000n };

test('Journal writing uses compact optional mood buttons and shared top-aligned multiline input', () => {
  const changed: JournalDraft[] = [];
  const form = renderControl(() => journalEditor.JournalEditor({ ...actions, state, onChange: (draft) => changed.push(draft) }));
  assert.match(form.markup, /Journal entry for/); assert.match(form.markup, /textarea/); assert.doesNotMatch(form.markup, /Title/);
  const moods = form.elements.filter((element) => element.props.accessibilityLabel?.endsWith(', mood'));
  assert.deepEqual(moods.map((element) => element.props.accessibilityLabel), ['Great, mood', 'Good, mood', 'Okay, mood', 'Low, mood', 'Bad, mood']);
  assert.equal((moods[1].props as { accessibilityState?: { selected: boolean } }).accessibilityState?.selected, true);
  assert.match(form.markup, /icon-check/); assert.match(form.markup, /aria-pressed="true"/);
  moods[1].props.onPress!(); assert.equal(changed[0].mood, null);
  moods[0].props.onPress!(); assert.equal(changed[1].mood, 'great');
  const writing = form.elements.find((element) => element.type === controls.FormField)!;
  (writing.props as unknown as { onChangeText: (text: string) => void }).onChangeText('Changed\nwriting');
  assert.equal(changed[2].content, 'Changed\nwriting');
  const props = writing.props as unknown as { multiline: boolean; style: { minHeight: number; height?: number; textAlignVertical: string }; autoFocus?: boolean };
  assert.equal(props.multiline, true); assert.equal(props.style.minHeight, 320); assert.equal(props.style.height, undefined);
  assert.equal(props.style.textAlignVertical, 'top'); assert.equal(props.autoFocus, undefined);
});

test('empty historical browsing is intentional while current writing and dirty drafts stay direct', () => {
  const blank = { ...state, entry: null, draft: { content: '', mood: null } }; let writes = 0;
  const browsing = renderControl(() => journalEditor.JournalEditor({ ...actions, state: blank, writingVisible: false, onWrite: () => { writes++; } }));
  assert.match(browsing.markup, /No entry for this day/); assert.doesNotMatch(browsing.markup, /textarea/);
  browsing.elements.find((element) => element.props.label === 'Write an entry')!.props.onPress!(); assert.equal(writes, 1);
  const writing = renderControl(() => journalEditor.JournalEditor({ ...actions, state: { ...blank, date: today } }));
  assert.match(writing.markup, /Write about your day/); assert.doesNotMatch(writing.markup, /Delete entry/);
  const dirty = renderControl(() => journalEditor.JournalEditor({ ...actions, state: { ...blank, draft: { content: 'Draft', mood: null } } }));
  assert.match(dirty.markup, /Unsaved changes/);
});

test('daily orientation announces full date and exposes disabled Next on today', () => {
  const dates: string[] = [];
  const form = renderControl(() => journalDate.JournalDayNavigation({ date: today, today, onPrevious: () => dates.push('previous'), onNext: () => {}, onToday: () => {}, onDate: () => dates.push('picker') }));
  assert.match(form.markup, /2026/); assert.ok(form.elements.some((element) => element.props.accessibilityLabel === journalFullDate(today)));
  assert.equal(form.elements.find((element) => element.props.accessibilityLabel === 'Next day')!.props.disabled, true);
  assert.ok(!form.elements.some((element) => element.props.label === 'Today'));
  form.elements.find((element) => element.props.accessibilityLabel === 'Previous day')!.props.onPress!(); assert.deepEqual(dates, ['previous']);
});

test('History groups months with normalized two-line previews and preserves editable date selection', () => {
  const selected: string[] = []; let older = 0;
  const form = renderControl(() => journalHistory.JournalHistory({ entries: [entry, { ...entry, id: 'older', entryDate: '2025-12-31', mood: null }], hasMore: true, error: null,
    onSelect: (date) => selected.push(date), onOlder: () => { older++; }, onRetry: () => {} }));
  const row = form.elements.find((element) => element.props.accessibilityLabel?.startsWith('Open journal'))!;
  assert.match(row.props.accessibilityLabel!, /mood Good.*Preview: First line Second line/); row.props.onPress!();
  form.elements.find((element) => element.props.label === 'Load older entries')!.props.onPress!();
  assert.deepEqual(selected, [entry.entryDate]); assert.equal(older, 1); assert.equal(entry.content, 'First line\nSecond line');
  assert.match(form.markup, /2025/); assert.doesNotMatch(form.markup, /No mood/);
  const previews = form.elements.filter((element) => (element.props as { numberOfLines?: number }).numberOfLines === 2); assert.equal(previews.length, 2);
});

test('Day at a Glance gives counts, one workout name and exact Finance context without a dashboard', () => {
  const form = renderControl(() => journalContext.JournalContext({ context, error: null, onRetry: () => {} }));
  assert.match(form.markup, /Day at a Glance/); assert.match(form.markup, /4 completed/); assert.match(form.markup, /Upper Body/);
  for (const name of context.taskNames) assert.match(form.markup, new RegExp(name));
  assert.doesNotMatch(form.markup, /3 exercises|9 sets|textarea|Balance/);
  for (const amount of ['120,00', '500,00', '380,00']) assert.match(form.markup, new RegExp(amount));
  const multiple = renderControl(() => journalContext.JournalContext({ context: { ...context, workoutCount: 2 }, error: null, onRetry: () => {} }));
  assert.match(multiple.markup, /2 workouts completed/); assert.doesNotMatch(multiple.markup, /Upper Body/);
});

test('zero activity is omitted; context errors have an independent Retry', () => {
  const empty = renderControl(() => journalContext.JournalContext({ context: { ...context, completedTaskCount: 0, workoutCount: 0, transactionCount: 0 }, error: null, onRetry: () => {} }));
  assert.equal(empty.elements.length, 0); let retries = 0;
  const failed = renderControl(() => journalContext.JournalContext({ context: null, error: 'Activity unavailable', onRetry: () => { retries++; } }));
  assert.match(failed.markup, /Activity unavailable/); failed.elements.find((element) => element.props.label === 'Retry activity')!.props.onPress!(); assert.equal(retries, 1);
});

test('date picker and leave confirmation preserve existing explicit actions', () => {
  const dates: string[] = [];
  const form = renderControl(() => journalDate.JournalDate({ date: today, today, onSelect: (date) => dates.push(date), onDismiss: () => {} }));
  assert.equal(dates.length, 0); form.elements.find((element) => element.props.onConfirm)!.props.onConfirm!(); assert.deepEqual(dates, [today]);
  const choices: JournalLeaveChoice[] = [];
  const leave = renderControl(() => journalLeave.JournalLeave({ onChoose: (choice) => choices.push(choice) }));
  for (const label of ['Save', 'Discard changes', 'Keep editing']) leave.elements.find((element) => element.props.label === label)!.props.onPress!();
  leave.elements.find((element) => element.props.onDismiss)!.props.onDismiss!(); assert.deepEqual(choices, ['save', 'discard', 'keep', 'keep']);
});

test('Home retains its compact direct today Journal navigation contract', () => {
  const opened: HomeNavigation[] = [];
  const form = renderControl(() => homeContent.HomeContent({ onAddTransaction: () => {}, snapshot: { date: today, today: [], attention: [], activeWorkout: null, completedWorkout: null, nothingPending: true, spentTodayMinor: 0n, completedWorkoutCount: 0, nextWorkout: null, rotationSequence: [], todayPreview: [], attentionPreview: [], nextUp: null, journal: { hasEntry: false } },
    onOpen: (target) => opened.push(target), onComplete: () => {} }));
  form.elements.find((element) => element.props.accessibilityLabel?.startsWith('Journal.'))!.props.onPress!(); assert.deepEqual(opened, [{ pathname: '/journal' }]);
});

test('recovered draft stays unsaved and the banner quiets only after resuming editing', async (t) => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close()); f.access.persistDraft(today, { content: 'Recovered\nUnsaved.', mood: 'good' }, null);
  const editor = createJournalEditor(f.access, today, () => {}, f.now, fakeDraftTimers().host); editor.load(today);
  const form = renderControl(() => journalEditor.JournalEditor({ ...actions, state: editor.getState(), onChange: editor.change }));
  assert.match(form.markup, /Recovered draft/); assert.match(form.markup, /Unsaved changes/); assert.equal(f.access.getEntry(today), null);
  editor.change({ ...editor.getState().draft, content: 'Resumed writing' }); assert.equal(editor.getState().recoveryMessage, null);
  assert.equal(f.access.listHistory().entries.length, 0);
});

test('draft-protection failure and stale-save conflict retain writing and explicit discard confirmation', async (t) => {
  let retries = 0;
  const failed = renderControl(() => journalEditor.JournalEditor({ ...actions, state: { ...state, recoveryError: 'Unable to protect your draft locally.' }, onRetryDraft: () => { retries++; } }));
  failed.elements.find((element) => element.props.label === 'Retry draft protection')!.props.onPress!(); assert.equal(retries, 1);
  const f = await journalDatabase(); t.after(() => f.sqlite.close()); const first = f.access.save(today, { content: 'Saved 1', mood: 'good' }, null)!;
  const editor = createJournalEditor(f.access, today, () => {}, f.now, fakeDraftTimers().host); editor.load(today); editor.change({ content: 'Local writing', mood: 'low' });
  const newer = f.access.save(today, { content: 'Saved 2', mood: 'great' }, first)!; assert.equal(editor.save(), false); let discarded = false;
  const form = renderControl(() => journalEditor.JournalEditor({ ...actions, state: editor.getState(), onChange: editor.change, onDiscardConflict: () => { discarded = true; } }));
  assert.match(form.markup, /changed since you started editing/); assert.match(form.markup, /Local writing/); assert.doesNotMatch(form.markup, /Save anyway|Delete entry/);
  form.elements.find((element) => element.props.label === 'Discard changes and reload')!.props.onPress!(); assert.equal(discarded, true);
  assert.deepEqual(f.access.getEntry(today), newer); assert.equal(f.access.getDraft(today)!.content, 'Local writing');
  editor.change({ content: 'Still local', mood: null }); assert.ok(editor.getState().recoveryMessage, 'conflict explanation remains during editing');
  editor.discard(); assert.equal(editor.getState().draft.content, newer.content);
});

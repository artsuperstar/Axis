/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { NextWorkout, SessionSummary } from '../src/features/fitness/types';
import type { HomeItem, HomeSection, HomeSnapshot, HomeTaskItem } from '../src/features/home/types';
import type { HomeNavigation } from '../src/features/source-navigation';
import { formatBrlAmount } from '../src/features/finance/money';
import { controls, homeContent, renderControl } from './helpers/form-components';

const today = '2026-10-04';
const task: HomeTaskItem = { id: 'task:task-id', source: 'task', recordId: 'task-id', occurrenceId: null, title: 'Submit report',
  time: '10:30', date: today, completed: false, priority: 'high', status: 'Today', secondary: '10:30 · High priority',
  target: { pathname: '/home-source', params: { source: 'task', recordId: 'task-id', date: today } } };
const commitment: HomeItem = { id: 'commitment:bill-id:2025-08-03', source: 'commitment', recordId: 'bill-id', occurrenceId: 'due-id',
  title: 'Electricity', date: '2025-08-03', status: 'Overdue', amountMinor: 18000, secondary: 'Bill · Expected R$ 180,00',
  target: { pathname: '/home-source', params: { source: 'commitment', recordId: 'bill-id', date: '2025-08-03' } } };
const work: HomeItem = { id: 'work:work-id', source: 'work', recordId: 'work-id', title: 'Inventory Software', clientName: 'João Inglês', date: today, status: 'Expected payment',
  amountMinor: 60000, secondary: 'João Inglês · R$ 600,00 outstanding',
  target: { pathname: '/home-source', params: { source: 'work', recordId: 'work-id', date: today } } };
function empty(): HomeSnapshot { return { date: today, today: [], attention: [], todayPreview: [], attentionPreview: [], nextUp: null,
  journal: { hasEntry: false }, activeWorkout: null, completedWorkout: null, nothingPending: true, spentTodayMinor: 0n, completedWorkoutCount: 0, nextWorkout: null, rotationSequence: [] }; }
function workout(): SessionSummary {
  return { id: 'workout-id', routineId: null, rotationId: null, rotationStepId: null, name: 'Upper Body', startedAt: 1791142200000, completedAt: null,
    createdAt: 1791142200000, updatedAt: 1791142200000, deletedAt: null, note: null, exerciseCount: 5, setCount: 18 };
}
function nextWorkout(): NextWorkout { return { rotation: { id: 'cycle', name: 'Gym Cycle' }, stepId: 'legs-step',
  routine: { id: 'legs', name: 'Legs', createdAt: 1, updatedAt: 1, deletedAt: null } }; }
const section = (item: HomeItem, count = 1): HomeSection => ({ source: item.source, title: item.source === 'task' ? 'Tasks' : item.source === 'commitment' ? 'Overdue commitments' : 'Work',
  total: count, remaining: count - 1, items: [item], target: item.source === 'task' ? { pathname: '/(tabs)/tasks' } : { pathname: '/home-source', params: { source: item.source } } });
const noop = () => {};

test('Task row has distinct navigation and checkbox completion with exact source identity and visible time', () => {
  let selected: HomeNavigation | null = null; let completed: HomeTaskItem | null = null;
  const form = renderControl(() => homeContent.HomeItemRow({ item: task, today, onOpen: (target) => { selected = target; }, onComplete: (item) => { completed = item; } }));
  assert.match(form.markup, /Submit report/); assert.match(form.markup, /10:30/); assert.match(form.markup, /High priority/);
  assert.match(form.markup, /role="checkbox"/); assert.match(form.markup, /aria-checked="false"/);
  const opener = form.elements.find((element) => element.props.accessibilityLabel?.startsWith('Open Submit report'))!;
  assert.match(opener.props.accessibilityLabel!, /Task.*Today.*10:30.*High priority/);
  opener.props.onPress!();
  form.elements.find((element) => element.props.accessibilityLabel?.startsWith('Complete Submit report'))!.props.onPress!();
  assert.deepEqual(selected, task.target); assert.equal(completed, task);
});

test('date-only Task does not invent a time or All day placeholder; Next Up does not offer premature completion', () => {
  for (const status of ['Today', 'Upcoming'] as const) {
    const form = renderControl(() => homeContent.HomeItemRow({ item: { ...task, time: null, secondary: 'All day', status }, today, onOpen: noop, onComplete: noop }));
    assert.doesNotMatch(form.markup, /10:30|All day|00:00/);
    assert.equal(form.elements.some((element) => element.props.accessibilityLabel?.startsWith('Complete ')), status === 'Today');
  }
});

test('financial rows keep job/obligation first, secondary client/source, full amounts and navigation only', () => {
  const targets: HomeNavigation[] = [];
  for (const item of [commitment, work, { ...work, status: 'Payment overdue', date: '2026-10-03' }]) {
    const form = renderControl(() => homeContent.HomeItemRow({ item, today, onOpen: (target) => targets.push(target), onComplete: () => assert.fail() }));
    const opener = form.elements.find((element) => element.props.accessibilityLabel?.startsWith('Open '))!;
    assert.ok(opener.props.accessibilityLabel?.includes(item.title));
    assert.ok(opener.props.accessibilityLabel?.includes(item.secondary));
    assert.ok(!form.elements.some((element) => element.props.accessibilityLabel?.startsWith('Complete '))); opener.props.onPress!();
    if (item.source === 'commitment') assert.match(form.markup, /Overdue since/);
    else { assert.ok(form.markup.indexOf('Inventory Software') < form.markup.indexOf('João Inglês')); assert.match(form.markup, /Work/); }
    assert.doesNotMatch(form.markup, />Pay<|Record payment|alert/);
  }
  assert.deepEqual(targets, [commitment.target, work.target, work.target]);
});


test('collapsed Home always renders four summary boxes and persistent zero spending before the grid, without detail controls', () => {
  const targets: HomeNavigation[] = [];
  let additions = 0;
  const form = renderControl(() => homeContent.HomeContent({ onAddTransaction: () => { additions++; }, snapshot: empty(), onOpen: (target) => targets.push(target), onComplete: noop }));
  assert.match(form.markup, /Spent today/); assert.match(form.markup, /R\$ 0,00/);
  const labels = ['Today', 'Needs attention', 'Fitness', 'Journal'];
  const boxes = labels.map((label) => form.elements.find((element) => element.props.accessibilityLabel?.startsWith(label + '.'))!);
  assert.ok(boxes.every(Boolean));
  for (const box of boxes.slice(0, 3)) assert.deepEqual(box.props.accessibilityState, { selected: false, expanded: false });
  assert.equal(boxes[3].props.accessibilityState, undefined);
  assert.match(form.markup, /Nothing scheduled/); assert.match(form.markup, /Nothing needs attention/);
  assert.match(form.markup, /No workout today/); assert.match(form.markup, /Not written yet/);
  assert.doesNotMatch(form.markup, /View in Calendar|Resume workout|Open Fitness|Write about your day/);
  assert.ok(form.markup.indexOf('Spent today') < form.markup.indexOf('Needs attention'));
  const information = form.elements.find((element) => element.props.accessibilityLabel?.startsWith('Spent today,'))!;
  assert.equal((information.props as { accessibilityRole?: string }).accessibilityRole, 'text'); assert.equal(information.props.onPress, undefined);
  const plus = form.elements.find((element) => element.props.accessibilityLabel === 'Add transaction')!;
  const button = renderControl(() => controls.FormButton({ label: '+', variant: 'quiet', accessibilityLabel: 'Add transaction', onPress: plus.props.onPress! })).elements[0];
  assert.equal((button.props as { accessibilityRole?: string }).accessibilityRole, 'button'); button.props.onPress!();
  assert.equal(additions, 1); assert.deepEqual(targets, []);
  const style = button.props.style as unknown as (state: { pressed: boolean }) => unknown[];
  const flat = Object.assign({}, ...style({ pressed: false }));
  assert.ok(flat.minHeight >= 44); assert.ok(flat.minWidth >= 44);
});

test('Today summary covers zero, one, multiple and Next Up without mounting agenda rows', () => {
  for (const count of [0, 1, 40]) {
    const form = renderControl(() => homeContent.HomeContent({ onAddTransaction: () => {}, snapshot: { ...empty(),
      today: count ? [section(task, count)] : [], todayPreview: count ? [task] : [],
      nextUp: count ? null : { ...task, status: 'Upcoming', date: '2026-10-05' } }, onOpen: noop, onComplete: noop }));
    const box = form.elements.find((element) => element.props.accessibilityLabel?.startsWith('Today.'))!;
    assert.ok(box.props.accessibilityLabel?.includes(`${count} items`));
    if (count) assert.ok(box.props.accessibilityLabel?.includes('10:30 Submit report'));
    else assert.match(form.markup, /Next: 10:30 Submit report/);
    if (count > 1) assert.match(form.markup, /\+ 39 more/);
    assert.ok(!form.elements.some((element) => element.props.accessibilityLabel?.startsWith('Open Submit report')));
  }
});

test('attention summary counts each source, zero attention and large backlog without preview truncation', () => {
  for (const items of [[], [task], [commitment], [work], [task, commitment, work]]) {
    const form = renderControl(() => homeContent.HomeContent({ onAddTransaction: () => {}, snapshot: { ...empty(), attention: items.map((item) => section(item, 17)) },
      onOpen: noop, onComplete: noop }));
    const box = form.elements.find((element) => element.props.accessibilityLabel?.startsWith('Needs attention.'))!;
    assert.ok(box.props.accessibilityLabel?.includes(`${items.length * 17} items`));
    for (const item of items) assert.ok(box.props.accessibilityLabel?.includes(item.source === 'task' ? '17 tasks needing attention'
      : item.source === 'commitment' ? '17 overdue commitments' : '17 overdue work payments'));
    assert.ok(!form.elements.some((element) => element.props.accessibilityLabel?.startsWith('Open ')));
  }
});

test('Fitness collapsed states use active, completed with next, multiple with next, rotation only and empty priority', () => {
  for (const [count, active, expected] of [[0, false, 'No workout today'], [1, false, 'Workout done'], [3, false, '3 workouts completed'],
    [0, true, 'Workout in progress'], [3, true, 'Workout in progress']] as const) {
    const session = workout();
    const form = renderControl(() => homeContent.HomeContent({ onAddTransaction: () => {}, snapshot: { ...empty(), completedWorkoutCount: count, nextWorkout: nextWorkout(),
      activeWorkout: active ? { session, target: { pathname: '/(tabs)/fitness' } } : null,
      completedWorkout: !active && count ? { session: { ...session, completedAt: 1 }, target: { pathname: '/home-source', params: { source: 'fitness', recordId: session.id } } } : null },
      onOpen: noop, onComplete: noop }));
    const box = form.elements.find((element) => element.props.accessibilityLabel?.startsWith('Fitness.'))!;
    assert.ok(box.props.accessibilityLabel?.includes(count || active ? expected : 'Up next'));
    assert.doesNotMatch(form.markup, /Workout missed|Workout not done|Resume workout/);
    if (active) assert.ok(!box.props.accessibilityLabel?.includes('workouts completed'));
    if (active) assert.ok(!box.props.accessibilityLabel?.includes('Next: Legs'));
    else assert.ok(box.props.accessibilityLabel?.includes(count ? 'Next: Legs' : 'Legs'));
  }
  const emptyFitness = renderControl(() => homeContent.HomeContent({ onAddTransaction: () => {}, snapshot: empty(), onOpen: noop, onComplete: noop }));
  assert.match(emptyFitness.markup, /No workout today/);
});

test('bounded expanded attention and Today preserve totals and original source/Calendar destinations', () => {
  const selected: HomeNavigation[] = []; const rows = Array.from({ length: 5 }, (_, index) => ({ ...commitment, id: `bill-${index}` }));
  const snapshot = { ...empty(), attention: [section(commitment, 13)], attentionPreview: rows, today: [section(task, 40)], todayPreview: [task] };
  const attention = renderControl(() => homeContent.HomeDetail({ panel: 'attention', snapshot, onOpen: (target) => selected.push(target), onComplete: noop }));
  assert.match(attention.markup, /Needs attention · 13/); assert.match(attention.markup, /8 more/);
  attention.elements.find((element) => element.props.label === 'Commitments (13)')!.props.onPress!();
  const scheduled = renderControl(() => homeContent.HomeDetail({ panel: 'today', snapshot, onOpen: (target) => selected.push(target), onComplete: noop }));
  assert.match(scheduled.markup, /Today · 40/);
  scheduled.elements.find((element) => element.props.label === 'View in Calendar')!.props.onPress!();
  assert.deepEqual(selected, [section(commitment).target, { pathname: '/(tabs)/calendar' }]);
});

test('expanded Fitness exposes direct Resume, completed read-only navigation or Open Fitness only', () => {
  const targets: HomeNavigation[] = [];
  const active = renderControl(() => homeContent.HomeDetail({ panel: 'fitness', snapshot: { ...empty(), activeWorkout: { session: workout(), target: { pathname: '/(tabs)/fitness' } } },
    onOpen: (target) => targets.push(target), onComplete: noop }));
  assert.match(active.markup, /5 exercises.*18 sets logged/);
  active.elements.find((element) => element.props.label === 'Resume workout')!.props.onPress!();
  const target = { pathname: '/home-source' as const, params: { source: 'fitness' as const, recordId: 'workout-id' } };
  const completed = renderControl(() => homeContent.HomeDetail({ panel: 'fitness', snapshot: { ...empty(), completedWorkoutCount: 2, nextWorkout: nextWorkout(), completedWorkout: { session: { ...workout(), completedAt: 1 }, target } },
    onOpen: (value) => targets.push(value), onComplete: noop }));
  assert.match(completed.markup, /2 workouts completed today/);
  assert.match(completed.markup, /5 exercises.*18 sets logged/); assert.match(completed.markup, /Next workout.*Legs/); assert.match(completed.markup, /Gym Cycle/);
  completed.elements.find((element) => element.props.label === 'View latest workout')!.props.onPress!();
  const blank = renderControl(() => homeContent.HomeDetail({ panel: 'fitness', snapshot: empty(), onOpen: (value) => targets.push(value), onComplete: noop }));
  blank.elements.find((element) => element.props.label === 'Open Fitness')!.props.onPress!();
  assert.deepEqual(targets, [{ pathname: '/(tabs)/fitness' }, target, { pathname: '/(tabs)/fitness' }]);
  assert.match(blank.markup, /No workout recorded today/); assert.match(blank.markup, /No active workout rotation/);
  const planning = renderControl(() => homeContent.HomeDetail({ panel: 'fitness', snapshot: { ...empty(), nextWorkout: nextWorkout(), rotationSequence: ['Push', 'Pull', 'Legs'] }, onOpen: noop, onComplete: noop }));
  assert.match(planning.markup, /Up next.*Legs/); assert.match(planning.markup, /Gym Cycle/); assert.match(planning.markup, /Push → Pull → Legs/);
  assert.doesNotMatch(planning.markup, /Finish Workout|Add set|Workout missed|Workout overdue/);
});

test('Journal saved status appears in its direct navigation box without expansion semantics', () => {
  for (const hasEntry of [false, true]) {
    const snapshot = { ...empty(), journal: { hasEntry } }; const opened: HomeNavigation[] = [];
    const collapsed = renderControl(() => homeContent.HomeContent({ onAddTransaction: () => {}, snapshot, onOpen: (target) => opened.push(target), onComplete: noop }));
    assert.match(collapsed.markup, hasEntry ? /Entry saved/ : /Not written yet/);
    const journal = collapsed.elements.find((element) => element.props.accessibilityLabel?.startsWith('Journal.'))!;
    assert.match(journal.props.accessibilityLabel!, /Opens Journal/);
    assert.equal(journal.props.accessibilityState, undefined); assert.equal((journal.props as { 'aria-expanded'?: boolean })['aria-expanded'], undefined);
    journal.props.onPress!();
    assert.deepEqual(opened, [{ pathname: '/journal' }]);
  }
});

test('grid uses two ordinary phone columns and deliberately stacks at large text scales', () => {
  for (const width of [288, 358, 398]) assert.equal(homeContent.homeGridColumns(width, 1), 2);
  assert.equal(homeContent.homeGridColumns(358, 2), 1); assert.equal(homeContent.homeGridColumns(200, 1), 1);
  assert.equal(homeContent.homeGridColumns(620, 2), 2);
});

test('summary labels and Spent today retain long source/workout names and every centavo of a large BigInt total', () => {
  const name = 'A very long name '.repeat(12).trim(); const spent = 123456789012345678901n;
  for (const item of [task, commitment, work]) {
    const first = { ...item, title: name };
    const form = renderControl(() => homeContent.HomeContent({ onAddTransaction: () => {}, snapshot: { ...empty(), spentTodayMinor: spent,
      today: [section(first)], todayPreview: [first], activeWorkout: { session: { ...workout(), name }, target: { pathname: '/(tabs)/fitness' } } },
      onOpen: noop, onComplete: noop }));
    assert.ok(form.markup.includes(formatBrlAmount(spent)));
    for (const title of ['Today', 'Fitness']) assert.ok(form.elements.find((element) => element.props.accessibilityLabel?.startsWith(title + '.'))!.props.accessibilityLabel?.includes(name));
    assert.doesNotMatch(form.markup, /text-overflow:ellipsis|white-space:nowrap/);
  }
});
test('long next-routine and rotation sequence names remain complete in summaries and expanded planning', () => {
  const name = 'Long planned workout routine '.repeat(10).trim();
  const next = nextWorkout(); next.routine.name = name; next.rotation.name = 'Long named cycle '.repeat(10).trim();
  const snapshot = { ...empty(), nextWorkout: next, rotationSequence: ['Push', name, 'Legs'] };
  const summary = renderControl(() => homeContent.HomeContent({ onAddTransaction: () => {}, snapshot, onOpen: noop, onComplete: noop }));
  assert.ok(summary.elements.find((element) => element.props.accessibilityLabel?.startsWith('Fitness.'))!.props.accessibilityLabel?.includes(name));
  const detail = renderControl(() => homeContent.HomeDetail({ panel: 'fitness', snapshot, onOpen: noop, onComplete: noop }));
  assert.ok(detail.markup.includes(name)); assert.ok(detail.markup.includes(next.rotation.name));
  assert.ok(detail.markup.includes(`Push → ${name} → Legs`));
  for (const form of [summary, detail]) assert.doesNotMatch(form.markup, /text-overflow:ellipsis|white-space:nowrap/);
});

test('long labels and large BRL amounts wrap without fixed row height, truncation or a narrow title column', () => {
  const title = 'A long job title '.repeat(12);
  const form = renderControl(() => homeContent.HomeItemRow({ item: { ...work, title, amountMinor: 999999999999 }, today, onOpen: noop, onComplete: noop }));
  assert.ok(form.markup.includes(title)); assert.match(form.markup, /9\.999\.999\.999,99/);
  assert.doesNotMatch(form.markup, /text-overflow:ellipsis|white-space:nowrap/);
  const opener = form.elements.find((element) => element.props.accessibilityLabel?.startsWith('Open '))!;
  const style = opener.props.style as unknown as (state: { pressed: boolean }) => unknown[];
  const flat = Object.assign({}, ...style({ pressed: false }));
  assert.equal(flat.minWidth, 0); assert.equal(flat.minHeight, 44); assert.equal(flat.height, undefined);
});

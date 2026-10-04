/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { SessionSummary } from '../src/features/fitness/types';
import type { HomeItem, HomeSnapshot, HomeTaskItem } from '../src/features/home/types';
import type { HomeNavigation } from '../src/features/source-navigation';
import { homeContent, renderControl } from './helpers/form-components';

const today = '2026-10-04';
const task: HomeTaskItem = { id: 'task:task-id', source: 'task', recordId: 'task-id', occurrenceId: null, title: 'Submit report',
  time: '10:30', date: today, completed: false, priority: 'high', status: 'Today', secondary: '10:30 · High priority',
  target: { pathname: '/home-source', params: { source: 'task', recordId: 'task-id', date: today } } };
const commitment: HomeItem = { id: 'commitment:bill-id:2025-08-03', source: 'commitment', recordId: 'bill-id', occurrenceId: 'due-id',
  title: 'Electricity', date: '2025-08-03', status: 'Overdue', amountMinor: 18000, secondary: 'Bill · Expected R$ 180,00',
  target: { pathname: '/home-source', params: { source: 'commitment', recordId: 'bill-id', date: '2025-08-03' } } };
const work: HomeItem = { id: 'work:work-id', source: 'work', recordId: 'work-id', title: 'JP Balões', date: today, status: 'Expected payment',
  amountMinor: 60000, secondary: 'Website · R$ 600,00 outstanding',
  target: { pathname: '/home-source', params: { source: 'work', recordId: 'work-id', date: today } } };
function empty(): HomeSnapshot { return { date: today, today: [], attention: [], activeWorkout: null, completedWorkout: null, nothingPending: true }; }
function workout(completedAt: number | null = null): SessionSummary {
  return { id: 'workout-id', routineId: null, name: 'Upper Body', startedAt: 1791142200000, completedAt,
    createdAt: 1791142200000, updatedAt: 1791142200000, deletedAt: null, note: null, exerciseCount: 5, setCount: 18 };
}

test('empty Home shows the calm state and Calendar action without empty module cards', () => {
  const targets: HomeNavigation[] = [];
  const form = renderControl(() => homeContent.HomeContent({ snapshot: empty(), onOpen: (target) => targets.push(target), onComplete: () => assert.fail('No completion in empty Home') }));
  assert.match(form.markup, /Nothing needs your attention right now/);
  for (const text of ['Needs attention', 'Workout in progress', 'Commitments due today', 'Expected work payments']) assert.ok(!form.markup.includes(text));
  form.elements.find((element) => element.props.label === 'View Calendar')!.props.onPress!();
  assert.deepEqual(targets, [{ pathname: '/(tabs)/calendar' }]);
});

test('Task row opens its existing source route and quick Complete delivers the exact source item', () => {
  let selected: HomeNavigation | null = null; let completed: HomeTaskItem | null = null;
  const form = renderControl(() => homeContent.HomeItemRow({ item: task, today, onOpen: (target) => { selected = target; }, onComplete: (item) => { completed = item; } }));
  assert.match(form.markup, /Submit report/); assert.match(form.markup, /High priority/);
  const opener = form.elements.find((element) => element.props.accessibilityLabel?.startsWith('Open Submit report'))!;
  assert.match(opener.props.accessibilityLabel!, /Task.*Today.*10:30.*High priority/);
  opener.props.onPress!(); form.elements.find((element) => element.props.label === 'Complete')!.props.onPress!();
  assert.deepEqual(selected, task.target); assert.equal(completed, task);
});

test('financial rows expose original dates/status/amount in accessible labels and only navigate to existing details', () => {
  const targets: HomeNavigation[] = [];
  for (const item of [commitment, work]) {
    const form = renderControl(() => homeContent.HomeItemRow({ item, today, onOpen: (target) => targets.push(target), onComplete: () => assert.fail('Financial items have no Complete action') }));
    const opener = form.elements.find((element) => element.props.accessibilityLabel?.startsWith('Open '))!;
    assert.ok(opener.props.accessibilityLabel?.includes(item.title)); assert.ok(opener.props.accessibilityLabel?.includes(item.secondary));
    assert.ok(!form.elements.some((element) => element.props.label === 'Complete')); opener.props.onPress!();
    if (item.source === 'commitment') {
      assert.match(form.markup, /Overdue since/); assert.match(opener.props.accessibilityLabel!, /Commitment.*Overdue since.*180,00/);
    }
  }
  assert.deepEqual(targets, [commitment.target, work.target]);
});

test('bounded preview communicates full count and remaining items with the correct owning-module target', () => {
  let selected: HomeNavigation | null = null;
  const target: HomeNavigation = { pathname: '/home-source', params: { source: 'commitment' } };
  const form = renderControl(() => homeContent.HomePreview({ section: { source: 'commitment', title: 'Overdue commitments', items: [commitment], total: 13, remaining: 12, target },
    today, onOpen: (value) => { selected = value; }, onComplete: () => {} }));
  assert.match(form.markup, /Overdue commitments \(13\)/); assert.match(form.markup, /12 more items/);
  form.elements.find((element) => element.props.label === '12 more items · View all')!.props.onPress!();
  assert.deepEqual(selected, target);
});

test('active workout is prominent and Resume opens the exact existing Fitness session', () => {
  let selected: HomeNavigation | null = null;
  const target = { pathname: '/home-source' as const, params: { source: 'fitness' as const, recordId: 'workout-id' } };
  const form = renderControl(() => homeContent.HomeContent({ snapshot: { ...empty(), nothingPending: false, activeWorkout: { session: workout(), target } },
    onOpen: (value) => { selected = value; }, onComplete: () => {} }));
  assert.match(form.markup, /Workout in progress/); assert.match(form.markup, /Upper Body/);
  assert.ok(!form.markup.includes('Nothing needs your attention')); assert.ok(!form.markup.includes('Workout completed today'));
  form.elements.find((element) => element.props.label === 'Resume workout')!.props.onPress!(); assert.deepEqual(selected, target);
});

test('completed-today summary links to read-only Fitness history rather than exposing an active Resume action', () => {
  let selected: HomeNavigation | null = null;
  const target = { pathname: '/home-source' as const, params: { source: 'fitness' as const, recordId: 'workout-id' } };
  const form = renderControl(() => homeContent.HomeContent({ snapshot: { ...empty(), completedWorkout: { session: workout(1791145800000), target } },
    onOpen: (value) => { selected = value; }, onComplete: () => {} }));
  assert.match(form.markup, /Workout completed today/); assert.ok(!form.markup.includes('Resume workout'));
  form.elements.find((element) => element.props.label === 'View workout')!.props.onPress!(); assert.deepEqual(selected, target);
});

/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { activityMarkers, calendarMarkerOrder, calendarMarkerPresentation, markerAccessibilitySummary } from '../src/features/calendar/markers';
import type { CalendarSource } from '../src/features/calendar/types';

const date = '2026-10-10';
const items = (source: CalendarSource, count: number, day = date) => Array.from({ length: count }, () => ({ date: day, source }));

for (const [name, tasks, commitments, work, expected] of [
  ['one Task', 1, 0, 0, [{ type: 'task', count: 1 }]],
  ['five Tasks', 5, 0, 0, [{ type: 'task', count: 5 }]],
  ['Task and Commitment', 1, 1, 0, [{ type: 'task', count: 1 }, { type: 'commitment', count: 1 }]],
  ['several records across all three sources', 2, 3, 1, [{ type: 'task', count: 2 }, { type: 'commitment', count: 3 }, { type: 'work', count: 1 }]],
  ['no records', 0, 0, 0, []],
] as const) {
  test(`${name}: marker quantity reflects distinct source presence`, () => {
    const markers = activityMarkers([...items('task', tasks), ...items('commitment', commitments), ...items('work', work)]).get(date) ?? [];
    assert.deepEqual(markers, expected);
    assert.equal(new Set(markers.map((marker) => marker.type)).size, markers.length);
    assert.ok(markers.length <= 3);
  });
}

test('source order is stable regardless of record order and dates are grouped independently', () => {
  const rows = [...items('work', 2), ...items('commitment', 3), ...items('task', 5), ...items('work', 1, '2026-10-11')];
  assert.deepEqual(activityMarkers(rows).get(date), activityMarkers([...rows].reverse()).get(date));
  assert.deepEqual(activityMarkers(rows).get(date)!.map((marker) => marker.type), calendarMarkerOrder);
  assert.deepEqual(activityMarkers(rows).get('2026-10-11'), [{ type: 'work', count: 1 }]);
  assert.equal(activityMarkers(rows).has('2026-10-12'), false);
});

test('source presentation gives Work its expected-payment meaning and a distinct semantic theme token', () => {
  assert.deepEqual(calendarMarkerOrder.map((type) => calendarMarkerPresentation[type].color), ['calendarTask', 'calendarCommitment', 'calendarWorkPayment']);
  assert.equal(calendarMarkerPresentation.work.singular, 'expected payment');
});

test('accessible summaries retain per-source counts, pluralization, and a concise empty state', () => {
  const markers = activityMarkers([...items('task', 3), ...items('commitment', 1), ...items('work', 2)]).get(date)!;
  assert.equal(markerAccessibilitySummary(markers), '3 tasks, 1 commitment, 2 expected payments');
  assert.equal(markerAccessibilitySummary([{ type: 'task', count: 1 }, { type: 'commitment', count: 2 }, { type: 'work', count: 1 }]),
    '1 task, 2 commitments, 1 expected payment');
  assert.equal(markerAccessibilitySummary([]), 'No scheduled activity');
});

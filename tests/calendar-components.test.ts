/// <reference types="node" />

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { selectDate } from '../src/features/calendar/model';
import { activityMarkers, calendarMarkerOrder, calendarMarkerPresentation } from '../src/features/calendar/markers';
import type { CalendarItem, TaskCalendarItem } from '../src/features/calendar/types';
import { createCommitmentDataAccess } from '../src/features/finance/commitments/data';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import { createWorkDataAccess } from '../src/features/finance/work/data';
import { workDraft } from '../src/features/finance/work/form';
import { dateLabel, pickerValue } from '../src/utils/calendar';
import { bundledMigrations, database } from './helpers/database';
import { calendarAgenda, calendarGrid, commitmentViews, renderControl, sheets, theme, workViews } from './helpers/form-components';

test('month controls select adjacent dates, navigate both directions, and return to Today', () => {
  const selected: string[] = []; const moved: number[] = []; let todayPressed = 0;
  const result = renderControl(() => calendarGrid.MonthGrid({ selection: selectDate('2026-10-12'), today: '2026-10-04', markers: activityMarkers([
    { date: '2026-10-12', source: 'task' }, { date: '2026-10-12', source: 'task' }]),
    onDate: (date) => selected.push(date), onMove: (direction) => moved.push(direction), onToday: () => todayPressed++ }));
  result.elements.find((node) => node.props.accessibilityLabel === 'Previous month')!.props.onPress!();
  result.elements.find((node) => node.props.accessibilityLabel === 'Next month')!.props.onPress!();
  result.elements.find((node) => node.props.label === 'Today')!.props.onPress!();
  assert.deepEqual(moved, [-1, 1]); assert.equal(todayPressed, 1);
  const cells = result.elements.filter((node) => node.props.testID?.startsWith('calendar-date-'));
  assert.equal(cells.length, 35); assert.ok(cells.some((node) => node.props.accessibilityLabel?.includes('today')));
  assert.ok(cells.some((node) => node.props.accessibilityLabel?.includes('2 tasks')));
  cells[0].props.onPress!(); assert.deepEqual(selected, ['2026-09-28']);
  assert.equal(cells.filter((node) => node.props.accessibilityLabel?.includes(', selected')).length, 1);
  assert.match(result.markup, /Underlined: today/);
});

test('six-row month renders all distinct accessible date controls', () => {
  const result = renderControl(() => calendarGrid.MonthGrid({ selection: selectDate('2026-08-31'), today: '2026-08-01', markers: new Map(),
    onDate: () => {}, onMove: () => {}, onToday: () => {} }));
  const dates = result.elements.filter((node) => node.props.testID?.startsWith('calendar-date-'));
  assert.equal(dates.length, 42); assert.equal(new Set(dates.map((node) => node.props.accessibilityLabel)).size, 42);
});

for (const [name, date, selected, today] of [
  ['selected', '2026-10-12', '2026-10-12', '2026-10-04'],
  ['today', '2026-10-04', '2026-10-12', '2026-10-04'],
  ['selected and today', '2026-10-04', '2026-10-04', '2026-10-04'],
  ['adjacent month', '2026-09-28', '2026-10-12', '2026-10-04'],
] as const) {
  test(`${name} cell preserves all source dots and announces the actual source counts`, () => {
    const markers = activityMarkers([
      ...Array.from({ length: 5 }, () => ({ date, source: 'task' as const })),
      ...Array.from({ length: 3 }, () => ({ date, source: 'commitment' as const })), { date, source: 'work' },
    ]);
    const result = renderControl(() => calendarGrid.MonthGrid({ selection: selectDate(selected), today, markers, onDate: () => {}, onMove: () => {}, onToday: () => {} }));
    const cell = result.elements.find((node) => node.props.testID === `calendar-date-${date}`)!;
    const dots = result.elements.filter((node) => node.props.testID?.startsWith(`calendar-marker-${date}-`));
    assert.deepEqual(dots.map((node) => node.props.testID), calendarMarkerOrder.map((type) => `calendar-marker-${date}-${type}`));
    assert.match(cell.props.accessibilityLabel!, /5 tasks, 3 commitments, 1 expected payment/);
    assert.equal(cell.props.accessibilityState?.selected, date === selected);
    if (date === today) assert.match(cell.props.accessibilityLabel!, /today/);
    if (name === 'adjacent month') assert.match(cell.props.accessibilityLabel!, /adjacent month/);
    for (const [index, dot] of dots.entries()) {
      const style = Object.assign({}, ...dot.props.style as { backgroundColor?: string }[]);
      assert.equal(style.backgroundColor, theme.Colors.light[calendarMarkerPresentation[calendarMarkerOrder[index]].color]);
      assert.equal(dot.props.children, undefined, 'dots contain no numeric text, labels, or icons');
    }
  });
}

test('empty, sparse and busy cells use the same layout and marker strip without unused source slots', () => {
  const date = '2026-08-10';
  const render = (count: number) => renderControl(() => calendarGrid.MonthGrid({ selection: selectDate(date), today: '2026-08-01',
    markers: activityMarkers(Array.from({ length: count }, () => ({ date, source: 'task' }))), onDate: () => {}, onMove: () => {}, onToday: () => {} }));
  const [empty, sparse, busy] = [render(0), render(1), render(500)];
  const cell = (result: typeof empty) => result.elements.find((node) => node.props.testID === `calendar-date-${date}`)!;
  const strip = (result: typeof empty) => result.elements.find((node) => node.props.testID === `calendar-markers-${date}`)!;
  assert.deepEqual(cell(empty).props.style, cell(sparse).props.style); assert.deepEqual(cell(sparse).props.style, cell(busy).props.style);
  assert.deepEqual(strip(empty).props.style, strip(sparse).props.style); assert.deepEqual(strip(sparse).props.style, strip(busy).props.style);
  assert.equal(empty.elements.filter((node) => node.props.testID?.startsWith('calendar-marker-')).length, 0);
  assert.equal(sparse.elements.filter((node) => node.props.testID?.startsWith('calendar-marker-')).length, 1);
  assert.equal(busy.elements.filter((node) => node.props.testID?.startsWith('calendar-marker-')).length, 1);
  assert.equal(busy.elements.filter((node) => node.props.testID?.startsWith('calendar-date-')).length, 42);
  assert.match(cell(busy).props.accessibilityLabel!, /500 tasks/);
  assert.doesNotMatch(busy.markup, />500<|• 500/, 'raw counts are not rendered in the cell');
});

for (const mode of ['light', 'dark'] as const) {
  test(`${mode} source tokens contrast against both ordinary and selected cell backgrounds`, () => {
    const colors = theme.Colors[mode];
    const luminance = (hex: string) => {
      const channels = hex.slice(1).match(/../g)!.map((channel) => parseInt(channel, 16) / 255)
        .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    const markerColors = calendarMarkerOrder.map((type) => colors[calendarMarkerPresentation[type].color]);
    assert.equal(new Set(markerColors).size, 3);
    for (const marker of markerColors) for (const background of [colors.background, colors.backgroundSelected]) {
      const a = luminance(marker); const b = luminance(background);
      assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 3, 'decorative source indicators should remain visible on selection');
    }
  });
}

const task: TaskCalendarItem = { id: 'task:1', source: 'task', date: '2026-10-04', recordId: '1', title: 'Report', secondary: 'All day', status: 'Completed',
  occurrenceId: null, time: null, completed: true };
test('agenda opens source identity and Task completion action; only populated sections render', () => {
  const opened: CalendarItem[] = []; const toggled: TaskCalendarItem[] = [];
  const result = renderControl(() => calendarAgenda.DayAgenda({ date: task.date, items: [task], onOpen: (item) => opened.push(item), onToggleTask: (item) => toggled.push(item) }));
  result.elements.find((node) => node.props.accessibilityLabel?.startsWith('Open Report'))!.props.onPress!();
  result.elements.find((node) => node.props.label === 'Reopen')!.props.onPress!();
  assert.deepEqual(opened, [task]); assert.deepEqual(toggled, [task]);
  assert.match(result.markup, /Completed/); assert.doesNotMatch(result.markup, /Commitments|Expected payments|Nothing scheduled/);
});
test('empty day has concise empty state and no source actions', () => {
  const result = renderControl(() => calendarAgenda.DayAgenda({ date: '2026-10-05', items: [task], onOpen: () => {}, onToggleTask: () => {} }));
  assert.match(result.markup, /Nothing scheduled for this day\./);
  assert.ok(!result.elements.some((node) => node.props.onPress));
});

test('Calendar launch opens the existing commitment sheet with the selected distant occurrence and established actions', async (t) => {
  const { sqlite, db } = database(); t.after(() => sqlite.close()); await migrate(db, bundledMigrations);
  const today = '2026-10-04'; const access = createCommitmentDataAccess(db, randomUUID, () => pickerValue(today).getTime());
  const id = access.create({ ...commitmentDraft(null, undefined, today), title: 'Rent', amount: '100', firstDueDate: '2026-10-10' });
  const occurrence = access.readRange({ from: '2027-05-10', to: '2027-05-10' })[0].occurrence;
  const result = renderControl(() => commitmentViews.CommitmentsView({ items: access.read().items, access, categories: [], today, mutate: (action) => action(),
    onCreateCategory: () => { throw new Error('unused'); }, initialDetail: { data: access.readHistory(id), occurrence } }));
  assert.ok(result.elements.some((node) => node.type === sheets.AdaptiveModal));
  assert.ok(result.elements.some((node) => node.type === sheets.AdaptiveSheet));
  assert.equal(result.elements.filter((node) => node.props.label === 'Pay' && node.props.accessibilityLabel?.includes('Rent')).length, 2,
    'one normal upcoming row plus the selected future occurrence in details');
  assert.ok(result.elements.some((node) => node.props.accessibilityLabel === `Pay Rent, due ${dateLabel(occurrence.dueDate)}`));
  assert.ok(result.elements.some((node) => node.props.label === 'Series options for Rent'));
  assert.ok(!result.elements.some((node) => ['Skip', 'Pause', 'Edit'].includes(node.props.label ?? '')), 'secondary actions are contextual');
  assert.equal(access.readRange({ from: occurrence.dueDate, to: occurrence.dueDate })[0].occurrence.id, null, 'opening details does not resolve the preview');
});

test('Calendar launch reuses Work details and Record payment in the existing adaptive sheet without changing outstanding', async (t) => {
  const { sqlite, db } = database(); t.after(() => sqlite.close()); await migrate(db, bundledMigrations);
  const today = '2026-10-04'; const access = createWorkDataAccess(db, randomUUID, () => pickerValue(today).getTime());
  const client = access.createCounterparty('Client');
  const id = access.create({ ...workDraft(null, today), counterpartyId: client.id, description: 'Report', compensationType: 'fixed', fixedAmount: '100', expectedPaymentDate: today });
  const result = renderControl(() => workViews.WorkView({ data: access.readOverview(), access, categories: [], mutate: (action) => action(), initialEntryId: id,
    onCreateCategory: () => { throw new Error('unused'); } }));
  assert.ok(result.elements.some((node) => node.type === sheets.AdaptiveModal));
  assert.ok(result.elements.some((node) => node.type === sheets.AdaptiveSheet));
  assert.ok(result.elements.some((node) => node.props.label === 'Edit'));
  assert.equal(result.elements.filter((node) => node.props.label === 'Record payment').length, 2, 'toolbar and opened entry details');
  assert.equal(access.read().items[0].outstandingMinor, 10000);
});

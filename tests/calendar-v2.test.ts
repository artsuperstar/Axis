/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { DesignColors } from '../src/constants/design-system-v2';
import { createCalendarDataAccess } from '../src/features/calendar/data';
import { dayAgenda } from '../src/features/calendar/projection';
import { taskDraft } from '../src/features/tasks/form';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import { workDraft } from '../src/features/finance/work/form';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

function flatten(style: unknown): Record<string, unknown> { return Object.assign({}, ...(Array.isArray(style) ? style.map(flatten) : [style ?? {}])); }
for (const theme of ['light', 'dark'] as const) for (const [width, fontScale] of [[320, 1], [390, 1], [430, 1], [320, 2]] as const) {
  test(`${theme} ${width}/${fontScale}: Calendar owns a v2 grid, responsive controls and source-specific accessible cards`, async t => {
    t.mock.method(runtime.native as { useColorScheme: () => string }, 'useColorScheme', () => theme);
    t.mock.method(runtime.native as { useWindowDimensions: () => unknown }, 'useWindowDimensions', () => ({ width, height: 844, scale: 1, fontScale }));
    const f = await journalDatabase(); f.setTime('2026-10-21'); t.mock.timers.enable({ apis: ['Date'], now: f.now() }); t.after(() => f.sqlite.close());
    const title = 'A longer task with a real source title that wraps at accessibility text sizes';
    f.tasks.createTask({ ...taskDraft(), title, date: '2026-10-21' });
    f.commitments.create({ ...commitmentDraft(null, undefined, '2026-10-21'), title: 'Internet', amount: '99,90', firstDueDate: '2026-10-21' });
    const client = f.work.createCounterparty('Client'); f.work.create({ ...workDraft(null, '2026-10-21'), title: 'Report', counterpartyId: client.id, compensationType: 'fixed', fixedAmount: '100', expectedPaymentDate: '2026-10-21' });
    const app = await mount(createElement(screens.CalendarScreen), f.db); t.after(app.unmount);
    assert.deepEqual(app.find('SafeAreaView').props.edges, { top: true, bottom: true, left: true, right: true });
    const node = (id: string) => app.nodes().find(row => row.props?.testID === id)!;
    assert.equal(flatten(node('calendar-month-surface').props.style).backgroundColor, DesignColors[theme].group);
    assert.ok(app.nodes(node('calendar-month-surface')).includes(node('calendar-legend')));
    for (const label of ['Previous month', 'Next month', 'Today']) assert.equal(app.find('FormButton', label).props.appearance, 'v2');
    assert.equal(flatten(node('calendar-month-navigation').props.style).flexDirection, fontScale >= 1.5 ? 'column' : 'row');
    assert.equal(flatten(node('calendar-month-navigation').props.style).flexBasis, 'auto');
    assert.equal(flatten(node('calendar-month-trigger').props.style).flexBasis, 'auto');
    assert.match(String(node('calendar-date-2026-10-21').props.accessibilityLabel), /today, selected.*1 task, 1 commitment, 1 Work item/);
    const list = app.find('FlatList'); assert.equal(list.props.testID, 'calendar-day-list'); assert.equal(list.props.initialNumToRender, 8);
    assert.equal(list.props.getItemLayout, undefined); assert.equal(list.props.windowSize, 5);
    assert.ok(!app.nodes().some(row => row.kind === 'ScrollView'));
    const rows = app.nodes().filter(row => String(row.props?.testID).startsWith('calendar-agenda-')); assert.equal(rows.length, 3);
    for (const row of rows) {
      assert.equal(flatten(row.props.style).borderRadius, 16); assert.equal(flatten(row.props.style).height, undefined);
      assert.equal(flatten(row.props.style).flexDirection, fontScale >= 1.5 ? 'column' : 'row');
      assert.equal(app.nodes(row).filter(child => child.props?.accessibilityRole === 'checkbox').length, row.textContent.includes(title) ? 1 : 0);
      assert.equal(app.nodes(row).filter(child => child.props?.accessibilityRole === 'button').length, 1);
      assert.ok(app.nodes(row).every(child => child.props?.numberOfLines === undefined && child.props?.allowFontScaling !== false));
    }
    assert.ok(!app.nodes().some(row => row.props?.accessibilityLabel === 'Calendar options' || row.props?.testID === 'icon-more'));
    assert.equal(runtime.fixture.layoutAnimations.length, 0);
  });
}

test('a busy selected day supplies every ordered row to one virtualized list without per-card data reads', async t => {
  const f = await journalDatabase(); f.setTime('2026-10-21'); t.mock.timers.enable({ apis: ['Date'], now: f.now() }); t.after(() => f.sqlite.close());
  for (let index = 0; index < 125; index++) f.tasks.createTask({ ...taskDraft(), title: `Task ${index}`, date: '2026-10-21' });
  const access = createCalendarDataAccess(f.db, () => 'unused', f.now);
  const app = await mount(createElement(screens.CalendarScreen), f.db); t.after(app.unmount);
  const list = app.find('FlatList'), data = list.props.data as { id: string }[];
  assert.equal(data.length, 125); assert.equal(new Set(data.map(row => row.id)).size, 125);
  const items = access.readRange({ from: '2026-10-21', to: '2026-10-21' });
  assert.deepEqual(data.map(row => row.id), dayAgenda(items, '2026-10-21').flatMap(section => section.data.map(row => row.id)));
  assert.ok(data.every(row => (list.props.keyExtractor as (row: { id: string }) => string)(row) === row.id));
  assert.deepEqual(runtime.fixture.reads.filter(read => read.startsWith('calendar.')), ['calendar.readRange']);
});

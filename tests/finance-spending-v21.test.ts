/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { act, createElement } from 'react';

import { transactionDraft } from '../src/features/finance/form';
import { spendingDonutDiameter, spendingIntroInline, spendingRowInline } from '../src/features/finance/spending-layout';
import { localDateString } from '../src/utils/calendar';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const today = localDateString(new Date());
type App = Awaited<ReturnType<typeof mount>>;
const node = (app: App, id: string) => app.nodes().find(item => item.props?.testID === id)!;
const flatten = (style: unknown) => Object.assign({}, ...[style].flat(Infinity));
async function layout(app: App, id: string, width: number) {
  await act(() => (node(app, id).props.onLayout as (event: unknown) => void)({ nativeEvent: { layout: { width } } }));
}

test('Spending fit rules use available width and actual measurements; unknown/large content stays stacked', () => {
  assert.equal(spendingIntroInline(260, 78, undefined), false);
  assert.equal(spendingIntroInline(260, 78, 90), true);
  assert.equal(spendingIntroInline(260, 78, 300), false);
  assert.equal(spendingRowInline(260, 1, 70, 100), true);
  assert.equal(spendingRowInline(260, 1, 1000, 160), false);
  assert.equal(spendingRowInline(260, 2, 1000, 320), false);
  assert.equal(spendingRowInline(260, 1), false);
  assert.ok(spendingDonutDiameter(330) <= 104);
  assert.ok(spendingDonutDiameter(60) <= 60);
});

for (const width of [320, 390, 430]) for (const fontScale of [1, 2]) {
  test(`full-width Spending rows and measured intro at ${width}, font scale ${fontScale}`, async t => {
    t.mock.method(runtime.native as { useWindowDimensions: () => object }, 'useWindowDimensions', () => ({ width, fontScale, height: 844, scale: 1 }));
    const f = await journalDatabase(); t.after(() => f.sqlite.close()); f.setTime(today);
    const category = f.finance.createCategory('A very long category name that wraps naturally in its full-width row', 'expense');
    f.finance.createTransaction({ ...transactionDraft(), description: 'Large actual expense', amount: '123.456.789,01', transactionDate: today, categoryId: category.id });
    const app = await mount(createElement(screens.FinanceScreen), f.db); t.after(app.unmount);
    const available = width - 58;
    await layout(app, 'finance-spending-layout', available);
    assert.equal(flatten(node(app, 'finance-spending-breakdown').props.style).width, '100%');
    assert.equal(flatten(node(app, 'finance-spending-layout').props.style).flexDirection, undefined);
    const readCount = runtime.fixture.reads.length;
    await layout(app, 'spending-total-probe', 160 * fontScale);
    assert.equal(flatten(node(app, 'finance-spending-intro').props.style).flexDirection,
      spendingIntroInline(available, spendingDonutDiameter(available), 160 * fontScale) ? 'row' : 'column');
    const id = `category:${category.id}`;
    await layout(app, `spending-probe-${id}-0`, 700 * fontScale);
    await layout(app, `spending-probe-${id}-1`, 160 * fontScale);
    const rowStyle = flatten(node(app, `spending-row-${id}`).props.style);
    assert.equal(rowStyle.flexDirection, spendingRowInline(available, fontScale, 700 * fontScale, 160 * fontScale) ? 'row' : 'column');
    const values = flatten(node(app, `spending-values-${id}`).props.style);
    assert.equal(values.maxWidth, '100%'); assert.equal(values.minWidth, 0); assert.notEqual(values.position, 'absolute');
    const amountProbe = flatten(node(app, `spending-probe-${id}-1`).props.style);
    assert.deepEqual(amountProbe.fontVariant, ['tabular-nums']);
    assert.ok(String(node(app, `spending-row-${id}`).props.accessibilityLabel).includes('R$ 123.456.789,01'));
    assert.equal(runtime.fixture.reads.length, readCount);
    for (const text of app.nodes().filter(item => item.kind === 'ThemedText')) assert.equal(text.props.numberOfLines, undefined);
  });
}

test('compact and expanded rows preserve exact categories, Other, archived names and zero-query disclosure', async t => {
  const f = await journalDatabase(); t.after(() => f.sqlite.close()); f.setTime(today);
  for (let index = 0; index < 8; index++) {
    const category = index ? f.finance.createCategory(`Historical category ${index}`, 'expense') : null;
    f.finance.createTransaction({ ...transactionDraft(), description: 'Expense', transactionDate: today, amount: '123.456.789,01', categoryId: category?.id ?? null });
    if (index === 7 && category) f.finance.deleteCategory(category.id);
  }
  const app = await mount(createElement(screens.FinanceScreen), f.db); t.after(app.unmount);
  const rows = () => app.nodes().filter(item => String(item.props?.testID).startsWith('spending-row-'));
  assert.equal(rows().length, 6); assert.ok(rows().some(item => item.props.testID === 'spending-row-other'));
  const readCount = runtime.fixture.reads.length;
  const measured = await f.measureAsync(() => app.press('View all categories'));
  assert.equal(measured.count, 0); assert.equal(runtime.fixture.reads.length, readCount);
  assert.equal(rows().length, 8); assert.ok(!rows().some(item => item.props.testID === 'spending-row-other'));
  assert.ok(rows().some(item => String(item.props.accessibilityLabel).startsWith('No category,')));
  assert.ok(rows().some(item => String(item.props.accessibilityLabel).startsWith('Historical category 7,')));
  await app.press('Show less'); assert.equal(rows().length, 6);
});

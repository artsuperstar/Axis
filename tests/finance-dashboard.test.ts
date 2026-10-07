/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { aggregateFinance } from '../src/features/finance/analytics';
import { periodBounds } from '../src/features/finance/periods';
import { financeDashboard, renderControl } from './helpers/form-components';

test('period controls render real accessible segmented radios and quiet labelled chevrons', () => {
  const { markup, elements } = renderControl(() => financeDashboard.FinancePeriodControls({
    period: periodBounds('month', '2026-10-06'), today: '2026-10-06', onKind() {}, onMove() {}, onCurrent() {},
  }));
  assert.match(markup, /role="radiogroup"/); assert.match(markup, /aria-label="Period: Month"/);
  assert.match(markup, /aria-checked="true"/); assert.match(markup, /aria-label="Previous month"/);
  assert.match(markup, /aria-label="Next month"/); assert.match(markup, /aria-disabled="true"/);
  assert.ok(elements.filter((element) => ['‹', '›'].includes(element.props.label ?? '')).every((element) => element.props.disabled !== undefined));
});

test('real dashboard typography emphasizes Net Flow and keeps signed full amounts and category shares accessible', () => {
  const analytics = aggregateFinance([
    { type: 'income', amountMinor: 999999999, categoryId: null, categoryName: null },
    { type: 'expense', amountMinor: 1123456788, categoryId: 'food', categoryName: 'Food' },
  ], periodBounds('month', '2026-10-06'));
  const { markup } = renderControl(() => financeDashboard.FinanceDashboard({ analytics, spendingExpanded: false, onToggleSpending() {} }));
  assert.match(markup, /Net Flow, negative, -R\$ 1\.234\.567,89/);
  assert.match(markup, /Income, positive, R\$ 9\.999\.999,99/);
  assert.match(markup, /Food, R\$ 11\.234\.567,88, approximately 100% of expenses/);
  assert.match(markup, /font-size:28px/); assert.ok(!markup.includes('Balance'));
  assert.ok(!markup.includes('text-overflow:ellipsis')); assert.ok(!markup.includes('line-clamp'));
});

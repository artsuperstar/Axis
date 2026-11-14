/// <reference types="node" />
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { createElement } from 'react';

import { DesignColors } from '../src/constants/design-system-v2';
import { commitmentDraft } from '../src/features/finance/commitments/form';
import { workDraft } from '../src/features/finance/work/form';
import { addDays, localDateString } from '../src/utils/calendar';
import { journalDatabase } from './helpers/journal';
import { mount, screens } from './helpers/refresh-lifecycle';

const require = createRequire(import.meta.url);
const native = require('./helpers/lifecycle-native.cjs').native as { useColorScheme: () => string | null };
const { CommitmentHistory } = require('../src/features/finance/commitments/components/commitment-history') as typeof import('../src/features/finance/commitments/components/commitment-history');
const { FormSelectionHost } = require('../src/components/form-selection-host') as typeof import('../src/components/form-selection-host');
const flatten = (style: unknown): Record<string, unknown> => Object.assign({}, ...[style].flat(Infinity));

for (const mode of ['dark', 'light'] as const) test(`${mode}: source-owned completed/paid states stay green and non-overdue balances stay neutral`, async (t) => {
  t.mock.method(native, 'useColorScheme', () => mode); const colors = DesignColors[mode];
  const f = await journalDatabase(); t.after(() => f.sqlite.close()); const today = localDateString(new Date()); f.setTime(today);
  const client = f.work.createCounterparty('Semantic client');
  const create = (title: string, expectedPaymentDate = '') => f.work.create({ ...workDraft(null, today), title, counterpartyId: client.id, compensationType: 'fixed', fixedAmount: '100', expectedPaymentDate });
  const paid = create('Paid job'); create('Neutral balance'); create('Overdue balance', addDays(today, -1));
  f.work.recordPayment({ counterpartyId: client.id, paymentDate: today, categoryId: null, allocations: [{ workEntryId: paid, amount: '100' }] });
  const history = await mount(createElement(screens.WorkHistoryScreen), f.db); t.after(history.unmount);
  const status = history.nodes().find(node => node.kind === 'ThemedText' && node.props?.testID === 'history-job-status')!;
  assert.ok(status); assert.equal(status.textContent, 'Paid'); assert.equal(flatten(status.props.style).color, colors.received); await history.unmount();

  const clients = await mount(createElement(screens.WorkClientsScreen), f.db); t.after(clients.unmount); await clients.tapSet('Open Semantic client details');
  for (const row of clients.nodes().filter(node => node.props?.testID === 'client-open-job')) {
    const state = clients.nodes(row).find(node => node.kind === 'ThemedText' && ['Outstanding', 'Overdue'].includes(node.textContent))!;
    assert.ok(state); assert.equal(flatten(state.props.style).color, state.textContent === 'Overdue' ? colors.overdue : colors.pending);
  }
  assert.equal(clients.nodes().filter(node => node.props?.testID === 'client-open-job').length, 2); await clients.unmount();

  const session = f.fitness.startWorkout(null); f.fitness.finishWorkout(session.id);
  const fitness = await mount(createElement(screens.FitnessScreen), f.db); t.after(fitness.unmount); await fitness.press('History');
  const complete = fitness.nodes().find(node => node.kind === 'ThemedText' && node.textContent === 'Completed')!;
  assert.ok(complete); assert.equal(flatten(complete.props.style).color, colors.completed); assert.equal(flatten(complete.parentNode?.props.style).backgroundColor, colors.successSoft); await fitness.unmount();

  const id = f.commitments.create({ ...commitmentDraft(null, undefined, today), title: 'Paid commitment', kind: 'bill', amount: '10' });
  f.commitments.pay(f.commitments.readHistory(id).outstanding[0], '10', today);
  const noop = () => {};
  const commitments = await mount(createElement(FormSelectionHost, null, createElement(CommitmentHistory, { data: f.commitments.readHistory(id), categories: f.finance.readCategories(), actions: [], error: null,
    onDismiss: noop, onViewCommitment: noop, onLoadEarlier: noop, onReopen: noop })), f.db); t.after(commitments.unmount);
  const marker = commitments.nodes().find(node => node.props?.testID === 'commitment-history-paid-marker')!;
  assert.ok(marker); assert.equal(flatten(marker.props.style).backgroundColor, colors.successSoft); assert.equal(flatten(marker.props.style).borderColor, colors.success);
  const paidText = commitments.nodes().find(node => node.kind === 'ThemedText' && node.textContent.startsWith('Paid · Due'))!;
  assert.ok(paidText); assert.equal(flatten(paidText.props.style).color, colors.success);
});

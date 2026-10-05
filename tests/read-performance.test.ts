import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { eq } from 'drizzle-orm';

import * as schema from '../src/database/schema';
import { appendCommitmentHistory } from '../src/features/finance/commitments/data';
import { createHomeDataAccess } from '../src/features/home/data';
import { projectHome } from '../src/features/home/projection';
import { createTaskDataAccess } from '../src/features/tasks/data';
import { workDraft } from '../src/features/finance/work/form';
import { formatBrlInput, maxAmountMinor } from '../src/features/finance/money';
import { growthDate, growthFixture, growthNow } from './helpers/growth-fixture';

test('accumulated-data read paths remain targeted, paged and authoritative', async (t) => {
  const f = await growthFixture(); t.after(() => f.sqlite.close());
  await t.test('Commitment summary batches parents and children and keeps all due debt', () => {
    const result = f.measure(() => f.commitments.read());
    assert.equal(result.count, 7); assert.equal(result.value.items.length, 20);
    assert.equal(result.value.items.flatMap((item) => item.outstanding).length, 20);
    assert.ok(result.value.items.every((item) => item.resolvedCount === 60));
    assert.ok(result.statements.every((row) => !row.sql.startsWith('insert')));
    assert.equal(f.measure(() => f.commitments.read()).count, 7, 'repeat catch-up has no extra inserts');
  });
  await t.test('Commitment pages fetch disjoint resolved date bands through the terminal page', () => {
    const id = f.commitments.read().items[0].commitment.id;
    let page = f.commitments.readHistory(id), combined = page;
    const pages = [page];
    while (page.nextBefore) {
      const measured = f.measure(() => f.commitments.readHistory(id, page.nextBefore!));
      page = measured.value; pages.push(page);
      assert.ok(page.history.every(({ occurrence }) => occurrence.status !== 'pending'));
      assert.ok(page.history.length <= 12);
      combined = appendCommitmentHistory(combined, page);
    }
    assert.ok(pages.length >= 3); assert.equal(page.nextBefore, null);
    const ids = pages.flatMap((page) => page.history.map((row) => row.occurrence.id));
    assert.equal(ids.length, new Set(ids).size); assert.equal(ids.length, 61);
    assert.equal(combined.history.length, 61);
    const expected = f.sqlite.prepare('SELECT id FROM finance_commitment_occurrences WHERE commitment_id = ? ORDER BY due_date DESC, id ASC').all(id).map((row) => row.id);
    assert.deepEqual(combined.history.map((row) => row.occurrence.id), expected);
  });
  await t.test('Fitness summaries do not expand routines or load set rows; details load on request', () => {
    const summary = f.measure(() => f.fitness.readSummaries(1));
    assert.equal(summary.count, 4); assert.equal(summary.rows, 2);
    assert.ok(summary.statements.every((row) => !row.sql.includes('fitness_routine_exercises')));
    assert.equal(summary.value.history[0].exerciseCount, 4); assert.equal(summary.value.history[0].setCount, 32);
    const overview = f.measure(() => f.fitness.readOverview());
    assert.equal(overview.count, 6); assert.equal(overview.value.routines.length, 30);
    assert.ok(overview.statements.every((row) => !row.sql.includes('fitness_routine_exercises')));
    const routines = f.measure(() => f.fitness.readRoutines());
    assert.equal(routines.count, 4); assert.equal(routines.value[0].exercises.length, 3);
    const detail = f.measure(() => f.fitness.readSession(summary.value.history[0].id));
    assert.equal(detail.rows, 37); assert.equal(detail.value.exercises.length, 4);
    assert.equal(detail.value.exercises.flatMap((row) => row.sets).length, 32);
    assert.throws(() => f.fitness.saveNote(detail.value.id, null, 'Edit completed workout'), /read-only/);
  });
  await t.test('Fitness keyset History has no gaps or duplicates with tied dates and timestamps', () => {
    let page = f.fitness.readHistory(20);
    const history = [...page.history]; let count = 1;
    while (page.hasMoreHistory) {
      const measured = f.measure(() => f.fitness.readHistory(20, page.history[page.history.length - 1]));
      page = measured.value; count++;
      assert.equal(measured.count, 3); assert.ok(measured.rows <= 21);
      history.push(...page.history);
    }
    assert.ok(count >= 3); assert.equal(history.length, 300); assert.equal(new Set(history.map((row) => row.id)).size, 300);
    const expected = f.sqlite.prepare('SELECT id FROM fitness_workout_sessions ORDER BY completed_at DESC, started_at DESC, id ASC').all().map((row) => row.id);
    assert.deepEqual(history.map((row) => row.id), expected);
  });
  await t.test('Work overview uses compact balances and fetches only actionable details', () => {
    const original = f.work.read(), result = f.measure(() => f.work.readOverview());
    assert.deepEqual(result.value.totals, original.totals);
    assert.deepEqual(result.value.counterpartyTotals, original.counterpartyTotals);
    assert.deepEqual(result.value.items, original.items.filter((row) => row.outstandingMinor > 0));
    assert.equal(result.value.items.length, 40); assert.equal(result.value.settledCount, 960); assert.equal(result.value.paymentCount, 520);
    assert.ok(result.value.items.every((item) => item.overdue && item.counterparty.deletedAt !== null));
    const detailQueries = result.statements.filter((row) => row.sql.includes('"description"'));
    assert.equal(detailQueries.length, 1); assert.equal(detailQueries[0].rows, 40);
    assert.equal(result.rows, 1042);
  });
  await t.test('Work keyset History bounds details, preserves full combined allocations and handles terminal pages', () => {
    let page = f.work.readHistory(); const items = [...page.items], payments = [...page.payments]; let count = 1;
    assert.equal(page.items.length, 20); assert.equal(page.payments.length, 20);
    while (page.next) {
      const result = f.measure(() => f.work.readHistory(20, page.next!));
      page = result.value; count++;
      assert.ok(page.items.length <= 20); assert.ok(page.payments.length <= 20);
      // Compact all-work balances remain authoritative; full work/receipt details are page-only.
      for (const row of result.statements.filter((row) => row.sql.includes('"description"'))) assert.ok(row.rows <= 40);
      items.push(...page.items); payments.push(...page.payments);
    }
    assert.ok(count >= 3); assert.equal(page.next, null);
    assert.equal(new Set(items.map((row) => row.entry.id)).size, 960); assert.equal(items.length, 960);
    assert.equal(new Set(payments.map((row) => row.transaction.id)).size, 520); assert.equal(payments.length, 520);
    const original = f.work.read();
    assert.deepEqual(items, original.items.filter((row) => row.outstandingMinor === 0));
    assert.deepEqual(payments, original.payments);
    const detail = f.work.readDetail(items[0].entry.id);
    assert.equal(detail.items.length, 1); assert.equal(detail.payments[0].allocations.length, 2);
    assert.equal(detail.payments[0].allocations.reduce((sum, row) => sum + row.amountMinor, 0), detail.payments[0].transaction.amountMinor);
    assert.equal(detail.items[0].counterparty.name, 'Historical client');
  });
  await t.test('actual Task range queries search the date-leading index amid 5,000 occurrences', () => {
    const tasks = createTaskDataAccess(f.db, randomUUID, growthNow);
    const result = f.measure(() => tasks.readRange({ from: '2026-01-01', to: '2026-01-31' }));
    assert.equal(result.value.length, 31);
    const rangeQueries = result.statements.filter((row) => row.sql.startsWith('select') && row.sql.includes('"task_occurrences"'));
    assert.equal(rangeQueries.length, 2);
    for (const query of rangeQueries) {
      const plans = f.sqlite.prepare(`EXPLAIN QUERY PLAN ${query.sql}`).all(...query.params);
      assert.ok(plans.some((row) => /SEARCH task_occurrences USING INDEX task_occurrences_date_idx \(scheduled_date>\? AND scheduled_date<\?\)/.test(String(row.detail))));
    }
  });
  await t.test('Home projections match original snapshots and refresh after source mutations', () => {
    const tasks = createTaskDataAccess(f.db, randomUUID, growthNow), home = createHomeDataAccess(f.db, randomUUID, growthNow);
    const expected = projectHome({ tasks: tasks.read(), commitments: f.commitments.read().items, work: f.work.read().items,
      financeCategories: [], fitness: f.fitness.read(1) }, new Date(growthNow()));
    const measured = f.measure(() => home.read());
    assert.deepEqual(measured.value, expected);
    assert.ok(measured.statements.every((row) => !row.sql.includes('fitness_routine_exercises')));
    assert.equal(home.read().attention.find((row) => row.source === 'commitment')!.total, 20);
    const obligation = f.commitments.read().items[0].outstanding[0];
    f.commitments.pay(obligation, '100', growthDate);
    assert.equal(home.read().attention.find((row) => row.source === 'commitment')!.total, 19);
    f.commitments.reopen(obligation.id!);
    assert.equal(home.read().attention.find((row) => row.source === 'commitment')!.total, 20);
    const active = f.fitness.startWorkout();
    assert.equal(home.read().activeWorkout!.session.id, active.id);
    f.fitness.finishWorkout(active.id);
    assert.equal(home.read().activeWorkout, null); assert.equal(home.read().completedWorkout!.session.id, active.id);
    const occurrence = tasks.readRange({ from: growthDate, to: growthDate }).find((row) => row.occurrence)!.occurrence!;
    const homeOccurrence = home.read().today.flatMap((section) => section.items).find((row) => row.source === 'task' && row.occurrenceId === occurrence.id);
    assert.ok(homeOccurrence?.source === 'task');
    home.completeTask(homeOccurrence);
    assert.ok(!home.read().today.flatMap((section) => section.items).some((row) => row.id === occurrence.id));
    const client = f.work.createCounterparty('New client');
    const id = f.work.create({ ...workDraft(null, growthDate), counterpartyId: client.id, description: 'New Work', compensationType: 'fixed', fixedAmount: '1', expectedPaymentDate: growthDate });
    const paid = f.work.recordPayment({ counterpartyId: client.id, allocations: [{ workEntryId: id, amount: '1' }], paymentDate: growthDate, categoryId: null });
    assert.ok(!f.work.readOverview().items.some((item) => item.entry.id === id));
    f.work.undoPayment(paid);
    assert.ok(f.work.readOverview().items.some((item) => item.entry.id === id));
    assert.equal(home.read().today.find((section) => section.source === 'work')!.total, 1);
  });
  await t.test('catch-up repairs old holes idempotently without resetting resolved outcomes', () => {
    const id = f.commitments.read().items[0].commitment.id;
    const removed = f.sqlite.prepare("SELECT id FROM finance_commitment_occurrences WHERE commitment_id = ? AND due_date = '2022-01-01'").get(id)!;
    f.db.delete(schema.commitmentOccurrences).where(eq(schema.commitmentOccurrences.id, String(removed.id))).run();
    const first = f.measure(() => f.commitments.read());
    assert.equal(first.count, 8);
    assert.ok(first.value.items.find((item) => item.commitment.id === id)!.outstanding.some((row) => row.dueDate === '2022-01-01'));
    assert.equal(f.measure(() => f.commitments.read()).count, 7);
    assert.equal(f.commitments.read().items.find((item) => item.commitment.id === id)!.resolvedCount, 59);
  });
  await t.test('optimized Work reads retain exact large/hourly centavos and reject broken reconciliation', () => {
    const client = f.work.createCounterparty('Exact totals');
    const id = f.work.create({ ...workDraft(null, growthDate), description: 'Exact hourly', counterpartyId: client.id,
      compensationType: 'hourly', hours: '0', minutes: '59', hourlyRate: formatBrlInput(maxAmountMinor) });
    const earned = f.work.readDetail(id).items[0].earnedMinor;
    const payment = f.work.recordPayment({ counterpartyId: client.id, allocations: [{ workEntryId: id, amount: formatBrlInput(earned) }], paymentDate: growthDate, categoryId: null });
    assert.deepEqual(f.work.readOverview().totals, f.work.read().totals);
    f.db.update(schema.financeTransactions).set({ amountMinor: earned - 1 }).where(eq(schema.financeTransactions.id, payment)).run();
    assert.throws(() => f.work.readOverview(), /reconciliation/); assert.throws(() => f.work.readHistory(), /reconciliation/);
    f.db.update(schema.financeTransactions).set({ amountMinor: earned }).where(eq(schema.financeTransactions.id, payment)).run();
    f.work.undoPayment(payment);
    assert.deepEqual(f.work.readOverview().totals, f.work.read().totals);
  });
  await t.test('grown database remains integral with no foreign-key violations', () => {
    assert.deepEqual(f.sqlite.prepare('PRAGMA integrity_check').all().map((row) => row.integrity_check), ['ok']);
    assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(), []);
  });
});

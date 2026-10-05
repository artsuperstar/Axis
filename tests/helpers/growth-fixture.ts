import { randomUUID } from 'node:crypto';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import * as schema from '../../src/database/schema';
import { createCommitmentDataAccess } from '../../src/features/finance/commitments/data';
import { createFitnessDataAccess } from '../../src/features/fitness/data';
import { createWorkDataAccess } from '../../src/features/finance/work/data';
import { addDays, pickerValue } from '../../src/utils/calendar';
import { bundledMigrations, database } from './database';

export const growthDate = '2026-10-05';
export const growthNow = () => pickerValue(growthDate).getTime();

/** Real SQLite fixtures; setup statements are excluded from measurements. */
export async function growthFixture() {
  const result = database(); const { db } = result;
  await migrate(db, bundledMigrations);
  const commitments = createCommitmentDataAccess(db, randomUUID, growthNow);
  for (let i = 0; i < 20; i++) commitments.create({ kind: 'bill', title: `Bill ${i}`, amount: '100',
    firstDueDate: '2021-10-01', installmentCount: '', categoryId: null });
  result.sqlite.exec("UPDATE finance_commitment_occurrences SET status = 'skipped', resolved_at = updated_at WHERE due_date < '2026-10-01'");

  const fitness = createFitnessDataAccess(db, randomUUID, growthNow);
  const exercise = fitness.createExercise({ name: 'Fixture exercise', measurementType: 'bodyweight' });
  for (let i = 0; i < 30; i++) {
    db.insert(schema.fitnessRoutines).values({ id: `routine-${i}`, name: `Routine ${i}`, createdAt: 1, updatedAt: 1 }).run();
    for (let j = 0; j < 3; j++) db.insert(schema.fitnessRoutineExercises).values({ id: `routine-entry-${i}-${j}`,
      routineId: `routine-${i}`, exerciseId: exercise.id, measurementType: 'bodyweight', position: j, createdAt: 1, updatedAt: 1 }).run();
  }
  for (let i = 0; i < 300; i++) {
    // Tied timestamps exercise the ordering fallback.
    const time = growthNow() - Math.floor(i / 3) * 86400000;
    db.insert(schema.fitnessSessions).values({ id: `session-${String(i).padStart(4, '0')}`, name: 'Workout', startedAt: time,
      completedAt: time, createdAt: time, updatedAt: time }).run();
    for (let j = 0; j < 4; j++) {
      const id = `session-entry-${i}-${j}`;
      db.insert(schema.fitnessSessionExercises).values({ id, sessionId: `session-${String(i).padStart(4, '0')}`,
        exerciseId: exercise.id, exerciseName: exercise.name, measurementType: 'bodyweight', position: j, createdAt: time, updatedAt: time }).run();
      for (let k = 0; k < 8; k++) db.insert(schema.fitnessSets).values({ id: `set-${i}-${j}-${k}`, sessionExerciseId: id,
        measurementType: 'bodyweight', position: k, reps: 10, createdAt: time, updatedAt: time }).run();
    }
  }

  const work = createWorkDataAccess(db, randomUUID, growthNow);
  db.insert(schema.workCounterparties).values({ id: 'client', name: 'Historical client', createdAt: 1, updatedAt: 1, deletedAt: 2 }).run();
  for (let i = 0; i < 1000; i++) db.insert(schema.workEntries).values({ id: `work-${String(i).padStart(4, '0')}`,
    counterpartyId: 'client', description: `Work ${i}`, compensationType: 'fixed', fixedAmountMinor: 10000,
    workDate: addDays(growthDate, -Math.floor(i / 4)), expectedPaymentDate: '2026-10-01', createdAt: 1, updatedAt: 1 }).run();
  for (let i = 0; i < 520; i++) {
    const full = i < 480; const time = Math.floor(i / 3) + 1;
    const id = `payment-${String(i).padStart(4, '0')}`;
    db.insert(schema.financeTransactions).values({ id, description: 'Historical client', type: 'income', amountMinor: full ? 20000 : 5000,
      transactionDate: addDays(growthDate, -Math.floor(i / 4)), createdAt: time, updatedAt: time }).run();
    for (let j = 0; j < (full ? 2 : 1); j++) db.insert(schema.workPaymentAllocations).values({ id: `allocation-${i}-${j}`,
      workEntryId: `work-${String(full ? i * 2 + j : 960 + i - 480).padStart(4, '0')}`, financeTransactionId: id,
      amountMinor: full ? 10000 : 5000, createdAt: time }).run();
  }
  db.insert(schema.tasks).values({ id: 'task', title: 'Recurring task', createdAt: 1, updatedAt: 1 }).run();
  db.insert(schema.taskRecurrences).values({ id: 'rule', taskId: 'task', frequency: 'daily', interval: 1,
    startDate: '2013-01-01', effectiveFrom: '2013-01-01', createdAt: 1, updatedAt: 1 }).run();
  for (let i = 0; i < 5000; i++) db.insert(schema.taskOccurrences).values({ id: `occurrence-${i}`, taskId: 'task', recurrenceId: 'rule',
    scheduledDate: addDays('2013-01-01', i), createdAt: 1, updatedAt: 1 }).run();
  return { ...result, commitments, fitness, work };
}

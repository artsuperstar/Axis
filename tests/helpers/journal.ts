/// <reference types="node" />

import { randomUUID } from 'node:crypto';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { seedDefaultCategories } from '../../src/database/seed';
import { createCommitmentDataAccess } from '../../src/features/finance/commitments/data';
import { createFinanceDataAccess } from '../../src/features/finance/data';
import { seedFinanceCategories } from '../../src/features/finance/seed';
import { createWorkDataAccess } from '../../src/features/finance/work/data';
import { createFitnessDataAccess } from '../../src/features/fitness/data';
import { seedFitnessExercises } from '../../src/features/fitness/seed';
import { createJournalContextAccess } from '../../src/features/journal/context';
import { createJournalDataAccess } from '../../src/features/journal/data';
import type { DraftTimerHost } from '../../src/features/journal/draft-persistence';
import { createTaskDataAccess } from '../../src/features/tasks/data';
import { pickerValue } from '../../src/utils/calendar';
import { bundledMigrations, database } from './database';

export const journalToday = '2026-10-04';
export async function journalDatabase(filename?: string) {
  const result = database(filename); await migrate(result.db, bundledMigrations);
  seedDefaultCategories(result.db, 1000); seedFinanceCategories(result.db, 1000); seedFitnessExercises(result.db);
  let timestamp = pickerValue(journalToday, '12:00').getTime(); const now = () => timestamp;
  return { ...result, now, setTime: (date: string, time = '12:00') => { timestamp = pickerValue(date, time).getTime(); },
    access: createJournalDataAccess(result.db, randomUUID, now), context: createJournalContextAccess(result.db),
    tasks: createTaskDataAccess(result.db, randomUUID, now), finance: createFinanceDataAccess(result.db, randomUUID, now),
    commitments: createCommitmentDataAccess(result.db, randomUUID, now), work: createWorkDataAccess(result.db, randomUUID, now),
    fitness: createFitnessDataAccess(result.db, randomUUID, now) };
}

/** Deterministic timer host: tests advance a clock instead of waiting for real debounce delays. */
export function fakeDraftTimers() {
  let clock = 0;
  const jobs: { at: number; callback: () => void; cancelled: boolean }[] = [];
  const host: DraftTimerHost = { later: (milliseconds, callback) => {
    const job = { at: clock + milliseconds, callback, cancelled: false }; jobs.push(job);
    return () => { job.cancelled = true; };
  } };
  return { host, jobs, advance(milliseconds: number) {
    const until = clock + milliseconds;
    while (true) {
      const job = jobs.filter((item) => !item.cancelled && item.at <= until).sort((a, b) => a.at - b.at)[0];
      if (!job) break;
      clock = job.at; job.cancelled = true; job.callback();
    }
    clock = until;
  } };
}

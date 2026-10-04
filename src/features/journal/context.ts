import type { AxisDatabase } from '@/database/client';
import { readFinanceAnalytics } from '@/features/finance/analytics';
import { createFitnessDataAccess } from '@/features/fitness/data';
import { createTaskDataAccess } from '@/features/tasks/data';
import { validDate } from '@/utils/calendar';

import { JournalValidationError } from './form';
import type { JournalDayContext } from './types';

/** Source-owned reads only: no recurrence generation, copied context, or expected financial amounts. */
export function createJournalContextAccess(db: AxisDatabase) {
  const readOnlyId = () => { throw new Error('Journal context must not generate source records.'); };
  const tasks = createTaskDataAccess(db, readOnlyId);
  const fitness = createFitnessDataAccess(db, readOnlyId);
  return {
    read(date: string): JournalDayContext {
      if (!validDate(date)) throw new JournalValidationError('Choose a valid journal date.');
      return db.transaction(() => {
        const completed = tasks.readCompletedOnDate(date);
        const workouts = fitness.readCompletedOnDate(date);
        const finance = readFinanceAnalytics(db, { startDate: date, endDate: date });
        return { date, completedTaskCount: completed.length, taskNames: completed.slice(0, 3).map((row) => row.title),
          workoutCount: workouts.length, workouts: workouts.slice(0, 3).map(({ id, name, exerciseCount, setCount }) => ({ id, name, exerciseCount, setCount })),
          transactionCount: finance.transactionCount, incomeMinor: finance.incomeMinor, expensesMinor: finance.expensesMinor, netFlowMinor: finance.netFlowMinor };
      });
    },
  };
}

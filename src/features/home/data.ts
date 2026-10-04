import type { AxisDatabase } from '@/database/client';
import { createTaskDataAccess } from '@/features/tasks/data';
import { TaskValidationError } from '@/features/tasks/form';
import { createCommitmentDataAccess } from '@/features/finance/commitments/data';
import { createFinanceDataAccess } from '@/features/finance/data';
import { createWorkDataAccess } from '@/features/finance/work/data';
import { createFitnessDataAccess } from '@/features/fitness/data';

import { projectHome } from './projection';
import type { HomeTaskItem } from './types';

export function createHomeDataAccess(db: AxisDatabase, newId: () => string, now = Date.now) {
  return {
    read() {
      // Freeze one local instant for every source read, including a refresh spanning midnight.
      const timestamp = now(); const clock = () => timestamp;
      const tasks = createTaskDataAccess(db, newId, clock).read();
      const commitments = createCommitmentDataAccess(db, newId, clock).read().items;
      const work = createWorkDataAccess(db, newId, clock).read().items;
      const financeCategories = createFinanceDataAccess(db, newId, clock).readCategories();
      const fitness = createFitnessDataAccess(db, newId, clock).read(1);
      return projectHome({ tasks, commitments, work, financeCategories, fitness }, new Date(timestamp));
    },
    completeTask(item: HomeTaskItem) {
      const tasks = createTaskDataAccess(db, newId, now);
      // Re-read this source identity, so a repeated or stale tap cannot reopen or overwrite a resolved outcome.
      const current = tasks.readRange({ from: item.date, to: item.date }).find(({ task, occurrence }) =>
        task.id === item.recordId && (occurrence?.id ?? null) === item.occurrenceId);
      if (!current) throw new TaskValidationError('This task changed. Refresh Home and try again.');
      if (current.occurrence) {
        if (current.occurrence.status === 'pending') tasks.setOccurrenceStatus(current.occurrence.id, 'completed');
      } else if (current.task.completedAt === null) tasks.setCompleted(current.task.id, true);
    },
  };
}

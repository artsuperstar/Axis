import type { AxisDatabase } from '@/database/client';
import { createTaskDataAccess } from '@/features/tasks/data';
import { createCommitmentDataAccess } from '@/features/finance/commitments/data';
import { createWorkDataAccess } from '@/features/finance/work/data';
import { validateDateRange, type DateRange } from '@/utils/calendar';

import { projectCalendar } from './projection';
import type { TaskCalendarItem } from './types';

export function createCalendarDataAccess(db: AxisDatabase, newId: () => string, now = Date.now) {
  const tasks = createTaskDataAccess(db, newId, now);
  const commitments = createCommitmentDataAccess(db, newId, now);
  const work = createWorkDataAccess(db, newId, now);
  return {
    readRange(range: DateRange) {
      validateDateRange(range);
      return projectCalendar(tasks.readRange(range), commitments.readRange(range), work.readRange(range), new Date(now()));
    },
    toggleTask(item: TaskCalendarItem) {
      // Resolve the current persisted outcome before toggling a possibly stale Calendar row.
      const current = tasks.readRange({ from: item.date, to: item.date }).find(({ task, occurrence }) => task.id === item.recordId
        && (occurrence?.id ?? null) === item.occurrenceId);
      if (!current) throw new Error('This task changed. Refresh Calendar and try again.');
      if (current.occurrence) tasks.setOccurrenceStatus(current.occurrence.id, current.occurrence.status === 'completed' ? 'pending' : 'completed');
      else tasks.setCompleted(current.task.id, current.task.completedAt === null);
    },
  };
}

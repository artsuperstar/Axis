import type { FitnessDailySummary } from './types';

/** Source-level daily/Home priority; rotations never derive missed/late states. */
export function dailyFitnessState(summary: Pick<FitnessDailySummary, 'active' | 'completedCount' | 'nextWorkout'>): 'active' | 'completed' | 'next' | 'empty' {
  if (summary.active) return 'active';
  if (summary.completedCount > 0) return 'completed';
  return summary.nextWorkout ? 'next' : 'empty';
}

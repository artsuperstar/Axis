import { distanceLabel, durationLabel, formatThousandths } from './form';
import type { WorkoutSet } from './types';

/** Presentation only: persisted integer units and completed History formatting stay unchanged. */
export function workoutSetPresentation(set: Pick<WorkoutSet, 'measurementType' | 'weightGrams' | 'reps' | 'durationSeconds' | 'distanceMeters'>) {
  const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  if (set.measurementType === 'strength') {
    const weight = `${formatThousandths(set.weightGrams!)} kg`;
    return { values: [weight, `${set.reps} reps`], spoken: `${weight}, ${set.reps} reps` };
  }
  if (set.measurementType === 'bodyweight') {
    const values = [`${set.reps} reps`, ...(set.weightGrams === null ? [] : [`+${formatThousandths(set.weightGrams)} kg`])];
    return { values, spoken: values.join(', added weight ') };
  }
  if (set.measurementType === 'duration') return { values: [clock(set.durationSeconds!)], spoken: durationLabel(set.durationSeconds!) };
  return { values: [distanceLabel(set.distanceMeters!), ...(set.durationSeconds === null ? [] : [clock(set.durationSeconds)])],
    spoken: `${distanceLabel(set.distanceMeters!)}${set.durationSeconds === null ? '' : `, ${durationLabel(set.durationSeconds)}`}` };
}

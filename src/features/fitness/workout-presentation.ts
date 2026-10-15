import { distanceLabel, durationLabel, formatThousandths } from './form';
import type { UiIconName } from '@/components/ui-icon';
import type { MeasurementType, WorkoutSet } from './types';

/** Measurement type is authoritative; names never influence the icon or columns. */
export const measurementIcons: Record<MeasurementType, UiIconName> = {
  strength: 'dumbbell', bodyweight: 'activity', duration: 'timer', distance: 'route',
};

export function workoutSetColumns(type: MeasurementType, sets: readonly WorkoutSet[]) {
  if (type === 'strength') return ['Weight', 'Reps'];
  if (type === 'bodyweight') return ['Reps', ...(sets.some((set) => set.weightGrams !== null) ? ['Added weight'] : [])];
  if (type === 'duration') return ['Duration'];
  return ['Distance', ...(sets.some((set) => set.durationSeconds !== null) ? ['Time'] : [])];
}

export function workoutSetCells(set: WorkoutSet, columns: readonly string[]) {
  const { values } = workoutSetPresentation(set);
  if (set.measurementType === 'strength') return [values[0], String(set.reps)];
  if (set.measurementType === 'bodyweight') return [String(set.reps), ...(columns.length > 1 ? [values[1] ?? '—'] : [])];
  return columns.map((_, index) => values[index] ?? '—');
}

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

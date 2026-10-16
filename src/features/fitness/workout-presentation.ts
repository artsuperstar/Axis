import { distanceLabel, durationLabel, formatThousandths } from './form';
import type { UiIconName } from '@/components/ui-icon';
import type { MeasurementType, SessionDetail, WorkoutSet } from './types';

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
  if (set.measurementType === 'strength') return [values[0], String(set.reps ?? '—')];
  if (set.measurementType === 'bodyweight') return [String(set.reps ?? '—'), ...(columns.length > 1 ? [values[1] ?? '—'] : [])];
  return columns.map((_, index) => values[index] ?? '—');
}

/** Presentation only: persisted integer units and completed History formatting stay unchanged. */
export function workoutSetPresentation(set: Pick<WorkoutSet, 'measurementType' | 'weightGrams' | 'reps' | 'durationSeconds' | 'distanceMeters'>) {
  const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const empty = set.weightGrams === null && set.reps === null && set.durationSeconds === null && set.distanceMeters === null;
  const missing = 'Set complete. No performance details';
  if (set.measurementType === 'strength') {
    const weight = set.weightGrams === null ? '—' : `${formatThousandths(set.weightGrams)} kg`;
    const reps = set.reps === null ? '—' : `${set.reps} reps`;
    return { values: [weight, reps], spoken: empty ? missing : `${weight === '—' ? 'Weight not entered' : weight}, ${reps === '—' ? 'reps not entered' : reps}` };
  }
  if (set.measurementType === 'bodyweight') {
    const values = [set.reps === null ? '—' : `${set.reps} reps`, ...(set.weightGrams === null ? [] : [`+${formatThousandths(set.weightGrams)} kg`])];
    return { values, spoken: empty ? missing : values.map((value) => value === '—' ? 'Reps not entered' : value).join(', added weight ') };
  }
  if (set.measurementType === 'duration') return { values: [set.durationSeconds === null ? '—' : clock(set.durationSeconds)], spoken: empty ? missing : durationLabel(set.durationSeconds!) };
  return { values: [set.distanceMeters === null ? '—' : distanceLabel(set.distanceMeters), ...(set.durationSeconds === null ? [] : [clock(set.durationSeconds)])],
    spoken: empty ? missing : `${set.distanceMeters === null ? 'Distance not entered' : distanceLabel(set.distanceMeters)}${set.durationSeconds === null ? '' : `, ${durationLabel(set.durationSeconds)}`}` };
}

/** Targeted exercises derive completion from sets; targetless exercises use explicit session state. */
export function exerciseProgress(completed: number, planned: number | null, manuallyComplete = false) {
  const complete = planned === null ? manuallyComplete : completed >= planned;
  return { complete, ratio: planned === null ? Number(complete) : planned ? Math.min(1, Math.max(0, completed / planned)) : 0,
    label: planned === null ? `${completed} ${completed === 1 ? 'set' : 'sets'} completed` : `${completed} of ${planned} sets completed` };
}

/** Count each exercise once using the same target rule as its existing progress indicator. */
export function workoutProgress(session: Pick<SessionDetail, 'exercises'>) {
  const completed = session.exercises.filter((exercise) => exerciseProgress(exercise.sets.length, exercise.targetSetCount, exercise.isManuallyComplete).complete).length;
  const total = session.exercises.length;
  const ratio = total ? completed / total : 0;
  return { completed, total, ratio, percentage: Math.round(ratio * 100), label: total ? `${completed} of ${total} exercises` : 'No exercises yet' };
}

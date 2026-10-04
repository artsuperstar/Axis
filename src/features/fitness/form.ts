import type { Exercise, MeasurementType, SetDraft, TargetDraft, Targets, WorkoutSet } from './types';

export class FitnessValidationError extends Error {}
export function fitnessError(error: unknown, fallback = 'Unable to save. Please try again.') {
  return error instanceof FitnessValidationError ? error.message : fallback;
}
export const measurementOptions: { value: MeasurementType; label: string }[] = [
  { value: 'strength', label: 'Strength' }, { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'duration', label: 'Duration' }, { value: 'distance', label: 'Distance' },
];
export function measurementLabel(type: MeasurementType) { return measurementOptions.find((option) => option.value === type)?.label ?? type; }
export function normalizeName(value: string) {
  const name = value.trim().replace(/\s+/g, ' ');
  if (!name || name.length > 120) throw new FitnessValidationError('Enter a name between 1 and 120 characters.');
  return name;
}
export function validateMeasurement(type: MeasurementType) {
  if (!measurementOptions.some((option) => option.value === type)) throw new FitnessValidationError('Choose an exercise measurement type.');
  return type;
}
const maximum = BigInt(Number.MAX_SAFE_INTEGER);
function safe(value: bigint, label: string, allowZero = false) {
  if (value < (allowZero ? 0n : 1n) || value > maximum) throw new FitnessValidationError(`${label} must be ${allowZero ? 'nonnegative' : 'positive'} and within the supported range.`);
  return Number(value);
}
export function parseInteger(input: string, label: string, allowZero = false) {
  if (!/^\d+$/.test(input.trim())) throw new FitnessValidationError(`Enter ${label.toLowerCase()} as a whole number.`);
  return safe(BigInt(input.trim()), label, allowZero);
}
// Decimal strings are scaled with BigInt before conversion to a safe JS integer.
export function parseThousandths(input: string, label: string, allowZero = false) {
  const match = /^(\d+)(?:[.,](\d{1,3}))?$/.exec(input.trim());
  if (!match) throw new FitnessValidationError(`Enter ${label.toLowerCase()} with up to 3 decimal places.`);
  return safe(BigInt(match[1]) * 1000n + BigInt((match[2] ?? '').padEnd(3, '0')), label, allowZero);
}
export function parseDuration(minutes: string, seconds: string, optional = false) {
  if (!minutes.trim() && !seconds.trim() && optional) return null;
  const mins = BigInt(parseInteger(minutes.trim() || '0', 'Minutes', true));
  const secs = parseInteger(seconds.trim() || '0', 'Seconds', true);
  if (secs > 59) throw new FitnessValidationError('Seconds must be between 0 and 59.');
  return safe(mins * 60n + BigInt(secs), 'Duration');
}
export function parseDistance(distance: string, unit: 'm' | 'km') {
  if (unit !== 'm' && unit !== 'km') throw new FitnessValidationError('Choose meters or kilometers.');
  return unit === 'km' ? parseThousandths(distance, 'Distance') : parseInteger(distance, 'Distance');
}
export function blankSet(): SetDraft { return { weight: '', reps: '', minutes: '', seconds: '', distance: '', distanceUnit: 'km' }; }
export function blankTargets(): TargetDraft { return { setCount: '', repMin: '', repMax: '', minutes: '', seconds: '', distance: '', distanceUnit: 'km' }; }
function rejectFields(values: string[]) {
  if (values.some((value) => value.trim())) throw new FitnessValidationError('These fields do not apply to this measurement type.');
}
export function validateSet(type: MeasurementType, draft: SetDraft) {
  validateMeasurement(type);
  const result = { weightGrams: null as number | null, reps: null as number | null, durationSeconds: null as number | null, distanceMeters: null as number | null };
  if (type === 'strength' || type === 'bodyweight') {
    rejectFields([draft.minutes, draft.seconds, draft.distance]);
    result.reps = parseInteger(draft.reps, 'Reps');
    result.weightGrams = type === 'bodyweight' && !draft.weight.trim() ? null : parseThousandths(draft.weight, 'Weight', type === 'strength');
  } else if (type === 'duration') {
    rejectFields([draft.weight, draft.reps, draft.distance]);
    result.durationSeconds = parseDuration(draft.minutes, draft.seconds);
  } else {
    rejectFields([draft.weight, draft.reps]);
    result.distanceMeters = parseDistance(draft.distance, draft.distanceUnit);
    result.durationSeconds = parseDuration(draft.minutes, draft.seconds, true);
  }
  return result;
}
export function validateTargets(type: MeasurementType, draft: TargetDraft): Targets {
  validateMeasurement(type);
  const result: Targets = { targetSetCount: draft.setCount.trim() ? parseInteger(draft.setCount, 'Target set count') : null,
    targetRepMin: null, targetRepMax: null, targetDurationSeconds: null, targetDistanceMeters: null };
  if (result.targetSetCount !== null && result.targetSetCount > 100) throw new FitnessValidationError('Target set count must be between 1 and 100.');
  if (type === 'strength' || type === 'bodyweight') {
    rejectFields([draft.minutes, draft.seconds, draft.distance]);
    if (draft.repMin.trim() || draft.repMax.trim()) {
      result.targetRepMin = parseInteger(draft.repMin, 'Minimum reps');
      result.targetRepMax = parseInteger(draft.repMax, 'Maximum reps');
      if (result.targetRepMax < result.targetRepMin) throw new FitnessValidationError('Maximum reps must be at least the minimum.');
    }
  } else if (type === 'duration') {
    rejectFields([draft.repMin, draft.repMax, draft.distance]);
    result.targetDurationSeconds = parseDuration(draft.minutes, draft.seconds, true);
  } else {
    rejectFields([draft.repMin, draft.repMax, draft.minutes, draft.seconds]);
    result.targetDistanceMeters = draft.distance.trim() ? parseDistance(draft.distance, draft.distanceUnit) : null;
  }
  return result;
}
export function formatThousandths(value: number) {
  const exact = BigInt(value);
  const fraction = String(exact % 1000n).padStart(3, '0').replace(/0+$/, '');
  return `${exact / 1000n}${fraction ? `.${fraction}` : ''}`;
}
function durationParts(value: number | null) {
  return value === null ? { minutes: '', seconds: '' } : { minutes: String(BigInt(value) / 60n), seconds: String(BigInt(value) % 60n) };
}
export function setDraft(set?: WorkoutSet): SetDraft {
  if (!set) return blankSet();
  return { weight: set.weightGrams === null ? '' : formatThousandths(set.weightGrams), reps: set.reps === null ? '' : String(set.reps),
    ...durationParts(set.durationSeconds), distance: set.distanceMeters === null ? '' : formatThousandths(set.distanceMeters), distanceUnit: 'km' };
}
export function targetDraft(targets: Targets): TargetDraft {
  return { setCount: targets.targetSetCount === null ? '' : String(targets.targetSetCount), repMin: targets.targetRepMin === null ? '' : String(targets.targetRepMin),
    repMax: targets.targetRepMax === null ? '' : String(targets.targetRepMax), ...durationParts(targets.targetDurationSeconds),
    distance: targets.targetDistanceMeters === null ? '' : formatThousandths(targets.targetDistanceMeters), distanceUnit: 'km' };
}
export function durationLabel(seconds: number) {
  const mins = BigInt(seconds) / 60n; const secs = BigInt(seconds) % 60n;
  return mins ? `${mins} min${secs ? ` ${secs} sec` : ''}` : `${secs} sec`;
}
export function distanceLabel(meters: number) { return meters < 1000 ? `${meters} m` : `${formatThousandths(meters)} km`; }
export function setLabel(set: Pick<WorkoutSet, 'measurementType' | 'weightGrams' | 'reps' | 'durationSeconds' | 'distanceMeters'>) {
  if (set.measurementType === 'strength') return `${formatThousandths(set.weightGrams!)} kg × ${set.reps}`;
  if (set.measurementType === 'bodyweight') return `${set.reps} reps${set.weightGrams === null ? '' : ` · +${formatThousandths(set.weightGrams)} kg`}`;
  if (set.measurementType === 'duration') return durationLabel(set.durationSeconds!);
  return `${distanceLabel(set.distanceMeters!)}${set.durationSeconds === null ? '' : ` · ${durationLabel(set.durationSeconds)}`}`;
}
export function targetLabel(targets: Targets) {
  return [targets.targetSetCount === null ? '' : `${targets.targetSetCount} planned sets`,
    targets.targetRepMin === null ? '' : `${targets.targetRepMin}–${targets.targetRepMax} reps`,
    targets.targetDurationSeconds === null ? '' : durationLabel(targets.targetDurationSeconds),
    targets.targetDistanceMeters === null ? '' : distanceLabel(targets.targetDistanceMeters)].filter(Boolean).join(' · ');
}
export function exerciseResults(exercises: readonly Exercise[], query: string) {
  const name = query.trim().replace(/\s+/g, ' ');
  const active = exercises.filter((exercise) => exercise.deletedAt === null);
  return { suggestions: active.filter((exercise) => exercise.name.toLowerCase().includes(name.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 20).map((exercise) => ({ value: exercise.id, label: exercise.name })),
    createLabel: name && name.length <= 120 && !active.some((exercise) => exercise.name.toLowerCase() === name.toLowerCase()) ? `+ Create “${name}”` : undefined };
}

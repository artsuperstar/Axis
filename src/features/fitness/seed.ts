import type { AxisDatabase } from '@/database/client';
import { fitnessExercises } from '@/database/schema';
import type { MeasurementType } from './types';

// Fixed IDs are independent of labels and stable across restarts.
export const builtInExercises: { id: string; name: string; measurementType: MeasurementType }[] = [
  ['bench-press', 'Bench Press', 'strength'], ['squat', 'Squat', 'strength'], ['deadlift', 'Deadlift', 'strength'],
  ['overhead-press', 'Overhead Press', 'strength'], ['bicep-curl', 'Bicep Curl', 'strength'],
  ['tricep-extension', 'Tricep Extension', 'strength'], ['leg-press', 'Leg Press', 'strength'],
  ['push-up', 'Push-up', 'bodyweight'], ['pull-up', 'Pull-up', 'bodyweight'], ['dip', 'Dip', 'bodyweight'],
  ['plank', 'Plank', 'duration'], ['running', 'Running', 'distance'], ['walking', 'Walking', 'distance'], ['cycling', 'Cycling', 'distance'],
].map(([key, name, measurementType]) => ({ id: `fitness-exercise-${key}`, name, measurementType: measurementType as MeasurementType }));

export function seedFitnessExercises(db: AxisDatabase) {
  db.transaction((query) => {
    const timestamp = Date.now();
    for (const exercise of builtInExercises) query.insert(fitnessExercises).values({
      ...exercise, isBuiltIn: true, createdAt: timestamp, updatedAt: timestamp,
    }).onConflictDoNothing().run();
  }, { behavior: 'immediate' });
}

import type { fitnessExercises, fitnessRoutines, fitnessRoutineExercises, fitnessSessions, fitnessSessionExercises, fitnessSets } from '@/database/schema';

export type Exercise = typeof fitnessExercises.$inferSelect;
export type MeasurementType = Exercise['measurementType'];
export type Routine = typeof fitnessRoutines.$inferSelect;
export type RoutineExercise = typeof fitnessRoutineExercises.$inferSelect;
export type Session = typeof fitnessSessions.$inferSelect;
export type SessionExercise = typeof fitnessSessionExercises.$inferSelect;
export type WorkoutSet = typeof fitnessSets.$inferSelect;
export type Targets = Pick<RoutineExercise, 'targetSetCount' | 'targetRepMin' | 'targetRepMax' | 'targetDurationSeconds' | 'targetDistanceMeters'>;
export type RoutineDetail = Routine & { exercises: (RoutineExercise & { exercise: Exercise })[] };
export type SessionDetail = Session & { exercises: (SessionExercise & { sets: WorkoutSet[] })[] };
export type SessionSummary = Session & { exerciseCount: number; setCount: number };
export type FitnessSnapshot = {
  exercises: Exercise[]; routines: RoutineDetail[]; active: SessionSummary | null;
  history: SessionSummary[]; hasMoreHistory: boolean;
};
export type FitnessOverview = Omit<FitnessSnapshot, 'routines'> & { routines: Routine[] };
export type WorkoutHistoryCursor = Pick<SessionSummary, 'completedAt' | 'startedAt' | 'id'>;
export type SetDraft = { weight: string; reps: string; minutes: string; seconds: string; distance: string; distanceUnit: 'm' | 'km' };
export type TargetDraft = Omit<SetDraft, 'weight' | 'reps'> & { setCount: string; repMin: string; repMax: string };
export type RoutineDraft = { name: string; exercises: { id: string | null; exerciseId: string; targets: TargetDraft }[] };

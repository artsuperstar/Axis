import type { fitnessExercises, fitnessRoutines, fitnessRoutineExercises, fitnessSessions, fitnessSessionExercises, fitnessSets, fitnessRotations, fitnessRotationSteps } from '@/database/schema';

export type Exercise = typeof fitnessExercises.$inferSelect;
export type MeasurementType = Exercise['measurementType'];
export type Routine = typeof fitnessRoutines.$inferSelect;
export type RoutineExercise = typeof fitnessRoutineExercises.$inferSelect;
export type Session = typeof fitnessSessions.$inferSelect;
export type SessionExercise = typeof fitnessSessionExercises.$inferSelect;
export type WorkoutSet = typeof fitnessSets.$inferSelect;
export type Targets = Pick<RoutineExercise, 'targetSetCount' | 'targetRepMin' | 'targetRepMax' | 'targetDurationSeconds' | 'targetDistanceMeters'>;
export type RoutineDetail = Routine & { exercises: (RoutineExercise & { exercise: Exercise })[] };
export type Rotation = typeof fitnessRotations.$inferSelect;
export type RotationStep = typeof fitnessRotationSteps.$inferSelect;
export type RotationDetail = Rotation & { steps: (RotationStep & { routine: Routine })[]; locked: boolean };
export type NextWorkout = { rotation: Pick<Rotation, 'id' | 'name'>; stepId: string; routine: Routine };
export type RotationDraft = { name: string; steps: { id: string | null; routineId: string }[]; nextStepId?: string; nextStepIndex?: number; updatedAt?: number };
export type FitnessDailySummary = { active: SessionSummary | null; completedCount: number; history: SessionSummary[]; nextWorkout: NextWorkout | null; rotationSequence: string[] };
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

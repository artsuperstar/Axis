import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lt, sql } from 'drizzle-orm';

import type { AxisDatabase } from '@/database/client';
import { localDayBounds } from '@/utils/calendar';
import { canonicalIdentityName } from '@/utils/text-normalization';
import { fitnessExercises as exercises, fitnessRoutines as routines, fitnessRoutineExercises as routineExercises,
  fitnessSessions as sessions, fitnessSessionExercises as sessionExercises, fitnessSets as sets } from '@/database/schema';

import { FitnessValidationError, normalizeName, validateMeasurement, validateSet, validateTargets } from './form';
import type { FitnessSnapshot, MeasurementType, RoutineDraft, RoutineDetail, Session, SessionDetail, SessionSummary, SetDraft } from './types';

type Query = Pick<AxisDatabase, 'select' | 'insert' | 'update'>;

export function createFitnessDataAccess(db: AxisDatabase, newId: () => string, now = Date.now) {
  const stamp = (row: { updatedAt: number }) => Math.max(now(), row.updatedAt + 1);
  function exercise(query: Query, id: string) {
    const row = query.select().from(exercises).where(eq(exercises.id, id)).get();
    if (!row) throw new FitnessValidationError('This exercise is no longer available.');
    return row;
  }
  function activeExercise(query: Query, id: string) {
    const row = exercise(query, id);
    if (row.deletedAt !== null) throw new FitnessValidationError('Choose an active exercise.');
    return row;
  }
  function routine(query: Query, id: string): RoutineDetail {
    const row = query.select().from(routines).where(eq(routines.id, id)).get();
    if (!row) throw new FitnessValidationError('This routine is no longer available.');
    const entries = query.select({ entry: routineExercises, exercise: exercises }).from(routineExercises)
      .innerJoin(exercises, eq(routineExercises.exerciseId, exercises.id))
      .where(and(eq(routineExercises.routineId, id), isNull(routineExercises.deletedAt))).orderBy(asc(routineExercises.position)).all();
    return { ...row, exercises: entries.map(({ entry, exercise }) => ({ ...entry, exercise })) };
  }
  function session(query: Query, id: string) {
    const row = query.select().from(sessions).where(and(eq(sessions.id, id), isNull(sessions.deletedAt))).get();
    if (!row) throw new FitnessValidationError('This workout is no longer available.');
    return row;
  }
  function editableSession(query: Query, id: string) {
    const row = session(query, id);
    if (row.completedAt !== null) throw new FitnessValidationError('Completed workouts are read-only.');
    return row;
  }
  function editableExercise(query: Query, id: string) {
    const row = query.select().from(sessionExercises).where(and(eq(sessionExercises.id, id), isNull(sessionExercises.deletedAt))).get();
    if (!row) throw new FitnessValidationError('This workout exercise is no longer available.');
    const parent = editableSession(query, row.sessionId);
    return { row, parent };
  }
  function editableSet(query: Query, id: string) {
    const row = query.select().from(sets).where(and(eq(sets.id, id), isNull(sets.deletedAt))).get();
    if (!row) throw new FitnessValidationError('This set is no longer available.');
    return { set: row, ...editableExercise(query, row.sessionExerciseId) };
  }
  function touch(query: Query, parent: Session) {
    query.update(sessions).set({ updatedAt: stamp(parent) }).where(eq(sessions.id, parent.id)).run();
  }
  function sessionDetail(query: Query, id: string): SessionDetail {
    const row = session(query, id);
    const entries = query.select().from(sessionExercises).where(and(eq(sessionExercises.sessionId, id), isNull(sessionExercises.deletedAt)))
      .orderBy(asc(sessionExercises.position)).all();
    const logged = entries.length ? query.select().from(sets).where(and(inArray(sets.sessionExerciseId, entries.map((entry) => entry.id)), isNull(sets.deletedAt)))
      .orderBy(asc(sets.position)).all() : [];
    return { ...row, exercises: entries.map((entry) => ({ ...entry, sets: logged.filter((set) => set.sessionExerciseId === entry.id) })) };
  }
  const counts = {
    exerciseCount: sql<number>`(SELECT count(*) FROM fitness_session_exercises e WHERE e.session_id = fitness_workout_sessions.id AND e.deleted_at IS NULL)`.mapWith(Number),
    setCount: sql<number>`(SELECT count(*) FROM fitness_sets s JOIN fitness_session_exercises e ON e.id = s.session_exercise_id
      WHERE e.session_id = fitness_workout_sessions.id AND e.deleted_at IS NULL AND s.deleted_at IS NULL)`.mapWith(Number),
  };
  const summary = (row: { session: Session; exerciseCount: number; setCount: number }): SessionSummary => ({ ...row.session, exerciseCount: row.exerciseCount, setCount: row.setCount });

  function saveRoutine(id: string | null, draft: RoutineDraft) {
    const name = normalizeName(draft.name);
    return db.transaction((query) => {
      const old = id ? routine(query, id) : null;
      if (old && old.deletedAt !== null) throw new FitnessValidationError('Archived routines cannot be edited.');
      const identity = canonicalIdentityName(name);
      if (query.select().from(routines).where(isNull(routines.deletedAt)).all()
        .some((entry) => entry.id !== id && canonicalIdentityName(entry.name) === identity)) {
        throw new FitnessValidationError('An active routine with this name already exists.');
      }
      const retained = new Set<string>();
      const values = draft.exercises.map((entry) => {
        const previous = entry.id ? old?.exercises.find((item) => item.id === entry.id) : null;
        if (entry.id && (!previous || previous.exerciseId !== entry.exerciseId || retained.has(entry.id))) throw new FitnessValidationError('This routine entry is invalid.');
        if (entry.id) retained.add(entry.id);
        const source = previous ? exercise(query, entry.exerciseId) : activeExercise(query, entry.exerciseId);
        return { entry, source, targets: validateTargets(source.measurementType, entry.targets) };
      });
      const routineId = id ?? newId(); const timestamp = old ? stamp(old) : now();
      if (old) query.update(routines).set({ name, updatedAt: timestamp }).where(eq(routines.id, routineId)).run();
      else query.insert(routines).values({ id: routineId, name, createdAt: timestamp, updatedAt: timestamp }).run();
      // Move retained rows out of the final position range before swapping their order.
      const offset = Math.max(values.length, ...(old?.exercises.map((entry) => entry.position + 1) ?? [0]));
      for (const [index, entry] of (old?.exercises ?? []).entries()) {
        query.update(routineExercises).set(retained.has(entry.id)
          ? { position: offset + index, updatedAt: Math.max(timestamp, stamp(entry)) }
          : { deletedAt: Math.max(timestamp, stamp(entry)), updatedAt: Math.max(timestamp, stamp(entry)) }).where(eq(routineExercises.id, entry.id)).run();
      }
      values.forEach(({ entry, source, targets }, position) => {
        if (entry.id) query.update(routineExercises).set({ ...targets, position }).where(eq(routineExercises.id, entry.id)).run();
        else query.insert(routineExercises).values({ id: newId(), routineId, exerciseId: source.id, measurementType: source.measurementType,
          ...targets, position, createdAt: timestamp, updatedAt: timestamp }).run();
      });
      return routineId;
    }, { behavior: 'immediate' });
  }
  function nextPosition(query: Query, table: typeof sets | typeof sessionExercises, filter: ReturnType<typeof eq>) {
    const last = query.select({ position: table.position }).from(table).where(filter).orderBy(desc(table.position)).get();
    const next = last ? last.position + 1 : 0;
    if (!Number.isSafeInteger(next)) throw new FitnessValidationError('The supported ordering range has been reached.');
    return next;
  }
  return {
    readCompletedOnDate(date: string): SessionSummary[] {
      const { from, until } = localDayBounds(date);
      return db.select({ session: sessions, ...counts }).from(sessions)
        .where(and(isNull(sessions.deletedAt), gte(sessions.completedAt, from), lt(sessions.completedAt, until)))
        .orderBy(desc(sessions.completedAt), asc(sessions.id)).all().map(summary);
    },
    read(historyLimit = 20): FitnessSnapshot {
      if (!Number.isSafeInteger(historyLimit) || historyLimit < 1) throw new FitnessValidationError('Invalid history page size.');
      return db.transaction((query) => {
        const history = query.select({ session: sessions, ...counts }).from(sessions).where(and(isNull(sessions.deletedAt), isNotNull(sessions.completedAt)))
          .orderBy(desc(sessions.completedAt), desc(sessions.startedAt), asc(sessions.id)).limit(historyLimit + 1).all();
        const active = query.select({ session: sessions, ...counts }).from(sessions).where(and(isNull(sessions.deletedAt), isNull(sessions.completedAt))).get();
        return { exercises: query.select().from(exercises).orderBy(asc(exercises.name)).all(),
          routines: query.select({ id: routines.id }).from(routines).orderBy(asc(routines.name)).all().map(({ id }) => routine(query, id)),
          active: active ? summary(active) : null, history: history.slice(0, historyLimit).map(summary), hasMoreHistory: history.length > historyLimit };
      });
    },
    readRoutine: (id: string) => db.transaction((query) => routine(query, id)),
    readSession: (id: string) => db.transaction((query) => sessionDetail(query, id)),
    createExercise(draft: { name: string; measurementType: MeasurementType }) {
      const name = normalizeName(draft.name); const measurementType = validateMeasurement(draft.measurementType);
      return db.transaction((query) => {
        const identity = canonicalIdentityName(name);
        if (query.select().from(exercises).where(isNull(exercises.deletedAt)).all()
          .some((exercise) => canonicalIdentityName(exercise.name) === identity)) {
          throw new FitnessValidationError('An active exercise with this name already exists.');
        }
        const timestamp = now();
        return query.insert(exercises).values({ id: newId(), name, measurementType, isBuiltIn: false, createdAt: timestamp, updatedAt: timestamp }).returning().get();
      }, { behavior: 'immediate' });
    },
    archiveExercise(id: string) {
      db.transaction((query) => {
        const row = exercise(query, id);
        if (row.isBuiltIn) throw new FitnessValidationError('Built-in exercises cannot be archived.');
        if (row.deletedAt !== null) return;
        const timestamp = stamp(row);
        query.update(exercises).set({ deletedAt: timestamp, updatedAt: timestamp }).where(eq(exercises.id, id)).run();
      }, { behavior: 'immediate' });
    },
    createRoutine: (draft: RoutineDraft) => saveRoutine(null, draft),
    editRoutine: (id: string, draft: RoutineDraft) => saveRoutine(id, draft),
    archiveRoutine(id: string) {
      db.transaction((query) => {
        const row = routine(query, id);
        if (row.deletedAt !== null) return;
        const timestamp = stamp(row);
        query.update(routines).set({ deletedAt: timestamp, updatedAt: timestamp }).where(eq(routines.id, id)).run();
      }, { behavior: 'immediate' });
    },
    startWorkout(routineId: string | null = null) {
      return db.transaction((query) => {
        const active = query.select().from(sessions).where(and(isNull(sessions.deletedAt), isNull(sessions.completedAt))).get();
        if (active) return { id: active.id, resumed: true };
        const plan = routineId ? routine(query, routineId) : null;
        if (plan && plan.deletedAt !== null) throw new FitnessValidationError('Choose an active routine.');
        const id = newId(); const timestamp = now();
        query.insert(sessions).values({ id, routineId, name: plan?.name ?? 'Free workout', startedAt: timestamp, createdAt: timestamp, updatedAt: timestamp }).run();
        // Archived references remain in the template, but are not added to a new workout.
        plan?.exercises.filter((entry) => entry.exercise.deletedAt === null).forEach((entry, position) => {
          query.insert(sessionExercises).values({ id: newId(), sessionId: id, exerciseId: entry.exerciseId, exerciseName: entry.exercise.name,
            measurementType: entry.measurementType, position, targetSetCount: entry.targetSetCount, targetRepMin: entry.targetRepMin,
            targetRepMax: entry.targetRepMax, targetDurationSeconds: entry.targetDurationSeconds, targetDistanceMeters: entry.targetDistanceMeters,
            createdAt: timestamp, updatedAt: timestamp }).run();
        });
        return { id, resumed: false };
      }, { behavior: 'immediate' });
    },
    addSessionExercise(sessionId: string, exerciseId: string) {
      return db.transaction((query) => {
        const parent = editableSession(query, sessionId); const source = activeExercise(query, exerciseId);
        const id = newId(); const timestamp = Math.max(now(), parent.updatedAt);
        query.insert(sessionExercises).values({ id, sessionId, exerciseId, exerciseName: source.name, measurementType: source.measurementType,
          position: nextPosition(query, sessionExercises, eq(sessionExercises.sessionId, sessionId)), createdAt: timestamp, updatedAt: timestamp }).run();
        touch(query, parent); return id;
      }, { behavior: 'immediate' });
    },
    removeSessionExercise(id: string) {
      db.transaction((query) => {
        const { row, parent } = editableExercise(query, id); const timestamp = stamp(row);
        query.update(sessionExercises).set({ deletedAt: timestamp, updatedAt: timestamp }).where(eq(sessionExercises.id, id)).run();
        touch(query, parent);
      }, { behavior: 'immediate' });
    },
    addSet(sessionExerciseId: string, draft: SetDraft) {
      return db.transaction((query) => {
        const { row, parent } = editableExercise(query, sessionExerciseId);
        const values = validateSet(row.measurementType, draft); const id = newId(); const timestamp = Math.max(now(), parent.updatedAt);
        query.insert(sets).values({ id, sessionExerciseId, measurementType: row.measurementType, ...values,
          position: nextPosition(query, sets, eq(sets.sessionExerciseId, sessionExerciseId)), createdAt: timestamp, updatedAt: timestamp }).run();
        touch(query, parent); return id;
      }, { behavior: 'immediate' });
    },
    editSet(id: string, draft: SetDraft) {
      db.transaction((query) => {
        const { set, row, parent } = editableSet(query, id);
        query.update(sets).set({ ...validateSet(row.measurementType, draft), updatedAt: stamp(set) }).where(eq(sets.id, id)).run();
        touch(query, parent);
      }, { behavior: 'immediate' });
    },
    deleteSet(id: string) {
      db.transaction((query) => {
        const { set, parent } = editableSet(query, id); const timestamp = stamp(set);
        query.update(sets).set({ deletedAt: timestamp, updatedAt: timestamp }).where(eq(sets.id, id)).run();
        touch(query, parent);
      }, { behavior: 'immediate' });
    },
    saveNote(sessionId: string, sessionExerciseId: string | null, value: string) {
      const note = value.trim() || null;
      if (note && note.length > 2000) throw new FitnessValidationError('Keep notes within 2000 characters.');
      db.transaction((query) => {
        const parent = editableSession(query, sessionId);
        if (sessionExerciseId) {
          const { row } = editableExercise(query, sessionExerciseId);
          if (row.sessionId !== sessionId) throw new FitnessValidationError('This exercise belongs to a different workout.');
          query.update(sessionExercises).set({ note, updatedAt: stamp(row) }).where(eq(sessionExercises.id, row.id)).run();
          touch(query, parent);
        } else query.update(sessions).set({ note, updatedAt: stamp(parent) }).where(eq(sessions.id, sessionId)).run();
      }, { behavior: 'immediate' });
    },
    finishWorkout(id: string) {
      db.transaction((query) => {
        const row = editableSession(query, id); const timestamp = Math.max(stamp(row), row.startedAt);
        query.update(sessions).set({ completedAt: timestamp, updatedAt: timestamp }).where(eq(sessions.id, id)).run();
      }, { behavior: 'immediate' });
    },
    discardWorkout(id: string) {
      db.transaction((query) => {
        const row = editableSession(query, id); const timestamp = stamp(row);
        query.update(sessions).set({ deletedAt: timestamp, updatedAt: timestamp }).where(eq(sessions.id, id)).run();
      }, { behavior: 'immediate' });
    },
  };
}
export type FitnessDataAccess = ReturnType<typeof createFitnessDataAccess>;

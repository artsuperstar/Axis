import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import type { AxisDatabase } from '@/database/client';
import { fitnessRotations as rotations, fitnessRotationSteps as steps, fitnessRoutines as routines, fitnessSessions as sessions } from '@/database/schema';

import { FitnessValidationError, normalizeName } from './form';
import type { NextWorkout, RotationDetail, RotationDraft, Session } from './types';

type Query = Pick<AxisDatabase, 'select' | 'insert' | 'update'>;
const liveSession = and(isNull(sessions.deletedAt), isNull(sessions.completedAt));

/** One joined row, with no routine exercises or workout history. */
export function readNextWorkout(query: Query): NextWorkout | null {
  const row = query.select({ rotation: rotations, step: steps, routine: routines }).from(rotations)
    .innerJoin(steps, and(eq(steps.id, rotations.nextStepId), eq(steps.rotationId, rotations.id)))
    .innerJoin(routines, eq(routines.id, steps.routineId))
    .where(and(eq(rotations.isActive, true), isNull(rotations.deletedAt), isNull(steps.deletedAt), isNull(routines.deletedAt))).get();
  return row ? { rotation: { id: row.rotation.id, name: row.rotation.name }, stepId: row.step.id, routine: row.routine } : null;
}

/** Daily/Home planning context: one active cycle only, without routine entries or saved-rotation management data. */
export function readActiveRotationPlan(query: Query) {
  const rows = query.select({ rotation: { id: rotations.id, name: rotations.name, nextStepId: rotations.nextStepId },
    stepId: steps.id, routine: routines }).from(rotations)
    .innerJoin(steps, eq(steps.rotationId, rotations.id)).innerJoin(routines, eq(routines.id, steps.routineId))
    .where(and(eq(rotations.isActive, true), isNull(rotations.deletedAt), isNull(steps.deletedAt), isNull(routines.deletedAt)))
    .orderBy(asc(steps.position)).all();
  const next = rows.find((row) => row.stepId === row.rotation.nextStepId);
  const nextWorkout: NextWorkout | null = next ? { rotation: { id: next.rotation.id, name: next.rotation.name }, stepId: next.stepId, routine: next.routine } : null;
  return { nextWorkout, rotationSequence: next ? rows.map((row) => row.routine.name) : [] };
}

export function assertRoutineNotInRotation(query: Query, routineId: string) {
  const reference = query.select({ id: rotations.id }).from(steps).innerJoin(rotations, eq(rotations.id, steps.rotationId))
    .where(and(eq(steps.routineId, routineId), isNull(steps.deletedAt), isNull(rotations.deletedAt))).get();
  if (reference) throw new FitnessValidationError('Remove this routine from saved rotations before archiving it.');
}

/** Called inside the same immediate transaction as successful session completion. */
export function advanceWorkoutRotation(query: Query, session: Session, timestamp: number) {
  if (!session.rotationId) return;
  const rotation = query.select().from(rotations).where(eq(rotations.id, session.rotationId)).get();
  if (!rotation || rotation.deletedAt !== null || !rotation.isActive || rotation.nextStepId !== session.rotationStepId) {
    throw new FitnessValidationError('The workout rotation changed. Your workout has not been completed.');
  }
  const ordered = query.select().from(steps).where(and(eq(steps.rotationId, rotation.id), isNull(steps.deletedAt))).orderBy(asc(steps.position)).all();
  const index = ordered.findIndex((step) => step.id === session.rotationStepId && step.routineId === session.routineId);
  if (index < 0) throw new FitnessValidationError('This workout no longer matches its rotation step.');
  query.update(rotations).set({ nextStepId: ordered[(index + 1) % ordered.length].id, updatedAt: Math.max(timestamp, rotation.updatedAt + 1) })
    .where(eq(rotations.id, rotation.id)).run();
}

export function createRotationDataAccess(db: AxisDatabase, newId: () => string, now = Date.now) {
  const stamp = (row: { updatedAt: number }) => Math.max(now(), row.updatedAt + 1);
  function definition(query: Query, id: string) {
    const row = query.select().from(rotations).where(and(eq(rotations.id, id), isNull(rotations.deletedAt))).get();
    if (!row) throw new FitnessValidationError('This rotation is no longer available.');
    return row;
  }
  function linkedSession(query: Query, id?: string) {
    return query.select().from(sessions).where(and(liveSession, id ? eq(sessions.rotationId, id) : undefined)).get();
  }
  function unlocked(query: Query, id: string) {
    if (linkedSession(query, id)) throw new FitnessValidationError('Finish or discard the linked workout before changing this rotation.');
  }
  function save(id: string | null, draft: RotationDraft) {
    const name = normalizeName(draft.name);
    if (!draft.steps.length) throw new FitnessValidationError('Add at least one routine.');
    return db.transaction((query) => {
      const old = id ? definition(query, id) : null;
      if (old && draft.updatedAt !== undefined && old.updatedAt !== draft.updatedAt) throw new FitnessValidationError('This rotation changed. Reopen it before saving.');
      const previous = old ? query.select().from(steps).where(and(eq(steps.rotationId, old.id), isNull(steps.deletedAt))).orderBy(asc(steps.position)).all() : [];
      const retained = new Set<string>();
      const ordered = draft.steps.map((entry) => {
        if (entry.id) {
          if (retained.has(entry.id) || !previous.some((step) => step.id === entry.id && step.routineId === entry.routineId)) throw new FitnessValidationError('This rotation step is invalid.');
          retained.add(entry.id);
        }
        const routine = query.select().from(routines).where(and(eq(routines.id, entry.routineId), isNull(routines.deletedAt))).get();
        if (!routine) throw new FitnessValidationError('Choose an active routine.');
        return { id: entry.id ?? newId(), routineId: entry.routineId };
      });
      const sameOrder = previous.length === ordered.length && previous.every((step, index) => step.id === ordered[index].id);
      let nextId = draft.nextStepId;
      if (draft.nextStepIndex !== undefined) {
        if (nextId !== undefined || !Number.isInteger(draft.nextStepIndex) || !ordered[draft.nextStepIndex]) throw new FitnessValidationError('Choose a next step from this rotation.');
        nextId = ordered[draft.nextStepIndex].id;
      }
      if (old && (!sameOrder || (nextId !== undefined && nextId !== old.nextStepId))) unlocked(query, old.id);
      if (nextId !== undefined && !ordered.some((step) => step.id === nextId)) throw new FitnessValidationError('Choose a next step from this rotation.');
      if (!nextId && old?.nextStepId && retained.has(old.nextStepId)) nextId = old.nextStepId;
      if (!nextId && old?.nextStepId) {
        const index = previous.findIndex((step) => step.id === old.nextStepId);
        // Walk the previous cycle, retaining the next surviving identity rather than a raw index.
        for (let offset = 1; offset <= previous.length; offset++) {
          const candidate = previous[(index + offset) % previous.length];
          if (retained.has(candidate.id)) { nextId = candidate.id; break; }
        }
      }
      nextId ??= ordered[0].id;
      const rotationId = old?.id ?? newId(); const timestamp = old ? stamp(old) : now();
      if (!old) query.insert(rotations).values({ id: rotationId, name, createdAt: timestamp, updatedAt: timestamp }).run();
      if (!sameOrder) {
        const offset = Math.max(ordered.length, ...previous.map((step) => step.position + 1), 0);
        previous.forEach((step, index) => query.update(steps).set(retained.has(step.id)
          ? { position: offset + index, updatedAt: timestamp } : { deletedAt: timestamp, updatedAt: timestamp }).where(eq(steps.id, step.id)).run());
        ordered.forEach((step, position) => {
          if (retained.has(step.id)) query.update(steps).set({ position, updatedAt: timestamp }).where(eq(steps.id, step.id)).run();
          else query.insert(steps).values({ ...step, rotationId, position, createdAt: timestamp, updatedAt: timestamp }).run();
        });
      }
      query.update(rotations).set({ name, nextStepId: nextId, updatedAt: timestamp }).where(eq(rotations.id, rotationId)).run();
      return rotationId;
    }, { behavior: 'immediate' });
  }
  function readDefinitions(query: Query): RotationDetail[] {
    const parents = query.select().from(rotations).where(isNull(rotations.deletedAt)).orderBy(asc(rotations.name), asc(rotations.id)).all();
    const entries = query.select({ step: steps, routine: routines }).from(steps).innerJoin(rotations, eq(rotations.id, steps.rotationId))
      .innerJoin(routines, eq(routines.id, steps.routineId)).where(and(isNull(rotations.deletedAt), isNull(steps.deletedAt))).orderBy(asc(steps.position)).all();
    const active = linkedSession(query);
    return parents.map((parent) => ({ ...parent, locked: active?.rotationId === parent.id,
      steps: entries.filter((entry) => entry.step.rotationId === parent.id).map(({ step, routine }) => ({ ...step, routine })) }));
  }
  return {
    read: () => db.transaction(readDefinitions),
    readManagement: () => db.transaction((query) => ({ rotations: readDefinitions(query),
      routines: query.select().from(routines).where(isNull(routines.deletedAt)).orderBy(asc(routines.name), asc(routines.id)).all() })),
    readNext: () => readNextWorkout(db),
    readActiveSteps: () => db.select({ name: routines.name }).from(steps).innerJoin(rotations, eq(rotations.id, steps.rotationId))
      .innerJoin(routines, eq(routines.id, steps.routineId)).where(and(eq(rotations.isActive, true), isNull(rotations.deletedAt), isNull(steps.deletedAt)))
      .orderBy(asc(steps.position)).all().map((step) => step.name),
    create: (draft: RotationDraft) => save(null, draft),
    edit: (id: string, draft: RotationDraft) => save(id, draft),
    activate(id: string) {
      db.transaction((query) => {
        const row = definition(query, id);
        if (row.isActive) return;
        const activeSession = linkedSession(query);
        if (activeSession?.rotationId) unlocked(query, activeSession.rotationId);
        if (!row.nextStepId) throw new FitnessValidationError('Add at least one routine before activating.');
        query.update(rotations).set({ isActive: false, updatedAt: sql`max(${now()}, ${rotations.updatedAt} + 1)` }).where(eq(rotations.isActive, true)).run();
        query.update(rotations).set({ isActive: true, updatedAt: stamp(row) }).where(eq(rotations.id, id)).run();
      }, { behavior: 'immediate' });
    },
    deactivate(id: string) {
      db.transaction((query) => { const row = definition(query, id); unlocked(query, id);
        query.update(rotations).set({ isActive: false, updatedAt: stamp(row) }).where(eq(rotations.id, id)).run();
      }, { behavior: 'immediate' });
    },
    setNext(id: string, stepId: string) {
      db.transaction((query) => { const row = definition(query, id); unlocked(query, id);
        if (!query.select().from(steps).where(and(eq(steps.rotationId, id), eq(steps.id, stepId), isNull(steps.deletedAt))).get()) throw new FitnessValidationError('Choose a step from this rotation.');
        query.update(rotations).set({ nextStepId: stepId, updatedAt: stamp(row) }).where(eq(rotations.id, id)).run();
      }, { behavior: 'immediate' });
    },
    reset(id: string) {
      db.transaction((query) => { const row = definition(query, id); unlocked(query, id);
        const first = query.select().from(steps).where(and(eq(steps.rotationId, id), isNull(steps.deletedAt))).orderBy(asc(steps.position)).get();
        if (!first) throw new FitnessValidationError('This rotation has no steps.');
        query.update(rotations).set({ nextStepId: first.id, updatedAt: stamp(row) }).where(eq(rotations.id, id)).run();
      }, { behavior: 'immediate' });
    },
    delete(id: string) {
      db.transaction((query) => { const row = definition(query, id); unlocked(query, id); const timestamp = stamp(row);
        // Tombstones retain historical provenance and never rewrite completed session snapshots.
        query.update(rotations).set({ isActive: false, deletedAt: timestamp, updatedAt: timestamp }).where(eq(rotations.id, id)).run();
      }, { behavior: 'immediate' });
    },
  };
}

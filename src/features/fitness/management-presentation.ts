import type { MeasurementType, SessionSummary } from './types';
import { measurementLabel } from './form';

export function exerciseTypeLabel(type: MeasurementType) {
  return measurementLabel(type);
}

export function exerciseMeasurementLabel(type: MeasurementType) {
  return { strength: 'Weight + reps', bodyweight: 'Reps · optional added weight', duration: 'Time', distance: 'Distance + optional time' }[type];
}

export function workoutCounts(exercises: number, sets?: number) {
  return `${exercises} ${exercises === 1 ? 'exercise' : 'exercises'}${sets === undefined ? '' : ` · ${sets} ${sets === 1 ? 'set' : 'sets'}`}`;
}

function localDateKey(date: Date) { return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`; }

export function workoutDateLabel(timestamp: number, now = new Date()) {
  const date = new Date(timestamp);
  if (localDateKey(date) === localDateKey(now)) return 'Today';
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  if (localDateKey(date) === localDateKey(yesterday)) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) });
}

/** Read order is authoritative; grouping never merges or reorders completed sessions. */
export function workoutHistoryGroups(sessions: readonly SessionSummary[], now = new Date()) {
  const groups: { key: string; label: string; sessions: SessionSummary[] }[] = [];
  for (const session of sessions) {
    if (session.completedAt === null) continue;
    const key = localDateKey(new Date(session.completedAt));
    const last = groups.at(-1);
    if (last?.key === key) last.sessions.push(session);
    else groups.push({ key, label: workoutDateLabel(session.completedAt, now), sessions: [session] });
  }
  return groups;
}

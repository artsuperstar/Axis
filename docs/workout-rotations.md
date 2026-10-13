# Stage 13I: Workout rotation planning

## Product and navigation

Planning is optional. Fitness keeps Workout, Routines, Exercises and History. Routines contains a compact active-cycle summary and links to `/fitness/rotations`, a pushed card route using the shared BackButton. `/fitness/rotation` is a full-screen explicit Save/Cancel editor. Existing routines are selected through SelectField; no routine or exercise is created implicitly.

The editor accepts one or more steps, including repeat references to the same routine. Move up/down, Remove and Set as next workout have routine/position accessibility labels. Names and controls wrap; no important label has a line clamp or fixed height. Activation is explicit. Reset and Delete require confirmation.

## Authoritative progression

`fitness_rotations.next_step_id` identifies a stable step, not an array position or routine ID. Each step has its own ID, parent, routine reference and ordered position. Reordering keeps the next identity. If it is removed, the data layer walks forward through the previous cycle to the next surviving identity, wrapping if necessary. If all previous steps are replaced, the first new step becomes next. Explicit editor selection of a newly added step uses its draft position only until saving; the database stores its generated stable ID.

Only one rotation may be active, enforced by a SQLite partial unique index. Activation switches definitions in an immediate transaction, retaining inactive progression. No active rotation is valid. Reading, midnight and rest days never advance anything.

The existing `startWorkout(routineId)` path captures nullable `rotationId`/`rotationStepId` provenance whenever the selected routine matches the active next step, including ordinary routine starts. Other routine and free workouts remain available. They do not acquire provenance later just because activation changes.

Successful completion and exactly one step of advancement share the same immediate transaction. Repeated Finish fails existing read-only validation; failures roll both changes back. Discard never advances. Multiple sequential expected completions in one day are allowed. Duplicate routine steps are distinguished by step ID. The inline active logger takes precedence over planning; after Finish, its refreshed start state presents the new next workout.

## Editing and lifecycle safety

A linked active session blocks structural edits, set-next, reset, deletion, deactivation and switching active rotations until completion/discard. Viewing and renaming remain available. Guards run in the data layer, independently of disabled UI controls. Editor drafts retain their captured source version through focus/foreground refreshes; stale saves are rejected instead of overwriting intervening progression.

Routine archival is blocked while any live saved rotation references it, active or inactive. Remove it from affected rotations or delete those definitions first. A SQLite archival trigger additionally enforces this rule. Exercise archival retains its existing behavior: archived exercises are omitted from newly started workouts while historical snapshots remain intact.

Deleting a rotation hides its planning definition and deactivates it. Rotation/step tombstones preserve historical provenance; routines and completed sessions, exercises, sets, notes and completion dates are not rewritten.

## Additive database migration

`0011_fitness_rotations` follows head `0010`. It adds two tables and two nullable session columns without rebuilding sessions. Foreign keys enforce routine references, parent ownership of the next pointer and provenance references. Indexes enforce live step position uniqueness and single activation. Session triggers require paired provenance matching the step's rotation/routine and prevent rewriting it. Drizzle snapshot, journal and runtime bundle are registered. Existing migrations remain unchanged.

## Targeted daily Fitness contract

`readDailySummary(localDate)` supplies:

- active session summary;
- count of all nondeleted sessions completed within the local civil day;
- at most one latest completed summary;
- active rotation identity, stable next step and next routine via `nextWorkout`;
- ordered active-cycle routine names via `rotationSequence`.

It performs four SELECT statements with no routine-entry detail or full history/set-row loading. The joined planning query returns the next routine and ordered routine-name sequence for only the active cycle; inactive saved rotations are excluded. Duplicate routine steps and configured order remain intact. Local day boundaries reuse the existing DST-aware helpers. `dailyFitnessState` defines priority: active, completed today (with optional next), next only, then empty. It never derives missed, overdue, late or skipped workout states. The compact Home refinement now consumes this source-owned contract for its Fitness box and expanded planning detail. Ordinary next-workout reads remain a single joined row.

Management batches definitions and steps and loads routine choices without routine exercises. Fitness only reads the active sequence for its Routines destination. Refresh publishes after successful reads and retains the last successful snapshot after failure.

## Validation and device review

Regression tests cover CRUD, one-step/repeated-routine cycles, activation, completion through real session paths, rest days, manual/free workouts, discard, safe edits, archival, rollback, restart, source priority, bounded reads, populated upgrades and migration retry. Mounted UI tests cover navigation, editor state, confirmations, next-workout refresh and real read failures.

Physical iPhone Expo Go review remains necessary: create/activate Push → Pull → Legs, complete/discard expected workouts, complete an unrelated routine, edit/reorder/set-next, switch rotations, restart, leave overnight, verify History, then inspect long names, large text, VoiceOver and light/dark appearance. No physical testing is claimed.

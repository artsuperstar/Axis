# Stage 13K: Fitness management and History

Fitness retains Workout, Routines, Exercises and History. The active inline logger and its subordinate editors are unchanged. All new presentation uses Calm Utility text roles, spacing, semantic light/dark colors and the existing measured contextual overlay.

## Workout and planning

An active session takes priority. Without one, an active rotation shows the next routine, rotation name and ordered sequence, with Start as the primary action. Another routine and an empty workout remain available. No completed-today query or decorative last-used metadata is added.

Routines separates the compact active rotation summary from Your routines. Manage/Set up still pushes `/fitness/rotations`. A routine row opens its editor, never starts implicitly. Its anchored menu offers the existing Start workout, Edit and Archive actions. Saved-rotation archive protection remains authoritative and reports its existing validation error. Archived routine rows open read-only details.

Rotation management uses an object tap for Edit and an anchored menu for activation, reset and delete. Existing confirmations and linked-session locks remain; locked menu actions are disabled. The shared ContextMenu accepts an optional per-action `disabled` flag. Rotation editor order, stable IDs, set-next, progression, rename and cancellation semantics are unchanged.

## Routine editor

Routine name and Exercises are distinct groups. Entries show order, name, measurement and current targets, with quiet Targets, Up, Down and Remove controls. Targets opens one entry's existing fields; drafts remain in parent state when those fields close or another entry opens. Add exercise follows the ordered entries; the empty state is No exercises yet. The existing richer exercise creation flow persists and appends the new exercise, then returns to the same routine draft. Save uses the same validation and persistence.

## Exercises

Name search remains unchanged. Active/Archived stays as the existing explicit library filter: archived management is a simple list, so a separate route would duplicate an already focused surface. Rows open read-only measurement/lifecycle details. Exercise editing is not introduced because the domain has no edit operation. Built-in status is explained in details; built-ins have no Archive menu. Active custom exercises expose confirmed Archive in the contextual menu. Existing routines and session snapshots retain archived references; new choices and new workout snapshots omit archived exercises.

## History

History groups summary rows by the local civil **completion** date: Today, Yesterday, or a full weekday/month/day label, including the year outside the current year. Cross-midnight sessions belong to their completion day. The source ordering remains completion descending, start descending and ID ascending. Multiple workouts per day remain separate. Rows show authoritative name, exercise count and set count. No inferred duration, full notes or additional rotation provenance lookup is added.

The existing 20-row keyset pages append through Load older workouts. Date groups are computed over the combined loaded summaries, so page boundaries do not repeat headers. Detail loads only on tap. The completed sheet shows completion and start timestamps, a dedicated workout-note section, exercise headings/notes and read-only set rows. Existing metric setLabel/durationLabel/distanceLabel formatting is retained; spoken labels reuse workoutSetPresentation.

## Refresh, accessibility and read boundaries

Refresh publishes all requested data together only on success. Prior lists, loaded History and captured editor drafts survive failures, Retry, resume and focus. Initial failures show recovery without false empty states. Routine and History destinations track successful initial reads independently. Returning to History re-reads authoritative summaries; leaving it retains the loaded view for recovery without querying History elsewhere.

Object rows expose button labels and opening hints. Menus retain measured screen-bound positioning, outside/Escape/Back dismissal, focus restoration and screen-blur cleanup. Selectors within native editors retain their existing modal host. Text wraps without truncation or fixed text heights, rows provide at least 44-point touch targets, and controls retain selected/expanded/disabled metadata. History set labels are spoken with their exercise and set number. Native assistive-technology behavior still needs device review.

`readRoutineSummaries` uses one count projection, including retained archived exercises in template counts, without child payloads. `readRoutine` loads one editor/detail. `readOverview(..., false)` skips the completed-History query outside History. Home, Calendar and Journal APIs are unchanged. No schema, migrations, dependencies or mutation logic changed.

## Measured structural results

Real SQLite fixture: 30 routines with 90 entries; 300 completed sessions, 1,200 session exercises and 9,600 sets. Statement totals include transaction boundaries where present; row totals count SQL result rows, not rows inspected internally by SQLite.

| Path | Previous API | Stage 13K API |
|---|---|---|
| Routine list | readRoutines: 4 statements / 120 rows | readRoutineSummaries: 1 / 30 |
| Overview outside History | readOverview: 6 / 52 | readOverview(20, false): 5 / 31 |
| One routine editor | On-demand detail | readRoutine: 4 / 4 |

These cover individual data calls, not the entire focus lifecycle. Overview still reads the modest exercise library and routine parent list. Routine count projections use existing relationship indexes. No cache or new index was introduced.

## Verification and device follow-up

Regression coverage includes compact rows and anchored menus, routine drafts/targets/reordering/creation, routine archive locks, exercise archive and built-in protections, retained snapshots, local completion grouping, three History pages, read-only detail formatting for all four measurements, failure recovery, narrow/large-text structure, both themes and targeted SQL reads. Existing active logger, rotations, F1/F4, Home, pagination, migration and integrity suites remain applicable.

Local React Native Web component previews at 390px light and 320px dark were visually reviewed; this is not physical-device validation. On iPhone Expo Go and Android, check native menu anchoring near screen edges, dismissal after scrolling, sheet keyboard behavior, routine target expansion/reorder, creation return, archived views, History paging/read-only details, long names, accessibility font sizes and VoiceOver/TalkBack. Start, finish and discard expected/unrelated rotation workouts and confirm progression remains correct. No broader visual redesign is included.

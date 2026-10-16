# Fitness Workout — Warm Editorial Hearth refinement

16 October 2026. Surface mode: **Operate**. Scope: Fitness → Workout, before and during a workout. Existing Routines, Exercises, History, routes and bottom-tab organization remain authoritative.

## Visual and interaction direction

The supplied launch mockup establishes an owned primary start region, clear routine choices, a quieter empty-start action and a warm editorial hierarchy. The active-workout reference establishes exercise-owned surfaces with an inset set table. This implementation keeps the approved v2 cream/charcoal surfaces, Lora for sparse high-level titles, Manrope for working UI, and the existing Fitness clay accent.

The screen does not copy the mockup's pounds, invented routine descriptions, exercise-name-based icons or unexplained header plus. Axis retains metric units, measurement-type icons, its existing navigation/actions and source-owned rotation rules.

## Landing / launch

- The primary card names the selected routine, shows its exercise count and identifies it as next in the active rotation when applicable.
- Selection defaults to an explicit user choice, otherwise the active rotation's next routine, otherwise the first active routine in existing source ordering. Archived choices are excluded. Selection alone never advances rotation or creates a workout.
- A preview of at most four routines allows direct radio selection. The next rotation routine is included even when it sorts later; selecting another row does not reorder this list. **View all** opens the existing Routines destination, where all templates remain available.
- **Start workout** starts the selected routine through the existing transactional start path. Selection resets after a successful start so the next post-workout suggestion follows the current rotation.
- The last completed workout is a bounded summary link opening the existing read-only detail. It does not load historical exercise/set detail until requested.
- **Start Empty Workout** remains available with lower visual emphasis. With no routines, the primary card offers the existing creation flow and explains the empty state.

Routine counts are projected in the existing overview query through one SQL count subquery, without loading routine entries or adding one statement per routine. Last-workout data uses a one-item History request (bounded lookahead remains internal to paging). No Home source APIs, Calendar projections, caches or broad snapshots were added.

## Active workout and exact set semantics

Each exercise owns its icon, name, targets, progress, **Set Complete**, notes/actions and secondary set table. A local progress wheel and explicit text expose the number of persisted sets against the planned count. At accessibility text sizes the wheel moves beside the progress summary so exercise names and targets have more width.

**Set Complete:**

1. Calls the existing `addSet` transaction with a fresh blank draft.
2. Inserts one unique set row at the next persisted position.
3. Stores `NULL` for weight, reps, duration and distance. It copies neither targets nor previous performance.
4. Refreshes from authoritative data; no optimistic counter or separate completion ledger exists.
5. Shows the new set number with em dashes for empty fields. Accessibility announces “Set complete. No performance details.”

A set row itself records that the set was completed. Missing performance is unknown, never zero. The user can supply any applicable details later, or clear them again without removing the completion. Supplied values retain the existing numeric precision, safe-integer bounds, positivity/nonnegative rules and rejection of irrelevant fields.

The anchored three-dots menu opens **Edit details** after dismissing its overlay. Tapping the row also preserves the existing edit entry point. Deletion remains confirmed in the editor and removes that set from progress. **Log set with details** is a quiet secondary path and retains previous-set defaults when the user explicitly chooses it.

Reaching planned sets marks the exercise complete; extra sets remain allowed and counted. The wheel caps at 100%, while text reports the actual count (for example, 4 of 3). An exercise without a set target shows a count, without inventing a percentage or declaring its plan complete. No workout auto-finishes.

Workout/exercise notes, add/remove exercise, confirmed discard/finish, sticky Finish Workout, one-active-session ownership, resume, read-only History and rotation provenance/progression remain intact. Refresh failures retain last known good content and mounted editor drafts; a committed insertion survives a failed refresh and becomes visible after Retry.

## Migration / integrity

The performance columns were already nullable, but `fitness_set_values_valid` required measurement values. New migration **0012_fitness_set_completion** rebuilds only the leaf `fitness_sets` table to relax those required-value checks. No columns, IDs, relationships, statuses or indexes are added or removed.

The generated migration was adjusted to run atomically with **foreign_keys ON** throughout. Existing rows, including soft-deleted rows and lifecycle timestamps, are copied verbatim. Foreign keys, measurement compatibility, active position uniqueness, integer limits, allowed fields and updated-time constraints remain enforced. Earlier migrations/snapshots are unchanged; Drizzle's new snapshot, journal and bundled migration entry are included.

Regression fixtures verify every table's stored records before/after upgrade, completed History and active sets/notes, migration idempotency, constraint/FK/index enforcement, restart of data access, and injected failure after dropping the old set table. Failed upgrade restores the old schema, rows and migration ledger; retry then succeeds. This is failure rollback, not a downgrade mechanism for new empty-set records.

## Skills that materially shaped this pass

| Skill | Adopted findings | Intentionally not adopted |
|---|---|---|
| frontend-design | Subject-specific hierarchy: one routine launch card, direct choices, exercise-owned groups, sparse editorial serif and practical working typography | Replacement palette/fonts, decorative imagery, generic dashboard metrics, unrelated surface redesign |
| Initialized Impeccable | Operate-mode continuity, meaningful surfaces, progressive detail, visible empty/error states, restrained state feedback, actual-component review | Page-load choreography, extra gradients/blur, layout transitions on workout rows, a new global design hierarchy |
| UI/UX Pro Max | Explicit progress, visible optional-field labels, appropriate numeric keyboards, Pressable feedback and adequate targets | Blindly adding hitSlop where full 48pt targets already exist; web-specific input/animation patterns |
| Expo native UI guidance | Existing safe-area/scroll ownership, native editor/keyboard flows, shared anchored menu, UI-thread transform feedback and Reduced Motion | Navigation replacement, new native dependencies/haptics or global entering/exiting/layout motion |

The scoped Impeccable detector returned `[]`; it is advisory, not native visual evidence. Motion is limited to existing press/insertion feedback and wheel rotation. Mount/resume does not animate every set, and no disclosure/layout-transition infrastructure is reused.

## Review captures and limitations

Generated with `scripts/preview-workout.ts` from the actual FitnessScreen/components and an in-memory SQLite fixture, with only hook/platform boundaries replaced. Source-backed routine, rotation, session, target and set data supplies the examples. These are **RN Web component captures**, not mockups or native screenshots; native tab/status chrome is not simulated. Large text is approximated in the browser and requires native confirmation.

| State | Light | Dark |
|---|---|---|
| Launch | [390px capture](previews/workout-v2/landing-light-390.png) | [390px capture](previews/workout-v2/landing-dark-390.png) |
| Active | [390px capture](previews/workout-v2/active-light-390.png) | [390px capture](previews/workout-v2/active-dark-390.png) |

Additional captures: [empty launch at 320px](previews/workout-v2/empty-light-320.png), [active large text at 320px](previews/workout-v2/large-active-light-320.png).

The review covered light/dark launch and active states, empty state, narrow width and large text. Automated browser measurements found no horizontal text overflow in the seven checked variants. The single correction batch moved the large-text exercise wheel out of the heading; confirmation retained complete labels and reachable scrolling content. Existing shared navigation wraps at large text sizes, taking more vertical space. No pixel or browser result is treated as physical acceptance.

## Tests and validation

Added **17 regressions** across data/migration and mounted UI. Coverage includes all four measurement types, empty and partial values, edit/clear/delete, rapid completion, actual counts beyond targets, persisted identity, failed writes, retry after committed writes, remount/resume, read-only History, empty launch/creation, direct routine selection, bounded preview, archived choices, rotation provenance, anchored edit menus, large text and Reduced Motion.

Existing tests were updated for optional field labels, direct routine choice, and quiet detailed logging. The rotation migration suite is pinned to its own migration head. Read-performance coverage now requires one count-only routine projection, with no child detail expansion or N+1 statements (the 30-routine overview still uses six statements). Existing reconciliation and integrity coverage remains intact.

| Validation | Result |
|---|---|
| TypeScript | Passed |
| Focused Fitness/component/rotation/migration/lifecycle/performance | **136/136 passed** |
| Full automated suite | **902/902 passed** |
| ESLint | Exact existing baseline: **6 errors / 2 warnings; zero new findings** (existing findings retain exit 1) |
| Drizzle migration validation | `db:check` passed |
| SQLite integrity / FK | `integrity_check = ok`; `foreign_key_check = []`; FK enforcement stays ON |
| iOS / Android export | Passed: `dist/fitness-workout-ios`, `dist/fitness-workout-android` |
| `git diff --check` | Passed |

## File inventory

Created:

- `src/features/fitness/components/workout-landing.tsx`
- `src/features/fitness/components/exercise-progress.tsx`
- `src/database/migrations/0012_fitness_set_completion.sql`
- `src/database/migrations/meta/0012_snapshot.json`
- `tests/fitness-set-completion.test.ts`
- `tests/workout-launch-experience.test.ts`
- `scripts/preview-workout.ts`
- This document and the six PNG captures in `docs/previews/workout-v2/`

Modified:

- Fitness: `fitness-screen.tsx`, `data.ts`, `form.ts`, `types.ts`, `use-fitness.ts`, `workout-presentation.ts`, `components/workout-content.tsx`, `components/fitness-forms.tsx`
- Database: `schema.ts`, `migrations/migrations.js`, `migrations/meta/_journal.json`
- Tests: `fitness.test.ts`, `fitness-components.test.ts`, `fitness-experience.test.ts`, `fitness-rotation-experience.test.ts`, `fitness-rotation-migration.test.ts`, `design-system-v2.test.ts`, `refresh-lifecycle.test.ts`, `read-performance.test.ts`
- `scripts/preview-design-system.ts` (fixture compatibility for the new last-workout summary)

No files removed, dependencies changed, commits created or pushes performed. Unrelated feature source, shared design tokens/navigation, Tasks and all earlier migrations are unchanged. Generated exports, logs, lint baselines and browser-render intermediates remain under ignored `dist`.

## Physical acceptance still required

On iPhone via Expo Go, and Android when available:

1. Start the suggested routine, select another, start empty and create the first routine. Confirm the full Routines destination and all four internal destinations remain available.
2. Tap Set Complete rapidly for Strength, Bodyweight, Duration and Distance. Confirm new numbers/empty values, wheel/text updates, and no keyboard or sheet on the default path.
3. Open each set's three-dots menu near screen edges and inside scroll content. Edit partial details, clear them, cancel and delete with confirmation. Verify focus and menu dismissal before the editor appears.
4. Exercise workout/exercise notes, add/remove exercise, background/resume and restart. Confirm only one active workout and no lost rows/drafts.
5. Finish/discard as before; inspect History with empty and populated sets. Confirm read-only detail, metric units, rotation advancement for the expected routine, and no advancement for unrelated starts/discard.
6. Check light/dark mode, VoiceOver/TalkBack, Reduced Motion, large accessibility sizes and narrow layouts. Scroll all groups and ensure Finish remains reachable without covering final content.

**Native success has not been claimed.** Exports validate bundling; automated state/data tests and component captures do not establish device gesture quality, focus, keyboard behavior or rendering performance.

## Workout v2.1 — Exercise Card Declutter

16 October 2026. Focused refinement of the approved Active Workout layout. This section supersedes the earlier description of quiet detailed-set logging; the landing state is unchanged.

### Removed visible actions and current hierarchy

Removed the exercise-card **Add/Edit note**, **Actions** and **Log set with details** buttons and their empty action-row/footer containers. No replacement action row or decoration fills that space. The card now reads: measurement icon/name/targets and progress → **Set Complete** → optional existing note and secondary set table. Existing token spacing separates the primary action from the inset table without reserving the removed controls' height.

One quiet header overflow is labeled **More actions for {exercise name}**. It contains:

- **Add note** / **Edit note**, opening the existing focused note editor.
- **Remove exercise from workout**, followed by the existing destructive confirmation.

The former exercise Actions sheet contained only removal. That capability is preserved directly in the menu; the intermediate sheet was removed. Workout-level notes, Workout actions/confirmed discard and sticky Finish remain unchanged.

Each set retains its distinct **Options for {exercise name}, set {number}** overflow with **Edit details**. Tapping a set row also retains editing. Clearing details remains available by saving empty fields, and deletion remains confirmed in the editor; these actions were not duplicated into the exercise menu.

### Completion-first ownership and preserved behavior

The alternate create-a-set editor branch and previous-set prefill path were intentionally removed from Active Workout. The editor now requires an existing captured set and only edits that row. **Set Complete is the only exercise-card path that creates a set**, with the same blank draft, persisted identity/order, null measurements, progress update and extra-set behavior as Workout v2. Existing data APIs, measurements, numeric validation, history snapshots and persistence are unchanged.

Exercise notes still display when present and persist through editing, refresh and remount. Set edit/clear/delete, notes drafts across failed reads, workout notes, finish/discard, resume, rotation provenance and read-only History retain their existing behavior. Schema, migrations, dependencies and landing/navigation are unchanged **relative to this refinement**; the previously implemented 0012 migration remains in the working tree.

### Accessibility and skill findings

- **frontend-design:** materially reduced competing actions and removed the footer as an independent visual stop. Preserved the approved card, typography, progress and one dominant action.
- **Initialized Impeccable:** applied its distill guidance to consolidate controls and remove obsolete code rather than hide it. Inspected the real component renders for spacing and hierarchy; no palette, font or surface redesign. The scoped detector returned `[]`, which is advisory.
- **UI/UX Pro Max:** reviewed distinguishable action ownership, visible progress feedback and destructive confirmation. The local lookup supported confirmation/feedback; it did not return a verified discoverability-specific match. Clear contextual labels and the single conventional header overflow are the applied design judgment. No extra toast or invented success animation was added.
- **Expo skills:** reused the existing cross-platform measured ContextMenu/selection host instead of an iOS-only toolbar implementation. The shared control retains button/expanded semantics, 48pt targets, outside/Back/Escape/focus dismissal and closes before opening a native editor. Existing note/detail keyboards, modal ownership and scroll containers remain intact. No layout animation or additional data read was added.

Exercise and set menu labels remain distinct, full titles can wrap and the large-text progress placement remains unchanged. The header menu is quiet without shrinking its touch target. Physical accessibility/focus and menu-placement acceptance is still required.

### Tests, review and scope

Added eight mounted regressions for all four measurement types, absence of the old visible buttons, exactly one primary action, distinct menu ownership, note edit/persistence/remount, confirmed removal, set edit/clear/delete and deletion-driven progress, extra sets, large text and Reduced Motion. Existing component, interaction and F1 draft tests now follow **Set Complete → existing row → Edit details**, including fresh empty values and stable identity. A shared test helper exercises these actual controls.

Updated the three active Workout review PNGs above from actual source-backed component renders. Light/dark and narrow large-text inspection confirms the removed action rows leave no empty footer; the seven checked render variants have no horizontal text overflow. These are RN Web captures, not physical iPhone evidence. Landing captures are preserved.

This pass modifies three production files: `workout-content.tsx`, `fitness-screen.tsx` and `fitness-forms.tsx`; four existing regression files (`fitness-components`, `fitness-experience`, `design-system-v2`, `refresh-lifecycle`); this record and three active review captures. It adds `tests/workout-declutter.test.ts` and `tests/helpers/workout-interactions.ts`. No production data/schema/migration/shared navigation files were changed by this pass. Pre-existing work is preserved; nothing staged, committed or pushed.

Validation: TypeScript passed; **96 focused tests passed**; **910/910 tests passed** in the complete suite with `tsx --test --test-concurrency=1 tests/*.test.ts` (none skipped); ESLint exactly matches the existing **6 errors / 2 warnings** baseline with zero new findings; iOS and Android exports passed (`dist/workout-declutter-ios`, `dist/workout-declutter-android`); `git diff --check` passed. The default concurrent full run hit the unchanged Earlier/Upcoming Tasks tests' real-time disclosure timeout; running all test files serially passed without changing Tasks code/tests or weakening assertions.

The saved-start scope comparison confirms **373 pre-existing files unchanged**, eleven existing files modified and two new test/helper files in this refinement. In particular, the prior schema/migration/data changes from Workout v2, dependencies, landing, rotation and shared navigation source remain unchanged relative to this pass.

Physical retest: open the exercise overflow near top/bottom screen edges, add/edit a note, cancel/confirm removal, then complete sets and edit/clear/delete their details. Check independent exercise/set labels with VoiceOver/TalkBack, large text and Reduced Motion, sticky Finish, resume and History. Do not accept native placement, keyboard behavior or smoothness from component captures alone.

## Workout v2.2 — Compact Active Workout Header

16 October 2026. This section supersedes the previous active-header composition only. Exercise cards, sets, landing, navigation and workout lifecycle remain unchanged.

### Composition and reference

The previous header stacked a 24px workout name, start-time metadata, an optional note and two visible action buttons. The new horizontal status surface contains a 44px semantic dumbbell tile, muted **Current Workout**, an 18px Lora workout name, **X of Y exercises**, and one quiet **More workout actions** overflow. Existing cream/charcoal surfaces and Fitness clay tokens remain authoritative.

The latest attachment directory contained the written brief only. Visual comparison used the previously approved compact Current Workout mockup in the conversation: contained icon on the left, small context label, restrained serif name and secondary progress. The reference's chevron is interpreted as the requested actionable overflow; no invented detail destination, play action, pounds or new artwork was introduced.

Source-backed RN Web/Chromium captures at 390px, normal text, in both themes measured:

| Measurement | Before | After |
|---|---:|---:|
| Header height | 140px | 86px |
| First exercise top | 322px | 268px |

The header is 54px shorter (39%); exercise content begins 54px sooner. Normal-text captures at 320/390/430 widths, long-name captures and simulated 2x text at 320 showed no horizontal text or page overflow. Large text grows the card instead of imposing the normal 86px height. Normal names may occupy two lines; at large text there is no line limit, and the full name is always the accessibility label. Existing internal navigation may wrap on narrow screens, independently of this header.

Updated review files: [light](previews/workout-v2/active-light-390.png), [dark](previews/workout-v2/active-dark-390.png), [large text](previews/workout-v2/large-active-light-320.png). `scripts/preview-workout.ts` renders the real FitnessScreen using SQLite-backed fixtures with OS/hook boundaries substituted. Browser captures omit native system chrome and are visual evidence, not physical-device acceptance.

### Progress and action ownership

- `workoutProgress` counts each current session exercise for which the existing `exerciseProgress(sets.length, targetSetCount).complete` is true. Y is the current session's exercise count. X counts exercises, never sets. Extra sets cannot count an exercise twice; an exercise without a planned target is not complete. Empty sessions show **0 of 0 exercises**. Existing detail reads already exclude removed exercises/deleted sets.
- The workout overflow contains exactly **Add workout note** (or **Edit workout note**) and **Discard workout**. The shared measured ContextMenu dismisses before invoking the existing note editor or native discard confirmation. The obsolete intermediate Workout actions sheet has been removed.
- Workout notes remain stored, editable, resumable and available in History. There is no active-header note preview, so a long note cannot enlarge the status surface. Exercise notes and set menus retain their existing ownership.
- Started time is removed from the active summary; stored timestamps and completed-workout History are unchanged.
- Sticky **Finish Workout** remains primary, outside scrolling content, with the same confirmation, persistence and rotation behavior.

### Skills and accessibility

- **frontend-design:** used the approved compact hierarchy, existing serif/body roles, a small contained semantic icon and one secondary affordance. No new palette, illustrations or exercise-card redesign.
- **Impeccable:** used initialized PRODUCT context, Operate mode, distillation guidance and the craft floor. The working status/action hierarchy was simplified and actual copy was inspected across themes and widths. The scoped detector returned no findings. No decorative motion was added.
- **UI/UX Pro Max:** the local progress-indicator guidance informed an explicit completion count; existing touch-target and destructive-confirmation guidance informed reuse of the shared menu and confirmed discard. Unrelated web/form suggestions were not applied.
- **Expo:** checked the installed SDK 57 documentation and native UI guidance; reused the existing cross-platform measured overlay and note modal rather than introducing an iOS-only toolbar API or another native dependency. Exports validate bundling, not native interaction.
- The workout name retains heading semantics and its full accessible name; the live count is announced as “X of Y exercises complete.” The overflow has an explicit workout-specific label, expanded state and the existing 48pt trigger/actions, outside/Back/Escape dismissal and focus behavior. Text wraps and card height grows at accessibility sizes. No new animation is introduced, including with Reduced Motion.

### Regression coverage and validation

Nine new regressions in `tests/workout-header.test.ts` cover mixed measurement types, target completion, extra sets, absent targets, empty counts, deletion/removal, immediate UI refresh, note editing, outside dismissal, confirmed/cancelled discard, unchanged sticky Finish, long names, Reduced Motion and 320/390/430 widths at normal/large text. Existing Fitness, rotation, refresh/draft and component tests now enter workout actions through the actual overflow.

- TypeScript: passed.
- Focused Fitness/Workout/design/menu/refresh tests: **182 passed**.
- Complete automated suite: **919 passed**, none skipped, using serial test-file execution to avoid the previously documented unrelated Tasks disclosure timer interference.
- ESLint: **6 pre-existing errors and 2 warnings**; exact file/rule/severity/message comparison matches the saved baseline, with no added or removed findings. ESLint exits nonzero for that existing baseline.
- iOS and Android production exports: passed (`dist/workout-header-ios`, `dist/workout-header-android`).
- `git diff --check`: passed.

No schema, migration, data-access, dependency, exercise-card, landing or shared-navigation changes were made in this pass. Earlier uncommitted Workout work, including migration 0012, remains in the worktree. Nothing was committed, pushed or staged.

Physical acceptance still needed: iPhone/Expo Go and Android menu placement, outside/Back dismissal, note keyboard/focus return, cancel/confirm discard, VoiceOver/TalkBack count/name/action announcements, accessibility font sizes, Reduced Motion, resume and sticky Finish. Browser text scaling is a simulation and cannot verify native Dynamic Type layout or animation smoothness.

## Workout v2.3 — Overall Workout Progress Ring

16 October 2026. This refinement adds an overall exercise-completion ring to the compact v2.2 status header. Landing, exercise-card composition, set data and actions, navigation, History and rotation remain unchanged.

### Authoritative progress and edge cases

`workoutProgress(session)` remains the single presentation computation for the text and overall ring. It counts exercises satisfying the existing `exerciseProgress(sets.length, targetSetCount).complete` rule:

- X is completed exercises; Y is the current session's exercise count.
- Fraction is X/Y when Y is positive; percentage is the rounded fraction times 100. Both remain zero for an empty session. Each exercise counts at most once, so extra sets never exceed 100%.
- Exercise rings still describe sets versus planned sets. The header ring describes exercises versus total exercises. The visible **X of Y exercises** label remains.
- With zero exercises, the header says **No exercises yet** and omits the ring entirely. There is no misleading 0/0 or implied completion.
- Targets are genuinely optional: routine planned-set fields may be blank, and `addSessionExercise` inserts manually added exercises without a planned set count. Such exercises stay in Y but never increase X, regardless of their logged set count. A workout containing one may therefore never reach 100%. No target is invented, and this does not prevent the user explicitly choosing Finish Workout.
- The existing session-detail read supplies current exercises/sets, excluding removals/deletions. Normal refresh, Retry, resume and remount recompute progress from that state. No additional SQL, persisted aggregate or progress cache was introduced.

### Placement and visual evidence

The overall wheel sits before the quiet workout overflow at the right of the existing icon/text row. It uses Fitness accent/soft-track tokens, a 3px stroke and a clean center with no number, glow or shadow. At full completion it becomes a continuous full ring; no celebration or automatic finishing occurs.

At ordinary widths it is 32px. Below 360pt or at accessibility font scale 1.5 and above, the right-hand ring/overflow stack and the ring becomes 28px. This keeps the original text-column width in constrained layouts and preserves the overflow's 48pt touch target. The noninteractive ring needs no separate touch target.

Measured source-backed RN Web/Chromium captures:

| Header | v2.2 height | v2.3 height |
|---|---:|---:|
| Light/dark, 390px, normal text | 86px | 86px |
| Light, 430px, normal text | 86px | 86px |
| Light, 320px, normal text | 86px | 100px |
| Long name, 320px | 110px | 110px |
| Simulated 2x text, 320px, both themes | 224px | 224px |

At 390px the first exercise still starts at 268px, unchanged from v2.2. The 320px fallback adds 14px to avoid compressing the name beside both controls. Captures showed no horizontal text/page overflow at the reviewed sizes. Long titles retain two visual lines at normal size, unlimited wrapping at large text, and their full accessible name.

Updated [light](previews/workout-v2/active-light-390.png), [dark](previews/workout-v2/active-dark-390.png) and [large text](previews/workout-v2/large-active-light-320.png) captures use the existing real FitnessScreen preview generator and SQLite-backed fixture. The overall ring shows **1 of 4 exercises**, while the first exercise separately shows **2 of 3 sets completed**, demonstrating the different progress levels. Browser captures substitute native boundaries and do not establish physical-device layout or motion acceptance.

### Shared drawing and motion

The component audit found two existing native-view rings: Tasks Today and ExerciseProgress. Both draw clockwise with clipped rotating semicircles. `CircularProgress` extracts ExerciseProgress's drawing and local Reanimated timing; both Fitness ring levels now reuse it. The exercise wrapper retains its original 52px size, 4px stroke, numeric/check center, colors and accessible set-level semantics. The primitive owns no business rules or accessibility labels.

Tasks Today remains untouched: it has its own task semantics and mount-animation policy. Migrating that feature is unnecessary for this scoped change. No new copy of the drawing algorithm was added for overall workouts, and no SVG dependency was needed.

Fraction changes use the existing selection duration/easing and UI-thread rotation transforms only. Initial/restored state is already at its correct fraction. Live Reduced Motion changes set the fraction immediately, cancelling ongoing timing. No per-frame React state, broad layout transitions, spring overshoot or pulse loops were introduced. Finish Workout remains independent, sticky and primary.

### Accessibility and skill findings

- The semantic wrapper is one progressbar labelled **Workout progress**, with a 0–100 value and text such as **2 of 4 exercises complete, 50 percent**. It uses polite live updates. The visible duplicate count and drawing are hidden from accessibility in nonempty workouts; the empty-state copy remains exposed. Workout title and overflow remain independently accessible.
- **frontend-design:** kept the existing compact hierarchy; chose a small, thin, empty-center ring beside the secondary menu rather than a larger metric or new surface. Existing Hearth typography, icon and Fitness colors remain.
- **Impeccable:** used the initialized product context, native adaptation guidance and craft floor. The spacing review preserved the 390px height and used stacking on constrained layouts. Light/dark, long-title and large-text captures were inspected together. Scoped detectors for header/primitive returned no findings.
- **UI/UX Pro Max:** the verified Feedback / Progress Indicators guidance informed explicit completion feedback. The text remains exact while the ring adds a visual fraction; zero exercises get intentional copy rather than a false completion state. Unrelated returned web/form guidance was not adopted.
- **Expo:** inspected the installed SDK 57 guidance, native animation skill and current accessibility/Reanimated APIs. Reused native Views and existing Reanimated 4 timing, with system Reduced Motion, instead of adding SVG or a new library. Navigation/safe areas were not restructured for generic skill examples. References: [Expo 57](https://docs.expo.dev/versions/v57.0.0/), [React Native accessibility](https://reactnative.dev/docs/0.86/accessibility), [Reanimated timing](https://docs.swmansion.com/react-native-reanimated/docs/animations/withTiming/).

### Tests, validation and scope

Six new `tests/workout-progress.test.ts` regressions cover all five quarter fractions, exact accessible values, extra sets, target loss after deletion, exercise membership, full completion without auto-finish, no-target manual exercises, empty sessions, persisted restore/remount, failed refresh/Retry, duplicate-announcement prevention and live Reduced Motion/timing. Existing v2.2 header tests now assert derived percentage fields and intentional empty copy; their width/long-name/large-text checks also run with the ring present.

- TypeScript: passed.
- Focused Fitness/Workout/menu/design/refresh/Today progress tests: **194 passed**.
- Full automated suite: **925 passed**, none skipped, using the previously established serial file execution.
- ESLint baseline comparison: identical **6 existing errors and 2 warnings**, with no added/removed file/rule/severity/message findings. The baseline still causes a nonzero lint exit.
- iOS and Android production exports: passed (`dist/workout-ring-ios`, `dist/workout-ring-android`).
- `git diff --check`: passed.

This pass changes no schema, migrations, dependencies, persistence/data-access, exercise-card layout, landing or navigation. Previous uncommitted work, including migration 0012, remains intact. Nothing was staged, committed or pushed.

Physical checks still needed: ring animation and clockwise fill on iPhone/Android, live Reduced Motion changes, VoiceOver/TalkBack value and update announcements without duplicate count reads, narrow/large-text layout, overflow anchoring/focus, note editing, confirmed discard, sticky Finish and background/resume. Browser captures and mocked native boundaries cannot prove these native behaviors.

## Workout v2.4 — Flexible Exercise Completion + Set Row Simplification

16 October 2026. This section supersedes v2.3's permanently incomplete targetless-exercise rule. It preserves the compact header, landing, navigation, targeted set completion, explicit Finish, measurement rules and existing editor/confirmation flows.

### Data-model audit

1. **Is planned set count nullable?** Yes. Routine targets are optional, and manually added session exercises have no planned count.
2. **Was there an explicit session-exercise completion field?** No. The existing completed timestamp belongs to the whole workout.
3. **Could targetless completion persist independently of sets?** No.
4. **Is a migration necessary?** Yes: one explicit boolean on the session-exercise snapshot.
5. **Does History preserve it?** Yes. The same field remains on completed session exercises, read-only with the rest of their snapshot.

### Dual completion rules and controls

`exerciseProgress` is still the authoritative rule, with a third argument for explicit manual state. A non-null planned count uses `sets.length >= targetSetCount`, regardless of the manual flag. A null planned count uses only `isManuallyComplete`. `workoutProgress` passes that state to the same helper, counting each complete exercise once and deriving its existing X/Y text, fraction and percentage.

- **Targeted:** retains its set ring, exact set count, primary **Set Complete**, extra sets and automatic reopening when set deletion takes it below target.
- **Targetless:** shows **No set target**, no set-target ring, and primary **Complete Exercise**. Completion works with zero sets. The completed state shows **Completed**, a check and a quiet **Completed · Reopen** action. Reopening preserves every set and performance value.
- **Targetless logging:** one quiet **+ Add set** action inside the sets surface uses the same existing blank-set insertion method. It remains available before/after manual completion. Targeted exercises have only Set Complete; a duplicate logging path is not introduced.
- Adding, editing, clearing or deleting sets never toggles a targetless exercise's manual flag. Removing an exercise changes the workout denominator through the existing current-session read.
- The overall ring can now reach 100% for mixed workouts. It still never finishes a workout automatically; sticky **Finish Workout** remains the explicit primary session action.

### Persistence and migration

`fitness_session_exercises.is_manually_complete` is a non-null boolean, default false, constrained to 0/1. The explicit setter accepts only a boolean and only a current targetless exercise in an editable session. It uses the existing immediate transaction and updates the child/parent lifecycle timestamps together. Repeating the same intent is a no-op. Removed/discarded/completed records remain protected by the existing edit guards.

Migration **0013_fitness_manual_completion** uses a single `ALTER TABLE ... ADD COLUMN` with the new column's named CHECK. Drizzle initially generated a parent-table rebuild for the added check; the new migration SQL was reduced to the equivalent additive column operation. Its generated snapshot/journal and runtime import are registered. Existing migrations and snapshots are unchanged. Foreign keys remain enabled; no table, relationship or historical data is rewritten.

All existing exercises, including old historical targetless ones, default to manually incomplete. No historical intent is invented. Idempotency is supplied by the normal migration ledger and atomic transaction, rather than rerunning the raw ADD COLUMN statement. Tests inject a failure after the column addition, verify schema/data/ledger rollback, then retry through the real migrator.

The field survives normal refresh/resume, closing/reopening a SQLite file, and saving a workout to History. Completed History detail adds one quiet targetless status line: **Exercise completed** or **Not marked complete**, alongside **No set target**. No History actions or broader layout were changed.

### Set rows and accessibility

Each logged set is now a single full-width pressable with no row overflow, replacement icon or nested interactive child. The removed overflow's spacer is gone from the column header, allowing values to use the available width. Row minimum height remains the shared 48pt touch target.

The accessible name retains the exercise, set number and recorded/missing performance details. The hint is **Opens set details. Delete is available in the editor.** Tapping anywhere opens the existing Set Details editor, which still owns editing, clearing and confirmed deletion. Duration clearing retains the existing requirement to clear both minutes and seconds fields. Exercise and workout overflows keep their original ownership.

Manual action labels identify the exercise and change from **Complete exercise …** to **Reopen exercise …**. Completion is also conveyed in text and a check, independent of color. The targetless state is distinct from targeted set progress; the overall progressbar keeps its existing semantic count/percentage. New state changes introduce no broad layout animation, and the shared ring continues honoring Reduced Motion.

### Visual review and skills

The existing source-backed preview fixture now contains two targeted and two targetless exercises. It demonstrates a targeted exercise below target, a targetless exercise with a logged set but still incomplete, and an explicitly completed targetless exercise. Its **2 of 4 exercises** header combines one automatic and one manual completion.

Updated [main light](previews/workout-v2/active-light-390.png), [main dark](previews/workout-v2/active-dark-390.png), [manual states light](previews/workout-v2/manual-states-light-390.png), [manual states dark](previews/workout-v2/manual-states-dark-390.png) and [large text](previews/workout-v2/large-active-light-320.png) captures render the real FitnessScreen with SQLite-backed fixtures and substituted native boundaries. At 390px, the header is still 86px and the first exercise starts at 268px. Normal 320/390/430 widths, long names and simulated 2x text showed no horizontal text/page overflow. Browser evidence is not physical-device acceptance.

- **frontend-design:** maintained the existing primary-action language for Complete Exercise, used a quieter completed/reopen state, and gave the freed row width to values. No header/landing redesign, new palette or decorative surface.
- **Impeccable:** used initialized product context, distillation guidance and the craft floor to remove duplicate set interactions while preserving functionality. Reviewed automatic versus manual states and theme captures together. Scoped detectors for WorkoutContent and History detail returned no findings.
- **UI/UX Pro Max:** verified success-feedback/checkmark and destructive-confirmation guidance informed the visible completed state and retained delete confirmation. Manual completion is immediately reversible through its visible action; details editing remains one whole-row interaction. Unrelated guidance was not adopted.
- **Expo:** reviewed SDK 57 SQLite/native interaction guidance and Drizzle/SQLite migration behavior. Used the existing native press, immediate transaction, migration ledger and Reduced Motion architecture. Verified real SQLite upgrade/restart/recovery rather than treating component state or exports as persistence evidence. References: [Expo SQLite](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/), [SQLite additive columns](https://www.sqlite.org/lang_altertable.html#alter_table_add_column), [Drizzle Expo migrations](https://orm.drizzle.team/docs/get-started/expo-new).

### Regression coverage

Seven new data/migration tests cover zero/many-set manual completion, idempotency, exact reopen retention, automatic target completion/loss, invalid/manual-targeted mutation rejection, transactional write rollback, deleted/completed guards, durable SQLite restart/History, genuine existing-data upgrade, integrity/FK checks, migration retry and schema/data/ledger recovery. The snapshot regression confirms that only the new column/check differ from 0012.

Eight new UI tests cover a two-targeted/two-targetless workout through 0–100%, reopen/target loss/removal, all four measurement editors' tap/edit/clear/confirmed-delete paths, full-row accessibility and absence of nested/overflow controls, committed manual state across failed refresh/Retry/resume/remount, read-only History, failed writes, large text and Reduced Motion.

Existing helpers now tap actual set rows and choose the single logging action for the exercise's mode. Earlier set/rotation/Journal migration suites remain pinned to their original migration under test; fixtures that use current Fitness APIs explicitly supply the later completion-column prerequisite. Genuine pre-0013 upgrade and recovery are tested separately without that prerequisite. No production Journal behavior was changed.

### Validation and physical acceptance

- TypeScript: passed.
- Focused Fitness/Workout/shared-menu/design/refresh/Today regressions: **209 passed**. The six affected historical Journal migration tests also passed separately.
- Full automated suite: **940 passed**, none skipped, using the established serial test-file execution.
- ESLint baseline: **6 existing errors and 2 warnings**, with identical file/rule/severity/message findings and no additions. Lint still exits nonzero for those pre-existing findings.
- Drizzle migration validation: passed. The first sandbox attempt hit `uv_os_get_passwd` ENOMEM; rerunning the same installed tooling with the required local permissions passed.
- SQLite `integrity_check`, `foreign_key_check` and foreign-key-enabled assertions: passed in the real SQLite migration/data fixtures, including after upgrade and injected-failure recovery.
- Genuine existing-data upgrade, repeated initialization, file close/reopen, mutation rollback and migration rollback/retry: passed.
- iOS/Android production exports: passed (`dist/workout-flexible-ios`, `dist/workout-flexible-android`).
- `git diff --check`: passed.

Physical acceptance still needed on iPhone/Expo Go and Android: upgrade an existing local database; complete/reopen a targetless exercise with zero and several sets; confirm that sets survive reopen and app restart; mix both completion modes through 100%; tap rows near their edges to edit/clear/cancel/confirm deletion; check screen-reader labels, large text and Reduced Motion. Header, workout/exercise menus, notes, sticky Finish, background/resume and saved History should retain their existing interactions. No physical-device testing was performed.

### Files changed in v2.4

New files:

- `src/database/migrations/0013_fitness_manual_completion.sql`
- `src/database/migrations/meta/0013_snapshot.json`
- `tests/fitness-manual-completion.test.ts`
- `tests/workout-flexible-completion.test.ts`
- `docs/previews/workout-v2/manual-states-light-390.png`
- `docs/previews/workout-v2/manual-states-dark-390.png`

Existing files modified:

- `src/database/schema.ts`
- `src/database/migrations/migrations.js`
- `src/database/migrations/meta/_journal.json`
- `src/features/fitness/data.ts`
- `src/features/fitness/fitness-screen.tsx`
- `src/features/fitness/workout-presentation.ts`
- `src/features/fitness/components/workout-content.tsx`
- `src/features/fitness/components/workout-sheet.tsx`
- `tests/design-system-v2.test.ts`
- `tests/fitness-components.test.ts`
- `tests/fitness-experience.test.ts`
- `tests/fitness-rotation-migration.test.ts`
- `tests/fitness-set-completion.test.ts`
- `tests/journal-migration.test.ts`
- `tests/workout-declutter.test.ts`
- `tests/workout-launch-experience.test.ts`
- `tests/workout-progress.test.ts`
- `tests/helpers/workout-interactions.ts`
- `scripts/preview-workout.ts`
- `docs/fitness-workout-v2.md`
- `docs/previews/workout-v2/active-light-390.png`
- `docs/previews/workout-v2/active-dark-390.png`
- `docs/previews/workout-v2/large-active-light-320.png`

No files were removed and no dependencies changed. The compact-header and shared-ring source, landing, other feature production code, and migrations/snapshots 0000–0012 remain unchanged relative to this pass. All prior uncommitted work remains in place. Nothing was staged, committed or pushed.

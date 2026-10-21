# Fitness Workout — Warm Editorial Hearth refinement

16 October 2026. Original surface mode: **Operate**. Original scope: Fitness → Workout, before and during a workout. Existing Routines, Exercises, History, routes and bottom-tab organization remain authoritative.

## History v2 — Workout Archive

21 October 2026. Surface mode: **Operate**. Scope: Fitness → History and its read-only completed-workout detail. The supplied dark mockup guides context → local date group → compact session summary → detail. Existing data, paging and native navigation remain authoritative.

### Existing History behavior audit (before implementation)

1. **Included states:** nondeleted sessions with `completedAt` set.
2. **Finished only:** yes; completion is the authoritative inclusion rule.
3. **Incomplete/discarded:** unfinished sessions remain outside History; Discard tombstones the session, also excluding it. No abandoned/missed outcome is invented.
4. **Ordering timestamp:** `completedAt` descending, then `startedAt` descending, then session ID ascending. Date grouping follows completion in the device's local calendar.
5. **Start stored:** `startedAt` is persisted.
6. **Finish stored:** `completedAt` is persisted by Finish.
7. **Displayed time decision:** show completion time, consistent with History ordering, date grouping, existing accessibility labels and detail's Completed timestamp. The compact row time is contextualized as Completed at, not reinterpreted as start time.
8. **Exercise count:** SQL counts live saved session-exercise snapshots, not the current routine's entries.
9. **Set count:** SQL counts live persisted sets joined to live session exercises. Planned targets are excluded; null performance values do not remove a persisted set from the count.
10. **Zero counts:** valid finished empty/free/routine sessions and zero-set workouts are retained; Finish does not require logged sets or fulfilled targets.
11. **Free workouts:** `routineId` is null and the saved session name is Free workout; they use the same History summary/detail model.
12. **Routine changes/archive:** historical name is saved on the session; routine edits/archive do not rename history. There is no new routine-delete behavior in this pass.
13. **Exercise archive:** detail reads saved session exercise names, measurement types and sets directly, retaining archived-source history.
14. **Paging:** first page is 20 summaries; Load older workouts fetches the next 20 through a completion/start/ID cursor, appending rows. Refresh retains the number already loaded. No whole-database History read is introduced.
15. **Row tap:** loads the selected saved session and opens the existing read-only AdaptiveModal/WorkoutSheet, within the Fitness destination. Home's completed-session entry remains supported independently of an active workout.
16. **Mutability:** completed sessions and their exercise/set/note changes are rejected by existing domain guards; History has no edit/delete/overflow actions.

### Implementation direction

Reuse the existing Fitness v2 shell, warm cream/charcoal foundations, plum/pink tiles, practical row typography and shared press feedback. One SectionList will own local-date sections, preserving summary-only paging. The group header and row/footer edges form one continuous date surface with compact internal session rows, rather than giant nested cards. Use the existing date/group/count helpers, saved session names and one generic dumbbell for every workout row. Completion time and a quiet noninteractive Completed indicator complement counts. At narrow/large text, metadata moves below the identity. Last-date counts are explicitly marked loaded while older pages remain available, since the current page can split a date.

### Implemented archive hierarchy and chronology

History stays inside Fitness, with the existing title, InternalNavigation, four destinations and native bottom-tab/safe-area ownership. The compact clock/Workout History introduction is followed by owned date groups. Each group has a decorative calendar tile, localized date heading and actual loaded session count; compact bordered session rows share that date surface. The prior mapped History/legacy object-row implementation and its unused styles/exports were removed after migration; ExerciseDetail and ArchivedRoutineDetail behavior remains intact.

`workoutHistoryGroups` remains authoritative for local completion-day grouping, including Today/Yesterday and locale-formatted older dates/year boundaries. Sessions are never sorted again in presentation: completion descending, start descending and ID ascending remain the source order. `workoutCompletionTime` formats the saved completion timestamp with locale-aware hour/minute formatting. Row announcements contextualize Completed at and include name/counts. Start time remains visible as Started in Detail; it is not substituted for completion in archive rows.

### Summary, status and detail ownership

Rows display saved session names, SQL-derived live session-exercise/set counts and one generic dumbbell icon, independent of routine names or exercise composition. Valid free, zero-exercise and zero-set workouts remain ordinary completed rows. Null performance values retain the persisted set count; planned targets never become logged-set totals. The quiet check/Completed indicator follows the reference and reinforces the validity of empty finished sessions; it is decorative/noninteractive within the single accessible detail button. Chevron and tiles do not introduce duplicate focus stops. There is no row overflow because History has no independent mutable actions.

The direct WorkoutSheet was still legacy. It now uses v2 AdaptiveSheet/RoutineHeader and a full-height virtualized exercise body, with owned timestamp/note/exercise groups. Header Back and the existing modal return behavior remain. The body reads the same saved SessionDetail, retaining exercise names/types, notes, set records and null values, manual targetless completion and session/routine/rotation provenance. Existing set display (`setLabel`) and spoken (`workoutSetPresentation`) formatting are retained. No current routine/exercise lookup reconstructs detail; no writable set/note/finish controls are introduced. This also applies to Home's existing completed-session entry. Refresh failure retains the mounted detail and snapshot through Retry.

The fixed detail header uses Workout details; the full historical session name is a prominent heading inside the scrollable summary. This prevents very long names at doubled text from consuming most of the fixed sheet viewport while preserving the complete saved identity.

### Paging and performance

One SectionList virtualizes summaries, using stable local-date keys/session IDs, eight-row initial/batch settings, a five-window range, dynamic heights and nonsticky group headers. Header/row/footer borders form the continuous group without wrapping all sessions in an unvirtualized parent. The existing manual Load older workouts action and 20-record cursor pages remain; section derivation merges appended records before rendering. A split date therefore grows under one header, without duplicates or skipped IDs. While older pages remain, the last date's count is labeled **N sessions loaded**; it is not presented as a whole-database daily total. Counts are derived and never persisted or fetched separately.

Main History reads stay summary-only; the full selected session loads only when opened. Detail virtualizes exercise groups and retains shared sheet scroll/ref integration; set views within one exercise remain read-only mapped snapshot rows. Already-loaded History remains in hook state according to the existing contract; this pass adds no caching/paging architecture and does not change refresh query behavior. Per-destination scroll offsets remain independent.

### Responsive, themes and accessibility

The supplied dark reference informs warm charcoal/plum surfaces; existing cream tokens provide the light equivalent. Dates/counts, names/summaries and time/status may stack at narrow or accessibility widths. Large text puts the identity before secondary metadata, with a decorative icon/chevron row above the full-width name. Rows have no fixed height/truncation. Locale-specific completion labels can wrap, including AM/PM. Review spans 320/390/430pt and simulated doubled text, with default locale and an explicit en-US time-format case.

Date groups expose meaningful header labels including session count; row buttons announce historical name, summary, contextual completion timestamp and read-only destination. Shared press/focus behavior, touch targets and Reduced Motion remain. No broad date/list layout animation is introduced. Loading, failed read and genuinely empty History remain distinct; the empty state uses No workouts yet / Completed workouts will appear here and no redundant Start CTA.

### Skill findings

- **frontend-design:** translated the mockup's date-owned archive hierarchy into compact session rows, preserving source content and existing Fitness shell instead of sample values or different navigation.
- **Impeccable:** reviewed nested-surface restraint, quiet completion status, chronology, type/metadata density, spacing and both themes. The single date surface owns restrained row boundaries; the bounded comparison led to tighter detail spacing and safe wrapping for localized time.
- **UI/UX Pro Max:** the initial chronology search had no match; the focused retry returned verified All-platform Date Formatting guidance. Existing locale-aware date semantics were retained rather than hardcoded English/ambiguous numeric grouping. Large-text priority, completion-time context, singular/plural counts and one clear read-only navigation action were reviewed.
- **Expo building-native-ui:** checked SDK 57/RN 0.86 SectionList guidance, stable section/item keys, finite render windows, incremental page append/group merging, dynamic heights, native safe areas, shared modal scrolling and Reduced Motion. References: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [SectionList](https://reactnative.dev/docs/0.86/sectionlist).

Captures and instrumentation boundaries are documented in [Fitness History v2 previews](previews/fitness-history-v2/README.md). No schema, migration, dependency, data-access or hook change was required. Prior uncommitted Exercises v2 work remains intact.

### History v2 validation

- TypeScript passed. ESLint baseline comparison retains exactly six existing errors/two warnings, with zero changed diagnostics; global lint remains nonzero for those existing errors.
- Seventeen new History regressions passed, including a UTC-started runner check for the local-midnight/year boundary. Focused History/Fitness/Exercises/Routines/Routine Editor/rotations/Workout coverage: **242 passed**.
- Final complete suite: **1,102 passed**, no failures, cancellations or skips. Final-source iOS/Android exports passed.
- `git diff --check` passed after removing an extra EOF blank line. Existing LF→CRLF working-copy notices remain informational.
- SQLite integrity/FK assertions in snapshot/archive regressions passed. Production schema, migrations, dependencies, data access and hooks were not modified.
- Browser captures report no runtime/text-overflow errors. First page: 20 summaries/20 mounted rows within the render window. After paging all 72 fixture summaries: 44 mounted rows at the measured position. The corrected long-name detail leaves a 635px scrollable viewport in the 320×844 doubled-text approximation. These are browser measurements, not native performance/device claims.
- No files removed, staged, committed or pushed. Previous Exercises v2 changes remain present.

## Exercises v2 — Exercise Library Management

21 October 2026. Surface mode: **Operate**. Scope: Fitness → Exercises and its direct New Exercise/read-only Detail surfaces. The supplied dark mockup guides creation → library controls → compact cards; existing Fitness navigation and all exercise data behavior remain authoritative.

### Existing exercise behavior audit (before implementation)

1. **Editing today:** no exercise-edit API or UI exists. Identity taps open read-only ExerciseDetail. No Edit action will be invented.
2. **Archive:** active custom exercises can be archived through their existing contextual Archive action and native confirmation.
3. **Restore:** unsupported; no Restore action will be added.
4. **Delete:** no separate exercise-delete capability exists.
5. **Soft deletion:** Archive sets `deletedAt`/`updatedAt` in the existing immediate transaction.
6. **Routine references:** retained, including their configured targets and position; archiving does not null/rewrite references.
7. **Historical workouts:** retain exercise-name/measurement snapshots and recorded sets.
8. **New routine membership:** archived exercises cannot be newly added; active exercise validation remains authoritative.
9. **Existing active routines:** may retain archived exercises. Editing retained entries preserves them; starting a new workout omits them.
10. **Started workouts:** an exercise archived after starting remains in that session; existing session snapshots/sets are unchanged.
11. **Measurement changes:** no post-creation editing/conversion capability exists. Creation chooses one of the four existing types.
12. **Built-in/custom distinction:** built-ins are viewable and cannot be archived; only active custom records have Archive. No unsupported ellipsis will appear merely to match the mockup.
13. **Uniqueness:** active names are unique across built-in/custom records and measurement types; archived-name reuse is allowed.
14. **Normalization:** persisted names trim outer whitespace, collapse whitespace and normalize NFC; identity compares locale-neutral lowercase without stripping accents. The transaction/race protection is unchanged. Library search has its own established case-insensitive, accent-sensitive substring behavior (`name.toLowerCase().includes(query.trim().toLowerCase())`); it does not use the richer routine picker's search helper.
15. **Row taps:** intentionally open details for active, built-in and archived records; the identity remains a labeled button, independently of Archive overflow.

### Implementation direction

Reuse the current Fitness v2 header/InternalNavigation and existing cream/charcoal, plum/pink, Lora/Manrope tokens. One prominent New exercise action sits above a single library-control group owning Active/Archived and full-width inline Search. Compact exercise cards sit outside that group. Sans names/metadata wrap, and semantic tiles depend exclusively on the existing `measurementIcons[measurementType]` mapping. No name-specific imagery, extra filters, empty menus, duplicate CTA or product capabilities are introduced. New uses the shared v2 creation editor; read-only Detail receives bounded v2 alignment rather than an invented Edit form.

### Implemented library and action ownership

`ExercisesContent` owns one FlatList and one control group; individual `ExerciseLibraryCard` groups are siblings outside the control group, not children of a giant library card. Cards use practical sans names, authoritative measurement summaries and the existing strength/dumbbell, bodyweight/activity, duration/timer, distance/route mapping. A custom exercise name cannot change its icon. The built-in Bench Press/Bicep Curl/Cycling/Deadlift fixture matches the reference's content hierarchy, while deliberately omitting the mockup's unsupported built-in overflow menus.

Identity taps retain read-only Detail, including active custom, built-in and archived records. Only an active custom record owns a measured contextual menu, containing the existing Archive action. Dismissal precedes the unchanged native confirmation. There is no Edit, Restore, Delete or active-row status badge. Archived rows remain viewable, use quieter surface/icon colors and explicitly announce/display Archived. The bodyweight summary retains the real **Reps · optional added weight** wording rather than losing optional added-weight semantics to match a shorter example.

The full-width inline search includes a decorative authored search glyph using the existing icon vocabulary, an accessible label, shared focus styling, native iOS clear control and Done dismissal. One memoized filter applies the original collection predicate and lowercased substring query without reordering, canonicalizing or stripping accents. It uses the loaded source array and adds no SQL reads per row. Active/Archived and query remain parent-owned across modal flows and destination switches. Empty Active, empty Archived and no-match states have separate text and retain only the existing New exercise CTA.

### Direct New/Detail alignment

New exercise now opts into the existing v2 `ExerciseEditor` path. The shared sheet retains its focus reveal, keyboard measurement, Back/cancel and save guard; its fixed header retains **Create**, the existing action name. Exercise owns Name; Measurement owns the four-option anchored selector and the existing unit explanation. Selecting a measurement type updates the semantic section icon. Shared v2 creation from the Routine picker reuses these same sections; the legacy Workout variant and its product flow are unchanged.

Measurement uses the existing practical `cardTitle` section-heading option in creation and Detail, avoiding a split word at doubled accessibility text while retaining header semantics.

No Edit flow exists, so none was added. The existing read-only `ExerciseDetail` is aligned with a v2 header and measurement section, retaining the exact built-in/custom/archived explanation and Back behavior. Detail intentionally contains no editable fields or save control. Initial/focus/resume refresh failure retains the existing snapshot and mounted creation draft through Retry, including its selected measurement type.

### List, responsive and keyboard behavior

The old mapped ScrollView branch is removed for Exercises. One FlatList uses stable exercise IDs, eight initial rows/eight-row batches, a five-window range, dynamic heights and no nested vertical ScrollView. Native iOS keyboard insets, handled taps, on-drag dismissal, Done dismissal and shared menu scroll locking/remeasurement are enabled. Opening read-only Detail dismisses the search keyboard. The existing native-tab/safe-area architecture remains; no bottom navigation or other Fitness destination is redesigned. Search/control/header state does not live in recycled rows. Per-destination scroll offsets remain independent.

320/390/430pt and simulated doubled-text captures cover wrapping, full-width search, large-text segmented/header adaptation and dynamic cards. At large text, identity stacks and overflow aligns toward the top of tall cards. Existing native shared focus and Reduced Motion behavior remain; no broad list-layout animation, dependency, cache or data-layer change was introduced. The data API still loads the library into memory; presentation virtualization does not claim SQL paging or reduced source-row loading.

### Skill findings

- **frontend-design:** used the supplied creation → owned library controls → compact sibling cards composition, preserving the current Fitness title/navigation rather than reproducing mockup shell differences. Sans working names maintain scanning density; high-level headings reuse established typography.
- **Impeccable:** reviewed light/dark surfaces, card density, archive readability, nested-group restraint, empty states and the reference side by side. The requested card ownership is intentional; no extra decorative layers or status pills were added. The bounded visual review identified and corrected large-text overflow placement.
- **UI/UX Pro Max:** verified the All-platform Focus States guidance and retained the shared visible focus styling. Reviewed search scope, Active/Archived selection, readable metadata, named contextual actions and native Archive safety. The Web-only Focus Not Obscured result was not claimed as verified native guidance; native keyboard behavior still needs physical testing.
- **Expo building-native-ui:** checked SDK 57/RN 0.86 docs, virtualized list ownership, stable keys, keyboard insets/dismissal, safe-area handling, shared anchored menus, native confirmation, dynamic text and Reduced Motion. Existing shared infrastructure is reused rather than adding a dependency. References: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [FlatList](https://reactnative.dev/docs/0.86/flatlist), [ScrollView](https://reactnative.dev/docs/0.86/scrollview).

See [Exercises v2 previews](previews/exercises-v2/README.md) for captures and browser/native boundary limitations. Schema, migrations, dependencies, persistence and hooks are unchanged.

### Exercises v2 validation

- TypeScript passed; ESLint retains exactly the baseline six errors/two warnings, with zero changed diagnostics.
- Eighteen new library regressions passed. Focused Exercises/Fitness/Routine Editor/Routines/Workout/rotation coverage: **225 passed**. Complete suite: **1,085 passed**, no failures, cancellations or skips.
- Final-source iOS and Android exports passed. `git diff --check` passed, with Git's LF→CRLF working-copy notices only.
- Archive regressions retain SQLite integrity/FK checks and passed; production database, migrations and data-access files were not modified.
- Browser captures report no runtime/text-overflow errors; all four type icons are verified. The 220-record fixture has 219 active exercises, of which **eight cards initially mounted**. The corrected Measurement heading remains one line in the simulated doubled-text creation review. Native performance and keyboard/accessibility behavior still require physical testing.
- No files were removed, staged, committed or pushed.

## Workout Rotations v2

21 October 2026. Surface mode: **Operate**. Scope: the existing pushed `/fitness/rotations` management route and its shared `/fitness/rotation` New/Edit editor. The supplied dark mockup governs composition; existing source behavior remains authoritative.

### Rotation behavior audit

1. **States:** saved rotations are Active or Inactive. Soft-deleted records disappear from management. There is no Paused state.
2. **Activation:** the existing Set active action performs an immediate transaction, validating the saved next step and deactivating the previous active rotation.
3. **Multiple saved rotations:** supported, including duplicate names and repeated routines with distinct step IDs.
4. **Multiple active rotations:** prohibited by both transaction logic and the existing unique database constraint; zero active rotations is valid.
5. **Edit:** the shared draft edits name, ordered steps and optional explicit next position. Existing step IDs and the saved pointer survive rename/reorder when retained. Removing the pointed step selects the next survivor in the previous cycle. Optimistic `updatedAt` conflict detection remains. A linked active workout permits renaming but locks sequence and next-position changes. Active state is managed by the existing overflow, not a new editor toggle.
6. **Delete:** requires the existing native confirmation, checks the linked-workout lock, deactivates and tombstones the rotation.
7. **Soft/hard deletion:** soft (`deletedAt`); no physical deletion was introduced.
8. **Workout/history impact:** completed sessions and their captured rotation/step provenance remain intact. Deleting a rotation does not delete workout/history records.
9. **Referenced routines:** unchanged by deleting a rotation. Saving requires active routines; archiving a routine referenced by any nondeleted saved rotation remains blocked.
10. **Archived references:** ordinary app operations cannot archive a referenced routine, including one referenced only by an inactive rotation. Management's existing join is preserved; no filtering or data repair was added.
11. **Next position:** the parent stores `nextStepId`; the ordered live steps store stable identities and positions. Each card resolves that exact saved pointer, including inactive rotations. The active pointer is the same one read by Workout/Routines planning. Missing pointers show an honest No next routine fallback, never a fabricated first step.
12. **Progression:** only successfully finishing the linked expected-next workout advances the pointer, in the same transaction as completion, wrapping around the ordered steps. Starting, discarding, unrelated routine workouts and empty workouts do not advance it.
13. **Manual progression:** existing Set as next workout in the editor and confirmed Reset rotation remain available, with linked-workout guards. Activation/deactivation retains saved progression.
14. **Confirmations:** Reset and Delete retain their native confirmation wording and Cancel paths. Activation, deactivation, draft reorder/remove and draft Cancel retain their existing behavior; no additional confirmation step was invented.

### Visual and interaction changes

The former plain header, detached green creation button and divider-led loose text are replaced by a circular Back control above a Lora heading and description, one plum/pink New rotation action, and bounded rotation-owned groups. Each group contains a generic repeat tile, a practical sans saved name, a compact text state badge, a quiet measured overflow, an internal divider, the authoritative Next line, and the saved sequence joined with arrows. Existing source ordering is retained even when it differs from the mockup. No bottom tabs or decorative botanical imagery were added to this pushed screen.

Only existing overflow actions appear: Edit, Set active/Deactivate, Reset rotation and Delete. Menus close before routing, confirmation or mutations; the shared host handles measurement, outside/Back dismissal and focus. Scrolling is locked while a menu is open and repositions during an in-flight scroll. Linked-session restrictions remain visible and disable the same actions. Identity taps still open Edit.

Empty management has a repeat icon, **No workout rotations yet.**, the requested explanation, and the single creation action already above it. Initial loading/read failure is distinct from an empty saved library. Failed refresh retains the last snapshot.

### New/Edit subflow audit and alignment

Both creation and editing immediately opened the same legacy form, making bounded shared alignment appropriate. Both remain pushed routes. The shared RoutineHeader supplies Cancel/title/Save, retained above scrolling; Rotation owns the required name field, followed by Routines, dynamic ordered routine cards and the existing anchored Add routine selector. Reorder arrows retain explicit accessible labels, Set as next workout exposes selection, and Remove remains a draft operation. The editor does not acquire activation fields or new rotation rules. The selector still receives active source routines only, allows repeated routine steps, and clears only its add choice after adding. No routines still directs the user to Fitness first.

The editor retains state outside recycled rows, its captured original version, validation errors, immediate transaction save and duplicate-save guard. Focus/resume/Retry cannot overwrite a dirty name, sequence or selected next position. Existing locked rename behavior is unchanged.

### Architecture, responsive behavior and accessibility

Management and editor each own one FlatList with stable rotation/step IDs, six initial rows, six-row batches, a five-window render range, dynamic heights and no enclosing ScrollView. The editor uses the existing FormScrollView as its native scroll component, preserving shared menu coordination and enabling automatic iOS keyboard insets. Android retains the app's existing keyboard resize behavior. No fixed card heights, text truncation or broad layout animations were introduced. Full saved definitions are still read by the existing management API; this pass virtualizes presentation, not persistence reads.

Review sizes are 320, 390 and 430pt, including simulated doubled text. Narrow titles use 32/42 base type instead of 36/46; accessibility scaling remains enabled. Identity stacks at large text, while overflow remains separately owned and touch-friendly. Names, Next and sequences wrap. New/Edit reuse the existing narrow/large-text header stacking. Icons are decorative; status and Next are included in the identity's accessible hint as well as visible text; named overflow actions identify their rotation. Shared button focus, disabled/selected semantics, 48pt minimum targets and Reduced Motion are retained.

Existing cream/charcoal, plum/pink, surface, border and typography tokens supply both themes. The Active badge uses brand emphasis and Inactive uses neutral emphasis, with text conveying state in either theme. No custom palette, dependency, schema, migration, data-access or hook change was needed.

### Skill findings

- **frontend-design:** translated the supplied screen-context → creation → owned-card hierarchy, preserving source ordering and using serif for screen/editor headings and sans for working names/controls.
- **Impeccable:** checked card ownership, nested-surface restraint, internal divider purpose, type density and both themes. The requested owned cards take precedence over generic advice against card-based scaffolding; no decorative gradients/shadows or page-wide layout animations were added. A narrow doubled-text title defect was corrected in the bounded review pass.
- **UI/UX Pro Max:** the verified All-platform Empty States guidance supports an explanatory empty state and one clear existing CTA. State labels, contextual action ownership and native destructive confirmation were reviewed explicitly. A Web-only live-badge result was not treated as native guidance or used to add competing live regions.
- **Expo building-native-ui:** checked SDK 57 and RN 0.86 documentation, bounded virtualization, stable keys/draft ownership, safe-area handling, the shared measured menus, native Alert confirmations, keyboard insets and large-text/Reduced Motion behavior. Existing shared cross-platform menus were retained instead of introducing an iOS-only menu implementation. Sources: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [RN FlatList](https://reactnative.dev/docs/0.86/flatlist), [RN ScrollView](https://reactnative.dev/docs/0.86/scrollview).

Review captures and their boundaries are documented in [Workout Rotations v2 previews](previews/workout-rotations-v2/README.md). Browser captures substitute native/data-hook boundaries and use fixtures generated through real SQLite/domain APIs; integration tests exercise real hooks and persistence. Native keyboard, VoiceOver/TalkBack, focus/Back transitions and Expo Go performance still require physical-device validation.

### Validation results

- TypeScript: passed.
- ESLint baseline comparison: exactly the same six existing errors and two existing warnings; zero changed diagnostics. Global lint retains its existing nonzero exit status.
- Focused Fitness/rotation/Routines/Routine Editor/Workout regressions: **207 passed**.
- Complete automated suite: **1,067 passed**, no failures, cancellations or skips.
- iOS and Android exports: passed.
- `git diff --check`: passed (Git emits the existing LF→CRLF working-copy notices).
- Browser checks: no text overflow/runtime errors in the recorded states; actual measured large-text action stays within its routine card; real selector → Add routine → Save draft payload passed. In a 103-rotation fixture, 12 cards were initially mounted. This is browser review instrumentation, not native performance/device testing.
- No schema, migration, dependency, data-access or hook changes. No files removed, staged, committed or pushed. Prior uncommitted work retained.

## Visual and interaction direction

The supplied launch mockup establishes an owned primary start region, clear routine choices, a quieter empty-start action and a warm editorial hierarchy. The active-workout reference establishes exercise-owned surfaces with an inset set table. This implementation keeps the approved v2 cream/charcoal surfaces, Lora for sparse high-level titles, Manrope for working UI, and the existing Fitness clay accent.

The screen does not copy the mockup's pounds, invented routine descriptions, exercise-name-based icons or unexplained header plus. Axis retains metric units, measurement-type icons, its existing navigation/actions and source-owned rotation rules.

## Routine Editor v2.1 — Add Exercise Picker

20 October 2026. Focused correction following physical iPhone feedback: the Routine Editor's header Add exercise action opened an anchored autocomplete sized relative to its compact trigger. With the keyboard open, the resulting narrow floating panel cramped names/search, obscured the draft and felt detached from the mobile editor. The physical report supersedes the earlier browser-only acceptance of that interaction.

### Architecture and selection

RoutineEditor now opens a dedicated full-width `RoutineExercisePicker` AdaptiveSheet inside the **existing native modal**. It replaces the editor's visible content temporarily; the RoutineEditor state remains mounted. No second native modal, anchored panel, nested ScrollView or new route is introduced. The main editor composition, Exercises library and Manage Rotation are unchanged.

The compact header names Add exercise, explains “Choose an exercise for this routine,” and offers Back to routine editor. There is no Save. The body has one fixed full-width v2 search field, one flexing virtualized result list and a fixed quiet Create new exercise action. Rows use practical sans-serif name/metadata text, a decorative semantic icon and a button action with an explicit add-and-return hint. They have no fixed heights or aggressive truncation.

Search still uses `exerciseResults`: identical canonical matching, active-only filtering, name ordering and creation eligibility. Its new optional limit leaves every existing autocomplete caller at the previous 20 results. The focused picker requests all available matches and virtualizes them, so users can browse past twenty without changing search identity/matching rules. Blank search shows available exercises in the established name order.

Result rows show the name plus the existing measurement label/detail formatter. The existing shared mapping remains exclusive: strength → dumbbell, bodyweight → activity, duration → timer, distance → route. Different names and user-created definitions never produce unique exercise artwork.

Tapping a row appends a fresh routine-entry draft, dismisses the keyboard, closes the picker and returns to the working routine. Deliberately selecting the same exercise on another opening creates a separate entry, as before. Name, original entry IDs/order, targets and unsaved changes remain in the parent draft; no routine write occurs until Save. Archived definitions are excluded from choices. Existing routine references and transactional Save semantics remain unchanged.

### Creation and Back behavior

Create new exercise opens the existing ExerciseEditor with bounded v2 styling and the current search text as its initial name. Empty search may open an empty creation form. Existing exact active-name/invalid-name eligibility remains respected through the shared helper, and persistence still validates the submitted definition. Successful creation persists the definition once, appends it and returns to the routine. Canceling creation returns to the picker with its query intact; closing the picker then returns to the intact routine. No-match searches say “No exercises found” and keep the creation path available.

AdaptiveModal gains an **opt-in** `useModalBackHandler` registration for nested surfaces. Anchored controls retain first dismissal priority (for example, the creation form's measurement selector), then native Back/outside/accessibility escape returns one picker/creation step, before the parent routine can close. Main-editor Back still discards its unsaved routine. Other callers do not register an override and keep their prior dismissal path. After picker dismissal/selection, focus returns to the mounted Add exercise trigger through the existing shared focus helper.

### Keyboard, scrolling and accessibility

AdaptiveSheet retains its existing native keyboard frame, viewport-origin, safe-area and focused-input handling. The picker uses its available height above the keyboard. Search and Create sit outside the scrolling results; the result list flexes to the remaining space instead of a tiny fixed-height container. Keyboard Done dismisses via the existing Keyboard API; rows use handled taps so selection works without a preliminary dismissal tap, and drag dismissal is enabled. No new keyboard offsets or device-specific coordinates are added to production code.

The single FlatList uses stable exercise IDs, initial/batch size 8 and window size 5. It reuses RoutineScrollView's composed ref, so both VirtualizedList and the shared sheet receive the same native scroll handle. Draft state lives outside recycled rows. No new broad animation is used; existing press feedback respects Reduced Motion.

FormField gains optional `showLabel=false` for this search: its accessible label remains Search exercises, while the placeholder provides the visible prompt without duplicating a label above the input. Other fields retain their default visible labels. Decorative icons remain hidden from accessibility. Row labels include name/type/measurement and their hint explains selection. Back/Create are explicitly labeled. Large text wraps naturally; search/footer remain fixed and results remain scrollable. Native large text plus a keyboard may show fewer rows, and users can dismiss the keyboard to recover space.

### Skills and review evidence

- **frontend-design:** replaced the trigger-sized desktop composition with a single owned mobile surface, fixed search and quiet creation footer; rows retain compact name/measurement hierarchy.
- **Impeccable:** the physical width/keyboard failure overrode prior browser acceptance. Removed the obsolete autocomplete action-trigger option, avoided stacked floating surfaces and kept the parent editor unchanged. Checked paired themes and narrow/large-text layouts in one visual review.
- **UI/UX Pro Max:** reviewed clear search, no-match recovery, result actions, duplicate/archival semantics and accessible names. Its focused searches returned web-scoped guidance, so native keyboard behavior follows Expo/RN documentation and the existing app infrastructure rather than desktop autocomplete recommendations.
- **Expo Skills:** guided the single-modal replacement surface, opt-in nested Back handling, shared keyboard/safe-area measurements, flexible result list, native handled taps and drag dismissal. Matching Expo SDK 57 and React Native 0.86 Keyboard/ScrollView/FlatList documentation was checked.

See [actual-source captures and simulation limits](previews/routine-picker-v2-1/README.md). Normal-text simulated keyboard captures at 320/390/430 show 3–4 fully visible result rows; doubled text retains a scrolling area with Create visible. Actual iPhone keyboard acceptance has not been performed.

### v2.1 validation

Added **11 focused picker regressions** covering both themes, useful initial results, no anchored autocomplete/Save, search and canonical ordering, archived exclusion, no matches and creation eligibility, measurement icons/row announcements, selection/duplicates, name/order/targets and entry-ID retention, nested native Back/outside dismissal, creation seeding/cancel/success, failed-refresh/Retry draft protection, keyboard Done callback, large text and 100-result virtualization beyond the prior short-list cap. Existing routine component/management/editor tests now interact with the focused picker instead of invoking the obsolete autocomplete callbacks.

TypeScript passed. ESLint exactly matches the starting **6 errors / 2 warnings**, with no new diagnostics. **243 focused regressions passed**, including Routine Editor, picker, Routines, Workout and shared controls; the complete serial suite passed **1,057/1,057** with no failures, cancellations or skips. The final 11 picker cases also passed independently after strengthening Done-callback coverage. iOS and Android exports passed to `dist/routine-picker-ios` and `dist/routine-picker-android`. `git diff --check` passed. Schema, migrations, dependency manifests and persistence/data-layer files are unchanged. The optional result limit is a presentation helper change, not a search identity or database change.

Browser interaction review passed real source search, scrolling to the last of 160 matches, keyboard dismissal with simulated native frame events, selection, intact name/targets, focus restoration, Escape to the parent, creation/cancellation/return and Save payload. It mounted 11 result rows initially and 27 near the end; the results viewport grew from 322 to 622 points when the simulated keyboard hid. Browser/data-hook substitutions and the lack of physical-device testing are documented with the captures. Nothing was staged, committed or pushed; prior uncommitted work remains intact.

## Routine Editor v2

The v2.1 section above supersedes the original anchored Add exercise interaction described in this foundation record.

20 October 2026. Scope: New routine and Edit routine, their direct exercise/target subflows, and the existing archived read-only routine surface. The supplied dark Routine Editor image controls visual composition; domain behavior takes precedence. The Routines library and Manage Rotation are not redesigned here.

### Existing routine editor behavior audit

1. **Add:** a shared exercise autocomplete searches available exercises. Selecting appends a draft entry; its richer Create flow persists the exercise definition, then appends it and returns to the intact routine draft.
2. **Archived choices:** `exerciseResults` excludes archived exercises; append also checks the current source. Persistence rejects newly assigned archived exercise references.
3. **Targets:** Targets toggles inline fields for one stable entry key. Changes remain in the routine draft, with no independent Apply/Save transaction or new navigation destination.
4. **Target fields:** every type has optional planned sets (1–100). Strength/bodyweight add minimum/maximum reps; duration adds minutes/seconds; distance adds distance plus m/km. Distance targets have no duration field. Blank targets remain unset; unit conversion and validation use the existing exact model.
5. **Remove:** immediate draft removal, without confirmation. Persistence changes only when Save succeeds.
6. **Order:** array order becomes zero-based persisted `position`. Existing IDs survive reorder. The existing immediate transaction temporarily offsets retained positions before writing the final order, preserving uniqueness.
7. **Repeated exercises:** allowed as separate routine entries, each with its own identity and targets. No deduplication was introduced.
8. **Later exercise archival:** retained routine references and names remain visible, with the existing archived/omitted-from-new-workouts explanation. New workout creation continues to omit archived definitions; previous session snapshots remain intact.
9. **Save:** `saveRoutine` is an immediate SQLite transaction. Routine identity, membership, targets, ordering and soft removals commit together or roll back together. No data-layer changes were needed.
10. **Validation:** normalized name must be 1–120 characters, and cannot duplicate another active routine under existing canonical identity rules. Invalid/mismatched/reused entry IDs, newly assigned archived exercises, invalid measurement/target fields, non-positive or unsafe quantities, set counts above 100, invalid rep ranges, seconds above 59 and invalid distances can block Save. Empty routines are allowed. Existing domain and race protections remain authoritative.
11. **Unsaved return:** Cancel/icon Back, native modal Back and outside dismissal discard the unsaved routine. Cancel from richer exercise creation returns to the working routine. A successfully created exercise definition remains persisted independently even if the routine is subsequently canceled, as before. Focus/resume refresh failures and Retry preserve the working routine draft.
12. **Read-only:** archived routines use the existing separate read-only entry point. It now shares v2 composition rendering, with no name input, Save, Add, Targets, reorder, Remove or Start controls. Archive restrictions involving saved rotations remain unchanged.

### Composition and shared architecture

Both New/Edit still use one `RoutineEditor`; title alone distinguishes their visual entry state. `RoutineHeader` provides a visible arrow + Cancel action, compact Lora title and pink/plum Save. At 320 widths or large text the title and action row separate. The archived read-only surface retains an icon Back control. Save errors stay beneath this fixed header, visible even when the list is scrolled.

`EditorSection` owns Routine identity and its required, full-width v2 input. The continuous Exercises group owns its factual exercise count and header Add exercise action. It deliberately does not claim uniform planned sets. Empty New routines show one compact empty state without a duplicate CTA.

`RoutineComposition` is a Fitness-specific rendering component, not a new domain abstraction. Each compact exercise card owns its current numbered name, established measurement icon, shared measurement labels, shared `targetLabel` summary, visible Targets, icon reorder controls and quiet destructive Remove. Long titles and metadata wrap. The mockup's extra overflow is omitted because the existing editor has no distinct additional actions.

### Updated reference and semantic icon rule

The updated reference explicitly shows arrow + Cancel, a generic Routine/Fitness icon and an Exercises/list icon. Those details now use the existing shared controls and icon vocabulary. The lower Search exercises surface in the image is not duplicated: the header Add exercise action already opens the same search/creation flow. Reorder remains icon-only, as the brief requires, despite the image's Up/Down text.

Exercise artwork depends exclusively on the persisted measurement type, through the existing `measurementIcons` map shared with Active Workout: strength → dumbbell; bodyweight → activity; duration → timer; distance → route. **There are no exercise-name-specific icons.** Bicep Curl, Pull-down, Inclined Row and Row all use the same strength icon. A custom name never creates a new visual identity or overrides its measurement icon. The Routine heading uses a generic dumbbell and the Exercises heading a list; neither derives from a routine/exercise name.

The refreshed normal preview uses the four Strength examples from the new image. Mixed previews contain a built-in/custom pair for each measurement type, with a second scrolled capture covering the duration/distance pairs. New light/dark integration regressions inspect the actual icon inside each card and use intentionally misleading custom names to ensure name text cannot affect type selection. They also verify one Add exercise entry point and no redundant overflow.

Targets stays inline and receives v2 field/segmented styling. The shared autocomplete gains optional v2 appearance and an action-style trigger; the feature still owns search, active-choice filtering, selection, creation and persistence. Richer ExerciseEditor creation receives optional v2 styling only in this routine flow. Other callers keep their established appearance.

Shared `FormButton`/`UiButton` gain optional compact horizontal padding for composition controls, retaining the 48-point touch minimum. `UiIcon` adds authored up/down/target/trash symbols in its existing outline vocabulary. No new icon dependency or palette is introduced. EditorSection omits empty description space; existing described sections retain their layout.

### List, keyboard and responsive behavior

The previous mapped ScrollView is replaced by one FlatList with stable draft/persisted keys, initial/batch size 5 and window size 5. No fixed item heights or broad list-layout animations are used. Routine/target drafts and expanded-entry identity live outside recycled cards. The editor must load its actual composition for editing; virtualization bounds mounted UI, not the authoritative membership array.

AdaptiveSheet gains optional `scrollBody` and `fillHeight`. Its default scroll/sizing path stays intact. The editor supplies a stable component element containing its FlatList, rather than nesting it inside a ScrollView or using a new component type on every draft update. A composed scroll ref forwards both VirtualizedList measurement and AdaptiveSheet focused-input reveal to the same shared FormScrollView. Native viewport/keyboard handling, menu scroll locking, repositioning and modal layering remain shared. Pinning this list sheet to available height avoids resizing as virtualized height estimates change.

Reviewed at 320, 390 and 430 widths and simulated doubled text. Add exercise stacks under the section heading on narrow/large-text layouts; card actions wrap naturally. Large text gives titles the full card width. Save remains in the fixed header. Font scaling is not capped; cards have no fixed heights. Light cream and warm charcoal use existing v2 semantic surfaces/borders and brand plum/pink. Existing press feedback respects Reduced Motion; no reorder animation was added.

Accessibility retains the required name label, explicit Add exercise label, numbered exercise headings and readable measurement/target text. Targets announces its exercise and expanded state. Reorder arrows announce their exercise and disabled boundary state; Remove announces which exercise leaves the routine. Read-only wording is explicit and decorative icons do not add announcements.

### Skill findings and review

- **frontend-design:** the reference's identity → composition → per-exercise actions hierarchy drove the two owned groups, restrained serif headings and compact card structure. Real actions replace fictional mockup overflow.
- **Impeccable:** the Operate guidance kept domain/navigation truth intact. The visual review checked nested-surface ownership, action density, quiet destructive treatment, spacing, wrapping and paired themes. One inspection/correction and one confirmation pass were used; no decorative motion or broader redesign was added.
- **UI/UX Pro Max:** the verified `icons` result `icon-context-accessibility` guided hidden decorative icons and explicit labels/state on icon-only controls. Existing Axis icons were reused instead of adopting the dataset's library suggestions. The review also kept Targets visible and the empty state/action singular.
- **Expo Skills:** the installed building-native-ui guidance and matching Expo SDK 57 / React Native 0.86 documentation informed the single bounded list, preserved modal/keyboard infrastructure, merged scroll ref, native press targets and responsive action rows. The user/repository's established editor architecture takes precedence over generic skill preferences.

See [review captures and limitations](previews/routine-editor-v2/README.md). Browser fixtures come from migrated SQLite, while the browser substitutes native/data-hook boundaries. Integration tests exercise real SQLite. Native physical-device testing has not been performed.

### Tests and validation

Added 15 Routine Editor regressions covering New/Edit, required name, factual counts and all measurement/target summaries, target validation/persistence, reordered IDs/targets and boundaries, active choices, richer creation, repeated exercises, immediate Remove, Save, nested Cancel, native Back, archived/read-only states, 80-entry compositions, long names and responsive/font-scale cases. This includes two theme-specific regressions proving built-in/custom exercises of the same type reuse exactly the same semantic icon, independent of misleading name text. Existing Fitness component coverage reads the editor's scroll-body slot; the Routines refresh regression distinguishes the retained library list from the editor's second list. Existing failed-refresh/Retry draft-identity tests remain active.

Validation after the updated reference/icon correction: TypeScript passed; **232 focused** Routine Editor/Routines/Workout/shared-form tests passed; the complete serial suite passed **1,046/1,046**, with no failures, cancellations or skips. ESLint exactly matches the starting **6 errors / 2 warnings** by file, rule, severity and message; there are no new findings. iOS and Android exports passed to `dist/routine-editor-v2-icons-ios` and `dist/routine-editor-v2-icons-android`. `git diff --check` passed. Schema, migrations, dependencies and persistence/data APIs are unchanged. Nothing was staged, committed or pushed; prior uncommitted work was preserved.

Initial Windows runs encountered worker initialization and memory allocation failures. An obsolete test also compared the library list DOM object against the newly introduced editor list; it now asserts the actual invariant that the original library list remains mounted. The final serial suite passed. Esbuild's existing `ESBUILD_WORKER_THREADS=0` fallback was used; no dependencies or assertions were weakened.

Physical follow-up: iPhone Expo Go and Android keyboard reveal/dismissal in the name/target fields; picker and nested creation layering; Back/Cancel behavior; VoiceOver/TalkBack labels and disabled reorder controls; native large text in both themes; and scrolling/reordering a long routine. No unrelated screen redesign is recommended by this pass.

## Routines v2 — Rotation and Routine Management

### Existing routine behavior audit (before implementation)

1. **Open/edit:** the active routine identity/details area opens the existing RoutineEditor after a targeted `readRoutine(id)`; overflow Edit opens that same editor.
2. **Archive:** active routines offer confirmed Archive through their anchored overflow.
3. **Restore:** no restore action or data API exists. Archived routines are read-only; this stage must not invent restoration.
4. **Delete:** there is no separate routine deletion action or data API. The legitimate removal capability is Archive.
5. **Storage:** Archive soft-deletes the routine by setting `deletedAt` and advancing `updatedAt`. It does not physically remove it.
6. **Rotation references:** archiving is rejected while a routine belongs to any non-deleted saved rotation, including an inactive rotation. Users must remove those references or delete the saved rotation through existing management first. References are not silently rewritten.
7. **History:** completed sessions retain their own routine/session/exercise snapshots and references after archival; existing History remains intact and read-only.
8. **Start:** archived routines cannot start workouts. Their list has no Start/Edit/Archive menu; tapping identity opens existing read-only detail. Active routine Start retains the current in-progress-workout guard.
9. **Counts:** `readRoutineSummaries` counts non-deleted routine-exercise associations in SQL. Archived exercise references can still contribute to the template count; starting a workout continues to omit archived exercises. `workoutCounts` owns singular/plural wording.
10. **Ordering:** library summaries retain the source name-then-ID order. Saved rotation step order is independently meaningful and must remain unchanged. The sequence uses source `readActiveSteps` names in order, joined with the existing arrow presentation.
11. **Row tap:** tapping routine identity already opens its editor/read-only detail; overflow separately owns contextual actions. This intentional existing pattern remains.

Rotation state audit: no active/valid next plan currently produces No active rotation plus Set up rotation, linking to `/fitness/rotations`. A rotation cannot be saved without at least one routine or activated without a next step. `readNext` returns null for invalid/missing/deleted next references. The Routines presentation does not invent a next routine or switch to a fallback plan. The previous library fully rendered mapped rows inside the destination ScrollView; this stage may introduce a single virtualized list while retaining source-owned reads and ordering.

### Routines composition and visual reference

The supplied current iPhone screenshot and target establish the replacement hierarchy: Fitness header/navigation → owned Workout rotation card → Your routines with adjacent New routine → Active/Archived selector → compact routine cards. The previous loose headings/text, detached creation control, legacy green selector and divider-led rows are removed from this destination. The real FitnessScreen now reuses the same serif Fitness title, warm v2 canvas and InternalNavigation already available on Workout. Four destinations, module-entry behavior, remembered per-destination scroll offsets and bottom-tab navigation remain unchanged.

The rotation card contains an outline repeat tile, restrained serif heading, actual rotation name, the existing ordered source names joined by the existing arrow presentation, a highlighted Next line and one full-width gear/chevron management row. The next name comes only from the authoritative `readNext` result. No active plan retains No active rotation and Set up rotation. Both management labels open the existing `/fitness/rotations` route. No inline rotation editor, new fallback routine, extra rotation action or creation semantic is introduced.

Your routines introduces the source-owned library. Its compact primary New routine action remains beside the heading where space permits and stacks below it at narrower/large-text sizes. It opens the unchanged RoutineEditor. Successful saves refresh existing source summaries; there is no inline creation form or optimistic library ledger. While Archived is selected, creation retains the existing filter semantics rather than silently switching views.

The shared SegmentedControl gained an optional v2 appearance, optional hidden visible label (the accessible group label remains Routines), and optional decorative option icons. Existing consumers keep their legacy defaults. V2 options expose radio roles and checked/disabled states, selected checkmarks, an outlined/tinted selection and shared focus/press feedback. At large font scales, the two options stack into full-width rows so Archived does not break into a narrow letter column. There is no custom feature-specific selector.

Routine cards reuse GroupSurface, dumbbell UiIcon tiles, practical UiText and a clearly labeled identity button. The existing identity tap opens the editor or archived read-only detail; it is deliberately retained alongside overflow Edit because it was already the product pattern. The outer card is not one ambiguous button. Titles wrap, exercise counts use `workoutCounts`, and no invented descriptions such as upper body are added. At 390 points the three active fixture cards measured 358 × 76; these are fixture measurements, not fixed heights. Long and accessibility-sized names expand naturally.

Active cards retain exactly Start workout, Edit and confirmed Archive in their existing shared anchored ContextMenu. Archived cards use the same structure with a muted icon, readable name/count and read-only detail hint. They have no overflow because no archived contextual action exists. No Restore/Delete capability is implied or invented. Archiving a routine referenced by a saved rotation still reports the existing error instead of changing its references. Starting a workout still uses the existing in-progress guard, session snapshots and rotation-provenance rules.

The mockup's plum/pink areas use current v2 brand/selected tokens on this destination, consistent with Fitness internal navigation. Warm canvas/group/border values and typography remain inherited. Workout's existing accent/token usage and all global palettes are unchanged. The mockup's navigation icons, bottom tab artwork and blue floating development control are not copied: the established InternalNavigation and real app shell remain authoritative. No decorative image, gradient backdrop or new dependency is introduced.

### Virtualization, responsive behavior and accessibility

Routines now owns one FlatList rather than a mapped collection inside FormScrollView. The rotation/library/selector area is its ListHeaderComponent; there is no nested scroll body. Stable routine IDs, initialNumToRender 8, maxToRenderPerBatch 8 and windowSize 5 bound mounted content without truncating the library. Variable-height cards do not use fixed getItemLayout. The source counts-only `readRoutineSummaries` API remains unchanged and loads no per-routine exercise detail until the user opens it.

The 123-active-routine browser fixture mounted 8 cards initially and 45 after scrolling, with no duplicate mounted IDs. This measures React Native Web mounting, not native device frame rate. Existing read-path growth tests still verify that routine summaries avoid child payloads. The full library remains available; no arbitrary data limit or new paging contract is added.

The shared overlay host remains outside recycled cards. Scrolling locks while a menu is open, and normal scroll callbacks remeasure the existing anchor. Menu actions close before native Archive confirmation, editor presentation or starting a workout. Existing outside/Back/escape dismissal and focus handling remain source-owned. The existing screen applies safe areas once for this destination. No new list layout choreography or insertion animation is added; shared press/selection/menu feedback retains Reduced Motion behavior.

Reviewed widths are 320, 390 and 430 points, with doubled-text 320 and a scrolled library capture. Rotation sequence and Next values wrap. New routine stacks under its heading when needed. At large text, routine icon/overflow occupy their own row above full-width identity text, while Active/Archived stack and preserve full labels. No single-line truncation or accessibility font cap is introduced. Routine cards remain bounded to the existing 640-point content maximum on wider screens.

The four navigation selections remain announced. Manage/Set up rotation and New routine retain explicit button labels. Routine identity announces its name and correctly pluralized count; archived identity describes read-only detail. Each overflow names its routine. Active/Archived exposes checked state and a visible check cue, independent of color. Decorative icons remain hidden from accessibility. Measured New routine, Manage rotation, radio and overflow controls were at least 48 points high. Empty Active and Archived collections have compact explanatory states without a second Create action, and loading does not flash the empty library.

F1 refresh behavior is retained: summary failures keep the last known library and the same open routine editor/working fields through Retry. Fitness hook/data APIs and transactional archive/start/editor mutations are unchanged. Exercises, Fitness History and Workout content retain their existing components and behavior.

### Skill findings and review evidence

- **frontend-design:** used the actual target's rotation/library ownership, serif section hierarchy, attached creation action and compact horizontal cards. Kept the mockup's plum direction within existing tokens, without copying unrelated shell or development overlays.
- **Impeccable:** reviewed card bloat, control duplication and archived legibility in a bounded capture pass. Kept one rotation surface and one compact card per routine. Review found a real large-text selector word split, which was corrected through the shared primitive; preview-only animation/scroll boundaries were also repaired before saving final captures.
- **UI/UX Pro Max:** actively queried and verified All-platform Accessibility / Color Only guidance. The selected Active/Archived state has a visible check, border and native radio checked state rather than color alone. Readable archived cards remain operable through their legitimate read-only path.
- **Expo native UI:** checked Expo 57 and React Native 0.86 FlatList guidance, using one virtualized scroll body, stable keys, variable heights, existing native confirmation and the established measured overlay host. Safe areas and Reduced Motion remain native/shared concerns; no new native module was added.

Nine captures in [the Routines preview folder](previews/routines-v2/README.md) cover dark/light Active 390, Archived dark 390, Active light 320, Active dark 430, large-text dark 320 plus scrolled library, and empty Active dark/Archived light. Eight configurations reported no page errors or horizontal text overflow. The source-backed fixture includes a three-routine rotation with the second step next, 0/1/4-exercise counts, and one archived routine with completed workout History. It is illustrative fixture data created through real APIs, not hardcoded production content.

`scripts/preview-routines.ts` renders the real FitnessScreen and controls through React Native Web. It substitutes the Fitness data hook, router, native safe-area/font/keyboard/picker/Alert boundaries and native animation scheduling. Fixtures are generated from migrated/seeded in-memory SQLite using real Fitness/rotation data APIs. Browser mutations update review state or record callbacks, not the production database; SQLite integration tests cover actual persistence. The preview animation boundary exposes current selected-state geometry with Reduced Motion instead of pretending to benchmark UI-thread motion. No device frame, OS chrome, bottom navigation or floating development control is fabricated.

Real browser checks passed Manage route identity, menu outside dismissal, Active/Archived checked state, archived read-only detail, New routine/Save callback, menu closure before confirmation, archive filtering and bounded mounting. Native Alert cancellation/protection, history/reference retention, workout start and edit persistence are verified separately against SQLite.

### Files and validation scope

New files: `src/features/fitness/components/routines-content.tsx`, `tests/routines-v2.test.ts`, `scripts/preview-routines.ts` and the preview folder. Modified: `src/features/fitness/fitness-screen.tsx`, `src/components/form-controls.tsx` (optional v2 segmented presentation), `src/components/ui-icon.tsx` (gear/archive geometry), `tests/helpers/refresh-lifecycle.ts` (real selection context for menu/list locking), `tests/fitness-rotation-experience.test.ts` (icon replaces literal arrow in action labels), `tests/form-controls.test.ts` and this document. No generic management-card hierarchy was introduced because existing primitives cover this surface without changing Exercises.

No schema, migrations, source persistence/domain logic, routes, seed definitions, package manifests or dependencies changed. No files were removed, staged, committed or pushed. Physical-device follow-up remains iPhone Expo Go and Android: native fonts/density, accessibility sizes, scrolling a long library, bottom-edge menu anchoring, focus restoration, native Archive/Cancel and in-progress-workout confirmation, tab/rotation navigation and editor draft retention. No physical-device testing was performed.

Final validation passed TypeScript, 197 focused Fitness/Workout/shared-control tests, all 1,031 tests in the full serial suite, iOS export, Android export, live browser interactions and `git diff --check`. There were no test failures, cancellations or skips. Seventeen new source-backed Routines cases and three real shared-selector cases cover source rotation/next values, 0/1/N counts, creation/editor/start, archive cancellation/reference protection/history retention, archived read-only behavior, no-plan/invalid-next fixtures, empty states, themes, narrow/large text, radio checked state/non-color cues, large lists, scroll restoration and F1 refresh/editor retention. ESLint matches the captured starting baseline of six errors and two warnings with no added or removed file/rule/severity/message findings. A test-only typing annotation was corrected before the final TypeScript run; production source was unchanged after the final captures.

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

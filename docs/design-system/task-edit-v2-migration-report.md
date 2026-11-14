# Phase 3D-T.1 — Existing Task Editor Migration

Implemented 2026-11-13. Presentation migration only. No staging, commit or push.

## A. Executive summary

Ordinary existing-task editing now explicitly opts into the same v2 TaskEditor branch already approved for New Task and Repeating Tasks. The entire runtime change is one JSX appearance prop in TasksScreen. TaskEditor itself, its draft/validation/save/recurrence functions, all shared components and all domain/persistence/navigation modules are byte-unchanged against this phase's initial snapshot.

Both Tasks-origin and actual Calendar agenda → source-route entry were tested. New Task and deferred legacy Task Actions screenshots are byte-identical before/after in both themes. Task Actions and per-task Occurrence History remain for Phase 3D-T.2.

Reviewed current Phase 1 audit, Soft Copper specification/migration plan/traceability, shared controls report, shared sheets report, shared feedback report and feedback follow-ups. This report retains the original VU issue IDs without modifying prior reports/evidence.

## B. Root cause

TasksScreen had one production TaskEditor invocation:

```tsx
appearance={repeating ? 'v2' : undefined}
```

TaskEditor resolves v2 as `task === null || visual === 'v2'`. Consequently New Task was v2 automatically, Repeating Tasks edit was explicitly v2, and ordinary main/History/Calendar existing-task edit fell back to legacy. DesignProvider does not implicitly migrate legacy controls.

The invocation now passes `appearance="v2"`. No default was flipped in TaskEditor or a shared primitive. Its existing `appearance` variable already reaches AdaptiveSheet, its custom NewTaskHeader reused for Edit, recurrence header/sections, all fields/selectors/weekdays, inline category creation, errors and PickerBackHeader. No missing descendant propagation required another edit.

## C. Entry-point inventory

| Entry | Actual source path | Result |
|---|---|---|
| New Task | tasks-screen.tsx → FloatingAddTask onPress → setEditor({task:null}) | Same TaskEditor; already-v2 create branch unchanged |
| Main Task details / menu Edit | tasks-screen.tsx renderRow → task-row.tsx and task-list-row.tsx disclosure/menu callbacks → onEdit → setEditor({task:item.task}) | Now explicit v2 ordinary edit |
| Global Completed/Skipped History edit | tasks-screen.tsx → task-history-list.tsx details or contextual Edit → onEdit | Same v2 editor, same saved task ID; global History not redesigned |
| Repeating Tasks Edit schedule | tasks-screen.tsx → recurring-tasks.tsx onEdit | Already explicit v2; unchanged |
| Legacy Task Actions → Edit | task-actions.tsx onEdit → TasksScreen.fromManagement | Existing dismissal handoff then same editor; only resulting editor migrates |
| Calendar task agenda | calendar/calendar-screen.tsx onOpen → projection.ts sourceParams → router.push('/calendar-source', source/recordId/date) | Route unchanged |
| Calendar source route | app/calendar-source.tsx → calendar/source-screen.tsx → source-navigation.ts sourceRequest → source-screen.tsx → TasksScreen initialTaskId | Same saved TaskEditor, now v2 |
| Home source task link | source-screen.tsx → TasksScreen initialTaskId | Inherits same explicit editor opt-in; Home source/layout untouched |
| Recurrence return | TaskEditor recurrenceDone | Same modal/draft; Keyboard.dismiss, picker cleared, main editor restored |
| iOS picker return | TaskEditor pickerControls → PickerBackHeader | Same picker/value callback; header inherits v2 |
| Android picker | TaskEditor openPicker → DateTimePickerAndroid.open | Same platform picker options/callbacks/dismissal |
| Save / Cancel | TaskEditor saveDraft / onDismiss → TasksScreen editor state | Same persistence/dismissal behavior |

Relevant main-list owner: TaskWorkspaceList receives renderRow; its rows keep their existing actions, virtualization, keys and scroll position. Nothing in the list implementation changed.

## D. Appearance changes

Only TasksScreen's appearance prop changed. These resulting visual differences are inherited from the existing approved v2 branch:

| Element | Previous ordinary edit | Existing v2 contract now reached |
|---|---|---|
| Sheet | Legacy green/white overlay palette | Canonical canvas #151315 / #F5F0EA, shared sheet shape |
| Editor title | System sheet title, 18/24 in captured fixture | Lora editorTitle 26/34; existing compact 22/30 below 360pt |
| Save / Cancel | Legacy 44pt controls, mint Save | Manrope button 15/22, 48pt minimum; copper Save, quiet copper Cancel/back |
| Sections | Plain Task/Schedule/Organization/Recurrence headings | Existing EditorSection surfaces, Lora section headings, supporting Manrope text, existing icons |
| Form typography | Legacy system labels/values | fieldLabel 14/20, body 16/24, secondary 14/20 |
| Fields/selectors | Legacy surface/boundary | surface #1B181A / #FFFCF8, controlBorder #95828E / #9B837B, 10pt control radius |
| Focus/invalid/disabled | Legacy contract | Shared copper focus, semantic danger invalid, readable disabled values; no local field styles |
| Recurrence | Legacy plain sections and action | Same existing v2 focused sections, summary and source-owned action |
| Errors/refresh | Legacy editor error/notice | Existing FormError/SheetRefreshNotice v2 semantic presentation |
| iOS picker back | Legacy arrow/system header | Existing v2 BackButton/PickerBackHeader; native picker remains native |

Soft Copper is the global interaction accent (#E7AA8B / #874833); pressed uses #F0BDA3 / #713926. Tasks' indigo identity tokens (#AEB7E8 / #505A8A) and all completion/status semantic mappings remain unchanged. This adds no new editor palette or identity rule. The existing New Task grammar uses copper section/control accents and is preserved exactly.

## E. Complete changed-file inventory

Runtime:

- src/features/tasks/tasks-screen.tsx — one TaskEditor appearance prop.

Tests:

- tests/task-edit-migration.test.ts — 11 new behavior tests.

Scripts:

- scripts/preview-task-edit-migration.ts — actual TaskEditor/TaskActions preview, production caller appearance extracted from TSX AST, representative saved fixtures, explicit native picker boundary.
- scripts/review-task-edit-migration.cjs — 26 focused paired captures and measured controls.
- scripts/check-task-edit-migration.cjs — 15 browser behavior/layout groups.
- scripts/audit-task-edit-migration.cjs — initial hash preservation, exact one-line delta, parity, lint and Git checks.

Documentation/evidence:

- docs/design-system/task-edit-v2-migration-report.md — this report.
- docs/design-system/task-edit-v2-migration/index.html — paired review index.
- docs/design-system/task-edit-v2-migration/{initial-state,before,after,comparison,interaction-validation,audit}.json.
- 52 PNGs in before/ and after/: each has new-390, edit-390, edit-bottom-390, recurring-390, empty-320, long-430, invalid-390, calendar-390, picker-390, selector-390, recurrence-320, large-320, actions-390, each in dark/light, named case-theme-width.png.

Total new durable files: 65. Ignored scratch under dist/task-edit-v2-migration contains test/lint/export/build/capture logs, initial source copies and platform exports. It does not overwrite older artifacts. audit.json expands the exact new-file inventory.

## F. New / existing parity

Both paths use the same unchanged render tree: Task, Schedule, Organization, Recurrence; same title/description fields; same category/priority selection and inline category creation; same schedule layout calculation; same error and Save/Cancel system. There is no duplicated edit tree.

Intentional differences remain: New task versus Edit task heading; loaded values; Add versus Edit recurrence; Stop repeating only where already supported; existing schedule-change guidance for recurring tasks. The existing stopped-recurrence branch still hides the ordinary Schedule section until recurrence is added again. No new Delete action was added to the editor; deletion remains in its existing contextual owners.

## G. Task, recurrence and source preservation

The tests use the real migrated TasksScreen, real TaskEditor state and existing SQLite task access (native controls/navigation boundaries supplied by the established harness):

- Opening loads original title, description, category and priority without mutating the record.
- Changing fields does not autosave. Cancel discards unsaved values; no new dirty-state alert is introduced.
- Save updates the original ID, preserves createdAt/date/time, allows optional description/category removal and priority changes, and creates no duplicate even when the captured Save callback is invoked twice in one act.
- Daily/weekly/monthly/yearly existing edit loads its real rule. Visiting recurrence and returning preserves the draft. A title-only edit leaves recurrence rows and occurrence rows exactly equal to the prior snapshot.
- A real daily interval edit creates a rule effective tomorrow (2026-11-14 for the fixture), retains today's completed occurrence exactly and uses the unchanged data access.
- Native date/time callbacks retain local values and return headers; clearing Date disables Time; invalid blank title rejects Save without discarding the draft.
- Actual Calendar route params remain source=task, original recordId and original date.

Existing tests cover inclusive ends, Monday-based weeks, short-month clamping, leap years, recurrence stop/version behavior, past and early-resolved histories, pending/completed/skipped/missed semantics, completion/reopen, projection, category persistence and soft deletion. No date/time test or domain implementation was changed.

TaskEditor currently owns a single form-level validation error; it does not pass field-specific errors to individual TaskField controls. This phase preserves that behavior. Shared FormField tests verify simultaneous focus+invalid geometry and error associations where a caller actually supplies an error. No invented per-field validation, busy spinner or disabled Save state was added. The existing synchronous saving ref remains the duplicate-submission guard.

## H. Calendar parity and return

The new integration test actually mounts CalendarScreen, opens the saved task agenda row, verifies its /calendar-source navigation params, then mounts CalendarSourceScreen with those params. It verifies the same v2 controls and saved values, edits the draft and cancels. Cancel does not pop/replace the source route or change its date params; it closes only the editor, as before. Returning from the pushed source screen remains Expo Router's existing stack Back behavior. No Calendar selection, month, date, agenda layout or route adapter changed.

The gallery's Calendar case intentionally resolves the same production TaskEditor appearance and saved fixture; its PNG equals the Tasks edit case in both themes before and after. This is editor parity evidence, not a screenshot of the native navigation stack or Calendar layout.

## I. Geometry and accessibility

Measurements are RNWeb CSS-pixel/pt proxies at viewport height 844, not physical-device metrics. Real TaskEditor components, fonts and existing adaptive layout are used. The 2× proxy combines fontScale and text-size scaling; native picker UI is a labeled placeholder, not a simulated visual acceptance claim.

| Measurement | Before | After |
|---|---|---|
| 390pt Edit title | system 18/24, y35 | Lora 26/34, y28 |
| 390pt Save | x310.63 y25, 63.38×44 | x317.38 y21, 60.63×48 |
| 390pt Cancel | x16 y25, 75.86×44 | x12 y21, 103.86×48, existing back icon |
| 390pt title input | x16 y161, 358×48 | x25 y194, 340×48 inside existing EditorSection |
| 320pt normal title | system 18/24 | existing compact Lora 22/30 |
| 320pt/2× Save | x16 y91, 92.73×58, wrapped legacy header | x212.77 y89, 95.23×62, existing stacked v2 header |
| 320pt/2× Cancel | x16 y25, 117.70×58 | x12 y89, 153.70×62 |
| 320pt/2× Edit heading | system 36/48 | compact Lora 44/60, y21; fixed short editor name |

V2 content padding/gap is existing 12pt rather than legacy form's 16pt padding/24pt section gap. Existing EditorSection adds its own semantic grouping and supporting text; no spacer, fixed editor height or local offset was added. Native schedule fields retain the existing width threshold: two 160pt fields times fontScale plus spacing; 320pt and doubled text stack, sufficiently wide normal forms use a row.

15 browser groups pass: 2 themes × 3 widths (320/390/430) × 1×/2× = 12 full behavior/layout cases; 2 simulated-keyboard cases; 1 mounted theme-switch/Cancel case. In the matrix Save/Cancel remain visible, all action targets are at least 48pt, final recurrence action is scroll-reachable, long text reflows and no horizontal document overflow was observed in the paired capture set.

At 320pt/2× with keyboardTop520, the real short Edit task header's Save ends at y151, and the scrolled final recurrence control ends at y495. This is useful scoped evidence; it does not close the previously disclosed synthetic extreme long-header issue.

Resting control boundaries, copper focus and semantic invalid boundaries reuse the tested shared contract. Focus/invalid can coexist without changing border geometry. Existing readonly/disabled values, selected radio checks, accessible required-title label, error alert/live region, picker-return names and native text input semantics are preserved. No palette or global typography changes.

Native acceptance still requires physical VoiceOver/TalkBack focus/announcements, keyboard focus reveal, actual OS scaling and coordinate/inset checks. Browser focus and simulated keyboard evidence are explicitly limited.

## J. Visual evidence and skills

[Focused review index](task-edit-v2-migration/index.html): 26 before/after pairs (52 PNGs), not a broad new application atlas. Before captures precede the runtime edit; before/after use identical fixtures and font/native-boundary setup.

Cases: approved New Task reference; saved ordinary edit; edit bottom/action area; recurring edit; empty optional description/date; long saved title/description; real Save validation error; Calendar editor parity; iOS-owned picker return header with native boundary; open Category selector with selection; recurrence nested surface; 320pt doubled text; deferred legacy Task Actions.

Exactly four pairs are byte-identical: New Task and legacy Task Actions, each dark/light. The remaining ordinary edit/nested cases intentionally change from legacy to the approved existing v2 surfaces/fonts/controls. Calendar equals the same Tasks fixture both before and after. No unexplained visual difference remained. Manual image review included normal dark edit and narrow doubled-text light edit. A long single-line title scrolls within its input; multiline description remains its existing internally scrollable field.

Skill contributions:

- frontend-design: reused New Task's editorial/operational hierarchy; identified that a new visual/render system was unnecessary.
- Impeccable: compared actual paired surfaces, spacing, narrow large-text layout and preservation controls; retained existing composition rather than adding decorative boundaries.
- UI/UX Pro Max: checked action/dirty-state clarity, focus and invalid coexistence, disabled-time affordance, semantic selection and minimum targets. Applied installed guidance; no tool/dependency installation.
- Expo building-native-ui: checked installed Expo ~58.0.17 against official SDK58 reference and documentation index; retained native modal/picker/keyboard/Back/safe-area ownership. User's preserve-existing-ownership requirements take precedence over generic skill suggestions to restructure headers/navigation.

References consulted: https://docs.expo.dev/versions/v58.0.0/ and https://docs.expo.dev/llms.txt.

## K. Tests and validation

Deterministic timezone: America/Sao_Paulo.

| Check | Result |
|---|---|
| Initial full suite | 1,541 passed, 0 failed/skipped, 85.52s |
| New migration tests | 11 passed, 0 failed/skipped, 2.16s |
| Focused Tasks/recurrence/persistence/Calendar/shared UI regressions | 314 passed, 0 failed/skipped, 30.67s |
| Final full suite | 1,552 passed, 0 failed/skipped, 88.39s |
| Actual-component browser checks | 15 groups passed |
| TypeScript | Passed |
| Changed-file ESLint | Passed, 0 diagnostics |
| Full ESLint | Identical six inherited errors/two warnings; zero new diagnostics |
| iOS export | Passed |
| Android export | Passed |
| git diff --check | Passed |
| Scope/preservation audit | Passed; exact single runtime-prop change; other initial files untouched |

Inherited ESLint findings remain react/no-children-prop in context-menu.test.ts (3), navigation-conventions.test.ts (2), transactions-experience.test.ts (1), and two unused-variable warnings in tasks-experience.test.ts. No suppression or weakened assertion.

React act warnings: baseline 66 (DesignProvider52, WorkHistoryList10, WorkView4); final full70 (DesignProvider56, same Work warnings). Four additional DesignProvider warnings were observed with the newly reached v2 editor path. New test file alone emitted zero; focused run emitted10. They remain visible as test-reliability follow-up; no claim of an unchanged warning count or framework cleanup. Prior S.2 concurrent confirmation timing failure remains documented in its original report/logs; this phase's baseline/final/focused suites passed.

During evidence/test development, two preview-fixture issues were corrected (actual combobox role and effectiveUntil spelling), and new test traversal was corrected to tolerate host text nodes without props and register cleanup before assertions. The final evidence uses corrected fixtures; no production changes resulted from those issues. All final checks above ran successfully. No date tests, prior test assertions, production timing or diagnostics were changed to obtain passes.

## L. Open risks and native acceptance

Keep [shared feedback follow-ups](shared-feedback-menus-followups.md) open:

- Bare-host RNWeb TextInput typing can consume Escape. Modal-owned existing keyup dismissal is preserved; no global workaround added.
- Synthetic extreme editorial title + 320pt + doubled text + keyboard can exhaust the fixed header. Prior evidence (706pt header, Save y641+62 versus keyboardTop520; baseline also failed) remains untouched. Real Edit task uses a short fixed heading, and the scoped browser keyboard test passes; that is not native closure of the broader issue.
- Test-reliability observations: inherited act warnings, four additional DesignProvider warnings above, and prior concurrent menu-confirmation timing sensitivity. No production failure was demonstrated by those warnings.

Physical iOS/Android acceptance pending: Tasks and Calendar edit entry/return; keyboard reveal/focus; date/time picker selection, dismissal and return; category/priority/inline creation; Save/Cancel and double-tap behavior; Android Back and iOS dismissal; real large system text; VoiceOver/TalkBack; final field/action clearance; OS theme changes while mounted. Exports/browser captures are not physical acceptance.

## M. Audit status

**VU-01: partially resolved overall; scoped implementation resolved, physical acceptance pending.** The actual ordinary edit path is explicitly v2, all reused descendants are reached, Tasks/Calendar parity and source behavior are tested, and New Task is preserved. Do not declare native release acceptance without devices.

Related findings: VU-05 shared sheet/picker contracts are now reached by this caller, broader header/native work open; VU-07 Task Actions/per-task history remains deferred; VU-10 existing approved type roles reused; VU-13 existing control geometry adopted; VU-19 existing error/refresh contract adopted. None is globally closed by this one feature migration. No new design decision or domain blocker found.

## N. Phase 3D-T.2 handoff

| File/component | Current presentation | Desired bounded migration / behavior to preserve |
|---|---|---|
| src/features/tasks/components/task-actions.tsx / TaskActions | AdaptiveSheet without appearance; ThemedText, legacy FormError/StatusText/buttons | Explicit v2 sheet/operational title, semantic source status, existing shared actions. Preserve optional occurrence section, Skip/Return to pending only when not completed, Edit recurring/task, conditional View History, destructive Delete and source confirmations |
| src/features/tasks/components/occurrence-history.tsx / OccurrenceHistory | Legacy AdaptiveSheet, ThemedText rows/status/error/retry/action buttons; border-separated entries | Explicit v2 archive grammar and semantic status text. Preserve source scheduled dates, historical recurrence-version metadata, Previous schedule label, read-only deleted entries, Complete/Reopen/Skip/Return actions, initial read and paging |
| src/features/tasks/tasks-screen.tsx | Current source owner for actions/history and modal handoff | Add only appearance propagation if those APIs require it; preserve managementClosed/fromManagement, iOS onClosed handoff, Back/navigation and exact access callbacks |

Dependencies: completed shared controls, sheets, feedback/menus, BackButton/PickerBackHeader, canonical tokens. Reuse these; no new modal/selector/data architecture. Global Task History/Repeating Tasks layouts stay unchanged.

Risks: mistaking historical recurrence metadata for current rule; giving deleted historical entries editable controls; changing completed versus skipped predicates; duplicate modals during iOS handoff; long saved task title plus keyboard/large-text header constraints; unwanted source paging/scroll resets; treating native confirmations as branded custom dialogs.

Suggested tests: ordinary/recurring/completed/skipped/pending/missed actions; disabled/read-only historical versions; Stop/Delete confirmation cancellation; source identity and status updates; initial read errors/retry/paging/deduplication; current scroll/source snapshot preservation; iOS modal handoff; Android Back/menu-first dismissal; long realistic title at 320/390/430, doubled text and native keyboard; screen-reader labels/live regions; both themes; unchanged global archives/New Task/Edit.

Narrow sequence: (1) baseline and trace existing actions/history; (2) capture a small source-backed preservation set; (3) explicitly opt TaskActions into shared v2 with original callbacks; (4) migrate OccurrenceHistory's wrappers/metadata without data/status/paging changes; (5) test handoff and archive semantics; (6) native acceptance and full validation. Keep broad header/Escape remediation independently scoped unless a reachable blocker is demonstrated.

## O. Git state

Initial: main at 16ebeab46d20e7a943f08fa017928ce0eb884c0e; 35 modified tracked paths, 768 untracked files, nothing staged. Final: 35 modified tracked paths, 833 untracked files. TasksScreen was already modified before this phase; exactly one additional prop changed there. 65 files created in this phase. Of 3,315 initial files, 3,314 remain byte-identical; exact reverse replacement verifies the sole runtime delta. All previous artifacts and changes preserved. HEAD unchanged; nothing staged; no commit or push.

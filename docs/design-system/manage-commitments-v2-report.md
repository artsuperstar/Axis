# Phase 3D-M.2 — Manage Commitments Migration

Implemented 2026-11-13. Manage Commitments only. No stage, commit or push. Physical native acceptance remains separate.

## A. Executive summary

The remaining active legacy Manage surface now opts into existing shared v2 typography, controls, action menus and feedback. Series rows use a restrained canonical group surface and neutral boundary. Operational hierarchy, readable lifecycle wording and all source-owned actions are retained. Narrow or enlarged headers stack locally instead of breaking the title beside Back.

Only `src/features/finance/commitments/components/commitments-view.tsx` changed at runtime: 24 insertions, 23 deletions. No shared components/defaults, domain services, money arithmetic, database, routes, dependencies, tabs, other approved screens or branding changed.

## B. Audit and root cause

The actual target is `surface === 'manage'` inside `CommitmentsView`. It shares a SectionList and dialog owner with obligations and the global history index, but those sibling presentations are already v2. Manage retained `ThemedText`, legacy BackButton/ContextMenu/StatusText/FormError appearance and a legacy green-toned separator. The provider did not implicitly migrate those callers.

The narrow fix is explicit v2 propagation and local row/header styles. No parallel management implementation was created. The historical branch retained inside `seriesRow` was not removed or refactored; the active global-history renderer still uses its existing `CommitmentHistoryIndexCard`.

Required current project records inspected: visual-unification-audit, soft-copper-specification, migration-plan, traceability, shared-controls-inputs-report, shared-sheets-headers-report, shared-feedback-menus-report, linked-transaction-detail-v2-report. VU-06 is the primary target; VU-05/10/13/14/19/17 inform local contracts and remaining acceptance.

## C. Runtime changes

| Component / boundary | Before → after |
|---|---|
| Manage header | Legacy Back and system section heading → explicit v2 icon Back and Manrope `UiText sectionHeading` (20/28). At width < 360 or fontScale ≥1.5, Back and full-width heading stack. |
| Series identity / amounts / metadata | `ThemedText` → canonical `UiText` with unchanged content, formatting, predicates and tabular figures. |
| Series body | Raw Pressable → shared `UiPressable`, preserving the same label, hint and `openDetails` callback; minimum 48pt and shared focus/press feedback. |
| Series surface | Bottom separator → local 1pt neutral border, `Shape.group=16`, canonical group fill, 12pt padding. Existing 8pt inter-row separation retained. |
| Lifecycle wording | `StatusText tone="neutral"` now explicitly v2; labels and source predicates unchanged. |
| Series options | Existing ContextMenu now explicitly v2; same actions, ordering, eligibility and callbacks. |
| Guidance / empty state / local errors | Existing copy and visibility retained; v2 text and FormError appearance. Other surfaces already used the same v2 error path. |

The local `useTheme` dependency was replaced by `useDesignColors`; those colors are consumed only in management row styling. All other affected JSX is inside Manage's existing branch. No loading or retry API was invented.

## D. Entry points and state ownership

Finance destination **Commitments** renders `CommitmentsView` with the authoritative snapshot's `items`, categories, date, data access and mutation wrapper. The existing **Commitment options → Manage commitments** action sets local `surface` to `manage`. This is not a route. **Back to Commitments** restores `obligations` and clears the local error.

Manage renders all supplied series in source order, including ended/completed series. Row body opens the selected commitment's existing details. Series options opens Edit, eligible Pause/Resume/End, or the selected individual History. Cancel/Back closes that dialog and reveals the same management list. History's View commitment swaps to that same record's details within the existing dialog owner.

Manage does not calculate projections, query a new dataset or page the series list. `historyItems`, occurrence sections and paged history remain owned by their existing sources. Finance owns initial loading and refresh/retry; Manage mounts only when a snapshot exists. Failed refresh retains the last known snapshot and mounted management state. Local read/mutation errors render the existing FormError; the user can retry the original action or return. The empty copy still points back to Commitments for creation.

## E. Lifecycle/action matrix

Edit and History remain available for every real series state below. No direct Pay, Delete or payment editing was introduced in management.

| Kind and real state | Additional actions | Absent actions / source authority |
|---|---|---|
| Bill / Subscription active | Pause, End | No Resume; source `status === 'active'` controls Pause. |
| Bill / Subscription paused | Resume, End | No Pause; source `canResume` controls Resume. |
| Bill / Subscription ended | None | No Pause/Resume/End. Ended is retained history, not deletion. |
| Installment active | Pause | No End; no Resume while active. |
| Installment paused, source `canResume=true` | Resume | No End or Pause. |
| Installment paused, all dates assigned | None | No Resume; existing resolve-unpaid guidance remains. |
| Installment completed | None | No Pause/Resume/End. Completion uses authoritative resolved count, including skipped outcomes. |

Pause uses the existing native Alert with Cancel and Confirm; Confirm calls `access.pause` for the selected ID. It materializes retained due obligations and closes future schedules at the existing cutoff. Cancellation performs no write.

End uses the existing destructive native confirmation and `access.end`, only when kind is not installment and status is active/paused. Existing obligations and history remain. Cancellation performs no write.

Resume uses the existing Resume dialog, authoritative `resumeProposal`, validation and explicit Resume submission. Retaining a clamped proposal preserves the intended billing day; another permitted date changes the anchor. Existing unpaid dates cannot be overwritten. Source `canResume` is exactly paused plus either unlimited series or an unassigned installment remaining. No unconditional status toggle, extra alert or newly disabled action was introduced.

## F. Visual contract and skills

- Header: operational Manrope semibold 20/28. Row title semibold 16/24; neutral expected amount/metadata/status 14/20. Numeric figures remain tabular. No large editorial Lora headings were added to Manage.
- Canvas remains the Finance shell's canonical `#151315` / `#F5F0EA`. Rows use group `#242024` / `#FBF5F0`, decorative `border`, radius16 and padding12. No icon tiles, repeated summaries, gradients, shadows or copper row outlines.
- Primary text is `#F6F0ED` / `#241E1C`; neutral statuses and metadata `#C9BDB8` / `#6A5E59`. Expected amounts remain neutral, not expense, success or overdue. Existing Active/Paused/Ended/Completed text preserves noncolor meaning.
- Shared menu: `surfaceRaised`, `controlBorder`, radius12; ordinary action labels neutral, End danger; existing copper trigger/focus. V2 Back/menu/action targets ≥48pt.
- Existing error uses canonical danger text and its existing alert/live-region semantics. Inherited Finance refresh notice/retry was already v2 and remains unchanged.

Concrete skill contributions: **frontend-design** kept Finance's compact operational hierarchy; **Impeccable** loaded incumbent context, compared actual before/after views, identified legacy caller boundaries and the narrow header wrap problem; **UI/UX Pro Max** guidance informed native touch spacing, visible focus, source-derived restrictions and confirmation clarity; **Expo building-native-ui** kept SectionList, native-modal/Alert/Back, selection host and safe-area ownership intact. UI/UX Python search remains unavailable; installed guidance/data was inspected directly. Impeccable context mentions older SDK57 product documentation; installed Expo `~58.0.17` and current source were treated as authoritative. No unrelated context/brand files were rewritten.

The [SDK58 documentation](https://docs.expo.dev/versions/v58.0.0/) and [official documentation index](https://docs.expo.dev/llms.txt) were checked. No Expo API migration was made.

## G. Payment and schedule integrity

All scheduling/data files are byte-preserved. Monthly generation, short-month clamping, catch-up, pause/resume cutoffs, installment assignment/completion, projection, overdue derivation and historical versions are unchanged. No new money calculation was added.

Management still shows `expectedAmountMinor` using the existing BRL formatter. Actual payments and their dates remain in the source-owned history/ledger. The review's completed installment has expected `R$ 43,50` and actual `R$ 35,00`; those values are not conflated. Pending, paid and skipped remain distinct. One payment does not automatically complete a multi-installment parent. Existing payment deletion/undo continues to remove the linked expense and restore the occurrence through unchanged source flows.

The same frozen fixture covers active bills/subscriptions, overdue and future dates, paused and ended sources, completed/remaining installments, eligible/ineligible Resume, long text and the maximum supported amount `R$ 90.071.992.547.409,91`. Both capture phases record the same fixture hash and IDs. No unsupported action combinations or fake payment statuses were manufactured.

## H. Lists, scroll and geometry

Preserved unchanged: one SectionList, stable commitment-ID keys, original `items` order and section construction, `initialNumToRender=6`, `maxToRenderPerBatch=6`, `windowSize=5`, `removeClippedSubviews=false`, `contentInsetAdjustmentBehavior="never"`, current onScroll/contentOffset, keyboard policies, 640pt content maximum and 32pt bottom clearance. No getItemLayout/fixed row estimate was added. History pagination remains the existing nextBefore/append path.

Refresh retains the same list node and its native scroll position; the `contentOffset` prop remains the initial mounting offset. Finance records live scroll offsets in its existing ref and restores them when returning from another workspace. It does not update that prop on every scroll or retain Manage's local state across workspace unmounts. Tests verify this actual contract, not a newly invented scroll-state behavior.

| Geometry at 390pt, normal text | Before | After |
|---|---:|---:|
| Back target | 46.09 ×44 | 48 ×48 |
| Series menu target | 46.28 ×44 | 48 ×48 |
| First row body | 303.72 ×72 | 276 ×72 |
| First contained row outer height | 97 | 98 |
| Subscription body with wrapped metadata | 72 | 92 |
| Completed-installment body | 96 | 96 |
| Inter-row separation | 8 | 8 |

Padding/border and the shared 48pt menu account for the narrower text column; content wraps naturally, so some rows become taller. At 320pt/2x, the header now gives its title the full 288pt content width rather than sharing it with Back. No capped text, negative margin or arbitrary offset hides content.

A 60-series SQLite test verifies source order, stable keys, settings, refresh identity and recorded workspace offset restoration. A 59-series actual RNWeb list verifies incremental rendering and final-row/menu reachability. Browser review advances to the current measured bottom as new virtualized windows mount; it does not disable virtualization. This is functional reachability evidence, not a native performance benchmark.

## I. Menu and modal ownership

The completed shared ContextMenu still owns anchoring, one-menu state, Back, first-action focus and return focus. Selecting an action closes the overlay first, then invokes its original callback on the existing animation frame. The migration changes only appearance propagation; menu geometry is remeasured through the same host after row reflow.

CommitmentsView still owns one `CommitmentModal` and its existing edit/payment/resume/details/history dialog union. Detail/history switches replace content in that owner. No new linked-detail dismissal queue, stacked modal, root route or native-tab behavior was introduced. Tests repeatedly open/cancel Edit, History and Details, verify the same source ID, one modal and return to the retained management list. Existing Alert Confirm/Cancel behavior and exact mutation targets are tested.

## J. Visual review

[Compact gallery](manage-commitments-v2/index.html): 24 pairs / 48 PNGs. Both themes cover Manage, open menu, installment guidance, long title/max amount at 320pt/2x, empty, local error, plus preservation controls: Overview, commitment editor, payment confirmation, individual History, Linked Transaction Details v2 and the existing transaction editor.

All 12 preservation pairs are byte-identical. All 24 pairs retain the same rendered content after accounting for replacing legacy Back/ellipsis characters with shared icons and ordinary line reflow. The source fixture is identical. Normal Manage changes are intentional: canonical fonts/surfaces, contained neutral rows,48pt controls and v2 menu/error presentation. The local stacked header corrects the narrow title break. No unexpected sibling-screen visual change was found.

22 browser groups cover both themes ×320/390/430 ×normal/2x long-title/max-amount/menu layouts, plus both-theme large-list, native-confirmation callback entry, Resume/Edit/History/Details handoffs, local error and empty return. Text does not overflow its container, essential targets remain reachable, and keyboard focus is visible. Native Alert appearance/timing is deliberately not represented by a fake screenshot.

## K. Accessibility

Existing source wording, labels, hints and reading order are retained. Back/menu targets are 48pt; row body has a 48pt minimum. Shared UiPressable supplies a 2px focus outline and Reduced Motion-aware press feedback. The lifecycle remains explicit text, not color-only badges. End remains a named destructive action, separate from Pause and Resume.

Canonical contrast measurements are recorded in `audit.json`: normal text and neutral status exceed 4.5:1 in both themes; focus and control boundaries use the existing approved shared contract. Browser text scaling is a proxy, not native Dynamic Type sign-off.

Physical VoiceOver/TalkBack, mounted theme changes, actual font scaling, selection/keyboard behavior in unchanged dialogs, native focus return, menu anchors, Alert cancellation, iOS dismissal and Android Back remain acceptance checks. Current native-tab/safe-area ownership and the 32pt list padding are unchanged; real last-row clearance still requires devices.

## L. Tests and validation

Timezone: `America/Sao_Paulo`. No old financial expectation or test harness was edited.

| Check | Actual result |
|---|---|
| Initial full suite | 1,584 pass; zero fail/skip |
| New focused Manage tests | 17 pass; ten real kind/state combinations, both themes, confirmation/cancellation, Resume anchors, repeated handoffs, list/offset and retained-error behavior |
| Relevant regressions | 732 pass; Finance/Overview/charts, Commitments/scheduling/payments/history, Work/linked sources, controls/sheets/menus/forms/navigation/read behavior |
| Final full suite | 1,601 pass; zero fail/skip |
| React act warnings | 66 →66; focused new tests 0 |
| TypeScript | Pass before/after |
| Changed-file ESLint | Pass |
| Full ESLint | Exact inherited six errors/two warnings; zero new diagnostics |
| Browser checks | 24 matching-source pairs; 12 byte-identical preservation controls; 22 groups |
| iOS / Android exports | Both pass; Hermes bundles ~5.2MB / 5.4MB |
| Diff/integrity | git diff --check passes; source functions/callbacks/list predicates unchanged; only one initial file changed |

Two expected injected source failures are logged by the new error/retry test; warnings are not suppressed. Review-script locator assumptions were corrected to the existing accessible labels, and final-row checks now follow the actual virtualized rendering window. These were test/review harness corrections, not product behavior changes.

## M. Complete phase inventory

- Runtime: `src/features/finance/commitments/components/commitments-view.tsx`.
- Tests: `tests/manage-commitments-v2.test.ts`.
- Scripts: `scripts/preview-manage-commitments.ts`, `scripts/review-manage-commitments.cjs`, `scripts/check-manage-commitments.cjs`, `scripts/audit-manage-commitments.cjs`.
- Documentation: `docs/design-system/manage-commitments-v2-report.md`.
- Evidence: `docs/design-system/manage-commitments-v2/{initial-state,fixture,before,after,comparison,interactions,audit}.json` and `index.html`.
- 48 PNGs under `{before,after}/`: `{manage,menu,guidance,empty,error,overview,editor,payment,history,linked,other}-{dark,light}-390.png`, plus `long-{dark,light}-320.png`.

One changed initial runtime file; 62 new files;63 phase paths. Ignored `dist/manage-commitments-v2` holds logs, saved before source and exports; `dist/manage-commitments-atlas` holds the browser bundle. All earlier evidence is preserved.

## N. Audit status

**VU-06: implementation-resolved; native acceptance pending.** VU-10 operational typography, VU-13 geometry, VU-19 local feedback and VU-14 narrow header treatment are applied at this caller. VU-05/shared defaults were consumed, not changed. VU-17 remains a physical acceptance gate. No global audit findings or prior reports were silently rewritten or closed.

## O. Next handoff — Phase 3D-F Active Workout Nested Forms

Do not implement yet. Primary file: `src/features/fitness/components/fitness-forms.tsx`; caller/ownership reference: `src/features/fitness/fitness-screen.tsx`; existing entry UI: `components/workout-content.tsx` and `components/active-workout-header.tsx`. Preserve `components/workout-sheet.tsx` (already-v2 completed History detail), RoutineEditor/ArchivedRoutineEditor, RoutineExercisePicker and existing Exercises/Routines screens.

Exact active paths:

1. Workout set row → `FitnessScreen.editSet(exerciseId,setId)` captures the selected exercise/set → keyed `SetEditor`. It retains legacy AdaptiveSheet, FormError, text, fields and Delete button. Strength/bodyweight fields differ; DistanceFields and DurationFields logging paths need explicit appearance propagation, including the logging duration branch that currently ignores the optional appearance prop.
2. Workout/exercise note action → `editNote(exerciseId|null)` captures session, exercise, title and note → `NoteEditor`. Legacy sheet, error and multiline field remain. Preserve 2,000-character limit, save/cancel/empty semantics and retained draft identity through refresh.
3. Active Workout Add exercise → `AddExerciseSheet` in the existing AdaptiveModal. Legacy sheet/error/AutocompleteField opens the real results/create flow. Inline creation temporarily renders `ExerciseEditor` with undefined appearance, although that component already supports v2 and Exercises main already opts in. Preserve parent callback, creation ordering, matching/filtering and source ID; do not rebuild autocomplete.

Shared dependencies: AdaptiveSheet operational title role, FormField/FormError/FormButton/SegmentedControl/SelectField appearance, AutocompleteField selection host, SheetRefreshNotice, UiText/UiPressable, existing measurement/feature tokens. No default switch or new sheet system is required.

Preserve source behavior: four measurement types; nullable blank performance values; existing validation/precision/unit conversion; unit-change clearing; set identity/completion separate from performance edits; manual exercise completion; active-session guards; archived exercise exclusion; normalized names; create-and-add once; useSave reentry/error retention; native Delete set confirmation; workout session/routine/rotation snapshots; source progress/totals and current native modal owner. Read current source before assuming a nested Back contract—the active Add flow must not accidentally inherit RoutineEditor's different ownership.

Recommended narrow slices: (F.1) SetEditor plus explicitly propagated logging fields; (F.2) NoteEditor; (F.3) active AddExerciseSheet/autocomplete/nested ExerciseEditor. Capture before/after and validate each while preserving existing v2 routine/exercise/history controls. Keep any remaining source-specific fallback separate unless a direct reachable dependency is demonstrated.

Required tests: fitness-components/fitness-experience; workout-declutter/flexible-completion/set-completion/manual-completion/progress/header/launch; four measurement-type save/clear/invalid/cancel cases; Delete confirmation; repeated Save; notes; autocomplete search/select/create/cancel/failure/archived cases; retained draft during refresh; Android Back/iOS dismissal; keyboard selection and last-action clearance; theme/320/390/430/2x; source/data preservation. Native keyboard, selection, focus and nested creation acceptance are essential. No fitness code changed here.

## P. Open issues

The bare-host RNWeb Escape typing/selection issue remains open. This migration adds no keyboard listener or selection-host change. The extreme constrained-height sheet-header issue under long title/doubled text/open keyboard remains open; the local Manage header correction does not claim to fix AdaptiveSheet or unchanged child editors. No new Commitments domain defect was found. Device menu-anchor/focus/scroll-restoration and last-row/native-tab acceptance remain outstanding.

## Q. Git and preservation

Initial: 41 modified tracked paths, 961 untracked, nothing staged; HEAD `16ebeab46d20e7a943f08fa017928ce0eb884c0e`. Final: 42 modified tracked paths, 1,023 untracked, nothing staged; same HEAD. Of 3,508 initial files, 3,507 unaffected files retain their byte hashes; only commitments-view changed. All prior uncommitted work, tests, reports, galleries and scripts are preserved. No stage, commit or push.

Machine-readable [audit](manage-commitments-v2/audit.json), [source fixture](manage-commitments-v2/fixture.json), [comparison gallery](manage-commitments-v2/index.html).

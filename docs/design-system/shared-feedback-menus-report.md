# Phase 3B-S.2 — Shared Feedback and Context Menus

Implemented 2026-11-13. Scope is explicit v2 presentation; legacy callers, source state, actions, modal ownership and data behavior are preserved. No dependencies, persistence, schema, routes, tabs, Home artwork/layout or branding changed. No staging, commit or push.

## A. Summary

StatusText now has an explicit v2 path. Shared sheet refresh feedback inherits its sheet appearance. Existing v2 Finance, Work management and Tasks main notices now opt into the appropriate presentation. ContextMenu action surfaces use surfaceRaised/controlBorder and ordinary action labels use neutral text rather than copper. Its initial placement estimate now reflects v2 row geometry and text scale; final measurement remains owned by the existing selection host.

Required project context reviewed: visual-unification-audit, soft-copper-specification, soft-copper-migration-plan, soft-copper-traceability, shared-controls-inputs-report and shared-sheets-headers-report. This is partial progress against VU-05, VU-07, VU-13 and VU-19, not closure of those findings.

## B. Audit and root causes

1. StatusText always rendered legacy ThemedText/StatusColors, even when nested in DesignProvider. Explicit appearance was missing; a provider must not implicitly migrate legacy callers.
2. AdaptiveSheet did not pass appearance to SheetRefreshNotice. A v2 sheet consequently contained legacy FormError/Retry refresh presentation.
3. Finance's shared notice/action-error region, Work management's warning/retry and Tasks main's notice/retry omitted v2 appearance. Repeating Tasks and History already opted in.
4. S.1 had deliberately left action-mode SelectionOverlay on surface/borderStrong. S.2 completes its raised surface/control boundary contract.
5. Shared quiet buttons intentionally use copper. Applying that default to every ordinary menu action overstated branding. A narrow neutral tone opt-in preserves ordinary quiet-button appearance elsewhere.
6. ContextMenu's initial estimate still assumed 44pt rows and did not consider text scale. Its host already corrected actual wrapped content, so settled geometry was sound; the opening estimate needed to agree with the v2 minimum and scalable line height.

No reproducible duplicate shared notice was found. Each SheetRefreshContext exposes only error and onRetry, and each SheetRefreshNotice renders one source error and one retry. No message deduplication, additional lifecycle state, success notification, loading transition or error suppression was added.

## C. Feedback inventory and final contract

| State | Existing owner/component | Explicit v2 treatment | Actions/accessibility and scope |
|---|---|---|---|
| Neutral loading | Source-owned text; StatusText where used | textSecondary, secondary interface typography by default; no new surface | Caller supplies wording/roles; no automatic alert, spinner or source transition |
| Refreshing | Feature hooks/refresh lifecycle; source-specific rendering | Existing states remain source-owned; neutral text can use the same explicit v2 path | SheetRefreshContext has no refreshing/busy flags; none invented |
| Success | Source wording/status composition; StatusText success | success semantic green, secondary text unless a valid text role is supplied | Pure text, no manufactured notification or new action |
| Warning/overdue | StatusText attention or feature-owned composition | attention amber; existing v2 warning consumers opt in | Existing message, alert/live-region and retry predicates retained |
| Error | FormError, source errors, field validation | Existing v2 danger text/secondary role; newly reached by sheet notice and named callers | Existing alert, polite live region, nativeID and field associations retained; no wrapper card |
| Retry | Existing FormButton/TaskButton | Approved button variants, 48pt minimum, existing pressed/focus/disabled contract | Same callback, label and condition; no refresh-state API change |
| Disabled retry | Existing disabled button API, atlas specimen | textDisabled on inset; unavailable semantics retained | Disabled press rejected; not a new production refresh state |
| Empty data | Feature-specific compositions, e.g. ExercisesContent | Existing composition unchanged | Original icon/copy/action retained, distinct from errors |
| Unavailable item | Existing source predicates and FormError/fallbacks | Existing explicit v2 paths retained; legacy fallback stays legacy | No inferred state, retry or navigation change |
| Native confirmations | Alert and feature action owners | Native UI unchanged | Existing destructive safeguards and copy retained |

StatusText explicit v2 mapping, dark/light:

| Tone | Role | Dark | Light |
|---|---|---|---|
| neutral | textSecondary | #C9BDB8 | #6A5E59 |
| subdued | textMuted | #AFA39E | #746660 |
| success | success | #A8D0B7 | #32664E |
| attention | attention | #DFC18B | #805619 |
| danger | danger | #F0ABAB | #9B303E |
| info | info | #B4CEE8 | #3D5E86 |

StatusText remains text only. It preserves an existing DesignTypography role; unsupported legacy aliases fall back to secondary on its explicit v2 path. Legacy rendering retains its original ThemedText type, StatusColors and system typography. Props, source wording, nativeID, accessibility role/live region and caller styles remain caller-owned.

## D. ContextMenu contract

| State | Final behavior |
|---|---|
| Resting | Existing 12pt radius, 8pt interior padding, 4pt row gaps; surfaceRaised #2B2429 / #FFFCF8, controlBorder #95828E / #9B837B. Ordinary action textPrimary #F6F0ED / #241E1C, Manrope semibold button role. No decorative header or new icon. |
| Pressed/hovered | Existing controlPressed fill and UiPressable transient opacity/scale; original reduced-motion behavior retained. Dark controlPressed aliases surfaceRaised, so fill alone can look unchanged against the panel; no new token or motion was introduced to disguise this. |
| Selected | ContextMenuAction has no selected field: actions remain buttons, not invented radio options. Real SelectField selected values/checks and persistent selected styling remain intact and were captured/tested. |
| Disabled/busy | Original disabled action predicate, textDisabled/inset/border treatment and noninteractive accessibility state. ContextMenu has no action busy API; none invented. |
| Destructive | danger label/dangerSoft surface and existing action safeguards. Disabled precedence remains unchanged. |
| Focused | Existing 2pt brandFocus outline with 2pt offset, existing focus traversal/return; no controller change. |
| Long/narrow | Natural line wrapping and measured content height, existing bounded scroll area, 8pt viewport clearance; last destructive action remains reachable. |

Action order, labels, IDs, callbacks, onOpen, trigger measurements, align=end, preferred width=240, native Back listener, focus effects, initial focus ref, outside dismissal and portal ownership are unchanged. An action still executes close(false), then requestAnimationFrame(action.onPress), ensuring the menu dismisses before a native alert/modal or navigation.

## E. Complete runtime delta for this phase

These are deltas against the saved start-of-phase files, not the cumulative diff against HEAD.

| File | Component/function | Before → after |
|---|---|---|
| src/components/status-text.tsx | StatusText | Legacy-only → optional appearance=v2, semantic UiText mapping; legacy path preserved |
| src/components/sheet-refresh-notice.tsx | SheetRefreshNotice | No appearance parameter → forwards optional appearance to existing FormError and Retry refresh |
| src/components/adaptive-sheet.tsx | AdaptiveSheet | SheetRefreshNotice without props → appearance forwarded; this phase changes exactly that invocation |
| src/components/form-selection-host.tsx | SelectionOverlay | v2 action surface/borderStrong → surfaceRaised/controlBorder, matching v2 selectors; layout/controller untouched |
| src/components/form-controls.tsx | FormButton props | tone brand-only → brand or neutral, forwarded through existing path; fields/selectors/errors untouched |
| src/components/design-system.tsx | UiButton | Adds neutral tone opt-in to quiet-label precedence; all existing non-opted-in behavior unchanged |
| src/components/context-menu.tsx | ContextMenu | Explicit v2 actions get neutral tone; initial estimate uses v2 48pt minimum/scaled typography; legacy estimate unchanged |
| src/features/finance/finance-screen.tsx | FinanceScreen notice/action error | Existing warning, Retry and action FormError now forward screen appearance |
| src/features/finance/work/work-management-screen.tsx | WorkManagementScreen notice | Existing warning/Retry explicitly v2 |
| src/features/tasks/tasks-screen.tsx | TasksScreen notices | Main joins already-v2 repeating/history notice/error/retry appearance; predicates unchanged |

## F. Caller coverage and preservation

The audit records 86 source occurrences across feedback, menu and refresh-provider declarations in audit.json (not 86 newly migrated components). Actual direct consumer edits are the three screen files above and AdaptiveSheet's notice invocation.

Existing explicit v2 ContextMenu consumers inherit the corrected shared surface/actions: Tasks options/categories/repeating/history; transaction rows/options and Finance category manager; commitment cards/details/history/options; Work clients/client details/job details/receipts/main; Fitness routines/exercises/rotation/workout menus; Journal options. These feature files were not rewritten.

Calendar's FormError and month selector were already explicit v2; their representative captures remain identical. Journal errors and empty Exercises composition remain source-owned. Refresh contexts in Tasks, Finance/transaction creation, Work management and Fitness retain their exact shape and lifecycle; only explicitly v2 AdaptiveSheets inherit the new appearance.

Preserved legacy areas include ordinary Task Edit, Task Actions/per-task occurrence history, older task/work rows, Manage Commitments, linked transaction details, Active Workout nested editors and source-screen fallback. A DesignProvider does not opt these into v2. No forced legacy migration or global Work History rebuild.

## G. Actual measurements and placement

RNWeb CSS-pixel/pt proxy at an 844pt viewport; native acceptance remains separate. Both themes give the same geometry.

| Fixture | Before | After | Interpretation |
|---|---|---|---|
| Regular 3-action v2 menu, 390pt | Panel x134 y68, 240×170; rows 48pt | Same | Settled layout already measured correctly; surface/text change only |
| Initial 3-row estimate, 1× | 162pt | 170pt | Matches 3×48 + 2×4 gap + 16 padding + 2 border |
| Initial 3-row estimate, 2× | 162pt | 212pt | 22pt line height ×2 + 16 padding + 2 border = 62pt row; multiline still measured by host |
| Long-label menu, 2×, 320pt | x8 y68, 304×432 | Same | Natural text reflow; final Delete 62pt tall and reachable |
| Long-label menu, 2×, 390pt | x8 y68, 374×300 | Same | No fixed text height or arbitrary clipping offset |
| Long-label menu, 2×, 430pt | x8 y68, 414×300 | Same | Width bounded by original viewport calculation |
| Legacy 3-action menu, 390pt | x134 y64, 240×158; 44pt rows | Same | Legacy appearance and geometry preserved |
| Sheet Retry refresh, 390pt | x16 y685, 358×44 | x16 y681, 358×48 | Natural bottom-anchored sheet grows 4pt upward; draft field remains y781/48pt |
| Feedback specimen at 430pt/2× | Retry y532/62pt | y572/62pt | Canonical text font causes natural 40pt cumulative reflow; no reserved height |

At 320pt normal text the long-label menu measures 240×206 (84pt long first row, then two 48pt rows). Bottom menu measures x64 y606, 240×170 and its last action ends y767, within the viewport. Browser matrix tests both themes, 320/390/430pt and 1×/2× for long/bottom menus and retries. No horizontal overflow, clipped final actions or stale menu ownership observed. Existing heading, separator, maximum-height, keyboard/safe-area/anchor algorithms are untouched.

## H. Semantic and owner preservation

The original error predicates/messages and Retry/reload references are unchanged. SheetRefreshNotice returns null as soon as its source error clears; a retry clears the fixture source and leaves the unsaved actual TextInput value intact. No dedupe or data identity policy was added. Disabled action checks and native confirmations remain source-owned. Existing FormError field associations, live regions, selected selector values and unavailable states are preserved. Native alert appearance is intentionally outside this token migration.

An integrity audit compares 3,201 initial file hashes: 3,190 unchanged; exactly the ten runtime paths above and one authorized prior-test expectation changed. AST/text guards verify AdaptiveModal, SheetViewport, modal Back handler, sheet-scroll ownership, FormSelectionHost/FormScrollView/focusFormControl, field/selector/error implementations, UiPressable/DesignProvider and ContextMenu effects/deferred action handler remain unchanged against the initial copies.

## I. Visual comparisons and skill contributions

[Before/after gallery](shared-feedback-menus/index.html): 50 identical-fixture pairs, 100 PNGs, both themes. Frozen before build captured before runtime edits. Baseline and after use the same fonts, source fixtures, frame dimensions, motion/caret suppression and RNWeb native-boundary proxies.

Coverage: feedback and legacy feedback; sheet refresh and legacy refresh; feature empty state; Calendar; regular/long/bottom/edge/large/pressed/focused menus; legacy menus; actual TaskOptions, TransactionRow, WorkFinancialSummary, ExerciseLibraryCard and JournalHeader contexts; real selector selection. 13/50 pairs are byte-identical and 46/50 have identical recorded control geometry. Legacy feedback/refresh/menus, Calendar, empty state and selector pairs are identical. Fitness light is also identical because the applicable light surface aliases already coincide and Archive remains destructive.

Expected differences: v2 menu panels raised/neutral; standard labels neutral, danger preserved; propagated sheet notice uses canonical error/font/boundary/48pt retry. Feedback-large 430pt reflows naturally with the canonical font. No unexplained visual or runtime difference remained in the reviewed fixtures. Browser review is not a native screenshot claim.

Skills actively used:

- frontend-design: preserved editorial hierarchy and feature-owned compositions; treated status as supporting interface text rather than new banners/cards.
- Impeccable: direct paired comparison of surfaces, boundaries, alignment, spacing and legacy preservation; removed excessive copper emphasis from ordinary menu labels without adding decorative structure.
- UI/UX Pro Max: semantic color precedence, clear destructive/disabled distinction, 48pt targets, natural large-text wrapping, focus/selection verification. Local Python search was unavailable; applied installed guidance/Quick Reference without installing tools.
- Expo building-native-ui: checked installed SDK 58 and matching official documentation, retained native modal/Back/focus/keyboard/safe-area ownership and separated RNWeb evidence from native acceptance. References: https://docs.expo.dev/versions/v58.0.0/ and https://docs.expo.dev/llms.txt.

## J. Accessibility, keyboard and open issues

22 audited canonical contrast pairs pass their stated thresholds. Dark/light neutral menu text on raised surface: 13.41:1 / 16.07:1; boundary: 4.23:1 / 3.46:1; copper focus: 7.58:1 / 6.83:1. Semantic status text on canvas: green 10.89/5.89, amber 10.69/5.68, danger 9.79/6.42, info 11.39/5.90. Disabled text on inset is 7.31/4.59. These are token-pair measurements, not a blanket audit of every composited feature background.

The 46 browser interaction/layout groups pass: actual typing/retry preservation, source-cleared removal, disabled callback rejection, one menu owner, initial focus, keyboard traversal past disabled action, outside/Escape dismissal and focus return, dismissal-before-action, rapid open/close cycles, selector value/check and all geometry matrices. The native harness also checks menu-first onRequestClose in an AdaptiveModal-owned flow.

Important labels/status wording remain alongside semantic color; no important distinction depends on newly added color alone. ContextMenu remains an action-button list. Announcements and error IDs are preserved rather than fabricated.

Still open, explicitly not fixed here: [follow-up requirements](shared-feedback-menus-followups.md).

1. VU-05/VU-07 bare-host RNWeb typing Escape may be consumed by TextInput; AdaptiveModal-owned existing keyup path works. No broad key-event workaround added.
2. VU-05 constrained-height header: 320pt, doubled text, synthetic long editorial title + keyboardTop520 can produce a 706pt fixed header and Save y641+62 below keyboard. Baseline also fails (y513+58). Not accepted or closed. Existing S.1 screenshots/interaction evidence retained. Follow-up requires realistic production title inventory, native iOS/Android reproduction, usable viewport measurement and an independently tested constrained-height solution only if justified.

Physical/device acceptance still needed: VoiceOver/TalkBack announcements and focus return, real Dynamic Type/font scaling, real keyboard/IME, edge and bottom anchors within modal coordinate systems, Android hardware Back, system safe areas and native tab clearance. Exports and browser proxies do not prove these.

## K. Tests and validation

Timezone: America/Sao_Paulo.

| Check | Result |
|---|---|
| Initial full suite | 1,518 passed; 0 failed/skipped, 82.61s |
| New test file | 23 passed; semantic mapping both themes, legacy paths, refresh/error/retry/draft, action order/disabled/destructive/dismissal, neutral opt-in, modal request-close |
| Existing shared focused run | 103 passed |
| Final focused shared + feature regressions | 281 passed, 0 failed/skipped, 35.15s |
| Final full suite | 1,541 passed, 0 failed/skipped, 73.12s |
| Browser checks | 46 groups passed; no recorded runtime errors |
| TypeScript | Passed |
| Changed-file ESLint | Passed; 0 diagnostics across ten runtime files, two tests and four scripts |
| Full ESLint | Still six inherited errors and two inherited warnings; exact baseline comparison, zero introduced diagnostics |
| iOS export | Passed, Hermes bundle generated |
| Android export | Passed, Hermes bundle generated |
| git diff --check | Passed |
| Scope/integrity audit | Passed; owners/controllers/callbacks retained, no staged files |

Full ESLint inherited errors: react/no-children-prop in context-menu.test.ts (3), navigation-conventions.test.ts (2), transactions-experience.test.ts (1). Inherited warnings: two unused variables in tasks-experience.test.ts. No suppressions or unrelated cleanup.

One earlier concurrent focused run failed Tasks' immediate confirmation assertion (tasks-experience.test.ts:293, Expected a confirmation) while the real action is deferred to requestAnimationFrame. That runner subsequently stalled and was stopped after identifying its exact processes. An attempted rerun could not acquire its log, so its stale exit marker was not treated as evidence. Preserved logs: focused-tests-first.log, focused-tests.log. The unchanged Tasks file passed isolated (23/23); the final separate-log serial focused run passed 281/281; final full suite passed 1,541/1,541. No callback timing, confirmation policy or assertion changed. This timing sensitivity remains a test-harness follow-up, not a proven production defect.

Both baseline and final full logs contain 66 React act warnings. No warnings suppressed. Logs/exports/frozen builds are ignored artifacts in dist/shared-feedback-menus; durable visual/interaction/audit evidence is in docs/design-system/shared-feedback-menus.

Prior shared-sheets-headers.test.ts changed one expectation only: action panel surface → surfaceRaised. This is the authorized S.2 contract, not weakened coverage; exact restoration verifies no other prior assertion changed.

## L. File inventory

Runtime: all ten paths in section E.

Tests: new tests/shared-feedback-menus.test.ts; one expectation updated in existing tests/shared-sheets-headers.test.ts.

Scripts: scripts/preview-shared-feedback-menus.ts, scripts/review-shared-feedback-menus.cjs, scripts/check-shared-feedback-menus.cjs, scripts/audit-shared-feedback-menus.cjs.

Documentation: this report; shared-feedback-menus-followups.md; shared-feedback-menus/index.html; shared-feedback-menus/{initial-state,before,after,visual-comparison,interaction-validation,audit}.json. audit.json contains the exact expanded added-file inventory and 86 source occurrences.

Screenshots (100): each before/ and after/ directory contains the same 50 files. At 390pt in both themes: feedback, legacy-feedback, refresh, legacy-refresh, empty, calendar, menu, menu-long, menu-bottom, legacy-menu, tasks, finance, work, fitness, journal, selection, menu-pressed, menu-focused (36). At 320/430pt both themes: menu-edges (4), feedback-large (4). At 320/390/430pt both themes: menu-large (6). Naming: case-theme-width.png. This specifies every generated image without an ambiguous directory-only inventory.

Total phase-created files: 114 (100 PNGs, 7 evidence/gallery files, report + follow-up, 4 scripts, 1 new test). No other initial file changed. Prior evidence preserved; no asset/dependency/schema/persistence change.

## M. Next-phase readiness

Explicit v2 feedback/menu primitives are ready for targeted feature migration subject to native acceptance. This phase completes its explicit appearance propagation, semantic mapping, action surface/text and initial menu estimate subitems.

- VU-05 remains partial: v2 sheet refresh fixed; constrained-height header and native acceptance open.
- VU-07 remains partial: shared feedback paths fixed; ordinary Task Edit/Task Actions/per-task History and bare-host Escape still deferred.
- VU-13 remains partial: v2 initial action-menu estimate now matches control geometry; other legacy/native geometry acceptance is not closed here.
- VU-19 remains partial: explicit shared statuses/errors/retry addressed; feature-specific legacy empty/error compositions remain in their scheduled migrations.

Recommended next prompt: targeted ordinary Task Edit + Task Actions/per-task Occurrence History migration, with explicit appearance and source status/action preservation, after native smoke acceptance of these shared primitives. Then linked transaction details/Manage Commitments, followed by Active Workout nested editors. Keep bare-host web Escape and constrained-height native investigation as separate bounded tasks. Broader Fitness identity, startup/branding and code-quality cleanup remain later phases. No new domain/dependency blocker found; do not declare the open keyboard/header stress cases accepted.

## N. Git state

Initial: main at 16ebeab46d20e7a943f08fa017928ce0eb884c0e, 29 modified tracked paths and 654 untracked files. Final: 35 modified tracked paths and 768 untracked files (counts expand directories with git status --untracked-files=all). Exactly 114 files added in this phase; four runtime paths were already modified, six are newly modified tracked paths, and the prior S.1 test was already untracked. All original files/work preserved except the eleven authorized initial-file changes described above. Nothing staged; HEAD unchanged; no commit or push.

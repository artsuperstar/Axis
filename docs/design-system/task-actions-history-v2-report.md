# Phase 3D-T.2 — Task Actions and Per-task Occurrence History

Implemented 2026-11-13 as two independently validated slices. No commit, push or staging.

## A. Summary and scope

TaskActions and OccurrenceHistory now explicitly use the completed Soft Copper v2 sheet, operational typography, button and feedback contracts. The two component files are the only runtime changes. Their source callbacks, action predicates, status/date/version derivation, history reads, paging and update functions are preserved.

Main Tasks, New Task, existing Task Edit, Calendar, Finance, Work, Fitness, Journal, Home, native tabs, shared components, palette, dependencies, schema and persistence were not changed. Previous documentation and visual evidence remain untouched.

Reviewed the current visual-unification audit, Soft Copper specification/migration plan/traceability, shared controls/sheets/feedback reports and feedback follow-ups, and the Task Edit migration report. Original IDs VU-07, VU-05, VU-10, VU-13 and VU-19 remain the issue references.

## B. Root causes

Both feature components rendered AdaptiveSheet without appearance. They also used legacy ThemedText, status/error feedback and buttons without explicit v2 appearance. The source screen's DesignProvider does not implicitly migrate these controls. OccurrenceHistory additionally read its row separator color from useTheme rather than the canonical design palette.

No shared architecture change was necessary. Explicit feature-local opt-in reaches existing default v2 headers, Back controls and inherited SheetRefreshNotice. Operational titleRole avoids introducing large editorial headings for long saved task names and historical data.

## C. Runtime changes

| File/component | Before | After |
|---|---|---|
| src/features/tasks/components/task-actions.tsx / TaskActions | Legacy sheet/default header; ThemedText group/date labels; legacy status/error/buttons | AdaptiveSheet appearance=v2, titleRole=operational; UiText cardTitle/secondary; v2 StatusText/FormError and all original buttons |
| src/features/tasks/components/occurrence-history.tsx / OccurrenceHistory | Legacy sheet, ThemedText rows/empty state; legacy error/retry/status/actions; useTheme separator | Explicit operational v2 sheet; UiText cardTitle/metadata/body; semantic v2 feedback/actions; useDesignColors separator |

No new props/API, provider, wrapper hierarchy, badges, statistics, icons, action menu or route were added. Original gap/padding/row border layout remains; shared controls contribute their approved geometry. Both sheets inherit font/Reduced Motion context from the existing source screen. The isolated browser gallery supplies its own DesignProvider solely as a review boundary.

## D. Task Actions: sources, actions and checkpoint

Actual TaskActions entry: TasksScreen renderRow → TaskRow/TaskListRow onActions → setActionItem(item), setActionsOpen(true). The parent resolves shownActions from the current snapshot by stable key, falling back to the selected item. Calendar opens the source Task Edit first; after its existing dismissal, the retained source TasksScreen exposes the same list/actions. There is no new direct Calendar-to-Actions route.

Repeating Tasks and global Task History use their existing explicit-v2 contextual actions and/or direct History buttons; they do not need an invented TaskActions entry. Per-task History remains reachable from those existing surfaces.

| Source state | Existing ordered actions, excluding Back |
|---|---|
| Ordinary task, pending or completed | Edit task; Delete task |
| Occurrence pending/missed | Skip occurrence; Edit recurring task; View History; Delete recurring task |
| Occurrence skipped | Return to pending; Edit recurring task; View History; Delete recurring task |
| Occurrence completed | Edit recurring task; View History; Delete recurring task; no Skip |
| Stopped series | Labels/availability still depend on item.occurrence, not a newly invented stopped predicate. A selected old occurrence retains recurring actions; no-occurrence item retains ordinary labels |

TaskActions has no disabled/busy action API. None was manufactured for a visual specimen. Its visibility, errors and callbacks remain parent-owned. Delete remains destructive; native Delete task?/Delete repeating task? confirmation and soft deletion are still owned by TasksScreen. Skip/Return to pending call the same selected occurrence callback.

Edit/History handoff remains TasksScreen.fromManagement: queue callback, dismiss Actions, then on iOS wait for native onClosed; other platforms use the existing deferred callback. No handoff, focus, scroll, native Back or dirty-state policy changed. Edit remains the migrated v2 editor; Cancel discards without a new prompt, Save targets the original task ID.

**Slice 1 checkpoint, before history changed:** 87 focused tests passed; 14 browser interaction/layout groups passed; 10 two-theme captures reviewed. A hash check confirmed OccurrenceHistory was still identical to the initial file. Tests covered exact action order/callbacks, state availability, semantic Delete, native request-close, iOS dismissal-before-editor and Save/Cancel identity. Source checkpoint is preserved in slice1-checkpoint.json. TaskActions was not modified again after that checkpoint.

## E. Occurrence History: historical truth and performance

The original initial effect calls readPage() outside render. TasksScreen supplies access.readHistory(historyId, before). The unchanged access materializes a 30-day date window, orders scheduledDate/createdAt descending, and includes early resolved future outcomes on the first page. Subsequent pages use an exclusive before cursor and move backward. The unchanged older() appends by occurrence ID through the existing Map deduplication and nextBefore end detection. change() updates only the returned occurrence ID in local state.

Rows still use taskRowPresentation(task, entry, recurrences, categories, now), including the occurrence's own recurrenceId. Displayed scheduled date/time, historical recurrence pattern, source outcome, derived missed status and Previous schedule label have not been replaced with current-rule summaries.

**Exact read-only contract:** entry.deletedAt !== null hides every status action and adds Previous schedule. Older recurrence version alone is not the read-only predicate. Nondeleted occurrences from earlier versions keep their original permissions. No disabled buttons were added to read-only rows.

| Mutable occurrence status | Existing actions |
|---|---|
| Completed | Reopen → pending |
| Skipped | Complete → completed; Return to pending → pending |
| Pending, including derived missed | Complete → completed; Skip → skipped |
| Deleted historical occurrence | No mutation controls |

Missed remains source-derived pending-in-the-past; it is not automatically skipped. Error messages, immediate row updates, source occurrence IDs, retry cursor and absence of extra confirmations are unchanged.

The fixture and new tests use real SQLite task access to create a weekly rule, an early completed future occurrence, then a changed two-day recurrence. The obsolete early completed occurrence is retained with its original version and read-only deletion flag. Current completed/skipped/pending/missed rows, older pages and different recurrence patterns are all present.

**Existing performance architecture is preserved:** this per-task component already mapped accumulated entries inside AdaptiveSheet's ScrollView; it was not virtualized before this phase. It remains paged and mapped. Global Task History's virtualized SectionList is untouched. No dataset flattening, query/cache rewrite or new virtualization claim. Large accumulated per-task histories remain a VU-15 profiling follow-up, not a performance refactor in this batch.

Slice 2 passed 109 focused tests before final validation. Source keys retain existing row nodes when older data appends; status changes do not refetch/rebuild the history dataset. Browser paging and final-row reachability passed. AdaptiveSheet's existing scroll-offset/keyboard/inset ownership is byte-unchanged; no new scroll-restoration policy was introduced.

## F. Shared design system

- AdaptiveSheet: explicit appearance=v2, titleRole=operational; existing 20pt sheet radius and native ownership.
- UiText: Manrope sheetTitle 18/24, cardTitle 16/24, metadata for dense recurrence/status labels, secondary for supporting date, body for unchanged empty text. No new Lora archive headings.
- Canvas #151315 / #F5F0EA; textPrimary #F6F0ED / #241E1C; existing neutral separator token.
- Shared buttons: 48pt minimum; copper #E7AA8B / #874833 for quiet interactions/focus, existing neutral secondary treatment and danger/dangerSoft for Delete.
- StatusText preserves original tone predicates: missed/attention amber, resolved/archive supporting text subdued, neutral secondary. Completed history was previously subdued and remains so; no new green badge was invented. Existing success/danger semantics elsewhere are untouched.
- FormError/TaskError and inherited SheetRefreshNotice keep source errors, alert/live-region and Retry callbacks.

No global defaults, typography, colors, selectors or menu states changed. Tasks indigo identity remains in its existing legitimate content roles.

Skills applied: frontend-design kept a compact operational archive consistent with Tasks v2; Impeccable guided paired typography/surface/spacing review and restrained grouping; UI/UX Pro Max guided destructive affordances, source read-only restrictions, noncolor status wording and touch/focus checks; Expo building-native-ui guided SDK58 native sheet/Back/handoff/inset preservation and separation of browser evidence from device acceptance. Existing project/user ownership requirements take precedence over generic suggestions to restructure navigation.

SDK checked against installed Expo ~58.0.17 and official references: https://docs.expo.dev/versions/v58.0.0/ and https://docs.expo.dev/llms.txt.

## G. Visual review and geometry

[Compact paired gallery](task-actions-history-v2/index.html): 28 before/after pairs, 56 PNGs. Baseline captured before runtime edits. The 10 Slice 1 action captures are reused in the final gallery; no redundant second checkpoint screenshot set.

Both themes cover ordinary/completed/recurring/stopped Actions; realistic long Actions title at 320pt/2×; mixed historical versions/statuses; empty/error/retry; older-page content at 430pt; long History title at 320pt/2×. Preservation controls use actual existing Task Edit, actual TasksScreen with a review-only source hook boundary, Calendar-derived TasksScreen initialTaskId, and an unrelated shared v2 sheet. Actual Calendar navigation remains covered by unchanged integration regressions; no browser native-stack claim.

All eight preservation pairs are byte-identical: edit/main/calendar/unrelated in dark/light. The 20 migrated pairs intentionally change font/palette/control geometry. Manual review included normal recurring Actions and mixed History in dark mode; automated layout checks cover both themes and all required widths/scales. No unexplained difference remains in the reviewed set.

Measurements are RNWeb CSS-pixel/pt proxies, viewport height844:

| Fixture | Before | After |
|---|---|---|
| Ordinary Actions Delete, 390pt | x16 y785, 358×44 | x16 y781, 358×48 |
| Ordinary Actions title | System 18/24, y635 | Manrope18/24, y629 |
| History Back, 390pt | 46.09×44, y25 | Icon-only48×48, y21 |
| History title | System18/24, x70.09 y35 | Manrope18/24, x72 y33 |
| First History Reopen | y181, 44pt height | y177, 48pt height |
| History action-row interval | 157pt in recorded ordinary rows | 161pt; 4pt increase from target geometry |
| Long Actions title, 320pt/2× | Side-by-side header title384pt tall | Existing stacked v2 header; operational title336pt tall, Back48pt |
| Long Actions final Delete after scroll | Legacy screenshot initially below viewport | Browser-verified y722/106pt, ends828; fully reachable |

Content-driven wrapped labels grow; no fixed text height, clipping workaround, negative margin or arbitrary inset was added. No keyboard is opened by Actions/History themselves because they have no text field. Edit handoff's keyboard/picker ownership remains unchanged.

## H. Accessibility

Both themes at320/390/430pt and1×/2× passed14 Actions and14 History browser groups. Checks include native-boundary callbacks, long-title reflow, final action reachability, visible2pt focus outline, selected source IDs, paging/retry, mutation updates and Edit Cancel without Save. Native hardware/IME/screen-reader behavior is not established by browser tests.

Canonical text contrast on canvas, dark/light: primary16.38/14.51, secondary10.08/5.52, muted7.53/4.86, attention10.69/5.68. Shared danger text on dangerSoft retains6.89/5.87; established control boundaries/focus retain the shared contrast contract. These are token-pair measurements, not a new blanket composite-background audit.

Text labels preserve Completed/Skipped/Missed/Pending and Previous schedule distinctions; color alone carries no new permission/status meaning. Original accessible row description, action subjects, required source IDs and reading order remain. Read-only historical rows have absent mutation actions rather than misleading disabled affordances. Existing Reduced Motion handling remains unchanged.

Physical acceptance pending: VoiceOver/TalkBack row grouping/announcements, native focus, Android Back/iOS dismissal, real text scaling and long title lengths, safe areas, bottom reachability, repeated handoff, real keyboard reveal after Edit and mounted OS appearance changes.

## I. Tests and validation

Timezone America/Sao_Paulo.

| Check | Result |
|---|---|
| Initial full baseline | 1,552 passed, 0 failed; 83.95s |
| New tests | 19 total:14 Task Actions +5 History |
| Slice1 checkpoint | 87 passed, 0 failed |
| Slice2 checkpoint | 109 passed, 0 failed |
| Focused regressions | 305 passed, 0 failed/skipped; 48.56s |
| Final full suite | 1,571 passed, 0 failed/skipped; 133.93s |
| Browser checks | 14 Actions +14 History groups passed |
| TypeScript | Passed after correcting a test's nullable recurrence assertion |
| Changed-file ESLint | Passed: zero errors, two inherited unused-variable warnings; no new diagnostics |
| Full ESLint | Same six inherited errors and two warnings; exact comparison |
| iOS export | Passed |
| Android export | Passed |
| git diff --check / scope audit | Passed |

Inherited lint errors: react/no-children-prop in context-menu.test.ts3, navigation-conventions.test.ts2 and transactions-experience.test.ts1. Inherited warnings: two unused variables in tasks-experience.test.ts. No suppression, removed test or weakened assertion.

An initial final-run request was not executed because automatic approval review hit a usage limit. After user continuation, the same approval flow succeeded and the tests/exports above ran. No approval bypass was used.

## J. React act warning investigation

Previous S.2 full suite:66 warnings. T.1 full suite and this phase's actual initial baseline:70. Do not redefine70 as the original baseline.

Ordered baseline comparison identifies exactly four extra DesignProvider warning sites: two History detail-to-editor tests in task-history-v2.test.ts, the History body-edit test in task-row-disclosure.test.ts, and the iOS onClosed-to-editor test in tasks-experience.test.ts. A process-local trace (console output retained) reaches motion.ts:18:89: AccessibilityInfo.isReduceMotionEnabled().then resolves and calls setReduced while the provider is mounted, after synchronous act has ended.

T.1's11 new integration tests alone emitted zero warnings. An isolated Tasks-experience old/new appearance comparison emitted3 in both variants; that isolated file alone does not explain the full-suite delta. Full ordered reports identify the four sites, and the targeted correction verifies the causal test scheduling issue.

Correction: wrap only those four editor-opening event calls in async act so the preference-resolution microtask settles within act. All assertions and source callbacks are unchanged. No shared harness, production provider, Reduced Motion implementation or console filter changed. The existing active=false cleanup guard remains, and this trace is not evidence of a runtime lifecycle leak.

Final full count is back to66, removing the four extra warnings. Remaining inherited warnings are still visible. The completed focused log contains7; Slice1/Slice2 each2. Full details, trace examples, limits and isolated counts are preserved in warning-investigation.json and ignored raw logs. Remaining warnings and prior concurrent confirmation timing sensitivity remain test-reliability follow-ups; no unrelated framework refactor.

## K. Complete file inventory

Runtime: task-actions.tsx and occurrence-history.tsx above.

Tests: new task-actions-v2.test.ts and occurrence-history-v2.test.ts; four async-act wrappers across task-history-v2.test.ts, task-row-disclosure.test.ts and tasks-experience.test.ts; task-edit-migration.test.ts's prior legacy-Actions appearance expectation/comment/name updated to the newly authorized v2 contract, with destructive/edit assertions retained.

Scripts: preview-task-actions-history.ts, review-task-actions-history.cjs, check-task-actions-history.cjs, audit-task-actions-history.cjs.

Documentation: this report; task-actions-history-v2/index.html; task-actions-history-v2/{initial-state,before,slice1,after,comparison,actions-interactions,history-interactions,slice1-checkpoint,warning-investigation,audit}.json.

Screenshots:56 files. Each before/after directory has the following14 cases in dark/light: actions390, actions-completed390, actions-recurring390, actions-stopped390, actions-long320, history390, history-empty320, history-error390, history-paged430, history-long320, edit390, main390, calendar390, unrelated390. Naming case-theme-width.png. Exact expanded inventory is in audit.json.

Total new durable files74:56 PNGs,10 JSONs,1 gallery,1 report,4 scripts,2 tests. Raw logs, traces, source snapshots, builds and exports remain in ignored dist/task-actions-history-v2. No old report or evidence changed.

## L. Open issues

- Bare-host RNWeb typing Escape remains open under VU-05/VU-07; these two sheets have no text entry. Existing working modal-owned dismissal path and keyboard ownership remain intact.
- Extreme320pt/doubled-text/long-editorial-title/keyboard header issue remains open. Realistic operational long titles passed this phase without a keyboard; no universal header fix or acceptance is implied. Prior706pt-header evidence remains untouched in shared-feedback-menus-followups.md and S.1 artifacts.
- Native acceptance listed above remains required; exports/browser captures do not close it.
- VU-15: per-task History retains its existing paged but accumulated nonvirtualized map; profile before any separately scoped optimization.
- Remaining66 act warnings and historical concurrent-test timing sensitivity remain visible follow-ups.

## M. Audit status

VU-07's TaskActions/per-task History presentation subitems are implemented and validated in automation/browser evidence. Overall finding remains partial pending native acceptance and any remaining legacy source fallback work; global Task History was not rebuilt. VU-05 shared defaults, VU-10 operational typography, VU-13 control geometry and VU-19 feedback are adopted locally, not globally closed. VU-01 Task Edit remains preserved. VU-15 profiling remains deferred.

## N. Phase3D-M handoff: linked transaction details / Manage Commitments

| Target/source | Active entry / legacy problem | Narrow next work |
|---|---|---|
| src/features/finance/components/transaction-detail.tsx / TransactionDetail | Linked TransactionRow View details → FinanceScreen linkedDetail. Legacy AdaptiveSheet, ThemedText summary/amount/date/jobs/note, legacy Open Work/Open Commitments and Edit details buttons | Explicit v2 operational sheet/feedback/button/typography roles. Preserve source-kind fields, signed amount/category semantics, covered jobs, optional note and both callbacks |
| src/features/finance/finance-screen.tsx | Owns linkedDetailOpen, closeDetail/detailClosed, detail-to-editor/source-workspace navigation | Propagate only required appearance. Preserve iOS dismissal queue, setSourceWorkspace guard and destination based on source.kind; no unrestricted linked payment editing |
| src/features/finance/commitments/components/commitments-view.tsx / manage surface and seriesRow | Commitments options → Manage commitments. Legacy in-place header, ThemedText rows/amount/schedule, StatusText, undefined menu/error appearance | Explicit manage-only v2 rows/header/status/menu/error. Keep existing SectionList, keys, batch/window settings, scroll offset, series actions and source predicates |

Shared dependencies ready: AdaptiveSheet operational titleRole, UiText, semantic StatusText/FormError, FormButton and ContextMenu explicit appearance, canonical palette and native modal handoff. No new hierarchy or global default is needed.

Behavior invariants: linked Work allocations/receipts and Commitment payments remain source-owned; centavo/sign/category/date logic unchanged; linked editing/deletion/undo restrictions retained. Manage series actions keep Edit, active-only confirmed Pause, canResume-only Resume, applicable noninstallment confirmed End and History. Keep resolved installment progress and the paused-installment cannot-resume guidance. Manage is an in-place list, not a new sheet. Global Commitment History/details/edit/payment/resume v2 screens are preservation controls.

Risks: converting linked records to manual transactions, breaking receipt allocation undo, changing category/source identity, wrong underlying workspace reopened after Home/Calendar entry, iOS modal races, mapping paused/ended/completed status to generic copper, losing virtualization/scroll offset or shortening historical schedule metadata.

Suggested order: audit real entry/action predicates; baseline and compact captures; migrate TransactionDetail with close-to-edit/source tests; independently migrate Manage-only presentation; preserve existing v2 obligation/history/detail screens; run linked transaction deletion/undo, Work allocation, Commitment pause/resume/end/installment, Finance navigation/refresh/scroll, narrow/large-text, native handoff and complete validation. Do not implement this Finance work in the Tasks phase.

## O. Git state

Initial: main at16ebeab46d20e7a943f08fa017928ce0eb884c0e,35 modified tracked paths,833 untracked files, nothing staged. Final:40 modified tracked paths,907 untracked files. Two new modified runtime paths and three previously clean tracked test paths account for the five-path increase. T.1's already-untracked test changed only its authorized Actions appearance assertion/name/comment.

Of3,380 initial files,3,374 remain byte-identical; the six changed initial paths are the two runtime files and four test paths described above. AST guards verify source handlers and history read/update functions unchanged; exact reverse replacements verify the four async-act changes. Shared/domain/navigation/editor files and all prior evidence preserved.74 new files. HEAD unchanged; nothing staged; no commit or push.

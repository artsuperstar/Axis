# Axis screen and presentation inventory

Audit snapshot: `16ebeab`, 12 November 2026. [Report](visual-unification-audit.md) · [Atlas](atlas/index.html) · [Source inventory](source-inventory.json)

`v2` means current v2 foundations are used, not that every descendant is migrated. `Mixed` identifies an active legacy descendant or theme bridge. Capture IDs link to dark examples; the atlas contains the corresponding light examples. “Source only” is an explicit coverage gap, not native acceptance.

## Home

Owner: [home-screen.tsx](../../src/features/home/home-screen.tsx), [home-content.tsx](../../src/features/home/components/home-content.tsx), [home-artwork.tsx](../../src/features/home/components/home-artwork.tsx), [home-background.tsx](../../src/features/home/components/home-background.tsx).

| Surface/state | Present implementation | Evidence / coverage |
|---|---|---|
| Home v2.2 collapsed | v2; five photographic assets; theme-specific textures; content-sized grid | [home](atlas/home-dark.png) |
| Today / Attention expansion | v2; row-anchored contextual content pushes subsequent cards | [Today](atlas/home-today-dark.png), [Attention](atlas/home-attention-dark.png) |
| Empty / loading / source-read failure | Current artwork retained; retry/error present | [empty](atlas/home-empty-light.png), [loading](atlas/home-loading-dark.png), [error](atlas/home-error-light.png) |
| Fitness / Journal cards | Direct source navigation, not disclosure panels | Source navigation callbacks in `home-content.tsx`; destination previews in atlas; actual Router transition source only |
| Spending shortcut / plus | Source-owned Transactions / transaction creation adapters | Source only for transition; destination and editor captured |
| Home source route | `home-source.tsx` → shared SourceScreen → Tasks/Finance/Fitness | Source only; inherits destination's mixed/v2 state |

## Tasks

Owner: [tasks-screen.tsx](../../src/features/tasks/tasks-screen.tsx), [components](../../src/features/tasks/components).

| Surface/state | Present implementation | Evidence / coverage |
|---|---|---|
| Main workspace: Earlier, Today, To-do, Upcoming | v2; virtualized workspace; contextual disclosures and interactive completion | [tasks](atlas/tasks-dark.png); static source render omits live native navigation |
| New Task / recurrence configuration | v2 editor and separate recurrence surface; frequency, interval, weekdays, monthly/yearly, end rules remain domain-owned | [task-new](atlas/task-new-dark.png); recurrence subvariants source reviewed, not individually recaptured |
| Edit ordinary existing Task | **Legacy** when invoked from main Tasks; creation being v2 does not migrate this branch | [aux-task-edit](atlas/aux-task-edit-dark.png); `task-editor.tsx:63–77`, `tasks-screen.tsx:178` |
| Edit schedule from Repeating Tasks | v2 explicitly passed by caller | [task-repeating](atlas/task-repeating-dark.png); editor branch source verified |
| Categories creation / custom / built-in / actions | v2 controls and rows | [task-categories](atlas/task-categories-light.png); destructive native alerts source only |
| Repeating Tasks: Active / Stopped / counts / menus | v2; source recurrence schedule semantics preserved | [task-repeating](atlas/task-repeating-light.png) |
| Completed and Skipped archive | v2 SectionList; scheduled-date and historical recurrence-version metadata; interactive reopen | [task-history](atlas/task-history-light.png); lower rows scroll beyond first viewport |
| Task Actions sheet | **Legacy** sheet, typography, buttons | [aux-task-actions](atlas/aux-task-actions-dark.png) |
| Per-task Occurrence History | **Legacy**, distinct from global Task History v2 | [aux-occurrence-history](atlas/aux-occurrence-history-light.png), empty state; populated branch source only |
| Task options, skip/delete confirmations, date/time pickers | Shared ContextMenu / selection infrastructure; native Alert and date/time boundaries | Source reviewed; native alert/picker appearance not captured |
| Failure / deleted source | Mixed shared TaskError/Retry fallback, including main workspace | `tasks-screen.tsx:139–140`; source only |

## Calendar

Owner: [calendar-screen.tsx](../../src/features/calendar/calendar-screen.tsx), [appearance.ts](../../src/features/calendar/appearance.ts), [components](../../src/features/calendar/components).

| Surface/state | Present implementation | Evidence / coverage |
|---|---|---|
| Month / selected day / agenda / Today / previous-next month | v2 neutrals with legacy green selection and categorical blue/amber/teal markers | [calendar](atlas/calendar-dark.png), [light](atlas/calendar-light.png) |
| Empty selected-day agenda | v2 surface and message | [calendar-empty](atlas/calendar-empty-light.png); adjacent month still truthfully contains markers |
| Month/year chooser | v2 body; shared default sheet header still legacy | `components/month-chooser.tsx:23`; source only |
| Create / source row / context menu | Source-owned Task, Commitment, Work destinations; completion stays interactive | `day-agenda.tsx`, `calendar-screen.tsx`; source only for native navigation |
| Calendar source route | Shared SourceScreen owns native stack title and launches source screens | `source-screen.tsx`; source only |

## Finance: Overview, Transactions, Categories

Owner: [finance-screen.tsx](../../src/features/finance/finance-screen.tsx), [components](../../src/features/finance/components).

| Surface/state | Present implementation | Evidence / coverage |
|---|---|---|
| Overview: Week / Month / Year; period arrows | v2 shared controls; actual chart grouping logic preserved | [finance-overview](atlas/finance-overview-dark.png) |
| Net / Income / Expenses / Cash Flow interval details | v2 with component-local financial palette and responsive summaries | [financial comparison](atlas/compare-financial.png); long/empty detail semantics source reviewed |
| Spending donut / category legend / view-all drill-down | v2; categorical series independent from action tint | `expense-donut-chart.tsx`, `finance-dashboard.tsx`; lower content beyond first viewport, source reviewed |
| No chart transactions | Truthful empty chart and zero summary | [finance-overview-empty](atlas/finance-overview-empty-light.png) |
| Transactions list / type filter / search / paging / FAB | v2; explicit row options; category resolver iconography | [transactions](atlas/transactions-dark.png), [empty](atlas/transactions-empty-light.png); filtered-query results source only |
| Transaction row options, including linked payment deletion | v2 ContextMenu; real actions depend on source | [transactions-menu](atlas/transactions-menu-light.png) |
| New / Edit Transaction | v2 sections, required fields, amount, note, category/date | [new](atlas/transaction-new-light.png), [edit](atlas/transaction-edit-dark.png) |
| Transaction category menu / inline new category | v2 shared anchored selection; inline name form inherits appearance | [transaction-category-menu](atlas/transaction-category-menu-dark.png); inline submission source only |
| Linked Work / Commitment payment details | **Legacy** TransactionDetail sheet and buttons; linked source actions preserved | [aux-linked](atlas/aux-linked-dark.png) shows a real synthetic Work receipt; Commitment-specific wording source only |
| Finance Categories: built-in / custom / archived | v2 library; built-in read-only; custom archive/restore behavior retained | [built-in](atlas/finance-categories-light.png), [custom](atlas/finance-categories-custom-dark.png), [archived](atlas/finance-categories-archived-light.png) |
| Category creation / rename / archive actions | v2 creation and contextual custom actions | `category-manager.tsx:100–136`; native confirmation source only |
| Initial/follow-up read error, retry, stale snapshot | Some default legacy status/control branches remain | `finance-screen.tsx`, SheetRefreshNotice; source only for each feature-specific failure |

## Finance: Commitments

Owner: [commitments-view.tsx](../../src/features/finance/commitments/components/commitments-view.tsx), [components](../../src/features/finance/commitments/components).

| Surface/state | Present implementation | Evidence / coverage |
|---|---|---|
| Main obligations: Upcoming / Overdue / payment actions | v2 compact responsive cards, type icons, amounts and source metadata | [commitments](atlas/commitments-dark.png); global-history fixture also contains paused/ended source series |
| Manage commitments | **Legacy** header, series rows, separators, status and menu defaults | [commitments-manage](atlas/commitments-manage-dark.png) |
| New / Edit Bill, Subscription, Installment | v2 shared editor with schedule/type conditional fields | [new bill](atlas/commitment-new-light.png), [edit bill](atlas/commitment-edit-dark.png); other type branches source only |
| Payment Confirmation | v2 summary/payment sections; actual payment amount distinct from expectation | [commitment-payment](atlas/commitment-payment-dark.png) |
| Resume paused series | v2 summary/schedule/help; does not imply backfill of paused months | [commitment-resume](atlas/commitment-resume-light.png) |
| Details: current schedule, historical schedules, unpaid occurrences | v2 read-only version rows and actionable unpaid cards | [commitment-details](atlas/commitment-details-light.png) |
| Individual history: paid / skipped / completed installment / undo / reopen | v2 timeline; real resolved records only | [commitment-history](atlas/commitment-history-dark.png) |
| Global Commitment History index | v2 index cards; includes ended, paused, completed and active commitments with resolved history | [commitment-global-history](atlas/commitment-global-history-dark.png) |
| Series/context actions / delete/skip/end/pause confirmations | Shared v2 and remaining Manage legacy menus; native confirmation boundary | Source reviewed; native alert appearance not captured |

## Finance: Work

Owner: [work-view.tsx](../../src/features/finance/work/components/work-view.tsx), [work-management-screen.tsx](../../src/features/finance/work/work-management-screen.tsx), [components](../../src/features/finance/work/components).

| Surface/state | Present implementation | Evidence / coverage |
|---|---|---|
| Work main: Outstanding / Earned / Received / Needs Attention / open work | v2 with legacy green feature/semantic bridge | [work](atlas/work-dark.png) |
| New / Edit Work: hourly/fixed, date, expected payment, category | v2 shared sections, custom compact editor title | [new](atlas/work-new-light.png), [edit](atlas/work-edit-dark.png); lower compensation branches source reviewed |
| Record Payment: client, multiple allocations, payment date, income category, total | v2; allocations retained rather than mockup's single-work simplification | [work-payment](atlas/work-payment-dark.png); zero selection is truthful, Confirm disabled |
| Job Details: financial summary, dates, client, description, receipts | v2 compact detail; no invented client/description interaction | [work-job](atlas/work-job-light.png); empty receipts captured |
| Clients Management: create entry, search, active, archived, menus | v2, source-owned balances and archival behavior | [work-clients](atlas/work-clients-dark.png); rename/new inline sheet source reviewed |
| Client Details v2 | v2 summary/actions/open work/history; actual totals and active/archive state | [work-client](atlas/work-client-light.png) |
| **Global Work History** | **Confirmed v2**, not awaiting redesign: DesignProvider, UiText, GroupSurface, v2 menus, SectionList paging | [work-history](atlas/work-history-dark.png), [light](atlas/work-history-light.png); `work-history-list.tsx:61–78`, `work-history-cards.tsx:29–70` |
| Client History | Same v2 list/cards, but default WorkSheet header inherits legacy AdaptiveSheet header | [work-client-history](atlas/work-client-history-light.png) |
| Receipt options / Undo, archive/restore/delete work/client, refresh error | v2 receipt controls; some shared legacy errors/header defaults | Source reviewed; native destructive confirmation and keyboard/focus behavior pending |

## Fitness

Owner: [fitness-screen.tsx](../../src/features/fitness/fitness-screen.tsx), [rotations-screen.tsx](../../src/features/fitness/rotations-screen.tsx), [components](../../src/features/fitness/components).

| Surface/state | Present implementation | Evidence / coverage |
|---|---|---|
| Workout landing / routine selection / next / last workout | v2; **current copper fitnessAccent**, not globally emerald | [fitness-workout](atlas/fitness-workout-light.png); static source render |
| Active Workout / exercise progress / set table | v2 workout surface and copper actions | [fitness-active](atlas/fitness-active-dark.png); static source render |
| Routines: Active / Archived / rotation summary / menus | v2 rose controls and tiles | [fitness-routines](atlas/fitness-routines-light.png); archived branch source reviewed |
| New / Edit Routine / targets / exercise order / remove | v2 editor, conditional boundary buttons, Add Exercise selection | [fitness-routine-editor](atlas/fitness-routine-editor-dark.png); new, targets and picker submodes source reviewed |
| Routine Add Exercise picker / search / create | v2 dedicated RoutineExercisePicker; **different from active-workout AddExerciseSheet** | `routine-exercise-picker.tsx`; source reviewed, builder rebuilt |
| Workout Rotations / Rotation Editor | v2 list and editor; active state and next routine remain domain-derived | [rotations](atlas/fitness-rotations-dark.png), [editor](atlas/fitness-rotation-editor-light.png) |
| Exercises / search / Active / Archived / New Exercise / detail | v2 library and top-level editor (explicit appearance); generic measurement-type icons | [fitness-exercises](atlas/fitness-exercises-light.png); detail and New submodes source reviewed |
| Workout History / Completed workout detail | v2 date sections/cards; completed records read-only | [fitness-history](atlas/fitness-history-dark.png), [fitness-completed](atlas/fitness-completed-light.png) |
| Set Editor / logged duration-distance fields | **Legacy**, including field/keyboard/error and delete controls | [aux-set](atlas/aux-set-dark.png); strength captured, other measurements source reviewed |
| Session/exercise Note Editor | **Legacy** AdaptiveSheet, FormField, error | [aux-note](atlas/aux-note-light.png) |
| Active Workout Add Exercise / inline create | **Legacy** sheet/autocomplete/create path; does not invalidate v2 Routine picker | [aux-add-exercise](atlas/aux-add-exercise-dark.png) |
| Archive / finish / discard / remove / delete-set alerts | Native Alert, source-owned wording and destructive designation | `fitness-screen.tsx:78–123`; source only |

## Journal

Owner: [journal-screen.tsx](../../src/features/journal/journal-screen.tsx), [journal-history-screen.tsx](../../src/features/journal/journal-history-screen.tsx), [components](../../src/features/journal/components).

| Surface/state | Present implementation | Evidence / coverage |
|---|---|---|
| Writing Editor / previous-next / mood / save | v2 neutral surfaces with intentional quiet green mapping | [journal](atlas/journal-light.png) |
| Restored draft / unsaved-state messaging | Existing editor state machine retained | [journal](atlas/journal-dark.png); fixture supplies a recovered draft |
| Day at a Glance: Tasks / Workout / Finance | v2 expandable activity cards; source-owned totals; revealed content below writing area | [journal-context](atlas/journal-context-light.png); source verified lower content, not all visible in first viewport |
| Journal History / month headings / paged entries / excerpt | v2 typography/rows, currently ScrollView with append (not virtualized) | [journal-history](atlas/journal-history-dark.png) |
| Conflict / delete / leave unsaved / save failure | Explicit editor conflict/leave state and native Alert boundary | `editor.ts`, `journal-leave.tsx`, `journal-editor.tsx`; source only, no screenshot acceptance |

## Global UI and additional discovered surfaces

| Surface | Current ownership / styling | Evidence / coverage |
|---|---|---|
| Native tabs (five destinations) | SDK 58 NativeTabs, v2 color hooks, SF/Material native icons | `src/components/app-tabs.tsx:4–48`; **source only**, no fake tab bar added to previews |
| Native stack / source adapter header | Root ThemeProvider still legacy; source adapter sets actual stack titles | `_layout.tsx:11–20`, `features/source-screen.tsx:12–19`; native transitions not captured |
| AdaptiveModal / AdaptiveSheet | Existing measured keyboard/focus/scroll owner; v2 canvas opt-in; shared outer radius/default header remain legacy | `adaptive-sheet.tsx:93–164`; [aux-refresh](atlas/aux-refresh-dark.png) |
| FormSelectionHost / InlineNameForm / SelectField / autocomplete | Shared focus and portal ownership; optional v2 appearance must be propagated | [transaction-category-menu](atlas/transaction-category-menu-light.png), `form-controls.tsx`, `form-selection-host.tsx`, `autocomplete-field.tsx` |
| Primary / secondary / quiet / navigation / destructive / disabled controls | Two active visual systems; v2 touch minimum 48, legacy 44 | [aux-controls](atlas/aux-controls-light.png) |
| ContextMenu / menu host | Anchored v2 and legacy variants; source-owned action availability | [transactions-menu](atlas/transactions-menu-dark.png); `context-menu.tsx` |
| Date/time picker, alerts, keyboard, screen-reader focus | Native boundaries; Platform-specific adapters and Alert calls | Source reviewed, **not browser-verified** |
| Refresh notice inside all sheets | Legacy error and Retry refresh even in v2 sheets | `sheet-refresh-notice.tsx:15–16`; [aux-refresh](atlas/aux-refresh-light.png) |
| Database startup / initialization failure / retry | **Legacy ThemedView/ThemedText**, system-font subtitle and 44-point retry | `database/database-provider.tsx:43–72`; source only; no database failure deliberately induced |
| Invalid Home/Calendar source request | Bare default FormError outside full v2 shell | `features/source-screen.tsx:12`; source only |
| Native splash / app icon / Android launch backdrop | Config still white/black splash and blue adaptive icon backdrop | `app.json`; source only, preserve approved art pending separate decision |

## Compatibility exclusions

The [reachability audit](reachability.json) follows local imports, route re-exports and literal dynamic imports. It is module-level evidence, not a whole-program dead-code proof.

- `src/components/tab-screen.tsx` and `src/features/finance/work/components/work-row.tsx` have no discovered production import path. Their old styles are not counted as active screen defects.
- `src/hooks/use-color-scheme.web.ts` is a platform resolver variant; static graph non-reachability does **not** establish dead code.
- Generated migration `.js/.d.ts` files are tooling artifacts, not visual surfaces.
- Legacy `financeChartColors` in `chart-presentation.ts` is not the active Overview color resolver; current charts use `overview-presentation.ts`.
- The AST has 161 raw color literals across all source modules, **including canonical token definitions**. This is an inventory count, not 161 hardcoding bugs.

## Route modules

There are 18 modules, including two navigator layouts and two source adapter routes. The generated table below records all of them. All unpictured OS states above remain explicitly unverified.

| Module | Implementation import |
|---|---|
| [(tabs)/calendar.tsx](../../src/app/(tabs)/calendar.tsx) | `@/features/calendar/calendar-screen` |
| [(tabs)/finance.tsx](../../src/app/(tabs)/finance.tsx) | `@/features/finance/finance-screen` |
| [(tabs)/fitness.tsx](../../src/app/(tabs)/fitness.tsx) | `@/features/fitness/fitness-screen` |
| [(tabs)/index.tsx](../../src/app/(tabs)/index.tsx) | `@/features/home/home-screen` |
| [(tabs)/tasks.tsx](../../src/app/(tabs)/tasks.tsx) | `@/features/tasks/tasks-screen` |
| [(tabs)/_layout.tsx](../../src/app/(tabs)/_layout.tsx) | `@/components/app-tabs` |
| [calendar-source.tsx](../../src/app/calendar-source.tsx) | `@/features/calendar/source-screen` |
| [fitness/rotation.tsx](../../src/app/fitness/rotation.tsx) | `@/features/fitness/rotations-screen` |
| [fitness/rotations.tsx](../../src/app/fitness/rotations.tsx) | `@/features/fitness/rotations-screen` |
| [home-source.tsx](../../src/app/home-source.tsx) | `@/features/home/source-screen` |
| [journal/history.tsx](../../src/app/journal/history.tsx) | `@/features/journal/journal-history-screen` |
| [journal.tsx](../../src/app/journal.tsx) | `@/features/journal/journal-screen` |
| [tasks/history.tsx](../../src/app/tasks/history.tsx) | `@/features/tasks/tasks-screen` |
| [tasks/repeating.tsx](../../src/app/tasks/repeating.tsx) | `@/features/tasks/tasks-screen` |
| [work/clients.tsx](../../src/app/work/clients.tsx) | `@/features/finance/work/work-management-screen` |
| [work/history.tsx](../../src/app/work/history.tsx) | `@/features/finance/work/work-management-screen` |
| [work/index.tsx](../../src/app/work/index.tsx) | `@/features/finance/finance-screen` |
| [_layout.tsx](../../src/app/_layout.tsx) | `@/database/database-provider`, `@/hooks/use-color-scheme`, `@/hooks/use-theme` |

## Fresh capture register

Each case has dark and light evidence. All use an 844 CSS-pixel viewport height; scrolling content can extend below the pictured viewport. CSS pixels approximate phone width; they are not physical native points. `2?` means synthetic CSS font scaling plus fontScale layout branching, not OS Dynamic Type.

| Case | Width | Text | Dark | Light |
|---|---:|---|---|---|
| home | 390 | normal | [image](atlas/home-dark.png) | [image](atlas/home-light.png) |
| home-today | 390 | normal | [image](atlas/home-today-dark.png) | [image](atlas/home-today-light.png) |
| home-attention | 390 | normal | [image](atlas/home-attention-dark.png) | [image](atlas/home-attention-light.png) |
| home-empty | 390 | normal | [image](atlas/home-empty-dark.png) | [image](atlas/home-empty-light.png) |
| home-error | 390 | normal | [image](atlas/home-error-dark.png) | [image](atlas/home-error-light.png) |
| home-loading | 390 | normal | [image](atlas/home-loading-dark.png) | [image](atlas/home-loading-light.png) |
| tasks | 390 | normal | [image](atlas/tasks-dark.png) | [image](atlas/tasks-light.png) |
| task-new | 390 | normal | [image](atlas/task-new-dark.png) | [image](atlas/task-new-light.png) |
| task-categories | 390 | normal | [image](atlas/task-categories-dark.png) | [image](atlas/task-categories-light.png) |
| task-repeating | 390 | normal | [image](atlas/task-repeating-dark.png) | [image](atlas/task-repeating-light.png) |
| task-history | 390 | normal | [image](atlas/task-history-dark.png) | [image](atlas/task-history-light.png) |
| calendar | 390 | normal | [image](atlas/calendar-dark.png) | [image](atlas/calendar-light.png) |
| calendar-empty | 390 | normal | [image](atlas/calendar-empty-dark.png) | [image](atlas/calendar-empty-light.png) |
| finance-overview | 390 | normal | [image](atlas/finance-overview-dark.png) | [image](atlas/finance-overview-light.png) |
| finance-overview-empty | 390 | normal | [image](atlas/finance-overview-empty-dark.png) | [image](atlas/finance-overview-empty-light.png) |
| transactions | 390 | normal | [image](atlas/transactions-dark.png) | [image](atlas/transactions-light.png) |
| transactions-empty | 390 | normal | [image](atlas/transactions-empty-dark.png) | [image](atlas/transactions-empty-light.png) |
| transaction-new | 390 | normal | [image](atlas/transaction-new-dark.png) | [image](atlas/transaction-new-light.png) |
| transaction-edit | 390 | normal | [image](atlas/transaction-edit-dark.png) | [image](atlas/transaction-edit-light.png) |
| finance-categories | 390 | normal | [image](atlas/finance-categories-dark.png) | [image](atlas/finance-categories-light.png) |
| commitments | 390 | normal | [image](atlas/commitments-dark.png) | [image](atlas/commitments-light.png) |
| commitments-manage | 390 | normal | [image](atlas/commitments-manage-dark.png) | [image](atlas/commitments-manage-light.png) |
| commitment-new | 390 | normal | [image](atlas/commitment-new-dark.png) | [image](atlas/commitment-new-light.png) |
| commitment-edit | 390 | normal | [image](atlas/commitment-edit-dark.png) | [image](atlas/commitment-edit-light.png) |
| commitment-payment | 390 | normal | [image](atlas/commitment-payment-dark.png) | [image](atlas/commitment-payment-light.png) |
| commitment-resume | 390 | normal | [image](atlas/commitment-resume-dark.png) | [image](atlas/commitment-resume-light.png) |
| commitment-details | 390 | normal | [image](atlas/commitment-details-dark.png) | [image](atlas/commitment-details-light.png) |
| commitment-history | 390 | normal | [image](atlas/commitment-history-dark.png) | [image](atlas/commitment-history-light.png) |
| work | 390 | normal | [image](atlas/work-dark.png) | [image](atlas/work-light.png) |
| work-new | 390 | normal | [image](atlas/work-new-dark.png) | [image](atlas/work-new-light.png) |
| work-edit | 390 | normal | [image](atlas/work-edit-dark.png) | [image](atlas/work-edit-light.png) |
| work-payment | 390 | normal | [image](atlas/work-payment-dark.png) | [image](atlas/work-payment-light.png) |
| work-job | 390 | normal | [image](atlas/work-job-dark.png) | [image](atlas/work-job-light.png) |
| work-clients | 390 | normal | [image](atlas/work-clients-dark.png) | [image](atlas/work-clients-light.png) |
| work-client | 390 | normal | [image](atlas/work-client-dark.png) | [image](atlas/work-client-light.png) |
| work-history | 390 | normal | [image](atlas/work-history-dark.png) | [image](atlas/work-history-light.png) |
| work-client-history | 390 | normal | [image](atlas/work-client-history-dark.png) | [image](atlas/work-client-history-light.png) |
| fitness-active | 390 | normal | [image](atlas/fitness-active-dark.png) | [image](atlas/fitness-active-light.png) |
| fitness-routines | 390 | normal | [image](atlas/fitness-routines-dark.png) | [image](atlas/fitness-routines-light.png) |
| fitness-exercises | 390 | normal | [image](atlas/fitness-exercises-dark.png) | [image](atlas/fitness-exercises-light.png) |
| fitness-history | 390 | normal | [image](atlas/fitness-history-dark.png) | [image](atlas/fitness-history-light.png) |
| fitness-completed | 390 | normal | [image](atlas/fitness-completed-dark.png) | [image](atlas/fitness-completed-light.png) |
| fitness-rotations | 390 | normal | [image](atlas/fitness-rotations-dark.png) | [image](atlas/fitness-rotations-light.png) |
| fitness-rotation-editor | 390 | normal | [image](atlas/fitness-rotation-editor-dark.png) | [image](atlas/fitness-rotation-editor-light.png) |
| journal | 390 | normal | [image](atlas/journal-dark.png) | [image](atlas/journal-light.png) |
| journal-context | 390 | normal | [image](atlas/journal-context-dark.png) | [image](atlas/journal-context-light.png) |
| journal-history | 390 | normal | [image](atlas/journal-history-dark.png) | [image](atlas/journal-history-light.png) |
| home-attention-320-double | 320 | 2? | [image](atlas/home-attention-320-double-dark.png) | [image](atlas/home-attention-320-double-light.png) |
| home-attention-430 | 430 | normal | [image](atlas/home-attention-430-dark.png) | [image](atlas/home-attention-430-light.png) |
| calendar-320-double | 320 | 2? | [image](atlas/calendar-320-double-dark.png) | [image](atlas/calendar-320-double-light.png) |
| calendar-430 | 430 | normal | [image](atlas/calendar-430-dark.png) | [image](atlas/calendar-430-light.png) |
| finance-overview-320-double | 320 | 2? | [image](atlas/finance-overview-320-double-dark.png) | [image](atlas/finance-overview-320-double-light.png) |
| finance-overview-430 | 430 | normal | [image](atlas/finance-overview-430-dark.png) | [image](atlas/finance-overview-430-light.png) |
| transactions-320-double | 320 | 2? | [image](atlas/transactions-320-double-dark.png) | [image](atlas/transactions-320-double-light.png) |
| transactions-430 | 430 | normal | [image](atlas/transactions-430-dark.png) | [image](atlas/transactions-430-light.png) |
| work-client-320-double | 320 | 2? | [image](atlas/work-client-320-double-dark.png) | [image](atlas/work-client-320-double-light.png) |
| work-client-430 | 430 | normal | [image](atlas/work-client-430-dark.png) | [image](atlas/work-client-430-light.png) |
| journal-context-320-double | 320 | 2? | [image](atlas/journal-context-320-double-dark.png) | [image](atlas/journal-context-320-double-light.png) |
| journal-context-430 | 430 | normal | [image](atlas/journal-context-430-dark.png) | [image](atlas/journal-context-430-light.png) |
| fitness-workout | 390 | normal | [image](atlas/fitness-workout-dark.png) | [image](atlas/fitness-workout-light.png) |
| fitness-routine-editor | 390 | normal | [image](atlas/fitness-routine-editor-dark.png) | [image](atlas/fitness-routine-editor-light.png) |
| fitness-routine-editor-320-double | 320 | 2? | [image](atlas/fitness-routine-editor-320-double-dark.png) | [image](atlas/fitness-routine-editor-320-double-light.png) |
| fitness-routine-editor-430 | 430 | normal | [image](atlas/fitness-routine-editor-430-dark.png) | [image](atlas/fitness-routine-editor-430-light.png) |
| aux-task-edit | 390 | normal | [image](atlas/aux-task-edit-dark.png) | [image](atlas/aux-task-edit-light.png) |
| aux-task-actions | 390 | normal | [image](atlas/aux-task-actions-dark.png) | [image](atlas/aux-task-actions-light.png) |
| aux-occurrence-history | 390 | normal | [image](atlas/aux-occurrence-history-dark.png) | [image](atlas/aux-occurrence-history-light.png) |
| aux-linked | 390 | normal | [image](atlas/aux-linked-dark.png) | [image](atlas/aux-linked-light.png) |
| aux-set | 390 | normal | [image](atlas/aux-set-dark.png) | [image](atlas/aux-set-light.png) |
| aux-note | 390 | normal | [image](atlas/aux-note-dark.png) | [image](atlas/aux-note-light.png) |
| aux-add-exercise | 390 | normal | [image](atlas/aux-add-exercise-dark.png) | [image](atlas/aux-add-exercise-light.png) |
| aux-refresh | 390 | normal | [image](atlas/aux-refresh-dark.png) | [image](atlas/aux-refresh-light.png) |
| aux-controls | 390 | normal | [image](atlas/aux-controls-dark.png) | [image](atlas/aux-controls-light.png) |
| commitment-global-history | 390 | normal | [image](atlas/commitment-global-history-dark.png) | [image](atlas/commitment-global-history-light.png) |
| transactions-menu | 390 | normal | [image](atlas/transactions-menu-dark.png) | [image](atlas/transactions-menu-light.png) |
| transaction-category-menu | 390 | normal | [image](atlas/transaction-category-menu-dark.png) | [image](atlas/transaction-category-menu-light.png) |
| finance-categories-custom | 390 | normal | [image](atlas/finance-categories-custom-dark.png) | [image](atlas/finance-categories-custom-light.png) |
| finance-categories-archived | 390 | normal | [image](atlas/finance-categories-archived-dark.png) | [image](atlas/finance-categories-archived-light.png) |

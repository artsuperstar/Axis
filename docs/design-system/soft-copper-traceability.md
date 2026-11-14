# Phase 2 traceability — the original 20 findings

No IDs, titles, priorities or evidence reclassified. Original descriptions/evidence below are preserved from the Phase 1 register. This is its resolution map, not an alternative register. See [migration plan](soft-copper-migration-plan.md) for exact files, tokens, tests and batch gates; [tokens](soft-copper/token-register.md) for bindings.

| ID | Original title | Priority | Components | Resolution | Batch / dependencies | Acceptance / approval |
|---|---|---|---|---|---|---|
| VU-01 | Ordinary existing Task edit | P1 | TaskEditor, TasksScreen, TaskButton/TaskField wrappers | Explicitly opt ordinary existing Task Edit into complete v2 presentation after primitives; use copper actions and neutral form boundaries. | 3D-T; VU-04, VU-05, VU-08, VU-10, VU-13 | Create/edit drafts, dates, recurrence picker/back, save/cancel, and unsaved state unchanged; dark/light/narrow/large edit matches New Task grammar. Approval: No additional design decision; implementation authorization still needed |
| VU-02 | Active Workout nested editors | P1 | fitness-forms.tsx, FitnessScreen, AutocompleteField, DurationFields, DistanceFields | Migrate set/note/active-workout Add Exercise and inline create to v2; propagate appearance through every measurement input. Keep RoutineExercisePicker separate. | 3D-F; VU-04, VU-05, VU-08, VU-11, VU-13 | All strength/bodyweight/duration/distance inputs remain optional as before; set completion, create/select return focus, delete and notes preserve behavior. Approval: Emerald identity mapping recommended; approve with VU-11 |
| VU-03 | Linked transaction details | P1 | TransactionDetail, FinanceScreen linked dialog | Neutral editorial sheet, copper Open source/Edit details; semantic signed amount and constrained linked-source actions unchanged. | 3D-M; VU-04, VU-05, VU-08 | Work and Commitment receipts open their real source; no unrestricted manual payment edit; linked deletion/undo semantics retained. Approval: No additional design decision; implementation authorization still needed |
| VU-04 | Resting v2 inputs / selects | P1 | FormField, FormSelect, AutocompleteField, selection triggers, amount/search fields | Use controlBorder for resting boundary, brandFocus for focus, danger for invalid; keep border for decoration. No blanket bright outlines. | 3B-I; VU-08, VU-09 | >=3:1 required boundary against both adjacent surfaces; >=4.5 text/placeholder; focus + error simultaneously visible; read-only/disabled distinct. Approval: Specification approval for stronger neutral boundaries |
| VU-05 | Shared v2 sheet defaults | P1 | AdaptiveSheet, BackButton, SheetRefreshNotice, WorkSheet, MonthChooser | Complete appearance propagation to default title/Cancel/Back/Save and sheet radius; custom headers and existing measurement/focus owner retained. | 3B-S; VU-08, VU-10, VU-13 | V2 defaults have Lora title and v2 controls; legacy appearance unchanged until explicit migration; keyboard, max-height, header measurement and dismissal unchanged. Approval: No new routing or sheet interaction approval needed |
| VU-06 | Manage Commitments | P2 | CommitmentsView manage header/seriesRow/ContextMenu | Targeted contained management rows using shared identity/status roles; keep all series state/actions and ordering. | 3D-M; VU-05, VU-08, VU-10, VU-13 | Active/paused/ended/completed distinctions and history entry/action availability preserved; no list/domain rewrite. Approval: No additional design decision |
| VU-07 | Task Actions / per-task history / error fallback | P2 | TaskActions, OccurrenceHistory, SheetRefreshNotice, screen errors, SourceScreen fallback | Shared notice receives resolved appearance; explicit v2 task action/history callers and readable fallback shells. Existing v2 archives remain. | 3B-S + 3D-T + 3C; VU-05, VU-08, VU-10 | One refresh notice, retained snapshot, correct retry and alert/focus behavior; global Task/Work History not rebuilt. Approval: No additional design decision |
| VU-08 | Color meaning / token ownership | P2 | design-system-v2.ts, useDesignColors, overviewColors, status/feature adapters | Extend the existing palette with semantic and feature roles/aliases; income distinct from expense/error; outstanding and pending neutral. | 3A; none | No literals outside canonical/adapters for approved roles; money/status outputs unchanged; exact token pairs pass; no second provider/system. Approval: Approve new soft status fills and explicit mappings as part of this specification |
| VU-09 | Theme selection by literal color | P2 | overview-presentation.ts, taskSectionSurface, useDesignColors callers | Use explicit light/dark mode or resolved palette field rather than canvas HEX equality. | 3A; none | Changing canvas in a test fixture cannot select wrong theme; existing chart grouping and Task surfaces unchanged before mapping. Approval: No design decision |
| VU-10 | Typography roles and compact titles | P2 | DesignTypography, UiText, compact editor/row title overrides | Named editorial, operational and compact roles; Lora display, Manrope data; preserve approved dense measurements. | 3A + 3B-S; none | Sizes/line heights follow spec with native font scaling; money stays tabular/readable; header growth measured, no global serif conversion. Approval: Approve named compact exceptions; no font change |
| VU-11 | Feature accents across entry/destination | P2 | Home artwork, Calendar appearance, Work/Fitness/Journal adapters, InternalNavigation | Copper shared selection/actions; retain Home art, task indigo/source markers, green Work and Journal identity; propose emerald Fitness identity. | 3C; VU-08, VU-09 | Status meaning never derived from feature hue; card artwork unchanged; Finance/Calendar interaction copper; source markers unchanged. Approval: Approve Fitness emerald across destination identity; keep quiet green Journal as recommended default |
| VU-12 | Native navigation / root backdrop | P2 | app/_layout.tsx, app-tabs.tsx, DatabaseProvider shell | Map native/root backdrop and tint to existing resolved copper palette without changing routes, tab triggers or safe areas. | 3C-N; VU-08, VU-09, VU-05 | No native transition seam in both themes; five tabs and original inset ownership/stack presentation preserved; actual device evidence required. Approval: No new navigation approval; native acceptance mandatory |
| VU-13 | Shared control geometry | P2 | UiButton, BackButton, ContextMenu, FormChoice, AdaptiveSheet styles | 48 minimum targets, 10 control radius/20 sheet radius for v2; full hit areas around small glyphs; min rather than fixed text height. | 3B-I + 3B-S; VU-08 | >=48 native hit regions without overlap; large text grows naturally; visible density retained; menu estimates use resolved target size. Approval: No additional design decision beyond specification approval |
| VU-14 | Narrow / doubled-text financial and Home layouts | P2 | Home/Finance/Client/Calendar/Routine/Journal responsive presentation only | Reproduce suspected browser proxy issues with OS scaling before fixing; preserve intentional wrapping, stacking and horizontal internal navigation. | 4 (investigate from each batch); VU-04, VU-05, VU-10, VU-13 | 320/390/430 normal/doubled and real OS large text usable; complete money text and last control reachable; no artificial Home reservation or focus-scroll regression. Approval: No speculative layout approval request; fix only evidence-backed defects |
| VU-15 | Long Journal / occurrence archives | P2 | Journal history presentation, per-task OccurrenceHistory | Profile representative long archives; only then propose a separate virtualization change if needed. | 4 profile gate; none | Measured dataset/device/frame/memory evidence; paging/focus/scroll state preserved; no automatic virtualization rewrite in theme migration. Approval: Only required if profiling justifies a separate behavior/performance scope |
| VU-16 | Startup visual identity | P2 | DatabaseProvider startup, app.json splash/adaptive/iOS icon config | Align startup UI neutrals first. Separate approved-star icon pipeline once actual selected source exists; do not edit startup lifecycle. | 3C-N + 3E asset gate; VU-12 | No data reset/retry regression; app startup/splash in both themes; app icon reviewed on native platforms, Expo placeholders explicitly replaced only later. Approval: Approved artwork/source required; native launch visual review |
| VU-17 | Native acceptance coverage | P2 | Native verification matrix and affected paths | Collect real iPhone/Android evidence for tabs/back/sheets/pickers/IME/scaling/screen readers/Reduced Motion/performance. | 4; All implementation batches | Functional suites, native screenshots, action/focus acceptance and exports documented; browser evidence never substituted for hardware acceptance. Approval: Device testing/access coordination, not a new design decision |
| VU-18 | Icon and tile dimensions | P3 | UiIcon consumers, EditorSection tiles, native tab symbols | Document inline16/support20/control24 and tile36/48 roles; retain justified type-specific sizes and glyph vocabulary. | 3B specs + 4 polish; VU-13 | No unrelated glyph replacement; OS tab symbols unchanged; visual glyph size decoupled from48 hit target. Approval: No new icon-system approval |
| VU-19 | Empty/error composition | P3 | FormError/StatusText, feature inline/contained/blocking feedback | Shared feedback role/state/spacing contracts; preserve feature composition, wording and source retry. | 3B-S + 3C + 4 polish; VU-07, VU-10 | Empty/loading/error distinguishable, live alerts not duplicated, action names clear; no identical generic card wrapper everywhere. Approval: No additional design decision |
| VU-20 | Design context documentation | P3 | PRODUCT.md, future approved design reference, existing design-system docs | Update only separately scoped context docs to SDK58 and approved role architecture after spec approval; preserve original audit evidence. | 3A-doc + final handoff; none | Current product context accurate; approved/proposed distinction explicit; no historical evidence overwritten. Approval: Approval of this specification precedes authoritative context updates |

## VU-01 — Ordinary existing Task edit (P1)

**Original description:** Main Tasks passes undefined appearance; existing task takes legacy sheet, green buttons, system type and flat form

**Original convention:** New Task and repeating-task edit already use editorial v2

**Original evidence:** [task-editor.tsx:63](../../src/features/tasks/components/task-editor.tsx#L63), [caller:178](../../src/features/tasks/tasks-screen.tsx#L178), [dark image](atlas/aux-task-edit-dark.png) vs [New](atlas/task-new-dark.png)

**Original affected scope:** TaskEditor, TasksScreen, Task control wrappers. Original risk: **High**: date/recurrence editing and unsaved state; appearance is coupled to layout branches

**Phase 2 resolution:** Explicitly opt ordinary existing Task Edit into complete v2 presentation after primitives; use copper actions and neutral form boundaries.

**Dependencies / batch:** VU-04, VU-05, VU-08, VU-10, VU-13 / 3D-T. **Risk:** High.

**Acceptance:** Create/edit drafts, dates, recurrence picker/back, save/cancel, and unsaved state unchanged; dark/light/narrow/large edit matches New Task grammar.

**Approval:** No additional design decision; implementation authorization still needed

## VU-02 — Active Workout nested editors (P1)

**Original description:** SetEditor, NoteEditor and AddExerciseSheet use legacy AdaptiveSheet, fields, autocomplete and buttons; logged duration/distance paths also omit v2

**Original convention:** Active Workout is v2 copper; Routine Add Exercise is already a separate v2 picker

**Original evidence:** [fitness-forms.tsx:181](../../src/features/fitness/components/fitness-forms.tsx#L181), [:195](../../src/features/fitness/components/fitness-forms.tsx#L195), [:219](../../src/features/fitness/components/fitness-forms.tsx#L219); [set](atlas/aux-set-dark.png), [note](atlas/aux-note-light.png), [add](atlas/aux-add-exercise-dark.png)

**Original affected scope:** Fitness forms, DurationFields/DistanceFields, autocomplete and Workout callers. Original risk: **High**: logging, keyboard, create-on-select, removal and returning focus

**Phase 2 resolution:** Migrate set/note/active-workout Add Exercise and inline create to v2; propagate appearance through every measurement input. Keep RoutineExercisePicker separate.

**Dependencies / batch:** VU-04, VU-05, VU-08, VU-11, VU-13 / 3D-F. **Risk:** High.

**Acceptance:** All strength/bodyweight/duration/distance inputs remain optional as before; set completion, create/select return focus, delete and notes preserve behavior.

**Approval:** Emerald identity mapping recommended; approve with VU-11

## VU-03 — Linked transaction details (P1)

**Original description:** Linked Work/Commitment receipts open green raised sheet, system title and old action buttons

**Original convention:** Manual transaction editor/list and source Work/Commitment details are v2

**Original evidence:** [transaction-detail.tsx:20](../../src/features/finance/components/transaction-detail.tsx#L20), [:37](../../src/features/finance/components/transaction-detail.tsx#L37), [capture](atlas/aux-linked-dark.png)

**Original affected scope:** TransactionDetail and Finance dialog caller. Original risk: **High**: do not allow unrestricted manual transaction editing or separate payment truth

**Phase 2 resolution:** Neutral editorial sheet, copper Open source/Edit details; semantic signed amount and constrained linked-source actions unchanged.

**Dependencies / batch:** VU-04, VU-05, VU-08 / 3D-M. **Risk:** High.

**Acceptance:** Work and Commitment receipts open their real source; no unrestricted manual payment edit; linked deletion/undo semantics retained.

**Approval:** No additional design decision; implementation authorization still needed

## VU-04 — Resting v2 inputs / selects (P1)

**Original description:** `border` on `surface` is **1.34:1 light / 1.43:1 dark**; fill vs group only **1.06 / 1.10**

**Original convention:** Identifiable editable boundaries should have sufficient contrast when needed to identify the control; focused border is much clearer

**Original evidence:** [form-controls.tsx:212](../../src/components/form-controls.tsx#L212), field branch in same file; [current measurements](current-contrast.json), [light editor](atlas/transaction-new-light.png)

**Original affected scope:** Semantic colors, FormField/FormSelect, search and amount inputs. Original risk: **Medium**: stronger edges affect every form; review both themes and error/focus/disabled states. Conditional non-text contrast concern, not a claim all low-contrast borders violate WCAG

**Phase 2 resolution:** Use controlBorder for resting boundary, brandFocus for focus, danger for invalid; keep border for decoration. No blanket bright outlines.

**Dependencies / batch:** VU-08, VU-09 / 3B-I. **Risk:** Medium.

**Acceptance:** >=3:1 required boundary against both adjacent surfaces; >=4.5 text/placeholder; focus + error simultaneously visible; read-only/disabled distinct.

**Approval:** Specification approval for stronger neutral boundaries

## VU-05 — Shared v2 sheet defaults (P1)

**Original description:** `appearance="v2"` changes canvas/border but default Back/Cancel/Save and ThemedText title stay legacy; outer corners always use legacy `Radius.overlay` 12 rather than v2 sheet token 20

**Original convention:** Equivalent custom v2 editor headers use UiText and v2 controls; opt-in should be complete

**Original evidence:** [adaptive-sheet.tsx:140–147](../../src/components/adaptive-sheet.tsx#L140), [:164](../../src/components/adaptive-sheet.tsx#L164), [Client History](atlas/work-client-history-light.png), [refresh fixture](atlas/aux-refresh-dark.png)

**Original affected scope:** AdaptiveSheet, BackButton, default-header callers including MonthChooser/WorkSheet. Original risk: **High**: header height drives sheet/keyboard measurement; avoid globally changing legacy branch

**Phase 2 resolution:** Complete appearance propagation to default title/Cancel/Back/Save and sheet radius; custom headers and existing measurement/focus owner retained.

**Dependencies / batch:** VU-08, VU-10, VU-13 / 3B-S. **Risk:** High.

**Acceptance:** V2 defaults have Lora title and v2 controls; legacy appearance unchanged until explicit migration; keyboard, max-height, header measurement and dismissal unchanged.

**Approval:** No new routing or sheet interaction approval needed

## VU-06 — Manage Commitments (P2)

**Original description:** Legacy series rows, green separator, system heading and default ContextMenu

**Original convention:** Same workspace's obligations, global index and deep details are v2

**Original evidence:** [commitments-view.tsx:104–122](../../src/features/finance/commitments/components/commitments-view.tsx#L104), [:146](../../src/features/finance/commitments/components/commitments-view.tsx#L146), [dark](atlas/commitments-manage-dark.png), [light](atlas/commitments-manage-light.png)

**Original affected scope:** CommitmentsView manage branch and row styles. Original risk: **Medium**: paused/ended/completed distinctions and future schedule actions

**Phase 2 resolution:** Targeted contained management rows using shared identity/status roles; keep all series state/actions and ordering.

**Dependencies / batch:** VU-05, VU-08, VU-10, VU-13 / 3D-M. **Risk:** Medium.

**Acceptance:** Active/paused/ended/completed distinctions and history entry/action availability preserved; no list/domain rewrite.

**Approval:** No additional design decision

## VU-07 — Task Actions / per-task history / error fallback (P2)

**Original description:** Active legacy Task sheets and default shared error/Retry controls survive inside v2 workflows; top-level Work error also uses StatusText/default button

**Original convention:** Source surfaces normally have v2 typography/control hierarchy

**Original evidence:** [TaskActions:19](../../src/features/tasks/components/task-actions.tsx#L19), [OccurrenceHistory:63](../../src/features/tasks/components/occurrence-history.tsx#L63), [SheetRefreshNotice:15](../../src/components/sheet-refresh-notice.tsx#L15), [Work screen:40](../../src/features/finance/work/work-management-screen.tsx#L40); [comparison](atlas/compare-legacy.png)

**Original affected scope:** Task action/history components, SheetRefreshContext presentation, screen error branches, SourceScreen invalid-request UI. Original risk: **Medium**: announcements, retry, focus and retained snapshots must survive; not a rewrite of global Task/Work History

**Phase 2 resolution:** Shared notice receives resolved appearance; explicit v2 task action/history callers and readable fallback shells. Existing v2 archives remain.

**Dependencies / batch:** VU-05, VU-08, VU-10 / 3B-S + 3D-T + 3C. **Risk:** Medium.

**Acceptance:** One refresh notice, retained snapshot, correct retry and alert/focus behavior; global Task/Work History not rebuilt.

**Approval:** No additional design decision

## VU-08 — Color meaning / token ownership (P2)

**Original description:** v2 has `danger`, `attention`, `info`, but no success/income/expense roles; local Overview colors and legacy success/green adapters fill the gap

**Original convention:** Brand, feature and financial/status meaning should be independently addressable

**Original evidence:** [design-system-v2.ts:4–23](../../src/constants/design-system-v2.ts#L4), [overview-presentation.ts:5](../../src/features/finance/overview-presentation.ts#L5), [work-main.tsx:58](../../src/features/finance/work/components/work-main.tsx#L58)

**Original affected scope:** Tokens, semantic hooks, Overview/transactions, status adapters. Original risk: **High**: money and payment states must not change; no inference from color or label text

**Phase 2 resolution:** Extend the existing palette with semantic and feature roles/aliases; income distinct from expense/error; outstanding and pending neutral.

**Dependencies / batch:** none / 3A. **Risk:** High.

**Acceptance:** No literals outside canonical/adapters for approved roles; money/status outputs unchanged; exact token pairs pass; no second provider/system.

**Approval:** Approve new soft status fills and explicit mappings as part of this specification

## VU-09 — Theme selection by literal color (P2)

**Original description:** Overview decides dark mode by `canvas === '#151315'`; Tasks surface resolver compares canvas to exact light token

**Original convention:** Theme identity should be explicit and independent of palette values

**Original evidence:** [overview-presentation.ts:5](../../src/features/finance/overview-presentation.ts#L5), [design-system-v2.ts:53](../../src/constants/design-system-v2.ts#L53)

**Original affected scope:** Overview presentation and taskSectionSurface. Original risk: **Medium**: palette migration can silently select wrong contrast family despite valid types

**Phase 2 resolution:** Use explicit light/dark mode or resolved palette field rather than canvas HEX equality.

**Dependencies / batch:** none / 3A. **Risk:** Medium.

**Acceptance:** Changing canvas in a test fixture cannot select wrong theme; existing chart grouping and Task surfaces unchanged before mapping.

**Approval:** No design decision

## VU-10 — Typography roles and compact titles (P2)

**Original description:** `editorSection` is Lora while same-size `sectionHeading` and `sheetTitle` are Manrope; title overrides repeat 22/30, 24/32, 20/28

**Original convention:** Editorial display vs dense operational hierarchy should be explicit rather than incidental role names

**Original evidence:** [UiText:42–47](../../src/components/design-system.tsx#L42), [Work forms:140](../../src/features/finance/work/components/work-forms.tsx#L140), [Job details:208](../../src/features/finance/work/components/work-job-details.tsx#L208), [Routine:27](../../src/features/fitness/components/routine-composition.tsx#L27)

**Original affected scope:** Typography tokens, UiText, local header overrides. Original risk: **Medium**: wrapping, baseline and measured header changes; compact exceptions can remain intentional

**Phase 2 resolution:** Named editorial, operational and compact roles; Lora display, Manrope data; preserve approved dense measurements.

**Dependencies / batch:** none / 3A + 3B-S. **Risk:** Medium.

**Acceptance:** Sizes/line heights follow spec with native font scaling; money stays tabular/readable; header growth measured, no global serif conversion.

**Approval:** Approve named compact exceptions; no font change

## VU-11 — Feature accents across entry/destination (P2)

**Original description:** Home Fitness emerald → Workout copper → Fitness management rose; Work main green tiles → Job/Client rose tiles; Home Journal plum → Journal green; Calendar combines green selection/rose controls

**Original convention:** Feature identity may vary by context, but mappings need a documented approved relationship

**Original evidence:** [Home artwork:16–20](../../src/features/home/components/home-artwork.tsx#L16), [Journal mapping:13](../../src/features/journal/components/journal-surface.tsx#L13), [Calendar appearance:7](../../src/features/calendar/appearance.ts#L7), [header comparison](atlas/compare-headers.png)

**Original affected scope:** Feature palette adapters and shared feature option. Original risk: **Medium–high**: intentional variation could be erased. **Decision**, not proof that every green is wrong

**Phase 2 resolution:** Copper shared selection/actions; retain Home art, task indigo/source markers, green Work and Journal identity; propose emerald Fitness identity.

**Dependencies / batch:** VU-08, VU-09 / 3C. **Risk:** Medium–high.

**Acceptance:** Status meaning never derived from feature hue; card artwork unchanged; Finance/Calendar interaction copper; source markers unchanged.

**Approval:** Approve Fitness emerald across destination identity; keep quiet green Journal as recommended default

## VU-12 — Native navigation / root backdrop (P2)

**Original description:** NativeTabs uses v2 canvas/tint; root ThemeProvider and DatabaseProvider use legacy backgrounds and primary

**Original convention:** Pushed transitions, root fallback and app content should share approved neutral/brand roles

**Original evidence:** [app-tabs.tsx:7](../../src/components/app-tabs.tsx#L7), [root:11–20](../../src/app/_layout.tsx#L11), [DatabaseProvider:43](../../src/database/database-provider.tsx#L43)

**Original affected scope:** Root theme adapter and startup presentation only. Original risk: **High**: native transition/background behavior must be tested. Possible seam, **no observed native flash claim**

**Phase 2 resolution:** Map native/root backdrop and tint to existing resolved copper palette without changing routes, tab triggers or safe areas.

**Dependencies / batch:** VU-08, VU-09, VU-05 / 3C-N. **Risk:** High.

**Acceptance:** No native transition seam in both themes; five tabs and original inset ownership/stack presentation preserved; actual device evidence required.

**Approval:** No new navigation approval; native acceptance mandatory

## VU-13 — Shared control geometry (P2)

**Original description:** Legacy touch minimum 44 vs v2 48; radii control 8 vs10, surface8 vs16/18; dimensions come from both imports

**Original convention:** Current v2 has a 48-unit interaction baseline and restrained shape hierarchy

**Original evidence:** [legacy tokens:75–77](../../src/constants/theme.ts#L75), [v2:26–29](../../src/constants/design-system-v2.ts#L26), [controls](atlas/aux-controls-light.png)

**Original affected scope:** Buttons, BackButton, ContextMenu, form choices, sheet corners. Original risk: **Medium**: row density, adjacent hit areas and platform dimensions. 44pt iOS is valid; 44dp Android needs examination

**Phase 2 resolution:** 48 minimum targets, 10 control radius/20 sheet radius for v2; full hit areas around small glyphs; min rather than fixed text height.

**Dependencies / batch:** VU-08 / 3B-I + 3B-S. **Risk:** Medium.

**Acceptance:** >=48 native hit regions without overlap; large text grows naturally; visible density retained; menu estimates use resolved target size.

**Approval:** No additional design decision beyond specification approval

## VU-14 — Narrow / doubled-text financial and Home layouts (P2)

**Original description:** Synthetic 320×2 captures show large vertical growth, wrapped currency/title, horizontally scrollable Finance subnav and Home initial scroll offset

**Original convention:** Whole labels/amounts should remain understandable and reachable without clipping or surprising focus jumps

**Original evidence:** [Client](atlas/work-client-320-double-light.png), [Finance](atlas/finance-overview-320-double-dark.png), [Home](atlas/home-attention-320-double-dark.png); fontScale branches in these owners

**Original affected scope:** Header/amount layout roles and affected feature styles **only if reproduced**. Original risk: **High if guessed**: browser CSS scaling/focus differs from native. This is an investigation item, not a proven native failure

**Phase 2 resolution:** Reproduce suspected browser proxy issues with OS scaling before fixing; preserve intentional wrapping, stacking and horizontal internal navigation.

**Dependencies / batch:** VU-04, VU-05, VU-10, VU-13 / 4 (investigate from each batch). **Risk:** High if guessed.

**Acceptance:** 320/390/430 normal/doubled and real OS large text usable; complete money text and last control reachable; no artificial Home reservation or focus-scroll regression.

**Approval:** No speculative layout approval request; fix only evidence-backed defects

## VU-15 — Long Journal / occurrence archives (P2)

**Original description:** Journal history appends entries in ScrollView; per-task occurrence history maps loaded rows

**Original convention:** Large operational archives elsewhere use virtualized paged lists

**Original evidence:** [journal-history-screen.tsx](../../src/features/journal/journal-history-screen.tsx), [journal-history.tsx](../../src/features/journal/components/journal-history.tsx), [occurrence-history.tsx](../../src/features/tasks/components/occurrence-history.tsx), [Journal capture](atlas/journal-history-dark.png)

**Original affected scope:** Journal/Task occurrence presentation, not data services. Original risk: **Medium**: scroll restoration/paging/focus; no measured jank claimed

**Phase 2 resolution:** Profile representative long archives; only then propose a separate virtualization change if needed.

**Dependencies / batch:** none / 4 profile gate. **Risk:** Medium.

**Acceptance:** Measured dataset/device/frame/memory evidence; paging/focus/scroll state preserved; no automatic virtualization rewrite in theme migration.

**Approval:** Only required if profiling justifies a separate behavior/performance scope

## VU-16 — Startup visual identity (P2)

**Original description:** Database loading/error use ThemedView/ThemedText compatibility styles; app splash white/black and adaptive-icon backdrop blue

**Original convention:** Warm parchment/charcoal content is established after startup

**Original evidence:** [database-provider.tsx:51–72](../../src/database/database-provider.tsx#L51), [app.json](../../app.json)

**Original affected scope:** Startup presentation and config, separately approved. Original risk: **Medium**: startup/splash timing, accessibility and branded icon appearance; no asset replacement in this phase

**Phase 2 resolution:** Align startup UI neutrals first. Separate approved-star icon pipeline once actual selected source exists; do not edit startup lifecycle.

**Dependencies / batch:** VU-12 / 3C-N + 3E asset gate. **Risk:** Medium.

**Acceptance:** No data reset/retry regression; app startup/splash in both themes; app icon reviewed on native platforms, Expo placeholders explicitly replaced only later.

**Approval:** Approved artwork/source required; native launch visual review

## VU-17 — Native acceptance coverage (P2)

**Original description:** Browser evidence substitutes tabs, picker, alerts, safe areas, fonts/data boundaries and motion

**Original convention:** Source correctness plus native acceptance is required for a cross-platform foundation migration

**Original evidence:** [manifest](atlas/manifest.json), [native verification plan](visual-unification-audit.md#native-verification-and-acceptance-gates)

**Original affected scope:** Phase 5 test plan and affected migration units. Original risk: **High** if skipped; evidence gap, not an invented production bug

**Phase 2 resolution:** Collect real iPhone/Android evidence for tabs/back/sheets/pickers/IME/scaling/screen readers/Reduced Motion/performance.

**Dependencies / batch:** All implementation batches / 4. **Risk:** High if omitted.

**Acceptance:** Functional suites, native screenshots, action/focus acceptance and exports documented; browser evidence never substituted for hardware acceptance.

**Approval:** Device testing/access coordination, not a new design decision

## VU-18 — Icon and tile dimensions (P3)

**Original description:** Shared UiIcon vocabulary exists, but local 16/18/20/22/24/26/28/32 and 40/48/52 tile choices recur; tab icons correctly native

**Original convention:** Predictable inline/control/tile roles improve alignment

**Original evidence:** [ui-icon.tsx](../../src/components/ui-icon.tsx), [source numeric-style inventory](source-inventory.json)

**Original affected scope:** UI icon defaults and component specs. Original risk: **Low**: do not introduce a new icon system or force one size everywhere

**Phase 2 resolution:** Document inline16/support20/control24 and tile36/48 roles; retain justified type-specific sizes and glyph vocabulary.

**Dependencies / batch:** VU-13 / 3B specs + 4 polish. **Risk:** Low.

**Acceptance:** No unrelated glyph replacement; OS tab symbols unchanged; visual glyph size decoupled from48 hit target.

**Approval:** No new icon-system approval

## VU-19 — Empty/error composition (P3)

**Original description:** Transactions uses inline editorial message, Journal uses simple archive rows, Work receipts has an illustrated empty section, Home retains art

**Original convention:** Equivalent task severity should have consistent action/announcement hierarchy, while feature context remains distinct

**Original evidence:** [Transactions empty](atlas/transactions-empty-light.png), [Job receipts](atlas/work-job-light.png), [Home error](atlas/home-error-light.png)

**Original affected scope:** Empty-state and feedback component specifications. Original risk: **Low–medium**: avoid extra decorative tiles or generic card wrappers

**Phase 2 resolution:** Shared feedback role/state/spacing contracts; preserve feature composition, wording and source retry.

**Dependencies / batch:** VU-07, VU-10 / 3B-S + 3C + 4 polish. **Risk:** Low–medium.

**Acceptance:** Empty/loading/error distinguishable, live alerts not duplicated, action names clear; no identical generic card wrapper everywhere.

**Approval:** No additional design decision

## VU-20 — Design context documentation (P3)

**Original description:** PRODUCT.md still identifies SDK 57; root DESIGN.md is absent; accumulated feature reviews have no consolidated approved role map

**Original convention:** Dependencies actually use Expo58/Router 58/RN0.88; this audit supplies cross-feature evidence

**Original evidence:** [PRODUCT.md](../../PRODUCT.md), [package.json](../../package.json), this report

**Original affected scope:** Product/design docs, no runtime. Original risk: **Low**; drift reported, not silently repaired

**Phase 2 resolution:** Update only separately scoped context docs to SDK58 and approved role architecture after spec approval; preserve original audit evidence.

**Dependencies / batch:** none / 3A-doc + final handoff. **Risk:** Low.

**Acceptance:** Current product context accurate; approved/proposed distinction explicit; no historical evidence overwritten.

**Approval:** Approval of this specification precedes authoritative context updates

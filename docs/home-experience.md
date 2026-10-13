# Home experience — Stage 13H, compact dashboard with Stage 13I rotations

## Collapsed overview

Home/date, Spent today and four persistent summary boxes form the collapsed screen. At ordinary phone widths the grid has equal columns in this order: Today / Needs attention, Fitness / Journal. All four boxes remain present, including calm zero/empty states. There are no default agenda/backlog rows, full-width Workout/Journal sections, extra Next Up card or Finance metric cards.

Boxes have flexible height with a 116-point minimum and no title truncation. The measured grid width and accessibility font scale determine whether two readable columns fit (280 effective points minimum); otherwise the same four boxes deliberately stack. Changing selection never changes column widths or border thickness.

## One detail panel

No box is selected initially. Today, Needs attention and Fitness can open detail after the complete grid; selecting another replaces it; tapping the selected box collapses it. Journal navigates directly and never participates in expansion or changes the current selection. State is local React UI state, never SQLite. The grid's rows are not expanded or reflowed by selection. A stable border/surface plus +/− indicator conveys expansion without relying on color alone. Only the three expandable controls expose native selected/expanded state and web aria-expanded.

Today summarizes the first meaningful scheduled item and the remaining count. Empty Today can include one concise Next item. Expanded Today retains five-row cross-source previews, complete counts, shared timed/date-only Task → Commitment → Work ordering, separate quick completion and source navigation, and View in Calendar. Next Up stays inside Today and uses the same existing source-owned candidate/generation semantics.

Attention summarizes complete Task/Commitment/Work counts, keeping Earlier separate from invented Missed semantics by saying “tasks needing attention.” Its expansion retains the five-row oldest-date-first deterministic preview, full totals, quiet source links and restrained warning text. Old unresolved obligations remain discoverable through their owning sources.

Fitness reuses the source-owned dailyFitnessState priority: active session, completed today, next rotation routine, then empty. Active shows name and authoritative exercise/set counts, with Resume to the inline Workout in detail. Completed shows Workout done or the actual multiple-completion count and, when available, Next: Routine. Detail includes the latest completed identity and exercise/set counts, its read-only History destination, and next routine/rotation. Rotation-only shows Up next and the routine name; detail includes the active rotation name and ordered routine-name sequence plus Open Fitness. Empty remains neutral, with no workout recorded/no active rotation detail and Open Fitness. No missed or overdue training state is inferred.

Journal shows Today / Not written yet or Entry saved. Its navigation arrow, action label and hint identify direct navigation to /journal, whose source-owned editor opens the current local day and handles saved entries and recovered drafts. Journal has no selected styling, expansion state or detail panel. Tapping it while another panel is open leaves that panel intact. The existing existence-only source query never reads diary text or recovery drafts. Journal still owns explicit Save, recovery, conflicts and mood.

## Spent today

The thin informational spending row is always before the grid, including R$ 0,00. Its label and amount have no press handlers or navigation semantics. A separate quiet + button is the only action in the row. It reports active actual Expense transactions whose transactionDate equals the frozen local Home date: manual Expenses and Commitment-linked paid Expenses. Income, unpaid obligations, outstanding/expected Work money, future/past dates and deleted transactions are excluded.

Finance owns readSpentOnDate. It groups eligible transactions by integer amount and returns amount/count aggregates; JavaScript multiplies and adds as BigInt. This avoids both Number rounding and SQLite signed-64-bit SUM overflow without loading descriptions, categories, links or the full ledger. No floating-point monetary calculation feeds the total.

Tapping + opens Finance's existing TransactionEditor adaptive modal directly above Home, through the source-owned TransactionCreate host. It never pushes Transactions first. The host reads category choices only and delegates validation, draft state, type/category compatibility, date, amount parsing, focus and category creation to the existing editor/data APIs. The editor/modal stays mounted throughout category loading and Retry; Save and category selection are disabled until the first successful choices read. Subsequent read failures retain choices and draft. Save refreshes Home's existing authoritative aggregate and dismisses the editor; Cancel, native Back and sheet dismissal reveal Home without saving. Home stays mounted, preserving its grid and selected detail. No Home transaction form or editor route is introduced.

## Source-owned targeted reads and lifecycle

Fitness owns readDailySummary: active summary, one joined active rotation/step/routine-name planning query, one local-day completion COUNT and at most one latest completed summary. The four SELECT statements use existing localDayBounds and summary-count expressions, with no all-History, routine-exercise detail or set-row fetch. Planning rows grow only with the configured active cycle, preserving duplicate routine steps and order; inactive saved rotations are excluded. The ordinary next-workout API remains a single-row query. Home retains existing Task, Commitment catch-up and actionable Work reads; spending uses its targeted aggregate.

Focus, active-app and minute refresh remain unchanged. Failed noninitial refresh retains spending, all box summaries, selected box and expanded rows; Retry refreshes data without resetting selection. Initial loading/error does not invent empty state. Source mutations refresh summaries and detail through normal source-owned APIs.

Task dates/occurrences, Earlier/Missed, Commitment schedules/Pay/Skip/Undo and old debt, Work reconciliation/Outstanding/partial/full/Undo, Fitness sessions and Journal persistence are unchanged. No Home tables, cache architecture, dependencies, schema or migrations are introduced.

## Accessibility and physical review

Each box is a single labelled button containing its useful collapsed state. Today, Needs attention and Fitness expose selected/expanded state and an expansion hint; Journal exposes its direct action without those states. Detailed rows preserve source/state/currency labels and separate navigation/completion targets. Amounts and labels wrap; no fixed box/row height clips accessibility text. Spent today is grouped as informational text; the separate Add transaction button uses the shared minimum touch target of at least 44 × 44 points. Calm Utility light/dark roles, typography, surfaces, borders, radii and spacing are reused.

Tests cover collapsed omission of detail, four persistent positions, single expansion below the grid, toggle/switch, Journal direct navigation with saved/unsaved status while another panel is open, accurate summary counts, all Fitness states, rotation completion/manual workout/discard/activation refresh, source navigation, BigInt spending beyond SQLite SUM limits, local date/DST boundaries, refresh failure with expanded planning, source mutations, long next-routine names, responsive large text and existing F4/migration/integrity regressions.

Physical iPhone Expo Go review remains required: normal collapsed fit, all four Fitness states, expansion position/toggling, no grid movement, informational Spent today label/amount and easy-to-tap +, direct transaction creation and Save/Cancel/Back return, Expense-today versus Income/other-day totals, Resume/History/Journal direct navigation, expected completion → Next routine, manual workout/discard and rotation changes, failed-refresh Retry, light/dark, long names/large amounts, large text and VoiceOver. Automated native-boundary tests do not establish physical device layout or gestures.

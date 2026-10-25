# Finance Transactions v2 — Transaction History and Category Iconography

**Current version: Transactions v2.2.** Cards are informational; every row has explicit source-owned contextual actions. The redundant Transactions heading/subtitle is removed. [Transaction Editor v2](finance-transaction-editor-v2.md) supplies the anchored bottom-right create action. Original v2 capture/results below are historical; [v2.2 evidence](previews/transactions-v22/README.md) records the current refinement.

## v2.2 interaction and payment ownership

| Source | Contextual actions | Integrity boundary |
| --- | --- | --- |
| Manual | Edit; Delete | Existing editor and confirmed soft deletion |
| Commitment | View payment details; Delete payment | Existing payment-detail sheet with Open Commitments/protected editing; confirmed source-aware reversal |
| Work | View payment details | Existing covered-jobs detail, protected editing and Open Work; Undo payment remains owned by Work |

The card background, icon, title, amount and metadata have no press handlers. The informational accessible `View` summarizes the record without a button role. Its sibling named “Transaction options for …” control is the only row action entry point. ContextMenu focuses its available actions, dismisses before native presentation, and distinguishes destructive actions. No full-card Pressable remains.

### Commitment payment deletion

1. Read-only preflight verifies the selected expense ID still belongs to a live Paid occurrence with the expected commitment ID/due date and an available parent. A live Expense with valid integer-centavo money must exist. Invalid historical links show an explicit unavailable/reconciliation error without repair.
2. Native confirmation says **Delete payment?** / “This will remove the recorded expense and mark this commitment occurrence as unpaid.” Cancel writes nothing.
3. Confirm repeats ownership validation inside an **IMMEDIATE SQLite transaction**. The same reversal helper serves Commitments Undo and Transactions Delete payment: soft-delete the actual expense, restore Pending, clear `paidTransactionId` and `resolvedAt`, then reconcile installment completion. No independent reversal system, replacement status, migration or new financial movement is introduced.
4. A completed installment becomes Active when its retained schedule is open; a plan completed while paused becomes Paused when its schedules remain closed. `completedAt` clears. Existing Paused/Ended states remain unchanged; overdue is derived from Pending plus a past due date. Resolving the final installment again can complete the plan again.
5. Any failure rolls back ledger, occurrence and parent together. Duplicate requests and old confirmations after Undo/re-payment cannot reverse the replacement payment. Retained occurrence ownership, including tombstones, cannot bypass the generic linked-ledger deletion guard by appearing manual.

Bills and subscriptions retain their scheduling and end semantics. An ended or paused parent's old unpaid obligation remains visible according to existing projections. Work allocation/receipt integrity is unchanged; Transactions offers no generic Work deletion.

### Refresh, layout and accessibility

Successful mutation reloads the current Transactions snapshot with its existing filter/paging span. Overview and other destinations reread on navigation/focus/resume through their existing lifecycle. Calendar shows the restored unpaid occurrence; actual-ledger Overview Expenses/Net Flow, Cash Flow, Spending and Journal totals omit the reversed expense. Expected amounts and forecasting semantics do not change. Refresh failure retains the last usable snapshot and existing Retry handling; payment ownership is still checked before any subsequent destructive action.

Finance title → destination navigation → controls → date groups now form the hierarchy. The removed subheading/subtitle leave no empty heading container or margin. Categories remains in the single named Transactions options control beside search. The anchored create button, native-tab ownership and 88-point list bottom clearance remain unchanged. Cards, exact BRL amounts, category identity icons, light/dark tokens, large-text wrapping, Reduced Motion, SectionList paging and search behavior are preserved.

### v2.2 validation and limitations

Twenty new regression tests cover source-aware deletion, cancellation, stale confirmations, unsafe historical links, duplicate protection, rollback at all three writes, installment pause restoration and actual projections. Existing row/editor tests now enter editing/details through explicit contextual actions. Focused group: **352 passed**. Full suite: **1,252 passed**, zero failures. Both iOS/Android SDK58 production JavaScript exports passed. TypeScript passed; ESLint retains six existing errors and two existing warnings with zero added or removed diagnostics; `git diff --check` passed. See the [current evidence index](previews/transactions-v22/README.md) for capture provenance and gate details.

Design skills: frontend-design and Impeccable retained the established hierarchy and compacted the toolbar; UI/UX Pro Max's verified Interaction/Confirmation Dialogs guidance informed explicit destructive confirmation; Expo native UI/storage guidance and [SDK58 SQLite documentation](https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/) informed native dismissal and transaction boundaries. No new native API or dependency is needed.

The independent Impeccable reviewer inspected all **46 current screenshots** and returned **ship**, with no material fixes in the supplied visual/code evidence. Its scope is the real-component RN Web matrix, not native-device certification. The ordinary-extension documentation handoff checked the implemented components, shared payment reversal and incumbent tokens, corrected stale current-behavior descriptions, and separated the original v2 results from current evidence. No new visual world, token or global design rule is introduced. Pre-existing PRODUCT.md SDK57 text and absent DESIGN.md are not repaired here.

Historical linkage corruption is reported, not repaired. Source navigation opens existing payment details and the owning workspace; it does not invent a direct focused-commitment route. Browser evidence uses substituted native/lifecycle boundaries and cannot certify real native Alerts, VoiceOver/TalkBack focus, gestures or tab clearance. Physical testing remains required on both platforms.

Files refined for v2.2: `components/transaction-row.tsx`, `components/transactions-content.tsx`, `finance-screen.tsx`, `data.ts`, `commitments/data.ts` under Finance; `tests/transactions-experience.test.ts`, `tests/transaction-editor-v2.test.ts`, new `tests/transactions-v22.test.ts`; the two Transactions preview/review scripts; this document and `docs/previews/transactions-v22/`.

## Scope and authority

Transactions adopts the established Axis v2 / Warm Editorial Hearth system. Existing ledger semantics and capabilities outrank the mockup; the explicit category-icon correction outranks its merchant illustrations. Finance Overview, Commitments, Work, transaction editors and category management retain their existing flows. The v2.2 correction explicitly adds Transactions access to the shared Commitment payment reversal described above. No schema, migration, dependency, stored money representation or global palette changes.

## Incumbent design-system comparison

This is an **operate** surface: finding, reviewing and acting on actual ledger movements. Its visual authority remains [Design System v2 Visual Groundwork](design-system-v2-visual-groundwork.md), the [Stage 14D record](design-system-v2-stage-14d.md), and `src/constants/design-system-v2.ts`.

| Established system | Transactions application and scope |
| --- | --- |
| Warm cream light surfaces and charcoal dark surfaces | Reuses `canvas`, `group`, `control`, `border` and shared text roles in both themes; no new palette tokens |
| Lora display / Manrope practical interface | Finance retains `screenTitle` (36/46); the redundant Transactions subheading is removed in v2.2. Date labels, cards, metadata, money and controls remain Manrope |
| Quiet owned surfaces and tonal depth | Controls and transaction cards use existing group surfaces with one quiet border and no added card shadow |
| Existing shape and spacing scales | Cards reuse `Shape.group` (16), tiles reuse `Shape.control` (10), with 12-point card padding, 8-point separation and 16-point page gutters |
| Shared accessible controls | Reuses the shared search field, button, radio selector, contextual menu and 48-point touch target; only Transactions requests `equalWidth={false}` |
| Finance semantics distinct from brand | Amounts reuse `overviewColors`; category tiles reuse brand/brand-soft tokens. Finance semantic colors remain provisional and scoped |

No new system-wide visual rule is introduced. The older groundwork describes earlier migration scopes and future Finance styling. The original v2 brief authorized this destination's card composition and restrained serif subheading; v2.2 removes that secondary heading and its subtitle while retaining the Finance display title. Existing cards and explicit source-owned menus support the same Operate direction. These choices do not migrate other Finance destinations or expand serif use elsewhere. The shared selector's optional setting retains its previous equal-width default. No new `DESIGN.md` or `.impeccable/design.json` is needed for this ordinary extension.

## Existing behavior audit

- The ledger reads 40 records with one lookahead, ordered by transaction date descending, creation timestamp descending and ID ascending. Dates are local civil dates. Soft-deleted records are excluded.
- Categories are loaded once per read, including archived names. Active selectors independently exclude archived categories.
- Ordinary manual entries expose Edit/Delete only in a contextual menu. Delete retains its confirmation. Card bodies do not navigate.
- Linked payments expose existing read-only details through their contextual menu. Those details retain protected editing and source navigation. Commitments and Transactions share payment reversal; Work retains its own Undo. Source display names and Work job-title aggregation remain authoritative.
- The existing Transactions options menu owns Categories. New transaction uses the same editor, defaults, validation and exact integer-centavo writes.
- Refresh on focus, app resume, date rollover and mutation retains usable snapshots and unsaved drafts when a read fails. Existing iOS detail dismissal ordering remains intact.

Before v2, the presentation used loose date labels, divider rows and a floating plus. Original v2 introduced the card/filter/search composition and a heading create action. Transaction Editor v2 restored the single anchored create action. The current v2.2 refinement removes the secondary heading/subtitle and body-tap actions, adds explicit source-owned contextual menus, and exposes the safe shared Commitment reversal.

## Screen hierarchy and actions

Finance uses the existing v2 screen title and internal destination controls for Overview and Transactions. Commitments and Work retain their current presentation. SDK 58 safe-area ownership and native tabs are unchanged; the blue testing gear and mockup bottom navigation are not recreated.

Transactions v2.2 removes the secondary heading/subtitle and starts directly with its controls. One anchored floating button, accessibly named New transaction, supplies creation through the existing editor. It is hidden while an editor, linked detail or category manager is mounted and disabled before an authoritative snapshot exists. Categories remains available from the named Transactions options menu beside search. The list reserves the existing 88-point floating-button clearance.

One controls surface contains All / Expenses / Income and Search transactions. Comfortable widths may place them together; phone widths stack them. The shared selector has an optional `equalWidth` setting: Transactions opts out of equal segments to fit complete labels and the selected checkmark. All other consumers retain the previous default. At font scale 1.5 and above it retains the shared vertical arrangement.

## Search, filtering and pagination

- Type selection is a read predicate, never a mutation. Original sorting and local-date grouping are preserved.
- Search is local, literal, case/diacritic insensitive and normalizes whitespace using `canonicalSearchText`. It matches persisted descriptions, authoritative current display titles and assigned category names, including archived names. It does not perform fuzzy matching, infer categories or query a service. `%` and `_` are literal characters.
- An empty query uses the existing bounded indexed cursor path: at most 41 ledger records for an initial 40-row page, plus one category read and two batched source lookups when nonempty.
- Nonempty search scans candidates in batches of at most 128 inside one database read transaction. SQL applies the type, deletion and cursor predicates; normalized matching runs in JavaScript to preserve Unicode behavior rather than relying on SQLite ASCII case conversion. Source resolution is batched by candidate IDs, not queried per row.
- Only the requested span plus one lookahead match is retained by each read. React receives matching pages; it never receives the lifetime candidate collection to perform filtering. Deliberately loading older pages accumulates the visited matching span, and refreshing rereads that span. The continuation cursor belongs to the last returned match, not a scanned nonmatch or lookahead.
- Search/type changes reset the loaded span to 40. Search is debounced by 180 ms without remounting its input. Changing view, refresh, and unmount cancel pending searches. Refresh/mutation applies the requested filter and preserves the loaded span for that filter.
- Old rows remain visible during a pending read. “Updating transactions…” identifies this state. If that read fails, “Showing previous results. Retry to update the list.” identifies stale results, and paging is disabled until requested/applied filters agree. Retry reads the requested filter. Clearing search retains the selected type.

### Performance limit

A rare or absent Unicode substring can scan the entire candidate history synchronously, albeit in bounded batches with results bounded by the requested span. Debouncing reduces repeated reads; it does not eliminate worst-case O(N) work or prevent a long synchronous read from delaying input. Memory for visible results grows as the user explicitly loads more pages. Very large device histories should be timed on native hardware before deciding whether a separately authorized search index is warranted. No search schema or migration is introduced here.

## Date groups and cards

The single virtualized `SectionList` uses stable transaction IDs and the existing date-group helper. Today, Yesterday and locale/year-aware older labels retain their existing meanings. Groups spanning pages merge without duplicate headers. The recorded transaction date, not an associated commitment due date, selects the group.

Cards have one quiet border and group surface, 12-point padding, a 40-point decorative icon tile, complete title, exact amount and existing category/source metadata. Rows are separated by 8 points. Menus align to the top of long cards. There are no hardcoded row heights or title/amount line limits. Names, long unbroken text, category names and currency can wrap; amounts can move below titles. At font scale 1.5 and above the icon and text stack vertically. The list uses 12 initial/batch rows and a seven-window virtualization setting, with clipping disabled for variable-height content.

## Category icon mapping

Mappings use the existing seed UUIDs in `category-icons.ts`; category display names, descriptions, source types and brand names are not inputs.

| Existing category | Generic icon |
| --- | --- |
| Housing | Home |
| Food | Utensils |
| Transport | Car |
| Shopping | Shopping bag |
| Health | Heart |
| Pets | Paw |
| Entertainment | Ticket |
| Utilities | Home |
| Subscriptions | Repeat |
| Other expense | Tag |
| Salary | Briefcase |
| Freelance | Briefcase |
| Other income | Tag |
| No assigned category | Receipt |
| Custom / unknown category ID | Tag |

The small authored outline primitives extend `UiIcon`; there are no logos, remote images, generated artwork or added icon packages. Água and Popeyes assigned Food both show utensils. Internet assigned Food would also show utensils. A custom category called Food still receives the generic tag. Renaming or archiving a referenced category does not change its identity mapping. Existing built-in categories cannot be archived through the manager; archived custom categories retain their names and tag fallback.

Category is distinct from source. Utilities · Commitment is saved category plus provenance; uncategorized linked payments show a receipt and Commitment metadata. Work client/provenance labels remain separate from icon selection. Source membership never fabricates an assigned category.

## Money and permissions

Expenses display `-R$ …`; income displays `R$ …`. Existing localized BRL formatting is used, including maximum supported exact values. Persisted amounts remain positive safe-integer centavos with a separate type. Scoped Finance income/expense colors come from the approved Overview presentation helper; no permanent global Finance palette is declared.

Accessible informational row labels explicitly say Income or Expense, alongside title, amount, civil-date group and real metadata. Color is supplementary. Every row has a named contextual menu with legitimate source-owned actions; card bodies have no button role or press handler. Linked details/source flows remain available explicitly. No note preview or redundant no-category placeholder is added.

## States, keyboard and accessibility

Loading, initial read failure, genuine empty history, no matching results, pending search and stale-after-error states remain distinct. No-match copy suggests changing search or choosing All. Clear search is a named action. Creation is disabled until an authoritative snapshot exists; Retry remains available for read errors.

The list dismisses the keyboard on drag, handles taps on controls, adjusts keyboard insets and keeps one vertical scroller. Navigation explicitly dismisses the keyboard. Search has a label even when its visible field label is hidden. Radio selection, menu subjects and informational row summaries have explicit accessibility labels/states. The summaries have no editing hint or button role; row actions belong to the sibling menu. UiIcon images are decorative and hidden from assistive technology. Shared touch targets remain 48 points. Existing reduced-motion-aware press feedback is reused for controls; no new entrance animation is introduced.

Native font sizing is preserved. Doubled-text browser captures simulate font growth and verify layout, but cannot certify native text measurement or assistive technology behavior. Horizontal Finance destination scrolling remains the established enlarged-text navigation behavior.

## Skills and review findings

- **frontend-design:** Retained the approved Lora/Manrope hierarchy, compact date labels and owned row surfaces. Followed the corrected visual brief rather than selecting merchant-specific imagery.
- **Impeccable:** Reviewed density, quiet borders, long text, theme hierarchy and creation placement. Original v2 review found equal-width segments splitting Expenses; Transactions retains the resulting intrinsic segment widths. The original enlarged-heading correction is historical because v2.2 removes that heading. Fresh v2.2 review inspected all 46 screenshots and code and returned ship without material fixes within that scope. This documentation handoff compares the extension with incumbent tokens and records current ownership, preserved behavior and evidence limits. Native code skips the HTML/CSS detector.
- **UI/UX Pro Max:** Its local search/empty-state guidance informed debounced matching, actionable no-match copy, clear search and explicit stale-result feedback. No autocomplete or fuzzy behavior was added without a product requirement.
- **Expo Skills:** Applied native list virtualization, touch targets, keyboard behavior and responsive layout guidance against installed SDK 58 and official RN/Expo docs. Existing screen safe-area ownership takes precedence over generic automatic-inset advice. Exact BRL is preserved instead of abbreviating financial values.

This is an ordinary extension of the incumbent system, not a new visual world. PRODUCT.md contains a pre-existing SDK57 reference; package.json and the completed SDK58 migration remain authoritative. Global design documents are not rewritten for this screen.

## Historical original v2 evidence and validation

The following records the original v2 implementation, including its former heading and row-tap model; it does not describe the current v2.2 interaction contract. Saved review assets and provenance: [historical capture index](previews/finance-transactions-v2/README.md). Current preview scripts now generate the separate [v2.2 evidence](previews/transactions-v22/README.md). Both use real RN Web components/fonts with substituted native and lifecycle boundaries. Separate real-SQLite tests establish query behavior, mutation restrictions and refresh semantics.

The original independent review could inspect code and RN Web captures; the supplied mockup was unavailable to that reviewer. Its verdict addressed the corrected brief and original v2 component evidence, not a verified pixel comparison with that image. The historical matrix contains 28 scenes plus 10 full-card captures. Geometry checks cover glyph/card bounds, page overflow, selector label wrapping and selected fixture icon/menu identities; they do not prove all native accessibility behavior or every fixture's data-access behavior.

Focused coverage includes category identity/fallbacks, historical names, no title inference, exact amounts, source restrictions, cursor ties, deleted records, Unicode searches beyond 300 newer records, combined filters, literal search, input identity, resetting pagination, stale-read recovery, creation/category management and refresh/source handoff.

Validation results are recorded in the capture index and final implementation report. Required gates: TypeScript, ESLint baseline comparison, focused Finance/Transactions/Commitments/ledger tests, full automated suite, both platform exports and `git diff --check`.

Original v2 final results: TypeScript passed; ESLint had zero new diagnostics against six existing errors/two existing warnings; the focused group passed 226 tests, and the full suite passed all 1,228 tests. Both iOS and Android production JavaScript exports succeeded after the selector correction. `git diff --check` passed. No commit or push was performed. Current v2.2 results are recorded above and in its separate evidence index.

## Historical original v2 files changed

| Area | Files |
| --- | --- |
| Shared primitives | `src/components/form-controls.tsx` (optional intrinsic segment widths, default preserved), `src/components/ui-icon.tsx` (generic outline vocabulary) |
| Transactions screen | `src/features/finance/finance-screen.tsx`, `components/transactions-content.tsx`, `components/transaction-row.tsx` |
| Finance presentation / reading | `category-icons.ts`, `transactions-filter.ts`, `transactions-presentation.ts`, `types.ts`, `data.ts`, `use-finance.ts` under `src/features/finance/` |
| Regression coverage | `tests/transactions-experience.test.ts`, `commitments-experience.test.ts`, `finance-charts-integration.test.ts`, `finance-overview.test.ts`, `navigation-conventions.test.ts`, `refresh-lifecycle.test.ts` |
| Review tools | `scripts/preview-finance-transactions.ts`, `scripts/review-finance-transactions.cjs` |
| Documentation / evidence | This document, capture README, 38 PNGs and `checks.json` under `docs/previews/finance-transactions-v2/` |

## Physical testing still needed

iOS and Android: actual Dynamic Type/font scaling at 320/390/430-equivalent widths, long currencies and unbroken titles, software keyboard dismissal and viewport movement, input focus while changing filters, VoiceOver/TalkBack informational reading and radio/menu states, gestures across noninteractive card bodies, menu focus return, native confirmation Cancel/Delete payment, linked detail-to-editor/source dismissal, anchored create/native tab clearance, focus/resume refresh and projections after reversal, and search latency on a genuinely large accumulated ledger. Browser evidence and JavaScript exports are not a native install or physical-device test.

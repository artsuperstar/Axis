# Finance Overview Charts — Stage 1

> Stage 2 now supersedes the temporary presentation described below. See [Finance Overview v2 — Stage 2](finance-overview-v2-stage-2.md). Exact ledger aggregation, buckets, grouping, source semantics and query behavior remain unchanged. The visible interval-button row and duplicate category list are replaced by direct accessible chart targets and one inline-expandable Spending section. Stage 1 captures remain archived evidence; the shared preview script renders current source, with `--stage2` selecting the new review output directory.

## Architecture audit (before implementation)

1. `financeTransactions` is the authoritative actual ledger; the Overview's `readFinanceAnalytics` filters its indexed civil date range before JavaScript aggregation. No Work/Commitments schedule joins are needed.
2. Transactions have `income` / `expense` types, positive safe integer `amountMinor`, nullable category, and local `transactionDate`.
3. Ledger deletion is a `deletedAt` tombstone. Analytics excludes deleted transactions. Category tombstones remain joined to preserve historical names.
4. Money is BRL integer centavos. `validateAmountMinor`, BigInt aggregation and `formatBrlAmount` already support exact totals beyond Number's safe range.
5. `aggregateFinance` owns Income, Expenses, Net Flow and category amounts. Chart projections must reuse it.
6. `periodBounds` uses Axis civil-date helpers: Monday-first weeks, complete calendar months/years, inclusive bounds.
7. `FinancePeriodControls` owns the existing selector/navigation. `movePeriod`/`canMovePeriod` prevent moving beyond the current period; no chart period state is needed.
8. Spending is expense-only, amount-descending, then name/ID for ties. `spendingShareLabel` supplies display percentages.
9. Built-in/custom categories share IDs and typed relations. Archived names remain historical; null is `No category`. An unavailable referenced category retains the existing fallback.
10. `useFinance` reloads after mutation, focus, app resume, and local-day rollover. Failed refresh retains last-good data, except a different selected period cannot expose old-period analytics.
11. No chart framework or `react-native-svg` dependency exists. Installed Expo 57 `expo-image` already renders authored base64 SVGs in `UiIcon`. Reuse that approach for decorative geometry and native accessible controls/text; no dependency changes.
12. Overview renders `FinancePeriodControls` then `FinanceDashboard` inside the existing FlatList header. The dashboard owns metrics and the expandable spending breakdown. Keep this single vertical scroller and native navigation intact.

## Stage 1 composition

Preserve existing appearance, metrics and controls. Insert Cash Flow after metrics, then Spending by Category, then the existing Spending breakdown. Plain headings, no decorative cards or animation. Rendering, geometry and money aggregation have separate owners. Stage 2 can restyle these components without moving financial rules into views.

## Data and component ownership

- `analytics.ts`: one eligible ledger projection now includes `transactionDate`; existing `aggregateFinance` still owns Overview and detailed category totals. Full Finance periods additionally project `cashFlow`; Journal's date-only callers do not receive chart buckets. No new reads or stored totals.
- `charts.ts`: pure cash-flow bucketing, segment grouping, bounded geometry ratios, arc geometry, local labels and adaptive-label/total placement decisions. `CashFlowBucket` carries inclusive dates, localized label and exact BigInt `incomeMinor`/`expensesMinor`. `ExpenseSegment` carries identity, label, BigInt amount, display percentage and provisional color slot.
- `chart-presentation.ts`: SVG rectangles, axes and arcs; scoped semantic color mappings. No SQL, financial formatting or domain writes.
- `CashFlowChart`: native bucket controls, selection and exact informational details. Selection resets when the period changes and survives a refresh when its date still exists.
- `ExpenseDonutChart`: decorative diagram, adaptive exact total and bounded segment legend. No segment navigation or mutable category state.
- `FinanceDashboard`: memoizes donut segments by authoritative spending/expense inputs and retains the existing expandable full breakdown. Charts are memoized; unrelated expansion/scroll updates do not reaggregate or reread SQLite.
- `svg-source.ts`: the existing icon encoder extracted unchanged into a reusable offline base64 SVG helper. `UiIcon` uses it too.

## Bucket rules

| Period | Buckets | Bounds / labels |
| --- | --- | --- |
| Week | 7 civil days | Existing Monday–Sunday range; localized short weekdays, including neighboring months/years |
| Month | 4–6 calendar weeks | Monday–Sunday, first/last clipped to month; day ranges such as `1–4`, `5–11` |
| Year | 12 months | January through December; localized short month names, leap-aware end dates |

Every eligible date belongs to exactly one bucket. Zero intervals remain, including future intervals in an incomplete current period. Axis's existing bounded four-digit calendar behavior is retained at the extreme supported years. No `toISOString` membership checks, new timezone model or independent period selector. Chart ticks thin according to measured width/font scale and remain centered on their actual bucket; all intervals remain available below as wrapping native buttons.

## Exact money and reconciliation

Transaction values are validated positive safe integers, then summed as BigInt centavos. Each bucket's two magnitudes are nonnegative; Net Flow remains Income minus Expenses. All bucket Income/Expenses reconcile independently with Overview totals. Category segments reconcile with authoritative Expenses. `Other` is an exact sum of categories after the first five, not a subtraction of rounded percentages or a persisted category.

Only bounded ratios convert to Number (`amount × 1e9 / total` as integer division, then division by 1e9). This gives approximately one-billionth visual precision; smaller shares can be visually indistinguishable while their exact amounts remain available in text. No ratio or geometry is fed back into financial values. Existing `spendingShareLabel` rounding and `formatBrlAmount` formatting are retained.

No joins to expected Work earnings or unpaid commitments are introduced. Paid commitments and actual Work payments count once through their linked Expense/Income ledger transactions. Soft-deleted ledger movements are excluded by the existing filter. Archived category names and `No category` semantics are retained.

## Donut and Other

The existing amount/name/ID category ordering determines clockwise order from twelve o'clock. Show five categories plus `Other` only if more exist. The original detailed breakdown remains under the donut, with View all/Show less exposing every real category.

Scoped provisional colors reuse existing semantic theme values. Identity hashes prefer one of five slots; deterministic collision resolution over the visible identities guarantees distinct visible slots and survives reordering/renaming/archival of that same set. Membership changes can reassign colliding slots. Other has a sixth slot. Labels, amounts and percentages provide the non-color alternative; color never identifies a category on its own.

Single-category rendering uses a complete SVG circle instead of an arc with coincident endpoints. Multiple-category boundaries have thin separators. The exact total sits in the hole when measured diameter, amount length and font scale allow; large amounts and enlarged text move it below the diagram. No truncation, abbreviated financial values or overlapping center labels.

## Rendering and compatibility

No dependencies added. Reuse installed `expo-image` (~57.0.5) for generated local SVG data URLs, matching the existing icon approach. No remote assets, native project changes, framework or gestures. Expo 57's SVG guidance warns about packed arc flags in iOS's system decoder: each chart arc uses a separate `A` command with spaced flags. Single circles use `circle`. Android receives base64 URLs through the shared encoder.

References checked: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Expo Image SVG support](https://docs.expo.dev/versions/v57.0.0/sdk/image/), [React Native Pressable](https://reactnative.dev/docs/pressable), [React Native accessibility](https://reactnative.dev/docs/accessibility). Installed React Native 0.86 types/source were checked for overlay styles; use `StyleSheet.absoluteFill`.

Grouped bars use a zero baseline and the exact maximum magnitude as the scale endpoint. Income is filled on the left, Expenses outlined on the right; the legend explicitly states these positions. Tiny positive amounts may have subpixel height under a huge maximum, rather than being visually inflated. Exact values remain inspectable. No animation in Stage 1.

## Empty states, responsiveness and accessibility

- No transactions: both charts state that the period is empty, preserving existing summary zeros.
- Income only: Cash Flow renders Income; the donut states there are no expenses.
- Expenses only: Expense bars and real category distribution render.
- Empty intervals: zero geometry remains in chronological position. Zero totals never divide by zero.
- One parent FlatList scrolls the current Overview. No nested vertical scroller, new tab bar, chart period controls or navigation changes.
- SVGs are hidden from accessibility. Native headers, period description, exact scale and labeled bucket buttons communicate all bar data. Buttons expose selected state; the details update in place with a polite Android live region. Direct bar taps supplement the full-size native interval controls.
- Native interval controls provide at least 44-point touch targets and wrap. Detail amounts and category labels have no line caps. The donut uses available width up to 240 points; its text never scales down to fit a hole.
- Donut total and each visible segment expose name, exact amount and share; the full category breakdown remains accessible underneath. Inspection is read-only, with no SQLite access or navigation.

## Skill findings

- **frontend-design:** keep the existing functional composition; put common summaries before charts and exact inspection directly below bars. Correct sparse tick ownership rather than adding decorative framing.
- **Impeccable (Operate):** no nested cards or vertical scrollers; preserve the incumbent screen. Perform a batched width/theme/text review, fix alignment and total placement together, then one confirmation pass.
- **UI/UX Pro Max:** the verified Part-to-Whole guidance recommends at most six segments and identifies color-only donuts as high accessibility risk. Apply five-plus-Other and retain exact textual alternatives. Its web chart-framework suggestions were not applicable to this native app. An initial broad query returned off-topic trading/radar results and was discarded.
- **Expo building-native-ui:** use installed SDK-compatible rendering, native touch controls, measured responsive layout, existing safe-area ownership and no native directories. API/type checking caught the removed `absoluteFillObject` helper; use current `absoluteFill`.

## Performance and test evidence

Pure tests cover weekly/monthly/yearly boundaries, 4/5/6-week months, leap years, cross-year weeks, localized labels, zero/mixed/single-direction periods, huge exact totals, bounded ratios/arcs, category ordering, No category, historical names, Other and stable visible-set color assignment.

Mounted real FinanceScreen tests cover all three period kinds, backward/forward navigation, native selection and exact inspection, no queries on inspection, an in-app transaction save, external edit/delete plus resume/refocus, failed refresh retention, both themes and 320/390/430 × font scales 1/2. Source integration covers actual commitment payments, partial Work payments and excluded expected/unpaid facts. Existing Finance, ledger, Commitments and Work regressions remain applicable.

The 6,000-transaction SQLite fixture has 4,000 unrelated September rows and 2,000 selected October rows. Overview issues exactly two reads: one indexed ledger projection returning the 2,000 eligible rows and one category read. No reads per bucket/segment/category. The query plan uses `finance_transactions_active_date_idx`. Cash Flow has at most 12 buckets; transformation is O(n × bounded buckets), and donut geometry is at most six segments. No timing threshold is asserted.

## Review captures

See [capture index](visual-reviews/finance-charts-stage-1/README.md). Twenty-one captures show Week/Month/Year, multiple/Other categories, empty/income-only periods, both themes, all three widths, enlarged text and actual 390×844 Overview scrolling. The browser renders the real FinanceScreen and chart components with SQLite-authored analytics; `useFinance` and native host/image boundaries are substituted for capture only. `checks.json` records image decoding, viewport containment, native-button bounds and inspection checks.

Generate the browser fixture with `node node_modules/tsx/dist/cli.mjs scripts/preview-finance-charts.ts`. Browser captures are functional review artifacts, not the final Finance v2 design or physical-device evidence. Simulated font scale doubles web text and supplies the corresponding RN fontScale; it is not native Dynamic Type.

## Stage 2 integration notes

Restyle/restructure the chart components and replace their scoped color mappings against the approved mockup. Preserve the query, BigInt buckets, category semantics, read-only inspection, period ownership and expandable breakdown. Do not add new persisted totals or a second financial calculation model. Native iOS/Android SVG decoding, VoiceOver/TalkBack, true Dynamic Type/font scaling, safe-area/native-tab clearance and touch scrolling still require physical testing.

## File inventory

Existing files changed:

- `src/features/finance/analytics.ts` — add the date to the existing read and attach Overview buckets.
- `src/features/finance/components/finance-dashboard.tsx` — integrate charts after metrics, retaining Spending.
- `src/components/ui-icon.tsx` — reuse the extracted identical SVG encoder.

New code/review tooling:

- `src/features/finance/charts.ts`
- `src/features/finance/chart-presentation.ts`
- `src/features/finance/components/cash-flow-chart.tsx`
- `src/features/finance/components/expense-donut-chart.tsx`
- `src/utils/svg-source.ts`
- `tests/finance-charts.test.ts`
- `tests/finance-charts-integration.test.ts`
- `scripts/preview-finance-charts.ts`

Documentation/artifacts: this document and `docs/visual-reviews/finance-charts-stage-1/` (README, checks JSON and 21 PNGs). No dependency, lockfile, schema, migration, persistence, navigation or unrelated screen changes.

## Validation (2026-10-22)

| Check | Result |
| --- | --- |
| TypeScript (`tsc --noEmit`) | Pass |
| New chart tests | 43 passed |
| Charts + existing Dashboard/Overview tests | 70 passed |
| Focused charts + Finance aggregate/ledger/Commitments/Work regressions | 216 passed |
| Full automated suite (`--test-concurrency=1`, America/Sao_Paulo) | 1,181 passed, zero failures |
| ESLint baseline | Exact diagnostic comparison unchanged: six existing errors, two existing warnings, no new diagnostics |
| iOS export | Pass (`dist/finance-charts-ios`) |
| Android export | Pass (`dist/finance-charts-android`) |
| Browser review | 21 captures; twelve width/theme/text combinations with no detected chart overflow, failed image decode, page errors or undersized interval buttons |
| `git diff --check` | Pass |

Existing ESLint errors: `react/no-children-prop` in `context-menu.test.ts` (three), `navigation-conventions.test.ts` (two), `transactions-experience.test.ts` (one). Existing warnings: two unused variables in `tasks-experience.test.ts`. They are unchanged and outside this task. Validation logs/exports live under ignored `dist/`.

Initial worktree was clean. Changes remain uncommitted; nothing was committed or pushed.

# Finance Overview v2 — Stage 2

> [v2.1 Spending responsive correction](finance-spending-v21.md) supersedes the side-by-side donut/category-list layout described below. Current Spending uses a compact donut/total introduction above a full-width breakdown. The Stage 2 captures remain historical evidence; calculations and interactions are preserved.

## Existing Overview audit (before implementation)

1. Composition: period controls, loose metrics, Cash Flow, separate donut/legend, then a second Spending breakdown.
2. Internal navigation: parent-owned `selection.view`; four existing destinations. Only Overview's header receives the bounded v2 alignment.
3. Period selector: existing `setPeriodKind`, no separate chart state.
4. Navigation limits: `canMovePeriod`/`movePeriod` forbid forward movement beyond the current period; historical selections remain supported.
5. Summary: authoritative `FinanceAnalytics` BigInt totals from the existing ledger projection.
6. Cash Flow: Stage 1 generated SVG via `expo-image`; exact bucket data already provided.
7. Inspection: hidden direct plot targets plus a redundant visible FormButton row. Replace both with one accessible target per real interval.
8. Coordinates: Stage 1 normalized 360-unit plot; native overlay shares bucket proportions. Add explicit shared layout geometry, keeping the Y-axis outside hit zones.
9. Donut: local SVG, memoized source, adaptive total, but oversized and separate from the detailed breakdown.
10. Category grouping: Stage 1 top five plus exact Other; preserve data/order/identity colors, null and archived names.
11. Existing list: parent-owned `spendingExpanded`, first five/full toggle. Reuse state while consolidating the two representations.
12. Theme/responsiveness: legacy Calm Utility dashboard, opt-in v2 DesignProvider/UiText/UiPressable available. Scope palette mappings to Overview. Actual text measurements will govern summary fit.
13. Scrolling: one existing FlatList and native SafeAreaView with both vertical edges; no new vertical scroller or copied tab bar.
14. Refresh: mutations/focus/resume/day changes already reload eligible analytics; valid selected interval follows refreshed values, period keys reset unrelated selections.

Stage 1 is uncommitted at the start of Stage 2. Preserve all its source, tests and review evidence. No data/domain/schema/dependency changes are planned.

## Visual plan

Follow the target's three regions: compact Summary, Cash Flow, Spending. Use existing warm cream/charcoal v2 canvas and restrained bordered surfaces; practical Manrope for labels and amounts. Retain the v2 title convention. Income/Expenses and signed Net Flow have scoped provisional colors. No gear, copied tab bar, gradients or decorative cards inside cards.

Cash Flow owns its title/legend, native Y labels, SVG bars/grid, transparent full-column targets, visible selected label/band and exact details. Spending pairs a supporting donut with one breakdown, stacking when needed; expansion replaces the compact rows with actual individual categories.

## New hierarchy and mockup comparison

The supplied image established the composition: period controls, one summary, one Cash Flow region and one Spending region. The actual-source browser captures were compared in a batched review and one confirmation pass. That review caught and corrected oversized legacy gaps around period controls, the lost v2 compact-navigation padding, and overlapping large-text ticks near the selected bucket.

Preserved product truth takes precedence over image artifacts:

- Use actual fixture/ledger values, not illustrated bars or totals. The source projection is unchanged.
- Keep native pushed/tab architecture, safe-area ownership and the real four Finance destinations. No copied bottom-tab bar or blue environment gear.
- Use the existing Axis v2 editorial title convention and practical Manrope amounts/labels. No decorative image texture/gradient.
- Do not force three summary columns or the donut beside rows when text cannot fit. Do not force all three regions above the fold.
- Selected range details use the existing full localized civil-date description, including both years when applicable.

The final 390-point capture has three summary columns for fixture values that fit. The supporting donut is around 134 points beside a wrapping compact breakdown; rows use readable native text rather than forcing the mockup's denser proportions. Enlarged/narrow layouts stack naturally. See [review index](visual-reviews/finance-overview-v2-stage-2/README.md).

## Header, period controls and Summary

Only Overview opts into v2 canvas/title/internal-tab styling. Other Finance destination bodies remain unchanged. Internal destinations retain the same `setView` and selection/scroll restoration. The existing `compactNavigation` setting now reaches UiButton in v2 as it already did in legacy controls; the small shared fix is opt-in and only Finance currently uses that setting. Large text can still horizontally scroll the existing destination strip.

The existing segmented selector uses its v2 appearance with no redundant visible Period heading. Week/Month/Year selection and the existing Previous/Next/Current actions keep their exact handlers and limits. The disabled Next button remains visibly subdued and exposes its disabled state. At doubled text the shared segmented control stacks its choices instead of colliding. No picker or new chart period selector.

Summary is a single bordered surface. Signed Net Flow is dominant, Income/Expenses secondary; all values use exact `formatBrlAmount` and tabular numerals. Native hidden text probes measure all six labels/amounts in the actual loaded fonts, together with content width. Probes are clipped, zero-sized, transparent and hidden from accessibility. Layout stays conservatively stacked until measurements arrive. It chooses three columns, Net Flow above a two-column secondary row, or a full stack according to actual widths/font scale. Probe keys reset with formatted amounts/font scale, preventing stale fit decisions after updates; font-load layout events update their widths too. Amounts have no ellipsis, line caps or auto-shrinking.

## Cash Flow direct interactions and geometry

Stage 1's SVG renderer still consumes its unchanged BigInt buckets through `expo-image`. `cashFlowLayout` describes the normalized 360×160 plot, baseline/top and every bucket column. SVG rectangles and native transparent targets use these same column proportions. The image uses `contentFit="fill"` inside the measured plot rectangle, so it has no letterboxing offset. Native Y-axis text lives outside that rectangle and never intercepts interval selection. Each native target covers its full income/expense column, including inter-bar whitespace and the corresponding label area. No approximate device coordinates or overlapping hit slop.

The new Y-axis displays bounded, localized abbreviations; four restrained dashed guides and a baseline reference the same exact maximum used for geometry. Abbreviations are display-only, never monetary sources. The redundant textual scale range and instruction/chip row are gone. A subtle outlined vertical band and an underlined highlighted label identify selection without color alone. Sparse ticks reserve the selected label's footprint first, suppressing neighboring labels if they would overlap at enlarged sizes; native accessibility labels still expose every interval.

There is exactly one accessible native button target per bucket, with full date/range, exact Income/Expenses and `selected` state. SVG paths are hidden. Selection updates one detail region with authoritative formatted values; no tooltip, navigation, scroll command, DB read or persisted selection. Switching periods remounts the keyed chart; refresh retains a valid interval and updates its values. All zero buckets remain selectable, even in an empty period.

Native Pressable arbitration is retained: no custom responder capture, move handler, prevented default scrolling or gesture library. Selection happens on `onPress`, not press-in. The shared press feedback respects Reduced Motion; no graph animation is introduced. Columns are full-height targets. Twelve year columns necessarily have narrow horizontal bounds on small phones; exact nonoverlapping mapping and screen-reader reachability are preserved instead of adding ambiguous overlapping hit slop. Physical narrow-year touch usability needs checking.

## Unified Spending

`ExpenseDonutChart` now owns the whole Spending region. Compact state renders the unchanged Stage 1 top-five/Other segments and exactly one matching textual breakdown. The diagram supports the rows rather than occupying its former 240-point region: 120–150 points alongside rows, 144 points in stacked/expanded layouts. Parent content width/font scale decide layout. Center labels use restrained smaller typography only when the exact amount fits; otherwise the total moves directly below the diagram. It is never abbreviated or clipped.

View all categories appears only when more than five categories exist and disclosure reveals additional individual rows. It expands inline, exposes expanded/collapsed state, and becomes Show less. Expansion replaces compact rows with every real category in existing authoritative order, including archived names and No category. There is no synthetic Other row in the expanded breakdown. The donut stays grouped; a brief line explains that its Other segment corresponds to the individual rows. Categories belonging to that remainder use the Other marker while the top five retain their exact segment markers. No progress-bar list is appended below the unified region.

One-, three-, five-, six- and 24-category cases are tested. No-expense/income-only/empty periods show contained explanatory text and no false donut or disclosure. Expansion uses already-loaded aggregates and performs zero additional SQLite reads. Rows wrap rather than truncate long names, huge amounts or percentages.

## Responsive layout, colors and accessibility

- Existing native SafeAreaView and one FlatList own vertical scrolling and tab clearance. No nested vertical scroller, copied tabs, fixed page height or forced chart horizontal scrolling.
- 320/390/430 widths and simulated doubled text are reviewed in both themes. Summary, legend, period label, details and category rows wrap/stack; disclosure remains reachable. Internal Finance navigation retains its established horizontal overflow when enlarged text requires it.
- Canvas/group/border/radius/type come from Design System v2. `overviewColors` supplies provisional scoped sage Income, rose Expenses, signed Net Flow and six category slots, with separate light/dark values. No app-wide Finance palette or global token migration.
- Summary labels and signed exact values communicate financial meaning beyond color. Every interval has one selected accessible button; the detail region is informational. Spending rows expose name, exact amount and share. Disclosure is the only category button. No aggressive graph/disclosure animation or extra live announcement duplicates the button's exact-value label.

## Performance and Stage 1 compatibility

No analytics, query, money, period, source-domain, schema, migration, dependency or persistence changes in Stage 2. Existing indexed period projection still supplies totals, buckets and categories together. The five-plus-Other transform remains memoized in the dashboard; SVG source/geometry and expanded row transformation are memoized by their actual inputs. Text measurement and disclosure changes do not requery or reaggregate the ledger. Scrolling does not regenerate chart SVGs. Exact BigInt reconciliation and commitment/Work inclusion rules retain Stage 1 coverage.

## Skill findings

- **frontend-design:** use the target's three owned regions, one summary hierarchy and direct on-chart interval state. Preserve the real data and Axis type convention; retain readable text even where the illustration is denser.
- **Impeccable:** remove duplicate category representations and explanatory controls, reduce outer gaps, keep supporting donut size bounded and avoid additional card stacks. Batched visual review plus one confirmation caught/fixed real overlap/navigation defects.
- **UI/UX Pro Max:** consulted Mobile Touch Spacing guidance; apply native targets and exact-value labels. Do not insert artificial eight-point gaps between chart intervals: that would contradict full-column selection and create dead areas. Full-height native columns and independent accessible focus are used; narrow year targets need device testing. Expanded rows replace compact rows rather than duplicating them.
- **Expo building-native-ui:** retain SDK 57 `expo-image`, shared normalized overlay geometry, normal Pressable scroll cancellation and native selected-state semantics. Actual native text measurement governs summary layout; preserve existing safe areas and avoid gesture/native dependencies. References checked: [Expo 57](https://docs.expo.dev/versions/v57.0.0/), [React Native Text layout](https://reactnative.dev/docs/text#onlayout), [Pressable](https://reactnative.dev/docs/pressable).

## Tests and review artifacts

Stage 1 pure financial tests are unchanged. Mounted chart/Overview assertions were updated to activate the transparent direct targets and unified disclosure rather than removed controls. New Stage 2 tests exercise shared geometry across 5/7/12 columns and varied widths, zero selection, every native interval, selected SVG state, label collision avoidance, exact inspection, no queries on selection/expansion, measured summary transitions, selection retention after refresh and individual expansion for 1/3/5/6/24 categories. Existing Finance/source regressions cover period limits, linked payments, expected/unpaid exclusion, edit/delete/resume/refocus and failed refresh retention.

Twenty-four current-source captures include both themes/all three widths/large text, Week/Month/Year, zero selection, compact/expanded Spending, one category, no expenses, empty periods, 24 expanded categories and a real 390×844 scrolling sequence. Browser checks record no chart/summary/spending viewport overflow, image decode failures, page errors or SVG/native column misalignment. Native modules and `useFinance` are substituted only for captures; fixtures are generated with actual SQLite queries. This is not physical Dynamic Type or native touch evidence.

Generate preview: `node node_modules/tsx/dist/cli.mjs scripts/preview-finance-charts.ts --stage2`. See [checks and captures](visual-reviews/finance-overview-v2-stage-2/README.md).

## Physical device checklist

- iOS and Android: actual SVG bar/donut decoding, full-column quick taps including zero intervals, narrow Year selection and focus outline/state.
- Vertical swipe beginning on a chart column scrolls without accidental selection; tapping does not jump scroll. No touch area covers Y-axis/navigation/detail/disclosure.
- VoiceOver/TalkBack: one target per interval, exact date/amounts, selected state and no path stops; informative Summary and category rows; expanded/collapsed disclosure.
- Native doubled text/font scaling: measured Summary transitions, labels/huge currency wrapping, tab-strip reachability and every category/disclosure reachable.
- Safe-area/native-tab clearance in portrait/landscape and both themes; selected interval updates after transaction edits/deletes and returning to Overview.

## Files changed in Stage 2

- `src/features/finance/components/finance-dashboard.tsx` — v2 period controls, measured single Summary surface and unified composition.
- `src/features/finance/components/cash-flow-chart.tsx` — one accessible native target per column, axis, selected state and exact details; no chip row.
- `src/features/finance/components/expense-donut-chart.tsx` — one compact/expanded Spending section with a supporting donut.
- `src/features/finance/chart-presentation.ts` — shared-layout plot rendering, grid and selection band; existing donut path renderer retained.
- `src/features/finance/overview-presentation.ts` — new scoped colors, measured-fit decisions, display axis labels, shared plot/tick geometry.
- `src/features/finance/finance-screen.tsx` — bounded Overview v2 header/background/navigation and spacing.
- `src/components/design-system.tsx`, `src/components/form-controls.tsx` — preserve opt-in compact-navigation padding in the v2 button path.
- `src/components/ui-icon.tsx` — two authored chevrons added to the existing vocabulary; Stage 1 encoder extraction preserved.
- `scripts/preview-finance-charts.ts` — Stage 2 output flag and single/many-category review fixtures.
- `tests/finance-overview-v2.test.ts` — 19 focused Stage 2 tests.
- `tests/finance-charts-integration.test.ts`, `tests/finance-dashboard.test.ts`, `tests/finance-overview.test.ts` — update presentation assertions while retaining source/refresh/money coverage.
- This document, the Stage 1 supersession note, and `docs/visual-reviews/finance-overview-v2-stage-2/` (24 PNGs, checks JSON and index).

The pre-existing Stage 1 changes to `analytics.ts`, `charts.ts`, `svg-source.ts`, pure chart tests and archived captures remain preserved. No Stage 2 edits to Finance querying/domain rules, other Finance destination bodies, other feature screens, dependencies, schema or persistence.

## Validation (2026-10-22)

| Check | Result |
| --- | --- |
| TypeScript | Pass |
| Stage 2 tests | 19 passed |
| Stage 2 + Stage 1 charts + Dashboard/Overview | 89 passed |
| Focused Finance aggregates/ledger/Commitments/Work plus chart/Overview regressions | 235 passed |
| Full automated suite | 1,200 passed, zero failures |
| ESLint exact baseline comparison | Zero differences: six existing errors and two existing warnings |
| iOS export | Pass (`dist/finance-overview-v2-ios`) |
| Android export | Pass (`dist/finance-overview-v2-android`) |
| Functional review | 24 captures; twelve width/theme/text combinations, no detected region overflow, image failure, page error or SVG/target misalignment |
| `git diff --check` | Pass |

The existing lint errors are `react/no-children-prop` in context-menu (three), navigation-conventions (two) and transactions-experience (one) tests; warnings are two unused variables in tasks-experience tests. No new diagnostics. Full test runs use America/Sao_Paulo and serial file execution. Logs/export bundles remain under ignored `dist/`.

All work remains uncommitted. No commit or push was performed.

# Finance Overview v2.1 — Spending responsive correction

## Scope and cause

The previous layout placed the donut beside the entire category breakdown once its container passed a width threshold. The remaining list width did not account for real category labels, exact BRL amounts and percentages. The number container also lacked sufficient shrink/full-width constraints. Earlier viewport-level checks could miss text outside the card but still inside the screen.

This correction changes only Spending presentation and its review/tests. Stage 1 aggregation/query/Other semantics, Financial Summary, Cash Flow, period controls, other Finance destinations and native navigation are preserved. All earlier uncommitted work remains in place. No schema, persistence, migration or dependency changes.

## Composition and containment

- One Spending surface with a compact donut/total introduction, divider, full-width breakdown and existing inline disclosure.
- The donut is supporting geometry, sized from actual available content width up to 104 points. Its exact SVG segments, colors and grouping are unchanged. No total text is forced into the hole.
- The total sits beside the donut only when its measured native text width fits; otherwise the introduction stacks. The exact amount retains its existing numeric typography.
- The category list always occupies the full content width below the introduction, including on larger layouts. There is no unverified breakpoint that squeezes a full list beside the donut.
- Each row measures native category-name and amount text. Unknown measurements remain stacked. Known measurements choose a wrapping name column beside amount/percentage, or a full-width name followed by full-width values.
- Exact amounts are right-aligned; percentages are secondary on their own line. Containers explicitly use `minWidth: 0`, `maxWidth: '100%'` and shrink constraints. Long strings can wrap naturally; no ellipsis, fixed row height, automatic font shrinking or absolutely positioned values.
- Measurement probes use the same typography and tabular digits as visible values, with a two-point rounding allowance for the amount column. A first capture pass caught a missing tabular-digit setting that otherwise caused ordinary amounts to wrap. Probes are zero-sized/clipped, transparent, hidden from accessibility and noninteractive.
- Probe keys follow formatted content and font scale so changed values trigger fresh measurements. Layout updates do not query SQLite or reaggregate financial data.

## Compact/expanded behavior

Compact rows remain the authoritative five largest categories plus exact Other where needed. Expansion replaces them with every real individual category, including archived names and No category; no synthetic Other row replaces real entries. The donut remains grouped and the existing explanatory line/disclosure state is retained. View all categories and Show less perform no additional reads.

## Review and tests

The [review index](visual-reviews/finance-spending-v21/README.md) contains 32 captures and checks for 30 cases. The matrix exercises 320/390/430 widths, normal/doubled text, both themes and compact/expanded stress data. Separate captures cover one category, five categories and ordinary five-plus-Other data. Stress fixtures include long spaced names, long unbroken names, archived/uncategorized expenses, `R$ 123.456.789,01`, and aggregate totals above the safe Number range. Fixtures use actual SQLite projections, not hand-authored chart totals.

The browser runner checks the card's inner horizontal bounds, every visible non-whitespace text glyph, element rectangles, full-width list ownership below the introduction, SVG decoding and bounded donut size. It ignores clipped probes and invisible trailing whitespace at wrapped line ends. Final result: zero containment failures or page/image errors in all 30 cases. Normal amounts now remain on one line when they fit; extreme amounts wrap completely inside the card.

Eight new mounted/pure tests cover measured intro/row transitions, matching tabular-number probes, large exact amounts, no line caps/absolute values, and unchanged zero-query compact/expanded category behavior. Existing Finance tests retain financial totals, source inclusion, periods, refresh and disclosure coverage.

Review commands:

```sh
node node_modules/tsx/dist/cli.mjs scripts/preview-finance-charts.ts --spending-fix
node scripts/review-finance-spending-v21.cjs
```

The runner reuses an existing external Playwright/Chromium installation; `AXIS_PLAYWRIGHT_PATH` and `AXIS_CHROMIUM_PATH` can override local defaults. No package is installed. Native hosts and useFinance are substituted only for browser capture. This is not physical iPhone/Android evidence or true native Dynamic Type.

## Files

- `src/features/finance/components/expense-donut-chart.tsx` — intro/full-width rows, measured fit and containment.
- `src/features/finance/spending-layout.ts` — small pure width/fit helpers.
- `tests/finance-spending-v21.test.ts` — focused regression coverage.
- `scripts/preview-finance-charts.ts` — isolated review output flag and five/stress fixtures.
- `scripts/review-finance-spending-v21.cjs` — reproducible glyph/card containment checks and captures.
- This document, the Stage 2 supersession note and `docs/visual-reviews/finance-spending-v21/`.

## Physical checks still needed

On iPhone and Android, check native text measurement/font loading, true accessibility text sizes, long BRL wrapping, screen-reader row/disclosure labels, scrolling through expanded rows and bottom-tab clearance. Test both themes, rotation and transaction refresh. Existing browser checks do not replace these native checks.

## Validation

| Check | Result |
| --- | --- |
| New Spending tests | 8 passed |
| Focused Finance/chart/Overview/ledger/Commitments/Work tests | 243 passed |
| Full automated suite | 1,208 passed, zero failures |
| TypeScript | Pass |
| ESLint baseline comparison | Zero new diagnostics; existing six errors and two warnings unchanged |
| iOS export | Pass (`dist/finance-spending-v21-ios`) |
| Android export | Pass (`dist/finance-spending-v21-android`) |
| Browser containment | 30 cases passed, 32 captures |
| `git diff --check` | Pass |

Validation logs and exports are under ignored `dist/`. Pre-existing lint diagnostics remain in context-menu, navigation-conventions, transactions-experience and tasks-experience tests, outside this correction.

Nothing was committed or pushed.

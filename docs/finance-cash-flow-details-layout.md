# Cash Flow interval details layout correction

## Root cause

The inspection card was a horizontal flex row with wrapping. Its growing date heading had a 140-unit flex basis and competed with an intrinsically sized metrics container. Different date/amount lengths therefore changed whether all three facts shared a row. This was emergent flex wrapping, rather than an explicit interval-dependent JavaScript branch.

## Correction

- The card is always a column: full-width localized date heading, then a separate full-width metrics row.
- Income and Expenses use equal flex bases and growth, preserving balanced columns. Each keeps its semantic indicator, secondary label and exact selectable amount.
- Only the metrics row wraps. Its column basis scales with the existing system font scale, so narrow containers or accessibility text stack the metrics without moving the date beside them.
- Text wraps naturally; no line cap, ellipsis, hidden overflow, reduced font scaling or fixed height is introduced. Extremely large amounts may occupy multiple lines.
- Existing padding, gaps, Axis typography, borders and light/dark colors are retained.
- No aggregation, BigInt arithmetic, dates, chart geometry/SVG, touch targets, selection highlighting, navigation, Summary, Spending or other Finance screens changed. No dependency/configuration/persistence changes.

## Files

- `src/features/finance/components/cash-flow-chart.tsx`: inspection-only layout and stable regression selectors.
- `tests/finance-cash-flow-details.test.ts`: 15 component regressions.
- `scripts/review-cash-flow-details.cjs`: reusable rendered-geometry check using the existing external Playwright/Chromium installation; no new dependency.
- `docs/finance-cash-flow-details-layout.md`: this record.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | Pass against SDK 58 |
| ESLint | Existing baseline unchanged: six errors, two warnings; changed files pass |
| New layout tests | 15/15 pass |
| Focused Finance suite | 168/168 pass |
| Full suite | 1,225/1,225 pass on the complete rerun; no failures, skipped or cancelled tests |
| Rendered geometry | 72 cases / 216 selections, plus 12 populated high-value stress cases; no detected overflow/clipping, unstable nodes, unequal column widths or misplaced date/metrics |
| iOS export | Pass |
| Android export | Pass |
| git diff --check | Pass |

The first full run encountered an unrelated existing Tasks interaction failure and remained open with pending timers. `tasks-experience.test.ts` passed all 23 tests in isolation; that diagnostic used Node's `--test-force-exit` for process cleanup. The complete rerun then passed all 1,225 tests in 111 seconds, using normal exit behavior and all original assertions, without that flag. No Tasks code or assertions were changed.

Component tests cover 320/390/430-unit windows, font scales 1/2 and both themes, short/long/cross-month ranges, exact large values, zero intervals, and first/middle/last week/month/year selections. They verify stable date-first hierarchy, complete selectable values and unchanged selection semantics.

The geometry checks use the existing Finance RN Web preview, real components/fonts and SQLite-derived analytics. They inspect actual element/glyph bounds, equal metric widths, text content and node identity as selections change. Screenshots and JSON results are ignored under `dist/cash-flow-details/`. This is browser evidence, not a native simulator or physical-device capture.

To reproduce the component preview and geometry review:

```powershell
node node_modules/tsx/dist/cli.mjs scripts/preview-finance-charts.ts --stage2
node scripts/review-cash-flow-details.cjs
node scripts/review-cash-flow-details.cjs --stress-only
```

`AXIS_PLAYWRIGHT_PATH` and `AXIS_CHROMIUM_PATH` can point the review script to an existing installation on another machine. No package installation is performed by the script.

## Review findings

Frontend-design and Impeccable's independent layout assessment identified the unstable topology and unequal intrinsic metric sizing. Impeccable's layout detector found no mechanical findings before or after the change; source and rendered evidence were needed to diagnose it. UI/UX Pro Max's wrapping guidance was treated as advisory; its stack search returned unrelated recommendations, so the implementation followed existing Axis patterns and the current [React Native flexbox reference](https://reactnative.dev/docs/flexbox).

## Physical checks remaining

On an SDK 58-compatible iPhone build, switch first/middle/last and zero-value intervals in Week/Month/Year. Check localized long dates, very large BRL values, VoiceOver reading order and normal/largest Dynamic Type in both themes. Confirm the date always remains above the metrics, all amounts can be read, and the surrounding chart/scroll interaction is unchanged. Repeat on Android for native text wrapping.

## Git

Earlier uncommitted SDK 58 work was preserved. This correction adds only the four files listed above (one modified component, three new supporting files). Nothing committed or pushed.

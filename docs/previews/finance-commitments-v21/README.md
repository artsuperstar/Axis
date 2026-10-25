# Commitments v2.1 — Compact Two-Column Cards

Real-component RN Web evidence for the focused card layout correction. The [implementation record](../../finance-commitments-v2.md#commitments-v21--compact-two-column-cards) documents preserved behavior, responsive rules and skills findings.

## Before and after

Baseline was built from the unchanged v2 card before the v2.1 edit, using the same preview builder and fixtures. `before.json` preserves equivalent-content measurements; current source builds the refined component.

| 390pt, 1× | Original | Refined |
| --- | --- | --- |
| Dark | [Before](before-upcoming-390-dark-1.png) | [After](after-upcoming-390-dark-1.png) |
| Light | [Before](before-upcoming-390-light-1.png) | [After](after-upcoming-390-light-1.png) |

At 390pt: installment **154→138**, subscription **154→106**, bill **154→106**. At 430pt all three are **154→106**. Both themes agree. At 320pt the readable stacked fallback is **186**, versus original installment 178 and subscription/bill 154. This narrow tradeoff is intentional; density is not claimed to improve everywhere. Full per-card measurements are in [density.json](density.json).

## Matrix and checks

**40 PNGs:** six original 320/390/430 scenes in both themes; 28 refined scenes; six enlarged full-card captures.

- `after-upcoming-{320,390,430}-{dark,light}-1.png`: all three kinds at standard widths.
- `after-stress-{320,390,430}-{dark,light}-{1,2}.png`: long unbroken title, archived category, maximum BRL and installment sequence; `-card.png` shows the full first enlarged card.
- `after-long-text-390-*.png`: long title/category with an ordinary amount.
- `after-mixed-390-*.png`: actual Overdue/Today/Upcoming.
- `after-actions-390-*.png`, `after-pay-390-*.png`, `after-details-390-*.png`: explicit separate action paths and preserved sheets.

[after.json](after.json) records 28 scenes and 100 rendered cards, including bounds for information, trailing amount/actions and individual press targets. Automated checks require normal 390/430 columns to sit beside each other at the same top position, complete card text containment, no horizontal page overflow, targets at least 48×48, no overlapping targets, and isolated Details/Pay/menu navigation. No recorded browser errors or geometry failures. Independent Impeccable layout assessment: **ship**, no material issues within source/RN Web evidence.

## Reproduce refined evidence

```powershell
$env:ESBUILD_WORKER_THREADS='0'
$env:AXIS_COMMITMENTS_PREVIEW_DIR='dist/finance-commitments-v21'
node node_modules/tsx/dist/cli.mjs scripts/preview-finance-commitments.ts
node scripts/review-finance-commitments-v21.cjs
```

The default review compares against the preserved baseline JSON. `--before` was used with the pre-edit component and its ignored baseline bundle; do not regenerate that historical baseline from current source. No new dependencies were added. Existing Playwright/Chromium paths can be overridden with `AXIS_PLAYWRIGHT_PATH` / `AXIS_CHROMIUM_PATH`.

## Evidence limits

Fixtures are projected by real migrated SQLite services at 2026-10-24. Runtime lifecycle/data and native platform boundaries are substituted; screenshots do not prove actual payment writes. Browser locale is pt-BR, timezone America/Sao_Paulo, actual shared fonts/tokens are loaded, and Reduced Motion is enabled. Doubled text simulates growth and native fontScale branching; it is not native Dynamic Type measurement. Native tabs/status bars/keyboard are not fabricated. Separate automated regressions cover ledger and scheduling behavior. Production HTML/CSS detection does not apply to this React Native component.

## Validation

- Focused Commitments/Finance group: **290 passed, zero failures** (`dist/finance-commitments-v21/focused-tests-final.log`). Covers payment, ledger, scheduling, reversal, Calendar, Overview, Journal, refresh and navigation.
- Full automated suite: **1,276 passed, zero failures**, 1,264 top-level TAP items, 183.7 seconds (`dist/finance-commitments-v21/full-suite.log`).
- TypeScript `--noEmit`: **passed on final source**, `dist/finance-commitments-v21/typecheck-final.log`.
- ESLint baseline comparison: **six existing errors, two existing warnings; zero added or removed diagnostics** versus the final v2 baseline (`dist/finance-commitments-v21/eslint-comparison.json`). No suppressions added.
- Final changed-file ESLint check: **zero errors or warnings**, `dist/finance-commitments-v21/eslint-changed-final.json`.
- Final iOS and Android production JavaScript exports: **passed**, logs under `dist/finance-commitments-v21/`.
- Visual/geometry comparison: **28 refined scenes, 100 rendered cards**, plus preserved six-scene baseline and six full-card captures; no browser errors or recorded geometry failures.
- `git diff --check`: **passed**.

Two new regression cases cover sibling-column/action ownership across all kinds and enlarged-text complete-money fallback. Existing long-content tests now assert the new wrapping/stacking content structure. Initial new tests needed optional access for text nodes in the test host; the existing old name/amount-pair assertion was updated for the intentional column change. Final runs above pass without removing functional coverage.

## Physical testing still needed

Actual iOS/Android font metrics, Yoga wrapping, original/refined native heights, VoiceOver/TalkBack ordering, touch dispatch during scroll, menus/sheets, native tab/safe-area clearance and variable-height list performance remain device checks. No staging, commit or push.

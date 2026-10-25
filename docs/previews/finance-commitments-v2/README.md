# Finance Commitments v2 review evidence

These are **real-component RN Web captures** of the main Finance Commitments redesign. They show the corrected no-hero composition, generic kind icons, exact expected amounts, real projected sections and deliberate existing actions. Connected payment/management/history scenes document preserved legacy presentation; they do not claim those surfaces received a v2 redesign.

## Reproduce

From the project root:

```powershell
$env:ESBUILD_WORKER_THREADS='0'
node node_modules/tsx/dist/cli.mjs scripts/preview-finance-commitments.ts
node scripts/review-finance-commitments.cjs
```

Build output is ignored under `dist/finance-commitments-v2-preview`. Existing Playwright/Chromium locations can be overridden with `AXIS_PLAYWRIGHT_PATH` and `AXIS_CHROMIUM_PATH`. No application dependency is added.

## Matrix

There are **36 scene captures plus 6 additional enlarged full-card captures: 42 PNGs**. `checks.json` has 36 scene records plus 2 long-list records: **38 checks, zero recorded failures**.

| Files | Evidence |
| --- | --- |
| `stress-{320,390,430}-{dark,light}-{1,2}.png` | Both themes, three widths, normal/simulated doubled text, long/unbroken title, archived category, exact maximum BRL and installment progress |
| `stress-*-2-card.png` | Full first commitment card in each enlarged-text scene |
| `upcoming-390-{dark,light}.png` | Existing expected Upcoming composition and three kinds |
| `same-types-390-{dark,light}.png` | Different titles sharing Receipt/Repeat/Layers according only to commitment kind |
| `mixed-390-{dark,light}.png` | Actual Overdue, Today and Upcoming together |
| `overdue-390-{dark,light}.png` | Overdue-only unresolved installment |
| `empty-390-{dark,light}.png` | No parents, with one Add and global management access |
| `quiet-390-{dark,light}.png` | Existing paused/ended/completed parents with no unresolved preview |
| `actions-390-{dark,light}.png` | Main card menu with Skip/View commitment and no duplicate Pay |
| `options-390-{dark,light}.png` | Global Manage commitments / History menu |
| `pay-390-{dark,light}.png` | Existing legacy payment confirmation, before any write |
| `manage-390-{dark,light}.png`, `history-390-{dark,light}.png` | Preserved legacy landing presentations and retained lifecycle records |
| `long-bottom-390-{dark,light}.png` | Actually scrolled final card of the 100-series fixture and browser bottom clearance |
| `checks.json` | Glyph/card bounds, page overflow, fixture type-icon identity, Add/options bounds, browser errors and long-list mounting/final-card position |

Examples: [dark Upcoming](upcoming-390-dark.png), [light Upcoming](upcoming-390-light.png), [mixed sections](mixed-390-dark.png), [same kinds](same-types-390-light.png), [320 doubled text](stress-320-dark-2.png), [main actions](actions-390-dark.png), [legacy payment](pay-390-light.png), [last card](long-bottom-390-dark.png).

## Provenance and evidence limits

FinanceScreen, CommitmentsView, CommitmentCard, existing connected forms/menus, shared fonts and tokens are real. Initial records and projections are built with migrated real SQLite services, including actual payment/completion/archival setup where relevant. The runtime `useFinance` lifecycle and data-operation boundary are substituted with fixture projections; screenshots do not perform or prove actual payment/reversal writes. Separate component and real-SQLite tests cover persistence, eligibility, linkage and scheduling.

Native safe-area/module boundaries, focus events, lifecycle and platform date picker are substituted. Platform is web; local fonts are real. Browser locale is pt-BR and timezone is America/Sao_Paulo; fixture today is 2026-10-24. Reduced Motion is enabled. Doubled text simulates font growth and native fontScale branching, not actual UIKit/Android text measurement. No native tab/status bar, testing gear, merchant artwork or OS keyboard is fabricated. All PNGs are screenshots; no raster art was generated or sourced.

The browser's 100-series fixture initially mounts **16 cards**. Actual scrolling reaches Series 099; its bottom is **968** in a 1000-high viewport, demonstrating **32 points of browser bottom padding**. This does not establish native tab clearance or hardware performance. Production still reads/projects the existing source collection; the UI change does not add database pagination.

All 36 scene setups assert exactly one Add commitment, no redundant Commitments heading/hero, and nonoverlapping Add/global-options target bounds. Final scene checks record no glyph/card overflow, page horizontal overflow or browser errors. Type assertions confirm the displayed fixture cards use their generic kind icons. These checks do not certify native focus, assistive technology, gestures, safe areas or every domain behavior.

## Review and documentation handoff

The initial independent Impeccable review opened all **42 screenshots** and found two material issues: incomplete body accessibility metadata and poor Add commitment wrapping at 320/doubled text. The card label now includes kind, category and nonactive parent status. The narrow enlarged toolbar stacks the full-width naturally sized Add action above a right-aligned global menu. An intermediate zero-flex layout collapsed its height; the final explicit flex sizing resolves that overlap.

The same 42-image matrix was regenerated. The reviewer followed up on both findings, confirmed them resolved and returned **SHIP**. That follow-up was scoped to those corrections; the initial full review remains the all-image audit. The current matrix adds automated hit-box assertions across all 36 scenes. No UI changes followed the current captures.

The implementation agent compared the user image directly. Original mockup pixels were unavailable as a filesystem artifact to the independent reviewer; it assessed the written brief/composition, source and RN Web evidence. Native device behavior remains unverified. The HTML/CSS detector does not apply to the production React Native target.

The [implementation record](../../finance-commitments-v2.md) documents the 20-item behavior audit, incumbent Warm Editorial Hearth / Operate comparison, type-only icons, expected-versus-actual money, lifecycle/reversal compatibility, connected legacy surfaces and performance limits. No new visual world, tokens, global palette commitment or design file was introduced. Pre-existing PRODUCT.md SDK57 text and absent DESIGN.md are recorded without repair.

## Validation

- Final focused group, including Calendar component coverage: **288 passed, zero failures** (47.8 seconds), `dist/finance-commitments-v2/focused-tests-final.log`.
- Final full automated suite: **1,274 passed, zero failures** (199.9 seconds; 1,262 top-level TAP items), `dist/finance-commitments-v2/full-suite-reviewed.log`.
- TypeScript `--noEmit`: **passed**; `dist/finance-commitments-v2/typecheck-final.log` is empty and the command completed successfully before lint.
- ESLint comparison: **six existing errors, two existing warnings; zero added or removed diagnostics** against the Categories baseline, `dist/finance-commitments-v2/eslint-comparison.json`.
- Final iOS and Android SDK58 production JavaScript exports: **passed**, `dist/finance-commitments-v2/ios-export.log` and `android-export.log`.
- Final capture run: **36 scenes, 42 PNGs, 38 check records, zero recorded failures**; reviewer follow-up resolved both findings and returned **SHIP** within the original main-screen/source/RN Web scope.
- Impeccable ordinary-extension documentation handoff: **completed**; `git diff --check` passed after documentation edits.

An earlier Calendar shallow-render assertion assumed eagerly mounted Pay rows. Its correction asserts normal Upcoming SectionList data separately from the selected distant future detail's Pay action. Source navigation/projections are unchanged and final coverage passed. Branch remains `main`, HEAD `5ddb625a`; nothing was staged, committed or pushed by this stage.

## Physical testing

On iOS and Android: actual font scaling/long money and categories at narrow widths; Add/global-options target separation; body/details versus Pay ownership; menus and focus return; VoiceOver/TalkBack kind/category/nonactive parent summaries; payment/Skip/lifecycle confirmation; Calendar-focused obligations; reversal/refocus; existing native picker/keyboard/dismissal; long-list performance; native tab/safe-area bottom clearance. Browser captures and JavaScript exports do not replace installed-device testing. No commit or push is performed.

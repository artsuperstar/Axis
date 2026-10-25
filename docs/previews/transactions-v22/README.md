# Transactions v2.2 review evidence

Captured 2026-10-24 for the informational-card/contextual-actions/header correction. These are current real-component RN Web captures, separate from historical Transactions v2 and Transaction Editor v2 evidence.

## Reproduce

From the project root:

```powershell
$env:ESBUILD_WORKER_THREADS='0'
node node_modules/tsx/dist/cli.mjs scripts/preview-finance-transactions.ts
node scripts/review-finance-transactions.cjs
```

The scripts now target `dist/transactions-v22-preview` and this directory. Existing historical captures are preserved. Playwright/Chromium locations can be supplied with `AXIS_PLAYWRIGHT_PATH` / `AXIS_CHROMIUM_PATH`.

## Matrix and provenance

- 28 base scenes: 320/390/430 width, dark/light, normal/simulated doubled text; mixed sources, expense filtering, maximum exact money, unbroken names, archived metadata, search match/no-match, empty and history paging.
- 10 additional full-card captures for enlarged-text scenes.
- 8 menu captures at 390 in both themes: Manual, Commitment, Work and Categories options.
- `checks.json`: 29 checks, zero geometry/assertion/console failures. All rows have a contextual menu; bodies contain no buttons or button role; the removed header/subtitle are absent; Categories remains reachable. Filters retain single-line labels in their appropriate shared arrangement. Four history pages retain all 152 fixture records.

Examples: [dark screen](mixed-390-dark.png), [light screen](mixed-390-light.png), [commitment actions](mixed-390-dark-commitment-menu.png), [Work actions](mixed-390-light-work-menu.png), [320 doubled-text card](stress-320-dark-2-long-card.png).

FinanceScreen, transaction rows, controls, ContextMenu, fonts and tokens are real. Ledger/lifecycle/native boundaries are fixtures; money/source metadata is intentionally synthetic review content. The Work row exercises the source-owned menu with representative metadata. iOS platform is selected for presentation; no native tab bar or OS status bar is fabricated. Reduced Motion is enabled. RN Web lacks native `sendAccessibilityEvent`, so the fixture stubs it; real assistive-technology focus is unverified. Doubled text simulates growth and cannot prove native text measurement. Native Alert confirmation/data writes are proven separately by component/real-SQLite tests, not by these screenshots.

No raster art was generated or sourced; PNGs are browser screenshots. No HTML/CSS detector ran because production targets are React Native. This is a narrow ordinary extension of the incumbent Warm Editorial Hearth system. The fresh independent Impeccable reviewer inspected all 46 PNGs and returned **ship**, with no material fixes within this visual/code evidence scope. Native rendering, safe areas, gestures and assistive technology remain unverified.

The documentation handoff compared the source with the existing Warm Editorial Hearth tokens: Finance retains Lora, practical content remains Manrope, and cream/charcoal surfaces, quiet borders, category tiles, spacing, shape and provisional Finance amount colors remain unchanged. The Operate surface now moves directly from destination navigation to its controls. Card bodies provide informational summaries; the explicit menus own Manual Edit/Delete, Commitment details/Delete payment, and Work details. Categories and the single anchored create action remain available. Shared Commitment reversal validates ownership before confirmation and again inside an immediate transaction; ledger soft deletion, Pending restoration and installment completion reconciliation commit or roll back together. Completed plans restore Active or Paused according to retained open/closed schedules. Details retain existing protected editing and source workspace navigation.

The handoff corrected stale current-behavior descriptions and labeled original v2 evidence as historical in the [implementation record](../../finance-transactions-v2.md). No global design files or new tokens were introduced. Missing `DESIGN.md` and the older SDK57 reference in PRODUCT.md are pre-existing documentation drift.

## Validation

- Focused Finance/Transactions/Commitments/ledger/Overview/analytics/Calendar/Journal/Work: **352 passed**.
- Full automated suite: **1,252 passed, zero failures** (160.9 seconds). Existing non-failing React `act` diagnostics and expected injected-error logs are not suppressed globally.
- iOS and Android SDK58 production JavaScript exports: **passed**.
- TypeScript: **passed** (`dist/transactions-v22/typecheck-final.log`; the command proceeded to lint only after a successful exit).
- ESLint baseline comparison: **six existing errors, two existing warnings; zero added or removed diagnostics** (`dist/transactions-v22/eslint-comparison.json`).
- Impeccable ordinary-extension documentation handoff: **completed**, with current behavior checked against source and the incumbent design system.
- `git diff --check`: **passed**. No commit or push was performed.

## Physical testing

On iOS and Android: scroll/touch across card background/icon/title/amount without opening anything; explicit ⋯ action discovery and focus return; VoiceOver/TalkBack informational reading and action labels; native confirmation Cancel/Delete payment; duplicate/stale confirmation behavior; details → protected editor/source dismissal; large text; keyboard/search; anchored create/tab clearance; Overview/Commitments/Calendar/Journal refresh after reversal. Exports and browser captures do not replace an installed-device test.

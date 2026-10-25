# Finance Commitment Payment Confirmation v2 review evidence

These are **real-component RN Web screenshots** of Pay commitment. **Native iOS/Android recapture is pending.** The independent reviewer opened all 45 PNGs, found no material browser defect and explicitly returned **RECAPTURE** because native screenshots were unavailable. No whole-surface approval or native certification is recorded.

## Reproduce browser evidence

From the project root:

```powershell
$env:ESBUILD_WORKER_THREADS='0'
node node_modules/tsx/dist/cli.mjs scripts/preview-commitment-payment-v2.ts
node scripts/review-commitment-payment-v2.cjs
```

Output is ignored under `dist/commitment-payment-v2-preview`. The existing local Playwright/Chromium installation can be overridden with `AXIS_PLAYWRIGHT_PATH` / `AXIS_CHROMIUM_PATH`. No application dependency is added.

## Matrix

There are **38 base scenes plus 6 enlarged-text scrolled Payment views and 1 scrolled picker view: 45 PNGs**. `checks.json` has **38 records / 76 actual label/field pairs**, two per scene, with zero recorded errors, page/region horizontal overflow or assertion failures.

| Files | Browser evidence |
| --- | --- |
| `{bill,subscription,installment}-{dark,light}.png` | All kinds and generic identity icons at 390 |
| `installment-{320,430}-{dark,light}.png` | Ordinary narrow/wide header and form |
| `stress-{320,390,430}-{dark,light}-{1,2}.png` | Both themes/three widths, normal or simulated doubled text, long context and maximum money |
| `stress-*-2-payment.png` | Actual scrolling at the configured enlarged viewport to reach Payment/date |
| `different.png`, `max-expected.png`, `max-actual.png` | Actual/expected independence, including differing maximum-value cases |
| `early.png`, `overdue.png` | Distinct due/payment dates and actual source-projected overdue context |
| `uncategorized.png`, `archived.png` | Explicit No category and retained historical name |
| `long-title.png`, `long-category.png` | Wrapped metadata without arbitrary truncation |
| `invalid-amount.png`, `invalid-date.png` | Existing validation messages beside amount/date and retained draft |
| `picker.png`, `picker-scrolled.png` | Explicit browser substitution at the native picker boundary |
| `keyboard.png`, `bottom.png` | Simulated keyboard-constrained viewport and actual scroll to the date control |
| `loading.png`, `save-error.png` | Promise-based preview pending state and substituted write rejection |

Examples: [primary dark](installment-dark.png), [primary light](installment-light.png), [320 enlarged top](stress-320-light-2.png), [same scene Payment](stress-320-light-2-payment.png), [different actual](different.png), [pending](loading.png), [picker boundary](picker-scrolled.png).

## Provenance and limits

CommitmentPayment, AdaptiveModal/AdaptiveSheet, shared fields/buttons, kind resolver, fonts and tokens are real. Migrated SQLite services prepare the fixture obligations/projections at 2026-10-24, including actual type/due/category/expected metadata; browser amount/date defaults follow the current local clock. Runtime Save callbacks are substituted and do not persist a real Expense. The pending scene returns a controlled Promise solely to demonstrate UI busy state; production SQLite writes remain synchronous.

Most scenes select the iOS presentation branch with a labeled browser date input replacing the native picker. `invalid-date` uses the explicit web text-date fallback. Keyboard metrics simulate an occlusion frame at y=560; there is no OS keyboard screenshot. Native modules, safe-area measurements, accessibility events and animation boundaries are substituted. Fonts are real, Reduced Motion is enabled, browser locale is pt-BR and zone is America/Sao_Paulo. Doubled text simulates growth/fontScale branching rather than native text measurement.

Screenshots use the configured scene viewport (1050 high ordinarily, 1400 enlarged). Scrolled Payment/picker views preserve that viewport. No native status/tab bar, keyboard, merchant artwork or primary mockup is fabricated. PNGs are screenshots; no raster art was generated or sourced.

All 38 scenes check that editing actual/date leaves the read-only summary unchanged and that it contains no buttons/inputs. Geometry checks measure actual amount/date labels above controls, complete summary/Payment bounds, header targets at least 48 units and keyboard-scene header position above the simulated frame. Pending checks assert Confirm is busy/disabled and called once. These establish browser projection/interaction only. Real-SQLite/component regressions separately establish atomic writes, exact money, eligible source identity, rollback, completion and reversal.

## Review and documentation handoff

The main implementation agent compared the supplied mockup directly and inspected primary/stress/pending screenshots. The fresh independent reviewer opened all **45 PNGs** and found no material browser presentation issue. It lacked both genuine native screenshots and filesystem-accessible primary-mockup pixels, and its disposition remains **RECAPTURE**. Its written-brief/source/browser findings are not a whole-surface approval.

The [implementation record](../../finance-commitment-payment-v2.md) documents the 20-point audit, read-only summary, expected/actual/date contracts, synchronous persistence, busy fixture boundary, atomic linkage/lifecycle/reversal and remaining native gate. The ordinary-extension handoff preserves Warm Editorial Hearth / Operate, existing shared controls and provisional pink/plum confirmation tokens; the mockup mint is not hardcoded. No new world, global tokens, domain model or dependency is introduced. Pre-existing PRODUCT.md SDK57 text and absent DESIGN.md remain unchanged. The HTML/CSS detector does not apply to the production React Native target.

## Validation

- Focused group: **309 passed, zero failures** (30.1 seconds), `dist/commitment-payment-v2/focused-tests.log`.
- Full automated suite: **1,295 passed, zero failures** (158.3 seconds; 1,283 top-level TAP items), `dist/commitment-payment-v2/full-suite.log`.
- Those runs preceded an equivalent test-fixture-only refactor to satisfy the children-prop lint rule; production source is unchanged. The final payment-only rerun passed **10/10**, `dist/commitment-payment-v2/payment-tests-final.log`.
- Final TypeScript: **exit 0**, empty `dist/commitment-payment-v2/typecheck-final.log`.
- Final ESLint: **six existing errors, two existing warnings; zero added or removed normalized diagnostics** versus the previous Editor baseline. The lint command exits 1 for that baseline. Comparison: `dist/commitment-payment-v2/eslint-comparison.json`; `static-exits.json` records TypeScript 0 / ESLint 1.
- iOS/Android production exports: **both exit 0**, `dist/commitment-payment-v2/export-exits.json`, `ios-export.log` and `android-export.log`.
- Browser matrix: **45 PNGs, 38 checks, 76 label/field pairs, zero recorded failures**.
- Review/native evidence: **RECAPTURE**, pending genuine iOS/Android evidence.
- Ordinary-extension documentation handoff: **completed**; both files preserve UTF-8 without BOM/LF and pass whitespace checks.

Existing dirty work is preserved on `main`, HEAD `5ddb625a`; nothing is staged, committed or pushed by this stage.

## Native recapture still required

Environment checks found no `adb`, `emulator` or `xcrun`, and no default Android SDK adb/emulator executables. The Windows host cannot run the iOS simulator. No native screenshots were produced or substituted with browser images.

Capture the real payment modal on iOS/Android in both themes and large text, including amount keyboard, native date picker and lower Payment content. Verify safe areas, header/Confirm reachability, focus/gestures/dismissal, long money/category/title, due-versus-payment announcements, expected-versus-actual reading, busy/disabled/errors, picker max/cancel/return and screen-reader focus restoration. Exercise actual Confirm/Cancel, early/overdue payment, failed-write retry, final completion/reversal and projection refresh. Exports and browser checks do not close the native recapture gate.

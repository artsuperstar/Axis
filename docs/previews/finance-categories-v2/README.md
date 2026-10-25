# Finance Categories v2 review evidence

These are **real-component RN Web captures**, not physical iOS/Android screenshots. They document the scoped Finance category manager redesign: New category / Categories, independent financial-type/origin/status controls, shared identity icons and supported archival. The existing Transactions and Transaction Editor capture directories remain separate historical evidence.

## Reproduce

From the project root:

```powershell
$env:ESBUILD_WORKER_THREADS='0'
node node_modules/tsx/dist/cli.mjs scripts/preview-finance-categories.ts
node scripts/review-finance-categories.cjs
```

Build output is ignored under `dist/finance-categories-v2-preview`. The existing local Playwright/Chromium installation is reused; `AXIS_PLAYWRIGHT_PATH` and `AXIS_CHROMIUM_PATH` override its paths. No application dependency is added.

## Capture matrix

There are **36 base scenes plus 2 additional long-row captures: 38 PNGs**. `checks.json` contains 36 scene records plus 2 virtualization records: **38 checks, zero recorded failures**.

| Files | Evidence |
| --- | --- |
| `builtin-{320,390,430}-{dark,light}-{1,2}.png` | Expense built-ins, both themes and all widths, ordinary/simulated doubled text, two-section hierarchy and noninteractive protected rows |
| `income-390-{dark,light}.png` | Income scope and the actual three protected Income categories |
| `custom-390-{dark,light}.png` | Custom origin and legitimate active-custom contextual actions |
| `archive-menu-390-{dark,light}.png` | Archive category menu; native confirmation is a separate tested boundary |
| `archived-390-{dark,light}.png` | Custom Archived, quiet explicit status and no Restore/Delete/menu |
| `empty-390-{dark,light}.png` | Empty Custom state with one creation form |
| `invalid-390-{dark,light}.png` | Required-name error beside the input, triggered through keyboard submit |
| `duplicate-390-{dark,light}.png` | Equivalent active-name rejection and unchanged entered text |
| `success-390-{dark,light}.png` | Normalized created-name feedback, cleared input and Custom/Active selection |
| `long-390-{dark,light}.png`, `long-390-{dark,light}-row.png` | Enlarged long-name layout; the additional capture follows actual scrolling to the complete long row |
| `large-390-{dark,light}.png` | Large custom library with bounded mounted rows |
| `keyboard-390-{dark,light}.png` | Focused draft with simulated keyboard viewport occlusion; no OS keyboard is rendered |
| `parent-390-{dark,light}.png` | Existing Transaction editor after nested Expense category creation, with amount/description draft retained |
| `checks.json` | Row text bounds, page horizontal overflow, protected/archived menu absence, scenario assertions, mounted-row counts and browser errors |

Examples: [dark built-ins](builtin-390-dark-1.png), [light built-ins](builtin-390-light-1.png), [Income](income-390-dark.png), [Archive menu](archive-menu-390-light.png), [archived](archived-390-dark.png), [successful creation](success-390-light.png), [320 doubled text](builtin-320-dark-2.png), [long row](long-390-dark-row.png), [parent draft](parent-390-light.png).

## Provenance and limits

FinanceCategoryManager, TransactionEditor, AdaptiveModal/AdaptiveSheet, shared fields/radios/menus, fonts and visual tokens are real. Initial fixture category records are prepared through the real SQLite-backed test helper. Runtime browser create/archive callbacks use local fixture state; browser duplicate validation calls the shared normalization helpers but is not the production database service. Real-SQLite/component regressions separately verify normalization, type scope, archived-name reuse, built-in protection, archival and historical references.

Browser native modules, safe-area measurement, focus events and Alert presentation are substituted. `Keyboard.metrics()` reports a simulated occlusion frame for the keyboard scenes; no actual software keyboard appears. Reduced Motion is enabled. Doubled text simulates font growth and cannot establish native UIKit/Android measurement. No native shell/tab/status bar or confirmation screenshot is fabricated.

The large scene's selected Expense/Custom collection contains **227 categories**; each theme's virtualization check records **18 mounted rows** at capture. This verifies bounded mounting for that browser fixture only. Production still reads the full historical category collection and filters it in memory; there is no database category pagination or native performance benchmark.

Browser geometry records zero row text overflow or page horizontal overflow and zero browser errors across the matrix. Protected built-in and archived rows have no management menus. The scripts exercise actual browser control interactions for type/origin/status, invalid/duplicate/success feedback and nested creation. They do not prove native accessibility focus, software keyboard behavior, native Alerts, physical safe areas or all persistence semantics.

The implementation agent compared the supplied mockup directly. The independent Impeccable reviewer opened all **38 screenshots** and returned **SHIP**, without material fixes within the supplied written brief/composition/source/RN Web scope. Original image pixels were unavailable to that reviewer, so its verdict does not claim a direct pixel comparison or native certification. No artwork was generated or sourced; the PNGs are screenshots. The HTML/CSS detector does not apply to the production React Native target.

## Ordinary-extension documentation handoff

The [implementation record](../../finance-categories-v2.md) contains the 18-item behavior audit, supported/unsupported operations, historical-reference and nested-creation contracts, shared icon mapping and performance limits. The handoff compared the source with the incumbent Warm Editorial Hearth system: Lora/Manrope, cream/charcoal surfaces, quiet borders, group/control shapes, shared controls and provisional scoped color treatment. This Operate surface introduces no new visual world, tokens, palette commitment or global design document. PRODUCT.md's SDK57 text and absent DESIGN.md remain pre-existing documentation drift.

## Validation

- Focused Finance Categories/Transactions/editor/ledger/Overview/Commitment group: **263 passed, zero failures** (36.5 seconds), recorded in `dist/finance-categories-v2/focused-tests-final.log`.
- Full automated suite: **1,266 passed, zero failures** (205.0 seconds), recorded in `dist/finance-categories-v2/full-suite-final.log`; includes 14 new Categories cases.
- TypeScript: **passed**; `dist/finance-categories-v2/typecheck-final.log` is empty and the command completed successfully before lint ran.
- ESLint: **six existing errors and two existing warnings; zero added or removed diagnostics** against `dist/transactions-v22/eslint-final.json`. Comparison: `dist/finance-categories-v2/eslint-comparison.json`.
- Final iOS and Android SDK58 production JavaScript exports: **passed**; `dist/finance-categories-v2/ios-export.log` and `android-export.log`.
- Capture matrix: **38 PNGs / 38 checks / zero recorded failures**; fresh independent reviewer verdict **SHIP**. No UI changes followed capture/review.
- Impeccable ordinary-extension documentation handoff: **completed**; `git diff --check` passed after documentation edits.

Branch remains `main`, HEAD `5ddb625a`. Nothing was staged, committed or pushed.

## Physical testing

On iOS and Android: largest text and long names at narrow widths; fixed Back plus scrolling title at large text; actual keyboard show/hide and focused-field reveal; reachable Create/Archive; native confirmation Cancel/Archive; menu focus return; VoiceOver/TalkBack informational rows, required input, selected radios, success/errors and Archived state; modal safe areas and platform dismissal; nested creation returning to an unsaved transaction; and genuinely large category libraries. Exports and browser fixtures do not replace installed-device testing.

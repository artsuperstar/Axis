# Transaction Editor v2 review captures

Real Axis components/fonts/AdaptiveSheet render through **RN Web**. These are not native device screenshots. The fixture substitutes native module boundaries and Finance list lifecycle; real SQLite regression tests independently validate persistence, category compatibility, source restrictions and paging.

## Reproduce

```powershell
node node_modules/tsx/dist/cli.mjs scripts/preview-finance-transactions.ts
node node_modules/tsx/dist/cli.mjs scripts/preview-transaction-editor-v2.ts
node scripts/review-transaction-editor-v2.cjs
```

Existing local Playwright and Chromium are used; environment overrides are `AXIS_PLAYWRIGHT_PATH` / `AXIS_CHROMIUM_PATH`. There are no new app dependencies. Generated browser bundles stay under ignored `dist/`.

## Cases

| Capture | Review purpose |
| --- | --- |
| `new-expense.png`, `new-income.png`, `new-light.png` | New form, actual type selection, both themes |
| `edit.png` | Populated shared Edit form |
| `description-error.png`, `amount-error.png` | Existing validation beside the relevant field |
| `category.png` | Actual shared SelectField overlay |
| `date.png`, `date-boundary-section.png` | Existing picker entry and HTML date callback boundary; **not native picker rendering** |
| `long-note*.png`, `long-description*.png` | Growing multiline fields and outer scroll viewport; section crops supplement the scenes |
| `stress-{320,390,430}-{dark,light}-{1,2}.png` | Long archived category/description, maximum amount, width/theme/text matrix |
| `*-2-amount-section.png` | Complete large-text amount section/readout |
| `*-2-details-section.png` | Enlarged Description/category content; 320-point crops have a lower portion clipped by the outer scroll viewport and do **not** show the entire Details section |
| `keyboard.png`, `keyboard-header.png` | Simulated Keyboard.metrics frame at y=560; actual sheet/focus/header geometry, **no native keyboard pictured** |
| `list-dark.png`, `list-light.png`, `list-bottom.png` | Singular restored FAB, light/dark parity, real scroll at a shorter phone viewport, bottom clearance |
| `checks.json` | Geometry/errors, header positions, suffix padding, actual list scroll and anchored-action checks |

There are **26 scenes + 16 section/header crops = 42 PNGs**. The 12 stress scenes cover 320/390/430 widths × dark/light × normal/doubled text and include the exact maximum valid amount `90.071.992.547.409,91`. Locale is pt-BR, zone America/Sao_Paulo. Examples are explicitly test-fixture state, not production defaults.

## Capture measurement provenance

RN Web does not automatically emulate native Dynamic Type. The fixture reports fontScale=2, waits for the bundled fonts, and uses CSS text scaling. After fonts and scaling settle, stress/edit multiline initial values are refilled through real input events and restored exactly, allowing RN Web's content-size callback to measure the final text. This resolves capture initialization timing; native initial-value content measurement still needs a device check.

The fixture sets the iOS component branch while substituting native module boundaries. `date.png` and `date-boundary-section.png` contain an HTML `input[type=date]` wired to the existing community-picker value callback and maximum date; they do not certify iOS/Android picker appearance or gestures. `keyboard.png` supplies `Keyboard.metrics()` with screenY=560/height=340. Focus and outer scrolling settle before the same header geometry is measured and photographed. No native keyboard is rendered.

The list-bottom fixture uses a 700-point browser viewport and verifies a positive scroll offset and unchanged FAB bounds. The 320-point doubled-text Details crops prove the complete Description and category label, with lower content clipped by the outer viewport; separate long-note captures document Note growth. These section crops do not establish that every section fits in one viewport.

Multiline diagnostics record `clientHeight`, `scrollHeight`, the measured top/bottom `borderAllowance` (two pixels in these fixtures), and `remainingExcess`. The clipping assertion allows that border-box difference plus one pixel for rounding; the recorded residual makes the allowance reviewable. Horizontal panel/text overflow, browser errors, amount suffix padding, header-button bounds, singular creation and FAB hiding/anchoring are checked separately.

## Review and validation

The first independent review requested corrected evidence for multiline measurement, keyboard image/geometry agreement and actual list scrolling. Recapture resolved all three evidence issues; the fresh full review returned **SHIP**, with no production fix requested. The diagnostic border allowance is disclosed above. Native-device checks remain required.

Focused Finance/Transactions/category/ledger/Commitment/Work/Home/navigation/refresh validation: **252 passed**, including four new editor tests. TypeScript passed. ESLint remains at its existing baseline of **six errors and two warnings**, with no newly introduced findings. Both SDK 58 iOS and Android exports passed against the final production source.

The final full suite passed **1,232 tests, zero failures** (176.2 seconds). Non-failing React `act` warnings remain in existing Home paths around asynchronous `DesignProvider` font or motion initialization in native test mocks; the test run is not warning-free. The new editor tests settle Reduced Motion=true as a valid OS fixture. The Home quick-add regression assertion now checks Amount's field-level error presentation.

Final capture checks passed **26 scenes, 42 PNGs, zero failures**, including border-aware multiline sizing. The `list-bottom` scene records a real scroll offset of **358** with unchanged FAB bounds. `git diff --check` passed after the final documentation update.

Physical device requirements: [implementation documentation](../../finance-transaction-editor-v2.md#physical-testing-still-needed).

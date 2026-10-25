# Finance Commitment Editor v2 review evidence

These are **real-component RN Web captures** for the shared mobile-first New/Edit Commitment editor. Normal labels sit above full-width controls in Commitment, Schedule and Details. They are separate from earlier main Commitments and Transaction editor evidence.

## Reproduce

From the project root:

```powershell
$env:ESBUILD_WORKER_THREADS='0'
node node_modules/tsx/dist/cli.mjs scripts/preview-commitment-editor-v2.ts
node scripts/review-commitment-editor-v2.cjs
```

Build output is ignored under `dist/commitment-editor-v2-preview`. Existing Playwright/Chromium locations can be overridden using `AXIS_PLAYWRIGHT_PATH` / `AXIS_CHROMIUM_PATH`. No application dependency is added.

## Current matrix

There are **37 base scenes plus 12 enlarged-text scrolled Amount/Details captures and 1 scrolled date-boundary capture: 50 PNGs**. `checks.json` has 37 scene records and **92 measured TextInput label/field pairs**, at least two per scene. All measured labels are above their inputs; no browser errors, page/section horizontal overflow or clipped title inputs were recorded.

| Files | Evidence |
| --- | --- |
| `{new,edit}-{bill,subscription,installment}-{dark,light}.png` | All three kinds, New/Edit and both themes at 390 width |
| `new-bill-{320,430}-{dark,light}.png` | Ordinary narrow/wide form and responsive header |
| `stress-{320,390,430}-{dark,light}-{1,2}.png` | Long growing Title, exact maximum raw BRL, 1200 installments and long active category; all widths/themes/normal or simulated doubled text |
| `stress-*-2-amount.png`, `stress-*-2-details.png` | Actual scrolling at the configured viewport to reach the complete amount/readout and Details/informational text |
| `empty.png`, `invalid-amount.png`, `invalid-count.png`, `invalid-date.png` | Existing form-level validation, intact drafts and web civil-date fallback |
| `category.png` | Existing Expense category selector and inline creation entry |
| `date.png`, `date-scrolled.png` | Existing iOS picker presentation branch with an explicitly substituted browser date input |
| `keyboard.png` | Amount focus with simulated keyboard occlusion, fixed Cancel/Save above the reported frame |
| `bottom.png` | Actual scroll to the bottom explanatory note |
| `save-error.png` | Substituted write failure with retained draft and available Save |

Examples: [New Bill dark](new-bill-dark.png), [New Subscription light](new-subscription-light.png), [Edit Installment](edit-installment-dark.png), [320 doubled-text top](stress-320-light-2.png), [same scene amount](stress-320-light-2-amount.png), [same scene Details](stress-320-light-2-details.png), [date boundary](date-scrolled.png), [keyboard frame](keyboard.png).

## Provenance and capture validity

CommitmentEditor, AdaptiveModal/AdaptiveSheet, EditorSection, shared form/selection controls, fonts and tokens are real. Edit fixtures are prepared with migrated real SQLite services and include a paid occurrence and an archived category. Runtime browser Save/category callbacks are substituted fixture boundaries; screenshots do not establish production persistence. Component/real-SQLite regressions separately verify create/update, category selection, paid-history retention, exact money and failure/retry.

Most scenes select the iOS presentation branch. Its native date picker is replaced with a labeled browser date input; `invalid-date` explicitly uses the web text-date fallback. Keyboard metrics provide a simulated frame at y=560 without drawing an OS keyboard. Native modules, safe-area measurements, accessibility events and animation boundaries are substituted. Local fonts are real, Reduced Motion is enabled, browser locale is pt-BR and timezone is America/Sao_Paulo. Doubled text simulates growth and fontScale branching; it does not establish UIKit/Android measurement or native mount behavior.

Current PNGs are viewport screenshots at the scene's configured width and height (1050 ordinary, 1400 enlarged). Earlier huge locator-section screenshots were invalid because screenshot viewport expansion/clipping hid fields; those artifacts were deleted and replaced by ordinary viewport top/Amount/Details views after actual scrolling. The scrolled Amount/Details/date captures retain the configured viewport and do not pretend to show the complete form simultaneously. Edit title values are refreshed after fonts settle to trigger RN Web multiline measurement; this is browser fixture setup.

The geometry assertions cover actual TextInput labels/fields and title scroll/client heights. They are nonvacuous in all 37 scenes. Native date/select controls, OS keyboard behavior, native focus/VoiceOver/TalkBack, real safe areas and physical performance remain outside those assertions. No native tab/status bar or keyboard screenshot is fabricated. No logos/artwork are generated or sourced; PNGs are browser screenshots.

## Review and ordinary-extension handoff

The fresh independent Impeccable reviewer inspected all **50 current PNGs**, checked the 37-scene/92-pair diagnostics and returned **SHIP** within its presentation evidence scope. It assessed the written brief/composition, source and RN Web evidence; original mockup image pixels were unavailable as a filesystem artifact. The main implementation agent compared the supplied user image directly. No native certification or independent pixel comparison is claimed. The HTML/CSS detector does not apply to the native React Native production target.

The [implementation record](../../finance-commitment-editor-v2.md) contains the 20-point audit, fields by kind, existing monthly/future-date/edit/category/Save contracts and physical testing requirements. The handoff compares the extension with the incumbent Warm Editorial Hearth / Operate system: Lora/Manrope, quiet owned surfaces, existing shapes/spacing, shared vertical controls and provisional palette. No new visual world, global tokens, Note property or domain rule was introduced. PRODUCT.md SDK57 text and absent DESIGN.md remain pre-existing documentation drift.

## Validation

- Final focused group: **299 passed, zero failures** (34.6 seconds), `dist/commitment-editor-v2/focused-tests-reviewed.log`.
- Full suite on current production UI: **1,285 passed, zero failures** (329.7 seconds; 1,273 top-level TAP items), `dist/commitment-editor-v2/full-suite-final.log`.
- The focused rerun additionally covers a test-only Edit-helper correction to await real requestAnimationFrame boundaries after menu navigation. The obsolete main-screen legacy-appearance assertion now expects v2. No production behavior changed for either test correction.
- Final TypeScript after the test-only correction: **passed, exit 0**, with empty `dist/commitment-editor-v2/typecheck-complete.log`. The earlier reviewed check also passed.
- ESLint: **six existing errors, two existing warnings; zero added or removed diagnostics** against `dist/finance-commitments-v21/eslint.json`. Reviewed output: `dist/commitment-editor-v2/eslint-reviewed.json`; comparison: `dist/commitment-editor-v2/eslint-comparison.json`.
- Final changed-file ESLint: **exit 0, zero diagnostics**, `dist/commitment-editor-v2/eslint-changed-final.json`.
- Final cache-cleared iOS and Android SDK58 exports: **both exit 0**, `dist/commitment-editor-v2/export-exits.json`, `ios-export-final.log` and `android-export-final.log`.
- Presentation review: **SHIP** after all 50 current PNGs; 37 scene checks and 92 actual field/label pairs record zero failures.
- Impeccable ordinary-extension documentation handoff: **completed**; `git diff --check` passed after its edits. Both documentation files use UTF-8 without BOM and LF.

Existing uncommitted work is preserved on `main`, HEAD `5ddb625a`; nothing is staged, committed or pushed by this stage.

## Physical testing

On iOS/Android: native largest text, multiline Title mount/growth, maximum raw amount/caret, long category/chevron, keyboard reveal and fixed-header reachability, native first-date picker future selection/cancel, nested category creation/focus, required/disabled/selected/error announcements, exact Save/failure/retry, Cancel/outside/OS dismissal, short-screen safe areas and scrolling to all sections. Check New/Edit for Bill, Subscription and Installment against actual paid history. Browser fixtures and exports do not replace installed-device testing.

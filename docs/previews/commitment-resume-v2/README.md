# Finance Resume Commitment v2 review evidence

These are **real-component RN Web captures**. **Independent disposition: RECAPTURE** for missing genuine iOS/Android evidence. The corrected invalid-date preview finding is resolved; no whole-surface approval or native certification is claimed.

## Reproduce

From the project root:

```powershell
$env:ESBUILD_WORKER_THREADS='0'
node node_modules/tsx/dist/cli.mjs scripts/preview-commitment-resume-v2.ts
node scripts/review-commitment-resume-v2.cjs
```

Build output is ignored under `dist/commitment-resume-v2-preview`. Existing Playwright/Chromium paths can be overridden with `AXIS_PLAYWRIGHT_PATH` / `AXIS_CHROMIUM_PATH`. No application dependency is added.

## Matrix and assertions

There are **34 base scenes plus six enlarged scrolled Schedule/explanation views and one scrolled picker view: 41 PNGs**. `checks.json` contains **34 records / 34 actual date label/field measurements**, one per scene, with zero recorded browser errors, region/page horizontal overflow or assertion failures.

| Files | Evidence |
| --- | --- |
| `{bill,subscription,installment}-{dark,light}.png` | All supported kinds at 390; saved summary, type-only icon and real service proposal |
| `bill-{320,430}-{dark,light}.png` | Ordinary narrow/wide header and date control |
| `stress-{320,390,430}-{dark,light}-{1,2}.png` | Long title/category and maximum expected amount, all widths/themes/normal or simulated doubled text |
| `stress-*-2-schedule.png` | Actual scrolling at the enlarged viewport to the explanation/Schedule content |
| `alternative.png` | Different future date chosen without automatic confirmation |
| `long-title.png`, `long-category.png`, `max.png` | Complete wrapping and exact expected BRL |
| `uncategorized.png`, `archived.png`, `no-history.png` | No category, historical category name and absent speculative Last due date |
| `invalid.png` | Real FinanceValidationError message adjacent to the invalid date, red/aria-invalid field and retained raw selection |
| `loading.png`, `save-error.png` | Promise-based pending fixture and retryable substituted storage error |
| `bottom.png`, `picker.png`, `picker-scrolled.png` | Actually scrolled explanation and explicit browser native-picker boundary |

Examples: [dark Bill](bill-dark.png), [light Bill](bill-light.png), [Installment](installment-dark.png), [320 doubled top](stress-320-light-2.png), [same scene scrolled](stress-320-light-2-schedule.png), [corrected invalid state](invalid.png), [pending](loading.png), [picker](picker-scrolled.png).

All scenes assert an informational summary without buttons/inputs, no Last due date, unchanged summary after date interactions, one label above the date decision, and header targets within the viewport and at least 48 units. The invalid scene additionally asserts the exact existing message, `aria-invalid=true`, retained input and that the error belongs to the same field parent. The alternative scene checks picker minimum/no maximum and no callback before Resume; pending checks busy/disabled and one callback.

## Provenance and review scope

CommitmentResume, AdaptiveModal/AdaptiveSheet, fields/buttons, shared kind resolver, fonts and tokens are real. Migrated SQLite services prepare parents paused at 2026-10-24 and obtain each actual resumeProposal. Summary type/status/expected/category metadata are source-derived. Runtime browser callbacks validate the fixture boundary but do not execute SQLite Resume; pending uses a controlled Promise. Production SQLite remains synchronous, with real persistence separately covered by tests.

The iOS presentation branch substitutes a labeled HTML date input for the native picker, exposing minimum today and no maximum. Invalid-date uses the web text fallback. Native modules, safe-area measurements, keyboard events, focus/accessibility events and motion boundaries are substituted. Local fonts are real; Reduced Motion is enabled; locale is pt-BR and zone America/Sao_Paulo. Enlarged text simulates growth/fontScale. Captures retain the configured viewport (1050 high ordinary, 1400 enlarged), including the extra scrolled views. No OS picker/keyboard, native safe areas or device shell is fabricated.

The reviewer opened all **41 initial screenshots** and found the invalid preview's generic Error incorrectly placed validation in the global banner. The fixture now throws the real FinanceValidationError; all **41 captures were rebuilt/recaptured** and automation checks the field/error association. The reviewer reopened the corrected invalid state and marked that finding **RESOLVED**. The native evidence finding remains **UNRESOLVED**, so final disposition stays **RECAPTURE**. That targeted follow-up does not imply a second all-image review.

The main agent compared the latest user target directly and inspected primary/stress/invalid evidence. Original mockup pixels were unavailable as a filesystem artifact to the independent reviewer; its scope was the brief, source and RN Web evidence. The native production target does not use the HTML/CSS detector.

The [implementation record](../../finance-resume-commitment-v2.md) preserves the pre-implementation 20-item audit and documents current behavior. The ordinary-extension handoff reuses Warm Editorial Hearth / Operate, Lora/Manrope, quiet surfaces, existing spacing/controls and provisional pink/plum emphasis. No new identity, global token or mint wash is introduced. Last due date is omitted because the current projection lacks complete paid/skipped history; neither a first date nor a proposal is relabeled as historical. PRODUCT.md SDK57 text and absent DESIGN.md remain pre-existing drift.

## Validation

- Verified pre-edit baseline: **1,295 passed**, `dist/commitment-resume-v2/baseline-full-suite.log`.
- Final focused group: **287 passed, zero failures** (23.3 seconds), `focused-tests.log` in that directory.
- Final full suite: **1,307 passed, zero failures** (137.5 seconds), `full-suite.log`; includes **12 new Resume cases**.
- TypeScript: **exit 0**, empty `typecheck-final.log`.
- ESLint: **six existing errors/two existing warnings; zero added or removed diagnostics**, `eslint-comparison.json`; `static-exits.json` records TypeScript 0 / ESLint 1.
- Production iOS/Android exports: **both exit 0**, `export-exits.json`, `ios-export.log` and `android-export.log`.
- Final browser matrix: **41 PNGs / 34 scene records / 34 measured labels / zero failures**, repository `checks.json` and `dist/commitment-resume-v2/visual-checks.log`.
- Documentation handoff and `git diff --check`: **completed/passed**. Native recapture remains open.

Git changed externally during this work: prior Finance changes are now in HEAD `289cf7da9e7edacb2d72c2e17568e6c4fbb6201d`. This task issued no staging, commit or push. Only the two Resume production files differ from that HEAD, alongside new Resume test/scripts/docs/evidence; previous content is preserved.

## Required native recapture

No adb/emulator/xcrun or default Android SDK adb/emulator executables are available; Windows cannot run an iOS simulator. `dist/commitment-resume-v2/native-tool-availability.json` records the SDK availability check. No genuine native captures are present.

On iOS/Android capture both themes, enlarged/narrow layout, real picker and lower explanation. Check minimum today/no maximum, proposal/alternative/Cancel/Back, focus restoration, header/safe-area/gesture behavior, VoiceOver/TalkBack status/date/error/busy state, complete long text/money and explicit Resume. Exercise stale/collision/rollback paths, all kinds, installment continuation, retained outcomes/actual payments, empty paused periods and Calendar refresh. Browser geometry and exports do not satisfy the unresolved native evidence gate.

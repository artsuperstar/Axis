# Finance Commitment Details v2 review evidence

These are **real-component RN Web captures**. Final reviewer disposition is **RECAPTURE** for missing genuine iOS/Android evidence. The maximum-money browser finding is resolved; no whole-surface approval or native certification is claimed.

## Reproduce

From the project root:

```powershell
$env:ESBUILD_WORKER_THREADS='0'
node node_modules/tsx/dist/cli.mjs scripts/preview-commitment-details-v2.ts
node scripts/review-commitment-details-v2.cjs
```

Build output is ignored under `dist/commitment-details-v2-preview`. Existing Playwright/Chromium paths can be overridden through `AXIS_PLAYWRIGHT_PATH` / `AXIS_CHROMIUM_PATH`. No dependency is added.

## Matrix and checks

There are **38 base scenes plus six enlarged stress-bottom views and two multi-version bottom views: 46 PNGs**. `checks.json` contains **38 records / 76 actual money measurements**, Expected and Total paid per scene, with zero recorded browser errors, overflow or assertion failures.

| Files | Evidence |
| --- | --- |
| `{bill,subscription,installment}-{dark,light}.png` | All kinds at 390 and the generic header/read-only overview |
| `multi-{dark,light}.png`, `multi-{dark,light}-bottom.png` | Real version history and scrolled shared unpaid cards/History navigation |
| `{paused,ended,completed}-{dark,light}.png` | Parent state and accurate current/latest/completed boundary language |
| `bill-{320,430}-{dark,light}.png` | Ordinary narrow/wide layouts |
| `stress-{320,390,430}-{dark,light}-2.png`, `*-bottom.png` | Long context, maximum actual Total paid/expected money, simulated doubled text and actual bottom scrolling |
| `stress-390-{dark,light}-1.png`, `max.png` | Corrected normal-size full-width long money with intact centavos |
| `many-unpaid.png`, `overdue.png`, `empty.png` | Unresolved source projections and truthful empty content |
| `long-title.png`, `long-category.png`, `archived.png`, `uncategorized.png` | Complete saved context and category semantics |
| `menu.png`, `overflow.png` | Existing series options and compact occurrence Skip without redundant View commitment |
| `history.png`, `long-scroll.png` | Real navigation callback and actual scrolling through a 20-version fixture |

Examples: [Bill dark](bill-dark.png), [multi-version light](multi-light.png), [same scene bottom](multi-light-bottom.png), [maximum normal money](max.png), [320 doubled top](stress-320-light-2.png), [same scene bottom](stress-320-light-2-bottom.png), [completed](completed-dark.png).

Automation checks read-only overview/schedule rows, absence of fake schedule chevrons, two header actions with 48-unit minimum targets, region/glyph bounds and page overflow. Expected and actual Total paid are both measured in all scenes. Formatted strings longer than 16 characters at normal size must use the full overview width and fit on one line; enlarged text can wrap. History and occurrence menus exercise real component callbacks.

## Provenance and review

Components, local fonts, tokens, menus, virtualized list and existing compact CommitmentCard are real. Migrated SQLite fixtures at 2026-10-24 provide actual histories, kind/status/category, expected amounts, schedule versions and projections. Maximum/stress Total paid comes from a valid actual early maximum payment; archived context references an actual archived category. Runtime browser actions record callbacks rather than execute SQLite mutations. Native geometry/modules/safe areas/router focus/motion boundaries are substituted; doubled text is simulated. No native shell, tabs or mock background are fabricated.

Captures use configured scene viewports (1050 high ordinary, 1400 enlarged). Additional bottom images follow actual scrolling without expanding the screenshot to an oversized element. Tests separately prove persistence, lifecycle, History/Undo and source selection; browser geometry proves its stated browser projection only.

The reviewer opened all **46 initial PNGs** and found maximum normal-size money fragmented its centavos in a half-width metric. The source now spans long formatted numeric values across the overview width. All **46 images were rebuilt/recaptured**, with 76 explicit money measurements. The reviewer reopened three named maximum/stress normal states and marked this finding **RESOLVED**. Native evidence remains **UNRESOLVED**, so final disposition stays **RECAPTURE**. This was targeted follow-up to the original full-image review.

The parent compared the user target directly and inspected multi/light/stress-bottom views. The independent review used brief/source/RN Web evidence without original mockup pixels as a filesystem artifact. The HTML/CSS detector does not apply to the native React Native target.

The [implementation record](../../finance-commitment-details-v2.md) preserves the 23-item pre-edit audit and documents actual fields, exclusive schedule boundaries, shared card actions, History/lifecycle/reversal, single scroller and evidence limits. This ordinary extension retains Warm Editorial Hearth / Operate, Lora/Manrope, quiet cream/charcoal surfaces, existing shapes/spacing and provisional plum. No new visual world/global tokens are introduced; PRODUCT.md SDK57 text and absent DESIGN.md remain pre-existing drift.

## Validation

- Prior Resume baseline: **1,307 passing**; no fresh pre-edit full-suite run was required.
- Focused group: **319 passed, zero failures** (28.6 seconds), `dist/commitment-details-v2/focused-tests.log`.
- Full suite: **1,320 passed, zero failures** (136.9 seconds), `full-suite.log` in that directory. These focused/full runs preceded the final single money-layout condition.
- After that presentation-only correction: **13/13 Details tests passed**, `details-tests-final.log`, with the complete browser matrix recaptured.
- Final TypeScript: **exit 0**, empty `typecheck-final.log`.
- Final ESLint: **six existing errors/two warnings, zero added/removed normalized diagnostics**, `eslint-comparison.json`; lint exit one reflects the baseline.
- Final production exports: **iOS 0 / Android 0**, `export-exits.json`, `ios-export.log`, `android-export.log`.
- Final browser run: **38 records, 46 PNGs, 76 measured money values, zero failures**, repository `checks.json` and `visual-checks.log` under the dist directory.
- Documentation handoff and `git diff --check`: **completed/passed**. Native evidence remains **RECAPTURE**.

Existing Resume work is preserved on main, HEAD `289cf7da9e7edacb2d72c2e17568e6c4fbb6201d`. This task issued no reset/clean, staging, commit or push.

## Required native recapture

No adb/emulator/xcrun or default Android SDK adb/emulator executable is available; Windows cannot run an iOS simulator. `dist/commitment-details-v2/native-tool-availability.json` records the environment limitation. No genuine native screenshots are present.

On iOS/Android capture both themes, narrow/large text, complete overview money, versions, unpaid actions and bottom History navigation. Verify safe areas, variable-list gestures/performance, header/menu/focus, static-row accessibility, terminal boundary wording, Pay/Skip, lifecycle/Resume, Calendar focus/full series, History paging/Undo/return and source refresh. Browser checks and exports do not close the native evidence gate.

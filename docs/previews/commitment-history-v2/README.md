# Finance Individual Commitment History v2 review evidence

These are **real-component RN Web captures of the right-hand individual archive only**. The global History index is outside scope. The reviewer opened all 48 screenshots, found no additional concrete browser defect and returned **RECAPTURE** for missing genuine native evidence; no whole-surface approval or native certification is claimed.

## Reproduce

From the project root:

```powershell
$env:ESBUILD_WORKER_THREADS='0'
node node_modules/tsx/dist/cli.mjs scripts/preview-commitment-history-v2.ts
node scripts/review-commitment-history-v2.cjs
```

Build output is ignored under `dist/commitment-history-v2-preview`. Existing Playwright/Chromium paths can be overridden using `AXIS_PLAYWRIGHT_PATH` / `AXIS_CHROMIUM_PATH`. No application dependency is added.

## Matrix and assertions

There are **40 base scenes plus six enlarged stress-bottom and two mixed-bottom views: 48 PNGs**. `checks.json` has **40 records**, with zero recorded browser errors, region/page overflow or action-placement failures.

| Files | Evidence |
| --- | --- |
| `{mixed,bill,subscription,paid,skipped,completed}-{dark,light}.png` | All kinds, mixed/paid-only/skipped-only records, lifecycle context and exact source semantics |
| `mixed-{320,430}-{dark,light}.png` | Ordinary narrow/wide cards and actions |
| `mixed-{dark,light}-bottom.png` | Actual scroll to lower timeline/navigation |
| `stress-{320,390,430}-{dark,light}-2.png`, `*-bottom.png` | Long context, maximum money, simulated doubled text and scrolled bottom |
| `stress-390-{dark,light}-1.png`, `max.png` | Normal-size complete maximum values and stacked action layout |
| `paused.png`, `ended.png`, `empty.png` | Nonactive parent history and truthful empty resolved page |
| `changed.png`, `archived.png`, `uncategorized.png` | Current summary configuration separated from actual paid historical category/amount |
| `early.png`, `late.png` | Occurrence due date and actual payment date remain distinct |
| `long-title.png`, `long-category.png` | Complete saved text wrapping |
| `pages.png` | Real initial/appended twelve-month snapshots, growing count and earlier cursor |
| `undo.png`, `reopen.png`, `menu.png`, `bottom.png` | Actual component action callbacks, existing series menu and View commitment |

Examples: [mixed dark](mixed-dark.png), [mixed light](mixed-light.png), [same scene bottom](mixed-light-bottom.png), [Paid](paid-dark.png), [Skipped](skipped-dark.png), [320 enlarged](stress-320-light-2.png), [same scene bottom](stress-320-light-2-bottom.png), [changed configuration](changed.png).

Assertions cover a read-only summary, no Pending/Overdue/Pay rows, no false body buttons or invented row action menu, within-viewport targets at least 48 units, glyph/region bounds, actual Undo/Reopen/View commitment callbacks and source cursor/count advancement. These are browser projection/interaction checks, not native confirmation or persistence proof.

## Provenance and review scope

CommitmentHistory, shared modal/sheet, fonts/tokens/icons/menus and the virtualized list are real. Migrated SQLite services construct fixtures at 2026-10-26, with actual historical expected/paid amounts, due/payment dates, category references, saved sequence and lifecycle. Values intentionally include expected 180,20 versus actual 175,35 and different sequence numbers; examples are not copied uniformly from the mockup.

Initial and appended page snapshots use real readHistory twelve-month windows and append deduplication. Browser runtime selects those precomputed cumulative pages to demonstrate paging; production retains its existing paged reader and does not load lifetime history merely to render the archive. Runtime callbacks record Undo/Reopen/navigation requests without executing SQLite writes or fabricating native Alert confirmation. Tests separately establish those operations and guards.

Native geometry/modules/safe areas/router focus/motion events are substituted. Local fonts are real; locale is pt-BR, timezone America/Sao_Paulo and Reduced Motion enabled. Doubled text simulates growth/fontScale branching. Screenshots retain the configured viewport (1050 high ordinary, 1400 enlarged); bottom views follow actual scrolling. No OS keyboard/device shell/native safe-area evidence is fabricated.

The fresh independent reviewer opened all **48 PNGs** and found no additional concrete browser defect. Exact disposition remains **RECAPTURE** for absent native screenshots. The parent compared the user target and inspected mixed/light/maximum/stress-bottom captures. Original mockup pixels were unavailable as a filesystem artifact to the reviewer. A final nonvisual Skipped-state action guard followed capture; component layout is unchanged. The HTML/CSS detector does not apply to the native production target.

The [implementation record](../../finance-individual-commitment-history-v2.md) preserves the 24-item before-edit audit and documents historical provenance, source-aware Undo and separate Skipped preflight, paging/refresh and native requirements. Warm Editorial Hearth / Operate, Lora/Manrope, cream/charcoal surfaces and provisional plum remain incumbent. No new world, global token or mint palette is introduced. PRODUCT.md SDK57 text and absent DESIGN.md remain pre-existing drift.

## Validation

- Prior Details baseline: **1,320 passing**.
- After the final Skipped-state guard: History/experience/Details group **40 passed**, including **14 new History cases**, `dist/commitment-history-v2/history-tests-final.log`.
- Final focused group: **324 passed, zero failures** (55.4 seconds), `focused-tests-final.log` in that directory.
- Final full suite after the production action guards: **1,334 passed, zero failures** (210.4 seconds), `full-suite-final.log`.
- Final History-only rerun after the test-only persisted-ID typing assertion: **14/14 passed**, `history-tests-typed-final.log`.
- Final TypeScript: **exit 0**, empty `typecheck-final.log`.
- Final ESLint: **six existing errors/two warnings, zero added/removed normalized diagnostics**, `eslint-comparison.json`; `static-exits.json` records TypeScript 0 / ESLint 1 for that baseline.
- Final production exports: **iOS 0 / Android 0**, `export-exits.json`, `ios-export.log` and `android-export.log`.
- Browser matrix: **48 PNGs / 40 scene records / zero failures**, repository `checks.json` and `visual-checks.log`.
- Native evidence: **RECAPTURE**, unresolved.

Ordinary-extension documentation handoff and whitespace checks are complete; `git diff --check` passed. Existing main HEAD `289cf7da9e7edacb2d72c2e17568e6c4fbb6201d` and previous Resume/Details work are preserved; this task issued no reset/clean, staging, commit or push.

## Required native recapture

No adb/emulator/xcrun or default Android SDK tools are available; Windows cannot run the iOS simulator. The environment check is recorded under `dist/commitment-history-v2/native-tool-availability.json`.

Capture genuine iOS/Android light/dark, narrow/enlarged layouts, long expected/actual money, full Undo/Reopen labels, timeline connectors, multiple pages and bottom navigation. Check safe areas, variable-height scrolling/gestures, action/menu focus, VoiceOver/TalkBack historical meaning, native confirmation Cancel/Confirm, stale Paid/Skipped protection, rollback, final completion reversal, paused/ended intent, loaded-span refresh and downstream financial projections. Exports and browser checks do not satisfy native certification.

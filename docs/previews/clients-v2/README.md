# Finance Work — Clients Management v2 preview evidence

Supporting browser captures render the actual Clients route, WorkView, WorkClientsList and shared UI through React Native Web. They are not native iOS/Android certification. The [implementation record](../../finance-work-clients-v2.md) contains the source audit, identity/financial invariants, skill findings and validation status.

## Provenance

[`preview-clients-v2.ts`](../../../scripts/preview-clients-v2.ts) creates synthetic fixtures with the real SQLite Work services, including saved Work, exact outstanding balances, archived debt, accented identities and maximum valid aggregate amounts. It embeds the project's Manrope/Lora fonts and uses actual Axis v2 tokens. Sample names and values are review fixtures, not production defaults.

The browser uses the real route and component code with a substituted `useFinance` hook. Creation actions replay effects previously recorded from those isolated SQLite fixtures. They do not perform live SQLite persistence in the browser. Validation failures use the source FinanceValidationError class so field feedback is exercised through the real UI catch path. Each recorded successful creation removes its synthetic inserted client before the next effect is recorded, preserving an independent original collection; for example, New client increases four active clients to five.

The browser archive case opens the source confirmation for the first client, Ajakrn, and does not commit the archive. The hook contains recorded archive snapshots, but the remaining sequential archive effects are not exercised or certified by this matrix. Actual creation/archive/payment persistence, retained associations and ledger reconciliation are covered by live Node/SQLite integration tests.

React Native, native/font loading, safe areas, router, picker and motion boundaries are substituted for browser execution. Archive confirmation uses a browser representation of the platform Alert boundary; it does not certify native Alert appearance, keyboard behavior or focus restoration. Every original PNG and contact gallery includes an Origin text metadata entry explaining the source UI, synthetic fixtures, effect replay and boundary substitutions.

The large-text mode reports `fontScale: 2` and doubles DOM font sizes/line heights. It stresses wrapping and input layout; it is not OS Dynamic Type. Reduced Motion is requested and motion is substituted. Safe-area measurements and touch, gesture, screen-reader and software-keyboard behavior require native review.

## Scenario map and completion status

The final full matrix completed successfully (exit 0): **50 cases, 76 original PNGs and 10 contact galleries**, with no browser errors. A manifest comparison assertion confirmed no missing or extra captures. Both 180-client cases initially mounted 28 rows and reached the final card with clear bottom bounds. All 10 initial galleries were opened by the root reviewer, and final representative originals confirmed the batched fixes and isolated successful creation from four to five active clients.

The [independent finish review](finish-review.md) inspected all 10 final galleries plus representative originals and returned **Ship at the reviewed source and browser-evidence scope**, with no material UI defect and no further UI changes requested. Its stale-documentation bookkeeping finding is resolved by this update. The root reviewer compares the user's inline reference directly; this documentation pass and the independent reviewer have no separate local original-reference artifact. The disposition does not certify exact original-image fidelity or native-device behavior.

| Capture prefix | Coverage |
| --- | --- |
| `populated-{dark,light}` | Clients header/search, compact creation entry, Active and expanded Archived cards, exact balances and zero balance |
| `empty`, `activeOnly`, `archivedOnly` | No clients, no archived clients and no active clients, with real group empty states |
| `accents-{dark,light}` | Separate accented/unaccented saved identities and archived accented name |
| `archivedDebt-{dark,light}` | Archived client with saved historical Work and nonzero outstanding |
| `collapsed-{dark,light}` | Archived disclosure collapsed |
| `matches`, `noMatch`, `accentSearch` | Forgiving search, retained no-match query and Clear search, accented matching |
| `form`, `required`, `duplicate` | On-demand Name/Cancel/Create editor, required and source duplicate feedback |
| `distinct`, `success` | Accented identity distinct from an unaccented active name, recorded successful creation/list refresh |
| `menu`, `archiveConfirmation` | Genuine per-client actions and the platform Alert boundary representation |
| `stress-{dark,light}` and width/scale variants | Long unbroken name and exact aggregate BRL above safe Number at 320/390/430 widths with normal/2× text |
| `form-{dark,light}-320-2` | Narrow doubled-text creation/duplicate feedback with scaled input minimum height |
| `many-{dark,light}` | 180-client fixture, bounded mounting and scroll to the final archived card |

`-top.png` shows the initial viewport, `-archived.png` reveals the archived group, `-bottom.png` shows the large collection's final row, and `-action.png` shows the named interaction. `contact-N.png` groups up to eight originals for navigation; inspect originals for detail. Rename, Restore, Delete, sorting and job counts have no capture because those capabilities are unsupported.

## Checks and review limits

[`review-clients-v2.cjs`](../../../scripts/review-clients-v2.cjs) writes `checks.json` with case name, scenario, theme, viewport width, text scale, captures, runtime errors and mounted-row observations for the large fixture. Checks assert no unexpected permanently expanded Name field, presence of New client, absence of unsupported sorting, no horizontal document overflow or content escaping visible owned surfaces, intact numeric groups, no runtime errors, bounded initial mounting and reachable final-row clearance.

The initial gallery review led to font-scale input minimum heights, ordinary-width creation-copy/action alignment and a native stacked-copy flex-basis correction. Preview review also corrected validation-class replay and independent creation-effect recording. Final representative inspection confirmed these corrections, source-exact required/duplicate errors and isolated creation success. These automated checks and bounded visual inspections do not prove native focus, smooth scrolling, screen-reader announcements, physical safe areas, real software-keyboard behavior, OS font scaling or native reduced-motion behavior.

Final automated checks recorded in the [implementation document](../../finance-work-clients-v2.md) include 673/673 broad regression tests (79,267.8217 ms, including the 14 new Clients cases), TypeScript exit 0, exact unchanged ESLint baseline comparison (6 errors/2 warnings; expected ESLint exit 1) and `git diff --check` exit 0. Snapshot comparison also confirms prior Work forms/Record Payment and Job Details source is unchanged from task start. The final full suite passed 1,396/1,396 tests (164,512.5391 ms, exit 0); iOS and Android production exports both completed with exit 0. Physical-device checks remain separate.

## Reproduction

Use the repository's installed Node/tsx environment; no dependency installation is required.

```powershell
$env:ESBUILD_WORKER_THREADS = '0'
node --import tsx scripts/preview-clients-v2.ts
node scripts/review-clients-v2.cjs
```

The build writes to `dist/clients-v2-preview`. Review opens that bundle through a local file URL and writes captures/checks here. The runner uses existing local Playwright/Chromium installations; override their locations when needed:

```powershell
$env:AXIS_PLAYWRIGHT_PATH = 'C:/path/to/node_modules/playwright-core'
$env:AXIS_CHROMIUM_PATH = 'C:/path/to/chrome.exe'
node scripts/review-clients-v2.cjs
```

The runner does not clean older captures. Interpret file counts against the completed current `checks.json` and run output. Browser capture completion is separate from the automated test suite, TypeScript/ESLint checks, native exports and physical-device checks recorded in the implementation document.

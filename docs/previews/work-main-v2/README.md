# Finance Work v2 — Main Screen

Supporting **real-component RN Web evidence** for the main Finance → Work redesign. The summary, WorkView, WorkMainList, SectionList, main cards and opened legacy Work/Payment editors and Job details are production components. Finance's v2 shell is projected around them; connected flows retain their legacy presentation.

The main implementation and complete 30-point pre-edit behavior audit are in [Finance Work v2 — Main Screen](../../finance-work-v2-main-screen.md).

## Reproduce

From the project root:

```powershell
$env:ESBUILD_WORKER_THREADS='0'
node node_modules/tsx/dist/cli.mjs scripts/preview-work-main-v2.ts
node scripts/review-work-main-v2.cjs
```

Build output is ignored under `dist/work-v2-preview/`. Existing Playwright/Chromium paths can be overridden with `AXIS_PLAYWRIGHT_PATH` and `AXIS_CHROMIUM_PATH`; no application dependency was added. `AXIS_REVIEW_CASE` restricts a review run to one named case when diagnosing a failure; use an unrestricted run for the final matrix.

## Matrix

The full script defines **30 scenes** across dark/light, 320/390/430 widths and normal/simulated doubled text. It generates **74 original PNGs**: initial scenes, actual scrolled bottom views, enlarged-text secondary-metric/card-amount views and the existing options/Add/Payment/details flows. Ten contact sheets provide a compact review index; originals remain the detailed evidence.

| Files | Evidence |
| --- | --- |
| `mixed-{320,390,430}-{dark,light}.png` | Dominant Outstanding, Earned/Received, two real attention records and remaining Jobs; responsive widths and themes. |
| `mixed-*-bottom.png` | Jobs below attention and actually scrolled last-card position. |
| `mixed-390-*-menu.png` | Work options with existing Clients/History access; Clients route callback checked. |
| `mixed-390-*-add.png` | Existing New Work editor opened by Add work. |
| `mixed-390-*-payment.png` | Existing received-money allocation editor opened by Record payment, before writes. |
| `mixed-390-*-details.png` | Existing Job details opened with a real saved entry ID. |
| `stress-{320,390,430}-{dark,light}-2*.png` | Doubled DOM text and `fontScale=2`; long/unbroken title, long client, large individual amount, aggregate totals from three maximum entries; initial/secondary/amount/bottom views. |
| `stress-390-{dark,light}*.png` | Same large-value/content stress at normal text scale. |
| `long-client-390-*.png` | Long client wraps without a line cap, with actual bottom view. |
| `earned-390-*.png` | Earned work with no receipt; no expected money misrepresented as Finance Income. |
| `partial-390-*.png` | Actual partial allocations, exact remaining money and Received-of-Earned context. |
| `settled-390-*.png` | Fully received work retained in lifetime totals, zero outstanding and History guidance. |
| `zero-390-*.png` | Legitimate zero-rounded hourly compensation; zero outstanding and Add as primary. |
| `empty-390-*.png` | No Work, introductory explanation and accessible Work options. |
| `no-attention-390-*.png` | Open jobs with no overdue eligibility; no attention section. |
| `collection-390-*.png` | 140-record fixture, bounded initial body and actual final-item scrolling in both themes. |
| `checks.json` | Per-scene fixture totals/count, mounted cards, card text/geometry, action target dimensions, page/glyph bounds and browser errors. |
| `contact-{1..10}.png` | Review galleries of the original capture matrix. |

Examples: [dark main](mixed-390-dark.png), [light main](mixed-390-light.png), [320 doubled text](stress-320-dark-2.png), [enlarged metrics](stress-390-light-2-secondary.png), [partial payment](partial-390-dark.png), [options](mixed-390-light-menu.png), [legacy details](mixed-390-dark-details.png), [collection bottom](collection-390-dark-bottom.png).

## Provenance

Synthetic fixtures are generated separately through the project's migrated real SQLite Work/Finance services. They exercise actual supported Hourly/Fixed work, receipts/allocations, partial and settled balances, local expected dates and legitimate zero-rounded hourly compensation. Archived-client debt remains a source/test invariant; this capture generator does not archive its fixture client. Runtime preview reads use those saved projections and detail snapshots. Rendering uses the actual main/connected components, without alternate screenshot-only cards.

The shell is a projection of the unchanged Finance v2 heading/navigation boundary. Native module/safe-area/date-picker/font-loading/focus/motion boundaries are substituted. The preview has a **70-pixel reserved lower boundary**, not a fabricated native tab bar. Locale is pt-BR and timezone America/Sao_Paulo; the fixture local-day boundary is substituted consistently. Actual local font assets are used, but the native font-loading lifecycle is substituted. Reduced Motion is enabled. Simulated doubled text multiplies DOM font/line height and reports `fontScale=2`; it is not native Dynamic Type measurement.

The browser opens Add work, Record payment, options and Job details. It checks the real Clients route push callback and selected saved entry ID. It does not commit a payment/edit/reversal. Source write correctness and ledger reconciliation rely on separate real-SQLite integration tests. All PNGs are screenshots; no generated raster art or merchant/client logo imagery was introduced.

## Checks and review state

The first completed matrix recorded **30 scenes and zero failures under its then-current checks**, with 74 originals and 10 contact sheets. Root review opened all ten galleries and four originals. Its responsive corrections give stacked money the full available width, float options outside metric flow, remove the decorative summary icon at large font scale and place secondary icons beside labels above stacked amounts. Later visual review exposed a vertical defect absent from those checks, so this result does not certify the final source.

An intermediate full capture run after those corrections completed with **30 scenes and zero horizontal-overflow/browser failures**. Root visual inspection then found vertically overlapping stacked secondary metrics: their `flexGrow: 0` retained a zero flex basis. The source now uses automatic flex basis and no shrink for these metrics, and the review script additionally measures **`metricOverflow` and `metricOverlap`**. The intermediate “clean” result therefore does not establish current visual acceptance.

**The corrected final matrix completed: 30 scenes, zero recorded failures, matrix and contact generation exit 0.** All 74 originals and ten galleries were replaced in the final generation, and `checks.json` again contains all 30 scenes. Root opened all ten current galleries. Every scene has empty overflow, `metricOverflow` and browser-error arrays, with `metricOverlap` and horizontal overflow false. Both 140-record collection scenes initially mount **11 cards**. Logs: `dist/work-v2/browser-final.log` and `browser-final-result.txt`.

**Final independent disposition: `recapture`, solely for missing native iOS/Android evidence**, recorded in `dist/work-v2/finish-review-final.md`. The fresh reviewer opened all ten galleries and confirmed the full `no-attention-390-light.png` and original-resolution `contact-5.png` are intact, including complete Outstanding currency, separated secondary metrics and card balances. The prior malformed-image allegation is not retained; no browser recapture or source redesign is requested. The unrestricted final run restored the complete `checks.json` after the targeted replacement. Impeccable's native evidence gate withholds fidelity/craft/ship verdicts until actual native captures are supplied.

The script checks no redundant Work heading; card and action targets at least 48 browser units; one button surface per main card; no glyph/card/page horizontal overflow; metric vertical containment and separation; scenario-specific attention absence; saved-entry selection; and a final card inside the reserved browser boundary after scrolling. These checks support layout and callback behavior in the preview environment. They do not establish native fluidity, tab clearance, assistive-technology behavior, gesture focus or actual OS font scaling.

Completed results are itemized in the [implementation validation ledger](../../finance-work-v2-main-screen.md#evidence-and-validation-ledger): final focused regressions **533/533 passed**; TypeScript and changed-file lint **exit 0**; repository ESLint remains **6 errors / 2 warnings, none added or removed**; iOS and Android exports completed. Baseline full suite was **1,340 passed / 1 failed out of 1,341**; final full suite was **1,348 passed / 1 failed out of 1,349**. Both failures are the same pre-existing Upcoming rapid-toggle assertion at `tests/task-disclosure-motion.test.ts:135` (`undefined` instead of `entering`). Both isolated motion rechecks passed **10/10**; the full-suite failures remain in the record.

## Physical testing still required

Test iOS and Android native tabs/safe areas, actual enlarged text, long identity/amounts, VoiceOver/TalkBack, touch/focus/Back/menu behavior, keyboard and local-date pickers, live Reduced Motion, source writes and refresh, scroll restoration and the large collection on hardware. No usable native simulator/emulator toolchain was available in this Windows session. Browser captures and platform JavaScript exports do not replace device verification.

For the review gate, supply captures for every shipped native device class with the real Finance/native-tab shell and insets, light/dark and 320/390/430-equivalent scenes, actual enlarged OS text with long identities/large BRL values, and the scrolled final row showing native-tab clearance. Identify simulator/emulator versus hardware and device/text-size settings. No native fidelity or ship approval has been issued; hardware gesture, assistive-technology and performance checks remain separate from static capture evidence.

This is an ordinary extension of the incumbent Warm Editorial Hearth world. No global token/design record or other destination is restyled, and the colors remain provisional. No commit or push is performed.

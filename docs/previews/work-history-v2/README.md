# Work History v2 review evidence

These captures render the actual WorkManagementScreen, WorkView, WorkHistoryList, WorkHistoryJobCard, WorkHistoryReceiptCard and shared UI through React Native Web. Synthetic records are created through the real SQLite Work service, then recorded as read-only source snapshots and paged query results. They are component renders with domain-compatible fixture data.

From the repository root, regenerate the preview and captures with:

```powershell
node --import tsx scripts/preview-work-history-v2.ts
node scripts/review-work-history-v2.cjs
```

The preview builds `dist/work-history-v2-preview/index.html`. The review script reads that page locally and writes captures plus `checks.json` here. It uses Playwright/Chromium; local installations can be selected with `AXIS_PLAYWRIGHT_PATH` and `AXIS_CHROMIUM_PATH`. The script contains this workspace's default tool paths. `?scenario=shared`, `?scenario=many`, `?filtered`, `?large`, `?error` and `?loading` select the corresponding fixture or substituted boundary; the reviewer sets browser color scheme and viewport width separately.

`checks.json` records **48 scenarios, 84 original captures and no page errors**. Eleven `contact-*.png` files provide review sheets, for **95 PNGs total**. Every PNG embeds an Origin text chunk describing fixture/source provenance and native/browser limitations. Capture names encode scenario, theme and, for stress variants, width and text scale. `top`, `receipts` and `bottom` suffixes show different deliberate scroll positions; a card partly outside the viewport is not evidence that its content is clipped. `action`, `failure` and `recovered` identify action/error states.

| Evidence family | Scope |
| --- | --- |
| `populated`, `empty`, `jobsOnly`, `receiptsOnly` | Both ordered sections, genuine settled eligibility, independent empty states and source counts |
| `hourly`, `archived`, `longCategory` | Hourly compensation, saved archived identities/categories, long metadata and absent-category behavior |
| `shared`, `multiple`, `disclosure` | One full receipt across jobs, several partial receipts for one job, source allocation disclosure |
| `stress` | Long unbroken title/client, maximum source-safe BRL, optional Expected date, 320/390/430 widths, normal/doubled text, both themes |
| `jobNavigation`, `menu`, `confirmation` | Existing Job Details, receipt-specific overflow, existing Undo confirmation |
| `filtered` | Real client-menu entry into the existing filtered History sheet |
| `loading`, `retry`, `pageError` | Route loading, initial query error/retry, failed page with retained data and recovery |
| `many` | 75 jobs and 75 receipts, bounded initial mounting, three Load more transitions, final receipt reachability and bottom clearance |

The runner checks that no contradictory radiogroup appears, visible card descendants stay within the card, the document does not scroll horizontally, and grouped long-money fragments do not split internally. Large-history cases initially mount fewer than 40 rows and reach receipt 75 of 75. Source-backed mounted tests additionally cover both collections in one SectionList, typed stable keys, correct totals, retained last-good data/expansion, no row-level reads and mutation refresh. Browser checks support presentation review; they do not establish native scrolling performance.

All 11 contact sheets covering the 84 originals and original captures were reviewed. The independent review requested two accessible-label corrections: job Work date plus archive context, and receipt Received date/allocation count/category/archive context. Both findings are **resolved** and regression-asserted; separate Expected date wording is retained. The PNGs follow presentation cleanup and precede the final accessibility-label-only correction; the reviewer explicitly required no visual recapture for that correction. Final disposition: **SHIP**, limited to reviewed source and browser presentation evidence.

The inline target image was available to the coordinating implementation agent. The independent reviewer used the written brief, incumbent system and rendered/source evidence; it did not independently compare pixels against that image.

Native/font/image/router/safe-area/hook boundaries are substituted. The preview records real service snapshots and exposes read-only browser data access. Browser Undo intentionally throws if invoked: the existing confirmation is captured, **not executed**. Real SQLite integration tests exercise confirmed/cancelled Undo, stale-state rejection, linked Income integrity and atomic rollback.

The `large` mode doubles CSS text and line-height and simulates RN fontScale 2; it is **not OS Dynamic Type**. Browser-safe-area substitutions, router and Alert stand-ins cannot certify iOS/Android gestures, focus return, assistive-technology speech, native menu/confirmation behavior, true font metrics or device insets. No `adb`, Android emulator or `xcrun` is available in this workspace. Physical iOS/Android testing remains necessary.

See [Finance Work — History v2](../../finance-work-history-v2.md) for the behavior audit, implementation/financial semantics, validation and native testing list. The final full suite passed **1,413/1,413**. Both iOS and Android exports passed, as did final TypeScript. ESLint matches the exact existing six-error/two-warning baseline, with no new diagnostics.

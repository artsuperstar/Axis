# Job Details v2 — capture evidence

These captures render actual Axis WorkView, its shared modal/sheet, Job Details and existing destination components through React Native Web. They support the [implementation record](../../finance-work-job-details-v2.md); they do not certify installed native behavior.

## Capture matrix

The final browser run passed (exit 0) with **54 cases, 152 original PNGs and 19 contact galleries**, zero browser errors and no missing captures. [checks.json](checks.json) records each case's scenario, theme, width, scale, captures, browser errors and, for the long-list case, mounted receipt count. The independent [finish review](finish-review.md) inspected all 19 galleries plus representative originals and returned ship for browser/source scope, with no material fixes.

Both light and dark cover unpaid Fixed, Hourly, partial and fully received work, future/missing expected dates, archived Client, long/empty Description, large Outstanding/Received, shared and multiple receipts, and 75 receipts. Stress cases cover widths 320/390/430 at normal and doubled text. Action cases open Record Payment, Edit work, Work options, existing Client details and shared-receipt disclosure.

| What to inspect | Representative captures |
|---|---|
| Typical 390-unit Fixed overview | [Dark](unpaid-dark-top.png), [light](unpaid-light-top.png) |
| Hourly compensation and distinct dates | [Hourly details](hourly-dark-overview-details.png), [missing expected date](noExpected-light-overview-details.png) |
| Partial / fully received | [Partial](partial-dark-top.png), [paid](paid-light-top.png) |
| Client and informational Description | [Client/Description](unpaid-dark-information.png), [archived](archived-light-overview-details.png), [long Description](longDescription-dark-description.png), [empty Description](emptyDescription-light-information.png) |
| Empty / populated Receipts | [Empty](unpaid-light-receipts.png), [multiple](multiple-dark-receipts.png) |
| Selected allocation versus shared Income | [Job allocation](shared-dark-receipts.png), [explicit disclosure](disclosure-dark-action.png) |
| Maximum BRL and narrow doubled text | [320 doubled Received](stressReceived-dark-320-2-overview-details.png), [320 doubled Outstanding](stressOutstanding-light-320-2-top.png), [430 doubled](stressReceived-light-430-2-overview-details.png) |
| Existing action destinations | [Record Payment](payment-dark-action.png), [Edit work](edit-light-action.png), [Work options](menu-dark-action.png), [Client details](client-light-action.png) |
| Virtualized long list and bottom clearance | [75th receipt](many-dark-receipts.png), [light equivalent](many-light-receipts.png) |

`top` captures the header/overview; `overview-details` scrolls to compensation/dates; `information` reveals Client/Description; `description` focuses long saved text; `receipts` scrolls to receipt content/end; `action` shows the actual opened destination or disclosure. A long screen therefore has several viewport captures rather than one stitched image. `contact-1.png` through `contact-19.png` group originals for bounded visual review.

## Provenance and automated checks

[preview-job-details-v2.ts](../../../scripts/preview-job-details-v2.ts) builds snapshots with real Work/Finance services and the test SQLite fixture at a fixed local date of 2026-10-28. The browser displays synthetic data, including one R$ 180,00 shared Income allocated R$ 100,00/R$ 80,00, and source-supported maximum-centavo values. Browser write functions throw; use SQLite-backed tests for payment/edit/delete/Undo persistence evidence.

[review-job-details-v2.cjs](../../../scripts/review-job-details-v2.cjs) drives Chromium with `pt-BR`, `America/Sao_Paulo` and reduced motion. It checks rejected sections are absent, one overview/three metrics/one Edit, informational Description, real Client navigation, the job-specific receipt allocation, action destinations and remaining-balance preselection. Geometry checks cover horizontal/text overflow and atomic money groups. The many-receipt case checks that fewer than 75 rows are mounted initially and that receipt 75 becomes reachable above the bottom inset. Failures abort the run; the manifest is written after the case batch succeeds.

Every PNG has an `Origin` metadata entry naming the actual source renderer, fixture generator and native/browser boundary substitutions. The real bundled Lora/Manrope fonts and design tokens are used. Expo font loading, native images, safe-area provider/insets, date picker, keyboard/accessibility APIs, animation and router behavior have browser substitutes; reported platform is iOS and inset values are synthetic. Native router navigation is not exercised.

The doubled-text mode reports fontScale two and doubles rendered CSS font/line heights. It exposes layout pressure but is **not a test of OS Dynamic Type**. React Native Web, Chromium text selection and browser scroll/focus behavior also differ from native.

The initial 19 galleries were reviewed. Maximum-BRL wrapping was corrected to keep the terminal digit/centavo group intact; the shared disclosure capture now scrolls that detail into view. Final representative inspection confirmed no overflow/split money groups and the visible selected allocation of R$ 100,00 versus shared Income of R$ 180,00 and the other allocation of R$ 80,00. Independent finish review covered all 19 final galleries and representative originals without material fixes. Both themes initially mounted 15 of 75 receipt rows and reached receipt 75. The original inline mockup has no locally available image artifact, so this review does not certify independent original-image fidelity or native behavior.

## Physical checks still required

Final automated validation passed **1,382/1,382 tests**, with zero failures, cancellations or skips. Both platform exports completed with `Exported` success markers and artifacts at `dist/job-details-v2-ios` and `dist/job-details-v2-android`. Their original process sessions were unavailable after interruption; no numeric export exit codes are claimed. See the [feature validation record](../../finance-work-job-details-v2.md#validation-and-remaining-physical-checks) for the measured results.

No native device was available, and command probes found no available adb, emulator or xcrun tools. Verify installed iOS/Android sheet drag and Back/dismissal, list scrolling and bottom safe area, keyboard/editor/picker/menu focus restoration, VoiceOver/TalkBack reading and control order, live Reduced Motion, and actual normal/doubled OS text scaling with long content and maximum BRL. Screenshots, automated component tests and exports do not establish those outcomes.

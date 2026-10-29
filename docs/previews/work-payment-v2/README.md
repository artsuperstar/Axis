# Record Payment v2 review evidence

These are actual `WorkPaymentEditor`, `WorkPaymentList`, shared controls, selection host and AdaptiveModal/AdaptiveSheet renders. Synthetic fixtures are generated through the real SQLite Work service. They are not hand-drawn replicas of the screen.

Run `node --import tsx scripts/preview-work-payment-v2.ts`, then `node scripts/review-work-payment-v2.cjs`. Browser tooling paths can be overridden with `AXIS_PLAYWRIGHT_PATH` and `AXIS_CHROMIUM_PATH`.

`checks.json` records 42 scenarios and 142 original captures; `contact-*.png` are contact sheets. Capture suffixes show the top, allocation choices, total, or payment details at the corresponding scroll position. A section partially above the viewport is intentionally scrolled, not clipped layout. PNG Origin metadata records provenance.

Coverage includes both themes; 320/390/430 phone widths; ordinary and doubled text; long unbroken client/job names; maximum valid amounts; no allocation; one allocation; multiple partial allocations; mixed partial/full allocations; targeted initial allocation; invalid/zero/excessive values; failed confirmation; client reset; date/category picker states; and the actual-money note. The 142-job fixture initially mounts 17 allocation cells, retains six independently edited amounts through bottom/top scrolling, and reaches the derived total and details. Invalid transient tail captures caused by teleporting to an estimated virtualized end were replaced using continuous user scrolling through measured windows. The independent reviewer then returned **ship** for the browser layout and inspected presentation source, with no material fixes. That reviewer lacked the inline mockup image and used the detailed request and incumbent system; root compared the inline target.

Native font loading, image, safe area, date picker, and keyboard event boundaries are substituted. Doubled CSS text plus the React Native fontScale context supports layout review but does not certify OS Dynamic Type. The keyboard scene supplies metrics and checks the focused field, without drawing a fake keyboard. Browser review creates no actual payment; financial writes/rollback/reconciliation are exercised by SQLite tests.

The source payment callback is synchronous. Empty Confirm is disabled; the in-flight guard and shared busy state remain implemented. No artificial asynchronous payment service or simulated loading screenshot is introduced.

Installed iOS/Android keyboard/focus reveal, native picker cancellation, gestures, screen reader announcements, native text scaling and many-job scrolling still need device testing. No emulator/device tooling is available in this Windows workspace. Browser images are supporting evidence, not native certification.

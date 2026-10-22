# Finance Overview Charts — Stage 1 review

Functional captures of the existing Overview with the new charts. Stage 2 appearance is intentionally deferred. No native status/tab bars are simulated.

| Coverage | Captures |
| --- | --- |
| Week with selected exact values | [Week inspection](week-inspection.png) |
| Month / Other / both charts | [390 light](month-390-light.png), [390 dark](month-390-dark.png) |
| Year / twelve monthly buckets | [Year](year-cash-flow.png) |
| Three individual categories | [Multiple categories](donut-multiple.png) |
| No transactions / Income only | [Empty](empty.png), [Income only](income-only.png) |
| 320 width | [Light](month-320-light.png), [Dark](month-320-dark.png), [Light large](month-320-light-large.png), [Dark large](month-320-dark-large.png) |
| 390 enlarged text | [Light](month-390-light-large.png), [Dark](month-390-dark-large.png) |
| 430 width | [Light](month-430-light.png), [Dark](month-430-dark.png), [Light large](month-430-light-large.png), [Dark large](month-430-dark-large.png) |
| Real 390×844 viewport scrolling | [Top](scroll-overview-top.png), [Cash Flow](scroll-cash-flow.png), [Donut](scroll-donut.png), [Full breakdown](scroll-full-breakdown.png) |

The width/theme matrix uses tall review viewports to show composition; the scrolling series uses a phone-height viewport. Browser checks found no chart viewport overflow, failed SVG image decoding, page errors or inspection-button dimensions below 44 points across the twelve width/theme/text combinations. The inspection check confirms exact values after switching periods; View all exposes all eight original categories.

Evidence: [checks.json](checks.json). Fixtures come from actual SQLite ledger queries. Native host APIs and `useFinance` are substituted for review; source/mounted integration tests separately exercise the real lifecycle. Large text is a web simulation, not device Dynamic Type. Native tab clearance, touch handling, SVG decoder parity and screen-reader behavior need device testing.

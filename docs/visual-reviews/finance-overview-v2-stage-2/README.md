# Finance Overview v2 — Stage 2 captures

Current-source review against the supplied target. Real FinanceScreen/components, SQLite-authored analytics, substituted native hosts/useFinance for browser capture. No simulated blue gear, status bar or bottom tab bar. Tall composition captures are not device-height screenshots; the scrolling series uses 390×844.

| Coverage | Captures |
| --- | --- |
| Normal 390 / Summary / Month / compact five plus Other | [Dark](overview-390-dark.png), [Light](overview-390-light.png) |
| Direct zero interval / Week / Year | [Zero selected](zero-selected.png), [Week](week.png), [Year](year.png) |
| Expanded full individual list | [Eight categories](expanded.png), [24 categories](many-expanded.png) |
| Single category / no expenses / empty | [One](one-category.png), [Income only](no-expenses.png), [Empty](empty.png) |
| Narrow 320 | [Dark](overview-320-dark.png), [Light](overview-320-light.png), [Dark large](overview-320-dark-large.png), [Light large](overview-320-light-large.png) |
| Enlarged 390 | [Dark](overview-390-dark-large.png), [Light](overview-390-light-large.png) |
| 430 | [Dark](overview-430-dark.png), [Light](overview-430-light.png), [Dark large](overview-430-dark-large.png), [Light large](overview-430-light-large.png) |
| Phone-height scrolling | [Top](scroll-top.png), [Selected Cash Flow](scroll-cash-flow.png), [Spending](scroll-spending.png), [Expanded](scroll-expanded.png) |

[checks.json](checks.json) records twelve width/theme/text combinations: no detected financial-region overflow, SVG decode failures, page errors or native column/SVG misalignment. It also records direct zero selection, scrolling and expansion to eight individual categories. Zero-valued targets remain interactive. Large text is doubled browser text plus RN fontScale simulation, not true native Dynamic Type.

The first visual review caught lost compact-tab padding and intersecting selected/sparse enlarged ticks. A single fix batch and confirmation corrected these. The result follows the target's three-region composition, scoped sage/rose colors and supporting donut, while retaining readable native text and responsive stacking rather than forcing all content above the fold. The existing v2 editorial title, real values, date semantics, native navigation and safe-area ownership take priority over image artifacts.

Physical testing remains necessary for native SVG decoders, screen readers, touch scrolling/cancellation, narrow Year targets, native text scaling and bottom-tab clearance. See [technical document](../../finance-overview-v2-stage-2.md).

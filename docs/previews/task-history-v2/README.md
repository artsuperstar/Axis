# History v2 review captures

Real History components and shared controls rendered through React Native Web. Fixtures use the real Task data API, migrations and seeds at local date 2026-10-20. The populated archive has seven Completed records and one Skipped occurrence, preserving both existing groups. Dates use the existing local formatter; they are scheduled dates, not completion dates.

The owner supplied the mockup after the initial History implementation. The current captures show the focused visual fidelity corrections against that image; the original dark/light 390 captures are retained below for comparison. These are browser reviews, not physical-device screenshots.

| Capture | Review state |
| --- | --- |
| [Dark 390](populated-dark-390.png) | Completed collection and existing Skipped group |
| [Light 390](populated-light-390.png) | Equivalent light theme |
| [Narrow 320](populated-light-320.png) | Long titles and wrapping metadata/status |
| [Wide 430](populated-dark-430.png) | Compact archive density |
| [Large text 320](populated-large-dark-320.png) | Full-width names with stacked status |
| [Large text Skipped](populated-large-dark-320-skipped.png) | Scrolled skipped occurrence and controls |
| [Empty dark](empty-dark-390.png) | No-record state without a CTA |
| [Empty light](empty-light-390.png) | Equivalent light zero state |
| [Before dark 390](before-dark-390.png) | Original implementation before the image was available |
| [Before light 390](before-light-390.png) | Original light theme before fidelity corrections |

Build with `node node_modules/tsx/dist/cli.mjs scripts/preview-new-task.ts`. Open `dist/new-task-review/index.html?surface=history`. Optional flags: `&empty`, `&long`, `&many` (133 resolved records) and `&large` (doubled font/layout simulation). Use the browser's dark/light preference and widths 320/390/430. Captures use a 1100-high review viewport, not a fabricated device frame or OS chrome.

Seven configurations reported no page errors or horizontal text overflow. Checkbox/overflow targets measured at least 48 points. Rows at 390 measure 340 wide: undated and dated one-time examples are 58 high; recurring examples are 70 high (previously 92). These are measurements, not fixed sizing. The corrected 133-record browser fixture mounted 48 rows initially and 72 after scrolling, with no duplicate mounted IDs or strikethrough text. More rows fit within the unchanged render window because the corrected rows are shorter.

The header now puts Back beside the serif title/supporting copy at ordinary font sizes. Collection headings use practical sans-serif text, counts use outlined pills, and completed marks use green circles. Status pills move to the trailing row region at wider normal text sizes, while narrow/large text keeps them with full-width details. Quiet 32-point overflow discs retain the actual 48-point button. Skipped uses the same archive grammar in neutral colors. No navigation, metadata semantics, action, paging or data behavior changed.

Interaction checks exercised outside dismissal, checkbox Reopen/count refresh, detail editing/Save, per-series History callback identity, menu dismissal before confirmation, confirmed removal/count refresh, Return to pending and Back. The browser's mutation callbacks are review-only; SQLite integration tests verify the production data paths. Native font loading, keyboard, focus, safe areas, motion, pickers and Alert are substituted boundaries.

Retest on iPhone Expo Go and Android: native font scaling, screen-reader labels/checked state and focus restoration, long-list scrolling, near-edge menu anchoring, native confirmation, safe areas and editor/per-series History handoff. No physical-device testing was performed.

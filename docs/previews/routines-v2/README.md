# Routines v2 review captures

Actual FitnessScreen and shared controls in React Native Web. Fixtures are generated through real SQLite migrations, Fitness seed data and source Fitness/rotation APIs. The normal fixture has a three-step Weight Training rotation with Chest next, 0/1/4 exercise counts and one archived routine with completed History. It is review data, not production content.

| Capture | State |
| --- | --- |
| [Active dark 390](active-dark-390.png) | Rotation card, library heading, selector and active routine cards |
| [Active light 390](active-light-390.png) | Equivalent light hierarchy |
| [Archived dark 390](archived-dark-390.png) | Readable archived card without invented actions |
| [Narrow light 320](active-light-320.png) | Wrapped sequence/names, stacked heading and creation action |
| [Wide dark 430](active-dark-430.png) | Compact horizontal card density |
| [Large text dark 320](active-large-dark-320.png) | Rotation sequence and Next wrapping |
| [Large text library](active-large-dark-320-library.png) | Scrolled library, full-width radio labels and routine names |
| [Empty Active dark](empty-dark-390.png) | No active rotation/routines, existing setup and creation paths |
| [Empty Archived light](empty-light-390.png) | Empty archive without redundant actions |

Build with `node node_modules/tsx/dist/cli.mjs scripts/preview-routines.ts`, open `dist/routines-review/index.html`, then choose Routines. Optional query flags: `?large`, `?many`, `?empty` (combine with `&`). Use browser color preference and 320/390/430 widths. Captures use height 1100 with a separate scrolled large-text view; no OS chrome or bottom tabs are fabricated.

Eight configurations reported no page errors or horizontal text overflow. At 390 the active cards measured 358 × 76; Manage rotation was 324 × 48 and New routine about 143 × 48. Radio and overflow targets were at least 48 high. The 123-active-routine fixture mounted 8 cards initially and 45 after scrolling, without duplicate IDs. No timing or native frame-rate benchmark is claimed.

Browser checks covered Manage route identity, outside menu dismissal, radio checked state, archived read-only detail, New routine/Save callback, menu dismissal before confirmation and archive filtering. Data-hook mutations are review-only; real persistence, reference protection, start behavior and archive/history preservation are tested against SQLite separately.

Native font loading, safe areas, keyboard/pickers, router/Alert and animation scheduling are substituted. The browser animation boundary updates resting selection geometry with Reduced Motion; these are not native screenshots. Retest iPhone Expo Go and Android for fonts, light/dark, accessibility sizes, screen-reader labels/focus, list throughput, near-edge menus, native confirmation and source editor/navigation handoffs.

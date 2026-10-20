# Repeating Tasks v2 review captures

Real manager, shared controls and virtualized SectionList in React Native Web. Source fixtures use the real Task data API, migrations and seed data at local date 2026-10-19. These are browser reviews, not native screenshots or physical-device acceptance. Native fonts/pickers/keyboard/safe-area/motion/Alert boundaries are substituted; no OS chrome is fabricated.

| Capture | Review state |
| --- | --- |
| [Dark 390](mixed-dark-390.png) | Two Active, one Stopped; normal text |
| [Light 390](mixed-light-390.png) | Equivalent light hierarchy |
| [Narrow 320](mixed-light-320.png) | Long title, stacked actions |
| [Wide 430](mixed-dark-430.png) | Paired actions |
| [Large text 320](mixed-large-dark-320.png) | Doubled text, full-width identity, stacked actions |
| [Large text Stopped](mixed-large-dark-320-stopped.png) | Scrolled Stopped badge/schedule/actions |
| [Empty dark](empty-dark-390.png) | Valid creation path explained, no extra button |
| [Empty light](empty-light-390.png) | Equivalent empty state |

Rebuild with `node node_modules/tsx/dist/cli.mjs scripts/preview-new-task.ts`, then open `dist/new-task-review/index.html?surface=repeating` in a browser. Optional flags: `&empty`, `&many` (123 schedules), `&long`, `&large` (font-scale/layout simulation). Use the browser's light/dark preference and 320/390/430-wide viewport. Captures use height 1100 and scroll where needed; this height is a review viewport, not an iPhone model.

Seven configurations reported no page errors or horizontal text overflow. Large text keeps schedules above action controls. Real browser interaction checks cover outside dismissal, History task identity, editing interval 3 through Back and parent Save, menu closure before confirmation, confirmed removal/count refresh, and Back. The many-series fixture mounted 18 cards initially and 33 after scrolling, rather than all 123. Detailed persistence/versioning and native confirmation callbacks are covered separately in source integration tests.

Physical follow-up remains: Expo Go iPhone/Android, OS typography scaling, native Alert, screen-reader focus, safe areas, scrolling/windowing and menus near screen edges. Long words may wrap at the narrowest doubled-text width. Native behavior is not claimed from these captures.

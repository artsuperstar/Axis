# History v2 — Workout Archive

Build with `node node_modules/tsx/dist/cli.mjs scripts/preview-fitness-history.ts` and open `dist/history-review/index.html`, then choose History. The actual Fitness/History/detail/shared components and Lora/Manrope assets are bundled with browser-native and data-hook substitutes.

Fixtures are generated through actual SQLite migrations and Fitness APIs: finished routine/free sessions, empty routines, persisted blank-detail sets, notes and manual targetless completion. Displayed names, times and counts come from these records. `?empty` has no completed sessions, `?long` adds a long-name completed routine, and `?many` contains 72 finished sessions. The browser hook exposes 20 summaries at a time and appends further 20-row windows for the actual Load older workouts interaction.

Preview JSON also contains selected-session detail fixtures for browser navigation. This is review tooling, not a production read-path benchmark. Integration tests use real hooks/SQLite and verify that the actual main History path does not read session detail until a row is opened.

Captures cover dark/light 390, multiple local date groups, free and zero-count sessions/details, empty, 320/430pt, simulated doubled text (including the scrolled row), completed-workout detail, loaded pages and en-US AM/PM alongside the default locale. Browser timezone is America/Sao_Paulo. Native status/bottom-tab bars are excluded.

`review.json` records overflow/runtime results and virtualization measurements. The first 20-record page fits within the configured render window and mounted 20 rows. With all 72 fixture summaries loaded through the manual paging action, 44 rows were mounted at the measured scroll position. These are browser measurements, not Expo Go/native performance claims.

The fixed detail header is Workout details, with the complete saved workout name inside the scrollable summary. Final long-name checks are appended to the review record; at 320×844 with simulated doubled text, 635px remains available for scrolling detail content.

Doubled text is a browser approximation. Physical testing is still needed for Dynamic Type, VoiceOver/TalkBack, native safe areas/tab bars, long-list scrolling, paging position stability, modal Back/focus and resume/error recovery. No physical-device testing was performed.

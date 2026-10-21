# Exercises v2 — Exercise Library Management

Build the actual source review with `node node_modules/tsx/dist/cli.mjs scripts/preview-exercises.ts`, then open `dist/exercises-review/index.html` and choose Exercises. This uses the actual Fitness screen, shared fields/menus/sheets, fonts and library components. Browser-native and `useFitness` boundaries are substituted; fixture records are generated through real SQLite migrations/domain APIs. Browser mutation callbacks record/update review state, not native persistence.

Fixture flags: `?mixed` supplies custom examples of all four measurement types; `?long` adds a long-name distance movement; `?many` adds 200 custom exercises; `?empty` provides an empty exercise projection. Actual search/Active/Archived controls select the captured states. The **Custom Mega Press** example is Distance and uses route, proving its name does not select a strength icon. No Edit/Restore/Delete capability or built-in overflow is fabricated.

Captures cover dark/light Active, Archived, filtered/no results, all four measurement icons, 320/390/430pt, simulated doubled text and a scrolled long card, empty Active, New Exercise, read-only built-in/archived Detail, custom Archive menu and reduced-viewport keyboard approximation. Native status/bottom-tab bars are excluded. `review.json` records runtime/overflow checks and mounted-card measurements.

The large fixture contains 220 saved exercise records (219 active); eight cards initially mounted in the browser. Final Measurement heading checks are appended to the review record after the compact-heading correction.

Browser doubled text and a 544px usable viewport approximate accessibility/keyboard constraints. They do not replace Dynamic Type, VoiceOver/TalkBack, native keyboard, safe-area/tab-bar, native confirmation or Expo Go performance testing. No physical-device testing was performed.

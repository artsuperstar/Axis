# Journal v2 review captures

These render the actual Journal screen, date/mood/editor/context components and Journal History through React Native Web. `scripts/preview-journal.ts` creates migrated, seeded SQLite fixtures through the real source APIs and bundles the UI. The browser substitutes safe areas, fonts-loaded state, native picker/router and hook storage boundaries. The real editor controller owns preview drafts. Browser storage is temporary; persistence/conflict guarantees are tested with real SQLite in the automated suite.

Build: `TZ=America/Sao_Paulo node node_modules/tsx/dist/cli.mjs scripts/preview-journal.ts` (set the environment variable using your shell). Open `dist/journal-review/index.html`.

Flags: `selected` restores an actual unsaved draft; `past` opens a saved past entry; `pastEmpty` opens a genuinely empty historical day; `context` includes actual completed Task/workout and Finance context; `history` displays the archive; `large` simulates doubled type and fontScale. Flags may be combined.

Day at a Glance v2.1 adds `context&fewTasks` (four completions, including a long title) and `context&manyTasks` (seven completions, four titles, +3 more). See the [focused static-summary review](context-v21/README.md). The other Journal captures remain from the approved Journal v2 pass; the context capture is updated.

## Captures

- Today empty, light/dark 390pt.
- Selected/recovered draft and scrolled writing surface.
- Saved historical entry, light/dark, and empty historical day.
- 320pt narrow, 430pt wide, simulated doubled text at 320pt (orientation and writing).
- Day at a Glance: 1 completed task, 1 completed free workout, R$32.50 actual spent, R$180 actual income, R$147.50 net (localized as BRL).
- Quiet Journal History in light/dark and simulated large text; real saved fixtures page 20 → 40 → 46. Browser paging substitutes the hook; SQL cursor correctness remains covered by existing data and experience tests.

Captures use Chromium with Europe-style English locale and America/Sao_Paulo timezone; native status bars and the home indicator are not simulated. All widths use 844px viewport height. The large-text approximation is not native Dynamic Type. No device testing is claimed.

The batched review found a word-splitting header at doubled text. The correction gives the title a full line, retains touch-sized navigation, and puts mood options in two columns. The confirmation captures contain no browser runtime or horizontal text overflow errors. `review.json` records the capture matrix and paging counts.

Physical checks still needed: iPhone Expo Go and Android keyboard/cursor selection, safe-area footer, natural textarea/outer scrolling, VoiceOver/TalkBack focus and selected/disabled announcements, native Dynamic Type, native back-swipe, and draft recovery after app termination.

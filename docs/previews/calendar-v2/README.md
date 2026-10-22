# Calendar v2 review captures

These render the actual CalendarScreen, MonthGrid, DayAgenda/cards and MonthChooser through React Native Web, using migrated SQLite fixtures created through Tasks, Commitments and Work APIs. Source fixtures come from the real Calendar visible-range projection. The browser substitutes the native safe-area/modal/font/router boundaries and the useCalendar hook; mutations/navigation in the preview are temporary browser simulations. Real source mutations and refresh/retry semantics are verified by the automated integration tests.

Build: set `TZ=America/Sao_Paulo`, then run `node node_modules/tsx/dist/cli.mjs scripts/preview-calendar.ts`. Open `dist/calendar-review/index.html`.

Flags: `different` selects October 20 while Today remains October 21; `empty` selects November 20 (genuinely empty, between recurring bill dates); `large` simulates doubled type/fontScale; `many` uses accumulated same-day Tasks. The date is an explicit fixture, not the current device clock. The fixture’s weekly review follows its actual saved weekday mask rather than inventing an occurrence on the selected date.

## Matrix

- Light/dark 390pt: selected Today, actual Task/Commitment/Work markers and agenda.
- A different selected date while Today remains visibly distinct.
- Empty selected day, multiple Tasks, mixed source cards and a long Task title.
- 320pt and 430pt; doubled-text 320pt grid/agenda.
- V2 chooser in dark 390pt and doubled-text light 320pt.
- Busy agenda: the projected fixture has **124** selected-day items; **29** cards were mounted at the first sampled agenda position and **52** after scrolling. The separate automated list test verifies all 125 records in its own fixture remain in the data array with stable ordering/keys.

The final batched review corrected a collapsed navigation group at narrow/large text sizes by retaining intrinsic flex sizing. No decorative motion or fixed card heights were introduced. `review.json` records no browser runtime errors or horizontal text overflow. Measured date-cell widths were at least 44.28px at 320, 50.84px at 390 and 56.56px at 430; height was at least 54px, increasing to 74px in the doubled-text simulation.

Native system bars and bottom tabs are excluded from these captures. Production retains the existing native tabs and explicitly enables all safe-area edges, matching Tasks and Fitness; the installed screens component otherwise defaults every edge to false. Native clearance needs device verification.

Browser screenshots do not prove native Dynamic Type, VoiceOver/TalkBack, touch accuracy, sheet dismissal/focus or scroll performance. Retest those in iPhone Expo Go and Android. No physical-device testing is claimed.

# Routine Editor v2.1 — Add Exercise picker

20 October 2026. Actual FitnessScreen / RoutineExercisePicker / AdaptiveSheet / v2 controls, rendered through the existing React Native Web review shell. Fixture data comes from migrated SQLite and includes 160 custom exercises. The browser substitutes the native/data-hook boundaries; this is not physical iPhone testing.

Rebuild: `node node_modules/tsx/dist/cli.mjs scripts/preview-routine-picker.ts`. Open `dist/routine-picker-review/index.html`, choose Routines → Biceps, Back → Add exercise. `?keyboard` emits simulated native keyboard-frame events for a 300-point keyboard; `&large` supplies fontScale 2 plus doubled browser text. Keyboard captures crop to the usable viewport above that simulated keyboard. No iOS keyboard image or OS chrome is fabricated.

- [Dark 390, simulated keyboard](dark-390-keyboard.png)
- [Light 390, simulated keyboard](light-390-keyboard.png)
- [Dark 320, simulated keyboard](dark-320-keyboard.png)
- [Light 430, simulated keyboard](light-430-keyboard.png)
- [Doubled text at 320, simulated keyboard](dark-320-large-keyboard.png)
- [Dark 390, keyboard hidden](dark-390.png)
- [No matches](no-match-keyboard.png)
- [Nested creation](create-keyboard.png)

Measured results: picker owns the full viewport width; search uses that width minus 12-point side padding. With the simulated keyboard, the normal result viewport was 322 points tall: 3 fully visible rows at 320, 4 at 390/430. Doubled text retained a 194-point scrolling viewport, one full row plus another partially visible; hiding the keyboard recovers more space. Create remains visible above the keyboard in each variant. No measured text overflow or browser page errors.

Browser interactions passed: typing/filtering, reaching the last of 160 matches, keyboard dismissal/resizing, row selection, draft/target retention, focus return to Add exercise, Escape to the parent draft, seeded creation, cancellation back to the picker, creation return and Save callback payload. The 160-result list mounted 11 rows initially and 27 near the end. These are browser structural observations, not native performance or keyboard acceptance claims.

Physical acceptance remains required on iPhone Expo Go: real keyboard show/hide, drag dismissal/Done, selection with keyboard open, safe area, native Back/VoiceOver, long-name scrolling and nested creation. Android and native accessibility text sizes also remain to be checked.

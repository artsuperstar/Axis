# Routine Editor v2 review captures

20 October 2026. These show the actual FitnessScreen → RoutineEditor and shared controls rendered with React Native Web, local Axis Lora/Manrope fonts, and migrated SQLite fixtures. The browser substitutes native modal/safe-area/keyboard/motion boundaries and the Fitness hook. Save/create interactions exercise real editor callbacks; browser persistence is a review adapter. Automated integration tests separately use the actual SQLite data access.

Rebuild: `node node_modules/tsx/dist/cli.mjs scripts/preview-routine-editor.ts`. The review page is `dist/routine-editor-review/index.html`; click Routines, then Biceps, Back or New routine. Optional query flags: `mixed`, `long`, `large`, `compositionMany`. `large` supplies fontScale 2 and doubles rendered text for browser layout review; it is not native Dynamic Type testing.

- [Dark Edit, 390](edit-dark-390.png)
- [Light Edit, 390](edit-light-390.png)
- [Dark New, empty](new-empty-dark-390.png)
- [Light New, empty](new-empty-light-390.png)
- [Dark Edit, 320](edit-dark-320.png)
- [Light Edit, 430](edit-light-430.png)
- [Long names and doubled text, 320](edit-large-dark-320.png)
- [Doubled text, scrolled controls](edit-large-dark-320-controls.png)
- [Multiple measurement types](edit-mixed-dark-390.png)
- [Multiple measurement types, later rows](edit-mixed-dark-390-later.png)
- [Inline Targets](targets-dark-390.png)

The updated mockup remains the primary composition reference. Captures show the visible arrow + Cancel header, generic Routine/Fitness icon and Exercises/list icon. They intentionally omit OS chrome, tabs behind the modal, the development gear, unsupported exercise overflow actions and a duplicate lower Add exercise path. The current target model, metric units and real validation govern all displayed values.

The normal fixture now contains Bicep Curl, Pull-down, Inclined Row and Row: all four are Strength and use the same dumbbell icon. The mixed fixture contains a built-in/custom pair for each type. The initial and later-row captures show Strength/dumbbell, Bodyweight/activity, Duration/timer and Distance/route reused for different names. No name-specific artwork is generated.

Measured browser review: no text overflow or page errors across the captured variants; action targets at least 48 × 48. Normal 390 exercise cards measured 348 × 159. An 80-entry composition mounted 14 cards initially and 27 after scrolling, rather than all 80. These are structural/browser observations, not native performance benchmarks.

Browser interactions verified: disabled reorder boundaries, up/down ordering and numbering, Targets, existing-exercise selection and dismissal, duplicate exercise entries, immediate Remove, Save payload, required-name error, richer exercise creation/return, and Cancel. Physical iPhone/Android keyboard, native screen reader, modal Back and scrolling still need device testing.

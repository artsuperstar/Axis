# Stage 14B — Hearth prototype: Tasks and active Workout

14 October 2026. Implemented prototype for device review; this is not a full Axis visual migration. The [Stage 14A audit](visual-redesign-audit.md) remains unchanged.

## Direction contract

**Thesis:** meaningful groups own their content. Tasks sections and workout exercises should be understandable before reading every label.

**Visual language:** warm greige/cream in light mode, aubergine-charcoal/plum-gray in dark mode, muted plum actions, compact contained regions and one inset data layer. Task indigo and Fitness clay provide restrained supporting identity.

**User task:** see the current working region, complete or edit a task, and log a workout without losing established navigation, source truth or drafts.

**First viewport:** Tasks presents contained Earlier, a stronger Today region, quieter To-do and contained Upcoming; the existing FAB remains separate. Active Workout presents internal navigation, an outer workout header, contained exercises and persistent Finish above native tabs.

**Form:** the user-approved Hearth composition from Stage 14A, implemented directly in the existing screens. No new IA, prototype route or user-facing font switch.

**Exit condition:** scoped implementation, component comparisons, automated validation and an explicit native-device review handoff. Native feel is not claimed from browser previews.

## 1. Summary

Tasks main and active Workout now use a scoped Hearth palette, custom typography and reusable presentation controls. Surfaces replace section/exercise dividers as the main grouping mechanism. Existing source data, mutations, routes and modal/editor behavior remain authoritative.

## 2. Stage 14A Hearth interpretation

The supplied Tasks screenshot showed a continuous dark canvas with headings and rules. The Fitness screenshot showed workout and exercise actions on similar planes and weak exercise ownership, especially with zero sets. Hearth addresses these through shared region grammar rather than a large card around every row.

Warmth comes from neutral materials and typography; tactile feedback comes from short press and state transitions. No gradients, glass, blur, haptics, illustrations or gamification were added.

## 3. Prototype architecture

`src/constants/hearth.ts` holds additive prototype tokens. `hearth-controls.tsx`, `hearth-motion.ts` and `hearth-navigation.tsx` supply shared presentation and feedback. Feature components compose those primitives without new category, task, recurrence or workout logic.

`FormButton` and the existing contextual-menu host have explicit opt-in Hearth presentation. Their default Calm Utility consumers retain their styles. Tasks History/Repeating Tasks and all editors remain unmigrated. The active-session Fitness navigation strip is the shared chrome exception: it retains the prototype indicator when switching internal destinations, while Routines/Exercises/History content retains Calm Utility. With no active session, the existing navigation presentation remains.

Home, Calendar, Finance, Journal, global tokens and native bottom-tab code are unchanged by this stage.

## 4. Hearth tokens

The scoped roles are canvas, group, raised, inset, control, selected, primary/on-primary, text/secondary/muted, border/borderStrong, pressed, feature accents and semantic attention/danger/info. Existing spacing and typography size roles are reused; this prototype does not introduce another global design-system hierarchy.

## 5. Typography comparison

Two static Manrope assets are bundled: Regular 400 and SemiBold 600. Only Hearth text and opt-in buttons use them. Existing shared fields, multiline editors and all global ThemedText consumers retain their current typography.

| Comparison | Observation / decision |
| --- | --- |
| Hearth + Manrope | More distinctive open letterforms and a slightly warmer working-text rhythm; remains compact in the captures. |
| Hearth + platform/system | Clear and efficient; the improved region hierarchy still works. More familiar and less distinctive. |
| Recommendation | Keep Manrope for the prototype, subject to actual iPhone/Android rendering review. The largest improvement comes from grouping, so a system-font fallback remains viable. |

Compare [Manrope dark](previews/hearth/tasks-dark-390-manrope.png) with [system dark](previews/hearth/tasks-dark-390-system.png), and [Manrope light](previews/hearth/tasks-light-390-manrope.png) with [system light](previews/hearth/tasks-light-390-system.png). The system preview is the browser's platform stack, not a photograph of iOS San Francisco or Android Roboto.

Font loading uses the existing expo-font runtime hook and locally bundled files. Content always renders; loading or failure uses the system fallback without blocking the screen. Named regular/semibold families avoid synthesized weight selection. Expo supports runtime loading in Expo Go on both target platforms. [Expo SDK 57 Font](https://docs.expo.dev/versions/v57.0.0/sdk/font/).

The two assets are 96,832 and 96,936 bytes: 193,768 bytes combined (about 189 KiB before packaging). The included OFL license is 4,384 bytes. They were sourced from the [Expo Google Fonts Manrope repository](https://github.com/expo/google-fonts/tree/main/font-packages/manrope). Binary tests verify static font tables, actual 400/600 weight metadata, the sample glyphs in `Álvaro Educação Café João R$0123456789,.–` and the `tnum` feature. This verifies asset contents, not native text rendering or runtime font-load success on hardware.

## 6. Palette

| Role | Light | Dark |
| --- | --- | --- |
| Canvas | #EFE8E1 | #17131B |
| Group | #F5EFE9 | #2B2531 |
| Raised / Today | #FFF9F3 | #352C3D |
| Inset | #E5DBD2 | #211C27 |
| Control | #F0E7EE | #3D3445 |
| Selected / pressed | #E6DDEB | #453A51 |
| Primary | #665078 | #C7B4E1 |
| On primary | #FFF9F3 | #282036 |
| Text | #28232B | #F6EEE7 |
| Secondary / muted | #605661 | #C4B9C8 |
| Strong control edge | #806E7E | #A192AE |
| Tasks accent | #555B87 | #B6BCE7 |
| Fitness accent | #8B4D37 | #E4B49C |
| Earlier surface | #F3EADF | #31291F |
| Upcoming surface | #E8E0E8 | #211C27 |

Attention, danger and information retain independent semantic colors. Feature accents do not replace warnings or errors. Light control-edge contrast was strengthened during validation. Dark Today is brighter than the original audit sample to better distinguish the principal working region.

## 7. Surface hierarchy

Tasks: canvas → section region → plain task rows.

Workout: canvas/workout header → exercise group → one inset set table → plain set rows.

No closed outer workout card, individual set cards or per-task shadows. Empty exercise groups retain their boundary and a short “No sets logged yet” message.

## 8. Shape / radii

Group 16, control 10, inset 6, menu 12 and FAB 18. The FAB remains 56 square in its established location. Shapes differ by ownership; generic pills are not applied throughout the screen.

## 9. Depth / borders

Tonal region boundaries carry normal content hierarchy. Task row bottom rules and exercise top rules disappear in the prototype. The set table retains restrained internal separators, excluding its final row. Completion controls and focus states retain visible essential edges.

The FAB and Hearth menu use a small offset soft shadow. Normal exercise and Task regions have no shadow. Dark surfaces communicate depth independently of shadow support.

## 10. Motion language

Shared timing uses cubic ease-out: press 120ms, selection 180ms, insertion/disclosure feedback 220ms, menu 150ms. No bounce, idle animation, blur or per-frame JavaScript state updates. Reanimated shared values use compiler-compatible get/set APIs. [Reanimated shared values](https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue/).

One OS reduced-motion subscription serves each prototype screen, including live changes. Until the preference resolves, the screen stays still. Reduced Motion cancels scale/translation transitions and preserves static state; Reanimated also uses its system reduction policy.

## 11. Tasks — before

The supplied screenshot's section boundaries and individual row boundaries were both long thin rules. Earlier/Today/To-do/Upcoming occupied one plane. Completion and overflow relied on font glyphs. The original information architecture was useful and is preserved.

## 12. Tasks — Hearth prototype

Earlier is a warm, restrained disclosure; Today is the strongest region with its date and plain rows inside; To-do is quieter; Upcoming has a muted future region. Compact rows retain title, date, recurrence, priority, active category and description behavior. Counts use tabular numerals.

Completion has a drawn rounded-square ring and checked state. Overflow/chevrons/plus/check use consistent drawn geometry rather than font glyph metrics. Checkbox, edit and management remain separate targets. Existing labels, disclosure defaults, five-item preview, Calendar action, recurrence filtering and management destinations remain intact.

## 13. Tasks — grouping strategy

SectionList remains the renderer. The section header, independently virtualized row slices and footer paint a continuous surface with top/bottom corners. An entire section is never placed inside one nonvirtualized item or nested ScrollView.

Accessible heading text identifies Today/To-do; disclosures retain their named button/expanded states; row controls retain their own accessible subjects. Surface boundaries do not combine the whole section into one accessibility element.

## 14. Tasks — motion / feedback

Controls have short tonal/press feedback. Checked-state changes animate when a row is retained. Main-list completion still removes/moves a row immediately according to authoritative state; there is no delayed mutation, optimistic success or animated exit that holds a stale virtualized item in place.

Disclosure chevrons rotate. On an explicit expansion, only the first three newly revealed rows receive a small fade/translation, gated to the short reveal window. No whole-list height animation, background-refresh entrances or long stagger. This is the intentional compromise for virtualization correctness.

The header contextual menu retains measured trigger anchoring, screen clamping, outside/Back/Escape dismissal, focus handling and its exact three actions. Hearth changes its surface and short appearance motion only.

## 15. Fitness — before

Workout-level and exercise-level note/actions shared similar visual weight. Exercises were separated primarily by top rules. Sets already had surfaces, giving the child a clearer boundary than its parent. Empty exercises were especially weakly grouped.

## 16. Fitness — Hearth prototype

The workout title, in-progress status and workout actions remain on the outer canvas. Each exercise owns its target, note, local actions, set table, progress and Add set within one region. No action destination changed. Finish remains outside scrolling content above native tabs.

## 17. Fitness — exercise / set hierarchy

Exercise and set-region labels identify ownership without hiding individual controls. Targets remain a concise metadata line rather than a collection of badges. Sets retain source-owned strength/bodyweight/duration/distance presentations, exact stored values, natural numbering and edit labels. Local progress uses restrained clay; information/error semantics remain independent.

## 18. Fitness — motion / feedback

Only a set successfully added through the current Set editor receives insertion motion. Existing sets, edited sets, focus/resume refreshes and returning from History do not replay insertion. Local insertion identity is presentation state; it does not affect persistence or session status. The animation runs inside the exercise's table without animating the screen or changing data timing.

Exercise actions and workout actions retain their separate callback ownership and existing focused sheets. Notes and measurement editors retain their established keyboard behavior and native input alignment.

## 19. Internal navigation

The active-session navigation strip uses the existing destinations and callbacks. When all labels occupy one measured row, the underline moves between their actual bounds. At wrapped layouts or large text, a static selected background/underline supplies a deliberate fallback. Width is not divided into fixed quarters.

Navigation remains screen-header chrome. Other Fitness destination content is not redesigned. Per-destination scroll restoration, active-session resume and targeted reads remain unchanged.

## 20. Bottom navigation compatibility

NativeTabs, icons, labels, destinations, selection model and safe-area architecture are untouched. Calm Utility's native-bar colors remain during this scoped prototype, including the existing selected tint. Final palette alignment belongs to an approved full migration.

## 21. Dark mode

Dark mode uses a distinct canvas, stronger Today/normal exercise regions and deeper set insets. Pale plum handles primary actions; small indigo/clay details provide feature identity. Grouping remains visible without large shadows or a border around every object.

## 22. Light mode

Warm greige canvas, clean cream Today and quieter exercise/To-do surfaces share the same grammar. Dark plum primary controls remain readable. Light mode is independently tokenized, not an inverted dark palette.

## 23. Accessibility / large text / Reduced Motion

Prototype controls use minimum 48-unit targets, meeting the requested iOS floor and Android target. Heights grow with text. Names, metadata, targets, sets and actions wrap; only the pre-existing description-preview truncation is retained. Selected/checked/expanded state is exposed, and icons are decorative when their control already has a name.

Tests validate normal text/status/feature contrast at 4.5:1 across the prototype's opaque content/control surfaces, primary/checked fill contrast and essential control edges at 3:1. Disabled states remain readable. Static hierarchy remains understandable with motion disabled.

Live Reduce Motion, named controls, set labels and font failure are tested through the existing mounted harness. Native VoiceOver/TalkBack behavior, large text and real keyboard/safe-area geometry still require device review.

## 24. Performance

Task SectionList and data APIs are unchanged. Fitness detail reads, History isolation and rotation semantics are unchanged. No broad query, new cache, background timer for data, full-screen effect or unbounded animation was added.

Press transforms and opacity use the UI thread; React state changes only at input events and normal source refresh. Disclosure feedback is bounded to three rows, and local set insertion to one set. The measured navigation indicator is a small bounded effect; wrapped rows use a static fallback. Fonts add the measured asset size above, not a new package.

## 25. Shared components / future v2 candidates

Candidates are the scoped palette/shape/motion roles, HearthText/font boundary, HearthPressable, HearthButton, HearthGroup, insertion feedback and measured navigation indicator. TaskSectionHeader/Footer demonstrate how a shared surface grammar can coexist with virtualization.

These are prototype building blocks, not a new category domain or global state layer. Later migration can integrate approved roles into the existing shared architecture after native review.

## 26. Files created

- `src/constants/hearth.ts`
- `src/components/hearth-controls.tsx`
- `src/components/hearth-motion.ts`
- `src/components/hearth-navigation.tsx`
- `src/features/tasks/components/task-section.tsx`
- `src/features/tasks/components/hearth-task-row.tsx`
- `assets/fonts/manrope/Manrope-Regular.ttf`, `Manrope-SemiBold.ttf`, `OFL.txt`
- `tests/hearth-prototype.test.ts`
- `tests/helpers/hearth-font.cjs`, `hearth-reanimated.cjs`
- `scripts/preview-hearth.ts`
- This document and 16 component-review PNGs in `docs/previews/hearth/`.

## 27. Files modified

Shared opt-ins: `context-menu.tsx`, `form-controls.tsx`, `form-selection-host.tsx`.

Tasks: `tasks-screen.tsx`, `task-row.tsx`, `task-options.tsx`, `floating-add-task.tsx`.

Fitness: `fitness-screen.tsx`, `workout-content.tsx`.

Test integration: `context-menu.test.ts`, `task-workspace.test.ts`, `helpers/form-components.ts`, `helpers/refresh-lifecycle.ts`, `helpers/lifecycle-native.cjs`. Native font/animation boundaries are mocked while screens, callbacks, hooks and database behavior remain real. Obsolete direct-child/elevation/circular-FAB assertions were updated; semantic/navigation/data assertions were retained.

Pre-existing Stage 13L files are not new prototype work. The shared lifecycle helpers contain additive Stage 14B edits on top of that existing work.

## 28. Dependencies / font impact

No dependency or lockfile changed. Uses existing expo-font and Reanimated. No native project/config change, migration or schema change. Two static font assets plus their license were added; they require no new development build solely for font loading. Native rendering remains a physical-review gate.

## 29. Tests

Eleven new tests cover both palettes' contrast, virtualized section structure/defaults/preview, authoritative completion and unmigrated History, empty/dense Tasks, exercise ownership/persistent Finish, local-only insertion, live Reduced Motion, targets/selected/expanded states/wrapping, font fallback and binary font contents.

Existing Tasks, menu, input baseline, Fitness measurement types, rotation, lifecycle, reconciliation and read-performance regressions remain part of validation. Animation tests prove event gating and reduction behavior using a boundary; they do not measure native frame rate.

## 30. Validation

TypeScript, ESLint, the full 831-test suite and iOS export passed. The complete suite was run with `TZ=America/Sao_Paulo`, matching the user's local context. The first host-default run exposed three existing Finance timezone assumptions; those passed unchanged under the local timezone. Two obsolete Task structure/style assertions were updated for the new presentation.

| Final check | Result |
| --- | --- |
| TypeScript | Passed |
| ESLint | Passed |
| Focused Tasks/menu/performance/Fitness/rotation/lifecycle/input/Hearth gate | 156 passed |
| Complete automated suite | 831 passed |
| iOS production export | Passed; both font assets included |
| Android production export | Passed; both font assets included |
| `git diff --check` | Passed |
| Start-snapshot scope comparison | Only the 14 listed existing files changed; no persistence/domain/read-hook changes |

Export success checks bundling; it does not claim native font-load or physical-device testing. No database check was required for this visual-only change; existing database/integrity/reconciliation/performance tests ran as part of the complete suite.

## 31. Physical testing still needed

On iPhone via Expo Go:

- Tasks: first impression; Today/To-do hierarchy; Earlier collapsed/expanded; Upcoming collapsed/expanded; many tasks; long titles; recurrence metadata; completion and failure feedback; FAB; anchored menu; scrolling.
- Fitness: navigation at normal/large text; outer workout header; exercise ownership; zero sets; Add set; several sets; insertion; local notes/actions; workout actions; many exercises; sticky Finish; long names; all measurement types.
- Shared: dark/light, large text, Reduced Motion including live changes, VoiceOver, keyboard/editor return and cold-start/failure font behavior. Android/TalkBack and shadow/text parity when available.

No physical testing is claimed.

## 32. Open visual questions

Does Manrope improve the native reading/logging experience enough to retain it? Is Today sufficiently stronger than To-do on the user's display? Does the quieter Upcoming surface remain legible at low brightness? Does the active-session navigation feel coherent when other destination content remains Calm Utility? Are press and set-insertion timings comfortable on hardware?

### Local review evidence

| Surface | Dark | Light |
| --- | --- | --- |
| Tasks 390 | [Capture](previews/hearth/tasks-dark-390-manrope.png) | [Capture](previews/hearth/tasks-light-390-manrope.png) |
| Tasks 320 | [Capture](previews/hearth/tasks-dark-320-manrope.png) | [Capture](previews/hearth/tasks-light-320-manrope.png) |
| Workout 390 | [Capture](previews/hearth/fitness-dark-390-manrope.png) | [Capture](previews/hearth/fitness-light-390-manrope.png) |
| Workout 320 | [Capture](previews/hearth/fitness-dark-320-manrope.png) | [Capture](previews/hearth/fitness-light-320-manrope.png) |

Additional review: [Task large text](previews/hearth/tasks-dark-390-large-text.png), [Workout large text](previews/hearth/fitness-dark-390-large-text.png), [expanded Tasks](previews/hearth/tasks-dark-390-expanded.png), [dense Tasks](previews/hearth/tasks-dark-390-dense.png), [empty Tasks](previews/hearth/tasks-dark-390-empty.png), [dense Workout / measurement types](previews/hearth/fitness-dark-390-dense.png).

Regenerate HTML with `npm exec -- tsx scripts/preview-hearth.ts`; output goes to ignored `dist/hearth-preview/`. Captures use actual React Native Web source components and seeded in-memory data. They omit native tabs/status bars; the workout gallery does not reproduce the native fixed-footer viewport. Tasks reconstructs the same header/row/footer composition outside SectionList for capture; production remains virtualized. The large-text gallery doubles browser text as a stress simulation, not native Dynamic Type. Screenshots demonstrate static composition, not animation feel or native runtime behavior. Fixture dates, names, counts and workout values are illustrative.

## 33. Recommendation

**Hearth should proceed as the candidate for Axis Design System v2, after this concrete prototype receives physical-device review.** The material hierarchy produces a clear improvement over the supplied flat/divider-heavy examples without per-row card clutter. Manrope is worth testing, but keeping it is a smaller decision than approving the region grammar.

Full migration has not started. Use the review to resolve the open questions before applying this system to other modules.

## 34. Git status

No commit or push. The Stage 13L dirty tree and Stage 14A audit are preserved. Stage 14B adds scoped source, font assets, tests, review tooling and documentation. Global Calm Utility tokens, database/schema/migrations, package files and native bottom tabs remain unchanged.

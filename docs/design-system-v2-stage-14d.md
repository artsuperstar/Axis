# Stage 14D — Axis Design System v2 foundation

14 October 2026. Warm Editorial Hearth, implemented for **Tasks main** and **Fitness active Workout**, with compatible shared navigation chrome. No commit or push.

## 1. Summary

Stage 14B's approved grouping is now a semantic, reusable v2 foundation. The corrected palette, sparse Lora display voice, real Manrope weights, circular task completion, measurement-specific exercise icons/tables and clay Finish action are implemented. Source-owned behavior, queries, persistence, routes, editing and refresh lifecycle remain authoritative.

Impeccable guided the bounded visual review, UI/UX Pro Max informed mobile targets/scaling, and the installed Expo building-native-ui guidance plus SDK 57 documentation informed font/image/native compatibility. General guidance was used where the UI/UX search returned no verified match for numeric-table reflow. No skill overrides the supplied architecture or approved direction.

## 2. Groundwork materialized

[Visual Groundwork](design-system-v2-visual-groundwork.md) materializes the supplied 43-section document, incorporating Stage 14D's corrected palettes, authority order, restricted serif roles, real weights, feature accents, zero-set and measurement rules. Future-feature guidance is explicitly deferred. The historical [audit](visual-redesign-audit.md), [prototype record](hearth-prototype.md) and its captures are preserved unchanged.

## 3. Architecture

`src/constants/design-system-v2.ts` owns semantic colors, typography, spacing, shape, motion and touch targets. `design-system.tsx` owns opt-in text, pressables, buttons, grouping, insertion and local font/reduced-motion providers. `motion.ts`, `internal-navigation.tsx` and `ui-icon.tsx` complete the shared presentation layer. Feature code owns data and behavior. Legacy theme/text/fields retain their defaults. `appearance="v2"` is the explicit shared-button/menu boundary.

## 4–5. Final light and dark tokens

| Token | Light | Dark |
| --- | --- | --- |
| canvas | #F5F0EA | #151315 |
| surface | #FFFCF8 | #1B181A |
| group | #FBF5F0 | #242024 |
| groupStrong | #F7EDE8 | #2B2429 |
| inset | #F0E9E5 | #191619 |
| control | #F8F3EF | #2B272A |
| selected | #F1E1E8 | #3C2B35 |
| textPrimary | #241E1C | #F6F0ED |
| textSecondary | #6A5E59 | #C9BDB8 |
| textMuted | #746660 | #AFA39E |
| border | #E4DAD4 | #3A3337 |
| borderStrong | #9B837B | #7F7078 |
| brand | #7B425E | #DFA6BF |
| brandStrong | #68344E | #EDBAD0 |
| brandSoft | #EBD8E1 | #422E38 |
| onBrand | #FFF9FB | #2A1720 |
| taskAccent | #6670A5 | #AEB7E8 |
| taskAccentSoft | #E6E7F3 | #303247 |
| taskText | #505A8A | #AEB7E8 |
| fitnessAccent | #B66F5D | #E2A08F |
| fitnessAccentSoft | #F2DDD6 | #472D29 |
| fitnessText | #8E4E3F | #E2A08F |
| onFitness | #151010 | #2A1720 |
| attention | #805619 | #DFC18B |
| danger | #9B303E | #F0ABAB |
| info | #3D5E86 | #B4CEE8 |
| shadow | rgba(45, 28, 44, 0.14) | none |

## 6. Contrast adjustments

The supplied corrected baseline colors are unchanged. Added `taskText`, `fitnessText` and `onFitness` are accessible companion roles, not replacement accents. Original light `onBrand` on clay measured **3.73:1**, and clay on group **3.58:1**, insufficient for ordinary text. Finish uses dark ink on clay; supporting clay actions use deeper clay text on the soft tint.

Measured WCAG relative-luminance ratios, rounded only for reporting:

| Actual pair | Light | Dark |
| --- | ---: | ---: |
| textMuted / surface | 5.39 | 7.18 |
| textMuted / group | 5.09 | 6.55 |
| textMuted / inset | 4.59 | 7.31 |
| brand / control | 6.85 | 7.25 |
| brand / group | 6.98 | 7.91 |
| borderStrong / control | 3.22 | 3.15 |
| borderStrong / group | 3.28 | 3.44 |
| fitnessText / fitnessAccentSoft | 4.86 | 5.77 |
| onFitness / fitnessAccent | 4.87 | 7.78 |
| onBrand / taskAccent | 4.56 | 8.65 |
| onBrand / brandStrong | 9.22 | 10.09 |

Automated tests cover the actual text/surface, accent, disabled and control pairings in both themes. Brand outlines identify keyboard focus; filled buttons also keep a contrasting inner edge. Decorative table separators are deliberately quieter than essential controls.

## 7. Typography

Only the primary migrated **Tasks** and **Fitness** screen titles use **Lora SemiBold 600**, at 36/46. Section headings use Manrope 600 at 20/28; object titles 16/24; buttons 15/22; numeric data 15/22 with tabular figures; metadata 14/20 at 400; small table labels 12/18 at 600. Body is 16/24 at 400. No synthetic 500.

Static font aliases select their real file weight and use runtime `fontWeight: 400` to avoid synthetic weight selection. Lora and Manrope load independently through the installed `expo-font` runtime hook, never block content, and fall back to readable system 400/600 during loading or failure. There is no new splash dependency or user-facing font preference.

- Added `assets/fonts/lora/Lora-SemiBold.ttf`: **134,352 bytes**; OFL license **4,423 bytes**. Source: [Expo Google Fonts Lora static 600](https://github.com/expo/google-fonts/tree/main/font-packages/lora/600SemiBold).
- Retained Manrope 400: **96,832 bytes**; Manrope 600: **96,936 bytes**; existing OFL license unchanged.
- Total application typeface binaries: **328,120 bytes** before packaging.
- Binary tests check static tables, real 400/600 weights, Portuguese/English sample glyphs and Manrope tabular figures. Runtime tests cover independent failures and non-blocking fallback. Both exports list all three assets.

Sparse serif use preserves the difference between expressive navigation-level titles and practical user-generated working content. Native text rasterization and first-load movement still need device review. [Expo SDK 57 Font](https://docs.expo.dev/versions/v57.0.0/sdk/font/).

## 8. Shape and spacing

Group 16; raised 18; control 10; inset/status 8; menu 12; future sheet top 20; FAB 28 for a 56px circle. Completion ring is 24px with radius 12 inside a 48px target. Spacing is 4/8/12/16/20/24/32; existing 16px screen gutters and form metrics remain. Sheets/fields are not globally restyled.

## 9. Surface and depth

Canvas → owned group → optional inset → plain rows. Today uses groupStrong; To-do group; Earlier control; Upcoming surface. Workout stays on the outer plane; each exercise owns one group and one sets inset. Ordinary groups have no shadow. Light FAB/menu shadows are restrained and offset; dark depth is tonal.

Against the supplied mockup, the captures preserve cream/plum warmth, an editorial screen-title voice, soft owned regions, compact plain rows and restrained icon containers. The practical Manrope hierarchy deliberately replaces the mockup's serif exercise/section names. Light and dark share the same content and structure; dark adds no decoration. Real Axis section composition and measurement controls determine density rather than the mockup's invented metrics/navigation.

## 10. Feature accents

Dusty indigo supports task completion/counts; clay supports exercise icons, progress and Add/Finish actions. Brand remains plum for shared actions/navigation. Attention, danger and information are independent semantic colors. No whole-screen feature wash or color-only selected state is introduced.

## 11. Icon system

The existing native tabs use platform SF/Material glyphs; body controls previously mixed text glyphs and small authored geometry. v2 promotes that authored outline grammar into one eight-icon body vocabulary: plus, more, chevron, check, dumbbell, activity, timer and route. All use 24-unit geometry, stroke 2 and round caps/joins. Installed `expo-image` renders SVG data URIs; no second icon library or artwork dependency.

The installed Android Expo Image data loader specifically decodes base64. Sources are therefore base64 SVG, encoded by a small ASCII-only helper without a browser-global/Node dependency. Round-trip tests verify every glyph and stroke/color. Decorative icons add no duplicate accessibility stop. [Expo SDK 57 Image](https://docs.expo.dev/versions/v57.0.0/sdk/image/).

## 12. Measurement mapping

| Authoritative measurementType | Icon |
| --- | --- |
| strength | dumbbell |
| bodyweight | activity |
| duration | timer |
| distance | route |

The mapping reads only measurement type. Exercise names never select artwork or icons.

## 13–14. Motion and Reduced Motion

Press 120ms; selection 180ms; navigation indicator 190ms; local insertion/disclosure 220ms; menu 160ms; cubic ease-out. Reanimated shared values use the compiler-compatible get/set API. No per-frame React updates or layout-heavy global transitions.

Reduced Motion starts conservatively until the OS preference resolves and updates live through one screen subscription. It removes press scale, travel and local insertion movement. Only a genuinely locally added set opts into insertion, consumed once; refresh/resume/History return do not replay it. No animated delay changes authoritative completion/removal. [Reanimated shared values](https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue/).

## 15–16. Tasks migration and mockup differences

Tasks main retains Earlier → Today → To-do → Upcoming and the existing default disclosures, date, five-row To-do preview, source ordering and independently virtualized items. Continuous section surfaces are painted by header/row/footer slices without wrapping an entire section's rows. Completion remains a checkbox action, now circular visually, with separate editor and action targets. FAB and anchored Categories/Repeating Tasks/History overflow remain.

No mockup section tabs, header Add, Today progress ring/count, retained completed Today rows, invented priority actions or new destinations. History, repeating management, categories and editors keep legacy visuals and behavior.

## 17–19. Active Workout migration, measurements and mockup differences

Workout name/status/notes/actions remain outside exercise groups. Each exercise owns its type icon, name, target, notes/actions, one inset, logged/planned set count and Add set. Numeric rows use tabular Manrope. All set taps open the existing editor with complete spoken units; delete remains in that editor.

| Type | Columns | Optional behavior |
| --- | --- | --- |
| Strength | Set, Weight, Reps | Existing kg model; no pounds |
| Bodyweight | Set, Reps | Added weight only when any logged set has it |
| Duration | Set, Duration | Clock string, spoken duration retained |
| Distance | Set, Distance | Time only when any logged set has it |

An em dash marks a missing optional value on an existing set. Zero-set groups show the empty message and Add set, with no generated placeholder rows. At fontScale ≥1.5, rows reflow into labelled values. Finish is a clay primary action outside the ScrollView and inside the established native safe-area composition.

No header Add, extra Current Workout/resume card, exercise-completion metric/state, set overflow menus, custom imagery or new workout models. Other Fitness content and editors remain legacy.

## 20. Internal navigation

Workout/Routines/Exercises/History remain exactly the four destinations, with the existing per-view offsets and source loading. The active-session rail is low-profile and contained. Its sliding underline uses actual measured button bounds when all four occupy one row. Wrapping or large text uses selected fill plus a static underline. No fixed quarter widths or hidden destinations. The active-session rail is a shared-chrome exception when visiting legacy Fitness destinations; those destination bodies remain unmigrated.

## 21. Bottom navigation

The existing NativeTabs component and five routes/icons remain intact: Home, Tasks, Calendar, Finance, Fitness. Only chrome colors adopt v2 canvas, brand and brandSoft. Existing transparency/inset flags are unchanged. Journal remains secondary. No custom replacement bar or new route. Platform tab glyphs remain platform-owned rather than being redrawn as body icons.

## 22. Shared responsibilities

- `DesignProvider`: local, non-blocking font loading and one live reduced-motion boundary.
- `UiText`: semantic typography/color; only screenTitle selects Lora.
- `UiPressable`: stable hit bounds, focus and bounded press feedback.
- `UiButton`: primary/secondary/quiet/destructive/navigation; optional feature identity; accessible label/state.
- `GroupSurface`: group/groupStrong/surface/inset, optionally compact for rows.
- `ContentInsertion`: explicit one-shot local data insertion.
- `UiIcon`: one decorative outline vocabulary through the installed image renderer.
- `InternalNavigation`: measured selection motion and wrapping fallback.
- Existing FormButton/ContextMenu/SelectionOverlay: explicit v2 presentation, preserved interaction host and legacy defaults.

## 23. Prototype cleanup

| Stage 14B module | Final module |
| --- | --- |
| constants/hearth.ts | constants/design-system-v2.ts |
| components/hearth-controls.tsx | components/design-system.tsx |
| components/hearth-motion.ts | components/motion.ts |
| components/hearth-navigation.tsx | components/internal-navigation.tsx |
| tasks/components/hearth-task-row.tsx | tasks/components/task-list-row.tsx |
| tests/hearth-prototype.test.ts | tests/design-system-v2.test.ts |
| tests/helpers/hearth-font.cjs | tests/helpers/native-font.cjs |
| tests/helpers/hearth-reanimated.cjs | tests/helpers/native-motion.cjs |
| scripts/preview-hearth.ts | scripts/preview-design-system.ts |

Old modules/exports/appearance names are removed; no compatibility exports are needed. Useful prototype tests were retained and extended. Historical docs and captures retain their original names/content as records.

## 24–25. Accessibility and large text

48px interactive minimums, explicit action subjects, checkbox/selected/expanded states, header roles, complete set units, non-color check/underline states, decorative-icon suppression, contrast-tested text and brand keyboard focus. Controls wrap; groups and table rows have no fixed content height. Numeric columns yield to labelled stacked rows at large text. Menu anchoring/dismissal/Escape/Back/focus restoration are covered by the existing real-host regressions.

RN Web captures cover 320/390 widths and a labelled 2× text simulation. They cannot validate VoiceOver/TalkBack, native dynamic-type metrics, native tab geometry, keyboard-safe sheets or physical low-brightness tonal separation.

## 26. Performance

No production source reads, materialization, paging, aggregations, recurrence or rotation computations changed. SectionList virtualization remains; reduced-motion observation is per screen, not per row. Set column presence is derived once per exercise, not scanned for each row. Icons memoize their small source URI; fonts are local static files. Existing read-performance tests remain green. No new query cache/global state or runtime benchmark claim.

## 27. Files created or promoted

New semantic/promoted modules: `src/constants/design-system-v2.ts`; `src/components/design-system.tsx`, `motion.ts`, `internal-navigation.tsx`, `ui-icon.tsx`; `src/features/tasks/components/task-list-row.tsx`; `tests/design-system-v2.test.ts`; `tests/helpers/native-font.cjs`, `native-motion.cjs`, `native-image.cjs`; `scripts/preview-design-system.ts`.

Added assets/docs: `assets/fonts/lora/Lora-SemiBold.ttf`, `assets/fonts/lora/OFL.txt`; `docs/design-system-v2-visual-groundwork.md`; this report; 18 PNGs in `docs/previews/design-system-v2/`.

## 28. Existing files modified for Stage 14D

- `src/components/app-tabs.tsx`, `context-menu.tsx`, `form-controls.tsx`, `form-selection-host.tsx`.
- `src/features/tasks/tasks-screen.tsx`; `components/floating-add-task.tsx`, `task-options.tsx`, `task-row.tsx`, `task-section.tsx`.
- `src/features/fitness/fitness-screen.tsx`, `workout-presentation.ts`, `components/workout-content.tsx`.
- `tests/fitness-experience.test.ts`; `tests/helpers/form-components.ts`, `lifecycle-native.cjs`, `refresh-lifecycle.ts`.

These lists are relative to the saved Stage 14D start-state, not HEAD. The working tree already contained earlier Journal/audit/prototype work. That unrelated work was preserved.

## 29–30. Fonts, dependencies and database

Only static Lora 600 and its license were added; Manrope assets remain unchanged. No dependency/package-lock/app configuration updates. No schema, migration, database relationship, persistence or source-data access changes. Database validation beyond the retained full regression suite is unnecessary for this presentation-only stage.

## 31. Tests

v2 tests cover light/dark token parity and actual contrast pairs, font metadata/glyphs/licenses/fallback/sparse serif use, base64 SVG compatibility, four measurement mappings/layouts, optional columns, large-text stacking, zero sets, circle geometry/targets, feature Finish, exercise ownership, source-authoritative completion/History, SectionList and one OS motion subscription, local insertion and live Reduced Motion. Existing Tasks, Fitness, rotations, F1 lifecycle, menu, source reconciliation and performance tests are retained.

Two Fitness presentation assertions now allow reps to appear under a column heading rather than require the word “reps” in every visual cell. Their parsing, stored values and complete accessible-unit assertions remain.

## 32. Validation

- TypeScript `tsc --noEmit`: passed.
- Focused feature runs: 132/132 and 65/65 passed (overlapping suites).
- Complete automated suite: **835/835 passed**, with shell-local `TZ=America/Sao_Paulo` for the app's local business-date fixtures.
- iOS export: passed, `dist/design-system-v2-ios`.
- Android export: passed, `dist/design-system-v2-android`.
- Both exports list Lora 600 and Manrope 400/600. The Android native-tab Material Symbols font is pre-existing Router infrastructure, not a new v2 dependency.
- SHA-256 checks match each of the three source font binaries to exactly one bundled asset in each export.
- Repository-wide no-cache ESLint: same pre-existing **6 errors / 2 warnings**, **0 new findings**; baseline compared by file/rule/severity/message so shifted lines do not create false differences. Existing errors: react/no-children-prop in context-menu (3), navigation-conventions (2), transactions-experience (1). Existing warnings: two unused variables in tasks-experience.
- `git diff --check`: passed.
- Saved start-state hash comparison: 131 protected files unchanged, including source data APIs/hooks, Finance/Home/Calendar/Journal, legacy global theme, package files, historical design docs and prototype PNGs.

The repository-wide lint command still returns non-zero for those existing findings; this is not a claim of a clean whole-repository lint result.

## 33. Preview captures

Generated by `scripts/preview-design-system.ts` from **actual TasksScreen/FitnessScreen composition**. Only source-hook fixtures and native safe-area boundaries are substituted, using real in-memory source data. The image boundary renders the same SVG URI as a static image for SSR; font aliases use the real bundled font files. No preview route, font toggle or invented native tabs.

18 final PNGs: both screens/themes at 320 and 390; both themes at 390 with 2× text and dense fixtures; Tasks empty states in both themes. Dense Fitness uses an explicitly tall review viewport to expose all four measurements and a long exercise name. Other captures are 1100px tall. Two bounded visual-review batches were used, with the first revealing the SVG-source/rendering issue and the second confirming it.

| Screen | Light | Dark |
| --- | --- | --- |
| Tasks 390 | [capture](previews/design-system-v2/tasks-light-390-normal.png) | [capture](previews/design-system-v2/tasks-dark-390-normal.png) |
| Tasks 320 | [capture](previews/design-system-v2/tasks-light-320-normal.png) | [capture](previews/design-system-v2/tasks-dark-320-normal.png) |
| Workout 390 | [capture](previews/design-system-v2/fitness-light-390-normal.png) | [capture](previews/design-system-v2/fitness-dark-390-normal.png) |
| Workout 320 | [capture](previews/design-system-v2/fitness-light-320-normal.png) | [capture](previews/design-system-v2/fitness-dark-320-normal.png) |
| Tasks 2× text | [capture](previews/design-system-v2/tasks-light-390-large-text.png) | [capture](previews/design-system-v2/tasks-dark-390-large-text.png) |
| Workout 2× text | [capture](previews/design-system-v2/fitness-light-390-large-text.png) | [capture](previews/design-system-v2/fitness-dark-390-large-text.png) |
| Workout all measurements | [capture](previews/design-system-v2/fitness-light-390-dense.png) | [capture](previews/design-system-v2/fitness-dark-390-dense.png) |

These are static RN Web review captures, **not native screenshots or evidence of physical-device testing**. Explicit text multiplication simulates large text because RN Web does not apply OS fontScale to typography. Motion is tested structurally, not inferred from still images.

## 34–35. Physical testing and remaining questions

No iPhone or Android physical-device tests were performed. In Expo Go, check:

1. Lora/Manrope native rendering, Portuguese accents, first-load fallback and largest accessibility sizes.
2. Both themes, including dark tonal distinctions at low brightness, surface warmth/radii, Task indigo and Fitness clay on the physical display.
3. All four exercise icons on iOS/Android and optional measurement columns.
4. Native tabs plus sticky Finish/FAB clearance, scrolling and keyboards/editors.
5. Wrapped internal navigation, menu placement/dismissal/focus, VoiceOver/TalkBack and hardware keyboard focus.
6. Completion/disclosure/selection/local-set motion and live Reduced Motion, including resume/History return.

Remaining visual questions are device calibration of serif sizing/metrics, tonal separation, native chrome transition to legacy destinations and density under the largest OS text sizes. No unresolved architecture or product-behavior decision blocks review.

## 36. Recommendation

**Yes: Tasks and active Workout provide a reusable, tested v2 foundation for subsequent migrations.** Complete the focused Expo Go/device review before treating their native visual calibration as final. The rest of Axis can adopt these primitives incrementally without changing domain behavior; no broader migration is implemented here.

## 37. Git status

Working tree remains dirty with preserved earlier work plus Stage 14D changes, promoted files, fonts, docs and captures. No staging, commit, push, merge or dependency update was performed. Ignored `dist/` holds local baselines, logs, generated HTML and exports. Review the scoped file lists above separately from the earlier Journal/prototype work.


---

## 14D.1 — Tasks visual correction

14 October 2026. The Stage 14D record above is historical and remains byte-for-byte intact. This section records the subsequent **Tasks main only** visual correction. The supplied first image is now the primary appearance target; real Axis remains authoritative for behavior, and the Visual Groundwork governs implementation. No further screen migration, commit or push.

### Visual gap analysis before editing

| Intentional architectural difference | Unintentional 14D shortcoming |
| --- | --- |
| Real vertical Earlier/Today/To-do/Upcoming, not mockup tabs | Four generic surfaces lacked sufficiently distinct module headers |
| Header overflow plus FAB, not header Add | Bare overflow and visually dominant FAB were weakly integrated |
| Real counts, metadata and completion/History behavior, not mockup progress metrics or retained completed rows | Generic heading/count placement and loose row rhythm felt like a token substitution |
| Lora screen title only; Manrope headings and task content | Uniformly emphasized row titles competed with section hierarchy |
| Source-backed user content, not mockup sample data | Empty Today and collapsed modules did not carry enough authored character |

The user’s physical screenshot was assessed separately from content-rich mockup data: Earlier 19, Today 0, To-do 1 and Upcoming 2. Both populated and matching empty-Today fixtures were captured before edits, then rendered again after with identical source-backed fixtures. No content was invented to make the empty state look fuller.

### Skill findings and their material contributions

**Impeccable:** the embedded design critique identified generic section specificity, plain labels, flat ownership, insufficient header/row alignment and weak distinction between disclosure and work regions. It drove semantic icon/header/count compositions, continuous section edges, a cleaner Today surface, quieter row titles, deliberate alignment and a bounded two-round visual inspection. The long-row review additionally caught vertically centered controls drifting down into metadata; controls now align from the top. This is an embedded visual critique, not a claimed independent multi-agent/detector audit.

**UI/UX Pro Max:** two topical grouping searches returned no verified grouping-specific match, so their unrelated results were not adopted. The verified mobile Quick Reference guided 48px targets, decorative vector semantics, explicit expanded/checked states, non-color cues, contrast and natural wrapping. The resulting design keeps separate Complete/Edit/Actions targets and uses semantic disclosure labels instead of color alone. Richer headers cost some vertical space; tighter plain rows preserve working density.

**Expo building-native-ui:** kept this implementable through existing View/Pressable/SectionList, the installed Image renderer and Reanimated feedback. No new dependency, native module, heavy shader, per-row subscription, whole-section wrapper or layout animation was introduced. Native tabs/safe-area flags and source reads remain untouched. New icons extend the existing base64 SVG outline family, avoiding packed SVG arcs. SDK 57 primary references: [Image](https://docs.expo.dev/versions/v57.0.0/sdk/image/), [Font](https://docs.expo.dev/versions/v57.0.0/sdk/font/).

### Exact visual changes

- **Today:** 40px warm sun tile, stronger Manrope heading/date grouping, existing count in a small indigo inset, 18px outer corners, a continuous owned surface and an aligned empty-state message. Light Today uses existing `surface` instead of `groupStrong` to match the target’s clean warm module; dark retains `groupStrong`.
- **To-do:** an indigo list tile, quieter 18px heading and existing-count inset. Rows remain slices of one region, with the existing five-item preview and View all/Show less behavior.
- **Earlier/Upcoming:** compact icon-led disclosure objects, existing task count beneath the title, a contained chevron and an explicit pressed surface. Earlier uses warm attention identity; Upcoming uses indigo. Expanded content uses the same owning region. No new navigation or selection model.
- **Rows:** title/metadata rhythm is 15/22 and 13/18 in real Manrope 400; no synthetic weight. Header and row text share a consistent leading column. Metadata, dates, priority, categories, descriptions and recurrence remain authoritative. Separate controls align from the top for long content. No individual task cards.
- **Completion:** 24px circle, 1.5px indigo boundary, 14px check, circular press region and unchanged 48px target/checkbox semantics. Existing completed fill and authoritative removal/reopen behavior remain.
- **Title and spacing:** Tasks remains Lora 600, now 38/48; main-only screen gutters become 20px. No serif spreads to sections or task rows. Legacy Tasks subroutes retain their prior metrics.
- **Edges/depth:** subtle continuous section edges complement tone, spacing and icon ownership. Header, virtualized row slices and footer still compose one region; ordinary groups receive no heavy shadows.
- **FAB/menu:** FAB becomes 52px with a 22px plus and 20px placement/clearance, with radius derived from its actual size. Existing overflow gets a quiet round housing while retaining the same measured trigger and actions. Anchoring, dismissal and focus restoration are unchanged.
- **Motion:** disclosures now receive the existing 120ms tactile press feedback and selected surface. Existing 220ms chevrons, completion feedback, menu timing and one-shot local reveals remain. No screen-load entrances or data delays. Live Reduced Motion remains effective.

### Tokens and measured contrast

Existing palette values are unchanged. Added only the semantic `attentionSoft` pair for Today/past icon containers: **#FBEACF light / #4C3928 dark**. This fills the warm-tile gap visible in the supplied target without borrowing Fitness colors or tinting whole task regions. The addition is unused outside Tasks. The light Today change is a mapping to an existing surface token, not a global palette replacement.

| Pair | Light | Dark |
| --- | ---: | ---: |
| attention / attentionSoft | 5.45:1 | 6.31:1 |
| taskText / taskAccentSoft count inset | 5.39:1 | 6.42:1 |
| taskAccent / Today surface | 4.64:1 | 7.74:1 |
| taskAccent / To-do group | 4.39:1 | 8.22:1 |
| secondary text / pressed task tint | 5.09:1 | 6.85:1 |

Text/control regression checks cover the relevant combinations. Completion outlines exceed the non-text 3:1 requirement on all four region tones. No contrast threshold is inferred merely from a token name.

### Explicit visual-fidelity assessment

Qualitative review against the actual supplied target, not a score inferred from tests:

| Attribute | Assessment after correction | Remaining difference |
| --- | --- | --- |
| Warmth | Strong | Native display calibration still needed |
| Surface hierarchy | Strong | Real vertical sections replace the mockup tabs |
| Section ownership | Strong | Empty/disclosed regions reflect actual user data |
| Typography personality | Strong within the rulebook | Section/task headings intentionally remain Manrope, unlike parts of the mockup |
| Spacing | Strong | Actual native safe areas/tab chrome are preserved |
| Density | Strong | Richer module headers use more space; ordinary row minimum drops from 64 to 56px and three-line rows from about 88 to 70px |
| Depth | Moderate-to-strong | Tonal depth and subtle edges, without the concept render’s lighting effects |
| Control polish | Strong | Overflow remains overflow, and Add remains the FAB |
| Overall resemblance | Substantially closer in character | Same warm editorial system, deliberately different product composition |

The final captures show a distinct warm Today tile, section-specific icon vocabulary, quieter task text and coherent indigo controls. Light mode reads cleaner than the prior beige working panel; dark mode uses the same design and content without additional decoration. Fidelity is materially improved, not pixel-identical. No progress ring, header Add, top section tabs, completed Today rows, invented metrics, changed recurrence or new destinations were introduced.

### Accessibility, responsive behavior and performance

48px task action targets remain, including the 52px FAB. Decorative icons are hidden from assistive technology; section headers and complete action subjects remain exposed. Header/metadata text wraps naturally; no fixed content-card heights or single-line title clamp was added. Pre-existing description truncation remains unchanged. Counts are the existing task counts, not completion progress. The long-row regression specifically prevents controls from centering far down a large metadata block.

SectionList and independent item virtualization are preserved. No data API, source hook, recurrence, category, completion, editor, history, paging, navigation or native-tab code changed. No new per-row OS listeners or looping animations. Source-owned totals and outcomes remain unchanged.

### Files modified / created

Modified relative to the saved 14D.1 start state:

- `src/constants/design-system-v2.ts`: additive attentionSoft and light Today surface mapping.
- `src/components/ui-icon.tsx`: sun, list, clock and calendar geometry; existing glyphs unchanged.
- `src/features/tasks/tasks-screen.tsx`: main-only title/gutter overrides.
- `src/features/tasks/components/task-section.tsx`: owned module headers/disclosures/footers.
- `src/features/tasks/components/task-list-row.tsx`: compact typography, alignment and controls.
- `src/features/tasks/components/floating-add-task.tsx`: 52px FAB and clearance.
- `src/features/tasks/components/task-options.tsx`: trigger housing only.
- `tests/design-system-v2.test.ts`: fidelity/contrast/interaction regressions.
- This document: appended 14D.1 section; historical content preserved exactly.

Created `scripts/preview-tasks-fidelity.ts`, [side-by-side review](tasks-visual-fidelity-review.html), four before PNGs and sixteen after PNGs in `docs/previews/tasks-fidelity-before/` and `docs/previews/tasks-fidelity-after/`. No files removed.

### Tests and validation

- Focused Tasks/v2/menu/accessibility/Reduced Motion/read-performance run: **83/83 passed**.
- Full automated suite: **838/838 passed**, using shell-local `TZ=America/Sao_Paulo` for local-date fixtures.
- TypeScript: passed.
- iOS and Android exports: passed (`dist/tasks-fidelity-ios`, `dist/tasks-fidelity-android`), refreshed after the final alignment change.
- Repository-wide no-cache ESLint: **same 6 existing errors and 2 existing warnings; zero new findings**, compared by file/rule/severity/message. The command still exits non-zero for the pre-existing test findings.
- `git diff --check`: passed.
- Saved-start-state comparison: **317 protected files unchanged**, including all other feature code, Tasks data/hooks/IA, editors, database, native tabs, package files, font binaries and historical captures.
- No schema, migrations, persistence or dependencies changed. No commit or push.

### Preview provenance and comparison artifact

[Open the three-column comparison](tasks-visual-fidelity-review.html): actual supplied target reference → pre-edit 14D → post-edit 14D.1. Light/dark and populated/device-state toggles compare identical source-backed fixtures. The actual first supplied image remains in the conversation; it is not exposed as a local image file. The reference pane explicitly identifies that image and its left Tasks panels, rather than inventing a reconstruction or displaying a broken image.

The four before PNGs were captured from unchanged production components before edits. Sixteen after PNGs cover 320/390, both themes, populated and empty-Today states, dense Today, long real metadata, simulated 2× text and empty sections. All use real TasksScreen composition, bundled font files and source-backed fixtures with only source-hook/native boundaries substituted for SSR. Existing 14D captures remain unchanged.

These are **RN Web captures, not native-device screenshots**. The large-text multiplication is an explicit review simulation; actual OS Dynamic Type must be checked separately. Dense SSR captures show the initial virtualized window and cannot demonstrate native scroll fill/performance. Native tabs, status bars, camera-return chrome and Expo Go controls are not recreated.

### Physical testing still needed / recommendation

No physical-device testing was performed. On iPhone Expo Go, compare the actual target and the exact empty-Today state again. Check warmth, icon/indigo balance, dark separation at low brightness, Lora/Manrope metrics, control alignment, largest text, expanded Earlier/Upcoming, overflow positioning/focus, FAB/tab clearance, scrolling, completion and live Reduced Motion. Check Android glyph rendering and TalkBack when available.

**Recommendation: yes, Tasks main now matches Warm Editorial Hearth strongly enough in visual character to proceed with later migrations after this focused device review.** Remaining differences primarily follow real Axis IA, sparse-serif rules and native rendering rather than the old visual layout. Keep the next stage scoped; no additional screen migration is included here.

The tree remains dirty with earlier work preserved plus these scoped changes. No staging, commit or push was performed. Logs, baselines, generated HTML and exports remain under ignored `dist/`.

## Stage 14D.2 — Tasks Daily Progress + Section Navigation

### Authority and scope

The Stage 14D.2 brief intentionally supersedes the earlier Tasks-main exclusions of retained completed rows, daily progress and top section navigation. Everything else from 14D.1 remains: continuous section surfaces, warm Today identity, semantic icons, Lora screen title, Manrope content, circular checkboxes, contextual overflow, FAB, disclosure behavior and virtualized rows. No other screen is migrated.

### Today projection and count definition

`taskWorkspaceSections` combines the existing pending Today group with qualifying items from the existing Completed group. The underlying task/occurrence records remain authoritative; there is no completion ledger, second record or storage mutation.

- **Y:** pending items scheduled for the current local civil date plus items scheduled for that date and completed on that date.
- **X:** that completed subset. One-time tasks and recurring occurrences each contribute their actual list entity once.
- **Excluded:** undated, earlier/missed, future, deleted/retired, skipped and unrelated historical records.
- **Early completion:** an item scheduled for Today but completed on a previous local day remains historical. It is already resolved, so it is neither actionable Today nor work completed today. It contributes to neither X nor Y. This is explicitly tested.

Pending rows retain authoritative source ordering. Completed rows follow them, using the existing Completed ordering and a small “Completed today” label inside the same continuous Today surface. Existing filled checks, readable secondary text and restrained strikethrough distinguish resolved work. There are no nested status cards.

### Completion wheel and accessibility

The Today header keeps its sun tile and localized date and adds the real “X of Y completed” text plus a 44pt Tasks-accent ring. Two clipped native semicircles render a continuous fraction; Reanimated changes only their rotations on the UI thread using the established 180ms selection timing. At full completion the ring closes and contains a check. There is no celebration, streak or other invented metric.

The ring exposes a single progressbar node with label “Today progress, X of Y tasks completed” and numeric/text values; its geometry is hidden from accessibility. The separate visible text makes the meaning understandable without color. Zero Today items retain the existing empty state and render no ring or 0-of-0 metric.

Reopening uses the original checkbox mutation for either task or occurrence, returns the row to pending and reduces X without changing Y. Live Reduced Motion disables ring interpolation and animated list jumps. No screen-wide entrance is introduced.

### History, local dates and drafts

History still projects the same Completed/Skipped groups and retains its existing appearance, actions and navigation. Showing an entity in Today does not remove it from History. Earlier, future selection, recurrence materialization and all persistence semantics are unchanged.

Existing `useTasks` minute/day, focus and resume infrastructure supplies local time and refreshes the snapshot. After midnight, yesterday’s completions leave the Today projection and remain historical; the new day has its own progress. The mounted editor and unsaved draft remain intact. Regression coverage crosses 23:59 → 00:01, repeats resume, and checks recurrence identity and draft retention.

### Top jump navigation and sticky decision

Earlier / Today / To-do / Upcoming remain destinations inside **one SectionList**, not routes or filtered screens. A compact variant extends the existing shared `InternalNavigation`; its default Fitness behavior is unchanged. Feature code owns section jumping and visibility. Buttons have selected state, explicit “Go to …” labels/hints, 48pt minimum targets, soft selected surfaces and a non-color underline.

**Pinned, in normal flow:** the existing fixed Tasks title remains in place; the navigation is another sibling immediately above the list viewport. This keeps it reachable during scrolling without overlaying content, duplicating sticky headers, measuring safe-area offsets or changing virtualization. Section headers remain non-sticky. This is a deliberate adaptation of the mockup to the real existing header architecture.

Taps select immediately and call `scrollToLocation` for the corresponding section’s header (`itemIndex: 0` in the installed RN implementation). Collapsed Earlier and Upcoming remain collapsed. No disclosure state changes or route navigation occurs.

Stable viewability configuration and callbacks choose the first visible recognized section, including header/footer tokens for empty or collapsed sections. State changes only when the section changes; there is no per-frame JS scroll observer. A short programmatic-jump guard prevents intermediate visible sections from overriding a tap; manual drag releases it immediately, and settling releases it for other scrolling. End-of-list clamping may keep part of the preceding section visible, while the tapped target remains selected during the jump.

Unmeasured distant sections use RN’s measured average item length to advance the native scroll viewport and retry the exact header. Retries are bounded to ten and cancelled on replacement taps, manual drag and unmount. This does not pretend rows have fixed heights. A permanently failing native measurement stops retrying and permits natural-scroll selection recovery; native-device testing remains necessary for long variable-height lists.

### Responsive and motion behavior

Normal 320/390 widths keep four compact destinations in one row. At font scale ≥1.3 the navigation deliberately wraps into two columns; text keeps its size, can wrap, and the selected underline becomes static. Today’s header gives date/count a full-width row at font scale ≥1.5 so the icon and ring do not squeeze enlarged metadata. Nothing uses a fixed text height or truncates navigation labels.

The existing measured navigation underline uses the v2 190ms indicator timing at ordinary text sizes. The default layout is visible immediately; no list entrance or per-row OS preference subscription is added.

### Reviews and native evidence

- **Impeccable:** used initialized Axis product context, Operate guidance and the craft floor. Batched actual-component review found narrow 2× Today metadata too constrained; the single correction gives it full width. A scoped detector invocation returned `[]`. The design remains supportive and task-focused without gamification. No independent-agent review is claimed.
- **UI/UX Pro Max:** applied its relevant active-state guidance, generous targets and non-obscuring navigation principle. Web-only smooth scrolling guidance was not treated as a native API prescription. Jump selection is immediate, and natural scrolling updates orientation.
- **Expo:** reviewed SDK 57 guidance and the installed RN 0.86 SectionList/VirtualizedSectionList contract. Kept virtualization, actual header indexing, measured failure recovery, UI-thread progress transforms and live Reduced Motion. Native exports validate bundling, not physical scroll behavior.

### Performance and persistence

The existing snapshot already contains both pending and completed current-day records. No broad or bounded extra read is needed. On an actual SQLite fixture with **1,860 persisted recurring occurrences**, the normal snapshot contained **61 items**, and daily projection executed **0 extra SQL statements / 0 extra rows**. Inputs were unchanged by projection. History and recurrence generation remain source-owned.

Only visible row cells render through SectionList. The completed subgroup label belongs to the first completed item’s virtualized cell. No all-rows ScrollView, per-parent SQL, cache, global state or new package is introduced. Schema, migration files, data access, useTasks, dependencies and native tabs are unchanged by this stage.

### Tests, validation and previews

Focused coverage includes zero/partial/full progress; one-time and recurring completion/reopen; all exclusions and early completion; History identity; midnight/draft preservation; zero-query projection; all four jumps; empty/collapsed headers; stable callbacks; natural scrolling; unmeasured/replaced/bounded retries; unmount cleanup; 320/390 and 1×/2× navigation; selected accessibility state; and live Reduced Motion. Earlier workspace/v2 assertions were updated only for the explicitly changed Today behavior.

The [preview gallery](tasks-daily-progress-review.html) contains ten actual TasksScreen captures: light/dark partial and complete, 320px partial, and 320/390 simulated 2× text. Fixtures use the actual data access and bundled fonts. These are **RN Web screenshots, not native screenshots**. Static SSR captures only the initial virtualized window; blank space after it is not evidence of native list fill or a missing To-do/Upcoming section. The gallery explicitly documents this limitation. Existing historical captures remain intact.

Final validation on the delivered source:

| Check | Result |
|---|---|
| TypeScript | Passed (`tsc --noEmit`) |
| Focused Tasks/recurrence/History/menu/v2/accessibility/motion/read-performance | **162/162 passed** |
| Complete automated suite | **854/854 passed** |
| Repository-wide no-cache ESLint | Same **6 existing errors / 2 existing warnings**, exact file/rule/severity/message baseline match; no new findings. Exit remains 1 for those existing findings. |
| iOS export | Passed: `dist/tasks-progress-ios` |
| Android export | Passed: `dist/tasks-progress-android` |
| `git diff --check` | Passed |

Test runs use shell-local `TZ=America/Sao_Paulo` for the repository’s local-date fixtures. Logs and machine-readable lint/start-state comparisons are under ignored `dist/stage14d2-*`. The saved-start comparison confirms **341 pre-existing files unchanged**, including all database/migrations/data access/hooks, other feature code, package/lock files, font binaries, native tabs and earlier captures.

### Files in this stage

Created:

- [TodayProgress](../src/features/tasks/components/today-progress.tsx)
- [TaskWorkspaceList](../src/features/tasks/components/task-workspace-list.tsx)
- [Daily-progress regressions](../tests/task-daily-progress.test.ts)
- [Section-navigation regressions](../tests/task-section-navigation.test.ts)
- [Reproducible preview generator](../scripts/preview-task-progress.ts)
- [Review gallery](tasks-daily-progress-review.html) and ten PNGs in `docs/previews/task-daily-progress/`

Modified:

- [Workspace projection](../src/features/tasks/workspace.ts)
- [TasksScreen](../src/features/tasks/tasks-screen.tsx)
- [Section header](../src/features/tasks/components/task-section.tsx)
- [Shared InternalNavigation](../src/components/internal-navigation.tsx), with its existing default unchanged
- [Workspace tests](../tests/task-workspace.test.ts) and [v2 tests](../tests/design-system-v2.test.ts)
- [Native list boundary](../tests/helpers/lifecycle-native.cjs) and [mount harness](../tests/helpers/refresh-lifecycle.ts)
- [Visual Groundwork](design-system-v2-visual-groundwork.md), with a narrow authority-override note; and this append-only stage record

No files removed. No dependencies, schema or migrations changed. No staging, commit or push. The working tree retains all pre-existing unfinished stages alongside these scoped edits.

### Physical testing and recommendation

**No physical/native-device testing was performed.** Retest in iPhone Expo Go: (1) all four tap-to-header jumps, (2) active selection during manual scrolling, (3) pinned navigation and safe areas, (4) progress interpolation, (5) retained completed rows, (6) reopening, (7) full completion, (8) midnight/resume and an unsaved editor, (9) long titles, (10) many Today rows and unmeasured distant jumps, (11) 320px-equivalent width, (12) Dynamic Type, (13) dark mode at low brightness, (14) VoiceOver, (15) live Reduced Motion, and (16) native scrolling performance. Also check TalkBack and Android scroll recovery when available.

Remaining mockup differences are intentional: real Axis has its contextual ellipsis and FAB, real four-section scroll/disclosure hierarchy, localized full date, Tasks accent from v2 rather than copying mockup colors, restrained sans section headings and native tabs. Completed rows are grouped after pending work. Earlier is initially active when its header is the first visible section; the reference image’s selected Today is illustrative.

**Recommendation: yes, the important approved Tasks-main behaviors and hierarchy are now implemented closely enough to consider this design pass complete, subject to the focused native-device acceptance check above.** Do not expand this stage into another screen migration or broader redesign.

## Stage 14D.3 — Task Row Interaction + Disclosure Motion

### Scope and row interaction

This stage changes Tasks main only. The row body is now informational: title, metadata, recurrence, category, description and empty row area have no press handler, button role, edit hint or body press feedback. The outer row remains a static View. Its existing hierarchy, spacing, colors, completed treatment and typography are preserved.

Completion and overflow remain the two deliberate controls. The checkbox still completes/reopens the authoritative task or occurrence and updates Today progress. Overflow retains all existing actions, including Edit task / Edit recurring task, Save through the unchanged editor, Skip, History and confirmed Delete. No replacement Edit affordance was introduced. History retains its original body-to-editor behavior; other routes and editors were not migrated.

### Accessibility

The main row’s information is one accessible **text** group using the existing complete spoken description. It no longer claims to be a button or advertises an edit action. Text children do not gain duplicate explicit focus targets. The separately labelled checkbox and Actions control remain independently discoverable with their existing state and touch targets. Disclosure buttons continue announcing expanded/collapsed state and task counts.

### Animation approach and rationale

Earlier and Upcoming now schedule **one native `LayoutAnimation.configureNext` transaction immediately before their disclosure state update**. The shared `MotionTokens.expansion` duration is 220ms. Updated native layout uses ease-out, while inserted/removed views receive opacity fades. The existing Reanimated chevron rotates over the same duration. There are no springs, bounces, travel offsets or stagger delays.

This replaces the previous first-three-row `ContentInsertion` effect. The corresponding reveal-key state, timer and extra workspace projection were removed. New rows no longer start individual Reanimated entrances. Native mounted cells participate together in the same layout commit; the list’s following content can change position continuously during opening and closing.

The installed Reanimated infrastructure was inspected first. Applying per-cell Reanimated layout/enter/exit builders would add the independent row animations the brief excludes; wrapping every section’s data in a measured animated container would compromise the existing virtualized model. React Native’s built-in next-layout transaction handles native insertion/removal and positional updates across the existing mounted cells without either change. This is separate from the legacy JS Animated API, which was not introduced.

Implementation was checked against [React Native 0.86 LayoutAnimation documentation](https://reactnative.dev/docs/0.86/layoutanimation), the installed RN implementation and [Expo SDK 57 guidance](https://docs.expo.dev/versions/v57.0.0/). The installed Fabric path supports the transaction without the legacy Android `setLayoutAnimationEnabledExperimental` flag; that flag is a no-op in this New Architecture runtime, so no global enable call was added. Existing Reanimated completion, progress, press feedback and chevron code remains intact.

### Reduced Motion

The existing screen-owned live OS preference is reused. When Reduced Motion is enabled or still unresolved, disclosure state changes immediately without scheduling a native transaction; the existing chevron resolves immediately. Subsequent preference changes affect the next toggle without remounting or losing state. A native transaction already running when the preference changes may finish its short 220ms interval; no global animation-disable mechanism is installed.

### SectionList, navigation and scroll stability

Tasks remains one SectionList with the same item keys, sections, data, safe areas, virtualized cells, pinned navigation and visibility tracking. There is no nested full-height section ScrollView, duplicated collection, fixed row-height assumption, `getItemLayout` substitution or per-frame React state. Only explicit Earlier/Upcoming button taps request a transaction; initial mount, refresh, completion, progress changes and navigation taps do not request one.

Disclosure state updates immediately and remains authoritative; rendering is never delayed to wait for animation. The native list owns its layout and scroll bounds. Disclosure code issues no imperative scroll or offset-restoration commands, so it introduces no competing scroll correction. Stage 14D.2’s measured navigation retries remain unchanged and continue targeting headers after disclosure commits. Jumping to collapsed headers does not expand them.

Actual native viewport behavior when a large section collapses near the content’s lower bound still requires physical review. Static captures and a mocked scroll boundary cannot prove absence of native offset clamping or frame-level artifacts.

### Design-skill review

- **Impeccable:** used the initialized PRODUCT context, existing Visual Groundwork and Stage 14D record, Operate guidance and the craft floor. Removing the body press target aligns action affordances with deliberate controls. The transition is a disclosure state change, without row spectacle or a new visual treatment. A scoped detector returned `[]`. The batched actual-component static review found no layout/visual changes requiring correction: the light/dark 320px PNGs are byte-identical to the Stage 14D.2 fixtures. Those new checks remain in ignored `dist/stage14d3-previews/`; historical captures are unchanged.
- **UI/UX Pro Max:** applied the relevant mobile target guidance, live Reduced Motion, limited motion and shared timing recommendations. Edit remains discoverable through the labelled overflow as explicitly requested. No extra editor entry point or unrelated interaction was added.
- **Expo skills:** retained the existing SDK/runtime, source-owned state, virtualized SectionList and Reanimated controls. Chose a native next-commit transaction for layout continuity across virtualized cells rather than independent row animations or a custom all-rows height container. No dependency, native project, navigation or configuration change was needed.

### Tests and performance

Nine new mounted-screen/component regressions cover informational title/metadata/recurrence/category/empty-area behavior; static accessibility; overflow Edit/Save; independent one-time and recurring Complete/Reopen; unchanged History editing; Earlier/Upcoming open/close; live Reduced Motion; unchanged navigation and measured retries; and non-disclosure headers. Existing main-screen editor tests now enter through overflow; their editor/domain assertions remain.

Each 120-row disclosure was toggled open/closed repeatedly, with unique keys, unchanged source snapshots and stable SectionList identity. Every toggle measured **zero SQL statements**, **one native layout transaction**, and **one Reanimated timing call for the chevron**. There are no per-row entrance timing calls. Refresh does not replay disclosure motion. These are deterministic structural checks, not a native frame-rate benchmark.

### Files in this stage

Created:

- [Row/disclosure regression suite](../tests/task-row-disclosure.test.ts)

Modified:

- [Main task row](../src/features/tasks/components/task-list-row.tsx)
- [TaskRow adapter](../src/features/tasks/components/task-row.tsx), removing the obsolete reveal prop; legacy behavior is preserved
- [Section header](../src/features/tasks/components/task-section.tsx)
- [TasksScreen](../src/features/tasks/tasks-screen.tsx), removing the obsolete first-three-row reveal state/timer
- [v2 tests](../tests/design-system-v2.test.ts), [Tasks experience tests](../tests/tasks-experience.test.ts) and [workspace tests](../tests/task-workspace.test.ts)
- [Native test boundary](../tests/helpers/lifecycle-native.cjs) and [mount harness](../tests/helpers/refresh-lifecycle.ts)
- This append-only documentation record

No files removed. No schema, migrations, dependencies, persistence, business rules, History styling, section navigation, Today progress or other feature screens changed.

### Validation

| Check | Result |
|---|---|
| TypeScript | Passed |
| Focused Tasks/recurrence/History/navigation/v2/accessibility/Reduced Motion/read-performance | **171/171 passed** |
| Complete automated suite | **863/863 passed** |
| Repository-wide no-cache ESLint | Exact baseline match: **6 existing errors, 2 existing warnings; zero new findings**. Exit remains 1 for those existing findings. |
| iOS export | Passed: `dist/tasks-disclosure-ios` |
| Android export | Passed: `dist/tasks-disclosure-android` |
| `git diff --check` | Passed |

Tests use shell-local `TZ=America/Sao_Paulo` for existing local-date fixtures. Logs, lint comparison, scope hashes and exports remain under ignored `dist/`. No staging, commit or push was performed; earlier unfinished work remains preserved.

### Physical review and recommendation

**No physical-device testing was performed.** Before calling native motion acceptance complete, check: (1) accidental title/metadata/empty-area taps, (2) checkbox Complete/Reopen, (3) overflow → Edit and return, (4) Earlier opening, (5) Earlier closing, (6) Upcoming opening, (7) Upcoming closing, (8) long sections, (9) section-navigation jumps including unmeasured destinations, (10) scroll stability near the top and near the bottom while collapsing, (11) live Reduced Motion, (12) VoiceOver/TalkBack focus and labels, (13) iPhone scrolling performance, and (14) Android scrolling performance when available.

**Recommendation:** the requested implementation and automated coverage are complete. Tasks main is ready for the final focused device acceptance pass; mark its interaction/motion polish complete once that pass confirms native disclosure continuity and scroll stability. Static RN Web captures do not validate native LayoutAnimation frames.

## Stage 14D.4 — Visible Disclosure Motion Correction

### Physical acceptance failure and diagnosis

**Stage 14D.3 failed visual acceptance. On physical iPhone, only the chevron animation was perceptible.** The user observed instant content insertion/removal, without perceptible fade, opening/closing or following-content movement. The earlier code/API tests and static screenshots did not establish native visual success.

The old path was `TaskSectionHeader.onPress → LayoutAnimation.configureNext → parent disclosure state → taskWorkspaceSections.data → SectionList`. Expanded data was inserted or removed immediately. `VirtualizedSectionList` flattens those sections, and `VirtualizedList` may schedule later cell rendering through its batching path. The cells had ordinary native View roots without explicit Reanimated entering/exiting/layout transitions. The chevron alone had an independently driven Reanimated value.

**Confirmed architectural defect:** a broad “next layout” request was treated as if it guaranteed animation of independently scheduled virtualized content. There was no transition attached to that content’s native cell lifecycle. Virtualized batching/native transaction timing is the likely mechanism behind the observed failure. No native device trace was available to distinguish a missed cell commit from an Expo Go/Fabric transaction limitation; this record does not pretend either specific runtime mechanism was measured. The replacement removes the dependency on that global transaction.

### Motion design and architecture

The motion thesis is **one section unfolding from its own header**, with following sections making room. Opening uses a 260ms cubic ease-out; closing retracts geometry over the same shared interval with a shorter 200ms fade. Translation is restrained to 6pt on entry and 4pt on exit. Text is clipped/revealed at its natural scale, never scaled from zero. There is no index delay, spring, bounce, cascade, new color or visual redesign.

`TaskDisclosureCell` is a stable `CellRendererComponent` for Tasks main’s existing SectionList. It replaces the standard native cell root with `Animated.View`, attaches custom native Reanimated entering/exiting/layout worklets, and forwards RN’s measurement and focus callbacks. It does not wrap the entire section in a nonvirtualized container.

- **Opening content:** opacity starts at 0.15, visible height reveals toward the native target height, and position unfolds from the header boundary toward its native target. All participating cells share the same phase and finishing time.
- **Closing content:** opacity fades toward zero while native height and position retract toward the header boundary. Mounted following cells interpolate their native current-to-target position/height instead of relying on the failed global transaction.
- **Following content:** layout worklets participate after Earlier, or within Upcoming when Upcoming changes. The toggled header itself keeps its stable position. Unrelated changes outside a disclosure window resolve immediately.
- **Coordinates:** only the two disclosure header boundaries are recorded from their actual native cell `onLayout`. Native Reanimated values supply every row’s actual height and origin. No fixed row height, per-row measurement registry or total section-height calculation is introduced. If a header anchor is not available, the row safely uses its own native origin for the height/fade reveal.

The gesture is requested on tap, but its shared **260ms clock starts in the first eligible native transition callback**, when cells exist. It does not expire merely because the JS-to-native commit took more than 260ms. A 1s eligibility bound rejects abandoned pending gestures rather than replaying them on a much later scroll. Cells arriving later in the active native interval join its existing eased phase and remaining duration; they do not receive fresh delayed entrances. After it ends, ordinary virtualization/scroll mounting is immediate.

### Native compatibility and lifecycle

The implementation follows the installed Reanimated 4.5 custom-layout API and [official custom animation contract](https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/custom-animations/). Those APIs are native iOS/Android worklets; no web animation substitute was added.

The root uses `collapsable={false}` and does not override `nativeID`, addressing the New Architecture identity/flattening caveats documented for [entering/exiting animations](https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations/). Native clipping is disabled for this list so it cannot prematurely cut off an exiting/revealing mounted cell. **SectionList virtualization remains enabled**; only its existing render window is mounted. Collapsed task arrays remain empty and no hidden task collection is retained.

There are two shared values per workspace (gesture and header anchors), stable memoized cell transition functions, no per-row shared-value allocation for disclosure, no per-frame React state, no JS scroll listener driving motion, no animation timer driving product state, no extra SQL and no dependency/configuration change. The unsuccessful `LayoutAnimation.configureNext` configuration was removed.

### Rapid taps, Reduced Motion and navigation

Disclosure state remains authoritative and updates immediately for each toggle; one section never automatically changes the other. A new gesture replaces the previous gesture ID. Existing native timing curves resolve superseded properties to their endpoints, including fading outgoing native exits away during a rapid reopen. New worklets use the newest state/window. Tests verify state parity, unique logical IDs and curve invalidation; they do not prove that native interruption has no visible artifact.

The existing live Reduced Motion context removes entry/exit/layout props and invalidates the gesture. New toggles are immediate, and the chevron resolves without travel. In-flight custom timing curves see the changed gesture ID and resolve to their endpoints on their next native frame. `ReduceMotion.System` is also passed to timing animations.

Top navigation, disclosure persistence, active-section tracking, header targets, scroll retry logic and source ordering are unchanged. RN measurement callbacks are still forwarded. No imperative scroll/offset correction is added by disclosure. Native viewport clamping near the bottom and interruption while partially scrolled still require physical review; structural tests cannot prove their visual quality.

### Required skill reviews

- **Anthropic frontend-design (lead):** explicitly read and applied for this task. It materially contributed the header-owned spatial thesis, actual geometry reveal rather than decorative row entrances, shared phase instead of cascade, stronger low starting opacity for presence, restrained travel and a faster fade on exit. Review against the brief kept all existing Axis palette, typography, alignment and hierarchy; only content motion changed. This is choreography/code review, not a claim of observed native smoothness.
- **Impeccable:** applied initialized PRODUCT context, existing visual authority, Operate/animation guidance and the craft floor. Review identified the remaining risk of starting the animation window on the JS tap; the correction starts it at native transition execution instead. A scoped detector returned `[]`, which is advisory and explicitly **not evidence of native success**. No RN Web screenshots were used to accept this correction.
- **UI/UX Pro Max:** applied state clarity, limited purposeful motion and live Reduced Motion guidance. Expanded state remains available immediately, controls remain separate and accessible, and gesture timing does not gate product state or navigation.
- **Expo skills:** reviewed SDK 57 / RN 0.86 and the installed Reanimated/native CellRenderer implementation. Selected native cell lifecycle worklets, preserved measurement/focus forwarding, handled flattening/clipping, kept virtualized removal, and used native metrics rather than a pre-rendered height container. Exports validate worklet compilation/bundling, not on-device execution or perceived motion.

### Tests and scope

Added ten structural/behavioral regressions for native entry/exit/layout endpoints, shared finishing time, delayed cell registration, abandoned gesture expiry, dynamic heights, missing anchors, measured-header/focus forwarding, native root identity, rapid toggles in 180-item Earlier/Upcoming fixtures, collapsed unmounting, stable renderer/functions, and live Reduced Motion. Previous disclosure tests now check direct cell transitions and absence of the failed global transaction rather than accepting a `configureNext` call count as visual proof. Existing navigation, History, accessibility, Today progress, recurrence and data tests remain.

The mounted-screen harness models the public CellRenderer boundary so these checks exercise the actual production cell component. Reanimated and native layout remain test boundaries. Tests assert contracts and state; **no unit test is presented as proof of perceived animation quality**.

Created:

- [Native disclosure cell and worklets](../src/features/tasks/components/task-disclosure-motion.tsx)
- [Native disclosure structural regressions](../tests/task-disclosure-motion.test.ts)

Modified:

- [Workspace list](../src/features/tasks/components/task-workspace-list.tsx)
- [Section header](../src/features/tasks/components/task-section.tsx)
- [TasksScreen](../src/features/tasks/tasks-screen.tsx), supplying the gesture-start callback before the existing state update
- [Disclosure interaction regressions](../tests/task-row-disclosure.test.ts)
- [Native test boundary](../tests/helpers/lifecycle-native.cjs) and [mount harness](../tests/helpers/refresh-lifecycle.ts)
- This append-only record

No changes to row interaction, overflow Edit, task row styling, grouping, Today progress/ring/projection, FAB, tabs, History, recurrence, source reads/writes, schemas, migrations, dependencies or other feature screens. No staging, commit or push.

### Final validation

| Check | Result |
|---|---|
| TypeScript | Passed (`tsc --noEmit`) |
| Focused Tasks/motion/navigation/recurrence/History/accessibility/read-performance | **181/181 passed** |
| Full automated suite | **873/873 passed** |
| Repository-wide no-cache ESLint | Exact file/rule/severity/message baseline match: **6 existing errors / 2 existing warnings; zero new findings**. Existing findings retain exit 1. |
| iOS export | Passed: `dist/tasks-visible-disclosure-ios` |
| Android export | Passed: `dist/tasks-visible-disclosure-android` |
| `git diff --check` | Passed |

Tests use shell-local `TZ=America/Sao_Paulo` for existing local-date fixtures. The saved-start scope comparison confirms **359 pre-existing files unchanged**, including source data/hooks/grouping, row styling/interaction, progress/navigation controls, other features, database/migrations, package/lock files and existing capture assets. Seven pre-existing files changed and two files were created, as listed above. Logs, comparisons and exports remain under ignored `dist/stage14d4-*` / export directories. The working tree remains dirty with prior work preserved; no staging, commit or push.

### Physical acceptance checklist and recommendation

**Physical iPhone acceptance is still required. This correction is not declared visually successful.** Retest in Expo Go with Reduced Motion off:

1. Earlier opens with visible content reveal/fade and following Today movement, not just a rotating chevron.
2. Earlier closes with visible retraction/fade and following content movement.
3. Upcoming opens/closes near the screen’s lower edge without clipping or an unexpected viewport jump.
4. Large sections and large text preserve ownership, readable text and native scrolling performance.
5. Partially scrolled sections and navigation-jump → expansion remain coherent; collapsed/expanded header jumps and active tracking stay correct.
6. Rapid open/close/reopen and alternating section taps leave no ghost rows, stuck opacity, duplicate visible content or layout desync.
7. Ordinary scrolling, refresh/resume and completion do not replay the disclosure effect.
8. Live Reduced Motion finishes/removes motion, and VoiceOver/TalkBack retain meaningful expanded state and independent row controls.
9. Check Android native behavior/performance when available.

**Recommendation:** this architecture is more likely to produce genuinely visible native content motion because the worklets are bound to the actual native cell lifecycle, include explicit opacity/geometry targets, and start the shared clock when native transitions execute. That is an implementation rationale, not native visual acceptance. Final success depends on the iPhone checks above; static captures, API presence, passing tests and exports are insufficient.

## Stage 14D.5 — Disclosure Animation Isolation + Task Layout Stability

### Physical regression and verified code cause

The user confirms that 14D.4 disclosure motion is visible on physical iPhone, but reports that checking/reopening Today tasks causes incorrect positions and large blank vertical regions. The brief identifies a screenshot as the failure reference; this turn's attachment directory contains the text brief only, so no additional screenshot inspection or physical-device observation is claimed.

Code inspection confirmed excessive ownership: **every SectionList cell had an Animated.View root with a layout worklet**, including Today, To-do, headers, footers and the first completed row containing the Completed today label. The idle layout branch still supplied explicit height/originY targets. Earlier's active layout predicate also admitted following sections. Returning immediate targets from a worklet did not detach native layout-animation ownership. A second risk was deriving section ownership from a flat index against changing section lengths; an old cell index could be interpreted using a newer section shape. These code paths match the reported failure mechanism, although only device testing can establish the resulting native geometry visually.

### Scoped architecture and lifetime

- Workspace sections now expose key-only membership metadata before visibility slicing. Collapsed sections still have empty rendered data arrays. The ownership map uses the authoritative task/occurrence key, never a flat cell index; section boundary cells use their own section object and RN's header sentinel. Unknown ownership falls back to ordinary native layout.
- **Today and To-do always render plain native View cell roots.** Their rows, section boundaries, progress area and Completed today grouping receive no disclosure entering, exiting or layout props. Earlier/Upcoming headers are also ordinary native cells; only their existing chevron animates.
- A specialized animated root exists only for Earlier/Upcoming content/footer cells. Entry and layout props are installed only for the matching active disclosure. The exit handler must be registered before removal, so it remains on those disclosure content roots while idle; outside the matching close gesture it immediately hides removal without supplying geometry or timed animation.
- The original native-start clock, 260ms geometry/reveal, 200ms exit fade, shared eased phase, low initial opacity and restrained -6/-4 travel remain. Measured header anchors and actual native row metrics remain authoritative. Late virtual cells join the existing deadline rather than cascading.
- Native animation completion reports once through the installed Worklets `scheduleOnRN` bridge, clears active state and detaches entry/layout props. Gesture IDs reject superseded completions. A bounded 1,260ms fallback covers empty/offscreen/abandoned gestures (the existing 1s start eligibility plus 260ms duration). Replacement, Reduced Motion and unmount invalidate prior gestures and clean up timers. No React state updates occur per frame.
- Before a checkbox completion/reopen or another row action changes authoritative data, TasksScreen invokes the list's presentation-only cancellation handle. Superseded timing curves resolve to endpoints. Product mutations, progress/ring feedback and grouping rules are unchanged.

### Following-content tradeoff

**Following Today/To-do sections now reposition through ordinary native SectionList layout rather than disclosure gliding.** Preserving the old glide would reattach the geometry hooks this stage explicitly forbids on ordinary cells. The reveal/fade/retraction stays inside the active disclosure. Stability takes priority; no manual offsets, spacer heights or parent-wide layout animation simulate following movement. This is an intentional limitation relative to 14D.4's broader choreography, requiring physical continuity review.

### Keys, grouping, virtualization and navigation

Persistent IDs and keyExtractor behavior are unchanged. A Today item uses the same key and native cell when moving between pending and completed. Completed today remains content within the first completed row, rather than a second render model or reserved-height synthetic cell. Its appearance/disappearance uses ordinary layout.

SectionList remains the only task viewport. No ScrollView replacement, fixed heights, negative margins, enlarged render window, hidden mounted collection or per-row measurement registry was added. Clipping is disabled **only while a disclosure gesture is active** to protect native exits; default clipping is restored at completion/cancellation/fallback. No permanent list-wide clipping override remains.

Section navigation retains existing targets, stable viewability callbacks, measured retries and collapsed targeting. Disclosure and completion introduce no imperative scroll-position changes. Native viewport clamping, partially visible cells and contiguity still require iPhone review.

### Required skill findings

- **frontend-design:** preserve the established reveal/fade and hierarchy; immediate authoritative Today reposition is appropriate for this regression. Following-section glide was deliberately sacrificed to strict ownership.
- **Initialized Impeccable:** reviewed Operate continuity, animation scope and craft-floor constraints. A scoped detector returned `[]`; this is advisory, not a native layout test. Existing visual identity and spacing remain intact.
- **UI/UX Pro Max:** applied predictable completion feedback, spatial stability, limited purposeful motion and live Reduced Motion guidance. Expanded state and progress remain source-driven.
- **Expo skills:** reviewed Expo 57, RN 0.86 SectionList/VirtualizedList cell identity and measurement/focus contracts, Reanimated custom-layout lifecycle and Worklets completion scheduling. Kept plain ordinary cell roots, narrowly registered transitions and bounded clipping. Exports verify compilation, not physical behavior. References: [custom animations](https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/custom-animations/), [scheduleOnRN](https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnRN/), [SectionList](https://reactnative.dev/docs/0.86/sectionlist).

### Regression coverage and validation

Added twelve tests covering ownership despite stale indices, collapsed membership, defensive geometry no-ops, ordinary cell props during both gestures, stable one-time/recurring identity, first/last completed grouping, rapid A/B/C completion/reopen, cancellation during each disclosure, native open/close completion and stale callbacks, fallback/unmount cleanup, a mixed 174-item fixture, navigation retries after mutations, refresh-failure draft preservation and live Reduced Motion. Existing motion regressions now explicitly reject Today geometry transitions while verifying active disclosure interpolation. The native thread bridge is the only new test boundary; production state, screens and SQLite access remain real.

The fixture asserts unique rendered models, stable keys/cells, correct ordering/progress and no extra disclosure SQL. **It does not assert pixel gaps or simulate native virtualization geometry.** Key ownership costs one in-memory map over the existing workspace projection, with two shared values per list and one lifecycle timeout. No additional source read, query or cache is introduced.

| Check | Result |
|---|---|
| TypeScript | Passed |
| Focused Tasks/motion/navigation/progress/accessibility/read-performance tests | **193/193 passed** |
| Full automated suite | **885/885 passed** |
| Repository-wide no-cache ESLint | Exact baseline comparison: **6 existing errors / 2 warnings; zero new findings** |
| iOS export | Passed: `dist/tasks-isolated-disclosure-ios` |
| Android export | Passed: `dist/tasks-isolated-disclosure-android` |
| `git diff --check` | Passed |

Changed: workspace membership projection, disclosure controller/cells, workspace list, TasksScreen cancellation wiring, prior disclosure regression, two native resolver helpers and this append-only document. Created: `tests/task-disclosure-isolation.test.ts` and `tests/helpers/native-worklets.cjs`. No dependencies, schema, migrations, persistence/domain rules, row styling, section spacing or other feature screens changed. Existing dirty work is preserved; nothing staged, committed or pushed.

The saved-start SHA-256 scope comparison confirms **360 pre-existing files unchanged**, eight pre-existing files modified and the two new test/helper files above. Baselines, logs and exports are under ignored `dist`; the pre-existing dirty tree remains intact.

### Mandatory native acceptance

Retest on physical iPhone in Expo Go:

1. With Today visible, complete/reopen several one-time and recurring tasks rapidly. Verify each appears once, progress stays correct, Completed today disappears after its last reopen and no blank regions remain.
2. Repeat during Earlier opening/closing and Upcoming opening/closing, including rapid alternating gestures. Check reveal/fade/retraction, chevron, stale opacity and ordinary following-section reposition.
3. Use many Earlier/Upcoming rows, pending/completed Today rows and To-do rows. Scroll slightly after mutations and repeat near top/middle/bottom; check contiguity and viewport stability.
4. Jump to all four sections before/after mutations, including collapsed targets and unmeasured long-list retries.
5. Repeat with large accessibility text and live Reduced Motion; confirm progress, expanded state and independent checkbox/overflow controls. Check Android native clipping when available.

**Recommendation:** disclosure ownership is now structurally isolated so Today completion/reopen has no disclosure layout animation capable of retaining its height or origin. Both ordinary cell roots and defensive worklets enforce this boundary. Physical iPhone acceptance remains mandatory before claiming that the reported blank-space regression is visually resolved; automated tests and exports cannot establish that result.

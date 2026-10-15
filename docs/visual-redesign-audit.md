# Axis Stage 14A — Visual audit and design direction exploration

Date: 14 October 2026. Status: proposal for review; no direction is approved or implemented. Calm Utility remains the implemented design system.

## 1. Executive summary

Axis has a mature interaction structure but a weak visual hierarchy between conceptual groups. The main opportunity is to make sections and objects perceptually distinct before the user reads their headings. Tasks needs meaningful section regions; Fitness needs exercise boundaries that contain targets, sets and local actions. Bigger cards around every row would undermine the useful density already achieved.

Explore three systems: **Folio**, a warm editorial life ledger; **Hearth**, a tactile personal command center; and **Daylight**, a soft native system of connected regions. Recommend **Hearth**. It best matches cozy, personal and reassuring while accommodating precise Finance, energetic Fitness and quiet Journal. Keep the existing native bottom navigation and established product architecture.

### Method and evidence

- Inspected the current working tree, including uncommitted Stage 13L Journal work, rather than treating HEAD as the current product.
- Applied Impeccable's native audit guidance to composition, hierarchy and craft; UI/UX Pro Max to interaction/accessibility; and the installed Expo building-native-ui guidance to native feasibility. UI/UX Pro Max's generic design-system searches returned landing-page and green/teal suggestions unsuitable for this brief; those were rejected. Relevant native guidance and typography references informed the proposals.
- Reviewed the three screenshots subsequently supplied in chat: the desktop inspiration application, the cropped Axis Tasks view and the Axis Fitness view. They provide visual evidence, not device interaction testing.
- Generated supplementary React Native Web component galleries from unchanged source at 320 and 390 logical-pixel widths, using temporary seeded fixtures. Reviewed light and dark versions of Tasks and Fitness, Home and Finance, plus existing Calendar and Stage 13L Journal captures. These are component evidence, not native screen renders. Reconstructed Task headers do not reproduce disclosure defaults; galleries omit some shell elements. The previous Calendar capture only partially represents the latest month-trigger treatment.
- Checked the installed versions and primary documentation for fonts, shadows, motion and optional native effects. No font, package or production asset was added.

The supplied Tasks crop excludes the header, FAB and bottom bar, and cuts off Upcoming's contents. The Fitness screenshot shows wrapped internal navigation, an empty-set exercise and the sticky Finish action above native tabs. Its blue floating gear has no matching control in the inspected Fitness screen; its ownership is unverified and it is excluded from the app styling diagnosis. Screenshot pixels do not establish logical touch sizes or accessibility font settings.

The inspiration's useful qualities are bounded modules, a clear section-to-module hierarchy, restrained colored symbols, readable dark surfaces and typographic contrast. Its desktop sidebar, weekly practice strip, draggable-looking cards, asymmetrical dashboard arrangement and branding do not belong in Axis's settled phone architecture. None of the directions copies them.

## 2. Current visual diagnosis

The problem is the distribution of emphasis. Headings, rows and controls are readable individually, yet too many share the canvas. Borders communicate nearly every boundary. Surfaces exist in the tokens and some controls, but are not consistently assigned to the conceptual parent that owns content.

| Finding | Priority | Actual evidence | Consequence / future response |
| --- | --- | --- | --- |
| V01: Task sections share one plane | High | `tasks/tasks-screen.tsx` section headers/disclosures; `tasks/components/task-row.tsx` row bottom borders; supplied Tasks image | Today and To-do need distinct regions; Earlier/Upcoming need contained disclosures. |
| V02: Fitness child surfaces outrank parent grouping | High | `fitness/components/workout-content.tsx`: exercise top border, surfaced set rows; supplied Fitness image | One exercise should own its targets, set table and actions, including when it has no sets. |
| V03: Green permeates brand and neutral layers | High | `constants/theme.ts` background, surface, selection and accent palette | Replace the brand direction; keep financial success semantics. |
| V04: Little authored motion grammar | Medium | Shared controls use pressed opacity; sheets use native Modal fade; no application Reanimated usage found | Introduce bounded feedback and expansion timing, with a system reduced-motion policy. |
| V05: Different objects share shape and treatment | Medium | Radius 8 for both controls and surfaces; repeated bordered buttons and flat rows | Distinguish section, control, inset and overlay shapes. |
| V06: Internal navigation lacks one visual grammar | Medium | Finance compact nonwrapping strip; Fitness wrapping navigation buttons with checks | Preserve overflow behavior; share indicator and label treatment. |
| V07: Home modules have nearly identical emphasis | Medium | `home/components/home-content.tsx`: four outlined boxes, uniform minimum height | Keep the compact grid; differentiate content emphasis and selected attachment. |
| V08: Native accessibility geometry needs explicit verification | Gate for implementation | Shared 44-unit touch minimum; Calendar seven columns within gutters | Test Android 48dp and narrow Calendar targets before approving new geometry. |

These are visual findings, not new domain bugs or a measured usability score.

## 3. What works today

The native five-destination bottom bar is clear and successful, including in the supplied Fitness screenshot. Home's compact summary and optional detail, Tasks' four sections, Calendar's month-to-agenda model, Finance's four views, inline active-workout logging and Journal's writing-first layout should survive.

Shared selectors already anchor to their triggers; category creation, menu dismissal, keyboard-aware sheets, back arrows, explicit persistence actions, soft-delete labels and source-owned state are valuable foundations. Tabular Finance numbers and meaningful status words are established. Task SectionList virtualization and bounded History/source reads are architectural assets.

## 4. What makes Axis feel basic

The supplied Tasks view makes the issue especially clear: a long rule separates Earlier from Today, another rule separates each task, and another separates To-do from Upcoming. The difference between a section boundary and a row boundary is weak. Fitness repeats the same treatment for exercises, while workout and exercise note/action buttons look similar and float between headings.

Sameness also comes from system type with little expressive emphasis, broadly green neutrals, identical radii, immediate pressed opacity and many generic secondary controls. The solution should introduce a hierarchy of regions, restrained feature character and coherent feedback. It should retain compact rows and recognizable actions.

## 5. User taste and product personality

Interpret cozy as warm neutrals, legible dark layers and comfortable contact surfaces. Interpret personal as feature-appropriate composition and language. Interpret supportive as understandable state, recoverable errors and a clear next action. Interpret tactile as immediate pressed feedback, meaningful boundaries and short physical transitions.

Keep density useful: ordinary text near the existing 16-point body and 14-point metadata baseline, modest group padding, stable controls and no oversized dashboard hero. Do not introduce streak pressure, mascots, coaching, paper textures, decorative handwriting or pretend financial charts. Warmth should come from the system and truthful feedback.

## 6. Current design-system audit

The central sources are [theme tokens](../src/constants/theme.ts), [ThemedText](../src/components/themed-text.tsx), [ThemedView](../src/components/themed-view.tsx), [control appearance](../src/components/control-appearance.ts), [form controls](../src/components/form-controls.tsx), [AdaptiveSheet](../src/components/adaptive-sheet.tsx), [selection host](../src/components/form-selection-host.tsx) and [ContextMenu](../src/components/context-menu.tsx).

Semantic colors and type roles are sound architecture. Legacy spacing aliases and text types coexist with newer roles; some legacy text remains heavier than equivalent new text. Existing radius roles are small 4, control/surface 8 and overlay 12. The visual differences between those hierarchies are modest. Touch minimum is 44; fields start at 48 and grow with content.

### Controls, fields and overlays

| Layer | Current assessment | Proposed refinement; existing behavior retained |
| --- | --- | --- |
| Primary / secondary buttons | Clear variants; many secondary buttons inherit one outlined form appearance | One principal action per local context; tonal secondary, quiet note links, stable dimensions across states. |
| Destructive / icon actions | Explicit labels and contextual routing exist | Danger text plus words; icon-only only for conventional actions with an accessible name; no red surface across ordinary menus. |
| FAB | Tasks' add action has a dedicated position and clearance | Keep placement, hit area and function; evolve shape/tint/pressed response. |
| Single-line inputs | Shared zero vertical padding/native centering fix is deliberate | Preserve native text metrics, minimum height and value-independent geometry when changing fonts. |
| Multiline inputs | Top aligned, paragraph line height and separate padding | Preserve multiline behavior; give Journal a writing plane without changing its input lifecycle. |
| SelectField / AutocompleteField | Shared measured overlay, selected state, search and create flows | New surfaces and feedback only; no inline lists or category-domain merging. |
| Segmented controls | Small important choices remain visible | Measured selected segment; wrapping/growth where necessary; retain type/category side effects. |
| Date/time / schedule controls | Specialized flows and native pickers | Palette/type alignment; retain specialized editing and OS behavior. |
| Validation / read-only / disabled | Errors have alert semantics; authoritative locked values differ from unavailable controls | Keep readable text and explicit labels; add no opacity-only disabling or ambiguous status color. |
| AdaptiveModal / AdaptiveSheet | Scrim, measured viewport, keyboard and fixed-header behavior already shared | More legible overlay tier, hierarchy-specific radius and bounded entry/exit; keep Back arrows and explicit Save/Cancel. |
| Menus | Anchored measured host, outside dismissal, screen bounds and focus return | Compact opaque raised region, subtle shadow, trigger-origin presentation; retain option/action semantics. |

The menu host currently has Android elevation 4 but no corresponding authored iOS shadow style. This merits a future platform-aware overlay treatment; it is not evidence that menus are unusable. Sheet Modal fade exists, but there is no separate authored sheet-rise choreography.

### Empty states and feedback

Work already offers useful guidance: no work yet, add work, record payments when money arrives. Tasks and Fitness History often stop at a neutral absence statement. Home's “Nothing needs attention” is reassuring and should remain factual. Journal recovered-draft and stale-conflict messages are useful safety information, not chrome to hide for minimalism.

Future copy can add a short existing next action: “No tasks for today. Use + to add one.” or “No completed workouts yet. Finished workouts appear here.” Keep empty states at normal content scale, without a large illustration or unsupported motivational claim. Do not redefine “No workout today,” unresolved commitments or unsaved writing to make the UI feel positive.

Success feedback should follow persistence: a saved label, completed checkbox or workout confirmation, with at most one small motion or optional haptic. Errors need readable text and Retry while retaining last known good content. Destructive confirmations must remain explicit. Recovered writing must stay distinguishable from saved writing, and conflict resolution must remain available.

## 7. Surface and container audit

Adopt a six-part grammar: canvas, contained region, raised region, inset data area, plain row and selected state. Overlay is a dedicated raised tier with its own scrim. Give a boundary to a meaningful group with children or distinct interaction ownership. Use spacing for adjacent labels or simple prose. Use a divider within a dense ledger when scan alignment benefits; a divider should not be the only cue distinguishing conceptual sections.

Limit normal nesting to **one closed group plus one inset data region**. The workout itself can occupy the canvas; each exercise is a contained group; its sets are one inset table. Do not add a closed workout card around closed exercise cards around individual set cards. Keep rows plain inside Task and transaction groups. Home's existing summary grid is an intentional exception of separate small interactive modules.

Remove Task inter-section rules once group surfaces exist. Remove Fitness exercise top rules once exercises are contained. Replace Home's expanded-detail top rule with one attached detail region. Keep inset row separators only where needed for ledger/table scanning. Control focus and essential boundaries still need visible, tested contrast. Tonal surfaces alone are insufficient if too similar; shape extent, header placement and spacing also carry grouping.

Implementation must preserve Tasks' SectionList. A future section surface can be composed from header/visible rows/footer with continuous background and corner treatment, rather than rendering an entire unbounded section inside one nonvirtualized item.

## 8. Typography audit

Current roles are screen title 32/40, section 20/28, object/body 16/24, metadata 14/20 and metric 28/36. They support readability, but express little personality. Defined system serif/rounded mappings are not a consistently applied app font strategy. Legacy defaults at weight 500 and small-bold at 700 create drift relative to newer 400/600 roles.

Keep a restrained hierarchy: screen title, section title, object name, exact metric, body, metadata, label/action. Finance amounts retain tabular numerals and complete currency; avoid abbreviating real financial values. Use weight and aligned baselines before adding size. Avoid uppercase micro-labels and arbitrary letter spacing as the main hierarchy tool. Line heights and native font metrics must be tested, particularly accented names and single-line inputs.

Folio proposes Lora for limited editorial headings with Source Sans 3 for working text; Hearth proposes one Manrope family; Daylight keeps platform system fonts. New fonts are proposals only. Lora, Manrope and Source Sans are available under OFL licenses; bundle the applicable license if later used. [Lora license](https://github.com/google/fonts/blob/main/ofl/lora/OFL.txt), [Manrope license](https://github.com/google/fonts/blob/main/ofl/manrope/OFL.txt), [Source Sans license](https://github.com/adobe-fonts/source-sans/blob/release/LICENSE.md).

Existing expo-font supports runtime loading in Expo Go; embedding through its config plugin is a build-time alternative. Resolve real family metadata and Android names explicitly; use system fallback on loading failure rather than leaving the app blocked. Target at most three initial font files for Folio and two for Hearth, then measure actual asset bytes and cold start. No file-size savings or glyph coverage is claimed before selecting assets. [Expo SDK 57 Font](https://docs.expo.dev/versions/v57.0.0/sdk/font/).

## 9. Color audit

Current light background is #FAFAF9 with green-gray surfaces; dark background is #121615 with #1D2421 surface. Brand accent is #28634F light and #9DCAB6 dark. The hue spreads through neutral planes and selection, so changing a single accent token would leave much of the identity green.

Separate brand action/selection, neutral depth, feature hints and semantic outcome colors. Green can still mean financial positive/success. Warning and danger remain understandable words plus color. Feature accents never redefine overdue, negative money, invalid fields or archived labels. Avoid saturated full-screen feature backgrounds.

Candidate palettes and measured opaque contrast are provided in sections 21–23. These are exploration seeds, not replacements for current tested tokens.

## 10. Navigation audit

Keep [AppTabs](../src/components/app-tabs.tsx): native five tabs, labels, platform icon mappings, state and insets. Its selected Fitness pill is visibly successful in the supplied image. Evolve tint and label weights only where the native API supports them. Do not create a custom floating bar to imitate its current platform appearance.

[FinanceScreen](../src/features/finance/finance-screen.tsx) has a nonwrapping horizontally scrolling compact internal strip. [FitnessScreen](../src/features/fitness/fitness-screen.tsx) uses wrapping navigation buttons with a selected checkmark. The supplied image shows History on its own second line. Keep supported overflow and per-view scroll restoration. Refine a common indicator/label grammar, without forcing four options into fixed quarters.

A moving indicator must measure the selected label's actual bounds and account for scroll offset or wrapped rows. At large text, a static selected background/underline is preferable to a misleading glide across multiple lines. Selection stays exposed to accessibility even if a redundant visual checkmark is removed later. Back arrows, native swipe/back and explicit persistence remain unchanged.

## 11. Motion audit

There is existing native route/tab behavior and Modal fade. Authored press/selection/expansion motion is limited; the source review found no current application Reanimated usage despite the dependency being installed. Introduce a small shared language, not animations on every refresh.

Suggested Hearth timing: press 90–130ms, state change 160–200ms, contextual expansion 220–260ms; routes remain OS-owned. Use quick ease-out or a short critically damped settle, without elastic bounce. Press scale around 0.985 is optional, with unchanged hit bounds. Animate the one changed region; retain stable IDs and avoid a waterfall of row entrances or value count-ups that briefly show incorrect money.

Reduce Motion should remove translation, scale and springs, using immediate state or a short opacity change of at most about 100ms. Reanimated's system policy is suitable; never force animations on. Its installed useReducedMotion hook captures the initial value, so a live OS-setting change needs appropriate subscription/policy verification. [ReducedMotionConfig](https://docs.swmansion.com/react-native-reanimated/docs/device/ReducedMotionConfig/).

Menus can appear from the measured trigger with a small fade/translation. Sheets can move from their actual anchor while retaining keyboard/focus measurements. Journal save uses one brief confirmation; typing, draft autosave, long history loads and background refreshes remain still. Transform/opacity animations should run on the UI thread; bounded layout transitions need separate profiling. [Reanimated performance guidance](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/).

Optional haptics later: successful explicit Save, committed Task completion, logged set or finished workout. Light segmented selection is discretionary; avoid duplicating OS picker feedback. Opening a menu, every collapse, every typed character and draft persistence need no haptic. Destructive confirmation may use one restrained warning without surprise vibration. Haptics cannot be the only feedback and may be unavailable due to system conditions. expo-haptics is not installed or added. [Expo SDK 57 Haptics](https://docs.expo.dev/versions/v57.0.0/sdk/haptics/).

## 12. Iconography audit

Keep native SF Symbols / Material mappings in the bottom bar. In body controls, text glyphs such as task circles/checkmarks, chevrons and ellipses depend on font shape and metrics. A future small normalized icon vocabulary should make checkbox/disclosure/menu geometry consistent, using installed platform capabilities or simple validated vector assets. Do not put a symbol before every sentence.

Use approximately 20–24-unit action icons inside full touch targets; smaller 16–18-unit source/recurrence symbols only when accompanied by meaningful text. Match apparent weight rather than demanding identical iOS/Android outlines. Selection includes text/state or a check; priority, recurrence, category, History and source indicators retain readable names. Text is preferable for Pay, Finish Workout, Save and nonobvious actions. Calendar source glyphs/colors must remain recognizable across Calendar and Home.

Avoid a new large icon library or decorative illustrations. Native SVG support still warrants decoder testing; do not import intricate web artwork without checking it. [Expo SDK 57 Image](https://docs.expo.dev/versions/v57.0.0/sdk/image/).

## 13. Dark and light mode audit

The supplied dark screenshots confirm a continuous very dark green-gray canvas with thin lighter rules. Current contained surface/canvas luminance ratio is about 1.15:1 dark and 1.07:1 light. Those ratios diagnose subtle layering; they are not themselves text-contrast failures. Flat composition is the larger problem.

Design dark first alongside light. Dark raised surfaces need clear extent and a slightly brighter tone, not reliance on black shadows. Light uses warm canvas and cleaner contained surfaces with restrained shadow only at meaningful raised layers. Avoid merely inverting colors or adding a gray outline to every object.

Candidate text pairs were calculated using sRGB relative luminance. Minimum body and metadata ratios across each palette's four opaque planes, plus filled CTA contrast:

| Palette | Body minimum | Metadata minimum | CTA | Contained / canvas |
| --- | ---: | ---: | ---: | ---: |
| Folio light | 10.12:1 | 4.87:1 | 7.62:1 | 1.18:1 |
| Folio dark | 9.62:1 | 5.56:1 | 8.25:1 | 1.24:1 |
| Hearth light | 11.27:1 | 5.13:1 | 6.74:1 | 1.16:1 |
| Hearth dark | 10.31:1 | 6.26:1 | 8.18:1 | 1.23:1 |
| Daylight light | 10.05:1 | 4.53:1 | 6.93:1 | 1.15:1 |
| Daylight dark | 8.68:1 | 5.38:1 | 8.25:1 | 1.35:1 |

These calculations cover proposed opaque pairs, not a finished accessibility certification. Feature tints, focus outlines, status colors, overlays, native bars and disabled states still require testing. All proposed primary-on-selected pairs also exceed 4.5:1. Surface separation must be judged in actual composition, not by increasing every background ratio until the app becomes striped.

## 14. Home audit

[HomeContent](../src/features/home/components/home-content.tsx) already implements the desired Spent today line, Today/Needs attention/Fitness/Journal grid and one expanded detail. Four modules have uniform outlined boxes, minimum height 116, radius 8 and border width 2; expanded content returns to top/bottom rules.

Keep arrangement, responsive one-column fallback and preview counts. Give Today count-led order, Needs attention conditional semantic emphasis, Fitness next/active workout identity and Journal a quiet saved/not-written state. The selected tile should feel attached to the detail tray below the grid. Spent today stays a compact amount plus separate add action, with no pretend chart or additional metric cards. No greeting, streak or dashboard bloat is needed.

## 15. Tasks audit

[TasksScreen](../src/features/tasks/tasks-screen.tsx) and [TaskRow](../src/features/tasks/components/task-row.tsx) explain the supplied image directly: disclosures use a bottom border, task rows use a bottom border, and Today/To-do are headings on the same background. Task titles and recurrence text are useful and must remain visible.

Earlier stays a compact disclosure with its true count. Today becomes the strongest region, containing its date and compact rows. To-do becomes a quieter working list. Upcoming stays a disclosure with the existing next-occurrence filtering and Calendar action. Each direction below changes this grouping differently. Preserve checkbox and row-edit tap separation, contextual overflow, FAB clearance, default expansion and missed/history semantics. No per-task large card and no giant chronological feed.

## 16. Calendar audit

[MonthGrid](../src/features/calendar/components/month-grid.tsx) and [DayAgenda](../src/features/calendar/components/day-agenda.tsx) have a good temporal sequence. Selected date already has more than a color cue; Today is independently indicated. Month/year remains tappable. Dots and the legend avoid numeric badge clutter.

Evolve selected-cell shape, quieter marker alignment and one agenda region below an unboxed grid. Keep all source semantics and visible-range behavior. Do not box each date. At 320 logical units with 16-unit side gutters, seven columns have approximately 41.1 units each; a 44-unit height does not solve the width or Android 48dp issue. This is a source-derived geometry risk, not a device measurement. Prototype full available width and an equivalent accessible date-selection path when seven independent minimum targets cannot fit. Overlapping hit slop is not a sufficient answer.

## 17. Finance audit

[FinanceDashboard](../src/features/finance/components/finance-dashboard.tsx) has useful Net Flow emphasis and real spending bars. Surrounding sections sit on an open plane. Income/Expenses can support one coherent statement region rather than a bank-style grid of large metric cards. Keep exact amounts, existing period controls and real-data bars.

[TransactionRow](../src/features/finance/components/transaction-row.tsx) is a compact plain ledger row; give date groups a quiet shared region where useful, preserve signed amount and historical category names, and keep linked rows read-only. [CommitmentsView](../src/features/finance/commitments/components/commitments-view.tsx) needs clear obligation ownership and readable status, with existing Pay and contextual actions. Old unresolved obligations must never be visually demoted into hidden History.

[WorkRow](../src/features/finance/work/components/work-row.tsx) correctly leads with the Job and Client context. Containment and amount alignment can reduce reading effort, especially for partial-payment strings, without truncating real financial values or promoting Clients over Jobs. Status chips are optional compact text containers for genuinely distinct state, not badges around every metadata item. Color never substitutes for Paid/Skip/Overdue/Outstanding wording.

## 18. Fitness audit

The supplied Fitness image shows the hierarchy most clearly before any set is logged: workout title/status, note/actions, rule, exercise title/target, more note/actions, progress and Add set. Parent-child ownership is communicated largely by proximity. History wraps to a second navigation line; that is legitimate overflow, but the selected Workout button looks heavier than the content grouping.

[WorkoutContent](../src/features/fitness/components/workout-content.tsx) already gives logged sets a background, while exercises receive only a top rule. Contain an exercise even when empty. Keep its name and targets together, sets in a shared inset region and exercise actions inside its boundary. Workout note/actions belong to the outer header. Finish remains fixed above the native tab bar; Add set remains a useful local action. No new inline editing, set states, progression or workout behaviors are proposed.

[ManagementContent](../src/features/fitness/components/management-content.tsx), routines, rotation and History need smaller grouped regions and stronger section ownership. History remains summary-first; detail loading stays targeted. Energy comes from a clearer tactile logger and bounded set insertion, not animated rings, trophies or sport branding.

## 19. Journal audit

The current uncommitted Stage 13L [JournalScreen](../src/features/journal/journal-screen.tsx), [JournalEditor](../src/features/journal/components/journal-editor.tsx) and [JournalHistory](../src/features/journal/components/journal-history.tsx) are already writing-first: date, optional mood, editor, explicit Save and quiet context/history. Preserve this relative quietness.

The large shared field can become a softer writing plane with minimal surrounding chrome. Mood options should feel like optional small choices, with large-text wrapping, not a second dashboard. History previews and month grouping remain compact. Retain recovered drafts, conflicts, leave protection, selected-day behavior and read-only context. No lined paper, rich text, coaching prompt or automatic Save semantics.

## 20. Keep / evolve / replace

| Keep | Evolve | Replace substantially in a future approved stage |
| --- | --- | --- |
| Native bottom navigation and five destinations | Native tint/state alignment | Green-heavy brand expression |
| Established screen IA and routes | Internal navigation's indicator grammar | Task section visual boundaries |
| Shared anchored selector/menu behavior | Menu surface, shadow and origin motion | Fitness exercise grouping |
| Shared keyboard/sheet geometry and Back arrows | Overlay shape, scrim and entry/exit | Same-radius surface/control hierarchy |
| Exact money, authoritative data and mutations | Typography family/weights and readable metrics | Divider-first section composition |
| Input baseline fixes and multiline behavior | Field/segmented/button visuals | Lack of a shared authored-motion policy |
| Source-owned reads, paging and virtualization | Empty/feedback copy, icon consistency | Font-dependent body-control glyph geometry where needed |

## 21. Direction A — Folio

**Philosophy:** a warm editorial life ledger. Typography and chapter-like regions supply personality; compact working rows remain practical. Sophisticated and reflective, with less physical emphasis than Hearth.

### Palette, type and materials

| Role | Light | Dark |
| --- | --- | --- |
| Canvas | #F0E6D7 | #211C19 |
| Contained | #FFF9EE | #362C25 |
| Raised | #FFFFFF | #493A30 |
| Inset | #E4D7C4 | #2A231D |
| Text / metadata | #2F2924 / #64584C | #F8F0E4 / #C6B7A8 |
| Primary / on-primary | #783F51 / #FFF9EE | #DEACB8 / #2A1D21 |
| Selected | #EADCE0 | #493239 |

Lora 500 for screen/date editorial moments; Source Sans 3 400/600 for body, objects, actions and amounts. Keep body 16, metadata 14 and tabular finance metrics. No serif form inputs or tiny italic metadata. Light feels like warm paper without a texture; dark uses brown ink/paper layers with cream text and pale wine accents.

Use slim paper regions with 8–10 radius, 4 inset, 8 controls and 16 sheets. Retain 16 outer gutters and approximately 12 group padding; create rhythm between chapters rather than expanding every row. Flat contained surfaces, tonal insets and restrained overlay shadows supply depth. Native tabs remain; internal navigation uses a typographic underline with measured movement. Icons are spare, consistent line symbols; text does most of the work.

### Axis screen examples

- **Home:** the same 2×2 summary grid becomes a compact index of four paper panels. Counts anchor Today/Attention; Fitness shows the real next/active identity; Journal stays quiet. Selected detail is an attached page below; Spent today stays a ledger line.
- **Tasks:** Earlier is an inset summary strip; Today is a prominent paper chapter containing date and plain rows; To-do is a quieter shared page; Upcoming is a compact fold-like disclosure region. Tone and header placement replace inter-section rules. No per-task card.
- **Finance:** one statement-like Net Flow region, aligned Income/Expenses, then compact date-led ledger groups. Category bars remain real data. Typeface/numeric alignment gives precision without an analytical dashboard aesthetic.
- **Fitness:** workout header stays on the canvas. Each exercise is a paper group with targets at the top, a plain inset set table and local actions at the bottom. Empty exercises keep that boundary. Finish remains fixed; there is no closed outer workout card.
- **Journal:** one generous writing plane and an editorial date; no decorative page lines. Mood and saved state are small supporting text/controls. This is the quietest expression of Folio.
- **Calendar:** open month grid above one agenda page. The month/date typography provides orientation; selected date and source markers keep their existing meanings.

Identity comes from composition: Tasks ordered chapters, Calendar dates, Finance aligned statements, Fitness working pages, Journal reading/writing rhythm. Shared type, spacing, paper tones, controls and icons bind the app. This uses Axis's existing phone architecture; it does not reproduce the reference's sidebar, dashboard modules, practice strip or typography.

### Four motion examples

1. Home detail expands in about 200–220ms with a small fade and 4-unit translation: reveals attachment to its summary.
2. Task completion changes the checkbox promptly, then a short 160–180ms committed-state fade: clear outcome without a dramatic exit.
3. Exercise set insertion settles within its existing table in about 180–220ms: shows where the new row belongs.
4. Internal indicator slides under the measured label in about 180ms: tracks location without moving all content.

Use controlled ease-out, no bounce; native routes stay native. Reduced Motion removes translation/layout choreography. No animation while writing or on background refresh.

**Effects budget:** shadows restrained (overlays); blur none; gradients none; colored surfaces restrained; animation restrained; haptics restrained/optional after committed actions.

**v2 changes:** new warm/wine roles, two-family type rules, chapter spacing, paper/inset radii, flatter buttons/fields, underlined internal tabs, shared chapter containers, plain ledger rows, warmer sheets/menus, native tab tint, short motion tokens and sparse icons. Input metrics and behaviors remain shared.

**Difficulty: High relative to the other directions.** Tonal Views and shapes are straightforward; two-family font assets, baseline verification and typographic composition across all modules are moderate work. Literal paper rendering, elaborate page turns and shared-element navigation are high risk and unnecessary. Main risks: editorial headings consuming density, a literary feel overwhelming active logging, font-loading/glyph issues and dark brown surfaces becoming muddy. Bundle size must be measured after font selection.

## 22. Direction B — Hearth

**Philosophy:** a tactile personal command center. Meaningful regions feel like stable places for different parts of life; working rows stay compact. This provides the strongest balance of warmth, useful density, perceptual hierarchy and physical feedback.

### Palette, type and materials

| Role | Light | Dark |
| --- | --- | --- |
| Canvas | #EFE8E1 | #17131B |
| Contained | #FFF9F3 | #2B2531 |
| Raised | #FFFCF8 | #3D3445 |
| Inset | #E5DBD2 | #211C27 |
| Text / metadata | #28232B / #605661 | #F6EEE7 / #C4B9C8 |
| Primary / on-primary | #665078 / #FFF9F3 | #C7B4E1 / #282036 |
| Selected | #E6DDEB | #453A51 |

Manrope 400/600 throughout, with the existing role sizes refined rather than enlarged: screen 30–32, section 20, object/body 16, metadata 14 and metric 28. Verify actual tabular figures and accented-language coverage in selected assets. Weight, alignment and surface ownership supply hierarchy. Light pairs greige canvas with clean warm panels; dark uses aubergine-charcoal layers and softer plum, not black shadows or saturated purple blocks.

Shapes: contained region 16, controls/fields 10, inset 6, menu 12 and sheet 20. Preserve normal 16 gutters and around 12 internal padding; avoid nested padding accumulation. Raised treatment is reserved for selected/actionable regions and overlays. Plain rows live inside groups, with separators only when useful. Native bottom tabs stay native; internal navigation has a measured sliding selection treatment with a static fallback when wrapping. Use a normalized body icon vocabulary and original native tab mappings.

### Axis screen examples

- **Home:** retain the 2×2 grid. Each tile has a different content hierarchy within the same footprint. Attention gets semantic emphasis only when needed; Fitness has a clear workout identity; Journal remains gentle. The selected tile and one detail tray share a tonal connection. Spent today is a precise, compact line above them.
- **Tasks:** Earlier/Upcoming are contained disclosures with count/chevron. Today has the strongest shared panel, date inside its header and plain rows. To-do uses a quieter tray with its existing preview/expansion. Section boundaries come from common regions rather than rules; task rows are not individual cards.
- **Finance:** one precise statement panel for Net Flow and supporting amounts. Transactions group by the established dates inside quiet regions. Commitment obligations and Work Jobs have clear title/amount/status ownership and existing actions. No amount abbreviation, extra charts or missing obligations.
- **Fitness:** workout header is an open outer plane; every exercise gets one compact contained region. Its name/target, one inset set table and local actions are visibly owned together. Set rows share the table and have no individual shadows. Workout actions remain outside those boundaries; Finish stays above tabs.
- **Journal:** one soft writing surface, restrained date/mood chrome and quiet context. It uses the same font/material family with less containment and motion than other modules.
- **Calendar:** grid stays on the canvas; selected date has a tactile two-cue state; agenda is one quieter panel. Do not surround each day with a card.

```text
Tasks                          Active workout
[ Earlier · count  ▾ ]         Workout title / status / actions
┌ Today · date ─────────┐      ┌ Exercise · targets ───────────┐
│ plain task rows       │      │ [one inset set table]         │
└───────────────────────┘      │ local note/actions · Add set  │
┌ To-do ────────────────┐      └───────────────────────────────┘
│ plain compact rows    │      ┌ Next exercise ───────────────┐
└───────────────────────┘      │ same ownership grammar        │
[ Upcoming · count  ▾ ]        └───────────────────────────────┘
```

This shows grouping, not a final layout or a request to abandon virtualization.

### Feature identity with boundaries

Share font, radii, control roles, overlays and motion. Character comes first from composition, with one restrained feature tint or symbol where useful. Candidate light foreground seeds: Tasks indigo #555B87; Calendar ochre #7C622B; Finance ink blue #3F6282; Fitness clay #8B4D37; Journal mauve #775568. Home uses brand plum. These are not tested final role tokens; dark counterparts and contrast must be developed separately.

Limit tint to one region or small source indicator, around 8–12% visual coverage within that region, never the whole screen. Brand actions remain plum across features. Existing semantic source colors stay consistent wherever the same source appears. Semantic success/warning/danger outrank feature identity. Journal uses the fewest accent cues; Fitness can use the liveliest permitted motion. No feature-specific font, icon family or menu behavior.

The existing compact Axis grid, four Task sections and logger structure drive this composition. Its original material hierarchy and palette are distinct from the inspiration's desktop layout, card arrangement and branding.

### Five motion examples

1. Home selection responds immediately, then the attached detail opens over about 220–260ms: explains ownership without reordering tiles.
2. A Task checkbox responds to touch; completion feedback settles after the authoritative mutation, about 160–200ms: no false financial/task success on failure.
3. A new workout set grows into its own table over about 200–240ms: clarifies where the logged data appeared, with stable scroll and focus.
4. Internal selection moves a measured indicator over about 180–220ms: adds continuity while retaining overflow and wrapped-row fallbacks.
5. A contextual menu appears close to its trigger over about 120–160ms with a subtle fade/translation: reinforces the spatial relationship without moving surrounding content.

Press response is immediate with a short bounded settle, optionally scale 0.985. No elastic overshoot, recurring idle motion or staggered list entrance. Reduced Motion uses instant state or very short fade; keyboard/focus handling takes precedence over animation.

**Effects budget:** shadows moderate but only at selected/overlay tiers; blur none in content, optional restrained single chrome treatment only after evaluation; gradients none in the baseline; colored surfaces restrained; animation moderate and purposeful; haptics restrained/optional. A later ambient Home gradient would require a separate decision and must not become another mandatory technique.

**v2 changes:** warm neutral/plum roles, one custom family, explicit section spacing, hierarchy-specific radii, six surface roles, tonal secondary controls and tactile primary feedback, baseline-preserving fields, shared internal indicators, compact region primitives and plain rows, clearer sheet/menu tiers, native tab tint, bounded motion tokens and body icon normalization.

**Difficulty: Medium.** Opaque surfaces, shapes and static state treatments are straightforward. Font validation, section-aware virtualization, measured indicator animation, modal layering and bounded layout transitions are moderate. Multiple live blur layers, per-row large shadows or an animated custom native tab replacement are high risk and excluded. Main risks: too many boxed objects, too much feature tint, reduced usable width through padding, and motion interfering with refresh/focus.

## 23. Direction C — Daylight

**Philosophy:** soft native premium. Connected grouped regions sit in a continuous ambient field. Personality is gentler and more platform-familiar than Hearth; the composition avoids an independent module board and Folio's editorial pages.

### Palette, type and materials

| Role | Light | Dark |
| --- | --- | --- |
| Canvas | #EAE8E5 | #131C21 |
| Contained | #FAF8F4 | #27343C |
| Raised | #FFFFFF | #374750 |
| Inset | #DEDDD8 | #1D2930 |
| Text / metadata | #252F35 / #58636B | #EFF4F5 / #B4C4CD |
| Primary / on-primary | #355B71 / #FBF9F7 | #B0CEDC / #1C303D |
| Selected | #DDE8EC | #304550 |

Use platform system fonts with semibold titles around 28–30, existing 16/14 working text and aligned 28-point metrics. Rounded display faces are optional only if platform parity can be resolved; they are not required for the direction. Light has warm stone backgrounds and clean ivory groups; dark has marine-charcoal depth with soft blue action cues. Avoid a clinical blue-white application by keeping neutral warmth and modest saturation.

Shapes: connected regions around 20–24 radius, controls 12, menus 18; limited pills for small selected states. Depth comes mainly from large tonal regions and inset structure. Optional native material at one chrome layer is supplementary; opaque regions must communicate the same hierarchy on both platforms. Keep native bottom navigation and platform icons; internal navigation has a soft measured selected region with static wrapping fallback.

### Axis screen examples

- **Home:** the same four summaries remain, visually related through a shared base and aligned edges. Selection connects to one detail region rather than making a tile float separately. Spent today stays outside the group as an informational line.
- **Tasks:** Earlier and Upcoming become attached tonal summary bands; Today is a distinct inset block; To-do is a quieter connected list region. Different section tones and boundary shapes replace the separator chain without making individual rows cards.
- **Finance:** one connected statement region and clear ledger bands. Tabular numbers and signs lead; secondary information remains softer. Real category bars retain their existing scope.
- **Fitness:** workout occupies a continuous region; each exercise is an obvious inset/open subsurface with its own name, targets and local actions. Sets remain a plain aligned table within that subsurface. The tone change and shared edges distinguish exercises even before sets exist; no shadow around each exercise or set.
- **Journal:** mostly unboxed writing with a subtle full-width writing plane and small optional mood selection. Material effects stay away from text and keyboard editing.
- **Calendar:** month and agenda form one continuous temporal composition, with a meaningful tonal shift into the selected day's region. Grid cells stay unboxed except their selected/today cues.

Tasks gains orderly bands, Calendar temporal continuity, Finance aligned precision, Fitness inset working areas and Journal minimal chrome. Shared native type, shape, material, icons and state grammar bind them. Small feature accents are optional; no colored screen themes. Axis keeps its phone IA and never imports the reference sidebar, desktop module arrangement or brand assets.

### Four motion examples

1. Home detail opens with a soft bounded settle around 240–280ms: reinforces a continuous connected region.
2. Calendar selection moves its small highlight around 160–200ms: preserves temporal orientation without sliding the full grid.
3. Fitness set insertion settles inside the owning subsurface around 220–260ms: shows where data landed.
4. Menu/material presentation fades over about 120–180ms at the measured origin: maintains native familiarity.

Use a short native-feeling spring with minimal overshoot, no rubbery bounce. Reduced Motion removes position/scale effects. Native navigation remains OS-owned, with no new shared-element transition framework.

**Effects budget:** tonal layering prominent; shadows restrained; blur restrained and optional at a single chrome layer; gradients none; colored surfaces restrained; animation moderate; haptics restrained/optional. No transparent content behind writing or money.

**v2 changes:** warmer neutral/marine roles, system type refinements, continuous-region spacing, softer mixed radii, connected surfaces and inset list bands, soft tonal buttons/fields, grouped internal indicators, quiet rows, softened sheets/menus, native tab tint and short native motion tokens. Icon mappings remain platform-native with normalized body geometry.

**Difficulty: Low for opaque styling; Medium if optional native material is pursued.** Native type and tonal Views are straightforward; connected section composition and bounded animations are moderate. Cross-platform translucent material, blur behind scrolling data and live glass opacity effects are high risk and unnecessary for the baseline. Main risks: insufficient individuality, overly cool Finance-like identity across the app, platform disparity, and subtle open regions recreating the original flatness.

## 24. Comparison matrix

Qualitative judgments are design reasoning, not measured user scores.

| Dimension | Folio | Hearth | Daylight |
| --- | --- | --- | --- |
| Personality fit | Reflective, sophisticated | Strongest supportive/tactile match | Gentle, familiar |
| Cozy / personal | Warm editorial intimacy | Warm personal ownership | Comfortable but less distinctive |
| Originality | Strong typographic identity | Strong material/composition identity | Moderate; closer to native conventions |
| Information density | Good if headings restrained | Excellent with compact group padding | Good; soft regions must stay compact |
| Surface hierarchy | Chapters and paper planes | Explicit region / inset / row ownership | Connected bands and inset subsurfaces |
| Feature identity | Composition and type emphasis | Composition plus restrained tint/tempo | Composition with minimal accents |
| Dark mode | Warm brown paper layers | Aubergine-charcoal with clear group extent | Marine layers; strongest tonal separation |
| Motion potential | Deliberate and quiet | Rich purposeful feedback | Soft native continuity |
| Accessibility | Two-font metric/glyph verification | New-font/state verification | System-font advantage; effect fallbacks needed |
| Expo feasibility | Fonts plus opaque Views | Existing animation stack plus opaque Views | Straightforward opaque baseline |
| Performance risk | Low without paper effects | Low–moderate with bounded layout motion | Low opaque; higher with material effects |
| Implementation cost | High relative effort | Medium | Low opaque / Medium with effects |
| Long-term maintainability | Two-family discipline | Strong reusable surface/control grammar | Simple baseline; platform materials complicate parity |

## 25. Recommended direction

Choose **Hearth** as the dominant system. It gives the user's most important objects a stable home, solves the exact Task and Fitness grouping problems and accommodates compact financial lists. Its warmer neutrals and plum brand leave semantic green available without repeating today's green identity. It makes purposeful motion feel appropriate without depending on expensive materials.

Folio is attractive for a highly editorial organizer but carries more type complexity and may feel less useful during active logging. Daylight has strong native familiarity but risks insufficient visual identity. Those tradeoffs matter more than which system is easiest.

No hybrid is necessary. If desired, borrow only Folio's restrained Journal composition, expressed through Hearth's same font, tokens and controls. Do not introduce a second type/shape system per module or combine paper, glass and gradients. Direction selection still requires the user's decision; this audit does not approve Hearth on their behalf.

## 26. Design System v2 changes required

### Shared changes by direction

| Layer | Folio | Hearth | Daylight |
| --- | --- | --- | --- |
| Colors | Paper / wine | Greige / plum | Warm stone / marine |
| Typography | Limited serif + working sans | One warm geometric sans | System sans |
| Spacing | Chapter rhythm, compact rows | Compact regions, bounded nesting | Connected group rhythm |
| Radii | Sharper paper / inset distinction | 16 group / 10 control / 6 inset | Soft regions / moderate controls |
| Surfaces / cards | Paper chapters | Owned regions + inset data | Connected bands / subsurfaces |
| Buttons | Typographic, flatter secondary | Tonal tactile secondary | Soft native tonal |
| Inputs | Working sans / paper field | Warm field / stable native baseline | System field / stable native baseline |
| Internal tabs | Measured underline | Measured selected-region indicator | Soft selected region |
| List rows | Plain chapter rows | Plain region rows | Plain connected rows |
| Sheets | Paper overlay tier | Clear raised tier | Soft opaque/native optional tier |
| Context menus | Compact ink/paper overlay | Compact anchored raised overlay | Soft native-like overlay |
| Bottom navigation | Keep; wine tint | Keep; plum tint | Keep; marine tint |
| Motion tokens | Short deliberate ease-out | Quick response, bounded physical settle | Short soft native settle |
| Iconography | Sparse normalized lines | Normalized practical vocabulary | Platform vocabulary + body consistency |

Do not create new feature-specific selector/menu systems. New grouping primitives should own presentation only; domain data, errors, persistence and navigation remain with their current owners. Existing design-system documentation should be revised only in a future approved implementation stage.

### Native feasibility and cost boundaries

Opaque tonal Views, shape, text and restrained selected states are straightforward in the current Expo 57 / React Native 0.86.3 stack. Reanimated 4.5.1, gesture handler, expo-font, expo-image and expo-glass-effect are already installed. No production dependency changed in this stage.

Custom font loading/metrics, measured navigation indicators, keyboard-aware overlay entry/exit and visible-region layout animation need moderate implementation and device validation. Avoid bespoke shared transitions between every screen, unbounded list animation, large per-row shadows and physics/parallax systems.

React Native boxShadow is tied to the New Architecture, with Android platform restrictions for outset/inset support; older supported devices need tonal boundaries rather than reliance on a shadow alone. [React Native View style props](https://reactnative.dev/docs/view-style-props#boxshadow).

Expo SDK 57 GlassView supports iOS 26+ and falls back to a regular View elsewhere. Do not depend on glass for grouping or animate parent opacity blindly; glass has specific visibility/animation caveats. [Expo SDK 57 Glass Effect](https://docs.expo.dev/versions/v57.0.0/sdk/glass-effect/).

expo-blur is not installed. SDK 57 supports Android blur through a target-view architecture, with platform-dependent cost and fallback behavior. This is an optional future evaluation, not a reason to add it now. Repeated blur layers over scrolling lists are outside the proposed budgets. [Expo SDK 57 BlurView](https://docs.expo.dev/versions/v57.0.0/sdk/blur-view/). Gradients and haptics also remain optional proposals; no package is requested during this audit.

### Accessibility and architecture gates

- Preserve at least 44pt iOS and target 48dp Android controls; sufficient separation between adjacent targets. Resolve the narrow seven-column Calendar constraint explicitly.
- Verify normal text at 4.5:1 and meaningful control/state graphics at 3:1 against actual surrounding surfaces. Do not equate decorative surface separation with that requirement.
- Test long labels, accented names, exact BRL amounts and large text up to approximately 200% where applicable. Allow heights/wrapping to grow; do not force fixed narrow menu widths or fixed navigation quarters.
- Preserve focus restoration, field labels, current/expanded/selected state, accessible action names, VoiceOver/TalkBack and OS back behavior. New icons never replace understandable words for unfamiliar actions.
- Respect system reduced motion, and test changes while the app is running. Preserve strong static selected states.
- Keep Tasks virtualization, bounded History reads, source-owned Home/Calendar projections and stable list keys. Do not query or re-render full snapshots to feed animation.
- Keep F1's last known good data and mounted editors on refresh failures. Preserve draft recovery, journal conflicts, task recurrence and financial reconciliation. Animation completion must not determine business-state completion.

## 27. Likely implementation phases

1. **Direction decision and representative prototypes:** choose one system; compare Tasks sections and an empty/logged-set exercise in dark and light at narrow width and large text. Native-device approval is a gate before broad migration.
2. **Shared v2 foundation:** approved colors, fonts, radii, surfaces, icons and motion/reduced-motion tokens. Verify single-line inputs before migrating editors. Retain behavior and compatibility while legacy visual roles are replaced deliberately.
3. **Shared interactions:** buttons, segmented choices, anchored selectors/menus, sheets and internal navigation. Keep current layering, focus and keyboard architecture; test inside modals.
4. **Task and Fitness grouping:** address the two principal complaints first, with virtualization and logger state preserved. Review scroll stability and sticky Finish/FAB clearance on real phones.
5. **Home, Finance and Calendar:** apply the same grammar with feature-specific composition and exact data. Preserve native bottom navigation and settled Home/Calendar IA.
6. **Journal and feedback finish:** apply the quietest expression, plus truthful success/error/draft states. Optional haptics/material effects require separate evidence and decisions.
7. **Cross-platform verification:** focused behavioral/contrast tests, complete existing suite and exports appropriate to implementation, then iPhone/Android large text, reduced motion, keyboard, overlay and lower-performance-device review.

These are proposed future phases. None has started as production implementation in Stage 14A.

## 28. Risks, unknowns and verification

The three supplied images are reviewed. The inspiration is desktop, and the Axis screenshots represent specific dark states; they cannot prove light-mode quality, menu anchoring, physical target dimensions, animation feel, keyboard behavior or assistive-technology interaction. Supplementary web galleries help expose composition and wrapping but cannot replace native validation. No physical-device testing, simulator testing or new native export was performed for this audit.

Font asset size, loading time, platform baseline metrics, actual glyph coverage and tabular features remain unmeasured. Palette samples are opaque contrast probes; feature/state tokens still need full validation. Native shadow/material appearance and animation performance need typical-phone tests. Calendar's narrow geometry and Fitness wrapped indicator are specific gates, not cosmetic afterthoughts.

The greatest design risks are card soup, cumulative padding, over-colored modules and introducing motion into scrolling/refresh/focus paths. Counter them with one closed region plus one inset area, plain rows, a shared brand action color, a deliberately limited effects budget and source-owned authoritative state.

### Audit validation

| Check performed during Stage 14A | Result |
| --- | --- |
| `npm exec -- tsc --noEmit` | Passed, exit 0 |
| `npm run lint` | Passed, exit 0 |
| Start-snapshot SHA-256 comparison | All 259 baseline files unchanged; no new source/test/asset files |
| Git status compared with start | Only `docs/visual-redesign-audit.md` added |
| `git -c core.autocrlf=false diff --check` | Passed |
| New audit document structure / whitespace | All 30 sections present; no trailing-whitespace lines |
| Audit's relative source links | All 25 resolve |

Full tests, exports and database validations were not rerun for this documentation-only stage. No production schema, migration, dependency, feature or visual token changed. No physical-device testing was performed; supplied screenshots and component captures are the visual evidence described above.

## 29. Files created / modified

Created for review: `docs/visual-redesign-audit.md` (this document).

No existing tracked file was intentionally modified during Stage 14A. The current `docs/design-system.md` and Stage 13L changes remain intact. Temporary baseline metadata, component-gallery scripts/HTML and screenshots are in ignored `dist/`; they are audit evidence, not production assets or committed deliverables.

## 30. Git status

Baseline branch: `main`, HEAD `471371b`. At the start of this audit, Stage 13L had 13 modified tracked files and six new files, represented partly as an untracked route directory. This pre-existing work must remain unchanged.

Verified Stage 14A delta: only `?? docs/visual-redesign-audit.md`. The pre-existing Stage 13L dirty tree is unchanged. No commit, push, dependency update or redesign implementation.

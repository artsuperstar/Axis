# Axis Design System v2 — Visual Groundwork

Approved repository guidance, materialized 14 October 2026 from the supplied Visual Groundwork and resolved by Stage 14D. The historical [visual audit](visual-redesign-audit.md) and [Stage 14B prototype](hearth-prototype.md) remain unchanged.

**Stage 14D scope:** Tasks main and Fitness active Workout, with compatible shared navigation chrome. All other feature surfaces and editors keep their existing appearance. Sections describing future features are guidance for later stages, not evidence of their migration.

**Stage 14D.2 authority update (Tasks main only):** the user explicitly approved retaining scheduled-Today items completed on the current local day, real X-of-Y progress with a ring, and Earlier / Today / To-do / Upcoming jump navigation. These supersede the earlier prohibitions on those specific mockup behaviors below. Existing domain, History, navigation routes and all other feature semantics remain authoritative. See [the Stage 14D.2 implementation record](design-system-v2-stage-14d.md#stage-14d2--tasks-daily-progress--section-navigation).

## 1. Design Identity

Axis should feel like:

> **A warm, personal place where the user keeps their life together.**

The interface should be cozy without becoming cute, polished without becoming corporate, and visually rich without relying on decorative imagery.

The approved direction combines:

**Warmth of the light mockups**  
+  
**depth and confidence of the dark mockups**  
+  
**the proven Hearth grouping model from Stage 14B**

The core interface is **icon-led, surface-led, and typography-led**, not illustration-led.

---

# 2. Source-of-Truth Rule

Authority order:

1. Existing Axis code and Stage 13 architecture control functionality, data, navigation, information architecture, state, persistence and accessibility semantics.
2. This Visual Groundwork, incorporating Stage 14D resolutions, controls Design System v2 rules.
3. The final mockup communicates appearance, warmth, density and theme direction. It does not authorize controls, metrics, destinations or behavior.

Conflicting mockup artifacts must be ignored. Stage 13 UX and source-owned business behavior remain authoritative.

---

# 3. Core Visual Grammar

The global hierarchy should be:

```text
Canvas
└── Meaningful group
    ├── Plain compact rows
    └── Optional inset region
        └── Dense structured data
```

Normal content should rarely exceed:

```text
Group
→ Inset
→ Row
```

Avoid:

```text
Card
└── Card
    └── Card
        └── Card
```

A surface exists because something conceptually **owns** the information inside it.

---

# 4. Light Theme

The light theme is the primary art-direction reference.

It should feel:

> warm, airy, soft, organized and welcoming.

### Final Stage 14D semantic palette

| Role | Color | Purpose |
|---|---:|---|
| Canvas | `#F5F0EA` | Main application background |
| Surface | `#FFFCF8` | Clean primary content |
| Group | `#FBF5F0` | Main contained sections |
| Group Strong | `#F7EDE8` | Important working region |
| Inset | `#F0E9E5` | Sets, tables, embedded data |
| Control | `#F8F3EF` | Neutral controls |
| Selected | `#F1E1E8` | Selected state |
| Border | `#E4DAD4` | Restrained boundaries |
| Border Strong | `#9B837B` | Perceivable control boundary; brand for essential focus |
| Text Primary | `#241E1C` | Main text |
| Text Secondary | `#6A5E59` | Metadata |
| Text Muted | `#746660` | Low-emphasis information |
| Brand | `#7B425E` | Axis identity |
| Brand Strong | `#68344E` | Important brand action |
| Brand Soft | `#EBD8E1` | Soft selection/tint |
| On Brand | `#FFF9FB` | Text/icons on brand |

These corrected baseline values are preserved. Any future calibration requires measured contrast or actual rendering evidence and documentation.

Large surfaces should remain mostly neutral.

The brand color should **not tint the entire application**.

---

# 5. Dark Theme

Dark mode is the same Axis system under different lighting.

No extra imagery.

No different component architecture.

No more decorative treatment than light mode.

### Final Stage 14D semantic palette

| Role | Color | Purpose |
|---|---:|---|
| Canvas | `#151315` | Warm near-black background |
| Surface | `#1B181A` | Primary content |
| Group | `#242024` | Main contained sections |
| Group Strong | `#2B2429` | Important working region |
| Inset | `#191619` | Dense embedded data |
| Control | `#2B272A` | Neutral controls |
| Selected | `#3C2B35` | Selected state |
| Border | `#3A3337` | Restrained boundaries |
| Border Strong | `#7F7078` | Perceivable control boundary; brand for essential focus |
| Text Primary | `#F6F0ED` | Main text |
| Text Secondary | `#C9BDB8` | Metadata |
| Text Muted | `#AFA39E` | Low-emphasis text |
| Brand | `#DFA6BF` | Axis identity |
| Brand Strong | `#EDBAD0` | Important action |
| Brand Soft | `#422E38` | Soft brand surface |
| On Brand | `#2A1720` | Text/icons on bright brand |

Dark mode hierarchy should primarily come from **tonal layering**, not heavy outlines or shadows.

At low brightness, Canvas → Group → Inset must remain visibly distinct.

---

# 6. Typography

Axis should use two typographic voices.

### Display voice

Use **Lora SemiBold 600** only for the migrated primary screen titles:

```text
Tasks
Fitness
```

Earlier, Today, To-do, Upcoming, workout names, exercise names, task titles, internal navigation, buttons, labels, metadata and tables remain Manrope. Exceptional future editorial headings require explicit justification; serif must not spread automatically.

One static Lora 600 asset is bundled with its OFL license. Display and interface fonts load independently; content remains readable in the system fallback during loading or failure.

### Interface voice

Use **Manrope** for practical UI.

Recommended roles:

| Role | Size | Weight |
|---|---:|---:|
| Screen title | 34–38 | Lora 600 |
| Major object title | 20–24 | Manrope 600 |
| Section title | 18–20 | 600 |
| Card/object title | 16–17 | 600 |
| Body | 16 | 400 |
| UI control | 15 | Manrope 600 |
| Metadata | 14 | Manrope 400 |
| Small label | 12 | 600 |
| Hero metric | 28–32 | 600 |
| Numeric/table | 15 | Manrope 600, tabular |

Use real bundled Manrope 400/600 weights. Do not request synthetic 500. Named static font aliases use fontWeight 400 at runtime because the file itself carries the real 600 weight. Use the serif sparingly.

The contrast between expressive titles and practical UI text is part of Axis's identity.

If Lora performs poorly on-device, the display typeface remains replaceable without changing the rest of Design System v2.

---

# 7. Spacing

Retain a compact mobile rhythm.

| Token | Value |
|---|---:|
| `space1` | 4 |
| `space2` | 8 |
| `space3` | 12 |
| `space4` | 16 |
| `space5` | 20 |
| `space6` | 24 |
| `space7` | 32 |

Default horizontal screen gutter:

**16px**

Very open writing-oriented surfaces such as Journal may use:

**20–24px**

Avoid oversized 28–32px gaps between ordinary content sections.

---

# 8. Shape

Recommended hierarchy:

| Element | Radius |
|---|---:|
| Major group | 16 |
| Raised/feature group | 18 |
| Control | 10 |
| Inset region | 8 |
| Small status surface | 8 |
| Context menu | 12 |
| Sheet top corners | 20 |
| FAB | Circular / appropriate high radius |

Do not make every control a pill.

Pill shapes should be reserved for:

```text
small statuses
compact selectors
special selected controls
```

---

# 9. Depth

Axis should use **tonal hierarchy first**.

Shadows are secondary.

Light mode may use a restrained shadow on:

```text
FAB
menus
raised overlays
occasionally selected/expanded feature surfaces
```

Ordinary content groups should not appear to float independently.

Dark mode should use almost entirely tonal elevation.

---

# 10. Borders and Dividers

Full-width section-divider lines should become uncommon.

Use boundaries in this priority:

```text
1. Surface contrast
2. Spacing
3. Shape
4. Typography
5. Border
6. Divider
```

Dividers remain appropriate inside structured data such as:

```text
Set tables
Dense transaction tables
Certain grouped rows
```

They should not define whole screen sections.

---

# 11. Icon System

Axis is **icon-led, not illustration-led**.

Use one consistent outline/glyph family already compatible with Expo.

Icons should generally sit inside subtle feature/control containers rather than appearing as random decoration.

Do not infer arbitrary icons from user-entered text.

Example:

```text
"Call dentist"
```

must not automatically receive a dental icon simply because of its name.

---

# 12. Dynamic Content Rule

User-created entities must never depend on bespoke artwork.

```text
User-created Task
→ normal semantic/task treatment

User-created Finance item
→ semantic financial treatment

User-created Exercise
→ icon determined only from its measurement type
```

No dynamically generated photography or illustrations.

---

# 13. Fitness Measurement Icons

Fitness gets a deterministic visual vocabulary.

| Measurement type | Icon concept |
|---|---|
| Strength | Dumbbell |
| Bodyweight | Person/activity |
| Duration | Stopwatch/timer |
| Distance | Route/distance |

Therefore:

```text
Bicep Curl
Bench Press
Shoulder Press
```

can all receive the **Strength** icon.

And:

```text
Push Up
Pull Up
Bodyweight Squat
```

receive the **Bodyweight** icon.

The icon describes how the exercise is measured, not its name.

---

# 14. Feature Identity

Feature personality comes primarily from composition and restrained accents.

Recommended direction:

| Feature | Character | Accent territory |
|---|---|---|
| Tasks | Structured / orderly | Dusty indigo |
| Calendar | Temporal / orienting | Muted violet |
| Finance | Precise / grounded | Muted blue |
| Fitness | Active / tactile | Clay / warm coral |
| Journal | Quiet / reflective | Mauve / soft berry |
| Home | Unifying | Axis brand + feature accents |

Feature accents should primarily affect:

```text
icons
small selected areas
progress
micro-highlights
specific controls
```

They should not recolor the entire screen.

---

# 15. Tasks — Real Architecture Mapping

The final Tasks architecture remains:

```text
Tasks                                  ⋯

Earlier                               3 ▼

TODAY
Wednesday, October 14

[Task rows]

TO-DO

[up to five Task rows]
View all

Upcoming                              8 ▼

                                     ＋
```

The mockup's top section tabs are **not part of Axis**.

### Hearth treatment

`Today` receives the strongest working surface.

`To-do` receives a quieter group surface.

`Earlier` and `Upcoming` become compact contained disclosures.

Individual Tasks remain compact rows **inside** those surfaces.

Do not wrap every Task in an independent floating card.

The FAB remains the Add Task action.

The top-right overflow remains:

```text
Categories
Repeating Tasks
History
```

---

# 16. Task Completion

Incomplete:

```text
outlined circular control
```

Complete:

```text
feature-accent fill
check mark
subtle state transition
```

Completion may use a brief:

```text
fill
check resolve
row state transition
```

No confetti.

No gamified reward.

---

# 17. Fitness — Real Architecture Mapping

Fitness internal navigation remains exactly:

```text
Workout | Routines | Exercises | History
```

No destination may be omitted.

No invented `+` control should appear in the Fitness header.

Existing real header actions remain authoritative.

---

# 18. Active Workout Hierarchy

The workout remains on the outer plane.

```text
Workout title
status / start time
workout-level actions

Exercise group
Exercise group
Exercise group

Finish Workout
```

Each Exercise owns:

```text
measurement-type icon
name
target
notes/actions
set status
sets
Add Set
```

---

# 19. Exercise Surface

Conceptually:

```text
╭──────────────────────────────╮
│ [type icon] Bicep Curl    ⋯  │
│             3 × 8–12 reps    │
│                              │
│ Add note        Actions      │
│                              │
│ ╭ SETS ────────────────────╮ │
│ │ 1   20 kg   10 reps      │ │
│ │ 2   20 kg    9 reps      │ │
│ ╰──────────────────────────╯ │
│                              │
│          + Add set           │
╰──────────────────────────────╯
```

Only persisted sets appear. No planned placeholder rows or new set records are implied. A zero-set exercise shows “No sets logged yet” and Add set.

No exercise photography.

No exercise-specific artwork.

---

# 20. Set Insets

Sets live in one inset surface.

Set rows are plain dense rows.

Individual Sets are **not cards**.

Headers such as:

```text
SET
WEIGHT
REPS
```

should be small and understated.

Numeric alignment should be stable. Each measurement type has its own columns:

| Type | Columns | Optional data |
| --- | --- | --- |
| Strength | Set, Weight, Reps | kg, never pounds |
| Bodyweight | Set, Reps | Added weight column only when at least one set has it |
| Duration | Set, Duration | Clock formatting; spoken duration retained |
| Distance | Set, Distance | Time column only when at least one set has it |

An em dash denotes a missing optional value on an existing set, never a placeholder set record. At large text, use labelled values in stacked rows instead of squeezing a table. Set rows retain their existing editor tap and complete spoken units. No set-row overflow action is introduced.

---

# 21. Finish Workout

Keep the sticky action above native tabs.

It should use a high-priority Fitness-accent treatment while remaining part of the Hearth system.

It must preserve:

```text
safe areas
keyboard behavior
native bottom tabs
scroll behavior
```

---

# 22. Home

Preserve real architecture:

```text
Home
date

Spent today               R$ XX,XX   [+]

Today          Attention
Fitness        Journal

optional expanded detail
```

Do not adopt invented dashboard metrics from concept renders.

The 2×2 summary grid should become one of Hearth's strongest visual applications.

Each summary may use:

```text
feature icon
feature accent
compact status
small progress/state visualization
```

No feature needs photography.

---

# 23. Calendar

Preserve:

```text
month navigation
calendar grid
legend
selected-day agenda
```

The calendar itself should remain relatively unboxed.

The selected-day agenda can occupy a quiet contained group.

Do not put every date inside a card.

---

# 24. Finance

Finance should use the same surfaces with slightly more precision.

Use:

```text
clean numeric alignment
tabular numerals
restrained financial semantic color
compact statement-like groups
```

Positive/negative semantic colors remain separate from the Axis brand.

Green may still represent positive financial semantics.

Green is simply no longer the **brand identity**.

---

# 25. Journal

Journal should be the quietest Hearth destination.

Use:

```text
large display title
minimal chrome
soft writing surface
compact mood selector
very subtle Day at a Glance surface
```

Journal may use slightly more negative space than other features.

No decorative notebook photo is required.

A book/journal icon is sufficient.

---

# 26. Bottom Navigation

Preserve the actual Axis tabs:

```text
Home
Tasks
Calendar
Finance
Fitness
```

Journal remains a secondary destination.

Do not introduce:

```text
More
Journal tab
different destinations
```

unless product architecture changes in a separate future stage.

The existing native bottom navigation is fundamentally successful.

Evolve colors/selected treatment only as required to fit Design System v2.

---

# 27. Internal Navigation

Finance:

```text
Overview
Transactions
Commitments
Work
```

Fitness:

```text
Workout
Routines
Exercises
History
```

Use a contained low-profile navigation rail with a moving selected treatment when layout permits.

The selected indicator may slide approximately 160–200ms.

At large text/wrapped layouts, use a static selection fallback.

---

# 28. Buttons

### Primary

Use for explicit important persistence/completion:

```text
Save
Create
Pay
Finish Workout
```

Brand or feature accent background.

### Secondary

Neutral contained button.

### Quiet

Text or subtle surface.

### Destructive

Semantic danger treatment.

### Icon-only

Only when the icon is universally clear and accessible label exists.

Minimum touch target:

**44 × 44**, preferably **48 × 48**.

---

# 29. FAB

Tasks Add uses a FAB.

Characteristics:

```text
brand background
high-contrast plus
subtle light-mode shadow
tonal depth in dark mode
48–56px touch target
brief press feedback
```

Avoid making it the largest visual object on the page.

---

# 30. Inputs

Inputs should use quiet contained surfaces rather than outlined boxes everywhere.

Normal:

```text
Control surface
subtle/no border
```

Focused:

```text
stronger edge / brand accent
```

Error:

```text
danger edge + adjacent message
```

Preserve the existing native single-line baseline fixes.

Multiline remains top-aligned.

---

# 31. Sheets

Sheets should feel physically connected to the bottom edge.

Use:

```text
20px top radius
clear raised surface
subtle scrim
Back arrow
natural content height
keyboard-safe movement
```

Do not reintroduce textual `Done` navigation controls.

---

# 32. Context Menus

Menus should appear anchored to their trigger.

Use:

```text
12px radius
raised surface
subtle shadow in light mode
tonal elevation in dark mode
compact 44–48px rows
```

Destructive actions remain semantically distinct.

---

# 33. Motion System

Motion should make the interface feel physical.

Recommended tokens:

| Motion | Duration |
|---|---:|
| Press | 110–130ms |
| Selection | 160–190ms |
| Indicator movement | 170–200ms |
| Insert/remove | 190–220ms |
| Disclosure | 200–230ms |
| Menu | 150–180ms |
| Sheet | native / ~220ms |

Use one smooth ease-out family.

Motion should describe:

```text
where content came from
what changed
what belongs together
```

It should not merely decorate.

---

# 34. Motion Examples

Task completion:

```text
tap
→ circle fills/check appears
→ authoritative row state updates
```

Disclosure:

```text
chevron rotates
→ content reveals within owning section
```

Fitness Set:

```text
Add Set
→ row enters inside set inset
```

Internal navigation:

```text
selected indicator travels to new destination
```

Home expansion:

```text
summary visually connects to revealed detail
```

---

# 35. Reduced Motion

When Reduced Motion is enabled:

```text
remove movement distance
remove scale effects
use immediate or short fades/state changes
```

The interface must remain understandable without animation.

---

# 36. Imagery Policy

Default:

> **No imagery required.**

Allowed only when it is a deliberate Axis-owned decorative asset and clearly improves the product.

Never require imagery for:

```text
Tasks
Exercises
Clients
Jobs
Categories
Journal entries
Transactions
Commitments
user-created content
```

Any future imagery must be optional to the visual system.

Removing it must not break the design.

---

# 37. Icon Policy

Use icons because Axis knows the **semantic role**, not because an AI associates an image with a word.

Good:

```text
Fitness → dumbbell
Journal → book
Calendar → calendar
Recurring → repeat
Duration exercise → stopwatch
```

Avoid:

```text
"dentist" → tooth
"holiday" → airplane
"Bicep Curl" → custom arm illustration
```

unless the user explicitly chooses such metadata in a future feature.

---

# 38. Accessibility

Design System v2 must preserve:

```text
44pt minimum targets
large text
VoiceOver/TalkBack
non-color state communication
WCAG contrast
focus
Reduced Motion
wrapping/reflow
```

No fixed-height card may clip large text.

Feature colors cannot be the sole way state is communicated.

---

# 39. Density

Axis should remain information-efficient.

A premium UI does not mean:

```text
huge cards
huge empty gaps
one metric per screen
```

Prefer:

```text
compact groups
dense plain rows
clear ownership
good typography
moderate padding
```

---

# 40. Implementation Principle

Do not reproduce generated mockups pixel-for-pixel.

Instead reproduce:

```text
visual hierarchy
surface relationships
palette
typographic hierarchy
shape language
density
icon grammar
motion character
```

Generated-image artifacts must be ignored.

---

# 41. Prototype-to-Code Mapping

When implementation begins:

| Mockup concept | Real Axis implementation |
|---|---|
| Large serif title | Existing screen title |
| Today card | Existing Today section |
| To-do card | Existing To-do section |
| Earlier card | Existing Earlier disclosure |
| Upcoming card | Existing Upcoming disclosure |
| Exercise card | Existing Exercise group |
| Set table | Existing Sets list/inset |
| Fitness top tabs | Existing four-destination internal nav |
| Bottom bar | Existing native Axis tabs |
| `+` controls invented by mockup | Ignore unless already present in real Axis |
| Example icons | Replace with semantic Axis icons |
| Example content | Ignore; use real model data |

---

# 42. Visual Acceptance Criteria

The redesign succeeds when:

**Tasks**

A glance should immediately reveal:

```text
Today
To-do
Earlier
Upcoming
```

without relying on horizontal divider lines.

**Fitness**

A glance should immediately reveal:

```text
Workout
Exercise
Sets
Actions
```

and where one Exercise ends and another begins.

**Whole app**

The user should feel:

> warm  
> organized  
> supported  
> calm  
> in control

without the interface becoming visually sleepy or childish.

---

# 43. Final Design-System Position

The approved direction is best described as:

> **Warm Editorial Hearth**

Its identity is created through:

```text
warm neutral foundations
editorial display typography
practical sans-serif UI typography
clear owned surfaces
restrained feature accents
semantic icons
compact density
subtle depth
purposeful motion
```

It does **not** depend on:

```text
photography
illustrations
gradients
glass
heavy shadows
content-specific artwork
excessive pill controls
divider-heavy layouts
```

Light and dark mode are two expressions of the **same design system**.

---

# 44. Stage 14D implementation resolutions

## Feature accents and contrast-safe companions

| Token | Light | Dark |
| --- | --- | --- |
| taskAccent | #6670A5 | #AEB7E8 |
| taskAccentSoft | #E6E7F3 | #303247 |
| taskText | #505A8A | #AEB7E8 |
| fitnessAccent | #B66F5D | #E2A08F |
| fitnessAccentSoft | #F2DDD6 | #472D29 |
| fitnessText | #8E4E3F | #E2A08F |
| onFitness | #151010 | #2A1720 |

The supplied feature accents remain unchanged. Their text companions avoid using light clay/indigo for small text on an unsuitable surface. Finish Workout uses fitnessAccent/onFitness; supporting Fitness actions use fitnessAccentSoft/fitnessText. Task completion uses taskAccent/onBrand. Essential focus uses brand; a filled control additionally retains its contrasting inner edge.

## Architecture and scope

- Semantic tokens: `src/constants/design-system-v2.ts`.
- Shared presentation: `DesignProvider`, `UiText`, `UiPressable`, `UiButton`, `GroupSurface`, `ContentInsertion`, `UiIcon`, `InternalNavigation`, `useReducedMotion`.
- Existing FormButton/context-menu consumers opt into `appearance="v2"`; legacy defaults are preserved.
- The native five-tab navigation keeps its platform icons, routes, insets and architecture, with v2 colors only. The active-session Fitness rail is shared navigation chrome; its other destinations retain legacy content.
- Task sections remain virtualized slices of one SectionList. Earlier and Upcoming start collapsed; To-do retains its five-row preview. Add stays the FAB. No progress metric or retained completed Today rows.
- Workout stays on the outer plane. Exercises own their measurement icon, targets, notes/actions, one sets inset and Add set. Finish stays outside the scrolling content above native tabs.
- Measurement icons use one small authored outline vocabulary and installed Expo Image, not another icon dependency. Existing native-tab system glyphs remain platform-owned chrome.
- Motion uses 120ms press, 180ms selection, 190ms indicator, 220ms insertion/disclosure and 160ms menu tokens. Reduced Motion is observed once per screen and changes live. A local set insertion plays once; refresh, resume and return never replay the whole list.
- Menus retain the shared measured anchor, dismissal, focus restoration, keyboard and modal stacking behavior.
- No schema, migration, persistence, dependency or product-feature changes.

See [Stage 14D implementation and validation](design-system-v2-stage-14d.md) for final token tables, measured contrast, preview provenance, cleanup mapping and physical-device questions.

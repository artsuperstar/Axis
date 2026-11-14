# Axis visual unification — Phase 1 audit

**12 November 2026 · source HEAD `16ebeab46d20e7a943f08fa017928ce0eb884c0e` · audit and proposals only**

[Review index](index.html) · [Screen inventory](screen-inventory.md) · [Current tokens](token-inventory.md) · [Issue register](inconsistency-register.md) · [Current UI atlas](atlas/index.html) · [Interactive palette comparison](palette-candidates.html)

## Executive summary

Axis already has a strong common visual foundation: warm charcoal/parchment surfaces, Lora display headings, Manrope operational text, compact contained records and source-owned actions. The next phase should complete and clarify that foundation, rather than redesign the independently approved features again.

The largest remaining inconsistencies occur **inside active workflows**: editing an ordinary existing task, linked transaction details, active-workout set/note/add-exercise sheets, default sheet headers and refresh failures. Major screens being v2 does not establish that all descendants are v2.

**Work History is confirmed implemented in v2.** The actual `/work/history` route uses DesignProvider, UiText, v2 cards/menus and a paged SectionList for Jobs and Receipts. Client History reuses these components. Its remaining visual mismatch is the default shared sheet header and some screen-level fallback feedback, not an unimplemented History redesign. See [source and capture evidence](screen-inventory.md#finance-work).

There are **20 prioritized findings: 0 P0, 5 P1, 12 P2, 3 P3**. Prioritize resting input-boundary visibility and complete active v2 branches/defaults. Then clarify semantic color ownership, typography roles and feature mappings. No serious native interaction failure was established; native acceptance remains outstanding.

The audit covers **205 source modules**, **18 route/layout modules**, **2,235 JSX component uses**, and **161 raw color literals including the canonical token definitions**. These are inventory counts, not defect counts. The conservative module graph reaches 200 modules and explicitly excludes unused compatibility/UI artifacts from active legacy findings. [Machine source inventory](source-inventory.json), [reachability](reachability.json).

Visual evidence comprises **154 browser captures**: 77 cases in both themes, normally 390 CSS pixels wide, plus seven representative surfaces at 320 with doubled text and at 430 with normal text. Four additional screenshots compare the three palette proposals at 1440 and 390. Thirty incumbent preview builders were rebuilt from current source, plus one isolated nested-state builder. Browser images supplement source review; they are **not native screenshots or physical-device acceptance**.

No `src/`, asset, dependency, configuration, schema, persistence, navigation or domain-service file was changed. All five Home photographic assets, both textures and earlier visual evidence remain unchanged. No commit or push.

## Current identity and the patterns to preserve

The shared v2 identity is **Warm Editorial Hearth**: charcoal with a violet/warm undertone at night; parchment and off-white by day; muted rose/plum actions; editorial headings; restrained 16–18-unit grouped corners; practical low-shadow operational surfaces. Compact financial/list rows appropriately use sans-serif text and tabular numerals. An app-wide serif conversion would reduce clarity.

Home deliberately carries more atmosphere than the workspaces. Its approved five image-backed cards and two theme-specific background textures are feature identity, not token debt. Today and Attention expand directly below the first row; Fitness and Journal retain direct navigation. The existing content-sized layout and bottom-inset ownership must survive any later theme work. Empty space in a short screen viewport is not automatically a hidden-panel reservation.

Preserve these particularly strong patterns:

- Native five-destination tabs and pushed-screen hierarchy, with contextual sheets staying source-owned.
- Task/Work/Finance archive paging and virtualization, including explicit visible counts and truthful empty states.
- Distinct Expected, Paid, Earned, Received and Outstanding financial roles. Work earned is not recorded Income until a receipt exists.
- Historical recurrence/schedule-version metadata and scheduled-date semantics, not current-series labels substituted into archives.
- Contextual actions and interactive completion/reopen controls, rather than decorative status icons copied from mockups.
- Existing local font fallback, focus/selection hosts, measured sheet layout, Reduced Motion and UI-thread press feedback.
- Category-based finance icons, measurement/type-based Fitness icons and OS-native tab symbols. No new decorative icon system is needed.

## Screen and shared-component coverage

The [full human inventory](screen-inventory.md) identifies each route, feature surface, nested editor, selection/action surface and coverage gap. The [capture register](screen-inventory.md#fresh-capture-register) links every dark/light case. This includes additional surfaces absent from the initial checklist: source adapter routes, per-task Occurrence History, Manage Commitments, completed workout details, logged-performance/note editors, the shared refresh notice, database startup/failure and invalid-source fallbacks.

| Area | Current status | Highest-value evidence |
|---|---|---|
| Home | v2.2; approved art/textures; contextual expansion | [collapsed](atlas/home-dark.png), [Today](atlas/home-today-light.png), [Attention](atlas/home-attention-dark.png) |
| Tasks | v2 workspace/create/categories/repeating/archive; ordinary Edit and nested action/history sheets legacy | [create vs edit](atlas/compare-legacy.png), [archive](atlas/task-history-light.png) |
| Calendar | v2 neutrals + green selected day + categorical source markers; default MonthChooser header mixed | [dark](atlas/calendar-dark.png), [light](atlas/calendar-light.png) |
| Finance Overview | v2, precise financial charts and local semantic/categorical palette | [overview](atlas/finance-overview-light.png) |
| Transactions / Categories | v2 lists/editor/library; linked payment detail legacy | [menu](atlas/transactions-menu-light.png), [linked detail](atlas/aux-linked-dark.png) |
| Commitments | v2 obligations/editor/payment/resume/details/histories; Manage branch legacy | [Manage](atlas/commitments-manage-dark.png), [global index](atlas/commitment-global-history-light.png) |
| Work | v2 main/edit/payment/job/client/global History; default Client History header and feedback mixed | [financial comparison](atlas/compare-financial.png), [History](atlas/work-history-dark.png) |
| Fitness | v2 major surfaces; Workout copper, management rose; active nested logging/note/add sheets legacy | [Workout](atlas/fitness-workout-light.png), [Set editor](atlas/aux-set-dark.png) |
| Journal | v2 editor/context/archive, quiet green accent bridge, local state/conflict handling retained | [editor](atlas/journal-light.png), [archive](atlas/journal-history-dark.png) |
| Global | v2 tabs; optional v2 controls; root theme/startup/default sheets still mixed | [controls](atlas/aux-controls-light.png), [refresh](atlas/aux-refresh-dark.png) |

## Existing token architecture

There are two active systems, not one completed global replacement:

1. [theme.ts](../../src/constants/theme.ts) supplies Calm Utility legacy colors, system typography, spacing, radii, status aliases and compatibility names through `useTheme`.
2. [design-system-v2.ts](../../src/constants/design-system-v2.ts) supplies v2 neutrals, rose brand, Tasks/Fitness accents, typography, shapes, motion and touch minimum through `useDesignColors` and opt-in components.
3. [design-system.tsx:26–47](../../src/components/design-system.tsx#L26) loads local Lora/Manrope and selects semantic text faces. Form controls, sheets, menus and navigation often preserve the legacy default unless callers explicitly pass `appearance="v2"`.
4. Feature adapters bridge missing roles: Home artwork palettes, Calendar's merged theme/design palette, Journal's green accent mapping, Finance Overview colors and Work's `useTheme` semantic/feature values.

The [complete current token tables](token-inventory.md) contain every exported non-function token from the two canonical modules, including all light/dark colors, compatibility aliases, typography, spacing, radii, motion, touch sizes and platform font fallbacks. [Source inventory](source-inventory.json) additionally records component-local numeric styles, literal colors, component usage/props and file hashes with line evidence.

### Canonical neutral, text, brand and status examples

| Role | Current v2 light | Current v2 dark | Legacy counterpart / interpretation |
|---|---|---|---|
| Canvas | `#F5F0EA` | `#151315` | `#FAFAF9` / `#121615` |
| Surface | `#FFFCF8` | `#1B181A` | Raised legacy overlay is `#FFFFFF` / `#28312D` |
| Group / stronger group | `#FBF5F0` / `#F7EDE8` | `#242024` / `#2B2429` | Legacy groups trend green, especially dark |
| Inset / control | `#F0E9E5` / `#F8F3EF` | `#191619` / `#2B272A` | Different roles; do not flatten into one surface |
| Selected | `#F1E1E8` | `#3C2B35` | Legacy accent-muted green is `#E4F0E8` / `#263F33` |
| Primary / secondary / muted text | `#241E1C` / `#6A5E59` / `#746660` | `#F6F0ED` / `#C9BDB8` / `#AFA39E` | Legacy text families differ in hue and metrics |
| Border / strong border | `#E4DAD4` / `#9B837B` | `#3A3337` / `#7F7078` | Subtle divider and necessary interactive outline need different roles |
| Brand / strong / soft / on-brand | `#7B425E` / `#68344E` / `#EBD8E1` / `#FFF9FB` | `#DFA6BF` / `#EDBAD0` / `#422E38` / `#2A1720` | v2 primary buttons currently use **brandStrong**, not brand |
| Attention / soft | `#805619` / `#FBEACF` | `#DFC18B` / `#4C3928` | Semantic amber, not general brand |
| Danger / info | `#9B303E` / `#3D5E86` | `#F0ABAB` / `#B4CEE8` | Error/destructive and informational meanings |
| Success | **No v2 role** | **No v2 role** | Legacy `#276242` / `#9CCBAD`; local income colors also differ |
| Chart income / expenses | `#32664E` / `#94455C` | `#A8D0B7` / `#F1A9B4` | Local active Overview resolver, not generic brand/danger aliases |

Sources: [legacy tokens:7–65](../../src/constants/theme.ts#L7), [v2 tokens:4–23](../../src/constants/design-system-v2.ts#L4), [active Overview palette:5](../../src/features/finance/overview-presentation.ts#L5). The old chart helper is not evidence that the current expense series is blue.

### State and layering audit

Current v2 primary buttons use `brandStrong/onBrand`; selected controls use `selected` fill, `brand` text/outline and a check/state announcement. Secondary buttons use control fill; brand-toned secondary actions use brandSoft; destructive labels use danger. Disabled/busy controls use inset fill and muted text, and expose disabled/busy state. Press feedback is an 8% opacity change with optional 1.5% scale; motion timings are shared. No need to invent a new feedback system.

GroupSurface is a neutral group primitive, not a universal card: surfaces can be group, stronger group, inset or surface. Default GroupSurface has no visible border unless its caller supplies one. Financial summaries often use internal dividers, while archives use contained rows. These are legitimate hierarchy differences. Light raised menus use a restrained shadow; dark shared shadow is `none`. Home's photographic treatment is a separate intentional layer.

The major surface discontinuities are the green legacy dark sheet/management surfaces and incomplete v2 default sheet header/shape propagation. An all-screens global surface replacement would also accidentally touch useful legacy status mappings.

## Feature color audit

| Feature | Background and accent / selected treatment | Actions and statuses | Classification and recommendation |
|---|---|---|---|
| Home | Theme textures + per-card photo palettes: Today rose, Attention amber, Fitness emerald, Journal plum, Spent copper | Card arrows, contextual panel linkage and own accessible text treatment | **Preserve** approved feature-local art mappings; they are not rogue literal colors |
| Tasks | v2 warm groups, indigo task tokens/indicators, rose actions | Interactive completion uses green success; stopped/skipped labels remain explicit | **Preserve semantics**, finish legacy edit/action/history branches and centralize completed/selected aliases |
| Calendar | v2 neutral month/agenda; legacy green selected day; blue Task, amber Commitment, teal Work markers in both themes | Rose shared controls; agenda completion and source actions retain source meaning | Marker colors are **categorical** with legend/labels. Green selection is a bridge requiring an identity decision, not automatic semantic misuse |
| Finance | Warm neutral charts/list/editor; rose actions/selection; local green income and pink expenses | Category palette separate; paid transactions remain signed and labeled | **Preserve data hierarchy**. Centralize financial roles without substituting warning/error meaning or recoloring category data |
| Work | Warm groups; main green briefcase/arrows from legacy accent; detail/client icons rose; rose payment buttons | Overdue amber, received money green, balances primary text | Semantic green is valid. **Identity mapping unresolved** between main and details; centralize feature roles after approval |
| Fitness | Home emerald, current Workout copper (`#B66F5D` light / `#E2A08F` dark); management/archives mostly rose | Copper Set Complete/Start actions, rose selected routine/history control | **Explicit approval needed**: retain copper workout identity or adopt an emerald relationship. Brief says emerald *may* remain; actual app is not emerald everywhere |
| Journal | v2 groups and serif display; legacy green reflection/mood/save accents, Home plum | Mood labels/icons and explicit selected state | Quiet green can be intentional. Choose whether plum is only Home atmosphere or destination identity; do not globally convert all green |

Home exact examples ([home-artwork.tsx:16–20](../../src/features/home/components/home-artwork.tsx#L16)): dark Today body `#2C191F`, accent `#FFD0BD`; Attention `#302314`/`#FFCE83`; Fitness `#11291F`/`#BCEAD5`; Journal `#281E30`/`#E9C9F2`; Spent `#261A16`/`#FFD0AE`. Corresponding light body/accent pairs are `#F8EAE5`/`#87402E`, `#F6ECD8`/`#795115`, `#E9F1E9`/`#245C49`, `#EEE7F2`/`#69427B`, `#F4E6DE`/`#81452F`. Source inventory includes borders and card text as well.

Green currently means several things: interaction selection, feature identity, completion, received money and inherited background. Pink means brand action, expense data and some paid/history treatments. This is manageable if the roles stay separate in code and wording; it is fragile when components reuse one literal/token because its hue happens to match. Amber must remain attention/overdue, including under a copper brand proposal.

## Typography audit and proposed role scale

Current local fonts are `AxisLora-SemiBold` for display and `AxisManrope-Regular` / `AxisManrope-SemiBold` for interface text, with system fallbacks when fonts fail or system mode is selected. Font files are bundled; no new font/dependency is proposed. `UiText` chooses Lora for **screenTitle, editorTitle and editorSection only**. `sectionHeading`, `sheetTitle`, cardTitle and metric remain Manrope unless locally overridden. ThemedText compatibility aliases can produce a 48/52 title or32/44 subtitle outside the v2 scale.

| Current v2 role | Size / line height | Current face / weight intent | Proposed convention, subject to approval |
|---|---|---|---|
| screenTitle | 36 /46 | Lora semibold | Preserve `display.page`; Tasks' local38/48 documented as a deliberate exception or folded into the role |
| editorTitle | 26 /34 | Lora semibold | Preserve `display.editor`; add `display.editorCompact`24/32 and narrow22/30 only where measurement requires |
| editorSection | 20 /28 | Lora semibold | Explicit `display.section`; preserve editorial feature groups |
| sectionHeading | 20 /28 | Manrope semibold | Explicit `heading.operational`; don't make all section labels serif |
| sheetTitle | 18 /24 | Manrope semibold | Explicit `heading.compact`; editorial sheet title is a separate role |
| cardTitle | 16 /24 | Manrope semibold | Preserve dense operational/list title; optional compact15/22 archive role |
| body / input | 16 /24 | Manrope regular | Preserve font scaling and practical entry typography |
| secondary / metadata | 14 /20 | Manrope regular | Preserve; do not use muted color to hide essential metadata |
| smallLabel | 12 /18 | Manrope semibold | Small supporting captions only; local12/17 Task archive metadata requires native review |
| fieldLabel | 14 /20 | Manrope semibold | Preserve required-field semantics and error association |
| button / numeric | 15 /22 | Manrope semibold; numeric tabular | Preserve; numeric alignment separate from display money |
| metric | 30 /38 | Manrope semibold/tabular | Keep dense operational metric; optional `money.display` Lora30/38 for selected summaries, never universal |

Local evidence: [Task History:131–148](../../src/features/tasks/components/task-history-list.tsx#L131), [Work editor:140–141](../../src/features/finance/work/components/work-forms.tsx#L140), [Job detail:208](../../src/features/finance/work/components/work-job-details.tsx#L208), [Routine title:27](../../src/features/fitness/components/routine-composition.tsx#L27). Finance summary's compact20/28 and 16/24 money is useful in a three-column row; retain a named compact numeric role. Repetition warrants role extraction, not automatic size enlargement.

Capitalization is largely sentence case; task section names and source-owned titles vary intentionally. Calendar weekday uppercase, abbreviated metadata and numeric chart labels should remain functional exceptions. No global uppercase or tracking change is justified. Current style-number inventory records local font sizes/line heights/letter spacing for later migration review.

## Spacing, shape, layout and component audit

Legacy spacing uses2/4/8/12/16/24/32; the v2 scale adds a 20-unit section rhythm and omits2. Compatibility `Spacing` includes64. v2 shape roles are group16, raised18, control10, inset8, status8, menu12, sheet20, FAB28; legacy uses small4/control8/surface8/overlay12. Preserve the v2 scale and name justified compact exceptions. Don't collapse every surface to one radius.

| Pattern | Current comparison | Proposed reusable specification |
|---|---|---|
| Primary/secondary/destructive buttons | Shared v2 UiButton exists; wrappers often opt in; legacy44 vs v2 48 minimum | One state/geometry contract with brand/feature/semantic tone; keep quiet/navigation/compact variants |
| Text field / amount / search | FormField supports v2 face/focus/error; some search layouts hide visible label accessibly | Shared field outline/focus/disabled roles; leading/trailing accessory slots; money formatting stays source-owned |
| Select / category / date/time | Common FormSelect/SelectionHost; native pickers are separate boundary | Shared trigger styling, state and focus return; don't replace native date/time UI with browser look |
| Segmented control / internal tabs | v2 selected check/outline, stacks at fontScale>=1.5; native bottom tabs separate | Preserve measured selection/large-text behavior; distinct subnav and form-selection component roles |
| Overflow menu | Shared ContextMenu already has v2 support, accessible labels and action host | Complete appearance propagation; keep row source ownership and actual destructive action semantics |
| Section / editor group | EditorSection, GroupSurface, feature headers overlap in visual grammar | Standardize heading/icon/helper/gap mechanics where equivalent; do not force archive headers or chart groups into an editor template |
| Financial summary | Workmain metric, Jobdetail grid, Clientdisplay balance, Overview3column totals | Shared neutral/text/divider/money roles; **separate compositions** for their actual information density |
| Status | StatusText plus feature-local badge wrappers | Semantic text/icon/fill/border roles with explicit labels; separate paid/received/completed from selected/active |
| Contained row | Task, category, workout, transaction and Work cards already coherent but deliberately different | Shared padding/hit-region/title/metadata contract; slots rather than one data/domain “universal row” |
| Sheet/header | Many custom editorial headers; default AdaptiveSheet incomplete v2 and old corners | Explicit visual appearance inherited by default header/notice; preserve keyboard/focus/scroll measurement |
| Feedback | Inline archive empty, contained receipts empty, blocking startup error | Three contextual variants with clear action/announcement; retain feature tone and avoid decorative overwrapping |

Use [header](atlas/compare-headers.png), [financial](atlas/compare-financial.png), [sheet](atlas/compare-sheets.png) and [legacy/control](atlas/compare-legacy.png) comparisons. Gray unused cells below contact-sheet thumbnails are gallery layout, not whitespace inside Axis.

## Light/dark and accessibility findings

Both canonical themes have dedicated values. Light mode is not an inverted dark theme; dark mode intentionally avoids general shadows. Root navigation/startup/legacy sheets are the main neutral hue discontinuities. Home photos are preserved across themes with different overlays/text; contrast over images must be checked spatially and on hardware, not inferred from a single body color.

Opaque sRGB token measurements ([reproducible JSON](current-contrast.json)):

| Current pair | Light ratio | Dark ratio | Interpretation |
|---|---:|---:|---|
| Primary text / group | 15.20 | 14.23 | Strong current body hierarchy |
| Secondary text / group | 5.78 | 8.76 | Clears4.5 for this pair |
| Muted text / group | 5.09 | 6.55 | Clears4.5 for this pair; not every local/transparent variant audited |
| onBrand / primary brandStrong | 9.22 | 10.09 | Strong primary button text |
| Brand / selected | 5.99 | 6.51 | Selected-label pair clears4.5 |
| Resting input border / surface | **1.34** | **1.43** | Insufficient3:1 if needed to identify the input |
| Input surface / surrounding group | **1.06** | **1.10** | Fill difference alone does not resolve the boundary concern |
| Strong border / surface | 3.46 | 3.77 | Existing stronger role is a useful starting point, not a global divider replacement |
| onFitness / fitnessAccent | 4.87 | 7.78 | Current copper button text passes this pair |

This is a **targeted non-text affordance concern**, not a blanket failure for subtle decorative borders. Labels, icons and focus help but do not justify assuming every resting field is identifiable. Inactive/disabled controls have different applicability. Final WCAG assessment needs actual adjacent surfaces, state, context and native output. No whole-app AA claim is made.

Accessibility strengths in source: role/state labels on buttons/radios/checkboxes, textual status meaning, checkmarks accompanying selected colors, disabled/busy states, focus outline in UiPressable, shared form-selection focus management, Reduced Motion preference and scalable text with explicit large-font layout branches. These must survive migration.

Risks requiring native review: legacy44-unit Android controls against the 48dp target baseline; dense12-unit archive metadata; focus order through nested sheets/menus; error announcement consistency; signed/localized money wrapping; photo text contrast; actual OS Dynamic Type and font scaling; hardware keyboard and software keyboard clearance. The synthetic320×2 atlas shows stacking and vertical growth and identifies places to inspect, but cannot prove native clipping or stable scroll behavior. A horizontally scrollable subnav showing only some items is not by itself a defect.

### Impeccable source-audit health assessment

Provisional source-level rubric, not a device benchmark or certification:

| Dimension | Score /4 | Reason |
|---|---:|---|
| Accessibility | 2 | Substantial roles/scaling/motion foundation; necessary boundary visibility and native focus/target checks remain |
| Performance | 3 | Most large operational lists virtualized/paged; Journal/occurrence archive growth and native startup/image/motion performance unprofiled |
| Appearance/theming | 2 | Strong tokens in both themes; active legacy branches and ambiguous semantic/feature ownership |
| Platform conformance | 3 | Native tabs and pushed source routes retained; shared custom sheet/picker integration needs hardware acceptance |
| Adaptivity | 2 | Phone-width/fontScale branches exist; portrait lock, tablet/window and native IME coverage incomplete |
| **Total** | **12/20** | **Acceptable foundation with significant unification/verification work**, under this bounded source rubric |

**Platform verdict:** source architecture reads as a native mobile app, with real NativeTabs, stack hierarchy and OS picker/alert boundaries. Source-level architecture passes that test; a native acceptance verdict is **pending**, not inferred from RNWeb. Custom editorial fonts/SVG content icons are approved brand exceptions, not grounds to replace the product's identity with system defaults. Android predictive-back configuration is disabled in app.json; verify intended behavior in the native pass rather than claiming observed broken navigation.

## Active legacy inventory and exclusions

Active visual debt is explicitly traced to callers:

1. Ordinary Task Edit (`task===null || visual==='v2'` gate), Task Actions and per-task Occurrence History.
2. Linked TransactionDetail.
3. Manage Commitments series/header/menu branch.
4. Active-workout Set, Note and Add Exercise, its inline create path and logged duration/distance controls.
5. Default AdaptiveSheet header/corners even when v2 canvas is requested; shared refresh notice.
6. Main screen error/retry branches still using default StatusText/FormError/FormButton; invalid source adapter fallback.
7. Root navigation color adapter, DatabaseProvider loading/failure/root backdrop and native launch config.

Work History is **excluded from the legacy-screen list**. Its default nested header/fallback issue is separately recorded. Task History Completed/Skipped and per-task Occurrence History are different components; don't conflate them. Routine Add Exercise and active-workout AddExerciseSheet are also different flows.

The module graph did not find a production import path to `tab-screen.tsx` or `work-row.tsx`; don't plan active-screen migration from those names. The `.web` color-scheme hook is a resolver exception, and generated migrations are tooling exceptions. No unused file was deleted.

## Prioritized register

See the [complete20-item register](inconsistency-register.md) for current treatment, conflicting convention, file/line and screenshot evidence, proposed correction, affected scope and risk for every finding. No finding authorizes implementation in this phase.

The first migration slice should resolve VU-04 (field boundary) and VU-05 (complete shared v2 sheet defaults), then explicitly migrate VU-01/02/03 active nested workflows. Avoid a find-and-replace of green or ThemedText: both still support legitimate semantic values and compatibility paths.

## Proposed token architecture — not implemented

Adopt **primitive → semantic → component** layers, using TypeScript objects/types compatible with the current app. The additional layers need not introduce a runtime styling library, CSS abstraction or dependency.

```text
primitives: warm neutrals, rose/plum/copper ramps, feature ramps, type/space/shape values
    ↓ explicit light/dark semantic aliases
neutral.canvas / surface / group / inset / control
text.primary / secondary / muted / onAction
brand.action / pressed / soft / onAction
feature.tasks / calendar / finance / work / fitness / journal
status.success / warning / error / info / subdued
finance.income / expense / outstanding / expected / received
border.divider / control / focus / error
    ↓ component roles and constrained variants
button.primary / secondary / quiet / destructive / navigation
field.default / focused / invalid / disabled
selection.default / selected / disabled
row / section / sheet / menu / statusBadge / chart
```

**Neutral** tokens define surfaces and text. **Brand** identifies Axis interaction. **Feature** accents identify a workspace/content type. **Semantic** tokens mean a status or financial concept. A coincident hue can share a primitive without merging these meanings. `finance.income` and `status.success` may initially resolve to the same green, but remain separate aliases. `finance.expense` should not implicitly mean error; `outstanding` stays normal financial emphasis unless overdue is actually derived by the source.

Theme selection must be explicit (`mode`/resolved palette), replacing canvas-hex equality **before** changing palette bases. Feature adapters should consume approved roles rather than spread unrelated legacy and v2 palettes. Native navigation colors should map to the same semantic roles, without changing routes or inset responsibility.

Proposed component contracts:

- Button: shared minimum target48; semantic primary/secondary/quiet/destructive; feature tone only where explicitly designed; pressed, focus, disabled, busy, selected states all specified.
- Field: distinct interactive outline and decorative divider; scalable input/label/help/error typography; explicit accessory slots. Formatting, validation and selection remain feature-owned.
- Sheet: neutral canvas, role-based corners, v2 default header/notice inherited consistently. Existing measurement, keyboard, focus, dismissal and scroll controllers remain authoritative.
- StatusBadge: text/icon/fill/border mappings from explicit source state, never inferred from title, amount or current color. Preserve source wording.
- Typography: preserve Lora/Manrope/system fallback and tabular numbers; add names for compact editorial and dense operational exceptions instead of duplicating literals.
- Spacing/shape: preserve4/8/12/16/20/24/32, v2 shape roles,48 targets; allow documented small inline/decorative sizes inside full targets.
- Icons: name inline16, supporting20, control24 and feature-tile roles as conventions, not mandatory global resizes. Keep native tab glyphs and category/measurement vocabulary.
- Motion: retain press120/selection180/indicator190/insertion220/expansion220/menu160 and Reduced Motion behavior; no added animation flourish.
- Chart: keep financial series and category colors in separate data-visualization roles with text/legend and accessible details, independent from selected action tint.

Compatibility should remain explicit during migration. First add adapters/specifications, then migrate one complete workflow, then remove a legacy role only once actual callers are gone. Do not default every legacy control to v2 globally as the first implementation step. Do not change financial calculations, recurrence history, archive paging or persistence to simplify presentation.

## Three palette proposals

Use the [interactive comparison](palette-candidates.html), [dark side-by-side](palette-dark-1440.png), [light side-by-side](palette-light-1440.png), [390 dark](palette-dark-390.png) and [390 light](palette-light-390.png). [Exact proposal tokens](palette-candidates.json) and [specimen validation](palette-validation.json) are separate from current app tokens.

Each proposal contains both themes, primary and pressed/soft states, neutral swatches, text hierarchy, a real-shaped client balance with Earned/Received distinction, primary/secondary/disabled buttons, selected transaction-type control, amount field, Work card, feature colors and semantic labels. Values are clearly illustrative; no app data is saved. The HTML uses the existing bundled fonts. The browser interaction check restores identical selected states before comparative screenshots.

| Proposal | Light brand / pressed / soft / on-brand | Dark brand / pressed / soft / on-brand | Reason / tradeoff |
|---|---|---|---|
| **A Warm Rose** | `#8A4058` / `#713248` / `#F1E1E8` / `#FFF9FB` | `#E6A4B9` / `#F0BDD0` / `#422E38` / `#2A1720` | Closest to current shared actions; least identity disruption. Must keep expense pink/category rose and selected-brand meanings distinct |
| **B Editorial Plum** | `#654568` / `#503452` / `#E9DDEA` / `#FFF9FB` | `#CEAED7` / `#E1C9E7` / `#3A2C3E` / `#251B29` | More separation from expense pink; restrained editorial identity. Revisit Journal's plum relationship so brand and feature do not collapse |
| **C Soft Copper** | `#874833` / `#713926` / `#F1DDD3` / `#FFF8F2` | `#E7AA8B` / `#F0BDA3` / `#462F27` / `#291911` | Echoes Home spending warmth; strongest connection to hearth. Keep warning amber distinct and resolve current copper Fitness identity |

All three deliberately share the current warm base neutrals for a fair comparison: canvas `#F5F0EA`/`#151315`, surface `#FFFCF8`/`#1B181A`, group `#FBF5F0`/`#242024`, control `#F8F3EF`/`#2B272A`; primary/secondary/muted text retain the current v2 values. They propose stronger control borders `#9B837B` light and `#95828E` dark, while preserving subtle divider colors `#E4DAD4`/`#3A3337`.

Common proposed semantic relationships: success/received green `#32664E`/`#A8D0B7`; warning/overdue amber `#805619`/`#DFC18B`; error/destructive `#9B303E`/`#F0ABAB`; information `#3D5E86`/`#B4CEE8`. Retain independent financial income/expense aliases; current chart green/pink is a reasonable initial financial mapping, not a reason to make expense equal danger. Preserve amounts/signs/labels and categorical chart colors.

Proposed feature relationships, identical across the three comparison plates so the brand variable can be assessed:

| Feature | Light accent | Dark accent | Meaning / approval note |
|---|---|---|---|
| Tasks | `#505A8A` | `#AEB7E8` | Indigo categorical/actionable task identity |
| Calendar | `#5C587F` | `#C2B9E2` | Quiet time-navigation accent; source marker palette stays categorical |
| Finance | `#7B425E` | `#DFA6BF` | Financial workspace accent, separate from income/expense semantics |
| Work | `#245C49` | `#BCEAD5` | Green work identity, separately aliased from received money |
| Fitness | `#2D6651` | `#BCEAD5` | **Proposed** emerald relationship to Home; current Workout is copper, so requires approval |
| Journal | `#69427B` | `#E9C9F2` | **Proposed** reflective plum relationship; current destination is green, so requires approval |

Measured proposal minimums across candidates: primary text 6.64:1 light  / 8.35 dark; selected text 5.33 /6.18; metadata 6.11 /9.61; control border 3.28 /4.48 against tested surface/group pairs. Body/canvas 14.51 /16.38. JSON records each candidate's pressed text and other pairs. These checks cover the specimens, not every future app state or photograph.

**Recommendation for review:** use A as the continuity baseline, B to assess clearer brand/expense separation, and C to assess warmer identity. No candidate is chosen or applied. Home art remains unchanged under all three. Feature mappings and control-boundary policy should be approved alongside the brand direction.

## Screenshot provenance and unavailable coverage

The atlas uses actual current components through the existing RNWeb/esbuild preview infrastructure. SQLite-authored synthetic fixtures supply realistic tasks, payments, schedules, sessions and journal records. Some builders substitute feature read hooks or in-memory adapters; they are not the user's live database. Native boundaries, router transitions, safe areas, font loading, motion and data access are substituted as necessary. `fitness-workout`, `fitness-active` and `tasks` are labeled static source renders; auxiliary cases are component-only fixtures.

Every original atlas PNG embeds this provenance. [manifest.json](atlas/manifest.json) records case/width/theme/steps, source HEAD, builder HTML and bundle hashes, runtime errors and visible-control geometry. Captures are **first-viewport screenshots**, not proof all scroll content is visible. Atlas contact sheets and comparisons are for scanning; open originals for judgment. All final154 cases captured successfully with no reported page errors. This is capture validation, not a functional regression suite.

The seven responsive representatives are Home Attention, Calendar, Finance Overview, Transactions, Client Details, Routine Editor and Journal context. Each has both themes at 390 normal,320 doubled and 430 normal. Large text combines fixture fontScale branching with CSS text doubling. It is a stress proxy, not native Dynamic Type. The initial Home viewport may scroll after focus/reflow in that synthetic harness; do not report it as a confirmed native regression.

Not captured natively or exhaustively: real tab/status bars, push transitions, OS alerts/destructive confirmations, iOS/Android date/time pickers, software keyboard, screen readers, tablet/multi-window, launch/splash/database-failure screens, Journal live conflict dialogs and every recurrence/commitment/measurement subvariant. Those paths were inventoried from source and marked source-only. No fake native chrome or alert screenshots were added. Browser menu/category captures do not establish OS accessibility focus behavior.

## Roadmap and regression boundaries

| Phase | Work | Exit gate |
|---|---|---|
| **2 — Approval** | Select/refine A/B/C; approve neutral/control borders, feature matrix, semantic meanings and typography exceptions | Explicit design decision, recorded role map; no migration hidden inside approval |
| **3 — Foundations** | Introduce semantic/component adapters; remove color-hex mode predicates; complete v2 sheet/header/notice state propagation; define field borders, type/shape/target roles | Paired dark/light samples for every control state; keyboard/focus and native root/theme check; legacy caller compatibility |
| **4a — Nested active paths** | Ordinary Task Edit/actions/occurrences; linked TransactionDetail; Fitness set/note/add; Manage Commitments | Complete workflow visual review, actual actions and state/paging untouched |
| **4b — Feature mappings** | Tasks/Calendar → Finance/Commitments → Work → Fitness → Journal, in reviewable slices | Source semantics and named feature exceptions verified per slice; Work History reused, not rebuilt |
| **4c — Shell and Home integration** | Native root/startup mapping and approved Home interface tokens only | Five photographs/two textures unchanged; expansion/scroll/native insets intact; no custom tab bar |
| **5 — Final verification** | Whole-app atlas + functional/a 11y/performance/native pass | Approved role system, all migration slices accepted, remaining exceptions documented |

High-risk boundaries: recurrence draft/picker state; historical schedule versions; payment allocation/linkage/undo; archive paging/windowing; list identity/scroll restoration; conditional action availability; header height and keyboard reveal; native tabs and safe areas; reduced-motion handling and font loading. Foundation changes must not mutate domain outputs to make visual snapshots match.

For implementation validation, run focused feature regressions, TypeScript, ESLint baseline comparison, full suite and iOS/Android exports as required by each slice. Source-only palette/token additions cannot substitute for native verification. Do not profile huge archives or reorganize domain services as a cosmetic side effect; VU-15 requires evidence before performance work.

## Native verification and acceptance gates

Use at least one iPhone and Android phone, both themes and normal plus large OS text. Include320/390/430-equivalent layouts where hardware/emulators permit, then tablet/windowing if supported. Test:

1. Root launch/loading/failure appearance, system status/tab bars, selected tabs, native push/back and Android back behavior.
2. Default and custom sheet header height, dismissal/return, nested picker/menu transitions, keyboard/IME clearance and final-row visibility above native tabs.
3. VoiceOver/TalkBack reading order, state announcements, error/retry announcements, focus restoration, disabled/busy and destructive actions.
4. Long titles/localized amounts, recurrence metadata, compact financial grids, empty/heavy lists and paging/scroll restoration.
5. Home art text contrast, collapsed/expanded/switch/collapse height and stable scroll, direct Fitness/Journal navigation; no reserved panel space added by token work.
6. Reduced Motion/Remove animations, frame behavior on scrolling/press/expansion, startup/image memory and very long archives.

The actual app is Expo`~58.0.17`, Router`~58.0.25`, React Native`0.88.0`. SDK 58 versioned references were consulted for feasibility, particularly [SDK 58](https://docs.expo.dev/versions/v58.0.0/), [NativeTabs](https://docs.expo.dev/versions/v58.0.0/sdk/router/native-tabs/) and [theme support](https://docs.expo.dev/develop/user-interface/color-themes/). The existing five NativeTabs triggers remain authoritative. Home retains native automatic tab insets; Tasks/Calendar/Finance/Fitness disable automatic tab insets and have their established owners. Do not add safe-area padding to every scroll view indiscriminately.

## Skill contributions

- **Anthropic frontend-design:** evaluated the app as an operational mobile product with editorial expression; preserved Home as the atmospheric focal point; built three realistic, same-layout palette specimens using current typefaces and financial hierarchy instead of generic swatch mood boards.
- **Impeccable:** used the native source-audit rubric plus iOS/Android references; distinguished active legacy paths from compatibility artifacts; assessed hierarchy, type, surfaces, state and contrast; treated browser screenshots as supplemental evidence because the user requested them. No web detector was used to certify React Native. Current-vs-convention and later acceptance criteria are explicit in the register.
- **UI/UX Pro Max:** targeted guidance on status meaning and text scaling reinforced text/icon+color communication and large-font layouts. Applied this to selection checks, signed/labeled money, control boundaries, targets and responsive validation. Dataset suggestions were filtered against Axis's approved fonts and mobile behavior.
- **Expo Skills — building-native-ui:** checked source ownership of NativeTabs/stack routes, shared controls, sheets, form-focus/keyboard and native picker boundaries. Used installed SDK 58 docs rather than assuming older APIs; rejected tab/inset or route changes as a way to unify appearance. No app API was edited.
- **Design-system:** applied the primitive→semantic→component model; separated brand/feature/semantic/neutral layers and proposed incremental compatibility adapters rather than a global color replacement.

Skill guidance does not override the brief: approved custom fonts, Home photography, existing navigation/gesture/data behavior and audit-only scope remain authoritative. PRODUCT.md's SDK 57 description and missing root DESIGN.md are documented drift; they were not silently repaired.

## Questions requiring design approval

1. Which brand direction should advance: A Warm Rose, B Editorial Plum, C Soft Copper, or a specified refinement?
2. Should Fitness destination accents remain current copper/rose, or adopt the proposed emerald relationship to Home? Should Journal retain quiet green or move to reflective plum?
3. Should Work's green identity extend to job/client details, while financial received/success remain separately named semantic roles?
4. Should Calendar selected-day green remain, or align with a distinct Calendar/brand selection role while retaining categorical source markers?
5. Approve stronger **interactive** field boundaries while leaving decorative dividers subtle? Approve the named editorial/operational/compact type roles and preserved density exceptions?
6. Confirm native startup/root neutral alignment belongs in the foundation migration; any launch/icon asset change should be separately reviewed.

These are concrete review choices for Phase 2. No further app implementation has begun.

## Validation, support-code disclosure and Git state

Initial worktree was clean on `main`, HEAD`16ebeab` (Client details update). Audit additions are confined to `docs/design-system/` and four new scripts:

- `scripts/audit-visual-unification.cjs`: AST/token/baseline inventory, fresh incumbent preview builds, current contrast calculations, palette validation and unchanged-file verification.
- `scripts/preview-visual-audit-auxiliary.ts`: isolated nested-state fixtures with actual source components and synthetic SQLite-authored records; writes only ignored `dist/visual-audit-auxiliary`. Does not edit an incumbent builder or production component.
- `scripts/capture-visual-audit.cjs`: new atlas capture/index/contact/comparison driver; fresh output only under this audit folder; native/browser provenance embedded.
- `scripts/build-palette-specimens.cjs`: standalone unapproved JSON/HTML specimens and analytic pair measurements; never imported by the application.

The review uses the existing installed browser/Playwright tooling; no dependency was added. Paths can be configured with `AXIS_PLAYWRIGHT_PATH` and `AXIS_CHROMIUM_PATH`. Capture adapter corrections and the isolated refresh fixture correction were made **only to audit support code**; final capture evidence uses verified History navigation and one actual refresh notice.

Validation commands/results and unchanged-file proof are recorded in [validation.md](validation.md). Current source/asset/config/context and all earlier preview evidence are hashed in a 2,232-file baseline; no application styling/behavior changed. Existing review evidence was not overwritten. Documentation/support additions are uncommitted; no commit or push.

Phase 1 intentionally does not run new app migrations, native builds or app exports: there is no runtime change. Native and functional implementation gates remain listed above, not claimed passed by this audit.

# Axis Calm Utility foundation (Stage 13A)

Shared presentation only. Feature layouts, navigation, validation, persistence, and interaction flows remain feature-owned. No custom fonts or dependencies were added.

## Token organization

`src/constants/theme.ts` keeps colors, type, space, radius, control sizes, surface mappings, and status mappings together. `src/components/control-appearance.ts` resolves control states without domain logic. Existing `Spacing`, color aliases, and legacy `ThemedText` types remain compatible while later screen stages migrate.

### Color roles

| Role | Light | Dark |
| --- | --- | --- |
| background | #FAFAF9 | #121615 |
| surface | #F1F3F1 | #1D2421 |
| surfaceRaised | #FFFFFF | #28312D |
| surfaceMuted | #E9EEEA | #18201C |
| textPrimary | #17211D | #EDF3EF |
| textSecondary | #4E5E55 | #B7C5BC |
| textMuted | #59675E | #A2B1A8 |
| border | #CBD3CE | #48594F |
| borderStrong | #77857C | #81968A |
| accent | #28634F | #9DCAB6 |
| accentMuted | #E4F0E8 | #263F33 |
| onAccent | #FFFFFF | #12231B |
| success | #276242 | #9CCBAD |
| warning | #825A14 | #DFC18B |
| danger | #A53535 | #F0ABAB |
| info | #315E88 | #A6C5E3 |
| scrim | rgba(16,24,20,0.28) | rgba(0,0,0,0.48) |

The restrained green accent distinguishes principal actions, focus, and selection without assigning a separate brand color to every module. Dark mode uses a softer green with dark text on filled primary actions. Calendar source colors remain unchanged.

Native tab selection and navigation-header colors use these same roles. All five tab destinations, native icons, route declarations, back behavior, and secondary Journal placement remain unchanged. Finance/Fitness internal navigation is not migrated in this stage.

Text/status colors are tested at 4.5:1 or better against all four opaque surface roles. Accent text is tested against its selected surface; onAccent against accent. Subtle border is for grouping, not an essential standalone state indicator. Focus uses accent. Disabled controls keep full opacity with readable muted colors.

### Type

System typography; sizes/line heights in points:

| Role | Size / line height | Weight |
| --- | --- | --- |
| screenTitle | 32 / 40 | 600 |
| sectionHeading | 20 / 28 | 600 |
| sheetTitle | 18 / 24 | 600 |
| cardTitle | 16 / 24 | 600 |
| body, input | 16 / 24 | 400 |
| secondary, metadata | 14 / 20 | 400 |
| button | 14 / 20 | 600 |
| metric | 28 / 36 | 600, tabular numerals |

Use `ThemedText type="sheetTitle"`, etc. Font scaling remains enabled. Legacy types preserve existing feature sizing and weights. The former hard-coded primary-link blue now resolves through accent.

### Space, radius, and surfaces

- `Space`: micro 2, xs 4, sm 8, md 12, lg 16, xl 24, xxl 32. Micro spacing is reserved for compact metadata.
- `Radius`: small 4, control 8, surface 8, overlay 12. No pill convention.
- `ControlSize`: touch 44, field 48, indicator 24. Controls may grow with content/text scaling.
- `SurfaceColors`: screen → background; grouped → surface; raised/overlay → surfaceRaised.
- `ThemedView surface="grouped"` opts into a surface role. Existing `type` color overrides retain precedence.

## Button roles

`FormButton variant="primary | secondary | quiet | destructive | navigation"` defaults to secondary. Existing callers keep their callbacks, labels, selected state, and disabled behavior.

- Primary: filled accent and onAccent text; one principal action per immediate context.
- Secondary: neutral surface and subtle outline.
- Quiet: transparent, no ordinary outline; for dismissal/context actions.
- Destructive: danger text on a neutral surface; only for meaningful loss. Do not infer a role from the label.
- Navigation: bottom selection indicator and visible selected checkmark; available for later internal-navigation migration.

`compactNavigation` opts a navigation button into single-line text, compact horizontal padding, and an underline/background selection indicator without appending a checkmark. Selected/unselected labels, font metrics, padding and border dimensions stay identical; 44-point minimum targets remain. Finance uses this inside a nonwrapping horizontal strip with explicit large-text overflow. Other consumers retain their default presentation.

Disabled controls use readable muted text/surfaces, not blanket opacity. Selection/checkmarks and accessible states remain intact. Focus adds a border cue; primary focus contrasts its border with its fill. Press feedback uses modest opacity while available.

Default sheet headers and inline category creation adopt primary confirmation and quiet cancellation. Existing custom Task/Transaction/category/recurrence-history headers receive the same title/dismiss/confirm roles without moving their actions. Other feature actions await their screen-specific stage.

## Fields and selection

- `FormField editable={false}` or `readOnly` means an authoritative locked value: full-opacity primary text, muted surface, stronger border, visible “Read only” label and accessible hint. It stays noneditable. `disabled` explicitly means unavailable.
- Focused fields/expanded selectors use accent borders and raised surfaces. Expanded selectors also reverse their chevron. Focus callbacks still forward to the existing keyboard/scroll machinery and caller.
- Single-line FormField inputs use native font metrics, zero native vertical padding and native vertical centering in the same 48-point minimum control. Horizontal padding, font size/weight and border width stay shared. iOS React Native applies input padding inside UIKit's already-computed text/editing rectangles; the former 8-point top/bottom insets could displace rendered text even while the empty control looked normal. Focus changes colors only, and value never selects a different geometry. Multiline fields retain 8-point vertical padding, 24-point paragraph line height and top alignment. No fixed height constrains accessibility font scaling.
- Optional `error` on FormField/FormSelect/SelectField adds an invalid state, danger border, and adjacent alert text; errors outrank focus. Native hints include the message. No validation rules were changed or auto-mapped.
- `FormError` is danger text with existing alert/live-region semantics.
- `StatusText tone="neutral | attention | success | subdued | danger | info"` is text-first; callers provide meaningful words. It derives no domain status and introduces no badge container.
- Menu choices are flat touch-friendly rows with selected checkmarks. Autocomplete Create and category creation actions have a divider and quiet action treatment.

Anchoring, option data, search-versus-identity rules, outside dismissal, focus return, creation callbacks, scrolling, and modal stacking remain unchanged.

## Sheets

AdaptiveModal adds a themed scrim to the existing outside-dismiss target. AdaptiveSheet and selection menus use the overlay surface/radius. Sheet anchoring, measured height, fixed header, viewport/safe-area/keyboard calculations, and square bottom corners remain unchanged. A subtle top border separates sheets; menus retain modest existing Android elevation.

## Stage 13A scope / device review

No Home, Task-row, Calendar-grid, Dashboard, Commitment, Work, active-workout, or Journal-editor layout redesign. No moved Delete actions, inline set editing, sticky Finish, or relocated navigation/actions. Internal-navigation adoption, screen-level status treatment, metrics, and row density follow later.

Verify iPhone light/dark, scrim separation, long sheet titles/labels, large accessibility text, VoiceOver, keyboard focus/scrolling, category creation, and locked Work payment amounts. Automated styling and contrast checks do not replace physical testing.

Stage 13B applies these roles to the inline active Workout, Fitness internal navigation and focused logging/actions. See [Active Workout](active-workout.md) for its layout, safe-area, keyboard and device-review decisions.

Stage 13C applies these roles to Tasks rows, contextual actions, grouped editing and focused recurrence configuration. See [Tasks experience](tasks-experience.md) for interaction, recurrence-version and device-review decisions.

Stage 13D applies screenTitle, navigation, metric and compact status roles to the Finance shell and Overview. See [Finance Overview](finance-overview.md) for period controls, exact spending presentation, responsive layout and device-review decisions.

Stage 13E applies compact obligation rows, primary Pay, anchored secondary/series actions and focused management/History to Commitments. See [Commitments experience](commitments-experience.md) for hierarchy, payment context, lifecycle and device-review decisions.

Stage 13F presents Jobs first: Title, Client context, description preview and each job's financial status. Outstanding is the primary supporting metric; Client balances live in focused management/detail and settled jobs in paged History. See [Work experience](work-experience.md) for legacy Title compatibility, allocation, identity, lifecycle and device-review decisions.

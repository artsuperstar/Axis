# Axis — Soft Copper design specification

Phase 2 · 12 November 2026 · source `16ebeab` · **specification only, no runtime migration**.

[Review index](soft-copper/index.html) · [Specimen](soft-copper/specimen.html) · [Exact token register](soft-copper/token-register.md) · [Resolved tokens/state bindings](soft-copper/tokens.json) · [Contrast results](soft-copper/contrast.json) · [Migration plan](soft-copper-migration-plan.md) · [All 20 findings](soft-copper-traceability.md)

## 1. Decision and authority

**Palette C — Soft Copper is the approved Axis primary brand direction.** Preserve primary light `#874833` and dark `#E7AA8B`, and warm canvas light `#F5F0EA` / dark `#151315`. Current v2 remains rose in runtime; this document does not imply that the app has migrated.

The selected C source also supplies light pressed `#713926`, subtle `#F1DDD3`, on-primary `#FFF8F2`; dark pressed `#F0BDA3`, subtle `#462F27`, on-primary `#291911`. These are inherited from the selected proposal, not silently replaced by Warm Rose or Editorial Plum. [Phase 1 source](palette-candidates.json) and [original comparison](palette-candidates.html) remain unchanged.

Soft Copper expresses interaction and brand. It does **not** mean money, success, warning, overdue, error, completion or received payment. Neutral financial data remains primary/secondary text; status colors remain source-derived and worded. Warm Editorial Hearth keeps editorial Lora headings, practical Manrope operational text, compact layouts and restrained surfaces. Home remains the photographic focal point; the specimen is deliberately an operational component reference, not a replacement product dashboard.

Approval categories in the token register:

- **Approved:** primary Soft Copper direction and exact selected primary pair.
- **Inherited:** copied from selected C, common Phase 1 values, actual v2/legacy tokens, active Overview colors or approved Home pigments. Inheritance establishes provenance, not separate approval of every feature migration.
- **Proposed addition/mapping:** a missing semantic role, new soft status fill or consolidation. These are named explicitly, not passed off as current tokens.
- **Proposed alias:** new purpose name resolving to an existing pigment; no extra color. The entire proposed contract still requires Phase 2 review before implementation.

## 2. Complete color contract

The exhaustive [60-token register](soft-copper/token-register.md) gives **name, purpose, exact dark/light HEX, pairing, provenance, replaced value and consumers for every token**. [tokens.json](soft-copper/tokens.json) includes resolved light/dark objects, all component bindings and retained categorical chart arrays. They are review data, never app imports.

### Canonical values

Values in this table are **dark / light**; preserve the existing camelCase vocabulary in `DesignColors` rather than introduce a second naming/provider system.

| Role | Dark | Light | Purpose and provenance |
|---|---|---|---|
| brand | `#E7AA8B` | `#874833` | Approved primary action and selection foreground |
| brandStrong | `#F0BDA3` | `#713926` | Selected C pressed/hover fill; **default primary uses brand**, unlike today's UiButton |
| brandSoft | `#462F27` | `#F1DDD3` | Selected C subtle/selected fill |
| onBrand | `#291911` | `#FFF8F2` | Selected C primary text/icon |
| canvas / overlay | `#151315` | `#F5F0EA` | Warm screen and measured sheet/dialog base |
| surface | `#1B181A` | `#FFFCF8` | Input/regular surface |
| group | `#242024` | `#FBF5F0` | Contained content |
| groupStrong / controlPressed | `#2B2429` | `#F7EDE8` | Stronger flat group / neutral pressed feedback |
| surfaceRaised | `#2B2429` | `#FFFCF8` | Proposed elevated menu role using existing pigments |
| inset | `#191619` | `#F0E9E5` | Read-only/disabled surface |
| control | `#2B272A` | `#F8F3EF` | Neutral control / neutral chip |
| textPrimary / outstanding | `#F6F0ED` | `#241E1C` | Body, labels, exact amounts; outstanding is not warning by default |
| textSecondary / pending | `#C9BDB8` | `#6A5E59` | Supporting text and neutral pending state |
| textMuted / textDisabled | `#AFA39E` | `#746660` | Placeholder/support; unavailable text, without opacity reduction |
| border | `#3A3337` | `#E4DAD4` | Decorative separator/card edge; not required control outline |
| controlBorder / borderStrong | `#95828E` | `#9B837B` | Phase 1 proposed stronger neutral control boundary |
| success / completed / received / financeIncome | `#A8D0B7` | `#32664E` | Separate aliases: positive status vs actual financial data |
| successSoft | `#20382D` | `#E4F0E8` | Proposed dark positive fill; legacy light fill inherited |
| attention / overdue | `#DFC18B` | `#805619` | Warning and source-derived overdue |
| attentionSoft | `#4C3928` | `#FBEACF` | Existing warm warning fill |
| danger | `#F0ABAB` | `#9B303E` | Error/destructive/invalid outline |
| dangerSoft | `#432A30` | `#F6E2E5` | Proposed subdued error/destructive fill |
| info | `#B4CEE8` | `#3D5E86` | Information |
| infoSoft | `#243345` | `#E6EDF5` | Proposed quiet information fill |
| financeExpense | `#F1A9B4` | `#94455C` | Inherited current expense series; expense is not error |
| taskAccent / taskText | `#AEB7E8` | `#505A8A` | Phase 1 indigo identity proposal; `taskText` compatibility alias |
| taskAccentSoft | `#303247` | `#E6E7F3` | Existing task tile fill |
| workAccent | `#BCEAD5` | `#245C49` | Phase 1 green identity proposal, distinct from received status |
| workAccentSoft / fitnessAccentSoft | `#11291F` | `#E9F1E9` | Proposed identity mapping from Home pigments |
| fitnessAccent / fitnessText | `#BCEAD5` | `#2D6651` | Proposed emerald destination identity; current runtime Workout is copper |
| journalAccent | `#9DCAB6` | `#28634F` | Preserve actual quiet green Journal identity |
| journalAccentSoft | `#263F33` | `#E4F0E8` | Preserve actual Journal tile/selection pigment, newly named feature role |
| onFeature / onFitness | `#151315` | `#FFFCF8` | Foreground on filled feature colors; `onFitness` compatibility alias |
| calendarTask | `#93C5FD` | `#2563EB` | Existing Task source marker |
| calendarCommitment | `#FBBF24` | `#B45309` | Existing Commitment source marker, not a warning detector |
| calendarWorkPayment | `#5EEAD4` | `#0F766E` | Existing expected Work payment source marker, not received Income |
| scrim | `#0000007A` | `#10181447` | Existing backdrop RGBA rounded to 8-bit HEX alpha; composite over content |
| shadowColor | `#00000000` | `#2D1C2C24` | Existing restrained light shadow tint; transparent dark shadow |

Remaining exhaustive aliases: `brandFocus`, `brandBorder`, `brandDecorative`, `homeAccent`, `calendarAccent`, `financeAccent` → `brand`; `selected`, `brandSelection` → `brandSoft`. There is no second decorative copper ramp. `brandDecorative` is optional small branding, not a mandatory UI ornament. No private feature may override brand focus or error semantics to match its tile hue.

Current categorical chart arrays remain exactly:

```text
dark  [#F1A9B4, #B6C1B5, #E4C28E, #A9C9EA, #9BCBB5, #9A9999]
light [#94455C, #667260, #92703A, #4D729A, #40765D, #797371]
```

They are source categories with labels/legend, not button, success or severity tokens. No new distinct decorative financial palette is needed for pending, outstanding, earned or expected. Those use neutral text; overdue only uses amber when source logic says overdue.

### Interaction bindings

| State/variant | Background | Foreground | Boundary / indicator |
|---|---|---|---|
| Primary normal | brand | onBrand | brand |
| Primary hovered/pressed | brandStrong | onBrand | brandStrong; interaction only, never persisted selection |
| Secondary normal | control | textPrimary | controlBorder |
| Secondary hovered/pressed | controlPressed | textPrimary | controlBorder |
| Tertiary/quiet | transparent | brand for action, textPrimary for neutral row | No resting outline; controlPressed on press |
| Destructive | dangerSoft | danger | danger; confirmation remains source/native owned |
| Selected control | selected | brand | brand + check/selected/checked state |
| Unselected control | control | textSecondary | controlBorder where boundary identifies the control |
| Focus | Current state's fill/text | Current state's text | brandFocus ring2, neutral separation2; filled primary also uses onBrand inner keyline if required by native rendering |
| Disabled/busy unavailable | inset | textDisabled | border; no fade of the whole group; inaccessible to activation, state announced |
| Input/default search/select | surface | textPrimary; placeholder textMuted; label textPrimary | controlBorder1 |
| Input focused/expanded | surface | textPrimary | brandFocus2; native text selection/caret brand |
| Input invalid | surface | textPrimary | danger2 + error text/icon; focus ring remains separately visible |
| Input read-only | inset | textPrimary | controlBorder; explicit read-only, selectable data where supported |
| Input disabled | inset | textDisabled | border; disabled is not read-only |
| Positive status chip | successSoft | success | No unnecessary border; explicit Completed/Received label/icon |
| Warning/overdue chip | attentionSoft | attention | Label/icon, never inferred from amber itself |
| Pending/neutral chip | control | textSecondary | No new color; semantic wording source-owned |

Focus is an interaction overlay, not a mutually exclusive state: invalid+focused keeps the danger boundary/error and a copper outer focus indicator. Disabled wins over interaction and prevents activation. Pressed is transient. Native tab state is not a custom segmented control: map `backgroundColor=canvas`, `tintColor/selected label+icon=brand`, default label/icon=`textSecondary`, `indicatorColor=brandSoft`; OS owns layout/material/shape.

## 3. Contrast and input-boundary correction

All measurements are exact source HEX sRGB luminance calculations, compared **before rounding**. [126 measured pairs](soft-copper/contrast.json) include required and informational counterexamples. All **118 required pairs pass**. Eight informational pairs comprise two themes each of disabled text, current boundary, current fill and selected fill alone. Numerical passing is not whole-app or native accessibility certification.

| Pair | Dark | Light | Use |
|---|---:|---:|---|
| Body / group; form labels / group | 14.23 | 15.20 | Normal text |
| Secondary / group | 8.76 | 5.78 | Supporting text |
| Primary on-brand / brand | 8.47 | 6.64 | Normal button text |
| Primary pressed | 10.08 | 8.62 | Text remains readable in feedback state |
| Secondary button text / control | 13.04 | 14.92 | Normal text |
| Placeholder / surface | 7.18 | 5.39 | Placeholder remains readable; visible label still required |
| Selected text / selected fill | 6.20 | 5.33 | Selected label + check/state |
| Completed/received chip | 7.43 | 5.70 | Semantic text |
| Overdue chip | 6.31 | 5.45 | Semantic text |
| Error chip | 6.89 | 5.87 | Semantic text |
| Information chip | 7.91 | 5.66 | Semantic text |
| Pending chip | 8.03 | 5.68 | Neutral semantic text |
| Disabled text / inset | 7.31 | 4.59 | Informational; inactive components exempt from these minimum criteria |
| New control border / surface | 4.92 | 3.46 | Required boundary |
| New control border / group | 4.48 | 3.28 | Adjacent outer surface |
| New control border / raised surface | 4.23 | 3.46 | Menu outline |
| Focus / surface | 8.82 | 6.83 | Meaningful indicator |
| Invalid boundary / surface | 9.33 | 7.11 | Invalid indicator, accompanied by text |
| onFeature / task fill | 9.45 | 6.48 | Filled identity tile |
| onFeature / Work fill | 13.97 | 7.60 | Filled identity tile |
| onFeature / Fitness fill | 13.97 | 6.56 | Filled identity tile |
| onFeature / Journal fill | 10.17 | 6.87 | Filled identity tile |

Correction: resting current input border is only **1.43 dark /1.34 light** against input surface, while the fill vs group is only **1.10 /1.06**. Use the stronger **neutral** `controlBorder` for fields/selects/search/amounts, preserving the subtle `border` for decoration. This addresses identification without putting bright copper borders on every card.

Selection fill alone is only **1.19:1** against control in both themes. Do not rely on that fill: keep copper text/outline/check and checked/selected accessibility state. Copper outline and meaningful icon pairs are measured on each neutral surface. The new style must not regress keyboard focus, which current UiPressable and field state already expose.

Use4.5:1 for normal text,3:1 for applicable large text and meaningful non-text components, with inactive/decorative exceptions interpreted in context. Follow [WCAG text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). The2-unit separated focus ring is a project contract; do not misstate enhanced AAA focus-area requirements as general AA. Thin glyphs, antialiasing, photographs, alpha-composited overlays and native OS materials still require visual/native checks.

## 4. Feature mapping and brand restrictions

| Feature | Shared interactions | Identity retained/proposed | Restrictions / expected change |
|---|---|---|---|
| Home | Copper Retry, new transaction modal/shared actions; future emblem ring | **Preserve** five Today/Attention/Fitness/Journal/Spent images, their per-card colors, both textures and expansion linkage | No copper wash over photos; no added panel height or custom tab chrome; no progress/status recoloring by brand |
| Tasks | Copper New/Save/selected internal navigation/selection/focus | Indigo task identity via taskAccent; existing priority/source distinctions | Completion uses success, stopped/skipped keep labels; ordinary Edit/actions/history need targeted migration |
| Calendar | Copper selected-day, Today/navigation/focus | Existing blue/amber/teal source markers and legend | Source markers do not denote money received, severity or status; task completion remains semantic |
| Finance | Copper actions, filters, selection and focus | Precise neutral amounts and existing categorical chart palette | Income green/expense pink remain financial roles; expense is not error; no altered sums/grouping |
| Work | Copper Add/Record/Save/shared selected controls | Green identity extends main briefcase to job/client identity tiles; source financial hierarchy retained | Green identity ≠ paid; received status success, outstanding neutral, overdue amber; no receipt/allocation change |
| Fitness | Copper shared primary/secondary/selected controls and focus | **Propose emerald** identity/progress/tile relationship to Home across destination; current Workout copper changes only when approved | Completion remains source status; no recolor of Home image; no new set/completion semantics |
| Journal | Copper common Save/Back/options/focus | **Retain quiet green** mood/reflection identity and neutral writing surface; Home Journal remains plum photograph | A selected mood is an interaction state with label/check, not a good/bad success/error grade; no copper writing-surface wash |

The Phase 1 purple Calendar/rose Finance and plum Journal feature proposals were unapproved. This Phase 2 spec deliberately uses copper for Calendar/Finance shared interaction and retains actual Journal green. That is a **proposal refinement**, not issue reprioritization. VU-11 remains P2. Only Fitness identity expansion and light emblem treatment require focused design choices beyond accepting this complete specification.

## 5. Typography

Use existing bundled families: **AxisLora-SemiBold** for editorial display, **AxisManrope-Regular / AxisManrope-SemiBold** for UI/data. Design intent weight600 is encoded by selecting the semibold font file; retain RN's named-face weight400 convention to avoid synthetic bold. Regular is400. Keep system fallback for load failure and explicit system mode.

| Role / existing mapping | Face | Size / line | Weight intent | Letter spacing |
|---|---|---|---|---|
| Page / screenTitle | Lora |36/46 |600 |0 |
| Editor / editorial sheet title (editorTitle) | Lora |26/34 |600 |0 |
| Compact editor title (named exception) | Lora |24/32 |600 |0 |
| Narrow compact title (measured need) | Lora |22/30 |600 |0 |
| Operational sheetTitle | Manrope |18/24 |600 |0 |
| Editorial section / editorSection / photographic card heading | Lora |20/28 |600 |0 |
| Operational sectionHeading | Manrope |20/28 |600 |0 |
| Dense list/cardTitle | Manrope |16/24 |600 |0 |
| Compact archive title (existing Task exception) | Manrope |15/22 |600 |0 |
| Body / input | Manrope |16/24 |400 |0 |
| Secondary / metadata / placeholder | Manrope |14/20 for metadata; input placeholder16/24 |400 |0 |
| Caption | Manrope |12/18 |400 |0 |
| Small status / smallLabel | Manrope |12/18 |600 |0 |
| Form label / fieldLabel | Manrope |14/20 |600 |0 |
| Button / numeric | Manrope |15/22 |600 |0 |
| Metric / financial total | Manrope |30/38 |600, tabular |0 |
| Selected editorial financial display | Lora |30/38 |600, tabular request where supported |0 |
| Compact financial totals | Manrope |20/28 or16/24, named existing density variants |600, tabular |0 |

Keep Task page38/48 and existing compact12/17 archive metadata as documented local exceptions until a reviewed migration confirms equivalent wrapping; do not bulk-normalize them. Dense financial/table/list text stays sans-serif. Native single-line input text centering remains native-owned; do not impose multiline line-height/padding onto it. Multiline body16/24 uses top alignment.

Dynamic Type/font scaling remains enabled, without `allowFontScaling=false` or an arbitrary font multiplier cap. These are base sizes, not fixed boxes. At fontScale>=1.5 allow stacked labels, controls and headers; use measured available width for compact title choices, not smaller text to conceal overflow. No fixed-height text row. Preserve existing title/amount grouping, wrap signed currency coherently, and keep controls reachable by scroll. Native large text still needs acceptance; HTML scaling is only a proxy.

## 6. Spacing, shape and surfaces

Spacing scale stays **4/8/12/16/20/24/32** (`xs/sm/md/lg/section/xl/xxl`). Legacy2 remains a documented glyph/separator micro exception, not default page spacing. Use existing max content width640 for operational screens. Avoid shared fixed content height/minHeight intended to reserve future expansion.

| Contract | Base values / behavior |
|---|---|
| Page horizontal padding |16; do not add a second safe-area allowance |
| Standard card/editor group padding |12 compact;16 regular;24 only for an existing spacious/empty composition |
| Section gap |20; major section separation24 |
| Compact row |12 horizontal /8 vertical, content-driven height; target>=48 |
| Row title→metadata |4; parallel columns12; multiline groups8 |
| Form label→control / field group gap |8 /16; help/error gap4–8; editor section gap20 |
| Button |Minimum48 height/width;12 horizontal /8 vertical; grow with text, no fixed48 box |
| Field/select/search |Minimum48;16 horizontal; native single-line vertical centering retained; multiline8 vertical and minimum96 |
| Icons / targets |Inline16, supporting20, control24; feature tile36 compact or48 regular; visible glyph size does not shrink hit target |
| Sheet |Header16 horizontal/12 vertical; body16 by default, existing compact editor12 allowed; child gaps12; safe-area bottom remains measured by current owner |
| Dialog |16 padding,12 group gap,8 action gap; native Alert remains OS-owned |
| Shapes |Group16, raised18, control10, inset8, status8, menu12, sheet20, FAB28 |
| Boundaries |Decorative1 border; meaningful control1 controlBorder; focused/invalid2; focus offset2 |

| Surface | Dark/light treatment | Elevation |
|---|---|---|
| Screen |canvas |None |
| Regular card |group or existing surface variant; optional border |Flat, no universal shadow |
| Stronger/inset card |groupStrong / inset |Flat; depth by role, not fake glass |
| Sheet/dialog |overlay=canvas, border at edge, radius20 |Existing native/AdaptiveModal presentation; scrim separately composited |
| Input/search/select |surface + controlBorder; no copper unless focused/selected |Flat |
| Menu/selection overlay |surfaceRaised + controlBorder, radius12 |Light shadow offset0/3 blur10 with shadowColor; dark no shadow |
| Selected item |selected, brand foreground/check/outline |No glow |
| Pressed item |controlPressed, or brandStrong for filled primary |Existing press feedback/RM preserved |
| Disabled item |inset/textDisabled/border |No whole-container opacity or disabled status inference |

Brand hover and press use the same tokens; no extra hover palette on a touch-first product. Keep motion tokens press120, selection180, indicator190, insertion220, expansion220, menu160ms and Reduced Motion handling. No new blur, heavy shadow or card decoration.

## 7. Shared component contracts

Current APIs below were reviewed from source; proposals extend their current location rather than replace them. “Affected callers” includes explicit v2 callers and later legacy migration targets; it does not authorize a blanket default flip.

| Component/current API | Actual current inconsistency | Proposed token/variant contract | Accessibility / callers / risk |
|---|---|---|---|
| `UiButton` + `FormButton`; variant primary/secondary/quiet/destructive/navigation, busy/disabled/selected, feature tasks/fitness, tone brand, compact flags | Default v2 primary uses brandStrong; legacy wrapper defaults green/44; pressed can share selected fill | Pure v2 resolver in existing control-appearance module; brand default, brandStrong hover/press; neutral secondary/controlBorder; tertiary alias for quiet; tonal danger;48 minimum | Preserve roles, selected/busy/disabled, labels and handlers; all forms/back/menus; **medium** |
| `FormField`; appearance, multiline, readOnly/disabled, helper/error, trailingText, ref | Weak border; read-only badge can remain ThemedText; neutral placeholder is valid | Default surface/controlBorder; focused brandFocus; invalid danger+error; read-only inset/textPrimary; disabled inset/textDisabled; native centering preserved | Visible label except accessible search; error association/announcement; no money parsing change; **medium** |
| `FormSelect` / `SelectField`; value/options/action/onOpen/expanded/error/ref | Weak default outline; depends on optional appearance propagation | Same field state roles; expanded indicator and state remain; nested menu consumes surfaceRaised | Combobox state/value, trigger return focus and unavailable options; many category/client/date selectors; **high** |
| `SegmentedControl` / `FormChoice` / `FormWeekday`; checked/selected, stacked/equalWidth/options | Fill alone insufficient contrast; legacy branch and geometry differ | selected + brand outline/text/check; unselected control/textSecondary; full targets; stack at large text | Radio/checkbox states and disabled options; keep source values; **medium** |
| `AutocompleteField` | Active Workout Add Exercise path defaults legacy | Explicit inherited v2 appearance through trigger/results/inline ExerciseEditor; same field/menu roles | Keyboard result order, search, create-on-select and return focus; **high** |
| Search/date/time triggers | Same concepts appear through feature wrappers/native picker adapters | Reuse field roles and current accessory slots; copper focus, semantic invalid; retain native date/time picker | Search visible-label exception needs accessible name; native picker header/return; **high** if owner changed |
| `StatusText` / local status chips | StatusText is legacy-only; missing shared success/financial aliases | Add resolved v2 appearance/tone only; text/icon/fill bindings; pending/outstanding neutral; no domain-state abstraction | Source supplies actual state/wording; text/icon not color-only; **medium** |
| `GroupSurface` / `EditorSection` | Default group has no border; consumers add local border/padding; editorial icon always brandSoft | Keep group/groupStrong/inset/surface composition; optional feature identity icon tone; decorative border stays subtle | No generic universal data card; source grouping/headers retained; **low–medium** |
| Dense rows / financial summaries | Similar slots but distinct semantics/density | Share role/geometry conventions, not a universal Work/Task/Finance data component | Whole exact amounts, metadata and source actions; preserve virtualization; **medium** |
| `UiText` / section headers | sheetTitle/sectionHeading Manrope vs editorSection Lora; local compact overrides | Named compact/operational/editorial roles from section5, no automatic serif conversion | Scaling/fallback and measured header growth; **medium** |
| `AdaptiveSheet` / `BackButton` / `PickerBackHeader` | v2 canvas but default ThemedText title/legacy buttons; outer radius12 | V2 defaults use appropriate UiText/editorial title, v2 controls, Shape.sheet20; legacy branch stays until explicit migration | Existing layout/keyboard/safe-area/dismiss/focus owner untouched; **high** |
| `FormSelectionHost.SelectionOverlay` | V2 menu surface exists but selection heading is unconditional ThemedText | Propagate v2 UiText heading and surfaceRaised/controlBorder in existing host | This is **additional evidence of VU-05**, not a new finding; measured heading height/inline keyboard/focus must remain; **high** |
| `ContextMenu` | Appearance opt-in; estimated row height still legacy44 while v2 actions48 | Inherit appearance through trigger/options; calculate estimates from resolved target; keep actual measurement authoritative | Dismiss before native modal/navigation, Android back, first-action focus; **high** |
| `SheetRefreshNotice` / `FormError` / feedback | Notice always legacy; other error/retry fallbacks mixed | Inherit appearance through context/shell; use v2 FormError/Retry; inline/contained/blocking contracts | One announcement/notice, retained snapshot, source Retry, no auto data reset; **medium** |
| `ActivityIndicator` / loading | Theme color varies by scope | brand or textSecondary according to prominence; accessible label; never success/received meaning | Keep busy state and useful retained content; **low** |
| Native `Alert` and dialogs | OS owns actual destructive confirmation; synthetic fixtures cannot certify it | Preserve native Alert title/actions/destructive designation; style only Axis-owned wrappers | Android back and screen reader/order tested natively; **high** if replaced, so don't replace |

Location: `src/components/design-system.tsx`, `form-controls.tsx`, `control-appearance.ts`, `autocomplete-field.tsx`, `form-selection-host.tsx`, `context-menu.tsx`, `adaptive-sheet.tsx`, `back-button.tsx`, `editor-section.tsx`, `status-text.tsx`, `sheet-refresh-notice.tsx`, `internal-navigation.tsx`. Preserve existing APIs unless a new optional role is necessary; do not rename all callers for appearance alone.

Shared fixes belong in primitives for outlines, sizing/state resolution, v2 default headers/notice, typography roles and menu estimates. **Call sites** own explicit appearance migration, feature identity tone, actual status wording, conditional actions, date/recurrence/payment behavior and meaningful composition.

## 8. Remaining legacy presentation migrations

| Presentation / actual component | Current → proposed | Complexity / invariants |
|---|---|---|
| Ordinary existing Task Edit, `tasks/components/task-editor.tsx`, caller `tasks-screen.tsx:178` | Legacy existing-task gate → explicit complete v2 existing-task path |High; draft, dates, recurrence version/validation, picker back, cancel/save, keyboard unchanged |
| Task action sheet, `tasks/components/task-actions.tsx` | Green/system sheet+buttons → shared v2 sheet/header/actions |Medium; edit/history/skip/delete availability and dismissal unchanged |
| Per-task history, `tasks/components/occurrence-history.tsx` | Legacy rows/sheet → v2 archive grammar and semantic labels |Medium; historical date/version, paging/reopen, order; **not** global Task History redesign |
| Linked transaction detail, `finance/components/transaction-detail.tsx` | Green detail/buttons → neutral v2/copper source actions |High; Work/Commitment linking and restricted edit/deletion semantics unchanged |
| Active Set editor and duration/distance fields, `fitness/components/fitness-forms.tsx` | Legacy controls → v2 field/sheet contract |High; optional logged performance, units, set completion, delete/keyboard behavior |
| Workout/exercise Note editor, same file | Legacy text area/sheet → v2 |Medium; content/save/cancel/return to correct owner |
| Active-workout Add Exercise, same file, plus AutocompleteField and inline ExerciseEditor | Legacy sheet/search/inline create → v2 propagated appearance |High; create/select/add sequence/focus; **not** RoutineExercisePicker replacement |
| Default MonthChooser, `calendar/components/month-chooser.tsx`; Client History via WorkSheet in `work-view.tsx` | V2 body with legacy default header/corners → completed v2 defaults |High shared-layout risk; native/AdaptiveModal presentation, focus, keyboard and safe-area ownership preserved |
| Shared refresh/default selection headers | Legacy notice and SelectionOverlay heading inside v2 → inherited v2 appearance |Medium–high; do not rebuild portals, duplicate notices or change height/focus owner |

Manage Commitments is a legacy **in-place surface**, not a sheet. Database startup/invalid-source fallback are legacy **fallback shells**, not new modal routes. Global Work History is already v2 and its SectionList is preserved. Logged DurationFields/DistanceFields are descendants, not extra navigation surfaces. All remaining old consumers are mapped into VU-01/02/03/05/06/07/12/16, without creating a new issue register.

Additional owned picker-header case within VU-01/05: `task-editor.tsx:179` passes undefined appearance to PickerBackHeader outside recurrence editing. Propagate v2 to that Axis-owned header in the Task migration; do not replace or restyle the native date/time picker itself.

## 9. Integration architecture

Keep `src/constants/design-system-v2.ts` as canonical resolved palette/type/shape location, `DesignProvider` as current local font/Reduced Motion boundary and `useDesignColors` as the current color-scheme consumer. App config already has `userInterfaceStyle: automatic`. The root Expo Router ThemeProvider maps to the resolved approved palette later. Do not add another ThemeProvider, separate SoftCopper runtime system or styling dependency.

First remove literal-canvas theme detection in `overview-presentation.ts` and `taskSectionSurface`. Resolve mode explicitly from the existing hook/selector and carry it through affected pure presentation helpers. Keep source/categorical and semantic values independent from selected primary.

Technical contract: keep `DesignPalette` color-only because UiText uses its keys as valid colors. A small `useDesignTheme()` helper in the existing module may return `{ mode: DesignMode, colors: DesignPalette }`, with current `useDesignColors()` delegating to `.colors`. Pass `mode` explicitly to the pure Overview/Task helpers; do **not** add a non-color `mode` field into DesignPalette or create another provider. This is a future source-level API choice, not an API implemented by the review artifacts.

Use small named aliases in the existing palette for shared roles; component state resolver references those roles. Feature adapters select named roles rather than spreading legacy/v2 palettes. Existing `Colors`/ThemedText and optional appearance remain a **compatibility boundary**, not a new design system: explicit opt-in migration until live callers are exhausted. Update root/native colors only in its dedicated reviewed batch. Don't silently flip undefined appearance globally.

Stage canonical color cutover separately from readiness:3A.1 explicit mode/types/semantic readiness without current visual changes,3A.2 approved palette cutover for existing v2 consumers with a product-wide visual checkpoint. Shared mechanics and targeted old sheets follow. No domain refactor or route restructuring is required. The [migration plan](soft-copper-migration-plan.md) lists exact files/dependencies, source tests and exit criteria.

## 10. Home emblem and app-icon source audit

**Suitable approved source is not present in the audited repository.** `assets/images/icon.png` is a blue Expo “A” placeholder; Android foreground/background/monochrome images are Expo variants. `assets/expo.icon/Assets/expo-symbol 2.svg` contains one Expo-A path, not the four-point star. `assets/expo.icon/icon.json` specifies a blue gradient, grid and Expo symbol. The selected cream four-point star/copper ring/four-marker geometry cannot be verified or reproduced exactly from these files. No symbol was invented/generated for this phase.

Required source: the actual selected app-icon artwork, preferably SVG/vector PDF or layered source with **separate star, ring, four directional-marker and backdrop layers**. Alternatively, the approved transparent high-resolution PNG of the isolated mark, at least192×192 for a48-unit3× display (prefer a larger master). A flattened1024 icon is useful evidence but is not automatically an exact clean transparent source; mask/extract only against that approved artwork and review edges. No generic compass, five-point star, guessed vector trace or claim of exact SVG reproduction.

Future assets (names proposed, not created): `assets/images/brand/axis-emblem-dark.png` and `axis-emblem-light.png`, lossless transparent exports; retain vector master and provenance. Dark variant uses selected cream star, copper ring/markers and alpha background. **Propose** light variant with same paths/geometry, dark-ink star `textPrimary` and light brand copper ring/markers; cream on cream is not legible. This recolor requires approval; if not approved, defer the decorative light-mode emblem rather than adding a prohibited dark square/button container.

Home strategy:48×48 nominal decorative image, upper-right in the existing title row,12 gap; align visually with the Home heading, date remains underneath. Use `pointerEvents="none"`, `accessible={false}`, hidden accessibility subtree and empty web alt. No handler, focus stop, container button, action, navigation or badge. Respect safe-area/current max-width and do not add vertical whitespace. Title has priority at large text: use measured layout and omit this nonessential decoration if the original title cannot fit, rather than shrink/cap text or force a taller header. Review44–48 physical size with the actual art before final acceptance.

Preserve all five Home photographs, both textures, their current overlays, content-sized collapsed layout, row-anchored Today/Attention expansion, direct Fitness/Journal navigation and existing native-tab inset owner. The blue gear in user screenshots is an **Expo Go developer overlay**, not an Axis component; do not add it.

App-icon pipeline is separate: generic Expo `icon` currently points to `assets/images/icon.png`, but **iOS overrides it with `assets/expo.icon`**; replacing only generic icon.png would leave iOS wrong. Later rebuild the actual iOS layered icon from approved geometry/backdrop; prepare Android adaptive foreground/background and monochrome assets within platform safe zones; preserve directional markers and ring under masks; prepare generic/favicons as required. Home uses only the isolated transparent mark, never the rounded-square backdrop. No app.json/icon/splash change now.

## 11. Decisions, evidence and skills

Remaining real approvals:

1. Accept the complete proposed semantic/control/type contract, including new status soft fills and stronger neutral fields. Recommended: accept values here; don't reopen approved copper primary.
2. Confirm emerald Fitness identity across destination tiles/progress while shared actions become copper. Recommended: emerald matches Home; keep completion separately semantic. If declined, preserve current copper Fitness identity under separate feature roles, never silently merge it with brand.
3. Supply the actual approved symbol master and approve the same-geometry ink-star light variant. Recommended: separate dark/light transparent exports; no approximation or container.

Journal quiet green, Work green identity, Calendar/Finance copper interactions and retained source/chart colors are recommended specification defaults, not separate questions about every component. Profiling-driven archive rewrites and tablet/product support expansion are outside this visual migration; request scope only if later evidence justifies them.

Visual evidence is static HTML using existing fonts and source-derived conventions: [dark comparison](soft-copper/comparison-dark.png), [light comparison](soft-copper/comparison-light.png), [dark fields](soft-copper/fields-dark.png), [light fields](soft-copper/fields-light.png), [live specimen](soft-copper/specimen.html). Current-vs-proposed comparisons normalize dimensions where practical and explicitly label the represented current branch. They are not replacement screenshots of the app. Native tab treatment is represented as **color keys only**, not invented OS chrome.

Skills substantively applied: frontend-design kept copper warm and restrained with editorial type, preserving Home as the expressive feature; Impeccable separated useful role extraction from premature universal components and checked boundary/selection/focus contrast; UI/UX Pro Max's targeted focus/status guidance retained text/icons and distinguished AAA focus advice from AA requirements; Expo building-native-ui and SDK58 docs preserved native tabs, automatic theme switching, source-owned sheets/pickers, safe-area and scalable native text behavior. No extra runtime library or global layout rewrite is proposed.

Sources: [SDK58 NativeTabs](https://docs.expo.dev/versions/v58.0.0/sdk/router/native-tabs/), [Expo theme support](https://docs.expo.dev/develop/user-interface/color-themes/), actual root/theme/control files and the original Phase1 audit. Browser captures/specimen ratios are not native-device acceptance. [Validation and unchanged-work proof](soft-copper/validation.md) records checks and Git state.

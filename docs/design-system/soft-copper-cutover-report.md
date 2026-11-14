# Phase 3A.2 — Canonical Soft Copper palette cutover

Implemented 12 November 2026. This is an intentional palette change within existing v2 consumers. No layout, typography, geometry, navigation, data/domain, schema, persistence, dependency, artwork or icon changes.

## Initial audit and authority

Initial HEAD: `16ebeab46d20e7a943f08fa017928ce0eb884c0e`, branch main. The worktree already contained 13 modified tracked files from Phase 3A.1 and untracked Phase 1/2/3A.1 documents, scripts and tests. Recorded SHA256 for all 2,836 initial files before edits. None was cleaned, staged or discarded.

Read the Phase 1 audit, Phase 2 specification, migration plan, traceability and Phase 3A.1 report. Verified actual sources, all brandStrong/default-primary uses, semantic/status consumers, legacy color bridges, native theme hooks and affected tests. Phase 3A.1 remains intact: `DesignMode`, color-only `DesignPalette`, `DesignTheme`, stable `useDesignTheme()`, compatible `useDesignColors()` and required explicit mode in Finance/Task helpers. No provider/context/state was added and no canvas heuristic returned.

The 60-row Phase 2 register is the palette authority. This brief explicitly overrides its future Fitness emerald mapping: the existing four Fitness values are retained. The other 56 specified roles match the register exactly; four Fitness roles are documented exceptions, not silent palette adjustments. A single extra existing compatibility key, `shadow`, remains. All 61 runtime keys now contain valid six/eight-digit HEX colors; mode metadata remains outside the palette.

## Canonical values and compatibility

Full values, change classification, aliases and usage: [runtime-token-register.md](soft-copper-cutover/runtime-token-register.md). Machine-readable source reference/usage audit: [token-audit.json](soft-copper-cutover/token-audit.json).

| Role | Dark | Light |
|---|---|---|
| brand, normal global v2 primary | #E7AA8B | #874833 |
| brandStrong, transient press/hover | #F0BDA3 | #713926 |
| brandSoft / selected / brandSelection | #462F27 | #F1DDD3 |
| onBrand | #291911 | #FFF8F2 |
| success / completed / received / financeIncome | #A8D0B7 | #32664E |
| financeExpense | #F1A9B4 | #94455C |
| attention / overdue | #DFC18B | #805619 |
| danger | #F0ABAB | #9B303E |
| taskAccent / taskText | #AEB7E8 | #505A8A |
| controlBorder / borderStrong | #95828E | #9B837B |
| scrim, alpha retained exactly | #0000007A | #10181447 |
| shadowColor / shadow, alpha retained exactly | #00000000 | #2D1C2C24 |

Per mode there are seven changed existing tokens, 21 unchanged existing tokens, and 33 newly available roles (61 keys total). Dark changes: brand, brandStrong, brandSoft, onBrand, selected, borderStrong and shadow. Light changes: brand, brandStrong, brandSoft, onBrand, selected, taskAccent and shadow. Existing neutral foundation/text values are unchanged; the task light accent consolidates to its existing indigo taskText, rather than copper.

Aliases retained: overlay→canvas; textDisabled→textMuted; borderStrong→controlBorder; selected→brandSoft; controlPressed→groupStrong; financeIncome/completed/received→success; overdue→attention; pending→textSecondary; outstanding→textPrimary; taskText→taskAccent; brandFocus/brandBorder/brandDecorative/homeAccent/calendarAccent/financeAccent→brand; brandSelection→selected; shadow→shadowColor.

Fitness exceptions (unchanged from the starting worktree): dark fitnessAccent/fitnessText #E2A08F, fitnessAccentSoft #472D29, onFitness #2A1720; light fitnessAccent #B66F5D, fitnessText #8E4E3F, fitnessAccentSoft #F2DDD6, onFitness #151010. Therefore the proposed fitnessAccentSoft→workAccentSoft, fitnessText→fitnessAccent, and onFitness→onFeature aliases are deferred where their values differ. Future emerald migration must coordinate all four roles, not change only their foreground.

`shadow` remains a valid-color compatibility alias for older v2 callers; raisedSurfaceShadow now consumes canonical shadowColor. The old dark `none` sentinel becomes zero-alpha HEX, retaining the no-shadow result. Light rgba(45,28,44,0.14) becomes the exact approved 8-bit-alpha #2D1C2C24. This preserves the approved translucent contract, not an opaque approximation. Retire the compatibility name during later raised-surface migration, not by breaking existing palette keys now.

## Atomic primary correction and actual changed consumers

Before, UiButton normal primary used brandStrong, while feature=fitness primary used its private Fitness accent. Generic FloatingAddButton also used brandStrong normally; Task FAB used brand but had no state-specific fill.

Now all shared v2 primary actions use the global copper contract, including shared actions on Fitness screens:

```tsx
backgroundColor: unavailable ? colors.inset
  : primary ? pressed || hovered ? colors.brandStrong : colors.brand
  : /* existing secondary/navigation treatment */;
// primary foreground: onBrand
```

Existing UiPressable state/events and motion remain authoritative. Supported hover and actual press choose brandStrong; normal and selected primary remain brand. Focus remains separate: existing outer brand ring with separation plus primary onBrand inner boundary. Disabled/busy remains inset/textMuted (equal to textDisabled), inaccessible to activation, with busy announcement/spinner retained. FAB disabled fills remain their existing control/inset treatments. No labels, callbacks, minimum targets, padding, sizes, radii or timings changed.

FormButton(appearance="v2") already delegates to UiButton and inherits the correction. `form-controls.tsx` and legacy `control-appearance.ts` were inspected and intentionally not edited: non-v2 FormButton still uses its legacy theme until the appropriate migration. Secondary pressed/selected state improvements remain Phase 3B-I.

| Changed runtime file | Component/helper | Previous role → final role / effect |
|---|---|---|
| src/constants/design-system-v2.ts | DesignColors | Rose canonical brand → approved copper; complete semantic/neutral/source contract; retained Fitness exception |
| src/components/design-system.tsx | UiButton | Default brandStrong/private Fitness primary → brand normal, brandStrong press/hover, onBrand foreground |
| same file | raisedSurfaceShadow | shadow/none sentinel → canonical shadowColor/zero-alpha; unchanged geometry |
| src/components/floating-add-button.tsx | FloatingAddButton | brandStrong normal → brand normal, brandStrong transient |
| src/features/tasks/components/floating-add-task.tsx | FloatingAddTask | brand always → brand normal, brandStrong transient |
| src/features/tasks/components/task-list-row.tsx | TaskListRow completion glyph | onBrand → onFeature over indigo; completion controls/indigo retained |
| src/features/finance/overview-presentation.ts | overviewColors | Mode-selected income/expense literals → explicit-mode canonical financeIncome/financeExpense; identical values |
| src/features/fitness/components/history-content.tsx | CompletedStatus | brandSoft/brand → successSoft/completed; completion cannot become copper selection |
| src/features/finance/commitments/components/commitment-history.tsx | HistoryCard paid marker/label | brandSoft/brand → successSoft/success; Skipped remains neutral |
| src/features/finance/work/components/work-history-cards.tsx | WorkHistoryJobCard Paid label | brand → received; received money remains positive green |
| src/features/finance/work/components/work-client-details.tsx | ClientJob status badge | Non-overdue brandSoft/brand → control/pending; overdue attentionSoft/overdue retained |

Ten runtime files changed relative to this phase's starting state. The semantic corrections are paint-only: existing Paid/Completed/Overdue/Partially paid/Outstanding text, booleans, predicates, dates and source ownership are untouched. Active-series/rotation selection is not reclassified as completion.

`overviewColors(colors, mode)` still uses mode, never canvas, to select the financial/category variant. Canonical financial series resolve through DesignColors[mode]; a custom palette may still supply neutral grid/axis/selection/group colors. Category arrays remain exactly dark `[F1A9B4,B6C1B5,E4C28E,A9C9EA,9BCBB5,9A9999]`, light `[94455C,667260,92703A,4D729A,40765D,797371]` (all HEX prefixed #).

## Semantic/feature preservation and reserved roles

Income and received/completed stay green; expense pink stays distinct from danger red; warning/overdue remains amber; pending/outstanding is neutral; expected money is never converted into received income. Calendar Task/Commitment/expected Work source dots retain their existing exact blue/amber/teal values. Existing Work source green and Journal reflection green bridges remain; Fitness's source pigments stay copper/terracotta until its later emerald review. Photographic Home identity is untouched.

Canonical workAccent/workAccentSoft and journalAccent/journalAccentSoft are available for later feature mapping; existing source-owned bridges were not replaced to manufacture consumers. The audit identifies active key consumers separately from available/reserved aliases. Available surfaceRaised/overlay, controlBorder/controlPressed/textDisabled, role-specific brand aliases, scrim and feature/source aliases do not imply their later control/native-shell migrations are complete. Generic existing brand-bound identity tiles naturally become copper; source-specific green/indigo tiles remain distinct. No global color search-and-replace was used.

## Contrast and real-component limitations

[Exact unrounded results and alpha composites](soft-copper-cutover/contrast.json). The 118 required Phase 2 role-pair checks were recalculated from actual runtime tokens. All 118 pass using retained Fitness's fitnessText/onFitness compatibility foregrounds. These include available role contracts, not a claim that every role is already used throughout the UI.

| Pair | Dark | Light | Minimum |
|---|---:|---:|---:|
| Normal primary text | 8.474 | 6.643 | 4.5 |
| Pressed primary text | 10.079 | 8.621 | 4.5 |
| Secondary button text | 13.044 | 14.918 | 4.5 |
| Body / group | 14.234 | 15.203 | 4.5 |
| Supporting text / group | 8.763 | 5.783 | 4.5 |
| Selected label / fill | 6.202 | 5.332 | 4.5 |
| Focus / surface | 8.825 | 6.833 | 3 |
| Success chip | 7.430 | 5.698 | 4.5 |
| Overdue chip | 6.312 | 5.447 | 4.5 |
| Error chip | 6.895 | 5.866 | 4.5 |
| Info chip | 7.913 | 5.661 | 4.5 |
| Income text / group (supplementary check) | 9.465 | 6.173 | 4.5 |
| Expense text / group | 8.473 | 5.948 | 4.5 |
| Available controlBorder / surface | 4.917 | 3.465 | 3 |
| Retained Fitness identity text / soft | 5.765 | 4.858 | 4.5 |
| Retained filled Fitness compatibility foreground | 7.778 | 4.868 | 4.5 |

No core brand value was adjusted. Two *deferred* Fitness combinations would fail if applied partially: current light fitnessAccent over its soft tile is 2.968:1, and new onFeature over current light fitnessAccent is 3.788:1. Actual retained light fitnessText and onFitness pass at 4.858/4.868. Do not activate the future alias map without the coordinated feature migration. These are documented inactive combinations, not ignored active failures.

Current resting field borders still measure about 1.43 dark / 1.34 light against surface, below 3:1. Selection fill alone also remains insufficient. The available controlBorder passes, but its systematic use, selected checks/labels and invalid+focus treatment remain traceable to VU-04 / Phase 3B-I. No whole-app accessibility certification is claimed.

Alpha scrim/shadow values were composited over canvas and group; actual existing 0.92 press opacity was also composited for both fill and foreground, rather than treating alpha colors as opaque. Threshold comparisons occur before rounding; report tables round for readability.

## Visual evidence

[Comparison gallery](soft-copper-cutover/index.html), [per-case hashes and geometry](soft-copper-cutover/visual-comparison.json), [before manifest](soft-copper-cutover/before.json), [after manifest](soft-copper-cutover/after.json). Captures use identical current-source fixtures, both themes, pt-BR, America/Sao_Paulo, 844pt viewport height, loaded fonts and identical Reduced Motion/caret/animation suppression. Pre-change bundles were frozen before runtime edits and retained separately. Recapture uses those frozen pre-change bundles, never recompiles the baseline with new tokens.

50 cases: Home390; Tasks320/390; Calendar390; Overview320/390/430; selected cash-flow interval390; full Spending390; Transactions390; Finance editor390; Work320/390/430; Fitness390; Journal390; payment sheet320/390/430; doubled-text payment sheet320/430; shared controls390 normal/hover/pressed/focus; all in dark and light.

All 50 cases retain identical measured header/button/input geometry. Three PNGs remain byte-identical: Home both themes and Calendar light. The other 47 have intended palette changes. No unexpected geometric change remains. Source checks also confirm unchanged style definitions, typography, spacing/radius/motion constants and artwork.

An intermediate capture exposed regenerated same-date UUID ordering in two off-screen Transactions rows, not changed rectangles. The after-builder now compiles the frozen baseline JSON through a review-only esbuild loader. Validation confirms identical JSON and all baseline UUIDs present in the after bundles: Transactions 182/182, editor 179/179, Work 187/187, payment sheet 21/21. Final geometry comparisons include unchanged labels/order as well as rectangles. No application ordering or ID generation was modified.

| Representative screen | Intended before → after |
|---|---|
| Home | Byte-identical in both themes; five photographs and two topographic backgrounds unchanged |
| Tasks | Copper selected fill and FAB; indigo labels/indicators retained; light task accent consolidates to established taskText; completion glyph uses feature foreground |
| Calendar | Dark stronger-neutral border ripple where borderStrong was already consumed; source dots unchanged; light capture identical; existing green selected-day treatment retained |
| Finance Overview | Copper shared navigation, period/interval selection and focus; exact amounts, series and category colors preserved |
| Transactions | Copper navigation/create/FAB and existing brand-bound tiles; income/expense amount colors unchanged |
| Transaction editor | Copper primary Save, selected type and focus; unchanged fields/sections and native date behavior |
| Work | Copper shared payment/navigation controls; source green identity and amber overdue data retained; balances remain neutral |
| Fitness | Copper shared primary/navigation/selection; existing terracotta content identity retained; no emerald rollout |
| Journal | Copper generic back/action tint ripple; green mood/reflection/Save entry treatment retained; draft and entry composition unchanged |
| Existing payment sheet | Copper confirmation/action binding and existing brand-bound identity; unchanged header/scroll/input geometry, including doubled text |
| Shared control fixture | Normal vs pressed/hover copper distinction; selected/disabled/busy/focus behavior retained |

The four nested semantic corrections are additionally verified in real rendered, database-backed regressions in both modes; the main-screen comparison is not presented as screenshot coverage of every nested history state. Existing legacy theme consumers/native tabs and default legacy sheets remain intentionally unmigrated.

## Skills

- **Anthropic frontend-design:** reviewed Soft Copper coherence against pinned Hearth identity, preserving photographic/feature/source palettes and restrained existing compositions.
- **Impeccable:** compared source-derived before/after evidence, state distinction and color hierarchy; checked unchanged geometry and documented intended versus unchanged areas without redesigning.
- **UI/UX Pro Max:** reviewed selection versus press, completion/received versus brand, neutral balances versus overdue, focus and contrast. This identified and corrected the four status bindings above.
- **Expo Skills / building-native-ui:** checked SDK 58 theme ownership and existing React Native interaction infrastructure against [SDK documentation](https://docs.expo.dev/versions/v58.0.0/), [Expo color themes](https://docs.expo.dev/develop/user-interface/color-themes/) and [React Native Pressable](https://reactnative.dev/docs/pressable). Existing providers, OS mode, native tabs, sheets, keyboard/safe-area ownership and platform boundaries remain unchanged.

## Tests and validation

Actual pre-change baseline: **1,462 passed**, zero failed/skipped, TZ=America/Sao_Paulo. Final counts/commands, full lint comparison, export results and file inventory are recorded in [validation.json](soft-copper-cutover/validation.json). No existing test was weakened, edited or suppressed in this phase.

| Final validation | Result |
|---|---|
| New token/button/semantic tests | 16/16 passed |
| Focused selection, 36 files | 568/568 passed |
| Full suite | 1,478/1,478 passed; zero failed/skipped |
| TypeScript | Pass |
| Changed-file ESLint | Pass; no diagnostics |
| Full ESLint | Same six existing errors and two warnings; zero new diagnostics |
| iOS / Android exports | Pass; 1,894 / 1,991 modules |
| git diff --check | Pass |
| Visual geometry | 50/50 identical; three unchanged PNGs and 47 intended palette changes |

Added eight token/contrast/custom-background contract tests, six primary/FAB state tests and two real rendered/database-backed semantic tests: 16 new tests. Tests cover both modes, complete key coverage/validity, exact approved register with explicit Fitness exceptions, aliases, source markers, financial categories, alpha composition, primary normal/press/hover/focus/disabled/busy, geometry, callbacks and source-owned statuses. Existing Phase 3A.1 explicit-mode regressions remain passing.

Focused feature selection includes design-system/FormButton, Tasks recurrence/completion/disclosure, Calendar, chart selection/data, Transactions/editor, Commitments/editor/payment/history, Work/payment/details/client/history, Home expansion/background, Fitness/history and Journal. Full suite, TypeScript, changed-file ESLint, full ESLint comparison, both exports and diff check run against the final source. Existing full ESLint issues remain six react/no-children-prop errors (context-menu 3, navigation-conventions 2, transactions-experience 1) and two unused-variable warnings in tasks-experience; no suppressions or unrelated cleanup.

The restricted sandbox prevents tsx's Windows profile lookup; successful TypeScript-runner tests, preview/audit scripts and Metro exports ran outside that restriction. Local outputs stay within the project. Early new-test import/fixture-host errors were corrected before final validation; no production workaround was added.

## Files and Phase 3B-I handoff

Runtime files: the ten listed in the consumer table. Added code: `tests/soft-copper-tokens.test.ts`, `tests/soft-copper-buttons.test.ts`, `tests/soft-copper-semantics.test.ts`, `tests/helpers/soft-copper-contrast.ts`, `scripts/preview-soft-copper-controls.ts`, `scripts/review-soft-copper-cutover.cjs`, `scripts/audit-soft-copper-cutover.ts`. Added this report and the separate `soft-copper-cutover/` evidence package: manifests, 100 PNGs, gallery, comparisons, full token/usage register, contrast/alpha results, source invariants and validation JSON. Existing Phase 1/2/3A.1 artifacts are not overwritten.

First recommended **3B-I** batch: apply controlBorder to v2 FormField/FormSelect/SelectField/Autocomplete resting boundaries; propagate explicit v2 appearance through selection triggers/menus; preserve separate error boundary and outer focus; consolidate selected versus transient neutral press; distinguish read-only selectable data from disabled text; review existing button geometry/state consistency without changing actions. Target `form-controls.tsx`, `control-appearance.ts`, `autocomplete-field.tsx`, `design-system.tsx`, `internal-navigation.tsx`, and selection-host styling only where required by the approved batch. `controlPressed`, `textDisabled`, `brandFocus/brandBorder` and `surfaceRaised` are available. Do not assume their existence fixes current fields.

Broader sheet/menu default migration, native-shell tint/backdrop, feature identities (especially Fitness emerald), type-role cleanup, star emblem and app icon remain their separately approved later work. Do not change routes, tab order/ownership, native sheets/keyboard/insets, source projections/actions, recurrence, centavo arithmetic, expected-versus-actual semantics, allocations, dates, persistence or artwork.

## Remaining native acceptance and Git state

Browser source fixtures, static Tasks/Fitness renders, rendered-native-boundary tests and successful Metro exports are not physical-device acceptance. Still test iOS/Android OS theme changes while screens/sheets are mounted, native press/focus, selection/keyboard, native tab/sheet appearance, and doubled text at native phone sizes. No known active contrast or geometry regression remains in the tested scope; VU-04 and the deferred Fitness pairings remain explicit future work.

Initial 13 tracked modifications and all untracked prior-phase work remain. Source-preservation evidence verifies all 289 prior design/test/script artifacts and Home assets are byte-identical, and only the ten intended existing runtime files changed relative to this phase's starting state. Final tracked modifications also include the earlier Phase 3A.1 changes; this phase does not replace their ownership. HEAD remains unchanged; no staged files, commit or push.

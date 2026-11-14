# Phase 3B-I — Shared controls and input boundaries

Completed implementation and automated/source-browser validation on 2026-11-13. Physical-device acceptance remains outstanding. No commit or push.

## 1. Scope and authority

Used the approved [visual audit](visual-unification-audit.md), [Soft Copper specification](soft-copper-specification.md), [migration plan](soft-copper-migration-plan.md), [traceability](soft-copper-traceability.md), and [3A.2 report](soft-copper-cutover-report.md), especially VU-04, VU-13 and the limited appearance-propagation part of VU-05. Existing functional contracts remain authoritative.

Four runtime files changed: `control-appearance.ts`, `form-controls.tsx`, `design-system.tsx`, and `internal-navigation.tsx`, all under `src/components/`. Canonical palette, typography/spacing/motion scales, legacy theme, feature files, domain/data code, assets, dependencies, routes, tabs, safe areas, sheets and pickers remain byte-identical to the starting worktree.

The starting baseline actually passed 1,478 tests. The starting worktree already contained 19 modified tracked files and substantial untracked Phase 1/2/3A evidence. An initial SHA-256 inventory captured 2,955 existing files. The final audit verifies 2,951 byte-identical files and exactly the four intended runtime changes. `design-system.tsx` already contained earlier work; its earlier changes were retained. The original legacy `buttonAppearance` and `fieldAppearance` functions are text-identical. Autocomplete and selection-host source are byte-identical.

## 2. Root causes

- V2 fields/selects used decorative `border` for essential resting boundaries: 1.433:1 dark and 1.344:1 light against `surface`.
- Focus and invalid state shared a single conditional border slot. Invalid styling erased the visible focus distinction.
- V2 menu choices had radius 4, no reserved selected outline and no explicit 48 minimum width. Weekdays inherited a 44 minimum width. Visible content happened to make current weekday fixtures wider than 48, but the contract was weak.
- V2 textarea height inherited the single-line minimum of 48. The reviewed note rendered only 66 high, with text clipped by the small editing area.
- Some press feedback reused selection fill; focus on `FormChoice` also used selected fill. These conflated transient input, keyboard focus and persisted choice.
- Secondary buttons had transparent 2-point boundaries. Disabled labels/animation treatment and destructive surface treatment were not consistently explicit.
- Compact internal navigation still used Task indigo for a shared navigation role. Task content indigo itself is intentional.

Appearance propagation was already correct. No speculative propagation changes were made.

## 3. Initial control audit

The machine-readable [audit](shared-controls-inputs/audit.json) records 79 direct shared-control call sites with file, line and source. The following summarizes the requested behavior inventory; state bindings are specified below.

| Family | Appearance, geometry and text | Keyboard, semantics and ownership | Main current callers / tests |
|---|---|---|---|
| FormField: text, search, amount, textarea | Legacy or explicit v2; interface font 16; original single-line paddingVertical 0/no forced lineHeight/textAlignVertical center; caller minHeight retained; multiline natural wrapping | TextInput ref/value/onChangeText/onFocus/onBlur unchanged; label, helper, disabled/read-only, invalid and error association; focus host reveal and source keyboardType unchanged | TaskEditor; TransactionEditor; CommitmentEditor/Payment/Resume; WorkEditor/RecordPayment; category/client/search forms; Fitness forms; Journal entry. `form-controls`, `form-field-alignment`, new controls test and feature form tests |
| FormSelect / SelectField | Legacy or v2; 48 minimum/radius10 before and after; value wraps; icon/chevron retained | Combobox value/expanded/disabled retained. SelectField uses existing host ID, ref, one overlay, return focus and original positioning. No new menu implementation | Task category/priority; transaction and commitment categories; Work clients/work/category; Fitness measurement; Journal date. `form-controls`, `adaptive-sheet`, `context-menu`, browser checks |
| InlineNameForm | Already passes appearance to field, errors and footer buttons; unchanged body/footer measurements | Existing auto-focus, trimmed submit, submit guard, cancel/complete and focus return retained | Task/Finance category and Work client creation; actual atlas create/cancel checks; existing form tests |
| AutocompleteField/Panel/Options | Already passes v2 to trigger, search, suggestions, Create and errors; inherits shared improvements | Query, getResults, onSelect/onCreate/onRequestCreate, no-match copy, one host and return focus unchanged | Work client entry and legacy ActiveWorkout Add Exercise. `autocomplete`, `work-forms`, `work-editor-v2`; actual shared-component browser checks |
| SegmentedControl | Legacy or v2; existing fontScale>=1.5 vertical layout and caller stacking retained; v2 group boundary now meaningful | Radiogroup/radios; source option values, order, checked and disabled semantics unchanged | Finance type/period, Commitment kind, Work compensation, Task priority/recurrence, Fitness units. Existing form tests plus new mounted state tests |
| FormChoice / FormWeekday | Legacy or v2; natural text growth; new explicit target/outline contract | FormChoice retains radio role and check; weekday retains checkbox role, full accessible name and existing three-letter visual abbreviation | Select/autocomplete rows; Task recurrence weekdays. Mounted and browser state/layout checks |
| FormButton -> UiButton / UiPressable | FormButton delegates only explicit v2; all existing UiButton variants retained, min48/radius10 | Button role, selected/disabled/busy/expanded, original callbacks/guards; same press motion and Reduced Motion behavior, disabled animation suppressed | Shared v2 actions across features; `soft-copper-buttons`, new mounted state tests; browser button captures |
| InternalNavigation | Already shared v2 chrome; compact branch now copper, 48 minimum width | Existing section/route callback, selected state, wrapping, measured moving indicator and Reduced Motion unchanged | Tasks section strip and other section navigation; new mounted copper-vs-indigo test plus full Tasks/navigation regressions |

Legacy controls were deliberately not opted into v2: ordinary Task Edit and Calendar-delegated ordinary Task Edit, per-task occurrence history, linked transaction details, Manage Commitments, ActiveWorkout nested set/note/add-exercise forms, and other undefined-appearance callers. Journal's own feature identity and Fitness identity remain unchanged. The v2 Task Edit atlas explicitly opts into v2 to exercise the component branch; it does not represent an application-wide ordinary-edit migration.

## 4. Final state matrix

All names below refer to existing `DesignColors` roles. Disabled takes precedence over interaction. No state changes validation or stored values.

| Family | Resting | Focus / expanded | Invalid, including simultaneous focus | Read-only / disabled | Pressed / selected |
|---|---|---|---|---|---|
| V2 text/search/amount/textarea | `textPrimary` on `surface`; placeholder `textMuted`; 1pt `controlBorder` | Constant 1pt `brandFocus` boundary, external 2pt `brandFocus` outline at offset2; `selectionColor=brandFocus` | 1pt `danger`, linked existing error text; focus adds the separate copper ring, preserving the red inner boundary | Read-only: `textPrimary` on `inset`, `controlBorder`, explicit Read only caption/hint, editable=false. Disabled: `textDisabled` on `inset`, `border`, no ring, opacity1 | Input selection/editing remains native; no persistent selected fill |
| V2 select/autocomplete trigger | Same field contract, icon/value/chevron `textPrimary` | Actual focus OR expanded keeps copper ring | `danger` plus error association; expanded/focused ring remains | No read-only prop. Disabled: `textDisabled`/`inset`/`border`, no ring, rejects press | Neutral `controlPressed`, not selected fill; expanded state persists only while owned by host |
| V2 segmented group/options | Outer `controlBorder` on `control`; unselected child transparent, label `textSecondary` | UiPressable external copper ring, no selection change | N/A: no new invalid prop | Group/option disabled: inset child, `border`, `textMuted` label/icon (currently same hex as `textDisabled`), existing disabled semantics | Unselected press `controlPressed`; selected `selected` fill + `brandBorder` + `brand` label/check, retained after release |
| V2 FormChoice | Transparent, reserved 1pt transparent boundary; `textPrimary` | Copper outline, no selected fill just for focus | N/A | Disabled: `inset`/`border`/`textDisabled`; no ring; radio disabled | Neutral press; selected `selected` + `brandBorder` + `brand` label/check |
| V2 weekday | `control`/`controlBorder`, `textPrimary` | Copper outline | N/A | No disabled/read-only API introduced | Neutral press; checked selected fill/brandBorder/brand label/check; checkbox checked remains |
| V2 buttons | Primary `brand`/`onBrand`; secondary `control`/`textPrimary`/`controlBorder`; quiet/nav transparent; quiet label `brand`; destructive `dangerSoft`/`danger` text/border | External copper focus ring; existing primary inner focus boundary uses `onBrand`, other variants `brandFocus` | No field-invalid API; destructive is semantic variant | Disabled/busy: `inset`/`border`/`textDisabled`, opacity1, native disabled + busy where applicable, no action | Primary transient `brandStrong`; other unselected press/hover `controlPressed` with semantic text retained; selected `selected` + `brandBorder` + `brand`, nav underline retained. Existing tone=brand and Fitness secondary feature tint remain |
| Compact internal navigation | Transparent, `textSecondary` | External copper focus ring | N/A | `inset`/`textDisabled`; existing disabled semantics | Unselected neutral press; selected `selected`, `brand` label/underline; animation indicator copper |

Native field border width stays constant through focus, typing and invalid states. An initial implementation increased focus border width; the existing iOS/Android centering tests caught that regression. It was corrected with an external ring, without weakening tests. Another experimental ARIA attribute caused RNWeb to mark editable inputs read-only; it was removed before final validation. Browser typing and native-harness value/callback checks now pass.

## 5. Exact geometry

Browser units correspond to logical CSS pixels; these are source-rendered RNWeb measurements, not physical native measurements. Complete paired rectangles are in `audit.json` and before/after manifests.

| Item | Before -> after |
|---|---|
| Field/amount, 390 viewport | 358×48 -> 358×48; radius10, boundary1 unchanged |
| V2 textarea contract | min48 -> min96; atlas note actual358×66 -> 358×96; radius10/border1 unchanged |
| Read-only/disabled single-line fields | 358×48 -> 358×48 |
| Long closed select | 358×90 -> 358×90; no truncation introduced |
| Segments at390 | 113.33/113.34/113.33×48 unchanged; minimum width0 ->48 |
| FormChoice | minimum width absent ->48; radius4 ->10; reserved boundary0 ->1. Actual358×48 unchanged for short rows |
| Long open-menu option | 340×88 ->340×90 from reserved1pt top/bottom boundary; no fixed height |
| FormWeekday | minimum width44 ->48; minheight48/radius10 unchanged. Fixture actual minimum width51.52 and height48 unchanged |
| UiButton | boundary2 ->1; min48×48/radius10/padding unchanged; ordinary atlas358×48 unchanged |
| Compact navigation | minimum width absent ->48; actual84.5×48 unchanged |
| Doubled text,320 | segments278×62 unchanged; selected FormChoice288×112 ->288×114; other choice288×64 ->288×66; compact nav138×54 unchanged |

All checked selection, navigation, field, select and menu targets are >=48×48 at320/390/430, ordinary/doubled text, both themes. No horizontal document overflow in those 48 layout groups. Existing natural wrapping/stacking and caller textarea sizes are preserved. No font shrinking, fixed single-line heights, negative margins, new insets or sheet sizing changes.

Compact inset radius8 remains unchanged; this batch does not change the shared shape scale.

## 6. Contrast verification

Computed from unchanged runtime hex values, opaque control surfaces and actual adjacent group/control/canvas/raised surfaces; 94 reported pairs include 12 press-opacity composites. Active editable boundaries, focus and error indicators pass >=3 across all six interactive surrounding roles. Normal body/placeholder pairs pass >=4.5. See exact data in `audit.json`.

An additional browser pass reads actual computed border, fill, text and nearest opaque ancestor colors in20 representative editor screens:98 fields,96 active and2 disabled Time controls. All96 active boundaries pass on both sides: minimum3.465 against their input fill and3.128 against the actual outer surface. Text passes4.5 throughout. This checks runtime source-screen combinations in addition to reference token pairs; values are recorded in `interaction-validation.json`.

| Pair | Dark | Light |
|---|---:|---:|
| Old decorative border / field surface — fixed | 1.433 | 1.344 |
| New controlBorder / surface | 4.917 | 3.465 |
| controlBorder / group | 4.484 | 3.277 |
| brandFocus / surface | 8.825 | 6.833 |
| brandFocus / group | 8.049 | 6.463 |
| danger / surface | 9.326 | 7.114 |
| danger / group | 8.506 | 6.729 |
| body / surface | 15.606 | 16.072 |
| placeholder / surface | 7.176 | 5.386 |
| brand selected label / selected fill | 6.202 | 5.332 |
| onBrand / brand | 8.474 | 6.643 |
| onBrand / brandStrong | 10.079 | 8.621 |
| Worst primary press text/fill after .92 opacity over reviewed surrounding surfaces | 8.662 | 6.967 |
| Read-only value / inset | 15.900 | 13.693 |
| Disabled text / inset | 7.311 | 4.589 |
| controlBorder / readonly inset | 5.009 | 2.952 |

The last light pair is below3. It is explicitly disclosed rather than rounded up: the readonly field is labelled authoritative text with an explicit Read only caption, not an editable-field affordance; its boundary is not required to identify an active input. Canonical inset and tokens remain unchanged. Disabled components are inactive/exempt. If a later design makes inset an editable-field surface, this palette combination must be reconsidered. No active editable field was changed to inset. Selected fill alone remains insufficient; outline/check/label/state supply the distinction.

## 7. Selectors, autocomplete and source behavior

`SelectField` already forwarded appearance to `FormSelect`, `SelectionMenu`, choices and Create. Current InlineNameForm call sites already supplied v2. `AutocompleteField` already forwarded appearance to trigger, panel, search, suggestion rows, errors and Create. Both inherit corrected controls; no dropdown/host rewrite or new focus state machine was necessary.

The actual shared-component browser checks verify selected long-value retention; one dialog through open/inline/cancel; arrows/End/Tab focus movement, Escape dismissal from ordinary menu choices, trigger focus return; inline category create/cancel; autocomplete empty query, no matches, create, existing selection and explicit dismissal/focus return. Preview callbacks are synthetic and never touch application persistence. Actual Work normalization/identity rules are exercised by existing `autocomplete`/Work tests, not reimplemented in fixtures. Accent-insensitive suggestions and accent-sensitive persisted identity (`Álvaro` and `Alvaro`) remain unchanged.

Existing RNWeb integration limitation: TextInput's key handler stops propagation before the host's document listener, so Escape while typing in autocomplete does not close the panel. Explicit dismissal returns focus correctly. The host and autocomplete code are unchanged; this finding is recorded in interaction evidence and handed to3B-S for an independently tested keyboard slice. The existing RNWeb radio activation is Enter; Space is not supported by that Pressable/radio combination. Native keyboard/assistive activation requires real-device review. Neither limitation is reported as a passed capability.

Integer-centavo parsing, BRL formatting, partial receipts, reversals, client-first multiple allocations, actual/expected amounts, recurrence, completion, Journal drafts/conflicts and source routing are untouched. No enum/default/order changes. Existing primary brand/brandStrong/onBrand behavior and floating create controls remain covered by earlier16 button tests plus full suite.

## 8. Feature regression review

- Tasks: new and explicitly v2 component editor fields/choices inherit boundaries; ordinary legacy edit stays legacy; recurrence/weekday values, actions and indigo content preserved.
- Finance: transaction new/edit, category/search and period controls inherit shared states; centavos, source-linked restrictions and source actions unchanged.
- Commitments: new/edit kind/category/amount/date, payment confirmation and resume inherit fields; readonly kind, schedule, occurrence resolution and payment callbacks unchanged.
- Work: job/title/client/description, client creation/search, compensation and receipt allocation controls inherit; client identity, allocation totals, partial receipts and reversals unchanged.
- Fitness: v2 ExerciseEditor, RoutineEditor targets/selector rows and library search inherit; ActiveWorkout legacy nested forms and measurement semantics unchanged.
- Calendar: source delegation stays intact; actual ordinary Task editor path remains visually byte-identical in both theme captures. No calendar/source route edits.
- Journal: shared entry textarea and v2 buttons inherit changes; its larger caller writingHeight, identity, mood, daily selection, draft persistence and conflicts unchanged.

## 9. Visual evidence and findings

[Compact before/after gallery](shared-controls-inputs/index.html): 52 pairs /104 PNGs, with identical source fixtures, fonts, viewport, locale, timezone, Reduced Motion and caret/animation suppression. Before builds were frozen before runtime edits. Fixture hashes and entry/bundle provenance are preserved in manifests. Old phase evidence is untouched.

Both themes at390: inputs-focused, inputs-invalid-focused, readonly/disabled, choices/weekdays/segments/navigation, SelectField closed/open/inline, autocomplete empty/no matches, button variants and pressed primary; Task New/v2 component Edit, Fitness Exercise, Calendar-delegated legacy Task Edit, Transaction New/Edit, Work New/Edit, Record Payment, Commitment Payment Confirmation and Commitment Editor. Both themes also capture inputs at320/430 and doubled-text selections at320/430. The browser interaction matrix adds ordinary/doubled fields/readonly/select-open and selections at all three widths.

Meaningful corrections: neutral outlines now identify resting fields; copper focus remains distinct inside error context; selected checks/labels/outlines persist after release; transient press remains neutral; textarea shows its content within a usable writing area; disabled labels stay readable; shared navigation is copper. Geometry is identical in18/52 cases. Only the two deliberate legacy Calendar Task Edit PNGs are byte-identical; other differences arise from the scoped shared controls, reserved option boundary/text wrapping or textarea growth. Necessary changes are recorded rather than hidden by asserting screenshot equality.

Manual image review included light/dark input states, doubled text at320, inline create, Work Edit light, payment confirmation dark and button variants. No redesign of feature layout, art, type scales, sheet composition or action hierarchy was made.

## 10. Skills applied

- **Anthropic frontend-design:** maintained the approved warm editorial type/surface hierarchy; isolated essential neutral control boundaries from decorative card frames; rejected added glow/elevation.
- **Impeccable:** used context/craft-floor guidance for a bounded before/after state review; checked resting-vs-focus/invalid separation, typography density, edge widths, target growth and scope discipline. Comparison exposed the native editing-rectangle issue and the RNWeb read-only experiment, both corrected before final checks.
- **UI/UX Pro Max:** applied local accessibility/state/contrast guidance to non-text contrast, touch targets, visible selection, keyboard cues and large-text reflow. No unrelated palette/font recommendations were imported.
- **Expo Skills — building-native-ui:** inspected the installed SDK58/RN0.88 boundaries and preserved native tabs, sheets, picker/focus/keyboard ownership and logical sizing. Consulted [SDK58 docs](https://docs.expo.dev/versions/v58.0.0/), [Expo docs index](https://docs.expo.dev/llms.txt), [TextInput](https://reactnative.dev/docs/textinput) and [Pressable](https://reactnative.dev/docs/pressable). No dependencies/native build configuration added.

## 11. Accessibility and performance

Existing labels, roles, checked/expanded/busy/disabled states and refs remain. V2 field errors now link nativeID through aria-describedby; alert/live text and composed native accessibility hints retain source hints, helper/read-only/error information. Error+focus are independently visible. Read-only values remain readable; platform selection/copy behavior was preserved, not replaced. Existing native padding/line-height centering tests cover iOS and Android while the browser verifies actual editable typing. Target and text-size tests preserve natural content growth. UiPressable disabled controls no longer receive opacity/scale feedback; active motion/timings and Reduced Motion remain existing behavior.

No global control provider or new state machine, data query, list render, animation loop or layout measurement was added. Existing local focus state is reused. New helpers resolve small static style objects. Two useId associations add no domain work. Selector-host measurement and inline callbacks are unchanged. Captures use synthetic browser substitutes and are not accessibility certification.

## 12. Tests and validation

| Check | Result |
|---|---|
| Actual starting full suite | 1,478 passed;0 failed/skipped |
| Added focused controls tests | 18 passed,9 per theme |
| Shared controls/alignment/autocomplete/primary-button selection | 67 passed |
| Broader focused control + feature regressions | 257 passed;0 failed/skipped |
| Final full suite | 1,496 passed;0 failed/skipped,124.84s |
| Browser interaction/layout groups | 58 passed; existing TextInput Escape limitation recorded separately |
| Actual rendered field contrast | 20 representative screens;98 fields/96 active; all applicable inner/outer boundaries and text passed |
| TypeScript --noEmit | Passed |
| Changed-file ESLint | Passed,0 diagnostics |
| Full ESLint baseline comparison | Identical6 existing errors +2 warnings;0 new |
| iOS export | Passed, local `dist/shared-controls-inputs/export-ios` |
| Android export | Passed, local `dist/shared-controls-inputs/export-android` |
| git diff --check | Passed |
| Integrity / contrast / provenance | Passed;94 contrast records;2951 initial files unchanged;exactly4 runtime edits;no staging |

Commands use local installed Node/tsx/TypeScript/ESLint/Expo and `TZ=America/Sao_Paulo`, matching baseline. The full suite includes every Tasks, Calendar, Finance, Commitment, Work, Fitness and Journal regression. Focused257 tests separately ran `shared-controls-inputs`, `form-controls`, `form-field-alignment`, `autocomplete`, `context-menu`, `adaptive-sheet`, `soft-copper-buttons`, `new-task-editor`, `transactions-experience`, `transaction-editor-v2`, `commitment-editor-v2`, `commitment-payment-v2`, `work-forms`, `work-editor-v2`, `work-payment-v2`, `fitness-components`, `fitness-management`, `calendar-components`, `calendar-v2`, `journal-editor`, `journal-v2`.

Existing lint errors: `react/no-children-prop` in context-menu tests3, navigation-conventions tests2 and transactions-experience tests1. Existing warnings: two unused variables in tasks-experience tests. These unrelated files were not changed. Logs and local exports are ignored scratch under `dist/shared-controls-inputs`; reviewable captures/manifests remain in docs.

## 13. Changed-file inventory

Runtime changes (all under `src/components/`):

- `control-appearance.ts`: new v2-only field/selection resolvers; original legacy helpers preserved.
- `form-controls.tsx`: field/select/error associations and v2 state/geometry binding; segmented/choice/weekday improvements.
- `design-system.tsx`: UiButton variants/state boundary, disabled feedback, existing UiPressable focus color.
- `internal-navigation.tsx`: compact copper state, neutral press, disabled text,48 minimum width.

New tooling/tests:

- `scripts/preview-shared-controls-inputs.ts`
- `scripts/review-shared-controls-inputs.cjs`
- `scripts/check-shared-controls-inputs.cjs`
- `scripts/audit-shared-controls-inputs.cjs`
- `tests/shared-controls-inputs.test.ts`
- `docs/design-system/shared-controls-inputs-report.md`

New evidence under `docs/design-system/shared-controls-inputs/`:

- `initial-state.json`, `before.json`, `after.json`, `visual-comparison.json`, `interaction-validation.json`, `audit.json`, `index.html`.
- `before/` and `after/`, each exactly52 PNGs listed in the paired manifests. Exhaustive naming: at390 with `{dark,light}`: `inputs-focus`, `inputs-invalid-focus`, `readonly-disabled`, `selections`, `select-closed`, `select-open`, `select-inline`, `autocomplete-empty`, `autocomplete-no-matches`, `buttons`, `buttons-pressed`, `task-new`, `task-edit`, `fitness`, `calendar-task`, `transaction-new`, `transaction-edit`, `work-new`, `work-edit`, `record-payment`, `confirm-payment`, `commitment-editor`; plus `inputs-edges` and `selections-large` at `{320,430}` with `{dark,light}`. Filename format `{case}-{theme}-{width}.png`.

The machine inventory records every exact added path and the initial worktree status. No earlier evidence files were overwritten. No production selector/host/feature changes were needed merely to show progress.

## 14. Phase 3B-S handoff

Remaining shared presentation debt: `adaptive-sheet.tsx` default title/action/Back typography and surface; `back-button.tsx`; `form-selection-host.tsx` unconditional ThemedText heading, menu surfaceRaised/controlBorder/48-target height estimates; `context-menu.tsx` appearance defaults; `sheet-refresh-notice.tsx` and `status-text.tsx` feedback; `editor-section.tsx` defaults. Custom editorial and operational headers stay explicit.

Recommended first slice: explicit v2 default header/Back/Cancel/Save and SelectionOverlay heading/surface, preserving undefined legacy appearance. Then refresh/status presentation. Isolate the observed RNWeb TextInput key-propagation limitation and radio activation expectations as a keyboard regression slice with before/after tests; do not silently alter them while changing colors.

Dependencies: accepted3B-I control contract plus native focus/keyboard evidence. Invariants: one modal/overlay owner; measured anchor/inline heights; Android dismiss-before-action; first-action/trigger focus; original callbacks; keyboard reveal/safe areas; retained snapshot/error content; no new snap points, routes, drag interaction or navigation bar. Re-run adaptive-sheet/context-menu/form-controls/refresh/navigation tests and capture MonthChooser, Client History default header, custom Work/Commitment headers, inline create, refresh failure and action menus in both themes/large text.

## 15. Native verification still needed

Real iOS and Android: caret/selectionColor and text copy, editable/read-only/disabled native behavior, invalid announcements and error association with VoiceOver/TalkBack, focused+invalid ring clipping, focus return after selection/create/cancel, native keyboard/scroll reveal and menu repositioning, date-picker Back, Android hardware dismissal, actual48pt targets with very large system text, final-row/tab/safe-area clearance, press animation and Reduced Motion. Platform exports and browser substitutes do not prove these. No native screenshot or physical-device sign-off is claimed.

## 16. Git state

HEAD remains `16ebeab46d20e7a943f08fa017928ce0eb884c0e` on main. Starting modifications and untracked artifacts are preserved. The final tracked modified set has22 files:19 pre-existing plus3 newly modified tracked paths; the fourth runtime change overlaps pre-existing `design-system.tsx`. There are525 untracked files total,408 pre-existing and117 added in this phase (104PNG+7 evidence manifests/gallery+report+4 scripts+test). Nothing staged. No commit. No push. Current exact status is recorded in `audit.json`.

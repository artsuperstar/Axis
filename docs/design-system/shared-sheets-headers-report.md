# Phase 3B-S.1 — Shared sheet headers and selection surfaces

Implementation and automated/browser validation completed 2026-11-13. Native acceptance remains open, including a disclosed compounded synthetic header stress case. No commit or push.

## Scope, authority and starting state

Applied the existing visual audit, Soft Copper specification, migration plan, traceability, palette-cutover report and shared-controls-inputs report. This resolves the shared-header/selector portion of VU-05, portions of VU-10/13 and one explicit-v2 picker propagation gap. It does **not** close all of VU-05, VU-07, VU-10 or VU-13: feedback, ContextMenu defaults, legacy feature migrations and native acceptance remain.

Actual starting baseline:1,496 passing tests, TypeScript passed, full ESLint6 existing errors+2 warnings. Starting HEAD/main:`16ebeab46d20e7a943f08fa017928ce0eb884c0e`;22 modified tracked paths and525 untracked files already existed. Recorded SHA-256 for3,072 existing files before runtime edits. Exactly7 runtime files changed in this phase; the other3,065 initial files, including all earlier reports/captures/scripts and Phase3B-I controls, remain byte-identical.

## Initial architecture and root causes

| Owner | Existing contract / finding | Treatment |
|---|---|---|
| AdaptiveModal | Existing transparent native Modal, SafeAreaProvider, shared selection host, modal Back dispatch and nested-back registration | Unchanged |
| SheetViewport | Native keyboard subscriptions, measured window origin, usable height and safe areas | Unchanged |
| AdaptiveSheet | Measures header/body independently; owns body scroll/focus reveal. V2 canvas/border existed, but default title/Cancel/Back/confirm remained legacy; sheet corner radius12 applied universally | Complete only explicit-v2 header styling and radius20 |
| BackButton | Already delegates explicit v2 to existing quiet FormButton/UiButton with catalogue icon; caller owns navigation | Implementation unchanged; default v2 sheet now propagates appearance and requests iconOnly |
| PickerBackHeader | Already supports appearance and operational Manrope cardTitle | Implementation unchanged; correct missing TaskEditor appearance propagation |
| FormSelectionHost | One reducer/request/anchor/portal owner; measures heading/options, handles inline create and focus return | Controller unchanged; SelectionOverlay presentation only |
| SelectionOverlay | V2 surface existed but heading unconditionally ThemedText and menu used surface rather than raised selector surface | V2 selector heading and surface completed; action menus excluded |
| EditorSection | Already explicitly v2 and supports editorial/editorSection versus operational/cardTitle | Unchanged |
| ContextMenu | Shares host but has action presentation, first-action focus and Android Back behavior | Broad styling/default migration deferred; current action surface retained |

Root causes were partial appearance forwarding in AdaptiveSheet's default JSX; no explicit distinction between editorial and operational default titles; universal legacy sheet radius; unconditional legacy selector heading; and TaskEditor's picker header forwarding appearance only while editing recurrence. Custom feature headers were already intentional, not evidence that every header needed replacement.

## Exact component contracts and tokens

`AdaptiveSheet` retains `title`, `header`, `children`, `onDismiss`, `action`, `onConfirm`, `contentContainerStyle`, `appearance?: 'v2'`, `scrollBody`, `fillHeight`. Adds only `titleRole?: 'editorial' | 'operational'`, defaulting to editorial for the **default v2 header**. Undefined appearance remains legacy. Custom `header` takes precedence and ignores titleRole; no parallel header component hierarchy was introduced.

- Explicit-v2 sheet: existing `canvas` background and decorative `border`; top corners `Shape.sheet=20`. Square lower corners and full-width coverage remain.
- Default v2 editorial title: `UiText editorTitle`, Lora semibold26/34, `textPrimary`.
- Default v2 operational title: `UiText sheetTitle`, Manrope semibold18/24, `textPrimary`.
- Default v2 actions: existing v2 FormButton variants. Cancel remains quiet copper; confirm remains primary `brand`/`onBrand`, transient `brandStrong`. Back remains quiet copper, existing back glyph,48 minimum target, no solid copper fill.
- Header padding: horizontal16; vertical12. Existing gap8 and body padding16 remain. At width<360 or fontScale>=1.5 the default header places the naturally wrapping title above a wrapping action row. That column explicitly uses nowrap to avoid cross-axis growth; the action row may wrap. No fixed title height, truncation, font-scale cap or hidden action.
- Legacy: original ThemedText/system18/24, legacy FormButtons/Back, padding16, radius12. Explicit titleRole does not restyle legacy.
- V2 selector (not ContextMenu action presentation): `surfaceRaised`, `controlBorder`, radius12, existing shadow/elevation policy; `UiText cardTitle` Manrope16/24/`textPrimary`; subtle1pt `border` separator beneath existing8pt-padded heading. Existing option controls and check/selected/disabled behavior remain3B-I.
- ContextMenu action presentation retains current `surface`/`borderStrong`, no selector heading. Inline creation remains a selection presentation within the same owner.

BackButton/PickerBackHeader APIs and callbacks did not change. BackButton has no disabled prop or disabled current caller; underlying shared quiet-button disabled/focus/press behavior remains3B-I. No speculative navigation/disabled policy was added.

## Runtime changes

| File | Before -> after / reason |
|---|---|
| `src/components/adaptive-sheet.tsx` | Complete v2 default title/action/Back appearance; add explicit titleRole; apply20pt v2 corners and16×12 header padding; adapt default title/actions at narrow/large text. Measurement, body scrolling, maximum, inset and focus code retained |
| `src/components/form-selection-host.tsx` | V2 selector heading now UiText; raised selector surface/controlBorder and subtle separator. All controller functions unchanged; action-menu presentation excluded |
| `src/features/calendar/components/month-chooser.tsx` | Explicit operational titleRole for Choose month |
| `src/features/finance/work/components/work-view.tsx` | Explicit operational titleRole for the existing **client-specific history modal**, including long client names. Global Work History unchanged |
| `src/features/journal/components/journal-date.tsx` | Operational Choose journal date title; picker ownership/value callbacks unchanged |
| `src/features/journal/components/journal-leave.tsx` | Operational unsaved-changes decision title; save/discard/keep callbacks unchanged |
| `src/features/tasks/components/task-editor.tsx` | PickerBackHeader receives the resolved editor appearance in both main and recurrence sections. Ordinary existing Task Edit still resolves undefined/legacy |

## Caller coverage and appearance boundaries

Machine audit records54 direct AdaptiveSheet/WorkSheet/CommitmentSheet/BackButton/PickerBackHeader call sites with classification, file/line, appearance, custom-header flag and titleRole.

1. **Approved v2/custom headers retained:** Task New/recurrence, Task Categories, Finance Transaction Editor/Categories, Commitment Editor/Payment/Resume/Details/individual History, Work Editor/Record Payment/Job Details/Client Details, Fitness RoutineHeader/Routine Exercise Picker/Exercise Details. Their title/content/control composition is unchanged; shared v2 sheet corners become20.
2. **Inherited v2 defaults corrected:** Calendar MonthChooser; Work client-specific History; Journal date and leave decision; ExerciseEditor when called with v2. Editorial New exercise remains editorial; month/date/history/decision contexts explicitly operational.
3. **Legacy preserved:** Task Actions, per-task Occurrence History, ordinary Task Edit and its picker header, linked Transaction Details, ActiveWorkout Add Exercise/Set/Note/legacy ExerciseEditor; Manage Commitments remains its existing feature layout.
4. **Platform owned:** iOS/Android date/time widgets, Android picker launch, native Alert, NativeTabs, stack routes, transparent Modal request-close and native safe areas remain unchanged.
5. **Already-correct v2 outside sheets:** existing pushed Tasks/Work/Journal/rotations Back controls retain their APIs and styling; no global header redesign.

Generic SelectField/AutocompleteField appearance propagation was already complete in3B-I. No additional propagation edits were needed there. Undefined appearance is not inferred from a parent to restyle legacy descendants.

## Measured typography and geometry

Source-rendered RNWeb measurements, logical pixels; not native physical measurements. Exact paired data in `shared-sheets-headers/audit.json`.

| Capture / property | Before -> after |
|---|---|
| Normal operational header at390 | Height76 ->72; system18/24 -> Manrope18/24 |
| Normal editorial header at390 | Height76 ->72; system18/24 -> Lora26/34 |
| Long operational client-history header at390 | Height80 ->72; complete title wraps to48 high in both |
| Default header padding | 16 all sides ->12 vertical/16 horizontal |
| Shared v2 sheet corners | 12 ->20 |
| Default Back/Cancel/confirm minimum height | 44 ->48 via existing v2 controls |
| Selector heading | 40 ->41 total height, from new1pt separator; visible text remains16/24 with Manrope replacing system font |
| Selector padding/radius | 8 /12 unchanged |
| Legacy comparison | Height76, system18/24, padding16, radius12 unchanged; both PNGs byte-identical |
| Synthetic long editorial title at320/doubled | Header578 ->706; title area grows480 ->612 and uses full288 width rather than162.30. Actions remain within screen in keyboard-closed state |
| Same synthetic title at390/doubled | Header512 ->502; title width131.56 ->358; naturally measured, no fixed height |

Initial doubled-text review exposed inherited column wrapping pushing Save beyond the viewport; corrected by using nowrap on the stacked header column while allowing the action row to wrap. The final320 capture has Save x208.77,width95.23,ending304, within the16pt right inset. No negative margins/offsets or global typography/spacing changes were used.

No edits to sheet max-height calculation, body viewport/scroll logic, inset ownership, handle placement, drag behavior, anchor positions, list virtualization or sticky headers. Existing onLayout measurements account for the changed header height and selector separator; no fixed substitute measurement was introduced.

## Interaction and keyboard verification

48 browser interaction/layout groups passed, both themes at320/390/430 and ordinary/doubled text:

- Open/back-close and four rapid repeated open/close cycles.
- Original default confirm/cancel callbacks and retained field draft.
- Actual JournalLeave keep-editing decision.
- One selector menu, selected long value, reopen, inline create and cancel, explicit dismissal and trigger focus return.
- Actual nested Task recurrence and return to the editor.
- Picker-adjacent owned Back subsection.
- Action targets>=48 and inside viewport; last field/content scroll reachability.
- Simulated keyboard bounds for operational sheets and long operational Client History; no duplicated bottom inset.

Full suite and existing lifecycle tests exercise modal request-close, nested dismissal, dirty-state protections, refresh/focus and source actions. A new native-harness test verifies the actual Modal onRequestClose callback retains its owner, and the Task picker test checks both explicit-v2 New Task and a genuinely existing legacy Task record. Tests invoke the correct native host event rather than changing production behavior to satisfy the harness.

### Escape investigation

Reproduction: open Client autocomplete, type No match, press Escape while the search input owns focus; run against frozen before and after sources in both an actual modal-owned fixture and bare FormSelectionHost.

| Flow | Before | After |
|---|---|---|
| Bare host, typing Escape | Menu remains | Menu remains |
| AdaptiveModal-owned flow, typing Escape | Menu closes | Menu closes |
| Explicit dismissal / focus return | Works | Works |

Cause: installed RNWeb TextInput stops **keydown** propagation (`node_modules/react-native-web/dist/exports/TextInput/index.js:271`), so the existing host's document keydown handler does not receive Escape. RNWeb ModalContent instead listens to **keyup** (`Modal/ModalContent.js:26–35`) and calls onRequestClose. AdaptiveModal already dismisses the menu before considering parent/nested dismissal, so real modal-owned flow works. No new keyboard system, capture listener, native listener, focus owner or workaround was added. Bare pushed-screen/web-host remediation is deferred to3B-S.2. Escape is a browser keyboard event, not evidence about Android hardware Back or VoiceOver/TalkBack dismissal.

### Disclosed compounded stress constraint

The artificial **very long editorial title +320pt + doubled text + keyboardTop520** exhausts fixed-header space in the browser proxy. Save is not fully above the keyboard in either baseline (y513,height58) or final (y641,height62). This case is recorded as a limitation, not counted as a passed layout capability. The corresponding normal/large keyboard-closed case and the **real long Client History operational role** pass. Active default editorial titles such as New exercise are short; arbitrary unbounded editorial titles remain a constrained-height risk.

Do not call this native accepted. Reproduce with real system text and keyboard before adding header scrolling, title truncation or another measurement policy; those would change interaction/geometry beyond this small presentation batch. Carry a separate constrained-height header slice into3B-S.2/native follow-up. No field/body/inset policy was rewritten solely to conceal a browser stress result.

## Visual review and evidence

[Focused gallery](shared-sheets-headers/index.html):58 before/after pairs,116PNG. Captures cover operational/editorial/long/legacy/client-history/Journal headers; Back resting/pressed; selector selected/open, autocomplete search/empty and inline create; actual nested Task recurrence; Task picker-adjacent Back and generic picker-adjacent fixture; Calendar MonthChooser; Fitness Exercise; custom Transaction/Work/Record Payment/Commitment editors; narrow/large header and selector cases, both themes.

Data/font/viewport/locale/timezone/Reduced Motion/caret suppression match. Before builds were frozen before runtime edits. When correcting a review-only Task fixture that initially nested an extra Modal, both sides were rebuilt using original source files verified against initial SHA-256; no runtime source was temporarily reverted. Frozen fixture JSON preserves financial IDs/ordering. Review scratch snapshots use `.before` extensions to avoid entering TypeScript's project glob.

The2 legacy PNGs are byte-identical.16/58 cases retain identical measured control/heading geometry. Intended differences are v2 title/control family, smaller vertical header padding,20pt top corners, selector raised surface/separator, and natural narrow/large reflow. Custom feature header content remains deliberate. Browser native-widget substitutes do not render actual native picker contents, OS chrome, physical tabs or a real parent screen; isolated backdrop appearance is not a production redesign target.

## Accessibility and contrast

Default titles retain header role and full text; controls retain existing action labels. Selector parent heading, dialog name/modal semantics, accessibility escape, combobox values/expanded state, checked/disabled selection and focus-return refs remain unchanged. No new dismiss button or duplicate announcement was added. Existing UI-thread press feedback, focus ring and Reduced Motion are unchanged.

Runtime palette calculations:

| Pair | Dark | Light |
|---|---:|---:|
| Primary title / canvas |16.38 |14.51 |
| Primary selector text / surfaceRaised |13.41 |16.07 |
| Supporting text / surfaceRaised |8.26 |6.11 |
| Control boundary / surfaceRaised |4.23 |3.46 |
| Focus / surfaceRaised |7.59 |6.83 |
| Selected label / selected |6.20 |5.33 |
| Invalid boundary / field surface |9.33 |7.11 |

All14 calculated applicable pairs pass. Phase3B-I neutral field boundaries, focused+invalid layering, read-only differentiation, disabled state, selected checks and neutral press feedback are unchanged and re-tested. Contrast calculations and browser proxies are not accessibility certification.

## Required skills: actual contributions

- **Anthropic frontend-design:** classified editorial versus operational title use; preserved warm Lora display, Manrope decisions/data and restrained neutral headers; retained approved custom feature composition.
- **Impeccable:** compared actual before/after headers/surfaces, alignment, padding and edge widths; identified the stacked-column overflow and checked its correction; avoided glow, decorative nesting or broad polish.
- **UI/UX Pro Max:** reviewed48pt targets, explicit selection/expanded states, Back clarity, focus return, large-text reflow and meaningful contrast using its local UX guidance. No unrelated palette/type recommendations imported.
- **Expo building-native-ui:** checked installed SDK58/RN0.88 and [SDK58 documentation](https://docs.expo.dev/versions/v58.0.0/), retaining native Modal/NativeTabs/picker/safe-area/focus ownership. No new portal/native dependencies or navigation policy.

## Tests and validation

| Check | Result |
|---|---|
| Actual initial full suite |1,496 passed;0 failed/skipped |
| New focused shared-sheets tests |22 passed |
| Initial existing targeted regression selection |104 passed |
| Final focused shared/feature regressions |249 passed;0 failed/skipped |
| Final full suite |1,518 passed;0 failed/skipped;91.60s |
| Browser groups |48 passed;4 before/after Escape reproductions;2 compounded stress records explicitly limited |
| TypeScript --noEmit |Passed |
| Changed-file ESLint |Passed,0 diagnostics |
| Full ESLint comparison |Identical6 existing errors+2 warnings;0 new |
| iOS export |Passed; local `dist/shared-sheets-headers/export-ios` |
| Android export |Passed; local `dist/shared-sheets-headers/export-android` |
| git diff --check |Passed |
| Integrity/ownership |3,065 initial files unchanged;7 scoped runtime edits; native modal/viewport and selection controller functions unchanged |

Used `TZ=America/Sao_Paulo` for Node/tsx tests, matching baseline; no timezone/date logic edits. Focused249 tests cover shared-sheets-headers, shared-controls-inputs, adaptive-sheet, context-menu, form-controls, autocomplete, navigation-conventions, refresh-lifecycle, new-task-editor, transaction-editor-v2, commitment-editor-v2, commitment-payment-v2, work-editor-v2, work-payment-v2, work-history-v2, fitness-components, calendar-v2, journal-v2 and journal-conflicts. Full suite covers remaining Tasks/Finance/Work/Fitness/Calendar/Journal behavior.

Existing lint errors remain `react/no-children-prop`: context-menu tests3, navigation-conventions tests2, transactions-experience tests1. Existing warnings remain two unused variables in tasks-experience tests. No tests weakened; no diagnostics hidden. Local logs/builds are ignored scratch. Domain, centavos/formatting, allocations/client identity, recurrence, exercise records, Journal drafts/conflicts, source CRUD, schemas, persistence, dependencies and assets are unchanged.

## Phase3B-S.2 handoff

Recommended implementation order:

1. **Feedback:** `sheet-refresh-notice.tsx`, `status-text.tsx`, relevant `editor-section.tsx`/view wrappers. Add explicit resolved v2 presentation without duplicate notices or changed retained-data/retry/alert behavior. Preserve snapshots and existing custom composition.
2. **ContextMenu defaults:** `context-menu.tsx` and action-only branch of `form-selection-host.tsx`. This phase deliberately kept action menus on current surface/borderStrong. Review explicit-v2 action-menu headingless surface/controls,48pt estimates and legacy default boundary independently; keep first-action focus and Android Back/dismiss-before-action.
3. **Bare-host web keyboard slice:** `form-selection-host.tsx`, `autocomplete-field.tsx`, existing TextInput integration. Use the recorded bare-host-vs-Modal reproduction; avoid intercepting native keyboard events or changing modal requestClose. Re-test Escape/Tab/arrows and inline create/cancel, parent dirty-state protection and return focus.
4. **Constrained-height header/native validation:** `adaptive-sheet.tsx` with existing layout helpers only as justified by OS reproduction of the compounded stress case. Do not silently add title truncation, header scrolling, new snap points, inset subtraction or a different body focus owner.

Dependencies: retain the accepted3B-I field/button contract and this explicit appearance/titleRole boundary; confirm keyboard/native behavior before release. Risks: duplicate feedback, unintended legacy migration, action-menu ownership changes, stale overlay callbacks, clipped large-title actions, native focus/keyboard/inset regressions. Do not bundle ordinary Task Edit/actions/history, linked transactions, Manage Commitments, ActiveWorkout migration, Home art or app-icon work. Global Work History is already v2 and remains unchanged.

## Native verification still needed

VoiceOver/TalkBack title grouping and control announcements; native focus return after option/create/cancel; iOS dismissal/unsaved return; Android hardware Back and menu-first dismissal; keyboard show/hide and obscured-field reveal; real native picker return;48pt hit areas; OS Dynamic Type, especially long titles with keyboard; final-row clearance and all safe-area edges. Exports/browser tests do not replace these checks. The compounded synthetic long-editorial/large-text/keyboard case remains explicitly unaccepted.

## Complete changed-file inventory and Git state

Runtime: exactly the7 files listed above. New test: `tests/shared-sheets-headers.test.ts`. New tools: `scripts/preview-shared-sheets-headers.ts`, `scripts/review-shared-sheets-headers.cjs`, `scripts/check-shared-sheets-headers.cjs`, `scripts/audit-shared-sheets-headers.cjs`. New report: this file.

Evidence folder `docs/design-system/shared-sheets-headers/`: `initial-state.json`, `before.json`, `after.json`, `visual-comparison.json`, `interaction-validation.json`, `audit.json`, `index.html`; and58PNG in each of `before/` and `after/`. Exhaustive filename convention `{case}-{dark|light}-{width}.png`: at390 operational, editorial, long, legacy, history, journal, calendar, fitness, task, back-pressed, nested-task, task-picker, selector, inline, autocomplete, empty, picker, context, transaction-edit, work-edit, record-payment, commitment-editor; long-edges at320/430; long-large at320/390/430; selector-large at320/430. Exact paths/hashes in manifests and audit inventory.

Expected final phase additions:129 files (116PNG+7 evidence files+report+4 scripts+test). Final tracked modified paths29:22 starting paths plus7 new modifications. Untracked files654:525 starting plus129 new. HEAD unchanged on main; nothing staged; no commit/push. Earlier3B-I controls, old phase evidence and all prior uncommitted work preserved. Current exact status and invariant checks are in `audit.json`.

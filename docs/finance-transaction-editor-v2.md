# Finance Transaction Editor v2 — New/Edit Transaction

## Scope and authority

This focused pass migrates the shared New/Edit Transaction form to Axis v2 and restores the Transactions list's anchored creation button. Existing Finance validation and ownership outrank the generated mockup. Overview, Categories management, Commitments, Work, ledger queries, category icon identity, schema, migrations and dependencies are unchanged by this pass. All previous uncommitted Transactions v2 work is retained.

This is an ordinary extension of the approved **Warm Editorial Hearth** identity recorded in [PRODUCT.md](../PRODUCT.md), [Visual Groundwork](design-system-v2-visual-groundwork.md) and [Stage 14D](design-system-v2-stage-14d.md). This document is the scoped implementation handoff; it does not replace the global design record or finalize the Axis palette. `PRODUCT.md` still mentions SDK 57 in its earlier operating-context record; current `package.json` uses Expo `~58.0.17`. That pre-existing documentation drift is outside this pass.

The work began with **60 already uncommitted files**, including the approved Transactions v2 implementation and its evidence. That inherited work is preserved. The file list below identifies this editor pass separately; a complete working-tree diff also contains those earlier changes.

## Existing editor behavior audit

| Area | Existing behavior preserved |
| --- | --- |
| Ownership | One `TransactionEditor` initializes its draft from the existing transaction or `transactionDraft()`; Finance and Home callers retain ownership of persistence and dismissal. |
| Presentation | Existing `AdaptiveModal` → `AdaptiveSheet`, selection host, platform Back/escape and focus-reveal/keyboard measurements. No new stack or modal system. |
| Defaults | New is Expense, blank amount/description/note, no category, and today's local civil date. |
| Type | Existing Expense/Income choices; changing type clears an incompatible category through `changeTransactionType`. |
| Money | `parseBrlAmount` accepts existing Brazilian syntax and optional `R$`; exact positive safe-integer centavos, no floating-point multiplication. Zero, negatives, malformed syntax and overflow remain rejected. |
| Description | Required; persistence trims leading/trailing whitespace. No new length limit, merchant lookup or inference. |
| Category | Type-compatible active choices, No category, inline custom creation, and retained historical archived references on unchanged edits. |
| Note | Optional; existing persistence trims outer whitespace and stores empty as null. Interior whitespace remains intact. |
| Date | Required local `YYYY-MM-DD`; today/past only. Existing picker callbacks and selected date behavior remain. |
| Save | Explicit synchronous create/update callback, existing validation order, duplicate-submit ref, no autosave. Failed saves reset the ref and retain the draft. |
| Dismissal | Cancel/outside/platform Back dismiss the unsaved editor directly. There was no dirty-discard confirmation in this editor; none is invented. Selection overlays consume dismissal before their parent. |
| Linked payment | Commitment type stays locked, safe existing fields remain editable. Work type and amount stay locked to allocations. Existing source details/undo ownership and data-layer checks remain authoritative. |
| List | The prior header New transaction action is replaced by the explicitly requested bottom-right shared floating action. All other Transactions v2 features remain. |

## Visual hierarchy

The original editor already shared one New/Edit component and grouped fields under Transaction, Details and Date headings. It used legacy theme controls, uncontained `View` groups, a single-line Description, a multiline Note with an 80-point minimum, and one form-level error. The migration keeps those field responsibilities and gives each group a quiet owned surface:

1. **Transaction:** generic credit-card icon, Expense/Income segmented control and prominent Amount field.
2. **Details:** document icon, Description, existing tag-led Category selector and multiline Note.
3. **Date:** calendar icon, existing localized native date selector and concise guidance.

`EditorSection`, shared form controls and `AdaptiveSheet appearance="v2"` provide the incumbent Lora/Manrope, cream/charcoal, subtle-border and radius treatment. The sheet's rounded presentation and safe-area/keyboard sizing remain shared infrastructure. Its small handle is decorative; it does not add drag-to-dismiss behavior.

The header uses one coherent back-arrow/Cancel action, centered New transaction or Edit transaction title and explicit Save. At 320-point width or enlarged text, title and actions occupy separate rows. The normal 390-point header keeps its title on one line. No gradient, glass, heavy shadow, brand imagery or final global color-unification decision is introduced.

### Incumbent system evidence

The implementation consumes [design-system-v2.ts](../src/constants/design-system-v2.ts) and existing shared components rather than creating a second token set:

| Existing source | Application in this editor |
| --- | --- |
| `DesignColors` light/dark roles | Warm canvas, `group` sections, `surface` inputs, semantic border/text/error colors and existing provisional `brand`/`brandSoft` accents. No token values change. |
| `DesignProvider` / `UiText` | Bundled Lora Semibold for editorial titles/section headings and Manrope for interface text; existing system-font fallback remains. |
| `DesignSpace.md` / `sm` | 12-point section/body/header padding and section gaps; 8-point header-action gaps. |
| `Shape.group` / `control` / `sheet` | Existing 16-point groups, 10-point controls and 20-point shared sheet corners. Sections use a one-point semantic border, with no added section shadow. |
| `DesignTypography` | Existing editor title/section, field label, secondary and numeric roles. The header locally uses 22/30 below width 430 and 26/34 otherwise; Amount uses 24-point tabular numerals and a 56-point minimum. |
| `TouchTarget` / `UiPressable` | Shared 48-point control minimum and existing focus/press/Reduced Motion behavior. The circular FAB retains its 56-point size. |
| `UiIcon` outline vocabulary | One generic `creditCard` glyph is added for Transaction; existing document/calendar/tag/plus roles remain semantic and decorative where appropriate. |

Header stacking occurs below width 390 or at font scale 1.5 and above. Section icon/heading stacking is narrower: below width 390 **and** font scale 1.5 and above. These are local adaptation rules for this form.

## Fields, validation and readable values

- The v2 segmented control retains announced radio selection and disabled states. It uses intrinsic segment widths and the shared enlarged-text column arrangement.
- Amount reuses the same native single-line control and parser. The existing iOS numbers-and-punctuation / Android decimal keyboard choice remains. A measured decorative `R$` suffix reserves input padding and cannot cover the entered content. Other `FormField` consumers retain their original structure when the new optional suffix is absent.
- Native single-line editing scrolls horizontally for a value wider than its viewport. At font scale 1.5 and above or when the raw input exceeds 14 characters, an additional complete selectable raw-value readout wraps below the field. It does not round, parse or silently repair the draft; every entered centavo remains readable while editing. Stress evidence includes the maximum valid `90.071.992.547.409,91` (`Number.MAX_SAFE_INTEGER` centavos).
- Existing validation messages are located beside Description, Amount, Category or Date. Other persistence errors remain a form-level announced error. Validation order, domain messages and rejection rules are unchanged.
- Description has the neutral placeholder “What was this transaction for?” and grows from a 52-point minimum as its text wraps. Note remains optional, grows from a 96-point minimum for longer writing and has no competing inner scroller. Both use content-size measurements and `scrollEnabled={false}`. Neither field changes the existing persistence normalization.
- The Category control remains `SelectField` with the existing options/archival logic. Inline custom creation inherits v2 presentation and still selects only after successful creation. The Finance Categories management screen is not redesigned.
- The Date section still uses the existing community picker on native and text-date fallback on web. Its maximum remains today. iOS spinner changes and Back retain the existing draft semantics; Android cancellation retains its existing behavior. Transaction date is not replaced with commitment due date or an expected Work date.

## Save, restrictions and dismissal

Save remains in the measured fixed header above the scroll body. The synchronous save guard prevents repeated callbacks; on failure the same working draft and Save action remain available. Category-read readiness continues to disable saving until authoritative options are available. There is no new loading protocol or autosave.

Manual entries still open editing through the existing list body/menu. Linked entries still open details first, with existing native-dismissal ordering before protected editing. Commitment and Work restrictions, provenance, Undo routes, soft deletion and data-layer consistency checks are unchanged.

## Floating creation action

The shared 56-point `FloatingAddButton` now uses v2 colors, outline plus, named accessibility and reduced-motion-aware press feedback. Its shared styling also reaches existing callers, including Home; their action callbacks and placement remain owned by those callers. Finance renders it only for Transactions when no editor, linked detail or category modal owns the foreground, and disables it until a snapshot exists. Its label is **New transaction**.

The button is anchored 16 points from the bottom/right of the existing safe-area-owned view. Native tabs and app-wide safe-area handling are unchanged. The list reserves **88 points** (`floatingAddClearance`) below its content. There is one create affordance: the heading button is removed. Search, All/Expenses/Income, category icons, grouping, cursor paging, source restrictions, row actions, empty states and Categories access are preserved.

## Responsive behavior and accessibility

The review matrix covers 320/390/430 widths, both themes and normal/doubled text. Narrow enlarged section headers may stack their icon above the heading through an optional `EditorSection` prop; other callers retain the default. Sections have no fixed height. Long inputs/readouts and labels wrap without covering neighboring controls.

Shared controls retain 48-point minimum touch targets, named required fields, radio selection, disabled states and announced errors. Section icons and the currency suffix are decorative. The floating plus has an explicit action label. Existing Reduced Motion handling is reused. No meaning depends solely on color.

The sheet retains one vertical form scroll owner, focused-field reveal and measured keyboard viewport handling. Long Description/Note grow instead of trapping scrolling inside a bounded textarea. Parent-owned safe areas and native tab clearance remain intact.

## Skill findings

- **Anthropic frontend-design:** The supplied form composition governs the three-section hierarchy, compact serif titles and restrained amount emphasis. Generic section imagery and a neutral description placeholder replace illustrative brands.
- **Impeccable:** Reviewed section density, field alignment, header balance, theme hierarchy and minimal nesting. Initial visual inspection corrected title wrapping and supplied complete long-value visibility. The independent native-oriented review also audits the evidence itself; font/scale timing and real list scrolling are stated in capture provenance.
- **UI/UX Pro Max:** Local mobile form guidance reinforced visible labels, appropriate keyboards, clear field errors, explicit Save and one reachable creation action. No new merchant autocomplete, fuzzy behavior or dirty-confirmation flow is added.
- **Expo Skills:** Preserved SDK58 AdaptiveModal/AdaptiveSheet, selection host, native picker, safe-area ownership and measured focused-input reveal. Generic automatic-inset/navigation advice does not override the established Axis architecture. Browser captures cannot certify UIKit/Android keyboard behavior.

## Review evidence and limits

[Capture index](previews/transaction-editor-v2/README.md) documents the real-component RN Web fixture, actual native boundaries, simulated keyboard frame, browser date callback boundary and responsive cases. No native keyboard or community-picker screenshot is fabricated. The browser fixture restores exact input values after font/scale settling to trigger RN Web multiline measurement; this is disclosed and does not establish native mount behavior.

The independent reviewer requested corrections to three capture issues: multiline initialization after fonts/scaling, keyboard screenshot/geometry agreement, and an actually scrolled final-list view. Recapture resolved all three, and a fresh full review returned **SHIP** without requesting a production fix. The 320-point doubled-text Details crops demonstrate complete Description/category content; their lower portion is clipped by the outer scroll viewport and they do not show the entire Details section. Separate long-note evidence and list/scroll checks cover their respective cases.

The parent compares the supplied image directly; the independent reviewer receives the original text brief and composition description because the conversation image has no local file path. That reviewer must not claim a pixel comparison with an unavailable image.

## Files and tests

Production scope: `transaction-editor.tsx`, `finance-screen.tsx`, `transactions-content.tsx`, shared `floating-add-button.tsx`, optional `FormField.trailingText`, optional `EditorSection.stackHeading` and generic `UiIcon.creditCard`.

| Editor-pass files | Purpose |
| --- | --- |
| `src/features/finance/components/transaction-editor.tsx` | Shared New/Edit v2 form, growing fields and raw amount readout. |
| `src/features/finance/finance-screen.tsx`, `src/features/finance/components/transactions-content.tsx` | Restored anchored create action, removed heading duplicate and list clearance. |
| `src/components/{floating-add-button,form-controls,editor-section,ui-icon}.tsx` | Shared FAB presentation, optional currency suffix/stacking and generic credit-card icon. |
| `tests/transaction-editor-v2.test.ts`, `tests/transactions-experience.test.ts`, `tests/home-experience.test.ts` | New editor coverage and creation/error-presentation regressions. |
| `scripts/preview-transaction-editor-v2.ts`, `scripts/review-transaction-editor-v2.cjs` | Real-component review fixture and automated capture checks. |
| `docs/finance-transaction-editor-v2.md`, `docs/previews/transaction-editor-v2/` | Scoped implementation handoff and 42 PNGs with capture diagnostics. |

`FormField` retains the original input structure when `trailingText` is absent; `EditorSection.stackHeading` defaults to false. The editor opts into intrinsic segmented widths with the already available `equalWidth={false}`; the shared default remains true. No shared default changes are implied by those opt-ins.

Focused tests cover restored floating creation/clearance/modal hiding, three-section ownership, no duplicate heading action, default type, explicit and duplicate Save, invalid monetary input preservation, exact centavos, description errors, optional-note normalization, retained archived-category edits, incompatible type changes, local/future dates, failed database writes and direct Cancel semantics. Existing Finance/category/ledger/Commitments/Work/navigation/refresh tests remain in the validation group.

Final validation: **252 focused tests passed; 1,232 full-suite tests passed, zero failed**. TypeScript and both SDK 58 platform exports passed. ESLint retains six existing errors and two existing warnings, with zero new diagnostics. Non-failing React `act` warnings remain in existing Home paths around asynchronous `DesignProvider` font or motion initialization in native test mocks. Capture checks passed all 26 scenes/42 PNGs with zero failures. The [capture index](previews/transaction-editor-v2/README.md#review-and-validation) records the evidence and limits; the final git diff --check passed after documentation writes. No commit or push is authorized or performed.

## Physical testing still needed

On iOS and Android: actual modal safe areas and tab clearance; keyboard show/hide, focus and scrolling; fixed Save reachability; very long amount horizontal editing plus full readout; native multiline initial/edit measurement; native date picker appearance, cancellation and maximum; Category picker/inline creation; Back/escape/Cancel semantics; VoiceOver/TalkBack labels and error announcements; doubled Dynamic Type; linked detail-to-editor transitions; and FAB anchoring near the last historical record.

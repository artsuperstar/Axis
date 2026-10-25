# Finance Commitment Editor v2 — Mobile-First New/Edit

## Scope and design authority

New/Edit Commitment now extends the incumbent **Warm Editorial Hearth** system in **Operate** mode with one shared editor, vertical full-width fields and three owned sections: **Commitment**, **Schedule** and **Details**. Existing financial behavior outranks the mockup. This pass supersedes the New/Edit legacy visual status in the [main Commitments record](finance-commitments-v2.md); Payment, Resume, Details, History and main list/cards retain their existing presentation and behavior.

The [Transaction Editor v2](finance-transaction-editor-v2.md), existing design tokens and shared sheet/form components provide the incumbent visual language. The earlier reference placed labels beside inputs and was rejected because those horizontal rows crowded phone-width fields. The implemented editor follows the latest vertical composition; it does not force every section above the fold.

This is an ordinary extension, with no new visual world, global tokens or final palette commitment. PRODUCT.md's older SDK57 reference and absent DESIGN.md are pre-existing documentation drift. This stage does not repair global product/design files or change domain services, schema, migrations or dependencies.

## Existing editor audit

| # | Concern | Existing behavior and current preservation |
| --- | --- | --- |
| 1 | New entry | Add commitment opens the existing modal/editor with a fresh draft; initial kind remains Bill |
| 2 | Edit entry | Existing series/details management opens Edit with the saved parent and schedule |
| 3 | Shared form | New/Edit use the same CommitmentEditor; only item-dependent fields/restrictions differ |
| 4 | Bill fields | Type, required Title, required Expected amount, required First due date for New, optional Expense category |
| 5 | Subscription fields | Same supported fields and monthly model as Bill; no new weekly/yearly interval selector |
| 6 | Installment fields | Required Installment amount and Number of installments supplement the common fields; count remains 1 through 1200 |
| 7 | Type switching | New can switch kind while retaining unrelated title, amount, due date and category drafts; Edit locks kind |
| 8 | Money | Existing whole-string BRL parser, positive safe-integer centavos and exact formatting remain authoritative |
| 9 | Due date | Local civil-date state with existing native picker; New has no payment/Transaction-style maximum of today |
| 10 | Recurrence | Existing monthly schedules and fixed billing-day interpretation; no new recurrence fields |
| 11 | Installment sequence | Count/sequence remain service-owned; count is read-only on Edit and progress is not a new editable field |
| 12 | Categories | Existing Expense-compatible active choices, No category, retained archived selection and inline New expense category helper |
| 13 | Note support | Commitment draft/schema has no persisted Note property; the mockup's example Note is omitted |
| 14 | Required/optional | Kind, title, amount and valid New first date are required; installment count is conditional; category is optional |
| 15 | Validation | Existing validateCommitmentDraft order/messages and form-level error boundary retained; no new business validator or title limit |
| 16 | Persistence | Explicit Save invokes existing create/edit through Finance mutation/reload; no autosave or premature ledger Expense |
| 17 | Edit restrictions | Existing kind, installment count and schedule anchor remain fixed; Pause/Resume owns anchor changes; amount edits preserve retained past/paid expectations |
| 18 | Keyboard/scroll | One existing sheet FormScrollView and shared focused-field reveal remain; growing Title has no inner scroll owner |
| 19 | Dismissal/drafts | Cancel/outside/platform Back follow existing dismissal and discard the editor draft; no new unsaved-change confirmation |
| 20 | Modal/safe areas | Existing AdaptiveModal / AdaptiveSheet own presentation, native insets, measured header/body and keyboard viewport |

The previous legacy editor already had these fields and services. The rejected horizontal layout was a reference proposal; it is not the baseline for changing domain capabilities.

## New composition and incumbent-system comparison

The sheet retains its existing measured native presentation, with a decorative handle and fixed **Cancel / New commitment or Edit commitment / Save** header. At widths below 390 or font scale 1.5 and above, the title moves above the action row. Otherwise the serif title sits between Cancel and Save. No duplicate Back or second modal system is introduced.

| Incumbent rule | Editor application |
| --- | --- |
| Lora editorial / Manrope practical interface | Existing editorTitle/editorSection roles; local header sizing is 22/30; labels, inputs, money and help text remain practical sans-serif |
| Warm cream / warm charcoal | Shared v2 canvas/group/control/text/border/brand roles in light/dark mode |
| Quiet owned surfaces | Three existing EditorSection groups with semantic Receipt, Calendar and Tag imagery; no cards around each field |
| Existing rhythm and shapes | Existing group/control radii, 12-point editor padding/gaps and natural-height sections |
| Shared native form behavior | Existing field labels, selected/disabled radios, selection host, date picker and measured keyboard/focus infrastructure |
| Provisional palette | Reuses current scoped appearance; no new gradient, art, logo, global token or permanent Finance color decision |

All ordinary labels remain **above** their controls across widths; fields stay full width. The type control reuses intrinsic widths, with an optional shared `stacked` setting for widths below 390; its default remains false. Existing shared font-scale behavior also stacks radios at enlarged text. A v2-only FormSelect value `minWidth: 0` lets long category text yield room to its chevron. No shared default selection or financial behavior changes.

## Sections and fields by kind

**Commitment** owns Type, Title and expected amount. **Schedule** owns the New first due date or Edit anchor explanation, plus the conditional installment count. **Details** owns Category. Its supporting text is “Categorize this commitment.” and does not promise a Note field. Below the sections, a quiet generic Info icon accompanies “Planned commitments affect Expenses only when you confirm a payment.”

| Field | New Bill / Subscription | New Installment | Edit |
| --- | --- | --- | --- |
| Type | Bill default; all three kinds selectable | Selected Installment | Saved kind visible and disabled |
| Title | Required | Required | Saved title, editable |
| Amount | Expected amount | Installment amount | Current parent amount, editable under existing service rules |
| First due date | Required local date, today default, future allowed | Same | Informational schedule anchor; use Pause/Resume to change |
| Number of installments | Absent | Required 1–1200 | Present only for Installment; read-only |
| Category | Optional Expense-compatible choice | Same | Saved choice, including retained archived reference |
| Note | Unsupported; absent | Unsupported; absent | Unsupported; absent |

There is no provider/merchant recognition, title-derived icon, extra recurrence selector, plan-total calculation or lifecycle control added to New Commitment.

## Title and exact amount

Title is a required full-width multiline field, growing from a 52-point minimum using content-size measurement. It retains the shared focus handling and sets `scrollEnabled={false}` so the sheet owns vertical movement. On Save, existing title normalization trims/collapses whitespace. There was no existing maximum length, and none is introduced. No title/category inference or autocomplete is added.

Amount keeps the existing expected-versus-actual meaning: it records a plan's expectation, or the amount of each installment, rather than a paid ledger movement. The parser accepts the established Brazilian whole-string notation, rejects zero/negative/malformed/out-of-range values and uses integer digit handling through the safe-centavo range. No floating-point persistence or abbreviated amount is introduced.

For nonempty values at font scale 1.5 and above, or raw strings longer than 14 characters, a complete selectable raw amount readout wraps below the field. It displays the entered draft without reparsing, rounding or silently correcting it. Stress evidence includes `90.071.992.547.409,91`, the maximum supported integer-centavo value. Platform-appropriate amount keyboards remain unchanged.

## Scheduling and type-switching behavior

All three kinds retain the existing monthly model. The first due date establishes the schedule's start/billing-day convention; short-month clamping, leap years, monthly installment numbering, historical catch-up, the upcoming preview horizon, lifecycle states and occurrence outcomes are unchanged. The editor offers no weekly/yearly or merchant-derived recurrence.

New accepts valid local dates before or after today under existing rules. Its native first-date picker receives no minimum/maximum, and it does not inherit the ordinary Transaction editor's future-date prohibition. Native iOS keeps the existing spinner/return flow; Android keeps the existing date dialog/callback. The web fallback remains a text civil-date field. Payment's nonfuture date and Resume's minimum-date rules remain in their own existing flows.

Switching New kind preserves Title, Amount, first date and Category. An installment count draft survives switching away and back. Saving Bill/Subscription normalizes installmentCount to null through the existing validator; hidden count text never becomes a noninstallment plan field. Installment validates the positive integer range 1–1200. Sequence/progress continues to derive from schedule/occurrence identities, never from visible form controls.

Edit prepopulates current title, parent expected amount, category, kind/count and schedule anchor. Kind/count/anchor remain locked at both UI and service boundaries. Amount changes follow existing future scheduling rules: for Active parents, expectations after today adopt the new amount; retained past/paid expectations and actual paid values remain unchanged. Paused/Ended/Completed states and source-aware reversal are not altered by editing presentation.

## Category integration and unsupported Note

The existing Expense category selector supplies built-ins/custom active records plus No category. A saved archived category remains displayed with “(archived)” and can be retained while editing; the menu offers active alternatives rather than selecting another archived category. The existing service preserves compatible references and rejects incompatible choices.

Inline New expense category still calls `createFinanceCategorySelection`, creates through the existing Finance service, selects the returned identity only after success, and closes back to the parent draft. Title/amount/type/date remain intact. Failed creation retains its working inline draft and existing error behavior. Categories do not come from commitment titles or brands.

There is no persisted Commitment Note field. The non-authoritative mockup example is therefore omitted without a schema change; the quiet informational note is explanatory UI text only. Creating/editing a commitment can create/update planned schedule/occurrence records, but cannot create an actual Expense before payment confirmation.

## Validation, Save and dismissal

Save remains the explicit boundary. The same validator checks kind, normalized required title, valid first date, conditional installment count and exact amount; service category/edit restrictions remain authoritative. Existing validation order and messages remain unchanged and appear in the existing form-level error area. This presentation pass does not claim new field-adjacent error routing.

A synchronous ref guard prevents duplicate Save callbacks. Validation or persistence failure resets that guard, retains the draft/error and permits retry. Success invokes the existing create/update callback and dismisses through the existing flow; Finance mutation/reload preserves source-owned refresh behavior. There is no autosave, asynchronous loading protocol or new save-time financial rule.

Cancel and established outside/platform Back dismissal immediately close the editor under existing semantics. No dirty-confirmation dialog is invented. Category/date navigation keeps its existing nested selection behavior. Header Save/Cancel stay outside the body scroll owner, including the measured keyboard-constrained viewport.

## Native layout, accessibility and performance

AdaptiveModal remains the outer owner and AdaptiveSheet opts into v2 appearance. Its existing FormScrollView provides the single body scroller, handled control taps, focused-field reveal and keyboard viewport measurements; automatic keyboard insets are not layered over the shared mechanism. Title expands instead of introducing a nested textarea scroller. Sections and informational text remain reachable by vertical scrolling, without fixing the sheet height to the reference image.

The responsive matrix includes 320/390/430 widths, light/dark, all kinds/New/Edit and simulated doubled text. At narrow enlarged sizes section headings may stack their icon/title using the existing opt-in. Long category value shrinking preserves the chevron. Required labels, selected/disabled type states, explicit Cancel/Save, announced errors, decorative icons and existing Reduced Motion behavior reuse shared primitives. Type and status are not communicated by color alone.

The editor adds no lifetime collection read, extra schema/query path or heavy asset. Existing category reads, form state and source-owned scheduling remain in place. Browser font/label geometry and keyboard-frame simulation establish their stated fixture behavior, not native font measurement, accessibility, focus or device performance.

## Skills and review findings

- **frontend-design:** Followed the latest reference's phone-width vertical hierarchy and relationship to the established Transaction editor. The main implementation agent compared the user image directly; three owned sections and restrained secondary guidance preserve its intended composition.
- **Impeccable:** Audited whitespace, readability, long amounts/category names, header balance and themes. The fresh independent reviewer examined all **50 current PNGs** and returned **SHIP** within the presentation evidence scope. Earlier oversized locator-section captures were discarded because viewport resizing/clipping made them unsuitable; current evidence uses configured-viewport screenshots after real scrolling. The documentation handoff compares this ordinary extension with the incumbent system and records the actual limits. The HTML/CSS detector does not apply to native React Native production targets.
- **UI/UX Pro Max:** Form-label and validation-feedback guidance reinforced clear labels above controls, required/selected states and understandable feedback while preserving the existing validation/persistence boundary.
- **Expo Skills:** Consulted SDK58 native picker/TextInput documentation, reused the existing modal/safe-area/keyboard ownership and shared focus handling, and retained native date constraints/callback semantics. No browser capture is presented as native proof.

The independent reviewer did not receive the original mockup as filesystem-accessible image pixels. Its fresh review covered the brief/composition, source and RN Web screenshots, without claiming direct pixel comparison or native certification.

## Evidence and validation

[Capture index](previews/commitment-editor-v2/README.md) records **37 scenes / 50 PNGs**, including twelve enlarged-text scrolled Amount/Details views and one scrolled date-boundary view. `checks.json` measures **92 nonvacuous TextInput label/field pairs**, all labels above their fields, with zero browser errors, horizontal/section overflow or clipped title inputs. Native/select-picker semantics remain separate evidence boundaries.

Focused coverage passed **299 tests**, zero failures (34.6 seconds), in `dist/commitment-editor-v2/focused-tests-reviewed.log`. The full suite on current production UI passed **1,285 tests**, zero failures (329.7 seconds; 1,273 top-level TAP items), in `dist/commitment-editor-v2/full-suite-final.log`. The final focused rerun additionally verified a test-only timing correction: the Edit helper waits for real requestAnimationFrame boundaries after menu navigation. Nine new editor cases cover all kinds, draft-preserving switches/category creation, exact validation/failure retry, archived-category Edit/paid history, native first-date constraints/Cancel/Save guarding and enlarged layout. The main-screen test's obsolete legacy-appearance assertion now expects v2.

TypeScript passed again after the test-only correction (`dist/commitment-editor-v2/typecheck-complete.log`, empty, exit zero). ESLint retains six existing errors and two existing warnings, with zero added or removed diagnostics against the Commitments v2.1 baseline; comparison is `dist/commitment-editor-v2/eslint-comparison.json`. The final changed-file check also exited zero with no diagnostics. Final clean-cache iOS and Android SDK58 exports both exited zero, recorded in `dist/commitment-editor-v2/export-exits.json` and the final platform logs. The ordinary-extension documentation handoff is complete and `git diff --check` passed after its edits; the capture index records final gate paths.

## Files modified in this stage

| Area | Files |
| --- | --- |
| Shared New/Edit editor | `src/features/finance/commitments/components/commitment-forms.tsx` |
| Shared opt-ins/layout | `src/components/form-controls.tsx` (optional stacked radios and v2 selection-value shrink); `src/components/ui-icon.tsx` (generic Info outline) |
| Coverage | New `tests/commitment-editor-v2.test.ts` (nine cases); `tests/commitments-v2.test.ts` (obsolete appearance assertion) |
| Review scripts | `scripts/preview-commitment-editor-v2.ts`; `scripts/review-commitment-editor-v2.cjs` |
| Documentation/evidence | This document; `docs/previews/commitment-editor-v2/README.md`, 50 PNGs and `checks.json` |

Existing dirty work from previous Finance stages is preserved. Main/card v2.1, Payment/Resume/Details/History, services, financial calculations, schema/migrations and dependencies receive no redesign or domain change here. No staging, commit or push is performed.

## Physical testing still needed

On iOS and Android: native text scaling/long title growth, exact large-amount visibility/caret editing, active/archived long category value/chevron, accessible required/selected/disabled states and error reading, real title/amount keyboards and focused reveal, first-date picker future selection/cancel/return, inline category creation/focus restoration, Save with validation/failure/retry, Cancel/outside/platform dismissal, short-screen safe areas/header reachability and full scrolling to Details/information. Verify both New/Edit for all kinds against genuinely paid history. Browser captures, simulated keyboard frames and JavaScript exports do not replace installed-device testing.

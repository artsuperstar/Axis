# Finance Commitment Payment Confirmation v2

## Scope and review status

Pay commitment now extends the incumbent **Warm Editorial Hearth** system in **Operate** mode, separating a read-only obligation summary from the actual Payment fields. Existing payment eligibility, exact money, dates, persistence, lifecycle and reversal rules remain authoritative. No new payment model, schema, migration, dependency or global palette decision is introduced.

**Native evidence remains pending.** The independent reviewer opened all 45 RN Web screenshots and found no material browser presentation defect, but its explicit disposition is **RECAPTURE** because iOS/Android screenshots were unavailable. This record preserves that disposition and does not claim whole-surface approval or native certification.

The [Commitment Editor v2](finance-commitment-editor-v2.md), [main Commitments record](finance-commitments-v2.md), [Transactions v2.2 reversal contract](finance-transactions-v2.md#commitment-payment-deletion) and existing shared tokens remain references. This stage supersedes the earlier records' legacy Payment visual status only. Other connected surfaces retain their existing presentation. PRODUCT.md's SDK57 text and absent DESIGN.md are pre-existing drift; neither global file is repaired here.

## Existing payment behavior audit

| # | Concern | Existing behavior and current preservation |
| --- | --- | --- |
| 1 | Pay entry | Overdue, Today, Upcoming and supported details actions open the same selected-occurrence confirmation |
| 2 | Modal architecture | Existing AdaptiveModal / AdaptiveSheet retained, now opting into v2 presentation |
| 3 | Occurrence lookup | Service resolves retained ID or validated schedule/date identity, rejects changed/tombstoned ownership and materializes a valid preview through existing logic |
| 4 | Eligibility | Pending remains required at submission; Paid/Skipped/stale resolved targets cannot create another Expense; parent/schedule availability is revalidated |
| 5 | Actual amount default | Existing expected occurrence amount, formatted exactly for editing |
| 6 | Amount validation | Existing positive safe-integer centavos and whole-string BRL parser; no zero/negative/malformed/out-of-range acceptance |
| 7 | Payment date default | Today's local civil date, independent of occurrence due date |
| 8 | Date limits | Valid today-or-earlier actual dates; no existing minimum; future-due obligations may be paid early when eligible |
| 9 | Description/category projection | Existing current parent title and saved Expense category ID are used by the authoritative ledger write; archived references remain valid |
| 10 | Payment service | The same synchronous `access.pay` service is called through Finance mutation/reload |
| 11 | Atomic persistence | Expense insertion, occurrence Paid/link update and parent completion reconciliation stay in one existing database transaction |
| 12 | Duplicate protection | Existing occurrence state checks plus the UI synchronous ref guard; the new busy presentation adds no second write path |
| 13 | Occurrence update | Paid, paidTransactionId and resolvedAt are set; due date and expected amount are retained |
| 14 | Parent lifecycle | Active/Paused/Ended/Completed remain distinct and service-owned; paying an existing paused/ended obligation does not restart scheduling |
| 15 | Final installment | Existing resolved-count reconciliation can complete the final installment; no lifecycle calculation moves into the modal |
| 16 | Linked Expense | Actual positive amount/date persist with Expense type and source linkage; an unpaid plan alone is not actual spending |
| 17 | Failure/draft | Validation/write failures retain entered values and reset the guard for retry; atomic rollback preserves a consistent ledger/occurrence |
| 18 | Refresh/navigation | Success dismisses through the existing callback and refreshes Finance; focus/resume and downstream source reads remain unchanged |
| 19 | Keyboard/picker | Existing amount keyboard, local date picker, keyboard dismissal and sheet focused-field reveal remain |
| 20 | Accessibility/insets | Shared modal/safe-area ownership retained; explicit expected/actual labels and busy/disabled state are added to the v2 presentation |

The previous confirmation showed the title/due/expected/category as loose context above legacy amount/date controls and a generic sheet action. The current presentation adds visual ownership and clearer action/state communication without replacing those services.

## New structure and incumbent comparison

The sheet has a decorative handle and fixed **Cancel / Pay commitment / Confirm** header. Below it, one quiet summary surface owns the obligation identity. A separate **Payment** heading and divider introduce the full-width actual amount, explanatory note and payment date; the editable fields are not enclosed in a second oversized card.

At width below 390 or font scale at least 1.5, the title moves above the action row. The summary stacks its icon/content at enlarged text. Sections and long metadata grow naturally; the body scrolls instead of forcing the whole form into a fixed screenshot height.

| Incumbent rule | Payment application |
| --- | --- |
| Lora hierarchy / Manrope practical text | Existing editorTitle/editorSection roles for header/Payment; summary, exact money, field labels and explanation remain sans-serif |
| Cream / charcoal surfaces | Shared canvas/group/control/text/border roles in light and dark |
| Quiet ownership | One bordered summary, compact 40-point type tile and a bare Payment section with a subtle divider |
| Shared controls/shape/spacing | Existing sheet/form controls, group/control radii, 12-point padding and existing spacing scale |
| Provisional scoped color | Current pink/plum primary-action tokens remain; the mockup's mint is not hardcoded |

The ordinary-extension handoff found no need for a new world or global design tokens. Shared optional busy support is inert by default, preserving consumers that do not request it.

## Read-only summary and generic icons

The summary displays the actual saved title, selected occurrence due date, exact expected amount and Expense category name, with explicit No category when absent. Archived historical names remain resolved from existing data. It contains no editable field, management action or button role. Editing the actual amount/date leaves this summary unchanged.

The unchanged kind-only `commitmentTypeIcon` resolver supplies **Bill → Receipt**, **Subscription → Repeat**, **Installment → Layers**. Rock in Rio Ticket uses Layers because it is an Installment. Titles, merchants, brands, category names and free-text keywords never select that primary tile. The adjacent Calendar/credit-card/Tag metadata icons are decorative; no image asset, logo or icon package is introduced.

The summary's accessible label explicitly includes kind, title, due date, expected amount and actual category/No category. It does not duplicate a separate editing interaction. The authoritative service revalidates source state when Confirm is submitted.

## Expected amount, actual amount and whole-occurrence meaning

Expected amount is read-only schedule context. **Actual amount paid** initially uses that value but remains independently editable. It is parsed by the same exact BRL helper and becomes the actual Expense amount. Neither editing actual nor choosing a payment date rewrites the occurrence's expected amount or due date.

The quiet Info line retains the existing explanation: **“This payment resolves the whole occurrence, even if the amount differs from expected.”** It is not a checkbox, partial-payment choice or new balance calculation. A different amount still resolves the entire occurrence; no residual balance, multiple-payment tracking, refund, method or new payment status is introduced.

For nonempty raw amount strings longer than 14 characters or font scale at least 1.5, a complete selectable readout wraps below the field. It preserves entered digits without rounding, abbreviation or silent repair. Maximum-value evidence includes `90.071.992.547.409,91`. Platform-appropriate numeric keyboards and exact positive integer-centavo persistence remain unchanged.

## Payment date, validation and confirmation

Payment date defaults to today's local date and remains separate from the selected due date. Actual payment must be today or earlier; the native picker retains maximumDate=today and no minimum, with existing iOS/Android selection/cancel behavior. Paying a valid future obligation today or earlier remains supported by the authoritative service. Changing payment date never reschedules the obligation.

The existing validator still checks date and then amount. Its amount/centavo messages now appear adjacent to Actual amount paid; date messages appear adjacent to Payment date. Other service/persistence errors stay in the announced form-level area. Input changes clear the error without discarding the working draft. No replacement parser or new financial validation is added.

Confirm is the only persistence action. A ref guard blocks repeated callbacks before React state updates. After validation, the optional busy state exposes an ActivityIndicator, busy/disabled accessibility state and a recording hint; Confirm and amount/date controls become unavailable. A failure clears busy/guard, retains values and allows retry. Success invokes the existing dismissal. Cancel and established outside/platform Back behavior retain their existing draft/discard semantics, with no autosave or extra confirmation step.

**Production persistence remains synchronous.** The component also awaits an actual Promise returned by a host callback so tests/previews can show pending/rejection presentation. This does not convert SQLite to an asynchronous service or introduce background payment processing. The shared FormButton/UiButton busy option defaults to false; the v2 indicator retains the explicit Confirm label. Cancel's existing dismissal action remains available; there is no new payment-cancellation protocol.

## Atomic financial integrity and lifecycle

Inside the unchanged payment service, the target is re-resolved against its parent/schedule/date identity and must still be Pending. Current saved category/title provenance and category compatibility are checked. The transaction inserts one actual Expense, links it through paidTransactionId, marks the occurrence Paid with its resolution timestamp, then reconciles the parent. A failure rolls back the linked operation rather than leaving an unlinked Expense. The already-resolved check prevents a second ledger movement from an old open confirmation.

Existing retained due obligations from paused/ended parents remain payable under service rules; those payments do not reactivate scheduling. Completed installments have no invented new Pay path. Final-installment completion uses the existing resolved-count rules. Expected amounts, historical payment values, monthly schedules and all category/source identities remain intact.

Transactions v2.2 Delete payment and Commitments Undo still share source-aware atomic reversal. The linked Expense is soft-deleted, occurrence reopens Pending with payment/resolution fields cleared, and completion reconciles according to retained open/closed schedules. The payment modal adds no reversal logic.

Successful writes refresh existing Transactions, Commitments and source-owned Overview/Cash Flow/Spending, Calendar and Journal projections through their established lifecycle. Actual spending belongs to the selected **payment date**, not the due date; unpaid expected obligations remain outside actual totals. Existing BigInt-safe aggregation and read-error recovery remain unchanged.

## Native layout, accessibility and performance limits

AdaptiveModal remains the background-interaction and presentation owner. AdaptiveSheet retains one FormScrollView, measured header/body, shared focused-input reveal, native insets and keyboard viewport handling. No nested scroll trap, extra keyboard wrapper or duplicate navigation is introduced. Date selection uses the same native component; the web fallback remains explicit.

The browser matrix covers 320/390/430, both themes, normal/simulated doubled text, all kinds, early/overdue examples, missing/archived categories, long names/categories, maximum expected/actual values, differing amounts, adjacent errors, pending/rejection and scrolled bottom/picker states. Names/metadata/amounts can wrap without fixed-height truncation. Existing shared touch targets and Reduced Motion handling remain.

Required labels sit above their fields. Confirm's label remains readable while busy, and only real interactive controls have button behavior. Summary/type/info icons are decorative; accessible text distinguishes due/payment dates and expected/actual values. Browser assertions establish browser geometry and state only. Native screen-reader focus restoration, date-picker semantics, gestures, keyboard reachability and safe areas are unverified.

## Skills and review findings

- **frontend-design:** Applied the supplied summary-versus-Payment composition, compact ownership, vertical full-width fields and relationship to Commitment Editor v2. The main implementation agent directly compared the user mockup and inspected primary/stress/pending captures.
- **Impeccable:** Reviewed hierarchy, long-value readability, theme quality, noninteractive summary and action/feedback states. The fresh reviewer opened all 45 screenshots and found no material browser defect, but returned **RECAPTURE** for missing native screenshots. This documentation preserves the gate and distinguishes browser evidence from native behavior. The native production target does not use the HTML/CSS detector.
- **UI/UX Pro Max:** Associated-label, adjacent-error and disabled/busy-submit guidance supports deliberate form completion without changing validation or payment semantics.
- **Expo Skills:** Consulted official SDK58/React Native documentation and reused AdaptiveModal/AdaptiveSheet, one scroller, picker maximum, today's local date and native accessibility state. Exports and browser substitutions are documented without claiming native screenshots or device behavior.

The independent reviewer lacked filesystem-accessible pixels of the primary mockup; its assessment used the brief/composition, source and RN Web evidence. It did not approve the whole surface or certify native behavior.

## Evidence and validation

[Capture index](previews/commitment-payment-v2/README.md) records **38 base scenes / 45 PNGs**, comprising six enlarged-text scrolled Payment captures and one scrolled picker capture beyond the base scenes. `checks.json` contains 38 records and **76 measured label/field pairs**, two per scene, with zero recorded browser errors/overflow/assertion failures. Fixtures originate from real migrated SQLite services; runtime writes, keyboard, picker and safe-area boundaries are substituted.

Focused tests passed **309**, zero failures (30.1 seconds), and the full suite passed **1,295**, zero failures (158.3 seconds; 1,283 top-level TAP items). Those runs cover the unchanged production source before an equivalent test-fixture-only refactor to satisfy the existing children-prop lint rule. All **10 payment tests passed again** afterward (`payment-tests-final.log`).

Final TypeScript exited zero with an empty log. ESLint exited one for its **six existing errors and two existing warnings**; normalized diagnostics exactly match the previous Editor baseline, with **zero added or removed** (`dist/commitment-payment-v2/eslint-comparison.json`). `static-exits.json` records TypeScript 0 / ESLint 1. Both production iOS/Android exports exited zero. The documentation handoff is complete and whitespace checks passed; native recapture remains open. Log paths are recorded in the capture index.

Ten new payment cases cover all kinds, read-only summary/defaults, differing actual/early dates/archived provenance, final completion/reversal, adjacent invalid values, transactional rollback/retry, stale occurrence rejection, pending duplicate protection, shared busy announcements and native-picker callback constraints/Cancel. Actual native interaction remains a separate capture/testing gate.

## Files modified in this stage

| Area | Files |
| --- | --- |
| Payment confirmation | `src/features/finance/commitments/components/commitment-forms.tsx` |
| Kind integration | `src/features/finance/commitments/components/commitments-view.tsx` (passes existing commitment kind) |
| Shared optional busy presentation | `src/components/form-controls.tsx`; `src/components/design-system.tsx` |
| Coverage | New `tests/commitment-payment-v2.test.ts`; existing `tests/commitments-experience.test.ts` and `tests/commitments-v2.test.ts` visual assertions |
| Review scripts | `scripts/preview-commitment-payment-v2.ts`; `scripts/review-commitment-payment-v2.cjs` |
| Documentation/evidence | This document; `docs/previews/commitment-payment-v2/README.md`, 45 PNGs and `checks.json` |

Dirty `commitments/data.ts` changes predate this stage. Other connected screens, scheduling/payment services, schema/migrations and dependencies are preserved. Existing work remains unstaged on `main`, HEAD `5ddb625a`; no commit or push is performed.

## Required native recapture and physical checks

The environment audit found no `adb`, `emulator` or `xcrun` commands and no default Android SDK adb/emulator executables. This Windows environment cannot run the iOS simulator. Consequently there are no genuine iOS/Android screenshots for this review, and **RECAPTURE remains open**.

On iOS and Android, capture the real modal in both themes at ordinary and enlarged text, with the amount keyboard and native date picker. Verify long title/category/expected/actual amounts, short-screen safe areas and header controls, focused-field reveal, complete bottom scrolling, native picker maximum/cancel/return, pending/disabled accessibility and errors, VoiceOver/TalkBack summary/date distinctions and focus restoration, dismissal gestures and actual Confirm/Cancel behavior. Recheck early/overdue payment, rollback/retry, final completion/reversal and source projections on installed builds. Browser screenshots and JavaScript exports do not satisfy this native evidence gate.

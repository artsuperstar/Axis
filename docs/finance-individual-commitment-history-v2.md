# Finance Individual Commitment History v2

This pass implements only the **right-hand individual History** composition. The global History index is outside scope. Final independent disposition is **RECAPTURE** for unavailable genuine iOS/Android evidence; the reviewer found no additional concrete browser defect after opening all 48 screenshots. No whole-surface approval or native certification is claimed.

## Existing behavior audit (before presentation changes)

1. Details View history, series History actions and the existing global History index open the same individual History branch.
2. The selected History shares the existing AdaptiveModal/AdaptiveSheet details dialog, not a separate route or global index.
3. Existing parent lookup and readHistory validate the commitment ID and return the current parent plus saved history.
4. Bills/Subscriptions/Installments share one row model; only Installments have saved installmentIndex values.
5. Active/Paused/Ended/Completed parent state is independent of row Paid/Skipped outcomes.
6. The current resolved filter excludes Pending rows from source history, retaining only historical Paid/Skipped records.
7. Due dates belong to occurrences; transactionDate belongs to the linked actual payment, including early/late payments.
8. Historical expected amounts come from occurrence.expectedAmountMinor; parent expected amount is only the latest configured expectation.
9. Paid actual amounts come from the linked finance transaction, not the schedule or parent amount.
10. Paid category is the saved payment category, including archived references. Skipped rows have no historical category snapshot and the current UI does not display one; do not invent it from the current parent category.
11. installmentIndex is saved per occurrence; installmentCount is the parent plan total. Global resolvedCount includes Paid and Skipped, not only rendered history.
12. History is dueDate descending then occurrence ID ascending; append deduplicates and preserves that ordering.
13. historyMonths is 12. Initial resolved history uses the rolling civil-month window; nextBefore requests earlier twelve-month windows. Outstanding rows are not reloaded into earlier pages.
14. Undo payment confirms, calls access.reopen, then refreshes the selected data/loaded page span.
15. Skipped rows support the existing confirmed Reopen action, returning them to Pending without a ledger write.
16. There are no historical row secondary/contextual actions. No overflow menu should be invented or duplicate Undo/Reopen.
17. Existing series Edit/History and eligible Pause/Resume/End actions are available at top level; no Delete/Restore/Archive is supported.
18. View commitment clears occurrence focus and returns to existing Commitment Details. Back dismisses the existing sheet.
19. refreshDetails reloads authoritative state and rebuilds the previously loaded historical span after mutation.
20. Reopening Paid soft-deletes its linked Expense and clears occurrence payment/resolution fields in one existing transaction.
21. Commitments Undo and Transactions source-aware Delete payment share reopenOccurrence, preserving financial and lifecycle reconciliation.
22. An empty resolved page keeps identity/navigation available, with no fabricated records.
23. The legacy History eagerly maps loaded rows in the shared body. The v2 view will use that sheet's existing custom virtualized body while preserving explicit Load earlier history and all source cursors.
24. Shared AdaptiveModal/AdaptiveSheet own SDK58 insets, scrim, gestures, focus, keyboard and dismissal; no additional modal, tabs or safe-area wrapper is needed.

## Direction and scope

Extend the incumbent Warm Editorial Hearth in Operate mode: cream/charcoal surfaces, provisional plum accents, Lora hierarchy and Manrope practical values. Adapt only the supplied individual History composition: generic header, compact read-only summary, Paid/Skipped markers and cards, explicit real actions and View commitment navigation. The global History index and approved Details/card screens stay unchanged.

Latest expectation is labeled as configuration, not a timeless historical amount. Installment summary progress explicitly counts paid-or-skipped resolutions. Cards retain independent expected/actual amounts, due/payment dates and per-row numbering. No Pending/Pay row or unsupported overflow is copied.

## Implemented structure and incumbent comparison

The fixed generic **Commitment history** header contains Back and the existing series menu. The saved name appears in a compact read-only summary rather than repeating as the header title. Below it, **Paid and skipped** introduces the historical timeline, followed by explicit Load earlier history when a source cursor exists, and the genuine View commitment destination. Back dismisses the modal; View commitment clears occurrence focus and returns to existing Details.

Below 390 width or at font scale at least 1.5 the header title stacks above Back/menu. Summary metrics stack for narrow/enlarged text or long money. Cards place actions beside data when space permits and stack at 320/enlarged/maximum values; all strings can wrap. Existing cream/charcoal surfaces, provisional plum accents, Lora hierarchy, Manrope practical text, group/control shapes and shared targets are reused. No mint/global color pass, new identity, global token, imagery or design seed is introduced.

This is an ordinary extension of Warm Editorial Hearth in Operate mode, consistent with [Details v2](finance-commitment-details-v2.md) and the existing editor/payment/resume family. PRODUCT.md's SDK57 reference and absent DESIGN.md remain pre-existing drift, untouched by this handoff.

## Summary, status and progress semantics

The summary shows saved kind, current parent lifecycle, current category/No category and **Latest expected per occurrence** or **Latest expected per installment**. That expectation is current configuration, not an assertion about every historical row. For installments, progress uses the global authoritative resolvedCount and is explicitly labeled “paid or skipped”; it is unrelated to rendered row count, page position or payment count alone.

The unchanged shared resolver supplies Bill → Receipt, Subscription → Repeat and Installment → Layers for summary and rows. Titles, merchants and category names do not select an icon. The summary and card bodies are informational, with no editing/navigation press handler. No decorative chevron or invented row overflow is added.

## Historical records and timeline

Only actual resolved Paid/Skipped records from source history appear. Pending/Overdue/Pay entries in the mockup are not copied. Parent Active/Paused/Ended/Completed remains distinct from the row outcome, and terminal parents retain their supported historical actions.

Each row retains its occurrence due date, expected-amount snapshot and saved installmentIndex/count. Paid additionally displays the linked actual amount, actual payment date and that payment's saved category, including archived names or No category. Those historical values remain independent of current parent price/category changes. Early and late payment dates are not relabeled as due dates. Sequence comes from the saved occurrence, never list position or an example repeated as 1 of 10.

Skipped rows intentionally omit category: the model has no historical skipped-category snapshot and the old UI did not show one. Current parent category is not substituted as historical evidence. The summary's current category remains clearly separate.

Decorative check/minus markers reinforce textual Paid/Skipped status. A narrow connector joins only loaded records and stops at the last loaded record before the pagination cursor; it does not invent missing events. Stable occurrence IDs remain the row keys.

## Explicit actions and stale-confirmation safeguards

Paid rows expose the full **Undo payment** secondary button; Skipped rows expose **Reopen**. Existing native confirmation is retained. Cancel writes nothing. There is no extra historical action menu, duplicate action or interactive card body.

The UI now passes a Paid row's displayed linked payment ID to the existing `access.deletePayment(payment.id, { commitmentId, dueDate })` service. That source-aware operation validates the displayed link and uses the same authoritative reopenOccurrence kernel, preventing an old confirmation from reversing a replacement payment. It adds no reversal algorithm.

For Skipped Reopen, confirmation first reads the existing source window containing the target (before=dueDate+1 for a past due date, otherwise the initial window), finds the same occurrence ID and verifies it is still Skipped. Changed/deleted/now-Paid rows are rejected before calling the existing `access.reopen`. This additional query occurs only on explicit action confirmation; it is not a decorative render query or pagination advance. **The preflight and write are separate operations**, not one newly atomic transaction; the existing write operation retains its own transaction guarantees.

Existing reopening of Paid soft-deletes the linked Expense, clears payment/resolution fields, restores Pending and reconciles installment lifecycle atomically. Existing Skipped reopening returns Pending without creating/removing an Expense. Completed installments reopen under the retained schedule rules; paused/ended parent intent remains. A write failure rolls back, keeps loaded History visible and permits retry. Details refresh preserves the loaded span and actual source projections; no new ledger calculation, schema, migration or dependency is introduced.

The series header menu retains Edit/History and eligible Pause/Resume/End. Global History index, approved Details/card/form visuals and source services are unchanged; only the individual History branch and its action-owner checks are integrated here.

## Pagination, scrolling and empty states

The existing readHistory twelve-month civil windows, nextBefore boundary and appendCommitmentHistory deduplication remain authoritative. Due-date descending / occurrence-ID ascending ordering is preserved. Load earlier history appends the next real page; the control disappears at the source end. A mutation refresh rebuilds the previously loaded span rather than resetting to the first page. Empty resolved pages preserve summary/navigation and “No paid or skipped occurrences in this page.” without fabricated events.

One existing AdaptiveSheet custom scroll body hosts a SectionList with six initial/batch rows, window size five, stable IDs and variable-height content. HistoryScrollView composes list/sheet refs through FormScrollView and the selection host. No getItemLayout, nested vertical scroller, extra safe-area wrapper or competing modal is added. The fixed header stays outside the body scroller.

Virtualization bounds mounted presentation, not the number of deliberately loaded pages. Browser fixtures select source-made precomputed cumulative pages solely to demonstrate the controls; production retains its existing per-commitment paged reader. No lifetime-production history load is introduced to render the timeline.

## Accessibility and native limits

Paid/Skipped, expected/actual amounts, due/payment dates and sequence are explicit text. Buttons have subject/due-date labels and hints explaining confirmed reversal/reopening. Informational bodies have no button role, markers/icons are decorative and no state relies only on color. Shared targets, Reduced Motion, modal insets/focus/dismissal and scroll/menu coordination remain in use.

The 320/390/430 light/dark matrix includes enlarged text, exact maximum money, long names/categories and scrolled bottom content. Browser geometry verifies those browser layouts; real native safe areas, gestures, focus restoration, screen-reader behavior and physical list performance remain unverified.

## Skills and review findings

- **frontend-design:** Applied the right-hand archive hierarchy, compact saved context, historical cards and meaningful timeline spacing while keeping the global index outside scope.
- **Impeccable:** Audited density, duplication, full Undo labels, action alignment and theme parity without inventing overflow actions. The independent reviewer opened all **48 PNGs**, found no additional concrete browser defect and returned **RECAPTURE** solely for missing native evidence. The final Skipped stale-state check is nonvisual; captured layout is unchanged.
- **UI/UX Pro Max:** Explicit confirmed actions, visible state changes, expected/actual distinctions, pagination and genuine View commitment navigation support understandable historical review and safe recovery.
- **Expo Skills:** Reused SDK58 AdaptiveSheet scroll ownership with [SectionList](https://reactnative.dev/docs/sectionlist), ref composition, shared targets and variable-height virtualization, retaining existing native inset/focus ownership.

The parent directly compared the user target and inspected mixed/light/maximum/stress-bottom evidence. Independent review used brief/source/RN Web evidence without original mockup pixels as a filesystem artifact. The HTML/CSS detector does not apply to the native production target. Missing native evidence is not canonized as acceptable native behavior.

## Evidence and validation

The [capture index](previews/commitment-history-v2/README.md) records **40 base scenes / 48 PNGs**, including six enlarged stress-bottom and two mixed-bottom views, with **40 checks and zero recorded browser errors/overflow/action-placement failures**. Migrated SQLite fixtures provide real source records and twelve-month appended-page snapshots at 2026-10-26; browser callbacks observe action ownership without executing writes or fabricating native Alerts.

The prior Details baseline was **1,320**. After the final production action guards, the History/experience/Details group passed **40 tests** and final focused coverage passed **324**, zero failures (55.4 seconds). The final full suite passed **1,334**, zero failures (210.4 seconds). All **14 new History cases** passed again after a test-only assertion narrowed the persisted occurrence ID; no production behavior changed for that typing correction.

Final TypeScript exited zero with an empty log. ESLint retains exactly six existing errors/two warnings and zero added/removed normalized diagnostics; static-exits records TypeScript 0 / ESLint 1 for that baseline. Final iOS/Android exports both exited zero. Documentation whitespace verification and `git diff --check` passed. Final log paths are in the capture index; genuine native recapture remains open.

Coverage includes all kinds and historical values/sequence, parent price/category changes with archived paid identity, confirmed Cancel/Undo/Reopen, stale Paid replacement and Skipped→Paid protection, atomic failure retry, paused/ended history, empty/navigation, thirty-record paging/span refresh/order/deduplication/end connectors and maximum-value enlarged virtualization.

## Files and worktree

| Area | This stage |
| --- | --- |
| Individual archive | New `src/features/finance/commitments/components/commitment-history.tsx` |
| Owner integration | `commitments-view.tsx` individual History rendering and existing-service stale-action guards |
| Coverage | New `tests/commitment-history-v2.test.ts` (14 cases); `tests/commitments-experience.test.ts` Undo appearance assertion; `tests/commitment-details-v2.test.ts` actual View commitment tap |
| Review | `scripts/preview-commitment-history-v2.ts`; `scripts/review-commitment-history-v2.cjs` |
| Documentation/evidence | This document; `docs/previews/commitment-history-v2/README.md`, 48 PNGs and `checks.json` |

Prior Resume/Details dirty work is preserved on main, HEAD `289cf7da9e7edacb2d72c2e17568e6c4fbb6201d`. No reset/clean, staging, commit or push is issued by this task. No other documentation, product/design globals or production feature content is changed by this handoff.

## Native recapture and physical checklist

**RECAPTURE remains open.** adb/emulator/xcrun and default Android SDK tools are unavailable, and Windows cannot run the iOS simulator. No native screenshot, Alert, keyboard, device shell or safe-area proof is fabricated.

On iOS/Android capture both themes and narrow/enlarged layouts, complete expected/actual values, full Undo/Reopen labels, timeline and bottom navigation/pagination. Verify safe areas, real scrolling/gesture coordination, Back/menu/focus, screen-reader status/date/action comprehension, native confirmation Cancel/Confirm, stale replacement guards, rollback/retry, final-installment reopening, paused/ended intent, loaded-span refresh and downstream Transactions/Overview/Calendar/Journal reconciliation. Browser checks and exports do not close this evidence gate.

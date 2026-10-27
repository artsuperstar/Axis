# Finance Resume Commitment v2

The latest Resume mockup guides this focused presentation extension. Read-only commitment context, the editable Schedule decision and its explanation are distinct; the existing scheduling service remains authoritative. **Independent review disposition: RECAPTURE.** The corrected browser validation finding is resolved, while genuine iOS/Android evidence remains unavailable. This document does not claim whole-surface approval or native certification.

## Existing behavior audit (before presentation changes)

1. Resume is available from paused series actions in Manage commitments and retained details/history views, through the same `resume` dialog.
2. The dialog uses AdaptiveModal and AdaptiveSheet, with one shared body scroller and modal-owned dismissal/insets.
3. Bills, Subscriptions and Installments support pause/resume; Installments require unassigned future installment numbers.
4. Only Paused may become Active. Ended, Completed and already Active states are rejected by the service.
5. `resumeProposal` preserves the previous billing day, choosing today-or-later after every retained occurrence.
6. Accepting that exact proposal keeps the intended billing day; another date adopts its day of month.
7. Monthly civil-date scheduling clamps short months, then restores the intended day in longer months; leap/year boundaries remain service-owned.
8. Existing occurrence identities and due dates remain retained.
9. Paid history and actual payment amounts/dates remain unchanged.
10. Skipped history remains skipped.
11. Pending/overdue obligations remain pending and payable; the new date must follow all retained occurrences.
12. Pausing materializes eligible prior dues and closes schedule versions; intentionally paused months stay empty.
13. Resuming inserts a schedule version, continues installment numbering and materializes only eligible dues.
14. Next due date must be a valid local civil date of today or later, with no payment-style future maximum.
15. The existing authoritative service validates the date, current parent state, retained dates and remaining installment capacity.
16. Resume writes the new schedule, parent transition and due generation in one existing SQLite transaction.
17. A UI ref guards repeated submission; the service revalidates current state and rejects stale/double resumes.
18. Explicit Resume confirms; Cancel dismisses without writes; failures keep the chosen date available for retry.
19. Existing Finance mutation/reload refreshes commitment projections and downstream Calendar reads. Resume creates no ledger transaction.
20. Native picker, keyboard dismissal, safe-area, focus restoration and Reduced Motion remain owned by shared infrastructure.

## Visual direction

Extend the incumbent Warm Editorial Hearth in Operate mode. Preserve the scoped tokens: cream canvas `#F5F0EA`, charcoal canvas `#151315`, dark group `#242024`, dark text `#F6F0ED`, light brand `#7B425E`, dark brand `#DFA6BF`. Lora owns the sheet/Schedule headings; Manrope owns practical details and controls.

Composition: responsive Cancel/title/Resume header, compact read-only summary, bare Schedule section with the full-width date selector, then one quiet contained explanation. Preserve the mockup's reading order without its green wash or duplicate Paused badge. Existing tokens are provisional; no global palette pass.

| Incumbent system | Implemented application |
| --- | --- |
| Lora / Manrope | Existing editorTitle/editorSection for header/Schedule; practical labels, money, metadata and explanation remain Manrope |
| Quiet owned surfaces | One compact summary and a subtle bordered explanation; Schedule remains a bare section |
| Existing scale | 12-point section padding, existing group radii, 40-point generic type tile and shared touch targets |
| Shared form infrastructure | Existing AdaptiveModal/AdaptiveSheet, one FormScrollView, date picker, focus/inset ownership and optional busy button support |
| Provisional scoped color | Current pink/plum Resume emphasis; no new mint/green wash, token or palette commitment |

This is an ordinary extension of Warm Editorial Hearth in Operate mode. The [Commitment Editor](finance-commitment-editor-v2.md) and [Payment Confirmation](finance-commitment-payment-v2.md) provide the incumbent family. PRODUCT.md's SDK57 reference and absent DESIGN.md are pre-existing drift, left untouched; no design sidecar or global rule is introduced.

## Implemented hierarchy and read-only context

The previous legacy modal contained the title, date and explanation in the shared sheet. It now has a decorative handle and fixed Cancel / Resume commitment / Resume header. Below 390 width or at font scale 1.5 and above, the title moves above its action row. There is no additional Back/Cancel control or second modal system.

The summary displays the saved title, kind and authoritative parent status, complete expected BRL amount and saved category/No category. Archived names remain meaningful. Only the existing kind resolver chooses the decorative primary icon: Bill → Receipt, Subscription → Repeat, Installment → Layers. Titles/merchants/categories never choose it. The summary has no Edit, Pay, category-management or other interactive control; Paused is stated once in the identity line.

Schedule contains its serif heading, “Choose when the next occurrence should be due.” and one full-width labeled Next due date field. The quiet explanation below retains the original copy:

> Resuming starts the schedule again from the new due date. Keep the suggested date to preserve the billing day, or choose another date to change it. Existing unpaid occurrences still need payment. Paused months stay empty.

## Historical date decision

Omit Last due date. The modal receives a CommitmentItem projection whose outstanding rows exclude paid/skipped history; neither latest schedule start nor oldest/newest pending due reliably establishes the latest historical occurrence. Adding a history read only for this decorative row would expand scope. No date is invented or mislabeled.

## Implementation, evidence and validation

### Scheduling, confirmation and historical integrity

The same `access.resumeProposal` supplies the initial date; no sample date is hardcoded. Only currently Paused parents can resume. Bills and Subscriptions retain their monthly rules; Installments additionally require unassigned installment indices. Active, Ended and Completed parents cannot be reactivated by a stale open modal.

Keeping the exact proposal preserves the intended billing day, including a clamped day such as 31 in February. Choosing a different valid date adopts that date's day of month as the future anchor. Existing short-month/leap-year/year-boundary handling remains in the service. The native picker has a minimum of today and no future maximum; valid local civil dates and retained-date collisions are revalidated on explicit Resume. Changing the date alone writes nothing.

The existing transaction materializes eligible prior dues, validates retained dates/remaining indices, inserts a new schedule version, changes the parent to Active and materializes eligible dues. Failure rolls back the transition and schedule together. Paid/Skipped history, actual payment amounts/dates and existing Pending/Overdue obligations retain their identities and meaning. Intentionally paused months remain empty, installment numbering continues, and Resume creates no actual ledger Expense. Current Finance mutation/reload and Calendar/source projections refresh through the established paths; Overview/Journal actual totals are unchanged by Resume alone.

Service date errors appear beside Next due date; other storage/state errors use the global announced error area. Failure keeps the chosen date and resets the ref guard for retry. Repeated submission is blocked before React updates; stale state is still checked by the service. The existing shared busy/disabled presentation is reused. Production SQLite remains synchronous; Promise-returning callbacks only expose pending/rejection in tests/previews. Cancel and shared modal/picker dismissal retain their existing behavior, without a new unsaved-change or cancellation protocol.

### Responsive layout and accessibility

Long titles, categories, explanation and maximum exact BRL wrap naturally. At enlarged text the summary identity stacks, and vertical scrolling keeps Schedule/explanation reachable. Existing AdaptiveModal/AdaptiveSheet own background interaction, safe areas, one body scroller, keyboard dismissal and focused-field/picker coordination; no extra keyboard wrapper is introduced.

The summary is informational and announces title, kind/status, expected amount and category. The date label remains above its field. Resume exposes disabled/busy state and an explicit scheduling hint; icons are decorative. Shared targets and Reduced Motion handling are retained. Native gestures, picker focus restoration, screen-reader behavior and physical safe areas remain unverified.

### Skills and review findings

- **frontend-design:** Followed the latest target's summary → Schedule → explanation hierarchy while matching the existing editor/payment family and keeping the date as the single decision.
- **Impeccable:** Checked density, long text, theme hierarchy and removal of duplicate status treatment. The reviewer opened all 41 screenshots and found that the original invalid-date preview used a generic Error, producing a global banner. The fixture was corrected to the real FinanceValidationError; all 41 images were rebuilt/recaptured, and its targeted recheck confirmed the adjacent message/red field resolved. Final disposition remains **RECAPTURE** for the unresolved native evidence gap. This documentation handoff records the incumbent system and does not canonize that fixture defect.
- **UI/UX Pro Max:** Localized date presentation and explicit confirmation preserve a clear date decision, with accessible adjacent failure feedback and no automatic resume on date selection.
- **Expo Skills:** Reused SDK58 native modal/picker infrastructure and constraints using the [official date-time-picker documentation](https://docs.expo.dev/versions/v58.0.0/sdk/date-time-picker/). Existing native ownership takes precedence over adding competing wrappers.

The main implementation agent compared the latest user target and inspected primary/stress/invalid captures. The independent reviewer assessed the brief/source/RN Web evidence without original mockup pixels available as a filesystem artifact. Its corrected-invalid recheck is a targeted follow-up to the original all-image review. The HTML/CSS detector does not apply to the native production target.

### Evidence and completed automated gates

The [capture index](previews/commitment-resume-v2/README.md) records **34 base scenes / 41 PNGs**, with six enlarged scrolled views and one scrolled picker view. Final checks contain **34 measured date label/field pairs**, all labels above controls, with zero recorded browser errors/overflow/failures. Real migrated SQLite fixtures provide paused parents and actual service proposals; browser callbacks, picker and native boundaries are substituted.

The verified pre-edit full baseline passed **1,295 tests**. Final focused coverage passed **287**, zero failures (23.3 seconds); the full suite passed **1,307**, zero failures (137.5 seconds), including **12 new Resume cases**. These cover all kinds, archived context/Cancel, alternate anchor/Calendar/duplicate protection, invalid/colliding dates, stale Ended state, atomic rollback, historical installment retention, native callback constraints/enlarged text, pending rejection/retry and iOS picker Back.

Final TypeScript exited zero. ESLint retained exactly six existing errors/two warnings with zero added/removed diagnostics; its exit one reflects that baseline. iOS and Android production exports both exited zero. `git diff --check` passed. Detailed logs/JSON are under `dist/commitment-resume-v2`; browser automation and exports do not satisfy native recapture.

## Files and worktree

| Area | This stage |
| --- | --- |
| Production | `src/features/finance/commitments/components/commitment-forms.tsx` (Resume only); `commitments-view.tsx` (item/category integration) |
| Coverage | New `tests/commitment-resume-v2.test.ts` (12 cases); existing tests unchanged |
| Review | `scripts/preview-commitment-resume-v2.ts`; `scripts/review-commitment-resume-v2.cjs` |
| Documentation/evidence | This document; `docs/previews/commitment-resume-v2/README.md`, 41 PNGs and `checks.json` |

Scheduling/payment services, schema, migrations, dependencies and other connected surfaces are unchanged. Git changed externally during work: prior Finance work is now in HEAD `289cf7da9e7edacb2d72c2e17568e6c4fbb6201d`. This task issued no staging, commit or push and does not claim HEAD stayed unchanged. Current changes are the two Resume production files and new Resume test/scripts/docs/evidence.

## Native recapture and physical checklist

**RECAPTURE remains open.** No adb/emulator/xcrun command or default Android SDK adb/emulator executable is available, and this Windows host cannot run an iOS simulator. No native screenshots were fabricated or replaced by browser images.

On iOS/Android capture both themes and large text, ordinary and narrow widths, real native picker and scrolled explanation. Verify header/Resume reachability, long title/category/exact money, minimum today/no future maximum, suggested-date retention, alternative selection and picker Cancel/Back/focus, screen-reader summary/status/date/error/busy announcements, modal gestures/background/safe areas and bottom scrolling. Exercise actual Cancel, explicit Resume, stale state, retained-date collision, rollback/retry, installment continuation, paid/skipped/unpaid preservation, empty paused months and Calendar refresh. Installed-device evidence remains required.

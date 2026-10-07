# Stage 13E: Commitments experience

## Obligation workspace

The Finance Commitments destination groups the existing authoritative projection into Overdue, Today and Upcoming, in that order. Empty sections are omitted. Every pending occurrence before today remains visible regardless of age or parent status. Upcoming uses only the existing next pending preview per active series and retains its three-calendar-month horizon. Paid and Skipped records appear in History.

Rows use dividers, a wrapping name/expected amount pair, a due-state line and quiet type/category metadata. Installments include occurrence progress. Overdue uses attention text and the word Overdue, without an error panel. Monetary values have no ellipsis or line limit. There is one Add commitment action in the workspace.

## Explicit resolution

Tapping the occurrence body opens its context; it performs no payment. Pay is the primary row action and opens an AdaptiveSheet. It displays the name, due date, expected amount and historical Finance category, then actual amount and payment date. Actual amount defaults to expected. The helper explicitly says that a different actual amount resolves the whole occurrence. Existing validation, native date pickers, today-or-earlier limit and duplicate-submit protection remain.

The occurrence's anchored Actions menu contains Skip and View commitment. Skip requires confirmation and creates no Expense. Paid History offers quiet Undo payment; Skipped History offers quiet Reopen. Both require confirmation and use the existing atomic correction API. The main projection refreshes after mutation.

## Management and History

The anchored Commitment options menu opens focused Manage commitments or Commitment History surfaces inside the same Finance destination. Each has Back to Commitments and preserves the Finance navigation. There are no new tabs or routes.

Management lists series amount, type, status, monthly schedule and installment resolution progress. Its anchored series menu exposes Edit, Pause or Resume, End and History according to the existing valid states. No deletion capability is added. Pause/End retain existing obligations. Resume explains the new due-date anchor, keeping the suggested billing day, and the empty paused gap in plain language.

History first lists series with resolved activity using existing summary counts. Selecting a series loads its existing History API. Only Paid/Skipped rows render there, with due date, expected amount and actual payment/date/category where applicable. Earlier pages retain the existing deterministic incremental calendar-window cursor and append helper. Old pending obligations remain in the workspace. Schedule versions remain available in commitment details.

## Shared interaction and lifecycle

Finance supplies the existing ContextMenuHost outside its scrolling list. Menus use measured trigger coordinates, right alignment, screen bounds, font-scaled width, outside/Back/Escape dismissal and focus behavior from the shared host. Scroll or Finance destination changes dismiss the screen menu. Native sheets supply their own host above modal content. Menu actions dismiss before opening another surface. ContextMenu actions can now supply explicit accessibility labels and a destructive variant; their default remains quiet.

The Finance shell's navigation dimensions and scroll-offset restoration are unchanged. Payment and editor drafts retain the F1 lifecycle: failed noninitial reads preserve last-good data and open drafts, with Retry inside sheets. Initial loading and initial read failures do not publish an empty workspace.

No data API, generation/payment semantics, schema, migration or dependency changes are made. Home, Calendar and Overview continue reading source-owned projections; Transactions retain linked Expense protections.

## Verification and device review

Mounted regressions cover aged obligations, section hierarchy, anchored management, Pay/Skip/Undo, exact linked Expenses, archived labels, Overview/Home/Calendar refresh, resolved History paging, Calendar deep links, invalid payment input, native Android date-picker bounds, wrapping/accessibility and light/dark status roles. Existing domain tests retain monthly clamping, paused-gap and finite-installment checks. Refresh lifecycle regressions use the updated Pay and anchored Edit interactions.

Physical iPhone Expo Go testing is still required: menu placement while scrolled and inside sheets, VoiceOver focus/context, keyboard and native date picker, long names/large amounts/installments at large text sizes, light/dark contrast, and Pay/Skip/Undo/Pause/Resume/End with a failed refresh during a dirty draft. Automated native-boundary tests and exports do not establish physical behavior.

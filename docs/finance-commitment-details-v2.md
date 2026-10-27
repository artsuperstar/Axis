# Finance Commitment Details v2

This ordinary extension implements the supplied Details composition within the incumbent Warm Editorial Hearth system, in Operate mode. **Final independent disposition: RECAPTURE.** The browser maximum-money finding is resolved; genuine iOS/Android evidence remains unavailable. No whole-surface approval or native certification is claimed.

## Existing behavior audit (before presentation changes)

1. Feed cards, management rows, History entry points and Calendar/source requests open retained commitment details through `openDetails` or `initialDetail`.
2. Details uses the existing AdaptiveModal/AdaptiveSheet, not a pushed route.
3. Sheet Back dismisses; View history and View commitment toggle the existing retained details/history dialog.
4. The series menu currently offers Edit and History, Active Pause, eligible Paused Resume, and End for Active/Paused Bills/Subscriptions; no Delete/Archive/Restore action exists.
5. Bills, Subscriptions and Installments share monthly saved billing-day schedules; installment amounts are per occurrence, not inferred contract totals.
6. Parent Active/Paused/Ended/Completed comes from saved commitment state, independently of occurrence outcomes.
7. Overview expected amount comes from the parent; each unpaid card must retain its own occurrence expected amount.
8. Total paid is the existing BigInt sum of actual linked, nondeleted payments. Reversed payments are excluded through existing reconciliation.
9. Existing Finance category lookup retains saved built-in/custom/archived names; uncategorized data has no inferred category.
10. The latest saved schedule supplies the current legacy monthly description and start anchor.
11. `readHistory` supplies persisted schedule versions, ordered by createdAt then ID; presentation must preserve that ordering and IDs.
12. `effectiveUntil` is exclusive. StartDate is the monthly anchor; effectiveFrom is a separate version boundary and must not be conflated with it.
13. An open version has no effectiveUntil; closed versions are historical. A Completed installment may retain an open finite schedule without active recurrence.
14. Unpaid selection remains existing outstanding rows plus the next upcoming preview; a focused Calendar/source obligation remains selected according to existing helper rules.
15. Overdue is derived for Pending dates before today's local civil date, not a parent lifecycle state.
16. Pay replaces the dialog with existing Payment Confirmation v2 and calls the same atomic service only after confirmation.
17. Existing occurrence Skip requires confirmation; View commitment clears occurrence focus. No additional occurrence actions exist.
18. View history opens the current Paid/Skipped view; no new History destination is needed.
19. Historical pages append with the existing `nextBefore` boundary and deduplication; refreshing loaded history preserves its oldest page.
20. Existing Finance mutation/reload and details refresh remain authoritative after edits/lifecycle/Skip/Undo; source requests use current projections.
21. Payment reversal remains source-owned; it restores unpaid state and reconciles lifecycle/Total paid through the existing service.
22. The feed is virtualized; legacy Details eagerly maps versions/obligations inside a shared ScrollView. The new Details will use the existing sheet's custom virtualized-body API for one variable-height scroller.
23. Shared AdaptiveModal/AdaptiveSheet own Expo SDK58 insets, scrim, focus, keyboard and dismissal. No extra safe-area wrapper or tabs are added.

## Direction

Extend Warm Editorial Hearth in Operate mode: existing cream/charcoal surfaces and provisional plum accents; Lora section hierarchy and Manrope practical data/actions. Generic header, one read-only overview, contained informational schedule rows, shared compact v2.1 unpaid cards and a distinct History navigation row. Two-column metrics may stack at narrow/enlarged text; no forced three-column dashboard.

No schedule detail destination exists, so schedule rows have no chevron/button. Terminal or closed schedules are not labeled active/current recurrence. History presentation and domain services remain unchanged.

## Implemented visual structure and incumbent comparison

The fixed generic **Commitment details** header contains Back and one existing series ContextMenu. The saved commitment name appears in the overview rather than repeating as the header title. Below 390 width or at font scale 1.5 and above, the title moves above the action row. Existing AdaptiveModal remains the outer presentation owner.

The body order is **read-only overview → Schedules → Unpaid occurrences or Selected obligation → View history**. It reuses current cream/charcoal surfaces, provisional plum accents, Lora hierarchy, Manrope practical data, group radii, quiet borders and shared targets. No green/mint palette pass, illustration, new identity or global token is introduced. PRODUCT.md's SDK57 text and absent DESIGN.md remain pre-existing drift; global documents are untouched.

Overview metrics use two columns when space permits and stack at narrow/enlarged sizes. Numeric formatted strings longer than 16 characters occupy the full overview width, preserving complete centavos; enlarged values can wrap naturally. This is a local legibility adjustment, not a new system-wide money rule.

## Read-only overview and exact financial data

The overview contains saved title, kind, parent lifecycle, expected amount, category/No category, monthly billing-day frequency, current/latest schedule start and exact Total paid. Installments additionally show “Installments resolved” from the existing paid-or-skipped count. Their expected label is “Expected per installment”; no contract-total calculation is invented.

The existing kind-only resolver supplies Bill → Receipt, Subscription → Repeat and Installment → Layers. Titles, merchant names and categories never choose the type icon. Built-in/custom/archived category names retain their saved identity; no category is inferred. Icons are decorative and the overview contains no form fields or actions.

Parent expected amount and each occurrence's expected amount remain separate. Old unpaid obligations keep their own retained expectation after an amount edit. Total paid is formatted from the authoritative BigInt aggregate of actual linked payments, including valid maximum-value payments; it is not derived from expected amounts or visible cards. Existing reversal reconciliation excludes reversed payments.

## Schedule versions and boundaries

All three kinds use the audited existing monthly billing-day model. The overview labels Frequency / Current schedule starts only when the parent is Active and its latest schedule is open. Other states use Latest schedule frequency / Latest schedule starts, avoiding an implication of active recurrence.

Schedule rows preserve supplied version IDs and createdAt/ID order. Each is informational: start anchor, billing day, exact version expectation and boundary. Effective from appears separately when it differs from startDate. A closed version says **Ends before** its effectiveUntil date because that boundary is exclusive. Open versions say Current for an Active parent, Completed schedule for a Completed installment, or Latest schedule otherwise. An open finite completed schedule does not imply new recurring obligations.

There is no invented schedule detail destination, chevron, tap action or extra menu. The rows compose one quiet continuous group using existing shapes and borders.

## Shared unpaid cards, actions and selected source context

Details actually reuses the compact v2.1 CommitmentCard. Its optional body-navigation callback is omitted here, making the card body informational while Pay and the occurrence menu remain separate. No redundant View commitment is shown for a normal full-series view. Empty menus are omitted when no legitimate action exists.

The unchanged selection helper supplies existing outstanding rows plus the next upcoming preview, or a valid focused Calendar/source occurrence. A focused view alone retains View commitment as a genuine action to clear focus and open the full series. Distant Calendar obligations remain actionable without expanding the normal Upcoming projection.

Pay opens the existing Payment Confirmation v2 with the selected occurrence's amount; no Expense is recorded until Confirm. Skip retains its existing confirmation and mutation. Due dates, derived Overdue, category, installment sequence and nonactive parent text remain authoritative. Main-feed card navigation is preserved through the same optional callbacks.

## Management, History, lifecycle and refresh

The header reuses existing Edit/History and eligible Pause/Resume/End actions. No Delete/Archive/Restore or new parent state is added. Pause/Resume integration updates the authoritative overview through the existing mutation/details-refresh path. End remains limited to supported Bills/Subscriptions; installment completion and paused restoration remain service-owned.

View history is a real navigation row with a forward affordance, opening the existing Paid/Skipped branch. History's presentation, earlier-page boundary, deduplication, Undo payment/Reopen, return-to-series and loaded-span refresh remain unchanged. The screen does not add a competing history query or destination.

Ledger linkage, atomic Pay/Skip/reversal, schedule generation and lifecycle calculations are unchanged. Returning from source-owned payment reversal refreshes unpaid state and actual Total paid through existing services. Read/refresh failures keep the existing retry/error behavior and working dialog state; no UI calculation replaces a domain projection.

## Scrolling, responsiveness and accessibility

One variable-height SectionList renders overview/header, version rows, unpaid rows and History navigation inside the existing AdaptiveSheet custom scroll body. It uses six initial/batch rows, window size five, stable schedule/occurrence keys and no fixed getItemLayout. DetailsScrollView composes list and sheet refs through the existing FormScrollView/selection host. There is no nested vertical scroller, duplicated safe-area wrapper, native tab bar or competing keyboard owner.

Virtualization bounds mounted presentation; it does not change the existing readHistory collection, source queries or history paging. Long version collections and unpaid duties stay reachable by actual scrolling. The sheet header stays outside that scroll owner. Empty unpaid content retains “No unresolved occurrences in this preview.”

Long names/categories, exact money, schedules and actions wrap without line caps. Static overview/schedule/card bodies have no false button behavior. Schedule accessibility labels distinguish start/effective dates and exclusive boundaries; header Back/menu, actual Pay/Skip and History navigation have explicit action labels. Status remains in text, icons are decorative and shared Reduced Motion/targets remain in use. Native focus, gestures, safe areas and screen-reader behavior remain unverified.

## Skills and review findings

- **frontend-design:** Applied the supplied overview/schedule/unpaid/history hierarchy with practical metrics, quiet ownership and the existing compact card family.
- **Impeccable:** Reviewed density, hierarchy, noninteractive rows and exact-money readability. Initial review opened all 46 screenshots and found normal 390 maximum money fragmented a centavo digit in a half-width metric. Long formatted money now spans the overview width. All 46 captures were rebuilt; the reviewer reopened three named maximum/stress normal states and marked that finding **RESOLVED**. Final disposition remains **RECAPTURE** solely for missing native evidence. This targeted follow-up does not imply another all-image review.
- **UI/UX Pro Max:** Informational-row semantics, distinct static content versus actions, and clear Back/navigation guidance informed the absence of fake schedule/card destinations and the explicit History row.
- **Expo Skills:** Used the [official SectionList guidance](https://reactnative.dev/docs/sectionlist) with the matching Expo SDK58 architecture: variable rows, shared sheet scroll measurements, ref composition and preserved native inset ownership.

The main implementation agent compared the user target and inspected multi-version/light/stress-bottom views. The independent reviewer assessed the brief, source and RN Web matrix without the original mockup pixels as a filesystem artifact. The HTML/CSS detector does not apply to this native production surface. No defect or missing native evidence is promoted into a design-system rule.

## Evidence and validation

The [capture index](previews/commitment-details-v2/README.md) records **38 base scenes / 46 PNGs**, including six enlarged stress-bottom views and two multi-version bottom views. Final checks contain **76 actual money measurements**, Expected and Total paid in each scene, with zero recorded browser errors/overflow/failures. Long normal-size values assert full width and a single line; enlarged values retain natural wrapping.

The preceding Resume full-suite baseline was **1,307**; no fresh pre-edit full run was required. Details focused coverage passed **319**, zero failures (28.6 seconds), and the full suite passed **1,320**, zero failures (136.9 seconds), before the final single money-layout condition. After that presentation-only correction, all **13 Details tests passed again**, alongside rebuilt browser checks. Tests cover kinds, read-only overview, archived references/actual total/Undo, version boundaries and old expectations, terminal states, shared Pay/Skip, confirmation, Calendar focus, large variable lists/maximum money and Pause/Resume integration.

Final TypeScript exited zero with an empty log. ESLint retains the exact six existing errors/two warnings, zero added or removed normalized diagnostics; its exit one reflects that baseline. Final iOS/Android production exports both exited zero. `git diff --check` passed. Logs/JSON live under `dist/commitment-details-v2`; source services, schemas and dependencies are unchanged.

## Files and worktree

| Area | This stage |
| --- | --- |
| Details presentation | New `src/features/finance/commitments/components/commitment-details.tsx` |
| Existing integration | `commitments-view.tsx` non-History Details branch; `commitment-card.tsx` optional navigation/actions for genuine reuse |
| Coverage | New `tests/commitment-details-v2.test.ts` (13 cases); `tests/calendar-components.test.ts` shallow Details-props assertion and unused import cleanup |
| Review | `scripts/preview-commitment-details-v2.ts`; `scripts/review-commitment-details-v2.cjs` |
| Documentation/evidence | This document; `docs/previews/commitment-details-v2/README.md`, 46 PNGs and `checks.json` |

Existing Resume forms/view work is preserved. Main remains at HEAD `289cf7da9e7edacb2d72c2e17568e6c4fbb6201d`; this task issued no reset/clean, staging, commit or push. Global product/design files and other feature content are untouched.

## Native recapture still required

**RECAPTURE remains open.** No adb/emulator/xcrun or default Android SDK adb/emulator executable is available, and Windows cannot run the iOS simulator. Browser substitutions and successful exports do not supply genuine device screenshots.

On iOS/Android capture both themes and enlarged/narrow layouts, full overview money, version boundaries, unpaid cards and the scrolled History row. Verify native safe areas, Back/menu focus, static-row announcements, exact Total paid, gestures/scroll coordination, long-list behavior, Pay/Skip confirmation, lifecycle actions, Calendar focus → full series, History paging/Undo/return and reversal refresh. Confirm long maximum money and all terminal states on installed builds.

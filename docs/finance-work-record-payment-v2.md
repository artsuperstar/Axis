# Finance Work Record Payment v2

## Existing payment behavior audit (before implementation)

1. Record payment opens from main Work, a client context, or Job details. Client/entry context can preselect its source IDs.
2. WorkView owns one existing WorkModal; WorkPaymentEditor supplies its child AdaptiveSheet. No additional modal is needed.
3. Initial client is the targeted entry's client, targeted client ID, or null. No client is silently chosen on the global entry point.
4. Autocomplete uses `paymentClientAutocomplete` with canonical matching and actual saved identities; results are bounded to eight matches.
5. Clients must have positive outstanding work to be offered. Archived clients with debt remain eligible; payment does not create clients.
6. Eligible rows belong to the selected client and have positive source-provided outstanding balances. Settled/zero-balance entries are excluded.
7. Existing row selection is an explicit checkbox, not a Work dropdown. Main entry begins with no allocations.
8. One payment supports several selected entries for one client, each with an independent allocation amount.
9. Targeted entry and newly checked rows default to their current outstanding amount via `formatBrlInput`; this established full-balance default is retained.
10. Allocation input uses the existing exact BRL parser through `allocationValues`, with positive centavos and safe-integer limits.
11. Empty, malformed, negative and zero selected allocations fail validation. Unchecked rows are absent from the draft.
12. The source service rejects allocations above the current balance after reading authoritative state inside its transaction.
13. Duplicate entry IDs, missing entries and allocations from another client are rejected by existing validation.
14. `allocationValues(draft.allocations).amountMinor` supplies the total, using BigInt-safe aggregation and its existing total-range guard. It is not an editable independent amount.
15. Partial receipts leave the exact remaining balance open; receiving part of one entry never resolves its whole balance.
16. Active allocation records link each saved entry to one receipt's Finance transaction ID.
17. `recordPayment` creates exactly one Income transaction for the sum of all allocations; it does not create an Income per entry.
18. Payment date defaults to local today, is required, and cannot be a prohibited future/invalid date. It is separate from work and expected-payment dates.
19. Category defaults to null/No category and offers active Income categories only, including built-in/custom ones.
20. Existing inline category creation returns/selects a real Income category ID while the payment draft stays mounted. Archived or Expense categories cannot be newly applied; historical receipt references are untouched.
21. Confirm calls the existing WorkView mutation/service and dismisses on success. No extra payment confirmation step exists.
22. A synchronous ref prevents repeated submissions; the original source has no asynchronous network loading interval.
23. An immediate database transaction validates current entries/category/date, inserts the Income and all allocation links, and rolls back together on failure.
24. Failure releases the submission guard, retains every draft field and displays the actual source error; Retry uses the same authoritative service.
25. Changing client clears allocations while retaining date/category. This prevents amounts from an earlier client being submitted under another client.
26. Work History and Job details reconcile receipts to entries; Undo soft-deletes the whole receipt's links and Income atomically under current restrictions.
27. Existing mutate/focus/foreground refresh updates Work totals and cards. A failed refresh retains last-good data and dirty payment allocations.
28. Transactions/Overview/Cash Flow/Journal use actual linked Income on the receipt date; Calendar updates its open expected-payment projection. Earned remains compensation, not received cash.
29. Existing WorkDate dismisses the keyboard, uses Android's installed picker or the iOS spinner/Back boundary, and retains local-date semantics. Income selection/creation uses the shared selection host.
30. Cancel/outside/native Back discard the unsaved payment under existing ownership. Shared sheet owns safe areas, keyboard measurements, focus reveal and scrolling. The old eager allocation map needs bounded rendering for large eligible collections; drafts must stay outside recycled rows.

## Direction and scope

Ordinary Warm Editorial Hearth extension in Operate mode. The supplied image pins the material, compact generic icons, serif header and full-width labeled controls. It does not authorize replacing multiple allocations with a single Work selector/Amount field. Use a Client section, contiguous virtualized allocation section with derived Payment total, Payment details, and quiet actual-income note. Current scoped v2 colors remain provisional. Preserve the existing New/Edit Work and uncommitted Work main implementation. No domain, schema, dependency, migration or persistence change.

## Validation and review

Browser captures support layout review and do not certify installed native pickers, keyboard/focus or OS text scaling. Completed evidence and its limits are recorded below.

## Implemented presentation and retained payment contract

The previous payment form already supported a client, several checked outstanding Work records, an independently editable amount for each allocation, a derived receipt total, payment date and Income category. The supplied image informs its material, compact icons and editorial hierarchy. Its single Work dropdown and standalone Amount field do not describe the implemented financial model.

`WorkPaymentEditor` now presents Client, Apply payment to work (including its rows and Payment total), Payment details, and the actual-income explanation. It remains inside the existing Work modal and shared AdaptiveSheet. The allocation heading, rows and total form one contiguous owned group; the date and category share a separate section. There is no new payment confirmation screen.

The header keeps Cancel and Confirm reachable. Below 390 units or at fontScale 1.4 and above, the title occupies its own row. The title uses the existing editorial serif treatment: 20/28 in the compact action row and 22/30 when stacked. Section headings reduce to 18/26 on narrow enlarged-text layouts. The body scrolls beneath the header rather than requiring all allocations to fit above the fold.

The existing `paymentClientAutocomplete` supplies real client identities with eligible outstanding work, including archived clients with debt. There is no payment-side client creation. An unscoped receipt begins without a client or allocations. A targeted entry retains its existing full-outstanding initial allocation; newly checked rows also retain that established default. Changing client clears allocations and the displayed submission error while retaining date and category.

Every allocation keeps its Work ID, title, work date and authoritative outstanding balance. Its checkbox selects only that record; its amount input appears only while selected. Generic person, briefcase, calendar and information icons use the shared icon system. No icon is inferred from a client or Work title. Multiple partial allocations, a mix of partial/full allocations and leaving other work unpaid remain supported.

Amounts use `allocationValues` for exact BRL validation and aggregation. Adjacent errors identify invalid, nonpositive, excessive or no-longer-eligible allocations. Any invalid selected row suppresses the apparently valid Payment total; no independent editable receipt amount exists. Outstanding sums and the remaining-after-payment readback use integer/BigInt arithmetic. Long input values receive a wrapping readback, without changing the input's editing semantics. Partial payment reduces only the amount actually allocated.

Payment date still defaults to local today and uses existing actual-money restrictions and `YYYY-MM-DD` semantics. The existing WorkDate boundary dismisses the keyboard before opening the Android picker or iOS spinner/Back controls. Income category uses existing Finance options and inline creation, including No category and active Income categories. A newly created category returns its real ID to the mounted draft.

Confirm is disabled without a client or selected allocations. Shared busy semantics and a synchronous submission guard prevent repeated submissions; the real callback remains synchronous, so no artificial loading delay is added. Invalid amounts and dates still reach authoritative validation. Failure releases the guard and retains all draft fields with the actual error for retry. Successful submission uses the existing WorkView/service boundary and dismissal behavior.

The unchanged service rereads current state and atomically creates one receipt's allocation links and **one Finance Income transaction for their exact total**. It enforces client ownership, available balances, category/date eligibility and rollback. Work Received/Outstanding, Finance actual-income projections, Calendar expectations and Journal integration retain their existing source-owned semantics; Work Earned is not received cash. No domain, schema, migration, persistence or dependency change belongs to this redesign.

## List, draft, keyboard and accessibility implementation

`WorkPaymentList` replaces eager allocation rendering with one FlatList whose header owns Client and the allocation heading, and whose footer owns total, payment details and the explanation. Its stable keys are Work entry IDs. It renders batches of six with a window size of five and keeps all allocations in the parent editor rather than recycled cells. Available entries and ID/selection maps are memoized from the existing snapshot; there are no per-row database reads.

The list's scroll component is the shared FormScrollView. It attaches both the list ref and sheet reveal ref, preserving the existing safe-area, keyboard measurement, focus reveal and selection-host ownership. It adds no competing vertical scroll or keyboard avoidance layer. Native cancellation, dismissal and picker return behavior continue through the existing owners; installed-platform verification remains outstanding.

Selectable rows expose checkbox roles and checked state, Work-specific labels and work-date/outstanding hints. Amount fields name their Work record. Labels remain above fields; balances, titles and the total can wrap. The total has a polite live region. Empty, invalid and selected states have text/checkbox cues as well as color. Shared controls retain their accessibility state and error behavior. The 48-unit shared touch target is retained for allocation selection. Decorative icons use shared behavior and the handle is hidden from accessibility. Actual screen-reader announcements and focus movement still require device checks.

## Scoped visual-system record

This is an ordinary extension of Warm Editorial Hearth in Operate mode. The existing `WorkEditor`, shared v2 controls and `src/constants/design-system-v2.ts` are implementation evidence. The mockup's provisional mint does not replace the shared warm/plum palette. Palette unification remains a separate task.

| Role used by this editor | Light | Dark |
| --- | --- | --- |
| Canvas | `#F5F0EA` | `#151315` |
| Surface | `#FFFCF8` | `#1B181A` |
| Owned group | `#FBF5F0` | `#242024` |
| Control | `#F8F3EF` | `#2B272A` |
| Primary text | `#241E1C` | `#F6F0ED` |
| Secondary text | `#6A5E59` | `#C9BDB8` |
| Quiet border | `#E4DAD4` | `#3A3337` |
| Strong border | `#9B837B` | `#7F7078` |
| Brand/selection edge | `#7B425E` | `#DFA6BF` |
| Soft icon tile | `#EBD8E1` | `#422E38` |
| Selected fill | `#F1E1E8` | `#3C2B35` |
| Error | `#9B303E` | `#F0ABAB` |

The shared font system uses AxisLora-SemiBold for editorial display and AxisManrope-Regular/SemiBold for interface copy, retaining system fallbacks before fonts load. Reused field labels are 14/20, body 16/24, secondary/metadata 14/20 and numeric readbacks 15/22 with tabular figures. Payment total uses the 16/24 card-title role. Reused spacing is 4/8/12/16 units; owned groups use a 16-unit radius, controls 10 and the sheet 20. Allocation tiles are compact (32 by 36), section tiles 36 by 36, and icon glyphs 20. These are observed shared/source values, not a replacement token system.

**One allocation, one identity.** Keep the selected Work and its exact amount adjacent throughout editing and recycling.

**One receipt, one total.** Use the domain parser for the visible receipt total and retain the single linked Income transaction.

**Extend the established world.** Reuse shared editorial type, warm surfaces, plum states and field behavior; keep this surface's composition local to Record Payment.

PRODUCT.md supplies durable native-use, exact-money, source-ownership and draft-safety constraints. Its Expo SDK 57 statement is stale against package.json's SDK 58 dependencies. DESIGN.md is absent. Both are preexisting documentation drift, recorded here without repairing global product/design files or generating a new design.json. The document skill's system-extraction guidance is scoped here to the implemented feature because the authorized task is an ordinary extension, not a new visual world or global documentation rewrite.

## Skill findings

- frontend-design: the mockup's material and hierarchy translate into a compact editorial header, three meaningful sections and a contiguous allocation/total group. The financial allocation model remains the composition's authority.
- Impeccable: retained useful form density, removed the eager-list limitation, avoided a card per payment-detail field, kept error feedback adjacent and deferred platform claims until native evidence exists. The document pass compared the incumbent WorkEditor, actual shared tokens, source implementation, preview manifest and representative original captures rather than inventing a system from the image.
- UI/UX Pro Max: the local `form error feedback` UX search informed submit feedback, error recovery and adjacent field errors. Responsive action separation, 48-unit selection targets, full-width labeled controls, large-value wrapping, explicit checkbox state, source-specific labels and virtualized scrolling were checked. Native accessibility and font-scaling claims remain bounded by the available evidence.
- Expo/native integration: the installed `building-native-ui` skill and its form-sheet reference were actively read, alongside versioned SDK 58/FlatList documentation. Existing shared modal and picker ownership takes precedence over introducing another routing/presentation architecture. Successful exports establish bundling compatibility; they do not establish installed interaction fidelity.

## Validation evidence and current review status

The preimplementation automated baseline passed 1,358/1,358 tests. The focused payment/editor checks pass 41/41, including eight new checks. The relevant Work/Finance/Transactions/Overview/Calendar/Journal regression selection passes 623/623 with `TZ=America/Sao_Paulo`. TypeScript passes. Global ESLint remains at the same baseline of six errors and two warnings. iOS and Android exports exit successfully, and `git diff --check` is clean. These results are recorded from the implementation validation; no unrelated lint repair or Tasks change is included.

The final full suite passed **1,366/1,366**, exit 0, in 187 seconds, using `TZ=America/Sao_Paulo` and serial test files with no competing validation processes (`dist/work-payment-v2/full-final.log`). Earlier runs encountered the unchanged Finance test's Windows timezone-restoration issue and time-sensitive Tasks animation assertions while other validation work ran. The Finance case passed independently and all 56 Finance tests passed with an explicit timezone. The final full run passed those Tasks assertions as well. No Finance date/domain code, Tasks code or Tasks tests were changed to obtain this result.

The [preview evidence](previews/work-payment-v2/README.md) contains 42 scenarios, 142 original captures and 18 contact sheets. The actual editor/list/shared controls and selection host are rendered; fixtures come from the real SQLite Work service. Coverage includes light/dark; 320/390/430 widths; ordinary/doubled text; long names/titles; maximum amounts; empty/targeted/one/multiple/mixed allocations; invalid/zero/excessive amounts; failure/retry presentation; client reset; date/category boundaries; keyboard metrics and the actual-money note. The 142-job fixture initially mounts 17 allocation cells and checks six independently edited amounts through bottom/top scrolling. Browser scenes do not write actual payments; SQLite tests verify persistence, rollback and reconciliation.

The document pass directly viewed `multi-partial-light-top.png` and `stress-dark-320-2-total.png`: their section ownership, warm/plum identity, separate allocation inputs, stacked enlarged header and wrapped full financial readback match the implemented direction. The reviewer first requested recapture of `many-light-details.png` and `many-light-total.png`. Teleporting to an estimated virtualized end produced invalid transient evidence; a continuous user scroll through measured windows produced contiguous captures. The fresh full review checked all 142 originals through all 18 contact sheets and directly inspected corrected tails and doubled totals. Its final disposition is **ship**, limited to browser layout and inspected presentation source, with no material fixes. The reviewer could not access the inline target image; root compared it, while the reviewer used the detailed request and incumbent system. No native certification is implied.

## Files in this stage

- `src/features/finance/work/components/work-forms.tsx`: scoped WorkPaymentEditor integration; existing New/Edit Work retained.
- `src/features/finance/work/components/work-payment-list.tsx`: allocation list, row and shared-scroll ref bridge.
- `tests/work-payment-v2.test.ts`: eight mounted editor/source-service scenarios.
- `tests/work-experience.test.ts`: update the former Receiving assertion to the authoritative Payment total.
- `tests/work-forms.test.ts`: adapt the existing static smoke check to virtualized header/footer ownership; option-identity coverage lives in mounted tests.
- `scripts/preview-work-payment-v2.ts`, `scripts/review-work-payment-v2.cjs`: real-component fixtures, browser checks, captures and PNG provenance.
- `docs/finance-work-record-payment-v2.md`, `docs/previews/work-payment-v2/`: audit, implementation record and review evidence.

## Native verification limits

Browser boundaries substitute native font loading, image rendering, safe areas, date-picker and keyboard events. Doubled CSS text plus the React Native fontScale context supports layout review but does not certify OS text scaling. The keyboard scene supplies metrics and checks the focused field without drawing a fake keyboard. There is no installed emulator/device tooling or native capture evidence in this workspace.

Physical iOS/Android checks still needed: amount-field reveal with the real keyboard; native picker selection/cancellation and return; nested category/client focus restoration; VoiceOver/TalkBack labels, errors and total announcements; OS enlarged text; gestures/Back/safe areas; and sustained many-job scrolling with draft retention. Exports and browser images cannot close those checks.

The scoped implementation preserves the preexisting uncommitted Work main and New/Edit Work changes. The New/Edit Work component and its styles match the preimplementation snapshot. No commit or push is performed.

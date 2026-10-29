# Finance Work — Job Details v2

## Behavior audit before implementation

1. Main Work cards, Client open-job rows, settled Work History and initial record navigation open the existing details dialog with a real Work ID.
2. WorkView owns one AdaptiveModal. The legacy details branch supplies an AdaptiveSheet; Back and native dismissal close that dialog without creating another navigation stack.
3. Work identity uses saved Title, then the existing legacy Description fallback, then Untitled job. Description remains separately stored and optional.
4. The associated saved Client is historical identity, including an archived client's retained name. Work has no Active lifecycle state.
5. WorkItem exposes derived unpaid/partial/paid status and source-owned overdue. These are payment facts, not a new job lifecycle.
6. Fixed compensation uses its saved fixed amount. Hourly compensation retains whole duration minutes and saved hourly rate, using existing exact compensation calculations.
7. Earned, Received and Outstanding are source-owned integer centavo values. Actual allocations establish Received; Earned alone never creates Finance Income.
8. Work date and optional expected payment date are local YYYY-MM-DD values. Receipt transactionDate is the actual-money date and must remain distinct.
9. Source overdue requires positive outstanding, an existing expected date and that date before local today. The UI must not derive a different rule.
10. The legacy WorkRow details presentation repeats Outstanding and does not explicitly display the Earned amount despite its compensation label. It uses loose text and a bottom border rather than one owned overview.
11. Record payment appears only with positive outstanding. Its details entry opens the existing v2 editor with the selected job/client and full remaining balance preselected under existing rules.
12. Record Payment retains its existing multi-job allocation workflow; one confirmed receipt creates one linked Income transaction. No payment calculation or persistence changes belong here.
13. Edit is currently an overflow action. It opens the existing New/Edit Work v2 editor. Paid work retains source restrictions on Client changes and reducing Earned below Received.
14. Work options also contains Client details and, only with no received money, confirmed Delete. Work with active allocations cannot be deleted.
15. Paid-work deletion guidance tells the user to undo payments first. Undo remains a receipt-level operation with an existing confirmation covering every job linked to that Income.
16. A genuine Client details dialog already exists inside WorkView; Client navigation can use it. Back there retains its established behavior of closing the dialog.
17. No Description-details destination exists. Description must remain ordinary selectable multiline text without a chevron or button semantics.
18. WorkView reads readDetail on selected identity and authoritative snapshot changes, retaining last-good detail through read failure. Source errors are displayed; normal mutation/focus refresh remains the existing owner.
19. readDetail is already a targeted transaction snapshot, not the paged global History query. It includes every active receipt associated with the selected job and all other allocations needed to reconcile a shared receipt.
20. Detail receipts have no existing paging cursor. Global Work History is separately paged and remains unchanged. Virtualize rendering without replacing the source query or introducing a per-row read.
21. Receipt ordering is source-owned: actual payment date descending, then creation time descending, then ID. Preserve this order and stable Income IDs.
22. The legacy detail branch filters relevant receipts but reuses the global receipt renderer, whose primary amount is the entire transaction. A shared receipt therefore needs a Job Details-only presentation correction to display the selected job's allocation.
23. Receipt disclosure currently exposes the work covered by the receipt. Retain that supported disclosure and the whole-receipt Undo action; do not invent per-allocation reversal or ordinary payment deletion.
24. Existing confirmed Undo atomically removes all allocation links and their one Income, refreshing the underlying Work/Finance projections. Preserve this service and confirmation meaning.
25. Payment and Edit replace the current dialog content; their existing save/cancel dismissal closes the dialog. Do not invent automatic return navigation. Reopening details reads refreshed authority.
26. Shared modal/sheet/selection hosts own safe areas, focus restoration, background interactivity and dismissal. The legacy detail body is eager; one bounded receipt list can preserve this ownership and avoid nested vertical scrollers.

## Direction and scope

Ordinary Warm Editorial Hearth extension, Operate mode. Follow the supplied final inline mockup's hierarchy: compact Back/Job details/options header, one financial overview, explicit Record payment and Edit work actions, Client, optional Description, and Receipts. No Payment Status, separate Job Summary, percentage/progress display, duplicate financial breakdown, unsupported Active badge or Description chevron. Use the incumbent Lora/Manrope typography, shared warm cream/charcoal/plum tokens and amber overdue text plus icon. Provisional mint is not a global palette change.

Use one header management menu rather than repeating its trigger below the overview. Promote Edit to one explicit secondary action and remove its overflow duplicate. Use the existing Client destination for the Client row; keep the overview and Description informational. Receipts use the selected job's actual allocation, with shared receipt context distinguished from job totals.

Preserve preexisting uncommitted Work main, New/Edit Work and Record Payment v2 changes. No domain, query, schema, migration, dependency or persistence expansion. Root DESIGN.md remains absent and PRODUCT.md's older SDK reference is preexisting context drift; do not repair those artifacts during this extension.

## Implemented hierarchy

The final inline mockup supplies the composition: a compact Back / Job details / options header, one owned financial overview, actions, Client, optional Description and Receipts. The previous details body reused the compact Work row and global receipt renderer. That repeated Outstanding, left Earned implicit and presented the entire shared Income as the receipt's primary amount. The new [Job Details component](../src/features/finance/work/components/work-job-details.tsx) supplies the scoped presentation within [WorkView's existing dialog](../src/features/finance/work/components/work-view.tsx).

The overview is the only summary of Earned, Received and Outstanding. It contains a generic briefcase icon, saved job identity and Client, prominent Outstanding, compensation, Earned, Received, Work date and Expected payment. The icon is never inferred from the title or Client. Identity retains the shared `jobTitle` fallback: Title, legacy Description, then Untitled job. Hourly work shows saved duration and rate; Fixed work shows Fixed price without repeating a second fixed-amount total.

Payment Status, a separate Job Summary, percentages, progress bars, repeated financial breakdowns and an unsupported Active job badge are absent. Work's source payment facts do not establish a new lifecycle. The primary Record payment action appears only when Outstanding is positive. Edit work is one explicit secondary action; its overflow duplicate is removed. The one header management menu retains Client details and confirmed Delete when no money has been received. Paid work retains the instruction to undo payments before deletion.

Client has a chevron and button semantics because it opens the existing Client details dialog, including retained archived identity. It does not create a route or a new Client editor. Description is saved, selectable multiline text, with no chevron, press handler, button role or accidental editing. An empty Description is omitted. Editing belongs to Edit work.

## Financial meaning and receipt integrity

Work's source-owned integer-centavo Earned, Received, Outstanding and overdue values are displayed directly. Fixed/hourly calculations, duration semantics and validation remain in their existing owners. Work date describes the work, Expected payment is an optional local-calendar expectation, and a receipt's Payment date is the actual-money date. Missing expected dates display Not set. Overdue is the existing source rule and is communicated by explicit amber text plus a clock, rather than color alone.

Creating or editing Work and reaching an expected date do not create Income. Actual receipts supply Received and the existing linked Finance Income. Source-owned projections continue to feed Work, Finance, Calendar and Journal through the existing mutation/refresh flow.

A receipt row's **Received for this job** amount is the selected job's allocation. For one shared R$ 180,00 receipt with R$ 100,00 for Job A and R$ 80,00 for Job B, Job A displays R$ 100,00 as its received amount; Finance retains one R$ 180,00 Income. A Shared receipt label gives the number of covered jobs. Explicit disclosure reveals the Shared Income total and all covered allocations, clearly separated from the selected job's totals. Actual payment date, historical category label, source order and stable Income ID remain intact.

Receipt options retain **Undo payment**, an existing whole-receipt operation. Its confirmation names the full Income amount and number of linked work entries. Cancel preserves the ledger; Confirm atomically removes that one Income and every allocation in the receipt, restoring all affected outstanding balances. There is no per-allocation reversal or standalone Delete payment action.

`formatBrlAmount` preserves integer digits and both centavos, including `Number.MAX_SAFE_INTEGER` centavos (`R$ 90.071.992.547.409,91`). Job Details makes no floating-point currency conversion. Extreme formatted amounts wrap as atomic digit groups; the final whole-number group and comma-centavo pair stay together (`409,91`). The complete formatted string remains the accessibility label. Narrow space is handled by stacking and wrapping rather than abbreviating, truncating or shrinking money.

## Dialog, navigation and refresh

WorkView still owns one WorkModal / AdaptiveModal. Job Details supplies an AdaptiveSheet with a custom header and one scroll body. Back and native dismissal close that existing dialog. Record payment and Edit work replace its content with the existing v2 editors; their existing save/cancel dismissal closes the dialog. No automatic return stack is introduced. Record payment receives the selected job, Client and full remaining balance through the established contextual preselection.

The selected identity and authoritative overview refresh continue to drive `readDetail`. Read failure shows the source error while preserving last known good detail and its mounted list. Reopening after mutation reads refreshed authority. Paid-edit restrictions, unpaid-delete confirmation and receipt Undo retain their existing services and validation.

## Responsive layout, scrolling and accessibility

The overview, actions, dates and receipts adapt to 320/390/430-unit widths and reported font scale. Financial groups stack below 390 units, at enlarged font scale, or for extreme amounts. Header controls move to their own row on narrow or large-text layouts. Long identity, Client and Description text can grow naturally. The section spacing uses the incumbent 4/8/12/16-unit rhythm rather than decorative blank regions.

One `FlatList` owns the variable-height overview/information header, receipt rows and footer. It renders an initial six rows, batches of six and a window size of five, with stable transaction IDs and clipping disabled for variable-height content. There is no nested vertical ScrollView or row-level source read. The list's responder ref and sheet scroll/focus ref both reach the existing FormScrollView through an explicit ref bridge.

This is **render virtualization**, not query pagination. The unchanged `readDetail` is the targeted transactional snapshot for one selected job, including every associated active receipt and the other allocations required to reconcile a shared receipt. No receipt cursor existed to preserve or replace. Global Work History retains its separate genuine paging and query behavior.

The shared sheet, form-selection, menu and control hosts continue to own safe areas, background interactivity, dismissal, focus restoration and Reduced Motion behavior. The Job details title is a heading; controls name their action and subject; receipt labels announce the selected allocation and actual date; disclosure exposes expanded state. Informational overview/Description content has no false button semantics. Client and receipt press areas use the shared 48-unit target. These source semantics require device verification before claiming native accessibility behavior.

## Incumbent visual-system review

This is an ordinary Warm Editorial Hearth extension. The authoritative [visual groundwork](design-system-v2-visual-groundwork.md), [Stage 14D record](design-system-v2-stage-14d.md) and [v2 tokens](../src/constants/design-system-v2.ts) remain the visual sources. Job Details uses the same DesignProvider, UiText, GroupSurface, EditorSection, v2 FormButton, ContextMenu and BackButton as incumbent Work/editor surfaces. Lora marks meaningful headings; Manrope carries practical financial and body text with tabular figures for money. Warm cream/light and charcoal/dark surfaces use semantic plum brand accents, restrained borders, rounded owned groups and amber attention text. There are no new palette tokens, mint promotion, gradients, glass, illustrations or global color unification.

Source review found the component consuming `DesignSpace`, `Shape`, `TouchTarget` and `useDesignColors`, rather than defining a competing color/font system. The Job Details-only header size and money grouping are local composition decisions. Root `DESIGN.md` and `docs/design-system-v2.md` were already absent; PRODUCT.md still names SDK 57 while the task targets SDK 58. These preexisting documentation gaps are recorded without repair. The scoped task authorizes this feature record, not a new visual-world workshop or global design artifact.

## Concrete skill contributions

| Skill | Contribution applied to this surface |
|---|---|
| frontend-design | Composed the single overview, editorial job/title hierarchy, compact primary/secondary actions and quieter Client/Description/Receipts sequence against the final inline mockup. |
| Impeccable | Eliminated duplicate summary/status/financial sections and duplicate Edit, checked density, nesting, icon size and light/dark parity, and bounded visual review to the supplied capture matrix. Its document finish records implemented evidence here without broadening the visual system. |
| UI/UX Pro Max | Refined the local UX query to `overdue color only`; the resulting explicit amber Overdue text plus clock avoids color-only meaning. Reviewed clear financial labels, truthful Client navigation, noninteractive Description and selected-allocation receipt language. |
| Expo Skills / SDK 58 official documentation | Reviewed FlatList rendering, native scroll/safe-area expectations and shared sheet ownership. Preserved the list/sheet ref bridge, source query and existing route/dialog lifecycle rather than introducing another modal or scroll owner. Native focus, gestures and OS font behavior remain physical checks. |

## Browser evidence and review boundary

[Capture README](previews/job-details-v2/README.md) links representative scenes, the machine-readable [checks manifest](previews/job-details-v2/checks.json) and the independent [finish review](previews/job-details-v2/finish-review.md). The preview renders actual WorkView, shared modal/sheet, Job Details, payment/edit editors, Client dialog, menus, fonts and tokens through React Native Web. Synthetic fixtures are created by real Work/Finance services against the test SQLite database, then serialized as snapshots. Browser mutation functions throw: financial writes and confirmations are exercised in SQLite-backed component/integration tests, not claimed from screenshots.

Native image/font-loading/safe-area/picker, keyboard/accessibility, motion and Expo Router boundaries are substituted for browser execution. The real bundled Lora/Manrope TTF files are embedded, while the expo-font hook is substituted as loaded. Insets are synthetic; router pushes are recorded rather than run through an installed navigator. CSS doubling of rendered text plus a reported fontScale of two is a layout stress test, **not OS Dynamic Type**.

The completed final browser matrix passed with 54 cases, 152 original PNG captures and 19 contact galleries: both themes, source-compatible payment states, widths, text stress, action destinations, long content and 75 receipts. Automated review checks one overview/three metrics, one Edit, absent rejected sections, truthful Description/Client semantics, selected-job shared allocation, action destinations/preselection, no horizontal overflow, atomic money groups, a bounded mounted receipt window and the final receipt's bottom clearance. Each PNG includes an `Origin` text metadata entry identifying actual-source rendering, synthetic SQLite fixtures and native/browser substitutions.

The initial 19 galleries were visually reviewed. The resulting correction kept maximum-BRL centavos together through atomic digit groups; the disclosure capture was also scrolled to reveal the supported shared-Income detail. Final representative inspection confirmed intact groups/no overflow and the visible R$ 100,00 selected allocation versus R$ 180,00 total / R$ 80,00 other allocation. Independent finish review inspected all 19 final galleries and representative originals, found zero browser errors or missing captures, and returned ship for browser/source scope with no material fixes. Both 75-receipt cases initially mounted 15 rows and reached the final receipt. The original inline mockup has no local image artifact available to the reviewer; this does not certify independent original-image fidelity or native behavior.

## Validation and remaining physical checks

| Check | Measured result |
|---|---|
| Fresh preimplementation full suite | **1,366/1,366**; explicit `TZ=America/Sao_Paulo`, serial files, no competing heavy validation processes. |
| Focused Job Details / Work tests | **80/80 passed** before final broad validation. |
| Final TypeScript | Passed, exit 0. |
| Final ESLint baseline comparison | Exactly the preexisting 6 errors / 2 warnings; no new diagnostics. Comparison also confirms the preexisting work-forms content is unchanged from task start. |
| Broad finance/integration regressions | **659/659 passed**, exit 0 (76,104 ms), including all 16 final Job Details cases/new centavo assertions, Work/editor/payment/client/compensation, ledger/Overview/Transactions/Cash Flow, Calendar/Journal and refresh lifecycle. |
| Final full suite | **1,382/1,382 passed**, 0 failed/cancelled/skipped; 170,372.991 ms. |
| iOS export | Completed: log success marker `Exported: dist/job-details-v2-ios`; artifact includes 5.2 MB entry HBC and 1.8 KB metadata. Original process session was unavailable after interruption, so no numeric exit code is claimed. |
| Android export | Completed: log success marker `Exported: dist/job-details-v2-android`; artifact includes 5.4 MB entry HBC and 2.1 KB metadata. Original process session was unavailable after interruption, so no numeric exit code is claimed. |
| Final browser matrix and visual review | Passed, exit 0: 54 cases / 152 originals / 19 galleries; zero browser errors/missing captures. Independent finish review inspected all 19 galleries plus representative originals: ship for browser/source scope, no material fixes. |
| `git diff --check` | Passed, exit 0 at final documentation handoff. Both feature documents also passed direct whitespace/conflict-marker checks. |

No physical device was available for this review; command probes also found no available adb, emulator or xcrun tools. Before native acceptance, check iOS/Android dismissal and Back, sheet drag versus receipt scrolling, final-row safe-area clearance, menu/picker/editor focus and restoration, keyboard avoidance, VoiceOver/TalkBack announcement/order, live Reduced Motion, and normal/doubled OS text scaling with long identity and maximum BRL values. Browser captures, mocked component tests and platform exports do not certify those behaviors.

## Current-task file inventory

| Area | Task-authored changes |
|---|---|
| Source | New `src/features/finance/work/components/work-job-details.tsx`; minimal integration in `src/features/finance/work/components/work-view.tsx`. |
| Tests | New `tests/work-job-details-v2.test.ts`; adapted `tests/calendar-components.test.ts`, `tests/refresh-lifecycle.test.ts`, `tests/work-experience.test.ts`, `tests/work-editor-v2.test.ts` and `tests/work-main-v2.test.ts`. |
| Preview tooling | `scripts/preview-job-details-v2.ts` and `scripts/review-job-details-v2.cjs`. |
| Documentation/evidence | This feature record; `docs/previews/job-details-v2/README.md`; captures, `checks.json` and `finish-review.md` in that preview directory. |

Existing uncommitted Work forms/editor, Record Payment and Work Main changes are preserved and are not attributed to this task. This feature changes presentation and minimal WorkView integration, with no schema, migration, dependency, financial-calculation or persistence expansion. No commit or push is part of this work.

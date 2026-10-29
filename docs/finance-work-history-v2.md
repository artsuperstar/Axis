# Finance Work — History v2

## Existing behavior audit

- Work main's History menu pushes `/work/history`; Back returns to Work or replaces `/work` when there is no prior route. Client menus open the existing filtered History sheet. No genuine History-level menu or job-row menu exists.
- History queries only active Work entries with source Outstanding exactly zero. Partial/unpaid Work stays in actionable Work; their actual receipts still qualify. The previous Job row displays Earned as its Paid amount, not receipt date or expected value.
- Jobs sort by Work date descending then ID ascending. Counts are authoritative qualifying totals, not the number loaded. Local Work/Expected/actual receipt dates retain distinct YYYY-MM-DD meanings.
- Receipt eligibility is active Work allocation linkage. Payment count is DISTINCT linked Income IDs. Receipt ordering is actual payment date descending, creation timestamp descending, then ID ascending. One shared Income appears once with all source allocation rows.
- `readHistory(20, cursor, optionalClientId)` uses separate job/payment cursors within one existing page model. Reaching the end of one collection does not reset the other. Load More appends; refresh rereads the current accumulated limit. Failed reads retain the last-good page and allow Retry.
- The old global route adds an outer ScrollView and eagerly maps the bounded loaded records. Client History uses the existing shared WorkSheet and same paging component. Receipt expansion lives in WorkView, outside rows.
- Job bodies open existing Job Details v2. Receipt bodies disclose covered jobs and per-job allocations. Receipt menus expose only Undo payment. Existing confirmation states the full Income amount and affected job count; the source transaction soft-deletes all allocations and that Income atomically, with stale-state rejection.
- Categories use saved Finance category lookup, including archived references; absent category adds no invented label. Archived client names/IDs remain historical references. Reading History writes no financial records.
- WorkView owns shared dialogs, actions and refresh. WorkManagementScreen owns route safe areas, Back, error/Retry and menu isolation. Existing Work editors, Clients and Job Details remain unchanged.

## Direction

Ordinary Warm Editorial Hearth extension, Operate mode. Use compact History → Jobs → Receipts, preserving both collections in one scroll. Omit the contradictory segmented selector, unsupported header overflow and unsupported job-card menus. Use one Paid text representation, generic briefcase/receipt icons, incumbent Lora headings/Manrope data and warm cream/charcoal/plum tokens. Mint remains provisional; no global palette change.

Keep original financial meaning: settled job Earned versus actual full receipt Income. Preserve source totals, cursors, load-more/retry and allocation disclosure; show loaded-vs-total metadata when paging. Use one SectionList with stable typed IDs, external receipt expansion state, variable heights and a bridge to the existing sheet scroll owner for filtered History. No new data queries, models, persistence or domain changes.

## Validation

The fresh full-suite baseline passed **1,396/1,396**. Final focused Work checks pass **59/59**, including **17 new History tests**; the broader relevant regression selection passes **690/690**. TypeScript reports zero errors. ESLint retains the exact baseline of **six errors and two warnings**, with no new diagnostics. `git diff --check` exits 0; Git reports its existing LF-to-CRLF normalization warnings.

The final full automated suite passed **1,413/1,413**, exit 0, in **183,909.894 ms**, with zero failures, skips or cancellations (`dist/work-history-v2/full-final.log`). This is the verified 1,396-test baseline plus the 17 new History checks. Final focused checks completed in 7,960.2383 ms, and the broader regression selection in 89,046.3941 ms. The full run completed before platform exports began.

**iOS export: passed, exit 0. Android export: passed, exit 0.** Production bundles are recorded in `dist/work-history-v2-ios` and `dist/work-history-v2-android`; logs are `dist/work-history-v2/export-ios.log` and `export-android.log`. These establish successful bundling, not installed-device behavior.

**Post-label-fix TypeScript: passed, exit 0. ESLint: exit 1 from the exact existing six errors and two warnings, with no new diagnostics.** Baseline comparison includes file, line, rule, severity and message. Existing errors are `react/no-children-prop` in context-menu, navigation-conventions and transactions-experience tests; existing warnings are unused variables in tasks-experience tests. Logs and JSON reports are under `dist/work-history-v2/`.

No commit or push. The existing dirty worktree and unrelated Finance/Work implementation are preserved.

## Previous screen and mockup interpretation

The previous History rendered two real collections as loosely arranged text/divider rows. Jobs already opened the existing details sheet; receipts already disclosed source allocations and exposed Undo payment. The global route wrapped eager, bounded rows in an outer ScrollView. Client-filtered History used the shared Work sheet. This work changes their presentation and list rendering while retaining those owners and contracts.

The supplied mockup establishes the compact editorial archive, contained cards and generic icons. The explicit correction keeps **Jobs and Receipts together**. History has one Back control, its compact serif title, Jobs with their authoritative count, then Receipts with their authoritative count. There is no segmented selector, duplicate jump navigation, History overflow menu, job overflow menu, large introductory card or dashboard metric.

The inline target was available to the coordinating implementation agent. The independent reviewer used the written brief, incumbent system, source and rendered evidence; it could not access the inline image. Its review does not establish an independent pixel comparison to that target.

## Implemented cards and financial meaning

`WorkHistoryJobCard` uses the shared generic briefcase icon, saved title, historical client reference, original **Earned** amount and one **Paid** text status. History eligibility is source Outstanding exactly zero; this is why Paid is valid in this collection. A source-valid zero-earned job can qualify without a receipt. Unpaid and partially received jobs remain outside Jobs, while their legitimate actual receipts remain in Receipts. Fixed and hourly compensation keep their existing earned calculation and source rounding.

Titles and client names wrap naturally. An existing distinct description is secondary and capped at two lines; no new description is fabricated. An archived client retains its saved identity and explicit Archived client text. Job body taps open the existing Job Details v2 sheet; they do not open Edit directly. History adds no Edit/Delete/Archive/Reopen menu. Existing actions remain in their established destinations and retain their existing restrictions.

Job dates are explicitly **Work** and, only when present, **Expected**. The latter is the saved planned payment date, never proof of actual receipt. Dates keep `dateLabel` and the source's local `YYYY-MM-DD` semantics. Expected dates are not rewritten to actual payment dates after settlement.

`WorkHistoryReceiptCard` uses the shared generic receipt icon, saved client, full authoritative linked Finance Income amount, **Received** date, allocation count and saved Income category when one exists. The date is `transaction.transactionDate`, not Work date, expected date, creation timestamp or today. Built-in/custom/archived category names use the existing `financeCategoryName` lookup. Missing category produces no invented Freelance or No category line.

The briefcase and receipt glyphs are generalist identity aids, never selected from a title, client, merchant or category. Their shared icon implementation is decorative when adjacent text provides the meaning. The card's monetary text uses the practical sans-serif and tabular figures, not the editorial heading font.

Receipt totals and job amounts remain distinct source-owned facts. A settled Job A earned R$ 100,00 can appear beside one R$ 180,00 receipt allocated R$ 100,00 to Job A and R$ 80,00 to still-partial Job B. The receipt remains **one** card and **one** linked Income transaction. Its disclosure presents both allocations at their own exact amounts. Several receipts for one job remain several actual receipt records. No receipt total is copied into every job allocation.

BRL formatting continues through `formatBrlAmount`; History adds no floating-point financial calculations. Long formatted amounts wrap at display grouping boundaries while preserving every source digit, including the centavo pair. Presentation does not modify job/client/receipt/allocation IDs, saved dates, archived references, money values or Income linkage. Reading, scrolling and expanding History create no financial records. No domain, schema, migration, persistence or dependency change is introduced.

## Receipt actions and Undo compatibility

Receipt body taps toggle the existing allocation disclosure. Expansion is stored as a receipt ID in WorkView, outside recycled list cells; toggling requires no additional row query. The overflow control is separate and exposes the genuine **Undo payment** action only. Its label identifies receipt position, client, exact amount and actual Received date so same-client receipts remain distinguishable. It opens the existing confirmation rather than immediately writing.

Confirmation names the full Income amount and number of affected work entries, explaining that Finance Income is removed and money owed is restored. Cancel retains the receipt. Confirm calls the existing `access.undoPayment(transaction.id)` through WorkView's shared mutate/error boundary. History does not implement a second reversal service.

The unchanged service rereads the current authoritative snapshot in an immediate SQLite transaction. A missing/already-undone payment is rejected as stale. All active allocations for that receipt and its linked Income are soft-deleted together; an injected persistence failure rolls the whole operation back. The existing reconciliation guards remain authoritative. Successful reversal refreshes Jobs/Receipts, Work Received/Outstanding and actual Finance Income. Failures surface the existing error and preserve retryable last-good presentation. Real SQLite integration tests cover successful reversal, cancellation, stale-state rejection, linked Income and atomic rollback; the browser confirmation scene does not execute Undo.

Transactions, Overview, Cash Flow and Journal continue to derive actual Income from the linked Finance transaction and its actual date. Calendar retains source-owned open Work expectations. Earned is compensation, Received is allocated actual money and Outstanding is their source reconciliation. History introduces no competing totals or whole-occurrence settlement rules.

## Counts, order, paging and refresh

| Collection | Eligibility and authoritative count | Existing source order |
| --- | --- | --- |
| Jobs | Active entries with Outstanding exactly zero; `settledCount` over all qualifying records in global or client scope | Work date descending, then ID ascending |
| Receipts | Active Work allocation linkage; `paymentCount` is distinct linked Income IDs in the same scope | Actual transaction date descending, creation timestamp descending, then ID ascending |

Archived clients are retained historical references; archival does not erase their qualifying history. Existing soft-deletion/reconciliation rules remain in the data service. Receipt allocations come from the receipt's existing source rows rather than an unrelated loaded Jobs count.

`readHistory(20, cursor, optionalClientId)` retains one page model with independent job and payment cursors. The first read loads up to 20 of each collection. Load more appends the next source page; an exhausted cursor remains exhausted while the other collection continues. Counts remain authoritative totals, with **Showing loaded of total** below a heading when only a subset is loaded. End-of-history removes Load more history.

Mutation/focus refresh uses the existing data refresh token and rereads the accumulated limit, preserving the amount of history already requested. The source queries and financial projection logic are unchanged. A load/refresh failure preserves the last-good page and receipt expansion and offers Retry history. A failed initial read shows unknown counts (`…`) rather than claiming zero. Before the first page, loading has an accessible label. Separate compact No settled work yet and No receipts yet states preserve a populated companion section. Entirely empty History retains Back and both zero-count headings.

## Scrolling, navigation and native ownership

One `SectionList` owns both sections. Stable keys are typed source identities (`job:<id>` / `receipt:<id>`); headings have stable section keys. Variable-height cards use initial/batch sizes of eight and a window size of five, with no fixed-height assumptions. There are no per-row reads, nested vertical lists or eager mounts of the complete archive. Existing bounded data pages remain the loading boundary; this is not a new financial query architecture.

The pushed `/work/history` route remains owned by WorkManagementScreen. Back uses existing router history, with `/work` replacement only when there is no prior route. The existing ContextMenuHost dismisses menus on scroll. The shared native screen safe-area owner retains all four edges, and the centered content remains bounded at 640 units. List-bottom padding supplements that owner; it does not create a second inset calculation or reproduce Finance tabs.

Client History remains the real client-filtered shared WorkSheet. Its fill-height body supplies the same SectionList as the sheet's sole scroll body. The scroll bridge combines list and existing sheet refs through FormScrollView and forwards sheet scroll events, retaining sheet reveal, safe-area and dismissal ownership. WorkView still owns opening Job Details, shared dialogs, receipt expansion, confirmation and mutation feedback. Native gestures, focus restoration and installed-platform behavior require device verification below.

## Responsive and accessibility record

Identity and money share a row when space permits. Below 390 units, at fontScale 1.3 or greater, or for unusually long formatted money, cards stack the amount below identity. Names are not truncated to force fixed card heights. Complete amounts, long unbroken names, long historical categories and allocation disclosures were checked at 320/390/430 browser widths in both themes. Enlarged text receives natural card height and wrapping, not smaller type or horizontal scrolling.

History and section titles expose header roles. Job bodies announce job/client identity, Archived client when applicable, earned/outstanding amounts, one Paid state, Work date and optional Expected date. Receipt bodies announce position within authoritative total, client, full amount, Received date, allocation count, saved category when present and Archived client when applicable; their accessibility state exposes expanded/collapsed. Receipt menus and Undo actions have separately scoped labels and outcomes. Shared controls retain their touch targets and disabled/focus semantics; job bodies retain the 48-unit shared minimum. Paid has text as well as restrained color, and errors/loading have textual or accessible feedback.

The independent review found two custom-label omissions: job Work date and archive context, and receipt Received date/allocation count/category/archive context. Both are **resolved**, including spoken-label regression assertions; the existing separate Expected date wording is retained. The final label-only correction does not alter visual layout, so the reviewer required no visual recapture. The reviewed PNG set is from after presentation cleanup and before that accessibility-label-only correction.

Reduced Motion uses the existing shared implementation; History introduces no new custom animation. Browser enlarged-text checks combine doubled CSS text/line-height and a simulated RN fontScale context. They are a layout proxy, **not OS Dynamic Type verification**. Browser DOM roles and source assertions do not certify VoiceOver/TalkBack announcements, focus restoration or native touch behavior.

## Scoped visual-system record

This is an ordinary **Warm Editorial Hearth** extension in Operate mode. The incumbent [Visual Groundwork](design-system-v2-visual-groundwork.md), [Stage 14D record](design-system-v2-stage-14d.md), actual shared tokens and existing Work v2 components are the visual-system authority, with the explicit History brief authorizing compact serif History/section headings for this surface. Card identity, metadata, amounts and controls remain practical Manrope. This local composition does not redefine other screens' heading rules.

| Observed role | Light | Dark |
| --- | --- | --- |
| Canvas | `#F5F0EA` | `#151315` |
| Group/card | `#FBF5F0` | `#242024` |
| Primary text | `#241E1C` | `#F6F0ED` |
| Secondary text | `#6A5E59` | `#C9BDB8` |
| Restrained boundary | `#E4DAD4` | `#3A3337` |
| Brand/status text | `#7B425E` | `#DFA6BF` |
| Soft icon tile | `#EBD8E1` | `#422E38` |

The compact History title reuses `editorTitle` (26/34), and section headings `editorSection` (20/28), with AxisLora-SemiBold and the shared system fallback. Card titles/money use Manrope SemiBold (16/24); metadata/client context uses Manrope Regular (14/20). Cards use the shared group radius (16), restrained one-unit border, 12-unit padding and eight-unit separation. Icon tiles are 40 by 44 with the shared control radius (10) and 24-unit glyphs. Depth comes from warm tonal surfaces and quiet borders rather than heavy shadows. No gradients, glass, decorative illustrations or client-specific icons are added.

The mockup's mint/rose accents remain provisional. This stage retains the incumbent warm cream/charcoal/plum roles and makes no global palette-unification decision.

**Preserve the fact being shown.** Settled job Earned, actual receipt total and each allocation are separate authoritative values.

**One archive, two collections.** Keep Jobs and Receipts in source order under distinct count-bearing headings within one scroll owner.

**Use a control only for a supported action.** Keep job navigation, receipt disclosure and confirmed Undo; do not create visual placeholder menus.

PRODUCT.md supplies native-use, exact-money, historical-identity and source-ownership constraints. Its SDK 57 statement is preexisting drift against package.json's SDK 58. Root DESIGN.md and `.impeccable` metadata are absent. This bounded documentation pass records the extension here without rewriting PRODUCT.md, the incumbent system, or creating global design metadata.

## Skill findings

- **frontend-design:** the archive hierarchy is compact History → Jobs → Receipts. Cards own identity, source money and related dates; generalist icons aid scanning, while editorial headings and practical monetary text establish hierarchy. The mockup's contradictory selector and unsupported controls are omitted.
- **Impeccable:** bounded source/rendered review checked card density, duplicate Paid states, whitespace, light/dark consistency, complete long amounts and genuine actions. The two accessible-label omissions above were corrected and marked resolved. The document workflow is scoped to this ordinary extension rather than a new global design-system extraction.
- **UI/UX Pro Max:** its destructive-confirmation guidance supports the existing explicit Undo confirmation, which states the money removed and affected work count before calling the authoritative service. Review also checked job-versus-receipt comprehension, text-based status, reachable controls, error recovery and clear independent empty sections.
- **Expo/native guidance:** package.json establishes SDK 58; matching Expo documentation and React Native SectionList guidance informed native ownership, stable keys, external row state, variable-height virtualization and safe-area review. The existing pushed route, AdaptiveSheet/FormScrollView and source refresh owners are retained. Exports are bundling checks, and cannot establish native scroll, gesture, focus or font fidelity.

## Browser evidence and review disposition

The [preview README](previews/work-history-v2/README.md) documents reproducible commands, fixtures, capture index and boundaries. `checks.json` records **48 scenarios and 84 original captures**. Eleven contact sheets bring the directory to 95 PNGs. Both themes include populated/empty/single-collection states, hourly/fixed work, archived client/category, shared and multiple receipts, no category, long names/categories, maximum BRL values, 320/390/430 widths, ordinary/doubled text, allocation disclosure, Job Details, receipt menu/confirmation, filtered History, loading, first-read and paging failure/recovery, and large-history paging/bottom clearance.

The 75-job/75-receipt fixture verifies bounded initial mounting (fewer than 40 rows), three Load more transitions and reachability of receipt 75 of 75 at the bottom. The review runner asserts no document horizontal overflow, no visible card-content overflow, no split numeric grouping fragment, no contradictory selector and no browser page errors. These are browser/layout checks rather than native performance measurements.

Fixtures are synthetic records created through the real SQLite Work service, then recorded as source snapshots/pages. The browser renders the actual WorkManagementScreen, WorkView, History cards/list and shared UI via React Native Web. It substitutes native font/image/router/safe-area/hook/Alert boundaries. Financial browser writes are disabled. Confirmation is captured but not executed there; source-backed SQLite integration tests exercise Undo. Every PNG embeds Origin provenance.

The independent reviewer inspected all 11 contact sheets covering the originals and inspected original captures, including constrained/enlarged layouts and actions. After the two accessible-label fixes were checked as resolved, its final disposition is **SHIP**, bounded to the inspected presentation source and browser evidence. The review does not claim native-device certification or independent target-image pixel comparison.

## Files and worktree protection

- `src/features/finance/work/components/work-history-cards.tsx`: scoped job/receipt cards and existing receipt disclosure/actions.
- `src/features/finance/work/components/work-history-list.tsx`: one paged SectionList, section counts/states and sheet scroll bridge.
- `src/features/finance/work/components/work-view.tsx`: retained History card rendering, shared state/actions and global/filtered integration.
- `src/features/finance/work/work-management-screen.tsx`: remove the competing History scroll wrapper while retaining route/header/safe-area/menu ownership.
- `tests/work-history-v2.test.ts`: 17 new mounted/source-backed History scenarios, including label, paging, financial linkage and reversal regression coverage.
- `scripts/preview-work-history-v2.ts`, `scripts/review-work-history-v2.cjs`: source-generated fixtures, actual-component browser review, captures and provenance.
- `docs/finance-work-history-v2.md`, `docs/previews/work-history-v2/`: audit, implementation record, capture manifest and review evidence.

These paths sit within an already dirty worktree containing earlier Work Main, editor, payment, Job Details and Clients v2 changes and unrelated existing test/source changes. Their presence in Git status is not evidence that History authored them. The existing WorkSheet scroll-body/fill-height API is reused without editing `work-forms.tsx`; that file, `work-clients.tsx` and `work-job-details.tsx` exactly match their pre-task snapshots after line-ending normalization. Existing work was preserved. No commit, reset, clean or push was performed.

## Physical testing still needed

No `adb`, Android emulator or `xcrun` is available here, and no native-device capture/certification was performed. Verify on installed iOS and Android: pushed History entry/Back/native gesture and focus return; client-filtered sheet drag/Back/dismissal and scroll ownership; VoiceOver/TalkBack headings, dates, categories, expansion and receipt-specific Undo; actual OS font scaling at normal/doubled settings; 320/390/430-equivalent viewports and complete large BRL values; bottom safe-area reachability; menu dismissal on scroll; long-list smoothness; and confirmed/cancelled/failed/stale Undo with live refresh. Native font metrics and shared safe-area behavior need physical evidence even when exports pass.

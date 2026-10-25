# Finance Commitments v2 — Main Management Screen

**Current refinement:** [Commitments v2.1 — Compact Two-Column Cards](#commitments-v21--compact-two-column-cards) supersedes the original card layout and its capture evidence below. The original v2 audit remains the behavioral baseline.

## Scope and authority

The main **Finance → Commitments** destination now extends Axis's incumbent **Warm Editorial Hearth** system in **Operate** mode: review obligations, open their details, pay or skip them, and reach existing management/history. The domain model, scheduling, historical generation, payment persistence and source-owned reversal remain authoritative. The large introductory hero and a redundant Commitments heading/subtitle are omitted.

This stage changes the main screen's composition, type iconography, accessible card summaries and list structure. Connected New/Edit, Payment, Resume, Details, History and Manage presentations retain their legacy visual treatment for dedicated later review. Their actions and history paging remain available. Manage/History landing rows now share the virtualized list structure without a visual redesign.

References remain [visual groundwork](design-system-v2-visual-groundwork.md), [Transactions v2.2](finance-transactions-v2.md), [Transaction Editor v2](finance-transaction-editor-v2.md), PRODUCT.md and `src/constants/design-system-v2.ts`. No new visual world, global design tokens or palette commitment is introduced. PRODUCT.md's older SDK57 reference and absent DESIGN.md are pre-existing documentation drift; this ordinary extension does not repair them or create global design files.

## Existing behavior audit

| # | Concern | Existing contract and preservation |
| --- | --- | --- |
| 1 | Main structure | Previous loose divider rows, a secondary Commitments heading and eager section maps become owned cards in a standalone SectionList; actual collections are unchanged |
| 2 | Add commitment | One existing creation action opens the same New commitment editor; now styled as the v2 primary button with a generic plus |
| 3 | Global options | The named Commitment options menu retains Manage commitments and History; it moves beside the creation control |
| 4 | Financial models | Bill, Subscription and Installment remain the only commitment kinds; all represent planned expenses, with money recorded only through payment |
| 5 | Parent lifecycle | Active, Paused, Ended and Completed remain distinct; nonactive parents are retained in management and historical projections |
| 6 | Occurrence state | Pending, Paid and Skipped remain the persisted outcomes; paid/skipped occurrences leave the main unresolved feed and remain in History |
| 7 | Derived Overdue | Pending plus due date earlier than today's local date produces Overdue; no new stored state or automatic skipping |
| 8 | Upcoming selection | Existing projection supplies at most one next pending future occurrence per active parent; newly generated previews retain the three-calendar-month horizon |
| 9 | Overdue section | Every projected pending past-due obligation stays first, including retained obligations from paused/ended parents; the section appears only when populated |
| 10 | Payment confirmation | Pay opens the same legacy confirmation, default expected amount and today payment date; editable actual amount and validation remain intact |
| 11 | Occurrence actions | Main pending cards expose Pay, confirmed Skip and View commitment; no empty menu or duplicate Pay item is added |
| 12 | Editing/management | Existing details and Manage lead to Edit and series actions; a card body opens details rather than directly editing |
| 13 | Lifecycle actions | Pause/Resume/End eligibility and installment completion remain service-owned, including pause restoration after reversal |
| 14 | Historical generation | Existing catch-up materializes all due obligations in bounded internal batches while preserving retained outcomes, dates and tombstones |
| 15 | History paging | Global History selects series with resolved records; existing details load paid/skipped history in twelve-month pages with stable merging |
| 16 | Ledger linkage | Confirmed payment creates a positive integer-centavo Expense linked by the occurrence's paidTransactionId; expected obligations alone are not actual expenses |
| 17 | Transactions reversal | Transactions v2.2 Delete payment and Commitments Undo share the existing atomic reversal helper; this stage adds no reversal implementation |
| 18 | Refresh/projections | Mutation, navigation/focus, app resume and local-date rollover retain source-owned reloads, prior usable snapshots and Retry on read failure |
| 19 | Scrolling | Main eager maps inside the Finance parent FlatList become one standalone virtualized SectionList; dialogs remain outside row rendering |
| 20 | Navigation/safe areas | Existing Finance destinations, keyboard/menu dismissal, view offsets, native tabs and SDK58 safe-area ownership remain; v2 selected/header styling now includes Commitments |

The previous screen's secondary heading, divider-only rows and eager rendering were presentation choices. The current card feed preserves its Overdue, Today and Upcoming projection instead of reducing the feature to the mockup's three example records.

## Hierarchy and incumbent-system comparison

The hierarchy is **Finance → destination navigation → Add commitment / global options → populated date/status sections → cards**. The approved Finance title and four destinations remain Overview, Transactions, Commitments and Work. Commitments now uses the existing v2 header/selected-navigation treatment; Work's appearance is unchanged. There is no blue testing gear, fabricated bottom navigation or additional hero.

Add commitment fills the available toolbar span beside the global menu. At widths below 390 with font scale at least 1.5, it occupies a full-width row and the options control moves onto its own right-aligned row. Button height follows its measured content, with no duplicate or floating create action.

| Incumbent design rule | Main Commitments application |
| --- | --- |
| Lora editorial hierarchy / Manrope practical content | Existing Finance screen title and editorSection section headings; card names, exact amounts, dates, metadata and controls remain Manrope |
| Warm cream / warm charcoal | Reuses existing canvas/group/text/border/brand/attention roles in both themes |
| Quiet owned surfaces | One compact group surface per obligation with a thin border, restrained icon tile and no added heavy shadow, gradient or artwork |
| Existing scale and shapes | 16-point group radius, 12-point card padding, 40-point rounded type tile, 8-point row/action gaps and 16-point page gutters |
| Accessible shared controls | Reuses UiPressable, FormButton, ContextMenu and shared minimum targets/Reduced Motion behavior |
| Scoped provisional color treatment | Current shared Finance/v2 tokens remain provisional; mockup plum/mint do not become permanent app-wide colors |

This is an ordinary extension of the established design system. The documentation handoff compares the implementation with the incumbent rules and records the specific changes and remaining evidence limits.

## Generic type iconography

`commitmentTypeIcon` accepts only the stored commitment kind. Titles, merchants, products, source categories and brand recognition do not participate.

| Kind | Shared generic icon |
| --- | --- |
| Bill | Receipt |
| Subscription | Repeat |
| Installment | Layers |

The shared UiIcon vocabulary receives one authored outline Layers primitive. There are no remote images, logos, generated illustrations or new icon dependencies. Rock in Rio Ticket and Computer both use Layers when Installments; Netflix and Spotify both use Repeat when Subscriptions; Internet and ChatGPT both use Receipt when Bills. Category remains metadata and uses the actual saved Expense category reference, including archived names.

## Commitment cards and financial metadata

Cards show the authoritative title and **expected occurrence amount**, complete localized BRL, occurrence due date, kind, actual category when available, installment sequence when applicable and nonactive parent text where relevant. No category is inferred from a title or replaced with a redundant placeholder. There is no title/amount line limit or fixed card height; values wrap and amounts can move below titles. Maximum safe-integer centavos display as the complete `R$ 90.071.992.547.409,91` in stress evidence.

Due dates remain local civil `YYYY-MM-DD` values, formatted through existing date helpers. They are independent of actual payment dates. `2 of 10` uses the occurrence's stored/projected installmentIndex and the parent's installmentCount; visible card counts never determine sequence. Bills/Subscriptions do not receive installment numbering.

Overdue has explicit text and the shared attention tone; ordinary due/future cards avoid redundant status pills. A paused or ended parent with an unresolved due occurrence still displays its parent status separately. Occurrence outcome and parent lifecycle are different facts.

## Overdue, Today and Upcoming

The unchanged `commitmentSections` helper groups all projected Pending occurrences due before/today into Overdue/Today, then includes the projected next Pending future occurrence for each Active parent. Empty sections are omitted. Within a section, order remains due date, title and stable parent ID.

An Active parent can contribute both a Today card and a future Upcoming card, as well as unresolved older obligations. Upcoming is not the complete future schedule. Newly generated previews extend through the end of the second subsequent calendar month; retained pending identities remain authoritative. The redesign does not expand that horizon, hide older outstanding duties or infer eligibility from the three records in the mockup.

Existing monthly scheduling preserves the intended billing day after short-month clamping. Catch-up uses twelve-month internal batches and keeps retained dates/outcomes, including identity tombstones. Reads and history generation are unchanged in this stage.

## Pay, contextual actions and body ownership

The main card's text body deliberately opens the genuine existing obligation-details flow with a selected occurrence. It does not open Edit or record a payment. Existing details reads can perform the established due-date catch-up. The body announces that payment requires confirmation. Pay and the sibling contextual menu own their actions separately.

Pay appears for projected Pending obligations. Paused/Ended parents' existing due obligations remain payable without reactivating those parents. Paid/Skipped outcomes have no active Pay in the main feed because they are resolved; they remain reachable through history. Completed installments normally have no remaining unresolved card; reversal can restore one through existing rules.

Pay opens **Pay commitment**, retaining the expected amount default, today's payment-date default, editable actual paid amount, the nonfuture date restriction, exact BRL parsing and existing save guard. The whole occurrence is resolved even when actual differs from expected. Cancel creates no ledger movement. Confirm atomically records the actual Expense, links the occurrence, marks it Paid and reconciles installment completion through the existing service.

Main overflow contains confirmed **Skip** and **View commitment**. Skip resolves only that occurrence; later scheduling remains unchanged. Pay is not duplicated there. View commitment opens the existing series details, whose separate menu retains Edit, eligible Pause/Resume/End, and History. The global Commitment options control remains clearly distinct from occurrence/series menus.

## Lifecycle and payment-reversal compatibility

Active, Paused, Ended and Completed remain service-owned. Pause materializes due obligations and closes future scheduling; existing unpaid obligations remain actionable. Resume uses the existing proposed date, preserves retained dates, skips paused months and creates a new schedule anchor under current rules. Keeping a clamped proposal retains the intended billing day; selecting another date follows existing anchor behavior. End remains available only for Active/Paused Bills or Subscriptions; installments use their existing completion rules.

Resolved installment outcomes, including Skipped, count toward completion. When a final installment is Paid/Skipped, the existing reconciliation can mark the plan Completed. Undo/reversal reopens the retained occurrence; completed plans restore Active if a schedule remains open or Paused when schedules remain closed, preserving previous pause intent.

The [Transactions v2.2 reversal contract](finance-transactions-v2.md#commitment-payment-deletion) remains unchanged: source ownership is validated, the linked Expense is soft-deleted, the occurrence returns to Pending with payment/resolution fields cleared, and completion reconciles in one immediate transaction. No reversal code is added to the main UI. Returning/refocusing Commitments reloads the source projection so the same parent-ID/due-date key reappears in the proper section. Calendar, Overview and Journal continue consuming their existing projections; unpaid expectations do not become actual expenses.

## Connected subflow audit and later visual work

| Connected surface | Preserved behavior | Visual status |
| --- | --- | --- |
| New/Edit Commitment | Existing type, title, amount, Expense category/inline creation, first date, installment count, validation and guarded Save; editing keeps kind/count/anchor restrictions | Legacy; dedicated v2 review pending |
| Payment confirmation | Existing context, actual amount, payment date, Confirm/Cancel and exact linked write | Legacy; dedicated review pending |
| Resume | Existing proposal/adjusted next date, minimum date, retained schedule rules and confirmation | Legacy; dedicated review pending |
| Commitment details | Existing selected obligation, pending actions, schedules, totals, series menu and navigation to history | Legacy; dedicated review pending |
| Manage commitments | All retained parents, lifecycle labels, series actions and Back | Legacy styling; landing collection now virtualized only |
| History landing/details | Series with resolved outcomes, Paid/Skipped records, expected/actual amounts, category/payment dates, Undo payment/Reopen and twelve-month earlier paging | Legacy styling; landing collection now virtualized only |

There is no new archive/delete lifecycle or payment-source destination. Existing Home/Calendar entry can focus a legitimate distant future obligation in details without changing the main Upcoming collection. History pages merge by occurrence identity in existing due-date order; refreshing details preserves the previously loaded span.

## Empty, loading and error states

No parents produces “No commitments yet” with one Add action. Existing parents with no unresolved preview produce “No obligations to resolve in this preview” and guidance to Manage. Empty Overdue/Today/Upcoming sections are omitted. Manage and History retain their distinct empty messages, and global access remains available for paused/ended/completed records.

Initial loading/read failures stay in the existing Finance shell with loading or Retry. Recoverable refresh failures retain prior usable data and mounted working dialogs. Action errors use existing messages, with v2 presentation only on the main screen. No fabricated commitment, decorative empty illustration or additional service is introduced.

## Scrolling, responsiveness and accessibility

Commitments owns one standalone SectionList, rather than an eager child inside Finance's vertical FlatList. Keys are `commitmentId:dueDate` for obligation rows and parent ID for Manage/History landing rows. Initial/batch counts are 6, window size is 5, clipping is disabled, section headers are nonsticky and bottom padding is 32 points. The list shares existing Finance scroll-offset/menu handling, preserves safe-area ownership and explicitly disables automatic content-inset adjustment. Dialog state remains outside virtualized rows so row unmounting does not own an editor/payment draft.

List virtualization bounds mounted presentation; the unchanged data reader still projects current parents, schedules, pending records, historical identity keys and paid aggregates in memory. No database pagination, generation shortcut or data window is added. The 100-series browser case initially mounts 16 cards and reaches Series 099 after actual scrolling, with 32 points of bottom clearance in that browser viewport. Native tab clearance and device performance remain physical test gates.

At font scale 1.5 and above, card icon/content stack. Long titles, complete monetary strings, category names, dates and actions wrap naturally. The narrow enlarged toolbar uses explicit natural sizing so Add commitment and global options retain separate nonoverlapping targets. Neither text nor amounts are shrunk to force a fixed row.

The body label includes title, expected amount, occurrence status, localized due date, installment sequence when present, kind, category when present and nonactive parent state. Its hint identifies details and payment confirmation. Pay, Skip, occurrence menus and global options have subject-specific labels. Type tiles are decorative; status remains understandable in text. Existing shared minimum touch targets and Reduced Motion handling remain in use.

## Skills and review findings

- **frontend-design:** Applied the corrected composition with no redundant hero, a compact action toolbar, practical card typography and an orderly Overdue/Today/Upcoming hierarchy related to the approved Finance surfaces.
- **Impeccable:** Initial independent review opened all 42 screenshots and found two material issues: missing kind/category/nonactive-parent information in the body accessibility label, and Add commitment breaking poorly at 320/doubled text. The label was completed. The final toolbar uses explicit flex grow/shrink/basis values and a naturally sized stacked layout; an intermediate zero-flex layout had collapsed its height and was corrected before final capture. All 42 captures were regenerated, with hit-box checks across the 36 scenes. Reviewer follow-up confirmed both findings resolved and returned **SHIP**; its follow-up scope was those fixes. This documentation handoff records the incumbent-system comparison and evidence limits. The HTML/CSS detector does not apply to the native React Native target.
- **UI/UX Pro Max:** Verified local Touch Target Size and Touch Spacing guidance (44-point iOS / 48-dp Android baseline, 8-unit separation) informed reuse of shared targets and spacing for Pay/options without crowding.
- **Expo Skills:** Consulted SDK58 native documentation and used SectionList with stable identities, externally owned dialog state and existing navigation/inset ownership. Existing payment/date/sheet flows remain authoritative; browser captures do not certify native gestures, focus or safe areas.

The implementation agent compared the supplied image directly. Original image pixels had no filesystem path for the independent reviewer, whose evidence was the written brief/composition, source and RN Web captures. Its verdict does not establish a direct pixel comparison or native certification.

## Evidence and validation

[Capture index](previews/finance-commitments-v2/README.md) records 36 scenes plus 6 enlarged full-card captures, 38 checks and zero recorded failures. Real SQLite-created fixtures provide actual projections; runtime lifecycle/native boundaries are substituted. Final captures include the resolved toolbar, accessible source changes and current hit-box checks. No UI change is pending after capture.

Final focused coverage passed **288 tests**, zero failures (47.8 seconds); the final full suite passed **1,274 tests**, zero failures (199.9 seconds; 1,262 top-level TAP items), recorded in `dist/finance-commitments-v2/full-suite-reviewed.log`. Eight new main-screen cases cover composition/virtualization, type-only icons and archived metadata, deliberate details/confirmed Pay, projection and parent states, completion/history, reversal refresh, long exact values and empty states.

One Calendar shallow-render assertion previously assumed eager Pay rows; it now asserts normal Upcoming data in SectionList separately from the selected distant future Pay action in details. The actual source-navigation/projection flow is unchanged. Existing Finance ledger, scheduling/payment/reversal, Calendar, Overview and Journal coverage remains intact.

TypeScript `--noEmit` passed. ESLint retains six existing errors and two existing warnings, with zero added or removed diagnostics against the Categories baseline. Both final iOS and Android SDK58 production JavaScript exports exited successfully. `git diff --check` passed after documentation edits. The capture index records final log paths and the current reviewer/capture evidence.

## Files modified in this stage

| Area | Files |
| --- | --- |
| Shared icon vocabulary | `src/components/ui-icon.tsx` (one Layers outline primitive) |
| Finance integration | `src/features/finance/finance-screen.tsx` |
| Main commitment feed | `src/features/finance/commitments/components/commitments-view.tsx`; new `commitment-card.tsx`; new `src/features/finance/commitments/type-icons.ts` |
| Regression coverage | `tests/commitments-experience.test.ts`; `tests/calendar-components.test.ts`; new `tests/commitments-v2.test.ts` |
| Review scripts | `scripts/preview-finance-commitments.ts`; `scripts/review-finance-commitments.cjs` |
| Documentation/evidence | This document; `docs/previews/finance-commitments-v2/README.md`, 42 PNGs and `checks.json` |

`commitments/data.ts` contains earlier Transactions v2.2 worktree changes and was not changed by this stage. Current data/presentation/scheduling/type services, connected form implementations, schema/migrations, dependencies and BRL rules are preserved. The existing worktree remains on `main`, HEAD `5ddb625a`, with nothing staged, committed or pushed by this stage.

## Physical testing still needed

On iOS and Android: actual Dynamic Type/native font measurement at 320/390/430-equivalent widths; maximum BRL/long names and categories; Add/global-options target separation; deliberate body/details versus Pay actions; menu focus and scrolling; VoiceOver/TalkBack complete body metadata and labels; existing payment/skip/lifecycle confirmation; distant Calendar detail navigation; reversal/refocus; connected picker/keyboard/dismissal behavior; long-list performance; final-card/native-tab and safe-area clearance. Browser 32-point padding and JavaScript exports do not prove installed-device behavior.

## Commitments v2.1 — Compact Two-Column Cards

### Problem and structural correction

The original v2 component rendered its action row after the whole identity/metadata row. Each card therefore paid the vertical cost of both regions. Reducing padding would not remove that structural overhead.

The current shared card has one wrapping horizontal content region:

```text
Content row
├── Information region: type tile + details press target
│   └── Title / due and installment / type and category / parent status
└── Trailing region
    ├── Complete expected BRL amount, aligned right
    └── Pay + contextual menu
```

At ordinary 390/430-point widths, the trailing amount and controls share the information region's vertical space. The card has no fixed height, minimum card height, absolute controls, space-between spacer or reserved bottom action row. The existing surface, typography, tile, provisional colors and 12-point padding remain. Metadata and column/action gaps remain 4 and 8 points. Pay uses the existing compact shared button treatment while retaining its minimum target.

### Responsive rules

Yoga lays out the information region with a 188-point flex basis: a 40-point type tile, 8-point separation and room for readable details. It grows into the available space; the trailing region uses the measured intrinsic amount/control width, bounded by the card. `flexWrap` moves that region below only when the two regions cannot fit. There is no fixed monetary width or ellipsis.

At 320 points the ordinary sample needs that fallback; forcing two columns would leave an unacceptably narrow information region. At font scale 1.5 or greater, the two regions explicitly stack with natural heights and full available width. Exceptionally large valid amounts also wrap the trailing region to its own line. Pay and overflow stay side by side. Full maximum values remain available even when they wrap over multiple text lines. This relies on normal native flex measurement, not hidden measurement copies or a new screen-level listener.

### Equivalent-content density measurements

Measured with the same real components, fonts, pt-BR locale, timezone, fixtures, viewport and 1× text in RN Web before and after the change. Both themes produced identical representative heights. These are browser measurements, not physical-iPhone measurements.

| Width | Card | Original | Refined | Change |
| --- | --- | ---: | ---: | ---: |
| 390 | Installment | 154 | 138 | 16 shorter (10.4%) |
| 390 | Subscription | 154 | 106 | 48 shorter (31.2%) |
| 390 | Bill | 154 | 106 | 48 shorter (31.2%) |
| 430 | All three | 154 | 106 | 48 shorter (31.2%) |
| 320 | Installment | 178 | 186 | 8 taller; readable fallback |
| 320 | Subscription/Bill | 154 | 186 | 32 taller; readable fallback |

The normal 390-point three-card content totals 350 points instead of 462, excluding unchanged inter-card spacing. The new cards therefore become shorter at the requested typical phone size; improvement is not claimed at every width or accessibility setting. See the [v2.1 capture index and measurements](previews/finance-commitments-v21/README.md).

### Interaction, accessibility and preserved behavior

Details and trailing controls are sibling regions; Pay/overflow are never children of the details press target. Real browser clicks separately exercised Details, Pay and the contextual menu without opening another action. The existing details summary still announces the exact amount, title, due date, occurrence state, kind, category and relevant parent state. The now-separate visual amount is excluded from a duplicate screen-reader announcement. Type tiles remain decorative.

Pay still opens confirmation; eligibility and Skip/View commitment are unchanged. The shared action targets remain at least 48×48 with an 8-point gap. All three kinds and Overdue/Today/Upcoming use this same card. No domain, scheduling, lifecycle, payment/reversal, schema, migration, dependency, navigation, SectionList, editor or empty-state implementation changes were made for v2.1.

### Skills and visual review

- **frontend-design:** Grouped amount with the action it informs and placed that group beside identity/metadata, retaining the existing visual hierarchy and palette.
- **Impeccable:** Identified the separate action row as structural waste; checked equivalent-content heights rather than claiming density from padding changes. An independent layout assessment reviewed reading order, grouping, rhythm, structure, density, adaptation and extremes, finding no material issue and returning **ship** within RN Web/source scope.
- **UI/UX Pro Max:** Touch-spacing and gesture-conflict guidance informed sibling press regions, retained native minimum targets and an 8-point action gap.
- **Expo Skills:** Consulted [SDK58 documentation](https://docs.expo.dev/versions/v58.0.0/) and [React Native flex layout documentation](https://reactnative.dev/docs/layout-props). Used intrinsic wrapping and variable-height rows without changing list virtualization or native inset ownership. Browser evidence does not certify native Yoga/font metrics or touch dispatch.

The v2.1 matrix has 6 baseline scenes, 28 refined scenes and 6 enlarged full-card captures: **40 PNGs**. It covers both themes, 320/390/430, all types, Overdue/Today/Upcoming, long text/category, maximum amount, doubled text, and actual Details/Pay/menu paths. Geometry checks found no card glyph overflow, page horizontal overflow, undersized or overlapping press targets. The implementation and independent reviewer inspected representative captures. The user-provided physical screenshot establishes the layout problem; numerical reductions come from equivalent browser renders, not estimated screenshot pixels.

### Validation and changed files

Final validation: **290 focused tests passed; all 1,276 tests passed; TypeScript passed; iOS and Android exports passed; `git diff --check` passed**. ESLint remains at six existing errors and two warnings with zero added/removed diagnostics. Logs and evidence are recorded in the [v2.1 capture index](previews/finance-commitments-v21/README.md). This refinement changes only `commitment-card.tsx`, `tests/commitments-v2.test.ts`, `tests/commitments-experience.test.ts`, the preview builder (configurable output and long-text fixture), the new `scripts/review-finance-commitments-v21.cjs`, this document and the new v2.1 evidence directory. Earlier uncommitted work remains intact.

Remaining physical testing: actual iPhone/Android before/after card heights at native font settings; narrow/landscape and enlarged-text layout; VoiceOver/TalkBack summary and focus order; Pay/details/overflow touch separation during scrolling; native menu/sheet return; maximum money/category containment; variable-height list performance and native tab/safe-area clearance. No commit or push.

# Finance Work v2 — Main Screen

This pass extends Axis's existing Warm Editorial Hearth system for the main Finance → Work destination. The supplied target guides composition; the explicit brief removes its redundant Work heading. Editors, client management, receipt History and Job details keep their existing presentation and behavior. Colors remain provisional.

## Existing Work behavior audit (before implementation)

The initial worktree was clean at `034215ca02a729a217985617710eeeabe500f23e`. Source snapshots and baseline evidence are retained under ignored `dist/work-v2/`.

1. Finance renders WorkView inside an empty FlatList's header; WorkView eagerly maps its collections. This must become one bounded virtualized main list without nested vertical scrolling.
2. Work is organized as client-owned work entries and receipts allocating money to those entries. It is not a Commitment occurrence model.
3. Each entry has a real client ID, independent job title/description, compensation fields, work date and optional expected-payment date.
4. Active clients are selectable/creatable in the existing autocomplete; archived clients retain historical names and outstanding balances but cannot receive new work.
5. `jobTitle()` prefers a trimmed saved title, then legacy description, then “Untitled job.” Main rows show client, optional description preview, actual work date and derived balance status. There is no main-row work-category field: receipt categories belong to actual Finance Income.
6. Existing WorkEditor handles New/Edit, required title/client, Hourly/Fixed compensation and local dates; this pass does not redesign it.
7. Earned is validated Fixed compensation or integer/BigInt hourly duration × rate with centavo rounding; it is not cash received.
8. Received comes from authoritative, nondeleted allocations reconciled to actual linked Income transactions.
9. Outstanding is the source's earned-minus-allocated balance. `readOverview()` supplies BigInt lifetime totals, including settled work, independently of the selected Overview period.
10. Partial payments are supported, including one client's receipt allocated across multiple entries. A partially paid record remains open for its exact remaining balance.
11. `recordPayment()` validates allocations/client/category/date and atomically creates one Income ledger transaction plus its allocation links; adding Work or reaching an expected date creates no Income.
12. Duplicate allocations, over-allocation, cross-client receipts and broken reconciliation are rejected. Editing cannot reduce Earned below Received or change a paid entry's client. Deletion requires no active allocations; Undo atomically soft-deletes all allocations in the receipt and its Income transaction. Existing linked-transaction restrictions remain authoritative.
13. Expected-payment dates are optional local `YYYY-MM-DD` values and remain separate from work and receipt dates.
14. Work date represents the actual saved work date, not a receipt or expected-payment date.
15. Overdue means positive Outstanding and a non-null expected date strictly before source-local today. Expected today, missing dates and fully received entries are not overdue.
16. `groupWorkItems()` selects overdue positive balances for Needs attention and orders them by expected date ascending. Equal-date order remains the stable input order. Other open Jobs preserve source order: work date descending, then ID ascending.
17. Jobs remains below attention, with its existing “All open jobs need attention above” and “Nothing outstanding…” guidance. Settled jobs/receipts stay in History rather than being reintroduced into the main collection.
18. Work statuses are unpaid, partial and paid, with derived Overdue presentation. No new lifecycle or completion state is invented.
19. The global Work options menu pushes Clients and History. It is distinct from Job/receipt/client contextual actions.
20. Add work opens the existing New Work modal. It remains primary when no outstanding balance exists.
21. Record payment appears only with a positive aggregate balance and opens the existing source-owned allocation/payment editor.
22. Main rows genuinely open Job details by saved entry ID, making a navigation chevron appropriate. Initial source entry targeting also opens the existing details.
23. Job details retain Record payment, Edit, Client details and conditional confirmed Delete; receipt menus retain confirmed Undo; client contexts retain History and conditional Archive. No such actions are added to main cards.
24. Calendar reads outstanding Work by expected-payment range, retains source-local dates/statuses and navigates back to Work's existing source-owned details.
25. Overview reads actual ledger transactions by its period. Earned/Outstanding do not become Finance Income until an actual receipt is recorded.
26. Journal's actual-income context reads actual Finance transactions; expected Work income is not included as cash.
27. Main Work has no search/filter/period selector. Existing Clients search/creation/archive and paged Work History remain available through their current routes and contexts.
28. `mutate()` performs the existing write, then reloads Finance. Focus/foreground/local-day refresh and snapshot retention on failed reads remain intact; detail/context readers preserve mounted drafts and receipt state.
29. The main source uses aggregate/batched reads and returns all open debt without age truncation. Moving rendering into a SectionList must not add per-card reads, compute money per row, alter queries or confuse independent History paging with main-list virtualization.
30. Finance's experimental react-native-screens SafeAreaView owns all edges under the native Finance tab with automatic content insets disabled. Main scrolling keeps `contentInsetAdjustmentBehavior="never"`, the existing owner scroll callbacks/offset and bottom breathing room. Native tab chrome is not duplicated.

## Direction and scope

This is an ordinary extension of **Warm Editorial Hearth**, in Impeccable **Operate** mode. The supplied mockup pins main-screen composition; current source owns behavior and the latest explicit brief removes the mockup's redundant Work heading. Existing v2 tokens and shared controls own visual implementation. The mockup's green action color remains provisional and does not authorize a global palette change.

Only Finance → Work's main destination is redesigned. No schema, migration, dependency, query, money, schedule, payment, ledger or persistence logic changes. Work creation/editing, Payment editor, Job details, Clients and receipt History remain connected legacy surfaces awaiting their own v2 passes. Global `PRODUCT.md`, the missing root `DESIGN.md` and the pre-existing SDK57 wording in PRODUCT are deliberately outside this record's scope; current implementation/export checks target SDK58.

## Previous screen and new structure

Previously, Finance mounted an empty FlatList with all of WorkView in its header. WorkView eagerly mapped main Work rows and placed a separate Work heading/options toolbar above its metrics. The main visual surface used legacy rows and controls.

The new main destination opts into Finance's existing shared v2 shell. Finance title, the Overview / Transactions / Commitments / Work navigation and native tab ownership remain in place. Work no longer adds a second screen title. A single SectionList contains:

1. A financial-summary header, source error feedback and existing introductory empty guidance.
2. Needs attention, only when real overdue positive balances exist.
3. Jobs, with the existing remaining open jobs and source-appropriate empty guidance.

The options trigger is at the upper right of the summary. It is still named **Work options**, and its **Clients** and **History** actions push the existing `/work/clients` and `/work/history` routes. It has not become a decorative ellipsis or a per-job menu.

## Financial summary and actions

`WorkFinancialSummary` reads `WorkOverview.totals` directly. Outstanding is the dominant metric (shared 30/38 metric role); Earned and Received use the secondary 16/24 card-title role. All display values pass through the existing BRL formatter. Totals are BigInt source values, with no addition/subtraction of formatted strings and no per-card aggregate recomputation.

| Metric | Meaning and authority |
| --- | --- |
| Outstanding | Earned less reconciled received allocations, using source totals; the main amount owed now. |
| Earned | Validated Fixed compensation or source-calculated Hourly compensation, including legitimate zero-rounded hourly work. It does not imply cash receipt. |
| Received | Authoritative active allocations reconciled to linked actual Income transactions. Partial receipts contribute only their actual allocated amount. |

The summary remains **all work / lifetime**, including settled work, independently of Finance Overview's selected period. Its explanation says: “All work, independent of the Overview period. Earned becomes Finance Income only when received.” More precisely, actual `recordPayment()` validation and allocation create the linked ledger Income; saving a job or passing its expected date never creates Income.

**Add work** opens the existing New Work editor. With positive aggregate Outstanding, it uses the shared secondary appearance while **Record payment** is the primary action and opens the existing allocation/payment editor. At zero Outstanding, Record payment is absent and Add work becomes primary. These controls reuse existing `FormButton appearance="v2"` behavior, focus treatment, touch targets and live Reduced Motion support.

The summary uses its measured `onLayout` width and the existing `stackFinanceMetrics()` helper for Earned/Received layout. Outstanding stacks when available width is below 300, font scale is at least 1.4 or the formatted amount is longer than 17 characters. In stacked mode its money has the full available width and the options trigger floats out of the metric flow. The decorative primary icon disappears at font scale ≥1.4 to protect the Outstanding label. Secondary icons stay alongside their labels above full-width money when stacked. Stacked secondary metrics use automatic flex basis and do not shrink, allowing actual label/value height to determine their space. Actions wrap naturally and stack at enlarged font scale. Normal 390-point summaries keep Earned and Received alongside each other when their actual values fit.

## Attention, cards and remaining sections

`groupWorkItems()` remains authoritative. Needs attention requires positive Outstanding and the source's Overdue flag: a saved expected-payment local date strictly earlier than source-local today. Expected today, no expected date and fully received work do not qualify. Attention sorts by expected date ascending with stable equal-date input order. Other open Jobs keep the existing work-date-descending / ID-ascending source order. Archived-client debt stays actionable. Settled work stays in History.

Each new main card is one `UiPressable`, with a generic Briefcase icon, a saved-title/legacy-description/Untitled fallback, the complete client name, actual Work date, optional Expected date and exact Outstanding. Icons do not derive from job titles, merchants or client names. The card's trailing chevron corresponds to its real Job-details destination, opened through the existing source-owned callback and entry ID.

Title and client text have no line cap. A nonempty description distinct from the displayed title retains its existing two-line preview; full description remains in Job details. Partial work shows “Received R$… of R$…” as context. Explicit **Overdue**, **Partially paid** or **Outstanding** wording communicates state without relying on color. An overdue partially received job shows Overdue plus the received/earned context. Work and expected dates retain distinct labels and use the existing locale-aware `dateLabel()` utility.

Outstanding is right-aligned. It moves below identity at widths below 360, enlarged font scale, long money, long titles or long client names. The lower balance area also remains right-aligned. Cards use natural height, owned group surfaces, 12-unit padding, 8-unit separation and the incumbent 16-unit group radius. The unchanged legacy `WorkRow` continues to serve connected contexts.

Jobs remains visible after attention. If every open job is overdue, it retains “All open jobs need attention above.” If all existing work is settled, it retains the History guidance. A new empty collection retains the Hourly/Fixed and recording-payments explanation; the zero summary and Add action remain available. No main search, filters, period control, pagination control, work category or invented lifecycle is added. Existing Clients search and genuine History paging remain available in their owning destinations.

## Connected flows and financial integration

| Flow | Preserved owner / behavior |
| --- | --- |
| Add / Edit Work | Existing WorkEditor; required title/client, Hourly/Fixed compensation, local dates and source validation. |
| Record payment | Existing PaymentEditor and source allocation rules, including partial/multiple-entry receipts and the exact remaining balance. |
| Job details | Existing selected-entry reader and sheet; Record payment, Edit, Client details and conditional confirmed Delete remain there. |
| Clients | Existing client search/creation, active-client eligibility, client details, History and conditional Archive. |
| Receipt History | Existing paging, receipt contexts, confirmed Undo and linked Income reversal/restrictions. |
| Finance Overview / Transactions | Existing actual ledger and period reads; no expected Work income enters actual totals. |
| Calendar | Existing expected-payment projections, local dates/status and source-owned Work-details navigation. |
| Journal | Existing actual Finance Income context, excluding expected Work income. |

WorkView still owns writes through `mutate()` and Finance reload. Its detail/context reads preserve asynchronous handling, errors, mounted forms and payment/receipt state. Finance loading, failed-read snapshot retention and Retry remain owned by Finance. Initial targeted entry navigation and scroll-offset restoration remain connected. Main cards introduce no row-level reads or N+1 queries.

## Scrolling, responsive behavior and accessibility

The SectionList genuinely virtualizes the main body. It uses saved entry IDs, `initialNumToRender={6}`, `maxToRenderPerBatch={6}` and `windowSize={5}`. Headers are nonsticky; variable-height rows have no fixed height or `getItemLayout`. The summary scrolls with the list. No nested main vertical scroller, source age cutoff or data truncation is introduced. Source collection loading remains unchanged; virtualization is separate from History paging.

The list retains Finance's scroll callback and content-offset owner. Content is centered with a 640-unit maximum, 16-unit horizontal padding, 8-unit top padding and 32-unit bottom breathing room. Finance's experimental native SafeAreaView remains the all-edge owner; NativeTabs `disableAutomaticContentInsets` and list `contentInsetAdjustmentBehavior="never"` avoid duplicate inset ownership. No native tab implementation or other Finance destination styling is changed.

Metrics are accessible informational groups. Cards have button roles, a single focus/action surface, a Job-details/payments hint and labels carrying title, client, Earned, Outstanding, status, expected date when present, Work date and Received. Text states supplement attention color. Shared controls retain the 48-unit target convention and inherited focus/motion behavior. Natural wrapping, dynamic row heights and enlarged-text layout branches support long content. Browser checks support these claims within their measured environment; VoiceOver/TalkBack, native focus, actual Dynamic Type and gesture behavior still require devices.

## Light/dark appearance and token authority

The main surface reuses `DesignColors`, `DesignTypography`, `Shape` and shared v2 controls rather than defining a competing system. Warm canvas/group layers, restrained borders and the incumbent Manrope interface type keep the screen in Warm Editorial Hearth. The summary and cards use the group surface, primary/secondary text and border roles. Attention uses the existing amber role with explicit text. Generic Work and secondary metric tiles retain the existing semantic green accent/muted pair provisionally. Primary actions retain the existing v2 brand colors; this pass does not settle an Axis-wide palette.

The incumbent typography distinguishes the summary metric from smaller financial context and card identity. Borders and tonal surfaces provide ownership without a new shadow vocabulary. Light and dark modes use their actual shared token sets. No raster artwork, merchant/logo imagery or content-derived icon system was added.

## Skills findings and documentation handoff

| Skill / review lens | Material application |
| --- | --- |
| frontend-design | Financial hierarchy leads with Outstanding; the summary groups actual Earned/Received context and distinct actions. Compact card identity precedes dates/status, with generalist icons and a real destination chevron. |
| Impeccable | The supplied composition is pinned within the incumbent world. Removed the redundant Work title, retained legitimate options, bounded the main-screen scope and documented actual components/tokens without creating or refreshing global DESIGN/PRODUCT. First browser review led to full-width stacked amounts, options removed from metric flow and reduced decorative icon pressure at large text. |
| UI/UX Pro Max | Actual versus expected money stays explicit; Add and receipt recording remain separate; overdue/partial text complements color; measured bounds, target checks and contrast review support the responsive/accessibility assessment. Exact contrast findings belong to the final review evidence rather than an assumed certification. |
| Expo SDK58 / native guidance | Used SectionList for the virtualized variable-height body, stable saved IDs and bounded initial batches. Preserved source navigation, safe-area/native-tab inset ownership and scroll restoration. Browser/native evidence is separated explicitly. |

Official platform references used by the implementation review: [Expo SDK58](https://docs.expo.dev/versions/v58.0.0/), [React Native SectionList](https://reactnative.dev/docs/sectionlist) and [Expo native tabs](https://docs.expo.dev/router/advanced/native-tabs/).

## Evidence and validation ledger

Evidence files are ignored under `dist/work-v2/`; checked-in browser images and their provenance are indexed in [the preview README](previews/work-main-v2/README.md). Validation is recorded from completed runs, not inferred from an empty log or a command still running.

| Check | Recorded result |
| --- | --- |
| Pre-edit full suite | **1,341 tests: 1,340 passed, 1 failed.** Existing `TaskDisclosureMotion` Upcoming rapid-toggle timing failure at line 135; `baseline-full-suite.log`. This corrects the brief's unverified “1,341 passing” baseline. |
| Unchanged timing-test rechecks | **10/10 passed before and after implementation**, `baseline-task-motion-recheck.log` and `final-task-motion-recheck.log`; these isolated passes do not erase either full-suite failure. |
| ESLint baseline comparison | **6 errors / 2 warnings before and after; 0 added / 0 removed**, `eslint-baseline.json`, `eslint-final.json` and `eslint-comparison.json`. Changed-file ESLint completed with **exit 0**, `eslint-changed-final.json` and `static-final-results.txt`. |
| Initial focused Work coverage | **30/30 passed**: existing 22 plus 8 new main-screen cases; `initial-focused.log`. |
| Broad regression run | 533-test run exposed one obsolete Calendar shallow-render toolbar-count assertion because main rows are now inside WorkMainList. The test was updated to preserve the real detail button and source-owned callback assertion. |
| Calendar follow-up | **17/17 passed**, `calendar-recheck.log`; no Calendar production behavior changed. |
| Final focused regressions | **533/533 passed**, `focused-regressions-final.log`, covering Work/client/payment, ledger/Overview, Calendar, Journal and relevant Transactions regressions. |
| Final full suite | **1,349 tests: 1,348 passed, 1 failed**, `final-full-suite.log`. The sole failure matches baseline: `tests/task-disclosure-motion.test.ts:135`, Upcoming rapid-toggle expects `entering` but receives `undefined`. Eight new main-screen cases pass; the full suite is not green. |
| First browser matrix | **30 scenes; 74 original PNGs plus 10 contact sheets; zero failures recorded by the checks then implemented.** Root reviewer opened all 10 galleries and four originals. Later visual review exposed a vertical defect that these checks did not measure; this run does not certify the final source. |
| TypeScript | **Passed, exit 0**, `static-final-results.txt`; the empty `typescript-final.log` is not used alone as proof. |
| iOS / Android exports | **Completed**, `ios-export-final.log` ends `Exported: dist/work-v2/ios`; `android-export-final.log` ends `Exported: dist/work-v2/android`. These are JavaScript exports, not native device captures or approval. |
| Final diff check | **Passed, exit 0**, `diff-check-final.txt`; the parent's trailing-whitespace check of new text files also found no issues. |
| Intermediate browser matrix | **30 scenes; 74 original PNGs plus 10 contact sheets; zero horizontal overflow/browser failures.** Root visual review then found vertically overlapping stacked secondary metrics: `flexGrow: 0` retained a zero flex basis. The source now gives these metrics automatic flex basis and no shrink. This supersedes the intermediate matrix's apparent clean result. |
| Corrected final browser matrix | **30 scenes; zero recorded failures; matrix and contact generation exit 0**, `browser-final.log`, `browser-final-result.txt` and complete `checks.json`. All **74 originals and ten galleries** were replaced in this generation; root opened all ten current galleries. Every scene has empty glyph/page overflow, `metricOverflow` and browser-error arrays, with `metricOverlap` and horizontal overflow false. Both 140-record collection scenes initially mount **11 cards**. These are supporting RN Web results only. |
| Independent finish review | **Final disposition: `recapture`, solely for missing native iOS/Android evidence**, `finish-review-final.md`. The fresh reviewer opened all ten galleries and confirmed the full `no-attention-390-light.png` and original-resolution `contact-5.png` are intact; the prior malformed-image allegation is not retained. No browser recapture or source redesign is requested. Impeccable's native capture gate prevents fidelity/craft/ship verdicts until actual native evidence is supplied. |

The new tests and revised experience assertions cover the actual main-list boundary, actions, authoritative totals, long/dynamic rows, dates/status, generic icons and source-owned navigation. Existing real-SQLite integration coverage remains the evidence for creation, payment allocation, partial reconciliation, linked Income, reversal restrictions and Calendar/Journal integrations. Browser interaction captures open existing forms/details; they do not commit payments or prove source writes.

## Physical testing and remaining limits

No usable adb/emulator, xcrun or default SDK executable was available in this Windows environment. Browser capture is therefore supporting RN Web evidence, not native evidence. The 70-pixel reserved lower boundary in the preview is a measurement aid and is **not** a rendered native tab bar. Native modules, safe-area hooks, font-loading boundary, focus/motion and platform date picker are substituted; doubled DOM text plus `fontScale=2` approximates enlarged text.

The final independent Impeccable review requires actual captures for every shipped iOS/Android device class before its remaining verdicts can run: the real Finance shell, native tabs and insets; light/dark and 320/390/430-equivalent coverage; actual enlarged OS text with long identities and large exact BRL values; and the scrolled final row with native-tab clearance. Capture provenance must identify simulator/emulator versus hardware and device/text-size settings. This evidence is missing, so `recapture` remains the final review status and no native fidelity or ship approval is issued.

Still test on iOS and Android: native safe-area/tab clearance and scroll restoration; actual 2× text at 320/390/430-equivalent widths; long/unbroken identity and large BRL values; VoiceOver/TalkBack metric/card announcements; focus and Back behavior after menus/editors/details; keyboard and local-date pickers; live Reduced Motion; successful payment/edit/Undo refresh; and long-collection gesture performance. Static captures, component tests and JavaScript exports cannot establish those device behaviors.

## Files and Git protection

Production scope: `work-main.tsx`, WorkView integration and FinanceScreen's Work-only shared-v2-shell/scroll boundary. Supporting scope: focused Work/experience tests, the necessary Calendar assertion correction, preview generation/review scripts, this record and preview artifacts/README. Source helpers, data access, money, schemas and connected editor/detail/history presentation remain unchanged.

The initial tree was clean at the recorded HEAD. Final status is recorded in `dist/work-v2/git-status-final.txt`: the scoped production/test modifications and new main component, tests, preview scripts and documentation remain available for review. `git diff --check` completed with exit 0. No commit or push is authorized or performed.

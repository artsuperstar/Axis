# Stage 13F: Work experience

## Jobs workspace

The hierarchy is Jobs → financial status → Clients. Outstanding remains the primary metric, with Earned and Received secondary. Exact source-owned BigInt totals cover current Work independently of the Overview period; zero metrics remain visible. The shared Finance comparison helper stacks secondary amounts for narrow layouts, large text or long monetary values.

Needs attention contains every overdue open job, without an age cutoff. Jobs contains every other open job, including undated or future expected payments. These are disjoint sections: each actionable job appears once. When all open jobs are overdue, Jobs explains that they are listed above. Settled jobs stay in bounded History. There is no aggregated Clients section on the main screen.

Job rows lead with Title, then Client, a two-line Description preview, outstanding/Paid amount, work date and expected date/status. Partial rows explain remaining outstanding of total Earned and amount Received. Titles and money wrap without ellipsis; only supporting descriptions have a preview limit. Job detail shows the complete description and historical pricing.

Add work remains the consistent action wording. Record payment is primary while money is owed; otherwise Add work is primary. Clients and History remain in the anchored Work options menu, which closes before pushing /work/clients or /work/history. These are root-stack card routes, like Tasks management destinations; no Finance primary destination or bottom tab is added.

## Job Title and legacy compatibility

Migration 0009 adds only nullable work_entries.title. It does not rebuild tables, modify historical migration SQL, backfill or rewrite descriptions, payment references, Client identities or compensation. Existing rows retain NULL Title. The shared jobTitle helper uses an explicit trimmed Title, otherwise the trimmed existing Description, with a defensive Untitled job fallback for externally invalid records. No description content is truncated or rewritten by the migration.

New jobs require a nonblank Job title at the domain boundary. Editors also require Title on save. Legacy editors prefill Title from the same deterministic fallback and retain Description independently; replacing Title establishes an explicit title. Description is optional. Normal saves retain the established outer-whitespace trimming, with blank or whitespace-only input stored as an empty string. Title, Client, compensation and date validation remain required. A legacy editor keeps its Description when establishing Title, and the user may then explicitly clear it.

WorkEntry remains the internal type. Title changes do not alter earned calculations, receipt amounts, expected dates, allocation IDs, ledger descriptions or financial totals.

## Optional Description migration

Migration 0010 follows the pending Title migration 0009. It keeps description TEXT NOT NULL and removes only the nonblank CHECK. SQLite reconstruction copies every Work entry column verbatim, including nullable legacy Title and untrimmed Description. It also copies the referencing allocations before swapping both tables in the existing Drizzle transaction with foreign_keys enabled; toggling foreign_keys within that transaction would not protect linked records. Receipts and Clients are not rebuilt or altered. All six Work entry/allocation indexes, allocation constraints, composite Income FK and Client FK are recreated unchanged. A failure rolls back the copies, table swaps and migration bookkeeping. Tests cover populated upgrades, injected failure after the old tables are dropped, safe retry, repeated initialization, integrity_check and foreign_key_check. No historical migration is rewritten.

## Client context

Client remains the required relationship. The full-screen Clients manager retains active/archived groups, accent-insensitive search, the existing Name/Create client controls, authoritative balances and anchored History/Archive actions. Its heading has an explicit Back to Work button and safe-area handling. Client management separates Active/Archived and shows each Client's authoritative outstanding balance. Client detail retains Outstanding/Earned/Received, open jobs, contextual Add work and Record payment, and anchored History/Archive actions. Add work preselects the active Client. Archived Clients cannot receive new work but their debts remain payable and their historical names remain readable. No rename API exists, so none is added.

Individual job detail retains direct Record payment and anchored Edit/Client details/Delete. Delete is offered only without received money; the data-layer protections remain. Paid-job editors expose a readable locked Client and existing safe-edit constraints.

## Job editor and identity

Fields are grouped as Job (Job title, Client, Description, work date), Pricing (Hourly/Fixed, existing inputs and Earned preview), and Payment expectation. Title comes first and receives initial focus. Description is multiline. No Notes field is invented.

Job Title is explicitly single-line. Pasted CR/LF and Unicode line separators become spaces in the editor, legacy draft initialization and domain save validation, preserving words and accents. Shared single-line inputs use native font metrics rather than paragraph line-height styling. Description lines are omitted entirely when empty or whitespace-only, without placeholders; the authorized optional-Description migration allows these jobs to save.

Autocomplete and identity remain source-owned. Search ignores accents; identity preserves accents while normalizing whitespace, NFC and JavaScript lowercase. Álvaro and Alvaro coexist; case and decomposed equivalents conflict. Category filtering/archival and hourly nearest-centavo calculations remain unchanged.

## Received money and receipts

Job payment defaults to its full outstanding balance. Client payment preselects Client and lets the user choose jobs. Allocation labels and accessibility identifiers use Job Title, not Description. The form retains Client outstanding, Receiving and validated Remaining after payment. Partial and multi-job receipts stay explicit, with the total derived solely from allocations.

Payment date, active Income category selection/creation, confirmation, duplicate-submit protection and atomic Income/allocation creation are unchanged. Work performed alone creates no Finance Income.

Receipt rows remain distinct: Client, received amount and date. Disclosure reveals covered Job Titles and their received amounts. Undo remains a secondary anchored action with confirmation and the existing atomic reversal.

## Targeted History, integrations and lifecycle

Global History is a full-screen pushed card route, with safe areas, a screenTitle heading and Back to Work; it is not an AdaptiveSheet. Client-specific History remains a focused sheet. Both reuse WorkHistoryList, retaining independent stable job/receipt cursors. Client filtering happens in the source API; detailed jobs/receipts remain page-bounded, and complete combined receipt allocations remain available for exact reconciliation. Earlier pages append. Mutation refresh reloads the currently loaded bounded span coherently.

Management routes request compact balances/Client metadata rather than loading every open Job. Client details fetch only that Client's open Job detail. Opening a payment loads actionable open Jobs to preserve switching between indebted Clients; payment selections still filter Jobs by the chosen Client. Job details and History are requested on demand. Adding Title adds no queries or per-job reads. The F4 compact balance projection still examines all current work to keep exact totals; unresolved old jobs remain discoverable.

Home and Calendar Work projections use Job Title first and Client as secondary context, preserving amounts, dates, source IDs and layouts. Payment/Undo refresh behavior is unchanged. Native card Back/gesture/Android Back pops to the still-mounted Finance workspace, preserving its destination and scroll state; focus refresh publishes only successful reads. Direct subroute entry with no Back stack falls back to the dedicated Work entry route.

F1 retains last-good overview/detail/history, appended pages and receipt disclosure, and dirty Title, Client, Description, pricing, date and Client-creation/search inputs during failures and Retry. F3 identity remains unchanged. F4 regressions verify three History pages remain 20/20/5 detailed rows with 9 SQL statements per read and no duplicate reads from the UI effect.

## Verification

Tests also cover optional empty/whitespace Description creation, clear/restore with unchanged ledger, legacy edit/clear, menu dismissal before pushed routes, Back/fallback, global destinations without sheets, mounted Finance preservation, compact management queries and targeted Client detail. Tests cover actual pre-Title migration with archived Client, long description, Income and allocation; rollback/retry/idempotency; legacy fallback and editing; required/persisted/edited Title; no Income from creation; job hierarchy without main Client aggregation; overdue/partial/Paid states; long Title and bounded Description; complete large money; exact allocation/Income reconciliation; Home/Calendar title labels; Client management; F1/F3/F4; SQLite integrity and foreign keys.

Earlier Fitness/Journal migration tests isolate their original migrations with the current Work column available for their current API fixtures. Real pre-Title upgrade preservation is separately verified against an actual database without that column.

## iPhone Expo Go review still needed

Review pushed Clients/History safe areas and Back/gesture/Android Back, retained Work scroll and destination, search/create/archive, paged receipts and focused sheets, optional Description create/clear/restore and populated device upgrade. Review Job dominance and secondary Client/Description hierarchy, disjoint attention/Jobs, Add/edit Title, legacy fallback, long Title/Description and large money, Hourly/Fixed pricing, partial/full/multi-job payment, Client management/detail, settled History and receipt disclosure, Home/Calendar labels, native dates, anchored menus, keyboards, light/dark mode, large text and VoiceOver. Test refresh failure/Retry while all editor fields are dirty. Automated tests and exports are not physical-device testing.

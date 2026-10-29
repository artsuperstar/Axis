# Finance Work — Clients Management v2

## Existing behavior audit

- `/work/clients` pushes WorkClientsScreen. Back uses router.back or replaces `/work` when no history exists. SafeAreaView owns both native insets; ContextMenuHost owns menu focus/isolation.
- WorkManagementScreen requests `readOverview({ includeJobs: false })`: authoritative counterparties and batched BigInt receivable totals, without eagerly loading client jobs. Opening Client details reads only that client's open jobs; payment reads actionable choices. No per-card query is needed.
- Both Active and Archived are searched with `canonicalSearchText`: trim/collapse whitespace, NFC/case normalization, then accent-insensitive matching. Preserve source name/ID ordering.
- Creation uses `createCounterparty`: required normalized name; whitespace collapse and NFC display normalization; lowercase active-name uniqueness that preserves accents. Álvaro and Alvaro are distinct. An archived name may be reused as a new identity with a different ID.
- Archive is idempotent soft archival, confirmed in WorkView. It blocks selection for new Work, without removing Work, receipts, balances or Income. Existing archived debt remains payable and historical names remain accessible.
- Client bodies open the existing Client details dialog. Menus offer History and, for active clients, Archive. There is no rename, restore, permanent delete, screen-level action menu, interactive sort or authoritative job count.
- Existing New/Edit Work quick-create and Record Payment client-first allocation flows are separate and remain unchanged. Work client IDs and historical Income/allocation linkage remain source-owned.
- Mutations refresh the shared Finance snapshot; focus reload retains last-good data and exposes Retry on failures. Legacy Clients uses eager rows inside a route ScrollView and a permanently visible creation form.

## Direction

Ordinary Warm Editorial Hearth extension, Operate mode. Preserve the supplied mockup's Clients → Search → compact New client → Active → Archived hierarchy. Use incumbent Lora/Manrope, cream/charcoal/plum tokens, person/search icons, restrained borders, compact variable-height cards and one sectioned virtualized list. Preserve native route/header ownership and Back. Omit unsupported sorting, counts, top overflow, branding/avatars and the blue system overlay. Provisional green does not authorize global color changes.

Creation becomes a compact on-demand panel using shared v2 form primitives and the existing source validator; failures preserve the draft, successful creation closes/reset the panel and announces success, and a submission latch prevents duplicate success calls. Archived disclosure starts expanded to preserve current visibility; typing search reveals both searchable groups. Search/disclosure/draft state live outside virtualized rows.

## Implemented composition and scope

The previous Clients destination put a permanently expanded Name/Create form above eager, divider-separated client rows in the route ScrollView. Browsing now takes priority: the existing pushed header is followed by a full-width search field, a compact contained `Add a new client` surface, Active cards and Archived cards. `New client` opens a compact inline editor in the same list header. It uses `EditorSection`, `FormField`, `FormButton`, `GroupSurface`, `UiText` and the incumbent contextual menu rather than a separate route or modal architecture.

The Clients header uses the existing Back action and editorial serif title. Back returns through the router when history exists, with `/work` as the established fallback. No Finance tab bar, new top-level tab, header overflow menu or blue system overlay is introduced. The Clients route retains native safe-area ownership and `ContextMenuHost`; History retains its existing route scroll structure. Client bodies open the genuine Client details dialog by saved ID, separately from the labeled menu target. History remains the existing client-filtered history flow. Active menus contain History and Archive; archived menus contain History only. Rename, Restore and Delete remain unsupported.

The implementation uses the existing cream/charcoal surfaces, plum brand accent, Lora headings and Manrope interface text from `src/constants/design-system-v2.ts`. Generic person and search icons communicate purpose without name-derived branding, external images or an avatar system. Quiet borders and compact variable-height cards carry the hierarchy. The reference's mint/green remains provisional; this change does not unify global Axis colors or revise `DESIGN.md`, `PRODUCT.md` or prior Work surface decisions.

## Search and identity

Search uses the existing `canonicalSearchText` against both saved collections. It remains forgiving of accents, case and canonically equivalent Unicode, and preserves the existing whitespace treatment. For example, `Alvaro` can find both `Alvaro` and `Álvaro`; this matching behavior is separate from persistent identity.

`createCounterparty` remains responsible for required names, collapsed whitespace, NFC display normalization and active-name uniqueness using case-normalized, accent-sensitive identity. `Álvaro` and `Alvaro` remain distinct identities. Canonically equivalent composed/decomposed names do not create a second active identity. Reusing an archived name creates a new client ID and does not relink the archived client's Work.

The screen preserves source name/ID ordering and has no interactive sorting selector. Active/Archived headings count the corresponding authoritative collections, with matching-result feedback when searching; these are client counts, not job counts. No authoritative job count is provided by the overview, so cards omit that mockup detail. A no-match state retains the query and offers `Clear search`; it never automatically creates a client.

Archived disclosure starts expanded. A subsequent nonempty search edit expands it so archived matches can be found under their own group. The user can still collapse it explicitly. Disclosure exposes expanded/collapsed accessibility state, and changing it does not reset search or a creation draft. Search never changes client status or makes archived clients eligible for new Work.

## On-demand creation and recovery

The inline editor contains required `Name *`, Cancel and Create client. It calls the existing mutation and source validator, preserving domain duplicate feedback rather than reimplementing name comparison in the UI. Error feedback is attached to the field; validation or save failures retain the entered text. Cancel clears and closes this draft. Successful creation refreshes the source snapshot, closes and resets the editor, dismisses the keyboard and exposes a polite `Client created` message. An active query is preserved; success feedback explains that clearing search reveals all clients when appropriate.

A ref-based submission guard prevents repeated success calls from rapid taps or keyboard submission before the view updates. The guard is released on failure or a fresh editing session. Existing New/Edit Work quick-create remains in its own parent editor, preserving the parent Work draft and newly selected identity. The Clients redesign does not redirect those nested flows into this destination or rewrite Record Payment.

## Financial and historical integrity

Cards read outstanding from `WorkOverview.counterpartyTotals`, keyed by saved client ID. They format the existing exact BigInt minor-unit value through `formatBrlAmount`; they do not calculate earned, received or outstanding independently. Centavos remain visible, including aggregate amounts above JavaScript's safe Number range. Extremely long BRL values can wrap between whole numeric groups while retaining every digit and the final centavos.

Archival still passes through the existing WorkView confirmation and source soft-archive mutation. It prevents new Work selection without deleting Work, rewriting historical client references, changing earned compensation, settling debt, removing allocations or altering linked actual Income. Archived outstanding remains visible and eligible for the existing legitimate payment flow. Client creation/search/archive do not themselves create Income. Job Details, Work Main, Work History, receipts, Calendar Work projections and Journal actual-income projections continue to consume source-owned records and financial calculations.

Shared Finance mutation and focus reload behavior remain authoritative. Refresh failures retain last-good data and mounted drafts and expose Retry. A later successful refresh updates outstanding after receipts without clearing the client's search or inline creation draft.

## Scrolling, responsive layout and accessibility

Clients owns one `SectionList`, with search/creation in its list header and Active/Archived sections below. The route no longer nests that list in a vertical ScrollView. Stable keys are client IDs; initial rendering and batches are bounded to 8 rows, with `windowSize={5}`. Search, disclosure and editor state live outside virtualized rows. The existing `readOverview({ includeJobs: false })` continues to return counterparties and batched receivable totals. Typing filters the loaded collections without database reads; rows introduce no N+1 queries. Client details load the requested client's existing detail projection on demand.

At wider normal text sizes, identity and balance share a row. Narrow widths, enlarged font scale or long amounts switch to a column; names wrap naturally and controls keep separate touch targets. Search and Name input minimum height follows the reported font scale. Creation copy aligns with its action at ordinary widths, while narrow layouts stack it. The stacked identity block uses an automatic flex basis so native column layout can retain the full name. No fixed card height, new bottom tab padding or arbitrary large bottom spacer is introduced. Native keyboard inset adjustment and handled taps remain configured on the list; dragging dismisses the keyboard and scrolling dismisses contextual menus.

The title and Active group use header semantics. Search and creation controls have explicit names; Name exposes required/error feedback. Client bodies announce their subject and outstanding balance, archived status is stated, menu targets identify the client, and disclosure communicates its state. Decorative icons use the shared icon behavior. Light/dark presentation and no-client/no-archived/no-match states keep creation accessible and avoid fabricated records. No new animation is needed for this disclosure. Native assistive technology, OS font settings and focus behavior remain device checks, not conclusions from browser semantics.

## Material skill findings

- **frontend-design:** the supplied reference's vertical composition informed header → search → contained creation entry → Active → Archived. Cards place saved identity first and exact outstanding second, with contextual actions outside the body target. Unsupported reference controls were removed using the audited source capabilities.
- **Impeccable:** the density review removed the permanently expanded editor and excess spacing while preserving variable-height text and amount readability. Bounded browser gallery/detail inspection informed the font-scale input minimum height, creation-copy alignment and native stacked-copy flex correction. This is an ordinary extension of Warm Editorial Hearth in Operate mode; the task document records surface decisions without overwriting the incumbent design/product system.
- **UI/UX Pro Max:** the local `search empty state clear input` search surfaced Empty States guidance, applied as explicit no-match copy and Clear search while retaining the query. No-match never becomes implicit creation. Required/duplicate feedback stays next to Name, and Archive's subject and consequences remain explicit.
- **Expo Skills:** official Expo SDK 58 and React Native list/navigation guidance informed one SectionList, stable ID keys, row-independent state and preservation of shared route, keyboard and safe-area ownership. SDK compatibility review and exports are separate from physical-device verification; the source's established domain and route architecture remains authoritative.

## Browser evidence and provenance

The [capture index](previews/clients-v2/README.md) describes scenarios, reproduction and limitations. `scripts/preview-clients-v2.ts` renders the real WorkClientsScreen → WorkView → WorkClientsList and shared UI with embedded project fonts and actual tokens. Isolated SQLite services generate synthetic saved client/job/balance fixtures and record the creation/archive effects. Browser actions replay those recorded effects through a substituted `useFinance` boundary; the browser does not persist live database changes. Actual writes and reconciliation are checked by Node/SQLite integration tests.

React Native Web and native/font/router/picker/safe-area/motion boundaries are substituted. Archive confirmation is a browser representation of the existing platform Alert boundary, not evidence of native Alert presentation or focus. Every PNG, including contact sheets, carries Origin metadata identifying the real source UI, synthetic fixtures and substituted boundaries. Sample client names and amounts in these fixtures are review data, never application defaults.

The final full matrix completed successfully (exit 0): **50 browser cases, 76 original captures and 10 contact galleries**, with no recorded browser errors. A manifest comparison passed with no missing or extra captures. It covers both themes, Active/Archived/empty collections, collapsed/expanded archives, matches/no matches/accent search, required/duplicate errors, distinct accented identity, creation success, menus/confirmation, long names/large balances, 320/390/430 widths, normal/2× text and a 180-client scroll to the final row. Both large-list cases initially mounted 28 of 180 clients and reached the final card with clear bottom bounds.

All 10 initial galleries were inspected by the root reviewer. Final representative inspection confirmed scaled input height, exact source required/duplicate feedback, successful creation from four to five active clients, creation-copy alignment and the native stacked-copy correction. An [independent finish review](previews/clients-v2/finish-review.md) inspected all 10 final galleries plus representative originals and returned **Ship at the reviewed source and browser-evidence scope**, with no material UI defect or further UI fix requested. Its sole bookkeeping finding was the stale pending documentation wording, resolved here; this disposition does not certify native devices or exact original-image fidelity.

The preview validator replays the actual FinanceValidationError class. Each recorded successful creation removes its synthetic inserted client before recording the next effect, so a replay starts from the original collection rather than accumulating earlier fixture creations.

The browser archive case opens the source confirmation for the first client, Ajakrn, and does not commit the archive. The fixture's other sequentially recorded archive effects are not exercised or certified by this browser matrix. Actual archive persistence, preserved associations and financial effects are covered by live SQLite integration tests.

The 2× browser mode reports `fontScale: 2` and doubles DOM font sizes/line heights. It is a layout stress case, not operating-system Dynamic Type. Automated checks cover document/owned-surface overflow, intact wrapped money groups, runtime errors, bounded mounting and bottom-row reachability. They do not certify native performance or accessibility. This documentation pass has no local artifact for independently comparing the user's original inline image; the root reviewer performs that direct conversation-reference comparison. Browser evidence supports the composition review without implying independent native/mockup fidelity certification.

## Validation

The actual pre-change full-suite baseline was **1,382 passing tests in 166,571 ms**. Focused validation has passed **69 tests**, including **14 new Clients cases** plus existing Work Editor, Record Payment and Job Details coverage. The new Clients tests exercise pushed routing and one-list composition, search/identity/disclosure behavior, required and duplicate validation, draft retention and submit guarding, archived-name reuse and debt behavior, refresh recovery, stable keys/no keystroke reads, and 320/390/430 widths at normal/2× font scale with long names and exact large amounts.

| Final check | Measured result |
| --- | --- |
| Broad regression run | **673/673 passed**, exit 0, 79,267.8217 ms; includes all 14 new Clients cases |
| TypeScript | Passed, exit 0 |
| ESLint baseline comparison | Exact comparison assertion passed: unchanged **6 existing errors and 2 warnings**, no new diagnostics; ESLint itself exits 1 for those existing errors |
| Prior Work source protection | Comparison assertion passed: Work forms/Record Payment and Job Details sources are identical to the task-start snapshot |
| Browser matrix | Passed, exit 0: **50 cases / 76 originals / 10 galleries**; no errors, missing or extra captures |
| `git diff --check` | Passed, exit 0 |
| Full automated suite | **1,396/1,396 passed**, exit 0, 164,512.5391 ms; no failed, cancelled or skipped tests; isolated serial files with `TZ=America/Sao_Paulo` |
| iOS export | Completed, exit 0; `dist/clients-v2-ios` includes the production Hermes bundle and metadata |
| Android export | Completed, exit 0; `dist/clients-v2-android` includes the production Hermes bundle and metadata |

## Physical checks still required

No native Android bridge/emulator or `xcrun` was available in the host probe. Test iOS and Android on supported devices: real top/bottom/cutout safe areas, final-row clearance, native scroll performance, software keyboard/IME insets, field focus/reveal, Back and menu/dialog focus restoration, native Alert confirmation/cancel, VoiceOver/TalkBack announcements, OS enlarged text and live Reduced Motion. Cover both themes, long names/amounts, creation errors/success, archived debt and large collections. A bundle export or RN Web screenshot cannot close these checks.

## Current task file inventory and worktree protection

| Area | Current Clients task files |
| --- | --- |
| UI | `src/features/finance/work/components/work-clients.tsx` (new list), `src/features/finance/work/components/work-view.tsx` (Clients wiring), `src/features/finance/work/work-management-screen.tsx` (Clients header/list host) |
| Tests | `tests/work-clients-v2.test.ts` (new), `tests/work-experience.test.ts` (adapted Clients expectations) |
| Preview | `scripts/preview-clients-v2.ts`, `scripts/review-clients-v2.cjs` |
| Documentation/evidence | This document, `docs/previews/clients-v2/README.md`, Clients captures/contact sheets and `checks.json` |

The working tree already contained prior Work changes. This inventory describes the current Clients task, not every changed file in Git status. Existing DESIGN/PRODUCT and earlier Work changes are preserved. No schema, migration, dependency, commit or push is part of this task.

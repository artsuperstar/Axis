# Transactions experience — Stage 13G

Transactions is the actual-money ledger. Earned Work, expected receipts and unpaid Commitments remain in their owning destinations until payment creates a Finance transaction.

## Ledger hierarchy

- Description and explicitly signed BRL amount are primary. Income uses restrained success; ordinary Expense uses primary text, rather than error styling.
- Device-local civil dates group rows as Today, Yesterday, or localized month/day, including a different year. Date grouping preserves the established date descending, creation timestamp descending, ID ascending order.
- Historical category names remain secondary, including archived categories. No category means no placeholder in the ledger.
- Rows use dividers, wrapping descriptions/metadata and tabular monetary figures. Money has no ellipsis or line limit; the heading wraps so money can occupy its own line at narrow widths/large text.
- Notes are absent from the ledger. Manual row taps open the editor; linked row taps open readable source details. Manual Edit/Delete live in the anchored row ContextMenu; Delete retains confirmation and soft deletion.

## Sources and protected editing

Work rows show Job Title first and Client · Work below. Combined receipts show the first job with a remaining-job count; detail lists every covered job. Work labels use the existing legacy Title fallback. Archived Client names remain resolvable. Commitment rows show the Commitment name and the Commitment source label.

Linked details show a single concise Source: Work/Commitment line. Work Client context follows Job Title; Commitment name remains the Expense identity. No permanent explanatory paragraph or repeated source badge is shown. Open Work/Open Commitments returns to the existing Finance destination rather than adding cross-feature routes. Edit details retains the **existing** restrictions: Work Type/Amount are locked; Commitment Type is locked but Amount remains editable. Category, Description, Note and Date retain their existing safe editing behavior. Removal uses the owning payment Undo. The data layer remains authoritative if the source is changed or undone during editing.

Detail-to-editor/source transitions wait for native iOS modal dismissal. Android/web use the next animation frame after closing; no stacked native sheets are presented.

## Creation and categories

A single accent floating + exists only in Transactions, inside the existing Finance native safe area. Its accessible label is Add transaction. The list reserves the full button height plus top/bottom spacing below its last row/footer. It opens the existing editor.

The editor groups existing fields into Transaction (Type/Amount), Details (Description/Category/Note), and Date. Amount uses the shared section-heading size/weight while retaining native single-line font metrics and zero native vertical padding. Type remains segmented, Category remains anchored, and quick category creation still persists, refreshes and selects the new category. Archived categories are understandable in historical edits but absent from available choices. Date keeps native pickers and the today-or-earlier rule.

Header Categories uses the shared anchored ContextMenu, with dismissal committed before opening the existing category manager. The manager and category business rules are unchanged.

## Reads and refreshes

The ledger starts with 40 transactions. Load older transactions fetches the next 40 using a date/timestamp/ID cursor, with a one-row lookahead. Each date section has a civil-date key; paging across one date merges into its existing section without changing row order. A read transaction supplies a coherent page, categories (including archived), and two batched source-label reads limited to visible payment IDs. No per-transaction source queries or full Work/Commitment snapshots are required.

Focus/resume and successful mutations refresh only the user-loaded span. Paging failures retain appended rows; ordinary refresh failures retain last-known-good data and open editor drafts. Initial reads show loading; an initial failure shows Retry without claiming the ledger is empty or enabling creation.

Overview continues using its own complete period analytics and BigInt reducer, not a truncated ledger page. Mutations, allocations, Pay/Undo, validation and soft deletion are unchanged. Schema, migrations and dependencies are unchanged.

The 95-record regression fixture measured the old full read at **4 SQL statements / 108 returned rows**, versus **6 statements / 54 returned rows** for the first page (41 transaction rows, 40 displayed, plus 13 category rows). The two additional statements are the read transaction's begin/commit; both implementations issue four SELECTs. Each older-page transaction query returns at most 41 rows. Combined receipt detail can include all jobs assigned to that visible receipt.

## Accessibility and device review

Rows announce description, Income/Expense, complete BRL amount, local-date heading, category and source. Linked rows have normal readable text and a source-detail hint; they are not disabled. Headings expose header roles; buttons expose clear labels and shared focus/selected/expanded semantics. Wrapping and font scaling remain enabled for ledger text and sheet content.

Automated tests exercise real SQLite queries/mutations and mounted screens with mocked native boundaries. They do not demonstrate UIKit glyph layout, physical FAB/tab-bar clearance or VoiceOver pronunciation.

On iPhone Expo Go, review scan density, Today/Yesterday/older headings, manual Create/Edit/Delete, Work and Commitment payment/Undo, linked detail handoffs, historical archived labels, Categories, native date picking, keyboard scrolling, final-row/FAB clearance, light/dark mode, long titles/large amounts, accessibility text and VoiceOver. Inject a refresh failure with a dirty editor to confirm retention on device. No physical-device testing was performed in this stage.

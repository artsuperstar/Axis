# Finance Categories v2 — Category Creation and Management

## Scope and authority

Finance Categories now uses the incumbent **Warm Editorial Hearth** system in **Operate** mode: create a category, inspect the library and archive a custom category. Existing category data and operations outrank the mockup. The two owned sections are **New category** and **Categories**. This ordinary extension preserves the existing modal, services, category identities and financial rules; no schema, migration, dependency or global palette changes are introduced.

The existing [Transactions v2.2 record](finance-transactions-v2.md), [Transaction Editor v2 record](finance-transaction-editor-v2.md), [visual groundwork](design-system-v2-visual-groundwork.md), and `src/constants/design-system-v2.ts` remain the design references. The Categories brief authorizes this surface's compact serif header/section headings. PRODUCT.md's older SDK57 reference and the absence of DESIGN.md are pre-existing documentation drift; this stage does not rewrite global design or product files.

## Existing behavior audit

The audit compares the previous manager with the current implementation and authoritative Finance services.

| # | Concern | Existing contract and current result |
| --- | --- | --- |
| 1 | Transactions entry | Transactions options → Categories remains the sole management entry point; Back returns to Transactions |
| 2 | Presentation architecture | Existing `AdaptiveModal` / `AdaptiveSheet` retained; now opts into v2 presentation and one virtualized scroll body |
| 3 | Financial types | Expense and Income remain the only types; Expense remains the initial selection, and the chosen type scopes both creation and the library |
| 4 | Actual built-ins | Thirteen fixed seed identities: ten Expense and three Income, listed below; no example categories are invented |
| 5 | Custom creation | Existing `createCategory(name, type)` service creates a new custom UUID identity and returns its normalized record; the manager does not implement persistence |
| 6 | Name equivalence | Display normalization trims/collapses whitespace and uses NFC; identity additionally applies locale-neutral lowercase; accents remain meaningful |
| 7 | Uniqueness | Active names are unique within financial type; equivalent Expense/Income names may coexist |
| 8 | Archival | Existing `deleteCategory` performs soft archival by timestamp; the original Archive confirmation and historical-reference semantics are retained |
| 9 | Archived browsing | Previous manager displayed active categories only. Custom Active/Archived is added solely as a read-only presentation filter over the already historical collection |
| 10 | Restore | No supported Restore operation; no restore control is added |
| 11 | Rename/Edit | No public category rename/edit operation; no name-edit control or detail destination is invented |
| 12 | Permanent deletion | Unsupported; archival never deletes a category row or its transactions |
| 13 | Built-in protection | `isBuiltIn` identifies protected origin. The service rejects archival; rows have no actions, chevrons or tap handler |
| 14 | Historical references | Reads include archived records; IDs/names continue resolving old manual/linked transactions and category projections |
| 15 | Transaction selection | New choices use active compatible categories plus No category. Editing may retain the existing archived identity, but cannot choose another archived category |
| 16 | Nested creation | Transaction selector's inline New category uses the same creation service, selects the returned ID only after success and closes back to the preserved parent draft; it does not open this manager |
| 17 | Feedback/readiness | Previously one general error and a cleared successful name. Now input-adjacent creation errors, polite success feedback, explicit archive errors and a readiness guard; refresh failure keeps the existing snapshot/Retry behavior |
| 18 | Scroll/query behavior | Previous sheet eagerly mapped a type-scoped active collection in its scroll body. One bounded `FlatList` now renders the filtered library; the existing full historical read and ordering remain unchanged |

## New structure and incumbent-system comparison

The header contains the named Back action, **Finance categories**, and the subordinate “Manage the categories for your transactions.” text. At ordinary font sizes the compact header is fixed. At native font scale 1.5 and above, the title/subtitle move into the list so they can scroll; Back stays fixed at the left. There is no added bottom navigation or floating create action.

**New category** owns Type, Category name and one full-width Create category button. **Categories** owns the current financial-type caption, Built-in/Custom browsing and, only within Custom, Active/Archived browsing. The library header, row slices and footer compose one continuous owning surface, rather than nesting a separate vertical list inside it.

| Incumbent rule | Categories application |
| --- | --- |
| Lora display / Manrope practical interface | Existing `editorTitle` and `editorSection` roles for the heading/section titles; names, labels, statuses and controls remain Manrope |
| Warm cream / warm charcoal | Existing canvas/group/control/text/border tokens in light/dark mode; no new color tokens |
| Quiet surface ownership | Two contained sections, thin borders and tonal separation; no new shadow, gradient, artwork or decorative imagery |
| Existing shape and spacing | Group radius 16, control/tile radius 10, 12-point section padding/gaps and 40-point decorative icon tiles |
| Shared accessible interaction | Existing BackButton, fields, segmented radios, FormButton, ContextMenu and sheet/focus/keyboard infrastructure |
| Provisional color direction | Shared current scoped tokens are reused; this stage does not settle a permanent app-wide Finance palette |

The ordinary-extension handoff found no need for a new visual world or tokens. It records this surface's explicit changes and the evidence limits without creating DESIGN.md or a design sidecar.

## Type, origin and status semantics

The manager begins with **Expense**, **Built-in**, and an **Active** custom-status preference. The Type selector determines both the new category's financial direction and which type the library shows; the visible “Expense categories” / “Income categories” caption makes that relationship explicit.

Origin comes from `isBuiltIn`, never the category name. Built-in shows active protected categories; Custom shows user-created categories. Active/Archived affects Custom only and uses `deletedAt`. All three controls filter presentation without writing database state. Filtering preserves the name draft; changing Type clears its validation/success message without discarding entered text. Source order is preserved: type ascending, built-ins first, then name and stable ID ascending within the service collection.

## Creation, validation and feedback

The existing service remains authoritative:

- Display names use `trim()`, whitespace collapse and NFC Unicode normalization. For example, a decomposed `Café` becomes `Café`; casing and accents remain in the saved display name.
- Duplicate identity uses that normalized name plus `toLowerCase()`, without diacritic removal. `FOOD` and `Food` conflict within the same active type; `Cafe` and `Café` are distinct. This policy differs deliberately from accent-insensitive Transactions search.
- An empty normalized name reports “Enter a category name.” An equivalent active name reports “A category with this name already exists for this type.” Archived names do not reserve active-name identity, so recreation uses a new ID while historical references keep the archived ID.
- Type validation and the existing immediate database transaction remain in the service. The UI adds no automatic suggestions, maximum-name policy, icon inference or second persistence path.

Create category is disabled for whitespace-only input or unavailable authoritative categories. Keyboard submission reaches the same validation path. Input-adjacent errors keep the draft intact. Successful creation clears the name, switches the library to Custom/Active and announces `Created “<normalized name>”.` A synchronous submission guard prevents two callbacks in the same render from creating twice; it resets after failure or a new name/type draft. There is no asynchronous creation service or artificial loading animation.

The screen receives `categoriesReady={!!snapshot}` from Finance. Before readiness, creation is disabled and the empty library shows a labeled loading indicator rather than a false empty result. Normal mutations reload the source-owned snapshot. A committed write followed by refresh failure keeps existing recovery/Retry handling; success feedback reflects the committed creation, while the collection may still show its prior usable snapshot until retry succeeds.

## Category identities and icon reuse

The unchanged `financeCategoryIcon` resolver uses existing seed IDs and is shared with Transactions. Category labels are displayed from data; neither translated names nor transaction descriptions choose an icon.

| Financial type | Existing built-in | Shared generic icon |
| --- | --- | --- |
| Expense | Housing | Home |
| Expense | Food | Utensils |
| Expense | Transport | Car |
| Expense | Shopping | Shopping bag |
| Expense | Health | Heart |
| Expense | Pets | Paw |
| Expense | Entertainment | Ticket |
| Expense | Utilities | Home |
| Expense | Subscriptions | Repeat |
| Expense | Other | Tag |
| Income | Salary | Briefcase |
| Income | Freelance | Briefcase |
| Income | Other | Tag |

The brief's Entertainment/clapperboard example does not override the existing shared Ticket mapping. Every custom/unknown ID uses Tag, including custom names such as Food or ChatGPT. No category icon picker, logos, remote imagery or new icon package is introduced. The resolver's null-category Receipt fallback remains a Transactions concern; management rows represent actual category records.

Expense Other and Income Other are real, separate protected identities. Finance Overview's synthetic Other chart segment is a temporary display aggregation, not a category that can be created, archived or persisted here.

## Archival, supported actions and historical references

The only category write operations remain **Create** and **Archive custom category**. Active custom rows offer a named menu with Archive category; protected built-ins and archived custom rows are informational with no menu or chevron. Archived status is visible as “Custom · Archived” and the icon tile uses a quieter existing tone. There is no Restore, Rename/Edit, permanent Delete, new detail route or automatic historical reassignment.

Archiving retains the existing native confirmation exactly: **Archive category?** followed by `Existing transactions will keep “<name>” as their category. It will no longer appear in category choices.` Cancel writes nothing; Archive invokes the existing service. Success announces `Archived “<name>”.`; a failure preserves the record and presents the existing retryable action error. Built-ins remain protected at the service boundary even if a caller bypasses the UI.

Archival updates only the category's archival/update timestamps. Existing category IDs, transaction references, commitment references, BRL values and ledger movements remain intact. Historical reads include archived categories, so names continue resolving in Transactions, Overview category projections and Journal-derived financial context. New compatible selectors exclude archived categories; an existing same-type transaction can retain its archived identity when editing. Reusing an archived name never moves old references to the new category.

## Transaction editor integration

The standalone manager still opens from Transactions options and returns through existing modal Back/dismissal behavior. Its initial Expense selection does not inherit a new financial type from another route. Category creation inside New/Edit Transaction remains the separate existing inline selector flow: it passes the parent's current type to the same service, keeps unsaved amount/description/note/date fields, selects the returned new ID after persistence succeeds and returns to that editor. Failed creation keeps the inline draft; category creation alone does not save a ledger movement.

The new regression coverage exercises nested Income creation and parent-draft retention. Browser captures additionally demonstrate nested Expense creation. Neither path duplicates the management screen or changes Commitment/Work ownership. Transaction editor and shared selection-host implementations are unchanged in this stage.

## States, responsive behavior and accessibility

The library distinguishes no built-ins, no custom categories yet, no active custom categories when archived records exist, and no archived categories. Empty Custom/Active directs the user to the form above without duplicating Create. Creation errors sit beside the required name field; archive errors sit within the library; success messages are polite live regions.

The 320/390/430 matrix covers light/dark and normal/simulated doubled text. Names wrap without line limits, overflow menus align at the top, and rows can grow. At font scale 1.5 and above row icon/text stack and the shared radio controls use their existing vertical arrangement. The title is 24 points below 390 width and 26 points otherwise, with 34-point base line height; native font scaling remains enabled.

Back is explicitly “Back to Transactions.” Required name, selected radio states, custom archive actions and archived status have explicit accessible labels. Row identities are informational, with decorative icons hidden from assistive technology. Origin/status remain understandable without color. Shared minimum touch targets, menu focus handling and Reduced Motion behavior are reused. No native accessibility certification is claimed.

## Scrolling and performance

One `FlatList` owns both the creation form and library, with stable category-ID keys, 8 initial rows, batches of 8, a five-window setting and clipping disabled. `CategoryScrollView` uses the existing `FormScrollView` and forwards its ref to both the sheet and list, retaining measured focused-field reveal, keyboard viewport handling and shared menu scroll coordination. There is no nested vertical ScrollView. Back stays outside this scroll owner.

This bounds mounted rows; it does **not** paginate category data. The service still reads the entire historical collection, and the manager performs O(N) in-memory filtering/archived detection. Existing name validation also scans active same-type records for duplicates. No query index, database pagination or domain behavior changes are introduced. In the browser's selected Expense/Custom collection of 227 records, 18 rows were mounted at capture, rather than the entire collection; this is evidence of that fixture's virtualization, not a native performance benchmark.

## Skills and review findings

- **frontend-design:** Followed the supplied two-section composition and existing editor family, keeping creation prominent, category rows compact and built-in rows free of false affordances.
- **Impeccable:** Reviewed section ownership, restrained borders, title/Back balance, long names, enlarged-text layout and theme quality. The fresh independent reviewer opened all 38 screenshots and returned **SHIP**, without requesting material fixes within its brief/composition/source/RN Web scope. This documentation handoff compares the extension with the incumbent system and records the actual behavior and limitations. The production UI is native React Native, so the HTML/CSS detector does not apply.
- **UI/UX Pro Max:** Verified local Confirmation Dialogs / Confirmation Messages guidance informed retention of the explicit Archive confirmation and the addition of clear creation/archive feedback. No unsupported management feature was added.
- **Expo Skills:** Consulted SDK58 native documentation and reused the existing adaptive-sheet keyboard/scroll pattern, focused-field reveal, safe-area ownership and virtualization. Existing parent transaction/selection behavior remains authoritative; browser geometry is not native keyboard proof.

The main implementation agent compared the supplied image directly. The independent reviewer lacked the original image pixels and assessed the written brief/composition and real-component captures; its verdict does not establish a direct pixel comparison.

## Evidence and validation

[Capture index](previews/finance-categories-v2/README.md) documents 36 base scenes plus 2 long-row captures, 38 check records and zero recorded geometry/assertion/browser failures. Components/fonts/tokens are real; native boundaries, browser creation callbacks and keyboard metrics are explicit fixtures. Actual category persistence and reference behavior are exercised separately by component and real-SQLite tests.

Final focused coverage passed **263 tests**, zero failures (36.5 seconds); the final full suite passed **1,266 tests**, zero failures (205.0 seconds). Fourteen new Categories cases cover entry/Back, independent filters, creation for both types, normalization/duplicate rules, repeated submit, icon/protection semantics, confirmed archival and historical projections, empty/error/readiness states, virtualization/large text and nested Income creation. Existing Finance/Transactions/editor/ledger/Overview/Commitment coverage remains included.

TypeScript passed. ESLint retained six existing errors and two existing warnings, with zero added or removed diagnostics against the Transactions v2.2 baseline. Both iOS and Android SDK58 production JavaScript exports passed. `git diff --check` passed after the documentation handoff. All captures remain current: no UI changes followed the reviewed matrix. Detailed log paths and evidence limits are recorded in the capture index.

## Files modified in this stage

| Area | Files |
| --- | --- |
| Category management | `src/features/finance/components/category-manager.tsx` |
| Readiness integration | `src/features/finance/finance-screen.tsx` (`categoriesReady` prop) |
| Regression coverage | `tests/finance-categories-v2.test.ts`; `tests/adaptive-sheet.test.ts` (mock callback return type) |
| Review scripts | `scripts/preview-finance-categories.ts`; `scripts/review-finance-categories.cjs` |
| Documentation/evidence | This document; `docs/previews/finance-categories-v2/README.md`, 38 PNGs and `checks.json` |

Category services, seed identities, shared icon resolver, transaction editor, database/migrations and dependencies are unchanged. Work remains unstaged on `main`, with HEAD `5ddb625a`; no commit or push was performed.

## Physical testing still needed

On iOS and Android, verify native font measurement and largest text at narrow widths, scrolling with fixed Back, long unbroken names, actual software keyboard show/hide and focused-field reveal, Create/Archive control reachability, menu focus return, native Archive Cancel/confirm, Back/outside/OS dismissal, VoiceOver/TalkBack reading/selected/status announcements, safe-area boundaries and return to a parent transaction draft. Time genuinely large libraries on hardware. Browser screenshots, simulated keyboard metrics and JavaScript exports do not establish installed-device behavior.

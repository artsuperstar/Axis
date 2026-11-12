# Axis — Client Details v2

## Scope and existing behavior audit

Client Details remains a dialog owned by `WorkView`, presented in its existing `AdaptiveModal` over Clients Management. The existing modal, Back/outside/native-request dismissal, selection host, safe areas, keyboard measurements and focus handling are unchanged. This is a presentation extension of the established Warm Editorial Hearth system, not a new route, native sheet implementation or Work financial model.

Before this change, the client branch used the legacy sheet appearance, a plain financial summary, Add work before Record payment, a legacy menu and eager divider-separated Work rows. The large green surface and utility typography conflicted with the completed Clients Management and Job Details screens. The old rows also repeated the selected client's name and, when identical, the job title as its description. The replacement removes this repetition and connects the client heading, balances and actions with a compact content-driven composition.

The source audit established:

- Clients Management is an existing pushed destination. It loads compact `readOverview({ includeJobs: false })` totals; opening a client reads that client's open jobs. No client-row or job-row query is introduced.
- The selected client is a saved counterparty identity. Its available display field is its name; email, telephone, company description, avatar and authoritative job counts are not invented.
- Work-owned client totals already supply Earned, Received and Outstanding. The client component formats those values and does not recalculate them.
- Open jobs retain positive-outstanding eligibility and stable overdue-first ordering. A partially received job remains open while it has a balance.
- Actual client History already provides paged settled jobs and recorded receipts. The client overview projection does not include receipt rows.
- The supported client menu contains History and, for active clients, confirmed Archive. There is no supported rename, restore/unarchive, permanent Delete, Merge, Contact or Share action.
- Archived debt remains payable; archived identities cannot be chosen for new Work. Archival does not erase balances, allocations, receipts or historical names.
- Work mutation, focus and foreground refresh remain in their existing owners. Failed refreshes retain last-good data and expose existing error/Retry behavior.

## Mockup interpretation and visual result

The supplied target sets the compact sheet, warm neutral material, serif identity, one prominent Outstanding balance, paired secondary metrics, primary Record payment action, contained job rows and restrained dividers. Actual Work behavior and the written corrections take precedence over image artifacts.

The client name appears once inside Client Details. At ordinary sizes it sits beside Back and a shared person icon. Names longer than 50 characters or font scale at least 1.4 move into the scrolling body; Back remains outside that body. The redundant second identity block and generic “Client” filler are omitted.

One overview contains Outstanding above Earned and Received. Outstanding uses the existing editorial title face at the shared metric scale; secondary values use the existing interface typography. There is no additional Payment Status, duplicate financial card, percentage or progress ring.

The sheet opts into the existing v2 canvas, while job rows use `group` and `border`. Shared Lora/Manrope, theme colors, 4/8-based spacing, 16-unit content padding, rounded group rows and 48-unit touch minimums are reused. No global palette, custom content icon, photographic background, texture, shadow, glow, gradient or developer gear was added. Clients Management behind the modal is unchanged.

## Financial semantics and actions

Earned remains saved fixed/hourly compensation; Received remains actual recorded allocations; Outstanding remains the source-owned unpaid balance. Aggregate client totals remain BigInt centavos, formatted through `formatBrlAmount`. No floating-point money arithmetic, new ledger query or expected-payment-as-Income interpretation is introduced. Extreme formatted amounts wrap between digit groups while retaining every digit and the centavo pair.

Record payment is the primary action when the selected client's actual open jobs make it applicable, including an archived client with debt. It opens the existing client-first payment editor with the selected client ID. Multi-job allocation, partial receipts, exact amount validation, payment date/category, one linked Income transaction and atomic reversal remain unchanged. Add work is secondary and appears for active clients only; it opens the existing editor with that client's ID and retains hourly/fixed terms, duration, expected-date and save validation.

More retains the real History and confirmed Archive callbacks. A bottom View history row exposes that same existing client-filtered destination. Neither action silently unarchives a client. Moving between client, job, payment, editor and history dialogs retains `WorkView`'s established replacement/dismissal behavior; this change does not introduce a nested route stack or promise a different return destination.

## Open jobs, receipts and states

Open jobs render in one `FlatList` using stable entry IDs, six initial/batch rows and window size five. Its scroll component joins the existing sheet scroll/focus owner through `useSheetScrollProps`; there is no nested vertical scroller or fixed row-height assumption. The shared sheet measures content and caps it to available space; Client Details does not opt into forced full-height presentation.

Each row uses the generic briefcase icon, source title, actual work date, exact outstanding amount and explicit Outstanding, Partially paid or Overdue status. An expected payment date stays separately labeled. Description is shown only when nonempty and different from the title; the selected client's name is not repeated in every row. The final review removed a repeated Outstanding caption beneath the amount, leaving the visible status once. Tapping the row opens the existing Job Details with its real entry ID.

The optional Recent receipts preview is intentionally omitted. Trustworthy client-filtered recorded receipts remain available in the existing paged History; the overview itself has no receipt projection, and this visual task adds no receipt reads or aggregation. The mockup's zero-value expected/pending rows are fictional and were not copied. Shared receipt allocations and whole-Income Undo continue through the existing history workflow.

No-open-work and fully settled clients get the concise existing empty-work explanation and History access, with their actual zero/nonzero totals. Archived clients retain the archived notice, History and applicable debt payment while Add work/Archive are unavailable. An unavailable client gets a concise missing-record message instead of fabricated identity, financial summary or actions. No example jobs or receipt placeholders appear in empty states.

## Responsive layout and accessibility

At widths below 390 or font scale at least 1.3, main actions and job title/amount composition stack. Secondary financial metrics use the established width/font-scale/amount-length helper; long amounts use exact digit groups rather than truncation or numeric conversion. Large text removes redundant icon tiles and lets identity scroll. Stacked rows stretch to their available width so unbroken names and titles wrap instead of escaping horizontally.

Client identity and section names are headings. Financial metrics expose their full label and BRL value; job controls identify the title, outstanding amount, state and work date, with a Job Details hint. The history action identifies the client and its settled-job/recorded-receipt purpose. Shared icon, press feedback, focus, contextual-menu isolation and Reduced Motion behavior are retained. Status is written in text, not conveyed by color alone. Platform screen-reader focus and OS text rendering remain device checks.

The component performs no data access or financial aggregation. It sorts the supplied open-job array once per supplied array revision, formats supplied values, and keeps variable-height rows virtualized. Existing source projections, receipt reconciliation, allocation persistence, refresh ownership and native tabs are untouched. No dependency, schema or migration changed.

## Skills and incumbent-system comparison

- **frontend-design:** preserved the established Lora/Manrope editorial language and spent hierarchy on the one Outstanding balance, with a single client identity and quieter secondary values.
- **Impeccable:** audited whitespace, repetition, contained-row density and theme coherence. The independent review identified the duplicated Outstanding row caption; it was removed and the reviewer scored that correction resolved. Its formal native disposition remains **recapture**, because browser captures cannot substitute for native evidence. See the [exact review scope and disposition](previews/client-details-v2/finish-review.md).
- **UI/UX Pro Max:** applied verified native Dynamic Type guidance, readable base text, explicit action names, 48-unit shared targets, content-driven reflow and variable-height virtualization without fabricated `getItemLayout` values.
- **Expo building-native-ui:** checked SDK 58 guidance and the installed shared modal/scroll architecture. Preserved the current safe-area, Back, keyboard and selection ownership instead of changing navigation to match a picture. See the [versioned Expo reference](https://docs.expo.dev/versions/v58.0.0/).

This is an ordinary extension of the incumbent system evidenced in [Job Details v2](finance-work-job-details-v2.md), [Clients Management v2](finance-work-clients-v2.md), [Record Payment v2](finance-work-record-payment-v2.md) and `src/constants/design-system-v2.ts`. Their fonts, role tokens and shared controls remain the authority. No global system files were changed. Existing context drift was observed: `PRODUCT.md` still mentions SDK 57 while `package.json` is on SDK 58, and root `DESIGN.md` is absent. This task does not repair or canonize that unrelated drift.

## Evidence and validation

See the [capture matrix and reproduction notes](previews/client-details-v2/README.md). The final browser matrix reports **44 cases, 86 original captures and 11 contact sheets**, covering both themes, 320/390/430/768 widths, doubled CSS text, populated/partial/settled/empty/archived/stress states, long content and the six actions. Horizontal text bounds and bottom History reachability pass. The actual source components are rendered through React Native Web using source-generated synthetic SQLite snapshots. This is layout/action evidence, not physical-device certification.

The actual pre-change automated baseline was **1,440/1,440 passing**. Fourteen focused Client Details tests were added. Existing Work experience assertions were adapted to identify the redesigned client metrics/rows without changing expected financial results. Mounted tests cover source totals, open-job filtering/order, client preselection, multi-job partial payments, shared-receipt Undo, archived debt, empty/settled states, refresh failure/Retry and long BigInt values at six width/font-scale combinations.

| Validation | Recorded result |
| --- | --- |
| Focused Client Details | 14/14 pass |
| Clients, Job Details, payment, Work, history and navigation regressions | Initial scoped selection 115/115 pass; final expanded Work/source/modal/navigation/context-menu/refresh selection 209/209 pass |
| Full automated suite | Final implementation: 1,454/1,454 pass, versus 1,440 pre-change |
| TypeScript | Final implementation: pass, exit 0 |
| Changed-file ESLint | Final implementation: pass, exit 0 |
| Full ESLint comparison | Eight diagnostics before/after, identical: six existing errors and two warnings; no new diagnostics or suppressions |
| iOS and Android exports | Both final exports pass, exit 0 |
| Browser recapture after caption correction | 44 cases / 86 originals pass |
| `git diff --check` | Pass, exit 0; documentation whitespace/conflict-marker check also clean |

Command logs and build artifacts are retained under ignored `dist/client-details-v2/`, `dist/client-details-v2-ios` and `dist/client-details-v2-android`. Full lint retains its existing nonzero exit rather than being presented as a clean lint pass. Its errors are `react/no-children-prop` in existing context-menu/navigation/transactions tests; the two unused-variable warnings remain in tasks tests.

## Native acceptance still required

The independent Impeccable finish review's disposition is **recapture**, not native ship. No iOS/Android simulator or device capture is available in this Windows review environment. Obtain native captures for populated, empty, archived, long/bottom, menu and action-navigation states in both themes with large OS text; include tablets if they are a shipped class. Then check intrinsic sheet sizing, supported dismissal gestures, Android Back, outside dismissal, keyboard avoidance, nested menu/picker focus, VoiceOver/TalkBack, OS font scaling, scroll performance and final-row safe-area clearance. Exports and mocked browser/component tests do not certify these runtime qualities.

## Files and Git preservation

- `src/features/finance/work/components/work-client-details.tsx`: new presentation component and virtualized sheet body.
- `src/features/finance/work/components/work-view.tsx`: minimal client-dialog integration; removes the old local summary/rows without changing source callbacks.
- `tests/work-client-details-v2.test.ts`: fourteen focused integration cases.
- `tests/work-experience.test.ts`: updated client metric/row selectors; financial assertions retained.
- `scripts/preview-client-details-v2.ts`, `scripts/review-client-details-v2.cjs`: source-backed review builder and matrix.
- `docs/previews/client-details-v2/`: capture manifest, originals, contact sheets and evidence README.
- `docs/finance-work-client-details-v2.md`: this record.

The worktree was clean at task start on `main`, HEAD `67183d9`. This task does not reset, clean, commit or push. Domain/data, schemas, migrations, dependencies, persistence, native tabs, other Work screens and the underlying Clients Management design remain unchanged.

Final recorded status has two modified tracked files (`work-view.tsx` and `tests/work-experience.test.ts`) and six untracked path groups containing the component, focused test, two scripts, feature document and preview evidence directory. Nothing is staged, committed or pushed.

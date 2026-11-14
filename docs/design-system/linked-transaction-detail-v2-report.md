# Phase 3D-M.1 — Linked Transaction Details

Implementation complete; physical-device acceptance remains separate. No stage, commit, or push. Manage Commitments is deferred to 3D-M.2.

## A. Executive summary

Migrated the existing `TransactionDetail` caller to explicit shared v2 contracts. Only one runtime file changed in this phase: `src/features/finance/components/transaction-detail.tsx` (14 added / 14 removed lines).

The sheet now uses canonical Soft Copper surfaces, Manrope operational typography, semantic income/expense amounts and 48pt shared buttons. The existing amount formatter, metadata, conditional sections, callbacks, source policies, financial services, lists, native tabs, safe-area ownership and modal handoffs are unchanged. No parallel detail implementation, route, dependency, schema or persistence change.

## B. Root cause

The active caller omitted `appearance="v2"` on `AdaptiveSheet` and both `FormButton`s, and rendered its financial content with legacy `ThemedText`. Income used legacy `success`; expense used ordinary primary text. It therefore retained legacy overlay colors, system typography and 44pt controls after shared components had gained opt-in v2 contracts. There were no local decorative surfaces or source-data defects to repair. Shared defaults remain untouched.

## C. Entry points and source matrix

`FinanceScreen.openTransaction` reads `snapshot.ledger.sources[transaction.id]`. Only the real `TransactionSource` union (`work` or `commitment`) opens this sheet. Ordinary ledger entries open the existing editor directly. `TransactionRow`'s linked **View payment details** menu action reaches this function; its fallback uses the same existing edit callback. Work history and Commitment history keep their own existing source presentations; they do not become additional callers of this sheet.

| Record | Owner and displayed data | Permitted actions | Restricted / absent actions | Handoff / confirmation |
|---|---|---|---|---|
| Ordinary ledger entry | Finance owns creation, type and positive integer-centavo amount; ordinary row/editor shows its description, signed formatted amount, date and category. No ordinary-detail route exists. | Existing Edit, ordinary Delete. | No invented linked source action. | Opens existing editor directly; Delete uses existing native confirmation. |
| Work receipt, one or multiple jobs | Work owns receipt creation and amount through allocations. Sheet uses the same transaction ID, source client/jobs, derived payment title, actual received amount/date, optional category/note; Covered jobs appears only for multiple jobs. | Open Work, Edit details, Back/dismiss. Existing editor permits metadata/date corrections. | Type locked to income; amount read-only and data-layer allocation-sum guard retained. No sheet Delete/Reverse; linked row has no Delete. | Native dismissal completes before existing editor or Work workspace opens. Work owns Undo payment and its existing confirmation. |
| Commitment payment: Bill, Subscription, Installment | Commitments owns creation and payment occurrence linkage. Sheet shows source name, actual recorded expense/date, optional category/note. Source reference retains commitment ID and due date; it does not replace actual payment date. | Open Commitments, Edit details, Back/dismiss. Existing editor allows actual amount/date/metadata corrections. Linked transaction row retains Delete payment. | Type locked to expense. Generic ledger delete rejected. No sheet Delete/Reverse/Pay or lifecycle actions. | Dismissal completes before editor or Commitments workspace. Row Delete payment verifies the current source link, then native confirmation removes the expense and marks that occurrence unpaid. History Undo/reopen remains source-owned. |

The distinction between Work's locked amount and Commitment's editable actual amount is deliberate existing product behavior. No stricter policy was inferred from brief examples, and no additional permission was added.

## D. Exact runtime changes

In `TransactionDetail` only:

- `AdaptiveSheet`: added `appearance="v2"` and `titleRole="operational"`.
- All content `ThemedText` nodes: replaced with `UiText` and canonical color props, retaining text, conditionals, keys, roles and order.
- Amount: retained `display.amount`; changed only the color binding to `financeIncome` / `financeExpense`.
- Source navigation and Edit details `FormButton`: explicit `appearance="v2"`; existing primary/default variants and handlers retained.

`AdaptiveModal` visible/onDismiss/onClosed props, existing `Space.lg` padding, `Space.xl` group gap and `Space.sm` metadata gap are unchanged. No new status badge, icon tile, duplicated amount, new field, loading lifecycle or empty state.

## E. Visual contract and skill findings

| Element | Contract |
|---|---|
| Sheet | Existing AdaptiveSheet v2 canvas/border/shape; dark `#151315`, light `#F5F0EA`; shared native host and scrim unchanged. |
| Title / section headings | Manrope operational `sheetTitle` (18/24), existing `cardTitle` (16/24); no new editorial Lora title. |
| Body / metadata | Canonical body / metadata roles, primary and secondary text colors; optional fields remain optional. |
| Amount | Existing metric role, tabular figures; income `#A8D0B7` / `#32664E`, expense `#F1A9B4` / `#94455C`. Expense is not danger. |
| Actions | Primary source-navigation button uses brand copper `#E7AA8B` / `#874833`; secondary Edit details uses neutral control and border. Shared pressed, disabled, focus and Reduced Motion behavior inherited. |
| Feedback | Existing feature-owned `SheetRefreshContext` error/retry now receives explicit v2 appearance through AdaptiveSheet; no new error state machine. |

Actual skill contributions: **frontend-design** kept the existing compact Finance hierarchy and operational Manrope roles; **Impeccable** identified the missing caller boundary, compared matching content/geometry and rejected decorative nested cards; **UI/UX Pro Max** guided source-action clarity, semantic money colors, contrast and restricted-field review; **Expo building-native-ui** kept SDK 58 modal, focus/scroll/selection host, native-tab and safe-area ownership intact. Installed UI/UX guidance was applied; its Python search was unavailable in this environment. No replacement package was installed.

Expo SDK was verified as `~58.0.17`; the [matching documentation](https://docs.expo.dev/versions/v58.0.0/) and [official index](https://docs.expo.dev/llms.txt) were consulted. No Expo or React Native API was replaced.

## F. Financial integrity

No money arithmetic or parsing changed. Production presentation still formats the stored positive integer centavos and adds a minus sign only for expenses. Work allocations retain their integer / BigInt sum guards; no allocation is inferred from display text.

Frozen SQLite-generated review examples include Work `R$ 200,01`, multi-job Work `R$ 200,02`, and Commitment actual `-R$ 151,23` against expected `R$ 150,00`. The maximum supported amount is `9,007,199,254,740,991` centavos, displayed as `R$ 90.071.992.547.409,91`. Amount, source references, IDs, dates and categories are identical across captures; each phase records the same fixture SHA-256. The long-text scene is explicitly a presentation stress proxy using extended strings, not a new persisted source state.

Zero/negative stored amounts are unsupported by existing validation; no fake zero linked payment was added. Existing parsing/financial tests cover those rejections. Paid/pending/skipped statuses, due dates, installment completion, catch-up, pause/resume/end, source history, partial payments and balances remain owned by unchanged services.

## G. Navigation, modal and list preservation

FinanceScreen still queues the selected detail action, hides its native modal, and on iOS executes the queued action only from `onClosed` / native `onDismiss`. Other platforms retain the existing next-frame completion. The chosen transaction/source object is retained for editor flags. Open source sets the existing source-workspace guard and navigates to the owning workspace; it does not invent an individual-record route or reopen an unrelated Home/Calendar initial record.

No new confirmation is required for Back, Edit or Open source. Existing source-owned destructive confirmations are unchanged. Tests verify one modal, deferred editor/source opening, locked type/Work amount, editable Commitment amount, cancellation without writes, stable originating SectionList identity and unchanged database rows. Source navigation leaves the original Finance workspace shell in control.

Transaction search/filter, grouping, ordering, paging, selected IDs, SectionList settings and scroll offsets were not edited. Existing menu focus restoration, accessibility escape, keyboard avoidance, selection host, tab bar and safe-area contracts remain inherited; actual native focus and scroll restoration still require physical testing.

## H. Visual comparison and geometry

[Compact before/after gallery](linked-transaction-detail-v2/index.html): 20 pairs, 40 PNGs total. Both themes cover single Work, Commitment, multi-job Work, long text at 320pt/2x, maximum amount at 430pt, inherited refresh failure, ordinary editor, protected Work editor, Work financial summary and Commitment details. No hundreds of duplicated captures.

All 20 pairs use an identical frozen source fixture. All rendered financial/content text remains identical after accounting for the intended replacement of the visible legacy Back arrow character with the shared icon. The raw text comparison records that character difference explicitly. All eight preservation-control pairs are byte-identical. There were no unexpected visual differences in those controls.

| Measurement at 390 × 844, normal text | Before | After |
|---|---:|---:|
| Work sheet height | 532 | 538 |
| Commitment sheet height | 400 | 406 |
| Back hit area | 46.09 × 44 | 48 × 48 |
| Source / Edit buttons | 358 × 44 | 358 × 48 |
| Source button top | 717 | 709 |
| Edit button top / bottom | 785 / 829 | 781 / 829 |
| Last-action bottom spacing | 15 | 15 |
| Header type | system 18/24 | Manrope 18/24 |
| Action label | system 14 | Manrope 15 |

The shared v2 header accounts for the compact net 6pt height change. No fixed-height reservation, arbitrary offset, extra bottom padding or new layout wrapper was added. All existing source-group spacing is retained. Narrow or doubled-text headers use the shared stacked operational header. Long bodies scroll naturally.

## I. Accessibility

42 browser groups: 36 geometry groups (two themes × 320/390/430 × normal/doubled text × long/Commitment/max-amount), four protected-editor/source-action groups, two retry/dismiss groups. Back and final Edit actions are at least 48pt and reachable in the 844pt viewport; no horizontal page overflow or clipped text; final Edit has a visible 2px keyboard focus outline. The browser uses real RNWeb components and a text-scaling proxy, not native Dynamic Type proof.

Measured contrast, dark / light: primary text 16.38 / 14.51; metadata 10.08 / 5.52; income 10.89 / 5.89; expense 9.75 / 5.68; primary action 8.47 / 6.64; pressed primary 10.08 / 8.62; secondary action 13.04 / 14.92. All exceed 4.5:1. Focus on canvas is 9.26 / 6.17. Source labels and expense minus signs remain explicit; color alone does not express source ownership. Existing heading roles and reading order remain intact.

Native VoiceOver/TalkBack amount announcements, initial/return focus, actual font scaling, theme changes and safe-area clearance are still acceptance work. No claim of device acceptance is made from screenshots or exports.

## J. Tests and validation

Deterministic timezone: `America/Sao_Paulo`.

| Check | Result |
|---|---|
| Initial full suite | 1,571 pass, 0 fail/skip |
| New linked-detail tests | 13 pass; both themes and every real linked kind; database no-write/source restrictions; native iOS handoffs; ordinary direct editor |
| Relevant regressions | 719 pass; Finance/Overview/charts, Transactions/editor, Commitments/history/payment, Work/allocations/receipts/client, money, shared controls/sheets/menus, navigation and read behavior |
| Final full suite | 1,584 pass, 0 fail/skip |
| React act warnings | 66 → 66; no suppression; new focused tests emit zero |
| TypeScript | Pass before and after |
| Changed-file ESLint | Pass |
| Full ESLint | Exact baseline diagnostic match: six errors, two warnings; zero introduced |
| Browser review | 20 paired captures; eight unchanged controls; 42 interaction/layout groups |
| iOS export | Pass, production Hermes bundle ~5.2MB |
| Android export | Pass, production Hermes bundle ~5.4MB |
| Diff / integrity | `git diff --check` passes; only one initial runtime file changed; callbacks/presentation inputs AST-equivalent |

Full lint findings remain in the pre-existing context-menu, navigation-conventions, tasks-experience and transactions-experience tests. No existing financial expectation was altered. During harness development a duplicate seeded category name and two incorrect browser locator labels were corrected in new review code only.

## K. Complete phase file inventory

Runtime:

- `src/features/finance/components/transaction-detail.tsx`

Tests:

- `tests/linked-transaction-detail-v2.test.ts`

Scripts:

- `scripts/preview-linked-transaction-detail.ts` — SQLite fixture and actual-component preview; saved before source is loaded through esbuild without rewriting runtime files.
- `scripts/review-linked-transaction-detail.cjs` — paired captures, geometry, fixture hashes and gallery.
- `scripts/check-linked-transaction-detail.cjs` — layout, reflow, focus and permitted-action checks.
- `scripts/audit-linked-transaction-detail.cjs` — initial-tree hashes, callbacks, lint, tests, paired content and Git audit.

Documentation:

- `docs/design-system/linked-transaction-detail-v2-report.md` — this report.
- `docs/design-system/linked-transaction-detail-v2/{initial-state,before,after,comparison,fixture,interactions,audit}.json`
- `docs/design-system/linked-transaction-detail-v2/index.html`
- Forty PNGs under `docs/design-system/linked-transaction-detail-v2/{before,after}/`: `work-{dark,light}-390`, `commitment-{dark,light}-390`, `multi-{dark,light}-390`, `long-{dark,light}-320`, `large-{dark,light}-430`, `refresh-{dark,light}-390`, `manual-{dark,light}-390`, `editor-{dark,light}-390`, `work-source-{dark,light}-390`, `commitment-source-{dark,light}-390` (each with `.png`).

Total: one changed initial file and 54 new files (55 phase paths). Ignored `dist/linked-transaction-detail-v2` contains temporary logs, original source copy and platform exports; `dist/linked-transaction-detail-atlas` contains the browser bundle. Earlier phase files and evidence are preserved.

## L. Audit status

**VU-03: implementation-resolved**, with physical acceptance pending. This removes its missing v2 caller/typography/action boundary. VU-05 (sheet appearance), VU-10 (operational typography), VU-13 (48pt geometry) and VU-19 (inherited refresh feedback) are applied locally; no global issue was silently closed. The main audit/specification/traceability files were preserved instead of rewriting earlier phase evidence.

## M. Exact Phase 3D-M.2 handoff — Manage Commitments

Scope only the remaining `surface === 'manage'` presentation in `src/features/finance/commitments/components/commitments-view.tsx`. Entry: Finance → Commitments → **Commitment options → Manage commitments**; this is an in-place workspace surface, not a route. Back returns to obligations. A manage row opens existing Commitment details; Series options opens existing Edit/Pause/Resume/End/History actions.

Legacy boundaries: manage header/back, `seriesRow` name/amount/schedule/progress and paused-installment guidance still use `ThemedText`; `StatusText`, `ContextMenu`, and manage `FormError` omit v2 appearance. Adopt existing `UiText` operational roles, explicit v2 Back/navigation/context-menu/error/status contracts, and restrained existing surfaces. Do not change shared defaults or the already-v2 obligations, global history index, details, individual history, editor, payment or resume screens.

Preserve actions exactly: Edit; confirmed Pause only for active; Resume only under `canResume`; confirmed destructive End only for non-installments in active/paused states; History. Paused installments with all due dates already assigned keep their existing resolve-unpaid guidance. Status and resolved installment progress remain source-derived; neutral expected amounts do not become overdue merely from their value. Preserve schedule versions, catch-up, status calculations, payment confirmations, undo/delete link checks and retained history.

Retain SectionList stable commitment-ID keys, existing ordering/section construction, scroll offset restoration, `initialNumToRender=6`, `maxToRenderPerBatch=6`, `windowSize=5`, `removeClippedSubviews=false`, current keyboard/selection host and inset ownership. Manage is not the paged occurrence-history surface: do not invent management paging, and preserve existing individual-history continuation through `nextBefore`/append.

Suggested tests: all three kinds and active/paused/ended/completed states; canResume/non-resumable installment guidance; unchanged expected amounts/date/version metadata; active-only Pause and non-installment End native confirmations; cancel causes no write; Edit/Resume/History/details handoffs; refresh error retains list; stable keys/offsets; both themes and 320/390/430 normal/2x. Physical checks: VoiceOver/TalkBack, actual menu focus/return, native alert cancellation, back/dismissal, keyboard and last-row clearance. No shared dependency discovered here requires broadening M.2.

## N. Remaining risks and native acceptance

Keep separately open: **bare-host RNWeb Escape** during some typing/selection flows; **constrained-height header** under extreme long editorial titles plus narrow width, doubled text and keyboard. This operational read-only detail passed the tested 320pt/2x header/body matrix; it does not fix or close either shared issue. Its editor and source screens remain unchanged.

Still test on physical iOS/Android: Transactions → linked detail → Edit/Cancel → parent, detail → each source workspace, Android hardware Back, iOS accessibility escape, no duplicate modal during native dismissal, focus restoration, real theme switching, keyboard/text selection in the unchanged editor, native Delete payment/Undo confirmations, system large text, and final-action/scroll restoration with actual insets. Browser callback demos do not simulate the native dismiss-completion sequence; actual FinanceScreen tests cover that contract, but device timing remains an acceptance gap.

## O. Git and preservation

Initial: main at `16ebeab46d20e7a943f08fa017928ce0eb884c0e`, 40 modified tracked files, 907 untracked, nothing staged. Final: 41 modified tracked files, 961 untracked, nothing staged, same HEAD. All 3,453 unaffected initial files retain their initial byte hashes; the only changed initial file is TransactionDetail. Prior changes/evidence/reports/scripts remain intact. No commit or push.

Machine-readable verification and full new-file list: [audit.json](linked-transaction-detail-v2/audit.json). Review source fixture: [fixture.json](linked-transaction-detail-v2/fixture.json). Native limitations are explicit above.

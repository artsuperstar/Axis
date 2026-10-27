# Finance Global Commitment History Index v2

This ordinary extension redesigns the global History index inside Finance Commitments. Each card represents one commitment and opens its existing Individual Commitment History v2. The incumbent Warm Editorial Hearth system, Finance shell, native tabs, domain services and prior Resume/Details/Individual History work remain authoritative. **Final independent disposition: RECAPTURE for missing native finish evidence.** This is an evidence disposition, not a UI rejection or ship verdict; no whole-surface approval is claimed.

## Existing Global History behavior audit

The pre-edit owner snapshot is `dist/commitment-history-index-v2/commitments-view-before.txt`; current behavior is grounded in `commitments-view.tsx`, `data.ts`, `finance-screen.tsx` and `app-tabs.tsx`.

1. Global History is local `surface='history'` inside CommitmentsView, entered through Commitment options → History, without a new route.
2. Back to Commitments changes that surface to obligations. Finance route ownership, header, internal Finance navigation and native tabs remain unchanged.
3. `read()` excludes soft-deleted parents and preserves all parent lifecycle states. It orders saved title ascending, then real commitment ID ascending.
4. The index filters those supplied items by `resolvedCount > 0`, preserving their order; it does not include every saved commitment.
5. Names are the actual saved commitment titles. No merchant or example identity is substituted.
6. The shared type resolver supplies Bill → Receipt, Subscription → Repeat, Installment → Layers. Names do not determine icons.
7. Parent lifecycle is explicitly Active, Paused, Ended or Completed, independently of occurrence outcomes.
8. `resolvedCount` is the lifetime count of retained, nondeleted, non-Pending occurrence keys: Paid plus Skipped. It excludes Pending and derived Overdue.
9. `totalPaidMinor` is the existing BigInt sum of validated integer-centavo amounts from linked actual Paid payments. Expected amounts, installment progress and visible individual pages are not inputs.
10. Skipped-only history legitimately contributes a positive count with Paid R$ 0,00. Zero money does not make that record ineligible.
11. Existing payment reversal/reopening and reconciliation change both aggregate values and eligibility. A reopened final historical occurrence can remove the index card.
12. The bulk reader loads parents, schedule versions, occurrence keys, Pending rows and linked payments, groups them by parent and projects items. Cards issue no per-card query.
13. Category information is not required for this global navigation summary; individual History retains its own historical category presentation.
14. Finance owns initial loading, refresh failure and Retry. Failed refresh retains the previous snapshot instead of replacing valid summaries with empty data.
15. Empty History preserves “No paid or skipped occurrences yet.” and Back navigation, including emptiness after mutation.
16. The existing SectionList has six initial rows, six per batch, window size five, stable ID keys and variable-height rows. The global index has no pagination cursor.
17. Individual History independently reads twelve-month windows and appends earlier pages. Global lifetime totals do not come from those pages.
18. A card calls `openDetails(item, true)`, passing the real ID to the existing reader and selecting the Individual History branch in the retained modal.
19. Closing Individual History leaves the local index surface and its mounted list behind the modal. View commitment continues to open existing Details within that modal.
20. Existing `mutate`/Finance reload refreshes aggregates after Undo payment/Reopen; existing details refresh retains its loaded historical span. No card-side aggregation or new invalidation system is introduced.
21. Existing Finance scroll-offset refs and owner callbacks remain unchanged. Retaining a mounted index supports its existing context; this pass makes no broader cross-route, remount or native focus-restoration guarantee.
22. Finance's experimental react-native-screens SafeAreaView owns all four edges under the Finance NativeTabs trigger with `disableAutomaticContentInsets`. The list keeps `contentInsetAdjustmentBehavior="never"` and its existing 32-unit bottom padding.
23. Existing persistence, schedule versions, lifecycle transitions, linked ledger/payment reversal rules, category archival, local dates, schemas and migrations remain unchanged.

## Previous screen and new visual structure

Previously History used the shared management-style divider rows: name and Paid value, neutral kind/lifecycle status and historical count. It already navigated to individual History. The supplied single-screen mockup is the primary composition reference for the replacement: contained compact cards, a generic type tile, saved name, kind/lifecycle, historical count and an exact Paid value beside a genuine navigation chevron.

The introduction retains **Commitment History** and “Choose a commitment to view its paid and skipped occurrences.” Back sits beside the practical sans-serif `sectionHeading`, consistent with the mockup. Existing Finance editorial hierarchy uses Lora; interface text and values use Manrope. This change does not restyle the Finance header or its tabs.

Cards use the existing group surface, quiet border, rounded group shape, 12-unit internal padding and eight-unit list separation. The compact tile uses the shared resolver. Saved titles have natural wrapping and no fixed line cap. Kind and parent lifecycle share one line of text; the next line explicitly says “N paid or skipped.” No redundant lifecycle badge, category panel, nested Paid surface, invented menu or external image is added.

## History count, actual money and lifecycle

The count and Paid value express different facts. A Skipped occurrence contributes to the count and no actual payment; a Paid occurrence contributes its retained resolution and linked actual payment. Thus positive history with zero Paid total is valid. The label remains “paid or skipped,” rather than implying every resolution was paid.

Actual money continues through `formatBrlAmount(item.totalPaidMinor)`. It is exact BRL, retains centavos, uses no abbreviation and never sums scheduled expectations or floating-point card values. Existing authoritative reconciliation handles reversed payments. Tests include an aggregate greater than Number's safe-integer range and history outside the initially loaded individual window.

Active, Paused, Ended and Completed parents remain eligible when they have qualifying history. Pending-only and soft-deleted parents remain excluded. Sorting stays saved-title ascending with ID ascending as the tie-breaker; it is not replaced by amount, lifecycle or mockup order.

## Navigation, refresh and empty states

The entire card is the one navigation button. It opens the existing Individual Commitment History with the correct commitment ID, not an alternative destination. That screen continues to own occurrence detail, earlier twelve-month pages, Undo payment, Reopen and View commitment. The global index remains a lifetime per-commitment summary.

Back from individual History dismisses its retained modal, exposing the mounted index. Existing confirmed historical mutations reload authoritative Finance data and recompute totals, counts and collection eligibility. Tests exercise Cancel, Undo payment and Skipped Reopen, including removal of the final eligible card and no invented ledger write for Skipped. Failure and Retry preserve the last good Finance snapshot. The compact empty message remains available after an empty read or final reversal.

## Responsive layout and accessibility

Normal cards use measured flex layout for identity and right-aligned Paid total. The total moves to a lower aligned row at width below 360, font scale at least 1.5, saved title length above 45 or formatted amount length above 16. Flexible text columns and variable height preserve identity and money without horizontal scrolling or fixed-height blank space. The Paid text also has a zero minimum width and 100% maximum width so exceptionally long money can wrap inside the available row. All values remain full text; no maximum font-size multiplier or truncation is added.

Each card has role button, exact label `History for {saved name}`, hint “View paid and skipped occurrences.” and accessibility-value text containing kind, lifecycle, count and “Actual paid total” with formatted money. Type icons and chevrons are decorative through the shared icon primitive; cards contain no nested controls. The shared 48-unit minimum target and UiPressable Reduced Motion behavior remain in use. Header role and readable subtitle remain available.

The existing SectionList bounds mounted presentation with initial/batch six and window five; no fixed `getItemLayout`, nested vertical scroller, eager card-owned history read or new global paging is introduced. A 125-commitment test verifies source order, ID keys and absence of per-card history reads. Browser scenes separately demonstrate reaching the final record.

## Native tab clearance and visual system

Production retains Finance's existing safe-area ownership, native-tab inset opt-out, list automatic-inset opt-out and 32-unit list padding. No tab bar is recreated. The browser harness reserves a 70-pixel lower boundary to inspect list reachability; that is a test boundary, not the real native tab bar or proof of device clearance.

Light/dark cards reuse existing provisional v2 cream/charcoal surfaces, plum accents, borders, typography and shapes from `src/constants/design-system-v2.ts`. There are no gradients, glass effects, decorative shadows, imagery or shell changes. Global palette unification remains deferred. PRODUCT.md's SDK57 text and the missing root DESIGN.md are pre-existing drift; this scoped extension neither repairs them nor creates a new global design system.

## Material skill contributions

- **frontend-design:** Established the mockup's compact navigation hierarchy, balanced identity against exact Paid totals and retained useful list density.
- **Impeccable:** Compared the supplied composition, audited whitespace, nested surfaces, name/value collisions, navigation consistency and theme parity; scoped documentation records local decisions while preserving incumbent system files.
- **UI/UX Pro Max:** Applied the verified ARIA Labels and Essential Text Truncation guidance: a clear subject-specific navigation label, textual lifecycle/count/actual-money context, complete names and amounts, and meaningful zero-paid history.
- **Expo review:** Checked SDK58 SectionList and native inset ownership guidance against the existing architecture; retained variable-height virtualization, shared touch/motion primitives and Finance's safe-area owner. Exports are build evidence; device focus, gestures, Dynamic Type and tabs still need native review.

## Browser evidence and review limits

The [capture index](previews/commitment-history-index-v2/README.md) describes real CommitmentsView, header, cards, SectionList and selected Individual History rendered through RN Web. Migrated SQLite services create synthetic domain-compatible fixtures at 2026-10-26; no production sample commitment is added. The Finance shell is projected unchanged. Native APIs, date picker, focus, animation and font-scale boundaries are substituted; doubled DOM text/fontScale is an approximation.

The matrix contains 20 base scenes and 42 original PNG captures across both themes, 320/390/430 widths, simulated doubled text, long/unbroken identity, exact large BigInt money, 555 historical resolutions, all three types, same-type icons, all four parent states, Skipped zero totals, empty/reversed history, a 125-item collection, selected/returned History and scrolled bottoms. Seven derivative contact-gallery PNGs (`contact-1` through `contact-7`) aid review; they add no cases. The implementation owner inspected all seven galleries and key originals. Browser callbacks demonstrate navigation; SQLite integration tests establish write correctness.

The first matrix found maximum-money glyph overflow in six doubled-stress scenes. Constraining the amount text's flex width resolved that finding; the complete regenerated matrix records 20 checks with zero page errors, glyph/region overflow or page-level horizontal overflow. The introduction also gained a practical 16-unit gap before the first card. Bounds checks do not replace complete visual evidence: the doubled browser top/bottom images do not visibly show the tall stress card's full Paid total.

The fresh independent reviewer verified all 42 originals exist at their declared dimensions, inspected all seven contact galleries and five full-size originals, and reviewed the new source. The persisted report is `dist/commitment-history-index-v2/finish-review.md`. Its exact disposition is **RECAPTURE** because native finish evidence is absent; it issues no build-defect finding, fidelity matrix or whole-surface approval. Missing evidence includes actual iOS/Android populated dark/light layouts with native tabs and bottom clearance, real enlarged text, complete stress-card identity/count/money, and native navigation/return/focus/screen-reader results. A fresh full review is required after native captures exist. adb/emulator/xcrun/default SDK tooling is unavailable in this environment; exports and browser checks leave this gate open.

## Tests and validation

Verified packet logs are under `dist/commitment-history-index-v2/`:

| Check | Recorded result |
| --- | --- |
| Actual pre-edit full suite, `baseline-full-suite.log` | 1,334 passed, zero failures |
| Full suite, `final-full-suite.log` | 1,341 passed, zero failures; before final presentation-only gap/amount-width corrections |
| Focused regressions, `focused-regressions.log` | 594 passed, zero failures |
| New `commitment-history-index-v2.test.ts` cases | Seven cases included above; all seven passed again after the final presentation correction |
| TypeScript, `typescript.log` | Final run exited zero with an empty log |
| ESLint baseline/final JSON | Six errors/two warnings in each; normalized file/rule/severity/message/position diagnostics match |
| iOS / Android exports | Both final runs exited zero after the amount-width correction |
| Browser, `browser-review.log` / `checks.json` | 20 scenes, 42 original captures plus seven derivative contact galleries, zero recorded failures after correction |
| Whitespace | `git diff --check` passed; both new documents have no trailing whitespace and end in newlines |

The seven new cases cover authoritative inclusion/order/lifecycles/counts, exact totals beyond safe integers and individual paging independence, selected-ID navigation and Undo refresh, Skipped Reopen/zero money, 125-item virtualization/keys/no-history-N+1, empty/failure/Retry snapshot retention and 320-width doubled-text uncapped accessible content. Focused/full runs retain lifecycle, linked payment reversal, Finance ledger/Overview, Calendar and Journal projection coverage.

## Files and worktree

| Area | Files for this extension |
| --- | --- |
| Presentation | New `src/features/finance/commitments/components/commitment-history-index.tsx` |
| Integration | Narrow History header/card/empty/error appearance changes in `commitments-view.tsx` |
| Tests | New `tests/commitment-history-index-v2.test.ts` |
| Evidence | `scripts/preview-commitment-history-index-v2.ts`, `scripts/review-commitment-history-index-v2.cjs`, capture directory |
| Documentation | This record and capture README |

Existing uncommitted Resume, Details, Individual History and related test/evidence work is preserved. No reset, clean, staging, commit or push is part of this pass. No schema, migration, persistence, schedule, domain, dependency, unrelated UI or global design-file change is authorized here.

## Physical testing still needed

On iOS and Android, identify the OS/device, viewport and actual font scaling. Capture populated dark/light layouts, unchanged Finance shell, real native tabs/system insets and the fully readable/tappable last card. Include applicable narrow/standard/wide phone layouts near doubled OS text size and overlapping scroll captures where a card exceeds one viewport, visibly retaining the full long saved title, lifecycle, 555 paid/skipped count, complete **Paid R$ 180.143.985.094.819,82** and chevron. Include other device classes if they are shipped targets.

Capture correct selected-ID navigation to existing Individual History and return to the index. Pair images with native Back/gesture, focus return, VoiceOver/TalkBack announcement of accessibility values and last-card activation results; screenshots alone cannot establish these interactions. Confirm live Undo/Reopen aggregate refresh and final-card removal, refresh failure/Retry and physical large-list performance. The final disposition remains RECAPTURE until the native evidence exists and receives a fresh full review.

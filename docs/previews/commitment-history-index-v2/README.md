# Finance Global Commitment History Index v2

These RN Web captures exercise the real global index and selected Individual Commitment History within real CommitmentsView. **Final independent disposition: RECAPTURE for missing native finish evidence.** This is an evidence disposition, not a UI rejection or ship verdict. Native-device clearance, screen readers, Dynamic Type, focus, gestures and performance remain unverified; no whole-surface approval is claimed.

## Reproduce

From the project root:

```powershell
$env:ESBUILD_WORKER_THREADS='0'
node node_modules/tsx/dist/cli.mjs scripts/preview-commitment-history-index-v2.ts
node scripts/review-commitment-history-index-v2.cjs
```

Preview build output is ignored under `dist/commitment-history-index-v2-preview`. Playwright/Chromium locations can be overridden with `AXIS_PLAYWRIGHT_PATH` and `AXIS_CHROMIUM_PATH`. `AXIS_REVIEW_CASE` selects one scene for investigation; it overwrites checks.json with that subset, so rerun the full matrix for final evidence. No application dependency is added.

## Matrix

There are **20 base scenes and 42 original PNG captures**: eighteen scrolled-bottom views and four selected/returned views supplement the base captures. Seven derivative contact-gallery PNGs (`contact-1` through `contact-7`) collect those captures for review and add no cases. The implementation owner inspected all seven galleries and key originals. The viewport is 844 pixels high; doubled scenes approximate fontScale=2 and enlarge DOM font/line-height values.

| Files | Evidence |
| --- | --- |
| `mixed-{320,390,430}-{dark,light}.png` and `*-bottom.png` | All three kinds, same-type generic icons, all four parent states, positive count with zero Paid, multiple payments and long title |
| `mixed-390-{dark,light}-{selected,returned}.png` | Real card navigation to the selected Individual History and return to the retained index |
| `stress-{320,390,430}-{dark,light}-2.png` and `*-bottom.png` | Simulated doubled text, extremely long unbroken title, exact BigInt total above Number safe range and 555 historical resolutions |
| `stress-390-{dark,light}.png` and `*-bottom.png` | The same stress values at ordinary text size |
| `empty-390-{dark,light}.png` | No qualifying commitments and preserved empty copy |
| `reversed-390-{dark,light}.png` and `*-bottom.png` | Actual source reversal snapshot removes Paid-only records while Skipped history remains |
| `collection-390-{dark,light}.png` and `*-bottom.png` | 125 source-backed commitments and reachability of Archived service 124 |

Examples: [mixed dark](mixed-390-dark.png), [mixed light](mixed-390-light.png), [selected History](mixed-390-dark-selected.png), [returned index](mixed-390-dark-returned.png), [320 enlarged](stress-320-light-2.png), [collection bottom](collection-390-dark-bottom.png).

## Provenance and assertions

`scripts/preview-commitment-history-index-v2.ts` builds migrated SQLite fixtures through existing services at 2026-10-26, preserving kind, lifecycle, historical Paid/Skipped count, actual linked payment aggregates and reversal semantics. Fixtures are synthetic domain-compatible review data, never hardcoded into production. The normal examples intentionally include expected 180,20 versus actual payments 175,35 and 190,15. The stress aggregate is two maximum valid payments, formatted as R$ 180.143.985.094.819,82; Skipped rows produce the remaining lifetime resolutions.

Real CommitmentsView, the History header/cards, shared fonts/tokens/icons/menus, SectionList and selected Individual History are rendered. The unchanged Finance header/navigation is projected for context. A 70-pixel reserved bottom boundary stands in for native-tab clearance; no fake tab bar is drawn and no genuine native clearance is certified.

Native APIs, date picker, focus, animation and font boundaries are substituted. Local fonts are real; locale is pt-BR, timezone America/Sao_Paulo and Reduced Motion is enabled. Browser access reads precomputed SQLite-backed snapshots and records selected IDs. It does not execute SQLite writes or native confirmation flows. Integration tests separately establish Undo/Reopen, ledger correctness and aggregate refresh.

The browser script enters History via the actual Commitment options menu, checks headings/empty text, inspects card/glyph bounds and page horizontal overflow, checks at least 48-unit cards without nested buttons, scrolls to the last card, opens selected individual History, returns and uses Back to Commitments. Browser card accessibility values currently serialize as null in checks.json; production React Native props and integration assertions contain the full value text. This is not VoiceOver/TalkBack announcement proof.

The initial matrix found maximum-money glyph overflow in six doubled stress scenes. The amount text's flex width was corrected, and the complete matrix was regenerated. Final checks.json has **20 records, zero browser page errors, zero card/glyph overflow and no page-level horizontal overflow**; browser-review.log reports an empty failure list. The 16-unit introduction-to-card gap is included in the final captures. These bounds assertions do not establish complete screenshot coverage: the doubled browser top/bottom images do not visibly show the tall stress card's full Paid total.

The fresh independent reviewer verified all 42 originals exist at their declared dimensions, inspected all seven contact galleries and five full-size originals, and reviewed the new source. `dist/commitment-history-index-v2/finish-review.md` records **RECAPTURE** for missing native finish evidence. It issues no build-defect finding, fidelity matrix or whole-surface approval. Actual native tabs/clearance, dark/light and real enlarged-text layouts, overlapping stress captures and native navigation/return/focus/screen-reader evidence remain required. A fresh full review must follow those captures.

## Validation packet

Logs are local ignored artifacts under `dist/commitment-history-index-v2/`:

- `git-status-before.txt`, `commitments-view-before.txt`: protected dirty baseline and original owner presentation.
- `baseline-full-suite.log`: 1,334 passing tests, zero failures.
- `focused-new.log`, `focused-regressions.log`: seven new cases pass again after the final amount-width correction; 594 focused regressions pass.
- `final-full-suite.log`: 1,341 passing tests, zero failures, before final presentation-only gap/amount-width corrections.
- `typescript.log`: final run exited zero with empty output.
- `eslint-baseline.json`, `eslint-final.json`: each has six errors/two warnings; normalized file/rule/severity/message/position diagnostics match.
- `ios-export.log`, `android-export.log`: both final runs exited zero after the amount-width correction.
- `browser-review.log`: 20 scenes and an empty failure list after complete recapture.

`git diff --check` passed; both new documents separately passed trailing-whitespace/final-newline checks. `finish-review.md` records the native-evidence RECAPTURE disposition. See the [implementation record](../../finance-global-commitment-history-index-v2.md) for the 23-point audit, exact aggregate semantics, preserved inset/scroll ownership, accessibility contract, material skill contributions and physical test checklist.

## Native recapture

Actual iOS/Android evidence is still required, labeled with OS/device, viewport and OS text scaling. Capture populated dark/light layouts, unchanged Finance shell, actual tabs/system insets and a fully readable/tappable final card. Capture applicable narrow/standard/wide phone layouts near doubled text size. Use overlapping scroll images where needed to visibly include the entire long saved title, lifecycle, 555 paid/skipped count, complete **Paid R$ 180.143.985.094.819,82** and chevron; include additional device classes if shipped.

Capture selected Individual History navigation and return, and pair images with native Back/gesture, focus return, VoiceOver/TalkBack announcements and last-card activation results. Also verify live Undo/Reopen refresh and physical list performance. adb/emulator/xcrun/default SDK tooling is unavailable here. Browser boundaries and export success do not close these checks. A fresh full review is required after native captures exist; no whole-surface approval, ship claim or native certification is made.

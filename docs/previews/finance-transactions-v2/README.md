# Finance Transactions v2 review captures

These are **RN Web component previews**, not physical iOS/Android screenshots. Real `FinanceScreen`, list, controls, cards, shared typography and local fonts are rendered. The preview substitutes native module boundaries and the `useFinance` lifecycle with explicit test fixtures. The browser fixture contains its full sample collection solely to demonstrate controls; production uses the bounded database reader tested against real SQLite.

The reference was supplied in the conversation, but its original image was unavailable to the independent reviewer. Review checks the corrected written brief and rendered components; a pixel comparison with that image is not established. Its merchant logos and title-derived imagery, menus on all linked rows, blue testing gear, and fabricated navigation do not override the corrected brief. No generated artwork or company logos are included in these captures.

## Reproduce

```powershell
node node_modules/tsx/dist/cli.mjs scripts/preview-finance-transactions.ts
node scripts/review-finance-transactions.cjs
```

The capture script uses the existing local Playwright/Chromium installation; `AXIS_PLAYWRIGHT_PATH` and `AXIS_CHROMIUM_PATH` override those paths. No application dependency is added. Build output is ignored under `dist/transactions-v2-preview`.

## Capture matrix

The matrix contains **28 scene captures and 10 full-card captures**. `checks.json` contains 28 scene records plus one history-pagination record.

| Files | Evidence |
| --- | --- |
| `mixed-390-dark.png`, `mixed-390-light.png` | Mixed income/expense, same-category Água/Popeyes, uncategorized records, Utilities and Commitment provenance |
| `stress-{320,390,430}-{dark,light}-{1,2}.png` | All type selection, both themes, normal/doubled text, maximum expense/income, long and unbroken titles, long archived category |
| `expenses-{320,390}-{dark,light}-{1,2}.png` | Selected Expenses stays on one line at both narrow widths; normal and doubled text |
| `*-2-long-card.png` | Full long card at doubled text, independent of viewport scrolling |
| `expenses.png`, `income.png` | Functional type-filter composition |
| `match.png`, `noResults.png` | Accent-insensitive matching, clear search/focus retention, no-match state |
| `empty.png` | Genuine empty ledger |
| `history.png` | Virtualized history after loading four pages from the 151-record fixture |
| `checks.json` | Card glyph bounds, horizontal overflow, single-line selector labels, actual icon IDs, linked-menu absence, browser errors and fixture paging readiness |

Browser locale is pt-BR, zone America/Sao_Paulo. The app's English product copy remains unchanged; older date labels follow the existing locale convention. The native shell/tab bar is not faked into these previews. Enlarged text is simulated, not an assertion about UIKit/Android text measurement.

## Review and validation record

- Initial visual comparison corrected an unbroken title escaping its card and aligned overflow controls at the top of long cards.
- Independent Impeccable review found selected/unselected Expenses breaking inside the word under equal segment widths. The scoped `equalWidth={false}` correction and bounded enlarged heading resolved those findings; the independent verdict is a pass to ship within this scope. This is RN Web evidence, with the original mockup unavailable to the reviewer.
- The current matrix records no card/glyph overflow, page horizontal overflow or browser errors across its 28 scenes. All recorded selector labels occupy one line, including selected Expenses at 320/390 and doubled text. History fixture paging reaches all 151 records in four pages. These fixture checks do not substitute for the real-SQLite regression group.
- Real SQLite/UI focused regression group: **226 passed**. Those tests are also included in the final full-suite run.
- Final full suite after the reviewed correction: **1,228 passed, zero failed** (157.8 seconds).
- Final TypeScript: passed. Final ESLint baseline comparison: unchanged **six existing errors and two existing warnings**, zero new diagnostics. No diagnostics are suppressed.
- Final SDK58 production JavaScript exports: iOS and Android passed. These are bundle/export validations, not native builds or device tests.
- Final `git diff --check`: passed. No schema, migration, dependency, persistence or global palette changes; no commit or push.

Physical/native validation remains necessary; see [implementation documentation](../../finance-transactions-v2.md#physical-testing-still-needed).

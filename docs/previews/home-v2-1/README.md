# Home v2.1 visual evidence

This directory contains the actual HomeScreen/HomeContent/shared UI rendered through React Native Web with source-generated synthetic SQLite snapshots. It reuses the existing Home v2 preview builder and five local assets. No personal records or mockup example data were added to the product.

The matrix contains **80 cases, 122 original PNG captures and 16 contact sheets**. [checks.json](checks.json) records theme, scenario, width, text-scale proxy, action, filenames and page errors. Cases check horizontal overflow, horizontal/vertical control/text containment, one detail panel, row/stacked attachment, placement before Fitness, direct navigation and switching/collapse. Expansion preserves the selected card's browser Y position within 2 pixels. Both themes cover collapsed, Today and Attention states; 320/390/430 widths and doubled text cover stacked attachment. Baseline stress also includes 768 width.

```powershell
node --import tsx scripts/preview-home-v2.ts
node scripts/review-home-v2-1.cjs
```

Playwright/Chromium are local review tools, not added dependencies. `AXIS_PLAYWRIGHT_PATH` and `AXIS_CHROMIUM_PATH` override machine-specific installed locations. The builder writes ignored `dist/home-v2-preview`. The reviewer writes only this new evidence directory; original Home v2 evidence is retained.

Representative files:

- `populated-dark-top.png` / `populated-light-top.png`: compact balanced grid, artwork and shallow actual spending strip.
- `today-dark-top.png` / `today-light-top.png`: selected Today and immediate detail before the second row.
- `attention-*-top.png` and `attention-*-bottom.png`: selected Attention and bounded actual source rows.
- `today-*-320-2-*` / `attention-*-430-2-*`: large-text stacked reading order and complete detail.
- `stress-*`: long saved names, many items and exact large BRL amounts.
- `fitness-*`: direct existing Fitness destination with Today selection retained; no Fitness panel.
- `journal-*`: direct Journal route with Today selection retained.
- `transaction-*`, `fallback-*`, `error-*`, `loading-*`, `localized-*`: existing editor, image failure, Retry, loading and local date.

Fixtures retain empty/one/mixed-source states, actual recurrence, Work/Commitment-only states, completed/latest/next/active/partially completed Fitness, saved Journal and large attention totals. The browser hook is read-only; real mutation, focus/midnight refresh, source routes, Save/Cancel/Back and failure recovery are tested by the mounted integration suite.

PNG Origin metadata describes the boundary: native image/font/router/safe-area/hook/database/Alert components are substituted. CSS font doubling is **not OS Dynamic Type**. An 80px bottom reservation models tab clearance without drawing or replacing the native tab bar. These are browser viewport captures at distinct scroll positions, not stitched native captures. Native animation, text measurement, accessibility focus, touches and tab clearance require iPhone/Android review.

# Home v2.2 — background-only before/after evidence

The images render actual HomeScreen/HomeContent/shared UI through React Native Web. Synthetic SQLite fixtures come from the existing Home preview builder and source services. No personal data or mockup sample entries were introduced.

There are **28 paired before/after cases plus two theme/fallback cases**, producing **80 original viewport captures and 10 contact sheets**. [checks.json](checks.json) contains exact geometry, case parameters, capture filenames and rendering boundaries. Every paired case requires deeply equal content/inner/viewport/card/detail bounds and scroll range; the content reservation remains zero and bottom padding stays 32px. The new layer must cover the content and at least the viewport, reject pointer events, select the actual correct WebP bytes and retain its DOM image during disclosure. Its height remains stable during scrolling.

The final implementation uses the brief's native-compatibility fallback: the absolute texture scrolls with content, while the real ScrollView remains first in the native inset-discovery chain. A fixed sibling would interfere with the installed iOS first-descendant heuristic. See [the architecture rationale](../../home-v22.md#background-layer-themes-and-native-fallback). Browser geometry alone did not establish that native constraint.

Both themes cover 390-wide collapsed/Today/Attention, empty short Home, content-heavy/long names/large amounts, 320/430 widths and doubled text. Theme-change cases verify actual source replacement, unchanged geometry, solid-canvas fallback, Fitness/Journal direct routing and the real Add transaction editor.

Representative comparisons:

- `before-dark-short.png` / `after-dark-short.png`: unused viewport below the last card now has quiet contour material.
- `before-light-short.png` / `after-light-short.png`: clean cream counterpart with faint sand contours.
- `before-*-today.png` / `after-*-today.png` and corresponding `attention`: unchanged row-anchored detail.
- `*-heavy*-bottom.png`: material coverage through long scrolled content, with unchanged content/card geometry.
- `*-small-text.png`, `*-text.png`, `*-large-text.png`, `*-stacked-*`: narrow/doubled-text layout preservation.
- `after-*-switched-*.png` / `after-*-fallback.png`: live theme selection and recoverable decorative failure.

The original pre-change build was retained in ignored `dist/home-v22-before` before adding HomeBackground. To reproduce the after build and matrix:

```powershell
node --import tsx scripts/preview-home-v2.ts
node scripts/review-home-v22.cjs
```

The reviewer expects that preserved before build for comparison. Recreating it on another checkout requires the pre-background HomeScreen version **with the whitespace fix retained**. Do not replace it with a post-change build and call that before evidence. `AXIS_PLAYWRIGHT_PATH` and `AXIS_CHROMIUM_PATH` select existing local review tools; no project dependency was added.

Native image/font/router/safe-area/hook/database/Alert boundaries are substituted. The browser hook is read-only; mutation/refresh behavior is covered by mounted integration tests. The existing 80px exterior tab reservation is a review proxy outside Home, not production padding. CSS text doubling is not OS Dynamic Type. These captures establish neither physical-device performance nor native safe-area correctness; inspect iPhone/Android separately.

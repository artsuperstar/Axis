# Home v2.1 — intrinsic scroll-content height

The production fix removes only `flexGrow: 1` from HomeScreen's **ScrollView content container**. The bounded outer screen/scroll viewport, 16-unit outer padding, 32-unit bottom padding, native tabs, existing safe-area owner and inset settings are unchanged.

The growing content container imposed a viewport-height floor on short Home content. There was no hidden mounted panel or fixed-height expansion slot: conditional detail already unmounted on collapse, and its wrapper/gap contributed height only while present. Card/grid styles and artwork were not changed. No negative margin, compensating offset, manual tab-height calculation or data change was introduced.

Audit sources: HomeScreen, HomeContent, AppTabs, the installed `react-native-screens` SafeAreaView implementation and [Expo's native-tab inset guidance](https://docs.expo.dev/router/advanced/native-tabs/#safe-area-handling). The installed SafeAreaView defaults its explicit edge flags to false; no added JavaScript bottom inset was found. Existing native inset ownership is preserved rather than replaced with a guessed tab size.

## Measurements

`before.json` and `after.json` contain actual React Native Web geometry from the existing source-backed Home preview. Each phase covers 36 cases: both themes × 320/390/430 widths × normal/doubled text × empty/populated/content-heavy data. Every case records collapsed, Today, Attention, switch-back and collapse-again geometry, plus end-of-scroll access and direct Fitness/Journal navigation.

After-change assertions require content height to equal actual inner content plus declared padding, with no viewport-height reservation; only a detail panel's measured height and its existing 4-unit gap may increase content height. Collapse must restore the original height, switching must not retain stale height, and the final card must be reachable above the unchanged tab-clearance proxy. The last-card-to-content-end gap must equal the existing 32-unit padding in every state.

At 390px, normal text, dark theme (the corresponding light-theme values match):

| Scenario | Collapsed content before | After | Unnecessary reservation removed | Last-card tail before → after |
| --- | ---: | ---: | ---: | ---: |
| Empty | 740 | 646 | 94 | 126 → 32 |
| Populated | 740 | 670 | 70 | 102 → 32 |
| Content-heavy | 770 | 770 | 0 | 32 → 32 |

The populated Today-expanded content is 893px and Attention-expanded content is 1,277px, unchanged from before. Their natural additions above the corrected 670px collapsed height are exactly the measured panel height plus its 4px gap. Switching back reproduces the same height, and collapsing returns to 670px. Across all 36 before/after pairs, card heights are unchanged. After-change reservation is zero and the tail is exactly 32px in every recorded state, including doubled text.

Populated collapsed content across widths (both themes match):

| Width | Text scale | Before | After | Tail after |
| --- | ---: | ---: | ---: | ---: |
| 320 | 1 | 998 | 998 | 32 |
| 320 | 2 | 1,600 | 1,600 | 32 |
| 390 | 1 | 740 | 670 | 32 |
| 390 | 2 | 1,408 | 1,408 | 32 |
| 430 | 1 | 740 | 622 | 32 |
| 430 | 2 | 1,408 | 1,408 | 32 |

Both phases passed all 36 cases, with no page errors, horizontal overflow or inaccessible end-of-scroll card. The after matrix also scrolls to the final control or empty-state text in both expanded panels and checks it against the preview viewport/tab boundary; the recorded bounds are in `detailEnds`. At the top, disclosure leaves the scroll offset unchanged. At the end, a collapse allows normal browser clamping to the new legal scroll range, without an application scroll command. Removing an earlier stacked panel naturally moves later cards upward; that expected reflow is not treated as an arbitrary scroll jump.

## Validation

- Focused Home and relevant Fitness-entry, refresh-lifecycle and navigation regressions: **132/132 pass**, including all 86 Home tests.
- iOS and Android production exports: **pass**, exit 0.
- TypeScript and changed-file ESLint: **pass**, exit 0.
- `git diff --check`: pass.

The initial TypeScript run included a temporary reference snapshot with a `.tsx` extension under `dist`; that snapshot was renamed to plain text and the check rerun. No compiler configuration or assertions were relaxed.

The repository was clean at task start, at `c6e1ff8`. The production diff is one removed property in `src/features/home/home-screen.tsx`; this reviewer and its measurement evidence are the only additional files. No commit or push was performed.

## Reproduction and limits

```powershell
node --import tsx scripts/preview-home-v2.ts
node scripts/review-home-whitespace.cjs after
```

The original `before.json` was recorded from the pre-fix build using `before` mode. That mode records the old reservation rather than requiring its absence. Both modes verify the existing conditional panel and routing behavior. The reviewer supports `AXIS_PLAYWRIGHT_PATH` and `AXIS_CHROMIUM_PATH`; installed local review tools add no app dependency.

These are browser CSS-pixel measurements at point-equivalent viewport widths, **not native iPhone/Android measurements**. The existing preview reserves 80px outside the app viewport for native tabs; that proxy is unchanged and excluded from content-height/reservation calculations. CSS text doubling is not OS Dynamic Type. No native animation timing, safe-area pixel measurement, physical touch or native tab-clearance certification is claimed.

A short screen still has a full-screen background. Unoccupied viewport background is not extra scroll content; the fix removes the forced content-height floor rather than stretching cards or moving the native tab bar to fill the display. Actual iPhone/Android inset and scrolling behavior still needs physical-device verification.

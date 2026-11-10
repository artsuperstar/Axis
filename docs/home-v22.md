# Axis Home v2.2 — Editorial Background

## Scope and incumbent audit

This changes Home's decorative environment only. Home v2/v2.1 already own the photographic cards, copper spending strip, Lora/Manrope typography, two-column/responsive layout, row-anchored Today/Attention disclosure, direct Fitness/Journal navigation and source integrations. Those components, the five original WebPs, provisional feature colors, native tabs, data/domain services and persistence are unchanged.

HomeScreen previously painted the semantic solid canvas on its existing experimental screen SafeAreaView. Its one ScrollView retains `contentInsetAdjustmentBehavior="never"`, 16-unit content padding, 32-unit bottom padding and maximum inner width 640. The recent uncommitted whitespace fix removed `flexGrow: 1` from the **content container**; this remains removed. No height/minimum height is imposed on content, and no spacer, padding, safe-area adjustment or scrolling owner is added. Only the out-of-flow decorative layer receives the measured viewport minimum.

NativeTabs still owns the same five tabs. There is no genuine Home header Settings/Search/Profile control. The blue gear shown in earlier screenshots is Expo Go development chrome and was not recreated.

## Supplied reference and artwork

The user supplied a charcoal contour image with the brief. It was available in the conversation but not as a raster file alongside the pasted text attachment. It was used as the visual/reference input to the built-in image generation tool to create two original portrait texture plates. This is a reference-based adaptation, not a claim to have copied the original raster byte-for-byte.

Dark uses deep warm charcoal, very fine baked matte grain and restrained brown/copper contour lines. Light is a separately generated contemporary cream/parchment expression with sand-colored lines; it is not a numerical inversion. Both keep a broad calm upper-left field, with organic linework toward the upper-right and lower region. The pattern remains subordinate to the established cards. No UI, gear, typography, custom icons, landscape photography, glow, gloss, animated noise, particles, parallax or shadow is baked in or rendered.

Exact final prompts and provenance are in [prompts.json](../assets/images/home-v22/prompts.json), plus per-image prompt sidecars. PNG generation originals remain in the tool's generated-images directory outside the project. Final project assets are optimized locally through Chromium canvas at WebP quality 0.84; no image API key, package or runtime URL was added.

| Local asset | Dimensions | Bytes | Rendering |
| --- | --- | ---: | --- |
| `assets/images/home-v22/dark.webp` | 640 × 1,137 | 8,032 | Opaque over the existing charcoal canvas |
| `assets/images/home-v22/light.webp` | 640 × 1,137 | 12,130 | 0.6 image opacity over the existing cream canvas |
| Total | | **20,162 bytes (19.7 KiB)** | |

This is the raster file footprint before platform packaging, not a measured installation-size or GPU-memory claim. Source images were 941 × 1,672. [manifest.json](../assets/images/home-v22/manifest.json) records source/output dimensions, file sizes and contrast measurements. Grain is baked into the files; React does not generate noise, lines or hundreds of views.

## Background layer, themes and native fallback

`HomeBackground` is one memoized, absolutely positioned decorative View/Image layer **inside the existing ScrollView**, before the normal inner content. It contributes no document-flow height. The existing ScrollView reports its viewport height through `onLayout`; only the absolute decorative layer uses that value as a minimum size. This fills unused viewport space on short pages while leaving the scroll-content container and its actual content height intrinsic. Long pages paint the same quiet material through their natural content area. The layer scrolls with the page; it is not an additional card/section.

**This deliberately uses the brief's §12 reliability fallback instead of a fixed sibling.** A native source audit found that the installed iOS `RNSScrollViewFinder` walks only `subviews[0]`. `RNSTabsScreenComponentView` uses that chain for automatic inset discovery, and the tab controller also uses content-scroll-view discovery. A decorative sibling before the ScrollView can break that behavior even when browser geometry passes. The final architecture keeps the actual ScrollView first in the native descendant chain, retains the original inset prop/native ownership and avoids changes to tabs, native feature flags or manual inset calculations. The initially reviewed fixed-sibling variant was replaced before delivery for this reason. Native scroll/inset correctness takes priority over fixed wallpaper.

The existing `useColorScheme`/`useDesignColors` mechanism selects module-constant local sources and the semantic fallback canvas. There is no Home theme toggle. The image uses Expo Image `contentFit="cover"`, centered placement, memory caching and zero transition. A theme-keyed image instance drops the old theme's pixels immediately on a theme change rather than crossfading through the wrong theme; the fallback canvas is already the new semantic color. Ordinary Home refresh and disclosure preserve the image instance/source. Image decoding/cache eviction on a physical OS is not claimed to have been profiled.

The layer has `pointerEvents="none"`, `accessible={false}`, `accessibilityElementsHidden` and `importantForAccessibility="no-hide-descendants"`; its Image is also inaccessible. It contributes no action or screen-reader stop. The existing cards and independent source actions retain reading/touch ownership.

An image error hides only that theme's failed image and retains the semantic solid canvas. It never gates Home data, loading/error/Retry or transaction creation. A late error from the previous theme cannot hide the current theme. Failed themes remain on the solid fallback through refresh, avoiding repeated decorative retries; the other theme remains independently usable.

## Readability

The optimized dark image passes without additional blending. The raw light image's darkest contour/grain pixel would lower the date's worst-case ratio to 3.96:1; light image opacity is therefore 0.6 over the existing `#F5F0EA` canvas. No text token or shadow was altered to compensate.

A source-derived sRGB calculation checked **every decoded pixel** of each final treatment against actual Home title/date colors, including the light alpha composition:

| Theme | Title minimum | Date minimum |
| --- | ---: | ---: |
| Dark | 13.19:1 | 8.12:1 |
| Light | 11.91:1 | 4.53:1 |

These are source-pixel analytical bounds, not native display measurements. Representative actual-screen captures were also reviewed for hierarchy, card/panel edges, quiet header space and empty-background appearance. Card text-protection overlays, borders, colors and icons were not edited.

## Behavior and financial integrity

Today and Attention retain one conditional detail panel immediately after their shared row, or immediately after their own card when stacked. Their state, short transition, Reduced Motion behavior, bounded source rows and source actions are unchanged. Fitness directly opens the appropriate active/completed/default destination; Journal opens the local-day Journal. The separate Add transaction control still mounts the real editor.

No source projection, recurrence rule, amount calculation, actual-spending ledger rule, focus/foreground/minute/midnight refresh, last-good snapshot handling, mutation service or Journal persistence path was changed. The background component imports no feature data access and performs no reads. Tests verify decoration/theme/failure changes trigger no source queries. Native tab styling and safe-area ownership remain untouched.

## Skills and review findings

- **frontend-design:** treated the supplied contour language as background material, preserving the incumbent image-led dashboard and calm title area rather than redesigning the interface.
- **Impeccable:** kept the texture restrained and theme-specific; identified and corrected the light asset's worst-case date contrast through image opacity. Reviewed representative before/after originals and contact sheets without a cosmetic iteration loop. Existing global metadata/color-unification work was left alone.
- **UI/UX Pro Max:** used verified local Color Contrast and Contrast Readability guidance; enforced decorative semantics, no focus/touch ownership and sufficient text contrast.
- **Expo building-native-ui:** checked [SDK 58 Expo Image guidance](https://docs.expo.dev/versions/v58.0.0/sdk/image/), local assets, `contentFit`, caching, transparent scrolling and natural content size. Native-source review caught the first-descendant inset-discovery constraint and led to the brief's permitted scrolling fallback. Existing infrastructure was sufficient; no dependency or native feature flag was needed.
- **Image generation:** created and visually inspected both original plates from the provided reference, retained exact prompts, optimized the files and used the actual generated outputs in the app.

## Evidence and validation

See [before/after evidence](previews/home-v22/README.md). The matrix uses identical source-backed fixtures, viewports, themes and actions for before/after. Geometry is deeply equal for the content container, inner content, viewport, all cards, expanded panel and scroll range across 28 paired cases. Two additional cases exercise live theme changes, fallback, direct routes and transaction creation. The resulting 80 original captures and 10 contact sheets isolate the background change. Final short-page captures in both themes and the long scrolled Attention capture were visually reviewed after adopting the native-compatible fallback.

The current pre-change full-suite baseline was **1,435/1,435 pass**, exit 0, confirmed before Home production code changed. Five focused tests were added for both theme assets, stable decorative placement/instance, live theme changes and stale callbacks, fallback with real controls, and initial data failure recovery. The focused Home suite passes **91/91**.

All final checks used the native-compatible scrolling-background implementation:

| Check | Result |
| --- | --- |
| TypeScript (`tsc --noEmit`) | Pass, exit 0 |
| Changed-file ESLint | Pass, exit 0 |
| Full ESLint baseline comparison | Identical: six existing errors and two existing warnings; no new diagnostics |
| Focused Home tests | 91/91 pass |
| Related Home/navigation/refresh/Fitness regressions | 137/137 pass |
| Full automated suite | 1,440/1,440 pass, versus 1,435 pre-change |
| Browser comparison | 30 cases pass; 28 exact paired geometry/scroll-range checks |
| iOS export | Pass; `dist/home-v22-ios` |
| Android export | Pass; `dist/home-v22-android` |
| `git diff --check` | Pass |

Representative dark-theme 390px browser measurements (740px viewport; before already includes the whitespace fix):

| State | Content height before → after | Scroll range before → after | Added reservation |
| --- | ---: | ---: | ---: |
| Collapsed | 670 → 670px | 0 → 0px | 0px |
| Short/empty | 646 → 646px | 0 → 0px | 0px |
| Today expanded | 893 → 893px | 153 → 153px | 0px |
| Attention expanded | 1,277 → 1,277px | 537 → 537px | 0px |

The full ESLint command retains its pre-existing nonzero exit. Its six errors are `react/no-children-prop` in context-menu (three), navigation-conventions (two) and transactions-experience (one) tests; its two unused-variable warnings remain in tasks-experience. No diagnostics were suppressed. Detailed local command logs are under ignored `dist/home-v22/`.

## Files and Git preservation

- `src/features/home/home-screen.tsx`: mount the absolute scroll-background layer and measure the viewport; retains the existing uncommitted whitespace correction.
- `src/features/home/components/home-background.tsx`: new isolated decorative component.
- `assets/images/home-v22/`: two WebPs, manifest, prompt set and sidecars.
- `tests/home-background-v22.test.ts`: five focused tests.
- `scripts/review-home-v22.cjs`, `docs/previews/home-v22/`: comparisons, geometry assertions, captures and evidence notes.
- `docs/home-v22.md`: this report.

At task start, branch `main` at `c6e1ff8` already had the whitespace fix and its untracked measurement script/evidence. Those changes were preserved. No reset, clean, commit or push was performed. No schema, migration, dependency, global palette, card asset, native-tab or unrelated feature change was made.

Final status is one modified tracked file (`home-screen.tsx`) and eight untracked path groups. Two untracked groups (`docs/previews/home-whitespace/` and `scripts/review-home-whitespace.cjs`) predate this task; the remaining six groups contain this background work. Nothing is staged.

## Physical testing still required

Browser evidence is not native-device certification. Check actual iPhone and Android background cropping, matte-grain visibility, native font/color rendering, light/dark transitions, slow image loading/failure, safe-area seams, native tab clearance, touch pass-through, VoiceOver/TalkBack order, memory/cache behavior and scrolling performance. Confirm OS Dynamic Type and Reduce Motion on hardware. Native exports validate packaging/build compatibility, not these runtime qualities.

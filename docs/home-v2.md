# Axis Home v2 — Warm Editorial Dashboard

## Behavior audit and direction contract

Home is the existing first Expo Router native tab. `AppTabs` owns all five tabs; Home owns one scroll view and its experimental screen safe-area boundary. It has no Settings, Search, Profile or account control. The blue floating gear in the supplied physical capture is not an Axis header action. Preserve the tab owner and do not add mock controls.

The header formats the current snapshot's local date using the device locale; useHome retains focus, foreground and minute refresh, including midnight. A failed read keeps the last snapshot and mounted transaction editor. Actual daily expense comes from Finance `readSpentOnDate`, including actual linked payments and reversals, never unpaid planned obligations. The informational strip has a separate Add transaction button that opens the existing expense-default TransactionCreate; Save reloads Home.

Today is the source projection of pending tasks/recurring occurrences plus pending commitments and expected Work payments due today, excluding source-derived attention records. It is not a lifetime or completed-task collection. Authoritative totals cover all matching records; previews are bounded. The global agenda has five rows. Attention includes Earlier/Missed Tasks, overdue pending commitments and Work with the authoritative overdue flag and outstanding balance, without inventing new eligibility. Existing aggregate source counts and navigation are preserved.

Today, Needs attention and Fitness each toggle a single selected inline panel; selecting another switches it, and tapping again collapses it. Journal is different: it directly pushes `/journal` and preserves the selected panel. It has no expanded Home Journal editor. Task rows have separate completion and source-navigation targets; completion only resolves pending source identity and cannot reopen on repeated taps. Financial previews navigate to their existing owners without a Pay control on Home. Today retains Calendar navigation and bounded Next up. Attention retains source navigation for records beyond the preview.

Fitness uses the existing daily projection and priority: active workout, completed today (with latest/next context), next rotation routine, empty. Active summary exposes name/exercise/set counts, not per-exercise completion. Journal only exposes saved current-day entry presence; no content or draft projection is available. Do not infer a draft, fabricate progress, or add a second completion algorithm. Neither Today nor Fitness currently supplies an authoritative completion denominator: omit reference percentages/bars and retain truthful descriptions.

The approved supplied atmospheric mockup is the visual reference. This is an authorized Home-specific extension of Warm Editorial Hearth, Operate mode, not a replacement global world: compact editorial heading, shallow copper spending strip, rose sunset Today, amber planning Attention, emerald equipment Fitness, plum notebook Journal, then a quiet matching selected panel. Incumbent Lora/Manrope typography, native navigation and exact source values remain. Photographic plates are decorative only; text, icons and all controls stay semantic. Light mode uses warm cream with feature-tinted readable bodies and reviewed artwork; dark mode uses protected cream text over layered tonal scrims. The four cards must retain distinct imagery, not collapse into identical flat surfaces.

## Previous visual problems and approved interpretation

The previous Home used a restrained, comparatively uniform summary treatment. The rejected direction repeated the same flat surface with a changed icon and label; it lost the approved reference's atmosphere and distinct feature identities. The approved inline image was available to the implementing agent. Its composition informed this work; its sample values, percentages, extra header actions and apparent Journal expansion did not override verified Axis behavior.

This is an ordinary Home-specific extension of the established visual world, not an Axis-wide identity replacement. The existing [Visual Groundwork](design-system-v2-visual-groundwork.md) and [Stage 14D record](design-system-v2-stage-14d.md) remain the global visual authorities. The feature colors here remain **provisional until the final Axis-wide color-unification pass**. No `DESIGN.md`, `.impeccable` design metadata or PRODUCT.md repair was introduced. Missing `DESIGN.md` and PRODUCT.md's SDK 57 wording are preexisting metadata gaps; package.json establishes SDK 58.

## Source and interaction audit

| Area | Verified owner and retained behavior |
| --- | --- |
| Route and native tabs | `src/app/(tabs)/index.tsx` renders Home; `src/components/app-tabs.tsx` owns Home, Tasks, Calendar, Finance and Fitness through Expo Router `NativeTabs`, in that order. Journal stays secondary. |
| Header | One real Home heading and locale-formatted snapshot date. No genuine Home Settings, Search or Profile action exists. The supplied blue gear is Expo development chrome. |
| Date and refresh | `createHomeDataAccess.read()` freezes one instant for all source reads. `useHome` loads on focus, foreground and each minute; local midnight therefore refreshes the projected day. |
| Actual spending | Finance `readSpentOnDate(date)` supplies bigint centavos; existing BRL formatting is retained. Actual linked payments and reversals remain Finance-owned. Planned or unpaid obligations never become spent money. No transaction-count projection exists. |
| Transaction shortcut | A separately labeled Add transaction target mounts the actual existing `TransactionCreate`, defaulting to Expense. Validation, categories, explicit Save, Cancel/Back and refresh after Save remain owned by that editor. |
| Today | Pending one-time tasks and recurring occurrences, pending commitments, and expected Work payments due today, excluding attention records. Totals count every eligible record; the shared visible agenda is limited to five. |
| Task attention | Existing Earlier grouping and source recurrence Missed status; deleted or resolved items are excluded. Home does not derive another recurrence algorithm. |
| Financial attention | Pending overdue commitments and Work records with positive outstanding balance and source-owned `overdue`. The total and breakdown include all three supported sources. |
| Task actions | Separate 48-unit completion and owner-navigation targets. Completion re-reads the task/occurrence identity and resolves only pending status; repeated taps cannot reopen completed outcomes. Upcoming Next up rows have no completion control. |
| Financial actions | Open the owning commitment or Work destination; no new Pay or receipt editor is embedded in Home. Source links retain access beyond the preview. |
| Detail selection | Today, Attention and Fitness toggle one selected panel, switch on another selection, and collapse on repeat selection. All start collapsed. Journal pushes `/journal` while preserving the selected panel. |
| Fitness | Existing daily projection prioritizes active workout, completed today, next rotation routine, then empty. Saved workout/routine names, exercise count, set count, latest completed context and rotation sequence remain authoritative. |
| Journal | Only `hasEntry` for the local day is projected: Entry saved or Not written yet. No private content, inferred draft or embedded editor. Existing Journal owns recovery, dirty-state protection, conflicts, Save and History. |
| Loading and failures | A loading indicator precedes the first snapshot. Read/action errors remain visible with Retry for read failure. Failed reads preserve the last successful snapshot and mounted transaction editor. |
| Rendering and queries | One Home scroll view, one selected detail mount and existing bounded previews. Card selection is local presentation state and performs no source reads. Source aggregation and query paths remain unchanged; no per-row reads were added. |

The audited implementation files are `home-screen.tsx`, `home-content.tsx`, `home-artwork.tsx`, `projection.ts`, `data.ts`, `types.ts`, `use-home.ts`, `refresh.ts` and actual `AppTabs`. Projection/data/domain/hooks/types/native-tab files were left unchanged.

## New hierarchy and feature identity

The compact Lora Home heading and live local date lead into the shallow copper Spent today strip, followed by Today/Needs attention and Fitness/Journal in a two-by-two grid at ordinary phone widths. A selected detail panel follows the grid. The feature cards share shape, spacing, controls and typographic hierarchy while retaining their own material and atmosphere.

| Feature | Decorative plate | Useful live information | Action |
| --- | --- | --- | --- |
| Spent today | Copper dusk ridges | Exact actual BRL expense | Separate Add transaction button |
| Today | Rose sunset mountains | Authoritative scheduled count, first eligible preview and remaining count; Next up when empty | Toggle Today panel |
| Needs attention | Amber planner/desk | Full aggregate count and explicit Tasks, commitments and Work breakdown | Toggle Attention panel |
| Fitness | Emerald-lit dumbbells | Saved workout name/status and exercise/set counts, or completed/next/empty context | Toggle Fitness panel |
| Journal | Plum notebook, pen and coffee | Today's saved-entry presence | Open Journal directly |

The icons describe features: sun, alert, dumbbell, book and credit card. They never change based on a user's task title, workout name or financial category. The chevron is part of the card's single press target. Selected cards receive a stronger accent outline and expanded state; pressing supplies restrained opacity feedback.

Lora is retained for the screen and feature/panel headings; actual user data, amounts, metadata and actions use the incumbent Manrope files and real weights. Amounts retain tabular figures. Expanded rows sit on a quiet semantic group surface with a matching feature icon, serif heading and compact source-owned content; dense actionable rows do not sit over photographs.

## Progress and expanded detail

There are no fabricated progress bars or percentages. Home's Today snapshot contains pending records across three source categories, not an authoritative completed/total denominator. `SessionSummary` contains exercise/set counts, not an exercise-completion ratio. A partial workout and one with every exercise manually completed both remain active until Fitness explicitly finishes the workout. Targetless completion, reopening exercises and workout finishing remain entirely Fitness-owned.

Today detail retains the five-row cross-source agenda, task completion, source navigation, remaining count, Calendar action and bounded Next up when nothing is scheduled. Its subtitle says scheduled items rather than inventing completed tasks. Attention retains the same bounded global preview, truthful outstanding amounts, due/overdue context and source links when more records exist. Fitness retains Resume workout, completed-workout navigation, next routine/rotation context and Open Fitness in next/empty states. There is no expanded Journal Home panel because the actual card has always been a direct entry point.

## Artwork strategy, provenance and footprint

The existing repository did not provide suitable atmospheric Home plates. Five original decorative images were generated with the built-in `image_gen` tool, visually inspected, then downscaled and compressed through Chromium canvas. They contain no UI lettering and use no external stock, user-uploaded personal imagery or runtime remote URLs. Exact prompts and output dimensions/bytes live in [provenance.json](../assets/images/home-v2/provenance.json), with one `.webp.json` prompt sidecar per output. Impeccable's raster scan found five assets and zero missing sidecars.

| Asset | Dimensions | Bytes |
| --- | --- | ---: |
| `today.webp` | 512 × 512 | 11,182 |
| `attention.webp` | 512 × 512 | 13,976 |
| `fitness.webp` | 512 × 512 | 27,004 |
| `journal.webp` | 512 × 512 | 14,932 |
| `spent.webp` | 960 × 320 | 9,754 |
| **Total raster source footprint** | | **76,848 (about 75 KiB)** |

This is the added image-file footprint before platform packaging, not a measured install-size or decoded-memory claim. No dependency or font file was added.

`HomeArtwork` uses module-constant local `require` sources and a memoized Expo Image component, `contentFit="cover"`, memory caching and zero transition. Source refresh does not change image identity or remount failed plates. The images never block source loading and have no animation or network request. Native image failure hides the failed plate while preserving the colored surface, text, icon, outline and actions; the failure persists across refresh. This path is exercised in mounted component tests and browser evidence.

## Themes, responsiveness and accessibility

The app's existing cream/charcoal canvas and semantic dense surfaces remain. Home alone adds rose, amber, emerald, plum and copper identities. Both themes use the same reviewed local images; light uses readable cream tinted bodies rather than an unreviewed inversion. A low dark wash covers each image, with predictable feature-colored text bodies (`B8` alpha in dark, `E6` in light); the spending strip uses `C9`/`D9`. Text protection is independent of a plate's highlights. A source-derived sRGB calculation checked each actual body/text pair over pure black and pure white beneath its overlay, conservatively excluding the additional 20% dark wash. The minimum is 5.64:1, above 4.5:1 for normal text. This is an analytic bound, not a native pixel measurement; browser review additionally checked real image/text composition.

| Text/body overlay | Dark minimum | Light minimum |
| --- | ---: | ---: |
| Today | 6.14:1 | 9.81:1 |
| Attention | 5.64:1 | 9.44:1 |
| Fitness | 5.76:1 | 8.83:1 |
| Journal | 5.80:1 | 8.87:1 |
| Spent today | 7.89:1 | 7.54:1 |

Cards use the incumbent raised radius (18), 12-unit grid gaps and internal padding, with a minimum height of 206 that may grow with content. The 16-unit screen gutter and maximum content width of 640 retain phone density. Column choice uses measured available grid width divided by font scale: below 320 effective units the cards stack. The final stacked layout explicitly avoids flex shrinking so large text cannot clip vertically. Essential titles wrap. Large BRL amounts preserve the full exact string, breaking only at meaningful currency/thousand groups when needed.

Cards expose meaningful labels, button roles and selected/expanded state; Journal announces navigation instead of a false disclosure. Spent today announces its full value and its Add transaction control is separate. Task completion remains a checkbox with a named subject, separate from Open. Decorative artwork is hidden from assistive technology and ignores touches. Shared 48-unit controls and natural content growth remain. Selection/expansion is immediate, has no decorative image motion and continues to work with live Reduced Motion enabled.

Home retains the native safe-area screen boundary, one scroll view, existing bottom content padding and the native five-tab owner. Browser evidence reserves 80 pixels as a tab-boundary proxy; no custom product tab bar was implemented. Physical safe-area, gesture and font behavior still require native review.

## Skills and bounded review findings

- **frontend-design:** drove the five distinct image compositions, compact editorial hierarchy and visible atmospheric header regions. This prevented a return to the rejected flat, interchangeable cards.
- **Impeccable:** established the behavior/direction contract, then used a bounded floor review of density, text protection, coherent radii and selected-panel readability. The first capture batch exposed stacked flex clipping and overly opaque image bodies; one correction batch fixed them. Final review stopped after the material issues were resolved.
- **UI/UX Pro Max:** the local UX search for `text overlay image contrast` returned readability/color-contrast guidance including 4.5:1 normal text. This informed predictable scrims, explicit source labels, truthful status instead of invented ratios, touch separation and accessible reflow.
- **Expo guidance:** installed native UI guidance and official SDK 58 [Expo Image documentation](https://docs.expo.dev/versions/v58.0.0/sdk/image/) informed stable bundled assets, fit/cache behavior and non-blocking fallback. Native-tab ownership was checked against actual AppTabs and matching Router guidance. No native navigation replacement or image dependency was introduced.

A fresh independent reviewer inspected all 11 final contact sheets, nine individual original captures and the relevant source. The review concluded SHIP with no material findings within its RN Web/source scope. It did not independently compare pixels against the inline reference, and neither that review nor browser captures certify native-device behavior.

## Visual evidence

The final [capture README](previews/home-v2/README.md) explains reproduction, fixture generation, substitutions and the scenario index. [checks.json](previews/home-v2/checks.json) records **60 cases and 84 original captures**, with no page errors or horizontal/content-containment failures. Eleven contact sheets make **95 PNG evidence files** total. Every PNG embeds an Origin text chunk describing its provenance and limitations.

The matrix covers both themes; populated/empty/one/mixed pending and completed/recurring data; source-specific and mixed attention; actual/zero/large spending; active/partial/all-exercises-complete/targetless/completed/next/empty Fitness; saved/unsaved Journal; all supported expanded panels; Journal navigation preserving selection; real transaction editor open; image failure; loading; read error and retry; German dates; 320/390/430/768 widths; and doubled browser text. There is deliberately no invented Journal expansion capture. The initial 54-case/78-capture batch was superseded by the final matrix and stronger vertical-containment checks.

## Validation record

Validation artifacts are under ignored `dist/home-v2/`; they are local run records, not committed evidence images. A first baseline attempt overlapped edits and was discarded. The clean baseline was rerun separately using the original Home implementation and is the only baseline used here.

| Check | Recorded result |
| --- | --- |
| Starting worktree | Clean `main`, `16b7737` (`Work visual revamp`); no preexisting uncommitted work |
| Clean full-suite baseline | 1,413/1,413 passed, exit 0, 429,760.5941 ms; `baseline-clean.log` |
| Focused Home tests | 78/78 passed, exit 0, 8,086.1257 ms; `focused-final.log`; includes 14 new tests |
| TypeScript | Exit 0; `typescript-final.log` |
| Changed-file ESLint | Exit 0; `lint-changed.log` |
| Full ESLint comparison | Exit 1 with exactly the baseline eight diagnostics (six errors/two warnings); zero delta by file, rule, severity and message; `eslint-baseline.json` / `eslint-final.json` |
| Final full automated suite | 1,427/1,427 passed; zero failed, cancelled or skipped; exit 0, 172,953.8186 ms; `full-final.log`; 14 more tests than the clean baseline |
| iOS export | Exit 0; production Hermes bundle and all five Home WebP assets exported to `dist/home-v2-ios`; `export-ios.log` |
| Android export | Exit 0; production Hermes bundle and all five Home WebP assets exported to `dist/home-v2-android`; `export-android.log` |
| `git diff --check` | Exit 0 after the completed full-suite run; final documentation-only check also passed |

The six preexisting ESLint errors are `react/no-children-prop` in `context-menu` (three), `navigation-conventions` (two) and `transactions-experience` (one) tests. The two preexisting unused-variable warnings are in `tasks-experience` tests. None was suppressed or broadened into this Home task. The full suite ran serially with `TZ=America/Sao_Paulo`, `node --import tsx --test --test-concurrency=1`, and every test file discovered by `rg`. It included cross-feature projection/source/refresh regressions. The analytic contrast calculation is recorded in `contrast.json`.

Focused verification covers presentation identities, selection/switch/collapse, unchanged Journal navigation, source-only completion, real transaction editor behavior, stale reads/editor retention, image failure across refresh, Reduced Motion, exact long BRL accessibility and native-tab declarations. Existing presentation assertions were updated for 48-unit targets, heading/count layout and 320-unit stacking. The test runtime now loads WebP fixtures and forwards image `onError`; these are test-boundary changes, not application domain changes. The passing full suite includes Tasks, Finance/Work reconciliation, Fitness, Journal, Calendar and cross-feature regressions.

## Files and remaining platform verification

Application changes are limited to Home composition/presentation/artwork and one generic alert glyph in shared `ui-icon.tsx`. Supporting additions are the five artwork files and provenance, Home regression tests, narrowly scoped existing presentation test/helper updates, two preview scripts and these documentation/capture artifacts. Source data access, domain rules, schema, migrations, dependencies, types, refresh hooks, Finance transaction editor and native tab code are preserved.

No commit or push was performed. Native `adb`, an emulator and `xcrun` were unavailable in this environment. iPhone and Android device review still needs to check actual image decoding, Lora/Manrope rendering, VoiceOver/TalkBack order and announcements, OS Dynamic Type at 2×, foreground/midnight navigation refresh, transaction keyboard/Save/Cancel/Back, native bottom-tab clearance and scrolling performance. Browser CSS/fontScale doubling is a useful stress proxy, not an OS Dynamic Type test; export success alone is not physical testing.

# Axis Home v2.1 — Balanced Cards and Contextual Expansion

This is a focused refinement of [Home v2](home-v2.md), using the two supplied 9 November mockups for structure. The existing photographic assets, private feature palettes, Lora/Manrope roles, source integrations, spending shortcut and five native tabs remain. The preexisting dirty worktree was retained; no commit or push was made.

## Audit and reported iPhone problems

Home v2 put four summaries inside two equal-height rows, then rendered a single selected detail after the entire grid. Its 206-unit card minimum, 86-unit artwork header, growing text body and verbose per-source Attention lines could leave substantial empty space under Today. Fitness expanded into largely repeated context. Journal already navigated directly.

The existing data audit remains valid: Today combines pending Tasks/recurring occurrences, due Commitments and expected Work payments; Attention combines source-owned Earlier/Missed Tasks, overdue Commitments and overdue outstanding Work. The five-row previews, full counts, stable ordering, source identities and remaining-count links are authoritative. Today is a pending projection, not a completed/total denominator. Neither Today nor Fitness supplies an authoritative completion percentage. Journal exposes saved-entry presence, not private writing or draft contents.

Home still uses one vertical ScrollView inside its existing screen safe-area owner. NativeTabs owns the five tabs. The actual Home header has no Settings control to preserve: the blue gear in earlier captures was external development chrome. Search/Profile/Settings controls were not invented.

## Compact summaries and card balance

| Feature | v2.1 information budget | Interaction |
| --- | --- | --- |
| Today | Scheduled count, then a short real first-item preview with a remaining count. Long titles use the actual source breakdown instead; the full identity remains in its accessible name and detail. Empty state stays concise, with real Next up available in detail. | Expand/collapse |
| Needs attention | Full aggregate count and one joined source breakdown, such as `43 tasks · 3 overdue work`; Commitments remain included. | Expand/collapse |
| Fitness | Existing active workout name, state and exercise/set counts; completed/latest/next/empty priority is preserved. | Navigate |
| Journal | Today and Entry saved/Not written yet. | Navigate |

The two cards in each normal-width row stretch together, without making all four cards the same height. The oversized minimum was removed. The artwork header starts at 72 units and absorbs spare row height; the text body stays content-sized. A short Today preview therefore exposes more of its original mountain image instead of an empty tinted text block. Long workout names and large text grow naturally without ellipsis, fixed heights or fabricated filler.

The source-breakdown copy is presentation only: it does not change source eligibility, totals or ordering. Long titles are summarized rather than truncated; expanded rows retain the complete source title. Screen-reader names retain full first-item context.

## Contextual expansion and visual connection

At two columns, a stable contextual group contains the Today/Attention row and one conditional detail slot. Fitness/Journal form the following row. Switching replaces the panel in that slot; repeat selection removes it. Only Today and Attention are representable in the selected-panel type. Hidden or duplicate panels are not mounted.

At one column, each card has a stable wrapper, and the selected detail appears immediately after its own card. In particular, Today detail precedes Attention in the stacked reading order. Actual DOM/native child order follows the layout, including the controls inside detail.

Card-to-detail spacing is 4 units; unrelated rows retain 12-unit separation. The selected card uses a restrained 2-unit border from its existing feature border color, an upward disclosure chevron, and expanded/selected accessibility state. Its panel uses the same existing border and body tint. Unselected expandable cards have a downward chevron; navigational cards use the existing forward chevron. All are part of one card press target.

There is no notch, glow, neon outline, shadow, blur, gloss, new illustration, title-based icon heuristic or animated artwork. The approved mockups' relationship and ordering were adopted without their exaggerated lighting.

## Useful details and source actions

Today opens **Today's schedule**, without repeating the collapsed preview/count. It retains actual bounded scheduled rows, pending-only source Task completion, source navigation, remaining count, Calendar and real Next up when empty. Financial items have owner navigation rather than generic completion or direct payment. Repeated/stale Task taps cannot reopen resolved records; source reopening remains in the owning feature.

Attention opens actual attention rows with the original dates, reason/status, outstanding amounts and source identity. Its header does not repeat the collapsed count. When more rows exist, the current Tasks, Commitments and Work links remain. No universal cross-source View all route exists, so none was fabricated. Empty expansion contains a real empty state.

Rows use the same independent 48-unit completion/open targets. Vertical padding is smaller, and Task time, metadata and source share a compact line; real metadata still wraps and remains available in accessible labels. No fictional overflow, Habit, appointment, Edit or one-tap payment control was added.

Fitness directly opens the active projection's target when active, the existing completed workout target when appropriate, or the existing Fitness tab for next/empty states. It never starts, finishes or edits a workout. The former Home Fitness detail branch was removed without deleting source projections or rotation utilities. Journal still pushes `/journal`; both navigation cards preserve the selected Today/Attention state for return to Home.

## Motion, scrolling, responsiveness and accessibility

Disclosure uses React Native LayoutAnimation with the existing 180ms selection token for position updates and entering opacity. The existing ReducedMotionContext disables it. There is no delayed state change or exiting duplicate panel. Navigation, source refresh and photographs do not trigger this disclosure animation. No scrollTo, nested vertical scroller, new gesture owner or safe-area adjustment was added. Selected state remains local and survives snapshot refresh.

The existing measured-container/font-scale column rule remains: fewer than 320 effective units stacks the cards. Standard 390/430pt phones use two columns at normal text size; 320pt and doubled phone text stack. Expanded headings stack their icon above text at font scale 1.5 or greater, preserving the full heading width. No font scaling is disabled. Native font measurements and reflow still require device verification.

Light and dark use the existing five feature palettes and existing protected text overlays. Dense details use the matching feature body surface rather than photographs. Artwork and icons remain decorative to assistive technology; disclosure state, directional chevrons and hints distinguish expansion from navigation without depending on color. New controls occur in logical reading order. Existing loading/error/Retry, failed-image fallback and transaction Save/Cancel/Back behavior remain.

## Data, performance and asset preservation

No edits were made to Home data, projection, types, refresh or hook files; source feature/domain code, native tabs, dependencies, schema, migrations and persistence were unchanged. Focus, foreground, minute/local-midnight refresh, last-good snapshot, mutation refresh and the separately mounted transaction editor remain intact.

Spent today retains exact bigint BRL formatting and actual Finance ledger semantics, including linked actual payments and reversals. Planned Commitments and expected Work are not expenses. The separate Add transaction target remains the actual expense-default editor.

All five existing WebP files, prompt sidecars, provenance and HomeArtwork implementation were reused unchanged. Their combined raster footprint remains 76,848 bytes. Stable local sources, memoization, memory caching, zero image transition and image-failure fallback remain. Expanding performs no additional source reads, N+1 queries or extra image generation.

## Skill findings

- **frontend-design:** retained the incumbent image-led identity; changed information budgets and layout topology instead of introducing decoration. Spare card height belongs to existing artwork rather than blank copy regions.
- **Impeccable:** identified verbose Attention copy, redundant Fitness detail, detached expansion and cramped large-text heading. One batched inspection and correction pass was followed by confirmation; the large-text heading correction was functional accessibility work, not an open-ended cosmetic loop. Existing missing design metadata/PRODUCT SDK wording were not repaired as a side effect.
- **UI/UX Pro Max:** applied screen-reader naming/focus-order guidance and explicit disclosure versus navigation semantics. Actual source controls and empty states take precedence over mockup inventions.
- **Expo building-native-ui:** checked [SDK 58](https://docs.expo.dev/versions/v58.0.0/), existing safe-area/native-tab ownership, native-compatible reflow, Reduced Motion, Dynamic Type adaptation, stable images and one vertical scroll owner. [React Native LayoutAnimation](https://reactnative.dev/docs/layoutanimation) documents automatic New Architecture support; no legacy global enable flag was added.

## Evidence and validation

See [browser evidence](previews/home-v2-1/README.md) for the scenario manifest, reproduction commands and limitations. Browser evidence supplements source-backed tests; it does not establish native certification.

The pre-edit suite passed **1,427/1,427**, exit 0. The first sandbox attempt failed before testing because tsx could not read Windows user information; the authorized retry outside the sandbox supplied the valid baseline. Eight new tests cover row/stacked placement, one panel, identity, selection, no extra reads, direct routes and motion preference. Obsolete presentation expectations for Fitness expansion and bottom-of-grid detail were replaced with the new authorized behavior; source/mutation checks were retained.

The first post-change full run passed 1,434/1,435. Its only failure was an existing Home-to-Fitness integration test still expecting a second Resume button press; that test now presses the direct card and retains its exact destination, same-session and inline Workout assertions. This was an obsolete interaction expectation, not an unrelated flaky failure.

| Validation | Final result |
| --- | --- |
| Pre-change baseline | 1,427/1,427 pass; exit 0 |
| Focused Home | 86/86 pass, including eight new tests; also included in the final targeted regression run |
| Targeted source regressions | 369/369 pass; Home, Tasks, Commitments, Work, Fitness/navigation, Journal/navigation and Finance actual-spending coverage; exit 0 |
| Full suite | 1,435/1,435 pass; zero failed/cancelled/skipped; exit 0; 185,295ms |
| TypeScript | Pass; exit 0 |
| Changed-file ESLint | Pass; zero errors/warnings; exit 0 |
| Full ESLint comparison | Exit 1 from exactly the preexisting six errors and two warnings; baseline/final message sets identical; delta 0 |
| iOS production export | Pass; exit 0; all five existing WebPs present; Hermes entry about 5.2MB |
| Android production export | Pass; exit 0; all five existing WebPs present; Hermes entry about 5.4MB |
| Browser matrix | 80 cases / 122 original captures / 16 contact sheets; no page errors or overflow/containment failures |
| `git diff --check` | Pass; exit 0 |

The unchanged ESLint findings are six `react/no-children-prop` errors in `context-menu.test.ts` (3), `navigation-conventions.test.ts` (2), and `transactions-experience.test.ts` (1), plus two unused-variable warnings in `tasks-experience.test.ts`. No errors were suppressed or unrelated assertions weakened. No unrelated flaky failure was observed.

Validation logs and exports are ignored under `dist/home-v2-1/`, `dist/home-v2-1-ios/` and `dist/home-v2-1-android/`.

## Files changed in this refinement

- `src/features/home/components/home-content.tsx`: compact summaries, content-sized bodies, row/stacked detail slot, direct Fitness route, restrained attachment, smaller row spacing, motion and accessible heading adaptation.
- `tests/home-components.test.ts`, `tests/home-experience.test.ts`, `tests/home-v2.test.ts`: replace superseded layout/Fitness interaction expectations while retaining source behavior checks.
- `tests/fitness-experience.test.ts`: direct Home card entry, retaining active-session/Workout assertions.
- `tests/home-v2-1.test.ts`: eight new disclosure, responsive order, navigation and motion tests.
- `scripts/review-home-v2-1.cjs`: separate v2.1 evidence matrix; reuses the existing preview builder.
- `docs/home-v2-1.md`, `docs/previews/home-v2-1/`: audit, findings, results and browser evidence.

The other dirty Home v2 source/assets/docs/helpers/review files predate this task and were preserved. The current v2.1 production edit is confined to HomeContent.

## Git state

Branch `main`, HEAD `16b7737` (`Work visual revamp`). Initial status had eight modified tracked files and seven untracked groups. Final status has nine modified tracked files and eleven untracked groups. The additional tracked file is the Home-to-Fitness integration test; new groups are this report, v2.1 visual evidence, the v2.1 review script and the v2.1 test file. No reset, clean, commit or push was performed.

## Physical testing still needed

- Actual iPhone 390pt row heights and font measurements; both supplied expanded states.
- iPhone 320pt/large accessibility text and Android font/display scaling.
- Native expand/collapse/switch animation, rapid presses, foreground/minute/midnight refresh while selected.
- Scroll stability near the bottom, last actionable row above native tabs, gesture behavior and performance.
- VoiceOver/TalkBack expanded-state announcements, logical newly revealed controls, and separate Task completion/source actions.
- Actual active/completed Fitness routes, Journal return, and transaction Save/Cancel with native navigation.

No simulator/emulator or physical device was available in this Windows environment. iOS/Android exports are build checks, not physical-device evidence.

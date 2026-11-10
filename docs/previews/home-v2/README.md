# Axis Home v2 visual evidence

These images render the actual `HomeScreen`, `HomeContent`, Home artwork and shared UI through React Native Web. Synthetic records are created through the real in-memory SQLite source services and `createHomeDataAccess`; no personal records or image-derived example values are used.

The final matrix has **60 cases, 84 original PNG captures and 11 contact sheets (95 PNG files total)**. [checks.json](checks.json) is the machine-readable case manifest, including theme, scenario, width, font-scale proxy, action, capture filenames and page errors. All recorded cases passed page-error, horizontal overflow and horizontal/vertical content-containment checks. Every PNG has an embedded Origin text chunk recording the rendering boundary and limitations.

## Reproduction

From the repository root, with the existing dependencies installed:

```powershell
node --import tsx scripts/preview-home-v2.ts
node scripts/review-home-v2.cjs
```

The first script builds ignored `dist/home-v2-preview/index.html` and generates fresh source-backed SQLite snapshots. The second uses Playwright/Chromium, writes original captures and `checks.json` here, then groups originals into eight-image contact sheets. It supports `AXIS_PLAYWRIGHT_PATH` for the installed Playwright Core module and `AXIS_CHROMIUM_PATH` for the Chromium executable. Defaults are the implementing machine's existing installations; a different machine must supply its own paths. This does not add a project dependency.

`scripts/preview-home-v2.ts` and `scripts/review-home-v2.cjs` are the source of truth for the harness and case list. Generating captures replaces the corresponding evidence files; run deliberately after any presentation change and review the resulting originals/contact sheets.

## Scenario index

Each filename below has a `dark` and `light` counterpart. Ordinary cases use a 390 × 844 browser viewport; stress cases also use 320, 430 and 768 widths. `top`/`bottom` are actual viewport captures at separate scroll positions, not stitched full-page images.

| Family | Evidence and purpose |
| --- | --- |
| `populated-*-top.png` | Collapsed grid, shallow actual-spending strip and all four distinct artwork identities |
| `today-*-top/bottom.png` | Selected Today panel, source rows, completion/navigation targets and Calendar action |
| `attention-*-top/bottom.png` | Selected Attention panel, overdue source context and lower content clearance |
| `fitness-*-top/bottom.png` | Selected active Fitness panel and Resume action |
| `journal-*-top.png` | Journal pushes `/journal` while the previously selected Today panel remains mounted; no fabricated Journal panel |
| `transaction-*-top.png` | Actual existing transaction editor mounted from Add transaction, defaulting to Expense |
| `empty`, `one`, `mixed` | Zero/one/pending-plus-completed/recurring task source fixtures; completed items remain excluded from the pending Home projection |
| `tasksOnly`, `workOnly`, `commitments` | Real supported attention sources and count/breakdown semantics |
| `fitnessPartial`, `fitnessAll`, `targetless` | Some/all exercises manually completed while the workout remains active, and a free targetless active workout; no invented progress ratio or automatic finish |
| `completed`, `next` | Completed-today state and saved next rotation/routine state |
| `saved` | Real saved Journal entry presence, without exposing entry content |
| `stress-*-top/bottom.png` | High attention count, long source titles/workout names and exact large BRL amount |
| `stress-*-{320,390,430,768}-{1,2}-top/bottom.png` | Width and doubled-text stress; ordinary 390/1 uses the shorter stress filename |
| `fallback-*-top.png` | All five image-error events remove the plates and retain usable tonal/text/action fallback |
| `error-*-top/recovered.png` | Initial source-read failure and successful Retry recovery |
| `loading-*-top.png` | First-load indicator before a snapshot |
| `localized-*-top.png` | Long locale-formatted date using German browser locale |
| `contact-1.png` through `contact-11.png` | Visual review index of the 84 original captures |

Representative originals: [dark Home](populated-dark-top.png), [light Home](populated-light-top.png), [dark Today](today-dark-top.png), [light Attention](attention-light-bottom.png), [dark Fitness](fitness-dark-bottom.png), [320 doubled text](stress-dark-320-2-top.png), [image fallback](fallback-light-top.png), [transaction editor](transaction-dark-top.png).

## Rendering boundary and limitations

- Home components and shared UI are real; native image/font/safe-area/picker surfaces, Router, Home hook/lifecycle, Alert and database-provider boundaries have browser stand-ins. The browser image stand-in forwards `onError`; web font faces use the bundled Axis font files.
- Real source services construct synthetic SQLite snapshots before the browser build. The browser Home hook consumes those snapshots rather than opening a device database. Browser task completion throws a read-only-fixture error; mounted source-backed integration tests verify completion and persistence semantics.
- The actual transaction editor is rendered, with fixture Finance categories. Browser financial writes throw a read-only-fixture error. The visual captures open the editor and never commit a financial transaction. Save/Cancel/Back, validation, category/retry behavior and refresh are verified in mounted tests, not by a screenshot of successful browser persistence.
- Router calls are recorded, not native navigation. The Journal case asserts the `/journal` destination and that the selected panel survives; it does not render or certify the Journal editor.
- A 24-pixel top reservation and 80-pixel bottom reservation model native boundaries. The bottom reservation is a native-tab proxy, not a custom Axis tab bar. Actual `AppTabs` remains native and unchanged.
- The 2× cases override browser fontScale and double CSS font sizes/line heights. They test wrapping/containment and stacking, not iOS/Android OS Dynamic Type or screen-reader output.
- Browser Reduced Motion is enabled. Images have no transitions or decorative animation. These captures do not measure native frame rate, startup time, decoded image memory or device performance.
- Error/loading cases use injected browser hook state. Stale-data retention, mounted editor survival and actual focus/foreground/minute refresh are covered separately by source-backed mounted tests.

A fresh independent reviewer inspected all 11 final contact sheets, nine originals and relevant source, and found no material issue within this scope. The implementing agent had the approved inline reference; the independent review did not perform an inline-image pixel comparison. Initial captures exposed stacked flex clipping and overly opaque text bodies; one bounded correction batch produced this final matrix, which also checks vertical containment.

These captures are browser visual evidence, not native-device certification. Physical iPhone/Android verification remains necessary for native safe areas/tabs, real image and font rendering, keyboard/Back behavior, VoiceOver/TalkBack, OS Dynamic Type, gestures and performance. Native `adb`/emulator/`xcrun` were unavailable during this work. See the [implementation and validation record](../../home-v2.md) for test results, asset provenance and the final export status.

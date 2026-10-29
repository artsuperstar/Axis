# Finance Work Editor v2 — preview evidence

These are supporting browser captures of the real shared `WorkEditor` and `AdaptiveModal`/`AdaptiveSheet`, rendered through React Native Web. They are not native iOS/Android certification. Implementation, the preserved 30-point audit and financial invariants are documented in [Finance Work Editor v2 — New/Edit](../../finance-work-editor-v2.md).

## Provenance and limitations

[`preview-work-editor-v2.ts`](../../../scripts/preview-work-editor-v2.ts) generates fixtures through the real SQLite Work services and bundles the actual editor and shared components. Fixtures include saved Hourly/Fixed entries, a partially paid archived client and domain-validated maximum amounts. They use civil dates around 2026-10-27; the runner uses `pt-BR` and `America/Sao_Paulo`. Fixture values are review data, not production defaults.

Native boundaries are substituted for browser execution:

- React Native is rendered by React Native Web; installed Manrope/Lora assets are embedded and font loading is substituted.
- Safe-area insets use 24 top / 16 bottom rather than measured device insets.
- The iOS picker boundary renders an HTML date input; Android OS picker dialogs are not exercised in these screenshots.
- The keyboard scenario supplies a 550-point top frame / 294-point height. It does not open or test an actual software keyboard.
- The 2× cases report `fontScale: 2` and double DOM font sizes/line heights. They stress layout; they do not implement operating-system Dynamic Type.
- Reduced-motion behavior is requested and native motion is substituted. Native animation and assistive technology require device review.

The browser Save callback calls shared `validateWorkDraft`, records the draft and can inject an error. It performs no persistence/source write. Browser client creation returns an in-memory ID so the selection flow can be reviewed. Actual atomic persistence, canonical creation/duplicates, paid-work restrictions and financial reconciliation are covered separately by SQLite/editor integration tests and domain regressions.

## Scenario map

The final completed run passed **39 scenes with zero automated geometry/runtime failures**, producing **112 original captures and 14 galleries**. All 14 final galleries were manually opened, with original-detail inspection where needed. Consult `checks.json` and `dist/work-editor-v2/browser-final.log` together. A capture count alone is not a native-device pass.

| Capture prefix | Coverage |
| --- | --- |
| `new-hourly-{dark,light}` | Empty Hourly creation, actual placeholders, compensation and complete lower form |
| `new-fixed-{dark,light}` | Empty Fixed creation and supported amount field |
| `editHourly-{dark,light}` / `editFixed-{dark,light}` | Saved title, client, multiline description, dates and active compensation |
| `paid-{dark,light}` | Historical receipt/archived client presentation and locked ownership |
| `stress-fixed-{320,390,430}-{dark,light}-{1,2}` | All three widths, both themes, normal/2× text, long unbroken title/client, description and maximum amount |
| `stressHourly-{dark,light}` | Maximum Hourly rate and full calculated Earned at 2× text |
| `missing-title` / `missing-client` | Required identity/client error states |
| `invalid-duration` / `invalid-rate` / `incomplete` | Invalid duration/rate and incomplete authoritative Earned placeholder |
| `client` / `create-client` | Open search and existing inline create/selection with retained Work draft |
| `description` | Multiline input beyond 500 characters without an inner scroller |
| `work-date` / `expected-date` / `clear-date` | Picker boundary, distinct expected date and clearing |
| `switch-fixed` / `switch-hourly` | Both switch directions and retained hidden Hourly draft |
| `save-error` | Injected Save failure with source-style error and preserved input |
| `keyboard` | Focused editing, reachable note and header above the substituted keyboard frame |

The base `.png` shows the upper form or opened interaction. `-compensation.png` shows active terms and Earned; `-earned.png` separately exposes full Earned in 2× cases; `-bottom.png` exposes Payment expectation and the complete informational note. `contact-N.png` groups up to eight originals at a reduced size for review. Open originals to inspect detail; galleries are navigation aids.

## Checks and review

`checks.json` records the scene name, four section IDs, Save/Cancel bounds, Description scroll/client height, Earned text, runtime errors and horizontal-overflow observations. The runner checks header controls remain within the viewport with shared minimum touch dimensions and no overlap; it also checks the lower note is reachable. DOM/text geometry checks detect content outside owned sections, horizontal document overflow and clipped Description content.

The first completed run had 39 scenes and no automated geometry/runtime failures, with 104 originals in 13 galleries. Manual review still found an orphaned final letter in the 320-point doubled-text Compensation heading. A local serif `headingStyle` corrects that narrow case; final capture review confirms the correction. The final run adds eight dedicated Earned captures: six Fixed cases and two Hourly cases at 2× text.

The independent finish reviewer returned **recapture** solely for missing actual native iOS/Android evidence, including any additional shipped tablet/iPad classes. No source or browser defect was inferred, and no fidelity or ship verdict was issued. The evidence gate stopped before persistence, fidelity, ceiling, truth or craft-floor review. See `dist/work-editor-v2/finish-review.md`.

Closing that gate requires native captures with device/OS, viewport, appearance, actual OS text settings and simulator/emulator versus physical hardware identified. Include complete upper/compensation/bottom views; real keyboard, focus reveal and IME/cutout insets; both native date pickers and focus return; client search/create; New/Edit and Hourly/Fixed in both themes; errors; historical receipts; and long values at enlarged native text. Record supported device classes and capture every shipped class. Supply an authoritative native capture manifest (or `.impeccable/review/`) for a fresh full review. Bundle exports and these browser captures cannot substitute for it.

These checks do not prove screen-reader announcements, native focus return, picker dismissal, OS keyboard interactions, device safe areas or real Dynamic Type. The native checklist is in the main document.

## Reproduction

Use the repository's installed `tsx`/Node environment. No dependency installation is part of this preview work.

```powershell
$env:ESBUILD_WORKER_THREADS = '0'
node --import tsx scripts/preview-work-editor-v2.ts
node scripts/review-work-editor-v2.cjs
```

`ESBUILD_WORKER_THREADS=0` was used for the current host's build. The build writes temporary preview files to `dist/work-editor-v2-preview`; the review reads that bundle through a local `file:` URL and writes captures/checks here. The review uses `playwright-core` and Chromium from the existing local tools. Override those locations as needed:

```powershell
$env:AXIS_PLAYWRIGHT_PATH = 'C:/path/to/node_modules/playwright-core'
$env:AXIS_CHROMIUM_PATH = 'C:/path/to/chrome.exe'
node scripts/review-work-editor-v2.cjs
```

`AXIS_REVIEW_CASE` optionally selects one exact scene name for diagnosis. A filtered run is not the full matrix and must not be reported as one. The runner does not clean older captures; interpret originals against the current scene list and completed full-run logs.

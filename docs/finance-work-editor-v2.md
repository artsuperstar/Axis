# Finance Work Editor v2 — New/Edit

## Existing editor behavior audit (before implementation)

1. Main Work's Add work opens WorkView's existing `edit` dialog with a new-entry key; client details can seed a client ID.
2. Job details' Edit opens that same dialog with the saved entry ID. Source-targeted details and History retain the same owner.
3. `WorkEditor` in `work-forms.tsx` owns one local `WorkDraft` initialized by `workDraft`; New and Edit share its implementation.
4. WorkView owns the existing `WorkModal`. WorkEditor supplies its child AdaptiveSheet. Cancel/outside/Back dismiss through that owner; no second modal is needed.
5. Job title is required, explicitly single-line, normalizes line separators through `singleLineText` and trims on validation. There is no arbitrary maximum length.
6. Client selection uses AutocompleteField, existing canonical search, active matches and source IDs. It does not use free-text client identity.
7. Client creation is an inline autocomplete action, not a separate client-creation modal. Source normalization rejects duplicate active identities and successful creation selects its returned ID.
8. Archived clients remain labeled on saved historical work. Active clients are offered for changes; source validation permits retaining the existing archived reference.
9. Description is optional, multiline and trimmed at persistence while retaining internal newlines. It has no 500-character domain limit; the mockup counter must be omitted.
10. New Work date defaults to local today. Saved dates prepopulate Edit. Validation requires a valid local date no later than today.
11. Hourly uses whole-hour/minute strings and a BRL hourly-rate string; the draft starts empty, with example placeholders rather than saved defaults.
12. Fixed uses the existing Fixed amount field. Hidden Hourly inputs do not contribute to persisted Fixed compensation.
13. Duration accepts whole nonnegative digit strings, minutes 0–59, positive total duration and the supported safe-integer minute range. Zero/malformed/negative/out-of-range values fail.
14. Hourly rate uses the existing positive BRL centavo parser and maximum amount range.
15. Fixed amount uses that same parser; no floating-point money persistence is introduced.
16. Earned preview calls `earnedMinor(compensationValues(draft))`. Hourly arithmetic uses BigInt and nearest-centavo half-up rounding; incomplete/invalid terms show the existing placeholder.
17. Switching compensation type changes only `compensationType`. Both hidden drafts remain in memory; domain conversion nulls incompatible persistence fields.
18. Expected payment date starts empty, is optional, prepopulates Edit and has an explicit Clear expected date action.
19. An expected date must be a valid local date if supplied; it has no required ordering relative to Work date and is not a receipt date.
20. Create calls the existing source service through WorkView's mutate wrapper. Validation and client verification precede the atomic insert.
21. Edit preserves entry identity and source references. It revalidates current source state inside the transaction; Earned cannot fall below Received.
22. Any received allocation locks client selection. Existing partial/multi-entry receipts and actual ledger transactions are not rewritten by Work editing.
23. Source aggregation reconciles Earned, active receipt allocations and Outstanding. Compensation edits affect remaining balance under those same rules.
24. Entry `counterpartyId` remains the real client owner. Job title, optional description and receipt category have distinct meanings.
25. WorkDate dismisses the keyboard before native pickers. Work date has a native maximum of today. Android retains the installed picker's callbacks; iOS uses its existing inline spinner/Back behavior. Opening an empty iOS expected date currently seeds local today; preserve that established behavior.
26. Work draft lives in the mounted editor; client overlay transitions retain it. Cancel/outside dismissal discards unsaved Work without an additional confirmation. No autosave exists.
27. Save has a synchronous ref guard against duplicate invocation; success dismisses, failure releases the guard and retains the draft with the source error. There is no asynchronous loading state to invent.
28. Creating/editing compensation creates no Income. Only the separate Work receipt/allocation service records actual ledger Income.
29. Calendar projects open Work by expected payment date; Overview and Journal actual-income projections read actual receipt transactions.
30. Installed Expo is SDK58. AdaptiveModal/AdaptiveSheet already own modal stacking, safe areas, keyboard measurements, focus reveal and the single form-body scroller. Existing native tabs remain outside this editor.

## Direction and scope

Ordinary extension of Axis Warm Editorial Hearth in Operate mode. The supplied image pins the four-section composition: Job, Work details, Compensation and Payment expectation. Reuse EditorSection, the v2 shared controls, serif editor headings and incumbent scoped tokens. Generic icons only; colors remain provisional. Do not add the mockup's unsupported description counter or hardcode its date/duration/rate. Preserve the prior uncommitted Work main-screen implementation. Record Payment, Job details, Clients management and Work History remain outside the visual redesign.

## Validation and evidence

The actual pre-change full suite passed **1,349/1,349** with test concurrency 1. The previously reported Tasks timing failure did not occur in this baseline. The final full suite passed **1,358/1,358**, and the broad financial/navigation regression selection passed **542/542**. TypeScript, changed-file ESLint and both platform exports passed. The global lint baseline remains unchanged at six errors and two warnings. An export is bundle evidence, not a native device run.

Browser captures are supporting evidence. Actual native keyboard, picker, enlarged-text and safe-area verification requires iOS/Android devices or simulators. See [the preview evidence guide](previews/work-editor-v2/README.md) for capture provenance, substitutions, scenario coverage and reproduction.

## Previous editor

The incumbent shared form already supported New and Edit, title/client/description, Work date, Hourly/Fixed compensation, calculated Earned and optional payment expectation. Its legacy presentation used three plain groups: Job included Work date, Pricing held compensation, and Payment expectation preceded a separate informational note. It used the shared sheet header and legacy controls. This change reorganizes that complete form around the supplied upper-form reference while retaining the lower fields absent from the image crop.

## Four-section composition

| Section | Owned fields and feedback | Generic icon |
| --- | --- | --- |
| Job | Required Job title and Client; optional Description | Briefcase |
| Work details | Required Work date | Calendar |
| Compensation | Required Hourly/Fixed choice; active compensation fields; authoritative Earned; existing paid-work restriction text | Credit card |
| Payment expectation | Optional expected date, conditional clear action and the earned-versus-received explanation | Calendar |

Each is the incumbent `EditorSection` with `variant="group"`; labels sit above full-width fields. A short section description explains the task. The fourth section remains reachable through the same body scroller, including the note: “Work records money earned. Income is recorded only when you receive a payment.”

### Job identity, client selection and description

Job title stays a required single-line input. `singleLineText` normalizes pasted line separators; source validation trims surrounding whitespace. There is no invented title-length limit. Long drafts receive a selectable wrapped readback without changing the input's single-line semantics.

Client uses the existing canonical autocomplete and real counterparty IDs with `appearance="v2"`. Search, active matches, duplicate rejection and selection stay in their existing services. Its supported create action is inline in the autocomplete flow: creation returns the source ID, selects it and closes the selection surface while WorkEditor stays mounted. There is no new client-creation modal. Draft title, description, dates and compensation survive selection/creation.

Saved archived client references remain labeled and retainable. Entries with any Received allocation expose the existing noneditable Client field and explanation; compensation edits still revalidate paid-work restrictions in the source.

Description is optional and multiline. It starts with a 96-point minimum and grows from content measurements with `scrollEnabled={false}` so the body owns vertical scrolling. Persistence trims its outer whitespace and preserves internal newlines. The mockup's 500-character counter and limit are omitted because neither belongs to the domain.

### Work date

New work still starts on local today; Edit uses the stored civil date. The required Work date cannot be in the future. It remains conceptually separate from expected payment and from an actual receipt date. Only its optional visual appearance changed; the shared `WorkDate` picker logic and legacy payment caller retain their behavior.

### Hourly, Fixed and Earned

Hourly shows labeled Hours and Minutes plus the existing BRL Hourly rate. New drafts keep hours, minutes and amounts empty: `2`, `30`, `50,00` and `800,00` are placeholders, not persisted defaults. Duration accepts whole nonnegative digits, minutes 0–59 and a positive total within the existing safe range. Monetary parsing keeps the existing positive/maximum limits, accepted BRL formats and integer centavos.

Fixed shows the actual existing Fixed amount field and hides Hourly-only inputs. Switching changes only `compensationType`, retaining hidden draft values and unrelated input in memory. The existing conversion persists only the active model's fields.

Earned remains directly below the active compensation fields. The editor calls `earnedMinor(compensationValues(draft))`; it introduces no separate preview formula. Existing BigInt arithmetic and nearest-centavo half-up rounding remain authoritative. Invalid/incomplete terms show “Enter compensation terms.” The selected field and calculated Earned use wrapping or conditional long-value readback without truncating the persisted amount. The maximum supported amount is exercised through domain-generated fixtures.

### Payment expectation and financial integrity

Expected payment date remains optional, initially empty and explicitly clearable. Edit prepopulates its saved value. Existing validation permits any valid supplied local date without adding an ordering rule relative to Work date. The current iOS behavior that seeds local today when opening an empty expected-date picker is preserved; opening it is not a no-op until Back.

Creating or editing Work records Earned. It creates no actual Finance Income. Only the separate explicit receipt/allocation flow creates ledger Income; expected dates drive Calendar projections rather than actual receipts. Work editing preserves entry IDs, client references, receipt allocations and linked transactions. Current source transactions revalidate stale state and prevent Earned falling below Received. No compensation edit silently rewrites historical receipt amounts or dates.

## Modal, save and connected flows

WorkView continues to own exactly one existing `WorkModal`; WorkEditor supplies its child `WorkSheet` with `appearance="v2"`. The editor supplies a single custom header with Cancel, the serif New work/Edit work title and Save. No duplicate Back action or second modal is introduced.

At ordinary 390/430-point widths the title and actions share one row. Below 390 points or at `fontScale >= 1.4`, the title occupies the first row with Cancel/Save beneath. Cancel, outside dismissal and the owning Back behavior retain the existing discard semantics. There is no autosave or new unsaved-changes prompt.

Save retains the synchronous ref guard. Success dismisses; source failure releases the guard, displays an alert and preserves the full draft for correction/retry. No asynchronous busy state is invented for this synchronous service contract. Errors clear as fields change and the next Save revalidates source truth.

Existing Add Work, source/detail Edit, seeded client context, Work refresh, details refresh, Calendar and Journal paths remain connected through WorkView. Record payment, Job details, Clients management and Work History retain their visual presentation. `WorkPaymentEditor` stays legacy; `WorkDate` only receives an optional appearance used by the new editor. Existing uncommitted Work main-screen changes are preserved.

## Layout, scrolling and accessibility

The form uses the existing AdaptiveModal/AdaptiveSheet safe-area, keyboard measurement, focused-field reveal, FormSelectionHost and body scroller. It adds no competing keyboard-avoidance wrapper. Client search temporarily uses its existing selection surface and result list; the long Description itself has no inner scroller. Date selection dismisses the keyboard before the existing native picker opens. iOS retains the inline spinner and picker Back control; Android retains the installed native picker callbacks.

Duration uses equal flexible widths normally and stacks below 360 points or at `fontScale >= 1.4`. Section icon/title groups stack at that same threshold. At widths below 390 with enlarged text, a local `18/26` heading style prevents an isolated final letter while retaining the Lora serif family. `EditorSection` accepts an optional `headingStyle` for this case; existing callers do not change.

Inputs and labels retain their native semantics, required markers and accessibility labels. The compensation choice announces its radio selection, Hours and Minutes have distinct labels, dates remain distinctly named, and the shared error is an alert/live region. Header and field controls retain shared touch targets. Earned is selectable, unrestricted by `numberOfLines` or a font-size cap; long single-line input values receive conditional readable text. Ordinary short values are not repeated. Decorative icon handling and reduced-motion behavior come from shared controls. Screen-reader order, native focus return and actual operating-system text enlargement still require device review.

## Scoped visual system captured from implementation

This is an ordinary extension of Warm Editorial Hearth, not a new global identity. The source of truth remains [`design-system-v2.ts`](../src/constants/design-system-v2.ts), [`design-system.tsx`](../src/components/design-system.tsx) and the shared controls. These observations document the editor; they do not establish a new global palette or repair unrelated context drift.

### Colors

| Existing token | Light | Dark | Editor use |
| --- | --- | --- | --- |
| `canvas` | `#F5F0EA` | `#151315` | Warm sheet and outer environment |
| `surface` | `#FFFCF8` | `#1B181A` | Field surface |
| `group` | `#FBF5F0` | `#242024` | Four owned sections |
| `control` | `#F8F3EF` | `#2B272A` | Control family |
| `selected` | `#F1E1E8` | `#3C2B35` | Selected compensation/state |
| `textPrimary` | `#241E1C` | `#F6F0ED` | Titles, labels, input and Earned |
| `textSecondary` | `#6A5E59` | `#C9BDB8` | Descriptions, note and readbacks |
| `border` | `#E4DAD4` | `#3A3337` | Restrained section/control separation |
| `brand` | `#7B425E` | `#DFA6BF` | Icons, selected and focus treatment |
| `brandStrong` | `#68344E` | `#EDBAD0` | Save action |
| `brandSoft` | `#EBD8E1` | `#422E38` | Generic section icon discs |
| `onBrand` | `#FFF9FB` | `#2A1720` | Save text |
| `danger` | `#9B303E` | `#F0ABAB` | Accessible source error |

The mockup's mint does not override current scoped v2 tokens. Plum accents and all colors remain provisional pending the Axis-wide design-system pass.

### Typography

Loaded display text uses existing `AxisLora-SemiBold`; interface text uses existing `AxisManrope-Regular` and `AxisManrope-SemiBold`. No new fonts were added. Existing load-failure fallback remains available.

| Actual role | Base size/line height | Application |
| --- | --- | --- |
| Local editor title | 24/32 | Serif New work/Edit work |
| `editorSection` | 20/28 | Serif section headings |
| Narrow enlarged section override | 18/26 | Width <390 and fontScale >=1.4 only |
| `fieldLabel` | 14/20 | Semibold sans labels |
| Input/body | 16/24 | Native inputs and body |
| `secondary` | 14/20 | Supporting text and long-value readback |
| `cardTitle` | 16/24 | Calculated Earned |
| `button` | 15/22 | Cancel/Save/actions |

Native text scaling is not disabled. Numeric readbacks and Earned use tabular figures; values may wrap instead of being ellipsized.

### Shape, spacing and depth

The editor uses `DesignSpace.md` (12) for body padding, section separation, section padding and field gaps; small header/note gaps use 8 and readback gaps use 4. Group corners use the incumbent 16-point radius and continuous curve; control corners use 10. Generic icon discs are 36×36 with radius 18 and 22-point icons. Shared v2 actions have a 48-point minimum touch size. The header handle is 36×4 with radius 2. Description alone starts taller because it holds multiline input.

Depth comes from warm tonal surfaces and restrained borders. The editor adds no shadow, illustration, gradient, merchant artwork or new motion vocabulary. Shared focus, selection, press feedback and reduced-motion behavior remain responsible for interaction states.

### Rules for further work on this editor

- Preserve the four-section ownership and the distinction between Work date, expected payment and actual receipt.
- Keep labels above fields, let the body scroll and let Description grow with its content.
- Keep the loaded serif/sans hierarchy, compact generic icon discs and current scoped tokens.
- Preserve full financial values through wrapping/readback and authoritative calculation; do not add a display-only money formula or length cap.
- Reuse the shared modal and selection ownership; do not add a second Work modal or invent a separate client-creation screen.

## Concrete skill findings

| Skill/review | Material contribution |
| --- | --- |
| frontend-design | Established Job / Work details / Compensation / Payment expectation hierarchy from the reference and complete incumbent form; retained the existing serif/sans hierarchy and generic icons alongside Transaction/Commitment v2. |
| Impeccable | Kept an Operate surface within the incumbent world; checked density, restrained group nesting, header balance, light/dark consistency and image-crop omissions. The 320-point doubled-text review found an orphaned final letter in Compensation; the scoped serif heading override resolves it. |
| UI/UX Pro Max | Queried “error feedback preserve input” and reviewed Error Recovery, Error Feedback and Input Types. Applied the findings to source-error draft retention, field labels, appropriate numeric keyboards, selected compensation feedback and optional expected date. |
| Expo/native guidance | Reviewed installed SDK 58 versioned guidance and existing shared modal, safe-area, focus, keyboard and native picker ownership; reused those boundaries and avoided competing wrappers. There is no separately installed Expo skill to claim. Device execution remains outstanding. |

Root `DESIGN.md` is missing and `PRODUCT.md` still refers to SDK 57 although the installed app is SDK 58. That pre-existing drift is reported only: this task does not authorize global product/design repair. No new generated artwork or fonts were needed.

## Changed-file boundaries

| File | Scope |
| --- | --- |
| `src/features/finance/work/components/work-forms.tsx` | Shared New/Edit v2 presentation, responsive/readback layout and optional WorkDate appearance; legacy payment editor retained |
| `src/components/editor-section.tsx` | Optional `headingStyle`; no changed incumbent callers |
| `tests/work-editor-v2.test.ts` | Nine SQLite/editor integration tests |
| `tests/work-experience.test.ts` | Existing heading/label expectations updated, preserving prior Work-main edits |
| `scripts/preview-work-editor-v2.ts` | Real-editor browser bundle and SQLite-generated fixtures |
| `scripts/review-work-editor-v2.cjs` | Supporting browser interactions, geometry checks and captures |
| `docs/finance-work-editor-v2.md` | Original 30-point audit preserved; implementation, system and evidence documented |
| `docs/previews/work-editor-v2/` | Supporting capture originals, galleries, checks and README |

No domain helper, schema, migration or dependency change belongs to this editor work. Initial existing worktree changes are recorded in `dist/work-editor-v2/status-before.txt` and `existing-changes.patch`. No commit or push is part of the task.

## Automated and visual results

| Check | Result/evidence |
| --- | --- |
| Actual initial full suite, concurrency 1 | Passed 1,349/1,349; `dist/work-editor-v2/baseline-full.log` and `baseline-full-result.txt` |
| Initial focused editor/existing experience | Passed 50/50 before final narrow-heading fix; `focused-editor.log` and `focused-editor-result.txt` |
| Final full suite | Passed 1,358/1,358, exit 0; `dist/work-editor-v2/full-final.log` / `full-final-result.txt` |
| Financial/navigation regression selection | Passed 542/542, exit 0; `dist/work-editor-v2/regressions-final.log` / `regressions-final-result.txt` |
| TypeScript | Passed, exit 0; `dist/work-editor-v2/typescript-final.log` / `static-final-result.txt` |
| ESLint baseline comparison | Global exit 1 with the same six errors and two warnings; zero added/removed diagnostics. Changed-file lint passed, exit 0; `eslint-baseline.json`, `eslint-final.json` and `lint-changed-result.txt` |
| iOS export | Passed, exit 0; `dist/work-editor-v2/ios-export.log` / `ios-result.txt` |
| Android export | Passed, exit 0; `dist/work-editor-v2/android-export.log` / `android-result.txt` |
| Final browser scenes and capture review | Passed 39 scenes with zero geometry/runtime failures; 112 originals / 14 galleries, all 14 manually opened. Narrow enlarged Compensation orphan resolved; `browser-final.log` and preview `checks.json` |
| Previous Tasks motion test isolated rerun | Passed 10/10, exit 0; `dist/work-editor-v2/task-motion-isolated.log` / `task-motion-isolated-result.txt`. This is separate from the fresh baseline and final full suite. |
| Independent finish review | **Recapture**: missing actual native iOS/Android evidence and any additional shipped device classes. No browser/source defect inferred; no fidelity or ship verdict issued. `dist/work-editor-v2/finish-review.md` |
| `git diff --check` | Passed for the whole worktree, exit 0; `dist/work-editor-v2/diff-check-result.txt`. New text files also scanned with zero trailing-whitespace findings. |

The nine new integration tests exercise actual SQLite services through the mounted editor: four-section/modal/header ownership and Cancel; exact Hourly rounding and unrestricted description persistence without Income; reversible type switching; missing/malformed input and retained errors; injected persistence failure with one successful retry; inline client creation/duplicate rejection; paid archived edit restrictions with unchanged receipt links; native date callback/clear behavior; and narrow enlarged text with the maximum valid amount. Existing domain, payment, ledger, Calendar and Journal regression coverage remains authoritative for connected finance behavior.

## Native-device testing still required

No iOS or Android runtime/toolchain was available for this evidence pass. Browser screenshots, a mocked native date boundary, a substituted keyboard frame and a DOM 2× text stress test do not certify device behavior.

The independent finish reviewer returned **recapture** solely because those native captures are absent. Its evidence gate stopped before persistence, fidelity, ceiling, truth or craft-floor verdicts; it inferred no browser or source defect and issued no ship verdict. Capture both native phone platforms and document any shipped tablet/iPad classes, including device/OS, viewport, theme, real OS font setting and simulator/emulator versus physical hardware. Add the native files to an authoritative capture manifest (or `.impeccable/review/`) and request a fresh full review. Platform bundle exports do not close this gate.

- On iOS and Android, open New and Edit through supported entry points; check one modal, Cancel/outside/Back behavior and refresh after Save.
- At 320/390/430-equivalent widths and actual doubled accessibility text, inspect header, section headings, long client/title, multiline description and maximum money/Earned without clipping or horizontal scroll.
- With real keyboards, traverse every field, select/create a client and return to the same draft; verify focused-field reveal, visible Save and reachable bottom note with device safe areas.
- Open, change and cancel both native date pickers; confirm local-date semantics, Work-date maximum, optional expected-date clear and the preserved empty-iOS-picker seeding behavior.
- With VoiceOver/TalkBack and Reduce Motion, verify order, selected state, required/optional labels, source-error announcement, focus return and decorative icon suppression.
- Save valid Hourly/Fixed work, retry a source error, and edit archived/paid work while checking Earned/Received/Outstanding and unchanged receipt/Income history.

## Git status at handoff

HEAD remains `034215ca02a729a217985617710eeeabe500f23e`. Prior uncommitted Work-main changes are preserved; scoped edits and new files remain unstaged. No commit or push was performed.

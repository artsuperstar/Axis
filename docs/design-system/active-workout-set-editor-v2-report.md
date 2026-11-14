# Phase 3D-F.1 — Active Workout Set Editor

Implemented 2026-11-13. Set Editor and directly associated logging fields only. Native acceptance remains outstanding. No stage, commit or push.

## A. Executive summary

Migrated the existing active-workout Set Editor to explicit shared v2 appearance. Its sheet/header, performance fields, unit selector, duration descendants, text, form error and Delete action now use canonical contracts. Save remains copper, Delete remains semantic danger and existing Fitness identity pigments remain unchanged. No emerald migration.

Exactly one runtime file changed: `src/features/fitness/components/fitness-forms.tsx` (14 insertions / 13 deletions). No new editor tree, state owner, parser, persistence API, dependency, schema, route, native-tab change or shared default. Note Editor and Add Exercise/inline creation remain legacy preservation controls.

## B. Context and root causes

Current audit/specification/migration-plan/traceability and shared-controls, shared-sheets, shared-feedback, Manage Commitments reports were inspected. VU-02 is the primary finding. Its original acceptance protects optional strength/bodyweight/duration/distance input, completion, deletion, notes and creation handoffs. This phase completes only its Set Editor portion; the user's current terracotta/Soft Copper authority supersedes the older proposed emerald mapping.

The current SetEditor omitted v2 appearance on AdaptiveSheet, FormError, every direct FormField, specialized DistanceFields/DurationFields, and Delete. Supporting text used legacy `smallBold`/`small`. DistanceFields already forwarded optional appearance; its SetEditor caller omitted it. DurationFields' logging branch accepted appearance but ignored it for its label and both fields. Its ordinary target-editing branch already forwarded appearance and remains unchanged.

The existing DesignProvider does not implicitly migrate legacy callers. The fix is explicit propagation, not a palette/default change.

## C. Measurement and nullable-value matrix

All visible performance inputs are optional. No required performance field was added. Input text is retained until Save; validation/conversion remains in `fitness/form.ts` and is also enforced by `fitness/data.ts`.

| Exact type | Existing fields / labels | Stored representation and conversion | Empty, zero and validation |
|---|---|---|---|
| `strength` | Weight (kg, optional); Reps (optional) | `weightGrams`: kg scaled ×1000 with BigInt; `reps`: integer. | Empty → null independently. Weight 0 is valid and remains 0. Entered reps must be positive; zero reps invalid. |
| `bodyweight` | Reps (optional); Added weight (kg, optional) | Integer reps; optional added kg scaled to integer grams. | Empty → null. Entered reps and added weight must be positive; added weight 0 is invalid. |
| `duration` | Duration (optional) · Seconds:0–59; Minutes (optional); Seconds | `durationSeconds`: minutes×60 + seconds, using exact integer operations. | Both blank → null. A blank component contributes 0 when another is entered. Zero minutes/seconds components are valid within a positive total; total 0 invalid. Seconds > 59 invalid. |
| `distance` | Distance unit km/m; Distance (km) or Distance (m); optional duration fields | `distanceMeters`: km scaled ×1000 or integer m; duration stored separately in seconds. | Distance blank → null independently of optional duration. Entered distance must be positive; 0 invalid. Switching unit clears the distance draft only. |

Integer parsing accepts trimmed digit strings only. Decimal kg/km parsing accepts a period or comma with up to three fractional digits and a leading whole-number part. It scales with BigInt and pads fractional digits; no floating-point rounding/truncation was added. Values must fit the existing safe integer range. Negative, exponent, malformed and excessive-precision inputs remain invalid.

Existing redisplay is authoritative: grams become kg strings; stored meters reopen as canonical km; duration divides into minutes/remainder seconds. For example25.125kg→25125g;2.501km→2501m;2min05sec→125sec. Strength 0 kg reopens as `0`, while null reopens blank. Irrelevant nonempty fields are still rejected by validateSet. No generic Number(input) replacement.

## D. Runtime changes and direct field propagation

In `fitness-forms.tsx` only:

- SetEditor AdaptiveSheet adds `appearance="v2"` and `titleRole="operational"`.
- FormError and all three direct strength/bodyweight FormField sites add explicit v2 appearance.
- Exercise-name text becomes `UiText cardTitle`; existing optional-performance guidance becomes `UiText secondary`, `textSecondary`. Exact copy/order retained.
- SetEditor passes `appearance="v2"` to DistanceFields and DurationFields.
- Existing DistanceFields forwards it unchanged to SegmentedControl and distance FormField. No DistanceFields function change.
- DurationFields logging label uses UiText only on explicit v2; both logging fields forward appearance. Undefined appearance preserves its original ThemedText path. Nonlogging branch, duration layout, keyboard and autofocus props are unchanged.
- Existing Delete button adds `appearance="v2"`; its destructive variant, label, predicate and callback remain unchanged.

All original hooks, draft initialization, change/save handlers, labels, optional flags, keyboard types, callbacks and styles are AST-verified unchanged. All other editor functions, including NoteEditor, AddExerciseSheet, ExerciseEditor and RoutineEditor, are text-equivalent after line-ending normalization.

## E. Visual contract and skill contributions

The existing v2 sheet uses canonical canvas `#151315` / `#F5F0EA`, shared border and 20pt top corners. Header is Manrope operational 18/24. Exercise name is Manrope 16/24; supporting text 14/20; field labels use the shared fieldLabel role and input text Manrope 16. No Lora heading, new icon, statistic, card wrapper or repeated instruction was introduced.

Inputs use canonical surface `#1B181A` / `#FFFCF8`, neutral `controlBorder` (`#95828E` / `#9B837B`), shared 10pt radius, 48pt minimum, copper focus/selection and 2pt focus outline. Native input rectangles remain stable on focus. Existing single-line editing and native scrolling/caret behavior are retained.

Save uses brand/onBrand and brandStrong when pressed; Cancel remains quiet copper. Delete uses danger/dangerSoft. Form errors use canonical danger and the existing alert/live-region behavior. Existing SheetRefreshContext error/Retry refresh receives v2 through the sheet. Fitness terracotta identity in Workout content/header and all canonical feature tokens is untouched.

Concrete skills: **frontend-design** kept performance entry compact and operational; **Impeccable** loaded incumbent/native context, compared field boundaries and exact sibling controls, and reviewed narrow/keyboard geometry; **UI/UX Pro Max** guidance informed optional-field clarity, confirmation, targets and focus; **Expo building-native-ui** preserved SDK 58 TextInput/modal/keyboard/safe-area ownership. Existing installed guidance was used without unrelated exploration or dependency installation. Product context still mentions older SDK 57; package.json/source Expo `~58.0.17` and React Native 0.88 were authoritative.

Official [Expo SDK 58 reference](https://docs.expo.dev/versions/v58.0.0/), [Expo index](https://docs.expo.dev/llms.txt), and [React Native TextInput reference](https://reactnative.dev/docs/textinput) were checked. No native API was replaced.

## F. Save, clearing, Cancel, Delete and completion

Real entry: Active Workout set row calls FitnessScreen.editSet(exerciseId,setId), resolves the existing exercise/set and captures both objects in its existing dialog union. SetEditor is keyed by captured set ID. The row already exists: Complete set / Add set creates the blank logged record through the separate existing logging path; SetEditor does not create it.

- Save uses unchanged `setDraft(existing)`, local state and `validateSet(type,draft)`, then captured-ID `access.editSet`. The existing source updates that set and touches its workout; no new ID or record is created.
- There is no Clear button. Clearing means emptying existing fields and pressing Save. Null performance remains a logged set; it is not deletion or an automatic incomplete toggle.
- Cancel/Back dismisses the existing draft with no write or new dirty-form confirmation. Reopening hydrates source values.
- Delete is shown only under the existing `existing && onDelete` predicate. FitnessScreen retains native “Delete set?” / Cancel / destructive Delete. Confirmation soft-deletes the selected captured set; cancellation leaves it and the editor intact. Failed deletion keeps the editor/error state and saved data.
- Editing/clearing performance does not change set count, target-derived progress, manual exercise-completion flags or workout completion. Deleting a set can change target-derived progress through existing source logic; manual completion remains independent.
- Completed workouts remain read-only in the data layer. A captured editor cannot bypass that guard if the workout completes while it is open.

`useSave` remains the existing synchronous reentry ref: repeated/stale Save callbacks cannot persist twice; a thrown validation/storage error resets its guard and retains the draft. There is no asynchronous busy/disabled-state API in this editor. Save remains enabled exactly as before; no fake spinner, new disabled predicate or async lifecycle was added.

Tests verify captured workout/exercise/set IDs, sibling preservation, source refresh while editing, no duplicate write, Cancel, reopen, clearing, valid 0 and read-only rejection. Temporary SQLite failure triggers prove real transactional rollback for failed Save/Delete without modifying production persistence or suppressing warnings.

## G. Modal, keyboard, focus and refresh ownership

FitnessScreen retains its single AdaptiveModal and existing dialog union. Save/Cancel/Delete call the same close/backToWorkout owner. No extra sheet, dismissal queue, route or keyboard manager was introduced. Captured drafts remain mounted through source refresh and errors.

Keyboard props are unchanged: kg/km decimals use iOS numbers-and-punctuation and Android decimal-pad; reps, m, minutes and seconds use number-pad. Existing autofocus targets remain weight for strength, reps for bodyweight, duration minutes, and distance for distance logging. Unit changes clear only the distance draft.

AdaptiveSheet still owns measured header/body height, focus reveal, FormScrollView and keyboard intersection. AdaptiveModal keeps native Back/accessibility escape, selection host and safe areas. The form remains naturally scrollable; no fixed field/body height, new offset or global listener was added.

## H. Visual review and measured geometry

[Focused gallery](active-workout-set-editor-v2/index.html): 30 pairs / 60 PNGs. Both themes cover four measurement types, blank performance, valid zero, focused form validation error, and 320pt/2x long Portuguese exercise name with keyboard-height proxy. Preservation references cover Active Workout main/header, Routine Editor, already-v2 Exercise Editor, completed Workout History, legacy Note Editor and legacy Add Exercise.

All 14 preservation pairs are byte-identical. All 30 pairs use the same frozen SQLite fixture hash and identical field labels/values. Intended text-extraction differences are the v2 radio's shared selected indicator replacing the old visible check character and the shared stacked header ordering at narrow/large text. The checked state and unit-change handler remain unchanged. Other body copy, values and source identities are preserved.

| Geometry at 390pt / normal text | Before | After |
|---|---:|---:|
| Save / Cancel / Delete height |44 |48 |
| Input height |48 |48 |
| Strength input width |358 |358 |
| Duration field widths |173 each |173 each |
| Strength weight input top |629 |625 |
| Strength Delete top / bottom |785 /829 |781 /829 |
| Last-action bottom spacing |15 |15 |
| Header font |system18/24 |Manrope18/24 |
| Exercise-name role |legacy14/20 |Manrope 16/24 |

The existing layout/spacing styles are unchanged. At 320pt/2x and keyboardTop 520, measured Save and Cancel remain at y77–139; after scrolling, the distance editor's Delete target is288×62 at y442–504, fully above the proxy keyboard. No clipping or page overflow was found in 62 browser groups: 48 four-type/width/theme/font groups with keyboard proxy; 2 long-name stress groups; 8 Save/clear/Cancel/confirmation groups; 2 zero/unit-conversion groups; 2 error/refresh/mounted-theme groups. Field bounds are measured after focus/layout and explicit scroll reveal settle; this does not establish native autofocus timing.

Browser keyboard/font-scale adapters are explicit proxies, not screenshots from a device. Native Alert appearance is not fabricated; the gallery/interactions record confirmation callback entry, while SQLite/FitnessScreen tests verify real mutation/cancellation behavior.

## I. Accessibility and limitations

Field labels, optional grouping, reading order, keyboard types and destructive accessible labels remain unchanged. Cancel/Save/Delete have 48pt minimum targets; fields retain 48pt minimum and scalable text. Copper focus is visible without changing the input rectangle. Reduced Motion behavior comes from unchanged shared components.

Canonical text/placeholder contrast is at least 4.5:1; neutral field boundaries meet 3:1 and focus remains distinct. Exact dark/light measurements are in audit.json. Screen-reader error feedback retains the existing FormError alert/live-region semantics.

Important existing limitation: SetEditor validation is **form-level**, not mapped to individual fields. The submitted error remains visible while the focused field has copper focus; fields do not newly acquire aria-invalid or danger borders from a guessed mapping. The shared FormField invalid contract still supports danger boundary plus focus when supplied an actual field error, but this caller has no such API. No duplicated validator, string-based error-field inference or all-fields-invalid treatment was added. This limitation is recorded, not claimed fixed.

Native VoiceOver/TalkBack announcements, caret/text selection, actual keyboards/locale input, mounted theme changes, Dynamic Type, focus return and real bottom-inset clearance remain physical acceptance work.

## J. Tests and validation

Timezone: America/Sao_Paulo. No existing financial/Fitness domain expectation or harness was edited.

| Check | Actual result |
|---|---|
| Initial full suite | 1,601 pass; 0 fail/skip |
| New focused Set Editor tests | 20 pass; 0 act warnings |
| Relevant Fitness/shared regressions | 434 pass |
| Final full suite | 1,621 pass; 0 fail/skip |
| React act warnings |66 →66; no suppression |
| TypeScript |Pass before/after |
| Changed-file ESLint |Pass |
| Full ESLint | Exact inherited 6 errors / 2 warnings; 0 new |
| Browser review | 30 pairs, 14 identical preservation controls, 62 interaction/layout groups |
| iOS / Android exports |Both pass, production Hermes bundles |
| Diff/integrity |git diff --check passes; one initial file changed; unrelated functions/data/IDs/handlers/keyboard props preserved |

The new tests cover both themes/all four types, hydration, partial/empty values, invalid precision/zero/seconds, exact conversions, reentry, captured IDs, completion independence, confirmed/cancelled/failed Delete, failed Save rollback, refresh/retry retention and stale read-only rejection. Initial write-failure test assumptions were corrected to actual SQLite failure triggers because the existing lifecycle helper injects read failures only. Review-checker syntax and asynchronous focus-measurement assumptions were corrected in review code only.

## K. Complete phase inventory

- Runtime: `src/features/fitness/components/fitness-forms.tsx`.
- Tests: `tests/active-workout-set-editor-v2.test.ts`.
- Scripts: `scripts/preview-active-workout-set-editor.ts`, `scripts/review-active-workout-set-editor.cjs`, `scripts/check-active-workout-set-editor.cjs`, `scripts/audit-active-workout-set-editor.cjs`.
- Report: `docs/design-system/active-workout-set-editor-v2-report.md`.
- Evidence: `docs/design-system/active-workout-set-editor-v2/{initial-state,fixture,before,after,comparison,interactions,audit}.json` and `index.html`.
- 60 PNGs under `{before,after}/`: `{strength,bodyweight,duration,distance,blank,zero,invalid,workout,header,routine,exercise,history,note,add}-{dark,light}-390.png`, plus `keyboard-{dark,light}-320.png`.

One changed initial file; 74 new files; 75 phase paths. Ignored `dist/active-workout-set-editor-v2` contains logs, saved original source and exports; `dist/active-workout-set-editor-atlas` contains the actual-component browser bundle. All prior artifacts are preserved.

## L. Audit status

**VU-02: partially resolved.** Phase 3D-F.1 SetEditor, direct performance fields, distance unit/distance field, duration logging fields, operational sheet/actions and form-level feedback are implementation-complete. NoteEditor remains F.2; AddExerciseSheet/inline ExerciseEditor remain F.3. No global typography/palette/identity/default or native-acceptance finding was closed.

## M. Phase 3D-F.2 handoff — Note Editor

Exact component: `NoteEditor` in `src/features/fitness/components/fitness-forms.tsx`; owner: `src/features/fitness/fitness-screen.tsx`, `editNote(exerciseId|null)` and its note dialog branch. Entry UI: workout-header note action and per-exercise note actions in WorkoutContent. The current paths capture session ID, optional exercise ID, title and source note; local useState initializes once from `value ?? ''` and remains mounted through refresh.

Legacy boundaries: undefined AdaptiveSheet appearance/default title/actions, FormError and multiline FormField. Use existing operational v2 sheet and explicit field/error contracts without new state ownership or defaults. Keep AddExerciseSheet and inline creation deferred to F.3.

Preserve existing behavior: onChange retains raw writing and clears the local error; Save calls captured-ID saveNote then dismisses; source trims outer whitespace and stores an empty result as null; internal line breaks/text remain source-owned. UI maxLength and source validation remain 2,000 characters. Cancel/native dismissal has no write and no dirty confirmation. useSave prevents reentry and retains draft on rejection. No separate Clear/Delete action exists; do not invent one.

F.2 risks: long `Note: <exercise name>` titles combined with enlarged text/keyboard; multiline height and native selection; controlled draft/caret retention through refresh; wrong exercise after selection changes; empty/null semantics; nested Back versus source owner. Do not fix the shared extreme-header issue by global redesign.

Recommended tests: workout-note and exercise-note IDs, initial/null/multiline/accented text hydration, edit/Cancel/reopen, empty/whitespace Save, 2,000-character boundary, source failure/retry, double Save, refresh while dirty, completed-session guard, keyboard/caret/selection, accessibility error announcement, both themes/320/390/430/2x, native Back/escape/focus and last-action clearance. Preserve Routine/Exercise/History, migrated SetEditor and still-legacy Add Exercise references. Physical iOS/Android text-entry acceptance is required.

## N. Open issues and native acceptance

Bare-host RNWeb typing Escape remains separately open. This phase adds no keyboard listener; its actual editor remains under AdaptiveModal. The extreme constrained-height sheet-header issue also remains open. The short operational Edit set header passed the tested keyboard/text proxies; that does not resolve arbitrary long editorial/Note titles.

SetEditor limitations retained: no field-specific validation mapping; synchronous submission guard without busy/disabled presentation; native autofocus/scroll timing not proven by browser manual-reveal checks. None was changed speculatively during this presentation migration.

Still test physical iOS/Android numeric/decimal locale entry, text selection/caret, focus return, keyboard avoidance, VoiceOver/TalkBack, hardware Back/accessibility escape, Delete Alert cancellation/confirmation, rapid set switching, real Dynamic Type/theme changes and safe-area/final-action clearance. Platform exports prove buildability, not native acceptance.

## O. Git and preservation

Initial: 42 modified tracked paths, 1,023 untracked; nothing staged. Final: 43 modified tracked paths, 1,097 untracked; nothing staged. HEAD remains `16ebeab46d20e7a943f08fa017928ce0eb884c0e`. Of 3,570 initial files, 3,569 unaffected files retain their byte hashes; only fitness-forms changed. Prior modifications, tests, reports, scripts and evidence remain intact. No stage, commit or push.

[Audit](active-workout-set-editor-v2/audit.json) · [Frozen fixture](active-workout-set-editor-v2/fixture.json) · [Gallery](active-workout-set-editor-v2/index.html)

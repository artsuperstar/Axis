# Tasks experience — Stage 13C

## List hierarchy

The main Tasks workspace centers on Today and a general To-do list. Earlier is a compact collapsed count/disclosure above Today; Upcoming is the final compact collapsed count/disclosure below To-do. Today stays expanded with the device-local date. To-do previews the first five undated tasks in their existing authoritative order, with View all N / Show less. Empty Today/To-do states remain visible. Disclosure and preview state are local UI state only.

`workspace.ts` projects the existing `groupTasks` output rather than changing its classification, ordering or one-next-future-occurrence-per-series selection. Editing a date naturally moves a task between To-do and dated sections through the existing mutation/refresh path. Calendar navigation is available as a quiet action inside expanded Upcoming.

The header is Tasks plus an accessible Task options button. Its contextual menu anchors below/right-aligned to the trigger, sharing FormSelectionHost window measurements, usable bounds and above-trigger fallback. It contains only the three action buttons Categories, Repeating Tasks and History: no field styling, selection checkmark, radio state or sheet header. Adaptive width grows with accessibility font scale and remains clamped to usable bounds; labels can wrap. Categories retains its existing sheet and behavior. Repeating Tasks (`/tasks/repeating`) and History (`/tasks/history`) are root-stack card destinations above native tabs, with explicit Back to Tasks and a Tasks fallback for direct links. The retained main route keeps scroll/disclosure/preview state on return. No new tabs are introduced.

Completed and Skipped groups move together to the History route, using exactly the previous source grouping, ordering and occurrence window. Reopen/Return to pending remove items from the archive on refresh. This does not expand the archive's source semantics or generation window: older and previous-schedule occurrence history remains accessible through the existing per-series History/paging flow in Repeating Tasks or row Actions.

Each row has three separate targets: completion, the task content (edit), and a quiet Actions button. Titles and metadata wrap; completion and Actions retain shared mobile touch targets. Date/time precedes compact recurrence, priority and category metadata. Today/Tomorrow provide immediate context; accessible descriptions retain the full date/time. Missing date/category/priority are omitted. Missed keeps its existing meaning and receives the attention tone. Completed and Skipped use readable secondary/subdued text without reducing row opacity.

## Contextual management

Actions opens the existing AdaptiveModal/AdaptiveSheet architecture. Occurrence actions (Skip or Return to pending) are separate from series actions (Edit, History, Delete). Completed occurrences are reopened with the completion control before they can be skipped. Delete keeps the existing native confirmation and soft deletion.

Row Actions finishes native dismissal before presenting an editor or History sheet on iOS. Task options uses a screen overlay rather than a native modal: choosing an action closes it before the next frame opens Categories or pushes a route. Outside taps, accessibility escape, web Escape and Android Back dismiss it with focus restored to the trigger. Focus loss dismisses without restoring focus to the retained screen. Keyboard traversal and first-action focus use the shared host. The full-screen series manager opens its editor/occurrence History directly. The same source-owned screen controller supplies mutations and refresh error handling to main, archive and series destinations; contextual components own presentation only.

## Floating creation and safe areas

Main Tasks has a 56-point circular accent Add task control at bottom-right; its accessible button name is independent of the decorative plus. It opens the same TaskEditor and is absent from History/Repeating Tasks. Styling reuses the shared primary button appearance, including focus/press/disabled treatment. Only the decorative glyph disables font scaling.

The Tasks native tab disables automatic content insets and uses the existing `react-native-screens/experimental` SafeAreaView pattern. Native top/bottom/side bounds include the actual tab bar rather than assuming a fixed bar height. The FAB sits inside those bounds; the list reserves FAB height plus twice its spacing, and scroll content does not also request automatic insets. Subroutes use native safe areas without a tab bar. Physical verification of these bounds is still required.

## Editor and recurrence

The task editor groups Task, Schedule, Organization and Recurrence with larger gaps between groups. Date/time retain measured responsive layout and native picker behavior. Existing category selection/creation and priority controls remain shared.

Add/Edit recurrence replaces the sheet content within the same native modal, preserving the entire task draft. It presents Frequency, Pattern, Start and End. Count and unit sit together, weekdays keep shared checked states, and monthly/yearly rules keep the short-month explanation. The top-left back arrow and outside dismissal return to the main editor with draft changes; only Save persists. Opening recurrence does not reopen the Title keyboard on return.

The summary reuses `recurrencePatternSummary`; its parameter now accepts the pattern fields of an unsaved draft. Formatting and recurrence rules are unchanged. Existing schedules retain the tomorrow boundary explanation and confirmed Stop repeating behavior.

## History and projections

History emphasizes full date/time, outcome and governing recurrence version, with quiet correction actions. Retired occurrences remain read-only. Paging and mutations are unchanged. Rows and History continue using occurrence-specific recurrence metadata and rich accessibility labels (F2/F5).

Task data access, generation, Home and Calendar adapters are unchanged. Mounted regressions exercise Complete, Reopen, Skip, confirmed Delete, recurrence edits, To-do scheduling and refresh failure/draft retention against real SQLite fixtures. Route tests load actual route screen exports, assert push/back callbacks at the mocked navigation boundary, and check retained main list identity/state. They do not run the native navigator or establish gesture/scroll behavior on a device.

## Physical review still required

Automated component tests use native boundary mocks; they do not establish physical layout or VoiceOver behavior. On iPhone Expo Go review:

- Several one-time and recurring tasks, long titles/categories, High priority and absent categories.
- Earlier/Missed, Completed/Reopen and Skipped/Return to pending.
- Actions discovery, confirmed Delete, editor/History handoffs and source navigation from Calendar.
- Earlier's compact count/chevron and expand/collapse; Today emphasis and local date.
- Five-item To-do preview, View all/Show less, scheduling and unscheduling.
- Upcoming last/collapsed, one next instance per series, and View in Calendar.
- Task options → Categories, pushed Repeating Tasks/History and back gestures; retained main scroll/disclosure state.
- Floating Add task above the native tab bar, with the final list content reachable and unobscured.
- Task editor grouping, focused recurrence, the back arrow, keyboard and native date/time/end-date pickers.
- Daily intervals, weekly weekdays, monthly day 31 and yearly month/day.
- Light/dark mode, large accessibility text, touch targets and VoiceOver dated action labels.

Recurring rows should scan at a similar density to ordinary tasks. No schema, migration, dependency or Task domain changes are part of this stage.

## Tasks New Task v2 — Form / Editor Language

The supplied New Task target is the visual reference: a warm canvas, gently bordered owned surfaces, serif headings, practical interface text and burgundy brand actions. The existing native sheet remains the presentation architecture; the mockup does not introduce a new route or navigation model. This refinement applies to creation (`task === null`). Edit Task, main Tasks and management routes retain their established presentation and behavior. The creation flow's recurrence editor subsequently received the visual alignment documented below.

### Hierarchy and shared primitives

The header contains a back-icon Cancel action, an editorial New task title and the primary Save action. At large accessibility font scales, the title and action row separate so controls retain space to grow. Neither row has a fixed height.

Four reusable `EditorSection` surfaces provide visual ownership without owning feature state:

| Section | Supporting text | Contents |
| --- | --- | --- |
| Task | Add the details for your task. | Required Title and optional multiline Description |
| Schedule | Set when this task should happen. | Optional Date and dependent Time |
| Organization | Keep your tasks organized. | Priority and Task Category |
| Recurrence | Set a repeating schedule (optional). | Add recurrence or the existing concise rule summary |

`EditorSection` composes GroupSurface, a decorative semantic icon and UiText. It is a small shared component in the current component directory. AdaptiveSheet and the existing form controls accept opt-in v2 appearance; their default presentation remains unchanged. SelectField continues using FormSelectionHost for positioning, dismissal, selection, modal stacking and inline category creation. No separate dropdown or keyboard system was added.

Typography adds editorTitle, editorSection and fieldLabel roles to the current v2 token vocabulary. Lora is limited to editorial headings; fields and controls use the existing Manrope family with its system-font fallback. Canvas, surface, border, brand, brandSoft, text and danger colors all come from the existing semantic light/dark palette. Icons extend the existing authored icon vocabulary. There are no new font or image dependencies.

### Interaction and responsive behavior

Title validation, local date/time helpers, category options/creation, priority values and recurrence rules remain feature-owned. Time stays disabled until Date exists. Clearing Date clears Time through the existing callback. Category creation persists through the existing feature callback, refreshes options and selects the new category. Save remains the only task persistence action; Cancel uses the existing dismissal behavior. Validation errors remain visible without clearing the draft. No autosave or new discard confirmation was introduced.

The recurrence entry is a tinted contained action. With a rule, it uses `recurrencePatternSummary`, includes an optional end date and announces Edit recurrence with the summary as its hint. Opening it uses the existing focused recurrence sheet; returning preserves the draft. The specialized schedule controls and native picker callbacks are unchanged.

Date/Time layout uses measured available field width, not assumed phone coordinates. It requires two 160-point columns scaled by the current font scale plus the existing gap. In the 390-point browser review the fields sit side by side; at 320 points and at doubled font scale they stack. Cards, titles, values and labels can grow and wrap. The existing measured sheet viewport, scroll container and FormFocusContext retain keyboard avoidance and focused-input reveal. Native single-line inputs retain zero vertical padding and no explicit line height, including the v2 font path, preserving the earlier native alignment fix.

Visible field labels remain present independently of placeholders. Title announces required; selectors expose current values and expanded state, and menu options retain selected state. Icons are decorative. Existing minimum mobile touch targets and accessibility text scaling remain enabled. Light/dark use identical section structure; dark mode uses warm charcoal surfaces and the existing pink brand treatment rather than the old green form palette.

### Skill findings applied

- **frontend-design:** use the target's owned sections and editorial heading hierarchy; preserve native architecture and avoid decorative additions.
- **Impeccable:** distill the legacy form into four readable groups, keep one primary Save action and preserve field clarity. Two bounded visual review batches were completed; the final scope detector reported no findings.
- **UI/UX Pro Max:** the UX search for form required/optional labels emphasized persistent labels, explicit required indicators and submit feedback. These informed visible labels, the required Title announcement and inline save errors.
- **Expo native UI:** matching Expo 57 / React Native 0.86 guidance was checked. Preserve the existing modal, native pickers, measured keyboard viewport and input metrics; do not layer a second keyboard avoidance container over them.

### Review evidence and validation

The reproducible browser harness is `scripts/preview-new-task.ts`. It renders the real TaskEditor and shared controls using React Native Web, with native fonts/images, routing focus, safe areas, motion and OS picker boundaries substituted. Its generated JavaScript fixtures and bundle remain under ignored `dist/new-task-review`. Browser category creation uses a local callback, not SQLite. Production persistence is exercised separately by component/data integration tests.

Saved captures in `docs/previews/tasks-new-task-v2/`:

- `light-390.png` and `dark-390.png`: full-form review at 390 × 1100.
- `light-320.png`: narrow layout with stacked schedule fields.
- `large-dark-320.png`: doubled accessibility text simulation, dark theme and narrow viewport.
- `light-390-844.png`: phone-height viewport; lower sections remain reachable through sheet scrolling.

The browser reported no horizontal overflow or page errors across these variants. A separate interaction check exercised Priority, the anchored Category menu, new-category creation with automatic selection, the existing recurrence editor, its returned summary and explicit Save. Captures include the existing sheet/backdrop behavior and no simulated OS chrome. They do not prove native keyboard, VoiceOver, picker or physical-device behavior.

Focused validation passed 94 tests. The complete automated suite passed 953 tests with no failures or skips using the existing serial runner approach. TypeScript, iOS export, Android export and `git diff --check` succeeded. ESLint retains exactly the baseline six errors and two warnings, with no added or removed findings. The new editor tests cover required Title, optional Description/Date, Time dependency and clearing, priority/category choices, persisted category creation, recurrence round trip and summary, explicit Save/Cancel, theme parity and measured responsive layouts. Native input alignment regressions cover both iOS and Android.

Physical follow-up: inspect iPhone Expo Go light/dark, native keyboard and focused-field reveal, Description scrolling, menus near the viewport bottom, category-creation handoff, date/time pickers, recurrence return, Save/error/Cancel, VoiceOver and large accessibility text. No physical-device testing was performed.

### Change manifest and boundaries

New code: `src/components/editor-section.tsx`, `tests/new-task-editor.test.ts`, `scripts/preview-new-task.ts`.

Modified code: `src/components/adaptive-sheet.tsx`, `src/components/design-system.tsx`, `src/components/form-controls.tsx`, `src/components/ui-icon.tsx`, `src/constants/design-system-v2.ts`, `src/features/tasks/components/task-editor.tsx`, `tests/adaptive-sheet.test.ts`, `tests/form-field-alignment.test.ts`, `tests/tasks-experience.test.ts`.

Documentation: this section and the five review captures above. No files were removed. No schema, migration, persistence, category domain, recurrence domain, package or lockfile changes are part of this refinement. Shared appearance additions are opt-in and available as a reference for later editors; other editors were not migrated.

## Recurrence Editor v2

### Visual continuity and structure

Previously, New Task's Add recurrence branch explicitly disabled v2 appearance. Its white/green or dark-green sheet, plain headings, legacy field typography and disconnected controls interrupted the parent editor's visual language. The creation flow now reuses the same v2 AdaptiveSheet canvas, EditorSection surfaces, icon tiles, serif headings, Manrope controls and semantic brand colors. Edit Task's existing recurrence presentation is retained; Tasks main and the parent New Task composition were not redesigned.

| Group | Contents and conditional behavior |
| --- | --- |
| Pattern | Existing Repeats anchored selector: Does not repeat, Daily, Weekly, Monthly, Yearly |
| Repeat | Interval number plus days/weeks/months; omitted for yearly and non-repeating drafts |
| Schedule | Weekly weekday choices, monthly day or yearly month/day as applicable; existing Start date and Time controls |
| Ends | Existing Never / On date choice and optional native end-date picker |
| Summary | Existing `recurrencePatternSummary`, optional end date, or the existing validation explanation |

With Does not repeat, only Pattern and Summary appear. No interval, weekdays, month/day or date controls are rendered without a rule. Monthly/yearly retain the existing shorter-month explanation. Start, interval, weekday bitmask, month/day and inclusive end-date semantics are unchanged. Summary formatting and validation use the existing domain helpers, not a second formatter.

### Header, draft and persistence behavior

The header uses the parent editor's serif title and brand-colored back action. The existing flow has no recurrence Apply or Cancel step: Back, Android Back and sheet dismissal return to New Task while retaining the unsaved recurrence draft. Only the parent Save persists the task; parent Cancel discards the task draft. This existing behavior is deliberately preserved. It does not imply that Back rolls back recurrence edits from that visit. The brief contained both a preservation requirement and a conflicting request for rollback on Back; clarification was requested, and implementation proceeded with the existing behavior as stated during work.

Title, Description, existing Date, Time, Priority and Category survive a recurrence round trip. Returning does not autofocus Title or reset the task draft. Choosing a recurrence with no existing date retains the established behavior of setting its start to the local date. New Task's compact recurrence action shows the selected schedule after return.

### Shared components, responsiveness and accessibility

There is no recurrence-only design system. The feature reuses EditorSection, UiText, SelectField/FormSelectionHost, FormField, FormButton, AdaptiveSheet and UiIcon. FormWeekday gains an opt-in v2 appearance with the current semantic palette, visible check icon, keyboard focus border and 48-point minimum target. Its native checkbox role/full weekday label/checked state remain intact, with an explicit `aria-checked` for the browser renderer. BackButton and PickerBackHeader gain opt-in v2 appearance for recurrence's existing native picker headers; their legacy defaults remain unchanged.

Weekday controls wrap naturally and retain full spoken names while showing compact three-letter labels. Interval number and unit align on a shared visual row when space permits and wrap for larger text. Existing measured Schedule layout places Start date/Time side by side at suitable widths and stacks them at narrow or large-text sizes. No fixed-height text containers or new font-scaling limits were introduced. Section icons remain decorative and hidden from accessibility.

The light counterpart uses warm cream surfaces, semantic borders and plum actions. Dark mode uses the existing warm charcoal, pink/plum selected states and readable borders. No legacy green colors are introduced into creation's recurrence branch. Native numeric keyboards and date/time/end pickers keep their existing callbacks, local date helpers and theme variant. The existing measured keyboard viewport, focused-field reveal and one scrolling sheet body remain authoritative; no nested keyboard avoidance layer or new modal was added.

### Skill findings applied

- **frontend-design:** carry the parent's editorial identity into conditional owned groups, keep fields practical, and retain the compact frequency dropdown rather than inventing a new selection interaction.
- **Impeccable:** identify the disabled v2 branch as the source of visual drift; remove its legacy styling through shared primitives. A batched review covered light/dark, narrow, larger-phone and large-text variants; one confirmation pass aligned interval units and corrected review scroll position.
- **UI/UX Pro Max:** the first checkbox-specific search returned unrelated guidance, so it was rejected. A narrower screen-reader search verified the general accessibility principle that content must remain understandable when read aloud. Full weekday names, explicit checked state, visible checks and the helper-driven summary apply that principle to native controls. Web-specific error-focus advice was not transplanted into the native flow.
- **Expo native UI:** checked installed Expo 57 / React Native 0.86 guidance. Preserve the existing modal architecture, numeric input metrics, native picker handling, measured layout and keyboard dismissal rather than adding a second scrolling or keyboard system.

### Review captures and verification

The existing `scripts/preview-new-task.ts` renders the actual TaskEditor and shared controls for browser review. Open Add recurrence and select the desired frequency. Native OS picker, safe-area, font-loading, image and motion boundaries are substituted as described above; the form and selection interactions are real. Browser callbacks do not exercise SQLite persistence; integration tests do.

Captures under `docs/previews/task-recurrence-v2/` show weekly light/dark at 390 points, yearly light at 390, weekly light at 320 and 430, and doubled-text weekly dark at 320 with a separate scrolled summary. They use 1280-point-tall review viewports with the existing adaptive sheet/backdrop and no simulated OS chrome. Across six configurations the browser reported no page errors or horizontal text overflow. Weekday controls measured at least 48 points high at normal text and 62 in the doubled-text simulation. Large text remains scrollable through Summary.

Focused regressions cover all frequencies, interval values above one, conditional fields, weekday selection/check state, Never and native end-date selection, helper summaries, parent Save/Cancel, Back/sheet dismissal draft retention, all six parent fields, themes and measured widths. Existing future-only recurrence, shorter-month, inclusive end-date, refresh-failure and native picker tests remain in the suite. Validation passed 156 focused tests and all 966 tests in the full serial suite, with no failures or skips. TypeScript, iOS export, Android export and `git diff --check` passed. ESLint exactly matches the starting baseline of six errors and two warnings, with no new or removed findings. A real browser interaction also retained all six parent fields through weekly recurrence editing and reached the Save callback only after explicit parent Save; no page errors occurred.

Physical follow-up remains necessary in iPhone Expo Go and Android: native numeric keyboards, focused interval visibility, picker theming, anchored menus near the viewport bottom, VoiceOver/TalkBack checked-state announcements, Back/dismissal and accessibility text sizes. No physical-device testing was performed.

Scope of this follow-up: `src/features/tasks/components/task-editor.tsx`, `src/components/form-controls.tsx`, `src/components/back-button.tsx`, `tests/new-task-editor.test.ts`, `tests/tasks-experience.test.ts`, `tests/form-controls.test.ts`, this document and the new recurrence captures. No schema, migrations, persistence/domain files, dependencies or routes changed. Earlier uncommitted New Task v2 work remains intact.

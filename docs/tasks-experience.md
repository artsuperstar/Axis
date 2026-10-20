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

## Categories v2 — Management Surface

### Existing behavior audit (before implementation)

1. **Rename/edit:** neither the Task category data API nor the current manager supports renaming. No rename action is introduced.
2. **Delete:** custom categories expose a confirmed Delete action. Creation and deletion persist immediately through the existing Tasks mutation/refresh path; there is no management Save step.
3. **Deletion mechanism:** soft deletion writes `deletedAt` and advances `updatedAt`. It does not physically delete the category.
4. **Assigned Tasks:** their `categoryId` references remain intact. Normal task display and selectors omit deleted categories; task rows show no category label, not Uncategorized. New task assignment to a deleted category remains invalid.
5. **Built-ins:** protected in both normal UI and data access. The manager uses the supplied source rows and `isDefault`, not a second built-in category list.
6. **Duplicates:** duplicate active names are rejected inside the existing immediate transaction. Deleted names can be reused.
7. **Identity:** outer trim, collapsed internal whitespace, NFC and locale-neutral lowercase comparison. Identity is case-insensitive and accent-sensitive, with canonical Unicode equivalents treated as identical.

The owner subsequently supplied the current iPhone screenshot and target mockup. The target establishes a serif sheet title, practical sans-serif group headings, an icon-only back action, a contained empty state and compact outlined rows with muted semantic icon tiles. Existing product rules and v2 tokens remain authoritative where literal mockup details conflict: Create stays disabled for an empty name, the visible input label remains, and icon colors reuse current theme tokens rather than inventing a separate category palette.

### Management hierarchy and sheet context

The previous manager was a legacy green sheet with a single input/button followed by undifferentiated category rows. The redesign keeps the same AdaptiveModal/AdaptiveSheet above the retained Tasks screen, including its dimmed background, measured usable bounds and safe areas. A decorative compact handle and circular icon-only Back to Tasks control introduce the serif Categories title and quiet supporting copy. The handle does not introduce a drag gesture or new dismissal behavior. There is no Save action.

The body has three owned sections:

- **Create category:** a plus tile, explanatory heading, labeled v2 name field, integrated creation errors and the existing primary action. Empty/whitespace names disable Create and receive explanatory helper text. Return submits through the same callback; successful creation persists immediately and clears the input. Duplicate/error submissions keep the name for correction.
- **Your categories:** custom source rows only. When empty, a compact dashed inset contains a decorative tag tile, “No custom categories yet.” and a short sentence. It has no redundant creation button. Populated state replaces that inset with compact rows and one quiet contextual action trigger per category.
- **Built-in:** the protected source rows with semantic icons and quiet Built-in ownership badges. Row names and ownership announce together; icons/badge text do not create duplicate announcements. Built-in rows are not buttons and expose no overflow controls.

The data source supplies the category list and ordering. A feature-owned presentation map selects icons/theme roles for recognized built-in names and falls back to a tag for any other source category. It is not a second category list or identity source. Finance/Study use existing blue roles, Health plum, Personal the Tasks accent, Shopping ochre and Work warm clay. No global palette values changed. Row outlines, modest radii and small icon tiles provide containment without creating large nested cards.

### Actions, errors and persistence

Custom overflow uses the existing ContextMenu and FormSelectionHost. Its single Delete action closes the anchored overlay before opening the existing native destructive confirmation. Outside/Back/Escape dismissal remains host-owned. Cancel leaves the category unchanged; confirmed deletion invokes the unchanged soft-delete callback. Deletion errors stay within Your categories and do not clear an unfinished creation name. Creation errors stay in Create category. No rename, archive action, restore flow or category-domain behavior was introduced.

The existing transaction, duplicate race protection, task relationships and refresh path remain unchanged. A component regression deletes a category assigned to a real SQLite Task and verifies the retained category reference, hidden normal-display label, retained category tombstone and distinct ID on name reuse. Case/NFC duplicate and distinct-accent creation are exercised through the real manager callback as well as existing identity/data tests.

### Shared components and responsive behavior

The surface composes existing EditorSection, GroupSurface, UiText, UiIcon, FormField/FormButton, BackButton, AdaptiveSheet and ContextMenu. EditorSection gains opt-in practical heading and group-surface variants; its New Task/Recurrence defaults are unchanged. BackButton gains an opt-in icon-only variant, and the v2 button icon prop accepts the existing icon vocabulary. FormField's v2 helper text now uses the matching v2 secondary typography/color. New semantic icons extend the existing authored outline library. No separate management design hierarchy was created.

One shared scrolling sheet body contains all three groups. There are no nested list ScrollViews, arbitrary category limits or new keyboard avoidance layers. A 100-custom-category fixture retains the first/last custom rows and the existing single scroll body; modest personal-use category lists continue rendering within AdaptiveSheet rather than introducing a new virtualization architecture. The shared components continue owning focused-field reveal, text input behavior, keyboard tap handling and menu repositioning. New rows do not trigger broad list-layout animation; button/menu interaction retains existing Reduced Motion support.

Reviewed widths are 320, 390 and 430 points, plus doubled text at 320. Long names wrap and custom action controls retain 48-point targets. At larger font scales the header stacks and built-in ownership badges move below names to prevent overlap. Native single-line input alignment remains unchanged. Light mode uses warm cream/group surfaces; dark mode uses warm charcoal/plum with the existing semantic borders and muted icon colors. The only serif on this management surface is the Categories title.

### Skill findings and visual evidence

- **frontend-design:** separated creation, user ownership and system ownership; then used the supplied target to refine practical group headings, circular back affordance, compact row outlines and the contained empty state.
- **Impeccable:** replaced the generic legacy settings stack with the existing Warm Editorial Hearth primitives. The initial composition review was followed by a bounded target-image confirmation covering both themes, populated/empty states, narrow/larger phones and large text; no broad redesign of neighboring surfaces followed.
- **UI/UX Pro Max:** verified the All-platform Empty States guidance and Mobile Touch Target guidance. The empty state explains the next action without duplicating the Create button, and custom action targets measure 48 points. Ownership remains explicit through sections, copy, badges and protected-row behavior.
- **Expo native UI:** checked Expo 57 and React Native 0.86 guidance, preserving the current modal, safe-area/keyboard architecture and shared anchored action host. Built-in accessibility grouping, decorative icons, focus/refresh retention and a single scroll body avoid new native interaction layers or dependencies.

The existing `scripts/preview-new-task.ts` supports `?surface=categories` and `&populated`; `&large` simulates doubled text. Built-in fixtures are generated by migrating/seeding an in-memory SQLite database through the authoritative seed function. The actual CategoryManager and shared controls render in React Native Web. Browser creation/deletion callbacks remain review-only, and native Alert confirmation is substituted; production persistence is tested separately against SQLite. The standalone harness shows the dimmed backdrop, not a simulated Tasks screen or OS chrome. Actual retained Tasks/modal composition is covered by source integration tests, not claimed from this browser capture.

Captures in `docs/previews/task-categories-v2/` include empty dark/light at 390, populated dark/light at 390, populated light at 320, populated dark at 430, and doubled-text populated dark at 320 with a scrolled built-in view. Seven configurations reported no page errors or horizontal text overflow. The browser interaction check exercised immediate creation, cleared input, outside dismissal, menu closure before confirmation, confirmed deletion, Return-key creation and Back. No physical-device testing was performed.

### Tests, validation and boundaries

Thirteen new regressions cover ownership/empty/populated states, creation/empty/duplicate/accent rules, protected built-ins, custom action dismissal/confirmation, reference preservation/name reuse, delete errors, Back, responsive layouts, 100 categories and refresh-failure/Retry draft retention. The existing Tasks workspace test now opens the category's overflow menu before Delete and uses the named Back to Tasks action. Final validation passed TypeScript, 204 focused tests, all 979 tests in the full serial suite, iOS export, Android export and `git diff --check`. There were no test failures or skips. ESLint exactly matches the starting baseline of six errors and two warnings, with no added or removed findings. Native/device behavior remains subject to the physical follow-up below.

Changed files: `src/features/tasks/components/category-manager.tsx`, `src/components/ui-icon.tsx`, `src/components/form-controls.tsx`, `src/components/design-system.tsx`, `src/components/back-button.tsx`, `src/components/editor-section.tsx`, `scripts/preview-new-task.ts`, `tests/task-workspace.test.ts`, this document, new `tests/task-categories-v2.test.ts` and eight review PNGs. No files were removed. Tasks main, New Task and Recurrence feature source were not changed. Schema, migrations, persistence/domain files, seed data, routes, package manifests and dependencies remain unchanged.

Physical follow-up: iPhone Expo Go dark/light, keyboard visibility and Return-key submission, long custom lists, menus near the bottom of the sheet, native Delete/Cancel confirmation, VoiceOver/TalkBack ownership/action announcements, large text and safe areas. Review native font density and actual Tasks backdrop against the supplied target.

## Repeating Tasks v2 — Recurring Schedule Management

### Existing behavior audit (before implementation)

1. **Other card actions:** the current manager exposes only Edit schedule, History and Delete. Stop is available inside the existing TaskEditor; no additional direct card action exists.
2. **Manual stop:** an active series can be stopped from Edit schedule → Stop repeating, with the existing native confirmation. The change is effective tomorrow and preserves today's occurrences/history.
3. **Resume:** a stopped task can be edited, given a recurrence through Add recurrence and explicitly saved. This creates the governing future schedule through the existing versioning logic; there is no separate direct Resume card action.
4. **Edit stopped state:** yes, editing can resume a stopped series. Existing active/stopped draft construction and future-only boundaries remain authoritative.
5. **Delete:** the parent task receives a soft-delete timestamp. Normal projections then hide it and its occurrences. The manager retains the existing confirmation and callback.
6. **History retention:** Delete does not physically remove schedule versions or occurrence rows. Stored history remains intact; deleted tasks are no longer normal management destinations.
7. **Disabled actions:** Edit schedule, History and Delete remain available for both active and stopped series. Stop repeating is offered inside the editor only for a non-stopped rule. No stopped card is disabled or faded as a whole.

Grouping must use `latestRecurrence` and `recurrenceStopped`, matching the previous manager's rule selection. A past end date alone is not a new Stopped status, and an effective-until/deleted rule retains the existing helper's meaning. No new date-derived classification or persisted count is introduced. The prior manager fully rendered all cards inside a ScrollView; this pass replaces that presentation with a virtualized SectionList.

### Management hierarchy and card ownership

The pushed screen now opens with a circular Back to Tasks action, the Lora Repeating Tasks title and a quiet supporting sentence. Its header scrolls with the list so accessibility text does not consume a fixed viewport. The existing router Back/fallback behavior is retained. The screen uses the current warm v2 canvas and surfaces, with no legacy green management styling or new background artwork.

Active and Stopped sections have counts derived from their displayed series. Empty groups are omitted. Each task appears once, in source order within its group. One contained surface owns its recurrence icon, serif task name, Current schedule metadata, existing human-readable recurrence summary, overflow and two visible actions. Stopped cards use a quieter icon/surface plus a visible Stopped badge, without disabling Edit schedule or History. Active icon colors reuse the existing Task accent tokens; action/count/status colors reuse the current plum brand tokens. No new palette is introduced.

Edit schedule and History use balanced icon/text secondary buttons. Delete appears only inside the shared anchored ContextMenu and retains the existing native confirmation. The menu closes before confirmation; Cancel is harmless. Stop and resume retain their existing editor paths rather than becoming invented direct card actions. Per-series History remains the existing OccurrenceHistory destination, with its content and styling unchanged.

The existing editor previously applied v2 only to new tasks. A small optional appearance prop now lets this management screen reuse the already-built v2 Task/Recurrence composition for existing records. Edit schedule still opens the existing parent TaskEditor, followed by Edit recurrence. Back retains changes in the unsaved parent draft; parent Save applies existing future-only versioning. No editor redesign, new save step, recurrence computation or persistence change is included. Other existing-task entry points retain their default presentation, and New Task is unchanged.

### Responsive behavior, accessibility and list handling

Cards use wrapping titles/summaries without line truncation. At narrower measured action widths, Edit schedule and History stack; their normal minimum height remains 48 points. At large font scales, identity text moves below the icon/overflow row and gets full width. Its natural flex basis prevents the actions from overlapping expanded text. The screen title uses a slightly smaller base display size at large scales while retaining native font scaling; long words may wrap at the narrowest doubled-text width. No fixed card heights are used.

Cards are not giant buttons. Names announce task identity and Active/Stopped status; section headings announce counts. Edit schedule, History and overflow labels include the task name. Stopped/count badges and icon artwork avoid duplicate announcements. The existing shared button semantics, focus feedback, anchored menu outside dismissal, Back/escape handling and focus restoration remain authoritative. No new animation choreography is added; existing press/menu feedback respects Reduced Motion.

One SectionList owns headers and cards, with stable task-ID keys, initialNumToRender 6, maxToRenderPerBatch 6 and windowSize 5. No enclosing ScrollView or fixed getItemLayout is used for variable-height cards. The shared overlay host remains outside recycled cells. List scrolling is locked while its menu is open; scroll events otherwise remeasure the shared anchor. Safe areas remain owned by the existing screen and are not applied twice. This bounds mounted views, not the number of source schedules read; source Tasks snapshot/generation behavior is unchanged.

The zero state explains that New Task is the creation path, with no redundant Create button. Loading does not flash this empty state. Refresh failures retain last-known cards and the same open editor/recurrence draft through Retry, preserving F1 behavior.

### Skill findings and preview evidence

- **frontend-design:** established screen context → status groups → owned card identity/schedule → visible Edit/History, following the supplied composition while retaining Axis fonts/tokens and existing destinations.
- **Impeccable:** kept the Operate surface compact: one outer card per series, quiet counts/overflow, no botanical decoration or broad insertion choreography. The bounded capture review exposed large-text flex collapse; the correction gives detached details natural height and keeps actions below them.
- **UI/UX Pro Max:** actively queried and verified All-platform Interaction / Confirmation Dialogs guidance. Destructive behavior retains native confirmation after menu dismissal, and stopped text/badges communicate state independently of color. Empty copy identifies the valid creation path without an extra action.
- **Expo native UI:** checked Expo 57 and React Native 0.86 documentation. Used SectionList with variable row heights and the existing safe-area/overlay/modal infrastructure, preserving native Alert confirmation, editor draft retention and Reduced Motion without adding native modules.

The extended `scripts/preview-new-task.ts` supports `?surface=repeating`, plus `&empty`, `&many`, `&long` and `&large`. Fixtures are generated through migrated/seeded in-memory SQLite and the real Task data API at a fixed local date of 19 October 2026. The real manager, SectionList, contextual menu and editor render through React Native Web. Native font loading, keyboard, safe areas, focus lifecycle, motion, pickers and Alert boundaries are substituted for review. Save/History callbacks are recorded rather than pretending browser navigation or fixture writes are production persistence; source integration tests cover those flows.

Eight captures in [the Repeating Tasks preview folder](previews/repeating-tasks-v2/README.md) show mixed dark/light at 390, narrow light at 320 with a long title, dark at 430, doubled-text dark at 320 plus a scrolled Stopped view, and empty dark/light at 390. Seven configurations reported no page errors or horizontal text overflow. At 390, cards measured 358 points wide and 166 high, paired actions 162 × 48, and overflow 48 × 48. The doubled-text state has no schedule/action overlap. This is a browser simulation, not physical-device acceptance.

Browser interaction checks passed outside dismissal, correct History task ID, existing Edit recurrence → Back → Save with interval 3, menu closure before confirmation, confirmed deletion/count refresh and Back. On the 123-series fixture, only 18 card views were mounted initially and 33 after scrolling, with no duplicate mounted task IDs. Native list throughput, screen-reader focus and OS modal stacking still require device validation.

### Tests, validation and boundaries

Fourteen new regressions cover Active/Stopped grouping/counts, latest governing schedule/source order, end-date classification compatibility, all empty-group states, subject accessibility labels/themes, Edit/History, Stop/Cancel/resume with the same task and preserved outcomes/versions, Delete outside dismissal/confirmation/soft deletion, 320/390/430 widths, large text, stable virtualized list keys and refresh-failure/Retry draft retention. Existing action/menu tests now follow overflow before Delete. The lifecycle harness uses the real shared selection context for the manager so scroll locking is actually exercised.

Validation passed TypeScript, 159 focused tests, all 993 tests in the complete serial suite, iOS export, Android export and `git diff --check`. There were no test failures, cancellations or skips. ESLint exits with the same existing six errors and two warnings as the captured baseline; file/rule/severity/message comparison is identical, with no added or removed findings. The full suite retains existing integrity/reconciliation/migration regressions; no new database validation path was necessary for this presentation-only change.

Incremental files: `src/features/tasks/components/recurring-tasks.tsx`, `src/features/tasks/tasks-screen.tsx`, the small editor opt-in in `src/features/tasks/components/task-editor.tsx`, `src/components/design-system.tsx` (wrappable leading-icon button text), `src/components/ui-icon.tsx` (calendarRepeat/calendarStopped/pencil), `scripts/preview-new-task.ts`, `tests/helpers/refresh-lifecycle.ts`, `tests/task-occurrence-presentation.test.ts`, `tests/task-workspace.test.ts`, `tests/tasks-experience.test.ts`, new `tests/repeating-tasks-v2.test.ts`, this document and the new preview folder. No files were removed. Earlier uncommitted Categories v2 work is preserved. Schema, migrations, persistence/domain files, routes, seed data, package manifests and dependencies are unchanged. Nothing was staged, committed or pushed.

Physical follow-up: iPhone Expo Go and Android dark/light, native font density and large accessibility sizes, back/safe-area behavior, scrolling long lists, menu placement near viewport edges, focus restoration with VoiceOver/TalkBack, native Delete/Cancel, and Edit/History/Stop/resume transitions. No physical-device testing was performed.

## History v2 — Completed Task Archive

### Existing History behavior audit (before implementation)

1. **States:** this pushed archive contains the existing Completed and Skipped groups from `taskArchiveSections` / `groupTasks`.
2. **Other outcomes:** skipped recurring occurrences appear in their own existing group. Pending/missed items and soft-deleted tasks/occurrences do not appear. Missed obligations remain in their existing main-screen presentation; this redesign does not reclassify them.
3. **Sources:** completed one-time tasks and completed/skipped recurring occurrences are both represented, with occurrence IDs providing distinct identities within a series.
4. **Date:** a recurring row uses its occurrence's scheduled date/time; a one-time row uses its task date/time. `taskRowPresentation` supplies existing Today/Tomorrow/date-label presentation. It is not a completion timestamp; undated rows omit the date line.
5. **Recurrence:** `taskRowPresentation` resolves the occurrence's own `recurrenceId` and uses `recurrencePatternSummary`; it does not substitute the latest series schedule for old occurrences. The existing missing-rule fallback remains Repeats. Category/priority/description metadata is also supplied from existing source facts.
6. **Context actions:** the existing overflow opens TaskActions: one-time Edit task/Delete task; recurring Edit recurring task/View History/Delete recurring task; skipped occurrences additionally have Return to pending. Completed occurrences do not offer Skip.
7. **Reopen:** the existing row checkbox reopens a completed one-time task or occurrence through the existing source mutation. The archive refresh removes it and Tasks main can show it again. Skipped occurrences can also be completed via that checkbox.
8. **Modification:** clicking row details opens the existing task editor. Contextual Delete soft-deletes the parent task, with native confirmation; recurring Delete hides the series while retaining stored occurrence/version history. There is no delete-single-occurrence action.
9. **Paging:** this pushed archive has no pagination or Load More contract. It uses the existing `useTasks` snapshot: all non-deleted one-time tasks and non-deleted recurring occurrences within the inclusive 30-days-before/30-days-after materialization/read range. The separate per-series OccurrenceHistory destination pages backward by 30-day date ranges using `nextBefore`; its first page also includes early resolved future outcomes. Neither range nor paging is changed here.
10. **Virtualization:** the archive already uses SectionList with stable item keys. It must remain virtualized, including the outer owned section treatment.
11. **Ordering/counts:** Completed first, then Skipped. Completed sorts by descending completion timestamp; Skipped sorts ascending scheduled date/time. Ties retain the source order. No separate database total exists: section counts describe all records supplied by the authoritative current snapshot, not mounted cells or an invented all-time occurrence total.

The attached brief supplies a detailed composition; no mockup image accompanied the request at audit time. The existing Tasks v2 visual language and the brief's composition guide the work unless the owner supplies that image. Functional constraints remain authoritative.

### Archive composition

The previous pushed screen used the legacy green canvas/header and flat rows with long divider lines, stacked metadata and strikethrough titles. The new screen uses the current v2 cream/charcoal canvas, circular icon-only Back to Tasks, Lora History title and the requested supporting sentence. It remains a pushed screen; no bottom tabs or destinations were added. The header scrolls inside the archive so large text can use the full viewport.

Completed owns one continuous group surface with a decorative completion tile, explanatory copy and derived record count. Skipped retains its own equivalent quiet group because it is an existing authoritative archive state. Virtualized header/row/footer slices paint each collection; no outer card wraps all row children. Compact contained row boundaries replace full-width divider lines. At 390 points the captured rows measured 340 points wide, with heights of 58 for the undated record, 68 for dated one-time records and 92 for recurring records. These are measured results, not fixed heights.

Titles retain readable high-contrast practical Manrope text without History strikethrough or disabled styling. Scheduled date/time and occurrence-version recurrence metadata use the unchanged `taskRowPresentation` and recurrence formatter. Calendar/repeat icons identify meaningful lines; undated or non-recurring records reserve no blank line. Existing active category/priority and two-line description metadata remain available, without reintroducing deleted category labels or Uncategorized. Device-local date formatting and Today/Tomorrow labels are preserved.

Completed badges and icons reuse the existing light/dark success token (`#276242` / `#9CCBAD`) on warm neutral control surfaces. Skipped uses neutral readable text and its explicit badge. The archive introduces no palette changes: canvas/group/surface/border retain existing Design System v2 values. Green is confined to completion feedback, not the screen shell.

### Existing interaction ownership

The completion tile intentionally retains the existing interactive checkbox behavior. Its checked state and Reopen/Complete subject label remain explicit; it is not represented as a decorative noninteractive check. Clicking a completed record's checkbox reopens it, while a skipped record's checkbox completes it. Details remain a separately named editor button, preserving the existing entry point rather than making the whole row one ambiguous button. The surrounding owned row surface itself is not interactive.

Each quiet overflow now uses the shared anchored ContextMenu in the existing screen host. It preserves exactly the legitimate former action-surface options: Edit task/Delete task for one-time records; Edit recurring task/View History/Delete recurring task for occurrences; Return to pending only for skipped occurrences. Reopen is not duplicated as a menu action because its existing checkbox is retained. Menu dismissal commits before opening an editor, per-series History, or native Delete confirmation. Native Cancel preserves data; confirmed deletion still invokes the source parent soft-delete action. No single-occurrence delete or new status transition is introduced.

Tasks main, New Task, Recurrence editor, Categories and Repeating Tasks feature components are unchanged by this increment. The separate per-series History surface also retains its existing presentation and pagination. Source-owned callbacks still update the same data APIs and refresh the normal snapshot, so completion/reopen/Skip corrections continue to affect Tasks main and source projections. A failed History refresh retains existing rows, the same open editor and its unsaved fields through Retry.

### Paging, counts and virtualization

No archive Load More control is introduced because this destination had none. Its one-time/occurrence read range remains as documented in the audit above. Per-series History still uses the existing date cursor and Load older history behavior; tests retain three consecutive 30-day pages with no duplicate IDs or date gaps. No data query, generation window, stored history or pagination rule was changed.

Section counts describe the full supplied section collection, including records currently outside the render window. They are not mounted-row counts or newly queried all-time totals. Accessibility hints explain that counts reflect the current Tasks history range. Existing Completed-then-Skipped ordering and stable item identities remain source-owned.

One SectionList uses record keys (occurrence IDs for recurring records), initialNumToRender 8, maxToRenderPerBatch 8 and windowSize 5. There is no enclosing ScrollView, fixed getItemLayout, fixed row height, or broad list animation. The measured 133-record browser fixture mounted 39 rows initially and 63 after scrolling, with no duplicate mounted IDs. This bounds view mounting; the existing snapshot read volume is unchanged.

The shared contextual overlay remains outside recycled rows. Scrolling locks while a menu is open; normal scroll callbacks remeasure anchors. Existing outside/Back/escape dismissal, focus restoration and Reduced Motion remain provided by shared infrastructure. The existing screen owns safe areas once; no new modal/navigation layer or native module is added.

### Responsive behavior and accessibility

At normal text sizes, titles and status badges wrap naturally; controls stay outside the title's text column. At large font scales, the section icon/count use their own row, the heading gets full width, and each archive row places checkbox/overflow above full-width details. The title and status stack vertically with natural flex bases, avoiding narrow letter columns or overlap. There is no font-scaling cap or title truncation. Review widths are 320, 390 and 430 points, plus doubled-text dark at 320.

Section headings announce state and record count. Detail accessibility labels retain task, scheduled date/time, metadata and outcome; their hint identifies the editor action. Checkbox checked state, Reopen/Complete subject labels and task/date-specific overflow names remain available. Badge text and decorative icons do not produce duplicate announcements; status is also visible text, not color alone. Checkbox and overflow targets measured at least 48 points. There are no competing count live regions or focus jumps introduced solely for badge updates.

The overall empty state uses a small completion icon, No completed tasks yet and Completed tasks will appear here. No CTA or illustration is added. Empty sections are omitted, including a Completed-empty/Skipped-populated state. Loading does not briefly display the empty state.

### Skill findings and review evidence

- **frontend-design:** used the archive-specific hierarchy of screen context → owned collection → compact records, with serif screen/group hierarchy and practical row text. The inherited Hearth palette and meaningful success feedback distinguish this from an active dashboard. No ornamental scene or giant per-record card was added.
- **Impeccable:** used the existing-world Operate guidance and bounded two-round capture review. The first review exposed cramped doubled-text headings/title-badge columns; one correction batch separated controls, full-width text and status. Final review confirmed readable grouping and restrained nesting. No further visual-polish loop followed.
- **UI/UX Pro Max:** queried status accessibility, then narrowed to mobile icon labels after the initial top match was web-specific. Applied the verified All-platform Accessibility / ARIA Labels guidance to named native icon controls. Did not transplant web live-region markup or unrelated input guidance into the archive. State remains understandable through text, accessible labels and checkbox state.
- **Expo native UI:** checked Expo 57 and React Native 0.86 SectionList guidance, retaining variable-height virtualized cells, stable identities, the current safe-area/overlay architecture, native confirmation and source mutations. Native typography scaling, screen-reader focus and Alert stacking remain physical-test follow-up.

Eight captures in [the History review folder](previews/task-history-v2/README.md) show populated dark/light 390, narrow light 320 with long titles, dark 430, doubled-text dark 320 and its scrolled Skipped section, plus empty dark/light 390. Seven configurations reported no page errors or horizontal text overflow. The fixture contains seven completed records and one skipped occurrence, including dated/undated one-time records and separate historical occurrences of two series.

The existing preview script now accepts `?surface=history` with `&empty`, `&long`, `&many` and `&large`. Source fixtures use migrated/seeded in-memory SQLite and the real Task data API at local date 20 October 2026. Real History components and the shared menu/editor run through React Native Web. Browser callbacks update review state or record editor/History handoffs; they do not simulate production persistence or real route navigation. Native font loading, keyboard, safe areas, focus lifecycle, motion, pickers and Alert boundaries are substituted. No physical-device testing is claimed.

Real browser checks passed outside dismissal, checkbox Reopen/count refresh, details editing/Save callback, correct series History callback, menu closure before native confirmation, confirmed Delete/count refresh, skipped Return to pending, and Back. The large fixture had no struck text elements or duplicate mounted IDs. Source SQLite integration tests separately verify mutations, retained stored history, editor/History handoffs, and main-screen refresh.

### Incremental scope

New files: `src/features/tasks/components/task-history-list.tsx`, `tests/task-history-v2.test.ts`, and this stage's preview folder (eight PNGs plus README). Modified files: `src/features/tasks/tasks-screen.tsx`, `scripts/preview-new-task.ts`, `tests/helpers/refresh-lifecycle.ts`, `tests/task-workspace.test.ts`, `tests/tasks-experience.test.ts` and this document. The lifecycle harness uses the real selection context for the new manager, allowing tests to exercise actual menu scroll locking. Existing tests now dismiss the anchored History menu outside and wait for action handoff where appropriate.

No files are removed. Earlier uncommitted Categories and Repeating Tasks work is preserved. Schema, migrations, dependencies, package manifests, routes, source persistence/domain computations and seed data are unchanged. The task did not stage, commit or push.

### Final validation and physical follow-up

TypeScript passed. All 167 focused tests and all 1,010 tests in the full serial suite passed, with no failures, cancellations or skips. ESLint matches the captured starting baseline exactly: six existing errors and two existing warnings, with identical file/rule/severity/message findings and no additions or removals. iOS and Android exports and `git diff --check` passed. Browser interaction and bounded-mounting checks also passed. Schema/migration/package/source-domain hashes match the starting state; the existing full suite retains database integrity, recurrence, reconciliation and projection regressions.

No physical-device testing was performed. Retest iPhone Expo Go and Android light/dark, OS accessibility sizes, checkbox checked-state announcements, contextual-menu focus restoration and placement near the viewport bottom, native Delete/Cancel, editor/History handoff, safe areas and scrolling accumulated History. Review density and native fonts against the owner's mockup when it is supplied.

### History v2 — Mockup Fidelity Correction

The owner subsequently supplied the actual dark History mockup and authorized a focused fidelity pass. The existing implementation and behavior were retained. Direct comparison against the previous dark/light 390 captures found these concrete differences:

| Area | Previous implementation | Supplied reference / focused correction |
| --- | --- | --- |
| Header | Back above title/copy, taking an extra vertical band | Back beside serif title and supporting copy at normal text sizes; large text retains a full-width stacked header |
| Collection heading | Serif Completed/Skipped heading and square icon tile | Practical sans-serif collection headings and outlined circular state marks |
| Count | Small rectangular neutral badge | Quiet outlined pill, still at the collection's trailing edge |
| Record density | Recurring examples 92 points high, loose metadata rhythm | Same examples 70 points high; tighter title/date/recurrence spacing without fixed row heights |
| Completion mark | Neutral rounded square with green check | Smaller translucent green circle with semantic outline; checkbox hit target and checked state unchanged |
| Title/status relationship | Status shares title line inside editor details | Status is vertically centered toward the right on wider normal-text rows; narrow/large layouts retain it beside/below the title as needed |
| Status treatment | Plain neutral rectangle, green text | Outlined, subtly tinted green pill for Completed; neutral equivalent for Skipped |
| Overflow | Uncontained dots | Small outlined circular disc at the trailing edge, centered against the record content |
| Surfaces | Dark inset-like row fill against its outer collection | Row fill shares the warm group surface, with subtle existing semantic borders preserving ownership |

The screen title retains its existing 36-point serif role; row titles use practical 15/22 text and date/recurrence metadata 12/17, with normal native font scaling and no truncation or scaling cap. Existing date/recurrence strings are unchanged. Collection icon circles are 34 points and record state circles 26; overflow discs are 32 but their underlying checkbox/menu controls remain at least 48 × 48. The disc is a noninteractive decoration behind the existing ContextMenu trigger, not a new menu or positioning system. Success fills/outlines derive transparently from the existing light/dark success colors; neutral Skipped treatment derives from existing secondary text. No global palette or shared component was changed.

The seven-Completed fixture and its original ordering were retained rather than replacing it with mockup names/dates. Skipped remains its own source-owned section, receiving equivalent circles, neutral pill, count, row boundaries and overflow treatment. The mockup's bottom tab bar was not copied because History remains a pushed route. The apparent static completion icon was not copied: existing checkbox reopening/completion remains interactive and accessible. Existing local date formatting, Today/Tomorrow context, original recurrence versions, optional metadata and action menus remain authoritative.

Responsive positioning continues to expose one visible status, with outcome still announced in the editor-details label even when the badge moves outside that control. At large text, including a wider landscape-sized window, the status remains inside full-width details. Titles, count pills and metadata wrap as necessary without hiding records, changing ordering or changing the render window. No broad list animation was introduced.

Material skill contributions:

- **frontend-design:** compared the actual image's header alignment, sans-serif collection hierarchy, circle/pill vocabulary, trailing actions and record density against the existing captures; used those differences to scope the correction rather than replace the screen.
- **Impeccable:** used a bounded build/review/correction/confirmation pass, avoiding new decorative layers. Review reduced the initially oversized visible overflow circle while retaining its full touch target. Rows continue to read as one quiet owned archive rather than individual dashboard cards.
- **UI/UX Pro Max:** queried and verified All-platform Content / Compact Label Overflow guidance. Status labels have content-driven widths and remain complete/announced as they relocate; large text uses the available full width rather than forcing the mockup's horizontal arrangement.
- **Expo native UI:** checked Expo 57 / React Native 0.86 guidance and retained SectionList, stable keys, existing safe areas, current ContextMenu measurement/focus behavior and native confirmation. Only presentation geometry/colors changed; no native module, navigation, generation or persistence edits were needed.

Updated captures and the retained before views are linked in [the History review folder](previews/task-history-v2/README.md). Seven corrected configurations (320/390/430, light/dark, doubled text and empty) reported no page errors or horizontal text overflow. Browser checks again passed outside dismissal, checkbox Reopen/count refresh, details edit/Save callback, per-series History identity, menu closure before confirmation, confirmed Delete/count refresh, skipped Return to pending and Back. The 133-record fixture mounted 48 rows initially and 72 after scrolling, with no duplicate mounted IDs or struck text; the unchanged render window naturally mounts more of the shorter corrected rows.

Incremental changes are limited to `src/features/tasks/components/task-history-list.tsx`, responsive status assertions plus one landscape/large-text case in `tests/task-history-v2.test.ts`, this document, and the History preview folder. The preview script, Tasks screen callbacks, other Tasks surfaces, shared components, domain/data files, schema, migrations, routes and dependencies are unchanged from the start of this correction pass. Earlier uncommitted work remains intact. No files were staged, committed or pushed.

Final correction-pass validation: TypeScript passed; all 18 History cases, all 168 focused Tasks/History regressions and all 1,011 full-suite tests passed without failures, cancellations or skips. ESLint matches its captured baseline exactly (six existing errors and two existing warnings; identical file/rule/severity/message findings). iOS export, Android export, browser interactions and `git diff --check` passed. No physical-device testing was performed. Retest native metadata readability/density, checkbox semantics, relocated status labels, menu anchoring/focus, light/dark surfaces, accessibility sizes and landscape on iPhone Expo Go and Android.

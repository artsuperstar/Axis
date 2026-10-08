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

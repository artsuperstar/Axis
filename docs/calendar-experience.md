# Calendar experience — Stage 13J

## Month and selected day

Calendar has two connected layers: the month provides orientation and source presence; the selected day's agenda provides object details and source navigation. One shared screen title precedes the centered month/year, quiet Previous/Next controls and Today recovery action. The month grid and agenda are separated by a subtle rule and spacing, without nested cards.

Monday remains the first weekday. Short weekday names use the existing device-locale date formatter; narrow labels are used when screen width/font scale leave insufficient room, while accessibility retains full weekday names. Month and agenda headings wrap, and date cells have a minimum touch height rather than a fixed height. Calendar uses the same explicit safe-area ownership as the redesigned source screens; automatic native-tab content insets are disabled for Calendar.

## Dates and markers

Ordinary dates have a transparent border. Today has an accent outline and underline. Selection has an accent border and muted accent surface; selected Today uses that same treatment plus the underline. Adjacent dates use quieter readable text and remain tappable, following the existing month-selection behavior.

One dot per present source remains the maximum: Task, Commitment and Work, using the existing light/dark source tokens. The visible, wrapping legend reuses those same tokens and labels. A date button announces its full localized date, selected/today/adjacent state and accurate per-source counts. Decorative dots never become separate accessibility targets. Work counts explicitly identify Work items; they still represent expected outstanding payments only.

## Agenda hierarchy

The localized full selected date remains visible, including when Today is selected. Empty loaded dates show Nothing scheduled. The agenda consumes the existing shared projection and dayAgenda ordering unchanged:

1. Timed Tasks, ordered by time and existing deterministic ties.
2. Date-only Tasks.
3. Unresolved Commitments.
4. Outstanding Work expected payments.

Compact rows use separators instead of individual cards or source section headers. Timed Tasks show the real time before the object title; date-only Tasks do not show All day or a fake time. Task category, priority, recurrence and outcome metadata remain secondary.

Existing Task completion/reopening is retained as a separate minimum 44-point checkbox target beside the source-navigation target, replacing the previous large text buttons. There are no new financial quick actions. Source-owned Task outcomes, recurrence versions and generation rules remain unchanged.

Commitments show the obligation title, exact expected amount and a compact source/state line such as Due today · Commitment or Overdue · Commitment. Paid and skipped occurrences remain excluded by the source projection, while old unresolved obligations remain on their original due dates.

Work shows Job Title, authoritative outstanding balance labelled expected or outstanding as appropriate, and Client · Work. Overdue remains explicit. The shared scheduled projection now supplies clientName as structured display metadata; Calendar does not parse it out of a formatted amount string or duplicate Work reconciliation. Partial/full payments, Undo, archived client names and legacy Job Title fallback continue to belong to Work.

## Navigation and local dates

Rows keep the existing /calendar-source target with source, recordId and selected record date. Task, Commitment and Work editors/details remain owned by their feature. Calendar adds no appointments, event editor, Finance Transactions, Fitness, Journal, notifications, external calendars or synchronization.

Previous/Next retain existing civil-date day clamping, leap-year and year-boundary behavior. Today resets both month and selected date using the device-local civil date. Returning from another month triggers only the destination month's read; it does not also read the old month through a stale callback. Date-only YYYY-MM-DD values use existing local picker helpers, never UTC parsing. Midnight updates today's indicator without changing the user's selection; Today explicitly recovers the new local day.

## Month/year jump chooser

The centered month/year is a separate minimum 44-point button with a quiet disclosure cue and an accessible Choose month and year action. It opens a Calendar-owned AdaptiveModal/AdaptiveSheet on the displayed month/year. Previous month, Next month and Today remain available on the Calendar.

The chooser has independent Previous year/Next year controls and twelve localized abbreviated month buttons, each announcing its full month/year. The displayed Calendar month is selected only when the candidate year matches; the shared selected treatment includes a checkmark. Year browsing changes local chooser state only and performs no Calendar reads. Selecting a month immediately closes the chooser and calls the existing date-selection path; there is no Save, Confirm, Done, day selection or full date picker.

Three columns/four rows are used at ordinary phone widths. Larger accessibility text deliberately reflows to two columns; labels can wrap and controls grow vertically. The year controls respect existing representability from 0001 through 9999. Navigation uses jumpToMonth, which computes the civil-month offset from the actual selected date and delegates day clamping to the same addMonths helper used by Previous/Next, including adjacent-date, leap-year and year-boundary cases.

The shared back arrow, scrim and native Back dismiss without applying candidate changes. Dismissal returns focus to the month trigger; on iOS this waits for the native modal's dismissal callback. Losing screen focus closes the chooser without moving focus into an inactive screen. Reopening discards abandoned candidate years and starts on the currently displayed month.

Jumped-to months use the unchanged bounded projection read and loading/error behavior. Navigation state updates to the chosen month/date while the previous successful snapshot is retained internally. A previous month's agenda/markers are not presented as the target month's data if that target read fails; Calendar shows Retry without a false empty agenda. Retry loads the selected target, never resets to Today. Normal same-month refresh failures continue retaining visible last-good content.

## Loading, failure and refresh

Initial loading uses the existing progress indicator and never announces an empty agenda before a successful read. Initial failure offers Retry. Noninitial read failures preserve the last successful same-month grid markers and agenda; selected date and browsed month remain intact. Snapshot clearing on refresh error was removed. A previous month's snapshot is not shown as another month's data while that destination is loading or failing.

Focus, app-foreground and minute refresh continue to use the existing source-owned range API. Task mutations, occurrence outcomes, Commitment Pay/Skip/Undo and Work payments/Undo update the projection through normal refresh. There is no cache or Calendar persistence.

## Performance and scope

Calendar data queries and recurrence/materialization windows are unchanged. Reads remain bounded to the visible month grid, including adjacent dates. Exact Work balances retain their necessary range-scoped receipt/allocation joins; Calendar never requests the Transactions ledger, complete source History, Fitness or Journal detail. SQLite integrity and foreign-key checks remain covered by the source and accumulated-data regressions.

No schema, migration, package or source business-rule changes are introduced. Calm Utility typography, borders, accent, surfaces, spacing and touch targets are reused.

## Validation and physical review

Component tests cover date states, source combinations/counts, legend token consistency, localized Monday-first labels, source colors on ordinary/selected surfaces, complete long labels and large amounts. Mounted tests cover month clamping/year boundaries/leap years, Today, adjacent selection, exact source navigation/order, compact Task toggle, loading/error distinction, last-good retention/Retry, local midnight, payment mutation refresh, bounded SQL reads, narrow widths, light/dark and larger text. Existing recurrence, Work, Commitment, Home, F1 and F4 regressions remain required.

Local web renders of the actual components are reviewed at 390 and 320 pixels. They are layout evidence only; no physical-device testing is claimed. On iPhone Expo Go verify month/date orientation, Today recovery, all date states and marker combinations, legend readability, selected-day rows and source navigation, Task completion, financial mutation refresh, failures/Retry, year/leap boundaries, light/dark, long content, accessibility fonts and VoiceOver.

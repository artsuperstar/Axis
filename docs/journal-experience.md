# Stage 13L: Journal experience

Journal is date-centric and writing-first: selected local day, optional mood and plain writing, then quiet derived Day at a Glance. It retains one saved entry per civil date, explicit Save, separate draft recovery and immediate-transaction stale-save protection. No schema, migrations, dependencies or source business rules changed.

## Date and navigation intent

The custom Calm Utility header contains one Journal title, shared BackButton and anchored Journal options. History is secondary; confirmed Delete appears in that menu only for a saved nonconflicted entry. The existing date chooser remains an explicit Choose sheet. Previous/Next use shared civil addDays arithmetic; Next is disabled on today and Previous at the supported minimum. Today appears while browsing another day.

Home keeps its existing push to `/journal` without a date: a fresh main-screen instance starts on current device-local today. It never inherits a previously browsed date. History pushes `/journal/history`; selecting a saved row navigates to the same editable `/journal` screen with its explicit `date` and a unique `entryRequest`. The request token distinguishes repeated selections of the same date on a retained screen. It is transient route state, not database state. Returning from History without a selection retains the current day.

Dirty Previous/Next/Today, date-picker selections, History, Back and native navigation removal use the existing Save / Discard changes / Keep editing guard. Same-date selection simply closes the picker. Failed Save/Discard blocks navigation; the original draft remains available. Menus dismiss before a sheet or navigation opens.

## Writing and mood

Today opens directly into writing. An empty historical date initially shows No entry for this day and Write an entry (Option A). A saved entry, meaningful restored draft, clearing intent/conflict or explicitly opened historical editor always remains editable. No historical read-only detail implementation is introduced.

Five small wrapping choice buttons retain `great`, `good`, `okay`, `low`, `bad`. Only one can be selected. Tapping the selected mood again clears it to null. Text labels, selected metadata and the visible checkmark accompany semantic colors. Optional mood is stated above the choices. Mood-only entries remain valid; History omits absent moods.

The shared multiline FormField is top-aligned, preserves exact paragraphs and uses Write about your day… as its placeholder. It has a comfortable minimum height that adapts to viewport/font scale; no tiny fixed height or text truncation is introduced. Shared multiline padding/line height remain unchanged. No editor autofocus is added, including historical browsing and existing entries: the user taps the writing area to open the keyboard.

Save is a normal primary explicit-persistence button in a layout footer, within existing iOS KeyboardAvoidingView behavior. It uses measured custom-header height plus native safe-area top offset. The scrolling content and Save occupy separate layout regions; Save is not a floating overlay. An existing modified entry says Save changes, and successful persistence quietly says Saved. Android retains the existing window-resize approach. Native keyboard behavior remains a device-review item.

## Drafts and conflicts

The existing 500ms debounce, 2-second maximum flush, inactive/background and blur flushes, separate recovery table, atomic Save-plus-draft removal and safe Discard remain unchanged. A recovered draft displays a quiet notice, without a recovery modal. Once writing or mood resumes, that informational notice clears. A conflict explanation remains visible during editing.

The `{id, updatedAt}` baseline is still checked in the same immediate transaction as the authoritative write. Conflicted local writing is kept separately from the changed saved entry. Save is blocked once the conflict is known; confirmed Discard changes and reload loads the current saved version. There is no overwrite or merge action. Confirmed entry Delete retains existing soft-delete and draft-removal behavior.

## Day at a Glance

The read-only section follows writing and uses existing per-day source APIs. It shows only the completed Task count, one completed workout name or the total for multiple workouts, and actual Spent / Income / Net Flow in BRL. Task names and per-workout metrics are not listed. It never shows expected obligations, active workouts, rotation suggestions or management controls. Zero activity omits the section. Integer/BigInt Finance aggregation and formatting remain source-owned.

Focus, foreground and minute refreshes update context without changing authored text or mood. A failed refresh retains the same day's last good context and offers independent Retry activity. Cached context for another date is never displayed under the new date.

## History

History is a pushed full-screen destination with BackButton. Saved entries remain newest-first, grouped by local month/year with plain headers and dividers. Each row shows date, optional mood and a roughly two-line, whitespace-normalized plain-text preview. Saved content is never normalized or mutated for display. Mood-only entries show the mood without duplicating it in a visual text preview. Accessible labels include full date, mood when present, preview and an editable-date opening hint.

The existing exclusive-date cursor fetches 20 entries plus one look-ahead row. Load older entries appends disjoint pages; grouping the combined rows merges a month across page boundaries. Failure keeps loaded rows/cursor. Retry after an older-page failure retries that page. Focus refresh reloads the latest page; successful refresh can reset browsing to that page, while failed refresh preserves all loaded pages. Empty and loading/error states are distinct. Drafts never enter History.

## Refresh, failures and midnight

Selected-date reads and local drafts remain independent of context and History. Same-date refresh failures retain the editor, text, mood, baseline and prior summary. Loading another date tracks its target separately from last-good editor state: on failure the target heading remains visible, prior writing/context is hidden, and Retry or Return to loaded day is offered. No previous entry is relabeled as the failed target.

Minute/foreground refresh updates what counts as today. It leaves the selected date unchanged for clean, dirty and historical states. After midnight a previous clean blank today becomes an empty historical date; saved entries and dirty drafts retain their writing. Today becomes available and forward navigation can reach the new local day. No entry is generated at midnight. Date labels construct local noon through pickerValue, never UTC string parsing.

## Performance evidence

Real SQLite fixture: 100 saved historical entries with 1,984-byte paragraph bodies, empty current date/context. Current Journal initialization executed **8 SQL statements** and did not call History. The existing History API executed **1 statement**, returned **21 SQL rows**, and exposed **20 entries / 39,680 body bytes**. Home's saved-existence API executed **1 statement** selecting ID without body text. Context remains targeted to the selected date and loads no routine exercise details or transaction ledger rows.

History deliberately retains bounded bodies at this stage. Twenty paragraph-sized entries are about 40KB in this fixture; there is no N+1 detail read. Full-body size still scales with entry length. A safe SQLite preview projection would need to preserve JavaScript's Unicode-whitespace normalization, so no second normalization implementation or persistence column was introduced. These are measured structural results, not timing guarantees or whole-Home query totals.

## Accessibility and review

Shared buttons expose button/disabled/selected/expanded states and native touch sizes. Date headings and editor labels announce the full selected local date. Mood choices wrap, text scaling remains enabled, History previews intentionally cap at two lines, and other labels are not truncated. Context reads as natural text with no exposed separators or management actions. Dates/months and BRL retain existing device-locale formatting; application copy follows Axis's existing English copy architecture.

Automated coverage includes navigation intent, civil boundaries/leap days/non-UTC dates, optional moods, explicit saving, historical editing, empty-state choice, dirty Back/native removal, recovery/conflict, source-context refresh, target failures, three History pages, grouping, large-text structure, midnight states, bounded reads and SQLite integrity/FKs. Existing data, debounce, lifecycle, migration, Home, F1 and F4 tests remain in place.

Physical iPhone Expo Go testing has not been performed. Review the user brief's checklist: Home versus History date intent, daily/date-picker navigation, writing/Save and keyboard/caret scrolling, recovery after termination, dirty navigation/swipe, conflict/discard, mixed day context, History groups/paging, midnight, light/dark, long paragraphs, large text and VoiceOver. Also check Android keyboard, Back and TalkBack.

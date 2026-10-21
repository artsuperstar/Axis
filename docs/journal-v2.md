# Journal v2 — Reflective Daily Writing

## Existing behavior audit (before visual changes)

1. Home’s Journal row pushes `/journal`; its preview exposes saved existence only, never writing.
2. Journal is a pushed Expo Router screen, not a sheet or a tab. Back returns through the existing stack (Home fallback). No settings bubble belongs to Journal.
3. Previous/Next call the guarded date loader using local `addDays`; choosing the date opens the existing native date sheet. Today remains available on past dates.
4. Next is disabled when target date is today or later. Validation rejects future dates; Previous also stops at `0001-01-01`.
5. Mood is optional: great/good/okay/low/bad. Tapping the selected mood clears it. Changes belong to the draft until Save.
6. Save uses the editor’s baseline-checked transaction. Meaningful whitespace and paragraph breaks survive. Empty text with no mood creates no record; mood-only entries are valid. Existing dirty entries use Save changes.
7. Empty past dates show No entry for this day and Write an entry; only that action exposes the editor. Saved past entries are directly editable.
8. Debounced recovery drafts persist separately from saved entries; lifecycle background/blur flushes them. Relaunch restores unsaved text and mood, not an implicit saved entry.
9. Date changes, History, Back and native route removal share Keep editing / Discard changes / Save protection. Failed saves never continue navigation.
10. A changed/deleted/replaced baseline blocks saving and preserves local writing. Explicit confirmed discard reloads authoritative saved content. No overwrite option exists.
11. Day at a Glance reads source-owned completed-on-date Tasks, completed workout summaries and actual Finance analytics for that date. It has an independent retry and omits zero-activity context. No expected obligations or new metrics.
12. Journal options opens History; selecting a row navigates to the same editor with a unique entry request. Delete entry is available for saved nonconflicting entries with native confirmation.
13. History queries 20 saved entries per page using an exclusive date cursor; pages append. Focus reloads the first page. Errors retain the last good page.
14. Historical entries use the same editable Journal screen, baseline checks and draft recovery, retaining their original local date.
15. Soft deletion exists and is confirmed; local drafts are discarded as part of the existing operation.
16. One FormScrollView surrounds the editor and context; multiline input can scroll. The Save footer sits outside it within KeyboardAvoidingView. iOS uses interactive dismissal and a measured safe-area/header offset; no autofocus or controlled selection resets.
17. Dates use local picker values and locale-aware date formatting. Controls currently use English product copy; there is no new localization layer.

## Visual plan

Operate mode within Axis v2, guided by the supplied dark mockup. Lora supplies a compact Journal title; Manrope supplies dates, moods, controls and writing. Warm cream/charcoal v2 canvas, neutral owned groups and quiet borders remain token-based. Scoped sage accents reuse existing theme accent/on-accent tokens; this is not a global palette decision.

Composition: compact pushed header → owned date/navigation → optional mood group → primary Entry group with a large inset multiline field → secondary Day at a Glance. A full-width Save entry / Save changes action occupies the keyboard-aware footer. History stays one contextual destination with quiet month/year archive rows. No gear, bottom tabs, artwork or invented metrics.

Large text: dates wrap, navigation stacks when necessary, mood choices wrap with complete labels, groups have no fixed heights. Preserve the input node, draft ownership, safe areas, explicit save feedback, selected/disabled semantics and Reduced Motion.

## Skill findings

- frontend-design: the writing surface carries the composition; serif is confined to editorial titles, avoiding ornamental controls.
- Impeccable: keep the reference’s three meaningful groups, one inset input and quieter contextual rows; avoid extra metric cards or choreography.
- UI/UX Pro Max: All-platform Form Labels and Submit Feedback guidance supports a real Entry label, visible selected state and retained Saved/error feedback. Mood deselection remains possible and announced.
- Expo: follow SDK 57 keyboard guidance with the existing KeyboardAvoidingView, one outer scroll, measured header offset and safe-area footer. Native keyboard, cursor and Dynamic Type require device review.

## Validation and captures

Browser captures substitute native runtime boundaries and do not prove physical-device keyboard behavior.

| Check | Result |
| --- | --- |
| TypeScript | Passed |
| ESLint baseline comparison | Exactly unchanged: 6 existing errors, 2 warnings, 0 changed diagnostics |
| Journal focused tests, including source projections | 137 passed |
| Journal + Tasks projection/range regressions | 187 passed |
| Full automated suite | 1,129 passed, no failures/skips |
| iOS export | Passed |
| Android export | Passed |
| git diff --check | Passed |

Eight new theme/width/text-scale regressions supplement updated existing interaction/component tests. Existing tests continue to verify local date boundaries, optional/all moods, explicit creation/update, empty past dates, dirty navigation, recovery across restart/backgrounding, stale/conflicting saves, exact source context, History grouping/cursor paging and historical editing. Schema, migrations, dependencies, data access, editor controller, draft persistence and hooks are unchanged. No commit or push.

## Implementation

- `JournalHeader` owns compact pushed-screen navigation and a full-width title line at large text. `JournalGroup` and `JournalSectionHeading` give each real editing concern a neutral owned surface; they introduce no state or persistence.
- The optional five-state mood selector uses authored outline faces in Axis’s existing icon vocabulary. Selection has both a checkmark/border and selected/pressed semantics. Tapping the active choice clears it. Normal 390/430 widths fit five controls; narrow widths wrap; doubled text uses two columns.
- Entry keeps the shared v2 multiline FormField, a real accessible label, newline submit behavior, existing content and selection ownership, and minimum writing height based on viewport/font size. There is no autofocus, input remount key, or controlled cursor reset.
- `JournalSaveAction` owns only visual feedback and a full-width scoped sage button. The existing controller owns Save entry versus Save changes, conflict disabling, Saved/error feedback and the transactional save. It remains outside the outer scroll within KeyboardAvoidingView, above the SafeAreaView bottom inset.
- Empty past dates still require Write an entry. Recovery and conflict messages keep their original copy/actions, now in v2 typography. Date picker and leave confirmation use existing v2 sheets.
- Day at a Glance remains below writing, omits zero activity and uses quiet rows rather than separate metric cards. Original source reads and exact amounts are untouched.
- History adopts v2 canvas/type/back/actions and compact ruled rows. Existing first-page refresh, 20-row exclusive-date cursor paging, monthly grouping, previews and routing are unchanged. No new date sorting or domain projections.
- Colors are limited to shared neutral v2 tokens plus `useJournalColors` mapping existing theme accent/accentMuted/onAccent into this feature. There are no global palette or theme changes.

Expo review followed [SDK 57](https://docs.expo.dev/versions/v57.0.0/) and [keyboard handling guidance](https://docs.expo.dev/guides/keyboard-handling/). Existing measured keyboard offset and interactive dismissal were retained; no dependency or native build configuration was added.

## Review

See [captures and limitations](previews/journal-v2/README.md). One batched inspection plus one confirmation covers 320/390/430 widths, both themes, simulated doubled text, saved/empty past dates, restored draft, writing, context and History. A split Journal word at doubled text was corrected by giving the editorial title its own full line. No decorative entrance animations were introduced; shared press feedback honors Reduced Motion.

## Day at a Glance v2.1

### Static context

One JournalGroup owns the section, with “A quiet snapshot of your day.” beneath the heading. Tasks, Fitness and Finance use small decorative icon tiles and plain text within that surface. No source block, task title or remainder line has navigation, onPress, a button/checkbox role, focusable controls, chevrons or press feedback. The existing Retry activity action remains outside the source blocks for actual read failures.

### Tasks ownership and completion dates

The existing Tasks-owned `readCompletedOnDate` reads one-time completions and completed recurring occurrences between local midnight and the next local midnight. Due/scheduled dates are not substituted for actual completion dates. Deleted parent tasks, skipped/pending occurrences and completions on other dates are excluded. Resolved previous-schedule occurrences remain real historical completions even when retired; this established behavior is unchanged. Repeated occurrences use their parent’s user-facing title and count as separate qualifying completions.

Both the full count and names derive from that one returned collection in the same existing context transaction. The only projection change is increasing the existing title preview from three to four. `journalTaskPreviewLimit` is shared by projection and presentation. The UI shows the full count, at most four title lines, and informational `+N more` for the exact remainder. Titles wrap up to three lines to keep context compact; full preview titles remain in the source accessibility announcement.

### Fitness, Finance and omission

Fitness retains the previous summary: one saved workout name plus Workout completed, or the full multiple-workout count. No new sets metric or workout destination was introduced. Finance keeps actual Spent/Income/Net amounts and existing exact BRL formatting; Net is the shorter label for the same net-flow value. No Balance or unpaid/expected amounts are included. Zero-activity sources are omitted; all-zero activity still omits the entire surface. Refresh failures retain the last good context and writing.

### Accessibility and responsive layout

Each source is a static accessibility group with a natural Tasks/Fitness/Finance announcement. Icons are decorative, source names are explicit, and the remainder announces “N more completed tasks.” The layout has no fixed height or inner scrolling. At larger text sizes, icons stack above content and Finance labels/values stack vertically. The existing writing, header, date, mood, footer, routing and History are unchanged by this refinement.

### Query impact

There are no added queries, writes or indexes. On a measured fixture of 1,000 historical Tasks plus 20 same-day completions, the existing Tasks source executes 2 statements, loads 20 ID/title rows, and the full context executes 6 statements (also 6 on the empty fixture). The projection exposes four titles and the full count of 20. Reads remain filtered by completion-day timestamps; no claim is made that the existing queries have a new timestamp-leading index. Journal stores no copied task/workout/ledger state.

### Skill contributions

- frontend-design: one static surface with a short hierarchy and bounded task preview, keeping the entry primary.
- Impeccable: removed any need for nested source cards or action-like styling; controlled density through four previews and quiet metadata.
- UI/UX Pro Max: explicit source/count/title/remainder labels communicate meaning without relying on color; grouped announcements preserve full title information.
- Expo: native text wrapping, font-scale adaptation and one existing outer scroll; no nested lists or scrolling added. Reviewed the [React Native 0.86 Text guidance](https://reactnative.dev/docs/0.86/text).

Focused captures and limitations: [Day at a Glance v2.1](previews/journal-v2/context-v21/README.md).

Validation for v2.1: TypeScript, iOS export, Android export and diff check passed. ESLint matched the pre-refinement baseline exactly (6 existing errors, 2 warnings, no changed diagnostic). Focused Journal/Tasks checks passed 187 tests; the full suite passed 1,129. Nineteen new tests cover 0/1–4/7/20 completions, shared source/count/title semantics, one-time and recurring exclusions, DST boundaries, query/row bounds, static long-title content, both themes and 320/390/430/doubled-text layouts, refresh failure/recovery and retained drafts. No schema, migration, dependency, Tasks/Fitness/Finance data-access or persistence changes. No physical-device testing, commit or push.

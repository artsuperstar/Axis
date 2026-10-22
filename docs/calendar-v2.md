# Calendar v2 — Monthly Overview and Selected-Day Agenda

## Existing behavior audit

1. `useCalendar` stores one CalendarSelection; changing month uses the existing local `moveMonth` helper with day clamping.
2. Selected date is stored separately within that selection; adjacent-month selection updates both fields.
3. Today selects the actual local date and corresponding month. Midnight refresh updates Today without moving the selected date.
4. The month trigger opens MonthChooser. Year is a temporary local choice (1–9999), tapping a month applies immediately, preserving/clamping the selected day. Dismissal cancels; focus returns after dismissal. Focus loss closes it.
5. `activityMarkers` aggregates actual projected items into at most one dot per source/date, in Task/Commitment/Work order. Accessible labels retain exact source counts.
6. Tasks owns bounded visible-range reads, recurrence materialization and completed/pending/skipped/missed states. Undated tasks are not Calendar events.
7. Commitments owns visible-range due occurrences, amounts and financial state. Calendar does not independently generate or reconcile payments.
8. Work owns expected-payment projections, client labels and remaining amounts. These are expected/outstanding money, not actual income.
9. Every agenda identity opens `/calendar-source` with source, record ID and date. SourceScreen launches the existing source feature/details/editor.
10. Only Task checkbox actions mutate directly. The data layer resolves current authoritative state before completing/reopening a one-time task or occurrence. No Calendar Edit/Delete/Pay/Skip menu exists.
11. Completion reloads the visible range; focus, foreground and minute refresh do likewise. Failed refresh retains the last good same-month snapshot.
12. All selection, grid and range calculations use local civil dates. The Monday-first grid includes adjacent-month dates, with 28–42 cells depending on month and boundary constraints.
13. Source reads are bounded to the visible grid range. The old screen mapped every selected-day row in one ScrollView; the v2 presentation uses a single FlatList, bounded grid header and variable-height agenda cards, preserving all rows/order without a hard limit.

## Visual plan and authority

Keep Axis functionality and source-owned navigation authoritative. Match the supplied mockup through a large Lora Calendar title, connected month controls, one rounded grid/legend surface, serif selected-date heading and compact owned agenda cards. Manrope remains the practical interface face. Existing v2 cream/charcoal neutral tokens, scoped legacy selected-day sage and centralized source-dot tokens remain provisional. No gear, duplicate native tabs, invented overflow actions, new event model or global palette.

## Subflow audit

MonthChooser receives bounded v2 sheet/typography/control alignment, retaining its year bounds, immediate month selection, native dismissal and focus restoration. CalendarSourceScreen only forwards to SourceScreen; source screens and their existing editors remain authoritative and are not redesigned by this stage. Any legacy styling within those source features is outside this Calendar-only pass.

## Skills

- frontend-design: month overview and selected-day agenda form distinct but connected levels, with compact cards and restrained serif emphasis.
- Impeccable: one grid surface with an internal legend; avoid nested agenda cards, shadows and layout choreography. Batch theme/size review, then at most one confirmation.
- UI/UX Pro Max: All-platform Date Formatting guidance reinforces existing localized labels; Today, selected date and source counts remain explicit and accessible.
- Expo: SDK 57 and React Native 0.86 FlatList guidance support a single virtualized scroll owner, stable IDs, dynamic rows, safe areas and unchanged external state ownership. Native testing is still required.

## Implemented hierarchy

Calendar retains its existing tab destination. DesignProvider opts this screen into local Lora/Manrope typography. The large serif title precedes a connected month/navigation group and separate Today action. Narrow widths put Today beneath that group; larger text gives the month its own line with the arrows below. The existing chooser uses v2 sheet/buttons/type, while retaining immediate selection, cancellation, year bounds and native dismissal/focus restoration.

One rounded grid surface owns localized Monday-first weekday labels, adjacent-month dates, all 28–42 computed cells, real source dots and the wrapping static legend. The selected date has an outline and soft fill; actual Today retains underline and accessible wording independently of selection. Dots still follow the centralized Task/Commitment/Work ordering and colors, with numeric counts announced rather than painted in the grid.

The selected-day heading is serif and locale-aware, with Today shown only when appropriate. Each compact agenda card owns identity/status/source metadata. Completed Task titles remain readable and struck through, with a separate native checkbox semantics action. Financial cards show their own amount/state/context and open their source; no fake checkbox or Pay/Skip action was added. The mockup’s overflow controls were intentionally omitted because Calendar has no additional row actions. Empty days retain “Nothing scheduled.”

## Scroll, safe area and performance

One FlatList owns the entire screen scroll, with the title/month grid/selected-date heading in its header. IDs remain the source-provided IDs; variable-height cards have no getItemLayout or hard page cap. Initial/batch rendering is eight, window size five, and clipping is disabled for accessible dynamic content. No second calendar state, domain model, extra source reads, query cache or list animation was introduced. Source data, hooks, ordering and range calculations are unchanged.

All safe-area edges are explicitly enabled, matching existing Tasks/Fitness screens. The installed screens implementation defaults omitted edges to false, explaining the old status-bar overlap. Actual top/bottom clearance above native tabs must still be checked on device.

## Responsive and accessibility review

At 320/390/430 widths, the seven columns remain aligned. Weekday labels adapt to localized narrow labels when necessary; complete weekday/date names remain accessible. Controls and cards are not fixed-height. At doubled text, month navigation and agenda content stack, the legend wraps, and long names remain uncapped. Date cells remain at least 44pt wide in the 320pt review and at least 48pt tall; most normal widths exceed 48pt in both dimensions. No invisible overlapping touch targets were added.

Every date announces full local date, Today/selected/adjacent status and actual source counts. Task controls expose checked state; identities expose existing source-opening behavior. Only those real actions are interactive. Icons are decorative. Reduced Motion uses existing shared press feedback; no whole-list choreography was added.

## Color and subflow scope

`useCalendarColors` composes existing v2 neutral tokens with existing theme selection/source tokens. There are no new global colors or palette decisions. Source-owned Task/Finance editors and details remain in their current implementation; the Calendar adapter and source persistence were not changed. No Calendar event editor or independent management menu was created.

## Captures

See [review captures and limitations](previews/calendar-v2/README.md). The normal source fixture contains four selected-day rows, and the accumulated fixture 124; browser measurements mounted 29 and 52 cards at the sampled positions. A separate automated fixture verifies a 125-item list retains every ordered ID. No SQL speedup is claimed: the change bounds rendering while existing reads remain constrained to the visible month range.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | Passed |
| ESLint baseline comparison | Unchanged: 6 existing errors, 2 warnings, 0 changed diagnostics |
| Focused Calendar tests | 91 passed |
| Calendar / Tasks occurrence / Commitment / Work integration run | 344 passed |
| Full automated suite | 1,138 passed, no failures/skips |
| iOS export | Passed |
| Android export | Passed |
| git diff --check | Passed |

Nine new regressions cover both themes, 320/390/430 widths, doubled text, v2 grid/legend ownership, safe-area configuration, intrinsic month sizing, actual three-source markers, accessible source actions and a complete 125-row virtualized agenda. Existing Calendar regressions continue to cover civil month/year boundaries, selection/Today separation, chooser cancellation/focus, recurrence completion/reopen, financial projections/reconciliation, range-only reads and last-good refresh behavior.

Changed production files: CalendarScreen, MonthGrid, MonthChooser, DayAgenda and the scoped appearance hook. Existing component/experience tests were updated for UiPressable styles and card/list separation. Added `calendar-v2.test.ts`, `preview-calendar.ts`, this document and review captures. No source-owned hooks/data APIs, schema, migration, dependency, native tab bar or unrelated feature files changed. Nothing staged, committed or pushed.

Physical review still needed: iPhone Expo Go safe-area/status-bar/native-tab clearance, grid tap accuracy, actual Dynamic Type and localized long month names, VoiceOver/TalkBack selected/Today/source announcements, chooser focus/dismissal and long agenda scrolling. Browser captures do not prove those native behaviors.

# F4 read-path measurements

## Method and fixture

Before measurements were executed against the working repository before changing feature queries (base commit `d5725edce252a46ced16fac9dbe7df74b58c5be1`). After measurements use the same deterministic fixture in `tests/helpers/growth-fixture.ts`.

The test adapter records executed Drizzle statements at the Expo SQLite statement boundary and the number of rows returned to JavaScript. Transaction BEGIN/COMMIT statements count; fixture setup, initial PRAGMAs and EXPLAIN statements do not. These are structural measurements, not device latency claims.

Local date: 2026-10-05. Fixture:

- 20 monthly commitments beginning October 2021; 1,220 occurrences (1,200 skipped historical outcomes and 20 pending obligations).
- 30 routines and 90 routine entries; 300 completed workouts with tied timestamps, 1,200 session exercises and 9,600 sets.
- 1,000 Work entries; 960 settled and 40 partially paid; 520 receipts and 1,000 allocations, including combined receipts and an archived historical client.
- 5,000 daily Task occurrences dating from 2013; the measured visible range is January 2026 (31 occurrences).

## Executed before / after results

| Path | Before statements | After statements | Before returned rows | After returned rows |
|---|---:|---:|---:|---:|
| Commitment summary / idempotent catch-up | 103 | 7 | 2,500 | 1,280 |
| Commitment History page 1 | 11 | 9 | 139 | 77 |
| Commitment History page 2 | 11 | 9 | 151 | 77 |
| Commitment History page 3 | 11 | 9 | 163 | 77 |
| Fitness summary (latest workout + active) | 66 | 4 | 153 | 2 |
| Fitness History page (20 summaries) | 66 | 3 | 172 | 21 |
| Work overview | 5 | 7 | 2,001 | 1,042 |
| Work History page (20 entries + 20 receipts) | 5 | 9 | 2,001 | 1,083 |

The extra Fitness History row is a has-more probe. The new Fitness main overview executes 6 statements and returns 52 rows; it loads routine parents without routine-entry detail. There is no equivalent separate main-overview baseline because the previous API expanded all routine details for every caller.

Work statement count increases intentionally: compact balance/reconciliation reads, actionable detail reads and receipt count/page reads have distinct responsibilities. The overview fetches 40 full Work entry rows rather than 1,000. History fetches 20 full Work entry rows, 21 compact receipt identities (has-more probe), and 40 allocation/detail rows for its 20 combined receipts. The next page has the same 9-statement / 1,083-row shape and contains different entry/receipt identities.

## Task query plans

EXPLAIN was executed for SQL captured from the actual `readRange()` materialization lookup and joined Calendar occurrence query, with parameters `2026-01-01`, `2026-01-31`.

Before materialization lookup:

```text
SCAN task_occurrences USING COVERING INDEX task_occurrences_rule_date_unique
```

Before joined display query:

```text
SCAN task_occurrences USING INDEX task_occurrences_active_task_date_unique
```

After, both queries:

```text
SEARCH task_occurrences USING INDEX task_occurrences_date_idx (scheduled_date>? AND scheduled_date<?)
```

The single-column date index is deliberately not partial: the materialization identity lookup must include retained tombstones. The joined display query still filters deleted occurrences. Existing parent/date indexes remain intact.

## Read and paging responsibilities

- Commitment summary batches current parents, schedules, compact retained occurrence keys, pending details and paid amounts. Catch-up still checks every historically due date, honors closed schedules/pauses/installment limits and inserts missing dates in batches of 50. It does not introduce a future-generation window change.
- Commitment resolved History queries exclusive, disjoint twelve-month date bands. First-page pending obligations remain unrestricted by age; later pages return only older resolved details. The UI appends pages. Date uniqueness within a commitment makes the date boundary stable; ordering also includes occurrence ID. Mutations explicitly refresh the loaded pages so reopened old obligations return to Overdue.
- Fitness Home reads only active/latest session summaries. Main overview reads the exercise library and routine parents, without routine entries. The existing routine manager fetches detailed plans in two batched SELECTs only when needed. Workout History uses an exclusive `(completedAt DESC, startedAt DESC, id ASC)` cursor; sets are fetched only by workout detail reads. Ordinary refresh revalidates the loaded prefix, while Load older fetches only the next page.
- Work retains its canonical BigInt hourly-earned computation. SQL aggregates only integer allocations and returns sums as text; per-entry/per-receipt valid sums fit SQLite integers, and global totals remain BigInt. Broken receipts, deleted linked transactions/entries, mixed clients and overpayment are still rejected. Overview fetches full rows only for actionable balances. Settled History details are selected from compact authoritative balances, then fetched in bounded SQL queries. Receipt paging uses `(transactionDate DESC, createdAt DESC, id ASC)`; settled entries use `(workDate DESC, id ASC)`. Each stream has its own terminal cursor. Full combined allocations and archived client labels remain available.
- Home uses the source-owned Fitness summary and Work overview APIs. Calendar's bounded range APIs and Journal's per-day context reads are unchanged. Failed refreshes retain last known good data and editor drafts.

## Limits retained deliberately

- Commitment catch-up still visits historical schedules and retained identity keys; required old holes cannot be skipped. Many unresolved obligations necessarily produce many actionable rows. Compact keys are reread during History metadata/catch-up checks, while resolved detail pages are disjoint.
- Work totals/reconciliation and settled eligibility still read compact compensation facts for all current entries. This keeps one exact earned calculation, including large hourly products, without duplicating rounding in SQL. History detail and receipt loads are bounded; compact financial checks remain linear. The legacy full Work snapshot remains available for authoritative mutation validation and the existing bounded Calendar adapter.
- User-requested pages accumulate in local screen state, and a normal mutation/focus refresh revalidates the loaded prefix. There is no global/persistent cache.
- Fitness summary counts use indexed per-session exercise/set counts; a single exceptionally large workout still costs proportionally to its detail.
- New indexes add their normal storage/write cost. No other speculative indexes, dependency changes or caching system were introduced.

## Reproduction and coverage

```powershell
npm.cmd exec -- tsx scripts/measure-reads.ts
$env:TZ='UTC'
npm.cmd exec -- tsx --test tests/read-performance.test.ts tests/task-range-index.test.ts tests/refresh-lifecycle.test.ts tests/finance.test.ts
npm.cmd test
```

New growth tests verify the full pagination traversal, ties, terminal cursors, no duplicates/gaps, exact totals, archived labels, full receipt allocation reconciliation, old-hole catch-up, Home equivalence and normal mutation refreshes. UI integration tests verify three separate Work pages, incremental Fitness pages, failed-page retention and failed routine-detail refresh retention. Existing paused/ended/completed/installment, Calendar, reconciliation, soft-delete and editor tests remain in the full suite.

Migration 0008 adds only the demonstrated Task index. Tests compare pre-existing tables/data, inject a failure after index creation, verify transaction rollback, retry, repeat the migration and pre-create/retry the index safely. Integrity check returns `ok`; foreign-key check returns no rows on both the grown fixture and migration fixture.

Physical-device latency and scrolling have not been tested. Retest old Overdue discovery/resolution, History Load earlier/more, Paid/Undo refresh, workout completion/detail, Home counts and Calendar range transitions in Expo Go before the design phase.

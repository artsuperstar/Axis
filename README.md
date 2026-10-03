# Axis

Axis is a personal organization application for iOS and Android, built with React Native, TypeScript, Expo SDK 57, and Expo Router.

## Development status

The application shell contains five tabs: Home, Tasks, Calendar, Finance, and Fitness. Tasks supports one-time tasks and fixed-schedule recurring tasks with occurrence history. Both support creation, editing, and soft deletion. One-time tasks keep their original completion/reopening behavior. Recurring occurrences can be completed, reopened, or skipped independently. Finance records actual income and expenses in BRL and provides Week, Month, and Year dashboards with category spending. Home, Calendar, and Fitness currently display only their names.

Tasks is stored offline in `axis.db` using Expo SQLite and Drizzle ORM. There is no account or cloud synchronization. Categories include six built-in choices plus custom categories that users can create and delete.

The main tabs live in `src/app/(tabs)/`. The root stack in `src/app/_layout.tsx` can host future detail screens outside the tabs. Shared UI lives in `src/components/`, with device-aware light/dark colors in `src/constants/theme.ts`. Feature UI, forms, and data access live in `src/features/tasks/` and `src/features/finance/`; database initialization and generated migrations live in `src/database/`.

## Run locally

Use Node.js 22.13 or later and npm.

```sh
npm ci
npm start
```

Open the development server in a compatible Expo Go app on an iPhone or Android device. Expo Go on iOS may require signing in to the same Expo account in the CLI and Expo Go. This is a development-tool requirement; Axis has no account flow.

```sh
npm run android  # Open an Android emulator or connected device
npm run ios      # Open the iOS simulator (requires macOS)
npm run lint     # Run ESLint
npx tsc --noEmit # Check TypeScript
```

## Database development

Database startup opens SQLite, enables foreign keys and WAL, applies bundled Drizzle migrations, and seeds default categories before mounting the app navigator. The native splash stays visible until startup succeeds or a retryable error screen is ready. Initialization never resets existing data on failure.

Schema changes belong in `src/database/schema.ts`. Generate a new migration with:

```sh
npm run db:generate -- --name=describe_change
npm run db:check
```

Review and keep the SQL, journal, snapshot, and generated migration bundle together. Do not edit migrations after shipping them. Migrations run locally on application startup; no database credentials or server are needed.

Tasks and categories use UUIDs and Unix timestamps in milliseconds. Dates use `YYYY-MM-DD` and times use `HH:MM`, preserving local calendar values rather than converting them to UTC. Time requires a date; clearing a date also clears its time. Priority defaults to `none`.

Deleting a custom category leaves its row and existing task references intact. It disappears from category choices, and its tasks display no category label. Tasks with no category also omit the label; the editor uses `No category` to select this empty state. Built-in categories have fixed IDs, are seeded without duplication or timestamp changes, and cannot be deleted through the feature.

## Recurring tasks

Use the editor's `Repeats` selector for Daily, Weekly, Monthly, or Yearly. A recurring task requires a start date and can have a time. Daily, weekly, and monthly patterns support positive whole-number intervals. Weekly patterns allow multiple weekdays; weeks begin on Monday, anchored to the week containing the start date. Monthly patterns use a selected day, clamped to the last valid day of shorter months. Yearly patterns use a selected month/day; February 29 becomes February 28 in non-leap years. `Ends` supports Never or an inclusive On date.

`task_recurrences` stores schedule versions with an inclusive `effectiveFrom` and exclusive `effectiveUntil`. Ordinary title, description, priority, and category edits apply globally. Schedule, start date, time, and end condition edits take effect **tomorrow in the device's local calendar**, keeping today's schedule and older history intact. `Stop repeating` uses the same boundary and keeps the Task and history. Choosing Does not repeat for an existing series also stops it; it does not turn its parent into a standalone task. Enabling recurrence on an existing one-time task starts no earlier than today and clears the parent's one-time completion field. After that, completion belongs to occurrences.

The Tasks view materializes a bounded window from 30 days before today through 30 days after today. It refreshes on focus, app resume, and a detected local day change. History loads 30-day pages of older dates on demand, using the schedule version that applied at the time. Initial creation with an earlier start date can therefore show missed occurrences, while older dates are generated only when requested. There is no unlimited future generation or background worker. Unique rule/date and active task/date indexes make generation idempotent across restarts.

`task_occurrences` stores scheduled local date/time, pending/completed/skipped status, completion time, UUIDs, and creation/update/deletion timestamps. Past scheduled dates and outcomes are never rewritten when a schedule changes. Obsolete future rows are soft-deleted; early completed/skipped outcomes remain visible in History as `Previous schedule`, without returning to the active schedule. Pending obsolete future rows are hidden. Deleting the parent soft-deletes only the Task and hides its occurrences while retaining stored history.

Missed is a display state derived from pending occurrences. Timed occurrences become missed after their local scheduled date/time; date-only occurrences become missed after that day ends. Completing a missed occurrence records completion normally. Reopening completed or skipped occurrences returns them to pending, without shifting future dates. Labels update every minute while Tasks is focused and immediately on app resume. Dates/times float with the device's current local time zone; they do not store a time-zone identifier or a UTC scheduled instant. DST arithmetic preserves intended calendar dates.

The main list shows occurrences instead of an additional parent task, with a separate Skipped group. Upcoming shows only the earliest pending future occurrence per recurring task, alongside every upcoming one-time task. Completing or skipping that occurrence reveals the next one; Earlier and Today retain all their occurrences. Recurring rows show a compact summary of the latest retained schedule beside the occurrence's date/time. The full bounded generation window remains stored. `Repeating tasks` provides access to schedules and history, including stopped series and starts beyond the upcoming window. History uses current Task properties rather than duplicating titles/categories into occurrences. Stage 4's additive `0001_recurring_tasks.sql` migration leaves existing Stage 3 Tasks and Categories unchanged.

## Finance ledger

Finance records money that actually moved: income received or expenses paid. The editor requires Type, Amount, Description, and Date, with optional Category and Note. Dates default to the device's local calendar day; the editor and domain reject future dates to avoid entering planned payments. SQLite itself permits valid future civil dates. There are no accounts, balances, transfers, commitments, installments, Work Balance, currency selectors, or cloud synchronization.

All stored transaction amounts are positive integer centavos in `amountMinor`, with direction stored separately as `income` or `expense`. The supported entry range is 1 through `Number.MAX_SAFE_INTEGER` centavos (R$ 0,01 through R$ 90.071.992.547.409,91). `src/features/finance/money.ts` parses whole strings using integer arithmetic, and formats integer digits without floating-point currency rounding. Accepted Brazilian notation includes `123`, `25,90`, `25,9`, `1.234`, and `1.234,56`; outer whitespace and an optional leading `R$` are accepted. Letters, exponents, signs, dot decimals, malformed grouping, more than two decimal digits, zero, and unsafe amounts are rejected on entry. Display formatting also accepts zero, signed values, and BigInt totals beyond the entry limit for derived dashboard values.

`finance_transactions` stores UUIDs, type, amount, description, optional note/category reference, a `YYYY-MM-DD` transaction date, and epoch-millisecond creation/update/deletion timestamps. Active rows are ordered by transaction date descending, creation time descending, then ID for stable ties. SQLite constrains type, integer centavos, nonempty descriptions, civil dates, timestamps, and category/type compatibility. Deleting a transaction creates a tombstone after confirmation; there is no Trash screen.

Finance categories are separate from Task categories. Built-in expenses are Housing, Food, Transport, Shopping, Health, Pets, Entertainment, Utilities, Subscriptions, and Other. Built-in income categories are Salary, Freelance, and Other. Startup seeds thirteen fixed UUIDs idempotently without changing existing timestamps or reviving tombstones. Built-ins cannot be archived through the feature. Users can create typed custom categories through Categories or the editor's final `+ New category` action. Inline creation saves and selects the category before returning to the editor; changing Type clears an incompatible selection.

`Archive` soft-deletes a custom Finance category using its existing `deletedAt` field, preserving every existing transaction reference and timestamp. Historical transaction rows continue showing the category's original name, with no Uncategorized label. Finance reads retain archived categories for historical name resolution and future category grouping; category selectors and management show only active categories. Transactions without a category still omit the label. A replacement category with the same name gets a new identity and does not inherit the archived category's transactions.

When editing a transaction with an archived category, the selector displays `Category name (archived)`. Opening the selector shows the retained current category as explanatory text, followed by active choices and `No category`; the archived category is not a selectable option. Cancelling keeps it, saving other fields keeps it, and choosing an active category or `No category` changes it explicitly. Re-selecting the current transaction type also preserves it; changing to the opposite type clears an incompatible reference. New assignments always require an active category of the correct type. The existing composite foreign key continues to enforce category/type compatibility. Tasks retain their separate deletion/display semantics.

The additive `0002_finance_ledger.sql` migration creates only Finance tables and indexes. Existing Tasks migrations, tables, recurrence generation, and occurrence history remain intact. The Tasks form controls and calendar helpers now live in shared `src/components/form-controls.tsx` and `src/utils/calendar.ts`, with compatibility exports for Tasks: Finance uses the same accessible selectors, themed fields, local-date validation, and native picker conversion. Tests share the existing Node SQLite/Expo Drizzle statement adapter in `tests/helpers/database.ts`; production data-access factories stay feature-specific.

## Finance dashboard

Finance opens on Dashboard with the current Month selected. A compact Dashboard / Transactions selector keeps the existing full ledger accessible; Add transaction and Categories are available from either view. Transactions retains its existing ordering and editing/deletion behavior and is not filtered by the dashboard period.

The dashboard offers exactly Week, Month, and Year. Week is Monday through Sunday, Month uses the actual first and last day of the calendar month, and Year is January 1 through December 31. All bounds are inclusive local `YYYY-MM-DD` business dates. Previous/next controls navigate historical periods; next is disabled in the current period, and a Current period action returns directly from history. Choosing a different period kind starts at its current period. Navigation is React UI state, never persisted. While Finance is focused, app resume and a detected local day change refresh the data; current selections advance across calendar boundaries while historical selections remain selected.

Exactly three summary cards share the selected range: Income, Expenses, and Net Flow (`Income - Expenses`). `periods.ts` handles civil-date bounds and navigation with explicit reference dates. `analytics.ts` filters active transactions in SQLite using the existing partial date index and projects only type, centavos, category ID, and category name. It aggregates the selected rows with BigInt centavos rather than SQLite `SUM` or floating-point monetary arithmetic, preserving exact totals even beyond the safe Number range or SQLite's signed 64-bit sum limit. The dashboard query does not load the entire ledger. There are no stored summaries, new tables, migrations, or caches.

Spending by Category includes only expenses, groups by category ID, and sorts the largest totals first. Archived categories retain their names and remain separate from replacement categories with the same name. Genuinely unassigned expenses use `No category` in this breakdown only; normal transaction rows keep omitting an absent category label. Every expense contributes to a group, so category totals reconcile exactly with Expenses. Horizontal native bars show each group's share of Expenses; the display-only ratio never alters money. Names and exact BRL amounts wrap, and each accessible category row announces both. Zero expenses shows no bars, empty periods show three zero values, and expense-only periods show negative Net Flow.

Stage 6 does not add previous-period comparisons, Savings Rate, commitments, Work Balance, accounts, budgets, or multi-currency support.

## Validation

SQLite integration tests use Node.js 24 or later. They run the real feature queries, Expo Drizzle driver, and generated migrations against temporary Node SQLite databases; they do not access device data.

```sh
npm test
npx tsc --noEmit
npm run lint -- . --no-cache
npm run db:check
npx expo install --check
```

For iPhone/Android validation: create a title-only task, restart the app, edit every field, complete/reopen it, and delete it. Create and assign a custom category, delete that category, and confirm its task remains visible without a category label. Repeat with airplane mode and both device themes.

The task editor uses compact Priority and Category selectors. Category creation is available through `+ New category` in the category selector and automatically selects the saved category. Check selection/cancellation, duplicate-name errors, and category creation with the keyboard open. Verify Date and Time share a row at normal phone widths and stack on narrow screens or with larger accessibility text. Long values should wrap without clipping. With VoiceOver or TalkBack, check selector values, selected choices, the required Title label, and focus when returning to the editor.

For Stage 4 device validation, create each repeat pattern, use multiple weekly weekdays, choose day 31 and February 29, and set an end date. Complete/reopen/skip individual occurrences and inspect History. Edit a schedule and verify today's rows stay while tomorrow onward changes. Stop repeating and confirm history remains available through Repeating tasks. Test a start more than 30 days ahead, old history pagination, app restart/offline operation, midnight rollover, and foreground resume. Confirm the weekday checkboxes, repeat/end/month selectors, and sheet transitions work with VoiceOver/TalkBack, the keyboard, and larger text. Automated tests cover calendar arithmetic, persistence, generation, transitions, schedule editing/stopping, and migration safety; physical-device validation is still required.

For Finance device validation, add income and expenses with whole reais, centavos, and grouped thousands. Check all editor fields, cancellation, type changes clearing incompatible categories, inline category creation and automatic selection, and custom-category archival preserving transaction category labels. Open an archived-category transaction and verify cancelling or editing other fields retains its category; then choose an active category or No category explicitly. Restart in airplane mode, edit/delete records, verify local dates around midnight, and check both themes, larger text, the keyboard, VoiceOver/TalkBack, and native date selection. Export checks and automated tests do not replace physical-device testing.

For Stage 6 device validation, confirm Month is selected when opening Finance, navigate historical weeks/months/years, and verify forward navigation stops at the current period. Check empty, income-only, expense-only, and mixed periods; archive an expense category and confirm its dashboard name and total remain unchanged. Verify dashboard totals refresh after transaction creation, edits, and deletion, including moving a transaction between periods. Check long category names, large BRL amounts, negative Net Flow, light/dark themes, and larger accessibility text at phone widths. Confirm category names and amounts remain readable with VoiceOver/TalkBack, and that Transactions, Add transaction, and Categories remain easy to access. Physical-device dashboard validation remains outstanding.

Web is not a current product target. The existing `npm run web` command remains available with SQLite's alpha web support. Metro supplies the browser isolation headers needed for SQLite; hosting exported web files would also require those headers.

The configured app icons remain temporary Expo starter artwork pending a dedicated design stage.

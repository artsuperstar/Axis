# Axis

Axis is a personal organization application for iOS and Android, built with React Native, TypeScript, Expo SDK 57, and Expo Router.

## Development status

The application shell contains five tabs: Home, Tasks, Calendar, Finance, and Fitness. Tasks supports one-time tasks with creation, editing, completion/reopening, and soft deletion. Description, local date/time, priority, and category are optional. Other tabs currently display only their names.

Tasks is stored offline in `axis.db` using Expo SQLite and Drizzle ORM. There is no account or cloud synchronization. Categories include six built-in choices plus custom categories that users can create and delete.

The main tabs live in `src/app/(tabs)/`. The root stack in `src/app/_layout.tsx` can host future detail screens outside the tabs. Shared UI lives in `src/components/`, with device-aware light/dark colors in `src/constants/theme.ts`. Task UI, forms, and data access live in `src/features/tasks/`; database initialization and generated migrations live in `src/database/`.

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

Web is not a current product target. The existing `npm run web` command remains available with SQLite's alpha web support. Metro supplies the browser isolation headers needed for SQLite; hosting exported web files would also require those headers.

The configured app icons remain temporary Expo starter artwork pending a dedicated design stage.

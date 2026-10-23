# Expo SDK 58 upgrade

Date: 2026-10-23. Compatibility migration only; no commit, push, cloud build, submission, schema change, or database reset.

## Starting state and recovery evidence

- Branch: `main`; HEAD: `4f4e8e4f7fc957dbc5383e8a63b309377dafde01`.
- Initially modified: `package.json` and `package-lock.json` only. These already requested SDK 58 packages, but the installed tree still had React 19.2.3, React Native 0.86.3 and Router 57.0.24 alongside Expo 58.0.17.
- Initial package files and the exact pre-task patch are preserved under ignored `dist/sdk58-audit/initial-*`. Do not discard these when undoing this task: the initial package edits belong to the user.
- Package manager: npm 11.12.1; Node 24.15.0 on Windows. `npm.cmd` / `npx.cmd` avoid the machine's PowerShell script execution restriction without changing policy.
- Baseline TypeScript: pass. Baseline ESLint: six errors and two warnings, in existing tests.
- Baseline full suite: **1,208 tests; 1,206 pass, two fail**. Both failures are the Earlier/Upcoming rapid-toggle cases in `tests/task-disclosure-motion.test.ts:135`, where entry-animation props expire during resume. The isolated rerun also failed both cases before dependency installation completed. Do not represent the historical 1,208-pass report as this task's measured baseline.
- Baseline and migration logs are in ignored `dist/sdk58-audit/`. The sandboxed baseline test attempt failed at process startup (`uv_os_get_passwd`, ENOMEM); the reported full baseline was rerun outside that sandbox. Redundant sandbox validation was interrupted. Existing user development-server processes were not stopped.

## Sources and skill guidance

Read the installed Expo `upgrading-expo` skill and `expo-dev-client` guidance. The installed cache uses the predecessor name and contains outdated Hermes/implicit-peer advice. Also read the current official [expo-upgrade skill](https://github.com/expo/skills/tree/main/plugins/expo/skills/expo-upgrade) and native-tabs reference, and SDK 58's co-located `node_modules/expo-sqlite/skills/expo-sqlite/SKILL.md`. The SQLite skill reinforces retaining the existing ORM/backend and sharing initialization rather than replacing storage. Current SDK documentation takes precedence over old skill assumptions. No skill installation or global tooling changes were made.

- [SDK 58 changelog](https://expo.dev/changelog/sdk-58)
- [SDK 58 upgrade instructions](https://expo.dev/blog/how-to-upgrade-to-sdk-58)
- [Upgrade walkthrough](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
- [Router 57 to 58 migration](https://docs.expo.dev/router/migrate/sdk-57-to-58/)
- [Native tabs 58 reference](https://docs.expo.dev/versions/v58.0.0/sdk/router/native-tabs/)
- [Strict React Native TypeScript API](https://reactnative.dev/docs/strict-typescript-api)
- [React Native 0.87 changes](https://reactnative.dev/blog/2026/08/11/react-native-0.87)
- [React Native 0.88 changes](https://reactnative.dev/blog/2026/10/19/react-native-0.88)
- [SQLite 58 reference](https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/)
- [Development builds](https://docs.expo.dev/develop/development-builds/introduction/?buildenv=build-with-eas)

## Dependencies and commands

`npx.cmd expo install expo@^58.0.0 --fix` and `npx.cmd expo install --fix --npm` initially failed with npm ERESOLVE while replacing the mixed SDK 57 dependency tree. npm reported datetimepicker's optional `react-native-windows` peer, although Windows was neither a target nor an installed dependency.

A clean `npm install --package-lock-only --ignore-scripts --prefix dist/sdk58-resolution` succeeded with peer checking enabled. The scratch manifest was aligned to the SDK 58 recommendations, its lockfile copied back, then `npm.cmd ci` used for a reproducible installation. No `--force`, `--legacy-peer-deps`, overrides, install exclusions, or dependency-check suppression were used. The scratch resolution did not execute package scripts; the actual installation runs them normally.

Node 24.15.0 meets the documented SDK requirement (Node 22.13+, 24.3+, or 26+; unsupported odd-numbered releases should not be used). Keep npm and the checked-in lockfile for repeat installs. No direct dependencies were added or removed. Drizzle ORM resolves to patch 0.45.4 within the existing `^0.45.3` range; Drizzle Kit remains 0.31.11. The fresh resolution also updates Node types within major 24. No unrelated major tooling upgrade was made.

Resolved direct dependencies (comparison against the committed SDK 57 lockfile, rather than the user's partially upgraded initial manifest):

| Package | SDK 57 lock | SDK 58 lock |
| --- | --- | --- |
| expo | 57.0.26 | 58.0.17 |
| react / react-dom | 19.2.3 | 19.3.0 |
| react-native | 0.86.3 | 0.88.0 |
| expo-router | 57.0.24 | 58.0.25 |
| @expo/ui | 57.0.21 | 58.0.22 |
| @react-native-community/datetimepicker | 9.1.0 | 9.2.1 |
| expo-constants | 57.0.20 | 58.0.13 |
| expo-crypto | 57.0.3 | 58.0.7 |
| expo-device | 57.0.2 | 58.0.5 |
| expo-font | 57.0.4 | 58.0.9 |
| expo-glass-effect | 57.0.4 | 58.0.4 |
| expo-image | 57.0.5 | 58.0.16 |
| expo-linking | 57.0.11 | 58.0.14 |
| expo-splash-screen | 57.0.9 | 58.0.11 |
| expo-sqlite | 57.0.3 | 58.0.13 |
| expo-status-bar | 57.0.1 | 58.0.4 |
| expo-symbols | 57.0.3 | 58.0.4 |
| expo-system-ui | 57.0.4 | 58.0.6 |
| expo-web-browser | 57.0.3 | 58.0.6 |
| react-native-gesture-handler | 2.32.0 | 3.3.0 |
| react-native-reanimated | 4.5.1 | 4.7.1 |
| react-native-safe-area-context | 5.7.0 | 5.10.1 |
| react-native-screens | 4.26.2 | 4.30.0 |
| react-native-web | 0.21.3 | 0.21.4 |
| react-native-worklets | 0.10.1 | 0.13.0 |
| @types/react | 19.2.18 | 19.3.0 |
| eslint-config-expo | 57.0.2 | 58.0.4 |
| drizzle-orm | 0.45.3 | 0.45.4 |
| @types/node | 24.19.1 | 24.19.2 |

Unchanged: TypeScript 6.0.3, ESLint 9.39.5, tsx 4.23.15, Drizzle Kit 0.31.11 and SQL inline plugin 3.0.0. Retain `expo-constants`, `expo-symbols` and existing native dependencies: required Router peers and Android native-tab icons must remain autolinkable. Do not apply the old cached skill's blanket package-removal advice.

## Runtime and source compatibility

### React Native and TypeScript

Adopt the default strict public API and dedicated component instance types for refs. The generic Task SectionList ref uses React's supported `ComponentRef<typeof SectionList<Item, Section>>` inference, because RN's `SectionListInstance` alias erases the required section type. Infer viewability callbacks from public `SectionListProps`, replacing the removed `ViewToken` root type. Absent list header/footer/empty components use `undefined`, matching the new public props without changing what is rendered. The theme hook maps null/unknown appearance to light and explicitly selects dark.

Keep the existing strict tsconfig; do not opt into `react-native-legacy-deep-imports`. The audit found no app usage needing replacement for removed InteractionManager, Touchable root types, Modal.animated, removed StatusBar props/setters, internal deep imports or boolean keyboardShouldPersistTaps. Expo's StatusBar `style="auto"` and Modal's distinct statusBarTranslucent/navigationBarTranslucent options remain intentional. No type assertions, ts-ignore directives or compatibility stubs were added.

### Router and native tabs

Use `expo-router/native-tabs`. Preserve the five declared tabs, names, symbols, themed colors and automatic-inset choices. All pushed routes stay in the root Stack; headers remain explicitly hidden and app-owned headers retain their typography/layout.

Journal uses `usePreventRemove` from `expo-router` and the callback's `repeat()` to resume the exact blocked removal after successful Save or Discard makes the editor clean. Keep editing, failed persistence, draft recovery and subsequent dirty drafts remain protected. Tests exercise the SDK 58 boundary without dispatching the removed callback action shape.

There are no custom navigators, persisted navigation state, raw beforeRemove listeners, nested screen-parameter actions, or removed layout-screen props to migrate. Module-level router calls occur in user callbacks after the router renders, not during module initialization.

### SQLite / Drizzle

Keep `axis.db`, WAL, foreign keys, initialization retry/close behavior, all 14 bundled migrations, seeding, transaction boundaries, indexes, soft deletion, local dates, UUID generation and historical snapshots. The app does not use `syncLibSQL` or `libSQLOptions`, removed in SDK 58. Drizzle continues to use `expo-sqlite`'s supported database/statement API. Keep Babel SQL inlining and Metro's SQL extension; custom configuration is functional and must not be deleted as boilerplate.

Automated tests use real SQLite (Node SQLite adapted at the Expo statement boundary), real Drizzle and actual migrations; they do not prove the native expo-sqlite binary works on a phone. The device checklist below is required for that distinction.

### Native configuration

This is a CNG project: neither `ios/` nor `android/` existed at the start. Do not create or hand-edit native projects. EAS/prebuild will generate SDK 58's scene lifecycle. No AppDelegate customizations or SDK 57 scene opt-in need migration. SDK 58 enables Android R8 for release builds; retain that default and validate a real release binary before considering targeted keep rules. No speculative ProGuard rules or minification opt-out.

Keep app name, scheme, plugins, orientation, branding, fonts, assets and React Compiler. iOS 27 resizing and horizontal safe-area behavior need native review; no new orientation workaround or layout redesign is part of this upgrade.

## Expo Go, EAS and physical installation

As checked on 2026-10-23, Expo's SDK 58 release/upgrade pages still say the updated store Expo Go will arrive in the next few weeks. The user's installed iPhone Expo Go version is unknown. Do not assume it can load SDK 58. An SDK 57 client cannot run these native dependencies.

No `eas.json`, EAS project ID, iOS bundle identifier, Android application ID, or expo-dev-client configuration existed in this repository. No account or signing state was changed. No paid build or publication was started.

To test now from Windows without a local Mac, use EAS cloud (these are **next steps, not executed commands**):

1. Confirm the existing app identity/signing credentials, if Axis was previously installed as a standalone app. Use the same bundle/application identifier to preserve that app's sandbox. Data in Expo Go does not automatically transfer into a standalone development build. Preserve/backup existing data before changing containers; do not uninstall an app with valuable local data.
2. `npx expo install expo-dev-client`.
3. `npx eas-cli@latest login`, then `npx eas-cli@latest build:configure`. Link the intended Expo project and choose the real identifiers; do not invent production identities.
4. Create a `development` profile with `developmentClient: true`, `distribution: "internal"`. Do not set `ios.simulator: true` for an iPhone build. Use the SDK 58 default build image rather than pinning an older Xcode image.
5. Register the iPhone with `npx eas-cli@latest device:create` and complete Apple signing (EAS physical iOS builds require the appropriate Apple Developer membership).
6. Review the build/profile and any cost, obtain authorization, then `npx eas-cli@latest build --platform ios --profile development`. Do not add `--submit`.
7. Install using the EAS build link, enable iOS Developer Mode where required, and run `npx expo start --dev-client` on the same network (or an authorized tunnel).
8. For Android, build an internal development APK with the same profile and `--platform android`; install it on a device/emulator. Separately test a release build for R8 behavior.

## Validation results

| Check | Result |
| --- | --- |
| TypeScript (`node node_modules/typescript/bin/tsc --noEmit`) | Pass with default strict RN API |
| Latest Expo Doctor (`npx.cmd expo-doctor@latest`) | 20/20 checks pass |
| Expo version check (`npx.cmd expo install --check`) | Dependencies are up to date |
| npm installed-tree check (`npm.cmd ls --depth=0 --json`) | No dependency problems |
| Focused Router/ref/form/sheet/navigation tests | 116/116 pass |
| Full suite | **1,210/1,210 pass**, 81 files; no failures, skipped or cancelled tests |
| ESLint baseline comparison | Exactly unchanged: six errors, two warnings; no added/removed diagnostics |
| Drizzle consistency (`npm.cmd run db:check`) | Pass; no migrations regenerated |
| iOS export (`expo export --platform ios --output-dir dist/sdk58-ios --clear --max-workers 2`) | Pass; 1,872 modules, 26 assets, ~5 MB Hermes bundle |
| Android export (`expo export --platform android --output-dir dist/sdk58-android --max-workers 2`) | Pass; ~5.2 MB Hermes bundle |
| Development Metro | Started on localhost:8097; status running; iOS development bundle HTTP 200, 6,033,547 bytes. Task server stopped afterward; pre-existing server untouched |
| Whitespace (`git -c core.autocrlf=false diff --check`) | Pass |

The full suite contains all 1,208 existing tests plus two new Journal removal regressions. Both disclosure tests that failed in the measured baseline passed in the SDK 58 full run. No disclosure behavior or timing assertions were changed to obtain that result. Total duration was 863 seconds under concurrent validation load.

| Regression area | Files | Passing tests | Coverage |
| --- | --- | --- | --- |
| Tasks | 14 | 218 | One-time CRUD, categories, complete/reopen, recurrence versions/calculation/history/skip, local dates, workspace/disclosure and section jumps |
| Calendar | 5 | 91 | Month/Today/chooser selection, agenda and source projections, markers, source actions and local dates |
| Finance (including Commitments, Work and Transactions) | 15 | 310 | Centavos and source ownership, period navigation, chart intervals/SVG source, spending disclosure, category archival, payments and overdue/projections |
| Fitness | 21 | 242 | Workout/set/manual completion, routines/exercises/archival, rotations, historical snapshots and editor flows |
| Journal | 11 | 139 | Explicit Save, optional mood, writing/dates/history/context, recovery, conflicts, dirty navigation and failed Save |
| Home | 4 | 64 | Cross-feature summaries and source entry points |
| Shared / cross-domain | 11 | 146 | Forms, ref consumers, sheets, navigation conventions, Unicode identity, themes, read performance |

These are file-group counts from the same full execution, not additional independent test runs. Detailed per-file results are in `dist/sdk58-audit/test-counts.json`; grouped results in `feature-results.json`. The focused tests include Save/Discard/Keep removal behavior, failed Save retaining recovery, repeat-once navigation, subsequent dirty-draft protection, shared form/ref consumers, routine composition and section jumps. Native boundaries remain mocked.

Lint diagnostics unchanged from baseline: three react/no-children-prop errors in `context-menu.test.ts`, two in `navigation-conventions.test.ts`, one in `transactions-experience.test.ts`; two unused-variable warnings in `tasks-experience.test.ts`. No new application-source diagnostics. Commands used the installed `node_modules/eslint/bin/eslint.js` and saved JSON for exact file/rule/severity/line/message comparison.

Full-suite command (PowerShell; the additional local reporter records file-group counts):

```powershell
$env:TZ = 'America/Sao_Paulo'
$env:ESBUILD_WORKER_THREADS = '0'
node node_modules/tsx/dist/cli.mjs --test --test-concurrency=1 --test-reporter=spec --test-reporter-destination=dist/sdk58-audit/final-tests.log --test-reporter=./dist/sdk58-audit/count-reporter.cjs --test-reporter-destination=dist/sdk58-audit/test-counts.log tests/*.test.ts
```

For normal repeat validation, the equivalent suite can be run with `node node_modules/tsx/dist/cli.mjs --test --test-concurrency=1 tests/*.test.ts`; no ignored reporter file is required. Focused run: `journal-experience`, `adaptive-sheet`, `form-controls`, `context-menu`, `autocomplete`, `navigation-conventions`, `routine-editor-v2` and `task-section-navigation` test files.

The initial full test and Drizzle checks encountered sandbox process-environment failures and were rerun outside the sandbox. PowerShell's development-bundle body transfer was interrupted and replaced with Node's successful HTTP download. These tooling retries did not change app configuration or disable checks.

`npm ci` reports 24 dependency audit findings (four moderate, 20 high) and deprecation notices in the resolved dependency tree. No broad `npm audit fix`, forced upgrade or unrelated major upgrade was applied. JavaScript exports, real SQLite tests and Metro startup do not constitute a compiled native launch; no phone/emulator, iOS scene lifecycle or Android release/R8 execution was tested here.

## Files modified

All changes are unstaged. Initial package-file edits were reconciled, not discarded.

- `package.json`, `package-lock.json`: SDK alignment and reproducible dependency resolution.
- `src/components/app-tabs.tsx`: stable native-tabs import.
- `src/components/adaptive-sheet.tsx`, `autocomplete-field.tsx`, `context-menu.tsx`, `design-system.tsx`, `form-controls.tsx`, `form-focus.ts`, `form-selection-host.tsx`: native instance/ref contracts and resulting unused-import cleanup.
- `src/features/calendar/components/month-grid.tsx`: trigger instance ref; `day-agenda.tsx`: absent empty component.
- `src/features/finance/finance-screen.tsx`: absent list components only.
- `src/features/fitness/components/fitness-forms.tsx`, `routine-composition.tsx`: native instance refs; `exercises-content.tsx`, `history-content.tsx`, `routines-content.tsx`, and `src/features/fitness/rotations-screen.tsx`: absent list components only.
- `src/features/tasks/components/task-workspace-list.tsx`: strict generic ref and public callback types; `recurring-tasks.tsx`, `task-history-list.tsx`: absent empty components.
- `src/features/journal/journal-screen.tsx`: supported removal hook and repeat callback.
- `src/hooks/use-theme.ts`: nullable color-scheme fallback.
- `tests/helpers/lifecycle-native.cjs`, `tests/helpers/refresh-lifecycle.ts`: SDK 58 removal-hook boundary.
- `tests/journal-experience.test.ts`: updated removal assertion and two additional persistence/navigation regressions.
- `docs/expo-sdk-58-upgrade.md`: this report, build checklist and rollback instructions.

App config, tsconfig, Babel, Metro, schemas, seeds, migrations, domain logic, branding, chart styling and route organization remain unchanged. Export outputs, logs and scratch resolution files are ignored under `dist/`.

Final repository state: `main` at the original HEAD, 27 modified tracked files and this one new documentation file, all unstaged. No commit or push. No generated native folders, EAS project configuration, development-client dependency, build or publication was created.

## Native-device checklist

- Cold/warm startup: migration of an existing populated database, persisted reads, no startup exceptions, fonts/assets, splash dismissal; restart the app and verify the same records/UUIDs/amounts.
- All five native tabs, preserved scroll state, pushed source screens, Back/swipe/Android gestures, focus refresh, light/dark and large text; safe areas including resized/wide windows.
- Forms/sheets: keyboard reveal, multiline writing, date/time pickers, anchored menus and focus restoration, nested modal Back.
- Tasks: one-time create/edit, category operations, complete/reopen, recurring generation and schedule versions, skip/return to pending and History.
- Calendar: previous/next month, Today, chooser, date selection, marker/agenda projection, source navigation and complete/reopen.
- Finance: exact BRL centavos, mutations and categories/archive; period navigation and interval taps, native expo-image SVG donut, disclosure, commitments/payments, overdue and Work projections.
- Fitness: start/resume/finish, set logging and manual completion, routines/archival, exercises, rotations, historical snapshots, sheets/pickers/scrolling.
- Journal: previous/next/chooser/history, optional mood, explicit Save/edit, restart recovery, dirty swipe/back Keep/Save/Discard, failed save and conflict protection, Day at a Glance.
- Android release/R8: repeat startup, database, navigation, pickers and expo-image SVG checks in a compiled release binary.

## Rollback

Preserve any changes made after this task before rolling back. Do not use `git reset --hard` or `git clean`.

- To restore the **exact pre-task package edits**, copy `dist/sdk58-audit/initial-package.json` and `initial-package-lock.json` back to their root names. These represent the user's partial upgrade, not a coherent SDK 57 installation.
- To return to the **last committed SDK 57 app**, selectively restore this task's source/test changes and the two package files from recorded HEAD `4f4e8e4f7fc957dbc5383e8a63b309377dafde01`, after reviewing the diff and preserving the initial dependency patch. Run `npm ci`, then rebuild/use the matching SDK 57 client. This intentionally reverses the user's pre-task package edits too; keep the saved patch if they want to reapply them later.
- Do not delete `axis.db`, reset SQLite, remove migrations, change app identifiers, or uninstall the populated native app as part of dependency rollback. No schema migration was introduced by this task.
- Restart Metro after either direction of SDK changes. Native SDK 57/58 binaries must match the chosen JavaScript dependencies; an export alone is not a native rollback/build.

# Axis

Axis is a personal organization application for iOS and Android, built with React Native, TypeScript, Expo SDK 57, and Expo Router.

## Development status

The application shell contains five tabs: Home, Tasks, Calendar, Finance, and Fitness. Each screen currently displays its name. Product features and persistence have not been implemented.

The main tabs live in `src/app/(tabs)/`. The root stack in `src/app/_layout.tsx` can host future detail screens outside the tabs. Shared UI lives in `src/components/`, with device-aware light/dark colors in `src/constants/theme.ts`.

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

Web is not a current product target. The existing `npm run web` command remains available using Expo Router's default web tab fallback.

The configured app icons remain temporary Expo starter artwork pending a dedicated design stage.

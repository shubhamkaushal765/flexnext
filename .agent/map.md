# Map

One line per entry: path, purpose.

## src/pages

- `src/pages/Home.tsx`: home screen
- `src/pages/Profiles.tsx`: profile list and edit form, creates ids with `crypto.randomUUID`
- `src/pages/Modes.tsx`: mode selection, uses `src/domain/modes.ts`
- `src/pages/Sensors.tsx`: BLE sensor connection, keep-awake

## Routing and layout

- `src/main.tsx`: React root, wraps app in `ErrorBoundary` level app
- `src/App.tsx`: hash router (`createHashRouter`), nav shell, route table

## Components

- `src/components/ErrorBoundary.tsx`: class boundary, app and section levels
- `src/components/Skeleton.tsx`: loading placeholder with `role="status"`
- `src/components/RouteError.tsx`: router error element, 404 and generic
- `src/index.css`: all styles, including skeleton and error classes

## State

- `src/state/ProfileContext.tsx`: provider that owns profile state
- `src/state/useProfiles.ts`: context type and `useProfiles` hook

## Data

- `src/data/profiles.ts`: versioned envelope under key `profiles`, KV interface, `prefsKV` over Capacitor Preferences, `createProfileStore`

## Domain

- `src/domain/types.ts`: `Profile` and related types
- `src/domain/modes.ts`: mode definitions

## BLE

- `src/ble/parse.ts`: sensor payload parsers
- `src/ble/sensors.ts`: BLE connection via `@capacitor-community/bluetooth-le`

## Errors

- `src/lib/errors.ts`: `AppError` with codes, `toUserMessage` for display text

## Tests

- Co-located `*.test.ts(x)` next to source
- `src/data/profiles.test.ts`: in-memory KV fake (`memKV`)
- `src/components/Skeleton.test.tsx`: renders with `react-dom/server`
- `src/lib/errors.test.ts`, `src/domain/modes.test.ts`, `src/ble/parse.test.ts`

## CI and build

- `.github/workflows/ci.yml`: Node 22, lint, test, build
- `vite.config.ts`: React plugin, build-only CSP meta tag
- `tsconfig.app.json`: app type check, strict, `erasableSyntaxOnly`
- `tsconfig.node.json`: config files type check
- `.oxlintrc.json`: lint rules

## Native

- `capacitor.config.ts`: app id, web dir `dist`
- `android/app/src/main/AndroidManifest.xml`: Android manifest
- `android/app/src/main/res/xml/file_paths.xml`: FileProvider paths
- `android/app/src/main/java/dev/flexnext/app/MainActivity.java`: Capacitor activity

## Pointers

- `.agent/gotchas.md`: traps
- `.agent/decisions/`: ADRs
- `CLAUDE.md`: imports `AGENTS.md`

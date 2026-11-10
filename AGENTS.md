# FlexNext: agent guide

Offline-first cycling app. Vite + React SPA wrapped in Capacitor for Android. Stack:
- Vite 8, React 19, react-router 8 with hash router: `package.json`, `vite.config.ts`, `src/App.tsx`
- Capacitor 8 Android shell: `capacitor.config.ts`, `android/`
- Storage: `@capacitor/preferences`, wrapped in `src/data/profiles.ts`
- BLE sensors: `@capacitor-community/bluetooth-le` (`src/ble/sensors.ts`). Screen wake lock: `@capacitor-community/keep-awake` (`src/pages/Sensors.tsx`)
- Tests: vitest, co-located `*.test.ts(x)`: `package.json`
- Lint: oxlint: `.oxlintrc.json`
- npm only: `package-lock.json`. No pnpm.

## Start here

1. Read `.agent/map.md`. Then open only files it points to.
2. Never load `.agent/` wholesale. Never read `.agent/runs/`.
3. Traps: `.agent/gotchas.md`. Why things are the way they are: `.agent/decisions/`.

## Commands

- `npm ci`: install from lockfile
- `npm run dev`: Vite dev server
- `npm test`: vitest run (`package.json`)
- `npm run lint`: oxlint (`package.json`, `.oxlintrc.json`)
- `npm run build`: `tsc -b && vite build` (`package.json`)
- `npx cap sync android`: copy `dist/` into the Android project (`capacitor.config.ts`)

CI runs lint, test and build on Node 22 (`.github/workflows/ci.yml`).

## Docs conventions

- Run notes: `.agent/runs/<branch>.md`. Delete at merge.
- Durable facts: promote to `.agent/gotchas.md` or a new `.agent/decisions/NNNN-slug.md`.
- Every claim cites a path. Verify path exists before citing. Delete entries whose path is gone.
- Don't document what grep answers. No line numbers, no full export lists.
- 150 lines/file soft cap. No em dashes.

## Rules

- Commit incrementally on a feature branch, one logical step per commit. Never push to `main` directly.
- Human review happens on the PR to `main`. Nothing merges without it.
- `ponytail:` markers in code are allowed. They feed the debt ledger.

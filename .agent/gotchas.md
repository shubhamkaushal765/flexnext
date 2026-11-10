# Gotchas

Durable traps only. Delete an entry when its cited path is gone or the issue is fixed.

## Tooling

- `erasableSyntaxOnly` forbids constructor parameter properties. Write fields explicitly: `tsconfig.app.json`.
- Node 22 or newer is required. vitest 5 and `@capacitor/cli` both declare `engines.node >=22` (`node_modules/vitest/package.json`, `node_modules/@capacitor/cli/package.json`). CI pins 22 (`.github/workflows/ci.yml`).
- `npm run build` runs `tsc -b` before `vite build` (`package.json`). A type error fails the build even when Vite would bundle fine.
- Repo is npm-only (`package-lock.json`). Do not add `pnpm-lock.yaml`.

## Security

- CSP is injected only at build. `@vitejs/plugin-react` adds an inline preamble in dev, which the CSP would block. The plugin is scoped with `apply: 'build'` (`vite.config.ts`). Do not move the CSP into `index.html` for dev.
- `connect-src 'self'` blocks every remote fetch, including from the Capacitor WebView. Add the origin to the CSP in `vite.config.ts` when adding a network call.
- `file_paths.xml` must keep `external-files-path` `Pictures/` and `cache-path`. Capacitor's `BridgeWebChromeClient` builds file-input URIs with `getUriForFile` (`node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor/BridgeWebChromeClient.java`). Removing either path breaks file picking (`android/app/src/main/res/xml/file_paths.xml`).
- Never render `error.message` from an unknown error. Pass it through `toUserMessage`, which returns the message only for `AppError` (`src/lib/errors.ts`). Other errors log `[unhandled]` and return a generic string.

## Storage

- Profiles live under key `profiles` as `{ version, profiles }` (`src/data/profiles.ts`). Backing store is `@capacitor/preferences`, so data is per device and not synced.
- A legacy bare array is read and normalised but not written. It becomes the envelope on the next save or remove (`src/data/profiles.ts`).
- A stored version above `STORAGE_VERSION` throws `AppError` code `version`. Save, remove and set-active also refuse, so newer data is never overwritten by an older app (`src/data/profiles.ts`, `src/lib/errors.ts`).
- `profiles.bak` is a single slot. It is written before a rewrite that follows corrupt JSON or a normalisation change (`src/data/profiles.ts`). A second bad load overwrites the first backup.
- Missing `createdAt` or `updatedAt` fill with `EPOCH` (`1970-01-01T00:00:00.000Z`). No page or component reads these fields, so the sentinel never shows (`src/data/profiles.ts`, `src/pages/`).
- Names over `NAME_MAX` (60) are sliced on load, not rejected. The form rejects them on save via `validateProfile` (`src/data/profiles.ts`, `src/pages/Profiles.tsx`).

## Web

- `crypto.randomUUID` exists only in secure contexts. Profile ids use it (`src/pages/Profiles.tsx`). Plain `http://` on a LAN address is not secure, so test on `localhost` or the Capacitor origin.
- Routes use `createHashRouter` (`src/App.tsx`). Do not switch to browser history: the Capacitor WebView has no server to fall back to.

## BLE

- Sensor parsers take a `DataView` and return `undefined` for short or invalid payloads, so callers must handle a missing reading (`src/ble/parse.ts`).
- Wake lock is held by `KeepAwake` while the Sensors screen is open (`src/pages/Sensors.tsx`). Release it on unmount, or the screen stays on.

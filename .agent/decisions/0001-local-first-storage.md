# 0001: Local-first storage on device

Status: Accepted (2026-11-10)

## Context

- FlexNext is an offline, single-device cycling app. It reads BLE sensors and keeps a handful of rider profiles (`src/data/profiles.ts`, `src/domain/types.ts`).
- Sibling app neurons uses Supabase Postgres with Prisma and a server for auth and data (`/home/user/neurons/prisma/schema.prisma`, `/home/user/neurons/.agent/decisions/0001-supabase-auth-and-db.md`).
- FlexNext has no server. Its only persistence is `@capacitor/preferences` behind a `KV` interface (`src/data/profiles.ts`).

## Decision

- Keep profile data on the device in `@capacitor/preferences` (`src/data/profiles.ts`).
- Adopt neurons DB conventions for the record shape: string uuid ids, `createdAt` and `updatedAt` ISO timestamps, whitelist validation with length caps (`src/data/profiles.ts`, `src/domain/types.ts`). Neurons equivalents: `/home/user/neurons/prisma/schema.prisma`, `/home/user/neurons/lib/errors.ts`.
- Add a schema version envelope, `{ version, profiles }`, which neurons does not have. A newer stored version blocks writes instead of being overwritten (`src/data/profiles.ts`).

## Consequences

- Data is per device. Nothing syncs between phones or to a web view on another host.
- Schema changes need a version bump and a migration branch in `src/data/profiles.ts`. There is no migration tool.
- Backups are a single `profiles.bak` slot (`src/data/profiles.ts`). Data loss across two bad loads is possible.
- No auth, no tiers, no billing. Neurons' Stripe and Supabase code does not apply here.

## Rejected

- Postgres, Prisma or Supabase backend. Needs a server, auth and network. Breaks offline use on a bike.
- SQLite plugin. Works, but is more native surface than a handful of profiles needs.

# Run: sk/wonderful-hamilton-9chjlo

Delete at merge.

## Ported from neurons

- Agent doc layout and conventions: `AGENTS.md`, `CLAUDE.md`, `.agent/` (neurons `/home/user/neurons/AGENTS.md`, `/home/user/neurons/.agent/gotchas.md`).
- ADR format: `.agent/decisions/0001-local-first-storage.md` (neurons `/home/user/neurons/.agent/decisions/0001-supabase-auth-and-db.md`).
- DB record conventions: uuid ids, `createdAt`/`updatedAt`, whitelist validation with length caps (`src/data/profiles.ts`).
- Error and loading UI pattern: `src/components/ErrorBoundary.tsx`, `src/components/Skeleton.tsx`, `src/components/RouteError.tsx` (neurons `/home/user/neurons/components/ErrorBoundary.tsx`, `/home/user/neurons/components/Skeleton.tsx`).

## Not ported

- Navbar and SideNav (`/home/user/neurons/components/Navbar.tsx`, `/home/user/neurons/components/SideNav.tsx`).
- Stripe billing (`/home/user/neurons/lib/stripe.ts`).
- Supabase auth and session middleware (`/home/user/neurons/middleware.ts`, `/home/user/neurons/lib/supabase/middleware.ts`).
- Prisma and any server DB (`/home/user/neurons/lib/prisma.ts`, `/home/user/neurons/prisma/schema.prisma`).

## Deviations from neurons

- CI runs on Node 22, not Node 20. vitest 5 and `@capacitor/cli` require Node 22 (`.github/workflows/ci.yml`, `node_modules/vitest/package.json`).
- CSP is injected at build only through a Vite plugin, not in a Next config. The plugin skips dev because the React preamble is inline (`vite.config.ts`).
- FileProvider paths are narrowed, not removed. Only `Pictures/` and cache are exposed, because Capacitor's file input needs `getUriForFile` (`android/app/src/main/res/xml/file_paths.xml`).
- Lint works here (`npm run lint` runs oxlint, `.oxlintrc.json`). Neurons' lint is broken.

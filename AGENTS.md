# Sift — Agent Guide

## Startup Directive
* Always invoke the global `caveman` skill at `full` intensity immediately on session start.

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | React 19 + TypeScript + Vite 7 + Tailwind v4 |
| Backend | Cloudflare Workers (plain JS, not TS) + D1 (SQLite) |
| Auth | Custom JWT + Google OAuth + username/password |
| Build | `tsc -b && vite build` → `dist/` |
| Package mgr | pnpm 11, Node 24+ |
| CI/CD | GitHub Actions → Cloudflare Pages + Worker + D1 migrations |

## Commands

```bash
pnpm run dev          # Vite dev server (port 5173)
pnpm run build        # tsc -b (type-check) then vite build → dist/
pnpm run lint         # eslint . (flat config, TS/TSX only)
```

**No test framework exists.** There are no test scripts, test configs, or test files.

## Verify before committing

The CI pipeline runs: **lint → build → deploy**. Match it locally:

```bash
pnpm run lint && pnpm run build
```

If either fails, the commit will break CI.

## Repository structure

```
src/              React SPA — components/, contexts/, hooks/, lib/, types/, data/
workers/          Cloudflare Worker API — index.js, auth.js, db.js (all plain JS)
workers/migrations/   D1 SQL migrations (applied automatically on push to main)
public/           Static assets — store logo SVGs, favicon, theme-init.js
```

- Frontend entry: `src/main.tsx` → `src/App.tsx` (React Router with routes: /, /search, /watchlist, /admin, /settings)
- Worker entry: `workers/index.js` — single-file API with all routes. `workers/auth.js` (JWT/password helpers), `workers/db.js` (D1 query wrappers)
- DB schema: `workers/schema.sql` — 6 tables (users, rate_limits, watchlist, alerts, audit_logs, password_resets)

## Key gotchas

- **Worker is plain JS**, not TypeScript. Don't try to type-check it with `tsc`. Only `src/` is TypeScript.
- **CSP is injected at build time** by a Vite plugin in `vite.config.ts` (`cspMeta()`). Dev server omits it so HMR works. If you need to update CSP headers, edit the plugin, not a config file.
- **`isOfferExpired` is duplicated** — once in `workers/index.js` and once in `src/lib/utils.ts`. Both must stay identical. No shared build across layers.
- **Migrations auto-apply on push to main** via CI. To create a new migration, add a numbered `.sql` file to `workers/migrations/` (e.g. `0006_your_change.sql`). Update `workers/schema.sql` to match.
- **Rate limits** are enforced server-side on auth endpoints. Don't remove them.
- **Trial gating** — max 5 watchlist items, 24h expiry, enforced server-side on `POST /api/watchlist`.
- **Google OAuth** requires `VITE_GOOGLE_CLIENT_ID` (frontend env) and `GOOGLE_CLIENT_ID` (Worker secret). Both must match.
- **`.env`** is gitignored. Use `.env.example` as template. Local dev needs `VITE_GOOGLE_CLIENT_ID`.

## Discovering recent changes

Use git to see what changed recently rather than reading file lists:

```bash
git log -n 5 --stat           # last 5 commits with file stats
git status                    # uncommitted changes
git diff                      # unstaged changes
git diff --cached             # staged changes
```

## CORS

Allowed origins are hardcoded in `workers/index.js`: `https://siftsearch.pages.dev`, `http://localhost:5173`, `http://localhost:3000`. If adding a new dev port or staging domain, update `ALLOWED_ORIGINS` there.

## External Documentation

 - Full project architecture: `/home/wsl/Projects/markdowns/Sift-Markdowns/CONTEXT.md`
 - Design tokens: `/home/wsl/Projects/markdowns/Sift-Markdowns/DESIGN.md`
# Sift — Agent Guide

## Session Start
> **Rule**: Activate the `/caveman` Skill at `full` intensity


## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | React 19 + TypeScript 7 + Vite 8 + Tailwind v4 |
| Backend | Cloudflare Workers (plain JS, not TS) + D1 (SQLite) |
| Auth | Custom JWT + Google OAuth + username/password |
| Build | `tsc -b && vite build` → `dist/` |
| Package mgr | pnpm 11, Node 24+ |
| CI/CD | GitHub Actions → Cloudflare Pages + Worker + D1 migrations |

## Commands

```bash
rtk pnpm sift dev         # Vite dev server (port 5173, extra args forwarded)
rtk pnpm sift build       # tsc -b (type-check) then vite build → dist/
rtk pnpm sift lint        # oxlint .oxlintrc.json (94 rules, replaces eslint)
rtk pnpm sift test        # node --test workers/lib/*.test.js (zero-dep, no framework)
rtk pnpm sift audit       # audit --audit-level=high (CI gate)
rtk pnpm sift --help      # full ops CLI: run steps, doctor, gate, db, admin, watchlist (never deploys)
```

All commands run through the CLI (`bin/sift.mjs`, extra args forwarded: `pnpm sift test <file>`). CI calls the same CLI steps. Raw `pnpm run X` still works but docs use the CLI.

**No test framework exists.** The tests are `workers/lib/category.test.js` (category scorer) + `workers/lib/validate.test.js` (username/password allowlists) + `workers/lib/resolve.test.js` (import-resolve matching), run via `pnpm sift test`. There are no test configs or frontend test files - use `node` not `python3`.

## Verify before committing

The CI pipeline runs: **audit → lint → test → build → deploy**. Match it locally:

```bash
rtk pnpm sift gate
```

If either fails, the commit will break CI.

## Repository structure

```
src/              React SPA — components/{pages,layout,features,ui,guards}/, contexts/, hooks/, lib/, types/, data/
workers/          Cloudflare Worker API — index.js, auth.js, db.js (all plain JS)
workers/migrations/   D1 SQL migrations (applied automatically on push to main)
public/           Static assets — store logo PNGs, favicon, theme-init.js
```

- Frontend entry: `src/main.tsx` → `src/App.tsx` (React Router with routes: /, /auth, /search, /watchlist, /list, /admin, /settings, /privacy, /cookies, /about — landing stays eager, the rest are `React.lazy` behind one `Suspense` fallback). `/` is conditional (`HomeRoute`): `SearchPage` when signed in, `LandingPage` (`src/components/pages/LandingPage.tsx`) when guest. Scroll reveals via `src/hooks/useReveal.ts` (`useRevealRoot`, `[data-reveal]` → `is-visible`, once each)
- Worker entry: `workers/index.js` — single-file API with all routes. `workers/auth.js` (JWT/password helpers), `workers/db.js` (D1 query wrappers), `workers/lib/category.js` (category scorer) + `workers/lib/validate.js` (username/password allowlists) — both plain JS, both with `*.test.js` coverage
- DB schema: `workers/schema.sql` — 8 tables (users, rate_limits, watchlist, shopping_list, alerts, audit_logs, password_resets, product_catalog)
- Shopping list: `/list` (`src/components/pages/ShoppingListPage.tsx`, account-synced quantities against watchlist rows) + multibuy pricing engine (`src/lib/pricing.ts`, frontend-only — server stores qty, prices read live from watchlist, same-tag sets pool across lines)

## Key gotchas

- **Worker is plain JS**, not TypeScript. Don't try to type-check it with `tsc`. Only `src/` is TypeScript.
- **CSP is injected at build time** by a Vite plugin in `vite.config.ts` (`cspMeta()`) **and** enforced as a real header via `public/_headers` (copied to `dist/`, enforced by Pages). Keep both in sync (cross-referenced in each file). Dev server omits it so HMR works.
- **`isOfferExpired` is duplicated** — once in `workers/index.js` and once in `src/lib/utils.ts`. Both must stay identical. No shared build across layers.
- **Validation rules are mirrored, not shared** — `workers/lib/validate.js` (server truth) is duplicated as inline regexes in `src/components/pages/AuthPage.tsx` and `src/components/pages/SettingsPage.tsx`. Keep regexes and error messages identical in all three places; do not import worker code into the frontend (or vice versa).
- **Category enum is mirrored, not shared** — `CANONICAL_CATEGORIES` in `workers/lib/category.js` (server truth) is duplicated in `src/lib/categories.ts`. Keep identical; both files import from their own copy (no shared build). Frontend components import from `src/lib/categories.ts`, never hardcode the list.
- **Positioning** — Sift is a UK supermarket grocery tracker (search → watchlist → shopping list), not an offer-only tool. Pins need not be on offer; never write copy that assumes a discount.
- **Migrations auto-apply on push to main** via CI. To create a new migration, add a numbered `.sql` file to `workers/migrations/` (e.g. `0010_your_change.sql`). Update `workers/schema.sql` to match.
- **D1 does not enforce FOREIGN KEY cascades.** Delete dependent rows explicitly (e.g. watchlist DELETE also clears `shopping_list` + `alerts` rows).
- **Rate limits** are enforced server-side on auth endpoints. Don't remove them.
- **Trial gating** — max 5 watchlist items, 24h expiry, enforced server-side on `POST /api/watchlist`.
- **Google OAuth** requires `VITE_GOOGLE_CLIENT_ID` (frontend env) and `GOOGLE_CLIENT_ID` (Worker secret). Both must match.
- **`.env`** is gitignored. Use `.env.example` as template. Local dev needs `VITE_GOOGLE_CLIENT_ID`.
- **Store logos have two sets** — `public/*.png` (favicon-style marks for app chips/cards, resolved via `storeLogoFor` in `src/lib/stores.ts`) vs `public/landing/` (wordmarks for the guest landing marquee). Don't mix them.
- **ExtensionFAB hides for guests** (no token) and on `/auth`. Don't re-add it to guest surfaces.
- **Bundle rule** — provider-level code imports `API_BASE` from `src/lib/config.ts`, never `src/lib/api.ts` (fuse.js + catalog JSON ride into the guest chunk otherwise). New routes default to `React.lazy` (landing stays eager); React is vendor-chunked in `vite.config.ts`.
- **Landing motion** — tiles/steps/CTA run shared 6s loops with staged entrances and hidden-reset exits; hero is one-shot. All motion dies under `prefers-reduced-motion`, leaving composed static states. Keep the loop, or match it.

## Discovering recent changes

Use git to see what changed recently rather than reading file lists:

```bash
rtk git log -n 5 --stat           # last 5 commits with file stats
rtk git status                    # uncommitted changes
rtk git diff                      # unstaged changes
rtk git diff --cached             # staged changes
```

## CORS

Allowed origins are hardcoded in `workers/index.js`: `https://siftsearch.pages.dev`, `http://localhost:5173`, `http://localhost:3000`. If adding a new dev port or staging domain, update `ALLOWED_ORIGINS` there.

## Frontend Guidelines

Visual source of truth is `DESIGN.md` (`/home/wsl/Repositories/markdowns/sift-markdowns/DESIGN.md`) — tokens, type scale, motion, breakpoints, implementation constraints. Read it before touching any component, style, or layout code. Reuse documented tokens/classes only; never invent values. `DESIGN.md` wins on conflict.

## Session Lifecycle Rules

### Multi-Doc Conclusion Protocol
Whenever the user says **"lets finish up and update the docs"**, you MUST perform the following documentation updates before stopping:

1. **Update MEMORY.md:**
   * Insert a reverse-chronological entry directly under the `## Session History` header.
   * Location: `/home/wsl/Repositories/markdowns/sift-markdowns/MEMORY.md`
   
 ### **Format:**
     ### 📝 [DD-MM-YYYY] @ [UK HH:MM 24-hr] | [Short Session Title]
     * **Changes:** [One-sentence summary of what was accomplished].
     * **Impacted Files:** `[file_1.ext]`, `[file_2.ext]`.
     * **Left Off At:** [One-sentence summary of outstanding next steps].

2. **Update ARCHITECTURE.md:**
   * Review the current architectural state, tech stack details, or data flows.
   * Update any outdated sections to reflect the exact state of the codebase at the end of this session. Keep it under ~200 lines.
   * Location: `/home/wsl/Repositories/markdowns/sift-markdowns/ARCHITECTURE.md`

3. **Update README.md:**
   * Review `README.md`. If the session introduced new features, configuration keys (`.env`), or changed installation/build commands, update those specific sections. Do not alter stable project descriptions unless explicitly relevant.
   * Location: `/home/wsl/Repositories/Sift/README.md`

4. **Update AGENTS.md:** 
   * Updates to this file are strictly reserved for critical, sweeping architectural shifts, fundamental changes to the core tech stack, or major global project rules. Do not modify it for routine features, refactors, or bug fixes. Keep it under ~200 lines
   * Location: `/home/wsl/Repositories/Sift/AGENTS.md`

5. **Commit Message**
   * Once docs are upto date suggest a quick commit message with either `feat:`, `polish:` etc
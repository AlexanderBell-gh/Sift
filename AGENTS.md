# Sift — Agent Guide

## Session Start
> **Rule**: Activate the `/caveman` Skill at `full` intensity


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

## Frontend Guidelines

**CRITICAL: When generating, modifying, or refactoring ANY visual components, styling files, or layout code:**
- You MUST use your `read` tool to load `DESIGN.md` immediately (`/home/wsl/Repositories/markdowns/sift-markdowns/DESIGN.md`).
- Treat the tokens, primitives, and styling guardrails inside `DESIGN.md` as strict, non-negotiable boundaries.
- Reuse only documented tokens, classes, radii, easings, and tints. Never invent new hex values, fonts, or radii. If a new value is needed, propose it and stop.
- `DESIGN.md` wins on conflict. Tailwind arbitrary values are allowed only when `DESIGN.md` lists them.
- Every visual change must preserve the `.dark` override, a visible `:focus-visible` state, and the 44px minimum touch target. Check breakpoints 640/768/1024/1200 (plus 1400 for the deals container).

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

2. **Update CONTEXT.md:**
   * Review the current architectural state, tech stack details, or data flows.
   * Update any outdated sections to reflect the exact state of the codebase at the end of this session.
   * Location: `/home/wsl/Repositories/markdowns/sift-markdowns/CONTEXT.md`

3. **Update README.md:**
   * Review `README.md`. If the session introduced new features, configuration keys (`.env`), or changed installation/build commands, update those specific sections. Do not alter stable project descriptions unless explicitly relevant.
   * Location: `/home/wsl/Repositories/Sift/README.md`

4. **Guard AGENTS.md (Strict Rule):**
   * **DO NOT** update `AGENTS.md` unless it is completely necessary. 
   * Updates to this file are strictly reserved for critical, sweeping architectural shifts, fundamental changes to the core tech stack, or major global project rules. Do not modify it for routine features, refactors, or bug fixes - this is to be kept very lean.
   * Location: `/home/wsl/Repositories/Sift/AGENTS.md`
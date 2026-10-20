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
| Package mgr | pnpm 12, Node 24+ |
| CI/CD | GitHub Actions → Cloudflare Pages + Worker + D1 migrations |

## Commands

> **Rule**: Always use `rtk` infront of any commands you use

```bash
rtk pnpm sift dev         # Vite dev server (port 5173, extra args forwarded)
rtk pnpm sift build       # tsc -b (type-check) then vite build → dist/
rtk pnpm sift lint        # oxlint .oxlintrc.json (94 rules, replaces eslint)
rtk pnpm sift test        # node --test workers/lib/*.test.js src/lib/*.test.ts (zero-dep, no framework)
rtk pnpm sift eval        # category corpus eval + threshold gate (workers/lib/category.eval.mjs)
rtk pnpm sift audit       # audit --audit-level=high (CI gate)
rtk pnpm sift category set|clear|list   # manual category override (D1)
rtk pnpm sift --help      # full ops CLI: run steps, doctor, gate, db, admin, watchlist (never deploys)
```

All commands run through the CLI (`bin/sift.mjs`, extra args forwarded: `pnpm sift test <file>`). CI calls the same CLI steps. Raw `pnpm run X` still works but docs use the CLI.

**No test framework exists.** Worker pure logic lives in `workers/lib/category.test.js` (category scorer) + `workers/lib/validate.test.js` (username/password allowlists) + `workers/lib/resolve.test.js` (import-resolve matching); frontend pure logic in `src/lib/pricing.test.ts` (multibuy engine) + `src/lib/utils.test.ts` (date/deal helpers) — all run via `pnpm sift test` (node strips types natively, so keep test files free of enums/namespaces). There are no other test configs or component test files - use `node` not `python3`. The category scorer additionally has an offline corpus eval (`pnpm sift eval`) that gates on per-category accuracy.

## Verify before committing

The CI pipeline runs: **audit → lint → test → eval → build → migrate → worker → pages**. Match it locally:

```bash
rtk pnpm sift gate
```

`gate` = audit + lint + build + test + eval. If it fails, the commit will break CI.

## Repository structure

```
src/              React SPA — components/{pages,layout,features,ui,guards}/, contexts/, hooks/, lib/, types/, data/
workers/          Cloudflare Worker API — index.js, auth.js, db.js (all plain JS)
workers/migrations/   D1 SQL migrations (applied automatically on push to main)
public/           Static assets — store logo PNGs, favicon, theme-init.js
```

- Frontend entry: `src/main.tsx` → `src/App.tsx` (React Router with routes: /, /auth, /search, /watchlist, /list, /offers, /admin, /settings, /privacy, /terms, /cookies, /about, /license — landing stays eager, the rest are `React.lazy` behind one `Suspense` fallback). `/` is conditional (`HomeRoute`): `SearchPage` when signed in, `LandingPage` (`src/components/pages/LandingPage.tsx`) when guest. Scroll reveals via `src/hooks/useReveal.ts` (`useRevealRoot`, `[data-reveal]` → `is-visible`, once each)
- Worker entry: `workers/index.js` — single-file API with all routes. `workers/auth.js` (JWT/password helpers), `workers/db.js` (D1 query wrappers), `workers/lib/category.js` (scorer) + `workers/lib/category.lexicon.js` (curated lexicon) + `workers/lib/category.phrases.js` (generated phrase table) + `workers/lib/validate.js` (username/password allowlists) — all plain JS, all with `*.test.js` coverage
- DB schema: `workers/schema.sql` — 8 tables (users, rate_limits, watchlist, shopping_list, alerts, audit_logs, password_resets, product_catalog); executable truth is `workers/migrations/0001_init.sql` + `0002_catalog_category.sql`
- Shopping list: `/list` (`src/components/pages/ShoppingListPage.tsx`, account-synced quantities against watchlist rows) + multibuy pricing engine (`src/lib/pricing.ts`, frontend-only — server stores qty, prices read live from watchlist, same-tag sets pool across lines)

## Key gotchas

- **Worker is plain JS**, not TypeScript. Don't try to type-check it with `tsc`. Only `src/` is TypeScript.
- **CSP is injected at build time** by a Vite plugin in `vite.config.ts` (`cspMeta()`) **and** enforced as a real header via `public/_headers` (copied to `dist/`, enforced by Pages). Keep both in sync (cross-referenced in each file). Dev server omits it so HMR works.
- **`isOfferExpired` is duplicated** — once in `workers/index.js` and once in `src/lib/utils.ts`. Both must stay identical. No shared build across layers.
- **Validation rules are mirrored, not shared** — `workers/lib/validate.js` (server truth) is duplicated as inline regexes in `src/components/pages/AuthPage.tsx` and `src/components/pages/SettingsPage.tsx`. Keep regexes and error messages identical in all three places; do not import worker code into the frontend (or vice versa).
- **Category enum is mirrored, not shared** — `CANONICAL_CATEGORIES` in `workers/lib/category.lexicon.js` (server truth, re-exported from `workers/lib/category.js`) is duplicated in `src/lib/categories.ts`. Keep identical; both files import from their own copy (no shared build). Frontend components import from `src/lib/categories.ts`, never hardcode the list.
- **Category lexicon is generated, do not hand-edit** — `workers/lib/category.phrases.js` is built from `src/data/uk-*.json` + `workers/lib/category.lexicon.js` by `node workers/lib/category.phrases.build.mjs`. Edit the curated lexicon file, rebuild, commit both. `pnpm sift eval` fails when the phrase table is stale, so corpus and lexicon cannot drift. The keyword tier and holdout list are not compared yet (CATEGORY.md, Implementation review item 4).
- **`pnpm sift eval` is a gate** — the corpus eval (`workers/lib/category.eval.mjs`) asserts a per-category accuracy floor from `workers/lib/category.thresholds.json` (fit suite 100%). The holdout suite reports 94% but leaks: the keyword tier is derived from the full corpus, so held-out names still train it; the leak-free score is 70.3%. Floors are a ratchet, with one sanctioned re-baseline when that leak is fixed (CATEGORY.md, Implementation review item 1). `pnpm sift gate` and CI both run it.
- **Category votes come in two strengths** — a strong vote names one shelf (a matched product name, or a keyword the corpus only uses for that shelf); a weak vote is a flavour word (`apple`, `lemon`, `cinnamon`) or a word the corpus uses for several shelves. Weak votes only decide when no strong vote landed. Keep that split: without it `apple & cinnamon granola` lands on produce.
- **No in-browser test surface** — the `/dev/tests` page, its node:test/node:assert shims, the dev test writer plugin and the scorer tuner are all deleted. `node --test` and `pnpm sift eval` are the whole test surface. Never statically import worker code into `src/` (breaks `tsc` — use `/* @vite-ignore */` dynamic imports).
- **Positioning** — Sift is a UK supermarket grocery tracker (search → watchlist → shopping list), not an offer-only tool. Pins need not be on offer; never write copy that assumes a discount.
- **Migrations auto-apply on push to main** via CI, in the order migrations → worker → pages. The chain is two files (`0001_init.sql` builds a full database from scratch, `0002_catalog_category.sql` adds the manual-override columns). To add a migration, add a numbered `.sql` file to `workers/migrations/` and update `workers/schema.sql` to match.
- **Manual category override is CLI-only** — `pnpm sift category set "<product name>" <category>` writes `product_catalog.category`, which the worker reads before scoring. Global by name, case-insensitive. Remote writes need `--remote --yes`. No UI, no per-user override.
- **D1 does not enforce FOREIGN KEY cascades.** Delete dependent rows explicitly (e.g. watchlist DELETE also clears `shopping_list` + `alerts` rows).
- **Staged removals must flush on `pagehide`.** React never runs unmount cleanups on refresh/close-tab, so staged watchlist/shopping-list removals commit through a `pagehide` listener with `keepalive` fetches (`removeFromWatchlist`, `setShoppingListQty` carry it). Never rely on unmount alone for unload paths.
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

Allowed origins are hardcoded in `workers/index.js` (`ALLOWED_ORIGINS`): `https://siftsearch.pages.dev`, `http://localhost:5173`, `http://localhost:3000`, plus LAN `http://192.168.1.70:5173` for on-device dev (DHCP may reassign — update when it changes). If adding a new dev port or staging domain, update `ALLOWED_ORIGINS` there.

## Code Longevity & Quality Standards

You are not merely a code generator; you are a dedicated co-architect. Your primary objective is the long-term health, maintainability, and production readiness of this
codebase. Every single line of code you produce must strictly adhere to these standards.

#### Core Philosophy

- Maintainability: Code is read far more often than written. Prioritise clarity, explicit naming, and human readability above all else.
- Evolution: Adhere to the "Boy Scout Rule." You must proactively identify and gently refactor any technical debt or suboptimal patterns within the context of your
  changes.
- Future-Proof Design: Anticipate future requirements. Design interfaces that are open for extension but closed for modification.

#### Mandatory Best Practices

1. Defensive Programming: Always handle all edge cases, null/undefined checks, and asynchronous rejections. Never assume valid input.
2. Strict Typing & Architecture: Follow the repository's established architectural patterns religiously. Shortcuts (like any) are forbidden.
3. Intentful Documentation: Use highly descriptive names. Comment why a specific, non-obvious approach was chosen, not what the code does.
4. Testability by Design: Code must be modular and decoupled. If a component is difficult to unit test, it is too complex and must be broken down.
5. Dependency Minimization: Evaluate the necessity of every import. Avoid introducing external dependencies for minor, implementable utilities.

## Session Lifecycle Rules

### Multi-Doc Conclusion Protocol
Whenever the user says **"lets finish up and update the docs"**, you MUST perform the following documentation updates before stopping:

1. **Update RECENT.md:**
   * Insert a reverse-chronological entry directly under the `## Sessions` header.
   * Keep the file at or under 70 lines — trim the oldest entries when adding a new one.
   * Location: `/home/wsl/Repositories/markdowns/sift-markdowns/RECENT.md`
   
 ### **Format:**
     ### 📝 [DD-MM-YYYY] @ [UK HH:MM 24-hr] | [Short Session Title]
     * **Changes:** [One-sentence summary of what was accomplished].
     * **Impacted Files:** `[file_1.ext]`, `[file_2.ext]`.
     
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
   * Once docs are updated suggest a quick commit message with either `chore:`, `feat:` or `polish:` etc

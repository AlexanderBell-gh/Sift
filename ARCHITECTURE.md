# Sift — Architecture (LLM quick-reference)

> Replaces `CONTEXT.md` (in `sift-markdowns/`) as the canonical state doc.
> `DESIGN.md` still wins on all visual questions. `AGENTS.md` still wins on
> session rules. Keep this file under ~200 lines.

## Stack

- Frontend: React 19 + TS + Vite 7 + Tailwind v4 → `dist/`. pnpm 11, Node 24+.
- Backend: Cloudflare Workers **plain JS** (never `tsc`) + D1 SQLite. No deps.
- Auth: custom JWT (Bearer) + Google OAuth + username/password (PBKDF2).
- CI: audit → lint → build → Pages + Worker + auto-apply D1 migrations.
- Clients: web SPA (this repo), `../sift-extension` (sends `category_signals`,
  no longer guesses as of its `CATEGORY.md` cut), phone app (sends
  title/brand/store only, uses `POST /api/category/score`).

## Commands

```bash
rtk pnpm run dev          # Vite :5173 (no CSP, HMR works)
rtk pnpm run build        # tsc -b && vite build → dist/
rtk pnpm run lint         # eslint . (src only)
rtk pnpm test             # node --test workers/lib/*.test.js (91 tests, zero-dep)
```

## Repo map

```
src/main.tsx → App.tsx → routes: / (HomeRoute: SearchPage|LandingPage),
  /auth /search /watchlist /list /admin /settings
src/components/  pages + WatchlistFilters + filters/ primitives + DealSection
src/lib/  api.ts (all fetch clients) categories.ts (canonical 8, mirrors worker)
  pricing.ts (multibuy engine, frontend-only) stores.ts (11 stores) utils.ts
src/data/  uk-{dairy,bakery,meat-fish,produce,frozen,cupboard,drinks}.json
  1,607 names; autocomplete corpus AND category vocab mine
workers/index.js  all routes | auth.js JWT/password | db.js D1 wrappers
workers/lib/category.js scorer (TAXONOMY_VERSION=3) + category.test.js
workers/lib/validate.js username/password allowlists + validate.test.js
workers/schema.sql 7 tables | workers/migrations/0001-0008 auto-apply on push
public/ logos (_Logo.svg chips vs landing/ wordmarks) + _headers (real CSP)
```

## Category taxonomy v3 (worker owns it, all clients)

`scoreCategory(signals)` in `workers/lib/category.js`. Canonical 8 frozen:
Chilled Snacks Beverages Produce Frozen Bakery Food Cupboard Other.
Pipeline: frozen veto (title/leaf/jsonld only) → storage layer → non-food →
dry-goods veto → protein confirm → crumb leaf 1.0 + path/jsonld/url 0.5 →
weak-crumb title 1.0 + brand 0.5 → floor 1.5 → fixed-priority ties
(Frozen > Produce > Bakery > Food Cupboard > Snacks > Beverages > Chilled).
Points: phrase 3 / exact token 1.5 / substring 0.5. Mid-trail `frozen` crumb
scores points, never forces. Low-confidence/Other logs unknown-bucket line.
Legacy guess clamped to enum v0 (+ title fallback adopts non-Other only).

## Worker routes (all Bearer except noted)

- Auth: `POST /api/auth/register|register-admin|login|trial|google`,
  `forgot-password`, `reset-password`; `GET/PUT/DELETE /api/auth/me`.
  Rate-limited per IP. GBP-only currency coerce. Trial: 5 items, 24h.
- Watchlist: `GET /api/watchlist`, `POST` (scores signals, trial-gated,
  dedup `UNIQUE(user_id,product_id)`), `DELETE /:id` (+ orphan shoplist rows,
  D1 skips FK cascades), `GET /ids`, `GET /api/watchlist-names`,
  `GET /api/deal-offers` (20 random on-offer, authed).
- Category: `POST /api/category/score` (authed preview) +
  `POST /api/admin/watchlist/rescore` (dryRun default true, adopts non-Other,
  bumps rest to v3, audit-logged).
- Shopping list (qty only, prices live from watchlist, cap 99):
  `GET/POST/DELETE /api/shopping-list`.
- Admin: `/stats /users /users/:id /users/:id/role /audit /trials
  /trials/cleanup` + rescore. Last-admin guard. Audit-logged mutations.

## Gotchas (do not break)

- Worker plain JS; `tsc` covers `src/` only.
- CSP in two places, keep synced: `vite.config.ts cspMeta()` + `public/_headers`.
- Duplicated logic, keep identical: `isOfferExpired` (worker + `utils.ts`);
  validation regexes (`validate.js` + `AuthPage` + `SettingsPage`);
  `CATEGORIES` (`categories.ts` mirrors worker enum, single import).
- New migration = numbered `.sql` + update `schema.sql`. Push to main deploys.
- Google OAuth needs matching `VITE_GOOGLE_CLIENT_ID` + Worker secret.
- CORS allowlist hardcoded in `workers/index.js`.
- Trial gating + rate limits enforced server-side, never remove.
- ExtensionFAB hides for guests and on `/auth`. `.env` gitignored.

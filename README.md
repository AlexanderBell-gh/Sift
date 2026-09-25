# Sift

A UK supermarket offer tracker. Select up to 3 stores, search opens each store's results page in a new tab.

**Live:** https://siftsearch.pages.dev

## Features

### Search & Discovery
- 11-store multi-select search (Tesco, Sainsbury's, ASDA, Morrisons, M&S, Aldi, Lidl, Co-op, Waitrose, Iceland, Ocado) with store-aware query redirect
- Local autocomplete via UK grocery product dictionary (~1600 items) + Fuse.js fuzzy search
- Deals of the Day — random de-duplicated on-offer items from all users' watchlists. Signed-in users get an Add to Watchlist button per tile (spinner while adding → green "Added" check for 1.5s → greyed-out "Added" permanently); shown on Search only — guests see the landing page

### Watchlist
- Pin products to a personal watchlist with price tracking
- Infinite scroll — 12 product cards per batch via `IntersectionObserver` (600px prefetch), skeleton cards while appending, filter/sort changes reset to the first batch and scroll to top
- Worker-owned category taxonomy — `POST /api/watchlist` scores the extension's `category_signals` server-side (`workers/lib/category.js`: vetoes → leaf-first weighting → confidence floor → fixed-priority ties, plus fresh-protein confirmation and storage-text signals) and stores the result with `taxonomy_version` (v2); old clients send only a legacy guess (clamped, version 0, with a product-name fallback when the guess is missing/`Other`). Tests: `pnpm test`
- Dedicated filter bar: store + category multi-select and sort (mobile "Filters" pill)
- Live trial-usage banner (X of 5 items + progress bar)

### Auth & Accounts
- JWT + Google OAuth + username/password auth
- Guest landing page — signed-out visitors get a marketing landing at `/` (hero, features, how-it-works, gated Search/Watchlist links → `/auth`); Search, Watchlist, deals, and autocomplete all require sign-in (`src/components/LandingPage.tsx`, conditional `/` route in `App.tsx`, plan in `LANDING.md`)
- Self-service password recovery (no-email reset-token flow)
- Profile editing (username + email, gated by current password; Google OAuth users read-only; usernames normalized to first-letter-capitalized, restricted to letters + numbers, 4–30 chars; passwords restricted to letters, numbers, dots and underscores, 8–128 chars with a letter and a number)
- Trial gating — 24h / 5 watchlist items, enforced server-side
- Rate-limited auth endpoints (login, register, Google OAuth, trial, register-admin, me, forgot/reset)
- Extension SSO — website broadcasts token to extension via postMessage on login/logout, eliminating double sign-in

### Alerts & Cron
- Price alerts and offer-expiry notifications via bell icon
- Cron offer-expiry check (6am UTC)

### Admin
- Dashboard, user management, audit logs (card-based, filterable by action type), trials
- Admin-only route guard (non-admins get a 403 page, never the admin shell); DESIGN-matched 404 page for unknown routes plus an error boundary for unexpected failures

### UI
- Dark/light mode (light default, toggle in nav for guests / user menu when signed in), mobile responsive

**Browser Extension:** Chrome extension that extracts product data from store pages and adds to Sift watchlist. Separate repo: [sift-extension](https://github.com/Alex-Projects-Master/sift-extension)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript + Vite + Tailwind v4 |
| Backend | Cloudflare Workers + D1 (SQLite) |
| Search | Client-side redirect (no backend search) |
| Auth | Custom JWT + Google OAuth + username/password login/register, password recovery (no-email reset-token flow) |
| Autocomplete | Local UK product dictionary + Fuse.js (client-side) |
| Extension | WXT (Chrome MV3) — [sift-extension](https://github.com/Alex-Projects-Master/sift-extension) |
| CI/CD | GitHub Actions + pnpm 11 |

## Getting Started

```bash
pnpm install
pnpm run dev
```

Prerequisites: Node.js 24+, pnpm 11+, Cloudflare account

## Build & Deploy

```bash
pnpm run build  # output → dist/
pnpm test       # worker category scorer + input validators (node --test, no framework)
```

**Automatic:** Push to `main` triggers GitHub Actions (audit → lint → build → deploy Worker + D1 migrations + Pages). PRs do **not** deploy.
**Manual:**
```bash
pnpm exec wrangler pages deploy dist --project-name=siftsearch
pnpm exec wrangler deploy --config workers/wrangler.toml
```

Required secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

**CSP:** production gets a real Content-Security-Policy header via `public/_headers` (enforced by Pages, includes `frame-ancestors`/`form-action`) plus a matching build-time meta from `vite.config.ts` (`cspMeta()`) — keep both in sync; the dev server omits it so HMR keeps working.

## Database

Schema: `workers/schema.sql` — 6 tables (users, rate_limits, watchlist, alerts, audit_logs, password_resets).

Migrations live in `workers/migrations/` (`migrations_dir` set in `workers/wrangler.toml`) and auto-apply on push via the "Apply D1 migrations" CI step:
- `0001_offer_deal` — `offer_deal` column
- `0002_password_resets` — password reset tokens
- `0003_watchlist_unique` — `UNIQUE(user_id, product_id)` index
- `0004_password_reset_lookup` — `token_sha256` column + index (O(1) reset lookup)
- `0005_alert_types` — widen `alerts.type` CHECK to `('price_drop','offer_expiry','offer_created')` (matches `src/types/index.ts`; table rebuild)
- `0006_watchlist_taxonomy` — `taxonomy_version` column (0 = legacy client guess, 1 = v1 worker score, 2 = v2 worker score with protein confirmation + storage signals)
- `0007_rate_limits` — `rate_limits` table + `reset_at` index (previously created inline per request; pruned by the daily cron)

```bash
pnpm exec wrangler d1 create sift
pnpm exec wrangler d1 execute sift --remote --file=workers/schema.sql
pnpm exec wrangler d1 migrations apply sift --remote  # apply pending migrations
```

Update `database_id` in `workers/wrangler.toml`.

## API Keys

```bash
pnpm exec wrangler secret put ADMIN_SECRET    # Admin registration
pnpm exec wrangler secret put JWT_SECRET      # JWT signing
pnpm exec wrangler secret put GOOGLE_CLIENT_ID  # Google OAuth (Worker)
```

### Google OAuth — frontend env var

The frontend reads the Google Client ID from `VITE_GOOGLE_CLIENT_ID` (Vite build-time env). Set it in two places:

- **Local dev:** create `.env` (gitignored) with `VITE_GOOGLE_CLIENT_ID=your-client-id`
- **Production:** Cloudflare Pages → siftsearch → Settings → Environment variables → add `VITE_GOOGLE_CLIENT_ID` (Production branch), then redeploy

This must match the value set via `wrangler secret put GOOGLE_CLIENT_ID` for the Worker.

### API base — optional frontend env var

The frontend targets the Worker via `VITE_API_BASE` (`src/lib/api.ts`), defaulting to
production (`https://siftapi.blackmesa.workers.dev`). Set `VITE_API_BASE=http://localhost:5173`
in `.env` for local dev. Production builds keep the pinned prod host in CSP
(`public/_headers` + `vite.config.ts`), so this override is dev-time only.

## Search Flow

1. Select up to 3 stores via multi-select dropdown (persisted in localStorage; starts empty on first visit — search stays disabled until at least one store is picked)
2. Type query → autocomplete from local UK grocery dictionary (dairy, bakery, cupboard, frozen, meat/fish, produce, drinks) + all users' watchlist items (Fuse.js, debounced 150ms). Combobox with full keyboard support (ArrowUp/Down to highlight, Enter to pick, Escape to close); zero-hit queries show a "press Enter to search anyway" hint
3. Press enter → opens each selected store's search URL in new tab (Search disabled until a query is entered **and** at least one store is selected)
4. Deals of the Day → horizontal scroll of random de-duplicated on-offer items from all users' watchlists; signed-in tiles carry an Add to Watchlist button (greyed out for trial users at the 5-item limit; spinner → green "Added" → greyed-out "Added" on success), on Search only (guests land on the landing page)
5. No backend search involved

## Product Tracking

- Watchlist for pinned products
- Multi-buy deal terms are captured (`offer_deal`, e.g. "Any 3 for £12"). A product whose only offer is a multi-buy deal (no loyalty price / no expiry) stores `is_on_offer = 1` and shows its normal price with the multi-buy term in a store-coloured loyalty pill (`.product-card-loyalty-label`, tinted by store) in Deals of the Day and on the watchlist card. Non-multi-buy items show the store loyalty label ("Clubcard price" etc) in the same pill. Deal text is cleaned at source by the extension before storage; the pill truncates overflow with ellipsis and shows full text on hover.
- CSV export (Settings) includes an `Offer Deal` column (formula-injection safe: trigger-led cells get a `'` prefix)
- Trial users: max 5 watchlist items — watchlist page shows a live "X of 5" usage banner with progress bar; Deals of the Day Add buttons disable at the limit. Expired trials are blocked server-side on `POST /api/watchlist` (403 `trial_expired`), and the unique `(user_id, product_id)` index (migration `0003`) prevents duplicate pins under concurrent requests
- Cron: daily 6am UTC — for every watchlist item past its offer expiry, marks `is_on_offer = 0` and creates a deduplicated "offer ended" alert (no price refresh, no per-user/total caps)

## Project Structure

```
src/              React SPA (components, contexts, hooks, lib, types)
workers/          Cloudflare Worker API (index.js, auth.js, db.js, lib/category.js + lib/validate.js, schema.sql, seed.sql, migrations/)
public/           Store logo SVGs + favicon.svg + theme-init.js (dark-mode flash prevention)
```

## License

MIT

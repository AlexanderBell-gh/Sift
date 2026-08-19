# Sift

A UK supermarket offer tracker. Select up to 3 stores, search opens each store's results page in a new tab.

**Live:** https://siftsearch.pages.dev

## Features

11-store multi-select search (Tesco, Sainsbury's, ASDA, Morrisons, M&S, Aldi, Lidl, Co-op, Waitrose, Iceland, Ocado) with store-aware query redirect, local autocomplete via UK product dictionary, deals of the day section (random de-duplicated on-offer items from all users' watchlists, with an Add to Watchlist button per tile that greys out at the trial limit), filterable watchlist (dedicated filter bar under the nav: store + category multi-select and sort, with a mobile "Filters" pill), price tracking, a live trial-usage banner (X of 5 items + progress bar), price alerts, cron offer-expiry check (6am UTC), admin panel (dashboard, user management, audit console, trials), trial gating (24h/5 watchlist items, enforced server-side), rate-limited auth endpoints (login/trial/register-admin/forgot/reset), JWT + Google OAuth + username/password auth with self-service password recovery (no-email reset-token flow), dark/light mode, mobile responsive.

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

Prerequisites: Node.js 24+, pnpm 11+, Cloudflare account.

## Build & Deploy

```bash
pnpm run build  # output → dist/
```

**Automatic:** Push to `main` triggers GitHub Actions (lint → build → deploy Worker + D1 migrations + Pages). PRs do **not** deploy.
**Manual:**
```bash
pnpm exec wrangler pages deploy dist --project-name=siftsearch
pnpm exec wrangler deploy --config workers/wrangler.toml
```

Required secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

**CSP:** production builds get a strict Content-Security-Policy meta injected by `vite.config.ts` (`cspMeta()`); the dev server omits it so HMR keeps working.

## Database

Schema: `workers/schema.sql` — 6 tables (users, rate_limits, watchlist, alerts, audit_logs, password_resets).

Migrations live in `workers/migrations/` (`migrations_dir` set in `workers/wrangler.toml`) and auto-apply on push via the "Apply D1 migrations" CI step:
- `0001_offer_deal` — `offer_deal` column
- `0002_password_resets` — password reset tokens
- `0003_watchlist_unique` — `UNIQUE(user_id, product_id)` index
- `0004_password_reset_lookup` — `token_sha256` column + index (O(1) reset lookup)
- `0005_alert_types` — widen `alerts.type` CHECK to `('price_drop','offer_expiry','offer_created')` (matches `src/types/index.ts`; table rebuild)

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

## Search Flow

1. Select up to 3 stores via multi-select dropdown (persisted in localStorage)
2. Type query → autocomplete from local UK product dictionary + all users' watchlist items (Fuse.js, debounced 150ms)
3. Press enter → opens each selected store's search URL in new tab
4. Deals of the Day → horizontal scroll of random de-duplicated on-offer items from all users' watchlists, each tile has an Add to Watchlist button (greyed out for trial users at the 5-item limit)
5. No backend search involved

## Product Tracking

- Watchlist for pinned products
- Multi-buy deal terms are captured (`offer_deal`, e.g. "Any 3 for £12"). A product whose only offer is a multi-buy deal (no loyalty price / no expiry) stores `is_on_offer = 1` and shows its normal price with the multi-buy term in a store-coloured loyalty pill (`.product-card-loyalty-label`, tinted by store) in Deals of the Day and on the watchlist card. Non-multi-buy items show the store loyalty label ("Clubcard price" etc) in the same pill. The deal term is trimmed of a trailing `- Selected <X> Products` boilerplate suffix for display.
- CSV export (Settings) includes an `Offer Deal` column
- Trial users: max 5 watchlist items — watchlist page shows a live "X of 5" usage banner with progress bar; Deals of the Day Add buttons disable at the limit. Expired trials are blocked server-side on `POST /api/watchlist` (403 `trial_expired`), and the unique `(user_id, product_id)` index (migration `0003`) prevents duplicate pins under concurrent requests
- Cron: daily 6am UTC — for every watchlist item past its offer expiry, marks `is_on_offer = 0` and creates a deduplicated "offer ended" alert (no price refresh, no per-user/total caps)

## Project Structure

```
src/              React SPA (components, contexts, hooks, lib, types)
workers/          Cloudflare Worker API (index.js, auth.js, db.js, schema.sql, seed.sql, migrations/)
public/           Store logo SVGs + favicon.svg + theme-init.js (dark-mode flash prevention)
```

## License

MIT

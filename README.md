# Sift

Real-time UK supermarket price comparison. Search 7 stores, pin products to watchlist.

**Live:** http://siftsearch.pages.dev
**API:** https://siftapi.blackmesa.workers.dev

## Features

7-store search (Tesco, Sainsbury's, ASDA, Morrisons, M&S, Aldi, Lidl) with store-aware query parsing, product-only result filtering (no recipes/articles), autocomplete with product name suggestions, dual pricing (normal vs loyalty), unit price comparison, product categories, watchlist with price tracking, price alerts, cron auto-refresh (6am UTC), admin panel (dashboard, user management, audit console, trials), trial gating (24h/5 searches), JWT + Google OAuth, dark/light mode, mobile responsive (hamburger nav, responsive typography, adaptive grids).

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript + Vite + Tailwind v4 |
| Backend | Cloudflare Workers + D1 (SQLite) |
| Search | (removed) |
| Auth | Custom JWT + Google OAuth |
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

**Automatic:** Push to `main` triggers GitHub Actions.  
**Manual:**
```bash
pnpm exec wrangler pages deploy dist --project-name=sift
pnpm exec wrangler deploy --config workers/wrangler.toml
```

Required secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

## Database

Schema: `workers/schema.sql` — 7 tables (users, rate_limits, search_cache, watchlist, price_history, alerts, audit_logs).

```bash
pnpm exec wrangler d1 create sift
pnpm exec wrangler d1 execute sift --remote --file=workers/schema.sql
```

Update `database_id` in `workers/wrangler.toml`.

## API Keys

```bash
pnpm exec wrangler secret put ADMIN_SECRET    # Admin registration
pnpm exec wrangler secret put JWT_SECRET      # JWT signing
pnpm exec wrangler secret put GOOGLE_CLIENT_ID  # Google OAuth
```

## Search Flow

1. `GET /api/search?q=butter` → auth check → trial check
2. D1 cache hit? Return cached. Miss? → empty results (search backend removed)
3. Return results

## Price Refresh

1. `POST /api/watchlist/:id/refresh` → re-search single store
2. Snapshot old prices to `price_history`
3. Update watchlist image, create alert on price drop

## Cron

Daily 6am UTC: max 10 items/user, 100 total, 500ms delay, skip if updated <6h, 3 failures → skip user.

## Project Structure

```
src/              React SPA (components, contexts, hooks, lib, types)
workers/          Cloudflare Worker API (index.js, auth.js, db.js, schema.sql)
public/           Store logo PNGs + favicon.svg
markdowns/        Design system, project context, changelog, fixes
```

## License

MIT

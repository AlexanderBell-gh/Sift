# Sift

Real-time UK supermarket price comparison. Search 7 stores, AI-enriches results, pin products to watchlist.

**Live:** https://sift-a5w.pages.dev  
**API:** https://siftapi.inbox-alexbell.workers.dev

## Features

7-store search (Tesco, Sainsbury's, ASDA, Morrisons, Aldi, Lidl, Waitrose), AI price enrichment (Gemma 4), dual pricing (normal vs loyalty), unit price comparison, watchlist with price tracking, price alerts, cron auto-refresh (6am UTC), admin panel (dashboard, user management, audit console, trials), trial gating (24h/5 searches), JWT auth, dark/light mode, mobile responsive (hamburger nav, responsive typography, adaptive grids).

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript + Vite + Tailwind v4 |
| Backend | Cloudflare Workers + D1 (SQLite) |
| Search | SearXNG (self-hosted) |
| AI | Google AI Studio (Gemma 4) |
| Auth | Custom JWT |
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
pnpm exec wrangler secret put SEARXNG_URL    # SearXNG instance URL
pnpm exec wrangler secret put GEMMA_API_KEY   # AI enrichment
pnpm exec wrangler secret put ADMIN_SECRET    # Admin registration
pnpm exec wrangler secret put JWT_SECRET      # JWT signing
```

## Search Flow

1. `GET /api/search?q=butter` → auth check → trial check
2. D1 cache hit? Return cached. Miss? → SearXNG per store
3. Gemma 4 enriches snippets (prices, units, offers)
4. Increment trial search count, return results

## Price Refresh

1. `POST /api/watchlist/:id/refresh` → re-search single store
2. Gemma matches product → snapshot old prices to `price_history`
3. Update watchlist, create alert on price drop

## Cron

Daily 6am UTC: max 10 items/user, 100 total, 500ms delay, skip if updated <6h, 3 failures → skip user.

## Project Structure

```
src/              React SPA (components, contexts, hooks, lib, types)
workers/          Cloudflare Worker API (index.js, auth.js, db.js, schema.sql)
public/           Store logo SVGs
DESIGN.md         Design system
```

## License

MIT

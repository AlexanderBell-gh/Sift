# Sift

Real-time UK supermarket offer tracker. Select up to 3 stores, search opens each store's results page in a new tab.

**Live:** https://siftsearch.pages.dev

## Features

11-store multi-select search (Tesco, Sainsbury's, ASDA, Morrisons, M&S, Aldi, Lidl, Co-op, Waitrose, Iceland, Ocado) with store-aware query redirect, local autocomplete via UK product dictionary, store offers horizontal scroll (links to each store's offers page), watchlist with price tracking, price alerts, cron offer-expiry check (6am UTC), admin panel (dashboard, user management, audit console, trials), trial gating (24h/5 watchlist items), JWT + Google OAuth, dark/light mode, mobile responsive.

**Browser Extension:** Chrome extension that extracts product data from store pages and adds to Sift watchlist. Separate repo: [sift-extension](https://github.com/Alex-Projects-Master/sift-extension)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript + Vite + Tailwind v4 |
| Backend | Cloudflare Workers + D1 (SQLite) |
| Search | Client-side redirect (no backend search) |
| Auth | Custom JWT + Google OAuth |
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

**Automatic:** Push to `main` triggers GitHub Actions.
**Manual:**
```bash
pnpm exec wrangler pages deploy dist --project-name=siftsearch
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
4. Browse Store Offers → horizontal scroll cards link to each store's offers page
5. No backend search involved

## Product Tracking

- Watchlist with price tracking and refresh
- Trial users: max 5 watchlist items
- Cron: daily 6am UTC, max 10 items/user, 100 total, 500ms delay

## Project Structure

```
src/              React SPA (components, contexts, hooks, lib, types)
workers/          Cloudflare Worker API (index.js, auth.js, db.js, schema.sql)
public/           Store logo SVGs + favicon.svg
markdowns/        Design system, project context, changelog, fixes
```

## License

MIT

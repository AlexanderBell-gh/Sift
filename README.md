<p align="center">
  <img src="./public/favicon.svg" width="96" alt="Sift logo" />
</p>

<h1 align="center">Sift</h1>

<p align="center"><strong>All your groceries. One place.</strong></p>

<p align="center">
  <a href="https://siftsearch.pages.dev"><strong>Live: siftsearch.pages.dev</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Cloudflare-Workers_%2B_D1-F38020?logo=cloudflare&logoColor=white" alt="Cloudflare Workers + D1" />
  <img src="https://img.shields.io/badge/pnpm-11-F69220?logo=pnpm&logoColor=white" alt="pnpm 11" />
  <img src="https://img.shields.io/badge/License-MIT-16A34A" alt="MIT license" />
</p>

<!-- Screenshots (pending real captures): Search hero, Watchlist grid, Shopping list per-store totals -->

UK supermarket grocery tracker. Pick up to 3 stores, search once, pin products to a watchlist, and shop them from one multibuy-aware list.

## Features

### Search & Deals
- 11-store search (Tesco, Sainsbury's, ASDA, Morrisons, M&S, Aldi, Lidl, Co-op, Waitrose, Iceland, Ocado) — query opens each store's results in a new tab, bottom-sheet store picker on mobile
- Local autocomplete from a ~1,600-item UK grocery dictionary with fuzzy matching, plus your own watchlist items; full keyboard support
- Deals of the Day — de-duplicated on-offer items with one-tap Add to Watchlist (spinner → green Added → pinned)

### Watchlist
- Pin any product, on offer or not; infinite scroll (12 per batch, skeletons while appending)
- Status facet inside the Sort & status dropdown: All / On offer / Not on offer / Expired, with counts — combinable with price sorting
- Worker-owned category taxonomy scores every pin server-side (preview + admin rescore tools)
- Live trial banner (X of 5 items + progress bar)

### Shopping List
- Quantities against watchlist items at `/list`, priced live from tracked prices
- Multibuy-aware totals — parses free-text deal terms (`Any 3 for £12`, `3 for 2`, `BOGOF`) into set pricing, pools same-tag sets across lines
- Per-store subtotals with savings vs shelf, grand total, qty steppers, two-tap clear-all

### Alerts
- Single-fire offer-expiry alerts via the bell (mark-all-read, swipe-to-dismiss, bottom sheet on mobile)
- Tap an alert to jump straight to the item on your watchlist

### Auth & Accounts
- JWT + Google OAuth + username/password, guest landing page, self-service password recovery
- Trial gating — 24h / 5 watchlist items, enforced server-side; rate-limited auth endpoints
- Extension SSO — website hands its token to the Chrome extension, no double sign-in

### Admin & Mobile
- Dashboard, user management, audit logs, trial management behind an admin-only guard (403 + 404 pages, error boundary)
- Dark/light mode, mobile bottom tab bar (≤640px, signed-in), body scroll-lock under bottom sheets

**Browser Extension:** extracts product data from store pages into your watchlist. Separate repo: [sift-extension](https://github.com/Alex-Projects-Master/sift-extension)

## Quickstart

```bash
pnpm install
pnpm run dev          # Vite on :5173
```

Prerequisites: Node.js 24+, pnpm 11+, Cloudflare account. Local dev needs `VITE_GOOGLE_CLIENT_ID` in `.env` (gitignored — see `.env.example`); it must match the Worker's `GOOGLE_CLIENT_ID` secret.

## Commands

| Command | What it does |
|---------|--------------|
| `pnpm run dev` | Vite dev server (no CSP, HMR works) |
| `pnpm run build` | `tsc -b` then `vite build` → `dist/` |
| `pnpm run lint` | ESLint over `src/` |
| `pnpm test` | Worker unit tests — `node --test workers/lib/*.test.js`, zero-dep |
| `pnpm audit --audit-level=high` | Dependency audit (CI gate) |

## Deploy

**Automatic:** push to `main` → GitHub Actions (audit → lint → build → deploy Worker + D1 migrations + Pages). PRs do **not** deploy.

**Manual:**
```bash
pnpm exec wrangler pages deploy dist --project-name=siftsearch
pnpm exec wrangler deploy --config workers/wrangler.toml
```

Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, plus Worker secrets `ADMIN_SECRET`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`. Production also needs `VITE_GOOGLE_CLIENT_ID` set in Pages → Settings → Environment variables.

**CSP:** real header via `public/_headers` + matching build-time meta from `vite.config.ts` — keep both in sync; dev omits it for HMR.

<details>
<summary><strong>Database & migrations</strong></summary>

Schema: `workers/schema.sql` — 7 tables (users, rate_limits, watchlist, shopping_list, alerts, audit_logs, password_resets). Migrations in `workers/migrations/` auto-apply on push:

- `0001_offer_deal` — `offer_deal` column
- `0002_password_resets` — reset tokens
- `0003_watchlist_unique` — `UNIQUE(user_id, product_id)` index
- `0004_password_reset_lookup` — `token_sha256` column + index
- `0005_alert_types` — `alerts.type` widened to `price_drop` / `offer_expiry` / `offer_created`
- `0006_watchlist_taxonomy` — `taxonomy_version` column
- `0007_rate_limits` — `rate_limits` table (pruned by the daily cron)
- `0008_shopping_list` — `shopping_list` table for `/list`

```bash
pnpm exec wrangler d1 execute sift --remote --file=workers/schema.sql
pnpm exec wrangler d1 migrations apply sift --remote
```

</details>

<details>
<summary><strong>Category taxonomy</strong></summary>

`workers/lib/category.js` owns the 8-category taxonomy (Chilled, Snacks, Beverages, Produce, Frozen, Bakery, Food Cupboard, Other). Pipeline: vetoes → leaf-first weighting → confidence floor → fixed-priority ties, plus fresh-protein confirmation and storage-text signals. v3 vocab is title-first and singular-only (plural folding double-counted ties); the frozen veto reads leaf/JSON-LD only and `do not refreeze` is treated as freezable-at-home copy. Preview via `POST /api/category/score`, bulk upgrades via `POST /api/admin/watchlist/rescore` (dry-run default), health on the admin dashboard.

</details>

<details>
<summary><strong>How it works</strong></summary>

1. Select up to 3 stores (persisted locally; search stays disabled until one is picked)
2. Type → autocomplete suggests from the grocery dictionary and your watchlist (debounced, keyboard navigable)
3. Enter → each store's results open in a new tab; pin what you like via the extension or Deals of the Day
4. Watchlist tracks prices and offer dates; the 6am UTC cron flips past-expiry rows off-offer and fires one alert each
5. Shopping list turns pins into per-store totals with multibuy sets applied

Offer notes: a product whose only offer is a multi-buy term (no loyalty price/expiry) stores `is_on_offer = 1` and shows its normal price with the term in a store-coloured pill. CSV export (Settings) is formula-injection safe. Usernames: letters + numbers, 4–30 chars; passwords: letters, numbers, dots, underscores, 8–128 chars with a letter and a number.

</details>

## Project Structure

```
src/              React SPA (components, contexts, hooks, lib, types)
workers/          Cloudflare Worker API (index.js, auth.js, db.js, lib/, schema.sql, migrations/)
public/           Store logo SVGs + favicon.svg + theme-init.js + _headers
```

## License

MIT

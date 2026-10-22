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
  <img src="https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Cloudflare-Workers_%2B_D1-F38020?logo=cloudflare&logoColor=white" alt="Cloudflare Workers + D1" />
  <img src="https://img.shields.io/badge/pnpm-12-F69220?logo=pnpm&logoColor=white" alt="pnpm 12" />
  <img src="https://img.shields.io/badge/License-MIT-16A34A" alt="MIT license" />
</p>

<!-- Screenshots (pending real captures): Search hero, Watchlist grid, Shopping list per-store totals -->

UK supermarket grocery tracker. Pick up to 3 stores, search once, pin products to a watchlist, and shop them from one multibuy-aware list.

## Features

### Search & Deals
- 11-store search (Tesco, Sainsbury's, ASDA, Morrisons, M&S, Aldi, Lidl, Co-op, Waitrose, Iceland, Ocado) — query opens each store's results in a new tab; on mobile a slide-up sheet carries the store picker, baked-in Search, recent searches and suggestions
- Local autocomplete from the bundled UK grocery dictionary in `src/data/uk-*.json`, with fuzzy matching, plus a shared catalog of every product ever pinned — names persist even after the item leaves your watchlist; full keyboard support
- Offers carousels — live on-offer items plus Popular right now (all pinned products ranked by pin count, `n pins` badge) in two snap rows with square tiles and one-tap Pin to watchlist (spinner → green Added → pinned); each row shows 8 + a Show-all tile opening the full list on the dedicated `/offers` page (12 per batch with skeletons, view + store dropdowns + product search in a filter bar, trial limit shared)

### Watchlist
- Pin any product, on offer or not; infinite scroll (12 per batch, skeletons while appending)
- Removal stages inline with Undo (no timer); deletion commits on filter change or page leave
- Status facet inside the Sort & status dropdown: All / Offers / Regular Price / Expired, with counts — combinable with price sorting; All keeps insertion order (newest first)
- Worker-owned category taxonomy scores every pin server-side at add time
- Live trial banner (X of 5 items + progress bar)

### Shopping List
- Quantities against watchlist items at `/list`, priced live from tracked prices
- Multibuy-aware totals — parses free-text deal terms (`Any 3 for £12`, `3 for 2`, `BOGOF`) into set pricing, pools same-tag sets across lines
- Per-store subtotals with savings vs shelf, grand total, qty steppers, two-tap clear-all

### Alerts
- Single-fire offer-expiry alerts via the bell (mark-all-read, swipe-to-dismiss, bottom sheet on mobile)
- Tap an alert to jump straight to the item on your watchlist (filters clear, tile highlighted in the Expired tab)

### Auth & Accounts
- JWT + Google OAuth + username/password, guest landing page, self-service password recovery
- Trial gating — 24h / 5 watchlist items, enforced server-side; rate-limited auth endpoints
- Google accounts sign in without a password — Settings greys out Change Password, locks email, and allows username edits; username changes are limited to one per 20 minutes per user (email changes one per day)
- Extension SSO — website hands its token to the Chrome extension, no double sign-in
- Privacy, terms, cookie, about, and license pages (`/privacy`, `/terms`, `/cookies`, `/about`, `/license`) linked from the landing footer, which also re-opens the cookie notice via Cookie settings

### Admin & Mobile
- Dashboard, user management, audit logs, trial management behind an admin-only guard (403 + 404 pages, error boundary)
- Dark/light mode, mobile bottom tab bar (≤640px, signed-in), body scroll-lock under bottom sheets

**Browser Extension:** extracts product data from store pages into your watchlist. Separate repo: [sift-extension](https://github.com/Alex-Projects-Master/sift-extension)

## Quickstart

```bash
pnpm sift install
pnpm sift dev          # Vite on :5173
```

Prerequisites: Node.js 24+, pnpm 12+, Cloudflare account. Local dev needs `VITE_GOOGLE_CLIENT_ID` in `.env` (gitignored — see `.env.example`); it must match the Worker's `GOOGLE_CLIENT_ID` secret.

## Commands

| Command | What it does |
|---------|--------------|
| `pnpm sift dev` | Vite dev server (no CSP, HMR works) |
| `pnpm sift build` | `tsc -b` then `vite build` → `dist/` |
| `pnpm sift lint` | Oxlint over the repo (`.oxlintrc.json`) |
| `pnpm sift test [file]` | Pure-logic unit tests — `node --test workers/lib/*.test.js src/lib/*.test.ts`, zero-dep |
| `pnpm sift eval` | Category eval — fit corpus, holdout and live prod suites, gated on per-category accuracy |
| `pnpm sift audit` | Dependency audit, `--audit-level=high` (CI gate) |
| `pnpm sift preview` | Serve `dist/` locally via vite preview |
| `pnpm sift --help` | Full CLI: run steps, doctor, gate, eval, db, category, admin, watchlist reads |

Build code-splits for first paint: the guest landing chunk stays eager while all other routes lazy-load, with React vendored into its own cached chunk.

**CLI:** all commands run through `pnpm sift` (extra args forwarded, e.g. `pnpm sift test workers/lib/resolve.test.js`). `doctor` checks toolchain/env/wrangler auth/secrets/D1; `gate` mirrors CI locally (audit → lint → build → test → eval, and CI calls the same CLI steps). `db migrate|status|query|users|wipe-watchlist` wraps wrangler D1; `category set|clear|list` manages manual category overrides and `category learn [--remote]` prints vocabulary candidates from harvested labels; `admin stats|users|trials|audit|trials-cleanup|user-role|user-delete|resolve` and `watchlist names|offers` wrap the admin API. Admin commands need `SIFT_ADMIN_USER` + `SIFT_ADMIN_PASS` in env (never commit); API defaults to production (`SIFT_API_BASE` overrides). Remote writes need both `--remote --yes` (db) or `--yes` (admin); reads are always allowed. The CLI never deploys — pushes to `main` do that.

## Deploy

**Automatic:** push to `main` → GitHub Actions (audit → lint → test → eval → build → D1 migrations → deploy Worker → deploy Pages, all via `pnpm sift`). PRs do **not** deploy.

**Manual:**
```bash
pnpm exec wrangler pages deploy dist --project-name=siftsearch
pnpm exec wrangler deploy --config workers/wrangler.toml
```

Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, plus Worker secrets `ADMIN_SECRET`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`. Production also needs `VITE_GOOGLE_CLIENT_ID` set in Pages → Settings → Environment variables.

**CSP:** real header via `public/_headers` + matching build-time meta from `vite.config.ts` — keep both in sync; dev omits it for HMR.

<details>
<summary><strong>Database & migrations</strong></summary>

Schema: `workers/schema.sql` — 8 tables (users, rate_limits, watchlist, shopping_list, alerts, audit_logs, password_resets, product_catalog). `product_catalog` is the persistent pool of pinned product names that feeds search autocomplete, holds the manual category override, and logs the harvest labels (`leaf`, `department`, `category_reason`) for `pnpm sift category learn`. Migrations in `workers/migrations/` auto-apply on push to `main`, before the worker deploy:

- `0001_init` — the full schema; builds a database from scratch

The database was rebuilt from empty on 22-10-2026 and the old `0001`–`0009` chain plus `0002_catalog_category` was squashed into `0001_init.sql`. `schema.sql` is the human reference; the two files are identical. Adding a migration: give it the next number and never edit a file a live database has recorded (wrangler tracks migrations by name, so an edit never re-runs) — a migration may only be folded while it is unapplied everywhere.

```bash
# Fresh database: migrations are the only setup step.
pnpm exec wrangler d1 migrations apply sift --remote

# Clean slate for watchlist-derived data (users, catalog and logs survive).
# D1 enforces no cascades; the command deletes shopping_list -> alerts -> watchlist.
pnpm sift db wipe-watchlist --remote --yes
```

`schema.sql` is reference only. Do not execute it before migrations: `0001_init.sql`
already creates every table, so the two would collide.


</details>

<details>
<summary><strong>Category taxonomy</strong></summary>

`workers/lib/category.js` owns the 8-category taxonomy (Chilled, Snacks, Beverages, Produce, Frozen, Bakery, Food Cupboard, Other). It is title-first: the same title scores the same shelf at every store, and a client that sends nothing but a name still gets the right answer.

Eight rules, first hit wins: manual override → non-food → frozen → ambient (a tin or a jar is a cupboard good, unless the title describes a loaf) → leaf map → department → title vote → `Other`. The department rule reads breadcrumbs deepest-first and maps all eight shelves plus store aliases (`Bakery & Cakes`, `Fruit & Veg`, `Crisps & Snacks`, …); non-food, frozen and ambient still beat it, and the leaf map is more specific. The title vote matches the longest known product name in the title first and masks its own tokens (`peanut butter` never also votes `butter`), then falls back to a keyword tier. Flavour words vote weakly: `apple & cinnamon granola` is a cereal, not a fruit, and a curated weak word outranks a corpus-derived strong hit. Ties resolve by a fixed priority.

The vocabulary is data, not code. `workers/lib/category.lexicon.js` holds one `VOCABULARY` table — key → `{ category, strength }`, where strength is `phrase`, `strong`, `weak` or `stop` — and `workers/lib/category.phrases.js` is generated from the offline product corpus in `src/data/uk-*.json`. `pnpm sift eval` runs three suites — the fit corpus, a holdout scored by the keyword tier alone (curated names stay in the lexicon but are excluded from scoring, so a hand rule cannot read as a keyword-tier hit), and the products pinned in prod before the wipe, hand-labelled by shelf (live) — and fails below the per-category accuracy floor. `pnpm sift category set "<product name>" <category>` is the escape hatch: a manual override that wins over every rule. `pnpm sift category learn` reads the labels the worker writes to `product_catalog` and prints copy-pasteable lexicon lines; proposing is automatic, committing is human and eval-gated, and nothing is learned while scoring.

Scoring runs inline on watchlist add. Coverage is locked by `workers/lib/category.test.js` (curated cases) plus the three eval suites.

</details>

<details>
<summary><strong>How it works</strong></summary>

1. Select up to 3 stores (persisted locally; search stays disabled until one is picked)
2. Type → autocomplete suggests from the grocery dictionary and the shared pin catalog (debounced, keyboard navigable)
3. Enter → each store's results open in a new tab; pin what you like via the extension or the Offers carousels
4. Watchlist tracks prices and offer dates; the 6am UTC cron flips past-expiry rows off-offer and fires one alert each
5. Shopping list turns pins into per-store totals with multibuy sets applied

Offer notes: a product whose only offer is a multi-buy term (no loyalty price/expiry) stores `is_on_offer = 1` and shows its normal price with the term in a store-coloured pill. CSV export (Settings) is formula-injection safe. Usernames: letters + numbers, 4–30 chars; passwords: letters, numbers, dots, underscores, 8–128 chars with a letter and a number.

</details>

## Project Structure

```
src/              React SPA (components/{pages,layout,features,ui,guards}, contexts, hooks, lib, types)
workers/          Cloudflare Worker API (index.js, auth.js, db.js, lib/, schema.sql, migrations/)
public/           Store logo PNGs (+ landing/ wordmarks) + favicon.svg + theme-init.js + _headers
```

## License

MIT

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

UK supermarket grocery tracker. Pick up to 3 stores, search once, pin products
to a watchlist, and shop them from one multibuy-aware list.

## Features

**Search & deals.** One query opens results on up to 11 stores (Tesco,
Sainsbury's, ASDA, Morrisons, M&S, Aldi, Lidl, Co-op, Waitrose, Iceland, Ocado).
Autocomplete comes from the bundled UK grocery dictionary plus a shared catalog
of every product ever pinned — names persist after an item leaves the watchlist.
Two snap carousels sit under the hero: live offers and Popular right now (all
pinned products ranked by pin count, `n pins` badge), each 8 tiles + Show-all
into the full `/offers` page (plus a header `View all`), with view, store and
product filters.

**Watchlist.** Pin anything, on offer or not. 12 per batch with skeletons, a
Sort & status facet (All / Offers / Regular Price / Expired, combinable, with
counts), hold-to-remove that stages an inline Undo, and a Select mode that
batch-removes with the same per-card Undo. Categories are assigned by the
worker at add time: D1 memory → Workers AI → safe fallback.

**Shopping list.** Quantities against watchlist items at `/list`, priced live
from tracked prices. Free-text deal terms (`Any 3 for £12`, `3 for 2`, `BOGOF`,
`5 for £5 or 10 for £9`) become set pricing, pooled across lines that share a
deal; a quantity takes the cheapest whole tier, never a mix. Per-store
subtotals, savings vs shelf, grand total, two-tap clear-all.

**Alerts.** The 6am UTC cron flips expired offers off and raises one alert per
transition. Bell with mark-all-read and swipe-dismiss; tapping an alert deep-links
to the exact tile in the Expired tab.

**Auth & accounts.** JWT + Google OAuth + username/password, guest landing,
self-service password recovery. Trial is 24h / 5 items, server-side. Google
accounts sign in without a password — Settings greys out Change Password, locks
email, allows username edits; username changes are limited to one per 20 minutes
per user, email changes to one per day. The website hands its token to the Chrome
extension, so there is no double sign-in. Legal pages at `/privacy`, `/terms`,
`/cookies`, `/about`, `/license`.

**Admin & mobile.** Dashboard, user management, audit logs, trial management
behind an admin guard. Dark/light mode, icon-only bottom tab bar ≤640px, body
scroll-lock under sheets.

**Browser Extension:** extracts product data from store pages into your
watchlist. Separate repo:
[sift-extension](https://github.com/Alex-Projects-Master/sift-extension).

## Quickstart

```bash
pnpm sift install
pnpm sift dev          # Vite on :5173
```

Node 24+, pnpm 12+, a Cloudflare account. Local dev needs
`VITE_GOOGLE_CLIENT_ID` in `.env` (gitignored, see `.env.example`); it must match
the Worker's `GOOGLE_CLIENT_ID` secret.

## Commands

| Command | What it does |
|---------|--------------|
| `pnpm sift dev` | Vite dev server (no CSP, HMR works) |
| `pnpm sift build` | `tsc -b` then `vite build` → `dist/` |
| `pnpm sift lint` | Oxlint over the repo (`.oxlintrc.json`) |
| `pnpm sift test [file]` | Pure-logic unit tests — `node --test workers/lib/*.test.js src/lib/*.test.ts`, zero-dep |
| `pnpm sift eval` | Category core check — labels, parser, size-stripping, prompt ceiling (offline, no model score) |
| `pnpm sift audit` | Dependency audit, `--audit-level=high` (CI gate) |
| `pnpm sift preview` | Serve `dist/` locally via vite preview |
| `pnpm sift --help` | Full CLI: run steps, doctor, gate, eval, db, category, watchlist reads |

Everything runs through `pnpm sift` (`bin/sift.mjs`), and CI calls the same
steps. Extra args are forwarded — `pnpm sift test workers/lib/resolve.test.js`.
`doctor` checks toolchain, env, wrangler auth, secrets and D1; `gate` mirrors CI
locally (audit → lint → build → test → eval); `outdated` and `up`/`upgrade` wrap
the pnpm equivalents. `db migrate|status|query|users|wipe-watchlist` wraps
wrangler D1; `category set|clear|list` manages the global corrections in
`product_knowledge`; `watchlist names|offers` reads the admin API (needs
`SIFT_ADMIN_USER` + `SIFT_ADMIN_PASS`, never committed; `SIFT_API_BASE`
overrides production). Remote writes need `--remote --yes`, reads do not. The
CLI never deploys.

Build code-splits for first paint: the guest landing stays eager while every
other route lazy-loads, with React in its own cached chunk.

## Deploy

**Automatic:** push to `main` → GitHub Actions (audit → lint → test → eval →
build → D1 migrations → Worker → Pages, all via `pnpm sift`). PRs do **not**
deploy.

**Manual:**

```bash
pnpm exec wrangler pages deploy dist --project-name=siftsearch
pnpm exec wrangler deploy --config workers/wrangler.toml
```

Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, plus Worker secrets
`ADMIN_SECRET`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`. Production also needs
`VITE_GOOGLE_CLIENT_ID` in Pages → Settings → Environment variables.

**CSP:** the real header lives in `public/_headers`, the matching meta tag is
generated by `vite.config.ts` — keep both in sync. Dev omits it for HMR.

<details>
<summary><strong>Database & migrations</strong></summary>

`workers/schema.sql` is the human reference: 9 tables (users, rate_limits,
watchlist, shopping_list, alerts, audit_logs, password_resets, product_catalog,
product_knowledge). `product_catalog` is the pool of pinned product names behind
autocomplete; `product_knowledge` is the global category memory (`id` =
size-stripped title, `source` = `ai` or `user_correction`).

`workers/migrations/0001_sift.sql` is the executable truth and builds a database
from scratch; it auto-applies on push to `main` before the worker deploy. The
database was rebuilt from empty on 24-10-2026 and the old `0001_init.sql` was
replaced (the taxonomy version column and keyword tables are gone). Never edit a
migration a live database has recorded — wrangler tracks migrations by name, so
an edit never re-runs. Adding one: give it the next number and mirror it in
`schema.sql`.

```bash
# Fresh database: migrations are the only setup step.
pnpm exec wrangler d1 migrations apply sift --remote

# Clean slate for watchlist-derived data (users, catalog and logs survive).
# Dependents are deleted first: shopping_list -> alerts -> watchlist.
pnpm sift db wipe-watchlist --remote --yes
```

Do not execute `schema.sql` before migrations: `0001_sift.sql` already creates
every table, so the two would collide.

</details>

<details>
<summary><strong>Category classification</strong></summary>

`workers/lib/category.js` owns the 8-category taxonomy (Chilled, Snacks, Drinks,
Produce, Frozen, Bakery, Food Cupboard, Other). Drinks is ambient only —
temperature splits drinks: fresh milk, fresh juice and chilled drinks are
Chilled; beer, wine, spirits, cola, water and ambient juice are Drinks. Drinks
replaced the old Beverages label.

Classification runs inline on watchlist add, first hit wins: manual CLI
correction → `product_knowledge` memory (same size-stripped title, no AI call,
`hit_count` bumped) → Cloudflare Workers AI
(`@cf/meta/llama-3.1-8b-instruct-fast`, temperature 0, 5s guard, prompt carries
title, brand, shelf crumbs and storage text) → `Other` with `low_confidence`.
Only a valid label is cached; a timeout, model error or unparseable answer is not
cached and is retried on the next add.

`pnpm sift category set "<product name>" <category>` is the escape hatch: it
writes `product_knowledge` with `source='user_correction'` and wins before every
rule; `clear` and `list` complete the set. `pnpm sift eval` checks the offline
core and does not measure the model — watch `source` and the `fallback` share on
real adds for that. Coverage is locked by `workers/lib/category.test.js`.

</details>

<details>
<summary><strong>How it works</strong></summary>

1. Select up to 3 stores (persisted locally; search stays disabled until one is
   picked).
2. Type — autocomplete suggests from the grocery dictionary and the shared pin
   catalog (debounced, keyboard navigable).
3. Enter — each store's results open in a new tab; pin what you like via the
   extension or the offer carousels.
4. The watchlist tracks prices and offer dates; the 6am UTC cron flips
   past-expiry rows off-offer and fires one alert each.
5. The shopping list turns pins into per-store totals with multibuy sets applied.

A product whose only offer is a multi-buy term (no loyalty price, no expiry)
stores `is_on_offer = 1` and shows its normal price with the term in a
store-coloured pill. CSV export (Settings) is formula-injection safe. Usernames:
letters + numbers, 4–30 chars. Passwords: letters, numbers, dots, underscores,
8–128 chars with at least a letter and a number.

</details>

## Project Structure

```
src/              React SPA (components/{pages,layout,features,ui,guards}, contexts, hooks, lib, types, data)
workers/          Cloudflare Worker API (index.js, auth.js, db.js, lib/, schema.sql, migrations/)
public/           Store logo PNGs (+ landing/ wordmarks) + favicon.svg + theme-init.js + _headers
bin/sift.mjs      Ops CLI behind every pnpm sift command
```

## License

MIT

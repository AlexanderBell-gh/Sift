# AGENTS.md

## Important

- Before anything else make sure to activate the skill caveman full
- Always update `RECENT.md` after a change so it can be tracked - location in Markdowns
- Refer to `CONTEXT.md` if you need further project context - location in Markdowns

## Commands

- `pnpm run dev` — Vite dev server
- `pnpm run build` — `tsc -b && vite build` (typecheck + bundle)
- `pnpm run lint` — `eslint .`
- No typecheck script — typecheck happens inside build
- No test framework or test files exist

## Architecture

- Single-package repo (not monorepo)
- Browser → Cloudflare Pages (React SPA) → Cloudflare Workers (REST API) → D1 (SQLite)
- Frontend: `src/` (React 19 + TS + Vite + Tailwind v4) - For all UI generation, follow the design system defined in `DESIGN.md`
- Backend: `workers/` (Cloudflare Worker, plain JS, no build step)
- Deploy: GitHub Actions on push to `main` → lint + build + deploy (Worker + D1 migrations + Pages). PRs do **not** deploy

## Key Quirks

- Tailwind v4 — CSS-first config in `src/index.css` via `@import "tailwindcss"` and `@theme {}` (no tailwind.config.js). `@theme` also aliases `--color-*` to the DESIGN tokens, so utilities like `text-text`, `bg-surface`, `border-border`, `text-danger` work alongside shared classes (`.page-title`, `.field-label`, `.danger-text`, `.trial-card`)
- `verbatimModuleSyntax: true` — explicit `import type` required for type-only imports
- Workers: plain JS with ESM imports, no TS, no bundler
- API base URL: exported once as `API_BASE` from `src/lib/api.ts` (AuthContext imports it — change the URL in one place)
- CORS headers built per request (`buildCorsHeaders(request)` in `workers/index.js`). Response helpers keep the `request` as the **2nd** arg so every response can carry CORS: `jsonResponse(data, request = null, status = 200)` / `errorResponse(message, request = null, status = 400)` — status 3rd, no module-level mutable header state. (A past refactor briefly made status 2nd and silently 500'd every API call.)
- CSP: strict Content-Security-Policy meta injected at **build only** via `cspMeta()` in `vite.config.ts` (dev HMR needs inline scripts, so no CSP in dev)
- Google Client ID from `VITE_GOOGLE_CLIENT_ID` env var (Vite build-time). Must be set in Cloudflare Pages dashboard (Production) or `.env` for local dev. Worker uses separate `GOOGLE_CLIENT_ID` secret — both must match.
- Dark mode: `.dark` class on `<html>`; flash-prevention script lives in `public/theme-init.js` (external, loaded from `index.html` `<head>`) so prod CSP needs no `unsafe-inline`
- `isOfferExpired` intentionally duplicated (`workers/index.js` cron + `src/lib/utils.ts`) — worker (plain JS) and frontend (TS) share no build boundary; keep both identical (end-of-day `<=`), cross-reference comments mark the dup
- No state management library — `useState`/`useEffect` + Context only
- Product autocomplete data: 13 category JSONs in `src/data/`, merged at import; also matches global watchlist items (public API)
- Hand-rolled JWT via Web Crypto API (not a library)
- Extension: **separate repo** `sift-extension` — no longer in this repo

## Backend Specifics

- Auth pattern: `const auth = await requireAuth(request, env); if (!auth?.userId) return auth;`
- `requireAdmin` re-checks role from D1 — JWT role claim is NOT trusted (demotions take effect immediately)
- No search/cache backend (removed). Autocomplete is client-side only.
- Product IDs: `hashString(store + "_" + title)` in `workers/index.js` — deterministic for dedup. Backend-only (the frontend copy was dead code and removed)
- Trial: 24h, 5 watchlist items, enforced server-side on `POST /api/watchlist` (403 `trial_expired` / `watchlist_limit`). Watchlist pins backed by `UNIQUE(user_id, product_id)` index (migration `0003`)
- Rate limits: login 10/15min, trial 5/hour, register-admin 5/15min, forgot/reset-password 5/15min (per IP, `rate_limits` table)
- Password reset: `password_resets.token_sha256` (SHA-256 of plaintext) column + index (migration `0004`) — reset-password does an indexed lookup then a single PBKDF2 verify (was an O(n) scan over all active tokens per guess)
- Alerts: `alerts.type` CHECK = `('price_drop','offer_expiry','offer_created')` (migration `0005` — table rebuild) matching `src/types/index.ts` `Alert.type`; cron currently inserts `offer_expiry` only
- Constant-time secret compare: `safeEqual()` in `workers/index.js` (not `crypto.timingSafeEqual` — unavailable on WebCrypto global under `nodejs_compat`)
- API errors: `handleResponse` throws `ApiError` with `status` + `reason` — branch on those, not message strings
- CORS: `siftsearch.pages.dev`, `localhost:5173`, `localhost:3000`

## Conventions

- ESLint flat config (`eslint.config.js`)
- `cn()` utility for className merging (`clsx` + `tailwind-merge`)
- UI components in `src/components/ui/`
- No pre-commit hooks

## Markdowns

- `/home/wsl/Projects/markdowns/Sift-Markdowns/CONTEXT.md` — Full architecture, API ref, data model, critical flows
- `/home/wsl/Projects/markdowns/Sift-Markdowns/RECENT.md` — Log for every change with file + line numbers
- `/home/wsl/Projects/markdowns/Sift-Markdowns/DESIGN.md` — Design tokens
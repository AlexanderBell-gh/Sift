# AGENTS.md

## Session rules

- **On startup skills**: `@ponytail` and `@caveman` both at `full` intensity, all session, until told otherwise.
- **Prefix every shell command with:** `rtk` — e.g. `rtk git log -5`.
- **Prioritise implementation quality over code volume:** More code ≠ better code.

- **Only use read-only git commands**: `status`, `log`, `diff`, `diff --cached`, `show`, `blame`. **Never use**: `commit`, `push`, `reset`, `rebase` or `amend`.
- **Never touch**: `.env`, Worker secrets, `.github/workflows/`, the CORS allowlist, or applied migrations (add a numbered `.sql`).
- **No destructive D1 writes** without explicit confirmation — remote writes need `--remote --yes` (db). Watchlist wipe and category overrides are CLI-only, never migrations or UI.

## CLI commands
```
rtk pnpm sift --help      # ops CLI: run steps, doctor, gate, eval, db, category, watchlist reads
rtk pnpm sift build       # tsc -b (type-check) then vite build -> dist/
rtk pnpm sift gate        # ci mirror: audit + lint + build + test + eval
rtk pnpm sift test [file] # node --test, zero-dep, no framework
```

Every step runs through `bin/sift.mjs`, extra args forwarded (`rtk pnpm sift test workers/lib/resolve.test.js`), and CI calls the same steps. Dev needs `VITE_GOOGLE_CLIENT_ID` in `.env` (gitignored, see `.env.example`), matching the Worker's `GOOGLE_CLIENT_ID` secret.

## Code style & conventions

- `src/` is the only TypeScript layer (`strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `erasableSyntaxOnly`); `any` is a lint error and assertions may not silence the compiler. `workers/` is plain JS ESM — never add TS or `tsc` it.
- No formatter: `lint` (oxlint) is the whole style surface — fix findings, don't suppress them. Named exports over default; justify every import; descriptive names; comments explain why, not what; never delete a comment you weren't asked to change.
- Provider-level code imports `API_BASE` from `src/lib/config.ts`, never `src/lib/api.ts` (keeps fuse.js and catalog JSON out of the guest chunk). React is vendor-chunked in `vite.config.ts`.
- **Mirrored, not shared** — update every copy at once; never import worker code into `src/` (or vice versa):
  - validation regexes: `workers/lib/validate.js` ↔ `AuthPage.tsx` / `SettingsPage.tsx` (regexes *and* messages)
  - `CANONICAL_CATEGORIES`: `workers/lib/category.js` ↔ `src/lib/categories.ts` (components import the latter)
  - `isOfferExpired`: `workers/index.js` ↔ `src/lib/utils.ts`

## Architecture snapshot

React 19 + TypeScript 7 + Vite 8 + Tailwind v4; Cloudflare Workers (plain JS) + D1; custom JWT + Google OAuth + password auth; GitHub Actions → Pages + Worker + migrations.

`src/` React SPA (`components/{pages,layout,features,ui,guards}`, `contexts`, `hooks`, `lib`, `types`, `data`) · `workers/` `index.js` (all routes), `auth.js`, `db.js`, `lib/category.js`, `lib/validate.js`, `schema.sql`, `migrations/` · `public/` logos, wordmarks, `theme-init.js`, `_headers` · `bin/sift.mjs` ops CLI.

- **Routes**: `/` is `HomeRoute` (`SearchPage` signed in, `LandingPage` guest); `/watchlist`, `/list`, `/offers`, `/admin`, `/settings`, `/auth` and legal pages are `React.lazy` behind one `Suspense`; `/search` redirects to `/`.
- **Schema**: `schema.sql` is the human reference (9 tables); `0001_sift.sql` is the executable truth and auto-applies on push to `main` (migrations → worker → pages). Rebuilt clean on 24-10-2026.
- **Classification** runs inline on watchlist add, first hit wins: manual CLI override (`product_knowledge` `user_correction`) → `product_knowledge` memory (`id` = size-stripped title) → Cloudflare Workers AI → `Other` with `low_confidence`.
- **Shopping list** (`/list`) stores quantities only; prices read live from watchlist rows, and multibuy logic is frontend-only in `src/lib/pricing.ts`.

## Testing & quality gates

- No test framework: `test` runs `node --test` over the pure-logic files in `workers/lib/` and `src/lib/`. New logic gets a `*.test.js` / `*.test.ts` beside it; no coverage tooling — don't invent thresholds.
- `eval` checks offline category helpers (labels, parser, size stripping, prompt ceiling).
- `gate` = audit + lint + build + test + eval. CI runs audit → lint → test → eval → build → migrate → worker → pages; PRs never deploy.

## Security

- Parameterised SQL only, through `workers/db.js` wrappers.
- No secrets in code: Worker secrets are `ADMIN_SECRET`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`; the CLI's read-only `watchlist` commands read `SIFT_ADMIN_USER` / `SIFT_ADMIN_PASS`.
- CSP is enforced twice — `<meta>` from `cspMeta()` in `vite.config.ts` and the header in `public/_headers`; keep both identical (dev omits it for HMR).
- No `dangerouslySetInnerHTML`; CSV export stays formula-injection safe.
- Rate limits and trial gating (5 items, 24h, server-side on `POST /api/watchlist`) are security controls — never remove or move them client-side.
- No PII in logs or `audit_logs`. D1 enforces foreign keys: `shopping_list` and `alerts` cascade from `watchlist`, and the CLI still clears dependents first (`shopping_list` → `alerts` → `watchlist`) so the order never depends on that.
- CORS origins live in `ALLOWED_ORIGINS` in `workers/index.js` (Pages, `localhost:5173`/`:3000`, LAN `192.168.1.70:5173`).

## Docs (user-triggered)

- On **"finish up and update docs"** update `RECENT.md`, `ARCHITECTURE.md` (fix anything stale, ~175 lines), `README.md` only for new features / `.env` keys / commands, and `AGENTS.md` keep lean & for sweeping changes only. 
- Location: `RECENT.md` + `ARCHITECTURE.md` in `/home/wsl/Repositories/markdowns/sift-markdowns/`; `README.md` in the repo root.
- **Stop after here.** Never commit; report the change and suggest a commit message (`feat:`, `fix:`, `chore:`, `polish:`).

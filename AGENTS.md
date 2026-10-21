# AGENTS.md

Sift is a UK supermarket grocery tracker: pick up to 3 stores, search once, pin products to a watchlist, then shop them from one multibuy-aware list. It is a grocery tracker, not an offer-only tool — pins need not be on offer, so never write copy that assumes a discount.

## Session rules

- **@caveman** and **@ponytail** at `full` intensity, all session, until told otherwise.
- **Prefix every shell command with `rtk`** — e.g. `rtk git log -5`.
- **Only use these git commands**: `status`, `log`, `diff`, `diff --cached`, `show`, `blame`. **Never use**: `commit`, `push`, `reset`, `rebase` or `amend`.
- **Never touch**: `.env`, Worker secrets, `.github/workflows/`, the CORS allowlist, applied migrations (add a numbered `.sql`), category floors, or the generated `category.phrases.js`.
- **No destructive D1/admin** without explicit confirmation — remote writes need `--remote --yes` (db) or `--yes` (admin). Watchlist wipe and category overrides are CLI-only, never migrations or UI.

## Setup commands

```
rtk pnpm sift install     # install dependencies (Node 24+, pnpm 12)
rtk pnpm sift dev         # Vite dev server, port 5173, extra args forwarded
rtk pnpm sift build       # tsc -b (type-check) then vite build -> dist/
rtk pnpm sift lint        # oxlint, .oxlintrc.json (94 rules, replaces eslint)
rtk pnpm sift test [file] # node --test, zero-dep, no framework
rtk pnpm sift eval        # category corpus eval + threshold gate
rtk pnpm sift audit       # audit --audit-level=high (CI gate)
rtk pnpm sift preview     # serve dist/ locally
rtk pnpm sift --help      # ops CLI: run steps, doctor, gate, db, category, admin, watchlist
```

Every step runs through `bin/sift.mjs`, extra args forwarded (`rtk pnpm sift test workers/lib/resolve.test.js`), and CI calls the same steps. Dev needs `VITE_GOOGLE_CLIENT_ID` in `.env` (gitignored, see `.env.example`), matching the Worker's `GOOGLE_CLIENT_ID` secret.

## Code style & conventions

- `src/` is the only TypeScript layer (`strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `erasableSyntaxOnly`); `any` is a lint error and assertions may not silence the compiler. `workers/` is plain JS ESM — never add TS or `tsc` it.
- No formatter: `lint` (oxlint) is the whole style surface — fix findings, don't suppress them. Named exports over default; justify every import; descriptive names; comments explain why, not what; never delete a comment you weren't asked to change.
- Provider-level code imports `API_BASE` from `src/lib/config.ts`, never `src/lib/api.ts` (keeps fuse.js and catalog JSON out of the guest chunk). React is vendor-chunked in `vite.config.ts`.
- **Mirrored, not shared** — update every copy at once; never import worker code into `src/` (or vice versa):
  - validation regexes: `workers/lib/validate.js` ↔ `AuthPage.tsx` / `SettingsPage.tsx` (regexes *and* messages)
  - `CANONICAL_CATEGORIES`: `workers/lib/category.lexicon.js` ↔ `src/lib/categories.ts` (components import the latter)
  - `isOfferExpired`: `workers/index.js` ↔ `src/lib/utils.ts`

## Architecture snapshot

React 19 + TypeScript 7 + Vite 8 + Tailwind v4; Cloudflare Workers (plain JS) + D1; custom JWT + Google OAuth + password auth; GitHub Actions → Pages + Worker + migrations.

`src/` React SPA (`components/{pages,layout,features,ui,guards}`, `contexts`, `hooks`, `lib`, `types`, `data`) · `workers/` `index.js` (all routes), `auth.js`, `db.js`, `lib/category.js` + lexicon/phrases, `lib/validate.js`, `schema.sql`, `migrations/` · `public/` logos, wordmarks, `theme-init.js`, `_headers` · `bin/sift.mjs` ops CLI.

- **Routes**: `/` is `HomeRoute` (`SearchPage` signed in, `LandingPage` guest); `/watchlist`, `/list`, `/offers`, `/admin`, `/settings`, `/auth` and legal pages are `React.lazy` behind one `Suspense`; `/search` redirects to `/`.
- **Schema**: `schema.sql` is the human reference (8 tables); `0001_init.sql` + `0002_catalog_category.sql` are the executable truth and auto-apply on push to `main` (migrations → worker → pages).
- **Scoring** runs inline on watchlist add, first hit wins: manual override → non-food → frozen → ambient → leaf map → department breadcrumbs → title vote → `Other`. Strong votes name one shelf and outrank weak flavour words; a curated `WEAK_KEYWORDS` entry outranks a derived strong keyword.
- **Shopping list** (`/list`) stores quantities only; prices read live from watchlist rows, and multibuy logic is frontend-only in `src/lib/pricing.ts`.

## Testing & quality gates

- No test framework: `test` runs `node --test` over the pure-logic files in `workers/lib/` and `src/lib/`. New logic gets a `*.test.js` / `*.test.ts` beside it; no coverage tooling — don't invent thresholds.
- `eval` gates scorer accuracy across the fit, holdout and live suites; floors live in `category.thresholds.json` (fit measured−1, others measured−2) and never drop.
- `gate` = audit + lint + build + test + eval. CI runs audit → lint → test → eval → build → migrate → worker → pages; PRs never deploy.

## Security

- Parameterised SQL only, through `workers/db.js` wrappers.
- No secrets in code: Worker secrets are `ADMIN_SECRET`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`; admin CLI reads `SIFT_ADMIN_USER` / `SIFT_ADMIN_PASS`.
- CSP is enforced twice — `<meta>` from `cspMeta()` in `vite.config.ts` and the header in `public/_headers`; keep both identical (dev omits it for HMR).
- No `dangerouslySetInnerHTML`; CSV export stays formula-injection safe.
- Rate limits and trial gating (5 items, 24h, server-side on `POST /api/watchlist`) are security controls — never remove or move them client-side.
- No PII in logs or `audit_logs`. D1 has no cascades: clear dependents explicitly, `shopping_list` → `alerts` → `watchlist`.
- CORS origins live in `ALLOWED_ORIGINS` in `workers/index.js` (Pages, `localhost:5173`/`:3000`, LAN `192.168.1.70:5173`).

## Docs (user-triggered)

- On **"finish up and update docs"** update `RECENT.md`, `ARCHITECTURE.md` (fix anything stale, ~250 lines), `README.md` only for new features / `.env` keys / commands, and `AGENTS.md` for sweeping changes only. Location: `/home/wsl/Repositories/markdowns/sift-markdowns/`

## Pre-commit checklist

1. `rtk pnpm sift gate` passes, and `rtk git status` / `rtk git diff` show no `.env`, `dist/`, secrets or stray files.
2. Schema change? Numbered migration added **and** `schema.sql` updated.
3. Category data change? `category.phrases.js` rebuilt and committed with the lexicon.
4. **Stop here.** Never commit; report the change and suggest a commit message (`feat:`, `fix:`, `chore:`, `polish:`).

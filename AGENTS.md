# AGENTS.md

Guidance for coding agents working on Sift.

## Session Start

> **Rule**: Invoke the `@caveman` skill at `full` intensity at the start of every session. It stays on until the user says "stop caveman" or "normal mode".

## Purpose & Scope

Sift is a UK supermarket grocery tracker: pick up to 3 stores, search once, pin products to a watchlist, then shop them from one multibuy-aware list.

- **Positioning**: a grocery tracker, not an offer-only tool. Pins need not be on offer. Never write copy that assumes a discount.
- **Agent focus**: feature code, pure-logic tests, refactors and docs in `src/` and `workers/`, plus CLI steps in `bin/sift.mjs`.
- **Never run `git commit`, `git push`, `git reset` or any history rewrite.** Read-only git (`status`, `log`, `diff`, `diff --cached`) is expected. Suggest a commit message; the user commits.
- **Never touch** `.env`, Worker secrets, `.github/workflows/`, or the CORS allowlist unless the task asks for it.
- **Never edit an applied migration.** Add a new numbered `.sql` file to `workers/migrations/` instead.
- **Never lower a floor** in `workers/lib/category.thresholds.json`, and never hand-edit the generated `workers/lib/category.phrases.js`.
- **Never run destructive remote D1 commands** (`db wipe-watchlist`, remote `query` writes) without explicit user confirmation.

## Setup Commands

> **Rule**: Prefix every shell command with `rtk`, e.g. `rtk pnpm sift gate`.

```bash
rtk pnpm sift install     # install dependencies (Node 24+, pnpm 12)
rtk pnpm sift dev         # Vite dev server, port 5173, extra args forwarded
rtk pnpm sift build       # tsc -b (type-check) then vite build -> dist/
rtk pnpm sift lint        # oxlint, .oxlintrc.json (94 rules, replaces eslint)
rtk pnpm sift test [file] # node --test, zero-dep, no framework
rtk pnpm sift eval        # category corpus eval + threshold gate
rtk pnpm sift audit       # audit --audit-level=high (CI gate)
rtk pnpm sift preview     # serve dist/ locally
rtk pnpm sift --help      # full ops CLI: run steps, doctor, gate, db, category, admin, watchlist
```

All commands run through the CLI (`bin/sift.mjs`, extra args forwarded: `rtk pnpm sift test workers/lib/resolve.test.js`). CI calls the same CLI steps. Raw `pnpm run X` still works, but docs use the CLI. The CLI never deploys — pushes to `main` do.

Prerequisites: Node 24+, pnpm 12, a Cloudflare account. Local dev needs `VITE_GOOGLE_CLIENT_ID` in `.env` (gitignored, see `.env.example`); it must match the Worker's `GOOGLE_CLIENT_ID` secret.

## Code Style & Conventions

### Language rules

- `src/` is the only TypeScript layer: `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `erasableSyntaxOnly`. `any` is a lint error (`typescript/no-explicit-any`) and is forbidden. No type-assertion shortcuts to silence the compiler.
- `workers/` is plain JavaScript ESM. Never add TypeScript there and never type-check it with `tsc`.
- Test files run through Node's native type stripping: keep them free of enums, namespaces and parameter properties.
- **Mirrored, not shared.** Three rules must be changed in every copy at once, and worker code must never be imported into `src/` (or vice versa):
  - validation regexes: `workers/lib/validate.js` ↔ `src/components/pages/AuthPage.tsx`, `src/components/pages/SettingsPage.tsx` (regexes *and* error messages identical)
  - `CANONICAL_CATEGORIES`: `workers/lib/category.lexicon.js` ↔ `src/lib/categories.ts`. Components import from `src/lib/categories.ts`, never hardcode the list.
  - `isOfferExpired`: `workers/index.js` ↔ `src/lib/utils.ts`

### General guidelines

- **Imports**: named exports over default; provider-level code imports `API_BASE` from `src/lib/config.ts`, never `src/lib/api.ts`.
- **Naming**: descriptive and explicit; match the surrounding file's conventions rather than inventing a new pattern.
- **Comments**: explain *why* a non-obvious approach was chosen, not what the line does. Never delete or shorten a comment you were not asked to change.
- **Dependencies**: justify every import. Do not add a package for a small utility that fits in a local module.

### Formatting

There is no formatter. `rtk pnpm sift lint` (oxlint) is the whole style surface — no prettier, no eslint. Fix findings rather than suppressing them.

## Architecture & Structure Notes

| Layer | Stack |
|-------|-------|
| Frontend | React 19 + TypeScript 7 + Vite 8 + Tailwind v4 |
| Backend | Cloudflare Workers (plain JS) + D1 (SQLite) |
| Auth | Custom JWT + Google OAuth + username/password |
| Build | `tsc -b && vite build` → `dist/` |
| CI/CD | GitHub Actions → Pages + Worker + D1 migrations |

```
src/                  React SPA — components/{pages,layout,features,ui,guards}/, contexts/, hooks/, lib/, types/, data/
workers/              Worker API — index.js, auth.js, db.js (plain JS), lib/, schema.sql, migrations/
workers/migrations/   D1 SQL migrations, applied automatically on push to main
public/               Store logos, landing wordmarks, favicon.svg, theme-init.js, _headers
bin/sift.mjs          Ops CLI wrapping every run step
```

- **Frontend entry**: `src/main.tsx` → `src/App.tsx`. Routes: `/`, `/auth`, `/search`, `/watchlist`, `/list`, `/offers`, `/admin`, `/settings`, `/privacy`, `/terms`, `/cookies`, `/about`, `/license`. Landing stays eager; every other route is `React.lazy` behind one `Suspense` fallback. `/` is conditional (`HomeRoute`): `SearchPage` when signed in, `LandingPage` when guest.
- **Worker entry**: `workers/index.js` — one file for all routes. `workers/auth.js` (JWT/password), `workers/db.js` (D1 wrappers), `workers/lib/category.js` (scorer) with `category.lexicon.js` (curated), `category.phrases.js` (generated), `workers/lib/validate.js` (allowlists).
- **Schema**: `workers/schema.sql` is the human reference (8 tables: users, rate_limits, watchlist, shopping_list, alerts, audit_logs, password_resets, product_catalog). `workers/migrations/0001_init.sql` builds a database from scratch and is the executable truth; `0002_catalog_category.sql` adds the manual-override columns.
- **Category scoring** runs inline on watchlist add. First hit wins: manual override → non-food → frozen → ambient → leaf map → department breadcrumbs → title vote → `Other`.
- **Shopping list** (`/list`) stores quantities only; prices are read live from watchlist rows. Multibuy logic lives in `src/lib/pricing.ts` (frontend-only) and pools same-tag sets across lines.

## Testing Instructions

- **No test framework exists.** `rtk pnpm sift test` runs `node --test` over five pure-logic files: `workers/lib/category.test.js`, `workers/lib/validate.test.js`, `workers/lib/resolve.test.js`, `src/lib/pricing.test.ts`, `src/lib/utils.test.ts` (~198 tests).
- New logic belongs in a pure module with a `*.test.js` / `*.test.ts` file beside it, runnable in isolation.
- `rtk pnpm sift eval` gates the scorer on per-category accuracy across three suites: fit (1,581 corpus names, 100%), holdout (237 names, tiers derived without them, 79.0%), live (108 hand-labelled prod products, 84.3%). Floors are measured−2 and never lowered.
- No coverage tooling and no coverage thresholds. Do not invent them.

## Security Considerations

- **Parameterised SQL only**, through `workers/db.js` wrappers. Never concatenate user input into a statement.
- **No secrets in code or commits**: `.env` is gitignored. Worker secrets are `ADMIN_SECRET`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`; admin CLI commands read `SIFT_ADMIN_USER` / `SIFT_ADMIN_PASS` from the environment.
- **CSP is enforced twice**: a build-time `<meta>` from `cspMeta()` in `vite.config.ts` and a real header in `public/_headers`. Keep both in sync. The dev server omits it so HMR works.
- **No `dangerouslySetInnerHTML`.** CSV export must stay formula-injection safe.
- **Rate limits** on auth endpoints and **trial gating** (5 watchlist items, 24h, enforced server-side on `POST /api/watchlist`) are security controls. Never remove them or move enforcement to the client.
- **User data**: no PII in logs or `audit_logs` payloads. D1 enforces no FK cascades, so deletions must clear dependent rows explicitly (`shopping_list` → `alerts` → `watchlist`).
- **Watchlist wipe is CLI-only** — `rtk pnpm sift db wipe-watchlist`, never a migration; leaves users, catalog, audit logs, rate limits and resets alone. Remote runs need `--remote --yes`.
- **Manual category override is CLI-only** — `rtk pnpm sift category set "<product name>" <category>` writes `product_catalog.category`, which the worker reads before scoring. Global by name, case-insensitive, remote needs `--remote --yes`. No UI, no per-user override.

## Key Gotchas

1. **Worker is plain JS** — never `tsc` it; only `src/` is TypeScript.
2. **Three rules are mirrored, not shared** — see Code Style. Changing one copy without the others is a bug.
3. **`workers/lib/category.phrases.js` is generated, do not hand-edit** — built from `src/data/uk-*.json` + `category.lexicon.js` by `node workers/lib/category.phrases.build.mjs`. Edit the curated lexicon, rebuild, commit both. `eval` deep-compares `PHRASES`, `DERIVED_KEYWORDS`, `DERIVED_WEAK` and `HOLDOUT`, so a stale file fails the gate.
4. **Eval floors never drop** — `rtk pnpm sift gate` and CI run the eval.
5. **CSP lives in two places** — `vite.config.ts` and `public/_headers`. Keep them identical.
6. **D1 enforces no cascades** — delete dependents explicitly in that order.
7. **Staged removals flush on `pagehide`** — React never runs unmount cleanups on refresh or close-tab, so watchlist/shopping-list removals commit through a `pagehide` listener with `keepalive` fetches. Never rely on unmount alone for unload paths.
8. **Bundle rule** — provider-level code imports `API_BASE` from `src/lib/config.ts`, never `src/lib/api.ts` (fuse.js and catalog JSON ride into the guest chunk otherwise). New routes default to `React.lazy`; React is vendor-chunked in `vite.config.ts`.
9. **Category votes come in two strengths** — a strong vote names one shelf (a matched product name, or a keyword the corpus only uses for that shelf); a weak vote is a flavour word (`apple`, `lemon`, `cinnamon`) or a word used across shelves. Weak votes only decide when no strong vote landed, otherwise `apple & cinnamon granola` lands on produce. A curated `WEAK_KEYWORDS` entry outranks a derived strong keyword: the derivation sees shelf consistency, not that `rosemary` is a flavour.
10. **Migrations auto-apply on push to `main`**, in the order migrations → worker → pages. The chain is two files; add a numbered `.sql` and update `workers/schema.sql` to match.

## Linting & Quality Gates

```bash
rtk pnpm sift lint     # oxlint, fails on error-severity findings
rtk pnpm sift gate     # audit + lint + build + test + eval
```

CI runs **audit → lint → test → eval → build → migrate → worker → pages**. PRs never deploy. If `gate` fails locally, the commit will break CI.

## Pre-Commit Checklist

1. `rtk pnpm sift gate` passes.
2. `rtk git status` and `rtk git diff` reviewed — no `.env`, `dist/`, secrets or stray files staged.
3. Schema change? Numbered migration added **and** `workers/schema.sql` updated.
4. Category data change? `category.phrases.js` rebuilt and committed alongside the lexicon.
5. **Stop here.** Never commit or push. Report the change and suggest a `feat:` / `fix:` / `chore:` / `polish:` message.

## Discovering Recent Changes

Use git rather than reading file lists:

```bash
rtk git log -n 5 --stat     # last 5 commits with file stats
rtk git status              # uncommitted changes
rtk git diff                # unstaged changes
rtk git diff --cached       # staged changes
```

## CORS

Allowed origins are hardcoded in `workers/index.js` (`ALLOWED_ORIGINS`): `https://siftsearch.pages.dev`, `http://localhost:5173`, `http://localhost:3000`, plus LAN `http://192.168.1.70:5173` for on-device dev (DHCP may reassign — update when it changes). Adding a dev port or staging domain means updating `ALLOWED_ORIGINS` there.

## Code Quality & Longevity Standards

 You are not merely a code generator; you are a dedicated co-architect. Your primary objective is the long-term health, maintainability and production readiness of this
 codebase. Every line you produce must strictly adhere to these standards.

 ### Core Philosophy

 - Maintainability: code is read far more often than written. Prioritise clarity, explicit naming and human readability above all else.
 - Evolution: Proactively identify and gently refactor technical debt or suboptimal patterns within the context of your changes.
 - Future-Proof Design: anticipate future requirements. Design interfaces open for extension but closed for modification.

 ### Mandatory Practices

 1. Defensive Programming: handle every edge case, null/undefined check and asynchronous rejection. Never assume valid input.
 2. Strict Typing & Architecture: follow the repository's established architectural patterns religiously. Shortcuts (like any) are forbidden.
 3. Intentful Documentation: use highly descriptive names. Comment why a specific, non-obvious approach was chosen, not what the code does.
 4. Testability by Design: code must be modular and decoupled. If a component is hard to unit test, it is too complex and must be broken down.
 5. Dependency Minimization: evaluate every import. Do not add an external dependency for a minor, implementable utility.

## Session Lifecycle Rules

### Multi-Doc Conclusion Protocol

When the user says **"lets finish up and update the docs"**, perform these documentation updates before stopping:

1. **Update RECENT.md**
   - Insert a reverse-chronological entry directly under the `## Sessions` header.
   - Keep the file at or under 150 lines — trim the oldest entries when adding a new one.
   - Location: `/home/wsl/Repositories/markdowns/sift-markdowns/RECENT.md`

   **Format:**
   ```
   ### 📝 [DD-MM-YYYY] @ [UK HH:MM 24-hr] | [Short Session Title]
   * **Changes:** [One-sentence summary of what was accomplished].
   * **Impacted Files:** `[file_1.ext]`, `[file_2.ext]`.
   ```

2. **Update ARCHITECTURE.md**
   - Review the architectural state, tech stack details and data flows; correct anything outdated. Keep it under ~250 lines.
   - Location: `/home/wsl/Repositories/markdowns/sift-markdowns/ARCHITECTURE.md`
   - Design notes (UI motion, store logo sets, landing composition) live here, not in AGENTS.md.
   - `CATEGORY.md` is a temporary planning doc. Once its remaining work ships, delete it; ARCHITECTURE.md carries the standing contract.

3. **Update README.md**
   - Update sections for new features, configuration keys (`.env`) or changed install/build commands. Leave stable project descriptions alone unless explicitly relevant.
   - Location: `/home/wsl/Repositories/Sift/README.md`

4. **Update AGENTS.md**
   - Reserved for critical, sweeping architectural shifts, core tech-stack changes or major global project rules. Do not modify for routine features, refactors or bug fixes. Keep it under ~200 lines.
   - Location: `/home/wsl/Repositories/Sift/AGENTS.md`

5. **Commit message**
   - Suggest one (`chore:`, `feat:`, `polish:` etc). Do not run `git commit` or `git push`.

## Tool-Specific Instructions

### Filesystem access

- Use absolute paths.
- Read a file before modifying it; do not assume its structure.
- Treat unfamiliar files and uncommitted changes as the user's work. Investigate before deleting or overwriting.

### Git integration

- Read-only commands only: `status`, `log`, `diff`, `diff --cached`, `show`, `blame`.
- Never commit, push, reset, rebase, amend or force anything. Report the diff and suggest a message.

### Shell access

- Prefix every command with `rtk`.
- Never run a destructive remote D1 or admin command without explicit confirmation. Remote writes require `--remote --yes` (db) or `--yes` (admin).

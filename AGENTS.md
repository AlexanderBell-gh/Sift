# AGENTS.md

## Commands

- `pnpm run dev` — Vite dev server
- `pnpm run build` — `tsc -b && vite build` (typecheck + bundle)
- `pnpm run lint` — `eslint .`
- No typecheck script — typecheck happens inside build
- No test framework or test files exist

## Architecture

- Single-package repo (not monorepo)
- Browser → Cloudflare Pages (React SPA) → Cloudflare Workers (REST API) → D1 (SQLite)
- Frontend: `src/` (React 19 + TS + Vite + Tailwind v4) - For all UI generation, follow the design system defined in `Projects/markdowns/Sift Project/DESIGN.md`
- Backend: `workers/` (Cloudflare Worker, plain JS, no build step)
- Deploy: GitHub Actions on push to `main` → Pages + Worker

## Key Quirks

- Tailwind v4 — CSS-first config in `src/index.css` via `@import "tailwindcss"` and `@theme {}` (no tailwind.config.js)
- `verbatimModuleSyntax: true` — explicit `import type` required for type-only imports
- Workers: plain JS with ESM imports, no TS, no bundler
- API base URL hardcoded in `src/lib/api.ts` and `src/contexts/AuthContext.tsx`
- Dark mode: `.dark` class on `<html>`, flash-prevention script in `index.html` `<head>`
- No state management library — `useState`/`useEffect` + Context only
- Hand-rolled JWT via Web Crypto API (not a library)

## Backend Specifics

- Auth pattern: `const auth = await requireAuth(request, env); if (!auth?.userId) return auth;`
- Timeouts: SearXNG 5s, Gemma 30s (via `timeoutFetch`)
- Cache: djb2 hash of query → base36, 24h TTL, upsert `ON CONFLICT DO UPDATE`
- Product IDs: `hashString(store + "_" + title)` — deterministic for dedup
- Trial: 24h, 5 searches. Search blocked when expired or limit hit
- CORS: `sift-a5w.pages.dev`, `sift.pages.dev`, `localhost:5173`, `localhost:3000`

## Conventions

- ESLint flat config (`eslint.config.js`)
- `cn()` utility for className merging (`clsx` + `tailwind-merge`)
- UI components in `src/components/ui/`
- No pre-commit hooks
- **CHANGES.md**: log every change with file + line numbers (see `Projects/markdowns/Sift Project/CHANGES.md`)

## Reference Files

- `Projects/markdowns/Sift Project/CONTEXT.md` — full architecture, API ref, data model, critical flows
- `Projects/markdowns/Sift Project/CHANGES.md` — change log convention
- `Projects/markdowns/Sift Project/DESIGN.md` — design system spec

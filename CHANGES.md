Whenever you make a change add what line of code and the file that was edited.

Add info after the last line of '#' you see, if the date is different add a line of '#' with the current date.


################################################

## 2026-06-29

### Phase 1 Deployment & Fixes
- `workers/index.js` — Added `timeoutFetch()` wrapper (Promise.race + setTimeout) for Serper & Gemma API calls
- `workers/index.js` — Changed Gemma model `gemma-4-31b-it` → `gemma-4-26b-a4b-it` (line 258)
- `workers/index.js` — Increased Gemma timeout 15s → 30s (line 268)
- `workers/index.js` — Reduced prompt items 10→8, snippet 300→200 chars (line 226)
- `workers/index.js` — Simplified Gemma fallback logic (lines 1043-1064)
- `workers/index.js` — Fixed duplicate else block causing deploy build error
- `workers/schema.sql` — Added `IF NOT EXISTS` to all CREATE TABLE/INDEX for idempotent migrations
- Remote D1 `pricetrackr` — Created `search_cache` table manually, then applied full schema.sql
- GitHub Actions — `main` branch deploy configured; fixed build error in CI

### Phase 2: Watchlist (Memory)
- `workers/schema.sql` — Added `watchlist` table with product snapshot columns + user/product indexes
- `workers/index.js` — Added `/api/watchlist` CRUD (GET user's items, POST pin, DELETE unpin)
- `workers/index.js` — Dedup via `product_id` hash; returns `already_pinned` if duplicate
- `src/types/index.ts` — Added `WatchlistItem` interface
- `src/lib/api.ts` — Added `getWatchlist`, `addToWatchlist`, `removeFromWatchlist` functions
- `src/contexts/AuthContext.tsx` — Created auth context with login, register, logout, token persistence via localStorage
- `src/components/AuthPage.tsx` — Created login/register page with toggle tabs, error display, loading state
- `src/components/SearchPage.tsx` — Added nav header with sign in/out, watchlist link; passes auth/pin props to cards
- `src/components/SearchResultCard.tsx` — Added pin/unpin button (MapPin icon), authenticated/pinned props
- `src/components/WatchlistPage.tsx` — Created watchlist dashboard with grid view, remove button, pin date display
- `src/App.tsx` — Added `/auth` and `/watchlist` routes; wrapped app in `AuthProvider`


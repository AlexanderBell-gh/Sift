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


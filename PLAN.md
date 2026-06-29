# Project Plan: Sift (Smart Watchlist)

## Project Vision
Transform the project into **Sift**, an interactive, real-time price comparison and smart watchlist tool. Instead of users inputting data, the app fetches real-time pricing (including loyalty/clubcard offers) from UK supermarkets via search and allows users to "pin" items to track them.

---

## Core Features (MVP)

### 1. Interactive Search
- [ ] **Search Interface:** A prominent search bar for product queries (e.g., "Medjool dates").
- [ ] **Real-time Results:** Display a list of products from multiple UK supermarkets.
- [ ] **Dual Pricing Display:** Show "Normal Price" vs. "Loyalty Price" (e.g., Nectar/Clubcard).
- [ ] **Unit Price Comparison:** Show price per unit (e.g. per 100g) to ensure true value comparison.
- [ ] **Offer Expiry:** Display when the current offer/loyalty price expires.

### 2. Smart Watchlist
- [ ] **Pinning Mechanism:** Users can save a search result to their personal watchlist.
- [ ] **Watchlist View:** A dedicated dashboard showing all pinned products with their current status.
- [ ] **Simplified Auth:** Lightweight user accounts to persist watchlists.

### 3. Intelligence Layer
- [ ] **Web Aggregation:** Use Serper API to fetch real-time supermarket data.
- [ ] **AI Parsing (Gemma 4):** Use LLM to parse messy web text into structured JSON (Name, Normal Price, Loyalty Price, Expiry Date).

---

## Technical Roadmap

### Phase 1: Stateless Search & Aggregation (The "Engine") — COMPLETE

**Decisions:**
- Replace existing `/api/search/products` endpoint (no parallel old/new)
- Full replace: Remove manual product/price entry, products/prices tables
- Cache: D1 `search_cache` table (24h TTL)

**Execution Order:**

#### 1. Schema & Types
- [x] Add `search_cache` table to D1 schema
- [x] Update `SearchResult` interface in `src/types/index.ts` (dual pricing, unit price, loyalty type, offer expiry)

#### 2. Backend Search Endpoint
- [x] Rewrite `/api/search/products` → `/api/search` (GET method per SPEC.md)
- [x] Parallel search: `site:tesco.com "query"`, `site:sainsburys.co.uk "query"`, etc. (7 stores)
- [x] Rewrite `enrichWithGemma()` prompt for: normal price, loyalty price, loyalty_type, unit, unit_price, offer_expires_at, is_on_offer
- [x] D1 cache: Check cache before Serper, store after successful fetch (24h TTL)
- [x] Remove auth requirement for search (guest can search)

#### 3. Backend Cleanup
- [x] Remove product CRUD routes (`/api/products/*`)
- [x] Remove category routes (`/api/categories/*`)
- [x] Remove `/api/scrape-product`, `/api/images`
- [x] Remove helper functions (`isValidProduct`, `rowToProduct`, etc.)

#### 4. Frontend - New Search UI
- [x] Create `src/components/SearchPage.tsx` - Full-page search, prominent input, results grid
- [x] Create `src/components/SearchResultCard.tsx` - Dual pricing, store logo, unit price, offer expiry badge

#### 5. Frontend - Routing & Cleanup
- [x] Update `src/App.tsx` - `/` → `SearchPage` (public), remove Landing route
- [x] Delete `src/pages/Landing.tsx`
- [x] Update `src/lib/api.ts` - New search call, remove product/category calls
- [x] Remove unused imports/components from old PriceTrackr

#### 6. Testing
- [x] Test parallel search with real queries — Works. Returns results from all 7 stores.
- [/] Verify Gemma prompt returns valid structured JSON — Gemma timing out at 15s; increased to 30s + reduced prompt size. Pending verification.
- [ ] Test cache hit/miss behavior
- [x] Test frontend search flow end-to-end

### Phase 2: The Watchlist (The "Memory") — COMPLETE
- [x] **Database:** Add `watchlist` table to D1 schema (store snapshots of pinned products)
- [x] **Backend:** Implement `/api/watchlist` (GET, POST, DELETE) with user auth
- [x] **Identity Logic:** Use `product_id` hash for dedup — prevents duplicate pins
- [x] **Frontend:** Implement "Pin/Unpin" functionality on search results
- [x] **Frontend:** Build the Watchlist Dashboard (`/watchlist`)
- [x] **Auth:** Add auth context (login/register page, JWT in localStorage, auto-verify on load)
- [ ] **Backend:** Add `PATCH /api/watchlist/:id/refresh` to re-search and update prices (post-MVP)
- [ ] **Frontend:** Handle auth flow edge cases (redirect on expired token, protected routes) (post-MVP)

### Phase 3: Polish & Automation (The "Pro" Features)
- [ ] **UI/UX:** Add animations, skeleton loaders, and improved mobile responsiveness.
- [ ] **Data Freshness:** Add "Last updated" timestamps and visual indicators for cached vs. live data.
- [ ] **Automation (Optional):** Use Cloudflare Cron Triggers to auto-refresh watchlist prices daily.
- [ ] **Intelligence Alerts:** Add logic to detect price drops or upcoming offer expiries.
- [ ] **Advanced Filters:** Filter watchlist by "Expiring Soon" or "Price Drops."

---

## Architecture Overview
- **Frontend:** React 19 + Tailwind CSS v4 (Vite)
- **Backend:** Cloudflare Workers (REST API)
- **Database:** Cloudflare D1 (SQLite)
- **Search:** Serper API
- **Intelligence:** Google AI Studio (Gemma 4)
- **Deployment:** Cloudflare Pages (Frontend) + Wrangler (Backend)

## Tech Stack Refinement
- **Frontend:** React, TypeScript, Lucide React, Tailwind CSS
- **Backend:** Cloudflare Workers, JWT
- **Data:** D1 (SQLite), Serper API, Gemma 4

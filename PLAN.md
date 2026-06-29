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

### Phase 1: Stateless Search & Aggregation (The "Engine")
- [ ] **API Design: Define the `SearchResult` schema (Name, Normal Price, Loyalty Price, Expiry, Store, Image).**
- [ ] **Intelligence Layer: Develop and test Gemma 4 prompts to ensure consistent, valid JSON output.**
- [ ] **Backend:** Implement `/api/search` endpoint in Cloudflare Worker.
- [ ] **Backend:** Integrate Serper API for web search results.
- [ ] **Backend:** Integrate Gemma 4 to normalize search results into a structured `SearchResult` type.
- [ ] **Backend:** Implement basic caching for common queries to optimize API usage.
- [ ] **Frontend:** Build the Search UI and Result Card components.
- [ ] **Frontend:** Implement the search flow (Query $\rightarrow$ API $\rightarrow$ Display).
- [ ] **Frontend:** Implement Error/Empty states (No results found, parsing errors, etc.).
- [ ] **Frontend:** Remove Landing Page (Transition to direct search/app access).

### Phase 2: The Watchlist (The "Memory")
- [ ] **Database:** Refactor D1 schema to support "Pinned Products" (Snapshots).
- [ ] **Identity Logic:** Implement logic to match new search results against existing pinned items to prevent duplicates.
- [ ] **Backend:** Implement `/api/watchlist` (GET, POST, DELETE).
- [ ] **Frontend:** Implement "Pin/Unpin" functionality on search results.
- [ ] **Frontend:** Build the Watchlist Dashboard.
- [ ] **Auth:** Implement a simplified Auth system (minimalist JWT/Session).

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

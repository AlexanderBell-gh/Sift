# Technical Specification: Sift

## 1. Search & Aggregation Strategy

### Target Supermarkets
The system will target the following UK retailers:
- Tesco
- Sainsbury's
- ASDA
- Morrisons
- M&S
- Aldi
- Lidl

### Query Execution
To maximize accuracy and avoid non-product results, the backend will employ a **Parallel Search Strategy**:
1. **Query Expansion**: For a user input `Q`, the system generates targeted queries:
   - `site:tesco.com "Q"`
   - `site:sainsburys.co.uk "Q"`
   - `site:asda.com "Q"`
   - (and so on for the target list)
2. **Aggregation**: Results from these searches are collected and passed to the Intelligence Layer for parsing.

---

## 2. Intelligence Layer (AI Parsing)

### Role
The LLM (Gemma 4) acts as a structured data extractor, converting messy HTML snippets/search results into a clean JSON format.

### Prompt Requirements
The system prompt will enforce the following rules:
- **Strict JSON**: Output must be a valid JSON array of `SearchResult` objects.
- **Price Mapping**: 
  - "Loyalty/Clubcard/Nectar" prices $\rightarrow$ `loyalty` field.
  - Standard prices $\rightarrow$ `normal` field.
- **Date Normalization**: Convert relative or UK-formatted dates (e.g., "Tue 14 Jul") into ISO 8601 (`YYYY-MM-DD`).
- **Confidence Scoring**: If a result is clearly not a product (e.g., a recipe), it should be discarded.

### Schema
```typescript
interface SearchResult {
  id: string; // Generated hash of store + product name
  name: string;
  store: string;
  store_logo: string;
  image_url: string;
  unit: string | null; // e.g., '200g', '1L', 'pack of 4'
  prices: {
    normal: number | null;
    loyalty: number | null;
    unit_price: number | null; // Normalized price per base unit (e.g. price per 100g)
    currency: string; // default 'GBP'
  };
  loyalty_type: string | null; // e.g., 'Nectar', 'Clubcard'
  offer_expires_at: string | null; // ISO Date
  product_url: string;
  is_on_offer: boolean;
}
```

---

## 3. Watchlist & Refresh Logic

### The "Pinned" Snapshot
When a user pins a product, the system stores a snapshot of the `SearchResult` in D1.

### Background Refresh (Option B)
- **Mechanism**: Cloudflare Workers Cron Trigger.
- **Frequency**: Daily.
- **Efficiency**: 
  - Only products with `last_checked` $> 24$ hours are refreshed.
  - Refresh is performed by re-running the targeted search for that specific product's name/store.
- **Anti-Spam/Protection**:
  - Rate limits applied to the cron process to avoid triggering supermarket bot detection.
  - Max refresh limit per user per cycle.

---

## 4. User Journey & Experience

### Guest User
- **Landing**: Directly enters the Search Page.
- **Capability**: Can search and view real-time comparison results.
- **Conversion**: Clicking "Pin" opens a "Sign Up/Login" modal to unlock the Watchlist feature.

### Authenticated User
- **Landing**: Redirected to their personal Watchlist Dashboard.
- **Capability**: 
  - View pinned items with updated pricing.
  - Use the global search bar to find and pin new items.
  - Manage (delete) items from their watchlist.

---

## 5. API Endpoints (Updated)

### Search
- `GET /api/search?q={query}`: Triggers the parallel search and AI parsing.

### Watchlist
- `GET /api/watchlist`: Returns the user's pinned items.
- `POST /api/watchlist`: Pins a `SearchResult` object.
- `DELETE /api/watchlist/:id`: Removes an item from the watchlist.

# PriceTrackr → Sift (WIP)

> 🚧 **Under Construction** — Major rewrite in progress. Old PriceTrackr UI/features being replaced with Sift (real-time supermarket search + smart watchlist).

**Live:** https://price-trackr.pages.dev/

## What's New (Recent Updates)

- **Rebrand to Sift** — Real-time supermarket price comparison across 7 UK stores (Tesco, Sainsbury's, Asda, Morrisons, Waitrose, M&S, Ocado)
- **AI-Powered Search** — Serper API + Gemma 4 (Google AI Studio) parses messy web snippets into structured pricing data
- **Dual Pricing** — Shows normal price vs loyalty price (Clubcard/Nectar) with unit price comparison
- **Watchlist (MVP)** — Pin products to save them, view in dashboard, remove anytime
- **Auth** — Lightweight JWT accounts with login/register to persist watchlists
- **Deployed** — Frontend on Cloudflare Pages, API on Cloudflare Workers, D1 database


## Design

PriceTrackr features a refined modern UI with:

- **Green accent colors** matching the logo (`#74da86`)
- **Glassmorphism** on sticky header and filter bar
- **Border-based depth** instead of heavy shadows
- **Spring animations** for all transitions
- **Sparkline charts** for price history visualization
- **Skeleton loading** states for smooth content transitions
- **Dark mode** with solid background (#0A0A0A)

## Features (MVP)

- **Supermarket Search** — Search 7 UK supermarkets simultaneously (Tesco, Sainsbury's, Asda, Morrisons, Waitrose, M&S, Ocado)
- **AI-Enriched Results** — Serper web search + Gemma 4 extracts normal price, loyalty price, unit price, expiry dates from snippets
- **Dual Pricing** — Normal price vs loyalty price (Clubcard / Nectar) with unit price comparison
- **Watchlist** — Pin products to save them, view all pinned items in dashboard, remove anytime
- **Auth** — Lightweight JWT accounts with login/register to persist watchlists

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Backend**: Cloudflare Workers
- **Storage**: Cloudflare Workers D1 (SQLite)
- **Deployment**: Cloudflare Pages + GitHub Actions (Wrangler CLI)
- **Package manager**: pnpm 11
- **External APIs**: Serper API (web search), Google AI Studio / Gemma 4 (product data enrichment)

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm 11+
- Cloudflare account

### Local Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

### Build

```bash
pnpm run build
```

The built files will be in the `dist/` directory.

## Deployment

### Automatic (GitHub Actions)

This project includes a GitHub Actions workflow that automatically deploys to Cloudflare on push to main. Can also be triggered manually via `workflow_dispatch`.

1. Add these secrets to your GitHub repository:
   - `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token
   - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare Account ID

2. Push to main to trigger deployment, or use "Run workflow" in Actions tab

### Manual

```bash
# Deploy frontend to Cloudflare Pages (production)
pnpm exec wrangler pages deploy dist --project-name=price-trackr

# Deploy worker API
pnpm exec wrangler deploy --config workers/wrangler.toml
```

## Configuration

### Cloudflare D1 Database

The project uses a D1 (SQLite) database for data storage. Schema lives in `workers/schema.sql`.

**Local setup:**
```bash
# Create the database (note the database_id from the output)
wrangler d1 create pricetrackr

# Apply schema locally
wrangler d1 execute pricetrackr --file=./workers/schema.sql

# Seed default categories
wrangler d1 execute pricetrackr --file=./workers/seed.sql
```

**Production setup (apply to remote D1):**
```bash
wrangler d1 execute pricetrackr --remote --file=./workers/schema.sql
wrangler d1 execute pricetrackr --remote --file=./workers/seed.sql
```

Update the `database_id` in `workers/wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "pricetrackr"
database_id = "<your-database-id>"
```

### API URL

The API URL is hardcoded in `src/lib/api.ts` as `API_BASE_URL`. After deploying the Worker, update it to point to your worker URL and rebuild the frontend.

```typescript
// src/lib/api.ts
const API_BASE_URL = 'https://your-worker-url.workers.dev';
```

The Workers CORS allowlist in `workers/index.js` (`ALLOWED_ORIGINS`) must include your Pages origin — update both together.

### API Keys

For product search, you need API keys:

1. **Serper API Key** (web search):
   - Sign up at https://serper.dev
   - Add the secret to Cloudflare Workers:
   ```bash
   cd workers
   wrangler secret put SERPER_API_KEY
   ```

2. **Google AI Studio API Key** (Gemma 4 product enrichment):
   - Get a free key at https://aistudio.google.com (Gemma 4 free tier: 15 RPM)
   - Add the secret to Cloudflare Workers:
   ```bash
   cd workers
   wrangler secret put GEMMA_API_KEY
   ```

3. **Admin Secret** (admin registration):
   - Set a secure random string as the admin registration secret:
   ```bash
   cd workers
   wrangler secret put ADMIN_SECRET
   ```

4. **JWT Secret** (authentication tokens):
   - Set a secure random string for JWT signing:
   ```bash
   cd workers
   wrangler secret put JWT_SECRET
   ```

## Project Structure

```
PriceTrackr/
├── src/
│   ├── components/
│   │   ├── ui/           # Reusable UI (Badge, Button, Input, Modal, Select, Toast, useToast)
│   │   ├── Header.tsx     # App header with glassmorphism, search, theme toggle
│   │   ├── SearchPage.tsx      # Full-page search with nav, auth-aware pin button
│   │   ├── SearchResultCard.tsx # Product card with dual pricing, store logo, pin/unpin
│   │   ├── WatchlistPage.tsx    # Watchlist dashboard with grid view, remove button
│   │   ├── AuthPage.tsx         # Login/register page with toggle tabs
│   │   ├── MainApp.tsx    # Main application logic (legacy PriceTrackr)
│   │   ├── ProductCard.tsx      # Product display card with staggered animations
│   │   ├── ProductGrid.tsx      # Grid layout with skeleton loading
│   │   ├── ProductModal.tsx    # Add/Edit product form with search + auto-fetch
│   │   ├── ProductDetail.tsx   # Product detail with sparkline chart, price log, edit/delete
│   │   ├── AddPriceModal.tsx    # Add price entry
│   │   ├── FilterDropdown.tsx    # Multi-select filter dropdown
│   │   ├── SortSelect.tsx       # Sort dropdown
│   │   ├── AdminDashboard.tsx   # Admin dashboard (server-side role check)
│   │   ├── AdminUsers.tsx       # User management
│   │   ├── AdminAnalytics.tsx   # Analytics + stats
│   │   ├── AdminActivity.tsx    # Activity/audit log
│   │   └── ScanReceiptModal.tsx  # Receipt scanning with Tesseract.js OCR
│   ├── contexts/
│   │   └── AuthContext.tsx      # Authentication state (JWT persistence, auto-verify)
│   ├── hooks/
│   │   └── Pagination.tsx      # Reusable pagination component (table + list)
│   ├── pages/
│   │   ├── Landing.tsx          # Sign in/up page
│   │   └── Settings.tsx       # User settings (import/export, account)
│   ├── lib/
│   │   ├── api.ts               # API client (search, watchlist, auth)
│   │   ├── utils.ts             # Utility functions
│   │   └── receiptParser.ts     # Receipt OCR text parser
│   ├── types/
│   │   └── index.ts            # TypeScript types (SearchResult, WatchlistItem)
│   ├── App.tsx                  # Router (/, /auth, /watchlist)
│   ├── main.tsx
│   └── index.css                # Global styles
├── workers/
│   ├── index.js                 # Worker API endpoints (search, watchlist, auth, admin)
│   ├── auth.js                # JWT + password hashing + user CRUD
│   ├── db.js                    # D1 query helpers
│   ├── schema.sql               # D1 table DDL (users, products, prices, search_cache, watchlist)
│   ├── seed.sql                 # Default category seed data
│   └── wrangler.toml
├── public/                      # Static assets (store icons)
├── .github/workflows/        # CI/CD
└── package.json
```

## License

MIT

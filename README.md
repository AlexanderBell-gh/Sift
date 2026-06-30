# Sift

Real-time UK supermarket price comparison tool. Search 7 stores simultaneously, AI-enriches results, pin products to a watchlist.

**Live:** https://sift-a5w.pages.dev  
**API:** https://siftapi.inbox-alexbell.workers.dev

## Features

- **7-Store Search** — Tesco, Sainsbury's, ASDA, Morrisons, M&S, Aldi, Lidl
- **AI Enrichment** — Gemma 4 extracts prices, units, offers from raw search snippets
- **Dual Pricing** — Normal price vs loyalty price (Clubcard/Nectar)
- **Unit Price** — Price per 100g/litre for true comparison
- **Watchlist** — Pin products, track prices, get offer expiry dates
- **Auth** — JWT accounts to persist watchlists across devices
- **Autocomplete** — Search suggestions via Serper

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React |
| Backend | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| Search | Serper API (web + shopping + autocomplete) |
| AI | Google AI Studio (Gemma 4) |
| CI/CD | GitHub Actions |
| Package Manager | pnpm 11 |

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm 11+
- Cloudflare account

### Local Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm run dev
```

### Build

```bash
pnpm run build
```

Output goes to `dist/`.

## Deployment

### Automatic (GitHub Actions)

Push to `main` triggers deployment. Can also run manually via `workflow_dispatch`.

**Required GitHub secrets:**
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

### Manual

```bash
# Deploy frontend to Pages
pnpm exec wrangler pages deploy dist --project-name=sift

# Deploy worker API
pnpm exec wrangler deploy --config workers/wrangler.toml
```

## Database

Schema in `workers/schema.sql`. Four tables: `users`, `search_cache`, `watchlist`, `rate_limits`.

```bash
# Create D1 database
pnpm exec wrangler d1 create sift

# Apply schema
pnpm exec wrangler d1 execute sift --remote --file=workers/schema.sql

# Verify tables
pnpm exec wrangler d1 execute sift --remote --command "SELECT name FROM sqlite_master WHERE type='table'"
```

Update `database_id` in `workers/wrangler.toml`.

## API Keys

```bash
# Serper (web search)
pnpm exec wrangler secret put SERPER_API_KEY

# Gemma 4 (AI enrichment)
pnpm exec wrangler secret put GEMMA_API_KEY

# Admin registration
pnpm exec wrangler secret put ADMIN_SECRET

# JWT signing
pnpm exec wrangler secret put JWT_SECRET
```

## Project Structure

```
Sift/
├── src/
│   ├── components/
│   │   ├── SearchPage.tsx        # Search bar + results grid
│   │   ├── SearchResultCard.tsx  # Product card with dual pricing
│   │   ├── WatchlistPage.tsx     # Pinned items dashboard
│   │   └── AuthPage.tsx          # Login/register
│   ├── contexts/
│   │   └── AuthContext.tsx       # JWT persistence + auto-verify
│   ├── lib/
│   │   └── api.ts                # API client
│   ├── types/
│   │   └── index.ts              # SearchResult, WatchlistItem
│   ├── App.tsx                   # Router
│   ├── main.tsx
│   └── index.css                 # Tailwind + custom styles
├── workers/
│   ├── index.js                  # API routes (~1275 lines)
│   ├── auth.js                   # JWT + password hashing
│   ├── db.js                     # D1 query helpers
│   ├── schema.sql                # Database DDL
│   └── wrangler.toml             # Worker config
├── public/                       # Store logo SVGs
├── .github/workflows/deploy.yml  # CI/CD
└── package.json
```

## How Search Works

1. User submits query → `GET /api/search?q=butter`
2. Check D1 cache (24h TTL)
3. Cache miss → parallel fetch 7 stores via Serper (web + shopping endpoints)
4. Raw snippets → Gemma 4 enriches to structured JSON
5. Returns: `{ results: SearchResult[], cached: boolean }`

## License

MIT

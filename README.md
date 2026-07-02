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
- **Price History** — Price snapshots on refresh, tracks changes over time
- **Price Alerts** — Automatic notifications on price drops and offer expiry
- **Cron Refresh** — Daily auto-refresh of watchlist prices (6am UTC)
- **Admin Panel** — Dashboard, user management, audit logs, trial management
- **Trial Gating** — One-click "Free trial" button (12h, 5 searches); registration creates 24h trial account; search blocked when limits hit
- **Auth** — JWT accounts to persist watchlists across devices
- **Autocomplete** — Search suggestions via Serper
- **Search History** — Recent searches stored in localStorage
- **Filters & Sort** — Filter by store, sort by price/store
- **Dark/Light Mode** — System preference detection, toggle in nav
- **Skeleton Loading** — Card skeletons while data loads
- **Toast Notifications** — Success/error feedback on actions
- **Mobile Responsive** — Optimized for 375px+ screens
- **Settings** — Change password, export watchlist CSV, delete account (trial-gated)

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
| Auth | Custom JWT (hand-rolled) |
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

Schema in `workers/schema.sql`. Seven tables:

| Table | Purpose |
|-------|---------|
| `users` | Auth accounts with roles, trial status (24h), search count (5 max) |
| `rate_limits` | Per-IP rate limiting |
| `search_cache` | Search results (24h TTL) |
| `watchlist` | Pinned products per user |
| `price_history` | Price snapshots on refresh |
| `alerts` | Price drop/expiry notifications |
| `audit_logs` | Admin action audit trail |

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
│   │   ├── ui/
│   │   │   ├── Button.tsx        # Primary/secondary/danger/ghost variants
│   │   │   ├── Badge.tsx         # Simple badge wrapper
│   │   │   ├── Input.tsx         # Form input with label/error states
│   │   │   ├── Modal.tsx         # Dialog with backdrop, animations
│   │   │   ├── Select.tsx        # Dropdown select with chevron
│   │   │   ├── Toast.tsx         # Toast notification system
│   │   │   └── useToast.ts       # Toast hook
│   │   ├── NavHeader.tsx         # Shared nav: logo, watchlist, user dropdown (settings/theme/admin/sign out), alert bell
│   │   ├── SearchPage.tsx        # Search bar + results grid
│   │   ├── SearchResultCard.tsx  # Product card with dual pricing
│   │   ├── FilterDropdown.tsx    # Store filter + sort dropdown
│   │   ├── WatchlistPage.tsx     # Pinned items with refresh, last updated
│   │   ├── AuthPage.tsx          # Login/register
│   │   ├── AlertBell.tsx         # Bell icon with unread count
│   │   ├── AdminPage.tsx         # Admin dashboard (stats, users, audit, trials)
│   │   └── SettingsPage.tsx      # Settings (password, export, delete account)
│   ├── contexts/
│   │   ├── AuthContext.tsx       # JWT persistence + auto-verify
│   │   └── ThemeContext.tsx      # Dark/light mode toggle + system pref
│   ├── hooks/
│   │   └── useTheme.ts          # Theme context hook
│   ├── lib/
│   │   ├── api.ts                # API client (search, watchlist, alerts, admin)
│   │   ├── searchHistory.ts      # localStorage search history
│   │   └── utils.ts              # cn(), formatPrice(), formatDate()
│   ├── types/
│   │   └── index.ts              # SearchResult, WatchlistItem, Alert, Admin types
│   ├── App.tsx                   # Router (/, /auth, /watchlist, /settings, /admin)
│   ├── main.tsx
│   └── index.css                 # Tailwind + custom styles
├── workers/
│   ├── index.js                  # API routes (~1650 lines)
│   ├── auth.js                   # JWT + password hashing
│   ├── db.js                     # D1 query helpers
│   ├── schema.sql                # Database DDL (7 tables)
│   └── wrangler.toml             # Worker config + cron trigger
├── public/                       # Store logo SVGs
├── .github/workflows/deploy.yml  # CI/CD
└── package.json
```

## How Search Works
  
1. User submits query → `GET /api/search?q=butter` (auth required)
2. Auth check: unauthenticated requests blocked (401)
3. Trial check: expired trial or 5-search limit → return `{ blocked: true, reason }`
4. Check D1 cache (24h TTL)
5. Cache miss → tiered search for 7 stores via Serper:
   - Try `shopping` endpoint first (structured data)
   - Fallback to `web` endpoint if shopping results are empty
6. Results processed:
   - Gemma 4 enriches snippets to extract loyalty/unit prices
   - Fallback: Uses Serper's native price/image data if Gemma is disabled
7. Trial user search count incremented
8. Returns: `{ results: SearchResult[], cached: boolean, remainingSearches?: number }`
 
## How Price Refresh Works
 
1. User clicks refresh on watchlist item → `POST /api/watchlist/:id/refresh`
2. Re-searches product via Serper tiered search (single store)
3. Gemma enriches results (or uses native Serper data) to find matching product
4. Old prices snapshot to `price_history`
5. Watchlist updated with new prices
6. Alert created if price dropped

## Cron Auto-Refresh

Daily at 6am UTC via Cloudflare Workers cron trigger:
- Max 10 items per user, 100 total per run
- 500ms delay between refreshes
- Skip items updated within last 6 hours
- 3 consecutive failures → skip rest for that user
- Creates alerts for price drops and expiring offers

## License

MIT

# PriceTrackr

A personal grocery price tracker to monitor price changes on products you frequently buy.

**Live:** https://price-trackr.pages.dev/

## What's New (Recent Updates)

- **Security Hardening** - SSRF protection, CORS allowlist, JWT base64url encoding, timing-safe admin secret comparison, cascade user deletion, admin self-delete protection, last-admin demotion/delete guards
- **Admin Rate Limit** - 5 attempts per 15 min per IP on `/api/auth/register-admin` (D1-backed counter)
- **Password Policy** - Minimum 8 characters with at least one letter and one number
- **Input Validation** - Email format validation, price type/positive checks on all endpoints
- **D1 SQLite Migration** - Migrated storage from Cloudflare KV to D1 (SQLite) for relational queries, transactions, and normalized pricing data
- **Batch Product Creation** - Create multiple products in one API request
- **Scan Receipt in User Menu** - Scan Receipt button in dropdown menu (alongside Settings, Dark Mode)
- **Duplicate Detection** - Warns when adding a product with matching name (case-insensitive) or URL (exact match)
- **Modal Backdrop Fix** - Fixed issue where clicking inside form inputs would close the modal
- **Admin Role Server-Side Check** - `/admin` route validates role via `/api/auth/me` (no longer trusts localStorage)
- **ProductDetail Hardening** - Escape key closes, body scroll locks, image fallback renders on load error
- **Store Auto-Detect on URL Change** - Switching/editing a product URL re-detects store; clearing URL clears the manual selection
- **CSV Import/Export** - Real newlines (`\n`/`\r`) handled correctly; existing products matched by name+url when `product_id` column absent
- **AI-Enriched Product Search** - Serper results enriched via Gemma 4 (Google AI Studio); extracts price, brand, size, category, store from snippets; auto-fills product form on result click; graceful fallback on API failure
- **Performance** - Fixed infinite API request loop from unstable function refs in `AuthContext` and `useToast`


## Design

PriceTrackr features a refined modern UI with:

- **Green accent colors** matching the logo (`#74da86`)
- **Glassmorphism** on sticky header and filter bar
- **Border-based depth** instead of heavy shadows
- **Spring animations** for all transitions
- **Sparkline charts** for price history visualization
- **Skeleton loading** states for smooth content transitions
- **Dark mode** with solid background (#0A0A0A)

## Features

- **Product Management**: Add, edit, delete products with name, URL, image, category, store
- **Duplicate Detection**: Warns when adding a product with matching name (case-insensitive) or URL (exact match)
- **Price Tracking**: Record price entries over time with date, delete individual entries
- **Price History**: View price changes and trends with interactive sparkline charts
- **Categories**: Organize products (Chilled, Snacks, Beverages, Produce, Frozen, Bakery, Pantry, Condiments, Other)
- **Search & Filter**: Search by name/store, filter by multiple categories and stores via dropdown
- **Dark/Light Mode**: Toggle or follow system preference
- **Product Web Search**: Search products to find URLs (uses Serper API)
- **User Authentication**: Sign up, sign in, and free trial accounts (12-hour trial, auto-deleted on sign out)
- **Store Icons**: Visual store icons (Sainsbury's, Tesco, Morrisons, ASDA, M&S, Waitrose, Ocado, Aldi, Lidl, Iceland, Co-op)
- **Auto-detect Store**: Automatically detects store from product URL
- **Import/Export**: Export products as CSV, import via file upload or clipboard paste (registered users only)
- **Receipt Scanning**: Upload receipt photo → OCR via Tesseract.js → auto-detect store/date/items → batch create products
- **AI-Enriched Product Search**: Serper web search results enriched via Gemma 4 — auto-extracts price, brand, size, category, store from snippets; auto-fills product form on selection
- **Admin Dashboard**: System stats, user management, analytics, activity audit log (admin users only)
- **Pagination**: Reusable pagination component for tables and lists

### Adding Products - Workflow

The Product Modal provides a streamlined workflow:

1. **Enter product name** in the name field
2. Click **Find Product** button → Serper returns web search results, Gemma 4 extracts price/brand/size/category from snippets
3. Click a result → URL auto-fills, store auto-detected, price/category/name auto-filled from enriched data
4. Adjust any fields, add optional notes, Save

## Admin Dashboard

The admin dashboard provides system management capabilities for users with admin role.

### Access

- Navigate to `/admin` route
- Requires user account with `role: admin` (validated server-side via `/api/auth/me` on every load — demoted users lose access immediately, no local cache bypass)
- Non-admin / unauthenticated users see an inline "Access Denied" page (rendered inside `AdminDashboard`, not a router redirect) with a link back to `/app`

### Creating an Admin User

Admin users are created via the registration endpoint with an admin secret:

```bash
curl -X POST https://your-worker-url/api/auth/register-admin \\
  -H "Content-Type: application/json" \\
  -d '{"email": "admin@example.com", "username": "admin", "password": "password", "adminSecret": "your-admin-secret"}'
```

The admin secret must be set as a Cloudflare Workers secret (never committed to source):

```bash
cd workers
npx wrangler secret put ADMIN_SECRET
```

### Features

- **Users Tab**: Manage users with:
  - Filter: Users / Trials / All
  - Role change: Promote users to admin or demote admins to user
  - Delete: Remove user accounts and their data
  - Cleanup Expired: Purge expired trial accounts
- **Analytics Tab**: Stats cards + category/store distribution + metrics over time charts
- **Activity Tab**: Audit log of admin actions (user deletes, role changes, trial cleanups)
- **Dark/Light Mode**: Toggle in the header (synced with main app)

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **OCR**: Tesseract.js (client-side)
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
│   │   ├── MainApp.tsx    # Main application logic
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
│   │   └── AuthContext.tsx      # Authentication state
│   ├── hooks/
│   │   └── Pagination.tsx      # Reusable pagination component (table + list)
│   ├── pages/
│   │   ├── Landing.tsx          # Sign in/up page
│   │   └── Settings.tsx       # User settings (import/export, account)
│   ├── lib/
│   │   ├── api.ts               # API client
│   │   ├── utils.ts             # Utility functions
│   │   └── receiptParser.ts     # Receipt OCR text parser (store/date/items)
│   ├── types/
│   │   └── index.ts            # TypeScript types + constants
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css                # Global styles
├── workers/
│   ├── index.js                 # Worker API endpoints
│   ├── auth.js                # JWT + password hashing + user CRUD
│   ├── db.js                    # D1 query helpers
│   ├── schema.sql               # D1 table DDL
│   ├── seed.sql                 # Default category seed data
│   └── wrangler.toml
├── public/                      # Static assets (store icons)
├── .github/workflows/        # CI/CD
└── package.json
```

## License

MIT

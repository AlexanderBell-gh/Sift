# PriceTrackr

A personal grocery price tracker to monitor price changes on products you frequently buy.

**Live:** https://price-trackr.pages.dev/

## What's New (Recent Updates)

- **Batch Product Creation** - Create multiple products in one API request
- **Scan Receipt in User Menu** - Scan Receipt button in dropdown menu (alongside Settings, Dark Mode)
- **Duplicate Detection** - Warns when adding a product with matching name (case-insensitive) or URL (exact match)
- **Modal Backdrop Fix** - Fixed issue where clicking inside form inputs would close the modal
- **Delete Price Entries** - Remove individual prices from product detail view (mobile-friendly)
- **Quick Add Price** - Click the price on any product card to add a new price entry directly
- **Filter Dropdown Redesign** - Filter button now uses icon with custom checkboxes
- **Removed Store Field** - Simplified add price entry form
- **Pagination Component** - Reusable pagination in src/hooks/
- **Removed dot pattern** - Dark mode background is now solid (no dots)
- **Layering fixes** - Fixed z-index issues with filter dropdown and sticky header
- **AI-Enriched Product Search** - Gemma 4 (Google AI Studio) enriches Serper search results with extracted price, brand, size, category, and store — auto-fills product form on selection

## Design

PriceTrackr features a refined Linear/Vercel-inspired UI with:

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
- Requires user account with `role: admin`
- Non-admin users see an "Access Denied" message

### Creating an Admin User

Admin users are created via the registration endpoint with an admin secret:

```bash
curl -X POST https://your-worker-url/api/auth/register-admin \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "username": "admin", "password": "password", "adminSecret": "your-admin-secret"}'
```

The admin secret must match the `ADMIN_SECRET` environment variable in your Worker configuration.

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
- **Storage**: Cloudflare Workers KV
- **Deployment**: Cloudflare Pages + GitHub Actions
- **External APIs**: Serper API (web search), Google AI Studio / Gemma 4 (product data enrichment)

## Getting Started

### Prerequisites

- Node.js 24
- pnpm
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
pnpm exec wrangler pages deploy dist --project-name=price-trackr --branch main

# Deploy worker API
pnpm exec wrangler deploy --config workers/wrangler.toml
```

## Configuration

### Cloudflare KV Namespace

The project uses a KV namespace for data storage. Update the namespace ID in:
- `workers/wrangler.toml` (for Worker)

### API URL

After deploying the Worker, update the API URL in `src/lib/api.ts`:

```typescript
const API_BASE_URL = 'https://your-worker-url.workers.dev';
```

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

## Project Structure

```
PriceTrackr/
├── src/
│   ├── components/
│   │   ├── ui/           # Reusable UI (Badge, Button, Input, Modal, Select, Toast)
│   │   ├── useToast.ts   # Toast notification hook
│   │   ├── Header.tsx    # App header with glassmorphism, search, theme toggle
│   │   ├── MainApp.tsx   # Main application logic
│   │   ├── ProductCard.tsx      # Product display card with staggered animations
│   │   ├── ProductGrid.tsx      # Grid layout with skeleton loading
│   │   ├── ProductModal.tsx     # Add/Edit product form with search + auto-fetch
│   │   ├── ProductDetail.tsx    # Product detail with sparkline chart
│   │   ├── AddPriceModal.tsx    # Add price entry
│   │   ├── FilterDropdown.tsx   # Multi-select filter dropdown
│   │   ├── SortSelect.tsx       # Sort dropdown
│   │   ├── AdminDashboard.tsx   # Admin dashboard
│   │   ├── AdminUsers.tsx       # User management
│   │   ├── AdminAnalytics.tsx   # Analytics + stats
│   │   ├── AdminActivity.tsx    # Activity/audit log
│   │   └── ScanReceiptModal.tsx  # Receipt scanning with Tesseract.js OCR
│   ├── contexts/
│   │   └── AuthContext.tsx      # Authentication state
│   ├── hooks/
│   │   └── Pagination.tsx      # Reusable pagination hook + component
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
│   └── wrangler.toml
├── public/                      # Static assets (store icons)
├── .github/workflows/           # CI/CD
└── package.json
```

## License

MIT
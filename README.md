# PriceTrackr

A personal grocery price tracker to monitor price changes on products you frequently buy.

**Live:** https://price-trackr.pages.dev/

## Design

PriceTrackr features a refined Linear/Vercel-inspired UI with:

- **Green accent colors** matching the logo (`#74da86`)
- **Glassmorphism** on sticky header and filter bar
- **Border-based depth** instead of heavy shadows
- **Spring animations** for all transitions
- **Sparkline charts** for price history visualization
- **Skeleton loading** states for smooth content transitions
- **Dark mode** with subtle dot pattern background

## Features

- **Product Management**: Add, edit, delete products with name, URL, image, category, store
- **Price Tracking**: Record price entries over time with store and date (only adds entry when price value changes)
- **Price History**: View price changes and trends with interactive sparkline charts
- **Categories**: Organize products (Chilled, Snacks, Beverages, Produce, Frozen, Bakery, Pantry, Condiments, Other)
- **Search & Filter**: Search by name/store, filter by multiple categories and stores via dropdown
- **Dark/Light Mode**: Toggle or follow system preference
- **Product Image Search**: In-app image search via "Find Products" button (uses Serper API)
- **User Authentication**: Sign up, sign in, and free trial accounts (12-hour trial, auto-deleted on sign out)
- **Store Icons**: Visual store icons (Sainsbury's, Tesco, Morrisons, ASDA, M&S, Waitrose, Ocado, Aldi, Lidl, Iceland, Co-op)
- **Auto-detect Store**: Automatically detects store from product URL
- **Import/Export**: Export all products as JSON, import via file upload or clipboard paste (registered users only)
- **Admin Dashboard**: Management dashboard for system stats, user management, and analytics (admin users only)

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Backend**: Cloudflare Workers
- **Storage**: Cloudflare Workers KV
- **Deployment**: Cloudflare Pages + GitHub Actions
- **External API**: Serper API (image search)

## Getting Started

### Prerequisites

- Node.js 24
- npm or pnpm
- Cloudflare account

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Build

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Deployment

### Automatic (GitHub Actions)

This project includes a GitHub Actions workflow that automatically deploys to Cloudflare on push to main.

1. Add these secrets to your GitHub repository:
   - `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token
   - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare Account ID

2. Push to main to trigger deployment

### Manual

```bash
# Deploy frontend to Cloudflare Pages
npx wrangler pages deploy dist --project-name=price-trackr

# Deploy worker API
cd workers
npx wrangler deploy
```

## Configuration

### Cloudflare KV Namespace

The project uses a KV namespace for data storage. Update the namespace ID in:
- `wrangler.jsonc` (for Pages)
- `workers/wrangler.toml` (for Worker)

### API URL

After deploying the Worker, update the API URL in `src/lib/api.ts`:

```typescript
const API_BASE_URL = 'https://your-worker-url.workers.dev';
```

### Serper API Key (Image Search)

For the "Find Products" feature, you need a Serper API key:

1. Sign up at https://serper.dev
2. Get your API key from the dashboard
3. Add the secret to Cloudflare Workers:

```bash
cd workers
wrangler secret put SERPER_API_KEY
```

## Project Structure

```
PriceTrackr/
├── src/
│   ├── components/
│   │   ├── ui/           # Reusable UI (Badge, Button, Input, Modal, Select)
│   │   ├── Header.tsx    # App header with glassmorphism, search, theme toggle
│   │   ├── MainApp.tsx   # Main application logic
│   │   ├── ProductCard.tsx      # Product display card with staggered animations
│   │   ├── ProductGrid.tsx      # Grid layout with skeleton loading
│   │   ├── ProductModal.tsx     # Add/Edit product form with Find Products
│   │   ├── ProductDetail.tsx    # Product detail with sparkline chart
│   │   ├── AddPriceModal.tsx    # Add price entry
│   │   ├── FilterDropdown.tsx   # Multi-select filter dropdown
│   │   ├── SortSelect.tsx       # Sort dropdown
│   │   ├── AddCategoryModal.tsx # Add custom category
│   │   ├── AdminDashboard.tsx   # Admin dashboard with role-based auth
│   │   ├── AdminStats.tsx       # System statistics cards
│   │   ├── AdminUsers.tsx       # User management with filters and role change
│   │   └── AdminAnalytics.tsx   # Aggregate analytics charts
│   ├── contexts/
│   │   └── AuthContext.tsx      # Authentication state
│   ├── pages/
│   │   ├── Landing.tsx          # Sign in/up page with gradient background
│   │   └── Settings.tsx         # User settings
│   ├── lib/
│   │   ├── api.ts               # API client
│   │   └── utils.ts             # Utility functions
│   ├── types/
│   │   └── index.ts             # TypeScript types
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css                # Global styles, design tokens, animations
├── workers/
│   ├── index.js                 # Worker API endpoints
│   ├── auth.js                  # Authentication utilities
│   └── wrangler.toml
├── public/                      # Static assets (favicons, logos)
├── .github/workflows/           # CI/CD
└── package.json
```

## License

MIT

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

- **Stats Tab**: View system statistics (total users, regular users, trial users, total products, total price entries)
- **Users Tab**: Manage users with:
  - Filter: Users / Trials / All
  - Role change: Promote users to admin or demote admins to user
  - Delete: Remove user accounts and their data
  - Cleanup Expired: Purge expired trial accounts
- **Analytics Tab**: View category and store distribution across all users
- **Dark/Light Mode**: Toggle in the header (synced with main app)
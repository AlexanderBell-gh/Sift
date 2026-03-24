# PriceTrackr

A personal grocery price tracker to monitor price changes on products you frequently buy.

**Live:** https://price-trackr.pages.dev/

## Features

- **Product Management**: Add, edit, delete products with name, URL, image, category, store
- **Price Tracking**: Record price entries over time with store and date
- **Price History**: View price changes and trends
- **Categories**: Organize products (Chilled, Snacks, Beverages, Produce, Frozen, Bakery, Pantry, Condiments, Other)
- **Search & Filter**: Filter by name, store, or category
- **Dark/Light Mode**: Toggle or follow system preference
- **Google Images Search**: Search and add product images via Google Images (right-click image → Copy link address for URL, Copy image address for image)
- **User Authentication**: Sign up, sign in, and free trial accounts (12-hour trial, auto-deleted on sign out)
- **Store Favicons**: Visual store icons (Sainsbury's, Tesco, Morrisons, ASDA, M&S)
- **Auto-detect Store**: Automatically detects store from product URL (Sainsbury's, Tesco, Morrisons, ASDA, M&S)

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Backend**: Cloudflare Workers
- **Storage**: Cloudflare Workers KV
- **Deployment**: Cloudflare Pages + GitHub Actions

## Getting Started

### Prerequisites

- Node.js 20+
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
const USE_LOCAL_STORAGE = false;
```

## Project Structure

```
PriceTrackr/
├── src/
│   ├── components/
│   │   ├── ui/           # Reusable UI (Badge, Button, Input, Modal, Select)
│   │   ├── Header.tsx    # App header with search, theme toggle
│   │   ├── MainApp.tsx   # Main application logic
│   │   ├── ProductCard.tsx      # Product display card
│   │   ├── ProductGrid.tsx      # Grid layout for products
│   │   ├── ProductModal.tsx     # Add/Edit product form
│   │   ├── ProductDetail.tsx    # Product detail view
│   │   ├── AddPriceModal.tsx    # Add price entry
│   │   ├── CategoryFilter.tsx   # Category filter chips
│   │   └── SortSelect.tsx       # Sort dropdown
│   ├── contexts/
│   │   └── AuthContext.tsx      # Authentication state
│   ├── pages/
│   │   ├── Landing.tsx          # Sign in/up page
│   │   └── Settings.tsx         # User settings
│   ├── lib/
│   │   ├── api.ts               # API client
│   │   └── utils.ts             # Utility functions
│   ├── types/
│   │   └── index.ts             # TypeScript types
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
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

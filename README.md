# PriceTrackr 🏷️

A personal grocery price tracker to monitor price changes on products you frequently buy.

## Features

- **Product Management**: Add, edit, and delete products with name, URL, category, and store
- **Price Tracking**: Record price entries over time to see trends
- **Price History**: Interactive charts showing price trends
- **Categories**: Organize products by category (Dairy, Snacks, Beverages, etc.)
- **Search**: Filter products by name or store
- **Dark/Light Mode**: Toggle between themes (or follow system preference)
- **Image Fetching**: Auto-fetches product images from URLs

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
│   ├── components/       # React components
│   │   ├── ui/          # Reusable UI components
│   │   │   ├── Badge.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Select.tsx
│   │   ├── Header.tsx
│   │   ├── MainApp.tsx
│   │   ├── CategoryFilter.tsx
│   │   ├── ProductCard.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── ProductModal.tsx
│   │   ├── ProductDetail.tsx
│   │   ├── AddPriceModal.tsx
│   │   ├── AddCategoryModal.tsx
│   │   └── SortSelect.tsx
│   ├── contexts/         # React contexts
│   │   └── AuthContext.tsx
│   ├── pages/            # Page components
│   │   └── Landing.tsx
│   ├── lib/             # Utilities and API
│   ├── types/           # TypeScript types
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── workers/             # Cloudflare Worker API
│   ├── wrangler.toml
│   ├── index.js
│   └── auth.js
├── .github/
│   └── workflows/
│       └── deploy.yml   # CI/CD workflow
├── wrangler.jsonc       # Cloudflare Pages config
└── package.json
```

## License

MIT

# PriceTrackr 🏷️

A personal grocery price tracker to monitor price changes on products you frequently buy.

## Features

- **Product Management**: Add, edit, and delete products with name, URL, category, and store
- **Price Tracking**: Record price entries over time to see trends
- **Price History**: Visual sparkline charts showing price trends
- **Categories**: Organize products by category (Dairy, Snacks, Beverages, etc.)
- **Search**: Filter products by name or store
- **Dark/Light Mode**: Toggle between themes (or follow system preference)
- **Image Fetching**: Auto-fetches product images from URLs (Amazon, Walmart, etc.)

## Quick Start

### Local Development

Simply open `index.html` in your browser:

```bash
# Using Python
python3 -m http.server 8000

# Then open http://localhost:8000
```

The app uses **localStorage** for data persistence - no setup required!

### Deployment to Cloudflare Pages

1. **Create a Cloudflare Account** at cloudflare.com

2. **Create a KV Namespace**:
   - Go to Workers & KV → Create Namespace
   - Name it `pricetrackr`
   - Note the ID

3. **Deploy the Worker**:
   ```bash
   cd workers
   wrangler kv:namespace create PRICETRACKR --binding=PRICETRACKR
   # Update wrangler.toml with your namespace ID
   wrangler deploy
   ```

4. **Deploy the Frontend**:
   - Go to Pages in Cloudflare dashboard
   - Connect to your GitHub repo or upload directly
   - Set build output directory to `/` (root)
   - Deploy!

5. **Update API Client**:
   - Edit `api.js` and set `API_BASE_URL` to your Worker URL

## Project Structure

```
PriceTrackr/
├── index.html          # Main HTML with Tailwind via CDN
├── styles.css         # Custom styles
├── app.js             # Application logic
├── api.js             # API client (localStorage + Worker)
├── workers/
│   ├── wrangler.toml  # Cloudflare Worker config
│   └── index.js       # Worker API endpoints
└── README.md
```

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (no build step required)
- **Styling**: Tailwind CSS (via CDN)
- **Storage**: 
  - LocalStorage (default, works out of the box)
  - Cloudflare Workers KV (for cloud sync)
- **Deployment**: Cloudflare Pages + Workers

## Usage

1. **Add a Product**: Click "+ Add Product" → Enter name, URL, category, price, and store
2. **Track Prices**: Click a product → "Add Price" to record new prices
3. **View History**: Click any product to see price history chart
4. **Filter**: Use category chips or search bar
5. **Theme**: Click sun/moon icon to toggle dark mode

## API Endpoints (Cloudflare Worker)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List all products |
| POST | `/api/products` | Create product |
| GET | `/api/products/:id` | Get product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |
| POST | `/api/products/:id/prices` | Add price entry |
| GET | `/api/categories` | List categories |
| POST | `/api/categories` | Create category |

## Data Schema

```json
{
  "id": "prod_123...",
  "name": "Gallon of Milk",
  "url": "https://amazon.com/...",
  "imageUrl": "https://...",
  "category": "dairy",
  "store": "Walmart",
  "notes": "Preferred brand: Generic",
  "prices": [
    { "price": 3.99, "store": "Walmart", "date": "2026-01-15" },
    { "price": 4.29, "store": "Target", "date": "2026-01-10" }
  ],
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

## License

MIT

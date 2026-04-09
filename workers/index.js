const DEFAULT_CATEGORIES = [
  { id: 'chilled', name: 'Chilled', icon: '🥛' },
  { id: 'snacks', name: 'Snacks', icon: '🍿' },
  { id: 'beverages', name: 'Beverages', icon: '🥤' },
  { id: 'produce', name: 'Produce', icon: '🥬' },
  { id: 'frozen', name: 'Frozen', icon: '🧊' },
  { id: 'bakery', name: 'Bakery', icon: '🥖' },
  { id: 'pantry', name: 'Pantry', icon: '🥫' },
  { id: 'condiments', name: 'Condiments', icon: '🧂' },
  { id: 'other', name: 'Other', icon: '📦' },
];

import {
  isValidUser,
  isValidMagicLink,
  hashPassword,
  verifyPassword,
  generateToken,
  createUserId,
  createJWT,
  verifyJWT,
  getUserById,
  getUserByEmail,
  getUserByUsername,
  saveUser,
  deleteUser,
} from './auth.js';

// PriceTrackr Cloudflare Worker API

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}

function isValidProduct(product) {
  return (
    product &&
    typeof product.id === 'string' &&
    typeof product.name === 'string' &&
    typeof product.category === 'string' &&
    Array.isArray(product.prices)
  );
}

function isValidCategory(category) {
  return (
    category &&
    typeof category.id === 'string' &&
    typeof category.name === 'string' &&
    typeof category.icon === 'string'
  );
}

function detectStoreFromUrl(url) {
  if (!url) return null;
  const urlLower = url.toLowerCase();
  
  const storePatterns = {
    "Sainsbury's": ['sainsburys', 'sainsbury'],
    'Tesco': ['tesco'],
    'Morrisons': ['morrisons'],
    'ASDA': ['asda'],
    'M&S': ['marksandspencer', 'marksand', 'mand s'],
    'Waitrose': ['waitrose'],
    'Ocado': ['ocado'],
    'Aldi': ['aldi'],
    'Lidl': ['lidl'],
    'Iceland': ['iceland'],
    'Co-op': ['coop', 'co-op', 'cooperative'],
  };

  for (const [store, patterns] of Object.entries(storePatterns)) {
    for (const pattern of patterns) {
      if (urlLower.includes(pattern)) {
        return store;
      }
    }
  }
  return null;
}

async function fetchProductDetails(productUrl, store) {
  const response = await fetch(productUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-GB,en;q=0.5',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page (HTTP ${response.status}). The URL may be invalid or the page may require login.`);
  }

  const html = await response.text();
  return parseProductHtml(html, store, productUrl);
}

function parseProductHtml(html, store, url) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  let name = '';
  let price = null;
  let imageUrl = '';

  // Try common selectors for each store
  const selectors = getStoreSelectors(store);

  for (const selector of selectors.name) {
    const el = doc.querySelector(selector);
    if (el) {
      name = el.textContent.trim();
      break;
    }
  }

  for (const selector of selectors.price) {
    const el = doc.querySelector(selector);
    if (el) {
      const priceText = el.textContent.trim();
      const priceMatch = priceText.match(/[\d,]+\.?\d*/);
      if (priceMatch) {
        price = parseFloat(priceMatch[0].replace(',', ''));
        break;
      }
    }
  }

  for (const selector of selectors.image) {
    const el = doc.querySelector(selector);
    if (el) {
      imageUrl = el.src || el.href || el.getAttribute('data-src') || '';
      break;
    }
  }

  if (!name) {
    throw new Error('Could not extract product name');
  }

  return {
    name,
    price,
    imageUrl,
    store,
    url,
  };
}

function getStoreSelectors(store) {
  const allSelectors = {
    name: [
      'h1[data-testid="product-title"]',
      '[data-testid="product-title"]',
      '.product-title',
      '.product-name',
      '[itemprop="name"]',
      'h1.productTitle',
      '#productTitle',
      'h1',
    ],
    price: [
      '[data-testid="price"]',
      '.price',
      '.product-price',
      '[itemprop="price"]',
      '.priceNow',
      '.actualPrice',
      '#priceblock_ourprice',
      '.a-price .a-offscreen',
    ],
    image: [
      '[data-testid="product-image"] img',
      '#landingImage',
      '.product-image img',
      '[itemprop="image"]',
      '.zoomWindow',
      '#main-image',
    ],
  };

  const storeSpecific = {
    "Sainsbury's": {
      name: ['.product-title', 'h1'],
      price: ['.priceControl', '.price-per-weight', '[data-testid="price"]'],
      image: ['.product-image img', '.productImage'],
    },
    'Tesco': {
      name: ['.product-tile--title', 'h1'],
      price: ['.price-wrap', '.price', '[data-testid="price"]'],
      image: ['.product-image img', '.product-image'],
    },
    'ASDA': {
      name: ['.product-title', 'h1'],
      price: ['.price', '.prod-price'],
      image: ['.product-image img'],
    },
    'M&S': {
      name: ['.product-name', 'h1'],
      price: ['.price', '.price-m'],
      image: ['.product-image img'],
    },
    'Waitrose': {
      name: ['.productTitle', 'h1'],
      price: ['.price', '.priceWrap'],
      image: ['.product-image img'],
    },
  };

  if (store && storeSpecific[store]) {
    return {
      name: [...storeSpecific[store].name, ...allSelectors.name],
      price: [...storeSpecific[store].price, ...allSelectors.price],
      image: [...storeSpecific[store].image, ...allSelectors.image],
    };
  }

return allSelectors;
}

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (e) {
      return errorResponse('Internal server error', 500);
    }
  },
};

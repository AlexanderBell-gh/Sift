const DEFAULT_CATEGORIES = [
  { id: 'dairy', name: 'Dairy', icon: '🥛' },
  { id: 'snacks', name: 'Snacks', icon: '🍿' },
  { id: 'beverages', name: 'Beverages', icon: '🥤' },
  { id: 'produce', name: 'Produce', icon: '🥬' },
  { id: 'meat', name: 'Meat', icon: '🥩' },
  { id: 'frozen', name: 'Frozen', icon: '🧊' },
  { id: 'other', name: 'Other', icon: '📦' },
];

// PriceTrackr Cloudflare Worker API

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
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

const STORE_SELECTORS = {
  'sainsburys.co.uk': {
    jsonLd: true,
    selectors: ['[data-product="price"]', '.priceTabular', '.price-per-weight'],
  },
  'tesco.com': {
    jsonLd: true,
    selectors: ['[data-testid="price"]', '.price-control'],
  },
  'morrisons.com': {
    jsonLd: true,
    selectors: ['[data-product="price"]', '.price price'],
  },
  'asda.com': {
    jsonLd: true,
    selectors: ['[data-testid="price"]', '.asda-price'],
  },
  'marksandspencer.com': {
    jsonLd: true,
    selectors: ['.price-box', '.product-price'],
  },
};

async function scrapePrice(url, env) {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname.toLowerCase();
  
  const storeKey = Object.keys(STORE_SELECTORS).find(key => hostname.includes(key));
  const storeConfig = STORE_SELECTORS[storeKey] || { jsonLd: true, selectors: ['.price', '[class*="price"]'] };

  const scrapeOpsUrl = `https://scrapeops.io/api/v1/?api_key=${env.SCRAPEOPS_API_KEY}&url=${encodeURIComponent(url)}&render_js=true&residential=true`;

  let html;
  try {
    const response = await fetch(scrapeOpsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 60000,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    html = await response.text();
  } catch (e) {
    console.error('Fetch error:', e.message);
    return null;
  }

  let price = null;

  if (storeConfig.jsonLd) {
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        const priceData = jsonLd['@graph'] || [jsonLd];
        for (const item of priceData) {
          if (item['@type'] === 'Product' || item['@type'] === 'IndividualProduct') {
            if (item.offers) {
              const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
              for (const offer of offers) {
                if (offer.price) {
                  price = parseFloat(offer.price);
                  if (!isNaN(price)) break;
                }
                if (offer.highPrice) {
                  price = parseFloat(offer.highPrice);
                  if (!isNaN(price)) break;
                }
              }
              if (price !== null) break;
            }
          }
        }
      } catch (e) {
        console.error('JSON-LD parse error:', e.message);
      }
    }
  }

  if (price === null) {
    for (const selector of storeConfig.selectors) {
      const selectorEscaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`${selectorEscaped}[^>]*>([£$]?\\d+[.,]\\d{2})`, 'i');
      const match = html.match(regex);
      if (match) {
        price = parseFloat(match[1].replace(/[£$]/, '').replace(',', '.'));
        if (!isNaN(price)) break;
      }
    }
  }

  if (price === null) {
    const genericPriceRegex = /(?:price|amount|value|cost)[\s\S]{0,20}?[£$€]?\s*(\d+[.,]\d{2})/i;
    const genericMatch = html.match(genericPriceRegex);
    if (genericMatch) {
      price = parseFloat(genericMatch[1].replace(',', '.'));
    }
  }

  return price && !isNaN(price) ? price : null;
}

async function getAllProducts(env) {
  const productIds = await env.PRICETRACKR.get('products', 'json');
  if (!productIds) return [];
  
  const products = await Promise.all(
    productIds.map(async (id) => {
      const product = await env.PRICETRACKR.get(`product:${id}`, 'json');
      return product;
    })
  );
  
  return products.filter(Boolean);
}

async function saveProducts(env, products) {
  const ids = products.map(p => p.id);
  await env.PRICETRACKR.put('products', JSON.stringify(ids));
  
  await Promise.all(
    products.map(async (product) => {
      await env.PRICETRACKR.put(`product:${product.id}`, JSON.stringify(product));
    })
  );
}

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Routes
  if (path === '/api/products') {
    if (method === 'GET') {
      const products = await getAllProducts(env);
      return jsonResponse(products);
    }
    
    if (method === 'POST') {
      try {
        const body = await request.json();
        const products = await getAllProducts(env);
        
        const newProduct = {
          id: body.id || `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: body.name,
          url: body.url,
          imageUrl: body.imageUrl,
          category: body.category || 'other',
          store: body.store,
          notes: body.notes,
          prices: body.prices || [{ price: body.price, store: body.store, date: new Date().toISOString().split('T')[0] }],
          createdAt: new Date().toISOString()
        };
        
        products.push(newProduct);
        await saveProducts(env, products);
        
        return jsonResponse(newProduct, 201);
      } catch (e) {
        return errorResponse('Invalid request body');
      }
    }
  }
  
  // Product by ID
  if (path.match(/^\/api\/products\/(.+)$/)) {
    const id = path.match(/^\/api\/products\/(.+)$/)[1];
    const products = await getAllProducts(env);
    const product = products.find(p => p.id === id);
    
    if (!product) {
      return errorResponse('Product not found', 404);
    }
    
    if (method === 'GET') {
      return jsonResponse(product);
    }
    
    if (method === 'PUT') {
      try {
        const body = await request.json();
        const updatedProducts = products.map(p => 
          p.id === id ? { ...p, ...body } : p
        );
        await saveProducts(env, updatedProducts);
        return jsonResponse(updatedProducts.find(p => p.id === id));
      } catch (e) {
        return errorResponse('Invalid request body');
      }
    }
    
    if (method === 'DELETE') {
      const filtered = products.filter(p => p.id !== id);
      await saveProducts(env, filtered);
      return jsonResponse({ success: true });
    }
  }
  
  // Add price to product
  if (path.match(/^\/api\/products\/(.+)\/prices$/) && method === 'POST') {
    const id = path.match(/^\/api\/products\/(.+)\/prices$/)[1];
    const products = await getAllProducts(env);
    const product = products.find(p => p.id === id);
    
    if (!product) {
      return errorResponse('Product not found', 404);
    }
    
    try {
      const body = await request.json();
      product.prices = product.prices || [];
      product.prices.push({
        price: body.price,
        store: body.store,
        date: body.date || new Date().toISOString().split('T')[0]
      });
      
      await saveProducts(env, products);
      return jsonResponse(product);
    } catch (e) {
      return errorResponse('Invalid request body');
    }
  }
  
  // Categories
  if (path === '/api/categories') {
    if (method === 'GET') {
      const categories = await env.PRICETRACKR.get('categories', 'json');
      return jsonResponse(categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES);
    }
    
    if (method === 'POST') {
      try {
        const body = await request.json();
        const categories = await env.PRICETRACKR.get('categories', 'json') || DEFAULT_CATEGORIES;
        const newCategory = {
          id: body.id || `cat_${Date.now()}`,
          name: body.name,
          icon: body.icon || '📦'
        };
        categories.push(newCategory);
        await env.PRICETRACKR.put('categories', JSON.stringify(categories));
        return jsonResponse(newCategory, 201);
      } catch (e) {
        return errorResponse('Invalid request body');
      }
    }
  }

  // Delete category
  if (path.match(/^\/api\/categories\/(.+)$/) && method === 'DELETE') {
    const id = path.match(/^\/api\/categories\/(.+)$/)[1];
    const categories = await env.PRICETRACKR.get('categories', 'json') || DEFAULT_CATEGORIES;
    const filtered = categories.filter(c => c.id !== id);
    await env.PRICETRACKR.put('categories', JSON.stringify(filtered));
    return jsonResponse({ success: true });
  }

  // Scrape price from URL
  if (path === '/api/scrape-price' && method === 'POST') {
    try {
      const body = await request.json();
      const url = body.url;
      
      if (!url) {
        return errorResponse('URL is required');
      }

      const price = await scrapePrice(url, env);
      return jsonResponse({ price });
    } catch (e) {
      return errorResponse('Failed to scrape price');
    }
  }

  return errorResponse('Not found', 404);
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
